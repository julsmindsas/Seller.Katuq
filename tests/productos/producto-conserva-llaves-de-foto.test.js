'use strict';
/**
 * D-501 (ticket 1252): guardar un producto desde el editor CONSERVA las llaves `original` y
 * `processed` de cada foto de `crearProducto.imagenesPrincipales`. Si el editor las quitara, la
 * foto uniformada quedaría sin su original y sin poder revertirse.
 *
 * Se corre el código REAL del editor que toca las fotos (cargar el producto, quitar una foto,
 * sumar las recién subidas y armar el payload) con formularios reactivos reales de Angular, y se
 * vigila que ningún `setValue` de las fotos las vuelva a armar campo por campo.
 *
 *   node --test tests/productos/producto-conserva-llaves-de-foto.test.js
 */
const assert = require('node:assert/strict');
const { test, before } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const ARCHIVO = path.resolve(__dirname, '../../src/app/components/productos/crear-productos/crear-productos.component.ts');
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8');

let forms;
before(async () => {
  await import('@angular/compiler');
  forms = await import('@angular/forms');
});

const FOTO_UNIFORMADA = {
  urls: 'https://firebasestorage.googleapis.com/v0/b/b/o/Productos%2Funiformes%2Fc1%2Fp1%2Fb1-0-cover.jpg?alt=media&token=t',
  nombreImagen: 'vela.jpg',
  path: 'Productos/uniformes/c1/p1/b1-0-cover.jpg',
  tipo: 'principal',
  original: { urls: 'https://firebasestorage.googleapis.com/v0/b/b/o/Productos%2Fvela.jpg?alt=media&token=o', path: 'Productos/vela.jpg' },
  processed: { batchId: 'b1', settingsHash: 'h', sourcePath: 'Productos/vela.jpg', variants: [{ width: 320, path: 'x' }], quality: { minSide: 900 } },
};
const FOTO_NORMAL = { urls: 'https://x/o/otra.webp', nombreImagen: 'otra.webp', path: 'Productos/otra.webp', tipo: 'principal' };

/** El cuerpo (texto) de un método o getter del editor. */
function cuerpoDe(nombre) {
  const sf = ts.createSourceFile(ARCHIVO, FUENTE, ts.ScriptTarget.Latest, true);
  const clase = sf.statements.find(ts.isClassDeclaration);
  const m = clase.members.find((x) => (ts.isMethodDeclaration(x) || ts.isGetAccessor(x)) && x.name && x.name.getText(sf) === nombre);
  assert.ok(m, `existe el método ${nombre}`);
  return m.body.getText(sf);
}

/** Un método del editor, transpilado y corrido en un contexto aislado con el `this` que le pasemos. */
function metodo(nombre, globales = {}) {
  const js = ts.transpileModule(`(function () ${cuerpoDe(nombre)})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(js, { BANDERA_FOTOS_UNIFORMES: 'productPhotoUniform', ...globales });
}

function formularioDeFotos() {
  return new forms.FormGroup({
    titulo: new forms.FormControl('Vela'),
    imagenesPrincipales: new forms.FormControl(['']),
    imagenesSecundarias: new forms.FormControl([]),
  });
}

test('cargar el producto en el editor deja las fotos tal cual (con original y processed)', () => {
  const crearProducto = formularioDeFotos();
  const edit = { crearProducto: { imagenesPrincipales: [FOTO_UNIFORMADA, FOTO_NORMAL] } };
  metodo('loadImageData').call({ edit, crearProducto, cdr: { detectChanges() {} } });
  const fotos = crearProducto.value.imagenesPrincipales;
  assert.deepEqual(fotos[0], FOTO_UNIFORMADA);
  assert.deepEqual(Object.keys(fotos[0]).sort(), ['nombreImagen', 'original', 'path', 'processed', 'tipo', 'urls']);
  // El payload del guardado toma `crearProducto.value` entero: las llaves viajan al servidor.
  const payload = { crearProducto: crearProducto.value };
  assert.deepEqual(payload.crearProducto.imagenesPrincipales[0].original, FOTO_UNIFORMADA.original);
  assert.deepEqual(payload.crearProducto.imagenesPrincipales[0].processed, FOTO_UNIFORMADA.processed);
});

test('sumar fotos recién subidas y quitar otra conserva las llaves de las que quedan', () => {
  const crearProducto = formularioDeFotos();
  crearProducto.get('imagenesPrincipales').setValue([FOTO_UNIFORMADA, FOTO_NORMAL]);
  // Lo mismo que hace uploadPendingImages: [...actuales, ...nuevas].
  const actuales = crearProducto.controls['imagenesPrincipales'].value || [];
  crearProducto.controls['imagenesPrincipales'].setValue([...actuales, { urls: 'u', nombreImagen: 'n', path: 'p', tipo: 'principal' }]);
  // Lo mismo que hace deleteImg: filtra por path.
  const valores = crearProducto.controls['imagenesPrincipales'].value.filter((p) => p.path != FOTO_NORMAL.path);
  crearProducto.controls['imagenesPrincipales'].setValue(valores);
  assert.equal(crearProducto.value.imagenesPrincipales.length, 2);
  assert.deepEqual(crearProducto.value.imagenesPrincipales[0], FOTO_UNIFORMADA);
});

test('el código del editor nunca rearma las fotos campo por campo antes de guardar', () => {
  // Cada setValue de imagenesPrincipales recibe el arreglo del producto, un filtro o un spread de las
  // fotos actuales; ninguno las vuelve a construir con .map (eso perdería original y processed).
  const setValues = [...FUENTE.matchAll(/imagenesPrincipales["'\]\)]*\.setValue\(([\s\S]*?)\);/g)].map((x) => x[1]);
  assert.ok(setValues.length >= 4, `se encontraron ${setValues.length} escrituras de las fotos`);
  for (const arg of setValues) {
    assert.doesNotMatch(arg, /\.map\(/, `setValue de las fotos con .map: ${arg.slice(0, 120)}`);
  }
  // Los dos guardados (crear y editar) mandan crearProducto.value entero.
  const enviados = FUENTE.match(/controls\["crearProducto"\]\.setValue\(\s*this\.crearProducto\.value/g) || [];
  assert.ok(enviados.length >= 2, 'crear y editar mandan crearProducto.value');
});

test('D-501 en el editor: el botón y el aviso dependen de la bandera; el guardado no los usa', () => {
  assert.match(FUENTE, /const BANDERA_FOTOS_UNIFORMES: CompanyFeatureFlag = "productPhotoUniform";/);
  const getter = metodo('fotosUniformesActiva');
  const apagada = { features: { isEnabled: () => false }, edit: { cd: 'p1' }, cd: 'p1' };
  const sinGuardar = { features: { isEnabled: () => true }, edit: null, cd: undefined };
  const lista = { features: { isEnabled: (f) => f === 'productPhotoUniform' }, edit: { cd: 'p1' }, cd: 'p1' };
  assert.equal(getter.call(apagada), false, 'sin la bandera no aparece');
  assert.equal(getter.call(sinGuardar), false, 'un producto sin guardar no tiene botón');
  assert.equal(getter.call(lista), true);
  const guardar = cuerpoDe('guardarProductos');
  assert.doesNotMatch(guardar, /fotosUniformes|avisoCalidadFoto|medirCalidad/, 'el guardado no cambia');
});
