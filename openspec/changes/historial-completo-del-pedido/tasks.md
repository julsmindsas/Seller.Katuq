> Tareas de la **F1**. Las F2 a F4 tendrán sus propias tareas cuando se diseñen. Módulo sensible `orders`: un cambio a la vez, con el diff a la vista y aprobación antes de cada commit. Cada tarea de código cierra con `node --check` de los archivos tocados y sus pruebas en verde. No se avanza con el build roto. Decisión D-XXX: la sesión principal pone el número.

## 0. Decisiones y checkpoints

- [x] 0.1 Propuesta y specs aprobadas por Daniel (23-oct), con las 5 decisiones de `design.md`.
- [x] 0.2 Aprobación de `design.md`, con las respuestas a sus Open Questions 1 a 5.
  - **Hecho:** aprobado por Daniel el 23-oct; las respuestas quedan anotadas en `design.md` («Open Questions → resueltas»): no se firma el canal (la App se ve como Web), ALMARA solo con la regla publicada, canales como «Sistema» + canal, motivo exigido en la web y «sin motivo» en el servidor hasta la F2, picking y packing en la F2.
- [x] 0.3 Aprobación de este `tasks.md` (Daniel, 23-oct).
- [ ] 0.4 Registrar D-XXX en `specs/CONTRACT.md` (lo hace la sesión principal):
  - las 5 decisiones;
  - la colección nueva `order_history_events`, aprobada;
  - la bandera `orderHistoryLog` (dueño Daniel, retiro 2027-04-30);
  - la excepción acotada del Artículo IX (precedente D-054).
  - Antes de escribir el número, revisar origin.

## 1. Verificación previa (solo lectura, sin escribir producción)

- [x] 1.1 Leer 3 pedidos reales de ALMARA FELICIDAD (venta asistida, POS y tienda) y confirmar las rutas de la foto inicial:
  - tarjetas (`carrito[i].configuracion.tarjetas`), `notasPedido`, `observaciones`;
  - facturación, entrega (`carrito[0].configuracion.datosEntrega`), `asesorAsignado`, `bodegaId`;
  - campos de cada pago.
  - **Hecho (23-oct, solo lectura, solo nombres de campos y tipos; ningún valor personal impreso):** venta asistida `eSUHZTB3AjfvtjhOUUek` y POS `wSer7XJ2cFlX7aP3eYSw` de ALMARA. ALMARA no tiene pedidos de tienda en línea (0 con `siteId` en sus últimos 3.000); la tienda se verificó con la estructura de un pedido de ATELIER 90 (`25MVIhidTrddpuNYeIei`). La foto de D2 se ajustó (ver «Desvíos» en `design.md`):

    | Dato | Ruta real | Ajuste a D2 |
    |---|---|---|
    | Número, tipo, fecha | `nroPedido`, `typeOrder` (`E-commerce`/`POS`), `fechaCreacion` (texto ISO, no Timestamp) | `origen` no existe en la raíz de ninguno: se usa `channel.name` |
    | Vendedor | `asesorAsignado.{name, email}`; en la tienda, `vendedor.{nombre, email}` | se lee de los dos |
    | Bodega | `bodegaId` | igual |
    | Cliente | `cliente.{nombres_completos, apellidos_completos, tipo_documento_comprador, documento, indicativo_celular_comprador, numero_celular_comprador, correo_electronico_comprador}` | igual |
    | Facturación | `facturacion.{nombres, tipoDocumento, documento, correoElectronico, direccion, ciudad}`; el POS no la trae | no hay «razón social»: `nombres` |
    | Entrega | forma en `carrito[0].configuracion.datosEntrega.formaEntrega`; fecha en la raíz `fechaEntrega` (en `datosEntrega` es `{day, month, year}`); dirección y ciudad en `envio.{direccionEntrega, ciudad}`; observaciones en `datosEntrega.observaciones` | la dirección NO está en `datosEntrega` |
    | Líneas | `carrito[i].{cantidad, descuentoLineaMonto, descuentoLineaPct, _ivaManualOverride}` y `producto.{cd, identificacion.referencia, crearProducto.titulo, precio.{precioUnitarioSinIva, precioEfectivoSinIva, precioUnitarioIva (texto %), precioUnitarioConIva}}`; preferencias en `configuracion.preferencias` | el servidor no guarda total por línea: no se inventa |
    | Descuentos | `totalDescuento`, `porceDescuento`, `cuponAplicado` (texto), `descuentoAplicado.{codigoPersonalizado, nombre}`; en la tienda `cupon.{codigo, etiqueta}` | se leen los tres |
    | Impuestos y envío | `totalImpuesto` (sin `desgloseIVA` en los tres); `totalEnvio`, `envio.{zonaCobro, valorZonaCobro}` | `desgloseIVA` solo si existe |
    | Totales | `subtotal`, `totalPedidoSinDescuento`, `totalPedididoConDescuento`, `anticipo`, `faltaPorPagar` | igual |
    | Pagos | Tesorería: `{paymentId, fechaHoraCarga, fecha, valor, valorRegistrado, formaPago, numeroComprobante, estadoVerificacion, fechaHoraAprobacionRechazo, notas, usuarioRegistro, archivo, archivoEvidencia, archivoHash}`. **POS: solo `{formaPago, valorRegistrado, estadoVerificacion, fechaHoraAprobacionRechazo, numeroPedido}`** | valor = `valor` o `valorRegistrado`; la clave del POS sale del hash |
    | Estados | `estadoProceso`, `estadoPago` (`estadoPagoDetalle` en venta asistida) | igual |
    | Notas | `notasPedido` es un mapa de listas (`notasCliente`, `notasProduccion`, `notasDespachos`, `notasEntregas`, `notasFacturacionPagos`) con `{nota, fecha, producto, productoId}`; no hay `observaciones` en la raíz | se proyecta `{nota, fecha, producto}` |
    | Tarjetas | `carrito[i].configuracion.tarjetas[] {de, para, mensaje}` | igual |

- [x] 1.2 Leer el ruleset vivo de Firestore y los índices vivos (`firebase firestore:indexes --project julsmind-katuq`).
  - **Hecho (23-oct):** el CLI respondió sin pedir login. **414 índices compuestos y 2 `fieldOverrides`** (`orders.fechaCreacion`, `products.procesoComercial.ocasionesMap`); el `firestore.indexes.json` del repo tiene 286 y 0. Ninguno de `order_history_events`; `order_status_history` tiene 1 (`orderId ASC, timestamp DESC`); `integration_audit` tiene 2 (`companyId, decision, timestamp` y `flowId, timestamp`). El ruleset vivo se leyó con la API de reglas (solo lectura, cuenta de servicio): release `cloud.firestore` del 2026-10-14, ruleset `48fea55c-d54d-4ed3-899d-5da95d940edf`, un solo `match /{collection}/{documentId}/{nested=**}` con `legacyWindowOpen()` hasta 2028-12-30 y los candados de colecciones push. **Para 5.2:** la exclusión de D7.3 no es el boceto `match /{coleccion}/{doc=**}`; hay que sumar `collection != 'order_history_events'` a las TRES condiciones (`get, list, delete`; `create`; `update`). Copias fuera del repo, en el scratchpad de la sesión: `historial-f1/indexes-vivos.json`, `historial-f1/ruleset-vivo-firestore_rules` y `historial-f1/ruleset-vivo-meta.json`.
  - **Para 5.1:** el conteo de fallas «por empresa y día» (`integration_audit` con `type ==`, `company ==` y rango en `at`) necesita un índice compuesto más, o contarse sin el rango de fecha.
- [x] 1.3 Comprobar en el código:
  - que ningún llamador ni prueba usa el valor devuelto de `recordOrderStatusChange` como algo distinto de un booleano;
  - que `controllers/logistica-backup.js` no tiene ruta (U9);
  - que `delete-demo-company.js` y los scripts de borrado por empresa no recorren colecciones sin una lista explícita.
  - **Hecho (23-oct):**
    - Los 14 llamadores ignoran el valor devuelto (solo `.catch(...)` o `await` sin asignar); las pruebas lo reemplazan por dobles que devuelven `true` o nada (`ejecutarPlan*.contract`, `liberarPedidosQuitados`, `whatsappConfirmacionPedido`).
    - `controllers/logistica-backup.js` no lo requiere nadie, y `routers/logistica-backup.js` (que además requiere `controllers/logistica`, no el backup) no está montado en `index.js`. U9 no se toca.
    - `delete-demo-company.js` borra un solo documento de `companies` (NIT 900888999). Ningún archivo del backend llama `listCollections()` ni `recursiveDelete`; los scripts que borran por empresa nombran sus colecciones (`orders`, `shipping_orders`, `inventory`, `products`, `flow_runs`…). `scripts/clone-company.js` y `services/woocommerce/cleanupDedupExpired.js` usan `bulkWriter` sobre colecciones nombradas. El contract test 2.4 vigila que la colección nueva no aparezca en ninguno.
- [x] 1.4 ~~Si se aprueba D4.1: confirmar el `User-Agent` de las apps.~~ **No aplica:** decisión 1, no se firma el canal.
- [x] 1.5 Leer si ALMARA tiene `pickingAlistamiento` encendida (Open Questions 5).
  - **Hecho:** NO. Sus banderas encendidas son `inventoryDigest`, `despachosOpttia`, `opttiaProduccion`, `opttiaCobroWhatsapp` y `supportMerchantAccess`. Coincide con la decisión 5 (picking y packing en la F2).

## 2. Backend: pruebas primero (`katuq_admin_back_firebase/functions`, Artículo VIII)

Cada prueba se escribe antes que el código y falla por la razón esperada (falta el módulo o el enganche).

**Hecho (23-oct):** 2.1 a 2.6 fallaron primero por la razón esperada (`Cannot find module` del módulo; el contract 2.4 en rojo sin `escritor.js`) y pasaron con la sección 3. La 2.7 falla en sus 39 casos porque falta el enganche, nunca por un ancla perdida. Dobles compartidos en `tests/orders/_historialPedidoDobles.js`: un Firestore en memoria que anota colección y operación, respeta `create()` (ALREADY_EXISTS) y resuelve where, orderBy por `__name__`, startAfter, select y count.

- [x] 2.1 `tests/orders/historialPedido.construir.test.js` (26 casos):
  - foto inicial: campos, sin URLs de comprobantes, partición con más de 200 líneas;
  - diferencias de pagos: registrar, editar, anular por salida y por estado, verificar;
  - claves de pago, prioridad de tipo y `tags`;
  - saldo antes → después;
  - ids deterministas.
- [x] 2.2 `tests/orders/historialPedido.contexto.test.js` (19 casos, con la decisión 1: la App se ve como Web, y la consistencia de `etiquetas.js`):
  - el origen de cada regla de D4;
  - un `origen`, `email` o `canal` falso en el cuerpo o los encabezados no cambia el resultado;
  - POS;
  - MCP con `oauth`, `servicekey` y `apikey`;
  - mensajero;
  - lo desconocido → Sistema más la traza.
- [x] 2.3 `tests/orders/historialPedido.escritor.test.js` (19 casos; incluye `espejar` y `registrarCreacion` de `index.js`):
  - bandera apagada: cero escrituras;
  - corte general;
  - solo `create`;
  - `ALREADY_EXISTS` cuenta como éxito;
  - reintentos solo ante errores transitorios;
  - falla final → `integration_audit` sin datos personales;
  - nunca lanza, ni con el constructor roto.
- [x] 2.4 **Contract test de inmutabilidad:** `tests/orders/historialPedido.inmutable.contract.test.js` (7 casos). Escanea el código y falla si:
  - el nombre de la colección aparece fuera de `constantes.js`;
  - la constante se importa fuera de `escritor.js` y `lectura.js`;
  - hay `set`, `update`, `delete`, `FieldValue.delete`, `recursiveDelete` o `BulkWriter` sobre la colección.
  - El escaneo cubre `scripts/`.
  - **Desvíos:** la constante se llama `COLECCION_HISTORIAL_PEDIDO` (`COLECCION_EVENTOS` ya existía en `controllers/sites.js` para `site_events` y el test lo detectó). Para un candado simple, `escritor.js` y `lectura.js` no usan `.set(` ni `.add(` ni siquiera sobre Map o Set, y también se prohíben `.add(`, `.batch(` y `runTransaction`; `lectura.js` tampoco usa `.create(`. Se agregó: nadie fuera del módulo requiere `constantes`, `escritor` ni `lectura` (solo `index.js`), ni arma el nombre por partes.
- [x] 2.5 **Contract test del write-set** (2 casos; la bandera real lee la misma base falsa; el intento ajeno solo deja `audit_log_access.add`, el rastro de D8.1): `tests/orders/historialPedido.writeset.contract.test.js`, con una base de datos falsa que anota colección y operación.
  - Escritor: solo `order_history_events.create` e `integration_audit.create`.
  - Lectura: solo lecturas.
  - Ninguno toca `orders`, `inventory`, `inventoryMovement`, `products` ni precios.
- [x] 2.6 `tests/orders/historialPedido.lectura.test.js` (14 casos; 153 elementos paginados de a 50 en asc y desc con empates de hora en la frontera; un evento de otra empresa con el mismo `orderId` nunca aparece):
  - el espejo oculta el registro de antes;
  - lo reconstruido aparece solo sin evento real;
  - 50 por página con cursor estable, en asc y desc, sin dobles en la frontera;
  - pedido ajeno → 404 más rastro;
  - bandera apagada o índice faltante → vista de antes.
- [x] 2.7 `tests/orders/historialPedido.puntos.contract.test.js`: un caso por punto (C1–C10, E1–E14, P1–P5, U1–U8).
  - Para los controladores monolíticos, por inspección del código (patrón `tests/sellerMobileNotifications/orderControllerHook.test.js`).
  - Donde hay dependencias inyectables, por inyección (`ejecutarPlan`, `whatsappConfirmacionPedido`, `borrarPedido`, `updateOrderStatus`).
  - Arranca en rojo y cada caso pasa a verde en su tarea de la sección 4.
  - **Hecho, EN ROJO a propósito:** 39 casos, todos fallan porque falta el enganche. Todos son por inspección con anclas estables (también los inyectables: inspeccionar el archivo exige el contexto sin cargar dependencias de producción); la sección 4 puede pasar un caso a inyección o afinar su expresión al ponerlo en verde, sin bajar lo que exige. Si un ancla desaparece, el caso dice «ancla no encontrada».
- [x] 2.8 `tests/orders/historialPedido.noBloquea.emulator.test.js` y `historialPedido.flujo.emulator.test.js`, con `firebase emulators:exec` como `test:domicilios:emulador`.
  - **Hecho:** 4 en verde contra el emulador con el módulo real (creación POS con pago, espejo, pago registrado y anulado con motivo y `correctsEventId`, MCP, eliminación, ALREADY_EXISTS real, paginación con el cursor real mezclando eventos, registros de antes y reconstruidos; y `create()` roto transitorio y definitivo → sin lanzar, falla contada, pedido idéntico). Los 8 escenarios POR LOS CONTROLADORES quedan como `todo` hasta la sección 4. Cada archivo usa su propia empresa: la bandera real se cierra ante dos empresas con el mismo `nomComercial`, y los dos archivos corren en paralelo.
- [x] 2.9 Script `test:historial-pedido` en `package.json`, que corre 2.1 a 2.7, y `test:historial-pedido:emulador`, que corre 2.8.
  - **Desvío:** `test:historial-pedido` corre 2.1 a 2.6. La 2.7 va aparte en `test:historial-pedido:puntos` hasta cerrar la sección 4 (en 4.14 se suma al principal), para no romper la suite.

## 3. Backend: el módulo, todavía sin enganchar

**Hecho (23-oct):** el módulo no lo llama ningún controlador ni servicio; `controllers/orders.js`, `utils/orderStatusHistory.js` y los puntos de escritura no se tocaron. La bandera nace apagada en todas las empresas.

- [x] 3.1 `orderHistoryLog` en `FEATURE_FLAG_NAMES` (`services/companyFeatureFlags.js`), con su comentario: dueño, fecha de retiro y Artículo XII.
  - **Hecho:** pasan las pruebas existentes de banderas (`companyFeatureFlags` 38, `setCompanyFeature` 18, `funcionesFeriaEmpresaNueva`, `plantillaProductoUnicoApagada`, `pickingFlagRoutes`, `pickingPackingWriteSet`).
  - **Desvío:** `tests/companies/companyFeatureFlags.test.js` ya estaba EN ROJO antes de este cambio: D-539 sumó `multiBodegaMismaZona` al catálogo sin sumarla a la prueba. Se sumaron las dos (34 banderas) y un caso que exige para `orderHistoryLog` D-541, «Dueño: Daniel», 2027-04-30, el corte general y que no nazca encendida. El comentario no nombra la colección (lo prohíbe el contract 2.4).
- [x] 3.2 `services/orders/historialPedido/constantes.js` y `etiquetas.js`: catálogos cerrados de D2 a D4 y textos de D3 y D8.5.
- [x] 3.3 `construir.js`, con funciones puras.
  - **Hecho:** 2.1 en verde.
- [x] 3.4 `contexto.js`.
  - **Hecho:** 2.2 en verde.
- [x] 3.5 `log.js`, con la lista cerrada de campos de D11 (por evento: `escritura`, `origen_sin_clasificar`, `lectura`, `etiqueta_desconocida`).
- [x] 3.6 `escritor.js`.
  - **Hecho:** 2.3, 2.4 y 2.5 en verde.
- [x] 3.7 `lectura.js`, que adapta `utils/historialReconstruido.js` sin cambiarlo.
  - **Hecho:** 2.6 en verde. Lee `order_status_history` por su cuenta: `utils/orderStatusHistory.js` inicializa Firestore al cargarse.
- [x] 3.8 `index.js`, más `node --check` de los archivos del módulo.
  - **Hecho:** `node --check` limpio en los 8 archivos y en `companyFeatureFlags.js`. `npm run test:historial-pedido`: 87/87. `npm run test:historial-pedido:emulador`: 4 en verde, 8 `todo`. `npm run test:historial-pedido:puntos`: 39 en rojo (esperado hasta la sección 4).
  - **Fuera de este cambio:** `tests/orders/editBatchSinCamposDePago.test.js` está en rojo por `services/orders/accesoEdicion.js:32` (commit `a0b46809`, de otra sesión), que lee Firestore real fuera del doble que la prueba instala solo para `controllers/orders.js`. Hay que corregirlo antes de 4.2 y 4.5, que la exigen en verde.

## 4. Backend: los enganches (uno a la vez; diff y aprobación antes de cada commit)

- [x] 4.1 `utils/orderStatusHistory.js`: el espejo después del `.add()` y los parámetros opcionales `historialPedido` y `contexto` (D6.1).
  - Firma y valor devuelto, iguales.
  - **Hecho (23-oct, sin commit; diff pendiente de aprobación):**
    - la regresión de los lectores de `order_status_history` (`tests/enVivo/*`, `osmosisWebhookHistorial`, `liberarPedidosQuitados`, `carrierCompliance`) en verde; también `whatsappConfirmacionPedido`, `ejecutarPlan*.contract` e `historialReconstruido`;
    - los casos E5 a E12 y E14 de 2.7 en verde con el contexto por fuente.
    - Prueba nueva `tests/orders/historialPedido.espejo.test.js` (9 casos, sumada a `test:historial-pedido`). Con la bandera apagada: mismo valor devuelto, mismo registro, cero escrituras y cero logs nuevos. Lo único extra es 1 lectura de `companies` por registro, en segundo plano. Además fija que la respuesta no espera al espejo y el id aleatorio cuando falla el `.add()` (D5.3).
    - **Desvío en 2.7:** los casos E5–E12 y E14 verifican ahora el espejo y que su `source` dé el origen y el canal de D6.3. El caso estricto «contexto de la sesión» de E5, E6, E7 y E13 queda aparte, en rojo hasta la 4.11.
- [x] 4.2 `updateOrderInternal`:
  - `options.contexto`;
  - quitar `_motivoCambio`;
  - evento combinado después de escribir (D6.5).
  - **Hecho:** E1 y P1 en verde; `retrocesoManual.contract`, `editBatchSinCamposDePago` y las suites de Tesorería en verde.
  - **Hecho (23-oct, sin commit; diff de `controllers/orders.js` pendiente de aprobación):**
    - `options.contexto` (si falta o no trae `origin`: `desdeCorreo(userEmail)`, Sistema sin clasificar con traza) y `options.motivo` (D-550, 500 caracteres) se leen en `updateOrderInternal`; `_motivoCambio` se quita SIEMPRE del pedido (con la bandera apagada también) y viaja como motivo de la anulación del pago; el motivo de `options.motivo` sirve de respaldo para el retroceso y la anulación.
    - El evento se arma después de escribir, con `previo = previousOrderData` y `final = {...previousOrderData, ...updateData}`, de forma PEREZOSA (revisión 23-oct): el controlador pasa la función que lo arma a `registrar` / `recordOrderStatusChange.historialPedido` (que `espejar` ahora acepta como función) y NO lo arma él; el escritor revisa la bandera `orderHistoryLog` antes de armarlo y cuenta `BUILD_FAILED` en `integration_audit` si el constructor se rompe. Se quitaron el `try/catch` y el `console.error` propios del controlador: con la bandera apagada no se copia el pedido, no se calcula el diff y no hay logs nuevos. Con cambio de proceso y estado previo viaja como `historialPedido` (y `contexto`) de `recordOrderStatusChange` (id `__osh_`); en los demás casos (sin cambio de proceso, o pedido sin estado previo, que ese registro no admite) lo escribe `registrar` sin esperar, con id `__upd_`. `order_status_history`, su `metadata` y el valor devuelto no cambian.
    - Prueba nueva `tests/orders/historialPedido.guardado.test.js` (7 casos, corre `updateOrderInternal` real contra una base falsa: contexto y motivo, sin contexto, anulación con y sin motivo, edición sin cambios, constructor roto, bandera apagada sin invocar el constructor). Falta sumarla a `test:historial-pedido` en `package.json` (lo hace la sesión principal).
    - En verde: E1 y P1 de 2.7; `retrocesoManual.contract`, `editBatchSinCamposDePago`, `carritoDeProduccion` (5), `treasury/*` (3), `test:historial-pedido` (7 archivos), `ejecutarPlan*.contract`, `mcp/*`, `aprobarProduccion.contract`, `viasEntregado.contract`, `priceChange/*`, `independientes/pedidos.flujo`. Siguen en rojo, como se esperaba hasta 4.3/4.11, los casos U1, U3 a U8 y E5/E6/E7/E13 «contexto de sesión».
    - **Ajeno a este cambio:** `sellerMobileNotifications/paymentReviewedHook` (5 fallas) y `paymentPendingHook` (3) fallan con «Dependencia no permitida: ../kuvo/legacyFinancialGuard», un doble que no deja cargar `treasuryService`; no tocan `controllers/orders.js` ni este módulo.
- [ ] 4.3 Contexto en los llamadores de `updateOrderInternal`, uno por archivo: U1 `exports.edit`, U2 MCP, U3 plan de despachos, U4 producción, U5 Tesorería (incluidos `controllers/treasury.js` y `controllers/integration.js:2524`), U6, U7 y U8.
  - [x] **U1 `exports.edit` (23-oct, sin commit; diff pendiente de aprobación):** pasa `{ contexto: historialPedido.contexto.desdeRequest(req) }` a `updateOrderInternal`, tomado de la sesión JWT (nunca del cuerpo ni de los encabezados; si el módulo no cargara, la edición sigue sin contexto). Caso U1 de 2.7 en verde; `historialPedido.guardado`, `.contexto`, `editBatchSinCamposDePago` y `retrocesoManual.contract` en verde. U2 a U8 siguen pendientes.
  - [ ] **U2 MCP `update_order_status` (23-oct, sin cambio de código de producción; prueba nueva y caso de emulador pendientes de aprobación; SIN MARCAR hasta que la sesión principal la cablee):** el enganche ya estaba en el backend (commits `316887e3` y `5532203b`, D-550): `tools/updateOrderStatus.js` arma `desdeMcp(context)` y lo pasa en `options.contexto` por las dos ramas (sin bandera: `cambiarComoHoy`; con aprobación: `aplicarEstados` en `services/mcp/pedidos/aplicar.js`, con el motivo de la tarjeta), y `updateOrderInternal` lo lee (4.2). `edit_order` (D-550 F1) lo hace igual. Faltaba la prueba de la rama de HOY (sin bandera), que ninguna suite fijaba.
    - Prueba nueva `tests/orders/historialPedido.mcp.test.js` (5 casos, base falsa en memoria): OAuth con persona, llave de empresa sin correo → canal `company_key` sin persona inventada, llave de servicio de Opttia por Telegram → `opttia` + `opttia_telegram`, credencial desconocida → Sistema con traza, y con bandera de aprobación: la propuesta no escribe y la aprobación arma el evento `mcp` con el motivo. **Alcance honesto:** `recordOrderStatusChange` va sustituido y el evento se arma a mano con la función perezosa que le llega; prueba el contexto y el constructor, NO que el evento quede guardado ni la bandera `orderHistoryLog`.
    - Esa parte la cubre el caso de punta a punta en `tests/orders/historialPedido.flujo.emulator.test.js` (el `todo` de U2 se retiró y se reemplazó por 2 casos reales contra el emulador de Firestore: herramienta real + `updateOrderInternal` real + escritor real + bandera real `orderHistoryLog` leyendo `companies`). Con la bandera encendida: el pedido cambia y queda UN evento `process_status_changed` con origen `mcp` y la persona (el espejo es en segundo plano, el caso espera a que aparezca). Con la bandera apagada: el pedido cambia y cero eventos. `flujo.emulator` + `noBloquea.emulator`: 13 casos, 6 en verde, 7 `todo` de otras tareas, 0 fallas (emulador local, nada de producción).
    - U2 de 2.7 en verde; `tests/mcp/pedidos/*` (7 archivos) y `historialPedido.guardado` en verde.
    - **Pendiente para marcar [x]:** sumar `node tests/orders/historialPedido.mcp.test.js` a `test:historial-pedido` en `package.json` (lo hace la sesión principal; esta sesión no toca ese archivo). Hasta entonces el «en verde» de esa suite NO incluye la prueba nueva; se corrió aparte. U3 a U8 siguen pendientes.
  - [x] **U3 plan de despachos (26-oct, sin commit; patch `D-541-4.3-U3.patch` pendiente de aprobación):** `services/despachos/ejecutarPlan.js` pasa `{ contexto }` a las dos llamadas de `updateOrderInternal` (mensajero propio y transportadora): origen `opttia`, quien aprobó como actor (sesión o comprobante, nunca el cuerpo) y canal `opttia_web` (en-vivo, escena, chat) u `opttia_telegram` (lista cerrada; un canal desconocido cuenta como en-vivo). El envoltorio por defecto ya reenvía `options`. Caso U3 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.planDespachos.test.js` (canales, transportadora, correo falso en el pedido); `ejecutarPlan*.contract` y `rutas.contract` en verde.
  - [x] **U4 producción de Opttia (26-oct, sin commit; patch `D-541-4.3-U4.patch`):** `services/opttiaPropuestas/ejecutores/produccion.js` pasa `{ contexto }` (origen `opttia`, canal `opttia_web`, actor quien aprobó por la sesión; nombre y rol los completa el escritor). El cambio de datos sigue siendo exactamente `{_id, estadoProceso, _baseVersion}`. Caso U4 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.produccionOpttia.test.js`; las 5 suites de `tests/opttiaPropuestas` en verde. El router no se tocó.
  - [x] **U5 Tesorería (26-oct, sin commit; patch `D-541-4.3-U5.patch`):** `controllers/treasury.js` (los 4 handlers que mueven el pedido) y `controllers/integration.js` (`asentarPagoManual`) arman el contexto con `desdeRequest(req)` (la sesión JWT, no el encabezado `email`) y lo pasan a `treasuryService`; este lo reenvía por `registerPayment`/`reviewPayment`/`changeOrderPaymentState` a `applyOrderUpdate`, que le fija el canal `treasury` si no trae uno más específico y lo entrega a `updateOrderInternal` junto con `skipTreasuryGuard`. Sin contexto de quien llama no se inventa uno. Caso U5 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.tesoreria.test.js` (submit, direct, review, cambio de estado, sin contexto, contexto falso, canal específico y los controladores). `tests/treasury/*` (3) en verde. **No cubre** la rama `legacyWrite` (P2), que escribe directo sin `updateOrderInternal` (4.10); el parámetro ya le llega a `registerPayment`. `paymentPendingHook` (3 fallas) y `paymentReviewedHook` (5) siguen igual que antes: `legacyFinancialGuard` no permitido en su doble.
  - [x] **U6 «Ya lo recogí» (26-oct, sin commit; patch `D-541-4.3-U6.patch`):** `controllers/carrierOffers.js` (`pickupCarrierOffer`) pasa `{ contexto }` a `updateOrderInternal`: origen App, canal `carrier_app` y de actor el mensajero que el servidor validó (nombre de su ficha leída por id y placa, o el transportador del pedido; sin correo, nunca del cuerpo ni de encabezados). El cambio de datos sigue siendo el mismo. Caso U6 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.mensajeroRecoge.test.js` (3 casos); `independientes/pedidos.flujo`, `independientes.contract`, `mensajeros/carrierAuth.contract` y `ofertasServicios` en verde.
  - [x] **U7 despacho `dispatchShippingOrder` (26-oct, sin commit; patch `D-541-4.3-U7.patch`):** `controllers/logistica.js` arma `desdeRequest(req, { canal: "dispatch" })` (sesión JWT, no el encabezado `email`) y lo pasa a cada `updateOrderInternal` de la orden; sin sesión conocida queda «Sistema» sin clasificar. Caso U7 de 2.7 en verde (se amplió la ventana de inspección de 200 a 1500 caracteres después del ancla, porque la llamada va después de `source: "dispatchShippingOrder"`; exige lo mismo); prueba nueva `tests/orders/historialPedido.despachoLogistica.test.js` (2 casos); `liberarPedidosQuitados`, `osmosisWebhookHistorial`, `manifiestoEnviame` y `historialPedido.guardado` en verde.
  - [x] **U8 envíos de la transportadora (26-oct, sin commit; patch `D-541-4.3-U8.patch`):** `controllers/logisticsIntegrations.js` (`createShipments`) pasa `desdeSistema("carrier_integration", { nombre: "Transportadora" })`: sistema, no la persona (esa queda en el despacho de la orden, U7). Caso U8 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.envioTransportadora.test.js`; `pedidoConEnvio.caracterizacion`, `espejo`, `writeset`, `inmutable` y `test:historial-pedido` en verde.
  - [x] **Revisión de U7/U8: tenant en logística (26-oct, sin commit; patch `D-541-4.3-U7U8-tenant.patch`):** `/logistica/shippingorders/dispatch` y `/v1/logistics/shipments` ahora pasan por `requireJwtTenant` (la empresa de la sesión manda; `body.companyId` o cabecera distintos dan 403). Servicio nuevo `services/logistics/pedidosDeLaEmpresa.js` (usa `utils/mismaEmpresa`): antes de escribir o de llamar a la transportadora se lee `orders/{_id}` de cada pedido del cuerpo; uno ajeno rechaza toda la petición con 403 `PEDIDO_OTRA_EMPRESA` (nada se guarda, ni la orden de envío ni los pedidos propios) y deja rastro en `audit_log_access`. En `createShipments` además `metadata.solicitadoPor` (correo de la sesión) en `order_status_history`: el actor del evento sigue siendo «Transportadora». Pruebas: 3 casos nuevos en `historialPedido.despachoLogistica` (5) y 3 en `historialPedido.envioTransportadora` (4); `liberarPedidosQuitados` ajustada (su base falsa no tenía `doc().get`).
  - **Pendiente para marcar 4.3 [x]:** U2 (cablear `historialPedido.mcp.test.js` en `package.json`, sesión principal). Las pruebas nuevas de U3 a U8 tampoco están en `test:historial-pedido`; se corren aparte y se suman al cerrar 4.14. Con U8, los casos U1 a U8 de 2.7 quedan en verde; siguen en rojo los de C, E y P (4.4 a 4.11).
  - **Hecho:** cada caso U en verde; `tests/despachos/ejecutarPlan*.contract`, `tests/opttiaPropuestas/*` y `tests/mcp/*` en verde.
- [x] 4.4 E2 `editByTransporter` → `delivery_reported`, con la evidencia y el actor mensajero.
  - **Hecho (26-oct, sin commit; patch `D-541-4.4.patch` pendiente de aprobación):** `controllers/orders.js` pasa a `recordOrderStatusChange` el evento `eventoEntrega` PEREZOSO (previo = pedido, final = lo que se escribió) con `desdeMensajero` y el nombre de la ficha que el servidor validó; ni el cuerpo ni los encabezados fijan el actor. Caso E2 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.mensajeroEntrega.test.js` (4 casos: Entregado con evidencia, Rechazado con motivo, pedido ajeno sin evento, bandera apagada sin armar); `viasEntregado`, `independientes/pedidos.flujo`, `carrierAuth.contract`, `carrierCompliance`, `historialPedido.espejo` y `.guardado` en verde.
  - **Revisión (26-oct):** hallazgo mayor confirmado y corregido: la bandera `orderHistoryLog` se leía una sola vez con la empresa del metadato (cabecera `company` del cliente) y el evento se guardaba en la del pedido. `escritor.js` ahora revisa la bandera por empresa (la del metadato y, si el evento trae otra, también la del evento); un evento con otra empresa y bandera apagada devuelve `apagado`. Pruebas nuevas: caso 5 en `mensajeroEntrega` (cabecera ajena) y una en `historialPedido.escritor.test.js`; ambas fallan sin el arreglo.
- [x] 4.5 E3 `editBatch` → contexto de la sesión, pasado a `processBatchAuditAndNotifications`.
  - **Hecho (26-oct, sin commit; patch `D-541-4.5.patch`):** `editBatch` arma `desdeRequest(req, { canal: "production_board" })` (sesión JWT) y `processBatchAuditAndNotifications` lo pasa como `contexto` a `recordOrderStatusChange`; una sesión no reconocida no inventa actor (no manda contexto y el espejo usa el origen heredado, como hoy). Caso E3 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.editBatchContexto.test.js` (3 casos, `editBatch` real); `editBatchSinCamposDePago`, `carritoDeProduccion` y `viasEntregado` en verde.
- [x] 4.6 E4 `delete` → `order_deleted` con resumen.
  - **Hecho (26-oct, sin commit; patch `D-541-4.6.patch`):** `exports.delete` pasa `eventoEliminacion` PEREZOSO (resumen del pedido borrado) con la persona de la sesión (si no se reconoce, origen heredado de `orders/delete` con el correo); el borrado, la respuesta y el registro de antes no cambian. Caso E4 de 2.7 en verde; prueba nueva `tests/orders/historialPedido.eliminar.test.js` (4 casos); `borrarPedido.test.js`, `inmutable` y `writeset` en verde.
- [x] 4.7 C1 `exports.create`: después de `createOrderWithinLimit`, con `newOrderData`.
  - **Hecho (26-oct, sin commit; patch `D-541-4.7.patch`):** `registrarCreacion` justo después de `createOrderWithinLimit`, sin esperar y dentro de un `try` (nunca interrumpe la creación), con `desdeRequest(req)`; un POS queda con origen POS. Caso C1 de 2.7 en verde; prueba nueva de emulador `tests/orders/historialPedido.crear.emulator.test.js` (4 casos con `exports.create` real, bandera real y emulador local: venta asistida, POS, bandera apagada con cero eventos y escritor roto con misma respuesta). Falta sumarla a `test:historial-pedido:emulador` en `package.json` (sesión principal). `orderControllerHook`, `warehouseAllocationShadow`, `freePlanLimits`, `mobilePosConsistency.contract`, `precioManualSubtotal` y el smoke de inventario por emulador en verde.
- [x] 4.8 C2 a C7: `options.contextoHistorial` en `orderService.createOrder` y en sus llamadores (Shopify, WooCommerce, tienda, tienda virtual, flows, reparto).
  - **Parte 1 hecha (26-oct, sin commit; patch `D-541-4.8-core.patch`):** `orderService.createOrder` escribe `registrarCreacion` justo después de `orderRepository.create` con `options.contextoHistorial` (sin él o con un objeto sin origen: Sistema con la traza `orderService.createOrder`); un pedido gemelo evitado no deja evento. Caso C2–C7 (base) de 2.7 en verde; prueba nueva `tests/orders/historialPedido.creacionServicio.test.js` (6 casos); `orderServiceHook`, `orderSplit*`, `warehouseAllocationShadow`, `freePlanLimits`, `compraAhoraPedido`, `pedidoRetiroCantidades` y `test:bajo-pedido-shopify` en verde. Ya anotados como ajenos: `tests/sitios/pedidoReservaDuplicada.test.js` (su arnés corre `createOrder` en un `vm` sin `require`, y la línea del aviso móvil que ya estaba en HEAD lo pide; causa leída en el código, no comprobada corriendo HEAD, porque no se puede revertir ni apartar el cambio en la copia compartida) y `tests/flows/shopifyPrecioTachado.test.js` (22/23 de `test:flows`; es de precios de producto, no toca pedidos).
  - **Parte 2 hecha (26-oct, sin commit; patch `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-4.8-p2.patch`):** cada llamador pasa `options.contextoHistorial` con el origen que fija el servidor: C2 Shopify (`services/shopify/processors/orders.js`, origen Shopify), C3 WooCommerce (`controllers/woocommerceWebhook.js`), C4 tienda en línea (`controllers/sites.js`, Sistema/«Tienda en línea», actor cliente), C5 tienda virtual (`controllers/virtualStoreWebhook.js`, Sistema/«Tienda virtual»), C6 flows (`katuq-order-upsert.action.js`: Shopify o WooCommerce según la integración del pedido, si no Sistema/«Automatización»; un `origen`, `canal` o `contextoHistorial` dentro del pedido no cuenta) y C7 reparto (`orderSplitService.splitIntegrationOrder` recibe `contextoHistorial` y el principal y cada parte lo heredan). Casos C2 a C7 de 2.7 en verde. Prueba nueva `tests/orders/historialPedido.creacionLlamadores.test.js` (4 casos: flows con Shopify, reparto, WooCommerce y sin proveedor; tienda virtual). Los arneses de `tests/sitios` que cargan `crearPedido` con una lista cerrada de módulos permiten ahora el contexto del historial (`_crearPedidoHarness`, `compraAhoraPedido`, `pedidoRetiroCantidades`, `pedidoReservaDuplicada`): sin eso C4 los rompía. En verde: `test:reparto-por-bodega`, `test:bajo-pedido-shopify`, `compraAhoraPedido` (50), `pedidoRetiroCantidades` (30), `pedidoTiendaCaracterizacion` (20 idénticos), `checkoutAltaConversion`, `cuponPedidos`, `woocommerceRutasCerradas`, `test:flows` 22/23 (la que falla, `shopifyPrecioTachado`, ya estaba). **Desvío:** «agrega parte N de M» del diseño NO se agrega: la parte ya queda en `splitOrder` del pedido y la foto inicial no la copia; sumarlo cambia la foto (modelo del evento), así que queda para la F2 si Daniel lo quiere. `pedidoReservaDuplicada` sigue con 5 casos en rojo por la causa de antes (su `vm` sin `require` con el aviso móvil del HEAD), no por esto.
  - **Hecho:** `test:reparto-por-bodega`, `test:flows` y `test:bajo-pedido-shopify` en verde.
  - **Revisión (26-oct, sin commit):** `tests/sitios/pedidoReservaDuplicada.test.js` estaba en rojo (5 de 8) desde antes: el `createOrder` extraído con `vm` no traía `require` y fallaba en `notifyOrderCreated`. Se le dio un `require` que solo deja pasar `./orders/historialPedido` (registra la llamada), `./sellerMobileNotifications/runtime` y `./inventory/warehouseAllocationShadow`, y el primer caso ahora comprueba el «Pedido creado» de la tienda. 8 de 8 en verde.
- [x] 4.9 C8 cotización convertida, C9 domicilios (solo si `!repetido`) y C10 Kuvo (después de confirmar).
  - **Hecho (26-oct, sin commit; patch `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-4.9.patch`):**
    - C8 `services/cotizacionService.js`: `registrarCreacion` justo después del `add`, con el contexto que le pasa `controllers/cotizaciones.js` (`desdeRequest(req, { canal: "quote" })`, la sesión y no el encabezado); sin contexto, Sistema/«Cotización».
    - C9 `services/domicilios/domicilioService.js`: después de la transacción y solo si `!repetido`; función nueva `contexto.desdeDomicilios({ via, usuario })` (llave de la API: Sistema/«Domicilios»; sesión del vendedor: esa persona; `via` y `usuario` los fija `middleware/domiciliosAuth`).
    - C10 `services/kuvo/orderWriter.js`: un evento por pedido del grupo, Sistema/«Kuvo», DESPUÉS de confirmar la transacción (un reintento de la transacción o una compra repetida no escribe); el caso C10 de 2.7 amplió su ventana de 6.000 a 12.000 caracteres porque la transacción es larga.
    - Pruebas: `tests/orders/historialPedido.creacionOtrosCanales.emulator.test.js` (7 casos contra el emulador local, 2 corridas seguidas en verde: C8 con y sin contexto, C9 por llave, por sesión (un `usuario` en el cuerpo no cuenta) y repetido, C10 un solo evento y replay sin otro; con la bandera apagada, cero eventos en los tres) y un caso nuevo de `desdeDomicilios` en `historialPedido.contexto.test.js`. Casos C8 a C10 de 2.7 en verde. En verde: `test:domicilios`, `domicilios/flujo.emulador` (31), `kuvo/orderWriter.emulator` + `auditOrderWriter.emulator` (16), `kuvo/splitOrders`, `checkoutCore`, `inventoryReservation`, `legacyStorePaymentIsolation`. `test:cotizaciones-contract` da 2 FAIL (`calcularTotales`), que no toca esto.
  - **Revisión (26-oct, sin commit):** `POST /v1/cotizaciones/convertir-pedido` ahora pasa por `requireJwtTenantOrPlatform` (`routers/cotizaciones.js`): un comercio con otra empresa en el encabezado recibe 403 y el pedido y su historial quedan en la empresa del JWT; Julsmind sigue pidiendo la que necesite. Caso nuevo C8 en `historialPedido.puntos.contract.test.js` (46 en verde).
- [x] 4.10 Pagos P2 (rama `legacyWrite`), P3 Wompi, P4 `payment-callback` y P5 ePayco, con ids por transacción.
  - **Hecho (26-oct, sin commit; patch `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-4.10.patch`):**
    - P2 `services/treasury/treasuryService.js` (rama `legacyWrite`): `eventoPagoDirecto` con id `{orderId}__pay_{paymentId}` y el contexto de la sesión (canal «Tesorería») o, sin él, Sistema con la persona y la traza.
    - P3 aviso de Wompi (`procesarTransaccionActualizada`): el pedido previo se captura DENTRO de la transacción que sí aplica el aviso y el evento se registra después de confirmar, solo si no se omitió; id `{orderId}__pay_wompi_{transacción}_{estado}` (el estado va en el id: PENDING y luego APPROVED dejan dos eventos y un aviso repetido ninguno), Sistema/Wompi.
    - P4: el diseño dice `handlePaymentCallback`, pero ese endpoint es de SOLO lectura (no escribe el pedido); el que escribe es `actualizarOrdenConTransaccion` (lo llama `updateOrderFromTransaction`), y ahí va P4 con el MISMO id por transacción y estado que P3, así que no se duplica. El caso P4 de 2.7 apunta ahora a esa función.
    - P5 `actualizarOrdenEpayco`: id `{orderId}__pay_epayco_{ref}_{estado}`, Sistema/ePayco.
    - Pruebas nuevas: `tests/orders/historialPedido.pasarelas.test.js` (9 casos con el controlador real y el arnés del webhook de Wompi: un evento, repetido sin otro, PENDING→APPROVED, aviso sin pedido, escritor que lanza, actualización manual con el mismo id, sin cambios sin evento, ePayco y firma inválida) y `historialPedido.tesoreriaLegacy.test.js` (3 casos). Casos P2 a P5 de 2.7 en verde (41 de 45; quedaban los de 4.11). En verde: las 5 suites `integrations/wompi*`, `treasury/*` (4) y `historialPedido.tesoreria`.
- [x] 4.11 Contexto de sesión en E5, E6, E7 (`logistica.js`) y E13 (cancelar envío de Cereza).
  - **Hecho (26-oct, sin commit; patch `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-4.11.patch`):** `controllers/logistica.js` arma el contexto con `contextoDeSesion(req)` (persona de la sesión JWT, canal Despachos) y lo pasa a `registrarPedidosLiberados` (E5, en `createAndEditShippingOrder` y `dispatchShippingOrder`) y a los `recordOrderStatusChange` de `createAndEditShippingOrder` (E6) y `batchDispatchShippingOrders` (E7); `controllers/osmosisIntegrationController.js` (`cancelShipmentAndRelease`) arma el de la sesión con canal Cereza y lo pasa por `opciones.contexto` a `osmosisOrderService.cancelarEnvioYLiberar`, que lo entrega a `recordOrderStatusChange` (E13). Una sesión que no se reconoce no inventa actor (contexto indefinido y el espejo usa el origen heredado con el correo, como en E3). El correo del registro de antes no cambia. Los 4 casos «contexto de sesión (4.11)» de 2.7 en verde: **45 de 45**. Pruebas nuevas: `tests/orders/historialPedido.logisticaContexto.test.js` (5 casos con el arnés de `liberarPedidosQuitados`: despachar, sin sesión, editar, orden nueva y lote) y `historialPedido.cancelarEnvioCereza.test.js` (4). En verde: `tests/logistica/liberarPedidosQuitados`, `despachoLogistica`, `envioTransportadora`, `espejo`, `cerezaRespuestaPerdida`, `osmosisOrderDiscount`, `descuentoDeListaEspejo`.
- [x] 4.12 `getOrderHistory`:
  - `vista=eventos`;
  - 404 más rastro para un pedido ajeno;
  - con la bandera apagada o un error, la vista de antes;
  - log `pedido.historial.lectura`.
  - **Hecho (26-oct, sin commit; patch `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-4.12.patch`):** `controllers/orders.js` delega en `historialPedido.leerPagina` con la empresa del JWT (`getJwtTenant`, `esSesionDePlataforma`; nunca el encabezado `company`) y `req.query`; sin `vista=eventos` responde la de antes, con la bandera apagada o ante un error `vista: "legado"`, con la encendida la página de eventos; un pedido ajeno responde lo mismo que uno inexistente (404) con su rastro; si el módulo mismo lanza, sigue el camino de antes (el código viejo queda debajo como respaldo). Prueba nueva de emulador `tests/orders/historialPedido.lecturaControlador.emulator.test.js` (8 casos con el controlador y la lectura reales: las dos vistas, bandera apagada, candado del JWT con el encabezado de la dueña, Julsmind, módulo que lanza, 400 y que no escribe). 2.6 (14), `historialReconstruido` y `companyAccess` (24) en verde. Índice que necesita esta consulta: ver 5.1.
  - **Desvío de contrato:** para un pedido ajeno el 403 de antes pasa a 404 (igual a «no existe»), también sin `vista=eventos`; la pantalla de hoy solo lee `history`.
  - **Revisión (26-oct, sin commit):** el respaldo cuando el módulo nuevo lanza ya no confía en el encabezado `company`: usa la empresa del JWT (`getJwtTenant`, `esSesionDePlataforma`, `esDeLaEmpresa`); un pedido ajeno responde 404 igual que uno inexistente, con rastro, y Julsmind entra a cualquiera. Caso nuevo en `historialPedido.lecturaControlador.emulator.test.js` (9 casos en verde): módulo lanzando + otra empresa con y sin encabezado.
- [x] 4.13 **No aplica (decisión 1: no se firma el canal).** ~~Solo si se aprueba D4.1: claim `canal` al iniciar sesión~~ (`controllers/authentication.js:217`, `controllers/login.js:55`), en un cambio aparte, con su prueba.
  - **Hecho:** sin cambios en `middleware/auth.js`; las suites de `tests/auth` en verde.
- [ ] 4.14 Regresión completa:
  - `npm run test:historial-pedido`;
  - `test:historial-pedido:emulador`;
  - las suites de 4.1 a 4.12.
  - `node --check` de cada archivo tocado.
  - Sin `node index.js` contra producción, porque arranca los crones.
- [ ] 4.15 Mostrar el diff completo del backend y esperar aprobación. Luego commit con sello y push a `backend-aws-security`.

## 5. Datos, antes de encender la bandera (cada paso con autorización)

- [ ] 5.1 Índices y `fieldOverrides` de D1, con un `firestore.indexes.json` temporal que lleve solo lo nuevo más los `fieldOverrides` vivos. `firebase deploy --only firestore:indexes`, **sin `--force`**.
  - **Hecho:** índices en estado `READY` y conteo vivo = conteo anterior + 3.
  - **Preparado (26-oct, NO desplegado):** `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-5.1-indexes.patch` (contra el `firestore.indexes.json` de HEAD: los 3 índices de D1 y los 4 `fieldOverrides`; no aplica sobre la copia de trabajo porque otra sesión tiene una entrada sin commitear al final del archivo) y `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-5.1-indexes-temporal.json` (el archivo temporal de esta tarea: los 3 índices, uno OPCIONAL de `integration_audit` (`type`, `company`, `at`) para el conteo de fallas por empresa y día de 8.5, los 4 `fieldOverrides` nuevos y los 2 vivos). Las consultas de `lectura.js` y `escritor.js` necesitan justo esos tres.
- [ ] 5.2 Reglas:
  - versionar el ruleset vivo (copia de 1.2);
  - agregar la exclusión de `order_history_events` (D7.3);
  - probar en el emulador que un cliente no lee, no crea, no edita y no borra, y que las demás colecciones siguen igual que hoy;
  - publicar con aprobación explícita y dejar listo el ruleset anterior para revertir.
  - Coordinar con D-513 (`cerrar-reglas-firebase`).
  - **Hecho:** regla publicada y comprobada en el Rules Playground.
  - **Preparado (26-oct, NO publicado):** el ruleset vivo se volvió a leer (solo lectura) y es IGUAL al del 23-oct (`48fea55c`, del 14-oct): `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/firestore.rules.vivo-26oct`. La propuesta es `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/firestore.rules.d541-propuesta` (`/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-5.2-reglas.patch`): una función `historialDelPedido(collection)` y `!historialDelPedido(collection)` en las TRES condiciones. Probada en el emulador local con el SDK de cliente (`/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/reglas-emulador.js`): con las reglas vivas un cliente anónimo lee, crea, edita y borra `order_history_events`; con la propuesta se le deniega todo y `orders`, `order_status_history` y el candado de `devices` quedan igual. El repo no versiona las reglas (`firebase.json` no tiene `firestore.rules`): publicar con `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/publicar-reglas.js` (simulación por defecto, `--execute` publica, `--revertir <ruleset>` vuelve al anterior; no ejecutado).
- [ ] 5.3 No crear `config/feature_flags.orderHistoryLog`: si no existe, no corta nada. Dejar documentado cómo usar el corte general.

## 6. Front: pruebas primero (`Seller.Katuq`)

- [x] 6.1 `tests/ventas/historial-pedido.util.test.js`:
  - agrupar por día en hora de Colombia (Hoy, Ayer, fecha, cruce de la medianoche UTC);
  - hora con segundos;
  - COP y diferencia con signo «−»;
  - aspecto por tipo.
  - Debe fallar antes de 7.3.
  - **Hecho (26-oct, solo archivos nuevos, sin commit; patch `/private/tmp/claude-501/-Users-danielga-Downloads--Organizado-01-Katuq-Codigo-Seller-Katuq/9e2f2fcc-8208-49bd-967d-6c516f5df7e9/scratchpad/r8/D-541-6.1-7.2-7.3-front-base.patch`):** 20 casos (día en hora de Colombia con el cruce de la medianoche UTC, HOY/AYER/fecha, hora con segundos y reloj de 12 horas, COP y diferencia con «−», la pastilla de saldo, agrupar por día entre páginas, la línea de quién, aspecto por tipo, tipo desconocido, reconstruido, motivo, detalles, resumen y la ruta de la consulta). Falló primero por «Cannot find module» y pasa con 7.3, también con `TZ=America/Los_Angeles` y `TZ=Asia/Tokyo`.

## 7. Front: cambios

- [ ] 7.1 `orderHistoryLog` en `COMPANY_FEATURE_FLAGS` (`shared/services/company-features.service.ts`).
- [x] 7.2 `shared/models/historial-pedido.model.ts` y `shared/services/ventas/historial-pedido.service.ts`, que extiende `BaseService`.
- [x] 7.3 `components/ventas/historial-pedido/historial-pedido.util.ts`.
  - **Hecho:** 6.1 en verde. Modelo, servicio (`HistorialPedidoService.pagina(orderId, { cursor, orden, limite })`, `getSinLoader`) y util replican el patrón del historial de productos (D-548) sin importar nada de él; `tsc --strict` limpio. Nada los usa todavía: no cambian la pantalla ni el build.
- [ ] 7.4 Componentes `HistorialPedidoComponent`, `HistorialResumenComponent` y `HistorialEventoComponent`, con `OnPush`, declarados en `VentasModule`. Aplican la regla de diseño Katuq de D10 y las trampas de CSS global.
- [ ] 7.5 `list.component.html` / `.ts`, todo detrás de la bandera:
  - nombre «Historial del pedido» en las dos entradas;
  - encabezado, contenido y «Cerrar» secundario del modal;
  - `order-history-timeline` intacto.
- [ ] 7.6 `asentarpagomanual.component.ts:645`: con la bandera encendida, motivo obligatorio en el Swal de eliminar y `_motivoCambio` en el cuerpo. Revisar si `components/pos/pos-asentarpagomanual` también elimina pagos; si sí, el mismo cambio.
- [ ] 7.7 `npm run build:prod` sin errores. Si no se publica, revertir el aumento de versión de `environment*.ts`.
  - Los gradientes y los primarios prohibidos de `components/ventas` no suben.
  - **Hecho:** conteos antes y después anotados.
- [ ] 7.8 Revisión en el navegador a 1440 y 390 px, sin scroll horizontal ni texto invisible:
  - con la bandera encendida (FLORECER) y apagada;
  - estados cargando, vacío, error y «Ver más».
  - **Hecho:** capturas de antes y después.
- [ ] 7.9 Mostrar el diff del front y esperar aprobación. Luego commit con sello y push.

## 8. Despliegue por fases (cada paso con autorización; fuera del modo auto)

- [ ] 8.1 Backend en producción con la bandera apagada en todas partes: commit y push antes, luego `git pull` y `pm2 restart katuq-api`, según MANUAL-EC2.
  - **Hecho:**
    - arranque limpio en `pm2 logs`;
    - `GET /v1/orders/:id/history` de un pedido de ALMARA responde igual que antes (solo lectura);
    - cero documentos en `order_history_events`.
- [ ] 8.2 Front en producción con el candado de publicación: `git pull`, build desde la punta y despliegue enseguida.
  - **Hecho:** sin cambios visibles con la bandera apagada.
- [ ] 8.3 FLORECER encendida: `set-company-feature.js` en simulación y luego con `--execute`. Requiere permiso, porque escribe pedidos reales en la empresa demo. Escenarios:
  - venta asistida;
  - POS con pago en efectivo;
  - cambio de estado desde la web, desde Producción y por el MCP;
  - pago registrado, editado y anulado con motivo;
  - entrega del mensajero;
  - borrado.
  - **Hecho:**
    - cada escenario deja su evento con el actor, el origen y la hora correctos;
    - la vista no muestra dobles;
    - la falla simulada (bandera encendida y corte general en `false`) no toca el pedido;
    - el Tablero en vivo, igual.
- [ ] 8.4 **Gate:** la exclusión de reglas (5.2) está publicada.
- [ ] 8.5 ALMARA FELICIDAD encendida, con OK de Daniel. Observación de 5 días hábiles.
  - **Hecho:**
    - `integration_audit` sin `order_history_write_failed`;
    - p95 de la primera página < 1,5 s con al menos 30 aperturas (`pedido.historial.lectura`);
    - 10 pedidos revisados sin dobles ni huecos;
    - eventos por día anotados para el costo.
- [ ] 8.6 Ensayo de reversa en FLORECER: apagar, comprobar que la vista vuelve a la de antes, encender y comprobar que no quedan huecos ni dobles (D8.3).

## 9. Cierre

- [ ] 9.1 Bitácora de D-XXX en `specs/CONTRACT.md` (sesión principal): commits, despliegue, mediciones y qué quedó para la F2.
- [ ] 9.2 Ticket 1351, según el flujo de tickets: comentario con lo publicado y evidencia (captura de la vista en ALMARA).
- [ ] 9.3 Retiro de la bandera (Artículo XII), a más tardar el 2027-04-30: encendida para todos o eliminada, y retiro de `order-history-timeline` y de la rama de antes del lector. Queda como tarea en el CONTRACT.
- [ ] 9.4 El cambio sigue abierto para las F2 a F4. Se archiva con `/opsx:archive` al cerrar la F4, o se parte en un cambio por fase si Daniel lo prefiere.
