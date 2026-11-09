import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base.service';
import {
  CambiosLinea,
  ConexionProveedor,
  MessagingLine,
  MessagingLinesResponse,
  ModoConexionMeta,
  PlantillaLinea,
} from './messaging.models';

/**
 * Líneas de mensajería del comercio (D-437): listar, conectar, confirmar,
 * editar y desconectar. Todo pasa por `BaseService`, así el interceptor pone la
 * sesión y la empresa.
 *
 * Con la bandera `whatsappMultiNumero` apagada el servidor responde 403: quien
 * llame debe revisar `CompanyFeaturesService.isEnabled('whatsappMultiNumero')` antes.
 */
@Injectable({ providedIn: 'root' })
export class MessagingLinesService extends BaseService {
  private readonly base = '/v1/messaging/lines';

  constructor(http: HttpClient) {
    super(http);
  }

  listar(): Observable<MessagingLinesResponse> {
    return this.get<MessagingLinesResponse>(this.base).pipe(
      map((res) => ({
        habilitado: !!res?.habilitado,
        puedeAdministrar: !!res?.puedeAdministrar,
        lines: Array.isArray(res?.lines) ? res.lines : [],
        equipo: Array.isArray(res?.equipo) ? res.equipo : [],
        metaDirecto: {
          habilitada: !!res?.metaDirecto?.habilitada,
          modoCelular: !!res?.metaDirecto?.modoCelular,
        },
      })),
    );
  }

  /**
   * Pide el enlace de conexión del proveedor; se abre en una ventana emergente.
   * `estado` es un código de un solo uso que el servidor devuelve en la URL de
   * regreso: solo se confirma un regreso que traiga el código generado aquí.
   */
  conectar(provider: string, estado: string, modo?: ModoConexionMeta): Observable<ConexionProveedor> {
    return this.post<ConexionProveedor>(`${this.base}/connect`, { provider, estado, ...(modo ? { modo } : {}) });
  }

  /** El servidor confirma el número con el proveedor; no se fía de los datos del regreso. */
  confirmar(provider: string, params: Record<string, string>): Observable<MessagingLine> {
    return this.post<{ line: MessagingLine }>(`${this.base}/confirm`, { provider, params }).pipe(
      map((res) => res.line),
    );
  }

  actualizar(lineId: string, cambios: CambiosLinea): Observable<MessagingLine> {
    return this.patch<{ line: MessagingLine }>(`${this.base}/${encodeURIComponent(lineId)}`, cambios).pipe(
      map((res) => res.line),
    );
  }

  /** Corre solo los pasos que le faltan a una línea «por terminar» (D-704). */
  reintentar(lineId: string): Observable<MessagingLine> {
    return this.post<{ line: MessagingLine }>(`${this.base}/${encodeURIComponent(lineId)}/reintentar`, {}).pipe(
      map((res) => res.line),
    );
  }

  /** Plantillas de la cuenta de WhatsApp de la línea, con su estado en palabras. */
  plantillas(lineId: string): Observable<PlantillaLinea[]> {
    return this.get<{ plantillas: PlantillaLinea[] }>(`${this.base}/${encodeURIComponent(lineId)}/templates`).pipe(
      map((res) => (Array.isArray(res?.plantillas) ? res.plantillas : [])),
    );
  }

  /** Crea una plantilla con título y mensaje en español (`{nombre}` es la única variable). */
  crearPlantilla(lineId: string, entrada: { titulo: string; cuerpo: string }): Observable<PlantillaLinea> {
    return this.post<{ plantilla: PlantillaLinea }>(`${this.base}/${encodeURIComponent(lineId)}/templates`, entrada).pipe(
      map((res) => res.plantilla),
    );
  }

  /** Deja la línea desconectada (no la borra del proveedor). */
  desconectar(lineId: string): Observable<MessagingLine> {
    return this.delete<{ line: MessagingLine }>(`${this.base}/${encodeURIComponent(lineId)}`).pipe(
      map((res) => res.line),
    );
  }
}
