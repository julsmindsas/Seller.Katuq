import { Component, Input } from '@angular/core';
import { ReportColumn, ReportResult } from '../../model/report-spec.interfaces';

interface PivotData {
  rowDims: ReportColumn[];
  colKeys: string[];
  measureCols: ReportColumn[];
  rows: { rowVals: unknown[]; cells: Record<string, unknown> }[];
}

@Component({
  selector: 'app-viz-table',
  template: `
    <div class="table-wrap" *ngIf="!pivot && result">
      <table class="data-table">
        <thead>
          <tr>
            <th *ngFor="let c of result.columns">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of result.rows">
            <td *ngFor="let c of result.columns">{{ format(row[c.field], c) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-wrap" *ngIf="pivot && pivotData">
      <table class="data-table">
        <thead>
          <tr>
            <th *ngFor="let d of pivotData.rowDims">{{ d.label }}</th>
            <th *ngFor="let c of pivotData.colKeys">{{ c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of pivotData.rows">
            <td *ngFor="let v of row.rowVals; let i = index">{{ format(v, pivotData.rowDims[i]) }}</td>
            <td *ngFor="let ck of pivotData.colKeys">
              {{ format(row.cells[ck], pivotData.measureCols[0]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .table-wrap {
        overflow: auto;
        max-height: 500px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .data-table thead {
        background: #f9fafb;
        position: sticky;
        top: 0;
      }
      .data-table th,
      .data-table td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #f3f4f6;
        white-space: nowrap;
      }
      .data-table th {
        font-weight: 600;
        color: #374151;
      }
      .data-table tbody tr:hover {
        background: #f9fafb;
      }
    `,
  ],
})
export class VizTableComponent {
  private _result: ReportResult | null = null;
  private _pivot = false;
  pivotData: PivotData | null = null;

  @Input() set pivot(v: boolean) {
    this._pivot = v;
    this.compute();
  }
  get pivot(): boolean { return this._pivot; }

  @Input() set result(r: ReportResult | null) {
    this._result = r;
    this.compute();
  }

  get result(): ReportResult | null {
    return this._result;
  }

  private compute(): void {
    if (!this._result || !this._pivot) {
      this.pivotData = null;
      return;
    }
    const dims = this._result.columns.filter((c) => c.type === 'dimension');
    const measures = this._result.columns.filter((c) => c.type === 'measure');
    // Pivot con 1 sola dimensión: pivotar por los valores de esa dimensión
    if (dims.length === 1 && measures.length > 0) {
      const dimCol = dims[0];
      const measureCol = measures[0];
      const colKeys = Array.from(new Set(this._result.rows.map((r) => String(r[dimCol.field] ?? ''))));
      colKeys.sort();
      // Una sola fila con cada valor de la dimensión como columna
      const cells: Record<string, unknown> = {};
      for (const row of this._result.rows) {
        const colKey = String(row[dimCol.field] ?? '');
        cells[colKey] = row[measureCol.field];
      }
      this.pivotData = {
        rowDims: [],
        colKeys,
        measureCols: [measureCol],
        rows: [{ rowVals: [], cells }],
      };
      return;
    }
    if (dims.length < 2 || measures.length === 0) {
      this.pivotData = null;
      return;
    }
    const rowDims = dims.slice(0, dims.length - 1);
    const colDim = dims[dims.length - 1];
    const measureCol = measures[0];

    const colKeys = Array.from(new Set(this._result.rows.map((r) => String(r[colDim.field] ?? ''))));
    colKeys.sort();

    const grouped = new Map<string, { rowVals: unknown[]; cells: Record<string, unknown> }>();
    for (const row of this._result.rows) {
      const key = rowDims.map((d) => String(row[d.field] ?? '')).join('||');
      if (!grouped.has(key)) {
        grouped.set(key, {
          rowVals: rowDims.map((d) => row[d.field]),
          cells: {},
        });
      }
      const target = grouped.get(key)!;
      const colKey = String(row[colDim.field] ?? '');
      target.cells[colKey] = row[measureCol.field];
    }

    this.pivotData = {
      rowDims,
      colKeys,
      measureCols: [measureCol],
      rows: Array.from(grouped.values()),
    };
  }

  format(value: unknown, col: ReportColumn | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (!col) {
      return String(value);
    }
    if (col.dataType === 'date') {
      return String(value);
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
    if (col.type === 'measure') {
      return new Intl.NumberFormat('es-CO').format(n);
    }
    return String(value);
  }
}
