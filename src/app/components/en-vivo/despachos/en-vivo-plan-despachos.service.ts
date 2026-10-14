import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { BaseService } from '../../../shared/services/base.service';
import { ExplicacionPlan, GrupoParaAprobar, RespuestaAprobacion, RespuestaPlan } from './plan-despachos.modelos';

const RUTA = '/v1/logistica/plan';

/** Desde dónde se aprueba: la vista Despachos (`en-vivo`) o la tarjeta de Opttia en la escena (`escena`). */
export type CanalAprobacion = 'en-vivo' | 'escena';

/** Más que el corte del proxy (60 s): si nada llega antes, la vista lo trata como "sin respuesta" (TimeoutError). */
const ESPERA_APROBAR_MS = 75_000;

/**
 * Plan de despachos con Opttia (D-410). La empresa y quien aprueba los pone el servidor desde la
 * sesión; aquí nunca se mandan. Sin loader global: En vivo lo tiene suprimido mientras está abierta
 * y la vista muestra su propio "Aplicando…".
 */
@Injectable({ providedIn: 'root' })
export class EnVivoPlanDespachosService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  obtener(): Observable<RespuestaPlan> {
    return this.get<RespuestaPlan>(RUTA);
  }

  explicar(huella: string): Observable<{ success: boolean; explicacion: ExplicacionPlan | null; motivo?: string }> {
    return this.postSinLoader(`${RUTA}/explicar`, { huella });
  }

  /**
   * `canal` dice desde dónde se aprobó (D-422): la tarjeta de Opttia en la escena manda `escena`;
   * sin canal (la vista Despachos) el servidor anota `en-vivo`, como siempre. El servidor solo
   * acepta canales conocidos.
   */
  aprobar(grupos: GrupoParaAprobar[], canal?: CanalAprobacion): Observable<RespuestaAprobacion> {
    const cuerpo = canal ? { grupos, canal } : { grupos };
    return this.postSinLoader<RespuestaAprobacion>(`${RUTA}/aprobar`, cuerpo).pipe(timeout(ESPERA_APROBAR_MS));
  }
}
