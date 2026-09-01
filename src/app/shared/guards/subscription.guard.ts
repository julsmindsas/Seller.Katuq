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

    // Consultar el backend antes de abrir una ruta Premium. Un valor ausente o
    // un error técnico nunca debe convertirse en acceso concedido.
    return this.subscriptionService.loadSubscriptionStatus().pipe(
      take(1),
      map(subscription => {
        if (subscription.plan === 'premium') {
          return true;
        }

        this.router.navigate(['/pricing'], {
          queryParams: {
            from: route.routeConfig?.path,
            reason: 'premium_required'
          }
        });

        return false;
      }),
      catchError(() => {
        this.router.navigate(['/pricing'], {
          queryParams: {
            from: route.routeConfig?.path,
            reason: 'subscription_verification_failed'
          }
        });
        return of(false);
      })
    );
  }
}
