'use strict';

// D-502 F3 (ticket 1180, tarea 4.4, auditoría): cola «todas las paginas», lote 2 (ventas). Solo .scss.
// 18 hojas de ventas que no estaban en 4.4.1 a 4.4.4 (clientes, notas, orden de venta, facturación, cierres de caja,
// direccion estructurada, produccion, pedido 3D/reparto/cuotas, historial y editar IVA). Contra el fixture de a87f21d7:
//   1) claro idéntico;  2) los blancos literales no suben (techo por hoja = lo medido antes) y bajan donde se migraron;
//   3) todo var(--ds-*) existe en los dos temas;  4) gradientes y primarios prohibidos no suben;
//   5) ninguna función de color de Sass (rgba, darken...) recibió un var(): rompería la compilación o el valor.
// Quedan fuera pedido-entrega (su @import de katuq-tokens no compila fuera de Angular), y las hojas ya migradas en
// 4.4.1 a 4.4.4, cuyos literales sin token están en las preguntas abiertas de los diseños.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, compilar, lineasClaro } = require('./cola-ventas-claro');
const { medir } = require('./cola-paginas');

const RAIZ = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'cola-ventas-claro-a87f21d7.json'), 'utf8'));
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
const fuente = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('1) claro idéntico al de a87f21d7', () => {
  assert.equal(ARCHIVOS.length, 18);
  for (const f of ARCHIVOS) {
    assert.ok(fixture.archivos[f], `${f}: falta en el fixture`);
    const d = compararLineas(fixture.archivos[f], lineasClaro(f));
    assert.deepEqual([f, d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [f, [], []]);
  }
});

test('2) los blancos literales no suben y la mayoría de las hojas pasa a tokens', () => {
  let usos = 0;
  for (const f of ARCHIVOS) {
    const m = medir(fuente(f));
    assert.ok(m.blancos <= fixture.techos[f].blancos, `${f}: blancos ${m.blancos} > ${fixture.techos[f].blancos}`);
    usos += m.tokens;
  }
  assert.ok(usos >= 350, `solo ${usos} usos de tokens`);
  const antes = ARCHIVOS.reduce((s, f) => s + fixture.techos[f].blancos, 0);
  const ahora = ARCHIVOS.reduce((s, f) => s + medir(fuente(f)).blancos, 0);
  assert.ok(ahora < antes, `los blancos no bajaron (${antes} -> ${ahora})`);
});

test('3) todo var(--ds-*) existe en los dos temas', () => {
  for (const f of ARCHIVOS) {
    for (const [, n] of fuente(f).matchAll(/var\(--ds-([\w-]+)\)/g)) {
      assert.ok(claros.has(n) && oscuros.has(n), `${f}: --ds-${n} no existe en los dos temas`);
    }
  }
});

test('4) gradientes y primarios prohibidos no suben', () => {
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    assert.ok((t.match(/(linear|radial)-gradient\(/g) || []).length <= fixture.techos[f].gradientes, `${f}: gradientes`);
    assert.ok((t.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(102,\s*126,\s*234/gi) || []).length <= fixture.techos[f].primarios, `${f}: primarios`);
  }
});

test('5) ninguna función de color recibe un var(--ds-*)', () => {
  for (const f of ARCHIVOS) {
    const malas = fuente(f).split('\n').filter(l => /\b(rgba?|hsla?|darken|lighten|mix|fade-?\w*|transparentize|opacify|scale-color|adjust-\w+)\([^)]*var\(--ds-/.test(l));
    assert.deepEqual([f, malas], [f, []]);
  }
});
