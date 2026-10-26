/**
 * D-547 (F2, D14): las 8 acciones principales del bloque ACCIONES = 4 del rol + 4 del usuario.
 * Función PURA, sin Angular: la cargan también las pruebas `node --test`.
 *
 *  1. Primero las 4 del rol (las que escogió el administrador o, sin configurar, las del perfil General).
 *  2. Después los pines del usuario, en su orden (máximo 4; un pin que ya está en el rol no se duplica).
 *  3. Si faltan para llegar a 4 personales, se completa con el orden fijo: Notas, Cambiar estado,
 *     Editar productos, Editar dirección, Pagos, Historial y luego el resto de la grilla, saltando lo que
 *     ya está entre las 8.
 *
 * Solo se pueden fijar las 16 acciones fijas de la grilla. Un id ajeno a ellas se ignora.
 */
import { AccionPedidoId, IDS_ACCIONES_FIJAS } from './acciones-pedido.catalogo';

export type PerfilAccionesRol = 'cashier' | 'dispatch' | 'sales' | 'general';

/** Perfiles de partida del rol (tabla de la spec `order-pinned-actions`). */
export const PERFILES_ACCIONES: Record<PerfilAccionesRol, AccionPedidoId[]> = {
  cashier:  ['orderPdf', 'payments', 'billingData', 'editProducts'],        // Caja
  dispatch: ['editAddress', 'salesOrder', 'changeStatus', 'history'],       // Despacho
  sales:    ['editCustomer', 'notes', 'editProducts', 'salesOrder'],        // Comercial
  general:  ['orderPdf', 'salesOrder', 'editCustomer', 'billingData'],      // General (las 4 primeras de hoy)
};

/** Un rol sin `orderActions` usa General. */
export const PERFIL_POR_OMISION: PerfilAccionesRol = 'general';

/** Los 4 espacios del rol y los 4 del usuario. */
export const ESPACIOS_ROL = 4;
export const ESPACIOS_USUARIO = 4;

/** Orden fijo con que se completan los espacios personales sin pin. */
const PRIMERAS_DEL_ORDEN: AccionPedidoId[] = [
  'notes', 'changeStatus', 'editProducts', 'editAddress', 'payments', 'history',
];
export const ORDEN_FIJO_PERSONALES: AccionPedidoId[] = [
  ...PRIMERAS_DEL_ORDEN,
  ...IDS_ACCIONES_FIJAS.filter(id => !PRIMERAS_DEL_ORDEN.includes(id)),
];

/** Lo que el front recibe de `GET /me` sobre el rol (D13). */
export interface RolAcciones {
  profile?: string | null;
  actions?: readonly string[] | null;
}

const esFija = (id: unknown): id is AccionPedidoId =>
  typeof id === 'string' && (IDS_ACCIONES_FIJAS as string[]).includes(id);

/** Quita ids ajenos a las 16 y repetidos, conservando el orden. */
function fijasDistintas(ids: readonly unknown[] | null | undefined): AccionPedidoId[] {
  const out: AccionPedidoId[] = [];
  for (const id of ids || []) if (esFija(id) && !out.includes(id)) out.push(id);
  return out;
}

/** Las 4 acciones de un perfil; un perfil desconocido o vacío da General. */
export function accionesDePerfil(perfil?: string | null): AccionPedidoId[] {
  const p = (perfil && (PERFILES_ACCIONES as Record<string, AccionPedidoId[]>)[perfil]) || PERFILES_ACCIONES[PERFIL_POR_OMISION];
  return [...p];
}

/**
 * Las 4 del rol. Si el rol trae 4 acciones válidas y distintas, esas; si no, las de su perfil; si no tiene
 * perfil, las de General. Nunca devuelve algo distinto de 4.
 */
export function accionesDelRol(rol?: RolAcciones | null): AccionPedidoId[] {
  const propias = fijasDistintas(rol?.actions);
  if (propias.length === ESPACIOS_ROL && (rol?.actions?.length ?? 0) === ESPACIOS_ROL) return propias;
  return accionesDePerfil(rol?.profile);
}

/** Los 4 espacios personales: pines válidos (sin los del rol) y, al final, el orden fijo. */
export function accionesPersonales(rol: readonly AccionPedidoId[], pines?: readonly string[] | null): AccionPedidoId[] {
  const personales: AccionPedidoId[] = [];
  for (const id of fijasDistintas(pines)) {
    if (rol.includes(id) || personales.length >= ESPACIOS_USUARIO) continue;
    personales.push(id);
  }
  for (const id of ORDEN_FIJO_PERSONALES) {
    if (personales.length >= ESPACIOS_USUARIO) break;
    if (!rol.includes(id) && !personales.includes(id)) personales.push(id);
  }
  return personales;
}

/** Las 8 acciones del bloque: primero las del rol y después las personales. */
export function ochoAcciones(rol?: RolAcciones | null, pines?: readonly string[] | null): AccionPedidoId[] {
  const delRol = accionesDelRol(rol);
  return [...delRol, ...accionesPersonales(delRol, pines)];
}
