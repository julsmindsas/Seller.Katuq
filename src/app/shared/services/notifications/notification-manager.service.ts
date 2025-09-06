import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent, merge } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { HttpClient } from '@angular/common/http';

import { 
  KatuqNotification, 
  NotificationEvent, 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus,
  UserRole,
  NotificationStats
} from './notification.types';
import { NOTIFICATION_TEMPLATES, NOTIFICATION_CONFIG } from './notification.config';
import { NotificationService } from '../notification.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationManagerService {
  // Observables para el estado global
  private notificationsSubject = new BehaviorSubject<KatuqNotification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private connectionStatusSubject = new BehaviorSubject<boolean>(true);
  
  // Subject para nuevos eventos de notificación
  private notificationEvents$ = new Subject<NotificationEvent>();

  // Cache local de notificaciones
  private localNotifications: KatuqNotification[] = [];
  private throttleCache = new Map<string, number>();
  
  // Estado del usuario actual
  private currentUserId: string | null = null;
  private currentUserRole: UserRole = UserRole.SELLER;
  private currentCompanyId: string | null = null;

  // Configuración
  private isOnline = true;
  private isInitialized = false;

  constructor(
    private http: HttpClient,
    private db: AngularFireDatabase,
    private legacyNotificationService: NotificationService
  ) {
    this.initializeService();
    this.setupOnlineDetection();
  }

  // Observables públicos
  get notifications$(): Observable<KatuqNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  get unreadCount$(): Observable<number> {
    return this.unreadCountSubject.asObservable();
  }

  get connectionStatus$(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  get events$(): Observable<NotificationEvent> {
    return this.notificationEvents$.asObservable();
  }

  /**
   * Inicializa el servicio de notificaciones
   */
  private async initializeService(): Promise<void> {
    try {
      console.log('🔔 Inicializando NotificationManager...');
      
      // Obtener información del usuario actual
      await this.loadCurrentUser();
      
      // Cargar notificaciones desde caché local
      this.loadLocalNotifications();
      
      // Configurar escucha en Firebase Realtime Database
      this.setupFirebaseListener();
      
      // Configurar procesamiento de eventos
      this.setupEventProcessing();
      
      this.isInitialized = true;
      console.log('✅ NotificationManager inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando NotificationManager:', error);
    }
  }

  /**
   * Carga la información del usuario actual
   */
  private async loadCurrentUser(): Promise<void> {
    try {
      const currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      
      this.currentCompanyId = currentCompany.nit || currentCompany.id;
      this.currentUserId = currentUser.id || 'default_user';
      this.currentUserRole = this.determineUserRole(currentUser);
      
      console.log('👤 Usuario cargado:', {
        userId: this.currentUserId,
        role: this.currentUserRole,
        company: this.currentCompanyId
      });
    } catch (error) {
      console.error('Error cargando usuario actual:', error);
      // Valores por defecto
      this.currentUserId = 'default_user';
      this.currentUserRole = UserRole.SELLER;
    }
  }

  /**
   * Determina el rol del usuario basado en sus permisos
   */
  private determineUserRole(user: any): UserRole {
    if (!user || !user.role) return UserRole.SELLER;
    
    const roleMap: Record<string, UserRole> = {
      'admin': UserRole.ADMIN,
      'seller': UserRole.SELLER,
      'production': UserRole.PRODUCTION,
      'dispatcher': UserRole.DISPATCHER,
      'customer': UserRole.CUSTOMER,
      'messenger': UserRole.MESSENGER
    };
    
    return roleMap[user.role.toLowerCase()] || UserRole.SELLER;
  }

  /**
   * Configura la escucha de notificaciones en Firebase
   */
  private setupFirebaseListener(): void {
    if (!this.currentCompanyId) return;

    const notificationsPath = `notifications_${this.currentCompanyId}`;
    
    this.db.list(notificationsPath)
      .snapshotChanges()
      .subscribe((snapshots) => {
        const firebaseNotifications = snapshots.map((snapshot) => {
          const data: any = snapshot.payload.val();
          const id = snapshot.key;
          return { 
            id, 
            ...data,
            createdAt: new Date(data.createdAt),
            readAt: data.readAt ? new Date(data.readAt) : undefined,
            scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
          } as KatuqNotification;
        });

        // Filtrar notificaciones relevantes para el usuario actual
        const relevantNotifications = firebaseNotifications.filter(notification => 
          this.isNotificationRelevantForUser(notification)
        );

        // Mergear con notificaciones locales
        const allNotifications = this.mergeNotifications(relevantNotifications, this.localNotifications);
        
        // Ordenar por fecha de creación (más recientes primero)
        allNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        this.notificationsSubject.next(allNotifications);
        this.updateUnreadCount(allNotifications);

        // Procesar nuevas notificaciones para mostrar toasts
        this.processNewNotifications(allNotifications);
      });
  }

  /**
   * Verifica si una notificación es relevante para el usuario actual
   */
  private isNotificationRelevantForUser(notification: KatuqNotification): boolean {
    // Filtrar por usuario específico
    if (notification.userId && notification.userId !== this.currentUserId) {
      return false;
    }

    // Filtrar por rol de usuario
    const template = NOTIFICATION_TEMPLATES[notification.type];
    if (template && !template.targetRoles.includes(this.currentUserRole)) {
      return false;
    }

    // Filtrar por compañía
    if (notification.companyId && notification.companyId !== this.currentCompanyId) {
      return false;
    }

    // Filtrar notificaciones expiradas
    if (notification.expiresAt && notification.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Mergea notificaciones de diferentes fuentes eliminando duplicados
   */
  private mergeNotifications(firebase: KatuqNotification[], local: KatuqNotification[]): KatuqNotification[] {
    const merged = [...firebase];
    const firebaseIds = new Set(firebase.map(n => n.id));

    // Añadir notificaciones locales que no estén en Firebase
    local.forEach(localNotification => {
      if (!firebaseIds.has(localNotification.id)) {
        merged.push(localNotification);
      }
    });

    return merged;
  }

  /**
   * Procesa nuevas notificaciones para mostrar toasts
   */
  private processNewNotifications(notifications: KatuqNotification[]): void {
    const currentNotifications = this.notificationsSubject.getValue();
    const currentIds = new Set(currentNotifications.map(n => n.id));

    notifications.forEach(notification => {
      if (!currentIds.has(notification.id) && notification.status !== NotificationStatus.READ) {
        this.showInAppNotification(notification);
      }
    });
  }

  /**
   * Muestra una notificación in-app usando el servicio legacy
   */
  private showInAppNotification(notification: KatuqNotification): void {
    if (!notification.channels.includes(NotificationChannel.IN_APP)) return;

    const template = NOTIFICATION_TEMPLATES[notification.type];
    const shouldPersist = template?.persistInNotificationCenter ?? true;

    // Usar el servicio legacy para mostrar toast
    const notificationType = this.mapPriorityToLegacyType(notification.priority);
    
    this.legacyNotificationService.addNotification({
      message: notification.message,
      details: notification.title,
      timestamp: notification.createdAt,
      type: notificationType,
      typeIcon: notificationType,
      action: notification.actionUrl ? () => {
        // Navegar a la URL de acción
        window.location.href = notification.actionUrl!;
      } : undefined,
      btnName: notification.actionText
    });
  }

  /**
   * Mapea la prioridad a tipos del servicio legacy
   */
  private mapPriorityToLegacyType(priority: NotificationPriority): any {
    const mapping = {
      [NotificationPriority.LOW]: 'info',
      [NotificationPriority.NORMAL]: 'info',
      [NotificationPriority.HIGH]: 'warning',
      [NotificationPriority.CRITICAL]: 'danger'
    };
    return mapping[priority] || 'info';
  }

  /**
   * Actualiza el contador de notificaciones no leídas
   */
  private updateUnreadCount(notifications: KatuqNotification[]): void {
    const unreadCount = notifications.filter(n => 
      n.status !== NotificationStatus.READ && 
      (!n.expiresAt || n.expiresAt > new Date())
    ).length;
    
    this.unreadCountSubject.next(unreadCount);
  }

  /**
   * Configura el procesamiento de eventos de notificación
   */
  private setupEventProcessing(): void {
    this.notificationEvents$
      .pipe(
        debounceTime(100), // Agrupa eventos que llegan casi simultáneamente
        distinctUntilChanged((prev, curr) => 
          prev.type === curr.type && JSON.stringify(prev.data) === JSON.stringify(curr.data)
        )
      )
      .subscribe(event => {
        this.processNotificationEvent(event);
      });
  }

  /**
   * Procesa un evento de notificación
   */
  private async processNotificationEvent(event: NotificationEvent): Promise<void> {
    try {
      const template = NOTIFICATION_TEMPLATES[event.type];
      if (!template) {
        console.warn(`Template no encontrado para tipo: ${event.type}`);
        return;
      }

      // Verificar throttling
      if (await this.isThrottled(event)) {
        console.log(`Notificación throttled: ${event.type}`);
        return;
      }

      // Crear notificación
      const notification = this.createNotificationFromEvent(event, template);

      // Enviar a través de diferentes canales
      await this.sendNotification(notification);

      // Actualizar throttle cache
      this.updateThrottleCache(event);

    } catch (error) {
      console.error('Error procesando evento de notificación:', error);
    }
  }

  /**
   * Verifica si un evento debe ser throttled
   */
  private async isThrottled(event: NotificationEvent): Promise<boolean> {
    const template = NOTIFICATION_TEMPLATES[event.type];
    if (!template.throttlePeriodMinutes) return false;

    const throttleKey = `${event.type}_${event.userId || 'global'}_${this.currentCompanyId}`;
    const lastSent = this.throttleCache.get(throttleKey);
    
    if (!lastSent) return false;

    const throttlePeriodMs = template.throttlePeriodMinutes * 60 * 1000;
    return (Date.now() - lastSent) < throttlePeriodMs;
  }

  /**
   * Actualiza el cache de throttling
   */
  private updateThrottleCache(event: NotificationEvent): void {
    const template = NOTIFICATION_TEMPLATES[event.type];
    if (!template.throttlePeriodMinutes) return;

    const throttleKey = `${event.type}_${event.userId || 'global'}_${this.currentCompanyId}`;
    this.throttleCache.set(throttleKey, Date.now());
  }

  /**
   * Crea una notificación a partir de un evento
   */
  private createNotificationFromEvent(event: NotificationEvent, template: any): KatuqNotification {
    const now = new Date();
    
    return {
      id: this.generateNotificationId(),
      type: event.type,
      title: this.processTemplate(template.templates[NotificationChannel.IN_APP]?.title || '', event.data),
      message: this.processTemplate(template.templates[NotificationChannel.IN_APP]?.message || '', event.data),
      data: event.data,
      
      userId: event.userId || this.currentUserId,
      userRole: this.currentUserRole,
      companyId: event.companyId || this.currentCompanyId,
      
      channels: event.channels || template.channels,
      priority: event.priority || template.priority,
      status: NotificationStatus.PENDING,
      
      createdAt: now,
      scheduledFor: event.scheduledFor,
      expiresAt: template.expiresInMinutes ? 
        new Date(now.getTime() + template.expiresInMinutes * 60 * 1000) : undefined,
      
      actionUrl: template.templates[NotificationChannel.IN_APP]?.actionUrl ?
        this.processTemplate(template.templates[NotificationChannel.IN_APP].actionUrl, event.data) : undefined,
      actionText: template.templates[NotificationChannel.IN_APP]?.actionText,
      
      attempts: 0,
      groupKey: event.metadata?.groupKey,
      throttleKey: `${event.type}_${event.userId || 'global'}`
    };
  }

  /**
   * Procesa templates reemplazando variables
   */
  private processTemplate(template: string, data: any): string {
    if (!data) return template;

    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Genera un ID único para la notificación
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Envía una notificación a través de los canales especificados
   */
  private async sendNotification(notification: KatuqNotification): Promise<void> {
    const sendPromises: Promise<any>[] = [];

    // Enviar por cada canal configurado
    for (const channel of notification.channels) {
      switch (channel) {
        case NotificationChannel.IN_APP:
          sendPromises.push(this.sendInAppNotification(notification));
          break;
        
        case NotificationChannel.FIREBASE_REALTIME:
          sendPromises.push(this.sendFirebaseNotification(notification));
          break;
        
        case NotificationChannel.EMAIL:
          if (NOTIFICATION_CONFIG.features.emailNotifications) {
            sendPromises.push(this.sendEmailNotification(notification));
          }
          break;
        
        case NotificationChannel.PUSH:
          if (NOTIFICATION_CONFIG.features.pushNotifications) {
            sendPromises.push(this.sendPushNotification(notification));
          }
          break;
      }
    }

    try {
      await Promise.allSettled(sendPromises);
      notification.status = NotificationStatus.SENT;
      notification.lastAttemptAt = new Date();
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notification.attempts = (notification.attempts || 0) + 1;
      console.error('Error enviando notificación:', error);
    }
  }

  /**
   * Envía notificación in-app (local)
   */
  private async sendInAppNotification(notification: KatuqNotification): Promise<void> {
    this.localNotifications.push(notification);
    this.saveLocalNotifications();
    this.showInAppNotification(notification);
  }

  /**
   * Envía notificación a Firebase Realtime Database
   */
  private async sendFirebaseNotification(notification: KatuqNotification): Promise<void> {
    if (!this.currentCompanyId) throw new Error('Company ID no disponible');

    const notificationsPath = `notifications_${this.currentCompanyId}`;
    await this.db.list(notificationsPath).push({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      scheduledFor: notification.scheduledFor?.toISOString(),
      expiresAt: notification.expiresAt?.toISOString(),
      readAt: notification.readAt?.toISOString()
    });
  }

  /**
   * Envía notificación por email (backend)
   */
  private async sendEmailNotification(notification: KatuqNotification): Promise<void> {
    const endpoint = `${NOTIFICATION_CONFIG.api.baseUrl}${NOTIFICATION_CONFIG.api.endpoints.send}`;
    
    await this.http.post(endpoint, {
      type: 'email',
      notification: {
        ...notification,
        template: NOTIFICATION_TEMPLATES[notification.type].templates[NotificationChannel.EMAIL]
      }
    }).toPromise();
  }

  /**
   * Envía push notification (Firebase Cloud Messaging)
   */
  private async sendPushNotification(notification: KatuqNotification): Promise<void> {
    // Implementar cuando se configure FCM
    console.log('Push notification pendiente de implementar:', notification);
  }

  /**
   * Carga notificaciones del cache local
   */
  private loadLocalNotifications(): void {
    try {
      const stored = localStorage.getItem(`katuq_notifications_${this.currentUserId}`);
      if (stored) {
        this.localNotifications = JSON.parse(stored).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          scheduledFor: n.scheduledFor ? new Date(n.scheduledFor) : undefined,
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
          readAt: n.readAt ? new Date(n.readAt) : undefined
        }));
      }
    } catch (error) {
      console.error('Error cargando notificaciones locales:', error);
      this.localNotifications = [];
    }
  }

  /**
   * Guarda notificaciones en cache local
   */
  private saveLocalNotifications(): void {
    try {
      // Limitar a las últimas 100 notificaciones para no saturar el localStorage
      const toSave = this.localNotifications
        .slice(0, 100)
        .map(n => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
          scheduledFor: n.scheduledFor?.toISOString(),
          expiresAt: n.expiresAt?.toISOString(),
          readAt: n.readAt?.toISOString()
        }));

      localStorage.setItem(`katuq_notifications_${this.currentUserId}`, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error guardando notificaciones locales:', error);
    }
  }

  /**
   * Configura detección de estado online/offline
   */
  private setupOnlineDetection(): void {
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
    
    merge(online$, offline$).subscribe(isOnline => {
      this.isOnline = isOnline;
      this.connectionStatusSubject.next(isOnline);
      
      if (isOnline && this.isInitialized) {
        // Intentar reenviar notificaciones fallidas cuando vuelva la conexión
        this.retryFailedNotifications();
      }
    });
  }

  /**
   * Reintenta envío de notificaciones fallidas
   */
  private async retryFailedNotifications(): Promise<void> {
    const failedNotifications = this.localNotifications.filter(n => 
      n.status === NotificationStatus.FAILED && 
      (n.attempts || 0) < NOTIFICATION_CONFIG.defaults.maxRetries
    );

    for (const notification of failedNotifications) {
      await this.sendNotification(notification);
    }
  }

  // ============= MÉTODOS PÚBLICOS =============

  /**
   * Dispara un evento de notificación
   */
  public triggerNotification(event: NotificationEvent): void {
    if (!this.isInitialized) {
      console.warn('NotificationManager no está inicializado');
      return;
    }
    
    this.notificationEvents$.next(event);
  }

  /**
   * Marca una notificación como leída
   */
  public async markAsRead(notificationId: string): Promise<void> {
    try {
      // Actualizar localmente
      const notification = this.localNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.status = NotificationStatus.READ;
        notification.readAt = new Date();
        this.saveLocalNotifications();
      }

      // Actualizar en Firebase
      if (this.currentCompanyId) {
        const notificationsPath = `notifications_${this.currentCompanyId}/${notificationId}`;
        await this.db.object(notificationsPath).update({
          status: NotificationStatus.READ,
          readAt: new Date().toISOString()
        });
      }

      // Actualizar el observable
      const current = this.notificationsSubject.getValue();
      const updated = current.map(n => 
        n.id === notificationId 
          ? { ...n, status: NotificationStatus.READ, readAt: new Date() }
          : n
      );
      this.notificationsSubject.next(updated);
      this.updateUnreadCount(updated);

    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public async markAllAsRead(): Promise<void> {
    const notifications = this.notificationsSubject.getValue();
    const unreadIds = notifications
      .filter(n => n.status !== NotificationStatus.READ)
      .map(n => n.id);

    const markPromises = unreadIds.map(id => this.markAsRead(id!));
    await Promise.allSettled(markPromises);
  }

  /**
   * Elimina una notificación
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    try {
      // Eliminar localmente
      this.localNotifications = this.localNotifications.filter(n => n.id !== notificationId);
      this.saveLocalNotifications();

      // Eliminar de Firebase
      if (this.currentCompanyId) {
        const notificationsPath = `notifications_${this.currentCompanyId}/${notificationId}`;
        await this.db.object(notificationsPath).remove();
      }

      // Actualizar observable
      const current = this.notificationsSubject.getValue();
      const updated = current.filter(n => n.id !== notificationId);
      this.notificationsSubject.next(updated);
      this.updateUnreadCount(updated);

    } catch (error) {
      console.error('Error eliminando notificación:', error);
    }
  }

  /**
   * Limpia todas las notificaciones
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      // Limpiar notificaciones locales
      this.localNotifications = [];
      this.saveLocalNotifications();

      // Limpiar en Firebase
      if (this.currentCompanyId) {
        const notificationsPath = `notifications_${this.currentCompanyId}`;
        await this.db.object(notificationsPath).remove();
      }

      // Actualizar observables
      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);

      console.log('✅ Todas las notificaciones han sido eliminadas');
    } catch (error) {
      console.error('❌ Error limpiando todas las notificaciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  public async getNotificationStats(days: number = 30): Promise<NotificationStats> {
    const notifications = this.notificationsSubject.getValue();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const filteredNotifications = notifications.filter(n => 
      n.createdAt >= startDate
    );

    // Calcular estadísticas básicas
    const stats: NotificationStats = {
      totalSent: filteredNotifications.length,
      totalDelivered: filteredNotifications.filter(n => n.status === NotificationStatus.DELIVERED).length,
      totalRead: filteredNotifications.filter(n => n.status === NotificationStatus.READ).length,
      totalFailed: filteredNotifications.filter(n => n.status === NotificationStatus.FAILED).length,
      
      byChannel: {} as any,
      byType: {} as any,
      
      period: {
        start: startDate,
        end: new Date()
      }
    };

    // Estadísticas por canal
    for (const channel of Object.values(NotificationChannel)) {
      const channelNotifications = filteredNotifications.filter(n => 
        n.channels.includes(channel)
      );
      
      stats.byChannel[channel] = {
        sent: channelNotifications.length,
        delivered: channelNotifications.filter(n => n.status === NotificationStatus.DELIVERED).length,
        failed: channelNotifications.filter(n => n.status === NotificationStatus.FAILED).length
      };
    }

    // Estadísticas por tipo
    for (const type of Object.values(NotificationType)) {
      const typeNotifications = filteredNotifications.filter(n => n.type === type);
      
      stats.byType[type] = {
        sent: typeNotifications.length,
        delivered: typeNotifications.filter(n => n.status === NotificationStatus.DELIVERED).length,
        read: typeNotifications.filter(n => n.status === NotificationStatus.READ).length
      };
    }

    return stats;
  }

  /**
   * Limpia notificaciones expiradas
   */
  public cleanupExpiredNotifications(): void {
    const now = new Date();
    const current = this.notificationsSubject.getValue();
    
    const active = current.filter(n => !n.expiresAt || n.expiresAt > now);
    
    if (active.length !== current.length) {
      this.notificationsSubject.next(active);
      this.updateUnreadCount(active);
      
      // Actualizar cache local
      this.localNotifications = this.localNotifications.filter(n => 
        !n.expiresAt || n.expiresAt > now
      );
      this.saveLocalNotifications();
    }
  }

  /**
   * Obtiene notificaciones filtradas
   */
  public getNotifications(filter?: {
    type?: NotificationType;
    status?: NotificationStatus;
    priority?: NotificationPriority;
    limit?: number;
  }): Observable<KatuqNotification[]> {
    return this.notifications$.pipe(
      map(notifications => {
        let filtered = [...notifications];

        if (filter?.type) {
          filtered = filtered.filter(n => n.type === filter.type);
        }

        if (filter?.status) {
          filtered = filtered.filter(n => n.status === filter.status);
        }

        if (filter?.priority) {
          filtered = filtered.filter(n => n.priority === filter.priority);
        }

        if (filter?.limit) {
          filtered = filtered.slice(0, filter.limit);
        }

        return filtered;
      })
    );
  }
}