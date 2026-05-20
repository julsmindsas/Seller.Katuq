import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { environment } from '../../../../environments/environment';
import { ReportsService } from '../../../shared/services/dashboard/reports.service';
import { SOURCE_CATALOG, findDimension, findMeasure, findSource } from '../model/source-catalog';
import {
  DimensionDef,
  DimensionRef,
  FilterClause,
  MeasureAgg,
  MeasureDef,
  MeasureRef,
  ReportColumn,
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

  // Permisos del reporte
  isPublic: boolean = false;
  visibleToUsers: string[] = [];
  visibleToRoles: string[] = [];

  result: ReportResult | null = null;
  running = false;
  saving = false;
  exporting = false;
  publishing = false;
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
    // Cargar lista de sources visibles desde el backend (filtra por integraciones
    // activas de la empresa). El backend retorna IDs que aplica como whitelist
    // sobre el catálogo hardcoded. Si la llamada falla, dejamos el catálogo completo.
    this.reportsService.getSources()
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe((backendSources) => {
        if (backendSources && Array.isArray(backendSources) && backendSources.length > 0) {
          const allowedIds = new Set(backendSources.map((s) => s.id));
          this.catalog = SOURCE_CATALOG.filter((s) => allowedIds.has(s.id));
        }
        if (this.catalog.length === 0) this.catalog = SOURCE_CATALOG;
        if (!this.source) this.selectSource(this.catalog[0]);
      });

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
      isPublic: this.isPublic,
      visibleToUsers: this.visibleToUsers.length ? this.visibleToUsers : undefined,
      visibleToRoles: this.visibleToRoles.length ? this.visibleToRoles : undefined,
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

  async exportExcel(): Promise<void> {
    if (!this.result || this.exporting) return;
    this.exporting = true;
    Swal.fire({ title: 'Generando Excel…', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Katuq';
      const cols = this.result.columns;

      // ── Hoja de datos ──────────────────────────────────────────
      const ws = wb.addWorksheet('Datos');

      // Cabecera estilizada
      ws.addRow(cols.map(c => c.label));
      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } } };
      });
      headerRow.height = 22;
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      // Filas de datos con colores alternos
      this.result.rows.forEach((row, rowIdx) => {
        const values = cols.map(col => {
          const val = row[col.field];
          if (val === null || val === undefined || val === '') return '';
          if (col.dataType === 'date') return this.formatDateStr(String(val));
          const n = Number(val);
          if (!Number.isNaN(n) && (col.type === 'measure' || col.dataType === 'number')) return n;
          return String(val);
        });
        const dataRow = ws.addRow(values);
        const bgColor = rowIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFF';
        dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          const col = cols[colIdx - 1];
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.alignment = { horizontal: col?.type === 'measure' ? 'right' : 'left', vertical: 'middle' };
          if (col?.format === 'currency') cell.numFmt = '"$"#,##0';
          else if (col?.type === 'measure') cell.numFmt = '#,##0.##';
        });
        dataRow.height = 18;
      });

      // Anchos de columna automáticos (máx 40, mín 10)
      cols.forEach((col, i) => {
        const maxLen = Math.max(
          col.label.length,
          ...this.result!.rows.slice(0, 50).map(r => String(r[col.field] ?? '').length)
        );
        ws.getColumn(i + 1).width = Math.min(40, Math.max(10, maxLen + 2));
      });

      // ── Hoja única de gráficas ─────────────────────────────────
      const hasCharts = this.activeVizTypes.has('bar') || this.activeVizTypes.has('line') || this.activeVizTypes.has('pie');
      if (hasCharts && this.vizContainer) {
        const { default: html2canvas } = await import('html2canvas');
        await new Promise(r => setTimeout(r, 600));
        const el = this.vizContainer.nativeElement as HTMLElement;
        const chartHosts = Array.from(el.querySelectorAll<HTMLElement>('.chart-host'));

        const activeChartTypes = (['bar', 'line', 'pie'] as VizType[])
          .filter(t => this.activeVizTypes.has(t));
        const chartLabels: Record<string, string> = { bar: 'Barras', line: 'Linea', pie: 'Pastel' };

        const grafSheet = wb.addWorksheet('Graficas');

        // Geometría fija de la hoja
        const COLS      = 14;   // columnas visibles
        const COL_W     = 10;   // ancho de columna (unidades Excel ≈ 70 px)
        const COL_W_PX  = 70;   // píxeles por columna (aproximado)
        const ROW_H_PT  = 18;   // altura de fila en puntos
        const ROW_H_PX  = Math.round(ROW_H_PT * 96 / 72); // ≈ 24 px por fila

        for (let c = 1; c <= COLS; c++) grafSheet.getColumn(c).width = COL_W;

        const IMG_W_PX = COLS * COL_W_PX; // ancho total de la imagen ≈ 980 px
        let rowCursor = 0; // fila actual en índice 0-based (para tl.row)

        for (let ci = 0; ci < Math.min(activeChartTypes.length, chartHosts.length); ci++) {
          const label   = chartLabels[activeChartTypes[ci]] ?? `Grafica ${ci + 1}`;
          const chartEl = chartHosts[ci];

          // — Fila de título
          const titleRow = grafSheet.getRow(rowCursor + 1); // exceljs es 1-indexed
          titleRow.height = ROW_H_PT + 4;
          const cell = titleRow.getCell(1);
          cell.value = label;
          cell.font  = { bold: true, size: 12, color: { argb: 'FF2563EB' } };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
          // Merge el título en todo el ancho
          grafSheet.mergeCells(rowCursor + 1, 1, rowCursor + 1, COLS);
          rowCursor++;

          // — Capturar gráfica
          const canvas = await html2canvas(chartEl, {
            backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false,
          });
          const b64    = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
          const imgBuf = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
          const imgH   = Math.round(IMG_W_PX * (canvas.height / canvas.width));

          // — Insertar imagen en la hoja
          const imgId = wb.addImage({ buffer: imgBuf, extension: 'png' });
          grafSheet.addImage(imgId, {
            tl: { col: 0, row: rowCursor } as any,
            ext: { width: IMG_W_PX, height: imgH },
          });

          // — Definir alturas de las filas que cubre la imagen
          const imgRowSpan = Math.ceil(imgH / ROW_H_PX);
          for (let r = rowCursor + 1; r <= rowCursor + imgRowSpan; r++) {
            grafSheet.getRow(r).height = ROW_H_PT;
          }
          rowCursor += imgRowSpan;

          // — Fila de separación entre gráficas (excepto la última)
          if (ci < activeChartTypes.length - 1) {
            grafSheet.getRow(rowCursor + 1).height = ROW_H_PT;
            rowCursor += 2;
          }
        }
      }

      // ── Hoja pivot si está activa ──────────────────────────────
      if (this.activeVizTypes.has('pivot')) {
        const pvSheet = wb.addWorksheet('Pivot');
        pvSheet.addRow(cols.map(c => c.label));
        const pvHeader = pvSheet.getRow(1);
        pvHeader.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        });
        this.result.rows.forEach(row => {
          pvSheet.addRow(cols.map(col => {
            const val = row[col.field];
            if (val === null || val === undefined || val === '') return '';
            const n = Number(val);
            return !Number.isNaN(n) && col.type === 'measure' ? n : String(val ?? '');
          }));
        });
      }

      // ── Descargar ──────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.reportName}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ReportBuilder] Error exportExcel:', err);
      Swal.fire('Error', 'No se pudo exportar el Excel.', 'error');
    } finally {
      Swal.close();
      this.exporting = false;
    }
  }

  private async captureVizCanvas(): Promise<HTMLCanvasElement | null> {
    if (!this.result || !this.vizContainer) return null;
    const { default: html2canvas } = await import('html2canvas');
    await new Promise(r => setTimeout(r, 300));
    return this.captureExpanded(this.vizContainer.nativeElement, html2canvas);
  }

  private async captureExpanded(
    el: HTMLElement,
    html2canvas: (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>
  ): Promise<HTMLCanvasElement> {
    type S = { t: HTMLElement; ov: string; h: string; mh: string };
    const saved: S[] = [];
    const expand = (t: HTMLElement) => {
      saved.push({ t, ov: t.style.overflow, h: t.style.height, mh: t.style.maxHeight });
      t.style.overflow  = 'visible';
      t.style.height    = t.scrollHeight + 'px';
      t.style.maxHeight = 'none';
    };
    // Expand el target y todos los ancestros que recorten overflow
    expand(el);
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
      const cs = window.getComputedStyle(node);
      if (['hidden', 'auto', 'scroll'].includes(cs.overflow) ||
          ['hidden', 'auto', 'scroll'].includes(cs.overflowY)) {
        expand(node);
      }
      node = node.parentElement;
    }
    await new Promise(r => setTimeout(r, 80));
    try {
      return await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
    } finally {
      saved.forEach(s => { s.t.style.overflow = s.ov; s.t.style.height = s.h; s.t.style.maxHeight = s.mh; });
    }
  }

  async exportPng(): Promise<void> {
    if (!this.result || this.exporting) return;
    this.exporting = true;
    Swal.fire({ title: 'Generando imagen…', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const canvas = await this.captureVizCanvas();
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
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
      Swal.close();
      this.exporting = false;
    }
  }

  async exportPdf(): Promise<void> {
    if (!this.result || this.exporting) return;
    this.exporting = true;
    Swal.fire({ title: 'Generando PDF…', html: 'Capturando visualizaciones…', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();   // 841.89
      const H = pdf.internal.pageSize.getHeight();  // 595.28
      const M = 24;
      const HEADER_H = 90;
      const FOOTER_H = 22;

      const drawPageHeader = () => {
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, W, 52, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        // Truncar título si es muy largo para que no solape con "KATUQ"
        const titleMax = W - M * 2 - 60;
        const titleLines = pdf.splitTextToSize(this.reportName, titleMax);
        pdf.text(titleLines[0], M, 33);
        pdf.setFontSize(10);
        pdf.setTextColor(191, 219, 254);
        pdf.text('KATUQ', W - M - 36, 33);

        pdf.setFillColor(239, 246, 255);
        pdf.rect(0, 52, W, 28, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 64, 175);
        const metaParts: string[] = [`Fuente: ${this.source?.label || '-'}`];
        if (this.dateFrom || this.dateTo) metaParts.push(`Periodo: ${this.dateFrom || '-'} al ${this.dateTo || '-'}`);
        if (this.result?.meta) {
          const { totalRows, totalDocsScanned, totalDocsAfterFilter } = this.result.meta as any;
          const filtered = totalDocsAfterFilter != null && totalDocsAfterFilter !== totalDocsScanned
            ? `${totalRows} filas (de ${totalDocsAfterFilter} filtrados / ${totalDocsScanned} total)`
            : `${totalRows} filas`;
          metaParts.push(filtered);
        }
        metaParts.push(`Generado: ${new Date().toLocaleString('es-CO')}`);
        // Usar solo ASCII: ni flechas ni rayas que Helvetica no soporta
        const metaStr = metaParts.join('   |   ');
        const metaMaxW = W - M * 2;
        // Medir manualmente para truncar sin splitTextToSize (que falla con ciertos chars)
        let metaDisplay = metaStr;
        while (pdf.getTextWidth(metaDisplay) > metaMaxW && metaDisplay.length > 10) {
          metaDisplay = metaDisplay.slice(0, -4) + '...';
        }
        pdf.text(metaDisplay, M, 70);
        pdf.setDrawColor(219, 234, 254);
        pdf.line(M, 82, W - M, 82);
      };

      const drawPageFooter = () => {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, H - FOOTER_H, W, FOOTER_H, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.line(0, H - FOOTER_H, W, H - FOOTER_H);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text('Katuq · Reportes Inteligentes', M, H - 7);
        // El número de página se añade al final cuando se conoce el total
      };

      drawPageHeader();
      let curY = HEADER_H;

      const hasKpi = this.activeVizTypes.has('kpi');

      // Gráficas: capturar cada .chart-host individualmente para evitar recortes por overflow
      const hasChart = this.activeVizTypes.has('bar') || this.activeVizTypes.has('line') || this.activeVizTypes.has('pie');
      const hasTable = this.activeVizTypes.has('table') || this.activeVizTypes.has('pivot');
      if (hasChart && this.vizContainer) {
        const { default: html2canvas } = await import('html2canvas');
        // Dar tiempo a ECharts para pintar todas las gráficas activas
        await new Promise(r => setTimeout(r, 600));
        const el = this.vizContainer.nativeElement as HTMLElement;
        const chartHosts = Array.from(el.querySelectorAll<HTMLElement>('.chart-host'));

        // Máximo alto de contenido en una página limpia
        const maxContentH = H - HEADER_H - FOOTER_H - 10;

        for (const chartEl of chartHosts) {
          const chartCanvas = await html2canvas(chartEl, {
            backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false,
          });

          const cW = chartCanvas.width;
          const cH = chartCanvas.height;
          const pdfImgW = W - M * 2;

          // Altura en PDF manteniendo la proporción original
          let imgW = pdfImgW;
          let imgH = imgW * (cH / cW);

          // Si la imagen es más alta que toda una página de contenido, escalarla para que entre
          if (imgH > maxContentH) {
            imgH = maxContentH;
            imgW = imgH * (cW / cH);
          }

          // Si no cabe en el espacio restante de esta página, pasar a una nueva
          const availNow = H - curY - FOOTER_H - 10;
          if (imgH > availNow) {
            drawPageFooter(); pdf.addPage(); drawPageHeader(); curY = HEADER_H;
          }

          // Centrar horizontalmente cuando el ancho se redujo por la escala
          const xOffset = M + (pdfImgW - imgW) / 2;
          pdf.addImage(chartCanvas.toDataURL('image/png'), 'PNG', xOffset, curY, imgW, imgH);
          curY += imgH + 12;
        }
      }

      // Tabla de datos real con autoTable
      if (hasTable && this.result.rows.length > 0) {
        if (hasChart && (H - curY - FOOTER_H) < 80) {
          drawPageFooter(); pdf.addPage(); drawPageHeader(); curY = HEADER_H;
        }
        const cols = this.result.columns;
        const tableW = W - M * 2;
        autoTable(pdf, {
          head: [cols.map(c => c.label)],
          body: this.result.rows.map(row => cols.map(col => this.pdfFormatValue(row[col.field], col))),
          startY: curY,
          margin: { top: HEADER_H, bottom: FOOTER_H + 6, left: M, right: M },
          tableWidth: tableW,
          styles: { fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }, overflow: 'linebreak', textColor: [31, 41, 55] as any, lineColor: [226, 232, 240] as any, lineWidth: 0.3 },
          headStyles: { fillColor: [37, 99, 235] as any, textColor: [255, 255, 255] as any, fontStyle: 'bold', fontSize: 8.5, cellPadding: { top: 6, bottom: 6, left: 6, right: 6 } },
          alternateRowStyles: { fillColor: [248, 250, 252] as any },
          columnStyles: this.buildPdfColumnStyles(cols, tableW),
          didDrawCell: (data: any) => {
            if (data.column.index < cols.length - 1) {
              const x = data.cell.x + data.cell.width;
              const isHead = data.section === 'head';
              pdf.setDrawColor(isHead ? 99 : 209, isHead ? 144 : 213, isHead ? 255 : 219);
              pdf.setLineWidth(0.3);
              pdf.line(x, data.cell.y, x, data.cell.y + data.cell.height);
            }
          },
          didDrawPage: (data: any) => {
            if (data.pageNumber > 1) drawPageHeader();
            drawPageFooter();
          },
        });
      } else {
        drawPageFooter();
      }

      // KPI cards al final del PDF
      if (hasKpi && this.result.rows.length > 0) {
        const measCols = this.result.columns.filter(c => c.type === 'measure');
        const firstRow = this.result.rows[0];
        const kpiItems = measCols.map(col => ({ label: col.label, value: this.pdfFormatValue(firstRow[col.field], col) }));
        const count = Math.min(kpiItems.length, 4);
        const kpiW = (W - M * 2 - (count - 1) * 10) / count;

        // Si no caben en el espacio restante, agregar nueva página
        if (H - curY - FOOTER_H - 10 < 66) {
          drawPageFooter(); pdf.addPage(); drawPageHeader(); curY = HEADER_H;
        }

        kpiItems.slice(0, count).forEach((kpi, i) => {
          const x = M + i * (kpiW + 10);
          pdf.setFillColor(255, 255, 255); pdf.setDrawColor(229, 231, 235);
          pdf.rect(x, curY, kpiW, 54, 'FD');
          pdf.setFillColor(37, 99, 235); pdf.rect(x, curY, 4, 54, 'F');

          // Label: uppercase, truncado al ancho de la tarjeta
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(107, 114, 128);
          const labelFit = pdf.splitTextToSize(kpi.label.toUpperCase(), kpiW - 20);
          pdf.text(labelFit[0], x + 12, curY + 16);

          // Valor: font size reducido automáticamente si el texto es largo
          pdf.setTextColor(17, 24, 39);
          const valueMaxW = kpiW - 20;
          let valueFontSize = 15;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(valueFontSize);
          while (pdf.getTextWidth(kpi.value) > valueMaxW && valueFontSize > 8) {
            valueFontSize -= 1;
            pdf.setFontSize(valueFontSize);
          }
          pdf.text(kpi.value, x + 12, curY + 40);
        });
        curY += 66;

        // Si quedó espacio sin footer en esta última página, dibujarlo
        drawPageFooter();
      }

      // Añadir número de página a todas las páginas ahora que se conoce el total
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`${p} / ${totalPages}`, W - M, H - 7, { align: 'right' });
      }

      pdf.save(`${this.reportName}.pdf`);
    } catch (err) {
      console.error('[ReportBuilder] Error exportPdf:', err);
      Swal.fire('Error', 'No se pudo exportar el PDF.', 'error');
    } finally {
      Swal.close();
      this.exporting = false;
    }
  }

  private formatDateStr(s: string): string {
    const dayM = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dayM) return `${dayM[3]}/${dayM[2]}/${dayM[1]}`;
    const monM = s.match(/^(\d{4})-(\d{2})$/);
    if (monM) return `${monM[2]}/${monM[1]}`;
    return s;
  }

  private pdfFormatValue(value: unknown, col: ReportColumn): string {
    if (value === null || value === undefined || value === '') return '—';
    if (col.dataType === 'date') return this.formatDateStr(String(value));
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    if (col.format === 'currency') return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    if (col.format === 'percent') return `${(n * 100).toFixed(2)}%`;
    if (col.type === 'measure') return new Intl.NumberFormat('es-CO').format(n);
    return String(value);
  }

  private buildPdfColumnStyles(cols: ReportColumn[], tableW: number): Record<number, object> {
    const styles: Record<number, object> = {};
    const MEAS_W = 85; // ancho fijo por columna de medida
    const measCount = cols.filter(c => c.type === 'measure').length;
    const dimCount  = cols.filter(c => c.type === 'dimension').length;
    const totalMeasW = measCount * MEAS_W;
    const dimW = dimCount > 0 ? Math.max(60, (tableW - totalMeasW) / dimCount) : tableW / cols.length;

    cols.forEach((col, i) => {
      styles[i] = col.type === 'measure'
        ? { halign: 'right' as const,  cellWidth: MEAS_W }
        : { halign: 'left'  as const,  cellWidth: dimW   };
    });
    return styles;
  }

  publish(): void {
    if (this.isPublic && this.reportId) {
      this.showPublishUrl();
      return;
    }
    if (!this.source) {
      Swal.fire('Atención', 'Guarda el reporte antes de publicarlo.', 'warning');
      return;
    }
    this.publishing = true;
    this.isPublic = true;
    const spec = this.buildSpec();
    if (!spec) { this.publishing = false; return; }
    const userStr = localStorage.getItem('user');
    let ownerEmail = '';
    let ownerCompany = '';
    try {
      const u = userStr ? JSON.parse(userStr) : null;
      ownerEmail = u?.email || '';
      ownerCompany = u?.company || '';
    } catch { /* noop */ }

    const report: SavedReport = {
      id: this.reportId || undefined,
      name: this.reportName,
      source: this.source.id,
      spec,
      viz: { type: this.vizType, activeTypes: [...this.activeVizTypes] },
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      ownerEmail,
      ownerCompany,
      isPublic: true,
      visibleToUsers: this.visibleToUsers.length ? this.visibleToUsers : undefined,
      visibleToRoles: this.visibleToRoles.length ? this.visibleToRoles : undefined,
    };

    this.reportsService
      .save(report)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.isPublic = false;
          Swal.fire('Error', err?.error?.message || 'No se pudo publicar.', 'error');
          return of(null);
        }),
        finalize(() => (this.publishing = false)),
      )
      .subscribe((saved) => {
        if (!saved) return;
        this.reportId = saved.id || this.reportId;
        this.showPublishUrl();
      });
  }

  private showPublishUrl(): void {
    const url = `${environment.appUrl}/r/${this.reportId}`;
    Swal.fire({
      title: 'Reporte publicado',
      html: `
        <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
          Cualquier persona con el enlace puede ver este reporte.
        </p>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="pub-url" readonly value="${url}"
            style="flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;background:#f9fafb;color:#111827;" />
          <button id="copy-btn" type="button"
            style="padding:8px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
            Copiar
          </button>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
          <a href="${url}" target="_blank"
            style="font-size:12px;color:#2563eb;text-decoration:none;">
            <i class="fa fa-external-link-alt"></i> Abrir enlace
          </a>
          <span style="color:#d1d5db;">·</span>
          <button id="unpublish-btn" type="button"
            style="font-size:12px;color:#6b7280;background:none;border:none;cursor:pointer;padding:0;">
            Despublicar
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        document.getElementById('copy-btn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('copy-btn') as HTMLButtonElement;
            if (btn) { btn.textContent = '¡Copiado!'; btn.style.background = '#16a34a'; }
          });
        });
        document.getElementById('unpublish-btn')?.addEventListener('click', () => {
          Swal.close();
          this.unpublish();
        });
      },
    });
  }

  private unpublish(): void {
    if (!this.reportId) return;
    this.isPublic = false;
    const report = { id: this.reportId } as any;
    this.reportsService
      .save({ ...report, isPublic: false })
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((saved) => {
        if (saved) Swal.fire({ icon: 'success', title: 'Reporte despublicado', timer: 1500, showConfirmButton: false });
        else this.isPublic = true;
      });
  }

  goHome(): void {
    this.router.navigate(['/dashboards']);
  }

  /**
   * Abre un modal de SweetAlert para configurar quién puede ver el reporte.
   * El usuario edita 3 cosas: público sí/no, lista de emails, lista de roles.
   * Los valores se guardan en el state del componente y se persisten al hacer Guardar.
   */
  openShareModal(): void {
    const usersStr = this.visibleToUsers.join(', ');
    const rolesStr = this.visibleToRoles.join(', ');
    const checkedAttr = this.isPublic ? 'checked' : '';
    const html = `
      <div style="text-align:left; font-size:13px;">
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:14px; cursor:pointer;">
          <input id="share-public" type="checkbox" ${checkedAttr} style="transform:scale(1.2);" />
          <span><strong>Reporte público</strong> — visible para todos los usuarios de la empresa</span>
        </label>
        <div style="margin-bottom:12px;">
          <label style="display:block; font-weight:600; margin-bottom:4px;">Usuarios específicos (emails, separados por coma):</label>
          <textarea id="share-users" rows="2" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;" placeholder="vendedor1@empresa.com, vendedor2@empresa.com">${usersStr}</textarea>
        </div>
        <div>
          <label style="display:block; font-weight:600; margin-bottom:4px;">Roles (separados por coma):</label>
          <textarea id="share-roles" rows="2" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;" placeholder="Vendedor, Administrador">${rolesStr}</textarea>
        </div>
        <p style="margin-top:12px; color:#666; font-size:12px;">El propietario del reporte siempre tiene acceso.</p>
      </div>
    `;
    Swal.fire({
      title: 'Compartir reporte',
      html,
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const isPub = (document.getElementById('share-public') as HTMLInputElement)?.checked || false;
        const usersRaw = (document.getElementById('share-users') as HTMLTextAreaElement)?.value || '';
        const rolesRaw = (document.getElementById('share-roles') as HTMLTextAreaElement)?.value || '';
        return {
          isPublic: isPub,
          users: usersRaw.split(',').map((s) => s.trim()).filter(Boolean),
          roles: rolesRaw.split(',').map((s) => s.trim()).filter(Boolean),
        };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.isPublic = result.value.isPublic;
        this.visibleToUsers = result.value.users;
        this.visibleToRoles = result.value.roles;
      }
    });
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
        // Restaurar permisos
        this.isPublic = !!r.isPublic;
        this.visibleToUsers = Array.isArray(r.visibleToUsers) ? r.visibleToUsers : [];
        this.visibleToRoles = Array.isArray(r.visibleToRoles) ? r.visibleToRoles : [];
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
