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
});
