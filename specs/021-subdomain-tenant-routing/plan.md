# Plan 021 — Enrutamiento multi-tenant por subdominio (Nivel A) · BACKBONE ARQUITECTÓNICO

> Estado: **draft (backbone del marco)**
> Vinculado a `spec.md` (**approved, MARCO**) y a `sub-specs.md`.
> Última actualización: 2026-07-10
>
> **Rol de este documento:** es la **arquitectura compartida** de las 8 sub-specs hijas (021.1–021.8),
> no un plan de ejecución de una sola persona. Cada hija tiene su propio `plan.md` acotado que
> referencia esta arquitectura. Las fases §7 de abajo son la **descomposición conceptual**; el
> reparto real por dueño/ola está en `sub-specs.md`.

## 1. Resumen técnico
El subdominio se resuelve en el **arranque del frontend** contra un endpoint público `subdominio→company`; el `company` resuelto pasa a ser la fuente del header que ya inyecta el interceptor (hoy sale de `localStorage['user'].company`). El slug es un **campo nuevo en `companies`** (no colección nueva) auto-generado desde `nomComercial`. El login central sigue en `sellercenter.katuq.com` y redirige al subdominio con un **token de handoff stateless** (JWT de TTL corto, un solo uso) porque `localStorage` es per-origen. Se endurece la seguridad validando **`company` header == `company` del JWT** en backend (hoy no se valida). Infra: **reverse proxy wildcard `*.katuq.com`** delante del Firebase single-site (tarea de ops, en paralelo).

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 021 approved antes de este plan. |
| II — Spec captura intent | sí | la spec no nombra tecnología; este plan sí. |
| IV — Idempotencia | sí | el canje del token de handoff es idempotente y de un solo uso (nonce `jti`). Resolución `subdominio→company` es read-only. |
| V — Eventos crudos antes de procesar | N/A | no se introducen webhooks entrantes. |
| VI — UI no acoplada a proveedor | sí | el resolver es por-tenant, no por-proveedor; no se agrega `if (provider===…)`. La lógica per-empresa hardcodeada existente (`company==="Julsmind"`, correos Almara) se documenta como deuda, no se amplía. |
| VII — Observabilidad | sí | log estructurado con `correlationId` en resolución fallida, mismatch tenant↔JWT y canje de handoff; métrica de tasa de mismatch. |
| VIII — Test-first contratos | sí | contract tests de `/v1/tenant/resolve/:slug` y de los endpoints de handoff antes de implementar. |
| IX — Estilo Angular | sí | el tenant-resolver es código nuevo: standalone + signals + OnPush + HTTP vía servicio dedicado. |
| X — Seguridad webhooks | N/A | sin webhooks nuevos. El handoff lleva su propia seguridad (firma + TTL + un solo uso). |
| XI — Datos sensibles fuera del log | sí | nunca se loguean tokens; el endpoint público expone solo `{company, nombre, logo}`. |

Ninguna casilla en "no" → no requiere enmienda. **Regla de usuario "no colecciones nuevas"**: respetada — slug es campo en `companies`; handoff es stateless (ver §5.1 y open question OQ-1).

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend (Angular)**: nuevo `TenantResolverService` (standalone, signals) que corre en `APP_INITIALIZER`; ajuste en `http.interceptor.ts:126-129` para tomar el `company` desde el tenant resuelto (con fallback a `localStorage['user'].company`); ajuste en `security.service.ts` para el branding (logo/nombre) desde el resolve; nueva ruta `/auth/handoff` para canjear el token; ajuste en `login.component.ts` / `auth.service.ts` para el redirect central.
- **Backend (Express/EC2)**: nuevo router `tenant` (`/v1/tenant/*`): `resolve/:slug` (público), `handoff` (auth) y `handoff/redeem` (público con token); nuevo middleware `enforceCompanyMatch` (valida header `company` == `req.userInfo.company` del JWT, exime el path `x-api-key`/`system_agent`); ampliar CORS `index.js:189-225` con regex `*.katuq.com`; helper `resolveTenantBaseUrl(company)` para las URLs absolutas.
- **Almacenamiento**: campo `subdomain` (+ `subdomainAliases`, `subdomainRoutingEnabled`) en `companies`. Sin colección nueva.
- **Infra**: reverse proxy wildcard (Cloudflare o nginx en EC2) `*.katuq.com` + TLS wildcard → Firebase Hosting single-site.

### 3.2 Diagrama (flujo login central + handoff)
```
Navegador                       sellercenter.katuq.com (central)         backend
  │ 1. login (correo/clave) ─────────────► POST /v1/auth (existente) ──► JWT + company
  │ 2. POST /v1/tenant/handoff (JWT) ─────────────────────────────────► { subdomain, handoffToken(TTL 45s, jti) }
  │ 3. redirect ► https://<subdomain>.katuq.com/auth/handoff?token=…
  ▼
<subdomain>.katuq.com
  │ 4. bootstrap: GET /v1/tenant/resolve/<subdomain> (público) ───────► { company, nombre, logo }
  │ 5. POST /v1/tenant/handoff/redeem { token } ─────────────────────► valida firma+TTL+jti+match → JWT sesión
  │ 6. guarda JWT en localStorage de ESTE origen → app operativa
  ▼ (todas las llamadas) header company = company resuelto del subdominio
backend: enforceCompanyMatch → header company == JWT.company ? sigue : 403
```

### 3.3 Decisiones técnicas (con trazabilidad)

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Slug = campo en `companies`, capa de resolución (no reemplaza `company`) | EARS §4 (resolución) + D-087 | Refactor de identidad `nomComercial`→docId (descartado: caro, toca ~10 `.where` + paths Firestore). |
| Token de handoff stateless (JWT TTL 45s + `jti`) | EARS §4 (handoff) + §5.2 seguridad | Pasar el JWT de sesión en la URL (descartado: fuga por logs/referer); colección `handoff_tokens` (descartado: regla "no colecciones nuevas"). |
| Enforce `company` header == JWT.company | EARS §4 (tenant↔JWT) + R-04 | Cablear `multiTenant.js` completo (descartado por ahora: valida contra Firestore/colección `user_company_access` que no está poblada; se hace la validación mínima suficiente). |
| CORS por regex `*.katuq.com` | EARS §4 (CORS) | Agregar cada subdominio a la allowlist (descartado: no escala). |
| `resolveTenantBaseUrl(company)` para URLs absolutas | EARS §4 (URLs tenant-aware) + R-01 | Derivar del host del request (descartado: flujos server-to-server de pago/correo no ven el host). |

## 4. Modelo de datos
`companies/{docId}` (aditivo, sin migración destructiva):
```
subdomain:               string   // slug único, lowercase, ^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$
subdomainAliases:        string[] // slugs previos tras rename → 301 (default [])
subdomainRoutingEnabled: boolean  // feature flag por empresa (default false)
```
- Índice: `where('subdomain','==',slug)` es single-field (auto-indexado, sin índice compuesto).
- `enrichCompanyData` (`utils/onboarding-defaults.js:327+`) setea `subdomain` al crear (onboarding.js:88 / diagnostics.js:1033).
- Backfill: script `scripts/backfill-subdomains.js` con **`--dry-run` obligatorio primero** (regla del repo), slug desde `nomComercial` (normalizado + colisión → sufijo `-2/-3`), acotable `--company="X"`.

## 5. Contratos (API)

- `GET /v1/tenant/resolve/:slug` — **público, sin auth**. `200 { company, nomComercial, logo, active }` (subset seguro) · `404` no existe/reservado/inactivo. Cacheable (`Cache-Control`).
- `POST /v1/tenant/handoff` — **auth (JWT central)**. `200 { subdomain, handoffToken }` · `404` empresa sin slug · `401`.
- `POST /v1/tenant/handoff/redeem` — **público con token**. Body `{ token }`. `200 { sessionToken }` · `401` firma/TTL inválidos · `409` `jti` ya canjeado · `403` slug del token ≠ host.
- `PUT /v1/companies/:id/subdomain` — **auth superadmin**. Valida formato/unicidad/reservados. `200` · `409` colisión · `422` reservado/formato.

### 5.1 Idempotencia
- **Clave:** `jti` del token de handoff. **Ventana:** TTL 45s. **Duplicado:** segundo `redeem` → `409` (nonce ya usado). Enforcement del nonce: ver OQ-1.

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 2xx | resolución/canje OK | subset seguro / `sessionToken` |
| 401 | token handoff inválido/expirado; falta JWT | `{ error }` |
| 403 | header `company` ≠ JWT.company; slug del token ≠ host | `{ error }` |
| 404 | slug inexistente/reservado/inactivo | `{ error }` |
| 409 | `jti` ya canjeado; colisión de slug | `{ error }` |
| 422 | slug con formato inválido/reservado | `{ error }` |

## 6. Estrategia de testing
- **Contract tests (primero):** `resolve/:slug`, `handoff`, `handoff/redeem`, `PUT subdomain` — schema + status codes.
- **Integration:** login central → handoff → redeem → sesión en subdominio; `enforceCompanyMatch` bloquea mismatch; CORS acepta `<slug>.katuq.com` y rechaza `<reservado>.katuq.com`.
- **E2E:** Demo KAI en `demokai.katuq.com` — login, venta asistida, retorno de pasarela de pago al subdominio correcto, notificación con enlace correcto.
- **Unit:** generación de slug (normalización, colisión, reservados); `resolveTenantBaseUrl` (con/sin slug → fallback `sellercenter`).

## 7. Fases de implementación
1. **Fase A — Infra (ops, en paralelo):** wildcard proxy + TLS `*.katuq.com` → Firebase. Gate: `demokai.katuq.com` sirve la SPA.
2. **Fase B — Datos + contratos:** campo `subdomain` + `enrichCompanyData` + `PUT subdomain` (superadmin) + backfill `--dry-run`. Contract test de `resolve/:slug`.
3. **Fase C — Resolver frontend (happy path):** `TenantResolverService` en `APP_INITIALIZER` → `resolve` → fija `company` en interceptor + branding en `security.service`. Login directo por subdominio funciona.
4. **Fase D — Login central + handoff:** endpoints `handoff`/`redeem` + contract tests; ruta `/auth/handoff`; redirect desde el login central.
5. **Fase E — Seguridad:** middleware `enforceCompanyMatch` (feature-flagged, exime `x-api-key`); match post-login en frontend; CORS wildcard.
6. **Fase F — URLs tenant-aware:** inventario exhaustivo de las ~23 URLs hardcodeadas (`orders.js:7186`, `subscriptions.js:588`, `wompiProvider.js:108`, `epaycoProvider.js:85`, `integration.js:2323-3371`, `cronService.js:1111`, plantillas `services/notifications/*`) → `resolveTenantBaseUrl(company)` con fallback `sellercenter`.
7. **Fase G — Observabilidad + rollout:** logs + métrica de mismatch; piloto Demo KAI; luego habilitar por empresa.

## 8. Plan de rollout
- **Feature flags** (Artículo XII): `subdomainRoutingEnabled` por empresa (default OFF, dueño **Daniel**, retiro cuando todas migradas); `ENFORCE_COMPANY_MATCH` global (default OFF → ON tras validar que no rompe flujos; mismo dueño/retiro). El redirect del login central solo dispara si la empresa del usuario tiene `subdomainRoutingEnabled`.
- **Canary:** solo Demo KAI 1 semana → luego olas.
- **Rollback:** apagar `subdomainRoutingEnabled` (login central deja de redirigir, `sellercenter` sigue sirviendo); apagar `ENFORCE_COMPANY_MATCH` si bloquea algún flujo legítimo. `sellercenter.katuq.com` permanece operativo indefinidamente como red.

## 9. Riesgos técnicos
- **R-01** `localStorage` per-origen → retorno de pasarela DEBE volver al mismo subdominio (Fase F es prerequisito para habilitar pagos en un tenant con subdominio).
- **R-04** `enforceCompanyMatch` puede romper flujos que hoy mandan un `company` header distinto al del JWT (existen por el acoplamiento laxo actual) → rollout con flag + medición de tasa de 403 antes de forzar.
- **Infra** wildcard TLS/proxy: punto único + renovación de cert → runbook de ops.
- **Rename de slug** rompe callbacks en vuelo → `subdomainAliases` + 301 temporal.

## 10. Open questions (técnicas)
- **OQ-1 — Enforcement del `jti` de un solo uso sin colección nueva:** ¿Set en memoria con TTL (simple, se pierde en restart de PM2 — ventana de replay ≤45s) vs. reusar una colección existente para el nonce? Propongo **memoria + TTL 45s** (replay window mínima; el token ya expira solo). Confirmar.
- **OQ-2 — Regex CORS:** `^https://[a-z0-9-]+\.katuq\.com$` combinado con la allowlist actual para orígenes no-tenant (`claude.ai`, `julsmind.com`). Confirmar que ningún subdominio hostil/reservado se cuele (validar contra la lista de reservados).
- **OQ-3 — `enforceCompanyMatch` global vs por-router:** global es más limpio pero debe eximir el path `x-api-key`/`system_agent` (agentes KAI, `auth.js:10-17`) que no lleva `company`. Confirmar alcance.
