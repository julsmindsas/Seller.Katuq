'use strict';
/**
 * «Uniformar fotos» — el diálogo corriendo de verdad (D-501, ticket 1252), con un servicio falso
 * (sin red, sin navegador). Se carga la clase del componente transpilada, como en
 * `tests/productos/ficha-desde-foto-componentes.test.js`.
 *
 * Qué protege:
 *  - los pasos: ajustes → vista previa (con «No uniformar esta») → aplicar → progreso → resumen;
 *  - la consulta del lote cada pocos ms hasta el estado final, y que después no siga consultando;
 *  - que cerrar el diálogo cancela la consulta (el lote sigue en el servidor) y avisa si algo cambió;
 *  - que con el interruptor en pausa (`off`) solo ofrece revertir;
 *  - y en la plantilla: clases sin "p-", spans con color propio, foco visible y sin degradados
 *    ni primarios prohibidos.
 *
 *   node --test tests/productos/fotos-uniformes-componentes.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rxjs = require('rxjs');
const operadores = require('rxjs/operators');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const CARPETA = 'src/app/components/productos/fotos-uniformes';
const mapper = require('../../src/app/shared/services/productos/product-photos.mapper.ts');

class EmisorFalso {
  constructor() { this.emitidos = []; }
  emit(v) { this.emitidos.push(v); }
}

function almacenFalso(inicial = {}) {
  const datos = { ...inicial };
  return { getItem: (k) => (k in datos ? datos[k] : null), setItem: (k, v) => { datos[k] = String(v); }, datos };
}

/** Carga la clase del componente con lo que necesita como globales. */
function cargarClase(localStorage) {
  const archivo = path.join(RAIZ, CARPETA, 'fotos-uniformes.component.ts');
  const fuente = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = fuente.statements.find(ts.isClassDeclaration);
  const js = ts.transpileModule(clase.getText(fuente), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  const globales = {
    exports: {},
    console,
    setTimeout,
    clearTimeout,
    localStorage,
    Promise,
    Component: () => (valor) => valor,
    Input: () => () => {},
    Output: () => () => {},
    ViewChild: () => () => {},
    HostListener: () => () => {},
    ElementRef: class {},
    EventEmitter: EmisorFalso,
    ChangeDetectionStrategy: { OnPush: 0 },
    CommonModule: {},
    FormsModule: {},
    Subject: rxjs.Subject,
    of: rxjs.of,
    timer: rxjs.timer,
    catchError: operadores.catchError,
    switchMap: operadores.switchMap,
    takeUntil: operadores.takeUntil,
    ...mapper,
  };
  vm.runInNewContext(js, globales);
  return Object.values(globales.exports)[0];
}

const CONFIG = {
  mode: 'on', defaults: { aspect: '1:1', background: 'white', marginPct: 8 }, aspects: ['1:1', '4:5', '3:4'],
  backgrounds: ['white', 'light_gray', 'brand'], brandColor: '#FDF2E9', limits: { maxProducts: 100, maxPhotosPerProduct: 12, previewMaxPhotos: 3 }, canApply: true,
};

const lote = (status, extra = {}) => ({
  batchId: 'b1', type: 'uniform', status, mode: 'on', stopCode: null, totals: { products: 2 },
  counters: { products: status === 'running' ? 1 : 2, photosUniformed: status === 'running' ? 1 : 3 }, results: [], ...extra,
});

/** Servicio falso: anota cada llamada; `estados` es la secuencia que devuelve verLote. */
function servicioFalso({ config = CONFIG, estados = [lote('running'), lote('done')], fallaAjustes = null } = {}) {
  const s = {
    llamadas: { ajustes: 0, vistaPrevia: [], crearLote: [], verLote: 0, cancelarLote: 0, revertirLote: [], revertirProducto: [] },
    ajustes() { s.llamadas.ajustes++; return fallaAjustes ? rxjs.throwError(() => fallaAjustes) : rxjs.of(config); },
    vistaPrevia(cuerpo) {
      s.llamadas.vistaPrevia.push(cuerpo);
      return rxjs.of({ success: true, samples: [{ productId: 'p1', index: 0, before: 'https://x/a.jpg', after: { dataUrl: 'data:image/webp;base64,QQ==', warnings: ['blurry'] } }, { productId: 'p1', index: 1, before: 'https://x/b.jpg', after: { dataUrl: 'data:image/webp;base64,Qg==', warnings: [] } }], skipped: [{ productId: 'p2', code: 'product_integrated' }] });
    },
    crearLote(cuerpo) { s.llamadas.crearLote.push(cuerpo); return rxjs.of({ success: true, batchId: 'b1', mode: config.mode, totals: { products: 2 } }); },
    verLote() {
      s.llamadas.verLote++;
      const i = Math.min(s.llamadas.verLote - 1, estados.length - 1);
      return rxjs.of(estados[i]);
    },
    cancelarLote() { s.llamadas.cancelarLote++; return rxjs.of({ success: true, status: 'running' }); },
    revertirLote(id, llave) { s.llamadas.revertirLote.push({ id, llave }); return rxjs.of({ success: true, batchId: 'r1' }); },
    revertirProducto(id) { s.llamadas.revertirProducto.push(id); return rxjs.of({ success: true, reverted: 1, skipped: [] }); },
  };
  return s;
}

const cdr = { markForCheck() {}, detectChanges() {} };
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const afuera = (v) => JSON.parse(JSON.stringify(v));

function crear({ servicio, productIds = ['p1', 'p2'], categoryLabel = '', almacen = almacenFalso() } = {}) {
  const Clase = cargarClase(almacen);
  const c = new Clase(servicio, cdr);
  c.productIds = productIds;
  c.categoryLabel = categoryLabel;
  c.intervaloConsultaMs = 5;
  return c;
}

test('pasos completos: ajustes → vista previa → «No uniformar esta» → aplicar → progreso → resumen', async () => {
  const servicio = servicioFalso();
  const almacen = almacenFalso({ [mapper.LLAVE_AJUSTES]: '{"aspect":"4:5","background":"brand","marginPct":10}' });
  const c = crear({ servicio, almacen });
  c.ngOnInit();
  assert.equal(c.paso, 'ajustes');
  assert.deepEqual(afuera(c.ajustes), { aspect: '4:5', background: 'brand', marginPct: 10 }, 'recuerda el último ajuste');

  c.elegirProporcion('1:1');
  c.cambiarMargen(25);
  assert.equal(c.ajustes.marginPct, 20, 'el margen no pasa de 20');
  c.cambiarMargen(6);
  c.pedirVistaPrevia();
  assert.equal(c.paso, 'vista');
  assert.deepEqual(afuera(servicio.llamadas.vistaPrevia[0]), { productIds: ['p1', 'p2'], settings: { aspect: '1:1', background: 'brand', marginPct: 6 } });
  assert.equal(almacen.datos[mapper.LLAVE_AJUSTES], '{"aspect":"1:1","background":"brand","marginPct":6}', 'el navegador recuerda el ajuste');
  assert.equal(c.muestras.length, 2);
  assert.equal(c.omitidas.length, 1);

  c.alternar(c.muestras[1]);
  assert.equal(c.excluida(c.muestras[1]), true);
  c.aplicar();
  assert.equal(c.paso, 'aplicando');
  const cuerpo = afuera(servicio.llamadas.crearLote[0]);
  assert.deepEqual(cuerpo.excluded, [{ productId: 'p1', index: 1 }]);
  assert.match(cuerpo.idempotencyKey, /^[A-Za-z0-9_.:-]{8,100}$/);
  assert.equal(almacen.datos[mapper.LLAVE_ULTIMO_LOTE], 'b1');

  await esperar(60);
  assert.equal(c.paso, 'resumen');
  assert.equal(c.resumen.titulo, '3 fotos uniformadas');
  c.cerrar();
  assert.deepEqual(afuera(c.cerrado.emitidos), [{ cambio: true }], 'algo cambió: la lista recarga');
  c.ngOnDestroy();
});

test('la consulta sigue hasta el estado final y luego se detiene', async () => {
  const servicio = servicioFalso({ estados: [lote('queued'), lote('running'), lote('running'), lote('done')] });
  const c = crear({ servicio });
  c.ngOnInit();
  c.pedirVistaPrevia();
  c.aplicar();
  await esperar(80);
  assert.equal(c.paso, 'resumen');
  const llamadas = servicio.llamadas.verLote;
  assert.ok(llamadas >= 4, `consultó ${llamadas} veces`);
  await esperar(40);
  assert.equal(servicio.llamadas.verLote, llamadas, 'después del estado final no consulta más');
  c.ngOnDestroy();
});

test('cerrar durante el lote cancela la consulta (el lote sigue en el servidor) y no avisa cambio', async () => {
  const servicio = servicioFalso({ estados: [lote('running')] });
  const c = crear({ servicio });
  c.ngOnInit();
  c.pedirVistaPrevia();
  c.aplicar();
  await esperar(30);
  assert.equal(c.paso, 'aplicando');
  c.cerrar();
  const llamadas = servicio.llamadas.verLote;
  await esperar(40);
  assert.equal(servicio.llamadas.verLote, llamadas, 'cerrar detiene la consulta');
  assert.deepEqual(afuera(c.cerrado.emitidos), [{ cambio: false }]);
  c.cerrar();
  assert.equal(c.cerrado.emitidos.length, 1, 'se cierra una sola vez');
  assert.equal(servicio.llamadas.cancelarLote, 0, 'cerrar no cancela el lote');
});

test('cancelar lote pide la cancelación al servidor', async () => {
  const servicio = servicioFalso({ estados: [lote('running'), lote('running'), lote('cancelled')] });
  const c = crear({ servicio });
  c.ngOnInit();
  c.pedirVistaPrevia();
  c.aplicar();
  await esperar(8);
  c.cancelarLote();
  assert.equal(servicio.llamadas.cancelarLote, 1);
  assert.match(c.aviso, /se detiene al terminar el producto en curso/);
  await esperar(60);
  assert.match(c.resumen.titulo, /Lote cancelado/);
  c.ngOnDestroy();
});

test('modo off: solo ofrece revertir (no hay vista previa ni aplicar)', async () => {
  const servicio = servicioFalso({ config: { ...CONFIG, mode: 'off' }, estados: [{ ...lote('done'), type: 'revert', counters: { products: 1, photosReverted: 2 } }] });
  const almacen = almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'b-anterior' });
  const c = crear({ servicio, almacen });
  c.ngOnInit();
  assert.equal(c.paso, 'pausa');
  assert.equal(c.puedeAplicar, false);
  c.aplicar();
  assert.equal(servicio.llamadas.crearLote.length, 0, 'en pausa no se crean lotes');
  assert.equal(c.ultimoLoteId, 'b-anterior');
  await c.revertirSeleccion();
  assert.deepEqual(servicio.llamadas.revertirProducto, ['p1', 'p2']);
  assert.match(c.aviso, /Volvieron 2 fotos originales/);
  c.revertirLote(c.ultimoLoteId);
  assert.equal(servicio.llamadas.revertirLote[0].id, 'b-anterior');
  await esperar(30);
  assert.equal(c.paso, 'resumen');
  assert.equal(c.resumen.titulo, 'Volvieron 2 fotos originales');
  c.cerrar();
  assert.deepEqual(afuera(c.cerrado.emitidos), [{ cambio: true }]);
});

test('al volver a abrir con el último lote todavía en curso, retoma la consulta y muestra el progreso hasta el resumen', async () => {
  const servicio = servicioFalso({ estados: [lote('running'), lote('running'), lote('done')] });
  const almacen = almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'b1' });
  const c = crear({ servicio, almacen });
  c.ngOnInit();
  assert.equal(c.paso, 'aplicando', 'lo encuentra al volver');
  await esperar(60);
  assert.equal(c.paso, 'resumen');
  assert.equal(servicio.llamadas.crearLote.length, 0, 'no crea otro lote');
  c.cerrar();
  assert.deepEqual(afuera(c.cerrado.emitidos), [{ cambio: true }], 'terminó con fotos nuevas: la lista o el editor recargan');
  c.ngOnDestroy();
});

test('al volver a abrir: si el último lote ya terminó abre normal; en pausa no retoma uno de uniformar (no avanza) y ofrece revertir', async () => {
  const terminado = crear({ servicio: servicioFalso({ estados: [lote('done')] }), almacen: almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'b1' }) });
  terminado.ngOnInit();
  assert.equal(terminado.paso, 'ajustes');
  terminado.ngOnDestroy();

  const enPausa = crear({ servicio: servicioFalso({ config: { ...CONFIG, mode: 'off' }, estados: [lote('running')] }), almacen: almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'b1' }) });
  enPausa.ngOnInit();
  assert.equal(enPausa.paso, 'pausa');
  assert.equal(enPausa.ultimoLoteId, 'b1', 'sigue ofreciendo «Revertir el último lote»');
  enPausa.ngOnDestroy();

  const caido = servicioFalso();
  caido.verLote = () => rxjs.throwError(() => ({ status: 404, error: { code: 'BATCH_NOT_FOUND' } }));
  const sinLote = crear({ servicio: caido, almacen: almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'de-otra-empresa' }) });
  sinLote.ngOnInit();
  assert.equal(sinLote.paso, 'ajustes', 'si no se puede leer el lote, abre normal');
  assert.equal(sinLote.error, '');
  sinLote.ngOnDestroy();
});

test('el texto de «aplicando» no promete más de lo que hace: se ve al volver a abrir en este navegador y avisa al que edita', () => {
  const html = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.html'), 'utf8');
  assert.doesNotMatch(html, /lo encuentras al volver/);
  assert.match(html, /en este navegador/);
  assert.match(html, /espera a que termine antes de guardar/);
});

test('por categoría no ofrece revertir producto por producto; sin selección o con 403 muestra el error', () => {
  const porCategoria = crear({ servicio: servicioFalso({ config: { ...CONFIG, mode: 'off' } }), productIds: [], categoryLabel: 'Velas' });
  porCategoria.ngOnInit();
  assert.equal(porCategoria.puedeRevertirSeleccion, false);
  assert.match(porCategoria.textoSeleccion, /Velas/);

  const sinNada = crear({ servicio: servicioFalso(), productIds: [] });
  sinNada.ngOnInit();
  assert.equal(sinNada.paso, 'error');

  const apagada = crear({ servicio: servicioFalso({ fallaAjustes: { status: 403, error: { code: 'FEATURE_DISABLED' } } }) });
  apagada.ngOnInit();
  assert.equal(apagada.paso, 'error');
  assert.equal(apagada.error, mapper.MENSAJES_ERROR.FEATURE_DISABLED);
});

test('un vendedor (sin rol de administrador) ve la vista previa pero no puede aplicar', () => {
  const servicio = servicioFalso({ config: { ...CONFIG, canApply: false } });
  const c = crear({ servicio });
  c.ngOnInit();
  c.pedirVistaPrevia();
  assert.equal(c.paso, 'vista');
  c.aplicar();
  assert.equal(servicio.llamadas.crearLote.length, 0);
});

test('plantilla y estilos: clases sin "p-", foco visible, spans con color propio, sin degradados ni primarios prohibidos', () => {
  const html = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.html'), 'utf8');
  const scss = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.scss'), 'utf8');
  const clases = [...html.matchAll(/class="([^"]*)"/g)].flatMap((x) => x[1].split(/\s+/))
    .concat([...html.matchAll(/\[class\.([\w-]+)\]/g)].map((x) => x[1]));
  const conP = clases.filter((c) => /p-/.test(c));
  assert.deepEqual(conP, [], `clases con "p-": ${conP.join(', ')}`);
  for (const nombre of [...scss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((x) => x[1])) {
    assert.doesNotMatch(nombre, /p-/, `clase SCSS con "p-": ${nombre}`);
  }
  assert.match(scss, /:focus-visible\s*\{\s*outline: 3px solid \$fu-accent-2 !important/);
  assert.match(scss, /span \{\s*color: inherit;\s*font-size: inherit;/);
  assert.doesNotMatch(scss, /(linear|radial)-gradient\(/);
  assert.doesNotMatch(scss, /#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea|#3b82f6|#1d4ed8|#6366f1|#1976d2|#7366ff|rgba\(102,\s*126,\s*234/i);
  assert.match(scss, /\$fu-accent: #5F3FE0;/);
  assert.doesNotMatch(html, /Nova|Bedrock|Canvas|sharp/, 'sin nombres de proveedores ni de librerías en pantalla (Artículo VI)');
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
});
