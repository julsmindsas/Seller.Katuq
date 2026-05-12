import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  exporting = false;
  errorMsg: string | null = null;

  /** Contenedor de la visualización (table + chart + kpi). Capturable a imagen/PDF. */
  @ViewChild('vizContainer', { read: ElementRef }) vizContainer?: ElementRef<HTMLElement>;

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

    // Construir filtros incluyendo rango de fecha global.
    // El input <type="date"> devuelve "YYYY-MM-DD" (sin hora). Lo expandimos
    // a ISO con hora explícita para que `gte` incluya desde las 00:00:00 del
    // primer día y `lte` cubra hasta el final del último día. El backend
    // (firestore.engine.coerceFilterValue) además convierte el string a Date
    // antes de Firestore.where() para que la comparación contra Timestamp
    // funcione (sin esto la comparación string vs Timestamp falla silencioso).
    const allFilters: FilterClause[] = [...this.filters];
    if (this.dateFrom || this.dateTo) {
      const dateField = this.source.dimensions.find(d => d.type === 'date');
      if (dateField) {
        if (this.dateFrom) {
          allFilters.push({ field: dateField.id, op: 'gte', value: this.dateFrom + 'T00:00:00.000Z' });
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
      viz: {
        type: this.vizType,
        activeTypes: [...this.activeVizTypes],
      },
      // Persistir el rango de fecha del filtro global para que al reabrir el
      // reporte los inputs se restauren con los mismos valores.
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
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

  /**
   * Captura el área de visualización (tabla + gráficas + KPIs) como Canvas
   * usando html2canvas. Dynamic import para no inflar el bundle inicial.
   */
  private async captureVizCanvas(): Promise<HTMLCanvasElement | null> {
    if (!this.result || !this.vizContainer) {
      return null;
    }
    const { default: html2canvas } = await import('html2canvas');
    // Esperar 1 tick para que ECharts termine de pintar antes de capturar.
    await new Promise((r) => setTimeout(r, 100));
    const el = this.vizContainer.nativeElement;
    return await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 2, // doble resolución para que el PDF/PNG no salga pixelado
      useCORS: true,
      logging: false,
    });
  }

  async exportPng(): Promise<void> {
    if (!this.result || this.exporting) {
      return;
    }
    this.exporting = true;
    try {
      const canvas = await this.captureVizCanvas();
      if (!canvas) {
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.reportName}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('[ReportBuilder] Error exportPng:', err);
      Swal.fire('Error', 'No se pudo exportar la imagen.', 'error');
    } finally {
      this.exporting = false;
    }
  }

  async exportPdf(): Promise<void> {
    if (!this.result || this.exporting) {
      return;
    }
    this.exporting = true;
    try {
      const canvas = await this.captureVizCanvas();
      if (!canvas) {
        return;
      }
      const { default: jsPDF } = await import('jspdf');
      // PDF landscape A4 (842 × 595 puntos)
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;

      // Header del PDF
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(this.reportName, margin, margin + 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const subtitle: string[] = [];
      subtitle.push(`Fuente: ${this.source?.label || this.source?.id || '—'}`);
      if (this.dateFrom || this.dateTo) {
        subtitle.push(`Rango: ${this.dateFrom || '—'} a ${this.dateTo || '—'}`);
      }
      subtitle.push(`Generado: ${new Date().toLocaleString('es-CO')}`);
      pdf.text(subtitle.join('   ·   '), margin, margin + 24);

      // Imagen del viz, escalada para caber en la página debajo del header
      const headerSpace = 48;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = Math.min(canvas.height * (imgWidth / canvas.width), pageHeight - margin * 2 - headerSpace);
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', margin, margin + headerSpace, imgWidth, imgHeight);

      pdf.save(`${this.reportName}.pdf`);
    } catch (err) {
      console.error('[ReportBuilder] Error exportPdf:', err);
      Swal.fire('Error', 'No se pudo exportar el PDF.', 'error');
    } finally {
      this.exporting = false;
    }
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
        // Restaurar multi-selección de visualizaciones. Fallback al viz.type
        // como único elemento si el reporte fue guardado antes del fix.
        const activeTypes = r.viz?.activeTypes && r.viz.activeTypes.length > 0
          ? r.viz.activeTypes
          : [this.vizType];
        this.activeVizTypes = new Set<VizType>(activeTypes);
        // Restaurar rango de fechas global
        this.dateFrom = r.dateFrom || '';
        this.dateTo = r.dateTo || '';
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
