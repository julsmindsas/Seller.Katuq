'use strict';
/**
 * «Uniformar fotos» — parte pura del front (D-501, ticket 1252):
 * src/app/shared/services/productos/product-photos.mapper.ts.
 *
 * Qué protege:
 *  1. Mensajes por código (omisiones, avisos, paradas y errores) sin jerga ni «token».
 *  2. Ajustes: el último recordado, el del servidor o el por defecto; «Marca» solo con color.
 *  3. Lo que se manda al servidor (vista previa ≤ 3, lote con excluidas y llave) y cómo se lee un lote.
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
  assert.equal(m.seleccionValida({ tipo: 'categoria', categoryLabel: '__SIN_CATEGORIA__' }), false);
  assert.equal(m.seleccionValida({ tipo: 'categoria', categoryLabel: ' Velas ' }), true);
  const ajustes = { aspect: '1:1', background: 'white', marginPct: 8 };
  assert.deepEqual(m.cuerpoVistaPrevia(sel, ajustes), { productIds: ['a', 'b', 'c'], settings: ajustes });
  assert.deepEqual(m.cuerpoVistaPrevia({ tipo: 'categoria', categoryLabel: ' Velas ' }, ajustes), { categoryLabel: 'Velas', settings: ajustes });
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
  assert.match(m.textoDeSeleccion({ tipo: 'categoria', categoryLabel: 'Velas' }), /Velas.*100/);
  assert.equal(m.textoDeAjustes({ aspect: '4:5', background: 'light_gray', marginPct: 5 }), 'Vertical 4:5, fondo gris claro, margen 5 %');
});
