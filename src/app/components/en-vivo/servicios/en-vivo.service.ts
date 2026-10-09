import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';
import {
  DetallePedidoEnVivo,
  FotoEnVivo,
  FotoGlobalEnVivo,
  RespuestaNoDisponible,
  RespuestaPregunta,
  VistaEnVivo,
} from './en-vivo.modelos';
import { rutasEnVivo } from './en-vivo-rutas';

/** Máximo de caracteres de una pregunta a Opttia (diseño 16). */
export const MAX_PREGUNTA = 160;

/**
 * HTTP de "En vivo": foto (también sirve de sondeo), detalle del pedido y preguntas a
 * Opttia. TODO va por `BaseService` (el interceptor pone `Authorization`, `company`...).
 * El stream no pasa por aquí: `HttpClient` no sirve para SSE (ver `EnVivoCanalService`).
 *
 * Solo lectura: ninguna llamada cambia pedidos ni nada más. Cada respuesta puede ser
 * `{ disponible: false }` con 200 si el rol no tiene el menú `en-vivo`.
 *
 * Ojo con el loader global: `BaseService` no deja pasar `SKIP_LOADER`, así que el shell
 * debe llamar `LoaderService.suppressGlobalLoader()` / `releaseGlobalLoader()` (D-072),
 * o el sondeo de 30 s taparía la pantalla con el overlay cada vez.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Foto del comercio de la sesión. Con sesión de Katuq, `empresa` pide la de ese comercio (solo lectura). */
  foto(empresa?: string): Observable<FotoEnVivo | RespuestaNoDisponible> {
    return this.get<FotoEnVivo | RespuestaNoDisponible>(rutasEnVivo.foto(empresa));
  }

  /** Foto de toda Katuq. El servidor la rechaza (403) si la empresa del token no es Julsmind. */
  fotoGlobal(): Observable<FotoGlobalEnVivo | RespuestaNoDisponible> {
    return this.get<FotoGlobalEnVivo | RespuestaNoDisponible>(rutasEnVivo.fotoGlobal());
  }

  /**
   * Ficha de UN pedido: la respuesta es PLANA (la proyección del pedido más `productos` y `envio`,
   * ver `DetallePedidoEnVivo`). 404 (error HTTP) si es de otra empresa, no existe o está fuera del
   * alcance D-349: el 404 no distingue entre esos casos.
   */
  detalle(id: string, empresa?: string): Observable<DetallePedidoEnVivo | RespuestaNoDisponible> {
    return this.get<DetallePedidoEnVivo | RespuestaNoDisponible>(rutasEnVivo.detalle(id, empresa));
  }

  /**
   * Pregunta a Opttia sobre lo que se ve. Tope de 20 por usuario por hora: al pasarlo el
   * servidor responde 200 con `restantes: 0` y `reintentarEnMin` (en cuántos minutos puede
   * volver a preguntar), no un error. Con `vista: 'katuq'` la pregunta es sobre toda la plataforma
   * (solo sesión de Katuq). Una pregunta vacía da 400.
   */
  preguntar(
    pregunta: string,
    empresa?: string,
    vista: VistaEnVivo = 'comercio'
  ): Observable<RespuestaPregunta | RespuestaNoDisponible> {
    return this.post<RespuestaPregunta | RespuestaNoDisponible>(rutasEnVivo.pregunta(empresa), {
      pregunta: pregunta.trim().slice(0, MAX_PREGUNTA),
      vista,
    });
  }
}
