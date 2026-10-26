'use strict';
/**
 * Servicio y guard del importador (F5-30, F530-F01, tarea 8.2): lectura del código, sin Angular.
 *   node --test tests/migracion/servicio-guard.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '../../src/app/components/migracion-tienda');
const leer = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

test('servicio: extiende BaseService, providedIn root y todo va sin la pantalla de carga global', () => {
  const s = leer('migracion-tienda.service.ts');
  assert.match(s, /@Injectable\(\{ providedIn: 'root' \}\)/);
  assert.match(s, /extends BaseService/);
  assert.match(s, /shared\/services\/base\.service/);
  assert.equal((s.match(/this\.postSinLoader</g) || []).length, 5);
  assert.match(s, /getSinLoader<RespuestaFotosPendientes>\(`\$\{RUTA\}\/photos\/pending`\)/);
  assert.match(s, /this\.delete<RespuestaDeshacerClientes>\(`\$\{RUTA\}\/customers\/\$\{encodeURIComponent\(batchId\)\}`\)/);
  assert.ok(!/HttpClient/.test(s), 'el servicio no usa HttpClient directo');
});

test('servicio: las siete rutas del contrato', () => {
  const s = leer('migracion-tienda.service.ts');
  assert.match(s, /RUTA = '\/v1\/onboarding\/import-store'/);
  for (const r of ['dry-run', 'products', 'redirects', 'photos', 'customers']) assert.ok(s.includes('${RUTA}/' + r + '`'), r);
});

test('módulo y componentes de la carpeta: sin HttpClient ni HttpClientModule', () => {
  const archivos = [];
  const recorrer = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.ts$/.test(e.name) && e.name !== 'migracion-tienda.service.ts') archivos.push(p);
    }
  };
  recorrer(dir);
  assert.ok(archivos.length > 0);
  for (const a of archivos) assert.ok(!/HttpClient/.test(fs.readFileSync(a, 'utf8')), `${path.relative(dir, a)} usa HttpClient`);
});

test('guard: bandera storeMigrationImport de CompanyFeaturesService y rol administrador', () => {
  const g = leer('migracion-tienda.guard.ts');
  assert.match(g, /CompanyFeaturesService/);
  assert.match(g, /isEnabled\('storeMigrationImport'\)/);
  assert.match(g, /puedeTraerTienda/);
  assert.match(g, /providedIn: 'root'/);
  const catalogo = fs.readFileSync(path.join(__dirname, '../../src/app/shared/services/company-features.service.ts'), 'utf8');
  assert.ok(catalogo.includes("'storeMigrationImport'"));
});

test('tipos: los códigos del contrato están declarados', () => {
  const t = leer('tipos.ts');
  for (const c of ['RATE_LIMITED', 'WOO_INTEGRATION_ACTIVE', 'FLOW_PUBLISHES_PRODUCTS', 'IMPORT_IN_PROGRESS', 'CATEGORY_TREE_UNREADABLE', 'WAREHOUSE_INVALID']) {
    assert.ok(t.includes(`'${c}'`), c);
  }
});
