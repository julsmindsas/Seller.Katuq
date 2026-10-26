'use strict';
/**
 * Historial del pedido (D-541, F1, tarea 6.1): funciones puras de la pantalla.
 * src/app/components/ventas/historial-pedido/historial-pedido.util.ts
 *
 * Qué protege:
 *  1. Las horas salen en hora de Colombia (UTC−5), sin importar la zona del computador, y el día se
 *     decide en Colombia (cruce de la medianoche UTC): HOY, AYER o «MARTES 21 DE OCTUBRE».
 *  2. La hora lleva segundos: «3:45:12 p. m.».
 *  3. Pesos colombianos sin decimales y con puntos de miles; la diferencia lleva signo y «−» (no «-»):
 *     «$200.000 → $180.000 (−$20.000)».
 *  4. El aspecto de cada tipo (ícono y par de color de D10) y que un tipo desconocido no rompa nada.
 *  5. La ruta de la consulta: el id va codificado y solo se mandan cursor, orden y límite válidos.
 *
 *   node --test tests/ventas/historial-pedido.util.test.js
 *   TZ=America/Los_Angeles node --test tests/ventas/historial-pedido.util.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const u = require('../../src/app/components/ventas/historial-pedido/historial-pedido.util.ts');

const MENOS = '−';

test('el día se decide en hora de Colombia y no en UTC (cruce de la medianoche)', () => {
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

test('hora con segundos en hora de Colombia, reloj de 12 horas', () => {
  assert.equal(u.horaConSegundos('2026-10-23T20:45:12.000Z'), '3:45:12 p. m.');
  assert.equal(u.horaConSegundos('2026-10-23T15:54:00.000Z'), '10:54:00 a. m.');
  assert.equal(u.horaConSegundos('2026-10-23T05:00:09.000Z'), '12:00:09 a. m.', 'la medianoche es 12, no 0');
  assert.equal(u.horaConSegundos('2026-10-23T17:00:00.000Z'), '12:00:00 p. m.', 'el mediodía es 12 p. m.');
  assert.equal(u.horaConSegundos(null), '');
  assert.equal(u.horaConSegundos('texto raro'), '');
  assert.ok(!/[  ]/.test(u.horaConSegundos('2026-10-23T20:45:12.000Z')), 'sin espacios especiales');
});

test('fecha y hora completas en hora de Colombia', () => {
  assert.equal(u.fechaHoraColombia('2026-10-23T15:54:00.000Z'), '23 oct 2026, 10:54 a. m.');
  assert.equal(u.fechaHoraColombia(''), '-');
  assert.equal(u.fechaHoraColombia('texto raro'), 'texto raro');
});

test('pesos colombianos sin decimales y con puntos de miles; negativos con «−»', () => {
  assert.equal(u.formatoCOP(200000), '$200.000');
  assert.equal(u.formatoCOP(1234567.4), '$1.234.567');
  assert.equal(u.formatoCOP(0), '$0');
  assert.equal(u.formatoCOP('50000'), '$50.000');
  assert.equal(u.formatoCOP(-20000), `${MENOS}$20.000`);
  assert.equal(u.formatoCOP(null), '');
  assert.equal(u.formatoCOP('abc'), '');
});

test('diferencia con signo: «+$» sube, «−$» baja (signo menos, no guion), cero es «$0»', () => {
  assert.equal(u.diferenciaConSigno(35670), '+$35.670');
  assert.equal(u.diferenciaConSigno(-20000), `${MENOS}$20.000`);
  assert.ok(!u.diferenciaConSigno(-20000).includes('-'), 'no usa el guion');
  assert.equal(u.diferenciaConSigno(0), '$0');
  assert.equal(u.diferenciaConSigno(null), '');
});

test('la pastilla de plata: saldo antes → después con la diferencia con signo', () => {
  assert.equal(
    u.lineaSaldo({ pago: 20000, saldoAntes: 200000, saldoDespues: 180000, total: 200000 }),
    `$200.000 → $180.000 (${MENOS}$20.000)`,
  );
  // un saldo que sube (se anula un pago)
  assert.equal(
    u.lineaSaldo({ pago: 20000, saldoAntes: 180000, saldoDespues: 200000, total: 200000 }),
    '$180.000 → $200.000 (+$20.000)',
  );
  // sin saldo no hay pastilla
  assert.equal(u.lineaSaldo({ pago: 20000, saldoAntes: null, saldoDespues: null, total: 200000 }), '');
  assert.equal(u.lineaSaldo(null), '');
  // solo el saldo de después (creación): se dice sin flecha
  assert.equal(u.lineaSaldo({ pago: null, saldoAntes: null, saldoDespues: 150000, total: 200000 }), 'Saldo $150.000');
});

test('el pago de un evento: «Pago $50.000»', () => {
  assert.equal(u.lineaPago({ pago: 50000, saldoAntes: 200000, saldoDespues: 150000, total: 200000 }), 'Pago $50.000');
  assert.equal(u.lineaPago({ pago: null, saldoAntes: null, saldoDespues: null, total: 200000 }), '');
  assert.equal(u.lineaPago(null), '');
});

test('agrupa por día de Colombia conservando el orden en que llegan', () => {
  const ahora = new Date('2026-10-26T18:00:00.000Z');
  const e = (id, fecha) => ({ id, fecha });
  const grupos = u.agruparPorDia(
    [e('a', '2026-10-26T15:00:00.000Z'), e('b', '2026-10-26T01:00:00.000Z'), e('c', '2026-10-25T20:00:00.000Z'), e('d', '2026-10-21T15:00:00.000Z')],
    ahora,
  );
  assert.deepEqual(grupos.map((g) => [g.etiqueta, g.eventos.map((x) => x.id)]), [
    ['HOY', ['a']],
    // «b» es la noche del domingo (01:00 UTC del lunes): cae en AYER junto con «c»
    ['AYER', ['b', 'c']],
    ['MIÉRCOLES 21 DE OCTUBRE', ['d']],
  ]);
  assert.deepEqual(u.agruparPorDia([], ahora), []);
  assert.deepEqual(u.agruparPorDia(null, ahora), []);
});

test('una página nueva continúa el grupo del día donde terminó la anterior', () => {
  const ahora = new Date('2026-10-26T18:00:00.000Z');
  const pagina1 = [{ id: 'a', fecha: '2026-10-26T15:00:00.000Z' }];
  const pagina2 = [{ id: 'b', fecha: '2026-10-26T14:00:00.000Z' }, { id: 'c', fecha: '2026-10-24T14:00:00.000Z' }];
  const grupos = u.agruparPorDia([...pagina1, ...pagina2], ahora);
  assert.deepEqual(grupos.map((g) => g.eventos.length), [2, 1]);
});

test('la línea de quién: hora con segundos, persona (rol), origen y canal', () => {
  assert.equal(
    u.lineaQuien({ fecha: '2026-10-23T20:45:12.000Z', actor: { nombre: 'Ana Gómez', rol: 'Vendedor' }, origen: 'Web', canal: null }),
    '3:45:12 p. m. · Ana Gómez (Vendedor) · Web',
  );
  assert.equal(
    u.lineaQuien({ fecha: '2026-10-23T20:45:12.000Z', actor: { nombre: 'Sistema', rol: null }, origen: 'Sistema', canal: 'Wompi' }),
    '3:45:12 p. m. · Sistema · Sistema · Wompi',
  );
  assert.equal(u.lineaQuien({ fecha: null, actor: { nombre: 'Ana', rol: null }, origen: null, canal: null }), 'Ana');
});

test('aspecto por tipo: ícono y par semántico de D10', () => {
  const a = (tipo, extra = {}) => u.aspectoEvento({ tipo, titulo: '', retroceso: false, detalles: [], ...extra });
  assert.deepEqual(a('order_created'), { icono: 'pi pi-plus', tono: 'primario' });
  assert.deepEqual(a('process_status_changed'), { icono: 'pi pi-arrow-right', tono: 'info' });
  assert.deepEqual(a('process_status_changed', { retroceso: true }), { icono: 'pi pi-arrow-left', tono: 'alerta' });
  assert.deepEqual(a('payment_status_changed'), { icono: 'pi pi-credit-card', tono: 'info' });
  assert.deepEqual(a('delivery_reported', { titulo: 'Entregado' }), { icono: 'pi pi-check-circle', tono: 'exito' });
  assert.deepEqual(a('delivery_reported', { titulo: 'Rechazado en la entrega' }), { icono: 'pi pi-times-circle', tono: 'peligro' });
  assert.deepEqual(a('payment_registered'), { icono: 'pi pi-wallet', tono: 'exito' });
  assert.deepEqual(a('payment_edited'), { icono: 'pi pi-pencil', tono: 'alerta' });
  assert.deepEqual(a('payment_voided'), { icono: 'pi pi-ban', tono: 'peligro' });
  assert.deepEqual(a('payment_verified', { titulo: 'Pago aprobado' }), { icono: 'pi pi-check-circle', tono: 'exito' });
  assert.deepEqual(a('payment_verified', { titulo: 'Pago rechazado' }), { icono: 'pi pi-times-circle', tono: 'peligro' });
  assert.deepEqual(a('order_deleted'), { icono: 'pi pi-trash', tono: 'peligro' });
  // un proceso que termina en Cancelado es un error, no un avance
  assert.deepEqual(
    a('process_status_changed', { detalles: [{ etiqueta: 'Estado del proceso', antes: 'Despachado', despues: 'Cancelado', clase: 'estado' }] }),
    { icono: 'pi pi-ban', tono: 'peligro' },
  );
});

test('un tipo desconocido no rompe: ícono neutro', () => {
  assert.deepEqual(u.aspectoEvento({ tipo: 'algo_nuevo' }), { icono: 'pi pi-info-circle', tono: 'neutro' });
  assert.deepEqual(u.aspectoEvento(null), { icono: 'pi pi-info-circle', tono: 'neutro' });
});

test('el origen de Sistema o integración usa la pastilla de pizarra; una persona, la neutra', () => {
  assert.equal(u.tonoOrigen({ sistema: true, fuente: 'evento' }), 'pizarra');
  assert.equal(u.tonoOrigen({ sistema: false, fuente: 'evento' }), 'neutro');
  assert.equal(u.tonoOrigen({}), 'neutro');
});

test('un evento reconstruido se marca; uno real o de antes no', () => {
  assert.equal(u.esReconstruido({ fuente: 'reconstruido' }), true);
  assert.equal(u.esReconstruido({ fuente: 'evento' }), false);
  assert.equal(u.esReconstruido({ fuente: 'legado' }), false);
  assert.equal(u.esReconstruido(null), false);
  assert.equal(u.TEXTO_RECONSTRUIDO, 'Registro reconstruido');
  assert.equal(u.NOTA_RECONSTRUIDO, 'Armado con los datos actuales del pedido');
});

test('el motivo: lo escrito, o «Sin motivo (App)» que manda el servidor', () => {
  assert.equal(u.lineaMotivo({ motivo: 'El cliente se arrepintió', notaMotivo: null }), 'Motivo: El cliente se arrepintió');
  assert.equal(u.lineaMotivo({ motivo: null, notaMotivo: 'Sin motivo (App)' }), 'Sin motivo (App)');
  assert.equal(u.lineaMotivo({ motivo: null, notaMotivo: null }), '');
  assert.equal(u.lineaMotivo(null), '');
});

test('un detalle de plata se escribe como pesos; el resto, como texto', () => {
  assert.equal(u.textoDetalle({ etiqueta: 'Valor', antes: null, despues: 50000, clase: 'dinero' }, 'despues'), '$50.000');
  assert.equal(u.textoDetalle({ etiqueta: 'Valor', antes: 200000, despues: 180000, clase: 'dinero' }, 'antes'), '$200.000');
  assert.equal(u.textoDetalle({ etiqueta: 'Estado del pago', antes: null, despues: 'Aprobado', clase: 'estado' }, 'antes'), 'Sin dato');
  assert.equal(u.textoDetalle({ etiqueta: 'x', antes: true, despues: false, clase: 'texto' }, 'antes'), 'Sí');
  assert.equal(u.textoDetalle({ etiqueta: 'Fotos', antes: [], despues: ['a', 'b'], clase: 'lista' }, 'despues'), 'a, b');
  assert.equal(u.textoDetalle({ etiqueta: 'Fotos', antes: [], despues: [], clase: 'lista' }, 'despues'), 'Sin dato');
});

test('la línea de resumen: «12 movimientos · último: Pago registrado»', () => {
  assert.equal(u.lineaMovimientos({ totalEventos: 12, ultimoCambio: { fecha: '2026-10-23T20:45:12.000Z', titulo: 'Pago registrado' } }), '12 movimientos · último: Pago registrado');
  assert.equal(u.lineaMovimientos({ totalEventos: 1, ultimoCambio: { fecha: null, titulo: 'Pedido creado' } }), '1 movimiento · último: Pedido creado');
  assert.equal(u.lineaMovimientos({ totalEventos: 0, ultimoCambio: null }), 'Sin movimientos');
  assert.equal(u.lineaMovimientos(null), '');
});

test('la ruta de la consulta: el id va codificado y solo se manda lo válido', () => {
  assert.equal(u.rutaHistorialPedido('abc123'), '/v1/orders/abc123/history?vista=eventos&orden=desc');
  assert.equal(
    u.rutaHistorialPedido('abc123', { orden: 'asc', cursor: 'eyJ0Ijox/+=', limite: 50 }),
    '/v1/orders/abc123/history?vista=eventos&limite=50&orden=asc&cursor=eyJ0Ijox%2F%2B%3D',
  );
  assert.equal(u.rutaHistorialPedido('a/b?c'), '/v1/orders/a%2Fb%3Fc/history?vista=eventos&orden=desc', 'no se sale de la ruta');
  assert.equal(u.rutaHistorialPedido('abc', { orden: 'otro' }), '/v1/orders/abc/history?vista=eventos&orden=desc');
});
