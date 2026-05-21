# Plan 003.3 — WooCommerce: sync incremental de productos (Woo → Katuq)

> Estado: **draft** (2026-05-20)
> Vinculado a `spec.md`.

## 1. Resumen técnico

Crear `services/woocommerce/queries.js` con paginación incremental usando `modified_after` cursor. Crear `services/woocommerce/mappers/{product,variant}.js` extrayendo lógica inline existente de `controllers/woocommerceIntegration.js`. Crear `services/woocommerce/processors/{products,inventory}.js` consumidos por webhookWorker (003.2) y por cron sync. Stock siempre via `inventoryService.updateStock()` (evita doble conteo). Cursor persistido en `integration_configs.{COMPANY}_woocommerce.syncCursor`.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | |
| II — Spec captura intent | sí | |
| IV — Idempotencia | sí | Cron usa `modified_after` + mapper hace upsert idempotente (busca por sku o woo_id). |
| V — Eventos crudos antes de procesar | sí (vía 003.2 para webhooks) | Cron no recibe eventos externos; lee directamente API Woo. |
| VI — UI no acoplada a proveedor | n/a | Solo backend. |
| VII — Observabilidad | sí | syncRunId + métricas por empresa. |
| VIII — Test-first | sí | Mapper y processors con fixtures antes de implementación. |
| IX — Angular | n/a | |
| X — Seguridad webhooks | n/a (cubierto 003.2) | |
| XI — Datos sensibles fuera del log | sí | Logger sanitiza payloads. |
| XIII — ≤ 3 páginas | sí | |
| XV v2 — Canónica INGLÉS | sí | `integrations.woocommerce.{product_id, variation_id, syncedAt, deletedAt}` — snake_case para campos copiados, camelCase para derivados. |

## 3. Arquitectura

### 3.1 Componentes a crear

```
services/woocommerce/
├── queries.js                     (getProducts paginado, getProductVariations, with axios client)
├── mappers/
│   ├── product.js                 (woo product → Katuq product schema)
│   └── variant.js                 (woo variation → Katuq variant doc)
└── processors/
    ├── products.js                (handleProductUpserted, handleProductDeleted, syncBatch)
    └── inventory.js               (adjustStock → inventoryService.updateStock)
```

Webhook worker existente (003.2) registra handlers de topic `product.*` apuntando a `processors/products.handle*`.

Cron sync se registra como template plug-and-play (003.5) — el flow doc instancia un cron que invoca nodo `woocommerce-fetch-products.action` (003.4) → `katuq-product-upsert` → `katuq-inventory-adjust`. Esta spec NO crea el cron por sí mismo; deja la pieza `processors/products.syncBatch(companyId, batchSize)` lista para que la plantilla la invoque.

### 3.2 Diagrama

```
[cron tick]                                       [webhook product.* via 003.2]
     │                                                       │
     ▼                                                       ▼
[nodo woocommerce-fetch-products (003.4)]      [webhookWorker (003.2)]
     │                                                       │
     ▼                                                       │
[queries.getProducts(page, modified_after=cursor)]           │
     │                                                       │
     ▼                                                       ▼
        ┌─────► processors/products.handleProductUpserted(event)
                                       │
                                       ▼
                              [mappers/product.toKatuq(wcProduct)]
                                       │
                                       ▼
                              [katuq-product-upsert via service]
                                       │
                                       ▼
                              [processors/inventory.adjustStock(productoId, bodegaCode, wc.stock_quantity)]
                                       │
                                       ▼
                              [inventoryService.updateStock(...)]
                                       │
                                       ▼
                              [Firestore: products + inventory normalizado]
```

### 3.3 Decisiones técnicas

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Sync incremental via `modified_after` cursor | AC-003.3-01, AC-003.3-10 | Full sync cada vez: pesado, lento, costoso en API calls |
| Mapper extraído a módulo separado | AC-003.3-05, mantenibilidad | Inline en controller: 2839 LOC ya inmantenibles |
| `inventoryService.updateStock()` obligatorio | AC-003.3-07, R-WOO-02 | Escribir `inventory` directo: causa doble conteo confirmado en CLAUDE.md |
| Soft delete con `disponibilidad.activo: false` | AC-003.3-03, D-017 | Hard delete: rompe órdenes históricas que referencian el producto |
| Cron se materializa como template (003.5), no hardcoded | D-020, "FACIIIIIL" | Cron hardcoded en `cron_jobs_config`: viola Art VI + no es plug-and-play |
| Variaciones como docs Katuq separados con `productoPadre.cd` | AC-003.3-06, Q-003.3-03 default | Subcollection: cambia patrón existente Aliaddo |

## 4. Modelo de datos

### 4.1 Cambio en `integration_configs.{COMPANY}_woocommerce.syncCursor`
```json
{
  "syncCursor": {
    "lastSyncedAt": "2026-05-20T14:30:00.000Z",
    "lastProductId": 39540,
    "lastSyncRunId": "uuid-v7",
    "totalSynced": 8312
  }
}
```

### 4.2 Doc Katuq `products/{docId}` con integración Woo
```json
{
  "identificacion": { "referencia": "SKU-001", ... },
  "crearProducto": { "titulo": "...", "descripcion": "...", "imagenesPrincipales": [...] },
  "precio": { "precioUnitarioConIva": "29900" },
  "exposicion": { "categorias": [...], "etiquetas": [...] },
  "disponibilidad": { "activo": true | false },
  "integrations": {
    "woocommerce": {
      "product_id": 39540,
      "variation_id": null,
      "sku": "SKU-001",
      "status": "publish",
      "syncedAt": "ISO",
      "deletedAt": null,
      "syncSource": "cron | webhook"
    }
  }
}
```

### 4.3 Inventario: NO se crea schema nuevo
Stock se ajusta via `inventoryService.updateStock(args)` existente. La spec NO escribe en `inventory` collection. Cualquier desviación es bug.

## 5. Contratos

### 5.1 `queries.getProducts(companyId, opts) → AsyncIterable<wcProduct[]>`
```js
const opts = { perPage: 100, modifiedAfter: '2026-05-20T...', status: 'any' };
for await (const batch of queries.getProducts(companyId, opts)) {
  // batch = array de wcProducts hasta perPage
}
```

### 5.2 `mappers/product.toKatuq(wcProduct, companyContext) → katuqProduct`
- Input: wcProduct (REST API v3 schema oficial).
- Output: doc Katuq listo para `katuq-product-upsert`.
- Errores: throw `MapperError` con `wooProductId + reason` (capturado en processor).

### 5.3 `processors/products.handleProductUpserted(event, ctx) → Promise<{productoId, action}>`
- Input: `event = {wcProduct, source: 'cron'|'webhook', correlationId}`, `ctx = {companyId, bodegaCode}`.
- Output: `{productoId: 'KATUQ-DOC-ID', action: 'created'|'updated'|'reactivated'}`.

### 5.4 `processors/inventory.adjustStock(args) → Promise<{success}>`
- Input: `{companyId, productoId, idBodega, quantity, source}`.
- Output: delega a `inventoryService.updateStock()` y retorna su resultado.

## 6. Estrategia de testing

- **Contract tests** (primero):
  - `queries.getProducts` paginado contra mock axios devuelve batches del tamaño esperado y respeta `modified_after`.
  - `mappers/product.toKatuq` con 5 fixtures (`wc-product-simple.json`, `wc-product-variable.json`, `wc-product-with-images.json`, `wc-product-trashed.json`, `wc-product-no-sku.json`) produce doc Katuq válido.
- **Integration**:
  - `processors/products.handleProductUpserted` contra Firestore Emulator: crea doc, actualiza doc, reactiva soft-deleted.
  - `processors/inventory.adjustStock` con `inventoryService.updateStock` mockeado: pasa args correctos.
- **E2E**:
  - Cubierto en 003.6 — un fixture de 200 productos termina con 200 docs en Katuq + ajustes de inventario correctos.
- **Unit**:
  - Backoff exponencial en 429.
  - Cursor avanza solo si batch completo procesa.

## 7. Fases de implementación

1. **Fase A — queries.js** `[P]`. Paginación cursor + 429 backoff + tests contract.
2. **Fase B — mappers/product.js + mappers/variant.js** `[P]` (deps: fixtures preparados en T-01).
3. **Fase C — processors/products.js** (deps: B).
4. **Fase D — processors/inventory.js** (deps: ninguna directa, solo wraps `inventoryService.updateStock`).
5. **Fase E — wire webhookWorker → processors/products** (deps: C, 003.2 done). Modifica `webhookWorker.js` de 003.2 para registrar handlers `product.created/updated/deleted`.
6. **Fase F — persistencia cursor**: `processors/products.syncBatch` actualiza `integration_configs.{COMPANY}_woocommerce.syncCursor` solo tras batch exitoso.
7. **Fase G — integración con 003.4**: dejar API documentada para que el nodo `woocommerce-fetch-products` (003.4) invoque `queries.getProducts` + `processors/products.handleProductUpserted`.

## 8. Plan de rollout

- **Feature flag**: NO necesario (los processors NO se activan hasta que el comerciante instancie un template del 003.5).
- **Dark launch**: testear con tenant interno (sin clientes reales) antes de exponer template.
- **Rollback**: desactivar template en `/flows`. Sin código que revertir si las funciones solo se invocan desde flow nodes.

## 9. Riesgos técnicos

- **R-Plan-01**: extraer mapper de `controllers/woocommerceIntegration.js` puede romper el endpoint `importAllProducts` legacy. Mitigación: refactor con tests intermedios; legacy y nuevo apuntan al mismo `mappers/product.js`.
- **R-Plan-02**: variaciones con > 100 por producto requieren paginación adicional (`/products/{id}/variations?per_page=100&page=N`). Mitigación: `queries.getProductVariations` itera páginas igual que `getProducts`.
- **R-Plan-03**: `modified_gmt` puede no estar en versiones antiguas de WC (pre 3.5). Mitigación: fallback a `modified` con tolerancia de 5min y log warning.

## 10. Open questions técnicas

- Definir si `processors/products` escribe vía nodo `katuq-product-upsert` (consistente con flows) o directo a Firestore (más rápido). Default propuesto: vía nodo cuando se invoca desde flow; directo cuando se invoca desde webhook (path crítico de latencia).
- Confirmar nombre exacto del campo `producto.cd` vs alternativas — verificar contra CLAUDE.md convenciones IDs.
