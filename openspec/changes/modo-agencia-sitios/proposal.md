# Modo agencia en Sitios: acceso a varios comercios con permisos que cada comercio otorga y revoca

> Estado: **propuesta para aprobación.** Toca autenticación y aislamiento entre
> empresas. No se implementa nada hasta aprobar proposal, design y tasks.

## Why

Ticket 1253 (F5-29), parte 2. Una agencia que maneja las páginas de varios
comercios necesita entrar a cada uno desde un solo panel. Solo debe ver y editar
los comercios que la autorizaron, y cada comercio debe poder quitarle el acceso
cuando quiera. Además pide comentarios internos para aprobar cambios. La parte 1
ya está publicada (D-478: `rolesPublicar`, historial de versiones y
programación), y el contrato deja el modo agencia pendiente de propuesta.

Hoy (leído en el código el 2026-10-17, backend `backend-aws-security` 23bc2fa9):

- **El token sirve para una sola empresa y no se puede invalidar antes de que venza.**
  `createToken` (`functions/services/index.js`) firma con `jwt-simple` y
  `SECRET_TOKEN` estos datos: `sub`, `role`, `email`, `company`, `name`,
  `vendedorIdWO`, `vendedorNombreWO`, `iat` y `exp` (24 horas). No lleva alcance,
  concesión ni versión. Una vez emitido, vale hasta que vence.
- **Un correo es un usuario, y un usuario es de una sola empresa.**
  - El login (`controllers/authentication.js`, `construirSesion`) busca el usuario
    por correo y toma el primero que encuentra.
  - La empresa sale de `users.empresa` y el rol de `users.roles`; el menú sale de
    `roles` (`rol` + `empresa`).
  - Crear un usuario (`controllers/users.js`) responde 409 `USER_EMAIL_EXISTS` si
    el correo ya existe en cualquier empresa, y cuenta contra el `maxUsers` del
    plan.
  - Hoy, entonces, una agencia necesita un correo distinto para cada comercio, y
    cada uno ocupa un cupo del plan de ese comercio.
- **La empresa se fija con la sesión firmada.**
  - `middleware/auth.js` decodifica el token, deja `req.userInfo` y engancha
    `soloLectura`, que bloquea las escrituras de una empresa suspendida según el
    `company` del token.
  - `middleware/tenant.js` (`requireJwtTenant`) se monta por ruta: fija
    `req.tenant` desde el token y responde 403 `TENANT_MISMATCH` si el header o el
    cuerpo piden otra empresa.
  - En `middleware/companyAccess.js`, solo la plataforma (`TENANT_PLATAFORMA` =
    Julsmind) entra a otra empresa; un comercio solo entra a la suya.
- **Hoy solo la plataforma accede a otra empresa.**
  - La consola (`requirePlatformTenant`) y En vivo con `empresa`, en solo lectura
    (`routers/analyticsEnVivo.js`), son exclusivas de la sesión Julsmind.
  - En el Seller no hay selector ni cambio de empresa: no existen `cambiarEmpresa`,
    `switchCompany` ni nada parecido.
  - `HttpInterceptor2` (`shared/services/interceptor/http.interceptor.ts`) arma
    `Authorization`, `company`, `user`, `usage-code` y `email` desde
    `localStorage['user']`.
  - La empresa activa vive en `localStorage['currentCompany']` (`SecurityService`).
    Varios servicios la leen directamente, y el `localStorage` lo comparten todas
    las pestañas.
- **Hay código de acceso cruzado sin montar.** `middleware/multiTenant.js`
  (`validateCompany`) consulta una colección `user_company_access`, pero ninguna
  ruta lo monta. Además lee campos que el token no trae (`user.uid`,
  `role === 'super_admin'`). No sirve como base; se menciona para no confundirlo
  con algo que funcione.
- **Roles.**
  - En `middleware/requireRole.js`, `isAdminFamilyRole` trata como administrador
    a cualquier rol que contenga la palabra «administrador».
  - `requirePermission`, el permiso por módulo, «no se usa todavía en producción».
  - En Sitios, `puedePublicarSitio` (`controllers/sites.js`) deja publicar a
    todos si `rolesPublicar` está vacío; la familia administrador siempre puede.
- **El editor de Sitios usa más que `/v1/sites`** (`components/sitios/sitios.service.ts`):
  - `/v1/onboarding/pagina-con-ia` y `/v1/companies/brand-kit`.
  - `/v1/media/upload`.
  - `/v1/productos/search/quick` y `/v1/productos/by-ids`.
  - `/v1/sites/acceso-cliente`, que toca clientes.
- **No hay comentarios en Sitios.** En `controllers/sites.js` no existe ninguno.

## What Changes

- **Concesión de acceso que otorga el comercio.**
  - Un administrador del comercio agrega el correo de un usuario de la agencia.
  - El alcance es fijo: **solo Sitios**.
  - El rol es uno de dos:
    - **Editor de agencia:** edita borradores y comenta. Nunca publica, aunque
      `rolesPublicar` esté vacío.
    - **Publicador de agencia:** además publica, restaura y programa, solo si
      `rolesPublicar` está vacío o lo incluye.
  - Los nombres de estos roles no contienen «administrador», para no caer en
    `isAdminFamilyRole`.
  - Tiene vigencia opcional y estados `activa` y `revocada`.
  - La empresa plataforma (Julsmind) nunca puede ser destino de una concesión.
- **Panel de la agencia, «Mis comercios».**
  - Lista solo las concesiones activas del correo de la sesión firmada, filtradas
    en el servidor.
  - Al elegir un comercio, la app pasa a ese comercio con el menú de Sitios
    únicamente.
  - «Volver a mis comercios» regresa a la sesión propia de la agencia.
- **Token por empresa, emitido solo si hay concesión vigente.** El servidor revisa:
  - el correo del token propio (nunca del cuerpo);
  - el usuario activo;
  - la concesión activa y vigente para ese comercio;
  - que el comercio no sea la plataforma.

  Emite un token corto con `company` = comercio, el rol de agencia, el alcance
  `sitios`, la concesión y la agencia de origen. `soloLectura` se sigue aplicando:
  un comercio suspendido tampoco recibe escrituras de su agencia.
- **Alcance aplicado en el servidor, negado por defecto.**
  - Un guardia en `auth.js`, como `soloLectura`, rechaza un token de agencia en
    toda ruta fuera de una lista explícita.
  - La lista incluye las rutas internas de Sitios y lo que el editor necesita
    para leer productos, subir imágenes y usar la marca y la IA de página.
  - Quedan fuera por defecto `acceso-cliente` y los contactos del sitio.
  - Un contract test recorre los routers y falla si una ruta nueva queda abierta
    a ese token.
- **Revocación inmediata.**
  - Cada petición con token de agencia comprueba que la concesión siga activa.
    Al revocarla, la siguiente petición falla aunque el token no haya vencido.
  - Esto se hace sin capa de caché nueva; el design decide entre leer en cada
    petición o usar tokens cortos con reemisión (pregunta 3).
- **Auditoría.**
  - Queda registro de quién otorgó, cambió o revocó una concesión.
  - Queda registro de cada token emitido y de cada escritura de la agencia
    (guardar, publicar, restaurar, programar, comentar), con concesión, correo y
    comercio, sin tokens.
  - El historial de versiones muestra al autor como «Nombre (Agencia X)».
  - El administrador del comercio ve la actividad de cada agencia.
- **Comentarios internos en el editor.**
  - Se pueden comentar el sitio, una página o una sección, responder y marcar
    como resuelto.
  - «Pedir aprobación» deja un comentario para quien puede publicar. Reemplaza el
    «avísale» del mensaje `SIN_PERMISO_PUBLICAR`.
  - Solo los ven los usuarios del comercio y las agencias con concesión activa.
    Nunca salen en la página pública. Se guarda texto plano, escapado y con
    límite de largo.
- **Diseño:** el panel y las pantallas de concesiones usan `_config-pagina.scss`
  (D-400); los comentarios usan los tokens de `design-system`.

## Capabilities

### New Capabilities
- `sitios-acceso-agencia`: concesiones por comercio y correo; token por empresa
  con alcance Sitios; revocación inmediata y auditoría.
- `sitios-comentarios-internos`: comentarios y pedido de aprobación dentro del
  editor, visibles solo para el comercio y sus agencias autorizadas.

### Modified Capabilities
_(ninguna; no hay spec vigente de Sitios en `openspec/specs/`)_

## No-goals

- Acceso de agencia a otros módulos: pedidos, clientes, inventario, productos
  (salvo la lectura que necesita el editor), reportes o configuración.
- Herramientas MCP u OAuth para la agencia (`routers/oauth.js` emite por la
  empresa propia del usuario) y canales de Opttia (Telegram, WhatsApp).
- Cobro o facturación a la agencia, o planes de agencia.
- Reusar `multiTenant.js` / `user_company_access`, o cambiar el login normal.
- Permisos granulares por módulo (`requirePermission`) para todos los roles.
- Varias empresas por usuario fuera del modo agencia.

## Riesgos

- **Fuga entre tenants.**
  - El alcance por token solo se sostiene si cada ruta que use la agencia toma la
    empresa de la sesión firmada.
  - Prerrequisito: un cambio previo en el backend (repositorio privado, por
    crear) que deje todas las rutas internas de Sitios, y las que usa el editor,
    con `requireJwtTenant` o su equivalente.
  - En el front, el `localStorage` compartido entre pestañas puede enviar el token
    de un comercio desde una pestaña que muestra otro. El design debe aislar la
    sesión por pestaña o detectar el cambio y recargar.
- **Escalamiento de privilegios.**
  - Un rol de agencia con «administrador» en el nombre heredaría todo.
  - Un editor que publica porque `rolesPublicar` está vacío rompería el permiso.
  - Una concesión creada por alguien que no administra ese comercio también.
  - Mitigación:
    - roles fijos;
    - revisión explícita del rol de la concesión;
    - otorgar solo con la familia administrador y la empresa del token.
- **Tokens vigentes después de revocar.** Hoy un token vale 24 horas sin lista de
  revocación. Sin comprobación por petición, una agencia revocada seguiría
  escribiendo hasta que su token venza.
- **Colecciones nuevas (requieren aprobación explícita):**
  - concesiones de agencia (p. ej. `agencyAccessGrants`), con sus eventos de
    auditoría;
  - comentarios por sitio (p. ej. `sites/{id}/comments`).
- **Costo:** si se lee la concesión en cada petición, son una lectura de Firestore
  más por cada llamada de la agencia, incluido el autoguardado del editor.
- **Módulos sensibles:** no se tocan `orders`, inventario ni consecutivos. El
  guardia de alcance debe rechazar ahí el token de agencia, y el contract test lo
  verifica.

## Preguntas para Daniel

1. ¿La agencia es una empresa en Katuq con sus propios usuarios, o un usuario
   suelto? Recomiendo empresa, porque encaja con `users.empresa` y `roles`.
2. ¿Se puede otorgar a un correo que aún no tiene cuenta (invitación y registro),
   o solo a usuarios existentes?
3. ¿Revocación al instante, con una lectura por petición, o tokens de unos 15
   minutos aceptando ese margen?
4. ¿La agencia puede ver los contactos y leads del sitio, que son datos
   personales, y enviar correos de prueba? La propuesta dice que no por defecto.
5. ¿La agencia cuenta como usuario del plan del comercio? ¿Gasta el cupo de
   «páginas con KAI» del comercio?
6. ¿Dónde se otorga el acceso, en Usuarios o en Sitios → Ajustes? ¿Hay vencimiento
   por defecto, por ejemplo 90 días?
7. «Pedir aprobación»: ¿avisa por correo o notificación, o solo dentro del editor?
8. ¿Se enciende con una bandera por comercio? Según el Artículo XII, necesita
   dueño y fecha de retiro.

Al aprobar, la decisión se registra como D-XXX en `specs/CONTRACT.md`; el último
ID al 2026-10-17 es D-480. Antes hay que revisar si otra sesión tomó un ID nuevo.
