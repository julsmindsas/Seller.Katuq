# Sistema de Notificaciones de Katuq

## Descripción General

El sistema de notificaciones de Katuq es una arquitectura multi-capa que gestiona todas las comunicaciones con usuarios a través de múltiples canales. Proporciona notificaciones en tiempo real, persistencia offline, y sincronización entre dispositivos.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        Aplicación Angular                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐     ┌──────────────────────────┐         │
│  │  Servicios de    │────▶│ NotificationManagerService│         │
│  │  Negocio         │     └──────────┬───────────────┘         │
│  │  (VentasService) │                 │                         │
│  └──────────────────┘                 ▼                         │
│                           ┌──────────────────────┐              │
│                           │  NotificationService  │              │
│                           │      (Legacy)        │              │
│                           └──────────────────────┘              │
│                                       │                         │
│  ┌──────────────────┐                 ▼                         │
│  │ Notification     │     ┌──────────────────────┐              │
│  │ Center UI        │◀────│   Toast Messages     │              │
│  └──────────────────┘     └──────────────────────┘              │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                         Capa de Datos                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐       │
│  │ localStorage │  │   Firebase   │  │  Backend API   │       │
│  │   (Cache)    │  │   Realtime   │  │  (Futuro)      │       │
│  └──────────────┘  └──────────────┘  └────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. NotificationManagerService
**Ubicación:** `src/app/shared/services/notifications/notification-manager.service.ts`

El servicio central que orquesta todo el sistema de notificaciones:

- **Responsabilidades:**
  - Gestión del ciclo de vida de notificaciones
  - Routing a diferentes canales (In-App, Email, Push, etc.)
  - Persistencia local y sincronización con Firebase
  - Control de throttling y deduplicación
  - Gestión de estado offline/online

- **Observables principales:**
  ```typescript
  notifications$: Observable<KatuqNotification[]>  // Lista de notificaciones
  unreadCount$: Observable<number>                 // Contador no leídas
  connectionStatus$: Observable<boolean>           // Estado de conexión
  events$: Observable<NotificationEvent>           // Stream de eventos
  ```

### 2. NotificationService (Legacy)
**Ubicación:** `src/app/shared/services/notification.service.ts`

Servicio legacy para mostrar toasts/notificaciones emergentes:

- **Métodos útiles:**
  ```typescript
  success(title: string, message: string)
  error(title: string, message: string)
  warning(title: string, message: string)
  info(title: string, message: string)
  ```

### 3. Notification Center Component
**Ubicación:** `src/app/shared/components/notification-center/`

UI para visualizar y gestionar notificaciones:

- Panel deslizable con lista de notificaciones
- Filtros por tipo, prioridad y estado
- Búsqueda en tiempo real
- Marcado como leído/no leído
- Eliminación individual y masiva

### 4. Tipos y Configuración
**Ubicación:** `src/app/shared/services/notifications/`

- `notification.types.ts` - Enums e interfaces TypeScript
- `notification.config.ts` - Templates y configuración global

## Guía de Integración

### Cómo Disparar una Notificación

#### 1. Importar el servicio en tu componente/servicio:

```typescript
import { NotificationManagerService } from '@shared/services/notifications/notification-manager.service';
import { NotificationEvent, NotificationType, NotificationPriority } from '@shared/services/notifications/notification.types';

constructor(
  private notificationManager: NotificationManagerService
) {}
```

#### 2. Crear y disparar el evento de notificación:

```typescript
// Ejemplo: Notificación de nuevo pedido
const event: NotificationEvent = {
  type: NotificationType.ORDER_CREATED,
  data: {
    nroPedido: 'PED-2024-001',
    cliente: 'Juan Pérez',
    total: '$150.000',
    orderId: 'abc123'
  },
  priority: NotificationPriority.HIGH
};

this.notificationManager.triggerNotification(event);
```

#### 3. Ejemplo con notificación programada:

```typescript
const event: NotificationEvent = {
  type: NotificationType.CART_REMINDER,
  data: {
    productCount: 3,
    cartTotal: '$89.500'
  },
  priority: NotificationPriority.LOW,
  scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // En 24 horas
};

this.notificationManager.triggerNotification(event);
```

### Agregar un Nuevo Tipo de Notificación

#### 1. Agregar el tipo en `notification.types.ts`:

```typescript
export enum NotificationType {
  // ... tipos existentes ...
  MY_NEW_NOTIFICATION = 'MY_NEW_NOTIFICATION'
}
```

#### 2. Configurar el template en `notification.config.ts`:

```typescript
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  // ... templates existentes ...
  
  [NotificationType.MY_NEW_NOTIFICATION]: {
    type: NotificationType.MY_NEW_NOTIFICATION,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: NotificationPriority.NORMAL,
    targetRoles: [UserRole.ADMIN, UserRole.SELLER],
    templates: {
      [NotificationChannel.IN_APP]: {
        title: '🔔 Mi Nueva Notificación',
        message: 'Descripción: {descripcion}',
        actionText: 'Ver detalles',
        actionUrl: '/mi-modulo/detalle/{id}'
      },
      [NotificationChannel.EMAIL]: {
        title: 'Nueva Notificación - Katuq',
        message: 'Se ha generado una nueva notificación: {descripcion}'
      }
    },
    throttlePeriodMinutes: 30, // Opcional: evitar spam
    persistInNotificationCenter: true,
    expiresInMinutes: 1440 // Opcional: expira en 24 horas
  }
};
```

#### 3. Actualizar el componente Notification Center (si necesitas iconos personalizados):

En `notification-center.component.ts`, método `getNotificationIcon()`:

```typescript
const iconMap: Record<NotificationType, string> = {
  // ... iconos existentes ...
  [NotificationType.MY_NEW_NOTIFICATION]: 'fa-bell'
};
```

## Referencia de Configuración

### Tipos de Notificación Disponibles

| Categoría | Tipo | Descripción | Prioridad Default |
|-----------|------|-------------|-------------------|
| **Pedidos** | ORDER_CREATED | Nuevo pedido recibido | HIGH |
| | ORDER_UPDATED | Pedido actualizado | NORMAL |
| | ORDER_CANCELLED | Pedido cancelado | HIGH |
| | ORDER_CONFIRMED | Pedido confirmado | NORMAL |
| **Pagos** | PAYMENT_PENDING | Pago pendiente | NORMAL |
| | PAYMENT_APPROVED | Pago aprobado | HIGH |
| | PAYMENT_REJECTED | Pago rechazado | CRITICAL |
| | PAYMENT_PREAPPROVED | Pago pre-aprobado | HIGH |
| **Producción** | PRODUCTION_STARTED | Producción iniciada | NORMAL |
| | PRODUCTION_COMPLETED | Producción completada | HIGH |
| | ORDER_PACKED | Pedido empacado | HIGH |
| | ORDER_DISPATCHED | Pedido despachado | HIGH |
| | ORDER_DELIVERED | Pedido entregado | NORMAL |
| **Inventario** | LOW_STOCK | Stock bajo | HIGH |
| | OUT_OF_STOCK | Sin stock | CRITICAL |
| | STOCK_REPLENISHED | Stock reabastecido | LOW |
| **Clientes** | NEW_CUSTOMER | Nuevo cliente | NORMAL |
| | CUSTOMER_UPDATED | Cliente actualizado | LOW |
| **Sistema** | SYSTEM_ALERT | Alerta del sistema | CRITICAL |
| | SYSTEM_MAINTENANCE | Mantenimiento programado | HIGH |

### Canales de Notificación

```typescript
export enum NotificationChannel {
  IN_APP = 'IN_APP',                   // Notificaciones dentro de la app
  EMAIL = 'EMAIL',                     // Correo electrónico
  PUSH = 'PUSH',                       // Push del navegador
  SMS = 'SMS',                         // SMS (futuro)
  FIREBASE_REALTIME = 'FIREBASE_REALTIME', // Firebase Realtime DB
  WEBHOOK = 'WEBHOOK'                  // Webhooks externos
}
```

### Niveles de Prioridad

```typescript
export enum NotificationPriority {
  LOW = 'LOW',           // Batch, no urgente
  NORMAL = 'NORMAL',     // Procesamiento normal
  HIGH = 'HIGH',         // Tiempo real, importante
  CRITICAL = 'CRITICAL'  // Inmediato, crítico
}
```

### Roles de Usuario

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  PRODUCTION = 'PRODUCTION',
  DISPATCHER = 'DISPATCHER',
  CUSTOMER = 'CUSTOMER',
  MESSENGER = 'MESSENGER'
}
```

## Ejemplos de Uso

### Ejemplo 1: Notificación de Stock Bajo

```typescript
// En el servicio de inventario
checkStockLevels(product: Product): void {
  if (product.stock < product.minStock) {
    const event: NotificationEvent = {
      type: NotificationType.LOW_STOCK,
      data: {
        producto: product.name,
        cantidad: product.stock,
        minimo: product.minStock
      },
      priority: product.stock === 0 
        ? NotificationPriority.CRITICAL 
        : NotificationPriority.HIGH
    };
    
    this.notificationManager.triggerNotification(event);
  }
}
```

### Ejemplo 2: Notificación de Cambio de Estado de Pedido

```typescript
// En VentasService
updateOrderStatus(order: Pedido, newStatus: EstadoProceso): void {
  // ... lógica de actualización ...
  
  const notificationTypeMap = {
    'Producido': NotificationType.PRODUCTION_COMPLETED,
    'Empacado': NotificationType.ORDER_PACKED,
    'Despachado': NotificationType.ORDER_DISPATCHED,
    'Entregado': NotificationType.ORDER_DELIVERED
  };
  
  if (notificationTypeMap[newStatus]) {
    const event: NotificationEvent = {
      type: notificationTypeMap[newStatus],
      data: {
        nroPedido: order.nroPedido,
        cliente: order.cliente?.nombres_completos,
        estado: newStatus
      }
    };
    
    this.notificationManager.triggerNotification(event);
  }
}
```

### Ejemplo 3: Suscribirse a Notificaciones en un Componente

```typescript
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  unreadCount = 0;
  
  constructor(
    private notificationManager: NotificationManagerService
  ) {}
  
  ngOnInit(): void {
    // Suscribirse al contador de no leídas
    this.notificationManager.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
    
    // Suscribirse a nuevas notificaciones de pedidos
    this.notificationManager.getNotifications({
      type: NotificationType.ORDER_CREATED,
      status: NotificationStatus.PENDING
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(notifications => {
      // Procesar nuevos pedidos
      console.log('Nuevos pedidos:', notifications);
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Configuración de Throttling

El throttling previene el spam de notificaciones similares:

```typescript
// En notification.config.ts
[NotificationType.LOW_STOCK]: {
  // ... otras configuraciones ...
  throttlePeriodMinutes: 240, // Solo 1 notificación cada 4 horas
}
```

## Testing de Notificaciones

### Método 1: Usando el Navegador Console

```javascript
// En la consola del navegador (F12)
const notificationManager = ng.getComponent(ng.getOwningComponent(document.querySelector('app-root'))).notificationManager;

notificationManager.triggerNotification({
  type: 'ORDER_CREATED',
  data: {
    nroPedido: 'TEST-001',
    cliente: 'Cliente Test',
    total: '$100.000'
  },
  priority: 'HIGH'
});
```

### Método 2: Componente de Prueba

Crear un componente temporal `notification-test`:

```typescript
@Component({
  selector: 'app-notification-test',
  template: `
    <button (click)="testOrderNotification()">Test Pedido</button>
    <button (click)="testPaymentNotification()">Test Pago</button>
    <button (click)="testStockNotification()">Test Stock</button>
  `
})
export class NotificationTestComponent {
  constructor(private notificationManager: NotificationManagerService) {}
  
  testOrderNotification(): void {
    this.notificationManager.triggerNotification({
      type: NotificationType.ORDER_CREATED,
      data: {
        nroPedido: 'TEST-' + Date.now(),
        cliente: 'Cliente Demo',
        total: '$' + Math.floor(Math.random() * 1000000)
      }
    });
  }
  
  // ... más métodos de prueba
}
```

## Troubleshooting

### Problema: Las notificaciones no aparecen

**Posibles causas y soluciones:**

1. **Servicio no inicializado:**
   - Verificar que `NotificationManagerService` esté en providers del módulo
   - Revisar consola para errores de inicialización

2. **Usuario/Empresa no configurados:**
   - Verificar sessionStorage tiene `currentCompany` y `currentUser`
   - El servicio necesita estos datos para funcionar

3. **Filtros de rol incorrectos:**
   - Verificar que el rol del usuario coincide con `targetRoles` del template
   - Revisar en `notification.config.ts`

### Problema: Notificaciones duplicadas

**Soluciones:**

1. **Activar throttling:**
   ```typescript
   throttlePeriodMinutes: 60 // Evita duplicados en 1 hora
   ```

2. **Verificar múltiples suscripciones:**
   - Usar `takeUntil(destroy$)` en todas las suscripciones
   - Limpiar suscripciones en `ngOnDestroy`

### Problema: Notificaciones no se sincronizan entre pestañas

**Verificar:**

1. Firebase Realtime Database configurado correctamente
2. `currentCompanyId` es el mismo en todas las pestañas
3. Conexión a internet estable

### Debug: Ver todas las notificaciones en consola

```javascript
// En consola del navegador
const notificationManager = ng.getComponent(ng.getOwningComponent(document.querySelector('app-root'))).notificationManager;
notificationManager.notifications$.subscribe(console.log);
```

## Performance

### Consideraciones de Rendimiento

1. **Cache Local:**
   - Las notificaciones se guardan en localStorage (máx 100)
   - Se limpian automáticamente las expiradas cada 5 minutos

2. **Throttling:**
   - Configurar `throttlePeriodMinutes` para notificaciones frecuentes
   - Evita sobrecarga del sistema y spam al usuario

3. **Paginación:**
   - El Notification Center carga de 20 en 20
   - Scroll infinito para mejor UX

4. **Firebase Realtime:**
   - Solo se sincronizan notificaciones de la empresa actual
   - Filtrado por rol del usuario para reducir datos

## Mejoras Futuras Planificadas

1. **Push Notifications del Navegador:**
   - Implementación con Firebase Cloud Messaging
   - Permisos del navegador y service workers

2. **Notificaciones por Email:**
   - Integración con backend para envío de emails
   - Templates HTML personalizables

3. **SMS:**
   - Integración con proveedores SMS (Twilio, etc.)
   - Para notificaciones críticas

4. **Analytics:**
   - Tracking de apertura y CTR
   - Dashboard de métricas de notificaciones

5. **Preferencias de Usuario:**
   - UI para que usuarios configuren sus preferencias
   - Horarios de silencio y canales preferidos

## Migración desde Sistema Legacy

Si tienes código usando el antiguo `NotificationService` directamente:

**Antes:**
```typescript
this.notificationService.success('Título', 'Mensaje');
```

**Ahora (recomendado):**
```typescript
this.notificationManager.triggerNotification({
  type: NotificationType.ORDER_CREATED, // Usar tipo específico
  data: { /* datos relevantes */ },
  priority: NotificationPriority.HIGH
});
```

El sistema legacy sigue funcionando para retrocompatibilidad, pero se recomienda migrar al nuevo sistema para aprovechar todas las características.

## Contacto y Soporte

Para dudas o problemas con el sistema de notificaciones:

1. Revisar esta documentación
2. Buscar en los logs de consola mensajes con el prefijo `🔔`
3. Verificar la configuración en `notification.config.ts`
4. Contactar al equipo de desarrollo

---

**Última actualización:** Diciembre 2024
**Versión del sistema:** 2.0.0