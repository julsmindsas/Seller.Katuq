# Tasks 003.3 — WooCommerce: sync incremental de productos

> Estado: **draft** (2026-05-20)
> Vinculado a `plan.md`.

## Convenciones
- `[P]` = paralelizable.
- `(deps: T-NN)` = dependencia explícita.

## Tareas

### T-01 — Crear fixtures `fixtures/woocommerce/wc-product-*.json` `[P]`
- **Output:** 5 archivos de fixture basados en spec oficial WC REST API v3.
- **Criterio de éxito:**
  - `wc-product-simple.json` — producto simple con sku, categorías, tags, imágenes, stock.
  - `wc-product-variable.json` — producto type=variable con 3 variations embebidas.
  - `wc-product-with-images.json` — 5 imágenes principales.
  - `wc-product-trashed.json` — `status: 'trash'`.
  - `wc-product-no-sku.json` — sin SKU (caso edge).
- **Archivos:** `katuq_admin_back_firebase/functions/tests/fixtures/woocommerce/wc-product-{simple,variable,with-images,trashed,no-sku}.json`.

### T-02 — `services/woocommerce/queries.js` con paginación incremental (deps: T-01)
- **Output:** módulo con `getProducts(companyId, opts)` async iterable + `getProductVariations(companyId, productId)`.
- **Criterio de éxito:**
  - `getProducts` usa `getWooCommerceApiClient` existente + `GET /products?per_page=100&page=N&modified_after=...&status=any`.
  - Itera páginas hasta que respuesta retorne array vacío o headers indiquen último (`X-WP-TotalPages`).
  - Backoff exponencial en 429 (1s, 3s, 9s, hasta 3 attempts).
  - Logger estructurado con `companyId, page, count, durationMs`.
  - Contract test: mock axios con 3 páginas de 100 + 1 página de 50 → async iterator devuelve 4 batches.
- **Archivos:** `services/woocommerce/queries.js` (nuevo), test correspondiente.

### T-03 — `services/woocommerce/mappers/product.js` (deps: T-01) `[P con T-04]`
- **Output:** función `toKatuq(wcProduct, ctx) → katuqProduct`.
- **Criterio de éxito:**
  - Mapea según AC-003.3-05 de spec.
  - Maneja `status: 'trash'` → setea `disponibilidad.activo: false` + `integrations.woocommerce.deletedAt`.
  - Maneja `status: 'publish'` → `disponibilidad.activo: true`, limpia `deletedAt` si estaba.
  - Throw `MapperError` con `{wooProductId, reason}` si falta `id` o `sku` (para fixture `wc-product-no-sku.json`).
  - 5 unit tests, uno por fixture.
- **Archivos:** `services/woocommerce/mappers/product.js` (nuevo), test.

### T-04 — `services/woocommerce/mappers/variant.js` (deps: T-01) `[P con T-03]`
- **Output:** `toKatuqVariant(wcVariation, parentProduct, ctx) → katuqVariantProduct`.
- **Criterio de éxito:**
  - Mapea variation Woo a doc Katuq como producto separado con `productoPadre.cd: parentDocId`, `integrations.woocommerce.variation_id`.
  - Test con `wc-product-variable.json` extrayendo las 3 variations.
- **Archivos:** `services/woocommerce/mappers/variant.js` (nuevo).

### T-05 — `services/woocommerce/processors/inventory.js` (deps: ninguna) `[P]`
- **Output:** `adjustStock({companyId, productoId, idBodega, quantity, source}) → Promise<{success}>`.
- **Criterio de éxito:**
  - Wraps `inventoryService.updateStock(args)` — pasa args sin modificar.
  - Logger estructurado: `correlationId, productoId, idBodega, quantity, source`.
  - Test: mock `inventoryService.updateStock` y verifica llamada con args correctos.
  - Test code review: confirmar 0 `db.collection('inventory').*` directos.
- **Archivos:** `services/woocommerce/processors/inventory.js` (nuevo).

### T-06 — `services/woocommerce/processors/products.js` (deps: T-02, T-03, T-04, T-05)
- **Output:** módulo con `handleProductUpserted(event, ctx)`, `handleProductDeleted(event, ctx)`, `syncBatch(companyId, opts)`.
- **Criterio de éxito:**
  - `handleProductUpserted`: invoca mapper, busca doc existente en `products` por `integrations.woocommerce.product_id` o `identificacion.referencia`, hace upsert. Si producto variable, itera variations.
  - Llama `processors/inventory.adjustStock` tras upsert exitoso.
  - `handleProductDeleted`: aplica soft delete (D-017).
  - `syncBatch`: usa `queries.getProducts` con `modified_after = lastSyncedAt`. Procesa cada producto secuencialmente. Tras batch exitoso, actualiza `integration_configs.{COMPANY}_woocommerce.syncCursor`.
  - Si un producto N falla, logger ERROR + continuar con N+1 (AC-003.3-09).
  - Integration test con Firestore Emulator: ejecutar `syncBatch` con fixture mock de 5 productos → 5 docs en `products` collection + cursor actualizado.
- **Archivos:** `services/woocommerce/processors/products.js` (nuevo).

### T-07 — Conectar webhookWorker (003.2) con processors/products (deps: T-06 + 003.2 T-06)
- **Output:** registry de handlers en `webhookWorker.js` actualizado.
- **Criterio de éxito:**
  - Topic `product.created` → `processors/products.handleProductUpserted`.
  - Topic `product.updated` → idem.
  - Topic `product.deleted` → `processors/products.handleProductDeleted`.
  - Test E2E: simular webhook `product.created` → eventualmente doc en `products` collection.
- **Archivos:** modificar `services/woocommerce/webhookWorker.js`.

### T-08 — Refactorizar `controllers/woocommerceIntegration.js:importAllProducts` para usar nuevo mapper (deps: T-03, T-04)
- **Output:** controller invoca `mappers/product.toKatuq` en lugar de inline.
- **Criterio de éxito:**
  - 0 duplicación de mapping logic.
  - Endpoint `POST /v1/woocommerce/import/products` legacy sigue funcional.
  - Regression test: importar 10 productos via endpoint legacy produce mismo resultado que vía processors/products.
- **Archivos:** `controllers/woocommerceIntegration.js` (modificar).

### T-09 — Métricas + provider-dashboard hook (deps: T-06)
- **Output:** emit métricas por `syncRunId` + entrada en provider-dashboard.
- **Criterio de éxito:**
  - Métricas: `wc_sync_products_per_run`, `wc_sync_errors_per_run`, `wc_sync_duration_ms`.
  - Si `errors_per_run > 10`, escribe entrada `severity: WARN` en `provider_dashboard` collection con `companyId, syncRunId, errorCount`.
- **Archivos:** `services/woocommerce/processors/products.js` (extender).

### T-10 — Audit grep "no escrituras directas a inventory" (deps: T-05, T-06)
- **Output:** comando + CI check.
- **Criterio de éxito:**
  - `grep -rn "collection('inventory')" services/woocommerce/` retorna 0 hits (verificar).
  - Script `npm run audit:wc-inventory-writes` configurado para correr en CI.
- **Archivos:** `scripts/audit-wc-inventory-writes.sh` (nuevo) + entrada en `package.json` scripts.

## Orden de ejecución sugerido

```
Día 1: T-01 [P] T-05 [P]
Día 2: T-02 (deps T-01) → T-03 [P] T-04 [P] (deps T-01)
Día 3: T-06 (deps T-02, T-03, T-04, T-05)
Día 4: T-07 (deps T-06 + 003.2 done) → T-08 (deps T-03, T-04)
Día 5: T-09 → T-10
```

## Definition of Done

- T-01 a T-10 completadas.
- Contract tests verdes (T-02, T-03, T-04).
- Integration tests verdes con Firestore Emulator (T-06).
- E2E test verde (T-07).
- 0 escrituras directas a `inventory` collection desde código Woo (T-10).
- Soft delete verificado: producto Woo trashed → Katuq doc con `disponibilidad.activo: false` y `deletedAt` poblado.
- Reactivación verificada: producto Woo publish después de trash → `disponibilidad.activo: true` y `deletedAt` cleared.
- Cursor avanza solo en batches exitosos.
- CONTRACT.md actualizado: spec 003.3 `approved → done`.
- README de specs actualizado.
