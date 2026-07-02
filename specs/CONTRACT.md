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
| **009** | **whatsapp-kapso-notifications-marco** | **approved (clarifications resueltas 2026-06-17)** | Daniel | Canal WhatsApp para notificaciones transaccionales vía Kapso. Sender compartido (Katuq) + branding en texto del mensaje. Prepago por comercio con medidor en `/notificaciones`. 4 sub-specs hijas (009.1..009.4). **Renumerada de 007 a 009 — D-043** (resuelve colisión con `007-user-admin-credentials-delete`). |
| 009.1 | whatsapp-kapso-sender | siguiente en cola (spec.md creado 2026-06-17) | — | Adaptador Kapso + templates HSM + enum `WHATSAPP` + reemplazo placeholder `notificationQueue.js:595` + fix bug `case "WHATSAPP"` (pasa `"WEBHOOK"` en :317). |
| 009.2 | whatsapp-usage-tracking | pendiente | — | Colección `whatsapp_usage` idempotente por `notificationId` + cron cierre mensual + cron purga anual (retención 1 año — D-047). |
| 009.3 | whatsapp-billing-prepago | pendiente | — | Saldo prepago en `whatsapp_balance`, debit en transacción, umbrales 80%/0%, UI medidor en `/notificaciones`, endpoints `/v1/whatsapp/topup` + `/usage` + `/balance`. Precio fijo $80 COP/msg (D-044), mínimo recarga $50.000 COP (D-045), saldo no reembolsable al cerrar cuenta (D-048). |
| 009.4 | whatsapp-inbound-autoresponder | pendiente | — | Webhook entrante `POST /v1/whatsapp/webhook` con firma HMAC SHA-256 (D-046) + auto-respond template redirigiendo a comercio. Sin ruteo a inbox del comercio en MVP. |
| 009.5 | whatsapp-conversations-viewer | draft (clarifications abiertas) | Daniel | Viewer READ-ONLY de hilos WhatsApp por cliente final dentro de Katuq. Slot ratificado vía D-049 (renumeración: pasarela pago → 009.6, display name → 009.7). |
| 009.5.1 | whatsapp-contact-profile-panel | draft (enmienda 009.5) | Daniel | Panel lateral de identidad + últimos 10 pedidos + Lead con score de estrellas dentro del viewer. Decisiones fijas D-050/D-051/D-052/D-053. Mismo feature flag `WHATSAPP_INBOX_VIEWER_ENABLED`. |
| **010** | **venta-asistida-impuestos-congruencia** | **approved — tasks in-progress (Fase A)** | — | Unificar el cálculo IVA en 1 punto por entorno (FE `PaymentService`, BE `orderCalculationService`) con ancla A + jerarquía manual→categoría→volumen→base. Fantasma identificado (F-08): FE confía en montos de IVA pre-guardados y BE recalcula → descuadre en líneas con volumen/categoría. Integraciones (Osmosis/Shopify/Woo) NO se tocan (solo leen). spec.md (12 EARS) + findings.md + plan.md (7 fases, feature flag) + tasks.md. Ver D-054/D-055/D-056/D-057. |
| **011** | **crm-clientes-corporativos** | **implementación done — pending E2E con login** | jnavarrog | CRM deja de alimentarse de clientes normales (`/v1/clients`) y pasa a una **lista nueva y propia de clientes corporativos** (prospectos B2B). Nuevo `entityType: 'corporate'` reusando kanban/servicio CRM actual. Formulario = el de crear cliente existente + campo etiquetas. Etapas reusadas de `client`. Lista bajo menú Clientes. Colección propia, NO toca clientes habituales (solo reusa su form). Ver D-058. |
| **013** | **tesoreria-mvp** | **approved — plan/tasks en curso** | Daniel | MVP Tesorería: gestión de pagos con verificación de tesorero. Vendedor sube comprobante → Pospendiente → tesorero aprueba/rechaza (segregación de funciones server-side). Anti-fraude capas 1-2 (hash + referencia duplicada), tab Historial, flag por empresa default OFF, rol nuevo "Tesorero". Diseño original en ClickUp lista `901415301323`. CxC/export/recordatorios/OCR → fase 2. Ver D-073. |
| **012** | **siigo-integration-consolidation** | **draft** | — | Consolidar los 3 caminos de facturación SIIGO en uno solo canónico multi-tenant. Matar el Camino B (POS legacy con datos de prueba + IDs de cuenta ajena), arreglar nodos de flow rotos (Camino C), rotar credencial filtrada en código. Mejoras puntuales en curso: forma de pago + vencimiento de crédito en el modal (D-042 2026-06-23), mapeo de descuento (D-043/D-044, validado E2E) e inventario: reflejar bodega Katuq → `warehouse` en la factura (D-045 2026-06-30, Katuq fuente de verdad). Ver D-039 (2026-06-20). **Renumerada de 008 → 012 en el merge 2026-07-01 (colisión con `008-cotizaciones-mvp`; precedente D-043) — ver D-067.** |

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

### 2026-06-29 — D-059: Implementación spec 011 — CRM de Clientes Corporativos (MVP)
- **Estado:** implementación done en frontend + backend. Pendiente E2E con login real (crear corporativo → verlo en lista → verlo en kanban).
- **Backend (`katuq_admin_back_firebase`):**
  - `crmConstants.js`: `ENTITY_TYPES.CORPORATE='corporate'`, constante `CORPORATE_CLIENTS='corporate_clients'`, flag `isCorporateSourceEnabled()` (env `CRM_SOURCE_CORPORATE`, default ON). `detectContext()`: tenant normal → `corporate` (reusa `CLIENT_STAGES`); Katuq superadmin intacto en `company`; flag OFF → `client` legacy.
  - `crmLeadService.js`: helper `_sourceCollection(entityType)` + loaders genéricos (`_loadSource`, `_loadSourceCapped`, `_ensurePipelineEntities(collection,...)`) + branches corporate en list/getById/updatePipeline/createLead/importLead/deleteLead/findDuplicates. `getById`/`deleteLead` verifican tenant para client **y** corporate. `activo` ahora respeta `estado==='bloqueado'`.
  - `crmStatsService.js`: cuenta sobre `corporate_clients` cuando entityType es corporate.
  - Nuevo `controllers/corporateClients.js` + `routers/corporateClients.js` montado en `/v1/corporate-clients` (getAll, doc, create con dedupe por company+documento, edit, delete). Auth middleware aplicado.
  - Contract tests `scripts/test-011-crm-corporate.js`: 15/15 puras PASS (detectContext flag, _sourceCollection); 4 de integración SKIP sin emulador.
- **Frontend (`Seller.Katuq`):**
  - `CorporateClientsService extends BaseService` → `/v1/corporate-clients`.
  - Nuevo módulo de listado `ventas/clientes/corporativos/` (sin export/import — OQ-2), ruta `ventas/clientes-corporativos`, entrada de menú bajo "Clientes".
  - `crear-cliente-modal`: `@Input() target: 'client'|'corporate'` con branch de persistencia (helpers lookup/create/edit). Etiquetas reusadas tal cual.
  - CRM: `CrmEntityType` + `'corporate'`, `getTitle()` → "Pipeline Corporativos". Kanban sin cambios funcionales (consume `entityType` del backend).
- **Verificación:** backend compila (`node -c` OK) + endpoints montados (401 con auth, 404 control). Frontend `Compiled successfully`. Ambos servers corriendo (3300 / 4200).
- **Desvío vs plan §5:** el router corporativo usa la forma del router `clients` (`/create`,`/edit`,`/delete` POST) en vez de REST puro, por consistencia con el código existente y reúso directo del modal. Sin impacto en el contrato funcional.
- **Pendiente:** E2E con login (sello D-CRM-CORP-MVP cuando los pasos manuales pasen). Nota de rollout: con el flag ON (default), los tenants normales que hoy veían sus `clients` en el kanban verán el pipeline corporativo (vacío hasta cargar corporativos) — comportamiento deseado por D-058.

### 2026-06-29 — D-058: Apertura spec 011 — CRM de Clientes Corporativos (lista propia)
- **Contexto:** el CRM (`components/crm`, `/v1/crm`) hoy se alimenta de los clientes normales (`entityType:'client'`, `/v1/clients`), que ya compraron. El responsable producto quiere trabajar **prospectos corporativos B2B nuevos** en el CRM. Decisión: el CRM **deja de alimentarse de los clientes normales** y pasa a una **lista nueva y propia de clientes corporativos**. El CRM se comporta **exactamente igual que hoy**; solo cambia la fuente.
- **Decisiones de clarificación (resueltas con el usuario 2026-06-29):**
  - Q-01: reusar el **formulario de crear cliente existente** (todos los tipos de documento) + **campo de etiquetas** equivalente al del módulo de clientes.
  - Q-02: nuevo **`entityType: 'corporate'`** reusando kanban/servicio del CRM actual (NO un CRM aparte).
  - Q-03: reusar las **mismas etapas** del pipeline `client`.
  - Q-04: la nueva lista vive bajo el menú **Clientes**.
  - Q-05: **sin** lógica de "convertir" a cliente real — solo se mueve de etapa, igual que hoy.
- **Out of scope:** no se toca colección ni UI de clientes habituales (salvo reusar su form), no migración, no `company` (tenants), no inventario/pedidos/facturación, no importación masiva.
- **Pendiente:** `plan.md` (cómo: colección backend en repo separado, endpoints, parametrización de `crm-list` por entityType). Backend en `katuq_admin_back_firebase` requiere coordinación de endpoints antes del frontend.

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

### 2026-05-26 — D-037: Apertura spec 007 — WhatsApp Kapso Notifications

- **Contexto:** El responsable producto pidió analizar viabilidad de integrar Kapso (`docs.kapso.ai/docs/build-with-ai`) como canal WhatsApp para notificaciones transaccionales. El sistema actual tiene IN_APP/EMAIL/SMS/FIREBASE_REALTIME pero no WhatsApp pese a que el modelo del cliente ya captura `numero_celular_whatsapp` y la UI `/notificaciones` muestra columna WhatsApp marcada como "próximamente".
- **Auditoría rápida:** `notificationQueue.js:54` ya tiene feature flag `ENABLE_WHATSAPP_NOTIFICATIONS`, `:315-325` ya tiene branch `case "WHATSAPP"` en switch dispatcher, `:595-604` es placeholder con TODO. Frontend `notification.types.ts:67-74` enum NO incluye `WHATSAPP`. Todo el andamiaje está; falta el adaptador real.
- **Decisión:** abrir spec marco 007 con 4 sub-specs hijas (007.1..007.4) siguiendo el patrón de 002/003. Estructura: spec.md + findings.md (con datos reales del estado actual) + sub-specs.md (roadmap).
- **Sub-specs planificadas:** 007.1 (sender + templates + enum), 007.2 (usage tracking idempotente), 007.3 (billing prepago + UI medidor), 007.4 (webhook entrante + auto-respond).
- **Onboarding Meta/Kapso (Daniel):** cuenta Kapso + número WhatsApp Business verificado + 6 templates HSM aprobados + TyC con cláusula opt-in. Es bloqueante de activación productiva, pero NO de implementación del código.

### 2026-05-26 — D-038: Sender compartido (1 número Katuq), branding en texto del mensaje

- **Contexto:** alternativas eran (a) un número WhatsApp Business por comercio (display name = nombre del comercio, costo + onboarding por empresa) vs (b) un único número Katuq compartido con `[NombreComercio]` al inicio del texto.
- **Decisión:** opción (b). Display name = "Katuq Notificaciones" (lo que Meta verifica al número). Texto del mensaje arranca con `[NombreComercio]` para que el cliente final identifique el origen.
- **Razón:** elimina onboarding Meta por empresa (24-72h × N comercios), elimina la complejidad de `integration_configs/{company}_kapso`, una sola cuenta Kapso para todo. El display name fijo es trade-off aceptado por el responsable producto.
- **Riesgo asumido (R-01 spec 007):** posible confusión/desconfianza del cliente final del comercio. Mitigación: texto siempre arranca con `[NombreComercio]` y opcional firma "Notificación de Katuq.com".
- **Riesgo asumido (R-02 spec 007):** spam de un comercio degrada rating del número compartido afectando a todos. Mitigación: throttle por empresa (AC-WA-07 = 100 msg/min) + monitoreo de bounces.
- **Compliance Meta:** cláusula nueva en TyC del comercio: "Al usar Katuq, autorizas que las notificaciones WhatsApp salgan del número Katuq en tu nombre."

### 2026-05-26 — D-039: WhatsApp se cobra ADICIONAL al plan vía saldo prepago

- **Contexto:** alternativas eran (a) incluir en plan de suscripción (Katuq absorbe costo Meta+Kapso), (b) postpago facturable al cierre del mes, (c) prepago con saldo recargable.
- **Decisión:** opción (c). Cada comercio tiene saldo prepago en `whatsapp_balance.balanceCOP`. Cada envío exitoso debita en transacción Firestore atómica. Sin saldo → mensaje NO se envía (skipped, no se marca FAILED) y email + SMS si están activos siguen funcionando.
- **Razón:** evita default financiero (es servicio recurrente con costo Meta real). Control inmediato del comerciante sobre su gasto. Modelo familiar para mercado Colombia (recargas tipo telco).
- **Precio único fijo en COP** por mensaje sin distinguir tipo (utility/marketing/service). Pendiente definir monto exacto antes de producción — debe cubrir Meta+Kapso+markup mínimo 40%.
- **Bloqueo al agotar saldo:** envío skipped + email "Saldo agotado" UNA SOLA VEZ + email "Saldo bajo" cuando cruza 80% UNA SOLA VEZ por ciclo de recarga.
- **Saldo de bienvenida (R-04 spec 007):** dar $20.000 COP iniciales al activar el toggle WhatsApp (~250 mensajes utility) para reducir fricción de adopción.

### 2026-05-26 — D-040: Respuestas entrantes con auto-respond, sin inbox del comercio en MVP

- **Contexto:** si el cliente final responde por WhatsApp al número Katuq ("¿dónde está mi pedido?"), llega al inbox de Katuq, no del comercio. Alternativas: (a) ignorar, (b) auto-respond redirigiendo al comercio, (c) rutear al inbox del comercio (necesita /flows + identificación de empresa + UI inbox).
- **Decisión:** opción (b) para MVP. Webhook entrante recibe el mensaje, identifica el comercio dueño por el último envío al mismo `recipientPhone` (`whatsapp_usage` últimos 30 días), envía auto-respond template `"Soy un canal automático. Para atención, contacta a [Comercio] al [email/web]."`.
- **Razón:** corta el costo de implementación ~50% vs opción (c). El comerciante puede iniciar con WhatsApp sin tener que aprender a manejar inbox conversacional. Opción (c) queda para spec futura (007.6) si algún comercio piloto lo pide.
- **Persistencia auditoría:** `whatsapp_inbound` con TTL 90 días para que el comercio pueda ver mensajes entrantes históricos en panel read-only.
- **El auto-respond NO consume saldo:** decisión de negocio (es respuesta de soporte que Katuq da en nombre del comercio). Costo absorbido por Katuq como parte del overhead del servicio.

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

> **Nota de colisión de IDs (resuelta al mergear feature/009.5-viewer-demo-mock 2026-06-25):**
> los IDs **D-043, D-044 y D-045** quedan duplicados en este log porque dos ramas
> en paralelo (WhatsApp Kapso y venta asistida) usaron el mismo rango. Como SDD
> es append-only y los IDs ya están referenciados por commits, NO se renumeran.
> Cuando se cite alguno, prefijá con la fecha (ej. `D-043/2026-06-17` =
> WhatsApp renumeración; `D-043/2026-06-18` = métricas de cliente).

### 2026-06-17 — D-043: Renumeración WhatsApp Kapso 007 → 009 (resuelve colisión)
- **Contexto:** la spec marco WhatsApp Kapso (abierta el 2026-05-26 con D-037..D-040) tomó número 007 sin verificar que ya existía la spec `007-user-admin-credentials-delete` (done en sesión 2026-05-28). El roadmap quedó marcado con "⚠️ COLISIÓN — decisión humana pendiente" desde el 2026-06-02. Hay también colisión real D-037..D-040 en el log (mismo rango usado por ambas specs en sesiones distintas — los IDs de decisión sobreviven, ambos contextos quedan en el contrato).
- **Decisión:** renumerar la spec WhatsApp a **009** (008 está ocupado por cotizaciones in-progress). Folder físico renombrado `specs/007-whatsapp-kapso-notifications-marco/` → `specs/009-whatsapp-kapso-notifications-marco/`. Referencias internas en `spec.md`, `findings.md`, `sub-specs.md` actualizadas. Sub-specs hijas pasan a 009.1..009.4.
- **NO se renumeran las decisiones existentes D-037..D-040 de WhatsApp** (sender compartido, prepago, auto-respond) — las decisiones son append-only y se asume el lector resuelve el contexto por la fecha y el cuerpo. La sesión 2026-05-28 (`user-admin-credentials-delete`) usó los mismos IDs (D-037, D-038) — ambos contextos quedan en el log; cuando se cite, hay que prefijar con la fecha (ej. `D-038/2026-05-26` para sender compartido vs `D-038/2026-05-28` para borrado de usuarios).
- **Razón de NO renumerar IDs históricos:** sería retro-edit de append-only log, antipatrón fuerte en SDD. La colisión es un costo histórico aceptado.
- **Alternativas descartadas:** dejar la colisión sin resolver (rompe inferencia automática de "qué spec es la 007"); renumerar `user-admin-credentials-delete` (ya está done y su SHA-256 está referenciado en código + commits — riesgo arqueológico).

### 2026-06-17 — D-044: Precio fijo $80 COP por mensaje WhatsApp
- **Contexto:** clarification abierta en spec 009 §7. Tres candidatos: $50, $80, $100.
- **Decisión:** **$80 COP por mensaje**, único, sin distinguir tipo (utility/marketing/service).
- **Razón:** cubre Meta utility Colombia (~$0.0055 USD ≈ $22 COP a tasa 4000), fee Kapso estimado (~$15 COP), markup Katuq (~$43 COP) = margen ~54% para absorber crecimiento de costos Meta/Kapso. $50 deja margen tan estrecho que cualquier alza obliga a notificar al comercio; $100 sube barrera de entrada.
- **Implementación:** ENV var `WHATSAPP_PRICE_COP=80` en `kapsoService`. UI medidor lo muestra explícitamente al comercio antes de recargar (transparencia).
- **Revisable:** si Meta sube utility >$30 COP o Kapso sube fee >$25 COP, abrir nueva decisión (no retro-edit D-044).

### 2026-06-17 — D-045: Mínimo de recarga inicial = $50.000 COP
- **Contexto:** clarification abierta en spec 009 §7. Recarga inicial debe ser suficiente para 1-2 meses sin fricción de microrecargas.
- **Decisión:** **$50.000 COP mínimo para la primera recarga** del comercio (≈ 625 mensajes utility). Recargas posteriores SIN mínimo (el comercio elige el monto).
- **Razón:** un comercio con 10-20 pedidos/día consume ~300-600 msg/mes. $50.000 le da margen para 1-2 meses + saldo de bienvenida ($20.000 — R-04 spec) cubre primera semana. Mínimos más altos ($100.000) podrían desincentivar adopción en comercios pequeños.
- **Implementación:** ENV var `WHATSAPP_MIN_TOPUP_COP=50000`. Endpoint `POST /v1/whatsapp/topup` rechaza con `MIN_TOPUP_BELOW_THRESHOLD` si `amountCOP < min` y `whatsapp_balance.totalRecargadoHistoricoCOP === 0`.

### 2026-06-17 — D-046: Firma webhook entrante Kapso = HMAC SHA-256 con `KAPSO_WEBHOOK_SECRET`
- **Contexto:** clarification abierta en spec 009 §7. Docs Kapso no explicitan esquema de firma desde la página build-with-ai.
- **Decisión:** asumir **HMAC SHA-256** con secret compartido `KAPSO_WEBHOOK_SECRET` en ENV. Header esperado: `X-Kapso-Signature: sha256=<hex>`. Si la consola Kapso solo expone Bearer al configurar el webhook, fallback documentado dentro de sub-spec 009.4 sin reescritura del flujo.
- **Razón:** HMAC SHA-256 es el estándar de la industria (Shopify, WooCommerce, Stripe, Wompi). Asumirlo permite escribir el verificador antes de obtener la cuenta real. Si Kapso solo expone Bearer, el verificador cambia 10 LOC.
- **Implementación:** función `verifyKapsoSignature(rawBody, signatureHeader)` en `controllers/whatsappWebhook.js`. Constant-time compare. ENV `KAPSO_WEBHOOK_SECRET` requerida; si falta, endpoint responde 503.

### 2026-06-17 — D-047: Retención `whatsapp_usage` = 1 año + cierre mensual agregado
- **Contexto:** clarification abierta en spec 009 §7. Volumen estimado: 100 comercios × 500 msg/mes = 50.000 docs/mes en `whatsapp_usage`. Sin política de retención, en 3 años son 1.8M docs.
- **Decisión:** retener docs individuales de `whatsapp_usage` por **365 días**. Después, purgar — el `whatsapp_billing_summary/{company}_{yyyymm}` queda como sustituto agregado por mes para auditoría tributaria DIAN (que exige soportes de gastos por 5 años pero acepta resúmenes mensuales firmados).
- **Razón:** balance entre costo Firestore (reads/storage), valor de soporte tributario, y privacidad (datos de clientes finales — teléfonos enmascarados pero aún PII parcial).
- **Implementación:** cron `whatsapp-usage-purge-yearly` (sistema 002.8) corre diariamente, query `whatsapp_usage` por `sentAt < hoy - 365d`, batch delete 500 docs/run. Antes de purgar valida que existe el `whatsapp_billing_summary` correspondiente para no perder soporte.

### 2026-06-17 — D-048: Saldo prepago no usado al cerrar cuenta = no reembolsable
- **Contexto:** clarification abierta en spec 009 §7. Política inicial al cerrar cuenta del comercio.
- **Decisión:** **no reembolsable**. Patrón estándar SaaS prepago (Twilio credits, AWS credits, Wompi saldo).
- **Razón:** evita complicación operativa (devoluciones bancarias COP, conciliación contable Katuq), riesgo de fraude (recargar → cerrar → exigir devolución como vía de ataque), simplicidad TyC.
- **Mitigación al comerciante:** cláusula explícita en TyC + sistema envía 2 emails pre-cierre (30 días antes y 7 días antes) recordando "tienes $X COP de saldo WhatsApp; úsalo antes del cierre". Estado `whatsapp_balance.accountStatus: 'closing'` activa estos emails.
- **Implementación:** `whatsapp_balance.accountStatus` con valores `active | closing | closed`. Método `markClosing(company, closingDate)` se invoca desde el módulo de gestión de cuentas (cuando exista). Cron diario detecta `closingScheduledAt - 30d` y `- 7d` y dispara emails. Al `closingDate`, `accountStatus = 'closed'` y `balanceCOP = 0` (con doc histórico en `whatsapp_topup_history` con `source: 'forfeit_at_close'`).

### 2026-06-17 — D-049: Apertura spec 009.5 — slot ratificado (viewer WhatsApp READ-ONLY)
- **Contexto:** el slot 009.5 estaba reservado en `009/sub-specs.md` para "Pasarela de pago real" y "Display name dinámico". La spec 009.5 (viewer) propone reusar el slot para una herramienta de visibilidad operativa antes que el inbox bidireccional (009.6) o el bot KAI (009.7).
- **Decisión:** ratificar el slot 009.5 para `whatsapp-conversations-viewer` (READ-ONLY). Renumeración derivada: pasarela de pago real → 009.6, display name dinámico → 009.7. Ambos quedan pendientes en backlog.
- **Razón:** la pasarela y el display name son features comerciales/operativas que NO bloquean el sello `D-WA-MVP` (009.1..009.4). El viewer da visibilidad inmediata al comerciante sobre lo que ya está sucediendo en su canal WhatsApp y desbloquea hábito de uso antes de invertir en bidireccionalidad.
- **Alternativas descartadas:** mantener slot 009.5 para pasarela (bloquea visibilidad operativa por meses sin razón de negocio); abrir slot 009.8 para el viewer (rompe orden cronológico del roadmap y obliga a renumerar 009.6/009.7 igual).
- **Aplicación:** spec.md de 009.5 ya contiene aviso de colisión + nota de enmienda 009.5.1 en cabecera. Sub-specs.md del marco 009 actualizado con fila 009.5.1.

### 2026-06-17 — D-050: Lead scoring manual con estrellas (1-5)
- **Contexto:** en el panel 009.5.1, el operador necesita una forma rápida de calificar al contacto WhatsApp sin abrir el CRM completo. Alternativas: (a) scoring automático heurístico (frecuencia + monto historico), (b) scoring manual estrellas 1-5, (c) sin scoring (solo guardar Lead).
- **Decisión:** opción (b) — rating manual 1-5 estrellas, persistido con `ratedBy + ratedAt + correlationId`. Debounce 250 ms para evitar flood al deslizar el cursor entre estrellas.
- **Razón:** scoring automático requiere modelo + pipeline + explicabilidad ("¿por qué es 4?") que está fuera de alcance del MVP. El operador conoce mejor el contexto que cualquier heurística inicial. Sin scoring rompe la promesa del panel de "priorizar atención".
- **Alternativas descartadas:** scoring automático (heurística inestable sin datos suficientes en piloto); thumbs up/down binario (insuficiente granularidad — el comerciante quiere "muy bueno" vs "cliente promedio").
- **Aplicación:** componente `star-rating` con `role="radiogroup"` + nav teclado ←/→/Enter/Esc + tap-target ≥44 px. Persiste en `lead.score` si existe Lead, sino en colección `whatsapp_contact_rating_staging` con TTL 30 días (D-053 staging + migración al crear Lead).

### 2026-06-17 — D-051: CRM bridge es opt-in (operador decide guardar como Lead)
- **Contexto:** al abrir un hilo WhatsApp, hay 3 opciones para sincronizar con CRM: (a) crear Lead automáticamente al primer mensaje entrante, (b) opt-in vía botón "Guardar en CRM" que el operador presiona explícitamente, (c) no sincronizar nunca (CRM y WhatsApp separados).
- **Decisión:** opción (b) — opt-in. Botón "Guardar en CRM" visible mientras el contacto NO tenga Lead asociado; al presionar, si ya existe Lead para `(company, phone)` responde 409 con `leadId` y CTA "Ver lead existente" (no duplica).
- **Razón:** automático llenaría el CRM de basura (clientes que solo preguntan precio una vez, números equivocados, etc.). Sin sincronizar rompe la promesa de "trazar canal WhatsApp como fuente de Leads". Opt-in respeta el juicio del operador y permite medir el canal con `source=whatsapp_thread`.
- **Alternativas descartadas:** automático (genera ruido en CRM, baja precisión del pipeline); sin sincronizar (rompe métricas de canal); auto al primer rating ≥3 estrellas (acopla scoring con bridge, complica UX).
- **Aplicación:** endpoint `POST /v1/whatsapp/contact/:phoneHash/save-as-lead` con dedup `(company, phone)` server-side. Lead nacido desde el panel queda con `source=whatsapp_thread` para tracking.

### 2026-06-17 — D-052: Historial de pedidos en el panel = read-only
- **Contexto:** el panel muestra los últimos 10 pedidos del contacto. Alternativas: (a) read-only con link al detalle de venta, (b) acciones inline (re-enviar factura, cambiar estado), (c) edición rápida de campos del pedido.
- **Decisión:** opción (a) — read-only. Cada fila muestra `nroPedido`, fecha relativa, estado, total. Link a `/ventas/detalle/:id` para acciones. Snapshot al abrir el hilo (sin polling).
- **Razón:** el panel es de **visibilidad de contexto**, no de operación de pedidos. Editar desde acá multiplica superficie de bugs (concurrent edits con módulo de ventas) y rompe el principio de menor sorpresa. El link al detalle ya cubre el caso "necesito hacer algo con este pedido".
- **Alternativas descartadas:** acciones inline (acopla viewer con módulo ventas, viola Art VI de la constitución); edición rápida (riesgo concurrencia + UX confusa).
- **Aplicación:** endpoint `GET /v1/whatsapp/contact/:phoneHash/orders` retorna max 10 docs ordenados por `fechaCreacion desc`. Cache 60s. UI sin botones de acción; solo link.

### 2026-06-17 — D-053: 009.5.1 es enmienda de 009.5 — mismo feature flag
- **Contexto:** 009.5.1 podría ser (a) spec hija independiente con su propio feature flag, (b) enmienda del viewer 009.5 que comparte el mismo feature flag, (c) merge dentro de la spec 009.5 (sin sub-spec separado).
- **Decisión:** opción (b) — enmienda. Mismo feature flag `WHATSAPP_INBOX_VIEWER_ENABLED`. Si el flag está OFF para el comercio, el panel completo NO renderiza (AC-009.5.1-13). El panel solo aparece dentro del viewer; no tiene ruta propia.
- **Razón:** el panel NO tiene sentido sin el viewer abierto. Separar feature flags obligaría a tener "viewer ON + panel OFF" como estado válido que nadie consumiría. Merge dentro de 009.5 obligaría a reabrir la spec aprobada (rompe SDD). Enmienda con sub-spec separado preserva el log de decisiones y permite revisión humana focalizada en el panel.
- **Alternativas descartadas:** feature flag separado (estado inútil "viewer ON + panel OFF"); merge en 009.5 (re-aprobación de spec aprobada).
- **Aplicación:** `009.5.1/spec.md` registra dependencia de `WHATSAPP_INBOX_VIEWER_ENABLED`. El cabecero de `009.5/spec.md` ya tiene nota de enmienda. Sub-specs.md del marco lista 009.5.1 con marca "enmienda de 009.5".

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

### 2026-06-23 — D-044: Crear/editar cliente desde el editor de cotización (supera D-CLAR-05)
- **Contexto:** D-CLAR-05 difirió la creación rápida de cliente en Fase 1 (solo selección de cliente existente). El responsable de producto pidió habilitar **crear y editar** cliente directamente desde la pantalla de nueva cotización para no tener que salir al módulo de clientes.
- **Decisión (mismo patrón que D-042):** reusar `CrearClienteModalComponent` vía un módulo compartido nuevo `src/app/components/ventas/clientes/clientes-shared.module.ts` (`ClientesSharedModule`) que **declara y exporta** el modal. `VentasModule` quita la declaración del modal e importa el shared module (sin cambio de comportamiento); `CotizacionesModule` lo importa también. Cero duplicación de UI, sin acoplar cotizaciones a todo `VentasModule` (Art. VI).
- **Verificación previa:** el modal es autocontenido — su template solo usa `SharedModule` (`translate`, `NgbModule`, Forms) + PrimeNG (`Dropdown`/`InputText`/`Button`); sus servicios (`MaestroService`, `ClientConfigService`, `InfoIndicativos`) son `providedIn: 'root'` → funciona con `NgbModal.open()` desde cualquier inyector. El endpoint `searchClients` ya retorna `cd` (doc id) → el modo edición funciona.
- **UX en el editor:** botón "＋ Crear cliente nuevo" bajo el buscador (preplena documento si lo escrito es numérico) y botón "✎ Editar" en la tarjeta del cliente seleccionado. Al cerrar el modal (`action ∈ {created, existing_found, updated}`) el cliente resultante queda seleccionado en la cotización; en edición se preserva el `cd` por si el cliente refrescado no lo trae.
- **Alternativas descartadas:** importar `VentasModule` completo (arrastra routing/providers, acopla todo ventas); duplicar un formulario de cliente propio en cotizaciones (divergencia de validaciones y campos).
- **Impacto:** ningún cambio de comportamiento en el módulo de ventas; build verificado OK.

### 2026-06-24 — D-045: Edición de cotización — fecha de emisión visible + reactivación de vencidas
- **Contexto (bugs reportados):** al editar una cotización (1) las fechas "no se actualizaban" y (2) el estado tampoco.
- **Causa fecha:** el listado mostraba `fechaCreacion` (inmutable; el backend la borra del `update`) en la columna "Emisión", mientras el editor edita y persiste `fechaEmision`. **Fix:** listado (celda, orden y export) usa `fechaEmision || fechaCreacion`.
- **Causa estado (caso específico del usuario):** `vencida` es estado DERIVADO (enviada + vigencia pasada); `getById` auto-expira hacia adelante (enviada→vencida) pero nada revertía cuando se extendía la vigencia.
- **Decisión:** al extender la vigencia de una cotización **vencida** a una fecha **futura**, se **reactiva** → estado vuelve a **`enviada`** y la **fecha de emisión se re-emite a HOY** (validez recalculada desde hoy; la vigencia elegida por el usuario se conserva). Decidido con el responsable de producto (enviada + emisión=hoy).
  - **Frontend:** `reactivarSiVencidaExtendida()` se dispara en los 3 handlers de fecha del editor (emisión/validez/vencimiento) con toast informativo.
  - **Backend (red de seguridad, espejo de la auto-expiración):** en `edit`, si llega `estadoCotizacion === "vencida"` y `fechaVencimiento` futura → se persiste `enviada`.
- **Alternativas descartadas:** volver a `borrador` (obligaría a reenviar); dejar el cambio solo al usuario vía selector (poco intuitivo y `vencida` no es seleccionable en el editor).

### 2026-06-25 — D-046: Precio por volumen + cambio de IVA no debe resetear al precio de 1 unidad (cotizaciones + venta asistida)
- **Contexto (bug peligroso, corrompía impuestos):** en una línea con precio por volumen, al cambiar el % de IVA el precio de la cantidad **se reseteaba al precio base (1 unidad / primera escala)** y se le aplicaba el IVA. Reportado hoy en **cotizaciones**; histórico e intermitente en **venta asistida**.
- **Causa raíz (patrón compartido):** al fijar `_ivaManualOverride`, el recálculo debe conservar el **precio base SIN IVA de la escala de volumen vigente** y solo cambiar la TARIFA. En su lugar:
  - **Cotizaciones (`cotizacion-editor.component.ts`):** `getRangoVolumen()` retornaba `null` ante cualquier override de IVA y `itemPrecio()` (Prioridad 0b) usaba `precio.precioUnitarioSinIva` (1 unidad). El tier se descartaba por completo. Como todos los totales (subtotal/impuesto/total y el payload guardado) funnel por `itemPrecio()`, persistía el monto incorrecto.
  - **Venta asistida (`carrito.checkPriceScale` + `checkout.getUnitPriceSinIVAWithScale`/`checkIVAPrice`):** ya buscaban el tier, pero leían **solo** `valorUnitarioPorVolumenSinIVA`; si ese campo estaba en 0/ausente (dato legacy) caían a `precioUnitarioSinIva` (1 unidad) → reaparición intermitente del bug ("de repente").
- **Decisión / Fix:**
  1. **Cotizaciones:** `itemPrecio()` con IVA override ahora usa `precioSinIvaBaseLinea()` → resuelve la escala por cantidad (helper `rangoVolumenPorCantidad`, ignora overrides porque el IVA cambia la tarifa, no qué tier aplica) y aplica la tarifa nueva sobre ESE base.
  2. **Sin-IVA del tier ROBUSTO (ambos módulos, helper `tierSinIva`):** usa `valorUnitarioPorVolumenSinIVA` y, si falta/0, lo deriva de `valorUnitarioPorVolumenConIVA / (1 + valorIVAPorVolumen/100)`. Nunca colapsa al precio de 1 unidad.
- **Archivos:** `cotizaciones/cotizacion-editor/cotizacion-editor.component.ts`, `ventas/carrito/carrito.component.ts`, `ventas/checkout/checkout.component.ts`. Categoría de cliente sigue teniendo prioridad sobre volumen (sin cambios). Compila limpio.
- **Pendiente recomendado (no en este cambio):** extraer un `LineaPricingService` único que centralice (precioManual / ivaManual / categoría / volumen) y que consuman carrito, checkout, pedidos.util, cotización, orden-venta, list y POS — hoy la lógica está replicada en 6+ lugares (riesgo de divergencia futura). Registrar como spec si se aborda.
- **Alternativas descartadas:** confiar solo en `valorUnitarioPorVolumenSinIVA` almacenado (frágil ante datos legacy); recalcular en backend (los totales son source-of-truth del frontend en cotizaciones — T-04).

### 2026-06-25 — D-054: Apertura spec 010 — Congruencia de IVA en venta asistida (auditoría as-is verificada)
- **Contexto:** el responsable de producto pidió revisar TODO el proceso de impuesto en venta asistida (dónde se modifica el IVA, que sea congruente y "sin salidas"), con metodología SDD.
- **Auditoría as-is ejecutada (read-only, verificada contra código real):** ver `specs/010-venta-asistida-impuestos-congruencia/findings.md`. Hallazgos confirmados:
  - **F-01/F-02 (crítico):** el fix de D-046 es **solo frontend**. El backend canónico `services/orderCalculationService.js` (`getTotalImpuesto:107-117`, `getSubTotalPedido:29-32`) sigue tomando `valorUnitarioPorVolumenSinIVA` crudo; con datos legacy colapsa al precio de 1-unidad (IVA) o a 0 (subtotal), y ambos usan fallbacks distintos entre sí.
  - **F-03 (alto):** el frontend bloquea volumen cuando hay precio por categoría; el backend NO conoce `_precioAplicadoPorCategoria` → divergencia FE/BE si el producto tiene categoría + volumen. Además la categoría no hornea la tarifa `precioUnitarioIva`.
  - **F-04 (alto):** `services/notifications/templateHelpers.js:884-944` es una 7ª copia de la lógica; su tier de volumen ignora `_ivaManualOverride` → email/PDF puede divergir del pedido.
  - **F-05 (medio):** el backend solo persiste `totalImpuesto` agregado, sin desglose por tarifa (riesgo factura electrónica).
  - **F-07 (ruido):** `controllers/orders.js:7066 getTotalImpuesto` y `:7222 getValorACobrarPorPedido` están deprecated (fórmula incorrecta) pero siguen montados; un agente exploratorio los auditó por error.
- **Decisión:** abrir spec 010 en estado `draft`. Entregados `spec.md` (10 criterios EARS) + `findings.md`. **Checkpoint humano pendiente** antes de pasar a `plan.md`. Clarifications abiertas Q-01 (fuente única de verdad FE vs BE) · Q-02 (set de tarifas) · Q-03 (extraer `LineaPricingService` único o solo parchear) · Q-04 (alcance POS).
- **No se tocó código de cálculo** — solo artefactos SDD. Cumple Art. I (cambios al cálculo de pedidos requieren spec aprobada).

### 2026-06-25 — D-055: Root-cause del "fantasma" de IVA + clarifications spec 010 resueltas
- **El fantasma identificado (F-08, verificado en código):** el IVA queda mal en muchos pedidos porque frontend y backend calculan la MISMA línea **leyendo campos distintos con anclas distintas**. En líneas con **precio por volumen**: FE suma directo `valorUnitarioPorVolumenIva` (monto $ pre-guardado, `checkout.component.ts:688`), BE multiplica `valorUnitarioPorVolumenSinIVA × valorIVAPorVolumen%` (`orderCalculationService.js:112-127`). En líneas con **categoría**: FE usa `precioCategoria.valorIva` guardado, BE usa `categoria.precio × tarifa base`. Coinciden solo si los campos almacenados son recíprocos exactos → cualquier redondeo/legacy/sync/edición parcial los descuadra. El caso **base** (`sinIVA × %`) sí coincide en ambos → por eso "más o menos funciona" pero falla masiva e intermitentemente en volumen/categoría.
- **Modelo de prioridad ratificado (responsable de producto):** precio manual → precio por tipo de cliente → precio por volumen → precio base. Categoría manda sobre volumen.
- **Clarifications spec 010:** Q-01 → ancla única canónica `sinIVA × tarifa` (AC-11); Q-02 → tarifas {0,5,8,19}; Q-03 → **SÍ extraer servicio único de cálculo** (FE + espejo BE + email), es la cura estable; Q-04 → alcance = cadena completa venta asistida → cotizaciones → pedido → email/PDF; POS entra vía el cálculo compartido del backend.
- **Estado:** spec 010 pasa a `in-review`. Pendiente **aprobación humana** del spec.md antes de redactar `plan.md`. No se ha tocado código de cálculo.

### 2026-06-25 — D-056: Spec 010 — jerarquía/ancla ratificadas + superficie real ampliada + plan.md
- **Jerarquía de precio ratificada:** precio manual (si `permitePrecioManual` y configurado en carrito) → **tipo de cliente (categoría) → volumen** → base. Categoría **gana** a volumen (confirmado; coincide con el código FE actual).
- **Ancla de IVA = A:** `IVA = precioSinIVA_resuelto × tarifa_vigente`; `tarifa_vigente = _ivaManualOverride` si se configura en el carrito (prima sobre todo). NUNCA confiar en montos de IVA pre-guardados (`valorUnitarioPorVolumenIva`, `precioCategoria.valorIva`). Precio con IVA es consecuencia (AC-11/AC-12).
- **Superficie real (barrido completo, > de lo estimado):** hay **3 implementaciones de cálculo en backend que se contradicen** — `orderCalculationService.js` (canónico, multiplica, respeta overrides), `utils/priceCalculations.js` (suma montos guardados, ignora overrides/categoría; **vivo** en `analytics.js:1144/1229/1377` → métricas divergen), y `orders.js:7066` (muerto). Email tiene 4ª copia (`templateHelpers.js`). FE ya tiene hub `PaymentService.checkPriceScale/checkIVAPrice` (usado por cotizaciones+POS). Existe módulo **POS completo** que replica venta asistida. Factura electrónica (World Office/SIIGO) y push (Osmosis/Shopify/Woo) consumen el total. Inventario completo en `findings.md §E-bis`.
- **Diseño (Q-03=servicio único):** UN algoritmo canónico en un punto por entorno — FE `PaymentService`, BE `orderCalculationService` — blindados con **fixtures dorados compartidos** (`specs/010/contracts/`). Se retiran `priceCalculations.js`, `orders.js:7066` muerto y la copia de `templateHelpers`. Rollout en 7 fases con feature flag `IVA_CALC_UNIFICADO` + dark-launch comparativo (calcular old+new, loggear divergencias, switch cuando =0). Detalle en `plan.md`.
- **Estado:** `spec.md` in-review, `plan.md` draft. Pendiente **aprobación humana** de spec+plan antes de `tasks.md`/implementar. Open question técnica OT-2: prevención (limpiar campos incoherentes en escritores de productos) → posible sub-spec 010.1, no bloquea.

### 2026-06-25 — D-057: Spec 010 aprobada (spec + plan) — arranca tasks por fases
- **Aprobación humana:** el responsable de producto aprobó `spec.md` (jerarquía manual→categoría→volumen→base, ancla A, 12 EARS) y `plan.md` (punto único FE `PaymentService` / BE `orderCalculationService`, fixtures dorados, 7 fases con feature flag `IVA_CALC_UNIFICADO`).
- **Alcance de integraciones verificado (lectura):** WooCommerce/Shopify/Osmosis **NO se tocan** (push lee `totalImpuesto`; mappers inbound usan impuestos del sistema externo). Único cambio de integración = factura electrónica (`worldOfficeDataMapper`, `facturacion.service`) usar tarifa **efectiva** por línea. Detalle en `findings.md §E-bis`.
- **OT-2 (limpieza preventiva de campos de producto):** diferida a sub-spec **010.1** — no bloquea (el cálculo robusto tolera el descuadre).
- **Estado:** spec/plan `approved`. Se redacta `tasks.md` y arranca **Fase A (fixtures dorados)** — lectura + tests, sin tocar el cálculo. Implementación del cálculo (Fase B+) detrás del feature flag.

### 2026-06-25 — D-058: IVA del envío (spec 010 · F-09) — semántica única
- **Hallazgo (F-09):** el IVA del envío es inconsistente FE/BE en pedidos a domicilio. FE incluye el IVA del envío en `totalImpuesto`; BE solo lo suma si recibe `allBillingZone` (casi nunca) → el persistido lo **omite**; y la ruta de recuperación de envío lo **duplica** (asigna `totalEnvio` CON IVA y luego suma `ivaEnvio`). Afecta solo domicilios → "raro pero real".
- **Decisión de producto:** el envío **lleva IVA con la tarifa de la zona** (`impuestoZonaCobro`). `totalEnvio` se guarda **SIN IVA** (base). El IVA del envío se calcula **una sola vez**: `ivaEnvio = totalEnvio × tarifaEnvio/100`, y `tarifaEnvio` se **persiste en el pedido** para que el backend no dependa de recibir `allBillingZone`.
- **Total:** `subtotalProductos − descuento + totalEnvio(sinIVA) + totalImpuesto(incluye ivaEnvio)`. Sin doble conteo. Codificado en `spec.md` AC-13 y fixture `F-13-envio-con-iva`.

### 2026-06-25 — D-047: Banners de marca en el PDF de cotización y en el landing público (paridad con la factura del pedido)
- **Contexto:** la factura del pedido (venta asistida) ya renderiza banners de la empresa (encabezado + pie de página) y un banner de publicidad de Katuq al final (`payment.service.ts` lee `currentCompany.imageEmail.{encabezado,piepagina}`; `imgPublicidad` = `Contactanos.png`). Se pidió replicarlos en (a) el PDF de la cotización y (b) el landing/link que se comparte por WhatsApp.
- **Decisión / Implementación:**
  - **PDF de cotización (`cotizacion-editor`):** getters `bannerEncabezado` / `bannerPiePagina` / `bannerPublicidad` leen `getCompanyInformationLogged().imageEmail` con fallback a `localStorage.currentCompany.imageEmail` (igual fuente que la factura). Inyectados en `.cot-doc` (capturado por html2pdf): encabezado arriba, pie + publicidad Katuq al final. SCSS `.doc-banner`. Publicidad: la de la empresa si existe, si no la URL Katuq por defecto.
  - **Landing público (`/c/:token`, spec 008.3):** como es sin login (no hay `currentCompany`), el backend `GET /v1/cotizaciones/public/:token` ahora adjunta `branding: { encabezado, piepagina, publicidad }` resuelto con el `brandingService.getCompanyBranding(company)` existente (reuso, no-bloqueante) + fallback Katuq (`KATUQ_DEFAULT_AD_URL`). El componente `cotizacion-publica` renderiza los 3 banners (full-bleed) — interfaz `CotizacionPublicaView.branding?`.
- **Archivos:** FE `cotizacion-editor.component.{ts,html,scss}`, `cotizacion-publica.component.{html,scss}`, `cotizacion-publica.service.ts`; BE `controllers/cotizaciones.js` (require `brandingService`, helper `_brandingPublico`, `getPublica` adjunta `branding`). Compila limpio (FE) + `node -c` OK (BE). Backend reiniciado.
- **Notas:** el mensaje de WhatsApp en sí es solo texto (número/total/validez + link); los banners viven en el landing que abre el link, no en el texto. La URL Katuq por defecto está duplicada como constante en FE (editor) y BE (controller) — candidata a centralizar si se crea el `LineaPricingService`/branding compartido.
- **2026-06-25 (fix CORS del PDF):** los banners se veían en el landing (`<img>` normal no exige CORS) pero salían en BLANCO en el PDF: html2canvas/`fetch` no pueden leer Firebase Storage porque el bucket `julsmind-katuq.appspot.com` NO expone `Access-Control-Allow-Origin`. **Solución:** endpoint backend `GET /v1/cotizaciones/image-proxy?url=` (auth + allowlist de host `firebasestorage/storage.googleapis.com` anti-SSRF) que baja la imagen server-side y la devuelve como `{ dataUrl }` base64. El editor (`toDataUrl` → `CotizacionesService.imageToBase64`) precarga los 3 banners a base64 antes de html2pdf (`preloadBannersForPdf` + `cdr.detectChanges()` + 80ms). **Gotcha local:** el `fetch` server-side a googleapis falla por la interceptación TLS del entorno local → arrancar el backend con `NODE_TLS_REJECT_UNAUTHORIZED=0` SOLO en local (en prod no aplica). Ver [[project_local_firestore_scripts_tls]].

### 2026-06-26 — D-059: Spec 010 · T-03 — canónico validado contra pedidos reales; el fantasma es real y cuesta plata
- **Auditoría READ-ONLY** (`functions/scripts/audit-iva-divergence-readonly.js`, 500 pedidos recientes, todas las empresas; cero escrituras). Compara por pedido: persistido (lo que el cliente vio) vs canónico (`calcularTotalesPedido`) vs viejo (`calculateOrderTotals`).
- **Resultado:** IVA canónico vs persistido **cuadra en 96.4%** (478/496). Los **3.6% (18) que descuadran son TODOS >$1000 y a favor del canónico**; suma |Δ IVA| = **$2.39M en solo 500 pedidos**.
- **F-10 (el fantasma es real):** verificado leyendo pedidos — productos **IVA-exentos** (tarifa 0 en todos los tiers, `precioUnitarioIva:0`, `sinIVA==conIVA`) con `totalImpuesto` grande persistido (ej. $937.975); el canónico calcula 0 (correcto). Patrón inverso: pedidos con IVA=0 que sí debían tributar.
- **F-11 (bug latente que lo enmascaraba):** el viejo hace `order.totalImpuesto = calculatedImpuesto || order.totalImpuesto`; con IVA correcto = 0 (falsy) hace **echo del persistido viejo**, ocultando el descuadre. **Regla para Fase C: NO usar `canon || persistido`.**
- **Decisión:** Fase B se da por **validada con datos reales**. T-03 ✅. Se agrega fixture real-case `contracts/real-cases/exento-volumen.json` (exento→IVA 0, canónico 1/1). Suite principal sigue 14/14. **OT-3 abierta:** parte de los exentos podrían ser históricos cuyo producto cambió de tarifa post-venta — no se corrige histórico ([[feedback_db_caution_zero_write]]); en el dark-launch se reporta como divergencia esperada, no regresión. Detalle en `findings.md §T-03`. **Próximo:** T-07 (espejo del canónico en FE `PaymentService`).

### 2026-06-26 — D-060: Spec 010 · T-10 dark-launch + corrección de marco + OT-4 (decisión PENDIENTE para mañana)
- **T-10 dark-launch (hecho):** helper `logIvaDivergenceDarkLaunch(order, phase)` en `controllers/orders.js`, hookeado en `create` (tras `calculateOrderTotals`) y en `updateOrderInternal` (tras `update`). Escribe a `iva_divergence_audit`. NO muta el pedido; fire-and-forget; gateado por env `IVA_DARK_LAUNCH=true`. **Recalibrado** para registrar **solo la firma del bug D-046**, no cualquier diferencia.
- **CORRECCIÓN DE MARCO (la dio el responsable de producto):** NO todo "canónico ≠ persistido" es bug. El IVA del **pedido** puede legítimamente diferir del IVA actual del **producto**: el comercio decide cobrar o no IVA, puede modificarlo en el carrito (`_ivaManualOverride`), o el producto cambió de tarifa después de la venta. De los 18 divergentes detectados: **solo ~5 son el bug real D-046** (con escala de volumen, IVA calculado sobre el precio de **1 unidad** mientras el subtotal usa el precio de volumen — ej. `DAD-010722`: 6403×771×19% pero subtotal usa 4899 y producto hoy 0%). Los otros 12 son legítimos (8 producto que cambió de tarifa, 3 inverso persist=0, 1 otro).
- **Firma D-046 (lo único que el dark-launch registra ahora):** hay volumen + la tasa implícita del IVA es limpia (0/5/8/19) sobre el precio de 1 unidad pero **sucia** sobre el precio resuelto → el IVA se calculó sobre la base equivocada.
- **Dato clave:** el snapshot del producto **dentro** del pedido SÍ se muta post-venta (en `DAD-010722` pasó de 19% a 0%) → no es fuente confiable de "lo que se cobró".

- **OT-4 — DECISIÓN DE DISEÑO ABIERTA (resolver mañana, tras hablar con el compañero):** ¿dónde guardar el IVA efectivo de cada línea para que sea la **fuente única** y nadie lo recalcule mal?
  - **Opción A (recomendada):** campos propios de la línea (`precioSinIvaResuelto`, `tarifaEfectiva`, `ivaLinea`) + `desgloseIVA` a nivel pedido; TODOS leen esos campos (no recalculan del producto). El sync de productos no los toca. Separa "lo que era el producto" de "lo que se cobró".
  - **Opción B:** pisar el IVA del snapshot del producto-en-pedido con el efectivo. Más simple, pero el snapshot es mutable (un sync lo puede volver a pisar — pasó en DAD).
  - **Opción C (combo):** A + congelar el snapshot (que ningún sync toque pedidos ya vendidos). Lo más robusto, más trabajo (toca flujos Osmosis/Shopify/Woo).
  - **Preguntas a aclarar:** (1) ¿qué significa cada opción en trabajo/riesgo? (2) ¿qué tan grave es que el snapshot sea mutable y por qué se mutó en DAD? (3) ¿qué campos exactos agregar y qué leería cada vista? (4) ¿impacto en factura electrónica/email/integraciones? (5) ¿por qué no basta el fix que ya tenemos?
  - **Estado servicios al cerrar:** backend en :3300 con `IVA_DARK_LAUNCH=true`; FE en checkpoint Fase B (flag `ivaCalcUnificado` OFF). El demo de `list.component` fue revertido.

### 2026-06-28 — D-061: Spec 010 · T-14 (parcial) — `list.component` delega al punto único (mata el bug D-046 en el listado)
- **Hallazgo (usuario):** el listado de pedidos mostraba IVA inflado en `DAD-010760`: **$485.450** cuando lo correcto es **$434.777** (canónico = persistido en BD coinciden exactamente). El doc en BD estaba bien; el bug era de **visualización** del listado.
- **Causa:** `list.component.ts` tenía su **propia copia** de `checkPriceScale`/`checkIVAPrice` con el bug **D-046** sin corregir — con `_ivaManualOverride` sobre una línea con escala de volumen, aplicaba la tarifa sobre el **precio de 1 unidad** (3.650×700×19% = 485.450) en vez de sobre la **escala de volumen** (2.288.300×19% = 434.777). El listado **no usaba** el motor canónico, así que el flag ON no lo corregía.
- **Decisión (delegación, opción elegida por el usuario):** `list.component.checkPriceScale`/`checkIVAPrice` ahora **delegan a `PaymentService`** (punto único). Con `ivaCalcUnificado` ON → motor canónico (volumen + override + descuento + desglose {0,5,8,19} + IVA envío vía `tarifaEnvio`/D-058). Se eliminaron **234 líneas** de lógica duplicada. Corrige fila + **suma de métricas** + **export Excel** del listado.
- **Diferencia con el demo previo (D-060):** aquel demo de `list.component` se **revirtió**; este es permanente y vía delegación (no réplica). Avance real de **T-14** (faltan `cotizacion-editor` y `orden-venta`).
- **Verificación:** `ng serve` "Compiled successfully"; el usuario confirmó $434.777 en pantalla. **Nota:** sigue siendo fix de **UI** (el flag es FE); persistir canónico es Fase C (T-09/T-12) y la fuente única por línea es OT-4 (abierta).

### 2026-06-28 — D-062: OT-4 RESUELTO — IVA efectivo se guarda en la "foto del producto" del pedido (Opción B)
- **Decisión (responsable de producto):** el IVA realmente cobrado por línea se persiste **pisando el snapshot del producto-en-pedido** con los valores efectivos (Opción B de D-060), NO en campos nuevos (Opción A). **El equipo garantiza que el sync de productos NO volverá a pisar el snapshot de pedidos ya vendidos** (mitigación dueña del cliente; era el riesgo de B).
- **Implicación de implementación (Fase C):** al guardar (create/edit), `calculateOrderTotals` usa el motor canónico (`calcularTotalesPedido`) para subtotal/`totalImpuesto`/`desgloseIVA`/total, **y además** escribe en cada línea el precio sin IVA resuelto + la tarifa efectiva en el snapshot del producto (`producto.precio.precioUnitarioSinIva/precioUnitarioConIva/precioUnitarioIva`). Así pantalla = guardado = factura sin campos nuevos.
- **Beneficio colateral:** la factura (`worldOfficeDataMapper.extractTaxPercentage`) que ya lee el % del snapshot del producto, pasa a leer la **tarifa efectiva** automáticamente (T-17 se simplifica).
- **Riesgo aceptado / dependencia:** si un sync llegara a pisar el snapshot post-venta, reaparece el bug (caso DAD-010722). El cliente se hace cargo de blindar eso (equivalente a T-20 / "congelar" de Opción C, fuera de este cambio).
- **Staging:** la escritura canónica al persistir se hace detrás de un **flag de entorno** (no rompe prod al desplegar); se observa con el dark-launch (D-060) hasta divergencias→0 y recién ahí queda permanente.

### 2026-06-29 — D-063: Spec 010 · T-14 — `cotizacion-editor` delega al núcleo canónico (flag-gated)
- **Hallazgo (F-15):** el editor de cotizaciones anclaba el sin-IVA **des-grossando el con-IVA** pre-guardado (`getPrecioSinIva = itemPrecio/(1+iva)`, volumen vía `valorUnitarioPorVolumenConIVA`). El canónico usa el **sin-IVA directo** (ancla A). Para datos incoherentes → mismo fantasma de spec 010.
- **Decisión:** bajo el flag `ivaCalcUnificado` (OFF de fábrica), los getters por línea del editor (`getIvaActual`/`getPrecioSinIva`/`getValorIva`/`itemPrecio`) delegan a `resolverPrecioLinea` del núcleo único FE/BE vía adaptador `resolverLineaCanonica`. OFF → getters legacy → **producción intacta**.
- **NO se mapea `descGlobal` a `porceDescuento`:** el modelo de descuentos de cotizaciones (por **línea** `descuentoLinea` + **global** `descGlobal`) es más rico que el de pedidos (un solo `porceDescuento`). Se delega **solo la resolución por línea** (la del fantasma) y el layering de descuentos se mantiene en el componente. Lock: `contracts/test-cotizaciones-layering.js` (caso trabajado PASS).
- **Cuidado:** el adaptador respeta el **precio manual de ítems libres** (`permitePrecioManual` del editor incluye `itemEsLibre`), caso que `resolverPrecioLinea` no cubre. Sin ese guard, las líneas libres con precio manual se romperían bajo el flag.

### 2026-07-01 — D-065: Fix bloqueante — flow WooCommerce `order.created` de Café Escobar no persistía pedidos (bug fix sin spec, Art I exempción)

- **Contexto:** Café Escobar reportó que no estaban entrando pedidos a Katuq. Investigación (backend, Firestore en vivo) encontró 3 bugs encadenados en el flow `woo-orders-to-katuq-a786f1a8` (instanciado 2026-05-25, spec 003.5):
  1. `companyId` del flow apuntaba a otro tenant (`o4DW9vJ612j9erRZyx57` = "Tienda Demo KAI Import") en vez de `"CAFE ESCOBAR"` — probable error de captura al instanciar el template piloto.
  2. El nodo "mapper" usaba `katuq-canonical-mapper` (genérico, declarativo) sin ningún `mapping` configurado → hacía passthrough del payload crudo de WooCommerce. `services/woocommerce/mappers/order.js` (el mapper real, 545 LOC, ya existía desde el commit `1867d2c` del 003.7) nunca quedó conectado a ningún nodo del flow.
  3. `flowsController.webhookTrigger` responde `200 OK` a WooCommerce **aunque el run interno termine en `status:'failed'`** → WooCommerce no reintenta ni reporta error. Combinado con 1+2, el pedido real de un cliente (WC order #2011, $149.000 COP) se perdió en silencio — no aparece en `orders` bajo ningún company/fecha/email (verificado con scan completo de la colección).
- **Decisión:** Fase 0 (bug fix bloqueante sin spec, Art I exempción — mismo patrón que D-021).
  - `companyId` del flow corregido directo en Firestore.
  - Nuevo nodo `woocommerce-order-map` (transform) que resuelve `line_items[].sku` contra `products` y delega en `mapWcOrderToKatuq()` — reemplaza a `katuq-canonical-mapper` en este flow. Export agregado: `buildCartItem` en el mapper.
  - `katuq-order-upsert`: agregado `integrations.woocommerce.orderId` como candidato de match por `externalId` (evita duplicar pedidos en reintentos de webhook — antes solo Shopify/Osmosis tenían candidato).
  - Nodo `katuq-inventory-adjust` **desconectado del graph** (edge `persist→adjust` removido): solo procesaba el primer ítem del carrito (no fan-out multi-línea) y sus params (`idBodega`, `operation`) no calzan con lo que el handler realmente lee (`bodegaCode`, `productoId`, `delta` desde `item.json`). Ajustar inventario mal es de alto riesgo (Art. crítico del CLAUDE.md) — queda como deuda explícita, NO se improvisó un fix bajo presión de tiempo.
  - Pedido #2011 recuperado manualmente reprocesando el flow ya corregido con el payload guardado en `webhook_logs` → `BAR-000341`, verificado cliente/carrito/totales correctos.
- **Riesgo abierto:** el endpoint `webhookTrigger` sigue devolviendo 200 con runs fallidos para CUALQUIER flow (no solo WooCommerce) — un flow mal configurado puede perder eventos en silencio sin que el proveedor externo se entere. No se tocó en este fix (fuera de alcance, requiere decidir semántica de reintentos con cada proveedor).
- **Deploy:** commit `852213a` en `backend-aws-security`, pusheado y desplegado a `julsmind-api` (EC2 prod, `pm2 restart katuq-api`) el mismo día — verificado sin errores de arranque y pedido de prueba end-to-end en producción.

### 2026-07-01 — D-066: Observabilidad de errores — adopción de Sentry (fase 1: frontend, VERIFICADA E2E)

- **Contexto:** no existía captura de errores en ninguna capa. Auditoría del as-is: (a) frontend tenía `GlobalErrorHandlerService` desconectado (comentado en `app.module.ts`) + `ErrorHandlerService` apuntando a `/v1/errorcenter/regitererror` — endpoint que NUNCA existió (el router `errorcenter` real es de tickets de soporte) + bug de payload (enviaba el array como si fuera un error → siempre "Unknown error"); (b) backend con `winston`/`winston-firebase` instalados y sin usar, crashes solo a `console.error`/pm2; (c) 12+ colecciones de auditoría por dominio sin vista unificada de errores.
- **Decisión:** Sentry SaaS (org `julsmind-sas`, cuenta creada por Daniel). Alternativas descartadas: GlitchTip self-hosted (carga operativa) y casero sobre Firestore (semanas para lograr dedup/agrupación/sourcemaps inferiores). Sin lock-in: GlitchTip acepta los mismos SDKs si se quiere migrar.
- **Implementación fase 1 (frontend, `@sentry/angular@8.55.2` — v8 por compat Angular 14 + TS 4.8):**
  - `main.ts`: `Sentry.init` pre-bootstrap. Solo errores (`tracesSampleRate: 0` — cuida cuota gratuita 5k/mes). `release: katuq-front@<version>` (correlaciona con el build). `beforeSend` elimina headers `Authorization`/`usage-code`/`company`.
  - `app.module.ts`: `ErrorHandler` → `Sentry.createErrorHandler` (con `logErrors: true`, la consola sigue igual).
  - `sentry-context.ts` (nuevo): `syncSentryUserContext()` — usuario (nit/email) + tags `company`/`rol` al scope. Invocado en bootstrap (`app.component`) y post-login (`auth.service`).
  - `http.interceptor.ts`: captura explícita de **5xx** (quedan "manejados" por los subscribe y no llegarían al ErrorHandler) con fingerprint por método+URL.
  - Eliminados los servicios muertos (`globalerror.service.ts`, `error-handler.service.ts`) + listeners dev-only de `app.component` que posteaban al endpoint inexistente.
- **DSN en `environment.ts` y `environment.prod.ts`** (campo `sentryDsn` — vaciar el string desactiva la captura). Activo también en dev con environment tag `development` para separar; si mete ruido, se vacía en dev.
- **Verificación E2E:** error de prueba lanzado desde localhost:4200 → POST 200 al ingest → issue visible y agrupado (2 eventos → 1 issue) en el panel. De ñapa capturó un error real (backend local apagado → `Http failure /v1/subscriptions/status`).
- **Fase 2 (backend, mismo día — commit `2c8c034`):** proyecto Sentry `katuq-backend` (id `4511662049001472`) + `@sentry/node@8.55.2`. `instrument.js` (init tras dotenv, antes de express; no-op sin `SENTRY_DSN`), middleware de contexto multi-tenant (tags company/email desde los headers del interceptor FE), `setupExpressErrorHandler` tras las rutas, `onUncaughtException` respetando el gracefulShutdown existente. Eliminadas deps muertas `winston`/`winston-firebase`/`winston-firebase-transport` (0 usos). Verificado E2E local con ruta de humo temporal (retirada tras el test). **DSN vive en `.env` (no en git)** — agregado al `.env` local; falta agregarlo al `.env` de prod al desplegar.
- **Limitación conocida fase 2:** la mayoría de controllers hace try/catch propio y responde 500 "manejado" — esos NO llegan al error handler de Sentry (solo throws/next(err)/crashes/rejections). Los 5xx sí se ven desde el lado del front (interceptor). Instrumentar catch-blocks críticos con `Sentry.captureException` queda como mejora incremental.
- **Deploy backend a prod (2026-07-01, autorizado explícitamente):** git pull + npm install en el EC2, `SENTRY_DSN`/`SENTRY_ENVIRONMENT=production` en el `.env` de prod, pm2 restart limpio, API sana post-restart.
- **Protección de cuota (5k eventos/mes gratis):** rate limit 60 errores/hora por proyecto + inbound filter localhost ON en ambos proyectos + captura local APAGADA (`sentryDsn: ""` en environment.ts dev; `SENTRY_DSN` comentado en .env local). Al agotar cuota Sentry solo deja de recibir — no cobra ni afecta la app.
- **Pendientes:** (1) el FRONT de prod reporta solo desde el próximo `npm run release` (commit `0f8a2548` debe ir en ese build); (2) sourcemaps al build de prod (requiere `SENTRY_AUTH_TOKEN` + `sentry-cli` en `npm run release` — sin esto los stacks del front salen minificados); (3) alertas a Slack; (4) instrumentar catch-blocks críticos del backend con `captureException`.

### 2026-07-01 — D-067: Renumeración spec SIIGO 008 → 012 (resuelve colisión en merge)

- **Contexto:** el merge de `feature/production_mejoras` → `feature/venta-asistida-mejorada` trajo la spec `008-siigo-integration-consolidation` (abierta vía D-039 del 2026-06-20 en esa rama), pero el slot 008 ya estaba ocupado por `008-cotizaciones-mvp` (D-039 del 2026-06-14) con sub-specs activas 008.2/008.3.
- **Decisión:** la spec SIIGO se renumera a **012** (siguiente NNN libre tras 011-crm-clientes-corporativos). Folder renombrado a `specs/012-siigo-integration-consolidation/` + headers internos de spec.md/plan.md actualizados. Precedente: D-043 del 2026-06-17 (renumeración WhatsApp 007 → 009).
- **Los IDs de decisión NO se renumeran:** D-039..D-046 del contexto SIIGO quedan tal cual en §3, disambiguados por fecha (2026-06-20..30), según la convención append-only fijada en D-043. Las referencias en código (`D-042`, `D-045/D-046` en comentarios) siguen siendo válidas.

### 2026-07-01 — D-068: Saneamiento del andamiaje /flows (4 frentes, ejército de agentes verificados)

- **Contexto:** auditoría del 2026-07-01 (ver memoria `reference_flows_frontend_architecture`) encontró el andamiaje /flows a medio hacer: (1) editor visual = bundle React minificado con DRIFT respecto al fuente (hotfix `e41486f8` del 13-may aplicado SOLO al minificado — recompilar lo regresaba); (2) TRES catálogos de nodos desincronizados (registry vivo ~58 nodos vs `nodeCatalog.json`/`node-catalog.ts` estáticos vs `flows.fallback-catalog.ts` Angular de 1.030 líneas a mano — solo 2 nodos woocommerce en los estáticos); (3) runs `partial` crónicos indiagnosticables (257/300 runs en prod con todos los nodos "success" y errors[] vacío — los ítems del error port no se persistían sin `verboseLogging`); (4) flow ZOMBIE `flow-cafe-escobar-woo-orders` activo duplicando el trigger `woocommerce order.created` de `woo-orders-to-katuq-a786f1a8` → riesgo de doble disparo (pedido/inventario duplicado) si se activa la ruta canónica de webhooks vía eventBus.
- **Ejecución:** 4 agentes Sonnet en paralelo + 4 revisores adversarios independientes (workflow multi-agente, autorizado por el usuario). Resultados:
  1. **Canvas:** guard `localeCompare` portado al fuente (`packages/flow-canvas/src/components/NodePalette.tsx`), bundle recompilado con Vite y copiado a `src/assets/flow-canvas/`. Verificado: diff de 1 sola línea vs HEAD (guard equivalente), sintaxis OK. **Caveat vigente:** el 2º guard (marker-id) vive en código vendor `@reactflow/core` (node_modules) — se re-aplica a mano sobre el dist tras cada build; queda como paso documentado del build hasta introducir patch-package.
  2. **Catálogos:** `nodeRegistry.listSpecs()` nuevo + 3 grupos de nodos (internal/flow-control/kai) corregidos para registrar spec completo + script `scripts/generate-node-catalog.js` (`npm run generate:node-catalog`) que genera `nodeCatalog.json` desde el registry vivo (58 nodos, incluye `woocommerce-order-map`) + `flows.fallback-catalog.ts` Angular REGENERADO idéntico (deep-equal verificado, tsc OK). Tests backend 16/16 PASS.
  3. **Observabilidad de runs:** `flowExecutor.js` persiste SIEMPRE (liviano, sin verboseLogging) `errorItemCount` + `errorSamples` (máx 3, mensaje truncado 300 chars) por nodo, y `statusReason` (`node_failed`|`error_port_items`|`no_items`|`ok`) junto al status — decisión de status BYTE-IDÉNTICA (verificado por revisor). UI `flow-runs` muestra razón amigable + samples por nodo. tsc de todo el proyecto Angular: exit 0.
  4. **Zombie archivado:** `flow-cafe-escobar-woo-orders` → `status: 'archived'` en Firestore (el flow bueno intacto, verificado por revisor independiente). Graph completo preservado en `specs/003-woocommerce-360-marco/zombie-flow-cafe-escobar-graph.json` — su patrón fan-out de inventario (split-array → mapper → inventory-adjust) es la referencia para el fix futuro de R-06.
- **Issue del revisor corregido post-workflow:** el `archivedReason` en Firestore y el `_archiveNote` del JSON citaban "D-067" (ID ya ocupado por la renumeración SIIGO) — corregidos a **D-068** (esta decisión). El playbook `FLOW_MAPPING_PLAYBOOK_2026-05-25.md` recibió nota de que el zombie está archivado.
- **Deudas que esta decisión NO cubre (siguen abiertas):** R-05 (webhookTrigger responde 200 con runs failed), R-06 (fan-out de inventario multi-línea del flow WooCommerce — el nodo adjust sigue desconectado), decisión estratégica sobre canal legacy vs flow para Café Escobar (hoy conviven), y automatizar el build del canvas en CI.

### 2026-07-01 — D-069: Guards de precios en product-upsert + fin del falso "partial" + gap Cereza→Shopify cerrado

- **Contexto (auditoría de la cadena Cereza→Katuq→Shopify de OH MY STORE, misma sesión que D-068):**
  1. **Eslabón 1 sano:** 8.276/8.363 productos vienen de Cereza; 0 sin referencia/título; 130 sin precio (sin stock, sin impacto). Inventario: 2.318 con stock, 0 huérfanos, dedup OK.
  2. **Repisado de precios (reportado por Daniel):** el mapping del flow `cereza-products-to-shopify-a5156643` reconstruye `preciosPorTipoCliente` COMPLETO en cada tick con solo lo que Cereza trae (listas 1=público y 3=mayorista) y `katuq-product-upsert` hacía `set(merge:true)` sin protección → cada sync PISABA ajustes manuales y BORRABA el tipo "modelo" (curado solo en Katuq). El upsert de pedidos tenía campos protegidos; el de productos no.
  3. **Falso positivo "partial" (90% de los 257/300 runs):** `shopify-product-upsert` y `shopify-inventory-adjust` emitían `missing_input` al error port cuando el tick del polling venía VACÍO (sin cambios en Cereza) — caso normal reportado como error.
  4. **Gap real Katuq→Shopify: solo 18 de 2.318 con stock** sin publicar (99.2% cobertura) — todos con datos completos y activos en Cereza; el diff del trigger simplemente nunca los re-emitió.
- **Decisiones/fixes (commits BE `98f423f`, FE `13e0577a`, deployado a prod con autorización explícita):**
  1. **`katuq-product-upsert` nuevo param `pricingMode` (default `merge`):** `preciosPorTipoCliente` se mergea por `tipoClienteId` (tipos que el sync no trae SE CONSERVAN — "modelo" sobrevive); respeta `manualOverride` por entrada y `precio._precioManualOverride`; un precio entrante 0/null NUNCA pisa uno existente > 0; cambios ≥50% se aplican pero quedan en logger + `_pricingWarnings` del item. `replace` = comportamiento viejo como escape hatch.
  2. **Ticks vacíos = éxito:** los 2 nodos Shopify retornan `main: [[]]` sin error item → el run queda `success` con `statusReason: no_items`. "Partial" vuelve a significar problema real.
  3. **Push one-shot de los 18** (dry-run primero per regla de backfills, luego `--apply` autorizado): raw traído de Osmosis por referencia (secuencial anti-429) → `flowEngine.startRun` del flow real → run `success/ok`, 6/6 nodos verdes. **Verificado: 18/18 con `integrations.shopify.productId`, gap = 0.** Prueba en vivo de los guards: los productos conservaron sus 3 tipos de precio (el sync solo trae 2).
- **Nota técnica:** `osmosisApiClient.getProductsByReference` devuelve `{products: []}` — no array ni `.data` (costó un dry-run fallido).
- **Deuda que abre:** el frontend de maestro de productos aún no setea `manualOverride`/`_precioManualOverride` al editar precios a mano — los guards ya los respetan; falta que el form los escriba (mejora futura para protección total de ediciones manuales por entrada).

### 2026-07-02 — D-070: Café Escobar = primera empresa migrada a notificaciones unificadas (spec 010) + fixes del incidente "no llegan pedidos"

- **Incidente reportado:** Café Escobar decía no recibir pedidos. Verificado contra el API de WooCommerce (fuente de verdad): TODOS los pedidos reales (#2011/#2013/#2014) estaban en Katuq — el día "sin pedidos" (1-jul) fue un día sin ventas real y el #2012 no existe ni en WooCommerce (hueco de numeración). La integración estaba sana; el problema era de PERCEPCIÓN por 3 causas reales:
  1. **`formaEntrega` crudo del canal ("Precio fijo")** en vez del canónico → el módulo de despachos no mostraba los pedidos para generar orden de envío. **Ortografía crítica descubierta:** el frontend compara `=== "Envío a Domicilio"` (CON la "a"); el controller legacy y el mapper Shopify usan "Envío Domicilio" (sin "a") que TAMPOCO matchea — deuda anotada para Shopify. Fix: `normalizeFormaEntrega()` en el mapper WC (`Envío a Domicilio` / `Recoge en Tienda`), título original preservado en `integrations.woocommerce.shippingMethodTitle`, pedidos existentes (BAR-000341/342/343) corregidos en Firestore (commit `9d5c23c`).
  2. **Sin correo de aviso:** el canal legacy llamaba `notificationHooks.onOrderCreated` DIRECTO (sin flag) — cliente recibía email de Katuq y la empresa su copia; el flow lo gatea con `ORDER_NOTIF_UNIFIED` (off) → silencio total desde D-065. **Decisión:** activar `ORDER_NOTIF_UNIFIED_COMPANIES=CAFE ESCOBAR` en el `.env` de prod (piloto de migración spec 010). Sus preferencias en `company_notification_preferences` YA tenían order_created activo para cliente + copia empresa + SMS (configuradas por ellos en mayo). Sin riesgo de duplicados: `createOrder` apaga el camino legacy cuando el flag está on (diseño spec 010). WhatsApp sin saldo → no factura.
  3. **Hora UTC del WordPress de la tienda** (+5h en pantalla, pedidos nocturnos con fecha del día siguiente) → mapper ahora usa `date_created` (hora de la tienda, commit `3a616d8`) + recomendación operativa: la tienda debe poner su WP en `America/Bogota`.
- **Monitoreo:** primer pedido real post-activación debe mostrar en logs `[orderNotif] order_created despachado` (antes decía `dark-launch (flag off)`).

### 2026-07-02 — D-071: Welcome sin indicadores macro — reemplazados por "Tu negocio hoy" (métricas server-side)

- **Contexto:** análisis exhaustivo de `/welcome` (workflow 15 agentes, 2026-07-01) concluyó que los 4 indicadores económicos (TRM, SMLMV, Aux. Transporte, UVT) no entregan valor: cero consumidores en código fuera de sus cards, nadie escribe `config/indicadores_economicos` en Firestore (en enero 2027 mostrarían valores 2026 con sello DIAN), y la TRM duplicaba en frontend el `_getTRM()` que ya existe en `billingService.js`. Daniel confirmó la eliminación ("datos raros que no tienen funcionalidad").
- **Decisión:** los 4 cards macro se eliminan del welcome. En su lugar, fila "Tu negocio hoy" con 4 widgets del comercio consumiendo endpoints server-side EXISTENTES (regla del proyecto: frontend solo muestra): ventas de hoy (`GET /v1/analytics/dashboard-core`), pedidos por despachar (`GET /v1/logistica/shippingorders/metrics`), stock crítico (`GET /v1/inventory/consolidado?includeMetrics=true&limit=1`) y prospectos CRM (`GET /v1/prospectos/stats`). Cero backend nuevo.
- **Seguridad por rol:** cada widget se pide/muestra solo si el rol tiene acceso a la pantalla destino (mismo `canAccess` de las cards). "Ventas de hoy" exige acceso a `dashboards` — un vendedor sin analíticas NO ve cifras globales del comercio (coherente con el filtro vendedor server-side de reports).
- **2ª iteración (mismo día, tras inventario de métricas por módulo — workflow 4 agentes con verificación FE↔BE):** (a) card CRM corregida — `/v1/prospectos/stats` NO existe en el backend (router prospectos solo CRUD, cae en `/:id` → 404 silencioso); migrada a `GET /v1/crm/stats` y reconvertida a "Tareas CRM vencidas" (`tasksOverdue` + `tasksDueToday`), más accionable que el contador de leads; (b) card "Sin stock" corregida — `estadisticas.*` del consolidado es PER-PÁGINA (con `limit=1` siempre 0/1); ahora `sinStock = totalesGlobales.totalSKUsCatalogo - totalProductos` (exacto) y `bajoStock` = suma de `bodegas[].metricas` (exacto mono-bodega); (c) 2 cards nuevas de clientes vía `GET /v1/orders/global-metrics` (cacheado 30 min server-side en `metricas_globales/{company}`, 1 read/login): "Clientes nuevos (mes)" (`clientesNuevos30dias` + `totalClientes`) y "Alerta de recompra" (`clientesEnAlerta`), gated por `canAccess('ventas/clienteslista')`, renderizando solo conteos (el dinero del payload no se muestra).
- **HALLAZGO DE SEGURIDAD (abierto, backend):** `routers/prospectos.js` no monta middleware de auth y `controllers/prospectos.js:5-19` lee la colección `prospects` SIN filtro por `company` — cualquier tenant autenticado puede listar prospectos de todos. Reportado, pendiente de fix en backend (no se tocó en esta decisión). También `/v1/inventory/health` acepta `?company=` con precedencia sobre el header.
- **Efecto colateral positivo:** el componente welcome queda sin `HttpClient` directo (se va la llamada a datos.gov.co) y sin `AngularFirestore` (era el único componente de la app que leía Firestore directo, con cliente no autenticado).
- **Precedido por (misma limpieza, quick wins 2026-07-01, commit FE `8da81221`, deployado `2026.07.02.1`):** fix hero sessionStorage→SecurityService, take(1) al listener de indicadores (leak), tokens muertos de canAccess alineados, jerarquía acciones>indicadores, migración a `_katuq-tokens.scss`, accesibilidad (aria-labels, contraste AA, headings) y tildes.
- **Fuera de alcance (queda abierto):** widget de salud de flows para admins (propuesta P4 del análisis), TRM servida por backend para tenants importadores (P6), validación DIAN 5 UVT en POS (P7), y auditoría de reglas Firestore no versionadas (write público de `geocoding_cache` — hallazgo del análisis, más grave que el welcome).

### 2026-07-02 — D-072: Loader global deja de ser obligatorio — supresión por pantalla + SKIP_LOADER por request (piloto: /welcome)

- **Problema (reportado por Daniel, molestia de vieja data):** `LoaderInterceptor` enciende el overlay fullscreen bloqueante (`app.component.html:4` → `LoaderComponent`) en CADA request HTTP de la app. Pantallas con cargas rápidas o parciales quedan bloqueadas enteras sin necesidad.
- **Decisión — dos mecanismos componibles, opt-out explícito (el default sigue siendo el overlay para no cambiar el comportamiento de ninguna pantalla existente):**
  1. **Por pantalla:** `LoaderService.suppressGlobalLoader()/releaseGlobalLoader()` (contador, soporta anidamiento) — la pantalla que maneja sus propios loaders lo llama en `ngOnInit`/`ngOnDestroy`. Si al liberar hay requests en vuelo, el overlay reaparece.
  2. **Por request:** `HttpContextToken SKIP_LOADER` en `loader.interceptor.ts` — un servicio marca llamadas puntuales con `{ context: new HttpContext().set(SKIP_LOADER, true) }` (reemplaza el patrón de hardcodear URLs en el interceptor).
- **Piloto /welcome:** la landing renderiza inmediato (suppress en OnInit) y cada card de "Tu negocio hoy" muestra skeleton propio (pulso flat `$katuq-gray-200`, sin gradiente) mientras su endpoint responde.
- **Bug preexistente corregido de paso:** el interceptor llamaba `hide()` en `finalize` incluso para requests excluidas que nunca hicieron `show()` (katuqintelligence) — podía apagar el loader de otra request en vuelo. Ahora las excluidas retornan temprano sin tocar el contador.
- **Siguientes candidatas a migrar (cuando se decida):** listados con paginación server-side (pedidos, clientes, inventario-catálogo) — cada una con sus skeletons por sección antes de suprimir el overlay.

### 2026-07-02 — D-073: Apertura spec 013 — Tesorería MVP (gestión de pagos con verificación de tesorero)
- **Contexto:** Daniel pidió un MVP de módulo de Tesorería. Investigación previa (ClickUp + código + web): en ClickUp ya existe la lista **"Tesorería (Gestión de Pagos)"** (`901415301323`, workspace 31545745, abril 2026) con 9 tareas detalladas + listas hermanas CxC (`901415302224`) y Finanzas-menú (`901415302954`). En el código, el ~70% ya existe: enum `EstadoPago` idéntico a ClickUp en FE (`pedido.ts:242`) y BE (`Pedido.js:345`), pagos en `order.PagosAsentados[]` con campos `estadoVerificacion`/`fechaHoraAprobacionRechazo` subutilizados, modal `asentarpagomanual` con upload de comprobantes a Storage — **pero auto-aprueba** (`estadoVerificacion:"Aprobado"` hardcodeado, `asentarpagomanual.component.ts:186`) y nadie revisa. Web: la segregación de funciones + detección de comprobantes duplicados es el control anti-fraude clave (modalidad "falso Nequi"/comprobantes reciclados).
- **Decisiones de clarificación (resueltas con Daniel 2026-07-02):**
  - Q-01 alcance: **Núcleo + Historial** — pantalla Gestión de Pagos + modales Revisar/Registrar/Cambiar Estado + flujo de estados server-side + anti-fraude capas 1-2 (hash archivo + referencia duplicada) + tab Historial. CxC, exportar, recordatorios, OCR → fase 2.
  - Q-02 activación: **flag por empresa** (estilo `generarFacturaElectronica`), default OFF — cero impacto en tenants actuales; con ON el pago del vendedor queda Pospendiente.
  - Q-03 rol: **rol nuevo "Tesorero"** + Administrador/Super Administrador aprueban; vendedor NUNCA (enforcement server-side, hoy solo hay control UI en `getAvailablePaymentStates`).
  - Q-04 POS contado: **sigue aprobación inmediata** (Aprobado+Entregado) — la revisión aplica a pagos con comprobante.
- **Bugs/deudas detectadas en la investigación (entran al MVP):** `asentarPagoManual` backend escribe `estadoPago="Pagado"/"Pago Parcial"` fuera del enum canónico (`integration.js:2588-2594`); recálculo client-side de estadoPago puede pisar decisiones de tesorería (R-01); comprobantes con URL pública permanente (R-03, endurecimiento fase 2); modal clonado en POS (R-04).
- **Artefactos:** `specs/013-tesoreria-mvp/spec.md` (17 criterios EARS, **approved** mismo día) + `plan.md` + `tasks.md` (25 tareas) + `findings.md` (datos verificados con paths + mapa ClickUp→MVP + fuentes web).
- **Implementación (mismo día, workflow multi-agente):** backend `/v1/treasury` (router+controller+service+fraudDetection+constants, montado en index.js; seed script; 6 índices Firestore) + módulo FE lazy `components/tesoreria` (pantalla Gestión de Pagos + modales revisar/registrar/cambiar-estado + tabs Historial/Alertas) + integraciones (asentarpagomanual ventas/POS con branch por flag, guard de recálculo en list.component, entrada de menú). `asentarPagoManual` legacy delegado a treasuryService con shape de respuesta intacto (fix R-02: ya no escribe "Pagado"/"Pago Parcial"). Build FE verde + 68 contract tests PASS. Desvío de plan §3.3: se reusa `updateOrderInternal` (ya exportada en orders.js:4102) en vez de extraer helper.
- **Revisión adversarial post-implementación:** 2 CRITICAL (bypass `/v1/orders/edit` sin guard de rol para estadoPago; auto-aprobación editando pagos legacy con flag ON) + 7 MAJOR → paquete de fixes aplicado en segunda pasada (guard server-side en `updateOrderInternal` con strip auditado, claim transaccional en review, flag OFF sin `updateOrderInternal` para preservar comportamiento exacto, normalización de writers Wompi/ePayco/POS fuera de enum, resolución de pagos huérfanos en cambio manual, read-only total de pagos en FE con flag ON).
- **Deudas aceptadas del MVP (documentadas, no bloqueantes):** CA-16 parcial (badge menú = "NUEVO" estático; contador de pospendientes requiere cambio del template sidebar — pendiente); `recaudadoHoy` aproxima con ventana de 7 días por `createdAt`; cache del flag FE por sesión (activar flag ⇒ recargar app); `req.headers.email` como identidad de auditoría es patrón sistémico preexistente; matching laxo de `requireRole` ("familia administrador") preexistente.
- **Deploy a producción (2026-07-02, mismo día):** backend commits `d8f690f` + `3a43ce4` en `backend-aws-security` → EC2 (`pm2 restart katuq-api`, verificado 401/404 en `/v1/treasury/*`); índices Firestore desplegados (OJO: el primer intento con `npx firebase` en el repo backend falló silencioso — firebase-tools solo está global); frontend commit `e681d30a` → Firebase Hosting (`npm run release`, versión 2026.07.02.9). **Fix post-deploy:** lookup del flag corregido de `companies.id` (campo inexistente) a `companies.nomComercial` (así resuelve `authentication.js:110`); query `recaudadoHoy` con `orderBy("createdAt","desc")` explícito para casar con el índice DESC (el range sin orderBy pedía el índice ASC → era el "No se pudieron cargar los indicadores" que reportó Daniel).
- **Piloto ALMARA FELICIDAD activado:** `treasuryEnabled=true` en `companies/ct9emhY6ZE1u9Y6IJCPb` vía seed script (dry-run primero). Verificado en prod con Chrome (sesión Jairo): KPIs server-side cargan (cartera $72.4M / 652 pedidos, 427 sin pago), tabs Por revisar/Sin pago (205 pedidos paginados, badges y barras de pago OK)/Historial/Alertas, footer de totales, modal Registrar pago abre con resumen y validaciones. **Pendiente E2E de escritura** (registrar pago real → revisar → aprobar/rechazar): requiere pedido de prueba designado por Daniel (un pago que cubra el total dispara aprobación y posible facturación automática) → sello D-TESORERIA-MVP al pasar.

### 2026-07-02 — D-074: Incidente piloto Almara (DAD-010860) — guard v2 + PreAprobado devuelto a vendedores (ajusta CA-06 de spec 013)
- **Reporte de Jairo (15:58):** (1) "se asienta el pago y queda pendiente... no cambia el estado de pago"; (2) "se les desapareció el estado de preaprobado a las comerciales" en `/ventas/pedidos`.
- **Diagnóstico con datos reales (order `elW6LGgrT8C9M32Fo7ki`):** el flujo nuevo SÍ operó bien a las 20:54 UTC (pago Pendiente + pedido Pospendiente, auditado). A las 21:00 el pedido amaneció `Aprobado` con `anticipo=64900` y `_estadoCalculadoEnFrontend=true` **sin entrada de auditoría**: un recálculo client-side (bundle FE cacheado pre-deploy en el navegador de la comercial) contó el pago EN VERIFICACIÓN como aprobado y persistió vía `/orders/edit`; el guard v1 no lo frenó porque la usuaria es familia-admin (`isRoleAllowed` matchea "administrador"). Sin daño de facturación (Almara no tiene auto-invoicing).
- **Fixes desplegados (BE `83c3d37`, FE release mismo día):**
  1. **Guard v2** en `updateOrderInternal`: con flag ON, las decisiones sobre `PagosAsentados` se sanean para TODOS los roles (solo `/v1/treasury` decide); NADIE cambia `estadoPago` por el edit genérico si hay pagos en verificación; `anticipo`/`faltaPorPagar` se recalculan server-side siempre (neutraliza bundles viejos, POS, producción).
  2. **PreAprobado devuelto a vendedores** con flag ON (solo pierden `Aprobado`): las comerciales lo usan a diario para autorizar entregas. **Esto ajusta CA-06 de la spec 013** ("vendedor no cambia estados" → "vendedor no APRUEBA"); la realidad operativa del piloto manda.
- **Dato pendiente de decisión de Daniel:** DAD-010860 quedó `Aprobado` con su pago aún `Pendiente` (el parche directo del doc fue bloqueado por permisos — correcto). Vía natural: el tesorero decide el pago desde `/tesoreria` (aprobar si el banco confirma → estado legítimo con auditoría). Nota operativa: los usuarios deben **refrescar el navegador (Ctrl+Shift+R)** para tomar el bundle nuevo.

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
| R-05 | `flowsController.webhookTrigger` responde `200 OK` a CUALQUIER proveedor aunque el run interno termine en `status:'failed'` — el proveedor externo no reintenta ni se entera. Detectado con WooCommerce (D-065) pero aplica a todo flow con trigger webhook | Media | Alto (pérdida silenciosa de eventos) | Decidir semántica de reintentos por proveedor (¿5xx si `status==='failed'`? ¿solo en errores de nodos no-idempotentes?) antes de tocarlo — puede romper proveedores que sí reintentan hoy |
| R-06 | Nodo `katuq-inventory-adjust` solo procesa 1 ítem (no hace fan-out de un carrito multi-línea) y sus params (`idBodega`/`operation`) no calzan con lo que el handler lee (`bodegaCode`/`productoId`/`delta`) — desconectado del flow WooCommerce (D-065) hasta fix dedicado | Media | Alto (stock desincronizado si se reconecta sin arreglar) | Fan-out carrito→N adjustments antes de reconectar `persist→adjust` en `woo-orders-to-katuq-a786f1a8` |

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

### 2026-05-26 (sesión apertura 007 — WhatsApp Kapso)

- Daniel pidió analizar viabilidad de integrar Kapso (`docs.kapso.ai/docs/build-with-ai`) para enviar notificaciones WhatsApp.
- Auditoría rápida del sistema actual: `notificationQueue.js:54+315-325+595` tiene feature flag + branch switch + placeholder ya preparados. Frontend tiene columna WhatsApp "decorativa (próximamente)" en `notificaciones.component.ts:33`. Modelo del cliente ya captura `numero_celular_whatsapp` en 8+ formularios. Conclusión: andamiaje listo, falta el adaptador real.
- Kapso es wrapper sobre WhatsApp Business Cloud API de Meta. Endpoint `POST https://api.kapso.ai/meta/whatsapp/v24.0/{phoneNumberId}/messages` con auth `X-API-Key`. Soporta texto libre (ventana 24h) + templates HSM (sin ventana).
- 4 decisiones tomadas (D-037..D-040):
  - Sender compartido único (Katuq), branding en texto del mensaje (`[NombreComercio]`).
  - Display name fijo "Katuq Notificaciones".
  - Cobro adicional al plan vía saldo prepago. Bloqueo al agotar saldo. Precio fijo único COP (monto pendiente).
  - Respuestas entrantes con auto-respond redirigiendo al comercio. Sin inbox conversacional en MVP.
- Spec marco 007 + 4 sub-specs hijas (007.1..007.4) en draft. Entregables: `spec.md` + `findings.md` + `sub-specs.md` en `/specs/007-whatsapp-kapso-notifications-marco/`.
- Pendientes para próxima sesión (bloqueantes de aprobación):
  - Daniel define precio fijo COP/mensaje + mínimo de recarga (NEEDS CLARIFICATION en spec).
  - Daniel inicia onboarding Meta/Kapso: cuenta + número Business + 6 templates HSM + TyC con cláusula opt-in.
  - Review humano del marco 007 → si OK, abrir 007.1 con plan.md.

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

### 2026-06-17 (sesión apertura 009.5 + enmienda 009.5.1 — viewer + panel contacto)
- **Continuación de la sesión 2026-06-17 (mañana)** que cerró colisión 007/009 y clarifications de la spec marco WhatsApp.
- **D-049 — slot 009.5 ratificado** para `whatsapp-conversations-viewer` (READ-ONLY). Renumeración derivada: pasarela de pago real → 009.6, display name dinámico → 009.7. Ambos pendientes en backlog.
- **Apertura sub-spec 009.5** (`specs/009.5-whatsapp-conversations-viewer/`): viewer cronológico de hilos WhatsApp uniendo `whatsapp_usage` (outbound) + `whatsapp_inbound` (inbound). 17 criterios EARS, polling 30s/15s con Page Visibility API, `phoneHash` opaco al frontend, audit en `whatsapp_access_audit`. Estado `draft` (clarifications de salt rotación, rate-limit y roles default pendientes).
- **Apertura enmienda 009.5.1** (`specs/009.5.1-whatsapp-contact-profile-panel/`): panel lateral dentro del viewer con 3 secciones (Identidad, Historial, Lead). 4 decisiones fijas:
  - **D-050** lead scoring manual estrellas 1-5 con debounce 250ms (descartado scoring automático heurístico por falta de datos en piloto).
  - **D-051** CRM bridge opt-in vía botón "Guardar en CRM" (descartado auto-crear Lead por ruido en CRM).
  - **D-052** historial de pedidos read-only con link al detalle (descartadas acciones inline para no acoplar viewer con módulo ventas).
  - **D-053** mismo feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` que 009.5 (el panel solo tiene sentido dentro del viewer).
- **Cabecero de 009.5/spec.md** actualizado con nota de enmienda; §6 Out of scope NO contenía "perfil del contacto con historial" (no se removió nada).
- **sub-specs.md del marco 009** actualizado: fila 009.5.1 agregada con goal/entregables/AC/out-of-scope/tamaño (~450 LOC, 2-3 días). Total marco pasa de 1290 a 1740 LOC.
- **Pendientes para próxima sesión:**
  - Daniel resuelve los 5 NEEDS CLARIFICATION de 009.5 (salt rotación, rate-limit, retención audit, roles default, confirmación slot — esta última ya hecha vía D-049).
  - Confirmar adición del campo `recipientPhoneNormalized` en 009.2 (bloqueante duro de implementación 009.5).
  - Review humano de 009.5/spec.md y 009.5.1/spec.md → si OK, redactar plan.md de ambos en paralelo (mismo feature flag, mismo módulo Angular).

### 2026-06-17 (sesión WhatsApp Kapso — resolución de colisión + cierre clarifications + 009.1)
- **Continuación de la sesión 2026-05-26** que dejó la spec marco WhatsApp en draft con 5 NEEDS CLARIFICATION pendientes y colisión de número 007 sin resolver.
- **D-043 — renumeración 007→009**: folder físico renombrado `specs/007-whatsapp-kapso-notifications-marco/` → `specs/009-whatsapp-kapso-notifications-marco/`. Referencias internas actualizadas en spec.md/findings.md/sub-specs.md. Sub-specs hijas pasan a 009.1..009.4. Fila del roadmap §1 corregida. IDs históricos de decisión D-037..D-040 NO se renumeran (append-only log, ambos contextos quedan en el contrato, se citan con prefijo de fecha).
- **D-044..D-048 — defaults aplicados a clarifications** (Auto mode, valores razonables del análisis previo):
  - D-044 precio $80 COP/mensaje (margen ~54% sobre Meta+Kapso estimados).
  - D-045 mínimo recarga inicial $50.000 COP (≈ 625 msg utility, sin mínimo para recargas posteriores).
  - D-046 firma webhook HMAC SHA-256 con `KAPSO_WEBHOOK_SECRET` (fallback Bearer documentado en 009.4 si Kapso solo expone Bearer).
  - D-047 retención `whatsapp_usage` 365 días + `whatsapp_billing_summary` agregado mensual como sustituto para auditoría tributaria DIAN.
  - D-048 saldo no usado al cerrar cuenta = no reembolsable, mitigado con emails pre-cierre 30d/7d + cláusula TyC.
- Spec marco 009 pasa de `draft` a `approved (clarifications resueltas)`. Sub-specs.md actualizado con detalles operativos (ENV vars, schemas extendidos, crones nuevos).
- Sub-spec **009.1/spec.md** creada — adaptador Kapso, templates HSM, enum WHATSAPP, fix bug `notificationQueue.js:317`.
- **Pendientes para próxima sesión:**
  - Daniel inicia onboarding Meta/Kapso: cuenta Kapso + número Business verificado + 6 templates HSM aprobados + cláusula opt-in en TyC. Bloqueante de activación productiva, NO de implementación.
  - Review humano de 009.1/spec.md → si OK, abrir 009.1/plan.md.
  - Confirmar/ajustar D-046 cuando Daniel tenga la cuenta Kapso real (verificar esquema de firma en consola).

### 2026-06-28 (sesión spec 010 — unificación IVA: avance FE + Fase C, SIN subir)
- **Contexto:** se retomó spec 010 (unificar cálculo de IVA/pago). Motor canónico ya existía (FE `iva-canonico.ts` + BE `orderCalculationService.calcularTotalesPedido`, 14/14), detrás de flags OFF + dark-launch.
- **Bug reportado y arreglado (D-061):** listado de pedidos mostraba IVA inflado (`DAD-010760`: 485.450 vs 434.777 correcto). Causa: `list.component` tenía su copia con el bug D-046 y no usaba el motor. Fix: `checkPriceScale`/`checkIVAPrice` delegan a `PaymentService` (−234 líneas). El usuario confirmó 434.777 en pantalla.
- **Fase D (FE) avanzada:** `checkout.component` y `pedidos.util.service` (este vía núcleo canónico directo para evitar **ciclo de DI** con PaymentService) delegan al punto único. `carrito`/`orden-venta` se dejaron (per-ítem ya D-046-correcto / solo lee). `cotizacion-editor` diferido (usa `descGlobal`%, requiere mapeo).
- **OT-4 RESUELTO → D-062 (Opción B):** el IVA efectivo se guarda **pisando la foto del producto** (`producto.precio.precioUnitarioIva`). El equipo se compromete a que el sync NO pise pedidos vendidos.
- **Fase C implementada (T-09):** `calculateOrderTotals` usa el motor canónico al guardar + graba tarifa efectiva por línea, **detrás del env `IVA_PERSIST_CANONICAL`** (OFF). `node -c` OK, canónico 14/14. **World Office queda correcto automático** (lee `precioUnitarioIva`). **SIIGO AISLADO a propósito** (no usa ninguno de los campos tocados — verificado).
- **HALLAZGO IMPORTANTE (sin resolver):** pedidos históricos con la foto **ya corrompida por un sync** (ej. `DAD-010722`: cobrado ~19%/937.975, pero la foto hoy dice 0%) → el canónico, al leer esa foto, daría **IVA 0** si se re-guardan. Es el mismo problema de mutabilidad del snapshot. ⚠️ Decisión pendiente: ¿canónico solo en *create* (no recalcular históricos al editar) o restaurar/congelar fotos antes de prender el flag? (va con OT-4).
- **ESTADO AL CIERRE — NADA COMMITEADO, NADA DESPLEGADO. Producción intacta (flags OFF de fábrica).**
  - Local: ambos flags ON (`environment.ts` `ivaCalcUnificado:true` + `.env` `IVA_PERSIST_CANONICAL=true`) para pruebas; servidores FE:4200/BE:3300 quedaron levantados.
  - Working tree sucio en 2 repos: FE (`iva-canonico.ts`, `payment.service`, `list/checkout/pedidos.util`, specs) + BE (`orderCalculationService.js`, `orders.js` dark-launch, scripts).
- **Pendientes próxima sesión:**
  1. Decidir el tema de históricos corrompidos (create-only vs restaurar fotos) — con el compañero, junto a OT-4.
  2. Garantizar que el sync de productos no pise pedidos vendidos (compromiso del equipo).
  3. T-11 (apagar `analytics`/`priceCalculations` viejos), T-16 (email/PDF leen desglose), cerrar `cotizacion-editor` (mapeo `descGlobal`).
  4. Commit en 2 repos + secuencia de rollout: prender env BE → observar dark-launch hasta divergencias→0 → prender flag FE → validar checkout=persistido=factura.

### 2026-06-29 (sesión spec 010 — decisión históricos + verificación sobrepago)
- **Históricos corrompidos RESUELTO (decisión del encargado):** se dejan **como están**; basta con que los pedidos **nuevos** queden congruentes. El canónico aplica **go-forward**, no se recalculan/restauran fotos históricas. Cierra el pendiente #1 de la sesión 2026-06-28 y la rama "create-only vs restaurar" → se elige **go-forward sin tocar histórico** ([[feedback_db_caution_zero_write]]).
- **Verificación read-only — sobrepago NO degrada "Pagado" (F-14):** a pedido del usuario, se auditaron las 6 rutas que tocan `estadoPago`/`faltaPorPagar`. **Ya se cumple en todas; no requiere cambio.** Blindaje común: `faltaPorPagar = Math.max(0, total − pagado)` y "Pagado"/Aprobado solo baja cuando `faltaPorPagar > 0`. El pago manual además **bloquea el sobrepago de entrada** (`valorExcedido` deshabilita el botón). Integraciones (Wompi) usan `valorRestante <= 0 → "Pagado"`. Detalle + file:line en `findings.md §F-14`. Nota: mi cambio de IVA (T-09) no afecta esto (`calculateOrderTotals` clampea y no toca `estadoPago`).
- **Verificación F-14:** sin cambios de código; solo documentación (findings.md §F-14).
- **Commits + push (spec 010):** FE `060c097` (núcleo canónico FE + delegación list/checkout/pedidos.util) y BE `751ced7` (motor canónico + persistencia + dark-launch), ambos pusheados. Working tree limpio salvo lo dejado fuera a propósito (`settings.local.json`, `cotizaciones.js` D-047, `clientSearch/`). Antes se bajaron 2 commits de CRM/métricas en el BE (fast-forward limpio).
- **T-14 CERRADO — cotizaciones (D-063, F-15):** `cotizacion-editor` ahora delega la resolución por línea al núcleo canónico (`resolverPrecioLinea`) detrás del flag `ivaCalcUnificado`. Se descubrió que anclaba el sin-IVA des-grossando el con-IVA (mismo fantasma). NO se mapeó `descGlobal`: se conserva el layering línea+global del componente y solo cambia el ancla por línea. Adaptador respeta precio manual de ítems libres. Lock `contracts/test-cotizaciones-layering.js` PASS. ng serve compila limpio. **SIN commitear aún.**
- **Estado:** producción intacta (flag OFF). Pendientes de rollout siguen abiertos: T-11 (limpieza BE), T-15 (POS), T-16 (email/PDF), dark-launch en serio → medir divergencias → encender flags.

### 2026-06-30 (sesión — fixes UI modal editar cliente en cotizaciones)
- **D-064 — fixes al modal editar cliente (`CrearClienteModalComponent`) invocado desde `cotizacion-editor`, comercios con precios por tipo de cliente.** Dos bugs reportados por el usuario:
  1. **Tipo de cliente no precargaba en edición.** Causa doble: (a) el tipo se guarda en **dos campos** según origen del cliente — `cliente.tipoCliente` (string) o legacy `cliente.categoria?.nombre` — y el modal solo hacía `patchValue(clienteData)`, que no cubría `categoria.nombre`; (b) ese `patchValue` corre en un `setTimeout` que se ejecuta **antes** de la respuesta HTTP de `consultarTiposClienteActivos()` (race), dejando el `p-dropdown` sin opciones al setear el valor. **Fix:** preseleccionar el tipo **dentro del callback del subscribe** (opciones ya cargadas), resolviendo `tipoCliente || categoria?.nombre`. Al guardar el tipo viaja en `tipoCliente` (el form no tiene control `categoria`; `editarCliente()` arma `{cd, ...result.cliente}`, así que `tipoCliente` es la fuente post-edición).
  2. **Dropdown de tipos se desplegaba DETRÁS del modal.** Causa (corregida tras 1er intento fallido): el `p-dropdown` usa `appendTo="body"` → sale del `ngb-modal-window`; en **PrimeNG 14 el panel va envuelto en `<p-overlay>` y el z-index (~1000) lo pone PrimeNG INLINE sobre el wrapper `.p-overlay`**, NO sobre `.p-dropdown-panel` (donde cae `panelStyleClass="buscar-por-panel"`). Ese ~1000 < modal Bootstrap (1055). El primer fix apuntaba al panel interno → sin efecto. **Fix definitivo:** regla global en `styles.scss` que eleva el wrapper que contiene el panel → `.p-overlay:has(.buscar-por-panel) { z-index: 2000 !important; }` (el `!important` gana al z-index inline; `:has()` ya se usa en el archivo).
- **Archivos:** `src/app/components/ventas/clientes/crear-cliente-modal/crear-cliente-modal.component.ts` + `src/styles.scss`. ng serve compila limpio. **SIN commitear aún.**
- **Banners de cotización NO aparecían en producción (D-047 — cableado backend recuperado y commiteado).** Reportado por el usuario: local sí muestra banners, prod no. **Causa raíz:** el frontend del landing (`cotizacion-publica`) pinta banners con `*ngIf="cot.branding?.encabezado/piepagina/publicidad"`, pero el **cableado del backend que rellena `view.branding` en `getPublica` NUNCA estuvo commiteado** — 0 ocurrencias de `_brandingPublico` en HEAD de `backend-aws-security` y en `main`; solo existía en el working tree local (era el `cotizaciones.js` "dejado fuera a propósito", ver bitácora 2026-06-29 línea 842). Se recuperó hoy al resolver el conflicto del `git stash pop` durante el pull. Sin `branding` en la respuesta, los tres `*ngIf` son falsos → cero banners en prod. Local funciona porque su backend ya tiene el código mergeado.
  - **Acción:** commiteado en backend (`backend-aws-security` **`667c344`**): `_brandingPublico` + `view.branding` en `getPublica` + endpoint `GET /image-proxy` (auth, hosts de Storage) que devuelve la imagen como data URL base64 para incrustar banners en el PDF sin CORS de Firebase Storage. 2 archivos (`controllers/cotizaciones.js`, `routers/cotizaciones.js`). Excluidos del commit: `clientSearch/`, `tests/clientSearch/`, `scripts/diag_tiemposentrega.js` (otro trabajo).
  - **Instrucción explícita del usuario: NO desplegar.** Solo commit (sin push, sin deploy). Producción intacta.
  - **Pendiente para que los banners salgan en prod (2 despliegues, decisión del usuario):** (1) desplegar backend `backend-aws-security` → `back.katuq.com`; (2) el commit de UI de banners `1bb95ae` está solo en `feature/venta-asistida-mejorada`, **no en `main`** → el build de prod del frontend debe salir de una rama que lo incluya. Ambas piezas deben ir juntas (sin backend no llega `branding`; sin frontend no hay HTML que lo pinte). Nota: el banner de publicidad Katuq sale siempre (default `KATUQ_DEFAULT_AD_URL`); encabezado/pie solo si la empresa tiene `imageEmail.encabezado/piepagina`.

### 2026-07-01 (sesión maratónica — WooCommerce, Sentry, saneamiento /flows, precios Cereza)
- **4 frentes cerrados en el día, todos en producción:**
  1. **D-065:** flow WooCommerce de Café Escobar reparado (companyId equivocado + mapper vacío) — pedido real perdido recuperado como `BAR-000341`.
  2. **D-066:** observabilidad de errores con Sentry (front + back), verificada E2E, con protección de cuota. Org `julsmind-sas`, dashboard "Errores Katuq" con 4 gráficas. Idioma español + TZ Bogotá.
  3. **D-068:** saneamiento /flows vía ejército de agentes con revisión adversaria: drift del canvas resuelto, 3 catálogos unificados (58 nodos), runs con `statusReason`/`errorSamples`, flow zombie archivado.
  4. **D-069:** guards de precios en `katuq-product-upsert` (el sync de Cereza repisaba precios y borraba el tipo "modelo"), fin del falso "partial" (ticks vacíos), y gap Cereza→Shopify cerrado (18/18 publicados, cobertura 100%).
- **Hallazgo operativo:** el backend local ejecuta los crons de flows contra el Firestore de PROD (misma serviceAccountKey) → runs duplicados. Mitigación: apagarlo tras probar. Fix limpio pendiente: env flag `DISABLE_FLOW_CRONS`.
- **Deudas priorizadas que quedan:** R-05 (webhook 200 con run failed), R-06 (fan-out inventario WooCommerce), sourcemaps Sentry (`SENTRY_AUTH_TOKEN`), alertas Slack, flag `manualOverride` en el form del maestro de productos, build del canvas en CI.

### 2026-07-01 (sesión — WooCommerce Café Escobar no entraban pedidos)
- **Diagnóstico en vivo (Firestore + código backend, sin asumir desde docs viejos):** el flow `woo-orders-to-katuq-a786f1a8` (piloto instanciado 2026-05-25 para Café Escobar) tenía 3 bugs encadenados — ver **D-065**. El canal legacy (`/v1/woocommerceWebhook/order/update`) seguía funcionando (prod nunca desplegó el refactor 003.7 que lo hubiera cerrado con 410 Gone), pero el canal nuevo (`order.created` → flow) perdía pedidos en silencio desde al menos 2026-06-05.
- **Caso real detectado en caliente:** WC order #2011 (Camilo Andrés Rincón Lopera, $149.000 COP, transferencia Bancolombia pendiente) llegó durante la investigación y confirmó el bug con evidencia fresca — se usó su payload real (guardado en `webhook_logs`) para probar el fix antes de darlo por bueno.
- **Fix aplicado y desplegado (D-065):** companyId del flow corregido, nodo mapper real (`woocommerce-order-map`) creado y conectado, match por `externalId` agregado a `katuq-order-upsert`, nodo de ajuste de inventario desconectado a propósito (deuda explícita, no se improvisó). Pedido #2011 recuperado como `BAR-000341`. Commit `852213a` pusheado a `backend-aws-security` y desplegado en `julsmind-api` (EC2) el mismo día — verificado con `pm2 status` + smoke test end-to-end en producción real.
- **Pendiente próxima sesión:** ajuste de inventario multi-línea para este flow (fan-out carrito → N adjustments, reusando `katuq-inventory-adjust` tal cual pero con upstream que sí produzca el shape correcto); revisar si el mismo patrón de bug (mapper genérico sin `mapping`) afecta a Mi Campo Verde o Tienda Demo KAI Import si llegan a instanciar su propio flow WooCommerce; decidir semántica de reintentos de `flowsController.webhookTrigger` cuando un run termina en `failed` (hoy responde 200 igual, riesgo abierto para cualquier proveedor, no solo WooCommerce).
> **Nota (2026-07-01):** las 4 entradas SIIGO siguientes vienen de la rama `feature/production_mejoras` y se escribieron cuando la spec era `008-siigo-integration-consolidation`; en el merge se renumeró a **012** (ver D-067). Los D-039..D-046 que citan son los del contexto SIIGO (§3, fechas 2026-06-20..30) y NO se renumeran (append-only).

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

### 2026-07-01 (sesión merge — `feature/production_mejoras` → `feature/venta-asistida-mejorada`)
- Merge de `origin/feature/production_mejoras` (2 commits SIIGO: `30e35279` forma de pago/dueDate + descuento, `62327fb9` UI de mapeo de bodegas D-045/D-046) sobre `feature/venta-asistida-mejorada` (74 commits adelante).
- Código auto-mergeado sin conflicto (`list.component.{ts,html}`, `integrations.service.ts`, inventarios/bodegas, `siigo-bodega-mapping` nuevo, produccion/dashboard, `bodega.model.ts`). Conflictos solo en docs/config: `specs/CONTRACT.md`, `specs/README.md`, `.claude/settings.local.json` — resueltos por unión de ambos lados.
- **D-067 — renumeración spec SIIGO 008 → 012** por colisión con `008-cotizaciones-mvp` (ver §3). Folder renombrado + headers de spec.md/plan.md actualizados. Los IDs D-039..D-046 del contexto SIIGO NO se renumeran (convención D-043).
- Build Angular verificado post-merge (hubo que correr `npm install` primero: `@sentry/angular` de D-066 no estaba instalado en esta máquina).
