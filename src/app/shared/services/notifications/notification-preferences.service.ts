import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { 
  NotificationPreferences, 
  NotificationChannel, 
  NotificationType,
  NotificationPriority 
} from './notification.types';
import { NOTIFICATION_CONFIG } from './notification.config';

@Injectable({
  providedIn: 'root'
})
export class NotificationPreferencesService {
  private preferencesSubject = new BehaviorSubject<NotificationPreferences | null>(null);
  private currentUserId: string | null = null;
  private isInitialized = false;

  constructor(private http: HttpClient) {
    this.initializeService();
  }

  get preferences$(): Observable<NotificationPreferences | null> {
    return this.preferencesSubject.asObservable();
  }

  /**
   * Inicializa el servicio de preferencias
   */
  private async initializeService(): Promise<void> {
    try {
      await this.loadCurrentUser();
      await this.loadPreferences();
      this.isInitialized = true;
      console.log('✅ NotificationPreferencesService inicializado');
    } catch (error) {
      console.error('❌ Error inicializando NotificationPreferencesService:', error);
    }
  }

  /**
   * Carga la información del usuario actual
   */
  private async loadCurrentUser(): Promise<void> {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      this.currentUserId = currentUser.id || 'default_user';
    } catch (error) {
      console.error('Error cargando usuario actual:', error);
      this.currentUserId = 'default_user';
    }
  }

  /**
   * Carga las preferencias del usuario
   */
  private async loadPreferences(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      // Intentar cargar desde el backend primero
      const serverPreferences = await this.loadFromServer();
      if (serverPreferences) {
        this.preferencesSubject.next(serverPreferences);
        this.saveToLocalStorage(serverPreferences);
        return;
      }
    } catch (error) {
      console.log('No se pudieron cargar preferencias del servidor, usando localStorage');
    }

    // Si no hay preferencias en el servidor, usar localStorage o crear por defecto
    const localPreferences = this.loadFromLocalStorage();
    if (localPreferences) {
      this.preferencesSubject.next(localPreferences);
    } else {
      const defaultPreferences = this.createDefaultPreferences();
      this.preferencesSubject.next(defaultPreferences);
      this.saveToLocalStorage(defaultPreferences);
    }
  }

  /**
   * Carga preferencias desde el servidor
   */
  private async loadFromServer(): Promise<NotificationPreferences | null> {
    const endpoint = `${NOTIFICATION_CONFIG.api.baseUrl}${NOTIFICATION_CONFIG.api.endpoints.preferences}/${this.currentUserId}`;
    
    try {
      const response = await this.http.get<NotificationPreferences>(endpoint).toPromise();
      return response || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Guarda preferencias en el servidor
   */
  private async saveToServer(preferences: NotificationPreferences): Promise<void> {
    const endpoint = `${NOTIFICATION_CONFIG.api.baseUrl}${NOTIFICATION_CONFIG.api.endpoints.preferences}`;
    
    await this.http.put(endpoint, preferences).toPromise();
  }

  /**
   * Carga preferencias desde localStorage
   */
  private loadFromLocalStorage(): NotificationPreferences | null {
    try {
      const stored = localStorage.getItem(`katuq_notification_preferences_${this.currentUserId}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt)
      };
    } catch (error) {
      console.error('Error cargando preferencias desde localStorage:', error);
      return null;
    }
  }

  /**
   * Guarda preferencias en localStorage
   */
  private saveToLocalStorage(preferences: NotificationPreferences): void {
    try {
      const toSave = {
        ...preferences,
        createdAt: preferences.createdAt.toISOString(),
        updatedAt: preferences.updatedAt.toISOString()
      };
      
      localStorage.setItem(
        `katuq_notification_preferences_${this.currentUserId}`, 
        JSON.stringify(toSave)
      );
    } catch (error) {
      console.error('Error guardando preferencias en localStorage:', error);
    }
  }

  /**
   * Crea preferencias por defecto
   */
  private createDefaultPreferences(): NotificationPreferences {
    const now = new Date();
    
    // Configuración por defecto de canales
    const defaultChannels = {
      [NotificationChannel.IN_APP]: {
        enabled: true,
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      },
      [NotificationChannel.EMAIL]: {
        enabled: true,
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      },
      [NotificationChannel.PUSH]: {
        enabled: false, // Deshabilitado por defecto hasta que el usuario dé permisos
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      },
      [NotificationChannel.SMS]: {
        enabled: false
      },
      [NotificationChannel.FIREBASE_REALTIME]: {
        enabled: true
      },
      [NotificationChannel.WEBHOOK]: {
        enabled: false
      }
    };

    // Configuración por defecto de tipos de notificación
    const defaultTypes: any = {};
    
    // Configurar cada tipo de notificación con valores sensatos por defecto
    Object.values(NotificationType).forEach(type => {
      switch (type) {
        // Notificaciones críticas - todos los canales disponibles
        case NotificationType.PAYMENT_REJECTED:
        case NotificationType.ORDER_PROCESS_REJECTED:
        case NotificationType.OUT_OF_STOCK:
        case NotificationType.DELIVERY_PROBLEM:
        case NotificationType.SYSTEM_ALERT:
          defaultTypes[type] = {
            enabled: true,
            channels: [
              NotificationChannel.IN_APP,
              NotificationChannel.EMAIL,
              NotificationChannel.FIREBASE_REALTIME
            ],
            priority: NotificationPriority.CRITICAL
          };
          break;

        // Notificaciones de alta prioridad
        case NotificationType.ORDER_CREATED:
        case NotificationType.PAYMENT_APPROVED:
        case NotificationType.PRODUCTION_COMPLETED:
        case NotificationType.ORDER_DISPATCHED:
        case NotificationType.LOW_STOCK:
          defaultTypes[type] = {
            enabled: true,
            channels: [
              NotificationChannel.IN_APP,
              NotificationChannel.FIREBASE_REALTIME
            ],
            priority: NotificationPriority.HIGH
          };
          break;

        // Notificaciones de prioridad normal
        case NotificationType.PRODUCTION_STARTED:
        case NotificationType.ORDER_PACKED:
        case NotificationType.SHIPPING_CREATED:
        case NotificationType.NEW_CUSTOMER:
          defaultTypes[type] = {
            enabled: true,
            channels: [
              NotificationChannel.IN_APP,
              NotificationChannel.FIREBASE_REALTIME
            ],
            priority: NotificationPriority.NORMAL
          };
          break;

        // Notificaciones de baja prioridad
        case NotificationType.STOCK_REPLENISHED:
        case NotificationType.CUSTOMER_UPDATED:
        case NotificationType.CART_ABANDONED:
        case NotificationType.CART_REMINDER:
          defaultTypes[type] = {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            priority: NotificationPriority.LOW
          };
          break;

        // Por defecto para tipos no especificados
        default:
          defaultTypes[type] = {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            priority: NotificationPriority.NORMAL
          };
      }
    });

    return {
      userId: this.currentUserId!,
      channels: defaultChannels as any,
      types: defaultTypes,
      deviceSettings: {
        browserNotifications: false,
        sound: true,
        vibration: true
      },
      createdAt: now,
      updatedAt: now
    };
  }

  // ============= MÉTODOS PÚBLICOS =============

  /**
   * Obtiene las preferencias actuales
   */
  public getCurrentPreferences(): NotificationPreferences | null {
    return this.preferencesSubject.getValue();
  }

  /**
   * Actualiza preferencias de canal
   */
  public async updateChannelPreferences(
    channel: NotificationChannel, 
    settings: { enabled: boolean; quietHours?: { start: string; end: string } }
  ): Promise<void> {
    const current = this.preferencesSubject.getValue();
    if (!current) return;

    const updated = {
      ...current,
      channels: {
        ...current.channels,
        [channel]: {
          ...current.channels[channel],
          ...settings
        }
      },
      updatedAt: new Date()
    };

    await this.savePreferences(updated);
  }

  /**
   * Actualiza preferencias de tipo de notificación
   */
  public async updateTypePreferences(
    type: NotificationType,
    settings: {
      enabled?: boolean;
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
    }
  ): Promise<void> {
    const current = this.preferencesSubject.getValue();
    if (!current) return;

    const updated = {
      ...current,
      types: {
        ...current.types,
        [type]: {
          ...current.types[type],
          ...settings
        }
      },
      updatedAt: new Date()
    };

    await this.savePreferences(updated);
  }

  /**
   * Actualiza configuración del dispositivo
   */
  public async updateDeviceSettings(settings: {
    fcmToken?: string;
    browserNotifications?: boolean;
    sound?: boolean;
    vibration?: boolean;
  }): Promise<void> {
    const current = this.preferencesSubject.getValue();
    if (!current) return;

    const updated = {
      ...current,
      deviceSettings: {
        ...current.deviceSettings,
        ...settings
      },
      updatedAt: new Date()
    };

    await this.savePreferences(updated);
  }

  /**
   * Guarda las preferencias
   */
  private async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      // Intentar guardar en el servidor primero
      if (this.isOnline()) {
        await this.saveToServer(preferences);
      }
    } catch (error) {
      console.warn('No se pudieron guardar preferencias en el servidor:', error);
    }

    // Siempre guardar localmente
    this.saveToLocalStorage(preferences);
    this.preferencesSubject.next(preferences);
  }

  /**
   * Verifica si una notificación debe enviarse según las preferencias
   */
  public shouldSendNotification(
    type: NotificationType,
    channel: NotificationChannel,
    currentTime?: Date
  ): boolean {
    const preferences = this.preferencesSubject.getValue();
    if (!preferences) return true; // Si no hay preferencias, permitir por defecto

    // Verificar si el tipo está habilitado
    const typePrefs = preferences.types[type];
    if (!typePrefs || !typePrefs.enabled) {
      return false;
    }

    // Verificar si el canal está habilitado para este tipo
    if (!typePrefs.channels.includes(channel)) {
      return false;
    }

    // Verificar si el canal está habilitado globalmente
    const channelPrefs = preferences.channels[channel];
    if (!channelPrefs || !channelPrefs.enabled) {
      return false;
    }

    // Verificar horarios de silencio
    if (channelPrefs.quietHours && currentTime) {
      const isInQuietHours = this.isInQuietHours(channelPrefs.quietHours, currentTime);
      if (isInQuietHours) {
        // Solo permitir notificaciones críticas durante horarios de silencio
        const criticalTypes = [
          NotificationType.PAYMENT_REJECTED,
          NotificationType.ORDER_PROCESS_REJECTED,
          NotificationType.DELIVERY_PROBLEM,
          NotificationType.SYSTEM_ALERT
        ];
        
        return criticalTypes.includes(type);
      }
    }

    return true;
  }

  /**
   * Verifica si la hora actual está en horarios de silencio
   */
  private isInQuietHours(
    quietHours: { start: string; end: string },
    currentTime: Date
  ): boolean {
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;

    // Si el período cruza medianoche
    if (startTotalMinutes > endTotalMinutes) {
      return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
    }
    
    // Período normal dentro del mismo día
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
  }

  /**
   * Obtiene los canales habilitados para un tipo de notificación
   */
  public getEnabledChannelsForType(type: NotificationType): NotificationChannel[] {
    const preferences = this.preferencesSubject.getValue();
    if (!preferences) return [NotificationChannel.IN_APP]; // Fallback seguro

    const typePrefs = preferences.types[type];
    if (!typePrefs || !typePrefs.enabled) {
      return [];
    }

    // Filtrar solo los canales que están habilitados globalmente
    return typePrefs.channels.filter(channel => {
      const channelPrefs = preferences.channels[channel];
      return channelPrefs && channelPrefs.enabled;
    });
  }

  /**
   * Habilita notificaciones push (solicita permisos)
   */
  public async enablePushNotifications(): Promise<boolean> {
    try {
      // Verificar si el navegador soporta notificaciones
      if (!('Notification' in window)) {
        console.warn('Este navegador no soporta notificaciones push');
        return false;
      }

      // Solicitar permisos
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        await this.updateChannelPreferences(NotificationChannel.PUSH, { enabled: true });
        await this.updateDeviceSettings({ browserNotifications: true });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error habilitando notificaciones push:', error);
      return false;
    }
  }

  /**
   * Deshabilita notificaciones push
   */
  public async disablePushNotifications(): Promise<void> {
    await this.updateChannelPreferences(NotificationChannel.PUSH, { enabled: false });
    await this.updateDeviceSettings({ browserNotifications: false });
  }

  /**
   * Exporta las preferencias actuales
   */
  public exportPreferences(): string {
    const preferences = this.preferencesSubject.getValue();
    if (!preferences) return '';

    return JSON.stringify(preferences, null, 2);
  }

  /**
   * Importa preferencias desde JSON
   */
  public async importPreferences(jsonData: string): Promise<boolean> {
    try {
      const imported = JSON.parse(jsonData) as NotificationPreferences;
      
      // Validar estructura básica
      if (!imported.userId || !imported.channels || !imported.types) {
        throw new Error('Formato de preferencias inválido');
      }

      // Actualizar userId si es necesario
      imported.userId = this.currentUserId!;
      imported.updatedAt = new Date();

      await this.savePreferences(imported);
      return true;
    } catch (error) {
      console.error('Error importando preferencias:', error);
      return false;
    }
  }

  /**
   * Resetea las preferencias a valores por defecto
   */
  public async resetToDefaults(): Promise<void> {
    const defaultPreferences = this.createDefaultPreferences();
    await this.savePreferences(defaultPreferences);
  }

  /**
   * Verifica si hay conexión a internet
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Obtiene un resumen de las preferencias actuales
   */
  public getPreferencesSummary(): {
    totalNotificationTypes: number;
    enabledTypes: number;
    enabledChannels: NotificationChannel[];
    quietHours: boolean;
  } {
    const preferences = this.preferencesSubject.getValue();
    
    if (!preferences) {
      return {
        totalNotificationTypes: 0,
        enabledTypes: 0,
        enabledChannels: [],
        quietHours: false
      };
    }

    const totalTypes = Object.keys(preferences.types).length;
    const enabledTypes = Object.values(preferences.types).filter(t => t.enabled).length;
    
    const enabledChannels = Object.entries(preferences.channels)
      .filter(([_, config]) => config.enabled)
      .map(([channel, _]) => channel as NotificationChannel);

    const hasQuietHours = Object.values(preferences.channels).some(config => 
      config.quietHours && config.quietHours.start !== config.quietHours.end
    );

    return {
      totalNotificationTypes: totalTypes,
      enabledTypes,
      enabledChannels,
      quietHours: hasQuietHours
    };
  }
}