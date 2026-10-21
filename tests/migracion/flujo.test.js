'use strict';
/**
 * Flujo de «Traer mi tienda» (F5-30, F530-F02, tarea 8.3): lógica pura que une los pasos.
 *   node --test tests/migracion/flujo.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { flujo, imp, textos } = require('./_cargar');

const ANTERIOR = 'Handle,Title,Body (HTML),Variant Price,Variant Taxable,Image Src,Image Position\n';
const csvShopify = (n) => ANTERIOR + Array.from({ length: n }, (_, i) => `p${i},Producto ${i},,10000,true,https://x.test/${i}.jpg,1`).join('\n') + '\n';

const config = (extra) => ({ ...flujo.CONFIG_INICIAL, sitioId: 'S1', bodega: 'BOD-001', preciosConIva: true, ...extra });
function ctxDe(n, extra) {
  const l = imp.leerTienda(csvShopify(n));
  assert.equal(l.ok, true);
  return { migrationId: 'mig-prueba-1', runId: 'run-prueba-1', proveedor: l.perfil.id, config: config(extra), hayInventario: false, grupos: l.grupos, perfil: l.perfil, idioma: l.idioma };
}
const rapido = { esperar: async () => {} };

test('nuevoId cumple el formato del servidor y no se repite', () => {
  const a = flujo.nuevoId('mig');
  const b = flujo.nuevoId('mig');
  assert.match(a, /^[A-Za-z0-9_-]{8,64}$/);
  assert.notEqual(a, b);
  assert.match(flujo.nuevoId('¿raro/ id?'), /^[A-Za-z0-9_-]{8,64}$/);
});

test('validarConfig: sitio, IVA y precios con IVA son obligatorios; la bodega solo con inventario', () => {
  const e = flujo.validarConfig({ ...flujo.CONFIG_INICIAL }, true);
  assert.ok(e.sitioId && e.bodega && e.preciosConIva);
  assert.equal(e.ivaPercent, undefined);
  assert.deepEqual(flujo.validarConfig(config(), true), {});
  assert.equal(flujo.validarConfig(config({ bodega: '' }), false).bodega, undefined);
  assert.ok(flujo.validarConfig(config({ ivaPercent: 16 }), false).ivaPercent);
  assert.ok(flujo.sinErrores(flujo.validarConfig(config(), false)));
});

test('opcionesDe: bodega y reemplazo solo cuando hay inventario; el IVA y los precios siempre', () => {
  assert.deepEqual(flujo.opcionesDe(config(), false), { ivaPercent: 19, pricesIncludeTax: true });
  assert.deepEqual(flujo.opcionesDe(config({ preciosConIva: false, reemplazarExistencias: true }), true), {
    ivaPercent: 19, pricesIncludeTax: false, warehouse: 'BOD-001', replaceExistingStock: true,
  });
});

test('cuerpos de simulación y de lote llevan la empresa sola desde el token: nunca company ni companyId', () => {
  const ctx = ctxDe(60);
  const { cuerpos } = flujo.cuerposSimulacion(ctx);
  assert.equal(cuerpos.length, 1);
  assert.equal(cuerpos[0].siteId, 'S1');
  assert.equal(cuerpos[0].groups.length, 60);
  const lote = flujo.cuerpoLote(ctx, ctx.grupos.slice(0, 25), 3);
  assert.equal(lote.lot, 3);
  assert.equal(lote.runId, 'run-prueba-1');
  for (const c of [cuerpos[0], lote]) {
    assert.ok(!('company' in c) && !('companyId' in c));
  }
});

test('simularTodo suma las respuestas y devuelve el error clasificado sin lanzar', async () => {
  const ctx = ctxDe(3);
  let llamadas = 0;
  const ok = await flujo.simularTodo({ simular: async () => (llamadas++, { success: true, migrationId: 'm', products: { toCreate: 3 }, guards: [{ code: 'FLOW_PUBLISHES_PRODUCTS', message: 'x' }] }) }, ctx, rapido);
  assert.equal(llamadas, 1);
  assert.equal(ok.ok, true);
  assert.equal(ok.totales.productos.toCreate, 3);
  assert.equal(flujo.guardasBloqueantes(ok.totales.guardas).length, 1);
  const mal = await flujo.simularTodo({ simular: async () => { throw { status: 409, error: { code: 'WOO_INTEGRATION_ACTIVE', message: 'm' } }; } }, ctx, rapido);
  assert.equal(mal.ok, false);
  assert.equal(mal.error.code, 'WOO_INTEGRATION_ACTIVE');
  assert.equal(mal.error.blocking, true);
});

const respuestaLote = (cuerpo) => ({
  success: true, migrationId: cuerpo.migrationId, lot: cuerpo.lot, replayed: false,
  products: cuerpo.groups.map((g) => ({ key: g.key, action: 'created', cd: `cd-${g.key}` })),
  photosPending: cuerpo.groups.length,
});

test('importarProductosPorLotes: 60 productos son 3 lotes de hasta 25 y suman lo creado', async () => {
  const ctx = ctxDe(60);
  const lotes = [];
  const progreso = [];
  const r = await flujo.importarProductosPorLotes({ importarProductos: async (c) => (lotes.push(c.lot), respuestaLote(c)) }, ctx, { ...rapido, progreso: (e, h, t) => progreso.push([e, h, t]) });
  assert.deepEqual(lotes, [1, 2, 3]);
  assert.equal(r.totales.creados, 60);
  assert.equal(r.totalLotes, 3);
  assert.equal(r.avance.detenido, null);
  assert.deepEqual(progreso.at(-1), ['productos', 3, 3]);
});

test('importarProductosPorLotes: se detiene en el lote que falla y reanuda desde ahí sin repetir los hechos', async () => {
  const ctx = ctxDe(60);
  let fallar = true;
  const vistos = [];
  const envio = async (c) => {
    vistos.push(c.lot);
    if (c.lot === 2 && fallar) throw { status: 409, error: { code: 'FLOW_PUBLISHES_PRODUCTS', message: 'flujo' } };
    return respuestaLote(c);
  };
  const a = await flujo.importarProductosPorLotes({ importarProductos: envio }, ctx, rapido);
  assert.equal(a.avance.siguiente, 1);
  assert.equal(a.avance.detenido.error.code, 'FLOW_PUBLISHES_PRODUCTS');
  assert.equal(a.totales.creados, 25);
  fallar = false;
  vistos.length = 0;
  const b = await flujo.importarProductosPorLotes({ importarProductos: envio }, ctx, { ...rapido, desde: a.avance.siguiente, previas: a.avance.respuestas });
  assert.deepEqual(vistos, [2, 3]);
  assert.equal(b.totales.creados, 60);
});

test('importarProductosPorLotes: un 5xx se reintenta con el mismo lote y IMPORT_IN_PROGRESS espera', async () => {
  const ctx = ctxDe(2);
  const intentos = [];
  const esperas = [];
  const r = await flujo.importarProductosPorLotes(
    { importarProductos: async (c) => { intentos.push(c.lot); if (intentos.length < 3) throw { status: 409, error: { code: 'IMPORT_IN_PROGRESS' } }; return respuestaLote(c); } },
    ctx,
    { esperar: async (ms) => esperas.push(ms) },
  );
  assert.deepEqual(intentos, [1, 1, 1]);
  assert.equal(esperas.length, 2);
  assert.equal(r.totales.creados, 2);
});

test('redirecciones: solo con perfil sin bases; cada producto con su cd y su handle; sin los partidos', () => {
  const ctx = ctxDe(3);
  assert.equal(flujo.puedeRedirigir(ctx), true);
  const productos = [
    { key: 'a', action: 'created', cd: 'c1' },
    { key: 'a-2', action: 'created', cd: 'c2', splitFrom: 'a' },
    { key: 'b', action: 'skipped', reason: 'EXISTS' },
    { key: 'c', action: 'skipped', reason: 'ALREADY_MIGRATED', cd: 'c3' },
  ];
  const cuerpos = flujo.cuerposRedirecciones(ctx, productos);
  assert.equal(cuerpos.length, 1);
  assert.deepEqual(cuerpos[0].products, [{ handle: 'a', cd: 'c1' }, { handle: 'c', cd: 'c3' }]);
  assert.equal(cuerpos[0].siteId, 'S1');
  const woo = { ...ctx, perfil: { basesRedireccion: { es: {}, en: {} } } };
  assert.equal(flujo.puedeRedirigir(woo), false);
  assert.deepEqual(flujo.cuerposRedirecciones(woo, productos), []);
});

test('crearRedireccionesDe suma conteos y entrega el error sin lanzar', async () => {
  const ctx = ctxDe(2);
  const prods = [{ key: 'a', action: 'created', cd: 'c1' }];
  const r = await flujo.crearRedireccionesDe({ crearRedirecciones: async () => ({ success: true, generated: 1, replaced: 0, unchanged: 0, probable: 0, conflictsWithManual: 2, overCapacity: 0, capacity: 500, issuesTotal: 3 }) }, ctx, prods, rapido);
  assert.deepEqual([r.generated, r.conflictsWithManual, r.avisos, r.error], [1, 2, 3, null]);
  const mal = await flujo.crearRedireccionesDe({ crearRedirecciones: async () => { throw { status: 404, error: { code: 'SITE_NOT_FOUND' } }; } }, ctx, prods, rapido);
  assert.equal(mal.error.code, 'SITE_NOT_FOUND');
});

test('fotos: lotes de 10 con solo el cd; sin repetidos ni omitidos ajenos; un fallo no lanza', async () => {
  const productos = Array.from({ length: 23 }, (_, i) => ({ key: `p${i}`, action: 'created', cd: `c${i}` }));
  productos.push({ key: 'x', action: 'skipped', reason: 'EXISTS', cd: 'ajeno' }, { key: 'dup', action: 'created', cd: 'c0' });
  const lotes = flujo.lotesDeFotos(productos);
  assert.deepEqual(lotes.map((l) => l.length), [10, 10, 3]);
  assert.ok(lotes.flat().every((p) => Object.keys(p).join() === 'cd'));
  assert.ok(!lotes.flat().some((p) => p.cd === 'ajeno'));

  const ctx = ctxDe(2);
  const cuerpos = [];
  const r = await flujo.copiarFotosDe({ copiarFotos: async (c) => (cuerpos.push(c), { success: true, migrationId: c.migrationId, lot: c.lot, replayed: false, copied: c.products.length, alreadyOwn: 0, changedMeanwhile: 0, failed: [{ cd: c.products[0].cd, index: 0, code: 'download_failed' }] }) }, ctx, productos, rapido);
  assert.equal(cuerpos.length, 3);
  assert.ok(cuerpos.every((c) => c.runId === 'run-prueba-1' && Object.keys(c).sort().join() === 'lot,migrationId,products,runId'));
  assert.deepEqual([r.copiadas, r.fallidas, r.lotesHechos, r.error], [23, 3, 3, null]);

  const corte = await flujo.copiarFotosDe({ copiarFotos: async () => { throw { status: 429, headers: { get: () => '0' } }; } }, ctx, productos, { ...rapido, maxIntentos: 1 });
  assert.equal(corte.lotesHechos, 0);
  assert.equal(corte.error.code, 'RATE_LIMITED');
});

test('avisoInventario: nada si todo cargó; el aviso nombra la cantidad sin datos del producto', () => {
  const t = (fallidas) => ({ inventario: { cargadas: 0, sinCargar: 0, fallidas } });
  assert.equal(flujo.avisoInventario(t([])), null);
  assert.match(flujo.avisoInventario(t([{ key: 'a', referencia: 'SECRETA-9', code: 'INVENTORY_FAILED' }])), /^Un producto quedó creado pero sin sus existencias/);
  assert.doesNotMatch(flujo.avisoInventario(t([{ key: 'a', referencia: 'SECRETA-9', code: 'X' }])), /SECRETA/);
  assert.match(flujo.avisoInventario(t([{}, {}])), /^2 productos quedaron/);
});

test('textos: conteos de la simulación sin ceros (salvo productos nuevos) y plan sin jerga', () => {
  const base = {
    formato: null, productos: { toCreate: 0, variants: 12 }, fotos: { validas: 5, rechazadas: 1, sobrantes: 2, porCopiar: 5 },
    categoriasNuevas: ['A'], inventario: { bodega: null, unidades: 0, reemplaza: 0 }, redirecciones: { generated: 4 },
    ofertas: { listaPublico: null, cantidad: 0, programadas: 0, vencidas: 0 }, plan: null, seo: { conSeo: 0, conAlt: 0 },
    clasesImpuesto: {}, guardas: [], avisos: [], avisosTotal: 0,
  };
  const c = textos.contadoresDeSimulacion(base);
  assert.equal(c[0].etiqueta, 'Productos nuevos');
  assert.equal(c[0].valor, 0);
  assert.deepEqual(c.map((x) => x.etiqueta), ['Productos nuevos', 'Variantes', 'Fotos válidas', 'Fotos que se copiarán a Katuq', 'Fotos que no se pueden traer', 'Categorías nuevas', 'Direcciones que se redirigen']);
  assert.equal(c.find((x) => x.etiqueta === 'Fotos que no se pueden traer').valor, 3);
  assert.equal(textos.mensajePlan(null), null);
  assert.equal(textos.mensajePlan({ visibleLimit: 50, hiddenAfterImport: 0 }), null);
  const m = textos.mensajePlan({ visibleLimit: 50, hiddenAfterImport: 30 });
  assert.match(m, /50 productos/);
  assert.match(m, /30 de los que traes/);
  assert.doesNotMatch(m, /hiddenAfterImport|TARGET_HIDDEN/);
});
