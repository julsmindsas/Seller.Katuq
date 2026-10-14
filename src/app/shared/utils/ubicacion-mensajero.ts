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

/** El punto se pinta solo si se actualizó hace poco y el mensajero no figura desconectado. */
export function ubicacionVigente(
  punto: PuntoMensajero | null | undefined,
  ahora: number = Date.now(),
  vigenciaMs: number = VIGENCIA_UBICACION_MS,
): boolean {
  if (!punto || punto.conectado === false) return false;
  const marca = marcaDeUbicacion(punto);
  if (marca === null) return false;
  return ahora - marca <= vigenciaMs;
}

/** Un punto de hace 3 min o menos se muestra "en vivo": la app nativa publica cada 1–2 min mientras está abierta. */
export const EN_VIVO_MS = 3 * 60 * 1000;

export type SenalMensajero = 'en-vivo' | 'reciente';

export function senalMensajero(marca: number | null, ahora: number = Date.now()): SenalMensajero {
  return marca !== null && ahora - marca <= EN_VIVO_MS ? 'en-vivo' : 'reciente';
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
