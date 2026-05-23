# Tasks 003.4 — WooCommerce: nodos `/flows` multi-tenant

> Estado: **draft** (2026-05-20)
> Vinculado a `plan.md`.

## Convenciones
- `[P]` = paralelizable.
- `(deps: T-NN)` = dependencia explícita.

## Tareas

### T-01 — `_helpers.js` con `_requireWooConfig` + `_isRetryable` + `_wcError` `[P]`
- **Output:** módulo helper compartido por todos los nodos.
- **Criterio de éxito:**
  - `_requireWooConfig(ctx)` valida y retorna config, o throw `WC-CONFIG-MISSING` (per AC-003.4-03 spec).
  - `_isRetryable(err)` retorna `true` para 408, 429, 5xx, ECONNRESET, ETIMEDOUT (copiar de `woo-product-upsert.action.js:62-68`).
  - `_wcError(code, message, retryable)` crea error con metadata estructurada.
  - 5 unit tests cubriendo escenarios de `_requireWooConfig`.
- **Archivos:** `katuq_admin_back_firebase/functions/services/flows/nodes/woocommerce/_helpers.js` (nuevo).

### T-02 — `woocommerce-order-created.trigger.js` (deps: T-01) `[P con T-03,T-04,T-05]`
- **Output:** trigger que se suscribe a eventBus topic `woocommerce.order.created`.
- **Criterio de éxito:**
  - `spec.type: 'woocommerce-order-created'`, `category: 'trigger'`.
  - `execute(ctx)` invoca `_requireWooConfig(ctx)`, retorna subscriptionId.
  - Cuando eventBus emite evento, emite item con `{json: {wooOrder, companyId, deliveryId, receivedAt}}`.
  - `dispose(ctx)` desuscribe.
  - Unit test: mock eventBus emit + verificar output esperado.
- **Archivos:** `services/flows/nodes/woocommerce/woocommerce-order-created.trigger.js` (nuevo).

### T-03 — `woocommerce-order-updated.trigger.js` (deps: T-01) `[P]`
- Idem T-02 pero topic `woocommerce.order.updated`.

### T-04 — `woocommerce-product-changed.trigger.js` (deps: T-01) `[P]`
- **Output:** trigger bundle de `product.created/updated/deleted`.
- **Criterio de éxito:**
  - `params.events: ['created','updated','deleted']` configurable (filter en runtime).
  - Suscribe a los 3 topics y emite item con `{json: {wooProduct, event, deliveryId, receivedAt}}`.

### T-05 — `woocommerce-inventory-changed.trigger.js` (deps: T-01) `[P]`
- **Output:** trigger para evento de stock (puede ser sub-evento de product.updated con `stock_quantity` cambiado).
- **Criterio de éxito:**
  - Implementación: si WC manda webhook dedicado, suscribir; si no, derivar de `product.updated` filtrando diff de `stock_quantity`.

### T-06 — `woocommerce-product-upsert.action.js` REUBICAR + multi-tenantizar (deps: T-01)
- **Output:** nuevo archivo con multi-tenancy + alias legacy.
- **Criterio de éxito:**
  - Renombrar `woo-product-upsert.action.js` → `woocommerce-product-upsert.action.js`.
  - Insertar `_requireWooConfig(ctx)` al inicio del `execute`.
  - Cambiar `spec.type: 'woocommerce-product-upsert'` (era `'woocommerce-product-upsert'` ya — verificar).
  - Mantener archivo legacy `woo-product-upsert.action.js` como alias: `spec.type: 'woocommerce-product-upsert'` mismo + log warning `[DEPRECATED] use new file name`. Eliminar 30 días post-launch.
- **Archivos:**
  - `services/flows/nodes/woocommerce/woocommerce-product-upsert.action.js` (nuevo).
  - `services/flows/nodes/woocommerce/woo-product-upsert.action.js` (modificar para ser alias).

### T-07 — `woocommerce-order-create.action.js` (deps: T-01) `[P]`
- **Output:** action que crea orden en Woo desde Katuq (futuro bidireccional fase 2, esqueleto en MVP).
- **Criterio de éxito:**
  - `params.schema: { status: enum, customer_id?, line_items, ... }`.
  - Invoca POST `/orders` con apiClient.
  - Emite item con `{json: wcOrder}`.
  - Por ahora puede ser stub que throw "not implemented in MVP" si scope no incluye (Q resolver con piloto).

### T-08 — `woocommerce-order-status-update.action.js` (deps: T-01) `[P]`
- **Output:** action para cambiar status + agregar nota.
- **Criterio de éxito:**
  - `params: { wooOrderId, status, note?, noteVisibleToCustomer? = true }`.
  - PUT `/orders/{wooOrderId}` con `{status, customer_note: note (si visible) || private_note: note}`.
  - Unit test con mock axios.

### T-09 — `woocommerce-inventory-adjust.action.js` (deps: T-01) `[P]`
- **Output:** action que llama `woocommerceService.syncInventory` o `syncVariationInventory`.
- **Criterio de éxito:**
  - `params: { wooProductId?, sku?, quantity, variationId? }`.
  - Si `variationId`: invoca `syncVariationInventory`.
  - Si `wooProductId`: invoca `syncInventory`.
  - Si solo `sku`: invoca `findProductBySku` para resolver `wooProductId` y luego ajustar.
  - Unit test cada path.

### T-10 — `woocommerce-fetch-products.action.js` (deps: T-01, 003.3 T-02)
- **Output:** action que pagina productos via `queries.getProducts`.
- **Criterio de éxito:**
  - `params: { batchSize: 100, modifiedAfter? }`.
  - Usa async iterator de `queries.getProducts(companyId, opts)`.
  - Emite un item por producto (Q-003.4-02 default).
  - Persiste cursor al final del batch en `ctx.$state.woocommerce.cursor` (si flow engine lo soporta) o en `integration_configs` directo.

### T-11 — `woocommerce-fulfillment-create.action.js` (deps: T-01) `[P]`
- **Output:** stub fase 2.
- **Criterio de éxito:**
  - spec registrada, execute throw `_wcError('NOT_IMPLEMENTED', 'Fulfillment Katuq→Woo fase 2', false)`.
  - Documenta TODO con link a issue futuro.

### T-12 — Verificar registry expone los 10 nodos `[P]`
- **Output:** test de smoke sobre `nodeRegistry.getAllByProvider('woocommerce')` retorna 10.
- **Criterio de éxito:**
  - `expect(registry.getByType('woocommerce-order-created')).toBeDefined()` para cada uno.
  - displayName amigable para cada.
- **Archivos:** test en `tests/flows/nodes/woocommerce-registry.test.js`.

### T-13 — Tests E2E flow simple (deps: T-06, T-10)
- **Output:** test que monta flow `woocommerce-fetch-products → katuq-product-upsert` y ejecuta contra fixtures.
- **Criterio de éxito:**
  - Con `ctx.$companyConfig.woocommerce = mockConfig`, ejecuta y produce N docs en `products` collection.
  - Con `ctx.$companyConfig.woocommerce = undefined`, `nodeStates['fetch'].error.code === 'WC-CONFIG-MISSING'`.

## Orden de ejecución sugerido

```
Día 1: T-01 (helpers crítico) → T-02 + T-03 + T-04 + T-05 (4 triggers paralelos)
Día 2: T-06 (upsert + alias) → T-07 + T-08 + T-09 + T-10 + T-11 (5 actions paralelas)
Día 3: T-12 + T-13 (verificación + E2E)
```

## Definition of Done

- 10 nodos visibles en `nodeRegistry.getAllByProvider('woocommerce')`.
- Cada nodo lee `ctx.$companyConfig.woocommerce` y throw `WC-CONFIG-MISSING` si falta.
- 0 referencias hardcoded a credenciales en cuerpo de nodos (auditable con grep `consumerKey =` o similar).
- Aliases legacy emiten `[DEPRECATED]` warning.
- E2E test verde con fixture multi-tenant.
- CONTRACT.md actualizado: spec 003.4 `approved → done`. B-WOO-6 cerrado.
- Backlog: tarea de eliminar aliases legacy 30 días post-launch (Art XII).
