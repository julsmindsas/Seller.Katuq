import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Pedido } from '../../../ventas/modelo/pedido';
import { Router } from '@angular/router';
import { IntegrationsService, Integration, IntegrationCategory } from '../../../integrations/integrations.service';
import { LogisticaServiceV2 } from '../../../../shared/services/despachos/logistica.service.v2';

@Component({
  selector: 'app-ordenes-despacho',
  templateUrl: './ordenes-despacho.component.html',
  styleUrls: ['./ordenes-despacho.component.scss']
})
export class OrdenesDespachoComponent implements OnInit {
  @Input() dispatchOrders: any[] = [];

  @Output() onClose = new EventEmitter<void>();
  @Output() onPrintOrder = new EventEmitter<string>();
  @Output() onViewOrder = new EventEmitter<string>();
  @Output() onDispatchOrder = new EventEmitter<any>();
  @Output() onDispatchPedido = new EventEmitter<any>();
  @Output() onDispatchWithTransporter = new EventEmitter<{ order: any, transporter: string }>();

  filteredOrders: any[] = [];
  searchTerm: string = '';

  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pagedOrders: any[] = [];

  // Detalles expandibles
  expandedRows: Set<string> = new Set();

  // Para usar Math en el template
  Math = Math;

  // Para modal de transportadores
  showTransporterModal: boolean = false;
  selectedOrderForDispatch: any = null;
  @Input() availableTransporters: Integration[] = [];
  selectedTransporter: string = '';
  isDispatchingShipment: boolean = false;

  // NUEVAS propiedades para paginación del servidor (mantener compatibilidad)
  useServerSidePagination: boolean = false;  // Por defecto FALSE para no romper nada
  isLoadingServerData: boolean = false;
  serverTotalRecords: number = 0;
  serverOrders: any[] = [];

  // Filtros de fecha para optimización
  fechaInicio: Date = new Date(new Date().setDate(new Date().getDate() - 30));
  fechaFin: Date = new Date();
  showDateFilters: boolean = false;

  constructor(
    private router: Router,
    private integrationsService: IntegrationsService,
    private logisticaService: LogisticaServiceV2
  ) { }

  ngOnInit(): void {
    // Verificar que dispatchOrders sea un array válido
    if (!this.dispatchOrders || !Array.isArray(this.dispatchOrders)) {
      this.dispatchOrders = [];
    }
    
    // Mantener lógica existente para compatibilidad
    this.filteredOrders = [...this.dispatchOrders];
    this.dispatchOrders.forEach(order => {
      if (order && order.pedidos && Array.isArray(order.pedidos)) {
        order.pedidos.forEach(pedido => {
          pedido.faltaPorPagar = this.getValorACobrarPorPedido(pedido);
        });
      }
    });
    this.updatePagination();
    this.loadLogisticsIntegrations();
    
    // NUEVO: Detectar automáticamente si debe usar modo servidor
    this.checkIfShouldUseServerMode();
  }

  /**
   * NUEVO: Detecta automáticamente si debe usar paginación del servidor
   * Se activa cuando no hay órdenes del padre (indica que debe cargar del servidor)
   */
  private checkIfShouldUseServerMode(): void {
    // Si no hay órdenes del padre y no está ya en modo servidor, activar automáticamente
    if (this.dispatchOrders.length === 0 && !this.useServerSidePagination) {
      console.log('Detectando modo servidor automáticamente - activando...');
      this.useServerSidePagination = true;
      this.showDateFilters = true;
      this.loadServerSideOrders();
    }
  }

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredOrders = [...this.dispatchOrders];
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredOrders = this.dispatchOrders.filter(order => {
        return (
          (order.nroShippingOrder?.toString().includes(searchTermLower)) ||
          (order.fecha?.toLowerCase().includes(searchTermLower)) ||
          (order.transportador?.toLowerCase().includes(searchTermLower))
        );
      });
    }

    // Reset a la primera página cuando se aplica un filtro
    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilter(): void {
    this.searchTerm = '';
    this.filteredOrders = [...this.dispatchOrders];
    this.updatePagination();
  }

  printOrder(orderId: string): void {
    this.onPrintOrder.emit(orderId);
  }

  viewOrder(orderId: string): void {
    // Solo emitir el evento para que el padre maneje la apertura de la orden
    this.onViewOrder.emit(orderId);
  }

  dispatchOrder(order: any): void {
    // Verificar si es una orden de transportadora usando método robusto
    if (this.isTransportadoraOrder(order)) {
      this.selectedOrderForDispatch = order;
      this.selectedTransporter = '';
      this.showTransporterModal = true;
    } else {
      // Despacho directo para mensajero propio
      this.onDispatchOrder.emit(order);
    }
  }

  dispatchPedido(pedido: any): void {
    this.onDispatchPedido.emit(pedido);
  }

  closeModal(): void {
    this.onClose.emit();
  }

  // Métodos para la paginación
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    this.updatePagedOrders();
  }

  updatePagedOrders(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedOrders = this.filteredOrders.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.updatePagedOrders();
  }

  onPageSizeChange(): void {
    this.currentPage = 1; // Reset a la primera página
    this.updatePagination();
  }

  getPagesToShow(): number[] {
    const visiblePages = 5; // Número de páginas para mostrar
    const pages: number[] = [];

    let startPage = Math.max(1, this.currentPage - Math.floor(visiblePages / 2));
    let endPage = startPage + visiblePages - 1;

    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - visiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Métodos para expandir/contraer filas
  toggleRowDetails(order: any): void {
    const key = this.getOrderKey(order);
    if (this.expandedRows.has(key)) {
      this.expandedRows.delete(key);
    } else {
      this.expandedRows.add(key);
    }
  }

  isRowExpanded(order: any): boolean {
    return this.expandedRows.has(this.getOrderKey(order));
  }

  private getOrderKey(order: any): string {
    return order.nroShippingOrder?.toString() || order.id?.toString() || Math.random().toString();
  }

  // Métodos para obtener información de los pedidos
  getFaltaPorPagarSum(order: any): number {
    if (!order.pedidos || !Array.isArray(order.pedidos)) {
      return 0;
    }

    return order.pedidos.reduce((sum: number, pedido: any) => {
      // Verifica si faltaPorPagar es un número negativo y, si es así, lo reemplaza por 0
      const faltaPorPagar = pedido.faltaPorPagar < 0 ? 0 : pedido.faltaPorPagar || 0;
      return sum + faltaPorPagar;
    }, 0);
  }

  getPedidosCount(order: any): number {
    return order.pedidos?.length || 0;
  }

  getEstadoProceso(order: any): string {
    if (!order.pedidos || order.pedidos.length === 0) return 'Sin pedidos';
    return order.pedidos[0].estadoProceso === 'Despachado' ? 'Despachado' : 'Por despachar';
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  getPedidoCliente(pedido: any): string {
    const cliente = pedido.cliente;
    if (!cliente) return 'N/A';

    const nombres = cliente.nombres_completos || cliente.nombres || '';
    const apellidos = cliente.apellidos_completos || cliente.apellidos || '';

    return nombres && apellidos
      ? `${nombres} ${apellidos}`
      : nombres || apellidos || 'N/A';
  }
  getTotalImpuesto(pedido) {
    let totalPrecioIVADef = 0;
    pedido.carrito.forEach((itemCarrito) => {
      let totalPrecioIVA = 0;
      if (itemCarrito.producto && itemCarrito.producto.precio) {
        if (itemCarrito.producto.precio.preciosVolumen && itemCarrito.producto.precio.preciosVolumen.length > 0) {
          itemCarrito.producto.precio.preciosVolumen.forEach((x) => {
            if (
              itemCarrito.cantidad >= x.numeroUnidadesInicial &&
              itemCarrito.cantidad <= x.numeroUnidadesLimite
            ) {
              totalPrecioIVA =
                x.valorUnitarioPorVolumenIva * itemCarrito.cantidad;
            } else {
              totalPrecioIVA =
                itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
            }
          });
        } else {
          totalPrecioIVA =
            itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
        }
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion) => {
          try {
            if (adicion["referencia"]["precioIva"])
              totalPrecioIVA +=
                adicion["cantidad"] *
                adicion["referencia"]["precioIva"] *
                itemCarrito.cantidad;
          } catch (error) { }
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia) => {
          totalPrecioIVA += preferencia["valorIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioIVADef += totalPrecioIVA;
    });

    return totalPrecioIVADef;
  }

  getValorACobrarPorPedido(pedido) {
    const order = pedido;

    order.totalPedidoSinDescuento = this.getSubTotalPedido(order);
    order.totalImpuesto = this.getTotalImpuesto(order);
    order.subtotal =
      order.totalPedidoSinDescuento +
      order.totalEnvio -
      order.totalDescuento;
    order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;

    // Calcular anticipo basado en PagosAsentados si existen
    if (order.PagosAsentados && order.PagosAsentados.length > 0) {
      order.anticipo = order.PagosAsentados.reduce((acc, pago) => {
        // Para Wompi, verificar que no esté pendiente
        if (
          pago.formaPago?.toLowerCase().includes("wompi") &&
          pago.estadoVerificacion === "Pendiente"
        ) {
          return acc; // No sumar pagos de Wompi pendientes
        }
        // Considerar tanto valor como valorRegistrado
        const valorPago = pago.valor || pago.valorRegistrado || 0;
        return acc + valorPago;
      }, 0);
    } else if (order.anticipo == null || order.anticipo == undefined) {
      order.anticipo = 0;
    }

    // Calcular falta por pagar basado en el total y anticipo real
    order.faltaPorPagar = Math.max(
      0,
      order.totalPedididoConDescuento - order.anticipo,
    );

    return order.faltaPorPagar;
  }

  getSubTotalPedido(pedido) {
    let totalPrecioSinIVADef = 0;
    pedido.carrito.map((itemCarrito) => {
      let totalPrecioSinIVA = 0;
      if (itemCarrito.producto && itemCarrito.producto.precio) {
        if (itemCarrito.producto.precio.preciosVolumen && itemCarrito.producto.precio.preciosVolumen.length > 0) {
          itemCarrito.producto.precio.preciosVolumen.map((x) => {
            if (
              itemCarrito.cantidad >= x.numeroUnidadesInicial &&
              itemCarrito.cantidad <= x.numeroUnidadesLimite
            ) {
              totalPrecioSinIVA =
                x.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
            } else {
              totalPrecioSinIVA =
                itemCarrito.producto?.precio?.precioUnitarioSinIva *
                itemCarrito.cantidad;
            }
          });
        } else {
          totalPrecioSinIVA =
            itemCarrito.producto?.precio?.precioUnitarioSinIva *
            itemCarrito.cantidad;
        }
      }

      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion) => {
          try {
            if (adicion["referencia"]["precioUnitario"]) {
              totalPrecioSinIVA +=
                adicion["cantidad"] *
                (adicion["referencia"]["precioUnitario"] ?? 1) *
                itemCarrito.cantidad;
            }
          } catch (error) {
            console.log("Pedido: ", adicion);
          }
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia) => {
          totalPrecioSinIVA +=
            preferencia["valorUnitarioSinIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioSinIVADef += totalPrecioSinIVA;
    });

    return totalPrecioSinIVADef;
  }

  // Métodos para manejo de transportadores integrados
  loadLogisticsIntegrations(): void {
    this.integrationsService.getIntegrationsByCategory(IntegrationCategory.LOGISTICS)
      .subscribe({
        next: (integrations) => {
          this.availableTransporters = integrations;
        },
        error: (error) => {
          console.error('Error al cargar integraciones logísticas:', error);
          this.availableTransporters = [];
        }
      });
  }

  confirmDispatchWithTransporter(): void {
    if (!this.selectedTransporter || !this.selectedOrderForDispatch) {
      return;
    }

    // Construir payload requerido por /v1/logistics/shipments
    const order = this.selectedOrderForDispatch;
    const shipmentPayload = {
      companyId: order?.companyId || order?.company || '',
      provider: this.selectedTransporter,
      order: {
        nroShippingOrder: order?.nroShippingOrder,
        fecha: order?.fecha,
        pedidos: order?.pedidos
      },
      options: {
        normalizeResponse: false,
      },
    };

    this.isDispatchingShipment = true;
    this.logisticaService.createShipment(shipmentPayload).subscribe({
      next: () => {
        this.isDispatchingShipment = false;
        // Cerrar modal y limpiar selección
        this.closeTransporterModal();
      },
      error: (error) => {
        console.error('Error creando envío con transportadora:', error);
        this.isDispatchingShipment = false;
      }
    });
  }

  closeTransporterModal(): void {
    this.showTransporterModal = false;
    this.selectedOrderForDispatch = null;
    this.selectedTransporter = '';
  }

  getTransporterDisplayName(transporter: Integration): string {
    return transporter.name || transporter.type || transporter.provider || 'Transportador';
  }

  /**
   * Función robusta para detectar si una orden es de tipo transportadora
   * Verifica múltiples posibles nombres de campo y valores
   */
  isTransportadoraOrder(order: any): boolean {
    if (!order) return false;

    // Verificar diferentes posibles nombres de campo
    const possibleFields = [
      order.metodoEnvio,
      order.metodo_envio,
      order.tipoEnvio,
      order.tipo_envio,
      order.metodoenVio, // typo común
      order.shippingMethod
    ];

    // Verificar si algún campo contiene 'transportadora' (case insensitive)
    for (const field of possibleFields) {
      if (field && typeof field === 'string') {
        const value = field.toLowerCase().trim();
        if (value === 'transportadora' || value === 'transportador' || value === 'carrier') {
          return true;
        }
      }
    }

    // Verificar si hay un transportador específico asignado (diferente de mensajero propio)
    if (order.transportador && order.transportador !== 'mensajero_propio' && order.transportador !== 'Mensajero Propio') {
      return true;
    }

    // Verificar campo booleano si existe
    if (order.esTransportadora === true || order.is_transportadora === true) {
      return true;
    }

    return false;
  }

  // ========== NUEVOS MÉTODOS PARA PAGINACIÓN DEL SERVIDOR ==========

  /**
   * NUEVO: Cargar órdenes directamente del servidor con paginación
   * Mantiene toda la funcionalidad existente intacta
   */
  loadServerSideOrders(): void {
    this.isLoadingServerData = true;
    
    const currentCompanyStr = localStorage.getItem("currentCompany");
    const companyName = currentCompanyStr
      ? JSON.parse(currentCompanyStr).nomComercial
      : "";
    
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      fechaInicio: this.fechaInicio?.toISOString().split('T')[0],
      fechaFin: this.fechaFin?.toISOString().split('T')[0],
      fields: 'full' as 'minimal' | 'full'
    };
    
    console.log('Cargando órdenes del servidor con parámetros:', params);
    
    this.logisticaService.getShippingOrdersPaginated(params).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        
        if (!response || !response.data) {
          console.error('Respuesta inválida del servidor');
          this.fallbackToLocalMode();
          return;
        }

        // Filtrar por empresa como hace el método original
        const filteredOrders = response.data.filter((x: any) => x.company == companyName);
        
        // Procesar órdenes como en el método original
        filteredOrders.forEach((order: any) => {
          if (order.pedidos) {
            order.pedidos.forEach((pedido: any) => {
              pedido.faltaPorPagar = this.getValorACobrarPorPedido(pedido);
            });
          }
        });
        
        // Actualizar datos del servidor
        this.serverOrders = filteredOrders;
        this.serverTotalRecords = response.pagination?.total || response.pagination?.count || filteredOrders.length;
        
        // IMPORTANTE: Actualizar las variables que usa la UI existente
        this.pagedOrders = this.serverOrders;
        this.filteredOrders = this.serverOrders;  // Para que el contador funcione
        this.totalPages = Math.ceil(this.serverTotalRecords / this.pageSize);
        
        this.isLoadingServerData = false;
        
        console.log(`Cargadas ${this.serverOrders.length} órdenes del servidor (Página ${this.currentPage})`);
      },
      error: (error) => {
        console.error('Error cargando del servidor:', error);
        this.fallbackToLocalMode();
      }
    });
  }

  /**
   * NUEVO: Cambio de página en modo servidor
   */
  onServerPageChange(page: number): void {
    if (page < 1 || (this.serverTotalRecords > 0 && page > this.totalPages)) {
      return;
    }
    this.currentPage = page;
    this.loadServerSideOrders();
  }

  /**
   * NUEVO: Toggle entre modo local y servidor
   */
  togglePaginationMode(): void {
    this.useServerSidePagination = !this.useServerSidePagination;
    
    if (this.useServerSidePagination) {
      console.log('Activando modo servidor...');
      this.showDateFilters = true;
      this.currentPage = 1;  // Reset a primera página
      this.loadServerSideOrders();
    } else {
      console.log('Activando modo local...');
      this.showDateFilters = false;
      // Volver al comportamiento original
      this.filteredOrders = [...this.dispatchOrders];
      this.updatePagination();
    }
  }

  /**
   * NUEVO: Aplicar filtro de fechas (solo en modo servidor)
   */
  applyDateFilter(): void {
    if (!this.useServerSidePagination) return;
    
    console.log('Aplicando filtro de fechas:', {
      inicio: this.fechaInicio,
      fin: this.fechaFin
    });
    
    this.currentPage = 1;  // Reset a primera página
    this.loadServerSideOrders();
  }

  /**
   * NUEVO: Fallback al modo local si el servidor falla
   */
  private fallbackToLocalMode(): void {
    console.warn('Fallback a modo local debido a error del servidor');
    this.useServerSidePagination = false;
    this.isLoadingServerData = false;
    this.showDateFilters = false;
    
    // Restaurar comportamiento original
    this.filteredOrders = [...this.dispatchOrders];
    this.updatePagination();
  }

  /**
   * NUEVO: Override del método goToPage para manejar ambos modos
   * Mantiene compatibilidad total con el método existente
   */
  goToPageV2(page: number): void {
    if (this.useServerSidePagination) {
      this.onServerPageChange(page);
    } else {
      // Usar el método original
      this.goToPage(page);
    }
  }

  /**
   * NUEVO: Override del cambio de tamaño de página para ambos modos
   */
  onPageSizeChangeV2(): void {
    if (this.useServerSidePagination) {
      this.currentPage = 1;
      this.loadServerSideOrders();
    } else {
      // Usar el método original
      this.onPageSizeChange();
    }
  }
} 