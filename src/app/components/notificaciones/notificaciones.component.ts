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

  // Categorías: Email y SMS funcionales; WhatsApp decorativo (próximamente)
  public preferences: NotificationPreferenceView[] = [
    {
      id: 'order_created',
      title: 'Pedido Confirmado',
      description: 'Notifica al cliente cuando su pedido ha sido creado y confirmado exitosamente.',
      types: [
        NotificationType.ORDER_CREATED
      ],
      channels: { sms: false, whatsapp: false, email: false }
    },
    {
      id: 'payment_approved',
      title: 'Pago Aprobado',
      description: 'Notifica al cliente cuando su pago ha sido confirmado y aprobado.',
      types: [
        NotificationType.PAYMENT_APPROVED
      ],
      channels: { sms: false, whatsapp: false, email: false }
    },
    {
      id: 'order_produced',
      title: 'Pedido Producido',
      description: 'Notifica al cliente cuando su pedido ha completado el proceso de producción y está listo para despacho.',
      types: [
        NotificationType.PRODUCTION_COMPLETED
      ],
      channels: { sms: false, whatsapp: false, email: false }
    },
    {
      id: 'order_dispatched',
      title: 'Pedido Despachado',
      description: 'Notifica al cliente cuando su pedido ha sido despachado y está en camino a su dirección de entrega.',
      types: [
        NotificationType.ORDER_DISPATCHED
      ],
      channels: { sms: false, whatsapp: false, email: false }
    },
    {
      id: 'order_delivered',
      title: 'Pedido Entregado',
      description: 'Notifica al cliente cuando su pedido ha sido entregado exitosamente, incluyendo evidencia fotográfica.',
      types: [
        NotificationType.ORDER_DELIVERED
      ],
      channels: { sms: false, whatsapp: false, email: false }
    },
    {
      id: 'order_rejected',
      title: 'Pedido Rechazado',
      description: 'Notifica al cliente cuando su pedido no pudo ser procesado o fue rechazado.',
      types: [
        NotificationType.ORDER_PROCESS_REJECTED
      ],
      channels: { sms: false, whatsapp: false, email: false }
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
          // SMS deshabilitado en producción — forzar false ignorando Firestore
          this.preferences.forEach(pref => pref.channels.sms = false);
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

    pref.channels.email = !pref.channels.email;
    this.saveToFirestore();
  }

  /** Activa o desactiva las notificaciones por SMS para una categoría y guarda en Firestore */
  public toggleSms(preferenceId: string): void {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (!pref || this.isSaving) return;

    pref.channels.sms = !pref.channels.sms;
    this.saveToFirestore();
  }

  /** Guarda todas las preferencias de la empresa en Firestore */
  private saveToFirestore(): void {
    const companyName = this.empresaActual?.nomComercial;
    if (!companyName) return;

    this.isSaving = true;

    const notifications: { [key: string]: boolean } = {};
    const sms_notifications: { [key: string]: boolean } = {};
    this.preferences.forEach(pref => {
      notifications[pref.id] = pref.channels.email;
      sms_notifications[pref.id] = false; // SMS deshabilitado en producción
    });

    this.maestroService.saveCompanyNotificationPreferences(companyName, { notifications, sms_notifications })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.toastr.success('Preferencias actualizadas', 'Notificaciones');
        },
        error: (err) => {
          this.isSaving = false;
          this.toastr.error('Error al guardar preferencias', 'Notificaciones');
          console.error('Error guardando preferencias:', err);
        }
      });
  }

}
