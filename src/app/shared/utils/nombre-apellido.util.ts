/**
 * Separación de "nombre completo" en nombres + apellidos para los importadores
 * de Clientes, CRM y Corporativos.
 *
 * Las tres plantillas traen una sola columna de nombre ("Nombre / Razón social")
 * más una columna opcional "Apellidos". Cuando el usuario llena la de apellidos
 * no se toca nada; cuando la deja vacía se intenta partir el nombre, pero SOLO
 * si el registro es una persona natural — partir "Comercializadora El Progreso
 * S.A.S" dejaría "S.A.S" como apellido.
 *
 * La heurística es la misma que ya usa `CrearClienteModalComponent` al abrir un
 * cliente legacy (nombre completo en `nombres_completos`, apellidos vacío).
 */

/** Tipos de documento de persona JURÍDICA: nunca se parte el nombre. */
const TIPOS_DOC_EMPRESA = ['NIT', 'NIT_EXT'];

/**
 * Heurística Colombia: 2 palabras → 1 nombre + 1 apellido; 3 o más → los 2
 * últimos son apellidos. Una sola palabra se deja como nombre.
 */
export function splitNombreCompleto(nombreCompleto: string): { nombres: string; apellidos: string } {
  const limpio = String(nombreCompleto || '').trim().replace(/\s+/g, ' ');
  const words = limpio ? limpio.split(' ') : [];
  if (words.length <= 1) return { nombres: limpio, apellidos: '' };
  const nApellidos = words.length === 2 ? 1 : 2;
  return {
    nombres: words.slice(0, words.length - nApellidos).join(' '),
    apellidos: words.slice(words.length - nApellidos).join(' '),
  };
}

/**
 * Resuelve nombres/apellidos para una fila de importación.
 *
 * - `apellidos` con valor            → se respeta tal cual (el usuario mandó).
 * - `apellidos` vacía + tipo NIT     → no se parte (es una razón social).
 * - `apellidos` vacía + persona nat. → se parte con la heurística.
 *
 * Un tipo de documento vacío se trata como persona natural: en `corporate_clients`
 * el formulario arranca en CC y la mayoría de los registros lo son.
 */
export function resolverNombreApellido(
  nombreCompleto: string,
  apellidos: string,
  tipoDocumento?: string,
): { nombres: string; apellidos: string } {
  const nombres = String(nombreCompleto || '').trim().replace(/\s+/g, ' ');
  const apellidosDados = String(apellidos || '').trim();
  if (apellidosDados) return { nombres, apellidos: apellidosDados };

  const tipo = String(tipoDocumento || '').trim().toUpperCase();
  if (TIPOS_DOC_EMPRESA.includes(tipo)) return { nombres, apellidos: '' };

  return splitNombreCompleto(nombres);
}
