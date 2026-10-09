import { ListOrdersComponent } from './list.component';
import { EstadoPago } from '../modelo/pedido';

/**
 * Ticket 1156 (ALMARA, pedido DAD-014154): Ana asentó $54.000 por Nequi (queda "Pendiente" de
 * verificación y el pedido en Pospendiente) y 40 s después guardó la tarjeta. Al editar el
 * carrito, actualizarValoresPedido contó el Nequi en revisión como anticipo, mandó el pedido
 * como "Aprobado" y el guard de Tesorería lo bloqueó con el aviso "El estado de pago no
 * cambió", aunque ella no tocó el pago.
 *
 * Se prueba sin TestBed: solo se necesitan los pocos colaboradores que usa el recálculo.
 */
function crearListado(tesoreriaActiva: boolean | null): any {
  const listado: any = Object.create(ListOrdersComponent.prototype);
  listado.treasuryService = { treasuryEnabledCached: tesoreriaActiva };
  listado.pedidoUtilService = { pedido: null, getDiscount: () => 0, getSubtotal: () => 54000 };
  listado.sincronizarFormaEntrega = () => {};
  listado.checkIVAPrice = () => ({});
  listado.ivaCalculadoOGuardado = () => 0;
  listado.allBillingZone = [];
  return listado;
}

function pedidoConNequi(estadoPago: EstadoPago, estadoVerificacion: string): any {
  return {
    nroPedido: 'DAD-014154',
    carrito: [],
    estadoPago,
    anticipo: 0,
    faltaPorPagar: 54000,
    PagosAsentados: [{ formaPago: 'Nequi', valor: 54000, estadoVerificacion }],
  };
}

describe('ListOrdersComponent.actualizarValoresPedido — pagos en revisión de Tesorería (ticket 1156)', () => {
  it('con Tesorería activa y un pago por verificar no toca anticipo, saldo ni estado de pago', () => {
    const pedido = crearListado(true).actualizarValoresPedido(pedidoConNequi(EstadoPago.Pospendiente, 'Pendiente'));

    expect(pedido.estadoPago).toBe(EstadoPago.Pospendiente);
    expect(pedido.anticipo).toBe(0);
    expect(pedido.faltaPorPagar).toBe(54000);
  });

  it('con Tesorería activa, un pedido en Pospendiente queda como lo dejó el servidor', () => {
    const pedido = crearListado(true).actualizarValoresPedido(pedidoConNequi(EstadoPago.Pospendiente, 'Aprobado'));

    expect(pedido.estadoPago).toBe(EstadoPago.Pospendiente);
  });

  it('con Tesorería activa y pagos ya verificados sigue recalculando como siempre', () => {
    const pedido = crearListado(true).actualizarValoresPedido(pedidoConNequi(EstadoPago.PreAprobado, 'Aprobado'));

    expect(pedido.anticipo).toBe(54000);
    expect(pedido.faltaPorPagar).toBe(0);
    expect(pedido.estadoPago).toBe(EstadoPago.Aprobado);
  });

  it('sin Tesorería no cambia nada de lo que pasaba', () => {
    const pedido = crearListado(false).actualizarValoresPedido(pedidoConNequi(EstadoPago.Pendiente, 'Pendiente'));

    expect(pedido.anticipo).toBe(54000);
    expect(pedido.estadoPago).toBe(EstadoPago.Aprobado);
  });

  it('si el indicador de Tesorería aún no cargó, se comporta como sin Tesorería', () => {
    const pedido = crearListado(null).actualizarValoresPedido(pedidoConNequi(EstadoPago.Pendiente, 'Pendiente'));

    expect(pedido.anticipo).toBe(54000);
    expect(pedido.estadoPago).toBe(EstadoPago.Aprobado);
  });
});
