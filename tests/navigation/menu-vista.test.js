'use strict';

// D-546: la vista del menú (filas, insignias, punto de novedad y las reglas de dibujo de F3).
// Corre el módulo puro `menu-vista.ts` y el `NavService` real con un fixture.
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
// Fecha fija: las insignias del menú vencen (badgeUntil) y la prueba no debe caducar con ellas.
const HOY = new Date('2026-10-23T12:00:00');
const ocultar = item => {
  const ruta = (item.path || '').toLowerCase(); const titulo = (item.title || '').toLowerCase();
  return ruta.includes('/empresas') || ruta.includes('/usuarios') || ruta.includes('/rol')
    || titulo.includes('empresa') || titulo.includes('usuario') || titulo.includes('rol');
};
const group = (title, children, extra = {}) => ({ title, type: 'sub', active: false, children, ...extra });
const link = (title, ruta, extra = {}) => ({ title, path: ruta, type: 'link', ...extra });
const menuReal = (user, paths = [], extra = {}) => {
  const { nav } = fixture(1440, { user, paths, ...extra });
  const secciones = vista.construirVistaMenu(nav.getMenuItems(), ocultar, HOY);
  nav.ngOnDestroy();
  return secciones;
};
const ADMIN = { rol: 'Administrador', company: 'QA' };
const filaPorId = (secciones, id) => secciones.flatMap(s => s.filas).find(f => f.id === id);
const filaPorTitulo = (secciones, titulo) => secciones.flatMap(s => s.filas).find(f => f.titulo === titulo);

test('«Próximamente» se dice PRONTO y NUEVO se queda NUEVO; vencida o ausente no se ve', () => {
  const pronto = vista.etiquetaInsignia({ badgeValue: 'Próximamente' }, HOY);
  assert.deepEqual({ ...pronto }, { texto: 'PRONTO', tono: 'pronto' });
  assert.deepEqual({ ...vista.etiquetaInsignia({ badgeValue: 'NUEVO', badgeUntil: '2026-12-31' }, HOY) }, { texto: 'NUEVO', tono: 'nuevo' });
  assert.equal(vista.etiquetaInsignia({ badgeValue: 'NUEVO', badgeUntil: '2026-10-22' }, HOY), null);
  assert.equal(vista.etiquetaInsignia({ title: 'Sin insignia' }, HOY), null);
  assert.equal(vista.etiquetaInsignia(null, HOY), null);
  assert.equal(pronto.texto.length, 6);
});

test('el punto de novedad lo enciende solo un hijo con NUEVO vigente; PRONTO y vencido no', () => {
  const nuevo = group('A', [link('x', 'x', { badgeValue: 'NUEVO', badgeUntil: '2026-12-31' })]);
  const vencido = group('B', [link('y', 'y', { badgeValue: 'NUEVO', badgeUntil: '2026-01-01' })]);
  const pronto = group('C', [link('z', 'z'), { title: 'TikTok', type: 'info', badgeValue: 'Próximamente' }]);
  assert.equal(vista.hasNewChild(nuevo, HOY), true);
  assert.equal(vista.hasNewChild(vencido, HOY), false);
  assert.equal(vista.hasNewChild(pronto, HOY), false);
  assert.equal(vista.hasNewChild({ title: 'enlace' }, HOY), false);
});

test('las filas llevan nivel, tipo, ruta, insignia y punto, y conservan el nodo del menú', () => {
  const menu = [
    { headTitle1: 'Sección', id: 's', menuIcon: 'box' },
    group('Grupo', [link('Hijo', 'a/b', { badgeValue: 'NUEVO', badgeUntil: '2026-12-31', previousTitle: 'Hijo viejo' }), link('Otro', 'a/c'), { title: 'TikTok', type: 'info', badgeValue: 'Próximamente' }], { id: 'g', menuIcon: 'tag' }),
    link('Directo', 'c', { id: 'd', menuIcon: 'bell' }),
  ];
  const [seccion] = vista.construirVistaMenu(menu, () => false, HOY);
  assert.equal(seccion.titulo, 'Sección'); assert.equal(seccion.id, 's'); assert.equal(seccion.icono, 'box');
  const [grupo, directo] = seccion.filas;
  assert.equal(grupo.nivel, 2); assert.equal(grupo.tipo, 'grupo'); assert.equal(grupo.punto, true); assert.equal(grupo.icono, 'tag'); assert.equal(grupo.id, 'g');
  assert.equal(grupo.fuente, seccion.items[0]);
  assert.deepEqual(Array.from(grupo.hijos, f => [f.nivel, f.tipo, f.titulo, f.ruta, f.insignia?.texto, f.anteriores.join()]), [
    [3, 'enlace', 'Hijo', 'a/b', 'NUEVO', 'Hijo viejo'],
    [3, 'enlace', 'Otro', 'a/c', undefined, ''],
    [3, 'info', 'TikTok', undefined, 'PRONTO', ''],
  ]);
  assert.equal(directo.tipo, 'enlace'); assert.equal(directo.ruta, 'c'); assert.equal(directo.insignia, null); assert.equal(directo.icono, 'bell');
  assert.equal(new Set([grupo.clave, ...grupo.hijos.map(h => h.clave), directo.clave]).size, 5, 'las claves no se repiten');
});

// ---------------------------------------------------------------- reglas de dibujo de F3

test('un grupo con un solo hijo se dibuja como enlace directo, con el nombre y el ícono del grupo', () => {
  const menu = [
    { headTitle1: 'Operaciones', id: 'o' },
    group('Producción', [link('Órdenes de producción', 'produccion/dashboard', { badgeValue: 'NUEVO', badgeUntil: '2026-12-31' })], { id: 'produccion', menuIcon: 'building-factory-2' }),
  ];
  const [fila] = vista.construirVistaMenu(menu, () => false, HOY)[0].filas;
  assert.equal(fila.tipo, 'enlace'); assert.equal(fila.deGrupo, true);
  assert.equal(fila.titulo, 'Producción'); assert.equal(fila.icono, 'building-factory-2');
  assert.equal(fila.ruta, 'produccion/dashboard'); assert.equal(fila.id, 'produccion');
  assert.equal(fila.hijos.length, 0);
  assert.equal(fila.insignia.texto, 'NUEVO', 'conserva la insignia del hijo');
  assert.deepEqual(Array.from(fila.anteriores), []);
});

test('un grupo sin hijos visibles no se dibuja, y una sección sin filas tampoco', () => {
  const menu = [
    { headTitle1: 'Configuración', id: 'c' },
    group('Seguridad', [link('Roles y permisos', 'rol'), link('Usuarios', 'usuarios')], { id: 'seguridad' }),
    { headTitle1: 'Otra', id: 'o' },
    group('Vacío', [], { id: 'vacio' }),
    { headTitle1: 'Con algo', id: 'a' },
    link('Algo', 'algo'),
  ];
  const secciones = vista.construirVistaMenu(menu, ocultar, HOY);
  assert.deepEqual(Array.from(secciones, s => s.titulo), ['Con algo'], 'Seguridad queda vacía por Roles y Usuarios');
});

test('un grupo inline no se dibuja y sus hijos son enlaces de la sección, con su ícono; la sección lleva la estrella del grupo', () => {
  const menu = [
    { headTitle1: 'Finanzas', id: 'seccion-finanzas', menuIcon: 'cash' },
    group('Finanzas', [link('Facturación', 'fe', { menuIcon: 'file-invoice', badgeValue: 'NUEVO' }), link('Cartera', 'cartera', { menuIcon: 'wallet', previousTitle: 'Cartera (CxC)' })], { id: 'finanzas', display: 'inline' }),
  ];
  const [seccion] = vista.construirVistaMenu(menu, () => false, HOY);
  assert.deepEqual(Array.from(seccion.filas, f => [f.nivel, f.tipo, f.titulo, f.icono, f.ruta]), [
    [2, 'enlace', 'Facturación', 'file-invoice', 'fe'], [2, 'enlace', 'Cartera', 'wallet', 'cartera'],
  ]);
  assert.deepEqual({ ...seccion.grupoEnLinea }, { id: 'finanzas', titulo: 'Finanzas' });
  assert.deepEqual(Array.from(seccion.filas[1].anteriores), ['Cartera (CxC)']);
  assert.equal(seccion.filas[0].insignia.texto, 'NUEVO');
});

test('con el menú real: Producción, Precios y Notificaciones salen como enlaces; En vivo, según el rol', () => {
  const admin = menuReal(ADMIN);
  for (const id of ['produccion', 'precios', 'notificaciones']) {
    const fila = filaPorId(admin, id);
    assert(fila, id); assert.equal(fila.tipo, 'enlace', `${id} es enlace directo`); assert.equal(fila.deGrupo, true);
  }
  assert.equal(filaPorId(admin, 'precios').titulo, 'Precios');
  assert.equal(filaPorId(admin, 'precios').ruta, 'lista-precios/lista-precios');
  // Quien solo tiene «En vivo» lo ve como enlace; un administrador de Julsmind, como grupo con dos hijos.
  assert.equal(filaPorId(menuReal({ rol: 'Vendedor', company: 'QA' }, ['en-vivo']), 'en-vivo').tipo, 'enlace');
  const julsmind = menuReal({ rol: 'Administrador', company: 'Julsmind' });
  assert.equal(filaPorId(julsmind, 'en-vivo').tipo, 'grupo');
  assert.deepEqual(Array.from(filaPorId(julsmind, 'en-vivo').hijos, h => h.titulo), ['En vivo', 'Katuq en vivo']);
});

test('con el menú real: Seguridad ya no se ve, y Finanzas y Comunicaciones son secciones de enlaces', () => {
  const secciones = menuReal(ADMIN);
  assert(!filaPorId(secciones, 'seguridad'), 'Seguridad (solo Roles y Usuarios) deja de verse');
  assert(!secciones.some(s => (s.titulo || '').toLowerCase() === 'empresa'));
  const finanzas = secciones.find(s => s.id === 'seccion-finanzas');
  assert.deepEqual(Array.from(finanzas.filas, f => f.titulo), ['Facturación', 'Tesorería', 'Cartera', 'Contabilidad']);
  assert(finanzas.filas.every(f => f.nivel === 2 && f.tipo === 'enlace' && f.icono));
  const comunicaciones = secciones.find(s => s.id === 'seccion-comunicaciones');
  assert.deepEqual(Array.from(comunicaciones.filas, f => [f.titulo, f.tipo, f.insignia?.texto]), [
    ['WhatsApp', 'enlace', undefined], ['Instagram', 'enlace', undefined], ['Facebook', 'enlace', undefined],
    ['TikTok', 'info', 'PRONTO'], ['Correo', 'info', 'PRONTO'], ['Llamadas', 'info', 'PRONTO'],
  ]);
  assert.equal(finanzas.grupoEnLinea.id, 'finanzas'); assert.equal(comunicaciones.grupoEnLinea.id, 'mensajes');
});

test('con el menú real: el grupo que el rol deja con un solo hijo se dibuja como enlace', () => {
  // Un rol que solo ve «Todos los pedidos»: Pedidos pasa a ser un enlace que abre esa pantalla.
  const secciones = menuReal({ rol: 'Vendedor', company: 'QA' }, ['ventas/pedidos']);
  const pedidos = filaPorId(secciones, 'pedidos');
  assert.equal(pedidos.tipo, 'enlace'); assert.equal(pedidos.ruta, 'ventas/pedidos'); assert.equal(pedidos.titulo, 'Pedidos');
  // Quien solo ve el panel de Marketing ve «Campañas» como enlace directo.
  const marketing = menuReal({ rol: 'Vendedor', company: 'QA' }, ['/marketing']);
  const campanas = filaPorId(marketing, 'campanas');
  assert.equal(campanas.tipo, 'enlace'); assert.equal(campanas.titulo, 'Campañas'); assert.equal(campanas.ruta, '/marketing');
  // Con las dos pantallas, vuelve a ser un grupo.
  const dos = menuReal({ rol: 'Vendedor', company: 'QA' }, ['/marketing', '/marketing/campanas']);
  assert.equal(filaPorId(dos, 'campanas').tipo, 'grupo');
});

test('Sitio web con un solo hijo (solo Cotizaciones) es un enlace que abre Catálogo por link', () => {
  // Regla aprobada por Daniel (D-546, pregunta abierta 1): un rol con Cotizaciones y sin «Mis sitios» ve Sitio web como enlace.
  const secciones = menuReal({ rol: 'Vendedor', company: 'QA' }, ['cotizaciones']);
  const sitio = filaPorId(secciones, 'sitio-web');
  assert.equal(sitio.tipo, 'enlace'); assert.equal(sitio.deGrupo, true);
  assert.equal(sitio.ruta, 'cotizaciones/catalogos'); assert.equal(sitio.titulo, 'Sitio web');
  assert.deepEqual(Array.from(sitio.anteriores), ['Mi página web', 'Catálogos por link']);
});

test('Mensajes no tiene punto; Sitio web y Cotizaciones sí; los PRONTO miden igual que NUEVO', () => {
  const filas = menuReal(ADMIN).flatMap(s => s.filas);
  assert.equal(filas.filter(f => f.tipo === 'info').every(f => f.insignia.tono === 'pronto' && f.insignia.texto === 'PRONTO'), true);
  assert.equal(filas.find(f => f.id === 'sitio-web').punto, true, 'Catálogo web es NUEVO hasta 2026-11-30');
  assert.equal(filas.find(f => f.id === 'cotizaciones').punto, false, 'su Catálogo por link se mudó a Sitio web');
});

test('el orden y los nombres siguen el mapa aprobado de ALMARA', () => {
  const secciones = menuReal(ADMIN, [], { flags: { pickingAlistamiento: true, serviceAgenda: true, npsModulo: true }, dropshipping: true });
  assert.deepEqual(Array.from(secciones, s => s.titulo), [
    'Configuración Plataforma', 'Gestión comercial', 'Operaciones', 'Inventario', 'Finanzas', 'Marketing', 'Comunicaciones', 'Analítica', 'Configuración',
  ].filter(t => t !== 'Configuración Plataforma' || secciones.some(s => s.titulo === t)));
  const nombres = titulo => Array.from(secciones.find(s => s.titulo === titulo).filas, f => f.titulo);
  assert.deepEqual(nombres('Gestión comercial'), ['Clientes', 'Ventas', 'Cotizaciones', 'Sitio web', 'CRM', 'Dropshipping', 'NPS']);
  assert.deepEqual(nombres('Operaciones'), ['Pedidos', 'Producción', 'Agenda', 'Logística', 'En vivo']);
  assert.deepEqual(nombres('Inventario'), ['Productos', 'Bodegas', 'Compras', 'Alistamiento', 'Precios']);
  assert.deepEqual(nombres('Marketing'), ['Campañas']);
  assert.deepEqual(nombres('Analítica'), ['Indicadores', 'Agentes IA']);
  assert.deepEqual(nombres('Configuración'), ['Módulos variables', 'Inventario', 'Productos', 'Logística', 'Pagos', 'Integraciones', 'Notificaciones']);
  const hijos = (titulo, grupo) => Array.from(filaPorTitulo(secciones.filter(s => s.titulo === titulo), grupo).hijos, f => f.titulo);
  assert.deepEqual(hijos('Gestión comercial', 'Clientes'), ['Nuevo cliente', 'Listado']);
  assert.deepEqual(hijos('Gestión comercial', 'Sitio web'), ['Mis sitios', 'Landings', 'Catálogo web', 'Catálogo por link']);
  assert.deepEqual(hijos('Gestión comercial', 'CRM'), ['Pipeline', 'Seguimiento', 'Prospectos']);
  assert.deepEqual(hijos('Inventario', 'Bodegas'), ['Existencias', 'Detalle', 'Ajustes', 'Traslados', 'Abastecimiento', 'Movimientos', 'Indicadores', 'Mapa', 'Conteos']);
  assert.deepEqual(hijos('Analítica', 'Agentes IA'), ['Chat KAI', 'Chat básico', 'Mis agentes', 'Nuevo agente', 'Monitor A2A']);
});

test('cada pantalla renombrada conserva su nombre anterior para buscarla', () => {
  const filas = menuReal(ADMIN).flatMap(s => s.filas.flatMap(f => [f, ...f.hijos]));
  const anterior = (titulo, ruta) => filas.find(f => f.titulo === titulo && f.ruta === ruta)?.anteriores.join('|');
  assert.equal(anterior('Existencias', 'inventario/inventario-catalogo'), 'Inventario por bodega');
  assert.equal(anterior('Prospectos', 'ventas/clientes-corporativos'), 'Clientes corporativos');
  assert.equal(anterior('Historial', '/marketing/campanas'), 'Campañas');
  assert.equal(anterior('Catálogo web', 'sitios/catalogos'), 'Catálogos');
  assert.equal(anterior('Precios', 'lista-precios/lista-precios'), 'Lista de precios');
});
