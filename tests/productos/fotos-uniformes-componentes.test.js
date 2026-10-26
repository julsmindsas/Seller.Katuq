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
 *  - TX-37 · 7.11 (D-518): categoría por ruta con el conteo del servidor y los productos sin ubicar,
 *    paso para elegir la categoría, series (partes, progreso, cancelar y revertir), SERIES_TOO_LARGE
 *    con «Elegir una subcategoría», proporción sugerida y retoma de una serie.
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
  // (sin removeItem a propósito: el diálogo solo lee y escribe)
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
    forkJoin: rxjs.forkJoin,
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
/** `fallaVerSerie` / `fallaVerLote`: `{ desde, err }` = desde esa consulta (1, 2, …) responde el error. */
function servicioFalso({ config = CONFIG, estados = [lote('running'), lote('done')], fallaAjustes = null, series = [], vista = null, creado = null, fallaCrear = null, arbol = [], fallaArbol = null, fallaVerSerie = null, fallaVerLote = null } = {}) {
  const s = {
    llamadas: { ajustes: 0, vistaPrevia: [], crearLote: [], verLote: 0, cancelarLote: 0, revertirLote: [], revertirProducto: [], verSerie: [], cancelarSerie: [], revertirSerie: [], arbol: 0 },
    verSerie(id) {
      s.llamadas.verSerie.push(id);
      if (fallaVerSerie && s.llamadas.verSerie.length >= fallaVerSerie.desde) return rxjs.throwError(() => fallaVerSerie.err);
      const i = Math.min(s.llamadas.verSerie.length - 1, series.length - 1);
      return rxjs.of(series[i]);
    },
    cancelarSerie(id) { s.llamadas.cancelarSerie.push(id); return rxjs.of({ success: true, seriesId: id, status: 'running' }); },
    revertirSerie(id, llave) { s.llamadas.revertirSerie.push({ id, llave }); return rxjs.of({ success: true, batchId: 'r-serie' }); },
    arbolDeCategorias() {
      s.llamadas.arbol++;
      if (fallaArbol) { const f = fallaArbol; fallaArbol = null; return rxjs.throwError(() => f); }
      return rxjs.of(arbol);
    },
    ajustes() { s.llamadas.ajustes++; return fallaAjustes ? rxjs.throwError(() => fallaAjustes) : rxjs.of(config); },
    vistaPrevia(cuerpo) {
      s.llamadas.vistaPrevia.push(cuerpo);
      if (vista) return rxjs.of(typeof vista === 'function' ? vista(cuerpo) : vista);
      return rxjs.of({ success: true, samples: [{ productId: 'p1', index: 0, before: 'https://x/a.jpg', after: { dataUrl: 'data:image/webp;base64,QQ==', warnings: ['blurry'] } }, { productId: 'p1', index: 1, before: 'https://x/b.jpg', after: { dataUrl: 'data:image/webp;base64,Qg==', warnings: [] } }], skipped: [{ productId: 'p2', code: 'product_integrated' }] });
    },
    crearLote(cuerpo) {
      s.llamadas.crearLote.push(cuerpo);
      if (fallaCrear) return rxjs.throwError(() => fallaCrear);
      return rxjs.of(creado || { success: true, batchId: 'b1', mode: config.mode, totals: { products: 2 } });
    },
    verLote() {
      s.llamadas.verLote++;
      if (fallaVerLote && s.llamadas.verLote >= fallaVerLote.desde) return rxjs.throwError(() => fallaVerLote.err);
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

function crear({ servicio, productIds = ['p1', 'p2'], categoryLabel = '', categoryPath = null, elegirCategoria = false, proporcionSugerida = null, almacen = almacenFalso() } = {}) {
  const Clase = cargarClase(almacen);
  const c = new Clase(servicio, cdr);
  c.productIds = productIds;
  c.categoryLabel = categoryLabel;
  c.categoryPath = categoryPath;
  c.elegirCategoria = elegirCategoria;
  c.proporcionSugerida = proporcionSugerida;
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

// ───────────── TX-37 · 7.11 (D-518) ─────────────

const CONFIG_SERIE = { ...CONFIG, limits: { ...CONFIG.limits, maxSeriesProducts: 2000 } };
const parte = (part, status, extra = {}) => ({ batchId: `s1-p${part}`, part, status, stopCode: null, counters: {}, ...extra });
const serie = (status, partes, extra = {}) => ({
  seriesId: 's1', type: 'uniform', mode: 'on', status, stopCode: null, currentPart: null, totals: { products: 340, categoryUnresolved: 3 },
  counters: { products: 0 }, parts: partes, ...extra,
});
const VISTA_340 = {
  success: true, samples: [{ productId: 'p1', index: 0, before: 'https://x/a.jpg', after: { dataUrl: 'data:image/webp;base64,QQ==', warnings: ['possible_watermark'] } }],
  skipped: [], selectionTotal: 340, parts: 4, categoryUnresolved: 3,
};
const SERIE_EN_CURSO = [
  serie('running', [parte(1, 'running'), parte(2, 'waiting'), parte(3, 'waiting'), parte(4, 'waiting')], { currentPart: 1, counters: { products: 40, photosUniformed: 60 } }),
  serie('running', [parte(1, 'done'), parte(2, 'running'), parte(3, 'waiting'), parte(4, 'waiting')], { currentPart: 2, counters: { products: 130, photosUniformed: 200 } }),
  serie('done', [1, 2, 3, 4].map((k) => parte(k, 'done')), { counters: { products: 340, photosUniformed: 410, photosSkipped: 3, photosWarned: 2 } }),
];

test('7.11: categoría por ruta → conteo del servidor y sin ubicar → serie de 4 lotes con su avance → resumen', async () => {
  const almacen = almacenFalso();
  // El GET /batches/:id de cada parte, que el diálogo lee al terminar la serie (motivos y avisos por foto).
  const loteDeParte = (k) => ({
    ...lote('done'), batchId: `s1-p${k}`, series: { id: 's1', part: k, parts: 4 },
    results: [{ productId: `p${k}`, status: 'uniformed', code: null, photos: [{ index: 0, status: 'uniformed', warnings: ['possible_watermark'] }, { index: 1, status: 'skipped', code: 'not_owned' }] }],
  });
  const servicio = servicioFalso({ config: CONFIG_SERIE, vista: VISTA_340, creado: { success: true, batchId: 's1-p1', seriesId: 's1', parts: 4, mode: 'on', totals: { products: 340, categoryUnresolved: 3 } }, series: SERIE_EN_CURSO, estados: [1, 2, 3, 4].map(loteDeParte) });
  const c = crear({ servicio, productIds: [], categoryPath: ['Flores'], almacen });
  c.ngOnInit();
  assert.equal(c.paso, 'ajustes');
  assert.equal(c.textoSeleccion, 'Categoría «Flores» y sus subcategorías');
  assert.equal(c.textoConteo, '', 'antes de la vista previa no se adivina el conteo');
  c.pedirVistaPrevia();
  assert.deepEqual(afuera(servicio.llamadas.vistaPrevia[0]), { categoryPath: ['Flores'], settings: { aspect: '1:1', background: 'white', marginPct: 8 } });
  assert.equal(c.paso, 'vista');
  assert.equal(c.textoConteo, '340 productos · se harán 4 lotes seguidos de hasta 100');
  assert.equal(c.textoSinUbicar, '3 productos no se pudieron ubicar en tu árbol de categorías');
  assert.equal(c.textoAviso('possible_watermark'), 'Posible marca de agua o logo');
  assert.equal(c.bloqueaAplicar, false);

  c.aplicar();
  assert.deepEqual(afuera(servicio.llamadas.crearLote[0]).categoryPath, ['Flores']);
  assert.equal(c.paso, 'aplicando');
  assert.equal(c.serieId, 's1');
  assert.equal(almacen.datos[mapper.LLAVE_ULTIMO_LOTE], 'serie:s1', 'recuerda la serie para retomarla o revertirla');
  await esperar(4);
  assert.match(c.textoProgresoSerie, /^Parte [1-4] de 4 · \d+ de 340 productos$/);
  await esperar(60);
  assert.equal(c.paso, 'resumen');
  assert.equal(c.resumen.titulo, '410 fotos uniformadas');
  assert.equal(c.resumen.omitidas, 3);
  assert.equal(c.progresoSerie.parte, 4);
  // D-518 TX-37·2: el resumen dice QUÉ aviso es (posible marca de agua o logo), no solo la cifra.
  assert.equal(servicio.llamadas.verLote, 4, 'el avance va por GET /series/:id; al terminar, una lectura por lote');
  assert.deepEqual(afuera(c.resumen.avisos), [{ code: 'possible_watermark', texto: 'Posible marca de agua o logo', cantidad: 4 }]);
  assert.deepEqual(afuera(c.resumen.motivos), [{ code: 'not_owned', texto: mapper.MENSAJES_OMISION.not_owned, cantidad: 4 }]);
  assert.equal(c.resumen.omitidas, 3, 'las cifras siguen siendo las de los contadores de la serie');
  assert.equal(c.resumen.motivosIncompletos, undefined);
  const consultas = servicio.llamadas.verSerie.length;
  await esperar(30);
  assert.equal(servicio.llamadas.verSerie.length, consultas, 'en el estado final deja de consultar');
  assert.ok(servicio.llamadas.verSerie.every((id) => id === 's1'));
  c.cerrar();
  assert.deepEqual(afuera(c.cerrado.emitidos), [{ cambio: true }]);
  c.ngOnDestroy();
});

test('7.11: cancelar la serie pide la cancelación de la serie (no de un lote) y el resumen la muestra cancelada', async () => {
  const cancelada = serie('cancelled', [parte(1, 'done'), parte(2, 'cancelled'), parte(3, 'stopped', { stopCode: 'series_stopped' }), parte(4, 'stopped', { stopCode: 'series_stopped' })], { counters: { products: 150, photosUniformed: 150 } });
  const servicio = servicioFalso({ config: CONFIG_SERIE, vista: VISTA_340, creado: { success: true, batchId: 's1-p1', seriesId: 's1', parts: 4, mode: 'on', totals: { products: 340 } }, series: [SERIE_EN_CURSO[1], SERIE_EN_CURSO[1], cancelada] });
  const c = crear({ servicio, productIds: [], categoryPath: ['Flores'] });
  c.ngOnInit();
  c.pedirVistaPrevia();
  c.aplicar();
  await esperar(3);
  c.cancelarLote();
  assert.deepEqual(servicio.llamadas.cancelarSerie, ['s1']);
  assert.equal(servicio.llamadas.cancelarLote, 0);
  assert.match(c.aviso, /los que faltan no empiezan/);
  await esperar(60);
  assert.equal(c.paso, 'resumen');
  assert.match(c.resumen.titulo, /^Serie cancelada · 150 fotos uniformadas/);
  assert.equal(c.textoParte(c.serie.parts[2]), 'No empezó');
  assert.equal(c.resumen.puedeRevertir, true);
  c.ngOnDestroy();
});

test('7.11: «Revertir todos los lotes» revierte la serie y sigue el lote de reversión hasta el resumen', async () => {
  const servicio = servicioFalso({
    config: CONFIG_SERIE, vista: VISTA_340, creado: { success: true, batchId: 's1-p1', seriesId: 's1', parts: 4, mode: 'on', totals: { products: 340 } },
    series: [SERIE_EN_CURSO[2]],
    estados: [{ ...lote('done'), batchId: 'r-serie', type: 'revert', counters: { products: 340, photosReverted: 410 }, resultsTruncated: true }],
  });
  const c = crear({ servicio, productIds: [], categoryPath: ['Flores'] });
  c.ngOnInit();
  c.pedirVistaPrevia();
  c.aplicar();
  await esperar(30);
  assert.equal(c.paso, 'resumen');
  c.revertirResumen();
  assert.equal(servicio.llamadas.revertirSerie.length, 1);
  assert.equal(servicio.llamadas.revertirSerie[0].id, 's1');
  assert.match(servicio.llamadas.revertirSerie[0].llave, /^[A-Za-z0-9_.:-]{8,100}$/);
  assert.equal(servicio.llamadas.revertirLote.length, 0);
  assert.equal(c.serieId, null);
  await esperar(30);
  assert.equal(c.paso, 'resumen');
  assert.equal(c.resumen.titulo, 'Volvieron 410 fotos originales');
  assert.equal(c.resumen.motivosIncompletos, true);
  c.ngOnDestroy();
});

const ARBOL = () => {
  const { stringify } = require('flatted');
  return [{ categoria: stringify([
    { label: 'Flores', children: [{ label: 'Rosas' }, { label: 'Girasoles' }] },
    { label: 'Flores secas' },
    { label: 'Velas' },
  ]) }];
};

test('7.11: SERIES_TOO_LARGE pide elegir una subcategoría y vuelve directo a la vista previa con la ruta nueva', () => {
  const vista = (cuerpo) => (cuerpo.categoryPath.length === 1
    ? { ...VISTA_340, selectionTotal: 2500, parts: 25, categoryUnresolved: 0 }
    : { ...VISTA_340, selectionTotal: 900, parts: 9, categoryUnresolved: 0 });
  const servicio = servicioFalso({ config: CONFIG_SERIE, vista, arbol: ARBOL() });
  const c = crear({ servicio, productIds: [], categoryPath: ['Flores'] });
  c.ngOnInit();
  c.pedirVistaPrevia();
  assert.equal(c.conteo.excede, true);
  assert.equal(c.bloqueaAplicar, true);
  assert.equal(c.ofreceSubcategoria, true);
  c.aplicar();
  assert.equal(servicio.llamadas.crearLote.length, 0, 'no manda nada al servidor');
  assert.equal(c.error, mapper.MENSAJES_ERROR.SERIES_TOO_LARGE);

  c.elegirSubcategoria();
  assert.equal(c.paso, 'categoria');
  assert.equal(servicio.llamadas.arbol, 1);
  assert.deepEqual(c.rutasVisibles.map((r) => r.texto), ['Flores › Rosas', 'Flores › Girasoles'], 'solo sus subcategorías; «Flores secas» no');
  assert.equal(c.textoSoloSubrutas, 'Flores');
  c.elegirRuta(c.rutasVisibles[0]);
  assert.deepEqual(afuera(servicio.llamadas.vistaPrevia[1]).categoryPath, ['Flores', 'Rosas']);
  assert.equal(c.paso, 'vista');
  assert.equal(c.textoConteo, '900 productos · se harán 9 lotes seguidos de hasta 100');
  assert.equal(c.bloqueaAplicar, false);
  c.aplicar();
  assert.deepEqual(afuera(servicio.llamadas.crearLote[0]).categoryPath, ['Flores', 'Rosas']);
  c.ngOnDestroy();
});

test('7.11: SERIES_TOO_LARGE del servidor: con categoría ofrece subcategoría; con productos elegidos, no', () => {
  const falla = { status: 422, error: { code: 'SERIES_TOO_LARGE', message: 'x' } };
  const porCategoria = crear({ servicio: servicioFalso({ config: CONFIG_SERIE, vista: { ...VISTA_340, selectionTotal: 1999, parts: 20 }, fallaCrear: falla }), productIds: [], categoryPath: ['Flores'] });
  porCategoria.ngOnInit();
  porCategoria.pedirVistaPrevia();
  porCategoria.aplicar();
  assert.equal(porCategoria.error, mapper.MENSAJES_ERROR.SERIES_TOO_LARGE);
  assert.equal(porCategoria.ofreceSubcategoria, true);
  assert.equal(porCategoria.bloqueaAplicar, true);
  porCategoria.ngOnDestroy();

  const muchos = Array.from({ length: 2001 }, (_x, i) => `p${i}`);
  const porSeleccion = crear({ servicio: servicioFalso({ config: CONFIG_SERIE }), productIds: muchos });
  porSeleccion.ngOnInit();
  porSeleccion.pedirVistaPrevia();
  assert.equal(porSeleccion.conteo.excede, true);
  assert.equal(porSeleccion.ofreceSubcategoria, false, 'una selección no tiene subcategorías');
  assert.equal(porSeleccion.textoSeleccion, '2001 productos');
  porSeleccion.ngOnDestroy();
});

test('7.11 (pregunta 4): sin categoría ni productos y con elegirCategoria, primero se elige la categoría del árbol', () => {
  const servicio = servicioFalso({ config: CONFIG_SERIE, arbol: ARBOL(), vista: { ...VISTA_340, selectionTotal: 12, parts: 1, categoryUnresolved: 0 } });
  const c = crear({ servicio, productIds: [], elegirCategoria: true });
  c.ngOnInit();
  assert.equal(c.paso, 'categoria');
  assert.equal(c.conPasoCategoria, true);
  assert.equal(c.textoSeleccion, 'Elige la categoría');
  assert.equal(c.numeroPaso(1), 2, 'la marca «Categoría» va primero');
  assert.equal(servicio.llamadas.arbol, 1);
  assert.deepEqual(c.rutasVisibles.map((r) => r.texto), ['Flores', 'Flores › Rosas', 'Flores › Girasoles', 'Flores secas', 'Velas']);
  c.buscarCategoria = 'SECAS';
  assert.deepEqual(c.rutasVisibles.map((r) => r.texto), ['Flores secas']);
  c.buscarCategoria = '';
  c.elegirRuta(c.rutasVisibles[1]);
  assert.equal(c.paso, 'ajustes');
  assert.equal(c.textoSeleccion, 'Categoría «Flores › Rosas» y sus subcategorías');
  assert.equal(servicio.llamadas.vistaPrevia.length, 0, 'elegir la categoría no pide la vista previa: siguen los ajustes');
  c.pedirVistaPrevia();
  assert.deepEqual(afuera(servicio.llamadas.vistaPrevia[0]).categoryPath, ['Flores', 'Rosas']);
  assert.equal(c.textoConteo, '12 productos · un solo lote');
  c.cambiarCategoria();
  assert.equal(c.paso, 'categoria');
  assert.equal(servicio.llamadas.arbol, 1, 'el árbol se trae una sola vez');
  c.salirDeCategoria();
  assert.equal(c.paso, 'ajustes', 'volver sin cambiar deja la categoría que tenía');
  c.ngOnDestroy();

  const sinElegir = crear({ servicio: servicioFalso({ arbol: ARBOL() }), productIds: [], elegirCategoria: true });
  sinElegir.ngOnInit();
  sinElegir.salirDeCategoria();
  assert.deepEqual(afuera(sinElegir.cerrado.emitidos), [{ cambio: false }], 'sin categoría, «Cancelar» cierra');

  const conCategoria = crear({ servicio: servicioFalso({ arbol: ARBOL() }), productIds: [], categoryPath: ['Velas'], elegirCategoria: true });
  conCategoria.ngOnInit();
  assert.equal(conCategoria.paso, 'ajustes', 'si ya llega la categoría, no se pregunta');
  conCategoria.ngOnDestroy();
});

test('7.11: si el árbol no carga, lo dice y se puede reintentar', () => {
  const servicio = servicioFalso({ arbol: ARBOL(), fallaArbol: { status: 500 } });
  const c = crear({ servicio, productIds: [], elegirCategoria: true });
  c.ngOnInit();
  assert.equal(c.paso, 'categoria');
  assert.match(c.errorRutas, /No pudimos cargar tus categorías/);
  assert.equal(c.rutasVisibles.length, 0);
  c.cargarRutas();
  assert.equal(c.errorRutas, '');
  assert.equal(c.rutasVisibles.length, 5);
  assert.equal(servicio.llamadas.arbol, 2);
  c.ngOnDestroy();
});

test('7.11 (pregunta 13): empieza en la proporción sugerida del sitio, salvo «Del estilo»', () => {
  const sugerida = crear({ servicio: servicioFalso(), proporcionSugerida: '4:5' });
  sugerida.ngOnInit();
  assert.equal(sugerida.ajustes.aspect, '4:5');
  assert.equal(sugerida.proporcionDelSitio, '4:5');
  sugerida.ngOnDestroy();

  const delEstilo = crear({ servicio: servicioFalso(), proporcionSugerida: '', almacen: almacenFalso({ [mapper.LLAVE_AJUSTES]: '{"aspect":"3:4","background":"white","marginPct":8}' }) });
  delEstilo.ngOnInit();
  assert.equal(delEstilo.ajustes.aspect, '3:4', '«Del estilo»: lo de siempre (P1, con lo recordado)');
  assert.equal(delEstilo.proporcionDelSitio, null);
  delEstilo.ngOnDestroy();

  const sinNada = crear({ servicio: servicioFalso() });
  sinNada.ngOnInit();
  assert.equal(sinNada.ajustes.aspect, '1:1');
  sinNada.ngOnDestroy();
});

test('7.11: al volver a abrir con una serie en curso la retoma; en pausa ofrece revertir la serie', async () => {
  const servicio = servicioFalso({ series: SERIE_EN_CURSO });
  const c = crear({ servicio, almacen: almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'serie:s1' }) });
  c.ngOnInit();
  assert.equal(c.ultimaSerieId, 's1');
  assert.equal(c.ultimoLoteId, null);
  assert.equal(c.paso, 'aplicando');
  assert.equal(c.serieId, 's1');
  await esperar(60);
  assert.equal(c.paso, 'resumen');
  assert.equal(servicio.llamadas.verLote, 4, 'solo la lectura de los 4 lotes al terminar');
  assert.equal(servicio.llamadas.crearLote.length, 0);
  c.cerrar();
  assert.deepEqual(afuera(c.cerrado.emitidos), [{ cambio: true }]);
  c.ngOnDestroy();

  const pausa = servicioFalso({ config: { ...CONFIG, mode: 'off' }, series: [SERIE_EN_CURSO[1]], estados: [{ ...lote('done'), batchId: 'r-serie', type: 'revert', counters: { photosReverted: 200 } }] });
  const p = crear({ servicio: pausa, almacen: almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'serie:s1' }) });
  p.ngOnInit();
  assert.equal(p.paso, 'pausa', 'en pausa una serie de uniformar no avanza: no se retoma');
  p.revertirSerie(p.ultimaSerieId);
  assert.equal(pausa.llamadas.revertirSerie[0].id, 's1');
  assert.equal(p.ultimaSerieId, null, 'ya no ofrece revertir la misma serie otra vez');
  assert.equal(p.ultimaReversionId, 'r-serie');
  await esperar(30);
  assert.equal(p.paso, 'resumen');
  assert.equal(p.resumen.titulo, 'Volvieron 200 fotos originales');
  p.ngOnDestroy();
});

test('7.11 (revisión B06): la reversión de una serie se guarda como lo último; al volver a abrir se retoma, también en pausa, y no se ofrece repetirla', async () => {
  const almacen = almacenFalso({ [mapper.LLAVE_ULTIMO_LOTE]: 'serie:s1' });
  const enCurso = { ...lote('running'), batchId: 'r-serie', type: 'revert', totals: { products: 1800 }, counters: { products: 300, photosReverted: 350 } };
  const hecha = { ...lote('done'), batchId: 'r-serie', type: 'revert', totals: { products: 1800 }, counters: { products: 1800, photosReverted: 2100 }, resultsTruncated: true };
  const primero = servicioFalso({ config: { ...CONFIG, mode: 'off' }, series: [SERIE_EN_CURSO[2]], estados: [enCurso] });
  const a = crear({ servicio: primero, almacen });
  a.ngOnInit();
  a.revertirSerie(a.ultimaSerieId);
  assert.equal(almacen.datos[mapper.LLAVE_ULTIMO_LOTE], 'reversion:r-serie');
  await esperar(4);
  a.cerrar();
  a.ngOnDestroy();

  // Vuelve a abrir (en pausa) mientras la reversión corre: la retoma y no ofrece otro «Revertir».
  const segundo = servicioFalso({ config: { ...CONFIG, mode: 'off' }, estados: [enCurso, hecha] });
  const b = crear({ servicio: segundo, almacen });
  b.ngOnInit();
  assert.equal(b.ultimaReversionId, 'r-serie');
  assert.equal(b.ultimaSerieId, null);
  assert.equal(b.ultimoLoteId, null, 'el botón «Revertir el último lote» no aparece para una reversión');
  assert.equal(b.paso, 'aplicando', 'retoma el avance de la reversión');
  await esperar(40);
  assert.equal(b.paso, 'resumen');
  assert.equal(b.resumen.titulo, 'Volvieron 2100 fotos originales');
  assert.equal(segundo.llamadas.revertirSerie.length, 0, 'no crea otro lote de reversión');
  assert.equal(segundo.llamadas.verSerie.length, 0);
  b.ngOnDestroy();
});

test('7.11 (revisión B06): si la consulta de la serie o del lote recibe 403/404, deja de consultar y lo dice', async () => {
  const apagada = { status: 403, error: { code: 'FEATURE_DISABLED', message: 'x' } };
  const servicio = servicioFalso({ config: CONFIG_SERIE, vista: VISTA_340, creado: { success: true, batchId: 's1-p1', seriesId: 's1', parts: 4, mode: 'on', totals: { products: 340 } }, series: SERIE_EN_CURSO, fallaVerSerie: { desde: 3, err: apagada } });
  const c = crear({ servicio, productIds: [], categoryPath: ['Flores'] });
  c.ngOnInit();
  c.pedirVistaPrevia();
  c.aplicar();
  await esperar(40);
  assert.equal(c.paso, 'error');
  assert.equal(c.tituloError, 'No pudimos seguir el avance');
  assert.equal(c.error, mapper.MENSAJES_PARADA.feature_off, 'con la bandera apagada, la parada feature_off');
  const consultas = servicio.llamadas.verSerie.length;
  assert.equal(consultas, 3);
  await esperar(30);
  assert.equal(servicio.llamadas.verSerie.length, consultas, 'no sigue consultando');
  c.cerrar();
  assert.deepEqual(afuera(c.cerrado.emitidos), [{ cambio: true }], 'lo que ya se aplicó cuenta como cambio');
  c.ngOnDestroy();

  const noExiste = servicioFalso({ fallaVerLote: { desde: 2, err: { status: 404, error: { code: 'BATCH_NOT_FOUND' } } } });
  const l = crear({ servicio: noExiste });
  l.ngOnInit();
  l.pedirVistaPrevia();
  l.aplicar();
  await esperar(40);
  assert.equal(l.paso, 'error');
  assert.equal(l.error, mapper.MENSAJES_ERROR.BATCH_NOT_FOUND);
  assert.equal(noExiste.llamadas.verLote, 2);
  l.ngOnDestroy();

  // Sin conexión o un 5xx sí se reintenta (puede ser pasajero).
  const caida = servicioFalso({ fallaVerLote: { desde: 1, err: { status: 503 } } });
  const k = crear({ servicio: caida });
  k.ngOnInit();
  k.pedirVistaPrevia();
  k.aplicar();
  await esperar(40);
  assert.equal(k.paso, 'aplicando');
  assert.ok(caida.llamadas.verLote > 2);
  k.ngOnDestroy();
});

test('7.11 (revisión B06): el aviso de SERIES_TOO_LARGE dice el tope con el que se bloquea; sin tope del servidor, 100', () => {
  const sinTope = crear({ servicio: servicioFalso({ config: CONFIG }), productIds: Array.from({ length: 150 }, (_x, i) => `p${i}`) });
  sinTope.ngOnInit();
  sinTope.pedirVistaPrevia();
  assert.equal(sinTope.conteo.excede, true, 'un servidor sin maxSeriesProducts no crea series: no se promete una');
  assert.equal(sinTope.mensajeExcede, 'Puedes uniformar hasta 100 productos a la vez. Elige una subcategoría o menos productos.');
  sinTope.aplicar();
  assert.equal(sinTope.error, sinTope.mensajeExcede);
  sinTope.ngOnDestroy();

  const tope500 = crear({ servicio: servicioFalso({ config: { ...CONFIG, limits: { ...CONFIG.limits, maxSeriesProducts: 500 } }, fallaCrear: { status: 422, error: { code: 'SERIES_TOO_LARGE' } } }), productIds: ['a'] });
  tope500.ngOnInit();
  tope500.pedirVistaPrevia();
  tope500.aplicar();
  assert.match(tope500.error, /hasta 500 productos a la vez/, 'el 422 del servidor también se dice con su tope');
  tope500.ngOnDestroy();
});

test('7.11 (revisión B06): una ruta repetida en el árbol se ve deshabilitada con el motivo y no se puede elegir', () => {
  const { stringify } = require('flatted');
  const arbol = [{ categoria: stringify([{ label: 'Velas' }, { label: 'velas ' }, { label: 'Flores' }]) }];
  const servicio = servicioFalso({ arbol });
  const c = crear({ servicio, productIds: [], elegirCategoria: true });
  c.ngOnInit();
  const velas = c.rutasVisibles.find((r) => r.texto === 'Velas');
  assert.equal(velas.repetida, true);
  c.elegirRuta(velas);
  assert.equal(c.paso, 'categoria', 'no avanza con una ruta que el servidor rechaza');
  assert.equal(c.rutaElegida, null);
  c.elegirRuta(c.rutasVisibles.find((r) => r.texto === 'Flores'));
  assert.equal(c.paso, 'ajustes');
  c.ngOnDestroy();
  const html = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.html'), 'utf8');
  assert.match(html, /\[disabled\]="r\.repetida"/);
  assert.match(html, /Hay dos categorías con este nombre/);
  assert.doesNotMatch(html, /Maestros › Categorías/, 'el menú se llama «Inventarios y productos › Categorías de productos»');
  assert.match(html, /Inventarios y productos › Categorías de productos/);
  assert.match(html, /resumen\.avisos/, 'el resumen lista los avisos por código');
});

test('7.11: plantilla — conteo, sin ubicar, partes de la serie, subcategoría y paso de categoría; estilos sin "p-" y con foco visible', () => {
  const html = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.html'), 'utf8');
  const scss = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.scss'), 'utf8');
  for (const pieza of ['textoConteo', 'textoSinUbicar', 'textoProgresoSerie', 'textoParte(p)', 'Elegir una subcategoría', 'elegirRuta(r)', 'Revertir todos los lotes', 'Revertir los últimos lotes', 'role="progressbar"']) {
    assert.ok(html.includes(pieza), pieza);
  }
  assert.doesNotMatch(html, /hasta 100 productos por lote/);
  const dinamicas = [...html.matchAll(/\[ngClass\]="'([\w-]+)'/g)].map((x) => x[1]);
  assert.deepEqual(dinamicas.filter((c) => /p-/.test(c)), []);
  for (const estado of ['waiting', 'queued', 'running', 'done', 'cancelled', 'stopped', 'failed']) {
    assert.doesNotMatch(`fu-parte--${estado}`, /p-/, estado);
  }
  assert.match(scss, /\.fu-ruta,\s*\n\.fu-buscar,\s*\n\.fu-omitidas-titulo \{\s*&:focus-visible/);
  for (const clase of ['fu-ruta-texto', 'fu-ruta-nota', 'fu-conteo-texto', 'fu-parte-num', 'fu-parte-estado', 'fu-elegida-texto']) {
    assert.match(scss, new RegExp(`\\.${clase} \\{ color: [^;]+; font-size: \\d+px;`), `${clase}: color y tamaño propios`);
  }
});

// ───────────── TX-37 · 8.6 y 9.10 (D-518): «Quitar fondo» y origen de las copias ─────────────

const CONFIG_FONDO = { ...CONFIG, mode: 'on', backgroundRemoval: { available: true, previewAvailable: true }, aiUsesLeft: 480 };
const CONFIG_SOMBRA = { ...CONFIG, mode: 'shadow', backgroundRemoval: { available: true, previewAvailable: false }, aiUsesLeft: 480 };
const VISTA_FONDO = {
  success: true, samples: [{ productId: 'p1', index: 0, before: 'https://x/a.jpg', after: { dataUrl: 'data:image/webp;base64,QQ==', warnings: [] }, copiedFrom: 'link' }],
  skipped: [], aiUsesNeeded: 4, aiUsesPreviewMax: 3, aiUsesLeft: 477, aiUsesConsumed: 3,
};

test('9.10: sin la opción del servidor no hay «Quitar fondo»: ni se elige ni viaja (cuerpo idéntico a la fase 1)', () => {
  for (const config of [CONFIG, { ...CONFIG_FONDO, canApply: false }, { ...CONFIG_FONDO, backgroundRemoval: { available: false, previewAvailable: false } }]) {
    const servicio = servicioFalso({ config });
    const c = crear({ servicio });
    c.ngOnInit();
    assert.equal(c.fondoDisponible, false);
    c.elegirQuitarFondo(true);
    assert.equal(c.quitarFondo, false, 'no se puede encender lo que el servidor no ofrece');
    c.pedirVistaPrevia();
    assert.deepEqual(afuera(servicio.llamadas.vistaPrevia[0]), { productIds: ['p1', 'p2'], settings: { aspect: '1:1', background: 'white', marginPct: 8 } });
  }
});

test('9.10: nace apagado y en la portada; con on, la vista previa y el lote llevan replace y el alcance elegido', () => {
  const servicio = servicioFalso({ config: CONFIG_FONDO, vista: VISTA_FONDO });
  const almacen = almacenFalso();
  const c = crear({ servicio, almacen });
  c.ngOnInit();
  assert.equal(c.fondoDisponible, true);
  assert.equal(c.quitarFondo, false, 'nace apagado');
  assert.equal(c.alcanceFondo, 'cover', 'la portada por defecto');
  assert.equal(c.textoUsosQuedan, 'Te quedan 480 usos de «Quitar fondo» este mes');
  assert.equal(c.vistaPreviaConIA, false);
  assert.equal(c.avisoCostoVista, 'La vista previa usa hasta 3 de tus 480 usos del mes');

  c.elegirQuitarFondo(true);
  assert.equal(c.vistaPreviaConIA, true, 'en on, la vista previa usa IA y avisa del costo');
  c.pedirVistaPrevia();
  assert.deepEqual(afuera(servicio.llamadas.vistaPrevia[0]).settings, { aspect: '1:1', background: 'white', marginPct: 8, backgroundMode: 'replace', backgroundScope: 'cover' });
  assert.equal(c.paso, 'vista');
  assert.equal(c.textoUsosVista, 'Necesita hasta 4 usos de «Quitar fondo» · te quedan 477');
  assert.equal(c.textoOrigen(c.muestras[0]), 'Se copiaría desde un enlace');
  assert.equal(almacen.datos[mapper.LLAVE_AJUSTES].includes('backgroundMode'), false, 'el navegador no recuerda «Quitar fondo»: cada foto gasta un uso');

  c.volverAAjustes();
  c.elegirAlcance('all');
  c.pedirVistaPrevia();
  c.aplicar();
  assert.deepEqual(afuera(servicio.llamadas.crearLote[0]).settings, { aspect: '1:1', background: 'white', marginPct: 8, backgroundMode: 'replace', backgroundScope: 'all' });
  c.ngOnDestroy();
});

test('9.10: en sombra la vista previa va sin IA (no gasta) y el lote solo cuenta lo que costaría', async () => {
  const servicio = servicioFalso({
    config: CONFIG_SOMBRA, estados: [lote('done', { mode: 'shadow', counters: { products: 2, photosWouldUniform: 4 }, metrics: { aiUsesWouldConsume: 6, photosWouldCopy: 1 },
      results: [{ productId: 'p1', status: 'would_uniform', code: null, photos: [{ index: 0, status: 'would_copy', copiedFrom: 'unowned' }, { index: 1, status: 'would_remove_background' }] }] })],
    creado: { success: true, batchId: 'b1', mode: 'shadow', totals: { products: 2 }, aiUsesNeeded: 6 },
  });
  const c = crear({ servicio });
  c.ngOnInit();
  c.elegirQuitarFondo(true);
  assert.equal(c.fondoElegido, true);
  assert.equal(c.fondoEnSombra, true);
  assert.equal(c.vistaPreviaConIA, false, 'en sombra no se ofrece la vista previa con IA');
  c.pedirVistaPrevia();
  assert.deepEqual(afuera(servicio.llamadas.vistaPrevia[0]).settings, { aspect: '1:1', background: 'white', marginPct: 8 }, 'la vista previa no lleva replace: no gasta ni guarda recortes');
  assert.equal(c.textoUsosVista, '', 'sin IA no hay cifra de la vista previa');
  c.aplicar();
  assert.deepEqual(afuera(servicio.llamadas.crearLote[0]).settings.backgroundMode, 'replace', 'el lote en sombra sí lo pide, para contar');
  assert.equal(c.textoUsosSombra, 'Al aplicar de verdad usaría hasta 6 usos de «Quitar fondo». Por ahora no se gasta ninguno');
  await esperar(40);
  assert.equal(c.paso, 'resumen');
  assert.equal(c.resumen.enSombra, true);
  assert.equal(c.resumen.usosSimulados, 6);
  assert.equal(c.resumen.usosGastados, 0);
  assert.deepEqual(c.resumen.simulados.map((x) => x.code).sort(), ['would_copy', 'would_remove_background']);
  assert.equal(c.resumen.origenes[0].texto, 'Se adoptaría un archivo sin dueño registrado');
  c.ngOnDestroy();
});

test('9.10: AI_QUOTA_INSUFFICIENT muestra el mensaje con la sugerencia y no crea el lote ni cambia de paso', () => {
  const servicio = servicioFalso({
    config: CONFIG_FONDO, vista: VISTA_FONDO,
    fallaCrear: { status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', aiUsesNeeded: 9, aiUsesLeft: 4, message: 'Te quedan 4 usos este mes y este lote necesita 9. Elige menos productos o quita el fondo solo de la portada.' } },
  });
  const c = crear({ servicio });
  c.ngOnInit();
  c.elegirQuitarFondo(true);
  c.elegirAlcance('all');
  c.pedirVistaPrevia();
  c.aplicar();
  assert.equal(c.paso, 'vista', 'sigue en la vista previa para que elija menos productos o la portada');
  assert.equal(c.ocupado, false);
  assert.match(c.error, /Te quedan 4 usos este mes y este lote necesita 9\./);
  assert.match(c.error, /Elige menos productos o quita el fondo solo de la portada/);
  assert.doesNotMatch(c.error, /token|nova|bedrock|canvas/i);
  assert.equal(c.quitarFondo, true, 'conserva su elección: puede pasar a «Solo la portada» y reintentar');
  c.volverAAjustes();
  c.elegirAlcance('cover');
  assert.equal(c.alcanceFondo, 'cover');
});

test('9.10: BACKGROUND_UNAVAILABLE y ADMIN_ONLY apagan «Quitar fondo» y lo dicen; la vista previa detenida avisa por qué', () => {
  for (const code of ['BACKGROUND_UNAVAILABLE', 'ADMIN_ONLY']) {
    const servicio = servicioFalso({ config: CONFIG_FONDO });
    servicio.vistaPrevia = () => rxjs.throwError(() => ({ status: code === 'ADMIN_ONLY' ? 403 : 422, error: { code } }));
    const c = crear({ servicio });
    c.ngOnInit();
    c.elegirQuitarFondo(true);
    c.pedirVistaPrevia();
    assert.equal(c.quitarFondo, false, code);
    assert.equal(c.error, mapper.MENSAJES_ERROR[code], code);
    assert.equal(c.paso, 'ajustes');
  }
  const servicio = servicioFalso({ config: CONFIG_FONDO, vista: { ...VISTA_FONDO, stopCode: 'ai_quota' } });
  const c = crear({ servicio });
  c.ngOnInit();
  c.elegirQuitarFondo(true);
  c.pedirVistaPrevia();
  assert.match(c.paradaDeVista, /se acabaron los usos de «Quitar fondo»/);
});

test('9.10: con más de 30 productos la cifra de la vista previa dice que es de los primeros 30', () => {
  const servicio = servicioFalso({ config: CONFIG_FONDO, vista: { ...VISTA_FONDO, aiUsesNeeded: 60, selectionTotal: 340, parts: 4 } });
  const c = crear({ servicio, productIds: [], categoryPath: ['Flores'] });
  c.ngOnInit();
  c.elegirQuitarFondo(true);
  c.pedirVistaPrevia();
  assert.match(c.textoUsosVista, /^Los primeros 30 productos necesitan hasta 60 usos · te quedan 477\./);
});

test('8.6: el resumen del diálogo muestra el origen de lo copiado y cuenta lo omitido de la fase 1b', async () => {
  const servicio = servicioFalso({
    estados: [lote('done', { metrics: { photosCopied: 3 }, counters: { products: 2, photosUniformed: 3, photosSkipped: 3 }, results: [
      { productId: 'p1', status: 'uniformed', code: null, photos: [{ index: 0, status: 'uniformed', copiedFrom: 'link' }, { index: 1, status: 'uniformed', copiedFrom: 'link' }, { index: 2, status: 'uniformed', copiedFrom: 'unowned' }, { index: 3, status: 'skipped', code: 'download_failed' }] },
      { productId: 'p2', status: 'skipped', code: null, photos: [{ index: 0, status: 'skipped', code: 'not_image' }, { index: 1, status: 'skipped', code: 'not_adoptable' }] },
    ] })],
  });
  const c = crear({ servicio });
  c.ngOnInit();
  c.pedirVistaPrevia();
  c.aplicar();
  await esperar(40);
  assert.equal(c.paso, 'resumen');
  assert.deepEqual(c.resumen.origenes.map((o) => [o.code, o.cantidad]), [['link', 2], ['unowned', 1]]);
  assert.equal(c.resumen.copiadas, 3);
  assert.deepEqual(Object.fromEntries(c.resumen.motivos.map((x) => [x.code, x.cantidad])), { download_failed: 1, not_image: 1, not_adoptable: 1 });
  c.ngOnDestroy();
});

test('8.6 y 9.10: plantilla — «Quitar fondo» solo con fondoDisponible, aviso del costo, origen y conteos; estilos de la regla Katuq', () => {
  const html = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.html'), 'utf8');
  const scss = fs.readFileSync(path.join(RAIZ, CARPETA, 'fotos-uniformes.component.scss'), 'utf8');
  assert.match(html, /\*ngIf="fondoDisponible"/, 'el bloque entero depende de lo que dice el servidor');
  for (const pieza of ['elegirQuitarFondo(true)', 'elegirQuitarFondo(false)', 'elegirAlcance(a)', 'etiquetasAlcance[a]', 'textoUsosQuedan', 'avisoCostoVista', 'vistaPreviaConIA', 'fondoEnSombra',
    'textoUsosVista', 'textoUsosSombra', 'paradaDeVista', 'textoOrigen(m)', 'resumen.origenes', 'resumen.simulados', 'resumen.usosGastados', 'resumen.usosDevueltos', 'resumen.usosSimulados']) {
    assert.ok(html.includes(pieza), pieza);
  }
  // El aviso del costo va dentro del bloque de «Quitar fondo» y antes del botón de la vista previa.
  assert.ok(html.indexOf('avisoCostoVista') < html.indexOf('Ver vista previa'), 'el costo se avisa antes de pedir la vista previa');
  assert.doesNotMatch(html, /Nova|Bedrock|Canvas|Opttia|Titan|Amazon|modelo|token/i, 'sin proveedor, modelo ni «token» en pantalla (Artículo VI)');
  const clases = [...html.matchAll(/class="([^"]*)"/g)].flatMap((x) => x[1].split(/\s+/)).concat([...html.matchAll(/\[class\.([\w-]+)\]/g)].map((x) => x[1]));
  assert.deepEqual(clases.filter((c) => /p-/.test(c) && !/^pi(-|$)/.test(c)), [], 'ninguna clase fu-* lleva "p-"');
  for (const clase of ['fu-usos-texto', 'fu-etiqueta--info']) {
    assert.ok(scss.includes(clase), clase);
  }
  assert.match(scss, /\.fu-usos-texto \{ color: [^;]+; font-size: [\d.]+px;/, 'span con color y tamaño propios');
  assert.match(scss, /&\.fu-etiqueta--info \{ background: \$fu-info-soft; color: \$fu-info; \}/);
  assert.match(scss, /\.fu-opcion,[\s\S]*?:focus-visible\s*\{\s*outline: 3px solid \$fu-accent-2 !important/, 'las opciones nuevas reusan fu-opcion, que devuelve el foco');
  assert.doesNotMatch(scss, /(linear|radial)-gradient\(/);
  assert.doesNotMatch(scss, /#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea|#3b82f6|#1d4ed8|#6366f1|#1976d2|#7366ff|rgba\(102,\s*126,\s*234/i);
  for (const nombre of [...scss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((x) => x[1])) assert.doesNotMatch(nombre, /p-/, nombre);
});

test('9.10 (corrector): en on no se dice que no se gasta nada; sin cupo no se pide IA; un error de proveedor oculta la opción', async () => {
  const servicio = servicioFalso({
    config: CONFIG_FONDO, vista: VISTA_FONDO,
    creado: { success: true, batchId: 'b1', mode: 'on', totals: { products: 2 }, aiUsesNeeded: 6 },
  });
  const c = crear({ servicio });
  c.ngOnInit();
  c.elegirQuitarFondo(true);
  c.pedirVistaPrevia();
  c.aplicar();
  assert.equal(c.textoUsosSombra, '', 'en on el lote sí gasta: no se muestra el texto de simulación');
  c.ngOnDestroy();

  const sinCupo = crear({ servicio: servicioFalso({ config: { ...CONFIG_FONDO, aiUsesLeft: 0 }, vista: VISTA_FONDO }) });
  sinCupo.ngOnInit();
  sinCupo.elegirQuitarFondo(true);
  assert.equal(sinCupo.vistaPreviaConIA, false, 'sin usos no se pide la vista previa con IA');
  assert.equal(sinCupo.avisoVistaVisible, true);
  assert.match(sinCupo.avisoCostoVista, /No te quedan usos/);
  sinCupo.ngOnDestroy();

  const roto = crear({ servicio: servicioFalso({ config: CONFIG_FONDO, vista: VISTA_FONDO, fallaCrear: { status: 422, error: { code: 'BACKGROUND_UNAVAILABLE', message: 'No disponible' } } }) });
  roto.ngOnInit();
  roto.elegirQuitarFondo(true);
  roto.pedirVistaPrevia();
  roto.aplicar();
  assert.equal(roto.fondoDisponible, false, 'la opción se oculta tras BACKGROUND_UNAVAILABLE');
  roto.ngOnDestroy();
});
