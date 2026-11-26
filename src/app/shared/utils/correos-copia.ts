/**
 * Ticket 1651 (D-723): «Enviar copia a» en los datos de facturación. La factura de SIIGO se envía además a
 * estos correos (hasta 5). Misma regla del servidor (services/accounting/utils/correosCopia.js).
 */
export const MAX_COPIAS = 5;
const CORREO = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/;

export type ErrorCopia = 'invalido' | 'repetido' | 'esPrincipal' | 'maximo' | null;

/** Texto de cada error (claves literales, para que el revisor de textos las encuentre). */
export const TEXTO_ERROR_COPIA: Record<Exclude<ErrorCopia, null>, string> = {
  invalido: 'ventas.pedidoFacturacion.copiaInvalida',
  repetido: 'ventas.pedidoFacturacion.copiaRepetida',
  esPrincipal: 'ventas.pedidoFacturacion.copiaEsPrincipal',
  maximo: 'ventas.pedidoFacturacion.copiaMaximo',
};

/** Por qué no se puede agregar `nuevo` a la lista (o null si se puede). */
export function errorNuevaCopia(nuevo: unknown, lista: string[], principal: unknown): ErrorCopia {
  const c = String(nuevo ?? '').trim().toLowerCase();
  if (!CORREO.test(c)) return 'invalido';
  if (c === String(principal ?? '').trim().toLowerCase()) return 'esPrincipal';
  if (lista.includes(c)) return 'repetido';
  if (lista.length >= MAX_COPIAS) return 'maximo';
  return null;
}

/** Lista guardada lista para mostrar/editar: válidos, en minúsculas, sin repetidos ni el principal, máximo 5. */
export function normalizarCorreosCopia(lista: unknown, principal?: unknown): string[] {
  if (!Array.isArray(lista)) return [];
  const prin = String(principal ?? '').trim().toLowerCase();
  const salida: string[] = [];
  for (const v of lista) {
    const c = String(v ?? '').trim().toLowerCase();
    if (!CORREO.test(c) || c === prin || salida.includes(c)) continue;
    salida.push(c);
    if (salida.length === MAX_COPIAS) break;
  }
  return salida;
}

/**
 * Para «Agregar»: separa lo escrito por coma, punto y coma o espacios (se puede pegar una lista) y agrega
 * los que sirven. Devuelve la lista nueva y el primer error, si alguno no entró.
 */
export function agregarCopias(escrito: unknown, lista: string[], principal: unknown): { lista: string[]; error: ErrorCopia } {
  const partes = String(escrito ?? '').split(/[;,\s]+/).map((p) => p.trim()).filter(Boolean);
  let nueva = [...lista];
  let error: ErrorCopia = partes.length ? null : 'invalido';
  for (const p of partes) {
    const e = errorNuevaCopia(p, nueva, principal);
    if (e) { error = error || e; continue; }
    nueva = [...nueva, p.toLowerCase()];
  }
  return { lista: nueva, error };
}
