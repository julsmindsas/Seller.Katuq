/**
 * D-539 (ticket 1331): pedido con productos de varias bodegas de una misma zona.
 * La zona de una bodega es `zona` y, si no tiene, `ciudad` (misma regla que el
 * servidor en services/inventory/lineWarehouse.js). Funciones puras.
 */

const normalizar = (t: any): string =>
  String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Zona de una bodega: `zona` o `ciudad`; '' si ninguna. */
export function zonaDeBodega(bodega: any): string {
  return normalizar(bodega?.zona || bodega?.ciudad);
}

/** Bodegas de la misma zona que la activa (incluida ella). Vacío si la activa no tiene zona. */
export function bodegasDeLaZona(activa: any, bodegas: any[]): any[] {
  const zona = zonaDeBodega(activa);
  if (!zona || !activa?.idBodega) return [];
  return (bodegas || []).filter((b) => b?.idBodega && zonaDeBodega(b) === zona);
}

/**
 * Bodega de la que sale una línea: la activa si le alcanza; si no, la de la zona
 * que sí alcance con más existencias; si ninguna alcanza, la activa (el control
 * de existencias del servidor decide). Null si la línea no es inventariable o no
 * trae el desglose por bodega.
 */
export function bodegaParaLinea(item: any, activa: any, zona: any[]): { idBodega: string; nombre: string } | null {
  const producto = item?.producto || {};
  if (producto?.disponibilidad?.inventariable === false) return null;
  const stock = producto?.stockPorBodega;
  if (!stock || !activa?.idBodega || !zona?.length) return null;
  const cantidad = Number(item?.cantidad) || 1;
  const existencias = (b: any) => Number(stock[b.idBodega]) || 0;
  const resultado = (b: any) => ({ idBodega: b.idBodega, nombre: b.nombre || b.idBodega });
  if (existencias(activa) >= cantidad) return resultado(activa);
  const alcanzan = zona.filter((b) => b.idBodega !== activa.idBodega && existencias(b) >= cantidad)
    .sort((a, b) => existencias(b) - existencias(a));
  return resultado(alcanzan[0] || activa);
}
