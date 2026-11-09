import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  AvisoReposicion,
  FilaProduccion,
  FilaReposicion,
  InventarioService,
  OpcionProveedor,
  Proveedor,
  ResultadoGenerarBorradores,
  SugerenciaProduccion,
  SugerenciaReposicion,
} from '../../../shared/services/inventarios/inventario.service';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';
import { colorDeAvatar, inicialDe } from '../compras-avatar';
import { calcularCompra, ResultadoCalculoCompra, textoDelCalculo } from '../compras-calculo';

/** Lo que vale la fila con el proveedor que está elegido ahora: su costo, su tiempo y su empaque. */
export interface VistaFila {
  proveedorId: string;
  proveedorNombre: string | null;
  /** Costo por unidad. 0 = no se conoce. */
  costo: number;
  sinCosto: boolean;
  diasEntrega: number;
  origenDias: 'observado' | 'acordado' | 'supuesto';
  unidadCompra: string | null;
  factor: number;
  minimo: number;
  /** ¿El proveedor elegido ya es proveedor de este producto? Si no, se puede guardar como tal. */
  esDelProducto: boolean;
  calculo: ResultadoCalculoCompra;
}

/** Cuántos productos se muestran dentro de un aviso desplegado. */
const PRODUCTOS_POR_AVISO = 50;

/** Productos que caben en una orden: más de esto el servidor parte el grupo en varias órdenes. */
const PRODUCTOS_POR_ORDEN = 300;

/** Lo que el servidor devuelve al generar, con lo que sumó el 3-nov: partes de una orden y productos que ya estaban en un borrador. */
type RespuestaBorradores = Omit<ResultadoGenerarBorradores, 'creadas' | 'yaExistian' | 'fallidas'> & {
  creadas: (ResultadoGenerarBorradores['creadas'][number] & { parte?: number; partes?: number })[];
  yaExistian: (ResultadoGenerarBorradores['yaExistian'][number] & { parte?: number; partes?: number })[];
  fallidas: (ResultadoGenerarBorradores['fallidas'][number] & { parte?: number })[];
  yaEnBorrador?: {
    productoId: string;
    referencia: string | null;
    idBodega: string;
    proveedorId: string;
    ordenId: string;
    proveedor: string | null;
  }[];
};

const escapar = (valor: unknown): string =>
  String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/**
 * Qué comprar: la pregunta que va antes de crear una orden.
 *
 * La pantalla muestra primero lo que se agota antes de que llegue el pedido, y
 * dice explícitamente qué NO alcanzó a proyectar. Una lista corta puede
 * significar "no hay nada que comprar" o "esta empresa no registra sus
 * salidas", y confundirlas lleva a decisiones opuestas.
 */
@Component({
  selector: 'app-reposicion',
  templateUrl: './reposicion.component.html',
  styleUrls: ['./reposicion.component.scss'],
})
export class ReposicionComponent implements OnInit {
  cargando = false;
  creando = false;
  error: string | null = null;

  bodegas: Bodega[] = [];
  proveedores: Proveedor[] = [];
  bodegaSeleccionada = '';
  coberturaObjetivo = 30;
  ventanaDias = 90;

  sugerencia: SugerenciaReposicion | null = null;
  /** Cantidad a pedir por producto: arranca en lo sugerido y se puede corregir. */
  cantidades: Record<string, number> = {};
  seleccion: Record<string, boolean> = {};
  /** Para los productos que nunca se le compraron a nadie. */
  proveedorPorFila: Record<string, string> = {};

  soloUrgentes = false;

  // ======== Compras V2 (D-626, bandera `comprasV2`) ========
  /** Encendida, la pantalla suma costo en la fila, proveedor real, cantidades por empaque, filtros, avisos, Excel y Qué producir. */
  v2 = false;
  vista: 'comprar' | 'producir' = 'comprar';

  /** Lo que vale cada fila con el proveedor elegido. */
  vistas: Record<string, VistaFila> = {};
  /** Filas que se ven con los filtros puestos. */
  filasVisibles: FilaReposicion[] = [];

  filtroProveedor = '';
  filtroCategoria = '';
  filtroAviso: 'sin_costo' | 'sin_proveedor' | '' = '';
  categorias: string[] = [];
  proveedoresDeLaLista: { id: string; nombre: string }[] = [];

  /** Costo que la persona va escribiendo en la fila. */
  costoEscrito: Record<string, number | null> = {};
  guardandoCosto: Record<string, boolean> = {};
  guardandoProveedor: Record<string, boolean> = {};
  /** Filas que ya salieron en un borrador, con el id de la orden. */
  enBorrador: Record<string, string> = {};
  avisoAbierto: string | null = null;
  readonly productosPorAviso = PRODUCTOS_POR_AVISO;

  /** Una clave por intento de «Generar órdenes»: si la respuesta se pierde y se repite, no se duplican. */
  private generacionId: string | null = null;

  // Qué producir
  produccion: SugerenciaProduccion | null = null;
  cargandoProduccion = false;
  errorProduccion: string | null = null;
  diasProduccion = 2;

  constructor(
    private inventarioService: InventarioService,
    private features: CompanyFeaturesService,
    private router: Router,
  ) {}

  /** Mismo avatar que el resto de las listas de Katuq. */
  inicial = inicialDe;
  colorAvatar = colorDeAvatar;

  ngOnInit(): void {
    this.v2 = this.features.isEnabled('comprasV2');

    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas || [];
        this.consultar();
      },
      error: () => this.consultar(),
    });

    this.inventarioService.listarProveedores().subscribe({
      next: (r) => {
        this.proveedores = r.proveedores || [];
        // Si la sugerencia llegó antes que el maestro, los nombres y tiempos se completan ahora.
        if (this.v2 && this.sugerencia) {
          this.prepararV2(this.sugerencia);
          this.recalcularLista();
        }
      },
      error: () => { this.proveedores = []; },
    });
  }

  clave(fila: FilaReposicion): string {
    return `${fila.productoId}_${fila.idBodega}`;
  }

  consultar(): void {
    this.cargando = true;
    this.error = null;

    this.inventarioService
      .sugerenciaReposicion({
        bodega: this.bodegaSeleccionada || undefined,
        dias: this.ventanaDias,
        cobertura: this.coberturaObjetivo,
      })
      .subscribe({
        next: (sugerencia) => {
          this.sugerencia = sugerencia;
          this.cantidades = {};
          this.seleccion = {};
          this.proveedorPorFila = {};
          this.vistas = {};
          this.costoEscrito = {};
          // Un borrador no cuenta como «en camino», así que la sugerencia sigue pidiendo lo mismo. La marca
          // «En borrador» se conserva al recalcular o cambiar bodega o cobertura: si no, las mismas filas
          // reaparecen marcadas y se generarían otra vez.
          const marcasPrevias = this.enBorrador;
          this.enBorrador = {};
          this.filtroAviso = '';
          for (const fila of sugerencia.filas || []) {
            const k = this.clave(fila);
            this.cantidades[k] = fila.sugerido;
            if (marcasPrevias[k]) this.enBorrador[k] = marcasPrevias[k];
            // Lo urgente viene marcado: es lo que alguien atendería primero. Lo que ya está en un borrador, no.
            this.seleccion[k] = fila.urgente && !this.enBorrador[k];
            if (fila.proveedorId) this.proveedorPorFila[k] = fila.proveedorId;
          }
          // V2 solo si la bandera está en las dos puntas: la de la pantalla y la que confirma el servidor.
          this.v2 = this.features.isEnabled('comprasV2') && sugerencia.comprasV2 === true;
          if (this.v2) this.prepararV2(sugerencia);
          this.recalcularLista();
          this.cargando = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'No se pudo calcular la sugerencia.';
          this.cargando = false;
        },
      });
  }

  get filas(): FilaReposicion[] {
    return this.filasVisibles;
  }

  /** Con los filtros de V2 puestos, solo cuenta lo que se ve: lo escondido no se pide sin querer. */
  get seleccionadas(): FilaReposicion[] {
    const base = this.v2 ? this.filasVisibles : this.sugerencia?.filas || [];
    return base.filter((f) => this.seleccion[this.clave(f)] && !this.enBorrador[this.clave(f)]);
  }

  get valorSeleccionado(): number {
    return this.seleccionadas.reduce(
      (s, f) => s + (this.cantidades[this.clave(f)] || 0) * this.costoDe(f),
      0,
    );
  }

  marcarTodas(marcar: boolean): void {
    for (const fila of this.filas) {
      if (!this.enBorrador[this.clave(fila)]) this.seleccion[this.clave(fila)] = marcar;
    }
  }

  fijarUrgentes(valor: boolean): void {
    this.soloUrgentes = valor;
    this.recalcularLista();
  }

  /** Aplica filtros y orden. Se llama cuando cambia la sugerencia o un filtro, no en cada ciclo de pantalla. */
  recalcularLista(): void {
    const todas = this.sugerencia?.filas || [];
    let lista = this.soloUrgentes ? todas.filter((f) => f.urgente) : todas;

    if (this.v2) {
      if (this.filtroProveedor) {
        lista = lista.filter((f) => {
          const id = this.proveedorPorFila[this.clave(f)] || '';
          return this.filtroProveedor === '__sin__' ? !id : id === this.filtroProveedor;
        });
      }
      if (this.filtroCategoria) {
        lista = lista.filter((f) => (f.categorias || []).includes(this.filtroCategoria));
      }
      if (this.filtroAviso === 'sin_costo') lista = lista.filter((f) => this.vistas[this.clave(f)]?.sinCosto);
      if (this.filtroAviso === 'sin_proveedor') lista = lista.filter((f) => !this.proveedorPorFila[this.clave(f)]);

      // Por días para agotarse: primero lo que se acaba antes de que llegue el pedido, después el que menos dura.
      lista = [...lista].sort((a, b) => {
        if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
        const ca = a.coberturaDias === null ? Infinity : a.coberturaDias;
        const cb = b.coberturaDias === null ? Infinity : b.coberturaDias;
        if (ca !== cb) return ca - cb;
        return b.consumoDiario - a.consumoDiario;
      });
    }

    this.filasVisibles = lista;
  }

  nombreBodega(idBodega: string): string {
    const bodega = this.bodegas.find((b) => b.idBodega === idBodega);
    return bodega?.nombre || idBodega;
  }

  nombreProveedor(id: string): string {
    return this.proveedores.find((p) => p.id === id)?.nombre || 'Sin proveedor';
  }

  /** Ticket 1470: sin existencia (o cobertura en cero) se dice «Agotado». */
  estaAgotado(fila: { saldo: number; coberturaDias: number | null }): boolean {
    return Number(fila.saldo) <= 0 || (fila.coberturaDias !== null && Math.round(fila.coberturaDias) === 0);
  }

  /** Ticket 1470: decimales con coma, como se escriben en Colombia (0,33). */
  porDia(valor: number): string {
    return Number(valor || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
  }

  textoCobertura(fila: { coberturaDias: number | null }): string {
    if (fila.coberturaDias === null) return 'sin demanda';
    const dias = Math.round(fila.coberturaDias);
    return dias === 0 ? 'agotado' : `${dias} días`;
  }

  // ======== Compras V2 ========

  private prepararV2(s: SugerenciaReposicion): void {
    for (const f of s.filas || []) this.vistas[this.clave(f)] = this.armarVista(f);
    this.categorias = [...new Set((s.filas || []).flatMap((f) => f.categorias || []))].sort((a, b) => a.localeCompare(b, 'es'));
    this.actualizarProveedoresDeLaLista();
  }

  /** Los proveedores que hoy están elegidos en alguna fila: es lo que se puede filtrar. */
  private actualizarProveedoresDeLaLista(): void {
    const ids = new Set<string>();
    for (const f of this.sugerencia?.filas || []) {
      const id = this.proveedorPorFila[this.clave(f)];
      if (id) ids.add(id);
    }
    this.proveedoresDeLaLista = [...ids]
      .map((id) => ({ id, nombre: this.nombreProveedor(id) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  /** Lo que vale la fila con el proveedor que está elegido: su costo, su tiempo y su empaque. */
  private armarVista(f: FilaReposicion): VistaFila {
    const id = this.proveedorPorFila[this.clave(f)] || '';
    const opcion = (f.opcionesProveedor || []).find((o) => o.proveedorId === id) || null;
    const maestro = this.proveedores.find((p) => p.id === id) || null;

    let costo = Number(f.costoUnitario) || 0;
    let diasEntrega = f.diasEntrega;
    let origenDias: VistaFila['origenDias'] = f.origenDeLosDias || 'supuesto';
    let unidadCompra: string | null = f.unidadCompra || null;
    let factor = 1;
    let minimo = 0;

    if (opcion) {
      costo = opcion.costoCompra > 0 ? opcion.costoCompra : costo;
      diasEntrega = opcion.diasEntrega;
      origenDias = opcion.origenDeLosDias;
      unidadCompra = opcion.unidadCompra;
      factor = opcion.factorCompra;
      minimo = opcion.pedidoMinimo;
    } else if (id && id !== f.proveedorId) {
      // Un proveedor que todavía no surte este producto: se usa lo que dice el maestro de proveedores.
      const prometido = Number(maestro?.diasEntrega) || 0;
      if (prometido > 0) {
        diasEntrega = prometido;
        origenDias = 'acordado';
      }
    }

    const calculo = calcularCompra({
      consumoDiario: f.consumoDiario,
      coberturaObjetivoDias: this.coberturaObjetivo,
      diasEntrega,
      saldo: f.saldo,
      yaPedido: f.yaPedido,
      factorCompra: factor,
      pedidoMinimo: minimo,
    });

    return {
      proveedorId: id,
      proveedorNombre: id ? opcion?.nombre || this.nombreProveedor(id) : null,
      costo,
      sinCosto: !(costo > 0),
      diasEntrega,
      origenDias,
      unidadCompra,
      factor,
      minimo,
      esDelProducto: !id || !!opcion || id === f.proveedorId,
      calculo,
    };
  }

  /** Costo con el que se valora la fila: el del proveedor elegido; sin V2, el de la sugerencia. */
  costoDe(f: FilaReposicion): number {
    return this.v2 ? this.vistas[this.clave(f)]?.costo ?? f.costoUnitario : f.costoUnitario;
  }

  opcionesDe(f: FilaReposicion): OpcionProveedor[] {
    return f.opcionesProveedor || [];
  }

  /** Proveedores del maestro que todavía no surten este producto. */
  otrosProveedores(f: FilaReposicion): Proveedor[] {
    const propios = new Set((f.opcionesProveedor || []).map((o) => o.proveedorId));
    return this.proveedores.filter((p) => !propios.has(p.id));
  }

  /** Al cambiar de proveedor la fila toma SU costo, SU tiempo y SU empaque, y la cantidad se recalcula. */
  cambiarProveedor(f: FilaReposicion): void {
    const k = this.clave(f);
    this.vistas[k] = this.armarVista(f);
    this.cantidades[k] = this.vistas[k].calculo.cantidad;
    this.actualizarProveedoresDeLaLista();
    this.recalcularLista();
  }

  textoDelCalculoDe(f: FilaReposicion): string {
    const v = this.vistas[this.clave(f)];
    return v ? textoDelCalculo(v.calculo, v.unidadCompra) : '';
  }

  textoDelCalculoProduccion(f: FilaProduccion): string {
    return f.calculo
      ? textoDelCalculo(
          calcularCompra({
            consumoDiario: f.calculo.consumoDiario,
            coberturaObjetivoDias: f.calculo.coberturaObjetivoDias,
            diasEntrega: f.calculo.diasEntrega,
            saldo: f.calculo.existencia,
            yaPedido: f.calculo.yaPedido,
          }),
        )
      : '';
  }

  /** Al cambiar bodega, cobertura o periodo se recalcula lo que se está viendo. */
  alCambiarFiltros(): void {
    this.consultar();
    this.produccion = null;
    if (this.vista === 'producir') this.cargarProduccion();
  }

  /** De lo seleccionado, cuántos no tienen costo y por eso no suman al valor. */
  get sinCostoSeleccionados(): number {
    return this.seleccionadas.filter((f) => this.vistas[this.clave(f)]?.sinCosto).length;
  }

  /** Cuántos de los productos por pedir siguen sin costo con el proveedor elegido. */
  get sinCostoActual(): number {
    return (this.sugerencia?.filas || []).filter((f) => this.vistas[this.clave(f)]?.sinCosto).length;
  }

  /** Lo que valen todos los productos por pedir con su cantidad actual; los que no tienen costo no suman. */
  get valorActual(): number {
    return (this.sugerencia?.filas || []).reduce(
      (suma, f) => suma + (this.cantidades[this.clave(f)] || 0) * (this.vistas[this.clave(f)]?.costo || 0),
      0,
    );
  }

  /** Los avisos del servidor que no repiten los avisos con enlace. */
  get advertenciasRestantes(): string[] {
    const cubiertas = /existencia negativa|por qué salieron|no registran salidas|sin costo|marcados para producción/i;
    return (this.sugerencia?.advertencias || []).filter((a) => !cubiertas.test(a));
  }

  /** Ticket 4cXsdN0qnkCoQ6WJQ3p0: cada aviso suelto lleva a la pantalla donde se corrige. */
  enlaceDeAdvertencia(texto: string): { texto: string; ruta: string } | null {
    const t = (texto || '').toLowerCase();
    if (/sin costo/.test(t)) return { texto: 'Agregar el costo en Productos', ruta: '/productos' };
    if (/negativ/.test(t)) return { texto: 'Corregir con un conteo', ruta: '/inventario/conteos' };
    if (/por qué salieron|sin motivo/.test(t)) return { texto: 'Ver movimientos', ruta: '/inventario/historial-movimientos' };
    if (/proveedor/.test(t)) return { texto: 'Ir a Proveedores', ruta: '/compras/proveedores' };
    if (/no registran salidas|sin salidas|sin venta/.test(t)) return { texto: 'Ver indicadores', ruta: '/inventario/indicadores' };
    if (/producción|produccion/.test(t)) return { texto: 'Ir a Producción', ruta: '/produccion/dashboard' };
    return null;
  }

  // ---- costo en la fila ----

  async guardarCosto(f: FilaReposicion): Promise<void> {
    const k = this.clave(f);
    const valor = Number(this.costoEscrito[k]);
    if (!(valor > 0)) {
      Swal.fire('Falta el costo', 'Escriba el costo por unidad, mayor que cero.', 'info');
      return;
    }

    this.guardandoCosto[k] = true;
    const proveedorId = this.proveedorPorFila[k] || null;
    try {
      const r = await this.inventarioService
        .registrarCostoEnLinea({ productoId: f.productoId, costoUnitario: valor, proveedorId })
        .toPromise();

      this.aplicarCostoGuardado(f, valor, proveedorId, r?.afectaVigente !== false, !!r?.creoRelacion, r?.destino);
      this.costoEscrito[k] = null;
      this.recalcularLista();
      if (r?.requiereAviso) {
        Swal.fire({
          icon: 'warning',
          title: 'El costo cambió mucho',
          text: `Cambió ${Math.round(Math.abs(r.deltaPct || 0))} %. Si fue un error al digitar, corríjalo de nuevo.`,
          confirmButtonColor: '#5F3FE0',
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'No se guardó el costo',
        text: err?.error?.message || 'Intente de nuevo.',
        confirmButtonColor: '#5F3FE0',
      });
    } finally {
      this.guardandoCosto[k] = false;
    }
  }

  /** El mismo producto puede estar en varias bodegas: el costo se ve en todas sus filas. */
  private aplicarCostoGuardado(
    f: FilaReposicion,
    valor: number,
    proveedorId: string | null,
    afectaVigente: boolean,
    creoRelacion: boolean,
    destino?: string,
  ): void {
    for (const otra of this.sugerencia?.filas || []) {
      if (otra.productoId !== f.productoId) continue;
      if (afectaVigente) {
        otra.costoUnitario = valor;
        otra.sinCosto = false;
      }
      if (proveedorId) {
        const opcion = (otra.opcionesProveedor || []).find((o) => o.proveedorId === proveedorId);
        if (opcion) {
          opcion.costoCompra = valor;
        } else if (creoRelacion) {
          otra.opcionesProveedor = [
            ...(otra.opcionesProveedor || []),
            this.opcionNueva(proveedorId, valor, destino === 'principal'),
          ];
        }
      }
      this.vistas[this.clave(otra)] = this.armarVista(otra);
    }
  }

  private opcionNueva(proveedorId: string, costo: number, esPrincipal: boolean): OpcionProveedor {
    const maestro = this.proveedores.find((p) => p.id === proveedorId);
    const prometido = Number(maestro?.diasEntrega) || 0;
    return {
      proveedorId,
      nombre: maestro?.nombre || 'Proveedor',
      esPrincipal,
      costoCompra: costo,
      diasEntrega: prometido > 0 ? prometido : 7,
      origenDeLosDias: prometido > 0 ? 'acordado' : 'supuesto',
      unidadCompra: null,
      factorCompra: 1,
      pedidoMinimo: 0,
      referenciaProveedor: null,
    };
  }

  /** «Guardar como proveedor de este producto»: la próxima vez ya viene elegido. */
  async guardarProveedor(f: FilaReposicion): Promise<void> {
    const k = this.clave(f);
    const proveedorId = this.proveedorPorFila[k];
    if (!proveedorId) return;

    this.guardandoProveedor[k] = true;
    try {
      const rel = await this.inventarioService.asignarProveedorAProducto({ productoId: f.productoId, proveedorId }).toPromise();
      for (const otra of this.sugerencia?.filas || []) {
        if (otra.productoId !== f.productoId) continue;
        if (!(otra.opcionesProveedor || []).some((o) => o.proveedorId === proveedorId)) {
          otra.opcionesProveedor = [
            ...(otra.opcionesProveedor || []),
            this.opcionNueva(proveedorId, Number(rel?.costoCompra) || 0, !!rel?.esPrincipal),
          ];
        }
        this.vistas[this.clave(otra)] = this.armarVista(otra);
      }
      Swal.fire({
        icon: 'success',
        title: rel?.esPrincipal ? 'Quedó como proveedor principal' : 'Proveedor guardado',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'No se guardó el proveedor',
        text: err?.error?.message || 'Intente de nuevo.',
        confirmButtonColor: '#5F3FE0',
      });
    } finally {
      this.guardandoProveedor[k] = false;
    }
  }

  // ---- avisos ----

  alternarAviso(a: AvisoReposicion): void {
    this.avisoAbierto = this.avisoAbierto === a.codigo ? null : a.codigo;
  }

  /** El enlace del aviso que se resuelve en esta misma pantalla: deja solo los productos afectados. */
  filtrarPorAviso(filtro: 'sin_costo' | 'sin_proveedor' | ''): void {
    this.filtroAviso = this.filtroAviso === filtro ? '' : filtro;
    this.soloUrgentes = false;
    this.recalcularLista();
  }

  limpiarFiltros(): void {
    this.filtroProveedor = '';
    this.filtroCategoria = '';
    this.filtroAviso = '';
    this.soloUrgentes = false;
    this.recalcularLista();
  }

  get hayFiltros(): boolean {
    return !!(this.filtroProveedor || this.filtroCategoria || this.filtroAviso || this.soloUrgentes);
  }

  // ---- generar órdenes ----

  /**
   * «Generar órdenes de compra»: una orden en BORRADOR por proveedor y bodega. Lo que no tiene
   * proveedor queda aparte. Nada entra al inventario.
   */
  async generarOrdenes(): Promise<void> {
    const filas = this.seleccionadas;
    if (filas.length === 0) {
      Swal.fire('Nada seleccionado', 'Marque lo que va a comprar.', 'info');
      return;
    }

    const items = filas.map((f) => {
      const k = this.clave(f);
      return {
        productoId: f.productoId,
        referencia: f.referencia || undefined,
        descripcion: f.nombre || undefined,
        idBodega: f.idBodega,
        cantidad: this.cantidades[k] || 0,
        costoUnitario: this.vistas[k]?.costo || 0,
        proveedorId: this.proveedorPorFila[k] || undefined,
      };
    });
    const conProveedor = items.filter((i) => i.proveedorId && i.cantidad > 0);
    const sinProveedor = items.filter((i) => !i.proveedorId);
    // Un grupo de más de 300 productos sale en varias órdenes.
    const porGrupo = new Map<string, number>();
    for (const i of conProveedor) {
      const g = `${i.proveedorId}||${i.idBodega}`;
      porGrupo.set(g, (porGrupo.get(g) || 0) + 1);
    }
    const grupos = [...porGrupo.values()].reduce((s, n) => s + Math.ceil(n / PRODUCTOS_POR_ORDEN), 0);

    if (conProveedor.length === 0) {
      Swal.fire(
        'Falta el proveedor',
        `${sinProveedor.length} producto(s) no tienen a quién pedírselos. Escoja el proveedor en cada fila.`,
        'warning',
      );
      return;
    }

    const confirmacion = await Swal.fire({
      title: `¿Generar ${grupos} orden(es) en borrador?`,
      html:
        `${conProveedor.length} productos por ${this.moneda(conProveedor.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0))}.` +
        (sinProveedor.length ? `<br><strong>${sinProveedor.length} sin proveedor</strong> quedan aparte para asignarles uno.` : '') +
        '<br><span class="text-muted">Son borradores: no mueven inventario y usted los revisa antes de confirmarlos.</span>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0',
    });
    if (!confirmacion.isConfirmed) return;

    this.creando = true;
    // La misma clave si se repite tras un fallo de red; una nueva después de un éxito.
    if (!this.generacionId) this.generacionId = this.nuevaClave();

    try {
      const r = (await this.inventarioService
        .generarBorradoresCompra({ items: conProveedor, cobertura: this.coberturaObjetivo, generacionId: this.generacionId })
        .toPromise()) as RespuestaBorradores | undefined;
      this.creando = false;
      this.generacionId = null;
      if (!r) return;

      // Lo que ya salió en un borrador se marca para no generarlo dos veces sin querer. Con grupos partidos
      // en varias órdenes, la fila se marca por la parte que le toca (el servidor parte en el mismo orden).
      const idDeParte = new Map<string, string>(
        [...r.creadas, ...r.yaExistian].map((o) => [`${o.proveedorId}||${o.idBodega}||${o.parte || 1}`, o.id]),
      );
      const posicionEnGrupo = new Map<string, number>();
      for (const i of conProveedor) {
        const g = `${i.proveedorId}||${i.idBodega}`;
        const n = posicionEnGrupo.get(g) || 0;
        posicionEnGrupo.set(g, n + 1);
        const id = idDeParte.get(`${g}||${Math.floor(n / PRODUCTOS_POR_ORDEN) + 1}`);
        if (!id) continue;
        const fila = filas.find((f) => f.productoId === i.productoId && f.idBodega === i.idBodega);
        if (!fila) continue;
        this.enBorrador[this.clave(fila)] = id;
        this.seleccion[this.clave(fila)] = false;
      }
      // Lo que el servidor encontró ya en otro borrador abierto no se pidió otra vez: también se marca.
      const yaEnBorrador = r.yaEnBorrador || [];
      for (const x of yaEnBorrador) {
        this.enBorrador[`${x.productoId}_${x.idBodega}`] = x.ordenId;
        this.seleccion[`${x.productoId}_${x.idBodega}`] = false;
      }

      const hechas = r.creadas.length + r.yaExistian.length;
      const de = (o: { parte?: number; partes?: number }) => (o.partes && o.partes > 1 ? ` (parte ${o.parte} de ${o.partes})` : '');
      const lineas = [
        ...r.creadas.map((o) => `<div>${escapar(o.proveedor)} · ${escapar(this.nombreBodega(o.idBodega))} · ${o.productos} productos · ${this.moneda(o.total)}${de(o)}</div>`),
        ...r.yaExistian.map((o) => `<div>${escapar(o.proveedor || this.nombreProveedor(o.proveedorId))} · ya estaba generada${de(o)}</div>`),
      ].join('');
      const faltan =
        (yaEnBorrador.length
          ? `<p class="mt-3 mb-1"><strong>Ya estaban en un borrador (${yaEnBorrador.length}):</strong> no se pidieron otra vez. Confirme o anule ese borrador si quiere cambiarlos.</p>` +
            yaEnBorrador.slice(0, 8).map((p) => `<div class="text-muted">${escapar(this.nombreDeFila(p.productoId, p.idBodega) || p.referencia || p.productoId)} · ${escapar(this.nombreBodega(p.idBodega))}</div>`).join('') +
            (yaEnBorrador.length > 8 ? `<div class="text-muted">y ${yaEnBorrador.length - 8} más</div>` : '')
          : '') +
        (r.sinProveedor.length
          ? `<p class="mt-3 mb-1"><strong>Sin proveedor (${r.sinProveedor.length}):</strong> asígneles uno y vuelva a generar.</p>` +
            r.sinProveedor.slice(0, 8).map((p) => `<div class="text-muted">${escapar(p.nombre || p.referencia || p.productoId)}</div>`).join('') +
            (r.sinProveedor.length > 8 ? `<div class="text-muted">y ${r.sinProveedor.length - 8} más</div>` : '')
          : '') +
        (r.fallidas.length
          ? `<p class="mt-3 mb-1"><strong>No se pudieron crear:</strong></p>` +
            r.fallidas.map((x) => `<div>${escapar(this.nombreProveedor(x.proveedorId))}: ${escapar(x.message)}</div>`).join('')
          : '');

      const dialogo = await Swal.fire({
        icon: r.fallidas.length || yaEnBorrador.length ? 'warning' : hechas > 0 ? 'success' : 'info',
        title: hechas > 0 ? `${hechas} orden(es) en borrador` : 'No se generó ninguna orden',
        html: lineas + faltan,
        showCancelButton: hechas > 0,
        confirmButtonText: hechas > 0 ? 'Ver las órdenes' : 'Entendido',
        cancelButtonText: 'Seguir aquí',
        confirmButtonColor: '#5F3FE0',
      });
      if (dialogo.isConfirmed && hechas > 0) this.router.navigate(['/inventario/ordenes-compra']);
    } catch (err: any) {
      this.creando = false;
      // La clave se conserva: si la orden sí se creó y solo se perdió la respuesta, repetir no la duplica.
      Swal.fire({
        icon: 'error',
        title: 'No se generaron las órdenes',
        text: (err?.error?.message || 'No se pudo completar.') + ' Puede volver a intentarlo.',
        confirmButtonColor: '#5F3FE0',
      });
    }
  }

  /** Nombre del producto en la sugerencia que se ve, para los avisos. */
  private nombreDeFila(productoId: string, idBodega: string): string | null {
    const fila = (this.sugerencia?.filas || []).find((f) => f.productoId === productoId && f.idBodega === idBodega);
    return fila?.nombre || null;
  }

  private nuevaClave(): string {
    const c: any = (globalThis as any).crypto;
    return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private moneda(valor: number): string {
    return Number(valor || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  // ---- exportar ----

  /** La sugerencia que se ve (con sus filtros) a Excel. */
  exportarExcel(): void {
    const filas = this.filasVisibles;
    if (filas.length === 0) {
      Swal.fire('Nada que exportar', 'La lista está vacía con los filtros puestos.', 'info');
      return;
    }
    const datos = filas.map((f) => {
      const k = this.clave(f);
      const v = this.vistas[k];
      const cantidad = this.cantidades[k] || 0;
      return {
        'Referencia': f.referencia || f.productoId,
        'Producto': f.nombre || '',
        'Bodega': this.nombreBodega(f.idBodega),
        'Categoría': (f.categorias || []).join(', '),
        'Hay': f.saldo,
        'Se vende por día': Number(f.consumoDiario.toFixed(2)),
        'Días para agotarse': f.coberturaDias === null ? '' : Math.round(f.coberturaDias),
        'Urgente': f.urgente ? 'Sí' : 'No',
        'En camino': f.yaPedido,
        'Proveedor': v?.proveedorNombre || '',
        'Entrega (días)': v?.diasEntrega ?? f.diasEntrega,
        'Costo por unidad': v?.costo || 0,
        'Cantidad a pedir': cantidad,
        'Valor': cantidad * (v?.costo || 0),
      };
    });
    this.descargar(datos, 'Qué comprar', `que-comprar-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  private descargar(datos: Record<string, unknown>[], hoja: string, archivo: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, hoja);
    XLSX.writeFile(wb, archivo);
  }

  // ---- Qué producir ----

  cambiarVista(vista: 'comprar' | 'producir'): void {
    this.vista = vista;
    if (vista === 'producir' && !this.produccion && !this.cargandoProduccion) this.cargarProduccion();
  }

  cargarProduccion(): void {
    this.cargandoProduccion = true;
    this.errorProduccion = null;
    this.inventarioService
      .sugerenciaProduccion({
        bodega: this.bodegaSeleccionada || undefined,
        dias: this.ventanaDias,
        cobertura: this.coberturaObjetivo,
        diasProduccion: Math.max(Number(this.diasProduccion) || 0, 0),
      })
      .subscribe({
        next: (p) => {
          this.produccion = p;
          this.cargandoProduccion = false;
        },
        error: (err) => {
          this.errorProduccion = err?.error?.message || 'No se pudo calcular qué producir.';
          this.cargandoProduccion = false;
        },
      });
  }

  exportarProduccion(): void {
    const filas = this.produccion?.filas || [];
    if (filas.length === 0) {
      Swal.fire('Nada que exportar', 'No hay productos por producir.', 'info');
      return;
    }
    this.descargar(
      filas.map((f) => ({
        'Referencia': f.referencia || f.productoId,
        'Producto': f.nombre || '',
        'Bodega': this.nombreBodega(f.idBodega),
        'Hay': f.saldo,
        'Se vende por día': Number(f.consumoDiario.toFixed(2)),
        'Días para agotarse': f.coberturaDias === null ? '' : Math.round(f.coberturaDias),
        'Urgente': f.urgente ? 'Sí' : 'No',
        'Cantidad a producir': f.sugerido,
      })),
      'Qué producir',
      `que-producir-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  /**
   * Convierte lo seleccionado en órdenes, una por proveedor y bodega: una orden
   * entra a una sola bodega, y un proveedor no factura lo de otro.
   */
  async crearOrdenes(): Promise<void> {
    const filas = this.seleccionadas;
    if (filas.length === 0) {
      Swal.fire('Nada seleccionado', 'Marque lo que va a comprar.', 'info');
      return;
    }

    const sinProveedor = filas.filter((f) => !this.proveedorPorFila[this.clave(f)]);
    if (sinProveedor.length > 0) {
      Swal.fire(
        'Falta el proveedor',
        `${sinProveedor.length} producto(s) no tienen a quién pedírselos. Escoja proveedor en cada fila o desmárquelos.`,
        'warning',
      );
      return;
    }

    const grupos = new Map<string, FilaReposicion[]>();
    for (const fila of filas) {
      const llave = `${this.proveedorPorFila[this.clave(fila)]}||${fila.idBodega}`;
      grupos.set(llave, [...(grupos.get(llave) || []), fila]);
    }

    const confirmacion = await Swal.fire({
      title: `¿Crear ${grupos.size} orden(es) de compra?`,
      html:
        `${filas.length} productos por ${this.valorSeleccionado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}.` +
        '<br><span class="text-muted">No mueve inventario: la mercancía entra cuando se reciba.</span>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.creando = true;
    const creadas: string[] = [];
    const fallidas: string[] = [];

    for (const [llave, delGrupo] of grupos.entries()) {
      const [proveedorId, idBodega] = llave.split('||');
      try {
        await this.inventarioService
          .crearOrdenCompra({
            proveedor: { nombre: this.nombreProveedor(proveedorId) },
            proveedorId,
            bodega: idBodega,
            lineas: delGrupo.map((f) => ({
              productoId: f.productoId,
              referencia: f.referencia || undefined,
              descripcion: f.nombre || undefined,
              cantidad: this.cantidades[this.clave(f)] || f.sugerido,
              costoUnitario: f.costoUnitario,
            })),
            observaciones: `Reposición sugerida · cobertura ${this.coberturaObjetivo} días`,
          })
          .toPromise();
        creadas.push(`${this.nombreProveedor(proveedorId)} (${this.nombreBodega(idBodega)})`);
      } catch (err: any) {
        fallidas.push(`${this.nombreProveedor(proveedorId)}: ${err?.error?.message || 'error'}`);
      }
    }

    this.creando = false;

    // Decir exactamente qué se creó: si una falla, las otras ya existen y
    // reportar un fracaso total llevaría a crearlas dos veces.
    if (fallidas.length === 0) {
      await Swal.fire({
        icon: 'success',
        title: `${creadas.length} orden(es) creada(s)`,
        html: creadas.map((c) => `<div>${c}</div>`).join(''),
      });
    } else {
      await Swal.fire({
        icon: creadas.length > 0 ? 'warning' : 'error',
        title: creadas.length > 0 ? 'Se crearon algunas' : 'No se crearon',
        html:
          (creadas.length ? `<p><strong>Creadas:</strong><br>${creadas.join('<br>')}</p>` : '') +
          `<p><strong>Fallaron:</strong><br>${fallidas.join('<br>')}</p>`,
      });
    }

    this.consultar();
  }
}
