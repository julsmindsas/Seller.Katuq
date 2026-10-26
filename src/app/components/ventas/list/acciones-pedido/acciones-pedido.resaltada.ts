/**
 * D-547 (F2, D17): qué acción se resalta según el estado del pedido, SIN moverla de lugar.
 * Función PURA, sin Angular.
 *
 *  - pago pendiente (`estadoPago` Pendiente): Pagos, con «Pago pendiente»;
 *  - pagado (Aprobado o PreAprobado, el mismo criterio de `puedeFacturarSiigo`) y sin factura: Facturación,
 *    con «Sin factura». «Sin factura» es la misma condición de `canEditBilling` de la lista: sin `nroFactura`,
 *    sin `pdfUrlInvoice` y sin una facturación en curso (`_facturando`);
 *  - pagado y facturado, o cualquier otro estado de pago: nada.
 *
 * `EstadoPago` (modelo/pedido.ts) NO tiene «Pagado»: Pendiente, Pospendiente, PreAprobado, Aprobado,
 * Rechazado, Precancelado y Cancelado.
 *
 * Si la acción no está entre las 8, el resaltado se pinta solo en su tarjeta del modal.
 */
import { AccionPedidoId } from './acciones-pedido.catalogo';

export interface AccionResaltada {
  id: AccionPedidoId;
  etiqueta: string;
}

const PAGADO: ReadonlySet<string> = new Set(['Aprobado', 'PreAprobado']);

/**
 * D-547 (F2, 11.5): dónde se pinta el resaltado. Si la acción está entre las 8 del bloque, se resalta ahí y el modal no
 * la repite; si no está entre las 8, se resalta solo su tarjeta en «Opciones del pedido». Nunca mueve nada.
 */
export function resaltadaSoloEnModal(r: AccionResaltada | null, ocho: readonly string[]): AccionResaltada | null {
  return r && !ocho.includes(r.id) ? r : null;
}

export function resaltada(pedido: any): AccionResaltada | null {
  const estado = String(pedido?.estadoPago ?? '').trim();
  if (estado === 'Pendiente') return { id: 'payments', etiqueta: 'Pago pendiente' };
  if (PAGADO.has(estado) && !pedido?.nroFactura && !pedido?.pdfUrlInvoice && !pedido?._facturando) {
    return { id: 'billingData', etiqueta: 'Sin factura' };
  }
  return null;
}
