import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { ReportsService } from '../../../shared/services/dashboard/reports.service';
import { findSource } from '../model/source-catalog';
import { ReportResult, SavedReport, SourceDef, VizType } from '../model/report-spec.interfaces';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  reports: SavedReport[] = [];
  loading = true;
  loadError: string | null = null;

  // Inline preview state
  selected: SavedReport | null = null;
  selectedSource: SourceDef | null = null;
  activeVizTypes: Set<VizType> = new Set();
  result: ReportResult | null = null;
  previewRunning = false;
  previewError: string | null = null;

  @ViewChild('previewPanel') previewPanel?: ElementRef<HTMLElement>;

  constructor(private reportsService: ReportsService, private router: Router) {}

  ngOnInit(): void {
    this.reportsService
      .list()
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.loadError = err?.error?.message || 'No se pudo cargar la lista de reportes.';
          return of([] as SavedReport[]);
        }),
      )
      .subscribe((reports) => {
        this.reports = reports || [];
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectReport(r: SavedReport): void {
    // Toggle off if same card clicked again
    if (this.selected?.id === r.id) {
      this.closePreview();
      return;
    }

    this.selected = r;
    this.result = null;
    this.previewError = null;
    const src = findSource(r.source);
    this.selectedSource = src || null;
    const activeTypes = r.viz?.activeTypes?.length ? r.viz.activeTypes : [r.viz?.type || 'table'];
    this.activeVizTypes = new Set<VizType>(activeTypes);

    this.previewRunning = true;
    this.reportsService
      .runQuery(r.spec)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.previewError = err?.error?.error || err?.message || 'Error al ejecutar.';
          return of(null);
        }),
        finalize(() => (this.previewRunning = false)),
      )
      .subscribe((res) => {
        this.result = res;
        // Scroll preview into view after render
        setTimeout(() => this.previewPanel?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      });
  }

  closePreview(): void {
    this.selected = null;
    this.result = null;
    this.previewError = null;
    this.activeVizTypes = new Set();
  }

  editSelected(): void {
    if (this.selected?.id) {
      this.router.navigate(['/dashboards/builder', this.selected.id]);
    }
  }

  newReport(): void {
    this.router.navigate(['/dashboards/builder']);
  }

  openClassic(): void {
    this.router.navigate(['/dashboards/classic']);
  }

  trackById(_: number, r: SavedReport): string {
    return r.id || r.name;
  }
}
