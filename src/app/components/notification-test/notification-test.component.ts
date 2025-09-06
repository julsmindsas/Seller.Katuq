import { Component } from '@angular/core';
import { NotificationManagerService } from '../../shared/services/notifications/notification-manager.service';
import { VentasService } from '../../shared/services/ventas/ventas.service';
import { NotificationType, NotificationEvent, NotificationPriority } from '../../shared/services/notifications/notification.types';

@Component({
  selector: 'app-notification-test',
  template: `
    <div class="container mt-4">
      <div class="card">
        <div class="card-header">
          <h3>🧪 Test del Sistema de Notificaciones</h3>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <h5>Notificaciones de Prueba</h5>
              <div class="mb-2">
                <button class="btn btn-success me-2" (click)="testOrderCreated()">
                  📋 Pedido Creado
                </button>
                <button class="btn btn-info me-2" (click)="testPaymentApproved()">
                  💳 Pago Aprobado
                </button>
              </div>
              <div class="mb-2">
                <button class="btn btn-warning me-2" (click)="testLowStock()">
                  📦 Stock Bajo
                </button>
                <button class="btn btn-danger me-2" (click)="testPaymentRejected()">
                  ❌ Pago Rechazado
                </button>
              </div>
              <div class="mb-2">
                <button class="btn btn-primary me-2" (click)="testProductionCompleted()">
                  🏭 Producción Completada
                </button>
                <button class="btn btn-success me-2" (click)="testOrderDelivered()">
                  🚚 Pedido Entregado
                </button>
              </div>
              <div class="mb-2">
                <button class="btn btn-outline-primary" (click)="testAllPriorities()">
                  🚀 Probar Todas las Prioridades
                </button>
              </div>
            </div>
            
            <div class="col-md-6">
              <h5>Estadísticas</h5>
              <div class="stats-card">
                <p><strong>Total Notificaciones:</strong> {{ stats.totalNotifications }}</p>
                <p><strong>No Leídas:</strong> {{ stats.unreadCount }}</p>
                <p><strong>Últimas 24h:</strong> {{ stats.last24Hours }}</p>
              </div>
              
              <div class="mt-3">
                <button class="btn btn-outline-warning me-2" (click)="clearAllNotifications()">
                  🗑️ Limpiar Todas
                </button>
                <button class="btn btn-outline-info" (click)="refreshStats()">
                  🔄 Actualizar Stats
                </button>
              </div>
            </div>
          </div>
          
          <div class="mt-4">
            <h5>Test de VentasService</h5>
            <button class="btn btn-secondary me-2" (click)="testVentasServiceIntegration()">
              🛒 Simular Creación de Pedido
            </button>
            <button class="btn btn-outline-secondary" (click)="testNotificationPreferences()">
              ⚙️ Test Preferencias
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    .stats-card p {
      margin-bottom: 8px;
    }
    .btn {
      margin-bottom: 8px;
    }
  `]
})
export class NotificationTestComponent {
  stats: any = {
    totalNotifications: 0,
    unreadCount: 0,
    last24Hours: 0
  };

  constructor(
    private notificationManager: NotificationManagerService,
    private ventasService: VentasService
  ) {
    this.refreshStats();
  }

  testOrderCreated() {
    const event: NotificationEvent = {
      type: NotificationType.ORDER_CREATED,
      data: {
        nroPedido: 'TEST-' + Date.now(),
        cliente: 'Cliente de Prueba',
        total: '$150.000',
        orderId: 'test_order_' + Date.now()
      },
      priority: NotificationPriority.HIGH
    };
    
    this.notificationManager.triggerNotification(event);
    this.refreshStats();
  }

  testPaymentApproved() {
    const event: NotificationEvent = {
      type: NotificationType.PAYMENT_APPROVED,
      data: {
        nroPedido: 'TEST-PAY-' + Date.now(),
        monto: '$250.000',
        cliente: 'Ana García'
      },
      priority: NotificationPriority.HIGH
    };
    
    this.notificationManager.triggerNotification(event);
    this.refreshStats();
  }

  testLowStock() {
    const event: NotificationEvent = {
      type: NotificationType.LOW_STOCK,
      data: {
        productName: 'Producto de Prueba',
        currentStock: 5,
        minimumStock: 10
      },
      priority: NotificationPriority.NORMAL
    };
    
    this.notificationManager.triggerNotification(event);
    this.refreshStats();
  }

  testPaymentRejected() {
    const event: NotificationEvent = {
      type: NotificationType.PAYMENT_REJECTED,
      data: {
        nroPedido: 'TEST-REJ-' + Date.now(),
        cliente: 'Cliente Test',
        razon: 'Fondos insuficientes'
      },
      priority: NotificationPriority.CRITICAL
    };
    
    this.notificationManager.triggerNotification(event);
    this.refreshStats();
  }

  testProductionCompleted() {
    const event: NotificationEvent = {
      type: NotificationType.PRODUCTION_COMPLETED,
      data: {
        nroPedido: 'PROD-' + Date.now(),
        cliente: 'Empresa Ejemplo',
        cantidadProducida: 100
      },
      priority: NotificationPriority.HIGH
    };
    
    this.notificationManager.triggerNotification(event);
    this.refreshStats();
  }

  testOrderDelivered() {
    const event: NotificationEvent = {
      type: NotificationType.ORDER_DELIVERED,
      data: {
        nroPedido: 'DEL-' + Date.now(),
        cliente: 'María López',
        direccion: 'Calle 123 #45-67'
      },
      priority: NotificationPriority.NORMAL
    };
    
    this.notificationManager.triggerNotification(event);
    this.refreshStats();
  }

  testAllPriorities() {
    // LOW Priority
    this.notificationManager.triggerNotification({
      type: NotificationType.CART_REMINDER,
      data: { cliente: 'Test User', items: 3 },
      priority: NotificationPriority.LOW
    });

    // NORMAL Priority
    setTimeout(() => {
      this.notificationManager.triggerNotification({
        type: NotificationType.NEW_CUSTOMER,
        data: { nombre: 'Nuevo Cliente', correo: 'test@example.com' },
        priority: NotificationPriority.NORMAL
      });
    }, 500);

    // HIGH Priority
    setTimeout(() => {
      this.notificationManager.triggerNotification({
        type: NotificationType.ORDER_DISPATCHED,
        data: { nroPedido: 'HIGH-' + Date.now(), transportador: 'Express' },
        priority: NotificationPriority.HIGH
      });
    }, 1000);

    // CRITICAL Priority
    setTimeout(() => {
      this.notificationManager.triggerNotification({
        type: NotificationType.SYSTEM_ALERT,
        data: { mensaje: 'Test de alerta crítica', codigo: 'CRIT001' },
        priority: NotificationPriority.CRITICAL
      });
    }, 1500);

    setTimeout(() => this.refreshStats(), 2000);
  }

  testVentasServiceIntegration() {
    // Simular la creación de un pedido a través del VentasService
    const mockOrder = {
      nroPedido: 'VENTAS-TEST-' + Date.now(),
      cliente: {
        nombres_completos: 'Cliente VentasService Test'
      },
      subtotal: 180000,
      _id: 'test_id_' + Date.now()
    };

    // Simular respuesta exitosa del backend
    console.log('🧪 Simulando creación de pedido a través de VentasService...');
    
    // Esto debería disparar la notificación automáticamente
    this.ventasService['triggerOrderCreatedNotification'](mockOrder);
    
    this.refreshStats();
  }

  testNotificationPreferences() {
    console.log('🧪 Testing notification preferences...');
    
    // Test que una notificación debe enviarse
    const shouldSend = this.notificationManager['notificationPreferences'].shouldSendNotification(
      NotificationType.ORDER_CREATED,
      'IN_APP' as any,
      new Date()
    );
    
    console.log('Should send ORDER_CREATED notification:', shouldSend);
    
    // Obtener resumen de preferencias
    const summary = this.notificationManager['notificationPreferences'].getPreferencesSummary();
    console.log('Preferences summary:', summary);
  }

  refreshStats() {
    setTimeout(() => {
      this.notificationManager.getNotificationStats().then(stats => {
        this.stats = stats;
      }).catch(error => {
        console.error('Error obteniendo stats:', error);
      });
    }, 100);
  }

  clearAllNotifications() {
    this.notificationManager.clearAllNotifications().then(() => {
      console.log('✅ Todas las notificaciones han sido eliminadas');
      this.refreshStats();
    }).catch(error => {
      console.error('❌ Error eliminando notificaciones:', error);
    });
  }
}