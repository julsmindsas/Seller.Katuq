'use strict';
// Tarea 4.5 (TEMA-B20): retiro de bloques sin consumidor de dark-mode.scss y themes/_dark.scss.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('./retiro-oscuro.js');

const SRC = path.resolve(__dirname, '..', '..', 'src');
const conocidos = R.nombresConocidos();

test('1) ningún bloque de los dos archivos oscuros nombra una clase que ninguna plantilla ni librería usa', () => {
  for (const archivo of R.ARCHIVOS) {
    const muertos = R.bloquesMuertos(fs.readFileSync(archivo, 'utf8'), conocidos);
    assert.deepEqual(muertos.map((m) => m.resueltos[0]), [], `${path.basename(archivo)}: bloques sin consumidor`);
  }
});

test('2) el detector reconoce clases vivas y muertas', () => {
  assert.equal(R.selectorMuerto('body.dark-only .p-datatable', conocidos), false);
  assert.equal(R.selectorMuerto('body.dark-only .p-organizationchart .clase-que-no-existe-xyz', conocidos), true);
  assert.equal(R.selectorMuerto('body.dark-only .a:not(.clase-que-no-existe-xyz)', conocidos), false);
  assert.deepEqual(R.clasesDe('body .dark-only .a:not(.b) [class*="c-"] .d.e'), ['dark-only', 'a', 'd', 'e']);
});

test('3) ninguna función de color de Sass recibe una variable $dark-*', () => {
  const re = /(darken|lighten|mix|transparentize|fade-out|fade-in|saturate|desaturate|adjust-hue|opacify|scale-color|change-color|adjust-color|rgba?)\([^;{}]*\$dark-/;
  const hallados = [];
  const recorrer = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.scss')) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
          if (!/^\s*(\/\/|\*)/.test(l) && re.test(l)) hallados.push(`${path.relative(SRC, p)}:${i + 1}`);
        });
      }
    }
  };
  recorrer(SRC);
  assert.deepEqual(hallados, []);
});

test('4) el secundario y el terciario de la marca vieja ya no son literales en dark-mode.scss', () => {
  const t = fs.readFileSync(path.join(SRC, 'assets', 'scss', 'dark-mode.scss'), 'utf8');
  const viejos = ['#7A8FE8', '#5A6FC8', '#4AC5E2', '#6AD5F2', '#2AA5C2', 'rgba(122, 143, 232', 'rgba(74, 197, 226'];
  const hallados = viejos.filter((v) => t.toLowerCase().includes(v.toLowerCase()));
  assert.deepEqual(hallados, []);
});
