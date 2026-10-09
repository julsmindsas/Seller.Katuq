import { ConfProductToCartComponent } from './conf-product-to-cart.component';

/**
 * Ticket 1158 (ALMARA): "el producto ALM-4240 no tiene opción de recoger en tienda". Era la configuración del
 * producto (tipo de entrega "SOLO DOMICILIO"), pero la pantalla solo mostraba una lista con una opción y nada
 * explicaba por qué. Ahora, cuando el producto ofrece una sola forma y la empresa tiene más, lo dice.
 */
function crear(formasProducto: any[] | undefined, formasEmpresa: any[] | undefined, tipoEntrega?: string): any {
  const componente: any = Object.create(ConfProductToCartComponent.prototype);
  componente.formasEntregaProducto = formasProducto;
  componente.formasEntrega = formasEmpresa;
  componente.producto = tipoEntrega ? { disponibilidad: { tipoEntrega } } : {};
  return componente;
}

const DOMICILIO = { nombre: 'Envío a Domicilio' };
const RECOGE = { nombre: 'Recoge en Tienda' };

describe('ConfProductToCartComponent.avisoFormaEntregaUnica (ticket 1158)', () => {
  it('con una sola forma y más formas en la empresa, explica el tipo de entrega del producto', () => {
    const aviso = crear([DOMICILIO], [DOMICILIO, RECOGE], 'SOLO DOMICILIO').avisoFormaEntregaUnica;

    expect(aviso).toContain('«Envío a Domicilio»');
    expect(aviso).toContain('«SOLO DOMICILIO»');
    expect(aviso).toContain('Disponibilidad');
  });

  it('con varias formas no avisa nada', () => {
    expect(crear([DOMICILIO, RECOGE], [DOMICILIO, RECOGE], 'ENVIO A DOMICILIO Y RECOGE').avisoFormaEntregaUnica).toBe('');
  });

  it('si la empresa solo tiene una forma de entrega, no hay nada que explicar', () => {
    expect(crear([DOMICILIO], [DOMICILIO], 'SOLO DOMICILIO').avisoFormaEntregaUnica).toBe('');
  });

  it('sin formas, sin catálogo o sin tipo de entrega no avisa (la pantalla ya tiene su propio aviso)', () => {
    expect(crear([], [DOMICILIO, RECOGE], 'x').avisoFormaEntregaUnica).toBe('');
    expect(crear(undefined, undefined, 'x').avisoFormaEntregaUnica).toBe('');
    expect(crear([DOMICILIO], [DOMICILIO, RECOGE]).avisoFormaEntregaUnica).toBe('');
  });
});
