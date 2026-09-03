import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SubscriptionService } from '../../shared/services/subscription.service';

type PricingCurrency = 'USD' | 'COP';

interface PricingTier {
  id: string;
  name: string;
  priceUSD: number;
  maxSalesCOP: number | null;
  description: string;
  icon: string;
  custom?: boolean;
}

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements OnInit, OnDestroy {
  currentPlan = 'freemium';
  subscriptionStateReady = false;
  currentSubscription: any = null;
  showUpgradeModal = false;
  billingInfo: any = null;
  billingLoading = false;
  currency: PricingCurrency = 'USD';
  selectedTierIndex = 0;
  billingPeriodChoice: 'monthly' | 'yearly' = 'monthly';
  billingPeriodSaving = false;
  billingPeriodMessage = '';
  billingPeriodError = '';
  readonly publicPricingUrl = 'https://katuq.com/es/precios';
  readonly annualDiscount = 20;
  private destroy$ = new Subject<void>();

  tiers: PricingTier[] = [
    { id: 'base', name: 'Base', priceUSD: 27, maxSalesCOP: 15000000, description: 'Para operaciones que están despegando', icon: 'pi-star' },
    { id: 'origen', name: 'Origen', priceUSD: 47, maxSalesCOP: 30000000, description: 'Para negocios con una operación estable', icon: 'pi-home' },
    { id: 'esencia', name: 'Esencia', priceUSD: 77, maxSalesCOP: 60000000, description: 'Para equipos que están creciendo', icon: 'pi-chart-line' },
    { id: 'impulso', name: 'Impulso', priceUSD: 147, maxSalesCOP: 150000000, description: 'Para negocios consolidados', icon: 'pi-bolt' },
    { id: 'expansion', name: 'Expansión', priceUSD: 247, maxSalesCOP: 300000000, description: 'Para operaciones multicanal', icon: 'pi-globe' },
    { id: 'liderazgo', name: 'Liderazgo', priceUSD: 427, maxSalesCOP: 500000000, description: 'Para líderes de mercado', icon: 'pi-crown' },
    { id: 'cumbre', name: 'Cumbre', priceUSD: 0, maxSalesCOP: null, description: 'Una propuesta hecha para tu operación', icon: 'pi-flag', custom: true }
  ];

  readonly paidFeatures = [
    { icon: 'pi-shopping-cart', title: 'Pedidos ilimitados', text: 'Gestiona todos tus canales sin límite mensual.' },
    { icon: 'pi-users', title: 'Usuarios y roles', text: 'Tu equipo completo trabaja en una sola plataforma.' },
    { icon: 'pi-bolt', title: 'KAI — IA integrada', text: 'Asistencia inteligente aplicada a tu operación.' },
    { icon: 'pi-chart-bar', title: 'Reportes avanzados', text: 'Indicadores para decidir con datos reales.' },
    { icon: 'pi-box', title: 'Inventario y bodegas', text: 'Control centralizado de existencias y movimientos.' },
    { icon: 'pi-truck', title: 'Logística integrada', text: 'Despachos, entregas y trazabilidad en un solo flujo.' },
    { icon: 'pi-link', title: 'Integraciones', text: 'Conecta tus canales y herramientas actuales.' },
    { icon: 'pi-cog', title: 'Automatizaciones', text: 'Reduce tareas manuales y errores operativos.' }
  ];

  readonly freeFeatures = [
    { text: 'Hasta 15 pedidos al mes', enabled: true },
    { text: '1 bodega y 5 usuarios', enabled: true },
    { text: 'Catálogo de productos', enabled: true },
    { text: '1 integración', enabled: true },
    { text: 'Consultas KAI: 10 al día por usuario', enabled: true },
    { text: 'Productos con IA: 10 al día por usuario', enabled: true },
    { text: 'Producción, voz y video', enabled: false }
  ];

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    this.subscriptionService.subscription$
      .pipe(takeUntil(this.destroy$))
      .subscribe(subscription => {
        if (subscription) {
          this.subscriptionStateReady = true;
          this.currentSubscription = subscription;
          this.currentPlan = subscription.plan;
          if (subscription.plan === 'premium') this.showUpgradeModal = false;
          this.billingPeriodChoice = subscription.pendingBillingPeriod ||
            (subscription.billingPeriod === 'yearly' ? 'yearly' : 'monthly');
        }
      });

    this.subscriptionService.loadSubscriptionStatus().subscribe({ error: () => undefined });
    this.loadBillingInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedTier(): PricingTier {
    return this.tiers[Math.min(this.selectedTierIndex, this.tiers.length - 1)];
  }

  get trm(): number {
    const value = Number(this.billingInfo?.trm);
    return Number.isFinite(value) && value > 0 ? value : 4000;
  }

  get currentPlanLabel(): string {
    if (!this.subscriptionStateReady) return 'Cargando…';
    if (this.currentPlan === 'freemium') return 'Plan Gratis';
    return this.billingInfo?.currentTierName || 'Plan Pago';
  }

  get billingActionDisabled(): boolean {
    return !this.subscriptionStateReady || this.billingLoading || !this.billingInfo ||
      (this.currentPlan === 'premium' && !this.canManageBillingPeriod);
  }

  get lastInvoice(): any {
    return this.billingInfo?.lastInvoice || null;
  }

  get hasOutstandingManualInvoice(): boolean {
    const invoice = this.lastInvoice;
    return this.currentPlan === 'freemium' &&
      ['pending_manual', 'overdue'].includes(String(invoice?.status || '').toLowerCase()) &&
      ['manual', 'payment_link'].includes(String(invoice?.paymentMethod || '').toLowerCase()) &&
      Boolean(invoice?.paymentLink);
  }

  get currentBillingPeriodLabel(): string {
    return this.currentSubscription?.billingPeriod === 'yearly' ? 'Anual' : 'Mensual';
  }

  get billingPeriodChoiceLabel(): string {
    return this.billingPeriodChoice === 'yearly' ? 'Anual' : 'Mensual';
  }

  get selectedPeriodAmountCOP(): number {
    const monthly = this.currentPlan === 'premium'
      ? Number(this.billingInfo?.projectedAmount || 0)
      : Math.round(Number(this.selectedTier?.priceUSD || 0) * this.trm);
    return this.billingPeriodChoice === 'yearly' ? Math.round(monthly * 12 * 0.8) : monthly;
  }

  get annualAmountUSD(): number {
    const monthly = this.billingMonthlyUSD;
    return Math.round(monthly * 12 * 0.8 * 100) / 100;
  }

  get billingMonthlyUSD(): number {
    return this.currentPlan === 'premium'
      ? Number(this.billingInfo?.projectedAmountUSD || 0)
      : Number(this.selectedTier?.priceUSD || 0);
  }

  get canManageBillingPeriod(): boolean {
    return this.currentPlan === 'premium' && this.billingInfo?.billableSubscription === true;
  }

  get billingModeSummary(): string {
    return this.billingInfo?.billingMode === 'manual'
      ? 'Recibirás la cuenta de cobro y sus recordatorios por correo; guardar aquí no hace un débito automático.'
      : 'El cobro se intentará automáticamente con tu medio de pago autorizado.';
  }

  invoiceStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      paid: 'Pagado',
      awaiting_confirmation: 'Confirmando con Wompi',
      processing: 'Procesando',
      failed: 'Pago fallido',
      pending_manual: 'Pendiente de pago',
      overdue: 'Vencida',
      custom: 'Gestión personalizada'
    };
    return labels[String(status || '').toLowerCase()] || 'Pendiente';
  }

  invoiceDate(invoice: any): Date | null {
    const value = invoice?.paidAt || invoice?.createdAt || invoice?.dueDate;
    if (!value) return null;
    if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  invoiceGraceDeadline(invoice: any): Date | null {
    const value = invoice?.manualGraceDeadline || invoice?.graceDeadline;
    if (!value) return null;
    if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  loadBillingInfo(): void {
    this.billingLoading = true;
    this.subscriptionService.getBillingInfo().subscribe({
      next: (data: any) => {
        this.billingInfo = data;
        if (Array.isArray(data?.tiers) && data.tiers.length) {
          const presentation = new Map(this.tiers.map(tier => [tier.id, tier]));
          this.tiers = data.tiers.map((tier: any) => ({
            ...(presentation.get(tier.id) || {}),
            ...tier,
            maxSalesCOP: tier.custom ? null : Number(tier.maxSalesCOP)
          }));
        }

        const currentIndex = this.tiers.findIndex(tier => tier.id === data?.currentTier);
        this.selectedTierIndex = currentIndex >= 0 ? currentIndex : 0;
        this.billingPeriodChoice = data?.pendingBillingPeriod ||
          (data?.billingPeriod === 'yearly' ? 'yearly' : this.billingPeriodChoice);
        this.billingLoading = false;
      },
      error: () => { this.billingLoading = false; }
    });
  }

  refreshBillingState(): void {
    this.loadBillingInfo();
    this.subscriptionService.loadSubscriptionStatus().subscribe({ error: () => undefined });
  }

  selectTier(index: number): void {
    const normalized = Number(index);
    if (!Number.isFinite(normalized)) return;
    this.selectedTierIndex = Math.max(0, Math.min(Math.round(normalized), this.tiers.length - 1));
  }

  setCurrency(currency: PricingCurrency): void {
    this.currency = currency;
  }

  tierSalesLabel(tier: PricingTier): string {
    if (tier.custom || !tier.maxSalesCOP) return 'Más de $500M COP al mes';
    return `Hasta $${tier.maxSalesCOP / 1000000}M COP al mes`;
  }

  tierShortLabel(tier: PricingTier): string {
    if (tier.custom || !tier.maxSalesCOP) return '$500M+';
    return `$${tier.maxSalesCOP / 1000000}M`;
  }

  tierPrice(tier: PricingTier): string {
    if (tier.custom) return 'A medida';
    if (this.currency === 'USD') return `$${tier.priceUSD}`;
    return `$${Math.round(tier.priceUSD * this.trm).toLocaleString('es-CO')}`;
  }

  tierCurrencyLabel(tier: PricingTier): string {
    if (tier.custom) return 'Contacta a nuestro equipo';
    return this.currency === 'USD' ? 'USD / mes' : 'COP / mes aprox.';
  }

  isCurrentTier(tierId: string): boolean {
    return this.currentPlan !== 'freemium' && this.billingInfo?.currentTier === tierId;
  }

  activarPlan(): void {
    if (!this.subscriptionStateReady || this.billingLoading || !this.billingInfo) return;
    if (this.hasOutstandingManualInvoice) {
      document.getElementById('billing-receipt-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (this.currentPlan === 'premium') {
      if (this.canManageBillingPeriod) {
        document.getElementById('billing-period-settings')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    this.showUpgradeModal = true;
  }

  chooseBillingPeriod(period: 'monthly' | 'yearly'): void {
    if (this.billingPeriodSaving) return;
    this.billingPeriodChoice = period;
    this.billingPeriodMessage = '';
    this.billingPeriodError = '';
  }

  saveBillingPeriod(): void {
    if (this.currentPlan !== 'premium' || this.billingPeriodSaving) return;
    this.billingPeriodSaving = true;
    this.billingPeriodMessage = '';
    this.billingPeriodError = '';
    this.subscriptionService.updateBillingPeriod(this.billingPeriodChoice).subscribe({
      next: (response: any) => {
        this.billingPeriodSaving = false;
        this.billingPeriodMessage = response?.message || 'Periodicidad actualizada para el próximo cobro.';
        this.loadBillingInfo();
      },
      error: (error: any) => {
        this.billingPeriodSaving = false;
        this.billingPeriodError = error?.error?.message || 'No pudimos actualizar la periodicidad.';
      }
    });
  }

  get primaryBillingActionLabel(): string {
    if (!this.subscriptionStateReady) return 'Cargando tu plan…';
    if (this.hasOutstandingManualInvoice) return 'Pagar cuenta pendiente';
    if (this.currentPlan === 'premium' && !this.canManageBillingPeriod) return 'Plan Premium activo';
    return this.currentPlan === 'premium' ? 'Administrar facturación' : 'Activar plan pago';
  }

  contactarVentas(): void {
    window.location.href = 'mailto:soporte@katuq.com?subject=Plan%20Cumbre%20de%20Katuq';
  }
}
