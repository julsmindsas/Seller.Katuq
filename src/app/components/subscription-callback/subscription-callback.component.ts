import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from '../../shared/services/subscription.service';

@Component({
  selector: 'app-subscription-callback',
  templateUrl: './subscription-callback.component.html',
  styleUrls: ['./subscription-callback.component.scss']
})
export class SubscriptionCallbackComponent implements OnInit {
  subscriptionId: string | null = null;
  loading: boolean = true;
  success: boolean = false;
  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    // Obtener subscriptionId de query params
    this.route.queryParams.subscribe(params => {
      this.subscriptionId = params['subscription'];

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
    // Dar tiempo para que el webhook procese el pago
    setTimeout(() => {
      // Refrescar datos de suscripción
      this.subscriptionService.loadSubscriptionStatus().subscribe({
        next: (subscription) => {
          this.loading = false;

          if (subscription.plan === 'premium') {
            this.success = true;
            this.message = '¡Tu suscripción Premium ha sido activada exitosamente!';
          } else {
            this.success = false;
            this.message = 'Tu pago está siendo procesado. Recibirás un correo de confirmación pronto.';
          }

          // También refrescar usage stats
          this.subscriptionService.getUsageStats().subscribe();
        },
        error: (error) => {
          console.error('Error loading subscription status:', error);
          this.loading = false;
          this.success = false;
          this.message = 'Hubo un error al verificar tu suscripción. Por favor contacta soporte.';
        }
      });
    }, 3000); // Esperar 3 segundos para que el webhook procese
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  retryCheck(): void {
    this.loading = true;
    this.checkSubscriptionStatus();
  }
}
