import { of, Subject } from 'rxjs';
import { DespachosComponent } from './despachos.component';

/**
 * Ticket 1160 (ALMARA, orden 3590): se crea una orden por "Mensajero propio", la ventana sigue abierta,
 * se cambia a Transportadora y se guarda. El backend respondía "Uno o más pedidos ya están en una orden
 * de envío activa ... (orden 3590)": la que acababa de crearse.
 *
 * Causa: el backend distingue crear de editar por \`cd\` (el id de la orden). Al crear devuelve \`id\`, pero el
 * front solo guardaba el número de la orden, así que el segundo guardado salía sin \`cd\` y se tomaba como
 * una orden nueva con pedidos que ya estaban en la 3590.
 *
 * Se prueba sin TestBed: solo se necesitan los pocos campos y servicios que toca el flujo.
 */
function crearDespachos(respuestaCrear: any = { nroShippingOrder: '3590', id: 'docOrden3590' }): any {
  const componente: any = Object.create(DespachosComponent.prototype);
  componente.nroShippingOrder = null;
  componente.nuevaOrdenEnvio = null;
  componente.pedidosSeleccionados = [{ _id: 'p1', nroPedido: 'DAD-014133' }];
  componente.transportadorSeleccionado = '';
  componente.triggerResetSavingCounter = 0;
  componente.destroy$ = new Subject<void>();
  componente.modalService = { dismissAll: () => {} };
  componente.refrescarDatos = () => {};
  componente.despacharOrden = () => {};
  componente.ordenesDespachoV2Component = null;
  // Lo que viaja al backend se fotografía al llamar: el componente muta el mismo objeto al recibir la respuesta.
  componente.enviados = [];
  componente.logisticaService = {
    createShippingOrder: jasmine.createSpy('createShippingOrder').and.callFake((orden: any) => {
      componente.enviados.push(JSON.parse(JSON.stringify(orden)));
      return of(respuestaCrear);
    }),
  };
  return componente;
}

describe('DespachosComponent — la orden recién creada recuerda su cd (ticket 1160)', () => {
  it('recordarOrdenCreada guarda el número de la orden y su id como cd', () => {
    const componente = crearDespachos();
    componente.nuevaOrdenEnvio = { id: '', nroShippingOrder: '' };

    componente.recordarOrdenCreada({ nroShippingOrder: '3590', id: 'docOrden3590' });

    expect(componente.nroShippingOrder).toBe('3590');
    expect(componente.nuevaOrdenEnvio.nroShippingOrder).toBe('3590');
    expect(componente.nuevaOrdenEnvio.cd).toBe('docOrden3590');
  });

  it('no pisa un cd que la orden ya traía', () => {
    const componente = crearDespachos();
    componente.nuevaOrdenEnvio = { cd: 'original', nroShippingOrder: '3590' };

    componente.recordarOrdenCreada({ nroShippingOrder: '3590', id: 'otro' });

    expect(componente.nuevaOrdenEnvio.cd).toBe('original');
  });

  it('una respuesta sin id o vacía no rompe nada', () => {
    const componente = crearDespachos();
    componente.nuevaOrdenEnvio = { nroShippingOrder: '' };

    componente.recordarOrdenCreada(null);
    componente.recordarOrdenCreada({ nroShippingOrder: '12' });

    expect(componente.nroShippingOrder).toBe('12');
    expect(componente.nuevaOrdenEnvio.cd).toBeUndefined();
  });

  it('crear la orden y guardarla otra vez (cambio a transportadora) manda el cd: el backend la edita, no la crea de nuevo', () => {
    const componente = crearDespachos();

    // Primer guardado: "Mensajero propio" crea la orden 3590.
    componente.onGuardarYDespacharOrden({ metodoEnvio: 'mensajero', pedidosMovidos: [], fechaInicio: '2026-10-09' });
    const primera = componente.enviados[0];
    expect(primera.cd).toBeUndefined();
    expect(componente.nroShippingOrder).toBe('3590');

    // Segundo guardado en la misma ventana: ahora a Transportadora.
    componente.onSubmitOrdenEnvio({ metodoEnvio: 'transportadora', transportadora: 'Servientrega', pedidos: componente.pedidosSeleccionados, pedidosMovidos: [], fechaInicio: '2026-10-09' });
    const segunda = componente.enviados[1];
    expect(componente.enviados.length).toBe(2);

    expect(segunda.cd).toBe('docOrden3590');
    expect(segunda.nroShippingOrder).toBe('3590');
    expect(segunda.metodoEnvio).toBe('transportadora');
  });
});
