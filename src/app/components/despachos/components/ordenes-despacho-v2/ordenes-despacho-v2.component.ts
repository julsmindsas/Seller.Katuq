import { Component, EventEmitter, OnInit, Output, Input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { IntegrationsService, Integration, IntegrationCategory } from '../../../integrations/integrations.service';
import { LogisticaServiceV2 } from '../../../../shared/services/despachos/logistica.service.v2';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import { EstadoProceso } from '../../../ventas/modelo/pedido';
import { DialogService } from 'primeng/dynamicdialog';
import { EnviameRatesModalComponent } from '../enviame/rates-modal/enviame-rates-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ordenes-despacho-v2',
  templateUrl: './ordenes-despacho-v2.component.html',
  styleUrls: ['./ordenes-despacho-v2.component.scss']
})
export class OrdenesDespachoV2Component implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  // @Output() onClose = new EventEmitter<void>(); // No necesario al estar integrado en tabs
  @Output() onPrintOrder = new EventEmitter<string>();
  @Output() onViewOrder = new EventEmitter<string>();
  @Output() onDispatchOrder = new EventEmitter<any>();
  @Output() onDispatchPedido = new EventEmitter<any>();

  // Inputs
  @Input() vendors: any[] = []; // Fallback vendors from parent

  // Datos principales
  allOrders: any[] = [];
  isLoading: boolean = false;
  isLoadingMore: boolean = false;
  hasMore: boolean = true;
  totalRecords: number = 0;

  // NUEVOS campos de paginación precisos
  totalPages: number = 0;
  totalItems: number = 0;
  hasNextPage: boolean = false;
  
  // Paginación para scroll infinito
  currentPage: number = 1;
  pageSize: number = 20; // Cargar de 20 en 20
  
  // Filtros
  searchTerm: string = '';
  fechaInicio: Date;
  fechaFin: Date;
  showFilters: boolean = true;
  
  // Estados de vista
  viewMode: 'table' | 'cards' = 'table';
  expandedRows: Set<string> = new Set();
  
  // Modal de transportadores
  showTransporterModal: boolean = false;
  selectedOrderForDispatch: any = null;
  availableTransporters: Integration[] = [];
  loadedVendors: any[] = []; // Local vendors/transporters loaded from API
  selectedTransporter: string = '';
  isDispatchingShipment: boolean = false;

  // Modal específico de opciones Enviame
  showEnviameOptionsModal: boolean = false;
  enviameSelectedOption: 'quote' | 'other' | '' = '';
  showAlternativeTransporters: boolean = false;

  // Para usar Math en el template
  Math = Math;

  constructor(
    private router: Router,
    private integrationsService: IntegrationsService,
    private logisticaService: LogisticaServiceV2,
    private ventasService: VentasService,
    private dialogService: DialogService
  ) { }

  ngOnInit(): void {
    // Establecer fechas correctamente: HOY y hace 30 días
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    this.fechaInicio = hace30Dias;
    this.fechaFin = hoy;
    this.fechaFin.setHours(23, 59, 59, 999);
    
    this.loadLogisticsIntegrations();
    this.loadVendors();
    this.loadInitialOrders();
  }

  /**
   * Cargar las primeras órdenes
   */
  loadInitialOrders(): void {
    this.isLoading = true;
    this.currentPage = 1;
    this.allOrders = [];
    this.loadMoreOrders();
  }

  /**
   * Cargar más órdenes (para scroll infinito)
   */
  loadMoreOrders(): void {
    // Validaciones mejoradas con nuevos campos
    if (!this.hasNextPage && this.currentPage > 1) {
      console.log('No hay más páginas disponibles');
      return;
    }
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      console.log(`Ya se alcanzó el límite: ${this.totalPages} páginas`);
      return;
    }

    if (this.isLoadingMore) {
      return;
    }

    this.isLoadingMore = true;
    
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
    
    console.log(`Cargando órdenes - Página ${this.currentPage}:`, params);
    
    this.logisticaService.getShippingOrdersPaginated(params).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        console.log('Campos de paginación disponibles:', {
          totalItems: (response as any).totalItems,
          totalPages: (response as any).totalPages,
          hasNextPage: (response as any).hasNextPage,
          hasMore: (response as any).hasMore,
          pagination: response.pagination
        });
        
        if (!response || !response.data) {
          console.error('Respuesta inválida del servidor');
          this.isLoading = false;
          this.isLoadingMore = false;
          return;
        }

        // Filtrar por empresa como hace el método original
        let filteredOrders = response.data.filter((x: any) => x.company == companyName);
        
        // Aplicar filtro de búsqueda si existe
        if (this.searchTerm) {
          const searchTermLower = this.searchTerm.toLowerCase();
          filteredOrders = filteredOrders.filter((order: any) => {
            return (
              (order.nroShippingOrder?.toString().includes(searchTermLower)) ||
              (order.fecha?.toLowerCase().includes(searchTermLower)) ||
              (order.transportador?.toLowerCase().includes(searchTermLower))
            );
          });
        }
        
        // Procesar órdenes como en el método original
        filteredOrders.forEach((order: any) => {
          if (order.pedidos) {
            order.pedidos.forEach((pedido: any) => {
              pedido.faltaPorPagar = this.getValorACobrarPorPedido(pedido);
            });

            // Verificar y actualizar estado si tiene transportador asignado
            this.updateOrderStateIfNeeded(order);
          }
        });
        
        // Si es la primera página, reemplazar. Si no, agregar al final
        if (this.currentPage === 1) {
          this.allOrders = filteredOrders;
        } else {
          this.allOrders.push(...filteredOrders);
        }
        
        // Intentar obtener los campos de múltiples ubicaciones posibles
        const responseData = response as any;
        const paginationData = responseData.pagination || responseData;
        
        // Buscar totalItems en múltiples ubicaciones
        this.totalItems = responseData.totalItems || 
                          paginationData.totalItems || 
                          paginationData.total || 
                          paginationData.count || 
                          0;
        
        // Buscar totalPages en múltiples ubicaciones
        this.totalPages = responseData.totalPages || 
                          paginationData.totalPages || 
                          Math.ceil(this.totalItems / (paginationData.limit || this.pageSize));
        
        // Buscar hasNextPage en múltiples ubicaciones
        this.hasNextPage = responseData.hasNextPage || 
                          paginationData.hasNextPage || 
                          paginationData.hasMore || 
                          false;
        
        console.log('Valores asignados:', {
          totalItems: this.totalItems,
          totalPages: this.totalPages,
          hasNextPage: this.hasNextPage
        });
        
        // Para compatibilidad con UI existente
        this.totalRecords = this.totalItems;
        this.hasMore = this.hasNextPage;
        
        this.currentPage++;
        this.isLoading = false;
        this.isLoadingMore = false;
        
        console.log(`Página ${this.currentPage - 1}/${this.totalPages} - Órdenes: ${this.allOrders.length}/${this.totalItems}`);
        console.log(`¿Hay página siguiente?: ${this.hasNextPage}`);
      },
      error: (error) => {
        console.error('Error cargando del servidor:', error);
        this.isLoading = false;
        this.isLoadingMore = false;
        this.hasMore = false;
      }
    });
  }

  /**
   * Detectar scroll para cargar más contenido (CORREGIDO para modal)
   */
  onScroll(event: any): void {
    const container = this.scrollContainer?.nativeElement;
    if (!container) return;
    
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Cargar más cuando esté al 90% del scroll
    if (scrollPercentage > 0.9 && !this.isLoadingMore && this.hasMore) {
      console.log(`Scroll infinito activado: ${Math.round(scrollPercentage * 100)}%`);
      this.loadMoreOrders();
    }
  }

  /**
   * Aplicar filtros (reinicia la lista)
   */
  applyFilters(): void {
    console.log('Aplicando filtros:', {
      searchTerm: this.searchTerm,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    });
    
    this.currentPage = 1;
    this.hasMore = true;
    this.loadInitialOrders();
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.searchTerm = '';
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    this.fechaInicio = hace30Dias;
    this.fechaFin = hoy;
    this.fechaFin.setHours(23, 59, 59, 999);
    this.applyFilters();
  }

  /**
   * Cambiar modo de vista
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }

  /**
   * Toggle de mostrar/ocultar filtros
   */
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // ========== MÉTODOS DE ACCIONES (COPIADOS DEL ORIGINAL) ==========

  // Método comentado porque el componente ahora está integrado en tabs
  // closeModal(): void {
  //   this.onClose.emit();
  // }

  printOrder(orderId: string): void {
    this.onPrintOrder.emit(orderId);
  }

  viewOrder(orderId: string): void {
    this.onViewOrder.emit(orderId);
  }

  dispatchOrder(order: any): void {
    if (this.isTransportadoraOrder(order)) {
      this.selectedOrderForDispatch = order;
      this.selectedTransporter = '';
      this.showTransporterModal = true;
    } else {
      this.onDispatchOrder.emit(order);
    }
  }

  dispatchPedido(pedido: any): void {
    this.onDispatchPedido.emit(pedido);
  }

  // ========== MÉTODOS DE EXPANSIÓN DE FILAS ==========

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

  // ========== MÉTODOS PARA MANEJO DE FECHAS ==========

  /**
   * Obtener fecha inicio en formato string para input
   */
  getFechaInicioString(): string {
    if (!this.fechaInicio) return '';
    const year = this.fechaInicio.getFullYear();
    const month = String(this.fechaInicio.getMonth() + 1).padStart(2, '0');
    const day = String(this.fechaInicio.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Obtener fecha fin en formato string para input
   */
  getFechaFinString(): string {
    if (!this.fechaFin) return '';
    const year = this.fechaFin.getFullYear();
    const month = String(this.fechaFin.getMonth() + 1).padStart(2, '0');
    const day = String(this.fechaFin.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Obtener fecha de hoy en formato string
   */
  getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Manejar cambio de fecha inicio
   */
  onFechaInicioChange(event: any): void {
    const dateString = event.target.value;
    if (dateString) {
      // Crear fecha local sin conversión UTC
      const [year, month, day] = dateString.split('-').map(Number);
      this.fechaInicio = new Date(year, month - 1, day);
    } else {
      this.fechaInicio = new Date();
    }
    console.log('Fecha inicio cambiada:', this.fechaInicio);
    // Auto-aplicar filtros cuando cambie la fecha
    this.applyFilters();
  }

  /**
   * Manejar cambio de fecha fin
   */
  onFechaFinChange(event: any): void {
    const dateString = event.target.value;
    if (dateString) {
      // Crear fecha local sin conversión UTC y establecer a 23:59:59
      const [year, month, day] = dateString.split('-').map(Number);
      this.fechaFin = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      this.fechaFin = new Date();
      this.fechaFin.setHours(23, 59, 59, 999);
    }
    console.log('Fecha fin cambiada:', this.fechaFin);
    // Auto-aplicar filtros cuando cambie la fecha
    this.applyFilters();
  }

  // ========== MÉTODOS DE CÁLCULO (COPIADOS DEL ORIGINAL) ==========

  getFaltaPorPagarSum(order: any): number {
    if (!order.pedidos || !Array.isArray(order.pedidos)) {
      return 0;
    }
    return order.pedidos.reduce((sum: number, pedido: any) => {
      const faltaPorPagar = pedido.faltaPorPagar < 0 ? 0 : pedido.faltaPorPagar || 0;
      return sum + faltaPorPagar;
    }, 0);
  }

  getPedidosCount(order: any): number {
    return order.pedidos?.length || 0;
  }

  getEstadoProceso(order: any): string {
    if (!order.pedidos || order.pedidos.length === 0) return 'Sin pedidos';

    // Verificar si todos los pedidos están entregados
    const todosEntregados = order.pedidos.every((pedido: any) =>
      pedido.estadoProceso === EstadoProceso.Entregado
    );
    if (todosEntregados) return 'Entregado';

    // Verificar si la orden tiene transportador asignado
    const tieneTransportador = order.transportador &&
                              order.transportador !== '' &&
                              order.transportador !== 'N/A' &&
                              order.transportador !== null;

    // Verificar si todos los pedidos están despachados
    const todosDespachados = order.pedidos.every((pedido: any) =>
      pedido.estadoProceso === EstadoProceso.Despachado
    );

    // Si tiene transportador asignado o todos están despachados, es "Despachado"
    if (tieneTransportador || todosDespachados) return 'Despachado';

    // De lo contrario, está por despachar
    return 'Por despachar';
  }

  canDispatchOrder(order: any): boolean {
    const estado = this.getEstadoProceso(order);
    // Solo permitir despachar si está "Por despachar" y NO tiene transportador asignado
    const tieneTransportador = order.transportador &&
                              order.transportador !== '' &&
                              order.transportador !== 'N/A' &&
                              order.transportador !== null;
    return estado === 'Por despachar' && !tieneTransportador;
  }

  canEditOrder(order: any): boolean {
    const estado = this.getEstadoProceso(order);
    // No permitir editar si está entregado
    return estado !== 'Entregado';
  }

  canPrintOrder(order: any): boolean {
    // Siempre permitir imprimir
    return true;
  }

  isOrderDispatched(order: any): boolean {
    const estado = this.getEstadoProceso(order);
    return estado === 'Despachado' || estado === 'Sin pedidos';
  }

  isOrderDelivered(order: any): boolean {
    const estado = this.getEstadoProceso(order);
    return estado === 'Entregado';
  }

  isPedidoDispatched(pedido: any): boolean {
    return pedido.estadoProceso === 'Despachado';
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
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

  // ========== MÉTODOS DE TRANSPORTADORES ==========

  loadLogisticsIntegrations(): void {
    this.integrationsService.getIntegrationsByCategory(IntegrationCategory.LOGISTICS)
      .subscribe({
        next: (integrations) => {
          this.availableTransporters = integrations;
          console.log('Integraciones logísticas cargadas:', integrations);
        },
        error: (error) => {
          console.error('Error al cargar integraciones logísticas:', error);
          this.availableTransporters = [];
        }
      });
  }

  loadVendors(): void {
    this.logisticaService.getTransportadores()
      .subscribe({
        next: (vendors) => {
          this.loadedVendors = vendors || [];
          console.log('Vendors cargados:', vendors);
        },
        error: (error) => {
          console.error('Error al cargar vendors:', error);
          this.loadedVendors = [];
        }
      });
  }

  // Getter para combinar vendors cargados con los recibidos como Input
  get allVendors(): any[] {
    // Priorizar vendors cargados de la API, usar Input como fallback
    return this.loadedVendors.length > 0 ? this.loadedVendors : this.vendors;
  }

  confirmDispatchWithTransporter(): void {
    if (!this.selectedTransporter || !this.selectedOrderForDispatch) {
      return;
    }

    // Si es Enviame.io, mostrar modal de opciones específicas
    if (this.selectedTransporter === 'enviame') {
      this.showEnviameOptionsModal = true;
      this.showTransporterModal = false; // Cerrar el modal actual
      return;
    }

    // Flujo normal para otros transportadores
    this.createShipmentDirectly();
  }

  openEnviameRatesModal(): void {
    const modalRef = this.dialogService.open(EnviameRatesModalComponent, {
      data: {
        order: this.selectedOrderForDispatch,
        companyId: this.getCompanyId()
      },
      header: 'Cotizar Envío con Enviame.io',
      width: '90%',
      height: '90%',
      modal: true,
      dismissableMask: false,
      closeOnEscape: false
    });

    modalRef.onClose.subscribe((result) => {
      if (result && result.confirmed) {
        console.log('✅ Envío creado exitosamente con Enviame.io:', result);

        // Actualizar el transportador en la orden
        this.selectedOrderForDispatch.transportador = this.selectedTransporter;

        // Actualizar los pedidos a estado "Despachado"
        const pedidosSinDespachar = this.selectedOrderForDispatch.pedidos.filter((pedido: any) =>
          pedido.estadoProceso !== EstadoProceso.Despachado &&
          pedido.estadoProceso !== EstadoProceso.Entregado
        );

        if (pedidosSinDespachar.length > 0) {
          console.log(`🚚 Asignando transportador "enviame" y marcando ${pedidosSinDespachar.length} pedidos como despachados`);
          this.updatePedidosToDispached(pedidosSinDespachar, this.selectedOrderForDispatch);
        }

        // Emit dispatch event to parent component
        this.onDispatchOrder.emit(this.selectedOrderForDispatch);

        // Reload orders to reflect updated status
        this.loadInitialOrders();
        this.closeTransporterModal();

        console.log('📦 Procesamiento de envío Enviame completado');
      } else {
        console.log('❌ Usuario canceló la cotización de Enviame');
      }
    });
  }

  createShipmentDirectly(): void {
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

        // Actualizar el transportador en la orden
        order.transportador = this.selectedTransporter;

        // Actualizar los pedidos a estado "Despachado"
        const pedidosSinDespachar = order.pedidos.filter((pedido: any) =>
          pedido.estadoProceso !== EstadoProceso.Despachado &&
          pedido.estadoProceso !== EstadoProceso.Entregado
        );

        if (pedidosSinDespachar.length > 0) {
          console.log(`🚚 Asignando transportador "${this.selectedTransporter}" y marcando ${pedidosSinDespachar.length} pedidos como despachados`);
          this.updatePedidosToDispached(pedidosSinDespachar, order);
        }

        // Emit dispatch event to parent component
        this.onDispatchOrder.emit(this.selectedOrderForDispatch);

        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Despacho Confirmado',
          text: 'La orden ha sido despachada exitosamente con la transportadora.',
          timer: 2000,
          showConfirmButton: false
        });

        // Reload orders to reflect updated status
        this.loadInitialOrders();

        this.closeTransporterModal();
      },
      error: (error) => {
        console.error('Error creando envío con transportadora:', error);
        this.isDispatchingShipment = false;
        
        // Show error message
        Swal.fire({
          icon: 'error',
          title: 'Error en Despacho',
          text: 'Hubo un problema al despachar la orden. Por favor intenta nuevamente.',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  closeTransporterModal(): void {
    this.showTransporterModal = false;
    this.selectedOrderForDispatch = null;
    this.selectedTransporter = '';
  }

  // =====================================
  // MÉTODOS PARA MODAL DE OPCIONES ENVIAME
  // =====================================

  /**
   * Abre el modal de opciones específicas para Enviame
   */
  openEnviameOptionsModal(order: any): void {
    this.selectedOrderForDispatch = order;
    this.showEnviameOptionsModal = true;
    this.enviameSelectedOption = '';
    this.showAlternativeTransporters = false;
  }

  /**
   * Cierra el modal de opciones de Enviame
   */
  closeEnviameOptionsModal(): void {
    this.showEnviameOptionsModal = false;
    this.selectedOrderForDispatch = null;
    this.enviameSelectedOption = '';
    this.showAlternativeTransporters = false;
  }

  /**
   * Maneja la selección de opciones en el modal de Enviame
   */
  onEnviameOptionSelected(option: 'quote' | 'other'): void {
    this.enviameSelectedOption = option;

    if (option === 'quote') {
      // Mostrar directamente el modal de cotización
      this.showAlternativeTransporters = false;
    } else if (option === 'other') {
      // Mostrar otros transportadores disponibles
      this.showAlternativeTransporters = true;
    }
  }

  /**
   * Confirma la acción seleccionada en el modal de Enviame
   */
  confirmEnviameOption(): void {
    if (!this.enviameSelectedOption || !this.selectedOrderForDispatch) {
      return;
    }

    if (this.enviameSelectedOption === 'quote') {
      // Guardar la referencia de la orden antes de cerrar el modal
      const orderToProcess = this.selectedOrderForDispatch;

      // Cerrar el modal de opciones
      this.closeEnviameOptionsModal();

      // Restaurar la referencia de la orden y abrir el modal de cotización
      this.selectedOrderForDispatch = orderToProcess;
      this.openEnviameRatesModal();
    } else if (this.enviameSelectedOption === 'other') {
      // Regresar al modal de selección de transportadores pero sin Enviame
      this.closeEnviameOptionsModal();
      this.showTransporterModal = true;
      this.selectedTransporter = ''; // Reset selection
    }
  }

  /**
   * Obtiene los transportadores alternativos (excluyendo Enviame)
   */
  get alternativeTransporters(): Integration[] {
    return this.availableTransporters.filter(t =>
      (t.provider || t.type) !== 'enviame'
    );
  }

  /**
   * Selecciona un transportador alternativo desde el modal de opciones de Enviame
   */
  selectAlternativeTransporter(transporterId: string): void {
    this.selectedTransporter = transporterId;
    this.closeEnviameOptionsModal();
    this.createShipmentDirectly();
  }

  getTransporterDisplayName(transporter: Integration): string {
    return transporter.name || transporter.type || transporter.provider || 'Transportador';
  }

  getVendorDisplayName(vendor: any): string {
    if (vendor.nombres && vendor.apellidos) {
      return `${vendor.nombres} ${vendor.apellidos}`;
    }
    return vendor.nombres || vendor.apellidos || vendor.nombre || 'Transportador';
  }

  getVendorValue(vendor: any): string {
    // Create a unique identifier for the vendor
    if (vendor.nombres && vendor.apellidos && vendor.telefono) {
      return `${vendor.nombres} ${vendor.apellidos}-${vendor.telefono}`;
    }
    return vendor.nombres || vendor.apellidos || vendor.nombre || 'vendor_' + vendor.id;
  }

  isTransportadoraOrder(order: any): boolean {
    if (!order) return false;

    const possibleFields = [
      order.metodoEnvio,
      order.metodo_envio,
      order.tipoEnvio,
      order.tipo_envio,
      order.metodoenVio,
      order.shippingMethod
    ];

    for (const field of possibleFields) {
      if (field && typeof field === 'string') {
        const value = field.toLowerCase().trim();
        if (value === 'transportadora' || value === 'transportador' || value === 'carrier') {
          return true;
        }
      }
    }

  /*  if (order.transportador && order.transportador !== 'mensajero_propio' && order.transportador !== 'Mensajero Propio') {
      return true;
    }*/

    if (order.esTransportadora === true || order.is_transportadora === true) {
      return true;
    }

    return false;
  }

  // ========== MÉTODOS DE CÁLCULO DE PRECIOS (COPIADOS DEL ORIGINAL) ==========

  getTotalImpuesto(pedido: any): number {
    let totalPrecioIVADef = 0;
    pedido.carrito.forEach((itemCarrito: any) => {
      let totalPrecioIVA = 0;
      if (itemCarrito.producto && itemCarrito.producto.precio) {
        if (itemCarrito.producto.precio.preciosVolumen && itemCarrito.producto.precio.preciosVolumen.length > 0) {
          itemCarrito.producto.precio.preciosVolumen.forEach((x: any) => {
            if (
              itemCarrito.cantidad >= x.numeroUnidadesInicial &&
              itemCarrito.cantidad <= x.numeroUnidadesLimite
            ) {
              totalPrecioIVA = x.valorUnitarioPorVolumenIva * itemCarrito.cantidad;
            } else {
              totalPrecioIVA = itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
            }
          });
        } else {
          totalPrecioIVA = itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
        }
      }
      
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion: any) => {
          try {
            if (adicion["referencia"]["precioIva"])
              totalPrecioIVA += adicion["cantidad"] * adicion["referencia"]["precioIva"] * itemCarrito.cantidad;
          } catch (error) { }
        });
      }

      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia: any) => {
          totalPrecioIVA += preferencia["valorIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioIVADef += totalPrecioIVA;
    });

    return totalPrecioIVADef;
  }

  getValorACobrarPorPedido(pedido: any): number {
    const order = pedido;

    order.totalPedidoSinDescuento = this.getSubTotalPedido(order);
    order.totalImpuesto = this.getTotalImpuesto(order);
    order.subtotal = order.totalPedidoSinDescuento + order.totalEnvio - order.totalDescuento;
    order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;

    if (order.PagosAsentados && order.PagosAsentados.length > 0) {
      order.anticipo = order.PagosAsentados.reduce((acc: number, pago: any) => {
        if (
          pago.formaPago?.toLowerCase().includes("wompi") &&
          pago.estadoVerificacion === "Pendiente"
        ) {
          return acc;
        }
        const valorPago = pago.valor || pago.valorRegistrado || 0;
        return acc + valorPago;
      }, 0);
    } else if (order.anticipo == null || order.anticipo == undefined) {
      order.anticipo = 0;
    }

    order.faltaPorPagar = Math.max(0, order.totalPedididoConDescuento - order.anticipo);
    return order.faltaPorPagar;
  }

  getSubTotalPedido(pedido: any): number {
    let totalPrecioSinIVADef = 0;
    pedido.carrito.map((itemCarrito: any) => {
      let totalPrecioSinIVA = 0;
      if (itemCarrito.producto && itemCarrito.producto.precio) {
        if (itemCarrito.producto.precio.preciosVolumen && itemCarrito.producto.precio.preciosVolumen.length > 0) {
          itemCarrito.producto.precio.preciosVolumen.map((x: any) => {
            if (
              itemCarrito.cantidad >= x.numeroUnidadesInicial &&
              itemCarrito.cantidad <= x.numeroUnidadesLimite
            ) {
              totalPrecioSinIVA = x.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
            } else {
              totalPrecioSinIVA = itemCarrito.producto?.precio?.precioUnitarioSinIva * itemCarrito.cantidad;
            }
          });
        } else {
          totalPrecioSinIVA = itemCarrito.producto?.precio?.precioUnitarioSinIva * itemCarrito.cantidad;
        }
      }

      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion: any) => {
          try {
            if (adicion["referencia"]["precioUnitario"]) {
              totalPrecioSinIVA += adicion["cantidad"] * (adicion["referencia"]["precioUnitario"] ?? 1) * itemCarrito.cantidad;
            }
          } catch (error) {
            console.log("Pedido: ", adicion);
          }
        });
      }

      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia: any) => {
          totalPrecioSinIVA += preferencia["valorUnitarioSinIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioSinIVADef += totalPrecioSinIVA;
    });

    return totalPrecioSinIVADef;
  }

  /**
   * Verifica si una orden necesita actualizar el estado de sus pedidos basándose en el transportador asignado
   */
  private updateOrderStateIfNeeded(order: any): void {
    if (!order || !order.pedidos || order.pedidos.length === 0) {
      return;
    }

    // Verificar si la orden tiene transportador asignado
    const tieneTransportador = order.transportador &&
                              order.transportador !== '' &&
                              order.transportador !== 'N/A' &&
                              order.transportador !== null;

    if (tieneTransportador) {
      // Verificar si hay pedidos que no estén despachados
      const pedidosSinDespachar = order.pedidos.filter((pedido: any) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado
      );

      if (pedidosSinDespachar.length > 0) {
        console.log(`📦 Orden ${order.nroShippingOrder} tiene transportador "${order.transportador}" pero ${pedidosSinDespachar.length} pedidos sin marcar como despachados`);
        this.updatePedidosToDispached(pedidosSinDespachar, order);
      }
    }
  }

  /**
   * Actualiza una lista de pedidos a estado "Despachado"
   */
  private updatePedidosToDispached(pedidos: any[], order: any): void {
    const user = localStorage.getItem('user');
    const userLite = user ? JSON.parse(user) : null;

    pedidos.forEach((pedido: any) => {
      // Actualizar el estado del pedido localmente primero
      pedido.estadoProceso = EstadoProceso.Despachado;
      pedido.fechaYHorarioDespachado = new Date().toISOString();
      pedido.despachador = userLite;
      pedido.nroShippingOrder = order.nroShippingOrder;
      pedido.transportador = order.transportador;

      // Enviar la actualización al backend
      this.ventasService.editOrder(pedido).subscribe({
        next: (response) => {
          console.log(`✅ Pedido ${pedido.nroPedido || pedido.referencia} actualizado automáticamente a "Despachado"`);
        },
        error: (error) => {
          console.error(`❌ Error actualizando automáticamente pedido ${pedido.nroPedido || pedido.referencia}:`, error);
          // Revertir el cambio local si falló el backend
          pedido.estadoProceso = pedido.estadoProcesoAnterior || 'ParaDespachar';
        }
      });
    });
  }

  /**
   * Obtiene el ID de la empresa actual
   */
  private getCompanyId(): string {
    // Primero verificar si existe currentCompanyId directamente
    const directCompanyId = localStorage.getItem('currentCompanyId');
    if (directCompanyId) {
      return directCompanyId;
    }

    // Si no existe, extraerlo del objeto currentCompany
    const currentCompany = localStorage.getItem('currentCompany');
    if (currentCompany) {
      try {
        const company = JSON.parse(currentCompany);
        // Intentar diferentes campos que pueden contener el ID de la empresa
        return company.nomComercial || company.nombreComercio || company.razonSocial || company.nombre || 'default_company';
      } catch (error) {
        console.error('Error parsing currentCompany from localStorage:', error);
      }
    }

    return 'default_company';
  }
}