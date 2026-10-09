import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { sesionEsJulsmind } from './sesion-katuq';

/**
 * `en-vivo/katuq` (toda la plataforma) es para administradores de Julsmind. El rechazo real ocurre en
 * el backend antes de leer pedidos; este guardia solo evita mostrar una pantalla vacía a quien no
 * debe verla y lo manda a "En vivo" de su comercio.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoKatuqGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    return sesionEsJulsmind() ? true : this.router.createUrlTree(['/en-vivo']);
  }
}
