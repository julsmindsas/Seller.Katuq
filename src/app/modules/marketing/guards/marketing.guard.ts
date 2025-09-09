import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FeatureFlagsService } from '../../../shared/services/feature-flags.service';

/**
 * Marketing Guard
 * Protege el acceso al módulo de marketing
 * Solo permite acceso si el feature flag está habilitado
 */
@Injectable()
export class MarketingGuard implements CanActivate {
  
  constructor(
    private featureFlags: FeatureFlagsService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // Verificar si el módulo está habilitado
    const isEnabled = this.featureFlags.isEnabled('ENABLE_MARKETING_MODULE');
    
    if (!isEnabled) {
      console.warn('⚠️ Acceso denegado al módulo de Marketing - Feature deshabilitada');
      // Redirigir al dashboard principal
      this.router.navigate(['/dashboard']);
      return false;
    }
    
    // Verificar permisos del usuario (si es necesario)
    const userRole = this.getUserRole();
    const allowedRoles = ['admin', 'marketing', 'seller'];
    
    if (!allowedRoles.includes(userRole)) {
      console.warn('⚠️ Acceso denegado al módulo de Marketing - Rol no autorizado');
      this.router.navigate(['/dashboard']);
      return false;
    }
    
    return true;
  }
  
  /**
   * Obtiene el rol del usuario actual
   */
  private getUserRole(): string {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      return currentUser.role?.toLowerCase() || 'guest';
    } catch (error) {
      console.error('Error obteniendo rol del usuario:', error);
      return 'guest';
    }
  }
}