import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import { FeatureFlagsService } from '../../../../shared/services/feature-flags.service';
import { CustomerSummary } from '../../modelo/customer-summary';

/**
 * Spec 009 — Métricas del cliente en su ficha individual.
 * Solo lectura. Detrás del feature flag ENABLE_CUSTOMER_METRICS.
 * Una sola llamada al backend por documento (sin descargar carrito).
 */
@Component({
  selector: 'app-customer-metrics',
  templateUrl: './customer-metrics.component.html',
  styleUrls: ['./customer-metrics.component.scss'],
})
export class CustomerMetricsComponent implements OnChanges {
  @Input() documento: string | null = null;

  enabled = false;
  loading = false;
  error = false;
  summary: CustomerSummary | null = null;
  page = 1;
  pageSize = 20;
  mostrarPedidos = false;
  mostrarDetalles = false;

  constructor(
    private ventas: VentasService,
    private flags: FeatureFlagsService
  ) {
    this.enabled = this.flags.isEnabled('ENABLE_CUSTOMER_METRICS');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documento']) {
      this.page = 1;
      this.load();
    }
  }

  load(): void {
    if (!this.enabled) return;
    const doc = (this.documento || '').toString().trim();
    if (!doc) {
      this.summary = null;
      return;
    }
    this.loading = true;
    this.error = false;
    this.ventas.getCustomerSummary(doc, this.page, this.pageSize).subscribe({
      next: (res) => {
        this.summary = res;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  get totalPages(): number {
    if (!this.summary) return 1;
    return Math.max(1, Math.ceil(this.summary.pedidos.total / this.pageSize));
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.load();
  }

  /** Lo invoca el botón "Pedidos relacionados" de la ficha del cliente. */
  togglePedidos(): void {
    this.mostrarPedidos = !this.mostrarPedidos;
  }

  toggleDetalles(): void {
    this.mostrarDetalles = !this.mostrarDetalles;
  }

  rfmColor(segmento: string | null): string {
    const map: Record<string, string> = {
      'Campeón':    '#16a34a',
      'Fiel':       '#2563eb',
      'En riesgo':  '#d97706',
      'Hibernando': '#6b7280',
      'Perdido':    '#dc2626',
    };
    return map[segmento ?? ''] ?? '#6b7280';
  }

  rfmBg(segmento: string | null): string {
    const map: Record<string, string> = {
      'Campeón':    '#f0fdf4',
      'Fiel':       '#eff6ff',
      'En riesgo':  '#fffbeb',
      'Hibernando': '#f9fafb',
      'Perdido':    '#fef2f2',
    };
    return map[segmento ?? ''] ?? '#f9fafb';
  }
}
