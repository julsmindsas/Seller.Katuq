'use strict';

// D-502 F1 (ticket 1180, tarea 3.6, bloque TEMA-B05): sidebar, header y toasts toman su oscuro de los
// tokens --ds-* de src/app/shared/styles/_theme-tokens.scss.
//   1) Sidebar y header: el oscuro pasa a var(--ds-*) con el MISMO valor. En sus reglas oscuras no
//      queda ningún literal que tenga token, y el oscuro resuelto (sustituyendo los tokens oscuros) es
//      igual al de antes (base fija 6e6d67bd, la punta antes de este bloque).
//   2) Toasts (_avisos.scss): el juego oscuro propio desaparece (una sola fuente de colores por tema):
//      cada color oscuro es un var(--ds-*), ninguna propiedad de color del claro se filtra al oscuro sin
//      su par, cada texto da >= 4,5:1 sobre su fondo y el foco >= 3:1. El claro no cambia.
// Sin build: compila cada hoja suelta con el sass del front (sidebar y _avisos no importan nada) y lee
// el header de styles.scss como fragmento. Las comparaciones con la base se saltan, con aviso, si el
// clon no tiene ese commit o si el bloque ya no existe (retiro, 4.5).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sass = require('sass');
const postcss = require('postcss');
const { leerTokens, normalizarValor, sustituirTokens, esSelectorOscuro, compararVersiones } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const BASE = '6e6d67bd';
const TOKENS = 'src/app/shared/styles/_theme-tokens.scss';
const SIDEBAR = 'src/app/shared/components/sidebar/sidebar.component.scss';
const STYLES = 'src/styles.scss';
const AVISOS = 'src/assets/scss/components/_avisos.scss';

// Literales del oscuro del marco que tienen token (design-f1.md §3), ya normalizados.
const LITERALES_CON_TOKEN = ['#14121c', '#1b1826', '#211d30', '#221e33', '#251f3a', '#262233', '#17151f', '#2c2740',
  '#f2f0fa', '#b9b5cc', '0 24px 60px -30px rgba(0, 0, 0, 0.6)', 'rgba(20, 18, 28, 0.72)'];
// Juego oscuro propio de los toasts antes de 3.6.
const OSCURO_PROPIO_AVISOS = ['#262633', '#34344a', '#ecebf5', '#b9b6cf', '#7fb0f0', '#6fd39b', '#f2b661', '#f08a8a',
  'rgba(30, 111, 217', 'rgba(30, 135, 75', 'rgba(217, 130, 10', 'rgba(214, 69, 69'];
const PROPS_COLOR = /^(color|background|background-color|border-color|border-(top|right|bottom|left)-color|outline-color|fill|stroke)$/;

function leerFuente(rel) {
  const archivo = path.join(RAIZ, rel);
  return fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : null;
}

function enBase(rel) {
  try {
    return execFileSync('git', ['-C', RAIZ, 'show', `${BASE}:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return null;
  }
}

function compilar(scss) {
  return sass.compileString(scss, { style: 'expanded', loadPaths: [path.join(RAIZ, 'src')], logger: sass.Logger.silent }).css;
}

let cacheTokens = null;
function tokens() {
  if (cacheTokens) return cacheTokens;
  const css = compilar(leerFuente(TOKENS));
  cacheTokens = { claro: leerTokens(css, 'claro'), oscuro: leerTokens(css, 'oscuro') };
  return cacheTokens;
}

// Declaraciones de las reglas oscuras: [{ selector, prop, valor, important }].
function declaracionesOscuras(css) {
  const salida = [];
  postcss.parse(css).walkDecls(d => {
    const regla = d.parent;
    if (regla.type !== 'rule') return;
    const oscuros = regla.selectors.filter(esSelectorOscuro);
    if (oscuros.length === 0) return;
    for (const selector of oscuros) {
      salida.push({ selector: selector.trim().replace(/\s+/g, ' '), prop: d.prop, valor: d.value, important: d.important });
    }
  });
  return salida;
}

function resolverOscuro(valor) {
  return normalizarValor(sustituirTokens(valor, tokens().oscuro));
}

// --- contraste WCAG ---
function rgbaDe(valor) {
  const v = normalizarValor(valor);
  let m = v.match(/^#([0-9a-f]{6})$/);
  if (m) return [...[0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)), 1];
  m = v.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  throw new Error(`color no reconocido: ${valor}`);
}

function rgbDe(valor) {
  const [r, g, b, a] = rgbaDe(valor);
  assert.equal(a, 1, `color con transparencia sin fondo debajo: ${valor}`);
  return [r, g, b];
}

// Un fondo translúcido se mide compuesto sobre el que tiene debajo.
function sobre(valor, debajo) {
  const [r, g, b, a] = rgbaDe(valor);
  if (a === 1) return valor;
  const [r2, g2, b2] = rgbDe(debajo);
  const mezcla = (x, y) => Math.round(x * a + y * (1 - a));
  return `rgb(${mezcla(r, r2)}, ${mezcla(g, g2)}, ${mezcla(b, b2)})`;
}

function contraste(a, b) {
  const lum = valor => {
    const [r, g, b2] = rgbDe(valor).map(c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---------------------------------------------------------------- 1) sidebar y header

function bloqueOscuroSidebar(fuente) {
  return fuente && /body\.dark-only\s*\{/.test(fuente) ? fuente : null;
}

test('3.6 sidebar: en sus reglas oscuras no queda ningún literal que tenga token', t => {
  const fuente = bloqueOscuroSidebar(leerFuente(SIDEBAR));
  if (!fuente) { t.skip('sidebar sin bloque body.dark-only (retiro)'); return; }
  const restos = declaracionesOscuras(compilar(fuente))
    .filter(d => LITERALES_CON_TOKEN.some(l => normalizarValor(d.valor).includes(l)))
    .map(d => `${d.selector} { ${d.prop}: ${d.valor} }`);
  assert.deepEqual(restos, []);
});

test('3.6 sidebar: cada var(--ds-*) del oscuro existe en el juego oscuro', t => {
  const fuente = bloqueOscuroSidebar(leerFuente(SIDEBAR));
  if (!fuente) { t.skip('sidebar sin bloque body.dark-only (retiro)'); return; }
  const usados = new Set();
  for (const d of declaracionesOscuras(compilar(fuente))) {
    for (const m of d.valor.matchAll(/var\(--ds-([a-z0-9-]+)/g)) usados.add(m[1]);
  }
  assert.ok(usados.size >= 8, `se esperaban los tokens del marco en el sidebar, hay ${usados.size}`);
  for (const token of usados) assert.ok(tokens().oscuro.has(token), `--ds-${token} no existe en body.dark-only`);
});

test('3.6 sidebar: el oscuro resuelto con los tokens oscuros es el mismo que antes', t => {
  const actual = leerFuente(SIDEBAR);
  const base = enBase(SIDEBAR);
  if (!base) { t.skip(`el clon no tiene ${BASE}`); return; }
  if (!bloqueOscuroSidebar(actual)) { t.skip('sidebar sin bloque body.dark-only (retiro)'); return; }
  // TODAS las declaraciones oscuras de la base (no solo las que tenían un literal con token): misma regla,
  // mismo valor resuelto. Así también se vigila lo que quedó literal (#8f8ba5, #a9a5bf, los tintes lila):
  // pasarlo a un token de otro valor (por ejemplo #8f8ba5 a --ds-muted, #9d99b5) cambia el oscuro y falla.
  const actuales = new Map();
  for (const d of declaracionesOscuras(compilar(actual))) actuales.set(`${d.selector}|${d.prop}`, d);
  let comparadas = 0;
  const distintas = [];
  for (const d of declaracionesOscuras(compilar(base))) {
    const hoy = actuales.get(`${d.selector}|${d.prop}`);
    if (!hoy) continue; // la regla se retiró o se rediseñó después
    comparadas++;
    const antes = normalizarValor(d.valor) + (d.important ? ' !important' : '');
    const ahora = resolverOscuro(hoy.valor) + (hoy.important ? ' !important' : '');
    if (antes !== ahora) distintas.push(`${d.selector} { ${d.prop}: ${antes} -> ${ahora} }`);
  }
  assert.ok(comparadas >= 75, `comparación casi vacía: ${comparadas} declaraciones oscuras comparadas`);
  assert.deepEqual(distintas, []);
});

// El header oscuro de styles.scss se lee como fragmento: compilar styles.scss entero es pesado (eso lo
// hace tests/theme/comparar-claro.js --tema oscuro con flock).
function reglaHeader(fuente, oscuro) {
  const patron = oscuro
    ? /body\.dark-only \.page-wrapper \.page-header,\s*\.dark-only \.page-wrapper \.page-header\s*\{[^}]*\}/
    : /\n\.page-wrapper \.page-header\s*\{[^}]*\}/;
  const m = fuente && fuente.match(patron);
  return m ? m[0] : null;
}

test('3.6 header: el oscuro va en tokens con el mismo valor y el claro no cambia', () => {
  const fuente = leerFuente(STYLES);
  const oscuro = reglaHeader(fuente, true);
  const claro = reglaHeader(fuente, false);
  assert.ok(oscuro, 'no encontré el header oscuro en styles.scss');
  assert.ok(claro, 'no encontré el header claro en styles.scss');
  const decl = Object.fromEntries(declaracionesOscuras(compilar(oscuro)).map(d => [d.prop, d.valor]));
  // Dart Sass deja pasar rgba() con var() tal cual.
  assert.equal(normalizarValor(decl.background), 'rgba(var(--ds-canvas-rgb), 0.72)');
  assert.equal(normalizarValor(decl['border-bottom']), '1px solid var(--ds-line)');
  assert.equal(resolverOscuro(decl.background), 'rgba(20, 18, 28, 0.72)');
  assert.equal(resolverOscuro(decl['border-bottom']), '1px solid #262233');
  assert.match(claro, /background:\s*rgba\(244, 243, 250, 0\.72\) !important/);
});

test('3.6 header: igual que la base en los dos temas', t => {
  const base = reglaHeader(enBase(STYLES), true);
  if (!base) { t.skip(`el clon no tiene ${BASE}`); return; }
  const actual = compilar(reglaHeader(leerFuente(STYLES), true));
  const r = compararVersiones(compilar(base), tokens().oscuro, actual, tokens().oscuro, 'oscuro');
  assert.ok(r.igual, `cambió el header oscuro: ${JSON.stringify({ base: r.soloBase, actual: r.soloActual })}`);
  const claroBase = reglaHeader(enBase(STYLES), false);
  assert.equal(reglaHeader(leerFuente(STYLES), false), claroBase);
});

// ---------------------------------------------------------------- 2) toasts

function cssAvisos() {
  return compilar(leerFuente(AVISOS));
}

// Lo que se ve en oscuro: la regla oscura si existe; si no, la clara (también aplica en oscuro).
function valorOscuro(selectorFinal, prop) {
  const css = cssAvisos();
  let d = declaracionesOscuras(css).filter(x => x.selector.endsWith(selectorFinal) && x.prop === prop).pop();
  if (!d) {
    postcss.parse(css).walkDecls(prop, x => {
      if (x.parent.type === 'rule' && x.parent.selectors.some(sel => !esSelectorOscuro(sel) && sel.trim().endsWith(selectorFinal))) {
        d = { valor: x.value };
      }
    });
  }
  assert.ok(d, `no hay regla para «${selectorFinal}» { ${prop} }`);
  return resolverOscuro(d.valor);
}

test('3.6 toasts: no queda el juego oscuro propio y cada color oscuro es un var(--ds-*)', () => {
  const oscuras = declaracionesOscuras(cssAvisos());
  assert.ok(oscuras.length > 0, '_avisos.scss sin reglas oscuras');
  const propio = oscuras.filter(d => OSCURO_PROPIO_AVISOS.some(l => normalizarValor(d.valor).toLowerCase().includes(l)));
  assert.deepEqual(propio.map(d => `${d.selector} { ${d.prop}: ${d.valor} }`), []);
  const literales = oscuras.filter(d => PROPS_COLOR.test(d.prop) && !/^var\(--ds-[a-z0-9-]+\)$/.test(d.valor.trim()));
  assert.deepEqual(literales.map(d => `${d.selector} { ${d.prop}: ${d.valor} }`), []);
});

// El p-toast oscuro por severidad de dark-mode.scss (fondos al 95 % y bordes saturados) se retiró en 4.5
// (TEMA-B20). Se conserva el !important de _avisos.scss: es el seguro frente a otros p-toast más específicos.
test('3.6 toasts: las reglas oscuras de p-toast llevan !important (le ganan al p-toast de dark-mode.scss)', () => {
  const sinImportant = declaracionesOscuras(cssAvisos())
    .filter(d => d.selector.includes('.p-toast') && (PROPS_COLOR.test(d.prop) || d.prop === 'box-shadow') && !d.important)
    .map(d => `${d.selector} { ${d.prop}: ${d.valor} }`);
  assert.deepEqual(sinImportant, []);
});

test('3.6 toasts: cada color del claro tiene su par en oscuro (nada claro se filtra al oscuro)', () => {
  const css = cssAvisos();
  const oscuras = declaracionesOscuras(css);
  const faltan = [];
  postcss.parse(css).walkDecls(d => {
    if (d.parent.type !== 'rule' || !/^(color|outline|outline-color)$/.test(d.prop)) return;
    for (const selector of d.parent.selectors) {
      if (esSelectorOscuro(selector)) continue;
      const s = selector.trim().replace(/\s+/g, ' ');
      const props = d.prop === 'color' ? ['color'] : ['outline', 'outline-color'];
      if (!oscuras.some(o => o.selector === `body.dark-only ${s}` && props.includes(o.prop))) faltan.push(`${s} { ${d.prop} }`);
    }
  });
  assert.deepEqual(faltan, []);
});

test('3.6 toasts: en oscuro cada texto da >= 4,5:1 sobre su fondo y el foco >= 3:1', () => {
  const fondo = valorOscuro('#toast-container > .ngx-toastr', 'background-color');
  const pares = [
    ['título ngx', valorOscuro('.ngx-toastr .toast-title', 'color'), fondo],
    ['mensaje ngx', valorOscuro('.ngx-toastr .toast-message', 'color'), fondo],
    ['enlace ngx', valorOscuro('.toast-message label', 'color'), fondo],
    ['cerrar ngx', valorOscuro('.toast-close-button', 'color'), fondo],
    ['cerrar ngx (hover)', valorOscuro('.toast-close-button:focus', 'color'), fondo],
    ['resumen p-toast', valorOscuro('.p-toast-summary', 'color'), valorOscuro('.p-toast .p-toast-message', 'background')],
    ['detalle p-toast', valorOscuro('.p-toast-detail', 'color'), valorOscuro('.p-toast .p-toast-message', 'background')],
    ['cerrar p-toast', valorOscuro('.p-toast-icon-close', 'color'), fondo],
    ['cerrar p-toast (hover)', valorOscuro('.p-toast-icon-close:hover', 'color'), sobre(valorOscuro('.p-toast-icon-close:hover', 'background'), fondo)],
    ['ícono info', valorOscuro('.p-toast-message .p-toast-message-icon', 'color'), sobre(valorOscuro('.p-toast-message .p-toast-message-icon', 'background'), fondo)],
    ['ícono éxito', valorOscuro('.p-toast-message-success .p-toast-message-icon', 'color'), sobre(valorOscuro('.p-toast-message-success .p-toast-message-icon', 'background'), fondo)],
    ['ícono alerta', valorOscuro('.p-toast-message-warn .p-toast-message-icon', 'color'), sobre(valorOscuro('.p-toast-message-warn .p-toast-message-icon', 'background'), fondo)],
    ['ícono error', valorOscuro('.p-toast-message-error .p-toast-message-icon', 'color'), sobre(valorOscuro('.p-toast-message-error .p-toast-message-icon', 'background'), fondo)],
  ];
  const fallos = pares.filter(([, a, b]) => contraste(a, b) < 4.5).map(([n, a, b]) => `${n}: ${a} sobre ${b} = ${contraste(a, b).toFixed(2)}`);
  for (const sel of ['.toast-close-button:focus-visible', '.p-toast-icon-close:focus-visible']) {
    let foco;
    try {
      foco = valorOscuro(sel, 'outline-color');
    } catch {
      foco = valorOscuro(sel, 'outline').match(/#[0-9a-f]{6}|rgba?\([^)]*\)/)[0]; // del atajo `outline` del claro
    }
    const c = contraste(foco, fondo);
    if (c < 3) fallos.push(`foco ${sel}: ${c.toFixed(2)} < 3`);
  }
  assert.deepEqual(fallos, []);
});

test('3.6 toasts: el claro de _avisos.scss es igual al de la base', t => {
  const base = enBase(AVISOS);
  if (!base) { t.skip(`el clon no tiene ${BASE}`); return; }
  const r = compararVersiones(compilar(base), tokens().claro, cssAvisos(), tokens().claro, 'claro');
  assert.ok(!r.vacio, 'sin declaraciones claras que comparar');
  assert.ok(r.igual, `cambió el claro: ${JSON.stringify({ base: r.soloBase, actual: r.soloActual })}`);
});
