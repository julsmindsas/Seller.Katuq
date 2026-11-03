import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Table } from 'primeng/table';
import { LazyLoadEvent } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { TreasuryPayment } from '../../../../shared/services/treasury/treasury.models';
import { metaEstado, PaymentStateMeta, HISTORIAL_STATUS_OPTIONS } from '../../tesoreria.constants';
import Swal from 'sweetalert2';

/**
 * Spec 013 — Tesorería MVP. Tab "Historial" (T-19, CA-15).
 * Tabla lazy server-side sobre GET /v1/treasury/payments con filtros básicos.
 */
@Component({
  selector: 'app-historial-pagos',
  templateUrl: './historial-pagos.component.html',
  styleUrls: ['./historial-pagos.component.scss'],
})
export class HistorialPagosComponent implements OnChanges, OnDestroy {
  @Input() active = false;

  @ViewChild('dt') dt: Table | undefined;

  items: TreasuryPayment[] = [];
  loading = false;
  totalRecords = 0;
  page = 1;
  pageSize = 25;

  // Filtros
  status = '';
  search = '';
  fechaDesde = '';
  fechaHasta = '';

  readonly statusOptions = HISTORIAL_STATUS_OPTIONS;

  private loadedOnce = false;
  private search$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private treasury: TreasuryService) {
    this.search$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active'] && this.active && !this.loadedOnce) {
      this.loadedOnce = true;
      // La p-table lazy dispara onLazyLoad al montarse → carga inicial.
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(event?: LazyLoadEvent): void {
    if (event) {
      this.pageSize = event.rows || this.pageSize;
      this.page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    }

    this.loading = true;
    this.treasury
      .getPayments({
        status: this.status || undefined,
        desde: this.fechaDesde || undefined,
        hasta: this.fechaHasta || undefined,
        search: this.search?.trim() || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.items = res?.items || [];
          this.totalRecords = res?.pagination?.totalItems || 0;
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.totalRecords = 0;
          this.loading = false;
        },
      });
  }

  onSearchInput(): void {
    this.search$.next();
  }

  applyFilters(): void {
    if (this.dt) {
      this.dt.reset();
    } else {
      this.page = 1;
      this.loadData();
    }
  }

  meta(estado: string): PaymentStateMeta {
    return metaEstado(estado);
  }

  verComprobante(item: TreasuryPayment): void {
    if (item?.archivoUrl) {
      window.open(item.archivoUrl, '_blank');
    }
  }

  /** Ticket 1361: id del pago que se está anulando (deshabilita su botón). */
  anulando: string | null = null;

  /** Solo pagos aprobados que no son de pasarela (esos se reembolsan en Wompi o ePayco). */
  sePuedeAnular(item: any): boolean {
    if (!item || item.estadoVerificacion !== 'Aprobado') return false;
    const forma = String(item.formaPago || item.metodoPago || '').toLowerCase();
    return item.origen !== 'webhook' && !forma.includes('wompi') && !forma.includes('epayco');
  }

  /** Pide el motivo, muestra el efecto y anula. El servidor vuelve a validar todo. */
  async anular(item: any): Promise<void> {
    const valor = Number(item?.valor || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const r = await Swal.fire({
      title: `Anular el pago de ${item?.nroPedido || 'este pedido'}`,
      html: `El pago de <b>${valor}</b> (${item?.referencia || 'sin referencia'}) queda <b>anulado</b>: no se borra, pero deja de contar.<br>`
        + `El pedido vuelve a deber ${valor} más y su estado se recalcula con los pagos que le quedan.<br>`
        + `<small>No se puede deshacer. Si el pedido ya tiene factura electrónica, el pago se deshace con una nota crédito.</small>`,
      input: 'textarea',
      inputLabel: 'Motivo (obligatorio)',
      inputPlaceholder: 'Ej.: se aplicó al pedido equivocado',
      inputValidator: (v) => (!String(v || '').trim() ? 'Escribe el motivo' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Anular pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D64545',
    });
    if (!r.isConfirmed) return;
    this.anulando = item.id;
    this.treasury.annulPayment(item.id, String(r.value).trim()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.anulando = null;
        const saldo = Number(res?.valorRestante || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        Swal.fire({ icon: 'success', title: 'Pago anulado', text: `El pedido quedó en ${res?.estadoPago} y debe ${saldo}.` });
        this.loadData();
      },
      error: (err) => {
        this.anulando = null;
        Swal.fire({ icon: 'error', title: 'No se anuló', text: err?.error?.error || err?.error?.message || 'Intenta de nuevo.' });
      },
    });
  }

  trackByPayment(_index: number, item: TreasuryPayment): string {
    return item?.id || `${item?.orderId}-${_index}`;
  }
}
