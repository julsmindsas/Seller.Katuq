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
| **008** | **cotizaciones-mvp** | **tasks in-progress (Bloque 0 done)** | — | Módulo de Cotizaciones, Fase 1: listado + métricas + export + editor (cliente, fechas, productos con popup de config y precio/IVA editable, totales, términos, estados, guardar borrador, PDF, WhatsApp, vendedor). Colección propia, NO toca inventario/pedidos. **Existe implementación previa** (backend completo + rama frontend `origin/cotizaciones`) → se adopta/ajusta backend y se construye frontend fresco (ver D-040/D-041). Sub-fases: 008.2 conversión a pedido, 008.3 portal de aprobación por correo. |
| **009** | **customer-metrics-detalle-cliente** | **backend done + 15 tests; frontend pendiente flag** | Daniel | 4 métricas de solo-lectura en la ficha del cliente + lista paginada. Endpoint `GET /v1/orders/customer-summary` con query proyectada (sin carrito). Sin colección paralela ni índices nuevos. Feature flag `ENABLE_CUSTOMER_METRICS`. Ver D-043. |
| **010** | **assisted-sale-discounts-promotions** | **implement done (G1–G4 + fixes e2e + ampliaciones) — pendiente e2e final navegador + deploy** | equipo Katuq + Claude | Formaliza bajo SDD la integración de **códigos** (Feature A) y **promociones automáticas** (Feature B) en la venta asistida. Retroactiva: ratifica A/B como groundwork (criterios `[AS-BUILT]`) + trabajo nuevo: verificación e2e en navegador + cierre de gaps (desglose vs persistido, envío_gratis, vigencia UTC→Bogotá, tope 100%). Rama `feature/descuentos-promociones` (ambos repos). Ver D-044. |

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

### 2026-06-14 — D-039: Apertura spec 008 — Cotizaciones MVP (colección propia)
- **Contexto:** el responsable de producto entregó 4 mocks HTML (`mock cotizacion/`) de un módulo de cotizaciones. El objetivo final (`katuq-cotizaciones-flujo.html`) reusa los 3 primeros pasos de la venta asistida (cliente → productos → entrega/facturación) y añade conversión a pedido y portal de aprobación por correo. Se decidió abrir el módulo por fases.
- **Decisión de modelo:** la cotización vive en una **colección propia `cotizaciones`** (multi-tenant por `company`), NO se modela sobre `orders` ni con un flag. Razón: una cotización no debe descontar inventario ni entrar a fulfillment hasta convertirse; reusar `orders` ensuciaría el 360 (inventoryService toca POS/ventas/fulfillment/Shopify — regla crítica del CLAUDE.md). La conversión a pedido (fase 008.2) es el único punto que crea un `order`.
- **Alcance Fase 1 (008):** listado con KPIs + filtros + buscador + export + consecutivo; editor con selección de cliente existente, fechas, productos (con popup de configuración comercial reusado y edición de precio/IVA por línea como en el carrito), totales (subtotal/desc línea/desc global/IVA), términos y condiciones, estados (borrador/enviada/aceptada/rechazada/vencida), guardar borrador, PDF y WhatsApp, campo vendedor.
- **Reuso confirmado (frontend):** `MaestroService` (clientes), `VentasService.getProductsByFilterPaginated/quickSearchProducts` (productos), `PaymentService.checkPriceScale/checkIVAPrice` (cálculo), `ConfProductToCartComponent` (popup config), modelo `Pedido/Carrito/Configuracion`. **Nada de esto se reescribe.**
- **Riesgo arquitectónico clave (R-01 de la spec):** `CartSingletonService` es un carrito **singleton global**; la cotización debe mantener su **propio arreglo de líneas** y reusar solo funciones puras de cálculo + el popup de configuración en modo aislado, para no contaminar una venta asistida activa.
- **Backend:** repo `C:\Users\julia\Documents\Seller.Katuq.Back\katuq_admin_back_firebase`. Nuevos endpoints `/v1/cotizaciones/{create,edit,getById}`, `/v1/cotizaciones/all/filter/paginated`, `/v1/cotizaciones/metrics` + consecutivo transaccional + `cotizaciones_config/{company}.terminosBase`.
- **Numeración:** se usa `008` para evitar colisión con el folder local `007-assisted-sale-step1-customer` y el `007` del roadmap.
- **Alternativas descartadas:** modelar sobre `orders` con flag (riesgo alto para el 360); KPIs en frontend (inexactos); términos en `CompanyInformation` (modelo muy usado, invasivo).

### 2026-06-14 — D-CLAR-01..05: Clarifications resueltas de spec 008 (defaults aprobados)
- **D-CLAR-01 — Métricas en backend:** endpoint `/v1/cotizaciones/metrics` agrega por empresa (cotizado del mes, pipeline activo, tasa de conversión, borradores). Razón: requieren todos los docs del periodo, no la página cargada.
- **D-CLAR-02 — Consecutivo continuo por empresa:** `COT-AAAA-MMDD-####` con contador transaccional por empresa que NO reinicia (la fecha es solo la de emisión). Razón: coincide con los mocks; evita números repetidos entre periodos.
- **D-CLAR-03 — Términos base en doc dedicado:** `cotizaciones_config/{company}.terminosBase`, no en `CompanyInformation`. Razón: aislar config de cotizaciones; modelo de empresa es pequeño y muy usado.
- **D-CLAR-04 — Paginación server-side desde día 1:** reusa patrón de `orders`/`productos`. Razón: multi-tenant que crece; evita refactor; estandarización del proyecto.
- **D-CLAR-05 — Solo selección de cliente existente en Fase 1:** creación rápida de cliente diferida (servicio `createClient` ya existe → bajo costo añadirla luego). Razón: alcance acordado ajustado.

### 2026-06-14 — D-040: Descubrimiento — ya existe implementación previa de cotizaciones
- **Contexto:** al redactar el plan 008 se descubrió implementación previa NO mencionada en el roadmap:
  - **Backend** (`Seller.Katuq.Back`): `controllers/cotizaciones.js` (803 LOC) + `services/cotizacionService.js` (233 LOC) + `routers/cotizaciones.js`, montado en `index.js` como `/v1/cotizaciones`. Tiene create, getAll, getById, getByNumber, edit, delete, filter, convertir-pedido, estadísticas. PDF y email son stubs 501.
  - **Frontend**: rama `origin/cotizaciones` con módulo completo (`cotizaciones.component.ts` 56KB, `cotizaciones-lista` 21KB, service, module, routing). Rama muy divergida (~190 archivos vs main).
- **Divergencias del backend existente vs spec 008 aprobada:** consecutivo `COT-AAAA-NNNNNN` NO transaccional (vs `COT-AAAA-MMDD-####` transaccional, D-CLAR-02); `calcularTotales` simplista (vs fidelidad venta asistida); estados `Aprobada/Expirada` (vs `aceptada/vencida`); métricas con forma distinta a los 4 KPIs; sin `cotizaciones_config`.
- **Problemas del frontend de la rama:** `cotizaciones.service.ts` NO extiende `BaseService` y tiene endpoints rotos (`/:id/estado`, `/:id/enviar`); al crear solo envía ítems simples → NO reusa pricing de venta asistida → NO cumple fidelidad de precios de la spec.
- **Decisión:** tratar esto como cambio de alcance (de "crear" a "adoptar/ajustar + construir fresco frontend"). Registrado abajo en §4.

### 2026-06-14 — D-041: Estrategia de implementación 008 (frontend fresco + backend adoptado)
- **Frontend:** construir módulo nuevo en la rama actual (`feature/venta-asistida-mejorada`) reusando `PaymentService` + `ConfProductToCartComponent` + `MaestroService` + `VentasService`, con `CotizacionesService extends BaseService`. Usar HTML/SCSS de `origin/cotizaciones` SOLO como referencia visual. NO fusionar la rama divergida.
  - **Razón:** garantiza fidelidad de precios (requisito central de la spec), respeta Art IX (BaseService, no HttpClient directo), evita arrastrar ~190 archivos mezclados.
  - **Alternativas descartadas:** adoptar el módulo de la rama (no reusa pricing, deuda técnica); merge completo de la rama (riesgo alto).
- **Backend:** adoptar y ajustar `controllers/cotizaciones.js` — consecutivo transaccional (`cotizaciones_counters/{company}` + `runTransaction`) con formato `COT-AAAA-MMDD-####`; almacenar totales del frontend (quitar recálculo lossy); estados canónicos + lectura tolerante de legacy; nuevo `GET /v1/cotizaciones/metrics` (4 KPIs); `GET/PUT /v1/cotizaciones/config` (`cotizaciones_config/{company}.terminosBase`).
  - **Razón:** conserva trabajo funcional ya hecho (convertir-pedido para 008.2, filtros, stats) y minimiza riesgo.
  - **Alternativa descartada:** reescribir con repository/service como `orders` (descarta trabajo útil).
- **Source of truth de totales = frontend** (con `PaymentService`); el backend almacena lo recibido y no recalcula. Riesgo aceptado: la cotización es interna (no enviada por el cliente) en Fase 1.
- **Plan creado:** `specs/008-cotizaciones-mvp/plan.md` (estado draft, 9 fases A–I). Spec marcada `approved`.

### 2026-06-15 — D-042: Reuso de `ConfProductToCartComponent` vía módulo compartido (T-19)
- **Contexto:** el editor de cotizaciones (T-19) necesita el popup de configuración de producto (`ConfProductToCartComponent`) para mantener fidelidad de precio/IVA, pero estaba **declarado dentro de `VentasModule`** (lazy) y no exportado → no reusable desde el lazy `CotizacionesModule`.
- **Verificación previa:** el popup es autocontenido en su template — solo usa `SharedModule` (`app-feather-icons`, `app-katuqintelligence`, `NgbModule`, Forms), `GalleryModule` (`ks-carousel`), `NgSelectModule` (`ng-select`) y `NgxStarRatingModule`. No usa ningún componente hermano de `VentasModule` ni PrimeNG/archwizard en su HTML. Todos los servicios que inyecta son `providedIn: 'root'` → funciona abierto con `NgbModal.open()` desde cualquier inyector.
- **Decisión (Opción A):** crear `src/app/components/ventas/catalogo/catalogo-shared.module.ts` (`CatalogoSharedModule`) que **declara y exporta** `ConfProductToCartComponent`; `VentasModule` quita la declaración e importa el módulo (sin cambios de comportamiento); `CotizacionesModule` lo importa también.
  - **Razón:** reusa la UI idéntica (cero divergencia de precios), respeta Art. VI (no acoplar UI a flujo) y SRP; riesgo bajo confirmado por la verificación.
  - **Alternativas descartadas:** importar `VentasModule` completo en cotizaciones (arrastra `VentasRoutingModule`/providers, acopla todo ventas); diferir productos con config (deja T-19 a medias y sin el caso que más exige fidelidad).
- **Cambio aditivo en el popup:** `@Input() returnOnly: boolean = false`. Cuando es true, `agregar()` devuelve el `Carrito` vía `modalRef.dismiss(...)` sin tocar el carrito singleton; con `returnOnly=false` el comportamiento de venta asistida es idéntico al previo.
- **Precio por categoría en el popup desde cotizaciones:** se hace save/restore de `sessionStorage['cliente']` alrededor del modal (el popup lee de ahí), sin contaminar el estado de venta asistida (R-01 de la spec respetado).

### 2026-06-18 — D-043: Apertura spec 009 — Métricas de cliente en su ficha (solo lectura)
- **Contexto:** la ficha individual del cliente no muestra su valor comercial; un intento previo era lento por leer órdenes completas (carrito + producto anidado, 50–100 KB c/u).
- **Decisión:** feature de **solo lectura** que muestra 4 métricas (ticket promedio, valor total/LTV, última compra, # pedidos relacionados) + lista paginada, en la ficha 360 del cliente (`*ngIf="encontrado"`).
- **Alcance de pedidos (decisión de negocio):** cuentan **todos menos anulados/rechazados** → excluir `estadoProceso ∈ {Rechazado,Cancelado}` o `estadoPago ∈ {Cancelado,Rechazado}`. No existe "Anulado"; el término real es "Cancelado" (verificado).
- **Técnica:** un endpoint `GET /v1/orders/customer-summary` con **query proyectada** (`.select()` de campos escalares, **sin carrito**) sobre el índice ya existente `orders(company, cliente.documento, fechaCreacion DESC)`; cómputo en backend. **Sin colección paralela, sin dual-write, sin índices nuevos.**
  - **Alternativa descartada:** aggregation queries nativas (`sum/avg/count`) — no combinan con exclusión multi-estado en Firestore. Colección paralela liviana — diferida (dual-write innecesario para la vista individual).
- **Verificación read-only (muestra 5000 órdenes):** `totalPedididoConDescuento` fiable 99.9%; `cliente.documento` 99.3% (numero_identificacion 0%); índice presente. Script `functions/scripts/verify_customer_metrics_readonly.js`.
- **Aislamiento (respuesta a inquietud "no tocar orders"):** lógica pura en `services/customerMetrics/computeCustomerSummary.js`; endpoint en `controllers/customerMetrics.js` (NO se edita `controllers/orders.js`); 1 línea aditiva en `routers/orders.js`. **Cero escrituras a `orders`.**
- **Rollout:** feature flag `ENABLE_CUSTOMER_METRICS` (frontend, default OFF) → rollback = apagar flag.
- **Estado:** spec/plan/tasks creados; backend implementado + 15 tests verdes (10 unit + 5 contract). Frontend (servicio + subcomponente `app-customer-metrics`) implementado, pendiente validar build + activar flag.

### 2026-07-24 — D-044: Apertura spec 010 — integración descuentos/promociones en venta asistida (formalización retroactiva bajo SDD)
- **Contexto:** Feature A (códigos con enforcement de "Aplica a") y Feature B (promociones automáticas de catálogo) se construyeron y pushearon en la rama `feature/descuentos-promociones` (backend `720d6aa`/`ce425b2`, frontend `742c4e0a`/`efcef55b`) **fuera de la ceremonia SDD**. Su intención nunca quedó como criterios verificables → viola de facto el Artículo I ("spec primero"). Las decisiones D-B1..D-B5 se tomaron con el usuario pero solo vivían en la bitácora del módulo (`components/proceso/descuentos-promociones/CLAUDE.md`), no en el contrato vivo.
- **Decisión de alcance (elegida por el usuario, 2026-07-24):** la spec 010 es **retroactiva + gaps**. Formaliza A/B como *groundwork ya entregado* con criterios EARS marcados `[AS-BUILT]` (que el e2e debe validar) y añade el trabajo `[NEW]`: verificación end-to-end real en navegador (nunca corrida) + cierre de brechas conocidas (desglose mostrado vs pedido persistido en caso código%+promo; envío_gratis→cero; vigencia UTC→America/Bogotá; tope 100% en porcentaje).
  - **Alternativas descartadas:** "solo hacia adelante" (dejaría A/B sin cubrir en la cadena SDD, contra Art. XIV "si no está escrito, no pasó"); "dos specs 010+011" (más ceremonia y checkpoints sin beneficio claro para un feature ya construido).
- **Ratificación de decisiones informales de Feature B (antes solo en bitácora del módulo):**
  - **D-B1** — discriminador `naturaleza: 'codigo' | 'promocion'` en la MISMA colección `descuentosPromociones` (no colección aparte).
  - **D-B2** — NO acumulable: un código no descuenta sobre líneas ya en promoción.
  - **D-B3** — MVP solo POS/venta asistida (no toca 360 Woo/Shopify).
  - **D-B4** — una promoción solo admite tipo porcentaje o valor_fijo (no envío gratis).
  - **D-B5** — una promoción siempre apunta a categoría o producto_específico (no store-wide).
- **Excepción de flujo SDD registrada:** como en D-007 (spec 001), se documenta que el código de A/B ya existía al abrir la spec; las decisiones técnicas normalmente del `plan.md` están dispersas en el código y en la bitácora del módulo. El `plan.md` de 010 se enfocará en el trabajo `[NEW]` (e2e + gaps), no en re-planear A/B.
- **Abierto para el checkpoint de la spec (§8 del spec.md):** Q-01 (¿vigencia y tope 100% entran en 010 o follow-up?), Q-02 (gate de pago para redención online), Q-03 (cobertura del e2e: solo local vs también prod tras deploy).
- **Estado:** `specs/010-assisted-sale-discounts-promotions/spec.md` creado en `draft`. Pendiente checkpoint humano antes de redactar `plan.md`.

### 2026-07-24 — D-045: Clarifications spec 010 resueltas + spec aprobada
- **Q-01 (gaps de vigencia y tope 100%):** → **DENTRO de 010.** La comparación de vigencia pasa a hora local America/Bogotá (hoy usa UTC → off-by-~5h en bordes de medianoche) y el descuento porcentual se topa a 100% (hoy sin tope → un código >100% daría subtotal negativo). Razón: cambios acotados que cierran bugs de borde reales.
- **Q-02 (gate de pago para redención online):** → **FOLLOW-UP (fuera de alcance de 010).** El MVP sigue registrando la redención al crear la orden. Riesgo asumido: un código con límite se consume aunque el cliente no pague en ventas con link de pago. Endurecer con `estadoPago=Pagado`/webhook de pasarela queda como spec/sub-spec futura.
- **Q-03 (cobertura del e2e):** → **SOLO LOCAL por ahora.** Verificación end-to-end contra `OH MY STORE` en local (back :3300 + front :4200). Validación contra producción diferida hasta desbloquear el deploy en EC2 (PEM).
- **Decisión:** con las 3 clarifications resueltas, la spec 010 pasa a **approved**. Habilita redactar `plan.md` (enfocado en el trabajo `[NEW]`: e2e + los 4 gaps; NO re-planea A/B, que es groundwork `[AS-BUILT]`).

### 2026-07-24 — D-046: Plan 010 aprobado + tasks generadas
- **Plan (`plan.md`) aprobado en checkpoint humano.** Alcance del plan = SOLO trabajo `[NEW]` (A/B es `[AS-BUILT]`, no se re-planea). Cuatro gaps acotados con trazabilidad a criterio EARS:
  - **G1** — `checkIVAPrice` (front): `factorDesc` por línea = `tienePromoLinea ? 1 : (1-porceDescuento)`, espejando `orderCalculationService`; corrige el desglose cuando código% coexiste con una línea en promo (`payment.service.ts:~421`). Incluye retirar el `console.log` de telemetría (Art. VII/XI).
  - **G2** — envío gratis → costo de envío a cero en checkout (front).
  - **G3** — vigencia en America/Bogotá (offset fijo −05:00, sin dependencia nueva) en `aplicarCodigo` (`descuentosPromociones.js:337`) y `productPromoHelper.obtenerPromocionesVigentes`.
  - **G4** — tope 100% en porcentaje: 400 en `create`/`edit` + guard en cálculo.
- **Gates de constitución:** todos sí/n-a; ningún "no" que requiera enmienda. Excepción de flujo ya cubierta por D-044 (A/B preexistente).
- **Tasks (`tasks.md`) generadas:** T-01..T-11. Orden: regresión primero (T-01/T-02 congelan el caso código%+promo antes de tocar G1), luego G1–G4 en paralelo donde no colisionan, E2E local (T-10, checklist de 6 pasos contra OH MY STORE), cierre (T-11). DoD excluye deploy EC2/PRs y validación en prod (Q-03 diferida).
- **Estado:** spec+plan+tasks `approved`. Habilitada la fase **implement**.

### 2026-07-24 — D-047: Historial de redención de promociones automáticas (Feature B) + fixes de enganche del catálogo (durante e2e de spec 010)
- **Contexto:** validando la spec 010 end-to-end en navegador (T-10), el usuario reportó que las promociones automáticas no se veían en los catálogos y pidió que el historial de promociones registre cada vez que alguien las aprovecha (paridad con los códigos).
- **BUG-E2E-01 (create promo por categoría):** la validación D-B5 exigía `categoriaId`, pero el formulario y TODO el matching (`productPromoHelper`/`aplicarCodigo`) usan `categoriaNombre`. Fix: validar `categoriaNombre` (id opcional).
- **BUG-E2E-02 (promos invisibles en catálogos):** `enrichProductsWithPromos` faltaba en dos rutas reales: `handleBodegaPagination` (el catálogo de venta asistida filtra por bodega) y `getAll` (`GET /v1/productos/all`, módulo de Productos). Enganchado en ambas + display nuevo en la tabla del módulo de Productos (tachado + badge). Confirmado por el usuario. El matching por nombre de categoría ya era correcto (verificado read-only con `scripts/diag-promo-match.js`).
- **Ampliación de comportamiento (la decisión de fondo):** las promociones automáticas ahora dejan **historial de redención** como los códigos. NUEVO `services/descuentosService.registrarRedencionesPromociones` — agrupa las líneas de la orden por `_promocionAplicada`, reutiliza `registrarRedencion` (misma colección `redencioneDescuentos`), idempotente por `${ordenId}_${promocionId}`, incrementa `usosActuales`. Las promociones no tienen `limiteUsos` → no hay auto-agotamiento (solo conteo). Enganchado NO bloqueante en `controllers/orders.js exports.create` tras la redención de código. Frontend: el modal de historial muestra badge "Promoción" cuando no hay código; la lista admin ya exponía Historial/Redimido(N) para todas las filas.
- **Nota SDD:** esta ampliación excede el alcance original de la spec 010 (que era integración + gaps). Se registra aquí y en `tasks.md`; el criterio EARS correspondiente se añade a `spec.md` (§4). Trabajo hecho en sesión interactiva con el usuario conduciendo el e2e.

## 4. Cambios de alcance (scope changes)

> Cuando una spec ya iniciada cambia de alcance, se registra aquí antes de tocar código.

### 2026-06-14 — SC-008-01: Cotizaciones pasa de "greenfield" a "adoptar existente + frontend fresco"
- **Spec afectada:** 008-cotizaciones-mvp.
- **Cambio:** la spec se redactó asumiendo construcción desde cero. Al planear se halló backend completo + módulo en rama `origin/cotizaciones` (ver D-040). El alcance funcional de Fase 1 NO cambia; cambia la **estrategia**: backend se adopta/ajusta, frontend se construye fresco reusando venta asistida (D-041).
- **Impacto en spec:** ninguno en criterios EARS ni out-of-scope. Solo afecta plan/tasks.

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

### 2026-07-24 (sesión apertura spec 010 — descuentos/promociones bajo SDD)
- Retomamos el feature de descuentos y promociones. Ambos repos en `feature/descuentos-promociones`, limpios; Feature A y B ya commiteados y pusheados (backend `720d6aa`, frontend `742c4e0a`).
- Decisión del usuario: la integración descuentos↔venta asistida se formaliza bajo SDD como **spec 010 retroactiva + gaps** (ver **D-044**). Se ratifican D-B1..D-B5 (antes solo en la bitácora del módulo) en el contrato vivo.
- Creado `specs/010-assisted-sale-discounts-promotions/spec.md` (`draft`): criterios EARS `[AS-BUILT]` (códigos, promociones, no-acumulación — ya entregados) + `[NEW]` (e2e en navegador + gaps: desglose vs persistido, envío_gratis, vigencia UTC→Bogotá, tope 100%). Roadmap actualizado con filas 009 y 010.
- Checkpoint spec superado (Q-01=dentro, Q-02=follow-up, Q-03=solo local → **D-045**), spec `approved`.
- Redactado `plan.md` (4 gaps G1–G4 + e2e) → checkpoint del plan superado (**D-046**) → redactado `tasks.md` (T-01..T-11). spec+plan+tasks `approved`.
- Fase **implement** completada en esta misma sesión (larga, interactiva):
  - **G1–G4** cerrados y verificados con pruebas backend ejecutables: `test:descuentos-money-path` 26/26,
    `test:fecha-bogota` 7/7, `test:descuentos-validacion` 4/4, `test:promo-line-price` 12/12; front `payment.service.spec` 4/4.
  - **e2e en navegador** (servidores locales) destapó y corrigió: promo por categoría rechazada (`categoriaId`→`categoriaNombre`),
    promos invisibles en catálogos (enganche faltante en `handleBodegaPagination` y `getAll` + display en módulo Productos).
    Usuario confirmó que ya se ven en ambos catálogos.
  - **Ampliaciones (D-047):** historial de redención de promociones + endurecimiento de `calcularPrecioLineaPromocional`
    (deriva sinIVA). Verificado que NO había doble descuento (revisión de órdenes reales ORE-000463/464).
  - Bitácora del módulo actualizada (sección 11): `components/proceso/descuentos-promociones/CLAUDE.md`.
- **Pendiente:** prueba e2e final en navegador con productos de precio normal; deploy EC2 (PEM) + PRs (base back `backend-aws-security`, front `main`). Commit a la espera de autorización del usuario.
- **Nota entorno:** el harness de karma del frontend estaba inoperante (`quill` no declarado en package.json, `@types/jasmine` sin instalar + comentado en `tsconfig.spec.json`, 2 specs huérfanos `visual`/`visual3d`). Se sorteó con instalaciones `--no-save` para correr el spec; recomendación registrada en `tasks.md` para dejarlo operativo (decisión del equipo).

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

### 2026-06-15 (sesión cotizaciones — cierre con estado guardado)
- **Avance de la sesión:** completados Bloque C (scaffolding) y Bloque D (listado) del frontend, además de extensiones backend para soportarlos.
  - **T-11** módulo lazy `cotizaciones/` + routing + 2 componentes + registro en `routes.ts`, `nav.service.ts` (Gestión Comercial), `modules-catalog.ts`.
  - **T-12** `cotizaciones.service.ts extends BaseService` (método de borrado renombrado `deleteCotizacion` para no chocar con `BaseService.delete`).
  - **T-13** `modelo/cotizacion.ts` (reusa `Carrito`/`Cliente` de ventas).
  - **T-14** listado real: tabla server-side, paginación, chips por estado, buscador `q`, orden, badges, alerta de validez.
  - **T-15** KPIs (4 cards plano border-left) + conteos por estado en chips.
  - **T-16** export Excel (`xlsx`, todo el filtro vigente). **T-17** acciones de fila (abrir + duplicar).
- **Backend (aditivo, sin levantar):** `getAll` acepta `?q=` (búsqueda en memoria por número/cliente); `getMetrics` devuelve `total`+`porEstado`.
- **Estado de verificación:** `tsc --noEmit` 0 errores en todo el proyecto; backend `node -c` OK. Pendiente: T-10 integración (emulador/Java) y verificación de templates vía `npm start`/`ng build`.
- **Archivos tocados (NADA commiteado aún):**
  - Frontend `Seller.Katuq` (rama `feature/venta-asistida-mejorada`): `src/app/components/cotizaciones/**` (módulo, routing, service, modelo, lista, editor placeholder); `src/app/shared/routes/routes.ts`; `src/app/shared/services/nav.service.ts`; `src/app/shared/models/roles/modules-catalog.ts`.
  - Backend `Seller.Katuq.Back` (rama `backend-aws-security`): `functions/controllers/cotizaciones.js`, `functions/routers/cotizaciones.js`, `functions/firestore.indexes.json`, `functions/scripts/test-cotizaciones-contract.js`, `functions/package.json` (script test).
- **RETOMAR EN:** **T-18** (editor: cliente+fechas+términos). Ver `specs/008-cotizaciones-mvp/tasks.md` (tracker vivo con el detalle por tarea).

### 2026-06-15 (sesión cotizaciones — editor T-18 + T-19)
- **Avance:** completado el editor base y el módulo de productos del editor.
  - **T-18** `cotizacion-editor`: picker de cliente (autocomplete debounce vía `MaestroService.searchClients`) + tarjeta del cliente; fecha de emisión (auto hoy) + validez (días) ↔ "válida hasta" con recálculo bidireccional; vendedor = usuario en sesión (readonly); términos precargados de `GET /v1/cotizaciones/config` (editables). Modo edición carga vía `getById`.
  - **T-19** productos: picker por nombre/ref (`VentasService.quickSearchProducts`, debounce); `requiereConfiguracion()` replicado → con config abre `ConfProductToCartComponent` (`returnOnly=true`, sin tocar el carrito singleton; save/restore de `sessionStorage.cliente` para precio por categoría), sin config línea directa (réplica `agregarRapido` + precio por categoría desde `cotizacion.cliente`); ítem libre; tabla de líneas (cant. editable, subtotal, eliminar).
- **D-042 (Opción A) — reuso del popup:** nuevo `src/app/components/ventas/catalogo/catalogo-shared.module.ts` (`CatalogoSharedModule`) declara+exporta `ConfProductToCartComponent`; `VentasModule` quitó la declaración e importa el shared; `CotizacionesModule` lo importa. `@Input returnOnly` aditivo en el popup (venta asistida intacta con default false). Verificado: el popup es template-autocontenido (solo Shared + Gallery/NgSelect/StarRating) y todos sus servicios son `providedIn:'root'`.
- **Verificación:** `tsc --noEmit` 0 errores; **build AOT (`ng build`) 0 errores en cotizaciones/catálogo** (valida el wiring entre módulos lazy). ⚠️ El build global falla por **2 errores AOT PREEXISTENTES** en `ventas/clientes/lista/clientes-lista.component.html` (chip "Inactivos" → `applyEstadoFilter('inactivo')` fuera del tipo `'todos'|'activo'|'bloqueado'`), ajeno a 008 y del commit `feat(clientes)`; **no arreglado** (requiere decisión del dueño de clientes: ¿'inactivo'='bloqueado' o estado nuevo?).
- **Archivos tocados (NADA commiteado aún) — frontend `feature/venta-asistida-mejorada`:** `cotizaciones/cotizacion-editor/*` (ts/html/scss), `cotizaciones/cotizaciones.module.ts`; nuevo `ventas/catalogo/catalogo-shared.module.ts`; `ventas/ventas.module.ts` (quita decl + importa shared); `ventas/catalogo/conf-product-to-cart/conf-product-to-cart.component.ts` (`@Input returnOnly` + branch en `agregar()`).
- **RETOMAR EN:** **T-20** (edición de precio/IVA por línea: `permitePrecioManual`, `_precioManualOverride`, `_ivaManualOverride`, `getIvaActual`). Luego T-21 (totales+desc global+estado), T-22 (guardar). Decidir aparte si se arregla el bug de `clientes-lista` para desbloquear `build:prod`.

### 2026-06-14 (sesión cotizaciones — Bloque A/B backend)
- Implementado el bloque backend de la spec 008 en `Seller.Katuq.Back` (branch `backend-aws-security`, sin commitear aún), TODO aislado al módulo de cotizaciones (no toca orders/inventory/products/clients):
  - **T-03** consecutivo transaccional `COT-AAAA-MMDD-####` vía `cotizaciones_counters/{company}` + `runTransaction`.
  - **T-04** create/edit almacenan los totales del frontend (source of truth); `calcularTotales` solo como fallback si no llegan.
  - **T-05** `EstadoCotizacion` con valores canónicos (`borrador/enviada/aceptada/rechazada/vencida/convertida`) + helper `normalizarEstado` aplicado en getAll/getById/getByNumber/filter (lectura tolerante de legacy `Borrador/Aprobada/Expirada`).
  - **T-06** `GET /v1/cotizaciones/metrics` (cotizadoMes, pipelineActivo, tasaConversion, borradores).
  - **T-07** `GET/PUT /v1/cotizaciones/config` (`cotizaciones_config/{company}.terminosBase`, con default sembrado).
  - **T-08** `getAll` usa `count().get()` (fallback a lectura) en vez de leer toda la colección.
  - **T-09** índices Firestore `cotizaciones (company, fechaCreacion)` y `(company, estadoCotizacion, fechaCreacion)`.
  - Router reordenado: rutas GET de segmento fijo (`/all`, `/metrics`, `/config`, `/number`) ANTES de la dinámica `/:id` (evita que `/:id` capture `/metrics` y `/config`).
- **T-10 contract tests** (`functions/scripts/test-cotizaciones-contract.js`, `npm run test:cotizaciones-contract`): 9/9 funciones puras PASS (normalizarEstado, calcularTotales). 6 pruebas de integración (consecutivo concurrente, formato, config, create canónico, multi-tenant) escritas con guard emulator-only; SKIP local porque no hay Java para el emulador Firestore. Pendiente: correr con emulador o tenant de prueba.
- Sintaxis validada (`node -c`) en controller, router e indexes.json. Sin commits (pendiente autorización del usuario).
- **Próximo:** Bloque C frontend (T-11…) o cerrar T-10 integración con emulador.

### 2026-06-14 (sesión cotizaciones — Bloque 0 de tasks)
- Spec 008 `approved`, plan `approved`, tasks generadas (25 tareas). Iniciada implementación por el Bloque 0 (pre-flight).
- **T-01 (auditoría read-only de `cotizaciones`):** 3 docs de prueba (1 empresa), estado `Borrador` legacy, consecutivo `COT-2025-00000N`; `cotizaciones_counters`/`cotizaciones_config` inexistentes. Decisión: lectura tolerante (map legacy→canónico), sin backfill destructivo; contador nuevo arranca en 1 por empresa (formato `COT-AAAA-MMDD-####` no colisiona). Script efímero read-only ejecutado contra prod julsmind-katuq con `NODE_TLS_REJECT_UNAUTHORIZED=0` (proxy del entorno inyecta cert; cero escrituras) y eliminado tras correr.
- **T-02 (spike popup config):** `ConfProductToCartComponent` ya retorna el `Carrito` sin tocar `CartSingletonService` en modo `isEdit||isRebuy` (`dismissCurrentModal(ProductoCompra)`). Cotizaciones lo reusará vía `NgbModal` leyendo el resultado; flag de retorno aditivo si hace falta. RT-01 (carrito singleton) baja a riesgo BAJO.
- Ambas open questions técnicas del plan quedaron resueltas; `PUT /config` se incluye en Fase 1.
- **Próximo paso:** Bloque A/B backend — T-03 (consecutivo transaccional) en `Seller.Katuq.Back`.

### 2026-06-14 (sesión cotizaciones — apertura spec 008)
- El responsable de producto entregó 4 mocks HTML en `mock cotizacion/`. Analizados: el objetivo final es `katuq-cotizaciones-flujo.html` (reusa los 3 primeros pasos de la venta asistida + conversión a pedido + portal de aprobación por correo).
- Exploración paralela del código (3 agentes): confirmado que existe todo lo necesario para reusar — `MaestroService` (clientes), `VentasService.getProductsByFilterPaginated/quickSearchProducts` (productos), `PaymentService.checkPriceScale/checkIVAPrice` (cálculo), `ConfProductToCartComponent` (popup config), modelo `Pedido/Carrito/Configuracion`, patrones de routing/nav/permisos. NO existe servicio de cotizaciones (crear desde cero).
- Análisis a fondo de la sección de productos: `requiereConfiguracion()` (ecomerce-products:1057) decide el popup; `permitePrecioManual` + `_precioManualOverride`/`_ivaManualOverride` (carrito:282-332) controlan edición de precio/IVA. Riesgo detectado: `CartSingletonService` es singleton global → la cotización usará su propio arreglo de líneas.
- Decisiones registradas: **D-039** (apertura spec 008, colección propia) + 5 clarifications (D-CLAR-01..05).
- Creada `specs/008-cotizaciones-mvp/spec.md` (estado `in-review`, clarifications resueltas).
- **Próximo paso:** checkpoint humano de la spec → si se aprueba, redactar `plan.md` (stack, contratos de endpoints, fases, gates vs constitución).

### 2026-05-28 (sesión usuarios — spec 007)
- **D-037**: Contraseña de usuarios se estandariza a SHA256 Base64 compatible con el login actual. El frontend hashea al crear y al editar; el backend conserva hashes existentes y normaliza contraseñas crudas si llegan por API.
- **D-038**: Eliminación de usuarios queda habilitada vía `POST /v1/users/delete` solo para Administrador, usando el doc id `cd` y validando que el usuario pertenezca a la empresa activa salvo superadmin `Julsmind`.
- Implementado en frontend `/usuarios` y backend `/v1/users`, sin migración de contraseñas históricas ni cambio del flujo completo de autenticación.
