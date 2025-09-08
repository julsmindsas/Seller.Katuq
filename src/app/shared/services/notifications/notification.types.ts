// Tipos de notificaciones por categoría de negocio
export enum NotificationType {
  // Pedidos y Ventas
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  
  // Estados de Pago
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  PAYMENT_PREAPPROVED = 'PAYMENT_PREAPPROVED',
  
  // Estados de Proceso
  PRODUCTION_STARTED = 'PRODUCTION_STARTED',
  PRODUCTION_COMPLETED = 'PRODUCTION_COMPLETED',
  ORDER_PACKED = 'ORDER_PACKED',
  ORDER_DISPATCHED = 'ORDER_DISPATCHED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_PROCESS_REJECTED = 'ORDER_PROCESS_REJECTED',
  
  // Inventario
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  STOCK_REPLENISHED = 'STOCK_REPLENISHED',
  
  // Clientes
  NEW_CUSTOMER = 'NEW_CUSTOMER',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  
  // Logística
  SHIPPING_CREATED = 'SHIPPING_CREATED',
  SHIPPING_UPDATED = 'SHIPPING_UPDATED',
  DELIVERY_PROBLEM = 'DELIVERY_PROBLEM',
  
  // Carritos abandonados
  CART_ABANDONED = 'CART_ABANDONED',
  CART_REMINDER = 'CART_REMINDER',
  
  // Sistema
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  
  // POS y Caja
  CASH_CLOSING_REQUIRED = 'CASH_CLOSING_REQUIRED',
  POS_TRANSACTION_FAILED = 'POS_TRANSACTION_FAILED',
  
  // Dropshipping
  SUPPLIER_ORDER_ACCEPTED = 'SUPPLIER_ORDER_ACCEPTED',
  SUPPLIER_ORDER_REJECTED = 'SUPPLIER_ORDER_REJECTED',
  SUPPLIER_ORDER_DISPATCHED = 'SUPPLIER_ORDER_DISPATCHED'
}

// Canales de notificación disponibles
export enum NotificationChannel {
  IN_APP = 'IN_APP',           // Notificaciones dentro de la aplicación
  EMAIL = 'EMAIL',             // Correo electrónico
  PUSH = 'PUSH',               // Push notifications del navegador
  SMS = 'SMS',                 // SMS (futuro)
  FIREBASE_REALTIME = 'FIREBASE_REALTIME', // Firebase Realtime Database
  WEBHOOK = 'WEBHOOK'          // Webhooks para integraciones externas
}

// Prioridades de notificación
export enum NotificationPriority {
  LOW = 'LOW',           // Batch processing, no urgente
  NORMAL = 'NORMAL',     // Procesamiento normal (5-15 min)
  HIGH = 'HIGH',         // Tiempo real, importante
  CRITICAL = 'CRITICAL'  // Inmediato, crítico para el negocio
}

// Estados de notificación
export enum NotificationStatus {
  PENDING = 'PENDING',     // Pendiente de envío
  SENT = 'SENT',           // Enviada exitosamente
  DELIVERED = 'DELIVERED', // Entregada (confirmada por el canal)
  READ = 'READ',           // Leída por el usuario
  FAILED = 'FAILED',       // Falló el envío
  CANCELLED = 'CANCELLED'  // Cancelada antes del envío
}

// Roles de usuario para targeting
export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  PRODUCTION = 'PRODUCTION',
  DISPATCHER = 'DISPATCHER',
  CUSTOMER = 'CUSTOMER',
  MESSENGER = 'MESSENGER'
}

// Interface principal de notificación
export interface KatuqNotification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Datos adicionales específicos del tipo
  
  // Targeting
  userId?: string;
  userRole?: UserRole;
  companyId?: string;
  
  // Configuración
  channels: NotificationChannel[];
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Metadata
  createdAt: Date;
  scheduledFor?: Date; // Para notificaciones programadas
  expiresAt?: Date;    // Fecha de expiración
  readAt?: Date;
  
  // Personalización
  icon?: string;
  color?: string;
  actionUrl?: string;
  actionText?: string;
  
  // Tracking
  attempts?: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
  
  // Para agrupación
  groupKey?: string;
  
  // Configuración de throttling
  throttleKey?: string;
  throttlePeriodMinutes?: number;
}

// Configuración de template de notificación
export interface NotificationTemplate {
  type: NotificationType;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  
  // Templates por canal
  templates: {
    [channel in NotificationChannel]?: {
      title: string;
      message: string;
      actionText?: string;
      actionUrl?: string;
    }
  };
  
  // Configuración de comportamiento
  throttlePeriodMinutes?: number;
  expiresInMinutes?: number;
  requiresUserInteraction?: boolean;
  persistInNotificationCenter?: boolean;
  
  // Targeting
  targetRoles: UserRole[];
}

// Configuración de preferencias de usuario
export interface NotificationPreferences {
  userId: string;
  
  // Preferencias generales por canal
  channels: {
    [channel in NotificationChannel]: {
      enabled: boolean;
      quietHours?: {
        start: string; // HH:mm format
        end: string;
      };
    }
  };
  
  // Preferencias específicas por tipo
  types: {
    [type in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
      priority?: NotificationPriority;
    }
  };
  
  // Configuración de dispositivo
  deviceSettings: {
    fcmToken?: string; // Firebase Cloud Messaging token
    browserNotifications: boolean;
    sound: boolean;
    vibration: boolean;
  };
  
  // Metadata
  updatedAt: Date;
  createdAt: Date;
}

// Evento para hooks en servicios
export interface NotificationEvent {
  type: NotificationType;
  data: any;
  userId?: string;
  companyId?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

// Estadísticas de notificaciones
export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  
  byChannel: {
    [channel in NotificationChannel]: {
      sent: number;
      delivered: number;
      failed: number;
    }
  };
  
  byType: {
    [type in NotificationType]: {
      sent: number;
      delivered: number;
      read: number;
    }
  };
  
  period: {
    start: Date;
    end: Date;
  };
}

// Configuración del sistema de notificaciones
export interface NotificationConfig {
  // Firebase
  firebase: {
    apiKey: string;
    projectId: string;
    messagingSenderId: string;
    appId: string;
    vapidKey?: string;
  };
  
  // API endpoints
  api: {
    enabled: boolean;  // Flag to enable/disable API calls
    baseUrl: string;
    endpoints: {
      send: string;
      history: string;
      preferences: string;
      markRead: string;
      stats: string;
    };
  };
  
  // Configuraciones por defecto
  defaults: {
    expirationMinutes: number;
    maxRetries: number;
    retryDelayMinutes: number;
    batchSize: number;
    throttleWindow: number;
  };
  
  // Feature flags
  features: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    realtimeUpdates: boolean;
    notificationCenter: boolean;
  };
}