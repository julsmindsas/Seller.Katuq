import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import {
  CambiosCaso, Caso, ComentarioPublico, Encuesta, EncuestaCambios, EncuestaPublica, EstadoEncuesta,
  FiltrosCasos, FiltrosTablero, IndicadoresCasos, OpinionProducto, PreguntasEncuesta, TableroNps, UsuarioResponsable,
} from './nps.models';

/** Arma `?a=1&b=2` sin los valores vacíos. */
function consulta(params: Record<string, string | undefined | null>): string {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

/**
 * Módulo NPS por comercio (D-490). Todos los endpoints del contrato de `/v1/nps`; los
 * públicos (la página que responde el comprador) no muestran la pantalla de carga global.
 */
@Injectable({ providedIn: 'root' })
export class NpsService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  // ── Encuestas ────────────────────────────────────────────────────────

  encuestas(): Observable<{ success: boolean; encuestas: Encuesta[] }> {
    return this.get('/v1/nps/encuestas');
  }

  /** Los textos por omisión de una encuesta nueva. */
  plantilla(): Observable<{ success: boolean; preguntas: PreguntasEncuesta }> {
    return this.get('/v1/nps/encuestas/plantilla');
  }

  encuesta(id: string): Observable<{ success: boolean; encuesta: Encuesta }> {
    return this.get(`/v1/nps/encuestas/${encodeURIComponent(id)}`);
  }

  /** Crea en borrador (201); se activa con `cambiarEstado`. */
  crearEncuesta(datos: EncuestaCambios): Observable<{ success: boolean; encuesta: Encuesta }> {
    return this.post('/v1/nps/encuestas', datos);
  }

  /** Parcial; el canal no se manda (400 CANAL_FIJO). Una activa que quede incompleta: 400 INCOMPLETA. */
  editarEncuesta(id: string, datos: EncuestaCambios): Observable<{ success: boolean; encuesta: Encuesta }> {
    return this.put(`/v1/nps/encuestas/${encodeURIComponent(id)}`, datos);
  }

  /** 409 OTRA_ACTIVA si ya hay otra de entrega activa y no viene `confirmar`; 400 INCOMPLETA. */
  cambiarEstado(id: string, estado: Exclude<EstadoEncuesta, 'borrador'>, confirmar = false):
    Observable<{ success: boolean; encuesta: Encuesta; pausada?: { id: string; nombre: string } }> {
    return this.post(`/v1/nps/encuestas/${encodeURIComponent(id)}/estado`, confirmar ? { estado, confirmar } : { estado });
  }

  /** 409 TIENE_RESPUESTAS: con respuestas solo se puede pausar. */
  eliminarEncuesta(id: string): Observable<{ success: boolean }> {
    return this.delete(`/v1/nps/encuestas/${encodeURIComponent(id)}`);
  }

  /** Usuarios activos de la empresa que pueden atender detractores. */
  responsables(): Observable<{ success: boolean; usuarios: UsuarioResponsable[] }> {
    return this.get('/v1/nps/responsables');
  }

  // ── Casos ────────────────────────────────────────────────────────────

  casos(filtros: FiltrosCasos = {}): Observable<{ success: boolean; casos: Caso[]; indicadores: IndicadoresCasos }> {
    return this.get(`/v1/nps/casos${consulta({ estado: filtros.estado, responsable: filtros.responsable, encuesta: filtros.encuesta })}`);
  }

  caso(id: string): Observable<{ success: boolean; caso: Caso }> {
    return this.get(`/v1/nps/casos/${encodeURIComponent(id)}`);
  }

  /** Cerrar (resuelto o sin_solucion) sin nota responde 400 NOTA_REQUERIDA. */
  actualizarCaso(id: string, cambios: CambiosCaso): Observable<{ success: boolean; caso: Caso }> {
    return this.put(`/v1/nps/casos/${encodeURIComponent(id)}`, cambios);
  }

  // ── Resultados ───────────────────────────────────────────────────────

  tablero(filtros: FiltrosTablero = {}): Observable<{ success: boolean; tablero: TableroNps }> {
    return this.get(`/v1/nps/tablero${consulta({
      pruebas: filtros.pruebas ? '1' : undefined,
      encuesta: filtros.encuesta,
      canal: filtros.canal,
    })}`);
  }

  // ── Pública (sin sesión) ─────────────────────────────────────────────

  /** `ref`: el token firmado del correo o `e-<publicId>` del enlace. 400 INVALIDO, 410 VENCIDO, 404 NO_DISPONIBLE. */
  encuestaPublica(ref: string): Observable<{ success: boolean; encuesta: EncuestaPublica; respuesta?: { nota: number } }> {
    return this.getSinLoader(`/v1/nps/publica/encuesta/${encodeURIComponent(ref)}`);
  }

  /**
   * Registra la nota (se llama al cargar la página, nunca con un GET). Si la persona cambia la
   * nota, se manda la `sesion` que ya tiene para que el enlace abierto no cree otra respuesta.
   */
  responderPublica(ref: string, nota: number, sesion?: string | null): Observable<{ success: boolean; sesion: string }> {
    return this.postSinLoader('/v1/nps/publica/respuesta', sesion ? { ref, nota, sesion } : { ref, nota });
  }

  /** `opinionesProducto`: un enlace por producto para calificar lo que compró, o null. */
  comentarPublica(datos: ComentarioPublico): Observable<{ success: boolean; opinionesProducto: OpinionProducto[] | null }> {
    return this.postSinLoader('/v1/nps/publica/comentario', datos);
  }
}
