'use strict';
/**
 * D-547 (F2, tarea 11.1): los días en hora de Colombia y la lectura tolerante de `GET /v1/order-actions/me`.
 *
 *   node --test tests/ventas/acciones-pedido-dia-y-me.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const base = '../../src/app/components/ventas/list/acciones-pedido/';
const { diaColombia, sumarDias } = require(base + 'acciones-pedido.dia.ts');
const { normalizarAcciones, accionesPorOmision } = require(base + 'acciones-pedido.me.ts');

test('diaColombia: a las 23:30 de Colombia sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
  assert.equal(diaColombia(new Date('2026-10-27T04:30:00Z')), '2026-10-26'); // 23:30 del lunes en Bogotá
  assert.equal(diaColombia(new Date('2026-10-27T05:00:00Z')), '2026-10-27'); // 00:00 del martes en Bogotá
  assert.equal(diaColombia(new Date('2026-01-01T04:59:00Z')), '2025-12-31');
});

test('sumarDias: cruza meses y años; una fecha inválida se devuelve igual', () => {
  assert.equal(sumarDias('2026-10-26', 30), '2026-11-25');
  assert.equal(sumarDias('2026-12-20', 30), '2027-01-19');
  assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(sumarDias('nada', 30), 'nada');
});

test('normalizarAcciones: una respuesta completa pasa tal cual', () => {
  const r = normalizarAcciones({
    role: { profile: 'cashier', actions: ['orderPdf', 'payments', 'billingData', 'editProducts'], source: 'role' },
    pinned: ['notes'], dismissed: { history: '2026-11-20' }, lastSuggestionAt: '2026-10-19', usageDays: { payments: 4 },
  });
  assert.deepEqual(r.role.actions, ['orderPdf', 'payments', 'billingData', 'editProducts']);
  assert.equal(r.role.profile, 'cashier');
  assert.deepEqual(r.pinned, ['notes']);
  assert.deepEqual(r.dismissed, { history: '2026-11-20' });
  assert.equal(r.lastSuggestionAt, '2026-10-19');
  assert.deepEqual(r.usageDays, { payments: 4 });
});

test('normalizarAcciones: lo que llega mal formado se toma como vacío y nunca lanza', () => {
  for (const malo of [null, undefined, 7, 'x', [], { role: 5, pinned: 'a', dismissed: [], usageDays: 'z' }]) {
    const r = normalizarAcciones(malo);
    assert.equal(r.role.profile, null);
    assert.equal(r.role.actions, null);
    assert.deepEqual(r.pinned, []);
    assert.deepEqual(r.dismissed, {});
    assert.deepEqual(r.usageDays, {});
    assert.equal(r.lastSuggestionAt, '');
  }
  const mezcla = normalizarAcciones({ pinned: ['notes', 3, null], usageDays: { payments: 'tres', history: '2' } });
  assert.deepEqual(mezcla.pinned, ['notes']);
  assert.deepEqual(mezcla.usageDays, { history: 2 });
});

test('accionesPorOmision: perfil sin configurar, sin pines y sin uso (404 o 409 del servidor)', () => {
  const r = accionesPorOmision();
  assert.equal(r.role.profile, null);
  assert.equal(r.role.actions, null);
  assert.deepEqual(r.pinned, []);
  assert.deepEqual(r.usageDays, {});
  assert.notEqual(accionesPorOmision().pinned, r.pinned, 'cada llamada devuelve objetos nuevos');
});
