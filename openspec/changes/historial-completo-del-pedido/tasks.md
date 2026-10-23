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
- [ ] 4.2 `updateOrderInternal`:
  - `options.contexto`;
  - quitar `_motivoCambio`;
  - evento combinado después de escribir (D6.5).
  - **Hecho:** E1 y P1 en verde; `retrocesoManual.contract`, `editBatchSinCamposDePago` y las suites de Tesorería en verde.
- [ ] 4.3 Contexto en los llamadores de `updateOrderInternal`, uno por archivo: U1 `exports.edit`, U2 MCP, U3 plan de despachos, U4 producción, U5 Tesorería (incluidos `controllers/treasury.js` y `controllers/integration.js:2524`), U6, U7 y U8.
  - **Hecho:** cada caso U en verde; `tests/despachos/ejecutarPlan*.contract`, `tests/opttiaPropuestas/*` y `tests/mcp/*` en verde.
- [ ] 4.4 E2 `editByTransporter` → `delivery_reported`, con la evidencia y el actor mensajero.
- [ ] 4.5 E3 `editBatch` → contexto de la sesión, pasado a `processBatchAuditAndNotifications`.
- [ ] 4.6 E4 `delete` → `order_deleted` con resumen.
  - **Hecho:** `borrarPedido.test.js` en verde.
- [ ] 4.7 C1 `exports.create`: después de `createOrderWithinLimit`, con `newOrderData`.
  - **Hecho:** `orderControllerHook`, `warehouseAllocationShadow`, `freePlanLimits`, `mobilePosConsistency.contract` y `precioManualSubtotal` en verde.
- [ ] 4.8 C2 a C7: `options.contextoHistorial` en `orderService.createOrder` y en sus llamadores (Shopify, WooCommerce, tienda, tienda virtual, flows, reparto).
  - **Hecho:** `test:reparto-por-bodega`, `test:flows` y `test:bajo-pedido-shopify` en verde.
- [ ] 4.9 C8 cotización convertida, C9 domicilios (solo si `!repetido`) y C10 Kuvo (después de confirmar).
  - **Hecho:** `test:domicilios`, `test:cotizaciones-contract` y las suites de `tests/kuvo` en verde.
- [ ] 4.10 Pagos P2 (rama `legacyWrite`), P3 Wompi, P4 `payment-callback` y P5 ePayco, con ids por transacción.
  - **Hecho:** las suites de Tesorería y de pagos de tienda en verde.
- [ ] 4.11 Contexto de sesión en E5, E6, E7 (`logistica.js`) y E13 (cancelar envío de Cereza).
- [ ] 4.12 `getOrderHistory`:
  - `vista=eventos`;
  - 404 más rastro para un pedido ajeno;
  - con la bandera apagada o un error, la vista de antes;
  - log `pedido.historial.lectura`.
  - **Hecho:** 2.6 en verde y `tests/companies/companyAccess.test.js` en verde.
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
- [ ] 5.2 Reglas:
  - versionar el ruleset vivo (copia de 1.2);
  - agregar la exclusión de `order_history_events` (D7.3);
  - probar en el emulador que un cliente no lee, no crea, no edita y no borra, y que las demás colecciones siguen igual que hoy;
  - publicar con aprobación explícita y dejar listo el ruleset anterior para revertir.
  - Coordinar con D-513 (`cerrar-reglas-firebase`).
  - **Hecho:** regla publicada y comprobada en el Rules Playground.
- [ ] 5.3 No crear `config/feature_flags.orderHistoryLog`: si no existe, no corta nada. Dejar documentado cómo usar el corte general.

## 6. Front: pruebas primero (`Seller.Katuq`)

- [ ] 6.1 `tests/ventas/historial-pedido.util.test.js`:
  - agrupar por día en hora de Colombia (Hoy, Ayer, fecha, cruce de la medianoche UTC);
  - hora con segundos;
  - COP y diferencia con signo «−»;
  - aspecto por tipo.
  - Debe fallar antes de 7.3.

## 7. Front: cambios

- [ ] 7.1 `orderHistoryLog` en `COMPANY_FEATURE_FLAGS` (`shared/services/company-features.service.ts`).
- [ ] 7.2 `shared/models/historial-pedido.model.ts` y `shared/services/ventas/historial-pedido.service.ts`, que extiende `BaseService`.
- [ ] 7.3 `components/ventas/historial-pedido/historial-pedido.util.ts`.
  - **Hecho:** 6.1 en verde.
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
