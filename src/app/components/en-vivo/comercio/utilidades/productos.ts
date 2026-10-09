import { ProductoEstrella } from '../../servicios/en-vivo.modelos';
import { dineroCorto, entero } from '../../utilidades/formato';

/**
 * Productos estrella de hoy (diseño 18). El servidor suma por nombre las líneas del carrito de los
 * pedidos de hoy y resta los cancelados y rechazados; aquí solo se toman los 6 primeros y se
 * reparte el ancho de las barras. Puro.
 */

export const MAX_PRODUCTOS_ESTRELLA = 6;

/** Colores del tema para las barras, en orden. */
export const COLORES_BARRAS: ReadonlyArray<string> = [
  'var(--ev-accent)',
  'var(--ev-pack)',
  'var(--ev-info)',
  'var(--ev-ok)',
  'var(--ev-warn)',
  'var(--ev-slate)',
];

export interface FilaProducto {
  /** Estable entre repintados (el nombre del producto). */
  clave: string;
  posicion: number;
  nombre: string;
  unidades: number;
  /** "12 und." */
  unidadesTexto: string;
  /** "$850 mil"; vacío con "ocultar clientes y montos". */
  valorTexto: string;
  /** Ancho de la barra, 0 a 100, contra el producto con más unidades. */
  ancho: number;
  color: string;
}

/**
 * Los 6 más vendidos: por unidades y, a igual cantidad, por valor. Lo que quedó en cero o menos
 * (por cancelaciones) y lo que no tiene nombre no cuenta.
 */
export function topProductos(
  productos: ReadonlyArray<ProductoEstrella> | null | undefined,
  maximo: number = MAX_PRODUCTOS_ESTRELLA
): ProductoEstrella[] {
  return (productos ?? [])
    .map((producto, orden) => ({ producto, orden }))
    .filter(({ producto }) => !!producto && !!producto.nombre && producto.unidades > 0)
    .sort(
      (a, b) =>
        b.producto.unidades - a.producto.unidades || b.producto.valor - a.producto.valor || a.orden - b.orden
    )
    .slice(0, Math.max(0, maximo))
    .map(({ producto }) => producto);
}

export function filasProductos(productos: ReadonlyArray<ProductoEstrella> | null | undefined, ocultar: boolean): FilaProducto[] {
  const top = topProductos(productos);
  const mayor = Math.max(1, ...top.map((p) => p.unidades));
  return top.map((p, i) => {
    const unidadesTexto = `${entero(p.unidades)} und.`;
    const valorTexto = ocultar ? '' : dineroCorto(p.valor);
    return {
      clave: p.nombre,
      posicion: i + 1,
      nombre: p.nombre,
      unidades: p.unidades,
      unidadesTexto,
      valorTexto,
      ancho: Math.round((p.unidades / mayor) * 1000) / 10,
      color: COLORES_BARRAS[i % COLORES_BARRAS.length],
    };
  });
}
