'use strict';

// D-546 (F3, tarea 8.8): reglas para entradas nuevas del menú (spec `sidebar-structure`, «Reglas para módulos
// nuevos»). `infracciones(menu)` las revisa y devuelve lo que se rompe; un menú nuevo con una entrada que las
// rompe hace fallar la prueba. Una excepción se registra como decisión en specs/CONTRACT.md y se agrega aquí
// a su lista, con su razón.
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
const HOY = new Date('2026-10-23T12:00:00');

// Los grupos que se ocultan a propósito del menú (viven en la Configuración de empresa): Roles, Usuarios y Empresa.
const OCULTOS_A_PROPOSITO = new Set(['seguridad', 'empresa']);
const ocultar = item => {
  const ruta = (item.path || '').toLowerCase(); const titulo = (item.title || '').toLowerCase();
  return ruta.includes('/empresas') || ruta.includes('/usuarios') || ruta.includes('/rol')
    || titulo.includes('empresa') || titulo.includes('usuario') || titulo.includes('rol');
};

// Nombres de más de 14 caracteres o de más de 2 palabras que ya estaban en el mapa aprobado de ALMARA o que
// salen de él (spec `sidebar-structure`). Una entrada nueva no entra a esta lista sin una decisión registrada.
const NOMBRES_LARGOS_APROBADOS = new Set([
  'Gestión General', 'Campañas de registro', 'Catálogo por link', 'Órdenes de producción', 'Centro operativo', 'Katuq en vivo',
  'Lista de precios', 'Panel gerencial', 'Módulos variables', 'Bodegas por canal', 'Tipos de cliente', 'Formas de entrega',
  'Tipos de entrega', 'Tiempos de entrega', 'Zonas de cobro', 'Automatizaciones',
]);
// «Configuración Plataforma» no cambia (spec): su grupo conserva la mayúscula de siempre.
const MAYUSCULAS_DE_ANTES = new Set(['Gestión General']);
// NUEVO sin fecha de vencimiento desde antes de F3: la spec pide conservar «las fechas de vencimiento que tienen hoy».
const NUEVO_SIN_FECHA_DE_ANTES = new Set(['facturacion-electronica', 'cartera', 'contabilidad']);
// Un hijo que repite el nombre de su padre solo donde la spec lo fija: En vivo (grupo de Julsmind) y Notificaciones (enlace).
const HIJO_IGUAL_AL_PADRE = new Set(['en-vivo', 'notificaciones']);

/** Las reglas de la spec sobre el menú completo (sin filtrar por rol). Devuelve las infracciones. */
function infracciones(menu) {
  const faltas = [];
  const entradas = menu.filter(i => !i.headTitle2);
  const grupos = menu.filter(i => !i.headTitle1 && i.children);

  // Máximo 3 niveles.
  for (const grupo of grupos) for (const hijo of grupo.children) if (hijo.children) faltas.push(`«${hijo.title}» tiene nietos (4.º nivel)`);

  // Cada sección, grupo y enlace directo: id estable y único.
  const ids = entradas.map(i => i.id);
  entradas.filter(i => !i.id).forEach(i => faltas.push(`«${i.headTitle1 || i.title}» no tiene id`));
  ids.filter((id, n) => id && ids.indexOf(id) !== n).forEach(id => faltas.push(`id repetido: ${id}`));

  const visibles = grupos.filter(g => !OCULTOS_A_PROPOSITO.has(g.id));
  for (const grupo of visibles) {
    for (const hijo of grupo.children) {
      if (hijo.title === grupo.title && !HIJO_IGUAL_AL_PADRE.has(grupo.id)) faltas.push(`«${hijo.title}» repite el nombre de su grupo`);
    }
  }
  const nombres = [
    ...menu.filter(i => !i.headTitle1 && i.title && !OCULTOS_A_PROPOSITO.has(i.id)),
    ...visibles.flatMap(g => g.children),
  ];
  for (const { title } of nombres) {
    if (!NOMBRES_LARGOS_APROBADOS.has(title) && (title.split(/\s+/).length > 2 || title.length > 14)) faltas.push(`«${title}» pasa de 2 palabras o de unos 14 caracteres`);
    if (!MAYUSCULAS_DE_ANTES.has(title) && title.split(/\s+/).slice(1).some(p => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(p))) faltas.push(`«${title}» lleva mayúscula fuera del inicio`);
    if (/^Crear\b/i.test(title)) faltas.push(`«${title}»: crear empieza con «Nuevo» o «Nueva»`);
    if (/rol|usuario|empresa/i.test(title)) faltas.push(`«${title}» se escondería solo (shouldHide)`);
  }
  // La insignia NUEVO lleva fecha de vencimiento.
  for (const entrada of menu.flatMap(i => [i, ...(i.children || [])])) {
    if (String(entrada.badgeValue || '').toUpperCase() !== 'NUEVO') continue;
    if (NUEVO_SIN_FECHA_DE_ANTES.has(entrada.path || entrada.id)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entrada.badgeUntil || ''))) faltas.push(`«${entrada.title}» es NUEVO sin badgeUntil`);
  }
  return faltas;
}

const COMPLETO = { user: { rol: 'Super Administrador', company: 'Julsmind' }, flags: { pickingAlistamiento: true, serviceAgenda: true, npsModulo: true }, dropshipping: true };
function menuDe(opciones = COMPLETO) {
  const { nav } = fixture(1440, opciones);
  const resultado = { todo: nav.ALLMENUITEMS, filtrado: nav.getMenuItems() };
  nav.ngOnDestroy();
  return resultado;
}

test('el menú actual cumple las reglas', () => {
  assert.deepEqual(infracciones(menuDe().todo), []);
});

test('las reglas fallan con una entrada de prueba que las rompe', () => {
  const malo = [
    ...menuDe().todo,
    { id: 'x', title: 'Dashboard de Control Interno', type: 'sub', children: [
      { title: 'Crear cosa', path: 'x', type: 'link', badgeValue: 'NUEVO', children: [{ title: 'nieto' }] },
      { title: 'Dashboard de Control Interno', path: 'y', type: 'link' },
    ] },
    { id: 'x', title: 'Otro Grupo', type: 'sub', children: [{ title: 'a', path: 'a', type: 'link' }, { title: 'b', path: 'b', type: 'link' }] },
    { title: 'Sin id', path: 'z', type: 'link' },
  ];
  const faltas = infracciones(malo);
  for (const esperada of [
    'tiene nietos', 'id repetido: x', 'no tiene id', 'repite el nombre de su grupo', 'pasa de 2 palabras', 'lleva mayúscula fuera del inicio',
    'crear empieza con «Nuevo»', 'se escondería solo', 'es NUEVO sin badgeUntil',
  ]) {
    assert(faltas.some(f => f.includes(esperada)), `no se detectó «${esperada}»; detectó: ${faltas.join(' | ')}`);
  }
});

test('ningún grupo se dibuja con un solo hijo, para ningún rol (el grupo de un hijo es un enlace directo)', () => {
  const roles = [
    COMPLETO,
    { user: { rol: 'Vendedor', company: 'QA' }, paths: ['ventas/pedidos', '/marketing', 'sitios', 'cotizaciones', 'lista-precios/lista-precios'] },
    { user: { rol: 'Vendedor', company: 'QA' }, paths: ['*'] },
    { user: { rol: 'Administrador', company: 'QA' } },
  ];
  for (const rol of roles) {
    const secciones = vista.construirVistaMenu(menuDe(rol).filtrado, ocultar, HOY);
    for (const fila of secciones.flatMap(s => s.filas)) {
      if (fila.tipo === 'grupo') assert(fila.hijos.length >= 2, `«${fila.titulo}» se dibuja como grupo con ${fila.hijos.length} hijo`);
    }
  }
});

test('ninguna ruta cambió: solo se suma Landings', () => {
  const { todo } = menuDe();
  const rutas = new Set(todo.flatMap(i => [i.path, ...(i.children || []).map(c => c.path)]).filter(Boolean));
  const antes = require('./fixtures/menu-rutas-antes-f3.json').rutas;
  assert.deepEqual(antes.filter(r => !rutas.has(r)), [], 'ninguna ruta de antes de F3 desapareció');
  assert.deepEqual([...rutas].filter(r => !antes.includes(r)), ['sitios/landings'], 'la única ruta nueva es Landings');
});
