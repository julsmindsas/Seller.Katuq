/**
 * Precio y descuento de la lista del tipo de cliente — D-219 Fase 2.
 *
 * Reglas (Daniel, 2026-08-20):
 *  - El cliente con tipo recibe el precio de SU lista y el descuento de SU
 *    lista. Guía Cereza manda para Público y Mayorista; "Modelos" es una lista
 *    manual de Katuq (Cereza no la tiene) y también se respeta tal cual.
 *  - El descuento se guarda AL LADO del precio de lista (`precioDescuentoConIva`
 *    + `descuentoHasta`), nunca encima: así el precio de lista es el que se
 *    muestra tachado y cuando la campaña vence el precio vuelve solo.
 *  - Las promociones de catálogo NO se acumulan sobre precios de lista (el
 *    backend ya lo respeta: `_precioAplicadoPorCategoria` salta la promoción).
 */

export interface PrecioTipoCliente {
  tipoClienteId?: string;
  tipoClienteNombre?: string;
  activo?: boolean;
  precioConIva?: number;
  precio?: number;
  valorIva?: number;
  porcentajeIva?: number;
  precioDescuentoConIva?: number | null;
  precioDescuento?: number | null;
  descuentoPorcentaje?: number | null;
  descuentoHasta?: string | null;
}

/** Fila activa de la lista del cliente, o null si no tiene. */
export function filaDeTipoCliente(
  producto: any,
  tipoClienteId: string | null | undefined,
): PrecioTipoCliente | null {
  if (!tipoClienteId || !Array.isArray(producto?.preciosPorTipoCliente)) return null;
  return (
    producto.preciosPorTipoCliente.find(
      (p: PrecioTipoCliente) => p?.tipoClienteId === tipoClienteId && p?.activo === true,
    ) || null
  );
}

/**
 * ¿La campaña de esa fila sigue vigente? `descuentoHasta` viene de la campaña
 * de SU tienda en Cereza (puede traer hora y zona: se compara por fecha).
 */
export function descuentoVigente(fila: PrecioTipoCliente | null): boolean {
  if (!fila) return false;
  const conIva = Number(fila.precioConIva) || 0;
  const desc = fila.precioDescuentoConIva == null ? NaN : Number(fila.precioDescuentoConIva);
  if (!Number.isFinite(desc) || desc <= 0 || desc >= conIva) return false;
  if (!fila.descuentoHasta) return true; // sin fecha = sin vencimiento conocido
  const hasta = String(fila.descuentoHasta).slice(0, 10);
  const hoy = new Date().toISOString().slice(0, 10);
  return hasta >= hoy;
}

/** Precio efectivo CON IVA de la fila: el rebajado si la campaña vive, si no el de lista. */
export function precioEfectivoDeFila(fila: PrecioTipoCliente): number {
  return descuentoVigente(fila)
    ? Number(fila.precioDescuentoConIva)
    : Number(fila.precioConIva) || 0;
}

/**
 * Copia del producto con el precio de la lista del cliente ya aplicado —
 * incluido su descuento vigente. Deja la marca `_precioAplicadoPorCategoria`
 * con el precio de lista SIN rebajar (para el tachado) y, cuando hubo
 * descuento, `_descuentoDeLista` con los datos de la campaña.
 *
 * Devuelve el producto intacto si el cliente no tiene fila para ese tipo.
 */
export function aplicarPrecioDeLista(producto: any, tipoClienteId: string | null | undefined): any {
  const fila = filaDeTipoCliente(producto, tipoClienteId);
  if (!fila || !(Number(fila.precioConIva) > 0)) return producto;

  const hayDescuento = descuentoVigente(fila);
  const conIva = hayDescuento ? Number(fila.precioDescuentoConIva) : Number(fila.precioConIva);
  const tarifa = Number(fila.porcentajeIva) || 0;
  const sinIva = hayDescuento
    ? (Number(fila.precioDescuento) > 0
        ? Number(fila.precioDescuento)
        : Math.round((conIva / (1 + tarifa / 100)) * 100) / 100)
    : (Number(fila.precio) > 0
        ? Number(fila.precio)
        : Math.round((conIva / (1 + tarifa / 100)) * 100) / 100);

  return {
    ...producto,
    precio: {
      ...producto.precio,
      precioUnitarioConIva: conIva,
      precioUnitarioSinIva: sinIva,
      valorIva: Math.round((conIva - sinIva) * 100) / 100,
    },
    _precioAplicadoPorCategoria: {
      tipoClienteId: fila.tipoClienteId,
      tipoClienteNombre: fila.tipoClienteNombre,
      precioOriginalConIva: producto?.precio?.precioUnitarioConIva,
      precioOriginalSinIva: producto?.precio?.precioUnitarioSinIva,
      // Precio de lista SIN rebajar: es el que se tacha en pantalla y el que
      // viaja a Cereza como `price` (el descuento va aparte, D-219).
      precioListaConIva: Number(fila.precioConIva),
      precioListaSinIva: Number(fila.precio) || null,
    },
    ...(hayDescuento
      ? {
          _descuentoDeLista: {
            tipoClienteId: fila.tipoClienteId,
            precioListaConIva: Number(fila.precioConIva),
            precioDescuentoConIva: conIva,
            descuentoPorcentaje: Number(fila.descuentoPorcentaje) || null,
            descuentoHasta: fila.descuentoHasta || null,
          },
        }
      : {}),
  };
}
