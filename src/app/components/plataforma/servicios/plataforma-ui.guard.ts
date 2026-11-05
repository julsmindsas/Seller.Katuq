import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { esPlataformaKatuq } from '../../../modules/marketing/guards/plataforma.guard';
import { decidirAcceso } from '../logica/acceso';
import { PlataformaService } from './plataforma.service';

/**
 * D-700 13.3 — Ayuda de navegación: pre-comprueba `esPlataformaKatuq()` (sin modificarlo) y confirma con
 * `GET /v1/platform/me`. Un 403 o cualquier error redirige a `/`. La autorización real es el servidor.
 */
@Injectable({ providedIn: 'root' })
export class PlataformaUiGuard implements CanActivate {
  constructor(private servicio: PlataformaService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return decidirAcceso(esPlataformaKatuq(), () => this.servicio.me()).pipe(
      map((permitido) => (permitido ? true : this.router.parseUrl('/'))),
    );
  }
}
