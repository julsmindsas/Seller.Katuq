import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationType } from '../../shared/services/notifications/notification.types';
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { ToastrService } from 'ngx-toastr';

export interface NotificationPreferenceView {
  id: string;
  title: string;
  description: string;
  types: NotificationType[];
  channels: {
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
    company_copy: boolean;
  };
}

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss']
})
export class NotificacionesComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  public isLoading = true;
  public isSaving = false;
  private empresaActual: any;

  // Ticket 1128: personas del equipo que reciben un correo con cada pedido nuevo.
  public avisosPedidoNuevo: string[] = [];
  public nuevoCorreoAviso = '';
  public guardandoAvisos = false;
  public readonly maxAvisos = 5;
  private readonly correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Categorías: Email y SMS funcionales; WhatsApp decorativo (próximamente)
  public preferences: NotificationPreferenceView[] = [
    {
      id: 'order_created',
      title: 'Pedido Confirmado',
      description: 'Notifica al cliente cuando su pedido ha sido creado y confirmado exitosamente.',
      types: [
        NotificationType.ORDER_CREATED
      ],
      channels: { sms: false, whatsapp: false, email: false, company_copy: false }
    },
    {
      id: 'payment_approved',
      title: 'Pago Aprobado',
      description: 'Notifica al cliente cuando su pago ha sido confirmado y aprobado.',
      types: [
        NotificationType.PAYMENT_APPROVED
      ],
      channels: { sms: false, whatsapp: false, email: false, company_copy: false }
    },
    {
      id: 'order_produced',
      title: 'Pedido Producido',
      description: 'Notifica al cliente cuando su pedido ha completado el proceso de producción y está listo para despacho.',
      types: [
        NotificationType.PRODUCTION_COMPLETED
      ],
      channels: { sms: false, whatsapp: false, email: false, company_copy: false }
    },
    {
      id: 'order_dispatched',
      title: 'Pedido Despachado',
      description: 'Notifica al cliente cuando su pedido ha sido despachado y está en camino a su dirección de entrega.',
      types: [
        NotificationType.ORDER_DISPATCHED
      ],
      channels: { sms: false, whatsapp: false, email: false, company_copy: false }
    },
    {
      id: 'order_delivered',
      title: 'Pedido Entregado',
      description: 'Notifica al cliente cuando su pedido ha sido entregado exitosamente, incluyendo evidencia fotográfica.',
      types: [
        NotificationType.ORDER_DELIVERED
      ],
      channels: { sms: false, whatsapp: false, email: false, company_copy: false }
    },
    {
      id: 'order_rejected',
      title: 'Pedido Rechazado',
      description: 'Notifica al cliente cuando su pedido no pudo ser procesado o fue rechazado.',
      types: [
        NotificationType.ORDER_PROCESS_REJECTED
      ],
      channels: { sms: false, whatsapp: false, email: false, company_copy: false }
    }
  ];

  constructor(
    private maestroService: MaestroService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.empresaActual = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    this.loadPreferencesFromFirestore();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Carga las preferencias de notificación de la empresa desde Firestore */
  private loadPreferencesFromFirestore(): void {
    const companyName = this.empresaActual?.nomComercial;
    if (!companyName) {
      this.isLoading = false;
      return;
    }

    this.maestroService.getCompanyNotificationPreferences(companyName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved: any) => {
          if (saved && saved.notifications) {
            this.preferences.forEach(pref => {
              if (saved.notifications[pref.id] !== undefined) {
                pref.channels.email = saved.notifications[pref.id];
              }
            });
          }
          if (saved && saved.sms_notifications) {
            this.preferences.forEach(pref => {
              if (saved.sms_notifications[pref.id] !== undefined) {
                pref.channels.sms = saved.sms_notifications[pref.id];
              }
            });
          }
          if (saved && saved.company_copy_notifications) {
            this.preferences.forEach(pref => {
              if (saved.company_copy_notifications[pref.id] !== undefined) {
                pref.channels.company_copy = saved.company_copy_notifications[pref.id];
              }
            });
          }
          if (saved && saved.whatsapp_notifications) {
            this.preferences.forEach(pref => {
              if (saved.whatsapp_notifications[pref.id] !== undefined) {
                pref.channels.whatsapp = saved.whatsapp_notifications[pref.id];
              }
            });
          }
          const avisos = saved?.team_alerts?.order_created;
          this.avisosPedidoNuevo = Array.isArray(avisos) ? [...avisos] : [];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  /** Activa o desactiva las notificaciones por email para una categoría y guarda en Firestore */
  public toggleEmail(preferenceId: string): void {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (!pref || this.isSaving) return;

    const previousValue = pref.channels.email;
    pref.channels.email = !pref.channels.email;
    this.saveToFirestore(() => { pref.channels.email = previousValue; });
  }

  /** Activa o desactiva las notificaciones por SMS para una categoría y guarda en Firestore */
  public toggleSms(preferenceId: string): void {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (!pref || this.isSaving) return;

    const previousValue = pref.channels.sms;
    pref.channels.sms = !pref.channels.sms;
    this.saveToFirestore(() => { pref.channels.sms = previousValue; });
  }

  /** Activa o desactiva la copia a empresa para una categoría y guarda en Firestore */
  public toggleCompanyCopy(preferenceId: string): void {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (!pref || this.isSaving) return;

    const previousValue = pref.channels.company_copy;
    pref.channels.company_copy = !pref.channels.company_copy;
    this.saveToFirestore(() => { pref.channels.company_copy = previousValue; });
  }

  /** Activa o desactiva las notificaciones por WhatsApp para una categoría y guarda en Firestore */
  public toggleWhatsapp(preferenceId: string): void {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (!pref || this.isSaving) return;

    const previousValue = pref.channels.whatsapp;
    pref.channels.whatsapp = !pref.channels.whatsapp;
    this.saveToFirestore(() => { pref.channels.whatsapp = previousValue; });
  }

  /** Agrega un correo a la lista de "Pedidos nuevos" y la guarda. */
  public agregarCorreoAviso(): void {
    const correo = (this.nuevoCorreoAviso || '').trim().toLowerCase();
    if (!correo || this.guardandoAvisos) return;
    if (!this.correoValido.test(correo)) {
      this.toastr.warning('Escribe un correo completo, por ejemplo logistica@tuempresa.com.', 'Pedidos nuevos');
      return;
    }
    if (this.avisosPedidoNuevo.includes(correo)) {
      this.toastr.info('Ese correo ya está en la lista.', 'Pedidos nuevos');
      this.nuevoCorreoAviso = '';
      return;
    }
    if (this.avisosPedidoNuevo.length >= this.maxAvisos) {
      this.toastr.warning(`Puedes avisar hasta a ${this.maxAvisos} personas. Quita una para agregar otra.`, 'Pedidos nuevos');
      return;
    }
    const anterior = [...this.avisosPedidoNuevo];
    this.avisosPedidoNuevo = [...this.avisosPedidoNuevo, correo];
    this.nuevoCorreoAviso = '';
    this.guardarAvisos(anterior);
  }

  /** Quita un correo de la lista de "Pedidos nuevos" y la guarda. */
  public quitarCorreoAviso(correo: string): void {
    if (this.guardandoAvisos) return;
    const anterior = [...this.avisosPedidoNuevo];
    this.avisosPedidoNuevo = this.avisosPedidoNuevo.filter(c => c !== correo);
    this.guardarAvisos(anterior);
  }

  /** Guarda solo la lista de avisos; el resto de preferencias queda como estaba. */
  private guardarAvisos(anterior: string[]): void {
    const companyName = this.empresaActual?.nomComercial;
    if (!companyName) return;

    this.guardandoAvisos = true;
    this.maestroService.saveCompanyNotificationPreferences(companyName, { team_alerts: { order_created: this.avisosPedidoNuevo } })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardandoAvisos = false;
          this.toastr.success('Lista guardada.', 'Pedidos nuevos');
        },
        error: () => {
          this.guardandoAvisos = false;
          this.avisosPedidoNuevo = anterior;
          this.toastr.error('No se pudo guardar la lista. Intenta de nuevo.', 'Pedidos nuevos');
        }
      });
  }

  /** Guarda todas las preferencias de la empresa en Firestore */
  private saveToFirestore(rollback?: () => void): void {
    const companyName = this.empresaActual?.nomComercial;
    if (!companyName) return;

    this.isSaving = true;

    const notifications: { [key: string]: boolean } = {};
    const sms_notifications: { [key: string]: boolean } = {};
    const company_copy_notifications: { [key: string]: boolean } = {};
    const whatsapp_notifications: { [key: string]: boolean } = {};
    this.preferences.forEach(pref => {
      notifications[pref.id] = pref.channels.email;
      sms_notifications[pref.id] = pref.channels.sms;
      company_copy_notifications[pref.id] = pref.channels.company_copy;
      whatsapp_notifications[pref.id] = pref.channels.whatsapp;
    });

    this.maestroService.saveCompanyNotificationPreferences(companyName, { notifications, sms_notifications, company_copy_notifications, whatsapp_notifications })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.toastr.success('Preferencias actualizadas', 'Notificaciones');
        },
        error: (err) => {
          this.isSaving = false;
          if (rollback) rollback();
          this.toastr.error('Error al guardar preferencias', 'Notificaciones');
          console.error('Error guardando preferencias:', err);
        }
      });
  }

}
