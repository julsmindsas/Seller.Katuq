'use strict';
/**
 * Paso de clientes (F5-30, F530-F04, tarea 9.4): lógica pura.
 *   node --test tests/migracion/clientes.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { clientes: c } = require('./_cargar');

const SHOP = 'First Name,Last Name,Email,Accepts Email Marketing,Phone,Default Address City,Accepts SMS Marketing,Note,Total Spent,Tags\n';
const fila = (i, extra = {}) => {
  const v = { n: `N${i}`, e: `c${i}@x.test`, acepta: 'yes', tel: `3001${String(i).padStart(6, '0')}`, ...extra };
  return `${v.n},Ap,${v.e},${v.acepta},${v.tel},Bogotá,no,nota privada ${i},999,vip`;
};
const csv = (filas) => SHOP + filas.join('\n') + '\n';

test('detecta Shopify y WooCommerce por tabla, sin preguntar por el proveedor en el código', () => {
  assert.equal(c.leerClientes(csv([fila(1)])).perfil.id, 'shopify');
  const woo = c.leerClientes('Name,Email,Phone\nAna Gómez,a@x.test,3001234567\n');
  assert.equal(woo.ok, true);
  assert.equal(woo.perfil.id, 'woocommerce');
  const fuente = fs.readFileSync(path.join(__dirname, '../../src/app/components/migracion-tienda/logica/clientes.ts'), 'utf8');
  assert.doesNotMatch(fuente.replace(/\/\*[\s\S]*?\*\//g, ''), /(proveedor|perfil\.id|source)\s*===?\s*['"](shopify|woocommerce)['"]/);
});

test('rechaza archivo vacío o de otro tipo', () => {
  assert.equal(c.leerClientes('').code, 'EMPTY');
  assert.equal(c.leerClientes('Handle,Title\nx,y\n').code, 'UNKNOWN_FORMAT');
});

test('solo salen las columnas conocidas: Note, gasto y etiquetas se quedan en el navegador', () => {
  const l = c.leerClientes(csv([fila(1)]));
  const claves = Object.keys(l.filas[0].data);
  for (const prohibida of ['Note', 'Total Spent', 'Tags']) assert.equal(claves.includes(prohibida), false);
  assert.ok(claves.includes('Email'));
  assert.equal(l.filas[0].row, 2);
});

test('el resumen cuenta, sin devolver datos personales', () => {
  const l = c.leerClientes(csv([
    fila(1),
    fila(2, { e: 'MAYUS@x.test' }),
    fila(3, { e: '', tel: '' }),
    fila(4, { e: 'c1@x.test', tel: '3009999999' }), // mismo correo que la 1
    fila(5, { e: '', tel: '+57 300 1000006' }), // mismo celular que la 6 (en otro formato)
    fila(6, { e: 'otro@x.test', tel: '3001000006', acepta: 'no' }),
  ]));
  assert.deepEqual(l.resumen, { total: 6, sinContacto: 1, repetidasEnArchivo: 2, correosConMayusculas: 1, aceptanCorreo: 3, conSmsOWhatsapp: 0 });
  assert.doesNotMatch(JSON.stringify(l.resumen), /@|3001/);
});

test('lotes de 500 filas y el cuerpo sigue el contrato', () => {
  const filas = Array.from({ length: 1203 }, (_, i) => ({ row: i + 2, data: { Email: `a${i}@x.test` } }));
  const lotes = c.lotesDeClientes(filas);
  assert.deepEqual(lotes.map((l) => l.length), [500, 500, 203]);
  const ctx = { migrationId: 'cli-abc-123456', proveedor: 'shopify', siteId: 'S1', declaracion: true, exportadoEn: '2026-10-01', filas };
  const b = c.cuerpoClientes(ctx, lotes[1], 2);
  assert.deepEqual(Object.keys(b).sort(), ['declaration', 'exportedAt', 'lot', 'migrationId', 'rows', 'siteId', 'source']);
  assert.equal(b.lot, 2);
  assert.equal(b.declaration, true);
});

test('la declaración parte sin marcar y WooCommerce nunca la envía', () => {
  const base = { migrationId: 'cli-abc-123456', siteId: 'S1', filas: [] };
  assert.equal(c.cuerpoClientes({ ...base, proveedor: 'shopify', declaracion: false }, [], 1).declaration, false);
  assert.equal(c.cuerpoClientes({ ...base, proveedor: 'woocommerce', declaracion: true }, [], 1).declaration, false);
  assert.equal(c.cuerpoClientes({ ...base, proveedor: 'shopify', declaracion: true, exportadoEn: 'ayer' }, [], 1).exportedAt, undefined);
});

const resp = (n, extra = {}) => ({ success: true, importBatchId: `m_c${n}`, created: 500, completed: 1, resumed: 0, skipped: 2,
  subscriptions: { created: 0, noConsent: 400, existing: 0, suppressed: 0, failed: 0 }, issues: [{ row: 5, code: 'NO_CONTACT' }], issuesTotal: 1, ...extra });

test('importa por lotes en orden, suma y reanuda desde el lote que falló', async () => {
  const filas = Array.from({ length: 1100 }, (_, i) => ({ row: i + 2, data: { Email: `a${i}@x.test` } }));
  const ctx = { migrationId: 'cli-abc-123456', proveedor: 'shopify', siteId: 'S1', declaracion: false, filas };
  const vistos = [];
  let falla = true;
  const envios = {
    importarClientes: async (cuerpo) => {
      vistos.push(cuerpo.lot);
      if (cuerpo.lot === 2 && falla) throw { status: 400, error: { code: 'INVALID_PAYLOAD' } };
      return resp(cuerpo.lot);
    },
  };
  const r1 = await c.importarClientesPorLotes(envios, ctx, { esperar: async () => {} });
  assert.deepEqual(vistos, [1, 2]);
  assert.equal(r1.siguiente, 1);
  assert.equal(r1.detenido.lote, 2);
  falla = false;
  const r2 = await c.importarClientesPorLotes(envios, ctx, { esperar: async () => {}, desde: r1.siguiente, previas: r1.respuestas });
  assert.deepEqual(vistos, [1, 2, 2, 3]);
  assert.equal(r2.detenido, null);
  const t = c.sumarClientes(r2.respuestas);
  assert.equal(t.lotes, 3);
  assert.equal(t.created, 1500);
  assert.deepEqual(t.batchIds, ['m_c1', 'm_c2', 'm_c3']);
  assert.equal(t.issuesTotal, 3);
});

test('IMPORT_IN_PROGRESS se espera y se reenvía el mismo lote', async () => {
  let n = 0;
  const esperas = [];
  const r = await c.importarClientesPorLotes(
    { importarClientes: async () => { if (n++ === 0) throw { status: 409, error: { code: 'IMPORT_IN_PROGRESS' } }; return resp(1); } },
    { migrationId: 'cli-abc-123456', proveedor: 'shopify', siteId: 'S1', declaracion: false, filas: [{ row: 2, data: { Email: 'a@x.test' } }] },
    { esperar: async (ms) => { esperas.push(ms); } },
  );
  assert.equal(r.detenido, null);
  assert.equal(esperas.length, 1);
});

test('avisos: bandera apagada, sin casilla, Woo y correos con mayúsculas; sin datos personales', () => {
  const t = c.sumarClientes([resp(1)]);
  const con = c.avisosDeClientes(t, { correosConMayusculas: 3 }, true, true);
  assert.ok(con.includes(c.AVISO_CONSENTIMIENTO_APAGADO));
  assert.ok(con.some((x) => /3 correos con mayúsculas en el archivo/.test(x)));
  assert.ok(c.avisosDeClientes(t, { correosConMayusculas: 0 }, false, true).some((x) => /Sin la casilla/.test(x)));
  assert.ok(c.avisosDeClientes(t, { correosConMayusculas: 0 }, true, false).includes(c.AVISO_WOO_SIN_CONSENTIMIENTO));
  const creadas = c.sumarClientes([resp(1, { subscriptions: { created: 300, noConsent: 100, existing: 0, suppressed: 0, failed: 0 } })]);
  assert.equal(c.avisosDeClientes(creadas, { correosConMayusculas: 0 }, true, true).length, 0);
});

test('resumen del reporte: creados, completados, omitidos', () => {
  const l = c.resumenDeClientes(c.sumarClientes([resp(1)]));
  assert.deepEqual(l.slice(0, 3).map((x) => [x.etiqueta, x.valor]), [['Clientes nuevos', 500], ['Clientes que ya tenías y se completaron', 1], ['Filas omitidas', 2]]);
  assert.equal(c.textoCodigo('NO_CONTACT'), 'Sin correo ni celular');
});

test('deshacer un lote: respuesta, 404 y texto de lo conservado', async () => {
  const ok = await c.deshacerLote({ deshacerClientes: async (id) => ({ success: true, clientsDeleted: 410, clientsKept: 2, subscribersDeleted: 290, subscribersKept: 10, id }) }, 'm_c1');
  assert.equal(ok.ok, true);
  assert.match(c.textoDeshecho(ok.respuesta), /Quitamos 410 clientes y 290 suscripciones\..*Conservamos 2 clientes.*Conservamos 10 suscripciones/);
  const llamadas = [];
  const no = await c.deshacerLote({ deshacerClientes: async () => { llamadas.push(1); throw { status: 404, error: { code: 'BATCH_NOT_FOUND' } }; } }, 'm_c9', { esperar: async () => {} });
  assert.equal(no.ok, false);
  assert.equal(no.error.code, 'BATCH_NOT_FOUND');
  assert.equal(llamadas.length, 1);
});

test('el servicio y la pantalla usan las rutas del contrato y BaseService', () => {
  const base = path.join(__dirname, '../../src/app/components/migracion-tienda/');
  const svc = fs.readFileSync(base + 'migracion-tienda.service.ts', 'utf8');
  assert.match(svc, /extends BaseService/);
  assert.match(svc, /customers\/\$\{encodeURIComponent\(batchId\)\}/);
  const pantalla = fs.readFileSync(base + 'pasos/paso-clientes.component.ts', 'utf8');
  assert.match(pantalla, /Swal\.fire/);
  assert.match(pantalla, /Deshacer este lote/);
  assert.doesNotMatch(pantalla, /HttpClient|console\./);
  assert.match(pantalla, /declaracion = false;/);
});

test('sin degradados ni primarios prohibidos en los archivos nuevos', () => {
  const base = path.join(__dirname, '../../src/app/components/migracion-tienda/');
  const txt = fs.readFileSync(base + 'pasos/paso-clientes.component.ts', 'utf8') + fs.readFileSync(base + 'logica/clientes.ts', 'utf8');
  assert.doesNotMatch(txt, /(linear|radial)-gradient\(/);
  assert.doesNotMatch(txt, /#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)/i);
  assert.doesNotMatch(txt, /class="[^"]*\bp-/);
});
