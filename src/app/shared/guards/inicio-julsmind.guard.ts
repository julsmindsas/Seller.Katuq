import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { sesionEsJulsmind } from '../../components/en-vivo/paginas/sesion-katuq';

/** Inicio de los administradores de Julsmind (D-386): "Katuq en vivo", todos los comercios operando. */
export const INICIO_JULSMIND = '/en-vivo/katuq';

/**
 * El "inicio" (`/welcome`) de un Administrador o Super Administrador de Julsmind es "Katuq en vivo":
 * la bienvenida muestra las cifras de una sola empresa y Julsmind no vende. Los demás siguen en la
 * bienvenida. Usa la misma regla que `EnVivoKatuqGuard`, así que no hay ida y vuelta entre los dos.
 */
@Injectable({ providedIn: 'root' })
export class InicioJulsmindGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    return sesionEsJulsmind() ? this.router.parseUrl(INICIO_JULSMIND) : true;
  }
}
