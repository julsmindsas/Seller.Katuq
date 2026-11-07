import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { CarteraService } from '../../../../shared/services/cartera/cartera.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { abrirAccionCartera } from '../cartera-acciones/cartera-accion-abrir';
import { abrirRecordatorioCobro } from '../../../../shared/components/recordatorio-cobro/recordatorio-cobro-modal.component';
import { CompanyFeaturesService } from '../../../../shared/services/company-features.service';
import {
  CarteraCliente,
  CarteraEvolucionResponse,
  CarteraPedido,
  CarteraResponse,
  DestinatarioRecordatorio,
  TipoRelacion,
} from '../../../../shared/services/cartera/cartera.models';
import {
  AGING_BUCKETS,
  ANTIGUEDAD_OPTIONS,
  COMPROMISO_OPTIONS,
  ESTADO_PAGO_OPTIONS,
  FACTURA_OPTIONS,
  grupoEstadoPago,
  metaPago,
  ORDEN_OPTIONS,
  PagoBadgeMeta,
  rangoAntiguedad,
  RELACION_CLAVE,
  RELACION_OPTIONS,
  TIPOS_INTERNOS,
  RISK_OPTIONS,
  TIPO_PERSONA_OPTIONS,
  VENCE_OPTIONS,
} from '../../cartera.constants';
import {
  agingDeFila,
  aplicarFiltros,
  CarteraFiltros,
  cuantosFiltrosAvanzados,
  describirFiltros,
  ES_ORDEN,
  FilaVista,
  filtrosVacios,
  hayFiltrosActivos,
  numeroDeCampo,
  pedidosTraenVendedor,
  RangoInvertido,
  rangosInvertidos,
  SIN_VENDEDOR,
  sufijoArchivo,
  VistaCartera,
} from '../../cartera-filtros.util';
import { construirLibroCartera } from '../../cartera-excel.util';
import { construirLibroNomina } from '../../cartera-nomina-excel.util';
import { cargarLogoPdf, construirPdfCartera, ModoPdfCartera } from '../../cartera-pdf.util';
import { OpcionMulti } from '../cartera-multi/cartera-multi.component';

import { TranslateService } from '@ngx-translate/core';
/** Un segmento de la mini-barra de aging de un cliente (labelKey = clave i18n). */
interface AgingSegment {
  cssClass: string;
  pct: number;
  labelKey: string;
  monto: number;
}

/** Entrada de la leyenda de antigüedad (los 6 rangos, con o sin monto; shortKey = clave i18n). */
interface AgingLegendItem {
  cssClass: string;
  shortKey: string;
  monto: number;
}

/** Ticket 1457: un vendedor con los clientes y los pedidos que le tocan (sumado por el vendedor de cada pedido). */
interface GrupoVendedor {
  vendedor: string;
  saldo: number;
  vencido: number;
  pedidos: number;
  filas: { cliente: CarteraCliente; saldo: number; vencido: number; pedidos: CarteraPedido[] }[];
}

/** Etiqueta de riesgo derivada de los datos que ya trae el cliente. */
interface RiesgoMeta {
  label: string;
  cssClass: string;
}

/**
 * Spec 014 — CxC. Tab "Cartera por Cliente" (CA-09 / CA-11).
 * Recibe la respuesta agregada por @Input y filtra client-side. Desde el ticket 1467 los filtros no
 * viven aquí: los dueña la pantalla (en la URL) y los comparte con «Aging»; este tab los pinta, los
 * cambia y los aplica con la misma función que Aging. Cada card
 * muestra saldo, semáforo de cupo, mini-barra de aging y DSO; al hacer click
 * expande el detalle de pedidos con saldo. Lo que se ve se puede ordenar y
 * descargar en Excel o PDF.
 */
@Component({
  selector: 'app-cartera-clientes',
  templateUrl: './cartera-clientes.component.html',
  styleUrls: ['./cartera-clientes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraClientesComponent implements OnChanges {
  @Input() data: CarteraResponse | null = null;
  /** Fotos mensuales de la cartera (ticket 1464); null mientras carga o si no hay. */
  @Input() evolucion: CarteraEvolucionResponse | null = null;

  /**
   * Ticket 1467: los filtros viven en la pantalla (para que Aging use los mismos y la URL los guarde).
   * Este tab los recibe y avisa con `filtrosChange` cada vez que la persona cambia uno.
   */
  @Input() filtros: CarteraFiltros = filtrosVacios();
  @Output() filtrosChange = new EventEmitter<CarteraFiltros>();

  /**
   * Ticket 1461: es la vista «Cartera interna» (solo empleados, socios y empresa propia): no tiene el interruptor
   * «Incluir internos» ni la gráfica de evolución, y trae el Excel «para nómina».
   */
  @Input() modoInterno = false;
  /** Ticket 1461: la persona quiere ver la cartera interna aparte (botón del resumen). */
  @Output() verInterna = new EventEmitter<void>();
  /** Ticket 1461: Tesorería marcó el tipo de relación de un cliente; la pantalla vuelve a pedir la cartera. */
  @Output() relacionCambiada = new EventEmitter<void>();
  /** Ticket 1463: una acción de cobro (pago, compromiso, gestión, cupo y plazo o castigo) cambió datos: la pantalla vuelve a pedir la cartera. */
  @Output() cobroCambiado = new EventEmitter<void>();
  readonly relacionOpciones = RELACION_OPTIONS;

  readonly riskOptions = RISK_OPTIONS;
  readonly agingBuckets = AGING_BUCKETS;
  readonly ordenOptions = ORDEN_OPTIONS;
  readonly tipoPersonaOptions = TIPO_PERSONA_OPTIONS;
  readonly facturaOptions = FACTURA_OPTIONS;
  readonly venceOptions = VENCE_OPTIONS;
  readonly compromisoOptions = COMPROMISO_OPTIONS;
  /** Antigüedad con selección múltiple: los 6 rangos (sin la opción «Todas»: vacío ya es todas). */
  readonly antiguedadOpciones: OpcionMulti[] = ANTIGUEDAD_OPTIONS
    .filter((o) => o.value !== 'todas')
    .map((o) => ({ value: o.value, labelKey: o.labelKey }));
  estadoPagoOpciones: OpcionMulti[] = [];
  vendedorOpciones: OpcionMulti[] = [];
  /** El panel «Más filtros» está abierto. */
  masAbierto = false;
  /** La cartera interna solo existe cuando el servidor la trae (bandera `carteraInterna`, ticket 1461). */
  hayInternos = false;
  /** «Compromiso de pago» solo aparece cuando los pedidos lo traen (ticket 1463). */
  hayCompromisos = false;
  /** Ticket 1463: bandera `accionesCartera` (menú «Acciones» en cada tarjeta) y `carteraCastigo` (castigar deuda). */
  accionesActivas = false;
  castigoActivo = false;
  /** El rol actual es de la familia Administrador (castigar, reactivar y cuentas bancarias). */
  esAdmin = false;
  /** Tickets 1385 y 1457: bandera `recordatoriosCobro` («Recordar pago», selección y envío masivo). */
  recordatoriosActivo = false;
  /** Ticket 1457: bandera `carteraVendedorMora` y los pedidos ya traen su vendedor («Agrupar por: Cliente / Vendedor»). */
  vendedorMoraActivo = false;
  /** Cómo se agrupa la lista: por cliente (siempre fue así) o por vendedor (ticket 1457). */
  agrupar: 'cliente' | 'vendedor' = 'cliente';
  gruposVendedor: GrupoVendedor[] = [];
  /** Vendedor del grupo abierto ('' es «Sin vendedor»; null = ninguno). */
  grupoAbierto: string | null = null;
  /** Clientes escogidos para recordar el pago (documento -> cliente). */
  seleccionClientes = new Map<string, CarteraCliente>();
  /** Pedidos escogidos dentro de un cliente (documento -> orderIds), para «varias facturas de un cliente». */
  seleccionPedidos = new Map<string, Set<string>>();
  /**
   * Tope de clientes por envío que se avisa antes de abrir la ventana. Es el «máximo de clientes por envío» que
   * el comercio dejó en su configuración (50 si no se ha cambiado); el servidor lo vuelve a exigir.
   */
  maxSeleccion = 50;

  /**
   * Ayuda abierta (botón de información de cada tarjeta y del filtro Riesgo). El texto se muestra
   * a la vista: así se lee con teclado y al tocar en el celular, donde un tooltip no abre (ticket 1464).
   */
  ayudaAbierta: 'total' | 'vencida' | 'porVencer' | 'dias' | 'excede' | 'riesgo' | null = null;

  alternarAyuda(ayuda: 'total' | 'vencida' | 'porVencer' | 'dias' | 'excede' | 'riesgo', evento: Event): void {
    evento.stopPropagation(); // no aplicar el filtro de la tarjeta
    this.ayudaAbierta = this.ayudaAbierta === ayuda ? null : ayuda;
  }

  clientes: CarteraCliente[] = [];
  filtered: CarteraCliente[] = [];
  /** Lo que se ve con los filtros: clientes en orden, con sus pedidos y su saldo visibles. */
  vista: VistaCartera = aplicarFiltros([], filtrosVacios());

  /** Saldo de lo que se ve con los filtros (todos los clientes de la lista). */
  totalVisible = 0;
  generandoPdf = false;
  generandoExcel = false;

  /** Documento del cliente cuyo detalle está expandido (null = ninguno). */
  expandedDoc: string | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private router: Router,
    private carteraService: CarteraService,
    private features: CompanyFeaturesService,
    private modal: NgbModal,
  ) {
    this.accionesActivas = this.features.isEnabled('accionesCartera');
    this.castigoActivo = this.features.isEnabled('carteraCastigo');
    this.recordatoriosActivo = this.features.isEnabled('recordatoriosCobro');
    this.esAdmin = this.leerEsAdmin();
    if (this.recordatoriosActivo) this.leerTopeDeEnvio();
  }

  /** Lee el máximo de clientes por envío de la empresa; si no se puede leer, queda el valor base. */
  private leerTopeDeEnvio(): void {
    this.carteraService.getConfigRecordatorio().subscribe({
      next: (c) => {
        const max = Number(c?.maxPorLote);
        if (Number.isInteger(max) && max >= 1) {
          this.maxSeleccion = max;
          this.cdr.markForCheck();
        }
      },
      error: () => {},
    });
  }

  private leerEsAdmin(): boolean {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const rol = String(u.rol || u.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(rol);
    } catch {
      return false;
    }
  }

  // ── Ticket 1463: lo que dejan las acciones de cobro en la tarjeta ──────────
  /** «Promete pagar $X el dd/mm»; con la fecha pasada y sin pago, «Promesa vencida». */
  textoCompromiso(c: CarteraCliente): { clave: string; params: { [k: string]: string }; clase: string } | null {
    const comp = c.cobro?.compromiso;
    if (!comp || !comp.fecha) return null;
    const [anio, mes, dia] = String(comp.fecha).split('-');
    const fecha = `${dia}/${mes}`;
    const valor = '$' + Math.round(Number(comp.valor) || 0).toLocaleString('es-CO');
    if (comp.estado === 'cumplido') return { clave: 'cartera.acciones.promesaCumplida', params: { valor, fecha, anio }, clase: 'cx-cobro-ok' };
    if (comp.estado === 'incumplido') return { clave: 'cartera.acciones.promesaVencida', params: { valor, fecha, anio }, clase: 'cx-cobro-vencida' };
    return { clave: 'cartera.acciones.promesaVigente', params: { valor, fecha, anio }, clase: 'cx-cobro-vigente' };
  }

  /** Días desde la última gestión (0 = hoy). */
  diasDesde(iso: string): number {
    const t = new Date(iso).getTime();
    return isNaN(t) ? 0 : Math.max(0, Math.floor((Date.now() - t) / 86400000));
  }

  /** Cuántos clientes tienen la promesa de pago vencida (lo calcula el servidor). */
  get promesasVencidas(): { clientes: number; monto: number } | null {
    const p = this.data?.kpis?.promesasVencidas;
    return p && p.clientes > 0 ? p : null;
  }

  verPromesasVencidas(): void {
    this.cambiar({ compromiso: 'incumplido' });
    this.masAbierto = true;
  }

  alCambiarCobro(): void {
    this.cobroCambiado.emit();
  }

  /** «Asignar cupo y plazo» desde la tarjeta sin cupo. */
  asignarCupo(c: CarteraCliente, evento: Event): void {
    evento.stopPropagation();
    abrirAccionCartera(this.modal, 'credito', c, this.esAdmin).then((cambio) => {
      if (cambio) this.alCambiarCobro();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.clientes = this.data?.clientes || [];
      this.hayInternos = !!this.data?.internos;
      this.hayCompromisos = this.clientes.some((c) => (c.pedidos || []).some((p) => !!p.compromiso));
      this.vendedorMoraActivo = this.features.isEnabled('carteraVendedorMora') && pedidosTraenVendedor(this.clientes);
      if (!this.vendedorMoraActivo) this.agrupar = 'cliente';
      this.expandedDoc = null;
      // La cartera se volvió a pedir: lo escogido se limpia (un cliente pudo pagar o salir de la lista).
      this.limpiarSeleccion();
    }
    // Una dirección compartida con filtros avanzados abre el panel para que se vean.
    if (changes['filtros'] && changes['filtros'].firstChange && cuantosFiltrosAvanzados(this.filtros) > 0) {
      this.masAbierto = true;
    }
    // En la vista interna el filtro «Tipo de relación» (Empleado, Socio, Empresa propia) es lo primero que se busca.
    if (changes['modoInterno'] && this.modoInterno) this.masAbierto = true;
    if (changes['data'] || changes['filtros']) {
      // Las opciones también miran los filtros: lo elegido por la dirección compartida siempre tiene su opción.
      this.vendedorOpciones = this.armarOpcionesVendedor(this.clientes);
      this.estadoPagoOpciones = this.armarOpcionesEstadoPago(this.clientes);
      this.applyFilters();
    }
  }

  /** Vendedores que hay en la cartera, más «Sin vendedor» si algún cliente no tiene. */
  private armarOpcionesVendedor(clientes: CarteraCliente[]): OpcionMulti[] {
    const set = new Set<string>();
    let sin = false;
    clientes.forEach((c) => {
      const v = (c.vendedor || '').trim();
      if (v) set.add(v); else sin = true;
    });
    const opciones: OpcionMulti[] = Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
    // Un vendedor elegido que ya no está en la lista (dirección compartida) se conserva para poder quitarlo.
    this.filtros.vendedores.forEach((v) => {
      if (v !== SIN_VENDEDOR && !set.has(v)) opciones.push({ value: v, label: v });
    });
    if (sin || this.filtros.vendedores.includes(SIN_VENDEDOR)) {
      opciones.unshift({ value: SIN_VENDEDOR, labelKey: 'cartera.filtros.sinVendedor' });
    }
    return opciones;
  }

  /** Estados de pago del filtro; «Crédito», «Pago parcial» y «Procesando» solo aparecen si algún pedido está en ese estado (o ya están elegidos). */
  private armarOpcionesEstadoPago(clientes: CarteraCliente[]): OpcionMulti[] {
    const presentes = new Set<string>();
    clientes.forEach((c) => (c.pedidos || []).forEach((p) => presentes.add(grupoEstadoPago(p.estadoPago))));
    const opcionales = ['Credito', 'PagoParcial', 'Procesando'];
    return ESTADO_PAGO_OPTIONS
      .filter((o) => !opcionales.includes(o.value) || presentes.has(o.value) || this.filtros.estadosPago.includes(o.value))
      .map((o) => ({ value: o.value, labelKey: o.labelKey }));
  }

  /** Cambia uno o varios filtros y avisa a la pantalla (que los guarda en la URL y los comparte con Aging). */
  cambiar(parcial: Partial<CarteraFiltros>): void {
    this.filtrosChange.emit({ ...this.filtros, ...parcial });
  }

  /**
   * Saldo mínimo o máximo escrito por la persona (vacío = sin tope). Mientras la casilla tiene algo a medio
   * escribir que todavía no es un número («-», «e»), no se toca el filtro: así la casilla no se borra sola.
   */
  alEscribirSaldo(campo: 'saldoMin' | 'saldoMax', input: HTMLInputElement): void {
    if (input.validity && input.validity.badInput) return;
    this.cambiar({ [campo]: numeroDeCampo(input.value) } as Partial<CarteraFiltros>);
  }

  /** Rangos al revés (mínimo mayor que el máximo, desde posterior a hasta): se avisa porque no sale ningún cliente. */
  get rangosAlReves(): RangoInvertido[] {
    return rangosInvertidos(this.filtros);
  }

  claveGrupoRango(r: RangoInvertido): string {
    return { saldo: 'cartera.filtros.grupoSaldo', compra: 'cartera.filtros.grupoCompra',
      entrega: 'cartera.filtros.grupoEntrega', limite: 'cartera.filtros.grupoLimite' }[r];
  }

  alternarMas(): void {
    this.masAbierto = !this.masAbierto;
  }

  get avanzadosActivos(): number {
    return cuantosFiltrosAvanzados(this.filtros);
  }

  applyFilters(): void {
    this.vista = aplicarFiltros(this.clientes, this.filtros);
    this.filtered = this.vista.clientes;
    this.totalVisible = this.vista.total;
    this.kpisVista = this.calcularKpisVista();
    this.gruposVendedor = this.vendedorMoraActivo ? this.armarGruposVendedor() : [];
    // Un cliente escogido que los filtros ya no muestran sale de la selección: no se le envía sin verlo.
    if (this.seleccionClientes.size) {
      const visibles = new Set(this.filtered.map((c) => c.documento));
      Array.from(this.seleccionClientes.keys()).forEach((doc) => {
        if (!visibles.has(doc)) this.seleccionClientes.delete(doc);
      });
    }
  }

  // ── Ticket 1457: «Agrupar por: Cliente / Vendedor» ─────────────────────────
  /** Agrupa lo que se ve con los filtros por el vendedor de cada pedido; el total es el mismo de la vista por cliente. */
  private armarGruposVendedor(): GrupoVendedor[] {
    const mapa = new Map<string, GrupoVendedor>();
    this.vista.filas.forEach((fila) => {
      const porVendedor = new Map<string, CarteraPedido[]>();
      fila.pedidos.forEach((p) => {
        const v = (p.vendedor || '').trim();
        if (!porVendedor.has(v)) porVendedor.set(v, []);
        (porVendedor.get(v) as CarteraPedido[]).push(p);
      });
      porVendedor.forEach((pedidos, v) => {
        if (!mapa.has(v)) mapa.set(v, { vendedor: v, saldo: 0, vencido: 0, pedidos: 0, filas: [] });
        const g = mapa.get(v) as GrupoVendedor;
        const saldo = pedidos.reduce((a, p) => a + (Number(p.saldo) || 0), 0);
        const vencido = pedidos.filter((p) => (Number(p.diasVencido) || 0) > 0).reduce((a, p) => a + (Number(p.saldo) || 0), 0);
        g.saldo += saldo;
        g.vencido += vencido;
        g.pedidos += pedidos.length;
        g.filas.push({ cliente: fila.cliente, saldo, vencido, pedidos });
      });
    });
    return Array.from(mapa.values())
      .map((g) => ({ ...g, filas: g.filas.sort((a, b) => b.saldo - a.saldo) }))
      .sort((a, b) => {
        if (!a.vendedor !== !b.vendedor) return a.vendedor ? -1 : 1;
        return b.saldo - a.saldo;
      });
  }

  cambiarAgrupar(modo: 'cliente' | 'vendedor'): void {
    this.agrupar = modo;
    this.grupoAbierto = null;
  }

  alternarGrupo(g: GrupoVendedor): void {
    this.grupoAbierto = this.grupoAbierto === g.vendedor ? null : g.vendedor;
  }

  trackPorGrupo(_i: number, g: GrupoVendedor): string {
    return g.vendedor || '__sin__';
  }

  /** Vuelve a la lista por cliente mostrando solo a ese vendedor. */
  verClientesDe(g: GrupoVendedor): void {
    this.agrupar = 'cliente';
    this.cambiar({ vendedores: [g.vendedor || SIN_VENDEDOR] });
  }

  /** «Recordar pago» a los clientes de un vendedor con saldo vencido, solo con los pedidos vencidos que son suyos. */
  recordarVencidosDe(g: GrupoVendedor): void {
    const destinatarios: DestinatarioRecordatorio[] = g.filas
      .map((f) => ({ documento: f.cliente.documento, nombre: f.cliente.nombre, orderIds: f.pedidos.filter((p) => (Number(p.diasVencido) || 0) > 0).map((p) => p.orderId) }))
      .filter((d) => d.orderIds.length > 0);
    this.abrirRecordatorio(destinatarios);
  }

  // ── Tickets 1385 y 1457: recordar el pago ──────────────────────────────────
  estaSeleccionado(c: CarteraCliente): boolean {
    return this.seleccionClientes.has(c.documento);
  }

  alternarCliente(c: CarteraCliente, evento: Event): void {
    evento.stopPropagation();
    if (this.seleccionClientes.has(c.documento)) this.seleccionClientes.delete(c.documento);
    else this.seleccionClientes.set(c.documento, c);
  }

  get hayClientesEscogidos(): boolean {
    return this.seleccionClientes.size > 0;
  }

  get todosEscogidos(): boolean {
    return this.filtered.length > 0 && this.filtered.every((c) => this.seleccionClientes.has(c.documento));
  }

  /** Escoge (o suelta) a todos los clientes que se ven con los filtros. */
  alternarTodosLosVisibles(): void {
    if (this.todosEscogidos) {
      this.seleccionClientes.clear();
      return;
    }
    this.filtered.forEach((c) => this.seleccionClientes.set(c.documento, c));
  }

  limpiarSeleccion(): void {
    this.seleccionClientes.clear();
    this.seleccionPedidos.clear();
  }

  get saldoEscogido(): number {
    let total = 0;
    this.seleccionClientes.forEach((c) => (total += this.saldoVisible(c)));
    return total;
  }

  get seleccionPasaDelTope(): boolean {
    return this.seleccionClientes.size > this.maxSeleccion;
  }

  /** Recordar el pago a los clientes escogidos (solo los pedidos que se ven con los filtros). */
  recordarSeleccion(): void {
    if (!this.hayClientesEscogidos || this.seleccionPasaDelTope) return;
    const destinatarios: DestinatarioRecordatorio[] = Array.from(this.seleccionClientes.values()).map((c) => ({
      documento: c.documento,
      nombre: c.nombre,
      // Con un filtro que recorta pedidos, se recuerdan solo los pedidos que se ven.
      orderIds: this.vista.recortaPedidos ? this.pedidosVisibles(c).map((p) => p.orderId) : undefined,
    }));
    this.abrirRecordatorio(destinatarios, true);
  }

  /** «Recordar pago» desde la fila de un pedido. */
  recordarPedido(c: CarteraCliente, p: CarteraPedido, evento: Event): void {
    evento.stopPropagation();
    this.abrirRecordatorio([{ documento: c.documento, nombre: c.nombre, orderIds: [p.orderId] }]);
  }

  // Varias facturas de un mismo cliente
  pedidoEscogido(c: CarteraCliente, p: CarteraPedido): boolean {
    const s = this.seleccionPedidos.get(c.documento);
    return !!s && s.has(p.orderId);
  }

  alternarPedidoEscogido(c: CarteraCliente, p: CarteraPedido, evento: Event): void {
    evento.stopPropagation();
    const s = this.seleccionPedidos.get(c.documento) || new Set<string>();
    if (s.has(p.orderId)) s.delete(p.orderId);
    else s.add(p.orderId);
    this.seleccionPedidos.set(c.documento, s);
  }

  cuantosPedidosEscogidos(c: CarteraCliente): number {
    const s = this.seleccionPedidos.get(c.documento);
    // Solo cuentan los que siguen a la vista.
    return s ? this.pedidosVisibles(c).filter((p) => s.has(p.orderId)).length : 0;
  }

  recordarPedidosEscogidos(c: CarteraCliente, evento: Event): void {
    evento.stopPropagation();
    const s = this.seleccionPedidos.get(c.documento);
    const ids = s ? this.pedidosVisibles(c).filter((p) => s.has(p.orderId)).map((p) => p.orderId) : [];
    if (!ids.length) return;
    this.abrirRecordatorio([{ documento: c.documento, nombre: c.nombre, orderIds: ids }]);
  }

  /** Abre la ventana de «Recordar pago»; si se envió algo, la pantalla vuelve a pedir la cartera (muestra la última gestión). */
  private abrirRecordatorio(destinatarios: DestinatarioRecordatorio[], limpiar = false): void {
    if (!destinatarios.length) return;
    abrirRecordatorioCobro(this.modal, destinatarios, this.esAdmin).then((cambio) => {
      if (cambio) {
        if (limpiar) this.limpiarSeleccion();
        this.alCambiarCobro();
      }
    });
  }

  // ── Banner que sigue a los filtros (ticket 1388) ──────────────────────────
  /**
   * Con filtros, el banner mostraba los números de TODA la cartera y la lista
   * los del filtro, y no cuadraban (ALMARA: «Con cartera vencida» 31 clientes
   * $19,7 M vs. banner vencida $13,9 M). Ahora, con cualquier filtro activo, el
   * banner se calcula sobre lo que se ve: total = el de la lista, vencida = la
   * parte con 1 o más días vencida de esos mismos pedidos (misma regla del
   * servidor, ticket 1460), días promedio ponderado y clientes sobre su cupo.
   */
  kpisVista: CarteraResponse['kpis'] | null = null;

  get hayFiltros(): boolean {
    return hayFiltrosActivos(this.filtros);
  }

  /** Saldo visible del cliente con más de `desde` días vencido (0 = todo lo vencido). */
  private vencidoVisible(cliente: CarteraCliente, desde = 0): number {
    return this.pedidosVisibles(cliente)
      .filter((p) => (Number(p.diasVencido) || 0) > desde)
      .reduce((suma, p) => suma + (Number(p.saldo) || 0), 0);
  }

  private calcularKpisVista(): CarteraResponse['kpis'] | null {
    const base = this.data?.kpis;
    if (!base) return null;
    if (!this.hayFiltros) return base;
    const total = this.totalVisible;
    const vencida = this.filtered.reduce((suma, c) => suma + this.vencidoVisible(c), 0);
    const vencidaMas15 = this.filtered.reduce((suma, c) => suma + this.vencidoVisible(c, 15), 0);
    const dsoPonderado = this.filtered.reduce(
      (suma, c) => suma + (Number(c.dso) || 0) * this.saldoVisible(c), 0);
    // Por vencer en 7 días (ticket 1464): los pedidos marcados por el servidor entre los que se ven.
    const porVencerDe = (c: CarteraCliente) => this.pedidosVisibles(c).filter((p) => p.porVencer7);
    const porVencerMonto = this.filtered.reduce(
      (suma, c) => suma + porVencerDe(c).reduce((s, p) => s + (Number(p.saldo) || 0), 0), 0);
    const porVencerPedidos = this.filtered.reduce((suma, c) => suma + porVencerDe(c).length, 0);
    const porVencerClientes = this.filtered.filter((c) => porVencerDe(c).length > 0).length;
    return {
      ...base,
      porVencer7: base.porVencer7
        ? { ...base.porVencer7, monto: porVencerMonto, clientes: porVencerClientes, pedidos: porVencerPedidos }
        : undefined,
      carteraTotal: { ...base.carteraTotal, monto: total, clientes: this.filtered.length },
      carteraVencida: {
        ...base.carteraVencida,
        monto: vencida,
        pct: total > 0 ? (vencida / total) * 100 : 0,
        mas15: { monto: vencidaMas15, pct: total > 0 ? (vencidaMas15 / total) * 100 : 0 },
      },
      dsoPromedio: total > 0 ? Math.round(dsoPonderado / total) : 0,
      excedenCupo: { ...base.excedenCupo, cantidad: this.filtered.filter((c) => c.excedeCupo).length },
    };
  }

  // ── Tarjetas clicables (ticket 1464) ──────────────────────────────────────
  /**
   * Tarjeta que aplica su filtro. `total` quita los filtros de riesgo, antigüedad, vence y orden.
   * Ticket 1467: «Por vencer» ahora usa el filtro «Vence: próximos 7 días», que filtra por pedido.
   */
  aplicarTarjeta(tarjeta: 'total' | 'vencida' | 'porVencer' | 'dias' | 'excede'): void {
    const f = this.filtros;
    switch (tarjeta) {
      case 'total':
        this.cambiar({ riesgo: 'todos', antiguedad: [], vence: 'todos', orden: 'saldo' });
        return;
      case 'vencida':
        this.cambiar({ riesgo: f.riesgo === 'vencida' ? 'todos' : 'vencida' });
        return;
      case 'porVencer':
        // Cobro preventivo (ticket 1464): solo los pedidos que vencen en los próximos 7 días.
        this.cambiar({ vence: f.vence === '7' ? 'todos' : '7' });
        if (f.vence !== '7') this.masAbierto = true;
        return;
      case 'dias':
        // Lo más atrasado primero: es lo que muestra el promedio. Otro clic vuelve al orden por saldo.
        this.cambiar({ orden: f.orden === 'vencido' ? 'saldo' : 'vencido' });
        return;
      case 'excede':
        this.cambiar({ riesgo: f.riesgo === 'excede' ? 'todos' : 'excede' });
        return;
    }
  }

  // ── Cartera interna (ticket 1461) ─────────────────────────────────────────
  /** El filtro «Tipo de relación» solo sirve cuando la lista trae internos (vista interna o «Incluir internos»). */
  get hayRelaciones(): boolean {
    return this.hayInternos && (this.modoInterno || this.filtros.incluirInternos);
  }

  /** El resumen «Cartera interna $X (N)» se ve si hay algo apartado o si los internos ya están incluidos. */
  get mostrarResumenInterno(): boolean {
    const i = this.data?.internos;
    return !this.modoInterno && !!i && (i.clientes > 0 || this.filtros.incluirInternos);
  }

  esInterno(c: CarteraCliente): boolean {
    return !!c.relationType && TIPOS_INTERNOS.includes(c.relationType as any);
  }

  claveRelacion(c: CarteraCliente): string {
    return RELACION_CLAVE[c.relationType || 'customer'];
  }

  claveSugerencia(c: CarteraCliente): string {
    return c.sugeridoInterno === 'empresa' ? 'cartera.interna.sugeridoEmpresa' : 'cartera.interna.sugeridoUsuario';
  }

  /** Cuántos clientes de la lista son de cada tipo interno, para los números del encabezado de la vista interna. */
  get resumenPorTipo(): { tipo: TipoRelacion; claveKey: string; clientes: number; monto: number }[] {
    const porTipo = this.data?.internos?.porTipo || {};
    return TIPOS_INTERNOS.map((t) => ({
      tipo: t,
      claveKey: RELACION_CLAVE[t],
      clientes: porTipo[t]?.clientes || 0,
      monto: porTipo[t]?.monto || 0,
    }));
  }

  /**
   * Tesorería elige el tipo de relación del cliente (Cliente, Empleado, Socio, Empresa propia). Lo guarda el
   * servidor en todas las fichas con ese documento y deja el registro en la auditoría de Tesorería.
   */
  async cambiarRelacion(c: CarteraCliente, evento?: Event): Promise<void> {
    if (evento) evento.stopPropagation();
    const opciones: { [k: string]: string } = {};
    RELACION_OPTIONS.filter((o) => o.value !== 'todos').forEach((o) => { opciones[o.value] = this.translate.instant(o.labelKey); });
    const sugerido = c.sugeridoInterno ? this.translate.instant(this.claveSugerencia(c)) : '';
    const r = await Swal.fire({
      title: this.translate.instant('cartera.interna.cambiarTitulo'),
      html: `<div style="text-align:left;color:#211F3A">
        <strong>${this.escapar(c.nombre || '—')}</strong><br>
        <span style="color:#6B6890;font-size:13px">${this.escapar(c.documento || '')}</span>
        ${sugerido ? `<p style="margin:10px 0 0;font-size:13px;color:#6B6890">${this.escapar(sugerido)}</p>` : ''}
        <p style="margin:10px 0 0;font-size:13px;color:#6B6890">${this.escapar(this.translate.instant('cartera.interna.cambiarAyuda'))}</p>
      </div>`,
      input: 'radio',
      inputOptions: opciones,
      inputValue: c.relationType || 'customer',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('cartera.interna.guardar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#5F3FE0',
    });
    if (!r.isConfirmed || !r.value) return;
    const nuevo = r.value as TipoRelacion;
    if (nuevo === (c.relationType || 'customer')) return;
    this.carteraService.marcarRelacion(c.documento, nuevo).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: this.translate.instant('cartera.interna.guardado'), timer: 1600, showConfirmButton: false });
        this.relacionCambiada.emit();
      },
      error: (err: HttpErrorResponse) => {
        const sinFicha = err instanceof HttpErrorResponse && err.status === 404;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('cartera.interna.noSePudoGuardar'),
          text: this.translate.instant(sinFicha ? 'cartera.interna.sinFicha' : 'cartera.carteraClientes.intentaDeNuevoEnUn'),
        });
      },
    });
  }

  /** Texto seguro para meter en el HTML de un aviso (nombres y documentos vienen de los datos del comercio). */
  private escapar(texto: string): string {
    return String(texto).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
  }

  generandoNomina = false;

  /** Excel «para nómina» de lo que se ve en la vista interna (con sus filtros). Solo Tesorería llega aquí. */
  async descargarNomina(): Promise<void> {
    if (!this.vista.filas.length || this.generandoNomina) return;
    this.generandoNomina = true;
    this.cdr.markForCheck();
    try {
      const ExcelJS = await import('exceljs');
      const ahora = new Date();
      const libro = construirLibroNomina(ExcelJS, {
        empresa: this.nombreEmpresa(),
        usuario: this.nombreUsuario(),
        ahora,
        filtros: describirFiltros(this.filtros).map((c) => [c.grupoEs, c.valorEs]),
        vista: this.vista,
      });
      const buffer = await libro.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.nombreArchivo('Cartera-interna-nomina')}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      Swal.fire({ icon: 'error', title: this.translate.instant('cartera.carteraClientes.noSePudoGenerarElExcel'), text: this.translate.instant('cartera.carteraClientes.intentaDeNuevoEnUn') });
    } finally {
      this.generandoNomina = false;
      this.cdr.markForCheck();
    }
  }

  // ── Cupo de crédito y vendedores (ticket 1464) ────────────────────────────
  /** Ningún cliente del comercio tiene cupo: «Exceden cupo» no diría nada, así que se invita a configurarlo. */
  get sinCuposConfigurados(): boolean {
    const cupo = this.data?.kpis?.clientesConCupo;
    return !!cupo && cupo.enEmpresa === 0;
  }

  /** Lleva al listado de clientes, donde se edita el cupo de crédito de cada uno. */
  irAConfigurarCupo(evento?: Event): void {
    if (evento) evento.stopPropagation();
    this.router.navigate(['/ventas/clienteslista']);
  }

  /** Un vendedor del resumen se suma al filtro (o se quita si ya estaba). */
  alElegirVendedor(vendedor: string): void {
    if (!vendedor) return;
    const actuales = this.filtros.vendedores;
    this.cambiar({
      vendedores: actuales.includes(vendedor) ? actuales.filter((v) => v !== vendedor) : [...actuales, vendedor],
    });
  }

  // ── Pedidos y saldo que se ven (tickets 1130 y 1467) ──────────────────────
  private filaDe(cliente: CarteraCliente): FilaVista | undefined {
    return this.vista.porCliente.get(cliente.documento || cliente.nombre || '');
  }

  /** Pedidos del cliente que se muestran: todos, o solo los que cumplen los filtros de pedido. */
  pedidosVisibles(cliente: CarteraCliente): CarteraPedido[] {
    const fila = this.filaDe(cliente);
    return fila ? fila.pedidos : cliente.pedidos || [];
  }

  /** Saldo del cliente que se muestra: el total, o solo el de los pedidos que cumplen los filtros. */
  saldoVisible(cliente: CarteraCliente): number {
    const fila = this.filaDe(cliente);
    return fila ? fila.saldo : Number(cliente.saldoPendiente) || 0;
  }

  // ── Descargas (tickets 1130, 1465 y 1466) ───────────────────────────────
  /**
   * Ticket 1465: Excel para trabajar la cartera, en tres hojas (Resumen, Por cliente y Detalle), con la misma vista
   * de la pantalla. La librería se carga solo al descargar para no pesar en el resto de la pantalla.
   */
  async descargarExcel(): Promise<void> {
    if (!this.vista.filas.length || this.generandoExcel) return;
    this.generandoExcel = true;
    this.cdr.markForCheck();
    try {
      const ExcelJS = await import('exceljs');
      const ahora = new Date();
      const libro = construirLibroCartera(ExcelJS, {
        empresa: this.nombreEmpresa(),
        usuario: this.nombreUsuario(),
        ahora,
        filtros: describirFiltros(this.filtros).map((c) => [c.grupoEs, c.valorEs]),
        orden: ES_ORDEN[this.filtros.orden],
        vista: this.vista,
        origen: window.location.origin,
      });
      const buffer = await libro.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.nombreArchivo()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      Swal.fire({ icon: 'error', title: this.translate.instant('cartera.carteraClientes.noSePudoGenerarElExcel'), text: this.translate.instant('cartera.carteraClientes.intentaDeNuevoEnUn') });
    } finally {
      this.generandoExcel = false;
      this.cdr.markForCheck();
    }
  }

  /** Menú «Descargar PDF» (Resumen o Completo) abierto (ticket 1466). */
  menuPdfAbierto = false;

  alternarMenuPdf(evento: Event): void {
    evento.stopPropagation();
    if (this.generandoPdf) return;
    this.menuPdfAbierto = !this.menuPdfAbierto;
  }

  @ViewChild('botonPdf') botonPdf?: ElementRef<HTMLButtonElement>;

  /** Al abrirse el menú, el foco pasa a su primera opción (teclado y lectores de pantalla). */
  @ViewChild('primeraOpcionPdf') set primeraOpcionPdf(el: ElementRef<HTMLButtonElement> | undefined) {
    if (el && el.nativeElement) el.nativeElement.focus();
  }

  /** Un clic fuera del menú lo cierra. */
  @HostListener('document:click')
  cerrarMenuPdf(): void {
    if (!this.menuPdfAbierto) return;
    this.menuPdfAbierto = false;
    this.cdr.markForCheck();
  }

  /** Escape cierra el menú y devuelve el foco al botón «Descargar PDF». */
  @HostListener('document:keydown.escape')
  cerrarMenuPdfConEscape(): void {
    if (!this.menuPdfAbierto) return;
    this.cerrarMenuPdf();
    if (this.botonPdf && this.botonPdf.nativeElement) this.botonPdf.nativeElement.focus();
  }

  /**
   * Ticket 1466: PDF de informe en hoja horizontal. «Resumen» es solo la página 1 (tarjetas, antigüedad, vendedores y
   * mayores deudores); «Completo» le suma el detalle de pedidos agrupado por cliente. Sale de la misma vista de la
   * pantalla (mismos filtros y orden). jsPDF y el logo se cargan solo al descargar.
   */
  async descargarPdf(modo: ModoPdfCartera): Promise<void> {
    if (!this.vista.filas.length || this.generandoPdf) return;
    this.menuPdfAbierto = false;
    this.generandoPdf = true;
    this.cdr.markForCheck();
    try {
      const [{ default: jsPDF }, { default: autoTable }, logo] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        cargarLogoPdf(this.logoEmpresa()),
      ]);
      const pdf = construirPdfCartera(jsPDF, autoTable, {
        empresa: this.nombreEmpresa(),
        usuario: this.nombreUsuario(),
        ahora: new Date(),
        filtros: describirFiltros(this.filtros).map((c) => [c.grupoEs, c.valorEs]),
        orden: ES_ORDEN[this.filtros.orden],
        vista: this.vista,
        modo,
        logo,
        diasPromedio: this.kpisVista ? this.kpisVista.dsoPromedio : null,
      });
      pdf.save(`${this.nombreArchivo(modo === 'resumen' ? 'Cartera-Resumen' : 'Cartera')}.pdf`);
    } catch {
      Swal.fire({ icon: 'error', title: this.translate.instant('cartera.carteraClientes.noSePudoGenerarEl'), text: this.translate.instant('cartera.carteraClientes.intentaDeNuevoEnUn') });
    } finally {
      this.generandoPdf = false;
      this.cdr.markForCheck();
    }
  }

  /** Logo del comercio (dirección https) para el encabezado del PDF; vacío si no tiene. */
  private logoEmpresa(): string {
    try {
      return JSON.parse(localStorage.getItem('currentCompany') || '{}').logo || '';
    } catch {
      return '';
    }
  }

  private nombreEmpresa(): string {
    try {
      return JSON.parse(localStorage.getItem('currentCompany') || '{}').nomComercial || '';
    } catch {
      return '';
    }
  }

  /** Quién descarga: nombre de la sesión, o su correo. */
  private nombreUsuario(): string {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.name || u.email || '';
    } catch {
      return '';
    }
  }

  private nombreArchivo(prefijo = 'Cartera'): string {
    const empresa = this.nombreEmpresa()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    // Fecha de hoy en hora local (con toISOString saldría el día de mañana después de las 7 p. m. en Colombia).
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    // Tickets 1467 y 1465: el nombre dice los filtros aplicados y termina con la fecha
    // (ej. Cartera_Empresa_Vendedor-Ana_2026-11-03).
    const filtros = sufijoArchivo(this.filtros);
    return `${prefijo}_${empresa || 'empresa'}${filtros ? '_' + filtros : ''}_${fecha}`;
  }

  /** "dd/mm/aaaa" de una fecha ISO; vacío si no hay fecha. */
  private fechaCorta(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  /** Ticket 1583: dirección de la lista de clientes filtrada por el documento (se abre en otra pestaña para no perder los filtros). */
  urlFicha(cliente: CarteraCliente): string {
    return this.router.serializeUrl(this.router.createUrlTree(['/ventas/clienteslista'], { queryParams: { buscar: cliente.documento } }));
  }

  toggleExpand(cliente: CarteraCliente): void {
    this.expandedDoc = this.expandedDoc === cliente.documento ? null : cliente.documento;
  }

  isExpanded(cliente: CarteraCliente): boolean {
    return this.expandedDoc === cliente.documento;
  }

  // ── Semáforo de cupo ──────────────────────────────────────────────────────
  cupoClass(cliente: CarteraCliente): string {
    const pct = cliente.cupoUsadoPct;
    if (pct == null) return '';
    if (pct > 100) return 'is-danger';
    if (pct >= 80) return 'is-warning';
    return 'is-ok';
  }

  /** Ancho visual de la barra de cupo (clamp 0-100). */
  cupoWidth(cliente: CarteraCliente): number {
    const pct = cliente.cupoUsadoPct;
    if (pct == null) return 0;
    return Math.max(0, Math.min(100, pct));
  }

  // ── Identidad visual de la tarjeta ────────────────────────────────────────
  /** Colores de avatar (se elige uno estable a partir del documento). */
  private static readonly AVATAR_COLORS = [
    '#6C4CE0', '#2F6FE0', '#17994F', '#E0891B', '#D6455B', '#0E9BA4', '#8B5CF6',
  ];

  /** Inicial del nombre para el avatar. */
  initial(cliente: CarteraCliente): string {
    const nombre = (cliente.nombre || '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : '?';
  }

  /** Color de avatar estable por cliente (mismo documento → mismo color). */
  avatarColor(cliente: CarteraCliente): string {
    const key = cliente.documento || cliente.nombre || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const colors = CarteraClientesComponent.AVATAR_COLORS;
    return colors[hash % colors.length];
  }

  /**
   * Etiqueta de riesgo del cliente. NO agrega reglas nuevas: reordena en una
   * píldora lo que ya se calcula server-side (excede cupo, vencido, % de cupo).
   */
  riesgo(cliente: CarteraCliente): RiesgoMeta {
    if (cliente.excedeCupo) return { label: 'Excede cupo', cssClass: 'cx-risk-danger' };
    // Ticket 1460: «Al día» solo si ningún pedido tiene días vencido > 0.
    if ((cliente.vencido || 0) > 0) {
      const rango = this.rangoMasAlto(cliente);
      return { label: rango ? `Vencida ${rango}` : 'Vencida', cssClass: 'cx-risk-vencida' };
    }
    if (cliente.cupoUsadoPct != null && cliente.cupoUsadoPct >= 80) {
      return { label: 'Cupo alto', cssClass: 'cx-risk-warning' };
    }
    return { label: 'Al día', cssClass: 'cx-risk-ok' };
  }

  /** Rango más alto entre los pedidos vencidos del cliente (ej. «1-15»), o vacío. */
  private rangoMasAlto(cliente: CarteraCliente): string {
    const maxDias = (cliente.pedidos || []).reduce((max, p) => Math.max(max, Number(p.diasVencido) || 0), 0);
    if (maxDias <= 0) return '';
    const meta = this.agingBuckets.find((b) => b.key === rangoAntiguedad(maxDias));
    return meta ? meta.rango : '';
  }

  // ── Mini-barra de aging ───────────────────────────────────────────────────
  /**
   * Aging que se ve en la tarjeta: el del cliente completo, o el de los pedidos que quedan con los filtros
   * (así la barra y la leyenda cuadran con el «Saldo filtrado» de la cabecera).
   */
  private agingVisible(cliente: CarteraCliente): { [rango: string]: number } {
    const fila = this.filaDe(cliente);
    if (fila && this.vista.recortaPedidos) return agingDeFila(fila, true);
    return { ...(cliente.aging || {}) } as { [rango: string]: number };
  }

  /** Los 6 rangos con su monto, para la leyenda bajo la barra. */
  agingLegend(cliente: CarteraCliente): AgingLegendItem[] {
    const aging = this.agingVisible(cliente);
    return this.agingBuckets.map((b) => ({
      cssClass: b.cssClass,
      shortKey: b.shortKey,
      monto: aging[b.key] || 0,
    }));
  }

  agingSegments(cliente: CarteraCliente): AgingSegment[] {
    const total = this.vista.recortaPedidos ? this.saldoVisible(cliente) : cliente.saldoPendiente || 0;
    if (total <= 0) return [];
    const aging = this.agingVisible(cliente);
    return this.agingBuckets
      .map((b) => {
        const monto = aging[b.key] || 0;
        return { cssClass: b.cssClass, pct: (monto / total) * 100, labelKey: b.labelKey, monto };
      })
      .filter((s) => s.monto > 0);
  }

  // ── Plazo y vencimiento (ticket 1129) ─────────────────────────────────────
  /** El plazo de pago que se le puso al cliente al crearlo o editarlo. */
  textoPlazo(cliente: CarteraCliente): string {
    const dias = Number(cliente.payTermDays) || 0;
    if (dias <= 0) return 'Contado';
    return `Plazo ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  /** Cuánto le falta al pedido para vencer, o cuántos días lleva vencido. */
  textoVencimiento(pedido: CarteraPedido): string {
    const dias = Number(pedido.diasVencido);
    if (!pedido.payDueDate || !Number.isFinite(dias)) return '—';
    if (dias < 0) return `vence en ${-dias} d`;
    if (dias === 0) return 'vence hoy';
    return `${dias} d vencido`;
  }

  // ── Detalle de pedidos ────────────────────────────────────────────────────
  metaPago(estado: string): PagoBadgeMeta {
    return metaPago(estado);
  }

  trackPorFilaGrupo(_i: number, f: { cliente: CarteraCliente }): string {
    return f.cliente.documento || f.cliente.nombre || '';
  }

  trackByDoc(_index: number, cliente: CarteraCliente): string {
    return cliente.documento || `row-${_index}`;
  }

  trackByPedido(_index: number, pedido: { orderId?: string; nroPedido?: string }): string {
    return pedido.orderId || pedido.nroPedido || `p-${_index}`;
  }
}
