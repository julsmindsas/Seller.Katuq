'use strict';
/**
 * D-536: precio base, IVA y descuento por línea en Ventas POS. El ticket debe dar
 * lo mismo que guarda el servidor (cálculo legacy de orderCalculationService).
 * Los casos de referencia son copia idéntica de
 * katuq_admin_back_firebase/functions/tests/orders/fixtures/pos-linea-precio.fixtures.json.
 *
 *   node --test tests/ventas/pos-linea-precio.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const {
  resolverLineaPos, lineaDesdePedido, lineaDesdeItemPos, tieneCambios, precioUnitarioPos,
  sanearPrecioManual, sanearDescuento, lineaPedidoPos,
} = require('../../src/app/shared/utils/pos-linea-precio.ts');

const { casos } = JSON.parse(fs.readFileSync(path.join(__dirname, 'pos-linea-precio.fixtures.json'), 'utf8'));

/** Totales del pedido con las mismas definiciones del servidor (sin descuento global ni envío). */
function totales(carrito) {
  let bruto = 0, neto = 0, iva = 0;
  for (const linea of carrito) {
    const r = resolverLineaPos(lineaDesdePedido(linea));
    const cant = Number(linea.cantidad) || 0;
    bruto += r.sinIva * cant;
    neto += r.sinIva * cant * (1 - r.desc);
    iva += r.ivaUnitarioNeto * cant;
  }
  return { bruto, descuento: bruto - neto, subtotal: neto, totalImpuesto: iva, total: neto + iva };
}

const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} ≠ ${b}`);

for (const caso of casos) {
  test(`fixture: ${caso.nombre}`, () => {
    const t = totales(caso.carrito);
    for (const k of Object.keys(caso.esperado)) cerca(t[k], caso.esperado[k], k);
  });
}

test('el ticket del POS cobra lo mismo que guarda el pedido (caso de cuatro líneas)', () => {
  const caso = casos.find((c) => c.nombre.startsWith('ticket POS'));
  // El carrito del POS es plano: el producto aplanado + cantidad + overrides.
  const itemsPos = caso.carrito.map((l) => ({ ...l.producto, cantidad: l.cantidad,
    _precioManualOverride: l._precioManualOverride, _ivaManualOverride: l._ivaManualOverride,
    descuentoLinea: l.descuentoLinea }));
  const ticket = itemsPos.reduce((acc, it) => acc + precioUnitarioPos(it) * it.cantidad, 0);
  cerca(ticket, caso.esperado.total, 'ticket');
});

test('línea sin cambios: el POS usa el precio de hoy (discount_price o con IVA)', () => {
  const item = { cantidad: 2, precio: { precioUnitarioSinIva: 10000, precioUnitarioIva: '19', precioUnitarioConIva: 11900 } };
  assert.equal(tieneCambios(lineaDesdeItemPos(item)), false);
  assert.equal(precioUnitarioPos(item), 11900);
  assert.equal(precioUnitarioPos({ ...item, discount_price: 9990 }), 9990);
});

test('precio manual en producto sin permiso no cuenta como cambio', () => {
  const item = { cantidad: 1, _precioManualOverride: 5000, procesoComercial: { permitePrecioManual: false },
    precio: { precioUnitarioSinIva: 10000, precioUnitarioIva: '19', precioUnitarioConIva: 11900 } };
  assert.equal(tieneCambios(lineaDesdeItemPos(item)), false);
  assert.equal(precioUnitarioPos(item), 11900);
});

test('saneo de precio manual y descuento', () => {
  assert.equal(sanearPrecioManual(''), undefined);
  assert.equal(sanearPrecioManual('abc'), undefined);
  assert.equal(sanearPrecioManual(-1), undefined);
  assert.equal(sanearPrecioManual('0'), 0);
  assert.equal(sanearPrecioManual('8000'), 8000);
  assert.equal(sanearDescuento(-5), 0);
  assert.equal(sanearDescuento('abc'), 0);
  assert.equal(sanearDescuento(150), 100);
  assert.equal(sanearDescuento('10'), 10);
});

test('lineaPedidoPos pone los cambios en la línea y no en el snapshot del producto', () => {
  const item = { cd: 'P1', cantidad: 3, _precioManualOverride: 8000, _ivaManualOverride: 5, descuentoLinea: 10,
    _precioManualTemp: '80', procesoComercial: { permitePrecioManual: true },
    precio: { precioUnitarioSinIva: 10000, precioUnitarioIva: '19', precioUnitarioConIva: 11900 } };
  const l = lineaPedidoPos(item);
  assert.equal(l._precioManualOverride, 8000);
  assert.equal(l._ivaManualOverride, 5);
  assert.equal(l.descuentoLinea, 10);
  assert.equal(l.cantidad, 3);
  for (const k of ['_precioManualOverride', '_ivaManualOverride', 'descuentoLinea', '_precioManualTemp']) {
    assert.equal(k in l.producto, false, `producto no lleva ${k}`);
  }
  assert.equal(l.producto.cd, 'P1');
  assert.equal(item._precioManualOverride, 8000, 'no muta el ítem del carrito');
});

test('lineaPedidoPos omite lo que no aplica', () => {
  const sinPermiso = lineaPedidoPos({ cantidad: 1, _precioManualOverride: 5000, descuentoLinea: 0,
    procesoComercial: { permitePrecioManual: false }, precio: {} });
  assert.equal('_precioManualOverride' in sinPermiso, false);
  assert.equal('descuentoLinea' in sinPermiso, false);
  assert.equal('_ivaManualOverride' in sinPermiso, false);
});
