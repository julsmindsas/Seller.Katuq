import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';

/**
 * Notificaciones de tickets del lado Seller (contrato compartido con la app
 * Support): notificación in-app en `ActualizacionTicket{nomComercial}`, que es
 * la que escucha la campana, y consecutivo visible desde el contador compartido
 * `contadores/tickets`. Las escrituras son idempotentes: la clave es
 * determinística por evento y la transacción crear-si-no-existe descarta
 * reintentos, así que no se duplican avisos.
 *
 * Los CORREOS ya no salen de aquí. Se encolaban en el nodo `colaCorreos`, que
 * ningún proceso lee, así que jamás se enviaron. Ahora los manda el backend en
 * el mismo endpoint que crea el ticket
 * (functions/services/notifications/supportTicketNotifier.js).
 */

export interface DatosCreacionTicket {
  /** Clave técnica del ticket (cd que devuelve el backend) */
  ticketCd: string;
  /** Número consecutivo visible (nroTicket); si falta se muestra el cd */
  numero?: string | number;
  asunto?: string;
  nomComercial: string;
  emailComercio?: string;
  autor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketNotificacionesSellerService {

  constructor(private db: AngularFireDatabase) { }

  /**
   * Reserva el siguiente número consecutivo del contador compartido con la
   * app Support. Devuelve null si no fue posible (el ticket se crea igual).
   */
  async siguienteNumero(): Promise<number | null> {
    try {
      const resultado = await this.db.database
        .ref('contadores/tickets')
        .transaction(actual => (actual || 0) + 1);
      return resultado.committed ? resultado.snapshot.val() : null;
    } catch (error) {
      console.error('No fue posible reservar el consecutivo del ticket:', error);
      return null;
    }
  }

  /**
   * Notificación in-app del comercio, con payload tipado y accionable. El
   * correo de creación lo envía el backend al recibir el ticket.
   */
  async notificarCreacion(datos: DatosCreacionTicket): Promise<void> {
    const clave = `t${datos.ticketCd}_creacion`;
    const numeroVisible = datos.numero ?? datos.ticketCd;
    const mensaje = `Ticket #${numeroVisible}${datos.asunto ? ` "${datos.asunto}"` : ''} fue creado y está en estado Pendiente.`;
    const timestamp = Date.now();

    const tareas: Promise<any>[] = [];

    // Campana del Seller (canal por nombre comercial)
    const nombreComercio = (datos.nomComercial || '').trim();
    if (nombreComercio.length > 0) {
      tareas.push(this.crearSiNoExiste(`ActualizacionTicket${nombreComercio}/${clave}`, {
        message: mensaje,
        ticketId: datos.ticketCd,
        numero: datos.numero || null,
        type: 'TICKET_CREATED',
        evento: 'creacion',
        actionUrl: '/misTickets',
        actionText: 'Ver mis tickets',
        timestamp,
        read: false
      }));
    }

    await Promise.all(tareas);
  }

  /**
   * Escribe en la ruta solo si aún no existe (transacción RTDB). Devuelve
   * false si ya existía — un reintento de la misma acción.
   */
  private async crearSiNoExiste(ruta: string, valor: any): Promise<boolean> {
    const resultado = await this.db.database.ref(ruta).transaction(actual => {
      return actual === null ? valor : undefined; // undefined aborta la transacción
    });
    return resultado.committed;
  }
}
