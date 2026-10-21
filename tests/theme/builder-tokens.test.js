'use strict';

// D-502 F2b (ticket 1180, tarea 4.2, bloque TEMA-B11): juego oscuro de --kb-* en _katuq-builder.scss y
// blancos de superficie de sitios-lista. Solo presentación. Comprueba, sobre el CSS compilado:
//   1) el mixin kb-tokens(true) define el oscuro con `body.dark-only &` y TODO valor es var(--ds-*) existente
//      (sin hex propios); las únicas excepciones sin oscuro son las de negocio (acento, degradado, sombras);
//   2) cada --kb-* de color tiene oscuro salvo esas excepciones, y el oscuro no inventa variables;
//   3) el oscuro es opt-in: sin argumento (editor, marca, métricas, selector) no emite reglas dark-only;
//   4) sitios-lista: los #fff de superficie pasan a var(--kb-surface); quedan solo los de la miniatura y la
//      vista previa de la tienda del comercio, la perilla y el texto sobre el acento;
//   5) contraste: texto (ink, ink-2, body, muted, accent-ink, ok, warn, danger) ≥ 4,5:1 sobre canvas, surface y
//      surface-2 en oscuro; el claro de --kb-surface sigue siendo #fff (claro idéntico);
//   6) los gradientes del builder y de sitios-lista no suben (0 y 0: el degradado va por --kb-accent-grad).
// «Claro idéntico» entre commits: tests/theme/comparar-claro.js (resuelve --ds-*, no --kb-*; ver design-f2b.md).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const postcss = require('postcss');

const RAIZ = path.resolve(__dirname, '../..');
const NM = path.join(RAIZ, 'node_modules');
const BASE = 'src/app/shared/styles/_katuq-builder.scss';
const LISTA = 'src/app/components/sitios/lista/sitios-lista.component.scss';
const OPT_OUT = [
  'src/app/components/sitios/editor/sitio-editor.component.scss',
  'src/app/components/sitios/marca/marca.component.scss',
  'src/app/components/sitios/metricas/metricas.component.scss',
  'src/app/components/sitios/selector-productos/selector-productos.component.scss',
];

// Sin oscuro propio por decisión de negocio (design-f2b.md §2).
const EXCEPCIONES = new Set([
  '--kb-font', '--kb-accent', '--kb-accent-grad',
  '--kb-shadow-modal', '--kb-shadow-frame', '--kb-shadow-thumb', '--kb-shadow-accent', '--kb-shadow-accent-sm', '--kb-shadow-pill',
]);

const OPCIONES = {
  style: 'expanded', loadPaths: [path.join(RAIZ, 'src'), NM], logger: sass.Logger.silent,
  importers: [{ findFileUrl: url => (url.startsWith('~') ? pathToFileURL(path.join(NM, url.slice(1))) : null) }],
};
const compilar = rel => sass.compile(path.join(RAIZ, rel), OPCIONES).css;
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

function tokensDs() {
  const css = sass.compile(path.join(RAIZ, 'src/app/shared/styles/_theme-tokens.scss'), OPCIONES).css;
  const claro = {}; const oscuro = {};
  postcss.parse(css).walkRules(r => {
    const dst = r.selector.trim() === ':root' ? claro : r.selector.trim() === 'body.dark-only' ? oscuro : null;
    if (dst) r.walkDecls(d => { if (d.prop.startsWith('--ds-')) dst[d.prop] = d.value.trim(); });
  });
  return { claro, oscuro };
}

// Variables --kb-* del claro y del oscuro de un consumidor compilado.
function juegosKb(css) {
  const claro = {}; const oscuro = {}; let reglasOscuras = 0;
  postcss.parse(css).walkRules(r => {
    const oscura = r.selector.split(',').every(s => s.trim().startsWith('body.dark-only '));
    if (oscura) reglasOscuras++;
    r.walkDecls(d => {
      if (!d.prop.startsWith('--kb-')) return;
      const esMixin = /(^|, )(:host|\.velo|\.fondo)$/.test(r.selector.split(',')[0].replace(/^body\.dark-only /, '').trim());
      if (!esMixin) return;
      (oscura ? oscuro : claro)[d.prop] = d.value.trim();
    });
  });
  return { claro, oscuro, reglasOscuras };
}

const ch = h => { const x = h.replace('#', ''); return x.length === 3 ? x.split('').map(c => c + c).join('') : x; };
function lum(hex) {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(ch(hex).slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const lista = compilar(LISTA);
const kb = juegosKb(lista);
const ds = tokensDs();

test('1) el oscuro de --kb-* es solo var(--ds-*) y usa tokens que existen', () => {
  const nombres = Object.keys(kb.oscuro);
  assert.ok(nombres.length >= 38, `se esperaban ≥ 38 variables oscuras, hay ${nombres.length}`);
  for (const [prop, valor] of Object.entries(kb.oscuro)) {
    const m = /^var\((--ds-[a-z0-9-]+)\)$/.exec(valor);
    assert.ok(m, `${prop}: «${valor}» no es var(--ds-*)`);
    assert.ok(m[1] in ds.oscuro && m[1] in ds.claro, `${prop}: ${m[1]} no existe en _theme-tokens.scss`);
  }
});

test('2) cada --kb-* tiene oscuro salvo las excepciones de negocio, y no se inventan variables', () => {
  const sinOscuro = Object.keys(kb.claro).filter(p => !(p in kb.oscuro) && !EXCEPCIONES.has(p));
  assert.deepEqual(sinOscuro, [], 'variables claras sin oscuro ni excepción');
  const inventadas = Object.keys(kb.oscuro).filter(p => !(p in kb.claro));
  assert.deepEqual(inventadas, []);
  for (const e of EXCEPCIONES) {
    assert.ok(e in kb.claro, `${e} desapareció del claro`);
    assert.ok(!(e in kb.oscuro), `${e} es excepción de negocio y no lleva oscuro`);
  }
  assert.equal(kb.claro['--kb-accent'].toLowerCase(), '#6a4dfb');
  assert.equal(kb.oscuro['--kb-accent-ink'], 'var(--ds-accent-ink)');
  assert.equal(kb.oscuro['--kb-accent-text'], 'var(--ds-accent-ink)');
});

test('3) el oscuro es opt-in: los otros consumidores del mixin no emiten reglas dark-only', () => {
  for (const rel of OPT_OUT) {
    const css = compilar(rel);
    assert.ok(!/body\.dark-only/.test(css), `${rel} no debe tener reglas dark-only hasta migrar sus blancos`);
    assert.ok(/--kb-surface:\s*#fff/.test(css), `${rel} conserva el juego claro`);
  }
  assert.ok(kb.reglasOscuras >= 1, 'sitios-lista debe emitir el juego oscuro');
  assert.ok(/body\.dark-only :host,\s*body\.dark-only \.velo/.test(lista), 'cubre :host y el velo que cuelga del body');
  assert.match(leer(LISTA), /@include kb-tokens\(true\)/);
});

test('3b) el claro de los consumidores no cambia: --kb-* claro igual al de antes', () => {
  assert.equal(kb.claro['--kb-surface'], '#fff');
  assert.equal(kb.claro['--kb-canvas'], '#ecebf4');
  assert.equal(kb.claro['--kb-ink'], '#211d33');
  assert.equal(kb.claro['--kb-accent-grad'], '#5F3FE0');
  assert.equal(kb.claro['--kb-accent-fg'], '#6a4dfb');
  const fijos = { '--kb-ink-2': '#5b5772', '--kb-muted': '#8b879f', '--kb-chip': '#f5f4fb', '--kb-accent-ink': '#5537e8',
    '--kb-accent-wash': '#f4f0ff', '--kb-accent-tile': '#e7e0fe', '--kb-accent-text': '#5b4fa0', '--kb-ok': '#16a34a',
    '--kb-warn': '#e08a1e', '--kb-danger': '#d3355c', '--kb-danger-wash': '#fdf1f4' };
  for (const [p, v] of Object.entries(fijos)) assert.equal(kb.claro[p], v, `${p} claro cambió`);
});

test('4) sitios-lista: los #fff de superficie pasan a var(--kb-surface); quedan solo los de la tienda del comercio', () => {
  const fuente = leer(LISTA).split('\n');
  const blancos = [];
  fuente.forEach((l, i) => { if (/(background|color)\s*:\s*#fff\s*;/i.test(l)) blancos.push(i + 1); });
  // Selectores compilados que pueden conservar #fff: miniatura y vista previa de la tienda del comercio,
  // perilla de la palanca y texto sobre el acento. Cualquier otro #fff es una superficie sin migrar.
  const permitidos = new Set([
    ':host,\n.velo|--kb-surface', '.btn-primario|color', '.mock|background', '.mock__url|background', '.mock__pagina|background',
    '.plantilla__muestra|background', '.plantilla__hero-barra|background', '.plantilla__check|color',
    '.palanca span|background', '.vista-creacion__marco|background',
  ]);
  const encontrados = new Set();
  postcss.parse(lista).walkRules(r => r.walkDecls(d => { if (/^#fff$/i.test(d.value.trim())) encontrados.add(`${r.selector}|${d.prop}`); }));
  assert.deepEqual([...encontrados].sort(), [...permitidos].sort(), '#fff literales fuera de la lista permitida');
  assert.equal(blancos.length, 8, `quedan ${blancos.length} #fff literales: ${blancos.join(', ')}`);
  const vars = fuente.filter(l => /background:\s*var\(--kb-surface\);/.test(l)).length;
  assert.ok(vars >= 7, `se esperaban >= 7 fondos var(--kb-surface), hay ${vars}`);
  const fondos = {};
  postcss.parse(lista).walkRules(r => r.walkDecls('background', d => { (fondos[r.selector] ||= []).push(d.value); }));
  for (const sel of ['.vacio', '.pagina', '.plantilla', '.opcion', '.opcion-grande', '.objetivo', '.enlace__copiar']) {
    assert.ok((fondos[sel] || []).includes('var(--kb-surface)'), `${sel} debe usar var(--kb-surface)`);
  }
});

test('4b) la base del builder: los #fff de superficie del mixin pasan a var(--kb-surface)', () => {
  const css = leer(BASE);
  const sueltos = css.split('\n').filter(l => /background:\s*#fff;/.test(l));
  assert.deepEqual(sueltos, [], 'quedan fondos #fff literales en _katuq-builder.scss');
  assert.ok((css.match(/background:\s*var\(--kb-surface\);/g) || []).length >= 6);
});

test('5) contraste en oscuro: texto ≥ 4,5:1 sobre canvas, surface y surface-2', () => {
  const res = v => ds.oscuro[/^var\((--ds-[a-z0-9-]+)\)$/.exec(v)[1]];
  const fondos = ['--kb-canvas', '--kb-surface', '--kb-surface-2'].map(p => res(kb.oscuro[p]));
  const textos = ['--kb-ink', '--kb-ink-2', '--kb-body', '--kb-muted', '--kb-muted-2', '--kb-muted-3', '--kb-accent-ink',
    '--kb-accent-text', '--kb-accent-fg', '--kb-ok', '--kb-warn', '--kb-danger'];
  for (const t of textos) {
    for (const f of fondos) {
      const c = contraste(res(kb.oscuro[t]), f);
      assert.ok(c >= 4.5, `${t} ${res(kb.oscuro[t])} sobre ${f}: ${c.toFixed(2)}:1`);
    }
  }
  // Textos de estado sobre su propio fondo suave.
  for (const [t, w] of [['--kb-ok', '--kb-ok-wash'], ['--kb-warn', '--kb-warn-wash'], ['--kb-danger', '--kb-danger-wash'],
    ['--kb-accent-ink', '--kb-accent-wash']]) {
    const c = contraste(res(kb.oscuro[t]), res(kb.oscuro[w]));
    assert.ok(c >= 4.5, `${t} sobre ${w}: ${c.toFixed(2)}:1`);
  }
});

test('6) los gradientes no suben (0 en el builder, 0 en sitios-lista) y no hay primarios paralelos nuevos', () => {
  const grad = /(linear|radial)-gradient\(/g;
  assert.equal((leer(BASE).match(grad) || []).length, 0);
  assert.equal((leer(LISTA).match(grad) || []).length, 0);
  const prohibidos = /#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b/i;
  assert.ok(!prohibidos.test(leer(BASE)) && !prohibidos.test(leer(LISTA)));
});

test('7) el oscuro del mixin no escribe hex propios', () => {
  const fuente = leer(BASE);
  const i = fuente.indexOf('@if $oscuro');
  const j = fuente.indexOf('@mixin kb-keyframes');
  assert.ok(i > 0 && j > i);
  const bloque = fuente.slice(i, j);
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(bloque.replace(/\/\/.*$/gm, '')), 'hex literal dentro del bloque oscuro');
});

test('8) sitios-lista: los textos y fondos propios no quedan en literal oscuro/claro en el oscuro', () => {
  const css = lista;
  // En claro, cada --sl-* conserva su literal; en oscuro, todos son var(--ds-*) existentes.
  const claro = {}; const oscuro = {};
  postcss.parse(css).walkRules(r => {
    const oscura = r.selector.split(',').every(s => s.trim().startsWith('body.dark-only '));
    r.walkDecls(d => { if (d.prop.startsWith('--sl-')) (oscura ? oscuro : claro)[d.prop] = d.value.trim(); });
  });
  assert.ok(Object.keys(claro).length >= 13);
  assert.deepEqual(Object.keys(oscuro).sort(), Object.keys(claro).sort(), 'cada --sl-* necesita oscuro');
  for (const [p, v] of Object.entries(oscuro)) {
    const m = /^var\((--ds-[a-z0-9-]+)\)$/.exec(v);
    assert.ok(m && m[1] in ds.oscuro, `${p}: «${v}» no es un --ds-* existente`);
  }
  assert.equal(claro['--sl-ink'], '#211f3a');
  assert.equal(claro['--sl-libre'], '#137a3a');
  assert.equal(claro['--sl-ocupada'], '#b42318');
  // Ninguna regla fuera de los juegos de tokens escribe un color de texto literal (salvo blanco sobre acento).
  const sueltos = [];
  postcss.parse(css).walkRules(r => {
    if (r.selector.includes('dark-only') || /^:host,\s*\.velo$/.test(r.selector)) return;
    r.walkDecls('color', d => { if (/^#[0-9a-f]{3,8}$/i.test(d.value.trim()) && !/^#fff$/i.test(d.value.trim())) sueltos.push(`${r.selector} ${d.value}`); });
  });
  assert.deepEqual(sueltos, [], 'colores de texto literales sin oscuro');
  // El enlace y la etiqueta de acento suben a accent-ink en oscuro: >= 4,5:1 sobre surface y sobre su wash.
  const res = v => ds.oscuro[/^var\((--ds-[a-z0-9-]+)\)$/.exec(v)[1]];
  for (const [t, f] of [['--sl-enlace', '--sl-fondo-frase'], ['--sl-enlace', '--sl-recomendada-bg'], ['--sl-ink', '--sl-fondo-frase'],
    ['--sl-nota', '--sl-fondo-frase'], ['--sl-libre', '--sl-fondo-frase'], ['--sl-ocupada', '--sl-fondo-frase'],
    ['--sl-pill-ok', '--sl-pill-ok-bg'], ['--sl-pill-cero', '--sl-pill-cero-bg']]) {
    const c = contraste(res(oscuro[t]), res(oscuro[f]));
    assert.ok(c >= 4.5, `${t} sobre ${f}: ${c.toFixed(2)}:1`);
  }
});
