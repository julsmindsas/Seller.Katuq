'use strict';
/**
 * D-547 (F2, tarea 9.3): la sugerencia de fijar una acción por su uso (D16). Katuq solo sugiere.
 *
 *   node --test tests/ventas/acciones-pedido-sugerencia.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { sugerencia, diasEntre } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.sugerencia.ts');
const { ochoAcciones } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.ocho.ts');

const OCHO = ochoAcciones(null, []);     // General + Notas, Cambiar estado, Editar productos, Editar dirección
const HOY = '2026-10-26';                // lunes

test('diasEntre cuenta días enteros, también entre meses y años', () => {
  assert.equal(diasEntre('2026-10-19', '2026-10-26'), 7);
  assert.equal(diasEntre('2026-09-26', '2026-10-26'), 30);
  assert.equal(diasEntre('2025-12-31', '2026-01-01'), 1);
  assert.equal(diasEntre('2026-10-26', '2026-10-26'), 0);
  assert.equal(diasEntre('nada', '2026-10-26'), null);
});

test('el lunes de la spec: usó Pagos 4 días, no la tiene entre las 8 y no hay sugerencia reciente', () => {
  assert.equal(sugerencia({ payments: 4 }, OCHO, {}, '', HOY), 'payments');
  assert.equal(sugerencia({ payments: 4 }, OCHO, {}, null, HOY), 'payments');
  assert.equal(sugerencia({ payments: 4 }, OCHO, undefined, undefined, HOY), 'payments');
});

test('candidata con 3 días o más; con 2 no', () => {
  assert.equal(sugerencia({ payments: 3 }, OCHO, {}, '', HOY), 'payments');
  assert.equal(sugerencia({ payments: 2 }, OCHO, {}, '', HOY), null);
});

test('una acción que ya está entre las 8 no se sugiere', () => {
  assert.equal(sugerencia({ notes: 7, orderPdf: 7 }, OCHO, {}, '', HOY), null);
});

test('nada si la última sugerencia tiene menos de 7 días; con 7 sí', () => {
  assert.equal(sugerencia({ payments: 5 }, OCHO, {}, '2026-10-20', HOY), null);
  assert.equal(sugerencia({ payments: 5 }, OCHO, {}, '2026-10-26', HOY), null);
  assert.equal(sugerencia({ payments: 5 }, OCHO, {}, '2026-10-19', HOY), 'payments');
});

test('una rechazada hace menos de 30 días no vuelve; al cumplirse los 30 sí', () => {
  // `dismissed[id]` = día del rechazo + 30 (D13)
  assert.equal(sugerencia({ payments: 5 }, OCHO, { payments: '2026-11-10' }, '', HOY), null);
  assert.equal(sugerencia({ payments: 5 }, OCHO, { payments: '2026-10-27' }, '', HOY), null);
  assert.equal(sugerencia({ payments: 5 }, OCHO, { payments: '2026-10-26' }, '', HOY), 'payments');
  assert.equal(sugerencia({ payments: 5 }, OCHO, { payments: '2026-09-01' }, '', HOY), 'payments');
});

test('rechazar una no bloquea a las otras', () => {
  assert.equal(sugerencia({ payments: 5, discount: 3 }, OCHO, { payments: '2026-11-10' }, '', HOY), 'discount');
});

test('con varias gana la de más días y, a igualdad, el orden de la grilla', () => {
  assert.equal(sugerencia({ payments: 4, discount: 6 }, OCHO, {}, '', HOY), 'discount');
  // Descuento va antes que Pagos en la grilla (Productos y pagos: Editar productos, Descuento, Impuestos, Pagos)
  assert.equal(sugerencia({ payments: 4, discount: 4 }, OCHO, {}, '', HOY), 'discount');
  assert.equal(sugerencia({ history: 5, duplicate: 5 }, OCHO.filter(a => a !== 'history'), {}, '', HOY), 'duplicate');
});

test('ids que no son de las 16 fijas, o conteos raros, no cuentan', () => {
  assert.equal(sugerencia({ deleteOrder: 9, electronicInvoice: 9, payments: 'mucho', discount: NaN }, OCHO, {}, '', HOY), null);
});

test('sin uso o con una fecha de hoy inválida, no sugiere nada', () => {
  assert.equal(sugerencia(null, OCHO, {}, '', HOY), null);
  assert.equal(sugerencia({}, OCHO, {}, '', HOY), null);
  assert.equal(sugerencia({ payments: 5 }, OCHO, {}, '', 'hoy'), null);
});

test('no muta lo que recibe', () => {
  const uso = { payments: 4 };
  const rech = { discount: '2026-11-10' };
  sugerencia(uso, OCHO, rech, '', HOY);
  assert.deepEqual(uso, { payments: 4 });
  assert.deepEqual(rech, { discount: '2026-11-10' });
});
