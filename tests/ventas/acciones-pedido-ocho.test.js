'use strict';
/**
 * D-547 (F2, tarea 9.2): las 8 acciones del bloque = 4 del rol + 4 personales (D14).
 *
 *   node --test tests/ventas/acciones-pedido-ocho.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { ochoAcciones, accionesDelRol, accionesDePerfil, PERFILES_ACCIONES, ORDEN_FIJO_PERSONALES } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.ocho.ts');
const { IDS_ACCIONES_FIJAS } =
  require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts');

const GENERAL = ['orderPdf', 'salesOrder', 'editCustomer', 'billingData'];

test('los 4 perfiles son los de la spec y solo usan las 16 fijas', () => {
  assert.deepEqual(PERFILES_ACCIONES.cashier, ['orderPdf', 'payments', 'billingData', 'editProducts']);
  assert.deepEqual(PERFILES_ACCIONES.dispatch, ['editAddress', 'salesOrder', 'changeStatus', 'history']);
  assert.deepEqual(PERFILES_ACCIONES.sales, ['editCustomer', 'notes', 'editProducts', 'salesOrder']);
  assert.deepEqual(PERFILES_ACCIONES.general, GENERAL);
  for (const ids of Object.values(PERFILES_ACCIONES)) {
    assert.equal(ids.length, 4);
    assert.equal(new Set(ids).size, 4);
    for (const id of ids) assert.ok(IDS_ACCIONES_FIJAS.includes(id), id);
  }
});

test('el orden fijo empieza como dice la spec y cubre las 16 sin repetir', () => {
  assert.deepEqual(ORDEN_FIJO_PERSONALES.slice(0, 6),
    ['notes', 'changeStatus', 'editProducts', 'editAddress', 'payments', 'history']);
  assert.equal(ORDEN_FIJO_PERSONALES.length, 16);
  assert.equal(new Set(ORDEN_FIJO_PERSONALES).size, 16);
});

test('sin rol ni pines: General más el orden fijo', () => {
  assert.deepEqual(ochoAcciones(null, []),
    [...GENERAL, 'notes', 'changeStatus', 'editProducts', 'editAddress']);
  assert.deepEqual(ochoAcciones(undefined, undefined), ochoAcciones(null, []));
  assert.deepEqual(ochoAcciones({}, null), ochoAcciones(null, []));
});

test('las 4 del rol van primero y los pines después, en su orden', () => {
  const ocho = ochoAcciones({ profile: 'cashier', actions: PERFILES_ACCIONES.cashier }, ['discount', 'taxes']);
  assert.deepEqual(ocho.slice(0, 4), PERFILES_ACCIONES.cashier);
  assert.deepEqual(ocho.slice(4, 6), ['discount', 'taxes']);
  // se completa hasta 4 con el orden fijo, sin repetir las del rol (Pagos y Editar productos ya son del rol)
  assert.deepEqual(ocho.slice(6), ['notes', 'changeStatus']);
  assert.equal(ocho.length, 8);
  assert.equal(new Set(ocho).size, 8);
});

test('un pin que ya está en el rol no se duplica ni ocupa un espacio', () => {
  const ocho = ochoAcciones({ actions: GENERAL }, ['orderPdf', 'payments']);
  assert.deepEqual(ocho.slice(4), ['payments', 'notes', 'changeStatus', 'editProducts']);
  assert.equal(new Set(ocho).size, 8);
});

test('el orden fijo salta lo que ya está en el rol', () => {
  const ocho = ochoAcciones({ actions: ['notes', 'changeStatus', 'editProducts', 'editAddress'] }, []);
  assert.deepEqual(ocho.slice(4), ['payments', 'history', 'orderPdf', 'salesOrder']);
});

test('más de 4 pines: solo caben 4', () => {
  const ocho = ochoAcciones(null, ['payments', 'history', 'notes', 'changeStatus', 'duplicate']);
  assert.deepEqual(ocho.slice(4), ['payments', 'history', 'notes', 'changeStatus']);
});

test('ids ajenos a las 16, repetidos o que no son texto se ignoran', () => {
  const ocho = ochoAcciones(null, ['deleteOrder', 'electronicInvoice', 'payments', 'payments', 42, null]);
  assert.deepEqual(ocho.slice(4), ['payments', 'notes', 'changeStatus', 'editProducts']);
});

test('un rol con acciones inválidas (menos de 4, repetidas o ajenas) usa su perfil', () => {
  assert.deepEqual(accionesDelRol({ profile: 'dispatch', actions: ['orderPdf'] }), PERFILES_ACCIONES.dispatch);
  assert.deepEqual(accionesDelRol({ profile: 'sales', actions: ['orderPdf', 'orderPdf', 'notes', 'history'] }), PERFILES_ACCIONES.sales);
  assert.deepEqual(accionesDelRol({ profile: 'cashier', actions: ['orderPdf', 'payments', 'billingData', 'deleteOrder'] }), PERFILES_ACCIONES.cashier);
  assert.deepEqual(accionesDelRol({ profile: 'inventado', actions: [] }), GENERAL);
  assert.deepEqual(accionesDePerfil('inventado'), GENERAL);
});

test('las acciones propias del rol mandan sobre su perfil', () => {
  const propias = ['history', 'notes', 'payments', 'duplicate'];
  assert.deepEqual(accionesDelRol({ profile: 'cashier', actions: propias }), propias);
});

test('el resultado siempre trae 8 distintas, sea cual sea la entrada', () => {
  for (const perfil of Object.keys(PERFILES_ACCIONES)) {
    for (const pines of [[], ['payments'], IDS_ACCIONES_FIJAS.slice(0, 4), IDS_ACCIONES_FIJAS]) {
      const ocho = ochoAcciones({ profile: perfil }, pines);
      assert.equal(ocho.length, 8);
      assert.equal(new Set(ocho).size, 8);
    }
  }
});

test('no muta las listas que recibe', () => {
  const pines = ['payments', 'history'];
  const rol = { actions: [...GENERAL] };
  ochoAcciones(rol, pines);
  assert.deepEqual(pines, ['payments', 'history']);
  assert.deepEqual(rol.actions, GENERAL);
});
