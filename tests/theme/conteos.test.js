'use strict';

// D-502 (ticket 1180): conteos de diseño en los archivos que toca el modo oscuro.
// 1) Gradientes y primarios prohibidos (AGENTS.md) no suben frente a la línea base del 2026-10-18.
// 2) En dark-mode.scss no queda la familia del azul heredado (169 apariciones): pasa en F1 (tarea 3.4).
// 3) Tareas 3.3 y 3.4 (bloque TEMA-B03): las variables y los azules de dark-mode.scss apuntan a los
//    tokens --ds-* por rol, todo queda bajo body.dark-only (el claro no cambia) y los rellenos ganan
//    a los !important globales.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { RAIZ } = require('./cargar-ts');

const GRADIENTE = /(linear|radial)-gradient\(/gi;
const PRIMARIOS = /#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(\s*102\s*,\s*126\s*,\s*234/gi;
const AZULES = ['#6AB5E8', 'rgba(106, 181, 232', 'rgb(106, 181, 232', '#5AA5D8', '#8AC5F8', '#4A95C8'];

// Línea base del 2026-10-18 (gradientes / primarios), design-pruebas.md.
const LINEA_BASE = {
  'src/assets/scss/dark-mode.scss': [1, 0],
  'src/styles.scss': [2, 10],
  'src/app/shared/components/sidebar/sidebar.component.scss': [2, 0],
  'src/app/shared/components/filters/shared-filters.component.scss': [0, 3],
  'src/app/components/despachos/components/enviame/tracking-details/tracking-details-modal.component.scss': [5, 0],
  'src/app/components/extras/pos/formas-pago/crear-formas-pago/crear-formas-pago.component.scss': [0, 1],
  'src/app/modules/agent-builder/general-chat/general-chat.component.scss': [1, 0],
  // los demás, 0 / 0
  'src/app/shared/components/bottom-navigation/bottom-navigation.component.scss': [0, 0],
  'src/app/shared/components/header/header.component.scss': [0, 0],
  'src/app/components/chat/chat/chat.component.scss': [0, 0],
  'src/app/shared/styles/_theme-tokens.scss': [0, 0], // F1: todavía puede no existir
};

function leer(rel) {
  const archivo = path.resolve(RAIZ, rel);
  return fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : null;
}

function contar(texto, patron) {
  return (texto.match(patron) || []).length;
}

test('gradientes y primarios prohibidos no suben en los archivos del modo oscuro', () => {
  for (const [rel, [gradientes, primarios]] of Object.entries(LINEA_BASE)) {
    const texto = leer(rel);
    if (texto === null) continue;
    assert.ok(contar(texto, GRADIENTE) <= gradientes, `${rel}: gradientes ${contar(texto, GRADIENTE)} > ${gradientes}`);
    assert.ok(contar(texto, PRIMARIOS) <= primarios, `${rel}: primarios prohibidos ${contar(texto, PRIMARIOS)} > ${primarios}`);
  }
});

test('la familia del azul heredado está contada completa (169) o ya en cero', () => {
  const texto = leer('src/assets/scss/dark-mode.scss').toLowerCase();
  const total = AZULES.reduce((suma, azul) => suma + texto.split(azul.toLowerCase()).length - 1, 0);
  assert.ok(total === 0 || total <= 169, `la familia del azul subió: ${total} > 169`);
});

// Cerrada en la tarea 3.4 (F1, bloque TEMA-B03).
test('dark-mode.scss sin ninguno de los seis patrones del azul heredado', () => {
  const texto = leer('src/assets/scss/dark-mode.scss').toLowerCase();
  for (const azul of AZULES) {
    assert.equal(texto.split(azul.toLowerCase()).length - 1, 0, `${azul} sigue en dark-mode.scss`);
  }
});

// Tarea 3.9 (bloque TEMA-B02): «deuda medida» de los rellenos con var(--primary-color) en src/.
// En oscuro `--primary-color` es el tinte de texto, así que esos rellenos quedan en 2,72:1 con texto
// blanco hasta que su pantalla pase a var(--ds-accent) (F2 o F3). Techo medido el 2026-10-21 con
// tests/theme/deuda-primary.js: 42 rellenos (33 background y 9 background-color) en 16 archivos.
// Trinquete: si sube, falla; si baja, también falla hasta que se baje el techo en el mismo commit, así
// lo migrado no deja hueco para regresiones posteriores.
const { contarEnTexto, medirDeuda } = require('./deuda-primary');
const TECHO_DEUDA_PRIMARY = 42;

test('deuda-primary cuenta background y background-color con var(--primary-color), con respaldo y sin comentarios', () => {
  const hoja = [
    '.a { background: var(--primary-color); color: var(--primary-color); }',
    '.b { background-color: var(--primary-color) !important; }',
    '.c { background: linear-gradient(135deg, var(--primary-color, #7366ff), #fff); }',
    '.d { background:',
    '  var( --primary-color ); }',
    '.e { background: rgba(var(--primary-color-rgb), .1); background-color: var(--primary-color-dark); }',
    '.f { border-color: var(--primary-color); --x: var(--primary-color); }',
    '// .g { background: var(--primary-color); }',
    '/* .h { background: var(--primary-color); } */',
    '.i { background: url(http://x.test/a.png) var(--primary-color); }',
  ].join('\n');
  assert.deepEqual(contarEnTexto(hoja), { background: 4, backgroundColor: 1, total: 5 });
});

test('la deuda de rellenos con var(--primary-color) no sube y el techo baja con ella (tarea 3.9)', () => {
  const deuda = medirDeuda();
  const detalle = deuda.archivos.map(a => `${a.total} ${a.archivo}`).join('\n');
  assert.ok(deuda.total <= TECHO_DEUDA_PRIMARY, `la deuda subió: ${deuda.total} > ${TECHO_DEUDA_PRIMARY}\n${detalle}`);
  assert.equal(deuda.total, TECHO_DEUDA_PRIMARY,
    `la deuda bajó a ${deuda.total}: baja TECHO_DEUDA_PRIMARY a ${deuda.total} en este mismo commit`);
});

// ─── Tareas 3.3 y 3.4 (bloque TEMA-B03): dark-mode.scss sobre los tokens --ds-* ───────────────────
// Compila dark-mode.scss solo (no importa nada) con el sass del front y revisa el CSS resultante.
const { execFileSync } = require('node:child_process');

const DARK_MODE = 'src/assets/scss/dark-mode.scss';
// Commit anterior a TEMA-B03: referencia fija para «ninguna clase nueva con "p-"».
const COMMIT_ANTES_B03 = 'caa67cdd';

let cacheDark = null;
function reglasDark() {
  if (cacheDark) return cacheDark;
  const sass = require('sass');
  const postcss = require('postcss');
  const css = sass.compile(path.resolve(RAIZ, DARK_MODE)).css;
  const reglas = [];
  postcss.parse(css).walkRules(regla => {
    if (regla.parent && regla.parent.type === 'atrule' && /keyframes$/i.test(regla.parent.name)) return;
    const decls = [];
    regla.each(nodo => { if (nodo.type === 'decl') decls.push({ prop: nodo.prop, value: nodo.value.trim(), important: !!nodo.important }); });
    reglas.push({ selectores: regla.selectors.map(s => s.replace(/\s+/g, ' ').trim()), decls });
  });
  cacheDark = { css, reglas };
  return cacheDark;
}

function decl(regla, prop) {
  return regla.decls.filter(d => d.prop === prop).pop();
}

function reglaPorSelector(selector) {
  return reglasDark().reglas.filter(r => r.selectores.includes(selector));
}

// Especificidad [ids, clases/atributos/pseudoclases, elementos] de un selector simple. :not() con un
// solo argumento simple cuenta como su argumento (1); :where() vale 0 (sin :is anidados).
function especificidad(selector) {
  const s = selector.replace(/:where\([^)]*\)/g, '').replace(/::[\w-]+/g, ' ');
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const clases = (s.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(\([^)]*\))?/g) || []).length;
  const elementos = s.split(/[\s>+~]+/).filter(Boolean)
    .map(parte => parte.replace(/[#.:\[].*$/, '')).filter(e => e && e !== '*').length;
  return [ids, clases, elementos];
}

function gana(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

test('especificidad: utilidad de la prueba', () => {
  assert.deepEqual(especificidad('.btn-primary'), [0, 1, 0]);
  assert.deepEqual(especificidad('body.dark-only .btn.btn-primary:hover'), [0, 4, 1]);
  assert.deepEqual(especificidad('.driver-popover .driver-popover-footer button.driver-popover-next-btn'), [0, 3, 1]);
  assert.deepEqual(especificidad('body.dark-only :where(.btn-primary:disabled, .btn-primary.disabled)'), [0, 1, 1]);
  assert.deepEqual(especificidad('body.dark-only .btn.btn-primary:not(:disabled):not(.disabled)'), [0, 5, 1]);
  assert.ok(gana([0, 3, 1], [0, 1, 0]));
  assert.ok(!gana([0, 1, 0], [0, 1, 0]));
});

test('3.3: las variables de body.dark-only apuntan a los tokens (primario) y el resto no cambia', () => {
  const raiz = reglaPorSelector('body.dark-only').find(r => decl(r, '--primary-color'));
  assert.ok(raiz, 'falta el bloque de variables de body.dark-only');
  const esperado = {
    '--primary-color': 'var(--ds-accent-ink)',
    '--theme-default': 'var(--ds-accent-ink)',
    '--primary-dark-color': 'var(--ds-accent)',
    '--primary-light-color': 'rgba(var(--ds-accent-ink-rgb), 0.15)',
    '--light-shade-primary': 'rgba(var(--ds-accent-ink-rgb), 0.1)',
    '--primary-70': 'rgba(var(--ds-accent-ink-rgb), .7)',
    '--rgb-primary': 'rgb(var(--ds-accent-ink-rgb))',
    // secundario y terciario son del retiro (4.5): siguen igual
    '--secondary-color': '#7A8FE8',
    '--secondary-dark-color': '#5A6FC8',
    '--tertiary-color': '#4AC5E2',
    '--tertiary-dark-color': '#2AA5C2',
    '--theme-secondary': '#4AC5E2',
  };
  for (const [prop, valor] of Object.entries(esperado)) {
    assert.equal(decl(raiz, prop)?.value, valor, `${prop}`);
  }
});

test('todo dark-mode.scss queda bajo body.dark-only: no puede cambiar el claro', () => {
  const fuera = [];
  for (const regla of reglasDark().reglas) {
    for (const sel of regla.selectores) {
      if (!/^body\.dark-only(?![\w-])/.test(sel)) fuera.push(sel);
    }
  }
  assert.deepEqual(fuera, [], `selectores fuera de body.dark-only:\n${fuera.join('\n')}`);
});

test('3.4: cada token --ds-* que usa dark-mode.scss existe en _theme-tokens.scss', () => {
  const tokens = fs.readFileSync(path.resolve(RAIZ, 'src/app/shared/styles/_theme-tokens.scss'), 'utf8');
  const definidos = new Set([...tokens.matchAll(/(--ds-[\w-]+)\s*:/g)].map(m => m[1]));
  const usados = new Set([...reglasDark().css.matchAll(/var\((--ds-[\w-]+)\)/g)].map(m => m[1]));
  assert.ok(usados.size >= 5, `se esperaban varios tokens en uso, hay ${usados.size}`);
  for (const t of usados) assert.ok(definidos.has(t), `${t} no está definido en _theme-tokens.scss`);
});

test('3.4: los 28 rellenos van en var(--ds-accent) y su texto en var(--ds-on-accent), nunca #1a1d23', () => {
  const rellenos = reglasDark().reglas.filter(r => r.decls.some(d =>
    /^background(-color)?$/.test(d.prop) && d.value === 'var(--ds-accent)'));
  const declsRelleno = rellenos.reduce((n, r) => n + r.decls.filter(d =>
    /^background(-color)?$/.test(d.prop) && d.value === 'var(--ds-accent)').length, 0);
  // 28 rellenos de la familia del azul (design-f1.md §2) + los dos botones de driver.js (una regla)
  // + el .btn-primary deshabilitado genérico + el slider del p-inputSwitch encendido (corrector TEMA-B03).
  assert.equal(declsRelleno, 31, `rellenos en var(--ds-accent): ${declsRelleno}`);
  for (const r of rellenos) {
    const color = decl(r, 'color');
    if (color) assert.equal(color.value, 'var(--ds-on-accent)', `${r.selectores[0]}: texto ${color.value} sobre el relleno`);
    const borde = decl(r, 'border-color');
    if (borde) assert.match(borde.value, /^var\(--ds-accent(-ink)?\)$/, `${r.selectores[0]}: borde ${borde.value}`);
  }
  // Los íconos de los controles marcados también van en blanco sobre el relleno.
  const radio = reglaPorSelector('body.dark-only .p-radiobutton .p-radiobutton-box.p-highlight .p-radiobutton-icon')[0];
  assert.equal(decl(radio, 'background')?.value, 'var(--ds-on-accent)');
  for (const sel of [
    'body.dark-only .p-checkbox .p-checkbox-box.p-highlight .p-checkbox-icon',
    'body.dark-only .p-multiselect-panel .p-multiselect-header .p-checkbox .p-checkbox-box.p-highlight .p-checkbox-icon',
    'body.dark-only .p-multiselect-panel .p-multiselect-items .p-multiselect-item .p-checkbox .p-checkbox-box.p-highlight .p-checkbox-icon',
  ]) {
    assert.equal(decl(reglaPorSelector(sel)[0] || { decls: [] }, 'color')?.value, 'var(--ds-on-accent)', sel);
  }
  // El slider de p-inputSwitch cubre todo el control (position: absolute; inset: 0): el relleno
  // visible del interruptor encendido es el suyo, no el del contenedor.
  const slider = reglaPorSelector('body.dark-only .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider')[0];
  assert.equal(decl(slider || { decls: [] }, 'background')?.value, 'var(--ds-accent)', 'slider del p-inputSwitch encendido');
});

test('3.4: hovers en var(--ds-accent-hover), translúcidos sobre --ds-accent-ink-rgb', () => {
  const { css } = reglasDark();
  // 10 hovers #5AA5D8 de la familia del azul + el hover de driver.js
  assert.equal((css.match(/var\(--ds-accent-hover\)/g) || []).length, 11);
  // 47 rgba(106, 181, 232, α) y el rgb() de --rgb-primary
  assert.equal((css.match(/rgba\(var\(--ds-accent-ink-rgb\), [\d.]+\)/g) || []).length, 47);
  assert.equal((css.match(/rgb\(var\(--ds-accent-ink-rgb\)\)/g) || []).length, 1);
});

// El !important de relleno de .btn-primary no cubre el deshabilitado: los grises propios de cada
// pantalla (invoice-composer, _katuq-modal: `.btn-primary[_ngcontent]:disabled`, (0,3,0)) siguen ganando.
const BTN_ACTIVO = 'body.dark-only .btn.btn-primary:not(:disabled):not(.disabled)';
const BTN_DESHABILITADO = 'body.dark-only :where(.btn-primary:disabled, .btn-primary.disabled)';

test('3.4: .btn-primary y .badge.bg-primary ganan a los !important globales de _reset.scss', () => {
  const reset = fs.readFileSync(path.resolve(RAIZ, 'src/assets/scss/base/_reset.scss'), 'utf8');
  assert.match(reset, /\.btn-primary\s*\{\s*background-color:\s*var\(--primary-color\)\s*!important/,
    'cambió _reset.scss: revisar si el !important de dark-mode.scss sigue haciendo falta');
  const casos = [
    [BTN_ACTIVO, 'background-color', 'var(--ds-accent)', '.btn-primary'],
    [BTN_ACTIVO, 'border-color', 'var(--ds-accent)', '.btn-primary'],
    [`${BTN_ACTIVO}:hover`, 'background-color', 'var(--ds-accent-hover)', '.btn-primary'],
    [`${BTN_ACTIVO}:hover`, 'border-color', 'var(--ds-accent-hover)', '.btn-primary'],
    [BTN_DESHABILITADO, 'background-color', 'var(--ds-accent)', '.btn-primary'],
    [BTN_DESHABILITADO, 'border-color', 'var(--ds-accent)', '.btn-primary'],
    ['body.dark-only .badge.bg-primary', 'background-color', 'var(--ds-accent)', '.bg-primary'],
  ];
  for (const [sel, prop, valor, global] of casos) {
    const d = decl(reglaPorSelector(sel)[0] || { decls: [] }, prop);
    assert.ok(d, `${sel} sin ${prop}`);
    assert.equal(d.value, valor, `${sel} ${prop}`);
    assert.ok(d.important, `${sel} ${prop} necesita !important para ganarle a ${global} !important`);
    assert.ok(gana(especificidad(sel), especificidad(global)), `${sel} no gana por especificidad a ${global}`);
  }
  for (const sel of ['body.dark-only .btn.btn-primary', 'body.dark-only .badge.bg-primary']) {
    assert.equal(decl(reglaPorSelector(sel)[0], 'color')?.value, 'var(--ds-on-accent)', `${sel}: texto`);
  }
});

test('3.4: el !important de .btn-primary deja ganar al deshabilitado propio de cada pantalla', () => {
  const deshabilitadoPantalla = especificidad('.btn-primary[_ngcontent-c1]:disabled'); // (0,3,0)
  // Ninguna regla !important de relleno de .btn-primary alcanza un botón deshabilitado con más especificidad.
  for (const regla of reglasDark().reglas) {
    const relleno = regla.decls.find(d => /^background(-color)?$/.test(d.prop) && d.important);
    if (!relleno) continue;
    for (const sel of regla.selectores.filter(s => /\.btn-primary(?![\w-])/.test(s))) {
      const excluyeDeshabilitado = sel.includes(':not(:disabled)') && sel.includes(':not(.disabled)');
      if (excluyeDeshabilitado) continue;
      assert.ok(gana(deshabilitadoPantalla, especificidad(sel)),
        `${sel} pisaría el deshabilitado de las pantallas (${especificidad(sel)} >= 0,3,0)`);
    }
  }
  const { css } = reglasDark();
  assert.ok(css.includes(BTN_ACTIVO), `falta ${BTN_ACTIVO}`);
});

test('3.4: los botones de driver.js se pisan en oscuro sin tocar styles.scss', () => {
  const estilos = fs.readFileSync(path.resolve(RAIZ, 'src/styles.scss'), 'utf8');
  assert.match(estilos, /&\.driver-popover-done-btn\s*\{\s*background:\s*var\(--primary-color\);/,
    'cambió la regla de driver.js en styles.scss: revisar el override de dark-mode.scss');
  const global = '.driver-popover .driver-popover-footer button.driver-popover-next-btn';
  for (const boton of ['driver-popover-next-btn', 'driver-popover-done-btn']) {
    const sel = `body.dark-only .driver-popover .driver-popover-footer button.${boton}`;
    const regla = reglaPorSelector(sel)[0];
    assert.ok(regla, `falta ${sel}`);
    assert.equal(decl(regla, 'background')?.value, 'var(--ds-accent)');
    assert.equal(decl(regla, 'color')?.value, 'var(--ds-on-accent)');
    assert.ok(gana(especificidad(sel), especificidad(global)), `${sel} no gana a styles.scss`);
    const hover = reglaPorSelector(`${sel}:hover`)[0];
    assert.equal(decl(hover || { decls: [] }, 'background')?.value, 'var(--ds-accent-hover)');
    assert.ok(gana(especificidad(`${sel}:hover`), especificidad(`${global}:hover`)));
  }
});

test('ninguna clase nueva con "p-" en dark-mode.scss (salvo clases propias de PrimeNG)', () => {
  let antes;
  try {
    antes = execFileSync('git', ['show', `${COMMIT_ANTES_B03}:${DARK_MODE}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
  } catch (error) {
    assert.fail(`no se pudo leer ${DARK_MODE} en ${COMMIT_ANTES_B03}: ${error.message}`);
  }
  const clases = texto => new Set([...texto.replace(/\/\/.*$/gm, '').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)]
    .map(m => m[1]).filter(c => c.includes('p-')));
  const previas = clases(antes);
  // Clases que PrimeNG pone en su DOM: las de su CSS base y las de su tema claro (por ejemplo p-checkbox-icon).
  // Se compara contra nombres de clase completos: un prefijo inventado (`.p-check`) no pasa por
  // estar dentro de `.p-checkbox`.
  const primeng = clases(['primeng.min.css', 'themes/lara-light-blue/theme.css']
    .map(rel => fs.readFileSync(path.resolve(RAIZ, 'node_modules/primeng/resources', rel), 'utf8')).join('\n'));
  assert.ok(primeng.has('p-checkbox-icon') && !primeng.has('p-check'), 'extracción de clases de PrimeNG');
  const nuevas = [...clases(leer(DARK_MODE))].filter(c => !previas.has(c));
  const inventadas = nuevas.filter(c => !primeng.has(c));
  assert.deepEqual(inventadas, [], `clases nuevas con "p-" que no son de PrimeNG: ${inventadas.join(', ')}`);
});

// ─── Tarea 3.5 (bloque TEMA-B04): los siete grises de dark-mode.scss pasan a tokens --ds-* ─────────
// Valor por defecto 3 (aprobado). Reemplazo por rol según design-f1.md §2. Conteo antes del cambio
// (commit 0b0476ed): #1a1d23 21 (36 al diseñar; TEMA-B03 pasó 15 a --ds-on-accent), #1e2128 11,
// #252830 57, #2d3139 120, #3d4149 219, #f0f0f0 40 y #e0e0e0 184.
const COMMIT_ANTES_B04 = '0b0476ed';
const GRISES = {
  '#1a1d23': 'var(--ds-canvas)',
  '#1e2128': 'var(--ds-surface)',
  '#252830': 'var(--ds-surface)',
  '#2d3139': 'var(--ds-surface-2)',
  '#3d4149': 'var(--ds-line-strong)',
  '#f0f0f0': 'var(--ds-ink)',
  '#e0e0e0': 'var(--ds-ink-2)',
};
// Variantes con alfa que quedan literales porque su token no tiene -rgb (no se inventan tokens).
// Techo: no pueden subir. La de .loader, rgba(26, 29, 35, .9), pasó a rgba(var(--ds-canvas-rgb), .9).
const ALFA_LITERALES = [
  [/rgba\(\s*37\s*,\s*40\s*,\s*48\s*,/gi, 2, '--ds-surface a .9'],
  [/rgba\(\s*224\s*,\s*224\s*,\s*224\s*,/gi, 6, '--ds-ink-2 con alfa'],
  [/#2d313980(?![0-9a-f])/gi, 1, '--ds-surface-2 a .5 (--view-grid-bg)'],
];

function sinComentarios(scss) {
  return scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Cuenta el hex opaco exacto: `#2d313980` (con alfa) no es `#2d3139`.
function contarGris(texto, gris) {
  return (texto.match(new RegExp(`${gris}(?![0-9a-f])`, 'gi')) || []).length;
}

// Si el retiro (4.5) borra dark-mode.scss entero, las pruebas de 3.5 ya no tienen qué revisar.
function sinDarkMode(t) {
  if (leer(DARK_MODE) !== null) return false;
  t.skip(`${DARK_MODE} ya no existe (retiro, tarea 4.5)`);
  return true;
}

test('3.5: contarGris distingue el hex opaco del hex con alfa y no mira mayúsculas', () => {
  assert.equal(contarGris('a: #2D3139; b: #2d313980; c: #2d3139 ;', '#2d3139'), 2);
  assert.equal(contarGris('color: #e0e0e0e0', '#e0e0e0'), 0);
  assert.equal(sinComentarios('a: #fff; // #1a1d23\n/* #1a1d23 */ b: url(http://x)'), 'a: #fff; \n b: url(http://x)');
});

test('3.5: dark-mode.scss sin ninguno de los siete grises (fuente y CSS compilado)', t => {
  if (sinDarkMode(t)) return;
  const fuente = sinComentarios(leer(DARK_MODE));
  const { css } = reglasDark();
  for (const gris of Object.keys(GRISES)) {
    assert.equal(contarGris(fuente, gris), 0, `${gris} sigue en ${DARK_MODE}`);
    assert.equal(contarGris(css, gris), 0, `${gris} sigue en el CSS compilado de ${DARK_MODE}`);
  }
});

test('3.5: las variantes con alfa de los grises no suben y la de .loader usa --ds-canvas-rgb', t => {
  if (sinDarkMode(t)) return;
  const fuente = sinComentarios(leer(DARK_MODE));
  for (const [patron, techo, rol] of ALFA_LITERALES) {
    const n = (fuente.match(patron) || []).length;
    assert.ok(n <= techo, `${patron} (${rol}): ${n} > ${techo}`);
  }
  for (const otra of [/rgba?\(\s*26\s*,\s*29\s*,\s*35\b/i, /rgba?\(\s*30\s*,\s*33\s*,\s*40\b/i, /rgba?\(\s*45\s*,\s*49\s*,\s*57\b/i,
    /rgba?\(\s*61\s*,\s*65\s*,\s*73\b/i, /rgba?\(\s*240\s*,\s*240\s*,\s*240\b/i]) {
    assert.doesNotMatch(fuente, otra, `variante con alfa nueva de un gris: ${otra}`);
  }
  // Si el retiro (4.5) quita el bloque de .loader, no hay nada que revisar.
  const loader = reglaPorSelector('body.dark-only .loader')[0];
  if (loader) assert.equal(decl(loader, 'background')?.value, 'rgba(var(--ds-canvas-rgb), 0.9)');
});

test('3.5: cada gris quedó en el token de su rol (contra el CSS de antes del cambio)', t => {
  if (sinDarkMode(t)) return;
  try {
    execFileSync('git', ['cat-file', '-e', `${COMMIT_ANTES_B04}^{commit}`], { cwd: RAIZ, stdio: 'ignore' });
  } catch {
    t.skip(`el commit ${COMMIT_ANTES_B04} no está en este clon (¿clon superficial?): no hay base para comparar`);
    return;
  }
  let antes;
  try {
    antes = execFileSync('git', ['show', `${COMMIT_ANTES_B04}:${DARK_MODE}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
  } catch (error) {
    assert.fail(`no se pudo leer ${DARK_MODE} en ${COMMIT_ANTES_B04}: ${error.message}`);
  }
  const sass = require('sass');
  const postcss = require('postcss');
  const indice = css => {
    const mapa = new Map();
    postcss.parse(css).walkDecls(d => {
      const regla = d.parent;
      if (!regla || regla.type !== 'rule') return;
      const clave = `${regla.selectors.map(s => s.replace(/\s+/g, ' ').trim()).join(',')}|${d.prop}`;
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(`${d.value.trim()}${d.important ? ' !important' : ''}`);
    });
    return mapa;
  };
  const conGris = valor => Object.keys(GRISES).some(g => contarGris(valor, g) > 0)
    || /rgba\(26, 29, 35, 0\.9\)/.test(valor);
  const aToken = valor => {
    let v = valor.replace(/rgba\(26, 29, 35, 0\.9\)/g, 'rgba(var(--ds-canvas-rgb), 0.9)');
    for (const [gris, token] of Object.entries(GRISES)) v = v.replace(new RegExp(`${gris}(?![0-9a-f])`, 'gi'), token);
    return v;
  };
  const base = indice(sass.compileString(antes).css);
  const actual = indice(reglasDark().css);
  let enBase = 0;
  let revisadas = 0;
  const distintas = [];
  for (const [clave, valores] of base) {
    const conGrises = valores.filter(conGris);
    enBase += conGrises.length;
    if (!actual.has(clave)) continue; // bloque retirado después (4.5): no aplica
    const hoy = actual.get(clave);
    for (const valor of conGrises) {
      revisadas++;
      if (!hoy.includes(aToken(valor))) distintas.push(`${clave}: ${valor} → hoy ${hoy.join(' / ')}`);
    }
  }
  // La base es fija (0b0476ed): si no trae más de 600 declaraciones con grises, la lectura falló.
  // Lo revisado hoy sí baja con el retiro (4.5), así que solo se exige que no quede vacío mientras
  // dark-mode.scss tenga reglas.
  assert.ok(enBase >= 600, `se esperaban más de 600 declaraciones con grises en ${COMMIT_ANTES_B04}, hubo ${enBase}`);
  assert.ok(actual.size === 0 || revisadas > 0, `ninguna de las ${enBase} declaraciones con grises de la base se pudo comparar: revisar las claves`);
  assert.deepEqual(distintas, [], `declaraciones que no siguen la tabla de design-f1.md §2:\n${distintas.join('\n')}`);
});
