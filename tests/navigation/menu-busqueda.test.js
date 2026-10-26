'use strict';

// D-546 (F3, D11): el buscador del menú encuentra por el nombre de ahora, por la ruta y, durante 90 días, por el
// nombre anterior; sin mayúsculas ni tildes, y cada resultado muestra su grupo.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { fixture } = require('./nav-fixture');

const root = path.resolve(__dirname, '../..');
function pureModule(file) {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}
const vista = pureModule('src/app/shared/components/sidebar/menu-vista.ts');
const ocultar = item => {
  const ruta = (item.path || '').toLowerCase(); const titulo = (item.title || '').toLowerCase();
  return ruta.includes('/empresas') || ruta.includes('/usuarios') || ruta.includes('/rol')
    || titulo.includes('empresa') || titulo.includes('usuario') || titulo.includes('rol');
};
const { nav } = fixture(1440, { user: { rol: 'Administrador', company: 'QA' }, flags: { pickingAlistamiento: true }, dropshipping: true });
const secciones = vista.construirVistaMenu(nav.getMenuItems(), ocultar, new Date('2026-10-23T12:00:00'));
nav.ngOnDestroy();
const HOY = new Date('2026-11-10T12:00:00');
const HASTA = '2027-01-21';
const buscar = (termino, ahora = HOY, hasta = HASTA) => Array.from(vista.buscarEntradas(secciones, termino, ahora, hasta), r => `${r.grupo ? `${r.grupo} · ` : ''}${r.titulo}`);

test('«inventario por bodega» (el nombre de antes) encuentra «Bodegas · Existencias»', () => {
  assert.deepEqual(buscar('inventario por bodega'), ['Bodegas · Existencias']);
  const [resultado] = vista.buscarEntradas(secciones, 'inventario por bodega', HOY, HASTA);
  assert.equal(resultado.ruta, 'inventario/inventario-catalogo', 'abre la misma pantalla de siempre');
  assert.equal(resultado.icono, 'building-warehouse', 'con el ícono de su grupo');
});

test('sin mayúsculas ni tildes, y por nombre actual o por ruta', () => {
  assert.deepEqual(buscar('EXISTENCIAS'), ['Bodegas · Existencias']);
  assert.deepEqual(buscar('Facturacion'), ['Facturación']);
  assert.deepEqual(buscar('traslados'), ['Bodegas · Traslados']);
  assert.deepEqual(buscar('inventario/traslados'), ['Bodegas · Traslados']);
  assert.deepEqual(buscar('ordenes de compra'), ['Compras · Órdenes']);
});

test('un grupo dibujado como enlace muestra solo su nombre, y los enlaces de la sección también', () => {
  assert.deepEqual(buscar('lista de precios'), ['Precios']);
  assert.deepEqual(buscar('whatsapp'), ['WhatsApp']);
  assert.deepEqual(buscar('Cartera (CxC)'), ['Cartera']);
});

test('los nombres anteriores sirven para las pantallas y, si es de un grupo, lleva a todas sus pantallas', () => {
  assert.deepEqual(buscar('mi pagina web'), ['Sitio web · Mis sitios', 'Sitio web · Landings', 'Sitio web · Catálogo web', 'Sitio web · Catálogo por link']);
  assert.deepEqual(buscar('Catálogos por link'), ['Sitio web · Catálogo por link']);
  assert.deepEqual(buscar('Clientes corporativos'), ['CRM · Prospectos']);
  assert.deepEqual(buscar('Dashboard de Marketing'), ['Campañas · Panel']);
  assert.deepEqual(buscar('Picking y packing'), ['Alistamiento · Picking', 'Alistamiento · Packing']);
  assert.deepEqual(buscar('Picking y packing', new Date('2027-02-01T00:00:00')), [], 'vencido el plazo, ya no');
  assert.deepEqual(buscar('Órdenes de picking'), ['Alistamiento · Picking']);
});

test('el nombre anterior vence a los 90 días y nada más se apaga', () => {
  assert.deepEqual(buscar('inventario por bodega', new Date('2027-01-21T12:00:00')), ['Bodegas · Existencias'], 'el último día todavía sirve');
  assert.deepEqual(buscar('inventario por bodega', new Date('2027-01-22T00:30:00')), []);
  assert.deepEqual(buscar('existencias', new Date('2027-06-01T00:00:00')), ['Bodegas · Existencias'], 'el nombre nuevo sigue buscándose');
  assert.deepEqual(buscar('inventario por bodega', HOY, ''), [], 'sin fecha límite no se buscan nombres anteriores');
});

test('Landings se encuentra, no hay resultados vacíos ni más de 8, y los avisos «pronto» no son resultados', () => {
  assert.deepEqual(buscar('landings'), ['Sitio web · Landings']);
  assert.deepEqual(buscar('   '), []);
  assert.deepEqual(buscar('zzzz'), []);
  assert(buscar('a').length <= 8);
  assert.deepEqual(buscar('tiktok'), []);
});
