import { Component, Input } from '@angular/core';
import { ReportColumn, ReportResult } from '../../model/report-spec.interfaces';

interface PivotData {
  rowDims: ReportColumn[];
  colKeys: string[];
  measureCols: ReportColumn[];
  rows: { rowVals: unknown[]; cells: Record<string, unknown> }[];
}

type FilterMode = 'text' | 'select' | 'number' | 'date';

interface ColumnFilterState {
  text?: string;
  selected?: string;
  min?: string;
  max?: string;
  from?: string;
  to?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-viz-table',
  template: `
    <div class="table-wrap" *ngIf="!pivot && result">
      <div class="table-toolbar">
        <span class="rows-count">{{ filteredRows.length }} / {{ result.rows.length }} filas</span>
        <div class="toolbar-actions">
          <label class="group-by-label">
            Agrupar por:
            <select class="group-by-select" [ngModel]="groupByField" (ngModelChange)="setGroupBy($event)">
              <option [ngValue]="null">— Sin agrupar —</option>
              <option *ngFor="let c of dimensionColumns" [ngValue]="c.field">{{ c.label }}</option>
            </select>
          </label>
          <button type="button" class="btn-clear" (click)="clearFilters()" *ngIf="hasActiveFilters()">
            <i class="fa fa-xmark me-1"></i> Limpiar filtros
          </button>
        </div>
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
              <ng-container *ngIf="filterState[c.field] as filter" [ngSwitch]="filterMode(c)">
                <div *ngSwitchCase="'number'" class="filter-range">
                  <input type="number" class="col-filter" [(ngModel)]="filter.min" (input)="applyFilters()" placeholder="Min" />
                  <input type="number" class="col-filter" [(ngModel)]="filter.max" (input)="applyFilters()" placeholder="Max" />
                </div>

                <div *ngSwitchCase="'date'" class="filter-range">
                  <input type="date" class="col-filter" [(ngModel)]="filter.from" (change)="applyFilters()" title="Desde" />
                  <input type="date" class="col-filter" [(ngModel)]="filter.to" (change)="applyFilters()" title="Hasta" />
                </div>

                <select *ngSwitchCase="'select'" class="col-filter" [(ngModel)]="filter.selected" (change)="applyFilters()">
                  <option value="">Todos</option>
                  <option *ngFor="let option of filterOptions[c.field]" [value]="option.value">{{ option.label }}</option>
                </select>

                <input *ngSwitchDefault type="text" class="col-filter" [(ngModel)]="filter.text" (input)="applyFilters()" placeholder="Buscar..." />
              </ng-container>
            </th>
          </tr>
        </thead>
        <tbody *ngIf="!groupByField">
          <tr *ngFor="let row of filteredRows">
            <td *ngFor="let c of result.columns">{{ format(row[c.field], c) }}</td>
          </tr>
          <tr *ngIf="filteredRows.length===0">
            <td [attr.colspan]="result.columns.length" class="no-data">Sin resultados con los filtros aplicados.</td>
          </tr>
        </tbody>
        <tbody *ngIf="groupByField">
          <ng-container *ngFor="let group of groupedView()">
            <tr class="group-header">
              <td [attr.colspan]="result.columns.length">
                <i class="fa fa-folder-open me-1"></i>
                <strong>{{ format(group.key, getColumnDef(groupByField)) }}</strong>
                <span class="group-count">({{ group.rows.length }} {{ group.rows.length === 1 ? 'fila' : 'filas' }})</span>
              </td>
            </tr>
            <tr *ngFor="let row of group.rows">
              <td *ngFor="let c of result.columns">{{ format(row[c.field], c) }}</td>
            </tr>
            <tr class="group-subtotal">
              <td *ngFor="let c of result.columns; let i = index" [class.measure-col]="c.type === 'measure'">
                <ng-container *ngIf="i === 0"><em>Subtotal</em></ng-container>
                <strong *ngIf="c.type === 'measure'">{{ format(group.subtotals[c.field], c) }}</strong>
                <ng-container *ngIf="i > 0 && c.type !== 'measure'">—</ng-container>
              </td>
            </tr>
          </ng-container>
          <tr *ngIf="filteredRows.length===0">
            <td [attr.colspan]="result.columns.length" class="no-data">Sin resultados con los filtros aplicados.</td>
          </tr>
        </tbody>
        <tfoot *ngIf="showTotals && filteredRows.length > 0">
          <tr class="totals-row">
            <td *ngFor="let c of result.columns; let i = index" [class.measure-col]="c.type === 'measure'">
              <ng-container *ngIf="i === 0">
                <strong>Total</strong>
                <small *ngIf="hasActiveFilters()" class="totals-hint"> (filtrado)</small>
              </ng-container>
              <ng-container *ngIf="c.type === 'measure'">
                <strong>{{ format(getColumnTotal(c.field), c) }}</strong>
              </ng-container>
              <ng-container *ngIf="i > 0 && c.type !== 'measure'">—</ng-container>
            </td>
          </tr>
        </tfoot>
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
        <tfoot *ngIf="showTotals && pivotData.rows.length > 0">
          <tr class="totals-row">
            <td *ngFor="let d of pivotData.rowDims; let i = index">
              <strong *ngIf="i === 0">Total</strong>
              <ng-container *ngIf="i > 0">—</ng-container>
            </td>
            <td *ngFor="let ck of pivotData.colKeys" class="measure-col">
              <strong>{{ format(getPivotColumnTotal(ck), pivotData.measureCols[0]) }}</strong>
            </td>
          </tr>
        </tfoot>
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
      .filter-range {
        display: grid;
        grid-template-columns: minmax(74px, 1fr) minmax(74px, 1fr);
        gap: 4px;
      }
      select.col-filter {
        min-width: 120px;
        background: #fff;
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
      .totals-row td {
        background: #f3f4f6;
        border-top: 2px solid #d1d5db;
        font-size: 13px;
        padding: 10px 12px;
        position: sticky;
        bottom: 0;
      }
      .totals-row .measure-col {
        text-align: right;
        color: #1f2937;
      }
      .totals-hint {
        color: #6b7280;
        font-weight: 400;
        font-size: 11px;
      }
      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .group-by-label {
        font-size: 12px;
        color: #374151;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 0;
      }
      .group-by-select {
        font-size: 12px;
        padding: 3px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: #fff;
      }
      .group-header td {
        background: #eef2ff;
        color: #1e40af;
        padding: 8px 12px;
        font-size: 13px;
        border-top: 1px solid #c7d2fe;
      }
      .group-count {
        color: #6b7280;
        font-weight: 400;
        margin-left: 8px;
        font-size: 11px;
      }
      .group-subtotal td {
        background: #fef3c7;
        font-size: 12px;
        padding: 6px 12px;
        border-bottom: 1px solid #fcd34d;
      }
      .group-subtotal .measure-col {
        text-align: right;
        color: #92400e;
      }
    `,
  ],
})
export class VizTableComponent {
  private _result: ReportResult | null = null;
  private _pivot = false;
  private readonly maxSelectOptions = 40;
  pivotData: PivotData | null = null;

  filterState: Record<string, ColumnFilterState> = {};
  filterOptions: Record<string, FilterOption[]> = {};
  filteredRows: Record<string, unknown>[] = [];
  sortField: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';

  /**
   * Mostrar fila de totales en el footer. Default true: las medidas suman/cuentan
   * automáticamente sobre las filas visibles (respeta filtros aplicados). Si las
   * medidas son `avg` o `percent`, sumar puede no ser semánticamente correcto —
   * la fila aún muestra el sum por simplicidad pero el cliente puede interpretar.
   * Request Harmony Lens: "Totalizar lo que están viendo en pantalla".
   */
  @Input() showTotals: boolean = true;

  /**
   * Campo dimension por el cual agrupar las filas. Si está activo, las filas
   * se agrupan + se muestra subtotal por grupo. Request Harmony Lens:
   * "Totalizar por los subfiltros".
   */
  groupByField: string | null = null;

  @Input() set pivot(v: boolean) {
    this._pivot = v;
    this.compute();
  }
  get pivot(): boolean { return this._pivot; }

  @Input() set result(r: ReportResult | null) {
    this._result = r;
    this.resetFilters();
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

    for (const [field, filter] of Object.entries(this.filterState)) {
      const col = colMap.get(field);
      if (!col || !this.hasFilterValue(filter)) {
        continue;
      }

      if (this.filterMode(col) === 'number') {
        const min = this.parseNumber(filter.min);
        const max = this.parseNumber(filter.max);
        rows = rows.filter((row) => {
          const n = this.parseNumber(row[field]);
          if (n === null) return false;
          return (min === null || n >= min) && (max === null || n <= max);
        });
        continue;
      }

      if (this.filterMode(col) === 'date') {
        const from = this.parseDate(filter.from, false);
        const to = this.parseDate(filter.to, true);
        rows = rows.filter((row) => {
          const time = this.parseDate(row[field], false);
          if (time === null) return false;
          return (from === null || time >= from) && (to === null || time <= to);
        });
        continue;
      }

      if (this.filterMode(col) === 'select') {
        rows = rows.filter((row) => this.optionValue(row[field]) === filter.selected);
        continue;
      }

      const q = (filter.text || '').trim().toLowerCase();
      rows = rows.filter((row) => {
        const v = row[field];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(q);
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
    this.resetFilters(false);
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filterState).some((filter) => this.hasFilterValue(filter));
  }

  /**
   * Suma una columna `measure` sobre las filas visibles (respeta filtros).
   * Para measures con agregación `avg`, `min`, `max`, `count_distinct` el sum
   * sigue mostrándose; el footer es "totalizador del subset visible" según WO.
   */
  getColumnTotal(field: string): number {
    let total = 0;
    for (const row of this.filteredRows) {
      const v = row[field];
      const n = Number(v);
      if (Number.isFinite(n)) total += n;
    }
    return total;
  }

  /**
   * Suma una columna del pivot (clave de columna) sobre todas las filas pivoteadas.
   */
  getPivotColumnTotal(colKey: string): number {
    if (!this.pivotData) return 0;
    let total = 0;
    for (const row of this.pivotData.rows) {
      const v = row.cells[colKey];
      const n = Number(v);
      if (Number.isFinite(n)) total += n;
    }
    return total;
  }

  /**
   * Columnas dimension disponibles para el dropdown de "agrupar por".
   */
  get dimensionColumns(): ReportColumn[] {
    return (this._result?.columns || []).filter((c) => c.type === 'dimension');
  }

  setGroupBy(field: string | null): void {
    this.groupByField = field || null;
  }

  /** Lookup de col-def por field, para el formato del header de grupo. */
  getColumnDef(field: string | null): ReportColumn | undefined {
    if (!field) return undefined;
    return this._result?.columns.find((c) => c.field === field);
  }

  /**
   * Agrupa `filteredRows` por el `groupByField` y calcula subtotales por grupo
   * sobre las columnas measure. Mantiene orden por valor de grupo (alfabético/numérico).
   */
  groupedView(): Array<{ key: unknown; rows: Record<string, unknown>[]; subtotals: Record<string, number> }> {
    if (!this.groupByField || !this._result) return [];
    const field = this.groupByField;
    const measureFields = this._result.columns.filter((c) => c.type === 'measure').map((c) => c.field);
    const groups = new Map<string, { key: unknown; rows: Record<string, unknown>[]; subtotals: Record<string, number> }>();
    for (const row of this.filteredRows) {
      const k = row[field];
      const kStr = k === null || k === undefined ? '(sin valor)' : String(k);
      let g = groups.get(kStr);
      if (!g) {
        g = { key: k, rows: [], subtotals: {} };
        measureFields.forEach((f) => (g!.subtotals[f] = 0));
        groups.set(kStr, g);
      }
      g.rows.push(row);
      for (const f of measureFields) {
        const n = Number(row[f]);
        if (Number.isFinite(n)) g.subtotals[f] += n;
      }
    }
    return Array.from(groups.values()).sort((a, b) => String(a.key ?? '').localeCompare(String(b.key ?? '')));
  }

  filterMode(c: ReportColumn): FilterMode {
    if (c.type === 'measure' || c.dataType === 'number') return 'number';
    if (c.dataType === 'date') return 'date';
    if (c.dataType === 'boolean' || this.filterOptions[c.field]?.length > 0) return 'select';
    return 'text';
  }

  private compute(): void {
    if (!this._result || !this._pivot) {
      this.pivotData = null;
      return;
    }
    const dims = this._result.columns.filter((c) => c.type === 'dimension');
    const measures = this._result.columns.filter((c) => c.type === 'measure');

    if (dims.length === 1 && measures.length > 0) {
      const dimCol = dims[0];
      const measureCol = measures[0];
      const colKeys = Array.from(new Set(this._result.rows.map((r) => String(r[dimCol.field] ?? ''))));
      colKeys.sort();
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
      return '-';
    }
    if (!col) {
      // Sin metadata de columna: detectar booleano nativo igual.
      if (value === true || value === 'true') return 'Sí';
      if (value === false || value === 'false') return 'No';
      return String(value);
    }
    // Boolean en español (request Harmony Lens: contabilizado/cuadrado/anulado/esCliente etc.)
    if (col.dataType === 'boolean' || value === true || value === false) {
      if (value === true || value === 'true' || value === 1 || value === '1') return 'Sí';
      if (value === false || value === 'false' || value === 0 || value === '0') return 'No';
      return String(value);
    }
    if (col.dataType === 'date') {
      const s = String(value);
      const dayM = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dayM) return `${dayM[3]}/${dayM[2]}/${dayM[1]}`;
      const monM = s.match(/^(\d{4})-(\d{2})$/);
      if (monM) return `${monM[2]}/${monM[1]}`;
      return s;
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

  private resetFilters(rebuildOptions = true): void {
    if (rebuildOptions) {
      this.buildFilterOptions();
    }
    const next: Record<string, ColumnFilterState> = {};
    for (const col of this._result?.columns || []) {
      next[col.field] = {};
    }
    this.filterState = next;
  }

  private buildFilterOptions(): void {
    const options: Record<string, FilterOption[]> = {};
    if (!this._result) {
      this.filterOptions = options;
      return;
    }

    for (const col of this._result.columns) {
      if (col.type === 'measure' || col.dataType === 'date' || col.dataType === 'number') {
        continue;
      }

      const values = new Map<string, string>();
      for (const row of this._result.rows) {
        const rawValue = row[col.field];
        const key = this.optionValue(rawValue);
        if (!values.has(key)) {
          values.set(key, this.optionLabel(rawValue));
        }
        if (col.dataType !== 'boolean' && values.size > this.maxSelectOptions) {
          break;
        }
      }

      if (col.dataType === 'boolean' || values.size <= this.maxSelectOptions) {
        options[col.field] = Array.from(values.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
      }
    }

    this.filterOptions = options;
  }

  private hasFilterValue(filter: ColumnFilterState): boolean {
    return [
      filter.text,
      filter.selected,
      filter.min,
      filter.max,
      filter.from,
      filter.to,
    ].some((value) => (value || '').trim() !== '');
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const n = Number(String(value).replace(/,/g, ''));
    return Number.isNaN(n) ? null : n;
  }

  private parseDate(value: unknown, endOfDay: boolean): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const raw = String(value);
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`
      : raw;
    const time = new Date(normalized).getTime();
    return Number.isNaN(time) ? null : time;
  }

  private optionValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '__empty__';
    }
    return String(value);
  }

  private optionLabel(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return 'Sin valor';
    }
    if (value === true || value === 'true') {
      return 'Si';
    }
    if (value === false || value === 'false') {
      return 'No';
    }
    return String(value);
  }
}
