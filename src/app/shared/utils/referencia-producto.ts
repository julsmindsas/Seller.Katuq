/**
 * La referencia de un producto, lista para facturar.
 *
 * Ticket 1113 (OH MY STORE): SIIGO rechaza una referencia con espacios en el
 * medio ("Invalid code: RWD-06-03-NUCLEO E30") y una con espacio al final no la
 * encuentra (ticket 1110). Los espacios de los lados se quitan solos; en el medio
 * no se dejan poner en una referencia nueva o cambiada. Una referencia que ya
 * existía con espacios se puede seguir editando sin cambiarla, para no romperle
 * nada a quien no factura con SIIGO.
 */
export const AVISO_REFERENCIA_CON_ESPACIOS =
  'La referencia no puede tener espacios. Usa un guion (-) en su lugar, por ejemplo CAM-ALG-001.';

export function limpiarReferencia(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor).trim();
}

export function referenciaTieneEspacios(valor: unknown): boolean {
  return /\s/.test(limpiarReferencia(valor));
}

/** true si la referencia nueva tiene espacios y no es la misma que ya tenía el producto. */
export function referenciaRechazada(nueva: unknown, original?: unknown): boolean {
  const limpia = limpiarReferencia(nueva);
  return referenciaTieneEspacios(limpia) && limpia !== limpiarReferencia(original);
}
