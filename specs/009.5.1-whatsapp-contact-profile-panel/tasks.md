# Tasks 009.5.1 — WhatsApp Contact Profile Panel

> Estado: **draft** | Vinculado a `spec.md` (approved) + `plan.md` (approved).
> Padre: [[009.5-whatsapp-conversations-viewer]] | Decisiones fijas: D-050..D-053.
> Última actualización: 2026-06-17

## Convenciones
- **Dueño**: BE (backend Express) | FE (Angular 14) | SHARED (BE+FE coordinados) | DOCS (CONTRACT.md / findings).
- **[P]**: paralelizable con tareas del mismo bloque sin bloqueo cruzado.
- **Tamaño**: S (≤2 h) | M (½ día) | L (1 día completo).
- **Done**: criterio binario y verificable (PR mergeado + artefacto visible).

## Matriz de trazabilidad AC → Tasks (Art VIII)

| AC | Descripción corta | Tareas que lo implementan |
|----|-------------------|---------------------------|
| AC-009.5.1-01 | Render panel ≤500 ms p95 con 3 secciones | T-09, T-13, T-14 |
| AC-009.5.1-02 | Teléfono enmascarado siempre `+57***1234` | T-06, T-07, T-11 |
| AC-009.5.1-03 | `clienteNombre` con link o `profileName` + badge "no verificado" | T-07, T-11 |
| AC-009.5.1-04 | Listar máximo 10 pedidos ordenados desc | T-03, T-07, T-11, T-15 |
| AC-009.5.1-05 | Botón "Guardar en CRM" cuando no hay Lead | T-07, T-12 |
| AC-009.5.1-06 | Rating estrellas con debounce 250 ms + audit quién+cuándo | T-07, T-10, T-14 |
| AC-009.5.1-07 | Rating va a `lead.score` o a staging según haya Lead | T-04, T-07, T-14 |
| AC-009.5.1-08 | Save-as-lead duplicado → 409 con `leadId` existente | T-05, T-07, T-12, T-15 |
| AC-009.5.1-09 | Migrar rating staging → `lead.score` al crear Lead | T-07, T-15 |
| AC-009.5.1-10 | Filtro `company` server-side desde JWT en los 4 endpoints | T-05, T-07 |
| AC-009.5.1-11 | Cross-tenant → 404 con padding 50 ms (no 403) | T-05, T-06, T-07 |
| AC-009.5.1-12 | Audit row por acción en `whatsapp_access_audit` | T-07, T-14 |
| AC-009.5.1-13 | Flag `WHATSAPP_INBOX_VIEWER_ENABLED` off → panel no renderiza | T-13 |
| AC-009.5.1-14 | Star-rating WCAG AA (tap-target ≥44 px, ARIA, keyboard) | T-10 |
| AC-009.5.1-15 | CRM falla → panel degrada, sección Lead muestra CTA "Reintentar" | T-12 |

Cualquier tarea que se agregue durante implementación debe actualizar esta matriz antes de mergear.

## Tabla de tareas

| ID | Descripción | Dueño | Bloqueado por | [P] | Tamaño | Criterio de Done |
|----|-------------|-------|---------------|-----|--------|------------------|
| **T-01** | Auditar CRM real: dump shape `leads` (10 docs OH MY STORE), enum `stage`, campos `phone/phoneNormalized/source/activo`, firma `CrmService.importLead()` y `addActivity()`. Resolver OQ sobre `phoneNormalized` y "1 phone → 1 Lead activo". | DOCS | — | [P] | M | Sección "CRM Leads shape" agregada a `findings.md` con ≥5 ejemplos reales + nota en `CONTRACT.md` resolviendo OQ-2 y NEEDS-CLARIFICATION 2 y 3 de spec.md. |
| **T-02** | Auditar shape `orders` real: 30 docs con `cliente.numero_celular_whatsapp` poblado, verificar formato (E.164 vs `indicativo+numero`), detectar legacy sin prefijo, contar % con prefijo `+57` ausente. Confirmar default normalización runtime. | DOCS | — | [P] | M | Sección "Orders phone shape" agregada a `findings.md` con conteo legacy/normalizado + resolución OQ-2 (default `+57`) anotada en `CONTRACT.md`. |
| **T-03** | Declarar y desplegar índice compuesto Firestore: `orders` `(company ASC, cliente.numero_celular_whatsapp ASC, fechaCreacion DESC)` en `firestore.indexes.json`. Validar build state `READY` en Firebase Console. | BE | T-02 | | S | Índice `READY` (screenshot Firebase Console) + diff `firestore.indexes.json` mergeado en main. |
| **T-04** | Crear colección `whatsapp_contact_ratings` con shape `{company, phoneHash, score, scoreUpdatedAt, scoreUpdatedBy:{userId,userName,role}, ttlAt, migratedToLeadId?, migratedAt?}`, política TTL nativa Firestore sobre `ttlAt` (30 días, D-053). Documentar en `firestore-collections.md` del knowledge base. | BE | T-01 | | S | Colección creada + TTL policy activa (verificada en Firebase Console > Firestore > TTL) + entrada en `firestore-collections.md`. |
| **T-05** | Contract tests para los 4 endpoints (Jest/supertest contra Express en memoria): happy path + 401 + 403 (flag off, sin permiso) + 404 cross-tenant + 409 dup save-as-lead + 429 rate-limit + 400 body inválido. Sin implementación todavía — los tests deben fallar (red). | BE | T-01, T-04 | | L | Suite `tests/whatsappContactProfile.contract.test.js` corre con ≥28 casos rojos, commiteada en branch antes de implementación (Art VIII). |
| **T-06** | Implementar `services/whatsappPhoneHashLookup.js`: lookup `phoneHash → phoneE164` consultando `whatsapp_usage` Y `whatsapp_inbound` (R-09.5.1-02 dual). Normalización E.164 runtime con default `+57`. Helper `padding50ms()` reusable para 404. | BE | T-05 | [P] | M | Service con unit tests verdes (cubre: hit en usage, hit en inbound, miss → null, normalización sin prefijo). Padding helper exportado. |
| **T-07** | Implementar `routers/whatsappContactProfile.js` con los 4 endpoints (GET profile, GET orders, POST save-as-lead, PATCH rating). Reusa `LeadImportService` + `crm_activities`. Multi-tenant strict server-side desde JWT. Padding 50ms en 404. Coalesce `score_changed` ≤30s mismo userId. Migración rating staged → `lead.score` al crear Lead. Extender enum `whatsapp_access_audit.action` con 4 valores. | BE | T-05, T-06 | | L | Router registrado en `index.js`; los 28 contract tests T-05 pasan en verde; smoke manual con curl (user A vs phoneHash de company B → 404 en los 4 endpoints). |
| **T-08** | Migración aditiva colección `leads`: agregar campos opcionales `score:number\|null`, `scoreUpdatedAt:Timestamp\|null`, `scoreUpdatedBy:{userId,userName,role}\|null`, `scoreSource:'manual'\|'auto'\|null`. SIN backfill (todos null). Documentar en `firestore-collections.md`. | BE | T-01 | [P] | S | Diff de modelo `CrmLead` + nota "extensión aditiva backward-compatible" en `firestore-collections.md` + smoke: lead pre-existente sin campos sigue cargando OK. |
| **T-09** | Scaffold módulo lazy `notificaciones/whatsapp-inbox/whatsapp-contact-panel/` con `WhatsappContactPanelComponent` (orquestador `p-accordion`, inputs `phoneHash`, `clienteNombre`, `profileName`) + `WhatsappContactPanelService extends BaseService` con 4 métodos (`getProfile/getOrders/saveAsLead/rateContact`). Endpoints en `notification.config.ts`. | FE | T-07 | | M | Service compila + lint pasa + grep `HttpClient` en módulo = 0 hits (Art IX gate). Componente renderiza placeholder con los 3 inputs. |
| **T-10** | Implementar `KatuqStarRatingComponent` standalone en `shared/components/star-rating/`: `role="radiogroup"`, tap-target ≥44px, debounce 250ms (RxJS), navegación teclado (←/→/Enter/Esc), focus visible, `aria-checked` por estrella, `aria-live=polite` en feedback. | FE | T-09 | [P] | M | Unit tests cubren: keyboard nav, debounce 250ms emite 1 evento por ráfaga, ARIA attrs correctos. axe-core sin violaciones AA. |
| **T-11** | Implementar `IdentitySectionComponent` (avatar 64px o iniciales fallback, máscara teléfono `+57***1234`, badge "no verificado" si no es cliente registrado, link `/clientes/detalle/:id` si lo es) + `OrderHistorySectionComponent` (≤10 pedidos, fecha relativa, estado, total, link `/ventas/detalle/:nroPedido`, estado vacío + estado degradado). Cards planos `border-left 4px`, sin gradientes. | FE | T-09 | [P] | M | Storybook (o fixture page) muestra 6 estados: cliente con/sin Lead, con/sin pedidos, error pedidos, lista vacía. Grep `linear-gradient` en SCSS = 0 hits. |
| **T-12** | Implementar `LeadCrmSectionComponent` (estados: con Lead + score, con ratingDraft staged, sin nada) + `SaveAsLeadDialogComponent` (PrimeNG `p-dialog` + form reactivo, validación `name 2-120`, `priority` enum, `notes ≤500`). Manejo 409 con CTA "Ver lead existente". Estado degradado con CTA "Reintentar" si CRM falla (AC-009.5.1-15). | FE | T-09, T-10 | [P] | M | Tests: render 3 estados + dialog abre/cierra + submit feliz + submit 409 muestra CTA correcto + submit 5xx muestra "Reintentar". |
| **T-13** | Wire panel al detalle del hilo en `WhatsappThreadDetailComponent` (shell 009.5): responsive lateral ≥1280px / tab 768-1279 / sheet <768. Gating por flag `WHATSAPP_INBOX_VIEWER_ENABLED` heredado en `ngOnInit` (componente retorna `null` si off, R-09.5.1-10). Promise.all paralelo de los 3 fetchs para p95 ≤500ms. | FE | T-09, T-11, T-12 | | M | Demo en dev: abrir hilo → panel renderiza en ≤500ms (medido con Performance API en consola). Apagar flag → panel no renderiza. Resize → 3 layouts funcionan. |
| **T-14** | E2E acceptance #1 + #2: (1) **Abrir panel** con contacto que tiene Lead + 5 pedidos → 3 secciones renderizan correctas + audit row `view_contact_profile` escrita; (2) **Calificar**: contacto SIN Lead → fila en `whatsapp_contact_ratings` con `ttlAt = now+30d`; contacto CON Lead → `lead.score` actualizado + `CrmActivity score_changed` creada (y coalesce si re-click <30s). | SHARED | T-13 | [P] | M | Playwright spec `e2e/009.5.1-panel-open-rate.spec.ts` corre verde en CI + screenshots en `/tmp/katuq-shots/`. Audit rows verificables en Firestore emulator. |
| **T-15** | E2E acceptance #3 + #4: (3) **Ver pedidos**: 10 pedidos ordenados `fechaCreacion desc`, click navega a `/ventas/detalle/:nroPedido`; (4) **Guardar como Lead**: crea Lead + migra rating staged a `lead.score` con `migratedToLeadId` + 409 al re-intentar muestra CTA "Ver lead existente" sin duplicar. | SHARED | T-13 | [P] | M | Playwright spec `e2e/009.5.1-orders-save-lead.spec.ts` verde en CI. Migración rating verificada: doc `whatsapp_contact_ratings` queda con `migratedToLeadId` y `lead.score` poblado. |
| **T-16** | Cerrar CONTRACT.md: registrar D-054..D-0XX si surgieron durante implementación, marcar 009.5.1 status `done`, anexar bitácora de sesión con commits relevantes + métricas baseline (panel_render_ms_p95, save_as_lead_count, 409_duplicate_lead_count) configuradas en observabilidad. Plan de canary activado: OH MY STORE 1 sem. | DOCS | T-14, T-15 | | S | CONTRACT.md actualizado + entry sub-spec 009.5.1 marcada `done` + dashboard observabilidad con 4 métricas creadas + canary tag en flag config para OH MY STORE. |

## Diagrama de dependencias

```
[T-01 audit CRM] [T-02 audit orders]        ← Bloque 0 pre-flight (paralelo)
       │              │
       │              └──> [T-03 índice]
       │
       ├──> [T-04 colección ratings + TTL]
       │              │
       │              └──> [T-05 contract tests RED]   ← Bloque A backend
       │                          │
       │                          ├──> [T-06 phoneHashLookup]
       │                          │              │
       │                          │              └──> [T-07 router 4 endpoints]
       │                          │
       └──> [T-08 leads extension]

[T-07 backend listo]
       │
       └──> [T-09 scaffold FE + service]              ← Bloque B frontend
                     │
                     ├──> [T-10 star-rating standalone]
                     ├──> [T-11 Identity + OrderHistory]
                     └──> [T-12 LeadCrm + SaveAsLeadDialog]
                                    │
                                    └──> [T-13 wire shell 009.5]     ← Bloque C integración
                                                  │
                                                  ├──> [T-14 E2E #1 + #2]    ← Bloque D acceptance
                                                  └──> [T-15 E2E #3 + #4]
                                                                │
                                                                └──> [T-16 CONTRACT close]
```

## Risk Mitigation Traceability

| Riesgo | Mitigación spec.md / plan.md | Tareas que la implementan |
|--------|------------------------------|---------------------------|
| **R-01** Shape `leads` distinto al esperado (campos `phone`, `source`, `stage`) | Auditoría real de la colección + extensión aditiva nullable (sin asumir shape) | **T-01** (audit CRM con dump real) → **T-08** (extensión aditiva backward-compatible) → **T-05** (contract test verifica que Lead pre-existente sin campos nuevos no rompe) |
| **R-02** `cliente.numero_celular_whatsapp` no normalizado en `orders` legacy | Reverse-lookup dual `whatsapp_usage` + `whatsapp_inbound` + normalización runtime con default `+57` | **T-02** (audit shape orders + % legacy) → **T-06** (service `phoneHashLookup` dual + normalización) → **T-15** (E2E ver pedidos con dataset mixto legacy/normalizado) |
| **R-03** Carga del panel ralentiza detalle del hilo (p95 >500ms) | Queries paralelas con `Promise.all`, índice compuesto Firestore, snapshot único al abrir hilo (sin polling) | **T-03** (índice compuesto READY) → **T-13** (Promise.all de los 3 fetchs + medición Performance API en demo) → **T-14** (assert p95 ≤500ms en E2E) |
| **R-04** Cross-tenant leak por timing attack (200 vs 404) | Padding ≥50ms en 404, multi-tenant strict server-side desde JWT | **T-06** (helper `padding50ms`) → **T-07** (router aplica padding) → **T-05** (test cross-tenant 404 con assert latencia ≥50ms) |
| **R-05** Click-flood en estrellas genera N actividades CRM | Debounce 250ms front + coalesce backend `score_changed` ≤30s mismo userId | **T-10** (debounce 250ms RxJS) → **T-07** (coalesce backend) → **T-14** (E2E re-click <30s asserta 1 sola activity) |

## Definition of Done (sub-spec 009.5.1)

La sub-spec se considera **done** cuando se cumplen TODAS las siguientes condiciones, en este orden:

1. **Pre-flight cerrado**: T-01..T-04 mergeadas; `findings.md` extendido con shape real de `leads` y `orders`; índice Firestore `READY`; colección `whatsapp_contact_ratings` con TTL activa.
2. **Backend en verde**: T-05..T-08 mergeadas; los ≥28 contract tests pasan en CI; smoke multi-tenant manual con curl confirma 404 en cross-tenant para los 4 endpoints; grep `phoneE164` plaintext en logs/responses = 0 hits (Art XI gate); enum `whatsapp_access_audit.action` extendido.
3. **Frontend en verde**: T-09..T-12 mergeadas; grep `HttpClient` en módulo lazy = 0 hits (Art IX gate); grep `linear-gradient` en SCSS del módulo = 0 hits; axe-core sin violaciones WCAG AA en los 5 componentes; sin imports de tipos de proveedor (`Kapso*`, Art VI gate).
4. **Integración con shell 009.5**: T-13 mergeada; panel monta en `WhatsappThreadDetailComponent`; gating por flag heredado verificado (apagado → no renderiza, R-09.5.1-10); responsive validado en 3 breakpoints; p95 render ≤500ms confirmado con Performance API.
5. **Acceptance E2E**: T-14 y T-15 verdes en CI; los 4 escenarios E2E del plan §6 Fase E pasan; screenshots almacenados en `/tmp/katuq-shots/` y enlazados desde `findings.md`.
6. **Constitución y métricas**: ningún PR violó los gates §7 del plan (Art IX/VIII/XI/VI/XIII + multi-tenant); 4 métricas (`panel_render_ms_p95`, `save_as_lead_count`, `rate_contact_count`, `409_duplicate_lead_count`) instrumentadas y visibles en dashboard.
7. **CONTRACT.md cerrado**: T-16 mergeada; sub-spec marcada `done`; decisiones nuevas (si las hubo) registradas como D-054..D-0XX; canary OH MY STORE activado por 1 semana antes de pasar a 3 tenants piloto (plan §9 rollout).
8. **Rollback verificado en stage**: apagar flag por tenant → panel deja de renderizar sin romper el shell 009.5; documento de runbook rollback enlazado en CONTRACT.md.

**Cualquier desvío de este DoD se registra como D-XXX en CONTRACT.md antes de marcar la sub-spec done** (Art I + ceremonia mínima SDD).
