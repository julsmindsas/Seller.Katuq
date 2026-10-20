'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fixture } = require('./nav-fixture');
const channels = ['/notificaciones/whatsapp/inbox', '/notificaciones/instagram/inbox', '/notificaciones/facebook/inbox'];

for (const options of [
  { paths: [channels[0]], expected: [channels[0]] },
  { paths: [channels[1]], expected: [channels[1]] },
  { paths: [channels[2]], expected: [channels[2]] },
  { paths: [channels[1], channels[2]], expected: channels.slice(1) },
  { user: { rol: 'Administrador', company: 'QA' }, expected: channels },
  { paths: ['*'], expected: channels },
]) {
  test(`Próximamente conserva exactamente los canales autorizados: ${options.expected.join(', ')}`, () => {
    const { nav } = fixture(1440, options);
    const group = nav.getMenuItems().find(i => i.title === 'Mensajes');
    assert(group);
    assert.deepEqual(Array.from(group.children.filter(c => c.type === 'link'), c => c.path), options.expected);
    const future = group.children.filter(c => c.type === 'info');
    assert.deepEqual(Array.from(future, c => c.title), ['TikTok', 'Correo', 'Llamadas']);
    assert(future.every(c => !c.path && c.badgeValue === 'Próximamente'));
    const original = JSON.stringify(nav.ALLMENUITEMS);
    nav.filterMenuItemsByAuthorization(); nav.filterMenuItemsByAuthorization();
    assert.equal(JSON.stringify(nav.ALLMENUITEMS), original);
    assert(!nav.ALLMENUITEMS.some(i => i.children?.some(c => c.type === 'info')));
    assert.equal(nav.getMenuItems().find(i => i.title === 'Mensajes').children.filter(c => c.type === 'info').length, 3);
    nav.ngOnDestroy();
  });
}

test('los informativos no crean Mensajes cuando ninguna bandeja está autorizada, ni siquiera con un permiso parecido', () => {
  for (const paths of [[], ['productos'], ['notificaciones/whatsapp/inbox']]) {
    const { nav } = fixture(390, { paths });
    assert(!nav.getMenuItems().some(i => i.title === 'Mensajes'));
    nav.ngOnDestroy();
  }
});

test('retirar el último permiso quita también los informativos tras recalcular', () => {
  const { nav, storage } = fixture(390, { paths: [channels[0]] });
  assert(nav.getMenuItems().some(i => i.title === 'Mensajes'));
  storage.set('authorizedMenuItems', '[]');
  nav.filterMenuItemsByAuthorization();
  assert(!nav.getMenuItems().some(i => i.title === 'Mensajes'));
  nav.ngOnDestroy();
});
