/**
 * D-547 (F2, D12 y D16): los días de las acciones fijadas van en hora de Colombia (UTC-5, sin horario de
 * verano), igual que en el backend (`services/orderActions`). Funciones PURAS, sin Angular.
 */

const OFFSET_COLOMBIA_MS = -5 * 3600 * 1000;

/** Día 'YYYY-MM-DD' en Colombia para un instante dado. */
export function diaColombia(instante: Date = new Date()): string {
  return new Date(instante.getTime() + OFFSET_COLOMBIA_MS).toISOString().slice(0, 10);
}

/** `dia` ('YYYY-MM-DD') más `n` días. Una fecha inválida se devuelve tal cual. */
export function sumarDias(dia: string, n: number): string {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia || '');
  if (!r) return dia;
  return new Date(Date.UTC(+r[1], +r[2] - 1, +r[3] + n)).toISOString().slice(0, 10);
}
