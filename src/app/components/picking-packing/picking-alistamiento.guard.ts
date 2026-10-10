import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CompanyFeaturesService } from '../../shared/services/company-features.service';

/**
 * El alistamiento (picking y packing) nace APAGADO: solo entra la empresa que tiene prendida la
 * bandera `pickingAlistamiento` (campo `featureFlags` del documento de la empresa, ver
 * `CompanyFeaturesService`). Sin ella, en vez de una pantalla que mueve inventario y pedidos, se
 * avisa con claridad y se lleva a la página de inicio.
 *
 * Esto solo decide qué se MUESTRA. Quien manda es el servidor: las rutas que escriben
 * (iniciar y completar, de picking y de packing) responden 403 sin la bandera.
 *
 * La autenticación la resuelve `AuthGuard` en la ruta padre (shared/routes/routes.ts).
 */
@Injectable({ providedIn: 'root' })
export class PickingAlistamientoGuard implements CanActivate {
  constructor(
    private features: CompanyFeaturesService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.features.isEnabled('pickingAlistamiento')) {
      return true;
    }
    this.toastr.info(
      'Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos.',
      'Alistamiento'
    );
    return this.router.createUrlTree(['/welcome']);
  }
}
