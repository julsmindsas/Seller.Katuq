# Tasks 003.2 — WooCommerce: pipeline seguro de webhook entrante

> Estado: **draft** (2026-05-20)
> Vinculado a `plan.md`.

## Convenciones
- `[P]` = paralelizable.
- `(deps: T-NN)` = dependencia explícita.

## Tareas

### T-01 — `services/woocommerce/helpers/auth.js` con HMAC SHA-256 verify `[P]`
- **Input:** spec WooCommerce REST API sobre cabecera `X-WC-Webhook-Signature` (base64 de HMAC SHA-256 sobre body crudo).
- **Output:** módulo con `computeSignature(body, secret) → string base64` y `verifyWooCommerceSignature(req, res, next)` middleware Express.
- **Criterio de éxito:**
  - Middleware lee `X-WC-Webhook-Signature`, calcula HMAC sobre `req.rawBody` (necesita `express.raw({type:'application/json'})` montado antes), compara timing-safe con `crypto.timingSafeEqual`.
  - Si match → `next()`.
  - Si no match → escribe en `wc_webhook_rejected/{companyId}/events/{autoId}` y responde 401 `{error: 'invalid_signature'}`.
  - 3 unit tests: fixture firmado correcto, fixture firma errónea, sin cabecera.
- **Archivos:** `katuq_admin_back_firebase/functions/services/woocommerce/helpers/auth.js` (nuevo).
- **Dependencias:** ninguna.

### T-02 — `services/woocommerce/helpers/sanitize.js` `[P]`
- **Output:** función `removeSensitive(obj) → obj clonado sin campos peligrosos`.
- **Criterio de éxito:**
  - Elimina recursivamente keys: `consumerSecret, webhookSecret, password, ccv, cardNumber, fullCardNumber`.
  - Trunca `phone` a `+57***1234`, `document` a `***1234`.
  - 5 unit tests con objetos anidados.
- **Archivos:** `services/woocommerce/helpers/sanitize.js` (nuevo).

### T-03 — `services/woocommerce/logger.js` estructurado (deps: T-02) `[P]`
- **Output:** logger con métodos `info(msg, ctx)`, `warn`, `error`. `ctx` se sanitiza con T-02 antes de escribir.
- **Criterio de éxito:**
  - Inyecta `correlationId`, `service: 'woocommerce-webhook'`, `timestamp ISO` en cada log.
  - Salida stdout JSON (compatible con stack logging existente).
- **Archivos:** `services/woocommerce/logger.js` (nuevo).

### T-04 — `services/woocommerce/webhookDedup.js` con Firestore atomic claim (deps: T-03)
- **Output:** función `claimDedupKey(deliveryId, companyId) → {claimed: boolean, claimedAt?, expiresAt?}`.
- **Criterio de éxito:**
  - Usa `db.runTransaction` para crear doc `wc_webhook_dedup/{deliveryId}_{companyId}` solo si no existe.
  - Si ya existe (no expirado), retorna `{claimed: false, claimedAt}`.
  - TTL 24h via campo `expiresAt`; doc se borra por cron separado (spec 003.6 incluye este cleanup).
  - 4 unit tests con Firestore Emulator: first call claims, second call returns duplicate, expirado se puede re-claim, concurrencia 2 paralelos solo 1 wins.
- **Archivos:** `services/woocommerce/webhookDedup.js` (nuevo).
- **Dependencias:** T-03.

### T-05 — `services/woocommerce/webhookQueue.js` (deps: Q-003.2-01 resuelta)
- **Input:** decisión sobre PubSub vs in-memory queue.
- **Output:** módulo con `enqueue(job) → Promise`, `subscribe(handler)`.
- **Criterio de éxito:**
  - Si PubSub disponible: publica al topic `woocommerce-webhooks`.
  - Si no: in-memory FIFO con persistencia en Firestore `wc_webhook_queue/{jobId}` como red de seguridad.
  - Retry budget: 3 attempts con backoff exponencial (1s, 3s, 9s).
  - Tras 3 fallos: mueve a `wc_webhook_dlq/{companyId}/events/{deliveryId}`.
- **Archivos:** `services/woocommerce/webhookQueue.js` (nuevo).
- **Dependencias:** T-03.

### T-06 — `services/woocommerce/webhookWorker.js` consumer (deps: T-05)
- **Output:** worker que escucha cola y dispatchea a `processors[topic]`.
- **Criterio de éxito:**
  - Mapeo topic → processor: `order.created` → `processors/orders.handleOrderCreated`, `order.updated` → `handleOrderUpdated`, `order.deleted` → `handleOrderDeleted`, similar para product.* (handlers de product van en processors/products.js a crear en spec 003.3 — esta spec deja stub).
  - Si topic desconocido: log warning + ack (no retry).
  - Si processor throw: incrementa attempts, espera backoff, reintenta. Si attempts >= 3, mueve a DLQ.
- **Archivos:** `services/woocommerce/webhookWorker.js` (nuevo).
- **Dependencias:** T-05.

### T-07 — `services/woocommerce/processors/orders.js` (deps: T-04, T-06)
- **Output:** módulo con `handleOrderCreated(event)`, `handleOrderUpdated`, `handleOrderDeleted`.
- **Criterio de éxito:**
  - `handleOrderCreated`: mapea payload Woo → schema Katuq `orders` collection, escribe doc con `sourceOrder: 'woocommerce'`, `integrations.woocommerce.order_id`, `integrations.woocommerce.statusHistory: [{...}]` inicial.
  - `handleOrderUpdated`: read-modify-write con `arrayUnion` en `statusHistory`.
  - `handleOrderDeleted`: setea `estadoPago: 'Cancelado'` + `integrations.woocommerce.deletedAt: ISO`. NO borra doc.
  - Tras escritura exitosa: marca `wc_webhook_log.processed = true, processedAt = ISO`.
  - Extrae lógica de mapper desde `controllers/woocommerceWebhook.js` (no duplicar).
- **Archivos:**
  - `services/woocommerce/processors/orders.js` (nuevo).
  - `services/woocommerce/mappers/order.js` (nuevo, extraído de controller).
- **Dependencias:** T-04, T-06.

### T-08 — Router cambios: HMAC activo + middlewares + endpoint canónico (deps: T-01, T-04, T-05, T-07)
- **Output:** router con pipeline secure montado.
- **Criterio de éxito:**
  - Endpoint canónico: `POST /v1/woocommerce/webhook/:companyId` registrado con `[rateLimit, companyMiddleware, express.raw, verifyWooCommerceSignature, persistRaw, dedupCheck, enqueue, respond200]`.
  - Descomentado línea 9 anterior (HMAC).
  - Endpoints legacy (`/order/created`, etc.) bajo nuevo middleware → ruta a misma pipeline + log warning `[DEPRECATED] use /v1/woocommerce/webhook/:companyId`.
  - `companyMiddleware`: decode `:companyId`, busca config en `integration_configs`, si no existe → 404 `{error: 'company_not_configured'}`.
  - `persistRaw`: escribe doc en `wc_webhook_log` ANTES del dedup.
  - Rate-limit: 60 req/min por `companyId`, retornar 429 con `Retry-After: 60`.
- **Archivos:**
  - `katuq_admin_back_firebase/functions/routers/woocommerceWebhook.js` (modificar).
  - `index.js` (registrar endpoint canónico si no estaba).
  - Posible nuevo `routers/woocommerce.js` si separar legacy.
- **Dependencias:** T-01, T-04, T-05, T-07.

### T-09 — Contract tests del endpoint canónico (deps: T-08)
- **Output:** 8 tests passing con Firestore Emulator.
- **Criterio de éxito:**
  - Test 1: fixture firmado válido → 200 `{accepted: true}` + doc en `wc_webhook_log`.
  - Test 2: firma inválida → 401 + doc en `wc_webhook_rejected`.
  - Test 3: sin cabecera firma → 401.
  - Test 4: mismo `deliveryId` 2× → 1× 200 accepted + 1× 200 duplicate.
  - Test 5: companyId no configurado → 404.
  - Test 6: 70 req/min mismo companyId → últimas 10 con 429.
  - Test 7: payload `order.created` válido → eventualmente (await worker) doc en `orders` collection.
  - Test 8: processor lanza error 3× → doc en `wc_webhook_dlq`.
- **Archivos:** `tests/woocommerce/webhook-pipeline.test.js` (nuevo).
- **Dependencias:** T-08.

### T-10 — Cleanup periódico de `wc_webhook_dedup` expirados `[P]`
- **Output:** cron job que borra entries con `expiresAt < now`.
- **Criterio de éxito:**
  - Job registrado en `cron_jobs_config` (spec 002.8) con `cronExpression: '0 */6 * * *'` (cada 6h).
  - Lee batches de 500 y elimina via `BulkWriter`.
  - Log de N entries eliminados.
- **Archivos:** `services/woocommerce/cleanupDedupExpired.js` (nuevo). Registrar en seed de crones del sistema.
- **Dependencias:** T-04.

### T-11 — Feature flag `WC_PIPELINE_V2` y rollout (deps: T-09)
- **Output:** flag activable por env + por empresa.
- **Criterio de éxito:**
  - `process.env.WC_PIPELINE_V2 === 'true'` activa endpoint canónico.
  - Override por empresa via `integration_configs.{COMPANY}_woocommerce.usePipelineV2`.
  - Default `false` 7 días → activar staging → flip a `true` en prod.
- **Archivos:** `services/woocommerce/featureFlag.js` (nuevo) + middleware en router.
- **Dependencias:** T-09.

## Orden de ejecución sugerido

```
Día 1: T-01 [P] T-02 [P] T-10 [P]
Día 2: T-03 (deps T-02) → T-04 (deps T-03)
Día 3: T-05 → T-06
Día 4: T-07 → T-08
Día 5: T-09 → T-11
```

## Definition of Done

- 8/8 contract tests passing (T-09).
- HMAC activo en producción para nuevos endpoints (canónico).
- Endpoints legacy emiten warning `[DEPRECATED]` en logs por 30 días.
- 0 entries en `wc_webhook_log` con `processed: false` y `receivedAt < now - 1h` (todas procesadas).
- CONTRACT.md actualizado: registrar `B-WOO-3, B-WOO-4, B-WOO-5` como CLOSED.
- Spec 003.2 marcada `approved → done`.
- Feature flag retirado 60 días post-merge (Art XII — incluir tarea en backlog).
