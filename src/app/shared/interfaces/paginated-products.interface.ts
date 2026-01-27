/**
 * Interfaces para paginacion server-side de productos
 * @since 2026.01.24 - Implementacion de paginacion optimizada
 * @author Claude Code Assistant
 */

import { Producto } from '../models/productos/Producto';

// ============================================================================
// INTERFACES DE PAGINACION
// ============================================================================

/**
 * Informacion de paginacion para navegacion
 */
export interface ProductPaginationInfo {
  /** Total de productos que coinciden con los filtros */
  totalItems: number;
  /** Numero de items por pagina */
  itemsPerPage: number;
  /** Pagina actual (1-indexed) */
  currentPage: number;
  /** Total de paginas disponibles */
  totalPages: number;
  /** Indica si hay pagina siguiente */
  hasNextPage: boolean;
  /** Indica si hay pagina anterior */
  hasPreviousPage: boolean;
  /** Cursor para paginacion basada en cursor (opcional, para infinite scroll) */
  nextCursor?: string | null;
  /** Cursor anterior para navegacion hacia atras */
  prevCursor?: string | null;
}

/**
 * Respuesta paginada del servidor para productos
 */
export interface PaginatedProductsResponse {
  /** Lista de productos de la pagina actual */
  products: Producto[];
  /** Informacion de paginacion */
  pagination: ProductPaginationInfo;
  /** Metricas opcionales de los productos */
  metrics?: ProductMetrics;
  /** Indica si la peticion fue exitosa */
  success: boolean;
  /** Mensaje de error si aplica */
  error?: string;
}

/**
 * Metricas agregadas de productos (opcional)
 */
export interface ProductMetrics {
  /** Total de productos en catalogo */
  totalProductos: number;
  /** Productos con stock disponible */
  conStock: number;
  /** Productos sin stock */
  sinStock: number;
  /** Productos con bajo stock (< 10 unidades) */
  bajoStock: number;
  /** Valor total del inventario mostrado */
  valorTotal?: number;
}

// ============================================================================
// INTERFACES DE REQUEST
// ============================================================================

/**
 * Parametros para solicitar productos paginados
 */
export interface PaginatedProductsRequest {
  /** Filtros de busqueda (compatibles con getProductsByFilter actual) */
  filter: ProductFilter;
  /** Numero de pagina (1-indexed) */
  page?: number;
  /** Cantidad de productos por pagina (max 100) */
  pageSize?: number;
  /** Campo por el cual ordenar */
  sortField?: ProductSortField;
  /** Direccion del ordenamiento: 1 = ASC, -1 = DESC */
  sortOrder?: 1 | -1;
  /** Cursor para paginacion basada en cursor (alternativa a page) */
  cursor?: string;
  /** Incluir metricas en la respuesta */
  includeMetrics?: boolean;
}

/**
 * Campos disponibles para ordenar productos
 */
export type ProductSortField =
  | 'crearProducto.titulo'       // Por nombre
  | 'precio.precioUnitarioConIva' // Por precio
  | 'disponibilidad.cantidadDisponible' // Por stock
  | 'identificacion.referencia'  // Por referencia/SKU
  | 'date_edit'                  // Por fecha de modificacion
  | 'rating';                    // Por rating

/**
 * Filtros de producto (extiende los filtros existentes)
 */
export interface ProductFilter {
  /** Ciudad de entrega */
  deliveryCity?: { label: string; value: string };
  /** Bodega seleccionada */
  bodega?: any;
  /** ID de la bodega */
  bodegaId?: string;
  /** Indica si es canal manual */
  isChannelManual?: boolean;
  /** Categoria de producto (serializada con flatted) */
  category?: string;
  /** Rango de precios [min, max] */
  priceRange?: [number, number];
  /** Generos seleccionados */
  genres?: { [key: string]: boolean };
  /** Ocasiones seleccionadas */
  occasions?: { [key: string]: boolean };
  /** Tiempos de entrega seleccionados */
  deliveryTimes?: string[];
  /** Filtros booleanos */
  isRecommended?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isOnSale?: boolean;
  hasFreeShipping?: boolean;
  /** Busqueda de texto libre */
  searchText?: string;
  /** Filtrar solo productos inventariables */
  soloInventariables?: boolean;
  /** Filtrar solo productos con stock > 0 */
  soloConStock?: boolean;
}

// ============================================================================
// INTERFACES PARA CACHE DE CLIENTE
// ============================================================================

/**
 * Entrada en cache para una pagina de productos
 */
export interface CachedProductPage {
  /** Productos de esta pagina */
  products: Producto[];
  /** Numero de pagina */
  page: number;
  /** Timestamp de cuando se cacheo */
  cachedAt: number;
  /** Hash de los filtros usados para obtener esta pagina */
  filterHash: string;
}

/**
 * Configuracion del cache de paginas
 */
export interface ProductCacheConfig {
  /** Tiempo de vida del cache en milisegundos (default: 5 minutos) */
  ttlMs: number;
  /** Numero maximo de paginas a mantener en cache */
  maxPages: number;
  /** Habilitar cache */
  enabled: boolean;
}

/**
 * Estado del cache de productos
 */
export interface ProductCacheState {
  /** Paginas cacheadas indexadas por numero de pagina */
  pages: Map<number, CachedProductPage>;
  /** Hash del filtro actual */
  currentFilterHash: string;
  /** Informacion de paginacion del servidor */
  paginationInfo: ProductPaginationInfo | null;
  /** Metricas de productos */
  metrics: ProductMetrics | null;
}

// ============================================================================
// INTERFACES PARA INFINITE SCROLL
// ============================================================================

/**
 * Estado del infinite scroll
 */
export interface InfiniteScrollState {
  /** Productos cargados hasta el momento */
  loadedProducts: Producto[];
  /** Indica si esta cargando mas productos */
  isLoading: boolean;
  /** Indica si hay mas productos por cargar */
  hasMore: boolean;
  /** Cursor para la siguiente pagina */
  nextCursor: string | null;
  /** Numero de pagina actual (para fallback sin cursor) */
  currentPage: number;
  /** Total de productos cargados */
  loadedCount: number;
  /** Total de productos disponibles */
  totalCount: number;
}

/**
 * Opciones para configurar infinite scroll
 */
export interface InfiniteScrollOptions {
  /** Numero de productos a cargar por lote */
  batchSize: number;
  /** Distancia en pixeles desde el fondo para disparar carga */
  threshold: number;
  /** Usar paginacion basada en cursor vs offset */
  useCursor: boolean;
  /** Debounce en ms para el evento de scroll */
  debounceMs: number;
}

// ============================================================================
// TIPOS UTILITARIOS
// ============================================================================

/**
 * Tipo para estrategia de paginacion
 */
export type PaginationStrategy = 'traditional' | 'infinite-scroll' | 'load-more';

/**
 * Evento emitido cuando cambia la pagina
 */
export interface PageChangeEvent {
  /** Pagina solicitada */
  page: number;
  /** Tamano de pagina */
  pageSize: number;
  /** Filtros actuales */
  filter: ProductFilter;
  /** Estrategia de paginacion */
  strategy: PaginationStrategy;
}

/**
 * Resultado de la carga de productos
 */
export interface ProductLoadResult {
  /** Productos cargados */
  products: Producto[];
  /** Indica si se cargo desde cache */
  fromCache: boolean;
  /** Tiempo de carga en ms */
  loadTimeMs: number;
  /** Informacion de paginacion */
  pagination: ProductPaginationInfo;
}
