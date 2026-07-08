# Tasks 010 — Notificaciones de pedido unificadas

> Estado: **in-progress** — Fase A ✅ · Fase B (T-04/T-05) ✅ · Fase C (T-07/T-08/T-09/T-10) ✅ — TODO COMMITEADO (commit ~973252c), inerte con flag OFF.
> Cableado completo para OMS: creación (katuq-order-upsert + controller) + entrega Cereza (webhook T-08 + pull T-09) + Enviame (T-10). Pendiente: **T-10b** despachos manuales app (controllers/logistica.js, varios sitios — no afecta OMS), **T-06/T-11** integration tests, **T-12** idempotencia transaccional robusta, **T-13** observabilidad, **T-14/T-15** rollout (desplegar + prender flag).
> Nota diseño: se extendió `orderNotificationService` con `notifyStatusChange` (no `orderStatusService` nuevo). No se toca `orderService.createOrder` (contrato sin side-effects). Cada call site: punto único idempotente + legacy condicionado al flag (sin regresión ni duplicado).
> Vinculado a `plan.md`.
> Última actualización: 2026-06-22

## Convenciones
- `[P]` = paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de esa tarea.
- Rutas relativas a `katuq_admin_back_firebase/functions/`.

## Tareas

### Fase A — Scaffolding

#### T-01 — `orderNotificationService` (núcleo idempotente) `[P]`
- **Input:** `order`, `eventType ∈ {order_created, order_dispatched, order_delivered}`, `{ company, source }`.
- **Output:** `notify()` que valida flag + preferencias de empresa + idempotencia y delega en la cola/plantillas existentes; retorna `{ sent, reason }`.
- **Criterio de éxito:** llamado dos veces con el mismo `(orderId, eventType)` envía una sola vez; respeta `company_notification_preferences`.
- **Archivos:** `services/notifications/orderNotificationService.js` (nuevo). Reusa `addToNotificationQueue` y plantillas existentes.
- **Dependencias:** ninguna.

#### T-02 — Feature flag `ORDER_NOTIF_UNIFIED` `[P]`
- **Output:** flag global (env) + override por empresa; helper `isUnifiedNotifEnabled(company)`.
- **Criterio:** off → comportamiento previo intacto; on por empresa → solo esa empresa usa el punto único.
- **Archivos:** `services/notifications/notificationFlags.js` (o donde viven los flags existentes).
- **Dependencias:** ninguna.

#### T-03 — Contract tests del servicio (deps: T-01, T-02)
- **Criterio:** tests verdes para idempotencia, pref desactivada (`skipped_pref`), sin destinatario (`skipped_no_recipient`), flag off (`skipped_flag_off`).
- **Archivos:** `tests/notifications/orderNotificationService.test.js` (nuevo).

### Fase B — Creación

#### T-04 — Hook de creación en `orderService.createOrder` (deps: T-01)
- **Output:** tras crear el pedido, invoca `orderNotificationService.notify(order, 'order_created', { company, source })` (best-effort, async).
- **Criterio:** pedido creado por app / Shopify-flow / Woo dispara exactamente 1 evento `order_created` (con flag on); con flag off solo loguea (dark-launch).
- **Archivos:** `services/orderService.js`.

#### T-05 — Retirar notif legacy del controller (deps: T-04)
- **Output:** quitar el bloque `setImmediate` (email preview + `sendDirectCreatedSms` + `sendSellerNotification`) y el disparo duplicado; queda cubierto por el punto único.
- **Criterio:** con flag on, no hay doble notif; con flag off, comportamiento legacy preservado.
- **Archivos:** `controllers/orders.js` (~5084-5120).

#### T-06 — Integration test creación multicanal (deps: T-04, T-05)
- **Criterio:** crear pedido por cada canal → 1 notif `order_created`, 0 duplicados.
- **Archivos:** `tests/notifications/orderCreated.integration.test.js` (nuevo).

### Fase C — Cambio de estado

#### T-07 — `orderStatusService.transition()` (deps: T-01)
- **Output:** servicio único que aplica `osmosisStatusPolicy`/`statusPolicy` (anti-retroceso), persiste `estadoProceso`, y al confirmar transición a Despachado/Entregado dispara `orderNotificationService`.
- **Criterio:** transición válida persiste + notifica 1 vez; transición no permitida no notifica.
- **Archivos:** `services/orderStatusService.js` (nuevo).

#### T-08 — Migrar webhook Cereza/Osmosis (deps: T-07)
- **Archivos:** `services/integrations/osmosis/osmosisWebhookService.js` → usa `transition()` en vez de `orderRef.update` inline.

#### T-09 — Migrar pull de estados Cereza (deps: T-07)
- **Archivos:** flow/servicio de `cereza-orders-status-pull` → usa `transition()`.

#### T-10 — Migrar Enviame + despachos app (deps: T-07)
- **Archivos:** `services/logistics/webhooks/enviameWebhook.js` + controller(es) de despacho que cambian `estadoProceso`.

#### T-11 — Integration test estado (deps: T-08, T-09, T-10)
- **Criterio:** el mismo cambio a Entregado por webhook + pull → 1 sola notif (dedupe).
- **Archivos:** `tests/notifications/orderStatus.integration.test.js` (nuevo).

### Fase D — Idempotencia + observabilidad

#### T-12 — Marca de idempotencia transaccional (deps: T-01)
- **Output:** set-if-absent atómico para `(orderId, eventType)` (resolver open question: `orders/{id}.notificationsSent` vs colección aparte).
- **Criterio:** dos vías concurrentes del mismo evento → 1 envío.

#### T-13 — Observabilidad `[P]` (deps: T-01)
- **Output:** log estructurado por evento (pedido, empresa, canal, `reason`) + contador enviado/omitido/duplicado.

### Fase E — Rollout

#### T-14 — E2E OMS (deps: T-06, T-11, T-12)
- **Criterio:** pedido Shopify creado + entrega vía Cereza → cliente recibe ambas, sin duplicar.

#### T-15 — Activación gradual (deps: T-14)
- **Output:** flag on en OMS → validar en prod → 100% → retirar código legacy.

## Orden de ejecución sugerido
1. T-01, T-02 en paralelo `[P]`.
2. T-03 al terminar T-01+T-02.
3. T-04 → T-05 → T-06 (Fase B).
4. T-07 → T-08/T-09/T-10 (paralelas entre sí) → T-11 (Fase C).
5. T-12 y T-13 `[P]` en paralelo con Fase C.
6. T-14 → T-15.

## Definition of Done
- Contract + integration tests verdes (creación y estado, sin duplicados).
- Verificación de constitución sin "no" pendientes.
- Observabilidad emitiendo en staging.
- OMS validado E2E (creado + entregado).
- `CONTRACT.md` actualizado con las decisiones (D-XXX) y cualquier desvío.
- Código legacy del controller retirado tras 100%.
