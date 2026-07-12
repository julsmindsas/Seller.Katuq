import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FeatureFlagsService } from '../../../shared/services/feature-flags.service';

/**
 * Marketing Guard — protege el módulo detrás del flag ENABLE_MARKETING_MODULE.
 *
 * La autenticación la resuelve AuthGuard en la ruta padre (routes.ts); aquí
 * solo se valida el flag. Nota: la versión previa leía
 * `sessionStorage.currentUser.role` — patrón inexistente en esta app
 * (el usuario vive en localStorage['user'] con `rol` en español).
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
    return true;
  }
}
