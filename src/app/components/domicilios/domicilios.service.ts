import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { BaseService } from '../../shared/services/base.service';
import { cuerpoDomicilio, cuerpoLote, cuerpoRecogidaPorDefecto } from './domicilios.cuerpos';
import {
  extraerSecreto, interpretarPruebaAviso, normalizarConfiguracion, normalizarLlaves
} from './domicilios.integracion';
import {
  ConfiguracionDomicilios, DomicilioNuevo, FiltrosListado, LlaveApi, PruebaAviso, PuntoDomicilio, RespuestaDomicilio,
  RespuestaListaDomicilios, RespuestaLote
} from './domicilios.models';
import { parametrosListado } from './domicilios.presentacion';
import { FilaLeida } from './domicilios.utils';

/** Lo que se puede cambiar de la configuración; lo que no se manda no se toca. */
export interface CambiosConfiguracion {
  habilitado?: boolean;
  /** Vacía quita la dirección de avisos. */
  webhookUrl?: string;
  recogidaPorDefecto?: Partial<PuntoDomicilio>;
}

/**
 * Domicilios del comercio: crearlos, seguirlos y administrar la integración por API (`/v1/domicilios`).
 *
 * Todas las llamadas pasan por el HttpClient de `BaseService`, así que el interceptor agrega la sesión
 * (Bearer JWT y el encabezado `company`). Ninguna lee ni escribe en `localStorage`. Las que traen un
 * secreto (llave nueva, secreto de firma) devuelven solo el texto del secreto a quien lo va a mostrar una
 * vez: este servicio no lo guarda ni lo escribe en ningún registro.
 *
 * Ojo: `BaseService` solo tiene versión «sin pantalla de carga» de GET y POST; los PUT y DELETE
 * (guardar configuración, revocar una llave) sí usan la pantalla de carga global.
 */
@Injectable({ providedIn: 'root' })
export class DomiciliosService extends BaseService {
  private readonly ruta = '/v1/domicilios';

  constructor(http: HttpClient) {
    super(http);
  }

  // --- Domicilios ---------------------------------------------------------

  crear(domicilio: DomicilioNuevo): Observable<RespuestaDomicilio> {
    return this.postSinLoader<RespuestaDomicilio>(this.ruta, cuerpoDomicilio(domicilio)).pipe(mergeMap(r => this.exigirExito(r)));
  }

  /** Hasta 50 por petición; el servidor procesa cada uno por separado. */
  crearLote(filas: FilaLeida[]): Observable<RespuestaLote> {
    return this.postSinLoader<RespuestaLote>(`${this.ruta}/lote`, cuerpoLote(filas.map(f => f.domicilio))).pipe(
      mergeMap(r => this.exigirExito(r))
    );
  }

  listar(filtros: FiltrosListado): Observable<RespuestaListaDomicilios> {
    return this.getSinLoader<RespuestaListaDomicilios>(`${this.ruta}${parametrosListado(filtros)}`).pipe(
      mergeMap(r => this.exigirExito(r))
    );
  }

  cancelar(id: string, motivo: string): Observable<RespuestaDomicilio> {
    const texto = motivo.trim();
    return this.postSinLoader<RespuestaDomicilio>(`${this.ruta}/${encodeURIComponent(id)}/cancelar`, texto ? { motivo: texto } : {}).pipe(
      mergeMap(r => this.exigirExito(r))
    );
  }

  // --- Configuración (solo administrador) ----------------------------------

  configuracion(): Observable<ConfiguracionDomicilios> {
    return this.getSinLoader<unknown>(`${this.ruta}/configuracion`).pipe(
      mergeMap(r => this.exigirExito(r)),
      map(r => normalizarConfiguracion(r))
    );
  }

  guardarConfiguracion(cambios: CambiosConfiguracion): Observable<void> {
    const cuerpo: Record<string, unknown> = {};
    if (cambios.habilitado !== undefined) cuerpo['habilitado'] = cambios.habilitado;
    if (cambios.webhookUrl !== undefined) cuerpo['webhookUrl'] = cambios.webhookUrl;
    if (cambios.recogidaPorDefecto) cuerpo['recogidaPorDefecto'] = cuerpoRecogidaPorDefecto(cambios.recogidaPorDefecto);
    return this.put<unknown>(`${this.ruta}/configuracion`, cuerpo).pipe(
      mergeMap(r => this.exigirExito(r)),
      map(() => undefined)
    );
  }

  /** Crea o cambia el secreto de firma de los avisos. Devuelve el secreto: se muestra una sola vez. */
  crearSecretoAvisos(): Observable<string> {
    return this.postSinLoader<unknown>(`${this.ruta}/configuracion/secreto`, {}).pipe(
      mergeMap(r => this.exigirExito(r)),
      mergeMap(r => this.secretoDe(r))
    );
  }

  /** Manda un aviso de prueba a la dirección guardada y dice cómo respondió. */
  probarAviso(): Observable<PruebaAviso> {
    return this.postSinLoader<unknown>(`${this.ruta}/configuracion/probar`, {}).pipe(
      mergeMap(r => this.exigirExito(r)),
      map(r => interpretarPruebaAviso(r))
    );
  }

  // --- Llaves de API (solo administrador) ----------------------------------

  llaves(): Observable<LlaveApi[]> {
    return this.getSinLoader<unknown>(`${this.ruta}/llaves`).pipe(
      mergeMap(r => this.exigirExito(r)),
      map(r => normalizarLlaves(r))
    );
  }

  /** Crea una llave. Devuelve la llave completa: se muestra una sola vez y no se puede volver a ver. */
  crearLlave(nombre: string): Observable<string> {
    return this.postSinLoader<unknown>(`${this.ruta}/llaves`, { nombre: nombre.trim() }).pipe(
      mergeMap(r => this.exigirExito(r)),
      mergeMap(r => this.secretoDe(r))
    );
  }

  revocarLlave(id: string): Observable<void> {
    return this.delete<unknown>(`${this.ruta}/llaves/${encodeURIComponent(id)}`).pipe(
      mergeMap(r => this.exigirExito(r)),
      map(() => undefined)
    );
  }

  // --- Internos -----------------------------------------------------------

  /**
   * Un 200 con `success:false` se trata como falla, con la misma forma que un error HTTP
   * (`{ status, error: <cuerpo> }`), para que la pantalla lea un solo formato.
   */
  private exigirExito<T>(respuesta: T): Observable<T> {
    const r = respuesta as unknown as { success?: boolean } | null;
    if (r && r.success === false) {
      return throwError(() => ({ status: 200, error: respuesta }));
    }
    return of(respuesta);
  }

  /** Saca el secreto de la respuesta; si no vino, falla sin dejar rastro del cuerpo. */
  private secretoDe(respuesta: unknown): Observable<string> {
    const secreto = extraerSecreto(respuesta);
    return secreto
      ? of(secreto)
      : throwError(() => ({ status: 200, error: { success: false, error: 'El servidor no devolvió el secreto. Intenta de nuevo.' } }));
  }
}
