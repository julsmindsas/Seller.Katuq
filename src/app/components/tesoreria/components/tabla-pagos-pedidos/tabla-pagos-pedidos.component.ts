import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Table } from 'primeng/table';
import { LazyLoadEvent } from 'primeng/api';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { CarteraService } from '../../../../shared/services/cartera/cartera.service';
import { MoraPedido } from '../../../../shared/services/cartera/cartera.models';
import { CompanyFeaturesService } from '../../../../shared/services/company-features.service';
import { abrirRecordatorioCobro } from '../../../../shared/components/recordatorio-cobro/recordatorio-cobro-modal.component';
import { OrdersTotals } from '../../../../shared/services/treasury/treasury.models';
import { claveDocumento } from '../../../../shared/utils/clave-documento';
import {
  filtroPedidosTesoreria,
  metaEstado,
  PaymentStateMeta,
  rangoPorDefecto,
  sumarDias,
} from '../../tesoreria.constants';
import { RevisarPagoComponent } from '../revisar-pago/revisar-pago.component';
import { RegistrarPagoComponent } from '../registrar-pago/registrar-pago.component';
import { CambiarEstadoPagoComponent } from '../cambiar-estado-pago/cambiar-estado-pago.component';

import { TranslateService } from '@ngx-translate/core';
type TablaModo = 'porRevisar' | 'sinPago' | 'rechazados';

/** Paleta de avatares de cliente (solo presentación, ciclada por índice de fila). */
const AVATAR_PALETTE = [
  '#6c4ce0', '#14b8a6', '#2f6fe0', '#c43e74',
  '#e0891b', '#17994f', '#4f5bd5', '#8b3fd1', '#17b0b0',
];

/**
 * Spec 013 — Tesorería MVP.
 * Tabla lazy server-side de pedidos filtrados por estadoPago (preset por pestaña).
 * Reusa POST /v1/orders/all/filter/optimized. Abre sus propios modales y, tras
 * una acción exitosa, recarga su página y emite (changed) para refrescar los KPIs.
 * La pestaña "Por revisar" usa la cola de comprobantes pendientes (ticket 1126):
 * una fila por comprobante, sea cual sea el estado del pedido.
 */
@Component({
  selector: 'app-tabla-pagos-pedidos',
  templateUrl: './tabla-pagos-pedidos.component.html',
  styleUrls: ['./tabla-pagos-pedidos.component.scss'],
})
export class TablaPagosPedidosComponent implements OnChanges, OnDestroy {
  @Input() estadosPago: string[] = [];
  @Input() mode: TablaModo = 'porRevisar';
  @Input() active = false;
  /** Ticket 1461: claves de documento de los clientes internos (vacío si la cartera interna está apagada). */
  @Input() clavesInternas: string[] = [];

  /** Notifica al padre que un pago cambió de estado (para refrescar KPIs). */
  @Output() changed = new EventEmitter<void>();

  @ViewChild('dt') dt: Table | undefined;

  orders: any[] = [];
  loading = false;
  totalRecords = 0;
  page = 1;
  pageSize = 25;

  // Toolbar
  searchTerm = '';
  formaPagoFilter = '';
  fechaDesde = '';
  fechaHasta = '';
  formasPago: any[] = [];

  /**
   * Ticket 1454: totales de TODO el resultado filtrado (no solo de la página en
   * pantalla). null = cargando o no disponible; el pie cae a la suma de la página.
   */
  totales: OrdersTotals | null = null;
  private totalesClave = '';

  private lastLazyEvent: LazyLoadEvent | null = null;
  private loadedOnce = false;
  private search$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  /** Tickets 1385 y 1457: bandera `recordatoriosCobro` («Recordar pago» en cada fila de «Sin pago»). */
  recordatoriosActivo = false;
  /** Ticket 1457 (parte A): bandera `carteraVendedorMora` (días de mora y rango en cada fila de «Sin pago»). */
  moraActiva = false;
  /** Mora de los pedidos de la página visible (orderId -> días y rango, con la regla de Cartera). */
  mora: { [orderId: string]: MoraPedido } = {};
  private esAdmin = false;

  /** Ticket 1461 (tarea 3.1): bandera `carteraInterna` (lista y totales de «Sin pago» sin los clientes internos). */
  carteraInternaActiva = false;
  /** Interruptor «Incluir internos» (apagado por defecto, igual que en Cartera). */
  incluirInternos = false;
  /** Pedidos de clientes internos que el servidor dejó fuera de la lista (solo viene con la exclusión activa). */
  internosOcultos = 0;

  constructor(
    private ventas: VentasService,
    private maestro: MaestroService,
    private modal: NgbModal,
    private treasury: TreasuryService,
    private translate: TranslateService,
    private carteraService: CarteraService,
    private features: CompanyFeaturesService,
  ) {
    this.recordatoriosActivo = this.features.isEnabled('recordatoriosCobro');
    this.moraActiva = this.features.isEnabled('carteraVendedorMora');
    this.carteraInternaActiva = this.features.isEnabled('carteraInterna');
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const rol = String(u.rol || u.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      this.esAdmin = /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(rol);
    } catch {
      this.esAdmin = false;
    }
    // Rango por defecto: último año → hoy. El usuario puede ajustarlo.
    const rango = rangoPorDefecto();
    this.fechaDesde = rango.desde;
    this.fechaHasta = rango.hasta;

    this.search$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active'] && this.active && !this.loadedOnce) {
      this.loadedOnce = true;
      this.loadFormasPago();
      // La p-table lazy dispara onLazyLoad al montarse → carga inicial.
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────
  loadData(event?: LazyLoadEvent): void {
    if (event) {
      this.lastLazyEvent = event;
      this.pageSize = event.rows || this.pageSize;
      this.page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    }

    this.loading = true;
    // Ticket 1126: "Por revisar" lista comprobantes pendientes (la tarjeta cuenta
    // lo mismo), no pedidos en "Pospendiente": un pedido que cambió de estado por
    // otro camino dejaba su comprobante pendiente por fuera de la lista.
    const datos$: Observable<any> =
      this.mode === 'porRevisar'
        ? this.treasury.getReviewQueue({
            desde: this.fechaDesde,
            hasta: this.fechaHasta,
            search: (this.searchTerm || '').trim(),
            formaPago: this.formaPagoFilter,
            page: this.page,
            pageSize: this.pageSize,
          })
        : this.ventas.getOrdersByFilterOptimized(this.buildFilter(), this.page, this.pageSize);
    this.cargarTotales();
    datos$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.orders = res?.orders || [];
          this.totalRecords = res?.pagination?.totalItems || 0;
          this.internosOcultos = this.excluirInternos ? Number(res?.internosOcultos) || 0 : 0;
          this.loading = false;
          this.cargarMora();
        },
        error: () => {
          this.orders = [];
          this.totalRecords = 0;
          this.internosOcultos = 0;
          this.loading = false;
        },
      });
  }

  /** Columnas de la tabla (para el mensaje de «sin resultados»). */
  get columnas(): number {
    return 6 + (this.verMora ? 1 : 0);
  }

  get verMora(): boolean {
    return this.mode === 'sinPago' && this.moraActiva;
  }

  get verRecordar(): boolean {
    return this.mode === 'sinPago' && this.recordatoriosActivo;
  }

  /**
   * Ticket 1457 (parte A): días de mora y rango de los pedidos de la página visible. Es un extra: si no carga, la
   * lista sigue igual. Solo se piden los pedidos de esta página.
   */
  private moraSub?: Subscription;

  private cargarMora(): void {
    this.moraSub?.unsubscribe();
    this.mora = {};
    if (!this.verMora || !this.orders.length) return;
    const ids = this.orders.map((o) => String(o?._id || '')).filter(Boolean);
    if (!ids.length) return;
    // Si el usuario cambia de página rápido, la respuesta de la página anterior se descarta.
    this.moraSub?.unsubscribe();
    this.moraSub = this.carteraService
      .moraDePedidos(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => (this.mora = r?.pedidos || {}),
        error: () => (this.mora = {}),
      });
  }

  moraDe(pedido: any): MoraPedido | null {
    return this.mora[String(pedido?._id || '')] || null;
  }

  /** «8 d» si está vencido; «Al día» si no; vacío si no se pudo calcular. */
  textoMora(pedido: any): string {
    const m = this.moraDe(pedido);
    if (!m) return '';
    return m.diasVencido > 0 ? `${m.diasVencido} d` : this.translate.instant('cartera.acciones.alDia');
  }

  claveRango(pedido: any): string {
    const m = this.moraDe(pedido);
    return m ? `cartera.rangos.${m.rango}Etiqueta` : '';
  }

  /** Ticket 1385/1457: «Recordar pago» desde la fila. El servidor resuelve el cliente y el saldo desde Cartera. */
  recordarPago(pedido: any): void {
    const id = String(pedido?._id || '');
    if (!id) return;
    abrirRecordatorioCobro(this.modal, [{ orderIds: [id], nombre: this.clienteNombre(pedido) }], this.esAdmin);
  }

  /**
   * Pide al servidor los totales del filtro actual. Cambiar de página no los
   * cambia, así que solo se vuelve a pedir cuando cambian los filtros o tras una
   * acción (reload). "Por revisar" lista comprobantes, no pedidos: queda con la
   * suma de lo que se ve.
   */
  private cargarTotales(forzar = false): void {
    if (this.mode === 'porRevisar') {
      this.totales = null;
      return;
    }
    const term = (this.searchTerm || '').trim();
    const filtros = {
      estadosPago: this.estadosPago,
      fechaInicial: this.fechaDesde,
      // Misma fecha final que la lista: el día siguiente, para incluir el día de "hasta".
      fechaFinal: sumarDias(this.fechaHasta, 1),
      nroPedido: term && /^\d+$/.test(term) ? term : undefined,
      cliente: term && !/^\d+$/.test(term) ? term : undefined,
      // Misma forma de pago que manda la lista (buildFilter): el pie suma exactamente lo que se lista.
      formaPago: this.formaPagoFilter || undefined,
      // Ticket 1461 (tarea 3.1): el pie suma lo mismo que la lista, sin los clientes internos.
      excluirInternos: this.excluirInternos ? true : undefined,
    };
    const clave = JSON.stringify(filtros);
    if (!forzar && clave === this.totalesClave) return;
    this.totalesClave = clave;
    this.totales = null;
    this.treasury
      .getOrdersTotals(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (t) => {
          if (clave === this.totalesClave) this.totales = t;
        },
        error: () => {
          if (clave === this.totalesClave) this.totales = null;
        },
      });
  }

  private buildFilter(): any {
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}').nomComercial;
    const filter: any = filtroPedidosTesoreria(company, this.estadosPago, this.fechaDesde, this.fechaHasta);

    const term = (this.searchTerm || '').trim();
    if (term) {
      if (/^\d+$/.test(term)) {
        filter.nroPedido = term;
      } else {
        filter.cliente = term;
      }
    }
    if (this.formaPagoFilter) {
      filter.formaPago = this.formaPagoFilter;
    }
    // Ticket 1461 (tarea 3.1): solo «Sin pago», con la bandera encendida y el interruptor apagado. El servidor
    // vuelve a comprobar la bandera: sin ella ignora este campo.
    if (this.excluirInternos) {
      filter.excluirClientesInternos = true;
    }
    if (this.lastLazyEvent?.sortField) {
      filter.sortField = this.lastLazyEvent.sortField;
      filter.sortOrder = this.lastLazyEvent.sortOrder || 1;
    }
    return filter;
  }

  private loadFormasPago(): void {
    this.maestro
      .consultarFormaPago()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fp) => {
          this.formasPago = Array.isArray(fp) ? fp : [];
        },
        error: () => {
          this.formasPago = [];
        },
      });
  }

  // ── Toolbar ─────────────────────────────────────────────────────────────
  onSearchInput(): void {
    this.search$.next();
  }

  applyFilters(): void {
    // dt.reset() vuelve a la primera página y dispara onLazyLoad → loadData.
    if (this.dt) {
      this.dt.reset();
    } else {
      this.page = 1;
      this.loadData();
    }
  }

  reload(): void {
    this.cargarTotales(true);
    this.loadData(this.lastLazyEvent || undefined);
  }

  // ── Helpers de presentación ───────────────────────────────────────────────
  meta(estado: string): PaymentStateMeta {
    return metaEstado(estado);
  }

  clienteNombre(pedido: any): string {
    const c = pedido?.cliente;
    if (!c) return '—';
    return `${c.nombres_completos || ''} ${c.apellidos_completos || ''}`.trim() || '—';
  }

  progresoPct(pedido: any): number {
    const total = Number(pedido?.totalPedididoConDescuento) || 0;
    const anticipo = Number(pedido?.anticipo) || 0;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((anticipo / total) * 100));
  }

  progresoClase(pedido: any): string {
    const pct = this.progresoPct(pedido);
    if (pct <= 0) return 'is-empty';
    if (pct >= 100) return '';
    return 'is-partial';
  }

  /** Color del monto ya abonado: gris si no hay pago, ámbar parcial, verde completo. */
  pagadoClase(pedido: any): string {
    const pct = this.progresoPct(pedido);
    if (pct <= 0) return '';
    return pct >= 100 ? 'is-full' : 'is-partial';
  }

  /**
   * Ticket 1217: valor del pago que espera revisión, para que la fila no diga solo
   * "$0 / $total" mientras hay un comprobante subido. Se limita a lo que falta por
   * cubrir: hay pedidos cuyo `anticipo` ya incluye ese pago y no se debe contar dos veces.
   */
  montoEnRevision(pedido: any): number {
    const pago = this.pagoPendiente(pedido);
    if (!pago) return 0;
    const valor = Number(pago?.valor ?? pago?.valorRegistrado) || 0;
    const total = Number(pedido?.totalPedididoConDescuento) || 0;
    const anticipo = Number(pedido?.anticipo) || 0;
    return Math.max(0, Math.min(valor, total - anticipo));
  }

  /** Inicial del cliente para el avatar de la fila (solo presentación). */
  inicialCliente(pedido: any): string {
    const nombre = this.clienteNombre(pedido).trim();
    return nombre && nombre !== '—' ? nombre.charAt(0).toUpperCase() : '?';
  }

  /** Color del avatar por posición en la página (solo presentación). */
  avatarColor(index: number): string {
    return AVATAR_PALETTE[(index || 0) % AVATAR_PALETTE.length];
  }

  /**
   * El comprobante de la fila: en "Por revisar" viene de la cola (`_pagoPendiente`);
   * si no, el último pago de PagosAsentados que sigue en verificación "Pendiente".
   */
  private pagoPendiente(pedido: any): any | null {
    if (pedido?._pagoPendiente) return pedido._pagoPendiente;
    const pagos = pedido?.PagosAsentados || [];
    for (let i = pagos.length - 1; i >= 0; i--) {
      if (pagos[i]?.estadoVerificacion === 'Pendiente') return pagos[i];
    }
    return null;
  }

  /** Motivo de rechazo del último pago rechazado (se muestra inline). */
  motivoRechazo(pedido: any): string {
    const pagos = pedido?.PagosAsentados || [];
    for (let i = pagos.length - 1; i >= 0; i--) {
      if (pagos[i]?.estadoVerificacion === 'Rechazado') {
        return pagos[i]?.motivoRechazo || pagos[i]?.notas || '';
      }
    }
    return '';
  }

  puedeRevisar(pedido: any): boolean {
    const pago = this.pagoPendiente(pedido);
    return !!(pago && pago.paymentId);
  }

  // ── Totales del pie ───────────────────────────────────────────────────────
  // Con totales del servidor son los de todo el resultado filtrado; mientras
  // llegan (o si fallan, o en "Por revisar") son los de las filas en pantalla.
  get totalesDelFiltro(): boolean {
    return this.totales !== null;
  }
  /** El servidor leyó solo una parte del filtro (tope de seguridad): los totales no son exactos. */
  get totalesIncompletos(): boolean {
    return this.totales?.truncado === true;
  }
  // ── Clientes internos (ticket 1461) ───────────────────────────────────────
  private internosDe: string[] | null = null;
  private internosSet = new Set<string>();

  /** ¿El cliente del pedido es interno? Misma clave de documento que el servidor (sin puntos, guiones ni dígito de verificación). */
  esInterno(pedido: any): boolean {
    if (!this.clavesInternas || this.clavesInternas.length === 0) return false;
    if (this.internosDe !== this.clavesInternas) {
      this.internosDe = this.clavesInternas;
      this.internosSet = new Set(this.clavesInternas);
    }
    const clave = claveDocumento(pedido?.cliente?.documento);
    return !!clave && this.internosSet.has(clave);
  }

  /** ¿Esta lista deja fuera a los clientes internos? (solo «Sin pago», con la bandera y sin «Incluir internos»). */
  get excluirInternos(): boolean {
    return this.mode === 'sinPago' && this.carteraInternaActiva && !this.incluirInternos;
  }

  /**
   * El interruptor solo tiene sentido si la empresa tiene clientes internos marcados. Se muestra también si el
   * servidor dejó pedidos fuera (aunque las tarjetas de arriba no hayan cargado y falte la lista de claves) y
   * mientras «Incluir internos» esté activo, para que el usuario siempre pueda volver a ocultarlos.
   */
  get verInterruptorInternos(): boolean {
    if (this.mode !== 'sinPago' || !this.carteraInternaActiva) return false;
    return (this.clavesInternas?.length || 0) > 0 || this.internosOcultos > 0 || this.incluirInternos;
  }

  cambiarIncluirInternos(valor: boolean): void {
    this.incluirInternos = !!valor;
    this.applyFilters();
  }

  /** Cuántos pedidos de la página son de clientes internos. */
  pedidosInternos(): number {
    return this.orders.reduce((n, p) => n + (this.esInterno(p) ? 1 : 0), 0);
  }

  totalPedidos(): number {
    return this.totales ? this.totales.totalItems : this.orders.length;
  }
  totalAnticipo(): number {
    if (this.totales) return this.totales.anticipo;
    return this.orders.reduce((acc, p) => acc + (Number(p?.anticipo) || 0), 0);
  }
  totalFalta(): number {
    if (this.totales) return this.totales.faltaPorPagar;
    return this.orders.reduce((acc, p) => acc + (Number(p?.faltaPorPagar) || 0), 0);
  }

  // ── Acciones (modales) ────────────────────────────────────────────────────
  abrirRevisar(pedido: any): void {
    const pago = this.pagoPendiente(pedido);
    if (!pago || !pago.paymentId) {
      Swal.fire({
        icon: 'info',
        title: this.translate.instant('tesoreria.tablaPagosPedidos.sinPagoPorRevisar'),
        text: this.translate.instant('tesoreria.tablaPagosPedidos.estePedidoNoTieneUn'),
      });
      return;
    }
    if (pedido?._pagoFueraDelPedido) {
      // La revisión exige que el pago esté guardado dentro del pedido; si no, el
      // servidor lo rechaza y la ventana diría que "otro usuario ya decidió".
      Swal.fire({
        icon: 'info',
        title: this.translate.instant('tesoreria.tablaPagosPedidos.esteComprobanteNoSePuede'),
        text: this.translate.instant('tesoreria.tablaPagosPedidos.elPagoQuedoRegistradoPero', { pedido: pedido?.nroPedido || '' }),
      });
      return;
    }
    const ref = this.modal.open(RevisarPagoComponent, { size: 'lg', centered: true, scrollable: true });
    ref.componentInstance.pedido = pedido;
    ref.componentInstance.pago = pago;
    ref.componentInstance.paymentId = pago.paymentId;
    this.handleModalResult(ref);
  }

  abrirRegistrar(pedido: any): void {
    const ref = this.modal.open(RegistrarPagoComponent, { size: 'lg', centered: true, scrollable: true });
    ref.componentInstance.pedido = pedido;
    this.handleModalResult(ref);
  }

  abrirCambiarEstado(pedido: any): void {
    const ref = this.modal.open(CambiarEstadoPagoComponent, { size: 'lg', centered: true, scrollable: true });
    ref.componentInstance.pedido = pedido;
    this.handleModalResult(ref);
  }

  private handleModalResult(ref: any): void {
    ref.result.then(
      (res: any) => {
        if (res && res.changed) {
          this.reload();
          this.changed.emit();
        }
      },
      () => {
        /* dismiss: no-op */
      },
    );
  }

  trackByPedido(_index: number, pedido: any): string {
    // En "Por revisar" puede haber dos comprobantes del mismo pedido: una fila por comprobante.
    return pedido?._filaId || pedido?._id || pedido?.nroPedido || `row-${_index}`;
  }
}
