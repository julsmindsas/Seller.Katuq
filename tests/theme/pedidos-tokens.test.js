'use strict';

// D-502 F3 (ticket 1180, tarea 4.4.1, bloque TEMA-B13): «Todos los pedidos» (ventas/list/list.component.scss)
// sobre los tokens --ds-*. Solo presentación, solo .scss. Comprueba:
//   1) claro idéntico frente al fixture de 563317bb (3622 declaraciones, normalizadas como comparar-claro);
//   2) los $pd-* de color pasaron a var(--ds-*): solo queda $pd-muted-2 (#9995b3, sin token) y las definiciones;
//   3) los blancos de superficie ya no son literales (el único #fff como fondo era .p-... de tarjetas: ninguno);
//      el texto blanco que queda es el de avatares y puntos de estado sobre un relleno propio;
//   4) todo var(--ds-X) usado existe en el tema claro y en el oscuro;
//   5) trampa span.ng-star-inserted: el desglose del subtítulo tiene color propio en oscuro y no en claro;
//   6) gradientes (3) y primarios prohibidos (0) no suben; ninguna clase nueva con «p-».

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const postcss = require('postcss');
const { normalizarCss, compararLineas, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const REL = 'src/app/components/ventas/list/list.component.scss';
const fuente = fs.readFileSync(path.join(RAIZ, REL), 'utf8');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pedidos-claro-563317bb.json'), 'utf8'));
const nm = path.join(RAIZ, 'node_modules');
const compilar = rel => sass.compile(path.join(RAIZ, rel), {
  style: 'expanded',
  loadPaths: [path.join(RAIZ, 'src'), nm],
  importers: [{ findFileUrl: u => (u.startsWith('~') ? pathToFileURL(path.join(nm, u.slice(1))) : null) }],
  logger: sass.Logger.silent,
}).css;
const css = compilar(REL);
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
// Parte nueva de la hoja: desde las variables $pd-* (rediseño 1b).
const zona = fuente.slice(fuente.indexOf('$pd-accent:'));

test('1) claro idéntico al de 563317bb', () => {
  const actual = normalizarCss(css, claros, 'claro');
  assert.equal(actual.length, fixture.lineas.length, 'cambió la cantidad de declaraciones');
  const d = compararLineas(fixture.lineas, actual);
  assert.deepEqual([d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [[], []]);
});

test('2) los $pd-* de color pasaron a tokens', () => {
  const usos = zona.split('\n').filter(l => !/^\$pd-/.test(l) && !/^\s*\/\//.test(l)).join('\n').match(/\$pd-[\w-]+/g) || [];
  assert.ok(usos.length > 0);
  assert.deepEqual([...new Set(usos)], ['$pd-muted-2']);
});

test('3) sin blancos de superficie literales', () => {
  const sinTexto = zona.split('\n').filter(l => /(^|[\s;{])(background(-color)?)\s*:\s*(#fff|#ffffff|white)\b/i.test(l));
  assert.deepEqual(sinTexto, []);
  const blancos = zona.split('\n').filter(l => /(^|[\s;{])color\s*:\s*(#fff|#ffffff)\b/i.test(l));
  assert.ok(blancos.length <= 5, `texto blanco literal: ${blancos.length}`);
});

test('4) cada var(--ds-*) existe en claro y en oscuro', () => {
  const nombres = new Set([...zona.matchAll(/var\(--ds-([\w-]+)\)/g)].map(m => m[1]));
  assert.ok(nombres.size >= 15);
  for (const n of nombres) {
    assert.ok(claros.has(n), `--ds-${n} falta en claro`);
    assert.ok(oscuros.has(n), `--ds-${n} falta en oscuro`);
  }
});

test('5) el desglose del subtítulo tiene color propio solo en oscuro', () => {
  const raiz = postcss.parse(css);
  let claro = false;
  let oscuro = null;
  raiz.walkRules(r => {
    if (!r.selectors.some(s => /(^|\s)\.pedidos-desglose(\s|$|\[)/.test(s.replace(/\[[^\]]*\]/g, '')))) return;
    r.walkDecls('color', d => {
      if (r.selectors.some(s => /dark-only/.test(s))) oscuro = d.value; else claro = true;
    });
  });
  assert.equal(claro, false, 'el claro no debe cambiar');
  assert.equal(oscuro, 'var(--ds-muted)');
});

test('6) gradientes y primarios prohibidos no suben; sin clases nuevas con «p-»', () => {
  assert.ok((fuente.match(/(linear|radial)-gradient\(/g) || []).length <= 3);
  assert.equal((fuente.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(102,\s*126,\s*234/gi) || []).length, 0);
  const nuevas = (zona.match(/(?<![\w-])\.(?:[\w-]*p-[\w-]*)/g) || []).filter(c => !/^\.p-/.test(c));
  // Las clases con «p-» que ya existían antes de este bloque (563317bb); ninguna más.
  const previas = ['.metric-chip-sm', '.metric-chip-compact', '.fvp-titulo', '.fvp-aviso', '.fvp-tabla', '.fvp-producto',
    '.fvp-totales', '.fvp-informativa', '.fvp-fuerte', '.fvp-pagar'];
  assert.deepEqual([...new Set(nuevas)].filter(c => !previas.includes(c)), []);
});
