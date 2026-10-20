'use strict';
/**
 * Atributos por categoría (D-495, ticket 1234): las pantallas corriendo de verdad,
 * con servicios falsos (sin red ni navegador).
 *
 *  1. Maestros > Categorías (list.component.ts, tarea 4.3):
 *     - sin la bandera: usa r[0] y el cuerpo de «Guardar» es exactamente el de siempre;
 *     - con la bandera: el documento lo elige el espejo, los renombres viajan al guardar
 *       (renombrar «Networking» conserva los atributos de «Networking > Routers»), y
 *       «Atributos» no abre con el árbol sucio.
 *  2. Pestaña «Especificaciones» (especificaciones-producto.component.ts, tarea 4.4):
 *     manda solo lo que cambió, avisa si falla y deja reintentar; la categoría cambia
 *     los campos y se resuelve como en el servidor (raíz repetida, renombre, forma 5).
 *  3. Crear/editar producto (crear-productos): la pestaña va detrás de la bandera y el
 *     payload de /create y /edit no cambia.
 *
 *   node --test tests/productos/atributos-componentes.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { stringify, parse } = require('flatted');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const espejo = require('../../src/app/shared/services/catalogo/atributos-categoria.ts');
const editor = require('../../src/app/shared/services/catalogo/atributos-editor.ts');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/atributos-esquemas.json'), 'utf8'));
const afuera = (v) => JSON.parse(JSON.stringify(v));

/** Carga la PRIMERA clase exportada del archivo, transpilada, con lo que necesite como globales. */
function cargarClase(relativa, extras = {}) {
  const archivo = path.join(RAIZ, relativa);
  const fuente = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = fuente.statements.find(ts.isClassDeclaration);
  const js = ts.transpileModule(clase.getText(fuente), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  const globales = {
    exports: {},
    console,
    Promise,
    Component: () => (v) => v,
    ViewChild: () => () => {},
    Input: () => () => {},
    Output: () => () => {},
    EventEmitter: class {
      constructor() {
        this.emitidos = [];
      }
      emit(v) {
        this.emitidos.push(v);
      }
    },
    ChangeDetectionStrategy: { OnPush: 0 },
    CommonModule: class {},
    FormsModule: class {},
    WeakMap,
    Map,
    parse,
    stringify,
    ...espejo,
    ...editor,
    ...extras,
  };
  vm.runInNewContext(js, globales);
  return Object.values(globales.exports)[0];
}

/** Observable falso que responde en el acto (o falla). */
const responde = (valor) => ({ subscribe: (a, b) => (typeof a === 'function' ? a : a.next)(valor) });
const falla = (err) => ({ subscribe: (a, b) => (typeof a === 'function' ? b : a.error)(err) });
const cdr = { detectChanges() {}, markForCheck() {} };

// ═══ 1. Maestros > Categorías ═══════════════════════════════════════════════

const ListComponent = cargarClase('src/app/components/ecomerce/categorias/list/list.component.ts', { MessageService: class {} });

function maestro(bandera, docs) {
  const enviados = [];
  const servicios = {
    nodeService: {
      getCategorias: () => responde(docs),
      createCategorias: (cuerpo) => {
        enviados.push(cuerpo);
        return responde({ msg: 'added', categorias: { categoria: cuerpo.categoria } });
      },
    },
    modal: { abiertos: 0, open() { this.abiertos++; return { close() {}, dismiss() {}, result: Promise.resolve() }; } },
    mensajes: { add() {} },
    features: { isEnabled: (f) => f === 'categoryAttributes' && bandera },
    atributos: { lecturas: 0, getSchemas() { this.lecturas++; return responde({ version: 3, schemas: FIXTURE.schemas }); } },
  };
  const c = new ListComponent(servicios.nodeService, cdr, servicios.modal, servicios.mensajes, servicios.features, servicios.atributos);
  c.obtenerCategorias();
  return { c, enviados, servicios };
}

function docsDeCategorias() {
  return [
    { company: 'X', empresa: 'prueba', categorias: ['Ramos'] },
    { company: 'X', empresa: 'prueba', categoria: stringify(FIXTURE.arbol) },
  ];
}

test('maestro sin la bandera: usa r[0] y el cuerpo de Guardar es el de siempre (sin renombres)', () => {
  const docs = [{ company: 'X', empresa: 'prueba', categoria: stringify(FIXTURE.arbol) }];
  const { c, enviados } = maestro(false, docs);
  assert.equal(c.categoriaPorEmpresa, docs[0]);
  c.data[0].data.nombre = 'Redes';
  c.marcarSucio();
  c.guardar();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0], docs[0], 'el mismo objeto de siempre');
  assert.deepEqual(Object.keys(enviados[0]).sort(), ['categoria', 'company', 'empresa']);
  assert.equal(c.atributosActivos, false);
});

test('maestro con la bandera: el documento lo elige el espejo (D2), no r[0]', () => {
  const docs = docsDeCategorias();
  const { c } = maestro(true, docs);
  assert.equal(c.categoriaPorEmpresa, docs[1]);
});

test('maestro con la bandera: renombrar Networking manda el renombre y conserva los atributos de Networking > Routers', () => {
  const { c, enviados } = maestro(true, docsDeCategorias());
  c.data[0].data.nombre = 'Redes';
  c.marcarSucio();
  c.guardar();
  const renombres = afuera(enviados[0].renombres);
  assert.deepEqual(renombres.find((r) => r.de.length === 1), { de: ['Networking'], a: ['Redes'] });
  // Lo que haría el servidor con ese cuerpo (mismo algoritmo, espejado en la prueba del backend).
  const destino = renombres.map((r) => ({ de: espejo.claveDeRuta(r.de), a: espejo.claveDeRuta(r.a) }));
  assert.ok(destino.some((r) => r.de === 'networking > routers' && r.a === 'redes > routers'));
  assert.equal(c.sucio, false, 'guardado: el árbol queda limpio');
  // Un segundo guardado sin cambios ya no manda renombres.
  c.guardar();
  assert.deepEqual(afuera(enviados[1].renombres), []);
});

test('«Atributos» no abre con el árbol sucio; limpio, lee los esquemas y abre con la ruta del nodo', () => {
  const { c, servicios } = maestro(true, docsDeCategorias());
  const routers = c.data[0].children[0];
  c.marcarSucio();
  c.abrirAtributos(routers);
  assert.equal(servicios.atributos.lecturas, 0);
  assert.equal(servicios.modal.abiertos, 0);
  c.guardar();
  c.abrirAtributos(routers);
  assert.equal(servicios.atributos.lecturas, 1);
  assert.equal(servicios.modal.abiertos, 1);
  assert.deepEqual(afuera(c.rutaAtributos), { clave: 'networking > routers', nombres: ['Networking', 'Routers'] });
  assert.equal(c.esquemasAtributos.version, 3);
});

test('sin la bandera, «Atributos» no hace nada', () => {
  const { c, servicios } = maestro(false, [{ company: 'X', categoria: stringify(FIXTURE.arbol) }]);
  c.abrirAtributos(c.data[0]);
  assert.equal(servicios.atributos.lecturas, 0);
});

// ═══ 2. Pestaña «Especificaciones» ══════════════════════════════════════════

const EspecificacionesProductoComponent = cargarClase(
  'src/app/components/productos/crear-productos/especificaciones-producto/especificaciones-producto.component.ts'
);

const BASE = { schemas: FIXTURE.schemas, indice: FIXTURE.indice };
const ROUTERS = { label: 'Routers', data: { nombre: 'Routers' }, ruta: ['Networking', 'Routers'] };

function pestana({
  guardados = { tecnologia_wifi: 'WiFi 6', modelo: 'Archer AX55' },
  productoId = 'PROD-1',
  fallaGuardar = false,
  maestro = BASE,
  categoria = ROUTERS,
} = {}) {
  const llamadas = [];
  const servicio = {
    getSchemas: () => responde({ version: 1, schemas: maestro.schemas, indice: maestro.indice }),
    saveProductAttributes: (cd, attributes) => {
      llamadas.push({ cd, attributes: afuera(attributes) });
      return fallaGuardar ? falla({ status: 400, error: { invalidos: [{ mensaje: '«Tecnología WiFi» debe ser una de: WiFi 5.' }] } }) : responde({ success: true, written: [], removed: [], missing: [] });
    },
  };
  const maestroFalso = { lecturas: 0, getProductsByIds() { this.lecturas++; return responde({ products: [] }); } };
  const c = new EspecificacionesProductoComponent(servicio, maestroFalso, cdr);
  c.categoria = categoria;
  c.productoId = productoId;
  c.guardados = guardados;
  c.ngOnInit();
  return { c, llamadas, maestroFalso };
}

test('especificaciones: los campos salen de la categoría y los valores guardados se cargan', () => {
  const { c, maestroFalso } = pestana();
  assert.deepEqual(afuera(c.esquema.map((d) => d.key)), ['tecnologia_wifi', 'velocidad', 'puertos_lan', 'mesh', 'sistemas', 'modelo']);
  assert.deepEqual(afuera(c.secciones.map((s) => s.titulo)), ['Especificaciones', 'Compatibilidad']);
  assert.equal(c.valores.tecnologia_wifi, 'WiFi 6');
  assert.equal(c.hayCambios(), false);
  assert.equal(maestroFalso.lecturas, 0, 'con los valores en mano no se pide el producto');
});

test('especificaciones: guardar manda solo lo que cambió (vaciar = null) y queda sin cambios', async () => {
  const { c, llamadas } = pestana();
  c.valores.velocidad = 1200;
  c.valores.modelo = '';
  assert.equal(c.hayCambios(), true);
  const r = await c.guardar('PROD-1');
  assert.equal(r.ok, true);
  assert.deepEqual(llamadas, [{ cd: 'PROD-1', attributes: { velocidad: 1200, modelo: null } }]);
  assert.equal(c.hayCambios(), false);
  // Al crear, el padre recibe el id nuevo después de guardar: no se pierde lo escrito.
  c.productoId = 'PROD-1';
  c.ngOnChanges({ productoId: { firstChange: false, currentValue: 'PROD-1' } });
  assert.equal(c.valores.velocidad, 1200);
});

test('especificaciones: si falla, lo dice y deja reintentar', async () => {
  const { c, llamadas } = pestana({ fallaGuardar: true });
  c.valores.tecnologia_wifi = 'WiFi 6E';
  const r = await c.guardar('PROD-1');
  assert.equal(r.ok, false);
  assert.match(r.mensaje, /Tecnología WiFi/);
  assert.match(c.aviso, /El producto se guardó, pero las especificaciones no/);
  assert.equal(c.avisoError, true);
  c.reintentar();
  assert.equal(llamadas.length, 2, 'reintentar vuelve a mandar lo pendiente');
});

test('especificaciones: cambiar la categoría cambia los campos; lo de la otra categoría no se manda', () => {
  const { c } = pestana();
  c.valores.velocidad = 1200;
  c.categoria = { label: 'Cámaras', data: { nombre: 'Cámaras' }, ruta: ['Cámaras'] };
  c.ngOnChanges({ categoria: { firstChange: false } });
  assert.deepEqual(afuera(c.esquema), []);
  assert.equal(c.hayCambios(), false);
});

// Revisión 2026-10-19: los tres casos en que el front y el servidor no coincidían.
test('especificaciones: raíz con el mismo nombre que una subcategoría → sin campos, dice por qué y no manda nada', async () => {
  const def = { key: 'tipo', label: 'Tipo', type: 'text', required: false, filterable: false, comparable: false, section: 'specs', order: 1 };
  const maestro = { schemas: { routers: { attributes: [def], aliases: [] } }, indice: FIXTURE.maestros.raizRepetida.indice };
  const { c, llamadas } = pestana({ maestro, categoria: { label: 'Routers', data: { nombre: 'Routers' }, children: [] }, guardados: {} });
  assert.equal(c.resolucion.estado, 'ambigua');
  assert.deepEqual(afuera(c.esquema), [], 'el servidor respondería 400: no se pintan campos');
  assert.match(c.textoVacio, /varias categorías con el mismo nombre/);
  const r = await c.guardar('PROD-1');
  assert.equal(r.ok, true);
  assert.equal(llamadas.length, 0);
  // La misma raíz con la ruta guardada (importador) sí resuelve.
  const ruta = pestana({ maestro, categoria: { label: 'Routers', ruta: ['Routers'] }, guardados: {} });
  assert.deepEqual(afuera(ruta.c.esquema.map((d) => d.key)), ['tipo']);
});

test('especificaciones: tras renombrar Networking a Redes, el producto con la ruta vieja ve y edita sus valores', async () => {
  const { c, llamadas } = pestana({ maestro: FIXTURE.maestros.renombrado });
  assert.equal(c.resolucion.estado, 'porAlias');
  assert.equal(c.nombreRuta, 'Redes > Routers', 'el nombre vigente, no el viejo');
  assert.deepEqual(afuera(c.esquema.map((d) => d.key)), ['tecnologia_wifi', 'velocidad', 'puertos_lan', 'mesh', 'sistemas', 'modelo']);
  assert.equal(c.valores.tecnologia_wifi, 'WiFi 6');
  assert.equal(c.nombreDe(c.esquema[0].origen), 'Redes');
  c.valores.velocidad = 1200;
  await c.guardar('PROD-1');
  assert.deepEqual(llamadas, [{ cd: 'PROD-1', attributes: { velocidad: 1200 } }]);
});

test('especificaciones: arreglo de textos (forma 5, OH MY STORE) resuelve por etiquetas', () => {
  const { c } = pestana({ categoria: ['Networking', 'Routers'] });
  assert.equal(c.resolucion.estado, 'porEtiquetas');
  assert.equal(c.nombreRuta, 'Networking > Routers');
  assert.equal(c.esquema.length, 6);
});

test('especificaciones: sin categoría o fuera del árbol, el aviso lo dice', () => {
  assert.match(pestana({ categoria: '' }).c.textoVacio, /Elige la categoría/);
  const fuera = pestana({ categoria: { label: 'Juguetes', ruta: ['Juguetes'] } }).c;
  assert.equal(fuera.resolucion.estado, 'fueraDelArbol');
  assert.match(fuera.textoVacio, /ya no está en Maestros/);
  const sinAtributos = pestana({ categoria: { label: 'Cámaras', ruta: ['Cámaras'] } }).c;
  assert.match(sinAtributos.textoVacio, /Agrega atributos a «Cámaras»/);
});

test('especificaciones en edición sin valores a mano: se leen del producto', () => {
  const { maestroFalso } = pestana({ guardados: null });
  assert.equal(maestroFalso.lecturas, 1);
});

// ═══ 3. Crear/editar producto ═══════════════════════════════════════════════

test('crear-productos: la pestaña va detrás de la bandera y el payload de /create y /edit no cambia', () => {
  const html = fs.readFileSync(path.join(RAIZ, 'src/app/components/productos/crear-productos/crear-productos.component.html'), 'utf8');
  assert.match(html, /<p-tabPanel header="Especificaciones" \*ngIf="features\.isEnabled\('categoryAttributes'\)">/);
  const tsFuente = fs.readFileSync(path.join(RAIZ, 'src/app/components/productos/crear-productos/crear-productos.component.ts'), 'utf8');
  const payload = tsFuente.slice(tsFuente.indexOf('const payload = {'), tsFuente.indexOf('this.service.createProduct(payload)'));
  assert.ok(payload.length > 0 && !/especificaciones|attributes/i.test(payload), 'el payload de /create no se toca');
  const editar = tsFuente.slice(tsFuente.indexOf('const formGeneralEditar = {'), tsFuente.indexOf('this.service.editProductByReference(formGeneralEditar)'));
  assert.ok(editar.length > 0 && !/especificaciones|attributes/i.test(editar), 'el payload de /edit no se toca');
  const pendientes = tsFuente.slice(tsFuente.indexOf('private especificacionesPendientes'), tsFuente.indexOf('private avisarEspecificaciones'));
  assert.match(pendientes, /features\.isEnabled\("categoryAttributes"\)/, 'sin la bandera no hay nada que guardar');
  assert.ok(!/setTimeout/.test(pendientes));
  assert.ok(!/attributes/.test(fs.readFileSync(path.join(RAIZ, 'src/app/components/productos/crear-productos/crear-productos.component.ts'), 'utf8').match(/this\.formGeneral = this\.fb\.group\([\s\S]{0,4000}?\}\);/)?.[0] || ''), 'formGeneral sin attributes');
});
