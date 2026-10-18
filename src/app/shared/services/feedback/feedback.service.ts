import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { NpsOk, NpsPendienteRespuesta, NpsTableroRespuesta } from './feedback.models';

/**
 * NPS de comercios y pantalla "Satisfacción de clientes" (D-483). La tarjeta corre de
 * fondo, así que sus llamadas no muestran la pantalla de carga global.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** ¿Le toca la pregunta a este usuario? */
  pendiente(): Observable<NpsPendienteRespuesta> {
    return this.getSinLoader<NpsPendienteRespuesta>('/v1/nps/pendiente');
  }

  /** Registra la nota apenas se escoge; se puede cambiar mientras no se cierre el segundo paso. */
  responder(id: string, nota: number, pantalla: string): Observable<NpsOk> {
    return this.postSinLoader<NpsOk>(`/v1/nps/${encodeURIComponent(id)}/respuesta`, { nota, pantalla });
  }

  /** Cierra el segundo paso, con o sin comentario. */
  comentar(id: string, comentario?: string): Observable<NpsOk> {
    const cuerpo = comentario ? { comentario } : {};
    return this.postSinLoader<NpsOk>(`/v1/nps/${encodeURIComponent(id)}/comentario`, cuerpo);
  }

  /** "Ahora no", o cerrar la tarjeta sin haber escogido nota. */
  posponer(id: string): Observable<NpsOk> {
    return this.postSinLoader<NpsOk>(`/v1/nps/${encodeURIComponent(id)}/posponer`, {});
  }

  /** La pantalla "Satisfacción de clientes" (familia Administrador). */
  tablero(conPruebas = false): Observable<NpsTableroRespuesta> {
    return this.get<NpsTableroRespuesta>(`/v1/nps/tablero${conPruebas ? '?pruebas=1' : ''}`);
  }
}
