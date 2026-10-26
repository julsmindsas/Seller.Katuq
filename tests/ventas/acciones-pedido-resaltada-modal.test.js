/**
 * D-547 (F2, 11.5, D17): dónde se pinta el resaltado. Funciones puras.
 *   node --test tests/ventas/acciones-pedido-resaltada-modal.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { resaltada, resaltadaSoloEnModal } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.resaltada.ts');
const { ochoAcciones } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.ocho.ts');

const pendiente = { estadoPago: 'Pendiente' };
const pagadoSinFactura = { estadoPago: 'Aprobado' };

test('si la acción está entre las 8, el modal no la repite (se resalta en el bloque)', () => {
  const ocho = ochoAcciones(null, ['payments']);
  assert.equal(resaltadaSoloEnModal(resaltada(pendiente), ocho), null);
  assert.equal(resaltadaSoloEnModal(resaltada(pagadoSinFactura), ocho), null); // Facturación es del rol General
});

test('si no está entre las 8, se resalta solo su tarjeta en el modal, con la misma etiqueta', () => {
  const cajaSinPagos = ['orderPdf', 'salesOrder', 'editCustomer', 'notes'];
  assert.deepEqual(resaltadaSoloEnModal(resaltada(pendiente), cajaSinPagos), { id: 'payments', etiqueta: 'Pago pendiente' });
  assert.deepEqual(resaltadaSoloEnModal(resaltada(pagadoSinFactura), cajaSinPagos), { id: 'billingData', etiqueta: 'Sin factura' });
});

test('sin nada que resaltar, nada en el modal', () => {
  assert.equal(resaltadaSoloEnModal(null, []), null);
  assert.equal(resaltadaSoloEnModal(resaltada({ estadoPago: 'Aprobado', nroFactura: 'FV-1' }), []), null);
});
