'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Ejecutar los métodos reales del componente sin iniciar Firebase ni servicios HTTP.
const filename = path.resolve(__dirname, '../../src/app/shared/components/sidebar/sidebar.component.ts');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
const component = source.statements.find(node => ts.isClassDeclaration(node));
const names = new Set([
  'sections', 'openMenus', 'menuKeys', 'nextMenuKey', 'getMenuKey', 'isMenuOpen',
  'toggletNavActive', 'closeAllFirstLevelMenus', 'closeChildrenActive', 'closeChildrenInSet',
  'closeChildrenRecursive', 'closeSiblings', 'closeSiblingsInChildren', 'isFirstLevelItem',
  'resetActiveState', 'isAncestor', 'handleMobileSubmenuToggle', 'setActiveRecursive',
  'showCollapsedSubmenu',
]);
const members = component.members.filter(node => names.has(node.name?.getText(source)));
const compiled = ts.transpileModule(`export class SidebarMenu { ${members.map(node => node.getText(source)).join('\n')} }`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {}, window: { innerHeight: 900 }, document: { body: { children: [] } }, setTimeout: () => null };
vm.runInNewContext(compiled, context);

function group(title, children) {
  return { title, type: 'sub', active: false, children };
}

function link(title, path) {
  return { title, path, type: 'link', active: false };
}

function fixture() {
  const operations = group('Logística', [link('Envíos y entregas', 'despachos')]);
  const settings = group('Logística', [link('Formas de entrega', 'formasEntrega')]);
  const products = group('Productos', [link('Productos', 'productos')]);
  const sidebar = new context.exports.SidebarMenu();
  sidebar.sections = [
    { title: 'Operaciones', items: [operations] },
    { title: 'Inventarios y Productos', items: [products] },
    { title: 'Configuración', items: [settings] },
  ];
  Object.assign(sidebar, {
    collapseMenu: false,
    isTemporarilyExpanded: false,
    isMobile: () => false,
    cdr: { detectChanges() {} },
    navServices: { getMenuItems: () => sidebar.sections.flatMap(section => section.items) },
  });
  return { sidebar, operations, settings, products };
}

test('el submenú flotante pinta canales futuros como información sin href ni eventos de navegación', () => {
  const sidebar = new context.exports.SidebarMenu();
  Object.assign(sidebar, {
    isMobile: () => false, closeCollapsedSubmenu() {}, getMenuIcon: () => 'fa-circle',
    rutaMenu: p => p, navigateAndCleanup: () => assert.fail('no debe navegar'),
    // D-532 (IDI-B01a): el submenú flotante traduce al mostrar; en español la clave es el texto.
    translate: { instant: k => k },
    renderer: {
      createElement: tag => ({ tag, attrs: {}, children: [], listeners: [] }),
      createText: text => ({ text }), addClass() {}, removeClass() {}, setStyle() {},
      setAttribute: (el, key, value) => { el.attrs[key] = value; },
      appendChild: (el, child) => el.children.push(child),
      listen: (el, event) => { el.listeners.push(event); return () => {}; },
    },
  });
  const parent = { getBoundingClientRect: () => ({ top: 100, right: 200 }) };
  sidebar.showCollapsedSubmenu({ children: [{ title: 'TikTok', type: 'info', badgeValue: 'Próximamente' }] }, {
    target: { closest: () => parent },
  });
  const entry = sidebar.currentCollapsedSubmenu.children[0];
  assert.equal(entry.tag, 'div');
  assert.equal(entry.attrs['aria-disabled'], 'true');
  assert.equal(entry.attrs.href, undefined);
  assert(!entry.listeners.includes('click'));
  assert.equal(entry.children[1].children[1].children[0].text, 'Próximamente');
});

test('Logística de Operaciones abre al primer clic después de Logística de Configuración', () => {
  const { sidebar, operations, settings } = fixture();
  sidebar.toggletNavActive(settings);
  assert.equal(settings.active, true);
  assert.equal(operations.active, false);
  sidebar.toggletNavActive(operations);
  assert.equal(operations.active, true);
  assert.equal(settings.active, false);
  sidebar.toggletNavActive(settings);
  assert.equal(settings.active, true);
  assert.equal(operations.active, false);
});

test('las dos entradas Logística tienen identificadores DOM distintos y estables', () => {
  const { sidebar, operations, settings } = fixture();
  assert.notEqual(sidebar.getMenuKey(operations), sidebar.getMenuKey(settings));
  assert.equal(sidebar.getMenuKey(operations), sidebar.getMenuKey(operations));
});

test('un menú activado por navegación cierra al primer clic y vuelve a abrir', () => {
  const { sidebar, products } = fixture();
  sidebar.setActiveRecursive(products, products.children[0]);
  assert.equal(products.active, true);
  sidebar.toggletNavActive(products);
  assert.equal(products.active, false);
  assert.equal(products.children[0].active, false);
  sidebar.toggletNavActive(products);
  assert.equal(products.active, true);
});

test('el estado de submenús sigue coherente al cambiar de móvil a escritorio', () => {
  const { sidebar, operations, settings } = fixture();
  sidebar.isMobile = () => true;
  sidebar.toggletNavActive(settings);
  assert.equal(settings.active, true);
  sidebar.isMobile = () => false;
  sidebar.toggletNavActive(settings);
  assert.equal(settings.active, false);
  sidebar.toggletNavActive(operations);
  assert.equal(operations.active, true);
});

test('un submenú con el título de otro grupo conserva a su propio padre abierto', () => {
  const { sidebar, operations, products } = fixture();
  const nested = group('Logística', [link('Detalle', 'detalle')]);
  const sibling = group('Opciones', [link('Lista', 'lista')]);
  products.children = [nested, sibling];
  sidebar.toggletNavActive(products);
  sidebar.toggletNavActive(sibling);
  sidebar.toggletNavActive(nested);
  assert.equal(products.active, true);
  assert.equal(nested.active, true);
  assert.equal(sibling.active, false);
  assert.equal(operations.active, false);
});
