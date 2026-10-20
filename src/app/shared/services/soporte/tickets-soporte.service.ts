import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CompanyInformation } from '../../models/User/CompanyInformation';
import { ServiciosService } from '../servicios.service';
import { TicketNotificacionesSellerService } from '../ticket-notificaciones-seller.service';

/**
 * Crear un ticket de soporte desde el Seller: un solo camino para la pantalla de
 * Soporte y para "Opinar" (D-483). Vivía dentro de soporte.component; se extrajo
 * sin cambiarle el comportamiento.
 *
 * Arma la identidad del comercio, envía el ticket al backend (que asigna el
 * número visible y manda los correos) y avisa al equipo y a la campana del
 * comercio con el número que quedó guardado (D-507, ticket 1243).
 */

/** Responsable vacío con el que nace todo ticket; Support lo asigna después. */
export const RESPONSABLE_SIN_ASIGNAR = {
  id: '0',
  nombreCompleto: 'Desconocido',
  iniciales: 'UD',
  color: '#808080',
  email: 'anonimo@anonimo.com',
  celular: '0000',
  fechaCreacion: '2024-11-06T13:16:04.0316182+00:00'
};

export interface TicketCreado {
  /** Clave técnica (cd que devuelve el backend). */
  ticketId: string;
  /** Número que quedó guardado en el backend (D-507). */
  nroTicket?: number;
  /** Número consecutivo si lo hay; si no, el cd. */
  numeroVisible: string | number;
}

/**
 * Identidad mínima trazable del comercio; no se envía la configuración completa
 * de la empresa.
 */
export function completarIdentidad(datos: any, empresa: CompanyInformation, usuario: any): any {
  return {
    ...datos,
    usuarioMesaAyuda: RESPONSABLE_SIN_ASIGNAR,
    tienda: empresa.nombreComercio,
    company: empresa.nombreComercio,
    nit: usuario?.nit || '',
    emailUsuarioReporta: usuario?.email || ''
  };
}

@Injectable({ providedIn: 'root' })
export class TicketsSoporteService {

  constructor(
    private servicios: ServiciosService,
    private notificaciones: TicketNotificacionesSellerService
  ) { }

  /**
   * Identidad del comercio. El número visible ya no se reserva aquí: lo asigna el
   * backend desde un solo contador (D-507); reservarlo en el navegador repetía
   * números con los tickets abiertos por otros canales.
   */
  async preparar(datos: any, empresa: CompanyInformation, usuario: any): Promise<any> {
    const ticket = completarIdentidad(datos, empresa, usuario);
    delete ticket.nroTicket;
    return ticket;
  }

  /** Envía el ticket y avisa al equipo y a la campana del comercio. */
  enviar(ticket: any, empresa: CompanyInformation, usuario: any): Observable<TicketCreado> {
    return this.servicios.addTicket(ticket).pipe(
      map((response): TicketCreado => {
        const ticketId = response?.result?.cd || '';
        const nroTicket = response?.result?.nroTicket;
        return { ticketId, nroTicket, numeroVisible: nroTicket || ticketId };
      }),
      tap(({ ticketId, nroTicket, numeroVisible }) => {
        // Notificar al equipo de soporte (ticketId como string, no el objeto)
        this.servicios.addNotification(`Nuevo ticket #${numeroVisible} creado`, ticketId);
        // Campana del comercio (payload tipado y accionable), idempotente ante
        // reintentos. El correo al equipo de soporte NO sale de aquí: lo manda el
        // backend al crear el ticket (services/notifications/supportTicketNotifier.js).
        this.notificaciones.notificarCreacion({
          ticketCd: ticketId,
          numero: nroTicket,
          asunto: ticket.asunto,
          nomComercial: empresa.nombreComercio,
          emailComercio: usuario?.email,
          autor: ticket.nombreUsuarioReporta
        });
      })
    );
  }
}
