# Tareas — Sitios: publicación segura, comparar, comentarios y modo agencia (D-503, ampliado por D-518)

> **Estado:**
> - Las tareas del 18-oct (secciones 0 a 6, modo agencia y comentarios) están aprobadas en bloque (D-503; D-518 T·3).
> - Las secciones **A** y **B**, las tareas **C·** y las marcas **[MODIFICADO D-518]** son **nuevas y están pendientes de aprobación** (tarea 0.6).
> - **[REVISADO] La sección A·U no espera 0.6 ni 0.7:** son los bugs de ·1 y la seguridad que D-518 manda corregir ya (orden de trabajo 2). Espera F2-41 unido, la caracterización en verde y el diff aprobado por Daniel, uno a uno.
>
> **Reglas:**
> - `Dep:` son las tareas previas; `[P]` marca las que se pueden hacer en paralelo.
> - **[sensible: diff aprobado]** = un solo cambio a la vez; Daniel aprueba el diff antes de aplicarlo, y las pruebas de caracterización están en verde antes.
> - Cada tarea de código cierra con build y pruebas en verde. Antes de editar un archivo, se lee.
> - Todo se implementa en la rama `feature/tickets-web` (backend y front), sin push ni despliegue sin el OK de Daniel (D-518).
> - Rutas: backend en `functions/`, front en `src/app/`.
> - Las tareas `·S` son de la revisión privada del backend (`openspec/changes/modo-agencia-sitios-seguridad/`).
>
> **Orden:** A·U → A (va primero y se despliega solo) → B → C → D. A·U y A empiezan después de unir F2-41 (D-518, orden de trabajo 1 y 2). **[REVISADO]**

## 0·bis. Aprobaciones de la ampliación

- [ ] **0.6** Daniel aprueba el texto de las specs nuevas o modificadas:
  - `sitios-publicacion-segura` y `sitios-comparar-versiones`;
  - `sitios-agencia-invitacion`;
  - los requisitos **[MODIFICADO D-518]** de `sitios-comentarios-internos` y `sitios-acceso-agencia`.

  Después aprueba el design §A, §B, §C y §D0 y estas tareas nuevas.
  - Dep: —.
  - Éxito: la aprobación queda anotada en `CONTRACT.md` bajo D-518 (por quien cierre la sesión; esta tarea no edita el contrato).
- [ ] **0.7** Daniel responde las preguntas 1 a 16 de `proposal.md`. Si una respuesta cambia algo, se ajustan la spec, el design y estas tareas antes de A·5. **[REVISADO]** Ninguna pregunta bloquea A·U.
  - Dep: 0.6.

## A·U. Urgente: bugs de ·1 y seguridad (NUEVO [REVISADO], design §A·U)

- [ ] **A·U0** [P] Buscar consumidores con llave de servicio (sin sesión) de las rutas que tocan A·S1 y F0·S1, en el backend, KAI, las apps móviles y Support. Solo lectura.
  - Dep: —.
  - Éxito: lista anotada en la revisión privada. Si aparece un consumidor, se para y se avisa a Daniel antes del diff.
- [ ] **A·U1** Pruebas de caracterización, en verde con el código de hoy: `versionesYPermisos`, `rutasConTenant`, `direccionPorMarca`, `coloresDeMarca`, `tests/mcp/escrituraPorRol`, más un golden de `publish`, `unpublish`, `unirASitio` y `publicarSitioDesdeOpttia` tal como funcionan hoy.
  - Dep: F2-41 unido.
  - Éxito: todas en verde, sin tocar código de producción.
- [ ] **A·U2** [P] Contract tests en rojo: CTA1, CTA3, CTA4, CTA11 y CTA13 (design A10), y las privadas A·S1 a A·S4.
  - Dep: A·U1.
  - Éxito: corren y fallan por la razón esperada.
- [ ] **A·S1** Revisión privada, P-1. Sin condición. Se coordina con otra propuesta para no hacerlo dos veces (ver revisión privada). **[sensible: diff aprobado]**
  - Dep: A·U0, A·U2.
  - Éxito: su prueba privada en verde; la caracterización de A·U1 igual.
- [ ] **F0·S1** Revisión privada, P-2. Sin condición; sale de F0 y entra aquí. Se coordina con otro cambio privado (ver revisión privada). **[sensible: diff aprobado]**
  - Dep: A·U0, A·U2.
  - Éxito: su prueba privada en verde; el editor funciona igual.
- [ ] **A·S4** Revisión privada, P-12. **[sensible: diff aprobado]**
  - Dep: A·U2.
  - Éxito: su prueba privada en verde; las pantallas se ven igual.
- [ ] **A·U3** A1 y U2: `puedePublicarSitio` con la familia administrador siempre; `esAdministrador` en `GET /:id/versiones`; `permisos {puedePublicar, esAdministrador}` en `GET /:id`. **[sensible: diff aprobado]**
  - Dep: A·U2.
  - Éxito: CTA1 en verde y `versionesYPermisos` igual.
- [ ] **A·U4** A4: `autorDe(req)` en todo `controllers/sites.js`; `context.mcpActor` y `mcpUserEmail` en `tools/publishKatuqSite.js:35` y `tools/createKatuqSite.js:62`. **[sensible: diff aprobado]**
  - Dep: A·U2.
  - Éxito: CTA3 y la parte de autor de CTA13 en verde.
- [ ] **A·U5** A5: versión al unir; `cerrarProgramada` en Opttia y en `unpublish`, con el motivo «se quitó de línea».
  - Dep: A·U4.
  - Éxito: CTA4 y CTA11 en verde.
- [ ] **A·U6** U5: `GET /:id/versiones` devuelve `ultimaProgramacionFallida`; programar de nuevo la limpia.
  - Dep: A·U3.
  - Éxito: prueba nueva en `versionesYPermisos`.
- [ ] **A·U7** Front: `esAdministrador` y `puedePublicar` del servidor desde la carga (deja `/admin/i`); aviso de la programada fallida en Ajustes, en par color fuerte / fondo suave y con color propio en cada `span`; el aviso «Ahora publican: X (y los administradores)» queda cierto.
  - Dep: A·U3, A·U6.
  - Éxito: build sin errores; ninguna clase nueva contiene «p-».
- [ ] **A·U8** Cierre de A·U: suite sin fallos nuevos; `npm run build:prod`; revisión a 1440 y 390 px. Con el OK de Daniel: backend primero, después el front con el candado de publicación. La bitácora va al contrato (por quien cierre la sesión).
  - Dep: A·S1, F0·S1, A·S4, A·U5, A·U7.

## A. Arreglos a lo publicado en D-478 (NUEVO D-518, cambio propio)

- [ ] **A·0** [P] Conteos de solo lectura en producción. El script simula y no escribe; lo corre quien Daniel autorice.
  - Qué cuenta:
    - sitios con `rolesPublicar`, por empresa;
    - programadas pendientes;
    - versiones con tokens;
    - sitios con `redirigeA`.
  - Dep: 0.6.
  - Éxito: los números quedan en la revisión privada, y responden en firme las preguntas 4 y 5.
- [ ] **A·1** Pruebas de caracterización, en verde con el código de hoy:
  - `versionesYPermisos`, `tiendaEnUnPaso*`, `tiendaAlRegistrarse.contract`, `rutasConTenant`, `direccionPorMarca`, `coloresDeMarca`, `editarPaginaConIA` y `kaiAdministra`;
  - un golden nuevo de `publish`, `restaurarVersion` y `publicarProgramados` tal como funcionan hoy.
  - Dep: 0.6.
  - Éxito: todas en verde, sin tocar código de producción.
- [ ] **A·2** [P] Contract tests CTA1 a CTA9 (design A10) en `tests/sitios/publicacionSegura/`, y A·S2/A·S3 de la revisión privada.
  - Dep: A·1.
  - Éxito: corren y fallan por la razón esperada.
- [x] ~~**A·S1** Hallazgo P-1 de la revisión privada, si la pregunta 9 lo aprueba.~~ **SUPERSEDED [REVISADO]:** pasa a A·U, sin condición. La pregunta 9 queda solo para la propagación de colores; si se aprueba, esa parte va en A·10.
- [x] ~~**A·3** A1~~ **SUPERSEDED [REVISADO] → A·U3.**
- [x] ~~**A·4** A4~~ **SUPERSEDED [REVISADO] → A·U4.**
- [ ] **A·5** A2: `listaEfectivaPublicar`, `PUT /v1/sites/roles-publicar`, `duplicar` copia la lista y `publicarSitioDesdeOpttia` con `rol` opcional. **[REVISADO]** El rol del MCP lo resuelve el servidor con `rolDePersona` solo con OAuth (design A2). **[sensible: diff aprobado]**
  - Dep: A·U8, 0.7.
  - Éxito:
    - CTA2 y CTA13 en verde;
    - la tienda en un paso de un administrador se publica con la lista del comercio definida;
    - `tiendaAlRegistrarse` igual.
- [x] ~~**A·6** A5~~ **SUPERSEDED [REVISADO] → A·U5** (suma «Quitar de línea»).
- [ ] **A·7** A8: `sinSecretos` en `guardarVersion`, y el script `scripts/sitios-versiones-sin-tokens.js`, que simula por defecto.
  - Dep: A·2.
  - Éxito: CTA8 en verde, y sin `--execute` no escribe nada.
- [ ] **A·7b** Correr el script en simulación sobre producción y mostrarle el conteo a Daniel. `--execute` solo con su OK. **[sensible: diff aprobado]**
  - Dep: A·7, despliegue de A·7.
- [ ] **A·8** A7: firma `{publicado, borrador}` de `publicarContenido`; restaurar conserva tienda y medición; borrador guardado (5) y `POST /:id/versiones/:vid/al-borrador`. **[REVISADO]** Restaurar exige `publicadaEn` y «al-borrador» exige `tipo: "borrador"`. **[sensible: diff aprobado]**
  - Dep: A·7.
  - Éxito: CTA7, CTA12 y el golden de A·1 en verde, salvo lo que la spec cambia, que se anota en el diff.
- [ ] **A·9** A3: foto programada (con `porSub`), reclamo en transacción por `creada`, revisión de usuario por `identificacion` + empresa, rol y estado con lectura estricta, e intentos. La parte visible de `ultimaProgramacionFallida` ya salió en A·U6. **[REVISADO]** **[sensible: diff aprobado]**
  - Dep: A·5, A·8.
  - Éxito: CTA5, CTA10 y CTA14 en verde. Una programada de antes del cambio se cancela con motivo (pregunta 5).
- [ ] **A·10** A6: `CAMPOS_SOLO_ADMIN` en `edit`, `create` y `generar`, y `requireRole` en la prueba de medición. Si la pregunta 9 lo aprueba, la propagación de colores de Mi marca respeta quién publica y deja versión. **[sensible: diff aprobado]**
  - Dep: A·U3, 0.7; F2-41 unido.
  - Éxito: CTA6 en verde. Al administrador no le cambia nada.
- [ ] **A·11** [P] `scripts/sitios-roles-publicar-empresa.js`: simula por defecto y propone la lista del comercio (pregunta 4).
  - Dep: A·5.
  - Éxito: sin `--execute` no escribe.
- [ ] **A·12** Front (design A9):
  - métodos nuevos en `sitios.service.ts`;
  - `esAdministrador` del servidor;
  - «Publicar» y «Programar» escondidos sin permiso;
  - «Quién puede publicar» con los dos campos;
  - campos solo de administrador deshabilitados;
  - aviso de la programada fallida en Mis sitios (el de Ajustes salió en A·U7);
  - texto nuevo del diálogo de restaurar y «Recuperar al borrador»;
  - **[REVISADO]** `programarPublicacion()` programa solo cuando el guardado responde bien (callback, sin `setTimeout`).
  - Dep: A·5 a A·10.
  - Éxito: build sin errores; ninguna clase nueva contiene «p-».
- [ ] **A·13** Cierre de A:
  - suite completa sin fallos nuevos y CTA en verde;
  - `npm run build:prod` sin errores;
  - el conteo de gradientes y primarios prohibidos del módulo no sube;
  - revisión a 1440 y 390 px.

  Luego, con el OK de Daniel: backend primero y después el front, con el candado de publicación. Se corre A·7b, y la bitácora queda en el contrato.
  - **[REVISADO]** Se le avisa a Daniel que A cerró, para la próxima ronda de TX-38 (1251); la ronda no es tarea de esta propuesta.
  - Dep: A·12.

## B. Comparar versiones e historial por página (NUEVO D-518)

- [ ] **B·1** [P] Pruebas en rojo en `tests/sitios/compararVersiones.test.js`:
  - sección agregada, quitada, oculta o reordenada;
  - página nueva o quitada;
  - tema, SEO, enlaces y redirecciones;
  - sin diferencias (comparación completa normalizada);
  - **[REVISADO]** solo cambió una foto, un producto o un enlace: no dice «igual», sale «Otros cambios en <sección>» y ofrece restaurar;
  - **[REVISADO]** comparar la foto programada o un borrador guardado da 404;
  - tienda y medición fuera;
  - «y N más»;
  - 404 con otra empresa;
  - menos de 2 s con 20 páginas sintéticas.

  Las pruebas de KAI de `describirCambios` siguen en verde.
  - Dep: 0.6.
- [ ] **B·2** `services/sites/compararVersiones.js`, más el parámetro opcional `limite` (12 por defecto) en `describirCambios`.
  - Dep: B·1.
  - Éxito: B·1 en verde (lógica).
- [ ] **B·3** Resumen al guardar (`paginasCambiadas`, `resumen`, `secciones`, `paginasTotal`), `GET /:id/versiones/:vid/comparar` y lista del historial con `select` liviano.
  - Dep: B·2, A·7.
  - Éxito: B·1 en verde de punta a punta. El reporte semanal de KAI queda igual.
- [ ] **B·4** Front: `VersionCambiosComponent` (standalone, `OnPush`), «Ver cambios», filtro por página y «Restaurar» dentro del panel. Si la pregunta 13 lo aprueba, también «borrador contra publicado».
  - Dep: B·3, A·12.
- [ ] **B·5** Build de producción y revisión a 1440 y 390 px.
  - Dep: B·4.

## C. Comentarios para cualquier equipo (tareas nuevas de D-518 ·7)

- [ ] **C·0** [P] Bandera `siteComments` en `services/companyFeatureFlags.js` y `shared/services/company-features.service.ts`. Dueño: Daniel; retiro: 2027-04-30.
  - Dep: 0.6.
  - Éxito: pasan las pruebas de banderas; si falta, queda apagada.
- [ ] **C·1** Si la pregunta 11 lo aprueba: al publicar se cierran los pedidos de aprobación abiertos, con el contador en la misma transacción.
  - Dep: 4.1.
- [ ] **C·2** Piloto en FLORECER con dos roles (pregunta 15): un rol sin permiso pide aprobación y un administrador la resuelve.
  - Dep: 4.3.

---

## D. Tareas del 18-oct — Modo agencia y comentarios (D-503, aprobadas)

> Estado: **aprobadas en bloque el 18-oct** (D-503; D-518 T·3). Las marcas **[MODIFICADO D-518]** esperan la tarea 0.6.
>
> - Orden del método: primero se aprueban las specs (0.1), luego las decisiones (0.2) y luego el design y estas tareas. Si 0.1 o 0.2 cambian algo, el design y las tareas se ajustan y se vuelven a aprobar antes de la fase 1.
> - `Dep:` son las tareas previas; `[P]` marca las paralelizables.
> - **[sensible: diff aprobado]** = un solo cambio a la vez; Daniel aprueba el diff antes de aplicarlo.
> - Cada tarea de código cierra con build y pruebas en verde. Antes de editar un archivo, se lee.
> - Rutas: el backend en `katuq_admin_back_firebase/functions/`, el front en `Seller.Katuq/src/app/`.
>
> El cambio **no modifica** pedidos, pagos, inventario, consecutivos ni productos/precios (D-134). Lo que toca la autenticación o el contexto de empresa de toda la app se trata como sensible.

### 0. Antes de implementar

- [x] **0.1** (Aprobada en bloque el 18-oct; D-518 T·3. Falta anotarlo en el contrato con esa fecha.) Daniel aprueba las specs `specs/sitios-acceso-agencia/spec.md` y `specs/sitios-comentarios-internos/spec.md`.
  - Dep: —.
  - Éxito: la aprobación queda en `specs/CONTRACT.md` bajo D-503.
- [x] **0.2** (Aprobada en bloque el 18-oct; D-518 T·3. D-518 cambió las decisiones 2, 8, 12 y 13: ver design §D0 y la tarea 0.6.) Daniel confirma o corrige las decisiones por defecto 1–15 del design (tabla «Decisiones por defecto»).
  - Dep: 0.1.
  - Éxito: las respuestas quedan en `CONTRACT.md` bajo D-503. Si una cambia, se ajustan la spec, el design y estas tareas.
  - ~~Incluye la excepción al Artículo XII para `AGENCY_ACCESS_ENABLED`~~ **SUPERSEDED (D-505, D-518):** no hay interruptor en el `.env`. `config/feature_flags.agencyAccessEnabled` se retira con la bandera, sin excepción.
- [ ] **0.3** **F0, en el backend privado:** propuesta y cambio. **[sensible: diff aprobado]**
  - Alcance:
    - cada ruta de la lista permitida (design §3) fija la empresa con el token;
    - proyección segura de la lista y el detalle de sitios;
    - clasificación de las rutas que se autentican fuera de `auth.js` (clase c de CT1).
    - **[MODIFICADO D-518, REVISADO]** F0 incompleto: ver revisión privada. F0·S1 y A·S1 se adelantan a A·U; aquí queda la prueba que recorre toda la lista.
  - Dep: 0.2.
  - Éxito: una prueba recorre la lista y falla si alguna ruta no fija la empresa. El cambio queda desplegado.
- [ ] **0.4** Registrar en el contrato los nombres finales de las colecciones (`agencyAccessGrants`, `…/events`, `sites/{id}/comments`) y de los campos nuevos. **[MODIFICADO D-518]** Se suman `companyConfig/{empresa}.sitiosRolesPublicar`, los documentos `versiones/programada` y `versiones/{tipo: borrador}`, y en las concesiones `invited`, `declined`, `inviteExpiresAt`, `acceptedAt` y `permissions.measurement` (pregunta 3).
  - Dep: 0.2.
- [ ] **0.5** **En el backend privado:** verificar en producción que las reglas de Firestore niegan al cliente las colecciones nuevas. Si no las niegan, corregirlas con su propia aprobación.
  - Dep: 0.2.
  - Éxito: verificación anotada en el backend privado, sin describir las reglas en este repo.
  - **[MODIFICADO D-518 ·10]** Incluye D·S1: el modo agencia no se enciende hasta que las etapas 1 y 2 de `cerrar-reglas-firebase` (ticket 1320) estén publicadas y verificadas.

### 1. Pruebas primero (backend, en rojo antes de implementar)

- [ ] **1.1** CT1, `tests/agencia/alcance.contract.test.js`. Recorre la pila de Express y clasifica cada ruta en una clase (a, b o c, design §3).
  - Valida la lista permitida.
  - Verifica que el guardia compare con `req.baseUrl + req.route.path` y niegue si no hay `req.route`.
  - **[MODIFICADO D-518, REVISADO]** Incluye las filas nuevas de §3: comparar y «al-borrador» para E y P; la prueba de medición solo con el permiso; `PUT /v1/sites/roles-publicar` negada a los dos roles.
  - Dep: 0.2.
  - Éxito: corre y falla porque el guardia todavía no existe; una ruta sin clase también lo hace fallar.
- [ ] **1.2** [P] CT2, `token.test.js`: forma y vida del token, `createToken` igual que hoy, `decodeToken` lo rechaza e `isAdminFamilyRole` da falso para los dos roles.
  - Dep: 0.2.
  - Éxito: en rojo.
- [ ] **1.3** [P] CT3, `sesiones.test.js`, y CT4, `concesiones.test.js`, con cada condición de design §2 y §6.
  - Incluyen:
    - la plataforma nunca es destino;
    - una vigente por correo, y una vencida pasa a `expired`;
    - el tope cuenta solo vigentes;
    - revocar es idempotente;
    - la respuesta es igual exista o no la cuenta;
    - un comercio suspendido da 423.
    - **[MODIFICADO D-518 ·8]** la invitación queda `invited`, solo el correo invitado la acepta o la rechaza, vence a los 14 días, y no abre sesión hasta aceptarse.
    - **[REVISADO]** aceptar busca al usuario por `identificacion = sub` del token; el tope diario de correos de invitación por comercio (P-13) se cuenta en la misma transacción y retirar y volver a invitar no lo reinicia.
  - Dep: 0.2.
  - Éxito: en rojo.
- [ ] **1.4** [P] CT5, `revocacion.test.js`: revocar corta la siguiente petición, un rol cambiado da `AGENCY_GRANT_CHANGED` y un fallo de lectura da 503.
  - Dep: 0.2.
  - Éxito: en rojo.
- [ ] **1.5** [P] CT6, `tests/sitios/agenciaPublicar.test.js`:
  - el editor no publica con `rolesPublicar` vacío y el publicador sí;
  - una programación de una concesión revocada no sale;
  - `vendedorEmail` queda vacío;
  - la lista y el detalle salen con la proyección segura y sin contadores;
  - `draft.tienda` y `draft.analitica` quedan intactas al guardar y al restaurar.
  - **[MODIFICADO D-518 ·8 y ·5]** con `permissions.measurement`, `draft.analitica` se guarda con la fusión de tokens y la prueba de medición pasa; sin el permiso, se conserva. El dominio se rechaza siempre.
  - Dep: 0.2.
  - Éxito: en rojo; `versionesYPermisos.test.js` intacto.
- [ ] **1.6** [P] CT7, `writeSet.test.js`. Corre todas las escrituras de la lista contra el Firestore falso, con las derivadas (`site_events`, `companies.primeraTiendaPublicadaAt`, `apiUsage`).
  - Dep: 0.2.
  - Éxito: en rojo. Falla si algo sale del write-set de design §8.
- [ ] **1.7** [P] CT8, `comentarios.test.js` (F2): visibilidad, límites, contador en la misma transacción y ningún comentario en el render ni en las rutas públicas.
  - Dep: 0.2.
  - Éxito: en rojo.

### 2. Backend F1

- [ ] **2.1** [P] Bandera `agencyAccess` en `services/companyFeatureFlags.js` y `shared/services/company-features.service.ts`, con dueño y fecha de retiro en el comentario. **[MODIFICADO D-518]** El interruptor general es `config/feature_flags.agencyAccessEnabled` (D-505).
  - Dep: 0.2.
  - Éxito: pasan las pruebas de banderas; si falta, queda apagada.
- [ ] **2.2** `services/agencia/roles.js` y `token.js`. `decodeToken` (`services/index.js`) rechaza el token de agencia. **[sensible: diff aprobado]**
  - Dep: 1.2.
  - Éxito: CT2 en verde; el login emite el mismo token que hoy.
- [ ] **2.3** `services/agencia/concesiones.js`, con transacción y eventos. **[MODIFICADO D-518 ·8]** Invitación (`invited`), `POST /my-grants/:id/accept` y `/decline`, y `permissions.measurement`. Rutas del comercio en `routers/agencyAccess.js`, montado en `index.js` como `/v1/agency`.
  - Dep: 1.3, 2.1.
  - Éxito: CT4 en verde.
- [ ] **2.4** `services/agencia/sesiones.js` y las rutas `GET /my-grants` y `POST /sessions`.
  - Dep: 2.2, 2.3.
  - Éxito: CT3 en verde.
- [ ] **2.5** `middleware/agencyScope.js`:
  - lista por la ruta resuelta;
  - negación si no hay `req.route`;
  - lectura de la concesión, que niega si falla;
  - eventos `write`;
  - **[MODIFICADO D-518]** lee en cada petición la concesión y `config/feature_flags.agencyAccessEnabled` con un solo `getAll`.

  Se llama en `middleware/auth.js` antes de `guardiaSoloLectura`. **[sensible: diff aprobado]**
  - Dep: 0.3, 1.1, 1.4, 2.2.
  - Éxito: CT1 y CT5 en verde; las suites de `soloLectura`, `tenant` y `companyAccess` dan lo mismo que antes.
- [ ] **2.6** Cambios de design §4 en `controllers/sites.js`: quién publica, presentación sí y operación no, proyección y autor. El mensaje de `SIN_PERMISO_PUBLICAR` queda para 4.1.
  - Dep: 1.5, 2.5.
  - Éxito: CT6 en verde; la suite de sitios queda con los mismos fallos previos.
- [ ] **2.7** [P] `scripts/agency-revoke-all.js "<empresa>"`: simula por defecto y escribe solo con `--execute`.
  - Dep: 2.3.
  - Éxito: una prueba muestra que sin `--execute` no escribe.
- [ ] **2.8** CT7 en verde, la suite completa sin fallos nuevos y el backend arranca.
  - Dep: 2.1–2.7.

### 3. Front F1

- [ ] **3.1** Pruebas node primero:
  - elección de sesión por pestaña;
  - `ownEmail` distinto descarta la delegada;
  - encabezados con y sin `USE_OWN_SESSION`;
  - códigos `AGENCY_*`;
  - recorrido de `routes`: ninguna ruta de primer nivel con sesión queda sin el guardia de agencia.
  - Dep: 0.2.
  - Éxito: en rojo.
- [ ] **3.2** `shared/services/session/session-context.service.ts`, y borrar la delegada en `AuthService.SignOut`.
  - Dep: 3.1.
  - Éxito: pasan las pruebas de sesión de 3.1.
- [ ] **3.3** `HttpInterceptor2`: sesión activa, `USE_OWN_SESSION`, renovación y códigos `AGENCY_*`. **[sensible: diff aprobado]**
  - Dep: 3.2.
  - Éxito: 3.1 en verde; sin modo agencia, los encabezados salen idénticos a hoy.
- [ ] **3.4** `SecurityService`, `CompanyFeaturesService` y las lecturas directas de `sitios-lista.component.ts` y `sitio-editor.component.ts` pasan por el servicio de sesión. **[sensible: diff aprobado]**
  - Dep: 3.2.
  - Éxito: el build compila; sin modo agencia, todo se comporta igual.
- [ ] **3.5** [P] `AgencyAccessService extends BaseService`, con los métodos de design §6.
  - Dep: 0.2.
  - Éxito: el build compila; ningún componente usa `HttpClient`.
- [ ] **3.6** **[MODIFICADO D-518 ·8]** Con invitaciones pendientes, aceptar y rechazar en «Mis comercios», y el permiso de medición al invitar. Módulo lazy `components/agencia/`: «Mis comercios» (`/agencia/comercios`) y «Agencias» (`/agencia/accesos`), con `config-pagina` y estado vacío. El botón de entrada va en Mis sitios.
  - Dep: 3.5, 2.3, 2.4.
  - Éxito: otorgar, cambiar, revocar y ver la actividad contra el backend local.
- [ ] **3.7** `AgenciaMarcoComponent`, la ruta con `canMatch` y el guardia `SoloSitiosEnModoAgencia` en `''` y en las rutas de primer nivel con sesión (design §7). «Volver a mis comercios» termina primero la delegada. **[sensible: diff aprobado]**
  - Dep: 3.2.
  - Éxito:
    - en modo agencia, cualquier ruta con sesión fuera de `/sitios` vuelve a `/sitios`;
    - otra pestaña sigue con la sesión propia;
    - sin modo agencia, la navegación queda idéntica;
    - pasa la prueba de recorrido de 3.1.
- [ ] **3.8** En modo agencia:
  - esconder lo que queda fuera de design §3, el panel Tienda, la medición y `tienda-en-un-paso`, sin llamar a `GET /v1/bodegas/all`;
  - agregar «Publicador de agencia» en «Quién puede publicar»;
  - mostrar el autor «Nombre (Agencia X)» en el historial.
  - Dep: 3.7, 2.6.
  - Éxito: el piloto (5.3) no deja negaciones causadas por la pantalla.
- [ ] **3.9** Cierre de diseño:
  - `npm run build:prod` sin errores;
  - el conteo de gradientes y primarios prohibidos del módulo no sube;
  - revisión a 1440 y 390 px, sin scroll horizontal ni texto invisible.
  - Dep: 3.2–3.8.

### 4. F2: comentarios

- [ ] **4.1** Backend: `services/sitios/comentarios.js`, rutas en `routers/sites.js` antes de `/:id` y el contador `approvalRequestsOpen` en transacción.
  - Incluye el mensaje nuevo de `SIN_PERMISO_PUBLICAR`, solo cuando el comercio tiene los comentarios encendidos.
  - Dep: 1.7, ~~2.5~~ **A·5 y C·0 [MODIFICADO D-518 ·7]**. La parte de agencia se suma con 2.5.
  - Éxito: CT8 y CT7 en verde; sin la bandera `siteComments`, el mensaje es el de hoy.
- [ ] **4.2** Front: panel en el editor, «Pedir aprobación» y aviso en Mis sitios.
  - Dep: 4.1, ~~3.8~~ **A·12 [MODIFICADO D-518 ·7]**.
  - Éxito: un empleado sin permiso (y, con D, un editor de agencia) pide aprobación y un administrador la resuelve.
- [ ] **4.3** Build de producción y revisión a 1440 y 390 px.
  - Dep: 4.2.

### 5. Piloto y salida (con OK de Daniel)

- [ ] **5.1** Desplegar primero el backend, con la bandera apagada en todos y `config/feature_flags.agencyAccessEnabled` ausente **[MODIFICADO D-505]**. Después, el front, con el candado de publicación.
  - Dep: 0.5, 2.8, 3.9 (y 4.3 si F2 sale junto).
- [ ] **5.2** ~~Daniel pone `AGENCY_ACCESS_ENABLED=true` en el `.env`~~ **[MODIFICADO D-505, D-518 ·10]** Daniel pone `config/feature_flags.agencyAccessEnabled = true` (con un script que simula por defecto), sin reiniciar.
  - Dep: 5.1, **0.5 con D·S1 (reglas de Firebase cerradas, ticket 1320)**.
- [ ] **5.3** Piloto: bandera en FLORECER (`set-company-feature.js` simula y luego `--execute`), con una empresa de prueba como agencia.
  - Dep: 5.2.
  - Éxito, se verifica todo esto:
    - revocar corta la siguiente petición;
    - el editor no publica;
    - `/v1/orders` e `/v1/inventory` responden 403;
    - dos pestañas con dos comercios no se cruzan.
  - No se suspende FLORECER: el 423 lo cubre CT3. Si Daniel quiere verlo en vivo, se hace con la empresa de prueba y con su OK explícito.
- [ ] **5.4** Revisar `audit_log_access` (`AGENCY_SCOPE_DENIED`) y corregir el front. Luego encender comercio por comercio.
  - Dep: 5.3.
- [ ] **5.5** Bitácora y sello en `CONTRACT.md`. Comentario técnico en ClickUp 1253, si se autoriza.
  - Dep: 5.4.

### 6. Retiro (Artículo XII)

- [ ] **6.1** Antes del 2027-04-30, encender `agencyAccess` para todos o eliminarla de ambos catálogos y de las rutas.
  - En la misma tarea se retira `config/feature_flags.agencyAccessEnabled` **[MODIFICADO D-505]**, sin excepción, y se decide lo mismo para `siteComments`.
  - Dep: 5.4.
