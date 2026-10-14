/**
 * Ticket 1154 (ALMARA): el mapa de rastreo mostraba a todo mensajero con una ubicación
 * fechada "hoy", sin importar hace cuánto se actualizó ni si seguía en línea. Alguien
 * podía aparecer en el mapa con un punto de hace horas, y quien ya no enviaba parecía
 * seguir ahí.
 *
 * Cada mensajero escribe en `active_users/<clave>`:
 * - `lastUpdate`: hora del servidor en milisegundos (la que no depende del reloj del celular);
 * - `timestamp`: texto ISO que pone el celular (a veces sin zona horaria);
 * - `conectado`: solo la app nativa; el servidor lo pone en false si la app se cierra o
 *   pierde la conexión (`onDisconnect`).
 */
export const VIGENCIA_UBICACION_MS = 15 * 60 * 1000;

export interface PuntoMensajero {
  lastUpdate?: number | string | null;
  timestamp?: string | null;
  conectado?: boolean | null;
  /** App v29+: lo escribe `onDisconnect` cuando la conexión se corta sin que el mensajero lo pidiera. */
  desconectadoEn?: number | string | null;
}

/**
 * Ticket 1159: la clave de un mensajero en `active_users` es `nombre_apellidos_<empresa>`, con la empresa en
 * minúsculas y todo lo que no sea letra o número convertido en `_` (las vocales con tilde también).
 * Para saber de qué empresa es, la clave debe TERMINAR en la de la empresa: antes el mapa aceptaba a quien
 * tuviera cualquier parte del nombre contenida en el de la empresa (una "a" de "garc_a" bastaba), y
 * dejaba ver mensajeros de otras empresas.
 */
export function claveEmpresa(nombre: string | null | undefined): string {
  return String(nombre || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function perteneceAEmpresa(clave: string | null | undefined, nombreEmpresa: string | null | undefined): boolean {
  const empresa = claveEmpresa(nombreEmpresa);
  if (!empresa) return false;
  const propia = String(clave || '').toLowerCase().replace(/_+/g, '_');
  return propia.length > empresa.length + 1 && propia.endsWith('_' + empresa);
}

/** Momento (ms) de la última ubicación: la hora del servidor y, si falta, la del celular. */
export function marcaDeUbicacion(punto: PuntoMensajero | null | undefined): number | null {
  const servidor = Number(punto?.lastUpdate);
  if (Number.isFinite(servidor) && servidor > 0) return servidor;
  const celular = punto?.timestamp ? Date.parse(punto.timestamp) : NaN;
  return Number.isFinite(celular) ? celular : null;
}

/** Momento (ms) en que se cortó la conexión, o null si el nodo no lo trae. */
export function marcaDesconexion(punto: PuntoMensajero | null | undefined): number | null {
  const v = punto?.desconectadoEn;
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number.isFinite(Number(v)) ? Number(v) : Date.parse(String(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * El punto se pinta solo si se actualizó hace poco. Quien figura desconectado se esconde, salvo que la
 * conexión se le haya cortado por sorpresa (`desconectadoEn`, app v29+): ese se sigue mostrando en gris
 * durante la vigencia, porque el despachador necesita saber dónde quedó. Apagar a propósito borra el nodo.
 */
export function ubicacionVigente(
  punto: PuntoMensajero | null | undefined,
  ahora: number = Date.now(),
  vigenciaMs: number = VIGENCIA_UBICACION_MS,
): boolean {
  if (!punto) return false;
  if (punto.conectado === false && marcaDesconexion(punto) === null) return false;
  const marca = marcaDeUbicacion(punto);
  if (marca === null) return false;
  return ahora - marca <= vigenciaMs;
}

/** Un punto de hace 3 min o menos se muestra "en vivo": la app nativa publica cada 1–2 min mientras está abierta. */
export const EN_VIVO_MS = 3 * 60 * 1000;

export type SenalMensajero = 'en-vivo' | 'reciente' | 'sin-conexion';

export function senalMensajero(
  marca: number | null,
  ahora: number = Date.now(),
  punto?: PuntoMensajero | null,
): SenalMensajero {
  if (punto?.conectado === false && marcaDesconexion(punto) !== null) return 'sin-conexion';
  return marca !== null && ahora - marca <= EN_VIVO_MS ? 'en-vivo' : 'reciente';
}

/** Más rápido que esto entre dos puntos (180 km/h) es un GPS que saltó, no un mensajero. */
export const MAX_VELOCIDAD_CREIBLE_MS = 50;

export interface PuntoEnMovimiento {
  lat: number;
  lng: number;
  marca: number | null;
}

/** Distancia en metros entre dos puntos (haversine). */
export function metrosEntre(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Un salto es imposible si para llegar habría que ir a más de 50 m/s. Sin horas en los dos puntos no se juzga. */
export function esSaltoImposible(anterior: PuntoEnMovimiento, nuevo: PuntoEnMovimiento): boolean {
  if (anterior.marca === null || nuevo.marca === null) return false;
  const segundos = (nuevo.marca - anterior.marca) / 1000;
  if (segundos <= 0) return false;
  return metrosEntre(anterior, nuevo) / segundos > MAX_VELOCIDAD_CREIBLE_MS;
}

/** Velocidad urbana que se asume cuando el mensajero va parado o no la reporta (≈ 22 km/h). */
export const VELOCIDAD_URBANA_MS = 6;
/** Las calles no van en línea recta: la distancia en línea recta se alarga un 30 %. */
const FACTOR_CALLES = 1.3;

/** Minutos estimados hasta el destino; aproximado a propósito (línea recta × calles / velocidad). */
export function minutosEstimados(
  desde: { lat: number; lng: number },
  hasta: { lat: number; lng: number },
  velocidadMs?: number,
): number {
  const v = velocidadMs !== undefined && velocidadMs > 1.5 ? velocidadMs : VELOCIDAD_URBANA_MS;
  return Math.ceil((metrosEntre(desde, hasta) * FACTOR_CALLES) / v / 60);
}

/**
 * Nombre legible desde la clave `nombre_apellidos_<empresa>`: se quita la empresa del final y los `_` pasan a
 * espacio. Las tildes y la ñ ya llegan perdidas (las apps las cambian por `_`), así que es un respaldo cuando
 * el nodo no trae su propio nombre.
 */
export function nombreDesdeClave(clave: string | null | undefined, nombreEmpresa: string | null | undefined): string {
  let propia = String(clave || '').toLowerCase().replace(/_+/g, '_');
  const empresa = claveEmpresa(nombreEmpresa);
  if (empresa && propia.endsWith('_' + empresa)) {
    propia = propia.slice(0, -(empresa.length + 1));
  }
  return propia
    .split('_')
    .filter(Boolean)
    .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

/** "hace unos segundos", "hace 7 min", "hace 1 h 5 min". */
export function haceCuanto(marca: number, ahora: number = Date.now()): string {
  const minutos = Math.max(0, Math.floor((ahora - marca) / 60000));
  if (minutos < 1) return 'hace unos segundos';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `hace ${horas} h ${resto} min` : `hace ${horas} h`;
}
