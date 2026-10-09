import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from '../../../shared/services/base.service';
import { RespuestaAvance, RespuestaIniciar, SolicitudTienda } from './tienda-en-un-paso.logic';

/**
 * Tienda en minutos con IA, en UN solo paso (bandera `singleStepStore`).
 *
 * Dos llamadas, las dos con la empresa y la sesión que pone el interceptor:
 *  - `iniciar`: manda la solicitud y el servidor responde AL INSTANTE con el id del
 *    sitio; el trabajo sigue en segundo plano. La misma solicitud (mismo `requestId`)
 *    siempre cae en la misma tienda, así que reintentar es seguro.
 *  - `avance`: el estado del trabajo, que se consulta cada pocos segundos.
 *
 * Esto solo habla con el servidor. Qué se muestra y cuándo se consulta lo decide
 * `tienda-en-un-paso.logic.ts`; quien manda sobre la función es el servidor
 * (`requireFeature('singleStepStore')` responde 403 si está apagada).
 */
@Injectable({ providedIn: 'root' })
export class TiendaEnUnPasoService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  iniciar(solicitud: SolicitudTienda): Observable<RespuestaIniciar> {
    return this.post<RespuestaIniciar>('/v1/onboarding/tienda-en-un-paso', solicitud);
  }

  /** Retoma un trabajo interrumpido: la misma solicitud, solo con su identificador (las fotos ya están guardadas). */
  retomar(requestId: string): Observable<RespuestaIniciar> {
    return this.post<RespuestaIniciar>('/v1/onboarding/tienda-en-un-paso', { requestId });
  }

  avance(siteId: string): Observable<RespuestaAvance> {
    return this.get<RespuestaAvance>(`/v1/onboarding/tienda-en-un-paso/${encodeURIComponent(siteId)}`);
  }
}
