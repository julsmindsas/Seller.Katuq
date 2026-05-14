# Spec 001 — Webhook entrante de Osmosis (Cereza)

> Estado: **approved — pending-validation** (código en feature branches, esperando primer webhook real de Cereza para sellar `done`)
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-05-13
> Carpeta: `specs/001-osmosis-webhook-inbound/`

## Decisiones tomadas (resolución del bloque [NEEDS CLARIFICATION])

| ID | Pregunta | Resolución 2026-05-13 |
|---|---|---|
| Q-01 | Backend que recibe el webhook | **Firebase Functions** (`katuq_admin_back_firebase/functions/`). Endpoint `POST /v1/osmosis/webhook/:companyId` ya montado en `index.js:590`. |
| Q-03 | Algoritmo de firma | **No HMAC** — token Bearer simple. Header `Authorization: Bearer <webhookSecret>` (fallback `X-Webhook-Token`). Comparación directa contra `config.webhookSecret`. Decisión registrada por solicitud explícita del equipo: simplicidad para Cereza. |
| Q-04 | Catálogo de eventos v1 | `order.status_updated`, `product.updated`, `product.created`. |
| Q-05 | Estados de orden | Mapping fijo en `osmosisWebhookService.js:10-17`: pending/confirmed→SinProducir, processing→EnProduccion, shipped→Despachado, delivered→Entregado, cancelled→Cancelado. Otros se ignoran. |
| Q-04+ | Evidencia de entrega | Campo opcional `data.evidence` con `{url, base64, contentType, filename, note}`. Se acumula en `integraciones.osmosis.evidenciasEntrega[]` aunque el estado no cambie o la orden esté en estado final. |
| Q-11 | RBAC re-encolar | Pospuesto a operación inicial — todavía sin dead-letter explícito. |
| Q-12 | Orden de eventos | El timestamp del evento (`fecha` ISO en cada entrada del historial) manda; el receptor no asume orden. |

## Pendientes deliberadamente abiertos (no bloquean cierre)

- **Q-02:** Documentación oficial de Cereza sobre webhooks salientes — esperando que Cereza confirme con base en el `.docx` entregado.
- **Q-06, Q-07:** Tamaño de payload y volumen — se medirá con tráfico real (M-01..M-05).
- **Q-08:** Política de retención del log crudo — pendiente decisión legal/costo.
- **Q-09, Q-10:** Umbrales de alerta y N de reintentos — pendientes hasta tener tráfico para calibrar.

## 1. Contexto / Por qué

Hoy la integración con Cereza es **outbound only**: Katuq llama a Osmosis para push de órdenes (`POST /v1/osmosis/orders/{id}/push`) y sync de productos (`GET /v1/osmosis/products/sync`). Cuando Cereza cambia el estado de una orden (por ejemplo, cancelación) o actualiza un producto, **Katuq no se entera hasta que algo más lo gatille** (sync periódico, usuario abriendo la orden, soporte detectándolo). El `provider-dashboard` ya rastrea estos casos como issues recurrentes: `cancelled_in_cereza`, `missing_osmosis_id`, `push_error`.

Necesitamos un canal **inbound**: que Osmosis nos notifique en tiempo real cambios de estado de orden y actualizaciones de producto, vía webhook HTTP.

## 2. Objetivo de negocio

Cerrar el lazo de información entre Cereza y Katuq, de modo que:
- El estado de una orden en Katuq refleje el estado de Cereza con un desfase ≤ 60s p95.
- Una actualización de producto en Cereza (precio, stock, atributos) se refleje en Katuq con un desfase ≤ 5 minutos p95.
- Las cancelaciones desde Cereza dejen de generar issues `cancelled_in_cereza` no-vistos en el provider-dashboard.

## 3. User stories

- **US-1.** Como **operador de despachos**, quiero ver el estado real de la orden en Katuq sin tener que abrir Cereza, para no embarcar productos que ya fueron cancelados.
- **US-2.** Como **administrador de catálogo**, quiero que precio/stock de productos sincronizados desde Cereza se actualicen automáticamente cuando cambian en Cereza, para evitar vender a precio incorrecto o sin stock.
- **US-3.** Como **agente de soporte**, quiero un registro auditable (timestamp, payload original, resultado del procesamiento) de cada evento recibido de Cereza, para reconstruir incidentes.
- **US-4.** Como **responsable de la integración**, quiero alertas cuando los webhooks de Cereza fallen sistemáticamente, para reaccionar antes de que se acumule el desfase.

## 4. Criterios de aceptación (EARS)

### Recepción

- **AC-01.** WHEN Osmosis envía un `POST` al endpoint público de Katuq para webhooks con **firma válida**, THE system SHALL responder `2xx` en ≤ 3s y persistir el payload crudo y los headers relevantes en almacenamiento append-only **antes** de cualquier procesamiento de negocio.
- **AC-02.** IF la firma del webhook **no valida**, THEN THE system SHALL responder `401`, NO persistir el evento como válido, y registrar el intento fallido con `correlationId` para auditoría.
- **AC-03.** IF el payload no respeta el schema documentado, THEN THE system SHALL responder `400`, persistir el evento como `malformed` y emitir alerta.
- **AC-04.** WHILE un evento con la misma clave de idempotencia `(eventId)` está siendo procesado o ya fue procesado con éxito, THE system SHALL responder `2xx` sin re-procesar (idempotencia).

### Procesamiento de cambios de estado de orden

- **AC-05.** WHEN se recibe un evento de tipo `order.status_changed` con `osmosisOrderId` que existe en Katuq, THE system SHALL actualizar el estado de la orden de Katuq y registrar la transición en el historial de la orden.
- **AC-06.** IF el `osmosisOrderId` recibido no corresponde a ninguna orden en Katuq, THEN THE system SHALL crear un issue en `provider-dashboard` con categoría `unknown_osmosis_order` y NO modificar otras órdenes.
- **AC-07.** WHEN el nuevo estado es `cancelled`, THE system SHALL marcar la orden como cancelada por proveedor, bloquear acciones de despacho posteriores y notificar al operador asignado.

### Procesamiento de actualizaciones de producto

- **AC-08.** WHEN se recibe un evento de tipo `product.updated` con `osmosisProductId` que existe en Katuq, THE system SHALL actualizar **únicamente los campos cuyo valor cambió** y registrar la diferencia.
- **AC-09.** IF el `osmosisProductId` no corresponde a un producto en Katuq, THEN THE system SHALL crear un issue `unknown_osmosis_product` en `provider-dashboard`.
- **AC-10.** WHILE un producto tiene una sincronización local pendiente más reciente que el evento recibido, THE system SHALL conservar la versión local y registrar el conflicto.

### Observabilidad y resiliencia

- **AC-11.** THE system SHALL emitir por cada webhook recibido: log estructurado (`correlationId`, `eventId`, `eventType`, `result`), métrica de latencia y resultado (`success`/`signature_invalid`/`schema_invalid`/`processing_error`), y trazabilidad en el provider-dashboard si afecta a una entidad identificable.
- **AC-12.** IF el procesamiento de negocio falla después de aceptar el evento, THEN THE system SHALL reintentar con backoff exponencial hasta N veces, y al exceder N llevar el evento a una dead-letter inspeccionable desde el provider-dashboard.
- **AC-13.** WHILE el provider-dashboard muestra eventos en dead-letter, THE system SHALL permitir re-encolar manualmente un evento desde la UI.

## 5. Requisitos no funcionales

### 5.1 Performance
- Latencia p95 ≤ 3000ms para responder al webhook (sin contar el procesamiento de negocio, que es asíncrono).
- Throughput soportado: ≥ 50 eventos/segundo sostenidos (validar con Cereza el pico real esperado — `[NEEDS CLARIFICATION]`).

### 5.2 Seguridad
- Firma HMAC en cada request entrante, validada antes de procesar (algoritmo y header exactos: `[NEEDS CLARIFICATION]`).
- Rechazo de payloads sin firma o con firma inválida (`401`).
- Rate-limit por origen para amortiguar ataques de réplica.
- Allowlist de IPs si Cereza la publica.
- Tokens y secretos vía secret manager, jamás en código o en `environment.ts`.

### 5.3 Observabilidad
- Logs estructurados con `correlationId` propagado al backend de Katuq.
- Métricas: `webhook.received`, `webhook.signature_invalid`, `webhook.processed`, `webhook.dlq`.
- Alerta si `signature_invalid` o `dlq` > umbral en ventana de 5 minutos (umbrales: `[NEEDS CLARIFICATION]`).

### 5.4 Accesibilidad (UI del dashboard)
- WCAG 2.1 AA en las vistas nuevas del provider-dashboard (lista de eventos, detalle, dead-letter, acción de reintento).
- Navegación por teclado completa.

### 5.5 Resiliencia
- **Idempotencia** por `eventId` con ventana de al menos 24h.
- **Eventos crudos persistidos** antes de cualquier procesamiento (Artículo V de la constitución).
- **Dead-letter** para eventos que fallan tras N reintentos (N: `[NEEDS CLARIFICATION]`).
- **Re-procesamiento** manual y masivo desde dead-letter.
- **Caída de Cereza:** el sistema no degrada otras funcionalidades de Katuq.

### 5.6 Privacidad
- Los payloads pueden contener datos del cliente final (dirección, teléfono). El almacenamiento crudo debe cumplir las políticas de retención de datos personales de Katuq (`[NEEDS CLARIFICATION]` sobre periodo).
- Logs no contienen datos personales en claro (solo IDs/hashes).

## 6. Out of scope (explícito)

- Refactor del push outbound (`POST /v1/osmosis/orders/{id}/push`) — eso es la spec 002.
- Refactor del sync GET de productos — eso es la spec 003.
- Webhooks de otros proveedores (Shopify, etc.) — futura spec.
- Notificaciones push al cliente final cuando su orden cambia en Cereza — futura spec.
- Reconciliación masiva histórica (backfill) — futura tarea operativa.

## 7. Dependencias

- Cereza/Osmosis publica eventos webhook (existencia y catálogo de eventos: `[NEEDS CLARIFICATION]`).
- `provider-dashboard` (`src/app/components/provider-dashboard/`) se extiende con categorías `unknown_osmosis_order`, `unknown_osmosis_product`, y vista de dead-letter.
- Backend HTTP que reciba el webhook (decidir en `[NEEDS CLARIFICATION]`: Firebase Functions vs Node existente vs nuevo servicio).
- Secret manager para el secret de firma.

## 8. [NEEDS CLARIFICATION]

> Estas preguntas deben resolverse antes de pasar a `plan.md`. Marca `[x]` cuando se cierre la pregunta y registra la respuesta debajo.

- [ ] **Q-01:** ¿Qué backend recibe el webhook? Opciones probables: (a) Firebase Functions en `katuq_admin_back_firebase`, (b) Node existente, (c) nuevo servicio dedicado.
- [ ] **Q-02:** ¿Cereza/Osmosis ya ofrece webhooks salientes? ¿Documentación oficial, sandbox para probar?
- [ ] **Q-03:** ¿Algoritmo y header exactos de la firma HMAC? (típicos: `X-Osmosis-Signature` con HMAC-SHA256, secret compartido).
- [ ] **Q-04:** Catálogo definitivo de eventos a soportar en v1. Mínimo propuesto: `order.status_changed`, `product.updated`. ¿Hay otros que también queramos (`product.created`, `product.deleted`, `order.created`, `order.note_added`)?
- [ ] **Q-05:** Catálogo de **estados de orden** que Cereza nos puede enviar. ¿Mapeo a estados de Katuq?
- [ ] **Q-06:** Tamaño máximo del payload esperado (para definir límites y costos).
- [ ] **Q-07:** Volumen estimado por hora/día para dimensionar throughput.
- [ ] **Q-08:** Política de retención del payload crudo (días/meses) por privacidad y por costo.
- [ ] **Q-09:** Umbrales para alertas: `signature_invalid` y `dlq`.
- [ ] **Q-10:** N de reintentos antes de mandar a dead-letter y backoff (sugerencia: 5 reintentos, 2^n segundos, máx 5 min).
- [ ] **Q-11:** ¿Hay autenticación de salida desde Katuq al re-encolar un evento desde el dashboard? (RBAC: ¿quién puede re-encolar?)
- [ ] **Q-12:** ¿Existe un acuerdo de SLA con Cereza sobre orden de eventos? Si los eventos llegan fuera de orden, ¿qué prevalece?

## 9. Riesgos identificados

- **R-01:** Osmosis no documenta webhooks → bloquea Fase 2 si no se valida en sandbox. Mitigación: pedir contacto técnico de Cereza.
- **R-02:** Eventos llegan desordenados o duplicados → el diseño debe asumir desorden (timestamp del evento manda, no del recibo).
- **R-03:** Pico de eventos durante migración inicial (catch-up histórico) supera throughput diseñado.
- **R-04:** Datos personales en el payload crudo violan política de retención si la guardamos indefinidamente.
- **R-05:** Cambios en el schema de Cereza no anunciados rompen el procesamiento → necesidad de schema validation defensiva (`additionalProperties: true` con tolerancia).

## 10. Métricas de éxito post-launch

- **M-01:** Desfase p95 entre cambio en Cereza y reflejo en Katuq ≤ 60s para órdenes, ≤ 5min para productos.
- **M-02:** Reducción ≥ 80% de issues `cancelled_in_cereza` no-vistos en provider-dashboard en los primeros 30 días.
- **M-03:** Tasa de webhooks en dead-letter ≤ 0.5% sostenida.
- **M-04:** Cero incidentes de doble-procesamiento confirmados en los primeros 60 días (idempotencia).
- **M-05:** Tiempo medio de re-procesamiento desde dead-letter ≤ 10 minutos.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Las 12 preguntas de §8 resueltas y migradas a §1-§7.
