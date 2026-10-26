/**
 * D-547 (F2, D16): el texto del aviso de sugerencia («Usas Pagos a diario, ¿lo fijamos?»). Función PURA, sin
 * Angular: la carga también `node --test`.
 */
import { AccionPedidoId, accionPorId } from './acciones-pedido.catalogo';

export function textoSugerencia(id: AccionPedidoId): string {
  return `Usas ${accionPorId(id).titulo} a diario, ¿lo fijamos?`;
}
