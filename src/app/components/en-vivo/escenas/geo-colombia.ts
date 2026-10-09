import type { GeoColombia } from '../../../shared/escena-3d/mapa-colombia.scene';

/** El mapa de Colombia (Natural Earth, simplificado) que comparten la bienvenida y las escenas de "En vivo". */
const RUTA_GEO = 'assets/geo/colombia.json';

let cache: Promise<GeoColombia> | null = null;

/** Descarga el JSON una sola vez por sesión; si falla, el próximo intento vuelve a pedirlo. */
export function cargarGeoColombia(): Promise<GeoColombia> {
  if (!cache) {
    cache = fetch(RUTA_GEO)
      .then((r) => {
        if (!r.ok) throw new Error(`geo ${r.status}`);
        return r.json() as Promise<GeoColombia>;
      })
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}
