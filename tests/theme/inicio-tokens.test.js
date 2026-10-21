'use strict';

// D-502 F3 (ticket 1180, tareas 4.4.6 y 3.8, bloque TEMA-B18): Inicio y terceros en oscuro, solo SCSS.
//   1) el claro del Inicio es identico al de bf7457fd;  2) sin blancos ni acento literal en fondo/borde/texto;
//   3) cada var(--ds-*) del Inicio existe en los dos temas;  4) gradientes y primarios prohibidos no suben (0 y 0);
//   5) el bloque de terceros de dark-mode.scss (ng-select, SweetAlert2, Quill, FullCalendar) cuelga de body.dark-only,
//      usa solo tokens existentes y no deja colores literales.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, compilar, lineasClaro } = require('./inicio-claro');

const RAIZ = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'inicio-claro-bf7457fd.json'), 'utf8'));
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
const fuente = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('1) claro identico al de bf7457fd', () => {
  for (const f of ARCHIVOS) {
    const d = compararLineas(fixture.archivos[f], lineasClaro(f));
    assert.deepEqual([f, d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [f, [], []]);
  }
});

test('2) sin blancos ni acento literal', () => {
  for (const f of ARCHIVOS) {
    const malas = fuente(f).split('\n').filter(l =>
      /\bbackground(-color)?:\s*(#fff|#ffffff|white)\b/i.test(l) ||
      /\b(background(-color)?|border[\w-]*|color):[^;}]*(?<!rgba\()#5f3fe0/i.test(l) ||
      /\bcolor:\s*(#211f3a|#8f8bab|#d64545|#d9820a)\b/i.test(l));
    assert.deepEqual([f, malas], [f, []]);
  }
});

test('3) los tokens usados existen en los dos temas', () => {
  for (const f of ARCHIVOS) {
    const usados = new Set(fuente(f).match(/--ds-[a-z0-9-]+/g) || []);
    assert.ok(usados.size > 8, 'el Inicio debe consumir tokens');
    for (const t of usados) {
      assert.ok(claros.has(t.slice(5)), `${f}: ${t} sin valor claro`);
      assert.ok(oscuros.has(t.slice(5)), `${f}: ${t} sin valor oscuro`);
    }
  }
});

test('4) gradientes y primarios prohibidos no suben', () => {
  const prohibidos = /#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea|#3b82f6|#1d4ed8|#6366f1|#1976d2|#7366ff/gi;
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    assert.equal((t.match(/(linear|radial)-gradient\(/g) || []).length, 0, `${f}: gradientes`);
    assert.equal((t.match(prohibidos) || []).length, 0, `${f}: primarios`);
  }
});

test('5) terceros en oscuro: solo tokens y solo bajo body.dark-only', () => {
  const s = fuente('src/assets/scss/dark-mode.scss');
  const i = s.indexOf('bloque TEMA-B18');
  assert.ok(i > 0, 'falta el bloque de terceros');
  const bloque = s.slice(i);
  const ultimo = s.lastIndexOf('\nbody.dark-only {', i);
  assert.ok(ultimo >= 0, 'el bloque debe estar dentro de un body.dark-only');
  for (const sel of ['.ng-select .ng-select-container', '.ng-dropdown-panel', 'ng-option-selected', '.swal2-popup',
    '.swal2-styled.swal2-confirm', '.ql-toolbar.ql-snow', '.ql-container.ql-snow', '.fc {']) {
    assert.ok(bloque.includes(sel), `falta ${sel}`);
  }
  assert.match(bloque, /\.swal2-styled\.swal2-confirm \{\s*background: var\(--ds-accent\)/);
  const sinComentarios = bloque.replace(/\/\/.*$/gm, '');
  assert.deepEqual(sinComentarios.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || [], [], 'colores literales');
  for (const t of new Set(sinComentarios.match(/--ds-[a-z0-9-]+/g))) {
    assert.ok(claros.has(t.slice(5)) && oscuros.has(t.slice(5)), `${t} no existe en los dos temas`);
  }
});
