## Context

El backend ya tiene el middleware correcto: `middleware/tenant.js:42-70` (`requireJwtTenant`).
- Toma la empresa de `req.userInfo.company`, que viene del JWT firmado.
- Rechaza con 403 `TENANT_MISMATCH` si `header.company`, `body.company`, `body.companyId` o `body.empresa` no coinciden. Compara sin mayúsculas ni espacios.
- Deja `req.tenant` y reescribe `req.headers.company` con la empresa del token.

Lo usan ~35 routers. Reportes y la consola de plataforma quedaron por fuera. La evidencia de cada ruta está en `proposal.md`.

`middleware/auth.js:11-19` tiene un bypass por `x-api-key` que deja `req.user = 'system_agent'` sin `userInfo`. `requireJwtTenant` lo rechaza (`TENANT_NOT_IN_JWT`). Se buscaron consumidores de `/v1/reports/*` y de las rutas de `companies` tocadas en `KAI/kai`, las apps iOS/Android, `katuq_support` y el propio backend. No hay ninguno con llave de servicio.

### Cómo trabaja hoy el Super Administrador (lo que define si esto lo rompe)

1. **El front nunca cambia de empresa.**
   - `localStorage['user']` se escribe al iniciar sesión, con la respuesta del backend (`shared/services/firebase/auth.service.ts:132`).
   - Después solo se vuelve a guardar el mismo objeto con otro campo: tema (`header.component.ts:130`), idioma (`languages.component.ts:72`), perfil (`edit-profile.component.ts:125, 162`) y contraseña (`change-password.component.ts:52`).
   - Ningún código asigna otra empresa a `user.company`. No hay pantalla ni función de "cambiar empresa" o "entrar como": la búsqueda de `switchCompany`, `cambiarEmpresa`, `impersonat`, `suplantar` y `loginAs` da cero resultados.
   - `currentCompany` (`security.service.ts:16`, `app.component.ts:314`, `auth.service.ts:353`) solo guarda en caché la ficha de la empresa. El interceptor no lo lee.
2. **El interceptor manda siempre la empresa de la sesión.**
   - `shared/services/interceptor/http.interceptor.ts:228-279` toma `company` de `localStorage['user'].company` y lo aplica con `setHeaders` a `back.katuq.com`, `api.katuq.com` y `localhost:3300`.
   - `setHeaders` reemplaza cualquier `company` que haya puesto un servicio (`import-api.service.ts:69`, `onboarding.service.ts:121`, `provider-dashboard.service.ts:74`, `katuq-intelligence.service.ts:49`).
3. **El JWT se firma una sola vez, en el login, con la misma empresa que recibe el front.**
   - `controllers/authentication.js:131` hace `user.company = userData.empresa`, y la respuesta devuelve `company: userData.empresa` (:216). El token sale de `services/index.js:7-24`.
   - No hay endpoint que lo vuelva a emitir para otra empresa: `createToken` solo aparece en `authentication.js:217` y en el login viejo `login.js:55`.
4. **Conclusión.**
   - En toda sesión del front, la cabecera `company` es igual a la empresa del JWT.
   - El Super Administrador u operador de Julsmind trabaja con la sesión "Julsmind". A otras empresas llega solo por rutas que reciben la empresa destino de forma explícita:
     - `/v1/companies/:id/...`, con `requireOwnCompanyOrPlatform` (D-359);
     - la consola (`/overview`, `/billing-overview`, `/estado-ciclo` con `companyId` en el cuerpo);
     - En vivo global (`/v1/analytics/en-vivo/global/*`).
   - En el constructor de reportes el Super Administrador ve los reportes de Julsmind, como hoy. Ver los de otro comercio exige editar la cabecera a mano, que es justo el hueco.
   - **`requireJwtTenant` no le rompe nada en reportes, y el panorama sigue abriendo porque su JWT dice Julsmind.**
5. **El rol "Super Administrador" no es la plataforma** (`nav.service.ts:224`). El candado es la empresa Julsmind, como en D-359 (`companyAccess.js:28, 49`) y en `getTicketsResumen` (`platformOverview.js:476-477`). Un Super Administrador de otro comercio no abre la consola, ni hoy ni después.

## Goals / Non-Goals

**Goals:**
- Que ninguna ruta con sesión de `routers/reports.js` entregue o escriba datos de una empresa distinta a la del JWT.
- Que el candado "solo Julsmind" de `routers/companies.js` dependa del JWT, con una sola regla.
- Que `/all` y `/brand-kit` dejen de creer en la cabecera.
- Pruebas de contrato que fallen si una cabecera o un cuerpo con otra empresa recibe algo distinto de 403, o si una ruta nueva de esos routers queda sin candado.
- Saber, después del despliegue, si algún uso legítimo se rechaza.

**Non-Goals:**
- Las rutas de `companies` sin validación de empresa ni de rol de plataforma. Necesitan otro diseño porque las usan también los comercios.
- Los routers de analítica y tableros con el mismo patrón (ver "Hallazgos adicionales").
- Cambios en el front.
- Un modo "entrar como" para el Super Administrador.
- Corregir o despublicar lo que encuentre la auditoría.

## Decisions

### D1. Reportes: `auth, requireJwtTenant` en cada ruta con sesión
- Las 9 rutas pasan a `router.<verbo>(ruta, auth, requireJwtTenant, handler)`.
- `getCompany(req)` desaparece y los handlers usan `req.tenant`. Se van con él los respaldos `x-company` y `req.user?.company`.
- Las rutas `/public/*` siguen sin sesión y siguen usando `report.ownerCompany`.
- Alternativa: `router.use(auth, requireJwtTenant)` después de las públicas. Se descarta porque una ruta desconocida respondería 401 en vez de 404, y porque se pierde el patrón por ruta que usa el resto del backend (D-359, D-410) y que el verificador de rutas revisa.
- Alternativa: comparar en cada handler. Se descarta: duplica la regla en 9 sitios.
- Los cuerpos no chocan con el middleware:
  - la `spec` de `/query` no lleva empresa (`report-spec.interfaces.ts`);
  - el reporte guardado lleva `ownerCompany`, que `requireJwtTenant` no mira y el repositorio sobrescribe (`reports.repository.js:51, 63`).

### D2. Visibilidad de `/list` con la identidad del JWT
- `repo.list(req.tenant, req.userInfo.email, req.userInfo.role || req.userInfo.rol)`. Hoy `req.user?.email` siempre es `undefined` (`req.user` es el `sub`) y cae a las cabeceras `email` y `rol`.
- Efecto: el correo es el mismo que mandaba el interceptor, y el rol, que antes no llegaba, ahora llega. Un reporte compartido por rol pasa a verse, como se pretendía. Ningún reporte deja de verse.

### D3. Candado único de plataforma: `requirePlatformTenant`
- Va en `middleware/companyAccess.js`, que ya tiene `TENANT_PLATAFORMA` y la regla de D-359.
- Exporta:
  - `esSesionDePlataforma(req)`: `normalizeTenant(getJwtTenant(req)) === normalizeTenant("Julsmind")`;
  - el middleware, que responde 403 `TENANT_NOT_IN_JWT` sin empresa en el token y 403 `PLATFORM_ONLY` si la empresa no es Julsmind.
- Rutas:
  - `GET /overview` y `GET /billing-overview`: `auth, requireJwtTenant, requirePlatformTenant` (más `ONLY_ADMIN` donde ya estaba);
  - `GET /:id/historial-estado` y `GET /:id/pedidos-excluidos`: se agrega `requirePlatformTenant` a lo que ya tienen;
  - `POST /estado-ciclo`: `auth, requirePlatformTenant, ONLY_ADMIN`, **sin** `requireJwtTenant`. Su cuerpo trae la empresa **destino** en `companyId`, y `requireJwtTenant` compara `body.companyId` (`tenant.js:23`): a Julsmind le daría `TENANT_MISMATCH` al suspender a un comercio.
  - Regla: `requireJwtTenant` va donde el cuerpo no trae una empresa destino.
- Los controladores cambian `req.headers.company !== "Julsmind"` por `!esSesionDePlataforma(req)`:
  - `platformOverview.js:156-158`;
  - `billingOverview.js:254-256`;
  - `companies.js:2281, 2399`;
  - `pedidosExcluidos.js:78`.

  Es defensa en profundidad: si alguien quita el middleware de la ruta, el controlador sigue cerrado y sigue rechazando antes de tocar Firestore, como exige `accessLock.test.js`.
- La comparación pasa de exacta a normalizada, igual que D-359 y `getTicketsResumen`.
  - Es seguro: el valor viene firmado, y el registro reserva cualquier nombre que empiece por "julsmind" (`services/registrationSecurity.js:601-606`).
  - El caso "'julsmind' en minúsculas no abre" de `accessLock.test.js` se reescribe: la cabecera ya no cuenta, y un JWT "julsmind" es Julsmind.

### D4. `/all` y `/brand-kit`: `requireJwtTenant`
- Son GET sin cuerpo y un PUT cuyo cuerpo (`KitDeMarca`, `sitios.service.ts:368-379`) no tiene campos de empresa.
- Con `requireJwtTenant`, la cabecera queda reescrita con la empresa del token (`tenant.js:66-68`). Los controladores siguen funcionando sin tocarlos. Por claridad se cambian a `req.tenant`.
- `getCompanies` (`companies.js:159`) compara contra "Julsmind" sobre la cabecera ya reescrita; se cambia a `esSesionDePlataforma(req)`.

### D5. Rechazos auditados en `audit_log_access`
- `requireJwtTenant` y `requirePlatformTenant` registran cada rechazo sin esperar respuesta, con la misma forma que `requireRole.logAccessDenied` (`requireRole.js:27-44`):
  - `method`, `path`;
  - `code`, `source` (de dónde vino la empresa pedida);
  - la empresa pedida;
  - el correo del JWT;
  - `ip`, `timestamp`.
- Nunca se guarda `authorization`. Si la escritura falla, la respuesta es la misma.
- Alternativa: `console.warn`. Se descarta por la regla "sin console.log de telemetría".
- Alternativa: solo Sentry. Se descarta porque no se puede consultar por empresa ni por código.
- Riesgo: `requireJwtTenant` es compartido. El cambio es aditivo y solo corre al rechazar. Va en una tarea aparte, con su prueba.

### D6. Sin interruptor
- Un flag que deje volver a creer en la cabecera mantiene el hueco abierto como opción (Art. XII).
- El riesgo de romper algo legítimo es bajo, porque el front siempre manda la empresa del JWT. La reversa es revertir el commit.

### D7. Auditoría de solo lectura
- `scripts/auditar-cruce-empresas-reportes.js`, con `--dry-run` por defecto y sin modo de escritura en este cambio. Lista:
  - reportes en `reports/{empresa}/items` cuyo `ownerEmail` es de un usuario de otra empresa (`users.empresa`), marcando los públicos y su entrada en `reportPublicIndex`;
  - empresas cuyo `brandKit.updatedBy` es de un usuario de otra empresa;
  - entradas de `historialEstado` con autor que no es de Julsmind.
- Salida: conteos y IDs, sin datos personales completos (correos enmascarados).

### D8. El front no cambia
- Un 403 `TENANT_MISMATCH` o `PLATFORM_ONLY` no cierra la sesión: `esSesionInvalida` (`http.interceptor.ts:147-167`) solo saca al login con 401, con `NO_ROLE_IN_JWT` o con un error que mencione "token". La pantalla muestra su error de siempre.
- Las respuestas 401 "Missing company header" de `/list` y `/:id` (`reports.js:166, 214`), que sí sacaban al login, dejan de alcanzarse en la práctica.

## Pruebas de contrato

Siguen el patrón de `tests/despachos/rutas.contract.test.js:82-98`: `router.handle` con `req`/`res` falsos, `auth` real con JWT firmado con `SECRET_TOKEN` de prueba, `requireJwtTenant` real y `soloLectura._usarLector`. Las dependencias se reemplazan por espías sobre el objeto del módulo:
- `firestore.engine.runQuery`;
- `reports.repository.*`;
- `sources.toPublic`;
- `metricasPropias.alcanceMetricas`;
- `admin.firestore` para `/sellers/wo` y para la auditoría.

**`tests/reports/empresaDelJwt.contract.test.js`**
1. En cada una de las 9 rutas, JWT A + cabecera B da 403 `TENANT_MISMATCH` y ningún espía de datos se llama.
2. JWT A + `body.company` B en `POST /query`, `POST /` y `PUT /:id` da 403 con `source: "body.company"`.
3. JWT A + cabecera A da 2xx, y el motor y el repositorio reciben "A".
4. JWT A sin cabecera: el motor recibe "A".
5. JWT "OH MY STORE" + cabecera " oh my store ": se atiende, y el motor recibe "OH MY STORE".
6. `x-api-key` válida + cabecera B da 403 `TENANT_NOT_IN_JWT`.
7. Sin token da 401.
8. En `/list`, con JWT e1 + cabecera `email` e2, `repo.list` recibe e1 y el rol del JWT.
9. D-349: `alcanceMetricas` y el motor reciben la misma empresa.
10. `/public/:id/query` sin token responde y usa `ownerCompany`.
11. Un rechazo escribe en auditoría ruta, código, origen y correo, sin `authorization`. Si la auditoría falla, la respuesta sigue siendo 403.
12. Verificador: recorre `router.stack`, y toda ruta que no empiece por `/public` debe tener `requireJwtTenant`, comparado por referencia.

**`tests/companies/candadoPlataforma.test.js`**
1. `requirePlatformTenant`:
   - JWT Julsmind: pasa;
   - JWT " julsmind ": pasa;
   - JWT A + cabecera Julsmind: 403 `PLATFORM_ONLY`;
   - sin empresa: 403 `TENANT_NOT_IN_JWT`.
2. `POST /estado-ciclo` con JWT Julsmind y `body.companyId` de otra empresa pasa el candado: no da `TENANT_MISMATCH`.
3. Con JWT A + cabecera Julsmind, `getBillingOverview`, `cambiarEstadoCiclo`, `getHistorialEstado` y `getPedidosExcluidos` responden 403 sin tocar Firestore.
4. `PUT /brand-kit` con JWT A + cabecera B da 403, y no hay `update` ni propagación de colores.
5. Verificador del router:
   - llevan `requirePlatformTenant`: `/overview`, `/billing-overview`, `/estado-ciclo`, `/:id/historial-estado`, `/:id/pedidos-excluidos`;
   - llevan `requireJwtTenant`: `/all`, `/brand-kit` (GET y PUT).

**`tests/platformMetrics/accessLock.test.js`** (se actualiza): JWT A + cabecera Julsmind da 403 antes de Firestore, JWT Julsmind pasa el candado y sin `userInfo` da 403.

## Risks / Trade-offs

- [Un cliente legítimo manda una cabecera distinta a su JWT, por ejemplo un `localStorage` editado o un token viejo de otra cuenta en la misma pestaña] → Recibe 403 sin perder la sesión. La auditoría lo muestra; volver a iniciar sesión lo corrige.
- [Consumidor no encontrado con llave de servicio] → Cero en la búsqueda. Si aparece, verá `TENANT_NOT_IN_JWT` en la auditoría, y la salida correcta es el MCP (empresa por credencial), no reabrir la ruta.
- [Volumen de `audit_log_access` si alguien insiste] → Mismo riesgo que ya acepta `requireRole`. Solo se escribe al rechazar.
- [Enlaces públicos maliciosos creados antes del arreglo] → No se cierran solos. La auditoría D7 los lista para que Daniel decida.
- [Login viejo `/v1/login` (`login.js:49`): firma `empresa || company`] → Un usuario sin `empresa` y con el heredado `company: "Julsmind"` tendría alcance de plataforma en toda ruta por JWT, no solo en estas. El front usa `/v1/authentication`. Se reporta como hallazgo aparte.

## Migration Plan

1. Rama del backend desde la punta de `main`. Pruebas primero (tareas 1-2), después las rutas.
2. `npm run test:reportes-empresa-jwt`, `test:company-access` y `test:platform-overview` en verde. Además, la suite de reportes existente (`tests/reports/baseFilters.test.js`).
3. Auditoría D7 con `--dry-run`, de solo lectura, contra Firestore. Resultado a Daniel antes de desplegar.
4. Desplegar el backend por el procedimiento habitual (EC2/PM2). El front no se publica.
5. Verificación con cuentas reales, sin pruebas de ataque:
   - con un comercio: Dashboards (correr, listar, guardar, editar y borrar un reporte de prueba), crear usuario (vendedores WO) y kit de marca en Sitios;
   - con Julsmind: consola (panorama, cobros, historial) y un cambio de estado sobre la empresa demo FLORECER, ida y vuelta.
6. Durante 48 h, revisar `audit_log_access` por `TENANT_MISMATCH`, `TENANT_NOT_IN_JWT` y `PLATFORM_ONLY` en estas rutas. Lo esperado desde pantallas reales es cero.
7. **Reversa:** `git revert` del commit del backend y reinicio del proceso. No hay datos que deshacer; las entradas de auditoría son inocuas. Toma minutos.

## Hallazgos adicionales (fuera de alcance, con evidencia)

- **Críticos, `routers/companies.js`, sin validar empresa:**
  - `POST /edit` (:363 → `companies.js:217-239`): cualquier Administrador de cualquier comercio actualiza por NIT la empresa que quiera, con `docRef.update(req.body)`. Puede tocar plan, cortesía o bloqueo.
  - `POST /delete` (:387 → `companies.js:1585`): borra cualquier empresa.
  - `POST /changeStatus` (:313 → `companies.js:483`): bloquea cualquier empresa.
  - `GET /active` (:80): lista todas las empresas activas a cualquier sesión.
  - `GET /filter` (:99), `POST /byName` (:407) y `POST /` (:54): empresa por cuerpo.
  - `POST /updateAuthorizationCodes` (:419) **sin `auth`**: rota el `authorizationCode` de todas las empresas (`companies.js:299-318`).
- **Crítico, PII sin sesión:** `POST /v1/analiticas/data` (`routers/analiticas.js:8` → `controllers/analiticas.js:13-60`) devuelve nombre, dirección y teléfono de la colección `data` por rango de fechas.
- **Empresa por cabecera, solo `auth`:**
  - `/v1/analytics/*` (`routers/analytics.js:8-48` → `controllers/analytics.js:23, 168, 991, 1087, 1342`). Además, `getGlobalMetrics` (:316) y `getStoresData` (:535) leen todas las empresas sin candado de plataforma.
  - `/v1/analytics/pedidos/*` (`analyticsPedidos.js:12-18` → controlador :19, 225, 405).
  - `/v1/analytics/logistica/*` (`analyticsLogistica.js:8-12` → :19, 397, 722).
  - `/v1/analytics/inventario/*` (`analyticsInventario.js:7, 10` → :95, 221).
  - `/v1/analiticas/inventario/*` (`analiticas.js:17-43` → :137, 228, 341, 431, 541).
  - `/v1/dashboard/*` (`logisticsMonitoring.js:63-379` → `logisticsMonitoringController.js:27, 112, 152, 266, 327, 428`).
- **Login viejo:** `/v1/login` (`index.js:501` → `login.js:49`), ver Riesgos.
- **Dentro de la misma empresa, reportes:**
  - `GET /v1/reports/:id` no aplica visibilidad (`reports.js:210-224`);
  - `ownerEmail` sale del cuerpo (`reports.repository.js:51, 63`; `report-builder.component.ts:682-701`).
- **MCP:** `run_katuq_report` no pasa `soloMisMetricas` al motor (`tools/runKatuqReport.js:157-163`).

## Open Questions

- ¿El panorama y los cobros deben exigir también rol Administrador? Hoy cualquier usuario de Julsmind los ve, y aquí no se cambia.
- ¿Se retira `POST /v1/reports/export-pdf`? No tiene consumidor en el front: los PDF se generan en el navegador (`report-view.component.ts:158`, `report-builder.component.ts:960`).
- ¿Qué se hace con lo que encuentre la auditoría D7: despublicar, avisar al comercio o nada?
