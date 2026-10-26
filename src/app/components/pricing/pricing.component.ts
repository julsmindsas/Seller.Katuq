import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SubscriptionService } from '../../shared/services/subscription.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

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
  upgradeModalMode: 'upgrade' | 'replace' = 'upgrade';
  billingInfo: any = null;
  billingLoading = false;
  currency: PricingCurrency = 'USD';
  selectedTierIndex = 0;
  billingPeriodChoice: 'monthly' | 'yearly' = 'monthly';
  billingPeriodSaving = false;
  billingPeriodMessage = '';
  billingPeriodError = '';
  cancellingSubscription = false;
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
    { icon: 'pi-shopping-cart', title: 'pricing.paid.orders.title', text: 'pricing.paid.orders.text' },
    { icon: 'pi-users', title: 'pricing.paid.users.title', text: 'pricing.paid.users.text' },
    { icon: 'pi-bolt', title: 'pricing.paid.kai.title', text: 'pricing.paid.kai.text' },
    { icon: 'pi-chart-bar', title: 'pricing.paid.reports.title', text: 'pricing.paid.reports.text' },
    { icon: 'pi-box', title: 'pricing.paid.inventory.title', text: 'pricing.paid.inventory.text' },
    { icon: 'pi-truck', title: 'pricing.paid.logistics.title', text: 'pricing.paid.logistics.text' },
    { icon: 'pi-link', title: 'pricing.paid.integrations.title', text: 'pricing.paid.integrations.text' },
    { icon: 'pi-cog', title: 'pricing.paid.automation.title', text: 'pricing.paid.automation.text' }
  ];

  readonly freeFeatures = [
    { text: 'pricing.free.orders', enabled: true },
    { text: 'pricing.free.warehouseUsers', enabled: true },
    { text: 'pricing.free.catalog', enabled: true },
    { text: 'pricing.free.integration', enabled: true },
    { text: 'pricing.free.kaiQueries', enabled: true },
    { text: 'pricing.free.aiProducts', enabled: true },
    { text: 'pricing.free.production', enabled: false }
  ];

  constructor(private subscriptionService: SubscriptionService, private translate: TranslateService) {}

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
    if (!this.subscriptionStateReady) return this.translate.instant('comun.cargando');
    if (this.currentPlan === 'freemium') return this.translate.instant('pricing.plan.free');
    return this.billingInfo?.currentTierName || this.translate.instant('pricing.plan.paid');
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
    return this.translate.instant(this.currentSubscription?.billingPeriod === 'yearly' ? 'pricing.period.yearly' : 'pricing.period.monthly');
  }

  get billingPeriodChoiceLabel(): string {
    return this.translate.instant(this.billingPeriodChoice === 'yearly' ? 'pricing.period.yearly' : 'pricing.period.monthly');
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

  get canManagePaymentMethod(): boolean {
    return this.currentPlan === 'premium' &&
      this.billingInfo?.billableSubscription === true &&
      this.billingInfo?.billingMode === 'recurring';
  }

  get savedPaymentMethodLabel(): string {
    const method = this.billingInfo?.paymentMethod;
    if (!method) return this.translate.instant('pricing.card.authorized');
    const brand = method.brand || this.translate.instant('pricing.card.default');
    return method.lastFour ? this.translate.instant('pricing.card.endingIn', { brand, lastFour: method.lastFour }) : brand;
  }

  get billingModeSummary(): string {
    return this.translate.instant(this.billingInfo?.billingMode === 'manual' ? 'pricing.period.modeManual' : 'pricing.period.modeAuto');
  }

  invoiceStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      paid: 'pricing.receipt.status.paid',
      awaiting_confirmation: 'pricing.receipt.status.awaiting_confirmation',
      processing: 'pricing.receipt.status.processing',
      failed: 'pricing.receipt.status.failed',
      pending_manual: 'pricing.receipt.status.pending_manual',
      overdue: 'pricing.receipt.status.overdue',
      custom: 'pricing.receipt.status.custom'
    };
    return this.translate.instant(labels[String(status || '').toLowerCase()] || 'pricing.receipt.status.pending');
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
    if (tier.custom || !tier.maxSalesCOP) return this.translate.instant('pricing.tiers.salesOver');
    return this.translate.instant('pricing.tiers.salesUpTo', { limit: tier.maxSalesCOP / 1000000 });
  }

  tierShortLabel(tier: PricingTier): string {
    if (tier.custom || !tier.maxSalesCOP) return '$500M+';
    return `$${tier.maxSalesCOP / 1000000}M`;
  }

  tierPrice(tier: PricingTier): string {
    if (tier.custom) return this.translate.instant('pricing.tiers.custom');
    if (this.currency === 'USD') return `$${tier.priceUSD}`;
    return `$${Math.round(tier.priceUSD * this.trm).toLocaleString('es-CO')}`;
  }

  tierCurrencyLabel(tier: PricingTier): string {
    if (tier.custom) return this.translate.instant('pricing.tiers.contactTeam');
    return this.translate.instant(this.currency === 'USD' ? 'pricing.tiers.usdMonth' : 'pricing.tiers.copMonth');
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
    this.upgradeModalMode = 'upgrade';
    this.showUpgradeModal = true;
  }

  managePaymentMethod(): void {
    if (!this.canManagePaymentMethod || this.cancellingSubscription) return;
    this.upgradeModalMode = 'replace';
    this.showUpgradeModal = true;
  }

  onPaymentMethodUpdated(): void {
    this.loadBillingInfo();
  }

  async cancelPaidPlan(): Promise<void> {
    if (this.currentPlan !== 'premium' || this.cancellingSubscription) return;
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: this.translate.instant('pricing.cancel.title'),
      html: this.translate.instant('pricing.cancel.text'),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('pricing.cancel.confirm'),
      cancelButtonText: this.translate.instant('pricing.cancel.keep'),
      confirmButtonColor: '#b91c1c',
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    this.cancellingSubscription = true;
    this.subscriptionService.upgradePlan('freemium').subscribe({
      next: (response: any) => {
        this.cancellingSubscription = false;
        this.currentPlan = 'freemium';
        this.refreshBillingState();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('pricing.cancel.doneTitle'),
          text: response?.message || this.translate.instant('pricing.cancel.doneText'),
          confirmButtonText: this.translate.instant('comun.entendido'),
        });
      },
      error: (error: any) => {
        this.cancellingSubscription = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('pricing.cancel.failedTitle'),
          text: error?.error?.message || this.translate.instant('pricing.cancel.failedText'),
          confirmButtonText: this.translate.instant('comun.entendido'),
        });
      },
    });
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
        this.billingPeriodMessage = response?.message || this.translate.instant('pricing.period.updated');
        this.loadBillingInfo();
      },
      error: (error: any) => {
        this.billingPeriodSaving = false;
        this.billingPeriodError = error?.error?.message || this.translate.instant('pricing.period.updateFailed');
      }
    });
  }

  get primaryBillingActionLabel(): string {
    if (!this.subscriptionStateReady) return this.translate.instant('pricing.action.loading');
    if (this.hasOutstandingManualInvoice) return this.translate.instant('pricing.action.payPending');
    if (this.currentPlan === 'premium' && !this.canManageBillingPeriod) return this.translate.instant('pricing.action.premiumActive');
    return this.translate.instant(this.currentPlan === 'premium' ? 'pricing.action.manageBilling' : 'pricing.action.activate');
  }

  contactarVentas(): void {
    window.location.href = 'mailto:soporte@katuq.com?subject=Plan%20Cumbre%20de%20Katuq';
  }
}
