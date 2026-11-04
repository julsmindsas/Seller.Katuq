import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { CompanyFeaturesService } from '../../shared/services/company-features.service';
import { esOperadorKatuq } from './centro-ayuda-comun';

/**
 * El Centro de ayuda (D-628) se muestra solo a la empresa con la bandera `centroDeAyuda`. Esto solo decide
 * qué se MUESTRA: el servidor responde 403 `FEATURE_DISABLED` sin la bandera (o con el corte general).
 * La autenticación la resuelve `AuthGuard`.
 */
@Injectable({ providedIn: 'root' })
export class CentroAyudaGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.features.isEnabled('centroDeAyuda')) return true;
    this.toastr.info(this.translate.instant('centroAyuda.guard.todaviaNoActivo'), this.translate.instant('centroAyuda.titulo'));
    return this.router.createUrlTree(['/welcome']);
  }
}

/** La administración, además, es solo de Julsmind (empresa Julsmind + Super Administrador). */
@Injectable({ providedIn: 'root' })
export class CentroAyudaAdminGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    return esOperadorKatuq() ? true : this.router.createUrlTree(['/centro-de-ayuda']);
  }
}
