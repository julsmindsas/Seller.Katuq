'use strict';
/**
 * D-547 (F2, tarea 11.7): la lógica de «Acciones principales del pedido» en Roles y permisos.
 *
 *   node --test tests/ventas/acciones-rol-pedido.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const L = require('../../src/app/components/rol/roles/acciones-rol-pedido.logica.ts');
const { IDS_ACCIONES_FIJAS } = require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts');

test('un rol sin acciones guardadas muestra General marcado y no inventa nada más', () => {
  for (const sin of [undefined, null, {}, { profile: 'general' }, { profile: 'raro', actions: ['orderPdf'] }, 'x']) {
    assert.deepEqual(L.estadoInicialRol(sin), {
      profile: 'general', actions: ['orderPdf', 'salesOrder', 'editCustomer', 'billingData'],
    });
  }
});

test('un rol con acciones válidas las muestra tal cual, con su perfil', () => {
  const e = L.estadoInicialRol({ profile: 'cashier', actions: ['payments', 'orderPdf', 'notes', 'history'], updatedBy: 'x' });
  assert.deepEqual(e, { profile: 'cashier', actions: ['payments', 'orderPdf', 'notes', 'history'] });
});

test('acciones guardadas inválidas (repetidas, ajenas o de menos) caen a General', () => {
  assert.equal(L.estadoInicialRol({ profile: 'sales', actions: ['orderPdf', 'orderPdf', 'notes', 'history'] }).profile, 'general');
  assert.equal(L.estadoInicialRol({ profile: 'sales', actions: ['orderPdf', 'notes', 'history', 'deleteOrder'] }).profile, 'general');
  assert.equal(L.estadoInicialRol({ profile: 'sales', actions: ['orderPdf', 'notes', 'history'] }).profile, 'general');
});

test('los 4 perfiles llenan las 4 listas con las acciones de la spec', () => {
  assert.deepEqual(L.aplicarPerfil('cashier').actions, ['orderPdf', 'payments', 'billingData', 'editProducts']);
  assert.deepEqual(L.aplicarPerfil('dispatch').actions, ['editAddress', 'salesOrder', 'changeStatus', 'history']);
  assert.deepEqual(L.aplicarPerfil('sales').actions, ['editCustomer', 'notes', 'editProducts', 'salesOrder']);
  assert.deepEqual(L.aplicarPerfil('general').actions, ['orderPdf', 'salesOrder', 'editCustomer', 'billingData']);
  assert.deepEqual(L.PERFILES_ROL.map(p => p.titulo), ['Caja', 'Despacho', 'Comercial', 'General']);
});

test('cada lista ofrece las 16 sin repetir: quita las que ya están en las otras tres', () => {
  const e = L.aplicarPerfil('general');
  for (let i = 0; i < 4; i++) {
    const ids = L.opcionesDeLista(e, i).map(a => a.id);
    assert.equal(ids.length, 13);
    assert.ok(ids.includes(e.actions[i]), 'ofrece la suya');
    for (let j = 0; j < 4; j++) if (j !== i) assert.ok(!ids.includes(e.actions[j]));
    assert.ok(ids.every(id => IDS_ACCIONES_FIJAS.includes(id)));
  }
});

test('cambiar una acción la reemplaza; si ya estaba en otra lista se intercambian y nunca queda repetida', () => {
  const e = L.aplicarPerfil('general');
  const a = L.cambiarAccion(e, 0, 'payments');
  assert.deepEqual(a.actions, ['payments', 'salesOrder', 'editCustomer', 'billingData']);
  assert.equal(a.profile, 'general', 'el perfil de partida se conserva');
  const b = L.cambiarAccion(e, 0, 'billingData');
  assert.deepEqual(b.actions, ['billingData', 'salesOrder', 'editCustomer', 'orderPdf']);
  assert.equal(new Set(b.actions).size, 4);
  assert.equal(L.cambiarAccion(e, 0, 'orderPdf'), e, 'la misma acción no cambia nada');
  assert.equal(L.cambiarAccion(e, 0, 'deleteOrder'), e, 'Eliminar no se puede fijar');
  assert.equal(L.cambiarAccion(e, 4, 'payments'), e);
});

test('coincideConPerfil: personalizar deja de coincidir; volver al perfil coincide', () => {
  const e = L.aplicarPerfil('cashier');
  assert.equal(L.coincideConPerfil(e), true);
  assert.equal(L.coincideConPerfil(L.cambiarAccion(e, 3, 'history')), false);
});

test('el cuerpo a guardar trae el perfil y 4 ids distintos, y nada más', () => {
  const cuerpo = L.cuerpoGuardarRol(L.cambiarAccion(L.aplicarPerfil('sales'), 1, 'payments'));
  assert.deepEqual(Object.keys(cuerpo).sort(), ['actions', 'profile']);
  assert.equal(cuerpo.actions.length, 4);
  assert.equal(new Set(cuerpo.actions).size, 4);
  assert.equal(L.cuerpoGuardarRol({ profile: 'sales', actions: ['payments', 'payments', 'notes', 'history'] }), null);
  assert.equal(L.cuerpoGuardarRol({ profile: 'x', actions: ['payments', 'orderPdf', 'notes', 'history'] }), null);
});
