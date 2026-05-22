import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ReportsService } from '../../../shared/services/dashboard/reports.service';
import { findDimension, findMeasure, findSource } from '../model/source-catalog';
import {
  DimensionRef,
  MeasureRef,
  ReportColumn,
  ReportResult,
  ReportSpec,
  SavedReport,
  SourceDef,
  VizType,
} from '../model/report-spec.interfaces';

@Component({
  selector: 'app-report-view',
  templateUrl: './report-view.component.html',
  styleUrls: ['./report-view.component.scss'],
})
export class ReportViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  reportId: string | null = null;
  reportName = '';
  source: SourceDef | null = null;
  activeVizTypes: Set<VizType> = new Set(['table']);
  dateFrom = '';
  dateTo = '';

  result: ReportResult | null = null;
  running = false;
  exporting = false;
  errorMsg: string | null = null;
  notFound = false;

  savedReport: SavedReport | null = null;

  @ViewChild('vizContainer', { read: ElementRef }) vizContainer?: ElementRef<HTMLElement>;

  constructor(
    private reportsService: ReportsService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.reportId = id;
      this.loadAndRun(id);
    } else {
      this.notFound = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goHome(): void {
    this.router.navigate(['/dashboards']);
  }

  goEdit(): void {
    if (this.reportId) {
      this.router.navigate(['/dashboards/builder', this.reportId]);
    }
  }

  private loadAndRun(id: string): void {
    this.running = true;
    this.reportsService
      .getById(id)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((r) => {
        if (!r) { this.notFound = true; this.running = false; return; }
        const src = findSource(r.source);
        if (!src) { this.notFound = true; this.running = false; return; }

        this.savedReport = r;
        this.reportName = r.name;
        this.source = src;
        this.dateFrom = r.dateFrom || '';
        this.dateTo = r.dateTo || '';

        const activeTypes = r.viz?.activeTypes?.length ? r.viz.activeTypes : [r.viz?.type || 'table'];
        this.activeVizTypes = new Set<VizType>(activeTypes);

        this.runQuery(r);
      });
  }

  private runQuery(r: SavedReport): void {
    const spec = this.buildSpec(r);
    if (!spec) { this.running = false; return; }

    this.reportsService
      .runQuery(spec)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.errorMsg = err?.error?.error || err?.message || 'Error al ejecutar la consulta.';
          return of(null);
        }),
        finalize(() => (this.running = false)),
      )
      .subscribe((res) => { this.result = res; });
  }

  private buildSpec(r: SavedReport): ReportSpec | null {
    if (!this.source) return null;
    const allFilters = [...(r.spec.filters || [])];
    if (this.dateFrom || this.dateTo) {
      const dateField = this.source.dimensions.find((d) => d.type === 'date');
      if (dateField) {
        if (this.dateFrom) allFilters.push({ field: dateField.id, op: 'gte', value: this.dateFrom + 'T00:00:00.000Z' });
        if (this.dateTo)   allFilters.push({ field: dateField.id, op: 'lte', value: this.dateTo   + 'T23:59:59.999Z' });
      }
    }
    return { ...r.spec, filters: allFilters };
  }

  // ─── Exports ──────────────────────────────────────────────────

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
        const a = document.createElement('a'); a.href = url; a.download = `${this.reportName}.png`; a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      Swal.fire('Error', 'No se pudo exportar la imagen.', 'error');
    } finally { Swal.close(); this.exporting = false; }
  }

  async exportPdf(): Promise<void> {
    if (!this.result || this.exporting) return;
    this.exporting = true;
    Swal.fire({ title: 'Generando PDF…', html: 'Capturando visualizaciones…', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 24;
      const HEADER_H = 90;
      const FOOTER_H = 22;

      const drawPageHeader = () => {
        pdf.setFillColor(37, 99, 235); pdf.rect(0, 0, W, 52, 'F');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(255, 255, 255);
        const titleLines = pdf.splitTextToSize(this.reportName, W - M * 2 - 60);
        pdf.text(titleLines[0], M, 33);
        pdf.setFontSize(10); pdf.setTextColor(191, 219, 254); pdf.text('KATUQ', W - M - 36, 33);

        pdf.setFillColor(239, 246, 255); pdf.rect(0, 52, W, 28, 'F');
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(30, 64, 175);
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
        const metaStr = metaParts.join('   |   ');
        const metaMaxW = W - M * 2;
        let metaDisplay = metaStr;
        while (pdf.getTextWidth(metaDisplay) > metaMaxW && metaDisplay.length > 10) metaDisplay = metaDisplay.slice(0, -4) + '...';
        pdf.text(metaDisplay, M, 70);
        pdf.setDrawColor(219, 234, 254); pdf.line(M, 82, W - M, 82);
      };

      const drawPageFooter = () => {
        pdf.setFillColor(248, 250, 252); pdf.rect(0, H - FOOTER_H, W, FOOTER_H, 'F');
        pdf.setDrawColor(226, 232, 240); pdf.line(0, H - FOOTER_H, W, H - FOOTER_H);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
        pdf.text('Katuq · Reportes Inteligentes', M, H - 7);
      };

      drawPageHeader();
      let curY = HEADER_H;
      const hasKpi   = this.activeVizTypes.has('kpi');
      const hasChart = this.activeVizTypes.has('bar') || this.activeVizTypes.has('line') || this.activeVizTypes.has('pie');
      const hasTable = this.activeVizTypes.has('table') || this.activeVizTypes.has('pivot');

      if (hasChart && this.vizContainer) {
        const { default: html2canvas } = await import('html2canvas');
        await new Promise(r => setTimeout(r, 600));
        const chartHosts = Array.from(
          (this.vizContainer.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.chart-host')
        );
        const maxContentH = H - HEADER_H - FOOTER_H - 10;
        for (const chartEl of chartHosts) {
          const chartCanvas = await html2canvas(chartEl, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
          const cW = chartCanvas.width; const cH = chartCanvas.height;
          const pdfImgW = W - M * 2;
          let imgW = pdfImgW; let imgH = imgW * (cH / cW);
          if (imgH > maxContentH) { imgH = maxContentH; imgW = imgH * (cW / cH); }
          const availNow = H - curY - FOOTER_H - 10;
          if (imgH > availNow) { drawPageFooter(); pdf.addPage(); drawPageHeader(); curY = HEADER_H; }
          const xOffset = M + (pdfImgW - imgW) / 2;
          pdf.addImage(chartCanvas.toDataURL('image/png'), 'PNG', xOffset, curY, imgW, imgH);
          curY += imgH + 12;
        }
      }

      if (hasTable && this.result.rows.length > 0) {
        if (hasChart && (H - curY - FOOTER_H) < 80) { drawPageFooter(); pdf.addPage(); drawPageHeader(); curY = HEADER_H; }
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
          didDrawPage: (data: any) => { if (data.pageNumber > 1) drawPageHeader(); drawPageFooter(); },
        });
      } else {
        drawPageFooter();
      }

      if (hasKpi && this.result.rows.length > 0) {
        const measCols = this.result.columns.filter(c => c.type === 'measure');
        const firstRow = this.result.rows[0];
        const kpiItems = measCols.map(col => ({ label: col.label, value: this.pdfFormatValue(firstRow[col.field], col) }));
        const count = Math.min(kpiItems.length, 4);
        const kpiW = (W - M * 2 - (count - 1) * 10) / count;
        if (H - curY - FOOTER_H - 10 < 66) { drawPageFooter(); pdf.addPage(); drawPageHeader(); curY = HEADER_H; }
        kpiItems.slice(0, count).forEach((kpi, i) => {
          const x = M + i * (kpiW + 10);
          pdf.setFillColor(255, 255, 255); pdf.setDrawColor(229, 231, 235); pdf.rect(x, curY, kpiW, 54, 'FD');
          pdf.setFillColor(37, 99, 235); pdf.rect(x, curY, 4, 54, 'F');
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(107, 114, 128);
          pdf.text(pdf.splitTextToSize(kpi.label.toUpperCase(), kpiW - 20)[0], x + 12, curY + 16);
          pdf.setTextColor(17, 24, 39); pdf.setFont('helvetica', 'bold');
          let valueFontSize = 15; pdf.setFontSize(valueFontSize);
          while (pdf.getTextWidth(kpi.value) > kpiW - 20 && valueFontSize > 8) { valueFontSize--; pdf.setFontSize(valueFontSize); }
          pdf.text(kpi.value, x + 12, curY + 40);
        });
        curY += 66;
        drawPageFooter();
      }

      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
        pdf.text(`${p} / ${totalPages}`, W - M, H - 7, { align: 'right' });
      }
      pdf.save(`${this.reportName}.pdf`);
    } catch (err) {
      Swal.fire('Error', 'No se pudo exportar el PDF.', 'error');
    } finally { Swal.close(); this.exporting = false; }
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

      const ws = wb.addWorksheet('Datos');
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

      this.result.rows.forEach((row, rowIdx) => {
        const values = cols.map(col => {
          const val = row[col.field];
          if (val === null || val === undefined || val === '') return '';
          if (col.dataType === 'boolean' || val === true || val === false) {
            if (val === true || val === 'true' || val === 1 || val === '1') return 'Sí';
            if (val === false || val === 'false' || val === 0 || val === '0') return 'No';
          }
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
      cols.forEach((col, i) => {
        const maxLen = Math.max(col.label.length, ...this.result!.rows.slice(0, 50).map(r => String(r[col.field] ?? '').length));
        ws.getColumn(i + 1).width = Math.min(40, Math.max(10, maxLen + 2));
      });

      const hasCharts = this.activeVizTypes.has('bar') || this.activeVizTypes.has('line') || this.activeVizTypes.has('pie');
      if (hasCharts && this.vizContainer) {
        const { default: html2canvas } = await import('html2canvas');
        await new Promise(r => setTimeout(r, 600));
        const chartHosts = Array.from(
          (this.vizContainer.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.chart-host')
        );
        const activeChartTypes = (['bar', 'line', 'pie'] as VizType[]).filter(t => this.activeVizTypes.has(t));
        const chartLabels: Record<string, string> = { bar: 'Barras', line: 'Linea', pie: 'Pastel' };
        const grafSheet = wb.addWorksheet('Graficas');
        const COLS = 14; const COL_W = 10; const COL_W_PX = 70;
        const ROW_H_PT = 18; const ROW_H_PX = Math.round(ROW_H_PT * 96 / 72);
        for (let c = 1; c <= COLS; c++) grafSheet.getColumn(c).width = COL_W;
        const IMG_W_PX = COLS * COL_W_PX;
        let rowCursor = 0;
        for (let ci = 0; ci < Math.min(activeChartTypes.length, chartHosts.length); ci++) {
          const label = chartLabels[activeChartTypes[ci]] ?? `Grafica ${ci + 1}`;
          const titleRow = grafSheet.getRow(rowCursor + 1);
          titleRow.height = ROW_H_PT + 4;
          const cell = titleRow.getCell(1);
          cell.value = label;
          cell.font  = { bold: true, size: 12, color: { argb: 'FF2563EB' } };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
          grafSheet.mergeCells(rowCursor + 1, 1, rowCursor + 1, COLS);
          rowCursor++;
          const canvas  = await html2canvas(chartHosts[ci], { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
          const b64     = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
          const imgBuf  = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
          const imgH    = Math.round(IMG_W_PX * (canvas.height / canvas.width));
          const imgId   = wb.addImage({ buffer: imgBuf, extension: 'png' });
          grafSheet.addImage(imgId, { tl: { col: 0, row: rowCursor } as any, ext: { width: IMG_W_PX, height: imgH } });
          const imgRowSpan = Math.ceil(imgH / ROW_H_PX);
          for (let r = rowCursor + 1; r <= rowCursor + imgRowSpan; r++) grafSheet.getRow(r).height = ROW_H_PT;
          rowCursor += imgRowSpan;
          if (ci < activeChartTypes.length - 1) { grafSheet.getRow(rowCursor + 1).height = ROW_H_PT; rowCursor += 2; }
        }
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${this.reportName}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire('Error', 'No se pudo exportar el Excel.', 'error');
    } finally { Swal.close(); this.exporting = false; }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async captureVizCanvas(): Promise<HTMLCanvasElement | null> {
    if (!this.result || !this.vizContainer) return null;
    const { default: html2canvas } = await import('html2canvas');
    await new Promise(r => setTimeout(r, 300));
    return this.captureExpanded(this.vizContainer.nativeElement, html2canvas);
  }

  private async captureExpanded(
    el: HTMLElement,
    html2canvas: (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>,
  ): Promise<HTMLCanvasElement> {
    type S = { t: HTMLElement; ov: string; h: string; mh: string };
    const saved: S[] = [];
    const expand = (t: HTMLElement) => {
      saved.push({ t, ov: t.style.overflow, h: t.style.height, mh: t.style.maxHeight });
      t.style.overflow = 'visible'; t.style.height = t.scrollHeight + 'px'; t.style.maxHeight = 'none';
    };
    expand(el);
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
      const cs = window.getComputedStyle(node);
      if (['hidden', 'auto', 'scroll'].includes(cs.overflow) || ['hidden', 'auto', 'scroll'].includes(cs.overflowY)) expand(node);
      node = node.parentElement;
    }
    await new Promise(r => setTimeout(r, 80));
    try {
      return await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
    } finally {
      saved.forEach(s => { s.t.style.overflow = s.ov; s.t.style.height = s.h; s.t.style.maxHeight = s.mh; });
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
    if (value === null || value === undefined || value === '') return '-';
    if (col.dataType === 'boolean' || value === true || value === false) {
      if (value === true || value === 'true' || value === 1 || value === '1') return 'Sí';
      if (value === false || value === 'false' || value === 0 || value === '0') return 'No';
    }
    if (col.dataType === 'date') return this.formatDateStr(String(value));
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    if (col.format === 'currency') return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    if (col.format === 'percent') return `${(n * 100).toFixed(2)}%`;
    if (col.type === 'measure') return new Intl.NumberFormat('es-CO').format(n);
    return String(value);
  }

  private buildPdfColumnStyles(cols: ReportColumn[], tableW: number): Record<number, object> {
    const MEAS_W = 85;
    const measCount = cols.filter(c => c.type === 'measure').length;
    const dimCount  = cols.filter(c => c.type === 'dimension').length;
    const totalMeasW = measCount * MEAS_W;
    const dimW = dimCount > 0 ? Math.max(60, (tableW - totalMeasW) / dimCount) : tableW / cols.length;
    const styles: Record<number, object> = {};
    cols.forEach((col, i) => {
      styles[i] = col.type === 'measure' ? { halign: 'right' as const, cellWidth: MEAS_W } : { halign: 'left' as const, cellWidth: dimW };
    });
    return styles;
  }
}
