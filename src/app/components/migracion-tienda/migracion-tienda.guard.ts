import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { CompanyFeaturesService } from '../../shared/services/company-features.service';
import { puedeTraerTienda } from './logica/acceso';

/**
 * Deja entrar a «Traer mi tienda» solo con la bandera `storeMigrationImport` de la empresa y un rol
 * administrador. Sin eso, a la página de inicio. No reemplaza al servidor, que repite la regla.
 */
@Injectable({ providedIn: 'root' })
export class MigracionTiendaGuard implements CanActivate {
  constructor(
    private readonly features: CompanyFeaturesService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    return puedeTraerTienda(this.features.isEnabled('storeMigrationImport'), this.rolActual()) ? true : this.router.parseUrl('/');
  }

  private rolActual(): string {
    try {
      const sesion = JSON.parse(localStorage.getItem('user') || 'null');
      return sesion && typeof sesion.rol === 'string' ? sesion.rol : '';
    } catch {
      return '';
    }
  }
}
