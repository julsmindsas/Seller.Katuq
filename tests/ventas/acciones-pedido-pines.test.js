/**
 * D-547 (F2, 11.3, D15): qué pasa al tocar el pin de una acción en «Opciones del pedido». Funciones puras.
 *   node --test tests/ventas/acciones-pedido-pines.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { estadoPin, estadosPin, etiquetaPin, decidirPin, reemplazarPin, pinesValidos, esFijable } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.pines.ts');
const { IDS_ACCIONES_FIJAS } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts');

const GENERAL = ['orderPdf', 'salesOrder', 'editCustomer', 'billingData'];

test('solo las 16 fijas llevan pin; las de contexto y Eliminar no', () => {
  for (const id of IDS_ACCIONES_FIJAS) assert.ok(esFijable(id), id);
  for (const id of ['deleteOrder', 'electronicInvoice', 'delivery', 'production', 'reviewMark', 'invoice', 'inventada']) {
    assert.equal(esFijable(id), false, id);
    assert.equal(estadoPin(id, GENERAL, []), null, id);
  }
  assert.deepEqual(Object.keys(estadosPin(GENERAL, [])).sort(), [...IDS_ACCIONES_FIJAS].sort());
});

test('estado del pin: rol con candado, usuario azul, libre gris', () => {
  assert.equal(estadoPin('orderPdf', GENERAL, ['payments']), 'rol');
  assert.equal(estadoPin('payments', GENERAL, ['payments']), 'usuario');
  assert.equal(estadoPin('discount', GENERAL, ['payments']), 'libre');
  // Una acción que el orden fijo pone entre las 8 pero que el usuario no fijó se ve gris (libre).
  assert.equal(estadoPin('notes', GENERAL, []), 'libre');
});

test('los textos accesibles son los de la spec', () => {
  assert.equal(etiquetaPin('libre'), 'Fijar en acciones principales');
  assert.equal(etiquetaPin('usuario'), 'Quitar de acciones principales');
  assert.equal(etiquetaPin('rol'), 'Fijada por tu rol');
});

test('escenario «Fijar Pagos»: General toca el pin gris de Pagos', () => {
  assert.deepEqual(decidirPin('payments', true, GENERAL, []), { tipo: 'guardar', lista: ['payments'] });
});

test('fijar agrega al final y conserva el orden de lo ya fijado', () => {
  assert.deepEqual(decidirPin('discount', true, GENERAL, ['payments', 'notes']),
    { tipo: 'guardar', lista: ['payments', 'notes', 'discount'] });
});

test('escenario «Espacios llenos»: con 4 fijadas se pregunta cuál reemplazar', () => {
  const cuatro = ['payments', 'notes', 'history', 'cleanNotes'];
  assert.deepEqual(decidirPin('discount', true, GENERAL, cuatro),
    { tipo: 'elegir', entra: 'discount', actuales: cuatro });
});

test('reemplazar deja la nueva en el lugar de la que sale', () => {
  const cuatro = ['payments', 'notes', 'history', 'cleanNotes'];
  assert.deepEqual(reemplazarPin(cuatro, 'notes', 'discount'), ['payments', 'discount', 'history', 'cleanNotes']);
  assert.deepEqual(reemplazarPin(cuatro, 'otra', 'discount'), cuatro);
  assert.notEqual(reemplazarPin(cuatro, 'otra', 'discount'), cuatro, 'devuelve una copia');
});

test('soltar quita el pin; el espacio vuelve al orden fijo (lo hace ochoAcciones)', () => {
  assert.deepEqual(decidirPin('payments', false, GENERAL, ['payments', 'notes']), { tipo: 'guardar', lista: ['notes'] });
  assert.deepEqual(decidirPin('payments', false, GENERAL, []), { tipo: 'nada' });
});

test('las del rol no se sueltan ni se fijan', () => {
  assert.deepEqual(decidirPin('orderPdf', false, GENERAL, ['orderPdf']), { tipo: 'nada' });
  assert.deepEqual(decidirPin('orderPdf', true, GENERAL, []), { tipo: 'nada' });
});

test('fijar lo ya fijado, o algo que no se puede fijar, no pide nada al servidor', () => {
  assert.deepEqual(decidirPin('payments', true, GENERAL, ['payments']), { tipo: 'nada' });
  assert.deepEqual(decidirPin('deleteOrder', true, GENERAL, []), { tipo: 'nada' });
  assert.deepEqual(decidirPin('inventada', true, GENERAL, []), { tipo: 'nada' });
});

test('pinesValidos ignora ajenos y repetidos y respeta el tope de 4', () => {
  assert.deepEqual(pinesValidos(['payments', 'payments', 'deleteOrder', 'notes', 'history', 'cleanNotes', 'discount']),
    ['payments', 'notes', 'history', 'cleanNotes']);
  assert.deepEqual(pinesValidos(null), []);
});
