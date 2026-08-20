import {
  aplicarPrecioDeLista,
  descuentoVigente,
  filaDeTipoCliente,
  precioEfectivoDeFila,
} from './precio-por-tipo-cliente';

/**
 * D-219 Fase 2 — números reales de la Pijama Holly (GCL230D):
 * público $98.900 con 35% ($64.285) y mayorista $53.900 con 20% ($43.120),
 * igual que cerezamayorista.com.
 */
const MAY = '5liyJ51LZxb5H6CtuTrX';
const PUB = 'djGYj0Eo23EYaamKDcqs';

const pijama = () => ({
  precio: { precioUnitarioConIva: 98900, precioUnitarioSinIva: 83109, precioUnitarioIva: '19' },
  preciosPorTipoCliente: [
    {
      tipoClienteId: PUB, tipoClienteNombre: 'Precio para Público en general', activo: true,
      precioConIva: 98900, precio: 83109, valorIva: 15791, porcentajeIva: 19,
      precioDescuentoConIva: 64285, precioDescuento: 54021, descuentoPorcentaje: 35,
      descuentoHasta: '2027-01-29T23:50:00-05:00',
    },
    {
      tipoClienteId: MAY, tipoClienteNombre: 'Precio a mayoristas', activo: true,
      precioConIva: 53900, precio: 45294, valorIva: 8606, porcentajeIva: 19,
      precioDescuentoConIva: 43120, precioDescuento: 36235, descuentoPorcentaje: 20,
      descuentoHasta: '2027-01-31T23:50:00-05:00',
    },
  ],
});

describe('precio-por-tipo-cliente (D-219)', () => {
  it('el mayorista paga el precio rebajado de SU lista, no el del público', () => {
    const p = aplicarPrecioDeLista(pijama(), MAY);
    expect(p.precio.precioUnitarioConIva).toBe(43120);
    expect(p._descuentoDeLista.precioListaConIva).toBe(53900);
    expect(p._descuentoDeLista.descuentoPorcentaje).toBe(20);
    expect(p._precioAplicadoPorCategoria.tipoClienteId).toBe(MAY);
  });

  it('el público recibe su propia campaña', () => {
    expect(aplicarPrecioDeLista(pijama(), PUB).precio.precioUnitarioConIva).toBe(64285);
  });

  it('guarda el precio de lista sin rebajar para el tachado y para Cereza', () => {
    const p = aplicarPrecioDeLista(pijama(), MAY);
    expect(p._precioAplicadoPorCategoria.precioListaConIva).toBe(53900);
  });

  it('campaña vencida: cobra el precio de lista y no marca descuento', () => {
    const viejo = pijama();
    viejo.preciosPorTipoCliente[1].descuentoHasta = '2020-01-01';
    const p = aplicarPrecioDeLista(viejo, MAY);
    expect(p.precio.precioUnitarioConIva).toBe(53900);
    expect(p._descuentoDeLista).toBeUndefined();
  });

  it('lista sin descuento: precio de lista limpio', () => {
    const sinDesc = pijama();
    sinDesc.preciosPorTipoCliente[1].precioDescuentoConIva = null;
    const p = aplicarPrecioDeLista(sinDesc, MAY);
    expect(p.precio.precioUnitarioConIva).toBe(53900);
    expect(p._descuentoDeLista).toBeUndefined();
  });

  it('cliente sin fila (p.ej. Modelos que Cereza no tiene): producto intacto', () => {
    const p = aplicarPrecioDeLista(pijama(), 'MODELOS-SIN-FILA');
    expect(p.precio.precioUnitarioConIva).toBe(98900);
    expect(p._precioAplicadoPorCategoria).toBeUndefined();
  });

  it('lista manual de Modelos se respeta igual que las de Cereza', () => {
    const conModelos = pijama();
    (conModelos.preciosPorTipoCliente as any[]).push({
      tipoClienteId: 'MOD', tipoClienteNombre: 'Precio especial para modelos', activo: true,
      precioConIva: 47000, precio: 39496, valorIva: 7504, porcentajeIva: 19,
    });
    expect(aplicarPrecioDeLista(conModelos, 'MOD').precio.precioUnitarioConIva).toBe(47000);
  });

  it('deriva el sin-IVA cuando la fila no lo trae', () => {
    const coja = pijama();
    coja.preciosPorTipoCliente[1].precio = 0 as any;
    coja.preciosPorTipoCliente[1].precioDescuento = 0 as any;
    const p = aplicarPrecioDeLista(coja, MAY);
    expect(p.precio.precioUnitarioSinIva).toBe(Math.round((43120 / 1.19) * 100) / 100);
  });

  it('helpers sueltos', () => {
    expect(filaDeTipoCliente(pijama(), MAY)?.precioConIva).toBe(53900);
    expect(filaDeTipoCliente(pijama(), null)).toBeNull();
    expect(descuentoVigente(filaDeTipoCliente(pijama(), MAY))).toBe(true);
    expect(precioEfectivoDeFila(filaDeTipoCliente(pijama(), MAY)!)).toBe(43120);
  });
});
