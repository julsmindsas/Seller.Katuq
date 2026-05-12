import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ReportsService } from '../../../shared/services/dashboard/reports.service';
import { SOURCE_CATALOG, findDimension, findMeasure, findSource } from '../model/source-catalog';
import {
  DimensionDef,
  DimensionRef,
  FilterClause,
  MeasureAgg,
  MeasureDef,
  MeasureRef,
  ReportResult,
  ReportSpec,
  SavedReport,
  SourceDef,
  VizType,
  DateGranularity,
} from '../model/report-spec.interfaces';

interface FieldRef {
  id: string;
  label: string;
  type: 'dimension' | 'measure';
  dataType: string;
  agg?: MeasureAgg;
  granularity?: DateGranularity;
  group?: string;
}

@Component({
  selector: 'app-report-builder',
  templateUrl: './report-builder.component.html',
  styleUrls: ['./report-builder.component.scss'],
})
export class ReportBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  catalog: SourceDef[] = SOURCE_CATALOG;
  source: SourceDef | null = null;
  reportName = 'Nuevo reporte';
  reportId: string | null = null;

  rows: FieldRef[] = [];
  cols: FieldRef[] = [];
  values: FieldRef[] = [];
  filters: FilterClause[] = [];

  vizType: VizType = 'table';
  vizOptions: VizType[] = ['table', 'pivot', 'bar', 'line', 'pie', 'kpi'];
  activeVizTypes: Set<VizType> = new Set(['table']);

  // Filtro global de fecha
  dateFrom: string = '';
  dateTo: string = '';

  result: ReportResult | null = null;
  running = false;
  saving = false;
  errorMsg: string | null = null;

  readonly fieldDropIds = ['rows-zone', 'cols-zone', 'values-zone', 'palette', 'palette-m'];

  // Listas computadas para el CDK drag — se recalculan al cambiar de source
  dimFields: FieldRef[] = [];
  measFields: FieldRef[] = [];

  constructor(
    private reportsService: ReportsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.selectSource(this.catalog[0]);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReport(id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectSource(s: SourceDef): void {
    if (this.source?.id === s.id) {
      return;
    }
    this.source = s;
    this.rows = [];
    this.cols = [];
    this.values = [];
    this.filters = [];
    this.result = null;
    this.dimFields = s.dimensions.map(d => this.asFieldFromDim(d));
    this.measFields = s.measures.map(m => this.asFieldFromMeasure(m));
  }

  selectSourceById(id: string): void {
    const found = this.catalog.find((s) => s.id === id);
    if (found) {
      this.selectSource(found);
    }
  }

  asFieldFromDim(d: DimensionDef): FieldRef {
    return {
      id: d.id,
      label: d.label,
      type: 'dimension',
      dataType: d.type,
      granularity: d.type === 'date' ? d.granularities?.[0] || 'day' : undefined,
      group: d.group,
    };
  }

  asFieldFromMeasure(m: MeasureDef): FieldRef {
    return {
      id: m.id,
      label: m.label,
      type: 'measure',
      dataType: 'number',
      agg: m.aggs[0],
      group: m.group,
    };
  }

  addToZone(zone: 'rows' | 'cols' | 'values', field: FieldRef): void {
    const target = this[zone];
    if (target.find((f) => f.id === field.id && f.agg === field.agg)) {
      return;
    }
    target.push({ ...field });
  }

  removeFromZone(zone: 'rows' | 'cols' | 'values', idx: number): void {
    this[zone].splice(idx, 1);
  }

  drop(event: CdkDragDrop<FieldRef[]>, zone: 'rows' | 'cols' | 'values' | 'palette'): void {
    if (zone === 'palette') {
      return;
    }
    const arr = this[zone];
    if (event.previousContainer === event.container) {
      moveItemInArray(arr, event.previousIndex, event.currentIndex);
      return;
    }
    const item = event.previousContainer.data?.[event.previousIndex] as FieldRef;
    if (!item) {
      return;
    }
    if (zone === 'values' && item.type !== 'measure') {
      return;
    }
    if ((zone === 'rows' || zone === 'cols') && item.type !== 'dimension') {
      return;
    }
    this.addToZone(zone, item);
  }

  toggleViz(v: VizType): void {
    if (this.activeVizTypes.has(v)) {
      if (this.activeVizTypes.size > 1) {
        this.activeVizTypes.delete(v);
        if (this.vizType === v) {
          this.vizType = this.activeVizTypes.values().next().value;
        }
      }
    } else {
      this.activeVizTypes.add(v);
    }
    this.vizType = v;
  }

  changeAgg(field: FieldRef, agg: MeasureAgg): void {
    field.agg = agg;
  }

  changeGranularity(field: FieldRef, granularity: DateGranularity): void {
    field.granularity = granularity;
  }

  availableAggs(field: FieldRef): MeasureAgg[] {
    if (!this.source) {
      return [];
    }
    return findMeasure(this.source.id, field.id)?.aggs || ['sum'];
  }

  availableGranularities(field: FieldRef): DateGranularity[] {
    if (!this.source) {
      return [];
    }
    return findDimension(this.source.id, field.id)?.granularities || ['day'];
  }

  buildSpec(): ReportSpec | null {
    if (!this.source) {
      return null;
    }
    if (this.values.length === 0 && !this.activeVizTypes.has('table')) {
      this.errorMsg = 'Agrega al menos una medida en Valores.';
      return null;
    }

    // Construir filtros incluyendo rango de fecha global
    const allFilters: FilterClause[] = [...this.filters];
    if (this.dateFrom || this.dateTo) {
      const dateField = this.source.dimensions.find(d => d.type === 'date');
      if (dateField) {
        if (this.dateFrom) {
          allFilters.push({ field: dateField.id, op: 'gte', value: this.dateFrom });
        }
        if (this.dateTo) {
          allFilters.push({ field: dateField.id, op: 'lte', value: this.dateTo + 'T23:59:59.999Z' });
        }
      }
    }

    const hasKpi = this.activeVizTypes.has('kpi');
    return {
      source: this.source.id,
      rows: this.rows.map<DimensionRef>((r) => ({ id: r.id, granularity: r.granularity })),
      cols: this.cols.map<DimensionRef>((c) => ({ id: c.id, granularity: c.granularity })),
      values: this.values.map<MeasureRef>((v) => ({ id: v.id, agg: v.agg || 'sum' })),
      filters: allFilters,
      limit: hasKpi && this.activeVizTypes.size === 1 ? 1 : 1000,
    };
  }

  run(): void {
    this.errorMsg = null;
    const spec = this.buildSpec();
    console.log('[ReportBuilder] spec:', spec);
    if (!spec) {
      console.warn('[ReportBuilder] buildSpec() returned null');
      return;
    }
    this.running = true;
    console.log('[ReportBuilder] Calling runQuery...');
    this.reportsService
      .runQuery(spec)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error('[ReportBuilder] Query error:', err);
          this.errorMsg = err?.error?.error || err?.error?.message || err?.message || 'Error al ejecutar la consulta.';
          return of(null);
        }),
        finalize(() => (this.running = false))
      )
      .subscribe((res) => {
        console.log('[ReportBuilder] Query result:', res);
        this.result = res;
      });
  }

  save(): void {
    if (!this.source) {
      return;
    }
    const spec = this.buildSpec();
    if (!spec) {
      return;
    }
    this.saving = true;
    const userStr = localStorage.getItem('user');
    let ownerEmail = '';
    let ownerCompany = '';
    try {
      const u = userStr ? JSON.parse(userStr) : null;
      ownerEmail = u?.email || '';
      ownerCompany = u?.company || '';
    } catch {
      /* noop */
    }

    const report: SavedReport = {
      id: this.reportId || undefined,
      name: this.reportName,
      source: this.source.id,
      spec,
      viz: { type: this.vizType },
      ownerEmail,
      ownerCompany,
    };

    this.reportsService
      .save(report)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          Swal.fire('Error', err?.error?.message || 'No se pudo guardar.', 'error');
          return of(null);
        }),
        finalize(() => (this.saving = false))
      )
      .subscribe((saved) => {
        if (!saved) {
          return;
        }
        this.reportId = saved.id || this.reportId;
        Swal.fire({ icon: 'success', title: 'Reporte guardado', timer: 1500, showConfirmButton: false });
      });
  }

  exportCsv(): void {
    if (!this.result) {
      return;
    }
    const headers = this.result.columns.map((c) => c.label).join(',');
    const lines = this.result.rows.map((r) =>
      this.result!.columns.map((c) => JSON.stringify(r[c.field] ?? '')).join(',')
    );
    const csv = [headers, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.reportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goHome(): void {
    this.router.navigate(['/dashboards']);
  }

  private loadReport(id: string): void {
    this.reportsService
      .getById(id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe((r) => {
        if (!r) {
          return;
        }
        const src = findSource(r.source);
        if (!src) {
          return;
        }
        this.source = src;
        this.reportName = r.name;
        this.reportId = r.id || null;
        this.vizType = r.viz?.type || 'table';
        this.rows = (r.spec.rows || []).map((d) => this.dimRefToField(d));
        this.cols = (r.spec.cols || []).map((d) => this.dimRefToField(d));
        this.values = (r.spec.values || []).map((m) => this.measureRefToField(m));
        this.filters = r.spec.filters || [];
        this.run();
      });
  }

  private dimRefToField(ref: DimensionRef): FieldRef {
    const d = findDimension(this.source!.id, ref.id);
    return {
      id: ref.id,
      label: d?.label || ref.id,
      type: 'dimension',
      dataType: d?.type || 'string',
      granularity: ref.granularity,
      group: d?.group,
    };
  }

  private measureRefToField(ref: MeasureRef): FieldRef {
    const m = findMeasure(this.source!.id, ref.id);
    return {
      id: ref.id,
      label: m?.label || ref.id,
      type: 'measure',
      dataType: 'number',
      agg: ref.agg,
      group: m?.group,
    };
  }
}
