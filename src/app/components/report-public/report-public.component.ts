import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { ReportsService } from '../../shared/services/dashboard/reports.service';
import { ReportColumn, ReportResult, SavedReport } from '../dashboard/model/report-spec.interfaces';

@Component({
  selector: 'app-report-public',
  templateUrl: './report-public.component.html',
  styleUrls: ['./report-public.component.scss'],
})
export class ReportPublicComponent implements OnInit {
  private destroy$ = new Subject<void>();

  report: SavedReport | null = null;
  result: ReportResult | null = null;
  loading = true;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private reportsService: ReportsService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';

    this.reportsService
      .getPublicReport(id)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((r) => {
        if (!r) { this.error = 'Reporte no encontrado o no publicado.'; this.loading = false; return; }
        this.report = r;
        this.reportsService
          .runPublicQuery(id)
          .pipe(
            takeUntil(this.destroy$),
            catchError((err) => { this.error = err?.error?.error || 'Error al cargar los datos.'; return of(null); }),
            finalize(() => (this.loading = false)),
          )
          .subscribe((res) => { this.result = res; });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get columns(): ReportColumn[] {
    return this.result?.columns || [];
  }

  get rows(): Record<string, unknown>[] {
    return this.result?.rows || [];
  }

  formatCell(value: unknown, col: ReportColumn): string {
    if (value === null || value === undefined || value === '') return '—';
    if (col.dataType === 'date') {
      const s = String(value);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
    }
    const n = Number(value);
    if (!Number.isNaN(n) && col.type === 'measure') {
      if (col.format === 'currency') {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
      }
      return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n);
    }
    return String(value);
  }
}
