# Findings 003 — Estado real del sistema WooCommerce en Katuq

> **Lectura obligatoria** antes de tocar cualquier código WooCommerce. Datos verificados contra el repositorio el 2026-05-20.
> Si en una sesión futura un dato no coincide con la realidad, actualizar este documento ANTES de proceder.

---

## 0. Cómo se obtuvo cada dato

Auditoría exhaustiva via Explore en paralelo el 2026-05-20:
- Backend: `katuq_admin_back_firebase/functions/services/woocommerce*`, `controllers/woocommerce*`, `routers/woocommerce*`, `services/flows/nodes/woocommerce/`, `services/integrationConfigService.js`.
- Frontend: `Seller.Katuq/src/app/components/integrations/`, `components/flows/flow-templates/`.
- Comparación canónica vs `services/shopify/`, `services/flows/nodes/shopify/`.

Si dudas de un dato, ejecutar el grep correspondiente o leer el file:line citado.

---

## 1. Servicios backend WooCommerce

### `services/woocommerceService.js` (369 LOC, 8 exports — actualizado 2026-05-20 con `findProductBySku`)

| Función exportada | Firma | Estado |
|---|---|---|
| `getWooCommerceApiClient(companyId)` | `→ Promise<AxiosInstance>` | ✅ Funcional, cache en memoria por companyId |
| `syncInventory(companyId, woocommerceProductId, quantity)` | `→ Promise<{success, newQuantity}>` | ✅ Funcional, PUT `/products/{id}` con `stock_quantity` |
| `syncVariationInventory(companyId, parentId, variationId, quantity)` | idem | ✅ Funcional |
| `getProductVariations(companyId, productId)` | `→ Promise<Array>` | ✅ Funcional, retorna `[]` en error |
| `findProductBySku(companyId, sku)` | `→ Promise<Object\|null>` | ✅ **agregado 2026-05-20** (fix B-WOO-1) |
| `createProduct(companyId, katuqProduct)` | `→ Promise<{id, sku, status, ...}>` | ✅ Funcional, mapea Katuq→Woo simple |
| `updateProduct(companyId, wooProductId, katuqProduct)` | idem | ✅ Funcional, condicional categorías/tags/imágenes |
| `deleteProduct(companyId, wooProductId)` | `→ Promise<boolean>` | ✅ Funcional, hard delete (`force: true`) |

**Comparativa Shopify**: `shopifyService.js` tiene 1240 LOC, 26 exports — incluye OAuth refresh, throttle GraphQL, fulfillment, refunds, customers, locations, metafields. WooCommerce no tiene equivalentes.

---

## 2. Nodos /flows WooCommerce

Bajo `services/flows/nodes/woocommerce/`:

| Archivo | spec.type | Kind | Multi-tenant? | Estado |
|---|---|---|---|---|
| `woo-order-trigger.trigger.js` | `woocommerce-order-event` | trigger | Declara `credentials: ['woocommerce']` pero NO carga companyId dinámico en ctx (B-WOO-6) | ⚠️ Stub: solo bridge `onWooWebhook()` al eventBus |
| `woo-product-upsert.action.js` | `woocommerce-product-upsert` | action | idem | ✅ **Fix B-WOO-1 aplicado 2026-05-20** (era `TypeError: findProductBySku is not a function`) |

**Comparativa Shopify** (`services/flows/nodes/shopify/`, 9 nodos):
- 4 triggers: `shopify-order-created`, `shopify-order-updated`, `shopify-product-changed`, `shopify-inventory-changed`
- 5 actions: `shopify-order-create`, `shopify-product-upsert`, `shopify-fulfillment-create`, `shopify-bulk-product-sync`, `shopify-inventory-adjust`

**Gap nodos**: faltan 3 triggers + 4 actions Woo para paridad. Lista detallada en 003.4.

---

## 3. Controllers + Router WooCommerce

### `controllers/woocommerceWebhook.js` (2839 LOC)

Handlers expuestos:
- `orderCreated`, `orderUpdated`, `orderDeleted`
- `productCreated`, `productUpdated`, `productDeleted`
- `customerCreated`, `customerUpdated`, `customerDeleted`
- `addToCart`, `genericWooCommerceWebhook`

Funciones auxiliares inline:
- `mapWooProductToKatuq()` — duplicada de `woocommerceIntegration.js`
- `mapWooCommerceLocation()` — mapeo departamentos CO (ej. "CO-ANT" → "Antioquia")
- `parsePhone()`, `getWooCommerceConfig()`

**Anti-pattern detectado**: 2839 LOC todo inline sin pipeline secure (dedup/queue/worker/processors). Comparar con `services/shopify/processors/` (orders, products, inventory, fulfillments, refunds, compliance — 6 archivos modulares).

### `controllers/woocommerceIntegration.js` (1056 LOC)

Solo expone `importAllProducts(req, res)` para import masivo manual. Falta:
- Endpoint de test conexión (necesario para AC-WOO-02).
- Endpoint de sync incremental triggerable manualmente.

### `routers/woocommerceWebhook.js` (46 LOC)

Endpoints expuestos:
- `POST /order/{created,updated,update,deleted}` (alias múltiples)
- `POST /product/{created,updated,deleted}`
- `POST /customer/{created,updated,deleted}`
- `POST /action/add_to_cart`
- `POST /:topic/:action` (genérico catch-all)

**Bugs documentados**:
- **B-WOO-3** (router línea 9): `// router.use(woocommerceWebhookController.verifyWooCommerceSignature);` HMAC desactivado. **Viola Artículo X** de constitución.
- **B-WOO-4** (router completo): sin `authMiddleware` ni `companyMiddleware`. No asocia `companyId` del path al request.
- Sin rate-limit por origen.

---

## 4. Schema `integrationConfigService.PROVIDER_SCHEMAS`

Bloque WooCommerce literal (líneas 41-45):

```js
woocommerce: {
  required: ["consumerKey", "consumerSecret", "storeUrl", "webhookSecret"],
  optional: ["version", "verifySsl"],
  sensitive: ["consumerSecret", "webhookSecret"],
},
```

Comparativa Shopify (líneas 28-40):

```js
shopify: {
  required: ["shopDomain"],
  optional: ["apiVersion", "webhookSecret", "scopes", "accessToken", "clientId", "clientSecret"],
  sensitive: ["accessToken", "webhookSecret", "clientSecret"],
},
```

**Gap schema**: para cumplir AC-WOO-07 y AC-WOO-10, Woo necesita agregar a `optional`: `bodegaCode, syncIntervalMinutes, enabled` + bloque `defaults: { apiVersion: 'wc/v3', verifySsl: true, syncIntervalMinutes: 15, enabled: true }`. Detalle en 003.1.

---

## 5. Frontend /integrations

### `integrations.service.ts`

- Línea 750: `getDisplayNameForProvider()` retorna `'WooCommerce'` ✅
- Línea 772-775: `getCategoryForProvider()` mapea Woo → `ECOMMERCE` ✅
- Línea 1211-1216: `getAvailableIntegrations()` lista Woo como `active: true` con logo + descripción ✅
- Línea 1989: `getDocumentationUrl()` NO incluye Woo → retorna `null` ❌ **gap UX** (003.1)
- Línea 2008: `getSelectedIntegrationName()` NO incluye Woo → fallback genérico ❌ **gap UX** (003.1)

### `integrations.component.ts`

- Línea 821-832: `createWooCommerceForm()` — 7 campos: `name, enabled, storeUrl, consumerKey, consumerSecret, webhookSecret, apiVersion, verifySsl`. ✅ **rename B-WOO-2 aplicado 2026-05-20** (`siteUrl`→`storeUrl`).
- Línea 1309-1318: `buildCredentials()` case Woo — mapea form al payload backend. ✅ alineado tras rename.
- Línea 1713: `'storeUrl': 'URL de la Tienda'` (mapeo pretty-name UI). ✅
- Línea 1729: `'storeUrl': 'fa-link'` (mapeo ícono). ✅

### `integrations.component.html`

- Línea 983-1100 (aprox): bloque `*ngIf="selectedIntegrationType === 'woocommerce'"` con form. ✅ **rename B-WOO-2 aplicado 2026-05-20**.

**Gap UX (003.1)**:
- Falta info-box con instrucciones paso a paso + screenshots.
- Falta caja "Configurar webhook entrante" con URL `https://back.katuq.com/v1/woocommerce/webhook/{companyId}` + botón copiar.
- Falta picker `bodegaCode` (análogo al de Osmosis).
- Faltan mapeos en `getDocumentationUrl()` y `getSelectedIntegrationName()`.

---

## 6. Frontend /flows — templates UI ya existe

- `Seller.Katuq/src/app/components/flows/flow-templates/` — componente ya existente.
- Backend: `flowsController.js` línea 1 define `const FLOW_TEMPLATES = 'flow_templates';` y expone CRUD inline (sin `templateService.js` separado).

**Implicación para 003.5**: no crear componente nuevo, solo:
- Poblar `flow_templates` collection con 3 docs Woo via script `scripts/seed-woocommerce-templates.js`.
- Verificar que `flow-templates/` componente filtra por proveedor (chip Woo). Si no, agregar filtro.

---

## 7. Bugs documentados (estado al 2026-05-20)

| ID | Bug | Archivo:línea | Estado |
|---|---|---|---|
| **B-WOO-1** | `findProductBySku()` no existía en service, nodo `woo-product-upsert` lanzaba `TypeError` | `services/woocommerceService.js` + `services/flows/nodes/woocommerce/woo-product-upsert.action.js:46` | ✅ **FIXED 2026-05-20** (commit Fase 0c) |
| **B-WOO-2** | Mismatch `siteUrl` (form Angular) vs `storeUrl` (schema backend) | `integrations.component.{ts:825,1311},html:994-1002` | ✅ **FIXED 2026-05-20** (D-021, commit Fase 0d) |
| **B-WOO-3** | HMAC SHA-256 desactivado en router webhook | `routers/woocommerceWebhook.js:9` | ⚠️ **ABIERTO** — aborda 003.2 |
| **B-WOO-4** | Sin `authMiddleware` / `companyMiddleware` en router | `routers/woocommerceWebhook.js` | ⚠️ **ABIERTO** — aborda 003.2 |
| **B-WOO-5** | `woocommerceWebhook.js` 2839 LOC inline sin pipeline secure | todo el archivo | ⚠️ **ABIERTO** — aborda 003.2 |
| **B-WOO-6** | Nodos Woo no reciben `companyId` dinámico via `$companyConfig` | `nodes/woocommerce/*.js` | ⚠️ **ABIERTO** — aborda 003.4 |

---

## 8. Gap WooCommerce vs Shopify (arquitectura paralela a crear)

| Capa | Shopify (canónico) | WooCommerce (hoy) | Gap a cerrar |
|---|---|---|---|
| service core | `services/shopifyService.js` (1240 L) | `services/woocommerceService.js` (369 L) | +19 métodos en 003.2/3/4 |
| queries paginadas | `services/shopify/queries.js` (12.6k L GraphQL) | n/a (REST) | crear `services/woocommerce/queries.js` (003.3) |
| mappers | `services/shopify/mappers/{product,variant,gid,order}.js` | inline en controllers | crear `services/woocommerce/mappers/{product,order}.js` (003.2/3) |
| webhook dedup | `services/shopify/webhookDedup.js` (2622 L) | n/a (cache memoria inline) | crear `services/woocommerce/webhookDedup.js` (003.2) |
| webhook queue | `services/shopify/webhookQueue.js` (2260 L) | n/a | crear `services/woocommerce/webhookQueue.js` (003.2) |
| webhook worker | `workers/shopifyWebhookWorker.js` | n/a | crear `workers/woocommerceWebhookWorker.js` (003.2) |
| processors | `services/shopify/processors/{orders,products,inventory,fulfillments,refunds,compliance}.js` | n/a (inline) | crear `services/woocommerce/processors/{orders,products,inventory,fulfillments}.js` (003.2/3) |
| logger | `services/shopify/logger.js` | console.log directo | crear `services/woocommerce/logger.js` (003.2) |
| helpers HMAC | `services/shopify/webhookSecurityService` | n/a (comentado) | crear `services/woocommerce/helpers/auth.js` (003.2) |
| nodos triggers | 4 | 1 (stub) | +3 (003.4) |
| nodos actions | 5 | 1 (con bug fixed) | +5 (003.4) |
| schema | shopDomain + accessToken + OAuth fields | storeUrl + consumerKey + consumerSecret | +bodegaCode +syncIntervalMinutes +defaults (003.1) |
| UI integraciones | form 8 campos + screenshots + docs link | form 8 campos sin help | +info-box +URL webhook +bodegaCode picker +docs link (003.1) |
| Templates en `flow_templates` | (no verificado si Shopify tiene templates) | 0 | +3 Woo templates (003.5) |
| Tests/fixtures | suite integración | 0 | crear `fixtures/woocommerce/*.json` + tests (003.6) |

---

## 9. Tenants con WooCommerce activo

**No verificado al 2026-05-20.** No tenemos confirmación operativa de un comercio piloto con WooCommerce activo. D-018 dice "sin piloto inicial — construir contra REST API v3 + fixtures".

Cuando aparezca el primer piloto:
- Auditar `integration_configs/{COMPANY}_woocommerce` para validar schema usado.
- Si schema difiere del propuesto en 003.1, escalar como bloqueante a 003.6.

---

## 10. Implicaciones para sub-specs (priorizadas)

| # | Insight | Sub-spec impactada |
|---|---|---|
| 1 | Schema backend ya alineado tras B-WOO-2 fix; falta solo agregar `bodegaCode`, `syncIntervalMinutes`, defaults | 003.1 |
| 2 | UX `/integrations` 90% listo; faltan 4 piezas (info-box, URL webhook, picker bodega, 2 mapeos) | 003.1 |
| 3 | HMAC desactivado es violación de Art X — máxima prioridad | 003.2 |
| 4 | Pipeline secure (dedup+queue+worker+processors) NO existe — copiar arquitectura Shopify | 003.2 |
| 5 | Sync productos no existe — crear cron + paginación + mappers + soft delete | 003.3 |
| 6 | Mapper Woo DEBE usar `inventoryService.updateStock()` para evitar doble conteo (R-WOO-02) | 003.3 |
| 7 | Faltan 3 triggers + 5 actions multi-tenant — gap mayor para llegar a paridad Shopify | 003.4 |
| 8 | Templates UI ya existe en front + backend → solo poblar `flow_templates` con 3 docs Woo | 003.5 |
| 9 | Sin tenants pilotos → tests E2E contra fixtures + Firestore Emulator | 003.6 |
| 10 | Constitución Art VI estrictamente: 0 `if (provider === 'woocommerce')` en UI de /flows o /integrations | Todas |
