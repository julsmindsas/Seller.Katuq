import { Injectable, ApplicationRef, createComponent, Injector, EnvironmentInjector } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Producto } from '../../models/productos/Producto';
import { Pedido, EstadoPago, EstadoProceso } from '../../../components/ventas/modelo/pedido';
import { CustomerSummary } from '../../../components/ventas/modelo/customer-summary';
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SubscriptionService } from '../subscription.service';
import { AILimitsService } from '../ai-limits.service';

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
    private featureFlags: FeatureFlagsService,
    private modalService: NgbModal,
    private appRef: ApplicationRef,
    private injector: Injector,
    private environmentInjector: EnvironmentInjector,
    private subscriptionService: SubscriptionService,
    private aiLimitsService: AILimitsService
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

  /**
   * Obtiene productos con paginacion server-side
   *
   * @since 2026.01.24 - Implementacion de paginacion optimizada para POS y catalogo
   * @param filter Filtros de busqueda (compatibles con getProductsByFilter)
   * @param page Numero de pagina (1-indexed)
   * @param pageSize Items por pagina (default 12, max 100)
   * @returns Observable con respuesta paginada incluyendo productos y metadatos
   *
   * @example
   * ```typescript
   * this.ventasService.getProductsByFilterPaginated(
   *   { bodegaId: 'abc123', searchText: 'manzana' },
   *   1,
   *   12
   * ).subscribe(response => {
   *   console.log(response.products); // Productos de la pagina
   *   console.log(response.pagination.totalPages); // Total de paginas
   * });
   * ```
   */
  public getProductsByFilterPaginated(
    filter: any,
    page: number = 1,
    pageSize: number = 12
  ): Observable<{
    success: boolean;
    products: Producto[];
    pagination: {
      totalItems: number;
      itemsPerPage: number;
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      nextCursor?: string | null;
    };
    metrics?: {
      totalProductos: number;
      conStock: number;
      sinStock: number;
      bajoStock: number;
    };
  }> {
    // Construir query params para paginacion
    let queryParams = `page=${page}&pageSize=${Math.min(pageSize, 100)}`;

    // Agregar ordenamiento si existe en el filtro
    if (filter.sortField) {
      queryParams += `&sortField=${encodeURIComponent(filter.sortField)}`;
      queryParams += `&sortOrder=${filter.sortOrder || 1}`;
    }

    // Agregar cursor para paginacion basada en cursor (opcional)
    if (filter.cursor) {
      queryParams += `&cursor=${encodeURIComponent(filter.cursor)}`;
    }

    // Incluir metricas solo en primera pagina para optimizar
    if (page === 1 || filter.includeMetrics) {
      queryParams += '&includeMetrics=true';
    }

    const endpoint = `/v1/productos/all/filter/paginated?${queryParams}`;

    console.log(`[VentasService] Solicitando productos paginados: pagina ${page}, tamanio ${pageSize}`);

    return this.post<any>(endpoint, filter).pipe(
      tap(response => {
        if (response.success) {
          console.log(`[VentasService] Pagina ${page}/${response.pagination?.totalPages || '?'} recibida: ${response.products?.length || 0} productos`);
        }
      }),
      catchError(error => {
        console.error('[VentasService] Error en getProductsByFilterPaginated:', error);
        return throwError(() => error);
      })
    );
  }

  getProductByNumber(productNumber: string) {
    return this.post<any>('/v1/catalog/getProductByNumber', { productNumber });
  }

  /**
   * Búsqueda rápida de productos. Usa el índice ligero del backend — NO carga
   * todos los productos. `searchBy` opcional: por defecto el backend filtra por
   * `referencia` (comportamiento histórico); pasar `'all'` busca por referencia O
   * título O marca O código de barras (usado por el editor de cotizaciones).
   */
  public quickSearchProducts(term: string, limit: number = 20, searchBy?: string): Observable<{
    success: boolean;
    products: Producto[];
    total: number;
    searchTerm: string;
    duration: string;
  }> {
    const encodedTerm = encodeURIComponent(term);
    const byParam = searchBy ? `&searchBy=${encodeURIComponent(searchBy)}` : "";
    return this.get<any>(`/v1/productos/search/quick?q=${encodedTerm}&limit=${limit}${byParam}`);
  }

  validateCupon(cupon: any) {
    return this.post<any>('/v1/cupones/validatecupon', cupon);
  }

  /**
   * Valida y aplica un código del módulo Descuentos y Promociones en el
   * checkout. No escribe redención (eso ocurre al crear la orden).
   * payload: { codigoPersonalizado, clienteId, totalCarrito, codigosActivos?, items? }
   * `items` (líneas del carrito) permite al backend aplicar el descuento solo a
   * la categoría/producto objetivo cuando el código es dirigido.
   * respuesta: { descuentoId, codigoPersonalizado, tipo, valor, montoDescuento, nombre, aplicaA, baseAplicada }
   */
  aplicarCodigoDescuento(payload: {
    codigoPersonalizado: string;
    clienteId?: string;
    totalCarrito: number;
    codigosActivos?: string[];
    items?: Array<{ productoReferencia: string; categorias: string[]; precioLinea: number; enPromocion?: boolean }>;
  }) {
    return this.post<any>('/v1/descuentos-promociones/aplicar-codigo', payload);
  }

  createOrder(orderTemplate: { order: Pedido; emailHtml?: any }) {
    return this.post<any>('/v1/orders/create', orderTemplate).pipe(
      catchError((error) => {
        // Interceptar error de límite de pedidos
        if (error.error?.error === 'ORDER_LIMIT_REACHED') {
          this.aiLimitsService.showUpgradeModal('orders', error.error.message);

          console.warn('[VentasService] Límite de pedidos alcanzado:', {
            currentOrders: error.error.currentOrders,
            limit: error.error.limit,
            resetDate: error.error.resetDate
          });
        }

        return throwError(() => error);
      }),
      tap((response) => {
        if (response && response.success) {
          // Disparar notificación de nuevo pedido
          this.triggerOrderCreatedNotification(response.order || orderTemplate.order);

          // Recargar estadísticas de uso
          this.subscriptionService.getUsageStats().subscribe();
        }
      })
    );
  }

  restoreProductInventory(orderId: string, productoId: string, cantidad: number): Observable<any> {
    return this.post<any>('/v1/orders/restore-product-inventory', { orderId, productoId, cantidad });
  }

  editOrder(order: Pedido): Observable<any> {
    // Capturar el estado anterior para comparar cambios
    const previousOrder = { ...order };

    // Lock optimista: enviar en `_baseVersion` la versión (date_upd) con la que se cargó el
    // pedido. Si en el servidor la BD ya avanzó, responde 409 (otra persona editó en medio).
    const payload: any = { ...order, _baseVersion: (order as any).date_upd || null };

    return this.post<any>('/v1/orders/edit', payload).pipe(
      tap((response) => {
        // Adoptar la nueva versión que devuelve el servidor para futuras ediciones del mismo objeto.
        const nuevoDateUpd =
          response && (response.date_upd || (response.details && response.details.date_upd));
        if (nuevoDateUpd) {
          (order as any).date_upd = nuevoDateUpd;
        }
        if (response && (response.success || (response.details && response.details.success))) {
          const updatedOrder = response.order || order;
          this.triggerOrderUpdatedNotifications(previousOrder, updatedOrder);
        }
      }),
      catchError((err) => {
        // Conflicto de concurrencia: traducir a un error claro para la UI.
        if (err && err.status === 409) {
          const msg =
            (err.error && err.error.error) ||
            'El pedido cambió mientras lo editabas. Recarga la lista e intenta de nuevo.';
          return throwError(() => ({ ...err, message: msg, isStaleWrite: true }));
        }
        return throwError(() => err);
      }),
    );
  }

  editMultipleOrders(orders: any): Observable<any> {
    return this.post<any>('/v1/orders/edit-multiple-orders', orders);
  }

  /**
   * Consulta liviana (read-only) del estado actual de un set de pedidos.
   * Devuelve solo estados, sin arrastrar el carrito. La usa el tablero de
   * producción para detectar pedidos que se despacharon o entregaron mientras
   * la pantalla estaba abierta.
   */
  getEstadosActuales(ids: string[]): Observable<{
    estados: { _id: string; nroPedido: string; estadoProceso: string; estadoPago: string }[]
  }> {
    return this.post<any>('/v1/orders/estados-actuales', { ids });
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
  getOrdersByFilterOptimized(filter: any, page: number = 1, pageSize: number = 50, includeMetrics: boolean = true): Observable<PaginatedOrdersResponse> {
    // Extract sorting parameters from filter object if present
    let queryParams = `page=${page}&pageSize=${pageSize}`;

    // Las métricas se calculan en el backend sobre TODO el rango filtrado y no
    // cambian entre páginas — el caller las pide solo cuando las necesita (página 1)
    if (!includeMetrics) {
      queryParams += '&includeMetrics=false';
    }

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

  /**
   * Obtiene TODOS los pedidos filtrados para exportación usando paginación por lotes
   * Hace múltiples requests para obtener todos los registros sin límite
   * @since 2025.11.24 - Exportación por lotes para manejar cualquier cantidad de registros
   * @param filter - Filter criteria
   * @param totalRecords - Total de registros a exportar (del componente)
   * @param onProgress - Callback opcional para reportar progreso
   * @returns Promise con todos los pedidos agregados
   */
  async getAllOrdersForExportBatched(
    filter: any,
    totalRecords: number,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<any[]> {
    const BATCH_SIZE = 5000; // Aumentado de 500 a 5000 para mejor rendimiento (el backend ahora soporta hasta 50000)
    const totalPages = Math.ceil(totalRecords / BATCH_SIZE);
    let allOrders: any[] = [];

    console.log(`📊 VentasService - Iniciando exportación por lotes: ${totalRecords} registros en ${totalPages} páginas (${BATCH_SIZE} por lote)`);

    for (let page = 1; page <= totalPages; page++) {
      const queryParams = `page=${page}&pageSize=${BATCH_SIZE}&includeMetrics=false&forExport=true`;
      const endpoint = `/v1/orders/all/filter/optimized?${queryParams}`;

      try {
        const response = await this.post<PaginatedOrdersResponse>(endpoint, filter).toPromise();

        if (response && response.orders && response.orders.length > 0) {
          allOrders = allOrders.concat(response.orders);
          const porcentaje = Math.round((allOrders.length / totalRecords) * 100);
          console.log(`📦 Lote ${page}/${totalPages}: ${response.orders.length} pedidos obtenidos (Total: ${allOrders.length}/${totalRecords} - ${porcentaje}%)`);

          if (onProgress) {
            onProgress(allOrders.length, totalRecords);
          }

          // Si recibimos menos registros de los esperados, significa que llegamos al final
          if (response.orders.length < BATCH_SIZE && allOrders.length < totalRecords) {
            console.log(`📦 Lote ${page}: Última página recibida (${response.orders.length} < ${BATCH_SIZE}), finalizando`);
            break;
          }
        } else {
          // No más datos, salir del loop
          console.log(`📦 Lote ${page}: Sin más datos, finalizando`);
          break;
        }
      } catch (error) {
        console.error(`❌ Error en lote ${page}:`, error);
        throw error;
      }
    }

    console.log(`✅ Exportación completada: ${allOrders.length} pedidos obtenidos de ${totalRecords} esperados`);
    return allOrders;
  }

  /**
   * Endpoint dedicado para exportación - SIN LÍMITE de paginación
   * Usa el endpoint /v1/orders/all/export que devuelve TODOS los pedidos
   * Solo requiere: company, fechaInicial, fechaFinal, tipoFecha
   * @since 2025.11.24 - Nuevo endpoint dedicado para exportación
   */
  getAllOrdersForExportDirect(
    company: string,
    fechaInicial: string,
    fechaFinal: string,
    tipoFecha: string = 'fechaCreacion'
  ): Observable<any> {
    console.log(`📤 VentasService - Exportación directa: ${fechaInicial} a ${fechaFinal} (${tipoFecha})`);

    const exportFilter = {
      company,
      fechaInicial,
      fechaFinal,
      tipoFecha
    };

    return this.post<any>('/v1/orders/all/export', exportFilter);
  }

  /**
   * @deprecated Usar getAllOrdersForExportDirect para exportaciones
   * Este método tiene límites de paginación del backend
   */
  getAllOrdersForExport(filter: any): Observable<PaginatedOrdersResponse> {
    const queryParams = `page=1&pageSize=10000&includeMetrics=false&forExport=true`;
    const endpoint = `/v1/orders/all/filter/optimized?${queryParams}`;
    console.log('📊 VentasService - getAllOrdersForExport (legacy)');
    return this.post<PaginatedOrdersResponse>(endpoint, filter);
  }
  getOrdersByNroPedido(nroPedido: any) {
    return this.get<Pedido[]>('/v1/orders/byNroPedido/' + nroPedido);
  }

  /**
   * Busca pedidos por término general (Nro Pedido, WooCommerce ID, Shopify ID, etc.)
   * @param query Término de búsqueda
   */
  searchOrders(query: string) {
    return this.post<Pedido[]>('/v1/orders/search', { query });
  }



  enviarCorreoConfirmacionPedido(orderTemplate: any): Observable<any> {
    return this.post<any>('/v1/orders/sendEmail', orderTemplate);
  }

  /**
   * Spec 009 — Métricas de un cliente: ticket promedio, valor total, última compra
   * y pedidos relacionados (paginados). Solo lectura. Excluye anulados/rechazados.
   */
  getCustomerSummary(documento: string, page: number = 1, pageSize: number = 20): Observable<CustomerSummary> {
    const qp = `documento=${encodeURIComponent(documento)}&page=${page}&pageSize=${pageSize}`;
    return this.get<CustomerSummary>('/v1/orders/customer-summary?' + qp);
  }

  /**
   * Métricas globales de clientes (panel superior del listado).
   * El header `company` lo agrega el interceptor. El backend cachea (~30 min) y
   * marca `_stale` cuando recalcula en segundo plano.
   */
  getGlobalCustomerMetrics(): Observable<any> {
    return this.get<any>('/v1/orders/global-metrics');
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
          orderId: order._id,
          clienteEmail: order.cliente?.correo_electronico_comprador
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
          trackingNumber: order.nroShippingOrder,
          clienteEmail: order.cliente?.correo_electronico_comprador
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

      // Calcular datos de pago parcial/total si hay PagosAsentados
      const pagos = order?.PagosAsentados || [];
      const ultimoPago = pagos.length > 0 ? pagos[pagos.length - 1] : null;
      const valorTotal = order?.totalPedididoConDescuento || order?.subtotal || 0;
      const totalPagado = pagos.reduce((acc: number, p: any) => acc + (p.valor || 0), 0);
      const valorRestante = Math.max(0, valorTotal - totalPagado);
      const montoPagado = ultimoPago?.valor || valorTotal;

      const textoRestante = valorRestante > 0
        ? `Resta: ${this.formatCurrency(valorRestante)}`
        : '';

      const event: NotificationEvent = {
        type: notificationType,
        data: {
          nroPedido: numeroPedido,
          estadoPago: estadoPago,
          monto: this.formatCurrency(montoPagado),
          orderId: order?._id,
          cliente: order?.cliente?.nombres_completos,
          clienteEmail: order?.cliente?.correo_electronico_comprador,
          textoRestante,
          valorRestante: this.formatCurrency(valorRestante),
          esPagoTotal: valorRestante <= 0,
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

  /**
   * ========================================================================
   * NUEVO MÉTODO: Obtener historial de cambios de estado de una orden
   * ========================================================================
   * Creado: 2025-10-21
   * Propósito: Consultar el historial completo de cambios de estado
   * Endpoint: GET /v1/orders/:orderId/history
   * 
   * NO MODIFICA ningún método existente - Solo agrega funcionalidad nueva
   * 
   * @param orderId - ID de la orden (_id)
   * @returns Observable con el historial de cambios
   */
  getOrderHistory(orderId: string): Observable<any> {
    if (!orderId) {
      throw new Error("orderId es requerido para obtener el historial");
    }

    console.log(`📜 Consultando historial de orden: ${orderId}`);

    return this.get<any>(`/v1/orders/${orderId}/history`).pipe(
      tap((response) => {
        if (response.success) {
          console.log(`✅ Historial obtenido: ${response.totalRecords} registros`);
        } else {
          console.warn("⚠️ No se pudo obtener el historial:", response.error);
        }
      })
    );
  }

  /**
   * Genera y descarga directamente el PDF de una orden de venta para un pedido específico
   * Este método puede ser llamado desde cualquier módulo (ventas, despachos, producción, etc.)
   *
   * @param pedido - El pedido del cual generar la orden de venta
   *
   * @example
   * ```typescript
   * // Desde cualquier componente
   * this.ventasService.generarOrdenVenta(pedidoSeleccionado);
   * ```
   */
  public async generarOrdenVenta(pedido: Pedido): Promise<void> {
    if (!pedido) {
      console.error('❌ No se puede generar orden de venta: pedido no proporcionado');
      return;
    }

    console.log('📄 Generando PDF de orden de venta para pedido:', pedido.nroPedido);

    try {
      // Importar el componente de forma dinámica
      const module = await import('../../../components/ventas/orden-venta/orden-venta.component');
      const OrdenVentaComponent = module.OrdenVentaComponent;

      // Crear el componente dinámicamente
      const componentRef = createComponent(OrdenVentaComponent, {
        environmentInjector: this.environmentInjector,
        elementInjector: this.injector
      });

      // Configurar el pedido en el componente
      componentRef.instance.pedido = pedido;

      // Crear un contenedor oculto en el DOM
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.visibility = 'hidden';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      // Agregar el componente al DOM
      container.appendChild(componentRef.location.nativeElement);
      this.appRef.attachView(componentRef.hostView);

      console.log('⏳ Esperando a que el componente se renderice...');

      // Esperar a que Angular renderice el componente completamente
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('📥 Generando PDF...');

      // Llamar al método descargarPDF del componente
      await componentRef.instance.descargarPDF();

      // Limpiar después de un momento
      setTimeout(() => {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        document.body.removeChild(container);
        console.log('✅ Componente limpiado del DOM');
      }, 1000);

    } catch (error) {
      console.error('❌ Error al generar orden de venta:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  }


}
