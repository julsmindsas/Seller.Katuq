import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

import { esFamiliaAdministrador } from '../../utils/roles';
import { CompanyFeaturesService } from '../company-features.service';

/**
 * ¿Se ofrece la consola de WhatsApp (D-707) a esta empresa? Pide la bandera `whatsappConsola`
 * y también `whatsappMultiNumero`, porque los números salen de las líneas del comercio y sin esa
 * bandera el servidor responde 403. Solo decide qué se MUESTRA: manda el servidor.
 */
export function consolaWhatsappActiva(features: CompanyFeaturesService): boolean {
  return features.isEnabled('whatsappConsola') && features.isEnabled('whatsappMultiNumero');
}

/** Rol de la sesión (`localStorage['user'].rol`). Vacío si no se puede leer. */
export function rolDeLaSesion(): string {
  try {
    const usuario = JSON.parse(localStorage.getItem('user') || '{}');
    return usuario && typeof usuario === 'object' ? String(usuario['rol'] || '') : '';
  } catch {
    return '';
  }
}

/**
 * ¿La persona de la sesión puede administrar los números? Misma regla que `puedeAdministrar` de
 * `GET /v1/messaging/lines`: familia Administrador (`requireRole` del servidor).
 */
export function puedeAdministrarNumeros(): boolean {
  return esFamiliaAdministrador(rolDeLaSesion());
}

/**
 * Entrada a la consola: con la bandera y para quien administra los números. Quien no cumple vuelve
 * al buzón de WhatsApp, que sigue igual. La autenticación la resuelve `AuthGuard`.
 */
@Injectable({ providedIn: 'root' })
export class ConsolaWhatsappGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    if (consolaWhatsappActiva(this.features) && puedeAdministrarNumeros()) return true;
    return this.router.createUrlTree(['/notificaciones/whatsapp/inbox']);
  }
}
