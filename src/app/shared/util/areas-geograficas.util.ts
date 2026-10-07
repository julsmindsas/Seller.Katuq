/**
 * Áreas geográficas de referencia y puntos "comodín" para validar resultados de
 * geocodificación (ticket 1136, OpenSpec fix-geocodificacion-corregimientos).
 *
 * Es una tabla fija, sin dependencias de Angular ni de Firestore. Sirve para
 * detectar errores gruesos (una dirección de San Antonio de Prado ubicada en
 * Belén, a 9 km), no para decir si un punto está dentro del límite exacto de
 * un municipio.
 *
 * Fuente de los números (lectura de solo lectura, 2026-10-06): mediana de las
 * coordenadas guardadas en los pedidos de ALMARA FELICIDAD por zona de cobro,
 * descartando los puntos comodín. Los radios de municipio son amplios (p90 real
 * entre 2 y 6 km) y los de corregimiento son ajustados; un punto marcado a mano
 * nunca pasa por acá.
 */

export interface AreaGeografica {
  /** Nombre canónico, tal como se muestra. */
  nombre: string;
  /** Alias para comparar (sin tildes ni mayúsculas, ver `normalizarTexto`). */
  alias: string[];
  /** 'corregimiento' tiene prioridad sobre 'municipio' al resolver el área esperada. */
  tipo: 'municipio' | 'corregimiento';
  /** Municipio al que pertenece un corregimiento. */
  municipio?: string;
  lat: number;
  lng: number;
  /** Radio máximo aceptado en km alrededor del centroide. */
  radioKm: number;
}

export interface PuntoComodin {
  lat: number;
  lng: number;
  /** Para los logs y el backfill: de dónde sale este punto. */
  origen: string;
}

/** Puntos que un proveedor devuelve cuando no encontró la dirección. */
export const PUNTOS_COMODIN: PuntoComodin[] = [
  // 87 pedidos de ALMARA entre jun y oct 2026 con direcciones de Bello, Envigado,
  // Belén y Manrique, todos con este mismo punto (San Antonio de Prado). No está
  // en geocoding_cache (que solo guarda Google), así que lo devuelve otro proveedor.
  { lat: 6.1861684, lng: -75.6415486, origen: 'proveedor sin resultado (jun-oct 2026)' },
  // Centroide de Medellín: respaldo histórico de geocodificacionAproximada().
  { lat: 6.2442, lng: -75.5812, origen: 'centroide Medellín (respaldo del código)' },
  // 51 pedidos, sobre todo de sep-oct 2025.
  { lat: 6.26973, lng: -75.60256, origen: 'punto repetido 2025' },
  // Centroides que Google devuelve para "Calle 00 #00-00, <municipio>" y que
  // quedaron guardados en geocoding_cache con calidad 95.
  { lat: 6.24764, lng: -75.56582, origen: 'centroide Google Medellín' },
  { lat: 6.16729, lng: -75.58370, origen: 'centroide Google Envigado' },
  { lat: 6.33673, lng: -75.55959, origen: 'centroide Google Bello' },
  { lat: 6.33932, lng: -75.49273, origen: 'centroide Google Copacabana' },
  { lat: 6.15114, lng: -75.63662, origen: 'centroide Google La Estrella' },
  // Centro geográfico de Colombia: último respaldo histórico.
  { lat: 4.5709, lng: -74.2973, origen: 'centro de Colombia (respaldo del código)' },
];

/** Tolerancia para considerar que un punto ES un comodín (~30 m). */
export const TOLERANCIA_COMODIN_KM = 0.03;

export const AREAS_GEOGRAFICAS: AreaGeografica[] = [
  // ── Corregimientos de Medellín (radio ajustado) ──────────────────────────
  {
    nombre: 'San Antonio de Prado', tipo: 'corregimiento', municipio: 'Medellín',
    alias: ['san antonio de prado', 'prado'],
    lat: 6.1854, lng: -75.6473, radioKm: 4,
  },
  {
    nombre: 'San Cristóbal', tipo: 'corregimiento', municipio: 'Medellín',
    alias: ['san cristobal'],
    lat: 6.2777, lng: -75.6306, radioKm: 4.5,
  },
  {
    nombre: 'Altavista', tipo: 'corregimiento', municipio: 'Medellín',
    alias: ['altavista'],
    // Pocos datos (4): centroide del corregimiento, no mediana.
    lat: 6.2250, lng: -75.6250, radioKm: 5,
  },
  {
    nombre: 'Santa Elena', tipo: 'corregimiento', municipio: 'Medellín',
    alias: ['santa elena'],
    lat: 6.2110, lng: -75.4990, radioKm: 6,
  },
  {
    nombre: 'San Sebastián de Palmitas', tipo: 'corregimiento', municipio: 'Medellín',
    alias: ['palmitas', 'san sebastian de palmitas'],
    lat: 6.3430, lng: -75.6940, radioKm: 6,
  },
  // ── Municipios del Valle de Aburrá (radio amplio) ────────────────────────
  { nombre: 'Medellín', tipo: 'municipio', alias: ['medellin'], lat: 6.2477, lng: -75.5778, radioKm: 9 },
  { nombre: 'Bello', tipo: 'municipio', alias: ['bello'], lat: 6.3338, lng: -75.5583, radioKm: 6 },
  { nombre: 'Itagüí', tipo: 'municipio', alias: ['itagui'], lat: 6.1793, lng: -75.6043, radioKm: 6 },
  { nombre: 'Envigado', tipo: 'municipio', alias: ['envigado'], lat: 6.1673, lng: -75.5873, radioKm: 7 },
  { nombre: 'Sabaneta', tipo: 'municipio', alias: ['sabaneta'], lat: 6.1506, lng: -75.6155, radioKm: 5 },
  { nombre: 'La Estrella', tipo: 'municipio', alias: ['la estrella'], lat: 6.1566, lng: -75.6377, radioKm: 6 },
  { nombre: 'Caldas', tipo: 'municipio', alias: ['caldas'], lat: 6.0874, lng: -75.6357, radioKm: 6 },
  { nombre: 'Copacabana', tipo: 'municipio', alias: ['copacabana'], lat: 6.3439, lng: -75.5080, radioKm: 6 },
  { nombre: 'Girardota', tipo: 'municipio', alias: ['girardota'], lat: 6.3764, lng: -75.4464, radioKm: 6 },
  { nombre: 'Barbosa', tipo: 'municipio', alias: ['barbosa'], lat: 6.4383, lng: -75.3316, radioKm: 7 },
];

/** Minúsculas, sin tildes, sin la palabra "corregimiento", espacios colapsados. */
export function normalizarTexto(s: any): string {
  return (s == null ? '' : String(s))
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\bcorregimiento\b/g, ' ')
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia en km entre dos puntos (haversine). */
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const t = Math.PI / 180;
  const dLat = (lat2 - lat1) * t;
  const dLng = (lng2 - lng1) * t;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** ¿El texto menciona alguno de los alias del área? Compara por palabra completa. */
function textoMencionaArea(textoNormalizado: string, area: AreaGeografica): boolean {
  if (!textoNormalizado) { return false; }
  return area.alias.some((a) => {
    const alias = normalizarTexto(a);
    // "prado" solo cuenta si va acompañado de "antonio" para no confundir con
    // "Prado Centro" (barrio urbano de Medellín).
    if (alias === 'prado') {
      return /\bantonio\b/.test(textoNormalizado) && /\bprado\b/.test(textoNormalizado);
    }
    return new RegExp(`(^| )${alias}( |$)`).test(textoNormalizado);
  });
}

/**
 * Área esperada para una dirección de entrega (D3):
 * 1. corregimiento mencionado en el barrio o en la zona de cobro;
 * 2. si no, municipio de la ciudad;
 * 3. si no hay área conocida, null (solo aplican comodín y "aproximado").
 */
export function resolverAreaEsperada(
  barrio: string | null | undefined,
  zonaCobro: string | null | undefined,
  ciudad: string | null | undefined,
): AreaGeografica | null {
  const pistaCorregimiento = normalizarTexto(`${barrio || ''} ${zonaCobro || ''}`);
  const corregimiento = AREAS_GEOGRAFICAS.find(
    (a) => a.tipo === 'corregimiento' && textoMencionaArea(pistaCorregimiento, a),
  );
  if (corregimiento) { return corregimiento; }

  const ciudadNorm = normalizarTexto(ciudad);
  if (!ciudadNorm) { return null; }
  return AREAS_GEOGRAFICAS.find(
    (a) => a.tipo === 'municipio' && a.alias.some((al) => normalizarTexto(al) === ciudadNorm),
  ) || null;
}

/** ¿El punto es (a ~30 m) uno de los comodines conocidos? Devuelve el comodín o null. */
export function puntoComodin(lat: number, lng: number): PuntoComodin | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { return null; }
  return PUNTOS_COMODIN.find(
    (p) => distanciaKm(lat, lng, p.lat, p.lng) <= TOLERANCIA_COMODIN_KM,
  ) || null;
}

/** ¿El punto cae dentro del radio del área? (null si no hay área → true) */
export function puntoDentroDeArea(lat: number, lng: number, area: AreaGeografica | null): boolean {
  if (!area) { return true; }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { return false; }
  return distanciaKm(lat, lng, area.lat, area.lng) <= area.radioKm;
}

/**
 * Direcciones que no vale la pena geocodificar ni guardar en caché: vacías,
 * "N/A", números todos en cero ("Calle 00 #00-00") o textos de relleno que la
 * UI pone antes de que el usuario escriba.
 */
export function esDireccionBasura(direccion: string | null | undefined): boolean {
  const d = normalizarTexto(direccion);
  if (!d || d.length < 5) { return true; }
  if (/^(n a|na|no aplica|sin direccion|pendiente|null|undefined)$/.test(d)) { return true; }
  if (/completa el formulario/.test(d)) { return true; }
  // Todos los números son ceros ("calle 00 00 00", "calle 0 0 0").
  const numeros = d.match(/\d+/g) || [];
  if (numeros.length > 0 && numeros.every((n) => /^0+$/.test(n))) { return true; }
  return false;
}
