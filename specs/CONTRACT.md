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
| **002.8** | **crones-dinamicos-firestore** | **done** | — | Colección `cron_jobs_config` + endpoints REST CRUD + hot-reload + seed automático. 7 crones registrados desde defaults. |

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
