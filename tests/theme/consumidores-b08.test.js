'use strict';

// D-502 F2a (ticket 1180, tarea 4.1, bloque TEMA-B08): consumidores no sensibles de la base config-pagina que
// usaban $cfg-* directo o blancos propios (agenda, billing, cotizaciones, ecomerce, empresas, extras/zonas-cobro,
// flows e integrations). Solo presentación. Comprueba, sobre el .scss y sobre el CSS compilado:
//   1) sin blancos literales (#fff, #ffffff, white) como fondo ni como color de texto: las superficies van en
//      var(--ds-surface) y el texto sobre relleno en var(--ds-on-accent). Los blancos que quedan (rgba, el SVG
//      del interruptor) no son superficies;
//   2) $cfg-accent no es color de texto ni de borde fuera de un bloque con relleno de acento: ahí va
//      $cfg-accent-ink;
//   3) sin juegos oscuros propios (body.dark-only, :host-context(body.dark-only));
//   4) gradientes y primarios prohibidos no suben respecto a la medida de antes del bloque;
//   5) todos los archivos compilan con sass (a través de su pantalla) y ninguna regla tiene a la vez fondo de
//      superficie con token y texto literal oscuro (ilegible en oscuro), con las excepciones nombradas.
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

// Archivos del bloque. Los parciales (_*.scss) se compilan a través de la pantalla que los importa.
const ARCHIVOS = [
  'agenda/_agenda.scss',
  'agenda/cita-form/cita-form.component.scss',
  'agenda/cita-panel/cita-panel.component.scss',
  'agenda/config/agenda-config.component.scss',
  'agenda/pagina/agenda-page.component.scss',
  'billing/billing.component.scss',
  'cotizaciones/catalogos-link/_catalogo-link-comun.scss',
  'cotizaciones/catalogos-link/detalle/catalogo-link-detalle.component.scss',
  'cotizaciones/catalogos-link/lista/catalogos-link-lista.component.scss',
  'ecomerce/adiciones/adiciones.component.scss',
  'ecomerce/adiciones/lista/lista.component.scss',
  'ecomerce/categorias/categoria-atributos/categoria-atributos.component.scss',
  'ecomerce/categorias/list/list.component.scss',
  'empresas/crearEmpresa/crear-empresa/crear-empresa.component.scss',
  'empresas/modulovariable/campos-personalizados/campos-personalizados.component.scss',
  'extras/zonas-cobro/zonas-cobro.component.scss',
  'extras/zonas-cobro/crear-zonas-cobro/crear-zonas-cobro.component.scss',
  'flows/flow-diff/flow-diff.component.scss',
  'integrations/_integrations-directorio.scss',
  'integrations/_integrations-modal-combos.scss',
  'integrations/facturacion/facturacion-hub.component.scss',
  'integrations/integrations.component.scss',
  'integrations/mcp-guide/mcp-guide.component.scss',
  'integrations/messaging-lines/messaging-lines.component.scss',
  'integrations/siigo-config/siigo-config.component.scss',
].map(f => C + f);

// Pantalla que compila cada parcial.
const PANTALLA_DE = {
  [C + 'agenda/_agenda.scss']: C + 'agenda/cita-form/cita-form.component.scss',
  [C + 'cotizaciones/catalogos-link/_catalogo-link-comun.scss']: C + 'cotizaciones/catalogos-link/lista/catalogos-link-lista.component.scss',
  [C + 'integrations/_integrations-directorio.scss']: C + 'integrations/integrations-list.component.scss',
  [C + 'integrations/_integrations-modal-combos.scss']: C + 'integrations/integrations.component.scss',
};

// Medida de antes del bloque (commit 12e7c179), por carpeta: gradientes y primarios prohibidos.
const ANTES = {
  [C + 'agenda']: { grad: 0, prim: 0 }, [C + 'billing']: { grad: 0, prim: 0 },
  [C + 'cotizaciones/catalogos-link']: { grad: 0, prim: 0 }, [C + 'ecomerce/adiciones']: { grad: 0, prim: 0 },
  [C + 'ecomerce/categorias']: { grad: 0, prim: 0 }, [C + 'empresas']: { grad: 0, prim: 3 },
  [C + 'extras/zonas-cobro']: { grad: 0, prim: 0 }, [C + 'flows/flow-diff']: { grad: 0, prim: 0 },
  [C + 'integrations']: { grad: 4, prim: 0 },
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

// ---------- funciones puras ----------

const PROP_TEXTO = /^(color|-webkit-text-fill-color|caret-color|text-decoration-color|fill|stroke)$/;
const PROP_BORDE = /^(border(-(top|right|bottom|left))?(-color)?|outline(-color)?)$/;
const PROP_FONDO = /^(background|background-color)$/;
const BLANCO = /(?<![\w#-])(#fff(?:fff)?|white)(?![\w-])/i;

/** Declaraciones «prop: valor» de un .scss, con la posición del primer carácter del valor. */
function declaraciones(scss) {
  const texto = sinComentarios(scss);
  const lista = [];
  for (const m of texto.matchAll(/(^|[;{}\s])((?:-webkit-)?[a-z][a-z-]*)\s*:\s*([^;{}\n]+?)(?=\s*(?:;|\}|$))/gm)) {
    lista.push({ prop: m[2], valor: m[3], pos: m.index + m[1].length, texto });
  }
  return lista;
}

/** Bloque `{…}` que encierra la posición: sus declaraciones propias, sin las de subbloques. */
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

/** Blancos literales como fondo o texto («línea: prop: valor»). */
function blancosLiterales(scss) {
  return declaraciones(scss)
    .filter(d => (PROP_FONDO.test(d.prop) || PROP_TEXTO.test(d.prop)) && BLANCO.test(d.valor))
    .map(d => `${d.prop}: ${d.valor}`);
}

/** $cfg-accent (o $cb-accent) como texto o borde fuera de un bloque con relleno de acento. */
function acentoComoTexto(scss) {
  const ACENTO = /(\$cfg-accent|\$cb-accent)(?![\w-])/;
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
/** Reglas con fondo de superficie con token y texto en un hex oscuro: ilegibles en oscuro. */
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

// ---------- pruebas de las funciones ----------

test('blancosLiterales detecta fondos y textos blancos, no rgba ni el SVG', () => {
  const scss = '.a { background: #fff; } .b { color: white !important; } .c { background-color: #FFFFFF } '
    + ".d { background: var(--ds-surface); color: var(--ds-on-accent); } .e { border: 1px solid #fff; } "
    + ".f { background: rgba(255,255,255,.25); } .g { background-image: url(\"data:image/svg+xml,%3ccircle fill='white'/%3e\"); } // background: #fff";
  assert.deepEqual(blancosLiterales(scss), ['background: #fff', 'color: white !important', 'background-color: #FFFFFF']);
});

test('acentoComoTexto separa el texto del relleno', () => {
  const scss = [
    '.a { color: $cfg-accent; }',
    '.b { color: $cfg-accent-ink; border-color: $cfg-accent-ink; }',
    '.c { background: $cfg-accent; border-color: $cfg-accent; color: var(--ds-on-accent); }',
    '.d { border-color: $cfg-accent; }',
    '.e { accent-color: $cfg-accent; }',
    '.f { color: $cb-accent !important; }',
  ].join('\n');
  assert.deepEqual(acentoComoTexto(scss), ['color: $cfg-accent', 'border-color: $cfg-accent', 'color: $cb-accent !important']);
});

test('superficieConTextoOscuro detecta texto literal oscuro sobre superficie de token', () => {
  const css = '.a { background: var(--ds-surface); color: #211F3A; } .b { background: var(--ds-surface); color: var(--ds-ink); } '
    + '.c { background: #fff; color: #211F3A; } .d { background: var(--ds-surface); color: #fff; }';
  assert.deepEqual(superficieConTextoOscuro(css), ['.a']);
});

// ---------- pruebas sobre los archivos ----------

// Blancos que se quedan, por archivo: superficies cuyo texto es un literal oscuro sin token equivalente. Pasarlas a
// var(--ds-surface) dejaría texto oscuro sobre fondo oscuro. Se migran junto con su texto cuando haya token:
//   (.ig-search ya va en var(--ds-surface): su texto de entrada es var(--ds-ink); el ícono $cb-muted #6f6b8f queda literal.)
//   --kc-canvas (#f6f5fb, $cb-canvas) sigue literal: no hay token con ese valor claro; sus reglas con texto --kc-ink quedan
//   como pendiente de Daniel (token de canvas del modal).
//   integrations.component: .dk-btn--danger-ghost (#c0392f), .form-control del grupo de entrada (#1e293b),
//   .btn-secondary del pie (#334155) y .wc-webhook-box__url (#0d47a1), estilos heredados con paleta slate.
// Son pregunta abierta para Daniel (design-f2a.md): un token de texto fuerte (--ds-muted-strong) y la paleta slate.
const BLANCOS_QUE_QUEDAN = {
  [C + 'integrations/integrations.component.scss']: 4,
};

test('1) sin blancos literales de superficie ni de texto en los archivos del bloque, salvo los nombrados', () => {
  const fallos = ARCHIVOS.flatMap(rel => {
    const n = blancosLiterales(leer(rel)).length;
    const permitidos = BLANCOS_QUE_QUEDAN[rel] ?? 0;
    return n === permitidos ? [] : [`${rel}: ${n} blancos, se esperaban ${permitidos}`];
  });
  assert.deepEqual(fallos, []);
});

test('2) $cfg-accent no es color de texto ni de borde fuera de un bloque con relleno de acento', () => {
  const fallos = ARCHIVOS.flatMap(rel => acentoComoTexto(leer(rel)).map(h => `${rel}: ${h}`));
  assert.deepEqual(fallos, []);
});

test('2b) integrations: el acento de texto del asistente DIAN usa --kc-accent-texto y este toma $cfg-accent-ink', () => {
  const scss = sinComentarios(leer(C + 'integrations/integrations.component.scss'));
  assert.match(scss, /--kc-accent-texto:\s*#\{\$cfg-accent-ink\}/);
  const texto = [...scss.matchAll(/(?<![\w-])color:\s*var\(--kc-accent\)/g)];
  assert.equal(texto.length, 0, 'queda color: var(--kc-accent) como texto');
});

test('2c) los interruptores conservan la perilla blanca en los dos temas (on-accent, no surface)', () => {
  const combos = sinComentarios(leer(C + 'integrations/_integrations-modal-combos.scss'));
  assert.match(combos, /::before\s*\{[^}]*background:\s*var\(--ds-on-accent\)/);
  const comp = sinComentarios(leer(C + 'integrations/integrations.component.scss'));
  assert.equal([...comp.matchAll(/border-radius:\s*50%;\s*background:\s*var\(--ds-on-accent\)/g)].length, 2);
});

test('3) sin juegos oscuros propios en los archivos del bloque', () => {
  const fallos = ARCHIVOS.filter(rel => /dark-only/.test(sinComentarios(leer(rel))));
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
//   .ig-page .ig-search: el color literal $cb-muted (#6f6b8f) solo pinta el ícono y el placeholder (3,6:1 sobre la
//   superficie oscura); el texto que escribe la persona va en var(--ds-ink).
const EXCEPCIONES_SUPERFICIE_TEXTO_OSCURO = new Set(['.ig-page .ig-search']);

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

test('5b) el CSS compilado no deja var(--ds-*) sin cerrar ni tokens inexistentes', () => {
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

module.exports = { blancosLiterales, acentoComoTexto, superficieConTextoOscuro };
