/**
 * D-547 (F2, D15): qué pasa al tocar el pin de una acción en «Opciones del pedido». Funciones PURAS, sin
 * Angular: las carga también `node --test`. Nada aquí guarda: solo decide qué lista de pines se le pide al servidor.
 *
 *  - Fijada por el rol (candado): no se suelta.
 *  - Fijada por el usuario (pin azul): al tocarla sale de la lista y su espacio vuelve al orden fijo.
 *  - Libre (pin gris) con espacio: se agrega al final de sus pines.
 *  - Libre con los 4 espacios llenos: se pregunta cuál reemplazar; quien reemplaza ocupa el mismo lugar.
 *
 * Solo se pueden fijar las 16 acciones fijas de la grilla. Las de contexto y Eliminar pedido no tienen pin.
 */
import { AccionPedidoId, IDS_ACCIONES_FIJAS } from './acciones-pedido.catalogo';
import { ESPACIOS_USUARIO } from './acciones-pedido.ocho';

/** Cómo se ve el pin de una tarjeta. */
export type EstadoPin = 'rol' | 'usuario' | 'libre';

export const esFijable = (id: string): id is AccionPedidoId => (IDS_ACCIONES_FIJAS as string[]).includes(id);

/** `null` si la acción no se puede fijar (no lleva pin). */
export function estadoPin(id: string, delRol: readonly string[], pines: readonly string[]): EstadoPin | null {
  if (!esFijable(id)) return null;
  if (delRol.includes(id)) return 'rol';
  return pines.includes(id) ? 'usuario' : 'libre';
}

/** Los textos del pin: el nombre accesible y el `title`. */
export function etiquetaPin(estado: EstadoPin): string {
  if (estado === 'rol') return 'Fijada por tu rol';
  return estado === 'usuario' ? 'Quitar de acciones principales' : 'Fijar en acciones principales';
}

/** Mapa id → estado del pin, para las 16 fijas. */
export function estadosPin(delRol: readonly string[], pines: readonly string[]): Record<string, EstadoPin> {
  const mapa: Record<string, EstadoPin> = {};
  for (const id of IDS_ACCIONES_FIJAS) mapa[id] = estadoPin(id, delRol, pines) as EstadoPin;
  return mapa;
}

export type DecisionPin =
  /** Pedirle al servidor esta lista de pines. */
  | { tipo: 'guardar'; lista: AccionPedidoId[] }
  /** Los espacios están llenos: preguntar cuál de `actuales` reemplazar por `entra`. */
  | { tipo: 'elegir'; entra: AccionPedidoId; actuales: AccionPedidoId[] }
  | { tipo: 'nada' };

/** Pines válidos del usuario: solo las 16 fijas, sin repetir, máximo 4, en su orden. */
export function pinesValidos(pines: readonly string[] | null | undefined): AccionPedidoId[] {
  const out: AccionPedidoId[] = [];
  for (const id of pines || []) if (esFijable(id) && !out.includes(id)) out.push(id);
  return out.slice(0, ESPACIOS_USUARIO);
}

/** Qué hacer al tocar el pin de `id`. `fijar` es lo que pidió el usuario (`true`: fijar; `false`: soltar). */
export function decidirPin(
  id: string, fijar: boolean, delRol: readonly string[], pines: readonly string[] | null | undefined,
): DecisionPin {
  if (!esFijable(id) || delRol.includes(id)) return { tipo: 'nada' };
  const actuales = pinesValidos(pines);
  const esta = actuales.includes(id);
  if (!fijar) return esta ? { tipo: 'guardar', lista: actuales.filter(x => x !== id) } : { tipo: 'nada' };
  if (esta) return { tipo: 'nada' };
  if (actuales.length < ESPACIOS_USUARIO) return { tipo: 'guardar', lista: [...actuales, id] };
  return { tipo: 'elegir', entra: id, actuales };
}

/** La lista con `entra` en el lugar de `sale`. Si `sale` no está, devuelve la lista sin cambios. */
export function reemplazarPin(
  actuales: readonly AccionPedidoId[], sale: string, entra: AccionPedidoId,
): AccionPedidoId[] {
  if (!actuales.includes(sale as AccionPedidoId)) return [...actuales];
  return actuales.map(x => (x === sale ? entra : x));
}
