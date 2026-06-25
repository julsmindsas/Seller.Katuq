# Tasks 009.5 — WhatsApp Conversations Viewer (READ-ONLY)

> Estado: **draft** | in-review | approved | in-progress | done
> Vinculado a `plan.md` (debe estar `approved`).
> Última actualización: 2026-06-17
> Spec padre: [[009-whatsapp-kapso-notifications-marco]]
>
> ⚠️ **Gates bloqueantes antes de pasar tasks.md a `approved`**:
> 1. `plan.md` en estado `approved`.
> 2. D-049 registrada en `CONTRACT.md` (renumeración 009.5/009.6/009.7).
> 3. 009.2 confirmó persistencia de `recipientPhoneNormalized` + backfill ejecutado.
> 4. Composite indexes Firestore declarados en `firestore.indexes.json` (gate Fase A).

## Convenciones

- `[P]` = tarea paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Cada tarea debe ser shippable de forma independiente o bloquear de forma explícita.
- Dueños: **BE** (backend Express), **FE** (Angular), **SHARED** (afecta ambos repos), **DOCS** (sólo documentación / runbook / CONTRACT).
- Tamaños: **S** (≤2h), **M** (medio día), **L** (1-2 días).

## Tabla resumen

| ID    | Descripción corta                                            | Dueño  | Bloqueado por        | Paralelizable | Tamaño | Criterio de done                                                                                  |
|-------|--------------------------------------------------------------|--------|----------------------|---------------|--------|---------------------------------------------------------------------------------------------------|
| T-01  | Pre-flight: auditar 009.2 (`recipientPhoneNormalized`) + 009.4 | BE     | —                    | Y `[P]`       | S      | Reporte 1-pager: estado backfill, conteo docs sin campo, decisión go/no-go firmada en CONTRACT.    |
| T-02  | Pre-flight: decidir shape final del seeder demo              | DOCS   | —                    | Y `[P]`       | S      | Documento `seed-shape.md` con 3 hilos × 5 mensajes + estructura `kapsoMessageId` única.            |
| T-03  | Deploy composite indexes Firestore (gate Fase A)             | BE     | T-01                 | N             | S      | `firestore.indexes.json` desplegado; consola Firebase muestra los 3 índices en estado `Enabled`.   |
| T-04  | Escribir contract tests Jest+supertest (4 endpoints)         | BE     | T-02                 | Y `[P]`       | M      | `npm test` corre 4 suites rojas (esperado, endpoints no existen aún); schemas en `contracts/`.     |
| T-05  | Implementar `services/whatsappPhoneHash.js` + unit tests     | BE     | T-03                 | Y `[P]`       | S      | `hash(phoneE164, companyId)` determinístico; ≥3 unit tests verdes (mismo input = mismo output).    |
| T-06  | Crear `routers/whatsappConversations.js` con stubs 4 endpoints | BE     | T-03, T-04           | N             | S      | Contract tests pasan para shape vacío; rutas montadas en `app.js`; auth middleware aplicado.       |
| T-07  | Implementar `services/whatsappThreadAggregator.js` + JOIN clientes | BE | T-05, T-06          | N             | L      | `GET /threads` retorna agregación real con `unreadCount`, `lastDirection`, `clienteNombre`; tests verdes. |
| T-08  | Implementar `GET /threads/:phoneHash/messages` con paginación cursor | BE | T-07               | N             | M      | Contract test detalle verde; verifica `phoneHash↔company` server-side; 404 cross-tenant.           |
| T-09  | Implementar `PATCH /viewed` idempotente + audit log          | BE     | T-08                 | N             | M      | 2da llamada retorna `updated=0, alreadyViewed=N`; row en `whatsapp_access_audit` con `correlationId`. |
| T-10  | Implementar `GET /media` con cache Firebase Storage          | BE     | T-08                 | Y `[P]`       | M      | 302 redirect a Storage; cache-miss hace fetch a Kapso + persiste `storageUrl`; 410 si caducado.    |
| T-11  | Scaffold `WhatsappInboxModule` lazy + ruta `AuthGuard`       | FE     | T-06                 | Y `[P]`       | S      | `/notificaciones/whatsapp/inbox` navega y renderiza shell vacío; ruta declarada en `routes.ts`.    |
| T-12  | Registrar módulo en `nav.service.ts` + `modules-catalog.ts`  | FE     | T-11                 | Y `[P]`       | S      | Item visible bajo "Gestión Comercial"; actions `view`/`markRead` aplicables desde admin de roles.   |
| T-13  | Crear `WhatsappInboxService extends BaseService` + tipos     | FE     | T-11                 | Y `[P]`       | S      | Unit test assert `extends BaseService` (NO `HttpClient` directo); endpoints en `notification.config.ts`. |
| T-14  | Componente `WhatsappThreadListComponent` + KPIs + filtros    | FE     | T-13, T-07           | N             | L      | Tabla nativa con 20 hilos, search debounce 350ms, paginación cursor, banner asimetría TTL.        |
| T-15  | Componente `WhatsappThreadDetailComponent` + burbujas        | FE     | T-13, T-08, T-09     | N             | L      | Burbujas direccionales, badges status, botón "Marcar leído" llama `PATCH /viewed`, auto-scroll.   |
| T-16  | `WhatsappInboxShellComponent` responsive (BreakpointObserver) + pipe máscara teléfono + empty states (cubre AC-009.5-16, AC-009.5-04) | FE     | T-13                 | Y `[P]`       | M      | Shell con CDK `BreakpointObserver`: ≥1024 split master+detail, 768-1023 sidebar colapsable, <768 route-driven. Pipe `phoneMask` reusable. Empty state desktop + "sin resultados". |
| T-17  | Polling 30s/15s con Page Visibility API + jitter ±5s         | FE     | T-14, T-15           | N             | M      | DevTools muestra polling pausado en pestaña oculta; jitter random ±5s en network log.             |
| T-18  | Script `scripts/seed-whatsapp-demo.js` + runbook             | BE     | T-02, T-09           | Y `[P]`       | M      | `--dry-run` por defecto; `--apply` inserta 3 hilos × 5 mensajes idempotentes en `OH MY STORE`.    |
| T-19  | 4 tests E2E Playwright (listar/buscar/abrir/filtro)          | SHARED | T-17, T-18           | N             | M      | 4 specs `*.e2e.spec.ts` verdes en CI; correlacionables con AC-009.5-01/02/06/13 de la spec.      |
| T-20  | Rollout staged feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` + CONTRACT | DOCS   | T-19                 | N             | S      | Dark-launch 2026-06-20→24 (interno), canary 25→26 (`OH MY STORE`), GA 2026-06-27, retirement 2026-08-26 (+60d post-GA). Bitácora + cierre 009.5 en `CONTRACT.md` con todas las fechas. |

## Detalle de tareas

### T-01 — Pre-flight: auditar 009.2 + 009.4 `[P]`
- **Input:** estado actual de `whatsapp_usage` (009.2) y `whatsapp_inbound` (009.4) en prod/staging.
- **Output:** 1-pager con conteo de docs con/sin `recipientPhoneNormalized`, fecha del backfill, decisión go/no-go.
- **Criterio de éxito:** decisión firmada por Daniel en `CONTRACT.md` (D-050 o similar). Sin esto, T-03 no arranca.
- **Archivos a tocar:** `specs/009.5-whatsapp-conversations-viewer/findings-preflight.md`, `specs/CONTRACT.md`.
- **Dependencias:** ninguna.

### T-02 — Pre-flight: decidir shape final del seeder `[P]`
- **Input:** plan §7 Fase D + spec §6 OOS.
- **Output:** `seed-shape.md` describiendo los 3 hilos demo (números, templates, tipos de media) y la clave de idempotencia (`kapsoMessageId`).
- **Criterio de éxito:** documento revisado por QA; los IDs no chocan con datos reales de `OH MY STORE`.
- **Archivos a tocar:** `specs/009.5-whatsapp-conversations-viewer/seed-shape.md`.
- **Dependencias:** ninguna.

### T-03 — Deploy composite indexes Firestore (deps: T-01)
- **Input:** `firestore.indexes.json` existente + 3 índices nuevos del plan §4.3.
- **Output:** 3 composite indexes en estado `Enabled` en consola Firebase (staging + prod).
- **Criterio de éxito:** `firebase deploy --only firestore:indexes`; verificación visual en consola; los índices NO están en estado `Building` antes de T-07.
- **Archivos a tocar:** `katuq_admin_back_firebase/firestore.indexes.json`.
- **Dependencias:** T-01 (no deployar si 009.2 no está listo).

### T-04 — Contract tests Jest+supertest para los 4 endpoints `[P]` (deps: T-02)
- **Input:** plan §5 (contratos) + §6 (estrategia) + spec §5.2 (rate-limits por endpoint).
- **Output:** suites `whatsapp-threads-list.spec.js`, `whatsapp-threads-detail.spec.js`, `whatsapp-threads-viewed.spec.js`, `whatsapp-threads-media.spec.js` + schemas JSON en `contracts/`.
- **Criterio de éxito:**
  - Los 4 specs ejecutan y fallan con "endpoint not found" (rojo esperado al inicio).
  - Cubren 401, 403, 404 cross-tenant, 422.
  - **Rate-limit asserts explícitos** (con mock rate-limiter o middleware real):
    - Listado: 11ª request del mismo `userId` dentro de 60s retorna `429 Too Many Requests` con header `Retry-After`.
    - Detalle: 21ª request del mismo `userId` dentro de 60s retorna 429.
    - Media: 6ª request del mismo `userId` dentro de 60s retorna 429.
    - Body de la respuesta 429 incluye `{ code: 'RATE_LIMIT_EXCEEDED', limit, windowSec, retryAfterSec }`.
- **Archivos a tocar:** `katuq_admin_back_firebase/functions/tests/whatsapp-conversations/*.spec.js`, `contracts/whatsapp-*.json`.
- **Dependencias:** T-02 (necesita shape demo para fixtures).

### T-05 — `whatsappPhoneHash.js` + unit tests `[P]` (deps: T-03)
- **Input:** AC-009.5-04, AC-009.5-12 (definición `phoneHash`).
- **Output:** servicio puro `SHA-256(phoneE164 || '|' || companyId)` en Node.
- **Criterio de éxito:** 3 unit tests: (a) determinístico, (b) distinto por company, (c) rechaza input vacío.
- **Archivos a tocar:** `katuq_admin_back_firebase/functions/services/whatsappPhoneHash.js`, `tests/whatsappPhoneHash.spec.js`.
- **Dependencias:** T-03.

### T-06 — Router con stubs de los 4 endpoints + middleware rate-limit (deps: T-03, T-04)
- **Input:** contract tests T-04 + middleware `authJwt` existente + spec §5.2 (cuotas por endpoint).
- **Output:**
  - `routers/whatsappConversations.js` montado en `app.js` con respuestas stub que cumplen el schema (arrays vacíos / counts 0).
  - `middleware/whatsappRateLimit.js` con sliding-window por `userId` autenticado (OQ-05 confirmado):
    - Listado: 10 req/60s.
    - Detalle: 20 req/60s.
    - Media: 5 req/60s.
    - PATCH viewed: 30 req/60s.
  - Configuración inyectable (env vars o config) para que QA pueda bajar la cuota a 2/min en test.
- **Criterio de éxito:** contract tests T-04 pasan para los códigos 200, 401 y 429; aún rojos para 404 cross-tenant y semántica de negocio.
- **Archivos a tocar:** `katuq_admin_back_firebase/functions/routers/whatsappConversations.js`, `app.js`, `middleware/whatsappRateLimit.js`.
- **Dependencias:** T-03, T-04.

### T-07 — `whatsappThreadAggregator.js` + JOIN clientes + cursor (deps: T-05, T-06)
- **Input:** plan §4 + §5.1 + composite indexes vivos.
- **Output:** servicio que agrupa `(company, recipientPhoneNormalized)` desde `whatsapp_usage` + `whatsapp_inbound`, hace lookup batch a `clientes` (`in` operator), retorna shape §5.1 con `unreadCount`, `lastDirection`, `flags.inboundTruncatedAt90d`.
- **Criterio de éxito:** contract test `GET /threads` verde con seeder T-18 puntual; query con `company A` NO devuelve hilos de `company B`.
- **Archivos a tocar:** `services/whatsappThreadAggregator.js`, `tests/whatsappThreadAggregator.spec.js`, `routers/whatsappConversations.js` (cablear).
- **Dependencias:** T-05, T-06.

### T-08 — `GET /threads/:phoneHash/messages` con paginación cursor (deps: T-07)
- **Input:** plan §5.2.
- **Output:** endpoint que verifica `phoneHash↔company`, lee descendente por timestamp, retorna burbujas con `direction`, `type`, `snippet`, `mediaRef`.
- **Criterio de éxito:** contract test detalle verde; request con `phoneHash` de otro tenant retorna 404 (no 403, para no leakear existencia).
- **Archivos a tocar:** `routers/whatsappConversations.js`, `services/whatsappThreadAggregator.js` (función `getMessagesByHash`).
- **Dependencias:** T-07.

### T-09 — `PATCH /viewed` idempotente + audit + TTL enforcement (deps: T-08)
- **Input:** plan §5.3 + OQ-06 (chunked writeBatch) + spec §5.3 (retención `whatsapp_access_audit` 90d).
- **Output:**
  - Endpoint que escribe `viewedByCompanyAt: now()` SOLO donde es `null`; chunks de 400 paralelos con `Promise.all`.
  - Audit row en `whatsapp_access_audit` con shape:
    ```
    { userId, userRole, company, phoneHash, action, messageRange?, timestamp, ipAddress, userAgent,
      ttlAt: Timestamp(timestamp + 90 días) }
    ```
  - **TTL enforcement**: habilitar Firestore TTL Policy sobre el campo `ttlAt` de la colección `whatsapp_access_audit` (consola Firebase → Firestore → TTL → Add policy: collection group `whatsapp_access_audit`, field `ttlAt`).
- **Criterio de éxito:**
  - 1ra llamada `updated=N, alreadyViewed=0`; 2da llamada inmediata `updated=0, alreadyViewed=N`.
  - Row de auditoría visible con `ttlAt` poblado.
  - TTL Policy visible en estado `Active` en consola Firebase staging y prod.
  - Test de retención: en staging insertar un row con `ttlAt` retroactivo (-1d) y verificar que se elimina dentro de 24h (Firestore TTL no es preciso al segundo).
- **Archivos a tocar:** `routers/whatsappConversations.js`, `services/whatsappThreadAggregator.js` (función `markViewed`), `firestore.indexes.json` (si requiere índice extra), documentación operativa de la TTL Policy en `specs/009.5-whatsapp-conversations-viewer/runbook-debug-flow.md`.
- **Dependencias:** T-08.

### T-10 — `GET /media` con cache Firebase Storage `[P]` (deps: T-08)
- **Input:** plan §5.4 + OQ-04 (signed URL 5min).
- **Output:** endpoint que: (a) si `storageUrl` existe → 302 con signed URL 5min; (b) si no, fetch a Kapso, sube a `whatsapp-media/{company}/{messageId}.{ext}`, persiste `storageUrl`, 302; (c) 410 si caducado tras 1 retry.
- **Criterio de éxito:** contract test media verde; cache-hit < 200ms; cache-miss persiste el `storageUrl` (verificable con `firebase firestore:get`).
- **Archivos a tocar:** `services/whatsappMediaProxy.js`, `routers/whatsappConversations.js`.
- **Dependencias:** T-08.

### T-11 — Scaffold módulo lazy `WhatsappInboxModule` `[P]` (deps: T-06)
- **Input:** plan §7 Fase B.
- **Output:** módulo bajo `src/app/components/notificaciones/whatsapp-inbox/`, ruta lazy con `AuthGuard` en `routes.ts`, shell vacío que renderiza "WhatsApp Inbox".
- **Criterio de éxito:** `/notificaciones/whatsapp/inbox` navega; bundle sólo se carga al entrar (verificable con DevTools Network).
- **Archivos a tocar:** `src/app/components/notificaciones/whatsapp-inbox/whatsapp-inbox.module.ts`, `whatsapp-inbox-shell.component.{ts,html,scss}`, `routes.ts`.
- **Dependencias:** T-06.

### T-12 — `nav.service.ts` + `modules-catalog.ts` `[P]` (deps: T-11)
- **Input:** plan §3.1 + estructura sidebar existente.
- **Output:** item "Conversaciones WhatsApp" bajo "Gestión Comercial" + módulo `whatsapp_conversations` con actions `view` y `markRead`.
- **Criterio de éxito:** admin de roles permite asignar el permiso; usuario sin permiso `view` NO ve el item en sidebar.
- **Archivos a tocar:** `src/app/shared/services/nav.service.ts`, `src/app/shared/services/modules-catalog.ts`.
- **Dependencias:** T-11.

### T-13 — `WhatsappInboxService extends BaseService` + tipos `[P]` (deps: T-11)
- **Input:** AC Art IX, feedback_no_httpclient_in_lazy_modules.md.
- **Output:** servicio que llama los 4 endpoints; endpoints en `notification.config.ts`; modelos `WhatsappThread`, `WhatsappMessage`, etc. en `notification.types.ts`.
- **Criterio de éxito:** unit test verifica que el servicio extiende `BaseService` y NO importa `HttpClient` directo (grep en spec); compila sin errores.
- **Archivos a tocar:** `src/app/shared/services/notifications/whatsapp-inbox.service.ts`, `notification.config.ts`, `notification.types.ts`.
- **Dependencias:** T-11.

### T-14 — `WhatsappThreadListComponent` + KPIs + filtros (deps: T-13, T-07)
- **Input:** plan §3.1 + §7 Fase C.2 + feedback_no_gradients.
- **Output:** tabla nativa (NO `p-datatable`), KPI cards con `border-left 4px` sin gradientes, search debounce 350ms, filtro "Solo con respuesta entrante", paginación cursor "Cargar más", banner asimetría TTL.
- **Criterio de éxito:** con seeder T-18 muestra 3 hilos; search "Maria" filtra en server (no client-side); banner se muestra si `flags.inboundTruncatedAt90d=true`.
- **Archivos a tocar:** `whatsapp-thread-list.component.{ts,html,scss}`, `whatsapp-thread-list.component.spec.ts`.
- **Dependencias:** T-13, T-07.

### T-15 — `WhatsappThreadDetailComponent` + burbujas + "Marcar leído" (deps: T-13, T-08, T-09)
- **Input:** plan §3.1 + §7 Fase C.3.
- **Output:** header con `clienteNombre || profileName + "no verificado"` + máscara teléfono; lista cronológica ascendente con auto-scroll-to-bottom; burbujas direccionales (out=derecha verde, in=izquierda gris); badges status; placeholders media con botón "Descargar"; botón "Marcar leído" llama `PATCH /viewed`.
- **Criterio de éxito:** abrir hilo demo muestra 10 mensajes ordenados; click "Marcar leído" actualiza `unreadCount` a 0 en el listado tras refetch.
- **Archivos a tocar:** `whatsapp-thread-detail.component.{ts,html,scss}`, `whatsapp-thread-detail.component.spec.ts`.
- **Dependencias:** T-13, T-08, T-09.

### T-16 — Shell responsive Master-Detail + pipe máscara teléfono + empty states `[P]` (deps: T-13)
- **Input:** AC-009.5-16 (responsive Master-Detail con BreakpointObserver), AC-009.5-04 (máscara teléfono), AC-009.5-17 (accesibilidad WCAG AA), spec §5 NFR seguridad y accesibilidad.
- **Output:**
  1. `WhatsappInboxShellComponent` con `BreakpointObserver` de `@angular/cdk/layout`:
     - ≥1024px: split master (lista hilos) + detail (mensajes) lado a lado.
     - 768-1023px: sidebar colapsable con toggle.
     - <768px: navegación route-driven (lista → detalle como rutas separadas con back button).
     - ARIA roles: `complementary` para sidebar, `main` para detalle, `aria-live="polite"` para banner asimetría TTL.
     - Navegación por teclado: `Tab`/`Shift+Tab` entre lista/detalle, `Enter` abre hilo, `Esc` vuelve a lista en mobile.
  2. `phoneMaskPipe` reusable.
  3. `WhatsappThreadEmptyStateComponent` + estado "sin resultados de búsqueda".
- **Criterio de éxito:**
  - Test Cypress/Playwright con viewport 1280×800 muestra split; con 1000×800 muestra sidebar colapsada; con 600×800 muestra solo lista o solo detalle.
  - Unit test pipe con `+573001234567` → `+57***4567`; nunca expone teléfono completo.
  - Empty state desktop visible cuando no hay hilo seleccionado.
  - Axe-core scan: 0 issues de severity `serious`/`critical`; contraste ≥4.5:1 en burbujas; focus ring visible.
- **Archivos a tocar:** `whatsapp-inbox-shell.component.{ts,html,scss}`, `phone-mask.pipe.ts`, `whatsapp-thread-empty-state.component.ts`, `whatsapp-thread-list-empty.component.ts`.
- **Dependencias:** T-13.

### T-17 — Polling 30s/15s + Page Visibility API + jitter (deps: T-14, T-15)
- **Input:** AC-009.5-15, NFR 5.1, R-04 plan.
- **Output:** RxJS `timer` con `switchMap` que pausa cuando `document.visibilityState === 'hidden'`; jitter random ±5s; un timer para listado (30s), otro para detalle activo (15s).
- **Criterio de éxito:** DevTools Network: ocultar pestaña detiene fetches; jitter visible en intervalos no constantes; sesión 5min < 100 lecturas Firestore (NFR 5.1).
- **Archivos a tocar:** `whatsapp-thread-list.component.ts`, `whatsapp-thread-detail.component.ts`, `whatsapp-polling.util.ts`.
- **Dependencias:** T-14, T-15.

### T-18 — `scripts/seed-whatsapp-demo.js` + runbook `[P]` (deps: T-02, T-09)
- **Input:** plan §7 Fase D.
- **Output:** script Node que inserta 3 hilos × 5 mensajes en `whatsapp_usage` + `whatsapp_inbound` para `OH MY STORE`, con `--dry-run` por defecto y `--apply` para escribir.
- **Criterio de éxito:** `node scripts/seed-whatsapp-demo.js --dry-run` lista qué insertaría; `--apply` es idempotente (2da corrida no duplica por `kapsoMessageId`); documentado en `runbook-debug-flow.md`.
- **Archivos a tocar:** `katuq_admin_back_firebase/functions/scripts/seed-whatsapp-demo.js`, `specs/009.5-whatsapp-conversations-viewer/runbook-debug-flow.md`.
- **Dependencias:** T-02, T-09.

### T-19 — 4 tests E2E Playwright (deps: T-17, T-18)
- **Input:** plan §6 + `docs/prompts/playwright-automation.md`.
- **Output:** 4 specs:
  1. `whatsapp-list-threads.e2e.spec.ts` — login → entrar al inbox → ve ≥3 hilos.
  2. `whatsapp-search.e2e.spec.ts` — escribe "Maria" → filtra en server.
  3. `whatsapp-open-detail.e2e.spec.ts` — click hilo → ve 10 mensajes con burbujas.
  4. `whatsapp-only-with-reply.e2e.spec.ts` — toggle ON → solo hilos con ≥1 inbound.
- **Criterio de éxito:** los 4 specs verdes en CI; correlacionables con AC-009.5-01/02/06/13.
- **Archivos a tocar:** `tests/e2e/whatsapp-*.e2e.spec.ts`, `playwright.config.ts`.
- **Dependencias:** T-17, T-18.

### T-20 — Dark-launch + CONTRACT (deps: T-19)
- **Input:** plan §8 (rollout).
- **Output:** feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` en `companies.{id}.features` (default `false`); rollout staged:
  * **Dark-launch 2026-06-20 → 2026-06-24**: solo cuenta interna Katuq (`KATUQ_DEMO` o equivalente); validar logs, métricas Firestore, ausencia de PII en logs.
  * **Canary 2026-06-25 → 2026-06-26**: activado en `OH MY STORE` exclusivamente; monitoreo continuo de errores y `whatsapp_access_audit`.
  * **GA 2026-06-27**: activado por defecto para todos los comercios con `WHATSAPP` en `whatsapp_notifications`.
  * **Retirement 2026-08-26 (+60d post-GA)**: flag eliminada del código si los KPIs post-launch (§10 spec) están en verde.
  * Bitácora cronológica en `CONTRACT.md` con fecha de cada milestone + cierre 009.5 al GA.
- **Criterio de éxito:** grep semanal sobre logs prod NO encuentra `+57[0-9]{10}`; `whatsapp_access_audit` recibe filas durante el 24h; cierre 009.5 en CONTRACT.md.
- **Archivos a tocar:** `companies/{id}/features` (Firestore), `specs/CONTRACT.md`.
- **Dependencias:** T-19.

## Orden de ejecución sugerido

1. **Bloque 0 (pre-flight, paralelo):** T-01 + T-02.
2. **Bloque A (backend foundation):** T-03 → (T-04 `[P]` + T-05 `[P]`) → T-06 → T-07 → T-08 → (T-09 + T-10 `[P]`).
3. **Bloque B (frontend scaffolding, paralelo tras T-06):** T-11 → (T-12 `[P]` + T-13 `[P]`).
4. **Bloque C (frontend componentes):** (T-14 + T-15 secuenciales por dependencias backend, T-16 `[P]`) → T-17.
5. **Bloque D (seeder, paralelo con C):** T-18 puede correr tan pronto como T-09 esté listo.
6. **Bloque E (acceptance):** T-19 → T-20.

## Risk Mitigation Traceability (cubre R-01..R-07 de la spec §9)

Mapa explícito riesgo → mitigación → task(s) responsable(s). Cualquier nuevo riesgo descubierto durante implementación debe añadirse a esta tabla y al CONTRACT.md.

| Riesgo | Descripción corta | Tarea(s) que lo mitigan | Verificación |
|---|---|---|---|
| **R-01** | Slot collision 009.5/009.6/009.7 sin renumeración formal. | Pre-flight gate antes de aprobar plan.md: D-049 en `CONTRACT.md`. | Bitácora CONTRACT.md tiene fila D-049 firmada antes de iniciar T-01. |
| **R-02** | Asimetría TTL `whatsapp_inbound` 90d vs `whatsapp_usage` 365d → hilos antiguos pierden mensajes entrantes y se ven truncados. | **T-14** (banner UI "Conversación parcial: respuestas anteriores a {date} ya no disponibles" si `flags.inboundTruncatedAt90d=true`) + **T-07** (agregador setea el flag al detectar gap). | Test de integración con seeder que inserta mensajes antiguos +91d; UI muestra el banner. |
| **R-03** | Campo `recipientPhoneNormalized` no existe en `whatsapp_usage` actual → agregador no puede agrupar. | **T-01** (auditar 009.2 + decidir go/no-go + backfill antes de T-03). | Reporte 1-pager firmado por Daniel en CONTRACT.md. T-03 NO arranca sin esto. |
| **R-04** | Costo Firestore inflado por agregación in-memory o polling agresivo. | **T-03** (composite indexes Phase 0) + **T-17** (polling con Page Visibility API + jitter ±5s) + **T-04** (rate-limit contract test). | Sesión de 5min en DevTools < 100 lecturas Firestore; cuotas 429 disparan en tests. |
| **R-05** | Acoplamiento de la UI a Kapso → migrar de proveedor requiere reescribir frontend. | **T-13** (modelos abstractos `WhatsappThread`, `WhatsappMessage` con `direction/status/type` genéricos en el frontend; mapper Kapso→Katuq vive solo en backend `routers/whatsappConversations.js`). | Code review: grep en `src/app/components/notificaciones/whatsapp-inbox/` no encuentra el string "kapso". |
| **R-06** | Fuga de teléfonos completos en logs o response. | **T-04** (contract test verifica que la response no contenga regex `\+57[0-9]{10}`) + **T-20** (grep semanal sobre logs prod busca patrón). Doctrina: NUNCA loguear `phoneE164`; siempre `phoneHash` o máscara `+57***1234`. | Definition of Done incluye "grep semanal no encuentra +57[0-9]{10} en logs prod" como gate. |
| **R-07** | Uso de `HttpClient` directo en módulo lazy (interceptor de auth no adjunta headers → 401). | **T-13** (test unitario que verifica `WhatsappInboxService extends BaseService` y no importa `HttpClient` directo) + checklist obligatorio en PR template del repo. | Unit test asserta extends BaseService; PR no se mergea sin checkbox marcado por reviewer. |

Si una mitigación falla en producción durante rollout (T-20), el feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` se baja a `false` inmediatamente y se abre enmienda en CONTRACT.md antes de cerrar 009.5.

## Definition of Done

- Todos los contract tests verdes (T-04 → T-10).
- 4 tests E2E Playwright verdes en CI (T-19).
- Verificación de constitución sin "no" pendientes (plan §2 release-ready).
- Composite indexes Firestore en estado `Enabled` (T-03).
- `whatsapp_access_audit` emitiendo filas en staging y prod (T-09, T-20).
- Grep semanal sobre logs prod NO encuentra `+57[0-9]{10}` plaintext (T-20).
- `WhatsappInboxService extends BaseService` verificado por unit test (T-13).
- `CONTRACT.md` actualizado con cierre 009.5 y D-049 firmada (T-20).
- Feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` desplegada con rollout staged completo: dark-launch 2026-06-20→24, canary 2026-06-25→26 en `OH MY STORE` sin incidentes, GA 2026-06-27, fecha de retirement 2026-08-26 registrada en CONTRACT.md (T-20).
- Spec marcada `done` solo si los 4 E2E pasaron en prod canary; si hay desvíos sobre el plan, registrar enmienda en CONTRACT.md antes del cierre.
