import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { ConsultaHistorialPedido, PaginaHistorialPedido } from '../../models/historial-pedido.model';
import { rutaHistorialPedido } from '../../../components/ventas/historial-pedido/historial-pedido.util';

/**
 * Historial del pedido (D-541, F1): una página de eventos de `GET /v1/orders/:orderId/history?vista=eventos`.
 *
 * Solo lectura. El servidor toma la empresa del token (no de la cabecera) y, si la bandera
 * `orderHistoryLog` está apagada o algo falla, responde `vista: 'legado'` con la vista de antes.
 */
@Injectable({ providedIn: 'root' })
export class HistorialPedidoService extends BaseService {
  /**
   * @param orderId id del documento del pedido (`_id`).
   * Sin loader global: la pantalla muestra su propio esqueleto y «Ver más».
   */
  pagina(orderId: string, consulta: ConsultaHistorialPedido = {}): Observable<PaginaHistorialPedido> {
    return this.getSinLoader<PaginaHistorialPedido>(rutaHistorialPedido(orderId, consulta));
  }
}
