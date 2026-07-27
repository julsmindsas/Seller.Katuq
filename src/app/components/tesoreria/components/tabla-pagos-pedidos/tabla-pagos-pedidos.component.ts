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
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { metaEstado, PaymentStateMeta } from '../../tesoreria.constants';
import { RevisarPagoComponent } from '../revisar-pago/revisar-pago.component';
import { RegistrarPagoComponent } from '../registrar-pago/registrar-pago.component';
import { CambiarEstadoPagoComponent } from '../cambiar-estado-pago/cambiar-estado-pago.component';

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

  private lastLazyEvent: LazyLoadEvent | null = null;
  private loadedOnce = false;
  private search$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private ventas: VentasService,
    private maestro: MaestroService,
    private modal: NgbModal,
  ) {
    // Rango por defecto: último año → hoy (la cola de tesorería no debe ocultar
    // pedidos pendientes antiguos). El usuario puede ajustarlo.
    const hoy = new Date();
    const haceUnAnio = new Date();
    haceUnAnio.setFullYear(hoy.getFullYear() - 1);
    this.fechaHasta = this.toIso(hoy);
    this.fechaDesde = this.toIso(haceUnAnio);

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

    const filter = this.buildFilter();
    this.loading = true;
    this.ventas
      .getOrdersByFilterOptimized(filter, this.page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.orders = res?.orders || [];
          this.totalRecords = res?.pagination?.totalItems || 0;
          this.loading = false;
        },
        error: () => {
          this.orders = [];
          this.totalRecords = 0;
          this.loading = false;
        },
      });
  }

  private buildFilter(): any {
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}').nomComercial;
    const filter: any = {
      company,
      estadosPago: this.estadosPago,
      tipoFecha: 'fechaCreacion',
      fechaInicial: this.fechaDesde,
      // El backend compara strings: `fechaCreacion <= fechaFinal`. Con la
      // fecha sola ("2026-07-02") los pedidos de ESE día quedan fuera porque
      // su ISO trae hora ("2026-07-02T19:42..." > "2026-07-02"). Se envía el
      // día siguiente para que el rango sea inclusivo (incidente Almara:
      // los pedidos de hoy no aparecían en la cola Por revisar).
      fechaFinal: this.addDays(this.fechaHasta, 1),
    };

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

  /** Inicial del cliente para el avatar de la fila (solo presentación). */
  inicialCliente(pedido: any): string {
    const nombre = this.clienteNombre(pedido).trim();
    return nombre && nombre !== '—' ? nombre.charAt(0).toUpperCase() : '?';
  }

  /** Color del avatar por posición en la página (solo presentación). */
  avatarColor(index: number): string {
    return AVATAR_PALETTE[(index || 0) % AVATAR_PALETTE.length];
  }

  /** Último pago de PagosAsentados que sigue en verificación "Pendiente". */
  private pagoPendiente(pedido: any): any | null {
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

  // ── Totales de la página (footer) ─────────────────────────────────────────
  totalAnticipo(): number {
    return this.orders.reduce((acc, p) => acc + (Number(p?.anticipo) || 0), 0);
  }
  totalFalta(): number {
    return this.orders.reduce((acc, p) => acc + (Number(p?.faltaPorPagar) || 0), 0);
  }

  // ── Acciones (modales) ────────────────────────────────────────────────────
  abrirRevisar(pedido: any): void {
    const pago = this.pagoPendiente(pedido);
    if (!pago || !pago.paymentId) {
      Swal.fire({
        icon: 'info',
        title: 'Sin pago por revisar',
        text: 'Este pedido no tiene un comprobante pendiente de verificación.',
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
    return pedido?._id || pedido?.nroPedido || `row-${_index}`;
  }

  private toIso(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  /** Suma días a una fecha "YYYY-MM-DD" y retorna "YYYY-MM-DD". */
  private addDays(isoDate: string, days: number): string {
    if (!isoDate) return isoDate;
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return this.toIso(d);
  }
}
