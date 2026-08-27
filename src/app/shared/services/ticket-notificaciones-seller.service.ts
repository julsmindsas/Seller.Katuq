import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { environment } from '../../../environments/environment';

/**
 * Notificaciones de tickets del lado Seller (contrato compartido con la app
 * Support): correos encolados en RTDB `colaCorreos` con registro de entrega,
 * notificación in-app en `ActualizacionTicket{nomComercial}` (la que escucha
 * la campana) y consecutivo visible desde el contador compartido
 * `contadores/tickets`. Todas las escrituras son idempotentes: la clave es
 * determinística por evento y la transacción crear-si-no-existe descarta
 * reintentos, así que no se duplican avisos ni correos.
 *
 * El envío físico del correo lo hace el consumidor de la cola (Cloud
 * Function/extensión en julsmind-katuq), que actualiza estado/intentos.
 */

// Los environments no se versionan (convención del repo): el código lleva
// los valores por defecto y environment.soporte puede sobreescribirlos.
const SOPORTE_DEFAULTS = {
  urlApp: 'https://sellercenter.katuq.com',
  // TODO: confirmar y agregar el correo de Daniel
  correosEquipo: ['sgarcia@katuq.com']
};

function configSoporte(): { urlApp: string; correosEquipo: string[] } {
  return (environment as any).soporte || SOPORTE_DEFAULTS;
}

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
   * Notificación in-app del comercio con payload tipado y accionable, más los
   * correos de creación (comercio + equipo operativo) en la cola.
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

    // Correos: comercio + equipo operativo
    const destinatarios: string[] = [...(configSoporte().correosEquipo || [])];
    if (datos.emailComercio) {
      destinatarios.push(datos.emailComercio);
    }
    for (const correo of destinatarios) {
      tareas.push(this.crearSiNoExiste(`colaCorreos/${clave}_${this.slug(correo)}`, {
        para: correo,
        asunto: `[Soporte Katuq] Ticket #${numeroVisible} creado`,
        html: this.htmlCorreoCreacion(mensaje, numeroVisible),
        texto: mensaje,
        ticketCd: datos.ticketCd,
        evento: 'creacion',
        // Registro de entrega: el consumidor de la cola actualiza estado/intentos/fechaEnvio
        estado: 'pendiente',
        intentos: 0,
        creadoEn: timestamp
      }));
    }

    await Promise.all(tareas);
  }

  private htmlCorreoCreacion(mensaje: string, numeroVisible: string | number): string {
    const urlTickets = `${configSoporte().urlApp || ''}/misTickets`;
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e3e1f0;border-radius:12px;overflow:hidden;">
        <div style="background-color:#5F3FE0;padding:18px 24px;">
          <h2 style="color:#ffffff;margin:0;font-size:18px;">Soporte Katuq</h2>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 8px;color:#211F3A;font-size:15px;">${mensaje}</p>
          <p style="margin:8px 0;color:#211F3A;">Fecha: <strong>${fecha}</strong></p>
          <a href="${urlTickets}"
             style="display:inline-block;margin-top:16px;background-color:#5F3FE0;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:11px;font-size:14px;">
            Ver ticket #${numeroVisible}
          </a>
          <p style="margin:20px 0 0;color:#6d6a85;font-size:12px;">
            Este es un aviso automático del sistema de soporte de Katuq.
          </p>
        </div>
      </div>`;
  }

  private slug(valor: string): string {
    return (valor || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
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
