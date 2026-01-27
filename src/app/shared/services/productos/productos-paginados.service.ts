/**
 * Servicio de productos con paginacion server-side
 * Maneja la comunicacion con el backend y cache local de paginas
 *
 * @since 2026.01.24
 * @author Claude Code Assistant
 */

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Producto } from '../../models/productos/Producto';
import {
  PaginatedProductsResponse,
  PaginatedProductsRequest,
  ProductPaginationInfo,
  ProductFilter,
  ProductCacheConfig,
  CachedProductPage,
  ProductCacheState,
  InfiniteScrollState,
  InfiniteScrollOptions,
  ProductLoadResult,
  ProductMetrics,
  ProductSortField
} from '../../interfaces/paginated-products.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductosPaginadosService implements OnDestroy {
  private readonly apiUrl = environment.urlApi + '/v1';
  private readonly destroy$ = new Subject<void>();

  // ============================================================================
  // CONFIGURACION DE CACHE
  // ============================================================================

  private readonly defaultCacheConfig: ProductCacheConfig = {
    ttlMs: 5 * 60 * 1000, // 5 minutos
    maxPages: 10,
    enabled: true
  };

  private cacheConfig: ProductCacheConfig = { ...this.defaultCacheConfig };

  // ============================================================================
  // ESTADO DEL CACHE
  // ============================================================================

  private cacheState: ProductCacheState = {
    pages: new Map<number, CachedProductPage>(),
    currentFilterHash: '',
    paginationInfo: null,
    metrics: null
  };

  // ============================================================================
  // OBSERVABLES REACTIVOS
  // ============================================================================

  /** Estado de carga */
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  /** Productos de la pagina actual */
  private productsSubject = new BehaviorSubject<Producto[]>([]);
  public products$ = this.productsSubject.asObservable();

  /** Informacion de paginacion */
  private paginationSubject = new BehaviorSubject<ProductPaginationInfo | null>(null);
  public pagination$ = this.paginationSubject.asObservable();

  /** Metricas de productos */
  private metricsSubject = new BehaviorSubject<ProductMetrics | null>(null);
  public metrics$ = this.metricsSubject.asObservable();

  /** Estado del infinite scroll */
  private infiniteScrollSubject = new BehaviorSubject<InfiniteScrollState>({
    loadedProducts: [],
    isLoading: false,
    hasMore: true,
    nextCursor: null,
    currentPage: 0,
    loadedCount: 0,
    totalCount: 0
  });
  public infiniteScroll$ = this.infiniteScrollSubject.asObservable();

  /** Error actual */
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // METODOS PRINCIPALES DE PAGINACION
  // ============================================================================

  /**
   * Obtiene productos paginados desde el servidor
   * Implementa cache local para evitar peticiones repetidas
   *
   * @param request Parametros de la peticion
   * @returns Observable con la respuesta paginada
   */
  getProductsPaginated(request: PaginatedProductsRequest): Observable<ProductLoadResult> {
    const startTime = performance.now();
    const page = request.page || 1;
    const pageSize = Math.min(request.pageSize || 12, 100); // Max 100 por pagina
    const filterHash = this.generateFilterHash(request.filter);

    // Verificar si el filtro cambio - si cambio, limpiar cache
    if (filterHash !== this.cacheState.currentFilterHash) {
      this.clearCache();
      this.cacheState.currentFilterHash = filterHash;
    }

    // Intentar obtener de cache
    if (this.cacheConfig.enabled) {
      const cachedPage = this.getFromCache(page, filterHash);
      if (cachedPage) {
        const loadTime = performance.now() - startTime;
        console.log(`[ProductosPaginados] Cache HIT - Pagina ${page} en ${loadTime.toFixed(2)}ms`);

        this.productsSubject.next(cachedPage.products);
        if (this.cacheState.paginationInfo) {
          this.paginationSubject.next({
            ...this.cacheState.paginationInfo,
            currentPage: page
          });
        }

        return of({
          products: cachedPage.products,
          fromCache: true,
          loadTimeMs: loadTime,
          pagination: this.cacheState.paginationInfo!
        });
      }
    }

    // Cargar desde servidor
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.fetchFromServer(request, page, pageSize).pipe(
      map(response => {
        const loadTime = performance.now() - startTime;
        console.log(`[ProductosPaginados] Server fetch - Pagina ${page} en ${loadTime.toFixed(2)}ms`);

        // Guardar en cache
        if (this.cacheConfig.enabled && response.success) {
          this.saveToCache(page, response.products, filterHash);
          this.cacheState.paginationInfo = response.pagination;
          this.cacheState.metrics = response.metrics || null;
        }

        // Actualizar subjects
        this.productsSubject.next(response.products);
        this.paginationSubject.next(response.pagination);
        if (response.metrics) {
          this.metricsSubject.next(response.metrics);
        }

        return {
          products: response.products,
          fromCache: false,
          loadTimeMs: loadTime,
          pagination: response.pagination
        };
      }),
      catchError(error => {
        console.error('[ProductosPaginados] Error al cargar productos:', error);
        this.errorSubject.next(error.message || 'Error al cargar productos');
        return throwError(() => error);
      }),
      finalize(() => {
        this.loadingSubject.next(false);
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Navega a una pagina especifica
   * Wrapper conveniente para getProductsPaginated
   */
  goToPage(page: number, filter: ProductFilter, pageSize: number = 12): Observable<ProductLoadResult> {
    return this.getProductsPaginated({
      filter,
      page,
      pageSize,
      includeMetrics: page === 1 // Solo incluir metricas en primera pagina
    });
  }

  /**
   * Navega a la pagina siguiente
   */
  nextPage(filter: ProductFilter, pageSize: number = 12): Observable<ProductLoadResult> {
    const currentPagination = this.paginationSubject.value;
    if (!currentPagination || !currentPagination.hasNextPage) {
      return throwError(() => new Error('No hay pagina siguiente'));
    }
    return this.goToPage(currentPagination.currentPage + 1, filter, pageSize);
  }

  /**
   * Navega a la pagina anterior
   */
  previousPage(filter: ProductFilter, pageSize: number = 12): Observable<ProductLoadResult> {
    const currentPagination = this.paginationSubject.value;
    if (!currentPagination || !currentPagination.hasPreviousPage) {
      return throwError(() => new Error('No hay pagina anterior'));
    }
    return this.goToPage(currentPagination.currentPage - 1, filter, pageSize);
  }

  // ============================================================================
  // INFINITE SCROLL
  // ============================================================================

  /**
   * Inicializa el infinite scroll con la primera carga
   */
  initInfiniteScroll(filter: ProductFilter, options?: Partial<InfiniteScrollOptions>): Observable<ProductLoadResult> {
    const batchSize = options?.batchSize || 20;

    // Reset del estado
    this.infiniteScrollSubject.next({
      loadedProducts: [],
      isLoading: true,
      hasMore: true,
      nextCursor: null,
      currentPage: 0,
      loadedCount: 0,
      totalCount: 0
    });

    return this.loadMoreProducts(filter, batchSize);
  }

  /**
   * Carga mas productos para infinite scroll
   */
  loadMoreProducts(filter: ProductFilter, batchSize: number = 20): Observable<ProductLoadResult> {
    const currentState = this.infiniteScrollSubject.value;

    if (currentState.isLoading || !currentState.hasMore) {
      return of({
        products: [],
        fromCache: false,
        loadTimeMs: 0,
        pagination: this.cacheState.paginationInfo!
      });
    }

    const nextPage = currentState.currentPage + 1;

    // Actualizar estado a loading
    this.infiniteScrollSubject.next({
      ...currentState,
      isLoading: true
    });

    return this.getProductsPaginated({
      filter,
      page: nextPage,
      pageSize: batchSize,
      cursor: currentState.nextCursor || undefined,
      includeMetrics: nextPage === 1
    }).pipe(
      tap(result => {
        const newProducts = [...currentState.loadedProducts, ...result.products];

        this.infiniteScrollSubject.next({
          loadedProducts: newProducts,
          isLoading: false,
          hasMore: result.pagination.hasNextPage,
          nextCursor: result.pagination.nextCursor || null,
          currentPage: nextPage,
          loadedCount: newProducts.length,
          totalCount: result.pagination.totalItems
        });
      }),
      catchError(error => {
        this.infiniteScrollSubject.next({
          ...currentState,
          isLoading: false
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Resetea el infinite scroll
   */
  resetInfiniteScroll(): void {
    this.infiniteScrollSubject.next({
      loadedProducts: [],
      isLoading: false,
      hasMore: true,
      nextCursor: null,
      currentPage: 0,
      loadedCount: 0,
      totalCount: 0
    });
  }

  // ============================================================================
  // METODOS DE BUSQUEDA CON DEBOUNCE
  // ============================================================================

  /**
   * Busca productos con debounce para evitar multiples peticiones
   * Ideal para input de busqueda en tiempo real
   */
  searchWithDebounce(
    searchTerm$: Observable<string>,
    filter: ProductFilter,
    pageSize: number = 12,
    debounceMs: number = 300
  ): Observable<ProductLoadResult> {
    return searchTerm$.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged(),
      tap(term => {
        // Limpiar cache cuando cambia la busqueda
        this.clearCache();
      }),
      map(term => ({
        ...filter,
        searchText: term
      })),
      tap(() => this.loadingSubject.next(true)),
      map(updatedFilter => this.getProductsPaginated({
        filter: updatedFilter,
        page: 1,
        pageSize,
        includeMetrics: true
      })),
      // Aplanar el observable anidado
      map(obs => obs),
      takeUntil(this.destroy$)
    ) as any; // TypeScript tiene problemas con el tipo aqui
  }

  // ============================================================================
  // GESTION DE CACHE
  // ============================================================================

  /**
   * Configura el cache de productos
   */
  configureCashe(config: Partial<ProductCacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
  }

  /**
   * Limpia todo el cache
   */
  clearCache(): void {
    this.cacheState.pages.clear();
    this.cacheState.paginationInfo = null;
    this.cacheState.metrics = null;
    console.log('[ProductosPaginados] Cache limpiado');
  }

  /**
   * Obtiene una pagina del cache si existe y no ha expirado
   */
  private getFromCache(page: number, filterHash: string): CachedProductPage | null {
    const cached = this.cacheState.pages.get(page);

    if (!cached) {
      return null;
    }

    // Verificar que el filtro coincide
    if (cached.filterHash !== filterHash) {
      return null;
    }

    // Verificar TTL
    const age = Date.now() - cached.cachedAt;
    if (age > this.cacheConfig.ttlMs) {
      this.cacheState.pages.delete(page);
      return null;
    }

    return cached;
  }

  /**
   * Guarda una pagina en cache
   */
  private saveToCache(page: number, products: Producto[], filterHash: string): void {
    // Limpiar paginas antiguas si excedemos el maximo
    if (this.cacheState.pages.size >= this.cacheConfig.maxPages) {
      const oldestPage = this.findOldestCachedPage();
      if (oldestPage !== null) {
        this.cacheState.pages.delete(oldestPage);
      }
    }

    this.cacheState.pages.set(page, {
      products,
      page,
      cachedAt: Date.now(),
      filterHash
    });
  }

  /**
   * Encuentra la pagina mas antigua en cache
   */
  private findOldestCachedPage(): number | null {
    let oldest: number | null = null;
    let oldestTime = Infinity;

    this.cacheState.pages.forEach((cached, page) => {
      if (cached.cachedAt < oldestTime) {
        oldestTime = cached.cachedAt;
        oldest = page;
      }
    });

    return oldest;
  }

  /**
   * Genera un hash unico para un filtro
   * Se usa para detectar cuando el filtro cambia y limpiar cache
   */
  private generateFilterHash(filter: ProductFilter): string {
    const relevantFields = {
      deliveryCity: filter.deliveryCity?.value,
      bodegaId: filter.bodegaId,
      category: filter.category,
      priceRange: filter.priceRange,
      searchText: filter.searchText,
      soloConStock: filter.soloConStock,
      genres: filter.genres ? Object.keys(filter.genres).sort().join(',') : '',
      occasions: filter.occasions ? Object.keys(filter.occasions).sort().join(',') : ''
    };

    return JSON.stringify(relevantFields);
  }

  // ============================================================================
  // COMUNICACION CON SERVIDOR
  // ============================================================================

  /**
   * Realiza la peticion al servidor
   * El endpoint debe implementar paginacion server-side
   */
  private fetchFromServer(
    request: PaginatedProductsRequest,
    page: number,
    pageSize: number
  ): Observable<PaginatedProductsResponse> {
    // Construir query params para paginacion
    let queryParams = `page=${page}&pageSize=${pageSize}`;

    if (request.sortField) {
      queryParams += `&sortField=${encodeURIComponent(request.sortField)}`;
      queryParams += `&sortOrder=${request.sortOrder || 1}`;
    }

    if (request.cursor) {
      queryParams += `&cursor=${encodeURIComponent(request.cursor)}`;
    }

    if (request.includeMetrics) {
      queryParams += `&includeMetrics=true`;
    }

    const endpoint = `/v1/productos/all/filter/paginated?${queryParams}`;

    return this.http.post<PaginatedProductsResponse>(
      `${this.apiUrl.replace('/v1', '')}${endpoint}`,
      request.filter
    ).pipe(
      map(response => {
        // Asegurar que la respuesta tenga la estructura correcta
        if (!response.pagination) {
          // Fallback para respuesta legacy (array de productos)
          const products = (response as any) as Producto[];
          return {
            products: products.slice((page - 1) * pageSize, page * pageSize),
            pagination: {
              totalItems: products.length,
              itemsPerPage: pageSize,
              currentPage: page,
              totalPages: Math.ceil(products.length / pageSize),
              hasNextPage: page * pageSize < products.length,
              hasPreviousPage: page > 1,
              nextCursor: null,
              prevCursor: null
            },
            success: true
          } as PaginatedProductsResponse;
        }
        return response;
      })
    );
  }

  // ============================================================================
  // METODOS UTILITARIOS
  // ============================================================================

  /**
   * Precarga las paginas adyacentes para navegacion mas rapida
   */
  preloadAdjacentPages(currentPage: number, filter: ProductFilter, pageSize: number = 12): void {
    const pagesToPreload = [currentPage - 1, currentPage + 1].filter(p => p > 0);

    pagesToPreload.forEach(page => {
      const filterHash = this.generateFilterHash(filter);
      if (!this.getFromCache(page, filterHash)) {
        // Cargar en background sin afectar UI
        this.getProductsPaginated({
          filter,
          page,
          pageSize,
          includeMetrics: false
        }).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => console.log(`[ProductosPaginados] Precargada pagina ${page}`),
          error: () => {} // Ignorar errores de precarga
        });
      }
    });
  }

  /**
   * Obtiene el estado actual del cache para debugging
   */
  getCacheStats(): { pages: number; ttlMs: number; enabled: boolean; currentFilter: string } {
    return {
      pages: this.cacheState.pages.size,
      ttlMs: this.cacheConfig.ttlMs,
      enabled: this.cacheConfig.enabled,
      currentFilter: this.cacheState.currentFilterHash.substring(0, 50) + '...'
    };
  }

  /**
   * Fuerza recarga de la pagina actual (ignora cache)
   */
  forceReload(filter: ProductFilter, page: number = 1, pageSize: number = 12): Observable<ProductLoadResult> {
    this.clearCache();
    return this.goToPage(page, filter, pageSize);
  }
}
