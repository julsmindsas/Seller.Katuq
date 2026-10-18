## Why

Los reportes y la consola de plataforma deciden de qué empresa son los datos leyendo la cabecera `company`, y esa cabecera la escribe el navegador. Cualquier usuario con sesión, de cualquier comercio, puede cambiarla y leer pedidos, clientes, cartera y contabilidad de otra empresa. Con `company: Julsmind` también ve el panorama de todos los comercios: contactos, plan, facturación y métricas.

Lo encontró D-483 (NPS) al reutilizar el motor de reportes, y Daniel aprobó cerrarlo en un cambio aparte. La fuente `nps` no entra al constructor ni al MCP hasta que esto quede cerrado (tarea 6.1 de `nps-y-comentarios`).

Decisión: **D-484 (por reservar en el contrato)**.

## Qué está abierto hoy (evidencia, solo lectura de código)

Backend `katuq_admin_back_firebase/functions`:

- `routers/reports.js:20-27`: `getCompany(req)` devuelve `req.headers.company || req.headers['x-company'] || req.user?.company`. La usan las 9 rutas con sesión, que solo llevan `auth`:
  - lectura: `GET /sources` (:66), `GET /sellers/wo` (:89), `POST /query` (:128), `GET /list` (:162), `GET /:id` (:210);
  - escritura: `POST /` (:226), `PUT /:id` (:239), `DELETE /:id` (:252);
  - `POST /export-pdf` (:181) imprime en el PDF el nombre de la empresa que diga la cabecera.
- El motor filtra con la empresa recibida (`services/reports/engine/firestore.engine.js:336`). La rutina de "cada vendedor ve solo sus métricas" (D-349, `reports.js:152`) sí mira la empresa firmada (`services/metricasPropias.js:43-46`): hoy las dos pueden ser empresas distintas.
- **Peor que una lectura:** con la cabecera cambiada se puede guardar en otra empresa un reporte con `isPublic: true`. Queda en `reportPublicIndex` (`reports.repository.js:49-56`), y `POST /public/:id/query` lo corre **sin sesión** sobre esa empresa (`reports.js:45-56`). Ese enlace sigue funcionando aunque se cierre la cabecera.
- `GET /list` (:168-169) arma la visibilidad con `req.user?.email` y `req.user?.rol`. `req.user` es solo el id del usuario (`middleware/auth.js:56`), así que en la práctica usa las cabeceras `email` y `rol`, que manda el navegador.
- `GET /v1/companies/overview` (`routers/companies.js:198`) solo lleva `auth`. El controlador deja pasar si `req.headers.company === "Julsmind"` (`controllers/platformOverview.js:156-158`).
- **Mismo defecto, mismo router.** Son de una línea y por eso entran en este cambio:
  - candado "solo Julsmind" que lee la cabecera:
    - `GET /billing-overview` (`companies.js:213` → `billingOverview.js:254-256`);
    - `POST /estado-ciclo` (`companies.js:320` → `companies.js:2281`). Es una **escritura**: suspende o elimina cualquier empresa;
    - `GET /:id/historial-estado` (:322 → `companies.js:2399`) y `GET /:id/pedidos-excluidos` (:327 → `pedidosExcluidos.js:78`). Hoy alcanzan solo la empresa propia, por D-359;
  - empresa tomada de la cabecera:
    - `GET /all` (:67 → `companies.js:159-161`): con `Julsmind` lista todas las empresas;
    - `GET`/`PUT /brand-kit` (:182-183 → `companies.js:2175, 2211`): el `PUT` reescribe el kit de marca de otra empresa y propaga los colores a sus páginas.

D-359 ya dejó anotados como pendientes `/overview` y `/estado-ciclo`.

## What Changes

- Toda ruta con sesión de `routers/reports.js` toma la empresa **de la sesión firmada**. Si el navegador pide otra empresa (en la cabecera o en el cuerpo), el servidor responde 403 `TENANT_MISMATCH` sin consultar datos. Una sesión sin empresa recibe 403 `TENANT_NOT_IN_JWT`. Eso incluye el bypass por llave de servicio, que hoy ningún consumidor usa en estas rutas.
- `GET /v1/reports/list` arma la visibilidad con el correo y el rol de la sesión, no con cabeceras.
- Las rutas "solo Julsmind" de `routers/companies.js` (`/overview`, `/billing-overview`, `/estado-ciclo`, `/:id/historial-estado`, `/:id/pedidos-excluidos`) deciden por la empresa de la sesión, con un único candado de plataforma. Si dice Julsmind, pasa; la cabecera no cuenta.
- `GET /all` y `GET`/`PUT /brand-kit` toman la empresa de la sesión.
- Las rutas públicas de reportes (`/public/:id`, `/public/:id/query`) no cambian.
- Auditoría **de solo lectura** de lo que el hueco pudo dejar: reportes guardados por usuarios de otra empresa, enlaces públicos que apuntan a ellos, kits de marca escritos desde otra empresa y cambios de estado de empresa hechos por alguien que no es de Julsmind. Corre primero con `--dry-run` y no corrige nada. Retirar algo es otra decisión.
- Cada rechazo de empresa queda en `audit_log_access`, la colección que ya usa `requireRole`. Así se ve si tras el despliegue hay tráfico legítimo rechazado.
- **Sin cambios en el front.** El interceptor ya manda como `company` la misma empresa que viene firmada en la sesión.

Ningún cambio es **BREAKING** para pantallas o clientes legítimos. Solo deja de responder lo que hoy pide una empresa distinta a la de la sesión.

## Capabilities

### New Capabilities
- `reports-tenant-isolation`: el constructor de reportes (consultar, listar, abrir, guardar, editar, borrar, fuentes y vendedores) solo entrega o escribe datos de la empresa de la sesión, y la visibilidad usa la identidad de la sesión.
- `companies-tenant-isolation`: la consola de plataforma y las rutas de `companies` que hoy creen en la cabecera se deciden por la empresa de la sesión: candado único "solo Julsmind", kit de marca y listado.

### Modified Capabilities
- Ninguna. No existe spec previa de reportes ni de empresas en `openspec/specs/`.

## Impact

- **Backend:** `routers/reports.js`, `routers/companies.js`, `controllers/platformOverview.js`, `controllers/billingOverview.js`, `controllers/companies.js` (`cambiarEstadoCiclo`, `getHistorialEstado`), `controllers/pedidosExcluidos.js`, `middleware/companyAccess.js` (candado de plataforma) y `middleware/tenant.js` (auditoría del rechazo). Pruebas nuevas en `tests/reports/` y `tests/companies/`; se actualiza `tests/platformMetrics/accessLock.test.js`. Un script de auditoría de solo lectura en `scripts/`.
- **Front (Seller.Katuq):** sin cambios de código. Consumidores revisados:
  - reportes: `shared/services/dashboard/reports.service.ts`, usado por `dashboard-home`, `report-builder`, `report-view`, `report-public` y `crear-usuarios`;
  - empresas: `services/companies.service.ts:677, 686, 929, 967, 991`, `components/sitios/sitios.service.ts:695, 699`, `shared/services/servicios.service.ts:112, 554` y `shared/services/maestros/maestro.service.ts:467, 470`.
- **MCP:** sin cambios. Las tools de reportes (`tools/runKatuqReport.js`, `listKatuqReports.js`, `createKatuqReport.js`) toman la empresa de la credencial (`middleware/mcpAuth.js:114, 218, 277`), no de una cabecera libre.
- **ADK/KAI, apps móviles y app de Support:** no consumen estas rutas (búsqueda en `KAI/kai`, `Katuq.iOS.Gestion`, `Katuq.Android.Gestion` y `katuq_support`).
- **Datos:** sin colecciones nuevas, sin migraciones, sin escrituras de datos de negocio.

## Constitución

- Art. III (constitución sobre conveniencia): se quita la confianza en un dato del cliente, aunque "siempre ha funcionado así".
- Art. VII (observabilidad): los rechazos quedan en `audit_log_access`.
- Art. VIII (test-first para contratos): pruebas de contrato con los middlewares reales antes de tocar las rutas.
- Art. XI (datos sensibles fuera del log): la auditoría guarda ruta, código, correo de la sesión y empresa pedida; nunca el token.
- Art. XII (ningún flag para siempre): no se agrega interruptor. La reversa es revertir el commit.

## No-goals

- Las rutas de `companies` que no validan la empresa ni el rol de plataforma necesitan su propio diseño: `/changeStatus`, `/create`, `/edit`, `/delete`, `/active`, `/filter`, `/byName`, `POST /` y `/updateAuthorizationCodes` (esta última, sin `auth`). Van en otro cambio, con prioridad alta.
- Los routers de analítica y tableros que también leen la cabecera (`/v1/analytics/*`, `/v1/analiticas/*`, `/v1/dashboard/*`). Se listan en `design.md`.
- La visibilidad interna de `GET /v1/reports/:id` y el `ownerEmail` que manda el cliente al guardar. Son de dentro de la misma empresa y cambian comportamiento.
- Despublicar o borrar reportes encontrados por la auditoría.
- Un modo para que el Super Administrador "entre" a otra empresa. Hoy no existe (ver `design.md`).

## Riesgos sobre módulos sensibles

- No toca pedidos, inventario ni consecutivos. Los reportes de pedidos y contabilidad solo se leen.
- `POST /estado-ciclo` es una escritura sobre el ciclo de vida de una empresa. El cambio solo restringe quién la ejecuta; la transición, el historial y los campos escritos no cambian.
- `PUT /brand-kit` escribe en `companies` y en las páginas del comercio. El cambio solo fija de qué empresa; lo que se escribe no cambia.
