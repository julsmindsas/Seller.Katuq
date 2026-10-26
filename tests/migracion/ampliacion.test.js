'use strict';
/**
 * Ampliación D-518 en pantalla (F5-30, F530-F03, tarea 14.16): clases de impuesto de WooCommerce,
 * base de las direcciones, direcciones pegadas, redirecciones de Woo, SEO del formulario y diseño.
 *   node --test tests/migracion/ampliacion.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { ampliacion: A, flujo, imp, sumas, seo } = require('./_cargar');

const raiz = path.join(__dirname, '../../src/app');
const leer = (...p) => fs.readFileSync(path.join(raiz, ...p), 'utf8');

// ── clases de impuesto ─────────────────────────────────────────────────────────────
test('clasesParaAsignar ordena, trae la tarifa elegida y marca las que faltan', () => {
  const c = A.clasesParaAsignar({ 'reduced-rate': 9, alimentos: 3 }, { alimentos: 5 });
  assert.deepEqual(c, [
    { clase: 'alimentos', productos: 3, tarifa: 5 },
    { clase: 'reduced-rate', productos: 9, tarifa: null },
  ]);
  assert.equal(A.clasesSinAsignar(c).length, 1);
  assert.match(A.textoClasesSinAsignar(c), /^9 producto/);
  assert.equal(A.textoClasesSinAsignar([{ clase: 'x', productos: 1, tarifa: 0 }]), null);
});

test('mapaDeClases solo deja tarifas 0, 5 o 19; el 0 vale', () => {
  assert.deepEqual(A.mapaDeClases({ a: 0, b: 5, c: 19, d: 16, e: '5', f: null }), { a: 0, b: 5, c: 19 });
  assert.equal(A.mapaDeClases({ d: 16 }), undefined);
  assert.equal(A.mapaDeClases({}), undefined);
});

test('opcionesDe lleva taxClassMap solo si hay clases asignadas', () => {
  const base = { ...flujo.CONFIG_INICIAL, sitioId: 'S1', preciosConIva: true };
  assert.equal('taxClassMap' in flujo.opcionesDe(base, false), false);
  assert.deepEqual(flujo.opcionesDe({ ...base, clasesIva: { 'reduced-rate': 5 } }, false).taxClassMap, { 'reduced-rate': 5 });
  assert.deepEqual(flujo.CONFIG_INICIAL.clasesIva, {});
});

test('las clases salen de la suma de simulaciones', () => {
  const t = sumas.sumarSimulaciones([{ products: {}, taxClasses: [{ class: 'reduced-rate', products: 9, mapped: null }] }, { products: {}, taxClasses: [{ class: 'reduced-rate', products: 1, mapped: null }] }]);
  assert.deepEqual(A.clasesParaAsignar(t.clasesImpuesto, {}), [{ clase: 'reduced-rate', productos: 10, tarifa: null }]);
});

// ── base de las direcciones ────────────────────────────────────────────────────────
test('baseDeEjemplo: de una dirección real saca la base', () => {
  assert.equal(A.baseDeEjemplo('https://mitienda.com/producto/camisa-azul/'), '/producto/');
  assert.equal(A.baseDeEjemplo('/product/camisa?utm=1#x'), '/product/');
  assert.equal(A.baseDeEjemplo('http://x.co/tienda/producto/camisa'), '/tienda/producto/');
  assert.equal(A.baseDeEjemplo('/camisa'), null);
});

test('rutas peligrosas se rechazan: otro host, esquema, doble barra, punto punto, espacios', () => {
  for (const mala of ['//evil.com/p/x', 'javascript:alert(1)', 'ftp://x/a/b', '/a//b', '/a/../b', '/a b/c', '<script>', '', null, undefined]) {
    assert.equal(A.rutaDeDireccion(mala), null, String(mala));
  }
  for (const mala of ['//evil.com/', 'https://evil.com', '/../x/', 'a b']) assert.equal(A.normalizarBase(mala), null, mala);
  assert.equal(A.normalizarBase('producto'), '/producto/');
  assert.equal(A.normalizarBase(' /categoria-producto '), '/categoria-producto/');
  assert.equal(A.normalizarBase(''), null);
});

test('slugProbable es la regla de WordPress, igual que la del servidor', () => {
  assert.equal(A.slugProbable("Men's Shirt"), 'mens-shirt');
  assert.equal(A.slugProbable('Camisa Azul – Talla M'), 'camisa-azul-talla-m');
  assert.equal(A.slugProbable('Ñandú  ÁÉ'), 'nandu-ae');
  assert.equal(A.slugProbable('  '), '');
});

test('leerDireccionesPegadas: una por línea, sin repetidas ni ajenas, con conteo', () => {
  const l = A.leerDireccionesPegadas(['https://t.co/producto/camisa-azul/', '/producto/camisa-azul', '//evil.com/x/y', 'texto suelto', '', '/producto/gorra?x=1'].join('\n'));
  assert.deepEqual(l.validas, [{ desde: '/producto/camisa-azul', slug: 'camisa-azul' }, { desde: '/producto/gorra', slug: 'gorra' }]);
  assert.equal(l.invalidas, 2);
  assert.equal(A.baseSugeridaPorDirecciones(l), '/producto/');
  const muchas = Array.from({ length: A.MAX_DIRECCIONES_PEGADAS + 5 }, (_, i) => `/producto/p${i}`).join('\n');
  const m = A.leerDireccionesPegadas(muchas);
  assert.equal(m.validas.length, A.MAX_DIRECCIONES_PEGADAS);
  assert.equal(m.sobrantes, 5);
});

// ── redirecciones de WooCommerce ───────────────────────────────────────────────────
const CSV_WOO = 'ID,Type,SKU,Name,Regular price,Published,Categories,Images\n10,simple,A1,Camisa Azul,50000,1,Ropa,https://x.test/a.jpg\n11,simple,A2,Gorra,30000,1,Ropa,https://x.test/b.jpg\n';
function ctxWoo(config) {
  const l = imp.leerTienda(CSV_WOO);
  assert.equal(l.ok, true);
  assert.equal(l.perfil.id, 'woocommerce');
  return { migrationId: 'mig-prueba-1', runId: 'run-prueba-1', proveedor: 'woocommerce', config: { ...flujo.CONFIG_INICIAL, sitioId: 'S1', preciosConIva: true, ...config }, hayInventario: false, grupos: l.grupos, perfil: l.perfil, idioma: l.idioma };
}
const lote = (grupos) => grupos.map((g, i) => ({ key: g.key, action: 'created', cd: `cd${i + 1}` }));

test('Woo sin base confirmada: ninguna redirección', () => {
  const ctx = ctxWoo({ baseProductos: '/producto/' });
  assert.equal(flujo.puedeRedirigir(ctx), false);
  assert.deepEqual(flujo.cuerposRedirecciones(ctx, lote(ctx.grupos)), []);
  const sinBase = ctxWoo({ baseConfirmada: true });
  assert.equal(flujo.puedeRedirigir(sinBase), false);
});

test('Woo con base confirmada: handle = dirección probable, con las bases y marcada probable', () => {
  const ctx = ctxWoo({ baseProductos: '/producto/', baseCategorias: '/categoria-producto/', baseConfirmada: true });
  const [c] = flujo.cuerposRedirecciones(ctx, lote(ctx.grupos));
  assert.deepEqual(c.products, [{ handle: 'camisa-azul', cd: 'cd1', probable: true }, { handle: 'gorra', cd: 'cd2', probable: true }]);
  assert.equal(c.productBase, '/producto/');
  assert.equal(c.categoryBase, '/categoria-producto/');
  assert.equal(c.source, 'woocommerce');
  assert.equal('urls' in c, false);
});

test('Woo con direcciones pegadas: urls solo de productos traídos y a su cd', () => {
  const ctx = ctxWoo({ baseProductos: '/producto/', baseConfirmada: true, direccionesTexto: 'https://t.co/producto/camisa-azul/\n/producto/no-existe/' });
  const [c] = flujo.cuerposRedirecciones(ctx, lote(ctx.grupos));
  assert.deepEqual(c.urls, [{ desde: '/producto/camisa-azul', cd: 'cd1' }]);
  assert.equal('categoryBase' in c, false);
});

test('Woo: los productos partidos no generan redirección y un nombre repetido se envía una vez', () => {
  const ctx = ctxWoo({ baseProductos: '/producto/', baseConfirmada: true });
  const productos = [{ key: ctx.grupos[0].key, action: 'created', cd: 'c1' }, { key: ctx.grupos[0].key + '-2', action: 'created', cd: 'c2', splitFrom: ctx.grupos[0].key }, { key: ctx.grupos[0].key, action: 'created', cd: 'c3' }];
  const [c] = flujo.cuerposRedirecciones(ctx, productos);
  assert.equal(c.products.length, 1);
  assert.equal(c.products[0].cd, 'c1');
});

test('Shopify sigue igual: sin bases, handle = key, sin probable', () => {
  const l = imp.leerTienda('Handle,Title,Variant Price,Variant Taxable\np1,Uno,10,true\n');
  const ctx = { migrationId: 'mig-prueba-1', runId: 'run-prueba-1', proveedor: 'shopify', config: { ...flujo.CONFIG_INICIAL, sitioId: 'S1' }, hayInventario: false, grupos: l.grupos, perfil: l.perfil, idioma: l.idioma };
  const [c] = flujo.cuerposRedirecciones(ctx, [{ key: 'p1', action: 'created', cd: 'c1' }]);
  assert.deepEqual(c.products, [{ handle: 'p1', cd: 'c1' }]);
  assert.equal('productBase' in c, false);
});

// ── textos ─────────────────────────────────────────────────────────────────────────
test('textos: formato, lista Público, fotos pendientes y aviso de la tienda anterior', () => {
  assert.match(A.textoFormato('legacy'), /anterior/);
  assert.match(A.textoFormato('mixed'), /mezcla/);
  assert.equal(A.textoFormato(null), null);
  assert.match(A.textoListaPublico('missing', 3), /no hay un tipo de cliente «Público»/);
  assert.match(A.textoListaPublico('ambiguous', 3), /varios/);
  assert.equal(A.textoListaPublico('missing', 0), null);
  assert.equal(A.textoListaPublico('found', 5), null);
  assert.equal(A.AVISO_NO_CERRAR_TIENDA, 'No cierres tu tienda anterior hasta que termine la copia de fotos.');
  assert.equal(A.textoFotosPendientes([{ migrationId: 'm1', photosPending: 0 }]), null);
  assert.equal(A.textoFotosPendientes([{ migrationId: 'm1', photosPending: 0 }, { migrationId: 'm2', photosPending: 7 }]).migrationId, 'm2');
  assert.match(A.textoBaseRedireccion('/producto/', false), /Supondremos/);
  assert.match(A.textoBaseRedireccion(null, false), /Escribe/);
});

// ── SEO del formulario de producto ─────────────────────────────────────────────────
test('SEO: límites 70 y 320, sin etiquetas; vacío no manda nada salvo que hubiera', () => {
  assert.equal(seo.SEO_MAX_TITULO, 70);
  assert.equal(seo.SEO_MAX_DESCRIPCION, 320);
  const r = seo.seoParaGuardar({ titulo: 'x'.repeat(100), descripcion: 'a<script>b</script>' }, false);
  assert.equal(r.seo.titulo.length, 70);
  assert.ok(!/[<>]/.test(r.seo.descripcion));
  assert.deepEqual(seo.seoParaGuardar({ titulo: '  ', descripcion: '' }, false), {});
  assert.deepEqual(seo.seoParaGuardar({ titulo: '', descripcion: '' }, true), { seo: {} });
  assert.deepEqual(seo.seoDeProducto({ seo: { titulo: 'T', descripcion: 'D' } }), { titulo: 'T', descripcion: 'D' });
  assert.deepEqual(seo.seoDeProducto({}), { titulo: '', descripcion: '' });
});

test('formulario de producto: el SEO no toca crearProducto y el alt de las fotos sigue donde estaba', () => {
  const ts = leer('components/productos/crear-productos/crear-productos.component.ts');
  const html = leer('components/productos/crear-productos/crear-productos.component.html');
  // el SEO es un grupo aparte: `crearProducto` conserva los mismos controles (el alt va dentro de las imágenes).
  const grupo = ts.slice(ts.indexOf('this.crearProducto = this.fb.group({'), ts.indexOf('this.seoForm = this.fb.group'));
  assert.ok(!/seo/i.test(grupo));
  assert.match(grupo, /imagenesPrincipales: \[""\]/);
  assert.match(ts, /this\.crearProducto\.patchValue\(this\.edit\.crearProducto\)/);
  assert.equal((ts.match(/\.\.\.this\.seoParaGuardar\(\)/g) || []).length, 2);
  assert.match(html, /formControlName="titulo"[^>]*seoMaxTitulo/s);
  assert.ok(!/\balt\b/.test(seo.seoParaGuardar.toString()));
  // un producto con alt: lo que viaja en crearProducto no se modifica por el SEO
  const edit = { crearProducto: { imagenesPrincipales: [{ url: 'u', alt: 'Una camisa' }] }, seo: { titulo: 'T' } };
  const cuerpo = { crearProducto: edit.crearProducto, ...seo.seoParaGuardar({ titulo: 'T2' }, true) };
  assert.equal(cuerpo.crearProducto.imagenesPrincipales[0].alt, 'Una camisa');
});

// ── diseño ─────────────────────────────────────────────────────────────────────────
test('diseño: sin degradados, sin primarios prohibidos y sin clases con «p-» en los archivos nuevos', () => {
  const prohibidos = /#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea|#3b82f6|#1d4ed8|#6366f1|#1976d2|#7366ff|rgba\(102,\s*126,\s*234/i;
  for (const f of ['components/migracion-tienda/pasos/ajustes-woo.component.ts', 'components/migracion-tienda/logica/ampliacion.ts', 'components/productos/crear-productos/seo-producto.ts']) {
    const s = leer(f);
    assert.ok(!/(linear|radial)-gradient\(/.test(s), f);
    assert.ok(!prohibidos.test(s), f);
    for (const m of s.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) assert.ok(!/p-/.test(c), `${f}: ${c}`);
  }
  const html = leer('components/productos/crear-productos/crear-productos.component.html');
  const bloque = html.slice(html.indexOf('[formGroup]="seoForm"'), html.indexOf('for="prodGarantias"'));
  for (const m of bloque.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) assert.ok(!/p-/.test(c) || c === 'mp-hint', c);
});

test('pantalla: avisos de fotos, lista Público y ajustes de Woo están conectados', () => {
  const dir = 'components/migracion-tienda/';
  assert.match(leer(dir + 'pasos/paso-importar.component.ts'), /avance\.etapa === 'fotos'/);
  assert.match(leer(dir + 'pasos/paso-reporte.component.ts'), /Copiar fotos pendientes/);
  assert.match(leer(dir + 'pasos/paso-subir.component.ts'), /Copiar fotos pendientes/);
  assert.match(leer(dir + 'pasos/paso-simular.component.ts'), /tiposCliente\.emit/);
  assert.match(leer(dir + 'migrar-tienda.component.ts'), /fotosPendientes\(\)/);
  assert.match(leer(dir + 'migrar-tienda.component.ts'), /\/proceso\/tipos-cliente/);
  assert.ok(!/HttpClient|MigracionTiendaService/.test(leer(dir + 'pasos/ajustes-woo.component.ts')));
});
