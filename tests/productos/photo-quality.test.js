'use strict';
/**
 * Aviso de calidad de una foto — parte pura del front (D-501, ticket 1252):
 * src/app/shared/services/productos/photo-quality.ts.
 *
 * Qué protege:
 *  1. Que el cálculo sea EL MISMO del servidor: se prueba contra la misma versión de los vectores
 *     (`photo-quality-vectors.v1.json`, copia idéntica a la del backend).
 *  2. Que el aviso sea solo informativo y el texto no tenga jerga.
 *
 *   node --test tests/productos/photo-quality.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const q = require('../../src/app/shared/services/productos/photo-quality.ts');
const RUTA_VECTORES = path.join(__dirname, '../../src/app/shared/services/productos/photo-quality-vectors.v1.json');
const VECTORES = JSON.parse(fs.readFileSync(RUTA_VECTORES, 'utf8'));

test('los vectores son la versión 1 y los umbrales coinciden con los del cálculo', () => {
  assert.equal(VECTORES.version, 1);
  assert.deepEqual(VECTORES.thresholds, { ...q.UMBRALES_CALIDAD });
});

test('la varianza del laplaciano y los avisos coinciden con cada vector', () => {
  for (const v of VECTORES.vectors) {
    const varianza = q.varianzaLaplaciano({ width: v.width, height: v.height, data: v.gray });
    assert.ok(Math.abs(varianza - v.laplacianVariance) < 1e-4, `${v.name}: ${varianza} vs ${v.laplacianVariance}`);
    assert.deepEqual(q.avisosDeCalidad({ minSide: v.minSide, laplacianVariance: varianza }), v.warnings, v.name);
  }
});

test('la copia del front es idéntica a la del backend (si el backend está al lado)', (t) => {
  const backend = path.join(__dirname, '../../../katuq_admin_back_firebase/functions/utils/photo-quality-vectors.v1.json');
  if (!fs.existsSync(backend)) {
    t.skip('el repo del backend no está en esta máquina');
    return;
  }
  // Sin los finales de línea: Git en Windows puede sacar cada copia con CRLF o LF.
  const sinCr = (ruta) => fs.readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(sinCr(RUTA_VECTORES), sinCr(backend));
});

test('datos incompletos no rompen: dan 0 y el aviso de borrosa', () => {
  assert.equal(q.varianzaLaplaciano({ width: 0, height: 0, data: [] }), 0);
  assert.equal(q.varianzaLaplaciano({ width: 5, height: 5, data: [1, 2, 3] }), 0);
  assert.equal(q.varianzaLaplaciano(null), 0);
});

test('reducción a 512 px sin agrandar y gris de un píxel', () => {
  assert.deepEqual(q.medidasParaCalidad(2048, 1024), { width: 512, height: 256 });
  assert.deepEqual(q.medidasParaCalidad(300, 200), { width: 300, height: 200 });
  assert.equal(q.grisDe(255, 255, 255), 255);
  assert.equal(q.grisDe(0, 0, 0), 0);
  assert.equal(q.grisDe(255, 0, 0), 76);
});

test('el texto del aviso es para el comercio: dice que puede guardar igual', () => {
  assert.equal(q.textoDeAvisos([]), '');
  const t = q.textoDeAvisos(['low_resolution', 'blurry']);
  assert.match(t, /pequeña/);
  assert.match(t, /borrosa/);
  assert.match(t, /Puedes guardarla igual/);
  assert.doesNotMatch(t, /laplac|varianza|px de lado mínimo|token/i);
});
