/**
 * Ticket 1161 (ALMACEN BOMBAS): al agregarle un código de descuento a un pedido YA CREADO el
 * sistema respondía "Cupón no válido" con los códigos que la empresa había creado.
 *
 * El listado de pedidos validaba el código contra la colección vieja `cupones`
 * (`/v1/cupones/validatecupon`), mientras que los códigos que se crean hoy viven en el módulo
 * Descuentos y Promociones (`descuentosPromociones`, `/v1/descuentos-promociones/aplicar-codigo`),
 * que es el que usa el carrito de la venta asistida. Aquí está lo que necesita el listado para
 * hablar con ese módulo: el armado de la solicitud y cómo queda el pedido con la respuesta.
 *
 * Es el mismo mapeo de `carrito.component.ts::aplicarResultadoDescuento`, sin el estado de esa pantalla.
 */
import { parse as flattedParse } from 'flatted';

/** Respuesta de `/v1/descuentos-promociones/aplicar-codigo`. */
export interface ResultadoCodigo {
  descuentoId: string;
  codigoPersonalizado?: string;
  tipo?: 'porcentaje' | 'valor_fijo' | 'envio_gratis';
  valor?: number;
  montoDescuento?: number;
  nombre?: string;
  aplicaA?: string;
  baseAplicada?: number;
}

export interface LineaParaCodigo {
  productoReferencia: string;
  categorias: string[];
  precioLinea: number;
  enPromocion: boolean;
}

/** Quién usa el código: el documento del cliente o, si no, su correo. */
export function clienteIdParaCodigo(pedido: any): string {
  return pedido?.cliente?.documento || pedido?.cliente?.correo_electronico_comprador || '';
}

/**
 * Nombres de categoría (en minúscula) de un producto, tolerante al formato: texto "flatted",
 * JSON, objeto ya parseado o el árbol `[ref, {label}]`. [] si no se puede resolver.
 */
export function categoriasDeProducto(producto: any): string[] {
  const raw = producto?.categorias ?? producto?.crearProducto?.categorias;
  if (!raw) return [];
  let arbol: any = raw;
  if (typeof raw === 'string') {
    try {
      arbol = flattedParse(raw);
    } catch {
      try {
        arbol = JSON.parse(raw);
      } catch {
        return [];
      }
    }
  }
  const nombres = new Set<string>();
  const visitar = (nodo: any) => {
    if (!nodo || typeof nodo !== 'object') return;
    const nombre = nodo?.data?.nombre ?? nodo?.nombre ?? nodo?.label;
    if (nombre && typeof nombre === 'string') nombres.add(nombre.trim().toLowerCase());
    if (Array.isArray(nodo?.children)) nodo.children.forEach(visitar);
  };
  if (Array.isArray(arbol)) arbol.forEach(visitar);
  else visitar(arbol);
  return Array.from(nombres);
}

/** Producto con precio promocional vigente: el código no se acumula sobre esas líneas. */
export function productoEnPromocion(producto: any): boolean {
  const promo = producto?.precioPromocional;
  const base = producto?.precio?.precioUnitarioConIva;
  return typeof promo === 'number' && typeof base === 'number' && promo < base;
}

/**
 * Las líneas del pedido para que el backend aplique el código solo a la categoría o producto
 * objetivo ("Aplica a"). `precioLinea` es la base de la línea (sin IVA ni envío).
 */
export function lineasParaCodigo(pedido: any, precioLinea: (item: any) => number): LineaParaCodigo[] {
  return (pedido?.carrito || []).map((item: any) => {
    const precio = Number(precioLinea(item));
    return {
      productoReferencia: item?.producto?.identificacion?.referencia || '',
      categorias: categoriasDeProducto(item?.producto),
      precioLinea: isNaN(precio) ? 0 : precio,
      enPromocion: productoEnPromocion(item?.producto) || !!item?._promocionAplicada,
    };
  });
}

/**
 * Deja el pedido con el código aplicado. El backend recalcula los totales al guardar:
 * - porcentaje sobre todo el pedido → `porceDescuento`;
 * - monto fijo, o CUALQUIER código dirigido a una categoría/producto → el monto ya viene resuelto
 *   sobre la base elegible y va como monto fijo (como porcentaje se sobre-aplicaría);
 * - envío gratis → sin descuento sobre productos; el envío en cero lo da la marca
 *   `descuentoAplicado.tipo === 'envio_gratis'`.
 * Los totales los termina `actualizarValoresPedido`.
 */
export function aplicarResultadoCodigo(pedido: any, res: ResultadoCodigo, codigoEscrito: string): void {
  const monto = Number(res.montoDescuento) || 0;
  const codigo = res.codigoPersonalizado || String(codigoEscrito || '').toUpperCase();

  pedido.descuentoAplicado = {
    descuentoId: res.descuentoId,
    codigoPersonalizado: codigo,
    tipo: res.tipo,
    valor: Number(res.valor) || 0,
    montoDescuento: monto,
    nombre: res.nombre || '',
    clienteId: clienteIdParaCodigo(pedido),
  };
  pedido.cuponAplicado = codigo;

  const esDirigido = !!res.aplicaA && res.aplicaA !== 'todos_los_productos';
  if (res.tipo === 'porcentaje' && !esDirigido) {
    pedido.porceDescuento = Number(res.valor) || 0;
    pedido.totalDescuento = monto;
  } else if (res.tipo === 'envio_gratis') {
    pedido.porceDescuento = 0;
    pedido.totalDescuento = 0;
  } else {
    pedido.porceDescuento = 0;
    pedido.totalDescuento = monto;
  }
}
