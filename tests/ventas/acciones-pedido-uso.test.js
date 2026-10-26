/**
 * D-547 (F2, 11.4, D16): qué cuenta como uso de una acción. Funciones puras.
 *   node --test tests/ventas/acciones-pedido-uso.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { cuentaComoUso, idFijaPorTitulo } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.uso.ts');
const { IDS_ACCIONES_FIJAS, accionPorId } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts');

test('solo cuentan las 16 fijas', () => {
  for (const id of IDS_ACCIONES_FIJAS) assert.equal(cuentaComoUso(id), true, id);
  for (const id of ['deleteOrder', 'electronicInvoice', 'invoice', 'reinvoice', 'delivery', 'production', 'reviewMark', 'correctPrice', 'x', '']) {
    assert.equal(cuentaComoUso(id), false, id);
  }
});

test('los títulos de las 16 fijas se reconocen y dan su id (así se cuenta el menú «⋯» de la fila)', () => {
  for (const id of IDS_ACCIONES_FIJAS) assert.equal(idFijaPorTitulo(accionPorId(id).titulo), id, id);
  assert.equal(idFijaPorTitulo('  PDF del pedido '), 'orderPdf');
});

test('las entradas del «⋯» que no son fijas no cuentan', () => {
  for (const t of ['Producción', 'Facturar', 'Refacturar', 'Estado DIAN', 'PDF DIAN', 'Nota crédito', 'Ajuste NC/ND',
    'Enviar a Cereza', 'Resincronizar con Cereza', 'Más opciones...', '', null, undefined]) {
    assert.equal(idFijaPorTitulo(t), null, String(t));
  }
});
