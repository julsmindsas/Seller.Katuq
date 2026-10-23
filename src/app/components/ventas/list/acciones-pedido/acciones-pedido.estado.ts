/**
 * D-547 (F1, D3): qué acciones se ven, cuáles se pueden usar y, si no, por qué. Función PURA: recibe
 * booleanos que `ListOrdersComponent` ya calcula con sus métodos de hoy (`canAddProducts`, `canEditBilling`,
 * `canAssignSeller`…) y no reescribe ninguna de esas reglas. Sin dependencias de Angular.
 *
 * Fuera de Producción, las 16 acciones fijas son siempre visibles y van en su lugar: lo que hoy se esconde
 * (Notas en POS, Descuento e Impuestos de un pedido congelado) queda DESHABILITADO con su motivo.
 * Desde Producción solo se ven las 6 fijas que hoy aplican allí y ninguna sale deshabilitada.
 */
import { ACCIONES_PEDIDO, AccionPedidoId, subaccionesDe } from './acciones-pedido.catalogo';

/** Respuesta de D-543 y D-544 sobre sus dos acciones (vacía hasta que existan sus consultas de permisos). */
export interface AccionPrecioEntrada {
  id: 'correctPrice' | 'changePriceList';
  habilitada: boolean;
  motivo?: string;
}

export interface EntradaEstadoAcciones {
  /** El pedido se abre desde Producción (`isFromProduction`). */
  produccion: boolean;
  /** `canEditDeliveryAddressByDeliveryType(pedido)`. */
  puedeDireccion: boolean;
  /** `canEditBilling(pedido)`. */
  puedeFacturacion: boolean;
  /** `canAddProducts(pedido)`. */
  puedeProductos: boolean;
  /** `canModifyProducts(pedido) || isAdminUser()`. */
  puedeDescuentoEImpuestos: boolean;
  /** `canAssignSeller(pedido)`. */
  puedeAsesor: boolean;
  /** `isPedidoPOS(pedido)`. */
  esPOS: boolean;
  /** `(porceDescuento > 0) || descuentoAplicado`. */
  tieneDescuento: boolean;
  /** `canDeleteOrder()`. */
  puedeEliminar: boolean;
  /** `checkIfUserIsBrenda()`. */
  esBrenda: boolean;
  /** `pedido.estadoProceso`. */
  estadoProceso: string;
  /** `puedeFacturarSiigo(pedido)`. */
  puedeFacturarSiigo: boolean;
  /** `puedeRefacturar(pedido)`. */
  puedeRefacturar: boolean;
  /** `puedeLiberarFactura(pedido)`. */
  puedeLiberar: boolean;
  /** `esFacturaDian(pedido)`. */
  esDian: boolean;
  /** `estadoProceso` es Despachado o Entregado. */
  despachadoOEntregado: boolean;
  /** `pedido.revisadoParaProduccion`. */
  revisado: boolean;
  /** D-543/D-544: vacío por defecto, así sus dos acciones no se ven hasta que exista su consulta. */
  accionesPrecio?: AccionPrecioEntrada[];
}

export interface EstadoAccion {
  visible: boolean;
  habilitada: boolean;
  /** Por qué una acción visible está deshabilitada (en lugar de la reseña). */
  motivo?: string;
}

export type EstadoAcciones = Record<AccionPedidoId, EstadoAccion>;

/** Las únicas 6 fijas que hoy aplican cuando el pedido se abre desde Producción. */
export const FIJAS_DESDE_PRODUCCION: AccionPedidoId[] = [
  'orderPdf', 'salesOrder', 'duplicate', 'changeStatus', 'history', 'cleanNotes',
];

const ok = (): EstadoAccion => ({ visible: true, habilitada: true });
const oculta = (): EstadoAccion => ({ visible: false, habilitada: false });
const bloqueada = (motivo: string): EstadoAccion => ({ visible: true, habilitada: false, motivo });

export function estadoAcciones(e: EntradaEstadoAcciones): EstadoAcciones {
  const r = {} as EstadoAcciones;
  for (const a of ACCIONES_PEDIDO) r[a.id] = oculta();

  const congelado = e.estadoProceso ? `Congelado · ${e.estadoProceso}` : 'Congelado';

  // ── Las 16 fijas ──────────────────────────────────────────────────────────
  if (e.produccion) {
    for (const id of FIJAS_DESDE_PRODUCCION) r[id] = ok();
  } else {
    for (const a of ACCIONES_PEDIDO) if (a.tipo === 'fija') r[a.id] = ok();
    if (!e.puedeProductos) r.editProducts = bloqueada(congelado);
    if (!e.puedeDescuentoEImpuestos) {
      r.discount = bloqueada(congelado);
      r.taxes = bloqueada(congelado);
    }
    if (!e.puedeDireccion) r.editAddress = bloqueada('Solo domicilios');
    if (!e.puedeFacturacion) r.billingData = bloqueada('Ya tiene factura');
    if (e.esPOS) r.notes = bloqueada('No aplica a pedidos POS');
    if (!e.puedeAsesor) r.changeSeller = bloqueada('Solo administradores');
  }

  // ── Subacción de Descuento ────────────────────────────────────────────────
  if (!e.produccion && e.tieneDescuento && e.puedeDescuentoEImpuestos) r.editDiscount = ok();

  // ── Factura electrónica: sus hijos, con las condiciones de hoy ────────────
  if (!e.produccion && e.puedeFacturarSiigo) r.invoice = ok();
  if (e.puedeRefacturar) r.reinvoice = ok();
  if (!e.produccion && e.puedeLiberar) r.releaseInvoice = ok();
  if (!e.produccion && e.esDian) {
    r.dianStatus = ok();
    r.dianPdf = ok();
    r.creditNote = ok();
    r.dianAdjustment = ok();
  }
  if (subaccionesDe('electronicInvoice').some(h => r[h.id].visible)) r.electronicInvoice = ok();

  // ── Otras de contexto ─────────────────────────────────────────────────────
  if (e.despachadoOEntregado) r.delivery = ok();
  if (e.produccion) r.production = ok();
  if (e.produccion && e.esBrenda) r.reviewMark = ok();

  // D-543 y D-544: solo si les llega una respuesta; el motivo y el permiso son suyos.
  for (const p of e.accionesPrecio || []) {
    if (p.id !== 'correctPrice' && p.id !== 'changePriceList') continue;
    r[p.id] = p.habilitada ? ok() : bloqueada(p.motivo || 'No disponible');
  }

  // ── Pie ───────────────────────────────────────────────────────────────────
  if (e.puedeEliminar && !e.produccion) r.deleteOrder = ok();

  return r;
}

/** Las acciones de contexto visibles, en el orden del catálogo (para pintar la fila «Para este pedido»). */
export function contextoVisible(estados: EstadoAcciones): AccionPedidoId[] {
  return ACCIONES_PEDIDO.filter(a => a.tipo === 'contexto' && estados[a.id].visible).map(a => a.id);
}

/** Hijos visibles de una acción de contexto o tarjeta (Factura electrónica, Descuento). */
export function hijosVisibles(estados: EstadoAcciones, padre: AccionPedidoId): AccionPedidoId[] {
  return subaccionesDe(padre).filter(h => estados[h.id].visible).map(h => h.id);
}
