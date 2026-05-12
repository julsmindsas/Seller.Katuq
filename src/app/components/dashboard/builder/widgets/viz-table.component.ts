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
      <div class="table-toolbar">
        <span class="rows-count">{{ filteredRows.length }} / {{ result.rows.length }} filas</span>
        <button type="button" class="btn-clear" (click)="clearFilters()" *ngIf="hasActiveFilters()">
          <i class="fa fa-xmark me-1"></i> Limpiar filtros
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th *ngFor="let c of result.columns" (click)="toggleSort(c.field)" class="th-sortable">
              {{ c.label }}
              <i class="fa sort-icon" [class.fa-arrow-up]="sortField===c.field && sortDir==='asc'" [class.fa-arrow-down]="sortField===c.field && sortDir==='desc'" [class.fa-sort]="sortField!==c.field"></i>
            </th>
          </tr>
          <tr class="filter-row">
            <th *ngFor="let c of result.columns">
              <input type="text" class="col-filter" [(ngModel)]="filters[c.field]" (input)="applyFilters()" [placeholder]="filterPlaceholder(c)" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of filteredRows">
            <td *ngFor="let c of result.columns">{{ format(row[c.field], c) }}</td>
          </tr>
          <tr *ngIf="filteredRows.length===0">
            <td [attr.colspan]="result.columns.length" class="no-data">Sin resultados con los filtros aplicados.</td>
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
        max-height: 560px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
      }
      .table-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #f3f4f6;
        border-bottom: 1px solid #e5e7eb;
        font-size: 12px;
        color: #374151;
        position: sticky;
        top: 0;
        z-index: 3;
      }
      .rows-count {
        font-weight: 600;
      }
      .btn-clear {
        background: transparent;
        border: 1px solid #d1d5db;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-clear:hover {
        background: #fff;
        border-color: #9ca3af;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .data-table thead {
        background: #f9fafb;
        position: sticky;
        top: 36px;
        z-index: 2;
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
      .th-sortable {
        cursor: pointer;
        user-select: none;
      }
      .th-sortable:hover {
        background: #f3f4f6;
      }
      .sort-icon {
        font-size: 11px;
        margin-left: 6px;
        opacity: 0.5;
      }
      .filter-row th {
        padding: 4px 8px;
        background: #f3f4f6;
        position: sticky;
        top: 70px;
        z-index: 1;
      }
      .col-filter {
        width: 100%;
        padding: 4px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
        outline: none;
      }
      .col-filter:focus {
        border-color: #2563eb;
      }
      .no-data {
        text-align: center;
        padding: 24px;
        color: #6b7280;
        font-style: italic;
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

  filters: Record<string, string> = {};
  filteredRows: Record<string, unknown>[] = [];
  sortField: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';

  @Input() set pivot(v: boolean) {
    this._pivot = v;
    this.compute();
  }
  get pivot(): boolean { return this._pivot; }

  @Input() set result(r: ReportResult | null) {
    this._result = r;
    this.filters = {};
    this.sortField = null;
    this.applyFilters();
    this.compute();
  }

  get result(): ReportResult | null {
    return this._result;
  }

  applyFilters(): void {
    if (!this._result) {
      this.filteredRows = [];
      return;
    }
    const colMap = new Map(this._result.columns.map((c) => [c.field, c]));
    let rows = [...this._result.rows];
    for (const [field, query] of Object.entries(this.filters)) {
      const q = (query || '').trim();
      if (!q) continue;
      const col = colMap.get(field);
      const isMeasure = col?.type === 'measure';
      // Parsear operador numérico: >, <, >=, <=, = (solo aplica a measures)
      const numMatch = isMeasure ? q.match(/^(>=|<=|>|<|=)\s*([\d.,]+)$/) : null;
      if (numMatch) {
        const op = numMatch[1];
        const target = Number(numMatch[2].replace(/,/g, ''));
        if (!Number.isNaN(target)) {
          rows = rows.filter((row) => {
            const n = Number(row[field]);
            if (Number.isNaN(n)) return false;
            switch (op) {
              case '>': return n > target;
              case '<': return n < target;
              case '>=': return n >= target;
              case '<=': return n <= target;
              case '=': return n === target;
            }
            return false;
          });
          continue;
        }
      }
      const ql = q.toLowerCase();
      rows = rows.filter((row) => {
        const v = row[field];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(ql);
      });
    }
    if (this.sortField) {
      const f = this.sortField;
      const dir = this.sortDir === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const va = a[f];
        const vb = b[f];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        const na = Number(va);
        const nb = Number(vb);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) {
          return (na - nb) * dir;
        }
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    this.filteredRows = rows;
  }

  toggleSort(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = {};
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filters).some((v) => (v || '').trim() !== '');
  }

  filterPlaceholder(c: ReportColumn): string {
    if (c.type === 'measure') return '> 1000, < 500, etc.';
    return 'Filtrar...';
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
