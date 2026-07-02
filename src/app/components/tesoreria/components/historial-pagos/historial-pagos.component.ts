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

  trackByPayment(_index: number, item: TreasuryPayment): string {
    return item?.id || `${item?.orderId}-${_index}`;
  }
}
