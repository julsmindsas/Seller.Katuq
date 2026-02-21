import { Component, OnInit } from '@angular/core';

export interface NotificationPreference {
  id: string;
  title: string;
  description: string;
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
export class NotificacionesComponent implements OnInit {

  public preferences: NotificationPreference[] = [
    {
      id: 'subscriptions',
      title: 'Suscripciones y pagos',
      description: 'Mantente al tanto del estado, los cambios y la caducidad de suscripciones. Recibe actualizaciones de facturación y pagos.',
      channels: {
        sms: true,
        whatsapp: true,
        email: true
      }
    },
    {
      id: 'account_security',
      title: 'Cuenta y su seguridad',
      description: 'Recibe notificaciones sobre cambios, problemas o actualizaciones importantes relacionadas con tu cuenta.',
      channels: {
        sms: true,
        whatsapp: true,
        email: true
      }
    },
    {
      id: 'service_status',
      title: 'Estado del servicio y cambios',
      description: 'Recibe alertas sobre el estado, el tiempo de inactividad y otra información importante que afecta el funcionamiento de tus servicios.',
      channels: {
        sms: true,
        whatsapp: true,
        email: true
      }
    },
    {
      id: 'product_updates',
      title: 'Actualizaciones de productos y ofertas especiales',
      description: 'Sé el primero en descubrir nuevos productos, actualizaciones de los existentes y obtener descuentos.',
      channels: {
        sms: false,
        whatsapp: false,
        email: false
      }
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // Aquí iría la carga de preferencias desde el backend (NotificationManagerService)
  }

  togglePreference(preferenceId: string, channel: 'sms' | 'whatsapp' | 'email'): void {
    const pref = this.preferences.find(p => p.id === preferenceId);
    if (pref) {
      pref.channels[channel] = !pref.channels[channel];
      // Aquí iría el llamado al backend para guardar el cambio de la preferencia
    }
  }

}
