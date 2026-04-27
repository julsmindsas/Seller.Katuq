import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { ReportsService } from '../../../shared/services/dashboard/reports.service';
import { SavedReport } from '../model/report-spec.interfaces';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
})
export class DashboardHomeComponent implements OnInit {
  private destroy$ = new Subject<void>();
  reports: SavedReport[] = [];
  loading = true;
  loadError: string | null = null;

  constructor(private reportsService: ReportsService, private router: Router) {}

  ngOnInit(): void {
    this.reportsService
      .list()
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.loadError = err?.error?.message || 'No se pudo cargar la lista de reportes.';
          return of([] as SavedReport[]);
        })
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

  newReport(): void {
    this.router.navigate(['/dashboards/builder']);
  }

  openReport(r: SavedReport): void {
    if (r.id) {
      this.router.navigate(['/dashboards/builder', r.id]);
    }
  }

  openClassic(): void {
    this.router.navigate(['/dashboards/classic']);
  }

  trackById(_: number, r: SavedReport): string {
    return r.id || r.name;
  }
}
