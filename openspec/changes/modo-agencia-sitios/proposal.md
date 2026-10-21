# Sitios: publicación segura, comparar versiones, comentarios y modo agencia (ticket 1253, F5-29)

> **Estado:**
> - **Propuesta original (modo agencia y comentarios):** aprobada (D-503, 18-oct). Diseño, specs, tareas y valores por defecto quedaron aprobados en bloque ese día (D-518 T·3). Se conserva abajo, en «Parte D y C».
> - **Ampliación de D-518 (21-oct):** en las secciones marcadas **NUEVO** o **MODIFICADO**. Aplica las decisiones aprobadas F5-29·1 a ·10. **Pendiente de aprobación de Daniel:** el texto de las specs nuevas o modificadas, el diseño §A, §B, §C y §D0, las tareas nuevas y las preguntas de abajo.
> - **Excepción: A·U (urgente) no espera esas aprobaciones.** Son los bugs de lo publicado que D-518 ·1 manda «corregir ya» y la seguridad que D-518 pone en el punto 2 del orden de trabajo. Restituyen lo que D-478 ya prometía, así que solo esperan las pruebas de caracterización y el diff aprobado por Daniel, uno a uno (design §A·U).
> - Revisado el 21-oct contra una crítica de 18 puntos: los cambios de esa revisión van marcados **[REVISADO]**.
> - Ticket 1253, cd `1dqlF3hDPnsjPBp1DJ1h`. Reabierto el 21-oct: todo lo pendiente sigue en este ticket (D-518 T·1).

## Ampliación D-518 (NUEVO, pendiente de aprobación)

### Why

El ticket pide cuatro cosas:

- roles de editor, publicador y administrador (dominio, pagos y pauta);
- historial de versiones **de cada página**, con fecha, autor, **comparar** y restaurar;
- programar la publicación;
- comentarios internos para aprobación, y un modo agencia que cada comercio otorga y revoca.

Sus criterios: «un editor no puede publicar; un cambio publicado se puede revertir en un clic» y «una agencia ve y edita solo los comercios que la autorizaron».

D-478 publicó el 17-oct quién publica, el historial con «Restaurar» y la programación. La lectura del 21-oct (D-518, informe privado) encontró que lo publicado no cumple todo lo que promete:

- **El administrador no siempre puede.** La pantalla dice «Los administradores siempre pueden», pero el servidor los rechaza si la lista no nombra «Administrador».
- **«Un editor no puede publicar» vale solo en los sitios donde se configuró la lista.** Hay caminos alternos (ver revisión privada, P-3 y P-4).
- **La programada publica el borrador del momento.** No vuelve a revisar el permiso ni el estado de la cuenta, y si falla nadie ve el motivo.
- **El autor de algunas acciones sale de un dato que manda el navegador** (P-5).
- **Hay cambios de lo publicado que no dejan versión:** «Unir» y la propagación de colores de Mi marca (P-8). Además, Opttia y «Quitar de línea» no cierran la programación pendiente (P-9): un sitio quitado de línea vuelve a salir a la hora programada. **[REVISADO]**
- **Hay hallazgos de seguridad en producción** que esta lectura encontró (ver revisión privada). Se cierran en A·U, primero y sin condición. **[REVISADO]**
- **Restaurar devuelve la tienda y la medición viejas y borra el borrador sin publicar.** Cada versión copia los tokens de la pauta (P-6).
- **Dominio, pagos y pauta los cambia cualquier rol.**
- **Comparar no existe.** D-467 (TX-33, ticket 1248) lo mandó a este ticket y ninguna propuesta lo recogía.
- **Los comentarios del diseño del 18-oct quedaban atados a la bandera de agencia,** aunque el ticket los pide para cualquier equipo.
- **El diseño del 18-oct dejaba el interruptor del modo agencia en el `.env`.** D-505 lo prohíbe.

### What Changes

Cuatro cambios. **A es propio y va primero**; B, C y D se apoyan en él. Dentro de A, **A·U va antes que todo** y no espera las preguntas. **[REVISADO]**

- **A·U. Urgente: bugs de ·1 y seguridad (NUEVO [REVISADO]).** Spec `sitios-publicacion-segura`, requisitos marcados (A·U); design §A·U.
  - **·1:**
    - la familia administrador siempre publica, y el servidor le dice al editor desde la carga quién es administrador y quién puede publicar;
    - el autor sale de la sesión firmada, también en lo publicado o creado por Opttia o MCP;
    - el motivo de la programada fallida se ve en el editor;
    - «Unir» deja versión;
    - Opttia y «Quitar de línea» cancelan la programación pendiente.
  - **Seguridad:** los arreglos de la revisión privada que están en producción (A·S1, F0·S1 y A·S4), sin condición.
- **A. Resto de los arreglos a lo publicado en D-478 (NUEVO).** Spec `sitios-publicacion-segura`, design §A.
  - **·2:** quién publica se decide para todo el comercio. Un sitio nuevo, duplicado, generado o creado por Opttia hereda la lista del comercio, y una página puede ser más estricta.
  - **·3:** la programada publica la foto del borrador tomada al programar, una sola vez aunque alguien reprograme o cancele mientras corre el barrido. Al ejecutarse revisa que quien la programó siga pudiendo publicar y que la cuenta pueda escribir; si no, no sale y queda el motivo. **[REVISADO]**
  - **·5:** dominio, medios de pago de la tienda del sitio y medición o pauta solo los cambia la familia administrador.
  - **·6:** restaurar devuelve la presentación de la versión con la tienda y la pauta actuales, guarda antes el borrador sin publicar (recuperable) y las versiones dejan de guardar tokens. Las existentes se limpian con un script que primero simula.
  - La pantalla muestra «Publicar», «Programar» y «Restaurar» solo a quien puede.
- **B. Comparar versiones (NUEVO).** Spec `sitios-comparar-versiones`, design §B.
  - **·4:** antes de restaurar, una lista en palabras de lo que cambia entre esa versión y lo publicado, por página y por sección, con el mismo «Esto cambié» de KAI. Lo que «Esto cambié» no sabe nombrar (fotos, productos, enlaces, videos) sale como «Otros cambios en <sección>»: nunca se dice «igual» si no lo es. **[REVISADO]**
  - **·9:** un solo historial por sitio, con resumen de qué páginas cambió cada publicación y un filtro por página. No se restauran páginas sueltas.
- **C. Comentarios y «Pedir aprobación» para cualquier equipo (MODIFICADO).** Spec `sitios-comentarios-internos`, design §C.
  - **·7:** empleados y agencias. Con su propia bandera por comercio, independiente del modo agencia.
- **D. Modo agencia (MODIFICADO).** Specs `sitios-acceso-agencia` y `sitios-agencia-invitacion`, design §D0.
  - **·8:** acceso por invitación a un correo concreto, como D-450. Se aparta de D-450 en tres puntos, con su razón en el design §D0.1: la persona acepta con su propia cuenta (en D-450 se completa sola), la respuesta es igual exista o no la cuenta (D-450 lo dice), y la invitación vence en 14 días. Medición y pauta solo si el comercio lo permite en la concesión; pagos y dominio nunca. **[REVISADO]**
  - **D-505:** el interruptor general pasa a `config/feature_flags.agencyAccessEnabled`.
  - **·10:** no se enciende en ningún comercio hasta cerrar las reglas de Firebase (ticket 1320).

### Capabilities

- **New:**
  - `sitios-publicacion-segura` (A);
  - `sitios-comparar-versiones` (B);
  - `sitios-agencia-invitacion` (D, sub-spec por el tope de 3 páginas).
- **Modified dentro de esta propuesta** (aún no archivadas en `openspec/specs/`): `sitios-comentarios-internos` y `sitios-acceso-agencia`, con los requisitos marcados **[MODIFICADO D-518]**.

### No-goals de la ampliación

- **Restaurar una página suelta (·9).**
- **Versionar cada cambio de KAI en el borrador** (pregunta 10).
- **Roles granulares por módulo para toda la app.** Los de facturación (FE-16, 1270) y conversaciones (1298, 1303) van por su lado. Aquí solo se decide quién publica en Sitios y qué campos son del administrador.
- **Una pantalla nueva de roles.** «Quién puede publicar» sigue con los roles de Katuq que el comercio ya tiene.
- **Tocar el pedido, el checkout o la conciliación.** A6 solo decide quién cambia la configuración de pagos de la tienda del sitio; no cambia cómo se cobra.
- **Revertir con «Restaurar» un cambio de pagos o de medición. [REVISADO]** Lo decidió D-518 ·6: restaurar conserva la tienda y la pauta de hoy. El criterio del ticket «un cambio publicado se puede revertir en un clic» queda cumplido para la presentación (secciones, páginas, diseño, textos, SEO, enlaces); los pagos y la medición se corrigen a mano en el editor, por un administrador (·5). Se declara aquí para que no sea un recorte silencioso.
- **La ronda de usabilidad de TX-38 (ticket 1251). [REVISADO]** Ese ticket pide repetirla al cerrar cada fase y depende de personas reales. Al cerrar A, B, C y D se le avisa a Daniel que hay una fase cerrada para la próxima ronda de TX-38; no es una tarea de esta propuesta.

### Riesgos de la ampliación (módulos sensibles)

- **Write-set de A y A·U [REVISADO]:**
  - escribe `sites/{id}` (publicado, borrador, estado, programación, motivo, lista del sitio al duplicar, autor), `sites/{id}/versiones` y el campo nuevo `companyConfig/{empresa}.sitiosRolesPublicar`;
  - **escrituras derivadas del código que ya existe**, que A no agrega pero sí ejecuta al publicar: `companies.primeraTiendaPublicadaAt` (con merge, una vez por empresa) y el evento `sitio_publicado` en `site_events`;
  - lee `users`, `companies` y `companyConfig`;
  - **nunca** escribe `orders`, `inventory`, `inventoryMovement`, consecutivos, `products`, precios, integraciones, `users`, `roles` ni otro campo de `companies`. Lo verifica el contract test CTA9.
  - Los arreglos de seguridad de A·U fijan de qué empresa se lee o escribe; no cambian qué se escribe.
- **Autorización y pagos:** A cambia quién publica (autorización) y quién cambia la configuración de pagos de la tienda del sitio. Va diff por diff con aprobación de Daniel, con pruebas de caracterización en verde antes de tocar el código (design A10).
- **Mismo archivo que F2-41:** `controllers/sites.js` y el editor tienen cambios de F2-41 sin commit. A empieza después de unir F2-41 (D-518, orden de trabajo).
- **Cambio para todos los comercios:** con A6, un rol que no es administrador ya no cambia pagos ni píxeles.
- **Seguridad [REVISADO]:** ver revisión privada. Lo que está en producción se cierra en A·U, primero y sin condición. Antes de fijar la empresa con la sesión en una ruta, se buscan sus consumidores con llave de servicio, porque esa llave dejaría de servirles (tarea A·U0).
- **Firebase abierto (1320):** mientras siga así, las versiones viejas con tokens se pueden leer por fuera de la API. Por eso A8 va con prioridad, y D no se enciende (·10).
- **Dos editores abiertos a la vez [REVISADO]:** el autoguardado de otra pestaña (cada 2,5 s) puede pisar el borrador recién restaurado o recuperado, sin aviso. Pasa hoy y C y D suman editores simultáneos. Mitigación en este cambio: restaurar y recuperar recargan el editor que los pidió, y el borrador anterior queda guardado (A7). Detectar la edición concurrente en las demás pestañas queda fuera; si hace falta, va en su propia propuesta.

### Preguntas para Daniel (con recomendación)

1. **¿A pasa a su propia carpeta** (`openspec/changes/arreglos-publicacion-sitios/`) al aprobarse, para desplegarlo sin esperar lo demás?
   - Recomiendo **sí**. Aquí quedó dentro de esta carpeta por la regla de la tarea. A·U no espera esta respuesta.
2. **Lista del comercio y lista de la página:** ¿se exigen las dos (intersección, la más estricta), o se retira la de la página y queda solo la del comercio?
   - Recomiendo la **intersección**: no rompe ninguna lista que se configuró con D-478 y deja que una página sea más estricta.
3. **Datos:** ¿apruebas el campo `companyConfig/{empresa}.sitiosRolesPublicar` y guardar la foto programada y los borradores guardados como documentos de la subcolección existente `sites/{id}/versiones`?
   - Recomiendo **sí**: no se crea ninguna colección nueva.
4. **Puesta en marcha de la lista por comercio:** ¿corremos un script que proponga, para cada comercio que ya tiene páginas restringidas, la lista del comercio (la intersección de sus listas)?
   - Recomiendo **simularlo, mostrarte el resultado y ejecutarlo con tu OK**. Sin eso, en esos comercios un sitio nuevo lo sigue publicando cualquiera.
5. **Programadas creadas antes de este cambio** (no tienen foto): ¿se cancelan con el motivo «Vuelve a programarla», o se publican como antes?
   - Recomiendo **cancelarlas con aviso**. Antes se cuentan (A·0); si no hay ninguna, la pregunta no aplica.
6. **Restaurar una versión de antes de «Unir»:** quita la página unida, y la dirección vieja quedaría redirigiendo a una página que ya no existe.
   - Recomiendo que la comparación lo **avise**, que restaurar exija permiso también en el sitio de origen y que **quite la redirección**, para que la dirección vieja vuelva a mostrar su página.
7. **«Pagos» de ·5:** ¿son solo los medios de pago (pago en línea, contra entrega, otras formas y cuotas), o también envíos, bodega, mínimos, cupones y promociones?
   - Recomiendo **solo los medios de pago**. Lo demás sale al público únicamente cuando alguien con permiso publica.
8. **Cuando alguien sin rol de administrador** guarda cambios en pagos o medición: ¿se conservan los guardados con un aviso, o se rechaza todo el guardado?
   - Recomiendo **conservar con aviso**: rechazarlo dejaría en bucle el autoguardado de una pestaña vieja.
9. **Mi marca también cambia lo publicado** (colores, ticket 1216). ¿La propagación a los sitios publicados respeta quién publica y deja versión? **[REVISADO]** La pregunta es solo sobre ese comportamiento; la seguridad de esa ruta ya no depende de ella y va en A·U sin condición.
   - Recomiendo **sí**: quien no puede publicar un sitio solo le cambia el borrador; quien puede, lo publica y queda la versión «colores de Mi marca».
10. **TX-33 (1248)** pide que cada cambio de KAI «quede en el historial». ¿Se versiona también el borrador?
    - Recomiendo **no en este cambio**. KAI ya muestra «Esto cambié», cada publicación queda con su comparación (B) y el «antes y después» de F4-39 sale de ahí. Si hace falta más, que vaya en una propuesta con F4-39.
11. **Al publicar, ¿se cierran solos los «Pedir aprobación» abiertos de ese sitio** («publicado por X»)?
    - Recomiendo **sí**: si no, el aviso de Mis sitios queda vivo después de aprobar.
12. **Invitación de agencia:** ¿Katuq le manda un correo al invitado?
    - Recomiendo **un solo correo**, con el mismo texto exista o no la cuenta, y un enlace a «Mis comercios» sin ningún token. D-450 no tenía avisos, pero sin el correo la agencia no se entera.
    - **[REVISADO]** Con un tope propio de correos de invitación por comercio y por día (propongo 20), aparte del tope de 50 concesiones: retirar y volver a invitar no debe sumar correos sin límite (detalle en la revisión privada).
13. **Comparar también «borrador contra publicado»** dentro de «Pedir aprobación», para que quien aprueba vea qué va a salir:
    - Recomiendo **sí**: es la misma función de B y no agrega datos.
14. **Permiso de medición de la agencia:** ¿incluye poner los tokens de conversión desde el servidor, o solo píxeles e identificadores?
    - Recomiendo que **los incluya, solo para escribir**: el editor nunca los recibe de vuelta.
15. **Piloto de C (`siteComments`):** ¿FLORECER primero, con dos usuarios de roles distintos?
    - Recomiendo **sí**.
16. **[REVISADO] Invitación «como D-450»:** D-450 (diseño A3 de `acceso-clientes-support`) agrega a un usuario que ya existe, deja pendiente al que no existe, la completa sola cuando la cuenta aparece y responde distinto si el correo no tiene cuenta. Esta propuesta pide **aceptación explícita**, responde **igual** exista o no la cuenta y **vence a los 14 días** (design §D0.1). ¿Se aceptan esas tres diferencias?
    - Recomiendo **sí**. Aceptar fija con qué cuenta y con qué empresa entra la agencia (un correo puede estar en varias empresas y el login toma el primero), y evita darle acceso a un correo que nunca lo pidió. La respuesta igual ya la aprobó la decisión 2 del 18-oct para no revelar quién tiene cuenta. El vencimiento evita invitaciones vivas para siempre, que en D-450 limita el tope de 20.
    - Si prefieres D-450 al pie de la letra: se completa sola al primer ingreso del correo, sin vencimiento, y la respuesta dice si hay cuenta.

## Parte D y C — propuesta aprobada el 18-oct (D-503)

> Texto aprobado, sin cambios salvo las marcas. Las preguntas 1 a 8 de esta parte se respondieron el 18-oct con los valores por defecto del design (aprobados en bloque). D-518 cambió la 2 (ahora es por invitación), la 7 (para cualquier equipo) y la 8 (interruptor en Firestore), y además la decisión 13 del design (la medición, solo con permiso en la concesión).

### Modo agencia en Sitios: acceso a varios comercios con permisos que cada comercio otorga y revoca

> Estado: **propuesta aprobada (D-503).** Toca autenticación y aislamiento entre
> empresas. Proposal, design y tasks se aprobaron en bloque el 18-oct; las partes que cambia D-518 esperan su propia aprobación.

#### Why

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

#### What Changes

> **MODIFICADO por D-518:** «Concesión de acceso que otorga el comercio» pasa a ser por invitación (§D0.1). Los comentarios valen para cualquier equipo (§C). El interruptor `AGENCY_ACCESS_ENABLED` pasa a `config/feature_flags.agencyAccessEnabled` (§D0.3).

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

#### Capabilities

##### New Capabilities
- `sitios-acceso-agencia`: concesiones por comercio y correo; token por empresa
  con alcance Sitios; revocación inmediata y auditoría.
- `sitios-comentarios-internos`: comentarios y pedido de aprobación dentro del
  editor, visibles solo para el comercio y sus agencias autorizadas.

##### Modified Capabilities
_(ninguna; no hay spec vigente de Sitios en `openspec/specs/`)_

#### No-goals

- Acceso de agencia a otros módulos: pedidos, clientes, inventario, productos
  (salvo la lectura que necesita el editor), reportes o configuración.
- Herramientas MCP u OAuth para la agencia (`routers/oauth.js` emite por la
  empresa propia del usuario) y canales de Opttia (Telegram, WhatsApp).
- Cobro o facturación a la agencia, o planes de agencia.
- Reusar `multiTenant.js` / `user_company_access`, o cambiar el login normal.
- Permisos granulares por módulo (`requirePermission`) para todos los roles.
- Varias empresas por usuario fuera del modo agencia.

#### Riesgos

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

#### Preguntas para Daniel (del 18-oct; respondidas con los valores por defecto, salvo lo que cambió D-518)

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

Decisión: **D-503** (aprobada por Daniel el 2026-10-18), registrada en
`specs/CONTRACT.md` (tabla «D-495 a D-503»).


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
