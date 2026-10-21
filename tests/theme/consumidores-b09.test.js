'use strict';

// D-502 F2a (ticket 1180, tarea 4.1, bloque TEMA-B09): consumidores no sensibles de la base config-pagina, segunda
// parte (kuvo, lista-precios-costos, nps, proceso, bodegas-por-canal, productos, provider-dashboard, soporte/mis-tickets,
// agent-builder, marketing/pauta-embudo y video-agent/appointments-list). Solo presentación. Sobre el .scss y el CSS
// compilado comprueba, igual que consumidores-b08.test.js:
//   1) sin blancos literales (#fff, #ffffff, white) como fondo ni como texto: las superficies van en var(--ds-surface)
//      y el texto sobre relleno en var(--ds-on-accent), salvo los nombrados;
//   2) $cfg-accent no es texto ni borde fuera de un bloque con relleno de acento: ahí va $cfg-accent-ink;
//   3) sin juegos oscuros propios (body.dark-only, :host-context(.dark-only), lighten($dark-…));
//   4) gradientes y primarios prohibidos no suben;
//   5) todo compila y ninguna regla pone texto literal oscuro sobre una superficie de token;
//   6) Ocasiones (fallo medido en F0, criterio3SinFondosBlancosEnOscuro): el CSS compilado de las pantallas de proceso
//      que incluyen el mixin no pinta ningún fondo #fff;
//   7) bodegas-por-canal toma sus superficies de los tokens, sin variables propias de tema oscuro.
// «Claro idéntico» se comprueba entre commits con tests/theme/comparar-claro.js.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const postcss = require('postcss');

const RAIZ = path.resolve(__dirname, '../..');
const NM = path.join(RAIZ, 'node_modules');
const A = 'src/app/';
const C = A + 'components/';
const M = A + 'modules/';

const ARCHIVOS = [
  'kuvo/kuvo.component.scss',
  'lista-precios/lista-precios-costos/lista-precios-costos.component.scss',
  'nps/_nps.scss',
  'nps/encuestas/encuesta-editor.component.scss',
  'nps/encuestas/encuestas-lista.component.scss',
  'nps/resultados/resultados.component.scss',
  'nps/seguimiento/caso.component.scss',
  'nps/seguimiento/seguimiento-lista.component.scss',
  'nps/shell/nps-shell.component.scss',
  'proceso/variables/variables.component.scss',
  'proceso/variables/crear-variables/crear-variables.component.scss',
  'proceso/tipos-cliente/tipos-cliente.component.scss',
  'proceso/ocasiones/ocasiones.component.scss',
  'proceso/ocasiones/crear-ocasiones/crear-ocasiones.component.scss',
  'proceso/generos/generos.component.scss',
  'proceso/generos/crear-generos/crear-generos.component.scss',
  'proceso/canales/canales.component.scss',
  'proceso/canales/crear-canales/crear-canales.component.scss',
  'proceso/descuentos-promociones/descuentos-promociones.component.scss',
  'proceso/bodegas-por-canal/bodegas-por-canal.component.scss',
  'productos/crear-productos/especificaciones-producto/especificaciones-producto.component.scss',
  'productos/productos-dropshipping-config/productos-dropshipping-config.component.scss',
  'provider-dashboard/provider-dashboard/provider-dashboard.component.scss',
  'soporte/mis-tickets/mis-tickets.component.scss',
].map(f => C + f).concat([
  'agent-builder/library/library.component.scss',
  'agent-builder/monitoring/a2a-monitor.component.scss',
  'agent-builder/wizard/wizard.component.scss',
  'marketing/components/pauta-embudo/pauta-embudo.component.scss',
  'video-agent/components/appointments-list/appointments-list.component.scss',
].map(f => M + f));

// Pantalla que compila cada parcial.
const PANTALLA_DE = { [C + 'nps/_nps.scss']: C + 'nps/encuestas/encuestas-lista.component.scss' };

// Medida de antes del bloque (commit 0fdc5ca2), por carpeta: gradientes y primarios prohibidos.
const ANTES = {
  [C + 'kuvo']: { grad: 0, prim: 0 }, [C + 'lista-precios']: { grad: 0, prim: 0 }, [C + 'nps']: { grad: 0, prim: 0 },
  [C + 'proceso']: { grad: 0, prim: 0 }, [C + 'productos']: { grad: 0, prim: 0 },
  [C + 'provider-dashboard']: { grad: 0, prim: 0 }, [C + 'soporte']: { grad: 0, prim: 0 },
  [M + 'agent-builder']: { grad: 3, prim: 0 }, [M + 'marketing/components/pauta-embudo']: { grad: 0, prim: 0 },
  [M + 'video-agent/components/appointments-list']: { grad: 0, prim: 0 },
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

// ---------- pruebas de las funciones ----------

test('blancosLiterales detecta fondos y textos blancos, no rgba ni el SVG', () => {
  const scss = '.a { background: #fff; } .b { color: white !important; } .c { background-color: #FFFFFF } '
    + ".d { background: var(--ds-surface); color: var(--ds-on-accent); } .e { border: 1px solid #fff; } "
    + ".f { background: rgba(255,255,255,.25); } // background: #fff";
  assert.deepEqual(blancosLiterales(scss), ['background: #fff', 'color: white !important', 'background-color: #FFFFFF']);
});

test('acentoComoTexto separa el texto del relleno y reconoce $bxc-accent', () => {
  const scss = [
    '.a { color: $cfg-accent; }',
    '.b { color: $cfg-accent-ink; border-color: $cfg-accent-ink; }',
    '.c { background: $cfg-accent; border-color: $cfg-accent; color: var(--ds-on-accent); }',
    '.d { border-top-color: $cfg-accent; }',
    '.e { accent-color: $cfg-accent; }',
    '.f { stroke: $cfg-accent !important; }',
    '.g { color: $bxc-accent; }',
  ].join('\n');
  assert.deepEqual(acentoComoTexto(scss), ['color: $cfg-accent', 'border-top-color: $cfg-accent', 'stroke: $cfg-accent !important', 'color: $bxc-accent']);
});

test('superficieConTextoOscuro detecta texto literal oscuro sobre superficie de token', () => {
  const css = '.a { background: var(--ds-surface); color: #211F3A; } .b { background: var(--ds-surface); color: var(--ds-ink); } '
    + '.c { background: #fff; color: #211F3A; } .d { background: var(--ds-surface); color: #fff; }';
  assert.deepEqual(superficieConTextoOscuro(css), ['.a']);
});

test('fondosBlancosCompilados lista solo fondos blancos', () => {
  const css = '.a { background: #fff; } .b { background-color: white; } .c { background: var(--ds-surface); } .d { color: #fff; } .e { background: rgba(255,255,255,.2); }';
  assert.deepEqual(fondosBlancosCompilados(css), ['.a { background: #fff }', '.b { background-color: white }']);
});

// ---------- pruebas sobre los archivos ----------

// Blancos que se quedan, por archivo: se llenan con la justificación al lado.
const BLANCOS_QUE_QUEDAN = {};

test('1) sin blancos literales de superficie ni de texto en los archivos del bloque, salvo los nombrados', () => {
  const fallos = ARCHIVOS.flatMap(rel => {
    const n = blancosLiterales(leer(rel)).length;
    const permitidos = BLANCOS_QUE_QUEDAN[rel] ?? 0;
    return n === permitidos ? [] : [`${rel}: ${n} blancos, se esperaban ${permitidos}`];
  });
  assert.deepEqual(fallos, []);
});

test('2) el acento no es color de texto ni de borde fuera de un bloque con relleno de acento', () => {
  const fallos = ARCHIVOS.flatMap(rel => acentoComoTexto(leer(rel)).map(h => `${rel}: ${h}`));
  assert.deepEqual(fallos, []);
});

test('3) sin juegos oscuros propios en los archivos del bloque', () => {
  const fallos = ARCHIVOS.filter(rel => /dark-only|data-theme\s*=\s*["']?dark|\$dark-|lighten\(/.test(sinComentarios(leer(rel))));
  assert.deepEqual(fallos, []);
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
  const pantalla = PANTALLA_DE[rel] || rel;
  if (!cache.has(pantalla)) cache.set(pantalla, sass.compile(path.join(RAIZ, pantalla), OPCIONES).css);
  return cache.get(pantalla);
}

// Excepciones nombradas. Un caso nuevo hace fallar la prueba en vez de colarse.
const EXCEPCIONES_SUPERFICIE_TEXTO_OSCURO = new Set([]);

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

test('6) Ocasiones y las pantallas de proceso con el mixin no pintan ningún fondo #fff compilado', () => {
  const pantallas = [
    'proceso/ocasiones/ocasiones.component.scss', 'proceso/ocasiones/crear-ocasiones/crear-ocasiones.component.scss',
    'proceso/generos/generos.component.scss', 'proceso/generos/crear-generos/crear-generos.component.scss',
    'proceso/canales/canales.component.scss', 'proceso/canales/crear-canales/crear-canales.component.scss',
    'proceso/tipos-cliente/tipos-cliente.component.scss', 'proceso/variables/variables.component.scss',
    'proceso/variables/crear-variables/crear-variables.component.scss',
    'proceso/descuentos-promociones/descuentos-promociones.component.scss',
    'proceso/bodegas-por-canal/bodegas-por-canal.component.scss',
  ].map(f => C + f);
  const fallos = pantallas.flatMap(rel => fondosBlancosCompilados(compilar(rel)).map(h => `${rel}: ${h}`));
  assert.deepEqual(fallos, []);
});

test('6b) la base compartida config-pagina sigue sin fondos #fff (lo que pinta Ocasiones)', () => {
  const css = sass.compile(path.join(RAIZ, C + 'proceso/ocasiones/ocasiones.component.scss'), OPCIONES).css;
  assert.deepEqual(fondosBlancosCompilados(css), []);
});

test('7) bodegas-por-canal: superficies con tokens, sin variables propias de tema oscuro ni lighten()', () => {
  const rel = C + 'proceso/bodegas-por-canal/bodegas-por-canal.component.scss';
  const scss = sinComentarios(leer(rel));
  for (const v of ['--card-bg', '--tint-bg', '--input-bg', '--bodega-item-bg', '--bodega-assigned-bg', '--scrollbar-track', '--text-primary', '--text-muted']) {
    assert.ok(!scss.includes(v), `queda ${v}`);
  }
  assert.ok(!/lighten\(|\$dark-/.test(scss));
  const css = compilar(rel);
  assert.match(css, /\.bxc-panel\s*\{[^}]*background:\s*var\(--ds-surface\)/);
  assert.match(css, /\.form-select\s*\{[^}]*background-color:\s*var\(--ds-chip-bg\)/);
  assert.match(css, /\.bodega-item\s*\{[^}]*background:\s*var\(--ds-surface\)/);
  assert.match(css, /\.bodega-asignada\s*\{[^}]*background:\s*var\(--ds-chip-bg\)/);
});

module.exports = { blancosLiterales, acentoComoTexto, superficieConTextoOscuro, fondosBlancosCompilados };
