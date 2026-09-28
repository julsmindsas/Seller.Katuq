'use strict';
/**
 * Ticket 1042 (OH MY STORE, ORE-000975): un pedido YA tomado mide la campaña
 * contra SU fecha, no contra hoy. Cuando la campaña mayorista de GCJ4131 venció
 * el 16-sep, la pantalla pintaba 45.900 (lista) en vez de 34.425 y el total no
 * cuadraba con la factura. Espejo de backend scripts/test-precio-congelado-por-fecha.js.
 *
 *   node --test tests/ventas/precio-congelado-por-fecha.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { descuentoVigente, precioEfectivoDeFila, fechaDeReferencia } =
  require('../../src/app/shared/utils/precio-por-tipo-cliente.ts');
const { filaSinIVAEfectivo, fechaDelPedido, calcularTotalesCanonico } =
  require('../../src/app/shared/services/ventas/iva-canonico.ts');

const MAY = '5liyJ51LZxb5H6CtuTrX';

// GCJ4131, lista mayorista 45.900 con IVA, campaña 34.425 hasta el 16-sep (datos reales).
const filaGCJ4131 = () => ({
  tipoClienteId: MAY, activo: true,
  precioConIva: 45900, precio: 38571, porcentajeIva: 19,
  precioDescuentoConIva: 34425, precioDescuento: 28929, descuentoPorcentaje: 25,
  descuentoHasta: '2026-09-16T23:50:00-05:00',
});

const pedidoORE975 = (fechaCreacion) => ({
  fechaCreacion,
  cliente: { categoria: { id: MAY } },
  carrito: [{
    cantidad: 1,
    producto: {
      identificacion: { referencia: 'GCJ4131' },
      precio: { precioUnitarioConIva: 45900, precioUnitarioSinIva: 38571, precioUnitarioIva: '19' },
      preciosPorTipoCliente: [filaGCJ4131()],
    },
  }],
});

test('el día del pedido la campaña está viva: se cobra la rebaja', () => {
  assert.equal(descuentoVigente(filaGCJ4131(), '2026-09-16'), true);
  assert.equal(precioEfectivoDeFila(filaGCJ4131(), '2026-09-16'), 34425);
  assert.equal(filaSinIVAEfectivo(filaGCJ4131(), '2026-09-16'), 28929);
});

test('un día después ya venció: vuelve el precio de lista', () => {
  assert.equal(descuentoVigente(filaGCJ4131(), '2026-09-17'), false);
  assert.equal(precioEfectivoDeFila(filaGCJ4131(), '2026-09-17'), 45900);
  assert.equal(filaSinIVAEfectivo(filaGCJ4131(), '2026-09-17'), 38571);
});

test('ORE-000975: el total del pedido usa la fecha del pedido, no hoy', () => {
  const tomado = calcularTotalesCanonico(pedidoORE975('2026-09-16T15:02:11.000Z'));
  assert.equal(tomado.subtotalSinDescuento, 28929);
  // El mismo pedido medido "hoy" (campaña vencida) daría el de lista: lo que se veía mal.
  const sinFecha = calcularTotalesCanonico(pedidoORE975(undefined));
  assert.equal(sinFecha.subtotalSinDescuento, 38571);
});

test('fechas: ISO con hora, Date y basura', () => {
  assert.equal(fechaDelPedido({ fechaCreacion: '2026-09-16T23:59:00.000Z' }), '2026-09-16');
  assert.equal(fechaDelPedido({ fecha: '2026-09-15' }), '2026-09-15');
  assert.equal(fechaDelPedido({}), undefined);
  assert.equal(fechaDeReferencia(new Date('2026-09-16T10:00:00Z')), '2026-09-16');
  // Fecha ilegible cae a hoy (catálogo/carrito): nunca a un precio inventado.
  assert.equal(fechaDeReferencia('no-es-fecha'), new Date().toISOString().slice(0, 10));
});

test('fechaCreacion como Timestamp serializado u objeto raro no tumba la pantalla', () => {
  const seg = Math.floor(new Date('2026-09-16T15:00:00Z').getTime() / 1000);
  assert.equal(fechaDelPedido({ fechaCreacion: { _seconds: seg, _nanoseconds: 0 } }), '2026-09-16');
  assert.equal(fechaDelPedido({ fechaCreacion: { seconds: seg } }), '2026-09-16');
  assert.equal(fechaDelPedido({ fechaCreacion: { descripcion: 'x', valor: 'y' } }), undefined);
  const t = calcularTotalesCanonico(pedidoORE975({ _seconds: seg, _nanoseconds: 0 }));
  assert.equal(t.subtotalSinDescuento, 28929);
});

test('campaña sin fecha de fin sigue viva; rebaja >= lista no es rebaja', () => {
  const sinFin = { ...filaGCJ4131(), descuentoHasta: null };
  assert.equal(descuentoVigente(sinFin, '2030-01-01'), true);
  const falsa = { ...filaGCJ4131(), precioDescuentoConIva: 45900 };
  assert.equal(descuentoVigente(falsa, '2026-09-16'), false);
});

// La regla vive en dos lados por diseño (ticket 1042): si alguien cambia una
// sin la otra, esta prueba lo dice.
const RUTA_BACKEND = path.resolve(__dirname, '../../../katuq_admin_back_firebase/functions/utils/campaniaDescuento.js');
test('paridad con el backend (utils/campaniaDescuento.js)', { skip: !fs.existsSync(RUTA_BACKEND) && 'repo backend no está al lado' }, () => {
  const { esCampaniaVigente } = require(RUTA_BACKEND);
  const filas = [
    filaGCJ4131(),
    { ...filaGCJ4131(), descuentoHasta: null },
    { ...filaGCJ4131(), precioDescuentoConIva: null },
    { ...filaGCJ4131(), precioDescuentoConIva: 0 },
    { ...filaGCJ4131(), precioDescuentoConIva: 45900 },
    { ...filaGCJ4131(), precioDescuentoConIva: '34425' },
    { ...filaGCJ4131(), precioConIva: 'x' },
    null,
  ];
  const fechas = ['2026-09-15', '2026-09-16', '2026-09-17'];
  for (const fila of filas) {
    for (const f of fechas) {
      assert.equal(descuentoVigente(fila, f), esCampaniaVigente(fila, f),
        `difieren para ${JSON.stringify(fila)} en ${f}`);
    }
  }
});
