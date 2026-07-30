import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { MaestroService } from '../maestros/maestro.service';
import { PedidosUtilService } from '../../../components/ventas/service/pedidos.util.service';

/**
 * Spec 010 — tarea T-02.
 *
 * Congela el desglose de IVA esperado de `checkIVAPrice` para el caso crítico:
 * un código porcentual que coexiste con una línea en promoción automática.
 * El código NO debe descontar la línea en promo (no acumulación, D-B2), por lo
 * que el IVA de esa línea NO recibe el factor (1 - porceDescuento).
 *
 * ORACLE (fijado por el backend autoritativo `orderCalculationService`, ver
 * scripts/test-descuentos-money-path.js del backend): en el caso mixto
 * IVA 19% = 32.300.
 *
 * NOTA (test-first): hasta implementar el gap G1 (`factorDesc` por línea en
 * checkIVAPrice), el caso mixto devuelve 30.780 y el de solo-promo 13.680
 * (el desglose visual acumula el código sobre la línea en promo). Estos tests
 * quedan ROJOS a propósito y pasan a verde con G1. El backend ya persiste el
 * valor correcto; esto es solo el desglose mostrado al vendedor.
 */
describe('PaymentService.checkIVAPrice — código % + promoción (spec 010 / G1)', () => {
  let service: PaymentService;

  // Producto base: 100.000 sin IVA, IVA 19% → 119.000 con IVA.
  const productoBase = () => ({
    precio: {
      precioUnitarioSinIva: 100000,
      precioUnitarioIva: '19',
      precioUnitarioConIva: 119000,
      preciosVolumen: [],
    },
  });

  // Producto en promo del 20%: precio promocional CON IVA = 95.200 (campo que
  // lee el frontend desde el catálogo/carrito).
  const productoEnPromo = () => ({
    precio: {
      precioUnitarioSinIva: 100000,
      precioUnitarioIva: '19',
      precioUnitarioConIva: 119000,
      preciosVolumen: [],
    },
    precioPromocional: 95200,
  });

  const linea = (producto: any, cantidad = 1) => ({ producto, cantidad, configuracion: {} });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PaymentService,
        { provide: MaestroService, useValue: { getBillingZone: () => ({ subscribe: () => {} }) } },
        {
          provide: PedidosUtilService,
          useValue: {
            // Sin envío en estos fixtures → IVA de domicilio = 0.
            getShippingTaxCostInvoice: () => 0,
            getShippingTaxValueInvoice: () => '0',
          },
        },
      ],
    });
    service = TestBed.inject(PaymentService);
    // allBillingZone no-nulo para que checkIVAPrice no retorne ceros.
    service.allBillingZone = [];
  });

  it('regresión: 1 producto normal, sin código → IVA 19% = 19.000', () => {
    const pedido: any = { carrito: [linea(productoBase())], porceDescuento: 0 };
    const r = service.checkIVAPrice(pedido);
    expect(Math.round(r.totalIva19)).toBe(19000);
  });

  it('solo línea en promo (20%) + código 10% → el código NO toca la promo: IVA = 15.200', () => {
    const pedido: any = { carrito: [linea(productoEnPromo())], porceDescuento: 10 };
    const r = service.checkIVAPrice(pedido);
    expect(Math.round(r.totalIva19)).toBe(15200); // G1: hoy da 13.680
  });

  it('mixto: 1 normal + 1 promo(20%) + código 10% → IVA = 32.300 (ORACLE)', () => {
    const pedido: any = {
      carrito: [linea(productoBase()), linea(productoEnPromo())],
      porceDescuento: 10,
    };
    const r = service.checkIVAPrice(pedido);
    // Normal: 100k*0.19*(1-0.10)=17.100 ; Promo: 80k*0.19*1=15.200 → 32.300
    expect(Math.round(r.totalIva19)).toBe(32300); // G1: hoy da 30.780
  });

  it('G2: código envío gratis excluye el IVA de envío del desglose', () => {
    // Stub de envío con IVA (11.900 con IVA al 19% → 1.900 de IVA de envío).
    const util: any = TestBed.inject(PedidosUtilService);
    util.getShippingTaxCostInvoice = () => 11900;
    util.getShippingTaxValueInvoice = () => '19';

    // Control (sin envío gratis): el IVA de envío SÍ suma → 19.000 + 1.900 = 20.900.
    const control: any = { carrito: [linea(productoBase())], porceDescuento: 0 };
    expect(Math.round(service.checkIVAPrice(control).totalIva19)).toBe(20900);

    // Con envío gratis: el IVA de envío se excluye → 19.000.
    const gratis: any = {
      carrito: [linea(productoBase())],
      porceDescuento: 0,
      descuentoAplicado: { tipo: 'envio_gratis' },
    };
    expect(Math.round(service.checkIVAPrice(gratis).totalIva19)).toBe(19000);
  });
});
