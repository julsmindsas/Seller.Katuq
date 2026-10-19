import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseService } from '../../shared/services/base.service';
import {
  EstadoSolicitud,
  RespuestaAccionSolicitud,
  RespuestaDetalleSolicitud,
  RespuestaLiquidacion,
  RespuestaListaSolicitudes,
} from './mensajeros-independientes.models';

/**
 * Solicitudes de mensajeros que se inscriben solos en la app de mensajeros. Solo las atiende el
 * Super Administrador de la operadora: el backend responde 403 a cualquier otra sesión.
 *
 * Todas las llamadas pasan por el HttpClient de `BaseService`, así que el interceptor agrega la sesión
 * (Bearer JWT y el encabezado `company`). Ninguna usa la pantalla de carga global: la pantalla pinta su
 * propio "cargando" y "enviando". El detalle trae enlaces firmados y temporales a los documentos: este
 * servicio no los guarda ni los escribe en ningún lado, solo los entrega a quien los pidió.
 */
@Injectable({ providedIn: 'root' })
export class MensajerosIndependientesService extends BaseService {
  private readonly ruta = '/v1/logistica/independientes/solicitudes';
  private readonly rutaLiquidacion = '/v1/logistica/independientes/liquidacion';

  constructor(http: HttpClient) {
    super(http);
  }

  listar(estado: EstadoSolicitud): Observable<RespuestaListaSolicitudes> {
    return this.getSinLoader<RespuestaListaSolicitudes>(`${this.ruta}?estado=${encodeURIComponent(estado)}`).pipe(
      mergeMap((respuesta) => this.exigirExito(respuesta)),
    );
  }

  detalle(id: string): Observable<RespuestaDetalleSolicitud> {
    return this.getSinLoader<RespuestaDetalleSolicitud>(`${this.ruta}/${encodeURIComponent(id)}`).pipe(
      mergeMap((respuesta) => this.exigirExito(respuesta)),
    );
  }

  aprobar(id: string): Observable<RespuestaAccionSolicitud> {
    return this.postSinLoader<RespuestaAccionSolicitud>(`${this.ruta}/${encodeURIComponent(id)}/aprobar`, {}).pipe(
      mergeMap((respuesta) => this.exigirExito(respuesta)),
    );
  }

  rechazar(id: string, motivo: string): Observable<RespuestaAccionSolicitud> {
    return this.postSinLoader<RespuestaAccionSolicitud>(`${this.ruta}/${encodeURIComponent(id)}/rechazar`, { motivo }).pipe(
      mergeMap((respuesta) => this.exigirExito(respuesta)),
    );
  }

  suspender(id: string, motivo: string): Observable<RespuestaAccionSolicitud> {
    return this.postSinLoader<RespuestaAccionSolicitud>(`${this.ruta}/${encodeURIComponent(id)}/suspender`, { motivo }).pipe(
      mergeMap((respuesta) => this.exigirExito(respuesta)),
    );
  }

  /**
   * Entregas hechas por mensajeros independientes en un rango de fechas (`YYYY-MM-DD`) y lo que Katuq
   * cobra de comisión a cada comercio. Solo la operadora: el backend responde 403 a cualquier otra sesión.
   */
  liquidacion(desde: string, hasta: string): Observable<RespuestaLiquidacion> {
    const consulta = `desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    return this.getSinLoader<RespuestaLiquidacion>(`${this.rutaLiquidacion}?${consulta}`).pipe(
      mergeMap((respuesta) => this.exigirExito(respuesta)),
    );
  }

  /**
   * Un 200 con `success:false` se trata como falla, con la misma forma que un error HTTP
   * (`{ status, error: { error, code } }`), para que los componentes lean un solo formato.
   */
  private exigirExito<T extends { success?: boolean }>(respuesta: T): Observable<T> {
    if (respuesta && respuesta.success === false) {
      const cuerpo = respuesta as unknown as { error?: unknown; code?: unknown };
      return throwError(() => ({ status: 200, error: { success: false, error: cuerpo.error, code: cuerpo.code } }));
    }
    return of(respuesta);
  }
}
