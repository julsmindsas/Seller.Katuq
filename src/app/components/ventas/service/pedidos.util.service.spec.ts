import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PedidosUtilService } from './pedidos.util.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { CacheService } from '../../../shared/services/cache/cache.service';

/**
 * D-220 — regresión del bug: `checkout.component.ts:834` pisaba
 * `pedido.totalDescuento` con `getDiscount()` justo antes de crear la orden.
 * `getDiscount()` solo sabía calcular descuento porcentual (`porceDescuento`);
 * para un código `valor_fijo` o dirigido a categoría/producto (que deja
 * `porceDescuento = 0` a propósito, ver `carrito.component.ts:664`), devolvía
 * 0 incondicionalmente y el monto correcto se perdía antes de persistir.
 *
 * Fix: cuando no hay `porceDescuento`, usa `pedido.descuentoAplicado.montoDescuento`
 * (el monto ya resuelto al aplicar el código) en vez de 0 fijo.
 */
describe('PedidosUtilService.getDiscount() — D-220', () => {
  let service: PedidosUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PedidosUtilService,
        { provide: MaestroService, useValue: {} },
        { provide: CacheService, useValue: { get: () => null, set: () => {} } },
      ],
    });
    service = TestBed.inject(PedidosUtilService);
  });

  it('regresión: código porcentual sigue calculando sobre el subtotal (comportamiento previo intacto)', () => {
    service.pedido = {
      porceDescuento: 10,
      carrito: [{ producto: { precio: { precioUnitarioSinIva: 100000, preciosVolumen: [] } }, cantidad: 1, configuracion: {} }],
    } as any;
    expect(service.getDiscount()).toBe(10000);
  });

  it('código valor_fijo (dirigido o no): antes devolvía 0, ahora devuelve el monto de descuentoAplicado', () => {
    service.pedido = {
      porceDescuento: 0,
      totalDescuento: 0, // exactamente lo que checkout.component.ts:834 intenta fijar
      descuentoAplicado: { descuentoId: 'x', codigoPersonalizado: 'FIJO20K', tipo: 'valor_fijo', valor: 20000, montoDescuento: 20000 },
      carrito: [{ producto: { precio: { precioUnitarioSinIva: 100000, preciosVolumen: [] } }, cantidad: 1, configuracion: {} }],
    } as any;
    expect(service.getDiscount()).toBe(20000);
  });

  it('código dirigido a categoría/producto (monto ya resuelto sobre la base elegible)', () => {
    service.pedido = {
      porceDescuento: 0,
      descuentoAplicado: { descuentoId: 'y', codigoPersonalizado: 'CATEG10', tipo: 'porcentaje', valor: 10, montoDescuento: 8500 },
      carrito: [{ producto: { precio: { precioUnitarioSinIva: 50000, preciosVolumen: [] } }, cantidad: 1, configuracion: {} }],
    } as any;
    expect(service.getDiscount()).toBe(8500);
  });

  it('envío gratis: montoDescuento en 0 desde el backend, sigue en 0 (sin regresión)', () => {
    service.pedido = {
      porceDescuento: 0,
      descuentoAplicado: { descuentoId: 'z', codigoPersonalizado: 'ENVIOGRATIS', tipo: 'envio_gratis', valor: 0, montoDescuento: 0 },
      carrito: [{ producto: { precio: { precioUnitarioSinIva: 50000, preciosVolumen: [] } }, cantidad: 1, configuracion: {} }],
    } as any;
    expect(service.getDiscount()).toBe(0);
  });

  it('sin código ni porcentaje: sigue en 0', () => {
    service.pedido = { porceDescuento: 0, carrito: [] } as any;
    expect(service.getDiscount()).toBe(0);
  });

  it('regresión encontrada en code review: admin quita un % previamente aplicado (list.component.ts::guardarCambiosDescuento ahora también limpia descuentoAplicado) — no debe resucitar el monto viejo', () => {
    service.pedido = {
      porceDescuento: 0, // admin bajó a 0%
      cuponAplicado: undefined,
      descuentoAplicado: undefined, // fix acompañante en list.component.ts:7166-7171
      carrito: [{ producto: { precio: { precioUnitarioSinIva: 100000, preciosVolumen: [] } }, cantidad: 1, configuracion: {} }],
    } as any;
    expect(service.getDiscount()).toBe(0);
  });

  it('segunda regresión de code review: código fijo topado al subtotal actual si se quita un producto después de aplicarlo (evita total negativo en actualizarValoresPedido)', () => {
    service.pedido = {
      porceDescuento: 0,
      descuentoAplicado: { descuentoId: 'w', codigoPersonalizado: 'FIJO20K', tipo: 'valor_fijo', valor: 20000, montoDescuento: 20000 },
      carrito: [{ producto: { precio: { precioUnitarioSinIva: 10000, preciosVolumen: [] } }, cantidad: 1, configuracion: {} }], // quedó 1 solo item, subtotal 10.000
    } as any;
    expect(service.getDiscount()).toBe(10000); // topado, no 20.000
  });

  /**
   * D-141 (continuación) — el checkout mostraba la línea con el precio ya rebajado
   * (`checkPriceScaleProd` aplica `descuentoLinea`) pero "TOTAL A PAGAR" sumaba
   * `checkPriceScale()`, que es el subtotal BRUTO, sin restar ese descuento por
   * ningún lado: `getDiscount()` solo sabía de `porceDescuento`.
   * Reportado con una cotización al 5%: la línea decía $47.500 y el total $50.000.
   */
  describe('descuento por línea (item.descuentoLinea)', () => {
    it('caso reportado: 5% de línea sin descuento global — antes 0, ahora 2.500', () => {
      service.pedido = {
        porceDescuento: 0,
        carrito: [{
          producto: { precio: { precioUnitarioSinIva: 50000, preciosVolumen: [] } },
          cantidad: 1, configuracion: {}, descuentoLinea: 5,
        }],
      } as any;
      expect(service.getDiscount()).toBe(2500);
    });

    it('línea + global se componen multiplicativamente, no se suman (espejo del backend)', () => {
      service.pedido = {
        porceDescuento: 10,
        carrito: [{
          producto: { precio: { precioUnitarioSinIva: 100000, preciosVolumen: [] } },
          cantidad: 1, configuracion: {}, descuentoLinea: 10,
        }],
      } as any;
      // neto de línea = 90.000; global 10% sobre ESE neto = 9.000
      // total descuento = 10.000 + 9.000 = 19.000 → neto final 81.000 = 100.000 × 0,9 × 0,9
      expect(service.getDiscount()).toBe(19000);
    });

    it('el descuento de línea aplica por ítem, no contamina las otras líneas', () => {
      service.pedido = {
        porceDescuento: 0,
        carrito: [
          { producto: { precio: { precioUnitarioSinIva: 50000, preciosVolumen: [] } }, cantidad: 1, configuracion: {}, descuentoLinea: 5 },
          { producto: { precio: { precioUnitarioSinIva: 30000, preciosVolumen: [] } }, cantidad: 2, configuracion: {} },
        ],
      } as any;
      expect(service.getDiscount()).toBe(2500); // solo la primera línea
    });

    it('línea + código de valor fijo: se suman, y el fijo se topa al subtotal YA neto', () => {
      service.pedido = {
        porceDescuento: 0,
        descuentoAplicado: { descuentoId: 'f', codigoPersonalizado: 'FIJO20K', tipo: 'valor_fijo', valor: 20000, montoDescuento: 20000 },
        carrito: [{
          producto: { precio: { precioUnitarioSinIva: 50000, preciosVolumen: [] } },
          cantidad: 1, configuracion: {}, descuentoLinea: 5,
        }],
      } as any;
      expect(service.getDiscount()).toBe(22500); // 2.500 de línea + 20.000 del código
    });

    it('el tope del código fijo usa el neto: nunca deja el total en negativo', () => {
      service.pedido = {
        porceDescuento: 0,
        descuentoAplicado: { descuentoId: 'f', codigoPersonalizado: 'FIJO99K', tipo: 'valor_fijo', valor: 99000, montoDescuento: 99000 },
        carrito: [{
          producto: { precio: { precioUnitarioSinIva: 50000, preciosVolumen: [] } },
          cantidad: 1, configuracion: {}, descuentoLinea: 5,
        }],
      } as any;
      // 2.500 + min(99.000, 47.500) = 50.000 exactos, nunca más que el bruto
      expect(service.getDiscount()).toBe(50000);
    });

    it('descuentoLinea fuera de rango se sanea (>100 y negativos no rompen el total)', () => {
      service.pedido = {
        porceDescuento: 0,
        carrito: [
          { producto: { precio: { precioUnitarioSinIva: 10000, preciosVolumen: [] } }, cantidad: 1, configuracion: {}, descuentoLinea: 150 },
          { producto: { precio: { precioUnitarioSinIva: 10000, preciosVolumen: [] } }, cantidad: 1, configuracion: {}, descuentoLinea: -20 },
        ],
      } as any;
      expect(service.getDiscount()).toBe(10000); // 100% de la primera, 0% de la segunda
    });
  });

});

/**
 * Ticket 1161 — la base de cada línea que se le manda al backend al aplicar un código a un pedido ya
 * creado. Tiene que ser la del carrito de la venta asistida: CON IVA, neta del descuento por línea y
 * con adiciones y preferencias. Sobre ella el backend arma el monto del código y el historial.
 */
describe('PedidosUtilService.precioLineaConIvaNeto() — ticket 1161', () => {
  let service: PedidosUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PedidosUtilService,
        { provide: MaestroService, useValue: {} },
        { provide: CacheService, useValue: { get: () => null, set: () => {} } },
      ],
    });
    service = TestBed.inject(PedidosUtilService);
  });

  const producto = (extra: any = {}) => ({
    precio: { precioUnitarioSinIva: 100000, precioUnitarioConIva: 119000, precioUnitarioIva: '19', preciosVolumen: [] },
    ...extra,
  });

  it('precio con IVA por la cantidad (la base del carrito, no la de sin IVA)', () => {
    expect(service.precioLineaConIvaNeto({ producto: producto(), cantidad: 2, configuracion: {} })).toBe(238000);
  });

  it('descuenta el descuento por línea', () => {
    expect(service.precioLineaConIvaNeto({ producto: producto(), cantidad: 2, descuentoLinea: 10, configuracion: {} })).toBe(214200);
  });

  it('suma adiciones y preferencias con IVA, por la cantidad', () => {
    const item = {
      producto: producto(),
      cantidad: 3,
      configuracion: {
        adiciones: [{ cantidad: 1, referencia: { precioTotal: 4760 } }],
        preferencias: [{ precioTotalConIva: 1190 }],
      },
    };

    expect(service.precioLineaConIvaNeto(item)).toBe((119000 + 4760 + 1190) * 3);
  });

  it('con IVA manual recalcula desde el precio sin IVA', () => {
    expect(service.precioLineaConIvaNeto({ producto: producto(), cantidad: 1, _ivaManualOverride: 5, configuracion: {} })).toBeCloseTo(105000, 5);
  });

  it('un producto con precio promocional usa ese precio, salvo que tenga precio por categoría de cliente', () => {
    const promo = producto({ precioPromocional: 100000 });

    expect(service.precioLineaConIvaNeto({ producto: promo, cantidad: 2, configuracion: {} })).toBe(200000);
    expect(service.precioLineaConIvaNeto({ producto: { ...promo, _precioAplicadoPorCategoria: true }, cantidad: 2, configuracion: {} })).toBe(238000);
  });

  it('una línea sin precio o sin cantidad vale 0', () => {
    expect(service.precioLineaConIvaNeto({ producto: {}, cantidad: 2 })).toBe(0);
    expect(service.precioLineaConIvaNeto({ producto: producto(), cantidad: 0, configuracion: {} })).toBe(0);
  });
});
