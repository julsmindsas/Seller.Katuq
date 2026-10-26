/**
 * Ticket 1340: «Gómez», no «GóMez». La versión anterior (`/\b\w/g`) no reconoce las letras con
 * tilde como parte de la palabra y ponía en mayúscula la letra que sigue a la tilde
 * («MaríA», «PeñA», «áNgela»). Una sola función para todo Katuq.
 *
 * Pone en mayúscula la primera letra de cada palabra y el resto en minúscula. Una palabra empieza
 * al inicio del texto o después de un espacio, guion, apóstrofo, punto, paréntesis o barra
 * («S.A.» sigue siendo «S.A.»).
 */
export function mayusculaInicial(texto: string): string {
  if (!texto) return texto;
  return texto
    .toLocaleLowerCase('es-CO')
    .replace(/(^|[\s\-'.(/])(\p{L})/gu, (_: string, antes: string, letra: string) => antes + letra.toLocaleUpperCase('es-CO'));
}
