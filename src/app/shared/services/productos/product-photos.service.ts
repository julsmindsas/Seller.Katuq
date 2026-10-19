import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from '../base.service';
import { ConfigFotos, EstadoLote, LoteCreado, RespuestaVistaPrevia } from './product-photos.mapper';

/**
 * Fotos de producto uniformes (D-501, ticket 1252): llamadas a /v1/product-photos.
 *
 * Todas van sin la pantalla de carga global (SKIP_LOADER): el diálogo muestra su propio avance y
 * la consulta del lote corre cada 2 s. El interceptor sigue agregando la sesión y la empresa.
 * Quien manda es el servidor (bandera `productPhotoUniform`, interruptor y rol).
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

  /** Un producto entero, o una foto con `index`. */
  revertirProducto(productId: string, index?: number): Observable<{ success: boolean; reverted: number; skipped: { index: number; code: string }[] }> {
    const cuerpo: Record<string, unknown> = { productId };
    if (typeof index === 'number') {
      cuerpo['index'] = index;
    }
    return this.postSinLoader(`${this.ruta}/revert`, cuerpo);
  }
}
