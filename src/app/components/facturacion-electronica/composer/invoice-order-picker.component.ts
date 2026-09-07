import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { defer, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import { IntegrationsService } from '../../integrations/integrations.service';

@Component({
  selector: 'app-invoice-order-picker',
  templateUrl: './invoice-order-picker.component.html',
  styleUrls: ['./invoice-composer.component.scss'],
})
export class InvoiceOrderPickerComponent implements OnInit, OnDestroy {
  @Input() companyId = '';
  @Input() disabled = false;
  @Output() selected = new EventEmitter<string>();
  orders: any[] = [];
  search = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  loading = false;
  error = '';
  page = 1;
  total = 0;
  hasNext = false;
  private request?: Subscription;

  constructor(private ventas: VentasService, private integrations: IntegrationsService) {}
  ngOnInit(): void { this.load(); }
  private sameCompany(): boolean {
    try { return !!this.companyId && this.companyId === this.integrations.getActiveCompanyId(); } catch (_) { return false; }
  }

  load(page = 1): void {
    if (this.disabled) return;
    this.request?.unsubscribe();
    this.error = '';
    if (!this.sameCompany()) {
      this.error = 'Cambiaste de comercio. Vuelve a abrir Facturación electrónica.';
      this.orders = [];
      return;
    }
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.error = 'La fecha inicial no puede ser posterior a la final.';
      return;
    }
    const filter: any = {
      company: this.companyId, sortField: 'fechaCreacion', sortOrder: -1,
      tipoFecha: 'fechaCreacion', globalFilter: this.search.trim(),
    };
    if (this.dateFrom) filter.fechaInicial = this.dateFrom.toISOString();
    if (this.dateTo) {
      const end = new Date(this.dateTo);
      end.setHours(23, 59, 59, 999);
      filter.fechaFinal = end.toISOString();
    }
    this.loading = true;
    this.orders = [];
    this.request = defer(() => this.ventas.getOrdersByFilterOptimized(filter, page, 15, false))
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: response => {
          if (!this.sameCompany()) { this.error = 'El comercio cambió. Vuelve a abrir la pantalla.'; return; }
          this.orders = response.orders || [];
          this.page = page;
          this.total = response.pagination?.totalItems ?? this.orders.length;
          this.hasNext = response.pagination?.hasNextPage === true;
        },
        error: () => { this.error = 'No pudimos cargar los pedidos. Pulsa Buscar para intentar de nuevo.'; },
      });
  }
  clear(): void { this.search = ''; this.dateFrom = null; this.dateTo = null; this.load(); }
  id(order: any): string { return String(order._id || order.id || order.cd || ''); }
  customer(order: any): string {
    return order.facturacion?.nombres || order.cliente?.nombres_completos || order.cliente?.nombre || 'Sin nombre';
  }
  amount(order: any): number { return Number(order.totalPedididoConDescuento ?? order.totalPedido ?? order.total ?? 0); }
  unavailable(order: any): string {
    if (order.nroFactura || order.facturacionElectronica?.invoiceId) return 'Ya facturado';
    if (order.facturacionEnProceso) return 'En envío';
    if (['Cancelado', 'Precancelado'].includes(order.estadoPago)) return 'Cancelado';
    if (!order.carrito?.length) return 'Sin conceptos';
    if (!this.id(order)) return 'Sin identificador';
    return '';
  }
  choose(order: any): void {
    if (!this.disabled && !this.unavailable(order) && this.sameCompany()) this.selected.emit(this.id(order));
  }
  trackByOrder = (_: number, order: any) => this.id(order);
  ngOnDestroy(): void { this.request?.unsubscribe(); }
}
