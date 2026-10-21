'use strict';

// D-502 F3 (ticket 1180, tarea 4.4.4, bloque TEMA-B16): la pantalla POS (pos2, sin los widgets de pago de B12)
// sobre los tokens --ds-*. Solo .scss. Comprueba contra el fixture de 22085d8e:
//   1) claro idéntico;  2) sin fondos blancos literales ni acento literal en fondo o borde;
//   3) cada raíz con kc-tokens tiene su par oscuro y los tokens existen en los dos temas;
//   4) gradientes y primarios prohibidos no suben (eran 0 y 0);  5) la calculadora conserva el literal que darken() exige.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, compilar, lineasClaro } = require('./pos-claro');

const RAIZ = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pos-claro-22085d8e.json'), 'utf8'));
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
const fuente = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const PARCIAL = 'src/app/components/ventas/pos2/_pos-oscuro.scss';

test('1) claro idéntico al de 22085d8e', () => {
  for (const f of ARCHIVOS) {
    const d = compararLineas(fixture.archivos[f], lineasClaro(f));
    assert.deepEqual([f, d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [f, [], []]);
  }
});

test('2) sin blancos ni acento literal en fondo o borde', () => {
  for (const f of ARCHIVOS) {
    const malas = fuente(f).split('\n').filter(l => !/gradient/.test(l) &&
      (/\bbackground(-color)?:\s*(#fff|#ffffff|white)\b/i.test(l) ||
       /\b(background(-color)?|border[\w-]*):[^;}]*#5f3fe0/i.test(l)));
    assert.deepEqual([f, malas], [f, []]);
  }
});

test('3) las raíces con kc-tokens tienen par oscuro con tokens que existen', () => {
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    if (!/@include kc-tokens/.test(t)) continue;
    assert.match(t, /:host-context\(body\.dark-only\)\s*\{\s*@include pos-kc-oscuro;\s*\}/, `${f}: sin par oscuro`);
    assert.match(t, /@import '[./]*pos-oscuro';/, `${f}: sin import del parcial`);
  }
  const p = fuente(PARCIAL);
  const kc = [...p.matchAll(/--kc-([\w-]+):\s*var\(--ds-([\w-]+)\)/g)];
  assert.equal(kc.length, 19);
  for (const [, , n] of kc) assert.ok(claros.has(n) && oscuros.has(n), `--ds-${n} no existe en los dos temas`);
  for (const f of ARCHIVOS) {
    for (const [, n] of fuente(f).matchAll(/var\(--ds-([\w-]+)\)/g)) {
      assert.ok(claros.has(n) && oscuros.has(n), `${f}: --ds-${n} no existe en los dos temas`);
    }
  }
});

test('4) gradientes y primarios prohibidos no suben', () => {
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    assert.equal((t.match(/(linear|radial)-gradient\(/g) || []).length, 0, `${f}: gradientes`);
    assert.equal((t.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(102,\s*126,\s*234/gi) || []).length, 0, `${f}: primarios`);
  }
});

test('5) la calculadora conserva darken($calc-fn) como literal (darken no admite var())', () => {
  const t = fuente('src/app/components/ventas/pos2/pos.component.scss');
  assert.match(t, /\$calc-fn:\s+#ece9f7;/);
  assert.match(t, /darken\(\$calc-fn, 4%\)/);
});
