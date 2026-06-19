# Findings 009.5 — WhatsApp Conversations Viewer

> Auditoría: qué existe, qué falta, dependencias duras.
> Fecha: 2026-06-17 · Autor: Daniel + Claude

## 1. Resumen ejecutivo

- 009.5 es un **consumidor read-only** de schemas que ya definen 009.2 (`whatsapp_usage`, TTL 365d) y 009.4 (`whatsapp_inbound`, TTL 90d).
- 009.5 NO crea colecciones nuevas de datos (solo `whatsapp_access_audit` para forensics).
- 009.5 SÍ crea: 4 endpoints backend, 1 servicio Angular, 1 módulo lazy con 3 componentes, 5 entradas de config (routes, nav, modules-catalog, notification.config, notification.types).
- **Bloqueantes duros**: (a) D-049 en CONTRACT.md confirmando el slot; (b) prerequisite en 009.2 (campo `recipientPhoneNormalized`); (c) composite indexes Firestore desplegados antes de la primera query.

## 2. Estado actual del frontend

### Módulos relevantes existentes

| Módulo / archivo | Estado | Observación |
|---|---|---|
| `src/app/components/notificaciones/notificaciones.module.ts` | existe | Lazy bajo `NotificacionesModule`; 009.5 monta `WhatsappInboxModule` como hijo lazy. |
| `src/app/components/notificaciones/notificaciones.component.ts:33` | existe | UI muestra columna WhatsApp marcada `whatsapp-disabled`; 009.5 NO toca este componente. |
| `src/app/shared/services/notifications/notification.config.ts` | existe (sin endpoints WhatsApp) | 009.5 agrega 4 claves: `whatsappThreads`, `whatsappThreadMessages`, `whatsappThreadViewed`, `whatsappThreadMedia`. |
| `src/app/shared/services/notifications/notification.types.ts:67` | existe | enum `NotificationChannel` (009.1 agregó `WHATSAPP`). 009.5 agrega: `WhatsappThread`, `WhatsappMessage`, `WhatsappMessageMediaRef`, `WhatsappMessageDirection`, `WhatsappMessageStatus`, `ThreadsPage`, `MessagesPage`. |
| `src/app/shared/services/base.service.ts` | existe | Clase base obligatoria; `WhatsappInboxService extends BaseService`. NUNCA `HttpClient` directo (Art IX + feedback_no_httpclient_in_lazy_modules.md). |
| `src/app/shared/services/nav.service.ts` | existe | 009.5 agrega MENUITEM bajo `headTitle1: Gestión Comercial`: `{ path: /notificaciones/whatsapp/inbox, title: Conversaciones WhatsApp, type: link, icon: message-circle }`. |
| `src/app/shared/data/modules-catalog.ts` | existe | 009.5 agrega módulo `whatsapp_conversations` con `actions: [view, markRead]`. |
| `src/app/app-routing.module.ts` | existe | 009.5 registra ruta lazy `/notificaciones/whatsapp/inbox` y `/notificaciones/whatsapp/inbox/:phoneHash` con `AuthGuard`. |

### Componentes a crear

| Archivo | LOC est. | Responsabilidad |
|---|---|---|
| `whatsapp-inbox.module.ts` | 25 | Lazy module + routing child. |
| `whatsapp-inbox-shell.component.{ts,html,scss}` | 80+40+60 | Layout Master-Detail con `BreakpointObserver` (CDK). |
| `thread-list/whatsapp-thread-list.component.{ts,html,scss}` | 150+90+70 | Search debounced, filtro binario, paginación cursor, polling 30s con Page Visibility. |
| `thread-detail/whatsapp-thread-detail.component.{ts,html,scss}` | 140+80+80 | Render burbujas, polling 15s, marcar leído, descarga media diferida. |
| `empty-state/whatsapp-thread-empty-state.component.ts` | 25 | Empty state desktop sin selección. |
| `whatsapp-inbox.service.ts` | 120 | `extends BaseService`: `getThreads`, `getMessages`, `markThreadViewed`, `getMediaUrl`. |
| Updates a `notification.types.ts` | +60 | Tipos nuevos del viewer. |
| Updates a `notification.config.ts` | +12 | 4 endpoints declarados. |
| Updates a `nav.service.ts` | +6 | MENUITEM nuevo. |
| Updates a `modules-catalog.ts` | +10 | Módulo `whatsapp_conversations`. |
| Updates a `app-routing.module.ts` | +8 | Ruta lazy con guard. |
| **Total frontend nuevo** | **~1064 LOC** | |

### Patrones a respetar

- Bootstrap 5 grid + `table table-striped table-hover align-middle` (NO `p-datatable`).
- CSS custom properties + `border-left: 4px` en KPI cards (patrón `cotizaciones-lista.component.scss`).
- `BreakpointObserver` de `@angular/cdk/layout` para Master-Detail responsivo.
- `app-feather-icons` para `message-circle`, `search`, `check`, `check-check`.
- `debounceTime(350)` + `distinctUntilChanged` en search.

## 3. Estado actual del backend

### Routers / archivos relevantes

| Archivo | Estado | Observación |
|---|---|---|
| `routers/whatsappConversations.js` | **NO existe** | 009.5 lo crea con los 4 endpoints. |
| `index.js` | existe | Agregar `app.use('/v1/whatsapp', require('./routers/whatsappConversations'))`. |
| `middleware/auth.js` | existe | Reutilizar; valida JWT y setea `req.user.company`. |
| `services/whatsappUsageService.js` | existe (009.2) | 009.5 lo importa SOLO para lectura. |
| `services/whatsappInboundService.js` | existe (009.4) | 009.5 escribe `viewedByCompanyAt` (único side-effect). |
| `firestore.indexes.json` | existe | 009.5 agrega 3 composite indexes nuevos. |

### Endpoints a crear

| Endpoint | Method | LOC est. | Notas |
|---|---|---|---|
| `/v1/whatsapp/threads` | GET | 180 | Agregación server-side, JOIN `clientes` por `company`, paginación cursor, flag `inboundTruncatedAt90d`. |
| `/v1/whatsapp/threads/:phoneHash/messages` | GET | 140 | UNION usage+inbound, validación hash↔company → 404. |
| `/v1/whatsapp/threads/:phoneHash/viewed` | PATCH | 70 | Idempotente, escribe `viewedByCompanyAt`, RBAC `markRead`, audit row. |
| `/v1/whatsapp/threads/:phoneHash/messages/:messageId/media` | GET | 110 | Lazy descarga a Firebase Storage, regenera URL si Meta TTL ≤5min, valida `(company, phoneHash, messageId)` en una sola query. |
| Helper `phoneHash.js` (SHA-256 con `companyId` salt) | — | 30 | Util reutilizable. |
| Helper `rateLimiter.js` (sliding window) | — | 60 | Listado 10/min, detalle 20/min, media 5/min. |
| Migración `firestore.indexes.json` | — | +30 | Composite indexes. |
| Tests (jest) | — | 200 | Cross-tenant 404, hash determinismo, RBAC PATCH, idempotencia, rate-limit. |
| **Total backend nuevo** | | **~820 LOC** | |

### Patrón a seguir

- Strategy implícita: el componente Angular NO conoce Kapso; el mapper Kapso→`WhatsappMessage` vive en `routers/whatsappConversations.js` (Art VI no-acoplamiento-proveedor).
- Logs estructurados con `correlationId`, NUNCA teléfono en plaintext (`maskPhone` util obligatorio).
- Multi-tenant strict: filtro `company` desde `req.user.company`, jamás `req.query.company` salvo superadmin con scope explícito.

## 4. Schema esperado de las colecciones leídas

### `whatsapp_inbound` (definido por 009.4)

```
{
  company: string,                       // tenant ID
  recipientPhoneNormalized: string,      // E.164 sin "+"
  recipientPhoneMasked: string,          // "+57***1234"
  receivedAt: Timestamp,
  messageType: "text" | "image" | "audio" | "document" | "sticker"
             | "location" | "contacts" | "interactive" | "button" | "reaction",
  textBody: string | null,
  mediaRef: { kapsoMediaId: string, storageUrl?: string, mimeType?: string, sizeBytes?: number } | null,
  kapsoMessageId: string,                // wamid, idempotency
  profileName: string | null,
  viewedByCompanyAt: Timestamp | null,   // escrito por 009.5 PATCH /viewed
  ttlAt: Timestamp                       // 90 días desde receivedAt
}
```

### `whatsapp_usage` (definido por 009.2)

```
{
  company: string,
  recipientPhoneNormalized: string,      // *** PREREQUISITE 009.5: agregar este campo ***
  recipientPhoneMasked: string,          // "+57***1234"
  sentAt: Timestamp,
  templateName: string,                  // HSM template aprobado
  type: NotificationType,                // ORDER_CREATED, PAYMENT_APPROVED, ...
  status: "sent" | "delivered" | "read" | "failed",
  kapsoMessageId: string,
  costoCOP: number,
  ttlAt: Timestamp                       // 1 año (D-047)
}
```

### `whatsapp_access_audit` (nueva en 009.5)

```
{
  userId: string,
  userRole: string,
  company: string,
  phoneHash: string,
  action: "VIEW_THREAD" | "MARK_READ" | "DOWNLOAD_MEDIA",
  messageRange?: { from: Timestamp, to: Timestamp },
  timestamp: Timestamp,
  ipAddress: string,
  userAgent: string,
  ttlAt: Timestamp                       // timestamp + 90 días — campo OBLIGATORIO para Firestore TTL Policy
}
```

**TTL enforcement** (responsabilidad de T-09):
- Habilitar **Firestore TTL Policy** sobre la colección `whatsapp_access_audit` con campo `ttlAt`. Es la opción nativa, sin cron custom ni Cloud Function adicional.
- Configuración: consola Firebase → Firestore → TTL → Add policy → collection group `whatsapp_access_audit`, field `ttlAt`.
- Estado esperado: `Active` en staging y prod antes de pasar T-09 a `done`.
- Política idempotente: si la Policy ya existe, no se duplica. NO usar `Set-If-Missing` desde código del backend (consola es la fuente de verdad).
- Verificación: insertar row con `ttlAt = now() - 1d` en staging → debe eliminarse dentro de 24h (Firestore TTL granularidad ~24h).

## 5. Composite indexes Firestore obligatorios (Phase 0)

```
whatsapp_usage:    (company asc, recipientPhoneNormalized asc, sentAt desc)
whatsapp_inbound:  (company asc, recipientPhoneNormalized asc, receivedAt desc)
whatsapp_inbound:  (company asc, recipientPhoneNormalized asc, viewedByCompanyAt asc)
clientes:          (company asc, numero_celular_whatsapp asc)
```

Deploy con `firebase deploy --only firestore:indexes` ANTES de habilitar el módulo en frontend.

## 6. Dependencias externas

| Dependencia | Tipo | Estado | Bloqueante |
|---|---|---|---|
| Spec 009.1 (sender) | Spec hermana | approved-pending-validation | No bloquea diseño, sí producción de datos |
| Spec 009.2 (usage tracking) — prerequisite `recipientPhoneNormalized` | Spec hermana | pendiente | **SÍ bloqueante de implementación** |
| Spec 009.4 (inbound autoresponder) | Spec hermana | approved-pending-validation | Bloqueante para tener inbound data |
| D-049 en CONTRACT.md (renumeración slot) | Decisión SDD | pendiente | **SÍ bloqueante de aprobación spec** |
| Composite indexes Firestore | Infra | pendiente | Bloqueante de primera query |
| Feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` (owner: backend Katuq, dark-launch 2026-06-20→24, canary 25→26, GA 2026-06-27, retirement 2026-08-26) | Operativa | a crear | NO bloquea; permite kill-switch |
| Feedback docs (`feedback_no_httpclient_in_lazy_modules.md`, `feedback_no_cache.md`, `feedback_server_side_calcs.md`) | Docs constraints | viven en `~/.claude/.../memory/` (memoria persistente de Claude Code), indexados en `MEMORY.md`. NO hay archivo físico en `docs/feedback/` del repo y NO se va a crear (Art XIII: no inflar docs del proyecto con copias de memoria de agente) | NO bloquea; se citan inline en task descriptions y en review de PR. |
| Firebase Storage bucket `whatsapp-media/{company}/...` | Infra | a crear | Bloqueante de endpoint media |
| Angular CDK `@angular/cdk/layout` (BreakpointObserver) | Lib | ya en package.json | No |
| `feather-icons` (`message-circle`, `check`, `check-check`) | Lib | ya en uso | No |

## 7. Riesgos heredados de discovery (resumen)

- R-01 (slot collision) → resolver con D-049 antes de plan.md.
- R-02 (TTL asymmetry 90d/365d) → banner UI + flag server-side.
- R-03 (`recipientPhoneNormalized` no existe en 009.2) → bloquear implementación hasta que 009.2 lo agregue + backfill.
- R-04 (costo Firestore por agregación) → composite indexes Phase 0 + cursor pagination + polling no `onSnapshot`.
- R-05 (acoplamiento Kapso) → mapper en backend, modelos abstractos en frontend.
- R-06 (privacidad teléfono) → `phoneHash` opaco + máscara + audit log.
- R-07 (HttpClient directo en lazy module) → test unitario + PR checklist + linter (si disponible).

## 8. Preguntas abiertas (eco de §8 del spec)

- Salt rotación para phoneHash (default `companyId` sin rotación).
- Rate-limit por IP vs por usuario en detalle (default por usuario).
- Retención `whatsapp_access_audit` (default 90 días).
- Roles default con `view` (default admin + customer-service; vendedor NO).
- D-049 (renumeración slot 009.5/009.6/009.7) — checkpoint humano con Daniel.

## 9. Conclusión

009.5 es viable como sub-spec read-only **siempre que**:
1. Daniel ratifique el slot vía D-049.
2. 009.2 agregue `recipientPhoneNormalized` antes de iniciar implementación.
3. Composite indexes Firestore se desplieguen en Phase 0 del plan.

Sin esas 3 piezas, plan.md no debe abrirse.
