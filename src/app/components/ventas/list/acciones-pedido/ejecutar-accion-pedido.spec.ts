import { Subject, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
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
  // D-547 (F2, 11.4): el conteo de uso (sin estado cargado no hace nada, como con la bandera apagada).
  listado.orderActions = { registrarUso: jasmine.createSpy('registrarUso') };
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

  it('cuenta el uso de las 16 fijas al ejecutarlas, y de ninguna otra (D-547 F2, 11.4)', () => {
    const l = crearListado();
    l.ejecutarAccionPedido('payments', pedido);
    l.ejecutarAccionPedido('dianPdf', pedido);
    l.ejecutarAccionPedido('deleteOrder', pedido);
    expect(l.orderActions.registrarUso.calls.allArgs()).toEqual([['payments']]);
  });

  it('una acción sin plan o sin pedido no se cuenta', () => {
    const l = crearListado();
    l.ejecutarAccionPedido('orderPdf', null);
    l.ejecutarAccionPedido('electronicInvoice', pedido);
    expect(l.orderActions.registrarUso).not.toHaveBeenCalled();
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

describe('ListOrdersComponent.fijarAccionDelModal (D-547 F2, 11.3)', () => {
  const GENERAL = ['orderPdf', 'salesOrder', 'editCustomer', 'billingData'];

  function listado(pinned: string[] = [], bandera = true): any {
    const l: any = Object.create(ListOrdersComponent.prototype);
    l.isFromProduction = false;
    l.destroy$ = new Subject<void>();
    l.guardandoPines = false;
    l.delRolMemo = { de: undefined, valor: [] };
    l.companyFeatures = { isEnabled: () => bandera };
    l.orderActions = {
      estado: { role: { profile: 'general', actions: GENERAL }, pinned, dismissed: {}, lastSuggestionAt: '', usageDays: {} },
      guardarPines: jasmine.createSpy('guardarPines').and.callFake((lista: string[]) => of(lista)),
    };
    l.toastrService = { error: jasmine.createSpy('error') };
    return l;
  }

  it('fijar con espacio libre guarda la lista con la nueva al final', () => {
    const l = listado(['payments']);
    l.fijarAccionDelModal({ id: 'discount', fijar: true });
    expect(l.orderActions.guardarPines).toHaveBeenCalledOnceWith(['payments', 'discount']);
  });

  it('soltar quita el pin de la lista', () => {
    const l = listado(['payments', 'notes']);
    l.fijarAccionDelModal({ id: 'payments', fijar: false });
    expect(l.orderActions.guardarPines).toHaveBeenCalledOnceWith(['notes']);
  });

  it('las del rol no se sueltan ni se vuelven a fijar', () => {
    const l = listado(['payments']);
    l.fijarAccionDelModal({ id: 'orderPdf', fijar: false });
    l.fijarAccionDelModal({ id: 'orderPdf', fijar: true });
    expect(l.orderActions.guardarPines).not.toHaveBeenCalled();
  });

  it('con la bandera apagada no hace nada', () => {
    const l = listado([], false);
    l.fijarAccionDelModal({ id: 'payments', fijar: true });
    expect(l.orderActions.guardarPines).not.toHaveBeenCalled();
  });

  it('con 4 fijadas pregunta cuál reemplazar con un Swal de opciones (radio) y no guarda hasta confirmar', () => {
    const l = listado(['payments', 'notes', 'history', 'cleanNotes']);
    const fire = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: false } as any));
    l.fijarAccionDelModal({ id: 'discount', fijar: true });
    const o: any = fire.calls.mostRecent().args[0];
    expect(o.input).toBe('radio');
    expect(Object.keys(o.inputOptions)).toEqual(['payments', 'notes', 'history', 'cleanNotes']);
    expect(o.showCancelButton).toBeTrue();
    expect(l.orderActions.guardarPines).not.toHaveBeenCalled();
  });

  it('al confirmar, la nueva queda en el lugar de la que sale', async () => {
    const l = listado(['payments', 'notes', 'history', 'cleanNotes']);
    const fire = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    l.fijarAccionDelModal({ id: 'discount', fijar: true });
    const o: any = fire.calls.mostRecent().args[0];
    await o.preConfirm('notes');
    expect(l.orderActions.guardarPines).toHaveBeenCalledOnceWith(['payments', 'discount', 'history', 'cleanNotes']);
  });

  it('si falla al guardar avisa y la bandera de guardando se libera', () => {
    const l = listado(['payments']);
    l.orderActions.guardarPines.and.returnValue(throwError(() => new Error('red')));
    l.fijarAccionDelModal({ id: 'discount', fijar: true });
    expect(l.toastrService.error).toHaveBeenCalledOnceWith('No pudimos guardar tus acciones. Intenta de nuevo.', 'Acciones del pedido');
    expect(l.guardandoPines).toBeFalse();
  });

  it('mientras se guarda un pin no acepta otro toque', () => {
    const l = listado(['payments']);
    l.orderActions.guardarPines.and.returnValue(new Subject());
    l.fijarAccionDelModal({ id: 'discount', fijar: true });
    l.fijarAccionDelModal({ id: 'notes', fijar: true });
    expect(l.orderActions.guardarPines).toHaveBeenCalledTimes(1);
  });
});

describe('ListOrdersComponent: conteo de uso en el «⋯» de cada fila (D-547 F2, 11.4)', () => {
  function listado(): any {
    const l: any = Object.create(ListOrdersComponent.prototype);
    l.orderActions = { registrarUso: jasmine.createSpy('registrarUso') };
    return l;
  }

  it('las entradas con el título de una fija cuentan su uso y ejecutan lo mismo que antes', () => {
    const l = listado();
    const llamadas: string[] = [];
    const items: any[] = [
      { label: 'PDF del pedido', command: () => llamadas.push('pdf') },
      { label: 'Duplicar', command: () => llamadas.push('duplicar') },
      { label: 'Notas', command: () => llamadas.push('notas') },
      { label: 'Facturar', command: () => llamadas.push('facturar') },
      { separator: true },
      { label: 'Más opciones...', command: () => llamadas.push('mas') },
    ];
    const conteo: any[] = l.conConteoDeUso(items);
    expect(conteo.length).toBe(items.length);
    conteo.forEach((i: any) => i.command && i.command({}));
    expect(llamadas).toEqual(['pdf', 'duplicar', 'notas', 'facturar', 'mas']);
    expect(l.orderActions.registrarUso.calls.allArgs()).toEqual([['orderPdf'], ['duplicate'], ['notes']]);
  });

  it('las que no son fijas (Facturar, DIAN, Cereza, Más opciones) quedan intactas', () => {
    const l = listado();
    const item = { label: 'Estado DIAN', command: () => {} };
    expect(l.conConteoDeUso([item])[0]).toBe(item);
  });
});

describe('ListOrdersComponent: sugerencia de fijar (D-547 F2, 11.4)', () => {
  const GENERAL = ['orderPdf', 'salesOrder', 'editCustomer', 'billingData'];

  function listado(me: any = {}, bandera = true): any {
    const l: any = Object.create(ListOrdersComponent.prototype);
    l.isFromProduction = false;
    l.destroy$ = new Subject<void>();
    l.guardandoPines = false;
    l.sugerenciaPedido = null;
    l.sugerenciaEvaluada = false;
    l.delRolMemo = { de: undefined, valor: [] };
    l.ochoMemo = { de: null, valor: [] };
    l.companyFeatures = { isEnabled: () => bandera };
    const estado = { role: { profile: 'general', actions: GENERAL }, pinned: [], dismissed: {}, lastSuggestionAt: '', usageDays: {}, ...me };
    l.orderActions = {
      estado,
      registrarSugerencia: jasmine.createSpy('registrarSugerencia').and.returnValue(of(undefined)),
      guardarPines: jasmine.createSpy('guardarPines').and.callFake((lista: string[]) => of(lista)),
    };
    l.toastrService = { error: jasmine.createSpy('error') };
    return l;
  }

  it('al abrir el primer pedido con una candidata la muestra y avisa «shown» una sola vez', () => {
    const l = listado({ usageDays: { payments: 4 } });
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-26T15:00:00Z'));
    try {
      l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
      l.seleccionarPedidoDetalle({ nroPedido: 'A-2' });
    } finally { jasmine.clock().uninstall(); }
    expect(l.sugerenciaPedido).toBe('payments');
    expect(l.sugerenciaVisible).toBe('payments');
    expect(l.orderActions.registrarSugerencia).toHaveBeenCalledOnceWith('payments', 'shown');
  });

  it('sin candidata no muestra nada ni avisa', () => {
    const l = listado({ usageDays: { payments: 2 } });
    l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
    expect(l.sugerenciaVisible).toBeNull();
    expect(l.orderActions.registrarSugerencia).not.toHaveBeenCalled();
  });

  it('con la bandera apagada no evalúa nada', () => {
    const l = listado({ usageDays: { payments: 5 } }, false);
    l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
    expect(l.sugerenciaVisible).toBeNull();
    expect(l.orderActions.registrarSugerencia).not.toHaveBeenCalled();
  });

  it('si el estado aún no llegó, lo intenta de nuevo en el siguiente pedido', () => {
    const l = listado({ usageDays: { payments: 5 } });
    const estado = l.orderActions.estado;
    l.orderActions.estado = null;
    l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
    expect(l.sugerenciaVisible).toBeNull();
    l.orderActions.estado = estado;
    l.seleccionarPedidoDetalle({ nroPedido: 'A-2' });
    expect(l.sugerenciaPedido).toBe('payments');
  });

  it('desaparece si el usuario ya la fijó por su cuenta (el estado trae el pin)', () => {
    const l = listado({ usageDays: { payments: 5 } });
    l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
    expect(l.sugerenciaVisible).toBe('payments');
    l.orderActions.estado = { ...l.orderActions.estado, pinned: ['payments'] };
    expect(l.sugerenciaVisible).toBeNull();
  });

  it('«Fijar» hace lo mismo que el pin: guarda la lista con la acción', () => {
    const l = listado({ usageDays: { payments: 5 } });
    l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
    l.fijarSugerencia('payments');
    expect(l.orderActions.guardarPines).toHaveBeenCalledOnceWith(['payments']);
  });

  it('«Ahora no» manda «dismissed» y retira el aviso', () => {
    const l = listado({ usageDays: { payments: 5 } });
    l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
    l.rechazarSugerencia('payments');
    expect(l.orderActions.registrarSugerencia).toHaveBeenCalledWith('payments', 'dismissed');
    expect(l.sugerenciaPedido).toBeNull();
  });

  it('si «Ahora no» no se pudo guardar, el aviso sigue y se avisa', () => {
    const l = listado({ usageDays: { payments: 5 } });
    l.seleccionarPedidoDetalle({ nroPedido: 'A-1' });
    l.orderActions.registrarSugerencia.and.returnValue(throwError(() => new Error('red')));
    l.rechazarSugerencia('payments');
    expect(l.sugerenciaPedido).toBe('payments');
    expect(l.toastrService.error).toHaveBeenCalledOnceWith('No pudimos guardar tus acciones. Intenta de nuevo.', 'Acciones del pedido');
  });
});
