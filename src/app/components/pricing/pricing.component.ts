import { Component, OnInit, OnDestroy } from '@angular/core';
import { SubscriptionService } from '../../shared/services/subscription.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements OnInit, OnDestroy {
  currentPlan: string = 'freemium';
  loading = false;
  showUpgradeModal = false;
  private destroy$ = new Subject<void>();

  // Billing info
  billingInfo: any = null;
  billingLoading = false;

  tiers = [
    { id: 'freemium', name: 'Freemium', priceUSD: 0, maxSales: '15 pedidos/mes', description: 'Para empezar', icon: 'pi-star', gradient: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)' },
    { id: 'origen', name: 'Origen', priceUSD: 47, maxSales: 'Hasta $30M COP/mes', description: 'Pequeños negocios', icon: 'pi-home', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'esencia', name: 'Esencia', priceUSD: 77, maxSales: 'Hasta $60M COP/mes', description: 'En crecimiento', icon: 'pi-chart-line', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', popular: true },
    { id: 'impulso', name: 'Impulso', priceUSD: 147, maxSales: 'Hasta $150M COP/mes', description: 'Negocios consolidados', icon: 'pi-bolt', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'expansion', name: 'Expansión', priceUSD: 247, maxSales: 'Hasta $300M COP/mes', description: 'Multi-canal', icon: 'pi-globe', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'liderazgo', name: 'Liderazgo', priceUSD: 427, maxSales: 'Hasta $500M COP/mes', description: 'Líderes del mercado', icon: 'pi-crown', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { id: 'cumbre', name: 'Cumbre', priceUSD: 0, maxSales: '+$500M COP/mes', description: 'Personalizado', icon: 'pi-flag', gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', custom: true },
  ];

  allFeatures = [
    'Pedidos ilimitados',
    'Bodegas ilimitadas',
    'Usuarios ilimitados',
    'Chat IA ilimitado',
    'Facturación electrónica DIAN',
    'Integraciones (Siigo, Shopify, WooCommerce)',
    'Módulo de Producción',
    'Logística integrada (Enviame, Prindel)',
    'KAI — Asistente de IA',
    'Dashboard y reportes avanzados',
    'Soporte prioritario',
  ];

  freemiumFeatures = [
    { text: '15 pedidos por mes', enabled: true },
    { text: '1 bodega', enabled: true },
    { text: '5 usuarios', enabled: true },
    { text: '1 integración', enabled: true },
    { text: 'Chat IA: 10 msg/día', enabled: true },
    { text: 'Dashboard básico', enabled: true },
    { text: 'Producción', enabled: false },
    { text: 'Dropshipping', enabled: false },
    { text: 'IA de Voz', enabled: false },
  ];

  constructor(
    private subscriptionService: SubscriptionService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptionService.subscription$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sub => {
        if (sub) this.currentPlan = sub.plan;
      });

    this.subscriptionService.loadSubscriptionStatus().subscribe();
    this.loadBillingInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBillingInfo(): void {
    this.billingLoading = true;
    this.http.get(`${environment.urlApi}/v1/billing/info`).subscribe({
      next: (data: any) => {
        this.billingInfo = data;
        this.billingLoading = false;
      },
      error: () => { this.billingLoading = false; }
    });
  }

  isCurrentTier(tierId: string): boolean {
    return this.billingInfo?.currentTier === tierId;
  }

  activarPlan(): void {
    this.showUpgradeModal = true;
  }

  contactarVentas(): void {
    window.open('https://wa.me/573001234567?text=Hola, me interesa el plan Cumbre de Katuq', '_blank');
  }
}
