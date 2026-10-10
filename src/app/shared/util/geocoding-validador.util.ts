/**
 * Validador puro de resultados de geocodificación (D1 del cambio
 * fix-geocodificacion-corregimientos, ticket 1136).
 *
 * Se aplica a la salida de CUALQUIER proveedor (GeoBlr, Google, Nominatim) y a
 * lo que viene de la caché. No conoce Angular ni HTTP: recibe el resultado y el
 * contexto de la dirección y dice si se acepta y, si no, por qué.
 */
import {
  AreaGeografica,
  distanciaKm,
  puntoComodin,
  puntoDentroDeArea,
  resolverAreaEsperada,
} from './areas-geograficas.util';

/** Señales que Google devuelve y que los otros proveedores no tienen. */
export interface SenalesProveedor {
  /** `geometry.location_type`: ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE. */
  locationType?: string;
  partialMatch?: boolean;
  /** `types` del resultado: street_address, premise, route, locality... */
  types?: string[];
}

export interface ResultadoAValidar {
  latitud: string | number;
  longitud: string | number;
  senales?: SenalesProveedor;
}

export interface ContextoDireccion {
  barrio?: string | null;
  zonaCobro?: string | null;
  ciudad?: string | null;
}

export type MotivoRechazo =
  | 'COORDENADAS_INVALIDAS'
  | 'PUNTO_COMODIN'
  | 'RESULTADO_APROXIMADO'
  | 'FUERA_DE_AREA';

export interface Veredicto {
  valido: boolean;
  motivo?: MotivoRechazo;
  /** Texto corto para logs. */
  detalle?: string;
  areaEsperada: AreaGeografica | null;
  distanciaKm?: number;
}

/** Tipos de Google que sí ubican una dirección concreta (D4). */
const TIPOS_DIRECCION_EXACTA = new Set([
  'street_address', 'premise', 'subpremise', 'route', 'intersection', 'plus_code',
]);

/** Bounding box amplio de Colombia continental e insular. */
const COLOMBIA = { latMin: -4.3, latMax: 13.6, lngMin: -82.0, lngMax: -66.8 };

export function coordenadasValidas(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && !(lat === 0 && lng === 0)
    && lat >= COLOMBIA.latMin && lat <= COLOMBIA.latMax
    && lng >= COLOMBIA.lngMin && lng <= COLOMBIA.lngMax;
}

/** ¿Google dice que esto es un municipio/zona y no una dirección? (D4) */
export function esResultadoAproximado(senales?: SenalesProveedor): boolean {
  if (!senales) { return false; }
  const lt = String(senales.locationType || '').toUpperCase();
  if (lt === 'APPROXIMATE') { return true; }
  if (senales.partialMatch) {
    const tipos = senales.types || [];
    return !tipos.some((t) => TIPOS_DIRECCION_EXACTA.has(t));
  }
  return false;
}

export function validarResultadoGeocodificacion(
  resultado: ResultadoAValidar,
  contexto: ContextoDireccion = {},
): Veredicto {
  const lat = Number(resultado?.latitud);
  const lng = Number(resultado?.longitud);
  const areaEsperada = resolverAreaEsperada(contexto.barrio, contexto.zonaCobro, contexto.ciudad);

  if (!coordenadasValidas(lat, lng)) {
    return { valido: false, motivo: 'COORDENADAS_INVALIDAS', detalle: `${resultado?.latitud},${resultado?.longitud}`, areaEsperada };
  }

  const comodin = puntoComodin(lat, lng);
  if (comodin) {
    return { valido: false, motivo: 'PUNTO_COMODIN', detalle: comodin.origen, areaEsperada };
  }

  if (esResultadoAproximado(resultado.senales)) {
    return {
      valido: false, motivo: 'RESULTADO_APROXIMADO',
      detalle: `${resultado.senales?.locationType || ''} ${(resultado.senales?.types || []).join('/')}`.trim(),
      areaEsperada,
    };
  }

  if (areaEsperada) {
    const d = distanciaKm(lat, lng, areaEsperada.lat, areaEsperada.lng);
    if (!puntoDentroDeArea(lat, lng, areaEsperada)) {
      return {
        valido: false, motivo: 'FUERA_DE_AREA',
        detalle: `${d.toFixed(1)} km del centro de ${areaEsperada.nombre} (máx ${areaEsperada.radioKm} km)`,
        areaEsperada, distanciaKm: d,
      };
    }
    return { valido: true, areaEsperada, distanciaKm: d };
  }

  return { valido: true, areaEsperada: null };
}

/**
 * Para el aviso de zona de cobro (D7): ¿las coordenadas actuales coinciden con
 * el área de la zona elegida? Si la zona no tiene área, no hay nada que decir.
 */
export function coordenadasCoincidenConZona(
  latitud: string | number | null | undefined,
  longitud: string | number | null | undefined,
  zonaCobro: string | null | undefined,
  ciudad: string | null | undefined,
): { aplica: boolean; coincide: boolean; area: AreaGeografica | null; distanciaKm?: number } {
  const area = resolverAreaEsperada(null, zonaCobro, ciudad);
  const lat = Number(latitud);
  const lng = Number(longitud);
  // Solo opinamos cuando la zona nombra un corregimiento: el municipio es el
  // mismo que el de la ciudad y ya se validó al geocodificar.
  if (!area || area.tipo !== 'corregimiento' || !coordenadasValidas(lat, lng)) {
    return { aplica: false, coincide: true, area };
  }
  const d = distanciaKm(lat, lng, area.lat, area.lng);
  return { aplica: true, coincide: d <= area.radioKm, area, distanciaKm: d };
}
