/**
 * D-547 (F2, D16): qué acciones cuentan como «uso» para las sugerencias. Funciones PURAS, sin Angular: las
 * carga también `node --test`. Solo cuentan las 16 fijas de la grilla (las de contexto y Eliminar no se pueden
 * fijar, así que nunca se sugieren) y el conteo guarda solo el id de la acción: nada del pedido ni del cliente.
 */
import { AccionPedidoId, IDS_ACCIONES_FIJAS, accionPorId } from './acciones-pedido.catalogo';

/** `true` si el uso de esta acción se cuenta. */
export const cuentaComoUso = (id: string): id is AccionPedidoId => (IDS_ACCIONES_FIJAS as string[]).includes(id);

/**
 * La acción fija que lleva este título (el del catálogo): el menú «⋯» de cada fila usa los mismos nombres que la
 * grilla (D8), así que el uso desde ese menú se reconoce por el título. Un título que no es de una fija da `null`.
 */
export function idFijaPorTitulo(titulo: string | null | undefined): AccionPedidoId | null {
  if (!titulo) return null;
  const t = titulo.trim();
  for (const id of IDS_ACCIONES_FIJAS) if (accionPorId(id).titulo === t) return id;
  return null;
}
