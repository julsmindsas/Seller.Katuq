'use strict';

// D-546 (F3, D12): el editor de roles muestra cada entrada con su grupo, reconoce un rol guardado con los
// nombres de antes por su ruta, y no escribe campos de presentación en el rol.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { fixture } = require('./nav-fixture');

const root = path.resolve(__dirname, '../..');
const contexto = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/components/rol/roles/roles-menus.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, contexto);
const { catalogoDeMenus, entradasConNombresActuales, disponiblesSinSeleccionadas, menusParaGuardar, textoDeEntrada, mismaEntrada } = contexto.exports;
const plano = valor => JSON.parse(JSON.stringify(valor));

// Lo mismo que hace roles.component.ts: el menú original sin lo exclusivo de Super Administrador, más Creación rápida.
const PERMISOS_FUERA = { productos: [{ path: 'productos/crear-rapido', title: 'Creación rápida', type: 'link', icon: 'zap' }] };
const { nav } = fixture(1440, { user: { rol: 'Administrador', company: 'QA' } });
const catalogo = plano(catalogoDeMenus(nav.getMenuOriginal(), PERMISOS_FUERA));
nav.ngOnDestroy();
const filtrar = termino => catalogo.filter(e => ['etiqueta', 'title', 'previousTitle'].some(campo => String(e[campo] || '').toLowerCase().includes(termino)));

test('buscar «listado» muestra los listados de Clientes, Cotizaciones y Productos como entradas distintas', () => {
  const etiquetas = filtrar('listado').filter(e => e.movable).map(textoDeEntrada);
  for (const esperada of ['Clientes · Listado', 'Cotizaciones · Listado', 'Productos · Listado']) assert(etiquetas.includes(esperada), `falta ${esperada}`);
});

test('el buscador del selector también encuentra por el nombre anterior', () => {
  assert.deepEqual(filtrar('inventario por bodega').filter(e => e.movable).map(textoDeEntrada), ['Bodegas · Existencias']);
  assert.deepEqual(filtrar('clientes corporativos').filter(e => e.movable).map(textoDeEntrada), ['CRM · Prospectos']);
});

test('«Creación rápida» sale una sola vez, bajo Inventario › Productos, no bajo Configuración › Productos', () => {
  const rapidas = catalogo.filter(e => e.path === 'productos/crear-rapido');
  assert.equal(rapidas.length, 1);
  assert.equal(textoDeEntrada(rapidas[0]), 'Productos · Creación rápida');
  const posicion = catalogo.indexOf(rapidas[0]);
  const encabezado = catalogo.slice(0, posicion).reverse().find(e => e.movable === false);
  assert.equal(encabezado.id, 'productos', 'viene justo después de las pantallas del grupo de Inventario');
});

test('Landings no se ofrece: no es un permiso, la ve quien ve «Mis sitios»', () => {
  assert(!catalogo.some(e => e.path === 'sitios/landings'));
  assert(catalogo.some(e => e.path === 'sitios'));
});

test('el catálogo no modifica el menú de NavService y trae encabezados no movibles', () => {
  const { nav: otro } = fixture(1440, { user: { rol: 'Administrador', company: 'QA' } });
  const original = otro.getMenuOriginal();
  const antes = JSON.stringify(original);
  catalogoDeMenus(original, PERMISOS_FUERA);
  assert.equal(JSON.stringify(original), antes);
  otro.ngOnDestroy();
  assert(catalogo.filter(e => e.movable === false).every(e => Array.isArray(e.children) && e.children.length === 0));
});

// Un rol guardado ANTES de F3, con los nombres de antes (así quedan en Firestore: ruta, título, tipo, movable, index).
const rolViejo = [
  { path: 'ventas/clienteslista', title: 'Listado de clientes', type: 'link', icon: 'list', movable: true, index: 3 },
  { path: 'inventario/inventario-catalogo', title: 'Inventario por bodega', type: 'link', icon: 'database', movable: true, index: 40 },
  { path: 'cotizaciones/catalogos', title: 'Catálogos por link', type: 'link', icon: 'share-2', movable: true, index: 12 },
  { path: 'productos/crear-rapido', title: 'Creación rápida', type: 'link', icon: 'zap', movable: true, index: 99 },
  { path: 'pantalla/retirada', title: 'Algo que ya no existe', type: 'link', movable: true, index: 100 },
];

test('un rol guardado con los nombres de antes se abre con los de ahora, sin duplicados', () => {
  const seleccionadas = plano(entradasConNombresActuales(rolViejo, catalogo));
  assert.deepEqual(seleccionadas.map(textoDeEntrada), [
    'Clientes · Listado', 'Bodegas · Existencias', 'Sitio web · Catálogo por link', 'Productos · Creación rápida', 'Algo que ya no existe',
  ]);
  const disponibles = plano(disponiblesSinSeleccionadas(catalogo, seleccionadas));
  for (const entrada of seleccionadas) {
    assert.equal(disponibles.filter(d => d.movable && d.path === entrada.path).length, 0, `${entrada.path} aparece en disponibles y en asignadas`);
  }
  // Y nada más desapareció de disponibles.
  assert.equal(disponibles.length, catalogo.length - 4);
});

test('guardar sin cambios conserva las mismas rutas y ningún campo de presentación', () => {
  const seleccionadas = plano(entradasConNombresActuales(rolViejo, catalogo));
  const guardado = plano(menusParaGuardar(seleccionadas));
  assert.deepEqual(guardado.map(m => m.path), rolViejo.map(m => m.path), 'mismas rutas, mismo orden');
  for (const entrada of guardado) {
    for (const campo of ['etiqueta', 'previousTitle', 'menuIcon', 'id', 'display']) assert(!(campo in entrada), `${entrada.path} lleva «${campo}»`);
  }
  // Las entradas que salen del catálogo actual sí traen esos campos antes de limpiarse.
  assert(plano(entradasConNombresActuales(rolViejo, catalogo)).slice(0, 3).every(e => e.etiqueta));
  // La entrada de una pantalla retirada se conserva tal cual estaba guardada.
  assert.deepEqual(guardado[4], rolViejo[4]);
});

test('las entradas se reconocen por la ruta (con o sin barra) y los encabezados por su título', () => {
  assert.equal(mismaEntrada({ path: '/marketing', title: 'a' }, { path: 'marketing', title: 'b' }), true);
  assert.equal(mismaEntrada({ path: 'a' }, { path: 'b' }), false);
  assert.equal(mismaEntrada({ title: 'Grupo' }, { title: 'Grupo' }), true);
  assert.equal(mismaEntrada({ title: 'Grupo' }, { path: 'a', title: 'Grupo' }), false, 'un encabezado no es una pantalla');
  assert.equal(mismaEntrada({}, {}), false);
});

test('un rol guardado con todas las pantallas deja solo los encabezados disponibles', () => {
  const todas = catalogo.filter(e => e.movable);
  const seleccionadas = plano(entradasConNombresActuales(todas, catalogo));
  const disponibles = plano(disponiblesSinSeleccionadas(catalogo, seleccionadas));
  assert(disponibles.every(e => e.movable === false));
});
