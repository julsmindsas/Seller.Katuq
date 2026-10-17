'use strict';
/**
 * Ticket 1224 (ALMARA, DAD-014323): al quitar un pedido de la orden de envío, la copia de la
 * pantalla estaba vieja (empaque lo marcó y le asentaron un pago) y el backend rechazó el
 * cambio con STALE_WRITE. Despachos ahora relee el pedido, le aplica el mismo cambio y
 * guarda una vez más. Aquí se prueba la tabla de cambios y el flujo de reintento.
 *
 *   node --test tests/despachos/estado-despacho.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { ESTADO, estadoDestino, aplicarCambioDeEstado, yaQuedoAsi } =
  require('../../src/app/components/despachos/despachos/estado-despacho.ts');

const yulie = { name: 'Yulie Osorno', nit: '1020483654', email: 'despachos@almara.com.co' };

// Como quedó DAD-014323 en producción: en la orden #3629, empacado y pagado en dos partes
// mientras la orden estaba abierta.
const pedidoEnOrden = (extra = {}) => ({
  _id: 'abc123',
  nroPedido: 'DAD-014323',
  estadoProceso: ESTADO.Despachado,
  nroShippingOrder: 3629,
  shippingOrder: 3629,
  transportador: 'Steve Rene',
  despachador: { name: 'Natalia' },
  fechaYHorarioDespachado: '2026-10-16T13:00:00.000Z',
  empacador: 'Sara',
  fechaHoraEmpacado: '2026-10-16T14:34:00.000Z',
  carrito: [{ producto: { identificacion: { referencia: 'DULCE-3' } }, cantidad: 3 }],
  PagosAsentados: [{ valor: 47450 }, { valor: 47450 }],
  totalPedididoConDescuento: 94900,
  faltaPorPagar: 0,
  date_upd: '2026-10-16T15:15:00.000Z',
  ...extra,
});

test('estadoDestino: cada botón lleva a su estado y un código raro no lleva a ninguno', () => {
  assert.equal(estadoDestino(0), ESTADO.Producido);
  assert.equal(estadoDestino(1), ESTADO.Empacado);
  assert.equal(estadoDestino(2), ESTADO.Producido);
  assert.equal(estadoDestino(3), ESTADO.Empacado);
  assert.equal(estadoDestino(4), ESTADO.Despachado);
  assert.equal(estadoDestino(5), ESTADO.Entregado);
  assert.equal(estadoDestino(9), null);
});

test('código 3 (quitar de la orden): Empacado, sin orden ni transportador, con la marca de retroceso', () => {
  const p = aplicarCambioDeEstado(pedidoEnOrden(), 3, yulie);
  assert.equal(p.estadoProceso, ESTADO.Empacado);
  assert.equal(p.nroShippingOrder, undefined);
  assert.equal(p.shippingOrder, undefined);
  assert.equal(p.transportador, undefined);
  assert.equal(p.despachador, undefined);
  assert.equal(p.fechaYHorarioDespachado, undefined);
  assert.equal(p._estadoProcesoExplicitlyChanged, true);
  // Lo de empaque se conserva: el retroceso es solo del despacho.
  assert.equal(p.empacador, 'Sara');
  assert.equal(p.fechaHoraEmpacado, '2026-10-16T14:34:00.000Z');
});

test('código 2 (a producido): también borra lo de empaque y lleva la marca', () => {
  const p = aplicarCambioDeEstado(pedidoEnOrden(), 2, yulie);
  assert.equal(p.estadoProceso, ESTADO.Producido);
  assert.equal(p.empacador, undefined);
  assert.equal(p.fechaHoraEmpacado, undefined);
  assert.equal(p.nroShippingOrder, undefined);
  assert.equal(p._estadoProcesoExplicitlyChanged, true);
});

test('códigos 1, 4 y 5 ponen a la persona y la fecha; 0 solo el estado; ninguno lleva la marca', () => {
  const antes = Date.now() - 1000;
  const empacado = aplicarCambioDeEstado(pedidoEnOrden({ estadoProceso: ESTADO.Producido }), 1, yulie);
  assert.equal(empacado.estadoProceso, ESTADO.Empacado);
  assert.equal(empacado.empacador, 'Yulie Osorno');
  assert.ok(new Date(empacado.fechaHoraEmpacado).getTime() >= antes);
  assert.equal(empacado._estadoProcesoExplicitlyChanged, undefined);

  const despachado = aplicarCambioDeEstado(pedidoEnOrden({ estadoProceso: ESTADO.Empacado, nroShippingOrder: undefined }), 4, yulie);
  assert.equal(despachado.estadoProceso, ESTADO.Despachado);
  assert.deepEqual(despachado.despachador, yulie);
  assert.equal(despachado.transportador, 'Yulie Osorno');
  assert.equal(despachado.nroShippingOrder, '00');
  assert.equal(despachado.shippingOrder, '00');
  assert.equal(despachado._estadoProcesoExplicitlyChanged, undefined);

  const entregado = aplicarCambioDeEstado(pedidoEnOrden(), 5, yulie);
  assert.equal(entregado.estadoProceso, ESTADO.Entregado);
  assert.deepEqual(entregado.entregado, yulie);
  assert.deepEqual(entregado.despachador, yulie);

  const producido = aplicarCambioDeEstado(pedidoEnOrden(), 0, yulie);
  assert.equal(producido.estadoProceso, ESTADO.Producido);
  assert.equal(producido.nroShippingOrder, 3629, 'el código 0 no toca la orden');
});

test('ningún código toca carrito, pagos ni totales', () => {
  for (const codigo of [0, 1, 2, 3, 4, 5]) {
    const p = aplicarCambioDeEstado(pedidoEnOrden(), codigo, yulie);
    assert.deepEqual(p.carrito, pedidoEnOrden().carrito, `código ${codigo}: carrito`);
    assert.deepEqual(p.PagosAsentados, pedidoEnOrden().PagosAsentados, `código ${codigo}: pagos`);
    assert.equal(p.totalPedididoConDescuento, 94900, `código ${codigo}: total`);
    assert.equal(p.faltaPorPagar, 0, `código ${codigo}: falta por pagar`);
    assert.equal(p.date_upd, '2026-10-16T15:15:00.000Z', `código ${codigo}: la versión la fija el servidor`);
  }
});

test('yaQuedoAsi: quitar de la orden solo cuenta si ya está Empacado Y sin orden', () => {
  assert.equal(yaQuedoAsi(pedidoEnOrden({ estadoProceso: ESTADO.Empacado, nroShippingOrder: undefined, shippingOrder: undefined }), 3), true);
  assert.equal(yaQuedoAsi(pedidoEnOrden({ estadoProceso: ESTADO.Empacado }), 3), false, 'Empacado pero sigue en la orden');
  assert.equal(yaQuedoAsi(pedidoEnOrden(), 3), false, 'sigue Despachado');
  assert.equal(yaQuedoAsi(pedidoEnOrden(), 4), true, 'ya está Despachado');
  assert.equal(yaQuedoAsi(pedidoEnOrden({ estadoProceso: ESTADO.Entregado }), 5), true);
  assert.equal(yaQuedoAsi(pedidoEnOrden(), 5), false);
  assert.equal(yaQuedoAsi(null, 3), false);
  assert.equal(yaQuedoAsi(pedidoEnOrden(), 9), false);
});

// Espejo del flujo de despachos.component.ts: guardar → 409 → releer → reaplicar → guardar
// una sola vez. El servidor de mentira rechaza cuando _baseVersion no es la versión actual,
// igual que POST /v1/orders/edit.
function servidorDeMentira(actual) {
  const escrituras = [];
  let lecturas = 0;
  return {
    escrituras,
    get lecturas() { return lecturas; },
    editOrder(pedido) {
      if ((pedido.date_upd || null) !== actual.date_upd) {
        return { ok: false, error: { isStaleWrite: true, message: 'El pedido fue modificado por otra persona mientras lo editabas.' } };
      }
      escrituras.push({ ...pedido });
      // Como VentasService.editOrder: adopta en el objeto la versión nueva que devuelve el servidor.
      pedido.date_upd = '2026-10-16T16:00:00.000Z';
      actual = { ...pedido };
      return { ok: true };
    },
    getPedidoPorNumero(nro) {
      lecturas++;
      return nro === actual.nroPedido ? { ...actual } : null;
    },
  };
}

function cambiarEstadoComoLaPantalla(servidor, copiaDePantalla, codigo, usuario) {
  aplicarCambioDeEstado(copiaDePantalla, codigo, usuario);
  const primero = servidor.editOrder(copiaDePantalla);
  if (primero.ok) return { resultado: 'guardado', intentos: 1 };
  delete copiaDePantalla._estadoProcesoExplicitlyChanged; // la pantalla la borra en cuanto falla
  if (!primero.error.isStaleWrite) return { resultado: 'error', error: primero.error, intentos: 1 };
  const fresco = servidor.getPedidoPorNumero(copiaDePantalla.nroPedido);
  if (!fresco) return { resultado: 'error', error: primero.error, intentos: 1 };
  if (yaQuedoAsi(fresco, codigo)) {
    Object.assign(copiaDePantalla, fresco);
    return { resultado: 'ya-estaba', intentos: 1 };
  }
  aplicarCambioDeEstado(fresco, codigo, usuario);
  const segundo = servidor.editOrder(fresco);
  if (!segundo.ok) return { resultado: 'error', error: segundo.error, intentos: 2 };
  delete fresco._estadoProcesoExplicitlyChanged;
  Object.assign(copiaDePantalla, fresco);
  return { resultado: 'guardado', intentos: 2 };
}

test('flujo del 1224: la copia vieja choca, se relee una vez y el segundo guardado lleva el empaque y los pagos actuales', () => {
  // Lo que tenía la pantalla al abrir la orden: en producción, sin empacar, un solo pago.
  const copiaVieja = pedidoEnOrden({
    estadoProceso: ESTADO.Despachado,
    empacador: undefined,
    fechaHoraEmpacado: undefined,
    PagosAsentados: [{ valor: 47450 }],
    faltaPorPagar: 47450,
    date_upd: '2026-10-16T12:00:00.000Z',
  });
  const servidor = servidorDeMentira(pedidoEnOrden());

  const r = cambiarEstadoComoLaPantalla(servidor, copiaVieja, 3, yulie);

  assert.equal(r.resultado, 'guardado');
  assert.equal(r.intentos, 2);
  assert.equal(servidor.lecturas, 1, 'una sola relectura');
  assert.equal(servidor.escrituras.length, 1, 'una sola escritura aceptada');
  const guardado = servidor.escrituras[0];
  assert.equal(guardado.estadoProceso, ESTADO.Empacado);
  assert.equal(guardado.nroShippingOrder, undefined);
  assert.equal(guardado.empacador, 'Sara', 'conserva lo que hizo empaque');
  assert.deepEqual(guardado.PagosAsentados, [{ valor: 47450 }, { valor: 47450 }], 'conserva los dos pagos');
  assert.equal(guardado.faltaPorPagar, 0);
  assert.equal(guardado._estadoProcesoExplicitlyChanged, true, 'el retroceso va declarado');
  // La pantalla queda con los datos actuales y la versión nueva.
  assert.equal(copiaVieja.empacador, 'Sara');
  assert.equal(copiaVieja.date_upd, '2026-10-16T16:00:00.000Z');
  assert.equal(copiaVieja._estadoProcesoExplicitlyChanged, undefined);
});

test('si otra persona ya lo sacó de la orden, no se escribe nada', () => {
  const copiaVieja = pedidoEnOrden({ date_upd: '2026-10-16T12:00:00.000Z' });
  const servidor = servidorDeMentira(pedidoEnOrden({
    estadoProceso: ESTADO.Empacado, nroShippingOrder: undefined, shippingOrder: undefined, transportador: undefined,
  }));
  const r = cambiarEstadoComoLaPantalla(servidor, copiaVieja, 3, yulie);
  assert.equal(r.resultado, 'ya-estaba');
  assert.equal(servidor.escrituras.length, 0);
  assert.equal(copiaVieja.estadoProceso, ESTADO.Empacado);
  assert.equal(copiaVieja.nroShippingOrder, undefined);
});

test('si vuelve a chocar, se muestra el error y no hay tercer intento', () => {
  const copiaVieja = pedidoEnOrden({ date_upd: '2026-10-16T12:00:00.000Z' });
  const servidor = servidorDeMentira(pedidoEnOrden());
  // Alguien más escribe justo después de la relectura.
  const leer = servidor.getPedidoPorNumero.bind(servidor);
  servidor.getPedidoPorNumero = (nro) => {
    const fresco = leer(nro);
    servidor.editOrder({ ...fresco, estadoProceso: ESTADO.Entregado });
    return fresco;
  };
  const r = cambiarEstadoComoLaPantalla(servidor, copiaVieja, 3, yulie);
  assert.equal(r.resultado, 'error');
  assert.equal(r.intentos, 2);
  assert.equal(r.error.isStaleWrite, true);
  assert.equal(servidor.escrituras.length, 1, 'solo la escritura ajena');
});

test('un error que no es de versión no relee', () => {
  const copiaVieja = pedidoEnOrden();
  const servidor = servidorDeMentira(pedidoEnOrden());
  servidor.editOrder = () => ({ ok: false, error: { status: 400, message: 'Transición no permitida' } });
  const r = cambiarEstadoComoLaPantalla(servidor, copiaVieja, 4, yulie);
  assert.equal(r.resultado, 'error');
  assert.equal(r.intentos, 1);
  assert.equal(servidor.lecturas, 0);
});
