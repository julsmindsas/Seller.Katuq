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
  'compacto', 'panel', 'sinAbrirPanel', 'filaDeFuente', 'abrirPanel', 'cerrarPanel', 'alEntrarPuntero',
  'alSalirPuntero', 'alPerderFoco', 'cerrarPanelConTeclado',
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
  // Las filas que arma `construirVistaMenu`, reducidas a lo que usan estos métodos.
  const fila = (item, clave) => ({
    clave, fuente: item, titulo: item.title, tipo: item.children ? 'grupo' : 'enlace',
    hijos: (item.children || []).map((hijo, i) => fila(hijo, `${clave}.${i}`)),
  });
  sidebar.sections.forEach((section, i) => { section.filas = section.items.map((item, j) => fila(item, `${i}.${j}`)); });
  Object.assign(sidebar, {
    collapseMenu: false,
    isMobile: () => false,
    cdr: { detectChanges() {} },
    navServices: { getMenuItems: () => sidebar.sections.flatMap(section => section.items) },
  });
  return { sidebar, operations, settings, products };
}

test('el panel del riel compacto pinta canales futuros como información sin href ni eventos de navegación', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../src/app/shared/components/sidebar/sidebar.component.html'), 'utf8');
  const panel = html.slice(html.indexOf('<ng-template #panelTpl'), html.indexOf('<!-- Menú Principal -->'));
  const informativo = panel.slice(panel.indexOf("*ngIf=\"hijo.tipo === 'info'\""));
  const etiqueta = informativo.slice(0, informativo.indexOf('>') + 1);
  assert.match(etiqueta, /aria-disabled="true"/);
  assert(!/routerLink|href|\(click\)/.test(etiqueta), 'el canal informativo no navega');
  assert(!html.includes('showCollapsedSubmenu') && !html.includes('collapsed-submenu-floating'), 'el submenú flotante armado a mano se retiró');
});

test('compacto solo existe en escritorio: en el celular colapsado es el cajón cerrado', () => {
  const { sidebar } = fixture();
  sidebar.collapseMenu = true;
  assert.equal(sidebar.compacto, true);
  sidebar.isMobile = () => true;
  assert.equal(sidebar.compacto, false);
});

test('en compacto, tocar un grupo abre su panel con tope en la ventana; en abierto no abre nada', () => {
  const { sidebar, operations } = fixture();
  const evento = { currentTarget: { closest: () => ({ querySelector: () => ({ getBoundingClientRect: () => ({ top: 880 }) }) }) } };
  sidebar.toggletNavActive(operations, { ...evento, stopPropagation() {}, preventDefault() {} });
  assert.equal(sidebar.panel, null, 'menú abierto: el grupo se despliega, no abre panel');
  assert.equal(operations.active, true);
  operations.active = false;
  sidebar.collapseMenu = true;
  sidebar.toggletNavActive(operations, { ...evento, stopPropagation() {}, preventDefault() {} });
  assert.equal(sidebar.panel.clave, '0.0');
  assert(sidebar.panel.top <= 900 - 8 - 56 - 40, 'el panel no se sale por abajo');
  assert.equal(operations.active, false, 'el grupo no se despliega en el riel');
  sidebar.cerrarPanel();
  assert.equal(sidebar.panel, null);
});

test('el panel no se abre con el dedo por hover, y cerrarlo con Esc no lo reabre al devolver el foco', () => {
  const { sidebar, operations } = fixture();
  sidebar.collapseMenu = true;
  const fila = sidebar.filaDeFuente(operations);
  sidebar.alEntrarPuntero(fila, { pointerType: 'touch', currentTarget: null });
  assert.equal(sidebar.panel, null);
  sidebar.alEntrarPuntero(fila, { pointerType: 'mouse', currentTarget: null });
  assert.equal(sidebar.panel.clave, fila.clave);
  sidebar.alSalirPuntero({ pointerType: 'touch' });
  assert.equal(sidebar.panel.clave, fila.clave, 'soltar el dedo no cierra');
  sidebar.alSalirPuntero({ pointerType: 'mouse' });
  assert.equal(sidebar.panel, null);

  sidebar.abrirPanel(fila, { currentTarget: null });
  const boton = { focus: () => sidebar.abrirPanel(fila, { currentTarget: null }) };
  sidebar.cerrarPanelConTeclado({ currentTarget: { closest: () => ({ querySelector: () => boton }) } });
  assert.equal(sidebar.panel, null, 'el foco devuelto al botón no reabre el panel');
});

test('el foco que sale de la fila y de su panel lo cierra; el que se queda dentro, no', () => {
  const { sidebar, operations } = fixture();
  sidebar.collapseMenu = true;
  const fila = sidebar.filaDeFuente(operations);
  const dentro = {};
  const item = { contains: nodo => nodo === dentro };
  sidebar.abrirPanel(fila, { currentTarget: null });
  sidebar.alPerderFoco({ currentTarget: item, relatedTarget: dentro });
  assert.equal(sidebar.panel.clave, fila.clave);
  sidebar.alPerderFoco({ currentTarget: item, relatedTarget: {} });
  assert.equal(sidebar.panel, null);
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

test('el cajón cerrado del celular depende de `.collapsed` en el aside: se liga a collapseMenu, no a compacto', () => {
  // En el celular `compacto` es siempre falso; si el aside solo usara `compacto`, el cajón nunca se escondería.
  const html = fs.readFileSync(path.resolve(__dirname, '../../src/app/shared/components/sidebar/sidebar.component.html'), 'utf8');
  const aside = html.match(/<aside class="sidebar-container"[^>]*>/s)[0];
  assert.match(aside, /\[class\.collapsed\]="collapseMenu"/);
  const scss = fs.readFileSync(path.resolve(__dirname, '../../src/app/shared/components/sidebar/sidebar.component.scss'), 'utf8');
  assert.match(scss, /En móvil "collapsed" = drawer cerrado[\s\S]{0,80}&\.collapsed\s*\{\s*transform: translateX\(calc\(-100% - 24px\)\)/);
  // El encabezado y el contenido del riel sí son solo de escritorio.
  assert.match(html, /<header class="sidebar-header unified-header"\s+\[class\.collapsed\]="compacto"/);
});
