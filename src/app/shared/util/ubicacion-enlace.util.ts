/**
 * Ticket 1203 / D-417: ubicación de una entrega como punto en el mapa.
 *
 * Lee las coordenadas que el comercio pega (enlace de Google Maps o texto
 * "lat, lng"), valida que el punto sirva para despachar en Colombia y arma el
 * enlace para abrirlo en Google Maps. Sin red: los enlaces cortos
 * (maps.app.goo.gl) no traen coordenadas y quedan para la fase 2.
 */

export type FuenteUbicacion = 'geocodificada' | 'manual' | 'enlace' | 'gps';

export interface PuntoUbicacion {
  lat: number;
  lng: number;
}

/** Caja de Colombia (incluye San Andrés y el Amazonas), con margen pequeño. */
const LAT_MIN = -4.3;
const LAT_MAX = 13.5;
const LNG_MIN = -82;
const LNG_MAX = -66.8;

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

/**
 * Patrones en orden de preferencia. `@lat,lng` es la vista del mapa en un
 * enlace largo; `q=`, `query=`, `ll=` y `destination=` son el punto buscado.
 * Se prefieren los del punto buscado porque `@` es el centro de la vista.
 */
const PATRONES: RegExp[] = [
  new RegExp(`[?&](?:q|query|destination|daddr)=(?:loc:)?${NUM}\\s*,\\s*${NUM}`, 'i'),
  new RegExp(`[?&]ll=${NUM}\\s*,\\s*${NUM}`, 'i'),
  new RegExp(`!3d${NUM}!4d${NUM}`),
  new RegExp(`@${NUM}\\s*,\\s*${NUM}`),
];

const SOLO_COORDENADAS = new RegExp(`^\\s*\\(?${NUM}\\s*[,;\\s]\\s*${NUM}\\)?\\s*$`);

/** True si el punto es un número válido, no es 0,0 y cae en Colombia. */
export function esPuntoValido(lat: any, lng: any): boolean {
  const la = typeof lat === 'number' ? lat : parseFloat(String(lat ?? '').trim());
  const ln = typeof lng === 'number' ? lng : parseFloat(String(lng ?? '').trim());
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (la === 0 && ln === 0) return false;
  return la >= LAT_MIN && la <= LAT_MAX && ln >= LNG_MIN && ln <= LNG_MAX;
}

/**
 * Extrae el punto de un enlace de Google Maps o de un texto "lat, lng".
 * Devuelve null si no encuentra coordenadas o si el punto no es válido.
 */
export function leerUbicacion(texto: string | null | undefined): PuntoUbicacion | null {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  let decodificado = t;
  try {
    decodificado = decodeURIComponent(t);
  } catch {
    // Texto con % sueltos: se usa tal cual.
  }

  const candidatos: RegExpMatchArray[] = [];
  const directo = decodificado.match(SOLO_COORDENADAS);
  if (directo) candidatos.push(directo);
  for (const patron of PATRONES) {
    const m = decodificado.match(patron);
    if (m) candidatos.push(m);
  }

  for (const m of candidatos) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (esPuntoValido(lat, lng)) return { lat, lng };
  }
  return null;
}

/** True si el texto parece un enlace (para decidir el mensaje de error). */
export function pareceEnlace(texto: string | null | undefined): boolean {
  return /^\s*https?:\/\//i.test(String(texto ?? '')) || /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(String(texto ?? ''));
}

/** Enlace universal de Google Maps (web y app del celular). */
export function enlaceMaps(lat: any, lng: any): string {
  if (!esPuntoValido(lat, lng)) return '';
  return `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`;
}

/** Coordenadas en el formato que ya guarda Katuq: "lat, lng". */
export function formatoCoordenadas(lat: any, lng: any): string {
  if (!esPuntoValido(lat, lng)) return '';
  return `${Number(lat)}, ${Number(lng)}`;
}
