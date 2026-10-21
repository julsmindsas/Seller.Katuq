/**
 * Armado de lotes (F5-30, tarea 8.1). Un producto (con sus variantes, filas de foto y de inventario)
 * nunca se parte entre lotes: el servidor lo lee entero. Límites del contrato: 25 grupos por lote de
 * `products`, 2.000 por simulación, 2.500 filas por grupo y 100.000 filas por envío.
 */
import { GrupoEnvio } from '../tipos';

export interface LimitesLote {
  maxGrupos: number;
  maxFilasPorGrupo: number;
  maxFilasTotales: number;
}

export const LIMITES_PRODUCTOS: LimitesLote = Object.freeze({ maxGrupos: 25, maxFilasPorGrupo: 2500, maxFilasTotales: 100000 });
export const LIMITES_SIMULACION: LimitesLote = Object.freeze({ maxGrupos: 2000, maxFilasPorGrupo: 2500, maxFilasTotales: 100000 });

export interface Sobrante {
  key: string;
  filas: number;
  /** El producto trae más filas de las que cabe en un envío y no se puede partir. */
  motivo: 'TOO_MANY_ROWS';
}

export const filasDelGrupo = (g: GrupoEnvio): number => g.rows.length + g.inventoryRows.length;

export function armarLotes(grupos: GrupoEnvio[], limites: LimitesLote = LIMITES_PRODUCTOS): { lotes: GrupoEnvio[][]; sobrantes: Sobrante[] } {
  const lotes: GrupoEnvio[][] = [];
  const sobrantes: Sobrante[] = [];
  let actual: GrupoEnvio[] = [];
  let filasActual = 0;
  for (const g of grupos) {
    const n = filasDelGrupo(g);
    if (n > limites.maxFilasPorGrupo || n > limites.maxFilasTotales) {
      sobrantes.push({ key: g.key, filas: n, motivo: 'TOO_MANY_ROWS' });
      continue;
    }
    if (actual.length > 0 && (actual.length >= limites.maxGrupos || filasActual + n > limites.maxFilasTotales)) {
      lotes.push(actual);
      actual = [];
      filasActual = 0;
    }
    actual.push(g);
    filasActual += n;
  }
  if (actual.length > 0) lotes.push(actual);
  return { lotes, sobrantes };
}

/** Pedazos de tamaño fijo, para fotos (10 productos) y clientes (500 filas). */
export function partirEn<T>(items: T[], tamano: number): T[][] {
  const salida: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) salida.push(items.slice(i, i + tamano));
  return salida;
}
