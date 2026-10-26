'use strict';
/**
 * Historial del producto (D-548, F1, tarea 6.3): funciones puras de la pantalla.
 * src/app/components/productos/historial-producto/historial-producto.util.ts
 *
 * Qué protege:
 *  1. Las horas salen en hora de Colombia (UTC−5), sin importar la zona del computador, y el día se
 *     decide en Colombia (cruce de la medianoche UTC).
 *  2. La hora lleva segundos y la fecha larga el formato de Listas de precios («23 oct 2026, 10:54 a. m.»).
 *  3. Pesos colombianos sin decimales, con puntos de miles; variación con signo y «−» (no «-»).
 *  4. El caso del ticket 1358: $42.621 → $78.291 (+$35.670, +83,7 %).
 *
 *   node --test tests/productos/historial-producto.util.test.js
 *   TZ=America/Los_Angeles node --test tests/productos/historial-producto.util.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const u = require('../../src/app/components/productos/historial-producto/historial-producto.util.ts');

const MENOS = '−';

test('el día se decide en hora de Colombia y no en UTC', () => {
  // 02:30 UTC del 24 de octubre = 9:30 p. m. del 23 en Colombia.
  assert.equal(u.claveDiaColombia('2026-10-24T02:30:00.000Z'), '2026-10-23');
  // 04:59:59 UTC todavía es el 23; 05:00:00 UTC ya es el 24 (medianoche de Colombia).
  assert.equal(u.claveDiaColombia('2026-10-24T04:59:59.000Z'), '2026-10-23');
  assert.equal(u.claveDiaColombia('2026-10-24T05:00:00.000Z'), '2026-10-24');
  assert.equal(u.claveDiaColombia('no es fecha'), 'sin-fecha');
  assert.equal(u.claveDiaColombia(null), 'sin-fecha');
});

test('título del día: HOY, AYER o el día de la semana en mayúscula', () => {
  const ahora = new Date('2026-10-26T18:00:00.000Z'); // lunes 26, 1:00 p. m. en Colombia
  assert.equal(u.etiquetaDia('2026-10-26T15:00:00.000Z', ahora), 'HOY');
  assert.equal(u.etiquetaDia('2026-10-25T20:00:00.000Z', ahora), 'AYER');
  assert.equal(u.etiquetaDia('2026-10-21T15:00:00.000Z', ahora), 'MIÉRCOLES 21 DE OCTUBRE');
  // Un cambio de las 8 p. m. del domingo (01:00 UTC del lunes) sigue siendo del domingo = AYER.
  assert.equal(u.etiquetaDia('2026-10-26T01:00:00.000Z', ahora), 'AYER');
  // Otro año: se dice el año.
  assert.equal(u.etiquetaDia('2025-12-31T15:00:00.000Z', ahora), 'MIÉRCOLES 31 DE DICIEMBRE DE 2025');
  assert.equal(u.etiquetaDia(null, ahora), 'SIN FECHA');
});

test('«HOY» a las 11 p. m. de Colombia, cuando en UTC ya es mañana', () => {
  const ahora = new Date('2026-10-27T04:30:00.000Z'); // domingo 26 a las 11:30 p. m. en Colombia
  assert.equal(u.etiquetaDia('2026-10-26T15:00:00.000Z', ahora), 'HOY');
});

test('hora con segundos y fecha completa en hora de Colombia', () => {
  assert.equal(u.horaConSegundos('2026-10-23T20:45:12.000Z'), '3:45:12 p. m.');
  assert.equal(u.horaConSegundos('2026-10-23T15:54:00.000Z'), '10:54:00 a. m.');
  assert.equal(u.horaConSegundos(null), '');
  // El caso del ticket 1358: «23 oct 2026, 10:54 a. m.».
  assert.equal(u.fechaHoraColombia('2026-10-23T15:54:00.000Z'), '23 oct 2026, 10:54 a. m.');
  assert.equal(u.fechaHoraColombia(''), '-');
  assert.equal(u.fechaHoraColombia('texto raro'), 'texto raro');
  assert.ok(!/[  ]/.test(u.fechaHoraColombia('2026-10-23T15:54:00.000Z')), 'sin espacios especiales');
});

test('pesos colombianos: sin decimales y con puntos de miles', () => {
  assert.equal(u.formatoCOP(42621), '$42.621');
  assert.equal(u.formatoCOP(78291), '$78.291');
  assert.equal(u.formatoCOP(1234567), '$1.234.567');
  assert.equal(u.formatoCOP('45296'), '$45.296');
  assert.equal(u.formatoCOP(0), '$0');
  assert.equal(u.formatoCOP(999.6), '$1.000');
  assert.equal(u.formatoCOP(-20000), `${MENOS}$20.000`);
  assert.equal(u.formatoCOP(null), '');
  assert.equal(u.formatoCOP('abc'), '');
});

test('variación con signo: «+» sube, «−» baja, y el porcentaje con coma', () => {
  assert.equal(u.diferenciaConSigno(35670), '+$35.670');
  assert.equal(u.diferenciaConSigno(-20000), `${MENOS}$20.000`);
  assert.equal(u.diferenciaConSigno(0), '$0');
  assert.equal(u.porcentajeConSigno(83.7), '+83,7 %');
  assert.equal(u.porcentajeConSigno(-12.5), `${MENOS}12,5 %`);
  assert.equal(u.porcentajeConSigno(0), '0 %');
  assert.equal(u.variacion(35670, 83.7), '+$35.670, +83,7 %');
  assert.equal(u.variacion(-20000, -10), `${MENOS}$20.000, ${MENOS}10,0 %`);
  // Antes en 0 o sin precio: el servidor no manda porcentaje.
  assert.equal(u.variacion(5000, null), '+$5.000');
  assert.equal(u.variacion(null, null), '');
});

test('la línea de un precio: GCJ1236 de $42.621 a $78.291', () => {
  const p = { tipo: 'customer_type', etiqueta: 'Precio Modelos', antes: 42621, despues: 78291, antesConIva: 42621, despuesConIva: 78291, diferencia: 35670, porcentaje: 83.7 };
  assert.equal(u.lineaPrecio(p), '$42.621 → $78.291 (+$35.670, +83,7 %)');
  assert.equal(u.sentidoPrecio(p), 'sube');
  // GCJ1236C: +$19.867, +43,9 %.
  const c = { ...p, antes: 45296, despues: 65163, antesConIva: 45296, despuesConIva: 65163, diferencia: 19867, porcentaje: 43.9 };
  assert.equal(u.lineaPrecio(c), '$45.296 → $65.163 (+$19.867, +43,9 %)');
});

test('la línea de un precio usa el valor con IVA cuando existe y, si no, el de sin IVA', () => {
  const conIva = { tipo: 'base', etiqueta: 'Precio unitario', antes: 100000, despues: 120000, antesConIva: 119000, despuesConIva: 142800, diferencia: 23800, porcentaje: 20 };
  assert.equal(u.lineaPrecio(conIva), '$119.000 → $142.800 (+$23.800, +20,0 %)');
  const sinIva = { ...conIva, antesConIva: null, despuesConIva: null, diferencia: 20000 };
  assert.equal(u.lineaPrecio(sinIva), '$100.000 → $120.000 (+$20.000, +20,0 %)');
});

test('un precio quitado o nuevo dice «Sin precio»; una baja usa «−»', () => {
  const quitado = { tipo: 'customer_type', etiqueta: 'Precio Modelos', antes: 42621, despues: null, antesConIva: 42621, despuesConIva: null, diferencia: null, porcentaje: null };
  assert.equal(u.lineaPrecio(quitado), '$42.621 → Sin precio');
  assert.equal(u.sentidoPrecio(quitado), 'cambia');
  const nuevo = { ...quitado, antes: null, antesConIva: null, despues: 50000, despuesConIva: 50000 };
  assert.equal(u.lineaPrecio(nuevo), 'Sin precio → $50.000');
  const baja = { tipo: 'cost', etiqueta: 'Costo', antes: 45000, despues: 30000, antesConIva: null, despuesConIva: null, diferencia: -15000, porcentaje: -33.3 };
  assert.equal(u.lineaPrecio(baja), `$45.000 → $30.000 (${MENOS}$15.000, ${MENOS}33,3 %)`);
  assert.equal(u.sentidoPrecio(baja), 'baja');
});

test('valores de un dato: vacío, sí/no y porcentaje', () => {
  assert.equal(u.textoValor(null), 'Sin dato');
  assert.equal(u.textoValor(''), 'Sin dato');
  assert.equal(u.textoValor(true), 'Sí');
  assert.equal(u.textoValor('Agotado'), 'Agotado');
  assert.equal(u.textoValor(19, 'porcentaje'), '19 %');
  assert.equal(u.textoValor('0.19', 'porcentaje'), '0,19 %');
});

test('agrupar por día de Colombia conservando el orden de llegada', () => {
  const ev = (id, fecha) => ({ id, fecha, tipo: 'price_changed', titulo: 'Precio cambiado', actor: { nombre: 'Ana', rol: null }, origen: null, canal: null, detalles: [], precios: [], lote: null, motivo: null, fuente: 'evento', sistema: false });
  const ahora = new Date('2026-10-26T18:00:00.000Z');
  const g = u.agruparPorDia([
    ev('a', '2026-10-26T15:00:00.000Z'),
    ev('b', '2026-10-26T13:00:00.000Z'),
    ev('c', '2026-10-26T01:00:00.000Z'), // 8 p. m. del domingo en Colombia
    ev('d', '2026-10-25T20:00:00.000Z'),
  ], ahora);
  assert.deepEqual(g.map((x) => [x.etiqueta, x.eventos.map((e) => e.id)]), [['HOY', ['a', 'b']], ['AYER', ['c', 'd']]]);
  assert.deepEqual(u.agruparPorDia([], ahora), []);
});

test('la línea de quién: hora, persona con rol, origen y canal', () => {
  const e = { fecha: '2026-10-23T20:45:12.000Z', actor: { nombre: 'Ana Gómez', rol: 'Vendedor' }, origen: 'Katuq', canal: 'Importación de precios' };
  assert.equal(u.lineaQuien(e), '3:45:12 p. m. · Ana Gómez (Vendedor) · Katuq · Importación de precios');
  assert.equal(u.lineaQuien({ fecha: null, actor: { nombre: 'Sistema', rol: null }, origen: null, canal: null }), 'Sistema');
});

test('el resumen de un producto creado o borrado y el aspecto por tipo', () => {
  assert.equal(u.resumenFoto({ reference: 'GCJ1236', name: 'Camisa', category: 'Hombre', basePrice: 100000, basePriceWithTax: 119000 }), 'GCJ1236 · Camisa · Hombre · $119.000');
  assert.equal(u.resumenFoto(null), '');
  assert.deepEqual(u.aspectoEvento('price_changed'), { icono: 'pi pi-tag', tono: 'info' });
  assert.equal(u.aspectoEvento('tipo-nuevo').tono, 'neutro');
  for (const t of ['product_created', 'product_deleted', 'cost_changed', 'price_changed', 'product_deactivated', 'product_activated', 'product_sold_out', 'product_available', 'product_edited', 'photos_changed']) {
    assert.ok(u.aspectoEvento(t).icono.startsWith('pi pi-'), t);
  }
});

test('«Última edición»: el correo si es una persona; los textos técnicos no se muestran', () => {
  assert.equal(u.editorDeProducto('ana@almara.co'), 'ana@almara.co');
  assert.equal(u.editorDeProducto('  ana@almara.co '), 'ana@almara.co');
  for (const t of ['system', 'batch-process', 'precios-tipo-cliente', 'import-precios', 'import-precios-unitarios', 'import-precios-volumen', 'limpiar-precios',
    'osmosis_sync', 'osmosis-sync', 'flow-engine', 'conector-mcp', 'bot-whatsapp', 'whatsapp-confirmacion', 'algo-nuevo-que-aparezca', 'Ana Gómez', 'a@b']) {
    assert.equal(u.editorDeProducto(t), '', t);
  }
  assert.equal(u.editorDeProducto(null), '');
  assert.equal(u.editorDeProducto(undefined), '');
});

test('«Historial» de costo: solo a quien el servidor dejaría ver costos (D9)', () => {
  assert.equal(u.puedeVerCostosHistorial('Administrador', []), true);
  assert.equal(u.puedeVerCostosHistorial('Administrador LT', null), true);
  assert.equal(u.puedeVerCostosHistorial('Gerente comercial', []), true);
  assert.equal(u.puedeVerCostosHistorial('VENTAS', ['pedidos']), false);
  assert.equal(u.puedeVerCostosHistorial('Solo inventarios.', undefined), false);
  assert.equal(u.puedeVerCostosHistorial('VENTAS', ['pedidos', 'lista-precios/lista-precios']), true);
  assert.equal(u.puedeVerCostosHistorial('VENTAS', [{ path: 'lista-precios/lista-precios' }]), true);
  assert.equal(u.puedeVerCostosHistorial('', ['lista-precios/lista-precios']), false);
  assert.equal(u.puedeVerCostosHistorial(null, null), false);
});

test('la consulta al servidor: vista de eventos, orden, filtro y cursor, con el id codificado', () => {
  assert.equal(u.rutaHistorial('abc123'), '/v1/productos/historial/abc123?vista=eventos&orden=desc');
  assert.equal(u.rutaHistorial('abc123', { orden: 'asc', tipo: 'precios', limite: 50 }), '/v1/productos/historial/abc123?vista=eventos&limite=50&orden=asc&tipo=precios');
  assert.equal(u.rutaHistorial('abc123', { tipo: 'costo', cursor: 'a+b/c=' }), '/v1/productos/historial/abc123?vista=eventos&orden=desc&tipo=costo&cursor=a%2Bb%2Fc%3D');
  // Un filtro desconocido no se manda; un id con símbolos no se sale de la ruta.
  assert.equal(u.rutaHistorial('a/b', { tipo: 'otro' }), '/v1/productos/historial/a%2Fb?vista=eventos&orden=desc');
});
