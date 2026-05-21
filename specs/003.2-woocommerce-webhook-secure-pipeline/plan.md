# Plan 003.2 — WooCommerce: pipeline seguro de webhook entrante

> Estado: **draft** (2026-05-20)
> Vinculado a `spec.md` (pendiente approved).

## 1. Resumen técnico

Replicar arquitectura modular del pipeline Shopify (`services/shopify/{webhookDedup,webhookQueue,processors/,helpers/}`) bajo `services/woocommerce/`. Agregar middleware HMAC SHA-256 en router. Endpoint canónico `POST /v1/woocommerce/webhook/:companyId` valida firma → persiste evento crudo → check dedup → encola → worker procesa → processors escriben dominio. Mantener endpoints legacy 30 días con log warning.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | Spec 003.2 aprobada antes. |
| II — Spec captura intent | sí | Spec no nombra PubSub, axios, sha256-hmac. |
| IV — Idempotencia | sí | `wc_webhook_dedup` collection + TTL 24h + atomic claim. |
| V — Eventos crudos antes de procesar | sí | `wc_webhook_log/{companyId}/events/{eventId}` se escribe ANTES del processor. |
| VI — UI no acoplada a proveedor | n/a | Esta spec es 100% backend. |
| VII — Observabilidad | sí | Logger estructurado + métricas + provider-dashboard. |
| VIII — Test-first contratos | sí | Contract tests del endpoint webhook antes de implementación. |
| IX — Estilo Angular | n/a | Backend. |
| X — Seguridad webhooks | sí | HMAC + rate-limit + allowlist opcional + auth header. |
| XI — Datos sensibles fuera del log | sí | Logger sanitiza `consumerSecret`, `webhookSecret`, tarjetas, cédulas, teléfonos completos. |
| XIII — Spec ≤ 3 páginas | sí | spec ~3 páginas, plan ~2.5. |
| XV v2 — Canónica INGLÉS | sí | Todos los campos de la colección Woo en `integrations.woocommerce.*` inglés. Campos copiados de WC en snake_case (`order_id`, `delivery_id`, `webhook_topic`); derivados en camelCase (`receivedAt`, `processedAt`). |

## 3. Arquitectura

### 3.1 Componentes a crear

```
services/woocommerce/
├── helpers/auth.js              (HMAC SHA-256 verify usando webhookSecret de integrationConfigService)
├── webhookDedup.js              (Firestore atomic claim en wc_webhook_dedup; key = deliveryId; TTL 24h)
├── webhookQueue.js              (PubSub o equivalente: enqueue, retry, dead-letter)
├── webhookWorker.js             (consumer del queue, ruteo por topic a processors)
├── processors/orders.js         (handler order.created/updated/deleted)
├── logger.js                    (structured logger con sanitización)
└── helpers/sanitize.js          (función removeSensitive(obj) para logs)
```

Router:
- `routers/woocommerceWebhook.js` (modificar):
  - Descomentar `router.use(helpers/auth.verifyWooCommerceSignature)` línea 9.
  - Agregar `companyMiddleware` que parsea `:companyId` del path y adjunta a `req.context.companyId`.
  - Agregar middleware rate-limit (60 req/min por `companyId`).
  - Definir nuevo endpoint canónico `POST /v1/woocommerce/webhook/:companyId`.
  - Mantener endpoints legacy 30 días con log warning.

### 3.2 Diagrama

```
[WooCommerce] ─POST /v1/woocommerce/webhook/:companyId─►
                                                       │
                                                       ▼
                                          [Rate-limit middleware]
                                                       │
                                                       ▼
                                          [companyMiddleware]
                                          (decode :companyId, load config, attach to req)
                                                       │
                                                       ▼
                                          [auth.verifyWooCommerceSignature]
                                          (compute HMAC, compare X-WC-Webhook-Signature)
                                                       │
                                                       ├──── inválida ──► 401 + escribe wc_webhook_rejected
                                                       │
                                                       ▼ válida
                                          [persist raw event]
                                          wc_webhook_log/{companyId}/events/{deliveryId}
                                                       │
                                                       ▼
                                          [webhookDedup.claim(deliveryId)]
                                                       │
                                                       ├──── duplicate ──► 200 {duplicate: true}
                                                       │
                                                       ▼ claimed
                                          [webhookQueue.enqueue(deliveryId, topic, payload)]
                                                       │
                                                       ▼
                                          200 OK (respuesta sincrónica)
                                                       │
                                                       └────── (async) ──►
                                                                          │
                                                                          ▼
                                                            [webhookWorker consumes]
                                                                          │
                                                                          ▼
                                                       [processors[topic].handle(event)]
                                                                          │
                                                                          ▼
                                                              [Firestore writes]
                                                                          │
                                                                          ▼
                                                       [mark wc_webhook_log.processed]
```

### 3.3 Decisiones técnicas

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| HMAC SHA-256 base64 sobre body crudo | AC-003.2-01, Art X | SHA-1 (obsoleto), bearer token (D-019 prefirió Bearer SOLO en Cereza spec 001 — Woo sigue su pattern oficial) |
| Atomic claim en Firestore (no en memoria) | AC-003.2-03, multi-instancia EC2 | Cache en memoria: pierde dedup tras restart o entre instancias |
| Worker async consumer | AC-003.2-05 + perf p95 ≤ 800ms | Procesar sincrónico: viola perf si WC manda burst |
| Endpoint canónico nuevo + legacy 30 días | AC-003.2-10 | Breaking change inmediato: comerciantes ya configurados se rompen |
| Logger sanitiza en helper centralizado | Art XI, AC-003.2-08 | Sanitizar ad-hoc en cada call: fácil olvidar un campo |

## 4. Modelo de datos

### 4.1 Colección `wc_webhook_log/{companyId}/events/{deliveryId}`
```json
{
  "deliveryId": "string (header X-WC-Webhook-Delivery-ID)",
  "topic": "order.created | order.updated | product.created | ...",
  "companyId": "string",
  "receivedAt": "ISO 8601",
  "payloadHash": "sha256 hex del body",
  "rawBody": "string (limitar a 50KB; truncar y marcar truncatedAt)",
  "headers": { "x-wc-webhook-source": "...", "x-wc-webhook-event": "...", ... },
  "processedAt": "ISO o null",
  "processingResult": "success | failed | n/a",
  "processingError": "string opcional"
}
```

### 4.2 Colección `wc_webhook_dedup/{deliveryId}_{companyId}`
```json
{
  "deliveryId": "string",
  "companyId": "string",
  "claimedAt": "ISO",
  "expiresAt": "ISO (claimedAt + 24h)"
}
```

### 4.3 Colección `wc_webhook_rejected/{companyId}/events/{autoId}`
```json
{
  "rejectedAt": "ISO",
  "reason": "invalid_signature | missing_signature | rate_limited | ...",
  "sourceIp": "string",
  "headers": { ... },
  "bodyPreview": "primeros 200 chars"
}
```

### 4.4 Colección `wc_webhook_dlq/{companyId}/events/{deliveryId}` (dead-letter)
```json
{
  "deliveryId": "string",
  "topic": "...",
  "attempts": 3,
  "lastError": "string",
  "originalReceivedAt": "ISO"
}
```

## 5. Contratos

### 5.1 POST `/v1/woocommerce/webhook/:companyId`

Headers requeridos: `X-WC-Webhook-Signature`, `X-WC-Webhook-Delivery-ID`, `X-WC-Webhook-Topic`.
Body: JSON (raw, NO modificado por bodyParser antes del HMAC verify — usar `express.raw({type:'application/json'})` o equivalente).

### 5.2 Idempotencia
- Clave: `X-WC-Webhook-Delivery-ID`.
- Ventana: 24h (TTL en `wc_webhook_dedup`).
- Duplicado retorna 200 `{duplicate: true, deliveryId, claimedAt}` sin procesar.

### 5.3 Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Evento válido aceptado | `{accepted: true, deliveryId}` |
| 200 | Evento duplicado | `{duplicate: true, deliveryId, claimedAt}` |
| 401 | Firma inválida o ausente | `{error: 'invalid_signature'}` |
| 404 | `companyId` no tiene config Woo | `{error: 'company_not_configured'}` |
| 429 | Rate limit excedido | `{error: 'rate_limited'}` + header `Retry-After: 60` |
| 500 | Crash interno | `{error: 'internal'}` |

## 6. Estrategia de testing

- **Contract tests** (primero): endpoint con fixture firmado a mano (sha256 base64) → 200; firma inválida → 401; sin firma → 401; mismo deliveryId 2× → 200 + 200 duplicate.
- **Integration**: con Firestore Emulator + queue mock → procesar fixture `order.created` y verificar doc en `orders` collection.
- **E2E**: usar Woo sandbox público (si disponible) para enviar evento real, validar pipeline completo end-to-end (cubierto en 003.6).
- **Unit**: `helpers/auth.computeSignature(body, secret)` retorna mismo valor que WC documenta; `helpers/sanitize.removeSensitive` elimina campos esperados.

## 7. Fases de implementación

1. **Fase A — helpers/auth.js + sanitize.js** `[P]`. Contract test HMAC.
2. **Fase B — webhookDedup.js + tests**. Firestore Emulator. Atomic claim con `runTransaction`.
3. **Fase C — webhookQueue.js + webhookWorker.js** (deps: A, B). Resolver Q-003.2-01 (PubSub vs in-memory).
4. **Fase D — processors/orders.js** (deps: C). Mapper Woo → Katuq order. Reusa lógica existente en `controllers/woocommerceWebhook.js` (extraer, no duplicar).
5. **Fase E — router cambios**: descomentar HMAC, agregar middlewares, endpoint canónico, log warnings en legacy.
6. **Fase F — logger.js + observabilidad**: integrar a provider-dashboard.
7. **Fase G — rollout**: feature flag `WC_PIPELINE_V2=true` para canary. Default `false` 7 días, luego `true`.

## 8. Plan de rollout

- **Feature flag**: `WC_PIPELINE_V2` en env. Dueño: backend lead. Fecha retiro: 60 días post-merge.
- **Canary**: 7 días en staging con tráfico simulado.
- **Dark launch**: producción con flag off → procesa con pipeline viejo + escribe en wc_webhook_log_v2 paralelo (sin escribir dominio). Comparar resultados.
- **Activación**: flip flag a `true` por empresa, monitorear 24h, expandir.
- **Rollback**: flip flag a `false`. Pipeline viejo sigue funcional 30 días (B-WOO-3..5 quedan latentes pero el sistema no se rompe).

## 9. Riesgos técnicos

- **R-Plan-01**: PubSub puede no estar habilitado en proyecto Firebase. Mitigación: detectar al boot, fallback a in-memory queue con persistencia en Firestore como red de seguridad.
- **R-Plan-02**: extraer mapper de `controllers/woocommerceWebhook.js` puede romper paths legacy. Mitigación: legacy y nuevo apuntan al mismo `processors/orders.js` para evitar drift.
- **R-Plan-03**: rate-limit por `companyId` puede afectar a empresas con burst legítimos (campaña con 500 órdenes/hora). Mitigación: límite configurable por empresa en `integration_configs.{COMPANY}_woocommerce.rateLimit` (default 60 req/min).

## 10. Open questions técnicas

- Confirmar que WC manda `X-WC-Webhook-Delivery-ID` en todas las versiones soportadas (mínimo WC 3.5+). Si no, fallback a SHA256 del body como dedup key.
- Decidir nombre exacto de la cola (`woocommerce-webhooks` PubSub topic vs `wc-webhook-jobs` collection).
