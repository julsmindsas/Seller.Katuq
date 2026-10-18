import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

/**
 * Solo el Super Administrador de Julsmind (D-485): la pauta de Katuq no es
 * de ningún comercio. Es una ayuda de navegación; el servidor valida de nuevo
 * con la empresa del token.
 */
export function esPlataformaKatuq(): boolean {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const empresa = String(user.company || '').trim().toLowerCase();
    return user.rol === 'Super Administrador' && empresa === 'julsmind';
  } catch {
    return false;
  }
}

@Injectable()
export class PlataformaGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    if (esPlataformaKatuq()) return true;
    this.router.navigate(['/marketing']);
    return false;
  }
}
