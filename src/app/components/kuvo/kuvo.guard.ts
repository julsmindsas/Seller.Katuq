import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { NavService } from '../../shared/services/nav.service';

// El backend vuelve a comprobar JWT, comercio y rol; este guard evita abrir
// la configuración desde una ruta directa con una sesión operativa.
export function canManageKuvo(role: unknown): boolean {
  return NavService.esRolAdministrador(role) || role === 'Super Administrador';
}

@Injectable({ providedIn: 'root' })
export class KuvoGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    try {
      const role = JSON.parse(localStorage.getItem('user') || '{}').rol;
      return canManageKuvo(role) || this.router.parseUrl('/welcome');
    } catch (_) {
      return this.router.parseUrl('/welcome');
    }
  }
}
