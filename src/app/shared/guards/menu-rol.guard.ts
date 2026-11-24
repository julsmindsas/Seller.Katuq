import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { NavService } from '../services/nav.service';

/**
 * Ticket 1637 (openspec/changes/bloqueo-pantallas-por-rol): una pantalla del menú solo abre si el rol
 * de la sesión la tiene, también por dirección directa (antes `/dropshipping/dashboard` abría aunque el
 * menú no la mostrara).
 *
 * La regla es la del menú lateral (`NavService.pantallaPermitida`), no una copia: lo que tu rol no te
 * muestra en el menú, no lo abres. Lo que no es de ninguna pantalla del menú (detalle, crear, Bienvenida)
 * se abre como siempre. Es síncrono con la sesión: no consulta la red.
 *
 * Es una barrera de la app; el API se protege aparte (middleware `requireMenu` del backend).
 */
@Injectable({ providedIn: 'root' })
export class MenuRolGuard implements CanActivateChild {
  constructor(private navServices: NavService, private router: Router) {}

  canActivateChild(_childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    try {
      if (this.navServices.pantallaPermitida(state.url)) return true;
    } catch {
      // Si la sesión no se puede leer, no se bloquea por error: decide el AuthGuard de la ruta.
      return true;
    }
    return this.router.createUrlTree(['/sin-acceso'], { queryParams: { desde: state.url.split('?')[0] } });
  }
}
