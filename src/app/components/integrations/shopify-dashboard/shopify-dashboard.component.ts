import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { IntegrationsService } from '../integrations.service';

import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-shopify-dashboard',
  templateUrl: './shopify-dashboard.component.html',
  styleUrls: ['./shopify-dashboard.component.scss'],
  providers: [MessageService]
})
export class ShopifyDashboardComponent implements OnInit, OnDestroy {
  connectionStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  lastChecked: Date | null = null;
  syncMetrics = {
    products: 0,
    orders: 0,
    inventory: 0,
    lastSync: null as Date | null
  };
  recentEvents: any[] = [];
  loading = true;
  syncingResource: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private integrationsService: IntegrationsService,
    private messageService: MessageService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.connectionStatus = 'checking';

    this.integrationsService.getShopifySyncStatus()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loading = false; })
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            const data = response.data || response;
            this.connectionStatus = data.connected ? 'connected' : 'disconnected';
            this.lastChecked = new Date();
            this.syncMetrics = {
              products: data.metrics?.products || 0,
              orders: data.metrics?.orders || 0,
              inventory: data.metrics?.inventory || 0,
              lastSync: data.metrics?.lastSync ? new Date(data.metrics.lastSync) : null
            };
            this.recentEvents = (data.recentEvents || []).slice(0, 5);
          } else {
            this.connectionStatus = 'disconnected';
          }
        },
        error: () => {
          this.connectionStatus = 'disconnected';
          this.lastChecked = new Date();
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('comun.error'),
            detail: this.translate.instant('integrations.shopifyDashboard.noSePudoCargarEl')
          });
        }
      });
  }

  triggerSync(resource: string): void {
    this.syncingResource = resource;
    this.integrationsService.triggerShopifySync(resource)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.syncingResource = null; })
      )
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('integrations.shopifyDashboard.sincronizacionIniciada'),
            detail: this.translate.instant('integrations.shopifyDashboard.seInicioSincronizacionDe', { recurso: this.getResourceLabel(resource) })
          });
          setTimeout(() => this.loadDashboardData(), 3000);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('comun.error'),
            detail: err?.error?.message || this.translate.instant('integrations.shopifyDashboard.errorAlIniciarSincronizacion')
          });
        }
      });
  }

  verifyConnection(): void {
    this.connectionStatus = 'checking';
    this.integrationsService.testIntegration('shopify', {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.connectionStatus = result.success ? 'connected' : 'disconnected';
          this.lastChecked = new Date();
          this.messageService.add({
            severity: result.success ? 'success' : 'warn',
            summary: result.success ? this.translate.instant('integrations.integrationsList.conectado2') : this.translate.instant('integrations.shopifyDashboard.sinConexion'),
            detail: result.message
          });
        },
        error: () => {
          this.connectionStatus = 'disconnected';
          this.lastChecked = new Date();
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('comun.error'),
            detail: this.translate.instant('integrations.shopifyDashboard.noSePudoVerificarLa')
          });
        }
      });
  }

  navigateTo(path: string): void {
    this.router.navigate(['/integrations/shopify/' + path]);
  }

  getStatusSeverity(): string {
    switch (this.connectionStatus) {
      case 'connected': return 'success';
      case 'disconnected': return 'danger';
      case 'checking': return 'info';
      default: return 'info';
    }
  }

  getStatusLabel(): string {
    switch (this.connectionStatus) {
      case 'connected': return 'Conectado';
      case 'disconnected': return 'Desconectado';
      case 'checking': return 'Verificando...';
      default: return 'Desconocido';
    }
  }

  getEventSeverity(event: any): string {
    if (event.status === 'success') return 'success';
    if (event.status === 'error') return 'danger';
    return 'info';
  }

  getEventIcon(event: any): string {
    switch (event.type) {
      case 'product': return 'pi pi-box';
      case 'order': return 'pi pi-shopping-cart';
      case 'inventory': return 'pi pi-database';
      default: return 'pi pi-sync';
    }
  }

  getResourceLabel(resource: string): string {
    switch (resource) {
      case 'products': return 'Productos';
      case 'inventory': return 'Inventario';
      case 'orders': return 'Ordenes';
      default: return resource;
    }
  }

  isSyncing(resource: string): boolean {
    return this.syncingResource === resource;
  }
}
