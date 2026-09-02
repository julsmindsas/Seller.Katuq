import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from '../../shared/services/subscription.service';
import { AuthService } from '../../shared/services/firebase/auth.service';

@Component({
  selector: 'app-subscription-callback',
  templateUrl: './subscription-callback.component.html',
  styleUrls: ['./subscription-callback.component.scss']
})
export class SubscriptionCallbackComponent implements OnInit {
  subscriptionId: string | null = null;
  transactionId: string | null = null;
  loading: boolean = true;
  success: boolean = false;
  failed: boolean = false;
  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener subscriptionId de query params
    this.route.queryParams.subscribe(params => {
      this.subscriptionId = params['subscription'];
      this.transactionId = params['id'] || null;

      if (this.subscriptionId) {
        this.checkSubscriptionStatus();
      } else {
        this.loading = false;
        this.success = false;
        this.message = 'No se encontró información de la suscripción.';
      }
    });
  }

  checkSubscriptionStatus(): void {
    const subscriptionId = this.subscriptionId;
    if (!subscriptionId) {
      this.loading = false;
      this.success = false;
      this.message = 'No se encontró información de la suscripción.';
      return;
    }

    // Dar tiempo para que el webhook procese el pago
    setTimeout(() => {
      // La respuesta de esta referencia de pago es la única que puede confirmar
      // el resultado. El comercio podría tener Premium por una suscripción
      // anterior y eso no significa que este pago haya sido aprobado.
      const statusRequest = this.transactionId
        ? this.subscriptionService.getPublicPaymentStatus(subscriptionId, this.transactionId)
        : this.subscriptionService.getPaymentStatus(subscriptionId);
      statusRequest.subscribe({
        next: (payment) => {
          this.loading = false;
          const paymentStatus = String(payment.paymentStatus || '').toLowerCase();

          if (payment.activated === true) {
            this.success = true;
            this.failed = false;
            this.message = '¡Tu suscripción Premium ha sido activada exitosamente!';
          } else if (['failed', 'declined', 'error', 'voided'].includes(paymentStatus)) {
            this.success = false;
            this.failed = true;
            this.message = 'Wompi no aprobó este pago. Revisa el medio de pago e intenta nuevamente.';
          } else {
            this.success = false;
            this.failed = false;
            this.message = 'Tu pago está siendo procesado. Recibirás un correo de confirmación pronto.';
          }

          // Refrescar el estado global solo después de decidir con el pago
          // consultado; su plan nunca participa en esta decisión.
          if (this.authService.isLoggedIn) {
            this.subscriptionService.loadSubscriptionStatus().subscribe({ error: () => undefined });
            this.subscriptionService.getUsageStats().subscribe({ error: () => undefined });
          }
        },
        error: (error) => {
          console.error('Error loading payment status:', error);
          this.loading = false;
          this.success = false;
          this.failed = true;
          this.message = 'Hubo un error al verificar este pago. Por favor intenta nuevamente o contacta soporte.';
        }
      });
    }, 3000); // Esperar 3 segundos para que el webhook procese
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  retryCheck(): void {
    this.loading = true;
    this.failed = false;
    this.checkSubscriptionStatus();
  }
}
