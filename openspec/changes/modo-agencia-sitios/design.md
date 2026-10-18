# Diseño — Modo agencia en Sitios (D-503)

> Estado: **para aprobación**. Primero se aprueban las specs de `specs/` (tarea 0.1), y después este diseño y `tasks.md`. Si las specs o las decisiones cambian algo, el diseño y las tareas se ajustan y se vuelven a aprobar.
> Verificado en el código el 2026-10-18: backend `backend-aws-security` `d8f1903b` (rutas relativas a `functions/`); front `feature/venta-asistida-mejorada` `258b3fed` (rutas relativas a `src/app/`).

## Contexto verificado

- **Empresa fijada por el token.** F0, en el backend privado, garantiza y prueba que toda ruta de la lista permitida (§3) fije la empresa con el token. Sin F0 no se enciende la bandera.
- **Rutas de administrador.** `/v1/onboarding/pagina-con-ia` y `/editar` son solo para administradores.
- **`controllers/sites.js`.**
  - `disenarConIA` gasta el cupo de KAI del comercio.
  - Cualquier usuario del comercio puede usar `create`, `duplicar` y `generar`.
  - `vendedorEmail` recibe el reporte de KAI y pasa al `vendedor.email` de los pedidos del sitio (`utils/siteOrden.js`).
  - Publicar, restaurar y las programadas pasan por `publicarContenido`. Restaurar publica la versión completa, con su `tienda`.
- **Token.** Se decodifica en `auth.js` y en `decodeToken` (`services/index.js`, para `verifyRole`).
- **Uso.** `usageTracker`, que es global, registra cada petición en `apiUsage` o en SQS.
- **Guardias opuestos.** `guardiaSoloLectura` deja pasar si falla y guarda en caché 60 s. El de agencia niega si falla y no guarda nada.
- **Editor.**
  - Usa `BodegaService` (`GET /v1/bodegas/all`), solo en el panel Tienda.
  - Autoguarda 2,5 s después del último cambio.

## Decisiones por defecto (confirmar con Daniel, tarea 0.2)

| # | Por defecto | Razón |
|---|---|---|
| 1 | La agencia es una empresa de Katuq. La concesión va a un correo, y `agencyCompany` = `users.empresa` de ese usuario. | Encaja con `users`, `roles` y el login. |
| 2 | Se otorga a cualquier correo, sin invitación. Sirve cuando entra con una cuenta activa. La respuesta es igual exista o no la cuenta. | No toca el registro (D-323) ni revela cuentas. |
| 3 | Revocación al instante: se lee la concesión en cada petición, sin caché. El token dura 60 min y se renueva. | Sin capa de caché (§8). |
| 4 | Sin contactos, leads, métricas, reseñas, correo de prueba ni `acceso-cliente`. La lista y el detalle de sitios van con la proyección segura del editor y sin contadores. | Datos personales y comerciales. |
| 5 | No cuenta en `maxUsers`. «Diseñar con KAI» gasta el cupo del comercio. Sin «Página con IA» ni «Editar con IA». | No es usuario del comercio. |
| 6 | Se otorga en **Agencias** (desde Mis sitios), solo la familia administrador. Vigencia de 90 días, editable o sin vencimiento. | Usuarios mezclaría cupos y roles. |
| 7 | «Pedir aprobación» solo dentro de Katuq: comentario y aviso en Mis sitios. | Sin canales nuevos. |
| 8 | Bandera `agencyAccess` por comercio, para la agencia y los comentarios. Dueño: Daniel; retiro: 2027-04-30. `AGENCY_ACCESS_ENABLED` tiene el mismo dueño y se retira con la bandera, salvo una excepción registrada. | Artículo XII y D-385. |
| 9 | No borra sitios, no edita el kit de marca (lo lee) ni prueba la medición. | Fuera de «solo Sitios». |
| 10 | Una programada de una concesión revocada no sale. | Revocar corta todo. |
| 11 | Un sitio creado por la agencia queda con `vendedorEmail` vacío. | El reporte de KAI y los pedidos del sitio no quedan a nombre de la agencia. |
| 12 | Editor y publicador crean, duplican y generan. Solo el publicador publica, restaura, programa, quita de línea, une y cambia la dirección o el dominio de un sitio publicado. | Lo público lo decide quien publica. |
| 13 | La agencia edita la presentación: `bloques`, `tema`, `seo`, `paginas`, `enlaces`, `redirecciones`, nombre y dirección. El servidor conserva `draft.tienda` y `draft.analitica` con `req.agency`, y el front esconde Tienda y la medición. | Bodega, pagos, envíos, cupones, promesas (1221) y asesores gobiernan pedidos, pagos e inventario. Otra opción: solo el publicador los edita, y `GET /v1/bodegas/all` entra a F0 y a la lista. |
| 14 | Hasta 50 concesiones vigentes por comercio, en todo plan. | **Ojo:** con la 5, un comercio gratis podría crear su propia «agencia» para tener más editores. Otra opción: un tope según el plan. |
| 15 | Las escrituras derivadas siguen igual: la primera publicación de la agencia cuenta como la del comercio, y el uso de KAI y de la API se registra como hoy. | Son métricas del comercio; de ahí sale el cupo de KAI. |

## Fases

| Fase | Qué | Depende de |
|---|---|---|
| F0 | Backend privado: (a) la empresa fijada en cada ruta de la lista; (b) proyección segura de lista y detalle; (c) clasificación de rutas que se autentican fuera de `auth.js`; (d) reglas vivas de Firestore para las colecciones nuevas (0.5). | — |
| F1 | Concesiones, token, guardia, reglas de publicar y front. | F0 |
| F2 | Comentarios y «Pedir aprobación». | F1 |
| Después | Invitación, campana, IA de onboarding y métricas para la agencia. | Propuesta aparte |

## 1. Datos (colecciones propuestas en D-503; se confirman en 0.2 y 0.4)

**`agencyAccessGrants/{grantId}`.** Campos:

- `merchantCompany` (nomComercial) y `granteeEmail`, en minúsculas;
- `role` (`agency_editor` \| `agency_publisher`) y `scope: "sitios"`;
- `status` (`active` \| `revoked` \| `expired`) y `expiresAt` (ISO o `null`);
- `createdAt`/`By`, `updatedAt`/`By` y `revokedAt`/`By`, con `{email, name}`;
- `lastSessionAt` y `lastAgencyCompany`.

Reglas:

- **Vigente** = `active` y sin vencer. Se evalúa al leer; no hay cron. La unicidad, el tope, Mis comercios y el guardia cuentan solo las vigentes.
- Una vigente por comercio y correo, validada en transacción. Al otorgar, una `active` vencida del mismo correo pasa a `expired` en esa transacción.
- Solo consultas por igualdad (`merchantCompany`, `granteeEmail`, `status`). Se ordena en memoria, sin índices compuestos.

**`…/{grantId}/events`** (solo se agregan):

- `type`: `granted`, `updated`, `revoked`, `expired`, `session_issued`, `session_denied` o `write`.
- Lleva `at`, `actor {email, name, agencyCompany}`, `merchantCompany` y `details {role, expiresAt, method, route, siteId, status}`. Sin tokens.
- Los guardados se agrupan por sitio cada 10 min en `save_{siteId}_{AAAAMMDDHHm}`, con `count`.

**`sites/{siteId}/comments`** (F2): `company`, `target {kind: site|page|section, pageId, sectionId}`, `parentId`, `kind` (`comment` \| `approval_request`), `status` (`open` \| `resolved`), `text` (plano, hasta 2.000 caracteres), `author {email, name, agencyCompany, grantId}`, `createdAt`, `resolvedAt` y `resolvedBy`.

**Campos nuevos en documentos existentes:** `sites/{id}.approvalRequestsOpen`, `sites/{id}.publicacionProgramada.grantId` y `sites/{id}/versiones/{v}.porAgencia {name, agencyCompany, grantId}`.

**Requisito:** el cliente no lee ni escribe estas colecciones; solo escribe el backend. Las reglas de Firestore no están versionadas aquí. La tarea 0.5 las verifica en producción, en el backend privado.

## 2. Token de agencia y sesiones

- `services/agencia/token.js` (`createAgencyToken`) firma igual que `createToken`, que no cambia.
- Payload: `sub`, `role` (`Editor de agencia` \| `Publicador de agencia`), `email`, `company` (el comercio), `name`, `scope: "sitios"`, `grantId`, `agencyCompany`, `iat` y `exp` (60 min).
- Es de agencia si trae `scope`, `grantId` o `agencyCompany`. Si trae solo una parte, se rechaza. `decodeToken` rechaza todo token de agencia.

**`POST /v1/agency/sessions {grantId}`** va con el token propio y exige todo esto:

- el correo del token, nunca del cuerpo;
- un usuario activo, con ese correo e `identificacion = sub`;
- una concesión vigente;
- un comercio que no sea `TENANT_PLATAFORMA` ni la empresa propia;
- `agencyAccess` y `cicloVida.puedeEntrar` en el comercio;
- `AGENCY_ACCESS_ENABLED=true`.

Una cuenta de agencia en solo lectura no abre sesiones.

- **Respuesta:** `{token, expiresAt, role, scope, grantId, company:{nomComercial, nombre, logo, featureFlags}}`. Trae solo las banderas de Sitios, leídas con `select`.
- **Renovación:** por la misma ruta, hasta 30 veces cada 15 min por correo.

## 3. Guardia de alcance (`middleware/agencyScope.js`)

`auth.js` llama `guardiaAgencia` después de revisar la firma y el vencimiento, y antes de `guardiaSoloLectura`. Con un token normal no hace nada. Con uno de agencia:

1. Si la forma o el interruptor fallan: 403 `AGENCY_TOKEN_INVALID` o `AGENCY_ACCESS_DISABLED`.
2. Compara el método y `req.baseUrl + req.route.path`, la ruta que resolvió Express, con la lista del rol. No usa expresiones regulares sobre la URL.
   - Sin `req.route` (un `auth` montado con `app.use`): niega.
   - Fuera de la lista: 403 `AGENCY_SCOPE_DENIED`, anotado en `audit_log_access`.
3. Lee la concesión. Si no está vigente con el mismo comercio, correo y rol: 403 `AGENCY_GRANT_INACTIVE`. Si solo cambió el rol: `AGENCY_GRANT_CHANGED`.
4. Si la lectura falla: 503 `AGENCY_CHECK_FAILED`, y niega.
5. Si pasa, deja `req.agency {grantId, agencyCompany, role}`. Anota `write` en `res.on('finish')`.

Ningún error lleva «token» en `error`, para que el interceptor no cierre la sesión propia.

**Universo de CT1.** Cada ruta de Express cae en una sola clase:

- **(a)** pasa por `auth.js` o `decodeToken`: está en la lista o se niega;
- **(b)** es pública (`/v1/sites/public/*`, `/render*`, webhooks con firma): va en una lista revisada aparte;
- **(c)** se autentica de otra forma: F0 la clasifica.

Una ruta sin clase hace fallar CT1.

**Lista permitida** (`AGENCY_ALLOWED_ROUTES`; E = editor, P = publicador):

| Rutas | Roles |
|---|---|
| `GET /v1/sites/`: `all`, `templates`, `temporadas`, `venta-config` (solo lectura, checklist de publicar), `slug-disponible/:slug`, `dominio-estado`, `correos/predeterminados`, `:id`, `:id/versiones`, `:id/vista-en-fecha`, `:id/vista-compartible`, `:id/categorias` | E, P |
| `POST /v1/sites/`: `create`, `generar`, `:id/duplicar`, `:id/disenar-ia`, `:id/paginas/legales`, `:id/correos/vista-previa`; `PUT /v1/sites/edit` | E, P |
| `POST /v1/sites/`: `:id/publish`, `:id/versiones/:vid/restaurar`, `:id/programar`, `:id/unpublish`, `:id/unir` | P |
| `GET`/`POST /v1/sites/:id/comments`, `POST …/comments/:cid/resolve` (F2) | E, P |
| `GET /v1/productos/search/quick`, `POST /v1/productos/by-ids`, `POST /v1/media/upload`, `GET /v1/companies/brand-kit` | E, P |

**Fuera:**

- de Sitios: `acceso-cliente`, `:id/contactos`, `:id/correos/prueba`, `:id/metricas`, `:id/resenas`, `:id/medicion/prueba`, `DELETE /:id` y `kuvo/*`;
- `GET /v1/bodegas/all` (decisión 13);
- `PUT brand-kit` y todo `/v1/onboarding`, incluida `tienda-en-un-paso`.

## 4. Cambios en Sitios (`controllers/sites.js`)

- **Quién publica.** Con `req.agency`, `puedePublicarSitio` aplica esta regla a todo lo de la decisión 12:
  - el editor nunca publica;
  - el publicador publica si `rolesPublicar` está vacío o incluye `Publicador de agencia`.

  La agencia no cambia `rolesPublicar`. «Quién puede publicar» ofrece `Publicador de agencia`.
- **Presentación sí, operación no** (decisión 13). Con `req.agency`:
  - `edit` conserva `draft.tienda` y `draft.analitica`;
  - `restaurarVersion` toma de la versión solo la presentación y conserva la `tienda` y la `analitica` actuales.
- **Lista y detalle.** Con `req.agency`, `getAll` y `getById` pasan por la proyección del editor (`sitioParaEditor`) y omiten los contadores. F0 define qué excluye esa proyección.
- **Autor.**
  - `guardarVersion` y `programarPublicacion` guardan `porAgencia`.
  - `publicarProgramados` no publica si la concesión no está vigente, y deja `ultimaProgramacionFallida`.
  - `create`, `duplicar` y `generar` dejan `vendedorEmail` vacío.
- **Mensaje** (F2, tarea 4.1). Con los comentarios encendidos, `SIN_PERMISO_PUBLICAR` dice «Pide aprobación desde Comentarios». Sin ellos, queda el texto de hoy.

## 5. Comentarios (F2, `services/sitios/comentarios.js`)

- Siguen la spec `sitios-comentarios-internos`.
- El acceso pasa por `requireJwtTenant` y el guardia.
- El texto pasa por `bloquesUtil.sanitizar`.
- `approval_request` y `approvalRequestsOpen` se escriben en una transacción.
- Ni el render ni las rutas públicas leen `comments`.

## 6. Contrato HTTP (`routers/agencyAccess.js` en `/v1/agency`, con `auth` + `requireJwtTenant`)

| Rutas | Quién | Respuestas |
|---|---|---|
| `GET /grants`; `POST /grants {email, role, expiresAt}`; `PUT /grants/:id {role?, expiresAt?}`; `POST /grants/:id/revoke`; `GET /grants/:id/activity` | `requireRole(['Administrador'])` + `requireFeature('agencyAccess')` | 200/201; 400; 404; 409 `GRANT_EXISTS`/`GRANT_LIMIT`; 422 `GRANT_SELF`; 403 `GRANT_TARGET_PLATFORM`. Revocar es idempotente. La actividad trae los últimos 100. |
| `GET /my-grants`; `POST /sessions {grantId}` | Cualquier usuario con su token propio; la bandera se revisa en el comercio | 200; 403 `AGENCY_GRANT_INACTIVE`; 429 |

## 7. Front

- **`shared/services/session/session-context.service.ts`** (nuevo):
  - la sesión propia sigue en `localStorage['user']`; la delegada vive solo en `sessionStorage['kq_agency_session']`;
  - la delegada se descarta si `ownEmail` no coincide, si cambia la sesión propia (evento `storage`) y en `AuthService.SignOut`.
- **`HttpInterceptor2`:**
  - encabezados con `activeSession()`; `USE_OWN_SESSION` fuerza la propia;
  - renueva cuando faltan menos de 10 min;
  - un 401 o `AGENCY_GRANT_INACTIVE` cierran solo la delegada; `AGENCY_GRANT_CHANGED` renueva una vez; `AGENCY_SCOPE_DENIED` solo avisa.
- **Datos del comercio.** En modo agencia, `SecurityService`, `CompanyFeaturesService`, `sitios-lista.component.ts` y `sitio-editor.component.ts` leen la vista del comercio.
- **Módulo lazy `components/agencia/`:**
  - `AgencyAccessService extends BaseService`;
  - pantallas `/agencia/comercios` y `/agencia/accesos`;
  - `@include config-pagina` (D-400), componentes standalone y `OnPush`.
- **Marco** (`app-routing.module.ts`):
  - `{path:'sitios', canMatch:[ModoAgenciaMatch], component: AgenciaMarcoComponent}` va antes de `''`, sin menú, campana, NPS ni chat;
  - `SoloSitiosEnModoAgencia` va en el `canActivateChild` de `''` y en el `canActivate` de `onboarding`, `change-password`, `pricing`, `billing`, `agent-builder`, `live-audio` y `video-agent`, y devuelve a `/sitios`;
  - las rutas públicas no cambian; `login` y `registrarse` terminan la delegada;
  - una prueba recorre `routes` y falla si una ruta de primer nivel con sesión no tiene el guardia;
  - «Volver a mis comercios» termina la delegada y luego abre `/agencia/comercios`.

  Es experiencia: el servidor niega igual.
- **Se esconde:**
  - lo de «Fuera», el panel Tienda, la medición y `tienda-en-un-paso`;
  - los enlaces a `/productos`, `/pricing` y `/empresas`.
- **Historial:** «Nombre (Agencia X)».
- **F2:** panel con los tokens de `design-system`. «Pedir aprobación» aparece si `puedePublicar` es falso. Ninguna clase nueva contiene «p-».

## 8. Bandera, sombra, write-set, pruebas y costo

**Bandera.** `agencyAccess` va en `FEATURE_FLAG_NAMES` y en `COMPANY_FEATURE_FLAGS`.

- Se revisa al administrar concesiones, en Mis comercios y al emitir el token.
- Apagarla corta las sesiones nuevas; las abiertas vencen en 60 min o menos.
- Para cortar al instante: revocar, o correr `scripts/agency-revoke-all.js`, que simula sin `--execute`.
- `AGENCY_ACCESS_ENABLED` ausente = apagado.

**Modo sombra.** No aplica: el guardia niega por defecto y solo actúa sobre tokens que hoy no existen. Su equivalente es el piloto en FLORECER, con una empresa de prueba como agencia.

**Write-set de las rutas de agencia:**

- **Directas:**
  - `agencyAccessGrants` y sus `events`;
  - `sites/{id}`, con los campos de siempre más los de §1, sin `draft.tienda`, `draft.analitica` ni `rolesPublicar`;
  - `sites/{id}/versiones`, incluido el borrado pasadas 20;
  - `sites/{id}/comments`, `audit_log_access` y el bucket de medios.
- **Derivadas, del código existente:**
  - `site_events`: `opttia_pagina` al diseñar con KAI, y `sitio_publicado` la primera vez;
  - `companies.primeraTiendaPublicadaAt`, con merge, una vez por empresa;
  - `apiUsage` o SQS (`usageTracker`), como hoy.
- **Solo lectura:** `users`, `companies` (con `select`) y `products` (D-134).
- **Nunca:** `orders`, `inventory`, `inventoryMovement`, consecutivos, pagos, suscripciones, productos, precios, `users`, `roles` ni otro campo de `companies`.

**Contract tests** (`tests/agencia/`, con el Firestore falso de `tests/messaging`), primero y en rojo:

- **CT1:** universo y lista de §3. Ninguna entrada es de pedidos, inventario, consecutivos, pagos, suscripciones, escritura de productos, usuarios, roles, OAuth o MCP.
- **CT2:** el token. `createToken` queda igual, `decodeToken` lo rechaza e `isAdminFamilyRole` da falso.
- **CT3:** sesiones y 423. **CT4:** concesiones, con unicidad y tope.
- **CT5:** revocación y 503.
- **CT6:** quién publica, programadas, `vendedorEmail`, proyección sin contadores, y `tienda`/`analitica` intactas al guardar y al restaurar.
- **CT7:** cada escritura, directa o derivada; falla fuera del write-set.
- **CT8:** sin comentarios en el render ni en rutas públicas.
- **Front:** pruebas node de sesión, encabezados y recorrido de rutas.

**Observabilidad.** La telemetría va a `events` y `audit_log_access`, sin `console.log`. Los errores, con `console.error` y código. Sin tokens ni datos personales (Artículo XI).

**Costo por petición de agencia.**

- Siempre: una lectura de la concesión.
- Cada guardado suma el incremento de `save_*`; `apiUsage` ya existe para todos.
- Con el autoguardado: hasta unas 1.500 lecturas y 1.500 escrituras por hora de edición activa.

**Migraciones.** No hay ni backfill. La bandera se prende con `scripts/set-company-feature.js`, que simula por defecto.

## 9. Gates constitucionales

| Artículo | Cumplimiento |
|---|---|
| I, XIII | Las specs EARS (máximo 3 páginas) se aprueban antes que este diseño (0.1). |
| IV, V, X | Sin integraciones externas; revocar es idempotente. |
| VII, VIII, XI | Eventos y negaciones en Firestore sin tokens; CT1–CT8 primero, en rojo. |
| IX | Excepción registrada (Angular 14); lo nuevo, standalone y `OnPush`. |
| XII, XIV | Bandera e interruptor con dueño, fecha y retiro (6.1). Las respuestas van a `CONTRACT.md` bajo D-503. |

## Riesgos

- **Fuga entre tenants** si una ruta de la lista no fija la empresa: F0 es bloqueante y CT1 vigila.
- **Datos de la agencia en pantalla** si un componente lee `localStorage` directo: el piloto revisa cada pantalla.
- **Si Firestore falla, la agencia no guarda (503).** Es preferible a dejar pasar.
- **Plan gratis con agencia propia** (decisión 14).
