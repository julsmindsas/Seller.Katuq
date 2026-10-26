import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { ConsultaHistorialProducto, PaginaHistorialProducto } from '../../models/historial-producto.model';
import { rutaHistorial } from '../../../components/productos/historial-producto/historial-producto.util';

/**
 * Historial del producto (D-548, F1): una página de eventos de `productHistory`.
 *
 * Solo lectura. El servidor toma la empresa del token (no de la cabecera) y, si la bandera
 * `productHistoryLog` está apagada o algo falla, responde `vista: 'legado'`.
 */
@Injectable({ providedIn: 'root' })
export class HistorialProductoService extends BaseService {
  /**
   * @param productoId id del documento del producto (`producto.cd`).
   * Sin loader global: la pantalla muestra su propio esqueleto y «Ver más».
   */
  pagina(productoId: string, consulta: ConsultaHistorialProducto = {}): Observable<PaginaHistorialProducto> {
    return this.getSinLoader<PaginaHistorialProducto>(rutaHistorial(productoId, consulta));
  }
}
