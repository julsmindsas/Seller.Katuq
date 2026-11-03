import { Injectable } from "@angular/core";
import { CanActivate, Router, UrlTree } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { TranslateService } from "@ngx-translate/core";
import { CompanyFeaturesService } from "../../../shared/services/company-features.service";

/**
 * «Leads de landing» (D-633, fase 1) se muestra solo a la empresa con la bandera `landingsV2`. Esto
 * solo decide qué se MUESTRA: el servidor responde 403 `FEATURE_DISABLED` sin la bandera.
 */
@Injectable({ providedIn: "root" })
export class LeadsLandingGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.features.isEnabled("landingsV2")) return true;
    this.toastr.info(this.translate.instant("sitiosLeads.guard.todaviaNoActivo"), this.translate.instant("sitiosLeads.titulo"));
    return this.router.createUrlTree(["/sitios"]);
  }
}
