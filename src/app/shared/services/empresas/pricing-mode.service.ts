import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { BaseService } from '../base.service';

/**
 * Modo de precios de la empresa. Se maneja UNO, nunca varios a la vez.
 * `null` = todavía no eligió: la UI se comporta como siempre.
 */
export type ModoPrecio = 'unitario' | 'tipoCliente' | 'volumen' | null;

/**
 * Configuración de precios de la empresa.
 *
 * Cuál tipo de cliente define el precio base NO vive acá: es una marca del
 * propio tipo (`tiposPrecios.esPrecioBase`), que se administra en el módulo
 * Tipos de Cliente → Editar. Quien necesite saberlo lee los tipos, no esto.
 */
export interface ConfigPrecios {
  modo: ModoPrecio;
}

export const MODO_PRECIO_LABEL: { [k: string]: string } = {
  unitario: 'Precio unitario',
  tipoCliente: 'Precio por tipo de cliente',
  volumen: 'Precio por volumen',
};

const CONFIG_VACIA: ConfigPrecios = { modo: null };

/**
 * Lee y guarda `companies.configuracionPrecios`.
 *
 * El backend resuelve la empresa por el header `company` (lo pone el
 * interceptor), así que aquí no se manda ni nit ni id: nadie puede configurar
 * otra empresa desde el navegador. Guardar exige rol de administrador —
 * el backend responde 403 si no lo es.
 *
 * Se elige en el menú de perfil → Configuración de empresa (ruta `empresas`).
 * Esa pantalla se eligió a propósito: el menú lateral solo muestra un link si
 * su path está en `authorizedMenuItems` del rol, y medido contra producción
 * `empresas` está autorizado en 78 de 102 roles, mientras que
 * `empresas/modulovariable/produccion/opciones` solo en 16.
 */
@Injectable({ providedIn: 'root' })
export class PricingModeService extends BaseService {
  /** Caché en memoria: varias pantallas preguntan la config en el mismo minuto. */
  private cache$?: Observable<ConfigPrecios>;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Configuración activa. Si el endpoint falla (backend viejo sin la ruta, red
   * caída) devuelve la config vacía en vez de romper la pantalla: sin modo,
   * todo se ve como siempre.
   */
  getConfig(forzarRecarga = false): Observable<ConfigPrecios> {
    if (forzarRecarga || !this.cache$) {
      this.cache$ = this.get<any>('/v1/companies/pricing-mode').pipe(
        map((res) => this.normalizar(res?.data)),
        catchError(() => of({ ...CONFIG_VACIA })),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  /** Atajo para quien solo necesita el modo (Lista de Precios lo usa así). */
  getModo(forzarRecarga = false): Observable<ModoPrecio> {
    return this.getConfig(forzarRecarga).pipe(map((c) => c.modo));
  }

  /** Guarda la configuración y refresca la caché con lo que confirmó el backend. */
  setConfig(config: { modo: Exclude<ModoPrecio, null> }): Observable<ConfigPrecios> {
    return this.post<any>('/v1/companies/pricing-mode', config).pipe(
      map((res) => this.normalizar(res?.data)),
      tap((confirmada) => {
        this.cache$ = of(confirmada);
      })
    );
  }

  /**
   * Solo el administrador de la empresa puede elegir el modo.
   *
   * ⚠️ Cada empresa nombra su rol de administrador como quiere: OH MY STORE usa
   * "ADMINISTRADOR FULL OH", CAFE ESCOBAR "Administrador Full CE", La Tartaleria
   * "Administrador LT". Comparar contra el texto exacto "Administrador" dejaba
   * los botones bloqueados para todas esas empresas **aunque el backend sí las
   * autoriza** — la UI mentía sobre un permiso que el servidor concedía.
   *
   * Esta comprobación es el espejo de `isRoleAllowed`/`isAdminFamilyRole` de
   * `middleware/requireRole.js`: si cambia allá, cambia acá. El servidor sigue
   * siendo quien decide (responde 403); esto solo evita mostrar como bloqueado
   * algo que sí se puede hacer.
   */
  puedeEditar(): boolean {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return PricingModeService.esRolAdministrador(user?.rol);
    } catch {
      return false;
    }
  }

  /** Normaliza acentos/mayúsculas y acepta la familia "Administrador". */
  static esRolAdministrador(rol: any): boolean {
    const normalizado = String(rol || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(normalizado);
  }

  private normalizar(data: any): ConfigPrecios {
    const modo = data?.modo;
    return {
      modo: modo === 'unitario' || modo === 'tipoCliente' || modo === 'volumen' ? modo : null,
    };
  }
}
