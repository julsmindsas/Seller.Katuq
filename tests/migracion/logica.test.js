'use strict';
/**
 * Importador de tiendas (F5-30, F530-F01, tarea 8.1): lógica pura del front.
 *   node --test tests/migracion/logica.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { csv, imp, lotes, errores, sumas, reporte, acceso } = require('./_cargar');

// ---------- CSV ----------
test('CSV: comillas escapadas, comas y saltos dentro de la celda, CRLF y BOM', () => {
  const texto = '﻿Handle,Title,Body (HTML)\r\ngorra,"Gorra ""pro"", azul","<p>uno</p>\n<p>dos</p>"\r\nvela,Vela,\r\n';
  const a = csv.leerCsv(texto);
  assert.deepEqual(a.encabezados, ['Handle', 'Title', 'Body (HTML)']);
  assert.equal(a.filas.length, 2);
  assert.equal(a.filas[0].valores.Title, 'Gorra "pro", azul');
  assert.equal(a.filas[0].valores['Body (HTML)'], '<p>uno</p>\n<p>dos</p>');
  assert.equal(a.filas[1].valores['Body (HTML)'], '');
});

test('CSV: _row cuenta registros (encabezado = 1), no líneas físicas', () => {
  const a = csv.leerCsv('h,t\r\na,"x\ny\nz"\r\nb,2\r\n\r\nc,3');
  assert.deepEqual(a.filas.map((f) => f._row), [2, 3, 4]);
});

test('CSV: sin salto final, vacío y comilla sin cerrar no pierden filas', () => {
  assert.equal(csv.leerCsv('').filas.length, 0);
  assert.equal(csv.leerCsv('a,b\n1,2').filas.length, 1);
  assert.equal(csv.leerCsv('a,b\n1,"2').filas[0].valores.b, '2');
});

test('CSV: los ceros del código de barras se conservan como texto', () => {
  assert.equal(csv.leerCsv('a,b\n0001234,x').filas[0].valores.a, '0001234');
});

// ---------- Detección ----------
const ACTUAL = 'Title,URL handle,Description,Price,Charge tax,Option1 name,Option1 value,Product image URL,Image position,Customer notes\n';
const ANTERIOR = 'Handle,Title,Body (HTML),Variant Price,Variant Taxable,Option1 Name,Option1 Value,Image Src,Image Position\n';

test('detección: Shopify actual, anterior y mixto', () => {
  assert.equal(imp.detectarArchivo(csv.leerCsv(ACTUAL).encabezados).formato, 'current');
  assert.equal(imp.detectarArchivo(csv.leerCsv(ANTERIOR).encabezados).formato, 'legacy');
  const d = imp.detectarArchivo(['Title', 'URL handle', 'Variant Price', 'Body (HTML)', 'Price']);
  assert.equal(d.perfil.id, 'shopify');
  assert.equal(d.formato, 'mixed');
});

test('detección: WooCommerce en inglés y en español; archivo desconocido', () => {
  const en = imp.detectarArchivo(['ID', 'Type', 'SKU', 'Name', 'Regular price', 'Parent']);
  assert.equal(en.perfil.id, 'woocommerce');
  assert.equal(en.idioma, 'en');
  const es = imp.detectarArchivo(['ID', 'Tipo', 'Nombre', 'Precio normal']);
  assert.equal(es.perfil.id, 'woocommerce');
  assert.equal(es.idioma, 'es');
  assert.equal(imp.detectarArchivo(['Nombre', 'Correo', 'Teléfono']).perfil, null);
});

test('detección: ignora mayúsculas y espacios de más en los encabezados', () => {
  assert.equal(imp.detectarArchivo(['  TITLE ', 'url  HANDLE', 'price']).perfil.id, 'shopify');
});

// ---------- Agrupación ----------
test('agrupación Shopify: filas de imagen y de variante quedan con su producto; no sale lo desconocido', () => {
  const texto = ACTUAL +
    'Camiseta,camiseta,Algodón,50000,TRUE,Talla,S,https://x/1.jpg,1,secreto@correo.com\n' +
    ',camiseta,,50000,TRUE,Talla,M,https://x/2.jpg,2,\n' +
    ',camiseta,,,,,,https://x/3.jpg,3,\n' +
    'Gorra,gorra,Gorra,20000,TRUE,,,,,\n' +
    'Sin clave,,,1,,,,,,\n';
  const r = imp.leerTienda(texto);
  assert.equal(r.ok, true);
  assert.deepEqual(r.grupos.map((g) => [g.key, g.rows.length]), [['camiseta', 3], ['gorra', 1]]);
  assert.deepEqual(r.filasSinClave, [6]);
  assert.equal(r.grupos[0].rows[2]._row, 4);
  // Columna que el servidor no conoce: no sale del navegador.
  assert.ok(!JSON.stringify(r.grupos).includes('secreto@correo.com'));
  assert.ok(!('Customer notes' in r.grupos[0].rows[0]));
});

test('agrupación Shopify: el formato anterior agrupa por Handle', () => {
  const r = imp.leerTienda(ANTERIOR + 'a,A,x,10,TRUE,Talla,S,,\na,,,10,TRUE,Talla,M,,\n');
  assert.equal(r.formato, 'legacy');
  assert.deepEqual(r.grupos.map((g) => [g.key, g.rows.length]), [['a', 2]]);
});

const WOO = 'ID,Type,SKU,Name,Regular price,Parent\n';
test('agrupación WooCommerce: variaciones por id:<ID> y por SKU del padre; huérfana aparte', () => {
  const texto = WOO +
    '10,variable,CAM,Camisa,,\n' +
    '11,variation,CAM-S,,50000,id:10\n' +
    '12,variation,CAM-M,,50000,CAM\n' +
    '20,simple,VEL,Vela,25000,\n' +
    '30,variation,X-1,,1000,SKU-INEXISTENTE\n';
  const r = imp.leerTienda(texto);
  assert.equal(r.perfil.id, 'woocommerce');
  assert.deepEqual(r.grupos.map((g) => [g.key, g.rows.length]), [['10', 3], ['20', 1], ['orphan:SKU-INEXISTENTE', 1]]);
});

test('agrupación WooCommerce: tipo en español «Variación» también se une', () => {
  const r = imp.leerTienda('ID,Tipo,Referencia,Nombre,Precio normal,Superior\n1,variable,P,Prenda,,\n2,Variación,P-1,,5,id:1\n');
  assert.deepEqual(r.grupos.map((g) => [g.key, g.rows.length]), [['1', 2]]);
});

// ---------- Inventario ----------
const INV_ESTADOS = 'Handle,Title,Option1 Name,Option1 Value,SKU,Location,Available (not editable),On hand (current)\n';
test('inventario: se une por «URL handle» o «Handle», sin importar mayúsculas', () => {
  const productos = ACTUAL + 'Camiseta,camiseta,x,5,TRUE,Talla,S,,,\n' + 'Gorra,gorra,x,5,TRUE,,,,,\n';
  const inv = INV_ESTADOS + 'Camiseta,Camiseta,Talla,S,CAM-S,Bodega,7,7\n' + 'GORRA,Gorra,,,GOR,Bodega,2,2\n' + 'fantasma,F,,,F,Bodega,1,1\n';
  const r = imp.leerTienda(productos, inv);
  assert.equal(r.ok, true);
  assert.equal(r.inventario.unidas, 2);
  assert.equal(r.inventario.sinProducto, 1);
  assert.equal(r.grupos[0].inventoryRows[0]['Available (not editable)'], '7');
  assert.equal(r.grupos[1].inventoryRows.length, 1);
  // «On hand» no se envía: incluye lo comprometido.
  assert.ok(!('On hand (current)' in r.grupos[0].inventoryRows[0]));
});

test('inventario: el inventario con «URL handle» y «Option 1 Value» (con espacio) también une', () => {
  const productos = ACTUAL + 'Camiseta,camiseta,x,5,TRUE,Talla,S,,,\n';
  const r = imp.leerTienda(productos, 'URL handle,Option 1 Name,Option 1 Value,Location,Available\ncamiseta,Talla,S,Bodega,4\n');
  assert.equal(r.ok, true);
  assert.equal(r.grupos[0].inventoryRows[0]['Option 1 Value'], 'S');
});

test('inventario: se rechaza de entrada el export «Available» (una columna por ubicación)', () => {
  const productos = ACTUAL + 'Camiseta,camiseta,x,5,TRUE,Talla,S,,,\n';
  const r = imp.leerTienda(productos, 'Handle,Title,Option1 Name,Option1 Value,SKU,Bodega principal,Tienda centro\ncamiseta,C,Talla,S,CAM-S,3,4\n');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'INVENTORY_FORMAT_UNSUPPORTED');
  assert.match(r.message, /por estados/);
});

test('inventario: sin columna Handle y en plataforma sin CSV de inventario también se rechaza', () => {
  const productos = ACTUAL + 'Camiseta,camiseta,x,5,TRUE,Talla,S,,,\n';
  assert.equal(imp.leerTienda(productos, 'SKU,Available\nA,1\n').code, 'INVENTORY_UNKNOWN_FORMAT');
  assert.equal(imp.leerTienda(WOO + '1,simple,A,A,5,\n', INV_ESTADOS + 'a,A,,,A,B,1,1\n').code, 'INVENTORY_NOT_SUPPORTED');
});

test('archivo desconocido: se rechaza sin agrupar nada', () => {
  const r = imp.leerTienda('Nombre,Correo\nAna,a@b.co\n');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'UNKNOWN_FORMAT');
});

// ---------- Sin if por proveedor ----------
test('sin «if» por proveedor: el código de lógica no pregunta por shopify ni woocommerce', () => {
  const dir = path.join(__dirname, '../../src/app/components/migracion-tienda');
  for (const f of ['logica/importacion.ts', 'logica/lotes.ts', 'logica/errores.ts', 'logica/sumas.ts', 'logica/reporte.ts', 'logica/csv.ts', 'logica/acceso.ts', 'migracion-tienda.service.ts', 'migracion-tienda.guard.ts']) {
    const codigo = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/['"`](shopify|woocommerce)['"`]/i.test(codigo), `${f} nombra un proveedor`);
    assert.ok(!/\.id\s*===?\s*['"]/.test(codigo), `${f} compara el id del perfil`);
  }
});

// ---------- Lotes ----------
const grupo = (key, filas, inv = 0) => ({
  key,
  rows: Array.from({ length: filas }, (_, i) => ({ _row: i + 2 })),
  inventoryRows: Array.from({ length: inv }, (_, i) => ({ _row: i + 2 })),
});

test('lotes: 25 grupos por lote y ningún producto se parte', () => {
  const grupos = Array.from({ length: 60 }, (_, i) => grupo(`p${i}`, 3, 1));
  const { lotes: ls, sobrantes } = lotes.armarLotes(grupos);
  assert.deepEqual(ls.map((l) => l.length), [25, 25, 10]);
  assert.equal(sobrantes.length, 0);
  const vistos = ls.flat().map((g) => g.key);
  assert.equal(new Set(vistos).size, 60);
  for (const l of ls) for (const g of l) assert.equal(g.rows.length, 3);
});

test('lotes: un producto de más de 2.500 filas no se parte: queda como sobrante', () => {
  const { lotes: ls, sobrantes } = lotes.armarLotes([grupo('a', 2000, 500), grupo('enorme', 2400, 101), grupo('b', 1)]);
  assert.deepEqual(sobrantes, [{ key: 'enorme', filas: 2501, motivo: 'TOO_MANY_ROWS' }]);
  assert.deepEqual(ls.map((l) => l.map((g) => g.key)), [['a', 'b']]);
});

test('lotes: el tope de filas por envío cierra el lote antes de los 25 grupos', () => {
  const grupos = Array.from({ length: 50 }, (_, i) => grupo(`p${i}`, 2500));
  const { lotes: ls } = lotes.armarLotes(grupos, { maxGrupos: 25, maxFilasPorGrupo: 2500, maxFilasTotales: 100000 });
  assert.ok(ls.every((l) => l.length <= 25));
  assert.ok(ls.every((l) => l.reduce((s, g) => s + lotes.filasDelGrupo(g), 0) <= 100000));
  assert.equal(ls.flat().length, 50);
});

test('lotes: simulación de hasta 2.000 productos por envío y partirEn', () => {
  const grupos = Array.from({ length: 2001 }, (_, i) => grupo(`p${i}`, 1));
  assert.deepEqual(lotes.armarLotes(grupos, lotes.LIMITES_SIMULACION).lotes.map((l) => l.length), [2000, 1]);
  assert.deepEqual(lotes.partirEn([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

// ---------- Errores y reintento ----------
const http = (status, code, message, retryAfter) => ({ status, error: code ? { success: false, code, message } : null, headers: { get: () => (retryAfter === undefined ? null : String(retryAfter)) } });

test('errores: clasifica los códigos del contrato', () => {
  const c = errores.clasificarError;
  assert.deepEqual([c(http(409, 'IMPORT_IN_PROGRESS')).retryable, c(http(409, 'IMPORT_IN_PROGRESS')).blocking], [true, false]);
  assert.equal(c(http(429, 'RATE_LIMITED')).retryable, true);
  assert.equal(c(http(429, undefined)).code, 'RATE_LIMITED');
  for (const code of ['WOO_INTEGRATION_ACTIVE', 'FLOW_PUBLISHES_PRODUCTS', 'CATEGORY_TREE_UNREADABLE', 'WAREHOUSE_INVALID']) {
    const e = c(http(409, code));
    assert.deepEqual([e.code, e.retryable, e.blocking], [code, false, true]);
  }
  assert.equal(c({ status: 0 }).code, 'NETWORK');
  assert.equal(c(http(502, undefined)).code, 'SERVER');
  assert.equal(c(null).code, 'NETWORK');
  assert.equal(c(http(409, 'WOO_INTEGRATION_ACTIVE', 'Mensaje del servidor')).message, 'Mensaje del servidor');
  assert.equal(c(http(429, 'RATE_LIMITED', undefined, 7)).retryAfterMs, 7000);
});

test('reintento: IMPORT_IN_PROGRESS espera y reenvía el mismo lote', async () => {
  const esperas = [];
  let llamadas = 0;
  const r = await errores.enviarConReintento(async () => {
    llamadas++;
    if (llamadas < 3) throw http(409, 'IMPORT_IN_PROGRESS');
    return { replayed: true };
  }, { esperar: async (ms) => esperas.push(ms) });
  assert.equal(r.ok, true);
  assert.equal(r.intentos, 3);
  assert.deepEqual(esperas, [2000, 4000]);
});

test('reintento: una guarda no se reintenta; los intentos se agotan', async () => {
  let n = 0;
  const g = await errores.enviarConReintento(async () => { n++; throw http(409, 'WOO_INTEGRATION_ACTIVE'); }, { esperar: async () => {} });
  assert.deepEqual([g.ok, g.intentos, n, g.error.blocking], [false, 1, 1, true]);
  n = 0;
  const a = await errores.enviarConReintento(async () => { n++; throw { status: 0 }; }, { maxIntentos: 3, esperar: async () => {} });
  assert.deepEqual([a.ok, a.intentos, n], [false, 3, 3]);
});

test('reintento: RATE_LIMITED respeta Retry-After y avisa antes de esperar', async () => {
  const avisos = [];
  let n = 0;
  const r = await errores.enviarConReintento(async () => { n++; if (n === 1) throw http(429, 'RATE_LIMITED', undefined, 12); return 'ok'; },
    { esperar: async () => {}, alEsperar: (e, i, ms) => avisos.push([e.code, i, ms]) });
  assert.equal(r.ok, true);
  assert.deepEqual(avisos, [['RATE_LIMITED', 1, 12000]]);
});

test('procesarLotes: se detiene en el lote que falla y se reanuda desde ahí con lo ya hecho', async () => {
  const enviados = [];
  let falla = true;
  const enviar = async (lote, numero) => {
    enviados.push(numero);
    if (numero === 2 && falla) throw http(409, 'FLOW_PUBLISHES_PRODUCTS');
    return { lot: numero };
  };
  const a = await errores.procesarLotes(['a', 'b', 'c'], enviar, { esperar: async () => {} });
  assert.equal(a.siguiente, 1);
  assert.equal(a.detenido.lote, 2);
  assert.equal(a.detenido.error.code, 'FLOW_PUBLISHES_PRODUCTS');
  falla = false;
  const b = await errores.procesarLotes(['a', 'b', 'c'], enviar, { esperar: async () => {}, desde: a.siguiente, previas: a.respuestas });
  assert.equal(b.detenido, null);
  assert.deepEqual(b.respuestas.map((r) => r.lot), [1, 2, 3]);
  assert.deepEqual(enviados, [1, 2, 2, 3]);
});

// ---------- Sumas ----------
const lote = (n, extra = {}) => ({
  success: true, migrationId: 'm', lot: n, replayed: false,
  products: [{ key: `p${n}`, row: n + 1, action: 'created', cd: 'x', referencia: `R${n}` }, { key: `q${n}`, row: n + 2, action: 'skipped', reason: 'EXISTS' }],
  inventory: { loaded: 2, notLoaded: 1, failed: [{ key: `p${n}`, referencia: `R${n}`, code: 'INVENTORY_FAILED' }] },
  photos: { valid: 10, rejected: 1, overLimit: 2 }, photosPending: 8, categories: { created: ['Ropa', `C${n}`] },
  offers: { loaded: 1, kept: 0, skipped: 0 }, issues: [{ row: n + 1, key: `p${n}`, code: 'PRICE_PER_VARIANT' }], issuesTotal: 1,
  ...extra,
});

test('suma de lotes: conteos, categorías sin repetir, avisos y lotes repetidos', () => {
  const t = sumas.sumarLotes([lote(1), lote(2, { replayed: true })]);
  assert.deepEqual([t.creados, t.omitidos, t.omitidosPorMotivo.EXISTS, t.lotesRepetidos], [2, 2, 2, 1]);
  assert.deepEqual(t.inventario.cargadas, 4);
  assert.deepEqual(t.inventario.fallidas.length, 2);
  assert.deepEqual(t.fotos, { validas: 20, rechazadas: 2, sobrantes: 4, porCopiar: 16 });
  assert.deepEqual(t.categoriasCreadas, ['Ropa', 'C1', 'C2']);
  assert.equal(t.avisosTotal, 2);
  assert.equal(t.ofertas.cargadas, 2);
});

test('suma de simulaciones: contadores, guardas sin repetir y capacidad sin sumar', () => {
  const s = (extra) => ({ success: true, migrationId: 'm', format: 'current', products: { total: 2, toCreate: 2 }, photos: { valid: 3, toCopy: 3 }, redirects: { generated: 5, capacity: 500 }, guards: [{ code: 'WOO_INTEGRATION_ACTIVE', message: 'x' }], ...extra });
  const t = sumas.sumarSimulaciones([s(), s({ format: 'legacy' })]);
  assert.equal(t.productos.total, 4);
  assert.equal(t.formato, 'mixed');
  assert.equal(t.redirecciones.generated, 10);
  assert.equal(t.redirecciones.capacity, 500);
  assert.equal(t.guardas.length, 1);
  assert.equal(t.fotos.porCopiar, 6);
});

// ---------- Reporte ----------
test('reporte CSV: fila, producto, resultado y motivo; sin correos, teléfonos ni direcciones', () => {
  const t = sumas.sumarLotes([lote(1, {
    products: [
      { key: 'gorra', row: 2, action: 'created', referencia: 'G-1', email: 'ana@correo.com', telefono: '+573001234567', direccion: 'Calle 1 # 2-3' },
      { key: '=cmd|calc', row: 3, action: 'skipped', reason: 'EXISTS' },
      { key: 'ana@correo.com', row: 4, action: 'skipped', reason: 'INVALID' },
    ],
    issues: [{ row: 2, key: 'gorra', code: 'PHOTO_REJECTED', message: 'Escríbele a ana@correo.com' }],
    inventory: { loaded: 0, notLoaded: 0, failed: [{ key: 'gorra', code: 'INVENTORY_FAILED' }] },
  })]);
  const texto = reporte.reporteCsv(t);
  assert.ok(texto.startsWith('﻿Fila,Producto,Referencia,Resultado,Motivo,Detalle'));
  for (const prohibido of ['ana@correo.com', '3001234567', 'Calle 1', 'Escríbele']) assert.ok(!texto.includes(prohibido), prohibido);
  assert.match(texto, /2,gorra,G-1,Creado,,/);
  assert.match(texto, /'=cmd\|calc/);
  assert.match(texto, /Omitido,EXISTS,Ya existe/);
  assert.match(texto, /,gorra,G-1,Error,INVENTORY_FAILED/);
  assert.match(texto, /Aviso,PHOTO_REJECTED/);
});

test('reporte CSV: celdas con comas y comillas se escapan', () => {
  assert.equal(reporte.limpiarCelda('a\nb'), 'a b');
  const t = sumas.sumarLotes([lote(1, { products: [{ key: 'a,"b"', row: 2, action: 'created' }], issues: [], inventory: undefined })]);
  assert.match(reporte.reporteCsv(t), /"a,""b"""/);
});

// ---------- Acceso ----------
test('acceso: bandera y rol administrador', () => {
  assert.equal(acceso.puedeTraerTienda(true, 'Administrador'), true);
  assert.equal(acceso.puedeTraerTienda(true, 'Super Administrador'), true);
  assert.equal(acceso.puedeTraerTienda(false, 'Administrador'), false);
  assert.equal(acceso.puedeTraerTienda(true, 'Vendedor'), false);
  assert.equal(acceso.puedeTraerTienda(true, undefined), false);
});
