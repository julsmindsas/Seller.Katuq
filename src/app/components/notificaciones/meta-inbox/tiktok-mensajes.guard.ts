import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

import { CompanyFeaturesService } from '../../../shared/services/company-features.service';

/**
 * Entrada al buzón de TikTok (D-709): solo con la bandera `tiktokMensajes` de la empresa. Quien no la
 * tiene vuelve al buzón de WhatsApp, que sigue igual. Solo decide qué se MUESTRA: manda el servidor.
 * La autenticación la resuelve `AuthGuard`.
 */
@Injectable({ providedIn: 'root' })
export class TiktokMensajesGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.features.isEnabled('tiktokMensajes')) return true;
    return this.router.createUrlTree(['/notificaciones/whatsapp/inbox']);
  }
}
