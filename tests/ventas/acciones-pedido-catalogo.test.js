'use strict';
/**
 * D-547 (F1, tarea 2.2): catálogo de acciones del pedido.
 *
 *   node --test tests/ventas/acciones-pedido-catalogo.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const root = path.resolve(__dirname, '../..');
const cat = require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts');
const { TABLER_ICONOS } = require('../../src/app/shared/icons/tabler-iconos.ts');
const antes = require('./acciones-pedido-antes.json');

// Tabla de la spec `order-options-modal` (mockup aprobado del ticket 1350), columna por columna.
const ESPERADO = {
  documentos: [
    ['PDF del pedido', 'Descarga el pedido completo'],
    ['Orden de venta', 'PDF sencillo para el cliente'],
    ['Reenviar confirmación', 'Envía de nuevo al cliente'],
    ['Duplicar', 'Crea una copia del pedido'],
  ],
  clienteEntrega: [
    ['Editar cliente', 'Cambia los datos del cliente'],
    ['Editar dirección', 'Corrige dónde se entrega'],
    ['Facturación', 'Datos para la factura'],
    ['Cambiar asesor', 'Asigna otro responsable'],
  ],
  productosPagos: [
    ['Editar productos', 'Agrega o quita productos'],
    ['Descuento', 'Aplica o ajusta un descuento'],
    ['Impuestos', 'Ajusta el IVA del pedido'],
    ['Pagos', 'Registra y consulta pagos'],
  ],
  seguimiento: [
    ['Cambiar estado', 'Actualiza el pago o el proceso'],
    ['Historial', 'Mira todos los cambios'],
    ['Notas', 'Agrega o edita notas'],
    ['Limpiar notas', 'Borra notas de productos retirados'],
  ],
};
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

test('hay exactamente 16 fijas, 4 por columna, con ids únicos y ningún ícono repetido', () => {
  assert.equal(cat.ACCIONES_FIJAS.length, 16);
  for (const col of ['documentos', 'clienteEntrega', 'productosPagos', 'seguimiento']) {
    assert.equal(cat.fijasDeColumna(col).length, 4, col);
  }
  const ids = cat.ACCIONES_PEDIDO.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
  const iconos = cat.ACCIONES_FIJAS.map(a => a.icono);
  assert.equal(new Set(iconos).size, 16, `ícono repetido entre las 16 fijas: ${iconos}`);
});

test('títulos y reseñas de las 16 fijas son idénticos a la tabla de la spec, en su orden', () => {
  for (const [col, filas] of Object.entries(ESPERADO)) {
    const reales = cat.fijasDeColumna(col).map(a => [a.titulo, a.resena]);
    assert.deepEqual(reales, filas, col);
  }
});

test('el catálogo coincide con la tabla de la spec del repositorio mientras la spec esté en su sitio', t => {
  const spec = path.join(root, 'openspec/changes/acciones-del-pedido/specs/order-options-modal/spec.md');
  if (!fs.existsSync(spec)) return t.skip('la spec ya se archivó en openspec/specs/');
  const texto = fs.readFileSync(spec, 'utf8');
  for (const filas of Object.values(ESPERADO)) {
    for (const [titulo, resena] of filas) {
      assert(texto.includes(`${titulo} · ${resena}`), `la spec no trae «${titulo} · ${resena}»`);
    }
  }
});

test('todos los íconos del catálogo existen en el registro Tabler generado', () => {
  for (const a of cat.ACCIONES_PEDIDO) {
    assert(TABLER_ICONOS[a.icono], `${a.id}: el ícono «${a.icono}» no está en tabler-iconos.ts`);
  }
});

test('contexto, subacciones y pie son un catálogo cerrado', () => {
  const por = tipo => cat.ACCIONES_PEDIDO.filter(a => a.tipo === tipo).map(a => a.id);
  assert.deepEqual(por('contexto'), ['electronicInvoice', 'delivery', 'correctPrice', 'changePriceList', 'production', 'reviewMark']);
  assert.deepEqual(cat.subaccionesDe('electronicInvoice').map(a => a.id),
    ['invoice', 'reinvoice', 'releaseInvoice', 'dianStatus', 'dianPdf', 'creditNote', 'dianAdjustment']);
  assert.deepEqual(cat.subaccionesDe('discount').map(a => a.id), ['editDiscount']);
  assert.deepEqual(por('pie'), ['deleteOrder']);
  assert.equal(cat.accionPorId('deleteOrder').titulo, 'Eliminar pedido');
});

test('cada título de hoy de las 28 acciones aparece como título o como nombre anterior de la misma acción', () => {
  assert.equal(antes.acciones.length, 28);
  for (const hoy of antes.acciones) {
    const accion = cat.accionPorId(hoy.id);
    assert(accion, `${hoy.id} no está en el catálogo`);
    const conocidos = new Set([accion.titulo, accion.tituloAlterno, ...accion.nombresAnteriores].filter(Boolean).map(norm));
    const titulos = [...Object.values(hoy.titulos), ...(hoy.titulosExtra || [])].filter(Boolean);
    for (const t of titulos) assert(conocidos.has(norm(t)), `${hoy.id}: falta el título de hoy «${t}»`);
  }
});

test('Marcar revisión se vuelve Quitar revisión solo cuando el pedido ya está revisado', () => {
  const a = cat.accionPorId('reviewMark');
  assert.equal(cat.tituloVisible(a, false), 'Marcar revisión');
  assert.equal(cat.tituloVisible(a, true), 'Quitar revisión');
  assert.equal(cat.tituloVisible(cat.accionPorId('orderPdf'), true), 'PDF del pedido');
});
