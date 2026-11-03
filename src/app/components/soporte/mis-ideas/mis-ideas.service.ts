import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';

/** Respuesta de «A mí también me sirve» (D-627). */
export interface RespuestaApoyo {
  isSuccess: boolean;
  message?: string;
  result: { cd: string; apoyado: boolean; apoyos: number };
}

/**
 * Lo propio de Mis Ideas que no es el ticket genérico: el apoyo se guarda por un endpoint aparte
 * (transaccional, por empresa y con la bandera `misIdeasV2` en el servidor), nunca por el PUT del
 * ticket, para que una copia vieja no pise los votos. El interceptor agrega la sesión.
 */
@Injectable({ providedIn: 'root' })
export class MisIdeasService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Sin `apoyo` alterna: apoya si no había apoyado y quita si ya lo había hecho. */
  apoyar(ticketId: string, apoyo?: boolean): Observable<RespuestaApoyo> {
    const cuerpo = apoyo === undefined ? {} : { apoyo };
    return this.post<RespuestaApoyo>(`/v1/support/ticket/${encodeURIComponent(ticketId)}/apoyo`, cuerpo);
  }
}
