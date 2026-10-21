'use strict';

// D-502 F2c (ticket 1180, tarea 4.3, bloque TEMA-B12): _katuq-modal.scss, los cinco widgets de pago/cierre de
// caja de POS2 y el modal Opinar sobre los tokens --ds-*. Solo presentación, solo .scss. Comprueba:
//   1) claro idéntico: las líneas del CSS claro (con las variables --kc-*/--km-* resueltas) son iguales a las del
//      commit c18c863b (fixture), en cada uno de los seis consumidores;
//   2) el oscuro: cada --km-* tiene su par oscuro y todos los pares son var(--ds-*) existentes; los juegos
//      se emiten con :host-context(body.dark-only) (el modal cuelga del <body>);
//   3) contraste en oscuro >= 4,5:1 de los textos y >= 3:1 del texto del botón sobre el relleno de acento;
//   4) sin blancos literales como fondo ni como texto fuera de la impresión, y sin texto con hex oscuro suelto
//      (salvo el que se queda en la impresión);
//   5) los gradientes y primarios prohibidos no suben (0 y 0) y la entrada de styles.scss no pinta colores;
//   6) lo que NO se toca: el CSS de impresión queda con sus literales (el papel es blanco).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, FIXTURE, compilar, lineasClaro, tokensDe, resolverPropias, RAIZ } = require('./modal-claro');

const MODAL = 'src/app/shared/styles/_katuq-modal.scss';
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const tokensClaros = tokensDe(RAIZ);
const tokensOscuros = leerTokens(compilar('src/app/shared/styles/_theme-tokens.scss', RAIZ), 'oscuro');
const css = Object.fromEntries(ARCHIVOS.map(a => [a, compilar(a, RAIZ)]));

function lum(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const dsOscuro = v => { const m = /^var\(--ds-([\w-]+)\)$/.exec(v); assert.ok(m, `«${v}» no es var(--ds-*)`); assert.ok(tokensOscuros.has(m[1]), `--ds-${m[1]} no existe`); return tokensOscuros.get(m[1]); };

/** Definiciones oscuras (:host-context(body.dark-only)) del CSS compilado de un consumidor. */
function oscuras(c) {
  const mapa = new Map();
  postcss.parse(c).walkRules(r => {
    if (!r.selectors.every(s => s.includes('body.dark-only'))) return;
    r.walkDecls(/^--(kc|km)-/, d => mapa.set(d.prop, d.value.trim()));
  });
  return mapa;
}
function claras(c) {
  const mapa = new Map();
  postcss.parse(c).walkRules(r => {
    if (r.selectors.some(s => s.includes('dark-only'))) return;
    r.walkDecls(/^--km-/, d => mapa.set(d.prop, d.value.trim()));
  });
  return mapa;
}

for (const a of ARCHIVOS) {
  test(`1) claro idéntico: ${path.basename(a)}`, () => {
    const res = compararLineas(fixture.archivos[a], lineasClaro(css[a], tokensClaros));
    assert.deepEqual(res.soloBase, [], 'declaraciones claras que desaparecieron');
    assert.deepEqual(res.soloActual, [], 'declaraciones claras nuevas');
    assert.equal(res.ordenCambio, false, 'cambió el orden (la cascada)');
  });
}

test('1b) la resolución de variables detecta un cambio de color en claro', () => {
  const a = '.x { --km-a: #fff; } .y { color: var(--km-a); }';
  const b = '.x { --km-a: #eee; } .y { color: var(--km-a); }';
  const la = lineasClaro(a, new Map()); const lb = lineasClaro(b, new Map());
  assert.equal(compararLineas(la, lb).igual, false);
  assert.equal(compararLineas(la, lineasClaro('.y { color: #ffffff; }', new Map())).igual, true);
  assert.match(resolverPropias('.x { --kc-a: var(--kc-b); --kc-b: red; } .y { color: var(--kc-a); }'), /color: red/);
});

test('2) oscuro: cada --km-* claro tiene su par oscuro y todos son var(--ds-*) existentes', () => {
  const a = ARCHIVOS[0];
  const cl = claras(css[a]); const os = oscuras(css[a]);
  assert.ok(cl.size >= 35, `solo ${cl.size} variables --km-* claras`);
  for (const k of cl.keys()) assert.ok(os.has(k), `${k} no tiene valor oscuro`);
  for (const [k, v] of os) dsOscuro(v);
  for (const k of ['--kc-accent', '--kc-accent-texto', '--kc-ink', '--kc-ink2', '--kc-muted', '--kc-muted2', '--kc-line', '--kc-line2',
    '--kc-canvas', '--kc-surface', '--kc-green', '--kc-green-wash', '--kc-blue', '--kc-blue-wash', '--kc-orange', '--kc-red', '--kc-red-wash']) {
    assert.ok(os.has(k), `${k} sin par oscuro`);
  }
  // El juego oscuro es el mismo en los seis consumidores que usan el mixin.
  for (const w of ARCHIVOS.slice(0, 5)) assert.deepEqual([...oscuras(css[w])].sort(), [...os].sort(), w);
});

test('2b) el oscuro cuelga de :host-context(body.dark-only), nunca de "body.dark-only :host"', () => {
  for (const w of ARCHIVOS.slice(0, 5)) {
    assert.ok(/:host-context\(body\.dark-only\)\s*\{/.test(css[w]), w);
    assert.ok(!/body\.dark-only\s+:host(?![-\w])/.test(css[w]), w);
  }
  assert.ok(!/body\.dark-only/.test(leer(MODAL).replace(/\/\/.*$/gm, '').replace(/:host-context\(body\.dark-only\)/g, '')),
    'el mixin escribe body.dark-only fuera de :host-context');
});

test('3) contraste en oscuro: textos >= 4,5:1 sobre surface y surface-2, y botón primario', () => {
  const os = oscuras(css[ARCHIVOS[0]]);
  const val = k => dsOscuro(os.get(k));
  const fondos = [tokensOscuros.get('surface'), tokensOscuros.get('surface-2')];
  const textos = ['--kc-ink', '--kc-ink2', '--kc-muted', '--kc-muted2', '--kc-accent-texto', '--kc-green', '--kc-blue', '--kc-orange',
    '--kc-red', '--km-slate', '--km-gray-600', '--km-gray-700', '--km-gray-333', '--km-gray-666', '--km-blue', '--km-royal', '--km-green-t', '--km-red-t',
    '--km-purple', '--km-subtle', '--km-faint', '--km-faint-2', '--km-placeholder', '--km-info-ink', '--km-warn-ink'];
  for (const t of textos) for (const f of fondos) {
    const c = contraste(val(t), f);
    assert.ok(c >= 4.5, `${t} ${val(t)} sobre ${f}: ${c.toFixed(2)}:1`);
  }
  // Texto sobre su fondo suave.
  for (const [t, f] of [['--kc-green', '--kc-green-wash'], ['--kc-blue', '--kc-blue-wash'], ['--kc-orange', '--kc-orange-wash'],
    ['--kc-red', '--kc-red-wash'], ['--kc-accent-texto', '--kc-accent-wash'], ['--km-disabled-ink', '--km-disabled-bg']]) {
    const c = contraste(val(t), val(f));
    assert.ok(c >= 4.5, `${t} sobre ${f}: ${c.toFixed(2)}:1`);
  }
  // Texto de los botones sobre el relleno de acento (--ds-on-accent sobre --ds-accent).
  const cb = contraste(tokensOscuros.get('on-accent'), tokensOscuros.get('accent'));
  assert.ok(cb >= 4.5, `on-accent sobre accent: ${cb.toFixed(2)}:1`);
  // El relleno del carril y de los chips debe distinguirse de la superficie.
  assert.ok(contraste(val('--kc-line'), tokensOscuros.get('surface')) >= 1.05);
});

test('4) sin blancos literales de fondo ni de texto fuera de la impresión', () => {
  const sueltos = [];
  for (const a of ARCHIVOS) {
    postcss.parse(css[a]).walkDecls(d => {
      if (d.parent.parent && d.parent.parent.type === 'atrule' && d.parent.parent.name === 'media' && /print/.test(d.parent.parent.params)) return;
      if (/^(background|background-color|color)$/.test(d.prop) && /(?<![\w#-])(#fff(?:fff)?|white)(?![\w-])/i.test(d.value) && !/gradient|url\(/.test(d.value)) {
        sueltos.push(`${path.basename(a)} ${d.parent.selector} { ${d.prop}: ${d.value} }`);
      }
    });
  }
  assert.deepEqual(sueltos, []);
});

test('4b) sin texto con hex oscuro suelto fuera de la impresión', () => {
  const sueltos = [];
  for (const a of ARCHIVOS) {
    postcss.parse(css[a]).walkDecls('color', d => {
      const p = d.parent.parent;
      if (p && p.type === 'atrule' && /print/.test(p.params)) return;
      const v = d.value.trim();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) && lum(v) < 0.25) sueltos.push(`${path.basename(a)} ${d.parent.selector} { color: ${v} }`);
    });
  }
  assert.deepEqual(sueltos, []);
});

test('5) gradientes y primarios prohibidos: 0 y 0; styles.scss no pinta colores en .katuq-modal', () => {
  const grad = /(linear|radial)-gradient\(/g;
  const prim = /#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(\s*102\s*,\s*126\s*,\s*234/gi;
  for (const rel of [MODAL, ...ARCHIVOS]) {
    const t = leer(rel);
    assert.equal((t.match(grad) || []).length, 0, rel);
    assert.equal((t.match(prim) || []).length, 0, rel);
  }
  const estilos = leer('src/styles.scss');
  const i = estilos.indexOf('.katuq-modal .modal-content');
  const bloque = estilos.slice(i, estilos.indexOf('@media (max-width: 640px)', i) + 200);
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(bloque), 'la entrada de .katuq-modal en styles.scss tiene hex literal');
});

test('6) la impresión no se toca: cierre de caja e historial conservan sus literales en @media print', () => {
  for (const [a, minimo] of [[ARCHIVOS[3], 8], [ARCHIVOS[4], 4]]) {
    let negro = 0;
    postcss.parse(css[a]).walkAtRules('media', m => {
      if (!/print/.test(m.params)) return;
      m.walkDecls(d => { if (/#000|black|white|#fff|#f0f0f0|#f9f9f9/i.test(d.value)) negro++; });
    });
    assert.ok(negro >= minimo, `${path.basename(a)}: la impresión perdió literales (${negro})`);
    postcss.parse(css[a]).walkAtRules('media', m => {
      if (!/print/.test(m.params)) return;
      m.walkDecls(d => assert.ok(!/var\(--(km|ds)-/.test(d.value), `${d.parent.selector} usa tokens en la impresión`));
    });
  }
});
