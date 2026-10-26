/**
 * D-547 (F1, D2): el plan de ejecución de cada acción del pedido. Dice QUÉ método de
 * `ListOrdersComponent` se llama, con qué plantilla y si después se cierra el modal. Copia exactamente
 * lo que hacía la plantilla de «Más opciones» antes de este cambio; la prueba de contrato
 * `tests/ventas/acciones-pedido-plan.contract.test.js` lo compara con `acciones-pedido-antes.json`.
 *
 * Sin dependencias de Angular. `ListOrdersComponent.ejecutarAccionPedido(id, pedido)` lee esta tabla.
 */
import { AccionPedidoId } from './acciones-pedido.catalogo';

/** Referencias de plantilla (`<ng-template #…>` de list.component.html) que algunos métodos piden. */
export type PlantillaPedido =
  | 'modalContent' | 'clientesModal' | 'notasModal'
  | 'datosEnregaModal' | 'datosFacturacionModal' | 'cambioEstadoPagoModal'
  | 'recompraModal' | 'pagosModal' | 'descuentoModal' | 'editarDescuentoModal';

/** Las acciones que se EJECUTAN (las 28 de hoy). `electronicInvoice` y las de precio no ejecutan por sí mismas. */
export type AccionEjecutable = Exclude<AccionPedidoId, 'electronicInvoice' | 'correctPrice' | 'changePriceList'>;

export interface PasoAccion {
  /** Método de `ListOrdersComponent`. */
  metodo: string;
  /** Plantilla que el método recibe como primer argumento (si pide una). */
  plantilla: PlantillaPedido | null;
  /** Segundo argumento fijo después del pedido (hoy solo `'pdf'` en PDF DIAN). */
  argumentoExtra?: string;
  /** `true`: se llama `closeOptionsModal()` DESPUÉS del método. `false`: el método ya cierra por dentro. */
  cerrar: boolean;
  /** Métodos de hoy que envuelve `metodo` sin cambiarlos (Marcar o Quitar revisión). */
  envuelve?: string[];
}

export const PLAN_ACCIONES: Record<AccionEjecutable, PasoAccion> = {
  // Documentos
  orderPdf:           { metodo: 'pdfOrder',                    plantilla: 'modalContent',          cerrar: true },
  salesOrder:         { metodo: 'generarOrdenVenta',           plantilla: null,                    cerrar: true },
  resendConfirmation: { metodo: 'reenviarConfirmacionPedido',  plantilla: null,                    cerrar: true },
  duplicate:          { metodo: 'duplicarPedido',              plantilla: null,                    cerrar: true },
  // Cliente y entrega: estos tres cierran el modal dentro del método, no después.
  editCustomer:       { metodo: 'editDatosClientes',           plantilla: 'clientesModal',         cerrar: false },
  editAddress:        { metodo: 'editDatosEntrega',            plantilla: 'datosEnregaModal',      cerrar: false },
  billingData:        { metodo: 'editDatosFacturacion',        plantilla: 'datosFacturacionModal', cerrar: false },
  changeSeller:       { metodo: 'editSeller',                  plantilla: null,                    cerrar: true },
  // Productos y pagos
  editProducts:       { metodo: 'addProductToCart',            plantilla: 'recompraModal',         cerrar: true },
  discount:           { metodo: 'aplicarCodigoDescuento',      plantilla: 'descuentoModal',        cerrar: true },
  editDiscount:       { metodo: 'editarDescuentoPedido',       plantilla: 'editarDescuentoModal',  cerrar: true },
  taxes:              { metodo: 'abrirModalEditarIva',         plantilla: null,                    cerrar: true },
  payments:           { metodo: 'AsentarPago',                 plantilla: 'pagosModal',            cerrar: true },
  // Seguimiento
  changeStatus:       { metodo: 'editarEstadoPago',            plantilla: 'cambioEstadoPagoModal', cerrar: true },
  history:            { metodo: 'verHistorialPedido',          plantilla: null,                    cerrar: true },
  notes:              { metodo: 'editNotas',                   plantilla: 'notasModal',            cerrar: false },
  cleanNotes:         { metodo: 'limpiarNotasHuerfanasPedido', plantilla: null,                    cerrar: true },
  // Factura electrónica. Las 5 últimas hoy solo se llamaban desde el bloque; la tarea 4.1 comprobó que
  // ninguna lee `this.selectedOrder`, que el cierre del modal deja en `null`.
  invoice:            { metodo: 'facturarPedidoSiigo',         plantilla: null,                    cerrar: true },
  reinvoice:          { metodo: 'refacturarPedido',            plantilla: null,                    cerrar: true },
  releaseInvoice:     { metodo: 'liberarFactura',              plantilla: null,                    cerrar: true },
  dianStatus:         { metodo: 'consultarEstadoDian',         plantilla: null,                    cerrar: true },
  dianPdf:            { metodo: 'descargarArtefactoDian',      plantilla: null, argumentoExtra: 'pdf', cerrar: true },
  creditNote:         { metodo: 'crearNotaCreditoDian',        plantilla: null,                    cerrar: true },
  dianAdjustment:     { metodo: 'crearAjusteDian',             plantilla: null,                    cerrar: true },
  // Contexto
  delivery:           { metodo: 'mostrarDetalleEntrega',       plantilla: null,                    cerrar: true },
  production:         { metodo: 'produceOrder',                plantilla: null,                    cerrar: true },
  // El ternario de hoy (`revisadoParaProduccion ? quitarRevision : marcarComoRevisado`) envuelto en un método.
  reviewMark:         { metodo: 'marcarOQuitarRevision',       plantilla: null,                    cerrar: true,
                        envuelve: ['marcarComoRevisado', 'quitarRevision'] },
  // Pie
  deleteOrder:        { metodo: 'confirmDeleteOrder',          plantilla: null,                    cerrar: true },
};

export function pasoDe(id: AccionPedidoId): PasoAccion | undefined {
  return (PLAN_ACCIONES as Record<string, PasoAccion>)[id];
}
