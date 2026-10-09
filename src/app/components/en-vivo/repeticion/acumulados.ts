import { horaDeColombia } from '../utilidades/formato';
import { HORA_MS, inicioDeHora } from './cronograma';

/**
 * Cuánto de cada hora "ya pasó" en un instante de la repetición. Se usa donde el servidor solo
 * manda cifras por hora (toda Katuq, y "ayer a esta hora"): el acumulado de la repetición en el
 * instante T es la suma de las horas completas más la parte de la hora en curso. Puro.
 */

/**
 * Parte (0 a 1) de la hora `k` que ya pasó en el instante `instanteMs`. Las horas anteriores
 * cuentan completas y las posteriores nada. En la hora de "ahora" el dato del servidor llega solo
 * hasta ahora, así que ESA hora se completa en `ahoraMs` (no al final de la hora); con `completa`
 * (la serie de ayer) cada hora dura la hora entera.
 */
export function fraccionDeHora(k: number, instanteMs: number, ahoraMs: number, completa = false): number {
  const h = horaDeColombia(instanteMs);
  if (k < h) return 1;
  if (k > h) return 0;
  const inicio = inicioDeHora(instanteMs);
  const duracion = completa || horaDeColombia(ahoraMs) !== h ? HORA_MS : Math.max(1, ahoraMs - inicio);
  return Math.max(0, Math.min(1, (instanteMs - inicio) / duracion));
}

/** Suma de una serie por hora (índice = hora de Colombia) hasta el instante T. */
export function acumular(serie: ReadonlyArray<number>, instanteMs: number, ahoraMs: number, completa = false): number {
  let total = 0;
  for (let k = 0; k < serie.length; k++) total += (serie[k] || 0) * fraccionDeHora(k, instanteMs, ahoraMs, completa);
  return total;
}

/** Igual que `acumular`, para filas con `hora` (no todas las horas tienen que venir). */
export function acumularFilas<T extends { hora: number }>(
  filas: ReadonlyArray<T>,
  valor: (fila: T) => number,
  instanteMs: number,
  ahoraMs: number,
  completa = false
): number {
  let total = 0;
  for (const fila of filas) total += (valor(fila) || 0) * fraccionDeHora(fila.hora, instanteMs, ahoraMs, completa);
  return total;
}
