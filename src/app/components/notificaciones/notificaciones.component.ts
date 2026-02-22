import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationPreferencesService } from '../../shared/services/notifications/notification-preferences.service';
import { NotificationChannel, NotificationType } from '../../shared/services/notifications/notification.types';

export interface NotificationPreferenceView {
  id: string;
  title: string;
  description: string;
  types: NotificationType[]; // Link the view category to the actual enum types
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

  // We map the UI categories to the actual system NotificationTypes
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
      channels: { sms: false, whatsapp: false, email: true } // Email is forced true visually, but logic can handle it
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
          // Map backend preferences to our UI view
          this.preferences.forEach(viewPref => {
            // Check if any of the mapped types have the channel enabled
            // (If at least one is enabled, we show it as checked)

            let hasSms = false;
            let hasWhatsapp = false;
            let hasEmail = false;

            viewPref.types.forEach(type => {
              if (prefs.types[type]) {
                const channels = prefs.types[type].channels;
                if (channels.includes(NotificationChannel.SMS)) hasSms = true;
                if (channels.includes(NotificationChannel.WEBHOOK)) hasWhatsapp = true;
                if (channels.includes(NotificationChannel.EMAIL)) hasEmail = true;
              }
            });

            viewPref.channels.sms = hasSms;
            viewPref.channels.whatsapp = hasWhatsapp;
            viewPref.channels.email = hasEmail;
          });

          this.isLoading = false;
        }
      });
  }

  public togglePreference(preferenceId: string, channel: 'sms' | 'whatsapp' | 'email'): void {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (!pref) return;

    // Toggle local state immediately for fast UI response
    pref.channels[channel] = !pref.channels[channel];

    // Determine the actual NotificationChannel enum
    let targetChannel: NotificationChannel;
    if (channel === 'sms') targetChannel = NotificationChannel.SMS;
    else if (channel === 'whatsapp') targetChannel = NotificationChannel.WEBHOOK; // Mapping WA to WEBHOOK temporarily
    else if (channel === 'email') targetChannel = NotificationChannel.EMAIL;
    else return;

    // Update all associated types in the backend
    pref.types.forEach(type => {
      const currentPrefs = this.preferencesService.getCurrentPreferences();
      if (currentPrefs && currentPrefs.types[type]) {
        let currentChannels = [...currentPrefs.types[type].channels];

        if (pref.channels[channel]) {
          // Add channel if not exists
          if (!currentChannels.includes(targetChannel)) {
            currentChannels.push(targetChannel);
          }
        } else {
          // Remove channel
          currentChannels = currentChannels.filter(c => c !== targetChannel);
        }

        // Save to service
        this.preferencesService.updateTypePreferences(type, {
          channels: currentChannels
        });
      }
    });

  }

}
