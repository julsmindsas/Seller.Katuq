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

/** "hace unos segundos", "hace 7 min", "hace 1 h 5 min". */
export function haceCuanto(marca: number, ahora: number = Date.now()): string {
  const minutos = Math.max(0, Math.floor((ahora - marca) / 60000));
  if (minutos < 1) return 'hace unos segundos';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `hace ${horas} h ${resto} min` : `hace ${horas} h`;
}
