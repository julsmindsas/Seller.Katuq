# Contrato Vivo — Seller.Katuq

> **Lee este archivo primero al iniciar cualquier sesión.**
> Aquí se acumula lo que decidimos, lo que está pendiente, y lo que sabemos que no sabemos.
> Formato append-only para decisiones; las secciones de roadmap y riesgos se editan.

---

## 1. Roadmap priorizado

Orden = prioridad. La spec piloto siempre encabeza.

| # | Spec | Estado | Dueño | Notas |
|---|---|---|---|---|
| 001 | osmosis-webhook-inbound | spec en revisión | (pendiente asignar) | Recibir desde Cereza/Osmosis: cambios de estado de orden + actualizaciones de producto |
| 002 | osmosis-order-push (refactor) | backlog | — | Endurecer push de órdenes (`integrations.service.ts:1476`): idempotencia, retries, dashboard de fallos. Resuelve `push_error` y `missing_osmosis_id` |
| 003 | osmosis-products-sync (refactor) | backlog | — | Endurecer sync de catálogo (`fulfillment.service.ts:470`): reconciliación incremental, dedupe, mapeo de campos |
| 004 | flows-cereza-template-hardening | backlog | — | Template `cereza-to-shopify` y nodos webhook con `nodeSlug: 'cereza'` — alinear al adapter común post-001 |

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

### 2026-05-13 — D-004: Canónica `integraciones` (español) — basada en evidencia
- **Contexto:** auditoría de orden real OH MY STORE reveló doble estructura `integraciones` e `integrations` en el mismo documento. Sospecha inicial: que la canónica debía ser inglés.
- **Auditoría:** grep masivo frontend + backend.
  - Frontend `integrations.osmosis`: **0** archivos. Frontend `integraciones.osmosis`: **2** archivos reales (`ventas/list/list.component.ts:518`, `tracking-details-modal.component.ts`).
  - Backend push outbound (`osmosisOrderService.js:79-86,139-141,162,176`): escribe/lee `integraciones.osmosis.*`.
  - Backend webhook inbound (`osmosisWebhookService.js:223-229`): escribe `integraciones.osmosis.*`.
  - Los 10 archivos backend con `integrations.osmosis` son scripts de backfill/diagnóstico legacy y dos flow nodes que ya escriben también en español.
- **Decisión:** `integraciones` (español) es canónica. NO migrar a inglés. Limpiar duplicados.
- **Plan de limpieza (próxima sesión):**
  1. Renombrar scripts de backfill `.js → .deprecated.js` para que no se ejecuten.
  2. Script one-shot que recorra `orders` y `products` y elimine el campo `integrations.osmosis` (mantener solo `integraciones`).
  3. Agregar lint regla / pre-commit que rechace `integrations.osmosis` en código nuevo.
- **Constitución:** Artículo XV añadido.

### 2026-05-13 — D-006: Webhook persiste historial de estados y notas
- **Decisión:** el webhook `order.status_updated` ya no solo sobrescribe, sino que **acumula historial** dentro del propio documento de la orden.
- **Cambios en `osmosisWebhookService.js:processOrderStatusEvent`:**
  - `integraciones.osmosis.statusHistory[]` (append vía `FieldValue.arrayUnion`): cada cambio guarda `{ fecha, statusOsmosis, statusKatuq, previousStatus, notes, source: 'webhook' }`.
  - `notasPedido.notasOsmosis[]` (append, solo si llega `notes`): formato consistente con el patrón existente `notasPedido.notasFacturacionPagos` — `{ fecha, nota, usuario: 'Osmosis Webhook', fromFormulario: false, descripcion, statusOsmosis, statusKatuq }`.
- **Por qué arrays embebidos y no subcolección:** el frontend ya lee `notasPedido.*` directo del doc de orden. Mantener el patrón evita queries extra y mantiene retrocompatibilidad con el resto de UI.
- **Por qué `new Date().toISOString()` en lugar de `serverTimestamp()`:** Firestore prohíbe `serverTimestamp()` dentro de arrays.
- **Idempotencia:** `arrayUnion` con objeto único (timestamp ISO único por evento) evita duplicar entradas si un webhook se procesa dos veces por error.

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
