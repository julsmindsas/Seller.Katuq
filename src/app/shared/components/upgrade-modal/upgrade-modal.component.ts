import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { SubscriptionService } from '../../services/subscription.service';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../../environments/environment';

interface PricingOption {
  period: 'monthly' | 'quarterly' | 'yearly';
  label: string;
  price: number;
  pricePerMonth: number;
  discount: string;
  recommended?: boolean;
}

declare const WidgetCheckout: any;

@Component({
  selector: 'app-upgrade-modal',
  templateUrl: './upgrade-modal.component.html',
  styleUrls: ['./upgrade-modal.component.scss']
})
export class UpgradeModalComponent implements OnChanges {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onClose = new EventEmitter<void>();

  loading: boolean = false;
  selectedPeriod: 'monthly' | 'quarterly' | 'yearly' | null = null;
  isFirstTime: boolean = false;
  checkingFirstTime: boolean = false;
  wompiCheckout: any = null;

  pricingOptions: PricingOption[] = [
    {
      period: 'monthly',
      label: 'Mensual',
      price: 180000,
      pricePerMonth: 180000,
      discount: '',
      recommended: false
    },
    {
      period: 'quarterly',
      label: 'Trimestral',
      price: 486000,
      pricePerMonth: 162000,
      discount: '10% descuento',
      recommended: false
    },
    {
      period: 'yearly',
      label: 'Anual',
      price: 1836000,
      pricePerMonth: 153000,
      discount: '15% descuento',
      recommended: true
    }
  ];

  constructor(
    private subscriptionService: SubscriptionService,
    private notificationService: NotificationService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // Cuando el modal se abre, verificar si es primera vez
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.checkIfFirstTimeUser();
    }
  }

  /**
   * Verificar si es primera vez que el usuario compra Premium
   */
  checkIfFirstTimeUser() {
    this.checkingFirstTime = true;
    this.subscriptionService.isFirstTimeUser().subscribe({
      next: (response) => {
        this.isFirstTime = response.isFirstTime;
        console.log(`🔍 Usuario ${this.isFirstTime ? 'PRIMERA VEZ' : 'RECURRENTE'} - Usará ${this.isFirstTime ? 'Widget' : 'Payment Link'}`);
        this.checkingFirstTime = false;
      },
      error: (error) => {
        console.error('Error checking first-time user:', error);
        // En caso de error, asumir recurrente (payment link)
        this.isFirstTime = false;
        this.checkingFirstTime = false;
      }
    });
  }

  selectPeriod(period: 'monthly' | 'quarterly' | 'yearly') {
    this.selectedPeriod = period;
  }

  /**
   * Método principal que decide qué flujo usar
   */
  async confirmUpgrade() {
    if (!this.selectedPeriod) {
      this.notificationService.error('Periodo requerido', 'Por favor selecciona un período de pago');
      return;
    }

    if (this.isFirstTime) {
      this.openWidget();
    } else {
      this.openPaymentLink();
    }
  }

  /**
   * Abrir Widget Embebido para primera vez
   */
  /**
   * Abrir Widget Wompi para usuarios de primera vez
   * 1. Crea registro de suscripción en Firestore (obtiene subscriptionId con formato SUB-)
   * 2. Calcula firma SHA256 en el backend con el subscriptionId
   * 3. Abre el widget con la configuración completa
   */
  async openWidget() {
    this.loading = true;

    try {
      const selectedOption = this.pricingOptions.find(o => o.period === this.selectedPeriod);
      if (!selectedOption) {
        throw new Error('Período no válido');
      }

      console.log('🎫 Iniciando proceso de pago con widget...');

      // PASO 1: Crear registro de suscripción en Firestore
      console.log('📝 Creando registro de suscripción en Firestore...');
      const subscriptionRecord = await this.subscriptionService
        .createSubscriptionRecord('premium', this.selectedPeriod!)
        .toPromise();

      if (!subscriptionRecord || !subscriptionRecord.subscriptionId) {
        throw new Error('No se pudo crear el registro de suscripción');
      }

      const reference = subscriptionRecord.subscriptionId;  // ✅ Usa SUB- format del backend
      const amountInCents = subscriptionRecord.amountInCents;
      const currency = 'COP';

      console.log('✅ Registro de suscripción creado:');
      console.log(`   Subscription ID: ${reference}`);
      console.log(`   Monto: ${subscriptionRecord.amount} COP (${amountInCents} centavos)`);

      // PASO 2: Obtener firma SHA256 desde el backend
      console.log('🔐 Generando firma SHA256...');
      const signatureResponse = await this.subscriptionService
        .generateWidgetSignature(reference, amountInCents, currency)
        .toPromise();

      if (!signatureResponse || !signatureResponse.signature) {
        throw new Error('No se pudo generar la firma de seguridad');
      }

      console.log(`✅ Firma recibida (ambiente: ${signatureResponse.environment})`);

      // PASO 3: Configurar y abrir widget
      const checkout = new WidgetCheckout({
        currency: currency,
        amountInCents: amountInCents,
        reference: reference,  // ✅ Reference con formato SUB- que el webhook reconocerá
        publicKey: environment.wompi.subscriptions_public_key,
        redirectUrl: `${window.location.origin}/subscription-callback`,
        signature: {
          integrity: signatureResponse.signature
        }
      });

      console.log('✅ Widget configurado correctamente');

      // Abrir widget con callback
      checkout.open((result: any) => {
        console.log('📱 Resultado del widget:', result);
        if (result.transaction?.status === 'APPROVED') {
          this.notificationService.success('Pago aprobado', 'Redirigiendo...');
          this.closeModal();

          // ✅ Redirect manual a la página de callback (el widget NO redirige automáticamente)
          window.location.href = `${window.location.origin}/subscription-callback?subscription=${reference}`;
        } else if (result.transaction?.status === 'DECLINED') {
          this.notificationService.error('Pago rechazado', 'El pago fue rechazado. Intenta con otro método.');
        } else if (result.transaction?.status === 'ERROR') {
          this.notificationService.error('Error en pago', 'Ocurrió un error procesando el pago.');
        } else {
          // Cuando el usuario cierra el widget sin completar el pago
          console.log('Widget cerrado sin completar pago');
        }
      });

      this.wompiCheckout = checkout;
      this.loading = false;

    } catch (error: any) {
      console.error('❌ Error configurando widget:', error);
      this.notificationService.error(
        'Error al abrir widget',
        error.message || 'No se pudo inicializar el widget de pago.'
      );
      this.loading = false;
    }
  }

  /**
   * Abrir Payment Link para usuarios recurrentes
   */
  async openPaymentLink() {
    this.loading = true;

    try {
      const response = await this.subscriptionService.createPaymentLink(
        'premium',
        this.selectedPeriod!
      ).toPromise();

      if (response && response.success && response.paymentLink) {
        // Abrir Wompi en nueva pestaña
        window.open(response.paymentLink, '_blank');

        this.notificationService.success('Enlace generado', 'Serás redirigido a Wompi para completar el pago.');

        // Cerrar modal después de un delay
        setTimeout(() => {
          this.closeModal();
        }, 2000);
      } else {
        throw new Error('No se recibió el enlace de pago');
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      this.notificationService.error(
        'Error al generar pago',
        error?.error?.message || 'No se pudo generar el enlace de pago. Intenta nuevamente.'
      );
    } finally {
      this.loading = false;
    }
  }

  closeModal() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.selectedPeriod = null;
    this.onClose.emit();
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }
}
