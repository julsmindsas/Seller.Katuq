import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Producto } from '../../models/productos/Producto';
import { Pedido, EstadoPago, EstadoProceso } from '../../../components/ventas/modelo/pedido';
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// Importar interfaces para paginación optimizada
import { PaginatedOrdersResponse, PaginatedOrdersRequest } from '../../../components/despachos/interfaces/paginated-orders.interface';

// Importar tipos y servicio de notificaciones
import { NotificationManagerService } from '../notifications/notification-manager.service';
import { 
  NotificationType, 
  NotificationEvent, 
  NotificationPriority,
  NotificationChannel
} from '../notifications/notification.types';
import { VentasNotificationInterceptor } from '../notifications/ventas-notification.interceptor';
import { FeatureFlagsService } from '../feature-flags.service';

@Injectable({
  providedIn: 'root'
})
export class VentasService extends BaseService {
  getOrdersPOSByFilter(filter: any) {
    return this.post<POSPedido[]>('/v1/orders/pos/all/filter', filter);
  }
  getTopVentasPorDiaEntreFechas(fechaInicio: string, fechaFin: string) {
    return this.get<any>('/v1/orders/getVentasPorFecha?startDate=' + fechaInicio + '&endDate=' + fechaFin);
  }
  getTop10ProductosMenosVendidos() {
    return this.post<any>('/v1/orders/getTop10ProductosMenosVendidos', {});
  }
  getTop10ProductosMasVendidos() {
    return this.post<any>('/v1/orders/getTop10ProductosMasVendidos', {});
  }
  validateNroPedido(nroPedido: string) {
    return this.get<any>('/v1/orders/validateNroPedido/' + nroPedido);
  }
  despacharOrden(pedidosSeleccionados: Pedido[]) {
    return this.post<any>('/v1/orders/dispatch', pedidosSeleccionados);
  }
  crearTransportador(nuevoTransportador: any) {
    return this.post<any>('/v1/transportadores/create', nuevoTransportador);
  }
  generarOrdenEnvio(nuevaOrdenEnvio: any) {
    return this.post<any>('/v1/orders/createShippingOrder', nuevaOrdenEnvio);
  }
  deleteOrder(order: Pedido) {
    return this.post<any>('/v1/orders/delete', order);
  }


  getNextRef(id: any) {
    return this.post<any>('/v1/orders/getnextConsecutive', { company: id });
  }

  constructor(
    httpClient: HttpClient,
    private notificationManager: NotificationManagerService,
    private notificationInterceptor: VentasNotificationInterceptor,
    private featureFlags: FeatureFlagsService
  ) {
    super(httpClient);
    
    // Inicializar interceptor de notificaciones de forma segura
    // Solo se activa si el feature flag está habilitado
    setTimeout(() => {
      try {
        this.notificationInterceptor.initialize(this);
        console.log('✅ Interceptor de notificaciones inicializado en VentasService');
      } catch (error) {
        // Los errores en el interceptor no afectan el servicio
        console.error('Error inicializando interceptor (no crítico):', error);
      }
    }, 0);
  }

  public getProducts() {
    return this.get<Producto[]>('/v1/productos/all');
  }

  public getProductsByFilter(filter: any) {
    return this.post<Producto[]>('/v1/productos/all/filter', filter);
  }

  getProductByNumber(productNumber: string) {
    return this.post<any>('/v1/catalog/getProductByNumber', { productNumber });
  }

  validateCupon(cupon: any) {
    return this.post<any>('/v1/cupones/validatecupon', cupon);
  }

  createOrder(orderTemplate: any) {
    return this.post<any>('/v1/orders/create', orderTemplate).pipe(
      tap((response) => {
        if (response && response.success) {
          // Disparar notificación de nuevo pedido
          this.triggerOrderCreatedNotification(response.order || orderTemplate);
        }
      })
    );
  }

  editOrder(order: Pedido): Observable<any> {
    // Capturar el estado anterior para comparar cambios
    const previousOrder = { ...order };
    
    return this.post<any>('/v1/orders/edit', order).pipe(
      tap((response) => {
        if (response && response.success) {
          const updatedOrder = response.order || order;
          this.triggerOrderUpdatedNotifications(previousOrder, updatedOrder);
        }
      })
    );
  }

  editMultipleOrders(orders: any): Observable<any> {
    return this.post<any>('/v1/orders/edit-multiple-orders', orders);
  }

  getOrders() {
    const empresaActual = JSON.parse(localStorage.getItem("currentCompany") || '{}');
    const id = empresaActual.nomComercial;
    return this.get<Pedido[]>('/v1/orders/all/' + id);

  }

  /** 
   * @deprecated Use getOrdersByFilterOptimized for better performance
   * This method loads ALL orders at once, which can cause performance issues
   */
  getOrdersByFilter(filter: any) {
    return this.post<Pedido[]>('/v1/orders/all/filter', filter);
  }

  /**
   * Optimized paginated endpoint - sub-millisecond response vs 84-second timeout
   * @since 2025.09.05 - Server-side pagination implementation
   * @since 2025.09.14 - Added server-side sorting support
   * @param filter - Filter criteria (same as legacy method) - sent in request body
   * @param page - Page number (1-based) - sent as query parameter
   * @param pageSize - Number of items per page (default 50, max 100) - sent as query parameter
   * @returns Observable with paginated orders and metadata
   */
  getOrdersByFilterOptimized(filter: any, page: number = 1, pageSize: number = 50): Observable<PaginatedOrdersResponse> {
    // Extract sorting parameters from filter object if present
    let queryParams = `page=${page}&pageSize=${pageSize}`;

    // Add sorting parameters to query string if they exist in the filter
    if (filter.sortField) {
      queryParams += `&sortField=${encodeURIComponent(filter.sortField)}`;
      queryParams += `&sortOrder=${filter.sortOrder || 1}`; // Default to ascending (1) if not specified

      console.log('📊 VentasService - Adding sorting parameters to API call:', {
        sortField: filter.sortField,
        sortOrder: filter.sortOrder,
        direction: filter.sortOrder === -1 ? 'DESC' : 'ASC'
      });
    }

    const endpoint = `/v1/orders/all/filter/optimized?${queryParams}`;

    return this.post<PaginatedOrdersResponse>(endpoint, filter);
  }
  getOrdersByNroPedido(nroPedido: any) {
    return this.get<Pedido[]>('/v1/orders/byNroPedido/' + nroPedido);
  }



  enviarCorreoConfirmacionPedido(orderTemplate: any): Observable<any> {
    return this.post<any>('/v1/orders/sendEmail', orderTemplate);
  }


  //preorders
  savePreOrders(order: Pedido) {
    return localStorage.setItem(`preOrder_${order.nroPedido}`, JSON.stringify(order));
  }

  getPreOrders() {
    return Object.keys(localStorage)
      .filter(key => key.includes('preOrder_'))
      .map(key => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }).filter(Boolean);
  }

  getPreOrder(nroPedido: string) {
    const preOrder = localStorage.getItem(`preOrder_${nroPedido}`);
    return preOrder ? JSON.parse(preOrder) : null;
  }

  removePreOrder(nroPedido: string) {
    localStorage.removeItem(`preOrder_${nroPedido}`);
  }
  // fin preorders

  /**
   * Actualiza el estado de pago de un pedido específico
   * @param numeroPedido Número de pedido a actualizar
   * @param estadoPago Nuevo estado de pago (Pendiente, Aprobado, Rechazado)
   */
  updateOrderPaymentStatus(numeroPedido: string, estadoPago: any): Observable<any> {
    return this.post<any>('/v1/orders/updateOrder', { numeroPedido, estadoPago }).pipe(
      tap((response) => {
        if (response && response.success) {
          this.triggerPaymentStatusNotification(numeroPedido, estadoPago, response.order);
        }
      })
    );
  }


  getOrderStatus(numeroPedido: string): Observable<any> {
    return this.get<any>(`/v1/orders/status/${numeroPedido}`);
  }

  realizarCierreCaja(cierreData: any): Observable<any> {
    return this.post<any>('/v1/orders/cash-closing', cierreData);
  }

  getCashClosingHistory(filter: any) {
    return this.post<any>('/v1/orders/cash-closing-history', filter);
  }

  getDatosEntregas(documento: string): Observable<any> {
    return this.post<any>(`/v1/client/getDatosEntregas`, { documento });
  }

  getDatosFacturacion(documento: string): Observable<any> {
    return this.post<any>(`/v1/client/getDatosFacturacion`, { documento });
  }

  findProduct(term: string) {
    return this.post<any>('/v1/catalog/searchProduct', { term });
  }

  getOrderById(orderId: string) {
    return this.post<any>('/v1/orders/getById', { orderId });
  }

  // ============= MÉTODOS DE NOTIFICACIONES =============

  /**
   * Dispara notificación cuando se crea un nuevo pedido
   */
  private triggerOrderCreatedNotification(order: any): void {
    try {
      const event: NotificationEvent = {
        type: NotificationType.ORDER_CREATED,
        data: {
          nroPedido: order.nroPedido,
          cliente: order.cliente?.nombres_completos || 'Cliente',
          total: this.formatCurrency(order.subtotal || 0),
          orderId: order._id
        },
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.FIREBASE_REALTIME]
      };

      this.notificationManager.triggerNotification(event);
    } catch (error) {
      console.error('Error disparando notificación de pedido creado:', error);
    }
  }

  /**
   * Dispara notificaciones cuando se actualiza un pedido
   */
  private triggerOrderUpdatedNotifications(previousOrder: Pedido, updatedOrder: Pedido): void {
    try {
      // Verificar cambios en estado de proceso
      if (previousOrder.estadoProceso !== updatedOrder.estadoProceso) {
        this.triggerProcessStatusNotification(updatedOrder);
      }

      // Verificar cambios en estado de pago
      if (previousOrder.estadoPago !== updatedOrder.estadoPago) {
        this.triggerPaymentStatusNotification(
          updatedOrder.nroPedido || '', 
          updatedOrder.estadoPago,
          updatedOrder
        );
      }

      // Notificación general de actualización si hay otros cambios
      const hasOtherChanges = 
        JSON.stringify(previousOrder.carrito) !== JSON.stringify(updatedOrder.carrito) ||
        previousOrder.totalPedididoConDescuento !== updatedOrder.totalPedididoConDescuento ||
        previousOrder.formaDePago !== updatedOrder.formaDePago;

      if (hasOtherChanges) {
        const event: NotificationEvent = {
          type: NotificationType.ORDER_UPDATED,
          data: {
            nroPedido: updatedOrder.nroPedido,
            orderId: updatedOrder._id
          },
          priority: NotificationPriority.NORMAL
        };

        this.notificationManager.triggerNotification(event);
      }
    } catch (error) {
      console.error('Error disparando notificaciones de actualización:', error);
    }
  }

  /**
   * Dispara notificación por cambio de estado de proceso
   */
  private triggerProcessStatusNotification(order: Pedido): void {
    try {
      let notificationType: NotificationType;
      let priority: NotificationPriority = NotificationPriority.NORMAL;

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
          return; // No enviar notificación para otros estados
      }

      const event: NotificationEvent = {
        type: notificationType,
        data: {
          nroPedido: order.nroPedido,
          cliente: order.cliente?.nombres_completos,
          estadoProceso: order.estadoProceso,
          orderId: order._id,
          transportador: order.transportador?.nombre,
          trackingNumber: order.nroShippingOrder
        },
        priority
      };

      this.notificationManager.triggerNotification(event);
    } catch (error) {
      console.error('Error disparando notificación de estado de proceso:', error);
    }
  }

  /**
   * Dispara notificación por cambio de estado de pago
   */
  private triggerPaymentStatusNotification(numeroPedido: string, estadoPago: EstadoPago, order?: any): void {
    try {
      let notificationType: NotificationType;
      let priority: NotificationPriority = NotificationPriority.HIGH;
      let channels: NotificationChannel[] = [NotificationChannel.IN_APP, NotificationChannel.FIREBASE_REALTIME];

      switch (estadoPago) {
        case EstadoPago.Pendiente:
          notificationType = NotificationType.PAYMENT_PENDING;
          priority = NotificationPriority.NORMAL;
          break;
        case EstadoPago.PreAprobado:
          notificationType = NotificationType.PAYMENT_PREAPPROVED;
          break;
        case EstadoPago.Aprobado:
          notificationType = NotificationType.PAYMENT_APPROVED;
          break;
        case EstadoPago.Rechazado:
          notificationType = NotificationType.PAYMENT_REJECTED;
          priority = NotificationPriority.CRITICAL;
          channels.push(NotificationChannel.EMAIL); // Agregar email para pagos rechazados
          break;
        default:
          return;
      }

      const event: NotificationEvent = {
        type: notificationType,
        data: {
          nroPedido: numeroPedido,
          estadoPago: estadoPago,
          monto: order ? this.formatCurrency(order.subtotal || 0) : '',
          orderId: order?._id,
          cliente: order?.cliente?.nombres_completos
        },
        priority,
        channels
      };

      this.notificationManager.triggerNotification(event);
    } catch (error) {
      console.error('Error disparando notificación de estado de pago:', error);
    }
  }

  /**
   * Dispara notificación cuando se requiere cierre de caja
   */
  public triggerCashClosingNotification(): void {
    try {
      const event: NotificationEvent = {
        type: NotificationType.CASH_CLOSING_REQUIRED,
        data: {
          fecha: new Date().toLocaleDateString('es-ES'),
          hora: new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        },
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH]
      };

      this.notificationManager.triggerNotification(event);
    } catch (error) {
      console.error('Error disparando notificación de cierre de caja:', error);
    }
  }

  /**
   * Dispara notificación cuando falla una transacción POS
   */
  public triggerPOSTransactionFailedNotification(error: string, transactionData?: any): void {
    try {
      const event: NotificationEvent = {
        type: NotificationType.POS_TRANSACTION_FAILED,
        data: {
          error: error,
          monto: transactionData ? this.formatCurrency(transactionData.amount || 0) : '',
          cliente: transactionData?.customer?.nombres_completos || 'Cliente',
          timestamp: new Date().toLocaleString('es-ES')
        },
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP]
      };

      this.notificationManager.triggerNotification(event);
    } catch (error) {
      console.error('Error disparando notificación de transacción POS fallida:', error);
    }
  }

  /**
   * Dispara notificación para nuevo cliente registrado
   */
  public triggerNewCustomerNotification(customer: any): void {
    try {
      const event: NotificationEvent = {
        type: NotificationType.NEW_CUSTOMER,
        data: {
          nombre: customer.nombres_completos || customer.nombre || 'Cliente',
          correo: customer.correo_electronico_comprador || customer.email,
          telefono: customer.numero_celular_comprador || customer.telefono,
          customerId: customer._id || customer.id
        },
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_APP]
      };

      this.notificationManager.triggerNotification(event);
    } catch (error) {
      console.error('Error disparando notificación de nuevo cliente:', error);
    }
  }

  /**
   * Formatea moneda para mostrar en notificaciones
   */
  private formatCurrency(amount: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      return `$${amount.toLocaleString('es-ES')}`;
    }
  }

  /**
   * Obtiene información de la compañía actual
   */
  private getCurrentCompanyInfo(): { id: string; name: string } | null {
    try {
      const currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      return {
        id: currentCompany.nit || currentCompany.id || '',
        name: currentCompany.nomComercial || currentCompany.name || 'Empresa'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtiene información del usuario actual
   */
  private getCurrentUserInfo(): { id: string; name: string } | null {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      return {
        id: currentUser.id || 'default_user',
        name: currentUser.name || currentUser.nombres_completos || 'Usuario'
      };
    } catch (error) {
      return null;
    }
  }

}
