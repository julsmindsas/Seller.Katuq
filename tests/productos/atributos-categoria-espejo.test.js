'use strict';
/**
 * Atributos por categoría (D-495, ticket 1234), tarea 1.6: el ESPEJO del front.
 * src/app/shared/services/catalogo/atributos-categoria.ts
 *
 * El servidor manda (services/catalogo/atributosCategoria.js del backend); el
 * front solo espeja lo que necesita para pintar sin preguntar de más:
 *  1. qué documento de `categorias` usar cuando /v1/categorias/all trae varios;
 *  2. el esquema efectivo de una ruta (primero los ancestros);
 *  3. las claves de ruta y la ruta del producto (rutaDelProducto) con el índice que
 *     devuelve GET /v1/categorias/attribute-schemas: etiquetas, alias, ambiguas y
 *     colisiones, igual que POST /v1/productos/attributes (revisión 2026-10-19).
 *
 * Usa el MISMO fixture que el backend: tests/productos/fixtures/atributos-esquemas.json
 * es copia idéntica de functions/tests/catalogo/fixtures/atributos-esquemas.json.
 *
 *   node --test tests/productos/atributos-categoria-espejo.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { stringify } = require('flatted');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const espejo = require('../../src/app/shared/services/catalogo/atributos-categoria.ts');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/atributos-esquemas.json'), 'utf8'));

test('claves de ruta iguales a las del servidor', () => {
  for (const c of FIXTURE.claves) assert.equal(espejo.claveDeRuta(c.nombres), c.clave, c.nombres.join('|'));
});

test('documentoDeCategorias: el mismo documento que elige el servidor (en el orden en que llegan)', () => {
  for (const c of FIXTURE.documentoDeCategorias) {
    const docs = c.docs.map((d) => d.data);
    const elegido = espejo.documentoDeCategorias(docs);
    if (c.elegido === null) assert.equal(elegido, null, c.caso);
    else assert.equal(elegido, docs[c.elegido], c.caso);
  }
});

test('esquemaEfectivo: primero los ancestros, cada nivel por orden, con lo heredado marcado', () => {
  for (const c of FIXTURE.esquemaEfectivo) {
    const efectivo = espejo.esquemaEfectivo(FIXTURE.schemas, c.ruta);
    assert.deepEqual(efectivo.map((d) => d.key), c.claves, c.ruta);
    assert.equal(efectivo.filter((d) => d.heredado).length, c.heredadas, `${c.ruta}: heredadas`);
  }
  const routers = espejo.esquemaEfectivo(FIXTURE.schemas, 'networking > routers');
  assert.equal(routers[0].origen, 'networking');
  assert.equal(espejo.esquemaEfectivo(null, 'networking').length, 0);
});

const maestroDelFixture = (nombre) =>
  nombre ? FIXTURE.maestros[nombre] : { arbol: FIXTURE.arbol, schemas: FIXTURE.schemas, indice: FIXTURE.indice };

test('rutaDelProducto: la misma respuesta que el servidor en todos los casos del fixture compartido', () => {
  assert.ok(FIXTURE.rutaDelProducto.length >= 20);
  for (const c of FIXTURE.rutaDelProducto) {
    const m = maestroDelFixture(c.maestro);
    assert.deepEqual(espejo.rutaDelProducto(c.producto, m.indice, m.schemas), c.esperado, c.caso);
  }
});

test('rutaDelProducto: los tres casos de la revisión (raíz repetida, renombre y forma 5)', () => {
  const raiz = FIXTURE.maestros.raizRepetida;
  assert.equal(espejo.rutaDelProducto({ categorias: { label: 'Routers', data: { nombre: 'Routers' } } }, raiz.indice, {}).estado, 'ambigua');
  const ren = FIXTURE.maestros.renombrado;
  assert.deepEqual(espejo.rutaDelProducto({ categorias: { ruta: ['Networking', 'Routers'] } }, ren.indice, ren.schemas), {
    estado: 'porAlias',
    ruta: 'redes > routers',
  });
  assert.deepEqual(espejo.nombresDeRuta(ren.indice, 'redes > routers'), ['Redes', 'Routers'], 'se muestra el nombre vigente');
  assert.deepEqual(espejo.rutaDelProducto({ categorias: ['Networking', 'Routers'] }, FIXTURE.indice, FIXTURE.schemas), {
    estado: 'porEtiquetas',
    ruta: 'networking > routers',
  });
});

test('rutaDelProducto: sin índice (o con una categoría llamada como una propiedad de Object) no inventa rutas', () => {
  assert.equal(espejo.rutaDelProducto({ categorias: ['Networking'] }, null, {}).estado, 'fueraDelArbol');
  for (const nombre of ['constructor', '__proto__', 'toString']) {
    assert.equal(espejo.rutaDelProducto({ categorias: [nombre] }, FIXTURE.indice, FIXTURE.schemas).estado, 'fueraDelArbol', nombre);
    assert.equal(espejo.rutaDelProducto({ categorias: { ruta: [nombre] } }, FIXTURE.indice, FIXTURE.schemas).estado, 'fueraDelArbol', nombre);
  }
});

test('esquemaEfectivo: una ruta en colisión no tiene atributos (como en el servidor)', () => {
  const col = FIXTURE.maestros.colision;
  const schemas = { 'networking > routers': { attributes: [{ key: 'a', label: 'A', type: 'text', section: 'specs', order: 1 }] } };
  assert.deepEqual(espejo.esquemaEfectivo(schemas, 'networking > routers', col.indice), []);
  assert.equal(espejo.esquemaEfectivo(schemas, 'networking > routers').length, 1, 'sin índice, como antes');
});

test('rutasDelArbol: cada nodo con su ruta, en el orden del árbol', () => {
  const rutas = espejo.rutasDelArbol(FIXTURE.arbol).map((r) => r.clave);
  assert.deepEqual(rutas.slice(0, 3), ['networking', 'networking > routers', 'networking > routers > wifi 6']);
  assert.equal(rutas.length, 8);
});
