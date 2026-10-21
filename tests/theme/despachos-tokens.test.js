'use strict';

// D-502 F3 (ticket 1180, tarea 4.4.3, bloque TEMA-B15): despachos sobre los tokens --ds-*. Solo .scss.
// Comprueba contra el fixture de 5a1982da:
//   1) claro idéntico (en tracking-details, var(--primary-color) vale #5F3FE0 = accent, por lo que se compara resuelto);
//   2) sin fondos blancos literales ni #5F3FE0 / var(--primary-color) sueltos como fondo, color o borde;
//   3) el modal de seguimiento tiene par oscuro con tokens que existen en los dos temas;
//   4) gradientes y primarios prohibidos no suben.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, compilar, lineasClaro } = require('./despachos-claro');

const RAIZ = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'despachos-claro-5a1982da.json'), 'utf8'));
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
const fuente = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const TRACKING = ARCHIVOS.find(f => /tracking-details/.test(f));
const TECHO = { 'tracking-details-modal.component.scss': [4, 0] }; // medido antes: 4 gradientes, 0 primarios

test('1) claro idéntico al de 5a1982da', () => {
  for (const f of ARCHIVOS) {
    const base = fixture.archivos[f].map(l => l.replace(/var\(--primary-color\)/g, '#5f3fe0'));
    const actual = lineasClaro(f).map(l => l.replace(/var\(--primary-color\)/g, '#5f3fe0'));
    const d = compararLineas(f === TRACKING ? base : fixture.archivos[f], f === TRACKING ? actual : lineasClaro(f));
    assert.deepEqual([f, d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [f, [], []]);
  }
});

test('2) sin blancos ni acento literal en fondo o borde (el texto literal sobre fondo claro sin token se queda, ver el diseño)', () => {
  for (const f of ARCHIVOS) {
    const malas = fuente(f).split('\n').filter(l => !/gradient|\(/.test(l.replace(/var\(/g, '')) &&
      (/^\s*background(-color)?:\s*(#fff|#ffffff|white)\s*(!important)?\s*;/i.test(l) ||
       /^\s*(background(-color)?|border[\w-]*):.*(#5f3fe0|var\(--primary-color\))/i.test(l)));
    assert.deepEqual([f, malas], [f, []]);
  }
});

test('3) el modal de seguimiento tiene par oscuro con tokens existentes', () => {
  const t = fuente(TRACKING);
  const i = t.indexOf(':host-context(body.dark-only) {');
  assert.ok(i > 0, 'sin bloque oscuro');
  const bloque = t.slice(i, t.indexOf('\n}', i));
  for (const v of ['--primary-color', '--success-color', '--warning-color', '--danger-color', '--text-primary', '--text-secondary', '--text-muted', '--border-color', '--bg-primary', '--bg-secondary', '--bg-tertiary']) {
    assert.match(bloque, new RegExp(`${v}:\\s*var\\(--ds-`), `falta ${v}`);
  }
  for (const [, n] of bloque.matchAll(/var\(--ds-([\w-]+)\)/g)) {
    assert.ok(claros.has(n) && oscuros.has(n), `--ds-${n} no existe en los dos temas`);
  }
});

test('4) gradientes y primarios prohibidos no suben', () => {
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    const [g, p] = TECHO[path.basename(f)] || [0, 0];
    assert.ok((t.match(/(linear|radial)-gradient\(/g) || []).length <= g, `${f}: gradientes`);
    assert.ok((t.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(102,\s*126,\s*234/gi) || []).length <= p, `${f}: primarios`);
  }
});
