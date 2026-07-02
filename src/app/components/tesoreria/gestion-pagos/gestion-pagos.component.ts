import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';
import { TreasuryService } from '../../../shared/services/treasury/treasury.service';
import { TreasuryMetrics } from '../../../shared/services/treasury/treasury.models';
import {
  PRESET_POR_REVISAR,
  PRESET_SIN_PAGO,
  PRESET_RECHAZADOS,
} from '../tesoreria.constants';

/**
 * Spec 013 — Tesorería MVP. Pantalla "Gestión de Pagos" (CA-14).
 * Orquesta: 6 KPI cards server-side + p-tabView con 5 pestañas.
 * Solo renderiza la pestaña activa (*ngIf) para no lanzar 5 cargas al server.
 */
@Component({
  selector: 'app-gestion-pagos',
  templateUrl: './gestion-pagos.component.html',
  styleUrls: ['./gestion-pagos.component.scss'],
})
export class GestionPagosComponent implements OnInit, OnDestroy {
  loadingMetrics = false;
  metricsError = false;
  metrics: TreasuryMetrics | null = null;

  activeIndex = 0;

  readonly presetPorRevisar = PRESET_POR_REVISAR;
  readonly presetSinPago = PRESET_SIN_PAGO;
  readonly presetRechazados = PRESET_RECHAZADOS;

  private destroy$ = new Subject<void>();

  constructor(private treasury: TreasuryService) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMetrics(): void {
    this.loadingMetrics = true;
    this.metricsError = false;
    this.treasury
      .getMetrics()
      .pipe(timeout(12000), takeUntil(this.destroy$))
      .subscribe({
        next: (m) => {
          this.metrics = m;
          this.loadingMetrics = false;
        },
        error: () => {
          this.metricsError = true;
          this.loadingMetrics = false;
        },
      });
  }

  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
  }

  /** Un modal/acción cambió el estado de un pago → refrescar los KPIs. */
  onDataChanged(): void {
    this.loadMetrics();
  }

  /** Desde una alerta: saltar a la cola "Por revisar". */
  goToReview(): void {
    this.activeIndex = 0;
  }
}
