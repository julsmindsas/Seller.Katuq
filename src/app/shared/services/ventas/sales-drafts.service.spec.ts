import { refrescarLineas } from './sales-drafts.service';

/** Ticket 1169 (D-466): al retomar un borrador, las líneas se ponen al día (D3). */
describe('refrescarLineas (borrador de venta asistida)', () => {
  const producto = (cd: string, precio: number, extra: any = {}) => ({
    cd,
    crearProducto: { titulo: `Producto ${cd}` },
    precio: { precioUnitarioConIva: precio },
    stockPorBodega: { 'BOD-001': 5 },
    ...extra,
  });
  const linea = (p: any, cantidad = 2, extra: any = {}) => ({
    producto: p,
    configuracion: { producto: p, adiciones: [] },
    cantidad,
    ...extra,
  });

  it('quita el producto que ya no existe o está inactivo y lo avisa', () => {
    const r = refrescarLineas(
      [linea(producto('a', 100)), linea(producto('b', 100))],
      [producto('a', 100), producto('b', 100, { exposicion: { activar: false } })],
      { idBodega: 'BOD-001' },
    );
    expect(r.items.map((i) => i.producto.cd)).toEqual(['a']);
    expect(r.avisos).toEqual(['Producto b ya no está disponible y se quitó.']);
  });

  it('usa el producto vigente y avisa el cambio de precio, conservando cantidad y configuración', () => {
    const r = refrescarLineas([linea(producto('a', 100), 3, { descuentoLinea: { porcentaje: 10 } })], [producto('a', 120)], {
      idBodega: 'BOD-001',
    });
    expect(r.items[0].producto.precio.precioUnitarioConIva).toBe(120);
    expect(r.items[0].configuracion.producto.precio.precioUnitarioConIva).toBe(120);
    expect(r.items[0].cantidad).toBe(3);
    expect(r.items[0].descuentoLinea).toEqual({ porcentaje: 10 });
    expect(r.avisos[0]).toContain('pasó de');
  });

  it('con precio manual no avisa cambio de precio', () => {
    const r = refrescarLineas([linea(producto('a', 100), 1, { _precioManualOverride: true })], [producto('a', 120)], {});
    expect(r.avisos).toEqual([]);
  });

  it('avisa existencias insuficientes en la bodega pero deja la línea', () => {
    const r = refrescarLineas([linea(producto('a', 100), 8)], [producto('a', 100)], { idBodega: 'BOD-001' });
    expect(r.items.length).toBe(1);
    expect(r.avisos).toEqual(['Producto a: hay 5 en la bodega y el borrador tiene 8.']);
  });

  it('un producto no inventariable no avisa existencias', () => {
    const r = refrescarLineas(
      [linea(producto('a', 100), 8)],
      [producto('a', 100, { disponibilidad: { inventariable: false } })],
      { idBodega: 'BOD-001' },
    );
    expect(r.avisos).toEqual([]);
  });

  it('aplica el precio de la lista del cliente', () => {
    const vigente = producto('a', 100, {
      preciosPorTipoCliente: [{ tipoClienteId: 'MAY', activo: true, precioConIva: 80, precio: 67.23, porcentajeIva: 19 }],
    });
    const r = refrescarLineas([linea(producto('a', 80))], [vigente], { tipoClienteId: 'MAY' });
    expect(r.items[0].producto.precio.precioUnitarioConIva).toBe(80);
    expect(r.avisos).toEqual([]);
  });
});
