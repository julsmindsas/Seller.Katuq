/**
 * D-547 (F2, D18): lógica PURA de «Acciones principales del pedido» en Roles y permisos. Sin Angular: la cargan
 * también las pruebas `node --test`. Un rol parte de un perfil (Caja, Despacho, Comercial o General) y el
 * administrador puede cambiar cualquiera de las 4 acciones. Un rol sin configurar usa General.
 *
 * Estas acciones NO dan ni quitan permisos: una acción sin permiso se ve bloqueada en el pedido.
 */
import { ACCIONES_FIJAS, AccionPedido, AccionPedidoId, IDS_ACCIONES_FIJAS } from '../../ventas/list/acciones-pedido/acciones-pedido.catalogo';
import {
  ESPACIOS_ROL, PERFILES_ACCIONES, PERFIL_POR_OMISION, PerfilAccionesRol,
} from '../../ventas/list/acciones-pedido/acciones-pedido.ocho';

export const PERFILES_ROL: { id: PerfilAccionesRol; titulo: string }[] = [
  { id: 'cashier', titulo: 'Caja' },
  { id: 'dispatch', titulo: 'Despacho' },
  { id: 'sales', titulo: 'Comercial' },
  { id: 'general', titulo: 'General' },
];

export interface EstadoAccionesRol {
  profile: PerfilAccionesRol;
  actions: AccionPedidoId[];
}

const esPerfil = (p: unknown): p is PerfilAccionesRol =>
  typeof p === 'string' && Object.prototype.hasOwnProperty.call(PERFILES_ACCIONES, p);

const esFija = (id: unknown): id is AccionPedidoId =>
  typeof id === 'string' && (IDS_ACCIONES_FIJAS as string[]).includes(id);

/** `true` si son exactamente 4 acciones fijas y distintas. */
export function accionesValidas(actions: unknown): actions is AccionPedidoId[] {
  return Array.isArray(actions) && actions.length === ESPACIOS_ROL
    && actions.every(esFija) && new Set(actions).size === actions.length;
}

/** Las 4 acciones de un perfil. */
export function accionesDePerfilRol(perfil: PerfilAccionesRol): AccionPedidoId[] {
  return [...PERFILES_ACCIONES[perfil]];
}

/**
 * Lo que muestra el editor al abrir un rol: lo guardado en `rol.orderActions` si es válido y, si no, General.
 * Un rol sin configurar no genera ninguna petición: solo se guarda al tocar «Guardar».
 */
export function estadoInicialRol(orderActions: unknown): EstadoAccionesRol {
  const o: any = orderActions && typeof orderActions === 'object' ? orderActions : null;
  if (o && esPerfil(o.profile) && accionesValidas(o.actions)) {
    return { profile: o.profile, actions: [...o.actions] };
  }
  return { profile: PERFIL_POR_OMISION, actions: accionesDePerfilRol(PERFIL_POR_OMISION) };
}

/** Escoger un perfil llena las 4 listas con las acciones de ese perfil. */
export function aplicarPerfil(perfil: PerfilAccionesRol): EstadoAccionesRol {
  return { profile: perfil, actions: accionesDePerfilRol(perfil) };
}

/** Cambia la acción de una lista. Si ya estaba en otra, las dos se intercambian: nunca queda una repetida. */
export function cambiarAccion(estado: EstadoAccionesRol, indice: number, id: string): EstadoAccionesRol {
  if (!esFija(id) || indice < 0 || indice >= ESPACIOS_ROL) return estado;
  const actions = [...estado.actions];
  const otro = actions.indexOf(id);
  if (otro === indice) return estado;
  if (otro >= 0) actions[otro] = actions[indice];
  actions[indice] = id;
  return { profile: estado.profile, actions };
}

/** Lo que ofrece cada lista: las 16 acciones fijas sin las que ya están en las otras tres. */
export function opcionesDeLista(estado: EstadoAccionesRol, indice: number): AccionPedido[] {
  const enOtras = new Set(estado.actions.filter((_, i) => i !== indice));
  return ACCIONES_FIJAS.filter(a => !enOtras.has(a.id));
}

/** ¿Las 4 listas son exactamente las del perfil? (Si no, el rol está personalizado a partir de él.) */
export function coincideConPerfil(estado: EstadoAccionesRol): boolean {
  const del = PERFILES_ACCIONES[estado.profile];
  return !!del && del.length === estado.actions.length && del.every((id, i) => id === estado.actions[i]);
}

/** El cuerpo de `PUT /v1/order-actions/roles/:roleId`: el perfil y las 4 acciones, y nada más. */
export function cuerpoGuardarRol(estado: EstadoAccionesRol): { profile: PerfilAccionesRol; actions: AccionPedidoId[] } | null {
  if (!esPerfil(estado.profile) || !accionesValidas(estado.actions)) return null;
  return { profile: estado.profile, actions: [...estado.actions] };
}
