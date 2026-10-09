import { stringify as flattedStringify } from 'flatted';
import {
  aplicarResultadoCodigo,
  categoriasDeProducto,
  clienteIdParaCodigo,
  lineasParaCodigo,
  productoEnPromocion,
} from './codigo-descuento';

/**
 * Ticket 1161 (ALMACEN BOMBAS): el listado de pedidos validaba los códigos contra la colección vieja
 * `cupones` y rechazaba los que la empresa creó en Descuentos y Promociones (p. ej. DIST25: 25 %,
 * todos los productos). Aquí se cuida el armado de la solicitud y cómo queda el pedido.
 */
describe('codigo-descuento', () => {
  describe('aplicarResultadoCodigo', () => {
    it('porcentaje sobre todo el pedido (DIST25): queda como porceDescuento y guarda el código', () => {
      const pedido: any = { cliente: { documento: '900123' } };
      aplicarResultadoCodigo(
        pedido,
        { descuentoId: 'NCRU', codigoPersonalizado: 'DIST25', tipo: 'porcentaje', valor: 25, montoDescuento: 25000, aplicaA: 'todos_los_productos', nombre: 'DIST25' },
        'dist25',
      );

      expect(pedido.porceDescuento).toBe(25);
      expect(pedido.totalDescuento).toBe(25000);
      expect(pedido.cuponAplicado).toBe('DIST25');
      expect(pedido.descuentoAplicado).toEqual({
        descuentoId: 'NCRU',
        codigoPersonalizado: 'DIST25',
        tipo: 'porcentaje',
        valor: 25,
        montoDescuento: 25000,
        nombre: 'DIST25',
        clienteId: '900123',
      });
    });

    it('valor fijo: monto fijo, sin porcentaje', () => {
      const pedido: any = { porceDescuento: 10 };
      aplicarResultadoCodigo(pedido, { descuentoId: 'f', tipo: 'valor_fijo', valor: 20000, montoDescuento: 20000, aplicaA: 'todos_los_productos' }, 'FIJO20K');

      expect(pedido.porceDescuento).toBe(0);
      expect(pedido.totalDescuento).toBe(20000);
    });

    it('un porcentaje dirigido a una categoría va como monto fijo (no se sobre-aplica a todo el pedido)', () => {
      const pedido: any = {};
      aplicarResultadoCodigo(pedido, { descuentoId: 'c', tipo: 'porcentaje', valor: 10, montoDescuento: 8500, aplicaA: 'categoria' }, 'CATEG10');

      expect(pedido.porceDescuento).toBe(0);
      expect(pedido.totalDescuento).toBe(8500);
    });

    it('envío gratis: sin descuento sobre productos y con la marca para llevar el envío a cero', () => {
      const pedido: any = { porceDescuento: 15 };
      aplicarResultadoCodigo(pedido, { descuentoId: 'e', tipo: 'envio_gratis', valor: 0, montoDescuento: 0 }, 'ENVIOGRATIS');

      expect(pedido.porceDescuento).toBe(0);
      expect(pedido.totalDescuento).toBe(0);
      expect(pedido.descuentoAplicado.tipo).toBe('envio_gratis');
    });

    it('sin código en la respuesta usa el que escribió la persona, en mayúscula', () => {
      const pedido: any = {};
      aplicarResultadoCodigo(pedido, { descuentoId: 'x', tipo: 'porcentaje', valor: 5, montoDescuento: 100 }, 'rec5');

      expect(pedido.descuentoAplicado.codigoPersonalizado).toBe('REC5');
    });
  });

  describe('clienteIdParaCodigo', () => {
    it('prefiere el documento y, si falta, el correo', () => {
      expect(clienteIdParaCodigo({ cliente: { documento: '123', correo_electronico_comprador: 'a@b.co' } })).toBe('123');
      expect(clienteIdParaCodigo({ cliente: { correo_electronico_comprador: 'a@b.co' } })).toBe('a@b.co');
      expect(clienteIdParaCodigo({})).toBe('');
    });
  });

  describe('categoriasDeProducto', () => {
    it('lee el árbol de categorías en minúscula, también las hijas', () => {
      const producto = { categorias: [{ data: { nombre: 'Bombas' }, children: [{ data: { nombre: ' Sumergibles ' } }] }] };
      expect(categoriasDeProducto(producto)).toEqual(['bombas', 'sumergibles']);
    });

    it('lee el texto en formato flatted con el que se guardan en el producto y tolera productos sin categorías', () => {
      expect(categoriasDeProducto({ categorias: flattedStringify([{ nombre: 'Repuestos' }]) })).toEqual(['repuestos']);
      expect(categoriasDeProducto({})).toEqual([]);
      expect(categoriasDeProducto({ categorias: 'no es json' })).toEqual([]);
    });
  });

  describe('lineasParaCodigo', () => {
    const pedido = {
      carrito: [
        { producto: { identificacion: { referencia: 'ALM-1' }, categorias: [{ nombre: 'Bombas' }], precio: { precioUnitarioConIva: 100 } }, cantidad: 2 },
        { producto: { identificacion: { referencia: 'ALM-2' }, precioPromocional: 80, precio: { precioUnitarioConIva: 100 } }, cantidad: 1 },
        { producto: { identificacion: { referencia: 'ALM-3' } }, cantidad: 1, _promocionAplicada: { precioBaseConIva: 10 } },
      ],
    };

    it('manda la referencia, las categorías y la base de cada línea', () => {
      const lineas = lineasParaCodigo(pedido, (item) => item.cantidad * 1000);

      expect(lineas[0]).toEqual({ productoReferencia: 'ALM-1', categorias: ['bombas'], precioLinea: 2000, enPromocion: false });
    });

    it('marca las líneas en promoción para que el código no se acumule sobre ellas', () => {
      const lineas = lineasParaCodigo(pedido, () => 1);

      expect(lineas.map((l) => l.enPromocion)).toEqual([false, true, true]);
    });

    it('una base que no es número queda en 0', () => {
      expect(lineasParaCodigo(pedido, () => NaN)[0].precioLinea).toBe(0);
    });

    it('un pedido sin carrito no manda líneas', () => {
      expect(lineasParaCodigo({}, () => 1)).toEqual([]);
    });
  });

  describe('productoEnPromocion', () => {
    it('solo con precio promocional menor al base', () => {
      expect(productoEnPromocion({ precioPromocional: 80, precio: { precioUnitarioConIva: 100 } })).toBe(true);
      expect(productoEnPromocion({ precioPromocional: 100, precio: { precioUnitarioConIva: 100 } })).toBe(false);
      expect(productoEnPromocion({})).toBe(false);
    });
  });
});
