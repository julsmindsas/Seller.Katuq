import { CiudadEnVivo } from '../../servicios/en-vivo.modelos';
import { entero } from '../../utilidades/formato';

/** A dónde van los pedidos de hoy: las ciudades con más pedidos, de las que el servidor pudo ubicar (tope de 30). */

export interface FilaCiudad {
  dane: string;
  nombre: string;
  /** Departamento, para distinguir ciudades con el mismo nombre. null si no se conoce. */
  detalle: string | null;
  pedidos: number;
  /** "23". */
  texto: string;
  /** Largo de la barra respecto a la primera, de 0 a 100. */
  ancho: number;
}

export const CIUDADES_VISIBLES = 6;

export function armarCiudades(
  ciudades: ReadonlyArray<CiudadEnVivo> | null | undefined,
  maximo: number = CIUDADES_VISIBLES
): FilaCiudad[] {
  const lista = (ciudades ?? [])
    .filter((c) => !!c && c.pedidos > 0)
    .slice()
    .sort((a, b) => b.pedidos - a.pedidos || String(a.nombre).localeCompare(String(b.nombre)))
    .slice(0, Math.max(1, maximo));
  const tope = Math.max(1, lista.length > 0 ? lista[0].pedidos : 1);
  return lista.map((c) => ({
    dane: c.dane,
    nombre: c.nombre || c.dane,
    detalle: c.departamento ?? null,
    pedidos: c.pedidos,
    texto: entero(c.pedidos),
    ancho: Math.round((c.pedidos / tope) * 1000) / 10,
  }));
}
