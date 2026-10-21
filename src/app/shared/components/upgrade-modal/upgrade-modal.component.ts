import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SubscriptionService } from '../../services/subscription.service';
import { Subject, timer } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
import {
  detectCardBrand,
  encryptCardDataForWompi,
  formatCardNumber,
  isValidCardHolder,
  isValidCvc,
  isValidExpiry,
  isValidReceiptEmail,
  onlyDigits,
  passesLuhn,
  WompiCardBrand,
} from '../../utils/wompi-card-security.utils';

@Component({
  selector: 'app-upgrade-modal',
  templateUrl: './upgrade-modal.component.html',
  styleUrls: ['./upgrade-modal.component.scss']
})
export class UpgradeModalComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() mode: 'upgrade' | 'replace' = 'upgrade';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() completed = new EventEmitter<void>();

  loading = false;
  configLoading = false;
  securityLoading = false;
  securityReady = false;
  termsReady = false;
  step: 'info' | 'card' | 'pending' | 'success' = 'info';
  pendingMessage = 'shell.upgrade.msg.waiting';
  paymentEnvironment: 'sandbox' | 'production' | null = null;
  productionTestCharge = false;
  initialAmountCOP: number | null = null;
  tierName = 'Base';
  billingPeriod: 'monthly' | 'yearly' = 'monthly';
  annualDiscountPercent = 20;
  private destroy$ = new Subject<void>();
  private stopPaymentPolling$ = new Subject<void>();
  private wompiApiUrl = '';
  private wompiPublicKey = '';
  private wompiTokenizationPublicKeyPem = '';
  private paymentQuoteId = '';

  // Wompi acceptance tokens
  acceptanceToken: string | null = null;
  personalAuthToken: string | null = null;
  policyLink = '';
  personalDataLink = '';
  acceptedPolicy = false;
  acceptedPersonalData = false;

  // Card form
  cardNumber = '';
  cardExpMonth = '';
  cardExpYear = '';
  cardCvc = '';
  cardHolder = '';
  cardBrand: WompiCardBrand = 'unknown';
  receiptEmail = '';
  cardError = '';
  receiptEmailError = '';
  cardNumberError = '';
  expiryError = '';
  cardCvcError = '';
  cardHolderError = '';

  constructor(
    private subscriptionService: SubscriptionService,
    private translate: TranslateService
  ) {}

  get paymentButtonLabel(): string {
    if (this.mode === 'replace') return this.translate.instant('shell.upgrade.button.saveCard');
    return this.initialAmountCOP
      ? this.translate.instant('shell.upgrade.button.payAmount', { amount: this.initialAmountCOP.toLocaleString('es-CO') })
      : this.translate.instant('shell.upgrade.button.payActivate');
  }

  get isSandboxPayment(): boolean {
    return this.paymentEnvironment === 'sandbox';
  }

  get isReplacementMode(): boolean {
    return this.mode === 'replace';
  }

  get billingPeriodLabel(): string {
    return this.billingPeriod === 'yearly' ? 'anual' : 'mensual';
  }

  get renewalLabel(): string {
    return this.billingPeriod === 'yearly'
      ? 'renovación automática cada 12 meses'
      : 'renovación mensual automática';
  }

  selectBillingPeriod(period: 'monthly' | 'yearly'): void {
    if (this.billingPeriod === period || this.configLoading || this.loading) return;
    this.billingPeriod = period;
    this.loadPaymentConfig();
  }

  get cardBrandLabel(): string {
    const labels: Record<WompiCardBrand, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      unknown: 'shell.upgrade.card.brandUnknown',
    };
    return labels[this.cardBrand];
  }

  get cardCvcMaxLength(): number {
    return this.cardBrand === 'amex' ? 4 : 3;
  }

  get isCardNumberValid(): boolean {
    return passesLuhn(this.cardNumber);
  }

  get isCardFormValid(): boolean {
    return isValidReceiptEmail(this.receiptEmail) &&
      this.isCardNumberValid &&
      isValidExpiry(this.cardExpMonth, this.cardExpYear) &&
      isValidCvc(this.cardCvc, this.cardBrand) &&
      isValidCardHolder(this.cardHolder);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] && changes['visible'].currentValue === true) ||
        (changes['mode'] && this.visible)) {
      this.step = 'info';
      this.resetForm();
      this.loadPaymentConfig();
    }
  }

  ngOnDestroy(): void {
    this.stopPaymentPolling$.next();
    this.stopPaymentPolling$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Paso 1: Usuario acepta y va a registrar tarjeta
  goToCardStep(): void {
    if (!this.wompiApiUrl || !this.wompiPublicKey ||
        (this.mode === 'upgrade' && !this.initialAmountCOP)) {
      this.cardError = 'shell.upgrade.msg.waitConfig';
      return;
    }
    this.step = 'card';
    this.fetchAcceptanceTokens();
  }

  // El backend es la única fuente de verdad para ambiente y monto. Así un
  // localhost con llaves productivas nunca muestra el precio reducido de test.
  private loadPaymentConfig(messageAfterLoad = ''): void {
    this.configLoading = true;
    this.cardError = '';
    this.initialAmountCOP = null;
    this.paymentQuoteId = '';
    this.securityReady = false;
    this.subscriptionService.getPaymentConfig(this.billingPeriod).subscribe({
      next: (config) => {
        this.configLoading = false;
        const allowedApiUrls = [
          'https://sandbox.wompi.co/v1',
          'https://production.wompi.co/v1'
        ];
        if (!config?.publicKey || !allowedApiUrls.includes(config.apiUrl) || !config.initialAmountCOP ||
            !config.quoteId || !config.quoteExpiresAt ||
            !String(config.tokenizationPublicKey || '').includes('BEGIN PUBLIC KEY')) {
          this.cardError = 'shell.upgrade.msg.notConfigured';
          return;
        }

        this.wompiApiUrl = config.apiUrl;
        this.wompiPublicKey = config.publicKey;
        this.paymentEnvironment = config.environment;
        this.productionTestCharge = config.environment === 'production' && config.testCharge === true;
        this.initialAmountCOP = config.initialAmountCOP;
        this.paymentQuoteId = config.quoteId;
        this.billingPeriod = config.billingPeriod;
        this.annualDiscountPercent = Number(config.annualDiscountPercent || 0);
        this.tierName = config.tierName || 'Base';
        this.wompiTokenizationPublicKeyPem = config.tokenizationPublicKey;
        this.securityReady = true;
        if (messageAfterLoad) this.cardError = messageAfterLoad;
      },
      error: () => {
        this.configLoading = false;
        this.cardError = 'shell.upgrade.msg.notConfigured';
      }
    });
  }

  private fetchAcceptanceTokens(): void {
    this.termsReady = false;
    this.subscriptionService.getWompiMerchant(this.wompiApiUrl, this.wompiPublicKey)
      .subscribe({
        next: (resp) => {
          const presigned = resp?.data?.presigned_acceptance;
          const personalAuth = resp?.data?.presigned_personal_data_auth;
          if (presigned?.acceptance_token && presigned?.permalink &&
              personalAuth?.acceptance_token && personalAuth?.permalink) {
            this.acceptanceToken = presigned.acceptance_token;
            this.policyLink = presigned.permalink;
            this.personalAuthToken = personalAuth.acceptance_token;
            this.personalDataLink = personalAuth.permalink;
            this.termsReady = true;
          } else {
            this.cardError = 'shell.upgrade.msg.noAuthorizations';
          }
        },
        error: () => {
          this.cardError = 'shell.upgrade.msg.termsError';
        }
      });
  }

  // Paso 2: Tokenizar tarjeta y crear payment source
  async submitCard(): Promise<void> {
    if (!this.validateCard()) return;
    if (!this.acceptedPolicy || !this.acceptedPersonalData || !this.termsReady) {
      this.cardError = 'shell.upgrade.msg.acceptTerms';
      return;
    }
    if (!this.securityReady || !this.wompiTokenizationPublicKeyPem ||
        (this.mode === 'upgrade' && !this.paymentQuoteId)) {
      this.cardError = 'shell.upgrade.msg.securityNotReady';
      return;
    }

    this.loading = true;
    this.cardError = '';

    try {
      // 2a. Cifrar como JWE y tokenizar directamente en Wompi. La petición
      // nunca contiene PAN/CVC legibles y el backend de Katuq solo ve el token.
      if (!this.wompiApiUrl || !this.wompiPublicKey) {
        throw new Error('shell.upgrade.msg.notConfigured');
      }
      const encryptedPayload = await encryptCardDataForWompi({
        number: onlyDigits(this.cardNumber, 19),
        exp_month: onlyDigits(this.cardExpMonth, 2).padStart(2, '0'),
        exp_year: onlyDigits(this.cardExpYear, 2),
        cvc: onlyDigits(this.cardCvc, 4),
        card_holder: this.cardHolder.trim().toUpperCase(),
      }, this.wompiTokenizationPublicKeyPem);
      const tokenResp = await this.subscriptionService.tokenizeWompiEncryptedCard(
        this.wompiApiUrl,
        this.wompiPublicKey,
        encryptedPayload,
      ).toPromise();

      if (!tokenResp?.data?.id) {
        throw new Error('shell.upgrade.msg.tokenizeError');
      }

      const cardToken = tokenResp.data.id;
      const cardBrand = tokenResp.data.brand;
      const cardLastFour = tokenResp.data.last_four;
      this.clearSensitiveCardFields();

      // 2b. Enviar token al backend para crear payment source (private key en servidor)
      const paymentPayload = {
          token: cardToken,
          acceptanceToken: this.acceptanceToken,
          personalAuthToken: this.personalAuthToken,
          cardBrand,
          cardLastFour,
          receiptEmail: this.receiptEmail.trim().toLowerCase(),
      };
      const sourceResp = await (this.mode === 'replace'
        ? this.subscriptionService.replaceRecurringPaymentSource(paymentPayload)
        : this.subscriptionService.createRecurringPaymentSource({
          ...paymentPayload,
          billingPeriod: this.billingPeriod,
          quoteId: this.paymentQuoteId,
        })).toPromise();

      if (!sourceResp?.success) {
        throw new Error(sourceResp?.error || 'shell.upgrade.msg.sourceError');
      }

      if (this.mode === 'replace') {
        this.loading = false;
        this.subscriptionService.refresh();
        this.completed.emit();
        this.step = 'success';
        return;
      }

      // El backend realiza el primer cobro. El plan permanece Gratis hasta que
      // el webhook de Wompi confirme que la transacción fue aprobada.
      if (!sourceResp.subscriptionId) {
        throw new Error('shell.upgrade.msg.noSubscriptionId');
      }

      this.step = 'pending';
      this.loading = false;
      this.waitForPaymentConfirmation(sourceResp.subscriptionId);

    } catch (err: any) {
      this.loading = false;
      const message = this.friendlyPaymentError(err);
      const errorCode = String(err?.error?.error || '').toUpperCase();
      // La cotización se consume antes de crear la fuente/cobro. Si Wompi ya
      // devolvió un rechazo terminal, pedimos una nueva cotización y dejamos
      // el formulario listo para que el comercio reintente sin soporte.
      if (this.mode === 'upgrade' &&
          ['PAYMENT_NOT_APPROVED', 'INITIAL_CHARGE_ERROR', 'PAYMENT_METHOD_REVIEW_REQUIRED',
            'PAYMENT_SOURCE_ERROR', 'PAYMENT_QUOTE_EXPIRED'].includes(errorCode)) {
        this.loadPaymentConfig(message);
      } else {
        this.cardError = message;
      }
    }
  }

  private validateCard(): boolean {
    this.validateReceiptEmail();
    this.validateCardNumber();
    this.validateExpiry();
    this.validateCvc();
    this.validateHolder();
    this.cardError = this.isCardFormValid ? '' : 'shell.upgrade.msg.reviewFields';
    return this.isCardFormValid;
  }

  onReceiptEmailInput(value: string): void {
    this.receiptEmail = String(value || '').trimStart().slice(0, 254);
    if (this.receiptEmailError) this.validateReceiptEmail();
  }

  onCardNumberInput(value: string): void {
    this.cardNumber = formatCardNumber(value);
    this.cardBrand = detectCardBrand(this.cardNumber);
    this.cardCvc = onlyDigits(this.cardCvc, this.cardCvcMaxLength);
    if (onlyDigits(this.cardNumber, 19).length >= 13) this.validateCardNumber();
    if (this.cardCvc) this.validateCvc();
  }

  onExpiryMonthInput(value: string): void {
    this.cardExpMonth = onlyDigits(value, 2);
    if (this.cardExpMonth.length === 2 && this.cardExpYear.length === 2) this.validateExpiry();
  }

  onExpiryYearInput(value: string): void {
    this.cardExpYear = onlyDigits(value, 2);
    if (this.cardExpMonth.length === 2 && this.cardExpYear.length === 2) this.validateExpiry();
  }

  onCvcInput(value: string): void {
    this.cardCvc = onlyDigits(value, this.cardCvcMaxLength);
    if (this.cardCvc.length === this.cardCvcMaxLength) this.validateCvc();
  }

  onCardHolderInput(value: string): void {
    this.cardHolder = String(value || '')
      .toUpperCase()
      .replace(/[^A-ZÁÉÍÓÚÜÑ .'-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 80);
    if (this.cardHolderError) this.validateHolder();
  }

  validateReceiptEmail(): void {
    this.receiptEmailError = isValidReceiptEmail(this.receiptEmail)
      ? ''
      : 'shell.upgrade.msg.invalidEmail';
  }

  validateCardNumber(): void {
    const digits = onlyDigits(this.cardNumber, 19);
    this.cardNumberError = digits.length < 13 || digits.length > 19
      ? 'shell.upgrade.msg.numberLength'
      : passesLuhn(digits) ? '' : 'shell.upgrade.msg.numberInvalid';
  }

  validateExpiry(): void {
    this.expiryError = isValidExpiry(this.cardExpMonth, this.cardExpYear)
      ? ''
      : 'shell.upgrade.msg.expiryInvalid';
  }

  validateCvc(): void {
    this.cardCvcError = isValidCvc(this.cardCvc, this.cardBrand)
      ? ''
      : this.cardBrand === 'amex' ? 'shell.upgrade.msg.cvcAmex' : 'shell.upgrade.msg.cvcLength';
  }

  validateHolder(): void {
    this.cardHolderError = isValidCardHolder(this.cardHolder)
      ? ''
      : 'shell.upgrade.msg.holderInvalid';
  }

  private clearSensitiveCardFields(): void {
    this.cardNumber = '';
    this.cardExpMonth = '';
    this.cardExpYear = '';
    this.cardCvc = '';
    this.cardHolder = '';
    this.cardBrand = 'unknown';
  }

  private friendlyPaymentError(error: any): string {
    const errorCode = String(error?.error?.error?.type || error?.error?.error || '').toUpperCase();
    if (errorCode.includes('CARD') || errorCode.includes('UNPROCESSABLE')) {
      return 'shell.upgrade.msg.cardRejected';
    }
    if (error?.status === 0) {
      return 'shell.upgrade.msg.connectionError';
    }
    return error?.error?.message || error?.message || 'shell.upgrade.msg.paymentError';
  }

  private waitForPaymentConfirmation(subscriptionId: string): void {
    this.stopPaymentPolling$.next();
    this.pendingMessage = 'shell.upgrade.msg.waiting';

    timer(0, 1500).pipe(
      take(20),
      takeUntil(this.stopPaymentPolling$),
      takeUntil(this.destroy$),
      switchMap(() => this.subscriptionService.getPaymentStatus(subscriptionId))
    ).subscribe({
      next: (status) => {
        if (status.activated) {
          this.stopPaymentPolling$.next();
          this.subscriptionService.refresh();
          this.step = 'success';
          return;
        }

        if (['failed', 'declined', 'error', 'voided'].includes(String(status.paymentStatus).toLowerCase())) {
          this.stopPaymentPolling$.next();
          this.step = 'card';
          this.loadPaymentConfig('shell.upgrade.msg.paymentDeclined');
        }
      },
      error: () => {
        this.pendingMessage = 'shell.upgrade.msg.stillVerifyingClose';
      },
      complete: () => {
        if (this.step === 'pending') {
          this.pendingMessage = 'shell.upgrade.msg.stillVerifyingFree';
        }
      }
    });
  }

  private resetForm(): void {
    this.cardNumber = '';
    this.cardExpMonth = '';
    this.cardExpYear = '';
    this.cardCvc = '';
    this.cardHolder = '';
    this.cardBrand = 'unknown';
    this.receiptEmail = this.getDefaultReceiptEmail();
    this.cardError = '';
    this.receiptEmailError = '';
    this.cardNumberError = '';
    this.expiryError = '';
    this.cardCvcError = '';
    this.cardHolderError = '';
    this.pendingMessage = 'shell.upgrade.msg.waiting';
    this.wompiApiUrl = '';
    this.wompiPublicKey = '';
    this.wompiTokenizationPublicKeyPem = '';
    this.paymentQuoteId = '';
    this.securityLoading = false;
    this.securityReady = false;
    this.termsReady = false;
    this.paymentEnvironment = null;
    this.productionTestCharge = false;
    this.initialAmountCOP = null;
    this.tierName = 'Base';
    this.billingPeriod = 'monthly';
    this.annualDiscountPercent = 20;
    this.acceptedPolicy = false;
    this.acceptedPersonalData = false;
  }

  private getDefaultReceiptEmail(): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return typeof user.email === 'string' ? user.email : '';
    } catch {
      return '';
    }
  }

  closeModal(): void {
    this.stopPaymentPolling$.next();
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
