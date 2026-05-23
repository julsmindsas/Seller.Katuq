# Sub-specs hijas de 003 — Plan de ejecución del 360 WooCommerce

> Cada sub-spec se desarrolla en su propia carpeta `/specs/003.N-slug/{spec,plan,tasks}.md`. Esta página es el roadmap maestro.

---

## Orden de ejecución (con razón)

```
                  Fase 0 (bugs B-WOO-1, B-WOO-2 ya fixed)
                                 │
                                 ▼
003.1 (schema + UX /integrations)
       ├──────────► 003.2 (webhook secure pipeline)
       │
       └──────────► 003.3 (product sync incremental)
                            │
                            ▼
            003.4 (nodos /flows multi-tenant via $companyConfig)
                            │
                            ▼
            003.5 (templates plug-and-play seed + UI catálogo)
                            │
                            ▼
            003.6 (acceptance suite + sello D-WOO-360-MVP)
                            │
                            ▼
                          004 (docs usuario final)
```

**Razón del orden**:
- **003.1 primero** porque sin schema + UX no se pueden persistir credenciales (todo lo demás depende).
- **003.2 y 003.3 en paralelo** porque webhook (inbound) y cron sync (outbound paginado) son independientes — ninguno bloquea al otro y son los dos canales de Woo→Katuq.
- **003.4 sigue** porque nodos `/flows` necesitan los services completos (003.2 mappers + 003.3 fetch products).
- **003.5 sigue** porque templates plug-and-play instancian flows que usan los nodos de 003.4.
- **003.6 cierra** con sello D-WOO-360-MVP cuando 8/8 tests E2E pasan.
- **004** documenta el resultado para el comerciante final una vez 003.6 sellado.

---

## 003.1 — `woocommerce-integration-schema-ux`

**Problema**: schema PROVIDER_SCHEMAS.woocommerce no tiene `bodegaCode` ni defaults. Form `/integrations` carece de info-box paso a paso, URL del webhook copy-paste-able, picker bodegaCode, y 2 mapeos faltantes en `integrations.service.ts`.

**Scope**:
- Ampliar schema en `services/integrationConfigService.js`:
  ```js
  woocommerce: {
    required: ['storeUrl', 'consumerKey', 'consumerSecret'],
    optional: ['webhookSecret', 'apiVersion', 'verifySsl', 'bodegaCode', 'syncIntervalMinutes', 'enabled'],
    sensitive: ['consumerSecret', 'webhookSecret'],
    defaults: { apiVersion: 'wc/v3', verifySsl: true, syncIntervalMinutes: 15, enabled: true }
  }
  ```
- Frontend `/integrations` (extender, NO componente nuevo D-019):
  - `integrations.service.ts:1989` → agregar entrada `woocommerce` en `getDocumentationUrl()`.
  - `integrations.service.ts:2008` → agregar entrada en `getSelectedIntegrationName()`.
  - `integrations.component.ts:821-832` → agregar control `bodegaCode` (con validador required).
  - `integrations.component.ts:1309-1318` → agregar `bodegaCode` en `buildCredentials()`.
  - `integrations.component.html` (bloque `*ngIf="selectedIntegrationType === 'woocommerce'"`):
    - Info-box con 3 pasos numerados + screenshots (assets/integrations/woocommerce/step-{1,2,3}.png).
    - Caja "Configurar webhook entrante" con URL `https://back.katuq.com/v1/woocommerce/webhook/{companyId}` interpolada con `SecurityService.getCompanyInformationLogged().company`, botón "copiar al portapapeles", instrucciones cortas.
    - Picker `bodegaCode` (reusar `BodegaService.list()`, mostrar `bodega.activa === true` por default Q-WOO-01).

**Criterios EARS clave**:
- THE system SHALL persistir `bodegaCode` en `integration_configs/{COMPANY}_woocommerce.credentials.bodegaCode`.
- WHEN el comerciante abre `/integrations` y selecciona Woo, THE form SHALL renderizar las 3 instrucciones paso a paso + URL webhook visible + picker bodega.
- IF el comerciante no completa `bodegaCode`, THEN el form SHALL bloquear el botón "Guardar" con mensaje friendly.

**Tests aceptación**:
- Backend: PROVIDER_SCHEMAS validate retorna error si falta `bodegaCode` (cuando se requiere a partir de fase 003.3).
- Frontend: snapshot del bloque Woo en HTML con todos los nuevos elementos.

**Esfuerzo**: 0.5 día.

---

## 003.2 — `woocommerce-webhook-secure-pipeline`

**Problema**: el webhook entrante de WooCommerce NO valida HMAC (B-WOO-3 viola Art X), no tiene auth de Katuq (B-WOO-4), procesa todo inline en 2839 LOC sin idempotencia real (B-WOO-5).

**Scope**: replicar arquitectura Shopify (no copiar código, replicar patrón):

```
services/woocommerce/
├── helpers/auth.js          (HMAC SHA-256 verify usando webhookSecret)
├── webhookDedup.js          (Firestore collection wc_webhook_dedup, key X-WC-Webhook-Delivery-ID, TTL 24h)
├── webhookQueue.js          (PubSub/Cloud Tasks idempotente)
├── webhookWorker.js         (consumer del queue)
├── processors/orders.js     (handler order.created / order.updated / order.deleted)
├── logger.js                (structured logs con correlationId)
└── ...
```

Router `routers/woocommerceWebhook.js`:
- Descomentar `router.use(helpers/auth.verifyWooCommerceSignature)` (B-WOO-3 fix).
- Agregar `companyMiddleware` que parsea `:companyId` del path (B-WOO-4 fix).
- Agregar `rate-limit` middleware (60 req/min/companyId).
- Definir endpoint canónico `POST /v1/woocommerce/webhook/:companyId` (el bridge usado en AC-WOO-04).
- Conservar endpoints legacy (`/order/created`, etc.) durante deprecación 30 días.

**Criterios EARS clave** (heredados de §3 spec.md):
- AC-WOO-04, AC-WOO-05, AC-WOO-06.
- Adicional: IF un evento se rechaza por HMAC, THEN THE system SHALL persistir en `wc_webhook_rejected` (audit) con metadata pero NO en `wc_webhook_dedup`.

**Tests aceptación**:
- Fixture firmado a mano contra `webhookSecret` conocido → POST devuelve 200.
- Mismo fixture con firma manipulada → POST devuelve 401.
- Mismo fixture POSTeado 2× con mismo `X-WC-Webhook-Delivery-ID` → segundo retorna 200 `{duplicate: true}` (verificable en logs).
- `wc_webhook_dedup` collection contiene exactamente 1 entry post-doble-POST.

**Esfuerzo**: 1 día.

**Riesgo R-WOO-01**: validar HMAC contra WooCommerce sandbox o fixture oficial antes de mergear.

---

## 003.3 — `woocommerce-product-sync-incremental`

**Problema**: no existe sync de productos Woo → Katuq. El catálogo nunca llega a Katuq automáticamente.

**Scope** (Woo → Katuq unidireccional, D-016):

```
services/woocommerce/
├── queries.js                       (getProducts(page, per_page=100), getOrders, getCustomers)
├── mappers/
│   ├── product.js                   (woo product → Katuq product schema)
│   └── variant.js                   (woo variation → Katuq variant)
└── processors/
    ├── products.js                  (sync masivo + upsert via katuq-product-upsert)
    └── inventory.js                 (usa inventoryService.updateStock() — R-WOO-02)
```

Endpoint backend nuevo: `POST /v1/woocommerce/sync/products/:companyId` (sync manual triggerable desde botón).

**Soft delete (D-017)**:
- WHEN webhook `product.deleted` o producto sync con `status: 'trash'`, THEN setear `disponibilidad.activo: false` en Katuq. NO borrar doc.
- WHEN producto vuelve a aparecer en Woo con `status: 'publish'`, THEN reactivar (`disponibilidad.activo: true`).

**Criterios EARS clave**:
- AC-WOO-07, AC-WOO-08, AC-WOO-09 (heredados spec.md §3).
- IF WooCommerce devuelve 429, THEN backoff exponencial (1s, 3s, 9s) hasta 3 intentos antes de skip-tick.
- IF mapper produce error en producto N, THEN log estructurado con `wooProductId` y continuar con N+1 (no abortar todo el batch).

**Tests aceptación**:
- Fixture `wc-product-created.json` (200 productos) → suite ejecuta `processors/products.js` → 200 docs en `products` collection con `integrations.woocommerce.product_id` poblado.
- Fixture `wc-product-deleted.json` → `disponibilidad.activo: false` en doc Katuq.
- Verificar 0 escrituras en `inventory` colección directo (siempre via `inventoryService.updateStock`).

**Esfuerzo**: 1.5 días.

---

## 003.4 — `woocommerce-flow-nodes`

**Problema**: solo 2 nodos Woo en `/flows` (stub + bug fixed). Para paridad con Shopify se necesitan 4 triggers + 6 actions, todos multi-tenant via `$companyConfig` (Art VI + patrón 002.7).

**Scope** (`services/flows/nodes/woocommerce/`):

| Tipo | Nodo (filename) | spec.type | Reemplaza | Detalle |
|---|---|---|---|---|
| trigger | `woocommerce-order-created.trigger.js` | `woocommerce-order-created` | woo-order-trigger genérico | Webhook bridge |
| trigger | `woocommerce-order-updated.trigger.js` | `woocommerce-order-updated` | — | nuevo |
| trigger | `woocommerce-product-changed.trigger.js` | `woocommerce-product-changed` | — | created/updated/deleted bundled |
| trigger | `woocommerce-inventory-changed.trigger.js` | `woocommerce-inventory-changed` | — | nuevo |
| action | `woocommerce-product-upsert.action.js` | `woocommerce-product-upsert` | renombrar woo-product-upsert | multi-tenantizar |
| action | `woocommerce-order-create.action.js` | `woocommerce-order-create` | — | crear order en Woo desde Katuq |
| action | `woocommerce-order-status-update.action.js` | `woocommerce-order-status-update` | — | set status + note (Q-WOO-04) |
| action | `woocommerce-inventory-adjust.action.js` | `woocommerce-inventory-adjust` | — | usa syncInventory existente |
| action | `woocommerce-fetch-products.action.js` | `woocommerce-fetch-products` | — | paginado para cron (003.3) |
| action | `woocommerce-fulfillment-create.action.js` | `woocommerce-fulfillment-create` | — | fase 2 si piloto pide |

**Patrón multi-tenant obligatorio**:
```js
async function execute(ctx) {
  const wcCfg = ctx.$companyConfig && ctx.$companyConfig.woocommerce;
  if (!wcCfg || !wcCfg.storeUrl) {
    throw _wcConfigMissing();  // → captura 002.2 lo guarda en nodeStates[id].error.code = 'WC-CONFIG-MISSING'
  }
  // ... usar wcCfg.storeUrl, wcCfg.consumerKey, wcCfg.consumerSecret, wcCfg.bodegaCode
}
```

`companyConfigService.getCompanyConfigSnapshot(companyId)` ya carga snapshot completo (heredado de 002.7) — los nodos solo leen.

**Criterios EARS clave**:
- AC-WOO-13, AC-WOO-14, AC-WOO-15 (heredados spec.md §3).
- THE system SHALL exponer cada nodo en el registry `flow-nodes` con `displayName` amigable (ej. "WooCommerce · Recibir pedido nuevo", NO "woocommerce-order-created.trigger").

**Tests aceptación**:
- Ejecutar nodo aislado con `ctx.$companyConfig.woocommerce = fixtures` → output esperado.
- Ejecutar nodo sin config → `nodeStates[id].error.code === 'WC-CONFIG-MISSING'` + mensaje friendly.
- Registry expone 10 nodos Woo con `provider: 'woocommerce'`.

**Esfuerzo**: 1.5 días.

---

## 003.5 — `woocommerce-templates-plug-and-play`

**Problema**: el comerciante hoy debe construir un flow desde cero. Viola el goal "FACIIIIIL".

**Scope**:
- Seed 3 templates en `flow_templates` collection via `scripts/seed-woocommerce-templates.js`:

| Template (docId) | Nombre amigable | Trigger | Acciones | Inputs configurables |
|---|---|---|---|---|
| `woo-sync-products-to-katuq` | Sincronizar productos de WooCommerce a Katuq | `schedule-cron` con `{{ $companyConfig.woocommerce.syncIntervalMinutes }}` | `woocommerce-fetch-products` → `katuq-product-upsert` → `katuq-inventory-adjust` | "Cada cuántos minutos" (slider 5/15/30/60), "Bodega destino" (picker) |
| `woo-orders-to-katuq` | Recibir pedidos de WooCommerce | `woocommerce-order-created` (webhook) | `katuq-order-upsert` → `katuq-inventory-adjust` | "Estado inicial del pedido" (picker), "Crear cliente si no existe" (toggle) |
| `woo-stock-katuq-to-woo` | Empujar stock de Katuq a WooCommerce (opcional) | `katuq-inventory-changed` | `woocommerce-inventory-adjust` | "Bodega origen" (picker) |

- Frontend (`Seller.Katuq/src/app/components/flows/flow-templates/`):
  - Verificar que componente filtra por proveedor (chip "WooCommerce"). Si no, agregar.
  - Al instanciar: clonar template → crear `flow_doc` con `flowId` único (`woo-sync-products-{COMPANY-hash}`) → crear `flow_trigger_binding` con `kind: 'cron'|'webhook'` → llamar `cronService.loadDynamicJobsFromFirestore()` para hot-reload.
  - Vocabulario amigable: "sincronización", "pedido", "producto", "stock", "cada cuánto", "activar/pausar". Cero menciones a "trigger", "nodo", "expression", "binding".

**Criterios EARS clave**:
- AC-WOO-13 (spec.md §3): inputs visibles sin terminología técnica.
- WHEN comerciante activa template, THE system SHALL crear `flow_doc` + `flow_trigger_binding` en ≤2s.
- WHEN comerciante pausa template, THE system SHALL setear `binding.status: 'inactive'` y NO disparar próximos ticks.

**Tests aceptación**:
- Activar template `woo-sync-products-to-katuq` con `intervalo=15min` + bodega → verificar `flow_trigger_binding.kind === 'cron'`, `cronExpression === '*/15 * * * *'`.
- `cronService.getCronsHealth().inMemorySchedulers.flowCronJobsCount` incrementa en 1.
- Primer tick post-activación produce `flow_runs[].status: 'success'`.

**Esfuerzo**: 1 día.

---

## 003.6 — `woocommerce-acceptance-suite`

**Problema**: cómo verificar que el 360 WooCommerce está cerrado de verdad.

**Plan**: 8 tests E2E binarios contra fixtures + Firestore Emulator (Q-WOO-06 default).

| # | Test | Criterio binario PASS/FAIL |
|---|---|---|
| 1 | Configurar Woo en `/integrations` con bodegaCode + URL webhook visible | Form persiste, doc en `integration_configs/{TEST}_woocommerce.credentials` con `bodegaCode` |
| 2 | HMAC rechaza POST sin firma | 401 retornado, log estructurado emite |
| 3 | Dedup retorna `{duplicate: true}` en segundo POST mismo `X-WC-Webhook-Delivery-ID` | Verificable en logs + `wc_webhook_dedup` collection |
| 4 | Cron sync productos 15min crea/actualiza producto en Katuq | `products.where('integrations.woocommerce.product_id', '==', N)` retorna doc |
| 5 | Webhook `order.created` crea pedido en Katuq con `sourceOrder: 'woocommerce'` | Doc en `orders` collection con campos mapeados |
| 6 | Webhook `product.deleted` aplica soft delete (`disponibilidad.activo: false`) | Doc Katuq existe pero inactivo |
| 7 | Nodo Woo sin config falla con `WC-CONFIG-MISSING` y mensaje friendly | `nodeStates[id].error.code === 'WC-CONFIG-MISSING'` |
| 8 | Template plug-and-play instancia flow + binding en ≤2s | Tiempo medido, doc en `flow_trigger_bindings` aparece |

**Sello**: cuando 8/8 PASS, registrar `D-WOO-360-MVP` en CONTRACT.md como sello operativo. Habilitar invitación a comercio piloto.

**Suite**: `scripts/test-woocommerce-360-acceptance.js` análogo a `test-360-acceptance.js` del 002.6.

**Esfuerzo**: 1 día.

---

## Definition of Done global (Spec 003 marco)

- Sub-specs 003.1..003.6 todas en `done`.
- 8/8 tests acceptance PASS (003.6).
- Sello `D-WOO-360-MVP` en CONTRACT.md.
- Spec 004 (docs usuario final) publicada.
- Primer comercio piloto invitado y onboarding ≤ 10 min sin contacto soporte (M-WOO-02).
