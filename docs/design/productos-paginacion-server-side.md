# Diseno: Paginacion Server-Side de Productos

## Resumen Ejecutivo

Este documento describe la implementacion de paginacion server-side para productos en Katuq Seller, optimizando el rendimiento de los componentes POS y E-commerce que actualmente cargan todos los productos en memoria.

## Problema Actual

### Codigo Afectado
- `pos2/widgets/product/product.component.ts` - POS con 12 productos por pagina (cliente-side)
- `catalogo/ecomerce-products/ecomerce-products.component.ts` - E-commerce con 8 por pagina (cliente-side)
- `ventas.service.ts:96-98` - `getProductsByFilter()` sin paginacion

### Impacto
1. **Memoria**: Carga todos los productos (~100-1000+) en memoria del navegador
2. **Red**: Transferencia innecesaria de datos no visibles
3. **UX**: Tiempo de carga inicial alto, especialmente en redes lentas
4. **Escalabilidad**: No escala con catalogos grandes

---

## Solucion Propuesta

### 1. Nuevas Interfaces (CREADAS)

Archivo: `src/app/shared/interfaces/paginated-products.interface.ts`

```typescript
// Respuesta paginada del servidor
interface PaginatedProductsResponse {
  products: Producto[];
  pagination: ProductPaginationInfo;
  metrics?: ProductMetrics;
  success: boolean;
}

// Informacion de paginacion
interface ProductPaginationInfo {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string | null;  // Para infinite scroll
}

// Request con paginacion
interface PaginatedProductsRequest {
  filter: ProductFilter;
  page?: number;
  pageSize?: number;
  sortField?: ProductSortField;
  sortOrder?: 1 | -1;
  cursor?: string;
  includeMetrics?: boolean;
}
```

### 2. Nuevo Servicio (CREADO)

Archivo: `src/app/shared/services/productos/productos-paginados.service.ts`

**Caracteristicas:**
- Cache local de paginas con TTL configurable (default: 5 min)
- Soporte para paginacion tradicional e infinite scroll
- Precarga de paginas adyacentes
- Deteccion automatica de cambio de filtros
- Observables reactivos para estado de carga

---

## Modificaciones Requeridas

### 3. Modificar ventas.service.ts

Agregar nuevo metodo junto al existente (sin romper compatibilidad):

```typescript
// src/app/shared/services/ventas/ventas.service.ts

// EXISTENTE - mantener para compatibilidad
public getProductsByFilter(filter: any) {
  return this.post<Producto[]>('/v1/productos/all/filter', filter);
}

// NUEVO - agregar debajo del existente
/**
 * Obtiene productos con paginacion server-side
 * @since 2026.01.24
 * @param filter Filtros de busqueda
 * @param page Numero de pagina (1-indexed)
 * @param pageSize Items por pagina (max 100)
 * @returns Observable con respuesta paginada
 */
public getProductsByFilterPaginated(
  filter: any,
  page: number = 1,
  pageSize: number = 12
): Observable<PaginatedProductsResponse> {
  let queryParams = `page=${page}&pageSize=${Math.min(pageSize, 100)}`;

  // Agregar ordenamiento si existe en el filtro
  if (filter.sortField) {
    queryParams += `&sortField=${encodeURIComponent(filter.sortField)}`;
    queryParams += `&sortOrder=${filter.sortOrder || 1}`;
  }

  const endpoint = `/v1/productos/all/filter/paginated?${queryParams}`;
  return this.post<PaginatedProductsResponse>(endpoint, filter);
}
```

### 4. Adaptar Componente POS (product.component.ts)

Cambios requeridos en `pos2/widgets/product/product.component.ts`:

```typescript
import { ProductosPaginadosService } from '../../../../../shared/services/productos/productos-paginados.service';
import {
  ProductFilter,
  ProductPaginationInfo,
  InfiniteScrollState
} from '../../../../../shared/interfaces/paginated-products.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
})
export class ProductComponent implements OnInit, OnDestroy {
  // ... propiedades existentes ...

  // NUEVAS propiedades para paginacion server-side
  public isServerSidePagination: boolean = true; // Feature flag
  public isLoadingPage: boolean = false;
  public paginationInfo: ProductPaginationInfo | null = null;
  private currentFilter: ProductFilter = {};
  private subscriptions = new Subscription();

  constructor(
    public cartService: CartService,
    private maestroService: MaestroService,
    private inventarioService: InventarioService,
    private imageCacheService: ImageCacheService,
    private productosPaginados: ProductosPaginadosService // NUEVO
  ) {}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // NUEVO: Cargar productos con paginacion server-side
  obtenerProductosPorBodegaPaginado(bodegaId: string, page: number = 1) {
    if (!bodegaId) {
      console.warn('POS Product: No se pueden cargar productos sin bodega');
      return;
    }

    this.isLoadingPage = true;

    // Construir filtro
    this.currentFilter = {
      bodegaId: bodegaId,
      soloConStock: true, // Solo productos con stock para POS
      soloInventariables: false // Incluir no inventariables
    };

    const sub = this.productosPaginados.goToPage(
      page,
      this.currentFilter,
      this.itemsPerPage
    ).subscribe({
      next: (result) => {
        // Mapear productos con cantidad inicial
        this.paginatedProducts = result.products.map(p => ({
          ...p,
          cantidad: 1,
          imageLoaded: false
        }));

        this.paginationInfo = result.pagination;
        this.currentPage = result.pagination.currentPage;
        this.totalPages = result.pagination.totalPages;
        this.totalItems = result.pagination.totalItems;

        // Generar array de paginas para UI
        this.pages = [];
        for (let i = 1; i <= this.totalPages; i++) {
          this.pages.push(i);
        }

        this.isLoadingPage = false;

        // Precargar imagenes de la pagina
        this.precargarImagenes(this.paginatedProducts);

        // Precargar paginas adyacentes en background
        this.productosPaginados.preloadAdjacentPages(
          page,
          this.currentFilter,
          this.itemsPerPage
        );

        console.log(`POS: Pagina ${page}/${this.totalPages} cargada (${result.products.length} productos)`);
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.isLoadingPage = false;
        this.paginatedProducts = [];
      }
    });

    this.subscriptions.add(sub);
  }

  // MODIFICAR: goToPage para usar server-side
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    if (this.isLoadingPage) return; // Evitar clicks multiples

    if (this.isServerSidePagination) {
      this.obtenerProductosPorBodegaPaginado(
        this.currentFilter.bodegaId!,
        page
      );
    } else {
      // Logica original para cliente-side
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // MODIFICAR: obtenerProductos para usar la version paginada
  obtenerProductos(bodegaId?: string) {
    if (!bodegaId) {
      this.products = [];
      this.paginatedProducts = [];
      return;
    }

    if (this.isServerSidePagination) {
      this.obtenerProductosPorBodegaPaginado(bodegaId, 1);
    } else {
      // Mantener logica original
      this.obtenerProductosPorBodega(bodegaId);
    }
  }

  // MODIFICAR: filterDetails para server-side search
  filterDetails() {
    if (this.isServerSidePagination && this.currentFilter.bodegaId) {
      // Agregar texto de busqueda al filtro
      this.currentFilter.searchText = this.filter.search || '';

      // Limpiar cache y recargar desde servidor
      this.productosPaginados.clearCache();
      this.obtenerProductosPorBodegaPaginado(
        this.currentFilter.bodegaId,
        1 // Siempre ir a pagina 1 al buscar
      );
    } else {
      // Logica original de filtrado cliente-side
      // ... codigo existente ...
    }
  }
}
```

### 5. Actualizar Template HTML (product.component.html)

Agregar indicador de carga por pagina:

```html
<!-- Indicador de carga durante paginacion -->
<div class="page-loading-overlay" *ngIf="isLoadingPage">
  <div class="spinner-border text-primary" role="status">
    <span class="visually-hidden">Cargando...</span>
  </div>
</div>

<!-- Productos Paginados (existente, sin cambios) -->
<div class="row g-3" [class.loading]="isLoadingPage">
  <!-- ... contenido existente ... -->
</div>

<!-- Paginacion mejorada con info del servidor -->
<div class="pagination-container" *ngIf="totalPages > 1">
  <div class="pagination-info mb-2 text-center">
    <small class="text-muted">
      Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} -
      {{ Math.min(currentPage * itemsPerPage, totalItems) }}
      de {{ totalItems }} productos
    </small>
  </div>
  <!-- ... controles de paginacion existentes ... -->
</div>
```

CSS adicional:
```scss
.page-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.row.loading {
  opacity: 0.5;
  pointer-events: none;
}
```

---

## Estrategia de Cache Cliente

### Configuracion Recomendada

```typescript
// En el componente o servicio
this.productosPaginados.configureCashe({
  ttlMs: 5 * 60 * 1000,  // 5 minutos
  maxPages: 10,          // Maximo 10 paginas en cache
  enabled: true
});
```

### Comportamiento del Cache

1. **Hit de Cache**: Si la pagina existe y no expiro, se sirve inmediatamente
2. **Invalidacion Automatica**: Cuando cambian los filtros, se limpia todo el cache
3. **Precarga**: Al navegar a una pagina, se precargan las adyacentes
4. **LRU**: Si se excede el maximo, se elimina la pagina mas antigua

### Metricas de Cache

```typescript
// Para debugging/monitoreo
const stats = this.productosPaginados.getCacheStats();
console.log('Cache stats:', stats);
// { pages: 3, ttlMs: 300000, enabled: true, currentFilter: '{"bodegaId":"..."...' }
```

---

## Implementacion de Infinite Scroll

### Alternativa a Paginacion Tradicional

Para casos donde infinite scroll sea preferible (ej: catalogo movil):

```typescript
// En el componente
import { fromEvent } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

// En ngOnInit
ngOnInit() {
  // Detectar scroll cerca del fondo
  fromEvent(window, 'scroll').pipe(
    debounceTime(100),
    filter(() => {
      const scrollPos = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      return scrollPos >= docHeight - 200; // 200px del fondo
    })
  ).subscribe(() => {
    this.loadMoreProducts();
  });
}

// Inicializar infinite scroll
initCatalog() {
  this.productosPaginados.initInfiniteScroll(
    this.currentFilter,
    { batchSize: 20 }
  ).subscribe(result => {
    console.log('Primera carga:', result.products.length);
  });
}

// Cargar mas productos
loadMoreProducts() {
  if (this.isLoadingMore) return;

  this.isLoadingMore = true;
  this.productosPaginados.loadMoreProducts(
    this.currentFilter,
    20
  ).subscribe({
    next: (result) => {
      // Los productos se acumulan automaticamente en el servicio
      const state = this.productosPaginados.infiniteScrollSubject.value;
      this.products = state.loadedProducts;
      this.hasMore = state.hasMore;
      this.isLoadingMore = false;
    },
    error: () => this.isLoadingMore = false
  });
}
```

---

## Requisitos del Backend

El endpoint `/v1/productos/all/filter/paginated` debe implementar:

### Request
```
POST /v1/productos/all/filter/paginated?page=1&pageSize=12&sortField=precio.precioUnitarioConIva&sortOrder=-1
Content-Type: application/json

{
  "bodegaId": "abc123",
  "deliveryCity": { "label": "Bogota", "value": "bogota" },
  "searchText": "manzana",
  "priceRange": [0, 50000],
  "soloConStock": true
}
```

### Response
```json
{
  "success": true,
  "products": [
    { "_id": "...", "crearProducto": {...}, "precio": {...} }
  ],
  "pagination": {
    "totalItems": 156,
    "itemsPerPage": 12,
    "currentPage": 1,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextCursor": "eyJsYXN0SWQiOiAiYWJjMTIzIn0="
  },
  "metrics": {
    "totalProductos": 156,
    "conStock": 142,
    "sinStock": 14,
    "bajoStock": 23
  }
}
```

---

## Plan de Implementacion

### Fase 1: Backend (Prioridad Alta)
1. Crear endpoint `/v1/productos/all/filter/paginated`
2. Implementar paginacion con cursor (usando `_id` como cursor)
3. Agregar indices en Firestore para queries paginadas
4. Tests de rendimiento con 1000+ productos

### Fase 2: Frontend - Servicios (Completado)
1. [x] Crear interfaces de paginacion
2. [x] Crear ProductosPaginadosService
3. [ ] Agregar metodo en VentasService (opcional)

### Fase 3: Frontend - Componentes
1. [ ] Adaptar ProductComponent (POS)
2. [ ] Adaptar EcomerceProductsComponent
3. [ ] Agregar indicadores de carga
4. [ ] Implementar precarga de paginas

### Fase 4: Optimizaciones
1. [ ] Infinite scroll para catalogo movil
2. [ ] Service Worker para cache offline
3. [ ] Compresion de imagenes en servidor

---

## Metricas de Exito

| Metrica | Antes | Objetivo |
|---------|-------|----------|
| Tiempo primera carga (100 prods) | ~2-3s | <500ms |
| Memoria JS (1000 prods) | ~50MB | ~5MB |
| Tiempo cambio pagina | N/A (cliente) | <200ms |
| Cache hit rate | 0% | >60% |

---

## Archivos Creados

1. `src/app/shared/interfaces/paginated-products.interface.ts`
2. `src/app/shared/services/productos/productos-paginados.service.ts`
3. `docs/design/productos-paginacion-server-side.md` (este archivo)

## Archivos a Modificar

1. `src/app/shared/services/ventas/ventas.service.ts` - Agregar metodo paginado
2. `src/app/components/ventas/pos2/widgets/product/product.component.ts` - Usar servicio
3. `src/app/components/ventas/catalogo/ecomerce-products/ecomerce-products.component.ts` - Usar servicio
