import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from '../base.service';
import { ConfigFotos, EstadoLote, EstadoSerie, LoteCreado, RespuestaVistaPrevia } from './product-photos.mapper';

/**
 * Fotos de producto uniformes (D-501, ticket 1252): llamadas a /v1/product-photos.
 *
 * Todas van sin la pantalla de carga global (SKIP_LOADER): el diálogo muestra su propio avance y
 * la consulta del lote corre cada 2 s. El interceptor sigue agregando la sesión y la empresa.
 * Quien manda es el servidor (bandera `productPhotoUniform`, interruptor y rol).
 *
 * TX-37 · 7.10 (D-518, anexo §G.1): la vista previa y el lote aceptan `categoryPath` (lo arma el
 * mapper); más de 100 productos crean una serie, que se consulta, cancela y revierte por su id.
 */
@Injectable({ providedIn: 'root' })
export class ProductPhotosService extends BaseService {
  private readonly ruta = '/v1/product-photos';

  constructor(http: HttpClient) {
    super(http);
  }

  ajustes(): Observable<ConfigFotos> {
    return this.getSinLoader<ConfigFotos>(`${this.ruta}/settings`);
  }

  vistaPrevia(cuerpo: Record<string, unknown>): Observable<RespuestaVistaPrevia> {
    return this.postSinLoader<RespuestaVistaPrevia>(`${this.ruta}/preview`, cuerpo);
  }

  crearLote(cuerpo: Record<string, unknown>): Observable<LoteCreado> {
    return this.postSinLoader<LoteCreado>(`${this.ruta}/batches`, cuerpo);
  }

  verLote(batchId: string): Observable<EstadoLote> {
    return this.getSinLoader<EstadoLote>(`${this.ruta}/batches/${encodeURIComponent(batchId)}`);
  }

  cancelarLote(batchId: string): Observable<{ success: boolean; status: string }> {
    return this.postSinLoader(`${this.ruta}/batches/${encodeURIComponent(batchId)}/cancel`, {});
  }

  revertirLote(batchId: string, idempotencyKey: string): Observable<{ success: boolean; batchId: string }> {
    return this.postSinLoader(`${this.ruta}/batches/${encodeURIComponent(batchId)}/revert`, { idempotencyKey });
  }

  /** TX-37 · 7.8: avance de una serie (contadores sumados de sus partes). */
  verSerie(seriesId: string): Observable<EstadoSerie> {
    return this.getSinLoader<EstadoSerie>(`${this.ruta}/series/${encodeURIComponent(seriesId)}`);
  }

  /** Cancela la parte en curso; las que esperan se cierran sin procesarse. */
  cancelarSerie(seriesId: string): Observable<{ success: boolean; seriesId: string; status: string }> {
    return this.postSinLoader(`${this.ruta}/series/${encodeURIComponent(seriesId)}/cancel`, {});
  }

  /** Un lote `revert` con las fotos uniformadas de todas las partes; se consulta con verLote. */
  revertirSerie(seriesId: string, idempotencyKey: string): Observable<{ success: boolean; batchId: string }> {
    return this.postSinLoader(`${this.ruta}/series/${encodeURIComponent(seriesId)}/revert`, { idempotencyKey });
  }

  /**
   * Documentos del árbol de categorías de la empresa (el mismo `/v1/categorias/all` del maestro),
   * para el paso «Elige la categoría». Qué documento y qué nombres se usan lo decide el mapper con
   * las reglas de D-495 (`rutasParaElegir`), igual que el servidor.
   */
  arbolDeCategorias(): Observable<unknown[]> {
    return this.getSinLoader<unknown[]>('/v1/categorias/all');
  }

  /** Un producto entero, o una foto con `index`. */
  revertirProducto(productId: string, index?: number): Observable<{ success: boolean; reverted: number; skipped: { index: number; code: string }[] }> {
    const cuerpo: Record<string, unknown> = { productId };
    if (typeof index === 'number') {
      cuerpo['index'] = index;
    }
    return this.postSinLoader(`${this.ruta}/revert`, cuerpo);
  }
}
