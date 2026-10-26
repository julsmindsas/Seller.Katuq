import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CompanyFeaturesService } from '../../shared/services/company-features.service';

import { TranslateService } from '@ngx-translate/core';
/**
 * La Agenda de servicios (D-491) se muestra solo a la empresa con la bandera
 * `serviceAgenda`. Esto solo decide qué se MUESTRA: el servidor responde 403 en
 * `/v1/appointments` sin la bandera. La autenticación la resuelve `AuthGuard`.
 */
@Injectable({ providedIn: 'root' })
export class AgendaGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.features.isEnabled('serviceAgenda')) return true;
    this.toastr.info(this.translate.instant('agenda.agendaGuard.laAgendaTodaviaNoEsta'), this.translate.instant('agenda.agendaConfig.agenda'));
    return this.router.createUrlTree(['/welcome']);
  }
}
