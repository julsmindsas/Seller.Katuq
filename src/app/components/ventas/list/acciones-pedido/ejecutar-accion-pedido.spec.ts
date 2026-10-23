import { ListOrdersComponent } from '../list.component';
import { PLAN_ACCIONES } from './acciones-pedido.plan';

/**
 * D-547 (F1, tarea 4.2): `ejecutarAccionPedido` hace lo que hacía cada botón del modal de hoy: llama al método
 * con su plantilla y cierra el modal DESPUÉS solo si el plan lo dice. Se prueba sin TestBed (como
 * `list.component.codigo-descuento.spec.ts`): solo se necesitan los colaboradores del flujo.
 */
function crearListado(): any {
  const listado: any = Object.create(ListOrdersComponent.prototype);
  listado.llamadas = [] as any[];
  listado.closeOptionsModal = jasmine.createSpy('closeOptionsModal').and.callFake(() => listado.llamadas.push(['closeOptionsModal']));
  // Las plantillas (ViewChild) se reemplazan por marcas reconocibles.
  for (const t of ['modalContent', 'clientes', 'notas', 'datosEnrega', 'datosFacturacion', 'cambioEstadoPago', 'recompra', 'pagos', 'descuento', 'editarDescuento']) {
    listado[t + 'Ref'] = { plantilla: t };
  }
  listado.modalContentRef = { plantilla: 'modalContent' };
  listado.clientesModalRef = { plantilla: 'clientesModal' };
  listado.notasModalRef = { plantilla: 'notasModal' };
  listado.datosEnregaModalRef = { plantilla: 'datosEnregaModal' };
  listado.datosFacturacionModalRef = { plantilla: 'datosFacturacionModal' };
  listado.cambioEstadoPagoModalRef = { plantilla: 'cambioEstadoPagoModal' };
  listado.recompraModalRef = { plantilla: 'recompraModal' };
  listado.pagosModalRef = { plantilla: 'pagosModal' };
  listado.descuentoModalRef = { plantilla: 'descuentoModal' };
  listado.editarDescuentoModalRef = { plantilla: 'editarDescuentoModal' };
  // Todos los métodos del plan registran su llamada en lugar de ejecutarse.
  const nombres = new Set<string>();
  for (const paso of Object.values(PLAN_ACCIONES)) { if (!paso.envuelve) nombres.add(paso.metodo); for (const e of paso.envuelve || []) nombres.add(e); }
  nombres.delete('marcarOQuitarRevision');
  nombres.forEach((m) => { listado[m] = (...args: any[]) => listado.llamadas.push([m, ...args]); });
  return listado;
}
const pedido: any = { _id: 'p1', nroPedido: 'ALM-1' };

describe('ListOrdersComponent.ejecutarAccionPedido (D-547)', () => {
  it('PDF del pedido llama pdfOrder(modalContent, pedido) y cierra el modal después', () => {
    const l = crearListado();
    l.ejecutarAccionPedido('orderPdf', pedido);
    expect(l.llamadas).toEqual([['pdfOrder', { plantilla: 'modalContent' }, pedido], ['closeOptionsModal']]);
  });

  it('Editar cliente y Notas no cierran el modal (lo cierra el propio método)', () => {
    const l = crearListado();
    l.ejecutarAccionPedido('editCustomer', pedido);
    l.ejecutarAccionPedido('notes', pedido);
    expect(l.llamadas).toEqual([
      ['editDatosClientes', { plantilla: 'clientesModal' }, pedido],
      ['editNotas', { plantilla: 'notasModal' }, pedido],
    ]);
    expect(l.closeOptionsModal).not.toHaveBeenCalled();
  });

  it('PDF DIAN pasa el segundo argumento y las acciones sin plantilla solo reciben el pedido', () => {
    const l = crearListado();
    l.ejecutarAccionPedido('dianPdf', pedido);
    l.ejecutarAccionPedido('history', pedido);
    expect(l.llamadas).toEqual([
      ['descargarArtefactoDian', pedido, 'pdf'], ['closeOptionsModal'],
      ['verHistorialPedido', pedido], ['closeOptionsModal'],
    ]);
  });

  it('Marcar revisión llama marcarComoRevisado, y quitarRevision si el pedido ya está revisado', () => {
    const l = crearListado();
    l.marcarComoRevisado = (o: any) => l.llamadas.push(['marcarComoRevisado', o]);
    l.quitarRevision = (o: any) => l.llamadas.push(['quitarRevision', o]);
    l.ejecutarAccionPedido('reviewMark', pedido);
    const revisado = { ...pedido, revisadoParaProduccion: true };
    l.ejecutarAccionPedido('reviewMark', revisado);
    expect(l.llamadas).toEqual([
      ['marcarComoRevisado', pedido], ['closeOptionsModal'],
      ['quitarRevision', revisado], ['closeOptionsModal'],
    ]);
  });

  it('cada acción del plan llama a su método con la plantilla del plan', () => {
    for (const [id, paso] of Object.entries(PLAN_ACCIONES)) {
      if (paso.envuelve) continue;
      const l = crearListado();
      l.ejecutarAccionPedido(id, pedido);
      const [metodo, ...args] = l.llamadas[0];
      expect(metodo).toBe(paso.metodo);
      expect(args[args.length - (paso.argumentoExtra ? 2 : 1)]).toBe(pedido);
      expect(args.length).toBe((paso.plantilla ? 1 : 0) + 1 + (paso.argumentoExtra ? 1 : 0));
      expect(l.closeOptionsModal).toHaveBeenCalledTimes(paso.cerrar ? 1 : 0);
    }
  });

  it('sin pedido o con una acción sin plan no hace nada', () => {
    const l = crearListado();
    l.ejecutarAccionPedido('orderPdf', null);
    l.ejecutarAccionPedido('electronicInvoice', pedido);
    expect(l.llamadas).toEqual([]);
  });
});

describe('ListOrdersComponent.estadosAccionesDe (D-547)', () => {
  function listado(): any {
    const l: any = Object.create(ListOrdersComponent.prototype);
    l.isFromProduction = false;
    l.accionesPrecioPedido = [];
    l.canEditDeliveryAddressByDeliveryType = () => true;
    l.canEditBilling = () => true;
    l.canAddProducts = () => true;
    l.canModifyProducts = () => true;
    l.isAdminUser = () => false;
    l.canAssignSeller = () => true;
    l.isPedidoPOS = () => false;
    l.canDeleteOrder = () => false;
    l.checkIfUserIsBrenda = () => false;
    l.puedeFacturarSiigo = () => false;
    l.puedeRefacturar = () => false;
    l.puedeLiberarFactura = () => false;
    l.esFacturaDian = () => false;
    return l;
  }

  it('devuelve el mismo objeto mientras nada cambie (el binding OnPush del modal no ve uno nuevo en cada ciclo)', () => {
    const l = listado();
    const a = l.estadosAccionesDe({ estadoProceso: 'Pendiente' });
    const b = l.estadosAccionesDe({ estadoProceso: 'Pendiente' });
    expect(a).toBe(b);
  });

  it('devuelve otro cuando cambia un dato del pedido o llega la lista de precio', () => {
    const l = listado();
    const a = l.estadosAccionesDe({ estadoProceso: 'Pendiente' });
    const b = l.estadosAccionesDe({ estadoProceso: 'Despachado' });
    expect(b).not.toBe(a);
    expect(b.delivery.visible).toBeTrue();
    l.accionesPrecioPedido = [{ id: 'correctPrice', habilitada: true }];
    const c = l.estadosAccionesDe({ estadoProceso: 'Despachado' });
    expect(c).not.toBe(b);
    expect(c.correctPrice.visible).toBeTrue();
  });

  it('usa los métodos de hoy: congelado, POS y desde Producción', () => {
    const l = listado();
    l.canAddProducts = () => false;
    l.isPedidoPOS = () => true;
    const e = l.estadosAccionesDe({ estadoProceso: 'Despachado' });
    expect(e.editProducts.motivo).toBe('Congelado · Despachado');
    expect(e.notes.motivo).toBe('No aplica a pedidos POS');
    l.isFromProduction = true;
    expect(l.estadosAccionesDe({ estadoProceso: 'Despachado' }).editProducts.visible).toBeFalse();
  });
});
