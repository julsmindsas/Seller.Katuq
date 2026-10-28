import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { sesionEsJulsmind, sesionPuedeVerEnVivo } from '../../components/en-vivo/paginas/sesion-katuq';

/** Inicio de los administradores de Julsmind (D-386): "Katuq en vivo", todos los comercios operando. */
export const INICIO_JULSMIND = '/en-vivo/katuq';

/** Inicio de un comercio (D-575): su "En vivo". */
export const INICIO_COMERCIO = '/en-vivo';

/**
 * El "inicio" (`/welcome`: login, logo, "Inicio" de la barra inferior, fin del onboarding o del cambio
 * de clave) es "En vivo":
 * - Administrador o Super Administrador de Julsmind -> "Katuq en vivo" (D-386): Julsmind no vende.
 * - En un comercio, quien puede abrir su "En vivo" -> `/en-vivo` (D-575). El administrador que aún no
 *   termina de configurar el negocio sigue en la bienvenida, que es la que le muestra cómo retomarlo.
 * - Los roles sin "En vivo" siguen en la bienvenida.
 * Usa las mismas reglas que `EnVivoKatuqGuard` y el backend, así que no hay ida y vuelta.
 */
@Injectable({ providedIn: 'root' })
export class InicioGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    if (sesionEsJulsmind()) return this.router.parseUrl(INICIO_JULSMIND);
    if (sesionPuedeVerEnVivo() && !configuracionPendiente()) return this.router.parseUrl(INICIO_COMERCIO);
    return true;
  }
}

/** El login (y el cambio de clave) marcan así al administrador que no ha terminado el onboarding. */
function configuracionPendiente(): boolean {
  try {
    return localStorage.getItem('showOnboardingBanner') === 'true';
  } catch {
    return false;
  }
}
