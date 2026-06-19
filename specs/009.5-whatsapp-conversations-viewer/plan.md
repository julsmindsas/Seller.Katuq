# Plan 009.5 — WhatsApp Conversations Viewer (READ-ONLY)

> Estado: **draft** | in-review | approved | superseded
> Vinculado a `spec.md` (debe estar `approved`).
> Última actualización: 2026-06-17
> Spec padre: [[009-whatsapp-kapso-notifications-marco]]
>
> ⚠️ **GATES BLOQUEANTES antes de pasar este plan a `approved`**:
> 1. D-049 registrada en `CONTRACT.md` (renumeración 009.5 viewer / 009.6 pasarela pago / 009.7 display name).
> 2. 009.2 (`whatsapp-usage-tracking`) confirmó que persiste `recipientPhoneNormalized` y ejecutó backfill histórico.
> 3. Composite indexes Firestore declarados en `firestore.indexes.json` (ver §4.3).

---

## 1. Resumen técnico

Se construye un módulo Angular lazy-loaded **`WhatsappInboxModule`** bajo `/notificaciones/whatsapp/inbox` (shell Master-Detail responsivo vía `BreakpointObserver`) que consume **cuatro endpoints nuevos** del backend Express (`routers/whatsappConversations.js`): listado de hilos (`GET /v1/whatsapp/threads`), detalle (`GET /threads/:phoneHash/messages`), marcar leído (`PATCH /threads/:phoneHash/viewed`) y descarga diferida de media (`GET /threads/:phoneHash/messages/:messageId/media`). El backend agrega `whatsapp_usage` (009.2) + `whatsapp_inbound` (009.4) agrupando por `(company, recipientPhoneNormalized)` con composite indexes Firestore, hace JOIN con `clientes` para enriquecer con `clienteNombre`, y devuelve modelos abstractos (no shapes de Kapso) identificando cada hilo con `phoneHash = SHA-256(phoneE164 || '|' || companyId)` — el teléfono completo nunca cruza al frontend. Polling 30s/15s con Page Visibility API (NUNCA `onSnapshot`). Único side-effect Katuq-side: escribir `viewedByCompanyAt` en `whatsapp_inbound`.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | `spec.md` con 17 AC EARS aprobada antes de redactar este plan. |
| II — Spec captura intent | sí | NFRs de seguridad, accesibilidad, performance y observabilidad explícitos en spec §5. |
| IV — Idempotencia | sí | `PATCH /viewed` idempotente (solo escribe `viewedByCompanyAt` donde NO exista). `GET` puros. Polling con jitter ±5s. |
| V — Eventos crudos antes de procesar | sí | Los mensajes ya viven crudos en `whatsapp_inbound`/`whatsapp_usage` (responsabilidad de 009.2/009.4). 009.5 solo lee y proyecta. |
| VI — UI no acoplada a proveedor | sí | Frontend consume modelos abstractos (`WhatsappThread`, `WhatsappMessage` con `direction/status/type` genéricos). Traducción Kapso→Katuq vive en backend mapper. |
| VII — Observabilidad | sí | Logs estructurados con `correlationId`, métricas por endpoint, `whatsapp_access_audit` con retención 90d, alerta a ops si >10 404s/h misma IP. |
| VIII — Test-first contratos | sí | Fase A arranca con contract tests (Jest + supertest) sobre los 4 endpoints ANTES de implementarlos. Schemas en `contracts/`. |
| IX — Estilo Angular | sí | `WhatsappInboxService extends BaseService`; NUNCA `HttpClient` directo. Endpoints en `notification.config.ts`. Modelos en `notification.types.ts`. Lazy-loaded bajo `NotificacionesModule`. |
| X — Seguridad webhooks | N/A | 009.5 no recibe webhooks (read-only del comercio). `PATCH /viewed` solo escribe campo Katuq-side, NO emite webhook saliente. |
| XI — Datos sensibles fuera del log | sí | Logs solo `phoneHash` o máscara `+57***1234`. Regla "ningún log contiene `+57[0-9]{10}`" verificada en code review + grep semanal. `phoneE164` nunca al frontend. |
| XII — Accesibilidad (WCAG AA) | sí | AC-009.5-17 + NFR §5.4: contraste ≥4.5:1 en burbujas y badges, focus ring visible (≥3px), navegación por teclado completa (Tab/Shift+Tab/Enter/Esc), ARIA roles (`complementary`, `main`, `aria-live="polite"` en banner TTL). Verificación: scan Axe-core automático en T-19 (E2E) + verificación manual con NVDA en una sesión. 0 issues de severity `serious`/`critical` antes de aprobar T-19. |

Cualquier "no" requiere enmienda explícita en `CONTRACT.md`.

## 3. Arquitectura

### 3.1 Componentes involucrados

**Frontend (Angular 14):**
- `src/app/components/notificaciones/whatsapp-inbox/whatsapp-inbox.module.ts` — módulo lazy.
- `whatsapp-inbox-shell.component.ts` — layout Master-Detail responsivo (`BreakpointObserver`).
- `whatsapp-thread-list.component.ts` — sidebar (320-360px), KPI cards (border-left 4px, sin gradientes), search con `debounceTime(350) + distinctUntilChanged`, filtro binario "Solo con respuesta entrante", tabla nativa (NO `p-datatable`), paginación cursor-based, banner asimetría TTL.
- `whatsapp-thread-detail.component.ts` — vista chat-like, burbujas direccionales, badges status, placeholders de media, botón "Marcar leído". Sin input de respuesta.
- `whatsapp-thread-empty-state.component.ts` — vista por defecto en desktop.
- `src/app/shared/services/notifications/whatsapp-inbox.service.ts` — `extends BaseService`.
- `src/app/shared/services/notifications/notification.config.ts` — endpoints centralizados.
- `src/app/shared/services/notifications/notification.types.ts` — `WhatsappThread`, `WhatsappMessage`, etc.
- `nav.service.ts` — item bajo "Gestión Comercial".
- `modules-catalog.ts` — módulo `whatsapp_conversations` con actions `view` y `markRead`.
- `routes.ts` — ruta lazy con `AuthGuard`.

**Backend (Express, `katuq_admin_back_firebase/functions/`):**
- `routers/whatsappConversations.js` — 4 endpoints nuevos.
- `services/whatsappThreadAggregator.js` — lógica de agregación `whatsapp_usage` + `whatsapp_inbound` + JOIN `clientes`.
- `services/whatsappPhoneHash.js` — `SHA-256(phoneE164 || '|' || companyId)`.
- `services/whatsappMediaProxy.js` — descarga diferida desde Kapso + cache en Firebase Storage.
- Middleware `authJwt` (existente) — inyecta `req.user.company`.

**Almacenamiento:**
- Firestore (read-only sobre `whatsapp_usage`, `whatsapp_inbound`, `clientes`).
- Firestore (write-only `viewedByCompanyAt` en `whatsapp_inbound`, audit en `whatsapp_access_audit`).
- Firebase Storage `whatsapp-media/{company}/{messageId}.{ext}` para cache de media.

**Cola/eventos:** N/A — 009.5 es read-pull, sin colas.

### 3.2 Diagrama (texto)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Frontend (Angular lazy module bajo /notificaciones/whatsapp/inbox)    │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐    │
│  │ ThreadListComponent  │  │ ThreadDetailComponent                │    │
│  │  - poll 30s (visible)│  │  - poll 15s (visible)                │    │
│  │  - search debounce   │  │  - burbujas direccionales            │    │
│  │  - paginación cursor │  │  - placeholder media + descarga      │    │
│  └──────────┬───────────┘  └──────────────┬───────────────────────┘    │
│             │                              │                            │
│             ▼                              ▼                            │
│        WhatsappInboxService extends BaseService                         │
│             │ (HttpInterceptor2 adjunta JWT + company)                  │
└─────────────┼──────────────────────────────────────────────────────────┘
              │ HTTPS
              ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Backend Express (katuq_admin_back_firebase/functions/)                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ middleware authJwt → req.user.company                            │  │
│  │ routers/whatsappConversations.js                                 │  │
│  │   GET    /v1/whatsapp/threads                                    │  │
│  │   GET    /v1/whatsapp/threads/:phoneHash/messages                │  │
│  │   PATCH  /v1/whatsapp/threads/:phoneHash/viewed                  │  │
│  │   GET    /v1/whatsapp/threads/:phoneHash/messages/:id/media      │  │
│  └─────────┬──────────────────────┬────────────────────┬───────────┘  │
│            │                      │                    │              │
│            ▼                      ▼                    ▼              │
│  whatsappThreadAggregator  whatsappPhoneHash  whatsappMediaProxy      │
│            │                                          │              │
└────────────┼──────────────────────────────────────────┼──────────────┘
             │ Firestore queries con composite index    │
             ▼                                          ▼
┌──────────────────────────────────────────┐  ┌─────────────────────────┐
│  Firestore                                │  │  Kapso /media/{id}/url  │
│   - whatsapp_usage (read, write none)     │  │  Firebase Storage cache │
│   - whatsapp_inbound (read + viewedAt)    │  └─────────────────────────┘
│   - clientes (read JOIN by phone)         │
│   - whatsapp_access_audit (write only)    │
└──────────────────────────────────────────┘
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Polling 30s/15s con Page Visibility API | AC-009.5-15, NFR 5.1, R-04 plan | `onSnapshot` global (lecturas proporcionales al volumen mensual — destruye costos a 50K msgs/mes); WebSocket (infra nueva sin justificación para read-only). |
| `phoneHash = SHA-256(phoneE164 \|\| '\|' \|\| companyId)` | AC-009.5-04, AC-009.5-12, NFR 5.2 | Teléfono plano en URL (fuga PII + permite enumeración cross-tenant); UUID por hilo (requiere mantener tabla extra, no determinístico). |
| Agregación server-side en `whatsappThreadAggregator` | AC-009.5-03, AC-009.5-05, feedback_server_side_calcs.md | GROUP BY en frontend (lecturas masivas); Cloud Function programada que materializa hilos (over-engineering para MVP). |
| `WhatsappInboxService extends BaseService` | AC Art IX, feedback_no_httpclient_in_lazy_modules.md | `HttpClient` directo (interceptor no adjunta JWT → 401 silencioso en módulo lazy). |
| Endpoints centralizados en `notification.config.ts` | Art IX, mantenibilidad | Hardcoded en componentes (acoplamiento UI↔URL). |
| Modelos abstractos `WhatsappMessage` en `notification.types.ts` | Art VI, R-05 plan | Devolver shape Kapso al frontend (acoplamiento a proveedor). |
| Composite indexes obligatorios deploy Phase 0 | NFR 5.1, R-04 plan | Crear índices "on-demand" (Firestore tarda min/horas en crearlos — primer release roto). |
| Cursor-based paginación (`lastDocId`) | NFR 5.1 | Offset paginación (Firestore no la soporta eficientemente). |
| Marcar leído como side-effect Katuq-side (NO sync Kapso/Meta) | AC-009.5-11, OOS spec §6 | Webhook "leído por agente" a Kapso (scope 009.6+). |
| Descarga de media diferida + cache en Firebase Storage | AC-009.5-10, NFR 5.5 | Render inline en burbuja (URL Meta expira ~5min, primer scroll roto). |
| Lookup webhook→company heredado de 009.4 | NFR 5.2 multi-tenant | Re-implementar lookup (duplicación). |
| Filtro `company` server-side desde JWT (NUNCA query param) | NFR 5.2, AC-009.5-03 | Aceptar `?company=X` (riesgo IDOR cross-tenant). |

## 4. Modelo de datos

> 009.5 NO crea colecciones nuevas para datos de mensajes — las hereda de 009.2 y 009.4. SÍ crea `whatsapp_access_audit` y SÍ requiere `viewedByCompanyAt` como campo opcional adicional en `whatsapp_inbound`.

### 4.1 Colecciones consumidas (READ-ONLY de schemas existentes)

| Colección | Owner | Campos usados | Notas |
|---|---|---|---|
| `whatsapp_usage` | 009.2 | `company`, `recipientPhoneNormalized` (**REQUIERE prerequisite 009.2**), `recipientPhoneMasked`, `sentAt`, `templateName`, `status`, `kapsoMessageId`, `costoCOP`, `textBody` | TTL 365d (D-047). Sin `recipientPhoneNormalized`, 009.5 no puede agrupar — bloqueante duro. |
| `whatsapp_inbound` | 009.4 | `company`, `recipientPhoneNormalized`, `receivedAt`, `messageType`, `textBody`, `mediaRef.kapsoMediaId`, `kapsoMessageId`, `profileName`, `viewedByCompanyAt` (009.5 lo escribe) | TTL 90d. Asimetría con `whatsapp_usage` genera banner R-02. |
| `clientes` | core | `company`, `numero_celular_whatsapp` (E.164), `nombre` | JOIN por teléfono normalizado para enriquecer `clienteNombre`. Filtrado por `company`. |

### 4.2 Colecciones nuevas (owner 009.5)

**`whatsapp_access_audit`** — retención 90d:
```ts
{
  userId: string,
  userEmail: string,
  role: string,
  company: string,         // tenant
  phoneHash: string,       // NUNCA phoneE164
  action: 'view_thread' | 'mark_read' | 'download_media' | 'list_threads',
  endpoint: string,        // path consumido
  ipAddress: string,
  userAgent: string,
  timestamp: Timestamp,
  correlationId: string,
}
```

### 4.3 Composite indexes Firestore (deploy Phase A, gate de implementación)

`firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "whatsapp_usage",
      "fields": [
        { "fieldPath": "company", "order": "ASCENDING" },
        { "fieldPath": "recipientPhoneNormalized", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "whatsapp_inbound",
      "fields": [
        { "fieldPath": "company", "order": "ASCENDING" },
        { "fieldPath": "recipientPhoneNormalized", "order": "ASCENDING" },
        { "fieldPath": "receivedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "whatsapp_inbound",
      "fields": [
        { "fieldPath": "company", "order": "ASCENDING" },
        { "fieldPath": "recipientPhoneNormalized", "order": "ASCENDING" },
        { "fieldPath": "viewedByCompanyAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## 5. Contratos (API/eventos)

### 5.1 `GET /v1/whatsapp/threads`

**Auth:** `AuthGuard` (JWT) + filtro server-side por `req.user.company`.

**Query params:**
| Param | Tipo | Default | Notas |
|---|---|---|---|
| `q` | string | — | Búsqueda por nombre cliente o teléfono normalizado. |
| `onlyWithReply` | boolean | false | Solo hilos con ≥1 doc en `whatsapp_inbound`. |
| `from` | YYYY-MM-DD | — | Inicio del rango. |
| `to` | YYYY-MM-DD | — | Fin del rango. |
| `cursor` | string | — | `lastDocId` de la página anterior. |
| `pageSize` | int | 20 | Max 50. |

**Response 200:**
```ts
{
  threads: Array<{
    phoneHash: string,                  // ID estable para el frontend
    customerPhoneMaskedDisplay: string, // "+57***1234"
    clienteNombre: string | null,       // de colección clientes (si match)
    profileName: string | null,         // de WhatsApp, mostrar con "no verificado" si NO hay clienteNombre
    lastMessageAt: ISO8601,
    lastDirection: 'in' | 'out',
    lastPreview: string,                // ≤80 chars, placeholder para media
    lastStatus: 'sent' | 'delivered' | 'read' | 'failed' | null, // solo si lastDirection='out'
    unreadCount: number,                // inbound sin viewedByCompanyAt
    messageCount: number,
  }>,
  pagination: {
    nextCursor: string | null,
    hasMore: boolean,
    pageSize: number,
  },
  flags: {
    inboundTruncatedAt90d: boolean,     // si el rango cruza la frontera TTL
  },
}
```

**Errores:** 401 (sin JWT), 403 (sin action `view`), 422 (params inválidos), 429 (rate-limit 10 req/min).

### 5.2 `GET /v1/whatsapp/threads/:phoneHash/messages`

**Auth:** JWT + verificación `phoneHash↔company` server-side; **404 si no pertenece** (no leakear existencia).

**Query params:**
| Param | Tipo | Default | Notas |
|---|---|---|---|
| `cursor` | string | — | Paginación descendente por timestamp. |
| `pageSize` | int | 50 | Max 100. |

**Response 200:**
```ts
{
  thread: {
    phoneHash: string,
    customerPhoneMaskedDisplay: string,
    clienteNombre: string | null,
    profileName: string | null,
  },
  messages: Array<{
    id: string,                         // doc id Firestore (estable)
    direction: 'in' | 'out',
    type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'button' | 'reaction' | 'template',
    body: string | null,                // textBody si type=text, null si media
    snippet: string,                    // ≤80 chars, placeholder para media
    sentAt: ISO8601,                    // `sentAt` (out) o `receivedAt` (in)
    status: 'sent' | 'delivered' | 'read' | 'failed' | null, // solo out
    mediaRef: { messageId: string, type: string, sizeBytes: number | null } | null,
    templateName: string | null,        // solo out cuando aplica
  }>,
  pagination: {
    nextCursor: string | null,
    hasMore: boolean,
  },
  flags: {
    inboundTruncatedAt90d: boolean,
  },
}
```

**Errores:** 401, 403, 404 (hash↔company mismatch o hash inexistente), 429.

### 5.3 `PATCH /v1/whatsapp/threads/:phoneHash/viewed`

**Auth:** JWT + action `markRead` + verificación `phoneHash↔company`.

**Body:** `{}` (sin payload).

**Response 200:** `{ updated: number, alreadyViewed: number }`

**Semántica:** Escribe `viewedByCompanyAt: Timestamp.now()` en TODOS los `whatsapp_inbound` del hilo que **NO lo tengan**. Idempotente: 2da llamada `updated=0, alreadyViewed=N`.

**Errores:** 401, 403, 404, 429 (5 req/min/usuario).

### 5.4 `GET /v1/whatsapp/threads/:phoneHash/messages/:messageId/media`

**Auth:** JWT + verificación `phoneHash↔company` + `messageId↔phoneHash`.

**Response:** 302 redirect a `mediaRef.storageUrl` (Firebase Storage). Si no cacheado, hace fetch a Kapso, sube a Storage, persiste `storageUrl` en `whatsapp_inbound`, luego redirige.

**Errores:** 401, 403, 404, 410 (URL Kapso/Meta caducada tras 1 retry), 429 (5 req/min/usuario).

### 5.5 Idempotencia

- **Clave**: `PATCH /viewed` — la idempotencia vive en el WHERE de la query (`viewedByCompanyAt == null`).
- **Ventana**: ilimitada (estado terminal).
- **Comportamiento ante duplicado**: 2da llamada cuenta `alreadyViewed`, no escribe.

### 5.6 Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | OK | payloads §5.1-§5.4 |
| 302 | media cacheada o cache-miss resuelto | Header `Location` |
| 400 | params inválidos (`from > to`, `pageSize > max`) | `{ error: 'invalid_query', detail: '...' }` |
| 401 | sin JWT o expirado | `{ error: 'unauthenticated' }` (interceptor → /login) |
| 403 | sin action `view`/`markRead` | `{ error: 'forbidden' }` |
| 404 | hash↔company mismatch o hash inexistente | `{ error: 'not_found' }` (sin distinguir cross-tenant) |
| 410 | URL Kapso/Meta caducada tras 1 retry | `{ error: 'media_expired' }` |
| 422 | semánticamente inválido (cursor corrupto) | `{ error: 'invalid_cursor' }` |
| 429 | rate-limit | `{ error: 'rate_limited', retryAfter: 60 }` |
| 500 | error inesperado | `{ error: 'internal', correlationId: '...' }` |

## 6. Estrategia de testing

- **Contract tests (primero, Fase A)**: Jest + supertest. Schemas en `contracts/whatsapp-threads-list.json`, `contracts/whatsapp-threads-detail.json`, etc. Validan response shape + status codes + multi-tenant (request con company A NO ve hilos de company B → 404).
- **Integration**: doble Firestore emulator + Storage emulator. Seeder Fase D (`scripts/seed-whatsapp-demo.js`) inserta 3 hilos × 5 mensajes en `whatsapp_inbound` + `whatsapp_usage` para QA/UAT sin esperar a 009.1.
- **E2E (Fase E)**: Playwright (`docs/prompts/playwright-automation.md`). 4 tests mínimos:
  1. **Listar hilos**: login → `/notificaciones/whatsapp/inbox` → ve ≥3 hilos demo.
  2. **Buscar**: escribe "Maria" en search → resultado filtrado server-side.
  3. **Abrir detalle**: click en hilo → ve historial ascendente outbound+inbound con burbujas direccionales.
  4. **Filtro "Solo con respuesta entrante"**: toggle ON → solo hilos con ≥1 inbound.
- **Unit**:
  - `whatsappPhoneHash.service.spec.ts` (hash determinístico por company).
  - `whatsappThreadAggregator.service.spec.ts` (agregación + dedup + JOIN clientes).
  - `WhatsappInboxService` (mock `BaseService`, assert que extiende y NO usa `HttpClient`).

## 7. Fases de implementación

### Fase A — Backend foundation (contract-first)
- A.1 Deploy `firestore.indexes.json` con 3 composite indexes (§4.3) y esperar a que Firestore termine de crearlos.
- A.2 Escribir contract tests Jest+supertest contra los 4 endpoints (esperan 404 hasta implementar).
- A.3 Crear `routers/whatsappConversations.js` con endpoints vacíos que retornan stub válido al schema.
- A.4 Implementar `services/whatsappPhoneHash.js` con tests unitarios.
- A.5 Implementar `services/whatsappThreadAggregator.js` con agregación + JOIN `clientes` + paginación cursor.
- A.6 Implementar `PATCH /viewed` idempotente + audit row en `whatsapp_access_audit`.
- A.7 Implementar `GET /media` con cache en Firebase Storage.
- A.8 Habilitar rate-limit por endpoint (middleware existente). 

**Gate Fase A → B:** todos los contract tests verdes; índices Firestore activos.

### Fase B — Frontend módulo lazy (scaffolding)
- B.1 Crear `WhatsappInboxModule` lazy bajo `src/app/components/notificaciones/whatsapp-inbox/`.
- B.2 Registrar ruta en `routes.ts` con `AuthGuard` + entrada en `nav.service.ts` ("Gestión Comercial" → "Conversaciones WhatsApp").
- B.3 Declarar módulo `whatsapp_conversations` en `modules-catalog.ts` con actions `view`, `markRead`.
- B.4 Crear `WhatsappInboxService extends BaseService` en `src/app/shared/services/notifications/whatsapp-inbox.service.ts`.
- B.5 Declarar endpoints en `notification.config.ts` (`whatsappThreads`, `whatsappThreadMessages`, `whatsappThreadViewed`, `whatsappThreadMedia`).
- B.6 Declarar modelos en `notification.types.ts` (`WhatsappThread`, `WhatsappMessage`, `WhatsappMessageDirection`, `WhatsappMessageStatus`, `WhatsappMessageMediaRef`).
- B.7 Test unitario que verifica `WhatsappInboxService extends BaseService` (regla anti-bug feedback_no_httpclient_in_lazy_modules).

**Gate Fase B → C:** ruta navegable (devuelve shell vacío), permiso aplicable desde admin de roles.

### Fase C — Frontend componentes
- C.1 `WhatsappInboxShellComponent` con `BreakpointObserver`: desktop ≥1024px split-view, tablet 768-1023px sidebar colapsable, mobile <768px navegación ruta-driven.
- C.2 `WhatsappThreadListComponent`: tabla nativa (NO `p-datatable`), KPI cards con border-left 4px (sin gradientes), search debounce 350ms, filtro binario "Solo con respuesta entrante", paginación cursor (botón "Cargar más"), empty state, banner asimetría TTL.
- C.3 `WhatsappThreadDetailComponent`: header con `clienteNombre`/`profileName` + máscara teléfono, lista cronológica ascendente, auto-scroll-to-bottom, burbujas direccionales (out=derecha verde, in=izquierda gris), badges status (sent/delivered/read/failed), placeholders media con botón "Descargar" → llama `GET /media`, botón "Marcar leído" → `PATCH /viewed`.
- C.4 `WhatsappThreadEmptyStateComponent` (desktop sin selección).
- C.5 Polling: 30s listado + 15s detalle activo, con Page Visibility API (pausa en `hidden`) y jitter ±5s.
- C.6 ARIA + WCAG AA: `role="log"`, `aria-live="polite"`, foco visible, navegación teclado completa.

**Gate Fase C → D:** UI funcional contra backend Fase A; checklist accesibilidad pasado.

### Fase D — Seeder de datos demo
- D.1 Script `scripts/seed-whatsapp-demo.js` (Node):
  - Inserta 3 hilos para `company = OH MY STORE` con `recipientPhoneNormalized` de números demo (`573001112233`, `573002223344`, `573003334455`).
  - Para cada hilo: 5 docs en `whatsapp_usage` (templates `recordatorio_pago`, `confirmacion_pedido`, `entrega_proxima` con `status` variados) y 5 en `whatsapp_inbound` (1 texto + 1 imagen + 1 audio + 1 documento + 1 sticker).
  - Idempotente (`--dry-run` por defecto + flag `--apply`; clave: `kapsoMessageId` único).
  - Hilo 1: TODOS los inbound con `viewedByCompanyAt = null` (para `unreadCount=5`).
  - Hilo 2: 50% `viewedByCompanyAt` seteado.
  - Hilo 3: todos leídos.
- D.2 Documentar uso en `runbook-debug-flow.md`.

**Gate Fase D → E:** seeder ejecutable; QA puede ver datos en UI sin esperar a 009.1/009.4.

### Fase E — Acceptance & rollout
- E.1 Ejecutar 4 tests E2E Playwright (§6).
- E.2 Test de carga: sesión simulada 5min, contar lecturas Firestore < 100 por usuario (NFR 5.1).
- E.3 Verificar logs prod no contienen `+57[0-9]{10}` plaintext (grep semanal).
- E.4 Feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` (default `false`); rollout staged: **dark-launch 2026-06-20→2026-06-24** (interno Katuq), **canary 2026-06-25→2026-06-26** (`OH MY STORE` solamente), **GA 2026-06-27** (todos los comercios con WhatsApp activado).
- E.5 Documentar en CONTRACT.md cierre de 009.5 y bitácora de sesión.

## 8. Plan de rollout

- **Feature flag**: `WHATSAPP_INBOX_VIEWER_ENABLED` en `companies.{id}.features`. Dueño: Daniel. Timeline: dark-launch 2026-06-20, canary 2026-06-25, GA 2026-06-27, **retiro 2026-08-26** (+60d post-GA). Art XII: registrar en CONTRACT.md fecha de retiro junto con sello de cierre 009.5.
- **Dark launch**: Fase E.4 — activar solo para `OH MY STORE` 24h, monitorear `whatsapp_access_audit` + latencias p95.
- **Canary**: 5 comercios con WhatsApp activado durante 48h.
- **100%**: tras canary OK + 0 incidentes de seguridad.
- **Rollback plan**: desactivar feature flag (instantáneo). Si hay datos escritos en `viewedByCompanyAt` que el usuario quiera "des-marcar", scripts/unmark-viewed.js con `--dry-run`. Los composite indexes Firestore quedan (no se borran — bajo costo).

## 9. Riesgos técnicos

> Heredados/refinados desde `spec.md §9` y `design.risks`.

- **R-01 — Colisión slot 009.5** (heredado spec R-05). Mitigación: D-049 gate antes de aprobar plan.
- **R-02 — Asimetría TTL 90d/365d** (heredado spec R-04). Mitigación: banner + flag `inboundTruncatedAt90d`.
- **R-03 — Prerequisite 009.2 (`recipientPhoneNormalized`)**. Mitigación: bloquear Fase A hasta confirmación 009.2 + backfill ejecutado. Sin esto la agregación por hilo no es estable.
- **R-04 — Costo Firestore por agregación**. Mitigación: composite indexes deploy Phase A (gate); cursor-based paginación; polling 30s/15s con Page Visibility API; rate-limit 10/20/5 req/min; test NFR 5.1 (<100 lecturas/sesión 5min).
- **R-05 — Acoplamiento UI a Kapso** (heredado spec R-06). Mitigación: modelos abstractos en `notification.types.ts`; mapper Kapso→Katuq en backend.
- **R-06 — Privacidad teléfonos en frontend** (heredado spec R-02). Mitigación: `phoneHash` opaco al frontend + máscara `+57***1234` + audit log + sanitización en loggers (regla grep semanal).
- **R-07 — `HttpClient` directo en módulo lazy** (heredado spec R-07). Mitigación: `extends BaseService` obligatorio; test unitario assert extends; PR checklist.

## 10. Open questions (técnicas, no de producto)

> Las preguntas de producto vuelven a `spec.md §8`. Aquí solo las técnicas.

- **OQ-01** ¿`whatsapp_access_audit` debe vivir en Firestore o en BigQuery (vía pipeline existente de auditoría)? Firestore facilita queries por `phoneHash` para forensics, BigQuery facilita reporting. **Default propuesto**: Firestore (90d TTL); pipeline a BQ se evalúa post-launch si vol > 100K rows/mes.
- **OQ-02** ¿El JOIN con `clientes` se hace por lote (lookup batch al armar la respuesta) o se cachea en memoria del proceso? Con 20 hilos por página, lookup batch (`in` operator de hasta 10 IDs) requiere 2 queries. **Default propuesto**: lookup batch sin cache, suficientemente rápido y respeta feedback_no_cache.md.
- **OQ-03** ¿La verificación `phoneHash↔company` se hace contra Firestore (query `whatsapp_usage` con `phoneHash` indexado) o se recomputa el hash desde una lista de teléfonos del company y se compara? Recomputar es costoso; indexar `phoneHash` en `whatsapp_usage`/`whatsapp_inbound` requiere migrar docs existentes. **Default propuesto**: indexar `phoneHash` como campo nuevo al insertar (009.2/009.4 lo agregan) + backfill one-off. Si bloqueante, fallback: derivar `phoneHash` server-side y filtrar por `recipientPhoneNormalized` (más caro pero sin migración).
- **OQ-04** ¿La descarga de media usa Firebase Admin SDK directo o pasa por el endpoint Express con stream? Stream evita exponer Storage URLs públicas, Admin SDK simplifica. **Default propuesto**: stream a través de Express + signed URL Storage de 5min.
- **OQ-05** ¿Rate-limit por usuario o por usuario+IP? Multi-usuario detrás de mismo NAT corporativo podría chocar. **Default propuesto**: por `userId` autenticado (no por IP).
- **OQ-06** ¿`viewedByCompanyAt` se escribe en batch (`writeBatch` Firestore, max 500 ops) o en transaction? El hilo puede tener >500 docs inbound en empresas grandes. **Default propuesto**: chunked `writeBatch` de 400 con loop secuencial (cumple feedback_parallelize_firestore_batches si se paraleliza chunks con `Promise.all`).
- **OQ-07** ¿El seeder de Fase D entra al repo principal o queda como gist? **Default propuesto**: en `scripts/seed-whatsapp-demo.js` del backend con `--dry-run` por defecto (regla constitución).

## 11. Out of scope del plan

> Adicional a OOS de la spec (§6), este plan tampoco entrega:

- Migración de datos históricos `whatsapp_usage` pre-009.2 que no tengan `recipientPhoneNormalized` (responsabilidad de 009.2, backfill independiente).
- Indexado de `phoneHash` como campo persistido en `whatsapp_usage`/`whatsapp_inbound` (queda como OQ-03; fallback: recomputar server-side).
- Renderizado nativo de media (placeholders + descarga diferida es el MVP).
- Localización i18n del módulo (queda en `es-CO` heredado).
- Métricas BI dedicadas (tiempo primera respuesta, SLA, hilos abiertos/cerrados) — sub-spec futura.
- Sincronizar `viewedByCompanyAt` hacia Kapso/Meta (read receipt outbound — scope 009.6).
- Notificación push o badge en sidebar al llegar inbound nuevo (canal IN_APP ortogonal — se evalúa post-MVP).
- Tests E2E adicionales más allá de los 4 mínimos de Fase E.1.
- Plan de migración si Kapso es reemplazado por otro proveedor (mitigado por Art VI, pero la sustitución requiere su propia spec).
- Pasarela de pago real (renumerada a 009.6 post-D-049) y display name dinámico (renumerada a 009.7).

---

**Checklist antes de pasar `plan.md` a `approved`:**
- [ ] D-049 registrada en `CONTRACT.md` (renumeración 009.5/009.6/009.7).
- [ ] 009.2 confirmó persistencia de `recipientPhoneNormalized` + backfill listo.
- [ ] Composite indexes Firestore declarados en `firestore.indexes.json`.
- [ ] Todos los `sí` en §2 verificados; cualquier `no` lleva enmienda en `CONTRACT.md`.
- [ ] Open questions §10 con defaults aceptados o resueltas.
- [ ] Checkpoint humano (Daniel) antes de redactar `tasks.md`.
