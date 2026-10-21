'use strict';

// D-502 F1 (ticket 1180, tarea 3.1): tokens del tema en src/app/shared/styles/_theme-tokens.scss.
// Compila el parcial con `sass` (el del front) y comprueba, contra la tabla de design-f1.md §1:
//   a) cada --ds-* existe en :root (claro) y en body.dark-only (oscuro), con su valor;
//   b) en oscuro, los tokens de texto dan >= 4,5:1 y control-border y focus >= 3:1 contra CADA superficie;
//   c) on-accent da >= 4,5:1 sobre accent y accent-hover, y cada semántico >= 4,5:1 sobre su -soft (oscuro).
// Además, el claro es igual a los $cfg-* de _config-pagina.scss y al marco: F2a solo cambia la fuente.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const sass = require('sass');
const postcss = require('postcss');

const RAIZ = path.resolve(__dirname, '../..');
const PARCIAL = path.join(RAIZ, 'src/app/shared/styles/_theme-tokens.scss');
const CONFIG_PAGINA = path.join(RAIZ, 'src/app/shared/styles/_config-pagina.scss');

// design-f1.md §1: token → [claro, oscuro].
const ESPERADO = {
  canvas: ['#f4f3fa', '#14121c'],
  surface: ['#fff', '#1b1826'],
  'surface-2': ['#faf9fe', '#211d30'],
  'canvas-rgb': ['244, 243, 250', '20, 18, 28'],
  sidebar: ['#fff', '#17151f'],
  connector: ['#efeaff', '#2c2740'],
  'row-hover': ['#faf9ff', '#221e33'],
  tile: ['#f3f1fb', '#251f3a'],
  'chip-bg': ['#f5f4fa', '#211d30'],
  ink: ['#211F3A', '#f2f0fa'],
  'ink-2': ['#4a4760', '#e0ddef'],
  body: ['#5b5878', '#b9b5cc'],
  muted: ['#8f8bab', '#9d99b5'],
  line: ['#ececf4', '#262233'],
  'line-soft': ['#f1f0f7', '#221e33'],
  'line-strong': ['#e4e2ef', '#3a3450'],
  'control-border': ['#e9e7f3', '#7a7498'],
  accent: ['#5F3FE0', '#5F3FE0'],
  'accent-hover': ['#4a2fc0', '#4a2fc0'],
  'on-accent': ['#fff', '#fff'],
  'accent-ink': ['#5F3FE0', '#a48bff'],
  'accent-ink-rgb': ['95, 63, 224', '164, 139, 255'],
  'accent-soft': ['#efe9ff', '#2c244d'],
  focus: ['#7C5CFF', '#a48bff'],
  ok: ['#1E874B', '#4cc38a'],
  warn: ['#D9820A', '#f2a640'],
  err: ['#D64545', '#ff7a7a'],
  info: ['#1E6FD9', '#6aa6ff'],
  'ok-soft': ['#E6F7EE', '#1b2a2c'],
  'warn-soft': ['#FFF1DF', '#392922'],
  'err-soft': ['#FDECEC', '#391f2b'],
  'info-soft': ['#E7F1FF', '#1b2643'],
  'shadow-panel': ['0 1px 3px rgba(30, 20, 80, .04)', '0 1px 3px rgba(0, 0, 0, .4)'],
  'shadow-btn': ['0 8px 18px -8px rgba(95, 63, 224, .7)', '0 8px 18px -8px rgba(95, 63, 224, .7)'],
  'shadow-card': ['0 24px 60px -30px rgba(80, 60, 180, .28)', '0 24px 60px -30px rgba(0, 0, 0, .6)'],
};

const SUPERFICIES = ['canvas', 'surface', 'surface-2', 'row-hover', 'tile', 'chip-bg', 'sidebar', 'accent-soft'];
const TEXTOS = ['ink', 'ink-2', 'body', 'muted', 'accent-ink', 'ok', 'warn', 'err', 'info'];
const CONTORNOS = ['control-border', 'focus'];
const SEMANTICOS = ['ok', 'warn', 'err', 'info'];

// Claro = fuente actual: $cfg-* de la base (D-400) y los tokens del marco.
const CLARO_IGUAL_A_CFG = {
  accent: 'cfg-accent', 'accent-hover': 'cfg-accent-hover', focus: 'cfg-accent-2', 'accent-soft': 'cfg-accent-soft',
  ink: 'cfg-ink', body: 'cfg-body', muted: 'cfg-muted', line: 'cfg-line', 'line-soft': 'cfg-line-soft',
  'chip-bg': 'cfg-chip-bg', 'control-border': 'cfg-chip-border', 'surface-2': 'cfg-tint', 'row-hover': 'cfg-row-hover',
  tile: 'cfg-tile', ok: 'cfg-ok', 'ok-soft': 'cfg-ok-soft', warn: 'cfg-warn', 'warn-soft': 'cfg-warn-soft',
  err: 'cfg-err', 'err-soft': 'cfg-err-soft', info: 'cfg-info', 'info-soft': 'cfg-info-soft',
  'shadow-panel': 'cfg-shadow-panel', 'shadow-btn': 'cfg-shadow-btn',
};

function normalizar(valor) {
  return String(valor).trim().toLowerCase().replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ');
}

let cache = null;
function tokens() {
  if (cache) return cache;
  assert.ok(fs.existsSync(PARCIAL), 'falta src/app/shared/styles/_theme-tokens.scss (tarea 3.2)');
  const css = sass.compile(PARCIAL, { style: 'expanded' }).css;
  const juegos = { claro: {}, oscuro: {} };
  postcss.parse(css).walkRules(regla => {
    const selectores = regla.selectors.map(s => s.trim());
    const juego = selectores.includes(':root') ? 'claro' : selectores.includes('body.dark-only') ? 'oscuro' : null;
    if (!juego) return;
    regla.walkDecls(/^--ds-/, decl => { juegos[juego][decl.prop.slice(5)] = decl.value.trim(); });
  });
  cache = juegos;
  return cache;
}

function hexARgb(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  assert.match(h, /^[0-9a-f]{6}$/i, `color no es hex: ${hex}`);
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function luminancia(hex) {
  const [r, g, b] = hexARgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test('contraste WCAG de referencia (blanco/negro 21:1, #5F3FE0 con blanco 6,41:1)', () => {
  assert.equal(contraste('#fff', '#000').toFixed(2), '21.00');
  assert.equal(contraste('#fff', '#5F3FE0').toFixed(2), '6.41');
});

test('a) cada --ds-* de design-f1.md §1 existe en :root y en body.dark-only con su valor', () => {
  const { claro, oscuro } = tokens();
  for (const [token, [vClaro, vOscuro]] of Object.entries(ESPERADO)) {
    assert.ok(token in claro, `--ds-${token} falta en :root`);
    assert.ok(token in oscuro, `--ds-${token} falta en body.dark-only`);
    assert.equal(normalizar(claro[token]), normalizar(vClaro), `--ds-${token} claro`);
    assert.equal(normalizar(oscuro[token]), normalizar(vOscuro), `--ds-${token} oscuro`);
  }
  const sobrantes = [...Object.keys(claro), ...Object.keys(oscuro)].filter(t => !(t in ESPERADO));
  assert.deepEqual([...new Set(sobrantes)], [], 'tokens que no están en design-f1.md §1');
});

// Desde F2a (tarea 4.1, bloque TEMA-B07) los $cfg-* son var(--ds-*). Su hex de antes de F2a (commit
// 4ac9a459) queda fijo aquí, sin git: la prueba no depende de la historia (clon superficial en CI) y exige
// que el claro de cada token sea ese hex y que la variable de hoy apunte a su token.
const CFG_HEX_ANTES_F2A = {
  'cfg-accent': '#5F3FE0', 'cfg-accent-hover': '#4a2fc0', 'cfg-accent-2': '#7C5CFF', 'cfg-accent-soft': '#efe9ff',
  'cfg-ink': '#211F3A', 'cfg-body': '#5b5878', 'cfg-muted': '#8f8bab', 'cfg-line': '#ececf4', 'cfg-line-soft': '#f1f0f7',
  'cfg-chip-bg': '#f5f4fa', 'cfg-chip-border': '#e9e7f3', 'cfg-tint': '#faf9fe', 'cfg-row-hover': '#faf9ff',
  'cfg-tile': '#f3f1fb', 'cfg-ok': '#1E874B', 'cfg-ok-soft': '#E6F7EE', 'cfg-warn': '#D9820A', 'cfg-warn-soft': '#FFF1DF',
  'cfg-err': '#D64545', 'cfg-err-soft': '#FDECEC', 'cfg-info': '#1E6FD9', 'cfg-info-soft': '#E7F1FF',
  'cfg-shadow-panel': '0 1px 3px rgba(30, 20, 80, .04)', 'cfg-shadow-btn': '0 8px 18px -8px rgba(95, 63, 224, .7)',
};

test('a) el claro es igual a los $cfg-* de _config-pagina.scss y a los del marco', () => {
  const { claro } = tokens();
  const actual = fs.readFileSync(CONFIG_PAGINA, 'utf8');
  for (const [token, variable] of Object.entries(CLARO_IGUAL_A_CFG)) {
    assert.ok(variable in CFG_HEX_ANTES_F2A, `falta el hex de $${variable}`);
    assert.equal(normalizar(claro[token]), normalizar(CFG_HEX_ANTES_F2A[variable]), `--ds-${token} claro debe ser el hex de $${variable}`);
    const hoy = actual.match(new RegExp(`^\\$${variable}\\s*:\\s*([^;]+);`, 'm'));
    assert.ok(hoy, `no encontré $${variable} en _config-pagina.scss`);
    assert.equal(hoy[1].trim(), `var(--ds-${token})`, `$${variable} debe apuntar a --ds-${token}`);
  }
  const sidebar = fs.readFileSync(path.join(RAIZ, 'src/app/shared/components/sidebar/sidebar.component.scss'), 'utf8');
  const sombra = sidebar.match(/--ktq-shadow-card\s*:\s*([^;]+);/);
  assert.equal(normalizar(claro['shadow-card']), normalizar(sombra[1]), '--ds-shadow-card claro debe ser --ktq-shadow-card');
  const fondo = sidebar.match(/--ktq-bg\s*:\s*([^;]+);/);
  assert.equal(normalizar(claro.canvas), normalizar(fondo[1]), '--ds-canvas claro debe ser --ktq-bg');
});

test('a) los -rgb coinciden con su color en cada juego', () => {
  for (const juego of ['claro', 'oscuro']) {
    const t = tokens()[juego];
    assert.equal(normalizar(t['canvas-rgb']), hexARgb(t.canvas).join(', '), `canvas-rgb ${juego}`);
    assert.equal(normalizar(t['accent-ink-rgb']), hexARgb(t['accent-ink']).join(', '), `accent-ink-rgb ${juego}`);
  }
});

test('b) en oscuro, texto >= 4,5:1 y control-border/focus >= 3:1 contra cada superficie', () => {
  const { oscuro } = tokens();
  const fallos = [];
  for (const sup of SUPERFICIES) {
    for (const t of TEXTOS) {
      const c = contraste(oscuro[t], oscuro[sup]);
      if (c < 4.5) fallos.push(`${t} sobre ${sup}: ${c.toFixed(2)} < 4,5`);
    }
    for (const t of CONTORNOS) {
      const c = contraste(oscuro[t], oscuro[sup]);
      if (c < 3) fallos.push(`${t} sobre ${sup}: ${c.toFixed(2)} < 3`);
    }
  }
  assert.deepEqual(fallos, []);
});

test('c) on-accent >= 4,5:1 sobre accent y accent-hover (los dos juegos)', () => {
  for (const juego of ['claro', 'oscuro']) {
    const t = tokens()[juego];
    for (const fondo of ['accent', 'accent-hover']) {
      const c = contraste(t['on-accent'], t[fondo]);
      assert.ok(c >= 4.5, `${juego}: on-accent sobre ${fondo} ${c.toFixed(2)} < 4,5`);
    }
  }
});

// En claro los pares semánticos son los de la spec y su contraste es del cambio aparte (4.6, valor por defecto 6).
test('c) en oscuro, cada semántico >= 4,5:1 sobre su -soft', () => {
  const { oscuro } = tokens();
  for (const s of SEMANTICOS) {
    const c = contraste(oscuro[s], oscuro[`${s}-soft`]);
    assert.ok(c >= 4.5, `${s} sobre ${s}-soft: ${c.toFixed(2)} < 4,5`);
  }
});
