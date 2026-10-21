'use strict';
/**
 * «Uniformar fotos» — entradas al diálogo (TX-37 · 7.12, D-518 TX-37·1 y TX-37·4).
 *
 * Qué protege:
 *  - la parte pura (`fotos-uniformes-entradas.ts`): la ruta de la categoría filtrada como
 *    `categoryPath` (con la subcategoría, traducida a los nombres del servidor) y los ids;
 *  - la lista de productos: el botón de categoría manda la ruta, sin «· hasta 100» ni el tooltip
 *    del tope; la selección masiva pasa más de 100;
 *  - el editor del sitio: «Uniformar fotos de estos productos» en la sección «Productos» y
 *    «Uniformar fotos por categoría» en «Catálogo completo», solo con la bandera; la proporción
 *    del estilo como sugerida; al cerrar con cambios recarga las fotos de la vista previa;
 *  - el detalle de Catálogos por link: «Uniformar fotos de este catálogo» en `cfg-acciones`
 *    (`cfg-btn cfg-btn--sec`), solo con el catálogo guardado y con productos; con cambios sin
 *    guardar avisa con un mensaje visible y no abre; recarga al cerrar con cambios;
 *  - que cada diff se limita al botón, abrir el diálogo y recargar: sin clases con "p-", sin
 *    degradados ni primarios prohibidos.
 *
 * Los métodos se prueban de verdad: se transpilan desde el componente real (sin Angular ni red),
 * como en `tests/sitios/editor-guardado-concurrente.test.js`.
 *
 *   node --test tests/productos/fotos-uniformes-entradas.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { stringify } = require('flatted');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const entradas = require('../../src/app/components/productos/fotos-uniformes/fotos-uniformes-entradas.ts');
const mapper = require('../../src/app/shared/services/productos/product-photos.mapper.ts');

// Los objetos creados dentro de `vm` tienen otro Object.prototype: se comparan ya planos.
const plano = (v) => JSON.parse(JSON.stringify(v));
const leer = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), 'utf8');

const LISTA = 'src/app/components/productos/productos.component';
const EDITOR = 'src/app/components/sitios/editor/sitio-editor.component';
const DETALLE = 'src/app/components/cotizaciones/catalogos-link/detalle/catalogo-link-detalle.component';

/**
 * Saca de la clase real los miembros pedidos (métodos y getters) y los compila en una clase
 * pequeña. `globales` da lo que esos miembros nombran fuera de la clase.
 */
function clasePequena(relativo, nombres, globales = {}) {
  const archivo = path.join(RAIZ, relativo);
  const fuente = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = fuente.statements.find((n) => ts.isClassDeclaration(n));
  const miembros = clase.members.filter((m) => m.name && nombres.includes(m.name.getText(fuente)));
  const encontrados = new Set(miembros.map((m) => m.name.getText(fuente)));
  assert.deepEqual(nombres.filter((n) => !encontrados.has(n)), [], `${relativo}: faltan miembros`);
  const js = ts.transpileModule(`export class Pequena { ${miembros.map((m) => m.getText(fuente)).join('\n')} }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const contexto = { exports: {}, ...globales };
  vm.runInNewContext(js, contexto);
  return contexto.exports.Pequena;
}

const banderas = (encendida) => ({ isEnabled: (b) => encendida && b === 'productPhotoUniform', pedidas: [] });

/** Documento de categorías como lo da /v1/categorias/all (árbol en flatted). */
const documento = (arbol, extra = {}) => ({ categoria: stringify(arbol), ...extra });

// ── Parte pura ────────────────────────────────────────────────────────────────

test('rutaDeFiltros: sin categoría real no hay ruta; con subcategoría van los dos niveles', () => {
  assert.equal(entradas.rutaDeFiltros('', ''), null);
  assert.equal(entradas.rutaDeFiltros('   ', 'Rosas'), null);
  assert.equal(entradas.rutaDeFiltros('__SIN_CATEGORIA__', ''), null);
  assert.equal(entradas.rutaDeFiltros(undefined), null);
  assert.deepEqual(entradas.rutaDeFiltros('Flores', ''), ['Flores']);
  assert.deepEqual(entradas.rutaDeFiltros(' Flores ', ' Rosas '), ['Flores', 'Rosas']);
  assert.deepEqual(entradas.rutaDeFiltros('Flores', '__SIN_CATEGORIA__'), ['Flores']);
  // Lo que se arma es una ruta que el mapper acepta tal cual (`categoryPath`).
  const sel = mapper.seleccionDeEntradas({ productIds: [], categoryPath: entradas.rutaDeFiltros('Flores', 'Rosas') });
  assert.deepEqual(sel, { tipo: 'categoria', categoryPath: ['Flores', 'Rosas'] });
  assert.deepEqual(mapper.cuerpoVistaPrevia(sel, { aspect: '1:1', background: 'white', marginPct: 8 }, []).categoryPath, ['Flores', 'Rosas']);
});

test('rutaDeFiltros: traduce los nombres del filtro (data.nombre primero) a los del servidor (label primero)', () => {
  const arbol = [
    { label: 'Flores', data: { nombre: 'Flores frescas' }, children: [{ label: 'Rosas', data: { nombre: 'Rosas rojas' } }, { data: { nombre: 'Tulipanes' } }] },
    { label: 'Velas', children: [] },
  ];
  const docs = [documento(arbol)];
  // La lista muestra «Flores frescas › Rosas rojas»; el servidor conoce «Flores › Rosas».
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', 'Rosas rojas', docs), ['Flores', 'Rosas']);
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', '', docs), ['Flores']);
  // Un nodo sin `label`: el servidor también usa `data.nombre`.
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', 'Tulipanes', docs), ['Flores', 'Tulipanes']);
  assert.deepEqual(entradas.rutaDeFiltros('Velas', '', docs), ['Velas']);
  // Sin el nodo (o con el árbol dañado) viajan los nombres del filtro: el servidor responde.
  assert.deepEqual(entradas.rutaDeFiltros('Otra', '', docs), ['Otra']);
  // Si la subcategoría no aparece, la categoría ya traducida se conserva (no se pierde todo).
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', 'Otra', docs), ['Flores', 'Otra']);
  // El nombre del servidor también se reconoce (filtro restaurado con ese nombre).
  assert.deepEqual(entradas.rutaDeFiltros('Flores', 'Rosas', docs), ['Flores', 'Rosas']);
  assert.deepEqual(entradas.rutaDeFiltros('Velas', '', [{ categoria: '{no es flatted' }]), ['Velas']);
  // Árbol ya como arreglo (no flatted).
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', 'Rosas rojas', [{ categoria: arbol }]), ['Flores', 'Rosas']);
});

test('rutaDeFiltros: si el servidor usa otro documento (D-495), se traduce con ESE documento', () => {
  const vacio = { categoria: '' };
  const real = documento([{ label: 'Flores', data: { nombre: 'Flores frescas' }, children: [{ label: 'Rosas', data: { nombre: 'Rosas rojas' } }] }]);
  // La lista lee r[0]; el servidor elige el primero legible (`documentoDeCategorias`): son distintos.
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', '', [vacio, real]), ['Flores']);
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', 'Rosas rojas', [vacio, real]), ['Flores', 'Rosas']);
  // Sin ningún documento, o si el nodo no está en el del servidor, viajan los nombres del filtro.
  assert.deepEqual(entradas.rutaDeFiltros('Flores frescas', '', []), ['Flores frescas']);
  assert.deepEqual(entradas.rutaDeFiltros('Velas', '', [vacio, real]), ['Velas']);
});

test('idsParaUniformar: texto no vacío, sin repetir, en el mismo orden', () => {
  assert.deepEqual(entradas.idsParaUniformar(['a', ' b ', '', null, 'a', 3, 'c']), ['a', 'b', 'c']);
  assert.deepEqual(entradas.idsParaUniformar(undefined), []);
  assert.deepEqual(entradas.idsParaUniformar('a'), []);
  const doscientos = Array.from({ length: 200 }, (_x, i) => `p${i}`);
  assert.equal(entradas.idsParaUniformar(doscientos).length, 200);
});

// ── Lista de productos ────────────────────────────────────────────────────────

function lista({ encendida = true, categoria = '', subcategoria = '', docs = [], seleccion = [], cargadas = true } = {}) {
  const Clase = clasePequena(`${LISTA}.ts`,
    ['fotosUniformesActiva', 'categoriaParaFotos', 'abrirFotosUniformesSeleccion', 'abrirFotosUniformesCategoria', 'cerrarFotosUniformes'],
    { BANDERA_FOTOS_UNIFORMES: 'productPhotoUniform', ProductosComponent: { SIN_CATEGORIA: '__SIN_CATEGORIA__' }, rutaDeFiltros: entradas.rutaDeFiltros });
  const c = new Clase();
  const recargas = [];
  Object.assign(c, {
    features: banderas(encendida),
    filtros: { categoria, subcategoria },
    categoriasDocs: docs,
    categoriasCargadas: cargadas,
    selectedProductos: seleccion,
    rowId: (p) => p.cd,
    fotosUniformes: null,
    cargarConFiltros: () => recargas.push(1),
  });
  return { c, recargas };
}

test('lista: el botón de categoría manda la ruta [categoria] o [categoria, subcategoria]', () => {
  const { c } = lista({ categoria: 'Flores' });
  c.abrirFotosUniformesCategoria();
  assert.deepEqual(plano(c.fotosUniformes), { productIds: [], categoryPath: ['Flores'] });

  const con = lista({ categoria: 'Flores', subcategoria: 'Rosas' }).c;
  con.abrirFotosUniformesCategoria();
  assert.deepEqual(plano(con.fotosUniformes), { productIds: [], categoryPath: ['Flores', 'Rosas'] });

  const traducida = lista({ categoria: 'Flores frescas', subcategoria: 'Rosas rojas', docs: [documento([{ label: 'Flores', data: { nombre: 'Flores frescas' }, children: [{ label: 'Rosas', data: { nombre: 'Rosas rojas' } }] }])] }).c;
  traducida.abrirFotosUniformesCategoria();
  assert.deepEqual(traducida.fotosUniformes.categoryPath, ['Flores', 'Rosas']);
});

test('lista: sin la bandera o con «Sin categoría» no se abre', () => {
  const apagada = lista({ encendida: false, categoria: 'Flores' }).c;
  apagada.abrirFotosUniformesCategoria();
  assert.equal(apagada.fotosUniformes, null);
  const sinCat = lista({ categoria: '__SIN_CATEGORIA__' }).c;
  sinCat.abrirFotosUniformesCategoria();
  assert.equal(sinCat.fotosUniformes, null);
  const apagadaSel = lista({ encendida: false, seleccion: [{ cd: 'p1' }] }).c;
  apagadaSel.abrirFotosUniformesSeleccion();
  assert.equal(apagadaSel.fotosUniformes, null);
});

test('lista: el botón de categoría espera a que lleguen las categorías (filtros restaurados de sesión)', () => {
  const docs = [documento([{ label: 'Flores', data: { nombre: 'Flores frescas' } }])];
  const antes = lista({ categoria: 'Flores frescas', docs: [], cargadas: false }).c;
  antes.abrirFotosUniformesCategoria();
  assert.equal(antes.fotosUniformes, null, 'sin categorías no manda nombres sin traducir');
  const despues = lista({ categoria: 'Flores frescas', docs }).c;
  despues.abrirFotosUniformesCategoria();
  assert.deepEqual(despues.fotosUniformes.categoryPath, ['Flores']);
  // Se marca en la respuesta y también si /v1/categorias falla (el botón no queda escondido).
  const fuente = leer(`${LISTA}.ts`);
  assert.match(fuente, /this\.service\.getCategorias\(\)\.subscribe\(\(r: any\) => \{\n\s+this\.categoriasCargadas = true;/);
  assert.match(fuente, /\}, \(\) => \{ this\.categoriasCargadas = true; \}\);/);
});

test('lista: la barra masiva pasa más de 100 productos (el diálogo arma la serie)', () => {
  const seleccion = Array.from({ length: 150 }, (_x, i) => ({ cd: `p${i}` }));
  const { c } = lista({ seleccion });
  c.abrirFotosUniformesSeleccion();
  assert.equal(c.fotosUniformes.productIds.length, 150);
  assert.equal(c.fotosUniformes.categoryPath, null);
});

test('lista: al cerrar recarga solo si algo cambió', () => {
  const { c, recargas } = lista({ categoria: 'Flores' });
  c.abrirFotosUniformesCategoria();
  c.cerrarFotosUniformes({ cambio: false });
  assert.equal(c.fotosUniformes, null);
  assert.equal(recargas.length, 0);
  c.abrirFotosUniformesCategoria();
  c.cerrarFotosUniformes({ cambio: true });
  assert.equal(recargas.length, 1);
});

test('lista (plantilla): sin «· hasta 100» ni el tooltip del tope, y el diálogo recibe categoryPath', () => {
  const html = leer(`${LISTA}.html`);
  const boton = html.match(/<button \*ngIf="fotosUniformesActiva && categoriaParaFotos && categoriasCargadas"[\s\S]*?<\/button>/);
  assert.ok(boton, 'botón de categoría con la bandera y las categorías cargadas');
  assert.doesNotMatch(boton[0], /hasta 100/);
  assert.doesNotMatch(boton[0], /title=/);
  // Con una subcategoría filtrada el texto dice «subcategoría»: eso es lo que se uniforma.
  assert.match(boton[0], /\{\{ filtros\.subcategoria \? 'Uniformar fotos de esta subcategoría' : 'Uniformar fotos de esta categoría' \}\}/);
  const dialogo = html.match(/<app-fotos-uniformes[\s\S]*?<\/app-fotos-uniformes>/)[0];
  assert.match(dialogo, /\[categoryPath\]="fotosUniformes\.categoryPath"/);
  assert.doesNotMatch(dialogo, /categoryLabel/);
  assert.match(html, /<button \*ngIf="fotosUniformesActiva" type="button" class="pk-btn-sm pk-btn-sm-ghost fu-entrada"/, 'barra masiva con la bandera');
});

test('lista (código): el filtro de categorías no cambia; solo se guardan los documentos para la ruta', () => {
  const fuente = leer(`${LISTA}.ts`);
  assert.match(fuente, /label: p\.data\?\.nombre \|\| p\.label \|\| ''/, 'las opciones del filtro siguen igual');
  assert.match(fuente, /this\.categoriasDocs = Array\.isArray\(r\) \? r : \[\];/);
  assert.match(fuente, /fotosUniformes: \{ productIds: string\[\]; categoryPath: string\[\] \| null \} \| null = null;/);
});

// ── Editor del sitio ──────────────────────────────────────────────────────────

function editor({ encendida = true, bloque = null, tema = {} } = {}) {
  const Clase = clasePequena(`${EDITOR}.ts`,
    ['fotosUniformesActiva', 'proporcionDelEstilo', 'abrirFotosUniformesDelBloque', 'abrirFotosUniformesPorCategoria', 'cerrarFotosUniformes'],
    { idsParaUniformar: entradas.idsParaUniformar });
  const e = new Clase();
  const recargas = [];
  Object.assign(e, {
    features: banderas(encendida),
    bloqueActual: bloque,
    contenido: { tema },
    fotosUniformes: null,
    resolverProductosDePrevia: () => recargas.push(1),
  });
  return { e, recargas };
}

const bloqueProductos = (ids) => ({ id: 'b1', tipo: 'productos', datos: { productoIds: ids } });
const bloqueCatalogo = () => ({ id: 'b2', tipo: 'catalogo', datos: {} });

test('editor: «Productos» abre el diálogo con los elegidos de la sección', () => {
  const ids = Array.from({ length: 8 }, (_x, i) => `p${i}`);
  const { e } = editor({ bloque: bloqueProductos([...ids, 'p0']) });
  e.abrirFotosUniformesDelBloque();
  assert.deepEqual(plano(e.fotosUniformes), { productIds: ids, elegirCategoria: false });
});

test('editor: sin la bandera, sin elegidos o en otra sección no se abre', () => {
  const apagada = editor({ encendida: false, bloque: bloqueProductos(['p1']) }).e;
  apagada.abrirFotosUniformesDelBloque();
  assert.equal(apagada.fotosUniformes, null);
  assert.equal(apagada.fotosUniformesActiva, false);
  const vacia = editor({ bloque: bloqueProductos([]) }).e;
  vacia.abrirFotosUniformesDelBloque();
  assert.equal(vacia.fotosUniformes, null);
  const otra = editor({ bloque: bloqueCatalogo() }).e;
  otra.abrirFotosUniformesDelBloque();
  assert.equal(otra.fotosUniformes, null);
  const sinFeatures = editor({ bloque: bloqueProductos(['p1']) }).e;
  sinFeatures.features = undefined;
  assert.equal(sinFeatures.fotosUniformesActiva, false);
});

test('editor: «Catálogo completo» abre en el paso de elegir la categoría (pregunta 4: sí)', () => {
  const { e } = editor({ bloque: bloqueCatalogo() });
  e.abrirFotosUniformesPorCategoria();
  assert.deepEqual(plano(e.fotosUniformes), { productIds: [], elegirCategoria: true });
  const apagada = editor({ encendida: false, bloque: bloqueCatalogo() }).e;
  apagada.abrirFotosUniformesPorCategoria();
  assert.equal(apagada.fotosUniformes, null);
  const enProductos = editor({ bloque: bloqueProductos(['p1']) }).e;
  enProductos.abrirFotosUniformesPorCategoria();
  assert.equal(enProductos.fotosUniformes, null);
  // El diálogo abre en el paso de categoría con esas entradas (sin productos ni categoría).
  const sel = mapper.seleccionDeEntradas({ productIds: [], categoryPath: null, categoryLabel: '' });
  assert.equal(mapper.seleccionValida(sel), false);
});

test('editor: la proporción del estilo se sugiere (pregunta 13: sí); «Del estilo» no sugiere nada', () => {
  assert.equal(editor({ tema: { fotoProporcion: '4:5' } }).e.proporcionDelEstilo, '4:5');
  assert.equal(editor({ tema: { fotoProporcion: '3:4' } }).e.proporcionDelEstilo, '3:4');
  assert.equal(editor({ tema: { fotoProporcion: '' } }).e.proporcionDelEstilo, null);
  assert.equal(editor({ tema: {} }).e.proporcionDelEstilo, null);
  const sinContenido = editor().e;
  sinContenido.contenido = null;
  assert.equal(sinContenido.proporcionDelEstilo, null);
  // El diálogo empieza en ella (mapper de 7.11).
  assert.equal(mapper.ajustesIniciales(null, null, '4:5').aspect, '4:5');
  assert.equal(mapper.ajustesIniciales(null, null, null).aspect, '1:1');
});

test('editor: al cerrar con cambios vuelve a pedir las fotos de los elegidos; sin cambios, no', () => {
  const { e, recargas } = editor({ bloque: bloqueProductos(['p1']) });
  e.abrirFotosUniformesDelBloque();
  e.cerrarFotosUniformes({ cambio: false });
  assert.equal(e.fotosUniformes, null);
  assert.equal(recargas.length, 0);
  e.abrirFotosUniformesDelBloque();
  e.cerrarFotosUniformes({ cambio: true });
  assert.equal(recargas.length, 1);
  // Lo que se recarga es lo mismo de lo que salen las miniaturas de elegidosDelBloque.
  assert.match(leer(`${EDITOR}.ts`), /private resolverProductosDePrevia\(\): void \{[\s\S]*?this\.productosPrevia\.set\(p\.cd,/);
});

test('editor (plantilla): botones solo con la bandera, btn-fantasma y el diálogo con sus entradas', () => {
  const html = leer(`${EDITOR}.html`);
  const productos = html.slice(html.indexOf("<ng-container *ngIf=\"b.tipo === 'productos'\">"), html.indexOf('<div class="elegidos__lista"'));
  assert.match(productos, /<button \*ngIf="fotosUniformesActiva && \(b\.datos\.productoIds\?\.length \|\| 0\)" type="button"\s+class="btn-fantasma btn-fantasma--sm fu-entrada-sitio"\s+\(click\)="abrirFotosUniformesDelBloque\(\)">Uniformar fotos de estos productos<\/button>/);
  const catalogo = html.slice(html.indexOf("<ng-container *ngIf=\"b.tipo === 'catalogo'\">"));
  assert.match(catalogo.slice(0, 1200), /<button \*ngIf="fotosUniformesActiva" type="button"\s+class="btn-fantasma btn-fantasma--sm fu-entrada-sitio fu-entrada-sitio--catalogo"\s+\(click\)="abrirFotosUniformesPorCategoria\(\)">Uniformar fotos por categoría<\/button>/);
  const dialogo = html.match(/<app-fotos-uniformes[\s\S]*?<\/app-fotos-uniformes>/)[0];
  assert.match(dialogo, /\*ngIf="fotosUniformes" appAlBody/);
  assert.match(dialogo, /\[productIds\]="fotosUniformes\.productIds"/);
  assert.match(dialogo, /\[elegirCategoria\]="fotosUniformes\.elegirCategoria"/);
  assert.match(dialogo, /\[proporcionSugerida\]="proporcionDelEstilo"/);
  assert.match(dialogo, /\(cerrado\)="cerrarFotosUniformes\(\$event\)"/);
  const modulo = leer('src/app/components/sitios/sitios.module.ts');
  assert.match(modulo, /import \{ FotosUniformesComponent \} from "\.\.\/productos\/fotos-uniformes\/fotos-uniformes\.component";/);
  assert.match(modulo, /imports: \[[^\]]*AlBodyModule, FotosUniformesComponent\]/);
});

test('editor (estilos): la clase nueva sin "p-", con foco visible y sin letter-spacing heredado', () => {
  const scss = leer(`${EDITOR}.scss`);
  const regla = scss.match(/\.fu-entrada-sitio \{[\s\S]*?\n\}/);
  assert.ok(regla, 'regla .fu-entrada-sitio');
  assert.match(regla[0], /&:focus-visible \{ outline: 3px solid #7C5CFF !important;/);
  assert.match(regla[0], /letter-spacing: normal;/);
  assert.doesNotMatch(regla[0], /gradient/);
});

test('editor: con el diálogo abierto, los atajos del editor no actúan (Escape, Ctrl+Z, Ctrl+Y, Ctrl+S)', () => {
  const Clase = clasePequena(`${EDITOR}.ts`, ['atajos'], { HostListener: () => () => undefined });
  const llamadas = [];
  const e = new Clase();
  Object.assign(e, {
    mostrandoAgregar: false,
    seleccionado: 2,
    fotosUniformes: { productIds: ['p1'], elegirCategoria: false },
    cerrarAgregar: () => llamadas.push('cerrarAgregar'),
    cerrarSeccion: () => llamadas.push('cerrarSeccion'),
    deshacer: () => llamadas.push('deshacer'),
    rehacer: () => llamadas.push('rehacer'),
    guardar: () => llamadas.push('guardar'),
  });
  const tecla = (key, extra = {}) => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, target: { tagName: 'BUTTON' }, preventDefault() { this.prevenido = true; }, ...extra });
  const eventos = [tecla('Escape'), tecla('z', { ctrlKey: true }), tecla('y', { ctrlKey: true }), tecla('s', { metaKey: true })];
  for (const ev of eventos) e.atajos(ev);
  assert.deepEqual(llamadas, []);
  assert.equal(eventos.some((ev) => ev.prevenido), false, 'no le quita la tecla al diálogo');
  // Cerrado el diálogo, los atajos vuelven a funcionar como siempre.
  e.fotosUniformes = null;
  e.atajos(tecla('Escape'));
  e.atajos(tecla('z', { ctrlKey: true }));
  e.atajos(tecla('s', { ctrlKey: true }));
  assert.deepEqual(llamadas, ['cerrarSeccion', 'deshacer', 'guardar']);
});

// ── Catálogos por link ────────────────────────────────────────────────────────

function detalle({ encendida = true, catalogo = { id: 'c1', productoIds: ['p1', 'p2'] }, esNuevo = false, hayCambios = false } = {}) {
  const Clase = clasePequena(`${DETALLE}.ts`,
    ['fotosUniformesActiva', 'hayProductosParaUniformar', 'abrirFotosUniformes', 'cerrarFotosUniformes'],
    { idsParaUniformar: entradas.idsParaUniformar });
  const d = new Clase();
  const cargas = [];
  const avisos = [];
  Object.assign(d, {
    features: banderas(encendida), catalogo, esNuevo, hayCambios, fotosUniformes: null,
    cargar: (id) => cargas.push(id),
    toastr: { warning: (m) => avisos.push(m) },
  });
  return { d, cargas, avisos };
}

test('catálogo por link: abre con los productos del catálogo guardado (hasta 200: serie de 2)', () => {
  const ids = Array.from({ length: 150 }, (_x, i) => `p${i}`);
  const { d } = detalle({ catalogo: { id: 'c1', productoIds: ids } });
  assert.equal(d.hayProductosParaUniformar, true);
  d.abrirFotosUniformes();
  assert.deepEqual(d.fotosUniformes, ids);
  // 150 productos: el diálogo dice que se harán 2 lotes seguidos (spec product-photo-batch-scope).
  const conteo = mapper.conteoDeSeleccion(mapper.seleccionDeEntradas({ productIds: d.fotosUniformes }), null,
    { limits: { maxProducts: 100, maxSeriesProducts: 2000, maxPhotosPerProduct: 12, previewMaxPhotos: 3 } });
  assert.equal(mapper.textoDeConteo(conteo), '150 productos · se harán 2 lotes seguidos de hasta 100');
});

test('catálogo por link: sin la bandera, nuevo, sin productos o con cambios sin guardar no se abre', () => {
  const casos = [
    detalle({ encendida: false }),
    detalle({ esNuevo: true }),
    detalle({ catalogo: null }),
    detalle({ catalogo: { id: 'c1', productoIds: [] } }),
    detalle({ catalogo: { id: 'c1', productoIds: ['', null, '  '] } }),
  ];
  for (const { d, avisos } of casos) {
    d.abrirFotosUniformes();
    assert.equal(d.fotosUniformes, null);
    assert.deepEqual(avisos, []);
  }
  assert.equal(detalle({ encendida: false }).d.fotosUniformesActiva, false);
  assert.equal(detalle({ esNuevo: true }).d.fotosUniformesActiva, false);
  // Sin productos guardados válidos el botón no sale (no queda deshabilitado y sin explicación).
  assert.equal(detalle({ catalogo: { id: 'c1', productoIds: [] } }).d.hayProductosParaUniformar, false);
  assert.equal(detalle({ catalogo: { id: 'c1', productoIds: ['', null] } }).d.hayProductosParaUniformar, false);
  assert.equal(detalle({ catalogo: null }).d.hayProductosParaUniformar, false);
  // Con cambios sin guardar el botón se ve; al tocarlo avisa con un mensaje visible y no abre.
  const conCambios = detalle({ hayCambios: true });
  assert.equal(conCambios.d.fotosUniformesActiva, true);
  assert.equal(conCambios.d.hayProductosParaUniformar, true);
  conCambios.d.abrirFotosUniformes();
  assert.equal(conCambios.d.fotosUniformes, null);
  assert.deepEqual(conCambios.avisos, ['Guarda los cambios antes de uniformar las fotos.']);
});

test('catálogo por link: al cerrar con cambios recarga el detalle; sin cambios, no', () => {
  const { d, cargas } = detalle();
  d.abrirFotosUniformes();
  d.cerrarFotosUniformes({ cambio: false });
  assert.equal(d.fotosUniformes, null);
  assert.deepEqual(cargas, []);
  d.abrirFotosUniformes();
  d.cerrarFotosUniformes({ cambio: true });
  assert.deepEqual(cargas, ['c1']);
});

test('catálogo por link (plantilla): en cfg-acciones, cfg-btn cfg-btn--sec, con la bandera y el diálogo', () => {
  const html = leer(`${DETALLE}.html`);
  const acciones = html.match(/<div class="cfg-acciones">[\s\S]*?<\/div>/)[0];
  assert.match(acciones, /<button \*ngIf="fotosUniformesActiva && hayProductosParaUniformar" class="cfg-btn cfg-btn--sec" type="button"\s+\(click\)="abrirFotosUniformes\(\)"/);
  assert.match(acciones, /<span>Uniformar fotos de este catálogo<\/span>/);
  // El motivo ya no va en un `title` (no se ve en el celular) ni el botón se deshabilita.
  const boton = acciones.match(/<button \*ngIf="fotosUniformesActiva[\s\S]*?<\/button>/)[0];
  assert.doesNotMatch(boton, /title=|\[disabled\]/);
  const dialogo = html.match(/<app-fotos-uniformes[\s\S]*?<\/app-fotos-uniformes>/)[0];
  assert.match(dialogo, /\*ngIf="fotosUniformes" appAlBody/);
  assert.match(dialogo, /\[productIds\]="fotosUniformes"/);
  assert.match(dialogo, /\(cerrado\)="cerrarFotosUniformes\(\$event\)"/);
  const modulo = leer('src/app/components/cotizaciones/catalogos-link/catalogos-link.module.ts');
  assert.match(modulo, /imports: \[[^\]]*AlBodyModule, FotosUniformesComponent\]/);
  const fuente = leer(`${DETALLE}.ts`);
  assert.match(fuente, /private features: CompanyFeaturesService,/);
  assert.match(fuente, /this\.features\.isEnabled\("productPhotoUniform"\)/);
});

// ── Contrato de las plantillas con el diálogo (lo que tsc no revisa) ─────────

test('plantillas: cada entrada y salida de <app-fotos-uniformes> existe en el diálogo standalone', () => {
  const dialogo = leer('src/app/components/productos/fotos-uniformes/fotos-uniformes.component.ts');
  assert.match(dialogo, /selector: 'app-fotos-uniformes',\s+standalone: true,/);
  const entradasDelDialogo = new Set([...dialogo.matchAll(/@Input\(\) (\w+)/g)].map((m) => m[1]));
  const salidasDelDialogo = new Set([...dialogo.matchAll(/@Output\(\) (\w+)/g)].map((m) => m[1]));
  for (const plantilla of [`${LISTA}.html`, `${EDITOR}.html`, `${DETALLE}.html`]) {
    const etiqueta = leer(plantilla).match(/<app-fotos-uniformes[\s\S]*?>/)[0];
    const entradasUsadas = [...etiqueta.matchAll(/\[(\w+)\]=/g)].map((m) => m[1]);
    const salidasUsadas = [...etiqueta.matchAll(/\((\w+)\)=/g)].map((m) => m[1]);
    assert.ok(entradasUsadas.length > 0 && salidasUsadas.length > 0, plantilla);
    for (const e of entradasUsadas) assert.ok(entradasDelDialogo.has(e), `${plantilla}: [${e}] no es @Input del diálogo`);
    for (const s of salidasUsadas) assert.ok(salidasDelDialogo.has(s), `${plantilla}: (${s}) no es @Output del diálogo`);
  }
  // appAlBody: la directiva existe con ese selector y la exporta el módulo que importan las dos pantallas.
  assert.match(leer('src/app/shared/directives/al-body.directive.ts'), /@Directive\(\{ selector: "\[appAlBody\]" \}\)/);
  assert.match(leer('src/app/shared/directives/al-body.module.ts'), /exports: \[AlBodyDirective\]/);
  for (const modulo of ['src/app/components/sitios/sitios.module.ts', 'src/app/components/cotizaciones/catalogos-link/catalogos-link.module.ts']) {
    const fuente = leer(modulo);
    assert.match(fuente, /import \{ AlBodyModule \} from/, modulo);
    assert.match(fuente, /import \{ FotosUniformesComponent \} from "[./]+\/productos\/fotos-uniformes\/fotos-uniformes\.component";/, modulo);
  }
});

// ── Disciplina del diff ───────────────────────────────────────────────────────

test('entradas: clases nuevas sin "p-", sin degradados ni primarios prohibidos en los archivos tocados', () => {
  const PROHIBIDOS = /(linear|radial)-gradient\(|#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea|#3b82f6|#1d4ed8|#6366f1|#1976d2|#7366ff|rgba\(102,\s*126,\s*234/i;
  const clasesNuevas = ['fu-entrada-sitio', 'fu-entrada-sitio--catalogo', 'fu-entrada', 'cfg-btn', 'cfg-btn--sec'];
  for (const c of clasesNuevas) assert.doesNotMatch(c, /p-/, c);
  const archivos = [
    `${LISTA}.html`, `${EDITOR}.html`, `${EDITOR}.scss`, `${DETALLE}.html`, `${DETALLE}.scss`,
    'src/app/components/productos/fotos-uniformes/fotos-uniformes-entradas.ts',
  ];
  for (const a of archivos) {
    const fragmentos = leer(a).split('\n').filter((l) => /fu-entrada|Uniformar fotos|app-fotos-uniformes/.test(l));
    for (const l of fragmentos) assert.doesNotMatch(l, PROHIBIDOS, `${a}: ${l.trim()}`);
  }
  assert.doesNotMatch(leer('src/app/components/productos/fotos-uniformes/fotos-uniformes-entradas.ts'), PROHIBIDOS);
});
