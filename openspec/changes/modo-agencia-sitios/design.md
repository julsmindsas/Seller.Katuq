# Diseño — Sitios: publicación segura, comparar versiones, comentarios y modo agencia (D-503, ampliado por D-518)

> **Estado por parte:**
> - **D (modo agencia) y C (comentarios):** diseño, specs, tareas y valores por defecto aprobados en bloque el 18-oct (D-495 a D-503; D-518 T·3 confirma que esa aprobación cubre 0.1 y 0.2). Se conservan abajo, desde «D. Modo agencia».
> - **Nuevo de D-518 (21-oct), pendiente de aprobación:** §A, §B, §C y §D0. Aplican las decisiones aprobadas F5-29·1 a ·10; lo que ellas no resuelven va como pregunta en `proposal.md`.
> - Las filas del diseño del 18-oct que D-518 cambia quedan marcadas **SUPERSEDED** o **MODIFICADA**, sin borrarse.
>
> **Verificado en el código el 2026-10-21:**
> - backend `wt-back-tickets-web`, rama `feature/tickets-web`, HEAD `097ede2e`, rutas relativas a `functions/`. El árbol tiene cambios de F2-41 sin commit en `controllers/sites.js` desde la línea 2239; se citan las líneas de HEAD;
> - front `wt-front-tickets-web`, HEAD `0d068efd`, rutas relativas a `src/app/`. Hay cambios de F2-41 sin commit en el editor; se citan las líneas de HEAD.
>
> Los detalles de seguridad (P-n) están en la revisión privada del backend `openspec/changes/modo-agencia-sitios-seguridad/`.
>
> **[REVISADO] 21-oct:** una crítica de 18 puntos se verificó contra el código. Lo que cambió va marcado **[REVISADO]**; lo descartado o ajustado, con su razón, queda en la revisión privada (sección «Crítica del 21-oct»).

## 0. Mapa: cuatro cambios, en este orden

| Cambio | Qué | Specs | Encendido | Depende de |
|---|---|---|---|---|
| **A·U** [REVISADO] | Urgente: bugs de ·1 y la seguridad que está en producción | `sitios-publicacion-segura` (requisitos marcados A·U) | Sin bandera | F2-41 unido (D-518 orden 1); caracterización y diff aprobado. **No** espera 0.6 ni 0.7 |
| **A** | Resto de los arreglos a D-478 (·2, ·3, ·5, ·6) | `sitios-publicacion-segura` | Sin bandera: son arreglos de lo que está en producción (D-518: «corregir ya») | A·U; 0.6 y 0.7 |
| **B** | Comparar versiones y historial por página (·4, ·9) | `sitios-comparar-versiones` | Sin bandera: es de lectura | A (versiones sin tokens y resumen al guardar) |
| **C** | Comentarios y «Pedir aprobación» para cualquier equipo (·7) | `sitios-comentarios-internos` | Bandera `siteComments` por comercio | A2 (quién puede publicar) |
| **D** | Modo agencia por invitación (·8), con medición y pauta solo si se concede, sin encender hasta cerrar las reglas de Firebase (·10) | `sitios-acceso-agencia`, `sitios-agencia-invitacion` | `agencyAccess` por comercio y `config/feature_flags.agencyAccessEnabled` (D-505) | F0, A, C y el ticket 1320 |

**A es un cambio propio.** Se aprueba, se implementa y se despliega sin esperar B, C ni D. Si Daniel lo prefiere, pasa a su propia carpeta (pregunta 1 de `proposal.md`).

## A·U. Urgente: bugs de ·1 y seguridad (NUEVO [REVISADO])

**Por qué no espera las preguntas.** D-518 ·1 dice «corregir ya», y el orden de trabajo de D-518 pone en el punto 2 «bugs de F5-29 y su seguridad», antes de los diseños. Ninguna de las 16 preguntas cambia estos arreglos: restituyen lo que D-478 ya prometía («la familia administrador siempre puede», «cada publicación queda en el historial», el autor) o cierran hallazgos en producción. Siguen siendo sensibles (autorización): caracterización en verde y diff aprobado uno a uno.

| # | Qué | Diseño |
|---|---|---|
| U1 | El administrador siempre publica | A1 |
| U2 | `permisos {puedePublicar, esAdministrador}` en `GET /:id` (`getById`, :498-510) y en `GET /:id/versiones`, para que el editor los tenga desde la carga y no solo al abrir Ajustes (`.html:115`; hoy `puedePublicarVersiones` vale `true` por defecto, `.ts:2006`) | A1, A9 |
| U3 | El autor sale del token, también en Opttia y MCP | A4 |
| U4 | Versión al unir; Opttia y «Quitar de línea» cancelan la programada | A5 |
| U5 | El motivo de la programada fallida se ve: `GET /:id/versiones` devuelve `ultimaProgramacionFallida` (hoy solo se escribe, :991, y nadie lo lee) y Ajustes lo muestra. Programar de nuevo lo limpia | A3 (solo la parte visible) |
| U6 | Seguridad en producción: A·S1, F0·S1 y A·S4 de la revisión privada, sin condición. Se coordinan con otras propuestas para no hacerlas dos veces (ver revisión privada) | Revisión privada |

- **Consumidores primero (A·U0).** Fijar la empresa con la sesión deja sin servicio a quien llame esas rutas con la llave de servicio (`middleware/tenant.js:42-50`, `TENANT_NOT_IN_JWT`). Antes del diff se buscan consumidores con llave en el backend, KAI, las apps y Support. Si aparece alguno, se para y se avisa.
- **Front de A·U:** `esAdministrador` y `puedePublicar` del servidor (deja `/admin/i`), el aviso de la programada fallida y el texto del aviso de quién publica. Esconder «Publicar» y «Programar» y los campos solo de administrador sigue en A·12, porque depende de la spec nueva.

## A. Arreglos a D-478 (NUEVO D-518, pendiente de aprobación)

Código de hoy (D-478): `puedePublicarSitio` en `controllers/sites.js:807-812`; `publicarContenido` en :753-805; `guardarVersion` en :821-828; `publish` en :830-848; `versiones` en :850-882; `restaurarVersion` en :884-911; `programarPublicacion` en :913-939; `publicarProgramados` en :982-1001, llamado por `services/cronService.js:1037`; `unirASitio` en :377-432; `publicarSitioDesdeOpttia` en :7220-7250. Front: `components/sitios/editor/sitio-editor.component.ts:2002-2100` (lógica), `.html:3596-3632` (Ajustes) y `components/sitios/sitios.service.ts:733-750`.

### A1. El administrador siempre puede (·1)

- `puedePublicarSitio` = `isAdminFamilyRole(rol) || isRoleAllowed(rol, listaEfectiva)`. Hoy `isRoleAllowed` (`middleware/requireRole.js:67-76`) solo deja pasar al administrador si «Administrador» está en la lista.
- `GET /:id/versiones` agrega `esAdministrador`, calculado con `isAdminFamilyRole`. El front deja de usar `/admin/i` (`sitio-editor.component.ts:2010-2017`), que no coincide con el servidor: un rol «Administrativo» veía el campo y recibía 403.
- **[REVISADO]** `GET /:id` (`getById`) devuelve también `permisos: {puedePublicar, esAdministrador}`, con la misma función. El editor los tiene desde la carga; hoy `puedePublicar` solo llega al abrir Ajustes y por defecto vale `true`. Es un campo nuevo en la respuesta, sin quitar nada.

### A2. Quién publica se decide por comercio (·2)

- **Dónde vive:** `companyConfig/{empresa}.sitiosRolesPublicar` (arreglo, hasta 10). Es un campo nuevo en una colección que ya existe, según D-505 («ajustes en `companyConfig/{empresa}`»). Su aprobación es la pregunta 3.
- **Lista efectiva** (`listaEfectivaPublicar(sitio, cfg)`, función pura):
  - si la del comercio y la del sitio tienen roles, se intersecan (normalizadas con `normalizeRole`). Si la intersección queda vacía, solo publica la familia administrador;
  - si solo una tiene roles, vale esa;
  - si ninguna, vacía, que significa «todos», como hoy.
- **Por qué así:** cierra el hueco P-3 sin migrar nada a la fuerza. Las listas por sitio que dejó D-478 siguen valiendo, la del comercio cubre todo sitio nuevo, y un sitio solo puede ser más estricto que el comercio.
- **Quién la cambia:** `PUT /v1/sites/roles-publicar {roles}`, con `auth`, `requireJwtTenant` y `requireRole(['Administrador'])` (admite la familia), montada antes de `/:id`. La del sitio sigue en `PUT /edit` (:655-663). La lista del comercio viaja en la respuesta de `GET /:id/versiones` como `rolesEmpresa`.
- **Caminos que crean sitios:** `create` (:293), `duplicar` (:435), `generar` (:7800), `crearSitioDesdeOpttia` (:7137) y el registro o la tienda en un paso (:7395-7426, `controllers/tiendaEnUnPaso.js:161`).
  - No necesitan copiar nada: heredan la del comercio porque la lista efectiva se calcula al publicar.
  - `duplicar` copia además `rolesPublicar` del origen.
- **Opttia y MCP:** `publicarSitioDesdeOpttia({company, id, email, rol})`.
  - Sin `rol`, se mantiene D-478: publica solo si la lista efectiva está vacía.
  - `rol` solo lo pasan quienes tienen una sesión verificada: la tienda en un paso, ruta solo para administradores (`routers/onboarding.js:311`), y el MCP de una persona. Con `rol`, aplica la regla de A1.
  - **[REVISADO] El MCP no trae el rol:** el contexto que arma `controllers/mcpController.js:75-84` lleva `mcpUserEmail` y `mcpAuthType`, pero no el rol. La tool `publish_katuq_site` lo resuelve en el servidor solo si `mcpAuthType === 'oauth'`, con la misma lectura de persona que ya usa la escritura por MCP (`services/mcp/permisoDeEscritura.js`, `leerPersona`: correo + empresa, un solo usuario activo; si es ambiguo, sin rol). Se expone como `rolDePersona({company, email})`, sin cambiar `puedeEscribir`. Con llave de empresa o de servicio no hay rol y vale la regla sin `rol`.
  - Así la tienda en un paso de un administrador, o un administrador que publica desde Claude, no queda en borrador cuando el comercio tiene lista.
- **Costo:** una lectura más de `companyConfig/{empresa}` en cada acción de publicar y en `GET /:id/versiones`. Sin caché.
- **Puesta en marcha:** `scripts/sitios-roles-publicar-empresa.js` simula por defecto. Lista las empresas con sitios que ya tienen `rolesPublicar` y propone la lista del comercio; solo escribe con `--execute` (pregunta 4).

### A3. La programada publica la foto y revisa al ejecutarse (·3, ·1)

- **Al programar** (`programarPublicacion`):
  - se escribe `sites/{id}/versiones/programada` = `{tipo:"programada", contenido: sinSecretos(draft), creada, por, porSub, rol}`;
  - y `publicacionProgramada = {fecha, por, porSub, rol, creada, intentos: 0}`, en la misma transacción que la foto.
  - `por`, `porSub` (el `sub` del token, que es `users.identificacion`) y `rol` salen del token. Si el borrador pasa de 900 KB, responde 413 en vez de fallar en silencio.
  - **[REVISADO] El front espera el guardado.** Hoy `programarPublicacion()` (`sitio-editor.component.ts:2062-2066`) llama `guardar(false, true)` y programa sin esperar la respuesta. Con la foto, lo programado saldría sin las últimas ediciones. Programa solo cuando el guardado responde bien, con callback y sin `setTimeout`; si el guardado falla, no programa y lo dice.
- **Por qué en `versiones`:** no crea colección nueva (pregunta 3). El documento de id fijo no tiene `publicadaEn` ni `guardadoEn`, así que las consultas del historial (`orderBy("publicadaEn")`), la poda de 20 y el reporte de KAI (:961) no lo ven.
- **Cancelar o publicar por otro camino** borra la foto (`cerrarProgramada(ref)`, que comparten `publicarContenido` y Opttia).
- **Al ejecutar** (`publicarProgramados`), por cada sitio y en orden:
  0. **[REVISADO] Reclama la programada en una transacción.** Relee el sitio y sigue solo si `publicacionProgramada.creada` es la misma que vio la consulta y la fecha ya llegó; en esa transacción marca `publicacionProgramada.enCurso = creada`. Si alguien reprogramó, canceló o publicó mientras tanto, la deja. La foto se borra solo si su `creada` coincide, y la versión resultante lleva un id derivado de `creada` (`prog_<creada>`), así un segundo barrido que se cruce no duplica la entrada ni publica una foto vieja. Hoy el barrido no tiene candado (:982-1001) y el job de sitios tampoco (`services/cronService.js:1031-1040`, sin `corriendo`).
  1. Lee la foto. Si no existe (una programada de antes de este cambio), cancela con el motivo «Vuelve a programarla» (tarea A·0 cuenta cuántas hay antes de desplegar).
  2. Revisa a quien programó: **[REVISADO]** el usuario `identificacion == porSub` y `empresa == company` existe, es uno solo, no está inactivo y su rol actual pasa A1 con la lista efectiva de hoy. Se busca por `sub` y no por correo: el token guarda el correo en minúsculas (`controllers/authentication.js:122`), `users.email` se guarda como se escribió (`controllers/users.js:211`, `transaction.create(userRef, req.body)`) y un correo puede repetirse entre empresas. Las programadas sin `porSub` (de antes) caen en el paso 1. Con agencia, además la concesión sigue vigente (decisión 10).
  3. Revisa la cuenta con una lectura estricta del estado: una variante de `leerEstado`/`puedeEscribir` de `middleware/soloLectura.js` que, a diferencia del guardia (:232-262), no deja pasar si la lectura falla.
  4. Publica la foto **sin tocar el borrador**: `publicado = {...foto, analitica: fusionarAnalitica(foto.analitica, draft.analitica)}`, así los tokens vigentes vuelven desde el borrador (`utils/siteBlocks.js:1661-1675`).
  5. Si sale bien, borra la foto y limpia `ultimaProgramacionFallida`.
- **Si falla:**
  - si falla una condición, cancela y deja `ultimaProgramacionFallida = {fecha, codigo, motivo}`;
  - si falla una lectura o hay una excepción, suma `intentos`, y al tercero cancela con el motivo.
  - Hoy una excepción deja la programación viva para siempre (:996-998).
- **Se ve:** `GET /:id/versiones` devuelve `ultimaProgramacionFallida`. Ajustes la muestra como aviso, en par color fuerte / fondo suave, y Mis sitios pone «No se publicó» en la tarjeta. Programar de nuevo la limpia. **[REVISADO]** La parte de Ajustes sale antes, en A·U (U5).

### A4. El autor sale del token (·1)

- `autorDe(req)` = `req.userInfo.email` (vacío con la llave de servicio).
- **[REVISADO]** Todo autor, dueño (`vendedorEmail`) o última edición (`user_edit`) de `controllers/sites.js` sale de `autorDe(req)`. La lista de puntos, con archivo y línea, está en la revisión privada (P-5); CTA3 los recorre todos.
- **[REVISADO] Las dos tools de MCP** firman con `context.mcpUser`, que no existe (el contexto trae `mcpUserEmail`, `controllers/mcpController.js:77`): `tools/publishKatuqSite.js:35` y `tools/createKatuqSite.js:62`. Por eso todo queda como «opttia», y un sitio creado por MCP guarda `vendedorEmail: "opttia"`, que no es un correo, así que el reporte semanal de KAI no llega a nadie (`para` en :964).
  - Autor de la versión y `user_edit`: `context.mcpActor`, que el registro de tools ya calcula (`tools/toolRegistry.js:209-215`: el correo de la persona, o `opttia:<empresa>` / `llave-mcp:<empresa>`).
  - `vendedorEmail` del sitio creado por MCP: `context.mcpUserEmail` si es una persona; si no, vacío, y el reporte va al contacto de la empresa como hoy.
- Detalle del riesgo: P-5 y P-9.

### A5. Versión al unir y Opttia cierra la programada (·1)

- `unirASitio`: después del batch (:420-423), si cambió `published.paginas` del destino, `guardarVersion(destinoRef, publicadoNuevo, autor, "unió la página /<ruta>")`.
- `publicarSitioDesdeOpttia` llama a `cerrarProgramada`. Por ahora no se une a `publicarContenido`, porque sumaría los límites de configuración del plan al registro (D-324) y cambiaría lo que publica la tienda en un clic. Queda anotado como deuda.
- **[REVISADO] «Quitar de línea» también cancela la programada.** `unpublish` (:1004-1030) deja viva `publicacionProgramada`, así que un sitio quitado de línea vuelve a salir al público a la hora que estaba programada. Llama a `cerrarProgramada` (borra la foto si existe) y deja `ultimaProgramacionFallida = {codigo: "QUITADO_DE_LINEA", motivo: "Se canceló porque el sitio se quitó de línea"}` para que el comercio lo vea. Es un bug de la misma familia que ·1: D-478 dice que quitar de línea es tan público como publicar.
- Restaurar una versión anterior a una unión: pregunta 6.

### A6. Dominio, pagos y pauta solo para la familia administrador (·5)

- **`CAMPOS_SOLO_ADMIN`:**
  - `dominioPropio`;
  - `draft.tienda.pagoEnLinea`, `contraEntrega`, `otrasFormasPago` y `pagoCuotas`;
  - todo `draft.analitica`, que incluye píxeles, identificadores, tokens y consentimiento.
- **`edit` (:584-744) con un rol que no es de la familia administrador:**
  - **Dominio:** si cambia frente a lo guardado, 403 `SOLO_ADMINISTRADOR`, en cualquier sitio, publicado o no. Se compara igual que hoy (:620-631), así que el autoguardado sin cambios pasa.
  - **Pagos y medición:** se normaliza el borrador y se reponen esos campos desde `actual.draft`. Si venían distintos, responde 200 con `avisos.camposSoloAdministrador`. No hay 403 en el autoguardado: así una pestaña vieja no queda en bucle.
- **`create`/`generar` con `contenido` en el cuerpo y sin rol de administrador:** pagos y medición salen de los valores iniciales (`contenidoInicial`, `analiticaDeSitioNuevo`, `tiendaInicialDe`), nunca del cuerpo.
- **`POST /:id/medicion/prueba`** (`probarMedicion`, :4178): `requireRole(['Administrador'])` en el router.
- **Front:** esos controles quedan deshabilitados con «Lo cambia un administrador», según `esAdministrador`. Envíos, bodega, cupones y mínimos siguen editables por cualquier rol (pregunta 7).
- **Coordinación:** F2-41 tiene sin commit cambios en `pagoCuotas` y en `reglasCuotas`. A6 se aplica después de que F2-41 se una (D-518, orden de trabajo).
- **[REVISADO] Excepción de la agencia con permiso de medición.** Con `req.agency` y `permissions.measurement` (§D0.2), la medición y su prueba se tratan como si el rol fuera de la familia administrador, solo para esos campos. Pagos y dominio, nunca. La spec `sitios-publicacion-segura` lo dice con un `WHERE` para que no choque con `sitios-acceso-agencia`.
- Mi marca también cambia lo publicado (`services/sites/coloresDeMarca.js:43-60`): pregunta 9.

### A7. Restaurar conserva tienda y pauta y guarda antes el borrador (·6)

- **`publicarContenido`** cambia de firma a `({ref, sitio, company, publicado, borrador, usuario, motivo})`. Con `borrador` sin definir, no se toca el borrador. Las revisiones (vacío, `bloqueoDePublicacion`, plan) corren sobre `publicado`.
- **Restaurar**, con `presentacion(v)` = el contenido sin `tienda`, `analitica` ni `publishedAt`:
  - `publicado = {...presentacion(version), tienda: actualPublicado.tienda, analitica: actualPublicado.analitica}`, donde `actualPublicado` = `sitio.published || sitio.draft`;
  - `borrador = {...presentacion(version), tienda: sitio.draft.tienda, analitica: sitio.draft.analitica}`.
  - Consecuencia: el bloqueo de F0-01 (1213) se evalúa con la tienda de hoy. Una versión vieja sin páginas legales sí puede rechazarse, como hoy.
- **Antes de restaurar:** si el borrador difiere de lo publicado (comparado sin `publishedAt`), se guarda como `versiones/{auto}` = `{tipo:"borrador", guardadoEn, por, motivo:"borrador antes de restaurar", contenido: sinSecretos(draft)}`.
  - Se conservan los 5 últimos, con consulta `orderBy("guardadoEn")`, un solo campo y sin índice compuesto.
  - `POST /:id/versiones/:vid/al-borrador` devuelve al borrador la presentación de uno de ellos, sin publicar y con las reglas de A6. Es para cualquier rol que edite.
- **[REVISADO] Qué documento acepta cada ruta.** Hoy `restaurarVersion` (:884-911) solo sanea el id y acepta cualquier documento de `versiones`. Con la foto programada y los borradores guardados en la misma subcolección, eso permitiría publicar una foto pendiente o un borrador. Restaurar y comparar exigen `publicadaEn` (una publicación del historial); `al-borrador` exige `tipo: "borrador"`. Otro documento responde 404 «Esa versión ya no existe».
- **Diálogo** (`sitio-editor.component.ts:2037-2060`): «Vuelve a quedar publicada la presentación de esta versión; tu tienda y tu medición quedan como están. Si tenías cambios sin publicar, los guardamos y los puedes recuperar.»

### A8. Versiones sin secretos (·6)

- `sinSecretos(contenido)` borra las claves `metaConversionsToken`, `ga4ApiSecret` y `tiktokEventsToken` de `analitica`. Las borra, no las vacía: así `fusionarAnalitica` toma las guardadas.
- Lo usan `guardarVersion`, la foto programada y el borrador guardado.
- Limpieza de lo existente: `scripts/sitios-versiones-sin-tokens.js`. Simula por defecto y cuenta. Con `--execute`, solo hace `FieldValue.delete()` de esas tres claves en `sites/*/versiones/*`, sitio por sitio y en lotes.

### A9. Pantalla y contrato HTTP

- **`GET /:id/versiones`** suma `esAdministrador`, `rolesEmpresa`, `ultimaProgramacionFallida` y, de cada versión, `paginasCambiadas` y `resumen` (B3). Lee con `select` de campos livianos y no trae el contenido. **[REVISADO]** Lista solo los documentos con `publicadaEn` (la foto y los borradores guardados no salen ahí; los borradores tienen su propia lista corta para «Recuperar al borrador»).
- **[REVISADO] `GET /:id`** suma `permisos {puedePublicar, esAdministrador}` (U2). El editor decide con eso desde la carga qué botones y campos muestra.
- **Rutas nuevas** (todas con `auth` + `requireJwtTenant`, antes de `/:id`):
  - `PUT /roles-publicar`: familia administrador;
  - `POST /:id/versiones/:vid/al-borrador`;
  - `GET /:id/versiones/:vid/comparar` (B).
- **Editor:**
  - «Publicar» y «Programar» se esconden si `puedePublicar` es falso. En su lugar aparece el motivo y, con C encendido, «Pedir aprobación»;
  - «Quién puede publicar» queda con dos campos para administradores: «En todo tu comercio» y «Solo en esta página (más estricto)»;
  - Ajustes muestra el aviso de la programada fallida.
  - Todo con tokens de `design-system`, sin clases que contengan «p-», con color propio en los `span` y con un estado vacío.

### A10. Write-set de A, sensibles y pruebas

- **Escribe:**
  - `sites/{id}`: `published`, `draft`, `estado`, `publicacionProgramada`, `ultimaProgramacionFallida`, `rolesPublicar` (solo al duplicar), `date_edit`, `user_edit` y `vendedorEmail` (cambia de dónde sale, no el campo);
  - `sites/{id}/versiones/*`: alta, poda y la limpieza de tokens;
  - `companyConfig/{empresa}.sitiosRolesPublicar`.
- **[REVISADO] Escrituras derivadas** del código que ya existe, que A ejecuta al publicar y no agrega: `anotarPrimeraPublicacion` (:7330-7340) escribe `companies.primeraTiendaPublicadaAt` (con merge, una vez por empresa) y el evento `sitio_publicado` en `site_events`; `vaciarCacheHtml` y `precalentarCertificado` no escriben en Firestore. Son las mismas que §8 ya declara para la agencia.
- **Lee:** `users` (`identificacion`, `email`, `empresa`, `roles`, `activo`), `companies` (estado) y `companyConfig`.
- **Nunca escribe:** `orders`, `inventory`, `inventoryMovement`, consecutivos, `products`, precios, integraciones, `users`, `roles` ni otro campo de `companies`.
- **Sensible: diff aprobado uno a uno.** Toca la autorización de publicar, y A6/A7 tocan la configuración de pagos de la tienda del sitio.
- **Caracterización antes del código** (en verde con el código de hoy): `versionesYPermisos.test.js`, `tiendaEnUnPaso*.test.js`, `tests/onboarding/tiendaAlRegistrarse.contract.test.js`, `rutasConTenant.test.js`, `direccionPorMarca.test.js`, `coloresDeMarca.test.js`, `editarPaginaConIA.test.js` y `kaiAdministra.test.js`.
- **Contract tests nuevos** (`tests/sitios/publicacionSegura/`, en rojo primero):
  - **CTA1:** el administrador publica con la lista sin «Administrador».
  - **CTA2:** cada camino de creación hereda la lista del comercio, y duplicar copia la del origen.
  - **CTA3:** con otra cabecera `email`, el autor y `vendedorEmail` salen del token.
  - **CTA4:** unir deja versión, y Opttia cierra la programada.
  - **CTA5:** foto, revisión de usuario, rol y estado, intentos y motivo visible.
  - **CTA6:** campos solo de administrador, con el autoguardado sin cambios.
  - **CTA7:** restaurar conserva tienda y medición y guarda el borrador.
  - **CTA8:** ninguna versión tiene tokens, y el script no escribe sin `--execute`.
  - **CTA9:** write-set, con las derivadas: la primera publicación escribe solo `companies.primeraTiendaPublicadaAt` y `site_events`; cualquier otra escritura en `companies` hace fallar la prueba.
  - **[REVISADO] CTA10:** el barrido de la programada es idempotente: con dos barridos cruzados, o con una reprogramación o cancelación en medio, sale una sola publicación, de la foto vigente, y la foto nueva no se borra.
  - **[REVISADO] CTA11:** «Quitar de línea» cancela la programada y deja el motivo; a la hora programada no sale nada.
  - **[REVISADO] CTA12:** restaurar o comparar la foto programada o un borrador guardado da 404; «al-borrador» con una publicación da 404.
  - **[REVISADO] CTA13:** las tools `create_katuq_site` y `publish_katuq_site` firman con la persona; un administrador por OAuth publica con la lista del comercio definida, y una llave de empresa no.
  - **[REVISADO] CTA14:** la programada encuentra a quien la programó por `porSub`, también con un correo guardado con mayúsculas o repetido en otra empresa.
  - Las pruebas privadas A·S1 a A·S4 (revisión privada) van con estas.

## B. Comparar versiones e historial por página (NUEVO D-518, pendiente de aprobación)

- **B1. `services/sites/compararVersiones.js`**, función pura `compararContenidos(antes, despues)`:
  - **Por página:** Inicio = `bloques`; cada página propia = `paginas[].bloques`, emparejadas por `ruta`. Cada una sale como `nueva`, `quitada` o `cambiada`.
  - **Dentro de cada página:** usa `describirCambios({antes, despues, temaAntes, temaDespues})` (`services/sites/editarPaginaConIA.js:185-238`), el «Esto cambié» de KAI. Como solo recorre `despues`, el envoltorio agrega «Se quitó: <sección>» con `NOMBRE_SECCION` (:67). `describirCambios` gana un parámetro opcional `limite`, 12 por defecto, para que KAI y sus pruebas no cambien.
  - **Generales:** colores, letras y estilo una vez por sitio; SEO, enlaces y redirecciones.
  - **No compara** `tienda` ni `analitica` (·6): devuelve `nota: "La tienda y la medición se quedan como están hoy"`.
  - **[REVISADO] «Igual» se decide con una comparación completa, no con las frases.** `describirCambios` (`editarPaginaConIA.js:185-238`, con `TEXTOS_EDITABLES` en :30-56) solo mira textos editables, visibilidad, dispositivo, estilo, la forma de la portada y el orden. No ve imágenes, productos, enlaces, videos ni otros datos de la sección, y corta en 12. Por eso:
    - `iguales = JSON.stringify(normalizar(antes)) === JSON.stringify(normalizar(despues))`, con `normalizar` = sin `publishedAt`, `tienda` ni `analitica`, y con las claves ordenadas;
    - por sección, si `datos` difiere y `describirCambios` no dijo nada de ella, se agrega «Otros cambios en <sección>» (fotos, productos, enlaces…);
    - el escenario «Sin diferencias» de la spec solo aplica cuando `iguales` es verdadero.
- **B2. `GET /v1/sites/:id/versiones/:vid/comparar`:** compara la versión con `sitio.published`, o con el borrador si el sitio no está publicado, y lo dice. Son dos lecturas y nada se escribe. La meta es responder en menos de 2 s con 20 páginas (prueba con un sitio sintético). **[REVISADO]** Solo acepta documentos con `publicadaEn` (A7).
- **B3. Resumen al guardar:** `guardarVersion` recibe el `published` anterior y guarda `paginasCambiadas` (rutas; `""` = Inicio), `resumen` (`[{ruta, n}]`, menos de 2 KB), `secciones` y `paginasTotal`.
  - Las versiones viejas salen «sin resumen», y comparar igual funciona (escenario de la spec).
  - El filtro «Ver solo /nosotros» es del front, sobre `paginasCambiadas`.
- **B4. Front:** `VersionCambiosComponent`, standalone y `OnPush`, dentro de Ajustes → Historial.
  - Cada versión tiene «Ver cambios»: grupos por página, «y N cambios más» y «Restaurar» con la confirmación de A7.
  - Arriba, un selector de página.
  - Usa los tokens de `design-system`, labels en mayúsculas en gris y el estado vacío «Esta versión es igual a lo que está publicado».
- **Relación con F4-39 (1242):** el «antes y después» de KAI usa B sobre las publicaciones. Versionar cada cambio de KAI en el borrador es la pregunta 10.

## C. Comentarios para cualquier equipo (MODIFICADO D-518 ·7, pendiente de aprobación)

- Cambia el §5 aprobado:
  - **Bandera propia:** `siteComments` en `companies.featureFlags` (`services/companyFeatureFlags.js` y `shared/services/company-features.service.ts`). Dueño: Daniel; retiro: 2027-04-30.
  - **Desacople:** la decisión 8 (bandera `agencyAccess` también para los comentarios) queda **SUPERSEDED** en esa parte.
- **Rutas:** `GET`/`POST /v1/sites/:id/comments` y `POST /v1/sites/:id/comments/:cid/resolve`, con `auth`, `requireJwtTenant` y `requireFeature('siteComments')`, montadas antes de `/:id`. Con token de agencia, además el guardia de D.
- **Quién resuelve:** el autor, la familia administrador o quien pasa A1/A2 en ese sitio.
- **«Pedir aprobación»:** lo ve quien no pasa A1/A2. El aviso en Mis sitios sale de `sites/{id}.approvalRequestsOpen`. Cerrar los pedidos abiertos al publicar es la pregunta 11.
- **Dependencias:** C ya no depende de 2.5 (guardia de agencia). Depende de A2 y de CT8. La parte de agencia (autor «Nombre (Agencia X)», concesión vigente) se suma cuando se encienda D.
- **Sin cambio:** colección `sites/{id}/comments` (aprobada el 18-oct, se registra en 0.4), texto plano, 2.000 caracteres, 30 cada 10 min, nada en el render ni en las rutas públicas (CT8, P-11).

## D0. Cambios de D-518 sobre el modo agencia (pendiente de aprobación)

1. **Invitación, como D-450 (·8).** Reemplaza la decisión 2 (SUPERSEDED). Spec `sitios-agencia-invitacion`.
   - `agencyAccessGrants.status` suma `invited` y `declined`, y los campos `invitedAt/By`, `inviteExpiresAt` (14 días), `acceptedAt` y `permissions {measurement: false}`.
   - `POST /grants` crea en `invited`, con la misma respuesta exista o no la cuenta.
   - Rutas nuevas, con el token propio: `POST /v1/agency/my-grants/:id/accept` y `/decline`. Exigen:
     - que el correo del token sea `granteeEmail`;
     - un usuario activo;
     - que la empresa del que acepta no sea el comercio ni la plataforma.
   - Al aceptar se fija `agencyCompany` = `users.empresa`.
   - La unicidad y el tope cuentan `invited` y `active` vigentes. El vencimiento se evalúa al leer, sin cron.
   - Correo de invitación: pregunta 12. **[REVISADO]** Con un tope propio de envíos por comercio y por día (20 por defecto), contado en la misma transacción que crea la invitación, aparte del tope de 50 concesiones (revisión privada P-13).
   - **[REVISADO] En qué se parece y en qué no a D-450** (`wt-back-tickets-web/openspec/changes/acceso-clientes-support/design.md`, A3):

     | D-450 (proyectos de Support) | Aquí | Razón |
     |---|---|---|
     | Se agrega por correo a un miembro explícito | Igual: se invita a un correo concreto, nunca a «cualquiera» | Es lo que pide ·8 |
     | No crea cuentas ajenas | Igual: la agencia entra con su propia cuenta | D-323 (registro) no cambia |
     | Si el correo no existe, la respuesta lo dice | La respuesta es igual exista o no | Decisión 2 del 18-oct (aprobada): no revelar quién tiene cuenta |
     | La invitación pendiente se completa sola cuando la cuenta existe | La persona acepta en «Mis comercios» | Fija con qué cuenta y empresa entra (un correo puede estar en varias empresas y el login toma el primero, `controllers/authentication.js:91`); nadie recibe acceso sin pedirlo |
     | Sin vencimiento; tope de 20 pendientes | Vence a los 14 días; tope de 50 entre pendientes y vigentes | Una invitación de agencia da escritura sobre lo público |
     | Enlace de restablecer contraseña, opcional | No se usa | La agencia ya tiene cuenta propia |

     Las tres diferencias van a Daniel como pregunta 16.
2. **Medición y pauta solo si se concede (·8).** Modifica la decisión 13.
   - Con `permissions.measurement`, `edit` deja pasar `draft.analitica` con `fusionarAnalitica`, y `POST /:id/medicion/prueba` entra a la lista del guardia para esa concesión.
   - Sin el permiso, se conserva como estaba en el diseño del 18-oct.
   - Pagos y dominio nunca: la decisión 12 pierde «el dominio» (·5).
3. **Interruptor en Firestore (D-505).** Modifica la decisión 8 y §2, §8 y 6.1.
   - `AGENCY_ACCESS_ENABLED` del `.env` pasa a `config/feature_flags.agencyAccessEnabled` (booleano; si falta, está apagado).
   - El guardia lo lee en cada petición junto con la concesión (`db.getAll(grantRef, configRef)`): son 2 lecturas por petición y el apagado es inmediato.
   - Sin excepción al Artículo XII: se retira con `agencyAccess`.
4. **Decisión 10** queda dentro de A3: la revisión al ejecutar incluye la concesión.
5. **F0 incompleto [REVISADO]:** ver revisión privada (F0·S1, A·S1). Esas tareas se adelantan a A·U; F0 sigue siendo bloqueante para encender D y se cierra con la prueba que recorre la lista.
6. **[REVISADO] Lista permitida y rutas nuevas de A, B y C.** §3 suma las filas marcadas [MODIFICADO D-518]; CT1 (tarea 1.1) las valida.
7. **Encendido (·10).** Las tareas 5.2 y 5.3 dependen de que las etapas 1 y 2 de `cerrar-reglas-firebase` (backend, ticket 1320) estén publicadas y verificadas (D·S1 privada).

---


## Gates constitucionales de la ampliación (A, B, C, D0)

| Artículo | Cumplimiento |
|---|---|
| I, XIII | Specs EARS nuevas o modificadas, cada una de 3 páginas o menos; la invitación se separó en `sitios-agencia-invitacion`. Se aprueban antes que A, B, C y D0 (tarea 0.6). **[REVISADO]** A·U restituye lo que D-478 ya prometía y la seguridad que D-518 manda corregir ya: va con las decisiones aprobadas F5-29·1 y D-518 (orden 2) y su diff aprobado, sin esperar 0.6. |
| II | Las specs no nombran tecnología; los nombres de campos y rutas están solo aquí. |
| VII, XI | Motivo de la programada fallida y negaciones en Firestore; versiones sin tokens (A8); sin `console.log` de telemetría. |
| VIII | CTA1 a CTA14 y CT de B en rojo antes del código; caracterización de lo de hoy en verde (A10). |
| IX | Componente nuevo de B standalone y `OnPush`; el editor existente sigue con la excepción Angular 14 registrada. |
| XII | A y B no llevan bandera: son arreglos y lectura. `siteComments` y `agencyAccess` con dueño y retiro el 2027-04-30; el interruptor general se retira con `agencyAccess`. |
| XIV | Cada respuesta de las preguntas de `proposal.md` se anota en `CONTRACT.md` bajo D-518 (esta tarea no edita el contrato). |
| D-505 | Ningún interruptor nuevo en el `.env`: `config/feature_flags.agencyAccessEnabled`, `companyConfig/{empresa}.sitiosRolesPublicar` y banderas por comercio. |

## Riesgos de la ampliación

- **Choque con F2-41 en el mismo archivo:** `controllers/sites.js` y el editor tienen cambios sin commit de F2-41. A se empieza después de unir F2-41, como manda el orden de D-518.
- **Cambio de comportamiento para todos (A6):** quien hoy cambia pagos o píxeles sin ser administrador dejará de poder hacerlo. Mitigación:
  - aviso claro en el editor;
  - antes de desplegar, conteo de solo lectura de comercios con lista configurada (A·0).
- **Lista por comercio (A2):** sin la puesta en marcha (pregunta 4), un comercio que solo restringió páginas sueltas sigue dejando publicar sitios nuevos a todos, aunque ya por decisión explícita suya y no por un hueco.
- **Programadas de antes del despliegue (A3):** se cancelan con un motivo visible. A·0 las cuenta antes, para avisar si hay alguna.
- **Firestore abierto (1320):** las versiones viejas con tokens siguen legibles por esa vía hasta correr A8 con `--execute`. Es prioridad dentro de A.
- **Costo:** A2 suma 1 lectura por acción de publicar; D0.3 suma 1 lectura por petición de agencia (con el autoguardado, hasta unas 1.500 más por hora de edición).
- **[REVISADO] Restaurar ya no revierte pagos ni medición (·6).** Es lo decidido en D-518; se declara en los No-goals de `proposal.md` porque recorta el criterio «un cambio publicado se revierte en un clic» a la presentación.
- **[REVISADO] Fijar la empresa con la sesión (A·U, seguridad)** deja sin servicio a un consumidor con llave de servicio, si lo hubiera. A·U0 los busca antes del diff.
- **[REVISADO] Varios editores abiertos:** el autoguardado de otra pestaña puede pisar lo restaurado o recuperado. Hoy pasa igual; C y D suman editores. El borrador anterior queda guardado (A7) y la pestaña que restaura se recarga. Detectar la edición concurrente queda fuera de este cambio.
- **[REVISADO] MCP de una persona:** resolver su rol suma una lectura de `users` por publicación desde Claude; un correo repetido con roles distintos queda sin rol y no publica si hay lista (lo mismo que ya hace la escritura por MCP).

---

## D. Modo agencia — diseño aprobado el 18-oct (D-503)

> Estado: **aprobado en bloque el 18-oct** (diseño, specs, tareas y valores por defecto; CONTRACT, tabla D-495 a D-503; D-518 T·3). Lo que cambia D-518 está en §D0 y marcado abajo como SUPERSEDED o MODIFICADA; esas partes esperan aprobación.
> Verificado en el código el 2026-10-18: backend `backend-aws-security` `d8f1903b` (rutas relativas a `functions/`); front `feature/venta-asistida-mejorada` `258b3fed` (rutas relativas a `src/app/`).

### D·Contexto verificado

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

### D·Decisiones por defecto (aprobadas el 18-oct, tarea 0.2)

| # | Por defecto | Razón |
|---|---|---|
| 1 | La agencia es una empresa de Katuq. La concesión va a un correo, y `agencyCompany` = `users.empresa` de ese usuario. | Encaja con `users`, `roles` y el login. |
| 2 | **SUPERSEDED por D-518 F5-29·8 → §D0.1 (invitación).** Se otorga a cualquier correo, sin invitación. Sirve cuando entra con una cuenta activa. La respuesta es igual exista o no la cuenta. | No toca el registro (D-323) ni revela cuentas. |
| 3 | Revocación al instante: se lee la concesión en cada petición, sin caché. El token dura 60 min y se renueva. | Sin capa de caché (§8). |
| 4 | Sin contactos, leads, métricas, reseñas, correo de prueba ni `acceso-cliente`. La lista y el detalle de sitios van con la proyección segura del editor y sin contadores. | Datos personales y comerciales. |
| 5 | No cuenta en `maxUsers`. «Diseñar con KAI» gasta el cupo del comercio. Sin «Página con IA» ni «Editar con IA». | No es usuario del comercio. |
| 6 | Se otorga en **Agencias** (desde Mis sitios), solo la familia administrador. Vigencia de 90 días, editable o sin vencimiento. | Usuarios mezclaría cupos y roles. |
| 7 | «Pedir aprobación» solo dentro de Katuq (sigue; con D-518 ·7 vale para cualquier equipo, §C): comentario y aviso en Mis sitios. | Sin canales nuevos. |
| 8 | **MODIFICADA por D-518 → §C y §D0.3:** los comentarios tienen su bandera `siteComments`, y el interruptor pasa a `config/feature_flags.agencyAccessEnabled`. Texto del 18-oct: Bandera `agencyAccess` por comercio, para la agencia y los comentarios. Dueño: Daniel; retiro: 2027-04-30. `AGENCY_ACCESS_ENABLED` tiene el mismo dueño y se retira con la bandera, salvo una excepción registrada. | Artículo XII y D-385. |
| 9 | **MODIFICADA por D-518 ·8 → §D0.2:** con el permiso de medición sí prueba la medición. Texto del 18-oct: No borra sitios, no edita el kit de marca (lo lee) ni prueba la medición. | Fuera de «solo Sitios». |
| 10 | Una programada de una concesión revocada no sale (se implementa dentro de A3, §D0.4). | Revocar corta todo. |
| 11 | Un sitio creado por la agencia queda con `vendedorEmail` vacío. | El reporte de KAI y los pedidos del sitio no quedan a nombre de la agencia. |
| 12 | **MODIFICADA por D-518 ·5 → §D0.2:** la agencia nunca cambia el dominio. Texto del 18-oct: Editor y publicador crean, duplican y generan. Solo el publicador publica, restaura, programa, quita de línea, une y cambia la dirección o el dominio de un sitio publicado. | Lo público lo decide quien publica. |
| 13 | **MODIFICADA por D-518 ·8 → §D0.2:** con el permiso de medición de la concesión, la agencia también edita `draft.analitica`. Texto del 18-oct: La agencia edita la presentación: `bloques`, `tema`, `seo`, `paginas`, `enlaces`, `redirecciones`, nombre y dirección. El servidor conserva `draft.tienda` y `draft.analitica` con `req.agency`, y el front esconde Tienda y la medición. | Bodega, pagos, envíos, cupones, promesas (1221) y asesores gobiernan pedidos, pagos e inventario. Otra opción: solo el publicador los edita, y `GET /v1/bodegas/all` entra a F0 y a la lista. |
| 14 | Hasta 50 concesiones vigentes por comercio, en todo plan. | **Ojo:** con la 5, un comercio gratis podría crear su propia «agencia» para tener más editores. Otra opción: un tope según el plan. |
| 15 | Las escrituras derivadas siguen igual: la primera publicación de la agencia cuenta como la del comercio, y el uso de KAI y de la API se registra como hoy. | Son métricas del comercio; de ahí sale el cupo de KAI. |

### D·Fases

| Fase | Qué | Depende de |
|---|---|---|
| F0 | Backend privado: (a) la empresa fijada en cada ruta de la lista; (b) proyección segura de lista y detalle; (c) clasificación de rutas que se autentican fuera de `auth.js`; (d) reglas vivas de Firestore para las colecciones nuevas (0.5). | — |
| F1 | Concesiones, token, guardia, reglas de publicar y front. | F0 |
| F2 | Comentarios y «Pedir aprobación». **MODIFICADO por D-518: es el cambio C y depende de A2, no de F1.** | F1 |
| Después | Invitación, campana, IA de onboarding y métricas para la agencia. | Propuesta aparte |

### §1. Datos (colecciones propuestas en D-503; se confirman en 0.2 y 0.4)

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

### §2. Token de agencia y sesiones

- `services/agencia/token.js` (`createAgencyToken`) firma igual que `createToken`, que no cambia.
- Payload: `sub`, `role` (`Editor de agencia` \| `Publicador de agencia`), `email`, `company` (el comercio), `name`, `scope: "sitios"`, `grantId`, `agencyCompany`, `iat` y `exp` (60 min).
- Es de agencia si trae `scope`, `grantId` o `agencyCompany`. Si trae solo una parte, se rechaza. `decodeToken` rechaza todo token de agencia.

**`POST /v1/agency/sessions {grantId}`** va con el token propio y exige todo esto:

- el correo del token, nunca del cuerpo;
- un usuario activo, con ese correo e `identificacion = sub`;
- una concesión vigente;
- un comercio que no sea `TENANT_PLATAFORMA` ni la empresa propia;
- `agencyAccess` y `cicloVida.puedeEntrar` en el comercio;
- `AGENCY_ACCESS_ENABLED=true`. **MODIFICADO (D-505, D-518): `config/feature_flags.agencyAccessEnabled === true`, §D0.3.**
- **NUEVO (D-518): concesión aceptada (`status: active`), §D0.1.**

Una cuenta de agencia en solo lectura no abre sesiones.

- **Respuesta:** `{token, expiresAt, role, scope, grantId, company:{nomComercial, nombre, logo, featureFlags}}`. Trae solo las banderas de Sitios, leídas con `select`.
- **Renovación:** por la misma ruta, hasta 30 veces cada 15 min por correo.

### §3. Guardia de alcance (`middleware/agencyScope.js`)

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
| **[MODIFICADO D-518, REVISADO]** `GET /v1/sites/:id/versiones/:vid/comparar` (B) y `POST /v1/sites/:id/versiones/:vid/al-borrador` (A7) | E, P |
| **[MODIFICADO D-518, REVISADO]** `POST /v1/sites/:id/medicion/prueba` | E, P, **solo** con `permissions.measurement` en la concesión (§D0.2); sin el permiso, `AGENCY_SCOPE_DENIED` |
| `GET /v1/productos/search/quick`, `POST /v1/productos/by-ids`, `POST /v1/media/upload`, `GET /v1/companies/brand-kit` | E, P |

**Fuera:**

- de Sitios: `acceso-cliente`, `:id/contactos`, `:id/correos/prueba`, `:id/metricas`, `:id/resenas`, `DELETE /:id` y `kuvo/*`; `:id/medicion/prueba` sin el permiso de medición **[MODIFICADO D-518]**;
- **[MODIFICADO D-518, REVISADO]** `PUT /v1/sites/roles-publicar` (A2), negada de forma explícita para los dos roles: la agencia no cambia quién publica. CT1 falla si entra a la lista;
- `GET /v1/bodegas/all` (decisión 13);
- `PUT brand-kit` y todo `/v1/onboarding`, incluida `tienda-en-un-paso`.

### §4. Cambios en Sitios (`controllers/sites.js`)

- **Quién publica.** Con `req.agency`, `puedePublicarSitio` aplica esta regla a todo lo de la decisión 12:
  - el editor nunca publica;
  - el publicador publica si `rolesPublicar` está vacío o incluye `Publicador de agencia`.

  La agencia no cambia `rolesPublicar`. «Quién puede publicar» ofrece `Publicador de agencia`.
- **Presentación sí, operación no** (decisión 13). Con `req.agency`:
  - `edit` conserva `draft.tienda` y `draft.analitica`;
  - `restaurarVersion` toma de la versión solo la presentación y conserva la `tienda` y la `analitica` actuales.
- **Lista y detalle.** Con `req.agency`, `getAll` y `getById` pasan por la proyección del editor (`sitioParaEditor`) y omiten los contadores. F0 define qué excluye esa proyección. **[REVISADO]** La proyección sin secretos de `getAll` se adelanta para todos los roles en A·U (A·S4 privada); con agencia solo se suma quitar los contadores.
- **Autor.**
  - `guardarVersion` y `programarPublicacion` guardan `porAgencia`.
  - `publicarProgramados` no publica si la concesión no está vigente, y deja `ultimaProgramacionFallida`.
  - `create`, `duplicar` y `generar` dejan `vendedorEmail` vacío.
- **Mensaje** (F2, tarea 4.1). Con los comentarios encendidos, `SIN_PERMISO_PUBLICAR` dice «Pide aprobación desde Comentarios». Sin ellos, queda el texto de hoy.

### §5. Comentarios (F2, `services/sitios/comentarios.js`)

> **MODIFICADO por D-518 ·7 → §C:** bandera propia `siteComments`, para cualquier equipo; ya no depende del guardia de agencia.

- Siguen la spec `sitios-comentarios-internos`.
- El acceso pasa por `requireJwtTenant` y el guardia.
- El texto pasa por `bloquesUtil.sanitizar`.
- `approval_request` y `approvalRequestsOpen` se escriben en una transacción.
- Ni el render ni las rutas públicas leen `comments`.

### §6. Contrato HTTP (`routers/agencyAccess.js` en `/v1/agency`, con `auth` + `requireJwtTenant`)

| Rutas | Quién | Respuestas |
|---|---|---|
| `GET /grants`; `POST /grants {email, role, expiresAt}`; `PUT /grants/:id {role?, expiresAt?}`; `POST /grants/:id/revoke`; `GET /grants/:id/activity` | `requireRole(['Administrador'])` + `requireFeature('agencyAccess')` | 200/201; 400; 404; 409 `GRANT_EXISTS`/`GRANT_LIMIT`; 422 `GRANT_SELF`; 403 `GRANT_TARGET_PLATFORM`. Revocar es idempotente. La actividad trae los últimos 100. |
| `GET /my-grants`; `POST /sessions {grantId}` | Cualquier usuario con su token propio; la bandera se revisa en el comercio | 200; 403 `AGENCY_GRANT_INACTIVE`; 429 |

### §7. Front

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

### §8. Bandera, sombra, write-set, pruebas y costo

**Bandera.** `agencyAccess` va en `FEATURE_FLAG_NAMES` y en `COMPANY_FEATURE_FLAGS`.

- Se revisa al administrar concesiones, en Mis comercios y al emitir el token.
- Apagarla corta las sesiones nuevas; las abiertas vencen en 60 min o menos.
- Para cortar al instante: revocar, o correr `scripts/agency-revoke-all.js`, que simula sin `--execute`.
- `AGENCY_ACCESS_ENABLED` ausente = apagado. **MODIFICADO (D-505, D-518): `config/feature_flags.agencyAccessEnabled` ausente o distinto de `true` = apagado, leído en cada petición de agencia (§D0.3).**

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

### §9. Gates constitucionales

| Artículo | Cumplimiento |
|---|---|
| I, XIII | Las specs EARS (máximo 3 páginas) se aprueban antes que este diseño (0.1). |
| IV, V, X | Sin integraciones externas; revocar es idempotente. |
| VII, VIII, XI | Eventos y negaciones en Firestore sin tokens; CT1–CT8 primero, en rojo. |
| IX | Excepción registrada (Angular 14); lo nuevo, standalone y `OnPush`. |
| XII, XIV | Bandera e interruptor con dueño, fecha y retiro (6.1); `siteComments` igual (§C). Las respuestas van a `CONTRACT.md` bajo D-503 y D-518. |

### D·Riesgos

- **Fuga entre tenants** si una ruta de la lista no fija la empresa: F0 es bloqueante y CT1 vigila.
- **Datos de la agencia en pantalla** si un componente lee `localStorage` directo: el piloto revisa cada pantalla.
- **Si Firestore falla, la agencia no guarda (503).** Es preferible a dejar pasar.
- **Plan gratis con agencia propia** (decisión 14).
