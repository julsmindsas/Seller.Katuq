import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  ProviderDashboardService,
  SummaryKpis,
  SummaryResponse,
} from '../provider-dashboard.service';

import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-provider-summary',
  templateUrl: './provider-summary.component.html',
  styleUrls: ['./provider-summary.component.scss'],
})
export class ProviderSummaryComponent implements OnChanges, OnDestroy {
  @Input() provider!: string;

  loading = false;
  error: string | null = null;
  kpis: SummaryKpis | null = null;
  days = 7;

  private destroy$ = new Subject<void>();

  constructor(private svc: ProviderDashboardService,
    private translate: TranslateService
  ) {}

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
      .getSummary(this.provider, this.days)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: SummaryResponse) => {
          this.loading = false;
          this.kpis = resp.summary;
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.error?.message || err?.message || this.translate.instant('providerDashboard.providerSummary.noSePudoCargarEl');
        },
      });
  }

  formatFecha(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch (_) {
      return iso;
    }
  }

  fechaRelativa(iso: string | null): string {
    if (!iso) return this.translate.instant('providerDashboard.providerSummary.sinRegistro');
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return this.translate.instant('providerDashboard.providerSummary.recien');
    const min = Math.floor(ms / 60000);
    if (min < 1) return this.translate.instant('providerDashboard.providerSummary.haceSegundos');
    if (min < 60) return this.translate.instant('providerDashboard.providerSummary.haceMin', { n: min });
    const hr = Math.floor(min / 60);
    if (hr < 24) return this.translate.instant('providerDashboard.providerSummary.haceHoras', { n: hr });
    const dia = Math.floor(hr / 24);
    if (dia < 7) return this.translate.instant(dia === 1 ? 'providerDashboard.providerSummary.haceUnDia' : 'providerDashboard.providerSummary.haceDias', { n: dia });
    return this.formatFecha(iso);
  }
}
