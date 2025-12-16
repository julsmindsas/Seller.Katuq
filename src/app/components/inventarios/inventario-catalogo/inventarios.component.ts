import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { ProductDetailsComponent } from '../../productos/product-details/product-details.component';
import { Producto } from '../../../shared/models/productos/Producto';
import { MovimientoInventario } from '../model/movimientoinventario'
import * as XLSX from 'xlsx';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { 
  InventarioService, 
  ProductoConsolidado, 
  BodegaConsolidada 
} from '../../../shared/services/inventarios/inventario.service';
import { TourService } from '../../../shared/services/tour.service';
import { FulfillmentService } from '../../../shared/services/fulfillment/fulfillment.service';
import { ToastrService } from 'ngx-toastr';
import { Table } from 'primeng/table';
import { MenuItem } from 'primeng/api';

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
  selector: 'app-inventarios',
  templateUrl: './inventarios.component.html',
  styleUrls: ['./inventarios.component.scss']
})
export class InventarioCatalogoComponent implements OnInit {
  @ViewChild('dt') dt: Table; // Referencia a la tabla PrimeNG

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
  globalFilterValue: string = '';

  // Nueva propiedad para almacenar los datos filtrados
  rowsFiltradas: any[] = [];

  // Control de los filtros
  filtroGlobal: string = '';
  filtros = {
    referencia: '',
    nombre: '',
    cantidadTipo: '',  // 'agotados', 'bajos', 'disponibles'
    precioMin: null,
    precioMax: null,
    valorTotalMin: null,
    valorTotalMax: null
  };

  // Control del ordenamiento
  ordenamiento: string = 'nombreAsc';

  // ============== FULFILLMENT ==============
  fulfillmentEnabled: boolean = false;
  fulfillmentProvider: string = '';
  fulfillmentProviderName: string = '';
  loadingFulfillmentStock: boolean = false;
  syncingProduct: string | null = null; // ID del producto que se está sincronizando
  syncingBodega: boolean = false;
  stockFulfillmentCargado: boolean = false; // Indica si ya se cargó el stock de fulfillment

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
  bodegasConsolidadas: BodegaConsolidada[] = [];
  estadisticasConsolidadas: { totalStock: number; productosSinStock: number; productosBajoStock: number } = {
    totalStock: 0,
    productosSinStock: 0,
    productosBajoStock: 0
  };
  paginationConsolidada: { limit: number; hasMore: boolean; lastDoc: string | null } = {
    limit: 100,
    hasMore: false,
    lastDoc: null
  };
  loadingConsolidado: boolean = false;
  // Totales globales calculados en backend
  totalesGlobales: { valorTotal: number; totalUnidades: number; totalProductos: number; totalSKUsCatalogo: number } = {
    valorTotal: 0,
    totalUnidades: 0,
    totalProductos: 0,
    totalSKUsCatalogo: 0
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
    nombre: string;
    stockKatuq: number;
    stockAliaddo: number;
    diferencia: number;
  }[] = [];

  // ============== ANÁLISIS IA ==============
  analizandoIA: boolean = false;
  iaAnalysisError: string | null = null;
  iaLastAnalysis: Date | null = null;
  iaMetricasGlobales: { saludInventario: string | null; bodegaCritica: string | null; resumenEjecutivo: string | null } | null = null;

  constructor(
    private service: MaestroService,
    private inventarioService: InventarioService,
    private router: Router,
    private modalService: NgbModal,
    private bodegaService: BodegaService, // Inyectamos el servicio de bodegas
    private tourService: TourService,
    private fulfillmentService: FulfillmentService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.empresaActual = JSON.parse(localStorage.getItem("currentCompany") ?? '{}');
    const texto = this.empresaActual.nomComercial.toString();
    
    // Initialize tour after component loads only if not completed
    const completedTours = JSON.parse(localStorage.getItem('katuq_completed_tours') || '[]');
    if (!completedTours.includes('inventario')) {
      setTimeout(() => {
        this.tourService.startTour('inventario', this.tourService.getInventarioTour());
      }, 2000);
    }
    this.ultimasLetras = texto.substring(texto.length - 3);

    // Inicializar el historial de páginas
    this.pageReferences[this.currentPage] = { firstDocId: null, lastDocId: null };

    // Verificar si hay fulfillment configurado
    this.checkFulfillmentConfig();

    // Cargar bodegas (necesario para la vista antigua y para el modal)
    this.cargarBodegas();

    // Cargar la vista consolidada (nuevo comportamiento por defecto)
    this.cargarInventarioConsolidado();
  }

  /**
   * Verifica si hay un proveedor de fulfillment configurado
   */
  checkFulfillmentConfig(): void {
    this.fulfillmentService.getConfiguredProviders().subscribe({
      next: (providers) => {
        if (providers && providers.length > 0) {
          const activeProvider = providers.find(p => p.configured);
          if (activeProvider) {
            this.fulfillmentEnabled = true;
            this.fulfillmentProvider = activeProvider.provider;
            this.fulfillmentProviderName = this.fulfillmentService.getProviderDisplayName(activeProvider.provider);
            console.log(`✅ Fulfillment habilitado: ${this.fulfillmentProviderName}`);
          }
        }
      },
      error: (error) => {
        console.log('No hay fulfillment configurado o error al verificar:', error);
        this.fulfillmentEnabled = false;
      }
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
        console.error('Error al cargar bodegas:', error);
        this.cargando = false;
      }
    });
  }

  // ============== MÉTODOS DE VISTA CONSOLIDADA ==============

  /**
   * Carga el inventario consolidado - todos los productos con stock por bodega
   */
  cargarInventarioConsolidado(loadMore: boolean = false): void {
    this.loadingConsolidado = true;
    
    const options: { limit?: number; lastDoc?: string; soloInventariables?: boolean } = {
      limit: this.paginationConsolidada.limit,
      soloInventariables: true
    };
    
    if (loadMore && this.paginationConsolidada.lastDoc) {
      options.lastDoc = this.paginationConsolidada.lastDoc;
    }

    this.inventarioService.obtenerInventarioConsolidado(options).subscribe({
      next: (response) => {
        if (response.success) {
          if (loadMore) {
            // Agregar a la lista existente
            this.productosConsolidados = [...this.productosConsolidados, ...response.productos];
          } else {
            // Reemplazar la lista
            this.productosConsolidados = response.productos;
          }
          
          this.bodegasConsolidadas = response.bodegas;
          this.estadisticasConsolidadas = response.estadisticas;
          this.paginationConsolidada = {
            limit: response.pagination.limit,
            hasMore: response.pagination.hasMore,
            lastDoc: response.pagination.lastDoc
          };
          this.totalItems = response.totalProductos;
          // Totales globales calculados en backend (para métricas)
          this.totalesGlobales = response.totalesGlobales || {
            valorTotal: 0,
            totalUnidades: 0,
            totalProductos: 0,
            totalSKUsCatalogo: 0
          };

          console.log(`📦 Inventario consolidado cargado: ${this.productosConsolidados.length} productos, ${this.bodegasConsolidadas.length} bodegas (valor total: $${this.totalesGlobales.valorTotal.toLocaleString()})`);
        } else {
          this.toastr.error('Error al cargar inventario consolidado');
        }
        this.loadingConsolidado = false;
      },
      error: (error) => {
        console.error('Error al cargar inventario consolidado:', error);
        this.toastr.error('Error al cargar inventario');
        this.loadingConsolidado = false;
      }
    });
  }

  /**
   * Carga más productos en la vista consolidada (paginación infinita)
   */
  cargarMasProductos(): void {
    if (this.paginationConsolidada.hasMore && !this.loadingConsolidado) {
      this.cargarInventarioConsolidado(true);
    }
  }

  /**
   * Obtiene el stock de un producto en una bodega específica
   */
  getStockBodega(producto: ProductoConsolidado, bodegaId: string): number {
    return producto.stockPorBodega?.[bodegaId] ?? 0;
  }

  /**
   * Formatea valores grandes de forma abreviada (ej: 12500000 -> "12.5M")
   */
  formatearValorAbreviado(valor: number): string {
    if (valor >= 1000000) {
      return '$' + (valor / 1000000).toFixed(1) + 'M';
    } else if (valor >= 1000) {
      return '$' + (valor / 1000).toFixed(0) + 'K';
    }
    return '$' + valor.toLocaleString();
  }

  // ============== ANÁLISIS IA ==============

  /**
   * Ejecuta análisis de inventario con IA (ADK Agent)
   * Popula los campos de IA en las métricas de cada bodega y globales
   */
  analizarConIA(): void {
    if (this.bodegasConsolidadas.length === 0) {
      this.toastr.warning('No hay bodegas para analizar', 'Análisis IA');
      return;
    }

    this.analizandoIA = true;
    this.iaAnalysisError = null;

    this.inventarioService.analyzeInventoryWithIA(this.bodegasConsolidadas).subscribe({
      next: (response) => {
        if (response.success) {
          // Update IA metrics for each bodega
          this.bodegasConsolidadas.forEach(bodega => {
            const iaMetrics = response.metricasPorBodega[bodega.id];
            if (iaMetrics && bodega.metricas) {
              bodega.metricas.ia = iaMetrics;
            }
          });

          // Update global IA metrics
          this.iaMetricasGlobales = response.metricasGlobales;

          this.iaLastAnalysis = new Date(response.timestamp);
          this.toastr.success('Análisis completado', 'Inteligencia Artificial');
        } else {
          this.iaAnalysisError = response.error || 'Error desconocido en el análisis';
          this.toastr.error(this.iaAnalysisError, 'Error IA');
        }
        this.analizandoIA = false;
      },
      error: (error) => {
        console.error('Error en análisis IA:', error);
        this.iaAnalysisError = error.error?.details || error.error?.error || 'Error de conexión con servicio de IA';
        this.toastr.error(this.iaAnalysisError, 'Error IA');
        this.analizandoIA = false;
      }
    });
  }

  /**
   * Helper para obtener nombre de bodega por ID
   */
  getNombreBodegaById(bodegaId: string): string {
    const bodega = this.bodegasConsolidadas.find(b => b.id === bodegaId);
    return bodega?.nombre || bodegaId;
  }

  /**
   * Genera el tooltip con sugerencias de IA para una bodega
   */
  getIASugerenciasTooltip(bodega: BodegaConsolidada): string {
    if (!bodega.metricas?.ia?.sugerencias?.length) {
      return 'Sin sugerencias';
    }
    return bodega.metricas.ia.sugerencias.join('\n');
  }

  /**
   * Expande/colapsa la fila de un producto para ver detalles de fulfillment
   */
  toggleExpansion(producto: ProductoConsolidado): void {
    producto.expanded = !producto.expanded;
    
    // Si se expande y tiene fulfillment habilitado, cargar stock de fulfillment
    if (producto.expanded && this.fulfillmentEnabled && producto.fulfillmentId && !producto.fulfillmentStock) {
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
    this.fulfillmentService.getProductStock(this.fulfillmentProvider, producto.fulfillmentId).subscribe({
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
        console.error('Error al cargar fulfillment:', error);
        producto.fulfillmentLoading = false;
      }
    });
  }

  /**
   * Obtiene el stock de fulfillment para una bodega específica
   */
  getFulfillmentStockForBodega(producto: ProductoConsolidado, bodega: BodegaConsolidada): number | null {
    if (!producto.fulfillmentStock || !bodega.fulfillmentId) return null;
    
    // Buscar por fulfillmentId de la bodega o por código
    const warehouseMatch = producto.fulfillmentWarehouses?.find((wh: any) => 
      (bodega.fulfillmentId && wh.id === bodega.fulfillmentId) ||
      (wh.code && wh.code === bodega.id)
    );
    
    return warehouseMatch?.stock ?? warehouseMatch?.quantity ?? null;
  }

  /**
   * Calcula la diferencia entre stock Katuq y fulfillment para una bodega
   */
  getDiferenciaStock(producto: ProductoConsolidado, bodega: BodegaConsolidada): number | null {
    const stockKatuq = this.getStockBodega(producto, bodega.id);
    const stockFulfillment = this.getFulfillmentStockForBodega(producto, bodega);
    
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
      label: producto.expanded ? 'Ocultar detalles' : 'Ver detalles',
      icon: producto.expanded ? 'pi pi-eye-slash' : 'pi pi-eye',
      command: () => this.toggleExpansion(this.selectedMenuProducto!)
    });

    // Opción de sincronizar (siempre visible si fulfillment está habilitado)
    if (this.fulfillmentEnabled) {
      items.push({ separator: true });
      items.push({
        label: `Sincronizar con ${this.fulfillmentProviderName}`,
        icon: 'pi pi-sync',
        disabled: !producto.fulfillmentId,
        tooltip: !producto.fulfillmentId ? 'Este producto no tiene enlace a fulfillment' : '',
        command: () => {
          if (this.selectedMenuProducto?.fulfillmentId) {
            this.openSyncModal(this.selectedMenuProducto);
          }
        }
      });
    }

    this.rowMenuItems = items;
    menu.toggle(event);
  }

  // ============== MÉTODOS DEL MODAL DE SINCRONIZACIÓN - SIMPLIFICADO ==============

  /**
   * Abre el modal de sincronización para un producto
   * Consulta el stock de Aliaddo usando el fulfillmentId (UUID de Aliaddo)
   */
  openSyncModal(producto: ProductoConsolidado): void {
    if (!producto.fulfillmentId) {
      this.toastr.warning('Este producto no tiene enlace a fulfillment');
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
    this.fulfillmentService.getProductStock(
      this.fulfillmentProvider,
      producto.fulfillmentId
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.stockAliaddoTotal = response.totalStock || 0;
          this.diferenciaSyncTotal = this.stockAliaddoTotal - this.stockKatuqTotal;

          // Calcular desglose por bodega
          if (response.warehouses && response.warehouses.length > 0) {
            response.warehouses.forEach((wh: any) => {
              // Buscar bodega de Katuq correspondiente
              const bodegaKatuq = this.bodegasConsolidadas.find(b =>
                b.fulfillmentId === wh.id || b.id === wh.code
              );

              const stockKatuq = bodegaKatuq
                ? this.getStockBodega(producto, bodegaKatuq.id)
                : 0;
              const stockAliaddo = wh.quantity || wh.stock || 0;

              this.bodegasDesglose.push({
                nombre: bodegaKatuq?.nombre || wh.name || 'Sin mapear',
                stockKatuq,
                stockAliaddo,
                diferencia: stockAliaddo - stockKatuq
              });
            });
          }
        } else {
          this.errorSyncModal = response.error || 'Error al consultar Aliaddo';
        }
        this.loadingSyncModal = false;
      },
      error: (error) => {
        console.error('Error al consultar stock de Aliaddo:', error);
        this.errorSyncModal = 'Error de conexión con Aliaddo';
        this.loadingSyncModal = false;
      }
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
   * Actualiza el stock de Katuq para que coincida con Aliaddo
   */
  ejecutarSincronizacion(): void {
    if (!this.productoSyncSeleccionado || this.diferenciaSyncTotal === 0) {
      return;
    }

    this.loadingSyncModal = true;

    // Sincronizar en la bodega principal (primera con fulfillmentId)
    const bodegaDestino = this.bodegasConsolidadas.find(b => b.fulfillmentId);

    if (!bodegaDestino) {
      this.toastr.error('No hay bodega configurada para fulfillment');
      this.loadingSyncModal = false;
      return;
    }

    this.fulfillmentService.syncProductInventory(
      this.productoSyncSeleccionado.id,
      bodegaDestino.id,
      this.fulfillmentProvider,
      { fulfillmentProductId: this.productoSyncSeleccionado.fulfillmentId! }
    ).subscribe({
      next: (result) => {
        if (result.success) {
          const signo = this.diferenciaSyncTotal > 0 ? '+' : '';
          this.toastr.success(`Sincronizado: ${signo}${this.diferenciaSyncTotal} unidades`);
          this.closeSyncModal();
          this.cargarInventarioConsolidado(); // Recargar datos
        } else {
          this.toastr.error(result.error || 'Error al sincronizar');
        }
        this.loadingSyncModal = false;
      },
      error: (error) => {
        console.error('Error sincronizando producto:', error);
        this.toastr.error('Error al sincronizar con Aliaddo');
        this.loadingSyncModal = false;
      }
    });
  }

  /**
   * Calcula el total de stock de fulfillment para un producto
   */
  calcularTotalFulfillment(producto: ProductoConsolidado): number {
    if (!producto.fulfillmentStock) return 0;
    return Object.values(producto.fulfillmentStock).reduce((sum, qty) => sum + qty, 0);
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
          this.rows = r.productos.map(itemInventario => ({
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
        console.error('Error al obtener productos por bodega:', error);
        this.cargando = false;
        this.rows = [];
        this.rowsFiltradas = [];
        this.productosSinFiltro = [];
        this.totalItems = 0;
      }
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
    if (event.key !== 'Enter' || input.length < 3) return;

    // Si tenemos una bodega seleccionada, buscamos solo en esa bodega
    if (this.bodegaSeleccionada?.idBodega) {
      this.cargando = true;
      // Filtrar los datos que ya tenemos
      const filteredRows = this.productosSinFiltro.filter(producto =>
        producto.crearProducto?.titulo?.toLowerCase().includes(input) ||
        producto.identificacion?.referencia?.toLowerCase().includes(input)
      );
      this.rows = filteredRows;
      this.totalItems = filteredRows.length;
      this.cargando = false;
    }
  }

  // Métodos de ordenamiento local

  sortByQuantity() {
    this.ordenamiento = this.ordenamiento === 'cantidadDesc' ? 'cantidadAsc' : 'cantidadDesc';
    this.aplicarOrdenamiento();
  }

  sortByName(order: 'asc' | 'desc' = 'asc') {
    // Ordenar productos por nombre
    this.rows = [...this.rows].sort((a, b) => {
      const nombreA = a.crearProducto?.titulo?.toLowerCase() || '';
      const nombreB = b.crearProducto?.titulo?.toLowerCase() || '';
      return order === 'asc'
        ? nombreA.localeCompare(nombreB)
        : nombreB.localeCompare(nombreA);
    });
  }

  sortByPrice(order: 'asc' | 'desc' = 'asc') {
    // Ordenar productos por precio
    this.rows = [...this.rows].sort((a, b) => {
      const precioA = a.precio?.precioUnitarioConIva || 0;
      const precioB = b.precio?.precioUnitarioConIva || 0;
      return order === 'asc'
        ? precioA - precioB
        : precioB - precioA;
    });
  }

  sortByReference(order: 'asc' | 'desc' = 'asc') {
    // Ordenar productos por referencia
    this.rows = [...this.rows].sort((a, b) => {
      const refA = a.identificacion?.referencia?.toLowerCase() || '';
      const refB = b.identificacion?.referencia?.toLowerCase() || '';
      return order === 'asc'
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
        title: 'Sin datos',
        text: 'No hay datos para exportar',
        icon: 'warning'
      });
      return;
    }

    // Crear una versión simplificada para Excel
    const excelData = this.rowsFiltradas.map(row => {
      return {
        'Referencia': row.identificacion?.referencia || '',
        'Nombre': row.crearProducto?.titulo || '',
        'Cantidad': row.cantidad || 0,
        'Precio Unitario': row.precio?.precioUnitarioConIva || 0,
        'Valor Total': this.calcularValorTotal(row),
        'Bodega': row.bodegaNombre || this.getNombreBodega(row.bodegaId || ''),
        'Tipo Bodega': this.getTipoBodega(row.bodegaId || '')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, 'Inventario_Detallado.xlsx');
  }

  // Métodos auxiliares para la plantilla

  /**
   * Obtiene el nombre de una bodega por el ID
   */
  getNombreBodega(bodegaId: string): string {
    const bodega = this.bodegas.find(b => b.idBodega === bodegaId);
    return bodega?.nombre || 'Sin bodega asignada';
  }

  /**
   * Obtiene el tipo de una bodega por el ID
   */
  getTipoBodega(bodegaId: string): string {
    const bodega = this.bodegas.find(b => b.idBodega === bodegaId);
    return bodega?.tipo || '';
  }

  /**
   * Determina si una bodega es de tipo físico
   */
  isBodegaFisica(bodegaId: string): boolean {
    return this.getTipoBodega(bodegaId) === 'Física';
  }

  /**
   * Determina si una bodega es de tipo transaccional
   */
  isBodegaTransaccional(bodegaId: string): boolean {
    return this.getTipoBodega(bodegaId) === 'Transaccional';
  }

  /**
   * Devuelve las clases CSS para el movimiento de inventario
   */
  getClaseMovimiento(tipoMovimiento: string): any {
    return {
      'bg-success': tipoMovimiento === 'in',
      'bg-danger': tipoMovimiento === 'out'
    };
  }

  /**
   * Devuelve las clases del icono para el movimiento de inventario
   */
  getClaseIconoMovimiento(tipoMovimiento: string): any {
    return {
      'bi-arrow-up-circle': tipoMovimiento === 'in',
      'bi-arrow-down-circle': tipoMovimiento === 'out'
    };
  }

  /**
   * Devuelve las clases CSS para la etiqueta de tipo de bodega
   */
  getClasesTipoBodega(bodegaId: string): any {
    const tipo = this.getTipoBodega(bodegaId);
    return {
      'bg-primary': tipo === 'Física',
      'bg-info': tipo === 'Transaccional'
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
    if (this.filtroGlobal && this.filtroGlobal.trim() !== '') {
      const filtro = this.filtroGlobal.trim().toLowerCase();
      resultados = resultados.filter(producto =>
      (producto.crearProducto?.titulo?.toLowerCase().includes(filtro) ||
        producto.identificacion?.referencia?.toLowerCase().includes(filtro))
      );
    }

    // Aplicar filtro de referencia
    if (this.filtros.referencia && this.filtros.referencia.trim() !== '') {
      const filtro = this.filtros.referencia.trim().toLowerCase();
      resultados = resultados.filter(producto =>
        producto.identificacion?.referencia?.toLowerCase().includes(filtro)
      );
    }

    // Aplicar filtro de nombre
    if (this.filtros.nombre && this.filtros.nombre.trim() !== '') {
      const filtro = this.filtros.nombre.trim().toLowerCase();
      resultados = resultados.filter(producto =>
        producto.crearProducto?.titulo?.toLowerCase().includes(filtro)
      );
    }

    // Aplicar filtro por cantidad
    if (this.filtros.cantidadTipo) {
      switch (this.filtros.cantidadTipo) {
        case 'agotados':
          resultados = resultados.filter(producto => (producto.cantidad || 0) === 0);
          break;
        case 'bajos':
          resultados = resultados.filter(producto => (producto.cantidad || 0) > 0 && (producto.cantidad || 0) <= 5);
          break;
        case 'disponibles':
          resultados = resultados.filter(producto => (producto.cantidad || 0) > 5);
          break;
      }
    }

    // Aplicar filtros de precio unitario
    if (this.filtros.precioMin !== null && this.filtros.precioMin !== undefined && !isNaN(Number(this.filtros.precioMin))) {
      const precioMin = Number(this.filtros.precioMin);
      resultados = resultados.filter(producto =>
        (producto.precio?.precioUnitarioConIva || 0) >= precioMin
      );
    }

    if (this.filtros.precioMax !== null && this.filtros.precioMax !== undefined && !isNaN(Number(this.filtros.precioMax))) {
      const precioMax = Number(this.filtros.precioMax);
      resultados = resultados.filter(producto =>
        (producto.precio?.precioUnitarioConIva || 0) <= precioMax
      );
    }

    // Aplicar filtros de valor total
    if (this.filtros.valorTotalMin !== null && this.filtros.valorTotalMin !== undefined && !isNaN(Number(this.filtros.valorTotalMin))) {
      const valorMin = Number(this.filtros.valorTotalMin);
      resultados = resultados.filter(producto =>
        this.calcularValorTotal(producto) >= valorMin
      );
    }

    if (this.filtros.valorTotalMax !== null && this.filtros.valorTotalMax !== undefined && !isNaN(Number(this.filtros.valorTotalMax))) {
      const valorMax = Number(this.filtros.valorTotalMax);
      resultados = resultados.filter(producto =>
        this.calcularValorTotal(producto) <= valorMax
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
      case 'nombreAsc':
        resultados.sort((a, b) => (a.crearProducto?.titulo || '').localeCompare(b.crearProducto?.titulo || ''));
        break;
      case 'nombreDesc':
        resultados.sort((a, b) => (b.crearProducto?.titulo || '').localeCompare(a.crearProducto?.titulo || ''));
        break;
      case 'cantidadAsc':
        resultados.sort((a, b) => (a.cantidad || 0) - (b.cantidad || 0));
        break;
      case 'cantidadDesc':
        resultados.sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0));
        break;
      case 'precioAsc':
        resultados.sort((a, b) => (a.precio?.precioUnitarioConIva || 0) - (b.precio?.precioUnitarioConIva || 0));
        break;
      case 'precioDesc':
        resultados.sort((a, b) => (b.precio?.precioUnitarioConIva || 0) - (a.precio?.precioUnitarioConIva || 0));
        break;
      case 'valorTotalAsc':
        resultados.sort((a, b) => this.calcularValorTotal(a) - this.calcularValorTotal(b));
        break;
      case 'valorTotalDesc':
        resultados.sort((a, b) => this.calcularValorTotal(b) - this.calcularValorTotal(a));
        break;
    }
  }

  // Método para filtrar solo productos agotados
  filtrarAgotados() {
    this.filtros.cantidadTipo = 'agotados';
    this.aplicarFiltros();
  }

  // Método para limpiar todos los filtros
  limpiarFiltros() {
    this.filtroGlobal = '';
    this.filtros = {
      referencia: '',
      nombre: '',
      cantidadTipo: '',
      precioMin: null,
      precioMax: null,
      valorTotalMin: null,
      valorTotalMax: null
    };
    this.ordenamiento = 'nombreAsc';
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
    return this.rowsFiltradas.reduce((total, producto) => total + (producto.cantidad || 0), 0);
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
    this.tourService.startTour('inventario', this.tourService.getInventarioTour());
  }

  // ============== MÉTODOS DE FULFILLMENT ==============

  /**
   * Obtiene los IDs de los productos actuales
   */
  getProductIds(): string[] {
    return this.rowsFiltradas.map(p => p.id).filter(id => id);
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
    this.rowsFiltradas.forEach(p => {
      p.fulfillmentLoading = true;
      p.fulfillmentError = undefined;
    });

    this.fulfillmentService.getBulkStock(this.fulfillmentProvider, productIds).subscribe({
      next: (response) => {
        if (response.success && response.stocks) {
          // Mapear resultados a los productos
          this.rowsFiltradas.forEach(producto => {
            const stockInfo = response.stocks[producto.id];
            if (stockInfo) {
              // IMPORTANTE: Buscar stock de la bodega específica, no el total
              const stockBodega = this.getStockForSelectedBodega(stockInfo);
              producto.stockFulfillment = stockBodega;
              producto.fulfillmentError = stockInfo.error;
              producto.fulfillmentWarehouses = stockInfo.warehouses; // Guardar desglose
              producto.diferencia = stockBodega !== null
                ? stockBodega - (producto.cantidad || 0)
                : null;
            } else {
              producto.stockFulfillment = null;
              producto.diferencia = null;
            }
            producto.fulfillmentLoading = false;
          });

          // También actualizar en productosSinFiltro
          this.productosSinFiltro.forEach(producto => {
            const stockInfo = response.stocks[producto.id];
            if (stockInfo) {
              // IMPORTANTE: Buscar stock de la bodega específica, no el total
              const stockBodega = this.getStockForSelectedBodega(stockInfo);
              producto.stockFulfillment = stockBodega;
              producto.fulfillmentError = stockInfo.error;
              producto.fulfillmentWarehouses = stockInfo.warehouses; // Guardar desglose
              producto.diferencia = stockBodega !== null
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
        console.error('Error cargando stock de fulfillment:', error);
        this.rowsFiltradas.forEach(p => {
          p.fulfillmentLoading = false;
          p.fulfillmentError = 'Error al cargar';
        });
        this.loadingFulfillmentStock = false;
        this.toastr.error('Error al cargar stock de fulfillment', 'Error');
      }
    });
  }

  /**
   * Obtiene el stock de fulfillment de un producto específico
   */
  getFulfillmentStock(productId: string): number | null {
    const producto = this.rowsFiltradas.find(p => p.id === productId);
    return producto?.stockFulfillment ?? null;
  }

  /**
   * Obtiene la diferencia de stock (fulfillment - katuq)
   */
  getDiferencia(producto: ProductoInventario): number | null {
    if (producto.stockFulfillment === null || producto.stockFulfillment === undefined) {
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
    if (!stockInfo || stockInfo.stock === null || stockInfo.stock === undefined) {
      return null;
    }

    // Si no hay bodega seleccionada o no tiene warehouses, usar total
    if (!this.bodegaSeleccionada || !stockInfo.warehouses || stockInfo.warehouses.length === 0) {
      return stockInfo.stock;
    }

    // Buscar la bodega específica en warehouses
    const warehouseMatch = stockInfo.warehouses.find((wh: any) => 
      // Buscar por fulfillmentId (UUID de Aliaddo)
      (this.bodegaSeleccionada.fulfillmentId && wh.id === this.bodegaSeleccionada.fulfillmentId) ||
      // O por código de bodega
      (wh.code && wh.code === this.bodegaSeleccionada.idBodega)
    );

    if (warehouseMatch) {
      // Encontró la bodega específica, usar su stock
      return warehouseMatch.stock ?? warehouseMatch.quantity ?? 0;
    }

    // Si no encuentra la bodega, usar el stock total como fallback
    // Esto puede pasar si la bodega no está configurada correctamente
    console.warn(`[Fulfillment] No se encontró bodega ${this.bodegaSeleccionada.idBodega} en warehouses, usando stock total`);
    return stockInfo.stock;
  }

  /**
   * Sincroniza el inventario de un producto con el fulfillment
   * Crea movimiento de ajuste si hay diferencia
   */
  syncProduct(producto: ProductoInventario): void {
    if (!this.fulfillmentEnabled || !this.fulfillmentProvider || !this.bodegaSeleccionada) {
      this.toastr.warning('Seleccione una bodega y verifique la configuración de fulfillment', 'Advertencia');
      return;
    }

    this.syncingProduct = producto.id;

    this.fulfillmentService.syncProductInventory(
      producto.id,
      this.bodegaSeleccionada.idBodega,
      this.fulfillmentProvider
    ).subscribe({
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
              'Sincronización completada'
            );
          } else {
            this.toastr.info('Sin diferencias encontradas', 'Sincronización completada');
          }
        } else {
          this.toastr.error(result.error || 'Error al sincronizar', 'Error');
        }
      },
      error: (error) => {
        this.syncingProduct = null;
        console.error('Error sincronizando producto:', error);
        this.toastr.error('Error al sincronizar con fulfillment', 'Error');
      }
    });
  }

  /**
   * Sincroniza todos los productos de la bodega con el fulfillment
   */
  syncBodegaCompleta(): void {
    if (!this.fulfillmentEnabled || !this.fulfillmentProvider || !this.bodegaSeleccionada) {
      this.toastr.warning('Seleccione una bodega y verifique la configuración de fulfillment', 'Advertencia');
      return;
    }

    // Confirmar antes de sincronizar
    Swal.fire({
      title: 'Sincronizar Bodega Completa',
      text: `¿Desea sincronizar todos los productos de la bodega "${this.bodegaSeleccionada.nombre}" con ${this.fulfillmentProviderName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, sincronizar',
      cancelButtonText: 'Cancelar'
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

    this.fulfillmentService.syncBodegaCompleta(
      this.bodegaSeleccionada.idBodega,
      this.fulfillmentProvider
    ).subscribe({
      next: (result) => {
        this.syncingBodega = false;

        if (result.success) {
          // Recargar inventario después de sincronizar
          this.obtenerProductosPorBodega(this.bodegaSeleccionada.idBodega);

          Swal.fire({
            title: 'Sincronización Completada',
            html: `
              <p><strong>${result.sincronizados}</strong> productos procesados</p>
              <p><strong>${result.conDiferencias}</strong> con diferencias ajustadas</p>
              ${result.errores > 0 ? `<p class="text-danger"><strong>${result.errores}</strong> errores</p>` : ''}
              <p class="text-muted">Duración: ${(result.duracionMs / 1000).toFixed(1)}s</p>
            `,
            icon: result.errores > 0 ? 'warning' : 'success'
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: result.error || 'Error al sincronizar la bodega',
            icon: 'error'
          });
        }
      },
      error: (error) => {
        this.syncingBodega = false;
        console.error('Error sincronizando bodega:', error);
        Swal.fire({
          title: 'Error',
          text: 'Error al sincronizar la bodega con fulfillment',
          icon: 'error'
        });
      }
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
    if (diferencia === null) return '';
    if (diferencia > 0) return 'text-success'; // Hay más en fulfillment
    if (diferencia < 0) return 'text-danger';  // Hay menos en fulfillment
    return 'text-muted'; // Sin diferencia
  }

  /**
   * Obtiene el badge para mostrar la diferencia
   */
  getDiferenciaBadgeClass(producto: ProductoInventario): string {
    const diferencia = this.getDiferencia(producto);
    if (diferencia === null) return '';
    if (diferencia > 0) return 'badge bg-warning text-dark'; // Más en fulfillment
    if (diferencia < 0) return 'badge bg-danger';            // Menos en fulfillment
    return 'badge bg-success';                                // Sin diferencia
  }

  /**
   * Verifica si hay productos con diferencias de stock
   */
  tieneProductosConDiferencia(): boolean {
    return this.rowsFiltradas.some(p =>
      p.diferencia !== null && p.diferencia !== undefined && p.diferencia !== 0
    );
  }

  /**
   * Cuenta los productos con diferencias de stock
   */
  contarProductosConDiferencia(): number {
    return this.rowsFiltradas.filter(p =>
      p.diferencia !== null && p.diferencia !== undefined && p.diferencia !== 0
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

  // ============== MÉTODOS DE ROW EXPANSION ==============

  /**
   * Maneja la expansión/colapso de una fila
   */
  onRowExpand(event: any): void {
    const producto = event.data as ProductoInventario;
    if (!producto.inventarioPorBodega || producto.inventarioPorBodega.length === 0) {
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
        producto.inventarioPorBodega = inventarios.map(inv => ({
          bodegaId: inv.bodegaId || inv.idBodega,
          bodegaNombre: inv.bodega?.nombre || this.getNombreBodega(inv.bodegaId || inv.idBodega),
          cantidad: inv.cantidad || 0,
          tipo: inv.bodega?.tipo || this.getTipoBodega(inv.bodegaId || inv.idBodega),
          origenFulfillment: inv.bodega?.origenFulfillment || this.bodegas.find(b => b.idBodega === inv.bodegaId)?.origenFulfillment
        }));

        // 2. Si hay fulfillment habilitado, cargar también las bodegas del fulfillment
        if (this.fulfillmentEnabled && this.fulfillmentProvider) {
          this.loadFulfillmentWarehouseStock(producto);
        } else {
          producto.detalleLoading = false;
        }
      },
      error: (error) => {
        console.error('Error cargando inventario detallado:', error);
        producto.detalleLoading = false;
        // Si falla, al menos mostrar la bodega actual
        if (producto.bodegaId) {
          producto.inventarioPorBodega = [{
            bodegaId: producto.bodegaId,
            bodegaNombre: producto.bodegaNombre || this.getNombreBodega(producto.bodegaId),
            cantidad: producto.cantidad || 0,
            tipo: this.getTipoBodega(producto.bodegaId),
            origenFulfillment: false
          }];
        }
      }
    });
  }

  /**
   * Carga el stock de las bodegas del fulfillment para un producto
   */
  loadFulfillmentWarehouseStock(producto: ProductoInventario): void {
    const productRef = producto.identificacion?.referencia || producto.id;

    this.fulfillmentService.getStock(this.fulfillmentProvider, productRef).subscribe({
      next: (result) => {
        if (result.success && result.warehouses) {
          producto.fulfillmentWarehouses = result.warehouses.map((wh: any) => ({
            id: wh.id || wh.warehouseId,
            name: wh.name || wh.warehouseName || 'Bodega Fulfillment',
            quantity: wh.quantity || wh.stock || 0
          }));
        }
        producto.detalleLoading = false;
      },
      error: (error) => {
        console.error('Error cargando stock de fulfillment:', error);
        producto.detalleLoading = false;
      }
    });
  }

  /**
   * Calcula el total de stock en bodegas de Katuq
   */
  getTotalStockKatuq(producto: ProductoInventario): number {
    if (!producto.inventarioPorBodega) return producto.cantidad || 0;
    return producto.inventarioPorBodega.reduce((total, b) => total + b.cantidad, 0);
  }

  /**
   * Calcula el total de stock en bodegas del fulfillment
   */
  getTotalStockFulfillment(producto: ProductoInventario): number {
    if (!producto.fulfillmentWarehouses) return producto.stockFulfillment || 0;
    return producto.fulfillmentWarehouses.reduce((total, wh) => total + wh.quantity, 0);
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
    if (!this.fulfillmentEnabled || !this.fulfillmentProvider || !this.bodegaSeleccionada) {
      this.toastr.warning('Seleccione una bodega y verifique la configuración de fulfillment', 'Advertencia');
      return;
    }

    // Confirmar antes de inicializar
    Swal.fire({
      title: 'Inicializar Inventario desde Fulfillment',
      html: `
        <p>Esta acción creará registros de inventario para los productos de <strong>${this.fulfillmentProviderName}</strong> 
        que ya existen en el catálogo de Katuq pero no tienen inventario en la bodega 
        <strong>"${this.bodegaSeleccionada.nombre}"</strong>.</p>
        <p class="text-muted small mt-3">
          <i class="pi pi-info-circle me-1"></i>
          Solo se procesarán productos que coincidan por SKU/Referencia.
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, inicializar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6'
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

    this.fulfillmentService.initInventoryFromFulfillment(
      this.bodegaSeleccionada.idBodega,
      this.fulfillmentProvider,
      { batchSize: 10 }
    ).subscribe({
      next: (result) => {
        this.initializingInventory = false;

        if (result.success) {
          // Recargar inventario después de inicializar
          this.obtenerProductosPorBodega(this.bodegaSeleccionada.idBodega);

          Swal.fire({
            title: 'Inicialización Completada',
            html: `
              <div class="text-start">
                <p><strong>${result.initialized}</strong> productos inicializados correctamente</p>
                <p><strong>${result.skipped}</strong> ya tenían inventario</p>
                ${result.notInCatalog > 0 ? `<p class="text-warning"><strong>${result.notInCatalog}</strong> no están en el catálogo de Katuq</p>` : ''}
                ${result.errors > 0 ? `<p class="text-danger"><strong>${result.errors}</strong> errores</p>` : ''}
                <p class="text-muted mt-2">Duración: ${(result.duracionMs / 1000).toFixed(1)}s</p>
              </div>
            `,
            icon: result.errors > 0 ? 'warning' : 'success'
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: result.error || 'Error al inicializar el inventario',
            icon: 'error'
          });
        }
      },
      error: (error) => {
        this.initializingInventory = false;
        console.error('Error inicializando inventario:', error);
        Swal.fire({
          title: 'Error',
          text: 'Error al inicializar el inventario desde fulfillment',
          icon: 'error'
        });
      }
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
      Swal.fire('Error', 'No se pudo obtener el nombre del comercio', 'error');
      return;
    }

    // Primera confirmación
    Swal.fire({
      title: '⚠️ Eliminación Masiva de Inventario',
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
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '⚠️ Continuar',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Segunda confirmación con input del nombre
        Swal.fire({
          title: 'Confirmación Final',
          html: `
            <p>Para confirmar, escriba el nombre del comercio:</p>
            <p class="fw-bold text-primary">"${companyName}"</p>
          `,
          input: 'text',
          inputPlaceholder: 'Escriba el nombre del comercio',
          inputAttributes: {
            autocapitalize: 'off'
          },
          showCancelButton: true,
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
          confirmButtonText: '🗑️ Eliminar TODO el Inventario',
          cancelButtonText: 'Cancelar',
          focusCancel: true,
          inputValidator: (value) => {
            if (!value) {
              return 'Debe escribir el nombre del comercio';
            }
            if (value !== companyName) {
              return 'El nombre no coincide. Intente de nuevo.';
            }
            return null;
          }
        }).then((confirmResult) => {
          if (confirmResult.isConfirmed && confirmResult.value === companyName) {
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
      title: 'Eliminando inventario...',
      html: 'Por favor espere. Esta operación puede tomar varios minutos dependiendo de la cantidad de registros.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    this.inventarioService.deleteAllInventoryByCompany(companyName).subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire({
            title: '✅ Limpieza Completada',
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
            icon: 'success',
            confirmButtonText: 'Entendido'
          });
          // Limpiar la vista
          this.rows = [];
          this.rowsFiltradas = [];
          this.productosSinFiltro = [];
          this.totalItems = 0;
        } else {
          Swal.fire('Error', response.error || 'Error desconocido', 'error');
        }
      },
      error: (error) => {
        console.error('Error eliminando inventario:', error);
        Swal.fire({
          title: 'Error',
          html: `
            <p>No se pudo eliminar el inventario.</p>
            <p class="text-danger">${error.error?.error || error.message || 'Error desconocido'}</p>
          `,
          icon: 'error'
        });
      }
    });
  }
}
