import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationPreferencesService } from '../../shared/services/notifications/notification-preferences.service';
import { NotificationChannel, NotificationType } from '../../shared/services/notifications/notification.types';

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

  // Categorías: Email funcional; SMS y WhatsApp decorativos (próximamente)
  public preferences: NotificationPreferenceView[] = [
    {
      id: 'subscriptions',
      title: 'Suscripciones y pagos',
      description: 'Mantente al tanto del estado, los cambios y la caducidad de suscripciones. Recibe actualizaciones de facturación y pagos.',
      types: [
        NotificationType.PAYMENT_PENDING,
        NotificationType.PAYMENT_APPROVED,
        NotificationType.PAYMENT_REJECTED,
        NotificationType.PAYMENT_PREAPPROVED
      ],
      channels: { sms: false, whatsapp: false, email: true }
    },
    {
      id: 'account_security',
      title: 'Cuenta y su seguridad',
      description: 'Recibe notificaciones sobre cambios, problemas o actualizaciones importantes relacionadas con tu cuenta.',
      types: [
        NotificationType.SYSTEM_ALERT,
        NotificationType.SYSTEM_MAINTENANCE
      ],
      channels: { sms: false, whatsapp: false, email: true }
    },
    {
      id: 'service_status',
      title: 'Estado del servicio y cambios',
      description: 'Recibe alertas sobre el estado, el tiempo de inactividad y otra información importante que afecta el funcionamiento de tus servicios.',
      types: [
        NotificationType.ORDER_PROCESS_REJECTED,
        NotificationType.DELIVERY_PROBLEM
      ],
      channels: { sms: false, whatsapp: false, email: true }
    },
    {
      id: 'product_updates',
      title: 'Actualizaciones de productos y ofertas especiales',
      description: 'Sé el primero en descubrir nuevos productos, actualizaciones de los existentes y obtener descuentos.',
      types: [
        NotificationType.CART_REMINDER,
        NotificationType.CART_ABANDONED
      ],
      channels: { sms: false, whatsapp: false, email: true }
    }
  ];

  constructor(
    private preferencesService: NotificationPreferencesService
  ) { }

  ngOnInit(): void {
    this.loadPreferences();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPreferences(): void {
    this.preferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prefs => {
        if (prefs) {
          this.preferences.forEach(viewPref => {
            let hasEmail = false;
            viewPref.types.forEach(type => {
              const typePref = prefs.types[type];
              const channels = typePref?.channels || [];
              if (channels.includes(NotificationChannel.EMAIL)) hasEmail = true;
            });
            viewPref.channels.email = hasEmail;
            // SMS y WhatsApp quedan en false (decorativos)
            viewPref.channels.sms = false;
            viewPref.channels.whatsapp = false;
          });
        }
        this.isLoading = false;
      });
  }

  /** Activa o desactiva las notificaciones por email para una categoría (único canal activo por ahora) */
  public async toggleEmail(preferenceId: string): Promise<void> {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (!pref) return;

    pref.channels.email = !pref.channels.email;

    for (const type of pref.types) {
      const currentPrefs = this.preferencesService.getCurrentPreferences();
      const existing = currentPrefs?.types[type];
      let currentChannels = Array.isArray(existing?.channels) ? [...existing.channels] : [];
      if (pref.channels.email) {
        if (!currentChannels.includes(NotificationChannel.EMAIL)) {
          currentChannels.push(NotificationChannel.EMAIL);
        }
      } else {
        currentChannels = currentChannels.filter(c => c !== NotificationChannel.EMAIL);
      }
      await this.preferencesService.updateTypePreferences(type, { channels: currentChannels });
    }
  }

}
