import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import {
  CobrosOverview,
  CompaniesService,
  EmpresaPanorama,
  FilaCatalogoIntegracion,
  FilaCobro,
  IntegracionesEmpresa,
  InventoryUnits,
  TotalesPlataforma,
} from '../../../services/companies.service';
import { DataStoreService } from '../../../shared/services/dataStoreService';
import { NotificationService } from '../../../shared/services/notification.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';

/** Filtros de la pestaña de cobros. Cada tarjeta enciende el suyo. */
type FiltroCobros = 'todas' | 'aCobrar' | 'sinTarjeta' | 'vencidas';

type FiltroEstado =
  | 'todas'
  | 'activas'
  | 'inactivas'
  | 'conTarjeta'
  | 'sinTarjeta'
  | 'premium'
  | 'freemium'
  | 'anual'
  | 'pactado'
  | 'enRiesgo'
  | 'sinMovimiento'
  | 'sinEntrar'
  | 'porVencer'
  | 'sinIntegrar';
type Orden =
  | 'nombre'
  | 'pedidos30d'
  | 'facturado'
  | 'ultimoPedido'
  | 'ultimoIngreso'
  | 'antiguedad'
  | 'usuarios'
  | 'precio'
  | 'integraciones';

const MS_DIA = 24 * 60 * 60 * 1000;
const DIAS_SIN_MOVIMIENTO = 30;
const DIAS_POR_VENCER = 7;
/**
 * Integraciones que permite el plan freemium. Espejo de
 * `config/subscriptionLimits.js` en el backend, solo para pintar el distintivo
 * "topada": el candado real que impide conectar la segunda está allá.
 */
const LIMITE_INTEGRACIONES_FREEMIUM = 1;

/**
 * Escalones de precio, espejo de `config/subscriptionLimits.BILLING_TIERS`.
 *
 * Está acá SOLO para armar el desplegable del acuerdo; el precio que se muestra
 * en la pantalla y el que se cobra salen del backend. Si esta lista se
 * desactualiza, el backend rechaza el id con INVALID_TIER en vez de guardar
 * algo que nadie sabe cobrar.
 */
const ESCALONES = [
  { id: 'base', nombre: 'Base', hasta: '$15M', usd: 27 },
  { id: 'origen', nombre: 'Origen', hasta: '$30M', usd: 47 },
  { id: 'esencia', nombre: 'Esencia', hasta: '$60M', usd: 77 },
  { id: 'impulso', nombre: 'Impulso', hasta: '$150M', usd: 147 },
  { id: 'expansion', nombre: 'Expansión', hasta: '$300M', usd: 247 },
  { id: 'liderazgo', nombre: 'Liderazgo', hasta: '$500M', usd: 427 },
  { id: 'cumbre', nombre: 'Cumbre', hasta: 'sin tope', usd: 0 },
];

/**
 * Consola de plataforma del Super Administrador.
 *
 * Reemplaza la pantalla anterior, que no leía un solo dato de negocio y cuyas
 * acciones apuntaban a `index + 1` en vez del docId real de Firestore. Acá la
 * identidad de cada fila es siempre `_docId`, que es lo que devuelve el backend.
 *
 * Los números llegan de `GET /v1/companies/overview` ya calculados con
 * aggregation queries y cacheados: la pantalla no calcula nada pesado, solo
 * filtra y ordena lo que ya recibió.
 */
@Component({
  selector: 'app-consola-plataforma',
  templateUrl: './consola-plataforma.component.html',
  styleUrls: ['./consola-plataforma.component.scss'],
})
export class ConsolaPlataformaComponent implements OnInit, OnDestroy {
  cargando = false;
  error = '';

  totales: TotalesPlataforma | null = null;
  empresas: EmpresaPanorama[] = [];
  empresasFiltradas: EmpresaPanorama[] = [];

  generadoEn: number | null = null;
  ventanaDias = 30;

  // Filtros
  busqueda = '';
  filtroEstado: FiltroEstado = 'todas';
  /**
   * Filtro por escalón de precio, INDEPENDIENTE del de estado.
   *
   * Son dos preguntas distintas —"¿en qué escalón está?" y "¿cómo va?"— y
   * meterlas en un solo desplegable obligaría a renunciar a una: no se podría
   * pedir "los de Liderazgo que están en riesgo", que es justo la consulta que
   * importa.
   */
  filtroEscalon = 'todos';
  readonly escalones = ESCALONES;
  orden: Orden = 'nombre';

  /**
   * Lo integrado mirado por PROVEEDOR, no por empresa: cuántas empresas tiene
   * cada integración. Es la única vista que responde "¿valió la pena lo que
   * construimos?" — una integración que costó semanas y tiene una sola empresa
   * se ve de inmediato.
   *
   * Va en un panel plegado porque es una pregunta que se hace de vez en cuando,
   * no en cada carga de la pantalla.
   */
  catalogoIntegraciones: FilaCatalogoIntegracion[] = [];
  /** Proveedores que el backend soporta y no tiene conectados NADIE. */
  integracionesSinNadie: Array<{ id: string; nombre: string; categoria: string }> = [];
  censoIntegracionesOk = true;
  panelIntegraciones = false;

  // Ficha individual: una expandida a la vez, para no disparar N consultas de
  // inventario de golpe.
  expandidaId: string | null = null;
  unidadesPorEmpresa = new Map<string, InventoryUnits>();
  cargandoUnidades = new Set<string>();
  errorUnidades = new Map<string, string>();

  // Acciones en vuelo, por docId
  cambiandoPlan = new Set<string>();
  cambiandoEstado = new Set<string>();

  /**
   * Distingue una carga normal de un recálculo forzado. No es cosmético: el
   * forzado recalcula las 64 empresas antes de responder y tarda bastante más;
   * un "Cargando…" que no avanza parece la pantalla colgada.
   */
  recalculando = false;

  /**
   * Qué está mirando el operador. La consola tiene dos oficios: administrar las
   * empresas y cobrarles. Comparten los mismos datos, así que viven en la misma
   * pantalla en vez de en dos módulos que se desincronizan.
   */
  vista: 'empresas' | 'cobros' = 'empresas';

  cobros: CobrosOverview | null = null;
  cargandoCobros = false;
  errorCobros = '';
  filtroCobros: FiltroCobros = 'todas';

  /**
   * Paginación. Con 64 empresas la lista ya obliga a hacer scroll a ciegas, y
   * abrir la ficha de una del final significa recorrer todo otra vez.
   * Las opciones incluyen "todas" porque para 64 filas a veces es lo cómodo.
   */
  readonly tamanosPagina = [25, 50, 100];
  porPagina = 25;
  pagina = 1;

  porPaginaCobros = 25;
  paginaCobros = 1;

  private destroy$ = new Subject<void>();

  constructor(
    private companiesService: CompaniesService,
    private notificationService: NotificationService,
    private subscriptionService: SubscriptionService,
    private dataStoreService: DataStoreService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  cargar(forzar = false): void {
    this.cargando = true;
    this.recalculando = forzar;
    this.error = '';

    this.companiesService
      .getPlatformOverview(forzar)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cargando = false;
          this.recalculando = false;
        })
      )
      .subscribe({
        next: (res) => {
          this.totales = res.totales;
          this.empresas = res.empresas || [];
          this.generadoEn = res.generadoEn;
          this.ventanaDias = res.ventanaDias || 30;
          this.catalogoIntegraciones = res.integraciones?.catalogo || [];
          this.integracionesSinNadie = res.integraciones?.sinNingunaEmpresa || [];
          // Un backend viejo (sin desplegar todavía) no manda el bloque: se
          // trata como censo caído, que dibuja "—", en vez de como cero.
          this.censoIntegracionesOk = res.integraciones?.disponible === true;
          this.aplicarFiltros();
        },
        error: (err) => {
          // Un fallo se muestra como fallo. Nada de datos de ejemplo.
          this.empresas = [];
          this.empresasFiltradas = [];
          this.totales = null;
          this.error =
            err?.status === 403
              ? 'Esta consola es solo para el administrador de la plataforma (Julsmind). Verifica con qué empresa iniciaste sesión.'
              : err?.error?.error || 'No se pudo cargar el panorama de la plataforma.';
        },
      });
  }

  /**
   * El botón Actualizar FUERZA el recálculo. Antes solo volvía a pedir los
   * mismos datos del caché: tras crear los índices de la suma, la pantalla
   * siguió mostrando "—" y parecía que el arreglo no había servido.
   */
  refrescar(): void {
    this.cargar(true);
  }

  // ── Cobros ────────────────────────────────────────────────────────────────

  cambiarVista(vista: 'empresas' | 'cobros'): void {
    this.vista = vista;
    if (vista === 'cobros' && !this.cobros && !this.cargandoCobros) this.cargarCobros();
  }

  cargarCobros(): void {
    this.cargandoCobros = true;
    this.errorCobros = '';

    this.companiesService
      .getBillingOverview()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.cargandoCobros = false))
      )
      .subscribe({
        next: (res) => (this.cobros = res),
        error: (err) => {
          this.cobros = null;
          this.errorCobros = err?.error?.error || 'No se pudieron cargar los cobros del mes.';
        },
      });
  }

  /**
   * Las empresas que se ven en la tabla de cobros.
   *
   * Las tarjetas de arriba no son adorno: cada una enciende su filtro, igual que
   * en la pestaña de Empresas. Volver a tocarla lo apaga.
   */
  get cobrosFiltrados(): FilaCobro[] {
    const filas = this.cobros?.empresas || [];

    switch (this.filtroCobros) {
      case 'aCobrar':
        // Las que suman en "A cobrar este periodo": ni cortesía, ni sin calcular.
        return filas.filter((c) => c.modoCobro !== 'cortesia' && c.montoPeriodoCOP !== null);
      case 'sinTarjeta':
        return filas.filter((c) => c.modoCobro === 'manual');
      case 'vencidas':
        return filas.filter((c) => c.renovacion?.estado === 'vencido');
      default:
        return filas;
    }
  }

  filtrarCobros(filtro: FiltroCobros): void {
    // Tocar la tarjeta encendida quita el filtro: es el gesto que espera
    // cualquiera que use un tablero.
    this.filtroCobros = this.filtroCobros === filtro ? 'todas' : filtro;
    this.paginaCobros = 1;
  }

  etiquetaFiltroCobros(): string {
    switch (this.filtroCobros) {
      case 'aCobrar': return 'las empresas que se cobran este periodo';
      case 'sinTarjeta': return 'las empresas sin tarjeta inscrita';
      case 'vencidas': return 'las empresas con el corte vencido';
      default: return '';
    }
  }

  /** Lo que suman las empresas que se están viendo, no el total de siempre. */
  get montoFiltrado(): number {
    return this.cobrosFiltrados.reduce((a, c) => a + (c.montoPeriodoCOP || 0), 0);
  }

  /**
   * Etiqueta del modo de cobro.
   *
   * "Cobrar a mano" estaba mal dicho: hacía pensar que alguien de Katuq tiene
   * que perseguir el pago, cuando el sistema SÍ genera factura y link. Lo que
   * cambia es si hay una tarjeta a la cual cobrarle.
   */
  etiquetaModo(modo: FilaCobro['modoCobro']): string {
    if (modo === 'automatico') return 'Tarjeta inscrita';
    if (modo === 'manual') return 'Link de pago';
    return 'Cortesía';
  }

  /** El periodo tal como se factura. */
  etiquetaPeriodo(fila: FilaCobro): string {
    const p = (fila.renovacion?.periodo || fila.periodo || '').toLowerCase();
    if (p === 'anual' || p === 'yearly') return 'Anual';
    if (p === 'quarterly') return 'Trimestral';
    if (p === 'mensual' || p === 'monthly') return 'Mensual';
    return '—';
  }

  /** Estado de la última factura, en palabras. */
  /**
   * Abre la factura electrónica en su pantalla, buscada por número.
   *
   * No navega a un detalle: la pantalla de Facturación electrónica no tiene
   * rutas por documento. Se le pasa el número como parámetro y ella abre la
   * lista con esa búsqueda puesta, que es lo que el operador necesita ver.
   */
  verFacturaDian(dian: { numero: string | null; cufe: string | null }, evento: Event): void {
    evento.stopPropagation();
    this.router.navigate(['/facturacion-electronica'], {
      queryParams: { documento: dian.numero || dian.cufe || '' },
    });
  }

  etiquetaFactura(fila: FilaCobro): string {
    const e = fila.ultimaFactura?.estado;
    if (!e) return 'Sin facturas';
    const mapa: Record<string, string> = {
      paid: 'Pagada',
      open: 'Abierta',
      pending_manual: 'Pendiente de pago',
      processing: 'Procesando',
      failed: 'Fallida',
      cancelled: 'Cancelada',
      custom: 'A convenir',
    };
    return mapa[e] || e;
  }

  /**
   * Baja la lista como CSV para pasarla a facturación. Es el puente hasta que el
   * cobro automático esté encendido: hoy nueve de diez empresas se facturan a
   * mano y alguien tiene que tener esa lista en la mano.
   */
  exportarCobros(): void {
    // Se baja lo que se está viendo: si filtró por "sin tarjeta", eso es lo que
    // quiere pasarle a facturación, no las diez.
    const visibles = this.cobrosFiltrados;
    if (!visibles.length) return;

    const columnas = [
      'Empresa', 'NIT', 'Correo', 'Modo de cobro', 'Periodo', 'Renovacion',
      'Dias', 'Plan', 'Ventas del mes', 'Monto a cobrar', 'Ultima factura',
    ];

    const filas = visibles.map((e) => [
      e.nomComercial || '',
      e.nit || '',
      e.correo || '',
      this.etiquetaModo(e.modoCobro),
      this.etiquetaPeriodo(e),
      e.renovacion?.fecha ? this.fechaCorta(e.renovacion.fecha) : '',
      e.renovacion?.diasRestantes ?? '',
      e.tierNombre || '',
      e.ventasMes ?? '',
      e.montoPeriodoCOP ?? '',
      this.etiquetaFactura(e),
    ]);

    // Separador `;` y BOM: es lo que Excel en español abre sin preguntar nada.
    const csv = [columnas, ...filas]
      .map((f) => f.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';'))
      .join('\r\n');

    const hoy = new Date().toISOString().slice(0, 10);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cobros-katuq-' + hoy + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Filtros y orden ───────────────────────────────────────────────────────

  aplicarFiltros(): void {
    const termino = this.busqueda.trim().toLowerCase();

    let resultado = this.empresas.filter((e) => {
      if (termino) {
        const campos = [e.nombre, e.nomComercial, e.nit, e.emailContactoGeneral, e.ciudad];
        if (!campos.some((c) => (c || '').toString().toLowerCase().includes(termino))) {
          return false;
        }
      }

      if (this.filtroEscalon !== 'todos') {
        if (this.filtroEscalon === 'freemium') {
          if (e.escalon?.aplica) return false;
        } else if (e.escalon?.id !== this.filtroEscalon) {
          return false;
        }
      }

      switch (this.filtroEstado) {
        case 'activas':
          return e.activo;
        case 'inactivas':
          return !e.activo;
        // 'pagan' se retiró: era EXACTAMENTE el mismo conjunto que 'premium'
        // con otro nombre. Dos entradas del desplegable que devuelven la misma
        // lista solo sirven para hacer dudar de si son lo mismo.
        case 'premium':
          return e.plan === 'premium';
        case 'freemium':
          return e.plan !== 'premium';
        case 'anual':
          return e.escalon?.periodo === 'anual';
        // Clientes con acuerdo cerrado: su precio NO sale de las ventas, así que
        // son los que hay que revisar a mano cuando cambia la tabla de precios.
        case 'pactado':
          return e.escalon?.pactado === true;
        // Los que pagan pero NO tienen tarjeta: a estos hay que mandarles link
        // y perseguir el pago. La cortesía no entra: no se le cobra a propósito.
        case 'conTarjeta':
          return e.modoCobro === 'automatico';
        case 'sinTarjeta':
          return e.modoCobro === 'manual';
        // EN RIESGO es la unión de las dos señales de abandono, igual que el
        // total del backend. Si acá fuera un AND, la tarjeta diría 18 y la
        // lista mostraría 4.
        case 'enRiesgo':
          return this.sinMovimiento(e) || this.sinEntrar(e);
        case 'sinMovimiento':
          return this.sinMovimiento(e);
        case 'sinEntrar':
          return this.sinEntrar(e);
        case 'porVencer':
          return this.planVencido(e) || this.planPorVencer(e);
        case 'sinIntegrar':
          return this.sinIntegrar(e);
        default:
          return true;
      }
    });

    resultado = resultado.sort((a, b) => {
      switch (this.orden) {
        case 'pedidos30d':
          return (b.metricas?.pedidos30d || 0) - (a.metricas?.pedidos30d || 0);
        case 'facturado':
          return (b.metricas?.facturadoNeto30d || 0) - (a.metricas?.facturadoNeto30d || 0);
        // Por lo que DEJA cada cliente al mes, no por lo que vende. Usa el
        // equivalente mensual para que un anual no se cuele arriba por traer la
        // factura del año entero.
        case 'precio':
          return (
            (b.escalon?.precioMensualEquivalenteUSD || 0) -
            (a.escalon?.precioMensualEquivalenteUSD || 0)
          );
        case 'usuarios':
          return (b.metricas?.usuarios || 0) - (a.metricas?.usuarios || 0);
        case 'integraciones':
          return (b.integraciones?.activas || 0) - (a.integraciones?.activas || 0);
        case 'ultimoPedido':
          return this.aMs(b.metricas?.ultimoPedido) - this.aMs(a.metricas?.ultimoPedido);
        case 'ultimoIngreso':
          return this.aMs(b.ultimoIngreso) - this.aMs(a.ultimoIngreso);
        case 'antiguedad':
          // Las más antiguas primero. Una empresa sin fecha va al final, no de
          // primera: no sabemos que sea vieja.
          return (this.aMs(a.creadaEn) || Infinity) - (this.aMs(b.creadaEn) || Infinity);
        default:
          return (a.nombre || '').localeCompare(b.nombre || '');
      }
    });

    this.empresasFiltradas = resultado;

    // Volver a la primera página: quedarse en la 3 de una lista que ahora tiene
    // una sola deja la tabla vacía sin ninguna explicación.
    if (this.pagina > this.totalPaginas) this.pagina = 1;
  }

  // ── Paginación ────────────────────────────────────────────────────────────

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.empresasFiltradas.length / this.porPagina));
  }

  /** Las empresas de la página actual. */
  get empresasPagina(): EmpresaPanorama[] {
    const desde = (this.pagina - 1) * this.porPagina;
    return this.empresasFiltradas.slice(desde, desde + this.porPagina);
  }

  /** Primer registro visible, en base 1. Cero cuando no hay ninguno. */
  get desdeVisible(): number {
    return this.empresasFiltradas.length === 0 ? 0 : (this.pagina - 1) * this.porPagina + 1;
  }

  get hastaVisible(): number {
    return Math.min(this.pagina * this.porPagina, this.empresasFiltradas.length);
  }

  irAPagina(pagina: number): void {
    this.pagina = Math.min(Math.max(1, pagina), this.totalPaginas);
    // La ficha abierta puede quedar en otra página: se cierra para que el
    // acordeón no siga "abierto" en algo que ya no se ve.
    this.expandidaId = null;
  }

  cambiarTamanoPagina(tamano: number | string): void {
    this.porPagina = Number(tamano) || 25;
    this.pagina = 1;
  }

  get totalPaginasCobros(): number {
    return Math.max(1, Math.ceil(this.cobrosFiltrados.length / this.porPaginaCobros));
  }

  get cobrosPagina(): FilaCobro[] {
    const desde = (this.paginaCobros - 1) * this.porPaginaCobros;
    return this.cobrosFiltrados.slice(desde, desde + this.porPaginaCobros);
  }

  get desdeVisibleCobros(): number {
    return this.cobrosFiltrados.length === 0 ? 0 : (this.paginaCobros - 1) * this.porPaginaCobros + 1;
  }

  get hastaVisibleCobros(): number {
    return Math.min(this.paginaCobros * this.porPaginaCobros, this.cobrosFiltrados.length);
  }

  irAPaginaCobros(pagina: number): void {
    this.paginaCobros = Math.min(Math.max(1, pagina), this.totalPaginasCobros);
  }

  cambiarTamanoPaginaCobros(tamano: number | string): void {
    this.porPaginaCobros = Number(tamano) || 25;
    this.paginaCobros = 1;
  }

  filtrarPor(estado: FiltroEstado): void {
    // Volver a tocar la tarjeta activa quita el filtro: es el gesto que espera
    // cualquiera que use un tablero.
    this.filtroEstado = this.filtroEstado === estado ? 'todas' : estado;
    this.buscarDesdeElPrincipio();
  }

  /**
   * Cambiar la búsqueda, el filtro o el orden devuelve a la PRIMERA página.
   *
   * Quedarse en la página 3 después de buscar deja al operador mirando los
   * resultados 51 a 64 de una búsqueda que él cree que empieza arriba. Ojo: las
   * acciones (bloquear, cambiar plan) NO pasan por acá a propósito — reordenar
   * la lista bajo los pies de quien acaba de hacer clic es peor.
   */
  buscarDesdeElPrincipio(): void {
    this.pagina = 1;
    this.aplicarFiltros();
  }

  /**
   * Las tarjetas de Pedidos y Ticket ORDENAN en vez de filtrar.
   *
   * No son una condición que parta la lista en dos ("las empresas con ticket"
   * no existe), así que filtrar por ellas no significaría nada. Lo que sí
   * responde a la pregunta que llevan detrás —¿quién vende más?— es subir esas
   * empresas al principio. Volver a tocarlas devuelve el orden por nombre.
   */
  ordenarPor(criterio: Orden): void {
    this.orden = this.orden === criterio ? 'nombre' : criterio;
    this.buscarDesdeElPrincipio();
  }

  /** Nombre legible del escalón filtrado, para el aviso. */
  etiquetaEscalon(): string {
    if (this.filtroEscalon === 'todos') return '';
    if (this.filtroEscalon === 'freemium') return 'Freemium (no se cobra)';
    return this.escalones.find((e) => e.id === this.filtroEscalon)?.nombre || this.filtroEscalon;
  }

  /**
   * Quita los filtros de la lista pero DEJA la búsqueda.
   *
   * Existe aparte de `limpiarFiltros` porque el aviso aparece cuando un filtro
   * escondió empresas, y borrarle de paso lo que escribió en el buscador sería
   * hacer más de lo que dice el botón.
   */
  quitarFiltrosDeLista(): void {
    this.filtroEstado = 'todas';
    this.filtroEscalon = 'todos';
    this.buscarDesdeElPrincipio();
  }

  /** Nombre legible del filtro activo, para el aviso. */
  etiquetaFiltro(): string {
    switch (this.filtroEstado) {
      case 'activas': return 'empresas activas';
      case 'inactivas': return 'empresas inactivas';
      case 'premium': return 'clientes Premium (de pago)';
      case 'freemium': return 'clientes Freemium (gratis)';
      case 'anual': return 'clientes que pagan por año';
      case 'pactado': return 'clientes con precio pactado a mano';
      case 'conTarjeta': return 'clientes con tarjeta inscrita';
      case 'sinTarjeta': return 'clientes sin tarjeta inscrita (se les envía link de pago)';
      case 'enRiesgo': return 'empresas que dejaron de vender o de entrar';
      case 'sinMovimiento': return 'empresas sin movimiento';
      case 'sinEntrar': return 'empresas donde nadie entra hace 30 días';
      case 'porVencer': return 'planes vencidos o por vencer';
      case 'sinIntegrar': return 'empresas activas sin ninguna integración conectada';
      default: return '';
    }
  }

  /**
   * Limpiar deja la pantalla como recién cargada.
   *
   * Incluye el filtro de la pestaña de COBROS a propósito: es el mismo botón
   * para el operador, y dejar filtrada la otra pestaña hacía que "Limpiar"
   * pareciera no haber servido en cuanto se cambiaba de vista.
   */
  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = 'todas';
    this.filtroEscalon = 'todos';
    this.orden = 'nombre';
    this.filtroCobros = 'todas';
    this.paginaCobros = 1;
    this.buscarDesdeElPrincipio();
  }

  // ── Ficha individual ──────────────────────────────────────────────────────

  alternarFicha(empresa: EmpresaPanorama): void {
    if (this.expandidaId === empresa._docId) {
      this.expandidaId = null;
      return;
    }

    this.expandidaId = empresa._docId;

    // Las unidades de inventario se piden una sola vez por empresa y solo al
    // abrir: exigen leer y deduplicar, así que no van en el listado.
    if (!this.unidadesPorEmpresa.has(empresa._docId) && !this.cargandoUnidades.has(empresa._docId)) {
      this.cargarUnidades(empresa);
    }
  }

  private cargarUnidades(empresa: EmpresaPanorama): void {
    this.cargandoUnidades.add(empresa._docId);
    this.errorUnidades.delete(empresa._docId);

    this.companiesService
      .getCompanyInventoryUnits(empresa._docId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargandoUnidades.delete(empresa._docId))
      )
      .subscribe({
        next: (res) => this.unidadesPorEmpresa.set(empresa._docId, res),
        error: () =>
          this.errorUnidades.set(empresa._docId, 'No se pudieron calcular las unidades'),
      });
  }

  unidadesDe(empresa: EmpresaPanorama): InventoryUnits | undefined {
    return this.unidadesPorEmpresa.get(empresa._docId);
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  /**
   * Bloquea o desbloquea una empresa.
   *
   * Es la única acción destructiva que existe en la consola, y es REVERSIBLE a
   * propósito: bloquear corta el acceso de todos sus usuarios, pero no borra
   * nada y se deshace con otro clic. Al bloquear se pide un motivo, que queda
   * guardado con el nombre de quien lo hizo — una empresa sin acceso y sin
   * explicación es indistinguible de una caída del sistema.
   */
  async alternarEstado(empresa: EmpresaPanorama, evento: Event): Promise<void> {
    evento.stopPropagation();

    const desbloqueando = !empresa.activo;
    const nombre = empresa.nomComercial || empresa.nombre || 'esta empresa';
    const usuarios = empresa.metricas?.usuarios;

    let motivo = '';

    if (desbloqueando) {
      const confirmacion = await Swal.fire({
        title: `¿Desbloquear ${nombre}?`,
        html:
          'Sus usuarios podrán volver a iniciar sesión de inmediato.' +
          (empresa.bloqueo
            ? `<br><br><small class="text-muted">Fue bloqueada por ${empresa.bloqueo.por}<br>Motivo: ${empresa.bloqueo.motivo}</small>`
            : ''),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, desbloquear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0F9D58',
        reverseButtons: true,
      });
      if (!confirmacion.isConfirmed) return;
    } else {
      const confirmacion = await Swal.fire({
        title: `¿Bloquear ${nombre}?`,
        html:
          `<div style="text-align:left">` +
          `<p><b>${typeof usuarios === 'number' ? usuarios : 'Sus'} usuarios</b> dejarán de poder iniciar sesión de inmediato.</p>` +
          `<p class="text-muted" style="font-size:.9em">No se borra nada: sus productos, clientes y pedidos quedan intactos, y puedes desbloquearla cuando quieras.</p>` +
          `</div>`,
        icon: 'warning',
        input: 'text',
        inputLabel: '¿Por qué la bloqueas?',
        inputPlaceholder: 'Ej: falta de pago, solicitud del cliente…',
        showCancelButton: true,
        confirmButtonText: 'Bloquear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#D7263D',
        reverseButtons: true,
        focusCancel: true,
        inputValidator: (v) =>
          (v || '').trim().length < 4 ? 'Escribe el motivo: queda en el registro' : null,
      });
      if (!confirmacion.isConfirmed) return;
      motivo = (confirmacion.value || '').trim();
    }

    this.cambiandoEstado.add(empresa._docId);

    this.companiesService
      .updateCompanyStatus(empresa._docId, desbloqueando, motivo)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cambiandoEstado.delete(empresa._docId))
      )
      .subscribe({
        next: (res) => {
          empresa.activo = desbloqueando;
          empresa.bloqueo = res?.bloqueo || null;
          this.recalcularTotalesLocales();
          this.aplicarFiltros();
          this.notificationService.success(
            'Listo',
            `${nombre} quedó ${desbloqueando ? 'desbloqueada' : 'bloqueada'}`
          );
        },
        error: () => this.notificationService.error('Error', 'No se pudo cambiar el estado'),
      });
  }

  /**
   * El plan del cliente: qué plan tiene, qué se le pactó y cada cuánto paga.
   *
   * Antes esto era un sí/no —Premium o Freemium— y todo lo demás lo deducía el
   * sistema de las ventas. Eso funciona mientras no haya acuerdo: un cliente al
   * que se le pactó un escalón fijo, o que compró un año por adelantado,
   * terminaba cobrado por Base y en mensual porque el acuerdo no estaba escrito
   * en ninguna parte. Acá se escribe.
   *
   * Lo que NO se toca desde acá: el escalón cuando se deja en "automático", que
   * lo siguen decidiendo las ventas mes a mes.
   */
  async cambiarPlan(empresa: EmpresaPanorama, evento: Event): Promise<void> {
    evento.stopPropagation();
    try {
      await this.abrirEditorDePlan(empresa, evento);
    } catch (e: any) {
      // Un formulario que no abre y no dice nada es indistinguible de un clic
      // que no llegó: se pierde el tiempo buscando el problema donde no está.
      console.error('[consola] no se pudo abrir el editor de plan:', e);
      this.notificationService.error(
        'No se pudo abrir el editor de plan',
        e?.message || 'Error inesperado. Mira la consola del navegador (F12).'
      );
    }
  }

  private async abrirEditorDePlan(empresa: EmpresaPanorama, evento: Event): Promise<void> {
    const nombre = empresa.nomComercial || empresa.nombre || '';
    const eraPremium = (empresa.plan || 'freemium') === 'premium';
    const pactoActual = (empresa.tierContratado || '').toLowerCase();
    const periodoActual = empresa.billingPeriod === 'yearly' ? 'yearly' : 'monthly';
    // El <input type="date"> solo entiende yyyy-mm-dd.
    const msFecha = this.aMs(empresa.renovacion?.fecha);
    const fechaActual = msFecha ? new Date(msFecha).toISOString().slice(0, 10) : '';

    const opciones = ESCALONES.map(
      (e) =>
        `<option value="${e.id}" ${pactoActual === e.id ? 'selected' : ''}>` +
        `${e.nombre} — ${e.usd ? 'US$' + e.usd + '/mes' : 'a medida'} (hasta ${e.hasta})</option>`
    ).join('');

    const resultado = await Swal.fire({
      title: 'Plan del cliente',
      width: 520,
      html: `
        <div style="text-align:left;font-size:.9rem">
          <p style="margin:0 0 14px"><b>${nombre}</b></p>

          <label style="display:block;font-weight:600;margin-bottom:4px">Plan</label>
          <select id="sw-plan" class="swal2-select" style="width:100%;margin:0 0 14px">
            <option value="premium" ${eraPremium ? 'selected' : ''}>★ Premium — sin límites, se le cobra</option>
            <option value="freemium" ${!eraPremium ? 'selected' : ''}>Freemium — gratis, 15 pedidos al mes</option>
          </select>

          <div id="sw-pago">
            <label style="display:block;font-weight:600;margin-bottom:4px">Escalón de precio</label>
            <select id="sw-tier" class="swal2-select" style="width:100%;margin:0 0 4px">
              <option value="auto" ${!pactoActual ? 'selected' : ''}>Automático — lo deciden sus ventas</option>
              ${opciones}
            </select>
            <p style="margin:0 0 14px;font-size:.75rem;color:#6b7280">
              Elige uno fijo solo si se pactó con el cliente. En automático, el escalón
              cambia solo cada mes según lo que venda.
            </p>

            <label style="display:block;font-weight:600;margin-bottom:4px">Cada cuánto paga</label>
            <select id="sw-periodo" class="swal2-select" style="width:100%;margin:0 0 4px">
              <option value="monthly" ${periodoActual === 'monthly' ? 'selected' : ''}>Mensual</option>
              <option value="yearly" ${periodoActual === 'yearly' ? 'selected' : ''}>Anual — 12 meses con 20% de descuento</option>
            </select>
            <p style="margin:0 0 14px;font-size:.75rem;color:#6b7280">
              El anual cobra el año completo de una sola vez.
            </p>

            <label style="display:block;font-weight:600;margin-bottom:4px">Próximo cobro</label>
            <input id="sw-fecha" type="date" class="swal2-input"
                   style="width:100%;margin:0 0 4px" value="${fechaActual}">
            <p style="margin:0;font-size:.75rem;color:#6b7280">
              El día en que se le cobra. <b>Déjalo como está si no lo vas a cambiar.</b>
              En un plan anual esta fecha debe ir a un año: si queda al mes siguiente,
              se le cobraría el año entero doce veces.
            </p>
          </div>
        </div>`,
      didOpen: () => {
        // Los campos de cobro no tienen sentido en freemium: a nadie se le pacta
        // un escalón que no se le va a cobrar.
        const plan = document.getElementById('sw-plan') as HTMLSelectElement;
        const pago = document.getElementById('sw-pago') as HTMLElement;
        const sincronizar = () => (pago.style.display = plan.value === 'premium' ? '' : 'none');
        plan.addEventListener('change', sincronizar);
        sincronizar();
      },
      preConfirm: () => ({
        plan: (document.getElementById('sw-plan') as HTMLSelectElement).value as 'premium' | 'freemium',
        tierContratado: (document.getElementById('sw-tier') as HTMLSelectElement).value,
        billingPeriod: (document.getElementById('sw-periodo') as HTMLSelectElement).value as
          | 'monthly'
          | 'yearly',
        nextBillingDate: (document.getElementById('sw-fecha') as HTMLInputElement).value,
      }),
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F9D58',
      reverseButtons: true,
      focusConfirm: false,
    });

    if (!resultado.isConfirmed || !resultado.value) return;

    const v = resultado.value;
    if (v.plan === 'premium' && v.billingPeriod === 'yearly' && v.nextBillingDate) {
      const dias = (new Date(v.nextBillingDate).getTime() - Date.now()) / MS_DIA;
      if (dias < 180) {
        const sigue = await Swal.fire({
          title: 'Revisa la fecha',
          html:
            `Marcaste <b>plan anual</b> pero el próximo cobro queda en <b>${Math.round(dias)} días</b>.<br><br>` +
            'En anual se cobra el año completo de una vez: con esa fecha se le cobraría ' +
            'el año entero antes de que termine el que ya pagó.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Guardar así',
          cancelButtonText: 'Volver a corregir',
          confirmButtonColor: '#d9534f',
          reverseButtons: true,
        });
        if (!sigue.isConfirmed) return this.abrirEditorDePlan(empresa, evento);
      }
    }

    const nuevo = resultado.value.plan;
    // Bajar a gratis borra el acuerdo: no se manda nada que el backend tenga que
    // ignorar, y él ya se encarga de limpiar el pacto viejo.
    const acuerdo =
      nuevo === 'premium'
        ? {
            tierContratado: resultado.value.tierContratado,
            billingPeriod: resultado.value.billingPeriod,
            // Vacío = no la toques. El backend distingue "no vino el campo" de
            // "vino con valor", así que no hay forma de borrarla sin querer.
            nextBillingDate: resultado.value.nextBillingDate || undefined,
          }
        : undefined;

    this.cambiandoPlan.add(empresa._docId);

    this.subscriptionService
      .adminUpgradePlan(nombre, nuevo, acuerdo)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cambiandoPlan.delete(empresa._docId))
      )
      .subscribe({
        next: () => {
          empresa.plan = nuevo;
          empresa.tierContratado =
            nuevo === 'premium' && acuerdo && acuerdo.tierContratado !== 'auto'
              ? acuerdo.tierContratado
              : null;
          empresa.billingPeriod = nuevo === 'premium' && acuerdo ? acuerdo.billingPeriod : null;
          this.recalcularTotalesLocales();
          this.aplicarFiltros();
          // El escalón y el monto los recalcula el BACKEND con las ventas y el
          // periodo: repetir esa cuenta acá sería una segunda tabla de precios.
          // Se refrescan al recargar; mientras tanto no se inventan.
          this.notificationService.success(
            'Listo',
            `${nombre} quedó en ${nuevo.toUpperCase()}. Dale a Actualizar para ver el precio recalculado.`
          );
        },
        error: (err) =>
          this.notificationService.error(
            'Error',
            err?.error?.message || 'No se pudo actualizar el plan'
          ),
      });
  }

  /** Crear empresa: reutiliza el formulario existente, no se reimplementa. */
  crearEmpresa(): void {
    // Ya no hay que limpiar ningún borrador: el formulario sabe que está creando
    // porque la RUTA se lo dice, no porque el almacén del navegador esté vacío.
    this.router.navigateByUrl('empresas/crearEmpresa');
  }

  /**
   * Abre la ficha de la empresa: solo navega a `empresas/editar/:docId`.
   *
   * El formulario pide él mismo el documento COMPLETO al backend. Antes esa
   * carga se hacía acá y se dejaba la empresa en IndexedDB para que el
   * formulario la recogiera: si esa escritura fallaba, el botón quedaba mudo, y
   * la otra lista (la del comercio) hacía lo mismo pero pasando la FILA de la
   * tabla, que no trae `sedes` ni `contactos` y los borraba al guardar. Con la
   * empresa identificada en la URL, las dos listas hacen lo mismo y no hay dos
   * maneras de abrir la ficha.
   */
  editarEmpresa(empresa: EmpresaPanorama, evento: Event): void {
    evento.stopPropagation();
    this.router.navigate(['empresas', 'editar', empresa._docId]);
  }

  /**
   * Los totales se recalculan localmente tras una acción para que la franja
   * superior no quede mintiendo hasta el próximo refresco. Solo los que dependen
   * de campos que acabamos de cambiar: los de movimiento vienen del backend.
   */
  private recalcularTotalesLocales(): void {
    if (!this.totales) return;
    this.totales = {
      ...this.totales,
      activas: this.empresas.filter((e) => e.activo).length,
      inactivas: this.empresas.filter((e) => !e.activo).length,
      premium: this.empresas.filter((e) => e.plan === 'premium').length,
      freemium: this.empresas.filter((e) => e.plan !== 'premium').length,
      empresasSinMovimiento: this.empresas.filter((e) => this.sinMovimiento(e)).length,
      empresasEnRiesgo: this.empresas.filter(
        (e) => this.sinMovimiento(e) || this.sinEntrar(e)
      ).length,
      empresasSinTarjeta: this.empresas.filter((e) => e.modoCobro === 'manual').length,
      empresasConTarjeta: this.empresas.filter((e) => e.modoCobro === 'automatico').length,
      // El ingreso NO se recalcula acá: subir una empresa a plan pago le cambia
      // el escalón, y ese lo deduce el backend de sus ventas. Inventarlo en el
      // front sería una segunda copia de la tabla de precios, que es justo lo
      // que `planPricing` existe para evitar. Se corrige en el próximo refresco.
    };
  }

  // ── Estado derivado de una empresa ────────────────────────────────────────

  /**
   * EL estado de una empresa, en una sola palabra.
   *
   * Una empresa puede estar bloqueada, con el plan vencido y sin vender al
   * mismo tiempo. Mostrar las tres etiquetas volvería la columna ilegible y
   * mostrar una al azar sería peor, así que hay un ORDEN DE PRIORIDAD fijo y
   * gana la más grave. El globo cuenta el detalle completo.
   *
   * El orden responde a "¿qué hago con este cliente hoy?":
   * 1. **Bloqueada** — no puede entrar. Nada más importa hasta resolver eso.
   * 2. **Plan vencido** — dinero que ya se debía cobrar.
   * 3. **En riesgo** — se está yendo; es lo único que se puede prevenir.
   * 4. **Vence pronto** — rutina de la semana.
   * 5. **Al día / Activa** — no hay nada que hacer.
   */
  estadoEmpresa(empresa: EmpresaPanorama): {
    clave: string;
    etiqueta: string;
    titulo: string;
  } {
    if (!empresa.activo) {
      const b = empresa.bloqueo;
      return {
        clave: 'bloqueada',
        etiqueta: 'Bloqueada',
        titulo: b?.motivo
          ? `Bloqueada el ${this.fechaCorta(b.fecha)} por ${b.por || 'alguien'}: ${b.motivo}`
          : 'Desactivada: sus usuarios no pueden entrar a Katuq. Sin motivo registrado.',
      };
    }

    if (this.planVencido(empresa)) {
      return {
        clave: 'vencida',
        etiqueta: 'Plan vencido',
        titulo: `Se le venció el ${this.fechaCorta(empresa.renovacion?.fecha)} y sigue usando Katuq: hay un cobro pendiente.`,
      };
    }

    const noVende = this.sinMovimiento(empresa);
    const noEntra = this.sinEntrar(empresa);
    if (noVende || noEntra) {
      const razones = [];
      if (noVende) razones.push(`no vende hace ${this.ventanaDias} días`);
      if (noEntra) razones.push('nadie inicia sesión hace más de 30 días');
      return {
        clave: 'riesgo',
        etiqueta: 'En riesgo',
        titulo: `Se está enfriando: ${razones.join(' y ')}.`,
      };
    }

    if (this.planPorVencer(empresa)) {
      return {
        clave: 'porvencer',
        etiqueta: 'Vence pronto',
        titulo: `Renueva el ${this.fechaCorta(empresa.renovacion?.fecha)}, esta semana.`,
      };
    }

    // Freemium "al día" se leería como que está pagando puntual. No paga nada.
    if (!empresa.escalon?.aplica) {
      return {
        clave: 'activa',
        etiqueta: 'Activa',
        titulo: 'Operando con el plan gratis. No tiene ningún cobro pendiente porque no se le cobra.',
      };
    }

    return {
      clave: 'aldia',
      etiqueta: 'Al día',
      titulo: 'Operando, vendiendo y con el plan vigente.',
    };
  }

  /** Empresa activa que no ha vendido nada en la ventana. */
  sinMovimiento(empresa: EmpresaPanorama): boolean {
    if (!empresa.activo) return false;
    const pedidos = empresa.metricas?.pedidos30d;
    if (typeof pedidos === 'number') return pedidos === 0;
    const ultimo = this.aMs(empresa.metricas?.ultimoPedido);
    if (!ultimo) return true;
    return Date.now() - ultimo > DIAS_SIN_MOVIMIENTO * MS_DIA;
  }

  /**
   * Abre o cierra el desglose por proveedor.
   *
   * La tarjeta de integraciones NO ordena la lista como las de pedidos o
   * ticket: la pregunta que lleva detrás no es "¿qué empresa tiene más?" sino
   * "¿cuáles integraciones se usan?", y eso no se responde reordenando
   * empresas. Ordenar por integraciones sigue disponible en el desplegable.
   */
  alternarPanelIntegraciones(): void {
    this.panelIntegraciones = !this.panelIntegraciones;
  }

  /** Etiqueta legible de la categoría de un proveedor. */
  etiquetaCategoria(categoria: string): string {
    switch (categoria) {
      case 'ecommerce': return 'E-commerce';
      case 'pagos': return 'Pagos';
      case 'logistica': return 'Logística';
      case 'contabilidad': return 'Contabilidad';
      default: return 'Otras';
    }
  }

  /**
   * Empresa activa sin ninguna integración CONECTADA.
   *
   * Con el censo caído (`integraciones === null`) devuelve `false`: no saber si
   * tiene integraciones no es lo mismo que saber que no tiene, y acusarla acá
   * la metería en una lista de "hay que llamarla" sin fundamento.
   */
  sinIntegrar(empresa: EmpresaPanorama): boolean {
    if (!empresa.activo) return false;
    if (!empresa.integraciones) return false;
    return empresa.integraciones.activas === 0;
  }

  /**
   * Las integraciones que se muestran en la fila y en la ficha.
   *
   * Devuelve `null` cuando no hay censo, para que la plantilla dibuje "—" en
   * vez de un 0. La lista ya viene ordenada del backend (activas primero).
   */
  integracionesDe(empresa: EmpresaPanorama): IntegracionesEmpresa | null {
    return empresa.integraciones || null;
  }

  /**
   * Texto del tooltip de la columna: los nombres, sin obligar a abrir la ficha.
   */
  tituloIntegraciones(empresa: EmpresaPanorama): string {
    const integraciones = empresa.integraciones;
    if (!integraciones) return 'No se pudo leer el censo de integraciones';
    if (!integraciones.proveedores.length) return 'No tiene ninguna integración configurada';

    const activas = integraciones.proveedores.filter((p) => p.activa).map((p) => p.nombre);
    const apagadas = integraciones.proveedores.filter((p) => !p.activa).map((p) => p.nombre);

    const partes: string[] = [];
    if (activas.length) partes.push(`Conectadas: ${activas.join(', ')}`);
    if (apagadas.length) partes.push(`Desconectadas: ${apagadas.join(', ')}`);
    return partes.join(' · ');
  }

  /**
   * ¿Esta empresa ya no puede conectar más integraciones con el plan que tiene?
   *
   * El límite freemium es 1 (`config/subscriptionLimits` en el backend) y los
   * planes pagos son ilimitados. Se repite acá porque es solo un distintivo
   * visual; el candado que de verdad bloquea vive en el backend, en
   * `integrationConfigService.saveConfig`.
   */
  enLimiteIntegraciones(empresa: EmpresaPanorama): boolean {
    if (!empresa.activo || empresa.plan === 'premium') return false;
    return (empresa.integraciones?.activas || 0) >= LIMITE_INTEGRACIONES_FREEMIUM;
  }

  /** Expiración del plan: `nextBillingDate`, o inicio + 1 mes. */
  expiracion(empresa: EmpresaPanorama): number | null {
    const siguiente = this.aMs(empresa.nextBillingDate);
    if (siguiente) return siguiente;

    const inicio = this.aMs(empresa.subscriptionStartDate);
    if (!inicio) return null;

    const d = new Date(inicio);
    d.setMonth(d.getMonth() + 1);
    return d.getTime();
  }

  planVencido(empresa: EmpresaPanorama): boolean {
    if (empresa.plan !== 'premium') return false;
    const exp = this.expiracion(empresa);
    return exp !== null && exp < Date.now();
  }

  planPorVencer(empresa: EmpresaPanorama): boolean {
    if (empresa.plan !== 'premium') return false;
    const exp = this.expiracion(empresa);
    if (exp === null) return false;
    return exp >= Date.now() && exp <= Date.now() + DIAS_POR_VENCER * MS_DIA;
  }

  /**
   * Días desde el último inicio de sesión de la empresa. `null` si nadie ha
   * entrado nunca — que NO es lo mismo que cero días.
   */
  /**
   * Empresa activa donde nadie entra hace más de 30 días. Solo con dato
   * conocido: "no sabemos cuándo entró" no es lo mismo que "está abandonada".
   * Espeja `sinEntrar` del backend para que la tarjeta y el filtro cuenten igual.
   */
  sinEntrar(empresa: EmpresaPanorama): boolean {
    if (!empresa.activo) return false;
    const dias = this.diasDesdeUltimoIngreso(empresa);
    return dias !== null && dias > 30;
  }

  /**
   * Texto del globo del chip de plan: qué pasa si lo tocas Y cuándo renueva.
   * Antes solo decía "Subir/Bajar", que era la acción pero no el estado.
   */
  tituloPlan(empresa: EmpresaPanorama): string {
    const accion = empresa.plan === 'premium' ? 'Bajar a Freemium' : 'Subir a Premium';
    const r = empresa.renovacion;

    if (!r || !r.aplica) return `${accion} · Freemium no vence`;
    if (!r.fecha) return `${accion} · sin fecha de renovación`;

    const cuando = new Date(r.fecha).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const estado = r.estado === 'vencido' ? 'venció' : 'renueva';
    const periodo = r.periodo ? ` (cobro ${r.periodo})` : '';
    return `${accion} · ${estado} el ${cuando}${periodo}`;
  }

  /**
   * Cuánto lleva en Katuq la empresa promedio, EN PALABRAS.
   *
   * Nada de "5 m": abreviado no se entiende si son meses o minutos. El rótulo
   * de la tarjeta dice de qué se trata y el pie sobre cuántas empresas se
   * promedió, porque 3 no tienen fecha de alta.
   */
  antiguedadMedia(): string {
    const dias = this.totales?.antiguedadMediaDias;
    if (dias === null || dias === undefined) return '—';

    if (dias < 31) return dias === 1 ? '1 día' : `${dias} días`;

    const meses = Math.round(dias / 30.44);
    if (meses < 12) return meses === 1 ? '1 mes' : `${meses} meses`;

    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    const parteAnios = anios === 1 ? '1 año' : `${anios} años`;
    if (resto === 0) return parteAnios;
    return `${parteAnios} ${resto === 1 ? '1 mes' : resto + ' meses'}`;
  }

  diasDesdeUltimoIngreso(empresa: EmpresaPanorama): number | null {
    const ultimo = this.aMs(empresa.ultimoIngreso);
    if (!ultimo) return null;
    return Math.floor((Date.now() - ultimo) / 86400000);
  }

  /**
   * Antigüedad en Katuq, en palabras: "1 año 3 meses", "8 meses", "12 días".
   * Vacío si no se sabe cuándo se creó (3 empresas no tienen ninguna fecha).
   */
  antiguedadEmpresa(empresa: EmpresaPanorama): string {
    const creada = this.aMs(empresa.creadaEn);
    if (!creada) return '';

    const meses = Math.floor((Date.now() - creada) / (30.44 * 86400000));
    if (meses < 1) {
      const dias = Math.max(0, Math.floor((Date.now() - creada) / 86400000));
      return dias === 1 ? '1 día' : `${dias} días`;
    }
    if (meses < 12) return meses === 1 ? '1 mes' : `${meses} meses`;

    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    const parteAnios = anios === 1 ? '1 año' : `${anios} años`;
    if (resto === 0) return parteAnios;
    return `${parteAnios} ${resto === 1 ? '1 mes' : resto + ' meses'}`;
  }

  diasDesdeUltimoPedido(empresa: EmpresaPanorama): number | null {
    const ultimo = this.aMs(empresa.metricas?.ultimoPedido);
    if (!ultimo) return null;
    return Math.floor((Date.now() - ultimo) / MS_DIA);
  }

  // ── Presentación ──────────────────────────────────────────────────────────

  /**
   * Un número que no se pudo calcular se muestra como "—", nunca como 0.
   * Un 0 falso parece una respuesta y no lo es.
   */
  num(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return valor.toLocaleString('es-CO');
  }

  dinero(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return valor.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    });
  }

  /**
   * Los precios de Katuq son contractuales en DÓLARES (`BILLING_TIERS`), y el
   * monto en pesos depende de la TRM del día del cobro. Mostrar un valor en COP
   * acá obligaría a pedir la TRM en cada carga de la pantalla para acabar
   * enseñando un número que el día del cobro va a ser otro.
   */
  dineroUSD(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return 'US$' + valor.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  /**
   * El escalón de precio de una empresa, listo para pintar.
   *
   * Los tres casos son distintos a propósito y ninguno puede caer en el otro:
   * freemium no se cobra, Cumbre se negocia, y "sin dato" es no haber podido
   * medir las ventas — que NO es lo mismo que vender poco.
   */
  escalonTexto(empresa: EmpresaPanorama): string {
    const e = empresa.escalon;
    // El renglón de arriba ya dice FREEMIUM: repetirlo acá gastaría la línea en
    // no decir nada. Lo que falta saber de un freemium es que no se le cobra.
    if (!e || !e.aplica) return 'sin cobro · 15 pedidos al mes';
    if (e.aMedida) return `${e.nombre} · a medida`;
    if (!e.conocido) return 'escalón sin calcular · —';

    // En anual, el número que importa es lo que se le factura DE UNA. Mostrar
    // solo el mensual haría esperar un cobro doce veces más chico del que sale.
    if (e.periodo === 'anual') {
      return `${e.nombre} · ${this.dineroUSD(e.precioPeriodoUSD)} al año`;
    }
    return `${e.nombre} · ${this.dineroUSD(e.precioUSD)} al mes`;
  }

  /** ¿El escalón lo decidió un acuerdo y no las ventas? */
  escalonPactado(empresa: EmpresaPanorama): boolean {
    return empresa.escalon?.pactado === true;
  }

  /** Por qué dice ese escalón. Va en el globo, no en la tarjeta. */
  escalonTitulo(empresa: EmpresaPanorama): string {
    const e = empresa.escalon;
    if (!e || !e.aplica) {
      return 'Plan gratis: 15 pedidos al mes, 1 bodega, 5 usuarios y 1 integración. No se le cobra.';
    }
    if (!e.conocido) {
      return 'Paga, pero no se pudieron medir sus ventas del período: sin ellas no se puede saber el escalón.';
    }

    const periodo =
      e.periodo === 'anual'
        ? ` Paga ANUAL: se le factura ${this.dineroUSD(e.precioPeriodoUSD)} de una vez (12 meses con 20% de descuento), que equivale a ${this.dineroUSD(e.precioMensualEquivalenteUSD)} al mes.`
        : '';

    // Un acuerdo cerrado y una estimación no se pueden contar igual: el primero
    // es un compromiso y el segundo puede cambiar el mes que viene.
    if (e.pactado) {
      return (
        `PACTADO con el cliente en ${e.nombre} (${this.dineroUSD(e.precioUSD)} al mes de lista). ` +
        `No depende de sus ventas: se le cobra esto venda lo que venda.${periodo}`
      );
    }

    const ventas = this.dinero(e.ventasBase);
    if (e.aMedida) {
      return `Vendió ${ventas} en ${this.ventanaDias} días, por encima del último escalón: el precio se negocia.`;
    }
    return (
      `Estimado: vendió ${ventas} en ${this.ventanaDias} días y eso cae en el escalón ${e.nombre} ` +
      `(${this.dineroUSD(e.precioUSD)} al mes). El cobro real usa su propio período y excluye los ` +
      `pedidos cancelados, así que el monto puede variar un poco.${periodo}`
    );
  }

  /**
   * Fecha corta de verdad ("1 oct"), para la columna del plan: el chip mide
   * 104 px y "1 oct 2026" lo desborda. El año va en el globo y en la ficha,
   * donde sí hay espacio.
   */
  fechaDiaMes(valor: any): string {
    const ms = this.aMs(valor);
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }

  /**
   * El globo de la fecha de cobro: la fecha completa, cuánto falta y si es
   * estimada. Una fecha estimada no puede leerse como un cobro confirmado.
   */
  /** Etiqueta corta del periodo, para la lista. '' cuando es mensual. */
  etiquetaPeriodoPlan(empresa: EmpresaPanorama): string {
    return empresa.escalon?.periodo === 'anual' ? 'anual' : '';
  }

  tituloRenovacion(empresa: EmpresaPanorama): string {
    const r = empresa.renovacion;
    if (!r || !r.aplica) return 'El plan gratis no vence.';
    if (!r.fecha) {
      return 'Paga, pero no tiene fecha de renovación registrada por el sistema de facturación.';
    }

    const cuando = this.fechaCorta(r.fecha);
    const periodo = r.periodo ? `, cobro ${r.periodo}` : '';
    const origen = r.estimada
      ? ' Es una fecha ESTIMADA desde el inicio de la suscripción, no la confirmó el sistema de facturación.'
      : '';

    if (r.estado === 'vencido') {
      return `Se le venció el ${cuando}${periodo}.${origen}`;
    }
    return `Próximo cobro el ${cuando} (en ${r.diasRestantes} días)${periodo}.${origen}`;
  }

  fechaCorta(valor: any): string {
    const ms = this.aMs(valor);
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** "hace 3 minutos" para el sello de antigüedad de los datos. */
  antiguedad(ms: number | null): string {
    if (!ms) return '';
    const minutos = Math.floor((Date.now() - ms) / 60000);
    if (minutos < 1) return 'hace un momento';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    return `hace ${Math.floor(horas / 24)} d`;
  }

  nitCompleto(empresa: EmpresaPanorama): string {
    if (!empresa.nit) return '—';
    return empresa.digitoVerificacion ? `${empresa.nit}-${empresa.digitoVerificacion}` : empresa.nit;
  }

  telefono(empresa: EmpresaPanorama): string {
    const t = empresa.cel || empresa.fijo;
    return t ? t.toString() : '—';
  }

  iniciales(nombre: string | null): string {
    if (!nombre) return '?';
    return nombre
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  trackPorId(_i: number, empresa: EmpresaPanorama): string {
    return empresa._docId;
  }

  /** Normaliza ISO string, Date, número o Timestamp serializado a milisegundos. */
  private aMs(valor: any): number {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string') {
      const t = Date.parse(valor);
      return isNaN(t) ? 0 : t;
    }
    if (valor instanceof Date) return valor.getTime();
    if (typeof valor._seconds === 'number') return valor._seconds * 1000;
    if (typeof valor.seconds === 'number') return valor.seconds * 1000;
    return 0;
  }
}
