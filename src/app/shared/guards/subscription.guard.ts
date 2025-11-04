import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { Observable, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';

/**
 * Subscription Guard
 *
 * Guard para proteger rutas que requieren plan Premium
 * Redirige a /pricing si el usuario intenta acceder con plan Freemium
 */
@Injectable({
  providedIn: 'root'
})
export class SubscriptionGuard implements CanActivate {

  constructor(
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    // Verificar si la ruta requiere premium
    const requiresPremium = route.data['requiresPremium'];

    if (!requiresPremium) {
      return of(true); // No requiere premium, permitir acceso
    }

    // Verificar plan
    return this.subscriptionService.subscription$.pipe(
      take(1), // Solo tomar el primer valor para evitar múltiples emisiones
      map(subscription => {
        if (!subscription) {
          // Si no hay info de suscripción, intentar cargar
          console.warn('[SubscriptionGuard] No subscription info available');
          // Cargar y permitir por ahora (mejor UX que bloquear por error técnico)
          this.subscriptionService.loadSubscriptionStatus().subscribe();
          return true;
        }

        if (subscription.plan === 'premium') {
          return true; // Es premium, permitir
        }

        // Es freemium intentando acceder a feature premium
        console.warn(`[SubscriptionGuard] Freemium user attempting to access premium route: ${route.routeConfig?.path}`);

        // Mostrar alerta
        alert('Esta funcionalidad requiere el plan Premium. Serás redirigido a la página de planes.');

        // Redirigir a pricing
        this.router.navigate(['/pricing'], {
          queryParams: {
            from: route.routeConfig?.path,
            reason: 'premium_required'
          }
        });

        return false;
      }),
      catchError(error => {
        console.error('[SubscriptionGuard] Error checking subscription:', error);
        // En caso de error, permitir acceso (no bloquear por error técnico)
        return of(true);
      })
    );
  }
}
