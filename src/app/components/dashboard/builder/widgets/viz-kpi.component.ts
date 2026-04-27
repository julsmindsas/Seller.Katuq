import { Component, Input } from '@angular/core';
import { ReportColumn, ReportResult } from '../../model/report-spec.interfaces';

@Component({
  selector: 'app-viz-kpi',
  template: `
    <div class="kpi-grid">
      <div *ngFor="let kpi of kpis" class="kpi-card">
        <span class="kpi-label">{{ kpi.label }}</span>
        <span class="kpi-value">{{ kpi.value }}</span>
      </div>
      <div *ngIf="kpis.length === 0" class="kpi-empty">Sin datos</div>
    </div>
  `,
  styles: [
    `
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }
      .kpi-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-left: 4px solid #2563eb;
        border-radius: 10px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .kpi-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b7280;
        font-weight: 600;
      }
      .kpi-value {
        font-size: 28px;
        font-weight: 600;
        color: #111827;
      }
      .kpi-empty {
        text-align: center;
        color: #9ca3af;
      }
    `,
  ],
})
export class VizKpiComponent {
  private _result: ReportResult | null = null;
  kpis: { label: string; value: string }[] = [];

  @Input() set result(r: ReportResult | null) {
    this._result = r;
    this.compute();
  }

  private compute(): void {
    if (!this._result || this._result.rows.length === 0) {
      this.kpis = [];
      return;
    }
    const measureCols = this._result.columns.filter((c) => c.type === 'measure');
    const row = this._result.rows[0];
    this.kpis = measureCols.map((col) => ({
      label: col.label,
      value: this.format(row[col.field], col),
    }));
  }

  private format(value: unknown, col: ReportColumn): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
      return String(value);
    }
    if (col.format === 'currency') {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    }
    if (col.format === 'percent') {
      return `${(n * 100).toFixed(2)}%`;
    }
    return new Intl.NumberFormat('es-CO').format(n);
  }
}
