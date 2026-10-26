/**
 * D-547 (F1, D6): buscador «Buscar acción» del modal. Funciones PURAS, sin Angular.
 *
 * Filtra sin mayúsculas ni tildes (NFD) por título, reseña y nombres anteriores, en las 16 fijas y en las
 * acciones de contexto (y sus subacciones) que están visibles para ese pedido.
 */
import { ACCIONES_PEDIDO, AccionPedido, AccionPedidoId, accionPorId } from './acciones-pedido.catalogo';
import { EstadoAccion, EstadoAcciones } from './acciones-pedido.estado';

export interface ItemBusqueda {
  accion: AccionPedido;
  estado: EstadoAccion;
}

/** Minúsculas, sin tildes y con los espacios colapsados. */
export function normalizarTexto(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Candidatas del buscador: las fijas visibles (en el orden de la grilla), luego contexto y subacciones visibles.
 * Factura electrónica no es candidata por sí sola: se buscan sus hijos (que también coinciden con el nombre del grupo).
 */
export function candidatasBusqueda(estados: EstadoAcciones): ItemBusqueda[] {
  const orden: Record<string, number> = { fija: 0, contexto: 1, subaccion: 2, pie: 3 };
  return ACCIONES_PEDIDO
    .filter(a => a.tipo !== 'pie' && a.id !== 'electronicInvoice' && estados[a.id]?.visible)
    .map((accion, i) => ({ accion, estado: estados[accion.id], i }))
    .sort((a, b) => (orden[a.accion.tipo] - orden[b.accion.tipo]) || (a.i - b.i))
    .map(({ accion, estado }) => ({ accion, estado }));
}

/** Las acciones cuyo título, reseña o nombre anterior contienen el texto. Sin texto, todas. */
export function filtrarAcciones(texto: string, acciones: ItemBusqueda[]): ItemBusqueda[] {
  const q = normalizarTexto(texto);
  if (!q) return acciones.slice();
  return acciones.filter(({ accion }) => {
    const grupo = accion.padre === 'electronicInvoice' ? accionPorId(accion.padre).titulo : null;
    const campos = [accion.titulo, accion.tituloAlterno, accion.resena, grupo, ...accion.nombresAnteriores];
    return campos.some(c => !!c && normalizarTexto(c).includes(q));
  });
}

/**
 * Enter en el buscador: abre la acción SOLO si queda exactamente una coincidencia y está habilitada.
 * Con dos o más, con una deshabilitada o sin coincidencias, no abre nada.
 */
export function accionParaEnter(coincidencias: ItemBusqueda[]): AccionPedidoId | null {
  if (coincidencias.length !== 1) return null;
  const [unica] = coincidencias;
  return unica.estado.visible && unica.estado.habilitada ? unica.accion.id : null;
}
