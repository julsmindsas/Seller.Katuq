'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rxjs = require('rxjs');
const operators = require('rxjs/operators');

function fixture(width) {
  const filename = path.resolve(__dirname, '../../src/app/shared/services/nav.service.ts');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const service = source.statements.find(node => ts.isClassDeclaration(node));
  const compiled = ts.transpileModule(service.getText(source), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true },
  }).outputText;
  const viewport = new EventTarget();
  viewport.innerWidth = width;
  const context = {
    exports: {}, ...rxjs, ...operators,
    Injectable: () => target => target,
    window: viewport,
    localStorage: { getItem: () => null },
  };
  vm.runInNewContext(compiled, context);
  const events = new rxjs.Subject();
  const nav = new context.exports.NavService(
    { events },
    { refreshCart: () => rxjs.of([]) },
    { deepClone: value => JSON.parse(JSON.stringify(value)) },
  );
  return { nav, events, viewport };
}

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
