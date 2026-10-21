'use strict';
/**
 * TX-37 · 9.9 (bloque TX37-B10; design-fase-2.md §F2.1): bandera por comercio
 * `productPhotoBackground` («Quitar fondo» con IA) en el catálogo del front.
 *
 * Qué protege:
 *  1. Está en `COMPANY_FEATURE_FLAGS` con su decisión, dueño (Daniel) y retiro (2027-06-30), y en el
 *     mismo catálogo del backend (functions/services/companyFeatureFlags.js) cuando está al lado.
 *  2. Exige `productPhotoUniform`: sola no prende (`isEnabled` y `isEnabled$`). Las demás banderas
 *     siguen prendiendo solas con el booleano `true`, como hoy.
 *
 * Carga el servicio real transpilado, con Angular y SecurityService de mentira.
 *
 *   node --test tests/productos/fotos-uniformes-bandera-fondo.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rxjs = require('rxjs');
const operadores = require('rxjs/operators');

const RAIZ = path.resolve(__dirname, '../..');
const SERVICIO = path.join(RAIZ, 'src/app/shared/services/company-features.service.ts');
const FUENTE = fs.readFileSync(SERVICIO, 'utf8');

function cargarServicio() {
  const js = ts.transpileModule(FUENTE, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  const modulos = {
    '@angular/core': { Injectable: () => (clase) => clase },
    rxjs,
    'rxjs/operators': operadores,
    './security/security.service': { SecurityService: class {} },
  };
  const exportados = {};
  const requerir = (nombre) => {
    if (!(nombre in modulos)) throw new Error(`módulo inesperado: ${nombre}`);
    return modulos[nombre];
  };
  new Function('exports', 'require', 'module', js)(exportados, requerir, { exports: exportados });
  return exportados;
}

function almacen(datos) {
  return { getItem: (k) => (k in datos ? datos[k] : null) };
}

function conSesion(featureFlags) {
  global.localStorage = almacen({
    currentCompany: JSON.stringify({ nomComercial: 'FLORECER', featureFlags }),
    user: JSON.stringify({ company: 'FLORECER' }),
  });
}

const m = cargarServicio();
const seguridad = { companyInformation$: new rxjs.BehaviorSubject(null) };

test('productPhotoBackground está en el catálogo con su decisión, dueño y retiro', () => {
  assert.ok(m.COMPANY_FEATURE_FLAGS.includes('productPhotoBackground'));
  const i = FUENTE.indexOf("'productPhotoBackground',");
  const comentario = FUENTE.slice(FUENTE.lastIndexOf("',", i - 1), i).replace(/\s*\/\/\s*/g, ' ');
  assert.match(comentario, /D-518/);
  assert.match(comentario, /TX-37/);
  assert.match(comentario, /Dueño: Daniel/);
  assert.match(comentario, /2027-06-30/);
  assert.match(comentario, /productPhotoUniform/);
  assert.deepEqual(m.COMPANY_FEATURE_REQUIRES.productPhotoBackground, ['productPhotoUniform']);
  assert.deepEqual(Object.keys(m.COMPANY_FEATURE_REQUIRES), ['productPhotoBackground'], 'solo esta bandera tiene requisito');
});

test('el catálogo del front es el mismo del backend (si el backend está al lado)', (t) => {
  // Mismo criterio que photo-quality y pagina-con-ia: sin el backend al lado se salta. Para que
  // en un CI la falta del backend FALLE en vez de saltarse: KATUQ_EXIGIR_BACK=1.
  const candidatos = [
    process.env.KATUQ_BACK,
    path.resolve(RAIZ, '../wt-back-tickets-web/functions'),
    path.resolve(RAIZ, '../katuq_admin_back_firebase/functions'),
  ].filter(Boolean);
  const back = candidatos.map((d) => path.join(d, 'services/companyFeatureFlags.js')).find((f) => fs.existsSync(f));
  if (!back) {
    assert.notEqual(process.env.KATUQ_EXIGIR_BACK, '1', 'KATUQ_EXIGIR_BACK=1 y no se encontró el backend (usa KATUQ_BACK=<ruta de functions>)');
    return t.skip('no se encontró el backend (usa KATUQ_BACK=<ruta de functions>; KATUQ_EXIGIR_BACK=1 lo vuelve obligatorio)');
  }
  const { FEATURE_FLAG_NAMES, FEATURE_FLAG_REQUIRES } = require(back);
  // Hoy el backend tiene 4 banderas que el front no lista (sin pantalla propia); esta prueba no
  // exige igualdad total, solo que el front no invente banderas y que la nueva esté en los dos.
  for (const nombre of m.COMPANY_FEATURE_FLAGS) assert.ok(FEATURE_FLAG_NAMES.includes(nombre), `${nombre} existe en el backend`);
  assert.ok(FEATURE_FLAG_NAMES.includes('productPhotoBackground'));
  assert.deepEqual(JSON.parse(JSON.stringify(m.COMPANY_FEATURE_REQUIRES)), JSON.parse(JSON.stringify(FEATURE_FLAG_REQUIRES)));
});

test('productPhotoBackground exige productPhotoUniform: sola no prende', async () => {
  const servicio = new m.CompanyFeaturesService(seguridad);

  conSesion({ productPhotoBackground: true });
  assert.equal(servicio.isEnabled('productPhotoBackground'), false, 'sin productPhotoUniform');

  conSesion({ productPhotoBackground: true, productPhotoUniform: 'true' });
  assert.equal(servicio.isEnabled('productPhotoBackground'), false, 'el requisito también exige el booleano true');

  conSesion({ productPhotoUniform: true });
  assert.equal(servicio.isEnabled('productPhotoBackground'), false, 'nace apagada');
  assert.equal(servicio.isEnabled('productPhotoUniform'), true);

  conSesion({ productPhotoBackground: true, productPhotoUniform: true });
  assert.equal(servicio.isEnabled('productPhotoBackground'), true);
  const valor = await new Promise((r) => servicio.isEnabled$('productPhotoBackground').pipe(operadores.take(1)).subscribe(r));
  assert.equal(valor, true, 'isEnabled$ aplica la misma regla');

  conSesion({ productPhotoBackground: true });
  const apagada = await new Promise((r) => servicio.isEnabled$('productPhotoBackground').pipe(operadores.take(1)).subscribe(r));
  assert.equal(apagada, false);
});

test('las demás banderas siguen prendiendo solas con el booleano true, como hoy', () => {
  const servicio = new m.CompanyFeaturesService(seguridad);
  for (const nombre of m.COMPANY_FEATURE_FLAGS.filter((n) => !(n in m.COMPANY_FEATURE_REQUIRES))) {
    conSesion({ [nombre]: true });
    assert.equal(servicio.isEnabled(nombre), true, nombre);
    conSesion({ [nombre]: 'true' });
    assert.equal(servicio.isEnabled(nombre), false, nombre);
  }
  // Empresa guardada distinta de la sesión: todo apagado, también la nueva.
  global.localStorage = almacen({
    currentCompany: JSON.stringify({ nomComercial: 'OTRA', featureFlags: { productPhotoBackground: true, productPhotoUniform: true } }),
    user: JSON.stringify({ company: 'FLORECER' }),
  });
  assert.equal(servicio.isEnabled('productPhotoBackground'), false);
});
