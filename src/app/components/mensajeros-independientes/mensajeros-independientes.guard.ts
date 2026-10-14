import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { sesionEsSuperAdminOperadora } from './mensajeros-independientes.utils';

/**
 * "Mensajeros independientes" es solo para el Super Administrador de la operadora (empresa Julsmind).
 * El rechazo real es del backend (403); este guardia evita mostrar una pantalla vacía a quien no debe
 * verla y lo manda al inicio. Usa la misma regla que la entrada del menú.
 */
@Injectable({ providedIn: 'root' })
export class MensajerosIndependientesGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    return sesionEsSuperAdminOperadora() ? true : this.router.createUrlTree(['/welcome']);
  }
}
