import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Guard que protege la ruta de onboarding
 * Solo permite acceso a usuarios con rol de Administrador
 * Usuarios con otros roles son redirigidos a /welcome
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {

  constructor(public router: Router) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    // Obtener usuario del localStorage
    const userStr = localStorage.getItem('user');

    if (!userStr) {
      // Si no hay usuario, redirigir a login
      console.log('🚫 OnboardingGuard: No hay usuario, redirigiendo a login');
      this.router.navigate(['/login']);
      return false;
    }

    try {
      const user = JSON.parse(userStr);

      // Verificar si el usuario tiene rol de Administrador
      const isAdmin = user.rol === 'Administrador' || user.rol === 'Super Administrador';

      if (!isAdmin) {
        // Usuario no es administrador, redirigir a welcome
        console.log(`🚫 OnboardingGuard: Usuario con rol "${user.rol}" no puede acceder a onboarding`);
        console.log('↪️  Redirigiendo a /welcome');
        this.router.navigate(['/welcome']);
        return false;
      }

      // Usuario es administrador, permitir acceso
      console.log('✅ OnboardingGuard: Usuario administrador, acceso permitido');
      return true;

    } catch (error) {
      console.error('❌ OnboardingGuard: Error parsing user data:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}
