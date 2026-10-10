import { Pedido } from '../../ventas/modelo/pedido';

/**
 * El alistamiento lee el pedido tal cual lo guarda el servidor (el mismo modelo de ventas):
 * cliente.nombres_completos, carrito, totalPedididoConDescuento, estadoProceso...
 */
export type Order = Pedido & { _id: string; nroPedido: string };

export interface OrderListResponse {
  orders: Order[];
  total: number;
  pagina: number;
  porPagina: number;
}
