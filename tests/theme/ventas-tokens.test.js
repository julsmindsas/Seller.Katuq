'use strict';

// D-502 F3 (ticket 1180, tarea 4.4.2, bloque TEMA-B14): crear venta y venta asistida sobre los tokens --ds-*.
// Solo presentación, solo .scss. Comprueba contra el fixture de 5a1982da:
//   1) claro idéntico (normalizado como comparar-claro); lo único nuevo es --primary-ink, con el valor claro de --primary-color;
//   2) sin fondos blancos literales (los gradientes con #fff no cuentan: no son fondo plano);
//   3) las variables propias (:root / :host) tienen su par oscuro con var(--ds-*) existentes en los dos temas;
//   4) el texto con --primary-color pasó a --primary-ink, que en oscuro es accent-ink;
//   5) gradientes y primarios prohibidos no suben.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, compilar, lineasClaro } = require('./ventas-claro');

const RAIZ = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'ventas-claro-5a1982da.json'), 'utf8'));
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
const fuente = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const CON_RAIZ = ARCHIVOS.filter(f => /crear-ventas\.component|checkout\.component|ecomerce-products/.test(f));
const TECHO = { // gradientes y primarios prohibidos de 5a1982da
  'venta-asistida-unica.component.scss': [2, 0],
  'ecomerce-products.component.scss': [2, 2],
};

test('1) claro idéntico al de 5a1982da', () => {
  // La foto de D-520 ya trae --primary-ink (el commit de D-520 lo definía en :root), así que el claro es idéntico sin ajustes.
  for (const f of ARCHIVOS) {
    const d = compararLineas(fixture.archivos[f], lineasClaro(f));
    assert.deepEqual([f, d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [f, [], []]);
  }
});

test('2) sin fondos blancos literales', () => {
  for (const f of ARCHIVOS) {
    const malas = fuente(f).split('\n').filter(l => /\bbackground(-color)?:\s*(#fff|#ffffff|white)\s*(!important)?\s*[;}]/i.test(l));
    assert.deepEqual([f, malas], [f, []]);
  }
});

test('3) las variables propias tienen par oscuro con tokens que existen', () => {
  for (const f of CON_RAIZ) {
    const t = fuente(f);
    const i = t.indexOf(':host-context(body.dark-only) {');
    assert.ok(i > 0, `${f}: sin bloque oscuro`);
    const bloque = t.slice(i, t.indexOf('\n}', i));
    for (const v of ['--primary-color', '--primary-ink', '--gray-200', '--gray-700', '--success-color', '--danger-color']) {
      assert.match(bloque, new RegExp(`${v}:\\s*var\\(--ds-`), `${f}: falta ${v}`);
    }
    for (const [, n] of bloque.matchAll(/var\(--ds-([\w-]+)\)/g)) {
      assert.ok(claros.has(n) && oscuros.has(n), `${f}: --ds-${n} no existe en los dos temas`);
    }
  }
});

test('4) el texto con --primary-color usa --primary-ink', () => {
  for (const f of CON_RAIZ) {
    const malas = fuente(f).split('\n').filter(l => /(^|[\s;{])color:\s*var\(--primary-color/.test(l));
    assert.deepEqual([f, malas], [f, []]);
  }
  const cv = fuente(ARCHIVOS[0]);
  assert.equal((cv.match(/(^|\s)color:\s*\$cfg-accent;/gm) || []).length, 0);
});

test('5) gradientes y primarios prohibidos no suben', () => {
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    const [g, p] = TECHO[path.basename(f)] || [0, 0];
    assert.ok((t.match(/(linear|radial)-gradient\(/g) || []).length <= g, `${f}: gradientes`);
    assert.ok((t.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(102,\s*126,\s*234/gi) || []).length <= p, `${f}: primarios`);
  }
});
