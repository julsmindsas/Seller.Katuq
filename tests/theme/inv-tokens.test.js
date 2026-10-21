'use strict';

// D-502 F3 (ticket 1180, tarea 4.4.5, bloque TEMA-B17): inventario y bodegas sobre los tokens --ds-*. Solo .scss.
// Contra el fixture de 5a1982da:
//   1) claro idéntico;  2) sin fondos blancos literales ni acento literal en fondo o borde;
//   3) el catálogo tiene el par oscuro de --kc-* con tokens que existen en los dos temas;
//   4) el oscuro de bodegas usa solo tokens (cierra el 1,75:1 de las etiquetas #90caf9);
//   5) gradientes y primarios prohibidos no suben (eran 0 y 0).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, compilar, lineasClaro } = require('./inv-claro');

const RAIZ = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'inv-claro-5a1982da.json'), 'utf8'));
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
const fuente = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = 'src/app/components/inventarios/';

test('1) claro idéntico al de 5a1982da', () => {
  for (const f of ARCHIVOS) {
    const d = compararLineas(fixture.archivos[f], lineasClaro(f));
    assert.deepEqual([f, d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [f, [], []]);
  }
});

test('2) sin blancos ni acento literal en fondo o borde', () => {
  for (const f of ARCHIVOS) {
    const malas = fuente(f).split('\n').filter(l => !/gradient/.test(l) &&
      (/\bbackground(-color)?:\s*(#fff|#ffffff|white)\b/i.test(l) ||
       /\b(background(-color)?|border[\w-]*):[^;}]*(?<!rgba\()#5f3fe0/i.test(l)));
    assert.deepEqual([f, malas], [f, []]);
  }
});

test('3) el catálogo tiene el par oscuro de --kc-* y todo --ds-* existe en los dos temas', () => {
  const cat = fuente(P + 'inventario-catalogo/inventarios.component.scss');
  assert.match(cat, /:host-context\(body\.dark-only\)\s*\{\s*@include inv-kc-oscuro;\s*\}/);
  assert.match(cat, /@import 'inv-oscuro';/);
  const kc = [...fuente(P + 'inventario-catalogo/_inv-oscuro.scss').matchAll(/--kc-([\w-]+):\s*var\(--ds-([\w-]+)\)/g)];
  assert.equal(kc.length, 19);
  for (const [, , n] of kc) assert.ok(claros.has(n) && oscuros.has(n), `--ds-${n} no existe en los dos temas`);
  for (const f of ARCHIVOS) {
    for (const [, n] of fuente(f).matchAll(/var\(--ds-([\w-]+)\)/g)) {
      assert.ok(claros.has(n) && oscuros.has(n), `${f}: --ds-${n} no existe en los dos temas`);
    }
  }
});

test('4) el oscuro de bodegas usa solo tokens', () => {
  const t = fuente(P + 'bodegas/bodegas.component.scss');
  const i = t.indexOf(':host-context(body.dark-only) {');
  assert.ok(i > 0);
  const bloque = t.slice(i, t.indexOf('// Colores que estaban escritos en el HTML'));
  assert.doesNotMatch(bloque, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(bloque, /rgba\(/);
  assert.match(bloque, /\.tag-blue\s*\{[^}]*var\(--ds-info-soft\)[^}]*var\(--ds-info\)/);
});

test('5) gradientes y primarios prohibidos no suben', () => {
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    assert.equal((t.match(/(linear|radial)-gradient\(/g) || []).length, 0, `${f}: gradientes`);
    assert.equal((t.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(102,\s*126,\s*234/gi) || []).length, 0, `${f}: primarios`);
  }
});
