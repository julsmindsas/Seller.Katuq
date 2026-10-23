'use strict';
/**
 * D-547 (F1, tarea 2.5): buscador «Buscar acción» del modal Opciones del pedido.
 *
 *   node --test tests/ventas/acciones-pedido-buscador.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const dir = '../../src/app/components/ventas/list/acciones-pedido/';
const { estadoAcciones } = require(dir + 'acciones-pedido.estado.ts');
const { candidatasBusqueda, filtrarAcciones, accionParaEnter, normalizarTexto } = require(dir + 'acciones-pedido.buscador.ts');

const base = (cambios = {}) => ({
  produccion: false, puedeDireccion: true, puedeFacturacion: true, puedeProductos: true,
  puedeDescuentoEImpuestos: true, puedeAsesor: true, esPOS: false, tieneDescuento: false,
  puedeEliminar: false, esBrenda: false, estadoProceso: 'Pendiente', puedeFacturarSiigo: false,
  puedeRefacturar: false, puedeLiberar: false, esDian: false, despachadoOEntregado: false,
  revisado: false, ...cambios,
});
const ids = lista => lista.map(i => i.accion.id);
const buscar = (texto, entrada = base()) => filtrarAcciones(texto, candidatasBusqueda(estadoAcciones(entrada)));

test('«imprimir» (el nombre viejo) encuentra PDF del pedido', () => {
  assert.deepEqual(ids(buscar('imprimir')), ['orderPdf']);
  assert.deepEqual(ids(buscar('Estado de Pago')), ['changeStatus']);
  assert.deepEqual(ids(buscar('añadir o retirar')), ['editProducts']);
});

test('sin mayúsculas ni tildes: «direccion» encuentra Editar dirección', () => {
  assert(ids(buscar('direccion')).includes('editAddress'));
  assert(ids(buscar('DIRECCIÓN')).includes('editAddress'));
  assert.equal(normalizarTexto('  Ñandú   ÁÉÍÓÚ '), 'nandu aeiou');
});

test('busca también por la reseña', () => {
  assert.deepEqual(ids(buscar('copia del pedido')), ['duplicate']);
  assert(ids(buscar('responsable')).includes('changeSeller'));
});

test('sin texto devuelve todas las candidatas, las 16 fijas primero y en el orden de la grilla', () => {
  const todas = buscar('');
  assert.equal(todas.length, 16);
  assert.deepEqual(ids(todas).slice(0, 4), ['orderPdf', 'salesOrder', 'resendConfirmation', 'duplicate']);
});

test('solo busca entre las de contexto visibles', () => {
  assert.deepEqual(ids(buscar('dian')), []);
  const conDian = buscar('dian', base({ esDian: true, puedeLiberar: true }));
  assert.deepEqual(ids(conDian), ['dianStatus', 'dianPdf', 'creditNote', 'dianAdjustment']);
  // El nombre del grupo encuentra sus hijos visibles; el grupo en sí no es candidata.
  assert.deepEqual(ids(buscar('factura electrónica', base({ esDian: true, puedeLiberar: true }))),
    ['releaseInvoice', 'dianStatus', 'dianPdf', 'creditNote', 'dianAdjustment']);
  assert.deepEqual(ids(buscar('despacho')), []);
  assert.deepEqual(ids(buscar('despacho', base({ despachadoOEntregado: true }))), ['delivery']);
});

test('Enter con una sola coincidencia habilitada devuelve esa acción', () => {
  assert.equal(accionParaEnter(buscar('imprimir')), 'orderPdf');
});

test('Enter con dos coincidencias, con una deshabilitada o sin coincidencias no abre nada', () => {
  assert.equal(accionParaEnter(buscar('pdf')), null, 'varias coincidencias');
  assert.equal(accionParaEnter(buscar('solo domicilios')), null, 'sin coincidencias en el motivo');
  const bloqueado = buscar('editar dirección', base({ puedeDireccion: false }));
  assert.deepEqual(ids(bloqueado), ['editAddress']);
  assert.equal(accionParaEnter(bloqueado), null, 'una sola pero deshabilitada');
  assert.equal(accionParaEnter([]), null);
});

test('sin coincidencias devuelve vacío', () => {
  assert.deepEqual(buscar('zzzz'), []);
});
