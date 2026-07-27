import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription, fromEvent, merge } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

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
import { NotificationPreferencesService } from './notification-preferences.service';
import { AuthService } from '../firebase/auth.service';
import { SecurityService } from '../security/security.service';

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

  // Notificaciones de la empresa (Realtime DB + API). El servidor manda.
  private remoteNotifications: KatuqNotification[] = [];
  // Notificaciones generadas en el propio navegador (triggerNotification).
  private localNotifications: KatuqNotification[] = [];

  private throttleCache = new Map<string, number>();
  // Ids que ya mostraron toast — evita repetir el aviso emergente.
  private toastedIds = new Set<string>();
  // El primer snapshot solo pinta la campana; no lanza toasts de lo ya existente.
  private firstSnapshotDone = false;
  private static readonly MAX_TOASTS_PER_BATCH = 3;

  // Estado del usuario actual
  private currentUserId: string | null = null;
  private currentUserRole: UserRole = UserRole.SELLER;
  private currentCompanyId: string | null = null;

  // Identidad de la sesión activa (empresa|usuario). Si cambia, se reinicia todo.
  private sessionKey: string | null = null;
  private rtdbSubscription: Subscription | null = null;

  // Configuración
  private isOnline = true;
  private isInitialized = false;

  constructor(
    private http: HttpClient,
    private db: AngularFireDatabase,
    private legacyNotificationService: NotificationService,
    private toastr: ToastrService,
    private preferencesService: NotificationPreferencesService,
    private authService: AuthService,
    private securityService: SecurityService
  ) {
    this.initializeService();
    this.setupOnlineDetection();

    // Al iniciar sesión la empresa se guarda unos milisegundos después de
    // navegar al dashboard; aquí se engancha la campana en cuanto llega.
    this.securityService.companyInformation$.subscribe(() => {
      this.syncSession();
    });
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
   * Inicializa el servicio de notificaciones.
   * Este servicio es un singleton root: se construye una sola vez por carga de
   * la app, incluso estando en /login. Por eso el arranque real de la escucha
   * vive en syncSession(), que se puede volver a llamar cuando cambia la sesión.
   */
  private async initializeService(): Promise<void> {
    try {
      // Configurar procesamiento de eventos (independiente de la sesión)
      this.setupEventProcessing();
      this.isInitialized = true;

      await this.syncSession();
    } catch (error) {
      console.error('❌ Error inicializando NotificationManager:', error);
    }
  }

  /**
   * Sincroniza el servicio con la sesión actual del navegador.
   *
   * Es idempotente y barato: si la empresa y el usuario no cambiaron, no hace
   * nada. Se llama al arrancar y en cada navegación, de modo que iniciar sesión
   * (que navega sin recargar la página) conecte la campana, y cerrar sesión
   * la apague junto con la escucha de la empresa anterior.
   */
  public async syncSession(): Promise<void> {
    if (!this.authService.isLoggedIn) {
      if (this.sessionKey !== null) {
        this.teardownSession();
      }
      return;
    }

    const { companyId, userId, userRole } = this.readSessionIdentity();
    if (!companyId || !userId) {
      return; // sesión a medio armar (aún no se guardó la empresa)
    }

    const nextKey = `${companyId}|${userId}`;
    if (nextKey === this.sessionKey) {
      return; // misma sesión, nada que hacer
    }

    // Cambió el usuario o la empresa: cortar lo anterior antes de arrancar.
    this.teardownSession();

    this.currentCompanyId = companyId;
    this.currentUserId = userId;
    this.currentUserRole = userRole;
    this.sessionKey = nextKey;

    this.loadLocalNotifications();
    this.emitNotifications();

    await this.loadExistingNotifications();
    this.setupFirebaseListener();
  }

  /**
   * Apaga la escucha y borra de memoria lo de la sesión anterior.
   */
  private teardownSession(): void {
    if (this.rtdbSubscription) {
      this.rtdbSubscription.unsubscribe();
      this.rtdbSubscription = null;
    }

    this.remoteNotifications = [];
    this.localNotifications = [];
    this.toastedIds.clear();
    this.throttleCache.clear();
    this.firstSnapshotDone = false;

    this.sessionKey = null;
    this.currentCompanyId = null;
    this.currentUserId = null;
    this.currentUserRole = UserRole.SELLER;

    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  /**
   * Lee la identidad de la sesión desde el almacenamiento del navegador.
   */
  private readSessionIdentity(): { companyId: string | null; userId: string | null; userRole: UserRole } {
    try {
      let currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      if (!currentCompany.nomComercial && !currentCompany.nit) {
        currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      }

      return {
        companyId: currentCompany.nomComercial || currentCompany.nit || currentCompany.id || null,
        userId: currentUser.email || currentUser.id || currentUser.uid || null,
        userRole: this.determineUserRole(currentUser)
      };
    } catch (error) {
      console.error('Error leyendo la sesión actual:', error);
      return { companyId: null, userId: null, userRole: UserRole.SELLER };
    }
  }

  /**
   * Recalcula la lista visible (empresa + locales) y la publica.
   */
  private emitNotifications(): void {
    const byId = new Map<string, KatuqNotification>();
    for (const notification of this.remoteNotifications) {
      if (notification.id) byId.set(notification.id, notification);
    }
    for (const notification of this.localNotifications) {
      if (notification.id && !byId.has(notification.id)) byId.set(notification.id, notification);
    }

    const all = Array.from(byId.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    this.notificationsSubject.next(all);
    this.updateUnreadCount(all);
  }

  /**
   * Indica si una notificación vive en el servidor (campana de la empresa).
   */
  private isRemoteId(notificationId: string): boolean {
    return notificationId.startsWith('actualizacion_');
  }

  /** Id en Realtime DB a partir del id interno. */
  private toFirebaseKey(notificationId: string): string {
    return notificationId.replace('actualizacion_', '');
  }

  /** URL base de los endpoints de la campana para la empresa activa. */
  private sellerEndpoint(): string | null {
    if (!this.currentCompanyId) return null;
    return `${NOTIFICATION_CONFIG.api.baseUrl}${NOTIFICATION_CONFIG.api.endpoints.seller}/${encodeURIComponent(this.currentCompanyId)}`;
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
   * Carga el historial de la campana desde el backend.
   * El backend ya devuelve solo lo visible para este usuario y con `read`
   * resuelto individualmente.
   */
  private async loadExistingNotifications(): Promise<void> {
    const endpoint = this.sellerEndpoint();
    if (!endpoint) return;

    try {
      const response: any = await this.http.get(`${endpoint}?limit=50`).toPromise();
      if (!response?.success || !Array.isArray(response.notifications)) return;

      this.remoteNotifications = response.notifications.map((raw: any) =>
        this.toKatuqNotification(raw, raw.id)
      );

      // El historial ya está en pantalla: no se debe toastear al abrir la app.
      this.remoteNotifications.forEach(n => this.toastedIds.add(n.id!));

      this.saveLocalNotifications();
      this.emitNotifications();
    } catch (error) {
      console.warn('⚠️ No se pudo cargar el historial de notificaciones:', error);
    }
  }

  /**
   * Convierte una notificación cruda (Realtime DB o API) al formato interno.
   */
  private toKatuqNotification(raw: any, firebaseKey: string): KatuqNotification {
    const data = raw.data || {};

    return {
      id: 'actualizacion_' + firebaseKey,
      type: this.mapLegacyType(raw.type),
      title: this.extractTitle(raw),
      message: raw.message || raw.type || 'Nueva notificación',
      data: {
        orderId: data.orderId || data.nroPedido || raw.orderId,
        cliente: data.cliente || raw.cliente,
        total: data.total || raw.total,
        originalType: raw.type,
        firebaseId: firebaseKey,
        ...data
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
      readAt: raw.read ? new Date(raw.readAt || Date.now()) : undefined,

      // Acción y navegación (enviados por el backend)
      actionUrl: raw.actionUrl || undefined,
      actionText: raw.actionText || undefined,
      icon: raw.icon || undefined,
      color: raw.color || undefined
    };
  }

  /**
   * Configura la escucha en tiempo real de la campana.
   * Única fuente: ActualizacionTicket{empresa} en Realtime Database.
   */
  private setupFirebaseListener(): void {
    const companyData = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    const companyName = companyData?.nomComercial;

    if (!companyName) {
      console.warn('⚠️ Sin nombre de empresa: la campana no puede escuchar en tiempo real');
      return;
    }

    const notificationPath = 'ActualizacionTicket' + companyName;
    const userKey = this.userKeyForNotifications();

    // Solo las 100 más recientes: el nodo de la empresa puede acumular semanas.
    this.rtdbSubscription = this.db.list(notificationPath, ref =>
      ref.orderByChild('timestamp').limitToLast(100)
    )
      .snapshotChanges()
      .subscribe({
        next: (snapshots) => this.applySnapshot(snapshots, userKey),
        error: (error) => console.error('❌ Error escuchando notificaciones:', error)
      });
  }

  /**
   * Llave del usuario dentro de la notificación.
   * Debe generar exactamente lo mismo que el backend (resolveUserKey).
   */
  private userKeyForNotifications(): string {
    return (this.currentUserId || '')
      .trim()
      .toLowerCase()
      .replace(/[.#$/\[\]]/g, '_')
      .slice(0, 200);
  }

  /**
   * Reconstruye la lista de la empresa a partir del snapshot completo.
   * Lo que este usuario eliminó no entra, y "leída" sale de su propio registro
   * (readBy), no del de sus compañeros.
   */
  private applySnapshot(snapshots: any[], userKey: string): void {
    const visibles: KatuqNotification[] = [];
    const nuevasSinLeer: KatuqNotification[] = [];

    for (const snapshot of snapshots) {
      const value: any = snapshot.payload.val() || {};
      const key: string = snapshot.key;

      // Eliminada por este usuario → no se muestra
      if (value.deletedBy && value.deletedBy[userKey]) continue;

      // Leída por este usuario, o con el campo global anterior a este cambio
      const leida = !!(value.readBy && value.readBy[userKey]) || value.read === true;

      const notification = this.toKatuqNotification({ ...value, read: leida }, key);

      // Respetar las preferencias por tipo del usuario
      if (!this.preferencesService.shouldSendNotification(notification.type, NotificationChannel.IN_APP)) {
        continue;
      }

      visibles.push(notification);

      if (!leida && !this.toastedIds.has(notification.id!)) {
        nuevasSinLeer.push(notification);
      }
    }

    this.remoteNotifications = visibles;
    this.saveLocalNotifications();
    this.emitNotifications();

    this.announceNewNotifications(nuevasSinLeer);
  }

  /**
   * Muestra el aviso emergente de lo que acaba de llegar.
   * El primer snapshot no avisa: sería repetir todo lo que ya estaba en la campana.
   */
  private announceNewNotifications(nuevas: KatuqNotification[]): void {
    nuevas.forEach(n => this.toastedIds.add(n.id!));

    if (!this.firstSnapshotDone) {
      this.firstSnapshotDone = true;
      return;
    }

    if (nuevas.length === 0) return;

    const mostrar = nuevas.slice(0, NotificationManagerService.MAX_TOASTS_PER_BATCH);
    mostrar.forEach(n => this.showInAppNotification(n));

    const restantes = nuevas.length - mostrar.length;
    if (restantes > 0) {
      this.toastr.info(`Tienes ${restantes} notificaciones más sin leer`, 'Notificaciones', {
        timeOut: 5000,
        progressBar: true,
        closeButton: true
      });
    }
  }

  /**
   * Mapea tipos legacy de ActualizacionTicket a NotificationType
   */
  private mapLegacyType(type: string): NotificationType {
    const typeMap: Record<string, NotificationType> = {
      // Mapeos en inglés (tipos que envía el backend)
      'ORDER_CREATED': NotificationType.ORDER_CREATED,
      'ORDER_UPDATED': NotificationType.ORDER_UPDATED,
      'PAYMENT_APPROVED': NotificationType.PAYMENT_APPROVED,
      'PAYMENT_REJECTED': NotificationType.PAYMENT_REJECTED,
      'PRODUCTION_STARTED': NotificationType.PRODUCTION_STARTED,
      'PRODUCTION_COMPLETED': NotificationType.PRODUCTION_COMPLETED,
      'ORDER_PACKED': NotificationType.ORDER_PACKED,
      'ORDER_DISPATCHED': NotificationType.ORDER_DISPATCHED,
      'ORDER_DELIVERED': NotificationType.ORDER_DELIVERED,
      'ORDER_PROCESS_REJECTED': NotificationType.ORDER_PROCESS_REJECTED,

      // Mapeos en español (legacy)
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
   * Agrega una notificación generada en este navegador (sin duplicar).
   */
  private addLocalNotification(notification: KatuqNotification): void {
    // Verificar preferencias del usuario — si el tipo está deshabilitado, no agregar
    if (!this.preferencesService.shouldSendNotification(notification.type, NotificationChannel.IN_APP)) {
      return;
    }

    const exists = this.localNotifications.some(n => n.id === notification.id)
      || this.remoteNotifications.some(n => n.id === notification.id);
    if (exists) return;

    this.localNotifications.push(notification);
    this.saveLocalNotifications();
    this.emitNotifications();

    if (notification.status !== NotificationStatus.READ && !this.toastedIds.has(notification.id!)) {
      this.toastedIds.add(notification.id!);
      this.showInAppNotification(notification);
    }
  }

  /**
   * Muestra el aviso emergente (toast) de una notificación.
   * No se repite el mismo aviso: el control de "ya avisado" es por notificación,
   * no por tipo, para no tragarse pedidos seguidos.
   */
  private showInAppNotification(notification: KatuqNotification): void {
    if (!notification.channels.includes(NotificationChannel.IN_APP)) return;

    const title = notification.title || 'Notificación';
    const message = notification.message || '';
    const toastrOpts = { timeOut: 5000, progressBar: true, closeButton: true };

    switch (this.mapPriorityToLegacyType(notification.priority)) {
      case 'danger':
        this.toastr.error(message, title, toastrOpts);
        break;
      case 'warning':
        this.toastr.warning(message, title, toastrOpts);
        break;
      case 'success':
        this.toastr.success(message, title, toastrOpts);
        break;
      default:
        this.toastr.info(message, title, toastrOpts);
        break;
    }
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
    this.addLocalNotification(notification);
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

  /** Clave del caché: una por empresa + usuario, para no mezclar sesiones. */
  private cacheKey(): string {
    return `katuq_notifications_${this.sessionKey || 'sin_sesion'}`;
  }

  /**
   * Carga el caché local (solo para pintar algo mientras responde el servidor).
   */
  private loadLocalNotifications(): void {
    this.remoteNotifications = [];
    this.localNotifications = [];

    try {
      const stored = localStorage.getItem(this.cacheKey());
      if (!stored) return;

      const parsed: KatuqNotification[] = JSON.parse(stored).map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        scheduledFor: n.scheduledFor ? new Date(n.scheduledFor) : undefined,
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
        readAt: n.readAt ? new Date(n.readAt) : undefined
      }));

      for (const notification of parsed) {
        if (!notification.id) continue;
        if (this.isRemoteId(notification.id)) {
          this.remoteNotifications.push(notification);
        } else {
          this.localNotifications.push(notification);
        }
      }
    } catch (error) {
      console.error('Error cargando notificaciones locales:', error);
      this.remoteNotifications = [];
      this.localNotifications = [];
    }
  }

  /**
   * Guarda en caché las 100 MÁS RECIENTES (antes cortaba por orden de llegada,
   * o sea guardaba las más viejas y perdía las nuevas).
   */
  private saveLocalNotifications(): void {
    if (!this.sessionKey) return;

    try {
      const toSave = [...this.remoteNotifications, ...this.localNotifications]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 100)
        .map(n => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
          scheduledFor: n.scheduledFor?.toISOString(),
          expiresAt: n.expiresAt?.toISOString(),
          readAt: n.readAt?.toISOString()
        }));

      localStorage.setItem(this.cacheKey(), JSON.stringify(toSave));
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
   * Marca una notificación como leída (solo para el usuario actual).
   * Si el servidor no confirma, NO se cambia la pantalla y se avisa: antes
   * fallaba en silencio y al recargar volvía a aparecer sin leer.
   */
  public async markAsRead(notificationId: string): Promise<boolean> {
    const local = this.localNotifications.find(n => n.id === notificationId);
    if (local) {
      local.status = NotificationStatus.READ;
      local.readAt = new Date();
      this.saveLocalNotifications();
      this.emitNotifications();
      return true;
    }

    const endpoint = this.sellerEndpoint();
    if (!endpoint || !this.isRemoteId(notificationId)) return false;

    try {
      const key = this.toFirebaseKey(notificationId);
      await this.http.post(`${endpoint}/${encodeURIComponent(key)}/read`, {}).toPromise();

      this.remoteNotifications = this.remoteNotifications.map(n =>
        n.id === notificationId
          ? { ...n, status: NotificationStatus.READ, readAt: new Date() }
          : n
      );
      this.saveLocalNotifications();
      this.emitNotifications();
      return true;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      this.toastr.error('No se pudo marcar la notificación como leída', 'Notificaciones');
      return false;
    }
  }

  /**
   * Marca todas como leídas para el usuario actual (una sola llamada).
   */
  public async markAllAsRead(): Promise<boolean> {
    const now = new Date();

    this.localNotifications = this.localNotifications.map(n =>
      n.status === NotificationStatus.READ ? n : { ...n, status: NotificationStatus.READ, readAt: now }
    );

    const endpoint = this.sellerEndpoint();
    const hayRemotasSinLeer = this.remoteNotifications.some(n => n.status !== NotificationStatus.READ);

    if (!endpoint || !hayRemotasSinLeer) {
      this.saveLocalNotifications();
      this.emitNotifications();
      return true;
    }

    try {
      await this.http.post(`${endpoint}/read-all`, {}).toPromise();

      this.remoteNotifications = this.remoteNotifications.map(n =>
        n.status === NotificationStatus.READ ? n : { ...n, status: NotificationStatus.READ, readAt: now }
      );
      this.saveLocalNotifications();
      this.emitNotifications();
      return true;
    } catch (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error);
      this.toastr.error('No se pudieron marcar las notificaciones como leídas', 'Notificaciones');
      this.saveLocalNotifications();
      this.emitNotifications();
      return false;
    }
  }

  /**
   * Elimina una notificación de la campana del usuario actual.
   * No la borra para los demás y solo desaparece de la pantalla si el servidor
   * confirmó el borrado.
   */
  public async deleteNotification(notificationId: string): Promise<boolean> {
    const esLocal = this.localNotifications.some(n => n.id === notificationId);
    if (esLocal) {
      this.localNotifications = this.localNotifications.filter(n => n.id !== notificationId);
      this.saveLocalNotifications();
      this.emitNotifications();
      return true;
    }

    const endpoint = this.sellerEndpoint();
    if (!endpoint || !this.isRemoteId(notificationId)) return false;

    try {
      const key = this.toFirebaseKey(notificationId);
      await this.http.delete(`${endpoint}/${encodeURIComponent(key)}`).toPromise();

      this.remoteNotifications = this.remoteNotifications.filter(n => n.id !== notificationId);
      this.saveLocalNotifications();
      this.emitNotifications();
      return true;
    } catch (error) {
      console.error('Error eliminando notificación:', error);
      this.toastr.error('No se pudo eliminar la notificación', 'Notificaciones');
      return false;
    }
  }

  /**
   * Vacía la campana del usuario actual (no toca la de sus compañeros).
   */
  public async clearAllNotifications(): Promise<boolean> {
    const endpoint = this.sellerEndpoint();

    try {
      if (endpoint && this.remoteNotifications.length > 0) {
        await this.http.delete(endpoint).toPromise();
      }

      this.remoteNotifications = [];
      this.localNotifications = [];
      this.saveLocalNotifications();
      this.emitNotifications();
      return true;
    } catch (error) {
      console.error('❌ Error limpiando todas las notificaciones:', error);
      this.toastr.error('No se pudieron eliminar las notificaciones', 'Notificaciones');
      return false;
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
    const vigente = (n: KatuqNotification) => !n.expiresAt || n.expiresAt > now;

    const antes = this.localNotifications.length;
    this.localNotifications = this.localNotifications.filter(vigente);

    if (this.localNotifications.length !== antes) {
      this.saveLocalNotifications();
      this.emitNotifications();
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