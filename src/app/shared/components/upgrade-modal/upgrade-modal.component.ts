import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SubscriptionService } from '../../services/subscription.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-upgrade-modal',
  templateUrl: './upgrade-modal.component.html',
  styleUrls: ['./upgrade-modal.component.scss']
})
export class UpgradeModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  loading = false;
  step: 'info' | 'card' | 'success' = 'info';

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
  cardError = '';

  constructor(
    private http: HttpClient,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.step = 'info';
      this.resetForm();
    }
  }

  // Paso 1: Usuario acepta y va a registrar tarjeta
  goToCardStep(): void {
    this.step = 'card';
    this.loadAcceptanceTokens();
  }

  // Cargar acceptance tokens desde Wompi (public key — seguro en frontend)
  private loadAcceptanceTokens(): void {
    const publicKey = environment.wompi.public_key;
    this.http.get<any>(`https://production.wompi.co/v1/merchants/${publicKey}`)
      .subscribe({
        next: (resp) => {
          const presigned = resp?.data?.presigned_acceptance;
          if (presigned) {
            this.acceptanceToken = presigned.acceptance_token;
            this.policyLink = presigned.permalink;

            // Personal auth puede venir como campo separado
            const personalAuth = resp?.data?.presigned_personal_data_auth;
            if (personalAuth) {
              this.personalAuthToken = personalAuth.acceptance_token;
              this.personalDataLink = personalAuth.permalink;
            } else {
              // Algunos merchants no tienen personal auth separado
              this.personalAuthToken = this.acceptanceToken;
              this.personalDataLink = this.policyLink;
            }
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
    if (!this.acceptedPolicy || !this.acceptedPersonalData) {
      this.cardError = 'Debes aceptar los términos y la política de datos personales';
      return;
    }

    this.loading = true;
    this.cardError = '';

    try {
      // 2a. Tokenizar tarjeta (frontend → Wompi con public key)
      const publicKey = environment.wompi.public_key;
      const tokenResp = await this.http.post<any>(
        'https://production.wompi.co/v1/tokens/cards',
        {
          number: this.cardNumber.replace(/\s/g, ''),
          exp_month: this.cardExpMonth.padStart(2, '0'),
          exp_year: this.cardExpYear,
          cvc: this.cardCvc,
          card_holder: this.cardHolder.toUpperCase()
        },
        { headers: { Authorization: `Bearer ${publicKey}` } }
      ).toPromise();

      if (!tokenResp?.data?.id) {
        throw new Error('No se pudo tokenizar la tarjeta');
      }

      const cardToken = tokenResp.data.id;
      const cardBrand = tokenResp.data.brand;
      const cardLastFour = tokenResp.data.last_four;

      // 2b. Enviar token al backend para crear payment source (private key en servidor)
      const sourceResp = await this.http.post<any>(
        `${environment.urlApi}/v1/subscriptions/create-payment-source`,
        {
          token: cardToken,
          acceptanceToken: this.acceptanceToken,
          personalAuthToken: this.personalAuthToken,
          cardBrand,
          cardLastFour
        }
      ).toPromise();

      if (!sourceResp?.success) {
        throw new Error(sourceResp?.error || 'Error al registrar medio de pago');
      }

      // 2c. Activar plan pago
      await this.subscriptionService.upgradePlan('premium' as any).toPromise();
      this.subscriptionService.loadSubscriptionStatus().subscribe();

      this.step = 'success';
      this.loading = false;

    } catch (err: any) {
      this.loading = false;
      this.cardError = err?.error?.message || err?.message || 'Error al procesar la tarjeta';
    }
  }

  private validateCard(): boolean {
    const num = this.cardNumber.replace(/\s/g, '');
    if (num.length < 13 || num.length > 19) {
      this.cardError = 'Número de tarjeta inválido';
      return false;
    }
    if (!this.cardExpMonth || !this.cardExpYear) {
      this.cardError = 'Fecha de expiración requerida';
      return false;
    }
    if (this.cardCvc.length < 3) {
      this.cardError = 'CVC inválido';
      return false;
    }
    if (this.cardHolder.length < 3) {
      this.cardError = 'Nombre del titular requerido';
      return false;
    }
    return true;
  }

  skipCard(): void {
    // Activar plan sin tarjeta — recibirá links de pago por email
    this.loading = true;
    this.subscriptionService.upgradePlan('premium' as any).subscribe({
      next: () => {
        this.subscriptionService.loadSubscriptionStatus().subscribe();
        this.step = 'success';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.cardError = 'Error al activar plan';
      }
    });
  }

  private resetForm(): void {
    this.cardNumber = '';
    this.cardExpMonth = '';
    this.cardExpYear = '';
    this.cardCvc = '';
    this.cardHolder = '';
    this.cardError = '';
    this.acceptedPolicy = false;
    this.acceptedPersonalData = false;
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
