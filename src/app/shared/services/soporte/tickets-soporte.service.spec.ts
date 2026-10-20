import { of } from 'rxjs';
import { TicketsSoporteService, RESPONSABLE_SIN_ASIGNAR } from './tickets-soporte.service';

/**
 * D-483: la creación de tickets salió de soporte.component sin cambiar lo que se
 * envía. Este es el ticket que armaba la pantalla de Soporte antes de la extracción.
 */
describe('TicketsSoporteService', () => {
  const empresa: any = { nombreComercio: 'FLORECER' };
  const usuario = { email: 'ana@florecer.co', nit: '900123' };
  const formulario = {
    adjuntos: '', ticketComments: '', canal: 'web', tienda: 'tienda web',
    categoria: 'ventas', subcategoria: 'pedidos', motivo: 'soporte', tipoSolicitud: 'bug',
    nombreUsuarioReporta: 'Ana', fechaRegistro: '2026-10-17', fechaEvento: '2026-10-17',
    asunto: 'No carga el pedido', descripcion: 'Al abrir el pedido 120 sale un error en blanco',
    usuarioMesaAyuda: 'Pendiente', status: 'Pendiente', prioridad: 'media'
  };

  let servicios: any;
  let notificaciones: any;
  let servicio: TicketsSoporteService;

  beforeEach(() => {
    servicios = {
      addTicket: jasmine.createSpy('addTicket').and.returnValue(of({ result: { cd: 'abc123', nroTicket: 1316 } })),
      addNotification: jasmine.createSpy('addNotification')
    };
    notificaciones = {
      notificarCreacion: jasmine.createSpy('notificarCreacion').and.returnValue(Promise.resolve())
    };
    servicio = new TicketsSoporteService(servicios, notificaciones);
  });

  it('arma el mismo ticket que armaba la pantalla de Soporte', async () => {
    const ticket = await servicio.preparar({ ...formulario, prioridad: 'alta', base64String: '' }, empresa, usuario);
    expect(ticket).toEqual({
      ...formulario,
      prioridad: 'alta',
      usuarioMesaAyuda: RESPONSABLE_SIN_ASIGNAR,
      base64String: '',
      tienda: 'FLORECER',
      company: 'FLORECER',
      nit: '900123',
      emailUsuarioReporta: 'ana@florecer.co'
    });
  });

  it('no manda número: lo asigna el backend (D-507), aunque el formulario traiga uno', async () => {
    const ticket = await servicio.preparar({ ...formulario, nroTicket: 1241 }, empresa, {});
    expect('nroTicket' in ticket).toBeFalse();
    expect(ticket.nit).toBe('');
    expect(ticket.emailUsuarioReporta).toBe('');
  });

  it('envía el ticket y avisa al equipo y a la campana como antes', async () => {
    const ticket = await servicio.preparar(formulario, empresa, usuario);
    let creado: any;
    servicio.enviar(ticket, empresa, usuario).subscribe(r => creado = r);

    expect(servicios.addTicket).toHaveBeenCalledTimes(1);
    expect(servicios.addTicket).toHaveBeenCalledWith(ticket);
    expect(creado).toEqual({ ticketId: 'abc123', nroTicket: 1316, numeroVisible: 1316 });
    expect(servicios.addNotification).toHaveBeenCalledTimes(1);
    expect(servicios.addNotification).toHaveBeenCalledWith('Nuevo ticket #1316 creado', 'abc123');
    expect(notificaciones.notificarCreacion).toHaveBeenCalledTimes(1);
    expect(notificaciones.notificarCreacion).toHaveBeenCalledWith({
      ticketCd: 'abc123', numero: 1316, asunto: 'No carga el pedido',
      nomComercial: 'FLORECER', emailComercio: 'ana@florecer.co', autor: 'Ana'
    });
  });

  it('sin número visible, muestra el cd', async () => {
    servicios.addTicket.and.returnValue(of({ result: { cd: 'abc123' } }));
    const ticket = await servicio.preparar(formulario, empresa, usuario);
    let creado: any;
    servicio.enviar(ticket, empresa, usuario).subscribe(r => creado = r);
    expect(creado.numeroVisible).toBe('abc123');
    expect(servicios.addNotification).toHaveBeenCalledTimes(1);
    expect(servicios.addNotification).toHaveBeenCalledWith('Nuevo ticket #abc123 creado', 'abc123');
  });
});
