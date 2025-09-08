import { Injectable } from '@angular/core';
import { VentasService } from '../ventas/ventas.service';
import { NotificationManagerService } from './notification-manager.service';
import { FeatureFlagsService } from '../feature-flags.service';
import { 
  NotificationEvent, 
  NotificationType, 
  NotificationPriority,
  NotificationChannel 
} from './notification.types';
import { EstadoPago, EstadoProceso, Pedido } from '../../../components/ventas/modelo/pedido';
import { tap } from 'rxjs/operators';

/**
 * Interceptor no invasivo para notificaciones de VentasService
 * IMPORTANTE: Este interceptor NO modifica la lógica existente,
 * solo agrega notificaciones DESPUÉS de operaciones exitosas
 */
@Injectable({
  providedIn: 'root'
})
export class VentasNotificationInterceptor {
  
  // Cache de estados anteriores para detectar cambios
  private orderStateCache = new Map<string, {
    estadoProceso: EstadoProceso;
    estadoPago: EstadoPago;
    asesorAsignado?: any;
    totalPedido?: number;
    cliente?: any;
    envio?: any;
  }>();

  constructor(
    private notificationManager: NotificationManagerService,
    private featureFlags: FeatureFlagsService
  ) {}

  /**
   * Inicializa el interceptor - Se debe llamar DESPUÉS de que VentasService esté listo
   */
  initialize(ventasService: VentasService): void {
    // Solo activar si el flag está habilitado
    if (!this.featureFlags.isEnabled('ENABLE_ADVANCED_NOTIFICATIONS')) {
      console.log('🔕 VentasNotificationInterceptor deshabilitado por feature flag');
      return;
    }

    console.log('🔔 Inicializando VentasNotificationInterceptor...');
    
    // Interceptar el método editOrder sin modificarlo
    this.interceptEditOrder(ventasService);
    
    // Interceptar updateOrderPaymentStatus
    this.interceptUpdateOrderPaymentStatus(ventasService);
    
    console.log('✅ VentasNotificationInterceptor inicializado');
  }

  /**
   * Intercepta editOrder para detectar cambios y notificar
   */
  private interceptEditOrder(ventasService: VentasService): void {
    const originalEditOrder = ventasService.editOrder.bind(ventasService);
    
    ventasService.editOrder = (order: Pedido) => {
      // Guardar estado anterior si existe
      const oldState = this.getOrderState(order._id || order.nroPedido || '');
      
      // Ejecutar método original SIN MODIFICACIONES
      const result = originalEditOrder(order);
      
      // Solo procesar notificaciones si está habilitado
      if (this.featureFlags.isEnabled('ENABLE_ORDER_STATUS_NOTIFICATIONS')) {
        // Agregar tap para procesar DESPUÉS del éxito
        return result.pipe(
          tap({
            next: (response) => {
              // Procesar notificaciones en background para no afectar performance
              setTimeout(() => {
                this.processOrderChanges(oldState, order);
              }, 0);
            },
            error: (error) => {
              // Los errores de la operación original no se tocan
              console.error('Error en editOrder (no afecta notificaciones):', error);
            }
          })
        );
      }
      
      return result;
    };
  }

  /**
   * Intercepta updateOrderPaymentStatus
   */
  private interceptUpdateOrderPaymentStatus(ventasService: VentasService): void {
    const originalMethod = ventasService.updateOrderPaymentStatus.bind(ventasService);
    
    ventasService.updateOrderPaymentStatus = (numeroPedido: string, estadoPago: EstadoPago) => {
      // Ejecutar método original
      const result = originalMethod(numeroPedido, estadoPago);
      
      // Solo procesar si está habilitado
      if (this.featureFlags.isEnabled('ENABLE_PAYMENT_NOTIFICATIONS')) {
        return result.pipe(
          tap({
            next: (response) => {
              // Las notificaciones de pago ya están implementadas en VentasService
              // Solo agregamos logging adicional si es necesario
              console.log(`💳 Estado de pago actualizado: ${numeroPedido} -> ${estadoPago}`);
            }
          })
        );
      }
      
      return result;
    };
  }

  /**
   * Procesa cambios en el pedido y dispara notificaciones apropiadas
   */
  private processOrderChanges(oldState: any, newOrder: Pedido): void {
    if (!oldState || !newOrder) return;
    
    try {
      // Detectar cambio de estado de proceso
      if (oldState.estadoProceso !== newOrder.estadoProceso) {
        this.notifyProcessStateChange(oldState.estadoProceso, newOrder);
      }
      
      // Detectar cambio de estado de pago
      if (oldState.estadoPago !== newOrder.estadoPago) {
        this.notifyPaymentStateChange(oldState.estadoPago, newOrder);
      }
      
      // Detectar asignación de asesor
      if (!oldState.asesorAsignado && newOrder.asesorAsignado) {
        this.notifyAdvisorAssigned(newOrder);
      }
      
      // Detectar cambio de dirección
      if (this.hasAddressChanged(oldState.envio, newOrder.envio)) {
        this.notifyAddressChanged(newOrder);
      }
      
      // Detectar cambio significativo en el total
      if (this.hasTotalChanged(oldState.totalPedido, newOrder.totalPedididoConDescuento)) {
        this.notifyTotalChanged(newOrder);
      }
      
      // Actualizar cache
      this.saveOrderState(newOrder);
      
    } catch (error) {
      // Los errores en notificaciones NO deben afectar la operación
      console.error('Error procesando notificaciones (no crítico):', error);
    }
  }

  /**
   * Notifica cambio de estado de proceso
   */
  private notifyProcessStateChange(oldState: EstadoProceso, order: Pedido): void {
    // Solo notificar transiciones hacia adelante o a rechazado
    const forwardTransitions = this.isForwardTransition(oldState, order.estadoProceso);
    if (!forwardTransitions) return;
    
    let notificationType: NotificationType;
    let priority = NotificationPriority.NORMAL;
    
    switch (order.estadoProceso) {
      case EstadoProceso.EnProduccion:
        notificationType = NotificationType.PRODUCTION_STARTED;
        break;
      case EstadoProceso.Producido:
      case EstadoProceso.ProducidoTotalmente:
        notificationType = NotificationType.PRODUCTION_COMPLETED;
        priority = NotificationPriority.HIGH;
        break;
      case EstadoProceso.Empacado:
        notificationType = NotificationType.ORDER_PACKED;
        priority = NotificationPriority.HIGH;
        break;
      case EstadoProceso.Despachado:
        notificationType = NotificationType.ORDER_DISPATCHED;
        priority = NotificationPriority.HIGH;
        break;
      case EstadoProceso.Entregado:
        notificationType = NotificationType.ORDER_DELIVERED;
        break;
      case EstadoProceso.Rechazado:
        notificationType = NotificationType.ORDER_PROCESS_REJECTED;
        priority = NotificationPriority.CRITICAL;
        break;
      default:
        return; // No notificar otros estados
    }
    
    const event: NotificationEvent = {
      type: notificationType,
      data: {
        nroPedido: order.nroPedido,
        cliente: order.cliente?.nombres_completos || 'Cliente',
        estadoAnterior: oldState,
        estadoNuevo: order.estadoProceso,
        total: order.totalPedididoConDescuento,
        timestamp: new Date()
      },
      priority: priority,
      channels: [NotificationChannel.IN_APP, NotificationChannel.FIREBASE_REALTIME]
    };
    
    this.notificationManager.triggerNotification(event);
    console.log(`📦 Notificación de cambio de estado proceso: ${oldState} -> ${order.estadoProceso}`);
  }

  /**
   * Notifica cambio de estado de pago
   */
  private notifyPaymentStateChange(oldState: EstadoPago, order: Pedido): void {
    // VentasService ya maneja estas notificaciones
    // Solo agregamos logging adicional
    console.log(`💰 Cambio de estado de pago detectado: ${oldState} -> ${order.estadoPago}`);
  }

  /**
   * Notifica asignación de asesor
   */
  private notifyAdvisorAssigned(order: Pedido): void {
    if (!this.featureFlags.isEnabled('ENABLE_ORDER_STATUS_NOTIFICATIONS')) return;
    
    const event: NotificationEvent = {
      type: NotificationType.ORDER_UPDATED,
      data: {
        nroPedido: order.nroPedido,
        mensaje: `Asesor ${order.asesorAsignado.name} asignado al pedido`,
        asesor: order.asesorAsignado.name,
        cliente: order.cliente?.nombres_completos
      },
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP]
    };
    
    this.notificationManager.triggerNotification(event);
  }

  /**
   * Notifica cambio de dirección
   */
  private notifyAddressChanged(order: Pedido): void {
    if (!this.featureFlags.isEnabled('ENABLE_ORDER_STATUS_NOTIFICATIONS')) return;
    
    const event: NotificationEvent = {
      type: NotificationType.ORDER_UPDATED,
      data: {
        nroPedido: order.nroPedido,
        mensaje: 'Dirección de entrega actualizada',
        nuevaDireccion: order.envio?.direccionEntrega,
        ciudad: order.envio?.ciudad
      },
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP]
    };
    
    this.notificationManager.triggerNotification(event);
  }

  /**
   * Notifica cambio significativo en el total
   */
  private notifyTotalChanged(order: Pedido): void {
    if (!this.featureFlags.isEnabled('ENABLE_ORDER_STATUS_NOTIFICATIONS')) return;
    
    const event: NotificationEvent = {
      type: NotificationType.ORDER_UPDATED,
      data: {
        nroPedido: order.nroPedido,
        mensaje: 'Total del pedido actualizado',
        nuevoTotal: order.totalPedididoConDescuento
      },
      priority: NotificationPriority.LOW,
      channels: [NotificationChannel.IN_APP]
    };
    
    this.notificationManager.triggerNotification(event);
  }

  /**
   * Verifica si es una transición hacia adelante en el proceso
   */
  private isForwardTransition(oldState: EstadoProceso, newState: EstadoProceso): boolean {
    const stateOrder = [
      EstadoProceso.SinProducir,
      EstadoProceso.EnProduccion,
      EstadoProceso.ProducidoParcialmente,
      EstadoProceso.Producido,
      EstadoProceso.ProducidoTotalmente,
      EstadoProceso.Empacado,
      EstadoProceso.ParaDespachar,
      EstadoProceso.Despachado,
      EstadoProceso.Entregado
    ];
    
    // Rechazado siempre es una transición válida
    if (newState === EstadoProceso.Rechazado) return true;
    
    const oldIndex = stateOrder.indexOf(oldState);
    const newIndex = stateOrder.indexOf(newState);
    
    return newIndex > oldIndex;
  }

  /**
   * Verifica si la dirección ha cambiado
   */
  private hasAddressChanged(oldEnvio: any, newEnvio: any): boolean {
    if (!oldEnvio || !newEnvio) return false;
    
    return oldEnvio.direccionEntrega !== newEnvio.direccionEntrega ||
           oldEnvio.ciudad !== newEnvio.ciudad ||
           oldEnvio.departamento !== newEnvio.departamento;
  }

  /**
   * Verifica si el total ha cambiado significativamente (>5%)
   */
  private hasTotalChanged(oldTotal: number, newTotal: number): boolean {
    if (!oldTotal || !newTotal) return false;
    
    const difference = Math.abs(oldTotal - newTotal);
    const percentageChange = (difference / oldTotal) * 100;
    
    return percentageChange > 5;
  }

  /**
   * Obtiene el estado anterior del pedido
   */
  private getOrderState(orderId: string): any {
    return this.orderStateCache.get(orderId);
  }

  /**
   * Guarda el estado actual del pedido
   */
  private saveOrderState(order: Pedido): void {
    const orderId = order._id || order.nroPedido || '';
    if (!orderId) return;
    
    this.orderStateCache.set(orderId, {
      estadoProceso: order.estadoProceso,
      estadoPago: order.estadoPago,
      asesorAsignado: order.asesorAsignado,
      totalPedido: order.totalPedididoConDescuento,
      cliente: order.cliente,
      envio: order.envio
    });
    
    // Limpiar cache antiguo si es muy grande
    if (this.orderStateCache.size > 100) {
      const firstKey = this.orderStateCache.keys().next().value;
      this.orderStateCache.delete(firstKey);
    }
  }
}