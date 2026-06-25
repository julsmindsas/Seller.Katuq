# Plan 009.5.1 — WhatsApp Contact Profile Panel

> Estado: **draft** | Vinculado a `spec.md` (debe estar `approved`).
> Padre: [[009.5-whatsapp-conversations-viewer]] | Decisiones fijas: D-050..D-053.
> Última actualización: 2026-06-17

## 1. Resumen técnico

Componente Angular standalone `WhatsappContactPanelComponent` dentro del módulo lazy de 009.5, renderizado como columna lateral del detalle del hilo, con 3 sub-componentes (Identity, OrderHistory, LeadCrm). Consume 4 endpoints nuevos servidos por un controller backend `whatsappContactProfile.js` que actúa como bridge ante el CRM existente (reusa `LeadImportService` + `crm_activities` sin duplicar lógica). Frontend usa exclusivamente `WhatsappContactPanelService extends BaseService` (Art IX). Historial de pedidos lee `orders` con índice compuesto obligatorio. Rating staged en colección nueva `whatsapp_contact_ratings` (TTL 30d, D-053), migrable a `lead.score` al crear Lead. Multi-tenant strict server-side con padding anti-timing en 404. Sin flag nuevo: hereda `WHATSAPP_INBOX_VIEWER_ENABLED`.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec.md con 15 EARS aprobado antes del plan. |
| II — Spec captura intent | sí | EARS describen UX sin código. |
| IV — Idempotencia | sí | PATCH rating idempotente; POST save-as-lead duplicado → 409 con leadId existente. |
| V — Eventos crudos antes de procesar | n/a | No hay webhook; reusa `whatsapp_inbound` de 009.5. |
| VI — UI no acoplada a proveedor | sí | Modelo abstracto `WhatsappContactProfile`; `profilePictureUrl` opcional con fallback. |
| VII — Observabilidad | sí | `whatsapp_access_audit` extendido + correlationId estructurado. |
| VIII — Test-first contratos | sí | Fase B exige contract tests antes de implementación. |
| IX — Estilo Angular | sí | Service extiende `BaseService`. Refactor `CrmService` queda out-of-scope (§10). |
| X — Seguridad webhooks | n/a | Sin webhooks. |
| XI — Datos sensibles fuera del log | sí | `phoneE164` nunca al FE; máscara `+57***1234`; audit guarda `phoneHash`. |
| XIII — Specs ≤3 páginas | sí | spec.md 103 líneas; plan.md ≤180 líneas. |
| XV v2 — Canónica integraciones | n/a | Sin nuevas integraciones de proveedor. |

## 3. Stack

- **Frontend**: Angular 14 + TypeScript + SCSS + PrimeNG 14 (`p-dialog`, `p-accordion`). Sin gradientes; cards planos con `border-left 4px`.
- **Backend**: Node.js Express (repo `katuq_admin_back_firebase`). Router `routers/whatsappContactProfile.js` + service `services/whatsappPhoneHashLookup.js`. Reusa middleware `authJwt` y `LeadImportService`.
- **Persistencia**: Firestore — `orders` (read), `leads` (extend aditivo + read/write), `crm_activities` (write), `whatsapp_contact_ratings` (NUEVA), `whatsapp_access_audit` (write), `whatsapp_usage` + `whatsapp_inbound` (read reverse-lookup).

## 4. Arquitectura

**Frontend** (lazy en `notificaciones/whatsapp-inbox/whatsapp-contact-panel/`):
- `WhatsappContactPanelComponent` orquestador con `p-accordion`; inputs `phoneHash`, `clienteNombre`, `profileName`.
- 3 sub-componentes: `IdentitySectionComponent` (avatar 64px o iniciales, máscara teléfono, badge cliente), `OrderHistorySectionComponent` (≤10 pedidos + link `/ventas/detalle/:nroPedido`), `LeadCrmSectionComponent` (Lead o ratingDraft + estrellas).
- `SaveAsLeadDialogComponent` (PrimeNG `p-dialog` + form reactivo).
- `KatuqStarRatingComponent` standalone en `shared/components/star-rating/`: ARIA `role="radiogroup"`, tap-target ≥44px, debounce 250ms, keyboard nav.
- `WhatsappContactPanelService extends BaseService` — 4 métodos: `getProfile/getOrders/saveAsLead/rateContact`. Endpoints en `notification.config.ts`.

**Backend**:
- `routers/whatsappContactProfile.js` — 4 endpoints (ver §5) con padding 50ms en 404.
- `services/whatsappPhoneHashLookup.js` — lookup `phoneHash`→`phoneE164` consultando `whatsapp_usage` Y `whatsapp_inbound` (R-09.5.1-02).
- Bridge interno: reusa `LeadImportService.importLead()` y `POST /v1/crm/leads/:id/activities`.

**Decisiones técnicas trazadas**: bridge backend ante CRM (no FE→CRM directo, evita fuga teléfono); staging en colección nueva (no Lead fantasma); extensión aditiva nullable (no colección `lead_scores` separada); padding 50ms en 404 (anti-timing R-09.5.1-08); reverse-lookup dual (R-09.5.1-02); coalesce activity score_changed ≤30s (R-09.5.1-04).

## 5. Contratos

**GET `/v1/whatsapp/contacts/:phoneHash/profile?company=X`** — Auth: JWT + `whatsapp_conversations.view` + flag. `company` server-side desde JWT.
Response 200: `{ phoneHash, customerPhoneMaskedDisplay, clienteNombre|null, profileName|null, profilePictureUrl|null, isClienteRegistrado, lead:{leadId,name,stage,ownerName,ownerUserId,score,scoreUpdatedAt,scoreUpdatedBy:{userId,userName,role},isDraft:false}|null, ratingDraft:{score,scoreUpdatedAt,scoreUpdatedBy,isDraft:true}|null, flags:{hasLead,hasRatingStaged} }`. 404 padding 50ms si phoneHash↔company mismatch.

**GET `/v1/whatsapp/contacts/:phoneHash/orders?company=X&pageSize=10&cursor=Y`** — Auth: JWT + `whatsapp_conversations.view` + `ventas.read`. Default 10, **max 10** (alineado con AC-009.5.1-04 spec; paginación inline >10 queda out-of-scope, deep-link a `/ventas/list?phone=...`).
Response 200: `{ orders:[{orderId,nroPedido,fechaCreacion,estadoProceso,estadoPago,totalPedido,currency,deepLink}], totalCount, hasMore, nextCursor|null }`. Audit `view_contact_orders`.

**POST `/v1/whatsapp/contacts/:phoneHash/save-as-lead?company=X`** — Auth: JWT + `crm.leads.create`. Rate-limit 10/min/user.
Body: `{ name:string(2-120,required), priority?:'alta|media|baja', notes?:string(≤500) }`.
Response 201: `{ leadId, status:'created', lead }`. Response 409: `{ leadId, status:'existing', lead:{name,stage,ownerName,activo} }` (R-09.5.1-03). Side-effects: crea `CrmActivity` type `whatsapp` + metadata `{phoneHash, source:'whatsapp-thread-panel'}`; migra rating desde staging (`lead.score=rating.score`, `migratedToLeadId`, `migratedAt`); audit `save_as_lead`.

**PATCH `/v1/whatsapp/contacts/:phoneHash/rating?company=X`** — Auth: JWT + `whatsapp_conversations.markRead` + (si target=lead) `crm.leads.write`. Rate-limit 30/min/user.
Body: `{ score: 1|2|3|4|5|null, reason?:string(≤200) }`.
Response 200: `{ target:'lead|staging', score, leadId|null, alreadyApplied:boolean }`.
Lógica: si `hasLead` → escribe `lead.score/scoreUpdatedAt/scoreUpdatedBy` + `CrmActivity` type `score_changed` (coalesce ≤30s mismo userId). Si NO `hasLead` → upsert `whatsapp_contact_ratings/{company}_{phoneHash}` con `ttlAt=now+30d`. Idempotente: si `previousScore===newScore` → `alreadyApplied:true` sin escribir.

**Errores**: 400 body inválido | 401 JWT | 403 permiso/flag off | 404 mismatch (padding 50ms) | 409 dup save-as-lead | 429 rate-limit | 5xx `{error,correlationId}`.

## 6. Fases de implementación

**Fase A — Pre-flight**: auditar `CrmService`/`CrmLead` reales; auditar shape `orders.cliente.numero_celular_whatsapp` en legacy (resolver normalización E.164); decidir TTL nativo Firestore vs Cloud Function para `whatsapp_contact_ratings`; declarar y desplegar índice compuesto `orders` (company ASC + numero_celular_whatsapp ASC + fechaCreacion DESC) en `firestore.indexes.json`. **Gate**: índice activo + decisiones en CONTRACT.md.

**Fase B — Backend**: crear colección `whatsapp_contact_ratings` + TTL policy; extensión aditiva `leads` (`score/scoreUpdatedAt/scoreUpdatedBy/scoreSource` nullable, sin backfill); contract tests para 4 endpoints (happy + 401 + 403 + 404 cross-tenant + 409 + 429 + body inválido) ANTES de implementar; implementar `whatsappPhoneHashLookup.js` (usage + inbound); implementar `routers/whatsappContactProfile.js` con padding 50ms; extender enum `whatsapp_access_audit.action`; smoke multi-tenant (user A vs phoneHash B → 404 en los 4).

**Fase C — Frontend**: `WhatsappContactPanelService extends BaseService`; endpoints en `notification.config.ts`; `KatuqStarRatingComponent` (ARIA + debounce 250ms + keyboard); `IdentitySection`, `OrderHistorySection`, `LeadCrmSection`; `SaveAsLeadDialogComponent`; `WhatsappContactPanelComponent` orquestador.

**Fase D — Integración con shell 009.5**: renderizar panel al lado del detalle en `WhatsappThreadDetailComponent`; responsive (lateral ≥1280, tab 768-1279, sheet <768); gating por flag heredado (componente `null` en `ngOnInit` si off, R-09.5.1-10); wire navegación detalle/lista pedidos/lead con fallback 409.

**Fase E — Acceptance E2E** (4 tests obligatorios):
1. **Abrir panel**: contacto con Lead + pedidos → 3 secciones renderizan correcto.
2. **Calificar**: contacto SIN Lead → rating en `whatsapp_contact_ratings`; con Lead → rating en `lead.score`.
3. **Ver pedidos**: 10 pedidos ordenados desc; click navega a `/ventas/detalle/:nroPedido`.
4. **Guardar como Lead**: crea Lead + migra rating staged + 409 muestra `Ver lead existente`.

## 7. Gates contra constitución

- **Art IX**: PR rechazada si nuevo componente importa `HttpClient` directo (lint + grep).
- **Art VIII**: PR rechazada si Fase C arranca sin contract tests verdes en Fase B.
- **Art XI**: PR rechazada si log/response expone `phoneE164` plaintext (grep + asserts).
- **Art VI**: PR rechazada si FE importa tipos `Kapso*` o asume shape de proveedor.
- **Art XIII**: PR rechazada si spec/plan exceden 180 líneas.
- **Multi-tenant**: PR rechazada si algún endpoint acepta `company` desde body/query; test cross-tenant obligatorio.

## 8. Open questions (técnicas)

| ID | Pregunta | Default |
|---|---|---|
| OQ-1 | TTL nativo Firestore para `whatsapp_contact_ratings`, confiable? | Sí TTL nativo; Cloud Function de alerta 7d antes queda en 009.5.2. |
| OQ-2 | Normalización E.164 en runtime para `orders` legacy sin prefijo? | Sí, default `+57` (Colombia) en lookup si doc no tiene prefijo; documentar en CONTRACT.md. |
| OQ-3 | Rate-limit por usuario o por (usuario, phoneHash)? | Por usuario global (10/min save, 30/min rating). Granular en 009.5.2 si hay abuso. |
| OQ-4 | Cursor de paginación `GET orders`: `lastDocId` o offset? | `lastDocId` (cursor Firestore real, evita scan creciente). |
| OQ-5 | `profilePictureUrl`: cacheable en CDN/proxy o URL directa? | URL directa de Kapso con fallback iniciales si falla CORS; proxy backend evaluado en sub-spec futura. |

## 9. Plan de rollout

- **Feature flag**: hereda `WHATSAPP_INBOX_VIEWER_ENABLED` de 009.5. **NO se crea flag nuevo** (el panel es parte natural del viewer 009.5).
- **Dueño**: equipo Notificaciones (heredado). **Retiro**: cuando 009.5 retire el flag (ambos juntos).
- **Canary**: tenant interno OH MY STORE 1 sem → 3 tenants piloto 1 sem → 100% companies con flag activo.
- **Rollback**: (a) apagar flag por tenant → panel deja de renderizar; (b) datos en `whatsapp_contact_ratings` se auto-purgan vía TTL 30d; (c) campos `lead.score/*` quedan nullable backward-compatible. Sin migración inversa requerida.

## 10. Out of scope del plan

Refactor `CrmService` a `BaseService` (deuda Art IX, fuera de alcance) | auto-scoring KAI/ML (009.5.2 con `scoreSource='auto'`) | paginación >10 pedidos inline (link a `/ventas/list`) | editar Lead (name/email/stage/owner) desde panel | crear pedidos (D-052) | 1 phone → múltiples Leads | backfill masivo `lead.score` | notificaciones push al rating | sync rating/Lead a Kapso/Meta/Shopify/WO/Siigo | export PDF/CSV | asignar owner desde panel | timeline activities del Lead inline | reasignar phone a otro Lead | rating por mensaje individual | reason obligatorio al cambiar score | conversión automática Lead→Cliente | cache extra FE/BE (feedback_no_cache).
