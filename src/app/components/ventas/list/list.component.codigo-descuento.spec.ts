import { of, throwError } from 'rxjs';
import { ListOrdersComponent } from './list.component';

/**
 * Ticket 1161 (ALMACEN BOMBAS, pedido BAS-000034): "Aplicar Descuento" en un pedido ya creado
 * respondía "Cupón no válido" con DIST25, un código que la empresa sí creó (Descuentos y
 * Promociones: 25 %, todos los productos). El modal solo consultaba la colección vieja `cupones`.
 *
 * Se prueba sin TestBed: solo se necesitan los colaboradores que usa el flujo.
 */
function crearListado(opciones: { aplicar?: any; legacy?: any; envio?: number } = {}): any {
  const listado: any = Object.create(ListOrdersComponent.prototype);
  listado.treasuryService = { treasuryEnabledCached: false };
  listado.pedidoUtilService = {
    pedido: null,
    getDiscount: () => (listado.pedidoUtilService.pedido?.porceDescuento ? 25000 : (listado.pedidoUtilService.pedido?.descuentoAplicado?.montoDescuento || 0)),
    getSubtotal: () => 100000,
    precioLineaConIvaNeto: (item: any) => (Number(item?.cantidad) || 0) * 119000,
    getShippingCost: () => opciones.envio ?? 0,
  };
  listado.sincronizarFormaEntrega = () => {};
  listado.checkIVAPrice = () => ({});
  listado.ivaCalculadoOGuardado = () => 0;
  listado.allBillingZone = [];
  listado.ventasService = {
    aplicarCodigoDescuento: jasmine.createSpy('aplicarCodigoDescuento').and.callFake(() => opciones.aplicar),
    validateCupon: jasmine.createSpy('validateCupon').and.callFake(() => opciones.legacy),
  };
  listado.toastrService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
  listado.editOrder = jasmine.createSpy('editOrder');
  listado.codigoDescuentoIngresado = 'dist25';
  listado.errorCodigoDescuento = '';
  return listado;
}

const pedido = (extra: any = {}): any => ({
  nroPedido: 'BAS-000034',
  cliente: { documento: '900123456' },
  carrito: [{ producto: { identificacion: { referencia: 'GOULDS-1' }, precio: { precioUnitarioConIva: 119000 } }, cantidad: 1, configuracion: {} }],
  ...extra,
});

const DIST25 = { descuentoId: 'NCRU', codigoPersonalizado: 'DIST25', tipo: 'porcentaje', valor: 25, montoDescuento: 25000, aplicaA: 'todos_los_productos', nombre: 'DIST25' };

describe('ListOrdersComponent.validarYAplicarDescuento — códigos de Descuentos y Promociones (ticket 1161)', () => {
  it('aplica un código del módulo nuevo (DIST25) al pedido y lo guarda', () => {
    const listado = crearListado({ aplicar: of(DIST25) });
    const p = pedido();

    listado.validarYAplicarDescuento(p);

    expect(listado.errorCodigoDescuento).toBe('');
    expect(p.porceDescuento).toBe(25);
    expect(p.cuponAplicado).toBe('DIST25');
    expect(p.descuentoAplicado.descuentoId).toBe('NCRU');
    expect(listado.editOrder).toHaveBeenCalledWith(p);
    expect(listado.ventasService.validateCupon).not.toHaveBeenCalled();
    expect(listado.validandoDescuento).toBe(false);
  });

  it('le manda al backend el código escrito, el cliente y las líneas del pedido', () => {
    const listado = crearListado({ aplicar: of(DIST25) });

    listado.validarYAplicarDescuento(pedido());

    const solicitud = listado.ventasService.aplicarCodigoDescuento.calls.mostRecent().args[0];
    expect(solicitud.codigoPersonalizado).toBe('dist25');
    expect(solicitud.clienteId).toBe('900123456');
    // La base del carrito de la venta asistida: con IVA.
    expect(solicitud.totalCarrito).toBe(119000);
    expect(solicitud.codigosActivos).toEqual([]);
    expect(solicitud.items).toEqual([{ productoReferencia: 'GOULDS-1', categorias: [], precioLinea: 119000, enPromocion: false }]);
  });

  it('si el módulo nuevo no conoce el código (404), prueba con la colección vieja de cupones', () => {
    const listado = crearListado({ aplicar: throwError(() => ({ status: 404 })), legacy: of([{ valor: '10' }]) });
    const p = pedido({ descuentoAplicado: { descuentoId: 'viejo', montoDescuento: 5000 } });

    listado.validarYAplicarDescuento(p);

    expect(listado.ventasService.validateCupon).toHaveBeenCalledWith({ code: 'dist25' });
    expect(p.porceDescuento).toBe(10);
    // null y no undefined: con undefined Firestore conserva el código anterior y reaparece.
    expect(p.descuentoAplicado).toBeNull();
    expect(listado.editOrder).toHaveBeenCalled();
  });

  it('si tampoco está en la colección vieja, avisa que no es válido y no guarda nada', () => {
    const listado = crearListado({ aplicar: throwError(() => ({ status: 404 })), legacy: of([]) });

    listado.validarYAplicarDescuento(pedido());

    expect(listado.errorCodigoDescuento).toBe('Cupón no válido');
    expect(listado.editOrder).not.toHaveBeenCalled();
    expect(listado.validandoDescuento).toBe(false);
  });

  it('un rechazo del módulo nuevo (vencido, agotado, monto mínimo) muestra su motivo y no prueba con los cupones viejos', () => {
    const listado = crearListado({
      aplicar: throwError(() => ({ status: 400, error: { message: 'Este código está fuera de su período de vigencia' } })),
    });

    listado.validarYAplicarDescuento(pedido());

    expect(listado.errorCodigoDescuento).toBe('Este código está fuera de su período de vigencia');
    expect(listado.ventasService.validateCupon).not.toHaveBeenCalled();
    expect(listado.editOrder).not.toHaveBeenCalled();
    expect(listado.validandoDescuento).toBe(false);
  });

  it('el mismo código que el pedido ya tiene no se redime otra vez', () => {
    const listado = crearListado({ aplicar: of(DIST25) });
    const p = pedido({ descuentoAplicado: { descuentoId: 'NCRU', codigoPersonalizado: 'DIST25', montoDescuento: 29750 } });

    listado.validarYAplicarDescuento(p);

    expect(listado.errorCodigoDescuento).toBe('Este pedido ya tiene el código DIST25 aplicado');
    expect(listado.ventasService.aplicarCodigoDescuento).not.toHaveBeenCalled();
    expect(listado.editOrder).not.toHaveBeenCalled();
  });

  it('un código nuevo reemplaza al que el pedido ya traía', () => {
    const listado = crearListado({ aplicar: of({ ...DIST25, descuentoId: 'otro', codigoPersonalizado: 'DIST10', valor: 10, montoDescuento: 11900 }) });
    const p = pedido({ descuentoAplicado: { descuentoId: 'NCRU', codigoPersonalizado: 'DIST25', montoDescuento: 29750 } });
    listado.codigoDescuentoIngresado = 'DIST10';

    listado.validarYAplicarDescuento(p);

    expect(p.descuentoAplicado.descuentoId).toBe('otro');
    expect(p.porceDescuento).toBe(10);
  });

  it('sin código escrito no llama al backend', () => {
    const listado = crearListado();
    listado.codigoDescuentoIngresado = '   ';

    listado.validarYAplicarDescuento(pedido());

    expect(listado.errorCodigoDescuento).toBe('Por favor ingrese un código de cupón');
    expect(listado.ventasService.aplicarCodigoDescuento).not.toHaveBeenCalled();
  });
});

describe('ListOrdersComponent.actualizarValoresPedido — envío gratis (ticket 1161)', () => {
  const conDomicilio = (extra: any = {}): any => ({
    carrito: [{ configuracion: { datosEntrega: { formaEntrega: 'Domicilio' } } }],
    envio: { zonaCobro: 'Zona 1' },
    ...extra,
  });

  it('un código de envío gratis lleva el envío a cero', () => {
    const listado = crearListado({ envio: 12000 });
    const p = listado.actualizarValoresPedido(conDomicilio({ descuentoAplicado: { tipo: 'envio_gratis', descuentoId: 'e' } }));

    expect(p.totalEnvio).toBe(0);
  });

  it('sin el código, el envío sigue saliendo de la zona de cobro', () => {
    const listado = crearListado({ envio: 12000 });
    const p = listado.actualizarValoresPedido(conDomicilio());

    expect(p.totalEnvio).toBe(12000);
  });
});

describe('ListOrdersComponent.guardarCambiosDescuento — el código se borra de verdad (ticket 1161)', () => {
  const editar = (pedidoGuardado: any, porcentaje: number): any => {
    const listado = crearListado();
    listado.orders = [pedidoGuardado];
    listado.pedidoDescuentoEditando = pedidoGuardado;
    listado.nuevoPorcentajeDescuento = porcentaje;
    listado.recalcularEnvioYTotalizarPedido = () => {};
    listado.modalService = { dismissAll: () => {} };
    listado.refrescarDatos = () => {};
    listado.ventasService.editOrder = jasmine.createSpy('editOrder').and.returnValue(of({}));
    listado.guardarCambiosDescuento();
    return listado;
  };

  const conCodigo = (tipo: string, valor: number) =>
    pedido({ _id: 'o1', porceDescuento: tipo === 'porcentaje' ? valor : 0, cuponAplicado: 'X', descuentoAplicado: { descuentoId: 'd', codigoPersonalizado: 'X', tipo, valor, montoDescuento: 1000 } });

  it('al quitar el descuento (0 %) el código queda en null, que sí se guarda (undefined se pierde en el JSON)', () => {
    const p = conCodigo('porcentaje', 25);
    editar(p, 0);

    expect(p.descuentoAplicado).toBeNull();
    expect(p.cuponAplicado).toBeNull();
    expect(JSON.stringify(p)).toContain('"descuentoAplicado":null');
  });

  it('un código fijo o de envío gratis se puede quitar con 0 %', () => {
    const p = conCodigo('valor_fijo', 20000);
    editar(p, 0);

    expect(p.descuentoAplicado).toBeNull();
  });

  it('un porcentaje distinto al del código lo reemplaza: el código ya no describe el descuento', () => {
    const p = conCodigo('porcentaje', 25);
    editar(p, 10);

    expect(p.descuentoAplicado).toBeNull();
    expect(p.porceDescuento).toBe(10);
  });

  it('el mismo porcentaje del código deja el código como estaba', () => {
    const p = conCodigo('porcentaje', 25);
    editar(p, 25);

    expect(p.descuentoAplicado).not.toBeNull();
    expect(p.descuentoAplicado.descuentoId).toBe('d');
  });
});
