/**
 * D-547 (F2, D14 y D17): lo que dibuja el bloque ACCIONES de 8 (4 del rol y 4 del usuario) del detalle del
 * pedido. Funciones PURAS, sin Angular: las carga también `node --test`. Usa los mismos títulos, reseñas,
 * íconos y motivos que el modal (`tarjeta`) y los mismos estados de D3 (`estadoAcciones`): una acción fijada
 * que no aplica o que el usuario no puede usar sale DESHABILITADA con su motivo y no abre nada.
 *
 * El resaltado (D17) solo pinta una etiqueta sobre la acción: nunca la mueve.
 */
import { AccionPedidoId, accionPorId } from './acciones-pedido.catalogo';
import { EstadoAcciones, hijosVisibles } from './acciones-pedido.estado';
import { AccionResaltada } from './acciones-pedido.resaltada';
import { TarjetaVista, tarjeta } from './order-options-modal.vista';

export interface TarjetaBloque extends TarjetaVista {
  /** «Pago pendiente» o «Sin factura» si la acción está resaltada; si no, `null`. */
  etiqueta: string | null;
}

export interface BloqueVista {
  /** Las 8 acciones, en el orden recibido (rol primero, después las personales). */
  tarjetas: TarjetaBloque[];
  /** Acciones de factura electrónica que aplican hoy (van debajo de las 8, como en F1). */
  hijosFactura: TarjetaVista[];
  /** `true`: Descuento abre un menú de dos opciones (Aplicar otro / Editar o quitar), igual que en el modal. */
  descuentoConMenu: boolean;
  opcionesDescuento: TarjetaVista[];
}

export function construirBloque(
  acciones: readonly AccionPedidoId[],
  estados: EstadoAcciones,
  revisado: boolean,
  resaltada: AccionResaltada | null,
): BloqueVista {
  const tarjetas: TarjetaBloque[] = acciones.map(id => ({
    ...tarjeta(accionPorId(id), estados[id], revisado),
    etiqueta: resaltada && resaltada.id === id ? resaltada.etiqueta : null,
  }));

  // Como hoy: el bloque de F1 ofrece Facturar, Liberar factura y las 4 de la DIAN. Refacturar vive solo en el modal.
  const hijosFactura = hijosVisibles(estados, 'electronicInvoice')
    .filter(id => id !== 'reinvoice')
    .map(id => tarjeta(accionPorId(id), estados[id], revisado));

  const descuentoConMenu = estados.discount.visible && estados.discount.habilitada
    && estados.editDiscount.visible && estados.editDiscount.habilitada;
  const opcionesDescuento = descuentoConMenu
    ? [
        { ...tarjeta(accionPorId('discount'), estados.discount, revisado), titulo: 'Aplicar otro', resena: 'Aplica un código de descuento' },
        tarjeta(accionPorId('editDiscount'), estados.editDiscount, revisado),
      ]
    : [];

  return { tarjetas, hijosFactura, descuentoConMenu, opcionesDescuento };
}
