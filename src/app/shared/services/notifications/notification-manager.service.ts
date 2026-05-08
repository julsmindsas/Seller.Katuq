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
      // Obtener información del usuario actual
      await this.loadCurrentUser();
      
      // Cargar notificaciones desde caché local
      this.loadLocalNotifications();
      
      // Cargar notificaciones existentes desde el backend
      await this.loadExistingNotifications();

      // Configurar escucha en Firebase Realtime Database (solo nuevas en tiempo real)
      this.setupFirebaseListener();

      // Configurar procesamiento de eventos
      this.setupEventProcessing();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando NotificationManager:', error);
    }
  }

  /**
   * Carga la información del usuario actual
   */
  private async loadCurrentUser(): Promise<void> {
    try {
      // Intentar primero localStorage (más común en la app)
      let currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      let currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Fallback a sessionStorage si no hay datos en localStorage
      if (!currentCompany.nomComercial && !currentCompany.nit) {
        currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      }
      
      if (!currentUser.id && !currentUser.email) {
        currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      }
      
      // Extraer IDs con múltiples fallbacks
      this.currentCompanyId = currentCompany.nomComercial || currentCompany.nit || currentCompany.id || null;
      this.currentUserId = currentUser.id || currentUser.uid || currentUser.email || 'default_user';
      this.currentUserRole = this.determineUserRole(currentUser);
      
      console.log('👤 Usuario cargado:', {
        userId: this.currentUserId,
        role: this.currentUserRole,
        company: this.currentCompanyId,
        companyData: currentCompany
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
   * Carga notificaciones existentes desde el backend API
   */
  private async loadExistingNotifications(): Promise<void> {
    if (!this.currentCompanyId) return;

    try {
      const endpoint = `${NOTIFICATION_CONFIG.api.baseUrl}${NOTIFICATION_CONFIG.api.endpoints.seller}/${encodeURIComponent(this.currentCompanyId)}?limit=50`;
      const response: any = await this.http.get(endpoint).toPromise();

      if (!response?.success || !response.notifications?.length) return;

      for (const raw of response.notifications) {
        const id = 'actualizacion_' + raw.id;
        if (this.localNotifications.some(n => n.id === id)) continue;

        const notification: KatuqNotification = {
          id,
          type: this.mapLegacyType(raw.type),
          title: this.extractTitle(raw),
          message: raw.message || raw.type || 'Notificación',
          data: {
            orderId: raw.data?.orderId || raw.data?.nroPedido,
            cliente: raw.data?.cliente,
            total: raw.data?.total,
            originalType: raw.type,
            firebaseId: raw.id,
            ...raw.data
          },
          userId: this.currentUserId || undefined,
          userRole: this.currentUserRole,
          companyId: this.currentCompanyId || undefined,
          channels: [NotificationChannel.IN_APP],
          priority: raw.priority === 'CRITICAL' ? NotificationPriority.CRITICAL
                  : raw.priority === 'HIGH' ? NotificationPriority.HIGH
                  : NotificationPriority.NORMAL,
          status: raw.read ? NotificationStatus.READ : NotificationStatus.PENDING,
          createdAt: new Date(raw.timestamp || raw.createdAt || Date.now()),
          readAt: raw.read ? new Date() : undefined,
          actionUrl: raw.actionUrl || undefined,
          actionText: raw.actionText || undefined,
          icon: raw.icon || undefined,
          color: raw.color || undefined
        };

        this.localNotifications.push(notification);
      }

      this.saveLocalNotifications();
      const sorted = [...this.localNotifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      this.notificationsSubject.next(sorted);
      this.updateUnreadCount(sorted);

      console.log(`✅ ${response.notifications.length} notificaciones existentes cargadas desde API`);
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar notificaciones existentes (no crítico):', error);
    }
  }

  /**
   * Configura la escucha de notificaciones en Firebase
   */
  private setupFirebaseListener(): void {
    console.log('🔔 NotificationManager: Configurando listeners de Firebase...');
    
    // Solo escuchar ActualizacionTicket (Realtime DB) — única fuente de verdad
    // notification_queue en RTDB removido: el backend ya no escribe ahí
    this.listenToActualizacionTicket();
  }

  /**
   * Escucha la ruta nueva de notificaciones (notification_queue)
   */
  private listenToNotificationQueue(): void {
    if (!this.currentCompanyId) {
      console.log('⚠️ No hay companyId para notification_queue');
      return;
    }

    const notificationsPath = 'notification_queue';
    console.log('🔔 Escuchando notification_queue para company:', this.currentCompanyId);
    
    this.db.list(notificationsPath, ref => 
      ref.orderByChild('company').equalTo(this.currentCompanyId)
    )
      .snapshotChanges()
      .subscribe((snapshots) => {
        console.log('📨 Notificaciones de notification_queue:', snapshots.length);
        
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

        this.processFirebaseNotifications(firebaseNotifications, 'notification_queue');
      });
  }

  /**
   * Escucha la ruta legacy de notificaciones (ActualizacionTicket)
   */
  private listenToActualizacionTicket(): void {
    // Obtener company data del localStorage
    const companyData = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    
    if (!companyData || !companyData.nomComercial) {
      console.log('⚠️ No hay datos de empresa para ActualizacionTicket');
      return;
    }
    
    const notificationPath = 'ActualizacionTicket' + companyData.nomComercial;
    console.log('🔔 Escuchando ActualizacionTicket en:', notificationPath);
    
    // Suscripción para rastrear última notificación procesada
    let lastProcessedId: string | null = null;
    
    this.db.list(notificationPath)
      .snapshotChanges()
      .subscribe((snapshots) => {
        console.log('📨 Notificaciones de ActualizacionTicket:', snapshots.length);
        
        const notifications = snapshots.map((snapshot) => {
          const data: any = snapshot.payload.val();
          const id = snapshot.key;
          return { id, ...data };
        });

        // Ordenar por timestamp
        const sorted = notifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        // Buscar nueva notificación no leída
        const newNotification = sorted.find((n) => !n.read);
        
        if (newNotification && newNotification.id !== lastProcessedId) {
          lastProcessedId = newNotification.id;
          
          console.log('🔔 Nueva notificación de ActualizacionTicket:', newNotification);
          
          // Convertir al formato KatuqNotification
          const katuqNotification: KatuqNotification = {
            id: 'actualizacion_' + newNotification.id,
            type: this.mapLegacyType(newNotification.type),
            title: this.extractTitle(newNotification),
            message: newNotification.message || newNotification.type || 'Nueva notificación',
            data: {
              orderId: newNotification.orderId,
              cliente: newNotification.cliente,
              total: newNotification.total,
              originalType: newNotification.type,
              firebaseId: newNotification.id,
              ...newNotification
            },
            
            userId: this.currentUserId || undefined,
            userRole: this.currentUserRole,
            companyId: this.currentCompanyId || undefined,
            
            channels: [NotificationChannel.IN_APP],
            priority: newNotification.priority === 'CRITICAL' ? NotificationPriority.CRITICAL
                    : newNotification.priority === 'HIGH' ? NotificationPriority.HIGH
                    : NotificationPriority.NORMAL,
            status: newNotification.read ? NotificationStatus.READ : NotificationStatus.PENDING,

            createdAt: new Date(newNotification.timestamp || Date.now()),
            readAt: newNotification.read ? new Date() : undefined,

            // Accion y navegacion (enviados por el backend)
            actionUrl: newNotification.actionUrl || undefined,
            actionText: newNotification.actionText || undefined,
            icon: newNotification.icon || undefined,
            color: newNotification.color || undefined
          };
          
          // Agregar a notificaciones locales
          this.addLocalNotification(katuqNotification);
        }
      });
  }

  /**
   * Procesa notificaciones de Firebase (común para ambas rutas)
   */
  private processFirebaseNotifications(notifications: KatuqNotification[], source: string): void {
    console.log(`📥 Procesando ${notifications.length} notificaciones de ${source}`);
    
    // Filtrar notificaciones relevantes para el usuario actual
    const relevantNotifications = notifications.filter(notification => 
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
  }

  /**
   * Mapea tipos legacy de ActualizacionTicket a NotificationType
   */
  private mapLegacyType(type: string): NotificationType {
    const typeMap: Record<string, NotificationType> = {
      // Mapeos en inglés
      'ORDER_CREATED': NotificationType.ORDER_CREATED,
      'ORDER_UPDATED': NotificationType.ORDER_UPDATED,
      'PAYMENT_APPROVED': NotificationType.PAYMENT_APPROVED,
      'PAYMENT_REJECTED': NotificationType.PAYMENT_REJECTED,
      
      // Mapeos en español
      'Pedido Creado': NotificationType.ORDER_CREATED,
      'Pedido Actualizado': NotificationType.ORDER_UPDATED,
      'Pago Aprobado': NotificationType.PAYMENT_APPROVED,
      'Pago Rechazado': NotificationType.PAYMENT_REJECTED,
      'En Producción': NotificationType.PRODUCTION_STARTED,
      'Producción Completada': NotificationType.PRODUCTION_COMPLETED,
      'Empacado': NotificationType.ORDER_PACKED,
      'Despachado': NotificationType.ORDER_DISPATCHED,
      'Entregado': NotificationType.ORDER_DELIVERED,

      // Facturación electrónica
      'INVOICE_CREATED': NotificationType.INVOICE_CREATED,
      'INVOICE_FAILED': NotificationType.INVOICE_FAILED,
      'SIIGO_INVOICE_CREATED': NotificationType.SIIGO_INVOICE_CREATED,
      'SIIGO_INVOICE_FAILED': NotificationType.SIIGO_INVOICE_FAILED
    };

    return typeMap[type] || NotificationType.SYSTEM_ALERT;
  }

  /**
   * Extrae el título de una notificación legacy
   */
  private extractTitle(notification: any): string {
    if (notification.title) return notification.title;
    
    // Generar título basado en el tipo
    const typeNames: Record<string, string> = {
      'Pedido Creado': 'Nuevo Pedido',
      'Pedido Actualizado': 'Pedido Actualizado',
      'Pago Aprobado': 'Pago Confirmado',
      'Pago Rechazado': 'Pago Rechazado',
      'En Producción': 'En Producción',
      'Despachado': 'Pedido Despachado',
      'Entregado': 'Pedido Entregado'
    };
    
    return typeNames[notification.type] || 'Notificación';
  }

  /**
   * Agrega una notificación local sin duplicar
   */
  private addLocalNotification(notification: KatuqNotification): void {
    // Verificar si ya existe
    const exists = this.localNotifications.some(n => n.id === notification.id);
    if (!exists) {
      this.localNotifications.push(notification);
      this.saveLocalNotifications();
      
      // Actualizar observable
      const allNotifications = [...this.localNotifications];
      allNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      this.notificationsSubject.next(allNotifications);
      this.updateUnreadCount(allNotifications);
      
      // Mostrar toast si es nueva
      if (notification.status !== NotificationStatus.READ) {
        this.showInAppNotification(notification);
      }
    }
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
        console.warn(`❌ Template no encontrado para tipo: ${event.type}`);
        return;
      }

      // Verificar throttling
      if (await this.isThrottled(event)) {
        return;
      }

      // Crear notificación
      const notification = this.createNotificationFromEvent(event, template);

      // Enviar a través de diferentes canales
      await this.sendNotification(notification);

      // Actualizar throttle cache
      this.updateThrottleCache(event);

    } catch (error) {
      console.error('❌ Error procesando evento de notificación:', error);
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
      
      userId: event.userId || this.currentUserId || undefined,
      userRole: this.currentUserRole,
      companyId: event.companyId || this.currentCompanyId || undefined,
      
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
      console.error('❌ Error enviando notificación:', error);
    }
  }

  /**
   * Envía notificación in-app (local)
   */
  private async sendInAppNotification(notification: KatuqNotification): Promise<void> {
    this.localNotifications.push(notification);
    this.saveLocalNotifications();
    
    // Actualizar el observable de notificaciones
    const allNotifications = this.mergeNotifications([], this.localNotifications);
    this.notificationsSubject.next(allNotifications);
    
    this.showInAppNotification(notification);
  }

  /**
   * Envía notificación a Firebase Realtime Database
   */
  private async sendFirebaseNotification(notification: KatuqNotification): Promise<void> {
    if (!this.currentCompanyId) throw new Error('Company ID no disponible');

    // 🏢 Usar colección unificada con campo company
    const notificationsPath = 'notification_queue';
    await this.db.list(notificationsPath).push({
      ...notification,
      company: this.currentCompanyId, // 🔑 Campo para multi-tenant
      createdAt: notification.createdAt.toISOString(),
      scheduledFor: notification.scheduledFor?.toISOString(),
      expiresAt: notification.expiresAt?.toISOString(),
      readAt: notification.readAt?.toISOString()
    });
  }

  /**
   * Tipos de notificación cuyo email va al cliente (requieren toEmail en data).
   */
  /** Tipos cuyo email va al cliente: el backend debe recibir toEmail. */
  private static readonly CUSTOMER_EMAIL_TYPES: Set<string> = new Set([
    'ORDER_DISPATCHED',
    'ORDER_DELIVERED',
    'CART_ABANDONED',
    'CART_REMINDER'
  ]);

  /**
   * Envía notificación por email (backend).
   * Incluye toEmail en el payload cuando existe en notification.data para que el backend sepa el destinatario.
   */
  private async sendEmailNotification(notification: KatuqNotification): Promise<void> {
    const emailTemplate = NOTIFICATION_TEMPLATES[notification.type]?.templates?.[NotificationChannel.EMAIL];
    if (!emailTemplate) {
      console.warn(`🔔 Email no enviado: no hay template EMAIL para tipo ${notification.type}`);
      return;
    }

    const toEmail = notification.data?.clienteEmail || notification.data?.toEmail;
    const isCustomerEmail = NotificationManagerService.CUSTOMER_EMAIL_TYPES.has(notification.type);
    if (isCustomerEmail && !toEmail) {
      console.warn(`🔔 Email no enviado: notificación ${notification.type} requiere destinatario (clienteEmail/toEmail) y no está en data.`, notification.data);
      return;
    }

    const endpoint = `${NOTIFICATION_CONFIG.api.baseUrl}${NOTIFICATION_CONFIG.api.endpoints.send}`;
    const body = {
      type: 'email',
      toEmail: toEmail || undefined,
      notification: {
        ...notification,
        template: emailTemplate
      }
    };

    try {
      await this.http.post(endpoint, body).toPromise();
    } catch (error: any) {
      console.error('❌ Error enviando notificación por email:', error?.message || error, { type: notification.type, toEmail });
      throw error;
    }
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
      console.warn('❌ NotificationManager no está inicializado');
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

      // Actualizar en Firebase — detectar si viene de ActualizacionTicket o notification_queue
      if (this.currentCompanyId) {
        if (notificationId.startsWith('actualizacion_')) {
          const firebaseKey = notificationId.replace('actualizacion_', '');
          const companyData = JSON.parse(localStorage.getItem('currentCompany') || '{}');
          const companyName = companyData?.nomComercial;
          if (companyName && firebaseKey) {
            const rtdbPath = `ActualizacionTicket${companyName}/${firebaseKey}`;
            await this.db.object(rtdbPath).update({ read: true, readAt: new Date().toISOString() });
          }
        } else {
          const notificationsPath = `notification_queue/${notificationId}`;
          await this.db.object(notificationsPath).update({
            status: NotificationStatus.READ,
            readAt: new Date().toISOString()
          });
        }
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

      // Eliminar de Firebase — detectar ruta correcta
      if (this.currentCompanyId) {
        if (notificationId.startsWith('actualizacion_')) {
          const firebaseKey = notificationId.replace('actualizacion_', '');
          const companyData = JSON.parse(localStorage.getItem('currentCompany') || '{}');
          const companyName = companyData?.nomComercial;
          if (companyName && firebaseKey) {
            await this.db.object(`ActualizacionTicket${companyName}/${firebaseKey}`).remove();
          }
        } else {
          await this.db.object(`notification_queue/${notificationId}`).remove();
        }
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

      // Eliminar individualmente todas las notificaciones de la compañía actual
      if (this.currentCompanyId) {
        const currentNotifications = this.notificationsSubject.getValue();
        const deletePromises = currentNotifications.map(notification => 
          this.db.object(`notification_queue/${notification.id}`).remove()
        );
        await Promise.allSettled(deletePromises);
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