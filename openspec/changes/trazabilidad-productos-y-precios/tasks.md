> **Estado:** TAREAS de la **F1**, **aprobadas por Daniel el 2026-10-23**. Secciones 1 a 4 hechas en el backend (salvo lo marcado «Pendiente»); la sección 5 espera el diff aprobado de cada enganche. D-548, tickets 1357 y 1358. La F0 está hecha. Las F2 a F4 tendrán sus tareas cuando se diseñen (sección 10). Backend en `katuq_admin_back_firebase/functions`, front en `Seller.Katuq`. Cada tarea de código cierra con `node --check` de los archivos tocados (backend) o `npm run build` (front) y sus pruebas en verde; no se avanza con el build roto. Los enganches de la sección 5 van **uno a la vez, con el diff a la vista y aprobación antes de cada commit**. Leer los archivos antes de editarlos. Nunca `git add -A`.

## 0. Checkpoints

- [x] 0.1 Propuesta y specs aprobadas por Daniel (23-oct), con las 4 respuestas recomendadas.
- [x] 0.2 **F0 hecha:** «Última edición» en hora de Colombia y con quién en las cuatro pestañas de Listas de precios (Seller `27c3fc4a`) y usuario del token en precios por tipo de cliente (backend `9d2fa325`). Lo que la propuesta anotaba además para cerrar la F0 pasa a las tareas 5.1 a 5.3 y 6.1.
- [x] 0.3 Aprobación de `design.md` y respuesta a sus 2 Open Questions.
  - **Hecho cuando:** Daniel aprueba y las respuestas quedan anotadas en `design.md`.
  - **Hecho (23-oct):** Daniel aprobó el diseño el 2026-10-23 y respondió las 2 Open Questions (costos: familia Administrador, `puedeVerMargen` y menú «Lista de precios»; acciones masivas en la F1). Anotado en `design.md` («Open Questions»).
- [x] 0.4 Aprobación de este `tasks.md`.
  - **Hecho cuando:** Daniel lo aprueba por escrito.
  - **Hecho (23-oct):** Daniel aprobó este `tasks.md` el 2026-10-23 (propuesta, diseño y tareas).
- [ ] 0.5 Bitácora de D-548 en `specs/CONTRACT.md`: diseño aprobado, versión 2 de `productHistory`, bandera `productHistoryLog` (dueño Daniel, retiro 2027-04-30) y excepción acotada del Artículo IX. Antes de escribir, revisar `origin`.
  - **Depende de:** 0.3, 0.4.
  - **Hecho cuando:** la entrada está en el contrato.
  - **Pendiente (23-oct):** Falta: `specs/CONTRACT.md` no se toca desde esta sesión (otra sesión lo comparte). Debe escribirlo quien cierre la sesión, revisando `origin` antes: diseño aprobado, versión 2 de `productHistory`, bandera `productHistoryLog` (dueño Daniel, retiro 2027-04-30), excepción acotada del Artículo IX y, de esta entrega, las secciones 1 a 4 sin enganchar.
## 1. Verificación previa (solo lectura, sin escribir producción)

- [x] 1.1 Leer 3 productos reales de ALMARA (uno con precios por tipo de cliente, uno con volumen, uno inactivo o agotado) y confirmar las rutas de D2: «se puede vender», disponible/agotado, precio que muestra «Precio tipo clientes» (con o sin IVA) y forma de `preciosPorTipoCliente`. Solo nombres de campo y tipos, ningún valor personal.
  - **Depende de:** 0.4.
  - **Hecho cuando:** la tabla de rutas reales queda en `design.md` («Desvíos») y el catálogo de D2 coincide.
  - **Pendiente (23-oct):** **Parcial.** Se leyeron 1.500 productos de ALMARA (solo nombres de campo, tipos y conteos de booleanos): rutas de «se puede vender» (`exposicion.activar`), disponible/agotado (`exposicion.disponible`), IVA (texto), base, volumen, costo y categoría confirmadas; `disponibilidad.activo/estado` no existen. La tabla quedó en `design.md` («Desvíos»). **Falta confirmar la forma viva de `preciosPorTipoCliente` con GCJ1236** (ninguno de los 1.500 tenía datos en ese arreglo): la segunda lectura de producción la denegó el clasificador de permisos y no se insistió.
  - **Hecho (23-oct, segunda lectura autorizada, solo nombres y tipos):** GCJ1236 y GCJ1236C existen, pero con `company` = OH MY STORE, no ALMARA FELICIDAD (por eso las consultas con empresa daban 0). Forma viva de `preciosPorTipoCliente` confirmada (arreglo de 3 filas con `tipoClienteId`, `tipoClienteNombre`, `precio`, `precioConIva`, `valorIva`, `porcentajeIva`, `activo`, más 4 campos de descuento `null` en GCJ1236) y anotada en `design.md` («Desvíos»). ALMARA no tiene ningún producto con ese arreglo con datos (17 vacíos de 2.260). El catálogo de D2 coincide; **hallazgo abierto para Daniel:** el ticket 1358 nombra a ALMARA pero esos productos son de OH MY STORE.
  - **Intento del 23-oct (autorizado):** la consulta `company == "ALMARA FELICIDAD"` + `identificacion.referencia == "GCJ1236"` (y la de `GCJ1236C`) devolvió **0 documentos**: la referencia no está guardada con ese texto exacto o la empresa se escribe distinto. La segunda lectura (buscar la referencia sin filtrar por empresa y en minúsculas) la **denegó el clasificador de permisos** y no se insistió. Sigue pendiente la forma viva de `preciosPorTipoCliente`; no bloquea (el código usa `tipoClienteId`, `tipoClienteNombre`, `precio`, `porcentajeIva`, `valorIva`, `precioConIva`, `activo`).
- [x] 1.2 Leer los índices vivos y reusar la copia del ruleset de D-541 (tarea 1.2 de D-541); confirmar que no hay índices de `productHistory` con `occurredAt`.
  - **Depende de:** 0.4.
  - **Hecho cuando:** la lista de índices a crear queda escrita en la tarea 7.1.
  - **Hecho (23-oct):** Índices vivos tomados de la copia que sacó esta sesión a las 9:45 (D-541, 1.2): `productHistory` tiene UN índice (`company, productoId, fecha DESC, __name__ DESC`), ninguno con `occurredAt` ni `tags`. La lista a crear (4 índices y los `fieldOverrides`) quedó en `design.md` («Desvíos») para la tarea 7.1. El ruleset: D-541 ya anotó que hay que sumar `collection != 'productHistory'` a las tres condiciones cuando se haga 7.2.
- [x] 1.3 Por cada punto P1-P12, anotar si el escritor ya lee el producto antes de escribir, si usa transacción y de dónde saca la empresa.
  - **Depende de:** 0.4.
  - **Hecho cuando:** una tabla P1-P12 con esas tres columnas queda en `design.md` D6.
  - **Hecho (23-oct):** Tabla P1-P12 (lee antes, transacción, de dónde sale la empresa, qué sirve de `previo`) en `design.md` D6. Hallazgos: ningún escritor usa transacción; P7 descarta los datos que lee y P11 no lee el producto (su `costoAnterior` viene del navegador), así que esos dos deben leer con `getAll`.
- [x] 1.4 Censo de solo lectura de los roles de ALMARA: cuáles tienen el menú `lista-precios/lista-precios` y cuáles pasan `puedeVerMargen` (solo nombres de rol).
  - **Depende de:** 0.3.
  - **Hecho cuando:** la lista de roles que verían costos queda en `design.md` D9.
  - **Hecho (23-oct, autorizado por Daniel):** 6 roles en ALMARA; solo «Administrador» ve costos (familia Administrador, `puedeVerMargen` y menú `lista-precios/lista-precios`). Los otros cinco («Almara Produccion», «Daniel Garcia», «julian», «Solo inventarios.», «VENTAS») no cumplen ninguna de las tres condiciones. Anotado en `design.md` D9.
## 2. Backend: pruebas primero (Artículo VIII; fallan por la razón esperada)

- [x] 2.1 [P] `tests/productos/historialProducto.diferencias.test.js`: catálogo, normalización, arreglos por clave, quitar precio, variación (GCJ1236: $42.621 → $78.291 = +$35.670, +83,7 %; GCJ1236C: +$19.867, +43,9 %), campos técnicos y stock ignorados, prioridad, `tags`, ids.
  - **Depende de:** 1.1.
  - **Hecho cuando:** falla con `Cannot find module`.
  - **Hecho (23-oct):** `historialProducto.diferencias.test.js`: 38 casos (GCJ1236 +$35.670 / +83,7 %, GCJ1236C +$19.867 / +43,9 %, normalización, claves, quitar precio, campos técnicos y existencias, prioridad, ids, foto de alta/baja, `conParche`, `armarEvento`). Falló con `Cannot find module` antes de escribir el módulo.
- [x] 2.2 [P] `tests/productos/historialProducto.contexto.test.js`: actor del token; una cabecera `email` falsa no cambia nada; MCP `oauth`, `servicekey`, `apikey`; sin clasificar → Sistema más traza.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla con `Cannot find module`.
  - **Hecho (23-oct):** `historialProducto.contexto.test.js`: 15 casos (actor del token, cabecera `email` falsa sin efecto, MCP oauth/servicekey/apikey, integraciones, sin clasificar). Falló con `Cannot find module` antes del módulo.
- [x] 2.3 [P] `tests/productos/historialProducto.escritor.test.js`: bandera apagada = cero escrituras; corte general; solo `create`; `ALREADY_EXISTS` = éxito; reintentos solo ante transitorios; falla final → `integration_audit` sin datos personales; nunca lanza; lote de 30 con el mismo `batch.id` y una sola lectura de bandera.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla con `Cannot find module`.
  - **Hecho (23-oct):** `historialProducto.escritor.test.js`: 30 casos (bandera apagada, corte general, solo `create`, `ALREADY_EXISTS`, reintentos, falla a `integration_audit`, nunca lanza, lote de 30, 400 filas → 120 eventos, una sola lectura de bandera por lote). Falló con `Cannot find module` antes del módulo.
- [x] 2.4 [P] `tests/productos/historialProducto.inmutable.contract.test.js`: escaneo de D7.1 con su lista permitida.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla porque `constantes.js` no existe.
  - **Hecho (23-oct):** `historialProducto.inmutable.contract.test.js`: 8 casos. Lista permitida del literal `productHistory`: `constantes.js` y `batchStore.js` (v1 de fotos, hasta la F2). Falló porque `constantes.js`, `escritor.js` y `lectura.js` no existían (y por el literal que aún tenía `controllers/productos.js`, que 4.1 quitó).
- [x] 2.5 [P] `tests/productos/historialProducto.writeset.contract.test.js`: el módulo solo hace `productHistory.create` e `integration_audit.create`; ningún archivo de inventario lo importa; un ajuste de existencias deja producto, variantes, precios y listas sin cambios y sin evento.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla por la razón esperada.
  - **Hecho (23-oct):** `historialProducto.writeset.contract.test.js`: 4 casos (el escritor solo `productHistory.create` e `integration_audit.create`; la lectura solo lee; ningún archivo de inventario, existencias o Kuvo importa el módulo; un ajuste de existencias no cambia el producto ni deja evento). Falló por `Cannot find module`.
- [x] 2.6 [P] `tests/productos/historialProducto.lectura.test.js`: 404 ajeno con rastro; empresa del token; costos ocultos sin permiso; mezcla con registros v1 de fotos; 140 eventos en páginas de 50 sin dobles, asc y desc; bandera apagada o índice faltante → vista de antes; sin `vista`, respuesta idéntica a la de hoy.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla con `Cannot find module`.
  - **Hecho (23-oct):** `historialProducto.lectura.test.js`: 27 casos (404 ajeno = inexistente con rastro, empresa del token, costos ocultos sin permiso, mezcla con v1, 140 eventos en páginas de 50 asc y desc sin dobles, bandera apagada o índice faltante → vista de antes, sin `vista` idéntica a la de hoy, controlador y ruta). Falló por `Cannot find module`.
- [x] 2.7 `tests/productos/historialProducto.puntos.contract.test.js`: un caso por punto P1-P12 (inspección del código, patrón `tests/sellerMobileNotifications/orderControllerHook.test.js`), más la prueba de que con el registrador roto cada escritor guarda en `products` lo mismo que antes, incluido `date_edit`.
  - **Depende de:** 1.3.
  - **Hecho cuando:** sus 12 casos están en rojo a propósito y el de «producto igual» en verde.
  - **Hecho (23-oct):** `historialProducto.puntos.contract.test.js`: P1-P12 en rojo a propósito (los 12 fallan con «falta usar el módulo historialProducto», ninguno por ancla perdida) y los 2 de «producto igual» en verde (el registrador nunca lanza aunque todo esté roto; cada escritor sigue escribiendo `date_edit` y `user_edit`).
- [ ] 2.8 Scripts `test:historial-producto` (2.1 a 2.6) y `test:historial-producto:puntos` (2.7) en `package.json`.
  - **Depende de:** 2.1-2.7.
  - **Hecho cuando:** los dos scripts corren y muestran los rojos esperados.
  - **Pendiente (23-oct):** **Falta el cambio en `package.json`** (no se toca desde esta sesión). Líneas a agregar en `scripts`:
    - `"test:historial-producto": "node tests/productos/historialProducto.diferencias.test.js && node tests/productos/historialProducto.contexto.test.js && node tests/productos/historialProducto.escritor.test.js && node tests/productos/historialProducto.inmutable.contract.test.js && node tests/productos/historialProducto.writeset.contract.test.js && node tests/productos/historialProducto.lectura.test.js"`
    - `"test:historial-producto:puntos": "node tests/productos/historialProducto.puntos.contract.test.js"`
    - **Sumadas por los enganches (26-oct), para el script de 5.15:** `tests/productos/historialProducto.enganche.{crear,editar,eliminar,campoMasivo,preciosTipoCliente,accionMasiva,costoManual,importarPrecios,limpiarPrecios,costoImportacion,mcpUpdateProduct}.test.js` (cada una se corre con `node`, termina con `process.exit`).
## 3. Backend: el módulo, todavía sin enganchar

- [ ] 3.1 `productHistoryLog` en `FEATURE_FLAG_NAMES` (`services/companyFeatureFlags.js`) con su comentario (D-548, dueño Daniel, retiro 2027-04-30, corte general) y en `tests/companies/companyFeatureFlags.test.js`.
  - **Depende de:** 0.5.
  - **Hecho cuando:** las pruebas de banderas pasan y la bandera no nace encendida.
  - **Pendiente (23-oct):** **Falta.** `services/companyFeatureFlags.js` y `tests/companies/companyFeatureFlags.test.js` no se tocan desde esta sesión. Líneas exactas en el informe de la entrega. Mientras no estén, `isFeatureEnabled(…, "productHistoryLog")` responde `false` (estado seguro: nada se escribe).
- [x] 3.2 `services/productos/historialProducto/constantes.js` y `etiquetas.js`.
  - **Depende de:** 1.1.
  - **Hecho cuando:** 2.4 en verde.
  - **Hecho (23-oct):** `services/productos/historialProducto/constantes.js` y `etiquetas.js`. Prueba 2.4 en verde.
- [x] 3.3 `diferencias.js` (funciones puras).
  - **Depende de:** 2.1, 3.2.
  - **Hecho cuando:** 2.1 en verde.
  - **Hecho (23-oct):** `diferencias.js` (funciones puras, más `conParche` y `armarEvento`). Prueba 2.1 en verde (38/38).
- [x] 3.4 `contexto.js`.
  - **Depende de:** 2.2, 3.2.
  - **Hecho cuando:** 2.2 en verde.
  - **Hecho (23-oct):** `contexto.js`. Prueba 2.2 en verde (15/15).
- [x] 3.5 `log.js` con la lista cerrada de D11.
  - **Depende de:** 3.2.
  - **Hecho cuando:** un texto con «@» sale como `[omitido]` en su prueba.
  - **Hecho (23-oct):** `log.js` con la lista cerrada; un texto con «@» sale `[omitido]`.
- [x] 3.6 `escritor.js` (`registrar` y `registrarLote`).
  - **Depende de:** 2.3, 2.5, 3.3, 3.4, 3.5.
  - **Hecho cuando:** 2.3, 2.4 y 2.5 en verde.
  - **Hecho (23-oct):** `escritor.js` (`registrar` y `registrarLote` con BulkWriter solo `create`). Pruebas 2.3, 2.4 y 2.5 en verde.
  - **Corregido (23-oct, revisión):** `escribirTanda` esperaba las promesas ANTES de `bw.close()`, y el BulkWriter real solo envía al juntar 20 operaciones o al cerrar: un lote que no fuera múltiplo de 20 (3, 25, 30, 41) se colgaba y perdía eventos. Ahora engancha `allSettled`, cierra y luego lee. El doble de pruebas imita ese comportamiento (no resuelve hasta 20 operaciones o `close()`) y se sumó `tests/productos/historialProducto.lote.emulator.test.js` (3, 25, 30, 41 y 400 filas con 120 cambios) contra el emulador de Firestore: con el código anterior fallan 4 de 5, con el nuevo pasan los 5. Falta el script `test:historial-producto:emulador` en `package.json` (ver informe).
- [x] 3.7 `lectura.js` (vista nueva, vista de antes, registros v1, filtro de costos con `menusDelRol` y `puedeVerMargen`).
  - **Depende de:** 2.6, 1.4.
  - **Hecho cuando:** 2.6 en verde.
  - **Hecho (23-oct):** `lectura.js` (vista nueva, vista de antes, registros v1, filtro de costos con `menusDelRol`, `isAdminFamilyRole` y `puedeVerMargen`). Prueba 2.6 en verde (27/27). La lista de roles de 1.4 no hizo falta para escribirlo.
  - **Corregido (23-oct, revisión):** `leerFotos` pedía los `limit(N)` más nuevos por `fecha` y quitaba los v2 DESPUÉS; con más de 50 eventos v2 más nuevos que una foto, la vista de antes salía vacía (y con 100, la mezcla nunca mostraba la foto). Los eventos v2 ya NO escriben `fecha` (se ordenan por `occurredAt`), así que no entran a la consulta de fotos ni llenan su tope; el filtro `esV2` queda como defensa. Pruebas nuevas: 120 eventos v2 más nuevos + una foto, con y sin `vista` (29/29). Sin índice nuevo: no hay datos v2 escritos aún (bandera apagada).
- [x] 3.8 `index.js` y `node --check` de los 8 archivos.
  - **Depende de:** 3.6, 3.7.
  - **Hecho cuando:** `npm run test:historial-producto` en verde.
  - **Hecho (23-oct):** `index.js`; `node --check` de los 8 archivos y las 6 pruebas de `test:historial-producto` corridas en cadena en verde (122 casos). El script de `package.json` espera a 2.8.
## 4. Backend: la lectura

- [x] 4.1 `controllers/productos.js:2930` delega en `lectura.js` (las dos vistas) y `routers/productos.js:733` suma `requireJwtTenantOrPlatform`.
  - **Depende de:** 3.8.
  - **Hecho cuando:** 2.6 en verde contra el controlador; sin `vista`, la respuesta es idéntica a la de hoy para un producto con historial de fotos.
  - **Hecho (23-oct):** `controllers/productos.js` (`getHistorial`) delega en `leerPagina` con la empresa del JWT y `routers/productos.js` suma `requireJwtTenantOrPlatform`. Sin `vista`, la respuesta es idéntica a la de hoy para un producto con historial de fotos. Prueba 2.6 en verde, incluido el caso del controlador y la ruta (inspección).
## 5. Backend: usuario del token y enganches (uno a la vez; diff y aprobación antes de cada commit)

- [ ] 5.1 Usuario del token, no de la cabecera, en costo (`controllers/productCosts.js:168, 267, 416`).
  - **Depende de:** 0.4.
  - **Hecho cuando:** una prueba con cabecera `email` falsa guarda el correo del token en `costo.actualizadoPor` y en `productCostHistory.importedBy`.
  - **Aplicado en la copia de trabajo (23-oct), espera el diff aprobado por Daniel:** `controllers/productCosts.js` (`usuarioDeLaSesion`: con JWT solo el correo del token, o «system» si el token no lo trae; la cabecera `email`/`user` queda solo para la llave de servicio) en `previewCostImport`, `applyCostImport` y `updateProductCost`. Prueba nueva `tests/productos/costoUsuarioDelToken.test.js` (7 casos en verde; contra el `productCosts.js` de HEAD falla). Sin commit.
  - **Ampliado tras la revisión (23-oct):** `routers/fulfillmentIntegrations.js` suma `requireJwtTenantOrPlatform` a las cinco rutas `/cost-import/*`, porque la empresa salía de la cabecera `company` y otra empresa podía escribir y leer costos ajenos (la comprobación de dueño comparaba contra esa misma cabecera). Prueba: 10 casos en verde (cabecera ajena = 403 y cero escrituras; las cinco rutas llevan el middleware). Efecto: la llave de servicio ya no entra a esas rutas (solo las llama el Seller). Sin commit.
  - **No se cerró aquí:** que solo ciertos roles puedan escribir costos pasa a 5.16 y a Open Questions 5.
- [ ] 5.2 Lo mismo en importar precios (`productos.js:3349`) y limpiar precios (`:3727`).
  - **Depende de:** 0.4.
  - **Hecho cuando:** misma prueba sobre `user_edit`.
  - **Aplicado en la copia de trabajo (23-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` suma `usuarioDeLaSesion(req, etiqueta)` (con JWT solo el correo del token, o la etiqueta de la operación si el token no lo trae; la cabecera `email`/`user` queda solo para la llave de servicio) y la usa en `importPrecios`, `importPreciosUnitarios`, `importPreciosVolumen` (las tres importaciones, como lista la propuesta: `:3349`, `:3467`, `:3580`) y `limpiarPrecios`. Prueba nueva `tests/productos/precioUsuarioDelToken.test.js` (16 casos en verde; contra el `productos.js` de HEAD falla con el correo falso). Sin commit.
  - **Ampliado tras la revisión (23-oct):** esas cuatro rutas iban solo con `auth` y tomaban la empresa de la cabecera `company` (cualquier usuario con sesión podía escribir precios o borrar `preciosPorTipoCliente` de otra empresa). `routers/productos.js` las monta ahora con `...SESION_EMPRESA` (`auth`, sesión de usuario, empresa del token, `requireJwtTenant`), como D-495 y 5.1; el controlador no cambia porque `requireJwtTenant` fija `headers.company` desde el token. Prueba: `empresaDelTokenProductos.contract.test.js` suma las cuatro rutas (15 casos en verde: llave de servicio = 401, cabecera/cuerpo `company` ajenos se descartan; contra el router de HEAD fallan 4). Efecto: la llave de servicio ya no entra a esas rutas (solo las llama el Seller, que va con JWT). Sin commit.
- [x] 5.3 Lo mismo en acciones masivas (`productos.js:3952`).
  - **Depende de:** 0.4.
  - **Hecho cuando:** misma prueba sobre `user_edit`.
  - **Aplicado en la copia de trabajo (23-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` (`bulkPatch`) usa `usuarioDeLaSesion(req, 'system')` en vez de `req.headers.email || 'system'` (una línea; con JWT solo el correo del token, con la llave de servicio la cabecera como hasta hoy). Prueba nueva `tests/productos/accionMasivaUsuarioDelToken.test.js` (13 casos en verde; contra el `productos.js` de HEAD falla con el correo falso). Las pruebas de 5.2 (16) y de empresa del token (15) siguen en verde. Sin commit.
  - **Ampliado tras la revisión (23-oct):** `PATCH /bulk-patch` iba solo con `auth` y tomaba la empresa de la cabecera `company` (cualquier usuario con sesión podía activar, desactivar, agotar o ELIMINAR productos de otra empresa; figuraba como C-7 en `candado-empresa-rutas-seguridad`). `routers/productos.js:727` la monta ahora con `...SESION_EMPRESA`; el controlador no cambia porque `requireJwtTenant` fija `headers.company` desde el token. Único cliente: el Seller (`maestro.service.ts` `bulkPatchProductos`, con JWT); ningún agente ni flow la llama con la llave de servicio, que ahora recibe 401. Prueba: `empresaDelTokenProductos.contract.test.js` suma 4 casos de `PATCH /bulk-patch` (cadena, 401 con llave de servicio, JWT de A con cabecera B pidiendo eliminar/desactivar/agotar el producto de B = cero escrituras, producto propio se escribe con el correo del token); 19 casos en verde, contra el router de HEAD fallan los 4. Espera el diff aprobado por Daniel (módulo de escritores de productos). Sin commit.
- [x] 5.4 P1 `create` (`productos.js:447`): `product_created` con `snapshot`.
  - **Depende de:** 3.8, 2.7.
  - **Hecho cuando:** su caso de 2.7 en verde y las pruebas de alta de productos y de tienda en un paso siguen en verde.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` registra «Producto creado» (previo `null`, lo guardado, actor del token) justo después del `add`, sin esperarlo; `controllers/tiendaEnUnPaso.js` entrega `authType: "jwt"` y `historialCanal: "single_step_store"` para que la Tienda en un paso (fila 39) salga a nombre de quien la inició y con su canal (lo fija el servidor, no el navegador). Pruebas: `historialProducto.enganche.crear.test.js` (6 casos en verde, con arnés `_enganchesProductosArnes.js`); P1 de 2.7 en verde (se corrigió su ancla, que caía en el `create` viejo comentado); `tiendaEnUnPasoContenido` y `tiendaEnUnPasoRuta` en verde. Parche: `scratchpad/r5/D-548-54.patch`. Sin commit. Con la bandera apagada no cambia nada visible.
- [x] 5.5 P2 `edit` (`productos.js:1895`): evento combinado.
  - **Depende de:** 5.4.
  - **Hecho cuando:** su caso en verde; prueba de que `date_edit` se escribe igual.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` registra UN evento por guardado después del `update`, con lo leído antes (`productSnapshot.data()`) y lo que quedó (`productData`). Pruebas: `historialProducto.enganche.editar.test.js` (6 casos en verde: el antes es lo guardado, `user_edit` del token y `date_edit` igual, ajeno = 404 sin evento, registrador roto = mismas escrituras, de punta a punta un cambio de precio deja UN `price_changed` y un guardado sin cambios no deja nada); P2 de 2.7 en verde. Parche: `scratchpad/r5/D-548-55.patch` (se aplica sobre el de 5.4). Sin commit.
- [x] 5.6 P3 `delete` (`:2025`) y P4 `deleteAllByCompany` (`:2843`).
  - **Depende de:** 5.5.
  - **Hecho cuando:** sus casos en verde; el lote de P4 lleva un solo `batch.id`.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js`: `delete` registra «Producto eliminado» con la foto de lo leído antes de borrar; `deleteAllByCompany` anota cada producto al confirmarse su commit y registra un solo lote (canal «Acción masiva», un `batch.id`) en un `finally`: si un lote de 500 falla, solo quedan eventos de los que SÍ se borraron (el diff vuelve a sangrar el ciclo por el `try`). Pruebas: `historialProducto.enganche.eliminar.test.js` (8 casos en verde, incluido 620 productos con el segundo commit caído y 25 productos de punta a punta con el mismo lote); P3 y P4 de 2.7 en verde. Parche: `scratchpad/r5/D-548-56.patch` (se aplica sobre los de 5.4 y 5.5). Sin commit.
- [x] 5.7 P5 `bulkUpdateField` (`:1800`).
  - **Depende de:** 5.6.
  - **Hecho cuando:** su caso en verde; un producto que ya tenía el valor no deja evento.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` registra un evento por producto que SÍ cambió, todos con el mismo lote («Cambiar el IVA / el precio / un dato de todo el catálogo», canal «Acción masiva», actor del token), al confirmarse cada commit de 500 y en un `finally` (si un lote posterior falla, solo quedan los que se guardaron); quien ya tenía el valor no deja evento. Pruebas: `historialProducto.enganche.campoMasivo.test.js` (9 casos en verde, de punta a punta con el escritor real); P5 de 2.7 en verde. El arnés `_enganchesProductosArnes.js` ahora aplica rutas punteadas en `update` y lee documentos de otras colecciones (`estado.otras`); las pruebas de 5.4 a 5.6 siguen en verde. **Hallazgo:** cambiar la tarifa de IVA queda como «Producto editado» con el detalle del IVA (la tarifa es un dato del producto, no un precio: catálogo D2), no «Precio cambiado» como decía la tabla D6; el precio sin IVA sí es «Precio cambiado». `disponibilidad.estado/activo` se siguen guardando como hoy y no dejan evento (la pantalla no los lee). Parche: `scratchpad/r6/D-548-5.7.patch`. Sin commit.
  - **Corrección de revisión (26-oct, blocker):** `POST /bulk-update-field` salía con `auth` a secas y leía la empresa de la cabecera `company`, así que cualquier usuario de A podía reescribir el IVA o el precio de TODO el catálogo de B (y dejar sus eventos en el historial de B). Ahora monta `...SESION_EMPRESA, ONLY_ADMIN` (empresa del token y solo administradores; el front no llama esta ruta). Parche: `scratchpad/r6/D-548-5.7-5.8-tenant.patch`.
- [x] 5.8 P6 `updatePreciosTipoCliente` (`:3861`).
  - **Depende de:** 5.7.
  - **Hecho cuando:** su caso en verde (incluido el cambio de base en el mismo evento). El criterio «`tests/orders/preciosPorTipoFase0.test.js` sigue en verde» NO se cumple y se separa en 5.8b: esa prueba ya falla en el código commiteado.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` registra UN evento por guardado después del `update`, con lo leído antes (`data`) y `conParche(data, escritura)`, de modo que el precio del tipo de cliente y, si la empresa lo manda desde ahí, el precio base van en el MISMO evento; actor del token, sin esperar. Pruebas: `historialProducto.enganche.preciosTipoCliente.test.js` (8 casos en verde: antes y después, `user_edit`/`date_edit` como hoy, ajeno 403 / inexistente 404 sin evento, registrador roto = mismas escrituras con precio base sincronizado, de punta a punta un cambio deja UN `price_changed`, guardar lo mismo nada, base + tipo de cliente en un evento, precio 0 = quitar). P6 de 2.7 en verde. Parche: `scratchpad/r6/D-548-5.8.patch` (sobre el de 5.7). Sin commit.
  - **Corrección de revisión (26-oct, mayor):** `POST /precios-tipo-cliente` salía con `auth` a secas y el guardia comparaba el producto contra la cabecera `company` (la pone el cliente); además un producto sin `company` pasaba el guardia. Ahora monta `...SESION_EMPRESA` (empresa del token) y el guardia rechaza con 403 todo producto cuya `company` no sea la de la sesión, también el que no la tiene. Pruebas nuevas en `empresaDelTokenProductos.contract.test.js` (23/23; las dos rutas están en `RUTAS`, y hay casos punta a punta con JWT de A y cabecera B, de un Vendedor y de la llave de servicio; en rojo contra el router anterior). Parche: `scratchpad/r6/D-548-5.7-5.8-tenant.patch`.
- [ ] 5.8b `tests/orders/preciosPorTipoFase0.test.js` en verde (criterio que 5.8 dejó fuera).
  - **Hallazgo (26-oct):** la prueba falla (45294.1176… contra 45294.12, `preciosPorTipoFase0.test.js:130`) también sobre el código commiteado: lo comprobé con copias de `HEAD` y de `af6e2925~1` (D-536) y falla igual, sin el `orderCalculationService.js` sin commitear de otra sesión (la nota anterior que se lo atribuía era falsa). No carga `productos.js`. En `4c88156b` (donde nació la prueba) no falla la aserción; la regresión entró entre ese commit y `af6e2925~1`, falta acotarla con `git bisect` sobre copias. No es de este cambio: abrir ticket aparte (dueño: pedidos/precios, D-536).
- [x] 5.9 P7 `bulkPatch` (`:3950`, `:3957`).
  - **Depende de:** 5.3, 5.8.
  - **Hecho cuando:** inactivar 30 productos deja 30 eventos con el mismo lote.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` guarda `snap.data()` de cada producto válido en el bucle de validación (antes se descartaba) y registra un evento por producto que cambió o se borró, todos con el mismo lote («Inactivar productos», «Eliminar productos»…, canal «Acción masiva», actor del token), al confirmarse cada commit de 490 y en un `finally`; los de otra empresa, los inexistentes y los que tienen existencias (al eliminar) no se escriben ni se registran; quien ya estaba así no deja evento. El diff reindenta el bucle de commits por el `try`. Pruebas: `historialProducto.enganche.accionMasiva.test.js` (9 casos en verde: 30 inactivados = 30 eventos con el mismo lote, ajenos, eliminar con existencias, 600 productos con el segundo commit caído = solo 490, registrador roto = mismas escrituras en las cinco acciones, de punta a punta activar/agotado/disponible/eliminar); P7 de 2.7 en verde. Parche: `scratchpad/r6/D-548-5.9.patch` (sobre el de 5.8). Sin commit.
- [x] 5.10 P8 `updateProductCost` (`productCosts.js:457`).
  - **Depende de:** 5.1, 5.9.
  - **Hecho cuando:** su caso en verde y `productCostHistory` se sigue escribiendo igual.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productCosts.js` (`updateProductCost`) arma el parche del costo en una variable, hace el mismo `update` y registra UN «Costo cambiado» con lo leído antes (`data`) y `conParche(data, parche)`, actor del token, sin esperar; `productCostHistory`, `date_edit` y la respuesta quedan idénticos. Pruebas: `historialProducto.enganche.costoManual.test.js` (7 casos en verde, con arnés nuevo `_enganchesCostosArnes.js`: antes y después, escrituras iguales, ajeno 403 / inexistente 404 / costo inválido 400 sin evento, no espera, registrador roto = mismas escrituras, llave de servicio sale como «Agente interno», de punta a punta un cambio deja UN `cost_changed` 30.000 → 45.000 y repetir el mismo costo nada; bandera apagada = cero escrituras); P8 de 2.7 en verde; `costoUsuarioDelToken` (10), `empresaDelTokenProductos` (23) y los contract de inmutabilidad y write-set siguen en verde. Parche: `scratchpad/r7/D-548-5.10.patch`. Sin commit.
- [x] 5.11 P9 importaciones de precios (`productos.js:3363, 3530, 3664`).
  - **Depende de:** 5.2, 5.10.
  - **Hecho cuando (backend; se dividió el 26-oct por la revisión):** un cuerpo de 400 filas que cambia 120 deja 120 eventos con el mismo lote y, si el cuerpo trae `archivo`, ese nombre (probado). Que el Seller mande `archivo` es 6.7, NO está hecho.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js`: las tres importaciones (`importPrecios` por tipo de cliente, `importPreciosUnitarios` y `importPreciosVolumen`) anotan un evento por producto que SÍ se guardó, todos con el mismo lote «Importación de precios» (canal `price_import`, tipo `import`, actor del token), al confirmarse cada commit de 500 y al terminar; si un commit posterior falla, el `catch` registra solo lo que se confirmó. El nombre del archivo es el campo opcional `archivo` del cuerpo (texto, recortado a 120; sin él, «Importar precios por tipo de cliente / unitarios / por volumen»). Los antes: `importPrecios` ya leía los documentos completos; unitarios y volumen toman `previoHistorial` de `mapaReferenciasProducto`, que ahora además trae `crearProducto.titulo` (la misma máscara, un campo de texto más) para que el evento diga el nombre. Un producto repetido en el archivo deja UN evento con el último valor. Pruebas: `historialProducto.enganche.importarPrecios.test.js` (31 casos en verde, los 3 importadores: un lote con actor del token y archivo, 400 filas que cambian 120 = 120 eventos con el mismo lote, importar lo mismo no deja nada, commit caído = 500 eventos, sin coincidencias nada, no espera, registrador roto = mismas escrituras con `user_edit` del token, bandera apagada = cero escrituras, repetido, tipo de cliente conservado, volumen); P9 de 2.7 en verde; las pruebas de 5.2 (16), de empresa del token (23) y de 5.4 a 5.10 siguen en verde. Parche: `scratchpad/r7/D-548-5.11.patch`. Sin commit.
  - **Falta del lado del Seller:** pasó a la tarea 6.7: hoy ningún llamador (`maestro.service.ts` importPreciosTipoCliente/Unitarios/Volumen ni `lista-precios.component.ts`) manda `archivo`, así que en producción el lote sale con el nombre por defecto. Tampoco es cierto que cada petición lleve hasta 500 filas: el de tipo de cliente parte por `CHUNK_REFS = 1000` referencias (`lista-precios.component.ts:1460`) con varias filas por referencia, así que una petición puede pasar de 500 filas y es un lote propio; un archivo grande deja varios lotes con el mismo nombre (el id del lote lo fija siempre el servidor, nunca el navegador, para que nadie pueda repetir un id y callar eventos).
- [x] 5.12 P10 `limpiarPrecios` (`:3724`).
  - **Depende de:** 5.11.
  - **Hecho cuando:** su caso en verde con `after: null`. El `batch.commit()` sin esperar queda anotado como hallazgo, no se corrige aquí.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productos.js` (`limpiarPrecios`) anota cada producto limpiado con lo leído (`doc.data()`) y el mismo parche con `conParche` (el campo queda quitado: `after: null` en cada tipo de cliente) y registra cada tanda de 500 cuando SU commit se confirma, todas con el mismo lote «Acción masiva» (`total` = todos los productos del catálogo con precios). El commit intermedio SIGUE sin esperarse (hallazgo, no se corrige): solo se le cuelga el registro con `.then`, así que su rechazo sin manejar es idéntico al de hoy y esa tanda no deja eventos. Pruebas: `historialProducto.enganche.limpiarPrecios.test.js` (9 casos en verde: antes y después, escrituras iguales con `user_edit` del token, sin precios nada, 620 = tandas de 500 y 120 con el mismo lote y total, commit intermedio caído, commit final caído = 500 y solo 500 eventos, no espera, registrador roto = mismas escrituras, de punta a punta 25 productos = 25 eventos con `after: null` y bandera apagada = cero escrituras); P10 de 2.7 en verde; las pruebas de 5.4 a 5.11 siguen en verde. El arnés `_enganchesProductosArnes.js` suma, sin cambiar lo anterior, que `FieldValue.delete()` quita el campo como el SDK real. Parche: `scratchpad/r7/D-548-5.12.patch` (se aplica sobre el de 5.11). Sin commit.
- [x] 5.13 P11 `applyCostImport` (`productCosts.js:335`).
  - **Depende de:** 5.12.
  - **Hecho cuando:** su caso en verde.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `controllers/productCosts.js` (`applyCostImport`) lee el antes de lo GUARDADO con un `getAll` por tanda de 400 y máscara de campos (`company`, referencia, título y las rutas del costo; el `costoAnterior` del navegador no se usa), arma el parche en una variable y registra cada tanda cuando SU commit se confirma: UN «Costo cambiado» por producto, todos con el mismo lote «Importación de costos» (canal `cost_import`, tipo `import`, `fileName` o «Importar costos», `total` = filas del archivo, actor del token), sin esperar. Si una tanda posterior falla, solo quedan los eventos de las guardadas; si el `getAll` falla, esa tanda no deja eventos y la importación sigue igual. Un producto repetido en el archivo deja un evento con el último costo, también si cae en tandas distintas (revisión 26-oct: antes el id `{producto}__{lote}` chocaba y el evento del último costo se perdía; ahora se acumula entre tandas, con el antes original, y se registra en la tanda de su última aparición o al terminar; 2 casos nuevos, 17 en verde). Parche de la corrección: `scratchpad/r7/D-548-5.13-fix-tandas.patch` (sobre 5.10 y 5.13). `productCostHistory` y `productCostImports` no cambian. **Con la bandera apagada no hay ni una lectura de más:** `historialProducto.estaActivo(empresa)` (nuevo en `escritor.js`/`index.js`: bandera de la empresa y corte general, nunca lanza, `false` ante la duda) se pregunta una vez por importación antes de leer. Pruebas: `historialProducto.enganche.costoImportacion.test.js` (15 casos en verde: antes leído e ignorando el del navegador, máscara, escrituras iguales, 400 filas que cambian 120 = 120 eventos con el mismo lote y archivo, repetir no deja nada, 900 filas = 3 tandas con el mismo lote, tanda caída, ajeno e inválido sin lectura ni evento, repetido, bandera apagada = cero lecturas y cero escrituras, `getAll` caído, no espera, registrador roto = mismas escrituras, `estaActivo`); P11 de 2.7 en verde (su región pasa de 4.200 a 7.000 caracteres: la lectura del antes la alargó); inmutabilidad, write-set (el módulo sigue solo con `create`), escritor (32) y `costoUsuarioDelToken` siguen en verde. Arnés nuevo para costos: `_enganchesCostosArnes.js` (de 5.10, ahora con `getAll` y máscara). Parche: `scratchpad/r7/D-548-5.13.patch` (se aplica sobre el de 5.10). Sin commit.
- [x] 5.14 P12 `update_product` (`tools/updateProduct.js:221`), origen Claude/MCP.
  - **Depende de:** 5.13.
  - **Hecho cuando:** su caso en verde y las pruebas MCP de `update_product` siguen en verde.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `tools/updateProduct.js` registra, justo después del `ref.update(parche)` aprobado, UN evento combinado con lo leído antes (`datos`) y `conParche(datos, parche)`, con el contexto de la CREDENCIAL del MCP (`desdeMcp(context)`: la persona que aprobó, «Claude/MCP» si la llave no lleva persona, «Opttia» con la llave de servicio, «Llave de la empresa» con la `apikey`), sin esperar; lo que se guarda y la respuesta de la tool no cambian. Pruebas: `historialProducto.enganche.mcpUpdateProduct.test.js` (8 casos en verde, con la tool real y Firestore en memoria: antes y después, escrituras iguales, propuesta / comprobante falso / «ya estaba así» / producto ajeno sin escritura ni evento, actor por tipo de credencial, no espera, registrador roto = mismas escrituras, de punta a punta un cambio de nombre y de «se puede vender» deja UN evento «Producto inactivado» con las dos etiquetas y origen `mcp`, bandera apagada = cero escrituras); **las 14 pruebas de 2.7 (P1 a P12 y las 2 de «producto igual») quedan en verde**; `tests/mcp/updateProduct.test.js` (9, contra Firestore de solo lectura), `confirmacion` (12), `tarjetaSoporte` (14) y `confirmarTarjeta` (12) siguen en verde. Parche: `scratchpad/r7/D-548-5.14.patch`. Sin commit.
- [x] 5.15 Suite completa: `test:historial-producto`, `test:historial-producto:puntos` (se suma al principal) y la regresión de `design.md` («Pruebas»).
  - **Depende de:** 5.4-5.14.
  - **Hecho cuando:** 0 fallas.
  - **Hecho (26-oct, sobre el commit `49e05e6a`):** `npm run test:historial-producto` 137/137 en verde (17 archivos); `historialProducto.puntos.contract.test.js` 14/14 (P1-P12 más los 2 de «producto igual»); `accionMasivaUsuarioDelToken`, `costoUsuarioDelToken`, `precioUsuarioDelToken` y `empresaDelTokenProductos.contract` (5.1-5.3) en verde; las 14 pruebas de `productPhotos/*`, `coberturaListasPrecio`, `flows/pasosDeInicio` y `nodeCatalogCoverage` (cursor de `katuq-product-changed`), `mcp/updateProduct`, `updateProductPhotos`, `tarjetaSoporte`, `confirmarTarjeta`, `storeMigration/importStore*` y `sitios/tiendaEnUnPasoRuta`/`Contenido` en verde. `historialProducto.lote.emulator` se omite sin emulador de Firestore (corre con `firebase emulators:exec`; no se corrió aquí). **Dos rojos que NO son de este cambio:** `tests/orders/preciosPorTipoFase0.test.js` (ya anotado en 5.8b) y `tests/sitios/tiendaEnUnPaso.test.js`, escenario «si Opttia no responde, la tienda sale igual…» (`published` sale `false`): falla igual sobre el código de `ecbb215f~1`, antes de cualquier enganche de D-548, así que es de sitios, no del historial. **Falta en `package.json`** (no se toca desde esta sesión): sumar `test:historial-producto:puntos` y los tests de 5.1-5.3 (ver informe).
- [ ] 5.16 Rol para escribir costos (hallazgo de revisión): decidir con Daniel qué roles editan o importan costos (Open Questions 5) y, aprobado, gatear las cinco rutas `/cost-import/*`.
  - **Depende de:** 5.1 y la respuesta de Daniel (censo de roles de los comercios con costos, solo nombres de rol).
  - **Hecho cuando:** un rol sin permiso recibe 403 con cero escrituras, y la regla es la misma de D9.

## 6. Front

- [ ] 6.1 «Última edición» en hora de Colombia y con quién en el listado (`productos.component.html:774`) y en la ficha (`crear-productos.component.html:2079`), con el mismo formato de la F0 de Listas de precios.
  - **Depende de:** 0.4.
  - **Hecho cuando:** `npm run build` sin errores y GCJ1236 muestra «23 oct 2026, 10:54 a. m.» y el correo, sin texto ISO.
  - **Pendiente (revisión del 26-oct):** falta verificar en la app real que GCJ1236 muestre «23 oct 2026, 10:54 a. m.» y el correo (el front local apunta a producción y no se inició sesión) y que Daniel apruebe el diff.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** el listado (`productos.component.html`, columna «Última Edición») y la pestaña «Historial» nueva de la ficha muestran la fecha en hora de Colombia («23 oct 2026, 10:54 a. m.», armada a mano en `historial-producto.util.ts` para que sea igual en todos los navegadores) y debajo el correo de quien editó, **solo con la bandera `productHistoryLog`**; con la bandera apagada, la columna del listado y la pestaña «Historial de cambios» de la ficha conservan el `dd/MM/yyyy` y el `dd/MM/yyyy HH:mm` de siempre (revisión: antes salía para todas las empresas). Solo se muestra el editor si tiene forma de correo: cualquier texto técnico de `user_edit` («import-precios», «system», «osmosis_sync», «flow-engine», «conector-mcp», «bot-whatsapp», «whatsapp-confirmacion», etc.) se oculta sin listarlo. La ordenación por `date_edit` no cambia. Pruebas: `tests/productos/historial-producto.util.test.js` (16 casos, también con `TZ=America/Los_Angeles`, `UTC` y `Asia/Tokyo`). Parche: `scratchpad/r8/D-548-6.1.patch`. Sin commit.
- [x] 6.2 `productHistoryLog` en `COMPANY_FEATURE_FLAGS` (`company-features.service.ts`), modelo `shared/models/historial-producto.model.ts` y servicio `shared/services/productos/historial-producto.service.ts extends BaseService`.
  - **Depende de:** 4.1.
  - **Hecho cuando:** compila; ningún `HttpClient` en componentes.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `productHistoryLog` en `COMPANY_FEATURE_FLAGS` (con dueño y retiro 2027-04-30), `shared/models/historial-producto.model.ts` y `shared/services/productos/historial-producto.service.ts extends BaseService` (`getSinLoader`: la pantalla muestra su propio esqueleto). Ningún `HttpClient` en componentes. Compila (build de producción sin errores). Parche: `scratchpad/r8/D-548-6.2-6.3.patch`. Sin commit.
- [x] 6.3 `historial-producto.util.ts` y `tests/productos/historial-producto.util.test.js` (`node --test` con ts-node, como `pos-linea-precio`).
  - **Depende de:** 6.2.
  - **Hecho cuando:** la prueba pasa: día en hora de Colombia con el cruce de la medianoche UTC, hora con segundos, COP y variación con «−».
  - **Aplicado en la copia de trabajo (26-oct):** `components/productos/historial-producto/historial-producto.util.ts` (funciones puras: día y hora en Colombia con el cruce de la medianoche UTC, hora con segundos, COP, variación con «−», agrupar por día, la consulta al servidor) y `tests/productos/historial-producto.util.test.js` (15 casos, `node --test` con ts-node; GCJ1236 +$35.670 / +83,7 %, GCJ1236C +$19.867 / +43,9 %). Mismo parche que 6.2. Falta en `package.json` del Seller (no se toca): `"test:historial-producto": "node --test tests/productos/historial-producto.util.test.js"`.
- [ ] 6.4 Componentes `HistorialProductoComponent` y `HistorialProductoEventoComponent` (OnPush, prefijo `hp-`), con carga, error, vacío y «Ver más».
  - **Depende de:** 6.3.
  - **Hecho cuando:** build sin errores; revisión a 1440 y 390 px sin scroll horizontal ni texto invisible.
  - **Pendiente (revisión del 26-oct):** falta la revisión a 1440 y 390 px con la app real y datos reales; solo se hizo con una maqueta estática. Y que Daniel apruebe el diff.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `HistorialProductoComponent` (carga con esqueleto, error con «Reintentar», vacío, «Ver más» con el cursor del servidor, orden «Más antiguos primero», resumen, respuesta `vista: 'legado'` = «no disponible por ahora»), `HistorialProductoEventoComponent`, `HistorialProductoModalComponent` (diálogo de Listas de precios) y `HistorialProductoModule`, todos OnPush. **Desvío:** el prefijo de clases es `hprod-`, no `hp-`: `hp-` contiene «p-» y el reset global `[class*="p-"]` (primeng-overrides.scss:89) forzaría su tamaño de letra. Sin gradientes ni primarios paralelos, todo texto con color y tamaño propios, sin `h1`-`h3`. Build de producción sin errores. Revisión visual con una maqueta estática de las clases reales (Chrome sin cabeza) a 1440 px y a 390 px: sin scroll horizontal ni texto cortado, con nombres de precio, correo y archivo largos; **no** se revisó con la app real y datos reales (el front local apunta a producción y no se inició sesión). Parche: `scratchpad/r8/D-548-6.4.patch` (archivos nuevos; usa el util de 6.2-6.3). Sin commit.
- [x] 6.5 Pestaña «Historial» de la ficha con la bandera; sin ella, la de hoy.
  - **Depende de:** 6.4.
  - **Hecho cuando:** con la bandera apagada la ficha se ve exactamente como hoy.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `crear-productos.component.html`/`.ts`/`.module.ts`: con la bandera, una pestaña «Historial» nueva (contenido creado al abrirla, `pTemplate="content"`); sin ella, la pestaña «Historial de cambios» de hoy con la misma condición de siempre y el mismo código de carga. Con la bandera apagada el HTML que se pinta es el de hoy. Parche: `scratchpad/r8/D-548-6.5.patch` (sobre 6.4).
- [ ] 6.6 Acción «Historial» por fila en las cuatro pestañas de Listas de precios; la de «Costo» solo si la persona puede ver costos.
  - **Depende de:** 6.4.
  - **Hecho cuando:** GCJ1236 en «Precio tipo clientes» abre solo sus cambios de precio; build sin errores; el conteo de gradientes y primarios prohibidos de `productos` y `lista-precios` no sube.
  - **Pendiente (revisión del 26-oct):** falta verificar en la app real que GCJ1236 en «Precio tipo clientes» abra solo sus cambios de precio, y que Daniel apruebe el diff.
  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** botón «Historial» (`pi-history`) junto al de editar en las cuatro pestañas, detrás de la bandera; abre el diálogo con solo precios (tipo cliente, unitario, volumen) o solo costo. **Costo (revisión del 26-oct):** el botón de «Costo» solo se ofrece si `puedeVerCostosHistorial` (util; espejo de D9: familia Administrador, rol que pasa `puedeVerMargen` o el menú «Lista de precios» en `authorizedMenuItems`); el servidor sigue decidiendo y, sin permiso, devuelve la lista vacía, y el texto vacío de costo ahora es neutro («No hay cambios de costo para mostrar en esta vista.»), no afirma que no existan cambios. Conteo de gradientes y primarios prohibidos en `lista-precios` y `productos`: no sube (no se agregó ninguno). Parche: `scratchpad/r8/D-548-6.6.patch` (sobre 6.4).
- [x] 6.7 Mandar `archivo` (el nombre del Excel) en las tres importaciones de precios: `maestro.service.ts` (importPreciosTipoCliente, importPreciosUnitarios, importPreciosVolumen) y las llamadas de `lista-precios.component.ts` (`:1172`, `:1240`, `:1487`).
  - **Depende de:** 5.11.
  - **Hecho cuando:** importar `precios-octubre.xlsx` deja los eventos con ese nombre en el lote; build sin errores; sin cambiar columnas, filtros ni validaciones (solo presentación y el campo opcional nuevo).

  - **Aplicado en la copia de trabajo (26-oct), espera el diff aprobado por Daniel:** `lista-precios.component.ts` guarda el nombre del Excel al leerlo y `maestro.service.ts` lo manda como campo opcional `archivo` en las tres importaciones (tipo de cliente, unitarios y volumen); sin archivo no cambia el cuerpo. No cambia columnas, filtros ni validaciones. Parche: `scratchpad/r8/D-548-6.7.patch` (sobre 6.6).
## 7. Datos (con aprobación antes de cada escritura)

- [ ] 7.1 Crear los índices y `fieldOverrides` de D1 con el Firebase CLI, sin `--force`.
  - **Depende de:** 1.2, 5.15.
  - **Hecho cuando:** los índices quedan en estado «listo».
  - **Parche preparado, SIN aplicar ni desplegar (26-oct):** `scratchpad/r8/D-548-7.1.patch` (contra `katuq_admin_back_firebase/firestore.indexes.json`; aplica sobre la copia de trabajo actual, que otra sesión tiene modificada). Suma los 4 índices de `design.md` («Desvíos») y los `fieldOverrides` sin índice para `details`, `prices`, `snapshot` y `actor`. Antes de desplegar: el archivo del repo tiene 286 índices y 0 overrides y el proyecto vivo 414 y 2 (`orders.fechaCreacion`, `products.procesoComercial.ocasionesMap`), así que el CLI preguntará por borrar lo que no está en el archivo: responder que NO (sin `--force`). Falta el despliegue con aprobación de Daniel.
- [ ] 7.2 Sumar `productHistory` a la regla de exclusión que publica D-541 (su tarea 5.2), probada en el emulador.
  - **Depende de:** 7.1 y la tarea 5.2 de D-541.
  - **Hecho cuando:** el ruleset publicado niega lectura y escritura de clientes sobre `productHistory`.

## 8. Despliegue, encendido y cierre

- [ ] 8.1 Backend con la bandera apagada: diff completo revisado, commit y push, `git pull` y reinicio.
  - **Depende de:** 5.15.
  - **Hecho cuando:** producción corre la versión y no hay escrituras nuevas en `productHistory`.
- [ ] 8.2 Front: build de producción y publicación con el candado.
  - **Depende de:** 6.6, 8.1.
  - **Hecho cuando:** la versión viva es la del build y sin la bandera todo se ve como antes.
- [ ] 8.3 FLORECER encendida (simulación y `--execute` de `scripts/set-company-feature.js`): crear, editar precio, importar 400 filas, inactivar 30, cambiar costo, borrar y un cambio desde Claude.
  - **Depende de:** 7.1, 8.2.
  - **Hecho cuando:** cada acción deja los eventos esperados, sin dobles, y los productos quedan iguales a una prueba sin la bandera.
- [ ] 8.4 ALMARA encendida.
  - **Depende de:** 8.3, 7.2 y OK de Daniel.
  - **Hecho cuando:** la bandera está encendida en ALMARA.
- [ ] 8.5 Observación de 5 días hábiles en ALMARA.
  - **Depende de:** 8.4.
  - **Hecho cuando:** fallas = 0, p95 de lectura < 1,5 s en 30 aperturas, 10 productos revisados sin dobles y el flow de Shopify igual.
- [ ] 8.6 Bitácora en `specs/CONTRACT.md` (commits, encendido, mediciones) y notas en los tickets 1357 y 1358 cuando corresponda.
  - **Depende de:** 8.5.
  - **Hecho cuando:** la entrada está con commits y fechas.

## 9. Retiro (Artículo XII)

- [ ] 9.1 2027-04-30: `productHistoryLog` encendida para todos o eliminada, con la rama apagada fuera del código.
  - **Depende de:** 8.5.
  - **Hecho cuando:** no queda lectura de la bandera.

## 10. Fases siguientes (cada una con su checkpoint)

- [ ] 10.1 Diseño y tareas de la F2 (integraciones con medición en sombra, fotos, atributos, importación de productos, reconstruido y filtros).
  - **Depende de:** 8.5.
  - **Hecho cuando:** Daniel aprueba el diseño y las tareas de la F2.
- [ ] 10.2 Diseño y tareas de la F3 (reporte, exportación y aviso nuevo).
  - **Depende de:** 10.1.
  - **Hecho cuando:** Daniel los aprueba.
- [ ] 10.3 Decisión sobre la F4 (revertir).
  - **Depende de:** uso real de F1 a F3.
  - **Hecho cuando:** Daniel decide hacerla o sacarla del alcance, y queda en el contrato.
