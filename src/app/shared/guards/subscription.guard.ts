import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { Observable, of } from 'rxjs';
import { map, catchError, take, timeout } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

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
    private router: Router,
    private toastr: ToastrService
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
      // Ticket 1101: sin tope, un servidor que no responde dejaba la navegación
      // colgada y el módulo "no cargaba". Se mantiene la regla: sin verificación
      // no hay acceso; solo deja de quedarse esperando para siempre.
      timeout(20000),
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
      catchError((error) => {
        // Si el servidor solo tardó, no es un problema de plan: se cancela la
        // navegación (sin acceso) y se pide reintentar, en vez de mandar a precios.
        if (error?.name === 'TimeoutError') {
          this.toastr.warning('El servidor está tardando en responder. Intenta abrir el módulo de nuevo en un momento.', 'Sin conexión estable');
          return of(false);
        }
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
