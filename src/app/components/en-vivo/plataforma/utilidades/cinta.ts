import { ComercioEnVivo } from '../../servicios/en-vivo.modelos';
import { dinero, dineroCorto, variacionPct } from '../../utilidades/formato';
import { ordenarComercios } from './carrera';
import { claseDeComercio, inicialesVisibles, nombreVisible } from './nombres';

/**
 * La cinta de "Hoy en Katuq": todos los comercios, sus pedidos, sus ventas y la variación contra
 * ayer a esta hora. Puro: las cifras salen del servidor (`cifrasGlobal.comercios`).
 */

export interface VariacionCinta {
  /** "▲ 12 %" o "▼ 5 %". */
  texto: string;
  sube: boolean;
}

export interface ItemCinta {
  empresa: string;
  nombre: string;
  nombreReal: string;
  iniciales: string;
  clase: string;
  /** "12 pedidos". */
  pedidos: string;
  /** "$3,4 M"; null con la privacidad encendida. */
  ventas: string | null;
  /** null si ayer a esta hora no había ventas (no hay contra qué comparar) o con la privacidad. */
  variacion: VariacionCinta | null;
  etiqueta: string;
}

/** Segundos por vuelta por comercio (con 16 comercios, 70 s, como el prototipo). */
const SEGUNDOS_POR_ITEM = 4.4;
const DURACION_MINIMA_S = 30;
const DURACION_MAXIMA_S = 240;

/** Duración de una vuelta completa de la cinta, en segundos: a más comercios, más despacio por vuelta (misma velocidad de lectura). */
export function duracionCinta(cantidad: number): number {
  const segundos = Math.round(Math.max(0, cantidad) * SEGUNDOS_POR_ITEM);
  return Math.min(DURACION_MAXIMA_S, Math.max(DURACION_MINIMA_S, segundos));
}

export function variacionDeComercio(c: ComercioEnVivo): VariacionCinta | null {
  const pct = variacionPct(c.ventas, c.ayerMismaHora?.ventas ?? 0);
  if (pct === null) return null;
  return { texto: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)} %`, sube: pct >= 0 };
}

/** Todos los comercios (también los que hoy van en cero: contra ayer, un cero también cuenta). */
export function armarCinta(comercios: ReadonlyArray<ComercioEnVivo>, ocultar: boolean): ItemCinta[] {
  return ordenarComercios(comercios, ocultar, false).map((c) => {
    const nombre = nombreVisible(c, ocultar);
    const pedidos = `${c.n} ${c.n === 1 ? 'pedido' : 'pedidos'}`;
    return {
      empresa: c.empresa,
      nombre,
      nombreReal: String(c.nombre ?? '').trim() || c.empresa,
      iniciales: inicialesVisibles(c, ocultar),
      clase: claseDeComercio(c.empresa),
      pedidos,
      ventas: ocultar ? null : dineroCorto(c.ventas),
      variacion: ocultar ? null : variacionDeComercio(c),
      etiqueta: `${nombre}: ${pedidos}${ocultar ? '' : `, ${dinero(c.ventas)}`}. Abrir su tablero`,
    };
  });
}
