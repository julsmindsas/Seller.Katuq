# Plan 010 — Notificaciones de pedido unificadas

> Estado: **draft**
> Vinculado a `spec.md` (pendiente de aprobación).
> Última actualización: 2026-06-22

## 1. Resumen técnico
Un **servicio único de notificación de pedido**, idempotente por `(pedido, evento)`, disparado desde los puntos donde convergen TODOS los canales: la **creación** en el servicio que crea el pedido (`orderService.createOrder`), y el **cambio de estado** en un nuevo **servicio único de transición** (`orderStatusService`) al que migran los call sites que hoy mutan `estadoProceso` inline (webhook Cereza/Osmosis, pull cron, Enviame, despachos de la app). Reusa el motor de envío y plantillas existentes (`addToNotificationQueue` + `company_notification_preferences`). Se **migra** (retira) la notif legacy hardcodeada en el controller. Rollout detrás de feature flag con dark-launch.

## 2. Verificación contra la constitución
| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 010 |
| IV — Idempotencia | sí | clave `(orderId, eventType)`, set-if-absent transaccional |
| V — Eventos crudos antes de procesar | sí | no altera la captura de webhooks; solo el disparo de notif |
| VI — UI no acoplada a proveedor | sí | backend; notif por evento canónico, no por proveedor |
| VII — Observabilidad | sí | log estructurado por evento (pedido/empresa/canal/resultado) |
| VIII — Test-first contratos | sí | contract tests del servicio antes de cablear |
| XI — Datos sensibles fuera del log | sí | no se loguea correo/teléfono del cliente |

## 3. Arquitectura

### 3.1 Componentes (backend)
- **`orderNotificationService`** (nuevo): `notify(order, eventType, { company, source })`. Verifica preferencias de empresa, idempotencia, y delega en la cola/plantillas existentes. Único lugar que decide "se envía o no".
- **`orderStatusService`** (nuevo): `transition(orderRefOrId, newStatus, { company, source, notes, evidence })`. Aplica la política anti-retroceso existente (`osmosisStatusPolicy`/`statusPolicy`), persiste el estado, y al confirmar la transición llama a `orderNotificationService`.
- **`orderService.createOrder`**: tras crear, invoca `orderNotificationService.notify(order, 'order_created', …)`.
- **Call sites de estado migrados** → pasan a usar `orderStatusService.transition`: `osmosisWebhookService`, pull `cereza-orders-status-pull`, `enviameWebhook`, controllers de despacho/app.
- **Controller `orders.js`**: se retira el bloque `setImmediate` legacy (email preview + SMS directo + seller notif); esas responsabilidades pasan al servicio único.

### 3.2 Diagrama (texto)
```
[app POST /orders/create] ─┐
[Shopify flow → katuq-order-upsert] ─┼─► orderService.createOrder ─► orderNotificationService.notify('order_created')
[Woo webhook] ─┘                                                         │
                                                                         ├─ check prefs empresa
[Cereza webhook] ─┐                                                      ├─ check idempotencia (orderId+evento)
[Cereza pull cron] ─┼─► orderStatusService.transition(Despachado/Entregado) ─► notify('order_dispatched'|'order_delivered')
[Enviame webhook] ─┤
[despacho app] ────┘                                                     └─► cola notif existente (email/SMS/in-app)
```

### 3.3 Decisiones técnicas
| Decisión | Requisito (EARS §4) | Alternativas descartadas |
|---|---|---|
| Punto único en capa de servicio (`createOrder` + `orderStatusService`) | "una sola notif por cualquier canal" | Cablear en cada webhook (lo que falló y duplicaba); bus de eventos nuevo (complejidad, el eventBus actual no se consume para notif) |
| Idempotencia por `(orderId, eventType)` | "enviar una sola vez aunque llegue por varias vías" | Sin dedupe (duplica con webhook+pull) |
| Reusar cola/plantillas del sistema | "mismo mensaje todos los canales" | Reescribir motor de envío (out of scope) |
| Migrar notif legacy del controller | decisión usuario (migrar) | Convivencia (deja dos caminos inconsistentes) |
| Feature flag + dark-launch | R-01 duplicados en migración | Big-bang (riesgo de doble notif a clientes reales) |

## 4. Modelo de datos
- Marca de idempotencia: `orders/{id}.notificationsSent = { order_created: ISO, order_dispatched: ISO, order_delivered: ISO }`. Set-if-absent dentro de transacción. (Alternativa en open questions.)

## 5. Contratos (servicios internos)
- `orderNotificationService.notify(order, eventType, { company, source }) → { sent, reason }` donde `reason ∈ {sent, skipped_pref, skipped_duplicate, skipped_no_recipient, skipped_flag_off}`.
- `orderStatusService.transition(...) → { changed, newStatus, notified }`.

### 5.1 Idempotencia
- Clave: `(orderId, eventType)`. Ventana: permanente (nunca reenviar el mismo evento del mismo pedido). Comportamiento ante duplicado: no-op + log `skipped_duplicate`.

### 5.2 Errores
| Caso | Comportamiento |
|---|---|
| Falla envío | best-effort: log error, NO rompe creación/transición del pedido |
| Sin correo/teléfono | `skipped_no_recipient` + log, continúa |
| Pref desactivada | `skipped_pref`, no envía |

## 6. Estrategia de testing
- **Contract tests** (primero): `orderNotificationService` — idempotencia, preferencias, sin destinatario, flag off.
- **Integration**: crear pedido por cada canal (app, Shopify/flow, Woo) → exactamente 1 notif; transición a Despachado/Entregado por webhook+pull → 1 notif.
- **E2E**: OMS — pedido Shopify creado + entrega vía Cereza → cliente recibe ambas, sin duplicar.

## 7. Fases de implementación
1. **A — Scaffolding**: `orderNotificationService` idempotente + contract tests. Feature flag `ORDER_NOTIF_UNIFIED` (off). No toca call sites.
2. **B — Creación**: hook en `orderService.createOrder` + migrar (retirar) el bloque legacy del controller. Dark-launch: con flag off solo loguea "qué enviaría".
3. **C — Estado**: `orderStatusService.transition` + migrar call sites de estado (Cereza webhook, pull, Enviame, despachos app).
4. **D — Idempotencia + observabilidad** robustas (logs estructurados, métricas enviado/omitido/duplicado).
5. **E — Rollout**: prender flag en OMS primero (validación real) → resto de empresas → 100%. Retirar legacy.

## 8. Plan de rollout
- **Feature flag**: `ORDER_NOTIF_UNIFIED` (global + override por empresa). Dueño: equipo Katuq. Retiro: tras 2 semanas a 100% estable.
- **Dark-launch**: el servicio decide y loguea sin enviar, para validar el dedupe contra el tráfico real antes de prender.
- **Rollback**: apagar el flag → vuelve el comportamiento previo (legacy en el controller sigue presente hasta Fase E).

## 9. Riesgos técnicos
- R-T1: migrar el controller sin regresión en venta asistida/POS → mitiga dark-launch + tests integration del canal app.
- R-T2: centralizar el cambio de estado toca muchos call sites → faseado (Fase C aislada).
- R-T3: doble notif durante la transición → flag + dedupe idempotente desde Fase A.

## 10. Open questions (técnicas)
- [ ] Marca de idempotencia: ¿en el doc `orders/{id}.notificationsSent` o colección `order_notifications_sent` aparte? (peso del doc vs lecturas extra).
- [ ] ¿`orderService.createOrder` recibe siempre `company` + `cliente` poblados en TODOS los canales (Shopify/flow incluido)? Verificar en Fase A.
- [ ] El email "legacy" del controller (HTML armado por el frontend) ¿se reemplaza por la plantilla `ORDER_CREATED` del sistema, o se conserva el preview solo para el link del SMS?
