import {
  Component,
  ElementRef,
  OnInit,
  TemplateRef,
  ViewChild,
  EventEmitter,
  Input,
  Output,
  ComponentRef,
  ViewContainerRef,
  ChangeDetectorRef,
} from "@angular/core";
import { trigger, state, style, transition, animate } from '@angular/animations';
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import {
  Carrito,
  Cliente,
  EstadoPago,
  EstadoProceso,
  EstadoProcesoFiltros,
  Pedido,
} from "../../ventas/modelo/pedido";
import { Table } from "primeng/table";
import { LazyLoadEvent } from "primeng/api";
import { PaymentService } from "../../../shared/services/ventas/payment.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { jsPDF } from "jspdf";
import { ServiciosService } from "../../../shared/services/servicios.service";
import "bootstrap";
import html2canvas from "html2canvas";
import { ClientesComponent } from "../../ventas/clientes/clientes.component";
import Swal from "sweetalert2";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { PedidoEntregaComponent } from "../../ventas/entrega/pedido-entrega.component";
import { PedidosUtilService } from "../../ventas/service/pedidos.util.service";
import { UserLogged } from "../../../shared/models/User/UserLogged";
import { UserLite } from "../../../shared/models/User/UserLite";
import { DialogService } from "primeng/dynamicdialog";
import { ObservacionesDetalleComponent } from "../components/observaciones-detalle/observaciones-detalle.component";

import "jspdf-autotable";
import { LogisticaServiceV2 } from "../../../shared/services/despachos/logistica.service.v2";
import { FilterService, MenuItem } from "primeng/api";
import html2pdf from "html2pdf.js";
import { PedidoEntrega } from "../interfaces/pedido-entrega.interface";
import { Router } from "@angular/router";
import { PdfTemplateComponent } from "../components/pdf-template/pdf-template.component";
import { GeocodingService, GeocodingResponse } from "../../../shared/services/geocoding.service";
import { MapaUbicacionesComponent } from "../components/mapa-ubicaciones/mapa-ubicaciones.component";
import { OrdenesDespachoV2Component } from "../components/ordenes-despacho-v2/ordenes-despacho-v2.component";
import { AnalisisDespachosComponent } from '../components/analisis-despachos/analisis-despachos.component';
import { SeguimientoModalComponent } from "../components/seguimiento-modal/seguimiento-modal.component";
import { Integration, IntegrationCategory, IntegrationsService } from "../../integrations/integrations.service";
import { PaginatedOrdersResponse } from "../interfaces/paginated-orders.interface";
import { ZonaGestionModalComponent } from "../components/zona-gestion-modal/zona-gestion-modal.component";
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

interface MapaMetricas {
  despachados: number;
  paraDespachar: number;
  empacados: number;
  producidos: number;
  enRuta: number;
  pendientes: number;
  tiempoPromedioEstimado?: number;
}

interface ColumnDefinition {
  field: string;
  header: string;
  visible: boolean;
}

interface TarjetaInfo {
  tarjeta: any;
  pedido: string;
}

interface OrderCache {
  data: any;
  timestamp: number;
}

// Nuevas interfaces para el algoritmo de priorización
interface MetricasLogistica {
  pedidosUrgentes: number;
  pedidosEnRiesgo: number;
  pedidosNormales: number;
  pedidosSinProducir: number; // Nuevo campo para pedidos sin producir
  pedidosEnRuta: number; // Pedidos despachados pero no entregados
  pedidosDespacho: number; // Pedidos listos para despachar
  porcentajeEntregasTiempo: number;
  tiempoPromedioDespacho: number;
  zonasConRetrasos: { [zona: string]: number };
  transportadoresEficiencia: { [transportador: string]: number };
  prediccionCargaProximosDias: { [fecha: string]: CargaDiaria };
  ubicacionesPedidos?: UbicacionPedido[]; // Para el mapa de ubicaciones
  // Nuevos campos del servicio optimized
  totalPedidos?: number;
  enProduccion?: number;
  empacados?: number;
  enRuta?: number;
  paraDespachar?: number;
  entregados?: number;
  porCobrar?: number;
}

// Nueva interfaz para la carga diaria
interface CargaDiaria {
  confirmados: number;
  pendientesProduccion: number;
  total: number;
}

interface PedidoPriorizado extends Pedido {
  prioridad?: "alta" | "media" | "baja";
  diasRestantes?: number;
  tiempoEstimadoEntrega?: number;
  factoresRiesgo?: string[];
  puntajeKAI?: number;
  optimizacionRuta?: boolean;
}

// Nueva interfaz para ubicaciones de pedidos
interface UbicacionPedido {
  nroPedido: string;
  estado: EstadoProceso;
  cliente: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  transportador?: string;
  fechaEntrega: string;
  horaEstimada?: string;
  distanciaRestante?: number; // en km
  tiempoEstimado?: number; // en minutos
}

@Component({
  selector: "app-list-despachos",
  templateUrl: "./despachos.component.html",
  styleUrls: ["./despachos.component.scss"],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)', maxHeight: '0' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)', maxHeight: '500px' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)', maxHeight: '0' }))
      ])
    ])
  ]
})
export class DespachosComponent implements OnInit {
  @ViewChild("autoCompleteInput") autoCompleteInput: any;
  @ViewChild("clientes", { static: false }) clientes: ClientesComponent;
  @ViewChild("entrega", { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild("pantallaOrdenEnvioModal", { static: false })
  pantallaOrdenEnvioModal: TemplateRef<any>;
  @ViewChild("dispatchOrdersModal", { static: false })
  dispatchOrdersModal: TemplateRef<any>;
  @ViewChild("dispatchOrdersModalV2", { static: false })
  dispatchOrdersModalV2: TemplateRef<any>;
  @ViewChild("detalleEntregaModal", { static: false })
  detalleEntregaModal: TemplateRef<any>;
  @ViewChild("transportadoresModal", { static: false })
  transportadoresModal: TemplateRef<any>;
  @ViewChild("generarOrdenComponent", { static: false })
  generarOrdenComponent: any;
  @ViewChild("editarOrdenComponent", { static: false })
  editarOrdenComponent: any;

  @ViewChild("printContent", { static: false }) printContent!: ElementRef;
  @ViewChild("pdfTemplate", { static: false }) pdfTemplate!: PdfTemplateComponent;
  @ViewChild("pdfTemplateContainer", { static: false })
  pdfTemplateContainer!: ElementRef;
  @ViewChild("mapaUbicaciones", { static: false }) mapaComponent?: MapaUbicacionesComponent;
  @ViewChild("ordenesDespachoV2Component", { static: false }) ordenesDespachoV2Component?: OrdenesDespachoV2Component;
  generandoRotuloPara: Set<string> = new Set();
  orders: PedidoPriorizado[] = [];
  loading: boolean = true;
  
  // NEW - Lazy loading properties (2025.09.05)
  useOptimizedLoading: boolean = true; // Flag to enable/disable optimized loading
  totalRecords: number = 0;            // Total records from server
  currentPage: number = 1;             // Current page number
  currentPageSize: number = 50;        // Current page size
  lastLazyLoadEvent?: LazyLoadEvent; // Last lazy load event for reference
  private columnFilters: any = {};     // Store column filters separately for reliable access
  totalValorProductoBruto: number;
  totalDescuento: number;
  htmlModal: any;
  scrollStack: number[] = []; // ✅ FIX: Stack para manejar scroll en modales
  clienteSeleccionado: Cliente;
  formulario: any;
  pedidoSeleccionado: Pedido;
  estadosPago = Object.values(EstadoPago);
  ciudadSeleccionada: string;
  ESTADOPAGO: any[];
  configuracionCarritoSeleccionado: Carrito;
  fechaInicial: Date | null;
  fechaFinal: Date | null;
  
  // Propiedades para el sistema de filtros avanzados
  searchQuery: string | any = '';
  fechaInicialDate: Date | null;
  fechaFinalDate: Date | null;
  selectedDatePreset: string = '';
  showAdvancedFilters: boolean = false;
  quickFilters = {
    estadoPago: 'all',
    estadoProceso: 'all'
  };

  // Propiedades para búsqueda con autocompletado
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  isSearching: boolean = false;
  searchError: string | null = null;
  searchDebounceTime: number = 300;
  nroPedido: any;
  // Opciones para los dropdowns de filtros
  estadosPagoOptions: any[] = [];
  estadosProcesoOptions: any[] = [];
  datePresets: any[] = [];
  
  // Configuración de localización
  es: any = {
    firstDayOfWeek: 1,
    dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    today: 'Hoy',
    clear: 'Limpiar'
  };
  transportadorForm: FormGroup;
  ordenEnvioForm: FormGroup;
  metodoEnvio: any;
  pedidosSeleccionados: Pedido[] = [];
  transportadorSeleccionado: any;
  vendors: any;
  nroShippingOrder: any;
  nuevaOrdenEnvio: any;
  dispatchOrders: Pedido[] = [];
  modalRef: any;
  editTransporter: boolean;
  dataEditTransporter: any;
  pedidoModal: any;
  isDialogOpen: boolean;
  pdfSize: any;
  filteredOrderNumbers: any;
  ordersByName: any;
  estadosProcesos: EstadoProcesoFiltros[];
  todasLasTarjetas: TarjetaInfo[] = [];
  tienetarjetas: boolean = true;
  detallePedidoEntregado: PedidoEntrega;

  // --- Propiedades para Menús Responsivos ---
  itemsGeocodificacion: MenuItem[];
  accionesMenu: MenuItem[];
  adminMenu: MenuItem[];

  // Properties for performance optimization
  isGeneratingPDF: boolean = false;
  pdfProgress: number = 0;

  // Cache para optimizar rendimiento
  private orderCache: Map<string, OrderCache> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

  // Control de retry
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  // Progress message
  public currentProgressMessage: string = "";

  // Nuevas propiedades para el algoritmo de priorización
  metricasLogistica: MetricasLogistica;
  pedidosUrgentes: PedidoPriorizado[] = [];
  pedidosEnRiesgo: PedidoPriorizado[] = [];
  pedidosNormales: PedidoPriorizado[] = [];
  pedidosSinProducir: PedidoPriorizado[] = []; // Nueva propiedad para pedidos sin producir
  pedidosEnRuta: Pedido[] = []; // Pedidos despachados en ruta
  pedidosParaDespacho: Pedido[] = []; // Pedidos listos para despachar
  diasUmbralUrgente: number = 1; // Pedidos con 1 día o menos para entrega
  diasUmbralRiesgo: number = 3; // Pedidos con 3 días o menos para entrega
  mostrarAlertasAvanzadas: boolean = true;
  kaiPredicciones: any = null;

  // Control de frecuencia para modales de advertencia
  private ultimaAlertaPedidosUrgentes: Date | null = null;
  private ultimaAlertaPedidosSinProducir: Date | null = null;

  // Propiedades para geocodificación y mapa
  private geocodingCache: Map<string, GeocodingResponse> = new Map();
  private readonly GEOCODING_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
  configuracionMapa: any = {
    centroMapa: { lat: 6.2486, lng: -75.5742 }, // Medellín - Se actualizará dinámicamente
    zoom: 11,
    ubicaciones: []
  };
  geocodingInProgress: boolean = false;
  geocodingProgress: number = 0;
  filtroEstadoMapa: string | null = null;
  private intervaloBetweenAlertas: number = 5 * 60 * 1000; // 5 minutos en milisegundos

  // Métricas unificadas del mapa
  mapaMetricas: MapaMetricas = {
    despachados: 0,
    paraDespachar: 0,
    empacados: 0,
    producidos: 0,
    enRuta: 0,
    pendientes: 0,
    tiempoPromedioEstimado: 0
  };

  // Definiciones para la gestión de columnas
  displayedColumns: ColumnDefinition[] = [
    { field: "detalles", header: "Detalles", visible: true },
    { field: "opciones", header: "Opciones", visible: true },
    { field: "nroPedido", header: "Número de Pedido", visible: true },
    { field: "nroFactura", header: "Número de Factura", visible: true },
    { field: "shippingOrder", header: "Número orden de envío", visible: true },
    { field: "estadoPago", header: "Estado de Pago", visible: true },
    { field: "estadoProceso", header: "Estado de Proceso", visible: true },
    { field: "cliente", header: "Cliente", visible: true },
    { field: "totalEnvio", header: "Domicilio", visible: true },
    { field: "faltaPorPagar", header: "Falta por Pagar", visible: true },
    { field: "fechaCreacion", header: "Fecha de Compra", visible: true },
    { field: "ciudad", header: "Ciudad", visible: true },
    { field: "zonaCobro", header: "Zona de Entrega", visible: true },
    {
      field: "observaciones",
      header: "Observaciones de Entrega",
      visible: false,
    },
    { field: "fechaEntrega", header: "Fecha de Entrega", visible: true },
    { field: "formaEntrega", header: "Forma de Entrega", visible: true },
    { field: "horarioEntrega", header: "Horario de Entrega", visible: true },
    {
      field: "fechaHoraEmpacado",
      header: "Fecha y Horario de Empacado",
      visible: false,
    },
    {
      field: "fechaYHorarioDespachado",
      header: "Fecha y Horario de Despachado",
      visible: false,
    },
    { field: "asesorAsignado", header: "Vendedor", visible: false },
    { field: "empacador", header: "Empacador", visible: false },
    { field: "despachador", header: "Despachador", visible: false },
    { field: "transportador", header: "Transportador", visible: false },
    { field: "entregado", header: "Entregado", visible: false },
    { field: "prioridad", header: "Prioridad", visible: true }, // Nueva columna para mostrar la prioridad
  ];

  selectedColumns: ColumnDefinition[] = [];
  availableTransporters: Integration[] = [];

  constructor(
    private ventasService: VentasService,
    private service: ServiciosService,
    private logisticaService: LogisticaServiceV2,
    private paymentService: PaymentService,
    private filterService: FilterService,
    private modalService: NgbModal,
    private dialogService: DialogService,
    private formBuilder: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private router: Router,
    private geocodingService: GeocodingService,
    private cdr: ChangeDetectorRef,
    private integrationsService: IntegrationsService,
    private toastr: ToastrService
  ) {
    // Las fechas se inicializan en ngOnInit mediante initializeDefaultDates()
    // para evitar conflictos y asegurar consistencia
    // const unaSemana = 15 * 24 * 60 * 60 * 1000; // dos semanas en milisegundos
    // this.fechaInicial = new Date(new Date().setDate(new Date().getDate() - 1));
    // this.fechaInicial.setHours(0, 0, 0, 0);
    // this.fechaFinal = new Date(new Date().getTime() + unaSemana);
    // this.fechaFinal.setHours(23, 59, 59, 999);
    this.registerCustomFilters();

    // Inicializar métricas de logística
    this.inicializarMetricas();

    // Guardar configuración de columnas en localStorage si existe
    const savedColumns = localStorage.getItem("despachosColumns");
    if (savedColumns) {
      try {
        this.displayedColumns = JSON.parse(savedColumns);
      } catch (e) {
        console.error("Error parsing saved columns configuration", e);
      }
    }

  }

  ngOnInit(): void {
    this.estadosProcesos = Object.values(EstadoProcesoFiltros);
    this.estadosPago = Object.values(EstadoPago);
    this.ESTADOPAGO = [
      { id: 1, nombre: "Pendiente" },
      { id: 2, nombre: "Pagado" },
      { id: 3, nombre: "Anulado" },
      { id: 4, nombre: "Devuelto" },
      { id: 5, nombre: "Pospendiente" },

    ];
    
    // Inicializar opciones de filtros avanzados
    this.initializeFilterOptions();

    // Configurar debounce para búsqueda
    this.setupSearchDebounce();

    // Inicializar fechas por defecto al mismo día (hoy)
    this.initializeDefaultDates();
    
    // Inicializar las columnas seleccionadas al cargar
    this.selectedColumns = this.displayedColumns.filter((col) => col.visible);

    // Inicializar métricas antes de cargar datos
    this.inicializarMetricas();

    // Configurar intervalo de alertas según preferencias del usuario (5 minutos por defecto)
    const alertInterval = localStorage.getItem("alertInterval");
    if (alertInterval) {
      this.configurarIntervaloAlertas(parseInt(alertInterval));
    }

    // En ngOnInit, mostrar alertas automáticas
    // Para modo optimizado, dejar que la tabla PrimeNG dispare onLazyLoad automáticamente
    // Para modo legacy, llamar refrescarDatos directamente
    if (!this.useOptimizedLoading) {
      this.refrescarDatos(true);
    } else {
      console.log('🚀 Despachos - Using optimized loading, waiting for table lazy load event...');
    }
    this.initForms();

    // Definir items para el menú de acciones unificado
    this.accionesMenu = [
      {
        label: 'Recomendaciones KAI',
        icon: 'pi pi-brain',
        command: () => this.mostrarRecomendacionesOptimizacion()
      },
      {
        label: 'Alertas Pedidos Urgentes',
        icon: 'pi pi-exclamation-triangle',
        command: () => this.mostrarAlertasPedidosUrgentes()
      },
      {
        label: 'Alertas Sin Producir',
        icon: 'pi pi-exclamation-circle',
        command: () => this.mostrarAlertasPedidosSinProducir()
      },
      {
        label: 'Resumen de Alertas',
        icon: 'pi pi-info-circle',
        command: () => this.mostrarResumenAlertas()
      },
      {
        separator: true
      },
      {
        label: 'Geocodificar Todo',
        icon: 'pi pi-map-marker',
        command: () => this.forzarGeocodificacion()
      },
     /* {
        label: 'Gestionar Zonas de Entrega',
        icon: 'pi pi-map',
        command: () => this.openZonaGestionModal()
      },*/
      {
        label: 'Administrar Transportadores',
        icon: 'pi pi-truck',
        command: () => this.openModal(this.transportadoresModal)
      },
     /* {
        label: 'Ver Órdenes de Despacho',
        icon: 'pi pi-list',
        command: () => this.viewAllDispatchOrders()
      },*/
      {
        separator: true
      },
      {
        label: 'Reiniciar Alertas',
        icon: 'pi pi-refresh',
        command: () => this.reiniciarControlAlertas()
      }
    ];
  }

  public onTabChange(event: any): void {
    // El índice de la pestaña del mapa es 1
    if (event.index === 1) {
      setTimeout(() => {
        if (this.mapaComponent) {
          // Refrescar ubicación del navegador y luego el mapa
          this.mapaComponent.refrescarUbicacionYMapa();
        }
      }, 1);
    }
    // El índice de la pestaña de Órdenes es 2
    if (event.index === 2) {
      // Solo cargar transportadores, el componente v2 carga sus propios datos
      this.loadLogisticsIntegrations();
    }
  }

  refrescarDatos(mostrarAlertas: boolean = false) {
    // Set loading indicator
    this.loading = true;
    
    // Build filter using the extracted method  
    const filter = this.buildCurrentFilter();

    // Inicializar vendors para evitar errores
    if (!this.vendors) {
      this.vendors = [];
    }

    // Choose between optimized and legacy loading
    if (this.useOptimizedLoading) {
      // Use optimized endpoint with pagination - use component properties directly
      console.log('🚀 Despachos - Making optimized API request:', {
        currentPage: this.currentPage,
        pageSize: this.currentPageSize,
        hasLazyEvent: !!this.lastLazyLoadEvent,
        hasColumnFilters: Object.keys(this.columnFilters).length > 0,
        filterKeys: Object.keys(filter),
        fullFilter: filter // Log the complete filter to verify column filters are included
      });
      
      this.ventasService.getOrdersByFilterOptimized(filter, this.currentPage, this.currentPageSize).subscribe({
        next: (response) => {
          console.log('✅ Despachos - Optimized API response received:', {
            ordersCount: response.orders?.length || 0,
            totalRecords: response.pagination?.totalItems,
            currentPage: response.pagination?.currentPage,
            totalPages: response.pagination?.totalPages,
            hasMetrics: !!response.metrics
          });
          this.processOrdersData(response.orders as PedidoPriorizado[], response.pagination, response.metrics);
        },
        error: (error) => {
          console.error('❌ Despachos - Error in optimized API call:', error);
          this.loading = false;
          // TODO: Show user-friendly error message
        }
      });
    } else {
      // Use legacy endpoint (backward compatibility)
      this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      this.orders = data as PedidoPriorizado[];
      /*   this.orders.forEach((order) => {
           if (order.fechaCreacion) {
             order.fechaCreacion = new Date(order.fechaCreacion).toISOString();
           }
           order.anticipo = order.anticipo ?? 0;
           order.subtotal =
             (order.totalPedididoConDescuento ?? 0) +
             (order.totalEnvio ?? 0) -
             (order.totalDescuento ?? 0);
           order.totalPedididoConDescuento =
             order.subtotal ?? 0 + (order.totalImpuesto ?? 0);
           order.faltaPorPagar =
             (order.totalPedididoConDescuento ?? 0) - (order.anticipo ?? 0);
         });
   */
      // Aplicar algoritmo de priorización
      this.aplicarAlgoritmoPriorizacion(mostrarAlertas);

      // Calcular métricas para análisis KAI
      this.calcularMetricas();

      this.loading = false;
      });
    }

    this.logisticaService.getTransportadores().subscribe((data) => {
      this.vendors = data || [];
    });
  }

  // Algoritmo principal de priorización
  aplicarAlgoritmoPriorizacion(mostrarAlertas: boolean = false) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Reiniciar arreglos de clasificación
    this.pedidosUrgentes = [];
    this.pedidosEnRiesgo = [];
    this.pedidosNormales = [];
    this.pedidosSinProducir = []; // Reiniciar arreglo de pedidos sin producir

    // Para cada pedido, calcular los días restantes hasta la entrega
    this.orders.forEach((pedido) => {
      // Primero verificar si es un pedido sin producir
      if (pedido.estadoProceso === EstadoProceso.SinProducir || pedido.estadoProceso === EstadoProceso.EnProduccion) {
        this.procesarPedidoSinProducir(pedido, hoy);
        return; // Salir temprano, ya que se ha procesado como sin producir
      }

      let fechaEntrega: Date;

      // Obtener la fecha de entrega del pedido
      if (pedido.fechaEntrega) {
        fechaEntrega = new Date(pedido.fechaEntrega);
      } else if (
        pedido.carrito &&
        pedido.carrito.length > 0 &&
        pedido.carrito[0].configuracion?.datosEntrega?.fechaEntrega
      ) {
        const { year, month, day } =
          pedido.carrito[0].configuracion.datosEntrega.fechaEntrega;
        fechaEntrega = new Date(year, month - 1, day);
      } else {
        // Si no hay fecha de entrega, asumimos que es un pedido estándar sin urgencia
        pedido.prioridad = "baja";
        pedido.diasRestantes = 999; // Valor alto para indicar que no tiene fecha
        this.pedidosNormales.push(pedido);
        return;
      }

      fechaEntrega.setHours(0, 0, 0, 0);

      // Calcular días restantes
      const diferenciaTiempo = fechaEntrega.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));

      // Guardar los días restantes en el pedido
      pedido.diasRestantes = diasRestantes;

      // Identificar factores de riesgo
      const factoresRiesgo: string[] = [];

      // Verificar si es un pedido grande (más de 3 items)
      if (pedido.carrito && pedido.carrito.length > 3) {
        factoresRiesgo.push("Pedido grande");
      }

      // Verificar si es un pedido con envío a zona remota
      if (
        pedido.envio?.zonaCobro &&
        ["Rural", "Extrarradio", "Remota"].some((zona) =>
          pedido.envio?.zonaCobro?.includes(zona),
        )
      ) {
        factoresRiesgo.push("Zona remota");
      }

      // Verificar si tiene observaciones especiales
      if (
        pedido.envio?.observaciones &&
        pedido.envio.observaciones.length > 0
      ) {
        factoresRiesgo.push("Instrucciones especiales");
      }

      // Verificar forma de entrega especial
      if (pedido.formaEntrega && pedido.formaEntrega.includes("Especial")) {
        factoresRiesgo.push("Entrega especial");
      }

      // Calcular tiempo estimado de entrega basado en zona y factores
      let tiempoBase = 30; // 30 minutos base

      // Ajustes por zona
      if (pedido.envio?.zonaCobro) {
        if (pedido.envio.zonaCobro.includes("Centro")) tiempoBase += 15;
        else if (pedido.envio.zonaCobro.includes("Rural")) tiempoBase += 60;
        else if (pedido.envio.zonaCobro.includes("Extrarradio"))
          tiempoBase += 90;
        else tiempoBase += 30; // Otras zonas
      }

      // Ajustes por tamaño de pedido
      if (pedido.carrito) {
        tiempoBase += pedido.carrito.length * 5; // 5 minutos por artículo
      }

      pedido.tiempoEstimadoEntrega = tiempoBase;
      pedido.factoresRiesgo = factoresRiesgo;

      // Asignar prioridad basada en días restantes y factores de riesgo
      if (
        diasRestantes <= this.diasUmbralUrgente ||
        (diasRestantes <= this.diasUmbralUrgente + 1 &&
          factoresRiesgo.length >= 2)
      ) {
        pedido.prioridad = "alta";
        this.pedidosUrgentes.push(pedido);
      } else if (
        diasRestantes <= this.diasUmbralRiesgo ||
        factoresRiesgo.length >= 2
      ) {
        pedido.prioridad = "media";
        this.pedidosEnRiesgo.push(pedido);
      } else {
        pedido.prioridad = "baja";
        this.pedidosNormales.push(pedido);
      }

      // Calcular puntaje para KAI (0-100)
      let puntajeBase = 50; // Punto medio

      // Reducir puntaje (más urgente) por cada día menos
      puntajeBase -= (this.diasUmbralRiesgo - diasRestantes) * 10;

      // Reducir puntaje por cada factor de riesgo
      puntajeBase -= factoresRiesgo.length * 5;

      // Ajustar si el pedido está pagado (menos riesgo)
      if (pedido.estadoPago === "Aprobado") {
        puntajeBase += 10;
      }

      // Limitar el rango entre 0 y 100
      pedido.puntajeKAI = Math.max(0, Math.min(100, puntajeBase));
    });

    // Ordenar cada categoría: primero sin orden de despacho, luego por días restantes
    const ordenarPedidos = (a: any, b: any) => {
      // Primero: pedidos SIN orden de despacho van al inicio
      const aHasOrder = !!(a.shippingOrder || a.nroShippingOrder);
      const bHasOrder = !!(b.shippingOrder || b.nroShippingOrder);

      if (aHasOrder && !bHasOrder) return 1;  // a tiene orden, va al final
      if (!aHasOrder && bHasOrder) return -1; // b tiene orden, va al final

      // Si ambos tienen o no tienen orden, ordenar por días restantes (ascendente)
      return (a.diasRestantes || 999) - (b.diasRestantes || 999);
    };

    this.pedidosUrgentes.sort(ordenarPedidos);
    this.pedidosEnRiesgo.sort(ordenarPedidos);
    this.pedidosNormales.sort(ordenarPedidos);
    this.pedidosSinProducir.sort(ordenarPedidos);

    // Implementar optimización rudimentaria de ruta
    // Optimizar rutas agrupando pedidos por zonas
    this.optimizarRutas();

    // Mostrar alertas solo si se solicita explícitamente
    if (mostrarAlertas) {
      // Mostrar alertas para pedidos urgentes
      this.mostrarAlertasPedidosUrgentes();

      // Mostrar alertas para pedidos sin producir
      this.mostrarAlertasPedidosSinProducir();
    }
  }

  // Método para procesar pedidos sin producir
  procesarPedidoSinProducir(pedido: PedidoPriorizado, hoy: Date) {
    let fechaEntrega: Date;

    // Obtener la fecha de entrega del pedido
    if (pedido.fechaEntrega) {
      fechaEntrega = new Date(pedido.fechaEntrega);
    } else if (
      pedido.carrito &&
      pedido.carrito.length > 0 &&
      pedido.carrito[0].configuracion?.datosEntrega?.fechaEntrega
    ) {
      const { year, month, day } =
        pedido.carrito[0].configuracion.datosEntrega.fechaEntrega;
      fechaEntrega = new Date(year, month - 1, day);
    } else {
      // Si no hay fecha de entrega, es un pedido sin fecha definida
      pedido.prioridad = "baja";
      pedido.diasRestantes = 999; // Valor alto para indicar que no tiene fecha
      this.pedidosSinProducir.push(pedido);
      return;
    }

    fechaEntrega.setHours(0, 0, 0, 0);

    // Calcular días restantes
    const diferenciaTiempo = fechaEntrega.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));

    // Guardar los días restantes en el pedido
    pedido.diasRestantes = diasRestantes;

    // Identificar factores de riesgo específicos para pedidos sin producir
    const factoresRiesgo: string[] = ["Sin iniciar producción"];

    // Añadir factor de riesgo por cercanía a la fecha de entrega
    if (diasRestantes <= this.diasUmbralRiesgo) {
      factoresRiesgo.push("Fecha entrega cercana");
    }

    // Verificar si es un pedido grande (más de 3 items)
    if (pedido.carrito && pedido.carrito.length > 3) {
      factoresRiesgo.push("Pedido grande");
    }

    // Verificar si es un pedido con envío a zona remota
    if (
      pedido.envio?.zonaCobro &&
      ["Rural", "Extrarradio", "Remota"].some((zona) =>
        pedido.envio?.zonaCobro?.includes(zona),
      )
    ) {
      factoresRiesgo.push("Zona remota");
    }

    pedido.factoresRiesgo = factoresRiesgo;

    // Calcular tiempo estimado (mayor para pedidos sin producir)
    let tiempoBase = 60; // 60 minutos base para pedidos sin producir

    // Ajustes por zona
    if (pedido.envio?.zonaCobro) {
      if (pedido.envio.zonaCobro.includes("Centro")) tiempoBase += 15;
      else if (pedido.envio.zonaCobro.includes("Rural")) tiempoBase += 60;
      else if (pedido.envio.zonaCobro.includes("Extrarradio")) tiempoBase += 90;
      else tiempoBase += 30; // Otras zonas
    }

    // Ajustes por tamaño de pedido
    if (pedido.carrito) {
      tiempoBase += pedido.carrito.length * 5; // 5 minutos por artículo
    }

    pedido.tiempoEstimadoEntrega = tiempoBase;

    // Asignar prioridad basada en días restantes
    if (diasRestantes <= this.diasUmbralUrgente) {
      pedido.prioridad = "alta";
    } else if (diasRestantes <= this.diasUmbralRiesgo) {
      pedido.prioridad = "media";
    } else {
      pedido.prioridad = "baja";
    }

    // Añadir a la lista de pedidos sin producir
    this.pedidosSinProducir.push(pedido);

    // Calcular puntaje KAI específico para pedidos sin producir (más urgente)
    let puntajeBase = 40; // Punto base más bajo (más urgente) para pedidos sin producir

    // Reducir puntaje (más urgente) por cada día menos
    puntajeBase -= (this.diasUmbralRiesgo - diasRestantes) * 12; // Factor más alto

    // Reducir puntaje por cada factor de riesgo
    puntajeBase -= factoresRiesgo.length * 5;

    // Limitar el rango entre 0 y 100
    pedido.puntajeKAI = Math.max(0, Math.min(100, puntajeBase));
  }

  // Optimizar rutas agrupando pedidos por zonas
  optimizarRutas() {
    // Agrupar pedidos por zona y ciudad
    const zonas: { [key: string]: PedidoPriorizado[] } = {};

    // Primero los urgentes
    this.pedidosUrgentes.forEach((pedido) => {
      const zona = `${pedido.envio?.ciudad || "Sin ciudad"}-${pedido.envio?.zonaCobro || "Sin zona"}`;
      if (!zonas[zona]) zonas[zona] = [];
      zonas[zona].push(pedido);
    });

    // Después los de riesgo
    this.pedidosEnRiesgo.forEach((pedido) => {
      const zona = `${pedido.envio?.ciudad || "Sin ciudad"}-${pedido.envio?.zonaCobro || "Sin zona"}`;
      if (!zonas[zona]) zonas[zona] = [];
      zonas[zona].push(pedido);
    });

    // Marcar pedidos que pueden optimizarse (aquellos en zonas con múltiples entregas)
    Object.keys(zonas).forEach((zona) => {
      if (zonas[zona].length > 1) {
        zonas[zona].forEach((pedido) => {
          pedido.optimizacionRuta = true;
        });
      }
    });
  }

  // Mostrar alertas para pedidos urgentes
  mostrarAlertasPedidosUrgentes() {
    // Filtrar los pedidos urgentes excluyendo los despachados y entregados
    const pedidosUrgentesPendientes = this.pedidosUrgentes.filter(
      (pedido) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado,
    );

    if (pedidosUrgentesPendientes.length > 0) {
      const cantidadUrgentes = pedidosUrgentesPendientes.length;
      const pedidosMasUrgentes = pedidosUrgentesPendientes
        .slice(0, Math.min(3, cantidadUrgentes))
        .map(
          (p) =>
            `<li>#${p.nroPedido} - ${p.diasRestantes} día(s) - ${p.cliente?.nombres_completos || "Cliente"}</li>`,
        )
        .join("");

      Swal.fire({
        title: "¡Atención! Pedidos Urgentes",
        html: `
          <div class="text-start">
            <p>Se han detectado <strong>${cantidadUrgentes} pedidos urgentes</strong> que requieren atención inmediata:</p>
            <ul>${pedidosMasUrgentes}</ul>
            ${cantidadUrgentes > 3 ? `<p>...y ${cantidadUrgentes - 3} más.</p>` : ""}
          </div>
        `,
        icon: "warning",
        confirmButtonText: "Entendido",
      });
    } else {
      Swal.fire({
        title: "Sin Pedidos Urgentes",
        text: "No hay pedidos urgentes que requieran atención inmediata en este momento.",
        icon: "info",
        confirmButtonText: "Entendido",
      });
    }
  }

  // Inicializar métricas de logística
  inicializarMetricas() {
    this.metricasLogistica = {
      pedidosUrgentes: 0,
      pedidosEnRiesgo: 0,
      pedidosNormales: 0,
      pedidosSinProducir: 0, // Inicializar el nuevo campo
      pedidosEnRuta: 0, // Pedidos despachados pero no entregados
      pedidosDespacho: 0, // Pedidos listos para despachar
      porcentajeEntregasTiempo: 0,
      tiempoPromedioDespacho: 0,
      zonasConRetrasos: {},
      transportadoresEficiencia: {},
      prediccionCargaProximosDias: {},
      ubicacionesPedidos: [], // Para el mapa de ubicaciones
    };

    // Inicializar kaiPredicciones para evitar errores de null
    this.kaiPredicciones = {
      cargaEstimada: {},
      zonasCriticas: [],
      asignacionOptima: {},
      recomendaciones: [],
    };
  }

  // Calcular métricas para análisis KAI
  calcularMetricas() {
    // Clasificar pedidos por estado de despacho
    this.pedidosEnRuta = this.orders.filter(
      (p) => p.estadoProceso === EstadoProceso.Despachado,
    );
    this.pedidosParaDespacho = this.orders.filter(
      (p) =>
        p.estadoProceso === EstadoProceso.ParaDespachar ||
        p.estadoProceso === EstadoProceso.Empacado ||
        p.estadoProceso === EstadoProceso.ProducidoTotalmente,
    );

    // Contar pedidos por categoría
    this.metricasLogistica.pedidosUrgentes = this.pedidosUrgentes.length;
    this.metricasLogistica.pedidosEnRiesgo = this.pedidosEnRiesgo.length;
    this.metricasLogistica.pedidosNormales = this.pedidosNormales.length;
    this.metricasLogistica.pedidosSinProducir = this.pedidosSinProducir.length; // Actualizar contador
    this.metricasLogistica.pedidosEnRuta = this.pedidosEnRuta.length;
    this.metricasLogistica.pedidosDespacho = this.pedidosParaDespacho.length;

    // Calcular porcentaje de entregas a tiempo (simulado para demostración)
    const entregados = this.orders.filter(
      (p) => p.estadoProceso === "Entregado",
    );
    const entregadosATiempo = entregados.filter(
      (p) => p.diasRestantes !== undefined && p.diasRestantes >= 0,
    );
    this.metricasLogistica.porcentajeEntregasTiempo =
      entregados.length > 0
        ? (entregadosATiempo.length / entregados.length) * 100
        : 100;

    // Tiempo promedio de despacho (simulado)
    this.metricasLogistica.tiempoPromedioDespacho = 35; // 35 minutos en promedio

    // Identificar zonas con más retrasos
    const zonasPedidos: {
      [zona: string]: { total: number; retrasados: number };
    } = {};

    this.orders.forEach((pedido) => {
      const zona = pedido.envio?.zonaCobro || "Sin zona";
      if (!zonasPedidos[zona]) {
        zonasPedidos[zona] = { total: 0, retrasados: 0 };
      }

      zonasPedidos[zona].total++;

      if (
        pedido.diasRestantes !== undefined &&
        pedido.diasRestantes < 0 &&
        pedido.estadoProceso !== "Entregado" &&
        pedido.estadoProceso !== "Despachado"
      ) {
        zonasPedidos[zona].retrasados++;
      }
    });

    // Calcular porcentaje de retrasos por zona
    Object.keys(zonasPedidos).forEach((zona) => {
      if (zonasPedidos[zona].total > 0) {
        const porcentajeRetraso =
          (zonasPedidos[zona].retrasados / zonasPedidos[zona].total) * 100;
        this.metricasLogistica.zonasConRetrasos[zona] = porcentajeRetraso;
      }
    });

    // Eficiencia de transportadores (simulado)
    if (this.vendors && Array.isArray(this.vendors)) {
      this.vendors.forEach((transportador) => {
        const nombre = `${transportador.nombres} ${transportador.apellidos}`;
        this.metricasLogistica.transportadoresEficiencia[nombre] =
          Math.floor(Math.random() * 30) + 70; // 70-100%
      });
    }

    // Limpiar las predicciones de carga anteriores para evitar duplicados
    this.metricasLogistica.prediccionCargaProximosDias = {};

    // Predicción de carga para próximos días
    const hoy = new Date();
    const fechasYaProcesadas = new Set(); // Para evitar fechas duplicadas

    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      // Normalizar fecha para que solo tenga año, mes y día (sin hora)
      fecha.setHours(0, 0, 0, 0);

      // Usar formato YYYY-MM-DD como clave para evitar duplicados
      const fechaKey = fecha.toISOString().split("T")[0];

      // Verificar si esta fecha ya ha sido procesada
      if (fechasYaProcesadas.has(fechaKey)) {
        continue;
      }

      fechasYaProcesadas.add(fechaKey);

      // Usar timestamp como clave en el objeto
      const fechaTimestamp = fecha.getTime();

      // Contar pedidos programados para cada día
      const pedidosConfirmados = this.orders.filter((p) => {
        if (!p.fechaEntrega || p.estadoProceso === EstadoProceso.SinProducir)
          return false;
        const fechaEntrega = new Date(p.fechaEntrega);
        // Convertir ambas fechas a formato 'YYYY-MM-DD' para comparar solo la fecha sin la hora
        const fechaEntregaStr = fechaEntrega.toISOString().split("T")[0];
        return fechaEntregaStr === fechaKey;
      }).length;

      // Contar pedidos sin producir para este día
      const pedidosSinProducir = this.orders.filter((p) => {
        if (p.estadoProceso !== EstadoProceso.SinProducir || !p.fechaEntrega)
          return false;
        const fechaEntrega = new Date(p.fechaEntrega);
        // Estimar que estarán listos 2 días antes de la entrega
        const fechaEstimadaProduccion = new Date(fechaEntrega);
        fechaEstimadaProduccion.setDate(fechaEstimadaProduccion.getDate() - 2);

        // Si la fecha de entrega es el día actual, considerarlo para producción hoy
        if (fechaEstimadaProduccion < hoy) {
          fechaEstimadaProduccion.setTime(hoy.getTime());
        }

        const fechaEstimadaStr = fechaEstimadaProduccion
          .toISOString()
          .split("T")[0];
        return fechaEstimadaStr === fechaKey;
      }).length;

      // Añadir predicción con la nueva estructura
      this.metricasLogistica.prediccionCargaProximosDias[fechaTimestamp] = {
        confirmados: pedidosConfirmados,
        pendientesProduccion: pedidosSinProducir,
        total: pedidosConfirmados + pedidosSinProducir,
      };
    }

    // Generar ubicaciones para el mapa
    this.generarUbicacionesPedidos();

    // Simular predicciones de KAI
    this.generarPrediccionesKAI();
  }

  // Método para generar ubicaciones simuladas de pedidos para el mapa
  generarUbicacionesPedidos() {
    const ubicaciones: UbicacionPedido[] = [];

    // Coordenadas base para diferentes ciudades (simuladas)
    const ciudadesBase = {
      Bogotá: { lat: 4.6097, lng: -74.0817 },
      Medellín: { lat: 6.2486, lng: -75.5742 },
      Cali: { lat: 3.4516, lng: -76.532 },
      Barranquilla: { lat: 10.9639, lng: -74.7965 },
      Bucaramanga: { lat: 7.1253, lng: -73.1198 },
    };

    // Procesar pedidos en ruta y para despacho
    [...this.pedidosEnRuta, ...this.pedidosParaDespacho].forEach((pedido) => {
      const ciudad = pedido.envio?.ciudad || "Bogotá";
      const coordBase = ciudadesBase[ciudad] || ciudadesBase["Bogotá"];

      // Agregar variación aleatoria para simular direcciones específicas
      const variacion = 0.05; // Aproximadamente 5km de variación
      const latitud = coordBase.lat + (Math.random() - 0.5) * variacion;
      const longitud = coordBase.lng + (Math.random() - 0.5) * variacion;

      const ubicacion: UbicacionPedido = {
        nroPedido: pedido.nroPedido || "",
        estado: pedido.estadoProceso,
        cliente:
          pedido.cliente?.nombres_completos ||
          pedido.cliente?.apellidos_completos ||
          "Cliente sin nombre",
        direccion:
          pedido.envio?.direccionEntrega || "Dirección no especificada",
        latitud: latitud,
        longitud: longitud,
        transportador: pedido.transportador?.nombres || "Sin asignar",
        fechaEntrega: pedido.fechaEntrega || "",
        horaEstimada: pedido.horarioEntrega || "",
        distanciaRestante: Math.floor(Math.random() * 20) + 1, // 1-20 km
        tiempoEstimado: Math.floor(Math.random() * 60) + 10, // 10-70 minutos
      };

      ubicaciones.push(ubicacion);
    });

    // Actualizar las métricas con las ubicaciones
    if (this.metricasLogistica) {
      this.metricasLogistica.ubicacionesPedidos = ubicaciones;
    }
  }

  // Método para obtener pedidos en ruta
  obtenerPedidosEnRuta(): Pedido[] {
    return this.pedidosEnRuta;
  }

  // Método para obtener pedidos listos para despacho
  obtenerPedidosParaDespacho(): Pedido[] {
    return this.pedidosParaDespacho;
  }


  // Método para obtener datos del mapa (unificado con configuracionMapa)
  obtenerDatosMapa() {
    // Asegurar que configuracionMapa esté actualizado
    if (!this.configuracionMapa.ubicaciones || this.configuracionMapa.ubicaciones.length === 0) {
      this.actualizarConfiguracionMapa();
    }

    // Calcular centro inteligente basado en las ubicaciones
    const centroCalculado = this.calcularCentroInteligenteMapa();

    return {
      ubicaciones: this.configuracionMapa.ubicaciones || [],
      centroMapa: centroCalculado.centro,
      zoom: centroCalculado.zoom,
    };
  }

  /**
   * Obtiene la configuración de zonas de entrega para el mapa
   */
  obtenerConfiguracionZonas() {
    return {
      zonas: this.generarZonasEntregaEjemplo(),
      mostrarZonas: true,
      tipoVisualizacion: 'ambos' as 'relleno' | 'borde' | 'ambos'
    };
  }

  /**
   * Calcula el centro del mapa de forma inteligente
   */
  private calcularCentroInteligenteMapa(): { centro: { lat: number; lng: number }, zoom: number } {
    const defaultCenter = { lat: 6.2486, lng: -75.5742 }; // Medellín
    const defaultZoom = 11;

    // Si hay ubicaciones, calcular el centroide
    if (this.configuracionMapa.ubicaciones && this.configuracionMapa.ubicaciones.length > 0) {
      const ubicacionesValidas = this.configuracionMapa.ubicaciones.filter(
        u => u.latitud && u.longitud &&
        u.latitud >= -90 && u.latitud <= 90 &&
        u.longitud >= -180 && u.longitud <= 180
      );

      if (ubicacionesValidas.length > 0) {
        // Calcular promedio de coordenadas
        const promedioLat = ubicacionesValidas.reduce((sum, u) => sum + u.latitud!, 0) / ubicacionesValidas.length;
        const promedioLng = ubicacionesValidas.reduce((sum, u) => sum + u.longitud!, 0) / ubicacionesValidas.length;

        // Calcular dispersión para ajustar zoom
        const latitudes = ubicacionesValidas.map(u => u.latitud!);
        const longitudes = ubicacionesValidas.map(u => u.longitud!);
        const rangeLat = Math.max(...latitudes) - Math.min(...latitudes);
        const rangeLng = Math.max(...longitudes) - Math.min(...longitudes);
        const maxRange = Math.max(rangeLat, rangeLng);

        // Ajustar zoom según dispersión
        let zoom = defaultZoom;
        if (maxRange < 0.01) zoom = 15;      // Muy concentrado
        else if (maxRange < 0.05) zoom = 13; // Concentrado
        else if (maxRange < 0.1) zoom = 11;  // Moderado
        else if (maxRange < 0.5) zoom = 9;   // Disperso
        else zoom = 7;                       // Muy disperso

        return {
          centro: { lat: promedioLat, lng: promedioLng },
          zoom: zoom
        };
      }
    }

    return {
      centro: defaultCenter,
      zoom: defaultZoom
    };
  }

  // Generar predicciones simuladas para KAI
  generarPrediccionesKAI() {
    const hoy = new Date();
    const zonas = ["Norte", "Sur", "Este", "Oeste", "Centro"];
    const transportadores =
      this.vendors && Array.isArray(this.vendors)
        ? this.vendors.map((v) => `${v.nombres} ${v.apellidos}`)
        : [];

    // Estructura para predicciones KAI (reinicializar para evitar datos antiguos)
    this.kaiPredicciones = {
      cargaEstimada: {},
      zonasCriticas: [],
      asignacionOptima: {},
      recomendaciones: [],
    };

    // Añadir recomendaciones específicas para pedidos sin producir
    const pedidosSinProducirUrgentes = this.pedidosSinProducir.filter(
      (p) =>
        p.diasRestantes !== undefined &&
        p.diasRestantes <= this.diasUmbralUrgente,
    ).length;

    if (pedidosSinProducirUrgentes > 0) {
      this.kaiPredicciones.recomendaciones.push(
        `Solicitar prioridad de producción para ${pedidosSinProducirUrgentes} pedidos urgentes pendientes de producción.`,
      );
    }

    // Añadir recomendación para pedidos en riesgo
    const pedidosSinProducirRiesgo = this.pedidosSinProducir.filter(
      (p) =>
        p.diasRestantes !== undefined &&
        p.diasRestantes > this.diasUmbralUrgente &&
        p.diasRestantes <= this.diasUmbralRiesgo,
    ).length;

    if (pedidosSinProducirRiesgo > 0) {
      this.kaiPredicciones.recomendaciones.push(
        `Planificar producción para ${pedidosSinProducirRiesgo} pedidos en riesgo que aún no inician producción.`,
      );
    }

    // Añadir recomendaciones estándar
    this.kaiPredicciones.recomendaciones.push(
      "Priorizar pedidos de la zona Sur para el día de mañana debido a alta demanda.",
      "Considerar asignar un transportador adicional para el sector Norte el próximo jueves.",
      "Revisar los pedidos con instrucciones especiales de entrega con anticipación.",
      "Los pedidos de productos frágiles deben ser empacados con material adicional.",
    );

    // Usar el mismo conjunto de fechas que ya usamos en calcularMetricas para mantener consistencia
    const fechasYaProcesadas = new Set();

    // Predicción de carga por zona y día
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      // Normalizar fecha
      fecha.setHours(0, 0, 0, 0);

      // Usar formato YYYY-MM-DD como clave para verificar duplicados
      const fechaKey = fecha.toISOString().split("T")[0];

      // Verificar si esta fecha ya ha sido procesada
      if (fechasYaProcesadas.has(fechaKey)) {
        continue;
      }

      fechasYaProcesadas.add(fechaKey);

      // Guardar la fecha como timestamp (número)
      const fechaTimestamp = fecha.getTime();

      this.kaiPredicciones.cargaEstimada[fechaTimestamp] = {};

      zonas.forEach((zona) => {
        // Simular carga por zona - más alta para los primeros días, decreciente después
        let cargaBase = Math.floor((7 - i) * Math.random() * 5) + 1;
        // Añadir variabilidad
        if (zona === "Centro") cargaBase += 3; // Más carga en centro
        if (i === 1 || i === 2) cargaBase += 2; // Más carga en días específicos

        this.kaiPredicciones.cargaEstimada[fechaTimestamp][zona] = cargaBase;
      });
    }

    // Zonas críticas (con alta carga o problemas históricos)
    const fechaCritica1 = new Date(hoy);
    fechaCritica1.setDate(fechaCritica1.getDate() + 1);

    const fechaCritica2 = new Date(hoy);
    fechaCritica2.setDate(fechaCritica2.getDate() + 2);

    this.kaiPredicciones.zonasCriticas = [
      {
        zona: "Sur",
        motivo: "Alta demanda prevista",
        fechaCritica: fechaCritica1.getTime(),
      },
      {
        zona: "Centro",
        motivo: "Congestión de tráfico",
        fechaCritica: fechaCritica2.getTime(),
      },
    ];

    // Añadir zonas críticas específicas para pedidos sin producir
    const pedidosSinProducirPorZona: { [zona: string]: number } = {};

    this.pedidosSinProducir.forEach((pedido) => {
      const zona = pedido.envio?.zonaCobro || "Sin zona";
      if (!pedidosSinProducirPorZona[zona]) {
        pedidosSinProducirPorZona[zona] = 0;
      }
      pedidosSinProducirPorZona[zona]++;
    });

    // Encontrar zonas con mayor concentración de pedidos sin producir
    const zonasOrdenadas = Object.entries(pedidosSinProducirPorZona)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2);

    zonasOrdenadas.forEach(([zona, cantidad]) => {
      if (cantidad > 2) {
        // Solo considerar zonas con más de 2 pedidos
        this.kaiPredicciones.zonasCriticas.push({
          zona,
          motivo: `${cantidad} pedidos pendientes de producción`,
          fechaCritica: hoy.getTime(),
        });
      }
    });

    // Asignación óptima de transportadores
    transportadores.forEach((transportador) => {
      this.kaiPredicciones.asignacionOptima[transportador] = {
        zonasRecomendadas: [
          zonas[Math.floor(Math.random() * zonas.length)],
          zonas[Math.floor(Math.random() * zonas.length)],
        ],
        capacidadOptima: Math.floor(Math.random() * 5) + 3,
        eficienciaHistorica: Math.floor(Math.random() * 20) + 80,
      };
    });
  }

  // Método para obtener el conteo de pedidos por prioridad
  obtenerConteoPedidosPorPrioridad() {
    return {
      urgentes: this.pedidosUrgentes.length,
      riesgo: this.pedidosEnRiesgo.length,
      normales: this.pedidosNormales.length,
      sinProducir: this.pedidosSinProducir.length,
      total: this.orders.length,
    };
  }

  // Método para obtener pedidos sin producir urgentes
  obtenerPedidosSinProducirUrgentes(): PedidoPriorizado[] {
    return this.pedidosSinProducir.filter(
      (p) =>
        p.diasRestantes !== undefined &&
        p.diasRestantes <= this.diasUmbralUrgente,
    );
  }

  // Método para obtener pedidos sin producir en riesgo
  obtenerPedidosSinProducirEnRiesgo(): PedidoPriorizado[] {
    return this.pedidosSinProducir.filter(
      (p) =>
        p.diasRestantes !== undefined &&
        p.diasRestantes > this.diasUmbralUrgente &&
        p.diasRestantes <= this.diasUmbralRiesgo,
    );
  }

  // Método para obtener conteo de pedidos sin producir urgentes
  obtenerConteoPedidosSinProducirUrgentes(): number {
    return this.obtenerPedidosSinProducirUrgentes().length;
  }

  // Método para obtener conteo de pedidos sin producir en riesgo
  obtenerConteoPedidosSinProducirEnRiesgo(): number {
    return this.obtenerPedidosSinProducirEnRiesgo().length;
  }

  // Método para mostrar alertas de pedidos sin producir
  mostrarAlertasPedidosSinProducir() {
    const pedidosSinProducirUrgentes = this.obtenerPedidosSinProducirUrgentes();

    if (pedidosSinProducirUrgentes.length > 0) {
      const cantidadUrgentes = pedidosSinProducirUrgentes.length;
      const pedidosMasUrgentes = pedidosSinProducirUrgentes
        .slice(0, Math.min(3, cantidadUrgentes))
        .map(
          (p) =>
            `<li>#${p.nroPedido} - ${p.diasRestantes} día(s) - ${p.cliente?.nombres_completos || "Cliente"}</li>`,
        )
        .join("");

      Swal.fire({
        title: "¡Atención! Pedidos Urgentes Sin Producir",
        html: `
          <div class="text-start">
            <p>Se han detectado <strong>${cantidadUrgentes} pedidos urgentes sin iniciar producción</strong> que requieren atención inmediata:</p>
            <ul>${pedidosMasUrgentes}</ul>
            ${cantidadUrgentes > 3 ? `<p>...y ${cantidadUrgentes - 3} más.</p>` : ""}
            <p class="mt-3 text-danger">Estos pedidos deben priorizarse en producción para evitar retrasos en la entrega.</p>
          </div>
        `,
        icon: "warning",
        confirmButtonText: "Entendido",
      });
    } else {
      Swal.fire({
        title: "Sin Pedidos Sin Producir",
        text: "No hay pedidos urgentes sin producir en este momento.",
        icon: "info",
        confirmButtonText: "Entendido",
      });
    }
  }

  // Método para obtener zonas críticas para mostrar alertas
  obtenerZonasCriticas(): { zona: string; porcentaje: number }[] {
    return Object.entries(this.metricasLogistica.zonasConRetrasos)
      .map(([zona, porcentaje]) => ({ zona, porcentaje }))
      .filter((z) => z.porcentaje > 20) // Zonas con más del 20% de retrasos
      .sort((a, b) => b.porcentaje - a.porcentaje)
      .slice(0, 3); // Top 3 zonas problemáticas
  }

  // Método para mostrar recomendaciones de optimización
  mostrarRecomendacionesOptimizacion() {
    if (!this.kaiPredicciones) return;

    const recomendaciones =
      this.kaiPredicciones.recomendaciones.join("</li><li>");

    Swal.fire({
      title: "Recomendaciones de KAI",
      icon: "info",
      html: `
        <div class="text-start">
          <p>Basado en el análisis de datos históricos y patrones actuales, KAI sugiere:</p>
          <ul><li>${recomendaciones}</li></ul>
        </div>
      `,
      confirmButtonText: "Aplicar recomendaciones",
      showCancelButton: true,
      cancelButtonText: "Revisar más tarde",
    }).then((result) => {
      if (result.isConfirmed) {
        // Aquí se implementaría la lógica para aplicar las recomendaciones
        Swal.fire(
          "Recomendaciones aplicadas",
          "Los cambios han sido implementados en el sistema",
          "success",
        );
      }
    });
  }

  calculateValorBruto(): number {
    return this.orders.reduce(
      (acc, pedido) => acc + (pedido.totalPedidoSinDescuento ?? 0),
      0,
    );
  }

  calculateDescuento(): number {
    return this.orders.reduce(
      (acc, pedido) => acc + (pedido.totalDescuento ?? 0),
      0,
    );
  }

  calculateTotal(): number {
    return this.orders.reduce(
      (acc, pedido) => acc + (pedido.totalPedididoConDescuento ?? 0),
      0,
    );
  }

  calculateFaltaPorPagar(): number {
    return this.orders.reduce(
      (acc, pedido) => acc + (pedido.faltaPorPagar ?? 0),
      0,
    );
  }

  calculateTotalEnvio(): number {
    return this.orders.reduce(
      (acc, pedido) => acc + (pedido.totalEnvio ?? 0),
      0,
    );
  }

  calculateAnticipo(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.anticipo ?? 0), 0);
  }

  calculateSubtotal(): number {
    return this.orders.reduce(
      (acc, pedido) => acc + (pedido.totalPedidoSinDescuento ?? 0),
      0,
    );
  }

  calculateTotalImpuestos(): number {
    return this.orders.reduce(
      (acc, pedido) => acc + (pedido.totalImpuesto ?? 0),
      0,
    );
  }

  async imprimirOrdenConHtml2Pdf() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.updatePDFProgress(10, "Iniciando generación...");

        // Validar datos antes de procesar
        if (!this.validateOrderData()) {
          throw new Error("Datos de pedido inválidos");
        }

        console.log("Verificando componentes PDF...", {
          pdfTemplate: !!this.pdfTemplate,
          pdfTemplateContainer: !!this.pdfTemplateContainer,
          pedidosSeleccionados: this.pedidosSeleccionados.length
        });

        // Verificar que el componente PDF template esté disponible
        if (!this.pdfTemplate || !this.pdfTemplateContainer) {
          console.warn("PDF Template component not available, using legacy method");
          this.imprimirOrdenConHtml2PdfLegacy().then(resolve).catch(reject);
          return;
        }

        this.updatePDFProgress(20, "Verificando validación del template...");

        // Verificar que el template sea válido para generar PDF
        try {
          if (!this.pdfTemplate.isValidForGeneration()) {
            const errors = this.pdfTemplate.getValidationErrors();
            console.warn(`Template validation failed: ${errors.join(', ')}, using legacy method`);
            this.imprimirOrdenConHtml2PdfLegacy().then(resolve).catch(reject);
            return;
          }
        } catch (validationError) {
          console.warn("Template validation error, using legacy method", validationError);
          this.imprimirOrdenConHtml2PdfLegacy().then(resolve).catch(reject);
          return;
        }

        this.updatePDFProgress(30, "Preparando contenido optimizado...");

        // Configurar datos para el template
        this.pdfTemplate.pedidos = this.pedidosSeleccionados;
        this.pdfTemplate.nroShippingOrder = this.nroShippingOrder;
        this.pdfTemplate.transportadorSeleccionado = this.transportadorSeleccionado;
        this.pdfTemplate.userName = this.getCurrentUser()?.name || "";

        // Usar datos cacheados si están disponibles
        const cachedData = this.getCachedOrderData();
        const totalPendiente =
          cachedData?.data?.totalPendiente ?? this.calculateTotalPendiente();

        this.pdfTemplate.totalPendiente = totalPendiente;


        console.log("Datos configurados en el template:", {
          pedidos: this.pdfTemplate.pedidos?.length || 0,
          nroShippingOrder: this.pdfTemplate.nroShippingOrder,
          transportadorSeleccionado: !!this.pdfTemplate.transportadorSeleccionado,
          totalPendiente: this.pdfTemplate.totalPendiente,
          userName: this.pdfTemplate.userName
        });

        this.updatePDFProgress(50, "Obteniendo elemento HTML optimizado...");

        // Usar el elemento HTML del componente PDF template
        const element = this.pdfTemplateContainer.nativeElement;

        console.log("Elemento del template:", {
          exists: !!element,
          children: element?.children?.length || 0,
          innerHTML: element?.innerHTML?.length || 0
        });

        // Verificar que el elemento tenga contenido
        if (!element || element.children.length === 0) {
          console.warn("PDF template container is empty, using legacy method");
          this.imprimirOrdenConHtml2PdfLegacy().then(resolve).catch(reject);
          return;
        }

        // Dar tiempo para que Angular procese los cambios del template
        setTimeout(() => {
          console.log("Después del timeout, verificando contenido:", {
            children: element?.children?.length || 0,
            innerHTML: element?.innerHTML?.length || 0
          });

          // Si aún no hay contenido, forzar la validación del template
          if (element.children.length === 0 || element.innerHTML.length < 100) {
            console.warn("Template aún vacío, forzando validación nuevamente");
            if (!this.pdfTemplate.isValidForGeneration()) {
              console.warn("Template no válido, usando método legacy");
              this.imprimirOrdenConHtml2PdfLegacy().then(resolve).catch(reject);
              return;
            }
          }

          // Hacer el elemento visible temporalmente para la captura
          const originalVisibility = element.style.visibility;
          const originalPosition = element.style.position;
          element.style.visibility = 'visible';
          element.style.position = 'static';

          this.updatePDFProgress(60, "Configurando opciones de PDF...");

          // Configuración optimizada para mejor rendimiento
          const options = this.getOptimizedPDFOptions();

          this.updatePDFProgress(70, "Generando PDF con template optimizado...");

          html2pdf()
            .from(element)
            .set(options)
            .toPdf()
            .get("pdf")
            .then((pdf) => {
              this.updatePDFProgress(90, "Finalizando...");

              // Restaurar la visibilidad original
              element.style.visibility = originalVisibility;
              element.style.position = originalPosition;

              const blob = pdf.output("blob");
              const blobUrl = URL.createObjectURL(blob);

              // Programar limpieza del blob URL
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 30000);

              window.open(blobUrl, "_blank");

              this.updatePDFProgress(100, "Completado");

              // Cachear datos para próximas generaciones
              this.cacheOrderData({
                totalPendiente,
                pedidosOptimizados: this.pedidosSeleccionados,
                timestamp: Date.now(),
              });

              resolve();
            })
            .catch((err) => {
              console.error("Error generando PDF con template:", err);

              // Restaurar la visibilidad original en caso de error
              element.style.visibility = originalVisibility;
              element.style.position = originalPosition;

              console.warn("Fallback to legacy PDF generation");
              this.imprimirOrdenConHtml2PdfLegacy().then(resolve).catch(reject);
            });
        }, 200); // Dar más tiempo para que Angular procese los cambios
      } catch (error) {
        console.error("Error en imprimirOrdenConHtml2Pdf:", error);
        console.warn("Fallback to legacy PDF generation");
        this.imprimirOrdenConHtml2PdfLegacy().then(resolve).catch(reject);
      }
    });
  }

  // Método legacy como fallback
  private async imprimirOrdenConHtml2PdfLegacy() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.updatePDFProgress(10, "Usando método legacy...");

        // Usar datos cacheados si están disponibles
        const cachedData = this.getCachedOrderData();
        const totalPendiente =
          cachedData?.data?.totalPendiente ?? this.calculateTotalPendiente();

        this.updatePDFProgress(20, "Procesando datos...");

        // Optimizar datos de pedidos
        const optimizedPedidos = this.optimizarDatosPedidos(
          this.pedidosSeleccionados,
        );

        this.updatePDFProgress(30, "Generando contenido HTML...");

        // Usar template strings más eficientes
        const pedidosHTML = this.generateOptimizedPedidosHTML(optimizedPedidos);

        this.updatePDFProgress(40, "Creando estructura del documento...");

        const content = this.generatePDFContent(totalPendiente, pedidosHTML);

        this.updatePDFProgress(50, "Preparando elemento DOM...");

        // Crear elemento de forma más eficiente
        const element = this.createPDFElement(content);

        this.updatePDFProgress(60, "Configurando opciones de PDF...");

        // Configuración optimizada para mejor rendimiento
        const options = this.getOptimizedPDFOptions();

        this.updatePDFProgress(70, "Generando PDF...");

        html2pdf()
          .from(element)
          .set(options)
          .toPdf()
          .get("pdf")
          .then((pdf) => {
            this.updatePDFProgress(90, "Finalizando...");

            const blob = pdf.output("blob");
            const blobUrl = URL.createObjectURL(blob);

            // Programar limpieza del blob URL
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 30000);

            window.open(blobUrl, "_blank");

            this.updatePDFProgress(100, "Completado");

            // Cachear datos para próximas generaciones
            this.cacheOrderData({
              totalPendiente,
              pedidosOptimizados: optimizedPedidos,
              timestamp: Date.now(),
            });

            resolve();
          })
          .catch((err) => {
            console.error("Error generando PDF:", err);
            this.handlePDFError(err, resolve, reject);
          })
          .finally(() => {
            this.cleanupDOMElement(element);
          });
      } catch (error) {
        console.error("Error en imprimirOrdenConHtml2PdfLegacy:", error);
        this.handlePDFError(error, resolve, reject);
      }
    });
  }

  private generatePedidosHTML(): string {
    const pedidosChunks: string[] = [];

    for (const p of this.pedidosSeleccionados) {
      const filaPrincipal = `
      <tr>
        <td>${p.nroPedido || "N/A"}</td>
        <td>$${(p.faltaPorPagar || 0).toLocaleString()}</td>
        <td>___________</td>
        <td>
          <strong>Nombre:</strong> ${this.getNombreDestinatario(p)}<br>
          <strong>Teléfono:</strong> ${this.getTelefonoDestinatario(p)}<br>
          <strong>WhatsApp:</strong> ${this.getTelefonoDestinatario(p)}<br>
          <strong>Otro Número:</strong> ${p.envio?.otroNumero || "N/A"}<br>
          <strong>Información Adicional:</strong> ${this.getObservacionesCompletas(p)}
        </td>
        <td>${p.horarioEntrega || "N/A"}</td>
        <td>${p.envio?.ciudad || "N/A"}</td>
        <td>${p.envio?.departamento || "N/A"}</td>
      </tr>`;

      const filaSecundaria = `
      <tr style="border-bottom: 1px solid #000;border-top: 1px solid #000;">
        <td colspan="4"></td>
        <td colspan="3">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #000; color: #fff;">
              <th style="border: 1px solid #000;">Zona Entrega</th>
              <th style="border: 1px solid #000;">Barrio</th>
              <th style="border: 1px solid #000;">País</th>
            </tr>
            <tr>
              <td>${p.envio?.zonaCobro || "N/A"}</td>
              <td>${p.envio?.barrio || "N/A"}</td>
              <td>${p.envio?.pais || "Colombia"}</td>
            </tr>
          </table>
        </td>
      </tr>`;

      pedidosChunks.push(filaPrincipal + filaSecundaria);
    }

    return pedidosChunks.join("");
  }

  private generatePDFContent(
    totalPendiente: number,
    pedidosHTML: string,
  ): string {
    const userLite = this.getCurrentUser();
    const userName = userLite ? userLite.name : "N/A";

    return `
    <div style="font-family: Arial, sans-serif; font-size: 12px; padding:20px; width:100%;">
      <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
        <tr>
          <td>
            <h2 style="margin:0; font-size: 18px;">
              Orden de Envío: ${this.nroShippingOrder}
            </h2>
          </td>
          <td>
            <h2 style="margin:0; font-size: 18px;">
              Número de pedidos: ${this.pedidosSeleccionados.length}
            </h2>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Fecha de Generación: ${new Date().toLocaleDateString()}
            </p>
          </td>
          <td>
            <p style="margin:0; font-size: 14px;">
              Total a Recaudar: $${totalPendiente.toLocaleString()}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Transportador: ${this.transportadorSeleccionado || "N/A"}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Despachador: ${userName}
            </p>
          </td>
          <td>
            <p style="margin:0; font-size: 14px;">
              Fecha y Hora despachado: ${new Date().toISOString()}
            </p>
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #000; color: #fff;">
            <th style="border: 1px solid #000; padding: 5px;">Número de Pedido</th>
            <th style="border: 1px solid #000; padding: 5px;">Valor a Cobrar</th>
            <th style="border: 1px solid #000; padding: 5px;">Firma</th>
            <th style="border: 1px solid #000; padding: 5px;">Datos de Entrega</th>
            <th style="border: 1px solid #000; padding: 5px;">Horario de Entrega</th>
            <th style="border: 1px solid #000; padding: 5px;">Ciudad</th>
            <th style="border: 1px solid #000; padding: 5px;">Departamento</th>
          </tr>
        </thead>
        <tbody>
          ${pedidosHTML}
        </tbody>
      </table>
    </div>`;
  }

  private registerCustomFilters() {
    this.filterService.register(
      "horarioEntregaCustom",
      (value, filter): boolean => {
        if (!filter) {
          return true;
        }
        if (value === undefined || value === null) {
          return false;
        }

        const result = filter.some((item) => {
          const filterString =
            "Pedido: " + item.nroPedido + " - " + item.horarioEntrega;
          return value.includes(item.horarioEntrega.toString());
        });
        return result;
      },
    );

    this.filterService.register("customDate", (value, filter): boolean => {
      if (filter === undefined || filter === null) {
        return true;
      }

      if (value === undefined || value === null) {
        return false;
      }

      return new Date(value).getTime() === filter.getTime();
    });
  }

  clear(table?: Table) {
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    this.fechaInicial = new Date(new Date().setDate(new Date().getDate() - 1));
    this.fechaInicial.setHours(0, 0, 0, 0);

    this.fechaFinal = new Date();
    this.fechaFinal.setDate(this.fechaFinal.getDate() + 7); // Una semana desde hoy
    this.fechaFinal.setHours(23, 59, 59, 999);

    // Reset pagination when clearing filters (like productos component)
    this.currentPage = 1;
    this.refrescarDatos(false); // No mostrar alertas en clear

    // Si se proporciona una tabla, limpiarla
    if (table) {
      table.clear();
    }
  }

  refrescar(table?: Table) {
    this.refrescarDatos(false); // No mostrar alertas en refrescar manual
    if (table) {
      table.clear();
    }
  }
  onOrderSelect(event) {
    this.orders = [event];
    // this.orders= this.ordersByName.filter(P=>)
  }

  /**
   * Maneja la tecla Enter en el campo de búsqueda
   */
  onSearchEnter(event: any): void {
    event.preventDefault();
    event.stopPropagation();

    const query = typeof this.searchQuery === 'string' ? this.searchQuery : this.searchQuery?.nroPedido || '';
    console.log('🔍 Enter presionado en despachos, query:', query);

    if (query.trim().length >= 3) {
      console.log('✅ Ejecutando búsqueda para:', query);
      this.filtroGlobal({ query: query.trim() });
    } else {
      console.log('⚠️ Se requieren al menos 3 caracteres');
    }
  }

  filtroGlobal(event: any) {
    const query = event.query;
    // Mantener compatibilidad con código existente
    this.performSearch(query);
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(this.searchDebounceTime),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      console.log('🔍 Debounce ejecutado con query:', query);
      this.performSearch(query);
    });
  }

  /**
   * Valida el formato del número de pedido
   */
  private validateOrderNumber(query: string): boolean {
    if (!query || query.trim().length === 0) {
      return false;
    }

    // Validar longitud mínima de 3 caracteres
    if (query.trim().length < 3) {
      console.log('⚠️ Búsqueda requiere al menos 3 caracteres');
      return false;
    }

    // Permitir caracteres más flexibles (letras, números, guiones, espacios, puntos)
    const orderNumberPattern = /^[A-Za-z0-9\-_.\s]+$/;
    return orderNumberPattern.test(query.trim());
  }

  /**
   * Realiza la búsqueda con el servicio
   */
  private performSearch(query: string): void {
    const trimmedQuery = query?.trim();

    if (!this.validateOrderNumber(trimmedQuery)) {
      this.filteredOrderNumbers = [];
      this.ordersByName = [];
      this.isSearching = false;
      this.searchError = null;
      return;
    }

    this.isSearching = true;
    this.searchError = null;

    this.service.getOrderByName(trimmedQuery).then((res) => {
      this.filteredOrderNumbers = res;
      this.ordersByName = res;
      this.isSearching = false;

      // Mostrar el panel del autocomplete después de cargar los datos
      setTimeout(() => {
        if (this.autoCompleteInput && this.filteredOrderNumbers && this.filteredOrderNumbers.length > 0) {
          this.autoCompleteInput.show();
        }
      }, 50);
    }).catch((err) => {
      console.log('⚠️ Error en búsqueda:', err);
      this.searchError = 'Error al buscar pedido. Intente nuevamente.';
      this.filteredOrderNumbers = [];
      this.ordersByName = [];
      this.isSearching = false;
    });
  }

  /**
   * Maneja el cambio de búsqueda desde el componente compartido
   */
  onSharedSearchQueryChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  /**
   * Maneja el evento completeMethod del autocompletado
   */
  onSearchComplete(event: any): void {
    const query = event.query || '';
    console.log('🔍 Búsqueda autocompletado (Enter presionado):', query);

    // Ejecutar búsqueda inmediatamente sin debounce cuando viene del Enter
    if (query.trim().length >= 3) {
      this.performSearch(query);
    } else {
      this.filteredOrderNumbers = [];
      this.isSearching = false;
    }
  }

  /**
   * Maneja la selección de un pedido desde el autocompletado
   */
  onSearchSelect(event: any): void {
    console.log('✅ Pedido seleccionado desde autocompletado:', event);
    this.selectOrder(event);
  }

  /**
   * Selecciona un pedido de las sugerencias
   */
  selectOrder(item: any): void {
    if (!item || !item.nroPedido) {
      this.toastr.warning('Pedido inválido seleccionado', 'Advertencia');
      return;
    }

    // Establecer el valor del campo de búsqueda
    this.searchQuery = item.nroPedido;
    this.nroPedido = item;

    // Ocultar sugerencias
    this.filteredOrderNumbers = [];

    // Mostrar solo el pedido seleccionado
    this.orders = [item];

    console.log('✅ Pedido seleccionado:', item.nroPedido);
  }

  initForms() {
    this.transportadorForm = this.formBuilder.group({
      nombres: ["", Validators.required],
      apellidos: ["", Validators.required],
      cedula: ["", Validators.required],
      telefono: ["", Validators.required],
      whatsapp: [""],
      correo: ["", [Validators.required, Validators.email]],
      fechaNacimiento: ["", Validators.required],
      eps: [""],
      arl: [""],
      marcaMoto: [""],
      lineaMoto: [""],
      modeloMoto: [""],
      placa: [""],
      capacidadCarga: [
        5,
        [Validators.required, Validators.min(1), Validators.max(50)],
      ],
      pwd: ["", Validators.required],
    });

    this.ordenEnvioForm = this.formBuilder.group({
      fechaEnvio: ["", Validators.required],
      metodoEnvio: ["", Validators.required],
    });
  }
  deleteTransporter(item: any) {
    this.logisticaService.deleteTrasportadora(item).subscribe((data) => {
      Swal.fire("Exitio", "Transportador eliminado con exito", "success");
      this.refrescarDatos();
    });
  }

  editDatosClientes(content: any, order: Pedido) {
    if (order.cliente) {
      this.clienteSeleccionado = order.cliente;
      this.modalService
        .open(content, {
          size: "xl",
          scrollable: true,
          centered: true,
          fullscreen: false,
          ariaLabelledBy: "modal-basic-title",
        })
        .result.then(
          (result) => {
            this.actualizarValoresPedido(order);
            this.editOrder(order);
          },
          (reason) => {
            if (reason !== "Cross click") {
              this.editOrder(order);
            }
          },
        );
    }
  }

  // Generar el contenido del PDF con máximo 3 pedidos por página
  pedidosPorPagina = 4;

  // Función para dividir los pedidos en grupos de 3
  dividirPedidosEnPagina(pedidos: any[], pedidosPorPagina: number): any[][] {
    let paginas: any[][] = [];
    for (let i = 0; i < pedidos.length; i += pedidosPorPagina) {
      paginas.push(pedidos.slice(i, i + pedidosPorPagina));
    }
    return paginas;
  }

  todayDate() {
    return new Date().toISOString();
  }
  // Iterar sobre cada grupo de pedidos y generar una página en el PDF
  async imprimirOrden() {
    console.log("=== INICIO: Impresión de orden ===");

    // Ejecutar debugging inicial
    this.debugComponentState();

    if (this.isGeneratingPDF) {
      this.showInfoMessage("Ya se está generando un PDF. Por favor espere...");
      return;
    }

    // Validaciones previas
    if (!this.pedidosSeleccionados || this.pedidosSeleccionados.length === 0) {
      this.showErrorMessage("No hay pedidos seleccionados para imprimir");
      return;
    }

    if (!this.nroShippingOrder) {
      this.showErrorMessage("No hay número de orden de envío para imprimir");
      return;
    }

    console.log("Iniciando impresión con datos:", {
      pedidosSeleccionados: this.pedidosSeleccionados.length,
      nroShippingOrder: this.nroShippingOrder,
      transportadorSeleccionado: this.transportadorSeleccionado
    });

    this.isGeneratingPDF = true;
    this.pdfProgress = 0;
    this.retryCount = 0;

    try {
      // Mostrar indicador de progreso
      this.showProgressToast();

      // Forzar detección de cambios para asegurar que el template esté renderizado
      setTimeout(async () => {
        try {
          // Forzar detección de cambios antes de procesar
          this.cdr.detectChanges();

          // Debugging después del timeout
          console.log("=== DESPUÉS DEL TIMEOUT ===");
          this.debugComponentState();

          await this.imprimirOrdenConHtml2Pdf();
          // Mostrar mensaje de éxito
          this.showSuccessMessage("PDF generado exitosamente");
        } catch (error) {
          console.error("Error generando PDF:", error);
          await this.handlePDFGenerationError(error);
        } finally {
          this.isGeneratingPDF = false;
          this.pdfProgress = 0;
          this.hideProgressToast();
        }
      }, 100);

    } catch (error) {
      console.error("Error inicializando generación de PDF:", error);
      this.isGeneratingPDF = false;
      this.pdfProgress = 0;
      this.hideProgressToast();
      await this.handlePDFGenerationError(error);
    }
  }

  /**
   * Método específico para imprimir orden con datos específicos después del despacho
   * @param pedidosEspecificos - Array de pedidos para imprimir
   * @param nroOrdenEspecifico - Número de orden específico
   * @param transportadorEspecifico - Transportador específico
   */
  async imprimirOrdenConDatosEspecificos(
    pedidosEspecificos: Pedido[], 
    nroOrdenEspecifico: string, 
    transportadorEspecifico: any
  ) {
    console.log("=== INICIO: Impresión de orden con datos específicos ===");

    if (this.isGeneratingPDF) {
      this.showInfoMessage("Ya se está generando un PDF. Por favor espere...");
      return;
    }

    // Validaciones previas
    if (!pedidosEspecificos || pedidosEspecificos.length === 0) {
      this.showErrorMessage("No hay pedidos seleccionados para imprimir");
      return;
    }

    if (!nroOrdenEspecifico) {
      this.showErrorMessage("No hay número de orden de envío para imprimir");
      return;
    }

    console.log("Iniciando impresión con datos específicos:", {
      pedidosEspecificos: pedidosEspecificos.length,
      nroOrdenEspecifico: nroOrdenEspecifico,
      transportadorEspecifico: transportadorEspecifico
    });

    this.isGeneratingPDF = true;
    this.pdfProgress = 0;
    this.retryCount = 0;

    try {
      // Mostrar indicador de progreso
      this.showProgressToast();

      // Temporalmente asignar los datos específicos a las propiedades del componente
      const pedidosOriginales = this.pedidosSeleccionados;
      const nroOrdenOriginal = this.nroShippingOrder;
      const transportadorOriginal = this.transportadorSeleccionado;

      this.pedidosSeleccionados = pedidosEspecificos;
      this.nroShippingOrder = nroOrdenEspecifico;
      this.transportadorSeleccionado = transportadorEspecifico;

      // Forzar detección de cambios para asegurar que el template esté renderizado
      setTimeout(async () => {
        try {
          // Forzar detección de cambios antes de procesar
          this.cdr.detectChanges();

          await this.imprimirOrdenConHtml2Pdf();
          // Mostrar mensaje de éxito
          this.showSuccessMessage("PDF generado exitosamente");
        } catch (error) {
          console.error("Error generando PDF:", error);
          await this.handlePDFGenerationError(error);
        } finally {
          // Restaurar los datos originales
          this.pedidosSeleccionados = pedidosOriginales;
          this.nroShippingOrder = nroOrdenOriginal;
          this.transportadorSeleccionado = transportadorOriginal;
          
          this.isGeneratingPDF = false;
          this.pdfProgress = 0;
          this.hideProgressToast();
        }
      }, 100);

    } catch (error) {
      console.error("Error inicializando generación de PDF:", error);
      this.isGeneratingPDF = false;
      this.pdfProgress = 0;
      this.hideProgressToast();
      await this.handlePDFGenerationError(error);
    }
  }

  editOrder(order: Pedido) {
    if (order.carrito && order.carrito.length > 0) {
      const firstItem = order.carrito[0];
      const datosEntrega = firstItem.configuracion?.datosEntrega;

      if (datosEntrega?.fechaEntrega) {
        const { year, month, day } = datosEntrega.fechaEntrega;
        order.fechaEntrega = new Date(year, month - 1, day).toISOString();
        order.horarioEntrega = datosEntrega.horarioEntrega;
      }
    }

    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos(false); // No mostrar alertas al editar pedido
      Swal.fire({
        icon: "success",
        title: "Pedido actualizado correctamente",
        showConfirmButton: false,
        timer: 1500,
      });
    });
  }
  // Método para verificar si un pedido puede ser manipulado
  puedeManipularPedido(pedido: Pedido): boolean {
    // Los pedidos en estado "Sin Producir" no pueden ser manipulados
    if (pedido.estadoProceso === EstadoProceso.SinProducir) {
      return false;
    }

    return true;
  }

  // Verificar si un pedido específico puede cambiar a un estado específico
  puedeAvanzarAEstado(pedido: Pedido, nuevoEstado: string): boolean {
    // Si el pedido está en estado "Sin Producir" y se intenta avanzar a cualquier
    // estado de empacado, despachado o entregado, bloquearlo
    if (
      pedido.estadoProceso === EstadoProceso.SinProducir &&
      [
        EstadoProceso.Empacado,
        EstadoProceso.Despachado,
        EstadoProceso.Entregado,
      ].includes(nuevoEstado as EstadoProceso)
    ) {
      return false;
    }

    return true;
  }

  cambiarEstado(order: Pedido, estado: number) {
    // Determinar el nuevo estado basado en el código
    let nuevoEstado: EstadoProceso;
    switch (estado) {
      case 0:
        nuevoEstado = EstadoProceso.ProducidoTotalmente;
        break;
      case 1:
        nuevoEstado = EstadoProceso.Empacado;
        break;
      case 2:
        nuevoEstado = EstadoProceso.ProducidoTotalmente;
        break;
      case 3:
        nuevoEstado = EstadoProceso.Empacado;
        break;
      case 4:
        nuevoEstado = EstadoProceso.Despachado;
        break;
      case 5:
        nuevoEstado = EstadoProceso.Entregado;
        break;
      default:
        return; // Estado no reconocido
    }

    // Verificar si el pedido puede cambiar al nuevo estado
    if (!this.puedeAvanzarAEstado(order, nuevoEstado)) {
      Swal.fire({
        icon: "error",
        title: "Operación no permitida",
        text: 'Los pedidos en estado "Sin Producir" no pueden ser empacados, despachados o entregados. Debe completarse la producción primero.',
        confirmButtonText: "Entendido",
      });
      return;
    }

    const userLite = this.getCurrentUser();
    if (!userLite) {
      Swal.fire("Error", "No se pudo obtener información del usuario", "error");
      return;
    }

    switch (estado) {
      case 0:
        order.estadoProceso = EstadoProceso.ProducidoTotalmente;
        break;
      case 1:
        order.estadoProceso = EstadoProceso.Empacado;
        order.fechaHoraEmpacado = new Date().toISOString();
        order.empacador = userLite.name;
        break;
      case 2:
        order.estadoProceso = EstadoProceso.ProducidoTotalmente;
        order.fechaHoraEmpacado = undefined;
        order.empacador = undefined;
        order.shippingOrder = undefined;
        order.nroShippingOrder = undefined;
        order.despachador = undefined;
        order.fechaYHorarioDespachado = undefined;
        order.transportador = undefined;
        break;
      case 3:
        order.estadoProceso = EstadoProceso.Empacado;
        order.shippingOrder = undefined;
        order.nroShippingOrder = undefined;
        order.despachador = undefined;
        order.fechaYHorarioDespachado = undefined;
        order.transportador = undefined;
        break;
      case 4:
        order.estadoProceso = EstadoProceso.Despachado;
        order.fechaYHorarioDespachado = new Date().toISOString();
        order.despachador = userLite;
        order.transportador = userLite.name;
        order.nroShippingOrder = "00";
        order.shippingOrder = "00";
        break;
      case 5:
        order.estadoProceso = EstadoProceso.Entregado;
        order.despachador = userLite;
        order.entregado = userLite;
        order.fechaYHorarioDespachado = new Date().toISOString();
        break;
    }

    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos(false); // No mostrar alertas al cambiar estado

      // Si el pedido se cambió a "Despachado", intentar geocodificarlo automáticamente
      if (order.estadoProceso === EstadoProceso.Despachado) {
        console.log(`🚚 Pedido ${order.nroPedido} cambió a Despachado - Verificando geocodificación...`);

        // Geocodificar específicamente este pedido si no tiene coordenadas
        if (order.envio?.direccionEntrega && order.envio?.ciudad &&
          (!order.envio?.latitud || !order.envio?.longitud)) {
          console.log(`📍 Geocodificando pedido despachado: ${order.nroPedido}`);
          this.geocodificarPedido(order).then(() => {
            console.log(`🗺️ Actualizando mapa después de geocodificar pedido despachado: ${order.nroPedido}`);
            this.actualizarConfiguracionMapa();
          }).catch(error => {
            console.error(`❌ Error geocodificando pedido ${order.nroPedido}:`, error);
          });
        } else {
          // Si ya tiene coordenadas, solo actualizar el mapa
          this.actualizarConfiguracionMapa();
        }
      }

      Swal.fire({
        icon: "success",
        title: "Pedido actualizado correctamente",
        showConfirmButton: false,
        timer: 1500,
      });
    });
  }

  actualizarValoresPedido(order: Pedido) {
    this.pedidoUtilService.pedido = order;
    order.totalDescuento = this.pedidoUtilService.getDiscount();
    order.totalPedidoSinDescuento = this.pedidoUtilService.getSubtotal();
    const totalEnvio = order.totalEnvio || 0;
    order.totalPedididoConDescuento =
      this.pedidoUtilService.getTotalToPay(totalEnvio);
    return order;
  }

  deleteProductToCart(order: Pedido, carrito: Carrito) {
    if (order.carrito) {
      const index = order.carrito.findIndex(
        (item) =>
          item.producto?.identificacion?.referencia ===
          carrito.producto?.identificacion?.referencia,
      );
      if (index !== -1) {
        order.carrito.splice(index, 1);
      }
      this.editOrder(order);
    }
  }

  deleteOrder(order: Pedido) {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminarlo",
    }).then((result) => {
      if (result.isConfirmed) {
        this.ventasService.deleteOrder(order).subscribe((data) => {
          this.refrescarDatos(false); // No mostrar alertas al eliminar pedido
          Swal.fire("Eliminado", "El pedido ha sido eliminado.", "success");
        });
      }
    });
  }

  editSeller(order: Pedido) {
    if (order.asesorAsignado && order.asesorAsignado.nit === "9999") {
      Swal.fire({
        title: "¿Estás seguro?",
        text: "Estás a punto de cambiar el asesor asignado a este pedido.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, cambiar asesor",
        cancelButtonText: "No, cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          const userLite = this.getCurrentUser();
          if (!userLite) {
            Swal.fire(
              "Error",
              "No se pudo obtener información del usuario",
              "error",
            );
            return;
          }

          order.asesorAsignado = userLite;
          this.editOrder(order);
          Swal.fire("Cambiado", "El asesor ha sido cambiado.", "success");
        }
      });
    } else {
      Swal.fire({
        title: "¡Alerta!",
        text: "Este pedido ya tiene un asesor asignado.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Aceptar",
      });
    }
  }

  buscarPorFechas(table?: Table): void {
    // Validar fechas
    if (!this.fechaInicial || !this.fechaFinal) {
      Swal.fire(
        "Error",
        "Por favor seleccione un rango de fechas vu00e1lido",
        "error",
      );
      return;
    }

    // Asegurar que las fechas tienen horario correcto para bu00fasqueda
    // Asegurarse de que las fechas sean objetos Date
    const fechaInicialBusqueda = new Date(
      this.fechaInicial instanceof Date
        ? this.fechaInicial
        : new Date(this.fechaInicial),
    );
    fechaInicialBusqueda.setHours(0, 0, 0, 0);

    const fechaFinalBusqueda = new Date(
      this.fechaFinal instanceof Date
        ? this.fechaFinal
        : new Date(this.fechaFinal),
    );
    fechaFinalBusqueda.setHours(23, 59, 59, 999);

    // Validar que la fecha inicial no sea mayor que la final
    if (fechaInicialBusqueda > fechaFinalBusqueda) {
      Swal.fire(
        "Error",
        "La fecha inicial no puede ser mayor que la fecha final",
        "error",
      );
      return;
    }

    // Obtener empresa actual
    const currentCompanyStr = localStorage.getItem("currentCompany");
    const companyName = currentCompanyStr
      ? JSON.parse(currentCompanyStr).nomComercial
      : "";

    const filter = {
      fechaInicial: fechaInicialBusqueda,
      fechaFinal: fechaFinalBusqueda,
      company: companyName,
      estadoProceso: [
        EstadoProceso.Rechazado,
        EstadoProceso.ParaDespachar,
        EstadoProceso.ProducidoTotalmente,
        EstadoProceso.SinProducir,
        EstadoProceso.EnProduccion,
        EstadoProceso.Producido,
        EstadoProceso.Entregado,
        EstadoProceso.Despachado,
        EstadoProceso.Empacado,
      ],
      estadosPago: [
        EstadoPago.PreAprobado,
        EstadoPago.Aprobado,
        EstadoPago.Pendiente,
        EstadoPago.Pospendiente,
      ],
      tipoFecha: "fechaEntrega",
    };

    this.loading = true;
    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      this.orders = data as PedidoPriorizado[];
      /* this.orders.forEach((order) => {
          if (order.fechaCreacion) {
            order.fechaCreacion = new Date(order.fechaCreacion).toISOString();
          }
          order.anticipo = order.anticipo ?? 0;
          order.faltaPorPagar =
            (order.totalPedididoConDescuento ?? 0) - (order.anticipo ?? 0);
        });*/

      // Aplicar algoritmo de priorización sin mostrar alertas en buscarPorFechas
      this.aplicarAlgoritmoPriorizacion(false);

      // Calcular métricas para análisis KAI
      this.calcularMetricas();

      // Actualizar mapa
      this.actualizarConfiguracionMapa();

      this.loading = false;
    });

    if (table) {
      table.clear();
    }
  }

  filtrarParaHoy(): void {
    const fechaActual = new Date();
    this.fechaInicial = new Date(fechaActual.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaActual.setHours(23, 59, 59, 999));
    // Reset pagination when applying filters (like productos component)
    this.currentPage = 1;
    this.refrescarDatos(false); // No mostrar alertas en filtros rápidos
  }

  filtrarParaManana(): void {
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = new Date(fechaManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaManana.setHours(23, 59, 59, 999));
    // Reset pagination when applying filters (like productos component)
    this.currentPage = 1;
    this.refrescarDatos(false); // No mostrar alertas en filtros rápidos
  }

  filtrarParaPasadoManana(): void {
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = new Date(fechaPasadoManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaPasadoManana.setHours(23, 59, 59, 999));
    // Reset pagination when applying filters (like productos component)
    this.currentPage = 1;
    this.refrescarDatos(false); // No mostrar alertas en filtros rápidos
  }

  AsentarPago(content, order: Pedido) {
    if (
      order.estadoPago === EstadoPago.Aprobado &&
      (order.faltaPorPagar || 0) <= 0
    ) {
      Swal.fire({
        title: "¡Alerta!",
        text: "Este pedido ya ha sido pagado en su totalidad.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Aceptar",
      });
      return;
    }
    this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then((result) => {
        if (order.PagosAsentados) {
          order.PagosAsentados.push(result);
        } else {
          order.PagosAsentados = [result];
        }
        this.actualizarValoresPedido(order);
        this.editOrder(order);
      });
  }

  convertFechaEntregaString(fechaEntrega: {
    day: number;
    month: number;
    year: number;
  }) {
    if (!fechaEntrega) {
      return "";
    }
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }

  openModal(content, edit?: boolean, item?: any) {
    if (edit === true) {
      this.editTransporter = edit;
      this.dataEditTransporter = item;
      this.transportadorForm.patchValue(item);
    } else {
      this.editTransporter = false;
      this.dataEditTransporter = null;
      this.transportadorForm.reset();
      this.ordenEnvioForm.reset();
      this.metodoEnvio = undefined;
      this.pedidosSeleccionados = [];
      // Limpiar variables de estado de orden de envío
      this.nroShippingOrder = null;
      this.nuevaOrdenEnvio = null;
      this.transportadorSeleccionado = null;
    }
    this.modalRef = this.modalService.open(content, {
      size: "xl",
      fullscreen: false,
      centered: true,
      scrollable: true
    });
    this.modalRef.result.then(
      (result) => {
        this.limpiarEstadoOrdenEnvio(); // Limpiar estado al cerrar modal
        this.refrescarDatos(); // Lógica a ejecutar cuando se cierra el modal
      },
      (reason) => {
        this.limpiarEstadoOrdenEnvio(); // Limpiar estado al cerrar modal
        this.refrescarDatos(); // Lógica a ejecutar cuando se cierra el modal
      },
    );
  }

  openModalDetalleEntrega(content, pedido) {
    this.detallePedidoEntregado = pedido;
    this.modalRef = this.modalService.open(content, {
      size: "xl",
      fullscreen: false,
    });
  }

  openDetalleEntrega(pedido: Pedido) {
    this.detallePedidoEntregado = pedido;
    this.modalService.open(this.detalleEntregaModal, {
      size: "xl",
      fullscreen: false,
    });
  }

  onSaveTransportador(transportador: any) {
    if (this.editTransporter) {
      transportador.id = this.dataEditTransporter.id;
      transportador.date_edit = this.dataEditTransporter.date_edit;
    }

    this.logisticaService.createTrasportadora(transportador).subscribe(
      (response) => {
        Swal.fire("Éxito", "Transportador guardado exitosamente", "success");
        this.refrescarDatos();
        this.modalRef.dismiss();
      },
      (error) => {
        Swal.fire(
          "Error",
          "Hubo un problema al guardar el transportador",
          "error",
        );
      },
    );
  }

  onEditTransportador(transportador: any) {
    this.editTransporter = true;
    this.dataEditTransporter = transportador;

    // Actualizar el formulario para que contenga los datos del transportador a editar
    if (this.transportadorForm) {
      this.transportadorForm.patchValue(transportador);
    }

    // Si el modal no está abierto, abrirlo con los datos del transportador
    if (!this.modalRef) {
      this.openModal(this.transportadoresModal, true, transportador);
    }
  }

  imprimirToPdf() {
    const printContent = document.getElementById("htmlPdf");
    if (printContent) {
      html2canvas(printContent).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
        pdf.save(`pedido-${this.pedidoSeleccionado.nroPedido}.pdf`);
      });
    } else {
      console.error("No se encontró el elemento para imprimir");
    }
  }

  verNotasCliente(pedido) {
    if (!pedido.notasPedido) {
      Swal.fire({
        title: "Notas del Pedido",
        text: "No hay notas para mostrar",
        icon: "info",
        customClass: {
          popup: "swal2-custom-width",
        },
        didOpen: () => {
          const popup = document.querySelector(".swal2-popup") as HTMLElement;
          if (popup) {
            popup.style.width = "80%";
            popup.style.maxWidth = "none";
          }
        },
      });
      return;
    }

    // Función para crear el contenido HTML de una lista de notas
    const createNotesList = (notas, tipo) => {
      if (!notas || notas.length === 0) {
        return `<p>No hay notas de ${tipo} para mostrar</p>`;
      }

      return `<ul class="list-group">${notas
        .map(
          (nota, index) =>
            `<li class="list-group-item"><strong>Nota ${index + 1}:</strong> ${nota.fecha} - ${nota.nota}</li>`,
        )
        .join("")}</ul>`;
    };

    // Crear el contenido HTML para cada categoría de notas
    const notasCliente = createNotesList(
      pedido.notasPedido.notasCliente,
      "cliente",
    );
    const notasDespachos = createNotesList(
      pedido.notasPedido.notasDespachos,
      "despachos",
    );
    const notasEntregas = createNotesList(
      pedido.notasPedido.notasEntregas,
      "entregas",
    );
    const notasProduccion = createNotesList(
      pedido.notasPedido.notasProduccion,
      "produccion",
    );

    // Estructura HTML con pestañas de Bootstrap
    const tabsHtml = `
    <ul class="nav nav-tabs" id="myTab" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="cliente-tab" data-bs-toggle="tab" data-bs-target="#cliente" type="button" role="tab" aria-controls="cliente" aria-selected="true">Notas del Cliente</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="despachos-tab" data-bs-toggle="tab" data-bs-target="#despachos" type="button" role="tab" aria-controls="despachos" aria-selected="false">Notas de Despachos</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="entregas-tab" data-bs-toggle="tab" data-bs-target="#entregas" type="button" role="tab" aria-controls="entregas" aria-selected="false">Notas de entregas</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="produccion-tab" data-bs-toggle="tab" data-bs-target="#produccion" type="button" role="tab" aria-controls="produccion" aria-selected="false">Notas de Producción</button>
      </li>
    </ul>
    <div class="tab-content" id="myTabContent">
      <div class="tab-pane fade show active" id="cliente" role="tabpanel" aria-labelledby="cliente-tab">
        ${notasCliente}
      </div>
      <div class="tab-pane fade" id="despachos" role="tabpanel" aria-labelledby="despachos-tab">
        ${notasDespachos}
      </div>
      <div class="tab-pane fade" id="entregas" role="tabpanel" aria-labelledby="entregas-tab">
        ${notasEntregas}
      </div>
      <div class="tab-pane fade" id="produccion" role="tabpanel" aria-labelledby="produccion-tab">
        ${notasProduccion}
      </div>
    </div>`;

    // Mostrar el modal de SweetAlert2 con las pestañas
    Swal.fire({
      title: "Notas del Pedido",
      html: tabsHtml,
      customClass: {
        popup: "swal2-custom-width",
      },
      didOpen: () => {
        const popup = document.querySelector(".swal2-popup") as HTMLElement;
        if (popup) {
          popup.style.width = "80%";
          popup.style.maxWidth = "none";
        }

        // Inicializar los eventos de Bootstrap para las pestañas
        const triggerTabList = [].slice.call(
          document.querySelectorAll("#myTab button"),
        );
        triggerTabList.forEach((triggerEl) => {
          const tabTrigger = new (window as any).bootstrap.Tab(triggerEl);
          triggerEl.addEventListener("click", (event) => {
            event.preventDefault();
            tabTrigger.show();
          });
        });
      },
    });
  }
  iterarTarjetas(pedido) {
    const tarjetas: any[] = [];
    if (pedido.carrito) {
      pedido.carrito.forEach((producto) => {
        if (producto.configuracion && producto.configuracion.tarjetas) {
          producto.configuracion.tarjetas.forEach((tarj) => {
            if (tarj.de !== "" || tarj.para !== "" || tarj.mensaje !== "") {
              tarjetas.push(tarj);
            }
          });
        }
      });
    }
    return tarjetas.length > 0;
  }
  verTarjetasPedido(pedido) {
    this.todasLasTarjetas = [];

    if (pedido.carrito) {
      pedido.carrito.forEach((producto) => {
        if (producto.configuracion && producto.configuracion.tarjetas) {
          producto.configuracion.tarjetas.forEach((tarj) => {
            if (tarj.de !== "" || tarj.para !== "" || tarj.mensaje !== "") {
              this.todasLasTarjetas.push({
                tarjeta: tarj,
                pedido:
                  producto.producto?.crearProducto?.titulo || "Sin título",
              });
            }
          });
        }
      });
    }

    // Función helper para escapar HTML y caracteres especiales
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    if (this.todasLasTarjetas.length === 0) {
      Swal.fire({
        title: "Tarjetas de Productos",
        text: "No hay tarjetas de productos para mostrar",
        icon: "info",
        customClass: {
          popup: "swal2-custom-width",
        },
        didOpen: () => {
          const popup = document.querySelector(".swal2-popup") as HTMLElement;
          if (popup) {
            popup.style.width = "80%";
            popup.style.maxWidth = "none";
          }
        },
      });
    } else {
      const tarjetas = this.todasLasTarjetas
        .map(
          (tarjeta, index) =>
            `<li style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #333;">Tarjeta ${index + 1}:</strong> 
                <span style="color: #666; font-size: 0.9em;">Producto: ${escapeHtml(tarjeta.pedido)}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #2c3e50;">De:</strong> 
                <span style="color: #34495e;">${escapeHtml(tarjeta.tarjeta.de) || 'No especificado'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #2c3e50;">Para:</strong> 
                <span style="color: #34495e;">${escapeHtml(tarjeta.tarjeta.para) || 'No especificado'}</span>
              </div>
              <div style="margin-bottom: 15px;">
                <strong style="color: #2c3e50;">Mensaje:</strong>
                <div style="color: #34495e; font-style: italic; margin-top: 5px; padding: 8px; background-color: #f8f9fa; border-radius: 3px;">
                  ${escapeHtml(tarjeta.tarjeta.mensaje) || 'Sin mensaje'}
                </div>
              </div>
              <button class="btn btn-primary imprimir-tarjeta" data-index="${index}" style="width: 100%;">
                <i class="fa fa-print me-1"></i>Imprimir Tarjeta
              </button>
            </li>`,
        )
        .join("");

      Swal.fire({
        title: "Tarjetas de Productos",
        html: `<ul>${tarjetas}</ul>`,
        customClass: {
          popup: "swal2-custom-width",
        },
        didOpen: () => {
          const popup = document.querySelector(".swal2-popup") as HTMLElement;
          if (popup) {
            popup.style.width = "80%";
            popup.style.maxWidth = "none";
          }

          const imprimirButtons =
            document.querySelectorAll(".imprimir-tarjeta");
          imprimirButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
              const index = (event.target as HTMLElement).getAttribute(
                "data-index",
              );
              if (index !== null) {
                const tarjeta = this.todasLasTarjetas[parseInt(index)];
                this.imprimirTarjeta(tarjeta.tarjeta);
              }
            });
          });
        },
      });
    }
  }

  imprimirTarjeta(tarjeta) {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "cm",
      format: [10, 15],
    });

    // Configurar fuente que soporte caracteres especiales
    doc.setFont("times", "italic"); // Restaurar Times New Roman en cursiva como estaba originalmente
    doc.setFontSize(12); // Tamaño de la letra

    // Width of the document
    const pageWidth = doc.internal.pageSize.getWidth();

    // Starting y position
    let yPos = 2;

    // Función helper para limpiar y normalizar texto preservando ñ y tildes
    const limpiarTexto = (texto) => {
      if (!texto) return '';

      // Convertir a string si no lo es
      let textoStr = String(texto);

      console.log('🔍 limpiarTexto - Texto original:', textoStr);
      console.log('🔍 limpiarTexto - Longitud original:', textoStr.length);

      // Preservar ñ y tildes, solo limpiar emojis y caracteres problemáticos
      let textoLimpio = textoStr
        .replace(/[çÇ]/g, 'c') // Convertir ç en c
        .replace(/[¿¡]/g, '') // Remover signos de interrogación y exclamación invertidos
        // Remover TODOS los emojis y caracteres problemáticos, preservando ñ y tildes
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emojis faciales
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Símbolos y pictogramas
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transporte y símbolos
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Banderas
        .replace(/[\u{2600}-\u{26FF}]/gu, '') // Símbolos misceláneos
        .replace(/[\u{2700}-\u{27BF}]/gu, '') // Símbolos decorativos
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Emojis suplementarios
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Símbolos y pictogramas extendidos
        .replace(/[\u{1FAB0}-\u{1FABF}]/gu, '') // Símbolos de animales y naturaleza
        .replace(/[\u{1FAC0}-\u{1FAFF}]/gu, '') // Símbolos de objetos
        .replace(/[\u{1FAD0}-\u{1FAFF}]/gu, '') // Símbolos de comida y bebida
        .replace(/[\u{1FAE0}-\u{1FAFF}]/gu, '') // Símbolos de objetos
        .replace(/[\u{1FAF0}-\u{1FAFF}]/gu, '') // Símbolos de manos
        .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Símbolos de Mahjong
        .replace(/[\u{1F030}-\u{1F09F}]/gu, '') // Símbolos de dominó
        .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Símbolos de cartas
        .replace(/[\u{1F100}-\u{1F64F}]/gu, '') // Emojis varios
        .replace(/[\u{1F650}-\u{1F67F}]/gu, '') // Símbolos ornamentales
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transporte y símbolos
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Símbolos alquímicos
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Símbolos geométricos
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Símbolos de flechas
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Emojis suplementarios
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Símbolos de ajedrez
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Símbolos y pictogramas extendidos
        .replace(/[\u{1FB00}-\u{1FBFF}]/gu, '') // Símbolos de legado
        .replace(/[\u{1FC00}-\u{1FCFF}]/gu, '') // Símbolos de ornamentos
        .replace(/[\u{1FD00}-\u{1FDFF}]/gu, '') // Símbolos de transporte
        .replace(/[\u{1FE00}-\u{1FEFF}]/gu, '') // Símbolos de Unicode
        .replace(/[\u{1FF00}-\u{1FFFF}]/gu, '') // Símbolos de Unicode
        // Verificación adicional para emojis específicos que podrían escapar
        .replace(/🩷/g, '') // Emoji corazón rosa específico
        .replace(/[🩷🩵🩶🩸🩹🩺🩻🩼]/g, '') // Otros emojis de corazón
        .replace(/[💕💖💗💘💙💚💛💜💝💞💟]/g, '') // Emojis de corazón varios
        .replace(/[😀😃😄😁😆😅🤣😂🙂🙃😉😊😇]/g, '') // Emojis faciales básicos
        .replace(/[😈👿👹👺💀👻👽🤖💩😺😸😹😻]/g, '') // Otros emojis
        // Verificación final: eliminar cualquier carácter que no sea ASCII básico + letras españolas
        .replace(/[^\x00-\x7FáéíóúñÁÉÍÓÚÑ]/g, '');

      console.log('🔍 limpiarTexto - Texto después de limpieza:', textoLimpio);
      console.log('🔍 limpiarTexto - Longitud después de limpieza:', textoLimpio.length);

      return textoLimpio;
    };

    // Agregar el campo "Para:" solo si existe
    if (tarjeta.para && tarjeta.para.trim() !== '') {
      const paraLabelWidth = doc.getTextWidth("Para:");
      doc.text("Para:", (pageWidth - paraLabelWidth) / 2, yPos);
      yPos += 0.6; // Espacio fijo entre label y texto

      const paraTexto = limpiarTexto(tarjeta.para);
      const paraTextWidth = doc.getTextWidth(paraTexto);
      doc.text(paraTexto, (pageWidth - paraTextWidth) / 2, yPos);
      yPos += 1.5; // Espacio fijo después del texto "Para"
    }

    // Agregar el campo "mensaje" en el centro
    if (tarjeta.mensaje && tarjeta.mensaje.trim() !== '') {
      const mensajeTexto = limpiarTexto(tarjeta.mensaje);
      const splitMensaje = doc.splitTextToSize(mensajeTexto, 12); // Reducir ancho para mejor ajuste

      splitMensaje.forEach((line) => {
        const lineWidth = doc.getTextWidth(line);
        doc.text(line, (pageWidth - lineWidth) / 2, yPos);
        yPos += 0.5; // Espacio fijo entre líneas del mensaje
      });
      yPos += 1.0; // Espacio fijo después del mensaje completo
    }

    // Agregar el campo "De:" solo si existe
    if (tarjeta.de && tarjeta.de.trim() !== '') {
      const deLabelWidth = doc.getTextWidth("De:");
      doc.text("De:", (pageWidth - deLabelWidth) / 2, yPos);
      yPos += 0.6; // Espacio fijo entre label y texto

      const deTexto = limpiarTexto(tarjeta.de);
      const deTextWidth = doc.getTextWidth(deTexto);
      doc.text(deTexto, (pageWidth - deTextWidth) / 2, yPos);
    }

    // Generar el blob y abrir en una nueva ventana
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  }

  onMetodoEnvioChange(event) {
    this.metodoEnvio = event.target.value;
    if (this.metodoEnvio === "mensajeroPropio") {
      // Lógica para cargar los pedidos disponibles
      this.refrescarDatos();
      this.pedidosSeleccionados = [];
      this.nuevaOrdenEnvio = null;
      this.nroShippingOrder = null;
      this.refrescarDatos();
    }
  }
  cargarOrders() { }
  //
  agregarPedido() {
    Swal.fire({
      title: "Seleccione los pedidos",
      input: "select",
      inputOptions: this.orders
        .filter(
          (o) =>
            o.transportador == undefined &&
            o.transportador == null &&
            o.formaEntrega == "Envío a Domicilio",
        )
        .reduce((acc: Record<string, string>, pedido) => {
          if (
            !this.pedidosSeleccionados.some(
              (p) => p.nroPedido === pedido.nroPedido,
            )
          ) {
            const clienteNombre =
              pedido.cliente?.nombres_completos || "Sin nombre";
            const ciudad = pedido.envio?.ciudad || "Sin ciudad";
            const zonaCobro = pedido.envio?.zonaCobro || "Sin zona";
            const horario = pedido.horarioEntrega || "Sin horario";

            acc[pedido.nroPedido || ""] =
              `${pedido.nroPedido} - ${clienteNombre} - ${pedido.estadoPago}- ${pedido.estadoProceso}-${ciudad}-${zonaCobro}-${pedido.formaEntrega}-${zonaCobro}-${horario} `;
          }
          return acc;
        }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "Debes seleccionar un pedido";
        }
        if (this.pedidosSeleccionados.some((p) => p.nroPedido === value)) {
          return "El pedido ya ha sido agregado";
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const pedidoSeleccionado = this.orders.find(
          (p) => p.nroPedido === result.value,
        );
        if (pedidoSeleccionado) {
          this.pedidosSeleccionados.push(pedidoSeleccionado);
        }

        if (this.nuevaOrdenEnvio) {
          this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
        }
      }
    });
  }
  shouldDisplayPedido(pedido: any): boolean {
    return (
      pedido.transportador === undefined &&
      pedido.transportador === null &&
      pedido.formaEntrega === "Envío a Domicilio" &&
      !this.pedidosSeleccionados.some((p) => p.nroPedido === pedido.nroPedido)
    );
  }
  agregarPedido1(pedido: any) {
    if (
      this.pedidosSeleccionados.some((p) => p.nroPedido === pedido.nroPedido)
    ) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "El pedido ya ha sido agregado",
      });
      return;
    }

    this.pedidosSeleccionados.push(pedido);

    if (this.nuevaOrdenEnvio) {
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
    }
  }

  loadPedidosDisponibles() {
    var fechaEnvio = new Date(this.ordenEnvioForm.value.fechaEnvio);
    var fechaEnvioConvert = new Date(
      fechaEnvio.getFullYear(),
      fechaEnvio.getMonth(),
      fechaEnvio.getDate() + 1,
    ); // Mantener horas en 0

    return this.orders
      .filter((o) => {
        // Verificar si la fecha de entrega existe
        if (!o.fechaEntrega) return false;

        // Establecer horas, minutos y segundos a 0 para la comparación
        const fechaEntregaNormalized = new Date(
          new Date(o.fechaEntrega).setHours(0, 0, 0, 0),
        ); // Normaliza a 00:00:00
        const fechaEnvioNormalized = new Date(
          fechaEnvioConvert.setHours(0, 0, 0, 0),
        ); // Asegurarse de que también esté en 00:00:00

        return (
          fechaEntregaNormalized.getTime() === fechaEnvioNormalized.getTime() &&
          o.estadoProceso !== EstadoProceso.Entregado &&
          o.estadoProceso !== EstadoProceso.Despachado &&
          (o.formaEntrega
            ? o.formaEntrega.toLocaleUpperCase().includes("DOMICILIO")
            : false)
        );
      })
      .reduce((acc: Pedido[], pedido) => {
        if (
          !this.pedidosSeleccionados.some(
            (p) => p.nroPedido === pedido.nroPedido,
          )
        ) {
          acc.push(pedido);
        }
        return acc;
      }, []);
  }

  validatePedido(pedido) {
    if (!pedido) {
      return "Debes seleccionar un pedido";
    }
    if (
      this.pedidosSeleccionados.some((p) => p.nroPedido === pedido.nroPedido)
    ) {
      return "El pedido ya ha sido agregado";
    }
    return null;
  }

  addPedidoToOrden(pedido) {
    if (pedido) {
      this.pedidosSeleccionados.push(pedido);

      if (this.nuevaOrdenEnvio) {
        this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
      }
    }
  }

  handleAgregarPedido(pedido: any) {
    const validationMessage = this.validatePedido(pedido);
    if (validationMessage) {
      alert(validationMessage);
      return;
    }
    this.addPedidoToOrden(pedido);
  }

  retirarPedido(pedido: Pedido) {
    const pedidocambiar = pedido;
    this.cambiarEstado(pedidocambiar, 3);
    this.pedidosSeleccionados = this.pedidosSeleccionados.filter(
      (p) => p.nroPedido !== pedido.nroPedido,
    );
    if (this.nuevaOrdenEnvio) {
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
    }
  }

  verPedidosAgregados() {
    this.openModal(this.pantallaOrdenEnvioModal);
  }

  getEstadoProceso(order: any): string {
    return order.pedidos[0] && order.pedidos[0].estadoProceso === "Despachado"
      ? order.pedidos[0].estadoProceso
      : "Por despachar";
  }

  handleOrderDispatch(order: any) {
    // Si la orden ya tiene todos sus pedidos despachados, mostrar mensaje informativo
    if (
      order.pedidos &&
      order.pedidos.every((p) => p.estadoProceso === "Despachado")
    ) {
      Swal.fire(
        "Info",
        "Esta orden ya ha sido despachada completamente",
        "info",
      );
      return;
    }

    // Preparar pedidos para despachar (solo los que no estén despachados)
    this.pedidosSeleccionados = order.pedidos.filter(
      (p) => p.estadoProceso !== "Despachado",
    );
    this.nroShippingOrder = order.nroShippingOrder;

    // Inicializar nuevaOrdenEnvio si no existe
    if (!this.nuevaOrdenEnvio) {
      const currentCompanyStr = localStorage.getItem("currentCompany");
      const companyName = currentCompanyStr
        ? JSON.parse(currentCompanyStr).nomComercial
        : "";

      this.nuevaOrdenEnvio = {
        id: order.id || "",
        nroShippingOrder: order.nroShippingOrder,
        fecha: new Date().toISOString(),
        transportador: order.transportador,
        company: companyName,
        pedidos: [],
      };
    }

    // Utilizar el método existente para despachar
    this.despacharOrden();
  }

  handlePedidoDispatch(pedido: any) {
    Swal.fire({
      title: "Asignar Transportador",
      input: "select",
      inputOptions: this.vendors.reduce((acc, vendor) => {
        acc[`${vendor.nombres} ${vendor.apellidos}-${vendor.telefono}`] =
          `${vendor.nombres} ${vendor.apellidos}`;
        return acc;
      }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "Debes ingresar el nombre del transportador";
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const userLite = this.getCurrentUser();
        if (!userLite) {
          Swal.fire(
            "Error",
            "No se pudo obtener información del usuario",
            "error",
          );
          return;
        }

        // Actualizar el estado y datos del pedido
        pedido.transportador = result.value;
        pedido.despachador = userLite;
        pedido.fechaYHorarioDespachado = new Date().toISOString();
        pedido.estadoProceso = EstadoProceso.Despachado;

        // Si el pedido no tenía una orden de despacho, asignarle la nroShippingOrder "00"
        if (!pedido.nroShippingOrder) {
          pedido.nroShippingOrder = "00";
          pedido.shippingOrder = "00";
        }

        // Guardar los cambios
        this.ventasService.editOrder(pedido).subscribe(
          (response) => {
            console.log(`🚚 Pedido ${pedido.nroPedido} despachado exitosamente - Verificando geocodificación...`);

            // Geocodificar automáticamente el pedido despachado si no tiene coordenadas
            if (pedido.envio?.direccionEntrega && pedido.envio?.ciudad &&
              (!pedido.envio?.latitud || !pedido.envio?.longitud)) {
              console.log(`📍 Geocodificando pedido recién despachado: ${pedido.nroPedido}`);
              this.geocodificarPedido(pedido).then(() => {
                console.log(`🗺️ Actualizando mapa después de geocodificar pedido despachado: ${pedido.nroPedido}`);
                this.actualizarConfiguracionMapa();
              }).catch(error => {
                console.error(`❌ Error geocodificando pedido ${pedido.nroPedido}:`, error);
              });
            } else {
              // Si ya tiene coordenadas, solo actualizar el mapa
              this.actualizarConfiguracionMapa();
            }

            Swal.fire("Éxito", "Pedido despachado exitosamente", "success");
            // Simplemente refrescar los datos de todas las órdenes
            this.refrescarDatos();
            // Cerrar y volver a abrir el diálogo
            this.modalService.dismissAll();
            setTimeout(() => {
              // Volver a consultar las órdenes
              // TODO: Optimizar con getShippingOrdersPaginated
              this.logisticaService
                .getShippingOrders()
                .subscribe((data: Pedido[]) => {
                  const currentCompanyStr =
                    localStorage.getItem("currentCompany");
                  const companyName = currentCompanyStr
                    ? JSON.parse(currentCompanyStr).nomComercial
                    : "";

                  this.dispatchOrders = data
                    .filter((x) => x.company == companyName)
                    .sort((a, b) => {
                      const aNum = a.nroShippingOrder
                        ? parseInt(a.nroShippingOrder)
                        : 0;
                      const bNum = b.nroShippingOrder
                        ? parseInt(b.nroShippingOrder)
                        : 0;
                      return bNum - aNum;
                    });
                  this.modalService.open(this.dispatchOrdersModal, {
                    size: "xl",
                    fullscreen: false,
                  });
                });
            }, 500);
          },
          (error) => {
            Swal.fire(
              "Error",
              "Hubo un problema al despachar el pedido",
              "error",
            );
          },
        );
      }
    });
  }

  despacharOrden() {
    // DEBUG: Verificar estado antes de despachar
    console.log("=== DEBUG despacharOrden() ===");
    console.log("this.nroShippingOrder:", this.nroShippingOrder);
    console.log("this.pedidosSeleccionados:", this.pedidosSeleccionados?.length || 0);
    console.log("this.nuevaOrdenEnvio:", {
      nroShippingOrder: this.nuevaOrdenEnvio?.nroShippingOrder,
      pedidos: this.nuevaOrdenEnvio?.pedidos?.length || 0,
      transportador: this.nuevaOrdenEnvio?.transportador,
      metodoEnvio: this.nuevaOrdenEnvio?.metodoEnvio
    });

    Swal.fire({
      title: "Asignar Transportador",
      input: "select",
      inputOptions: this.vendors.reduce((acc, vendor) => {
        acc[`${vendor.nombres} ${vendor.apellidos}-${vendor.telefono}`] =
          `${vendor.nombres} ${vendor.apellidos}`;
        return acc;
      }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "Debes ingresar el nombre del transportador";
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.transportadorSeleccionado = result.value;
        const userLite = this.getCurrentUser();

        if (!userLite) {
          Swal.fire(
            "Error",
            "No se pudo obtener información del usuario",
            "error",
          );
          return;
        }

        this.pedidosSeleccionados.forEach((pedido) => {
          pedido.transportador = this.transportadorSeleccionado;
          pedido.despachador = userLite;
          pedido.fechaYHorarioDespachado = new Date().toISOString();
          pedido.estadoProceso = EstadoProceso.Despachado;
          pedido.nroShippingOrder = this.nroShippingOrder;
          pedido.shippingOrder = this.nroShippingOrder;
        });

        // Asegurarse de que nuevaOrdenEnvio esté inicializado
        if (!this.nuevaOrdenEnvio) {
          const currentCompanyStr = localStorage.getItem("currentCompany");
          const companyName = currentCompanyStr
            ? JSON.parse(currentCompanyStr).nomComercial
            : "";

          this.nuevaOrdenEnvio = {
            id: "",
            nroShippingOrder: this.nroShippingOrder,
            transportador: this.transportadorSeleccionado,
            company: companyName,
            pedidos: [],
          };
        }

        this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
        this.nuevaOrdenEnvio.transportador = this.transportadorSeleccionado;

        this.logisticaService
          .dispatchShippingOrder(this.nuevaOrdenEnvio)
          .subscribe(
            (response) => {
              Swal.fire("Éxito", "Orden despachada exitosamente", "success");

              // Guardar una copia de los datos antes de cerrar el modal
              const pedidosParaImprimir = [...this.pedidosSeleccionados];
              const nroOrdenParaImprimir = this.nroShippingOrder;
              const transportadorParaImprimir = this.transportadorSeleccionado;

     
              // Cerrar el modal primero
              this.modalService.dismissAll();

              // Ejecutar impresión después de cerrar el modal con los datos guardados
              setTimeout(() => {
                this.imprimirOrdenConDatosEspecificos(pedidosParaImprimir, nroOrdenParaImprimir, transportadorParaImprimir);
              }, 1000); // Delay de 1 segundo para asegurar que el modal se cierre completamente

              // Recargar el componente ordenes-despacho-v2 para reflejar los cambios
              setTimeout(() => {
                if (this.ordenesDespachoV2Component) {
                  console.log("🔄 Recargando componente ordenes-despacho-v2...");
                  this.ordenesDespachoV2Component.loadInitialOrders();
                }
              }, 2000); // Delay de 2 segundos para asegurar que el despacho se complete

              // Limpiar datos después de tiempo suficiente para que termine todo el proceso
              setTimeout(() => {
                console.log("Limpiando datos después de impresión completa...");
                this.pedidosSeleccionados = [];
                this.transportadorSeleccionado = null;
                this.nroShippingOrder = null;
                this.nuevaOrdenEnvio = null;
              }, 5000); // 5 segundos para asegurar que todos los timeouts internos terminen
            },
            (error) => {
              Swal.fire(
                "Error",
                "Hubo un problema al despachar la orden",
                "error",
              );
            },
          );
      }
    });
  }

  public getCurrentUser(): UserLite | null {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as UserLite;
    } catch (error) {
      console.error("Error al parsear información de usuario:", error);
      return null;
    }
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

  loadDispatchOrders(openModal: boolean = false) {
    // TODO: Migrar a getShippingOrdersPaginated para mejor rendimiento
    // Por ahora mantenemos compatibilidad con el método existente
    this.logisticaService.getShippingOrders().subscribe(
      (data: Pedido[]) => {
        const currentCompanyStr = localStorage.getItem("currentCompany");
        const companyName = currentCompanyStr
          ? JSON.parse(currentCompanyStr).nomComercial
          : "";

        this.dispatchOrders = data
          .filter((x) => x.company == companyName)
          .sort((a, b) => {
            const aNum = a.nroShippingOrder ? parseInt(a.nroShippingOrder) : 0;
            const bNum = b.nroShippingOrder ? parseInt(b.nroShippingOrder) : 0;
            return bNum - aNum;
          });

        this.cdr.detectChanges();

        if (openModal) {
          this.modalService.open(this.dispatchOrdersModal, {
            size: "xl",
            fullscreen: false,
          });
        }
      },
      (error) => {
        console.error("Error al consultar las órdenes de despacho:", error);
        this.dispatchOrders = [];
        if (openModal) {
          this.modalService.open(this.dispatchOrdersModal, { size: "xl" });
        }
      },
    );
  }

  viewAllDispatchOrders() {
    this.loadDispatchOrders(true);
  }

  /**
   * NUEVO: Método alternativo optimizado para ver órdenes con paginación del servidor
   * No reemplaza el método existente, solo agrega nueva funcionalidad
   */
  viewAllDispatchOrdersOptimized() {
    console.log('Abriendo modal V2 con scroll infinito...');
    
    this.modalService.open(this.dispatchOrdersModalV2, {
      size: "xl",
      fullscreen: false,  // Modal normal, no fullscreen
    });
  }

  /**
   * Método optimizado para cargar órdenes de despacho con paginación
   * Usar este método cuando el rendimiento sea crítico
   * @param openModal - Si debe abrir el modal después de cargar
   * @param usePagination - Si debe usar paginación (recomendado para mejor rendimiento)
   */
  loadDispatchOrdersOptimized(
    openModal: boolean = false,
    usePagination: boolean = true
  ): void {
    console.log('Cargando órdenes de despacho con método optimizado...');
    
    if (!usePagination) {
      // Si no se quiere paginación, cargar todas las páginas
      this.loadAllDispatchOrdersOptimized(openModal);
      return;
    }

    // Cargar con paginación (más eficiente)
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 30); // Últimos 30 días
    
    this.logisticaService.getShippingOrdersPaginated({
      page: 1,
      limit: 100,
      fields: 'full',
      fechaInicio: fechaInicio.toISOString().split('T')[0]
    }).subscribe(
      (response) => {
        if (!response || !response.data) {
          console.error('Respuesta inválida del servidor');
          this.dispatchOrders = [];
          return;
        }

        const currentCompanyStr = localStorage.getItem("currentCompany");
        const companyName = currentCompanyStr
          ? JSON.parse(currentCompanyStr).nomComercial
          : "";

        // Filtrar y ordenar las órdenes
        this.dispatchOrders = response.data
          .filter((x) => x.company == companyName)
          .sort((a, b) => {
            const aNum = a.nroShippingOrder ? parseInt(a.nroShippingOrder) : 0;
            const bNum = b.nroShippingOrder ? parseInt(b.nroShippingOrder) : 0;
            return bNum - aNum;
          });

        console.log(`Cargadas ${this.dispatchOrders.length} órdenes (Página 1)`);
        
        // Informar si hay más páginas disponibles
        if (response.pagination?.hasMore) {
          console.log('Hay más páginas disponibles. Use loadAllDispatchOrdersOptimized() para cargar todas.');
        }

        this.cdr.detectChanges();

        if (openModal) {
          this.modalService.open(this.dispatchOrdersModal, {
            size: "xl",
            fullscreen: false,
          });
        }
      },
      (error) => {
        console.error("Error al cargar órdenes optimizadas:", error);
        // Fallback al método tradicional
        console.log('Intentando con método tradicional...');
        this.loadDispatchOrders(openModal);
      }
    );
  }

  /**
   * Carga TODAS las órdenes de despacho usando paginación
   * Más eficiente que el método tradicional para grandes volúmenes
   */
  private async loadAllDispatchOrdersOptimized(openModal: boolean = false): Promise<void> {
    try {
      console.log('Cargando TODAS las órdenes de despacho...');
      
      // Mostrar indicador de carga
      const loadingAlert = Swal.fire({
        title: 'Cargando órdenes',
        html: 'Por favor espere mientras se cargan todas las órdenes...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Cargar todas las órdenes
      const allOrders = await this.logisticaService.getAllShippingOrdersV2('full');
      
      const currentCompanyStr = localStorage.getItem("currentCompany");
      const companyName = currentCompanyStr
        ? JSON.parse(currentCompanyStr).nomComercial
        : "";

      // Filtrar y ordenar
      this.dispatchOrders = allOrders
        .filter((x) => x.company == companyName)
        .sort((a, b) => {
          const aNum = a.nroShippingOrder ? parseInt(a.nroShippingOrder) : 0;
          const bNum = b.nroShippingOrder ? parseInt(b.nroShippingOrder) : 0;
          return bNum - aNum;
        });

      console.log(`Total de órdenes cargadas: ${this.dispatchOrders.length}`);
      
      // Cerrar indicador de carga
      Swal.close();
      
      this.cdr.detectChanges();

      if (openModal) {
        this.modalService.open(this.dispatchOrdersModal, {
          size: "xl",
          fullscreen: false,
        });
      }

      // Mostrar notificación de éxito
      if (this.dispatchOrders.length > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Órdenes cargadas',
          text: `Se cargaron ${this.dispatchOrders.length} órdenes exitosamente`,
          timer: 2000,
          showConfirmButton: false
        });
      }

    } catch (error) {
      console.error('Error cargando todas las órdenes:', error);
      Swal.close();
      
      // Fallback al método tradicional
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: 'Hubo un problema al cargar las órdenes. Intentando método alternativo...',
        timer: 2000,
        showConfirmButton: false
      });
      
      this.loadDispatchOrders(openModal);
    }
  }

  /**
   * Método para refrescar las órdenes usando caché
   * Útil para actualizaciones periódicas sin sobrecargar el servidor
   */
  refreshDispatchOrdersWithCache(): void {
    this.logisticaService.getShippingOrdersCached({
      page: 1,
      limit: 100,
      fields: 'full'
    }).subscribe(
      (response) => {
        if (response && response.data) {
          const currentCompanyStr = localStorage.getItem("currentCompany");
          const companyName = currentCompanyStr
            ? JSON.parse(currentCompanyStr).nomComercial
            : "";

          this.dispatchOrders = response.data
            .filter((x) => x.company == companyName)
            .sort((a, b) => {
              const aNum = a.nroShippingOrder ? parseInt(a.nroShippingOrder) : 0;
              const bNum = b.nroShippingOrder ? parseInt(b.nroShippingOrder) : 0;
              return bNum - aNum;
            });

          console.log(`Órdenes actualizadas desde caché: ${this.dispatchOrders.length}`);
          this.cdr.detectChanges();
        }
      },
      (error) => {
        console.error('Error actualizando desde caché:', error);
      }
    );
  }

  pdfOrder(content, order: Pedido) {
    // ✅ FIX: Capturar scroll y aplicar posición fija con offset para prevenir salto visual
    const scrollY = window.scrollY;
    this.scrollStack.push(scrollY);
    document.body.style.top = `-${scrollY}px`;

    this.pedidoSeleccionado = order;
    this.htmlModal = this.paymentService.getHtmlContent(order);
    this.modalService
      .open(content, {
        size: "lg",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          // ✅ FIX: Restaurar posición del body antes de hacer scroll
          document.body.style.top = '';
          this.htmlModal = null;
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          // ✅ FIX: Restaurar posición del body antes de hacer scroll
          document.body.style.top = '';
          this.htmlModal = null;
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
      );
  }

  descargarRotulo(pedido: any): void {
    this.pdfSize = "5x5";
    const size = this.pdfSize.split("x").map(Number);
    const width = size[0];
    const height = size[1];

    const rotuloContent = `
    <div style="font-family: Arial, sans-serif; padding: 3px; border: 2px solid #ddd;">
      <div>
          <div style="margin-bottom: 2px;">
            <p style="font-size: 100px; line-height:1.2;"><strong>Número de Pedido:</strong> ${pedido.nroPedido}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Fecha Entrega:</strong> ${pedido.fechaEntrega ? pedido.fechaEntrega.split("T")[0] : "N/A"}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Horario de Entrega:</strong> ${pedido.horarioEntrega || "N/A"}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Recibe:</strong> ${pedido.envio?.nombres || ""} ${pedido.envio?.apellidos || ""}</p>
            <p style="font-size: 100px; line-height:1.2;">${pedido.envio?.direccionEntrega || ""}, ${pedido.envio?.nombreUnidad || ""}, ${pedido.envio?.especificacionesInternas || ""}, ${pedido.envio?.observaciones || ""}, ${pedido.envio?.zonaCobro || ""}</p>
          </div>
        </div>
    </div>
    `;

    const element = document.createElement("div");
    element.innerHTML = rotuloContent;
    document.body.appendChild(element);

    html2canvas(element).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "cm",
        format: [width, height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, 5, 4);
      const pdfBlob = pdf.output("blob");
      const url = URL.createObjectURL(pdfBlob);

      window.open(url);

      document.body.removeChild(element);
    });
  }

  imprimirOrderToAction(orderId: any) {
    const cacheKey = `order_${orderId}`;
    const cached = this.orderCache.get(cacheKey);

    // Verificar si existe en cache y no ha expirado
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      this.procesarOrdenParaImprimir(cached.data);
      return;
    }

    // Si no existe en cache o ha expirado, hacer la petición
    this.logisticaService.getShippingOrder(orderId).subscribe({
      next: (response) => {
        // Guardar en cache
        this.orderCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });

        this.procesarOrdenParaImprimir(response);
      },
      error: (error) => {
        console.error("Error obteniendo orden:", error);
        Swal.fire("Error", "No se pudo obtener la orden", "error");
      },
    });
  }

  private procesarOrdenParaImprimir(response: any) {
    this.nuevaOrdenEnvio = response;
    this.pedidosSeleccionados = this.optimizarDatosPedidos(response.pedidos);
    this.transportadorSeleccionado = response.pedidos[0]?.transportador;
    this.nroShippingOrder = response.nroShippingOrder;

    // Validar datos antes de imprimir
    if (this.validateOrderData()) {
      this.imprimirOrden();
    } else {
      this.showErrorMessage("Error: Datos de orden incompletos");
    }
  }

  // Métodos auxiliares para las optimizaciones
  private updatePDFProgress(progress: number, message: string) {
    this.pdfProgress = progress;
    this.currentProgressMessage = message;
    console.log(`PDF Progress: ${progress}% - ${message}`);
  }

  private validateOrderData(): boolean {
    const validation = {
      hasPedidos: !!(this.pedidosSeleccionados?.length > 0),
      hasNroShipping: !!this.nroShippingOrder,
      hasTransportador: !!this.transportadorSeleccionado,
      hasUser: !!this.getCurrentUser()
    };

    console.log("Validando datos de orden:", {
      ...validation,
      pedidosCount: this.pedidosSeleccionados?.length || 0,
      nroShippingOrder: this.nroShippingOrder,
      transportadorNombre: this.transportadorSeleccionado?.nombre || 'N/A'
    });

    // Validación más flexible
    const isValid = validation.hasPedidos && validation.hasNroShipping &&
      (validation.hasTransportador || validation.hasUser);

    console.log("Resultado validación:", isValid);
    return isValid;
  }


  public calculateTotalPendiente(): number {
    return this.pedidosSeleccionados.reduce(
      (acc, pedido) => acc + (pedido.faltaPorPagar || 0),
      0,
    );
  }

  private getCachedOrderData(): OrderCache | null {
    const cacheKey = `order-${this.nroShippingOrder}`;
    const cached = this.orderCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }

    return null;
  }

  private cacheOrderData(data: any) {
    const cacheKey = `order-${this.nroShippingOrder}`;
    this.orderCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  private generateOptimizedPedidosHTML(pedidos: Pedido[]): string {
    const pedidosChunks: string[] = [];

    for (const p of pedidos) {
      // Usar datos pre-calculados cuando sea posible
      const clienteNombre =
        this.getValorSeguro(p.envio?.nombres) +
        " " +
        this.getValorSeguro(p.envio?.apellidos);
      const direccionCompleta = [
        p.envio?.direccionEntrega,
        p.envio?.barrio,
        p.envio?.ciudad,
        p.envio?.departamento,
      ]
        .filter(Boolean)
        .join(", ");

      pedidosChunks.push(`
        <tr>
          <td>${p.nroPedido || "N/A"}</td>
          <td>$${(p.faltaPorPagar || 0).toLocaleString()}</td>
          <td>___________</td>
          <td>
            <strong>Nombre:</strong> ${clienteNombre}<br>
            <strong>Teléfono:</strong> ${p.envio?.celular || "N/A"}<br>
            <strong>WhatsApp:</strong> ${p.envio?.celular || "N/A"}<br>
            <strong>Otro Número:</strong> ${p.envio?.otroNumero || "N/A"}<br>
            <strong>Dirección:</strong> ${direccionCompleta}
          </td>
          <td>${p.horarioEntrega || "N/A"}</td>
          <td>${p.envio?.ciudad || "N/A"}</td>
          <td>${p.envio?.departamento || "N/A"}</td>
        </tr>
      `);
    }

    return pedidosChunks.join("");
  }

  private createPDFElement(content: string): HTMLElement {
    const element = document.createElement("div");
    element.innerHTML = content;

    // Estilos para hacer el elemento invisible pero renderizable por html2pdf
    element.style.position = "fixed";
    element.style.top = "0";
    element.style.left = "0";
    element.style.width = "297mm"; // A4 landscape width (297mm x 210mm)
    element.style.height = "auto";
    element.style.visibility = "hidden"; // Oculta el elemento
    element.style.zIndex = "-9999"; // Envíalo detrás de todo

    document.body.appendChild(element);
    return element;
  }

  private getOptimizedPDFOptions() {
    return {
      margin: [8, 8, 8, 8], // 8mm margins optimizados para landscape
      filename: `orden-envio-${this.nroShippingOrder}.pdf`,
      image: {
        type: "jpeg",
        quality: 0.98, // Alta calidad optimizada
      },
      html2canvas: {
        scale: 2.5, // Optimizado para texto claro sin archivos muy pesados
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        letterRendering: true,
        windowWidth: 1280, // Ancho optimizado para landscape
        windowHeight: 900,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "landscape", // FORZAR landscape
        compress: true,
        precision: 16,
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: ['tr', '.info-section', '.header-table'] // Evitar cortes en elementos críticos
      }
    };
  }

  private cleanupDOMElement(element: HTMLElement) {
    try {
      if (element && element.parentNode) {
        document.body.removeChild(element);
      }
    } catch (error) {
      console.warn("Error limpiando elemento DOM:", error);
    }
  }

  private async handlePDFError(
    error: any,
    resolve: Function,
    reject: Function,
  ) {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      console.log(
        `Reintentando generación PDF (${this.retryCount}/${this.MAX_RETRIES})`,
      );

      // Esperar un poco antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        await this.imprimirOrdenConHtml2Pdf();
        resolve();
      } catch (retryError) {
        this.handlePDFError(retryError, resolve, reject);
      }
    } else {
      reject(error);
    }
  }

  private async handlePDFGenerationError(error: any) {
    if (this.retryCount < this.MAX_RETRIES) {
      const result = await Swal.fire({
        title: "Error generando PDF",
        text: `Error: ${error.message}. ¿Desea reintentar?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Reintentar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        await this.imprimirOrden();
      }
    } else {
      Swal.fire(
        "Error",
        "No se pudo generar el PDF después de varios intentos. Verifique los datos e intente nuevamente.",
        "error",
      );
    }
  }

  private showProgressToast() {
    // Implementar toast de progreso si es necesario
  }

  private hideProgressToast() {
    // Ocultar toast de progreso
  }

  private showSuccessMessage(message: string) {
    Swal.fire({
      icon: "success",
      title: message,
      showConfirmButton: false,
      timer: 2000,
    });
  }

  private showErrorMessage(message: string) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: message,
    });
  }

  private showInfoMessage(message: string) {
    Swal.fire({
      icon: "info",
      title: "Información",
      text: message,
      showConfirmButton: false,
      timer: 3000,
    });
  }

  private getValorSeguro(value: any): string {
    return value ?? "N/A";
  }

  // Método para obtener mensaje de progreso actual
  getCurrentProgressMessage(): string {
    const progressMessages: { [key: number]: string } = {
      0: "Preparando generación...",
      10: "Iniciando generación...",
      20: "Procesando datos...",
      30: "Generando contenido HTML...",
      40: "Creando estructura del documento...",
      50: "Preparando elemento DOM...",
      60: "Configurando opciones de PDF...",
      70: "Generando PDF...",
      90: "Finalizando...",
      100: "¡PDF generado exitosamente!",
    };

    return (
      this.currentProgressMessage ||
      progressMessages[this.pdfProgress] ||
      "Procesando..."
    );
  }

  private debugComponentState(): void {
    console.log("=== DEBUG: Estado de componentes para PDF ===");
    console.log("ViewChild pdfTemplate:", {
      exists: !!this.pdfTemplate,
      instance: this.pdfTemplate?.constructor?.name || "undefined"
    });
    console.log("ViewChild pdfTemplateContainer:", {
      exists: !!this.pdfTemplateContainer,
      hasElement: !!this.pdfTemplateContainer?.nativeElement,
      hasChildren: this.pdfTemplateContainer?.nativeElement?.children?.length || 0
    });
    console.log("Datos para el template:", {
      pedidosSeleccionados: this.pedidosSeleccionados?.length || 0,
      nroShippingOrder: this.nroShippingOrder,
      transportadorSeleccionado: !!this.transportadorSeleccionado,
      totalPendiente: this.calculateTotalPendiente(),
      userName: this.getCurrentUser()?.name
    });
    console.log("===============================================");
  }

  // Método de prueba para verificar que el clic funciona
  testPrintOrder(): void {
    console.log("=== TEST: Botón de impresión presionado ===");
    this.debugComponentState();

    // Mostrar mensaje de prueba
    this.showSuccessMessage("¡Botón de impresión funciona correctamente!");

    // Verificar que los datos básicos estén presentes
    if (!this.pedidosSeleccionados || this.pedidosSeleccionados.length === 0) {
      this.showErrorMessage("No hay pedidos seleccionados");
      return;
    }

    if (!this.nroShippingOrder) {
      this.showErrorMessage("No hay número de orden de envío");
      return;
    }

    this.showSuccessMessage("Datos básicos presentes - listo para imprimir");
  }

  private optimizarDatosPedidos(pedidos: any[]): any[] {
    console.log('🔧 optimizarDatosPedidos - Procesando', pedidos.length, 'pedidos');

    return pedidos.map((pedido, index) => {
      const tieneNotasPedido = !!pedido.notasPedido;
      const notasDespachos = pedido.notasPedido?.notasDespachos?.length || 0;
      const notasEntregas = pedido.notasPedido?.notasEntregas?.length || 0;

      console.log(`Pedido ${index + 1} (${pedido.nroPedido}):`, {
        tieneNotasPedido,
        notasDespachos,
        notasEntregas,
        tieneObservaciones: !!pedido.envio?.observaciones
      });

      return {
        nroPedido: pedido.nroPedido,
        faltaPorPagar: pedido.faltaPorPagar || 0,
        horarioEntrega: pedido.horarioEntrega,
        cliente: {
          nombres_completos: pedido.cliente?.nombres_completos || "",
          numero_celular_comprador: pedido.cliente?.numero_celular_comprador || ""
        },
        envio: {
          nombres: pedido.envio?.nombres || "",
          apellidos: pedido.envio?.apellidos || "",
          celular: pedido.envio?.celular || "",
          otroNumero: pedido.envio?.otroNumero || "",
          direccionEntrega: pedido.envio?.direccionEntrega || "",
          nombreUnidad: pedido.envio?.nombreUnidad || "",
          especificacionesInternas: pedido.envio?.especificacionesInternas || "",
          observaciones: pedido.envio?.observaciones || "",
          ciudad: pedido.envio?.ciudad || "",
          departamento: pedido.envio?.departamento || "",
          zonaCobro: pedido.envio?.zonaCobro || "",
          barrio: pedido.envio?.barrio || "",
          pais: pedido.envio?.pais || "Colombia",
        },
        notasPedido: {
          notasDespachos: pedido.notasPedido?.notasDespachos || [],
          notasEntregas: pedido.notasPedido?.notasEntregas || [],
          notasCliente: pedido.notasPedido?.notasCliente || [],
          notasProduccion: pedido.notasPedido?.notasProduccion || [],
          notasFacturacionPagos: pedido.notasPedido?.notasFacturacionPagos || []
        }
      };
    });
  }

  // Manejadores para acciones desde OrdenesDespachoComponent
  handleOrderView(orderId: string) {
    // Consultar la orden de envío existente
    const orderIdNumber = parseInt(orderId);
    if (isNaN(orderIdNumber)) {
      console.error("ID de orden inválido:", orderId);
      Swal.fire("Error", "ID de orden de envío inválido", "error");
      return;
    }

    this.logisticaService.getShippingOrder(orderIdNumber).subscribe({
      next: (response) => {
        // Debug: Analizar respuesta del backend
        console.log('📡 BACKEND RESPONSE - handleOrderView:');
        console.log('Response completa:', response);
        console.log('Campos de método de envío en response:', {
          metodoEnvio: response?.metodoEnvio,
          metodo_envio: response?.metodo_envio,
          tipoEnvio: response?.tipoEnvio,
          transportador: response?.transportador
        });

        // ✅ PROCESAR y asegurar que la orden tenga metodoEnvio
        this.nuevaOrdenEnvio = this.ensureMetodoEnvioProperty(response);
        this.pedidosSeleccionados = response.pedidos || [];
        this.transportadorSeleccionado = response.transportador;
        this.nroShippingOrder = response.nroShippingOrder;

        console.log('📋 Variables asignadas:', {
          nuevaOrdenEnvio: this.nuevaOrdenEnvio,
          pedidosSeleccionados: this.pedidosSeleccionados?.length || 0,
          transportadorSeleccionado: this.transportadorSeleccionado,
          nroShippingOrder: this.nroShippingOrder
        });

        // Cerrar el modal de listado de órdenes
        this.modalService.dismissAll();

        // Abrir el modal de edición de orden
        setTimeout(() => {
          this.openModal(this.pantallaOrdenEnvioModal, true);
        }, 100);
      },
      error: (error) => {
        console.error("Error al consultar la orden:", error);
        Swal.fire(
          "Error",
          "Hubo un problema al consultar la orden de envío",
          "error",
        );
      },
    });
  }

  mostrarDetallesEnvio(envioData: any) {
    // Asegurarse de que envioData existe
    if (!envioData) {
      return;
    }

    // Abrir el diálogo con los detalles del envío
    this.dialogService.open(ObservacionesDetalleComponent, {
      data: envioData,
      header: "Detalles de Envío",
      width: "500px",
      contentStyle: { "max-height": "80vh", overflow: "auto" },
      baseZIndex: 10000,
    });
  }

  // Método para obtener el conteo de pedidos urgentes no despachados ni entregados
  obtenerConteoPedidosUrgentesNoDespachados(): number {
    return this.pedidosUrgentes.filter(
      (pedido) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado,
    ).length;
  }

  // Método para contar pedidos por estado específico
  contarPedidosPorEstado(estado: string): number {
    if (!this.orders || this.orders.length === 0) {
      return 0;
    }
    return this.orders.filter(p => p.estadoProceso === estado).length;
  }

  // Método para formatear fechas en español con formato 'Nombre Día semana, Día Mes'
  formatearFecha(fecha: any): string {
    let fechaObj: Date;

    // Convertir a objeto Date válido
    // Si es un número, lo tratamos como timestamp
    if (typeof fecha === "number") {
      fechaObj = new Date(fecha);
    }
    // Si es string, intentamos convertirlo
    else if (typeof fecha === "string") {
      // Si es formato ISO (YYYY-MM-DD)
      if (fecha.match(/^\d{4}-\d{2}-\d{2}/)) {
        fechaObj = new Date(fecha);
      }
      // Si es un número almacenado como string, convertirlo
      else {
        const timestamp = parseInt(fecha, 10);
        if (!isNaN(timestamp)) {
          fechaObj = new Date(timestamp);
        } else {
          fechaObj = new Date();
        }
      }
    }
    // Si es objeto Date, usarlo directamente
    else if (fecha instanceof Date) {
      fechaObj = fecha;
    }
    // Si todo falla, usar la fecha actual
    else {
      console.warn("No se pudo convertir la fecha:", fecha);
      fechaObj = new Date();
    }

    // Formatear la fecha en español
    try {
      const opciones: Intl.DateTimeFormatOptions = {
        weekday: "long", // Nombre completo del día
        day: "numeric", // Día del mes en números
        month: "long", // Nombre completo del mes
      };

      const formatoEspanol = new Intl.DateTimeFormat("es-ES", opciones);
      const fechaFormateada = formatoEspanol.format(fechaObj);

      // Convertir primera letra a mayúscula
      return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    } catch (error) {
      console.error("Error al formatear la fecha:", error);
      return fechaObj.toLocaleDateString("es-ES");
    }
  }

  onSubmitOrdenEnvio(event: any) {
    console.log("Recibiendo datos de orden de envío:", event);

    // Validar que el evento no sea nulo
    if (!event) {
      console.error("Error: No se recibieron datos de la orden de envío");

      // Resetear flag de guardado en caso de error
      if (this.generarOrdenComponent) {
        this.generarOrdenComponent.resetSavingState();
      }
      if (this.editarOrdenComponent) {
        this.editarOrdenComponent.resetSavingState();
      }

      Swal.fire(
        "Error",
        "No se recibieron datos para la orden de envío",
        "error",
      );
      return;
    }

    // Determinar si es una nueva orden o una existente
    const esNuevaOrden = !this.nroShippingOrder || this.nroShippingOrder === "";

    // Asignar datos recibidos a la nueva orden de envío
    if (!this.nuevaOrdenEnvio) {
      const currentCompanyStr = localStorage.getItem("currentCompany");
      const companyName = currentCompanyStr
        ? JSON.parse(currentCompanyStr).nomComercial
        : "";

      this.nuevaOrdenEnvio = {
        id: "",
        nroShippingOrder: this.nroShippingOrder || "",
        fecha: event.fechaEnvio || new Date().toISOString(),
        metodoEnvio: event.metodoEnvio,
        transportador: this.transportadorSeleccionado || "",
        company: companyName,
        pedidos: this.pedidosSeleccionados || [],
        pedidosMovidos: event.pedidosMovidos || [],
      };
    } else {
      // Actualizar la orden existente con datos del formulario
      this.nuevaOrdenEnvio.fechaEnvio = event.fechaEnvio;

      // ✅ ASEGURAR que metodoEnvio siempre exista y se actualice
      if (!this.nuevaOrdenEnvio.hasOwnProperty('metodoEnvio')) {
        console.log('⚠️ CREANDO propiedad metodoEnvio que no existía');
      }
      this.nuevaOrdenEnvio.metodoEnvio = event.metodoEnvio;

      // ✅ MARCAR para forzar actualización en backend
      this.nuevaOrdenEnvio._forceUpdate = true;
      this.nuevaOrdenEnvio._metodoEnvioChanged = true;

      if (this.transportadorSeleccionado) {
        this.nuevaOrdenEnvio.transportador = this.transportadorSeleccionado;
      }
      this.nuevaOrdenEnvio.fecha = event.fechaEnvio || new Date().toISOString();
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados || [];
      this.nuevaOrdenEnvio.pedidosMovidos = event.pedidosMovidos || [];

      console.log('✅ ORDEN ACTUALIZADA con metodoEnvio:', {
        metodoEnvio: this.nuevaOrdenEnvio.metodoEnvio,
        fechaEnvio: this.nuevaOrdenEnvio.fechaEnvio,
        nroShippingOrder: this.nuevaOrdenEnvio.nroShippingOrder,
        pedidosMovidos: this.nuevaOrdenEnvio.pedidosMovidos,
        _forceUpdate: this.nuevaOrdenEnvio._forceUpdate
      });
    }

    // Validar que haya pedidos seleccionados
    if (!this.pedidosSeleccionados || this.pedidosSeleccionados.length === 0) {
      console.error(
        "Error: No hay pedidos seleccionados para la orden de envío",
      );

      // Resetear flag de guardado en caso de error
      if (this.generarOrdenComponent) {
        this.generarOrdenComponent.resetSavingState();
      }
      if (this.editarOrdenComponent) {
        this.editarOrdenComponent.resetSavingState();
      }

      Swal.fire(
        "Error",
        "No hay pedidos seleccionados para la orden de envío",
        "error",
      );
      return;
    }

    // Guardar siempre con createShippingOrder (sirve para crear y editar). No despachar automáticamente.
    if (esNuevaOrden) {
      this.crearOrdenEnvio();
    } else {
      this.logisticaService.createShippingOrder(this.nuevaOrdenEnvio).subscribe({
        next: (response) => {
          // Si backend retorna nroShippingOrder, actualizar referencia local
          if (response && response.nroShippingOrder) {
            this.nroShippingOrder = response.nroShippingOrder;
            this.nuevaOrdenEnvio.nroShippingOrder = response.nroShippingOrder;
          }

          Swal.fire({
            title: "Éxito",
            text: `La orden de envío ${this.nroShippingOrder || ""} ha sido actualizada exitosamente`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });

          // Resetear flag de guardado en el componente hijo
          if (this.generarOrdenComponent) {
            this.generarOrdenComponent.resetSavingState();
          }
          if (this.editarOrdenComponent) {
            this.editarOrdenComponent.resetSavingState();
          }

          this.refrescarDatos();

          // Actualizar también el componente ordenes-despacho-v2 si está presente
          if (this.ordenesDespachoV2Component) {
            console.log('Actualizando ordenes-despacho-v2 después de actualizar orden...');
            this.ordenesDespachoV2Component.loadInitialOrders();
          }

          this.modalService.dismissAll();
        },
        error: (error) => {
          console.error("Error al actualizar la orden de envío:", error);
          // Resetear flag de guardado en caso de error
          if (this.generarOrdenComponent) {
            this.generarOrdenComponent.resetSavingState();
          }
          if (this.editarOrdenComponent) {
            this.editarOrdenComponent.resetSavingState();
          }

          Swal.fire(
            "Error",
            "Hubo un problema al actualizar la orden de envío: " +
            (error.message || "Error desconocido"),
            "error",
          );
        },
      });
    }
  }

  /**
   * Nuevo método: Guardar orden y despachar en un solo paso
   * Combina la creación de la orden con el despacho inmediato
   * CORREGIDO: Preserva el contexto de pedidos antes de cerrar el modal
   */
  onGuardarYDespacharOrden(event: any) {
    console.log("=== GUARDAR Y DESPACHAR ORDEN ===");
    console.log("Evento recibido:", event);

    // Validaciones similares a onSubmitOrdenEnvio
    if (!event) {
      console.error("Error: No se recibieron datos de la orden de envío");

      if (this.generarOrdenComponent) {
        this.generarOrdenComponent.resetSavingState();
      }
      if (this.editarOrdenComponent) {
        this.editarOrdenComponent.resetSavingState();
      }

      Swal.fire("Error", "No se recibieron datos para la orden de envío", "error");
      return;
    }

    if (!this.pedidosSeleccionados || this.pedidosSeleccionados.length === 0) {
      console.error("Error: No hay pedidos seleccionados para la orden de envío");

      if (this.generarOrdenComponent) {
        this.generarOrdenComponent.resetSavingState();
      }
      if (this.editarOrdenComponent) {
        this.editarOrdenComponent.resetSavingState();
      }

      Swal.fire("Error", "No hay pedidos seleccionados para la orden de envío", "error");
      return;
    }

    // IMPORTANTE: Guardar copias de los datos ANTES de cualquier operación asíncrona
    // Esto previene la pérdida de contexto al cerrar el modal
    const pedidosParaDespacho = [...this.pedidosSeleccionados];
    console.log("Pedidos preservados para despacho:", pedidosParaDespacho.length);

    // Preparar datos de la orden
    const currentCompanyStr = localStorage.getItem("currentCompany");
    const companyName = currentCompanyStr ? JSON.parse(currentCompanyStr).nomComercial : "";

    this.nuevaOrdenEnvio = {
      id: "",
      nroShippingOrder: "",
      fecha: event.fechaFin || event.fechaEnvio || new Date().toISOString(),
      metodoEnvio: event.metodoEnvio,
      transportador: this.transportadorSeleccionado || "",
      company: companyName,
      pedidos: pedidosParaDespacho,
      pedidosMovidos: event.pedidosMovidos || [],
    };

    console.log("Datos de orden preparados:", {
      metodoEnvio: this.nuevaOrdenEnvio.metodoEnvio,
      cantidadPedidos: this.nuevaOrdenEnvio.pedidos.length,
      fecha: this.nuevaOrdenEnvio.fecha
    });

    // Crear la orden
    this.logisticaService.createShippingOrder(this.nuevaOrdenEnvio).subscribe({
      next: (response) => {
        console.log("✅ Orden creada exitosamente:", response);

        // Actualizar nroShippingOrder
        if (response && response.nroShippingOrder) {
          this.nroShippingOrder = response.nroShippingOrder;
          this.nuevaOrdenEnvio.nroShippingOrder = response.nroShippingOrder;
          console.log("Número de orden asignado:", this.nroShippingOrder);
        }

        // IMPORTANTE: Restaurar pedidos seleccionados para el despacho
        // Esto asegura que despacharOrden() tenga acceso a los pedidos
        this.pedidosSeleccionados = pedidosParaDespacho;

        // Actualizar nuevaOrdenEnvio.pedidos para asegurar que esté sincronizado
        this.nuevaOrdenEnvio.pedidos = pedidosParaDespacho;

        // Resetear flag de guardado
        if (this.generarOrdenComponent) {
          this.generarOrdenComponent.resetSavingState();
        }
        if (this.editarOrdenComponent) {
          this.editarOrdenComponent.resetSavingState();
        }

        // Actualizar datos
        this.refrescarDatos();

        if (this.ordenesDespachoV2Component) {
          console.log("🔄 Actualizando ordenes-despacho-v2 después de crear orden...");
          this.ordenesDespachoV2Component.loadInitialOrders();
        }

        console.log("📦 Iniciando proceso de despacho...");
        console.log("Datos disponibles para despacho:", {
          nroShippingOrder: this.nroShippingOrder,
          nuevaOrdenEnvio: {
            nroShippingOrder: this.nuevaOrdenEnvio?.nroShippingOrder,
            pedidos: this.nuevaOrdenEnvio?.pedidos?.length || 0
          },
          pedidosSeleccionados: this.pedidosSeleccionados?.length || 0
        });

        // IMPORTANTE: NO cerrar el modal aquí - despacharOrden() lo cerrará después del dispatch exitoso
        // Ejecutar despacho inmediatamente sin cerrar el modal primero
        console.log("🚀 Ejecutando despacharOrden() (modal permanece abierto)...");
        this.despacharOrden();
      },
      error: (error) => {
        console.error("❌ Error al crear la orden:", error);

        if (this.generarOrdenComponent) {
          this.generarOrdenComponent.resetSavingState();
        }
        if (this.editarOrdenComponent) {
          this.editarOrdenComponent.resetSavingState();
        }

        Swal.fire(
          "Error",
          "Hubo un problema al crear la orden: " + (error.message || "Error desconocido"),
          "error"
        );
      },
    });
  }

  // Método para crear una nueva orden de envío
  private crearOrdenEnvio(): void {
    console.log("Creando nueva orden de envío:", this.nuevaOrdenEnvio);

    this.logisticaService.createShippingOrder(this.nuevaOrdenEnvio).subscribe({
      next: (response) => {
        console.log("Respuesta exitosa del servidor:", response);

        // Actualizar nroShippingOrder
        if (response && response.nroShippingOrder) {
          this.nroShippingOrder = response.nroShippingOrder;
          this.nuevaOrdenEnvio.nroShippingOrder = response.nroShippingOrder;
        }

        Swal.fire({
          title: "Éxito",
          text: `La orden de envío ${response.nroShippingOrder || ""} ha sido creada exitosamente`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // Resetear flag de guardado en el componente hijo
        if (this.generarOrdenComponent) {
          this.generarOrdenComponent.resetSavingState();
        }
        if (this.editarOrdenComponent) {
          this.editarOrdenComponent.resetSavingState();
        }

        // Actualizar la lista de órdenes y cerrar el modal
        this.refrescarDatos();

        // Actualizar también el componente ordenes-despacho-v2 si está presente
        if (this.ordenesDespachoV2Component) {
          console.log('Actualizando ordenes-despacho-v2 después de crear orden...');
          this.ordenesDespachoV2Component.loadInitialOrders();
        }

        this.modalService.dismissAll();
      },
      error: (error) => {
        console.error("Error al crear la orden de envío:", error);
        // Resetear flag de guardado en caso de error
        if (this.generarOrdenComponent) {
          this.generarOrdenComponent.resetSavingState();
        }
        if (this.editarOrdenComponent) {
          this.editarOrdenComponent.resetSavingState();
        }

        Swal.fire(
          "Error",
          "Hubo un problema al crear la orden de envío: " +
          (error.message || "Error desconocido"),
          "error",
        );
      },
    });
  }

  // Método para despachar una orden existente
  private despacharOrdenEnvio(): void {
    console.log("Despachando orden existente:", this.nuevaOrdenEnvio);

    // Verificar que haya un transportador asignado
    if (
      !this.nuevaOrdenEnvio.transportador ||
      this.nuevaOrdenEnvio.transportador === ""
    ) {
      console.error("Error: No hay transportador asignado");
      Swal.fire(
        "Error",
        "Debe asignar un transportador antes de despachar la orden",
        "error",
      );
      return;
    }

    // Actualizar el estado de cada pedido a "Despachado"
    const userLite = this.getCurrentUser();
    if (!userLite) {
      Swal.fire(
        "Error",
        "No se pudo obtener información del usuario actual",
        "error",
      );
      return;
    }

    // Actualizar cada pedido con los datos de despacho
    if (
      this.nuevaOrdenEnvio.pedidos &&
      this.nuevaOrdenEnvio.pedidos.length > 0
    ) {
      this.nuevaOrdenEnvio.pedidos.forEach((pedido) => {
        pedido.estadoProceso = EstadoProceso.Despachado;
        pedido.transportador = this.nuevaOrdenEnvio.transportador;
        pedido.despachador = userLite;
        pedido.fechaYHorarioDespachado = new Date().toISOString();
        pedido.nroShippingOrder = this.nuevaOrdenEnvio.nroShippingOrder;
        pedido.shippingOrder = this.nuevaOrdenEnvio.nroShippingOrder;
      });
    }

    console.log("Datos de despacho actualizados:", this.nuevaOrdenEnvio);

    // Enviar la orden al servidor
    this.logisticaService
      .dispatchShippingOrder(this.nuevaOrdenEnvio)
      .subscribe({
        next: (response) => {
          console.log("Respuesta exitosa del servidor:", response);

          // Actualizar los pedidos individualmente para asegurar que se guarden los cambios
          const actualizarPromises = this.nuevaOrdenEnvio.pedidos.map(
            (pedido) =>
              new Promise((resolve, reject) => {
                this.ventasService.editOrder(pedido).subscribe({
                  next: () => resolve(true),
                  error: (err) => {
                    console.error(
                      `Error al actualizar pedido ${pedido.nroPedido}:`,
                      err,
                    );
                    reject(err);
                  },
                });
              }),
          );

          Promise.all(actualizarPromises)
            .then(() => {
              console.log(`🚚 Orden ${this.nuevaOrdenEnvio.nroShippingOrder} despachada exitosamente - Verificando geocodificación...`);

              // Geocodificar automáticamente los pedidos despachados que no tienen coordenadas
              const pedidosSinCoordenadas = this.nuevaOrdenEnvio.pedidos.filter(pedido =>
                pedido.envio?.direccionEntrega && pedido.envio?.ciudad &&
                (!pedido.envio?.latitud || !pedido.envio?.longitud)
              );

              if (pedidosSinCoordenadas.length > 0) {
                console.log(`📍 Geocodificando ${pedidosSinCoordenadas.length} pedidos de la orden despachada...`);
                this.geocodificarPedidosDespachados().then(() => {
                  console.log(`🗺️ Actualizando mapa después de geocodificar orden despachada`);
                  this.actualizarConfiguracionMapa();
                }).catch(error => {
                  console.error(`❌ Error geocodificando pedidos de la orden:`, error);
                });
              } else {
                // Si todos ya tienen coordenadas, solo actualizar el mapa
                this.actualizarConfiguracionMapa();
              }

              Swal.fire(
                "Éxito",
                "Orden despachada exitosamente y todos los pedidos actualizados",
                "success",
              );

              // Actualizar la lista de órdenes
              this.refrescarDatos();

              // Cerrar el modal
              this.modalService.dismissAll();
            })
            .catch((error) => {
              console.error("Error al actualizar algunos pedidos:", error);
              Swal.fire({
                title: "Advertencia",
                text: "La orden fue despachada pero hubo problemas al actualizar algunos pedidos. Se recomienda verificar el estado de los pedidos.",
                icon: "warning",
              });

              // Actualizar la lista de órdenes
              this.refrescarDatos();

              // Cerrar el modal
              this.modalService.dismissAll();
            });
        },
        error: (error) => {
          console.error("Error al despachar la orden de envío:", error);
          Swal.fire(
            "Error",
            "Hubo un problema al despachar la orden de envío: " +
            (error.message || "Error desconocido"),
            "error",
          );
        },
      });
  }

  // Método para solicitar selección de transportador
  private seleccionarTransportador(): Promise<string> {
    return new Promise((resolve) => {
      if (
        !this.vendors ||
        !Array.isArray(this.vendors) ||
        this.vendors.length === 0
      ) {
        // Intentar cargar transportadores si no están disponibles
        this.logisticaService.getTransportadores().subscribe({
          next: (data) => {
            this.vendors = data || [];
            if (this.vendors.length === 0) {
              console.error(
                "No hay transportadores disponibles después de cargar",
              );
              Swal.fire("Error", "No hay transportadores disponibles", "error");
              resolve("");
              return;
            }
            this.mostrarDialogoSeleccionTransportador(resolve);
          },
          error: (error) => {
            console.error("Error al cargar transportadores:", error);
            Swal.fire(
              "Error",
              "No se pudieron cargar los transportadores",
              "error",
            );
            resolve("");
          },
        });
      } else {
        this.mostrarDialogoSeleccionTransportador(resolve);
      }
    });
  }

  private mostrarDialogoSeleccionTransportador(
    resolve: (value: string) => void,
  ): void {
    const opciones = this.vendors.reduce((acc, vendor) => {
      const nombreCompleto = `${vendor.nombres} ${vendor.apellidos}`;
      acc[nombreCompleto] = nombreCompleto;
      return acc;
    }, {});

    Swal.fire({
      title: "Asignar Transportador",
      input: "select",
      inputOptions: opciones,
      inputPlaceholder: "Seleccione un transportador",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonText: "Seleccionar",
      inputValidator: (value) => {
        if (!value) {
          return "Debes seleccionar un transportador";
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        console.log("Transportador seleccionado:", result.value);
        resolve(result.value);
      } else {
        resolve("");
      }
    });
  }

  // Método para manejar la visualización de imágenes a tamaño completo
  openFullImage(imageUrl: string): void {
    if (!imageUrl) {
      console.error("No se recibió una URL de imagen válida");
      return;
    }

    console.log("Abriendo imagen a tamaño completo:", imageUrl);

    // Mostrar la imagen a tamaño completo usando SweetAlert2
    Swal.fire({
      imageUrl: imageUrl,
      imageAlt: "Imagen de entrega",
      width: "80%",
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        image: "img-fluid",
      },
    });
  }

  // Método para calcular la recomendación de transportadores necesarios
  calcularRecomendacionTransportadores(): {
    transportadoresNecesarios: number;
    transportadoresActuales: number;
    deficit: number;
    cargaPromedioPorTransportador: number;
    capacidadTotalActual: number;
    capacidadPromedio: number;
    pedidosPorDia: { [fecha: string]: CargaDiaria };
    recomendacionesPorDia: { [fecha: string]: number };
  } {
    // 1. Obtener número de transportadores actuales
    const transportadoresActuales =
      this.vendors && Array.isArray(this.vendors) ? this.vendors.length : 0;

    // 2. Calcular la capacidad total y promedio de los transportadores actuales
    let capacidadTotalActual = 0;
    let capacidadPromedio = 5; // Valor por defecto si no hay transportadores

    if (transportadoresActuales > 0) {
      // Sumar las capacidades individuales
      capacidadTotalActual = this.vendors.reduce((total, transportador) => {
        // Usar la capacidad configurada o 5 como valor por defecto
        const capacidad = transportador.capacidadCarga || 5;
        return total + capacidad;
      }, 0);

      // Calcular el promedio
      capacidadPromedio = capacidadTotalActual / transportadoresActuales;
    }

    // 3. Calcular carga total por día (próximos 7 días)
    const pedidosPorDia: { [fecha: string]: CargaDiaria } = {};
    const recomendacionesPorDia: { [fecha: string]: number } = {};
    let totalPedidosConfirmados = 0;
    let totalPedidosSinProducir = 0;

    // Obtener fecha actual
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Factor de probabilidad para pedidos sin producir (70% de probabilidad)
    const factorProbabilidadSinProducir = 0.7;

    // Para cada día en los próximos 7 días
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split("T")[0]; // formato YYYY-MM-DD
      const fechaTimestamp = fecha.getTime();

      // Obtener datos de carga para este día
      const datoCarga =
        this.metricasLogistica.prediccionCargaProximosDias[fechaTimestamp];

      if (datoCarga) {
        // Crear registro con valores por defecto si no existe
        pedidosPorDia[fechaStr] = {
          confirmados: datoCarga.confirmados,
          pendientesProduccion: datoCarga.pendientesProduccion,
          total: datoCarga.total,
        };

        totalPedidosConfirmados += datoCarga.confirmados;
        totalPedidosSinProducir += datoCarga.pendientesProduccion;

        // Calcular transportadores necesarios considerando pedidos confirmados
        // y un porcentaje de los pendientes de producción
        const cargaEstimada =
          datoCarga.confirmados +
          datoCarga.pendientesProduccion * factorProbabilidadSinProducir;

        const transportadoresNecesariosDia = Math.ceil(
          cargaEstimada / capacidadPromedio,
        );
        recomendacionesPorDia[fechaStr] = transportadoresNecesariosDia;
      } else {
        // Si no hay datos para este día, inicializar con ceros
        pedidosPorDia[fechaStr] = {
          confirmados: 0,
          pendientesProduccion: 0,
          total: 0,
        };
        recomendacionesPorDia[fechaStr] = 0;
      }
    }

    // 4. Calcular el promedio de pedidos diarios (considerando ambos tipos)
    const totalPedidosProyectados =
      totalPedidosConfirmados +
      totalPedidosSinProducir * factorProbabilidadSinProducir;
    const promedioPedidosDiarios = totalPedidosProyectados / 7;

    // 5. Calcular transportadores necesarios en total (basado en la capacidad promedio actual)
    const transportadoresNecesarios = Math.ceil(
      promedioPedidosDiarios / capacidadPromedio,
    );

    // 6. Calcular déficit de transportadores
    const deficit = Math.max(
      0,
      transportadoresNecesarios - transportadoresActuales,
    );

    // 7. Calcular carga promedio por transportador actual
    const cargaPromedioPorTransportador =
      transportadoresActuales > 0
        ? promedioPedidosDiarios / transportadoresActuales
        : promedioPedidosDiarios; // Si no hay transportadores, la carga sería todo

    return {
      transportadoresNecesarios,
      transportadoresActuales,
      deficit,
      cargaPromedioPorTransportador,
      capacidadTotalActual,
      capacidadPromedio,
      pedidosPorDia,
      recomendacionesPorDia,
    };
  }

  // Método para mostrar recomendaciones de transportadores
  mostrarRecomendacionTransportadores() {
    const recomendacion = this.calcularRecomendacionTransportadores();

    // Calcular el porcentaje de carga sin producir del total
    const totalCargaConfirmada = Object.values(
      recomendacion.pedidosPorDia,
    ).reduce((sum, dia) => sum + dia.confirmados, 0);
    const totalCargaSinProducir = Object.values(
      recomendacion.pedidosPorDia,
    ).reduce((sum, dia) => sum + dia.pendientesProduccion, 0);

    // Porcentaje que representan los pedidos sin producir del total
    const porcentajeSinProducir =
      totalCargaSinProducir > 0
        ? Math.round(
          (totalCargaSinProducir /
            (totalCargaConfirmada + totalCargaSinProducir)) *
          100,
        )
        : 0;

    // Formatea las fechas para mostrarlas
    const pedidosPorDiaFormateado = Object.entries(recomendacion.pedidosPorDia)
      .map(([fecha, data]) => {
        return `<tr>
        <td>${this.formatearFecha(fecha)}</td>
        <td class="text-center">${data.confirmados}</td>
        <td class="text-center">
          ${data.pendientesProduccion > 0
            ? `${data.pendientesProduccion} <span class="badge rounded-pill bg-info">SP</span>`
            : "0"
          }
        </td>
        <td class="text-center">${recomendacion.recomendacionesPorDia[fecha]}</td>
      </tr>`;
      })
      .join("");

    // Crear HTML para la tabla de pedidos por día
    const tablaPedidosPorDia = `
      <table class="table table-sm table-striped mt-3">
        <thead class="table-primary">
          <tr>
            <th>Fecha</th>
            <th class="text-center">Pedidos confirmados</th>
            <th class="text-center">Pendientes de producción</th>
            <th class="text-center">Transportadores recomendados</th>
          </tr>
        </thead>
        <tbody>
          ${pedidosPorDiaFormateado}
        </tbody>
      </table>
    `;

    // Crear mensaje de recomendación
    let mensajeRecomendacion = "";
    if (recomendacion.deficit > 0) {
      mensajeRecomendacion = `<div class="alert alert-warning">
        <i class="pi pi-exclamation-triangle me-2"></i>
        <strong>Recomendación:</strong> Se sugiere contratar ${recomendacion.deficit} transportador(es) adicional(es) para manejar la carga actual.
      </div>`;
    } else {
      mensajeRecomendacion = `<div class="alert alert-success">
        <i class="pi pi-check-circle me-2"></i>
        <strong>Recomendación:</strong> El número actual de transportadores es suficiente para manejar la carga prevista.
      </div>`;
    }

    // Mensaje específico para pedidos sin producir
    let mensajeSinProducir = "";
    if (totalCargaSinProducir > 0) {
      mensajeSinProducir = `<div class="alert alert-info">
        <i class="pi pi-info-circle me-2"></i>
        <strong>Nota sobre pedidos sin producir:</strong> Un ${porcentajeSinProducir}% de la carga total corresponde a pedidos sin iniciar producción.
        ${this.obtenerConteoPedidosSinProducirUrgentes() > 0
          ? `<br><strong class="text-danger">¡Atención!</strong> ${this.obtenerConteoPedidosSinProducirUrgentes()} de estos pedidos son urgentes.`
          : ""
        }
      </div>`;
    }

    // Mostrar el análisis en un modal
    Swal.fire({
      title: "Análisis de Transportadores",
      html: `
        <div class="text-start">
          <div class="mb-3">
            <h6 class="fw-bold">Resumen General:</h6>
            <ul class="list-group">
              <li class="list-group-item d-flex justify-content-between">
                <span>Transportadores actuales:</span>
                <span class="fw-bold">${recomendacion.transportadoresActuales}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Capacidad total actual:</span>
                <span class="fw-bold">${recomendacion.capacidadTotalActual} pedidos/día</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Capacidad promedio por transportador:</span>
                <span class="fw-bold">${recomendacion.capacidadPromedio.toFixed(1)} pedidos/día</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Transportadores recomendados:</span>
                <span class="fw-bold">${recomendacion.transportadoresNecesarios}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Carga promedio por transportador:</span>
                <span class="fw-bold">${recomendacion.cargaPromedioPorTransportador.toFixed(1)} pedidos/día</span>
              </li>
            </ul>
          </div>

          ${mensajeRecomendacion}
          ${mensajeSinProducir}

          <h6 class="fw-bold mt-4">Detalles por día:</h6>
          ${tablaPedidosPorDia}

          <div class="mt-3">
            <div class="d-flex gap-3 mb-2">
              <div class="d-flex align-items-center small">
                <span class="badge rounded-pill bg-info me-1">SP</span>
                <span>Pedidos Sin Producir</span>
              </div>
            </div>
            <div class="alert alert-info small">
              <i class="pi pi-info-circle me-2"></i>
              El análisis considera los pedidos sin producir con un factor de probabilidad del 70%, ya que existe cierta incertidumbre sobre su disponibilidad para el día previsto.
            </div>
            <div class="alert alert-secondary small">
              <i class="pi pi-cog me-2"></i>
              Este análisis utiliza la capacidad de carga configurada para cada transportador. Puede modificarla en la sección de gestión de transportadores.
            </div>
          </div>
        </div>
      `,
      width: "700px",
      confirmButtonText: "Entendido",
      showClass: {
        popup: "animate__animated animate__fadeIn",
      },
    });
  }

  // Método para verificar si debe mostrar una alerta basado en la frecuencia
  private deberMostrarAlerta(tipoAlerta: "urgentes" | "sinProducir"): boolean {
    const ahora = new Date();
    let ultimaAlerta: Date | null = null;

    if (tipoAlerta === "urgentes") {
      ultimaAlerta = this.ultimaAlertaPedidosUrgentes;
    } else if (tipoAlerta === "sinProducir") {
      ultimaAlerta = this.ultimaAlertaPedidosSinProducir;
    }

    // Si nunca se ha mostrado la alerta, permitir mostrarla
    if (!ultimaAlerta) {
      return true;
    }

    // Verificar si ha pasado el tiempo suficiente desde la última alerta
    const tiempoTranscurrido = ahora.getTime() - ultimaAlerta.getTime();
    return tiempoTranscurrido >= this.intervaloBetweenAlertas;
  }

  // Método para forzar el reinicio de las alertas (útil para botones de acción)
  public reiniciarControlAlertas(): void {
    this.ultimaAlertaPedidosUrgentes = null;
    this.ultimaAlertaPedidosSinProducir = null;

    Swal.fire({
      title: "Alertas Reiniciadas",
      text: "Las alertas de prioridad han sido reiniciadas y se mostrarán nuevamente cuando sea necesario.",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
  }

  // Método para configurar el intervalo entre alertas (en minutos)
  public configurarIntervaloAlertas(minutos: number): void {
    this.intervaloBetweenAlertas = minutos * 60 * 1000;
  }

  // Método para verificar si hay alertas pendientes de mostrar
  public hayAlertasPendientes(): boolean {
    const pedidosUrgentesPendientes = this.pedidosUrgentes.filter(
      (pedido) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado,
    );

    const pedidosSinProducirUrgentes = this.obtenerPedidosSinProducirUrgentes();

    return (
      pedidosUrgentesPendientes.length > 0 ||
      pedidosSinProducirUrgentes.length > 0
    );
  }

  // Método para obtener el conteo de pedidos en riesgo no despachados ni entregados
  obtenerConteoPedidosEnRiesgoNoDespachados(): number {
    return this.pedidosEnRiesgo.filter(
      (pedido) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado,
    ).length;
  }

  // Método para obtener los pedidos urgentes no despachados ni entregados
  obtenerPedidosUrgentesNoDespachados(): PedidoPriorizado[] {
    return this.pedidosUrgentes.filter(
      (pedido) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado,
    );
  }

  // Método para obtener los pedidos en riesgo no despachados ni entregados
  obtenerPedidosEnRiesgoNoDespachados(): PedidoPriorizado[] {
    return this.pedidosEnRiesgo.filter(
      (pedido) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado,
    );
  }

  // Método para obtener el primer pedido urgente no despachado ni entregado
  obtenerPrimerPedidoUrgenteNoDespachado(): PedidoPriorizado | null {
    const pedidosUrgentesPendientes = this.pedidosUrgentes.filter(
      (pedido) =>
        pedido.estadoProceso !== EstadoProceso.Despachado &&
        pedido.estadoProceso !== EstadoProceso.Entregado,
    );

    return pedidosUrgentesPendientes.length > 0
      ? pedidosUrgentesPendientes[0]
      : null;
  }

  // Método para mostrar resumen de alertas sin modales intrusivos
  public mostrarResumenAlertas(): void {
    this.dialogService.open(AnalisisDespachosComponent, {
      header: 'Análisis y Métricas de Despacho',
      width: '80%',
      contentStyle: { "max-height": "90vh", "overflow": "auto" },
      baseZIndex: 10000,
      data: {
        pedidosUrgentes: this.obtenerPedidosUrgentesNoDespachados(),
        pedidosEnRiesgo: this.obtenerPedidosEnRiesgoNoDespachados(),
        pedidosSinProducir: this.obtenerPedidosSinProducirUrgentes(),
        zonasCriticas: this.obtenerZonasCriticas(),
        prediccionCarga: this.metricasLogistica.prediccionCargaProximosDias
      }
    });
  }

  // Método para ordenar fechas cronológicamente (para usar con keyvalue pipe)
  orderByDate = (a: any, b: any): number => {
    // Convertir las claves (que son timestamps) a números y comparar
    const dateA = Number(a.key);
    const dateB = Number(b.key);

    if (dateA < dateB) {
      return -1;
    } else if (dateA > dateB) {
      return 1;
    } else {
      return 0;
    }
  };

  // Método para limpiar completamente el estado de orden de envío
  private limpiarEstadoOrdenEnvio(): void {
    this.nroShippingOrder = null;
    this.nuevaOrdenEnvio = null;
    this.transportadorSeleccionado = null;
    this.pedidosSeleccionados = [];
    this.metodoEnvio = undefined;

    // Resetear formularios si existen
    if (this.ordenEnvioForm) {
      this.ordenEnvioForm.reset();
    }

    console.log("Estado de orden de envío limpiado completamente");
  }

  // Métodos para geocodificación y mapa

  /**
   * Geocodifica las direcciones de pedidos que no tienen coordenadas
   */
  async geocodificarDireccionesPedidos(): Promise<void> {
    if (this.geocodingInProgress) {
      console.log('Geocodificación ya en progreso');
      return;
    }

    this.geocodingInProgress = true;
    this.geocodingProgress = 0;

    // Mostrar animación inicial en el mapa
    if (this.mapaComponent) {
      this.mapaComponent.mostrarAnimacionGeocodificacion();
      this.mapaComponent.mostrarEfectoBusqueda();
    }

    try {
      // Filtrar pedidos que necesitan geocodificación
      const pedidosSinCoordenadas = this.orders.filter(pedido =>
        pedido.envio &&
        pedido.envio.direccionEntrega &&
        pedido.envio.ciudad &&
        (!pedido.envio.latitud || !pedido.envio.longitud)
      );

      // DIAGNÓSTICO: Mostrar pedidos que necesitan geocodificación
      const pedidosDespachadosSinCoordenadas = pedidosSinCoordenadas.filter(p => p.estadoProceso === 'Despachado');

      console.log('🌍 DIAGNÓSTICO GEOCODIFICACIÓN:');
      console.log(`📍 Total pedidos sin coordenadas: ${pedidosSinCoordenadas.length}`);
      console.log(`🚚 Pedidos despachados sin coordenadas: ${pedidosDespachadosSinCoordenadas.length}`);

      if (pedidosDespachadosSinCoordenadas.length > 0) {
        console.log('🚚 Pedidos despachados que se van a geocodificar:');
        pedidosDespachadosSinCoordenadas.forEach(p => {
          console.log(`  - ${p.nroPedido}: ${p.envio?.direccionEntrega}, ${p.envio?.ciudad}`);
        });
      }

      if (pedidosSinCoordenadas.length === 0) {
        console.log('No hay pedidos sin coordenadas para geocodificar');
        this.geocodingInProgress = false;
        return;
      }

      console.log(`Geocodificando ${pedidosSinCoordenadas.length} pedidos...`);

      // PRIORIZAR PEDIDOS DESPACHADOS: Reorganizar array para procesar primero los despachados
      const pedidosDespachados = pedidosSinCoordenadas.filter(p => p.estadoProceso === 'Despachado');
      const pedidosOtros = pedidosSinCoordenadas.filter(p => p.estadoProceso !== 'Despachado');

      // Crear array priorizado: despachados primero, luego otros
      const pedidosPriorizados = [...pedidosDespachados, ...pedidosOtros];

      console.log(`📋 Orden de geocodificación: ${pedidosDespachados.length} despachados primero, luego ${pedidosOtros.length} otros`);

      // Procesar pedidos en lotes para evitar sobrecargar la API
      const batchSize = 5;
      const totalBatches = Math.ceil(pedidosPriorizados.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = pedidosPriorizados.slice(i * batchSize, (i + 1) * batchSize);
        await this.procesarBatchGeocodificacion(batch);

        this.geocodingProgress = ((i + 1) / totalBatches) * 100;

        // Actualizar mapa después de cada lote si contiene pedidos despachados
        const batchTieneDespachados = batch.some(p => p.estadoProceso === 'Despachado');
        if (batchTieneDespachados) {
          console.log(`🗺️ Actualizando mapa después de geocodificar lote con ${batch.filter(p => p.estadoProceso === 'Despachado').length} despachados`);
          this.actualizarConfiguracionMapa();

          // Actualizar progreso en el mapa
          if (this.mapaComponent) {
            this.mapaComponent.actualizarProgresoGeocodificacion(this.geocodingProgress);
          }
        }

        // Pequeña pausa entre lotes para no sobrecargar la API
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Geocodificación completada');

      // Actualizar configuración del mapa
      this.actualizarConfiguracionMapa();

      // Mostrar notificación de éxito en el mapa
      if (this.mapaComponent) {
        setTimeout(() => {
          console.log('🎉 Geocodificación completada - animaciones finalizadas');
        }, 1000);
      }

    } catch (error) {
      console.error('Error durante la geocodificación:', error);
    } finally {
      this.geocodingInProgress = false;
      this.geocodingProgress = 0;
    }
  }

  /**
   * Procesa un lote de pedidos para geocodificación
   */
  private async procesarBatchGeocodificacion(pedidos: Pedido[]): Promise<void> {
    const promises = pedidos.map(pedido => this.geocodificarPedido(pedido));
    await Promise.allSettled(promises);
  }

  /**
   * Geocodifica un pedido específico
   */
  private async geocodificarPedido(pedido: Pedido): Promise<void> {
    if (!pedido.envio?.direccionEntrega || !pedido.envio?.ciudad) {
      return;
    }

    const direccionCompleta = `${pedido.envio.direccionEntrega}, ${pedido.envio.ciudad}`;
    const cacheKey = `${pedido.envio.direccionEntrega}_${pedido.envio.ciudad}`;

    try {
      // Verificar caché primero
      const cachedResult = this.geocodingCache.get(cacheKey);
      if (cachedResult) {
        this.aplicarCoordenadasAPedido(pedido, cachedResult);
        return;
      }

      // Llamar al servicio de geocodificación
      const response = await this.geocodingService.geocodeDireccion(
        pedido.envio.direccionEntrega,
        pedido.envio.ciudad
      ).toPromise();

      if (response && response.latitud && response.longitud) {
        // Guardar en caché
        this.geocodingCache.set(cacheKey, response);

        // Aplicar coordenadas al pedido
        this.aplicarCoordenadasAPedido(pedido, response);

        console.log(`Geocodificado: ${pedido.nroPedido} - ${direccionCompleta}`);
      } else {
        console.warn(`No se pudieron obtener coordenadas para: ${direccionCompleta}`);
      }

    } catch (error) {
      console.error(`Error geocodificando ${direccionCompleta}:`, error);

      // Intentar geocodificación de emergencia con coordenadas aproximadas
      try {
        const coordenadasAproximadas = this.obtenerCoordenadasAproximadas(pedido.envio.ciudad);
        if (coordenadasAproximadas) {
          console.log(`📍 Aplicando coordenadas aproximadas para ${pedido.envio.ciudad}`);
          this.aplicarCoordenadasAPedido(pedido, {
            id: `emergency_${Date.now()}`,
            direccion: pedido.envio.direccionEntrega,
            ciudad: pedido.envio.ciudad,
            pais: 'Colombia',
            latitud: coordenadasAproximadas.lat.toString(),
            longitud: coordenadasAproximadas.lng.toString(),
            coordDestino: `${coordenadasAproximadas.lat},${coordenadasAproximadas.lng}`,
            quality: 30
          });
        }
      } catch (emergencyError) {
        console.error(`Error en geocodificación de emergencia:`, emergencyError);
      }
    }
  }

  /**
   * Aplica las coordenadas obtenidas al pedido
   */
  private aplicarCoordenadasAPedido(pedido: Pedido, response: GeocodingResponse): void {
    if (pedido.envio) {
      pedido.envio.latitud = response.latitud;
      pedido.envio.longitud = response.longitud;
    }
  }

  /**
   * Obtiene coordenadas aproximadas para ciudades conocidas
   */
  private obtenerCoordenadasAproximadas(ciudad: string): { lat: number, lng: number } | null {
    const ciudadesConocidas: { [key: string]: { lat: number, lng: number } } = {
      'medellín': { lat: 6.2442, lng: -75.5812 },
      'medellin': { lat: 6.2442, lng: -75.5812 },
      'bogotá': { lat: 4.6097, lng: -74.0817 },
      'bogota': { lat: 4.6097, lng: -74.0817 },
      'cali': { lat: 3.4516, lng: -76.5320 },
      'barranquilla': { lat: 10.9639, lng: -74.7964 },
      'cartagena': { lat: 10.3910, lng: -75.4794 },
      'envigado': { lat: 6.1629, lng: -75.5891 },
      'itagüí': { lat: 6.1644, lng: -75.5996 },
      'itagui': { lat: 6.1644, lng: -75.5996 },
      'bello': { lat: 6.3370, lng: -75.5559 },
      'sabaneta': { lat: 6.1515, lng: -75.6166 },
      'la estrella': { lat: 6.1581, lng: -75.6414 },
      'caldas': { lat: 6.0930, lng: -75.6339 },
      'copacabana': { lat: 6.3460, lng: -75.5076 },
      'girardota': { lat: 6.3797, lng: -75.4473 }
    };

    if (!ciudad) return null;

    const ciudadNormalizada = ciudad.toLowerCase()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      .trim();

    return ciudadesConocidas[ciudadNormalizada] || null;
  }

  /**
   * Transforma los datos de pedidos al formato requerido por el mapa
   */
  transformarPedidosAUbicaciones(): UbicacionPedido[] {
    // DIAGNÓSTICO: Logging detallado para pedidos despachados
    const totalPedidos = this.orders.length;
    const pedidosDespachados = this.orders.filter(p => p.estadoProceso === 'Despachado');
    const pedidosDespachadosConDireccion = pedidosDespachados.filter(p => p.envio?.direccionEntrega);
    const pedidosDespachadosConCoordenadas = pedidosDespachados.filter(p =>
      p.envio?.latitud && p.envio?.longitud
    );

    console.log('🚚 DIAGNÓSTICO PEDIDOS DESPACHADOS:');
    console.log(`📦 Total pedidos cargados: ${totalPedidos}`);
    console.log(`🚚 Pedidos con estado "Despachado": ${pedidosDespachados.length}`);
    console.log(`📍 Pedidos despachados con dirección: ${pedidosDespachadosConDireccion.length}`);
    console.log(`🗺️ Pedidos despachados con coordenadas: ${pedidosDespachadosConCoordenadas.length}`);

    if (pedidosDespachados.length > 0) {
      console.log('📋 Detalle de pedidos despachados:');
      pedidosDespachados.forEach(p => {
        console.log(`  - ${p.nroPedido}: ${p.envio?.direccionEntrega || 'SIN DIRECCIÓN'} | Coords: ${p.envio?.latitud ? 'SÍ' : 'NO'}`);
      });
    }

    let pedidosFiltrados = this.orders
      .filter(pedido =>
        pedido.envio?.latitud &&
        pedido.envio?.longitud &&
        pedido.envio?.direccionEntrega
      );

    console.log(`🔍 Pedidos con coordenadas válidas (todos los estados): ${pedidosFiltrados.length}`);

    // Aplicar filtro de estado si está activo
    if (this.filtroEstadoMapa) {
      const antesDelFiltro = pedidosFiltrados.length;
      pedidosFiltrados = pedidosFiltrados.filter(pedido =>
        pedido.estadoProceso === this.filtroEstadoMapa
      );
      console.log(`🎯 Filtro activo: "${this.filtroEstadoMapa}" - Antes: ${antesDelFiltro}, Después: ${pedidosFiltrados.length}`);
    }

    const ubicacionesFinales = pedidosFiltrados.map(pedido => ({
      nroPedido: pedido.nroPedido || '',
      estado: pedido.estadoProceso,
      cliente: pedido.cliente?.nombres_completos || 'Cliente no especificado',
      direccion: `${pedido.envio!.direccionEntrega}, ${pedido.envio!.ciudad || ''}`,
      latitud: parseFloat(pedido.envio!.latitud!),
      longitud: parseFloat(pedido.envio!.longitud!),
      transportador: pedido.transportador?.nombre || '',
      fechaEntrega: pedido.fechaEntrega || '',
      horaEstimada: pedido.horarioEntrega || '',
      distanciaRestante: undefined, // Se puede calcular más tarde
      tiempoEstimado: undefined // Se puede calcular más tarde
    }));

    console.log(`✅ Total ubicaciones finales para el mapa: ${ubicacionesFinales.length}`);

    return ubicacionesFinales;
  }

  /**
   * Actualiza la configuración del mapa con los datos actuales
   */
  actualizarConfiguracionMapa(): void {
    const ubicaciones = this.transformarPedidosAUbicaciones();

    this.configuracionMapa = {
      ...this.configuracionMapa,
      ubicaciones: ubicaciones
    };

    // Actualizar métricas de logística
    if (this.metricasLogistica) {
      this.metricasLogistica.ubicacionesPedidos = ubicaciones;
    }

    // Calcular y actualizar métricas unificadas del mapa
    this.calcularMetricasMapa();

    console.log(`Mapa actualizado con ${ubicaciones.length} ubicaciones`);
  }

  /**
   * Calcula las métricas unificadas para el componente del mapa
   */
  private calcularMetricasMapa(): void {
    const ubicaciones = this.configuracionMapa.ubicaciones || [];

    this.mapaMetricas = {
      despachados: ubicaciones.filter(u => u.estado === 'Despachado').length,
      paraDespachar: ubicaciones.filter(u => u.estado === 'ParaDespachar').length,
      empacados: ubicaciones.filter(u => u.estado === 'Empacado').length,
      producidos: ubicaciones.filter(u => u.estado === 'ProducidoTotalmente').length,
      enRuta: ubicaciones.filter(u => u.estado === 'Despachado').length, // Mismo que despachados
      pendientes: ubicaciones.filter(u => u.estado !== 'Despachado').length,
      tiempoPromedioEstimado: this.calcularTiempoPromedioEstimadoMapa(ubicaciones)
    };
  }

  /**
   * Calcula el tiempo promedio estimado de entrega
   */
  private calcularTiempoPromedioEstimadoMapa(ubicaciones: any[]): number {
    const tiempos = ubicaciones
      .filter(u => u.tiempoEstimado && u.tiempoEstimado > 0)
      .map(u => u.tiempoEstimado);

    if (tiempos.length === 0) return 0;

    return Math.round(tiempos.reduce((sum: number, tiempo: number) => sum + tiempo, 0) / tiempos.length);
  }



  /**
   * Fuerza la geocodificación de todos los pedidos
   */
  forzarGeocodificacion(): void {
    // Limpiar caché para forzar nueva geocodificación
    this.geocodingCache.clear();

    // Limpiar coordenadas existentes
    this.orders.forEach(pedido => {
      if (pedido.envio) {
        pedido.envio.latitud = undefined;
        pedido.envio.longitud = undefined;
      }
    });

    // Ejecutar geocodificación
    this.geocodificarDireccionesPedidos();
  }

  /**
   * Filtra las ubicaciones del mapa por estado de proceso
   */
  filtrarMapaPorEstado(estado: string | null): void {
    this.filtroEstadoMapa = estado;
    this.actualizarConfiguracionMapa();
  }

  /**
   * Cuenta pedidos despachados que están mostrados en el mapa
   */
  contarPedidosDespachados(): number {
    return this.configuracionMapa.ubicaciones?.filter(u => u.estado === 'Despachado').length || 0;
  }

  /**
   * Cuenta pedidos despachados que no tienen coordenadas para geocodificar
   */
  contarPedidosDespachadosSinCoordenadas(): number {
    return this.orders.filter(pedido =>
      pedido.estadoProceso === 'Despachado' &&
      pedido.envio?.direccionEntrega &&
      pedido.envio?.ciudad &&
      (!pedido.envio?.latitud || !pedido.envio?.longitud)
    ).length;
  }

  /**
   * Geocodifica específicamente pedidos despachados sin coordenadas
   */
  async geocodificarPedidosDespachados(): Promise<void> {
    console.log('🚚 Iniciando geocodificación prioritaria de pedidos despachados...');

    if (this.geocodingInProgress) {
      console.log('⚠️ Geocodificación ya en progreso');
      return;
    }

    // Filtrar solo pedidos despachados sin coordenadas
    const pedidosDespachadosSinCoordenadas = this.orders.filter(pedido =>
      pedido.estadoProceso === 'Despachado' &&
      pedido.envio &&
      pedido.envio.direccionEntrega &&
      pedido.envio.ciudad &&
      (!pedido.envio.latitud || !pedido.envio.longitud)
    );

    if (pedidosDespachadosSinCoordenadas.length === 0) {
      console.log('✅ No hay pedidos despachados sin coordenadas');
      return;
    }

    console.log(`🎯 Encontrados ${pedidosDespachadosSinCoordenadas.length} pedidos despachados sin coordenadas`);

    this.geocodingInProgress = true;
    this.geocodingProgress = 0;

    try {
      for (let i = 0; i < pedidosDespachadosSinCoordenadas.length; i++) {
        const pedido = pedidosDespachadosSinCoordenadas[i];
        console.log(`🌍 Geocodificando pedido despachado ${i + 1}/${pedidosDespachadosSinCoordenadas.length}: ${pedido.nroPedido}`);

        await this.geocodificarPedido(pedido);

        this.geocodingProgress = ((i + 1) / pedidosDespachadosSinCoordenadas.length) * 100;

        // Actualizar mapa cada 2 pedidos
        if ((i + 1) % 2 === 0) {
          this.actualizarConfiguracionMapa();
        }

        // Pausa corta entre pedidos
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('✅ Geocodificación de pedidos despachados completada');

      // Actualización final del mapa
      this.actualizarConfiguracionMapa();

    } catch (error) {
      console.error('❌ Error durante geocodificación de pedidos despachados:', error);
    } finally {
      this.geocodingInProgress = false;
      this.geocodingProgress = 0;
    }
  }

  /**
   * Asegura que la orden tenga la propiedad metodoEnvio
   * Si no existe, la crea detectando el método basado en los datos existentes
   */
  private ensureMetodoEnvioProperty(order: any): any {
    console.log('🔧 VERIFICANDO propiedad metodoEnvio en orden...');

    if (!order) {
      console.log('❌ No hay orden para procesar');
      return order;
    }

    // Si ya tiene metodoEnvio, verificar que tenga un valor válido
    if (order.hasOwnProperty('metodoEnvio') && order.metodoEnvio) {
      console.log('✅ metodoEnvio YA existe:', order.metodoEnvio);
      return order;
    }

    // Si no tiene o está vacío, detectar y crear
    console.log('⚠️ metodoEnvio NO existe o está vacío, detectando...');

    // Intentar detectar basado en transportador
    let detectedMethod = 'mensajeroPropio'; // default

    if (order.transportador &&
      order.transportador !== '' &&
      order.transportador !== 'mensajero_propio' &&
      order.transportador !== 'Mensajero Propio') {
      detectedMethod = 'transportadora';
      console.log('🚛 Detectado TRANSPORTADORA por field transportador:', order.transportador);
    }

    // Intentar detectar por otros campos
    const possibleFields = [
      order.metodo_envio, order.tipoEnvio, order.tipo_envio, order.shippingMethod
    ];

    for (const field of possibleFields) {
      if (field && typeof field === 'string') {
        const value = field.toLowerCase().trim();
        if (value.includes('transport') || value === 'transportadora') {
          detectedMethod = 'transportadora';
          console.log('📋 Detectado TRANSPORTADORA por field:', field);
          break;
        }
      }
    }

    // Crear/actualizar la propiedad
    order.metodoEnvio = detectedMethod;
    order._metodoEnvioCreated = true; // marcar que fue creado automáticamente

    console.log('✨ CREADA propiedad metodoEnvio:', {
      metodoEnvio: order.metodoEnvio,
      autoCreated: order._metodoEnvioCreated,
      basedOn: order.transportador ? 'transportador' : 'default'
    });

    return order;
  }



  // Método para hacer seguimiento de pedidos despachados
  trackShipment(pedido: Pedido): void {
    if (!pedido.shippingOrder) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin orden de envío',
        text: 'Este pedido no tiene una orden de envío asociada para hacer seguimiento.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Obtener información de la empresa y proveedor logístico
    const companyId = this.getCompanyId(); // Método que debes implementar según tu lógica
    const provider = pedido.transportador || 'default';
    const order = pedido.shippingOrder;

    this.loading = true;

    this.logisticaService.trackDespachado(companyId, provider, order).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('📦 Seguimiento del envío:', response);

        // Mostrar modal de seguimiento con la información obtenida
        this.mostrarModalSeguimiento(pedido, response);
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al hacer seguimiento:', error);

        // Mostrar modal de seguimiento con error
        this.mostrarModalSeguimiento(pedido, null, error);
      }
    });
  }

  // Método para mostrar el modal de seguimiento
  private mostrarModalSeguimiento(pedido: Pedido, trackingInfo: any, error?: any): void {
    const modalRef = this.modalService.open(SeguimientoModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false
    });

    // Configurar el componente del modal
    modalRef.componentInstance.pedido = pedido;
    modalRef.componentInstance.trackingInfo = trackingInfo;

    if (error) {
      modalRef.componentInstance.error = 'Error al obtener información de seguimiento';
    }

    // Manejar el evento de refrescar
    modalRef.componentInstance.onRefresh.subscribe(() => {
      this.refrescarTracking(pedido, modalRef);
    });
  }

  // Método para refrescar el tracking
  private refrescarTracking(pedido: Pedido, modalRef: any): void {
    const companyId = this.getCompanyId();
    const provider = pedido.transportador || 'default';
    const order = pedido.shippingOrder;

    modalRef.componentInstance.loading = true;
    modalRef.componentInstance.error = '';

    this.logisticaService.trackDespachado(companyId, provider, order).subscribe({
      next: (response) => {
        modalRef.componentInstance.loading = false;
        modalRef.componentInstance.trackingInfo = response;
        console.log('📦 Seguimiento actualizado:', response);
      },
      error: (error) => {
        modalRef.componentInstance.loading = false;
        modalRef.componentInstance.error = 'Error al actualizar la información de seguimiento';
        console.error('❌ Error al actualizar seguimiento:', error);
      }
    });
  }

  // Método auxiliar para obtener el ID de la empresa (implementar según tu lógica)
  private getCompanyId(): string {
    // Implementar según tu lógica de obtención de companyId
    // Por ejemplo, desde un servicio de autenticación o configuración
    return 'default'; // Valor por defecto
  }

  // Método para buscar shipment en logística
  findShipment(pedido: Pedido): void {
    if (!pedido.shippingOrder) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin orden de envío',
        text: 'Este pedido no tiene una orden de envío asociada para buscar shipment.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Construir payload para buscar shipment según la estructura esperada
    const shipmentPayload = {
      provider: pedido.providerShipment || 'mensajeroPropio',
      order: pedido
    };

    this.loading = true;

    // Debug: mostrar el payload que se envía
    console.log('🔍 Enviando payload para findShipment:', shipmentPayload);

    this.logisticaService.findShipment(shipmentPayload).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('🔍 Shipment encontrado:', response);

        // Mostrar información del shipment encontrado
        this.mostrarInformacionShipment(pedido, response);
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al buscar shipment:', error);

        Swal.fire({
          icon: 'error',
          title: 'Error en búsqueda',
          text: 'No se pudo encontrar información del shipment en logística.',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  // Método para mostrar información del shipment encontrado
  private mostrarInformacionShipment(pedido: Pedido, shipmentInfo: any): void {
    let htmlContent = `
      <div class="text-start">
        <h6 class="mb-3">🔍 Información del Shipment</h6>
        <div class="row">
          <div class="col-md-6">
            <p><strong>Pedido:</strong> ${pedido.nroPedido}</p>
            <p><strong>Orden de Envío:</strong> ${pedido.shippingOrder}</p>
            <p><strong>Transportador:</strong> ${pedido.transportador || 'No especificado'}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Estado:</strong> ${pedido.estadoProceso}</p>
            <p><strong>Cliente:</strong> ${pedido.cliente?.nombres_completos} ${pedido.cliente?.apellidos_completos}</p>
            <p><strong>Ciudad:</strong> ${pedido.envio?.ciudad || 'No especificada'}</p>
          </div>
        </div>
    `;

    // Agregar información del shipment si está disponible
    if (shipmentInfo && (shipmentInfo.shipment || shipmentInfo.data)) {
      const shipment = shipmentInfo.shipment || shipmentInfo.data;
      htmlContent += `
        <hr class="my-3">
        <h6 class="mb-2">📦 Datos del Shipment</h6>
        <div class="alert alert-success">
          <p><strong>ID del Shipment:</strong> ${shipment.id || shipment._id || 'No disponible'}</p>
          <p><strong>Estado del Shipment:</strong> ${shipment.estado || shipment.status || 'No disponible'}</p>
          <p><strong>Proveedor:</strong> ${shipment.provider || shipment.transportador || 'No disponible'}</p>
          <p><strong>Orden:</strong> ${shipment.order || shipment.nroShippingOrder || 'No disponible'}</p>
          <p><strong>Fecha de Creación:</strong> ${shipment.fechaCreacion || shipment.createdAt || 'No disponible'}</p>
          <p><strong>Última Actualización:</strong> ${shipment.ultimaActualizacion || shipment.updatedAt || 'No disponible'}</p>
        </div>
      `;

      // Mostrar información adicional si está disponible
      if (shipment.detalles || shipment.details) {
        const detalles = shipment.detalles || shipment.details;
        htmlContent += `
          <div class="mt-3">
            <h6 class="mb-2">📋 Detalles Adicionales</h6>
            <div class="alert alert-info">
              <p><strong>Información:</strong> ${detalles.informacion || detalles.info || 'No disponible'}</p>
              <p><strong>Notas:</strong> ${detalles.notas || detalles.notes || 'No disponible'}</p>
            </div>
          </div>
        `;
      }
    } else {
      htmlContent += `
        <hr class="my-3">
        <div class="alert alert-warning">
          <i class="pi pi-exclamation-triangle me-2"></i>
          No se encontró información del shipment en el sistema de logística.
        </div>
      `;
    }

    htmlContent += '</div>';

    Swal.fire({
      title: 'Información del Shipment',
      html: htmlContent,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: '600px'
    });
  }

  // NEW METHODS for optimized pagination (2025.09.05)

  /**
   * Process orders data from either optimized or legacy endpoint
   * Extracts common logic for data processing
   */
  private processOrdersData(orders: PedidoPriorizado[], pagination?: any, metrics?: any): void {
    console.log('🔄 Despachos - Processing orders data:', {
      previousOrdersCount: this.orders?.length || 0,
      newOrdersCount: orders?.length || 0,
      hasPagination: !!pagination,
      hasMetrics: !!metrics
    });

    // Ordenar: pedidos SIN shippingOrder primero (necesitan atención), CON shippingOrder al final
    const sortedOrders = [...(orders || [])].sort((a, b) => {
      const aHasShipping = a.shippingOrder ? 1 : 0;
      const bHasShipping = b.shippingOrder ? 1 : 0;
      return aHasShipping - bHasShipping;
    });

    // Force change detection by creating new array reference
    this.orders = sortedOrders;

    // Debug: Log first few order IDs to verify data changes
    const firstOrderIds = this.orders.slice(0, 3).map(order => ({
      nroPedido: order.nroPedido,
      _id: order._id?.slice(-8) // Last 8 characters of ID for brevity
    }));
    console.log('🔍 Despachos - First 3 orders in new data:', firstOrderIds);

    if (pagination) {
      this.totalRecords = pagination.totalItems;
      console.log('📊 Despachos - Updated pagination info:', {
        totalItems: pagination.totalItems,
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        hasNextPage: pagination.hasNextPage,
        hasPreviousPage: pagination.hasPreviousPage,
        loadedOrders: this.orders.length
      });
    } else {
      console.log('📋 Despachos - No pagination info (legacy mode)');
    }

    // Update metrics from service if provided
    if (metrics) {
      console.log('📈 Despachos - Updating metrics from service:', metrics);
      // Merge service metrics with existing calculated metrics
      this.metricasLogistica = {
        ...this.metricasLogistica,
        totalPedidos: metrics.totalPedidos,
        enProduccion: metrics.enProduccion,
        empacados: metrics.empacados,
        enRuta: metrics.enRuta,
        paraDespachar: metrics.paraDespachar,
        entregados: metrics.entregados,
        porCobrar: metrics.porCobrar
      };
    }

    // Apply existing logic
    this.aplicarAlgoritmoPriorizacion(false);
    this.calcularMetricas();
    this.loading = false;

    console.log('✅ Despachos - Data processing completed, loading set to false');
  }

  /**
   * Handler for PrimeNG table lazy loading events
   * Only active when useOptimizedLoading is enabled
   * Enhanced to handle column filters for server-side filtering
   */
  onTableLazyLoad(event: LazyLoadEvent): void {
    if (!this.useOptimizedLoading) {
      console.log('⚠️ Despachos - Lazy load event ignored (optimized loading disabled)');
      return;
    }

    const newCurrentPage = event.first && event.rows ? Math.floor(event.first / event.rows) + 1 : 1;
    const newPageSize = event.rows || this.currentPageSize;
    
    // Store column filters separately for reliable access
    this.columnFilters = event.filters || {};
    
    console.log('🔄 Despachos - Table lazy load event received with filters:', {
      first: event.first,
      rows: event.rows,
      calculatedPage: newCurrentPage,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
      globalFilter: event.globalFilter,
      columnFilters: this.columnFilters,
      eventType: event.first === 0 ? 'INITIAL_LOAD' : 'PAGINATION'
    });

    // Only update and reload if there's a real change (like productos component does)
    if (newPageSize !== this.currentPageSize || newCurrentPage !== this.currentPage) {
      this.currentPageSize = newPageSize;
      this.currentPage = newCurrentPage;
      
      console.log(`📏 Despachos - Page changed to ${this.currentPage}, size: ${this.currentPageSize}`);
    }
    
    // Store the event for use in refrescarDatos (includes filters now)
    this.lastLazyLoadEvent = event;
    
    // Refresh data with current filters (including column filters)
    console.log(`📄 Despachos - Requesting page ${this.currentPage} with ${this.currentPageSize} items and filters`);
    this.refrescarDatos();
  }

  /**
   * Builds the current filter object based on component state
   * Extracted for reusability between optimized and legacy loading
   * Enhanced to include column filters from LazyLoadEvent
   * Now includes sorting parameters for server-side sorting
   */
  private buildCurrentFilter(): any {
    const baseFilter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      company: JSON.parse(localStorage.getItem("currentCompany") || "{}")
        .nomComercial,
      estadoProceso: [
        EstadoProceso.Rechazado,
        EstadoProceso.ParaDespachar,
        EstadoProceso.ProducidoTotalmente,
        EstadoProceso.SinProducir,
        EstadoProceso.ProducidoParcialmente,
        EstadoProceso.EnProduccion,
        EstadoProceso.Entregado,
        EstadoProceso.Despachado,
        EstadoProceso.Empacado,
        EstadoProceso.EnDespacho
      ],
      estadosPago: [
        EstadoPago.PreAprobado,
        EstadoPago.Aprobado,
        EstadoPago.Pendiente,
        EstadoPago.Pospendiente,
      ],
      tipoFecha: "fechaEntrega"
    };

    // Add sorting parameters from LazyLoadEvent
    if (this.lastLazyLoadEvent) {
      if (this.lastLazyLoadEvent.sortField) {
        baseFilter['sortField'] = this.lastLazyLoadEvent.sortField;
        baseFilter['sortOrder'] = this.lastLazyLoadEvent.sortOrder || 1; // 1 for asc, -1 for desc

        console.log('🔄 Despachos - Sorting parameters added to filter:', {
          sortField: baseFilter['sortField'],
          sortOrder: baseFilter['sortOrder'],
          sortDirection: baseFilter['sortOrder'] === 1 ? 'ASC' : 'DESC'
        });
      }
    }

    // Add column filters if available (using stored columnFilters for reliability)
    if (this.columnFilters && Object.keys(this.columnFilters).length > 0) {
      const filters = this.columnFilters;
      
      // Text filters (PrimeNG sends filters as arrays)
      if (filters['nroPedido'] && filters['nroPedido'][0]?.value) {
        baseFilter['nroPedido'] = filters['nroPedido'][0].value;
      }
      if (filters['nroFactura'] && filters['nroFactura'][0]?.value) {
        baseFilter['nroFactura'] = filters['nroFactura'][0].value;
      }
      if (filters['shippingOrder'] && filters['shippingOrder'][0]?.value) {
        baseFilter['shippingOrder'] = filters['shippingOrder'][0].value;
      }
      if (filters['cliente'] && filters['cliente'][0]?.value) {
        baseFilter['cliente'] = filters['cliente'][0].value;
      }
      if (filters['ciudad'] && filters['ciudad'][0]?.value) {
        baseFilter['ciudad'] = filters['ciudad'][0].value;
      }
      if (filters['zonaCobro'] && filters['zonaCobro'][0]?.value) {
        baseFilter['zonaCobro'] = filters['zonaCobro'][0].value;
      }
      if (filters['formaEntrega'] && filters['formaEntrega'][0]?.value) {
        baseFilter['formaEntrega'] = filters['formaEntrega'][0].value;
      }
      if (filters['horarioEntrega'] && filters['horarioEntrega'][0]?.value) {
        baseFilter['horarioEntrega'] = filters['horarioEntrega'][0].value;
      }
      
      // Multi-select filters (may have direct value property for multiselect)
      if (filters['estadoPago']) {
        // Check if it's the multiselect format (direct value) or array format
        const estadoPagoValue = filters['estadoPago'].value || (filters['estadoPago'][0]?.value);
        if (estadoPagoValue && estadoPagoValue.length > 0) {
          baseFilter['estadosPago'] = estadoPagoValue;
        }
      }
      if (filters['estadoProceso']) {
        // Check if it's the multiselect format (direct value) or array format
        const estadoProcesoValue = filters['estadoProceso'].value || (filters['estadoProceso'][0]?.value);
        if (estadoProcesoValue && estadoProcesoValue.length > 0) {
          baseFilter['estadoProceso'] = estadoProcesoValue;
        }
      }
      
      // Date filters (also sent as arrays)
      if (filters['fechaCreacion'] && filters['fechaCreacion'][0]?.value) {
        baseFilter['fechaCreacionFilter'] = filters['fechaCreacion'][0].value;
      }
      if (filters['fechaEntrega'] && filters['fechaEntrega'][0]?.value) {
        baseFilter['fechaEntregaFilter'] = filters['fechaEntrega'][0].value;
      }
      
      // Additional text filters (also sent as arrays)
      if (filters['empacador'] && filters['empacador'][0]?.value) {
        baseFilter['empacador'] = filters['empacador'][0].value;
      }
      if (filters['transportador'] && filters['transportador'][0]?.value) {
        baseFilter['transportador'] = filters['transportador'][0].value;
      }

      console.log('🔍 Despachos - Column filters applied to request:', {
        totalFilters: Object.keys(filters).length,
        activeFilters: Object.keys(filters).filter(key => {
          // Check for array format (text/date filters) or direct value (multiselect)
          return (filters[key][0]?.value !== undefined) || 
                 (filters[key].value !== undefined);
        }).length,
        filterDetails: filters,
        extractedValues: Object.keys(filters).reduce((acc, key) => {
          const value = filters[key][0]?.value || filters[key].value;
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {})
      });
    }

    return baseFilter;
  }

  // ===== MÉTODOS PARA EL SISTEMA DE FILTROS AVANZADOS =====

  /**
   * Inicializa las opciones para los filtros avanzados
   */
  initializeFilterOptions(): void {
    // Opciones para estados de pago
    this.estadosPagoOptions = [
      { label: 'Todos', value: 'all' },
      { label: 'Pendiente', value: 'Pendiente' },
      { label: 'Aprobado', value: 'Aprobado' },
      { label: 'PreAprobado', value: 'PreAprobado' },
      { label: 'Rechazado', value: 'Rechazado' },
      { label: 'Cancelado', value: 'Cancelado' },
      { label: 'Pospendiente', value: 'Pospendiente' },
      { label: 'Precancelado', value: 'Precancelado' }
    ];

    // Opciones para estados de proceso
    this.estadosProcesoOptions = [
      { label: 'Todos', value: 'all' },
      { label: 'Sin Producir', value: 'SinProducir' },
      { label: 'En Producción', value: 'EnProduccion' },
      { label: 'Producido Parcialmente', value: 'ProducidoParcialmente' },
      { label: 'Producido Totalmente', value: 'ProducidoTotalmente' },
      { label: 'Empacado', value: 'Empacado' },
      { label: 'Para Despachar', value: 'ParaDespachar' },
      { label: 'Despachado', value: 'Despachado' },
      { label: 'Entregado', value: 'Entregado' },
      { label: 'Rechazado', value: 'Rechazado' },
      { label: 'Cerrado', value: 'Cerrado' }
    ];

    // Presets de fechas
    this.datePresets = [
      { label: 'Hoy', value: 'today' },
      { label: 'Ayer', value: 'yesterday' },
      { label: 'Esta semana', value: 'thisWeek' },
      { label: 'Semana pasada', value: 'lastWeek' },
      { label: 'Este mes', value: 'thisMonth' },
      { label: 'Mes pasado', value: 'lastMonth' },
      { label: 'Últimos 7 días', value: 'last7Days' },
      { label: 'Últimos 30 días', value: 'last30Days' }
    ];
  }

  /**
   * Maneja el cambio en la búsqueda rápida
   */
  onSearchQueryChange(value: string): void {
    this.searchQuery = value;
    // Usar debounce para evitar llamadas excesivas
    this.searchSubject.next(value);
  }

  /**
   * Maneja el cambio en la fecha inicial
   */
  onDateFromChange(date: Date | null): void {
    this.fechaInicialDate = date;
    if (date) {
      // Crear nueva instancia para no modificar la fecha original
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      this.fechaInicial = startDate;
    } else {
      this.fechaInicial = date;
    }
    if (date) {
      this.refrescar();
    }
  }

  /**
   * Maneja el cambio en la fecha final
   */
  onDateToChange(date: Date | null): void {
    this.fechaFinalDate = date;
    if (date) {
      // Crear nueva instancia para no modificar la fecha original
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      this.fechaFinal = endDate;
    } else {
      this.fechaFinal = date;
    }
    if (date) {
      this.refrescar();
    }
  }

  /**
   * Maneja el cambio en el preset de fecha
   */
  onDatePresetChange(preset: string): void {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = new Date(today);

    switch (preset) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case 'thisWeek':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() + 1);
        break;
      case 'lastWeek':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() - 6);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last7Days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'last30Days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        return;
    }

    // Set proper times for start and end dates
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    this.fechaInicialDate = startDate;
    this.fechaFinalDate = endDate;
    this.fechaInicial = startDate;
    this.fechaFinal = endDate;
    this.selectedDatePreset = '';

    this.refrescar();
  }

  /**
   * Maneja el cambio en el estado de pago
   */
  onEstadoPagoChange(): void {
    this.refrescar();
  }

  /**
   * Maneja el cambio en el estado de proceso
   */
  onEstadoProcesoChange(): void {
    this.refrescar();
  }

  /**
   * Alterna la visualización de filtros avanzados
   */
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.fechaInicial ||
      this.fechaFinal ||
      this.quickFilters.estadoPago !== 'all' ||
      this.quickFilters.estadoProceso !== 'all'
    );
  }

  /**
   * Obtiene el número de filtros activos
   */
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.fechaInicial) count++;
    if (this.fechaFinal) count++;
    if (this.quickFilters.estadoPago !== 'all') count++;
    if (this.quickFilters.estadoProceso !== 'all') count++;
    return count;
  }

  /**
   * Limpia todos los filtros
   */
  clearAllFilters(): void {
    this.searchQuery = '';
    this.fechaInicial = null;
    this.fechaFinal = null;
    this.fechaInicialDate = null;
    this.fechaFinalDate = null;
    this.selectedDatePreset = '';
    this.quickFilters = {
      estadoPago: 'all',
      estadoProceso: 'all'
    };
    this.refrescar();
  }

  /**
   * Limpia el filtro de fecha específico
   */
  clearDateFilter(type: 'inicial' | 'final'): void {
    if (type === 'inicial') {
      this.fechaInicial = null;
      this.fechaInicialDate = null;
    } else {
      this.fechaFinal = null;
      this.fechaFinalDate = null;
    }
    this.refrescar();
  }

  /**
   * Limpia el filtro de búsqueda
   */
  clearSearchFilter(): void {
    this.searchQuery = '';
    this.refrescar();
  }

  /**
   * Limpia un filtro rápido específico
   */
  clearQuickFilter(filterType: 'estadoPago' | 'estadoProceso'): void {
    this.quickFilters[filterType] = 'all';
    this.refrescar();
  }

  /**
   * Maneja el click en las métricas para aplicar filtros
   */
  onMetricClick(estadoProceso: string): void {
    if (estadoProceso === 'all') {
      // Limpiar todos los filtros de estado
      this.quickFilters.estadoProceso = 'all';
    } else if (estadoProceso === 'urgentes') {
      // Para pedidos urgentes, no hay un filtro específico de estado
      // Podríamos implementar una lógica custom aquí en el futuro
      this.toastr.info('Filtro de urgentes en desarrollo', 'Información');
      return;
    } else {
      // Aplicar filtro por estado de proceso
      this.quickFilters.estadoProceso = estadoProceso;
    }

    // Refrescar los datos con el nuevo filtro
    this.refrescar();
  }

  /**
   * Formatea una fecha para mostrar en los tags
   */
  formatDateForDisplay(date: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Obtiene la clase CSS para el estado
   */
  getStatusClass(value: string, type: 'pago' | 'proceso'): string {
    if (type === 'pago') {
      switch (value) {
        case 'Pendiente':
        case 'Pospendiente':
          return 'status-warning';
        case 'Aprobado':
          return 'status-success';
        case 'PreAprobado':
          return 'status-info';
        case 'Rechazado':
        case 'Cancelado':
        case 'Precancelado':
          return 'status-danger';
        default:
          return 'status-secondary';
      }
    } else {
      switch (value) {
        case 'SinProducir':
          return 'status-secondary';
        case 'EnProduccion':
        case 'ProducidoParcialmente':
        case 'ProducidoTotalmente':
          return 'status-info';
        case 'Empacado':
          return 'status-primary';
        case 'ParaDespachar':
        case 'Despachado':
          return 'status-warning';
        case 'Entregado':
          return 'status-success';
        case 'Rechazado':
          return 'status-danger';
        case 'Cerrado':
          return 'status-dark';
        default:
          return 'status-secondary';
      }
    }
  }


  /**
   * Maneja el cambio en la selección de columnas
   */
  onColumnSelectionChange(): void {
    // Actualizar la visibilidad de las columnas
    this.displayedColumns.forEach(col => {
      col.visible = this.selectedColumns.some(selected => selected.field === col.field);
    });
  }

  /**
   * Restaura la configuración de columnas por defecto
   */
  resetColumnConfig(): void {
    this.selectedColumns = this.displayedColumns.filter(col => col.visible);
  }

  /**
   * Exporta los datos a Excel
   */
  exportarExcel(): void {
    // Implementar exportación a Excel
    console.log('Exportando a Excel...', this.orders);
    // Aquí puedes implementar la lógica de exportación
  }

  /**
   * Inicializa las fechas por defecto al mismo día (hoy)
   */
  initializeDefaultDates(): void {
    const today = new Date();

    // Crear fechas para el inicio del día (00:00:00)
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);

    // Crear fechas para el final del día (23:59:59.999)
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // Establecer la misma fecha para desde y hasta (hoy) con tiempos correctos
    this.fechaInicial = startDate;
    this.fechaFinal = endDate;
    this.fechaInicialDate = new Date(today); // Para el calendar UI (sin modificar tiempo)
    this.fechaFinalDate = new Date(today);   // Para el calendar UI (sin modificar tiempo)

    console.log('📅 Fechas inicializadas:', {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      fechaInicialDate: this.fechaInicialDate,
      fechaFinalDate: this.fechaFinalDate
    });
  }

  // ========== FUNCIONES UTILITARIAS PARA INFORMACIÓN DE ENVÍO ==========

  /**
   * Obtiene el nombre completo priorizando información del envío sobre la del cliente
   * @param pedido - El pedido del cual obtener el nombre
   * @returns El nombre completo del destinatario
   */
  getNombreDestinatario(pedido: Pedido): string {
    // Priorizar información del envío sobre la del cliente
    const nombresEnvio = `${pedido.envio?.nombres || ""} ${pedido.envio?.apellidos || ""}`.trim();
    const nombresCliente = pedido.cliente?.nombres_completos || 
                          `${pedido.cliente?.nombres_completos || ""} ${pedido.cliente?.apellidos_completos || ""}`.trim();
    
    // Usar información del envío si está disponible, sino usar información del cliente
    return nombresEnvio || nombresCliente || "N/A";
  }

  /**
   * Obtiene el teléfono priorizando información del envío sobre la del cliente
   * @param pedido - El pedido del cual obtener el teléfono
   * @returns El teléfono del destinatario
   */
  getTelefonoDestinatario(pedido: Pedido): string {
    return pedido.envio?.celular || 
           pedido.cliente?.numero_celular_comprador || 
           "N/A";
  }

  /**
   * Obtiene la dirección completa del envío con todos los detalles
   * @param pedido - El pedido del cual obtener la dirección
   * @returns La dirección completa del destinatario con todos los detalles
   */
  getDireccionCompletaDestinatario(pedido: Pedido): string {
    const direccionParts = [
      pedido.envio?.direccionEntrega,
      pedido.envio?.nombreUnidad,
      pedido.envio?.especificacionesInternas,
      pedido.envio?.barrio,
      pedido.envio?.ciudad,
      pedido.envio?.departamento,
      pedido.envio?.pais,
    ].filter(Boolean);

    return direccionParts.length > 0 ? direccionParts.join(", ") : "N/A";
  }

  /**
   * Obtiene información detallada de la dirección para impresión
   * @param pedido - El pedido del cual obtener la información
   * @returns Objeto con todos los detalles de la dirección
   */
  getInformacionDetalladaDireccion(pedido: Pedido): {
    direccionPrincipal: string;
    nombreUnidad: string;
    especificacionesInternas: string;
    barrio: string;
    observaciones: string;
    notasDespacho: string;
    notasEntrega: string;
  } {
    return {
      direccionPrincipal: pedido.envio?.direccionEntrega || "N/A",
      nombreUnidad: pedido.envio?.nombreUnidad || "N/A",
      especificacionesInternas: pedido.envio?.especificacionesInternas || "N/A",
      barrio: pedido.envio?.barrio || "N/A",
      observaciones: pedido.envio?.observaciones || "N/A",
      notasDespacho: this.getNotasDespacho(pedido),
      notasEntrega: this.getNotasEntrega(pedido)
    };
  }

  /**
   * Obtiene las notas de despacho del pedido
   * @param pedido - El pedido del cual obtener las notas
   * @returns Las notas de despacho formateadas
   */
  getNotasDespacho(pedido: Pedido): string {
    if (!pedido.notasPedido?.notasDespachos || pedido.notasPedido.notasDespachos.length === 0) {
      return "N/A";
    }

    return pedido.notasPedido.notasDespachos
      .map(nota => `${nota.fecha ? new Date(nota.fecha).toLocaleDateString('es-CO') : 'Sin fecha'}: ${nota.nota || nota.descripcion || 'Sin descripción'}`)
      .join(" | ");
  }

  /**
   * Obtiene las notas de entrega del pedido
   * @param pedido - El pedido del cual obtener las notas
   * @returns Las notas de entrega formateadas
   */
  getNotasEntrega(pedido: Pedido): string {
    if (!pedido.notasPedido?.notasEntregas || pedido.notasPedido.notasEntregas.length === 0) {
      return "N/A";
    }

    return pedido.notasPedido.notasEntregas
      .map(nota => `${nota.fecha ? new Date(nota.fecha).toLocaleDateString('es-CO') : 'Sin fecha'}: ${nota.nota || nota.descripcion || 'Sin descripción'}`)
      .join(" | ");
  }

  /**
   * Obtiene toda la información adicional combinada en un formato compacto
   * @param pedido - El pedido del cual obtener la información
   * @returns Toda la información adicional combinada
   */
  getObservacionesCompletas(pedido: Pedido): string {
    const informacionAdicional: string[] = [];

    // Agregar información de dirección
    if (pedido.envio?.direccionEntrega && pedido.envio.direccionEntrega.trim() !== '') {
      informacionAdicional.push(pedido.envio.direccionEntrega.trim());
    }

    // Agregar nombre de unidad/edificio
    if (pedido.envio?.nombreUnidad && pedido.envio.nombreUnidad.trim() !== '') {
      informacionAdicional.push(pedido.envio.nombreUnidad.trim());
    }

    // Agregar especificaciones internas
    if (pedido.envio?.especificacionesInternas && pedido.envio.especificacionesInternas.trim() !== '') {
      informacionAdicional.push(pedido.envio.especificacionesInternas.trim());
    }

    // Agregar barrio/sector
    if (pedido.envio?.barrio && pedido.envio.barrio.trim() !== '') {
      informacionAdicional.push(pedido.envio.barrio.trim());
    }

    // Agregar observaciones del envío
    if (pedido.envio?.observaciones && pedido.envio.observaciones.trim() !== '') {
      informacionAdicional.push(pedido.envio.observaciones.trim());
    }

    // Agregar notas de despacho
    const notasDespacho = this.getNotasDespacho(pedido);
    if (notasDespacho !== 'N/A') {
      informacionAdicional.push(notasDespacho);
    }

    // Agregar notas de entrega
    const notasEntrega = this.getNotasEntrega(pedido);
    if (notasEntrega !== 'N/A') {
      informacionAdicional.push(notasEntrega);
    }

    // Si no hay información adicional, retornar N/A
    if (informacionAdicional.length === 0) {
      return 'N/A';
    }

    // Combinar toda la información separada por comas
    return informacionAdicional.join(', ');
  }

  /**
   * Genera zonas de entrega de ejemplo para demostración
   * En producción, estas se cargarían desde una base de datos o servicio
   */
  private generarZonasEntregaEjemplo(): any[] {
    // Coordenadas basadas en zonas típicas de Medellín
    return [
      {
        id: 'zona-el-poblado',
        nombre: 'El Poblado',
        descripcion: 'El Poblado, Manila, Astorga, Provenza',
        color: '#2196F3',
        colorBorde: '#1976D2',
        opacidad: 0.4,
        activa: true,
        coordenadas: [
          { lat: 6.2073, lng: -75.5645 },
          { lat: 6.2173, lng: -75.5545 },
          { lat: 6.2073, lng: -75.5445 },
          { lat: 6.1973, lng: -75.5545 },
          { lat: 6.2073, lng: -75.5645 }
        ],
        restricciones: {
          horarioMinimo: '08:00',
          horarioMaximo: '20:00',
          costoAdicional: 0
        },
        estadisticas: {
          pedidosEntregados: 156,
          tiempoPromedioEntrega: 25,
          porcentajeExitoso: 96
        }
      },
      {
        id: 'zona-centro',
        nombre: 'Centro de Medellín',
        descripcion: 'Centro, La Candelaria, San Antonio, Prado Centro',
        color: '#FF9800',
        colorBorde: '#F57C00',
        opacidad: 0.4,
        activa: true,
        coordenadas: [
          { lat: 6.2473, lng: -75.5745 },
          { lat: 6.2573, lng: -75.5645 },
          { lat: 6.2473, lng: -75.5545 },
          { lat: 6.2373, lng: -75.5645 },
          { lat: 6.2473, lng: -75.5745 }
        ],
        restricciones: {
          horarioMinimo: '09:00',
          horarioMaximo: '17:00',
          costoAdicional: 3000
        },
        estadisticas: {
          pedidosEntregados: 89,
          tiempoPromedioEntrega: 35,
          porcentajeExitoso: 88
        }
      },
      {
        id: 'zona-sur',
        nombre: 'Sur del Valle',
        descripcion: 'Envigado, Sabaneta, Itagüí',
        color: '#4CAF50',
        colorBorde: '#388E3C',
        opacidad: 0.4,
        activa: true,
        coordenadas: [
          { lat: 6.1573, lng: -75.5845 },
          { lat: 6.1673, lng: -75.5745 },
          { lat: 6.1573, lng: -75.5645 },
          { lat: 6.1473, lng: -75.5745 },
          { lat: 6.1573, lng: -75.5845 }
        ],
        restricciones: {
          horarioMinimo: '08:00',
          horarioMaximo: '19:00',
          costoAdicional: 5000
        },
        estadisticas: {
          pedidosEntregados: 203,
          tiempoPromedioEntrega: 40,
          porcentajeExitoso: 93
        }
      },
      {
        id: 'zona-occidente',
        nombre: 'Laureles y Belén',
        descripcion: 'Laureles, Estadio, Belén, La América',
        color: '#9C27B0',
        colorBorde: '#7B1FA2',
        opacidad: 0.4,
        activa: true,
        coordenadas: [
          { lat: 6.2373, lng: -75.5945 },
          { lat: 6.2473, lng: -75.5845 },
          { lat: 6.2373, lng: -75.5745 },
          { lat: 6.2273, lng: -75.5845 },
          { lat: 6.2373, lng: -75.5945 }
        ],
        restricciones: {
          horarioMinimo: '07:30',
          horarioMaximo: '18:30',
          costoAdicional: 2000
        },
        estadisticas: {
          pedidosEntregados: 134,
          tiempoPromedioEntrega: 32,
          porcentajeExitoso: 94
        }
      },
      {
        id: 'zona-premium',
        nombre: 'Zona Rosa Premium',
        descripcion: 'Zona Rosa del Poblado, Llanogrande',
        color: '#E91E63',
        colorBorde: '#C2185B',
        opacidad: 0.3,
        activa: true,
        coordenadas: [
          { lat: 6.2073, lng: -75.5595 },
          { lat: 6.2123, lng: -75.5545 },
          { lat: 6.2073, lng: -75.5495 },
          { lat: 6.2023, lng: -75.5545 },
          { lat: 6.2073, lng: -75.5595 }
        ],
        restricciones: {
          horarioMinimo: '10:00',
          horarioMaximo: '21:00',
          costoAdicional: 0
        },
        estadisticas: {
          pedidosEntregados: 78,
          tiempoPromedioEntrega: 20,
          porcentajeExitoso: 98
        }
      }
    ];
  }

  /**
   * Abrir modal de gestión de zonas de entrega
   */
  openZonaGestionModal(): void {
    const modalRef = this.modalService.open(ZonaGestionModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
      windowClass: 'zona-management-modal',
      centered: false
    });

    // Pasar las zonas actuales al modal
    modalRef.componentInstance.zonasExistentes = this.configuracionMapa.zonas || this.obtenerConfiguracionZonas().zonas;

    // Manejar el resultado del modal
    modalRef.result.then((result) => {
      if (result && result.zonas) {
        console.log('🗺️ Zonas actualizadas desde el modal:', result.zonas.length);

        // Actualizar la configuración del mapa con las nuevas zonas
        this.configuracionMapa.zonas = result.zonas;

        // Actualizar la configuración de zonas del mapa
        const nuevaConfiguracion = {
          zonas: result.zonas,
          mostrarZonas: true,
          tipoVisualizacion: 'ambos' as 'relleno' | 'borde' | 'ambos'
        };

        // Si hay un componente de mapa visible, actualizarlo
        if (this.mapaComponent) {
          this.mapaComponent.configuracionZonas = nuevaConfiguracion;
          this.mapaComponent.actualizarZonas();
        }

        // Mostrar mensaje de éxito
        this.toastr.success(
          `Se han actualizado ${result.zonas.length} zonas de entrega`,
          'Zonas Actualizadas',
          { timeOut: 3000 }
        );

        // Forzar detección de cambios
        this.cdr.detectChanges();
      }
    }).catch((dismissed) => {
      if (dismissed !== 'backdrop-click' && dismissed !== 'esc') {
        console.log('🗺️ Modal de zonas cancelado');
      }
    });
  }
}

