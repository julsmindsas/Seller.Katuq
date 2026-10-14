import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { BaseService } from '../../../shared/services/base.service';
import { ExplicacionPlan, GrupoParaAprobar, RespuestaAprobacion } from './plan-despachos.modelos';

const RUTA = '/v1/logistica/plan';

/**
 * Desde dónde se aprueba: la tarjeta de Opttia en la escena manda `escena`. `en-vivo` era la vista
 * Despachos (ya borrada); el servidor lo sigue aceptando y lo anota cuando no llega canal.
 */
export type CanalAprobacion = 'en-vivo' | 'escena';

/** Más que el corte del proxy (60 s): si nada llega antes, la tarjeta lo trata como "sin respuesta" (TimeoutError). */
const ESPERA_APROBAR_MS = 75_000;

/**
 * Plan de despachos con Opttia (D-410). La empresa y quien aprueba los pone el servidor desde la
 * sesión; aquí nunca se mandan. Sin loader global: En vivo lo tiene suprimido mientras está abierta
 * y la tarjeta de Opttia muestra su propio "Despachando…". Desde D-422 el plan llega con las
 * propuestas (`GET /v1/opttia/propuestas`); aquí quedan la frase de Opttia y aprobar.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoPlanDespachosService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  explicar(huella: string): Observable<{ success: boolean; explicacion: ExplicacionPlan | null; motivo?: string }> {
    return this.postSinLoader(`${RUTA}/explicar`, { huella });
  }

  /**
   * `canal` dice desde dónde se aprobó (D-422): la tarjeta de Opttia en la escena manda `escena`;
   * sin canal el servidor anota `en-vivo`, como siempre. El servidor solo acepta canales conocidos.
   */
  aprobar(grupos: GrupoParaAprobar[], canal?: CanalAprobacion): Observable<RespuestaAprobacion> {
    const cuerpo = canal ? { grupos, canal } : { grupos };
    return this.postSinLoader<RespuestaAprobacion>(`${RUTA}/aprobar`, cuerpo).pipe(timeout(ESPERA_APROBAR_MS));
  }
}
