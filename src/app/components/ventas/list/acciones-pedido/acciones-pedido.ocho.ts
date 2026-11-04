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

// ── Panel ACCIONES de nueve (D-635, ticket 1472), detrás de la bandera `panelAccionesV2` ─────────────────
// Delta sobre D-547: 4 del rol + 5 personales. Los 5 personales se llenan así, sin repetir las del rol:
//   1. lo que el usuario fijó, en su orden (hasta 5);
//   2. las más usadas en los últimos 30 días (días distintos de uso), marcadas «Frecuente»;
//   3. el orden fijo nuevo: Pagos, Cambiar estado, Notas, Historial, Editar dirección y luego el resto de la grilla.
// Lo «Frecuente» sale de `usageDays`, que llega con `GET /me` UNA vez por sesión: no cambia durante la jornada.
// Con la bandera apagada todo queda como en D-547 (8 acciones, 4 pines, orden fijo de antes).

export const ESPACIOS_USUARIO_V2 = 5;

const PRIMERAS_DEL_ORDEN_V2: AccionPedidoId[] = ['payments', 'changeStatus', 'notes', 'history', 'editAddress'];
export const ORDEN_FIJO_PERSONALES_V2: AccionPedidoId[] = [
  ...PRIMERAS_DEL_ORDEN_V2,
  ...IDS_ACCIONES_FIJAS.filter(id => !PRIMERAS_DEL_ORDEN_V2.includes(id)),
];

/** Lo que el bloque necesita saber de las acciones: cuáles son, cuáles salieron del uso y cuántos pines caben. */
export interface PanelAcciones {
  /** Primero las del rol y después las personales (8 sin la bandera, 9 con ella). */
  acciones: AccionPedidoId[];
  /** Personales que entraron por uso (no por pin): llevan la etiqueta «Frecuente». Vacío sin la bandera. */
  frecuentes: AccionPedidoId[];
  /** Pines personales que caben: 4 sin la bandera, 5 con ella. */
  maxPines: number;
}

/**
 * Las acciones más usadas: solo las 16 fijas con al menos un día de uso, sin las de `excluir`. Más días primero; a
 * igualdad gana la que va antes en el orden fijo. Se devuelven, como mucho, `cuantas`.
 */
export function accionesFrecuentes(
  usageDays: Record<string, number> | null | undefined,
  excluir: readonly string[],
  cuantas: number,
): AccionPedidoId[] {
  if (!usageDays || cuantas <= 0) return [];
  return ORDEN_FIJO_PERSONALES_V2
    .filter(id => !excluir.includes(id) && Number(usageDays[id]) >= 1)
    .map((id, orden) => ({ id, orden, dias: Number(usageDays[id]) }))
    .sort((a, b) => b.dias - a.dias || a.orden - b.orden)
    .slice(0, cuantas)
    .map(x => x.id);
}

/** Los 5 espacios personales del panel de nueve: pines, luego lo más usado, luego el orden fijo. */
export function personalesV2(
  rol: readonly AccionPedidoId[],
  pines?: readonly string[] | null,
  usageDays?: Record<string, number> | null,
): { personales: AccionPedidoId[]; frecuentes: AccionPedidoId[] } {
  const personales: AccionPedidoId[] = [];
  for (const id of fijasDistintas(pines)) {
    if (rol.includes(id) || personales.length >= ESPACIOS_USUARIO_V2) continue;
    personales.push(id);
  }
  const frecuentes = accionesFrecuentes(usageDays, [...rol, ...personales], ESPACIOS_USUARIO_V2 - personales.length);
  personales.push(...frecuentes);
  for (const id of ORDEN_FIJO_PERSONALES_V2) {
    if (personales.length >= ESPACIOS_USUARIO_V2) break;
    if (!rol.includes(id) && !personales.includes(id)) personales.push(id);
  }
  return { personales, frecuentes };
}

/** El panel de acciones: de nueve con la bandera `panelAccionesV2` y de ocho sin ella (D-547). */
export function panelAcciones(
  rol?: RolAcciones | null,
  pines?: readonly string[] | null,
  usageDays?: Record<string, number> | null,
  v2 = false,
): PanelAcciones {
  const delRol = accionesDelRol(rol);
  if (!v2) return { acciones: [...delRol, ...accionesPersonales(delRol, pines)], frecuentes: [], maxPines: ESPACIOS_USUARIO };
  const { personales, frecuentes } = personalesV2(delRol, pines, usageDays);
  return { acciones: [...delRol, ...personales], frecuentes, maxPines: ESPACIOS_USUARIO_V2 };
}
