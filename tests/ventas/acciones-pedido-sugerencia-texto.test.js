/**
 * D-547 (F2, 11.4, D16): el texto del aviso de sugerencia.
 *   node --test tests/ventas/acciones-pedido-sugerencia-texto.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { textoSugerencia } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.sugerencia-texto.ts');
const { IDS_ACCIONES_FIJAS, accionPorId } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts');

test('el texto de la spec: «Usas Pagos a diario, ¿lo fijamos?»', () => {
  assert.equal(textoSugerencia('payments'), 'Usas Pagos a diario, ¿lo fijamos?');
});

test('cada una de las 16 usa su título del catálogo', () => {
  for (const id of IDS_ACCIONES_FIJAS) assert.equal(textoSugerencia(id), `Usas ${accionPorId(id).titulo} a diario, ¿lo fijamos?`);
});
