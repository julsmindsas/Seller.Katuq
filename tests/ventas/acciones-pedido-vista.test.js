'use strict';
/**
 * D-547 (F1, tareas 3.1 y 3.2): lo que el modal «Opciones del pedido» dibuja y decide, sin Angular.
 * Las pruebas de DOM del componente (Esc, X, Cerrar, clic fuera, Enter) están en
 * `order-options-modal.component.spec.ts` (Karma).
 *
 *   node --test tests/ventas/acciones-pedido-vista.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const dir = '../../src/app/components/ventas/list/acciones-pedido/';
const { estadoAcciones } = require(dir + 'acciones-pedido.estado.ts');
const { construirVista, resolverClic, resolverEnter } = require(dir + 'order-options-modal.vista.ts');

const base = (cambios = {}) => ({
  produccion: false, puedeDireccion: true, puedeFacturacion: true, puedeProductos: true,
  puedeDescuentoEImpuestos: true, puedeAsesor: true, esPOS: false, tieneDescuento: false,
  puedeEliminar: false, esBrenda: false, estadoProceso: 'Pendiente', puedeFacturarSiigo: false,
  puedeRefacturar: false, puedeLiberar: false, esDian: false, despachadoOEntregado: false,
  revisado: false, ...cambios,
});
const vista = (cambios = {}, texto = '', desdeProduccion = false) => {
  const entrada = base(cambios);
  return construirVista({ estados: estadoAcciones(entrada), texto, desdeProduccion, revisado: entrada.revisado });
};
const ids = lista => lista.map(t => t.id);

test('la grilla trae 4 columnas con 4 tarjetas, en el orden de la spec', () => {
  const v = vista();
  assert.equal(v.modoLista, false);
  assert.deepEqual(v.columnas.map(c => c.titulo), ['Documentos', 'Cliente y entrega', 'Productos y pagos', 'Seguimiento']);
  for (const c of v.columnas) assert.equal(c.tarjetas.length, 4);
  assert.deepEqual(ids(v.columnas[0].tarjetas), ['orderPdf', 'salesOrder', 'resendConfirmation', 'duplicate']);
  assert.deepEqual(ids(v.columnas[3].tarjetas), ['changeStatus', 'history', 'notes', 'cleanNotes']);
  assert.deepEqual(v.contexto, []);
  assert.equal(v.puedeEliminar, false);
});

test('una tarjeta deshabilitada lleva su motivo en lugar de la reseña y no abre nada', () => {
  const v = vista({ puedeProductos: false, estadoProceso: 'Despachado' });
  const t = v.columnas[2].tarjetas[0];
  assert.deepEqual([t.id, t.habilitada, t.motivo], ['editProducts', false, 'Congelado · Despachado']);
  assert.deepEqual(resolverClic(t, v), { tipo: 'nada' });
});

test('una tarjeta habilitada emite su id', () => {
  const v = vista();
  assert.deepEqual(resolverClic(v.columnas[0].tarjetas[0], v), { tipo: 'emitir', id: 'orderPdf' });
});

test('con descuento aplicado, Descuento abre un menú con Aplicar otro y Editar o quitar', () => {
  const v = vista({ tieneDescuento: true });
  const d = v.columnas[2].tarjetas[1];
  assert.equal(d.id, 'discount');
  assert.equal(v.descuentoConMenu, true);
  assert.deepEqual(resolverClic(d, v), { tipo: 'menuDescuento' });
  assert.deepEqual(v.opcionesDescuento.map(o => [o.id, o.titulo]), [['discount', 'Aplicar otro'], ['editDiscount', 'Editar o quitar']]);
  assert.equal(vista().descuentoConMenu, false);
  assert.deepEqual(resolverClic(vista().columnas[2].tarjetas[1], vista()), { tipo: 'emitir', id: 'discount' });
});

test('Factura electrónica: un hijo lleva su nombre y se ejecuta; varios se despliegan', () => {
  let v = vista({ puedeFacturarSiigo: true });
  assert.equal(v.contexto.length, 1);
  assert.deepEqual([v.contexto[0].id, v.contexto[0].titulo, v.contexto[0].desplegable], ['invoice', 'Facturar', false]);
  assert.deepEqual(resolverClic(v.contexto[0], v), { tipo: 'emitir', id: 'invoice' });

  v = vista({ esDian: true, puedeLiberar: true });
  assert.equal(v.contexto[0].id, 'electronicInvoice');
  assert.equal(v.contexto[0].desplegable, true);
  assert.deepEqual(resolverClic(v.contexto[0], v, true), { tipo: 'menuFactura' });
  assert.deepEqual(ids(v.hijosFactura), ['releaseInvoice', 'dianStatus', 'dianPdf', 'creditNote', 'dianAdjustment']);
});

test('Marcar revisión se llama Quitar revisión cuando el pedido ya está revisado', () => {
  assert.equal(vista({ produccion: true, esBrenda: true, revisado: false }, '', true).contexto.find(c => c.id === 'reviewMark').titulo, 'Marcar revisión');
  assert.equal(vista({ produccion: true, esBrenda: true, revisado: true }, '', true).contexto.find(c => c.id === 'reviewMark').titulo, 'Quitar revisión');
});

test('desde Producción: 6 fijas en flujo y sin etiquetas; el resto va en la fila de contexto', () => {
  const v = vista({ produccion: true, despachadoOEntregado: true }, '', true);
  assert.equal(v.modoLista, true);
  assert.equal(v.lista.length, 6);
  assert.equal(v.lista.every(t => t.habilitada), true);
  assert.deepEqual(ids(v.contexto), ['delivery', 'production']);
});

test('buscando: lista en flujo con las coincidencias y mensaje cuando no hay ninguna', () => {
  let v = vista({}, 'imprimir');
  assert.equal(v.modoLista, true);
  assert.deepEqual(ids(v.lista), ['orderPdf']);
  assert.equal(v.sinCoincidencias, false);
  v = vista({}, 'zzzz');
  assert.equal(v.sinCoincidencias, true);
  assert.deepEqual(v.lista, []);
  assert.equal(vista({}, '   ').modoLista, false, 'solo espacios no cuenta como búsqueda');
});

test('Enter: abre solo con una coincidencia habilitada', () => {
  const estados = estadoAcciones(base());
  assert.equal(resolverEnter(estados, 'imprimir'), 'orderPdf');
  assert.equal(resolverEnter(estados, 'pdf'), null);
  assert.equal(resolverEnter(estados, ''), null);
  assert.equal(resolverEnter(estadoAcciones(base({ puedeDireccion: false })), 'editar dirección'), null);
});

test('Eliminar aparece en el pie solo para quien hoy puede, fuera de Producción', () => {
  assert.equal(vista({ puedeEliminar: true }).puedeEliminar, true);
  assert.equal(vista({ puedeEliminar: true, produccion: true }, '', true).puedeEliminar, false);
});
