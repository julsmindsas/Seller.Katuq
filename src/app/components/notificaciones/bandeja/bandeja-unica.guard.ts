import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

import { CompanyFeaturesService } from '../../../shared/services/company-features.service';

/**
 * Entrada a la bandeja única (conv-bandeja-unica): solo con la bandera `bandejaUnica` de la empresa. Quien no
 * la tiene vuelve al buzón de WhatsApp, que sigue igual. Solo decide qué se MUESTRA: los listados y los
 * envíos los limita el servidor como siempre. La autenticación la resuelve `AuthGuard`.
 */
@Injectable({ providedIn: 'root' })
export class BandejaUnicaGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.features.isEnabled('bandejaUnica')) return true;
    return this.router.createUrlTree(['/notificaciones/whatsapp/inbox']);
  }
}
