import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
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
  @Output() visibleChange = new EventEmitter<boolean>();

  loading = false;
  configLoading = false;
  securityLoading = false;
  securityReady = false;
  termsReady = false;
  step: 'info' | 'card' | 'pending' | 'success' = 'info';
  pendingMessage = 'Estamos esperando la confirmación segura de Wompi.';
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

  constructor(private subscriptionService: SubscriptionService) {}

  get paymentButtonLabel(): string {
    return this.initialAmountCOP
      ? `Pagar $${this.initialAmountCOP.toLocaleString('es-CO')} COP`
      : 'Pagar y activar';
  }

  get isSandboxPayment(): boolean {
    return this.paymentEnvironment === 'sandbox';
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
      unknown: 'Tarjeta',
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
    if (changes['visible'] && changes['visible'].currentValue === true) {
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
    if (!this.wompiApiUrl || !this.wompiPublicKey || !this.initialAmountCOP) {
      this.cardError = 'Espera mientras confirmamos el valor y la conexión segura con Wompi.';
      return;
    }
    this.step = 'card';
    this.fetchAcceptanceTokens();
  }

  // El backend es la única fuente de verdad para ambiente y monto. Así un
  // localhost con llaves productivas nunca muestra el precio reducido de test.
  private loadPaymentConfig(): void {
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
          this.cardError = 'Wompi no está configurado en este entorno';
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
      },
      error: () => {
        this.configLoading = false;
        this.cardError = 'Wompi no está configurado en este entorno';
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
            this.cardError = 'Wompi no entregó las autorizaciones obligatorias. No ingreses la tarjeta.';
          }
        },
        error: () => {
          this.cardError = 'No se pudieron cargar los términos de Wompi';
        }
      });
  }

  // Paso 2: Tokenizar tarjeta y crear payment source
  async submitCard(): Promise<void> {
    if (!this.validateCard()) return;
    if (!this.acceptedPolicy || !this.acceptedPersonalData || !this.termsReady) {
      this.cardError = 'Debes aceptar los términos y la política de datos personales';
      return;
    }
    if (!this.securityReady || !this.wompiTokenizationPublicKeyPem || !this.paymentQuoteId) {
      this.cardError = 'El cifrado seguro de Wompi todavía no está listo';
      return;
    }

    this.loading = true;
    this.cardError = '';

    try {
      // 2a. Cifrar como JWE y tokenizar directamente en Wompi. La petición
      // nunca contiene PAN/CVC legibles y el backend de Katuq solo ve el token.
      if (!this.wompiApiUrl || !this.wompiPublicKey) {
        throw new Error('Wompi no está configurado en este entorno');
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
        throw new Error('No se pudo tokenizar la tarjeta');
      }

      const cardToken = tokenResp.data.id;
      const cardBrand = tokenResp.data.brand;
      const cardLastFour = tokenResp.data.last_four;
      this.clearSensitiveCardFields();

      // 2b. Enviar token al backend para crear payment source (private key en servidor)
      const sourceResp = await this.subscriptionService.createRecurringPaymentSource({
          token: cardToken,
          acceptanceToken: this.acceptanceToken,
          personalAuthToken: this.personalAuthToken,
          cardBrand,
          cardLastFour,
          receiptEmail: this.receiptEmail.trim().toLowerCase(),
          billingPeriod: this.billingPeriod,
          quoteId: this.paymentQuoteId,
        }).toPromise();

      if (!sourceResp?.success) {
        throw new Error(sourceResp?.error || 'Error al registrar medio de pago');
      }

      // El backend realiza el primer cobro. El plan permanece Gratis hasta que
      // el webhook de Wompi confirme que la transacción fue aprobada.
      if (!sourceResp.subscriptionId) {
        throw new Error('No recibimos el identificador para verificar el pago');
      }

      this.step = 'pending';
      this.loading = false;
      this.waitForPaymentConfirmation(sourceResp.subscriptionId);

    } catch (err: any) {
      this.loading = false;
      this.cardError = this.friendlyPaymentError(err);
    }
  }

  private validateCard(): boolean {
    this.validateReceiptEmail();
    this.validateCardNumber();
    this.validateExpiry();
    this.validateCvc();
    this.validateHolder();
    this.cardError = this.isCardFormValid ? '' : 'Revisa los campos marcados antes de continuar';
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
      : 'Escribe un correo válido para recibir el comprobante.';
  }

  validateCardNumber(): void {
    const digits = onlyDigits(this.cardNumber, 19);
    this.cardNumberError = digits.length < 13 || digits.length > 19
      ? 'El número debe tener entre 13 y 19 dígitos.'
      : passesLuhn(digits) ? '' : 'Revisa el número: la validación de la tarjeta no coincide.';
  }

  validateExpiry(): void {
    this.expiryError = isValidExpiry(this.cardExpMonth, this.cardExpYear)
      ? ''
      : 'La fecha debe ser válida y estar vigente.';
  }

  validateCvc(): void {
    this.cardCvcError = isValidCvc(this.cardCvc, this.cardBrand)
      ? ''
      : this.cardBrand === 'amex' ? 'American Express usa 4 dígitos.' : 'El CVC debe tener 3 dígitos.';
  }

  validateHolder(): void {
    this.cardHolderError = isValidCardHolder(this.cardHolder)
      ? ''
      : 'Escribe el nombre completo tal como aparece en la tarjeta.';
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
      return 'Wompi no pudo validar la tarjeta. Revisa los datos o usa otra tarjeta.';
    }
    if (error?.status === 0) {
      return 'No pudimos conectar de forma segura con Wompi. Verifica tu conexión e intenta de nuevo.';
    }
    return error?.error?.message || error?.message || 'No pudimos procesar el pago de forma segura.';
  }

  private waitForPaymentConfirmation(subscriptionId: string): void {
    this.stopPaymentPolling$.next();
    this.pendingMessage = 'Estamos esperando la confirmación segura de Wompi.';

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
          this.cardError = 'Wompi no aprobó el pago. Revisa la tarjeta o intenta con otra.';
          this.step = 'card';
        }
      },
      error: () => {
        this.pendingMessage = 'El pago sigue en verificación. Puedes cerrar esta ventana; activaremos Premium cuando Wompi lo confirme.';
      },
      complete: () => {
        if (this.step === 'pending') {
          this.pendingMessage = 'El pago sigue en verificación. Puedes continuar usando Gratis; Premium se activará al recibir la confirmación.';
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
    this.pendingMessage = 'Estamos esperando la confirmación segura de Wompi.';
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
