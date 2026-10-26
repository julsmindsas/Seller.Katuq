import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import {
  IssueCategory,
  IssuesResponse,
  ProviderDashboardService,
  ProviderIssue,
} from '../provider-dashboard.service';

import { TranslateService } from '@ngx-translate/core';
interface CategoryFilter {
  label: string;
  value: IssueCategory | 'all';
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  missing_osmosis_id: 'providerDashboard.providerIssuesTable.sinEnviarAlProveedor',
  push_error: 'providerDashboard.providerIssuesTable.errorAlEnviar',
  cancelled_in_cereza: 'providerDashboard.providerIssuesTable.canceladoEnProveedor',
};

const CATEGORY_SEVERITY: Record<IssueCategory, 'warning' | 'danger' | 'info'> = {
  missing_osmosis_id: 'warning',
  push_error: 'danger',
  cancelled_in_cereza: 'info',
};

@Component({
  selector: 'app-provider-issues-table',
  templateUrl: './provider-issues-table.component.html',
  styleUrls: ['./provider-issues-table.component.scss'],
})
export class ProviderIssuesTableComponent implements OnChanges, OnDestroy {
  @Input() provider!: string;

  loading = false;
  error: string | null = null;
  issues: ProviderIssue[] = [];
  filteredIssues: ProviderIssue[] = [];
  summary = { missing_osmosis_id: 0, push_error: 0, cancelled_in_cereza: 0 };
  total = 0;

  categoryFilters: CategoryFilter[] = [];
  selectedCategory: IssueCategory | 'all' = 'all';
  searchText = '';
  pushingIds = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(private svc: ProviderDashboardService,
    private translate: TranslateService
  ) {
    this.categoryFilters = [
      { label: this.translate.instant('providerDashboard.providerIssuesTable.todasLasCategorias'), value: 'all' },
      { label: this.categoryLabel('missing_osmosis_id'), value: 'missing_osmosis_id' },
      { label: this.categoryLabel('push_error'), value: 'push_error' },
      { label: this.categoryLabel('cancelled_in_cereza'), value: 'cancelled_in_cereza' },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['provider'] && this.provider) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.provider) return;
    this.loading = true;
    this.error = null;
    this.svc
      .getOrdersWithIssues(this.provider, 200)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: IssuesResponse) => {
          this.loading = false;
          this.issues = resp.issues || [];
          this.summary = (resp.summary as any) || this.summary;
          this.total = resp.total || 0;
          this.applyFilters();
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.error?.message ||
            err?.message ||
            this.translate.instant('providerDashboard.providerIssuesTable.noSePudoCargarLa');
        },
      });
  }

  applyFilters(): void {
    const q = this.searchText.trim().toLowerCase();
    this.filteredIssues = this.issues.filter((i) => {
      if (this.selectedCategory !== 'all' && i.category !== this.selectedCategory) return false;
      if (!q) return true;
      const hay = [
        i.nroPedido,
        i.cliente,
        i.shopifyOrderName,
        i.osmosisError,
        i.osmosisLastNote,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  onCategoryChange(): void { this.applyFilters(); }
  onSearchChange(): void { this.applyFilters(); }

  categoryLabel(cat: IssueCategory): string { return this.translate.instant(CATEGORY_LABELS[cat] || cat); }
  categorySeverity(cat: IssueCategory): 'warning' | 'danger' | 'info' { return CATEGORY_SEVERITY[cat] || 'info'; }

  reenviar(issue: ProviderIssue): void {
    if (this.pushingIds.has(issue.cd)) return;

    Swal.fire({
      title: this.translate.instant('providerDashboard.providerIssuesTable.reenviarAlProveedor'),
      html: `<p>${this.translate.instant('providerDashboard.providerIssuesTable.pedido')} <strong>${issue.nroPedido}</strong>${
        issue.cliente ? ` (${issue.cliente})` : ''
      }</p><p class="text-muted">${this.translate.instant('providerDashboard.providerIssuesTable.operacionIdempotente')}</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4A44C2',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('providerDashboard.providerIssuesTable.reenviar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.pushingIds.add(issue.cd);
      this.svc.pushOrder(this.provider, issue.cd).subscribe({
        next: (resp: any) => {
          this.pushingIds.delete(issue.cd);
          const osmId = resp?.osmosisOrderId || resp?.osmosisId;
          Swal.fire({
            icon: 'success',
            title: this.translate.instant('providerDashboard.providerIssuesTable.pedidoEnviado'),
            html: osmId
              // i18n-ignorar: el HTML se arma con textos ya traducidos
              ? `<p>${this.translate.instant('providerDashboard.providerIssuesTable.identificadorAsignado')} <strong>OSM-${osmId}</strong></p>`
              : `<p>${this.translate.instant('providerDashboard.providerIssuesTable.sincronizacionCompletada')}</p>`,
            confirmButtonColor: '#10B981',
          });
          this.load();
        },
        error: (err) => {
          this.pushingIds.delete(issue.cd);
          Swal.fire({
            icon: 'error',
            title: this.translate.instant('providerDashboard.providerIssuesTable.errorAlReenviar'),
            text: err?.error?.message || err?.message || this.translate.instant('providerDashboard.providerIssuesTable.errorDesconocido'),
            footer: this.translate.instant('providerDashboard.providerIssuesTable.verificaQueLaIntegracionEste'),
          });
        },
      });
    });
  }

  formatFecha(value: any): string {
    if (!value) return '—';
    try {
      const d = typeof value === 'string' ? new Date(value) : new Date(value);
      return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    } catch (_) { return String(value); }
  }

  formatTotal(v?: number): string {
    if (v == null) return '—';
    return '$' + Number(v).toLocaleString('es-CO');
  }
}
