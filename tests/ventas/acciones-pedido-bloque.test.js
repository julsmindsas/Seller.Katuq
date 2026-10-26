'use strict';
/**
 * D-547 (F2, tarea 11.2): lo que dibuja el bloque ACCIONES de 8. Mismos títulos, reseñas y motivos que el modal.
 *
 *   node --test tests/ventas/acciones-pedido-bloque.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const dir = '../../src/app/components/ventas/list/acciones-pedido/';
const { construirBloque } = require(dir + 'acciones-pedido.bloque.ts');
const { estadoAcciones } = require(dir + 'acciones-pedido.estado.ts');
const { ochoAcciones } = require(dir + 'acciones-pedido.ocho.ts');
const { resaltada } = require(dir + 'acciones-pedido.resaltada.ts');
const { construirVista } = require(dir + 'order-options-modal.vista.ts');

const entrada = (cambios = {}) => ({
  produccion: false, puedeDireccion: true, puedeFacturacion: true, puedeProductos: true,
  puedeDescuentoEImpuestos: true, puedeAsesor: true, esPOS: false, tieneDescuento: false,
  puedeEliminar: false, esBrenda: false, estadoProceso: 'Pendiente', puedeFacturarSiigo: false,
  puedeRefacturar: false, puedeLiberar: false, esDian: false, despachadoOEntregado: false,
  revisado: false, ...cambios,
});
const bloque = (cambios = {}, rol = null, pines = [], pedido = {}) => {
  const estados = estadoAcciones(entrada(cambios));
  return construirBloque(ochoAcciones(rol, pines), estados, false, resaltada(pedido));
};

test('rol sin configurar y sin pines: General primero y después las 4 del orden fijo', () => {
  const b = bloque();
  assert.deepEqual(b.tarjetas.map(t => t.id), [
    'orderPdf', 'salesOrder', 'editCustomer', 'billingData', 'notes', 'changeStatus', 'editProducts', 'editAddress',
  ]);
  assert.deepEqual(b.tarjetas.map(t => t.titulo), [
    'PDF del pedido', 'Orden de venta', 'Editar cliente', 'Facturación', 'Notas', 'Cambiar estado', 'Editar productos', 'Editar dirección',
  ]);
  for (const t of b.tarjetas) assert.equal(t.habilitada, true, t.id);
});

test('usa los mismos títulos, reseñas e íconos que las tarjetas del modal', () => {
  const estados = estadoAcciones(entrada());
  const modal = construirVista({ estados, texto: '', desdeProduccion: false, revisado: false });
  const delModal = {};
  for (const c of modal.columnas) for (const t of c.tarjetas) delModal[t.id] = t;
  const b = construirBloque(ochoAcciones(null, []), estados, false, null);
  for (const t of b.tarjetas) {
    const { etiqueta, ...sinEtiqueta } = t;
    assert.deepEqual(sinEtiqueta, delModal[t.id], t.id);
  }
});

test('Cambiar asesor fijada por alguien que no es administrador: deshabilitada con «Solo administradores»', () => {
  const b = bloque({ puedeAsesor: false }, null, ['changeSeller']);
  const t = b.tarjetas.find(x => x.id === 'changeSeller');
  assert.equal(t.habilitada, false);
  assert.equal(t.motivo, 'Solo administradores');
});

test('pedido POS: Notas deshabilitada con su motivo; congelado: Editar productos con «Congelado · Despachado»', () => {
  const pos = bloque({ esPOS: true }).tarjetas.find(x => x.id === 'notes');
  assert.deepEqual([pos.habilitada, pos.motivo], [false, 'No aplica a pedidos POS']);
  const cong = bloque({ puedeProductos: false, estadoProceso: 'Despachado' }).tarjetas.find(x => x.id === 'editProducts');
  assert.deepEqual([cong.habilitada, cong.motivo], [false, 'Congelado · Despachado']);
});

test('Facturación con factura: deshabilitada con «Ya tiene factura» y en su mismo lugar', () => {
  const b = bloque({ puedeFacturacion: false });
  assert.equal(b.tarjetas[3].id, 'billingData');
  assert.deepEqual([b.tarjetas[3].habilitada, b.tarjetas[3].motivo], [false, 'Ya tiene factura']);
});

test('resaltar sin mover: Pagos con «Pago pendiente» y el orden de las 8 no cambia', () => {
  const sin = bloque({}, null, ['payments']);
  const con = bloque({}, null, ['payments'], { estadoPago: 'Pendiente' });
  assert.deepEqual(con.tarjetas.map(t => t.id), sin.tarjetas.map(t => t.id));
  assert.equal(con.tarjetas.find(t => t.id === 'payments').etiqueta, 'Pago pendiente');
  assert.equal(con.tarjetas.filter(t => t.etiqueta).length, 1);
  assert.equal(sin.tarjetas.every(t => t.etiqueta === null), true);
});

test('pedido pagado y sin factura: Facturación con «Sin factura» en su lugar de siempre', () => {
  const b = bloque({}, { profile: 'cashier', actions: ['orderPdf', 'payments', 'billingData', 'editProducts'] }, [], { estadoPago: 'Aprobado' });
  assert.equal(b.tarjetas[2].id, 'billingData');
  assert.equal(b.tarjetas[2].etiqueta, 'Sin factura');
});

test('si la acción resaltada no está entre las 8, el bloque no pinta ninguna etiqueta', () => {
  const b = bloque({}, null, [], { estadoPago: 'Pendiente' }); // Pagos no está entre las 8 por defecto
  assert.equal(b.tarjetas.every(t => t.etiqueta === null), true);
});

test('factura electrónica: Facturar, Liberar y las 4 de la DIAN con sus condiciones; Refacturar no va en el bloque', () => {
  const b = bloque({ puedeFacturarSiigo: true, puedeLiberar: true, esDian: true, puedeRefacturar: true });
  assert.deepEqual(b.hijosFactura.map(h => h.id), ['invoice', 'releaseInvoice', 'dianStatus', 'dianPdf', 'creditNote', 'dianAdjustment']);
  assert.deepEqual(bloque({ puedeRefacturar: true }).hijosFactura, []);
  assert.deepEqual(bloque().hijosFactura, []);
});

test('desde Producción las condiciones de factura de F1 no aparecen', () => {
  const b = bloque({ produccion: true, puedeFacturarSiigo: true, esDian: true });
  assert.deepEqual(b.hijosFactura, []);
});

test('Descuento con descuento aplicado ofrece Aplicar otro y Editar o quitar; sin descuento no hay menú', () => {
  const con = bloque({ tieneDescuento: true }, null, ['discount']);
  assert.equal(con.descuentoConMenu, true);
  assert.deepEqual(con.opcionesDescuento.map(o => [o.id, o.titulo]), [['discount', 'Aplicar otro'], ['editDiscount', 'Editar o quitar']]);
  const sin = bloque({}, null, ['discount']);
  assert.equal(sin.descuentoConMenu, false);
  assert.deepEqual(sin.opcionesDescuento, []);
});
