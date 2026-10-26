'use strict';
/**
 * «Uniformar fotos» — parte pura del front (D-501, ticket 1252):
 * src/app/shared/services/productos/product-photos.mapper.ts.
 *
 * Qué protege:
 *  1. Mensajes por código (omisiones, avisos, paradas y errores) sin jerga ni «token».
 *  2. Ajustes: el último recordado, el del servidor o el por defecto; «Marca» solo con color.
 *  3. Lo que se manda al servidor (vista previa ≤ 3, lote con excluidas y llave) y cómo se lee un lote.
 *  4. TX-37 · 7.10/7.11 (D-518): ruta de categoría, series (partes y progreso), conteo del servidor,
 *     árbol para elegir la categoría, proporción sugerida y los mensajes de TODOS los códigos de §G.
 *
 *   node --test tests/productos/fotos-uniformes.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const m = require('../../src/app/shared/services/productos/product-photos.mapper.ts');

const CONFIG = {
  mode: 'shadow', defaults: { aspect: '1:1', background: 'white', marginPct: 8 }, aspects: ['1:1', '4:5', '3:4'],
  backgrounds: ['white', 'light_gray', 'brand'], brandColor: null, limits: { maxProducts: 100, maxPhotosPerProduct: 12, previewMaxPhotos: 3 }, canApply: true,
};

test('cada código de omisión del anexo §B tiene su mensaje, sin jerga', () => {
  const codigos = ['external_link', 'legacy_format', 'not_owned', 'owner_unknown', 'product_integrated', 'flow_photos', 'already_uniform',
    'too_large', 'unreadable', 'timeout', 'changed_meanwhile', 'original_missing', 'reprocessed_later', 'photo_limit', 'excluded'];
  for (const c of codigos) {
    const texto = m.motivoDeOmision(c);
    assert.ok(texto && texto !== 'No se pudo uniformar', c);
    assert.doesNotMatch(texto, /token|bucket|metadata|firestore|sharp|shopify|osmosis/i, c);
  }
  assert.equal(m.motivoDeOmision('codigo-nuevo'), 'No se pudo uniformar');
  for (const a of ['trim_skipped', 'low_resolution', 'blurry']) assert.ok(m.textoDeAviso(a), a);
});

test('errores: mensaje por código; el del servidor solo cuando nombra la sincronización', () => {
  assert.equal(m.mensajeDeError({ status: 0 }), m.MENSAJES_ERROR.SIN_CONEXION);
  assert.equal(m.mensajeDeError({ status: 503, error: { code: 'PHOTO_UNIFORM_OFF', message: 'x' } }), m.MENSAJES_ERROR.PHOTO_UNIFORM_OFF);
  assert.equal(m.mensajeDeError({ status: 429, error: { code: 'PREVIEW_RUNNING' } }), m.MENSAJES_ERROR.PREVIEW_RUNNING);
  assert.equal(m.mensajeDeError({ status: 422, error: { code: 'BATCH_TOO_LARGE' } }), m.MENSAJES_ERROR.BATCH_TOO_LARGE);
  const sync = { status: 409, error: { code: 'COMPANY_HAS_PRODUCT_SYNC', message: 'Tus productos se actualizan con «Cereza a Shopify».' } };
  assert.match(m.mensajeDeError(sync), /Cereza a Shopify/);
  assert.equal(m.mensajeDeError({ status: 500, error: { error: 'TypeError: x is undefined' } }), m.MENSAJES_ERROR.DESCONOCIDO, 'nunca un error técnico');
  assert.equal(m.mensajeDeError({ status: 409, error: { code: 'COMPANY_HAS_PRODUCT_SYNC', message: 'token raro' } }), m.MENSAJES_ERROR.COMPANY_HAS_PRODUCT_SYNC);
  for (const texto of Object.values(m.MENSAJES_ERROR)) assert.doesNotMatch(texto, /token/i);
});

test('ajustes iniciales: recordado válido, si no el del servidor, si no 1:1 blanco 8 %', () => {
  assert.deepEqual(m.ajustesIniciales(null, CONFIG), { aspect: '1:1', background: 'white', marginPct: 8 });
  assert.deepEqual(m.ajustesIniciales('{"aspect":"4:5","background":"light_gray","marginPct":12}', CONFIG), { aspect: '4:5', background: 'light_gray', marginPct: 12 });
  assert.deepEqual(m.ajustesIniciales('{"aspect":"4:5","background":"brand","marginPct":12}', CONFIG), CONFIG.defaults, '«Marca» sin color de marca no vale');
  assert.deepEqual(m.ajustesIniciales('{"aspect":"4:5","background":"brand","marginPct":12}', { ...CONFIG, brandColor: '#ABCDEF' }).background, 'brand');
  assert.deepEqual(m.ajustesIniciales('no es json', null), { ...m.AJUSTES_POR_DEFECTO });
  assert.deepEqual(m.ajustesIniciales('{"aspect":"16:9","background":"white","marginPct":8}', CONFIG), CONFIG.defaults);
  assert.equal(m.ajustesValidos({ aspect: '1:1', background: 'white', marginPct: 21 }), null);
  assert.equal(m.ajustesValidos({ aspect: '1:1', background: 'white', marginPct: 7.5 }), null);
});

test('selección y cuerpos: la vista previa manda hasta 3 productos; el lote manda excluidas y la llave', () => {
  const sel = { tipo: 'productos', productIds: ['a', 'b', 'c', 'd', 'a'] };
  assert.equal(m.seleccionValida(sel), true);
  assert.equal(m.seleccionValida({ tipo: 'productos', productIds: [] }), false);
  // CAMBIA CON 7.10 (D-518 TX-37·4): por categoría viaja la ruta (`categoryPath`), no la etiqueta.
  assert.equal(m.seleccionValida({ tipo: 'categoria', categoryPath: ['__SIN_CATEGORIA__'] }), false);
  assert.equal(m.seleccionValida({ tipo: 'categoria', categoryPath: [' Velas '] }), true);
  const ajustes = { aspect: '1:1', background: 'white', marginPct: 8 };
  assert.deepEqual(m.cuerpoVistaPrevia(sel, ajustes), { productIds: ['a', 'b', 'c'], settings: ajustes });
  assert.deepEqual(m.cuerpoVistaPrevia({ tipo: 'categoria', categoryPath: [' Velas '] }, ajustes), { categoryPath: ['Velas'], settings: ajustes });
  const lote = m.cuerpoLote(sel, ajustes, [{ productId: 'a', index: 1, extra: 'no' }], 'fu-llave-0001');
  assert.deepEqual(lote, { productIds: ['a', 'b', 'c', 'd'], settings: ajustes, excluded: [{ productId: 'a', index: 1 }], idempotencyKey: 'fu-llave-0001' });
  assert.ok(!('company' in lote), 'la empresa nunca viaja en el cuerpo: sale de la sesión');
});

test('llave de idempotencia: segura para el servidor y distinta en cada clic', () => {
  const a = m.nuevaLlave();
  const b = m.nuevaLlave();
  assert.match(a, /^[A-Za-z0-9_.:-]{8,100}$/);
  assert.notEqual(a, b);
});

test('«No uniformar esta»: alterna sin mutar la lista', () => {
  const vacia = [];
  const una = m.alternarExclusion(vacia, 'p1', 0);
  assert.deepEqual(vacia, []);
  assert.deepEqual(una, [{ productId: 'p1', index: 0 }]);
  assert.equal(m.estaExcluida(una, 'p1', 0), true);
  assert.deepEqual(m.alternarExclusion(una, 'p1', 0), []);
});

test('resumen de un lote real: uniformadas, omitidas por motivo, avisos y si se puede revertir', () => {
  const lote = {
    batchId: 'b1', type: 'uniform', status: 'done', mode: 'on', stopCode: null, totals: { products: 3 },
    counters: { products: 3, photosUniformed: 2, photosSkipped: 2 },
    results: [
      { productId: 'p1', status: 'uniformed', code: null, photos: [{ index: 0, status: 'uniformed', warnings: ['low_resolution'] }, { index: 1, status: 'uniformed' }] },
      { productId: 'p2', status: 'skipped', code: null, photos: [{ index: 0, status: 'skipped', code: 'not_owned' }, { index: 1, status: 'excluded' }] },
      { productId: 'p3', status: 'skipped', code: 'product_integrated', photos: [] },
    ],
  };
  const r = m.resumenDeLote(lote);
  assert.equal(r.titulo, '2 fotos uniformadas');
  assert.equal(r.tono, 'exito');
  assert.equal(r.uniformadas, 2);
  assert.equal(r.conAviso, 1);
  assert.equal(r.omitidas, 3);
  assert.deepEqual(r.motivos.map((x) => x.code).sort(), ['excluded', 'not_owned', 'product_integrated']);
  assert.equal(r.puedeRevertir, true);
  assert.equal(r.parada, null);
  assert.deepEqual(m.progresoDeLote(lote), { hechos: 3, total: 3, porcentaje: 100 });
});

test('resumen en sombra, detenido y de reversión', () => {
  const sombra = m.resumenDeLote({ batchId: 'b', type: 'uniform', status: 'done', mode: 'shadow', counters: { photosWouldUniform: 5 }, results: [] });
  assert.match(sombra.titulo, /Simulación: se uniformarían 5 fotos/);
  assert.equal(sombra.enSombra, true);
  assert.equal(sombra.puedeRevertir, false, 'en sombra no hay nada que revertir');
  const parado = m.resumenDeLote({ batchId: 'b', type: 'uniform', status: 'stopped', stopCode: 'mode_changed', mode: 'on', counters: { photosUniformed: 1 }, results: [] });
  assert.equal(parado.tono, 'alerta');
  assert.match(parado.parada, /se puede revertir/);
  const rev = m.resumenDeLote({ batchId: 'r', type: 'revert', status: 'done', mode: 'on', counters: { photosReverted: 1 }, results: [] });
  assert.equal(rev.titulo, 'Volvió 1 foto original');
  assert.equal(rev.puedeRevertir, false);
  assert.equal(m.resumenDeLote(null), null);
  assert.equal(m.esFinal('running'), false);
  assert.equal(m.esFinal('cancelled'), true);
});

test('al volver a abrir: se retoma el último lote solo si sigue activo; en pausa, solo una reversión (uno de uniformar no avanza)', () => {
  const lote = (status, type = 'uniform') => ({ batchId: 'b1', type, status, mode: 'on', stopCode: null, counters: {}, results: [] });
  assert.equal(m.debeRetomarse(lote('running'), CONFIG), true);
  assert.equal(m.debeRetomarse(lote('queued'), CONFIG), true);
  for (const final of ['done', 'cancelled', 'stopped', 'failed']) assert.equal(m.debeRetomarse(lote(final), CONFIG), false, final);
  const pausa = { ...CONFIG, mode: 'off' };
  assert.equal(m.debeRetomarse(lote('running'), pausa), false, 'en pausa nadie retoma un lote de uniformar');
  assert.equal(m.debeRetomarse(lote('running', 'revert'), pausa), true);
  assert.equal(m.debeRetomarse(null, CONFIG), false);
  assert.equal(m.debeRetomarse(lote('running'), null), false);
});

test('permisos que solo deciden qué se MUESTRA: off solo revierte; aplicar exige rol y modo', () => {
  assert.equal(m.puedeAplicar(CONFIG), true);
  assert.equal(m.puedeAplicar({ ...CONFIG, canApply: false }), false);
  assert.equal(m.puedeAplicar({ ...CONFIG, mode: 'off' }), false);
  assert.equal(m.soloRevertir({ ...CONFIG, mode: 'off' }), true);
  assert.equal(m.soloRevertir(CONFIG), false);
  assert.equal(m.textoDeSeleccion({ tipo: 'productos', productIds: ['a'] }), '1 producto');
  // CAMBIA CON 7.10/7.11: sin «hasta 100» (más de 100 es una serie) y con sus subcategorías.
  assert.equal(m.textoDeSeleccion({ tipo: 'categoria', categoryPath: ['Velas'] }), 'Categoría «Velas» y sus subcategorías');
  assert.equal(m.textoDeSeleccion({ tipo: 'categoria', categoryPath: ['Flores', 'Rosas'] }), 'Categoría «Flores › Rosas» y sus subcategorías');
  assert.equal(m.textoDeAjustes({ aspect: '4:5', background: 'light_gray', marginPct: 5 }), 'Vertical 4:5, fondo gris claro, margen 5 %');
});

// ───────────── TX-37 · 7.10 y 7.11 (D-518, anexo §G) ─────────────

const JERGA = /token|bucket|metadata|firestore|sharp|shopify|osmosis|nova|bedrock|canvas|amazon|aws|opttia|adk|modelo|proveedor|api\b/i;

test('7.10: cada código nuevo del anexo §G tiene su mensaje, sin jerga, sin «token» y sin nombre de proveedor ni modelo', () => {
  const omision = ['category_unresolved', 'download_failed', 'not_image', 'not_adoptable', 'background_input_invalid', 'background_unclear', 'background_unavailable'];
  for (const c of omision) {
    const texto = m.motivoDeOmision(c);
    assert.ok(texto && texto !== 'No se pudo uniformar', c);
    assert.doesNotMatch(texto, JERGA, c);
  }
  for (const c of ['would_copy', 'would_remove_background']) {
    const texto = m.textoDeResultado(c);
    assert.ok(texto, c);
    assert.equal(m.motivoDeOmision(c), texto, `${c}: también se entiende si llega como código de una foto`);
    assert.doesNotMatch(texto, JERGA, c);
  }
  assert.ok(m.textoDeAviso('possible_watermark'));
  for (const c of ['series_stopped', 'company_has_sync', 'ai_quota', 'ai_unavailable']) {
    assert.ok(m.MENSAJES_PARADA[c], c);
    assert.equal(m.textoDeParada(c), m.MENSAJES_PARADA[c]);
    assert.doesNotMatch(m.textoDeParada(c), JERGA, c);
  }
  assert.equal(m.textoDeParada('codigo-raro'), m.MENSAJES_PARADA.unexpected);
  for (const c of ['SERIES_TOO_LARGE', 'SERIES_NOT_FOUND', 'AI_QUOTA_INSUFFICIENT']) {
    assert.ok(m.MENSAJES_ERROR[c], c);
    assert.equal(m.mensajeDeError({ status: 422, error: { code: c } }), m.MENSAJES_ERROR[c], c);
    assert.doesNotMatch(m.MENSAJES_ERROR[c], JERGA, c);
  }
  assert.match(m.MENSAJES_ERROR.SERIES_TOO_LARGE, /subcategoría/);
  for (const grupo of [m.MENSAJES_OMISION, m.MENSAJES_AVISO, m.MENSAJES_PARADA, m.MENSAJES_ERROR, m.MENSAJES_RESULTADO]) {
    for (const [c, texto] of Object.entries(grupo)) assert.doesNotMatch(texto, /token|nova|bedrock|canvas|amazon|opttia/i, c);
  }
});

test('7.10: AI_QUOTA_INSUFFICIENT usa el mensaje del servidor (dice cuántos usos quedan), salvo que hable de «token»', () => {
  const conCifras = { status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', message: 'Te quedan 4 usos este mes y este lote necesita 12. Elige menos productos o quita el fondo solo de la portada.' } };
  assert.match(m.mensajeDeError(conCifras), /quedan 4 usos/);
  assert.equal(m.mensajeDeError({ status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', message: 'token vencido' } }), m.MENSAJES_ERROR.AI_QUOTA_INSUFFICIENT);
  const ruta = { status: 400, error: { code: 'INVALID_SELECTION', message: 'Esa categoría no está en tu árbol de categorías.' } };
  assert.match(m.mensajeDeError(ruta), /no está en tu árbol/, 'el 400 de una ruta dice por qué (TX-37 · 7.6)');
});

test('7.10: la ruta de categoría se valida como en el servidor y las entradas se leen en orden ruta > etiqueta > productos', () => {
  assert.deepEqual(m.rutaValida([' Flores ', 'Rosas']), ['Flores', 'Rosas']);
  assert.equal(m.rutaValida([]), null);
  assert.equal(m.rutaValida(['a', 'b', 'c', 'd']), null, 'máximo 3 niveles');
  assert.equal(m.rutaValida(['Flores', ' ']), null);
  assert.equal(m.rutaValida(['__SIN_CATEGORIA__']), null);
  assert.equal(m.rutaValida(['x'.repeat(121)]), null);
  assert.equal(m.rutaValida('Flores'), null);
  assert.deepEqual(m.seleccionDeEntradas({ categoryPath: ['Flores', 'Rosas'], categoryLabel: 'Velas', productIds: ['a'] }), { tipo: 'categoria', categoryPath: ['Flores', 'Rosas'] });
  assert.deepEqual(m.seleccionDeEntradas({ categoryPath: null, categoryLabel: ' Velas ' }), { tipo: 'categoria', categoryPath: ['Velas'] }, 'categoryLabel vale [categoryLabel]');
  assert.deepEqual(m.seleccionDeEntradas({ productIds: ['a', 'b'] }), { tipo: 'productos', productIds: ['a', 'b'] });
  const ajustes = { aspect: '4:5', background: 'white', marginPct: 8 };
  const lote = m.cuerpoLote({ tipo: 'categoria', categoryPath: ['Flores', 'Rosas'] }, ajustes, [], 'fu-llave-0001');
  assert.deepEqual(lote, { categoryPath: ['Flores', 'Rosas'], settings: ajustes, excluded: [], idempotencyKey: 'fu-llave-0001' });
  assert.ok(!('categoryLabel' in lote));
  assert.ok(!('company' in lote), 'la empresa nunca viaja en el cuerpo');
});

test('7.11 (pregunta 13): empieza en la proporción sugerida del sitio; «Del estilo» u otro valor no cambia nada (P1)', () => {
  const recordado = '{"aspect":"3:4","background":"light_gray","marginPct":12}';
  assert.deepEqual(m.ajustesIniciales(null, CONFIG, '4:5'), { aspect: '4:5', background: 'white', marginPct: 8 });
  assert.deepEqual(m.ajustesIniciales(recordado, CONFIG, '1:1'), { aspect: '1:1', background: 'light_gray', marginPct: 12 }, 'el fondo y el margen siguen lo recordado');
  assert.deepEqual(m.ajustesIniciales(null, CONFIG, ''), { aspect: '1:1', background: 'white', marginPct: 8 }, '«Del estilo» = P1');
  assert.deepEqual(m.ajustesIniciales(recordado, CONFIG, ''), { aspect: '3:4', background: 'light_gray', marginPct: 12 });
  assert.deepEqual(m.ajustesIniciales(null, CONFIG, '16:9'), { aspect: '1:1', background: 'white', marginPct: 8 });
  assert.deepEqual(m.ajustesIniciales(null, CONFIG, null), { aspect: '1:1', background: 'white', marginPct: 8 });
  assert.equal(m.proporcionSugeridaValida('3:4'), '3:4');
  assert.equal(m.proporcionSugeridaValida(''), null);
});

test('7.11: conteo del servidor por categoría, partes de 100, «N productos no se pudieron ubicar…» y tope de la serie', () => {
  const cat = { tipo: 'categoria', categoryPath: ['Velas'] };
  const conSerie = { ...CONFIG, limits: { ...CONFIG.limits, maxSeriesProducts: 2000 } };
  const c340 = m.conteoDeSeleccion(cat, { selectionTotal: 340, parts: 4, categoryUnresolved: 3 }, conSerie);
  assert.deepEqual(c340, { total: 340, partes: 4, sinUbicar: 3, excede: false });
  assert.equal(m.textoDeConteo(c340), '340 productos · se harán 4 lotes seguidos de hasta 100');
  assert.equal(m.textoSinUbicar(c340.sinUbicar), '3 productos no se pudieron ubicar en tu árbol de categorías');
  assert.equal(m.textoSinUbicar(1), '1 producto no se pudo ubicar en tu árbol de categorías');
  assert.equal(m.textoSinUbicar(0), '');
  assert.equal(m.textoDeConteo(m.conteoDeSeleccion(cat, { selectionTotal: 40, parts: 1 }, conSerie)), '40 productos · un solo lote');
  assert.equal(m.textoDeConteo(m.conteoDeSeleccion(cat, { selectionTotal: 0, parts: 0 }, conSerie)), 'No hay productos en esta categoría');
  const sinVista = m.conteoDeSeleccion(cat, null, conSerie);
  assert.equal(sinVista.total, null, 'sin vista previa, por categoría no se adivina (la lista filtra por nombre)');
  assert.equal(m.textoDeConteo(sinVista), '');
  assert.equal(m.conteoDeSeleccion(cat, { selectionTotal: 2001, parts: 21 }, conSerie).excede, true);
  assert.equal(m.conteoDeSeleccion(cat, { selectionTotal: 2000, parts: 20 }, conSerie).excede, false);
  // Revisión B06: sin maxSeriesProducts el servidor cae al tope de un lote (B05, «sin serie, nunca sin tope»).
  assert.equal(m.topeDeSerie(CONFIG), 100, 'sin maxSeriesProducts del servidor, el de un lote');
  assert.equal(m.conteoDeSeleccion(cat, { selectionTotal: 101 }, CONFIG).excede, true);
  assert.equal(m.conteoDeSeleccion(cat, { selectionTotal: 100 }, CONFIG).excede, false);
  assert.equal(m.textoExcede(2000), m.MENSAJES_ERROR.SERIES_TOO_LARGE, 'el texto por defecto es el del tope de 2.000');
  assert.match(m.textoExcede(100), /hasta 100 productos a la vez/);
  assert.match(m.textoExcede(12000), /hasta 12\.000 productos/);
  assert.equal(m.topeDeSerie({ ...CONFIG, limits: { ...CONFIG.limits, maxSeriesProducts: 500 } }), 500);
  // Catálogo por link de 150 productos (spec product-photo-batch-scope): 2 lotes seguidos.
  const ids = Array.from({ length: 150 }, (_x, i) => `p${i}`);
  const c150 = m.conteoDeSeleccion({ tipo: 'productos', productIds: [...ids, 'p0'] }, { selectionTotal: 3, parts: 1 }, conSerie);
  assert.deepEqual(c150, { total: 150, partes: 2, sinUbicar: 0, excede: false }, 'por selección cuenta la selección, no la vista previa (que manda 3)');
  assert.equal(m.textoDeConteo(c150), '150 productos · se harán 2 lotes seguidos de hasta 100');
  assert.equal(m.partesDe(340), 4);
  assert.equal(m.partesDe(0), 0);
});

const parte = (part, status, extra = {}) => ({ batchId: `s1-p${part}`, part, status, stopCode: null, counters: {}, ...extra });

test('7.11: progreso de una serie (parte en curso y total) y estado de cada parte en palabras', () => {
  const enCurso = {
    seriesId: 's1', type: 'uniform', mode: 'on', status: 'running', stopCode: null, currentPart: 2,
    totals: { products: 340 }, counters: { products: 130, photosUniformed: 200 },
    parts: [parte(1, 'done'), parte(2, 'running'), parte(3, 'waiting'), parte(4, 'waiting')],
  };
  const p = m.progresoDeSerie(enCurso);
  assert.deepEqual(p, { parte: 2, partes: 4, hechos: 130, total: 340, porcentaje: 38 });
  assert.equal(m.textoDeProgresoSerie(p), 'Parte 2 de 4 · 130 de 340 productos');
  const terminada = { ...enCurso, status: 'done', currentPart: null, counters: { products: 340 }, parts: [1, 2, 3, 4].map((k) => parte(k, 'done')) };
  assert.equal(m.progresoDeSerie(terminada).parte, 4);
  assert.equal(m.progresoDeSerie(terminada).porcentaje, 100);
  const cancelada = { ...enCurso, status: 'cancelled', currentPart: null, parts: [parte(1, 'done'), parte(2, 'cancelled'), parte(3, 'stopped', { stopCode: 'series_stopped' }), parte(4, 'stopped', { stopCode: 'series_stopped' })] };
  assert.equal(m.progresoDeSerie(cancelada).parte, 2, 'la última que corrió, no las que no empezaron');
  assert.equal(m.progresoDeSerie(null).partes, 0);
  assert.equal(m.textoDeParte(parte(1, 'done')), 'Terminado');
  assert.equal(m.textoDeParte(parte(3, 'stopped', { stopCode: 'series_stopped' })), 'No empezó');
  assert.equal(m.textoDeParte(parte(3, 'stopped', { stopCode: 'company_has_sync' })), 'Detenido');
  assert.equal(m.textoDeParte(parte(3, 'waiting')), 'En espera');
});

test('7.11: resumen de una serie con los contadores sumados (cancelada, detenida por un sync, en sombra)', () => {
  const base = { seriesId: 's1', type: 'uniform', mode: 'on', stopCode: null, currentPart: null, totals: { products: 340 }, parts: [] };
  const hecha = m.resumenDeSerie({ ...base, status: 'done', counters: { photosUniformed: 410, photosSkipped: 7, photosExcluded: 1, photosWarned: 5 } });
  assert.equal(hecha.titulo, '410 fotos uniformadas');
  assert.equal(hecha.omitidas, 8);
  assert.equal(hecha.conAviso, 5);
  assert.equal(hecha.puedeRevertir, true);
  const cancelada = m.resumenDeSerie({ ...base, status: 'cancelled', counters: { photosUniformed: 150 } });
  assert.match(cancelada.titulo, /^Serie cancelada · 150 fotos uniformadas/);
  assert.equal(cancelada.puedeRevertir, true, 'lo aplicado queda reversible');
  const porSync = m.resumenDeSerie({ ...base, status: 'stopped', stopCode: 'company_has_sync', counters: { photosUniformed: 90 } });
  assert.match(porSync.parada, /sincronización/);
  assert.equal(porSync.tono, 'alerta');
  const sombra = m.resumenDeSerie({ ...base, mode: 'shadow', status: 'done', counters: { photosWouldUniform: 300 } });
  assert.match(sombra.titulo, /Simulación: se uniformarían 300 fotos/);
  assert.equal(sombra.puedeRevertir, false);
  assert.equal(m.resumenDeSerie(null), null);
});

test('7.11: la reversión de una serie con más de 100 productos cuenta con los contadores (resultsTruncated)', () => {
  const r = m.resumenDeLote({
    batchId: 'r1', type: 'revert', status: 'done', mode: 'on', stopCode: null, counters: { photosReverted: 230, photosSkipped: 4 },
    results: [{ productId: 'p1', status: 'skipped', code: null, photos: [{ index: 0, status: 'skipped', code: 'changed_meanwhile' }] }], resultsTruncated: true,
  });
  assert.equal(r.titulo, 'Volvieron 230 fotos originales');
  assert.equal(r.omitidas, 4, 'el total sale de los contadores, no de la lista cortada');
  assert.equal(r.motivosIncompletos, true);
  const completa = m.resumenDeLote({ batchId: 'b', type: 'uniform', status: 'done', mode: 'on', counters: { photosUniformed: 1 }, results: [] });
  assert.equal(completa.motivosIncompletos, undefined);
});

test('7.11 (pregunta 4): rutas para elegir — mismo documento y nombres que el servidor, hasta 3 niveles, sin repetidas', () => {
  const { stringify } = require('flatted');
  const arbol = [
    { label: 'Flores', data: { nombre: 'Flores viejo' }, children: [
      { label: 'Rosas', children: [{ label: 'Rojas', children: [{ label: 'Cuarto nivel' }] }] },
      { data: { nombre: 'Girasoles' } },
    ] },
    { label: 'Flores secas' },
    { label: 'Velas' },
    { label: 'velas ' },
  ];
  const docs = [{ categorias: ['viejo'] }, { categoria: stringify(arbol) }];
  const rutas = m.rutasParaElegir(docs);
  assert.deepEqual(rutas.map((r) => r.texto), ['Flores', 'Flores › Rosas', 'Flores › Rosas › Rojas', 'Flores › Girasoles', 'Flores secas', 'Velas']);
  assert.deepEqual(rutas[1], { clave: 'flores > rosas', nombres: ['Flores', 'Rosas'], texto: 'Flores › Rosas', nivel: 2, repetida: false });
  // Revisión B06: «Velas» y «velas » dan la misma clave; el servidor la rechaza (enColision), así que
  // sale una vez y marcada `repetida` (el diálogo la muestra deshabilitada, con el motivo).
  assert.deepEqual(rutas.filter((r) => r.repetida).map((r) => r.texto), ['Velas']);
  assert.equal(rutas[0].nombres[0], 'Flores', '`label` primero, como el servidor (B04)');
  assert.deepEqual(m.subrutasDe(rutas, ['Flores']).map((r) => r.texto), ['Flores › Rosas', 'Flores › Rosas › Rojas', 'Flores › Girasoles'], '«Flores» no toma «Flores secas»');
  assert.deepEqual(m.subrutasDe(rutas, ['Velas']), []);
  assert.deepEqual(m.filtrarRutas(rutas, '  ROSAS ').map((r) => r.texto), ['Flores › Rosas', 'Flores › Rosas › Rojas']);
  assert.equal(m.filtrarRutas(rutas, '').length, rutas.length);
  assert.deepEqual(m.rutasParaElegir([{ categoria: arbol }]).length, 6, 'el árbol ya como arreglo también sirve');
  assert.deepEqual(m.rutasParaElegir([{ categoria: 'no es flatted [' }]), []);
  assert.deepEqual(m.rutasParaElegir(null), []);
});

test('7.11: lo último aplicado se recuerda como lote o como serie; un id viejo sin prefijo es un lote', () => {
  assert.equal(m.valorUltimoTrabajo({ tipo: 'reversion', id: 'r1' }), 'reversion:r1');
  assert.deepEqual(m.leerUltimoTrabajo('reversion:r1'), { tipo: 'reversion', id: 'r1' });
  assert.equal(m.leerUltimoTrabajo('reversion:'), null);
  assert.equal(m.valorUltimoTrabajo({ tipo: 'serie', id: 'abc' }), 'serie:abc');
  assert.equal(m.valorUltimoTrabajo({ tipo: 'lote', id: 'b1' }), 'b1');
  assert.deepEqual(m.leerUltimoTrabajo('serie:abc'), { tipo: 'serie', id: 'abc' });
  assert.deepEqual(m.leerUltimoTrabajo('b1'), { tipo: 'lote', id: 'b1' }, 'como lo guardaba D-501');
  assert.equal(m.leerUltimoTrabajo('serie:'), null);
  assert.equal(m.leerUltimoTrabajo(null), null);
  const serie = (status) => ({ type: 'uniform', status });
  assert.equal(m.debeRetomarse(serie('running'), CONFIG), true);
  assert.equal(m.debeRetomarse(serie('done'), CONFIG), false);
  assert.equal(m.debeRetomarse(serie('running'), { ...CONFIG, mode: 'off' }), false, 'en pausa una serie de uniformar no avanza');
});

// ───────────── Revisión del corrector de TX37-B06 ─────────────

test('revisión B06: rutas que chocan como en indiceDeRutas del servidor — también una hija repetida bajo dos padres iguales', () => {
  const arbol = [
    { label: 'Flores', children: [{ label: 'Rosas' }] },
    { label: 'flores', children: [{ label: 'Rosas' }, { label: 'Lirios' }] },
    { label: 'Velas', children: [{ label: 'Aromáticas' }] },
  ];
  const rutas = m.rutasParaElegir([{ categoria: arbol }]);
  const repetidas = rutas.filter((r) => r.repetida).map((r) => r.texto);
  assert.deepEqual(repetidas, ['Flores', 'Flores › Rosas']);
  assert.equal(rutas.find((r) => r.texto === 'flores › Lirios').repetida, false, 'una sola vez: el servidor la acepta');
  assert.equal(rutas.find((r) => r.texto === 'Velas › Aromáticas').repetida, false);
});

test('revisión B06: el resumen dice QUÉ aviso tiene cada foto (posible marca de agua o logo), en un lote y en una serie', () => {
  const foto = (warnings) => ({ index: 0, status: 'uniformed', warnings });
  const lote = {
    batchId: 'b1', type: 'uniform', status: 'done', mode: 'on', stopCode: null, totals: { products: 3 }, counters: { photosUniformed: 3 },
    results: [
      { productId: 'p1', status: 'uniformed', code: null, photos: [foto(['possible_watermark']), { ...foto(['possible_watermark', 'blurry']), index: 1 }] },
      { productId: 'p2', status: 'uniformed', code: null, photos: [foto(['aviso_nuevo'])] },
    ],
  };
  const r = m.resumenDeLote(lote);
  assert.equal(r.conAviso, 3);
  assert.deepEqual(r.avisos, [
    { code: 'possible_watermark', texto: 'Posible marca de agua o logo', cantidad: 2 },
    { code: 'blurry', texto: 'Parece borrosa', cantidad: 1 },
    { code: 'aviso_nuevo', texto: 'Aviso de calidad', cantidad: 1 },
  ]);
  assert.deepEqual(m.resumenDeLote({ ...lote, results: [] }).avisos, []);

  const serie = {
    seriesId: 's1', type: 'uniform', mode: 'on', status: 'stopped', stopCode: 'company_has_sync', currentPart: null, totals: { products: 250 },
    counters: { photosUniformed: 150, photosWarned: 9, photosSkipped: 2 },
    parts: [
      { batchId: 's1-p1', part: 1, status: 'done', stopCode: null, counters: {} },
      { batchId: 's1-p2', part: 2, status: 'stopped', stopCode: 'company_has_sync', counters: {} },
      { batchId: 's1-p3', part: 3, status: 'stopped', stopCode: 'series_stopped', counters: {} },
    ],
  };
  assert.deepEqual(m.partesConResultados(serie).map((p) => p.part), [1, 2], 'la que no empezó no tiene resultados');
  const sinLotes = m.resumenDeSerie(serie);
  assert.deepEqual([sinLotes.avisos, sinLotes.motivos, sinLotes.conAviso, sinLotes.motivosIncompletos], [[], [], 9, undefined]);
  const conLotes = m.resumenDeSerie(serie, [{ ...lote, batchId: 's1-p1' }, { ...lote, batchId: 's1-p2' }]);
  assert.equal(conLotes.avisos[0].code, 'possible_watermark');
  assert.equal(conLotes.avisos[0].cantidad, 4);
  assert.equal(conLotes.conAviso, 9, 'las cifras siguen siendo las de los contadores de la serie');
  assert.equal(conLotes.omitidas, 2);
  assert.equal(conLotes.motivosIncompletos, undefined);
  const falta = m.resumenDeSerie(serie, [{ ...lote, batchId: 's1-p1' }, null]);
  assert.equal(falta.motivosIncompletos, true, 'si no se pudo leer un lote, la lista se marca incompleta');
});

test('revisión B06: la consulta se corta con 403/404 (no se arreglan reintentando); con la bandera apagada, la parada feature_off', () => {
  assert.equal(m.detieneLaConsulta({ status: 403, error: { code: 'FEATURE_DISABLED' } }), true);
  assert.equal(m.detieneLaConsulta({ status: 404, error: { code: 'SERIES_NOT_FOUND' } }), true);
  for (const status of [0, 500, 502, 503, 429]) assert.equal(m.detieneLaConsulta({ status }), false, String(status));
  assert.equal(m.detieneLaConsulta(null), false);
  assert.equal(m.mensajeDeConsultaCortada({ status: 403, error: { code: 'FEATURE_DISABLED' } }), m.MENSAJES_PARADA.feature_off);
  assert.equal(m.mensajeDeConsultaCortada({ status: 404, error: { code: 'SERIES_NOT_FOUND' } }), m.MENSAJES_ERROR.SERIES_NOT_FOUND);
});

test('revisión B06: un mensaje del servidor que nombra un proveedor o un modelo no se muestra (Artículo VI)', () => {
  for (const nombre of ['Nova Canvas', 'Amazon Bedrock', 'AWS', 'Titan', 'Opttia', 'Claude', 'Gemini', 'OpenAI', 'GPT-4']) {
    const err = { status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', message: `Te quedan 4 usos de ${nombre} este mes.` } };
    assert.equal(m.mensajeDeError(err), m.MENSAJES_ERROR.AI_QUOTA_INSUFFICIENT, nombre);
  }
  const renovar = { status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', message: 'Te quedan 4 usos; se renovarán el 1 del mes.' } };
  assert.match(m.mensajeDeError(renovar), /se renovarán/, '«renovar» no es «Nova»');
});

// ───────────── TX-37 · 8.6 y 9.10 (D-518): origen de las copias y «Quitar fondo» ─────────────

const CONFIG_FONDO = { ...CONFIG, mode: 'on', canApply: true, backgroundRemoval: { available: true, previewAvailable: true }, aiUsesLeft: 480 };
const AJUSTES = { aspect: '1:1', background: 'white', marginPct: 8 };

test('9.10: «Quitar fondo» solo se ofrece si el servidor lo dice, con rol y modo; la vista previa con IA solo en on', () => {
  assert.equal(m.quitarFondoDisponible(CONFIG_FONDO), true);
  assert.equal(m.vistaPreviaConFondoDisponible(CONFIG_FONDO), true);
  // Un servidor anterior, o sin la bandera: no se ofrece.
  assert.equal(m.quitarFondoDisponible(CONFIG), false);
  assert.equal(m.quitarFondoDisponible(null), false);
  assert.equal(m.quitarFondoDisponible({ ...CONFIG_FONDO, backgroundRemoval: { available: false, previewAvailable: false } }), false);
  assert.equal(m.quitarFondoDisponible({ ...CONFIG_FONDO, backgroundRemoval: null }), false);
  // Sin rol de administrador o con el modo en pausa: no.
  assert.equal(m.quitarFondoDisponible({ ...CONFIG_FONDO, canApply: false }), false);
  assert.equal(m.quitarFondoDisponible({ ...CONFIG_FONDO, mode: 'off' }), false);
  // En sombra se puede simular, pero la vista previa no usa IA (gasta).
  const sombra = { ...CONFIG_FONDO, mode: 'shadow', backgroundRemoval: { available: true, previewAvailable: false } };
  assert.equal(m.quitarFondoDisponible(sombra), true);
  assert.equal(m.vistaPreviaConFondoDisponible(sombra), false);
  // Aunque el servidor dijera previewAvailable en sombra, el front no la usa.
  assert.equal(m.vistaPreviaConFondoDisponible({ ...sombra, backgroundRemoval: { available: true, previewAvailable: true } }), false);
  assert.equal(m.vistaPreviaConFondoDisponible({ ...CONFIG_FONDO, backgroundRemoval: { available: true, previewAvailable: false } }), false);
});

test('9.10: lo que se manda — sin «Quitar fondo» el cuerpo es idéntico al de la fase 1; con él, replace y el alcance', () => {
  const sel = { tipo: 'productos', productIds: ['p1', 'p2', 'p3', 'p4'] };
  const antes = m.cuerpoVistaPrevia(sel, AJUSTES);
  assert.deepEqual(antes, { productIds: ['p1', 'p2', 'p3'], settings: AJUSTES });
  assert.deepEqual(m.cuerpoVistaPrevia(sel, AJUSTES, m.ajustesDeFondo(m.QUITAR_FONDO_POR_DEFECTO, true)), antes, 'apagado: ni backgroundMode ni backgroundScope');
  assert.deepEqual(m.ajustesDeFondo({ quitar: true, alcance: 'cover' }, false), {}, 'sin permiso no viaja nada');
  assert.deepEqual(m.ajustesDeFondo(null, true), {});

  const portada = m.ajustesDeFondo({ quitar: true, alcance: 'cover' }, true);
  assert.deepEqual(portada, { backgroundMode: 'replace', backgroundScope: 'cover' });
  assert.deepEqual(m.cuerpoVistaPrevia(sel, AJUSTES, portada).settings, { ...AJUSTES, ...portada });
  const todas = m.ajustesDeFondo({ quitar: true, alcance: 'all' }, true);
  assert.equal(todas.backgroundScope, 'all');
  assert.equal(m.ajustesDeFondo({ quitar: true, alcance: 'raro' }, true).backgroundScope, 'cover', 'un alcance inválido cae en la portada');

  const lote = m.cuerpoLote(sel, AJUSTES, [], 'llave-12345');
  assert.deepEqual(lote.settings, AJUSTES, 'el lote sin fondo no cambia');
  assert.deepEqual(m.cuerpoLote(sel, AJUSTES, [], 'llave-12345', todas).settings, { ...AJUSTES, ...todas });
  assert.deepEqual(m.QUITAR_FONDO_POR_DEFECTO, { quitar: false, alcance: 'cover' }, 'nace apagado y en la portada');
  assert.deepEqual(m.ALCANCES_FONDO, ['cover', 'all']);
  assert.deepEqual([m.ETIQUETAS_ALCANCE.cover, m.ETIQUETAS_ALCANCE.all], ['Solo la portada', 'Todas las fotos']);
});

test('9.10: el aviso del costo de la vista previa y los usos que necesita y que quedan', () => {
  assert.equal(m.avisoCostoVistaPrevia(3, 480), 'La vista previa usa hasta 3 de tus 480 usos del mes');
  assert.equal(m.avisoCostoVistaPrevia(3, 1500), 'La vista previa usa hasta 3 de tus 1.500 usos del mes');
  assert.equal(m.avisoCostoVistaPrevia(undefined, null), 'La vista previa usa hasta 3 de tus usos del mes', 'sin saber cuántos quedan, sin cifra inventada');
  assert.equal(m.avisoCostoVistaPrevia(3, undefined), 'La vista previa usa hasta 3 de tus usos del mes');
  assert.equal(m.avisoCostoVistaPrevia(3, -1), 'La vista previa usa hasta 3 de tus usos del mes', 'un valor inválido no se muestra');
  assert.equal(m.avisoCostoVistaPrevia(3, 2), 'La vista previa usa hasta 2 de tus 2 usos del mes', 'nunca más que lo que queda');
  assert.equal(m.avisoCostoVistaPrevia(3, 1), 'La vista previa usa hasta 1 de tus 1 uso del mes');
  assert.match(m.avisoCostoVistaPrevia(3, 0), /No te quedan usos/, 'sin cupo no promete gasto');
  assert.equal(m.textoUsosQueQuedan(480), 'Te quedan 480 usos de «Quitar fondo» este mes');
  assert.equal(m.textoUsosQueQuedan(1), 'Te quedan 1 uso de «Quitar fondo» este mes');
  assert.equal(m.textoUsosQueQuedan(0), 'Te quedan 0 usos de «Quitar fondo» este mes');
  assert.equal(m.textoUsosQueQuedan(null), '');

  assert.equal(m.textoUsosNecesarios(12, 480, 10), 'Necesita hasta 12 usos de «Quitar fondo» · te quedan 480');
  assert.equal(m.textoUsosNecesarios(1, null, 1), 'Necesita hasta 1 uso de «Quitar fondo»');
  const parcial = m.textoUsosNecesarios(60, 480, 340);
  assert.match(parcial, /^Los primeros 30 productos necesitan hasta 60 usos · te quedan 480\./, 'con más de 30 productos la cifra es de los primeros 30');
  assert.match(parcial, /Si el lote completo no alcanza, te lo decimos antes de empezar/);
  assert.equal(m.textoUsosNecesarios(undefined, 480, 10), '');
  assert.equal(m.textoUsosSimulados(40), 'Al aplicar de verdad usaría hasta 40 usos de «Quitar fondo». Por ahora no se gasta ninguno');
  assert.equal(m.textoUsosSimulados(null), '');
});

test('9.10: AI_QUOTA_INSUFFICIENT — el mensaje del servidor lleva siempre la salida; sin proveedor ni «token»', () => {
  const salida = /Elige menos productos o quita el fondo solo de la portada\.$/;
  // Con la salida del servidor, tal cual.
  const completo = { status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', message: 'Te quedan 4 usos este mes y este lote necesita 9. Elige menos productos o quita el fondo solo de la portada.' } };
  assert.equal(m.mensajeDeError(completo), completo.error.message);
  // Sin salida: se agrega.
  const corto = { status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', message: 'Te quedan 4 usos este mes y este lote necesita 9.' } };
  assert.match(m.mensajeDeError(corto), /^Te quedan 4 usos este mes y este lote necesita 9\. Elige menos productos/);
  assert.match(m.mensajeDeError(corto), salida);
  // Sin mensaje del servidor: el nuestro, que ya la tiene.
  assert.match(m.mensajeDeError({ status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT' } }), /Elige menos productos o quita el fondo solo de la portada/);
  // Con «token» o un proveedor: se usa el nuestro.
  for (const palabra of ['token', 'Nova', 'Bedrock']) {
    const err = { status: 422, error: { code: 'AI_QUOTA_INSUFFICIENT', message: `Sin ${palabra} suficiente.` } };
    assert.equal(m.mensajeDeError(err), m.MENSAJES_ERROR.AI_QUOTA_INSUFFICIENT, palabra);
  }
  assert.match(m.MENSAJES_ERROR.ADMIN_ONLY, /administrador/);
  assert.equal(m.mensajeDeError({ status: 403, error: { code: 'ADMIN_ONLY' } }), m.MENSAJES_ERROR.ADMIN_ONLY);
  assert.equal(m.mensajeDeError({ status: 422, error: { code: 'BACKGROUND_UNAVAILABLE' } }), m.MENSAJES_ERROR.BACKGROUND_UNAVAILABLE);
  const enPruebas = { status: 422, error: { code: 'BACKGROUND_UNAVAILABLE', message: 'La vista previa con Quitar fondo todavía no está disponible: tu empresa está en pruebas.' } };
  assert.equal(m.mensajeDeError(enPruebas), enPruebas.error.message);
});

test('8.6 y 9.10: ningún texto de pantalla nombra al proveedor ni al modelo, ni dice «token» (Artículo VI)', () => {
  const todos = [
    ...Object.values(m.MENSAJES_OMISION), ...Object.values(m.MENSAJES_RESULTADO), ...Object.values(m.MENSAJES_AVISO),
    ...Object.values(m.MENSAJES_PARADA), ...Object.values(m.MENSAJES_ERROR), ...Object.values(m.MENSAJES_ORIGEN), ...Object.values(m.MENSAJES_ORIGEN_SIMULADO),
    m.avisoCostoVistaPrevia(3, 480), m.textoUsosQueQuedan(480), m.textoUsosNecesarios(60, 480, 340), m.textoUsosSimulados(40), ...Object.values(m.ETIQUETAS_ALCANCE),
  ];
  for (const t of todos) {
    assert.doesNotMatch(t, /token|\bnova\b|bedrock|canvas|amazon|\baws\b|opttia|titan|anthropic|claude|gemini|openai|\bgpt|bucket|metadata|firestore|sharp|shopify|osmosis/i, t);
  }
  for (const c of ['background_input_invalid', 'background_unclear', 'background_unavailable', 'ai_quota', 'download_failed', 'not_image', 'not_adoptable']) {
    assert.ok(m.motivoDeOmision(c) !== 'No se pudo uniformar', `${c} tiene su texto`);
  }
  assert.equal(m.textoDeResultado('would_copy'), 'Se copiaría a tus fotos antes de uniformarla');
  assert.equal(m.textoDeResultado('would_remove_background'), 'Se le quitaría el fondo');
});

test('8.6: el origen de las fotos copiadas o adoptadas, real y en condicional', () => {
  assert.equal(m.textoDeOrigen('link'), 'Copiada desde un enlace');
  assert.equal(m.textoDeOrigen('unowned'), 'Adoptada de un archivo sin dueño registrado');
  assert.equal(m.textoDeOrigen('link', true), 'Se copiaría desde un enlace');
  assert.equal(m.textoDeOrigen('unowned', true), 'Se adoptaría un archivo sin dueño registrado');
  assert.equal(m.textoDeOrigen('otro'), '');
  assert.equal(m.textoDeOrigen(undefined, true), '');
  // Nunca una URL ni una ruta.
  for (const t of [...Object.values(m.MENSAJES_ORIGEN), ...Object.values(m.MENSAJES_ORIGEN_SIMULADO)]) assert.doesNotMatch(t, /https?:|\/|gs:/i, t);
});

const loteConOrigen = (extra = {}, fotos) => ({
  batchId: 'b1', type: 'uniform', status: 'done', mode: 'on', stopCode: null, totals: { products: 3 },
  counters: { products: 3, photosUniformed: 5, photosSkipped: 4 },
  metrics: { photosCopied: 3, aiUsesConsumed: 6, aiUsesRefunded: 1 },
  results: [
    { productId: 'p1', status: 'uniformed', code: null, photos: fotos || [
      { index: 0, status: 'uniformed', copiedFrom: 'link' },
      { index: 1, status: 'uniformed', copiedFrom: 'link' },
      { index: 2, status: 'uniformed', copiedFrom: 'unowned' },
      { index: 3, status: 'skipped', code: 'download_failed' },
    ] },
    { productId: 'p2', status: 'skipped', code: null, photos: [
      { index: 0, status: 'skipped', code: 'not_image' }, { index: 1, status: 'skipped', code: 'not_adoptable' }, { index: 2, status: 'skipped', code: 'download_failed' },
    ] },
  ],
  ...extra,
});

test('8.6: el resumen de un lote dice el origen de lo copiado y cuenta download_failed, not_image y not_adoptable', () => {
  const r = m.resumenDeLote(loteConOrigen());
  assert.deepEqual(JSON.parse(JSON.stringify(r.origenes)), [
    { code: 'link', texto: 'Copiada desde un enlace', cantidad: 2 },
    { code: 'unowned', texto: 'Adoptada de un archivo sin dueño registrado', cantidad: 1 },
  ]);
  assert.equal(r.copiadas, 3, 'el total sale de los contadores del servidor');
  assert.equal(r.habriaCopiado, 0);
  const porCodigo = Object.fromEntries(r.motivos.map((x) => [x.code, x.cantidad]));
  assert.deepEqual(porCodigo, { download_failed: 2, not_image: 1, not_adoptable: 1 });
  for (const x of r.motivos) assert.ok(x.texto && x.texto !== 'No se pudo uniformar', x.code);
  assert.deepEqual(r.simulados, []);
  assert.equal(r.omitidas, 4);
  assert.equal(r.usosGastados, 6);
  assert.equal(r.usosDevueltos, 1);
  assert.equal(r.usosSimulados, 0);
});

test('8.6 y 9.10: en una simulación, would_copy y would_remove_background se cuentan en condicional y no se gasta ningún uso', () => {
  const sombra = loteConOrigen({
    mode: 'shadow', counters: { products: 2, photosWouldUniform: 4, photosSkipped: 0 },
    metrics: { photosWouldCopy: 2, aiUsesWouldConsume: 7 },
    results: [{ productId: 'p1', status: 'would_uniform', code: null, photos: [
      { index: 0, status: 'would_copy', copiedFrom: 'link' },
      { index: 1, status: 'would_copy', copiedFrom: 'unowned' },
      { index: 2, status: 'would_remove_background' },
      { index: 3, status: 'would_remove_background' },
    ] }],
  });
  const r = m.resumenDeLote(sombra);
  assert.equal(r.enSombra, true);
  assert.deepEqual(JSON.parse(JSON.stringify(r.simulados)).sort((a, b) => a.code.localeCompare(b.code)), [
    { code: 'would_copy', texto: 'Se copiaría a tus fotos antes de uniformarla', cantidad: 2 },
    { code: 'would_remove_background', texto: 'Se le quitaría el fondo', cantidad: 2 },
  ]);
  assert.deepEqual(r.origenes.map((x) => x.texto).sort(), ['Se adoptaría un archivo sin dueño registrado', 'Se copiaría desde un enlace']);
  assert.equal(r.habriaCopiado, 2);
  assert.equal(r.copiadas, 0);
  assert.equal(r.usosSimulados, 7);
  assert.equal(r.usosGastados, 0, 'en sombra no se gasta ningún uso');
  assert.equal(r.omitidas, 0, 'lo que se haría no es una omisión');
});

test('8.6 y 9.10: el resumen de una serie suma las métricas del total y lista los orígenes de los lotes leídos', () => {
  const serie = {
    seriesId: 's1', type: 'uniform', mode: 'on', status: 'done', stopCode: null, currentPart: null, totals: { products: 6 },
    counters: { products: 6, photosUniformed: 10 }, metrics: { photosCopied: 9, aiUsesConsumed: 14, aiUsesRefunded: 2 },
    parts: [{ batchId: 's1-p1', part: 1, status: 'done', stopCode: null, counters: {} }, { batchId: 's1-p2', part: 2, status: 'done', stopCode: null, counters: {} }],
  };
  const sinLotes = m.resumenDeSerie(serie);
  assert.deepEqual([sinLotes.copiadas, sinLotes.usosGastados, sinLotes.usosDevueltos, sinLotes.origenes], [9, 14, 2, []]);
  const conLotes = m.resumenDeSerie(serie, [loteConOrigen(), loteConOrigen()]);
  assert.equal(conLotes.origenes.find((x) => x.code === 'link').cantidad, 4);
  assert.equal(conLotes.copiadas, 9, 'el total sigue siendo el del servidor');
  assert.equal(m.resumenDeLote(null), null);
  const sinMetricas = m.resumenDeLote({ ...loteConOrigen(), metrics: undefined });
  assert.deepEqual([sinMetricas.copiadas, sinMetricas.usosGastados], [0, 0], 'un servidor anterior no manda métricas: ceros, no NaN');
});

test('8.6 y 9.10: la parada ai_quota y ai_unavailable, y la omisión por cupo, tienen texto sin jerga', () => {
  assert.match(m.textoDeParada('ai_quota'), /se acabaron los usos de «Quitar fondo»/);
  assert.match(m.textoDeParada('ai_unavailable'), /Los usos de esas fotos se devolvieron/);
  assert.match(m.motivoDeOmision('ai_quota'), /Se acabaron los usos/);
  assert.match(m.motivoDeOmision('background_unavailable'), /el uso se devolvió/);
});
