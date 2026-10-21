'use strict';

// D-502 F3 (ticket 1180, tarea 4.4, bloque TEMA-B19): cola «todas las paginas», lote 1. Solo .scss.
// Pantallas con marco en modulos no sensibles: formas-entrega, dropshipping, picking-packing (solo presentacion),
// usuarios, rol, notificaciones, crm, prospect-manager, produccion, tiempos-entrega, dashboard (sin home) y productos
// (sin fotos-uniformes, que tiene otro cambio en curso). Contra el fixture de 977e9ba3:
//   1) claro identico;  2) sin fondos blancos literales (salvo las dos hojas con texto oscuro literal propio);
//   3) todo var(--ds-*) existe en los dos temas;  4) gradientes y primarios prohibidos no suben (eran 0 y 0);
//   5) el priorizador estatico (cola-paginas.js) mide, ordena y deja fuera las pantallas sin menu.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { compararLineas, leerTokens } = require('./comparar-claro');
const { ARCHIVOS, compilar, lineasClaro } = require('./cola-claro');
const { medir, cola, porModulo, SIEMPRE_CLARO } = require('./cola-paginas');

const RAIZ = path.resolve(__dirname, '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'cola-claro-977e9ba3.json'), 'utf8'));
const tokensCss = compilar('src/app/shared/styles/_theme-tokens.scss');
const claros = leerTokens(tokensCss, 'claro');
const oscuros = leerTokens(tokensCss, 'oscuro');
const fuente = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
// Blancos que se quedan porque el bloque tiene texto oscuro literal sin token: pasarlos a surface dejaria texto oscuro sobre oscuro.
const BLANCOS_CON_TEXTO_PROPIO = new Set([
  'src/app/components/produccion/dashboard/dashboard.component.scss',
  'src/app/components/dashboard/legacy-dashboard.component.scss',
]);

test('1) claro idéntico al de 977e9ba3', () => {
  assert.ok(ARCHIVOS.length >= 40);
  for (const f of ARCHIVOS) {
    assert.ok(fixture.archivos[f], `${f}: falta en el fixture`);
    const d = compararLineas(fixture.archivos[f], lineasClaro(f));
    assert.deepEqual([f, d.soloBase.slice(0, 5), d.soloActual.slice(0, 5)], [f, [], []]);
  }
});

test('2) sin fondos blancos literales', () => {
  for (const f of ARCHIVOS) {
    const n = medir(fuente(f)).blancos;
    if (BLANCOS_CON_TEXTO_PROPIO.has(f)) assert.ok(n > 0 && n <= 2, `${f}: ${n}`);
    else assert.equal(n, 0, `${f}: blancos literales`);
  }
});

test('3) todo var(--ds-*) existe en los dos temas y las hojas migradas usan tokens', () => {
  let usos = 0;
  for (const f of ARCHIVOS) {
    for (const [, n] of fuente(f).matchAll(/var\(--ds-([\w-]+)\)/g)) {
      usos++;
      assert.ok(claros.has(n) && oscuros.has(n), `${f}: --ds-${n} no existe en los dos temas`);
    }
  }
  assert.ok(usos > 600, `solo ${usos} usos de tokens`);
});

test('4) gradientes y primarios prohibidos no suben', () => {
  for (const f of ARCHIVOS) {
    const t = fuente(f);
    assert.equal((t.match(/(linear|radial)-gradient\(/g) || []).length, 0, `${f}: gradientes`);
    assert.equal((t.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(102,\s*126,\s*234/gi) || []).length, 0, `${f}: primarios`);
  }
});

test('5) el priorizador cuenta blancos, textos y tokens, y deja fuera las pantallas sin menu', () => {
  const m = medir('.a { background: #fff; color: #333; }\n.b { background: linear-gradient(#fff, #eee); }\n// background: #fff;\n.c { background: var(--ds-surface); color: var(--ds-ink); }');
  assert.deepEqual(m, { blancos: 1, textos: 1, tokens: 2 });
  const filas = cola();
  assert.ok(filas.length > 0);
  for (const f of filas) {
    assert.ok(!SIEMPRE_CLARO.includes(f.modulo), f.archivo);
    assert.ok(f.blancos + f.textos > 0, f.archivo);
  }
  for (let i = 1; i < filas.length; i++) assert.ok(filas[i - 1].puntaje >= filas[i].puntaje);
  const mod = porModulo(filas);
  assert.equal(mod.reduce((s, x) => s + x.hojas, 0), filas.length);
  // lo ya migrado en el lote 1 no vuelve a la cola con blancos
  const sinBlancos = filas.filter(f => ARCHIVOS.includes(f.archivo) && f.blancos > 0).map(f => f.archivo);
  assert.deepEqual(new Set(sinBlancos), BLANCOS_CON_TEXTO_PROPIO);
});
