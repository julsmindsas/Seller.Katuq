'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fixture } = require('./nav-fixture');

test('abrir Productos conserva el menú expandido en escritorio aunque la sesión iniciara estrecha', () => {
  const { nav, events, viewport } = fixture(800);
  viewport.innerWidth = 1366;
  nav.collapseSidebar = false;
  events.next({ url: '/productos' });
  assert.equal(nav.collapseSidebar, false);
  nav.ngOnDestroy();
});

test('navegar cierra el menú en móvil aunque la sesión iniciara en escritorio', () => {
  const { nav, events, viewport } = fixture(1366);
  viewport.innerWidth = 991;
  nav.collapseSidebar = false;
  nav.megaMenu = true;
  nav.levelMenu = true;
  events.next({ url: '/productos' });
  assert.equal(nav.collapseSidebar, true);
  assert.equal(nav.megaMenu, false);
  assert.equal(nav.levelMenu, false);
  nav.ngOnDestroy();
});

test('992px usa navegación de escritorio y respeta el menú abierto', () => {
  const { nav, events, viewport } = fixture(800);
  viewport.innerWidth = 992;
  nav.collapseSidebar = false;
  events.next({ url: '/despachos' });
  assert.equal(nav.collapseSidebar, false);
  nav.ngOnDestroy();
});

test('destruir NavService cancela su suscripción de navegación', () => {
  const { nav, events } = fixture(800);
  nav.ngOnDestroy();
  nav.collapseSidebar = false;
  events.next({ url: '/productos' });
  assert.equal(nav.collapseSidebar, false);
});
