'use strict';

// D-546 (F3, D10): los favoritos sobreviven a los cambios de nombre y de lugar del menú.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { fixture } = require('./nav-fixture');

const root = path.resolve(__dirname, '../..');
// menu-favoritos.ts importa de menu-vista.ts: se cargan juntos con un `require` mínimo.
function cargar() {
  const modulos = {};
  const requerir = nombre => {
    if (nombre === './menu-vista') return modulos.vista;
    throw new Error(`import inesperado: ${nombre}`);
  };
  const compilar = file => {
    const ctx = { exports: {}, require: requerir };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, ctx);
    return ctx.exports;
  };
  modulos.vista = compilar('src/app/shared/components/sidebar/menu-vista.ts');
  modulos.favoritos = compilar('src/app/shared/components/sidebar/menu-favoritos.ts');
  return modulos;
}
const { vista, favoritos } = cargar();
const HOY = new Date('2026-10-23T12:00:00');
const ocultar = item => {
  const ruta = (item.path || '').toLowerCase(); const titulo = (item.title || '').toLowerCase();
  return ruta.includes('/empresas') || ruta.includes('/usuarios') || ruta.includes('/rol')
    || titulo.includes('empresa') || titulo.includes('usuario') || titulo.includes('rol');
};
const menuDe = (user, paths = [], extra = {}) => {
  const { nav } = fixture(1440, { user, paths, ...extra });
  const secciones = vista.construirVistaMenu(nav.getMenuItems(), ocultar, HOY);
  nav.ngOnDestroy();
  return secciones;
};
// Los módulos corren en otro contexto de `vm`: se comparan por contenido, no por prototipo.
const plano = valor => JSON.parse(JSON.stringify(valor === undefined ? null : valor));
const eq = (actual, esperado, mensaje) => assert.deepEqual(plano(actual), plano(esperado), mensaje);
const ADMIN = { rol: 'Administrador', company: 'QA' };
const TODO = { flags: { pickingAlistamiento: true, serviceAgenda: true, npsModulo: true }, dropshipping: true };
function almacen(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return { datos, getItem: k => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)) };
}
const viejo = (title, ruta) => ({ title, path: ruta, icon: 'x', type: ruta ? 'link' : 'sub' });
const pantalla = ruta => ({ kind: 'screen', path: ruta });
const grupo = id => ({ kind: 'group', id });
const resolver = (lista, secciones) => Array.from(favoritos.resolverFavoritos(lista, secciones), f => ({ titulo: f.titulo, grupo: f.grupo, ruta: f.ruta, pantallas: Array.from(f.pantallas, p => p.titulo) }));

test('escenario de la spec: «Inventario por bodega» y el grupo «Lista de precios» se ven como «Existencias» (bajo Bodegas) y «Precios»', () => {
  const secciones = menuDe(ADMIN);
  const a = almacen({ sidebarFavoriteItems: JSON.stringify([viejo('Inventario por bodega', 'inventario/inventario-catalogo'), viejo('Lista de precios')]) });
  const { lista, convertido } = favoritos.cargarFavoritos(a, secciones);
  assert.equal(convertido, true);
  eq(resolver(lista, secciones), [
    { titulo: 'Existencias', grupo: 'Bodegas', ruta: 'inventario/inventario-catalogo', pantallas: [] },
    { titulo: 'Precios', grupo: 'Inventario', ruta: 'lista-precios/lista-precios', pantallas: [] },
  ]);
});

test('cada tipo de favorito viejo cae donde dice la spec', () => {
  const secciones = menuDe(ADMIN, [], TODO);
  const cases = [
    [viejo('Inventarios'), { titulo: 'Bodegas', grupo: 'Inventario' }],
    [viejo('Inventarios y productos'), { titulo: 'Inventario', grupo: 'Configuración' }],
    [viejo('Producto'), { titulo: 'Productos', grupo: 'Configuración' }],
    [viejo('Producción'), { titulo: 'Producción', grupo: 'Operaciones', ruta: 'produccion/dashboard' }],
    [viejo('En vivo'), { titulo: 'En vivo', grupo: 'Operaciones' }],
    [viejo('Mi página web'), { titulo: 'Sitio web', grupo: 'Gestión comercial' }],
    [viejo('Picking y packing'), { titulo: 'Alistamiento', grupo: 'Inventario' }],
    [viejo('Agent Builder'), { titulo: 'Agentes IA', grupo: 'Analítica' }],
  ];
  for (const [entrada, esperado] of cases) {
    const lista = favoritos.convertirFavoritosViejos([entrada]);
    const [resuelto] = favoritos.resolverFavoritos(lista, secciones);
    assert(resuelto, entrada.title);
    assert.equal(resuelto.titulo, esperado.titulo, entrada.title);
    assert.equal(resuelto.grupo, esperado.grupo, entrada.title);
    if (esperado.ruta) assert.equal(resuelto.ruta, esperado.ruta);
  }
});

test('un grupo que desaparece (Finanzas, Mensajes) queda como favorito de su sección y muestra sus pantallas debajo', () => {
  const secciones = menuDe(ADMIN);
  const lista = favoritos.convertirFavoritosViejos([viejo('Finanzas'), viejo('Mensajes')]);
  eq(lista, [grupo('finanzas'), grupo('mensajes')]);
  eq(resolver(lista, secciones), [
    { titulo: 'Finanzas', grupo: '', ruta: undefined, pantallas: ['Facturación', 'Tesorería', 'Cartera', 'Contabilidad'] },
    { titulo: 'Comunicaciones', grupo: '', ruta: undefined, pantallas: ['WhatsApp', 'Instagram', 'Facebook'] },
  ]);
  const [finanzas] = favoritos.resolverFavoritos(lista, secciones);
  assert.equal(finanzas.seccionId, 'seccion-finanzas'); assert.equal(finanzas.filaGrupo, undefined);
});

test('«Logística» (hay dos) queda en el grupo que se abre hoy: el de Operaciones', () => {
  const secciones = menuDe(ADMIN);
  const [resuelto] = favoritos.resolverFavoritos(favoritos.convertirFavoritosViejos([viejo('Logística')]), secciones);
  assert.equal(resuelto.grupo, 'Operaciones');
  eq(Array.from(resuelto.pantallas, p => p.titulo), ['Envíos', 'Centro operativo']);
  const config = favoritos.resolverFavoritos([grupo('config-logistica')], secciones)[0];
  assert.equal(config.grupo, 'Configuración');
});

test('el favorito de una pantalla renombrada o movida conserva su estrella y toma el nombre nuevo', () => {
  const secciones = menuDe(ADMIN);
  const lista = favoritos.convertirFavoritosViejos([viejo('Clientes corporativos', 'ventas/clientes-corporativos'), viejo('Catálogos por link', 'cotizaciones/catalogos'), viejo('Dashboard de Marketing', '/marketing')]);
  eq(resolver(lista, secciones), [
    { titulo: 'Prospectos', grupo: 'CRM', ruta: 'ventas/clientes-corporativos', pantallas: [] },
    { titulo: 'Catálogo por link', grupo: 'Sitio web', ruta: 'cotizaciones/catalogos', pantallas: [] },
    { titulo: 'Panel', grupo: 'Campañas', ruta: '/marketing', pantallas: [] },
  ]);
  assert.equal(favoritos.esFavorito(lista, pantalla('/ventas/clientes-corporativos')), true, 'la barra inicial no importa');
});

test('«Productos» no se confunde: el de Inventario y el de Configuración se distinguen por su grupo', () => {
  const secciones = menuDe(ADMIN);
  const resueltos = favoritos.resolverFavoritos([grupo('productos'), grupo('config-productos')], secciones);
  eq(Array.from(resueltos, f => [f.titulo, f.grupo]), [['Productos', 'Inventario'], ['Productos', 'Configuración']]);
});

test('el límite es 5 y no se repite nada, ni al convertir ni al agregar', () => {
  const siete = Array.from({ length: 7 }, (_, i) => viejo(`P${i}`, `ruta/${i}`));
  assert.equal(favoritos.convertirFavoritosViejos(siete).length, 5);
  assert.equal(favoritos.convertirFavoritosViejos([viejo('A', 'x'), viejo('B', '/x')]).length, 1);
  let lista = [];
  for (let i = 0; i < 6; i++) lista = favoritos.agregarFavorito(lista, pantalla(`r/${i}`));
  eq(lista.map(f => f.path), ['r/5', 'r/4', 'r/3', 'r/2', 'r/1'], 'el sexto saca al más viejo, como siempre (D-517)');
  eq(favoritos.agregarFavorito(lista, pantalla('r/3')).map(f => f.path), ['r/3', 'r/5', 'r/4', 'r/2', 'r/1']);
  eq(favoritos.quitarFavorito(lista, pantalla('/r/4')).map(f => f.path), ['r/5', 'r/3', 'r/2', 'r/1']);
});

test('un grupo de un hijo y su pantalla, guardados los dos, no ocupan dos casillas con la misma pantalla', () => {
  const secciones = menuDe(ADMIN);
  const a = almacen({ sidebarFavoriteItems: JSON.stringify([viejo('Lista de precios'), viejo('Precios', 'lista-precios/lista-precios')]) });
  const { lista } = favoritos.cargarFavoritos(a, secciones);
  assert.equal(lista.length, 1, 'se guarda una sola');
  assert.equal(favoritos.resolverFavoritos(lista, secciones).length, 1);
  // Aunque ya venga duplicado de antes (lista guardada en V2), se ve una sola vez.
  const duplicada = [grupo('precios'), pantalla('lista-precios/lista-precios')];
  const resueltos = resolver(duplicada, secciones);
  eq(resueltos.map(f => f.ruta), ['lista-precios/lista-precios']);
  eq(resolver(favoritos.filtrarPorRol(duplicada, secciones), secciones).map(f => f.ruta), ['lista-precios/lista-precios']);
});

test('un rol que ya no ve una pantalla la pierde, como hoy; y sin menú cargado no se descarta nada', () => {
  const soloPedidos = menuDe({ rol: 'Vendedor', company: 'QA' }, ['ventas/pedidos']);
  const lista = favoritos.convertirFavoritosViejos([viejo('Todos los pedidos', 'ventas/pedidos'), viejo('Listado de clientes', 'ventas/clienteslista'), viejo('Finanzas')]);
  eq(favoritos.filtrarPorRol(lista, soloPedidos), [pantalla('ventas/pedidos')]);
  eq(favoritos.filtrarPorRol(lista, []), lista, 'sin menú, no se filtra');
  const a = almacen({ sidebarFavoriteItems: JSON.stringify([viejo('Todos los pedidos', 'ventas/pedidos')]) });
  const espera = favoritos.cargarFavoritos(a, []);
  assert.equal(espera.pendiente, true); assert.equal(espera.convertido, false);
  assert(!a.datos.has('sidebarFavoritesV2'), 'no se guarda nada mientras el menú no cargó');
});

test('la conversión se hace una sola vez y no toca sidebarFavoriteItems', () => {
  const secciones = menuDe(ADMIN);
  const crudo = JSON.stringify([viejo('Inventario por bodega', 'inventario/inventario-catalogo'), viejo('Mensajes')]);
  const a = almacen({ sidebarFavoriteItems: crudo });
  const primera = favoritos.cargarFavoritos(a, secciones);
  assert.equal(primera.convertido, true);
  assert.equal(a.getItem('sidebarFavoriteItems'), crudo, 'los favoritos de antes quedan intactos (rollback)');
  const guardado = a.getItem('sidebarFavoritesV2');
  const segunda = favoritos.cargarFavoritos(a, secciones);
  assert.equal(segunda.convertido, false);
  eq(segunda.lista, primera.lista);
  assert.equal(a.getItem('sidebarFavoritesV2'), guardado, 'la segunda carga no cambia nada');
  // Si el usuario cambia sus favoritos después, la versión vieja no vuelve a pisarlos.
  favoritos.guardarFavoritos(a, [pantalla('ventas/pedidos')]);
  eq(favoritos.cargarFavoritos(a, secciones).lista, [pantalla('ventas/pedidos')]);
});

test('lo guardado con forma rara se ignora y un almacén roto no rompe el menú', () => {
  eq(favoritos.leerFavoritosGuardados([{ kind: 'screen', path: 'a' }, { kind: 'x' }, null, 5, { kind: 'group', id: '' }, { kind: 'group', id: 'g' }]), [pantalla('a'), grupo('g')]);
  eq(favoritos.leerFavoritosGuardados('no es lista'), []);
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.doesNotThrow(() => favoritos.cargarFavoritos(roto, menuDe(ADMIN)));
  assert.doesNotThrow(() => favoritos.guardarFavoritos(roto, [pantalla('a')]));
});

test('cada favorito de la lista trae su estrella estable (la plantilla la compara por referencia)', () => {
  const secciones = menuDe(ADMIN);
  const [uno] = favoritos.resolverFavoritos([pantalla('ventas/pedidos')], secciones);
  eq({ ...uno.estrella.fav }, { kind: 'screen', path: 'ventas/pedidos' });
  assert.equal(uno.estrella.fav, uno.guardado);
});
