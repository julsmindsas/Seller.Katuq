# Tareas — Modo agencia en Sitios (D-503)

> Estado: **para aprobación**, después de las specs y junto con `design.md`.
>
> - Orden del método: primero se aprueban las specs (0.1), luego las decisiones (0.2) y luego el design y estas tareas. Si 0.1 o 0.2 cambian algo, el design y las tareas se ajustan y se vuelven a aprobar antes de la fase 1.
> - `Dep:` son las tareas previas; `[P]` marca las paralelizables.
> - **[sensible: diff aprobado]** = un solo cambio a la vez; Daniel aprueba el diff antes de aplicarlo.
> - Cada tarea de código cierra con build y pruebas en verde. Antes de editar un archivo, se lee.
> - Rutas: el backend en `katuq_admin_back_firebase/functions/`, el front en `Seller.Katuq/src/app/`.
>
> El cambio **no modifica** pedidos, pagos, inventario, consecutivos ni productos/precios (D-134). Lo que toca la autenticación o el contexto de empresa de toda la app se trata como sensible.

## 0. Antes de implementar

- [ ] **0.1** Daniel aprueba las specs `specs/sitios-acceso-agencia/spec.md` y `specs/sitios-comentarios-internos/spec.md`.
  - Dep: —.
  - Éxito: la aprobación queda en `specs/CONTRACT.md` bajo D-503.
- [ ] **0.2** Daniel confirma o corrige las decisiones por defecto 1–15 del design (tabla «Decisiones por defecto»).
  - Dep: 0.1.
  - Éxito: las respuestas quedan en `CONTRACT.md` bajo D-503. Si una cambia, se ajustan la spec, el design y estas tareas.
  - Incluye la excepción al Artículo XII para `AGENCY_ACCESS_ENABLED`, si Daniel quiere conservarlo después del retiro.
- [ ] **0.3** **F0, en el backend privado:** propuesta y cambio. **[sensible: diff aprobado]**
  - Alcance:
    - cada ruta de la lista permitida (design §3) fija la empresa con el token;
    - proyección segura de la lista y el detalle de sitios;
    - clasificación de las rutas que se autentican fuera de `auth.js` (clase c de CT1).
  - Dep: 0.2.
  - Éxito: una prueba recorre la lista y falla si alguna ruta no fija la empresa. El cambio queda desplegado.
- [ ] **0.4** Registrar en el contrato los nombres finales de las colecciones (`agencyAccessGrants`, `…/events`, `sites/{id}/comments`) y de los campos nuevos.
  - Dep: 0.2.
- [ ] **0.5** **En el backend privado:** verificar en producción que las reglas de Firestore niegan al cliente las colecciones nuevas. Si no las niegan, corregirlas con su propia aprobación.
  - Dep: 0.2.
  - Éxito: verificación anotada en el backend privado, sin describir las reglas en este repo.

## 1. Pruebas primero (backend, en rojo antes de implementar)

- [ ] **1.1** CT1, `tests/agencia/alcance.contract.test.js`. Recorre la pila de Express y clasifica cada ruta en una clase (a, b o c, design §3).
  - Valida la lista permitida.
  - Verifica que el guardia compare con `req.baseUrl + req.route.path` y niegue si no hay `req.route`.
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
  - Dep: 0.2.
  - Éxito: en rojo; `versionesYPermisos.test.js` intacto.
- [ ] **1.6** [P] CT7, `writeSet.test.js`. Corre todas las escrituras de la lista contra el Firestore falso, con las derivadas (`site_events`, `companies.primeraTiendaPublicadaAt`, `apiUsage`).
  - Dep: 0.2.
  - Éxito: en rojo. Falla si algo sale del write-set de design §8.
- [ ] **1.7** [P] CT8, `comentarios.test.js` (F2): visibilidad, límites, contador en la misma transacción y ningún comentario en el render ni en las rutas públicas.
  - Dep: 0.2.
  - Éxito: en rojo.

## 2. Backend F1

- [ ] **2.1** [P] Bandera `agencyAccess` en `services/companyFeatureFlags.js` y `shared/services/company-features.service.ts`, con dueño y fecha de retiro en el comentario.
  - Dep: 0.2.
  - Éxito: pasan las pruebas de banderas; si falta, queda apagada.
- [ ] **2.2** `services/agencia/roles.js` y `token.js`. `decodeToken` (`services/index.js`) rechaza el token de agencia. **[sensible: diff aprobado]**
  - Dep: 1.2.
  - Éxito: CT2 en verde; el login emite el mismo token que hoy.
- [ ] **2.3** `services/agencia/concesiones.js`, con transacción y eventos. Rutas del comercio en `routers/agencyAccess.js`, montado en `index.js` como `/v1/agency`.
  - Dep: 1.3, 2.1.
  - Éxito: CT4 en verde.
- [ ] **2.4** `services/agencia/sesiones.js` y las rutas `GET /my-grants` y `POST /sessions`.
  - Dep: 2.2, 2.3.
  - Éxito: CT3 en verde.
- [ ] **2.5** `middleware/agencyScope.js`:
  - lista por la ruta resuelta;
  - negación si no hay `req.route`;
  - lectura de la concesión, que niega si falla;
  - eventos `write`.

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

## 3. Front F1

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
- [ ] **3.6** Módulo lazy `components/agencia/`: «Mis comercios» (`/agencia/comercios`) y «Agencias» (`/agencia/accesos`), con `config-pagina` y estado vacío. El botón de entrada va en Mis sitios.
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

## 4. F2: comentarios

- [ ] **4.1** Backend: `services/sitios/comentarios.js`, rutas en `routers/sites.js` antes de `/:id` y el contador `approvalRequestsOpen` en transacción.
  - Incluye el mensaje nuevo de `SIN_PERMISO_PUBLICAR`, solo cuando el comercio tiene los comentarios encendidos.
  - Dep: 1.7, 2.5.
  - Éxito: CT8 y CT7 en verde; sin la bandera, el mensaje es el de hoy.
- [ ] **4.2** Front: panel en el editor, «Pedir aprobación» y aviso en Mis sitios.
  - Dep: 4.1, 3.8.
  - Éxito: un editor de agencia pide aprobación y un administrador la resuelve.
- [ ] **4.3** Build de producción y revisión a 1440 y 390 px.
  - Dep: 4.2.

## 5. Piloto y salida (con OK de Daniel)

- [ ] **5.1** Desplegar primero el backend, con la bandera apagada en todos y `AGENCY_ACCESS_ENABLED` ausente. Después, el front, con el candado de publicación.
  - Dep: 0.5, 2.8, 3.9 (y 4.3 si F2 sale junto).
- [ ] **5.2** Daniel pone `AGENCY_ACCESS_ENABLED=true` en el `.env` de producción y reinicia; el entorno no deja hacerlo a los agentes.
  - Dep: 5.1.
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

## 6. Retiro (Artículo XII)

- [ ] **6.1** Antes del 2027-04-30, encender `agencyAccess` para todos o eliminarla de ambos catálogos y de las rutas.
  - En la misma tarea se retira `AGENCY_ACCESS_ENABLED`, salvo que en 0.2 Daniel haya registrado la excepción en `CONTRACT.md` bajo D-503, con dueño y fecha de revisión.
  - Dep: 5.4.
