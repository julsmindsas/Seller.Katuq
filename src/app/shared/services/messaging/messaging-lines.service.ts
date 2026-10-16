import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base.service';
import { CambiosLinea, MessagingLine, MessagingLinesResponse } from './messaging.models';

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
      })),
    );
  }

  /**
   * Pide el enlace de conexión del proveedor; se abre en una ventana emergente.
   * `estado` es un código de un solo uso que el servidor devuelve en la URL de
   * regreso: solo se confirma un regreso que traiga el código generado aquí.
   */
  conectar(provider: string, estado: string): Observable<{ url: string; expiresAt?: string }> {
    return this.post<{ url: string; expiresAt?: string }>(`${this.base}/connect`, { provider, estado });
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

  /** Deja la línea desconectada (no la borra del proveedor). */
  desconectar(lineId: string): Observable<MessagingLine> {
    return this.delete<{ line: MessagingLine }>(`${this.base}/${encodeURIComponent(lineId)}`).pipe(
      map((res) => res.line),
    );
  }
}
