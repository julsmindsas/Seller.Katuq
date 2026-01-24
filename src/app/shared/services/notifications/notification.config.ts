import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationTemplate, 
  UserRole,
  NotificationConfig
} from './notification.types';
import { environment } from '../../../../environments/environment';

// Templates de notificaciones predefinidos
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  // PEDIDOS Y VENTAS
  [NotificationType.ORDER_CREATED]: {
    type: NotificationType.ORDER_CREATED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.FIREBASE_REALTIME],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER, UserRole.PRODUCTION],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🛒 Nuevo pedido recibido',
        message: 'Pedido #{nroPedido} por ${cliente} - ${total}',
        actionText: 'Ver pedido',
        actionUrl: '/ventas/pedidos?id={orderId}'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Nuevo pedido - Katuq Seller',
        message: 'Se ha recibido un nuevo pedido #{nroPedido} por valor de ${total}.'
      },
      [NotificationChannel.PUSH]: {
        title: '🛒 Nuevo pedido',
        message: 'Pedido #{nroPedido} - ${total}'
      }
    },
    persistInNotificationCenter: true,
    expiresInMinutes: 1440 // 24 horas
  },

  [NotificationType.ORDER_UPDATED]: {
    type: NotificationType.ORDER_UPDATED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '📝 Pedido actualizado',
        message: 'El pedido #{nroPedido} ha sido actualizado',
        actionText: 'Ver cambios'
      }
    },
    throttlePeriodMinutes: 15,
    persistInNotificationCenter: true
  },

  [NotificationType.ORDER_CANCELLED]: {
    type: NotificationType.ORDER_CANCELLED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER, UserRole.PRODUCTION],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '❌ Pedido cancelado',
        message: 'El pedido #{nroPedido} ha sido cancelado',
        actionText: 'Ver detalles'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Pedido cancelado - Katuq',
        message: 'El pedido #{nroPedido} ha sido cancelado. Revisa los detalles en tu panel.'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  // PAGOS
  [NotificationType.PAYMENT_APPROVED]: {
    type: NotificationType.PAYMENT_APPROVED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '✅ Pago aprobado',
        message: 'Pago de ${monto} aprobado para pedido #{nroPedido}',
        actionText: 'Procesar pedido'
      },
      [NotificationChannel.PUSH]: {
        title: '💰 Pago aprobado',
        message: 'Pedido #{nroPedido} - ${monto}'
      }
    },
    persistInNotificationCenter: true
  },

  [NotificationType.PAYMENT_REJECTED]: {
    type: NotificationType.PAYMENT_REJECTED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.CRITICAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🚫 Pago rechazado',
        message: 'Pago rechazado para pedido #{nroPedido}. Contacta al cliente.',
        actionText: 'Ver pedido'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Pago rechazado - Acción requerida',
        message: 'El pago del pedido #{nroPedido} fue rechazado. Se requiere contactar al cliente.'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  [NotificationType.PAYMENT_PENDING]: {
    type: NotificationType.PAYMENT_PENDING,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '⏳ Pago pendiente',
        message: 'Pago pendiente para pedido #{nroPedido}',
        actionText: 'Verificar estado'
      }
    },
    throttlePeriodMinutes: 60,
    persistInNotificationCenter: true
  },

  [NotificationType.PAYMENT_PREAPPROVED]: {
    type: NotificationType.PAYMENT_PREAPPROVED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '✋ Pago pre-aprobado',
        message: 'Pago pre-aprobado para #{nroPedido}. Confirma para continuar.',
        actionText: 'Aprobar pago'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  // PRODUCCIÓN
  [NotificationType.PRODUCTION_STARTED]: {
    type: NotificationType.PRODUCTION_STARTED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER, UserRole.PRODUCTION],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🏭 Producción iniciada',
        message: 'Pedido #{nroPedido} ha entrado en producción',
        actionText: 'Ver progreso'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Pedido en producción',
        message: 'Tu pedido #{nroPedido} ha iniciado el proceso de producción.'
      }
    },
    throttlePeriodMinutes: 5,
    persistInNotificationCenter: true
  },

  [NotificationType.PRODUCTION_COMPLETED]: {
    type: NotificationType.PRODUCTION_COMPLETED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER, UserRole.DISPATCHER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '✅ Producción completada',
        message: 'Pedido #{nroPedido} listo para empaque',
        actionText: 'Empacar pedido'
      },
      [NotificationChannel.PUSH]: {
        title: '🎉 Pedido listo',
        message: 'Pedido #{nroPedido} completado'
      }
    },
    persistInNotificationCenter: true
  },

  [NotificationType.ORDER_PACKED]: {
    type: NotificationType.ORDER_PACKED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.DISPATCHER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '📦 Pedido empacado',
        message: 'Pedido #{nroPedido} empacado y listo para despacho',
        actionText: 'Despachar'
      }
    },
    persistInNotificationCenter: true
  },

  [NotificationType.ORDER_DISPATCHED]: {
    type: NotificationType.ORDER_DISPATCHED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🚚 Pedido despachado',
        message: 'Pedido #{nroPedido} despachado con {transportador}',
        actionText: 'Ver tracking'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Tu pedido está en camino',
        message: 'Tu pedido #{nroPedido} ha sido despachado. Tracking: {trackingNumber}'
      }
    },
    persistInNotificationCenter: true
  },

  [NotificationType.ORDER_DELIVERED]: {
    type: NotificationType.ORDER_DELIVERED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🎉 Pedido entregado',
        message: 'Pedido #{nroPedido} entregado exitosamente',
        actionText: 'Ver comprobante'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Pedido entregado - ¡Gracias por tu compra!',
        message: 'Tu pedido #{nroPedido} ha sido entregado exitosamente.'
      }
    },
    persistInNotificationCenter: true,
    expiresInMinutes: 10080 // 7 días
  },

  [NotificationType.ORDER_PROCESS_REJECTED]: {
    type: NotificationType.ORDER_PROCESS_REJECTED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.CRITICAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🚫 Pedido rechazado',
        message: 'Pedido #{nroPedido} rechazado: {razon}',
        actionText: 'Ver detalles'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  // INVENTARIO
  [NotificationType.LOW_STOCK]: {
    type: NotificationType.LOW_STOCK,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '⚠️ Stock bajo',
        message: 'Producto {producto} tiene solo {cantidad} unidades',
        actionText: 'Reabastecer'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Alerta de inventario bajo',
        message: 'El producto {producto} tiene stock bajo ({cantidad} unidades restantes).'
      }
    },
    throttlePeriodMinutes: 240, // 4 horas
    persistInNotificationCenter: true
  },

  [NotificationType.OUT_OF_STOCK]: {
    type: NotificationType.OUT_OF_STOCK,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.CRITICAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🚨 Sin stock',
        message: 'Producto {producto} agotado',
        actionText: 'Reabastecer'
      },
      [NotificationChannel.PUSH]: {
        title: '🚨 Producto agotado',
        message: '{producto} sin stock'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  [NotificationType.STOCK_REPLENISHED]: {
    type: NotificationType.STOCK_REPLENISHED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '✅ Stock reabastecido',
        message: 'Producto {producto} reabastecido ({cantidad} unidades)'
      }
    },
    throttlePeriodMinutes: 30,
    persistInNotificationCenter: false
  },

  // CLIENTES
  [NotificationType.NEW_CUSTOMER]: {
    type: NotificationType.NEW_CUSTOMER,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '👤 Nuevo cliente',
        message: 'Cliente {nombre} se registró',
        actionText: 'Ver perfil'
      }
    },
    persistInNotificationCenter: true,
    expiresInMinutes: 720 // 12 horas
  },

  [NotificationType.CUSTOMER_UPDATED]: {
    type: NotificationType.CUSTOMER_UPDATED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '📝 Cliente actualizado',
        message: 'Cliente {nombre} actualizó su información'
      }
    },
    throttlePeriodMinutes: 60,
    persistInNotificationCenter: false
  },

  // LOGÍSTICA
  [NotificationType.SHIPPING_CREATED]: {
    type: NotificationType.SHIPPING_CREATED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.DISPATCHER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🚚 Orden de envío creada',
        message: 'Orden #{nroOrden} para {destino}',
        actionText: 'Ver ruta'
      }
    },
    persistInNotificationCenter: true
  },

  [NotificationType.SHIPPING_UPDATED]: {
    type: NotificationType.SHIPPING_UPDATED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.DISPATCHER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '📍 Actualización de envío',
        message: 'Envío #{tracking} actualizado: {estado}'
      }
    },
    throttlePeriodMinutes: 30,
    persistInNotificationCenter: true
  },

  [NotificationType.DELIVERY_PROBLEM]: {
    type: NotificationType.DELIVERY_PROBLEM,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.CRITICAL,
    targetRoles: [UserRole.ADMIN, UserRole.DISPATCHER, UserRole.MESSENGER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🚨 Problema en entrega',
        message: 'Problema con envío #{tracking}: {problema}',
        actionText: 'Resolver'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Problema en entrega - Acción requerida',
        message: 'Se detectó un problema con el envío #{tracking}. Requiere atención inmediata.'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  // CARRITOS ABANDONADOS
  [NotificationType.CART_ABANDONED]: {
    type: NotificationType.CART_ABANDONED,
    channels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    targetRoles: [UserRole.CUSTOMER],
    templates: {
      [NotificationChannel.EMAIL]: {
        title: 'No olvides tu carrito 🛒',
        message: 'Tienes productos esperándote en tu carrito. ¡Completa tu compra ahora!'
      }
    },
    throttlePeriodMinutes: 1440, // 24 horas
    persistInNotificationCenter: false
  },

  [NotificationType.CART_REMINDER]: {
    type: NotificationType.CART_REMINDER,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    targetRoles: [UserRole.CUSTOMER],
    templates: {
      [NotificationChannel.PUSH]: {
        title: '🛒 Carrito abandonado',
        message: '¡Completa tu compra antes de que se agote el stock!'
      }
    },
    throttlePeriodMinutes: 720, // 12 horas
    persistInNotificationCenter: false
  },

  // SISTEMA
  [NotificationType.SYSTEM_ALERT]: {
    type: NotificationType.SYSTEM_ALERT,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.CRITICAL,
    targetRoles: [UserRole.ADMIN],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '⚠️ Alerta del sistema',
        message: '{mensaje}',
        actionText: 'Ver detalles'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  [NotificationType.SYSTEM_MAINTENANCE]: {
    type: NotificationType.SYSTEM_MAINTENANCE,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🔧 Mantenimiento programado',
        message: 'Mantenimiento el {fecha} de {inicio} a {fin}'
      }
    },
    persistInNotificationCenter: true,
    expiresInMinutes: 2880 // 48 horas
  },

  // POS Y CAJA
  [NotificationType.CASH_CLOSING_REQUIRED]: {
    type: NotificationType.CASH_CLOSING_REQUIRED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '💰 Cierre de caja requerido',
        message: 'Es hora de hacer el cierre de caja del POS',
        actionText: 'Cerrar caja'
      }
    },
    throttlePeriodMinutes: 60,
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  [NotificationType.POS_TRANSACTION_FAILED]: {
    type: NotificationType.POS_TRANSACTION_FAILED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '❌ Transacción POS fallida',
        message: 'Error en transacción: {error}',
        actionText: 'Reintentar'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  // DROPSHIPPING
  [NotificationType.SUPPLIER_ORDER_ACCEPTED]: {
    type: NotificationType.SUPPLIER_ORDER_ACCEPTED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '✅ Proveedor aceptó pedido',
        message: 'Pedido #{nroPedido} aceptado por {proveedor}',
        actionText: 'Ver detalles'
      }
    },
    persistInNotificationCenter: true
  },

  [NotificationType.SUPPLIER_ORDER_REJECTED]: {
    type: NotificationType.SUPPLIER_ORDER_REJECTED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.CRITICAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🚫 Proveedor rechazó pedido',
        message: 'Pedido #{nroPedido} rechazado por {proveedor}',
        actionText: 'Buscar alternativa'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true
  },

  [NotificationType.SUPPLIER_ORDER_DISPATCHED]: {
    type: NotificationType.SUPPLIER_ORDER_DISPATCHED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '📦 Proveedor despachó pedido',
        message: 'Pedido #{nroPedido} despachado. Tracking: {tracking}',
        actionText: 'Seguir envío'
      }
    },
    persistInNotificationCenter: true
  },

  [NotificationType.ORDER_CONFIRMED]: {
    type: NotificationType.ORDER_CONFIRMED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '✅ Pedido confirmado',
        message: 'Pedido #{nroPedido} confirmado por el cliente',
        actionText: 'Procesar'
      }
    },
    persistInNotificationCenter: true
  },

  // CONTABILIDAD / FACTURACIÓN ELECTRÓNICA (SIIGO)
  [NotificationType.SIIGO_INVOICE_CREATED]: {
    type: NotificationType.SIIGO_INVOICE_CREATED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.FIREBASE_REALTIME],
    priority: NotificationPriority.HIGH,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '📄 Factura Siigo creada',
        message: 'Factura {invoiceNumber} generada para pedido #{nroPedido}',
        actionText: 'Ver pedido',
        actionUrl: '/ventas/pedidos/{orderId}'
      }
    },
    persistInNotificationCenter: true,
    expiresInMinutes: 4320 // 3 días
  },

  [NotificationType.SIIGO_INVOICE_FAILED]: {
    type: NotificationType.SIIGO_INVOICE_FAILED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.FIREBASE_REALTIME],
    priority: NotificationPriority.CRITICAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '❌ Error facturando en Siigo',
        message: 'No se pudo crear factura para pedido #{nroPedido}: {error}',
        actionText: 'Ver pedido',
        actionUrl: '/ventas/pedidos/{orderId}'
      }
    },
    requiresUserInteraction: true,
    persistInNotificationCenter: true,
    expiresInMinutes: 10080 // 7 días
  },

  [NotificationType.SIIGO_INVOICE_PROCESSING]: {
    type: NotificationType.SIIGO_INVOICE_PROCESSING,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🔄 Facturando en Siigo',
        message: 'Generando factura para pedido #{nroPedido}...',
        actionText: 'Ver estado'
      }
    },
    throttlePeriodMinutes: 5,
    persistInNotificationCenter: false,
    expiresInMinutes: 30
  },

  [NotificationType.SIIGO_CUSTOMER_CREATED]: {
    type: NotificationType.SIIGO_CUSTOMER_CREATED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    targetRoles: [UserRole.ADMIN],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '👤 Cliente creado en Siigo',
        message: 'Cliente {customerName} sincronizado con Siigo',
        actionText: 'Ver detalles'
      }
    },
    persistInNotificationCenter: true,
    expiresInMinutes: 1440
  },

  [NotificationType.SIIGO_PRODUCT_SYNCED]: {
    type: NotificationType.SIIGO_PRODUCT_SYNCED,
    channels: [NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    targetRoles: [UserRole.ADMIN],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '📦 Productos sincronizados con Siigo',
        message: '{count} productos sincronizados exitosamente',
        actionText: 'Ver productos'
      }
    },
    throttlePeriodMinutes: 30,
    persistInNotificationCenter: true,
    expiresInMinutes: 1440
  }
};

// Configuración global del sistema de notificaciones
export const NOTIFICATION_CONFIG: NotificationConfig = {
  firebase: {
    apiKey: environment.firebase.apiKey,
    projectId: environment.firebase.projectId,
    messagingSenderId: environment.firebase.messagingSenderId,
    appId: environment.firebase.appId,
    vapidKey: 'BJ1234567890...' // Reemplazar con la VAPID key real
  },

  api: {
    enabled: false, // Deshabilitado hasta que el backend tenga los endpoints disponibles
    baseUrl: environment.urlApi,
    endpoints: {
      send: '/v1/notifications/send',
      history: '/v1/notifications/history',
      preferences: '/v1/notifications/preferences',
      markRead: '/v1/notifications/mark-read',
      stats: '/v1/notifications/stats'
    }
  },

  defaults: {
    expirationMinutes: 1440, // 24 horas por defecto
    maxRetries: 3,
    retryDelayMinutes: 5,
    batchSize: 100,
    throttleWindow: 60 // 1 hora
  },

  features: {
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false, // Deshabilitado por ahora
    realtimeUpdates: true,
    notificationCenter: true
  }
};