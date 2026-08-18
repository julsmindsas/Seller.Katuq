import { Component, EventEmitter, OnInit, Output, Input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, forkJoin, of, EMPTY } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IntegrationsService, Integration, IntegrationCategory } from '../../../integrations/integrations.service';
import { LogisticaServiceV2 } from '../../../../shared/services/despachos/logistica.service.v2';
import { normalizeTransportadorName } from '../../../../shared/services/despachos/transportador.util';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import { EstadoProceso } from '../../../ventas/modelo/pedido';
import { DialogService } from 'primeng/dynamicdialog';
import { EnviameRatesModalComponent } from '../enviame/rates-modal/enviame-rates-modal.component';
import { CerezaCarrierModalComponent } from '../cereza/carrier-modal/cereza-carrier-modal.component';
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
  /** Transportadora elegida para el despacho por Guía Cereza (solo ese proveedor). */
  cerezaCarrierCode: string | null = null;
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
    // NO establecer fechas por defecto - el backend manejará el límite de 8 días automáticamente
    // Esto permite que las nuevas órdenes aparezcan sin necesidad de filtrar fechas
    this.fechaInicio = null;
    this.fechaFin = null;

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
    
    // Construir parámetros dinámicamente - solo incluir fechas si están definidas
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
      fields: 'full' as 'minimal' | 'full'
    };

    // Solo agregar filtros de fecha si están definidos por el usuario
    if (this.fechaInicio) {
      params.fechaInicio = this.getFechaInicioString();
    }
    if (this.fechaFin) {
      params.fechaFin = this.getFechaFinString();
    }

    // Agregar término de búsqueda si existe
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      params.searchText = this.searchTerm.trim();
    }
    
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
        console.log('📦 Órdenes recibidas del backend (filtradas por empresa):', filteredOrders.length);

        // El backend ya filtró por searchText si se proporcionó
        // No es necesario filtro client-side adicional

        // Procesar órdenes como en el método original
        filteredOrders.forEach((order: any) => {
          if (order.pedidos) {
            order.pedidos.forEach((pedido: any) => {
              pedido.faltaPorPagar = this.getValorACobrarPorPedido(pedido);
            });
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
    console.log('🔍 applyFilters() llamado');
    console.log('Aplicando filtros:', {
      searchTerm: this.searchTerm,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    });

    this.currentPage = 1;
    this.hasMore = true;
    this.hasNextPage = true; // Reset also this flag
    this.loadInitialOrders();
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.searchTerm = '';
    // NO establecer fechas - dejar sin filtro para mostrar órdenes recientes libremente
    this.fechaInicio = null;
    this.fechaFin = null;
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
      this.cerezaCarrierCode = null; // no arrastrar la elección de otro despacho
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

    const estados = order.pedidos.map((p: any) => p.estadoProceso);

    // PRIORIDAD 1: Si TODOS están en el mismo estado final, mostrarlo
    const todosCerrados = estados.every((e: string) => e === EstadoProceso.Cerrado);
    if (todosCerrados) return 'Cerrado';

    const todosRechazados = estados.every((e: string) => e === EstadoProceso.Rechazado);
    if (todosRechazados) return 'Rechazado';

    const todosEntregados = estados.every((e: string) => e === EstadoProceso.Entregado);
    if (todosEntregados) return 'Entregado';

    // PRIORIDAD 2: Si TODOS están en el mismo estado de despacho
    const todosDespachados = estados.every((e: string) => e === EstadoProceso.Despachado);
    if (todosDespachados) return 'Despachado';

    const todosEnDespacho = estados.every((e: string) => e === EstadoProceso.EnDespacho);
    if (todosEnDespacho) return 'En Despacho';

    const todosParaDespachar = estados.every((e: string) => e === EstadoProceso.ParaDespachar);
    if (todosParaDespachar) return 'Para Despachar';

    const todosEmpacados = estados.every((e: string) => e === EstadoProceso.Empacado);
    if (todosEmpacados) return 'Empacado';

    // PRIORIDAD 3: Si TODOS están en el mismo estado de producción
    const todosProducidos = estados.every((e: string) =>
      e === EstadoProceso.ProducidoTotalmente || e === EstadoProceso.Producido
    );
    if (todosProducidos) return 'Producido';

    const todosEnProduccion = estados.every((e: string) =>
      e === EstadoProceso.EnProduccion || e === EstadoProceso.ProducidoParcialmente
    );
    if (todosEnProduccion) return 'En Producción';

    const todosSinProducir = estados.every((e: string) => e === EstadoProceso.SinProducir);
    if (todosSinProducir) return 'Sin Producir';

    // PRIORIDAD 4: Estados mixtos - Mostrar el MENOS avanzado
    // Orden de prioridad de menos a más avanzado
    const ordenPrioridad = [
      EstadoProceso.SinProducir,
      EstadoProceso.EnProduccion,
      EstadoProceso.ProducidoParcialmente,
      EstadoProceso.ProducidoTotalmente,
      EstadoProceso.Producido,
      EstadoProceso.ParaDespachar,
      EstadoProceso.Empacado,
      EstadoProceso.EnDespacho,
      EstadoProceso.Despachado,
      EstadoProceso.Entregado,
      EstadoProceso.Rechazado,
      EstadoProceso.Cerrado
    ];

    // Encontrar el estado menos avanzado presente
    for (const estadoPrioridad of ordenPrioridad) {
      if (estados.includes(estadoPrioridad)) {
        // Mapeo de estado de pedido a estado de orden (para display)
        const mapeoEstados: { [key: string]: string } = {
          'SinProducir': 'En Producción',
          'EnProduccion': 'En Producción',
          'ProducidoParcialmente': 'En Producción',
          'ProducidoTotalmente': 'Producido',
          'Producido': 'Producido',
          'ParaDespachar': 'Para Despachar',
          'Empacado': 'Empacado',
          'EnDespacho': 'En Despacho',
          'Despachado': 'Despachado',
          'Entregado': 'Entregado',
          'Rechazado': 'Rechazado',
          'Cerrado': 'Cerrado'
        };
        return mapeoEstados[estadoPrioridad] || 'Por despachar';
      }
    }

    // Fallback (no debería llegar aquí)
    return 'Por despachar';
  }

  canDispatchOrder(order: any): boolean {
    const estado = this.getEstadoProceso(order);

    // Permitir despachar en múltiples estados antes de la entrega/cierre
    const estadosDespachables = [
      'Por despachar',
      'Para Despachar',
      'Empacado',
      'En Despacho',
      'En Producción',
      'Producido',
      'Sin Producir'
    ];

    return estadosDespachables.includes(estado);
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

    // Verificar si es una orden ya despachada que solo necesita especificar transportadora
    const needsSpecification = this.needsTransporterSpecification(this.selectedOrderForDispatch);

    if (needsSpecification) {
      // Solo actualizar el nombre de la transportadora, sin crear shipment
      this.updateTransporterName(this.selectedOrderForDispatch, this.selectedTransporter);
      return;
    }

    // Si es Enviame.io, mostrar modal de opciones específicas
    if (this.selectedTransporter === 'enviame') {
      this.showEnviameOptionsModal = true;
      this.showTransporterModal = false; // Cerrar el modal actual
      return;
    }

    // Guía Cereza exige carrier_code al crear la orden: el operador elige con
    // qué transportadora sale. El destino lo resuelve el backend desde el
    // pedido, así que no se le pregunta nada más.
    if (this.selectedTransporter === 'osmosis') {
      this.showTransporterModal = false;
      this.elegirTransportadoraCereza();
      return;
    }

    // Flujo normal para otros transportadores (crear shipment)
    this.createShipmentDirectly();
  }

  // ── Modal "Seleccionar Transportador" ─────────────────────────────────────

  /** Paleta estable para el logo de cada transportadora. */
  private readonly COLORES_TRANSPORTADORA = [
    '#7C5CFF', '#1E6FD9', '#1E874B', '#D9820A', '#8E27B0', '#0EA5A0', '#D64545', '#5A6B78',
  ];

  /** Inicial para el logo de la transportadora. */
  inicialTransportadora(transporter: any): string {
    const nombre = String(this.getTransporterDisplayName(transporter) || '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : '?';
  }

  /** Color estable: la misma transportadora siempre con el mismo color. */
  colorTransportadora(transporter: any): string {
    const clave = String(transporter?.provider || transporter?.type || '');
    let suma = 0;
    for (let i = 0; i < clave.length; i++) { suma += clave.charCodeAt(i); }
    return this.COLORES_TRANSPORTADORA[suma % this.COLORES_TRANSPORTADORA.length];
  }

  /** ¿Todas las integraciones están habilitadas? */
  get todasTransportadorasOperativas(): boolean {
    return this.availableTransporters?.length > 0
      && this.availableTransporters.every((t: any) => t.enabled);
  }

  /** Nombre de la transportadora elegida, para el resumen del modal. */
  get nombreTransportadoraElegida(): string {
    if (!this.selectedTransporter) { return ''; }
    const elegida = this.availableTransporters?.find(
      (t: any) => (t.provider || t.type) === this.selectedTransporter,
    );
    return elegida ? this.getTransporterDisplayName(elegida) : this.selectedTransporter;
  }

  /**
   * ¿Esta orden salió por Guía Cereza y por lo tanto se le puede cancelar el
   * envío? Solo tiene sentido si algún pedido conserva el vínculo con Cereza.
   */
  puedeCancelarEnvioCereza(order: any): boolean {
    const transportador = String(order?.transportador || '').toLowerCase();
    if (!transportador.includes('osmosis') && !transportador.includes('cereza')) {
      return false;
    }
    return (order?.pedidos || []).some((p: any) => this.getOsmosisOrderId(p));
  }

  // ── Espera de confirmación de Guía Cereza ─────────────────────────────────
  //
  // Al despachar por Cereza el pedido queda "En Despacho": Cereza ya lo tiene
  // pero todavía no lo despachó. Pasa a "Despachado" cuando Cereza avisa, y eso
  // suele tardar cerca de un minuto. Sin señal en pantalla el operador no sabe
  // si esperar o si algo se atascó, así que se muestra desde cuándo se espera y
  // se marca en rojo lo que ya lleva demasiado.

  /** Minutos a partir de los cuales la espera deja de ser normal. */
  private readonly ESPERA_CEREZA_LIMITE_MIN = 15;

  /** ¿La orden está esperando que Cereza confirme el despacho? */
  esperandoConfirmacionCereza(order: any): boolean {
    const transportador = String(order?.transportador || '').toLowerCase();
    if (!transportador.includes('osmosis') && !transportador.includes('cereza')) {
      return false;
    }
    const estado = this.getEstadoProceso(order);
    return estado === 'En Despacho' || estado === 'EnDespacho';
  }

  /** Minutos que lleva la orden esperando el aviso de Cereza (0 si no se sabe). */
  private minutosEsperandoCereza(order: any): number {
    const pedidos = order?.pedidos || [];
    const fechas = pedidos
      .map((p: any) => p?.fechaYHorarioDespachado || p?.date_edit)
      .filter(Boolean)
      .map((f: any) => new Date(f).getTime())
      .filter((t: number) => !isNaN(t));

    if (fechas.length === 0) { return 0; }
    return Math.max(0, Math.floor((Date.now() - Math.max(...fechas)) / 60000));
  }

  /**
   * Explicación completa, para el tooltip. La columna del estado mide 100px,
   * así que en pantalla solo cabe "Sin confirmar": el detalle va acá.
   */
  detalleEsperaCereza(order: any): string {
    const min = this.minutosEsperandoCereza(order);

    let desde = 'Guía Cereza todavía no confirma el despacho';
    if (min === 1)      { desde += ' (hace 1 minuto)'; }
    else if (min < 60)  { desde += ` (hace ${min} minutos)`; }
    else if (min > 0)   { desde += ` (hace ${Math.floor(min / 60)} horas)`; }

    return this.esperaCerezaDemorada(order)
      ? `${desde}. Se está demorando más de lo normal: puedes cancelar el envío y volver a despacharlo.`
      : `${desde}. Ya recibió la orden; el estado pasa a Despachado cuando ella avise, normalmente en un par de minutos.`;
  }

  /** ¿La espera ya se pasó de lo razonable y conviene revisarla? */
  esperaCerezaDemorada(order: any): boolean {
    return this.minutosEsperandoCereza(order) >= this.ESPERA_CEREZA_LIMITE_MIN;
  }

  /** Id del envío en Cereza que tenga el pedido (si sigue vinculado). */
  private getOsmosisOrderId(pedido: any): number | string | null {
    const integ = pedido?.integrations?.osmosis || pedido?.integraciones?.osmosis || {};
    return integ.osmosisOrderId || integ.orderId || integ.id || null;
  }

  /**
   * Cancela en Cereza el envío de la orden y deja los pedidos listos para
   * volver a despacharse con la transportadora correcta.
   */
  cancelarEnvioCereza(order: any): void {
    const pedidosConEnvio = (order?.pedidos || []).filter((p: any) => this.getOsmosisOrderId(p));

    if (pedidosConEnvio.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin envío activo',
        text: 'Esta orden no tiene envíos activos en Guía Cereza.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    Swal.fire({
      title: `Cancelar envío de la orden ${order.nroShippingOrder}`,
      html: `
        <div style="text-align:left">
          <p>Se le avisará a <b>Guía Cereza</b> que cancele
             ${pedidosConEnvio.length === 1 ? 'este envío' : `estos ${pedidosConEnvio.length} envíos`},
             y ${pedidosConEnvio.length === 1 ? 'el pedido volverá' : 'los pedidos volverán'}
             a <b>En Despacho</b> para poder despacharlos de nuevo.</p>
          <p style="margin-top:10px">Cuéntanos el motivo:</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Ej: salió con la transportadora equivocada',
      inputValidator: (valor) => (!valor || !valor.trim() ? 'Escribe el motivo para dejar registro' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar envío',
      cancelButtonText: 'No',
      confirmButtonColor: '#D64545',
    }).then((res) => {
      if (!res.isConfirmed) { return; }
      this.ejecutarCancelacionCereza(order, pedidosConEnvio, String(res.value).trim());
    });
  }

  private ejecutarCancelacionCereza(order: any, pedidos: any[], motivo: string): void {
    this.isDispatchingShipment = true;

    const llamadas = pedidos.map((p: any) =>
      this.integrationsService.cancelarEnvioCereza(p.cd || p._id || p.id, motivo).pipe(
        map((r: any) => ({ ok: true, nroPedido: p.nroPedido, r })),
        catchError((e: any) => of({
          ok: false,
          nroPedido: p.nroPedido,
          error: e?.error?.message || e?.message || 'no se pudo cancelar',
        })),
      ),
    );

    forkJoin(llamadas).subscribe({
      next: (resultados: any[]) => {
        this.isDispatchingShipment = false;

        const fallidos = resultados.filter((x) => !x.ok);
        if (fallidos.length > 0) {
          const detalle = fallidos
            .map((f) => `<li><b>${f.nroPedido}</b>: ${f.error}</li>`)
            .join('');
          Swal.fire({
            icon: resultados.length > fallidos.length ? 'warning' : 'error',
            title: 'Cancelación incompleta',
            html: `<div style="text-align:left"><p>No se pudo cancelar:</p><ul>${detalle}</ul>
                   <p style="margin-top:10px">Guía Cereza sigue teniendo esos envíos activos.</p></div>`,
            confirmButtonText: 'Entendido'
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Envío cancelado',
            text: 'Guía Cereza fue notificada. Ya puedes despachar de nuevo con la transportadora correcta.',
            timer: 2600,
            showConfirmButton: false
          });
        }

        this.loadInitialOrders();
      },
      error: (err) => {
        this.isDispatchingShipment = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al cancelar',
          text: err?.error?.message || err?.message || 'No se pudo cancelar el envío en Guía Cereza.',
          confirmButtonText: 'Entendido'
        });
      },
    });
  }

  /**
   * Abre la selección de transportadora de Guía Cereza y, al confirmar,
   * despacha con la elegida.
   */
  private elegirTransportadoraCereza(): void {
    const modalRef = this.dialogService.open(CerezaCarrierModalComponent, {
      data: { pedidos: this.selectedOrderForDispatch?.pedidos || [] },
      header: 'Elige la transportadora',
      width: '520px',
      modal: true,
      dismissableMask: false,
      closeOnEscape: true,
      styleClass: 'cereza-carrier-modal'
    });

    modalRef.onClose.subscribe((result: any) => {
      if (!result?.confirmed || !result?.carrierCode) {
        // Canceló: se reabre la selección de transportadora para no dejarlo
        // en un limbo sin saber qué pasó con el despacho.
        this.showTransporterModal = true;
        return;
      }
      this.cerezaCarrierCode = result.carrierCode;
      this.createShipmentDirectly();
    });
  }

  /**
   * Actualiza solo el nombre de la transportadora sin crear shipment (para órdenes ya despachadas)
   */
  private updateTransporterName(order: any, transporterName: string): void {
    this.isDispatchingShipment = true;

    // Primero obtener la orden completa para actualizarla
    this.logisticaService.getShippingOrder(order.nroShippingOrder).subscribe({
      next: (fullOrder) => {
        // Actualizar el transportador en la orden completa
        // NO guardamos el campo "estado" - se calcula dinámicamente en getEstadoProceso()
        const transportadorLimpio = normalizeTransportadorName(transporterName);
        const orderToUpdate = {
          ...fullOrder,
          transportador: transportadorLimpio,
          metadata: {
            ...(fullOrder.metadata || {}),
            especificacionTransportadora: {
              transportadora: transporterName,
              fecha: new Date().toISOString(),
              usuario: localStorage.getItem('user'),
              motivo: 'Especificación posterior al despacho'
            }
          }
        };

        // Eliminar campo estado si existe (no debe guardarse, se calcula dinámicamente)
        delete orderToUpdate.estado;

        // Actualizar cada pedido de la orden con el transportador
        const updatePedidosObservables: Observable<any>[] = [];

        if (orderToUpdate.pedidos && Array.isArray(orderToUpdate.pedidos)) {
          orderToUpdate.pedidos.forEach((pedido: any) => {
            pedido.transportador = transportadorLimpio;
            // NO modificar pedido.estadoProceso - ya está en Despachado o Entregado

            // Crear observable para la actualización de este pedido
            const updateObs = new Observable<void>((observer) => {
              this.ventasService.editOrder(pedido).subscribe({
                next: () => {
                  console.log(`✅ Pedido ${pedido.nroPedido} actualizado con transportadora ${transporterName}`);
                  observer.next(void 0);
                  observer.complete();
                },
                error: (error) => {
                  console.error(`❌ Error actualizando pedido ${pedido.nroPedido}:`, error);
                  observer.error(error);
                }
              });
            });

            updatePedidosObservables.push(updateObs);
          });
        }

        // Función para ejecutar después de actualizar pedidos
        const finalizarActualizacion = () => {
          // Actualizar la orden de envío completa usando createShippingOrder (sirve para crear y editar)
          this.logisticaService.createShippingOrder(orderToUpdate).subscribe({
            next: (response) => {
              this.isDispatchingShipment = false;

              // Actualizar localmente
              order.transportador = transportadorLimpio;

              Swal.fire({
                icon: 'success',
                title: 'Transportadora Especificada',
                text: `Se ha registrado "${this.formatTransporterName(transporterName)}" como la transportadora de esta orden.`,
                timer: 2000,
                showConfirmButton: false
              });

              // Reload orders DESPUÉS de que todas las actualizaciones se completen
              this.loadInitialOrders();
              this.closeTransporterModal();
            },
            error: (error) => {
              console.error('❌ Error actualizando orden de envío:', error);
              this.isDispatchingShipment = false;

              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo especificar la transportadora. Por favor intenta nuevamente.',
                confirmButtonText: 'Entendido'
              });
            }
          });
        };

        // ESPERAR a que todas las actualizaciones de pedidos se completen
        if (updatePedidosObservables.length > 0) {
          console.log(`⏳ Esperando a que ${updatePedidosObservables.length} pedidos se actualicen...`);
          forkJoin(updatePedidosObservables).subscribe({
            next: () => {
              console.log('✅ Todos los pedidos actualizados, finalizando...');
              finalizarActualizacion();
            },
            error: (error) => {
              console.error('❌ Error actualizando uno o más pedidos, finalizando de todos modos...', error);
              // Finalizar de todos modos para no dejar el proceso colgado
              finalizarActualizacion();
            }
          });
        } else {
          // No hay pedidos para actualizar, finalizar directamente
          console.log('ℹ️ No hay pedidos para actualizar, finalizando...');
          finalizarActualizacion();
        }
      },
      error: (error) => {
        console.error('❌ Error obteniendo orden completa:', error);
        this.isDispatchingShipment = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener la información de la orden. Por favor intenta nuevamente.',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  openEnviameRatesModal(): void {
    const modalRef = this.dialogService.open(EnviameRatesModalComponent, {
      data: {
        order: this.selectedOrderForDispatch,
        companyId: this.getCompanyId()
      },
      header: 'Cotizar Envío - Enviame.io',
      width: '800px',
      height: 'auto',
      modal: true,
      dismissableMask: false,
      closeOnEscape: false,
      styleClass: 'enviame-rates-compact-modal'
    });

    modalRef.onClose.subscribe((result) => {
      if (result && result.confirmed) {
        console.log('✅ Envío creado exitosamente con Enviame.io:', result);

        // Actualizar el transportador en la orden
        this.selectedOrderForDispatch.transportador = normalizeTransportadorName(this.selectedTransporter);

        // Actualizar los pedidos a estado "Despachado"
        const pedidosSinDespachar = this.selectedOrderForDispatch.pedidos.filter((pedido: any) =>
          pedido.estadoProceso !== EstadoProceso.Despachado &&
          pedido.estadoProceso !== EstadoProceso.Entregado
        );

        if (pedidosSinDespachar.length > 0) {
          console.log(`🚚 Asignando transportador "enviame" y marcando ${pedidosSinDespachar.length} pedidos como despachados`);

          // ESPERAR a que todas las actualizaciones se completen antes de recargar
          this.updatePedidosToDispached(pedidosSinDespachar, this.selectedOrderForDispatch).subscribe({
            next: () => {
              // Emit dispatch event to parent component
              this.onDispatchOrder.emit(this.selectedOrderForDispatch);

              // Reload orders DESPUÉS de que todas las actualizaciones se completen
              this.loadInitialOrders();
              this.closeTransporterModal();

              console.log('📦 Procesamiento de envío Enviame completado');
            },
            error: (error) => {
              console.error('❌ Error actualizando pedidos de Enviame:', error);

              // Aún así recargar para reflejar el estado actual
              this.loadInitialOrders();
              this.closeTransporterModal();
            }
          });
        } else {
          // No hay pedidos para actualizar
          // Emit dispatch event to parent component
          this.onDispatchOrder.emit(this.selectedOrderForDispatch);

          // Reload orders
          this.loadInitialOrders();
          this.closeTransporterModal();

          console.log('📦 Procesamiento de envío Enviame completado (sin pedidos para actualizar)');
        }
      } else {
        console.log('❌ Usuario canceló la cotización de Enviame');
      }
    });
  }

  createShipmentDirectly(): void {
    const order = this.selectedOrderForDispatch;
    const usuario = localStorage.getItem('user');

    const shipmentPayload = {
      companyId: order?.companyId || order?.company || '',
      provider: this.selectedTransporter,
      // El backend guarda transportador, fecha y despachador en la misma
      // escritura con la que marca el pedido como despachado. Así no depende
      // de una segunda llamada que puede chocar con el lock optimista.
      transportador: normalizeTransportadorName(this.selectedTransporter),
      despachador: usuario ? JSON.parse(usuario) : null,
      order: {
        nroShippingOrder: order?.nroShippingOrder,
        fecha: order?.fecha,
        pedidos: order?.pedidos
      },
      options: {
        normalizeResponse: false,
        // Solo aplica a Guía Cereza; los demás proveedores lo ignoran. Si no
        // viene, el backend usa la transportadora configurada para la empresa.
        ...(this.cerezaCarrierCode ? { carrierCode: this.cerezaCarrierCode } : {}),
      },
    };

    this.isDispatchingShipment = true;
    this.logisticaService.createShipment(shipmentPayload).subscribe({
      next: (resp: any) => {
        // El backend responde 200 con un resumen por pedido. Antes se marcaba
        // todo como despachado sin mirarlo: cuando la transportadora rechazaba
        // el envío, el pedido quedaba "Despachado" en Katuq, con correo al
        // cliente, y sin guía real (caso ORE-000567, 18-ago). Si algún pedido
        // falló no se avanza: se muestra el motivo y se deja la orden como está.
        const fallidos = (resp?.results || []).filter((r: any) => r && !r.success);
        if (resp?.success === false || resp?.summary?.failed > 0 || fallidos.length) {
          this.isDispatchingShipment = false;
          Swal.fire({
            icon: 'error',
            title: 'El despacho no se completó',
            html: this.detalleErrorDespacho(resp),
            confirmButtonText: 'Entendido'
          });
          this.loadInitialOrders();
          return;
        }

        // Actualizar el transportador en la orden
        order.transportador = normalizeTransportadorName(this.selectedTransporter);

        // Actualizar los pedidos a estado "Despachado"
        const pedidosSinDespachar = order.pedidos.filter((pedido: any) =>
          pedido.estadoProceso !== EstadoProceso.Despachado &&
          pedido.estadoProceso !== EstadoProceso.Entregado
        );

        if (pedidosSinDespachar.length > 0) {
          console.log(`🚚 Asignando transportador "${this.selectedTransporter}" y marcando ${pedidosSinDespachar.length} pedidos como despachados`);

          // ESPERAR a que todas las actualizaciones se completen antes de recargar
          this.updatePedidosToDispached(pedidosSinDespachar, order).subscribe({
            next: () => {
              // Todas las actualizaciones completadas, ahora recargar
              this.isDispatchingShipment = false;

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

              // Reload orders DESPUÉS de que todas las actualizaciones se completen
              this.loadInitialOrders();

              this.closeTransporterModal();
            },
            error: (updateError) => {
              console.error('Error actualizando pedidos:', updateError);
              this.isDispatchingShipment = false;

              // Aún así mostrar mensaje de éxito parcial
              Swal.fire({
                icon: 'warning',
                title: 'Despacho Parcial',
                text: 'La orden fue despachada pero algunos pedidos no se actualizaron correctamente.',
                confirmButtonText: 'Entendido'
              });

              // Recargar de todos modos para reflejar el estado actual
              this.loadInitialOrders();
              this.closeTransporterModal();
            }
          });
        } else {
          // No hay pedidos para actualizar
          this.isDispatchingShipment = false;

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

          // Reload orders
          this.loadInitialOrders();

          this.closeTransporterModal();
        }
      },
      error: (error) => {
        console.error('Error creando envío con transportadora:', error);
        this.isDispatchingShipment = false;

        Swal.fire({
          icon: 'error',
          title: 'Error en Despacho',
          html: this.detalleErrorDespacho(error?.error ?? error),
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  /**
   * Arma el detalle que ve el operador cuando un despacho falla. El backend
   * manda el motivo real por pedido (`results[].error`) y ya resumido en
   * `error`; antes se descartaba y solo se mostraba "hubo un problema".
   */
  private detalleErrorDespacho(payload: any): string {
    const escapar = (t: any) => String(t ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const fallidos = (payload?.results || []).filter((r: any) => r && !r.success);
    if (fallidos.length) {
      const filas = fallidos
        .map((r: any) => `<li><b>${escapar(r.nroPedido || 'Pedido')}</b>: ${escapar(r.error)}</li>`)
        .join('');
      const ok = payload?.summary?.ok || 0;
      const encabezado = ok > 0
        ? `<p>${ok} pedido(s) se despacharon y ${fallidos.length} no:</p>`
        : '<p>Ningún pedido se pudo despachar:</p>';
      return `${encabezado}<ul style="text-align:left;margin:0;padding-left:1.2rem">${filas}</ul>`;
    }

    const mensaje = payload?.error
      || payload?.details
      || payload?.message
      || 'Hubo un problema al despachar la orden. Por favor intenta nuevamente.';
    return escapar(mensaje);
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
   * @returns Observable que se completa cuando TODAS las actualizaciones terminan
   */
  private updatePedidosToDispached(pedidos: any[], order: any): Observable<void> {
    const user = localStorage.getItem('user');
    const userLite = user ? JSON.parse(user) : null;

    // Array para almacenar los observables de actualización
    const updateObservables: Observable<any>[] = [];

    pedidos.forEach((pedido: any) => {
      // Guardar estado anterior ANTES de modificar
      const estadoOriginal = pedido.estadoProceso;

      // Validar que el estado actual permita transición a Despachado
      const estadosFinales = [
        EstadoProceso.Entregado,
        EstadoProceso.Rechazado,
        EstadoProceso.Cerrado
      ];

      if (estadosFinales.includes(pedido.estadoProceso)) {
        console.warn(
          `⚠️ Pedido ${pedido.nroPedido || pedido.referencia} ya está en estado final ` +
          `(${pedido.estadoProceso}), se omite actualización a Despachado`
        );
        return; // No actualizar pedidos en estados finales
      }

      // Actualizar el estado del pedido localmente
      pedido.estadoProceso = EstadoProceso.Despachado;
      pedido.fechaYHorarioDespachado = new Date().toISOString();
      pedido.despachador = userLite;
      pedido.nroShippingOrder = order.nroShippingOrder;
      pedido.transportador = order.transportador;

      // Crear observable para esta actualización
      const updateObs = new Observable<void>((observer) => {
        this.ventasService.editOrder(pedido).subscribe({
          next: (response) => {
            console.log(`✅ Pedido ${pedido.nroPedido || pedido.referencia} actualizado a "Despachado"`);
            observer.next(void 0);
            observer.complete();
          },
          error: (error) => {
            // Conflicto de versión: NO es una falla. Al crear el envío, el
            // servidor ya dejó el pedido despachado con su guía, transportador
            // y fecha; la copia que tiene la pantalla quedó vieja y el lock
            // optimista la rechaza. Antes esto disparaba el aviso engañoso de
            // "Despacho Parcial" sobre pedidos que habían salido bien.
            if (error?.isStaleWrite) {
              console.info(
                `ℹ️ Pedido ${pedido.nroPedido || pedido.referencia}: el despacho ya lo actualizó en el servidor`
              );
              observer.next(void 0);
              observer.complete();
              return;
            }

            console.error(`❌ Error actualizando pedido ${pedido.nroPedido || pedido.referencia}:`, error);
            // Revertir usando el estado original guardado
            pedido.estadoProceso = estadoOriginal;
            observer.error(error);
          }
        });
      });

      updateObservables.push(updateObs);
    });

    // Si no hay pedidos para actualizar, retornar observable completado
    if (updateObservables.length === 0) {
      console.log('ℹ️ No hay pedidos para actualizar a Despachado');
      return of(void 0);
    }

    // Usar forkJoin para esperar a que TODAS las actualizaciones se completen
    return new Observable((observer) => {
      forkJoin(updateObservables).subscribe({
        next: () => {
          console.log(`✅ Todos los ${updateObservables.length} pedidos actualizados exitosamente`);
          observer.next(void 0);
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error en una o más actualizaciones de pedidos:', error);
          observer.error(error);
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

  // ========== MÉTODOS PARA CAMBIO DE MÉTODO DE ENVÍO ==========

  /**
   * Verifica si una orden puede cambiar de mensajero propio a transportadora
   */
  canChangeToTransporter(order: any): boolean {
    if (!order) return false;

    // Verificar que el método actual sea mensajero propio
    const esMensajeroPropio = !this.isTransportadoraOrder(order);

    // Verificar el estado de la orden - CORRECCIÓN: Aceptar múltiples estados despachables
    const estado = this.getEstadoProceso(order);
    const estadosDespachables = [
      'Por despachar',      // Valor legacy (por compatibilidad)
      'Para Despachar',     // Valor nuevo del método corregido
      'Empacado',           // Estado válido para cambio
      'En Despacho',        // Estado válido para cambio
      'Producido',          // Estado válido para cambio
      'En Producción'       // Estado válido para cambio
    ];
    const estadoPermitido = estadosDespachables.includes(estado);

    // Verificar que no tenga transportador asignado
    const noTieneTransportador = !order.transportador ||
                                  order.transportador === '' ||
                                  order.transportador === 'N/A' ||
                                  order.transportador === 'mensajero_propio' ||
                                  order.transportador === 'Mensajero Propio';

    return esMensajeroPropio && estadoPermitido && noTieneTransportador;
  }

  /**
   * Verifica si una orden puede cambiar de transportadora a mensajero propio
   */
  canChangeToOwnMessenger(order: any): boolean {
    if (!order) return false;

    // Verificar que el método actual sea transportadora
    const esTransportadora = this.isTransportadoraOrder(order);

    // Verificar el estado de la orden - CORRECCIÓN: Aceptar múltiples estados despachables
    const estado = this.getEstadoProceso(order);
    const estadosDespachables = [
      'Por despachar',      // Valor legacy (por compatibilidad)
      'Para Despachar',     // Valor nuevo del método corregido
      'Empacado',           // Estado válido para cambio
      'En Despacho',        // Estado válido para cambio
      'Producido',          // Estado válido para cambio
      'En Producción'       // Estado válido para cambio
    ];
    const estadoPermitido = estadosDespachables.includes(estado);

    // Verificar que NO esté despachada (no se puede cambiar después de despachar)
    const noEstaDespachada = estado !== 'Despachado' && estado !== 'Entregado';

    return esTransportadora && estadoPermitido && noEstaDespachada;
  }

  /**
   * Cambia el método de envío de mensajero propio a transportadora
   */
  changeToTransporter(order: any): void {
    if (!this.canChangeToTransporter(order)) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede cambiar',
        text: 'Esta orden no puede cambiar a transportadora en su estado actual.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Contar pedidos en la orden
    const totalPedidos = order.pedidos?.length || 0;

    Swal.fire({
      title: 'Cambiar a Transportadora',
      html: `
        <div class="text-start">
          <p>¿Desea cambiar la orden <strong>${order.nroShippingOrder}</strong> a transportadora externa?</p>
          <div class="alert alert-info mt-3">
            <i class="pi pi-info-circle me-2"></i>
            <strong>Orden actual:</strong>
            <ul class="mb-0 mt-2">
              <li>Método: Mensajero Propio</li>
              <li>Pedidos: ${totalPedidos}</li>
              <li>Estado: ${this.getEstadoProceso(order)}</li>
            </ul>
          </div>
          <div class="alert alert-success mt-2">
            <i class="pi pi-check-circle me-2"></i>
            Al confirmar, podrá seleccionar una transportadora integrada (Enviame, DHL, etc.)
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar a transportadora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd'
    }).then((result) => {
      if (result.isConfirmed) {
        // Obtener la orden completa primero
        this.logisticaService.getShippingOrder(order.nroShippingOrder).subscribe({
          next: (fullOrder) => {
            // Actualizar el campo metodoEnvio en la orden completa
            // NO guardamos el campo "estado" - se calcula dinámicamente en getEstadoProceso()
            const orderToUpdate = {
              ...fullOrder,
              metodoEnvio: 'transportadora',
              metadata: {
                ...(fullOrder.metadata || {}),
                cambioMetodo: {
                  anterior: 'mensajeroPropio',
                  nuevo: 'transportadora',
                  fecha: new Date().toISOString(),
                  usuario: localStorage.getItem('user')
                }
              }
            };

            // Eliminar campo estado si existe (no debe guardarse, se calcula dinámicamente)
            delete orderToUpdate.estado;

            // Preservar estado de cada pedido
            if (orderToUpdate.pedidos && Array.isArray(orderToUpdate.pedidos)) {
              orderToUpdate.pedidos.forEach((pedido: any) => {
                // NO modificar pedido.estadoProceso aquí
                // Solo cambiará cuando se despache con la transportadora
              });
            }

            // Actualizar en el backend usando createShippingOrder (sirve para crear y editar)
            this.logisticaService.createShippingOrder(orderToUpdate).subscribe({
              next: (response) => {
                console.log('✅ Método de envío actualizado:', response);

                // Actualizar localmente
                order.metodoEnvio = 'transportadora';

                // Abrir modal de selección de transportadora
                this.selectedOrderForDispatch = order;
                this.selectedTransporter = '';
                this.showTransporterModal = true;

                Swal.fire({
                  icon: 'success',
                  title: 'Método Actualizado',
                  text: 'Ahora puede seleccionar la transportadora para esta orden.',
                  timer: 2000,
                  showConfirmButton: false
                });
              },
              error: (error) => {
                console.error('❌ Error actualizando método de envío:', error);

                // Revertir cambio local
                order.metodoEnvio = 'mensajeroPropio';

                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'No se pudo actualizar el método de envío. Por favor intenta nuevamente.',
                  confirmButtonText: 'Entendido'
                });
              }
            });
          },
          error: (error) => {
            console.error('❌ Error obteniendo orden completa:', error);

            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo obtener la información de la orden. Por favor intenta nuevamente.',
              confirmButtonText: 'Entendido'
            });
          }
        });
      }
    });
  }

  /**
   * Obtiene el label del método de envío para mostrar
   */
  getShippingMethodLabel(order: any): string {
    if (this.isTransportadoraOrder(order)) {
      // Si es transportadora, SIEMPRE mostrar cuál transportadora específica
      if (order.transportador &&
          order.transportador !== '' &&
          order.transportador !== 'N/A' &&
          order.transportador !== 'mensajero_propio' &&
          order.transportador !== 'Mensajero Propio') {
        // Capitalizar y formatear nombre de transportadora
        return this.formatTransporterName(order.transportador);
      }

      // Si no tiene transportadora asignada, verificar el estado
      const estado = this.getEstadoProceso(order);
      if (estado === 'Despachado' || estado === 'Entregado') {
        // Ya está despachada pero sin nombre registrado (datos legacy o error)
        return 'Transportadora (Sin especificar)';
      }

      // Si aún no está despachada
      return 'Transportadora (Pendiente asignar)';
    }

    // Si es mensajero propio, mostrar el nombre del mensajero específico si existe
    if (order.transportador &&
        order.transportador !== '' &&
        order.transportador !== 'N/A' &&
        order.transportador !== 'mensajero_propio' &&
        order.transportador !== 'Mensajero Propio') {
      return order.transportador; // Nombre específico del mensajero
    }

    return 'Mensajero Propio'; // Fallback si no hay nombre específico
  }

  /**
   * Formatea el nombre de la transportadora para mejor visualización
   */
  private formatTransporterName(name: string): string {
    if (!name) return 'Transportadora';

    // Mapeo de nombres conocidos de transportadoras
    const knownTransporters: { [key: string]: string } = {
      'enviame': 'Enviame.io',
      'dhl': 'DHL Express',
      'fedex': 'FedEx',
      'servientrega': 'Servientrega',
      'coordinadora': 'Coordinadora',
      'interrapidisimo': 'Interrapidísimo',
      'tcc': 'TCC',
      'deprisa': 'Deprisa',
      'osmosis': 'Guía Cereza',
      'prindel': 'Prindel',
      'partners_logistics': 'Partners Logística',
      'aliaddo_fulfillment': 'Aliaddo'
    };

    // Verificar si es un nombre conocido (case-insensitive)
    const lowerName = name.toLowerCase().trim();
    if (knownTransporters[lowerName]) {
      return knownTransporters[lowerName];
    }

    // Si no es conocido, retornar el nombre tal cual (puede ser nombre de mensajero)
    return name;
  }

  /**
   * Obtiene la clase CSS para el badge del método de envío
   */
  getShippingMethodBadgeClass(order: any): string {
    if (this.isTransportadoraOrder(order)) {
      // Si es transportadora pero no tiene asignada todavía
      if (!order.transportador ||
          order.transportador === '' ||
          order.transportador === 'N/A' ||
          order.transportador === 'mensajero_propio' ||
          order.transportador === 'Mensajero Propio') {
        return 'bg-warning text-dark'; // Advertencia: falta asignar
      }
      return 'bg-primary'; // Transportadora asignada
    }
    return 'bg-info'; // Mensajero propio
  }

  /**
   * Obtiene el ícono para el método de envío
   */
  getShippingMethodIcon(order: any): string {
    if (this.isTransportadoraOrder(order)) {
      return 'pi-truck';
    }
    return 'pi-user';
  }

  /**
   * Cambia el método de envío de transportadora a mensajero propio
   */
  changeToOwnMessenger(order: any): void {
    if (!this.canChangeToOwnMessenger(order)) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede cambiar',
        text: 'Esta orden no puede cambiar a mensajero propio en su estado actual.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Contar pedidos en la orden
    const totalPedidos = order.pedidos?.length || 0;
    const transportadorActual = this.getShippingMethodLabel(order);

    Swal.fire({
      title: 'Cambiar a Mensajero Propio',
      html: `
        <div class="text-start">
          <p>¿Desea cambiar la orden <strong>${order.nroShippingOrder}</strong> a mensajero propio?</p>
          <div class="alert alert-info mt-3">
            <i class="pi pi-info-circle me-2"></i>
            <strong>Orden actual:</strong>
            <ul class="mb-0 mt-2">
              <li>Método: ${transportadorActual}</li>
              <li>Pedidos: ${totalPedidos}</li>
              <li>Estado: ${this.getEstadoProceso(order)}</li>
            </ul>
          </div>
          <div class="alert alert-warning mt-2">
            <i class="pi pi-exclamation-triangle me-2"></i>
            Al confirmar, la orden se gestionará con mensajero propio de la empresa.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar a mensajero propio',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd'
    }).then((result) => {
      if (result.isConfirmed) {
        // Obtener la orden completa primero
        this.logisticaService.getShippingOrder(order.nroShippingOrder).subscribe({
          next: (fullOrder) => {
            // Actualizar el campo metodoEnvio en la orden completa
            // NO guardamos el campo "estado" - se calcula dinámicamente en getEstadoProceso()
            const orderToUpdate = {
              ...fullOrder,
              metodoEnvio: 'mensajeroPropio',
              transportador: 'mensajero_propio', // Limpiar transportadora asignada
              metadata: {
                ...(fullOrder.metadata || {}),
                cambioMetodo: {
                  anterior: 'transportadora',
                  nuevo: 'mensajeroPropio',
                  transportadorAnterior: order.transportador || 'N/A',
                  fecha: new Date().toISOString(),
                  usuario: localStorage.getItem('user')
                }
              }
            };

            // Eliminar campo estado si existe (no debe guardarse, se calcula dinámicamente)
            delete orderToUpdate.estado;

            // Actualizar también cada pedido para preservar su estado
            if (orderToUpdate.pedidos && Array.isArray(orderToUpdate.pedidos)) {
              orderToUpdate.pedidos.forEach((pedido: any) => {
                // Solo actualizar el transportador, NO el estado del pedido
                pedido.transportador = 'mensajero_propio';
                // NO modificar pedido.estadoProceso aquí
              });
            }

            // Actualizar en el backend usando createShippingOrder (sirve para crear y editar)
            this.logisticaService.createShippingOrder(orderToUpdate).subscribe({
              next: (response) => {
                console.log('✅ Método de envío actualizado a mensajero propio:', response);

                // Actualizar localmente
                order.metodoEnvio = 'mensajeroPropio';
                order.transportador = 'mensajero_propio';

                Swal.fire({
                  icon: 'success',
                  title: 'Método Actualizado',
                  text: 'La orden ahora se gestionará con mensajero propio.',
                  timer: 2000,
                  showConfirmButton: false
                });

                // Recargar órdenes para reflejar cambios
                this.loadInitialOrders();
              },
              error: (error) => {
                console.error('❌ Error actualizando método de envío:', error);

                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'No se pudo actualizar el método de envío. Por favor intenta nuevamente.',
                  confirmButtonText: 'Entendido'
                });
              }
            });
          },
          error: (error) => {
            console.error('❌ Error obteniendo orden completa:', error);

            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo obtener la información de la orden. Por favor intenta nuevamente.',
              confirmButtonText: 'Entendido'
            });
          }
        });
      }
    });
  }

  /**
   * Verifica si una orden despachada necesita especificar la transportadora
   */
  needsTransporterSpecification(order: any): boolean {
    if (!order) return false;

    // Solo para órdenes con método transportadora
    if (!this.isTransportadoraOrder(order)) return false;

    // Verificar que esté despachada o entregada
    const estado = this.getEstadoProceso(order);
    const estaDespachada = estado === 'Despachado' || estado === 'Entregado';

    // Verificar que NO tenga transportadora asignada
    const noTieneTransportador = !order.transportador ||
                                  order.transportador === '' ||
                                  order.transportador === 'N/A' ||
                                  order.transportador === 'mensajero_propio' ||
                                  order.transportador === 'Mensajero Propio';

    return estaDespachada && noTieneTransportador;
  }

  /**
   * Permite especificar la transportadora para órdenes ya despachadas sin transportadora registrada
   */
  specifyTransporter(order: any): void {
    if (!this.needsTransporterSpecification(order)) {
      return;
    }

    Swal.fire({
      title: 'Especificar Transportadora',
      html: `
        <div class="text-start">
          <p>La orden <strong>${order.nroShippingOrder}</strong> fue despachada con transportadora, pero no se registró cuál.</p>
          <div class="alert alert-info mt-3">
            <i class="pi pi-info-circle me-2"></i>
            <strong>Estado actual:</strong>
            <ul class="mb-0 mt-2">
              <li>Método: Transportadora</li>
              <li>Transportadora: Sin especificar</li>
              <li>Estado: ${this.getEstadoProceso(order)}</li>
            </ul>
          </div>
          <div class="alert alert-warning mt-2">
            <i class="pi pi-exclamation-triangle me-2"></i>
            Por favor especifique qué transportadora realizó el envío para completar los registros.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Seleccionar Transportadora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd'
    }).then((result) => {
      if (result.isConfirmed) {
        // Abrir modal de selección de transportadora
        this.selectedOrderForDispatch = order;
        this.selectedTransporter = '';
        this.showTransporterModal = true;

        // Mensaje informativo
        Swal.fire({
          icon: 'info',
          title: 'Seleccione la Transportadora',
          text: 'Elija la transportadora que realizó el envío de esta orden.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  }
}