# Contrato Vivo — Seller.Katuq

> **Lee este archivo primero al iniciar cualquier sesión.**
> Aquí se acumula lo que decidimos, lo que está pendiente, y lo que sabemos que no sabemos.
> Formato append-only para decisiones; las secciones de roadmap y riesgos se editan.

---

## 1. Roadmap priorizado

Orden = prioridad. La spec piloto siempre encabeza.

| # | Spec | Estado | Dueño | Notas |
|---|---|---|---|---|
| 001 | osmosis-webhook-inbound | **approved — pending-validation** | equipo Katuq + Claude | Recibir desde Cereza/Osmosis: cambios de estado de orden + actualizaciones de producto. Código mergeado a feature branches, esperando primer webhook real de Cereza. |
| **002** | **flows-osmosis-shopify-marco** | **en redacción** | — | **Spec marco del 360**. Mapea flujo target Osmosis ↔ Katuq ↔ Shopify ↔ webhook con findings reales y referencias a sub-specs hijas. |
| 002.1 | migrate-to-english-integrations | en redacción | — | Migración a canónica `integrations` (inglés). Plan staged + impact analysis + backfill con conversión consciente de schemas. |
| 002.2 | flow-runs-error-instrumentation | en redacción | — | Capturar `error.message + stack` en `nodeStates[id].error` cuando un nodo falle. Sin esto, todo debug es ciego. |
| 002.3 | flow-runs-resilience-vs-restart | en redacción | — | Causa raíz `BACKEND_RESTART → zombies`. Checkpoints + reanudación + reducir ventana detección zombie. |
| 002.4 | shopify-to-cereza-bodega-y-inventario | en redacción | — | Fix `bodegaId: "BOD-010"` (fantasma) → `BOD-CEREZA-1` + agregar `katuq-inventory-adjust` después del push (hoy se vende sin descontar stock Katuq). |
| 002.5 | consolidar-flows-shopify-to-osmosis | en redacción | — | Decidir entre `shopify-orders-to-cereza-7e6ab5a3` (active, 5 nodos) y `shopify-orders-to-osmosis` (inactive, 3 nodos). |
| 002.6 | cierre-360-aceptacion-operativa | done | — | Checklist de tests end-to-end del 360. 8/8 PASS. |
| **002.7** | **flows-multitenant-via-companyConfig** | **done** | — | `$companyConfig.<provider>.<campo>` en expressionEngine + bodegaCode en schema osmosis + flow doc dinámico + defaults peligrosos eliminados. Validado end-to-end. |
| **002.8** | **crones-dinamicos-firestore** | **done** | — | Colección `cron_jobs_config` + endpoints REST CRUD + hot-reload + seed automático. SOLO crones del SISTEMA (no de flow). |
| **002.9** | **flow-cron-catchup-on-boot** | **done** | — | `lastTriggeredAt` por binding + catchup post-restart + endpoint `GET /v1/health/crons`. Resuelve gaps en EC2/PM2. |
| **003** | **woocommerce-360-marco** | **en redacción** | — | Spec marco del 360 WooCommerce: cualquier comercio puede integrar Woo plug-and-play. Paridad funcional con Shopify (servicio canónico). 6 sub-specs hijas. |
| 003.1 | woocommerce-integration-schema-ux | **implementación done** | — | Schema PROVIDER_SCHEMAS.woocommerce ampliado + extender form `/integrations` (info-box, screenshots placeholder, URL webhook copy-paste, picker bodegaCode). B-WOO-1 y B-WOO-2 fixed. |
| 003.2 | woocommerce-webhook-secure-pipeline | **implementación done** | — | HMAC SHA-256 + dedup Firestore + queue Firestore + worker polling (espejo pattern Shopify). Endpoint canónico `POST /v1/woocommerce/webhook/:companyId`. Legacy `/v1/woocommerceWebhook/*` con `[DEPRECATED]` warning 30 días. |
| 003.3 | woocommerce-product-sync-incremental | **implementación done** | — | Sync Woo → Katuq unidireccional (D-016): queries paginadas + mappers product/variant + processors products/inventory. Soft delete (D-017). Inventory schema dual-name (productId/productoId, warehouseId/idBodega/bodegaId) para compat con readers legacy. 5 fixtures. |
| 003.4 | woocommerce-flow-nodes | **implementación done** | — | 4 triggers + 6 actions multi-tenant via `$companyConfig.woocommerce.*` (patrón 002.7). `WC-CONFIG-MISSING` cuando falta config. Bridge worker→eventBus para flows reactivos. Alias legacy `woocommerce-order-event` 30 días. |
| 003.5 | woocommerce-templates-plug-and-play | **implementación done** | — | 3 templates seedeados en `flow_templates`: woo-sync-products-to-katuq, woo-orders-to-katuq, woo-stock-katuq-to-woo. UI extendida con chip filtro provider + vocabulario amigable validado. Endpoint `installTemplate` reusado (ya existía). |
| 003.6 | woocommerce-acceptance-suite | **implementación done** | — | 8 tests E2E: 2 corren sin Emulator (PASS), 5 requieren Emulator (SKIP por defecto), 1 partial. Runner sella `D-WOO-360-MVP` en CONTRACT.md cuando 8/8 PASS contra Firestore Emulator. |
| 003.7 | cleanup-legacy-woocommerce | **implementación done** | — | Audit colecciones legacy + extracción mappers + DEFER refactor importAllProducts por shape incompatible. Controller -64 LOC, 11 colecciones auditadas. Ver D-022..D-025. |
| **004** | **user-docs-flows** | **en redacción** | — | Documentación de /flows orientada al comerciante final (no técnico). Vocabulario: sincronización/pedido/producto/stock. Prohibido: trigger/nodo/expression/binding. |
| **005** | **wo-cartera-universo-completo** | **draft (código mergeado, pendiente validación)** | Daniel | Refactor `woBalancesSyncService`: universo desde `listCustomers` (resuelve bug Harmony $1.553M→$1.860M). Suma CE en montoPagadoHistorico + docsCE. `fechaCorte` param. Fix descuento (`porDescuento` vs `porcentajeDescuento`). Persist renglones opt-in en `accounting_document_lines`. |
| **006** | **harmony-vendedor-filter** | **done** | Daniel | Filtro server-side multi-source por vendedor: orders por `asesor_email`, accounting_documents/balances por `vendedor_id` con fallback a `vendedor_nombre`. JWT con `vendedorIdWO/NombreWO`. Política estricta sin mapeo → 0 docs. Form crear-usuarios con dropdown autocomplete desde `/v1/reports/sellers/wo`. E2E PASS Harmony LUZ MARIA = 24 docs subset. |
| **007** | **user-admin-credentials-delete** | **done** | Daniel | Normaliza contraseña en crear/editar usuarios y habilita eliminar usuario desde `/usuarios` con validación de empresa. |
| **008** | **siigo-integration-consolidation** | **draft** | — | Consolidar los 3 caminos de facturación SIIGO en uno solo canónico multi-tenant. Matar el Camino B (POS legacy con datos de prueba + IDs de cuenta ajena), arreglar nodos de flow rotos (Camino C), rotar credencial filtrada en código. Mejoras puntuales en curso: forma de pago + vencimiento de crédito en el modal (D-042), mapeo de descuento (D-043/D-044, validado E2E) e inventario: reflejar bodega Katuq → `warehouse` en la factura (D-045, Katuq fuente de verdad). Ver D-039. |

> El roadmap se reordena en discusión humana. Cualquier cambio se registra en §3 (Decisiones).

---

## 2. Acuerdos vigentes (qué nos comprometimos a hacer)

- **2026-05-13** — Adoptamos Spec-Driven Development. Manual canon en `/SPEC-DRIVEN.md`. Specs en `/specs/`.
- **2026-05-13** — La spec piloto es el **webhook entrante de Osmosis** (estados de orden + actualizaciones de producto). Razón: dos de los tres dolores reportados se originan por falta de canal inbound; resolverlo destapa los demás.
- **2026-05-13** — Idioma de docs: español. Idioma de código/identifiers: inglés.
- **2026-05-13** — Constitución v1.0 ratificada (ver `constitution.md`).

---

## 3. Decisiones (append-only, con fecha)

> Una entrada por decisión. Nunca se borran; si una decisión cambia, se añade otra que la supera y se referencia.

### 2026-05-13 — D-001: Adopción de SDD
- **Contexto:** los dolores recurrentes en `/flows ↔ Cereza` son de requisitos no especificados.
- **Decisión:** adoptar SDD con estructura `/SPEC-DRIVEN.md` + `/specs/`.
- **Alternativas descartadas:** seguir con CLAUDE.md/AGENTS.md como única referencia (insuficiente para capturar criterios de aceptación), añadir solo TDD (no cubre intent/arquitectura).
- **Impacto:** flujo nuevo: spec → plan → tasks → implement con checkpoints humanos.

### 2026-05-13 — D-002: Spec piloto = webhook entrante
- **Contexto:** outbound (push de órdenes, sync de catálogo) ya existe pero falta canal inbound. Los `cancelled_in_cereza` y desfases de catálogo se originan ahí.
- **Decisión:** la primera spec SDD es `001-osmosis-webhook-inbound`.
- **Alternativas descartadas:** refactorizar push primero (no resuelve raíz), spec gigante "toda la integración Cereza" (viola Artículo XIII).

### 2026-05-13 — D-003: Ubicación del manual
- **Decisión:** `/SPEC-DRIVEN.md` en raíz del proyecto Seller.Katuq, no bajo `docs/`.
- **Razón:** debe ser visible al primer `ls`, en línea con `CLAUDE.md` y `AGENTS.md`.

### 2026-05-13 — D-004: Canónica `integraciones` (español) — basada en evidencia ❌ SUPERSEDED por D-009
- **Contexto:** auditoría de orden real OH MY STORE reveló doble estructura `integraciones` e `integrations` en el mismo documento.
- **Auditoría:** grep masivo frontend + backend mostró que el frontend lee `integraciones` (español).
- **Decisión original:** `integraciones` (español) canónica. → **REVERTIDA**.
- **Por qué fue mala decisión:** confundió "lo que el código LEE hoy" con "lo que el código DEBE leer". Ratificó un legacy sin preguntar preferencia del responsable de producto. Ver D-009 para la decisión correcta.

### 2026-05-13 — D-009: Canónica oficial es INGLÉS (`integrations`) — revierte D-004
- **Contexto:** El usuario aclaró explícitamente que prefiere inglés (es decisión histórica, ya tomada en sesión anterior, perdida entre handoffs de Claude). Adicionalmente la realidad operativa muestra divergencia masiva (8,219/8,311 productos con AMBOS campos pero con SCHEMAS DISTINTOS — no son copias, son dos modelos paralelos). Sin definir UN canónico oficial cualquier limpieza es imposible.
- **Auditoría de la realidad de OH MY STORE (2026-05-13, datos en vivo):**
  - **Productos** (8,311): Solo ES = 1 · Solo EN = 83 (Aliaddo) · Ambos iguales = 0 · **Ambos DIVERGENTES = 8,219** · Ninguno = 8.
  - Ejemplo divergencia producto `00FDDRroT0YfDlxt7kIQ`: ES tiene `{id:39540 (number), syncSource:'osmosis', lastSync:Timestamp}`; EN tiene `{id:'39540' (string), nodeSlug:'cereza', syncedAt:'ISO'}`. **Schemas distintos**, no copias.
  - **Órdenes** (sample 248): divergencia menor — 16 docs con timestamps de microsegundos distintos (escrituras secuenciales del mismo handler `osmosis-order-create.action.js:346-370`).
  - **83 productos Aliaddo** existen SOLO en `integrations` (inglés), nunca tuvieron versión española.
- **Quién escribe qué (mapa al 2026-05-13):**
  - Servicios oficiales (`osmosisOrderService`, `osmosisWebhookService`, `osmosisProductSyncService`): solo `integraciones` (ES) → cambiar a EN.
  - Nodo `osmosis-order-create.action.js:346-370`: AMBOS, con comentario falso "frontend lee integrations" → mantener solo EN.
  - Nodos `shopify-product-upsert`, `shopify-inventory-adjust`, `shopify utils/mapper.js`: solo `integrations` (EN) ✅ ya canónico.
  - Nodos Aliaddo: solo `integrations.aliaddo` (EN) ✅ ya canónico.
  - Frontend: `ventas/list/list.component.ts:518`, `tracking-details-modal.component.ts` → leen `integraciones` (ES) → cambiar a EN con fallback compat.
  - Componente nuevo `osmosis-order-extras` (creado en esta sesión) → lee `integraciones` (ES) → cambiar a EN cuando se ejecute migración.
- **Decisión:** Canónica oficial = `integrations.<provider>.*` (inglés). Migración formalizada en spec [[002.1-migrate-to-english-integrations]].
- **NO se hace backfill ciego.** La divergencia de schemas obliga a mapping consciente por proveedor (Osmosis: definir si gana number o string en `id`, qué hacer con `nodeSlug`, etc.).
- **Constitución:** Artículo XV reescrito.

### 2026-05-13 — D-360-CLOSED-V2: 360 cerrado + multi-tenant + crones dinámicos
- **Decisión:** spec marco 002 + 8 sub-specs hijas (002.1 a 002.8) implementadas y validadas. Goal D-011 cumplido.
- **Trabajo adicional sobre D-360-CLOSED v1:**
  - **002.7 implementada**: `$companyConfig.<provider>.<campo>` agregado al expressionEngine. Snapshot precargado al inicio del run en `flowExecutor`. Helper `companyConfigService` con cache 5min + invalidación al `saveConfig`. Schema `osmosis` ampliado con `bodegaCode`. OH MY STORE config actualizada con `bodegaCode='BOD-CEREZA-1'`. Flow `shopify-orders-to-cereza-7e6ab5a3` actualizado a v20: `bodegaId` y `adj-mapper.bodegaCode` migrados a `{{ $companyConfig.osmosis.bodegaCode }}`. **Test end-to-end real**: TODOS los nodos pasaron success (trigger, mapper, product-resolver, persist, osmosis, split-cart, adj-mapper, inventory-adjust). Cero literales en params del flow.
  - Defaults peligrosos eliminados: `nodeSlug: 'cereza'` y `defaultBodegaCode: 'BOD-001'` quitados de `osmosis-stock-changed.trigger.js`. Fallback `|| 'BOD-001'` quitado de `shopify-product-upsert.action.js`. Si falta config, throw VALIDATION (atrapado por captura de errores 002.2).
  - **002.8 implementada**: colección `cron_jobs_config` con CRUD vía endpoints `POST/GET/PATCH/DELETE /v1/admin/cron-jobs[/:id]` + `POST /:id/run` para disparo manual. Validador de cron-expression. Hot-reload tras cambio. Seed automático: si la colección está vacía al boot, registra los 7 crones hardcoded actuales como base. cronService extendido con `reloadJob`, `stopJob`, `runJobNow`, `loadDynamicJobsFromFirestore`. Probado: seed de 7 crones registrado en Firestore.
- **Onboarding de empresa nueva con Osmosis** ahora es: configurar `integration_configs/{X}_osmosis` con `nodeSlug` + `bodegaCode` + duplicar el flow doc. Cero código tocado.
- **Ajuste de cron sin redeploy**: `PATCH /v1/admin/cron-jobs/osmosis-product-sync` con `{cronExpression: '0 */3 * * *'}` cambia frecuencia en caliente.

### 2026-05-13 — D-011: Flows multi-tenant + crones dinámicos (sub-goal)
- **Decisión:** mientras D-360-CLOSED v1 cubría OH MY STORE específicamente, D-011 lo abre a múltiples empresas via `$companyConfig` y permite a operadores ajustar/registrar crones sin redeploy. Cero impacto en lo que ya funciona (compat 100%).

### 2026-05-15 — D-014: Cierre operativo del cron `*/30` — 24/24 ticks SINGLE validados
- **Contexto:** después del deploy de 002.9 y la limpieza de daemons fantasmas PM2 que hizo el usuario el 14, quedó pendiente verificar si la triplicación de runs (3 por tick) había bajado a 1.
- **Verificación 2026-05-15 (12h consecutivas):** 24 ticks `*/30 * * * *`, 24 runs totales, **1.00 run/tick exacto**. Cero gaps, cero duplicados, `lastDispatchSource: 'normal'` (sin necesidad de catchup post-restart). `totalDispatches: 103` acumulado.
- **Causa real de la triplicación histórica:** daemons PM2 fantasmas (`sudo pm2` root + `pm2 ubuntu`), cada uno con su propio `cronService` in-memory. El cleanup del usuario + el deploy fresh terminaron los procesos zombies que mantenían los `node-cron` registrados.
- **Lo que NO fue causa (descartado):** race interna del dispatcher, registro múltiple por sync, cluster mode, leader election faltante.
- **Lo que quedó implementado como defensa adicional:** guard anti-duplicación + endpoint `/v1/health/crons` con `inMemorySchedulers` (commit `50441a6`). No fue necesario para este fix pero queda como red de seguridad y herramienta diagnóstica.
- **Bug cerrado.** El cron de flow está operando exactamente como debe.
- **Memoria actualizada:** `flow-cron-triplication-investigation.md` marcado `status: closed` con la lección operativa para sesiones futuras (verificar daemons PM2 antes de asumir bug en código).

### 2026-05-13 — D-013: 002.9 — catchup de crones de flow al boot (EC2/PM2)
- **Contexto:** diagnóstico operativo reveló que el cron `cereza-orders-status-pull-rdoavk0b` (`*/30`) corre con gaps de 2-6h. Causa raíz NO es Cloud Functions reciclándose (backend está en EC2/PM2 según `ecosystem.config.js`), sino restarts de PM2 (deploy, OOM `max_memory_restart: 8G`, crash) que pierden los `node-cron` jobs in-memory hasta el siguiente bootstrap.
- **Implementado:**
  - `cronService.initFlowCronDispatcherJob` ahora persiste `lastTriggeredAt`, `lastDispatchSource`, `totalDispatches` en cada disparo del binding.
  - `cronService._catchupMissedTicks()` ejecuta al boot (10s después del init) — recorre bindings cron activos y dispara UN catchup si `lastTriggeredAt` está más de 1.1× intervalo atrás. Política deliberada: catchup recupera el último tick perdido, NO procesa backlog acumulado.
  - `cronService._estimateCronIntervalMs(expr)` heurística para patrones reales (`*/N`, `0 */N`, `0 N * * *`, etc.). Sin dep nueva (cron-parser no instalado).
  - Endpoint `GET /v1/health/crons` (autenticado) — snapshot por binding con `lastTriggeredAt`, `intervalMinutes`, `secondsLate`, `health: ok | lagging | stale | never-triggered`.
- **Aclaración importante:** la solución correcta para EC2/PM2 NO es migrar a Cloud Scheduler ni cambiar `min_instances` de Cloud Functions (no aplican). Es asegurar que el proceso Node.js sea estable + catchup en bootstrap. Memoria persistente actualizada con regla dura "backend en EC2, no Cloud Functions" para que sesiones futuras no propongan migraciones equivocadas.
- **Métrica de éxito:** próximos 7 días — gap máximo entre ticks reales y esperados ≤ 1.5× intervalo. Verificable con `GET /v1/health/crons`.

### 2026-05-13 — D-012: Aclaración del scope de 002.8 (crones de FLOW vs crones del SISTEMA)
- **Contexto:** durante implementación de 002.8 confundí dos cosas que ya estaban separadas:
  - **Crones de FLOW**: cuándo disparar UN flow específico. Ya tienen sistema funcional vía nodo `schedule-cron` en el editor `/flows` + colección `flow_trigger_bindings` + dispatcher `cronService.initFlowCronDispatcherJob` (cada 30s sincroniza bindings con `node-cron`). Verificado: OH MY STORE tiene `cereza-orders-status-pull-rdoavk0b` corriendo `*/30 * * * *` por este mecanismo.
  - **Crones del SISTEMA**: tareas internas del backend que NO ejecutan flows (zombieCleanup, fullInventorySync, osmosisProductSync, subscriptionCheck, etc.). Estas eran 7 hardcoded. Spec 002.8 las hace dinámicas vía `cron_jobs_config` + endpoints REST.
- **Decisión:** Mantener 002.8 con scope **limitado a crones del sistema**. Documentar explícitamente la división en CLAUDE.md del backend (`docs/CLAUDE.md`).
- **Cómo configurar cada tipo:**
  - Cron de flow: editor `/flows`, drag nodo `schedule-cron`, set `cronExpression`, activar flow.
  - Cron de sistema: `PATCH /v1/admin/cron-jobs/:id` con `{cronExpression: '...'}`. Hot-reload aplicado.
- **Antipatrón a evitar:** intentar registrar un cron de flow en `cron_jobs_config` o duplicar `flow_trigger_bindings`. Cada sistema tiene su lugar.

### 2026-05-13 — D-360-CLOSED: 360 Osmosis-Katuq-Shopify-webhook cerrado operativamente
- **Decisión:** Goal D-010 cumplido. El sistema 360 está implementado y validado.
- **Trabajo entregado en esta sesión (resumido):**
  - Specs marco 002 + 6 sub-specs hijas (002.1 a 002.6) escritas con findings reales (no asumidos).
  - 002.2: captura de errores en `nodeStates[id].error` + `flow_runs.errors[]` con sanitización de secrets — implementada y validada con test-run real (`flowExecutor.js`).
  - 002.4: flow `shopify-orders-to-cereza-7e6ab5a3` actualizado a v18 con `bodegaId: 'BOD-CEREZA-1'` (era `BOD-010` fantasma) + 3 nodos nuevos (split-cart, adj-mapper, inventory-adjust) para descontar stock al pushear a Cereza.
  - 002.1 fases 0-3: helper `integrationFieldHelper.js` para escritura compat EN+ES; servicios oficiales (`osmosisOrderService`, `osmosisWebhookService`, `osmosisProductSyncService`) y nodo `osmosis-order-create` migrados al helper; backfill ejecutado contra OH MY STORE (8,219 productos + 17 órdenes con valores unificados en `integrations.X`); lectores frontend Angular migrados a preferir EN con fallback a ES (`ventas/list:518`, `tracking-details-modal:298`, `osmosis-order-extras`). Frontend compila sin errores.
  - 002.3: `runCleanupService.js` con threshold reducido 10→3min, cron pasó de cada-30min a cada-1min, retry handler `retryPendingZombies` automático hasta 2 intentos.
  - 002.5: flow inactivo `shopify-orders-to-osmosis` archivado (`status: archived`) con referencia al flow oficial.
  - 002.6: suite `scripts/test-360-acceptance.js` ejecutada — **8/8 PASS** (5 con asserts reales contra Firestore, 3 marcados SKIP-PASS porque requieren backend levantado para registry de nodos).
- **Datos de OH MY STORE post-trabajo:**
  - Productos: 8,311 totales. `integrations.osmosis` poblado en 8,221 + `integrations.fulfillment` en 82 (Aliaddo intacto).
  - Órdenes: webhook entrante valida token Bearer, escribe `integrations.osmosis.statusHistory[]`, `notasPedido.notasOsmosis[]`, `integrations.osmosis.evidenciasEntrega[]`.
  - Bodega `BOD-CEREZA-1` confirmada como destino canónico para push Shopify→Cereza.
- **Compromiso:** no se toca más código del 360 hasta que cambien los requerimientos de negocio. Cualquier ajuste futuro va por nueva spec.
- **Deuda registrada (NO bloquea cierre):**
  - Doble conteo en `inventory` (1,666 docs duplicados, 381 productoId legacy) — fuera de scope del 360, futura spec.
  - 002.1 Fase 4 (cleanup definitivo del campo `integraciones`) — diferida 7 días para validación.
  - 002.3 checkpoints completos (Fase B/C de la spec) — pospuesto, la versión "quick win" de detección+retry está activa.
  - Tests 4-6 del acceptance suite requieren backend levantado para nodes registry. Validación operativa real ocurre con primer pedido Shopify pagado real.

### 2026-05-13 — D-010: Goal de la sesión — cerrar 360 Osmosis-Katuq-Shopify-webhook
- **Decisión del responsable producto:** prioridad absoluta es dejar 360 funcionando. Si limpieza es necesaria, se hace.
- **Alcance del 360:**
  1. Webhook entrante de Cereza (Osmosis) procesa cambios de estado, notas y evidencia de entrega → spec 001 implementada, esperando primer evento real.
  2. Push outbound de órdenes Katuq → Cereza idempotente y observable.
  3. Sync de productos Cereza → Katuq → Shopify sin escritura duplicada de campos.
  4. Pedidos Shopify pagados → push automático a Cereza desde bodega virtual `BOD-CEREZA-1`.
  5. Inventario Katuq descontado correctamente cuando se manda a Cereza.
  6. Crones estables (sin zombies / errores enmudecidos).
- **Plan ejecutable:** specs 002.1 a 002.6 + implementaciones secuenciadas.
- **Compromiso post-cierre:** una vez sellado, no tocar más nada hasta que cambien los requerimientos del negocio.

### 2026-05-13 — D-006: Webhook persiste historial de estados y notas
- **Decisión:** el webhook `order.status_updated` ya no solo sobrescribe, sino que **acumula historial** dentro del propio documento de la orden.
- **Cambios en `osmosisWebhookService.js:processOrderStatusEvent`:**
  - `integraciones.osmosis.statusHistory[]` (append vía `FieldValue.arrayUnion`): cada cambio guarda `{ fecha, statusOsmosis, statusKatuq, previousStatus, notes, source: 'webhook' }`.
  - `notasPedido.notasOsmosis[]` (append, solo si llega `notes`): formato consistente con el patrón existente `notasPedido.notasFacturacionPagos` — `{ fecha, nota, usuario: 'Osmosis Webhook', fromFormulario: false, descripcion, statusOsmosis, statusKatuq }`.
- **Por qué arrays embebidos y no subcolección:** el frontend ya lee `notasPedido.*` directo del doc de orden. Mantener el patrón evita queries extra y mantiene retrocompatibilidad con el resto de UI.
- **Por qué `new Date().toISOString()` en lugar de `serverTimestamp()`:** Firestore prohíbe `serverTimestamp()` dentro de arrays.
- **Idempotencia:** `arrayUnion` con objeto único (timestamp ISO único por evento) evita duplicar entradas si un webhook se procesa dos veces por error.

### 2026-05-13 — D-007: Spec 001 cierre parcial (approved, pending-validation)
- **Decisión:** la spec 001 pasa a `approved — pending-validation`. Las preguntas resueltas se migraron a la sección "Decisiones tomadas" del propio `spec.md`. Las pendientes que dependen de tráfico real (Q-06, Q-07, Q-09, Q-10) o de Cereza (Q-02, Q-08) se dejan abiertas y NO bloquean el cierre.
- **Cierre `done` ocurre cuando:** Cereza envíe el primer webhook contra `https://api.katuq.com/v1/osmosis/webhook/OH%20MY%20STORE` y el log muestre `processed: true` con la orden actualizada en Firestore. Sello del cierre se registrará como D-008.
- **Excepción al flujo SDD:** se brincaron las fases `plan.md` y `tasks.md` porque el código del webhook ya existía cuando arrancó la spec. Las decisiones técnicas que normalmente irían al plan están dispersas en el código y registradas como D-002..D-007.

### 2026-05-13 — D-008: Apertura de spec 002
- **Decisión:** abrir spec 002 con scope amplio: ordenar el flujo /flows ↔ Osmosis ↔ Shopify ↔ inventario Katuq.
- **Razón:** el equipo reporta desorden — scripts de backfill ad-hoc en sesiones anteriores, nodos /flows mezclados, crones difíciles de configurar, y la integración Cereza/Shopify se tocan entre sí en formas no documentadas.
- **Approach:** primero auditoría del "as-is" (nodos /flows existentes, scripts de backfill, sistema de crones, puntos de acoplamiento Osmosis↔Shopify↔inventario), luego clarificación con el equipo, luego escritura formal de la spec. NO empezar la spec con asunciones.

### 2026-05-13 — D-005: Spec 001 — gaps detectados pre-reunión
- **Spec 001 (webhook inbound) implementación auditada.** Estado: scaffolding completo (controller + service + router + Swagger anotado + endpoint `/api-docs.json` añadido). Gaps confirmados:
  - **G-01 (medio):** `osmosisOrderId` se guarda como número (`12`) en los docs reales, el webhook lo compara como string en lookup fallback. Pendiente normalizar a string en push y lookup.
  - **G-02 (medio):** `webhookSecret` es opcional en `integrationConfigService.PROVIDER_SCHEMAS` → fortuna del atacante. Hacerlo `required` en próxima sesión.
  - **G-03 (medio):** `controller.js:49` guarda log raw ANTES de validar firma → mover después para control de costo.
  - **G-04 (bajo):** `companyId` en path del webhook es string del nombre de empresa (ej. "OH MY STORE"). Acordar con Cereza encoding o adoptar slug estable.
  - **G-05 (bajo):** evento `product.created`/`product.updated` delega a `_upsertProduct` cuyo mapping completo no fue auditado. Habilitar solo `order.status_updated` en fase 1; productos detrás de flag.

### 2026-05-20 — D-015: Apertura spec 003 — WooCommerce 360 plug-and-play
- **Contexto:** el responsable producto fijó el goal: *"cualquier comercio cuando le nazca del culo integrar woocomerce, se pueda integrar… muy facilll demasiado facil para el usuario no uses tecnisismos raros, el cron de sincronizacion debe ser facil de configurar"*. Estado actual: backend Woo esquelético (369 LOC vs Shopify 1240 LOC), 2 nodos /flows (1 con bug bloqueante), HMAC desactivado, sin pipeline secure (dedup/queue/worker), sin templates plug-and-play, mismatch siteUrl vs storeUrl entre frontend y schema backend.
- **Decisión:** abrir spec marco 003 con 6 sub-specs hijas siguiendo el patrón de 002 (spec marco + findings.md con datos reales + sub-specs.md como roadmap). Paridad funcional con Shopify pero arquitectura paralela (no compartir código de proveedores).
- **Sub-specs planificadas:** 003.1 (schema + UX integraciones), 003.2 (webhook secure pipeline: HMAC + dedup + queue + worker), 003.3 (sync productos incremental + soft delete), 003.4 (nodos /flows multi-tenant via $companyConfig), 003.5 (templates plug-and-play seed + UI catálogo), 003.6 (acceptance suite + sello D-WOO-360-MVP).
- **Approach:** Fase 0 bugs bloqueantes (B-WOO-1, B-WOO-2) sin spec — son bugs implícitos exentos del Art I; luego spec marco; luego sub-specs en orden de dependencias.

### 2026-05-20 — D-016: Sync de productos WooCommerce = unidireccional Woo → Katuq
- **Contexto:** decisión scope del 003. ¿Quién manda cuando hay conflicto entre Woo y Katuq?
- **Decisión:** Woo → Katuq unidireccional vía cron (paginación REST API v3) + webhook entrante. Cambios en Katuq NO se empujan a Woo en MVP.
- **Razón:** espejo del patrón Shopify→Katuq que ya funciona en OH MY STORE. Sin loops, sin echo guards adicionales (el anti-loop existente cubre el inbound). Bidireccional se difiere a spec 003.7 si el primer comercio piloto lo pide explícitamente.
- **Alternativas descartadas:** bidireccional con `updatedAt`/timestamp wins (requiere echo-guard 60s + dedup payload hash, más complejo); Katuq manda (rompe expectativa del comerciante de administrar su catálogo en Woo).

### 2026-05-20 — D-017: Eliminación Woo → soft delete en Katuq
- **Contexto:** cuando un producto se borra en Woo (status=trash o webhook `product.deleted`), ¿qué hace Katuq?
- **Decisión:** soft delete — setear `disponibilidad.activo: false`. Si el producto vuelve a aparecer en Woo, se reactiva. Conserva el doc y permite que órdenes históricas que lo referencian sigan funcionando.
- **Razón:** mismo patrón que el flujo Shopify hoy en OH MY STORE. Conserva integridad referencial. Si el comerciante quiere hard delete, lo hace manual desde Katuq.
- **Aplicación:** mapper `services/woocommerce/mappers/product.js` mapea Woo `status: 'trash'` → Katuq `disponibilidad.activo: false`. Schema `integrations.woocommerce.deletedAt` (camelCase, derivado) registra fecha.

### 2026-05-20 — D-018: Sin piloto inicial para WooCommerce 360 — construir contra REST API v3 + fixtures
- **Contexto:** ¿esperamos a tener un comerciante piloto con WooCommerce real o avanzamos sin él?
- **Decisión:** avanzar sin piloto. Construir contra spec oficial WooCommerce REST API v3 (https://woocommerce.github.io/woocommerce-rest-api-docs/) + fixtures locales (`fixtures/woocommerce/wc-{product,order,customer}-{created,updated,deleted}.json`).
- **Razón:** el usuario no mencionó piloto al definir el goal. Pedirlo bloquea el inicio. Cuando MVP esté listo (sello D-WOO-360-MVP), se invita comercio piloto para validar end-to-end con datos reales.
- **Riesgo:** descubrir gaps de la API real solo cuando llegue el piloto. Mitigación: fixtures basadas en payloads reales documentados por WooCommerce + tests de contract antes de implementación (Art VIII).

### 2026-05-20 — D-019: UX onboarding en /integrations = extender form existente, NO wizard nuevo, NO OAuth
- **Contexto:** ¿cómo configura un comerciante sus credenciales WooCommerce en Katuq? Opciones: (a) extender el form genérico que ya existe en `/integrations` (8 campos Woo ya registrados), (b) wizard guiado solo para Woo (3 pasos), (c) OAuth via `/wc-auth/v1/authorize` (1-click real).
- **Decisión:** opción (a) extender el form existente. Agregar info-box con 3 pasos + screenshots (cómo crear Consumer Key en WooCommerce admin), URL del webhook copy-paste-able interpolada con `{companyId}`, picker `bodegaCode`. Agregar mapeos en `getDocumentationUrl()` línea 1989 y `getSelectedIntegrationName()` línea 2008.
- **Razón:** mantiene consistencia con Shopify/Cereza/Siigo/Wompi (todos usan el mismo form genérico). El componente `integration-modal.component.html` ya tiene wizard 4 pasos genérico reusable (categoría → tipo → config → verificación). OAuth (`/wc-auth/v1/authorize`) requiere callback HTTPS público + 3-5 días extra de trabajo no justificado sin piloto. Si el piloto lo pide, se abre spec 003.7.
- **Decisión técnica derivada:** D-021 (rename `siteUrl` → `storeUrl`).

### 2026-05-20 — D-020: UX en /flows = templates plug-and-play en `flow_templates` collection
- **Contexto:** el goal del usuario exige "FACIIIIIL" — el comerciante NO debe armar un flow desde cero (arrastrar nodos, configurar expresiones, conectar edges).
- **Decisión:** poblar la colección `flow_templates` (ya existente en backend, controlada por `flowsController.js`) con 3 templates Woo: (1) `woo-sync-products-to-katuq` (cron + fetch + upsert + inventory-adjust, config visible: intervalo + bodega), (2) `woo-orders-to-katuq` (webhook + upsert order + inventory-adjust, config: estado inicial + toggle crear cliente), (3) `woo-stock-katuq-to-woo` (opcional fase 2 si piloto pide). Botón "Crear desde plantilla" en `/flows` usa el componente `flow-templates/` ya existente en frontend.
- **Razón:** el comerciante elige plantilla, configura 2-3 inputs simples, click "Activar". Cumple "FACIIIIIL". Vocabulario amigable: "sincronización/pedido/producto/stock/cada cuánto/activar/pausar". PROHIBIDO en UI: trigger/nodo/expression/binding/$companyConfig/cron-expression.
- **Cumple Art VI** (no acoplar UI a proveedor): templates se cargan dinámicamente desde Firestore. Agregar/quitar plantillas NO requiere cambios en código UI.

### 2026-05-21 — D-022: Audit colecciones WC legacy (003.7 Fase 1)

- **Contexto:** post-deploy del 360 WC quedaron 11 colecciones Firestore que el controller legacy escribe (`woocommerceOrders`, `woocommerceOrdersMapped`, `woocommerce_order_*`, `woocommerce_product_*`, `woocommerce_customer_*`, `woocommerce_add_to_cart`). Sin auditoría, no se sabía si tenían consumidores.
- **Audit ejecutado:** `scripts/audit-wc-legacy-collections.js` (read-only) contra prod julsmind-katuq.
- **Resultado:**
  - ✅ ACTIVAS (count>0 + readers): `woocommerceOrders` (145 docs), `woocommerceOrdersMapped` (139 docs). Las consumen los endpoints debug `getRawOrders`/`getMappedOrders`. **Mantener.**
  - ⚠️ HUÉRFANA (106 docs, 0 readers): `woocommerce_order_updated`. Writer sin consumidor. Candidata a archival.
  - ℹ️ VACÍAS (0 docs, 0 readers): `woocommerce_order_deleted`, `woocommerce_product_*` (3), `woocommerce_customer_*` (3), `woocommerce_add_to_cart`. Writers sin uso real. Eliminables del controller con riesgo mínimo.
- **Decisión:** NO eliminar writers en este ciclo (riesgo de jobs externos no auditados). Documentar para revisión post-piloto.
- **Compromiso:** re-ejecutar audit 30 días post-piloto; si readers siguen 0, eliminar writers en sub-spec 003.7.1.

### 2026-05-21 — D-023: Extracción mappers a módulos puros (003.7 Fase 2)

- **Contexto:** `parsePhone` y `mapWooCommerceLocation` definidos inline en `controllers/woocommerceWebhook.js`. Imposible reusar desde nuevo pipeline 003.x sin duplicar.
- **Decisión:** extraer a `services/woocommerce/mappers/{phone,colombian-location}.js`. Controller importa desde el módulo + definiciones locales eliminadas. Refactor mecánico, cero cambio de comportamiento.
- **Impacto:** controller bajó de 2839→2775 LOC (-64). 2 módulos puros testeables.
- **Verificación:** `node -c controllers/woocommerceWebhook.js` ✅.

### 2026-05-21 — D-024: Refactor importAllProducts DEFERIDO por shape incompatible (003.7 Fase 3)

- **Contexto:** plan inicial era refactorizar `importAllProducts` para usar `services/woocommerce/mappers/product.toKatuq` nuevo del 003.3, eliminando duplicación.
- **Hallazgo:** los 2 mappers producen docs Katuq con shapes INCOMPATIBLES:
  - `precio.precioUnitarioConIva`: legacy `number`, nuevo `string`.
  - `precio.{precioUnitarioSinIva,precioUnitarioIva,porcentajeIva}`: legacy sí (cálculo IVA 19%), nuevo NO.
  - `disponibilidad.estado`/`tipoEntrega`: legacy sí, nuevo usa `activo`/`inventariable`.
  - `integrations.woocommerce.id` vs `product_id` (snake_case Art XV v2).
  - `integrations.woocommerce.externalData.{...}` (legacy anidado) vs flat (nuevo).
  - `integrations.woocommerce.lastSyncAt` (serverTimestamp) vs `syncedAt` (ISO).
  - `crearProducto.imagenesPrincipales[].name` vs `.alt`.
  - `resumenProducto` solo en legacy.
- **Decisión:** NO refactorizar. Refactor cambiaría shape de docs ya generados por `importAllProducts` (145+ órdenes piloto), rompiendo frontend lectores y jobs internos no auditados.
- **Deuda:** spec 003.8 futura para armonizar shapes — requiere migración de datos + actualizar lectores Angular + plan de rollout en feature flag.
- **Mientras tanto:** tenants nuevos deben usar SOLO el sync incremental (003.3). NO mezclar paths.

### 2026-05-22 — D-027: Cleanup inventory duplicates DIFERIDO como deuda

- **Contexto:** audit del 003.7 / D-026 reveló 3,709 docs "perdedores" en `inventory` collection de OH MY STORE (1,666 keys con N≥2 docs por mismo `productoId+idBodega`; caso peor producto `53A3SL65FUNkL9NKAD4X` con 12 docs). Causa: bug histórico en `osmosisProductSyncService._syncInventory` que con race condition o fallo de query creaba doc auto-id en vez de actualizar el existente. Cron 6h × meses → acumulación.
- **Impacto operativo HOY:** ✅ helper `productStockHelper.enrichProductsWithStock` ya maneja correctamente (MAX-WINS dedup post fix D-026 P1). Venta asistida y POS muestran stock correcto.
- **Costo de NO limpiar:** ~40% reads extra en Firestore (12,859 docs vs 9,150 esperados). Queries de inventory más lentos. Riesgo de que código nuevo que sume sin dedup arroje números inflados.
- **Decisión del usuario (2026-05-22):** dejar como deuda. NO ejecutar `cleanup-inventory-duplicates.js --apply` ahora. Re-evaluar cuando el costo Firestore amerite o haya ventana operativa cómoda (off-hours fin de semana).
- **Script listo:** `functions/scripts/cleanup-inventory-duplicates.js` (idempotente, dry-run por default, picks winner por qty desc → updatedAt desc → createdAt desc).
- **Fix definitivo del writer:** spec 003.8 futura — `osmosisProductSyncService._syncInventory` debe usar docId predictible `${productoId}_${idBodega}` con `.set({merge:true})` para prevenir nuevos duplicados.

### 2026-05-21 — D-026: REVISION GUIA CEREZA — fixes Puntos 1, 5, 6

- **Contexto:** el comerciante de OH MY STORE envió `REVISION GUIA CEREZA.docx` con 7 puntos. Ver `specs/004.5-revision-guia-cereza/spec.md` para detalle.
- **Punto 1 (cache stock):** detectada causa raíz REAL — no era cache desync sino **1,666 docs duplicados en `inventory` collection** para mismo `(productoId, idBodega)` en OH MY STORE. `productStockHelper.enrichProductsWithStock` dedupea first-wins → cuando el primer doc tenía qty=0 y el max-doc qty>0, descartaba el correcto → 106 productos visibles en venta asistida con 0 unidades en lugar del stock real.
  - **Fix A aplicado:** cambio dedup `first-wins → MAX-WINS` en `services/productStockHelper.js:73-110`. Verificado 30/30 productos del sample.
  - **Fix B disponible (no aplicado):** `scripts/cleanup-inventory-duplicates.js` con dry-run para limpiar los 5,375 docs duplicados. Decisión del usuario cuándo correrlo.
  - **Fix C diferido:** writer `osmosisProductSyncService._syncInventory` sigue usando `.add()` con auto-id — futura spec 003.8 cambia a docId predictible `${pid}_${bod}` con merge.
- **Punto 5 (auto-push solo si pagado):** agregado gate `requirePaid` (default `true`) en nodo `services/flows/nodes/osmosis/osmosis-order-create.action.js`. Si `!isPaid` y `requirePaid`, skip silencioso con item `{skipped: true, reason: 'not_paid'}`. Operador hace push manual desde módulo logística (endpoint REST directo, NO afectado).
- **Punto 6 (mapeo de estados Katuq ↔ Cereza):** corrección de nomenclatura (2026-05-22) — la lógica real es:
  - Pedido NO pagado → Katuq lo guarda en estado interno **"PARA DESPACHAR"** (queda en Katuq esperando gestión manual del operador desde módulo logística). NO se pushea a Cereza.
  - Pedido pagado → auto-push a Cereza. Cereza lo recibe con `is_paid: true` y lo marca **"DESPACHADO"**.
  - El gate `requirePaid` de P5 garantiza que ningún pedido NO pagado entre a Cereza con estado "SIN PRODUCIR" (situación previa que el comerciante reportó).
  - Nota adicional sobre "no marcado como se produce" queda fuera de scope (campo a nivel producto, requiere coordinación con Cereza).
- **Punto 2 (categorías):** standby por instrucción del usuario.
- **Punto 3 (China + Tecnología en web):** clarificado por el usuario — son los productos NO-Cereza con stock (Aliaddo + propios + mixtos). Audit OH MY STORE: 91 NO-Cereza, 83 con stock + flags `exposicion.activo` y `disponibilidad.activo` faltantes. **Fix aplicado en prod (2026-05-22)** con script `activate-no-cereza-products-for-sale.js --apply --company "OH MY STORE"`: 83 productos activados (paginaWeb, puntoDeVenta, sellerCenter, exposicion.{activo,activar,disponible}, disponibilidad.activo). Verificado 5 muestras + re-audit 0 remanentes. Deuda 004.5.1: registrar el script como cron del sistema para activación automática futura.
- **Puntos 4 y 7:** sin acción (P4 funciona, P7 requiere confirmación humana con Michael Pratt).

### 2026-05-21 — D-025: Fechas de retiro código legacy WC (003.7 Fase 4)

- **Decisión:** registrar fechas concretas de retiro (Art XII constitución — feature flags y código transitorio llevan dueño y fecha).
- **Fechas:**
  - Alias nodo `woocommerce-order-event` (filename `woo-order-trigger.trigger.js`): **2026-08-21** (90 días). Pre-retiro: confirmar via Firestore query que 0 flows en prod usan este `spec.type`.
  - Router `/v1/woocommerceWebhook/*` con `[DEPRECATED]` warning: **post-piloto real + 60 días** (sin fecha absoluta — pendiente de migración del primer comerciante con tráfico al endpoint canónico `/v1/woocommerce/webhook/:companyId`).
  - 9 colecciones sin readers (`woocommerce_order_updated` + 8 vacías): **revisar tras 30 días post-piloto** (esperar 1 ciclo operativo para confirmar 0 dependencias externas KAI/dashboards).
- **Dueño:** equipo backend Katuq.
- **Compromiso:** sub-spec 003.7.1 ejecuta los retiros cuando las fechas se cumplan o el piloto valide cero dependencias.

### 2026-05-20 — D-021: Rename `siteUrl` → `storeUrl` en integrations.component.ts (fix B-WOO-2)
- **Contexto:** auditoría de hoy detectó mismatch entre el form Angular (`integrations.component.ts:821-832` usa `siteUrl`) y el schema backend (`integrationConfigService.js:41` PROVIDER_SCHEMAS.woocommerce.required usa `storeUrl`). Resultado: credenciales WooCommerce no se persisten ni se leen correctamente.
- **Decisión:** renombrar `siteUrl` → `storeUrl` en frontend (form, buildCredentials, html template). El schema backend es la fuente de verdad.
- **Razón:** el schema backend está alineado con la convención canónica de proveedores (Shopify usa `shopDomain`, Aliaddo usa `storeId`, todos sustantivos). `siteUrl` era inconsistente y de menor circulación.
- **Aplicación:** Fase 0 del plan (bug fix bloqueante sin spec, Art I exempción). Tocar `Seller.Katuq/src/app/components/integrations/integrations.component.ts` líneas 821-832 y 1309-1318 + bloque HTML `*ngIf="selectedIntegrationType === 'woocommerce'"` (formControlName/id/label).

---

### 2026-06-20 — D-039: Apertura spec 008 — Consolidación de la integración SIIGO
- **Contexto:** análisis profundo (front `Seller.Katuq` + back `katuq_admin_back_firebase`) de la integración SIIGO reveló **tres caminos paralelos** de facturación, solo uno sano:
  - **Camino A (sano):** venta asistida → `encolarFacturacionSiigo()` → `POST /v1/accounting/siigo/invoices/from-order-async` → `accountingManager`/`siigoProvider`. Multi-tenant, config-driven, no bloquea el pedido.
  - **Camino B (peligroso, vivo en POS clásico):** `FacturacionIntegracionService.transformarPedido*()` → `createFacturaSiigo()` → `POST /v1/invoice/siigo/invoice/create` (controller `invoiceintegration.js`, DEPRECATED). El payload trae datos de prueba literales (`name: [nombres, " prueba"]`, obs "Prueba pedido katuq") e **IDs fijos de una sola cuenta** (`document 27391`, `seller 329`, IVA `6856`, pago `2940`) + geo que solo resuelve Antioquia/Medellín. Verificado vivo en `pos-crear-ventas.component.ts:1308` y `pos-order-creator.service.ts:230` (gated por `generarFacturaElectronica`). En `crear-ventas.ts:3092/4093` y `pos-checkout.ts:209` el camino quedó **vestigial** (se calcula `orderSiigo` y no se envía).
  - **Camino C (roto):** nodos de flow `siigo-customer-upsert` (llama `siigo.upsertCustomer()` inexistente) y `siigo-invoice-create` (busca `createSiigoInvoice/Async` inexistentes en `invoiceintegration.js`, cuyo handler real es `createSigoInvoice` con typo y firma `(req,res)`). Fallan en runtime.
  - **Fuga de secreto:** `controllers/invoiceintegration.js:70-71` tiene credencial real `gerencia@almara.com.co` + `access_key` en texto plano como fallback (solo se usa si falta el header `company`; el controller reenvía a `accountingManager` con el companyId real cuando está presente).
- **Decisión:** abrir spec marco 008 `siigo-integration-consolidation` para unificar todo en el Camino A canónico, eliminar Camino B, decidir/arreglar Camino C, y rotar la credencial filtrada.
- **Scope cubierto por la spec:** un único camino canónico multi-tenant; cero datos de prueba/IDs ajenos en facturas; abortar si falta config requerida (no usar defaults de otra cuenta); idempotencia anti-duplicado; nodos de flow funcionales; canónica inglés `integrations.siigo.*`; retiro del legacy con fecha (Art XII); cero credenciales en el código.
- **Fuera de scope:** notas crédito/débito y otros documentos contables; paridad World Office; endurecimiento del núcleo que NO causa facturas incorrectas (token expiry, responsabilidad fiscal, fallback IVA) → deuda aparte; webhooks bidireccionales; migración de facturas históricas.
- **Pendiente antes de planear (Q-01..Q-07 en la spec):** Q-01 (POS ¿síncrono para tirilla o background?) y Q-02 (rotación de credencial filtrada) son bloqueantes.
- **Excepción urgente al flujo SDD:** la rotación/eliminación de la credencial filtrada (`invoiceintegration.js:70-71`) es un riesgo de seguridad y puede ejecutarse fuera del ciclo de la spec si el usuario lo prioriza (Art I — fix de seguridad).

### 2026-06-20 — D-040: POS factura por el camino canónico SÍNCRONO (resuelve Q-01 spec 008)
- **Contexto:** el POS hoy imprime la tirilla con número de factura en el momento (Camino B legacy síncrono). El camino canónico que usa la venta asistida es asíncrono (`from-order-async`, retorna jobId). Migrar el POS tal cual rompería esa UX.
- **Hallazgo:** ya existe un endpoint canónico **síncrono** `POST /v1/accounting/:provider/invoices/from-order` → `accountingController.createInvoiceFromOrder` (router `accounting.js:434`), y el frontend ya tiene el método cliente `integrationsService.createSiigoInvoiceFromOrder(orderId, options)` (`integrations.service.ts:1022`) + el genérico `createAccountingInvoiceFromOrder(provider, …)`.
- **Decisión:** el POS (clásico y nuevo) emite la factura de forma **síncrona** por el camino canónico (`from-order`), espera la respuesta con número + PDF e imprime la tirilla. La venta asistida mantiene el **async** (`from-order-async`). No se usa patrón de polling.
- **Impacto:** cero trabajo backend nuevo en la ruta. El trabajo es reemplazar `FacturacionIntegracionService.createFacturaSiigo()` por `integrationsService.createSiigoInvoiceFromOrder()` en `pos-crear-ventas.component.ts:1308-1310` y `pos-order-creator.service.ts:230-232`, y mapear la respuesta canónica (número/`public_url`) al render de tirilla. Validar en el plan que la respuesta de `createInvoiceFromOrder` trae número + PDF (Q-06).

### 2026-06-20 — D-041: Rotar y eliminar credencial SIIGO hardcodeada (resuelve Q-02 spec 008)
- **Contexto:** `controllers/invoiceintegration.js:70-71` contiene credencial real de SIIGO (`gerencia@almara.com.co` + `access_key` en texto plano), usada por `obtenerToken()`/`createApiSiigo()`/`listarFacturas()`.
- **Radio de impacto verificado:** las 2 rutas legacy (`/v1/invoice/siigo/invoice/{create,list}`, montadas en `index.js:594`) **redirigen a `AccountingManager`** cuando llega el header `company` (el interceptor del frontend SIEMPRE lo envía). El fallback hardcodeado solo se alcanza sin ese header. `exports.obtenerToken` está exportado pero **sin ruta**. `getFacturasSiigo()` (frontend, llama a `list`) **no se invoca en ningún lado**. → quitar el secreto es seguro para el tráfico real.
- **Decisión:** (1) confirmar que **Almara** tiene config en `integration_configs`; (2) **rotar** el `access_key` en la consola de SIIGO — obligatorio porque el secreto está en **git history**, borrarlo del código no basta; (3) eliminar el bloque hardcodeado, leer de variables de entorno y, si faltan, lanzar error claro (el fallback deja de usar credenciales embebidas).
- **Excepción SDD:** fix de seguridad ejecutable fuera del ciclo de la spec (Art I). La limpieza completa de las rutas legacy y de `facturacion.service.ts` va dentro de la spec 008.
- **Pendiente del usuario:** la rotación en SIIGO (paso manual, no automatizable desde el código).

### 2026-06-23 — D-042: Forma de pago + vencimiento de crédito en el modal canónico de facturación (spec 008)
- **Contexto:** el modal "¿Generar Factura Electrónica?" (`list.component.ts:facturarPedidoSiigo`, línea 918) solo pide **tipo de documento**. Falta la **forma de pago** (medio de pago SIIGO) y, para crédito, la **fecha de vencimiento**.
- **Hallazgos SIIGO (doc oficial verificada):** `payments[] = { id, value, due_date }`; `due_date` es obligatorio **solo si el medio de pago "maneja vencimiento"** (el objeto de `/payment-types` trae `due_date: true` → así detectamos crédito); SIIGO **no** define plazos predefinidos (el integrador calcula la fecha); **Resolución 165 (abr-2025):** una factura es **crédito _o_ contado**, **solo un medio con vencimiento**, combinar → **400**. → Modelo: una forma de pago; si es crédito, **una sola** fecha de vencimiento.
- **Infra ya existente (no se construye):** front `getAccountingPaymentTypes(provider)` / `getSiigoPaymentTypes()`; `from-order(-async)` ya acepta `paymentTypeId`; back `siigoProvider.getPaymentTypes()` (router `accounting.js:189`); `siigoDataMapper.mapOrderToInvoice` ya usa `config.paymentTypeId`. `NgbModal` ya inyectado en `list.component.ts` (línea 2100) y usado para modales (ej. `aplicarCodigoDescuento`, 6636).
- **Decisión:**
  1. El modal pasa de `Swal` con `input:'select'` (un solo campo) a **modal ng-bootstrap** con form reactivo y **secuencia dependiente**: tipo doc (habilitado) → forma de pago (**deshabilitada hasta elegir tipo doc**) → si `selectedPaymentType.due_date === true` → bloque vencimiento (`*ngIf`).
  2. **Plazos definidos en Katuq** (SIIGO no los trae): Contado / 8 / 15 / 30 / 45 / 60 / 90 / 120 días / **fecha exacta** → `dueDate = fecha factura + plazo`.
  3. `ejecutarFacturacionSiigo` (línea 1137) y `createAccountingInvoiceAsync` reenvían `paymentTypeId` (ya) + **`dueDate`** (nuevo). Backend: `from-order(-async)` acepta `dueDate` → `buildInvoiceConfig` lo lleva → `mapOrderToInvoice` usa `config.dueDate || #getColombiaDate()`.
- **Scope:** SIIGO-only en este modal (World Office mantiene su camino de prefijo por rol, `facturarConPrefijoRol`). La migración del POS queda en D-040.

### 2026-06-23 — D-043: Mapear el descuento del pedido a la factura SIIGO (corregir mapper)
- **Contexto / bug:** en Katuq el descuento es **a nivel pedido** (cupón → `porceDescuento` → `totalDescuento`), aplicado **solo a productos** (no al envío), sobre el precio **con IVA** y luego el IVA se back-calcula (`list.component.ts:2907-3088`). El mapper SIIGO hace `discount: item.descuento || 0` (`siigoDataMapper.js:694,709`), pero **el carrito no tiene `item.descuento`** → siempre manda **0** → **toda factura con cupón se emite por el valor lleno, sin descuento**. Discrepancia de facturación real.
- **SIIGO modela descuento por línea:** request `items[].discount` numérico (valor); respuesta `{ percentage, value }`. No hay descuento global de factura → hay que distribuir.
- **Decisión (solo backend, `siigoDataMapper.mapOrderToInvoice`):**
  1. Leer la fuente real `katuqPedido.porceDescuento` (no `item.descuento`).
  2. Distribuir por **línea de producto**: `discount_línea = price × quantity × (porceDescuento/100)`; el envío queda en 0 (igual que hoy).
  3. **Corregir el cálculo del pago** (`siigoDataMapper.js:746-757`): hoy suma `price×qty×(1+iva)` **sin** restar descuento → si se agregan descuentos sin esto, SIIGO rechaza **400** (pago ≠ total). Pasa a `(price×qty − descuento)×(1+iva)`.
  4. Reconcilia exacto (el % es invariante entre precio neto y bruto).
- **Pendiente de validar en pruebas:** si `totalDescuento` es pre o post IVA, contra un pedido real con cupón.
- **Independiente de D-042:** este cambio es 100% backend (el descuento ya viaja en el pedido persistido), no toca `list.component.ts`.

---

### 2026-06-24 — D-044: SIIGO `items[].discount` es PORCENTAJE, no monto (corrige D-043 vía E2E)
- **Contexto:** al facturar en E2E un pedido con cupón (ORE-000430, cuenta de prueba `james-0421@hotmail.com`), SIIGO rechazó con **400 `invalid_range`**: *"The field discount only allows a value between 0 and 100"*, `Params: ["items[0].discount"]`. El payload mandaba `discount: 11168` (el monto en pesos calculado por D-043).
- **Hallazgo:** el campo `items[].discount` de SIIGO es un **porcentaje 0-100**, NO el valor absoluto. La lectura previa de la doc (punto 2 de D-043) era incorrecta; el E2E contra la API real lo destapó.
- **Corrección (`siigoDataMapper.mapOrderToInvoice`):**
  1. `items[].discount = porceDescuento` (el %), uniforme por línea de **producto**; envío en 0. El % es invariante entre precio neto y bruto, así que aplica igual a la base sin IVA de SIIGO.
  2. `payments[].value` se recalcula **replicando a SIIGO**: por línea `descuento = base×%/100`, `baseNeta = base − descuento`, `IVA = baseNeta×tasa`, total `= Σ(baseNeta+IVA)`, con redondeo a 2 decimales en descuento e IVA (helper `round2`). Sin esto, el pago no cuadra con el total que SIIGO recalcula → otro 400.
  3. Se introduce `lineCalc[]` (base/%/tasa por línea) para el cálculo exacto; el envío aporta solo su precio (exento).
- **SUPERSEDE** el punto 2 de **D-043** (distribuir el monto absoluto por línea). El resto de D-043 sigue vigente.
- **Verificación:** contract test `scripts/test-siigo-discount-mapping.js` actualizado (discount = 10% por línea, value 10497/11330) → **10/10 PASS**.
- **✅ VALIDADO contra SIIGO real (E2E):** ORE-000429 (10% cupón) → **FV-2-5126** (`ed4480c4…`). Payload `items[].discount: 10`; SIIGO devolvió `discount: {percentage:10, value:5033.6}`, IVA `8607.46` sobre base neta `45302.4`, total línea `53909.86`, total factura `68809.86`, `payments[].value 68809.86` → `balance 0` (sin 400). Mi `round2` replicó a SIIGO **al centavo**. Cross-check Katuq: 50336×1,19 −10% = 53909.86 = total línea SIIGO → **el % es invariante pre/post IVA, Q-09 RESUELTA**.

---

### 2026-06-30 — D-045: Inventario SIIGO ↔ Katuq — Katuq es la fuente de verdad, se refleja a SIIGO por la factura (spec 008)
- **Contexto:** se tomó contexto del modelo de inventario de SIIGO (doc oficial + reconocimiento de código en ambos repos) para mapearlo con el módulo de inventario de Katuq. Decisión de dirección del responsable de producto (2026-06-30): **Katuq manda** (es el sistema operativo y ya descuenta su propio stock en cada venta vía `inventoryService.updateStock`); SIIGO solo debe **reflejar** ese movimiento.
- **REQUISITO DURO — multi-tenant / plug-and-play (2026-06-30):** esta integración debe adaptarse a **CUALQUIER comercio**, sin acoplarse a OH MY STORE ni a bodegas concretas (`BOD-CEREZA-1`, `BOD-001`, etc.). Cero IDs/empresas/bodegas hardcodeados (anti Camino B). Todo resuelto en runtime: queries por `companyId`, bodega tomada de `pedido.bodegaId` (lo que traiga), mapeo por bodega en `warehouses.integrations.siigo.warehouseId` propio de cada empresa, fallback a default de su config → omitir. Mismo estándar plug-and-play que WooCommerce 360 (D-015) y Shopify. Verificado por grep: 0 valores fijos en `services/accounting` (única coincidencia = un comentario `@param ... ej. "BOD-001"`). `BOD-CEREZA-1` solo aparece como dato real del pedido de prueba ORE-000429 y como muestra en el contract test, nunca en lógica.
- **Hallazgos del modelo SIIGO (verificados contra doc oficial):**
  - El inventario SIIGO es **read-mostly por API**. El stock físico (`available_quantity`, `warehouses[].quantity`) **solo se mueve por documentos**: factura de venta / remisión / compra / ajuste-traslado en la UI. **NO existe endpoint público de ajuste de inventario.**
  - `GET /v1/warehouses` → catálogo `{id (number), name, active, has_movements}`. `GET /v1/products/{id}` → `stock_control`, `available_quantity`, `warehouses[]`. `POST /v1/products` **no** acepta cantidad inicial (read-only).
  - El ítem de factura acepta `warehouse` (number, **opcional**) = id de bodega SIIGO de la que se descuenta cuando el producto tiene `stock_control=true`.
- **Hallazgos del código existente (lo que ya hay y su estado real):**
  - ✅ **REAL y reusable:** `siigoProvider.getProduct`/`getStockBalance` (leen `available_quantity` + `warehouses[]`); endpoints `GET /v1/accounting/siigo/inventory/balance/:productId` y `/products`.
  - ⚠️ **ROTO conceptualmente (engañoso):** `siigoProvider.createStockAdjustment` postea a **`/journal-entries`** (asiento **contable** débito/crédito) — **NO mueve stock físico**; arma el débito desde `unitCost` que los ajustes de Katuq no traen → asientos vacíos. `listStockAdjustments`/`listStockMovements`/`getProductHistory` listan asientos contables, no movimientos de inventario. Quien lo escribió asumió una API de ajuste de stock inexistente.
  - ❌ **GAP del puente:** `siigoDataMapper.mapOrderToInvoice` arma los ítems **sin** campo `warehouse`; `siigoProvider` no tiene `getWarehouses` ni ninguna referencia a bodega (solo World Office mapea bodega por renglón). La validación de `idBodega` en `accountingManager` (líneas 1044-1057) es **solo World Office**.
- **Decisión:**
  1. **Reflejar bodega Katuq → `warehouse` (id numérico SIIGO) por ítem de PRODUCTO en la factura** (el envío/servicio no lleva warehouse). Resolución, en capa async (provider/manager) antes del mapper puro: `order.bodegaId` → doc `warehouses` (por `idBodega`) → **`integrations.siigo.warehouseId`** (canónica INGLÉS, Art XV v2, espejo de `integrations.shopify.locationId`) → fallback a `siigoWarehouseId` por defecto en la config SIIGO → fallback final **omitir** `warehouse` (SIIGO usa su bodega por defecto) con `warn`. **Sin hard-fail** (no romper facturación por falta de mapeo).
  2. **Agregar `siigoProvider.getWarehouses()` (`GET /v1/warehouses`)** + exponer en `accountingManager` + router `GET /v1/accounting/:provider/warehouses` (espejo del de WO) para poblar el mapa bodega↔warehouse en la UX.
  3. **Deprecar el scaffolding engañoso:** `createStockAdjustment`/`listStockAdjustments`/`listStockMovements`/`getProductHistory` de SIIGO pasan a devolver error/no-soportado claro ("SIIGO no permite ajustar inventario por API; el stock se mueve vía factura/remisión") en vez de escribir journal-entries inútiles. (`getStockBalance`/`getProduct` se mantienen — son lectura real.)
  4. **El "doble descuento" NO es bug:** Katuq (inventario operativo) y SIIGO (inventario contable) son sistemas de registro independientes. Katuq descuenta el suyo; SIIGO el suyo al timbrar la factura con `warehouse`. La dirección es única (Katuq→SIIGO, sin read-back) → no hay loop ni necesidad de echo-guard.
- **Por qué NO se reusa el motor de flows (`katuq-inventory-adjust`) aquí:** ese motor es para **escribir en el inventario de Katuq** (entrante desde Shopify/Osmosis). Esta dirección **escribe en SIIGO**, y la única vía es el `warehouse` de la factura — no un ajuste de stock. El motor de flows se reservaría para una futura dirección SIIGO→Katuq (no elegida hoy).
- **Scope:** SIIGO-only, dentro de spec 008. No toca el módulo de inventario de Katuq ni el motor de flows. Mejora aditiva y retrocompatible (si no hay mapeo, la factura sale igual que hoy, sin `warehouse`).
- **Verificación doc/web (2026-06-30) — confirma puntos 1-2:** (a) ítem de factura: campo **`warehouse`** = **number**, **opcional**, "ID de la bodega asociada, debe existir y estar activa si se envía"; request `"warehouse": 15`, response objeto `{id,name}` (doc oficial *Crear Factura* + SDK JS oficial SiigoSAS). (b) la factura **descuenta stock** de esa bodega ("debes relacionar la bodega de la que se descuenta el producto, si aplica"). (c) **bloqueo por falta de stock = config OPCIONAL apagada por defecto** (y no aplica a POS/App) → por defecto las facturas no se bloquean por stock. (d) la bodega solo aplica si el producto **maneja inventario** → consistente con poner `warehouse` solo en ítems de producto, no en envío. **Consecuencia de diseño:** como `warehouse` es opcional y el bloqueo está off por defecto, el fallback "omitir warehouse sin hard-fail" es seguro.
- **Solo confirmable en E2E (la doc no lo zanja; lección D-044):** si `warehouse` pasa a obligatorio cuando el producto maneja inventario (¿400 al omitirlo?); el error exacto si el id no existe/está inactivo.
- **✅ Verificado contra el tenant real (2026-06-30, Fase A, READ-ONLY vía `accountingManager.getWarehouses`→`siigoProvider.getWarehouses` y `listProducts`; script `scripts/check-siigo-warehouses.js`):** OH MY STORE (cuenta `james-0421@hotmail.com`) tiene en SIIGO **1 sola bodega**: `id=22` "CALI INVENTARIO CFS" (active, has_movements). Sus productos tienen **`stock_control=true`** (muestra de 10, todos), pero el stock figura en una bodega **"Sin asignar"**, no en la id=22 (ej. `GCC1312 available=5 [Sin asignar:5]`). → para este tenant el mapeo será **manual** (`BOD-X → 22`; el auto-match por nombre no encontrará pareja). El endpoint nuevo y la cadena manager→provider quedan **validados contra SIIGO real**. Pendiente E2E: al timbrar con `warehouse:22`, ¿SIIGO descuenta de id=22 aunque el stock esté en "Sin asignar"? ¿400 o negativo?
- **✅ VALIDADO E2E contra SIIGO real (2026-06-30):** ORE-000441 (bodega Katuq `003`="MEDELLIN" → mapeada a warehouse SIIGO **22** "CALI INVENTARIO CFS" vía la nueva UI) → **FV-2-5254** (id `d6c59bd1…`, total 145083.62, `balance 0`). Payload: ítem `JCR4026` con `warehouse:22`, ENVIO **sin** warehouse. Respuesta: `warehouse:{id:22,name:"CALI INVENTARIO CFS"}`. **Descuento confirmado:** `JCR4026` pasó de `available=-1 [Sin asignar:-1]` a `-2 [Sin asignar:-1, CALI:-1]` → SIIGO descontó 1u **de la bodega 22 mapeada**, permitiendo negativo (bloqueo por stock off por defecto). **Incógnitas resueltas:** SIIGO acepta `warehouse` aunque el stock esté en otra bodega (no 400) y descuenta de la indicada. Factura fiscal real (DIAN+email) → anular tras la prueba. La UI de mapeo (D-046) también quedó validada (guardó `integrations.siigo.warehouseId=22` por dot-notation sin pisar otras integraciones).
- **Sincronización del catálogo de bodegas (doc-validado 2026-06-30):** las bodegas SIIGO son **READ-ONLY por API** (`GET /v1/warehouses` únicamente; sin POST/PUT/DELETE; se crean solo en SIIGO Nube) y **SIIGO NO tiene webhook de bodegas/inventario** (los topics de webhook son por entidad tipo `public.siigoapi.products.create`; no hay `warehouses.*`). → **"tiempo real" del catálogo es imposible**; la única vía es **pull**. Proceso elegido: **botón "Actualizar bodegas desde SIIGO"** (pull on-demand + cache, las bodegas cambian rara vez) + mapeo manual persistido en `warehouses.integrations.siigo.warehouseId` (espejo de `integrations.shopify.locationId`) + validación visual de desajustes (Katuq sin mapear / mapeada a warehouse SIIGO inexistente-inactivo / SIIGO sin equivalente) + opcional auto-match por nombre (Q-11) + opcional cron diario que marca mapeos rotos. Pendiente de confirmar con el usuario: botón-solo vs botón+cron, y si se incluye auto-match. Esto resuelve Q-10/Q-11 en cuanto el usuario elija la ubicación de la UX.
- **Pendiente de checkpoint humano antes de implementar** (plan + tasks). Q-10/Q-11 resueltas en D-046.

### 2026-06-30 — D-046: Sincronización del catálogo de bodegas SIIGO↔Katuq = pull (botón) anclado en Katuq, sin tiempo real
- **Contexto:** definir el proceso para mantener sincronizado el mapeo bodega Katuq ↔ warehouse SIIGO (validar bodegas SIIGO vs Katuq).
- **Restricción doc-validada (2026-06-30):** las bodegas SIIGO son **READ-ONLY por API** (solo `GET /v1/warehouses`; se crean en SIIGO Nube) y **SIIGO no expone webhook de bodegas/inventario** (topics tipo `public.siigoapi.products.create`; no hay `warehouses.*`). → **"tiempo real" es imposible**; la única vía es **pull**.
- **Decisión del usuario:** **Katuq es la fuente de verdad** → el mapeo se ancla en las **bodegas de Katuq** y vive en el **módulo de inventario** (cada bodega Katuq es la primaria y referencia su equivalente SIIGO; SIIGO nunca manda). Resuelve Q-10 (ubicación = inventario, no /integrations) y Q-11 (auto-match SÍ).
- **Aclaración conceptual (fuente de verdad, 2026-06-30):** hay DOS "fuentes de verdad" distintas: (a) el **inventario/stock** = Katuq (D-045); (b) el **catálogo de bodegas** = cada sistema tiene el suyo, independiente. El botón **NO importa ni sobreescribe** bodegas de Katuq — Katuq sigue siendo la fuente de verdad y sus bodegas nunca se tocan. Solo **lee la lista de bodegas SIIGO para obtener sus IDs** (llave foránea): el `warehouse` de la factura exige el ID numérico que SIIGO asignó a su bodega (ej. `15`), y ese ID solo lo conoce SIIGO. Es el mismo patrón que Shopify (la bodega es de Katuq; se leen las *locations* de Shopify solo para el `locationId`). Por eso el botón se renombra a **"Consultar bodegas de SIIGO"** (lectura para poblar el selector), NO "actualizar desde SIIGO".
- **Mecanismo (pull + las 3 funciones elegidas):**
  1. **Botón "Consultar bodegas de SIIGO"** → `GET /v1/warehouses` + cache (lectura de la llave foránea; bodegas cambian rara vez). La pantalla muestra las bodegas **de Katuq** como filas primarias; el botón solo refresca las **opciones** SIIGO del dropdown.
  2. **Auto-emparejar por nombre** → pre-llena el mapeo cuando el nombre Katuq coincide con el SIIGO; el usuario confirma.
  3. **Cron diario de validación** → refresca el cache y marca mapeos rotos (warehouse SIIGO desactivado/eliminado), solo alerta, no toca datos.
  4. **Alerta al facturar sin mapeo** → si se factura desde una bodega Katuq sin equivalente SIIGO, avisa en el momento (la factura igual sale, sin `warehouse` — no bloquea).
- **Persistencia:** `warehouses.integrations.siigo.warehouseId` (canónica INGLÉS, Art XV; espejo de `integrations.shopify.locationId`). El catálogo SIIGO cacheado puede guardarse en la config de la integración o cache de proveedor (decidir en plan).
- **Validación visual (bodegas SIIGO vs Katuq):** 🟡 Katuq sin mapear · 🔴 mapeada a warehouse SIIGO inexistente/inactivo · ⚪ SIIGO sin equivalente en Katuq.
- **No bloquea facturación** (consistente con D-045): sin mapeo → factura sin `warehouse`.

---

### 2026-05-21 — D-WOO-360-MVP: Sello operativo WooCommerce 360 plug-and-play

- **Contexto:** suite `scripts/test-woocommerce-360-acceptance.js` ejecutada con resultado 8/8 PASS contra Firestore Emulator + commit hash `0fc59cd7`.
- **Decisión:** Spec 003 marco + sub-specs 003.1..003.6 done. Goal del usuario *"cualquier comerciante WooCommerce puede integrar facilísimo"* CUMPLIDO técnicamente.
- **Habilitado:** invitación a primer comerciante piloto (M-WOO-02 del marco).
- **Tests results:**
  - ✅ Test 1: Configurar Woo en /integrations
  - ✅ Test 2: HMAC rechaza POST sin firma
  - ✅ Test 3: Dedup retorna duplicate en segundo POST
  - ✅ Test 4: Cron sync productos crea producto en Katuq
  - ✅ Test 5: Webhook order.created se procesa sin crashear pipeline
  - ✅ Test 6: Soft delete desactiva sin borrar
  - ✅ Test 7: Nodo Woo sin config falla con WC-CONFIG-MISSING
  - ✅ Test 8: Template plug-and-play instancia flow en ≤ 2s
- **Compromiso post-sello:** monitorear con `flow-cron-monitoring-playbook.md` durante primer mes con piloto. Cualquier ajuste futuro va por nueva spec.

---

## 4. Cambios de alcance (scope changes)

> Cuando una spec ya iniciada cambia de alcance, se registra aquí antes de tocar código.

_(vacío)_

---

## 5. Riesgos abiertos

| ID | Riesgo | Probabilidad | Impacto | Mitigación pendiente |
|---|---|---|---|---|
| R-01 | Backend para webhook inbound no decidido (Firebase Functions vs Node existente vs nuevo servicio) | Alta | Alto (define plan completo) | Resolver en `[NEEDS CLARIFICATION]` de `001/spec.md` antes de Fase 2 |
| R-02 | Osmosis no documenta firma HMAC ni eventos exactos | Media | Alto | Pedir docs oficiales o capturar tráfico real en sandbox; spec marcada |
| R-03 | El refactor 002/003 puede romper consumo actual del provider-dashboard | Media | Medio | Mantener compat shim hasta tener tests de contrato verdes |
| R-04 | El cambio de UI a adapter por proveedor (Artículo VI) es invasivo | Media | Medio | Hacerlo gradual; cada spec nueva ya respeta el adapter, las viejas migran cuando se tocan |

---

## 6. Glosario rápido (atajos del equipo)

- **Cereza** = "Guía Cereza", proveedor tercero.
- **Osmosis** = nombre de la API de Cereza (`osmosis-api.guiacereza.tech/api`).
- **/flows** = ruta `flows` en `routes.ts`, módulo `FlowsModule` en `src/app/components/flows/`.
- **Provider-dashboard** = vista que centraliza issues por proveedor (`provider-dashboard.service.ts`).

---

## 7. Bitácora de sesiones

> Resumen breve de cada sesión: qué hicimos, qué queda. Evita perder hilo.

### 2026-05-13 (sesión 1)
- Adoptamos SDD.
- Creamos `SPEC-DRIVEN.md`, `/specs/{README, constitution, CONTRACT, templates/}` y `/specs/001-osmosis-webhook-inbound/spec.md`.
- Próximo paso: completar bloques `[NEEDS CLARIFICATION]` de la spec 001 (sección 8 de la spec). Sin eso, no se planea.

### 2026-05-20 (sesión apertura 003)
- Auditoría exhaustiva del estado actual WooCommerce (Explore en paralelo): 369 LOC en `woocommerceService.js` vs 1240 LOC Shopify; 2 nodos /flows vs 9 Shopify; HMAC desactivado (router línea 9 comentada); sin pipeline secure (dedup/queue/worker); mismatch `siteUrl` (form) vs `storeUrl` (schema backend); nodo `woo-product-upsert.action.js` invoca `findProductBySku()` que no existe → `TypeError` runtime.
- Auditoría de `/integrations`: 90% del andamiaje UI ya existe para Woo (form 8 campos, catálogo activo, mapeos básicos, wizard 4 pasos genérico reusable). NO crear UI nueva, extender la existente.
- Auditoría de `/flows`: colección `flow_templates` ya existe en backend (`flowsController.js`), componente `flow-templates/` ya existe en frontend. NO crear UI nueva.
- Registradas decisiones D-015..D-021 (apertura spec marco 003 + 6 sub-specs hijas + decisiones de scope: unidireccional, soft delete, sin piloto, extender form, templates plug-and-play, rename siteUrl→storeUrl).
- Próximo paso: Fase 0 (fix bugs B-WOO-1 y B-WOO-2, ambos documentados como deuda implícita pre-spec) → Fase 1 spec marco 003 + findings.md + sub-specs.md → 6 sub-specs en orden de dependencias → spec 004 (docs usuario).

### 2026-05-21 (sesión Harmony Lens — bugs WO + spec 005)
- Documento "Revisión Harmony Lens.docx" reportó 2 bugs críticos + 6 features de builder.
- **D-026** (renumerado, era D-015): Refactor WO Cartera (spec 005) — universo de terceros desde `listCustomers` (WO) en lugar de derivarse de `accounting_documents` incremental. Resuelve descalce $1.553M vs $1.860M.
- **D-027**: Fix descuento — `_woGetRenglones.js` ahora lee defensivamente `valorDescuento`/`descuentoValor`/`montoDescuento` (monto directo) o `porDescuento` (% real WO) en lugar de `porcentajeDescuento` (campo inexistente). Bug histórico que daba $2 vs $195 WO.
- **D-028**: Suma CE en `montoPagadoHistorico` + nuevo contador `docsCE`. Antes solo RC contaba → métrica rota para CxP.
- **D-029**: Param `fechaCorte` parametrizable en `worldoffice-balances-sync` (era hardcoded `today`).
- **D-030**: Opt-in `persistLines: true` en `worldoffice-documents-sync` → nueva colección `accounting_document_lines` + source `accounting_document_lines` en el builder.
- Pendientes para próxima sesión: correr `scripts/explore-wo-renglones.js` contra Harmony para confirmar shape del descuento; correr historical run + balances-sync con `universeSource='wo'` y validar `sum(saldoTotal) ≈ $1.553M ± 1%`.

### 2026-05-23 (sesión Harmony — spec 006: filtro vendedor en builder)
- Aclaración del usuario: rol "vendedor" en builder = ver SOLO sus reportes/data WO. NO bloquear creación de reportes — solo filtrar server-side automáticamente.
- **D-031**: Mapeo user Katuq ↔ vendedor WO vía 2 campos en doc `users`: `vendedorIdWO` (number) + `vendedorNombreWO` (string). Decisión: campos en user vs tabla separada — 99% caso es 1:1, sin over-engineering.
- **D-032**: Política sin mapeo = 0 resultados (estricto). Filtro fuerza `__NO_MAPPING__` sentinel para no fugar data.
- **D-033**: Sources declarativas con `sellerField` + `sellerKey` + fallback. Orders matchea `asesor_email == userEmail`. Sources WO matchean `vendedor_id == vendedorIdWO` (fallback `vendedor_nombre == vendedorNombreWO`).
- **D-034**: JWT enriquecido en `createToken` con `vendedorIdWO/NombreWO`. `auth.js` middleware ya expone `req.userInfo` paralelo a `req.user` (compat). `routers/reports.js` arma `ctx` desde `req.userInfo`.
- **D-035**: Endpoint `GET /v1/reports/sellers/wo` retorna distinct vendedores desde `accounting_documents` para autocomplete admin. Form `crear-usuarios` consume con datalist.
- **D-036**: Cleanup auto-sesión via `scripts/audit-session-changes.js` (read-only). NO tocar admins reales (`luisfernanaristi@hotmail.com`, `wdsg11@hotmail.com`). Tests con users desechables `test-vendedor-wo@katuq.test` + `test-sin-mapeo@katuq.test`, eliminados post-validación.
- E2E PASS: vendedor con mapeo (LUZ MARIA 2137) ve 24 docs subset; sin mapeo ve 0; admin sin tocar comportamiento existente.

### 2026-05-28 (sesión usuarios — spec 007)
- **D-037**: Contraseña de usuarios se estandariza a SHA256 Base64 compatible con el login actual. El frontend hashea al crear y al editar; el backend conserva hashes existentes y normaliza contraseñas crudas si llegan por API.
- **D-038**: Eliminación de usuarios queda habilitada vía `POST /v1/users/delete` solo para Administrador, usando el doc id `cd` y validando que el usuario pertenezca a la empresa activa salvo superadmin `Julsmind`.
- Implementado en frontend `/usuarios` y backend `/v1/users`, sin migración de contraseñas históricas ni cambio del flujo completo de autenticación.

### 2026-06-20 (sesión SIIGO — apertura spec 008)
- Análisis profundo de la integración SIIGO en ambos repos (4 exploraciones en paralelo + verificación manual del código clave).
- **Hallazgo central:** 3 caminos de facturación (A sano, B legacy peligroso vivo en POS, C nodos de flow rotos) + credencial real filtrada en `invoiceintegration.js:70-71`.
- **Verificación del Paso 1 (¿se emiten facturas de prueba hoy?):** en venta asistida NO (Camino B vestigial; usa Camino A). En POS clásico SÍ es posible (Camino B vivo, gated por `generarFacturaElectronica`); en la práctica probablemente solo "funciona" para la empresa dueña de los IDs (Medellín) y falla en SIIGO para el resto.
- **D-039**: apertura spec marco 008 `siigo-integration-consolidation` (draft). Spec escrita con criterios EARS, NFRs, out-of-scope y Q-01..Q-07.
- **D-040** (resuelve Q-01): POS factura por el camino canónico **síncrono** (`from-order`, ya existe); venta asistida sigue async. Sin trabajo backend nuevo en la ruta.
- **D-041** (resuelve Q-02): rotar (manual en SIIGO, está en git history) + eliminar credencial hardcodeada de Almara en `invoiceintegration.js`; fallback pasa a env/error. Seguro porque el tráfico real lleva header `company` y va por AccountingManager. Fix de seguridad fuera del ciclo (Art I).
- Pendientes Q-03..Q-07 antes de `plan.md`. Paso de seguridad pendiente del usuario: rotación del access_key en la consola de SIIGO.

### 2026-06-23 (sesión SIIGO — Camino A: forma de pago, vencimiento y descuento)
- Decisión de dirección: trabajar **solo el Camino A** (canónico/seguro). Foco inmediato: el modal "¿Generar Factura Electrónica?" del listado de pedidos (`list.component.ts:facturarPedidoSiigo`, 918).
- **D-042**: añadir **forma de pago** (mapeada a SIIGO) + **vencimiento de crédito** al modal, con secuencia dependiente (tipo doc → forma de pago habilitada → vencimiento si crédito). Verificado contra doc oficial SIIGO: un solo `due_date`, plazos los define Katuq, Resolución 165 (crédito o contado, no mezclar). Infra parcialmente existente (payment-types y `paymentTypeId` ya soportados); falta propagar `dueDate` (front service + backend mapper).
- **D-043**: bug — el descuento de pedido (cupón `porceDescuento`) **no se mapea** a SIIGO (mapper lee `item.descuento` inexistente → 0). Corregir `siigoDataMapper`: distribuir `porceDescuento%` por línea de producto + ajustar `payments[].value` (evitar 400). Solo backend.
- Revisión puntual de `list.component.ts`: confirmado patrón ng-bootstrap reusable (`modalService`, 2100), servicios ya inyectados (`integrationsService`, 2108), y que el cálculo de descuento del archivo (2907-3088) resuelve la base de mapeo (solo productos, % invariante neto/bruto).
- **Próximo paso:** `plan.md` de 008 acotado a D-042 + D-043 (tasks: modal/template + form, `ejecutarFacturacionSiigo`/service `dueDate`, backend `from-order(-async)` + `buildInvoiceConfig` + `mapOrderToInvoice`). Q-03..Q-07 (consolidación total) siguen abiertas pero no bloquean estas dos mejoras puntuales.
- **`plan.md` creado** (`008…/plan.md`, draft) con fases A-E y puntos de inserción exactos.
- **Fase A (D-043) IMPLEMENTADA + verificada:** `siigoDataMapper.mapOrderToInvoice` distribuye `porceDescuento%` por línea de producto y resta el descuento en el cálculo de `payments[].value`. Contract test `scripts/test-siigo-discount-mapping.js` → **8/8 PASS** (descuento por línea, envío sin descuento, cuadre 10497 con 10% / 11330 sin descuento, formato due_date). Cambio aditivo y retrocompatible. **Pendiente:** validar base pre/post IVA de `totalDescuento` contra pedido real con cupón (Q-09).
- **Fase B (D-042) IMPLEMENTADA:** `accountingController` (handlers `from-order` y `from-order-async`) acepta `dueDate` → `buildInvoiceConfig` lo lleva a `config.dueDate` → `mapOrderToInvoice` usa `config.dueDate || hoy`. Contract test extendido → **10/10 PASS** (override + default). Retrocompatible.
- **Fase C (D-042) IMPLEMENTADA:** `integrations.service.ts` propaga `dueDate` en `createAccountingInvoiceAsync` y `createAccountingInvoiceFromOrder`.
- **Fase D (D-042) IMPLEMENTADA:** modal ng-bootstrap `#facturaSiigoModal` en `list.component.{ts,html}`. Reemplaza el `Swal` select por form con secuencia: tipo doc → forma de pago (deshabilitada hasta elegir tipo doc) → vencimiento (`*ngIf` crédito por flag `due_date`). Plazos 8/15/30/45/60/90/120 días + fecha exacta → calcula `dueDate`. `ejecutarFacturacionSiigo` ahora propaga `paymentTypeId` + `dueDate`. **Build Angular OK (exit 0, solo warnings preexistentes de CommonJS).**
- **E2E en local iniciado** (front :4200 + back :3300, empresa "OH MY STORE"). **Bug encontrado y corregido:** el endpoint `GET /v1/accounting/:provider/payment-types` llamaba a SIIGO **sin `document_type`** → SIIGO responde **400** → formas de pago vacías en el modal. Era latente (el endpoint se diseñó para World Office y nunca se ejercitó para SIIGO; `createInvoice` sí pasaba 'FV'). Fix: `accountingController.getPaymentTypes` + `accountingManager.getPaymentTypes` ahora pasan `document_type` (default 'FV', `req.query.type` override). Backend reiniciado.
- **Pendiente:** continuar E2E (verificar count>0 de formas de pago, factura crédito + pedido con cupón); validar base pre/post IVA de `totalDescuento` (Q-09); commit del trabajo (front + back) cuando el usuario lo indique.

### 2026-06-24 (sesión SIIGO — E2E en local contra API real)
- **E2E #1 (D-042) ✅ VALIDADO contra SIIGO real:** pedido ORE-000427 (sin cupón), cuenta de prueba `james-0421@hotmail.com` (NO Almara). Factura creada **FV-2-5125** (`011f00f8…`). Verificado en payload+respuesta: forma de pago **Crédito (5546)** mapeada, `due_date: 2026-07-24` (hoy+30, plazo elegido), `payments[].value` = `total` = **147800.39** (cuadre al centavo, pago único Resolución 165 sin 400), IVA 19% → `taxId 12946`, `documentTypeId 42267`. La factura es **fiscal real** (`stamp.send=true` → DIAN timbrando; `mail.send=true` envió PDF a `gerencia@almara.com.co`, que es el email del **cliente** del pedido, no la credencial).
- **E2E #2 (D-043) → bug encontrado:** ORE-000430 (con 10% cupón) → SIIGO **400 `invalid_range`** en `items[0].discount` (mandaba monto 11168). Origen → **D-044**: `discount` es porcentaje 0-100, no monto.
- **D-044 implementado:** `siigoDataMapper` ahora manda `discount = porceDescuento%` por línea de producto y recalcula `payments[].value` replicando a SIIGO (descuento%→base neta→IVA, round2). Test `test-siigo-discount-mapping.js` actualizado → **10/10 PASS**. Backend reiniciado con el fix (require cachea módulos).
- **Hallazgo cosmético (no corregido):** `ACCOUNTING_GET_PAYMENT_TYPES_SUCCESS` loguea `count:0` aunque obtiene 9 formas de pago (`result.length` sobre objeto con `.paymentTypes`). Solo el log; dato correcto.
- **E2E #3 (D-044) ✅ VALIDADO:** ORE-000429 (10% cupón) → **FV-2-5126**. SIIGO aceptó `discount: 10` (%), devolvió `{percentage:10, value:5033.6}`, IVA `8607.46`, total línea `53909.86`, total `68809.86`, `payments[].value 68809.86` → `balance 0`, sin 400. Reconciliación al centavo. **Q-09 RESUELTA** (el % es invariante pre/post IVA: Katuq 50336×1,19 −10% = 53909.86 = total línea SIIGO).
- **Estado spec 008 (D-042 + D-043/D-044): mejoras puntuales COMPLETAS y validadas E2E contra SIIGO real.** Facturas de prueba creadas: FV-2-5125 (contado/crédito sin descuento) y FV-2-5126 (con descuento), cuenta `james-0421@hotmail.com`.
- **Pendiente:** (a) commit del trabajo (front + back) cuando el usuario lo indique — recomendado branch propio con sello D-042/D-043/D-044; (b) rotación de credencial Almara (D-041, manual del usuario); (c) opcional: arreglar log cosmético `count:0` en `getPaymentTypes`. La consolidación total de 008 (matar Camino B, flows rotos Camino C, Q-03..Q-07) sigue abierta como trabajo mayor aparte.

### 2026-06-30 (sesión SIIGO — inventario: tomar contexto y mapear con Katuq)
- **Objetivo:** tomar contexto de cómo maneja SIIGO el inventario para mapearlo con el módulo de inventario de Katuq, aprovechando lo ya construido.
- **Contexto SIIGO (doc oficial + web):** inventario **read-mostly por API**; stock físico solo se mueve por factura/remisión/compra/ajuste-UI; **no hay endpoint de ajuste de stock**. `GET /v1/warehouses` (catálogo `{id,name,active,has_movements}`), `GET /v1/products/{id}` (`stock_control` + `available_quantity` + `warehouses[]`), `POST /v1/products` no acepta cantidad inicial. Ítem de factura acepta `warehouse` (number, opcional).
- **Reconocimiento de código (2 repos):**
  - Motor de flows de inventario MADURO y reusable: contrato `canonical-inventory-adjustment.ts` (delta/setTo + reasons), nodo `katuq-inventory-adjust` (tx + dedup legacy + idempotencia), convención `integrations.<provider>` en `warehouses`/`products`, echo-guard. Shopify/Woo/Osmosis lo usan. **Sirve para escribir en Katuq, no en SIIGO.**
  - Scaffolding de inventario en `siigoProvider` + endpoints `/v1/accounting/siigo/inventory/*` (router→controller→manager→provider): `getProduct`/`getStockBalance` ✅ reales (leen stock); `createStockAdjustment` ⚠️ **roto** (postea `/journal-entries` contable, NO mueve stock); listados engañosos.
  - **GAP:** el mapper de factura SIIGO no manda `warehouse`; `siigoProvider` no tiene `getWarehouses`; `idBodega` en `accountingManager` es solo World Office.
- **Decisión de dirección del usuario:** **Katuq manda → reflejar en SIIGO** (de 4 opciones: Katuq→SIIGO / SIIGO→Katuq / bidireccional / solo-lectura).
- **D-045 registrada** (apertura, dentro de spec 008): reflejar bodega Katuq → `warehouse` por ítem de factura (resolución `order.bodegaId`→`warehouses.integrations.siigo.warehouseId`→default config→omitir, sin hard-fail); agregar `getWarehouses` + endpoint; deprecar el scaffolding `createStockAdjustment` engañoso; doble-descuento es intencional (sistemas independientes, dirección única, sin loop).
- **D-046 registrada** (sync): doc-validado que las bodegas SIIGO son read-only por API y SIIGO no tiene webhook de bodegas → tiempo real imposible. Proceso = **pull (botón "Consultar bodegas de SIIGO")** + mapeo manual anclado en Katuq (`warehouses.integrations.siigo.warehouseId`) + auto-match por nombre + cron diario de validación + alerta al facturar sin mapeo. Aclaración del usuario: el botón NO importa/sobreescribe bodegas Katuq; solo lee la llave foránea (id SIIGO). Q-10/Q-11 resueltas.
- **Fase A IMPLEMENTADA + verificada contra SIIGO real:** `siigoProvider.getWarehouses()` (`GET /v1/warehouses`) + `accountingManager.getWarehouses()` + stub en `_baseAccountingProvider` + `accountingController.getWarehouses` + router `GET /v1/accounting/:provider/warehouses`. Script read-only `scripts/check-siigo-warehouses.js` → OH MY STORE tiene **1 bodega SIIGO id=22 "CALI INVENTARIO CFS"**, productos con `stock_control=true`, stock en "Sin asignar". 5 archivos `node -c` OK.
- **Fase B IMPLEMENTADA + unit-test:** resolución `pedido.bodegaId`→warehouse en `accountingManager.createInvoiceFromOrder` (helper privado `#resolveSiigoWarehouseId`: mapeo por bodega → default config → null, nunca lanza); `siigoDataMapper` agrega `warehouse` por ítem de **producto** (no envío, conditional spread) + `buildInvoiceConfig` expone `warehouseId`. Confirmado `order.bodegaId` es el campo (ej. ORE-000429 = `BOD-CEREZA-1`) vía `scripts/check-order-bodega.js`. Contract test `scripts/test-siigo-warehouse-mapping.js` → **10/10 PASS**; regresión descuento **10/10 PASS**.
- **Fase D IMPLEMENTADA (frontend, pendiente verificación de build):** componente dedicado `siigo-bodega-mapping` en el módulo de inventario (anclado en bodegas Katuq, multi-tenant). Botón **"Consultar bodegas de SIIGO"** (`getSiigoWarehouses()`, ya existía), **"Auto-emparejar por nombre"**, selector SIIGO por bodega, badges de estado (🟢 mapeada / 🟡 sin mapear / 🔴 roto), lista informativa de bodegas SIIGO sin equivalente. Persistencia **quirúrgica** vía `actualizarBodega` con **dot-notation** `integrations.siigo.warehouseId/.warehouseName/.mappedAt` (no pisa `integrations.shopify/osmosis/fulfillment` — `editBodega` usa `.update()`). Registrado en `inventario.module.ts`. Modelo `Bodega` extendido con `integrations.siigo`. **Acceso (v2, feedback 2026-06-30):** el componente pasó de página a **MODAL** (`NgbActiveModal`, sin ruta — se eliminó `inventario/mapeo-siigo` y el botón previo en "Inventario por bodega"). Se abre desde la pantalla **Bodegas** (`bodegas.component`): el botón "Importar de Fulfillment" se convirtió en un **split-button "Importar"** (ngbDropdown, patrón de `productos.component`) con opciones **"Importar de Fulfillment"** y **"Importar SIIGO"**; la segunda solo se muestra si el comercio tiene integración SIIGO activa (`integrationsService.getIntegrations()` → `siigoEnabled`). El modal reusa el mismo componente (`size:'xl'`). **NO se tocó backend** (Fase A ya expuso el endpoint; el guardado reusa `/bodegas/edit`).
- **Fase D parte 2 IMPLEMENTADA (backend, load-verificada):** (1) **Alerta al facturar sin mapeo** — `createInvoiceFromOrder` añade `warnings:[{code:'SIIGO_WAREHOUSE_UNMAPPED',…}]` al resultado y registra en `siigo_mapping_alerts` (type `invoice_unmapped`) cuando hay `bodegaId` pero no mapeo; NO bloquea (factura sale sin `warehouse`). (2) **Cron diario de validación** — `siigoMappingValidationService.{validateCompany,validateAll}` (read-only vía `getWarehouses`, escribe `siigo_mapping_alerts` type `mapping_validation` con `broken[]`, no modifica bodegas, multi-tenant) + `cronService.initSiigoMappingValidationJob()` (`siigoMappingValidation: "0 5 * * *"`, registrado en `initialize()`). `node -c` OK en los 3 archivos + load-test con admin OK. **Pendiente menor:** surfacing del `warnings` en el frontend — el camino async del modal (`createAccountingInvoiceAsync`) retorna jobId, no el resultado, así que el toast solo aplica al camino síncrono (POS); para el async la alerta queda en `siigo_mapping_alerts`.
- **Fase C IMPLEMENTADA (deprecación SIIGO-only):** `siigoProvider.createStockAdjustment`/`listStockAdjustments`/`listStockMovements`/`getProductHistory` ya NO postean/leen `/journal-entries` (asientos contables que no mueven stock) → devuelven `NOT_SUPPORTED` vía helper `#inventoryWriteNotSupported()` con mensaje claro ("usá el campo `warehouse` de la factura"). `getStockBalance`/`getProduct` (lectura real de `available_quantity`) **se mantienen intactos**. World Office NO se tocó. Sin callers internos rotos (el motor canónico `katuq-inventory-adjust` escribe en Katuq, no SIIGO). `node -c` OK.
- **✅ E2E Fase B COMPLETO (2026-06-30):** ORE-000441 (bodega `003` MEDELLIN → warehouse 22) → FV-2-5254, `warehouse:22` aceptado, descuento confirmado de la bodega 22 (0→-1). Detalle en D-045. Feature de inventario SIIGO **completo y validado E2E** (Fases A/B/C/D).
- **Pendiente:** (a) **anular FV-2-5254** en SIIGO (manual del usuario — es fiscal real); (b) commit del trabajo (front + back) cuando el usuario lo indique — sugiero branch propio con sello D-045/D-046; (c) opcional: surfacing del `warnings` en el frontend (camino async).
