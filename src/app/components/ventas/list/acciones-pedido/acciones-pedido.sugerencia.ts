/**
 * D-547 (F2, D16): qué acción sugerirle fijar a un usuario. Katuq SOLO sugiere: esta función no fija nada.
 * Función PURA, sin Angular. Las fechas son 'YYYY-MM-DD' en hora de Colombia (las calcula quien llama).
 *
 * Candidata: una de las 16 fijas que no esté entre las 8, con 3 días o más de uso en la última semana
 * (`usageDays`) y que no se haya rechazado hace menos de 30 días. Solo si la última sugerencia tiene 7 días o
 * más. Si hay varias gana la de más días y, a igualdad, la que va primero en la grilla.
 *
 * `dismissed[id]` guarda la fecha HASTA la que no se vuelve a sugerir (el día del rechazo + 30, D13): la
 * acción vuelve a ser candidata ese mismo día.
 */
import { AccionPedidoId, IDS_ACCIONES_FIJAS } from './acciones-pedido.catalogo';

export const DIAS_MINIMOS_DE_USO = 3;
export const DIAS_ENTRE_SUGERENCIAS = 7;

/** Días enteros entre dos fechas 'YYYY-MM-DD' (b - a). `null` si alguna no es una fecha válida. */
export function diasEntre(a: string, b: string): number | null {
  const ra = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a || '');
  const rb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || '');
  if (!ra || !rb) return null;
  const ua = Date.UTC(+ra[1], +ra[2] - 1, +ra[3]);
  const ub = Date.UTC(+rb[1], +rb[2] - 1, +rb[3]);
  return Math.round((ub - ua) / 86400000);
}

export function sugerencia(
  usageDays: Record<string, number> | null | undefined,
  ocho: readonly string[],
  dismissed: Record<string, string> | null | undefined,
  lastSuggestionAt: string | null | undefined,
  hoy: string,
): AccionPedidoId | null {
  if (!usageDays || diasEntre(hoy, hoy) === null) return null;

  if (lastSuggestionAt) {
    const desde = diasEntre(lastSuggestionAt, hoy);
    if (desde !== null && desde < DIAS_ENTRE_SUGERENCIAS) return null;
  }

  let ganadora: AccionPedidoId | null = null;
  let masDias = 0;
  for (const id of IDS_ACCIONES_FIJAS) {           // el orden de la grilla desempata
    if (ocho.includes(id)) continue;
    const dias = Number(usageDays[id]);
    if (!Number.isFinite(dias) || dias < DIAS_MINIMOS_DE_USO) continue;
    const hasta = dismissed?.[id];
    if (hasta) {
      const faltan = diasEntre(hoy, hasta);
      if (faltan !== null && faltan > 0) continue;  // rechazada hace menos de 30 días
    }
    if (dias > masDias) { masDias = dias; ganadora = id; }
  }
  return ganadora;
}
