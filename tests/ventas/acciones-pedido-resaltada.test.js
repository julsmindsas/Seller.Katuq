'use strict';
/**
 * D-547 (F2, tarea 9.4): qué acción se resalta según el estado del pedido (D17).
 *
 *   node --test tests/ventas/acciones-pedido-resaltada.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { resaltada } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.resaltada.ts');

test('pago pendiente resalta Pagos con «Pago pendiente»', () => {
  assert.deepEqual(resaltada({ estadoPago: 'Pendiente' }), { id: 'payments', etiqueta: 'Pago pendiente' });
  assert.deepEqual(resaltada({ estadoPago: 'Pendiente', nroFactura: 'FE-1' }), { id: 'payments', etiqueta: 'Pago pendiente' });
});

const PAGADOS = ['Aprobado', 'PreAprobado'];   // los de EstadoPago que cuentan como pagado (como puedeFacturarSiigo)

test('pagado (Aprobado o PreAprobado) sin número ni PDF de factura resalta Facturación con «Sin factura»', () => {
  for (const estadoPago of PAGADOS) {
    assert.deepEqual(resaltada({ estadoPago }), { id: 'billingData', etiqueta: 'Sin factura' }, estadoPago);
    assert.deepEqual(resaltada({ estadoPago, nroFactura: '', pdfUrlInvoice: '' }), { id: 'billingData', etiqueta: 'Sin factura' }, estadoPago);
  }
});

test('pagado y facturado, o con la facturación en curso, no resalta nada', () => {
  for (const estadoPago of PAGADOS) {
    assert.equal(resaltada({ estadoPago, nroFactura: 'FE-1' }), null, estadoPago);
    assert.equal(resaltada({ estadoPago, pdfUrlInvoice: 'https://x/f.pdf' }), null, estadoPago);
    assert.equal(resaltada({ estadoPago, _facturando: true }), null, estadoPago);
  }
});

test('«Pagado» no existe en EstadoPago: no resalta nada, y el enum del modelo no lo tiene', () => {
  assert.equal(resaltada({ estadoPago: 'Pagado' }), null);
  const modelo = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../src/app/components/ventas/modelo/pedido.ts'), 'utf8');
  const enumEstadoPago = modelo.slice(modelo.indexOf('export enum EstadoPago'), modelo.indexOf('export enum EstadoProceso'));
  assert.ok(!/Pagado/.test(enumEstadoPago));
  for (const estado of PAGADOS) assert.ok(new RegExp(`= "${estado}"`).test(enumEstadoPago), `${estado} está en EstadoPago`);
});

test('otros estados de pago y pedidos vacíos no resaltan nada', () => {
  for (const estadoPago of ['Pospendiente', 'Rechazado', 'Precancelado', 'Cancelado', '', undefined, null]) {
    assert.equal(resaltada({ estadoPago }), null, String(estadoPago));
  }
  assert.equal(resaltada(null), null);
  assert.equal(resaltada(undefined), null);
  assert.equal(resaltada({}), null);
});
