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

## Artículo XV — Canónica de integraciones en Firestore: INGLÉS (`integrations`)
> **Versión 2.0 — 2026-05-13.** Esta es una **enmienda al Artículo XV original** que decía "español". Razones del flip detalladas en CONTRACT.md decisión D-009.

El campo canónico en los documentos `orders`, `products` y `warehouses` es **`integrations.<provider>.*`** (en inglés), NO `integraciones`.

**Por qué se cambió la decisión:**
- La auditoría inicial (D-004) confundió "lo que el código LEE hoy" con "lo que el código DEBE leer". El frontend lee `integraciones` por inercia, no por design.
- Decisión explícita del usuario (responsable producto, 2026-05-13): preferencia por inglés. Razones: (a) consistencia con SDKs externos (Shopify, WooCommerce, Aliaddo todos usan `integrations`); (b) evita la fricción de mezclar español con inglés en identifiers; (c) decisión histórica del usuario que ya había sido tomada y se perdió entre sesiones de Claude.
- La realidad operativa ya tiene contradicciones graves: 8,219/8,311 productos con AMBOS campos `integraciones.osmosis` y `integrations.osmosis` con SCHEMAS DISTINTOS — no son copias, son dos modelos paralelos. Definir UN canónico oficial es prerrequisito para cualquier limpieza.

**Reglas (vigentes):**
1. Todo código nuevo (servicios backend, nodos /flows, scripts, frontend) ESCRIBE solo en `integrations.<provider>.*` (inglés).
2. Todo código nuevo LEE de `integrations.<provider>.*`. Si no está ahí, fallback temporal a `integraciones.<provider>.*` durante la migración. Nunca leer solo español post-migración.
3. La migración formal sigue el plan staged en spec [[002.1-migrate-to-english-integrations]]: doble escritura compat → backfill con conversión de schemas → migración de lectores → cleanup.
4. Aplica a TODOS los proveedores (Osmosis, Shopify, WooCommerce, Aliaddo, etc.).
5. Convención de campos dentro del provider object: usar `snake_case` para campos copiados literalmente del proveedor externo (`order_id`, `product_id`); `camelCase` para campos derivados/internos (`pushedAt`, `lastSyncedAt`, `isPushed`).
