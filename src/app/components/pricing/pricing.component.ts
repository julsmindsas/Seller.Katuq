import { Component, OnInit, OnDestroy } from '@angular/core';
import { SubscriptionService } from '../../shared/services/subscription.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Pricing Component
 *
 * Página de planes y precios de Katuq Seller
 * Permite ver comparación de planes y actualizar suscripción
 */
@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements OnInit, OnDestroy {
  currentPlan: 'freemium' | 'premium' = 'freemium';
  loading = false;
  showUpgradeModal = false;
  private destroy$ = new Subject<void>();

  plans = {
    freemium: {
      name: 'Freemium',
      price: 0,
      currency: 'COP',
      features: [
        { text: '15 pedidos por mes', icon: 'pi-check', enabled: true },
        { text: '1 bodega', icon: 'pi-check', enabled: true },
        { text: '2 usuarios', icon: 'pi-check', enabled: true },
        { text: 'Chat IA: 10 msg/día', icon: 'pi-check', enabled: true },
        { text: 'Productos IA: 10 gen/día', icon: 'pi-check', enabled: true },
        { text: 'Dashboard básico (30 días)', icon: 'pi-check', enabled: true },
        { text: 'IA de Voz', icon: 'pi-times', enabled: false },
        { text: 'Módulo de Producción', icon: 'pi-times', enabled: false },
        { text: 'Integraciones (Siigo, etc)', icon: 'pi-times', enabled: false },
        { text: 'Múltiples bodegas', icon: 'pi-times', enabled: false }
      ],
      buttonText: 'Plan Actual',
      buttonClass: 'p-button-outlined'
    },
    premium: {
      name: 'Premium',
      price: 99000,
      currency: 'COP',
      period: '/mes',
      features: [
        { text: 'Pedidos ilimitados', icon: 'pi-check', enabled: true },
        { text: 'Bodegas ilimitadas', icon: 'pi-check', enabled: true },
        { text: 'Usuarios ilimitados', icon: 'pi-check', enabled: true },
        { text: 'Chat IA ilimitado', icon: 'pi-check', enabled: true },
        { text: 'Productos IA ilimitados', icon: 'pi-check', enabled: true },
        { text: 'IA de Voz incluida', icon: 'pi-check', enabled: true },
        { text: 'Módulo de Producción', icon: 'pi-check', enabled: true },
        { text: 'Todas las integraciones', icon: 'pi-check', enabled: true },
        { text: 'Reportes avanzados', icon: 'pi-check', enabled: true },
        { text: 'Soporte prioritario', icon: 'pi-check', enabled: true }
      ],
      buttonText: 'Actualizar a Premium',
      buttonClass: 'p-button-success'
    }
  };

  constructor(
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptionService.subscription$
      .pipe(takeUntil(this.destroy$))
      .subscribe(subscription => {
        if (subscription) {
          this.currentPlan = subscription.plan;

          // Actualizar textos de botones
          if (this.currentPlan === 'premium') {
            this.plans.premium.buttonText = 'Plan Actual';
            this.plans.premium.buttonClass = 'p-button-outlined';
            this.plans.freemium.buttonText = 'Cambiar a Freemium';
            this.plans.freemium.buttonClass = 'p-button-secondary';
          }
        }
      });

    // Cargar datos actuales
    this.subscriptionService.loadSubscriptionStatus().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  upgradeToPlan(plan: 'freemium' | 'premium'): void {
    if (plan === this.currentPlan) {
      return; // Ya está en este plan
    }

    // Si va a Premium, abrir modal de pago híbrido
    if (plan === 'premium') {
      this.showUpgradeModal = true;
      return;
    }

    // Si va a Freemium (downgrade), confirmar y usar el método viejo
    const confirmMessage = '¿Estás seguro de que deseas cambiar a Freemium? Perderás acceso a features premium.';

    if (!confirm(confirmMessage)) {
      return;
    }

    this.loading = true;

    this.subscriptionService.upgradePlan(plan).subscribe({
      next: (response) => {
        this.loading = false;
        alert(`Plan actualizado a ${plan} exitosamente`);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al actualizar plan:', error);
        alert('Error al actualizar plan: ' + (error.error?.message || error.message));
      }
    });
  }
}
