import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProviderConfig, getProviderConfig } from '../provider-registry';

@Component({
  selector: 'app-provider-dashboard',
  templateUrl: './provider-dashboard.component.html',
  styleUrls: ['./provider-dashboard.component.scss'],
})
export class ProviderDashboardComponent implements OnInit, OnDestroy {
  provider: string | null = null;
  config: ProviderConfig | null = null;
  unknownProvider = false;
  activeTab = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.provider = params.get('provider');
      this.config = this.provider ? getProviderConfig(this.provider) : null;
      this.unknownProvider = !this.config;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasFeature(f: 'issues' | 'kpis' | 'products'): boolean {
    return !!this.config?.features?.includes(f);
  }

  goBackToIntegrations(): void {
    this.router.navigate(['/integrations']);
  }
}
