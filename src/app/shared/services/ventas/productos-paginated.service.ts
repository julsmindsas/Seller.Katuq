/**
 * =============================================================================
 * PRODUCTOS PAGINATED SERVICE
 * =============================================================================
 *
 * Servicio especializado para consumir la API de productos con paginacion
 * basada en cursores.
 *
 * @module services/productos-paginated
 * @version 1.0.0
 *
 * ARQUITECTURA:
 * Este servicio implementa el patron de paginacion por cursores para
 * optimizar el consumo de la API de productos en catalogos grandes (500-5000).
 *
 * VENTAJAS:
 * - Rendimiento constante O(1) sin importar la pagina
 * - Menor consumo de memoria (solo carga pagina actual)
 * - Resultados consistentes durante navegacion
 * - Compatible con scroll infinito y paginacion tradicional
 *
 * =============================================================================
 */

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { BaseService } from '../base/base-service.service';
import { Producto } from '../../models/producto';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Estructura de respuesta paginada del backend
 */
export interface PaginatedProductsResponse {
  success: boolean;
  products: Producto[];
  pagination: ProductPagination;
  meta: ProductPaginationMeta;
}

/**
 * Metadata de paginacion
 */
export interface ProductPagination {
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextCursor: string | null;
  currentPage: number;
  totalItems?: number;
  totalPages?: number;
}

/**
 * Metadata adicional de la respuesta
 */
export interface ProductPaginationMeta {
  duration: string;
  fromCache: boolean;
  filtersApplied: {
    firestoreFilters: boolean;
    inMemoryFilters: boolean;
  };
}

/**
 * Filtros disponibles para productos
 */
export interface ProductFilter {
  bodega?: {
    idBodega: string;
    nombreBodega?: string;
  };
  deliveryCity?: {
    label: string;
    value?: string;
  };
  deliveryTimes?: string[];
  priceRange?: [number, number];
  isRecommended?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isOnSale?: boolean;
  hasFreeShipping?: boolean;
  onlyPOS?: boolean;
  genres?: Record<string, boolean>;
  occasions?: Record<string, boolean>;
  searchTerm?: string;
  sortBy?: 'fecha' | 'precio' | 'nombre' | 'stock' | 'referencia';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Estado interno del servicio para scroll infinito
 */
interface PaginationState {
  products: Producto[];
  currentFilter: ProductFilter;
  nextCursor: string | null;
  hasMore: boolean;
  totalItems: number | null;
  currentPage: number;
  loading: boolean;
}

// =============================================================================
// SERVICIO
// =============================================================================

@Injectable({
  providedIn: 'root'
})
export class ProductosPaginatedService extends BaseService {

  // Estado reactivo para componentes con scroll infinito
  private stateSubject = new BehaviorSubject<PaginationState>({
    products: [],
    currentFilter: {},
    nextCursor: null,
    hasMore: true,
    totalItems: null,
    currentPage: 0,
    loading: false
  });

  public state$ = this.stateSubject.asObservable();

  // ==========================================================================
  // METODOS PRINCIPALES
  // ==========================================================================

  /**
   * Obtiene productos con paginacion por cursores
   *
   * @description
   * Metodo principal para obtener productos paginados. Utiliza cursores
   * opacos para navegacion eficiente.
   *
   * @param filter - Filtros a aplicar
   * @param pageSize - Cantidad de productos por pagina (1-100, default: 20)
   * @param cursor - Cursor para obtener siguiente pagina
   * @param includeCount - Si incluir conteo total (default: true para primera pagina)
   *
   * @returns Observable con respuesta paginada
   *
   * @example
   * // Primera pagina
   * this.productosService.getProductsPaginated(filter, 20).subscribe(res => {
   *   this.products = res.products;
   *   this.nextCursor = res.pagination.nextCursor;
   * });
   *
   * // Segunda pagina
   * this.productosService.getProductsPaginated(filter, 20, this.nextCursor).subscribe(...);
   */
  getProductsPaginated(
    filter: ProductFilter,
    pageSize: number = 20,
    cursor?: string,
    includeCount: boolean = true
  ): Observable<PaginatedProductsResponse> {
    // Construir query params
    const params = new URLSearchParams();
    params.set('pageSize', Math.min(Math.max(pageSize, 1), 100).toString());
    params.set('includeCount', includeCount.toString());

    if (cursor) {
      params.set('cursor', cursor);
    }

    const endpoint = `/v1/productos/all/filter/paginated?${params.toString()}`;

    return this.post<PaginatedProductsResponse>(endpoint, filter).pipe(
      tap(response => {
        console.log('[ProductosPaginated] Response:', {
          products: response.products.length,
          hasNext: response.pagination.hasNext,
          totalItems: response.pagination.totalItems,
          duration: response.meta.duration
        });
      }),
      catchError(error => {
        console.error('[ProductosPaginated] Error:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene solo el conteo de productos filtrados
   *
   * @description
   * Util para mostrar totales en UI sin cargar productos.
   * Utiliza cache de 5 minutos en el backend.
   *
   * @param filter - Filtros a aplicar
   * @returns Observable con conteo y estado de cache
   */
  getProductsCount(filter: ProductFilter): Observable<{ count: number; cached: boolean }> {
    return this.post<{ success: boolean; count: number; cached: boolean }>(
      '/v1/productos/all/filter/count',
      filter
    ).pipe(
      map(res => ({
        count: res.count,
        cached: res.cached
      }))
    );
  }

  /**
   * Invalida el cache de paginacion
   *
   * @description
   * Llamar despues de crear, editar o eliminar productos para
   * asegurar datos frescos en siguientes consultas.
   *
   * NOTA: El backend invalida automaticamente al modificar productos,
   * pero este metodo permite forzar la invalidacion desde el frontend.
   */
  invalidateCache(): Observable<void> {
    return this.post<{ success: boolean }>('/v1/productos/cache/invalidate', {}).pipe(
      map(() => void 0)
    );
  }

  // ==========================================================================
  // METODOS PARA SCROLL INFINITO
  // ==========================================================================

  /**
   * Inicializa el estado con un nuevo filtro
   *
   * @description
   * Usar cuando cambian los filtros para reiniciar la paginacion.
   *
   * @param filter - Nuevos filtros a aplicar
   * @param pageSize - Tamanio de pagina
   */
  initializeWithFilter(filter: ProductFilter, pageSize: number = 20): void {
    // Reset estado
    this.stateSubject.next({
      products: [],
      currentFilter: filter,
      nextCursor: null,
      hasMore: true,
      totalItems: null,
      currentPage: 0,
      loading: true
    });

    // Cargar primera pagina
    this.getProductsPaginated(filter, pageSize, undefined, true).subscribe({
      next: (response) => {
        this.stateSubject.next({
          products: response.products,
          currentFilter: filter,
          nextCursor: response.pagination.nextCursor,
          hasMore: response.pagination.hasNext,
          totalItems: response.pagination.totalItems || null,
          currentPage: 1,
          loading: false
        });
      },
      error: (error) => {
        console.error('[ProductosPaginated] Error en inicializacion:', error);
        const currentState = this.stateSubject.value;
        this.stateSubject.next({
          ...currentState,
          loading: false,
          hasMore: false
        });
      }
    });
  }

  /**
   * Carga la siguiente pagina de productos
   *
   * @description
   * Usar en scroll infinito cuando el usuario llega al final de la lista.
   *
   * @param pageSize - Tamanio de pagina
   */
  loadNextPage(pageSize: number = 20): void {
    const currentState = this.stateSubject.value;

    // Validar estado
    if (currentState.loading || !currentState.hasMore || !currentState.nextCursor) {
      return;
    }

    // Marcar como cargando
    this.stateSubject.next({
      ...currentState,
      loading: true
    });

    // Cargar siguiente pagina
    this.getProductsPaginated(
      currentState.currentFilter,
      pageSize,
      currentState.nextCursor,
      false // No necesitamos count en paginas siguientes
    ).subscribe({
      next: (response) => {
        this.stateSubject.next({
          ...currentState,
          products: [...currentState.products, ...response.products],
          nextCursor: response.pagination.nextCursor,
          hasMore: response.pagination.hasNext,
          currentPage: currentState.currentPage + 1,
          loading: false
        });
      },
      error: (error) => {
        console.error('[ProductosPaginated] Error cargando siguiente pagina:', error);
        this.stateSubject.next({
          ...currentState,
          loading: false
        });
      }
    });
  }

  /**
   * Resetea el estado del servicio
   */
  reset(): void {
    this.stateSubject.next({
      products: [],
      currentFilter: {},
      nextCursor: null,
      hasMore: true,
      totalItems: null,
      currentPage: 0,
      loading: false
    });
  }

  // ==========================================================================
  // GETTERS PARA ESTADO ACTUAL
  // ==========================================================================

  get products(): Producto[] {
    return this.stateSubject.value.products;
  }

  get isLoading(): boolean {
    return this.stateSubject.value.loading;
  }

  get hasMore(): boolean {
    return this.stateSubject.value.hasMore;
  }

  get totalItems(): number | null {
    return this.stateSubject.value.totalItems;
  }

  get currentPage(): number {
    return this.stateSubject.value.currentPage;
  }

  // ==========================================================================
  // METODOS UTILITARIOS
  // ==========================================================================

  /**
   * Construye filtros para venta asistida
   *
   * @param bodegaId - ID de la bodega
   * @param ciudadEntrega - Ciudad de entrega
   * @param searchTerm - Termino de busqueda opcional
   */
  buildVentaAsistidaFilter(
    bodegaId?: string,
    ciudadEntrega?: string,
    searchTerm?: string
  ): ProductFilter {
    const filter: ProductFilter = {};

    if (bodegaId) {
      filter.bodega = { idBodega: bodegaId };
    }

    if (ciudadEntrega) {
      filter.deliveryCity = { label: ciudadEntrega };
    }

    if (searchTerm) {
      filter.searchTerm = searchTerm;
    }

    return filter;
  }

  /**
   * Construye filtros para POS
   *
   * @param bodegaId - ID de la bodega del POS
   */
  buildPOSFilter(bodegaId: string): ProductFilter {
    return {
      bodega: { idBodega: bodegaId },
      onlyPOS: true,
      sortBy: 'nombre',
      sortDirection: 'asc'
    };
  }
}
