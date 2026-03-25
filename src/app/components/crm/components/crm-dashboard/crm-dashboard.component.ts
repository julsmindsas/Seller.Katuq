import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CrmService } from '../../services/crm.service';
import { CrmStats, CrmActivity, getStatusSeverity, getStatusLabel, CONTACT_STATUS_OPTIONS } from '../../models/crm.models';

@Component({
  selector: 'app-crm-dashboard',
  templateUrl: './crm-dashboard.component.html',
  styleUrls: ['./crm-dashboard.component.scss'],
})
export class CrmDashboardComponent implements OnInit, OnDestroy {
  stats: CrmStats | null = null;
  recentActivities: CrmActivity[] = [];
  loading = true;
  statusOptions = CONTACT_STATUS_OPTIONS;

  private destroy$ = new Subject<void>();

  constructor(
    private crmService: CrmService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.loading = true;
    this.crmService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe((stats) => {
        this.stats = stats;
        this.loading = false;
      });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  getStatusSeverity = getStatusSeverity;
  getStatusLabel = getStatusLabel;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  }
}
