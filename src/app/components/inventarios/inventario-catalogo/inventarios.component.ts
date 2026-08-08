import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { NgbModal, NgbModalOptions } from "@ng-bootstrap/ng-bootstrap";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import Swal from "sweetalert2";
import { ProductDetailsComponent } from "../../productos/product-details/product-details.component";
import { Producto } from "../../../shared/models/productos/Producto";
import { MovimientoInventario } from "../model/movimientoinventario";
import * as XLSX from "xlsx";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";
import {
  InventarioService,
  ProductoConsolidado,
  BodegaConsolidada,
  InventarioCorteEstado,
  InventarioCorteResponse,
} from "../../../shared/services/inventarios/inventario.service";
import { TourService } from "../../../shared/services/tour.service";
import { FulfillmentService } from "../../../shared/services/fulfillment/fulfillment.service";
import { ToastrService } from "ngx-toastr";
import { Table } from "primeng/table";
import { MenuItem } from "primeng/api";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

// Tipo extendido para productos con información de inventario
interface ProductoInventario extends Producto {
  id?: string; // ID del producto en el inventario (productoId)
  cantidad?: number;
  bodegaId?: string;
  bodegaNombre?: string;
  // Campos de fulfillment
  stockFulfillment?: number | null;
  fulfillmentLoading?: boolean;
  fulfillmentError?: string;
  diferencia?: number | null;
  // Campos para vista expandida
  inventarioPorBodega?: BodegaStock[];
  fulfillmentWarehouses?: FulfillmentWarehouseStock[];
  detalleLoading?: boolean;
}

interface BodegaStock {
  bodegaId: string;
  bodegaNombre: string;
  cantidad: number;
  tipo: string;
  origenFulfillment?: boolean;
}

interface FulfillmentWarehouseStock {
  id: string;
  name: string;
  quantity: number;
}

interface PageReference {
  firstDocId: string | null;
  lastDocId: string | null;
}

@Component({
  selector: "app-inventarios",
  templateUrl: "./inventarios.component.html",
  styleUrls: ["./inventarios.component.scss"],
})
export class InventarioCatalogoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @ViewChild("dt") dt: Table; // Referencia a la tabla PrimeNG (vista por bodega)
  @ViewChild("dtConsolidado") dtConsolidado: Table; // Referencia a la tabla consolidada

  cargando = false;
  rows: ProductoInventario[] = [];

  // Paginación
  pageSize = 10;
  currentPage = 1; // Página actual
  totalItems = 0;
  totalPages = 0;

  // Historial de referencias de páginas
  // El índice de este array será el número de página
  // pageReferences[1] es para página 1, pageReferences[2] para página 2, etc.
  pageReferences: PageReference[] = [];

  // Variables para determinar la dirección
  // isForward = true significa que vas a una página siguiente
  // isForward = false significa que retrocedes
  isForward = true;

  // Parámetros de backend
  // Cuando avanzamos, usamos lastDocId de la página anterior
  // Cuando retrocedemos, usamos firstDocId de la página actual
  lastDocId: string | null = null;
  firstDocId: string | null = null;

  isMobile = false;
  empresaActual: any;
  ultimasLetras: any;
  bodegasActivasMarketPlaces: any[] = [];

  // Movimientos
  movimiento: { [key: string]: number } = {};
  selectedRow: ProductoInventario;
  inventarioPorMarketplace: any = {};
  pageSizeMovimientos = 10;
  currentPageMovimientos = 1;
  totalPagesMovimientos = 0;
  lastDocIdMovimientos: string | null = null;

  // Manejo de bodegas
  bodegas: any[] = [];
  bodegaSeleccionada: any = null;
  productosSinFiltro: ProductoInventario[] = []; // Para guardar todos los productos sin filtrar

  // Filtros globales
  globalFilterValue: string = "";

  // Nueva propiedad para almacenar los datos filtrados
  rowsFiltradas: any[] = [];

  // Control de los filtros
  filtroGlobal: string = "";
  filtros = {
    referencia: "",
    nombre: "",
    cantidadTipo: "", // 'agotados', 'bajos', 'disponibles'
    precioMin: null,
    precioMax: null,
    valorTotalMin: null,
    valorTotalMax: null,
  };

  // Control del ordenamiento
  ordenamiento: string = "nombreAsc";

  // ============== FULFILLMENT ==============
  fulfillmentEnabled: boolean = false;
  fulfillmentProvider: string = "";
  fulfillmentProviderName: string = "";
  loadingFulfillmentStock: boolean = false;
  syncingProduct: string | null = null; // ID del producto que se está sincronizando
  syncingBodega: boolean = false;
  stockFulfillmentCargado: boolean = false; // Indica si ya se cargó el stock de fulfillment

  // Sync masivo desde Vista Consolidada
  syncingAllProducts: boolean = false;
  syncAllProgress: {
    current: number;
    total: number;
    errors: number;
    success: number;
  } = { current: 0, total: 0, errors: 0, success: 0 };
  bodegaSyncSeleccionada: BodegaConsolidada | null = null; // Bodega seleccionada para sync

  // Modal de sincronización por bodega
  syncBodegaModalVisible: boolean = false;
  loadingSyncBodegaModal: boolean = false;
  productosSyncBodega: {
    id: string;
    referencia: string;
    nombre: string;
    stockKatuq: number;
    stockFulfillment: number | null;
    diferencia: number | null;
    fulfillmentId: string | null;
  }[] = [];
  resumenSyncBodega: {
    total: number;
    conDiferencia: number;
    sinEnlace: number;
    totalDiferencia: number;
  } = {
    total: 0,
    conDiferencia: 0,
    sinEnlace: 0,
    totalDiferencia: 0,
  };

  // ============== MENÚ DE ACCIONES ==============
  rowMenuItems: MenuItem[] = [];
  selectedMenuProducto: ProductoConsolidado | null = null;

  // ============== TABS ==============
  activeTabIndex: number = 0; // 0 = Inventario, 1 = Historial Sync

  // ============== ROW EXPANSION ==============
  expandedRows: { [key: string]: boolean } = {};

  // ============== INICIALIZACIÓN DE INVENTARIO ==============
  initializingInventory: boolean = false;

  // ============== VISTA CONSOLIDADA ==============
  vistaConsolidada: boolean = true; // Modo por defecto: vista consolidada
  productosConsolidados: ProductoConsolidado[] = [];
  productosConsolidadosFiltrados: ProductoConsolidado[] = []; // Lista filtrada para mostrar
  bodegasConsolidadas: BodegaConsolidada[] = [];

  /** Tipos de cliente activos del comercio (lista de precios). Vienen del
   * backend al cargar el consolidado. Se usan para renderizar una columna
   * "Valor [tipo cliente]" por cada uno (estilo bodegas). */
  tiposClienteActivos: { id: string; nombre: string }[] = [];

  /** Items del dropdown "Acciones" en el header. */
  accionesMenuItems: any[] = [
    {
      label: 'Exportar a Excel',
      icon: 'pi pi-file-excel',
      command: () => this.exportarConsolidadoExcel(),
    },
    {
      label: 'Ver inventario por fecha',
      icon: 'pi pi-calendar',
      command: () => this.abrirInventarioCorte(),
    },
  ];
  exportandoExcel = false;

  // ============== INVENTARIO POR FECHA DE CORTE (SOLO LECTURA) ==============
  cutoffDialogVisible = false;
  cutoffLoading = false;
  cutoffExportando = false;
  fechaCorteInventario = '';
  maxFechaCorteInventario = '';
  cutoffStatusFilter: InventarioCorteEstado | '' = '';
  cutoffStatusOptions = [
    { label: 'Todos', value: '' },
    { label: 'Certificado', value: 'certified' },
    { label: 'Ambiguo', value: 'ambiguous' },
    { label: 'Incompleto', value: 'incomplete' },
  ];
  cutoffReport: InventarioCorteResponse | null = null;
  cutoffPageIndex = 0;
  cutoffCursorHistory: Array<string | null> = [null];

  // Filtros para vista consolidada
  filtrosConsolidados = {
    busqueda: "",
    estadoStock: "", // 'agotados', 'bajos', 'disponibles', 'criticos', ''
    bodegaId: "", // ID de bodega específica o '' para todas
    fulfillment: "", // 'con', 'sin', '' — opera sobre productos: producto con
                    // costoFuente=aliaddo-api o integrations.fulfillment.id (con) / ninguno (sin).
                    // Param backend: linkedToFulfillment.
  };
  estadisticasConsolidadas: {
    totalStock: number;
    productosSinStock: number;
    productosBajoStock: number;
  } = {
    totalStock: 0,
    productosSinStock: 0,
    productosBajoStock: 0,
  };
  paginationConsolidada: {
    limit: number;
    page: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
    lastDoc: string | null;
  } = {
    limit: 20,
    page: 1,
    totalPages: 0,
    totalItems: 0,
    hasMore: false,
    lastDoc: null,
  };
  loadingConsolidado: boolean = false;
  // Totales globales calculados en backend
  totalesGlobales: {
    valorTotal: number;
    valorCostoTotal?: number;
    valorPorTipoCliente?: { [tipoClienteId: string]: number };
    margenEstimado?: number;
    totalUnidades: number;
    totalProductos: number;
    totalSKUsCatalogo: number;
    productosSinStock: number;
    productosBajoStock: number;
  } = {
    valorTotal: 0,
    valorCostoTotal: 0,
    valorPorTipoCliente: {},
    margenEstimado: 0,
    totalUnidades: 0,
    totalProductos: 0,
    totalSKUsCatalogo: 0,
    productosSinStock: 0,
    productosBajoStock: 0,
  };

  // ============== MODAL DE SINCRONIZACIÓN ==============
  syncModalVisible: boolean = false;
  productoSyncSeleccionado: ProductoConsolidado | null = null;
  stockKatuqTotal: number = 0;
  stockAliaddoTotal: number = 0;
  diferenciaSyncTotal: number = 0;
  loadingSyncModal: boolean = false;
  errorSyncModal: string | null = null;
  // Desglose por bodega
  bodegasDesglose: {
    idBodega: string;
    nombre: string;
    stockKatuq: number;
    stockAliaddo: number;
    diferencia: number;
  }[] = [];

  // 🔧 FIX: Verifica si hay diferencias en alguna bodega individual
  get hayDiferenciasPorBodega(): boolean {
    return this.bodegasDesglose.some((b) => b.diferencia !== 0);
  }

  // 🔧 FIX: Cuenta las bodegas con diferencias
  get bodegasConDiferenciaCount(): number {
    return this.bodegasDesglose.filter((b) => b.diferencia !== 0).length;
  }

  // ============== ELIMINAR INVENTARIO (TEMPORAL) ==============
  eliminarTodoElInventario(): void {
    const nombreComercio = this.empresaActual?.nomComercial || '';
    Swal.fire({
      title: '⚠️ Eliminar Todo el Inventario',
      html: `<p>Esta acción eliminará <strong>FÍSICAMENTE</strong> todo el inventario del comercio <strong>${nombreComercio}</strong>.</p>
             <p class="text-danger fw-bold">Esta acción NO se puede deshacer.</p>
             <p>Escriba el nombre del comercio para confirmar:</p>`,
      input: 'text',
      inputPlaceholder: nombreComercio,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar Todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      inputValidator: (value) => {
        if (value !== nombreComercio) {
          return `Debe escribir exactamente "${nombreComercio}"`;
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Eliminando inventario...',
          html: 'Por favor espere, esto puede tomar unos minutos.',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });
        this.inventarioService.deleteAllInventoryByCompany(nombreComercio).subscribe({
          next: (response: any) => {
            Swal.fire({
              title: 'Inventario Eliminado',
              html: `<p>${response.message || 'Inventario eliminado correctamente'}</p>`,
              icon: 'success',
            });
            this.recargarInventarioConsolidado();
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: error?.error?.message || 'Error al eliminar el inventario',
              icon: 'error',
            });
          }
        });
      }
    });
  }

  // ============== REPARAR INVENTARIO (DEDUP / FIX) ==============
  reparandoInventario: boolean = false;

  repararInventario(): void {
    Swal.fire({
      title: 'Diagnosticar reparación',
      html: `
        <div class="text-start">
          <p>Esta operación <b>solo analiza</b> el inventario. No cambia ni elimina cantidades.</p>
          <ul>
            <li><b>Bodegas:</b> muestra cuáles necesitarían normalizar su código.</li>
            <li><b>Bodegas huérfanas:</b> muestra cuáles quedarían para revisión.</li>
            <li><b>Productos fantasma:</b> muestra cuáles quedarían para revisión.</li>
          </ul>
          <p class="text-muted small">La reparación real está bloqueada hasta comprobar respaldo y restauración.</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Analizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.reparandoInventario = true;
      Swal.fire({
        title: 'Analizando inventario…',
        html: 'No se está modificando ningún dato.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      this.inventarioService.repararInventario().subscribe({
        next: (resp: any) => {
          this.reparandoInventario = false;
          const corregidos = resp?.corregidos ?? resp?.fixCount ?? 0;
          const eliminados = resp?.eliminados ?? resp?.deleteCount ?? 0;
          Swal.fire({
            title: 'Plan de reparación (sin cambios)',
            html: `
              <div class="text-start">
                <p><b>${corregidos}</b> registro(s) necesitarían corregir <code>idBodega</code>.</p>
                <p><b>${eliminados}</b> registro(s) necesitarían revisión antes de eliminar.</p>
                <p class="text-muted small mb-0">No se cambió ni se eliminó nada.</p>
              </div>
            `,
            icon: 'info',
          });
        },
        error: (err) => {
          this.reparandoInventario = false;
          Swal.fire({
            title: 'Error',
            text: err?.error?.error || err?.error?.message || 'No se pudo reparar el inventario',
            icon: 'error',
          });
        }
      });
    });
  }

  // ============== IMPORTACIÓN ==============
  showImportModal: boolean = false;

  onImportComplete(result: any): void {
    if (result.success > 0) {
      this.recargarInventarioConsolidado();
    }
  }

  // ============== ANÁLISIS IA ==============
  analizandoIA: boolean = false;
  iaAnalysisError: string | null = null;
  iaLastAnalysis: Date | null = null;
  iaMetricasGlobales: {
    saludInventario: string | null;
    bodegaCritica: string | null;
    resumenEjecutivo: string | null;
  } | null = null;

  constructor(
    private service: MaestroService,
    private inventarioService: InventarioService,
    private router: Router,
    private modalService: NgbModal,
    private bodegaService: BodegaService, // Inyectamos el servicio de bodegas
    private tourService: TourService,
    private fulfillmentService: FulfillmentService,
    private toastr: ToastrService,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.maxFechaCorteInventario = this.fechaBogota(-1);
    this.fechaCorteInventario = this.maxFechaCorteInventario;
    this.empresaActual = JSON.parse(
      localStorage.getItem("currentCompany") ?? "{}",
    );
    const texto = this.empresaActual.nomComercial.toString();

    // Initialize tour after component loads only if not completed
    const completedTours = JSON.parse(
      localStorage.getItem("katuq_completed_tours") || "[]",
    );
    if (!completedTours.includes("inventario")) {
      setTimeout(() => {
        this.tourService.startTour(
          "inventario",
          this.tourService.getInventarioTour(),
        );
      }, 2000);
    }
    this.ultimasLetras = texto.substring(texto.length - 3);

    // Inicializar el historial de páginas
    this.pageReferences[this.currentPage] = {
      firstDocId: null,
      lastDocId: null,
    };

    // Verificar si hay fulfillment configurado
    this.checkFulfillmentConfig();

    // Cargar bodegas (necesario para la vista antigua y para el modal)
    this.cargarBodegas();

    // La p-table con [lazy]="true" dispara onLazyLoad al renderizar,
    // eso llama cargarInventarioConsolidado(1) automáticamente.
    // NO llamar aquí para evitar doble request.
  }

  /**
   * Verifica si hay un proveedor de fulfillment configurado
   */
  checkFulfillmentConfig(): void {
    this.fulfillmentService.getConfiguredProviders().subscribe({
      next: (providers) => {
        if (providers && providers.length > 0) {
          const activeProvider = providers.find((p) => p.configured);
          if (activeProvider) {
            this.fulfillmentEnabled = true;
            this.fulfillmentProvider = activeProvider.provider;
            this.fulfillmentProviderName =
              this.fulfillmentService.getProviderDisplayName(
                activeProvider.provider,
              );
            console.log(
              `✅ Fulfillment habilitado: ${this.fulfillmentProviderName}`,
            );
          }
        }
      },
      error: (error) => {
        console.log(
          "No hay fulfillment configurado o error al verificar:",
          error,
        );
        this.fulfillmentEnabled = false;
      },
    });
  }

  cargarBodegas() {
    this.cargando = true;
    this.bodegaService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
        this.cargando = false;
      },
      error: (error) => {
        console.error("Error al cargar bodegas:", error);
        this.cargando = false;
      },
    });
  }

  // ============== MÉTODOS DE VISTA CONSOLIDADA ==============

  /**
   * Carga el inventario consolidado - todos los productos con stock por bodega
   */
  private _metricasCargadas = false;

  cargarInventarioConsolidado(page: number = 1): void {
    this.loadingConsolidado = true;

    // Primera carga: pedir métricas + productos.
    // Cambios de página: solo productos (las métricas globales no cambian entre páginas).
    const includeMetrics = !this._metricasCargadas;

    this.inventarioService.obtenerInventarioConsolidado({
      limit: this.paginationConsolidada.limit,
      page,
      soloInventariables: true,
      includeMetrics,
      stockFilter: this.filtrosConsolidados.estadoStock || undefined,
      search: this.filtrosConsolidados.busqueda?.trim() || undefined,
      bodega: this.filtrosConsolidados.bodegaId || undefined,
      // Filtro fulfillment a nivel producto: con/sin sync de costo Aliaddo.
      linkedToFulfillment: this.filtrosConsolidados.fulfillment || undefined,
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        if (response.success) {
          this.productosConsolidados = response.productos;
          this.aplicarFiltrosConsolidados();

          // Solo actualizar bodegas/tiposCliente cuando incluyen métricas (primera
          // carga). En page 2+ con includeMetrics=false el backend retorna las
          // bodegas SIN .metricas; si sobrescribimos, los totales del header de
          // tabla se vacían al paginar. Las bodegas no cambian entre páginas, por
          // lo que mantener las del primer fetch es seguro.
          const bodegasTraenMetricas = Array.isArray(response.bodegas)
            && response.bodegas.length > 0
            && !!response.bodegas[0]?.metricas;
          if (bodegasTraenMetricas) {
            this.bodegasConsolidadas = response.bodegas;
          }
          if (response.tiposCliente && includeMetrics) {
            this.tiposClienteActivos = response.tiposCliente.map((tc: any) => ({
              id: tc.id,
              nombre: tc.nombre || tc.tipoClienteNombre || tc.id,
            }));
          }
          this.paginationConsolidada = {
            limit: response.pagination?.limit || 20,
            page: response.pagination?.currentPage || page,
            totalPages: response.pagination?.totalPages ?? 0,
            totalItems: response.pagination?.totalItems ?? response.totalProductos ?? 0,
            hasMore: response.pagination?.hasMore ?? false,
            lastDoc: response.pagination?.lastDoc ?? null,
          };
          this.totalItems = this.paginationConsolidada.totalItems;
          if (response.totalesGlobales) {
            this.totalesGlobales = response.totalesGlobales;
          }

          // Totales filtrados: null si no hay filtro, objeto si hay
          this._totalesFiltrados = response.totalesFiltrados || null;

          this._metricasCargadas = true;
        } else {
          this.toastr.error("Error al cargar inventario consolidado");
        }
        this.loadingConsolidado = false;
      },
      error: () => {
        this.toastr.error("Error al cargar inventario");
        this.loadingConsolidado = false;
      },
    });
  }

  /**
   * Recarga completa: fuerza recalcular métricas (después de ajustes, importaciones, syncs).
   */
  recargarInventarioConsolidado(): void {
    this._metricasCargadas = false;
    this.cargarInventarioConsolidado(1);
  }

  /**
   * Carga más productos en la vista consolidada (paginación infinita)
   */
  cargarMasProductos(): void {
    if (this.paginationConsolidada.page < this.paginationConsolidada.totalPages && !this.loadingConsolidado) {
      this.cargarInventarioConsolidado(this.paginationConsolidada.page + 1);
    }
  }

  /**
   * Evento lazy load de p-table — se dispara al cambiar página o rows.
   */
  onLazyLoadConsolidado(event: any): void {
    const rows = event.rows || this.paginationConsolidada.limit;
    this.paginationConsolidada.limit = rows;
    const page = Math.floor((event.first || 0) / rows) + 1;
    this.cargarInventarioConsolidado(page);
  }

  // ============== FILTROS VISTA CONSOLIDADA ==============

  private _busquedaTimeout: any;

  /**
   * Debounce de búsqueda — espera 500ms después de dejar de escribir para llamar al server
   */
  onBusquedaConsolidadoInput(): void {
    clearTimeout(this._busquedaTimeout);
    this._busquedaTimeout = setTimeout(() => {
      this.aplicarFiltrosYResetear();
    }, 500);
  }

  /**
   * Copia datos cargados a la vista.
   * Todos los filtros se aplican en el backend via query params.
   */
  aplicarFiltrosConsolidados(): void {
    this.productosConsolidadosFiltrados = [...this.productosConsolidados];
  }

  /**
   * Aplica filtros Y recarga desde el servidor en página 1.
   * Usar cuando el usuario cambia filtros (dropdown, cards, búsqueda).
   */
  aplicarFiltrosYResetear(): void {
    if (this.dtConsolidado) {
      this.dtConsolidado.first = 0;
    }
    this._metricasCargadas = false;
    this.cargarInventarioConsolidado(1);
  }

  /**
   * Limpia todos los filtros de la vista consolidada
   */
  limpiarFiltrosConsolidados(): void {
    this.filtrosConsolidados = {
      busqueda: "",
      estadoStock: "",
      bodegaId: "",
      fulfillment: "",
    };
    this.aplicarFiltrosYResetear();
  }

  /**
   * Verifica si hay filtros activos
   */
  hayFiltrosActivos(): boolean {
    return !!(
      this.filtrosConsolidados.busqueda ||
      this.filtrosConsolidados.estadoStock ||
      this.filtrosConsolidados.bodegaId ||
      this.filtrosConsolidados.fulfillment
    );
  }

  /**
   * Opciones para el dropdown de bodegas en filtros
   */
  get opcionesBodegasFiltro(): { label: string; value: string }[] {
    const opciones = [{ label: "Todas las bodegas", value: "" }];
    this.bodegasConsolidadas.forEach((b) => {
      opciones.push({ label: b.nombre, value: b.id });
    });
    return opciones;
  }

  /**
   * Obtiene el stock de un producto en una bodega específica
   */
  getStockBodega(producto: ProductoConsolidado, bodegaId: string): number {
    return producto.stockPorBodega?.[bodegaId] ?? 0;
  }

  getCostoUnitario(producto: any): number {
    const costoPlano = Number(producto?.costoUnitario);
    if (Number.isFinite(costoPlano) && costoPlano > 0) return costoPlano;

    const costoPrecio = Number(producto?.precio?.costoUnitario);
    if (Number.isFinite(costoPrecio) && costoPrecio > 0) return costoPrecio;

    const costoObj = Number(producto?.costo?.costoUnitario ?? producto?.costo?.valor);
    return Number.isFinite(costoObj) && costoObj > 0 ? costoObj : 0;
  }

  getValorCostoProducto(producto: any): number {
    return this.getCostoUnitario(producto) * (Number(producto?.stockTotal) || 0);
  }

  // Totales filtrados del backend (null cuando no hay filtro)
  private _totalesFiltrados: {
    totalUnidades: number;
    totalProductos: number;
    productosSinStock: number;
    productosBajoStock: number;
    porBodega: { [id: string]: number };
    valorTotal?: number;
    valorCostoTotal?: number;
    valorPorTipoCliente?: { [tipoClienteId: string]: number };
  } | null = null;

  // ── Métodos de totales: resuelven automáticamente global vs filtrado ──
  // Cuando hay filtros activos, el backend devuelve `totalesFiltrados` con
  // valorTotal/valorCostoTotal/valorPorTipoCliente ya recalculados sobre los
  // productos filtrados — preferimos esos en lugar de re-derivar en cliente.

  getMetricaValorTotal(): number {
    if (!this.hayFiltrosActivos()) return this.totalesGlobales.valorTotal ?? 0;
    return this._totalesFiltrados?.valorTotal
      ?? this.totalesGlobales.valorTotal
      ?? 0;
  }

  /** Exporta el inventario consolidado actual a Excel respetando los filtros activos.
   *  Descarga el archivo directo al browser. */
  exportarConsolidadoExcel(): void {
    if (this.exportandoExcel) return;
    this.exportandoExcel = true;
    this.toastr?.info?.('Generando Excel...', 'Espera unos segundos');
    this.inventarioService.exportarInventarioExcel({
      bodega: this.filtrosConsolidados.bodegaId || undefined,
      linkedToFulfillment: this.filtrosConsolidados.fulfillment || undefined,
      search: this.filtrosConsolidados.busqueda?.trim() || undefined,
      stockFilter: this.filtrosConsolidados.estadoStock || undefined,
      soloInventariables: true,
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (blob: Blob) => {
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.toastr?.success?.('Excel descargado', 'Listo');
        } catch (err) {
          this.toastr?.error?.('Error guardando archivo', 'Error');
        }
        this.exportandoExcel = false;
      },
      error: () => {
        this.toastr?.error?.('Error generando Excel del inventario', 'Error');
        this.exportandoExcel = false;
      },
    });
  }

  private fechaBogota(offsetDays = 0): string {
    const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  abrirInventarioCorte(): void {
    this.cutoffDialogVisible = true;
    this.consultarInventarioCorte(true);
  }

  consultarInventarioCorte(resetPagination = true): void {
    if (!this.fechaCorteInventario || this.cutoffLoading) return;
    if (resetPagination) {
      this.cutoffPageIndex = 0;
      this.cutoffCursorHistory = [null];
    }

    this.cutoffLoading = true;
    const cursor = this.cutoffCursorHistory[this.cutoffPageIndex] || undefined;
    this.inventarioService.consultarInventarioCorte({
      fechaCorte: this.fechaCorteInventario,
      bodega: this.filtrosConsolidados.bodegaId || undefined,
      search: this.filtrosConsolidados.busqueda?.trim() || undefined,
      status: this.cutoffStatusFilter || undefined,
      limit: 100,
      cursor,
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (report) => {
        this.cutoffReport = report;
        if (report.pagination.nextCursor) {
          this.cutoffCursorHistory[this.cutoffPageIndex + 1] = report.pagination.nextCursor;
        } else {
          this.cutoffCursorHistory = this.cutoffCursorHistory.slice(0, this.cutoffPageIndex + 1);
        }
        this.cutoffLoading = false;
      },
      error: (error) => {
        this.cutoffLoading = false;
        this.cutoffReport = null;
        this.toastr.error(
          error?.error?.error || 'No se pudo reconstruir el inventario para esa fecha',
          'Inventario por fecha',
        );
      },
    });
  }

  paginaAnteriorCorte(): void {
    if (this.cutoffPageIndex <= 0 || this.cutoffLoading) return;
    this.cutoffPageIndex -= 1;
    this.consultarInventarioCorte(false);
  }

  paginaSiguienteCorte(): void {
    if (!this.cutoffReport?.pagination?.hasMore || this.cutoffLoading) return;
    this.cutoffPageIndex += 1;
    this.consultarInventarioCorte(false);
  }

  exportarInventarioCorte(): void {
    if (!this.fechaCorteInventario || this.cutoffExportando) return;
    this.cutoffExportando = true;
    this.inventarioService.exportarInventarioExcel({
      fechaCorte: this.fechaCorteInventario,
      bodega: this.filtrosConsolidados.bodegaId || undefined,
      search: this.filtrosConsolidados.busqueda?.trim() || undefined,
      status: this.cutoffStatusFilter || undefined,
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `inventario_corte_${this.fechaCorteInventario}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        this.cutoffExportando = false;
        this.toastr.success('El Excel conserva la confianza y las causas de cada fila', 'Corte exportado');
      },
      error: (error) => {
        this.cutoffExportando = false;
        this.toastr.error(error?.error?.error || 'No se pudo exportar el corte', 'Inventario por fecha');
      },
    });
  }

  etiquetaEstadoCorte(status: InventarioCorteEstado): string {
    if (status === 'certified') return 'Certificado';
    if (status === 'ambiguous') return 'Ambiguo';
    return 'Incompleto';
  }

  claseEstadoCorte(status: InventarioCorteEstado): string {
    if (status === 'certified') return 'bg-success';
    if (status === 'ambiguous') return 'bg-warning text-dark';
    return 'bg-secondary';
  }

  causasCorteEnTexto(causes: string[]): string {
    const labels: { [key: string]: string } = {
      ANCHOR_NOT_VERIFIED: 'La foto base todavía no está certificada',
      CERTIFIED_FROM_NOT_DEFINED: 'No se ha definido desde cuándo la historia está completa',
      CUTOFF_BEFORE_CERTIFIED_FROM: 'La fecha es anterior al período confiable',
      DUPLICATE_INVENTORY_CONFLICT: 'Hay dos saldos distintos para el mismo producto y bodega',
      DUPLICATE_WAREHOUSE_CODE: 'El código de bodega está repetido',
      FIRESTORE_WAREHOUSE_ID_IN_LEDGER: 'Un movimiento guardó el identificador interno de la bodega',
      MOVEMENT_CHAIN_GAP: 'La cadena de movimientos tiene un salto',
      MOVEMENT_DELTA_MISMATCH: 'Un movimiento no coincide con su antes y después',
      MOVEMENT_MISSING_BEFORE_AFTER: 'Falta el saldo anterior o posterior de un movimiento',
      MOVEMENT_MISSING_DATE: 'Hay un movimiento sin fecha',
      MOVEMENT_MISSING_REASON: 'Hay un movimiento sin motivo',
      UNKNOWN_PRODUCT: 'El producto no se pudo identificar',
      UNKNOWN_WAREHOUSE_CODE: 'La bodega no se pudo identificar',
    };
    return (causes || []).map((cause) => labels[cause] || cause).join('. ');
  }

  /** Suma del valor a costo (stock × costoUnitario) respetando los filtros activos. */
  getMetricaValorCostoTotal(): number {
    if (!this.hayFiltrosActivos()) return this.totalesGlobales.valorCostoTotal ?? 0;
    return this._totalesFiltrados?.valorCostoTotal
      ?? this.totalesGlobales.valorCostoTotal
      ?? 0;
  }

  /** Precio (precioConIva) para un producto en un tipo de cliente específico.
   *  Retorna 0 si el producto no tiene precio configurado para ese tipo. */
  getPrecioTipoCliente(producto: any, tipoClienteId: string): number {
    const found = (producto?.preciosPorTipoCliente || []).find(
      (p: any) => p.tipoClienteId === tipoClienteId,
    );
    return Number(found?.precioConIva) || 0;
  }

  /** Valor venta total del producto en el tipo de cliente: precioConIva × stockTotal. */
  getValorVentaPorTipo(producto: any, tipoClienteId: string): number {
    return this.getPrecioTipoCliente(producto, tipoClienteId) * (producto?.stockTotal || 0);
  }

  /** Suma del valor venta para un tipo de cliente sobre todos los productos
   *  (filtrados o totales globales). */
  getMetricaValorVentaPorTipo(tipoClienteId: string): number {
    if (this.hayFiltrosActivos()) {
      return this._totalesFiltrados?.valorPorTipoCliente?.[tipoClienteId] ?? 0;
    }
    return this.totalesGlobales.valorPorTipoCliente?.[tipoClienteId] ?? 0;
  }

  getMetricaUnidades(): number {
    return this._totalesFiltrados?.totalUnidades ?? this.totalesGlobales.totalUnidades ?? 0;
  }

  getMetricaProductosBajoStock(): number {
    return this._totalesFiltrados?.productosBajoStock ?? this.totalesGlobales.productosBajoStock ?? 0;
  }

  getMetricaProductosSinStock(): number {
    return this._totalesFiltrados?.productosSinStock ?? this.totalesGlobales.productosSinStock ?? 0;
  }

  getMetricaTotalProductos(): number {
    return this._totalesFiltrados?.totalProductos ?? this.totalItems ?? 0;
  }

  getMetricaSinInventario(): number {
    const catalogo = this.totalesGlobales.totalSKUsCatalogo || 0;
    const conInventario = this.totalesGlobales.totalProductos || 0;
    return Math.max(0, catalogo - conInventario);
  }

  getTotalBodegaFooter(bodegaId: string): number {
    if (this._totalesFiltrados) return this._totalesFiltrados.porBodega?.[bodegaId] || 0;
    const bodega = this.bodegasConsolidadas.find(b => b.id === bodegaId);
    return bodega?.metricas?.totalUnidades || 0;
  }

  /**
   * Formatea valores grandes de forma abreviada (ej: 12500000 -> "12.5M")
   */
  formatearValorAbreviado(valor: number): string {
    if (valor >= 1000000) {
      return "$" + (valor / 1000000).toFixed(1) + "M";
    } else if (valor >= 1000) {
      return "$" + (valor / 1000).toFixed(0) + "K";
    }
    return "$" + valor.toLocaleString();
  }

  // ============== ANÁLISIS IA ==============

  /**
   * Ejecuta análisis de inventario con IA (ADK Agent)
   * Popula los campos de IA en las métricas de cada bodega y globales
   */
  analizarConIA(): void {
    if (this.bodegasConsolidadas.length === 0) {
      this.toastr.warning("No hay bodegas para analizar", "Análisis IA");
      return;
    }

    this.analizandoIA = true;
    this.iaAnalysisError = null;

    this.inventarioService
      .analyzeInventoryWithIA(this.bodegasConsolidadas)
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Update IA metrics for each bodega
            this.bodegasConsolidadas.forEach((bodega) => {
              const iaMetrics = response.metricasPorBodega[bodega.id];
              if (iaMetrics && bodega.metricas) {
                bodega.metricas.ia = iaMetrics;
              }
            });

            // Update global IA metrics
            this.iaMetricasGlobales = response.metricasGlobales;

            this.iaLastAnalysis = new Date(response.timestamp);
            this.toastr.success(
              "Análisis completado",
              "Inteligencia Artificial",
            );
          } else {
            this.iaAnalysisError =
              response.error || "Error desconocido en el análisis";
            this.toastr.error(this.iaAnalysisError, "Error IA");
          }
          this.analizandoIA = false;
        },
        error: (error) => {
          console.error("Error en análisis IA:", error);
          this.iaAnalysisError =
            error.error?.details ||
            error.error?.error ||
            "Error de conexión con servicio de IA";
          this.toastr.error(this.iaAnalysisError, "Error IA");
          this.analizandoIA = false;
        },
      });
  }

  /**
   * Helper para obtener nombre de bodega por ID
   */
  getNombreBodegaById(bodegaId: string): string {
    const bodega = this.bodegasConsolidadas.find((b) => b.id === bodegaId);
    return bodega?.nombre || bodegaId;
  }

  /**
   * Genera el tooltip con sugerencias de IA para una bodega
   */
  getIASugerenciasTooltip(bodega: BodegaConsolidada): string {
    if (!bodega.metricas?.ia?.sugerencias?.length) {
      return "Sin sugerencias";
    }
    return bodega.metricas.ia.sugerencias.join("\n");
  }

  /**
   * Expande/colapsa la fila de un producto para ver detalles de fulfillment
   */
  toggleExpansion(producto: ProductoConsolidado): void {
    producto.expanded = !producto.expanded;

    // Si se expande y tiene fulfillment habilitado, cargar stock de fulfillment
    if (
      producto.expanded &&
      this.fulfillmentEnabled &&
      producto.fulfillmentId &&
      !producto.fulfillmentStock
    ) {
      this.cargarFulfillmentExpansion(producto);
    }
  }

  /**
   * Carga el stock de fulfillment para un producto específico (lazy load)
   * Usa el fulfillmentId (UUID de Aliaddo) para consultar el stock
   */
  cargarFulfillmentExpansion(producto: ProductoConsolidado): void {
    if (!producto.fulfillmentId) return;

    producto.fulfillmentLoading = true;

    // Usar fulfillmentId (UUID de Aliaddo), no producto.id (ID de Katuq)
    this.fulfillmentService
      .getProductStock(this.fulfillmentProvider, producto.fulfillmentId)
      .subscribe({
        next: (response) => {
          if (response.success) {
            producto.fulfillmentStock = {};
            producto.fulfillmentWarehouses = response.warehouses || [];

            // Mapear warehouses a un objeto por ID/code
            if (response.warehouses && response.warehouses.length > 0) {
              response.warehouses.forEach((wh: any) => {
                const key = wh.code || wh.id;
                if (producto.fulfillmentStock) {
                  producto.fulfillmentStock[key] = wh.stock || wh.quantity || 0;
                }
              });
            }
          }
          producto.fulfillmentLoading = false;
        },
        error: (error) => {
          console.error("Error al cargar fulfillment:", error);
          producto.fulfillmentLoading = false;
        },
      });
  }

  /**
   * Obtiene el stock de fulfillment para una bodega específica
   */
  getFulfillmentStockForBodega(
    producto: ProductoConsolidado,
    bodega: BodegaConsolidada,
  ): number | null {
    if (!producto.fulfillmentStock || !bodega.fulfillmentId) return null;

    // Buscar por fulfillmentId de la bodega o por código
    const warehouseMatch = producto.fulfillmentWarehouses?.find(
      (wh: any) =>
        (bodega.fulfillmentId && wh.id === bodega.fulfillmentId) ||
        (wh.code && wh.code === bodega.id),
    );

    return warehouseMatch?.stock ?? warehouseMatch?.quantity ?? null;
  }

  /**
   * Calcula la diferencia entre stock Katuq y fulfillment para una bodega
   */
  getDiferenciaStock(
    producto: ProductoConsolidado,
    bodega: BodegaConsolidada,
  ): number | null {
    const stockKatuq = this.getStockBodega(producto, bodega.id);
    const stockFulfillment = this.getFulfillmentStockForBodega(
      producto,
      bodega,
    );

    if (stockFulfillment === null) return null;
    return stockFulfillment - stockKatuq;
  }

  // ============== MENÚ DE ACCIONES POR FILA ==============

  /**
   * Maneja el clic en el menú de acciones de una fila
   */
  onRowMenuClick(event: Event, menu: any, producto: ProductoConsolidado): void {
    this.selectedMenuProducto = producto;

    const items: MenuItem[] = [];

    // Opción de ver detalles (expandir fila)
    items.push({
      label: producto.expanded ? "Ocultar detalles" : "Ver detalles",
      icon: producto.expanded ? "pi pi-eye-slash" : "pi pi-eye",
      command: () => this.toggleExpansion(this.selectedMenuProducto!),
    });

    // Opción de sincronizar (siempre visible si fulfillment está habilitado)
    if (this.fulfillmentEnabled) {
      items.push({ separator: true });
      items.push({
        label: `Sincronizar con ${this.fulfillmentProviderName}`,
        icon: "pi pi-sync",
        disabled: !producto.fulfillmentId,
        tooltip: !producto.fulfillmentId
          ? "Este producto no tiene enlace a fulfillment"
          : "",
        command: () => {
          if (this.selectedMenuProducto?.fulfillmentId) {
            this.openSyncModal(this.selectedMenuProducto);
          }
        },
      });
    }

    // Ajuste de inventario (ingreso/retiro). Solo para productos inventariables:
    // los no-inventariables no llevan stock real, permitirles ajustes genera
    // unidades fantasma que después bloquean su eliminación de la bodega.
    const esInventariable = (producto as any).disponibilidad?.inventariable !== false;
    if (esInventariable) {
      items.push({ separator: true });
      items.push({
        label: 'Ingresar stock',
        icon: 'pi pi-plus-circle',
        command: () => this.abrirAjusteInventario(this.selectedMenuProducto!, 'INGRESO'),
      });
      items.push({
        label: 'Retirar stock',
        icon: 'pi pi-minus-circle',
        command: () => this.abrirAjusteInventario(this.selectedMenuProducto!, 'SALIDA'),
      });
    }

    // Quitar producto de bodegas sin stock
    const tieneBodegasSinStock = producto.stockPorBodega &&
      Object.values(producto.stockPorBodega).some(qty => qty === 0);
    if (tieneBodegasSinStock) {
      items.push({
        label: 'Quitar de bodegas sin stock',
        icon: 'pi pi-eraser',
        command: () => this.quitarProductoSinStock(this.selectedMenuProducto!),
      });
    }

    this.rowMenuItems = items;
    menu.toggle(event);
  }

  // ============== QUITAR PRODUCTO SIN STOCK ==============
  quitarProductoSinStock(producto: ProductoConsolidado): void {
    const bodegasSinStock = Object.entries(producto.stockPorBodega || {})
      .filter(([_, qty]) => qty === 0)
      .map(([bodegaId]) => this.getNombreBodega(bodegaId) || bodegaId);

    if (bodegasSinStock.length === 0) {
      this.toastr.info('Este producto no tiene bodegas con stock 0', 'Sin cambios');
      return;
    }

    Swal.fire({
      title: 'Quitar producto sin stock',
      html: `<p>Se eliminará <strong>"${producto.nombre}"</strong> de las siguientes bodegas donde tiene 0 unidades:</p>
             <ul style="text-align:left;">${bodegasSinStock.map(b => `<li>${b}</li>`).join('')}</ul>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6C4CE0',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Quitar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.inventarioService.quitarProductoSinStock(producto.id).subscribe({
          next: (res: any) => {
            this.toastr.success(`Eliminado de ${res.deleted || 0} bodegas`, 'Producto limpiado');
            this.recargarInventarioConsolidado();
          },
          error: () => {
            this.toastr.error('Error al quitar producto', 'Error');
          }
        });
      }
    });
  }

  // ============== AJUSTE RÁPIDO DE INVENTARIO ==============
  ajusteVisible = false;
  ajusteTipo: 'INGRESO' | 'SALIDA' = 'INGRESO';
  ajusteProducto: ProductoConsolidado | null = null;
  ajusteCantidad: number = 1;
  ajusteBodegaId: string = '';
  ajusteObservaciones: string = '';
  ajusteGuardando = false;

  abrirAjusteInventario(producto: ProductoConsolidado, tipo: 'INGRESO' | 'SALIDA'): void {
    this.ajusteProducto = producto;
    this.ajusteTipo = tipo;
    this.ajusteCantidad = 1;
    this.ajusteBodegaId = this.bodegas.length === 1 ? this.bodegas[0].idBodega : '';
    this.ajusteObservaciones = '';
    this.ajusteVisible = true;
  }

  guardarAjuste(): void {
    if (!this.ajusteProducto || !this.ajusteBodegaId || this.ajusteCantidad < 1) return;
    this.ajusteGuardando = true;

    const tipoMovimiento = this.ajusteTipo === 'INGRESO'
      ? 'Ingreso por Ajuste de inventario'
      : 'Salida por ajuste de inventario';

    const payload = {
      bodegaId: this.ajusteBodegaId,
      productos: [{
        productoId: this.ajusteProducto.id,
        cantidad: this.ajusteCantidad,
      }],
      tipoMovimiento,
      observaciones: this.ajusteObservaciones || `${this.ajusteTipo === 'INGRESO' ? 'Ingreso' : 'Retiro'} rápido desde catálogo`,
    };

    this.inventarioService.ingresarProductos(
      payload.bodegaId, payload.productos, payload.tipoMovimiento as any, payload.observaciones
    ).subscribe({
      next: () => {
        this.toastr.success(
          `${this.ajusteCantidad} unidades ${this.ajusteTipo === 'INGRESO' ? 'ingresadas a' : 'retiradas de'} ${this.getNombreBodega(this.ajusteBodegaId)}`,
          this.ajusteTipo === 'INGRESO' ? 'Stock Ingresado' : 'Stock Retirado'
        );
        this.ajusteVisible = false;
        this.ajusteGuardando = false;
        this.recargarInventarioConsolidado();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.error || 'Error al ajustar inventario', 'Error');
        this.ajusteGuardando = false;
      }
    });
  }


  // ============== MÉTODOS DEL MODAL DE SINCRONIZACIÓN - SIMPLIFICADO ==============

  /**
   * Abre el modal de sincronización para un producto
   * Consulta el stock de Aliaddo usando el fulfillmentId (UUID de Aliaddo)
   */
  openSyncModal(producto: ProductoConsolidado): void {
    if (!producto.fulfillmentId) {
      this.toastr.warning("Este producto no tiene enlace a fulfillment");
      return;
    }

    this.productoSyncSeleccionado = producto;
    this.loadingSyncModal = true;
    this.errorSyncModal = null;
    this.bodegasDesglose = [];
    this.syncModalVisible = true;

    // Stock de Katuq (suma de todas las bodegas)
    this.stockKatuqTotal = producto.stockTotal || 0;

    // Consultar stock de Aliaddo usando el fulfillmentId correcto (UUID de Aliaddo)
    this.fulfillmentService
      .getProductStock(this.fulfillmentProvider, producto.fulfillmentId)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stockAliaddoTotal = response.totalStock || 0;
            this.diferenciaSyncTotal =
              this.stockAliaddoTotal - this.stockKatuqTotal;

            // Calcular desglose por bodega
            if (response.warehouses && response.warehouses.length > 0) {
              response.warehouses.forEach((wh: any) => {
                // Buscar bodega de Katuq correspondiente
                const bodegaKatuq = this.bodegasConsolidadas.find(
                  (b) => b.fulfillmentId === wh.id || b.id === wh.code,
                );

                const stockKatuq = bodegaKatuq
                  ? this.getStockBodega(producto, bodegaKatuq.id)
                  : 0;
                const stockAliaddo = wh.quantity || wh.stock || 0;

                this.bodegasDesglose.push({
                  idBodega: bodegaKatuq?.id || wh.code || "",
                  nombre: bodegaKatuq?.nombre || wh.name || "Sin mapear",
                  stockKatuq,
                  stockAliaddo,
                  diferencia: stockAliaddo - stockKatuq,
                });
              });
            }
          } else {
            this.errorSyncModal =
              response.error || "Error al consultar Aliaddo";
          }
          this.loadingSyncModal = false;
        },
        error: (error) => {
          console.error("Error al consultar stock de Aliaddo:", error);
          this.errorSyncModal = "Error de conexión con Aliaddo";
          this.loadingSyncModal = false;
        },
      });
  }

  /**
   * Cierra el modal de sincronización
   */
  closeSyncModal(): void {
    this.syncModalVisible = false;
    this.productoSyncSeleccionado = null;
    this.stockKatuqTotal = 0;
    this.stockAliaddoTotal = 0;
    this.diferenciaSyncTotal = 0;
    this.errorSyncModal = null;
    this.bodegasDesglose = [];
  }

  /**
   * Ejecuta la sincronización del producto con Aliaddo
   * 🔧 FIX: Sincroniza TODAS las bodegas que tienen diferencias, no solo una
   */
  ejecutarSincronizacion(): void {
    // Permitir sincronización si hay diferencias por bodega O diferencia total
    if (
      !this.productoSyncSeleccionado ||
      (!this.hayDiferenciasPorBodega && this.diferenciaSyncTotal === 0)
    ) {
      return;
    }

    this.loadingSyncModal = true;

    // Filtrar bodegas que tienen diferencias
    const bodegasConDiferencia = this.bodegasDesglose.filter(
      (b) => b.diferencia !== 0 && b.idBodega,
    );

    if (bodegasConDiferencia.length === 0) {
      this.toastr.warning("No hay bodegas con diferencias para sincronizar");
      this.loadingSyncModal = false;
      return;
    }

    // Sincronizar cada bodega con diferencia en secuencia
    let completadas = 0;
    let errores = 0;

    const sincronizarSiguiente = (index: number) => {
      if (index >= bodegasConDiferencia.length) {
        // Todas las bodegas procesadas
        this.loadingSyncModal = false;
        if (errores === 0) {
          this.toastr.success(
            `${completadas} bodega(s) sincronizada(s) correctamente`,
          );
          this.closeSyncModal();
          this.recargarInventarioConsolidado();
        } else {
          this.toastr.warning(
            `${completadas} sincronizadas, ${errores} con errores`,
          );
        }
        return;
      }

      const bodega = bodegasConDiferencia[index];
      this.fulfillmentService
        .syncProductInventory(
          this.productoSyncSeleccionado!.referencia,
          bodega.idBodega,
          this.fulfillmentProvider,
          {
            fulfillmentProductId: this.productoSyncSeleccionado!.fulfillmentId!,
          },
        )
        .subscribe({
          next: (result) => {
            if (result.success) {
              completadas++;
            } else {
              errores++;
              console.error(
                `Error sincronizando bodega ${bodega.nombre}:`,
                result.error,
              );
            }
            sincronizarSiguiente(index + 1);
          },
          error: (error) => {
            errores++;
            console.error(
              `Error sincronizando bodega ${bodega.nombre}:`,
              error,
            );
            sincronizarSiguiente(index + 1);
          },
        });
    };

    sincronizarSiguiente(0);
  }

  /**
   * Calcula el total de stock de fulfillment para un producto
   */
  calcularTotalFulfillment(producto: ProductoConsolidado): number {
    if (!producto.fulfillmentStock) return 0;
    return Object.values(producto.fulfillmentStock).reduce(
      (sum, qty) => sum + qty,
      0,
    );
  }

  /**
   * Calcula el total de unidades sumando las métricas de las bodegas
   * Respeta el filtro de fulfillment si está activo
   */
  /**
   * Calcula el total de unidades de una bodega específica basado en productos filtrados
   */
  calcularTotalBodegaFiltrado(bodegaId: string): number {
    return this.productosConsolidadosFiltrados.reduce((total, producto) => {
      return total + (producto.stockPorBodega?.[bodegaId] ?? 0);
    }, 0);
  }

  /**
   * Calcula el total general basado en productos filtrados y bodegas filtradas
   */
  calcularTotalUnidadesBodegas(): number {
    // Determinar qué bodegas incluir según filtro
    let bodegas = this.bodegasConsolidadas;

    if (this.filtrosConsolidados.fulfillment === "con") {
      bodegas = bodegas.filter((b) => !!b.fulfillmentId);
    } else if (this.filtrosConsolidados.fulfillment === "sin") {
      bodegas = bodegas.filter((b) => !b.fulfillmentId);
    }

    // Si hay filtro de bodega específica
    if (this.filtrosConsolidados.bodegaId) {
      bodegas = bodegas.filter(
        (b) => b.id === this.filtrosConsolidados.bodegaId,
      );
    }

    const bodegaIds = new Set(bodegas.map((b) => b.id));

    // Sumar stocks de los productos FILTRADOS solo de las bodegas FILTRADAS
    return this.productosConsolidadosFiltrados.reduce((total, producto) => {
      const stockEnBodegasFiltradas = Object.entries(
        producto.stockPorBodega || {},
      )
        .filter(([bodegaId]) => bodegaIds.has(bodegaId))
        .reduce((sum, [, stock]) => sum + ((stock as number) || 0), 0);
      return total + stockEnBodegasFiltradas;
    }, 0);
  }

  // ============== FIN MÉTODOS VISTA CONSOLIDADA ==============

  /**
   * @deprecated Usar cargarInventarioConsolidado() para la nueva vista
   */
  obtenerProductosPorBodega(bodegaId: string) {
    // Si no hay bodega seleccionada, no hacer nada
    if (!bodegaId) {
      this.rows = [];
      this.rowsFiltradas = [];
      this.productosSinFiltro = [];
      this.stockFulfillmentCargado = false; // Reset al cambiar de bodega
      return;
    }

    this.cargando = true;
    this.stockFulfillmentCargado = false; // Reset al cambiar de bodega
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe({
      next: (r: any) => {
        if (Array.isArray(r.productos) && r.productos.length > 0) {
          this.rows = r.productos.map((itemInventario) => ({
            id: itemInventario.productoId,
            ...itemInventario.producto,
            cantidad: itemInventario.cantidad,
            bodegaId: itemInventario.bodegaId,
            bodegaNombre: itemInventario.bodega.nombre,
          }));
          this.productosSinFiltro = [...this.rows];
          this.rowsFiltradas = [...this.rows]; // Inicializar la lista filtrada
          this.totalItems = this.rows.length;
        } else {
          this.rows = [];
          this.rowsFiltradas = [];
          this.productosSinFiltro = [];
          this.totalItems = 0;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error("Error al obtener productos por bodega:", error);
        this.cargando = false;
        this.rows = [];
        this.rowsFiltradas = [];
        this.productosSinFiltro = [];
        this.totalItems = 0;
      },
    });
  }

  onPageChange(event: any) {
    this.pageSize = event.rows;
    this.currentPage = Math.floor(event.first / event.rows) + 1;
  }

  // Métodos de filtrado local

  updateFilter(event: any) {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    // Solo ejecutar si es Enter y al menos 3 chars
    if (event.key !== "Enter" || input.length < 3) return;

    // Si tenemos una bodega seleccionada, buscamos solo en esa bodega
    if (this.bodegaSeleccionada?.idBodega) {
      this.cargando = true;
      // Filtrar los datos que ya tenemos
      const filteredRows = this.productosSinFiltro.filter(
        (producto) =>
          producto.crearProducto?.titulo?.toLowerCase().includes(input) ||
          producto.identificacion?.referencia?.toLowerCase().includes(input),
      );
      this.rows = filteredRows;
      this.totalItems = filteredRows.length;
      this.cargando = false;
    }
  }

  // Métodos de ordenamiento local

  sortByQuantity() {
    this.ordenamiento =
      this.ordenamiento === "cantidadDesc" ? "cantidadAsc" : "cantidadDesc";
    this.aplicarOrdenamiento();
  }

  sortByName(order: "asc" | "desc" = "asc") {
    // Ordenar productos por nombre
    this.rows = [...this.rows].sort((a, b) => {
      const nombreA = a.crearProducto?.titulo?.toLowerCase() || "";
      const nombreB = b.crearProducto?.titulo?.toLowerCase() || "";
      return order === "asc"
        ? nombreA.localeCompare(nombreB)
        : nombreB.localeCompare(nombreA);
    });
  }

  sortByPrice(order: "asc" | "desc" = "asc") {
    // Ordenar productos por precio
    this.rows = [...this.rows].sort((a, b) => {
      const precioA = a.precio?.precioUnitarioConIva || 0;
      const precioB = b.precio?.precioUnitarioConIva || 0;
      return order === "asc" ? precioA - precioB : precioB - precioA;
    });
  }

  sortByReference(order: "asc" | "desc" = "asc") {
    // Ordenar productos por referencia
    this.rows = [...this.rows].sort((a, b) => {
      const refA = a.identificacion?.referencia?.toLowerCase() || "";
      const refB = b.identificacion?.referencia?.toLowerCase() || "";
      return order === "asc"
        ? refA.localeCompare(refB)
        : refB.localeCompare(refA);
    });
  }

  // Filtrar productos agotados
  filterOutOfStock() {
    this.filtrarAgotados();
  }

  // Método para restablecer todos los filtros
  resetFilters() {
    this.limpiarFiltros();
  }

  exportToExcel() {
    if (this.rowsFiltradas.length === 0) {
      Swal.fire({
        title: "Sin datos",
        text: "No hay datos para exportar",
        icon: "warning",
      });
      return;
    }

    // Crear una versión simplificada para Excel
    const excelData = this.rowsFiltradas.map((row) => {
      return {
        Referencia: row.identificacion?.referencia || "",
        Nombre: row.crearProducto?.titulo || "",
        Cantidad: row.cantidad || 0,
        "Precio Unitario": row.precio?.precioUnitarioConIva || 0,
        "Valor Total": this.calcularValorTotal(row),
        Bodega: row.bodegaNombre || this.getNombreBodega(row.bodegaId || ""),
        "Tipo Bodega": this.getTipoBodega(row.bodegaId || ""),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, "Inventario_Detallado.xlsx");
  }

  /**
   * Exporta la vista consolidada a Excel con columnas dinámicas por bodega
   */
  exportarExcelConsolidado() {
    if (this.productosConsolidadosFiltrados.length === 0) {
      this.toastr.warning("No hay datos para exportar", "Advertencia");
      return;
    }

    // Determinar las bodegas a incluir (respetando filtros)
    let bodegasExportar = this.bodegasConsolidadas;
    if (this.filtrosConsolidados.fulfillment === "con") {
      bodegasExportar = bodegasExportar.filter((b) => !!b.fulfillmentId);
    } else if (this.filtrosConsolidados.fulfillment === "sin") {
      bodegasExportar = bodegasExportar.filter((b) => !b.fulfillmentId);
    }
    if (this.filtrosConsolidados.bodegaId) {
      bodegasExportar = bodegasExportar.filter(
        (b) => b.id === this.filtrosConsolidados.bodegaId,
      );
    }

    // Crear datos para Excel con columnas dinámicas
    const excelData = this.productosConsolidadosFiltrados.map((producto) => {
      const row: any = {
        Referencia: producto.referencia || "",
        Nombre: producto.nombre || "",
      };

      // Agregar columna por cada bodega
      bodegasExportar.forEach((bodega) => {
        const stock = producto.stockPorBodega?.[bodega.id] ?? 0;
        row[bodega.nombre] = stock;
      });

      // Calcular total basado en bodegas filtradas
      const totalFiltrado = bodegasExportar.reduce((total, bodega) => {
        return total + (producto.stockPorBodega?.[bodega.id] ?? 0);
      }, 0);

      row["TOTAL"] = totalFiltrado;
      row["Precio"] = producto.precio || 0;
      row["Valor Total"] = totalFiltrado * (producto.precio || 0);

      return row;
    });

    // Crear hoja de Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 15 }, // Referencia
      { wch: 40 }, // Nombre
      ...bodegasExportar.map(() => ({ wch: 12 })), // Bodegas
      { wch: 10 }, // TOTAL
      { wch: 12 }, // Precio
      { wch: 15 }, // Valor Total
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario Consolidado");

    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Inventario_Consolidado_${fecha}.xlsx`);

    this.toastr.success(
      `${excelData.length} productos exportados`,
      "Excel generado",
    );
  }

  // Métodos auxiliares para la plantilla

  /**
   * Obtiene el nombre de una bodega por el ID
   */
  getNombreBodega(bodegaId: string): string {
    const bodega = this.bodegas.find((b) => b.idBodega === bodegaId);
    return bodega?.nombre || "Sin bodega asignada";
  }

  /**
   * Obtiene el tipo de una bodega por el ID
   */
  getTipoBodega(bodegaId: string): string {
    const bodega = this.bodegas.find((b) => b.idBodega === bodegaId);
    return bodega?.tipo || "";
  }

  /**
   * Determina si una bodega es de tipo físico
   */
  isBodegaFisica(bodegaId: string): boolean {
    return this.getTipoBodega(bodegaId) === "Física";
  }

  /**
   * Determina si una bodega es de tipo transaccional
   */
  isBodegaTransaccional(bodegaId: string): boolean {
    return this.getTipoBodega(bodegaId) === "Transaccional";
  }

  /**
   * Devuelve las clases CSS para el movimiento de inventario
   */
  getClaseMovimiento(tipoMovimiento: string): any {
    return {
      "bg-success": tipoMovimiento === "in",
      "bg-danger": tipoMovimiento === "out",
    };
  }

  /**
   * Devuelve las clases del icono para el movimiento de inventario
   */
  getClaseIconoMovimiento(tipoMovimiento: string): any {
    return {
      "bi-arrow-up-circle": tipoMovimiento === "in",
      "bi-arrow-down-circle": tipoMovimiento === "out",
    };
  }

  /**
   * Devuelve las clases CSS para la etiqueta de tipo de bodega
   */
  getClasesTipoBodega(bodegaId: string): any {
    const tipo = this.getTipoBodega(bodegaId);
    return {
      "bg-primary": tipo === "Física",
      "bg-info": tipo === "Transaccional",
    };
  }

  // Al obtener los productos, inicializar la lista filtrada
  onProductsLoaded(products: any[]) {
    this.rows = products;
    this.rowsFiltradas = [...products]; // Inicialmente todas las filas están visibles
    this.totalItems = products.length;
    this.cargando = false;
  }

  // Método para aplicar el filtro global (búsqueda por texto)
  aplicarFiltroGlobal() {
    this.aplicarFiltros();
  }

  // Método central para aplicar todos los filtros
  aplicarFiltros() {
    let resultados = [...this.rows];

    // Aplicar filtro de texto global
    if (this.filtroGlobal && this.filtroGlobal.trim() !== "") {
      const filtro = this.filtroGlobal.trim().toLowerCase();
      resultados = resultados.filter(
        (producto) =>
          producto.crearProducto?.titulo?.toLowerCase().includes(filtro) ||
          producto.identificacion?.referencia?.toLowerCase().includes(filtro),
      );
    }

    // Aplicar filtro de referencia
    if (this.filtros.referencia && this.filtros.referencia.trim() !== "") {
      const filtro = this.filtros.referencia.trim().toLowerCase();
      resultados = resultados.filter((producto) =>
        producto.identificacion?.referencia?.toLowerCase().includes(filtro),
      );
    }

    // Aplicar filtro de nombre
    if (this.filtros.nombre && this.filtros.nombre.trim() !== "") {
      const filtro = this.filtros.nombre.trim().toLowerCase();
      resultados = resultados.filter((producto) =>
        producto.crearProducto?.titulo?.toLowerCase().includes(filtro),
      );
    }

    // Aplicar filtro por cantidad
    if (this.filtros.cantidadTipo) {
      switch (this.filtros.cantidadTipo) {
        case "agotados":
          resultados = resultados.filter(
            (producto) => (producto.cantidad || 0) === 0,
          );
          break;
        case "bajos":
          resultados = resultados.filter(
            (producto) =>
              (producto.cantidad || 0) > 0 && (producto.cantidad || 0) <= 5,
          );
          break;
        case "disponibles":
          resultados = resultados.filter(
            (producto) => (producto.cantidad || 0) > 5,
          );
          break;
      }
    }

    // Aplicar filtros de precio unitario
    if (
      this.filtros.precioMin !== null &&
      this.filtros.precioMin !== undefined &&
      !isNaN(Number(this.filtros.precioMin))
    ) {
      const precioMin = Number(this.filtros.precioMin);
      resultados = resultados.filter(
        (producto) => (producto.precio?.precioUnitarioConIva || 0) >= precioMin,
      );
    }

    if (
      this.filtros.precioMax !== null &&
      this.filtros.precioMax !== undefined &&
      !isNaN(Number(this.filtros.precioMax))
    ) {
      const precioMax = Number(this.filtros.precioMax);
      resultados = resultados.filter(
        (producto) => (producto.precio?.precioUnitarioConIva || 0) <= precioMax,
      );
    }

    // Aplicar filtros de valor total
    if (
      this.filtros.valorTotalMin !== null &&
      this.filtros.valorTotalMin !== undefined &&
      !isNaN(Number(this.filtros.valorTotalMin))
    ) {
      const valorMin = Number(this.filtros.valorTotalMin);
      resultados = resultados.filter(
        (producto) => this.calcularValorTotal(producto) >= valorMin,
      );
    }

    if (
      this.filtros.valorTotalMax !== null &&
      this.filtros.valorTotalMax !== undefined &&
      !isNaN(Number(this.filtros.valorTotalMax))
    ) {
      const valorMax = Number(this.filtros.valorTotalMax);
      resultados = resultados.filter(
        (producto) => this.calcularValorTotal(producto) <= valorMax,
      );
    }

    // Aplicar ordenamiento actual
    this.ordenarResultados(resultados);

    // Actualizar la lista filtrada
    this.rowsFiltradas = resultados;
  }

  // Método para aplicar ordenamiento
  aplicarOrdenamiento() {
    this.ordenarResultados(this.rowsFiltradas);
  }

  // Método para ordenar resultados según el criterio seleccionado
  ordenarResultados(resultados: any[]) {
    switch (this.ordenamiento) {
      case "nombreAsc":
        resultados.sort((a, b) =>
          (a.crearProducto?.titulo || "").localeCompare(
            b.crearProducto?.titulo || "",
          ),
        );
        break;
      case "nombreDesc":
        resultados.sort((a, b) =>
          (b.crearProducto?.titulo || "").localeCompare(
            a.crearProducto?.titulo || "",
          ),
        );
        break;
      case "cantidadAsc":
        resultados.sort((a, b) => (a.cantidad || 0) - (b.cantidad || 0));
        break;
      case "cantidadDesc":
        resultados.sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0));
        break;
      case "precioAsc":
        resultados.sort(
          (a, b) =>
            (a.precio?.precioUnitarioConIva || 0) -
            (b.precio?.precioUnitarioConIva || 0),
        );
        break;
      case "precioDesc":
        resultados.sort(
          (a, b) =>
            (b.precio?.precioUnitarioConIva || 0) -
            (a.precio?.precioUnitarioConIva || 0),
        );
        break;
      case "valorTotalAsc":
        resultados.sort(
          (a, b) => this.calcularValorTotal(a) - this.calcularValorTotal(b),
        );
        break;
      case "valorTotalDesc":
        resultados.sort(
          (a, b) => this.calcularValorTotal(b) - this.calcularValorTotal(a),
        );
        break;
    }
  }

  // Método para filtrar solo productos agotados
  filtrarAgotados() {
    this.filtros.cantidadTipo = "agotados";
    this.aplicarFiltros();
  }

  // Método para limpiar todos los filtros
  limpiarFiltros() {
    this.filtroGlobal = "";
    this.filtros = {
      referencia: "",
      nombre: "",
      cantidadTipo: "",
      precioMin: null,
      precioMax: null,
      valorTotalMin: null,
      valorTotalMax: null,
    };
    this.ordenamiento = "nombreAsc";
    this.rowsFiltradas = [...this.rows];
    this.aplicarOrdenamiento();
  }

  /**
   * Calcula el valor total (cantidad * precio) de un producto
   */
  calcularValorTotal(producto: ProductoInventario): number {
    const cantidad = producto.cantidad || 0;
    const precioUnitario = producto.precio?.precioUnitarioConIva || 0;
    //validar si el producto es inventariable
    if (producto.disponibilidad?.inventariable) {
      return cantidad * precioUnitario;
    } else {
      return 0;
    }
  }

  /**
   * Calcula el total de unidades en el inventario filtrado
   */
  calcularTotalItems(): number {
    return this.rowsFiltradas.reduce(
      (total, producto) => total + (producto.cantidad || 0),
      0,
    );
  }

  /**
   * Calcula el valor total de todo el inventario filtrado
   */
  calcularValorTotalInventario(): number {
    return this.rowsFiltradas.reduce((total, producto) => {
      if (producto.disponibilidad?.inventariable) {
        return total + this.calcularValorTotal(producto);
      } else {
        return total;
      }
    }, 0);
  }

  startInventarioTour(): void {
    this.tourService.startTour(
      "inventario",
      this.tourService.getInventarioTour(),
    );
  }

  // ============== MÉTODOS DE FULFILLMENT ==============

  /**
   * Obtiene los IDs de los productos actuales
   */
  getProductIds(): string[] {
    return this.rowsFiltradas.map((p) => p.id).filter((id) => id);
  }

  /**
   * Carga el stock de fulfillment para todos los productos visibles
   */
  loadFulfillmentStock(): void {
    if (!this.fulfillmentEnabled || !this.fulfillmentProvider) {
      return;
    }

    const productIds = this.getProductIds();
    if (productIds.length === 0) {
      return;
    }

    this.loadingFulfillmentStock = true;

    // Marcar todos los productos como cargando
    this.rowsFiltradas.forEach((p) => {
      p.fulfillmentLoading = true;
      p.fulfillmentError = undefined;
    });

    this.fulfillmentService
      .getBulkStock(this.fulfillmentProvider, productIds)
      .subscribe({
        next: (response) => {
          if (response.success && response.stocks) {
            // Mapear resultados a los productos
            this.rowsFiltradas.forEach((producto) => {
              const stockInfo = response.stocks[producto.id];
              if (stockInfo) {
                // IMPORTANTE: Buscar stock de la bodega específica, no el total
                const stockBodega = this.getStockForSelectedBodega(stockInfo);
                producto.stockFulfillment = stockBodega;
                producto.fulfillmentError = stockInfo.error;
                producto.fulfillmentWarehouses = stockInfo.warehouses; // Guardar desglose
                producto.diferencia =
                  stockBodega !== null
                    ? stockBodega - (producto.cantidad || 0)
                    : null;
              } else {
                producto.stockFulfillment = null;
                producto.diferencia = null;
              }
              producto.fulfillmentLoading = false;
            });

            // También actualizar en productosSinFiltro
            this.productosSinFiltro.forEach((producto) => {
              const stockInfo = response.stocks[producto.id];
              if (stockInfo) {
                // IMPORTANTE: Buscar stock de la bodega específica, no el total
                const stockBodega = this.getStockForSelectedBodega(stockInfo);
                producto.stockFulfillment = stockBodega;
                producto.fulfillmentError = stockInfo.error;
                producto.fulfillmentWarehouses = stockInfo.warehouses; // Guardar desglose
                producto.diferencia =
                  stockBodega !== null
                    ? stockBodega - (producto.cantidad || 0)
                    : null;
              }
              producto.fulfillmentLoading = false;
            });
          }
          this.loadingFulfillmentStock = false;
          this.stockFulfillmentCargado = true; // Marcar que el stock fue cargado
        },
        error: (error) => {
          console.error("Error cargando stock de fulfillment:", error);
          this.rowsFiltradas.forEach((p) => {
            p.fulfillmentLoading = false;
            p.fulfillmentError = "Error al cargar";
          });
          this.loadingFulfillmentStock = false;
          this.toastr.error("Error al cargar stock de fulfillment", "Error");
        },
      });
  }

  /**
   * Obtiene el stock de fulfillment de un producto específico
   */
  getFulfillmentStock(productId: string): number | null {
    const producto = this.rowsFiltradas.find((p) => p.id === productId);
    return producto?.stockFulfillment ?? null;
  }

  /**
   * Obtiene la diferencia de stock (fulfillment - katuq)
   */
  getDiferencia(producto: ProductoInventario): number | null {
    if (
      producto.stockFulfillment === null ||
      producto.stockFulfillment === undefined
    ) {
      return null;
    }
    return producto.stockFulfillment - (producto.cantidad || 0);
  }

  /**
   * Obtiene el stock de la bodega seleccionada desde la respuesta de fulfillment.
   * Busca en warehouses por fulfillmentId o código de bodega.
   * Si no encuentra la bodega específica, retorna el stock total como fallback.
   *
   * @param stockInfo Respuesta del API con stock y warehouses
   * @returns Stock de la bodega específica o total si no encuentra
   */
  private getStockForSelectedBodega(stockInfo: any): number | null {
    if (
      !stockInfo ||
      stockInfo.stock === null ||
      stockInfo.stock === undefined
    ) {
      return null;
    }

    // Si no hay bodega seleccionada o no tiene warehouses, usar total
    if (
      !this.bodegaSeleccionada ||
      !stockInfo.warehouses ||
      stockInfo.warehouses.length === 0
    ) {
      return stockInfo.stock;
    }

    // Buscar la bodega específica en warehouses
    const warehouseMatch = stockInfo.warehouses.find(
      (wh: any) =>
        // Buscar por fulfillmentId (UUID de Aliaddo)
        (this.bodegaSeleccionada.fulfillmentId &&
          wh.id === this.bodegaSeleccionada.fulfillmentId) ||
        // O por código de bodega
        (wh.code && wh.code === this.bodegaSeleccionada.idBodega),
    );

    if (warehouseMatch) {
      // Encontró la bodega específica, usar su stock
      return warehouseMatch.stock ?? warehouseMatch.quantity ?? 0;
    }

    // Si no encuentra la bodega, usar el stock total como fallback
    // Esto puede pasar si la bodega no está configurada correctamente
    console.warn(
      `[Fulfillment] No se encontró bodega ${this.bodegaSeleccionada.idBodega} en warehouses, usando stock total`,
    );
    return stockInfo.stock;
  }

  /**
   * Sincroniza el inventario de un producto con el fulfillment
   * Crea movimiento de ajuste si hay diferencia
   */
  syncProduct(producto: ProductoInventario): void {
    if (
      !this.fulfillmentEnabled ||
      !this.fulfillmentProvider ||
      !this.bodegaSeleccionada
    ) {
      this.toastr.warning(
        "Seleccione una bodega y verifique la configuración de fulfillment",
        "Advertencia",
      );
      return;
    }

    this.syncingProduct = producto.id;

    // Obtener la referencia del producto (el backend busca por identificacion.referencia)
    const referenciaProducto =
      producto.identificacion?.referencia || producto.id;

    this.fulfillmentService
      .syncProductInventory(
        referenciaProducto,
        this.bodegaSeleccionada.idBodega,
        this.fulfillmentProvider,
      )
      .subscribe({
        next: (result) => {
          this.syncingProduct = null;

          if (result.success) {
            // Actualizar el producto con los nuevos valores
            producto.cantidad = result.stockFulfillment;
            producto.stockFulfillment = result.stockFulfillment;
            producto.diferencia = 0;

            if (result.diferencia !== 0) {
              this.toastr.success(
                `Sincronizado. Diferencia de ${result.diferencia} unidades ajustada.`,
                "Sincronización completada",
              );
            } else {
              this.toastr.info(
                "Sin diferencias encontradas",
                "Sincronización completada",
              );
            }
          } else {
            this.toastr.error(result.error || "Error al sincronizar", "Error");
          }
        },
        error: (error) => {
          this.syncingProduct = null;
          console.error("Error sincronizando producto:", error);
          this.toastr.error("Error al sincronizar con fulfillment", "Error");
        },
      });
  }

  /**
   * Sincroniza todos los productos de la bodega con el fulfillment
   */
  syncBodegaCompleta(): void {
    if (
      !this.fulfillmentEnabled ||
      !this.fulfillmentProvider ||
      !this.bodegaSeleccionada
    ) {
      this.toastr.warning(
        "Seleccione una bodega y verifique la configuración de fulfillment",
        "Advertencia",
      );
      return;
    }

    // Confirmar antes de sincronizar
    Swal.fire({
      title: "Sincronizar Bodega Completa",
      text: `¿Desea sincronizar todos los productos de la bodega "${this.bodegaSeleccionada.nombre}" con ${this.fulfillmentProviderName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, sincronizar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarSyncBodega();
      }
    });
  }

  /**
   * Ejecuta la sincronización de la bodega completa
   */
  private ejecutarSyncBodega(): void {
    this.syncingBodega = true;

    this.fulfillmentService
      .syncBodegaCompleta(
        this.bodegaSeleccionada.idBodega,
        this.fulfillmentProvider,
      )
      .subscribe({
        next: (result) => {
          this.syncingBodega = false;

          if (result.success) {
            // Recargar inventario después de sincronizar
            this.obtenerProductosPorBodega(this.bodegaSeleccionada.idBodega);

            Swal.fire({
              title: "Sincronización Completada",
              html: `
              <p><strong>${result.sincronizados}</strong> productos procesados</p>
              <p><strong>${result.conDiferencias}</strong> con diferencias ajustadas</p>
              ${result.errores > 0 ? `<p class="text-danger"><strong>${result.errores}</strong> errores</p>` : ""}
              <p class="text-muted">Duración: ${(result.duracionMs / 1000).toFixed(1)}s</p>
            `,
              icon: result.errores > 0 ? "warning" : "success",
            });
          } else {
            Swal.fire({
              title: "Error",
              text: result.error || "Error al sincronizar la bodega",
              icon: "error",
            });
          }
        },
        error: (error) => {
          this.syncingBodega = false;
          console.error("Error sincronizando bodega:", error);
          Swal.fire({
            title: "Error",
            text: "Error al sincronizar la bodega con fulfillment",
            icon: "error",
          });
        },
      });
  }

  /**
   * Verifica si un producto está siendo sincronizado
   */
  isSyncingProduct(productId: string): boolean {
    return this.syncingProduct === productId;
  }

  /**
   * Obtiene la clase CSS para mostrar la diferencia de stock
   */
  getDiferenciaClass(producto: ProductoInventario): string {
    const diferencia = this.getDiferencia(producto);
    if (diferencia === null) return "";
    if (diferencia > 0) return "text-success"; // Hay más en fulfillment
    if (diferencia < 0) return "text-danger"; // Hay menos en fulfillment
    return "text-muted"; // Sin diferencia
  }

  /**
   * Obtiene el badge para mostrar la diferencia
   */
  getDiferenciaBadgeClass(producto: ProductoInventario): string {
    const diferencia = this.getDiferencia(producto);
    if (diferencia === null) return "";
    if (diferencia > 0) return "badge bg-warning text-dark"; // Más en fulfillment
    if (diferencia < 0) return "badge bg-danger"; // Menos en fulfillment
    return "badge bg-success"; // Sin diferencia
  }

  /**
   * Verifica si hay productos con diferencias de stock
   */
  tieneProductosConDiferencia(): boolean {
    return this.rowsFiltradas.some(
      (p) =>
        p.diferencia !== null &&
        p.diferencia !== undefined &&
        p.diferencia !== 0,
    );
  }

  /**
   * Cuenta los productos con diferencias de stock
   */
  contarProductosConDiferencia(): number {
    return this.rowsFiltradas.filter(
      (p) =>
        p.diferencia !== null &&
        p.diferencia !== undefined &&
        p.diferencia !== 0,
    ).length;
  }

  /**
   * Calcula la suma total de diferencias
   */
  calcularDiferenciaTotalInventario(): number {
    return this.rowsFiltradas.reduce((total, p) => {
      if (p.diferencia !== null && p.diferencia !== undefined) {
        return total + p.diferencia;
      }
      return total;
    }, 0);
  }

  // ============== SYNC MASIVO VISTA CONSOLIDADA ==============

  /**
   * Obtiene los productos con fulfillment habilitado para sincronizar
   */
  getProductosConFulfillment(): ProductoConsolidado[] {
    return this.productosConsolidadosFiltrados.filter((p) => p.fulfillmentId);
  }

  /**
   * Obtiene las bodegas con fulfillment habilitado
   */
  getBodegasConFulfillment(): BodegaConsolidada[] {
    return this.bodegasConsolidadas.filter((b) => b.fulfillmentId);
  }

  /**
   * Abre el modal de sincronización para una bodega específica
   */
  syncBodegaDesdeConsolidada(): void {
    if (!this.bodegaSyncSeleccionada || !this.fulfillmentProvider) {
      this.toastr.warning(
        "Selecciona una bodega para sincronizar",
        "Advertencia",
      );
      return;
    }

    this.abrirModalSyncBodega();
  }

  /**
   * Abre el modal y carga los datos de stock para la bodega seleccionada
   */
  private async abrirModalSyncBodega(): Promise<void> {
    const bodega = this.bodegaSyncSeleccionada!;
    this.syncBodegaModalVisible = true;
    this.loadingSyncBodegaModal = true;
    this.productosSyncBodega = [];
    this.resumenSyncBodega = {
      total: 0,
      conDiferencia: 0,
      sinEnlace: 0,
      totalDiferencia: 0,
    };

    // Cargar TODOS los productos con fulfillment desde el servidor
    let productosConFF: ProductoConsolidado[] = [];
    try {
      const response: any = await this.inventarioService.obtenerInventarioConsolidado({
        limit: 500,
        page: 1,
        soloInventariables: true,
        includeMetrics: false,
        fulfillment: 'con',
      }).toPromise();

      if (response?.success) {
        productosConFF = (response.productos || []).filter((p: any) => p.fulfillmentId);
      }
    } catch (error) {
      console.error("Error cargando productos con fulfillment:", error);
      this.toastr.error("Error al cargar productos", "Error");
      this.loadingSyncBodegaModal = false;
      return;
    }

    // Cargar stock de fulfillment para cada producto
    for (const producto of productosConFF) {
      const stockKatuq = this.getStockBodegaById(producto, bodega.id);

      let stockFulfillment: number | null = null;
      let diferencia: number | null = null;

      // Consultar stock de fulfillment
      try {
        const response = await this.fulfillmentService
          .getProductStock(this.fulfillmentProvider, producto.fulfillmentId!)
          .toPromise();

        if (response?.success && response.warehouses) {
          // Buscar la bodega específica
          const whMatch = response.warehouses.find(
            (wh: any) =>
              wh.id === bodega.fulfillmentId ||
              wh.code === bodega.id ||
              (wh.name &&
                wh.name.toUpperCase().includes(bodega.nombre.toUpperCase())),
          );
          if (whMatch) {
            stockFulfillment = whMatch.quantity || whMatch.stock || 0;
            diferencia = stockFulfillment - stockKatuq;
          }
        }
      } catch (error) {
        console.error(
          `Error obteniendo stock FF para ${producto.nombre}:`,
          error,
        );
      }

      this.productosSyncBodega.push({
        id: producto.id,
        referencia: producto.referencia || "",
        nombre: producto.nombre,
        stockKatuq,
        stockFulfillment,
        diferencia,
        fulfillmentId: producto.fulfillmentId,
      });
    }

    // Calcular resumen
    this.resumenSyncBodega.total = this.productosSyncBodega.length;
    this.resumenSyncBodega.conDiferencia = this.productosSyncBodega.filter(
      (p) => p.diferencia !== null && p.diferencia !== 0,
    ).length;
    this.resumenSyncBodega.sinEnlace = this.productosSyncBodega.filter(
      (p) => p.stockFulfillment === null,
    ).length;
    this.resumenSyncBodega.totalDiferencia = this.productosSyncBodega.reduce(
      (acc, p) => acc + (p.diferencia || 0),
      0,
    );

    this.loadingSyncBodegaModal = false;
  }

  /**
   * Obtiene el stock de un producto en una bodega específica por ID
   */
  private getStockBodegaById(
    producto: ProductoConsolidado,
    bodegaId: string,
  ): number {
    if (!producto.stockPorBodega) return 0;
    return producto.stockPorBodega[bodegaId] || 0;
  }

  /**
   * Cierra el modal de sync bodega
   */
  cerrarModalSyncBodega(): void {
    this.syncBodegaModalVisible = false;
    this.productosSyncBodega = [];
  }

  /**
   * Ejecuta la sincronización desde el modal
   */
  confirmarSyncBodegaModal(): void {
    if (!this.bodegaSyncSeleccionada) return;

    const productosASincronizar = this.productosSyncBodega.filter(
      (p) => p.fulfillmentId && p.diferencia !== null,
    );

    if (productosASincronizar.length === 0) {
      this.toastr.info("No hay productos para sincronizar", "Info");
      return;
    }

    this.syncBodegaModalVisible = false;

    // Convertir a formato esperado
    const productos = productosASincronizar.map((p) => ({
      id: p.id,
      referencia: p.referencia,
      nombre: p.nombre,
      fulfillmentId: p.fulfillmentId,
    })) as ProductoConsolidado[];

    this.ejecutarSyncBodegaConsolidada(this.bodegaSyncSeleccionada, productos);
  }

  /**
   * Ejecuta la sincronización de una bodega específica para todos los productos
   */
  private async ejecutarSyncBodegaConsolidada(
    bodega: BodegaConsolidada,
    productos: ProductoConsolidado[],
  ): Promise<void> {
    this.syncingAllProducts = true;
    this.syncAllProgress = {
      current: 0,
      total: productos.length,
      errors: 0,
      success: 0,
    };

    for (const producto of productos) {
      this.syncAllProgress.current++;

      try {
        const referenciaProducto = producto.referencia || producto.id;

        await this.fulfillmentService
          .syncProductInventory(
            referenciaProducto,
            bodega.id,
            this.fulfillmentProvider,
          )
          .toPromise();

        this.syncAllProgress.success++;
      } catch (error) {
        console.error(
          `Error sincronizando ${producto.nombre} en ${bodega.nombre}:`,
          error,
        );
        this.syncAllProgress.errors++;
      }
    }

    this.syncingAllProducts = false;

    Swal.fire({
      title: "Sincronización Completada",
      html: `
        <p>Bodega: <strong>${bodega.nombre}</strong></p>
        <p><i class="pi pi-check-circle text-success me-2"></i>${this.syncAllProgress.success} productos sincronizados</p>
        ${this.syncAllProgress.errors > 0 ? `<p><i class="pi pi-times-circle text-danger me-2"></i>${this.syncAllProgress.errors} errores</p>` : ""}
      `,
      icon: this.syncAllProgress.errors > 0 ? "warning" : "success",
    });

    this.cargarInventarioConsolidado();
  }

  /**
   * Sincroniza TODOS los productos con fulfillment desde Vista Consolidada
   * Recorre cada producto y sincroniza todas sus bodegas con fulfillment
   */
  syncAllProductsFulfillment(): void {
    if (!this.fulfillmentEnabled || !this.fulfillmentProvider) {
      this.toastr.warning("Fulfillment no está configurado", "Advertencia");
      return;
    }

    // Cargar TODOS los productos con fulfillment desde el servidor (no solo la página actual)
    this.toastr.info("Cargando productos con fulfillment...", "Preparando");
    this.inventarioService.obtenerInventarioConsolidado({
      limit: 500,
      page: 1,
      soloInventariables: true,
      includeMetrics: false,
      fulfillment: 'con',
    }).subscribe({
      next: (response: any) => {
        if (!response.success) {
          this.toastr.error("Error al cargar productos", "Error");
          return;
        }
        const productosConFF: ProductoConsolidado[] = (response.productos || [])
          .filter((p: any) => p.fulfillmentId);

        if (productosConFF.length === 0) {
          this.toastr.info("No hay productos con enlace a fulfillment", "Info");
          return;
        }

        Swal.fire({
          title: "Sincronizar Todo el Inventario",
          html: `
            <p>¿Desea sincronizar <strong>${productosConFF.length}</strong> productos con ${this.fulfillmentProviderName}?</p>
            <p class="text-muted small">Se sincronizarán todas las bodegas de cada producto.</p>
          `,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Sí, sincronizar todo",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "#6C4CE0",
        }).then((result) => {
          if (result.isConfirmed) {
            this.ejecutarSyncMasivo(productosConFF);
          }
        });
      },
      error: () => {
        this.toastr.error("Error al cargar productos con fulfillment", "Error");
      },
    });
  }

  /**
   * Ejecuta la sincronización masiva de todos los productos
   */
  private async ejecutarSyncMasivo(
    productos: ProductoConsolidado[],
  ): Promise<void> {
    this.syncingAllProducts = true;
    this.syncAllProgress = {
      current: 0,
      total: productos.length,
      errors: 0,
      success: 0,
    };

    // Obtener bodegas con fulfillment
    const bodegasConFF = this.bodegasConsolidadas.filter(
      (b) => b.fulfillmentId,
    );

    for (const producto of productos) {
      this.syncAllProgress.current++;

      try {
        // Sincronizar cada bodega del producto
        for (const bodega of bodegasConFF) {
          const referenciaProducto = producto.referencia || producto.id;

          await this.fulfillmentService
            .syncProductInventory(
              referenciaProducto,
              bodega.id, // idBodega
              this.fulfillmentProvider,
            )
            .toPromise();
        }
        this.syncAllProgress.success++;
      } catch (error) {
        console.error(
          `Error sincronizando producto ${producto.nombre}:`,
          error,
        );
        this.syncAllProgress.errors++;
      }
    }

    this.syncingAllProducts = false;

    // Mostrar resultado
    Swal.fire({
      title: "Sincronización Completada",
      html: `
        <div class="text-start">
          <p><i class="pi pi-check-circle text-success me-2"></i><strong>${this.syncAllProgress.success}</strong> productos sincronizados</p>
          ${this.syncAllProgress.errors > 0 ? `<p><i class="pi pi-times-circle text-danger me-2"></i><strong>${this.syncAllProgress.errors}</strong> errores</p>` : ""}
        </div>
      `,
      icon: this.syncAllProgress.errors > 0 ? "warning" : "success",
    });

    // Recargar inventario
    this.cargarInventarioConsolidado();
  }

  // ============== MÉTODOS DE ROW EXPANSION ==============

  /**
   * Maneja la expansión/colapso de una fila
   */
  onRowExpand(event: any): void {
    const producto = event.data as ProductoInventario;
    if (
      !producto.inventarioPorBodega ||
      producto.inventarioPorBodega.length === 0
    ) {
      this.loadStockDetallado(producto);
    }
  }

  /**
   * Carga el stock detallado por bodega para un producto
   */
  loadStockDetallado(producto: ProductoInventario): void {
    producto.detalleLoading = true;
    producto.inventarioPorBodega = [];
    producto.fulfillmentWarehouses = [];

    // 1. Cargar inventario de todas las bodegas de Katuq
    this.inventarioService.obtenerInventarioProducto(producto.id).subscribe({
      next: (inventarios: any[]) => {
        producto.inventarioPorBodega = inventarios.map((inv) => ({
          bodegaId: inv.bodegaId || inv.idBodega,
          bodegaNombre:
            inv.bodega?.nombre ||
            this.getNombreBodega(inv.bodegaId || inv.idBodega),
          cantidad: inv.cantidad || 0,
          tipo:
            inv.bodega?.tipo ||
            this.getTipoBodega(inv.bodegaId || inv.idBodega),
          origenFulfillment:
            inv.bodega?.origenFulfillment ||
            this.bodegas.find((b) => b.idBodega === inv.bodegaId)
              ?.origenFulfillment,
        }));

        // 2. Si hay fulfillment habilitado, cargar también las bodegas del fulfillment
        if (this.fulfillmentEnabled && this.fulfillmentProvider) {
          this.loadFulfillmentWarehouseStock(producto);
        } else {
          producto.detalleLoading = false;
        }
      },
      error: (error) => {
        console.error("Error cargando inventario detallado:", error);
        producto.detalleLoading = false;
        // Si falla, al menos mostrar la bodega actual
        if (producto.bodegaId) {
          producto.inventarioPorBodega = [
            {
              bodegaId: producto.bodegaId,
              bodegaNombre:
                producto.bodegaNombre ||
                this.getNombreBodega(producto.bodegaId),
              cantidad: producto.cantidad || 0,
              tipo: this.getTipoBodega(producto.bodegaId),
              origenFulfillment: false,
            },
          ];
        }
      },
    });
  }

  /**
   * Carga el stock de las bodegas del fulfillment para un producto
   */
  loadFulfillmentWarehouseStock(producto: ProductoInventario): void {
    const productRef = producto.identificacion?.referencia || producto.id;

    this.fulfillmentService
      .getStock(this.fulfillmentProvider, productRef)
      .subscribe({
        next: (result) => {
          if (result.success && result.warehouses) {
            producto.fulfillmentWarehouses = result.warehouses.map(
              (wh: any) => ({
                id: wh.id || wh.warehouseId,
                name: wh.name || wh.warehouseName || "Bodega Fulfillment",
                quantity: wh.quantity || wh.stock || 0,
              }),
            );
          }
          producto.detalleLoading = false;
        },
        error: (error) => {
          console.error("Error cargando stock de fulfillment:", error);
          producto.detalleLoading = false;
        },
      });
  }

  /**
   * Calcula el total de stock en bodegas de Katuq
   */
  getTotalStockKatuq(producto: ProductoInventario): number {
    if (!producto.inventarioPorBodega) return producto.cantidad || 0;
    return producto.inventarioPorBodega.reduce(
      (total, b) => total + b.cantidad,
      0,
    );
  }

  /**
   * Calcula el total de stock en bodegas del fulfillment
   */
  getTotalStockFulfillment(producto: ProductoInventario): number {
    if (!producto.fulfillmentWarehouses) return producto.stockFulfillment || 0;
    return producto.fulfillmentWarehouses.reduce(
      (total, wh) => total + wh.quantity,
      0,
    );
  }

  /**
   * Obtiene la diferencia total entre Katuq y Fulfillment
   */
  getDiferenciaTotal(producto: ProductoInventario): number {
    const totalKatuq = this.getTotalStockKatuq(producto);
    const totalFulfillment = this.getTotalStockFulfillment(producto);
    return totalFulfillment - totalKatuq;
  }

  // ============== INICIALIZACIÓN DE INVENTARIO DESDE FULFILLMENT ==============

  /**
   * Verifica si la bodega seleccionada es de origen fulfillment
   */
  isBodegaFulfillment(): boolean {
    return this.bodegaSeleccionada?.origenFulfillment === true;
  }

  /**
   * Inicializa el inventario de la bodega desde el fulfillment.
   * Para productos que YA existen en el catálogo pero NO tienen inventario.
   */
  initInventoryFromFulfillment(): void {
    if (
      !this.fulfillmentEnabled ||
      !this.fulfillmentProvider ||
      !this.bodegaSeleccionada
    ) {
      this.toastr.warning(
        "Seleccione una bodega y verifique la configuración de fulfillment",
        "Advertencia",
      );
      return;
    }

    // Confirmar antes de inicializar
    Swal.fire({
      title: "Inicializar Inventario desde Fulfillment",
      html: `
        <p>Esta acción creará registros de inventario para los productos de <strong>${this.fulfillmentProviderName}</strong>
        que ya existen en el catálogo de Katuq pero no tienen inventario en la bodega
        <strong>"${this.bodegaSeleccionada.nombre}"</strong>.</p>
        <p class="text-muted small mt-3">
          <i class="pi pi-info-circle me-1"></i>
          Solo se procesarán productos que coincidan por SKU/Referencia.
        </p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, inicializar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#6C4CE0",
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarInitInventory();
      }
    });
  }

  /**
   * Ejecuta la inicialización del inventario
   */
  private ejecutarInitInventory(): void {
    this.initializingInventory = true;

    this.fulfillmentService
      .initInventoryFromFulfillment(
        this.bodegaSeleccionada.idBodega,
        this.fulfillmentProvider,
        { batchSize: 10 },
      )
      .subscribe({
        next: (result) => {
          this.initializingInventory = false;

          if (result.success) {
            // Recargar inventario después de inicializar
            this.obtenerProductosPorBodega(this.bodegaSeleccionada.idBodega);

            Swal.fire({
              title: "Inicialización Completada",
              html: `
              <div class="text-start">
                <p><strong>${result.initialized}</strong> productos inicializados correctamente</p>
                <p><strong>${result.skipped}</strong> ya tenían inventario</p>
                ${result.notInCatalog > 0 ? `<p class="text-warning"><strong>${result.notInCatalog}</strong> no están en el catálogo de Katuq</p>` : ""}
                ${result.errors > 0 ? `<p class="text-danger"><strong>${result.errors}</strong> errores</p>` : ""}
                <p class="text-muted mt-2">Duración: ${(result.duracionMs / 1000).toFixed(1)}s</p>
              </div>
            `,
              icon: result.errors > 0 ? "warning" : "success",
            });
          } else {
            Swal.fire({
              title: "Error",
              text: result.error || "Error al inicializar el inventario",
              icon: "error",
            });
          }
        },
        error: (error) => {
          this.initializingInventory = false;
          console.error("Error inicializando inventario:", error);
          Swal.fire({
            title: "Error",
            text: "Error al inicializar el inventario desde fulfillment",
            icon: "error",
          });
        },
      });
  }

  // ============== MÉTODOS ADMINISTRATIVOS ==============

  /**
   * Elimina FÍSICAMENTE todo el inventario del comercio actual
   * ⚠️ OPERACIÓN DESTRUCTIVA - USO ADMINISTRATIVO/DESARROLLO
   */
  limpiarInventarioComercio(): void {
    const companyName = this.empresaActual?.nomComercial;

    if (!companyName) {
      Swal.fire("Error", "No se pudo obtener el nombre del comercio", "error");
      return;
    }

    // Primera confirmación
    Swal.fire({
      title: "⚠️ Eliminación Masiva de Inventario",
      html: `
        <div class="text-start">
          <p class="text-danger fw-bold">Esta acción eliminará FÍSICAMENTE todo el inventario del comercio:</p>
          <p class="text-primary fw-bold fs-5">"${companyName}"</p>
          <hr>
          <p class="text-muted">Se eliminarán los siguientes registros:</p>
          <ul class="text-start">
            <li><strong>Inventario</strong> (stock actual en todas las bodegas)</li>
            <li><strong>Movimientos</strong> (historial de entradas/salidas)</li>
            <li><strong>Historial</strong> (registros de cambios)</li>
          </ul>
          <p class="text-danger"><i class="fa fa-exclamation-triangle"></i> Esta acción NO se puede deshacer.</p>
          <p>Uso recomendado solo para:</p>
          <ul class="text-start">
            <li>Entornos de desarrollo</li>
            <li>Limpieza de datos de prueba</li>
            <li>Reinicio completo del inventario</li>
          </ul>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "⚠️ Continuar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // Segunda confirmación con input del nombre
        Swal.fire({
          title: "Confirmación Final",
          html: `
            <p>Para confirmar, escriba el nombre del comercio:</p>
            <p class="fw-bold text-primary">"${companyName}"</p>
          `,
          input: "text",
          inputPlaceholder: "Escriba el nombre del comercio",
          inputAttributes: {
            autocapitalize: "off",
          },
          showCancelButton: true,
          confirmButtonColor: "#dc3545",
          cancelButtonColor: "#6c757d",
          confirmButtonText: "🗑️ Eliminar TODO el Inventario",
          cancelButtonText: "Cancelar",
          focusCancel: true,
          inputValidator: (value) => {
            if (!value) {
              return "Debe escribir el nombre del comercio";
            }
            if (value !== companyName) {
              return "El nombre no coincide. Intente de nuevo.";
            }
            return null;
          },
        }).then((confirmResult) => {
          if (
            confirmResult.isConfirmed &&
            confirmResult.value === companyName
          ) {
            this.ejecutarLimpiezaInventario(companyName);
          }
        });
      }
    });
  }

  /**
   * Ejecuta la eliminación masiva de inventario
   */
  private ejecutarLimpiezaInventario(companyName: string): void {
    Swal.fire({
      title: "Eliminando inventario...",
      html: "Por favor espere. Esta operación puede tomar varios minutos dependiendo de la cantidad de registros.",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    this.inventarioService.deleteAllInventoryByCompany(companyName).subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire({
            title: "✅ Limpieza Completada",
            html: `
              <div class="text-start">
                <p><strong>${response.deletedCount?.total || 0}</strong> registros eliminados físicamente.</p>
                <hr>
                <ul>
                  <li>Inventario: <strong>${response.deletedCount?.inventory || 0}</strong></li>
                  <li>Movimientos: <strong>${response.deletedCount?.inventoryMovement || 0}</strong></li>
                  <li>Historial: <strong>${response.deletedCount?.inventoryProductHistory || 0}</strong></li>
                </ul>
                <p class="text-muted">Comercio: ${response.company}</p>
                <p class="text-muted small">Timestamp: ${response.timestamp}</p>
              </div>
            `,
            icon: "success",
            confirmButtonText: "Entendido",
          });
          // Limpiar la vista
          this.rows = [];
          this.rowsFiltradas = [];
          this.productosSinFiltro = [];
          this.totalItems = 0;
        } else {
          Swal.fire("Error", response.error || "Error desconocido", "error");
        }
      },
      error: (error) => {
        console.error("Error eliminando inventario:", error);
        Swal.fire({
          title: "Error",
          html: `
            <p>No se pudo eliminar el inventario.</p>
            <p class="text-danger">${error.error?.error || error.message || "Error desconocido"}</p>
          `,
          icon: "error",
        });
      },
    });
  }
}
