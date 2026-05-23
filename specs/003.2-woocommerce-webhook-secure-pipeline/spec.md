# Spec 003.2 — WooCommerce: pipeline seguro de webhook entrante

> Estado: **draft** (2026-05-20)
> Sub-spec hija de [[003-woocommerce-360-marco]]. Bloquea 003.4. Depende de 003.1.

## 1. Contexto / Por qué

El endpoint actual del webhook entrante WooCommerce (`routers/woocommerceWebhook.js`) **acepta cualquier POST sin firma** (B-WOO-3: HMAC comentado en línea 9), no asocia el `companyId` del path al request (B-WOO-4), y procesa todo inline en un controller de 2839 LOC sin idempotencia real (B-WOO-5). Esto viola Artículo X (seguridad webhooks) y Artículo IV (idempotencia) de la constitución, y deja la integración expuesta a replay attacks y procesamiento duplicado.

## 2. Objetivo de negocio

Recibir webhooks de WooCommerce de forma segura, idempotente y observable: solo aceptar payloads firmados, garantizar que un mismo evento se procesa una sola vez aunque WooCommerce reintente, y producir logs estructurados que permitan trazar cualquier orden o producto desde la entrada del webhook hasta la escritura en Firestore.

## 3. User stories

- Como **operador Katuq**, quiero **que un atacante NO pueda inyectar órdenes falsas vía el webhook**, para no contaminar la base de pedidos.
- Como **comerciante**, quiero **que si WooCommerce reintenta un webhook (porque mi internet falló), Katuq no me genere dos pedidos duplicados**.
- Como **soporte**, quiero **buscar por `wcDeliveryId` en logs y ver el camino completo del evento** (recepción → dedup → queue → processor → Firestore writes).

## 4. Criterios de aceptación (notación EARS)

- **AC-003.2-01.** WHEN WooCommerce envía un POST al endpoint `/v1/woocommerce/webhook/:companyId` con cabecera `X-WC-Webhook-Signature` válida (base64 de HMAC SHA-256 sobre el body usando `webhookSecret` de la empresa), THE system SHALL responder 200 en ≤ 800ms p95 y persistir el evento crudo en `wc_webhook_log/{companyId}/events/{eventId}` antes de procesarlo (Art V).
- **AC-003.2-02.** IF la cabecera `X-WC-Webhook-Signature` falta o no valida contra el `webhookSecret`, THEN THE system SHALL responder 401 y persistir el rechazo en `wc_webhook_rejected/{companyId}/events/{eventId}` con metadata (IP, timestamp, primeros 200 chars del body) — NUNCA en `wc_webhook_log` legítimo.
- **AC-003.2-03.** WHEN dos POST llegan con el mismo header `X-WC-Webhook-Delivery-ID` para el mismo `companyId`, THE system SHALL procesar solo el primero; el segundo SHALL retornar 200 con body `{duplicate: true}` sin escribir en colecciones de dominio.
- **AC-003.2-04.** THE system SHALL guardar la huella de dedup en colección `wc_webhook_dedup` con `{key: deliveryId, companyId, claimedAt: ISO, expiresAt: ISO}` con TTL 24h.
- **AC-003.2-05.** WHEN un evento válido pasa dedup, THE system SHALL enviarlo a una cola (PubSub o Cloud Tasks o queue equivalente) con reintentos configurados (3 attempts, backoff exponencial) antes de procesar.
- **AC-003.2-06.** IF el procesamiento del evento falla por bug del procesador (excepción no-controlada), THEN THE system SHALL dejar el evento en la cola para reintento + emitir log de severidad ERROR + NO marcarlo como procesado en `wc_webhook_log`.
- **AC-003.2-07.** WHEN llega un payload de topic `order.created`, THE system SHALL invocar `processors/orders.js` que mapea el payload a `orders` collection de Katuq con `sourceOrder: 'woocommerce'` + `integrations.woocommerce.order_id` + `statusHistory[]` inicial.
- **AC-003.2-08.** THE system SHALL excluir del log estructurado cualquier campo sensible: `consumerSecret`, `webhookSecret`, datos de tarjeta del customer, cédula completa (solo últimos 4 dígitos), teléfono completo (solo prefijo + últimos 4) — Art XI.
- **AC-003.2-09.** WHILE el rate de POST entrantes para un `companyId` exceda 60 req/min, THE system SHALL responder 429 con `Retry-After: 60` y NO procesar — protección rate-limit.
- **AC-003.2-10.** THE endpoint canónico SHALL ser `POST /v1/woocommerce/webhook/:companyId`. Los endpoints legacy (`/order/created`, `/product/updated`, etc.) se mantienen 30 días con warning en logs y se deprecan en spec separada 003.2.1.

## 5. Requisitos no funcionales

### 5.1 Performance
- Latencia p95 ≤ 800ms desde recepción hasta 200 OK (verificación firma + dedup check + persistencia evento crudo + encolado).
- Throughput sostenido ≥ 50 req/s para webhooks Woo a través del worker (suficiente para 200 órdenes/min por tenant).

### 5.2 Seguridad (Artículo X)
- HMAC SHA-256 obligatorio. Sin firma → 401.
- Rate-limit por origen IP + por `companyId`.
- Allowlist de IPs opcional, configurable por empresa (WooCommerce no la publica).
- Nunca confiar en campos del payload para autorización (auth via `companyId` del path + firma).
- `webhookSecret` cifrado at-rest (heredado de `integrationConfigService`).

### 5.3 Observabilidad (Artículo VII)
- Logs estructurados con `correlationId = wcDeliveryId`, `companyId`, `topic`, `latencyMs`, `result: accepted|duplicate|rejected|failed`.
- Métrica de eventos/min por empresa + por status (accepted/duplicate/rejected/failed).
- Entrada en `provider-dashboard` cuando un evento afecta una orden o producto identificable.

### 5.4 Resiliencia (Artículo IV)
- Idempotencia obligatoria — clave `wcDeliveryId`, TTL 24h.
- Reintentos automáticos en queue: 3 attempts, backoff 1s/3s/9s.
- Dead-letter queue tras 3 fallos: doc en `wc_webhook_dlq/{companyId}/events/{eventId}` para inspección manual.
- Si Firestore está caído, el worker queue retiene el mensaje sin perderlo.

## 6. Out of scope (explícito)

- Procesamiento detallado de productos vía webhook (003.3 cubre el sync incremental + mapper).
- Procesamiento de refunds, customers, cart events — fase 2.
- UI de inspección de webhooks rechazados (deuda futura).
- OAuth/JWT del endpoint (auth via firma HMAC es suficiente per Art X).

## 7. Dependencias

- **003.1 done** — schema PROVIDER_SCHEMAS.woocommerce con `webhookSecret` cifrado at-rest.
- **002.2 done** — captura de errores en `nodeStates[id].error` (para que processors propaguen).
- **`services/shopify/`** disponible como referencia arquitectural (NO copiar código).
- PubSub o Cloud Tasks habilitados en el proyecto Firebase (verificar — fallback in-memory queue si no).

## 8. [NEEDS CLARIFICATION]

- [ ] **Q-003.2-01**: ¿usamos PubSub, Cloud Tasks, o queue in-memory con setInterval? Default propuesto: revisar qué usa Shopify hoy y replicar exacto. Si Shopify usa in-memory + retry job, replicar; si usa PubSub, replicar.
- [ ] **Q-003.2-02**: el `webhookSecret` lo configura el comerciante manualmente al crear el webhook en Woo. ¿Cómo se sincroniza con Katuq? Default MVP (heredado Q-WOO-02): pegado manual en `/integrations`. Fase 2: endpoint dedicado de "instalar webhook" que llama WC API y guarda el secret retornado.
- [ ] **Q-003.2-03**: ¿qué columnas componen el `eventId` en `wc_webhook_log`? Propuesta: `eventId = wcDeliveryId` (header de WC). Si WC no manda header en versiones viejas, fallback a hash SHA-256 del body.

## 9. Riesgos identificados

- **R-003.2-01** (Alto): WC podría enviar firmas con algoritmo distinto del documentado (HMAC SHA-256 base64). Mitigación: 003.6 incluye test contra fixture firmado a mano + validación contra Woo sandbox antes de mergear.
- **R-003.2-02** (Medio): el `companyId` puede contener espacios (ej. "OH MY STORE"). URL-encoding al construir endpoint. Verificar que router Express decodifica bien.
- **R-003.2-03** (Bajo): endpoints legacy se siguen llamando 30 días — riesgo de doble path al mismo handler. Mitigación: agregar log warning + métrica de uso para acelerar deprecación si no se usan.

## 10. Métricas de éxito post-launch

- **M-003.2-01**: 0 eventos aceptados sin firma válida en 30 días post-launch (auditable en `wc_webhook_rejected` collection).
- **M-003.2-02**: tasa de duplicados (entradas en `wc_webhook_dedup` con `claimed=true`) ≤ 5% del total de eventos válidos.
- **M-003.2-03**: latencia p95 ≤ 800ms sostenido durante 30 días.
- **M-003.2-04**: 0 eventos en dead-letter queue tras 7 días post-launch (excepto los inyectados manualmente como prueba).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de plan.md.
