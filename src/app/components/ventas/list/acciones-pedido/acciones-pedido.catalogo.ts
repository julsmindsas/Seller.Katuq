/**
 * D-547 (F1, D1): catálogo único de las acciones de un pedido. Es la ÚNICA fuente de los nombres
 * que leen el modal «Opciones del pedido», el bloque ACCIONES del detalle, el menú «⋯» de cada fila
 * y el buscador. Sin dependencias de Angular: lo cargan también las pruebas `node --test`.
 *
 * Reglas (spec `order-options-modal`):
 *  - 16 acciones FIJAS, 4 por tema, siempre en el mismo lugar.
 *  - Acciones de CONTEXTO (fila «Para este pedido»): catálogo cerrado. Una acción nueva del pedido
 *    entra a la grilla o a esa fila solo si su propuesta lo decide.
 *  - SUBACCIONES: las que viven dentro de otra tarjeta (los 7 hijos de Factura electrónica y
 *    «Editar o quitar descuento» dentro de Descuento).
 *  - `nombresAnteriores` recoge los títulos que la misma acción tenía en el bloque, el modal y el «⋯»
 *    para que el buscador la encuentre por el nombre viejo.
 */

export type AccionPedidoId =
  // Documentos
  | 'orderPdf' | 'salesOrder' | 'resendConfirmation' | 'duplicate'
  // Cliente y entrega
  | 'editCustomer' | 'editAddress' | 'billingData' | 'changeSeller'
  // Productos y pagos
  | 'editProducts' | 'discount' | 'taxes' | 'payments'
  // Seguimiento
  | 'changeStatus' | 'history' | 'notes' | 'cleanNotes'
  // Contexto
  | 'electronicInvoice' | 'delivery' | 'correctPrice' | 'changePriceList' | 'production' | 'reviewMark'
  // Subacciones
  | 'invoice' | 'reinvoice' | 'releaseInvoice' | 'dianStatus' | 'dianPdf' | 'creditNote' | 'dianAdjustment'
  | 'editDiscount'
  // Pie
  | 'deleteOrder';

export type ColumnaAccion = 'documentos' | 'clienteEntrega' | 'productosPagos' | 'seguimiento';
export type TipoAccion = 'fija' | 'contexto' | 'subaccion' | 'pie';

export interface AccionPedido {
  /** Identificador estable en inglés. */
  id: AccionPedidoId;
  /** Título corto, el mismo en el modal, el bloque y el «⋯». */
  titulo: string;
  /** Reseña de una o dos líneas, en gris. */
  resena: string;
  /** Títulos de hoy (bloque, modal y «⋯») para el buscador. */
  nombresAnteriores: string[];
  /** Nombre del ícono Tabler (`shared/icons/tabler-usados.json`). */
  icono: string;
  /** Solo las fijas. */
  columna?: ColumnaAccion;
  tipo: TipoAccion;
  /** Subacciones: la acción cuya tarjeta las contiene. */
  padre?: AccionPedidoId;
  /** Título cuando la acción es el contrario de sí misma (Marcar revisión / Quitar revisión). */
  tituloAlterno?: string;
}

export const COLUMNAS_ACCIONES: { id: ColumnaAccion; titulo: string }[] = [
  { id: 'documentos', titulo: 'Documentos' },
  { id: 'clienteEntrega', titulo: 'Cliente y entrega' },
  { id: 'productosPagos', titulo: 'Productos y pagos' },
  { id: 'seguimiento', titulo: 'Seguimiento' },
];

export const ACCIONES_PEDIDO: AccionPedido[] = [
  // ── Documentos ────────────────────────────────────────────────────────────
  { id: 'orderPdf', titulo: 'PDF del pedido', resena: 'Descarga el pedido completo',
    nombresAnteriores: ['Imprimir PDF', 'Generar PDF del pedido'],
    icono: 'file-type-pdf', columna: 'documentos', tipo: 'fija' },
  { id: 'salesOrder', titulo: 'Orden de venta', resena: 'PDF sencillo para el cliente',
    nombresAnteriores: ['Orden de Venta', 'Generar PDF orden de venta simplificada'],
    icono: 'file-invoice', columna: 'documentos', tipo: 'fija' },
  { id: 'resendConfirmation', titulo: 'Reenviar confirmación', resena: 'Envía de nuevo al cliente',
    nombresAnteriores: ['Enviar de nuevo la confirmación', 'Envía de nuevo la confirmación del pedido'],
    icono: 'send', columna: 'documentos', tipo: 'fija' },
  { id: 'duplicate', titulo: 'Duplicar', resena: 'Crea una copia del pedido',
    nombresAnteriores: ['Duplicar pedido'],
    icono: 'copy', columna: 'documentos', tipo: 'fija' },

  // ── Cliente y entrega ─────────────────────────────────────────────────────
  { id: 'editCustomer', titulo: 'Editar cliente', resena: 'Cambia los datos del cliente',
    nombresAnteriores: ['Editar Cliente', 'Permite actualizar la información principal del cliente asociado al pedido.'],
    icono: 'user-edit', columna: 'clienteEntrega', tipo: 'fija' },
  { id: 'editAddress', titulo: 'Editar dirección', resena: 'Corrige dónde se entrega',
    nombresAnteriores: ['Editar Dirección', 'Edita o corrige la dirección registrada para la entrega del pedido.'],
    icono: 'map-pin', columna: 'clienteEntrega', tipo: 'fija' },
  { id: 'billingData', titulo: 'Facturación', resena: 'Datos para la factura',
    nombresAnteriores: ['Ajusta los datos de facturación necesarios para esta venta.'],
    icono: 'receipt', columna: 'clienteEntrega', tipo: 'fija' },
  { id: 'changeSeller', titulo: 'Cambiar asesor', resena: 'Asigna otro responsable',
    nombresAnteriores: ['Actualiza el asesor asignado para el seguimiento del pedido.'],
    icono: 'user-share', columna: 'clienteEntrega', tipo: 'fija' },

  // ── Productos y pagos ─────────────────────────────────────────────────────
  { id: 'editProducts', titulo: 'Editar productos', resena: 'Agrega o quita productos',
    nombresAnteriores: ['Agregar Productos', 'Añadir o retirar productos'],
    icono: 'shopping-cart', columna: 'productosPagos', tipo: 'fija' },
  { id: 'discount', titulo: 'Descuento', resena: 'Aplica o ajusta un descuento',
    nombresAnteriores: ['Aplicar descuento al pedido'],
    icono: 'discount', columna: 'productosPagos', tipo: 'fija' },
  // Open Question 4 (resuelta): «Ajusta el IVA del pedido» para todos hasta que exista un dato de empresa
  // que diga que maneja otros impuestos (entonces: «Ajusta los impuestos del pedido»).
  { id: 'taxes', titulo: 'Impuestos', resena: 'Ajusta el IVA del pedido',
    nombresAnteriores: ['Ajustar impuestos de este pedido'],
    icono: 'percentage', columna: 'productosPagos', tipo: 'fija' },
  { id: 'payments', titulo: 'Pagos', resena: 'Registra y consulta pagos',
    nombresAnteriores: ['Gestión de pagos'],
    icono: 'cash', columna: 'productosPagos', tipo: 'fija' },

  // ── Seguimiento ───────────────────────────────────────────────────────────
  { id: 'changeStatus', titulo: 'Cambiar estado', resena: 'Actualiza el pago o el proceso',
    nombresAnteriores: ['Estado de Pago', 'Actualizar estados del pedido'],
    icono: 'progress-check', columna: 'seguimiento', tipo: 'fija' },
  // Open Question 2 (resuelta): «Historial» en la grilla; «Historial del pedido» queda como nombre anterior
  // para el buscador y es el nombre del botón del detalle y de la ventana de D-541.
  { id: 'history', titulo: 'Historial', resena: 'Mira todos los cambios',
    nombresAnteriores: ['Historial de estados y movimientos', 'Historial del pedido'],
    icono: 'history', columna: 'seguimiento', tipo: 'fija' },
  { id: 'notes', titulo: 'Notas', resena: 'Agrega o edita notas',
    nombresAnteriores: ['Editar Notas', 'Notas del pedido'],
    icono: 'notes', columna: 'seguimiento', tipo: 'fija' },
  { id: 'cleanNotes', titulo: 'Limpiar notas', resena: 'Borra notas de productos retirados',
    nombresAnteriores: ['Eliminar notas huérfanas'],
    icono: 'eraser', columna: 'seguimiento', tipo: 'fija' },

  // ── Contexto («Para este pedido») ─────────────────────────────────────────
  { id: 'electronicInvoice', titulo: 'Factura electrónica', resena: 'Factura, libera o consulta la factura',
    nombresAnteriores: [],
    icono: 'file-certificate', tipo: 'contexto' },
  { id: 'delivery', titulo: 'Ver despacho y entrega', resena: 'Información del despacho y la entrega',
    nombresAnteriores: ['Ver detalles de despacho y entrega'],
    icono: 'truck-delivery', tipo: 'contexto' },
  // D-543 y D-544 definen cuándo se muestran y qué hacen; aquí solo se reserva su lugar y su nombre.
  { id: 'correctPrice', titulo: 'Corregir precio', resena: 'Corrige el precio de un pedido ya hecho',
    nombresAnteriores: [],
    icono: 'pencil-dollar', tipo: 'contexto' },
  { id: 'changePriceList', titulo: 'Cambiar tipo de precio', resena: 'Pasa el pedido a otra lista de precios',
    nombresAnteriores: [],
    icono: 'tags', tipo: 'contexto' },
  { id: 'production', titulo: 'Producción', resena: 'Gestiona el proceso productivo',
    nombresAnteriores: [],
    icono: 'building-factory-2', tipo: 'contexto' },
  { id: 'reviewMark', titulo: 'Marcar revisión', resena: 'Revisa y envía a producción',
    nombresAnteriores: ['Marcar como Revisado', 'Quitar Revisión'],
    tituloAlterno: 'Quitar revisión',
    icono: 'circle-check', tipo: 'contexto' },

  // ── Subacciones: hijos de Factura electrónica ─────────────────────────────
  { id: 'invoice', titulo: 'Facturar', resena: 'Genera la factura electrónica',
    nombresAnteriores: [], icono: 'file-dollar', tipo: 'subaccion', padre: 'electronicInvoice' },
  { id: 'reinvoice', titulo: 'Refacturar', resena: 'Corrige una factura ya emitida',
    nombresAnteriores: ['REFACTURAR'], icono: 'refresh', tipo: 'subaccion', padre: 'electronicInvoice' },
  { id: 'releaseInvoice', titulo: 'Liberar factura', resena: 'Ya anulada con nota crédito',
    nombresAnteriores: [], icono: 'lock-open', tipo: 'subaccion', padre: 'electronicInvoice' },
  { id: 'dianStatus', titulo: 'Estado DIAN', resena: 'Consulta por CUFE',
    nombresAnteriores: ['Consultar estado DIAN'], icono: 'search', tipo: 'subaccion', padre: 'electronicInvoice' },
  { id: 'dianPdf', titulo: 'PDF DIAN', resena: 'Descarga la representación',
    nombresAnteriores: ['Descargar PDF DIAN'], icono: 'file-type-pdf', tipo: 'subaccion', padre: 'electronicInvoice' },
  { id: 'creditNote', titulo: 'Nota crédito', resena: 'Anulación total ante la DIAN',
    nombresAnteriores: ['Crear nota crédito total'], icono: 'receipt-refund', tipo: 'subaccion', padre: 'electronicInvoice' },
  { id: 'dianAdjustment', titulo: 'Ajuste NC/ND', resena: 'Crédito o débito parcial ante la DIAN',
    nombresAnteriores: ['Ajuste NC / ND', 'Crear ajuste NC / ND'], icono: 'file-pencil', tipo: 'subaccion', padre: 'electronicInvoice' },

  // ── Subacción de Descuento ────────────────────────────────────────────────
  { id: 'editDiscount', titulo: 'Editar o quitar', resena: 'Cambia o elimina el descuento actual',
    nombresAnteriores: ['Editar/Eliminar Descuento'], icono: 'edit', tipo: 'subaccion', padre: 'discount' },

  // ── Pie ───────────────────────────────────────────────────────────────────
  { id: 'deleteOrder', titulo: 'Eliminar pedido', resena: 'se borra para siempre',
    nombresAnteriores: ['Eliminar pedido permanentemente'],
    icono: 'trash', tipo: 'pie' },
];

const POR_ID: Record<string, AccionPedido> = {};
for (const a of ACCIONES_PEDIDO) POR_ID[a.id] = a;

export function accionPorId(id: AccionPedidoId): AccionPedido {
  return POR_ID[id];
}

/** Las 16 acciones fijas en el orden de lectura de la grilla (columna por columna, de arriba abajo). */
export const ACCIONES_FIJAS: AccionPedido[] = ACCIONES_PEDIDO.filter(a => a.tipo === 'fija');

/** Ids de las 16 fijas. */
export const IDS_ACCIONES_FIJAS: AccionPedidoId[] = ACCIONES_FIJAS.map(a => a.id);

/** Las fijas de una columna, en su orden. */
export function fijasDeColumna(columna: ColumnaAccion): AccionPedido[] {
  return ACCIONES_FIJAS.filter(a => a.columna === columna);
}

/** Subacciones de una tarjeta (los 7 hijos de Factura electrónica o «Editar o quitar» de Descuento). */
export function subaccionesDe(padre: AccionPedidoId): AccionPedido[] {
  return ACCIONES_PEDIDO.filter(a => a.padre === padre);
}

/** Título que se muestra hoy: Marcar revisión se vuelve Quitar revisión si el pedido ya está revisado. */
export function tituloVisible(accion: AccionPedido, revisado = false): string {
  return revisado && accion.tituloAlterno ? accion.tituloAlterno : accion.titulo;
}
