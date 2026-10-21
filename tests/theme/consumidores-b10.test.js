'use strict';

// D-502 F2a (ticket 1180, tarea 4.1, bloque TEMA-B10): consumidores SENSIBLES de la base config-pagina (ventas:
// borradores, carga y clientes; lista de POS; formas de pago de POS y generales). Solo presentación, solo .scss.
// Sobre el .scss y el CSS compilado comprueba:
//   1) sin blancos literales (#fff, white, $clientes-white) como fondo ni como texto: la superficie va en
//      var(--ds-surface) y el texto sobre relleno en var(--ds-on-accent). Quedan los rgba() translúcidos;
//   2) el acento (#5F3FE0, $cfg-accent, $clientes-primary) no es color de texto: va en var(--ds-accent-ink);
//   3) sin juegos oscuros propios (body.dark-only, :host-context(body.dark-only)): el de crear-formas-pago de
//      POS pasó a los tokens;
//   4) gradientes y primarios prohibidos no suben;
//   5) todo compila y ninguna regla pone texto literal oscuro sobre una superficie de token;
//   6) los literales con token exacto (ink, body, muted, línea, chip, semánticos) ya no están como color de texto,
//      fondo ni borde en estos archivos.
// «Claro idéntico» se comprueba entre commits con tests/theme/comparar-claro.js (necesita un commit base).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const postcss = require('postcss');

const RAIZ = path.resolve(__dirname, '../..');
const NM = path.join(RAIZ, 'node_modules');
const C = 'src/app/components/';

const ARCHIVOS = [
  'ventas/borradores-venta/borradores-venta.component.scss',
  'ventas/carga-ventas/carga-ventas.component.scss',
  'ventas/clientes/clientes.component.scss',
  'ventas/clientes/corporativos/clientes-corporativos.component.scss',
  'ventas/clientes/lista/clientes-lista.component.scss',
  'pos/pos-list/list.component.scss',
  'extras/pos/formas-pago/formas-pago.component.scss',
  'extras/pos/formas-pago/crear-formas-pago/crear-formas-pago.component.scss',
  'extras/formas-pago/formas-pago.component.scss',
  'extras/formas-pago/crear-formas-pago/crear-formas-pago.component.scss',
].map(f => C + f);

// Parcial de variables de Clientes: solo lo importan clientes y clientes-lista.
const PARCIAL_CLIENTES = C + 'ventas/clientes/_clientes-variables.scss';

// Medida de antes del bloque (commit c8c5b186), por carpeta: gradientes y primarios prohibidos.
const ANTES = {
  [C + 'ventas/borradores-venta']: { grad: 0, prim: 0 }, [C + 'ventas/carga-ventas']: { grad: 0, prim: 0 },
  [C + 'ventas/clientes']: { grad: 2, prim: 0 }, [C + 'pos/pos-list']: { grad: 0, prim: 0 },
  [C + 'extras/pos/formas-pago']: { grad: 0, prim: 0 }, [C + 'extras/formas-pago']: { grad: 0, prim: 0 },
};
const GRADIENTE = /(linear|radial)-gradient\(/gi;
const PRIMARIOS = /#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(\s*102\s*,\s*126\s*,\s*234/gi;

function leer(rel) { return fs.readFileSync(path.join(RAIZ, rel), 'utf8'); }
function sinComentarios(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'(])\/\/.*$/gm, '$1'); }
function archivosScss(dir) {
  const salida = [];
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) salida.push(...archivosScss(rel)); else if (e.name.endsWith('.scss')) salida.push(rel);
  }
  return salida;
}

// ---------- funciones puras (mismas que consumidores-b08.test.js) ----------

const PROP_TEXTO = /^(color|-webkit-text-fill-color|caret-color|text-decoration-color|fill|stroke)$/;
const PROP_BORDE = /^(border(-(top|right|bottom|left))?(-color)?|outline(-color)?)$/;
const PROP_FONDO = /^(background|background-color)$/;
const BLANCO = /(?<![\w#-])(#fff(?:fff)?|white)(?![\w-])/i;

function declaraciones(scss) {
  const texto = sinComentarios(scss);
  const lista = [];
  for (const m of texto.matchAll(/(^|[;{}\s])((?:-webkit-)?[a-z][a-z-]*)\s*:\s*([^;{}\n]+?)(?=\s*(?:;|\}|$))/gm)) {
    lista.push({ prop: m[2], valor: m[3], pos: m.index + m[1].length, texto });
  }
  return lista;
}

function propiasDelBloque(texto, pos) {
  let prof = 0, ini = -1;
  for (let i = pos; i >= 0; i--) {
    if (texto[i] === '}') prof++; else if (texto[i] === '{') { if (prof === 0) { ini = i; break; } prof--; }
  }
  if (ini < 0) return '';
  let propio = '', p = 0;
  for (let i = ini + 1; i < texto.length; i++) {
    if (texto[i] === '{') p++;
    if (texto[i] === '}') { if (p === 0) break; p--; continue; }
    if (p === 0) propio += texto[i];
  }
  return propio;
}

function blancosLiterales(scss) {
  return declaraciones(scss)
    .filter(d => (PROP_FONDO.test(d.prop) || PROP_TEXTO.test(d.prop)) && BLANCO.test(d.valor))
    .map(d => `${d.prop}: ${d.valor}`);
}

function acentoComoTexto(scss) {
  const ACENTO = /(\$cfg-accent|\$cb-accent|\$bxc-accent)(?![\w-])/;
  const RELLENO = /background(-color)?\s*:\s*(\$cfg-accent|\$cb-accent|var\(--ds-accent\))(?![\w-])/;
  return declaraciones(scss)
    .filter(d => ACENTO.test(d.valor))
    .filter(d => PROP_TEXTO.test(d.prop) || (PROP_BORDE.test(d.prop) && !RELLENO.test(propiasDelBloque(d.texto, d.pos))))
    .map(d => `${d.prop}: ${d.valor}`);
}

function luminanciaHex(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const SUPERFICIE_TOKEN = /var\(--ds-(surface|surface-2|chip-bg|tile|row-hover|canvas)\)/;
function superficieConTextoOscuro(css) {
  const hallazgos = [];
  postcss.parse(css).walkRules(regla => {
    const d = {};
    regla.each(n => { if (n.type === 'decl') d[n.prop] = n.value.replace(/\s*!important/, '').trim(); });
    const fondo = d.background || d['background-color'];
    if (!fondo || !SUPERFICIE_TOKEN.test(fondo) || !d.color) return;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(d.color) && luminanciaHex(d.color) < 0.2) {
      hallazgos.push(regla.selector.replace(/\s+/g, ' ').trim());
    }
  });
  return hallazgos;
}

/** Fondos #fff / white en el CSS compilado (sin sombras ni rgba). */
function fondosBlancosCompilados(css) {
  const lista = [];
  postcss.parse(css).walkDecls(/^background(-color)?$/, d => {
    if (BLANCO.test(d.value) && !/gradient|url\(/.test(d.value)) lista.push(`${d.parent.selector.replace(/\s+/g, ' ')} { ${d.prop}: ${d.value} }`);
  });
  return lista;
}


const BLANCO_VAR = /(?<![\w-])\$clientes-white(?![\w-])/;
/** $clientes-white usado como fondo o texto (no dentro de rgba(): ahí es una superficie translúcida). */
function clientesWhiteDirecto(scss) {
  return declaraciones(scss)
    .filter(d => (PROP_FONDO.test(d.prop) || PROP_TEXTO.test(d.prop)) && BLANCO_VAR.test(d.valor) && !/rgba\(/.test(d.valor))
    .map(d => `${d.prop}: ${d.valor}`);
}

const ACENTO_TEXTO = /(\$cfg-accent|\$clientes-primary|\$clientes-secondary|\$primary-color|#5f3fe0)(?![\w-])/i;
/** Acento literal o de variable como color de texto (el borde queda para la prueba de bordes de los cfg-*). */
function acentoLiteralComoTexto(scss) {
  return declaraciones(scss)
    .filter(d => PROP_TEXTO.test(d.prop) && ACENTO_TEXTO.test(d.valor))
    .map(d => `${d.prop}: ${d.valor}`);
}

// Literales que ya tienen token con ese mismo valor claro: el color de texto, el fondo y el borde no los llevan.
const LITERALES_CON_TOKEN = {
  '#211f3a': 'ink', '#5b5878': 'body', '#8f8bab': 'muted', '#ececf4': 'line', '#e4e2ef': 'line-strong',
  '#e9e7f3': 'control-border', '#f5f4fa': 'chip-bg', '#faf9fe': 'surface-2', '#efe9ff': 'accent-soft',
  '#e6f7ee': 'ok-soft', '#fdecec': 'err-soft', '#fff1df': 'warn-soft', '#e7f1ff': 'info-soft',
  '#1e874b': 'ok', '#d64545': 'err', '#d9820a': 'warn', '#1e6fd9': 'info', '#7c5cff': 'focus', '#f1f0f7': 'line-soft',
};
/** Declaraciones de color/fondo/borde que usan un literal con token exacto. */
function literalesConToken(scss) {
  const hallazgos = [];
  for (const d of declaraciones(scss)) {
    if (!(PROP_FONDO.test(d.prop) || PROP_TEXTO.test(d.prop) || PROP_BORDE.test(d.prop))) continue;
    if (/rgba\(|gradient|\$[\w-]+\s*:/.test(d.valor)) continue;
    for (const m of d.valor.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      if (LITERALES_CON_TOKEN[m[0].toLowerCase()]) hallazgos.push(`${d.prop}: ${d.valor}`);
    }
  }
  return hallazgos;
}

// ---------- pruebas de las funciones ----------

test('blancosLiterales detecta fondos y textos blancos, no rgba', () => {
  const scss = '.a { background: #fff; } .b { color: white !important; } .c { background: var(--ds-surface); color: var(--ds-on-accent); } .d { background: rgba(255,255,255,.25); }';
  assert.deepEqual(blancosLiterales(scss), ['background: #fff', 'color: white !important']);
});

test('clientesWhiteDirecto detecta $clientes-white como fondo o texto, no dentro de rgba()', () => {
  const scss = '.a { background: $clientes-white; } .b { color: $clientes-white !important; } .c { background: rgba($clientes-white, .9); } .d { background: var(--ds-surface); }';
  assert.deepEqual(clientesWhiteDirecto(scss), ['background: $clientes-white', 'color: $clientes-white !important']);
});

test('acentoLiteralComoTexto detecta el acento como texto, no como relleno ni la variable ink', () => {
  const scss = '.a { color: #5F3FE0; } .b { color: $clientes-primary !important; } .c { background: #5F3FE0; } .d { color: var(--ds-accent-ink); }';
  assert.deepEqual(acentoLiteralComoTexto(scss), ['color: #5F3FE0', 'color: $clientes-primary !important']);
});

test('literalesConToken detecta hex con token exacto en color, fondo y borde', () => {
  const scss = '.a { color: #211F3A; } .b { border: 1px solid #ececf4; } .c { background: #d9cffb; } .d { background: rgba(95,63,224,.1); } .e { color: var(--ds-ink); }';
  assert.deepEqual(literalesConToken(scss), ['color: #211F3A', 'border: 1px solid #ececf4']);
});

// ---------- pruebas sobre los archivos ----------

const TODOS = ARCHIVOS.concat([PARCIAL_CLIENTES]);

test('1) sin blancos literales de superficie ni de texto en los archivos del bloque', () => {
  const fallos = TODOS.flatMap(rel => [...blancosLiterales(leer(rel)), ...clientesWhiteDirecto(leer(rel))].map(h => `${rel}: ${h}`));
  assert.deepEqual(fallos, []);
});

test('2) el acento no es color de texto ni de borde fuera de un bloque con relleno de acento', () => {
  // Excepción nombrada: el hover de .btn-client-neutral (#5F3FE0 sobre #f8f9fa, fondo claro sin token).
  const fallos = TODOS.flatMap(rel => [...acentoComoTexto(leer(rel)), ...acentoLiteralComoTexto(leer(rel))].map(h => `${rel}: ${h}`))
    .filter(h => h !== `${C}ventas/clientes/clientes.component.scss: color: #5F3FE0`);
  assert.deepEqual(fallos, []);
});

test('3) sin juegos oscuros propios en los archivos del bloque', () => {
  const fallos = TODOS.filter(rel => /dark-only|data-theme\s*=\s*["']?dark|\$dark-|lighten\(/.test(sinComentarios(leer(rel))));
  assert.deepEqual(fallos, []);
});

test('3b) crear-formas-pago de POS no conserva sus variables $fpos-* ni los grises del oscuro de F0', () => {
  const scss = sinComentarios(leer(C + 'extras/pos/formas-pago/crear-formas-pago/crear-formas-pago.component.scss'));
  assert.ok(!/\$fpos-/.test(scss));
  for (const gris of ['#2d3748', '#4a5568', '#e2e8f0', '#a0aec0']) assert.ok(!scss.includes(gris), gris);
});

test('4) gradientes y primarios prohibidos no suben por carpeta', () => {
  const fallos = [];
  for (const [dir, antes] of Object.entries(ANTES)) {
    const textos = archivosScss(dir).map(f => sinComentarios(leer(f)));
    const grad = textos.reduce((n, t) => n + (t.match(GRADIENTE) || []).length, 0);
    const prim = textos.reduce((n, t) => n + (t.match(PRIMARIOS) || []).length, 0);
    if (grad > antes.grad) fallos.push(`${dir}: gradientes ${grad} > ${antes.grad}`);
    if (prim > antes.prim) fallos.push(`${dir}: primarios ${prim} > ${antes.prim}`);
  }
  assert.deepEqual(fallos, []);
});

const OPCIONES = {
  style: 'expanded', loadPaths: [path.join(RAIZ, 'src'), NM], logger: sass.Logger.silent,
  importers: [{ findFileUrl: url => (url.startsWith('~') ? pathToFileURL(path.join(NM, url.slice(1))) : null) }],
};
const cache = new Map();
function compilar(rel) {
  if (!cache.has(rel)) cache.set(rel, sass.compile(path.join(RAIZ, rel), OPCIONES).css);
  return cache.get(rel);
}

// Excepciones nombradas. Un caso nuevo hace fallar la prueba en vez de colarse.
// Son los tres hover de texto #4a2fc0 (acento oscuro) sobre chip-bg, surface-2 o el fondo suave: no hay token de texto
// con ese valor claro y pasarlo a --ds-accent-ink cambiaría el claro (#4a2fc0 -> #5F3FE0). Pregunta abierta para
// Daniel en design-f2a.md; la prueba no deja que se agregue ninguno más.
const EXCEPCIONES_SUPERFICIE_TEXTO_OSCURO = new Set([
  '.nav-tabs .nav-link:hover:not(.active)',
  '.btn-tags-cfg.p-button.p-button-outlined:hover',
]);

test('5) todos los archivos compilan y ninguna regla pone texto literal oscuro sobre una superficie de token', () => {
  const fallos = [];
  for (const rel of ARCHIVOS) {
    const css = compilar(rel);
    assert.ok(css.length > 0, rel);
    for (const sel of superficieConTextoOscuro(css)) {
      if (!EXCEPCIONES_SUPERFICIE_TEXTO_OSCURO.has(sel)) fallos.push(`${rel}: ${sel}`);
    }
  }
  assert.deepEqual(fallos, []);
});

test('5b) el CSS compilado no deja tokens --ds-* inexistentes', () => {
  const tokens = new Set([...fs.readFileSync(path.join(RAIZ, 'src/app/shared/styles/_theme-tokens.scss'), 'utf8')
    .matchAll(/^\s*--ds-([a-z0-9-]+):/gm)].map(m => m[1]));
  const fallos = [];
  for (const rel of ARCHIVOS) {
    for (const m of compilar(rel).matchAll(/var\(--ds-([a-z0-9-]+)/g)) {
      if (!tokens.has(m[1])) fallos.push(`${rel}: --ds-${m[1]}`);
    }
  }
  assert.deepEqual([...new Set(fallos)], []);
});

test('5c) Clientes: el CSS compilado no pinta ningún fondo #fff (la tarjeta, el campo y la tabla toman la superficie)', () => {
  const fallos = [
    C + 'ventas/clientes/clientes.component.scss', C + 'ventas/clientes/lista/clientes-lista.component.scss',
    C + 'ventas/clientes/corporativos/clientes-corporativos.component.scss',
    C + 'ventas/borradores-venta/borradores-venta.component.scss', C + 'ventas/carga-ventas/carga-ventas.component.scss',
    C + 'pos/pos-list/list.component.scss',
  ].flatMap(rel => fondosBlancosCompilados(compilar(rel)).map(h => `${rel}: ${h}`));
  assert.deepEqual(fallos, []);
});

// Literales con token exacto que quedan, por archivo: se llenan con la justificación al lado.
// Cuatro reglas con fondo claro literal SIN token (#f8f9fa, #fff3f4, #f0fdf4, #f3f4f6; la de #f8f9fa conserva #5F3FE0 en su hover): su texto se queda en el literal
// de antes (pasarlo a token lo dejaría claro sobre claro en oscuro; B07 lo mide en la compuerta). Pregunta abierta.
const LITERALES_QUE_QUEDAN = {
  [C + 'ventas/clientes/clientes.component.scss']: 2,
  [C + 'ventas/clientes/lista/clientes-lista.component.scss']: 1,
};

test('6) los literales con token exacto ya no están como color, fondo ni borde, salvo los nombrados', () => {
  const fallos = ARCHIVOS.flatMap(rel => {
    const n = literalesConToken(leer(rel)).length;
    const permitidos = LITERALES_QUE_QUEDAN[rel] ?? 0;
    return n === permitidos ? [] : [`${rel}: ${n} literales, se esperaban ${permitidos}: ${literalesConToken(leer(rel)).join(' | ')}`];
  });
  assert.deepEqual(fallos, []);
});

test('7) el parcial de Clientes toma las superficies y los textos de los tokens', () => {
  const scss = leer(PARCIAL_CLIENTES);
  for (const [v, t] of [['dark', 'ink'], ['dark-light', 'body'], ['border', 'line-strong'], ['border-light', 'line'], ['bg-light', 'chip-bg'], ['bg-lighter', 'surface-2']]) {
    assert.match(scss, new RegExp(`^\\$clientes-${v}: var\\(--ds-${t}\\);`, 'm'), v);
  }
  assert.match(scss, /^\$clientes-surface: var\(--ds-surface\);/m);
  assert.match(scss, /@mixin clientes-card \{\s*background: \$clientes-surface;/);
  assert.match(scss, /^\$clientes-input-bg: \$clientes-surface;/m);
});

module.exports = { clientesWhiteDirecto, acentoLiteralComoTexto, literalesConToken };
