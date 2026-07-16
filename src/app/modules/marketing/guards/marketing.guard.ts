import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FeatureFlagsService } from '../../../shared/services/feature-flags.service';

/**
 * Marketing Guard — flag ENABLE_MARKETING_MODULE + autorización por rol.
 *
 * Las campañas WhatsApp debitan saldo prepago (dinero real), así que la ruta
 * no puede quedar abierta a cualquier usuario autenticado [D-112]:
 *   - Administrador / Super Administrador: siempre entran.
 *   - Otros roles: solo si el maestro "Roles y permisos" les asignó algún
 *     path de /marketing (localStorage['authorizedMenuItems'], la misma
 *     fuente con la que NavService decide qué links mostrar en el menú).
 *
 * La autenticación la resuelve AuthGuard en la ruta padre (routes.ts).
 */
@Injectable()
export class MarketingGuard implements CanActivate {
  constructor(
    private featureFlags: FeatureFlagsService,
    private router: Router,
  ) {}

  canActivate(): boolean {
    const isEnabled = this.featureFlags.isEnabled('ENABLE_MARKETING_MODULE');
    if (!isEnabled) {
      console.warn('⚠️ Módulo de Marketing deshabilitado (ENABLE_MARKETING_MODULE)');
      this.router.navigate(['/dashboard/default']);
      return false;
    }
    if (!this.isAuthorized()) {
      this.router.navigate(['/dashboard/default']);
      return false;
    }
    return true;
  }

  private isAuthorized(): boolean {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const rol = String(user.rol || '').toLowerCase();
      if (rol === 'administrador' || rol === 'super administrador') {
        return true;
      }
      const authorized = JSON.parse(
        localStorage.getItem('authorizedMenuItems') || '[]',
      );
      return authorized.some((item: any) =>
        String(item?.path || '').startsWith('/marketing'),
      );
    } catch {
      return false;
    }
  }
}
