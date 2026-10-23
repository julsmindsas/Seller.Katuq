'use strict';
/**
 * D-547 (F1, tarea 2.4): disponibilidad y motivo de cada acción del pedido (escenarios de la spec).
 *
 *   node --test tests/ventas/acciones-pedido-estado.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { estadoAcciones, contextoVisible, hijosVisibles, FIJAS_DESDE_PRODUCCION } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.estado.ts');
const { ACCIONES_FIJAS, IDS_ACCIONES_FIJAS } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts');

/** Un pedido de venta normal, pendiente, de un administrador. */
const base = (cambios = {}) => ({
  produccion: false, puedeDireccion: true, puedeFacturacion: true, puedeProductos: true,
  puedeDescuentoEImpuestos: true, puedeAsesor: true, esPOS: false, tieneDescuento: false,
  puedeEliminar: false, esBrenda: false, estadoProceso: 'Pendiente', puedeFacturarSiigo: false,
  puedeRefacturar: false, puedeLiberar: false, esDian: false, despachadoOEntregado: false,
  revisado: false, ...cambios,
});
const bloqueadas = est => IDS_ACCIONES_FIJAS.filter(id => est[id].visible && !est[id].habilitada);

test('pedido de venta normal: las 16 visibles y habilitadas, y ninguna de contexto', () => {
  const est = estadoAcciones(base());
  for (const id of IDS_ACCIONES_FIJAS) assert.deepEqual(est[id], { visible: true, habilitada: true }, id);
  assert.deepEqual(contextoVisible(est), []);
  assert.equal(est.deleteOrder.visible, false);
  assert.equal(est.editDiscount.visible, false);
});

test('POS: Notas deshabilitada con «No aplica a pedidos POS»', () => {
  const est = estadoAcciones(base({ esPOS: true }));
  assert.deepEqual(est.notes, { visible: true, habilitada: false, motivo: 'No aplica a pedidos POS' });
  assert.deepEqual(bloqueadas(est), ['notes']);
});

test('congelado sin administrador: Editar productos, Descuento e Impuestos con «Congelado · Despachado»', () => {
  const est = estadoAcciones(base({
    estadoProceso: 'Despachado', puedeProductos: false, puedeDescuentoEImpuestos: false, puedeAsesor: false, despachadoOEntregado: true,
  }));
  for (const id of ['editProducts', 'discount', 'taxes']) {
    assert.deepEqual(est[id], { visible: true, habilitada: false, motivo: 'Congelado · Despachado' }, id);
  }
  assert.equal(est.changeSeller.motivo, 'Solo administradores');
  assert.equal(est.delivery.visible, true);
  assert.equal(est.editDiscount.visible, false);
});

test('congelado con administrador: Descuento e Impuestos habilitados, Editar productos sigue bloqueado', () => {
  const est = estadoAcciones(base({
    estadoProceso: 'Entregado', puedeProductos: false, puedeDescuentoEImpuestos: true, tieneDescuento: true, despachadoOEntregado: true,
  }));
  assert.equal(est.editProducts.motivo, 'Congelado · Entregado');
  assert.equal(est.discount.habilitada, true);
  assert.equal(est.taxes.habilitada, true);
  assert.equal(est.editDiscount.habilitada, true, 'con descuento y permiso, «Editar o quitar» aparece dentro de Descuento');
});

test('recoge en tienda: Editar dirección con «Solo domicilios»', () => {
  const est = estadoAcciones(base({ puedeDireccion: false }));
  assert.deepEqual(est.editAddress, { visible: true, habilitada: false, motivo: 'Solo domicilios' });
  assert.deepEqual(bloqueadas(est), ['editAddress']);
});

test('facturado: Facturación con «Ya tiene factura»', () => {
  const est = estadoAcciones(base({ puedeFacturacion: false }));
  assert.deepEqual(est.billingData, { visible: true, habilitada: false, motivo: 'Ya tiene factura' });
});

test('Cambiar asesor sin ser administrador: «Solo administradores»', () => {
  const est = estadoAcciones(base({ puedeAsesor: false }));
  assert.deepEqual(est.changeSeller, { visible: true, habilitada: false, motivo: 'Solo administradores' });
});

test('despachado: aparece Despacho en la fila de contexto', () => {
  const est = estadoAcciones(base({ estadoProceso: 'Despachado', despachadoOEntregado: true }));
  assert.deepEqual(contextoVisible(est), ['delivery']);
});

test('Factura electrónica reúne solo los hijos que aplican, con las condiciones de hoy', () => {
  // SIIGO listo para facturar
  let est = estadoAcciones(base({ puedeFacturarSiigo: true }));
  assert.deepEqual(contextoVisible(est), ['electronicInvoice']);
  assert.deepEqual(hijosVisibles(est, 'electronicInvoice'), ['invoice']);
  // Facturado en SIIGO por un administrador: Refacturar y Liberar
  est = estadoAcciones(base({ puedeRefacturar: true, puedeLiberar: true }));
  assert.deepEqual(hijosVisibles(est, 'electronicInvoice'), ['reinvoice', 'releaseInvoice']);
  // Facturado con DIAN
  est = estadoAcciones(base({ esDian: true, puedeLiberar: true, despachadoOEntregado: true }));
  assert.deepEqual(hijosVisibles(est, 'electronicInvoice'), ['releaseInvoice', 'dianStatus', 'dianPdf', 'creditNote', 'dianAdjustment']);
  assert.deepEqual(contextoVisible(est), ['electronicInvoice', 'delivery']);
});

test('Desde Producción sin Brenda: solo las 6 fijas, ninguna deshabilitada, con Producción', () => {
  const est = estadoAcciones(base({
    produccion: true, puedeProductos: false, puedeDescuentoEImpuestos: false, puedeAsesor: false, esPOS: true, puedeEliminar: true,
    puedeFacturarSiigo: true, esDian: true, tieneDescuento: true,
  }));
  const visibles = IDS_ACCIONES_FIJAS.filter(id => est[id].visible);
  assert.deepEqual([...visibles].sort(), [...FIJAS_DESDE_PRODUCCION].sort());
  assert.equal(FIJAS_DESDE_PRODUCCION.length, 6);
  assert.deepEqual(bloqueadas(est), []);
  assert.deepEqual(contextoVisible(est), ['production']);
  assert.equal(est.deleteOrder.visible, false, 'Eliminar no sale desde Producción');
  assert.equal(est.invoice.visible, false);
  assert.equal(est.dianStatus.visible, false);
});

test('Desde Producción con Brenda: aparece Marcar revisión (y Quitar revisión lo gobierna el título)', () => {
  const est = estadoAcciones(base({ produccion: true, esBrenda: true, despachadoOEntregado: true, puedeRefacturar: true }));
  assert.deepEqual(contextoVisible(est), ['electronicInvoice', 'delivery', 'production', 'reviewMark']);
  assert.deepEqual(hijosVisibles(est, 'electronicInvoice'), ['reinvoice']);
});

test('Eliminar solo para quien hoy puede y fuera de Producción', () => {
  assert.equal(estadoAcciones(base({ puedeEliminar: true })).deleteOrder.visible, true);
  assert.equal(estadoAcciones(base({ puedeEliminar: false })).deleteOrder.visible, false);
});

test('correctPrice y changePriceList: ausentes si accionesPrecio está vacío; con respuesta, el permiso y el motivo son suyos', () => {
  for (const entrada of [base(), base({ accionesPrecio: [] })]) {
    const est = estadoAcciones(entrada);
    assert.equal(est.correctPrice.visible, false);
    assert.equal(est.changePriceList.visible, false);
    assert.deepEqual(contextoVisible(est), []);
  }
  const est = estadoAcciones(base({ accionesPrecio: [
    { id: 'correctPrice', habilitada: true },
    { id: 'changePriceList', habilitada: false, motivo: 'Pedido facturado' },
  ] }));
  assert.deepEqual(est.correctPrice, { visible: true, habilitada: true });
  assert.deepEqual(est.changePriceList, { visible: true, habilitada: false, motivo: 'Pedido facturado' });
  assert.deepEqual(contextoVisible(est), ['correctPrice', 'changePriceList']);
});

test('el máximo de acciones de contexto cabe en una fila (4)', () => {
  // Venta sin factura, despachada, piloto ALMARA: Factura electrónica, Despacho, Corregir precio, Cambiar tipo de precio.
  const est = estadoAcciones(base({
    puedeFacturarSiigo: true, despachadoOEntregado: true, estadoProceso: 'Despachado',
    accionesPrecio: [{ id: 'correctPrice', habilitada: true }, { id: 'changePriceList', habilitada: true }],
  }));
  assert.deepEqual(contextoVisible(est), ['electronicInvoice', 'delivery', 'correctPrice', 'changePriceList']);
});

test('fuera de Producción las 16 fijas son siempre visibles, sean cuales sean los permisos', () => {
  assert.equal(ACCIONES_FIJAS.length, 16);
  const peor = estadoAcciones(base({
    puedeDireccion: false, puedeFacturacion: false, puedeProductos: false, puedeDescuentoEImpuestos: false,
    puedeAsesor: false, esPOS: true,
  }));
  assert.deepEqual(IDS_ACCIONES_FIJAS.filter(id => !peor[id].visible), [], 'ninguna deja un hueco');
  assert.deepEqual(bloqueadas(peor).sort(), ['billingData', 'changeSeller', 'discount', 'editAddress', 'editProducts', 'notes', 'taxes']);
  for (const id of bloqueadas(peor)) assert(peor[id].motivo, `${id} sin motivo`);
});
