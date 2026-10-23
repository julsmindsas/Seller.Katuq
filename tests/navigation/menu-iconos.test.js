'use strict';

// D-546 (F2): cada sección y cada grupo o enlace directo declara su ícono Tabler, único en el menú,
// y todos existen en el registro generado (src/app/shared/icons/tabler-iconos.ts).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
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
const { TABLER_ICONOS, TABLER_VERSION } = pureModule('src/app/shared/icons/tabler-iconos.ts');

/**
 * Secciones, grupos, enlaces directos y los hijos de grupos `inline` (que se dibujan como enlaces de la sección),
 * del menú completo sin filtrar por rol. Los grupos `inline` no se dibujan: no llevan ícono propio.
 */
function entradas() {
  const { nav } = fixture(1440, { user: { rol: 'Administrador', company: 'QA' } });
  const lista = [];
  for (const item of nav.ALLMENUITEMS) {
    if (item.headTitle1) {
      if (item.headTitle2) continue; // el pie «Katuq © Julsmind» no es una sección con entradas
      lista.push({ tipo: 'sección', nombre: item.headTitle1, icono: item.menuIcon });
    } else if (item.display === 'inline') {
      for (const hijo of item.children) lista.push({ tipo: 'enlace de sección', nombre: hijo.title, icono: hijo.menuIcon });
      lista.push(...canalesPronto(item));
    } else {
      lista.push({ tipo: item.children ? 'grupo' : 'enlace directo', nombre: item.title, icono: item.menuIcon });
    }
  }
  nav.ngOnDestroy();
  return lista;
}

/** Los canales «pronto» que NavService agrega al grupo `mensajes` (no están en MENUITEMS). */
function canalesPronto(grupo) {
  if (grupo.id !== 'mensajes') return [];
  const { FUTURE_MESSAGE_CHANNELS } = pureModule('src/app/shared/data/future-message-channels.ts');
  return FUTURE_MESSAGE_CHANNELS.map(c => ({ tipo: 'canal pronto', nombre: c.title, icono: c.menuIcon }));
}

test('cada sección, grupo y enlace directo declara su ícono; ninguno se repite', () => {
  const lista = entradas();
  assert(lista.length > 30);
  const sinIcono = lista.filter(e => !e.icono);
  assert.deepEqual(sinIcono, [], `sin menuIcon: ${sinIcono.map(e => e.nombre)}`);
  const vistos = new Map();
  for (const e of lista) {
    assert(!vistos.has(e.icono), `«${e.icono}» lo usan «${vistos.get(e.icono)}» y «${e.nombre}»`);
    vistos.set(e.icono, e.nombre);
  }
});

test('todos los íconos del menú y de la plantilla existen en el registro de Tabler', () => {
  const faltan = entradas().filter(e => !TABLER_ICONOS[e.icono]).map(e => `${e.nombre}: ${e.icono}`);
  assert.deepEqual(faltan, []);
  const html = fs.readFileSync(path.join(root, 'src/app/shared/components/sidebar/sidebar.component.html'), 'utf8');
  // Los nombres literales de cada <app-icono-tabler ... nombre="x"> o [nombre]="cond ? 'a' : 'b'".
  const enPlantilla = [];
  for (const etiqueta of html.matchAll(/<app-icono-tabler\b[^>]*>/g)) {
    const literal = etiqueta[0].match(/\snombre="([^"]+)"/);
    if (literal) enPlantilla.push(literal[1]);
    const expresion = etiqueta[0].match(/\[nombre\]="([^"]+)"/);
    if (expresion) enPlantilla.push(...[...expresion[1].matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]));
  }
  assert(enPlantilla.includes('layout-sidebar-left-expand') && enPlantilla.includes('chevron-down') && enPlantilla.includes('star'));
  assert.deepEqual([...new Set(enPlantilla)].filter(n => !TABLER_ICONOS[n]), []);
  assert.equal(TABLER_VERSION, '3.49.0');
});

test('cada trazo del registro es una ruta SVG y los íconos usados coinciden con tabler-usados.json', () => {
  const usados = JSON.parse(fs.readFileSync(path.join(root, 'src/app/shared/icons/tabler-usados.json'), 'utf8'));
  assert.deepEqual(Object.keys(TABLER_ICONOS).sort(), [...usados].sort());
  for (const [nombre, trazos] of Object.entries(TABLER_ICONOS)) {
    assert(trazos.length > 0, nombre);
    for (const d of trazos) assert.match(d, /^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-eE]+$/, `${nombre}: ${d}`);
  }
});

test('el componente de íconos no usa innerHTML y un nombre desconocido no tiene trazos', () => {
  const fuente = fs.readFileSync(path.join(root, 'src/app/shared/icons/icono-tabler.component.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/innerHTML|bypassSecurityTrust/.test(fuente));
  assert.match(fuente, /standalone: true/);
  assert.match(fuente, /ChangeDetectionStrategy\.OnPush/);
  assert.equal(TABLER_ICONOS['no-existe'], undefined);
  assert.match(fuente, /return TABLER_ICONOS\[this\.nombre\] \|\| \[\];/);
});

// ----- El script que genera el registro -----
const script = path.join(root, 'scripts/generar-iconos-tabler.js');
function correrScript({ lista, svgs, version = '9.9.9', licencia = 'MIT', extra = [], dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabler-')) }) {
  const paquete = path.join(dir, 'pkg');
  fs.mkdirSync(path.join(paquete, 'icons/outline'), { recursive: true });
  fs.writeFileSync(path.join(paquete, 'package.json'), JSON.stringify({ version, license: licencia }));
  for (const [nombre, cuerpo] of Object.entries(svgs)) {
    fs.writeFileSync(path.join(paquete, 'icons/outline', `${nombre}.svg`), `<svg viewBox="0 0 24 24">${cuerpo}</svg>`);
  }
  fs.writeFileSync(path.join(dir, 'usados.json'), JSON.stringify(lista));
  const resultado = spawnSync(process.execPath, [script, ...extra], {
    env: { ...process.env, TABLER_ICONS_DIR: paquete, TABLER_USADOS: path.join(dir, 'usados.json'), TABLER_SALIDA: path.join(dir, 'salida.ts') },
    encoding: 'utf8',
  });
  const salida = path.join(dir, 'salida.ts');
  return { ...resultado, texto: fs.existsSync(salida) ? fs.readFileSync(salida, 'utf8') : null };
}
const CAJA = '<path stroke="none" d="M0 0h24v24H0z" fill="none" />';

test('el script genera el registro, sin el recuadro vacío y con la versión y la licencia en la cabecera', () => {
  const r = correrScript({ lista: ['uno'], svgs: { uno: `${CAJA}<path d="M1 1l2 2" /><path d="M3 3h4" />` } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.texto, /@tabler\/icons 9\.9\.9 \(licencia MIT/);
  assert.match(r.texto, /'uno': \[\n    'M1 1l2 2',\n    'M3 3h4',\n  \],/);
  assert(!r.texto.includes('M0 0h24v24H0z'));
});

test('el script falla con un nombre que no existe', () => {
  const r = correrScript({ lista: ['uno', 'fantasma'], svgs: { uno: `${CAJA}<path d="M1 1" />` } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /«fantasma» no existe/);
});

test('el script falla con un SVG que trae algo distinto de <path>', () => {
  const r = correrScript({ lista: ['redondo'], svgs: { redondo: `${CAJA}<circle cx="12" cy="12" r="9" />` } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /distintas de <path>: circle/);
});

test('el script falla con otra licencia y con la lista repetida o mal escrita', () => {
  assert.notEqual(correrScript({ lista: ['uno'], svgs: { uno: `${CAJA}<path d="M1 1" />` }, licencia: 'GPL' }).status, 0);
  assert.notEqual(correrScript({ lista: ['uno', 'uno'], svgs: { uno: `${CAJA}<path d="M1 1" />` } }).status, 0);
  assert.notEqual(correrScript({ lista: ['Uno'], svgs: { uno: `${CAJA}<path d="M1 1" />` } }).status, 0);
});

test('--check falla si el archivo generado no coincide y pasa si coincide', () => {
  const lista = ['uno'];
  const svgs = { uno: `${CAJA}<path d="M1 1l2 2" />` };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabler-'));
  // Sin archivo previo: no coincide.
  assert.notEqual(correrScript({ lista, svgs, extra: ['--check'], dir }).status, 0);
  // Generado: coincide, y generar dos veces no cambia nada.
  const primera = correrScript({ lista, svgs, dir });
  assert.equal(primera.status, 0, primera.stderr);
  assert.equal(correrScript({ lista, svgs, extra: ['--check'], dir }).status, 0);
  assert.equal(correrScript({ lista, svgs, dir }).texto, primera.texto);
  // Un cambio en el ícono del paquete hace que ya no coincida.
  assert.notEqual(correrScript({ lista, svgs: { uno: `${CAJA}<path d="M9 9" />` }, extra: ['--check'], dir }).status, 0);
});

test('tabler-iconos.ts del repositorio está al día con la lista (se corre con TABLER_ICONS_DIR si el paquete no está instalado)', { skip: !process.env.TABLER_ICONS_DIR && !fs.existsSync(path.join(root, 'node_modules/@tabler/icons/package.json')) && 'sin @tabler/icons para regenerar' }, () => {
  const r = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
