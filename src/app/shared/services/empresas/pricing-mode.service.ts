import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { BaseService } from '../base.service';

/**
 * Modo de precios de la empresa. Una empresa maneja UNO de los dos, nunca los
 * dos a la vez. `null` = todavía no eligió: la UI se comporta como siempre.
 */
export type ModoPrecio = 'tipoCliente' | 'volumen' | null;

export const MODO_PRECIO_LABEL: { [k: string]: string } = {
  tipoCliente: 'Precio por tipo de cliente',
  volumen: 'Precio por volumen',
};

/**
 * Lee y guarda `companies.configuracionPrecios.modo`.
 *
 * El backend resuelve la empresa por el header `company` (lo pone el
 * interceptor), así que aquí no se manda ni nit ni id: nadie puede configurar
 * otra empresa desde el navegador. Guardar exige rol de administrador —
 * el backend responde 403 si no lo es.
 */
@Injectable({ providedIn: 'root' })
export class PricingModeService extends BaseService {
  /** Caché en memoria: varias pantallas preguntan el modo en el mismo minuto. */
  private cache$?: Observable<ModoPrecio>;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Modo activo. Si el endpoint falla (backend viejo sin la ruta, red caída)
   * devuelve `null` en vez de romper la pantalla: sin modo, todo se ve como
   * siempre.
   */
  getModo(forzarRecarga = false): Observable<ModoPrecio> {
    if (forzarRecarga || !this.cache$) {
      this.cache$ = this.get<any>('/v1/companies/pricing-mode').pipe(
        map((res) => this.normalizar(res?.data?.modo)),
        catchError(() => of(null as ModoPrecio)),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  /** Guarda el modo elegido y refresca la caché con lo que confirmó el backend. */
  setModo(modo: Exclude<ModoPrecio, null>): Observable<ModoPrecio> {
    return this.post<any>('/v1/companies/pricing-mode', { modo }).pipe(
      map((res) => this.normalizar(res?.data?.modo)),
      tap((confirmado) => {
        this.cache$ = of(confirmado);
      })
    );
  }

  /** Solo el administrador de la empresa puede elegir el modo. */
  puedeEditar(): boolean {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.rol === 'Administrador' || user?.rol === 'Super Administrador';
    } catch {
      return false;
    }
  }

  private normalizar(modo: any): ModoPrecio {
    return modo === 'tipoCliente' || modo === 'volumen' ? modo : null;
  }
}
