/**
 * D-635 (ticket 1472, panel de nueve): el estado que se ve SIEMPRE en la tarjeta, con datos que el pedido ya trae
 * (sin ninguna consulta nueva). Funciones PURAS, sin Angular: las carga también `node --test`.
 *
 *  - Facturación: «Sin factura» cuando el pedido no tiene factura. Es la misma condición de `canEditBilling` de la
 *    lista: sin `nroFactura`, sin `pdfUrlInvoice` y sin una facturación en curso (`_facturando`).
 *  - Pagos: el saldo pendiente (`faltaPorPagar`) cuando lo hay. Un pedido cancelado, precancelado o rechazado no
 *    muestra saldo: ya no se va a cobrar.
 *
 * Solo informan: nunca mueven la tarjeta ni dan acceso a nada.
 */
import { AccionPedidoId } from './acciones-pedido.catalogo';
import { AccionResaltada } from './acciones-pedido.resaltada';

export interface EstadoTarjeta {
  texto: string;
  /** `true`: va en el par semántico de alerta; `false`: informativo, en tono neutro. */
  alerta: boolean;
}

const SIN_COBRO: ReadonlySet<string> = new Set(['Cancelado', 'Precancelado', 'Rechazado']);

/** `true` si el pedido no tiene factura ni se está facturando. */
export function sinFactura(pedido: any): boolean {
  return !!pedido && !pedido.nroFactura && !pedido.pdfUrlInvoice && !pedido._facturando;
}

/** El saldo por pagar del pedido, o 0 si no hay o no aplica. */
export function saldoPendiente(pedido: any): number {
  if (!pedido || SIN_COBRO.has(String(pedido.estadoPago ?? '').trim())) return 0;
  const saldo = Number(pedido.faltaPorPagar);
  return Number.isFinite(saldo) && saldo > 0 ? Math.round(saldo) : 0;
}

/** «$ 120.000»: miles con punto, como se lee en Colombia, sin decimales. */
export function montoCorto(valor: number): string {
  return '$' + String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * La etiqueta de estado de la tarjeta `id` para este pedido, o `null` si no lleva.
 * `resaltada` es el resaltado de D-547 (D17): si la acción está resaltada, su etiqueta va en alerta.
 */
export function estadoDeTarjeta(
  id: AccionPedidoId, pedido: any, resaltada: AccionResaltada | null,
): EstadoTarjeta | null {
  const resaltadaAqui = !!resaltada && resaltada.id === id;
  if (id === 'payments') {
    const saldo = saldoPendiente(pedido);
    if (saldo > 0) return { texto: `Saldo ${montoCorto(saldo)}`, alerta: true };
    return resaltadaAqui ? { texto: resaltada!.etiqueta, alerta: true } : null;
  }
  if (id === 'billingData') {
    if (!sinFactura(pedido)) return null;
    return { texto: 'Sin factura', alerta: resaltadaAqui };
  }
  return resaltadaAqui ? { texto: resaltada!.etiqueta, alerta: true } : null;
}
