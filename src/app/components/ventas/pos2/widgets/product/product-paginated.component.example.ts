/**
 * EJEMPLO: Componente POS Product adaptado para paginacion server-side
 *
 * Este archivo muestra como adaptar el componente existente para usar
 * paginacion del lado del servidor en lugar de cargar todos los productos.
 *
 * INSTRUCCIONES DE INTEGRACION:
 * 1. Copiar las propiedades marcadas con "// NUEVO" al componente original
 * 2. Inyectar ProductosPaginadosService en el constructor
 * 3. Reemplazar los metodos de carga y paginacion
 * 4. Agregar subscriptions para cleanup en ngOnDestroy
 *
 * @since 2026.01.24
 * @author Claude Code Assistant
 */

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// Servicios existentes
import { CartService } from '../../../../../shared/services/cart.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { InventarioService } from '../../../../../shared/services/inventarios/inventario.service';
import { ImageCacheService } from '../../../../../shared/services/image-cache.service';

// NUEVO: Servicio de productos paginados
import { ProductosPaginadosService } from '../../../../../shared/services/productos/productos-paginados.service';

// NUEVO: Interfaces de paginacion
import {
  ProductFilter,
  ProductPaginationInfo,
  ProductLoadResult,
  PaginationStrategy
} from '../../../../../shared/interfaces/paginated-products.interface';

@Component({
  selector: 'app-product-paginated',
  templateUrl: './product.component.html', // Usa el mismo template
  styleUrls: ['./product.component.scss'],
})
export class ProductPaginatedComponent implements OnInit, OnDestroy {
  @ViewChild('searchInputElement') searchInput: ElementRef | undefined;

  // ============================================================================
  // PROPIEDADES EXISTENTES (sin cambios)
  // ============================================================================

  public products: any[] = [];
  public filteredProduct: any[] = [];
  public paginatedProducts: any[] = [];
  public searchQuery: string = '';
  public isBarcodeMode: boolean = false;
  public imageLoaded: { [key: string]: boolean } = {};
  public defaultImage: string = 'assets/images/placeholders/product-not-found.svg';
  public filter = { search: '' };

  // Variables de paginacion (mantener para compatibilidad con template)
  public currentPage: number = 1;
  public itemsPerPage: number = 12;
  public totalItems: number = 0;
  public totalPages: number = 0;
  public pages: number[] = [];

  // ============================================================================
  // NUEVAS PROPIEDADES PARA PAGINACION SERVER-SIDE
  // ============================================================================

  /** Feature flag para habilitar/deshabilitar paginacion server-side */
  public isServerSidePagination: boolean = true;

  /** Indica si se esta cargando una pagina */
  public isLoadingPage: boolean = false;

  /** Informacion completa de paginacion del servidor */
  public paginationInfo: ProductPaginationInfo | null = null;

  /** Filtro actual aplicado */
  private currentFilter: ProductFilter = {};

  /** ID de la bodega actual */
  private currentBodegaId: string = '';

  /** Subject para busqueda con debounce */
  private searchSubject = new Subject<string>();

  /** Subject para limpieza de subscripciones */
  private destroy$ = new Subject<void>();

  /** Subscripciones activas */
  private subscriptions = new Subscription();

  /** Estrategia de paginacion actual */
  public paginationStrategy: PaginationStrategy = 'traditional';

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(
    public cartService: CartService,
    private maestroService: MaestroService,
    private inventarioService: InventarioService,
    private imageCacheService: ImageCacheService,
    // NUEVO: Inyectar servicio de productos paginados
    private productosPaginados: ProductosPaginadosService
  ) {}

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    // Recuperar modo barcode de localStorage
    const storedBarcodeMode = localStorage.getItem('isBarcodeMode');
    if (storedBarcodeMode) {
      this.isBarcodeMode = JSON.parse(storedBarcodeMode);
    }

    // Limpiar cache de imagenes antiguo
    this.imageCacheService.clearCache();

    // NUEVO: Configurar busqueda con debounce
    this.setupSearchDebounce();

    // NUEVO: Subscribirse a estados del servicio
    this.setupServiceSubscriptions();

    // NUEVO: Configurar cache
    this.productosPaginados.configureCashe({
      ttlMs: 5 * 60 * 1000, // 5 minutos
      maxPages: 10,
      enabled: true
    });
  }

  ngOnDestroy(): void {
    // NUEVO: Limpieza de subscripciones
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  // ============================================================================
  // NUEVOS METODOS: SETUP
  // ============================================================================

  /**
   * Configura el debounce para busqueda en tiempo real
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.executeSearch(searchTerm);
    });
  }

  /**
   * Se subscribe a los estados del servicio de productos
   */
  private setupServiceSubscriptions(): void {
    // Loading state
    const loadingSub = this.productosPaginados.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.isLoadingPage = loading;
    });

    // Error state
    const errorSub = this.productosPaginados.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      if (error) {
        console.error('[ProductComponent] Error:', error);
        // Aqui se podria mostrar un toast de error
      }
    });

    this.subscriptions.add(loadingSub);
    this.subscriptions.add(errorSub);
  }

  // ============================================================================
  // METODOS DE CARGA DE PRODUCTOS (MODIFICADOS)
  // ============================================================================

  /**
   * Punto de entrada principal para cargar productos
   * Decide entre paginacion server-side o cliente-side
   */
  obtenerProductos(bodegaId?: string): void {
    if (!bodegaId) {
      console.warn('POS Product: No se pueden cargar productos sin bodega asignada');
      this.clearProducts();
      return;
    }

    this.currentBodegaId = bodegaId;

    if (this.isServerSidePagination) {
      this.obtenerProductosServerSide(bodegaId, 1);
    } else {
      this.obtenerProductosPorBodega(bodegaId);
    }
  }

  /**
   * NUEVO: Carga productos usando paginacion server-side
   */
  private obtenerProductosServerSide(bodegaId: string, page: number = 1): void {
    // Construir filtro para el servidor
    this.currentFilter = {
      bodegaId: bodegaId,
      soloInventariables: false, // Incluir productos no inventariables
      searchText: this.filter.search || undefined
    };

    console.log(`[POS] Solicitando pagina ${page} con filtro:`, this.currentFilter);

    const sub = this.productosPaginados.goToPage(
      page,
      this.currentFilter,
      this.itemsPerPage
    ).subscribe({
      next: (result: ProductLoadResult) => {
        this.handleProductsLoaded(result, page);
      },
      error: (error) => {
        console.error('[POS] Error cargando productos:', error);
        this.handleLoadError();
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * NUEVO: Procesa los productos cargados del servidor
   */
  private handleProductsLoaded(result: ProductLoadResult, page: number): void {
    // Mapear productos con propiedades adicionales para UI
    this.paginatedProducts = result.products.map(product => ({
      ...product,
      cantidad: 1,
      imageLoaded: false
    }));

    // Actualizar estado de paginacion
    this.paginationInfo = result.pagination;
    this.currentPage = result.pagination.currentPage;
    this.totalPages = result.pagination.totalPages;
    this.totalItems = result.pagination.totalItems;

    // Generar array de numeros de pagina para el template
    this.updatePagesArray();

    // Precargar imagenes de la pagina actual
    this.precargarImagenes(this.paginatedProducts);

    // Precargar paginas adyacentes en background
    this.productosPaginados.preloadAdjacentPages(
      page,
      this.currentFilter,
      this.itemsPerPage
    );

    console.log(
      `[POS] Pagina ${page}/${this.totalPages} cargada:`,
      `${result.products.length} productos,`,
      `${result.fromCache ? 'desde cache' : 'desde servidor'},`,
      `${result.loadTimeMs.toFixed(0)}ms`
    );
  }

  /**
   * NUEVO: Maneja errores de carga
   */
  private handleLoadError(): void {
    this.paginatedProducts = [];
    this.products = [];
    this.totalItems = 0;
    this.totalPages = 0;
    this.pages = [];
  }

  /**
   * Metodo original para carga cliente-side (mantener para fallback)
   */
  obtenerProductosPorBodega(bodegaId: string): void {
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe(async (r: any) => {
      if (Array.isArray(r.productos) && r.productos.length > 0) {
        this.products = r.productos.map(itemInventario => ({
          ...itemInventario,
          ...itemInventario.producto,
          disponibilidad: {
            ...itemInventario?.producto?.disponibilidad,
            cantidadDisponible: itemInventario?.cantidad,
          },
          cantidad: 1,
          imageLoaded: false
        }));
        this.filteredProduct = this.products;
        this.updatePagination();
        await this.precargarImagenes(this.paginatedProducts);
      } else {
        this.clearProducts();
      }
    });
  }

  // ============================================================================
  // METODOS DE PAGINACION (MODIFICADOS)
  // ============================================================================

  /**
   * Navega a una pagina especifica
   * MODIFICADO: Usa server-side si esta habilitado
   */
  goToPage(page: number): void {
    // Validar rango
    if (page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;
    if (page === this.currentPage) return;

    // Evitar clicks durante carga
    if (this.isLoadingPage) {
      console.log('[POS] Navegacion bloqueada - carga en progreso');
      return;
    }

    if (this.isServerSidePagination && this.currentBodegaId) {
      this.obtenerProductosServerSide(this.currentBodegaId, page);
    } else {
      // Logica original cliente-side
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * Va a la pagina anterior
   */
  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  /**
   * Va a la pagina siguiente
   */
  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  /**
   * Actualiza el array de numeros de pagina para el template
   */
  private updatePagesArray(): void {
    this.pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pages.push(i);
    }
  }

  /**
   * Metodo original de paginacion cliente-side (mantener para fallback)
   */
  updatePagination(): void {
    this.totalItems = this.filteredProduct.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePagesArray();

    const startItem = (this.currentPage - 1) * this.itemsPerPage;
    const endItem = Math.min(startItem + this.itemsPerPage, this.totalItems);
    this.paginatedProducts = this.filteredProduct.slice(startItem, endItem);
  }

  // ============================================================================
  // METODOS DE BUSQUEDA (MODIFICADOS)
  // ============================================================================

  /**
   * Handler del input de busqueda
   * MODIFICADO: Usa debounce para server-side
   */
  searchStores(): void {
    this.filter.search = this.searchQuery.toLowerCase().replace(/'/g, '-');

    if (this.isServerSidePagination) {
      // Emitir al subject con debounce
      this.searchSubject.next(this.filter.search);
    } else {
      // Busqueda inmediata cliente-side
      this.filterDetails();
    }
  }

  /**
   * NUEVO: Ejecuta la busqueda en el servidor
   */
  private executeSearch(searchTerm: string): void {
    if (!this.currentBodegaId) return;

    // Limpiar cache porque los filtros cambiaron
    this.productosPaginados.clearCache();

    // Actualizar filtro y recargar desde pagina 1
    this.currentFilter.searchText = searchTerm || undefined;
    this.obtenerProductosServerSide(this.currentBodegaId, 1);
  }

  /**
   * Handler para Enter en el input de busqueda
   */
  onSearchEnter(): void {
    const trimmedQuery = this.searchQuery.trim().replace(/'/g, '-');

    if (this.isBarcodeMode && trimmedQuery !== '') {
      // Modo codigo de barras: buscar match exacto y agregar al carrito
      this.handleBarcodeSearch(trimmedQuery);
    } else {
      this.searchStores();
    }
  }

  /**
   * Busqueda por codigo de barras
   */
  private handleBarcodeSearch(barcode: string): void {
    // Buscar en productos cargados primero
    const match = this.paginatedProducts.find(p =>
      p.identificacion?.codigoBarras?.toLowerCase().includes(barcode.toLowerCase())
    );

    if (match) {
      this.addToCart(match);
      this.searchQuery = '';
      this.searchInput?.nativeElement?.focus();
    } else {
      // Si no hay match local, buscar en servidor
      // El servidor deberia tener un endpoint especifico para barcode
      this.searchStores();
    }
  }

  /**
   * Metodo original de filtrado cliente-side
   */
  filterDetails(): void {
    if (!this.filter.search || this.filter.search === '') {
      this.filteredProduct = [...this.products];
    } else {
      const searchTerms = this.normalizeText(this.filter.search).split(' ');

      this.filteredProduct = this.products.filter(product => {
        const searchFields = [
          this.normalizeText(product.crearProducto?.titulo),
          this.normalizeText(product.crearProducto?.descripcion),
          this.normalizeText(product.identificacion?.referencia),
          this.normalizeText(product.exposicion?.etiquetas?.join(', ')),
        ];

        return searchTerms.every(term =>
          searchFields.some(field => field && field.includes(term))
        );
      });
    }

    this.currentPage = 1;
    this.updatePagination();
  }

  // ============================================================================
  // METODOS UTILITARIOS (SIN CAMBIOS)
  // ============================================================================

  private clearProducts(): void {
    this.products = [];
    this.filteredProduct = [];
    this.paginatedProducts = [];
    this.totalItems = 0;
    this.totalPages = 0;
    this.pages = [];
  }

  private normalizeText(input: string | object | undefined | null): string {
    if (input === undefined || input === null) return '';
    const text = typeof input === 'object' ? JSON.stringify(input) : input.toString();
    return text.replace(/<[^>]*>/g, '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  updateQuantity(value: number, product: any): void {
    if (!product.disponibilidad?.inventariable) {
      if (value === 1) product.cantidad += 1;
      else if (value === -1 && product.cantidad > 1) product.cantidad -= 1;
      return;
    }

    const stockDisponible = product.disponibilidad?.cantidadDisponible ?? 0;

    if (value === 1 && product.cantidad < stockDisponible) {
      product.cantidad += 1;
    } else if (value === -1 && product.cantidad > 1) {
      product.cantidad -= 1;
    }
  }

  addToCart(product: any): void {
    if (!product.disponibilidad?.inventariable) {
      this.cartService.posAddToCart(product);
      return;
    }

    const stockDisponible = product.disponibilidad?.cantidadDisponible ?? 0;
    if (stockDisponible >= product.cantidad) {
      this.cartService.posAddToCart(product);
    } else {
      console.warn(`No hay suficiente stock para ${product.crearProducto?.titulo}`);
    }
  }

  onBarcodeModeChange(): void {
    localStorage.setItem('isBarcodeMode', JSON.stringify(this.isBarcodeMode));
  }

  getProductImageUrl(product: any): string {
    if (product?.crearProducto?.imagenesPrincipales?.[0]?.urls) {
      return product.crearProducto.imagenesPrincipales[0].urls;
    }
    return this.defaultImage;
  }

  async precargarImagenes(productos: any[]): Promise<void> {
    for (const producto of productos) {
      const imageUrl = this.getProductImageUrl(producto);
      if (imageUrl !== this.defaultImage) {
        try {
          const cachedDataUrl = await this.imageCacheService.getCachedImage(imageUrl);
          if (cachedDataUrl) {
            const img = new Image();
            img.src = cachedDataUrl;
            img.onload = () => {
              this.imageLoaded[producto._id] = true;
            };
          }
        } catch (error) {
          console.error('Error al precargar imagen:', error);
        }
      }
    }
  }

  handleImageLoad(event: any, productId: string): void {
    this.imageLoaded[productId] = true;
  }

  handleImageError(event: any): void {
    event.target.src = this.defaultImage;
  }

  // ============================================================================
  // NUEVOS METODOS: UTILIDADES PUBLICAS
  // ============================================================================

  /**
   * Fuerza recarga de productos (ignora cache)
   */
  forceReload(): void {
    if (this.currentBodegaId) {
      this.productosPaginados.clearCache();
      this.obtenerProductosServerSide(this.currentBodegaId, this.currentPage);
    }
  }

  /**
   * Cambia entre paginacion server-side y cliente-side
   */
  togglePaginationMode(): void {
    this.isServerSidePagination = !this.isServerSidePagination;
    console.log(`[POS] Modo paginacion: ${this.isServerSidePagination ? 'Server-side' : 'Cliente-side'}`);

    if (this.currentBodegaId) {
      this.obtenerProductos(this.currentBodegaId);
    }
  }

  /**
   * Obtiene estadisticas del cache para debugging
   */
  getCacheStats(): any {
    return this.productosPaginados.getCacheStats();
  }
}
