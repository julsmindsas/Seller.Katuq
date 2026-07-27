import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { NotificationManagerService } from '../../services/notifications/notification-manager.service';
import { NotificationPreferencesService } from '../../services/notifications/notification-preferences.service';
import { 
  KatuqNotification, 
  NotificationType, 
  NotificationPriority, 
  NotificationStatus,
  NotificationChannel,
  NotificationEvent
} from '../../services/notifications/notification.types';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss'],
  animations: [
    trigger('slideIn', [
      state('in', style({transform: 'translateX(0)'})),
      transition('void => *', [
        style({transform: 'translateX(100%)'}),
        animate(300)
      ]),
      transition('* => void', [
        animate(300, style({transform: 'translateX(100%)'}))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef;
  @ViewChild('overlayEl', { static: false }) overlayEl!: ElementRef;
  @ViewChild('panelEl', { static: false }) panelEl!: ElementRef;

  // Estado del componente
  public notifications: KatuqNotification[] = [];
  public filteredNotifications: KatuqNotification[] = [];
  public unreadCount = 0;
  public isOpen = false;
  public isLoading = true;
  public connectionStatus = true;

  // Filtros y búsqueda
  public searchTerm = '';
  public selectedFilter: 'all' | 'unread' | 'high-priority' | 'today' = 'all';
  public selectedType: NotificationType | 'all' = 'all';

  // Paginación
  public currentPage = 1;
  public pageSize = 20;
  public hasMore = false;

  // Estados para UI
  public showPreferences = false;
  public showClearConfirm = false;

  // Referencias para cleanup
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private cleanupInterval: any;

  // Preferencias in-app por tipo
  public typePreferences: { type: NotificationType; label: string; enabled: boolean }[] = [];

  // Enums para template
  public NotificationPriority = NotificationPriority;
  public NotificationStatus = NotificationStatus;
  public NotificationType = NotificationType;

  constructor(
    private notificationManager: NotificationManagerService,
    private preferencesService: NotificationPreferencesService,
    private renderer: Renderer2,
    private router: Router
  ) {
    this.setupSearchDebouncing();
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Inicializa el componente y sus suscripciones
   */
  private initializeComponent(): void {
    // Suscribirse a notificaciones
    this.notificationManager.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        this.applyFilters();
        this.isLoading = false;
      });

    // Suscribirse al contador de no leídas
    this.notificationManager.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });

    // Suscribirse al estado de conexión
    this.notificationManager.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
      });

    // Cargar preferencias in-app
    this.loadTypePreferences();

    // Configurar limpeza automática de notificaciones expiradas
    this.cleanupInterval = setInterval(() => {
      this.notificationManager.cleanupExpiredNotifications();
    }, 5 * 60 * 1000); // Cada 5 minutos
  }

  /**
   * Configura el debouncing para la búsqueda
   */
  private setupSearchDebouncing(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.applyFilters();
      });
  }

  /**
   * Aplica filtros a las notificaciones
   */
  private applyFilters(): void {
    let filtered = [...this.notifications];

    // Filtrar por búsqueda
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por tipo
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(notification => notification.type === this.selectedType);
    }

    // Aplicar filtros predefinidos
    switch (this.selectedFilter) {
      case 'unread':
        filtered = filtered.filter(notification => notification.status !== NotificationStatus.READ);
        break;
      
      case 'high-priority':
        filtered = filtered.filter(notification => 
          notification.priority === NotificationPriority.HIGH || 
          notification.priority === NotificationPriority.CRITICAL
        );
        break;
      
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(notification => notification.createdAt >= today);
        break;
    }

    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    this.filteredNotifications = filtered;
    this.updatePagination();
  }

  /**
   * Actualiza la información de paginación
   */
  private updatePagination(): void {
    const totalItems = this.filteredNotifications.length;
    const maxPage = Math.ceil(totalItems / this.pageSize);
    this.hasMore = this.currentPage < maxPage;
  }

  /**
   * Obtiene las notificaciones para la página actual
   */
  public getPagedNotifications(): KatuqNotification[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredNotifications.slice(0, endIndex);
  }

  /**
   * TrackBy function para optimizar el renderizado de la lista de notificaciones
   */
  public trackByNotificationId(index: number, notification: KatuqNotification): string {
    return notification.id || index.toString();
  }

  /**
   * Toggle del panel de notificaciones
   */
  public togglePanel(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.resetFilters();
      // Mover overlay y panel al body para escapar del stacking context del header
      setTimeout(() => {
        if (this.overlayEl?.nativeElement) {
          this.renderer.appendChild(document.body, this.overlayEl.nativeElement);
        }
        if (this.panelEl?.nativeElement) {
          this.renderer.appendChild(document.body, this.panelEl.nativeElement);
        }
        if (this.searchInput) {
          this.searchInput.nativeElement.focus();
        }
      }, 0);
    }
  }

  /**
   * Cierra el panel
   */
  public closePanel(): void {
    this.isOpen = false;
    this.showPreferences = false;
    this.showClearConfirm = false;
  }

  /**
   * Maneja cambios en la búsqueda
   */
  public onSearchChange(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  /**
   * Cambia el filtro activo
   */
  public setFilter(filter: 'all' | 'unread' | 'high-priority' | 'today'): void {
    this.selectedFilter = filter;
    this.currentPage = 1;
    this.applyFilters();
  }

  /**
   * Cambia el tipo de notificación a filtrar
   */
  public setTypeFilter(type: NotificationType | 'all'): void {
    this.selectedType = type;
    this.currentPage = 1;
    this.applyFilters();
  }

  /**
   * Resetea todos los filtros
   */
  public resetFilters(): void {
    this.searchTerm = '';
    this.selectedFilter = 'all';
    this.selectedType = 'all';
    this.currentPage = 1;
    if (this.searchInput) {
      this.searchInput.nativeElement.value = '';
    }
    this.applyFilters();
  }

  /**
   * Carga más notificaciones (paginación)
   */
  public loadMore(): void {
    if (this.hasMore) {
      this.currentPage++;
    }
  }

  /**
   * Marca una notificación como leída
   */
  public async markAsRead(notification: KatuqNotification): Promise<boolean> {
    if (notification.status === NotificationStatus.READ || !notification.id) {
      return true;
    }

    // El servicio publica la lista actualizada solo si el servidor confirmó.
    // No se marca a mano en pantalla: eso era lo que hacía ver como leída una
    // notificación que en realidad no se había guardado.
    return this.notificationManager.markAsRead(notification.id);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public async markAllAsRead(): Promise<void> {
    await this.notificationManager.markAllAsRead();
  }

  /**
   * Elimina una notificación
   */
  public async deleteNotification(notification: KatuqNotification): Promise<void> {
    if (notification.id) {
      await this.notificationManager.deleteNotification(notification.id);
    }
  }

  /**
   * Maneja click en una notificación
   */
  public async onNotificationClick(notification: KatuqNotification): Promise<void> {
    // Marcar como leída y esperar a que el servidor confirme antes de navegar:
    // si se navega primero, la petición se cancela y la notificación queda sin leer.
    await this.markAsRead(notification);

    // Navegar si tiene URL de acción
    if (notification.actionUrl) {
      // Cerrar el panel antes de navegar
      this.closePanel();
      if (notification.actionUrl.startsWith('/')) {
        this.router.navigateByUrl(notification.actionUrl);
      } else {
        window.open(notification.actionUrl, '_blank');
      }
    }
  }

  /**
   * Obtiene el icono para un tipo de notificación
   */
  public getNotificationIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      // Order notifications (📦)
      [NotificationType.ORDER_CREATED]: 'fa-shopping-bag',
      [NotificationType.ORDER_UPDATED]: 'fa-pencil',
      [NotificationType.ORDER_CANCELLED]: 'fa-times-circle',
      [NotificationType.ORDER_CONFIRMED]: 'fa-check-circle',
      
      // Payment notifications (💰)
      [NotificationType.PAYMENT_PENDING]: 'fa-hourglass-half',
      [NotificationType.PAYMENT_APPROVED]: 'fa-check-circle',
      [NotificationType.PAYMENT_REJECTED]: 'fa-times-circle',
      [NotificationType.PAYMENT_PREAPPROVED]: 'fa-usd',
      
      // Production notifications (🏭)
      [NotificationType.PRODUCTION_STARTED]: 'fa-cogs',
      [NotificationType.PRODUCTION_COMPLETED]: 'fa-wrench',
      [NotificationType.ORDER_PACKED]: 'fa-cube',
      [NotificationType.ORDER_DISPATCHED]: 'fa-truck',
      [NotificationType.ORDER_DELIVERED]: 'fa-check-square-o',
      [NotificationType.ORDER_PROCESS_REJECTED]: 'fa-exclamation-circle',
      
      // Inventory notifications (📊)
      [NotificationType.LOW_STOCK]: 'fa-exclamation-triangle',
      [NotificationType.OUT_OF_STOCK]: 'fa-battery-0',
      [NotificationType.STOCK_REPLENISHED]: 'fa-plus-circle',
      
      [NotificationType.NEW_CUSTOMER]: 'fa-user-plus',
      [NotificationType.CUSTOMER_UPDATED]: 'fa-user',
      
      [NotificationType.SHIPPING_CREATED]: 'fa-truck',
      [NotificationType.SHIPPING_UPDATED]: 'fa-map',
      [NotificationType.DELIVERY_PROBLEM]: 'fa-exclamation-circle',
      
      [NotificationType.CART_ABANDONED]: 'fa-shopping-cart',
      [NotificationType.CART_REMINDER]: 'fa-bell',
      
      [NotificationType.SYSTEM_ALERT]: 'fa-exclamation-triangle',
      [NotificationType.SYSTEM_MAINTENANCE]: 'fa-wrench',
      
      [NotificationType.CASH_CLOSING_REQUIRED]: 'fa-calculator',
      [NotificationType.POS_TRANSACTION_FAILED]: 'fa-times-circle',
      
      [NotificationType.SUPPLIER_ORDER_ACCEPTED]: 'fa-handshake-o',
      [NotificationType.SUPPLIER_ORDER_REJECTED]: 'fa-times-circle',
      [NotificationType.SUPPLIER_ORDER_DISPATCHED]: 'fa-truck',

      // Siigo / Contabilidad notifications (📄)
      [NotificationType.SIIGO_INVOICE_CREATED]: 'fa-file-text-o',
      [NotificationType.SIIGO_INVOICE_FAILED]: 'fa-file-excel-o',
      [NotificationType.SIIGO_INVOICE_PROCESSING]: 'fa-spinner',
      [NotificationType.SIIGO_CUSTOMER_CREATED]: 'fa-user-plus',
      [NotificationType.SIIGO_PRODUCT_SYNCED]: 'fa-refresh',

      // Facturación genérica
      [NotificationType.INVOICE_CREATED]: 'fa-check-square-o',
      [NotificationType.INVOICE_FAILED]: 'fa-exclamation-triangle'
    };

    return iconMap[type] || 'fa-info-circle';
  }

  /**
   * Obtiene la clase CSS para el icono según el tipo de notificación
   */
  public getNotificationIconClass(type: NotificationType): string {
    // Categorizar por tipo de notificación
    if (type.includes('ORDER')) return 'icon-order';
    if (type.includes('PAYMENT')) return 'icon-payment';
    if (type.includes('PRODUCTION') || type.includes('PACKED')) return 'icon-production';
    if (type.includes('SHIPPING') || type.includes('DELIVERY') || type.includes('DISPATCHED')) return 'icon-shipping';
    if (type.includes('CUSTOMER')) return 'icon-customer';
    if (type.includes('STOCK')) return 'icon-info';
    if (type.includes('CART')) return 'icon-marketing';
    if (type.includes('SYSTEM') || type.includes('ALERT')) return 'icon-alert';
    if (type.includes('POS') || type.includes('CASH')) return 'icon-payment';
    if (type.includes('SUPPLIER')) return 'icon-shipping';
    if (type.includes('SIIGO')) return 'icon-accounting';
    if (type === NotificationType.INVOICE_CREATED) return 'icon-accounting';
    if (type === NotificationType.INVOICE_FAILED) return 'icon-alert';

    return 'icon-info';
  }

  /**
   * Obtiene la clase CSS para la prioridad
   */
  public getPriorityClass(priority: NotificationPriority): string {
    const classMap = {
      [NotificationPriority.LOW]: 'priority-low',
      [NotificationPriority.NORMAL]: 'priority-normal',
      [NotificationPriority.HIGH]: 'priority-high',
      [NotificationPriority.CRITICAL]: 'priority-critical'
    };

    return classMap[priority] || 'priority-normal';
  }

  /**
   * Formatea la fecha relativa
   */
  public getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Ahora';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d`;
    }

    // Para fechas más antiguas, mostrar fecha formateada
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  }

  /**
   * Obtiene el nombre amigable del tipo de notificación
   */
  public getTypeName(type: NotificationType): string {
    const nameMap: Record<NotificationType, string> = {
      [NotificationType.ORDER_CREATED]: 'Nuevo Pedido',
      [NotificationType.ORDER_UPDATED]: 'Pedido Actualizado',
      [NotificationType.ORDER_CANCELLED]: 'Pedido Cancelado',
      [NotificationType.ORDER_CONFIRMED]: 'Pedido Confirmado',
      
      [NotificationType.PAYMENT_PENDING]: 'Pago Pendiente',
      [NotificationType.PAYMENT_APPROVED]: 'Pago Aprobado',
      [NotificationType.PAYMENT_REJECTED]: 'Pago Rechazado',
      [NotificationType.PAYMENT_PREAPPROVED]: 'Pago Pre-aprobado',
      
      [NotificationType.PRODUCTION_STARTED]: 'Producción Iniciada',
      [NotificationType.PRODUCTION_COMPLETED]: 'Producción Completada',
      [NotificationType.ORDER_PACKED]: 'Pedido Empacado',
      [NotificationType.ORDER_DISPATCHED]: 'Pedido Despachado',
      [NotificationType.ORDER_DELIVERED]: 'Pedido Entregado',
      [NotificationType.ORDER_PROCESS_REJECTED]: 'Pedido Rechazado',
      
      [NotificationType.LOW_STOCK]: 'Stock Bajo',
      [NotificationType.OUT_OF_STOCK]: 'Sin Stock',
      [NotificationType.STOCK_REPLENISHED]: 'Stock Reabastecido',
      
      [NotificationType.NEW_CUSTOMER]: 'Nuevo Cliente',
      [NotificationType.CUSTOMER_UPDATED]: 'Cliente Actualizado',
      
      [NotificationType.SHIPPING_CREATED]: 'Envío Creado',
      [NotificationType.SHIPPING_UPDATED]: 'Envío Actualizado',
      [NotificationType.DELIVERY_PROBLEM]: 'Problema de Entrega',
      
      [NotificationType.CART_ABANDONED]: 'Carrito Abandonado',
      [NotificationType.CART_REMINDER]: 'Recordatorio de Carrito',
      
      [NotificationType.SYSTEM_ALERT]: 'Alerta del Sistema',
      [NotificationType.SYSTEM_MAINTENANCE]: 'Mantenimiento',
      
      [NotificationType.CASH_CLOSING_REQUIRED]: 'Cierre de Caja',
      [NotificationType.POS_TRANSACTION_FAILED]: 'Transacción Fallida',
      
      [NotificationType.SUPPLIER_ORDER_ACCEPTED]: 'Pedido Aceptado',
      [NotificationType.SUPPLIER_ORDER_REJECTED]: 'Pedido Rechazado',
      [NotificationType.SUPPLIER_ORDER_DISPATCHED]: 'Pedido Despachado',

      // Siigo / Contabilidad
      [NotificationType.SIIGO_INVOICE_CREATED]: 'Factura Siigo Creada',
      [NotificationType.SIIGO_INVOICE_FAILED]: 'Error Facturación Siigo',
      [NotificationType.SIIGO_INVOICE_PROCESSING]: 'Procesando Factura',
      [NotificationType.SIIGO_CUSTOMER_CREATED]: 'Cliente Siigo Creado',
      [NotificationType.SIIGO_PRODUCT_SYNCED]: 'Producto Sincronizado',

      // Facturación genérica
      [NotificationType.INVOICE_CREATED]: 'Factura Creada',
      [NotificationType.INVOICE_FAILED]: 'Error de Facturación'
    };

    return nameMap[type] || type;
  }

  /**
   * Obtiene los tipos de notificación únicos para el filtro
   */
  public getAvailableTypes(): NotificationType[] {
    const types = new Set<NotificationType>();
    this.notifications.forEach(notification => {
      types.add(notification.type);
    });
    return Array.from(types).sort();
  }

  /**
   * Toggle de preferencias
   */
  public togglePreferences(): void {
    this.showPreferences = !this.showPreferences;
  }

  /**
   * Muestra confirmación para limpiar todas
   */
  public showClearAllConfirm(): void {
    this.showClearConfirm = true;
  }

  /**
   * Cancela confirmación de limpiar
   */
  public cancelClearAll(): void {
    this.showClearConfirm = false;
  }

  /**
   * Confirma limpiar todas las notificaciones
   */
  public async confirmClearAll(): Promise<void> {
    const ok = await this.notificationManager.clearAllNotifications();
    if (ok) {
      this.showClearConfirm = false;
    }
  }

  /**
   * Verifica si hay notificaciones
   */
  public get hasNotifications(): boolean {
    return this.filteredNotifications.length > 0;
  }

  /**
   * Verifica si está cargando
   */
  public get showLoader(): boolean {
    return this.isLoading;
  }

  /**
   * Obtiene mensaje cuando no hay notificaciones
   */
  public get emptyMessage(): string {
    if (this.searchTerm || this.selectedType !== 'all' || this.selectedFilter !== 'all') {
      return 'No se encontraron notificaciones con los filtros aplicados';
    }
    return 'No tienes notificaciones';
  }

  /**
   * Método para agregar notificaciones de prueba
   * NOTA: Deshabilitado en producción. Solo descomentar para pruebas de desarrollo.
   */
  // private addSampleNotifications(): void {
  //   // Esperar un momento para que el servicio esté listo
  //   setTimeout(() => {
  //     // Notificación de pedido creado
  //     const orderNotification: NotificationEvent = {
  //       type: NotificationType.ORDER_CREATED,
  //       data: {
  //         nroPedido: 'DEMO-001',
  //         cliente: 'Cliente Demo',
  //         total: '$125.000'
  //       },
  //       priority: NotificationPriority.HIGH
  //     };

  //     // Notificación de stock bajo
  //     const stockNotification: NotificationEvent = {
  //       type: NotificationType.LOW_STOCK,
  //       data: {
  //         productName: 'Producto Demo',
  //         currentStock: 3,
  //         minimumStock: 10
  //       },
  //       priority: NotificationPriority.NORMAL
  //     };

  //     // Notificación de pago aprobado
  //     const paymentNotification: NotificationEvent = {
  //       type: NotificationType.PAYMENT_APPROVED,
  //       data: {
  //         nroPedido: 'DEMO-002',
  //         monto: '$89.500',
  //         cliente: 'Otro Cliente Demo'
  //       },
  //       priority: NotificationPriority.HIGH
  //     };

  //     // Enviar las notificaciones
  //     this.notificationManager.triggerNotification(orderNotification);
  //     this.notificationManager.triggerNotification(stockNotification);
  //     this.notificationManager.triggerNotification(paymentNotification);

  //     console.log('🔔 Notificaciones de prueba agregadas para verificar la campanita');
  //   }, 1000);
  // }

  /**
   * Carga las preferencias por tipo desde NotificationPreferencesService
   */
  private loadTypePreferences(): void {
    const labels: Partial<Record<NotificationType, string>> = {
      [NotificationType.ORDER_CREATED]: 'Nuevo pedido',
      [NotificationType.PAYMENT_APPROVED]: 'Pago aprobado',
      [NotificationType.PAYMENT_REJECTED]: 'Pago rechazado',
      [NotificationType.PRODUCTION_STARTED]: 'Producción iniciada',
      [NotificationType.PRODUCTION_COMPLETED]: 'Producción completada',
      [NotificationType.ORDER_PACKED]: 'Pedido empacado',
      [NotificationType.ORDER_DISPATCHED]: 'Pedido despachado',
      [NotificationType.ORDER_DELIVERED]: 'Pedido entregado',
      [NotificationType.ORDER_PROCESS_REJECTED]: 'Pedido rechazado',
      [NotificationType.LOW_STOCK]: 'Stock bajo',
      [NotificationType.OUT_OF_STOCK]: 'Producto agotado',
      [NotificationType.INVOICE_CREATED]: 'Factura creada',
      [NotificationType.INVOICE_FAILED]: 'Error de facturación',
    };

    this.preferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prefs => {
        this.typePreferences = Object.entries(labels).map(([type, label]) => {
          const typePrefs = prefs?.types?.[type as NotificationType];
          const enabled = typePrefs ? typePrefs.enabled : true;
          return { type: type as NotificationType, label: label!, enabled };
        });
      });
  }

  /**
   * Toggle preferencia de un tipo de notificación
   */
  public async toggleTypePreference(type: NotificationType): Promise<void> {
    const pref = this.typePreferences.find(p => p.type === type);
    if (!pref) return;

    pref.enabled = !pref.enabled;
    await this.preferencesService.updateTypePreferences(type, { enabled: pref.enabled });
  }
}