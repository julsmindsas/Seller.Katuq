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

/** D-726 (ticket 1653): bodega marcada «Usar solo como última opción» (Zona Franca en ALMACEN BOMBAS). */
export function esUltimaOpcion(bodega: any): boolean {
  return bodega?.ultimaOpcion === true;
}

/** Existencias de un producto en una bodega, según el desglose del producto (0 si no hay). */
export function existenciasEnBodega(item: any, idBodega: string): number {
  return Number(item?.producto?.stockPorBodega?.[idBodega]) || 0;
}

/**
 * Bodega de la que sale una línea. Primero las bodegas de la zona que no son de
 * última opción: la activa si le alcanza; si no, la que sí alcance con más
 * existencias. Si ninguna alcanza, las de última opción en el mismo orden (D-726).
 * Si nada alcanza, la activa (el control de existencias del servidor decide).
 * Sin bodegas de última opción es la regla de siempre (D-539). Null si la línea no
 * es inventariable o no trae el desglose por bodega.
 */
export function bodegaParaLinea(item: any, activa: any, zona: any[]): { idBodega: string; nombre: string } | null {
  const producto = item?.producto || {};
  if (producto?.disponibilidad?.inventariable === false) return null;
  const stock = producto?.stockPorBodega;
  if (!stock || !activa?.idBodega || !zona?.length) return null;
  const cantidad = Number(item?.cantidad) || 1;
  const existencias = (b: any) => Number(stock[b.idBodega]) || 0;
  const resultado = (b: any) => ({ idBodega: b.idBodega, nombre: b.nombre || b.idBodega });
  const elegirEntre = (ultima: boolean) => {
    if (esUltimaOpcion(activa) === ultima && existencias(activa) >= cantidad) return activa;
    return zona
      .filter((b) => b.idBodega !== activa.idBodega && esUltimaOpcion(b) === ultima && existencias(b) >= cantidad)
      .sort((a, b) => existencias(b) - existencias(a))[0] || null;
  };
  return resultado(elegirEntre(false) || elegirEntre(true) || activa);
}
