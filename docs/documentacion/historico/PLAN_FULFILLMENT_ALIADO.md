# Plan de Implementacion: Integracion Fulfillment Aliado

## Resumen del Analisis

### Lo que YA EXISTE en el codigo:

**Backend (katuq_admin_back_firebase/functions/):**
1. `BaseFulfillmentProvider` - Patron Strategy definido
2. `AliaddoProvider` - Implementacion para Aliado (PERO basada en suposiciones)
3. `FulfillmentManager` - Orquestador de estrategias
4. Endpoints `/v1/fulfillment-integrations/*` - ya registrados
5. `IntegrationConfigService` - manejo de configuraciones

**Frontend (src/app/):**
1. Modulo de inventarios con bodegas
2. `ciudadesCobertura` con codigos DANE en bodegas
3. `coberturaNacional` flag en bodegas
4. Asociacion bodega-canal de ventas
5. Historial de movimientos de inventario

### Lo que FALTA implementar:

1. **Validar AliaddoProvider** contra la API real de Aliado
2. **Sincronizacion con movimientos de inventario** - comparar y registrar diferencias
3. **Busqueda de bodega por ciudad** - para ventas
4. **Frontend para mostrar stock de fulfillment** en inventario
5. **Integracion en ventas** - buscar bodega por ciudad del cliente

---

## FASE 0: Validar AliaddoProvider con API Real

### Problema Identificado:
El `AliaddoProvider` actual usa endpoints asumidos:
- `GET /items/{id}/stock` - asumido
- `GET /items` - asumido
- `GET /warehouses` - confirmado

### Accion Requerida:
Revisar la documentacion oficial de Aliado en https://aliaddo.readme.io/reference/consultar-productos y validar:

1. **Endpoint de productos**: Cual es la URL exacta?
2. **Endpoint de stock/inventario**: Cual es la URL exacta?
3. **Estructura de respuesta**: Que campos devuelve?
4. **Parametros requeridos**: Necesita algun ID especifico?

### Archivos a modificar si es necesario:
- `functions/services/fulfillmentProviders/aliaddoProvider.js`

---

## FASE 1: Backend - Sincronizacion con Movimientos de Inventario

### Objetivo:
Cuando se sincronice el inventario de Aliado, crear un movimiento de inventario con la diferencia.

### Flujo propuesto:
```
1. Obtener stock actual de Katuq (inventario local)
2. Obtener stock de Aliado (API externa)
3. Calcular diferencia = stockAliado - stockKatuq
4. Si diferencia != 0:
   - Si positiva: crear movimiento INGRESO_SINCRONIZACION
   - Si negativa: crear movimiento SALIDA_SINCRONIZACION
5. Actualizar inventario local de Katuq
6. Registrar log de sincronizacion
```

### Archivos a crear/modificar:

#### 1. Nuevo tipo de movimiento
**Archivo:** `functions/controllers/inventory.js`
**Accion:** Agregar tipos:
```javascript
INGRESO_SINCRONIZACION_FULFILLMENT: 'ingreso_sincronizacion_fulfillment',
SALIDA_SINCRONIZACION_FULFILLMENT: 'salida_sincronizacion_fulfillment'
```

#### 2. Nuevo servicio de sincronizacion
**Archivo a crear:** `functions/services/fulfillmentSyncService.js`
```javascript
class FulfillmentSyncService {
  /**
   * Sincroniza inventario de un producto con el fulfillment
   * @param {string} companyId - ID de la empresa
   * @param {string} productId - ID del producto en Katuq
   * @param {string} bodegaId - ID de la bodega
   * @param {string} providerName - Nombre del provider (ej: 'aliaddo')
   * @returns {object} Resultado de sincronizacion con movimiento creado
   */
  async syncProductInventory(companyId, productId, bodegaId, providerName) {
    // 1. Obtener stock actual de Katuq
    const stockKatuq = await this.getKatuqStock(companyId, productId, bodegaId);

    // 2. Obtener stock de Aliado
    const stockFulfillment = await fulfillmentManager.getStock(
      companyId, providerName, productId, { warehouseId: bodegaId }
    );

    // 3. Calcular diferencia
    const diferencia = stockFulfillment.totalStock - stockKatuq;

    // 4. Si hay diferencia, crear movimiento
    if (diferencia !== 0) {
      const movimiento = await this.crearMovimientoSincronizacion(
        companyId, productId, bodegaId, diferencia
      );
      return { sincronizado: true, diferencia, movimiento };
    }

    return { sincronizado: true, diferencia: 0 };
  }

  async syncBodegaCompleta(companyId, bodegaId, providerName) {
    // Sincroniza todos los productos de una bodega
  }
}
```

#### 3. Nuevo endpoint de sincronizacion
**Archivo:** `functions/routers/fulfillmentIntegrations.js`
**Agregar:**
```javascript
/**
 * POST /v1/fulfillment-integrations/sync-inventory
 * Sincroniza inventario y crea movimientos de ajuste
 */
router.post('/sync-inventory', auth, async (req, res) => {
  const { companyId, productId, bodegaId, provider } = req.body;
  // Llama a FulfillmentSyncService
});

/**
 * POST /v1/fulfillment-integrations/sync-bodega
 * Sincroniza todos los productos de una bodega
 */
router.post('/sync-bodega', auth, async (req, res) => {
  const { companyId, bodegaId, provider } = req.body;
  // Sincroniza bodega completa
});
```

### Modelo de datos para sincronizacion:
**Coleccion Firestore:** `fulfillment_sync_logs`
```javascript
{
  companyId: string,
  bodegaId: string,
  provider: string,
  syncType: 'producto' | 'bodega_completa',
  productsSynced: number,
  movimientosCreados: number,
  diferenciasEncontradas: [
    { productId, stockKatuq, stockFulfillment, diferencia }
  ],
  startedAt: timestamp,
  completedAt: timestamp,
  status: 'completed' | 'failed' | 'partial'
}
```

---

## FASE 2: Backend - Busqueda de Bodega por Ciudad de Cobertura

### Objetivo:
Dado un codigo DANE de ciudad, encontrar la bodega que tiene cobertura para esa ciudad.

### Logica:
```
1. Buscar bodegas con coberturaNacional = true (sirven a todas las ciudades)
2. Buscar bodegas donde ciudadesCobertura contiene el codigo DANE
3. Priorizar: bodega especifica > bodega nacional
4. Si hay multiples bodegas, elegir la mas cercana o por prioridad configurada
```

### Archivos a crear/modificar:

#### 1. Nuevo servicio de cobertura
**Archivo a crear:** `functions/services/bodegaCoberturaService.js`
```javascript
class BodegaCoberturaService {
  /**
   * Encuentra la bodega que tiene cobertura para una ciudad
   * @param {string} companyId - ID de la empresa
   * @param {string} codigoDane - Codigo DANE de la ciudad (5 digitos)
   * @param {string} canalId - ID del canal de ventas (opcional)
   * @returns {object|null} Bodega encontrada o null
   */
  async findBodegaPorCiudad(companyId, codigoDane, canalId = null) {
    // 1. Obtener bodegas activas de la empresa
    let bodegas = await this.getBodegasActivas(companyId);

    // 2. Si hay canalId, filtrar por canal
    if (canalId) {
      bodegas = await this.filtrarPorCanal(bodegas, canalId);
    }

    // 3. Buscar bodega con cobertura especifica
    let bodega = bodegas.find(b =>
      b.ciudadesCobertura?.some(c => c.codigo === codigoDane)
    );

    // 4. Si no hay especifica, buscar nacional
    if (!bodega) {
      bodega = bodegas.find(b => b.coberturaNacional === true);
    }

    return bodega;
  }

  /**
   * Obtiene todas las ciudades de cobertura de una empresa
   */
  async getCiudadesConCobertura(companyId) {
    // Retorna lista de ciudades con cobertura
  }
}
```

#### 2. Nuevo endpoint
**Archivo:** `functions/routers/bodegas.js` (o crear nuevo)
```javascript
/**
 * GET /v1/bodegas/cobertura/:codigoDane
 * Encuentra bodega por codigo DANE
 */
router.get('/cobertura/:codigoDane', auth, async (req, res) => {
  const { codigoDane } = req.params;
  const { canalId } = req.query;
  const companyId = req.user.company;

  const bodega = await bodegaCoberturaService.findBodegaPorCiudad(
    companyId, codigoDane, canalId
  );

  res.json({ success: true, data: bodega });
});

/**
 * GET /v1/bodegas/ciudades-cobertura
 * Lista todas las ciudades con cobertura
 */
router.get('/ciudades-cobertura', auth, async (req, res) => {
  const companyId = req.user.company;
  const ciudades = await bodegaCoberturaService.getCiudadesConCobertura(companyId);
  res.json({ success: true, data: ciudades });
});
```

---

## FASE 3: Frontend - Servicio Angular para Fulfillment

### Objetivo:
Crear servicio Angular que consuma los endpoints de fulfillment.

### Archivo a crear:
**`src/app/shared/services/fulfillment/fulfillment.service.ts`**

```typescript
@Injectable({ providedIn: 'root' })
export class FulfillmentService {
  private apiUrl = environment.urlApi + '/v1/fulfillment-integrations';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el stock de un producto en el fulfillment
   */
  getStock(provider: string, productId: string): Observable<FulfillmentStockResponse> {
    return this.http.get<FulfillmentStockResponse>(
      `${this.apiUrl}/stock/${provider}/${productId}`
    );
  }

  /**
   * Obtiene stock de multiples productos
   */
  getBulkStock(provider: string, productIds: string[]): Observable<BulkStockResponse> {
    return this.http.post<BulkStockResponse>(
      `${this.apiUrl}/stock/bulk`,
      { provider, productIds }
    );
  }

  /**
   * Sincroniza inventario de un producto y crea movimiento de ajuste
   */
  syncProductInventory(productId: string, bodegaId: string, provider: string): Observable<SyncResponse> {
    return this.http.post<SyncResponse>(
      `${this.apiUrl}/sync-inventory`,
      { productId, bodegaId, provider }
    );
  }

  /**
   * Sincroniza todos los productos de una bodega
   */
  syncBodegaCompleta(bodegaId: string, provider: string): Observable<SyncResponse> {
    return this.http.post<SyncResponse>(
      `${this.apiUrl}/sync-bodega`,
      { bodegaId, provider }
    );
  }

  /**
   * Obtiene los providers de fulfillment configurados
   */
  getConfiguredProviders(): Observable<FulfillmentProvider[]> {
    return this.http.get<any>(`${this.apiUrl}/providers`)
      .pipe(map(res => res.data));
  }
}
```

### Interfaces a crear:
**`src/app/shared/models/fulfillment/fulfillment.model.ts`**

```typescript
export interface FulfillmentStockResponse {
  success: boolean;
  provider: string;
  productId: string;
  totalStock: number;
  warehouses: FulfillmentWarehouseStock[];
  lastUpdated: string;
}

export interface FulfillmentWarehouseStock {
  id: string;
  name: string;
  quantity: number;
  available: number;
  reserved: number;
}

export interface SyncResponse {
  success: boolean;
  sincronizado: boolean;
  diferencia: number;
  movimiento?: MovimientoInventario;
}

export interface FulfillmentProvider {
  provider: string;
  status: string;
  configured: boolean;
}
```

---

## FASE 4: Frontend - Inventario por Bodega con Stock de Fulfillment

### Objetivo:
Modificar la vista de inventario por bodega para mostrar DOS columnas:
1. Stock Katuq (inventario local)
2. Stock Fulfillment (inventario en Aliado)

### Archivos a modificar:

#### 1. Componente de inventario por bodega
**Archivo:** `src/app/components/inventarios/inventario-catalogo/inventarios.component.ts`

**Cambios:**
```typescript
// Agregar imports
import { FulfillmentService } from '@shared/services/fulfillment/fulfillment.service';

// Agregar propiedades
fulfillmentEnabled: boolean = false;
fulfillmentProvider: string = '';
fulfillmentStockMap: Map<string, number> = new Map();
loadingFulfillmentStock: boolean = false;

// En ngOnInit o al seleccionar bodega
async checkFulfillmentConfig() {
  const providers = await this.fulfillmentService.getConfiguredProviders().toPromise();
  if (providers && providers.length > 0) {
    this.fulfillmentEnabled = true;
    this.fulfillmentProvider = providers[0].provider; // o permitir seleccion
  }
}

// Cargar stock de fulfillment
async loadFulfillmentStock(productIds: string[]) {
  if (!this.fulfillmentEnabled) return;

  this.loadingFulfillmentStock = true;
  try {
    const response = await this.fulfillmentService
      .getBulkStock(this.fulfillmentProvider, productIds)
      .toPromise();

    // Mapear resultados
    response.stocks.forEach(s => {
      this.fulfillmentStockMap.set(s.productId, s.totalStock);
    });
  } finally {
    this.loadingFulfillmentStock = false;
  }
}

// Metodo para obtener stock de fulfillment de un producto
getFulfillmentStock(productId: string): number | null {
  return this.fulfillmentStockMap.get(productId) ?? null;
}

// Metodo para sincronizar un producto
async syncProduct(productId: string) {
  if (!this.selectedBodega || !this.fulfillmentProvider) return;

  const result = await this.fulfillmentService
    .syncProductInventory(productId, this.selectedBodega.id, this.fulfillmentProvider)
    .toPromise();

  if (result.success) {
    this.toastr.success(
      `Sincronizado. Diferencia: ${result.diferencia} unidades`,
      'Sincronizacion completada'
    );
    // Recargar datos
    this.loadInventory();
    this.loadFulfillmentStock([productId]);
  }
}
```

#### 2. Template HTML
**Archivo:** `src/app/components/inventarios/inventario-catalogo/inventarios.component.html`

**Agregar columna en la tabla:**
```html
<!-- Columna de Stock Katuq (ya existe) -->
<th>Stock Katuq</th>

<!-- Nueva columna de Stock Fulfillment -->
<th *ngIf="fulfillmentEnabled">
  Stock Fulfillment
  <i class="fa fa-sync-alt ms-1 cursor-pointer"
     (click)="loadFulfillmentStock(getProductIds())"
     [class.fa-spin]="loadingFulfillmentStock"
     pTooltip="Actualizar stock de fulfillment"></i>
</th>

<!-- Nueva columna de acciones de sync -->
<th *ngIf="fulfillmentEnabled">Sync</th>

<!-- En el cuerpo de la tabla -->
<td>{{ producto.cantidad }}</td>

<td *ngIf="fulfillmentEnabled">
  <span *ngIf="getFulfillmentStock(producto.id) !== null; else loadingStock">
    {{ getFulfillmentStock(producto.id) }}
    <span *ngIf="getFulfillmentStock(producto.id) !== producto.cantidad"
          class="badge ms-1"
          [class.bg-warning]="getFulfillmentStock(producto.id) > producto.cantidad"
          [class.bg-danger]="getFulfillmentStock(producto.id) < producto.cantidad">
      {{ getFulfillmentStock(producto.id) - producto.cantidad > 0 ? '+' : '' }}{{ getFulfillmentStock(producto.id) - producto.cantidad }}
    </span>
  </span>
  <ng-template #loadingStock>
    <i class="fa fa-spinner fa-spin"></i>
  </ng-template>
</td>

<td *ngIf="fulfillmentEnabled">
  <button class="btn btn-sm btn-outline-primary"
          (click)="syncProduct(producto.id)"
          pTooltip="Sincronizar con fulfillment">
    <i class="fa fa-sync"></i>
  </button>
</td>
```

#### 3. Boton de sincronizacion masiva
**Agregar en la barra de herramientas:**
```html
<button *ngIf="fulfillmentEnabled"
        class="btn btn-primary"
        (click)="syncBodegaCompleta()"
        [disabled]="syncingBodega">
  <i class="fa fa-sync-alt" [class.fa-spin]="syncingBodega"></i>
  Sincronizar Bodega Completa
</button>
```

---

## FASE 5: Frontend - Integracion de Busqueda de Bodega en Ventas

### Objetivo:
Preparar la infraestructura para que en ventas se pueda buscar automaticamente la bodega segun la ciudad del cliente.

### Archivos a crear/modificar:

#### 1. Servicio de cobertura
**Archivo a crear:** `src/app/shared/services/bodegas/bodega-cobertura.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class BodegaCoberturaService {
  private apiUrl = environment.urlApi + '/v1/bodegas';

  constructor(private http: HttpClient) {}

  /**
   * Encuentra la bodega con cobertura para una ciudad
   * @param codigoDane Codigo DANE de la ciudad (5 digitos)
   * @param canalId ID del canal de ventas (opcional)
   */
  findBodegaPorCiudad(codigoDane: string, canalId?: string): Observable<Bodega | null> {
    let params = new HttpParams();
    if (canalId) {
      params = params.set('canalId', canalId);
    }

    return this.http.get<any>(`${this.apiUrl}/cobertura/${codigoDane}`, { params })
      .pipe(
        map(res => res.data),
        catchError(() => of(null))
      );
  }

  /**
   * Obtiene todas las ciudades con cobertura
   */
  getCiudadesConCobertura(): Observable<CiudadCobertura[]> {
    return this.http.get<any>(`${this.apiUrl}/ciudades-cobertura`)
      .pipe(map(res => res.data));
  }

  /**
   * Verifica si hay cobertura para una ciudad
   */
  tieneCobertura(codigoDane: string, canalId?: string): Observable<boolean> {
    return this.findBodegaPorCiudad(codigoDane, canalId)
      .pipe(map(bodega => bodega !== null));
  }
}
```

#### 2. Integracion en checkout/venta asistida
**Archivo:** `src/app/components/ventas/venta-asistida/` o checkout

**Uso propuesto (para implementar despues):**
```typescript
// En el componente de venta asistida o checkout
async onCiudadSeleccionada(codigoDane: string) {
  // Buscar bodega con cobertura
  const bodega = await this.bodegaCoberturaService
    .findBodegaPorCiudad(codigoDane, this.canalActual?.id)
    .toPromise();

  if (bodega) {
    // Asignar bodega automaticamente
    this.selectedBodega = bodega;
    this.pedido.bodegaId = bodega.idBodega;

    // Opcional: recargar productos con stock de esa bodega
    await this.loadProductosConStock(bodega.id);
  } else {
    // Mostrar mensaje de sin cobertura
    this.toastr.warning(
      'No hay cobertura de envio para esta ciudad',
      'Sin cobertura'
    );
  }
}
```

---

## FASE 6: Validacion del AliaddoProvider (CRITICO)

### Por que es critico:
El AliaddoProvider actual fue creado con SUPOSICIONES sobre la API. Antes de implementar todo lo demas, hay que validar que los endpoints sean correctos.

### Accion requerida del usuario:
1. Ir a https://aliaddo.readme.io/reference/consultar-productos
2. Verificar:
   - Cual es la URL exacta del endpoint de productos?
   - Cual es la URL exacta del endpoint de stock/inventario?
   - Que parametros requiere?
   - Cual es la estructura de respuesta?

### Ejemplo de lo que necesito saber:
```
Endpoint de productos:
- URL: GET /v1/items  o  GET /v1/products  o  GET /v1/items/list ?
- Parametros: ?page=1&limit=100 ?
- Respuesta: { items: [...] }  o  { data: { items: [...] } } ?

Endpoint de stock:
- URL: GET /v1/items/{id}/stock  o  GET /v1/inventory/{id} ?
- Respuesta: { quantity: 100 }  o  { stock: { available: 100 } } ?
```

---

## Resumen de Archivos a Crear

### Backend:
1. `functions/services/fulfillmentSyncService.js` - NUEVO
2. `functions/services/bodegaCoberturaService.js` - NUEVO
3. `functions/routers/fulfillmentIntegrations.js` - MODIFICAR (agregar endpoints)
4. `functions/routers/bodegas.js` - MODIFICAR (agregar endpoints cobertura)
5. `functions/controllers/inventory.js` - MODIFICAR (nuevos tipos de movimiento)

### Frontend:
1. `src/app/shared/services/fulfillment/fulfillment.service.ts` - NUEVO
2. `src/app/shared/models/fulfillment/fulfillment.model.ts` - NUEVO
3. `src/app/shared/services/bodegas/bodega-cobertura.service.ts` - NUEVO
4. `src/app/components/inventarios/inventario-catalogo/inventarios.component.ts` - MODIFICAR
5. `src/app/components/inventarios/inventario-catalogo/inventarios.component.html` - MODIFICAR

---

## Preguntas para el Usuario

Antes de comenzar la implementacion, necesito clarificacion en:

1. **API de Aliado**: Puedes compartir los endpoints exactos de la documentacion de https://aliaddo.readme.io/reference/consultar-productos ?

2. **Mapeo de productos**: Como se relaciona un producto de Katuq con un producto de Aliado?
   - Usan el mismo ID?
   - Hay un campo de SKU en comun?
   - Necesitamos una tabla de mapeo?

3. **Mapeo de bodegas**: Como se relaciona una bodega de Katuq con una bodega de Aliado?
   - Se mapean por ID?
   - Por nombre?
   - Necesitamos configurar el mapeo manualmente?

4. **Prioridad de implementacion**: En que orden prefieres que implemente las fases?
   - Fase 0 (Validar API) - RECOMENDADO PRIMERO
   - Fase 1 (Sincronizacion backend)
   - Fase 2 (Busqueda por ciudad)
   - Fase 3 (Servicio Angular)
   - Fase 4 (UI inventario)
   - Fase 5 (Integracion ventas)

---

## Estimacion de Esfuerzo

| Fase | Descripcion | Complejidad | Archivos |
|------|-------------|-------------|----------|
| 0 | Validar AliaddoProvider | Media | 1 |
| 1 | Sincronizacion con movimientos | Alta | 3-4 |
| 2 | Busqueda bodega por ciudad | Media | 2-3 |
| 3 | Servicio Angular fulfillment | Baja | 2 |
| 4 | UI inventario con fulfillment | Media | 2-3 |
| 5 | Integracion ventas (preparar) | Baja | 1-2 |

---

**Documento creado:** 2025-11-27
**Estado:** Pendiente aprobacion del usuario
