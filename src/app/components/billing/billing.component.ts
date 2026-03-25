import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SubscriptionService } from '../../shared/services/subscription.service';

@Component({
  selector: 'app-billing',
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  billingInfo: any = null;
  invoices: any[] = [];
  loading = true;
  currentPlan = 'freemium';

  constructor(
    private http: HttpClient,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    this.subscriptionService.subscription$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sub => {
        if (sub) this.currentPlan = sub.plan;
      });

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;

    // Cargar info de billing
    this.http.get(`${environment.urlApi}/v1/billing/info`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.billingInfo = data;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });

    // Cargar historial de facturas
    this.http.get(`${environment.urlApi}/v1/billing/invoices`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.invoices = data.invoices || [];
        },
        error: () => {}
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'failed': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallido';
      default: return status;
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
