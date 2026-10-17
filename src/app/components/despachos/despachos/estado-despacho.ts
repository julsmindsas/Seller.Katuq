import type { Pedido } from "../../ventas/modelo/pedido";
import type { UserLite } from "../../../shared/models/User/UserLite";

/**
 * Ticket 1224 (ALMARA). Qué deja cada botón de estado de Despachos sobre un pedido.
 *
 * Es la misma tabla que vivía dentro de `cambiarEstado` en despachos.component.ts. Está
 * aparte y sin Angular para aplicarla igual en el primer intento y en el reintento con el
 * pedido fresco (cuando la copia de la pantalla quedó vieja), y para probarla con node.
 *
 * Códigos que manda la pantalla:
 *   0 y 2 → Producido (2 además saca el pedido de la orden de envío y de empaque)
 *   1 y 3 → Empacado  (3 = quitarlo de la orden de envío: retroceso Despachado → Empacado)
 *   4     → Despachado sin orden ("00"), con el usuario como transportador
 *   5     → Entregado
 *
 * Los valores son los de `EstadoProceso` (components/ventas/modelo/pedido.ts). Van como
 * texto porque ese modelo importa rutas `src/…` que node no resuelve en las pruebas.
 */
export const ESTADO = {
  Producido: "ProducidoTotalmente",
  Empacado: "Empacado",
  Despachado: "Despachado",
  Entregado: "Entregado",
} as const;

/** Estado al que lleva cada botón; `null` si el código no existe. */
export function estadoDestino(codigo: number): string | null {
  switch (codigo) {
    case 0:
    case 2:
      return ESTADO.Producido;
    case 1:
    case 3:
      return ESTADO.Empacado;
    case 4:
      return ESTADO.Despachado;
    case 5:
      return ESTADO.Entregado;
    default:
      return null;
  }
}

/**
 * Aplica sobre `pedido` (el mismo objeto) el cambio que pide el botón `codigo`.
 * Solo toca estado, empacador, despachador, fechas, orden de envío y transportador.
 * En los retrocesos (2 y 3) deja la marca `_estadoProcesoExplicitlyChanged`, que el backend
 * exige para aceptar un retroceso y que la pantalla borra después de guardar.
 */
export function aplicarCambioDeEstado<T extends Pedido>(pedido: T, codigo: number, usuario: UserLite): T {
  const p = pedido as any;
  const ahora = new Date().toISOString();
  switch (codigo) {
    case 0:
      p.estadoProceso = ESTADO.Producido;
      break;
    case 1:
      p.estadoProceso = ESTADO.Empacado;
      p.fechaHoraEmpacado = ahora;
      p.empacador = usuario.name;
      break;
    case 2:
      p.estadoProceso = ESTADO.Producido;
      p.fechaHoraEmpacado = undefined;
      p.empacador = undefined;
      p.shippingOrder = undefined;
      p.nroShippingOrder = undefined;
      p.despachador = undefined;
      p.fechaYHorarioDespachado = undefined;
      p.transportador = undefined;
      p._estadoProcesoExplicitlyChanged = true;
      break;
    case 3:
      p.estadoProceso = ESTADO.Empacado;
      p.shippingOrder = undefined;
      p.nroShippingOrder = undefined;
      p.despachador = undefined;
      p.fechaYHorarioDespachado = undefined;
      p.transportador = undefined;
      p._estadoProcesoExplicitlyChanged = true;
      break;
    case 4:
      p.estadoProceso = ESTADO.Despachado;
      p.fechaYHorarioDespachado = ahora;
      p.despachador = usuario;
      p.transportador = usuario.name;
      p.nroShippingOrder = "00";
      p.shippingOrder = "00";
      break;
    case 5:
      p.estadoProceso = ESTADO.Entregado;
      p.despachador = usuario;
      p.entregado = usuario;
      p.fechaYHorarioDespachado = ahora;
      break;
  }
  return pedido;
}

/**
 * El pedido fresco ya tiene lo que el botón quería dejar: no hay nada que guardar.
 * Para los códigos que sacan el pedido de la orden (2 y 3) también exige que ya no tenga orden.
 */
export function yaQuedoAsi(pedidoFresco: Pedido | null | undefined, codigo: number): boolean {
  const destino = estadoDestino(codigo);
  if (!destino || !pedidoFresco || pedidoFresco.estadoProceso !== destino) {
    return false;
  }
  if (codigo === 2 || codigo === 3) {
    return !pedidoFresco.nroShippingOrder && !pedidoFresco.shippingOrder;
  }
  return true;
}
