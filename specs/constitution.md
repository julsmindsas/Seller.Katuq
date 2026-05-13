# Constitución de Seller.Katuq

> Versión 1.0 — 2026-05-13.
> Estos artículos son **inmutables salvo enmienda explícita** registrada en `CONTRACT.md`.
> Todo plan/diseño se valida contra esta constitución antes de pasar a tasks.

## Artículo I — Spec primero, código después
Ningún cambio de comportamiento entra al repo sin spec aprobada. Bug-fixes triviales (typos, ajuste de un literal, dependencia patch) están exentos.

## Artículo II — La spec captura intent, no implementación
Las specs no nombran librerías, frameworks ni patrones técnicos. El plan sí.

## Artículo III — Constitución sobre conveniencia
Cuando un plan choque contra esta constitución, gana la constitución. Cambiar la constitución requiere registro explícito en `CONTRACT.md` con justificación.

## Artículo IV — Idempotencia en integraciones
Toda interacción con sistemas externos (Cereza/Osmosis, Shopify, etc.) **debe ser idempotente**. Reintentos no pueden causar duplicación de órdenes, doble cobro, ni doble envío. Cada operación lleva una clave de idempotencia trazable.

## Artículo V — Eventos crudos antes de procesar
Todo webhook entrante (Osmosis, otros) **persiste el payload crudo y firmado** en almacenamiento append-only **antes** de cualquier procesamiento. Si el procesamiento falla, el evento original sobrevive y es re-procesable.

## Artículo VI — No acoplar la UI a un proveedor
La UI de `/flows`, `/integrations`, `/provider-dashboard` no debe contener lógica `if (provider === 'cereza')`. Las diferencias por proveedor viven en una capa de adapters detrás de una interfaz común.

## Artículo VII — Observabilidad obligatoria
Toda integración crítica (push de orden, sync de catálogo, recepción de webhook) emite:
- log estructurado con `correlationId`
- métrica de latencia y resultado (`success`/`error`/`retry`)
- entrada en provider-dashboard si afecta a una orden o producto identificable.

## Artículo VIII — Test-first para contratos externos
Todo endpoint que expongamos o consumamos genera primero un **contract test** (validación de schema y status codes) antes de la implementación. Los integration y e2e van después; los unitarios al final.

## Artículo IX — Estilo Angular del proyecto
- Standalone components donde el módulo no aporta valor.
- Estado UI con signals (`signal`, `computed`, `effect`) en código nuevo. RxJS solo donde la naturaleza del flujo lo justifique (HTTP, websockets, streams).
- Control flow nativo `@if`/`@for`/`@switch` en código nuevo (sin `*ngIf`/`*ngFor`).
- Cambio de detección OnPush por defecto en componentes nuevos.
- Lazy loading por feature.
- HTTP siempre vía servicio dedicado, nunca en componentes.

## Artículo X — Seguridad por defecto en webhooks
Webhooks entrantes: validar firma HMAC, rechazar payload sin firma, mantener allowlist de IPs cuando el proveedor la publique, rate-limit por origen, y nunca confiar en campos del payload para autorización.

## Artículo XI — Datos sensibles fuera del log
Tokens, credenciales, datos personales completos (CC, teléfono, dirección detallada) nunca se loguean en claro. Solo hashes o IDs.

## Artículo XII — Ningún flag se mantiene "para siempre"
Feature flags llevan dueño y fecha de retiro al crearse. El plan que introduce un flag incluye la tarea de retirarlo.

## Artículo XIII — Una feature, un directorio de spec
Specs grandes se parten. Si una spec excede 3 páginas o 3 user stories no relacionadas, se divide en sub-specs con números nuevos.

## Artículo XIV — El contrato vivo se actualiza
Toda decisión que tomemos como equipo (humano + IA) y toda excepción a esta constitución se registra en `CONTRACT.md`. Si no está escrito, no pasó.

## Artículo XV — Canónica de integraciones en Firestore: ESPAÑOL (`integraciones`)
El campo en los documentos `orders` y `products` es **`integraciones`** (con tilde, español), no `integrations`. Justificación basada en código (auditoría 2026-05-13):
- `osmosisOrderService.js:79-86,139-141,162,176` (push outbound oficial) escribe/lee `integraciones.osmosis.*`.
- `osmosisWebhookService.js:223-229` (webhook inbound) escribe `integraciones.osmosis.*`.
- Frontend Angular (`ventas/list/list.component.ts:518`, `tracking-details-modal.component.ts`) lee `integraciones.osmosis.*`.
- Todos los archivos `integrations.osmosis.*` son scripts de backfill/diagnóstico legacy o duplican.

Reglas:
- Cualquier código nuevo (push, pull, webhook, flow node, sync) escribe y lee `integraciones.<provider>.*`.
- Los campos `integrations.<provider>` en documentos existentes son duplicados legacy a limpiar.
- Los scripts/flow-nodes que aún escriban en inglés se deprecan y migran.
- Aplica también a Shopify, WooCommerce y cualquier integración futura: español, no inglés.
