/**
 * D-536: precio base, IVA y descuento por línea en Ventas POS.
 *
 * `resolverLineaPos` es el espejo del cálculo legacy del servidor
 * (`orderCalculationService.getSubTotalPedido` / `getTotalImpuesto`), que es el
 * que guarda el pedido mientras `IVA_PERSIST_CANONICAL` esté apagado:
 *   sinIva: precio manual (si el producto lo permite) → escalón de volumen → base.
 *   tarifa: IVA manual → IVA del escalón → `precioUnitarioIva`.
 *   neto = sinIva × cant × (1 − desc); IVA = sinIva × tarifa × cant × (1 − desc).
 * Sin redondeo intermedio, igual que el servidor. Los casos de referencia viven
 * en tests/ventas/pos-linea-precio.fixtures.json (copia idéntica en el back).
 *
 * Una línea SIN cambios no pasa por aquí: el POS la sigue cobrando con
 * `discount_price || precioUnitarioConIva`, como antes.
 */

export const TARIFAS_IVA = [0, 5, 8, 19] as const;

export interface LineaPos {
  precio: any;
  procesoComercial?: any;
  cantidad: number;
  _precioManualOverride?: number | null;
  _ivaManualOverride?: number | null;
  descuentoLinea?: number | null;
}

export interface LineaPosResuelta {
  sinIva: number;
  tarifa: number;
  desc: number;
  conIvaUnitarioNeto: number;
  ivaUnitarioNeto: number;
  totalLinea: number;
}

/** Claves de edición que viven en el ítem del carrito del POS. */
export const CLAVES_EDICION_LINEA = ['_precioManualOverride', '_ivaManualOverride', 'descuentoLinea', '_precioManualTemp'];

const presente = (v: unknown) => v !== undefined && v !== null;

export function permitePrecioManual(l: LineaPos): boolean {
  return l?.procesoComercial?.permitePrecioManual === true;
}

export function tieneCambios(l: LineaPos): boolean {
  if (!l) return false;
  return (presente(l._precioManualOverride) && permitePrecioManual(l)) ||
    presente(l._ivaManualOverride) ||
    sanearDescuento(l.descuentoLinea) > 0;
}

/** Vacío, NaN o negativo → undefined (la línea vuelve al precio original). */
export function sanearPrecioManual(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Igual que la venta asistida: NaN o negativo → 0, mayor que 100 → 100. */
export function sanearDescuento(v: unknown): number {
  const d = Number(v);
  if (!Number.isFinite(d) || d < 0) return 0;
  return Math.min(100, d);
}

/** Espejo de `_sinIvaDesde` del servidor (D-219): sin-IVA vacío → derivado del con-IVA. */
function sinIvaDesde(precio: any): number {
  const sin = Number(precio?.precioUnitarioSinIva) || 0;
  if (sin > 0) return sin;
  const con = Number(precio?.precioUnitarioConIva) || 0;
  if (con <= 0) return 0;
  const tarifa = parseFloat(precio?.precioUnitarioIva) || 0;
  return Math.round((con / (1 + tarifa / 100)) * 100) / 100;
}

/** Escalón de volumen vigente; el que no declara rango se salta (ticket 1024). */
function escalonVigente(precio: any, cantidad: number): any | null {
  const escalones = Array.isArray(precio?.preciosVolumen) ? precio.preciosVolumen : [];
  for (const x of escalones) {
    if (x?.numeroUnidadesInicial == null && x?.numeroUnidadesLimite == null) continue;
    const inicial = Number(x.numeroUnidadesInicial) || 0;
    const limite = Number(x.numeroUnidadesLimite) || Infinity;
    if (cantidad >= inicial && cantidad <= limite) return x;
  }
  return null;
}

export function resolverLineaPos(l: LineaPos): LineaPosResuelta {
  const cantidad = Number(l?.cantidad) || 0;
  const precio = l?.precio || {};
  const escalon = escalonVigente(precio, cantidad);

  let sinIva: number;
  if (presente(l?._precioManualOverride) && permitePrecioManual(l)) {
    sinIva = Number(l._precioManualOverride) || 0;
  } else if (escalon) {
    sinIva = Number(escalon.valorUnitarioPorVolumenSinIVA) || 0;
  } else {
    sinIva = sinIvaDesde(precio);
  }

  let tarifa: number;
  if (presente(l?._ivaManualOverride)) {
    tarifa = Number(l._ivaManualOverride) || 0;
  } else if (escalon && !(presente(l?._precioManualOverride) && permitePrecioManual(l))) {
    tarifa = Number(escalon.valorIVAPorVolumen ?? precio.precioUnitarioIva) || 0;
  } else {
    tarifa = Number(precio.precioUnitarioIva) || 0;
  }

  const desc = sanearDescuento(l?.descuentoLinea) / 100;
  const ivaUnitarioNeto = sinIva * (tarifa / 100) * (1 - desc);
  const conIvaUnitarioNeto = sinIva * (1 - desc) + ivaUnitarioNeto;
  return { sinIva, tarifa, desc, conIvaUnitarioNeto, ivaUnitarioNeto, totalLinea: conIvaUnitarioNeto * cantidad };
}

/** Ítem plano del carrito del POS (`CartService.posCartItems`). */
export function lineaDesdeItemPos(item: any): LineaPos {
  return {
    precio: item?.precio,
    procesoComercial: item?.procesoComercial,
    cantidad: item?.cantidad,
    _precioManualOverride: item?._precioManualOverride,
    _ivaManualOverride: item?._ivaManualOverride,
    descuentoLinea: item?.descuentoLinea,
  };
}

/** Línea de pedido guardado (`{ producto: {precio, procesoComercial}, cantidad, ... }`). */
export function lineaDesdePedido(linea: any): LineaPos {
  return {
    precio: linea?.producto?.precio,
    procesoComercial: linea?.producto?.procesoComercial,
    cantidad: linea?.cantidad,
    _precioManualOverride: linea?._precioManualOverride,
    _ivaManualOverride: linea?._ivaManualOverride,
    descuentoLinea: linea?.descuentoLinea,
  };
}

/** Precio unitario con IVA que cobra el POS por un ítem del carrito. */
export function precioUnitarioPos(item: any): number {
  const linea = lineaDesdeItemPos(item);
  if (tieneCambios(linea)) return resolverLineaPos(linea).conIvaUnitarioNeto;
  return item?.discount_price || item?.precio?.precioUnitarioConIva || 0;
}

/** Ítem sin las claves de edición: el snapshot `producto` no debe llevarlas. */
export function sinClavesDeEdicion(item: any): any {
  const copia = { ...(item || {}) };
  CLAVES_EDICION_LINEA.forEach((k) => delete copia[k]);
  return copia;
}

/**
 * Campos de edición que van a nivel de la línea del pedido, solo si aplican.
 * Mismos nombres que la venta asistida.
 */
export function lineaPedidoPos(item: any): { producto: any; cantidad: number; _precioManualOverride?: number; _ivaManualOverride?: number; descuentoLinea?: number } {
  const linea = lineaDesdeItemPos(item);
  const out: any = { producto: sinClavesDeEdicion(item), cantidad: item?.cantidad };
  const manual = sanearPrecioManual(item?._precioManualOverride);
  if (manual !== undefined && permitePrecioManual(linea)) out._precioManualOverride = manual;
  if (presente(item?._ivaManualOverride)) out._ivaManualOverride = Number(item._ivaManualOverride);
  const desc = sanearDescuento(item?.descuentoLinea);
  if (desc > 0) out.descuentoLinea = desc;
  return out;
}
