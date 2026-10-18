import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CompanyFeaturesService } from '../../shared/services/company-features.service';

/**
 * La Agenda de servicios (D-488) se muestra solo a la empresa con la bandera
 * `serviceAgenda`. Esto solo decide qué se MUESTRA: el servidor responde 403 en
 * `/v1/appointments` sin la bandera. La autenticación la resuelve `AuthGuard`.
 */
@Injectable({ providedIn: 'root' })
export class AgendaGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.features.isEnabled('serviceAgenda')) return true;
    this.toastr.info('La Agenda todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos.', 'Agenda');
    return this.router.createUrlTree(['/welcome']);
  }
}
