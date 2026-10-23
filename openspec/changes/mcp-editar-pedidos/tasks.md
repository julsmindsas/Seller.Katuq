> **Estado:** TAREAS, aprobadas por Daniel el 2026-10-23 (junto con la propuesta y el diseño). **F0 está en producción con la bandera apagada (commits `316887e3` y `ac4b71ef`). F1 (25-oct) está implementada en el árbol de trabajo del backend, sin commit ni despliegue y con su bandera sin crear**; lo que falta está marcado abajo. D-550, ticket 1333. Detalle para la **F0, la F1 y la F2**; la F3 y la F4 tienen aquí su tarea de diseño y sus gates, y sus tareas de código se escriben cuando cierren sus dependencias. Backend en `katuq_admin_back_firebase/functions`; el front del Seller no cambia. **Módulo sensible `orders`: un cambio a la vez, con el diff a la vista y aprobación antes de cada commit.** Cada tarea de código cierra con `node --check` de los archivos tocados y sus pruebas en verde; no se avanza con el build roto. Leer los archivos antes de editarlos. Nunca `git add -A`. No se editan las carpetas `corregir-precio-pedido` ni `cambiar-lista-precios-pedido`.

## 0. Checkpoints

- [x] 0.1 Propuesta y spec aprobadas por Daniel (23-oct), con las 4 respuestas recomendadas.
- [x] 0.2 Aprobación de `design.md` y respuesta a sus 2 Open Questions.
  - **Hecho cuando:** Daniel aprueba y las respuestas quedan en `design.md`.
  - **Hecho (23-oct):** Daniel aprobó el diseño con las respuestas recomendadas. Pregunta 1: el lote de hasta 50 pedidos se conserva en UNA tarjeta (implementado en F0). Pregunta 2: se crean los permisos `ventas.register_payment` y `ventas.void_payment` (se implementan en la F3, no ahora). Anotado en `design.md`.
- [x] 0.3 Aprobación de este `tasks.md`.
  - **Hecho cuando:** Daniel lo aprueba por escrito.
  - **Hecho (23-oct):** Daniel aprobó este `tasks.md`.
- [ ] 0.4 Bitácora de D-550 en `specs/CONTRACT.md`: diseño aprobado, las 5 banderas con dueño y retiro, el corte general y el cambio a la decisión 4 de D-541 (el MCP registra motivo). Revisar `origin` antes.
  - **Depende de:** 0.2, 0.3.
  - **Hecho cuando:** la entrada está en el contrato.

## 1. Verificación previa (solo lectura, sin escribir producción)

- [ ] 1.1 Confirmar con 3 pedidos reales de ALMARA (reutilizando la tabla de la tarea 1.1 de D-541) las rutas de las opciones de F1 y F2, incluido dónde está el contacto de quien recibe y qué campos marcan un pedido facturado (`pedidoYaFacturado`). Solo nombres de campo.
  - **Depende de:** 0.3.
  - **Hecho cuando:** la tabla de rutas por opción queda en `design.md` («Desvíos») y cada opción tiene su ruta.
  - **Parcial (24-oct), sigue abierta:** las rutas de la tarea 1.1 de D-541 cubren notas, tarjetas, entrega, dirección, ciudad, asesor y facturación (tabla en `historial-completo-del-pedido/tasks.md`). Por el código se confirmó que quien recibe vive en `envio.{nombres, apellidos, indicativoCel, celular}` (misma forma del dato de entrega del cliente, `pedido-entrega.component.ts:161-176, 248-266`) y que un pedido facturado lo marcan `nroFactura`, `pdfUrlInvoice` o `_facturando` en la pantalla (`list.component.ts:2157`) y `facturaSiigo`, `facturacionElectronica.invoiceId` o un `facturacionEnProceso` vivo en el servidor (`pedidoYaFacturado.js`): la F2 debe mirar los dos juegos. **Falta** leer 3 pedidos reales de ALMARA para confirmar esos nombres de campo: el sistema bloqueó la lectura a producción (clasificador de permisos) y no se reintentó. Hace falta el OK de Daniel para esa lectura (solo nombres de campo).
  - **Segundo intento (25-oct), bloqueado otra vez:** la tarea del encargo dice que Daniel autorizó la lectura de solo nombres y tipos, pero el clasificador de permisos de la sesión la volvió a negar (no vino de un mensaje de Daniel en la sesión). El script de solo lectura está listo y no imprime valores (`scratchpad/lee-pedidos-rutas.js`: rutas y tipos de 3 pedidos de ALMARA). **Qué se necesita:** que Daniel la apruebe en el permiso de la sesión o la corra él. **Qué cambia si no se hace:** F1 se escribió con los nombres que el modelo del Seller declara (`DatosEntrega.observaciones`, `Tarjeta {para, mensaje, de}`, `notasPedido.<lista>[] {fecha, nota, fromFormulario}`); si un pedido real los guarda distinto, la propuesta saldría como «sin cambios» o sin la fila, nunca escribiría en otro campo. Se confirman antes de encender la bandera (6.6).
- [x] 1.2 Leer en `list.component.ts` y sus diálogos qué permiso o rol exige la pantalla para cada opción de F1 y F2 (en especial, cambiar el asesor y la facturación).
  - **Depende de:** 0.3.
  - **Hecho cuando:** una tabla opción → regla de la pantalla (con archivo:línea) queda en `design.md` D5.
  - **Hecho (24-oct), solo lectura de código.** Regla de la pantalla por opción (`Seller.Katuq/src/app/components/ventas/list/`):

    | Opción | Regla de la pantalla | Dónde | Para el MCP |
    |---|---|---|---|
    | Estado de proceso | Administrador (rol que contiene «admin») o uno de 5 correos fijos | `list.component.ts:777, 2179, 2191, 2211` | **Distinta de hoy:** el MCP deja cambiar estados a quien tenga `ventas/pedidos` o `despachos` en el menú, y el servidor valida las transiciones. La F0 no lo cambia; queda como pregunta para Daniel (ver `design.md`, Desvíos) |
    | Notas | Cualquiera con el menú; no para pedidos POS; el pedido debe tener productos | `list.component.ts:6909`, `list.component.html:2355` | Menú `ventas/pedidos`; bloquear POS |
    | Dirección y entrega | Bloqueada si la forma de entrega contiene «recoge»; los datos básicos no se editan en estado Entregado o Cerrado | `list.component.ts:2125, 2146` | Mismas dos reglas |
    | Facturación | Solo si no tiene `nroFactura`, `pdfUrlInvoice` ni `_facturando` | `list.component.ts:2157` | Esas tres más las del servidor (`pedidoYaFacturado.js`) |
    | Asesor | Solo Administrador (rol que contiene «admin») | `list.component.ts:2274`; `list.component.html:2418` | `soloAdministrador: true` (ya en `opciones.js`); en el servidor, `isAdminFamilyRole` |
    | Pedido congelado (productos) | EnProduccion a Despachado, Entregado y Cerrado | `list.component.ts:807` | Aplica a las opciones que tocan `carrito` (tarjeta, observaciones, franja y fecha) en la F1 |
- [x] 1.3 Ubicar el servicio que resuelve la zona y el valor del domicilio cuando la pantalla cambia la ciudad o la dirección.
  - **Depende de:** 0.3.
  - **Hecho cuando:** queda su archivo:línea en `design.md` D4 y una prueba con dobles lo puede llamar sin escribir.
  - **Hecho (24-oct), con una consecuencia para la F2:** **no existe un servicio del servidor** que resuelva la zona y el valor del domicilio por ciudad. La pantalla lo hace en el navegador: `zonaCubreCiudad` (`Seller.Katuq/src/app/shared/util/zona-cobro.util.ts:97`) sobre las zonas de la colección `zonacobro` (`controllers/zonascobro.js:44`), y guarda `envio.{zonaCobro, valorZonaCobro}`; el servidor solo lee lo guardado (`services/orderCalculationService.js:355-368`). El backend tiene `services/zonasCobroPackage.js` (`normalizeZonaCobro`, `municipioKey`) pero no `zonaCubreCiudad`. Por eso **la prueba con dobles de F2 no puede llamar a un servicio que no existe**: la F2 debe elegir entre (a) llevar esa función pura al servidor con una prueba que la compare con la del front, o (b) la regla simple: una ciudad nueva solo se acepta si la zona guardada en `envio.zonaCobro` la cubre; si no, «se hace desde Katuq». Recomendada: (b) para la F2. Decide Daniel antes de la tarea 7.1.
- [x] 1.4 Caracterizar con dobles qué avisos dispara `updateOrderInternal` para el parche de cada opción (`claimDirectNotifEvents`, `detectSellerNotification`).
  - **Depende de:** 1.1.
  - **Hecho cuando:** una tabla opción → aviso al cliente / al vendedor queda en `design.md` D4.
  - **Hecho (24-oct), leyendo `controllers/orders.js:4113-4163, 4201-4236, 4636-4684` (sin ejecutarlo):** los avisos de `updateOrderInternal` dependen **solo del cambio de estado** (`claimDirectNotifEvents`, `detectSellerNotification`); el parche de F1 y F2 no cambia estado y no avisa al cliente ni al vendedor.

    | Opción | Aviso al cliente | Aviso al vendedor | Otro efecto |
    |---|---|---|---|
    | Estado → ProducidoTotalmente, Despachado, Entregado, Rechazado | Sí, correo o mensaje (`DIRECT_NOTIF_EVENTS`, una vez por evento) | EnProduccion, ProducidoTotalmente, Empacado, Despachado, Entregado, Rechazado (campana de Katuq) | Rechazado devuelve inventario; Entregado pide la reseña (una vez) |
    | Notas, observaciones, tarjeta, contacto, asesor, facturación, fecha y franja | No | No | — |
    | Dirección (`envio.direccionEntrega`) | No | No | Con el pedido en EnDespacho o Despachado, avisa por notificación al mensajero (`notifyMessengerIfDeliveryAddressChanged`, `:3242`) |

    La propuesta de F0 ya trae estos efectos en palabras de negocio (`services/mcp/pedidos/propuesta.js`).
- [x] 1.5 Estado de las dependencias: D-541 (enganches 4.2 y 4.3, catálogo de la F2), D-543 (T-18) y D-549.
  - **Depende de:** 0.3.
  - **Hecho cuando:** una línea por dependencia con commit y estado queda en la bitácora.
  - **Hecho (24-oct), estado de las dependencias en el árbol de trabajo:**
    - **D-541:** F1 en el árbol hasta el enganche 4.1 (`9ab9074d`); `contexto.desdeMcp` existe. Los enganches 4.2 y 4.3 **no están**: `controllers/orders.js` no lee `options.contexto`, y `historialPedido.puntos.contract.test.js` falla en 32 de 45 casos (esperado, es de ellos). La F0 ya pasa `{ contexto, motivo }` en las opciones de `updateOrderInternal`, que hoy ignora; con eso el caso **U2** de ese contrato pasa. El motivo debe leerlo D-541 (`reason`/`reasonStatus`, decisión 4 actualizada).
    - **D-543 y D-544:** `services/orders/priceChange/` está sin commitear, en otra sesión (accesos, acuerdo, comprobante, vista previa); sin T-18 verificada. No se usa en F0.
    - **D-549 (`mcp-adjuntos-tickets`):** sin código. La tarjeta compartida `apps/_comun/propuesta.js` la creó esta F0; D-549 debe reutilizarla, no recrearla.

## 2. F0: pruebas primero (Artículo VIII)

- [x] 2.1 [P] `tests/mcp/pedidos/updateOrderStatus.aprobacion.contract.test.js`: con la bandera, la primera llamada no escribe ni avisa; aprobación aplica; pedido movido entre propuesta y aprobación = rechazo; reintento = «ya aplicado» sin escribir; lote de N pedidos en una tarjeta (según la Open Question 1); sin la bandera, resultado idéntico al de hoy.
  - **Depende de:** 0.3.
  - **Hecho cuando:** los casos con bandera fallan y los de sin bandera pasan.
  - **Hecho (24-oct):** `tests/mcp/pedidos/updateOrderStatus.aprobacion.contract.test.js`, 21 casos (se escribió antes que el código; fallaba con `Cannot find module`). Incluye propuesta sin escribir, aprobación, carrera, reintento, lote de 50 en una tarjeta, comprobante de otra empresa o acción, solo persona (OAuth), registros sin datos personales y sin bandera idéntico a hoy. Revisión (24-oct): el reintento ahora se prueba también con los estados finales Entregado, Rechazado y Cerrado, y la prueba subió a 25 casos. **No cubre** «el modelo SHALL NOT poder aprobar»: el modelo puede enviar el comprobante, que la propuesta le devuelve (desvío anotado en `design.md`, «Desvíos, F0»; decide Daniel antes de 4.2).
- [x] 2.2 [P] `tests/mcp/pedidos/opciones.test.js`: matriz rol × opción × bandera × estado del pedido para `get_order_edit_options`; cero escrituras.
  - **Depende de:** 1.2.
  - **Hecho cuando:** falla con `Cannot find module`.
  - **Hecho (24-oct):** `tests/mcp/pedidos/opciones.test.js`, 28 casos (7 personas × 2 estados de la bandera, 6 estados de pedido, llaves sin persona, otra empresa, cero escrituras, registro de la herramienta).
- [x] 2.3 [P] `tests/mcp/confirmarTarjeta.test.js`: la tarjeta con `motivo` y `efectos` los pinta y exige el motivo obligatorio; sin ellos, el HTML de la propuesta es el de hoy.
  - **Depende de:** 0.3.
  - **Hecho cuando:** falla porque los bloques no existen.
  - **Hecho (24-oct):** `tests/mcp/confirmarTarjeta.test.js`, 8 casos. Como no hay navegador, la lógica de la tarjeta vive en funciones puras (`apps/_comun/propuesta.js`) que la prueba compila con esbuild en memoria.

## 3. F0: implementación

- [ ] 3.1 `mcpOrderStatusApproval` en `FEATURE_FLAG_NAMES` con su comentario (D-550, dueño Daniel, retiro 2027-04-30) y en la prueba de banderas.
  - **Depende de:** 0.4.
  - **Hecho cuando:** las pruebas de banderas pasan; nace apagada.
  - **No hecha (24-oct), bloqueada por reglas del encargo:** `services/companyFeatureFlags.js` y `specs/CONTRACT.md` (0.4) son de otra sesión y no se tocan. Mientras la bandera no esté en el catálogo, `isFeatureEnabled` responde `false` para todas las empresas: **F0 queda apagada y todo se comporta como hoy** (por eso nada se puede encender todavía). Las líneas exactas para agregar están en el informe de la sesión y abajo, en `design.md` («Desvíos de la implementación, F0»).
- [x] 3.2 `services/mcp/pedidos/`: `resolver.js`, `bloqueos.js`, `identidad.js`, `log.js` y `aplicar.js` (parche mínimo, `_baseVersion`, contexto D-541 e invalidación del caché de pedidos).
  - **Depende de:** 1.5.
  - **Hecho cuando:** sus pruebas unitarias pasan y `aplicar.js` llama `updateOrderInternal` con el contexto de la tarea 4.3 de D-541.
  - **Hecho (24-oct):** `services/mcp/pedidos/` con `resolver.js`, `bloqueos.js`, `identidad.js`, `log.js`, `aplicar.js`, `propuesta.js`, `opciones.js` y `banderas.js`; `tests/mcp/pedidos/modulo.test.js` (10 casos, incluido el candado de write-set). `aplicar.js` recibe `updateOrderInternal` inyectado y lo llama con `{ contexto, motivo }`; el `require` del controlador vive en la herramienta para que el módulo se pruebe sin cargarlo. Sin `_baseVersion` en F0: la huella lleva el estado de antes de cada pedido.
- [x] 3.3 Tarjeta: extraer `apps/_comun/propuesta.js` (o reutilizarlo si D-549 llegó primero) y agregar los bloques de motivo y efectos; compilar.
  - **Depende de:** 2.3.
  - **Hecho cuando:** 2.3 en verde y `node services/mcp/apps/build.js --check` pasa.
  - **Hecho (24-oct):** `apps/_comun/propuesta.js` (nuevo, compartible), `confirmar.{html,css,js}` con los bloques de efectos y de motivo (opcional u obligatorio), y `confirmar/dist/confirmar.html` recompilado; `node services/mcp/apps/build.js --check` pasa. Además la tarjeta ahora muestra como éxito un resultado `success: true` que no es propuesta (necesario porque `update_order_status` ya declara la tarjeta y, sin la bandera, devuelve su resultado de siempre).
- [x] 3.4 `tools/updateOrderStatus.js`: propuesta y aprobación con la bandera; sin ella, igual que hoy. **Diff y aprobación antes del commit.**
  - **Depende de:** 2.1, 3.1, 3.2, 3.3.
  - **Hecho cuando:** 2.1 en verde y `tests/mcp/*` sigue en verde.
  - **Hecho (24-oct), pendiente el diff aprobado por Daniel antes del commit y la decisión sobre el desvío «el modelo puede aprobar» (`design.md`, «Desvíos, F0»); ese requisito de la spec queda sin cumplir:** `tools/updateOrderStatus.js` reescrito con dos caminos. Sin bandera: el de siempre (mismos textos y claves; ahora también pasa el contexto D-541 en las opciones). Con bandera: la primera llamada propone (una fila por pedido, `motivoRechazo` si es Rechazado, advertencias con los no aprobables, efectos y motivo opcional) y la aprobación aplica pedido por pedido. Solo una persona (OAuth con correo) cambia estados con la bandera; llave de empresa y Opttia (`servicekey`) reciben «sin persona». 25 casos de 2.1 en verde, y `operationalTools`, `escrituraPorRol`, `registryPermisos`, `audienciaTools`, `opttia-access` y `opttiaSupportMcp` siguen en verde.
- [x] 3.5 `tools/getOrderEditOptions.js` (lectura) y su registro.
  - **Depende de:** 2.2, 3.2.
  - **Hecho cuando:** 2.2 en verde.
  - **AL COMMITEAR (24-oct):** `tools/toolRegistry.js` tiene en el árbol de trabajo, además del registro de D-550, los cambios de D-549 (requires de `prepareSupportAttachmentUpload` y `discardSupportAttachments`, sus entradas en `PERMISOS_POR_TOOL` y `MODULO_POR_TOOL` y sus `registerTool`), cuyos archivos están sin commitear en otra sesión. El commit de D-550 SHALL llevar solo sus dos hunks (el `require` de `getOrderEditOptions` junto a `getOrderSummary` y `this.registerTool(getOrderEditOptions)`), con `git add -p`, nunca `git add tools/toolRegistry.js` entero: si no, el servidor no arranca con `Cannot find module`. Los hunks de D-549 se quedan para su commit.
  - **Hecho (24-oct):** `tools/getOrderEditOptions.js` y su registro en `tools/toolRegistry.js` (herramienta de lectura, audiencia `ambas`). Hoy solo `estado` está construida; las otras 11 opciones aparecen como «se hace desde Katuq». 2.2 en verde.
- [ ] 3.6 Suite `test:mcp-pedidos` en `package.json` y regresión (`tests/mcp/*`, `retrocesoManual.contract`, suites de D-541).
  - **Depende de:** 3.4, 3.5.
  - **Hecho cuando:** 0 fallas.
  - **Parcial (24-oct), sigue abierta:** corrieron en verde las pruebas nuevas (4 archivos, 67 casos), `build.js --check` y la regresión que no lee producción (`operationalTools`, `escrituraPorRol`, `registryPermisos`, `confirmacion`, `pantallaConfirmar`, `puentePantallas`, `audienciaTools`, `uiExtension`, `uiResources`, `permisosSitiosYPantallas`, `opttia-access`, `opttiaSupportMcp`). **Falta** el script `test:mcp-pedidos` (`package.json` es de otra sesión; línea exacta en `design.md`) y la regresión completa de `tests/mcp/*`, `retrocesoManual.contract` y las suites de D-541 y Tesorería, que leen Firestore real: necesitan el OK de Daniel para correr contra producción o un emulador.

## 4. F0: despliegue y encendido

- [ ] 4.1 Diff revisado, commit y push; desplegar con la bandera apagada.
  - **Depende de:** 3.6.
  - **Hecho cuando:** producción corre la versión y `update_order_status` se comporta como hoy.
- [ ] 4.2 FLORECER encendida; probar en Claude: un pedido, un lote, cancelar, aprobar dos veces y un pedido movido por otra persona.
  - **Depende de:** 4.1.
  - **Hecho cuando:** cada caso da lo esperado y el historial D-541 muestra «Claude/MCP» con la persona.
- [ ] 4.3 ALMARA encendida y 5 días hábiles de observación.
  - **Depende de:** 4.2 y OK de Daniel.
  - **Hecho cuando:** ningún cambio de estado sin tarjeta en ALMARA y ningún error sin explicar en los registros.

## 5. F1: pruebas primero

- [x] 5.1 [P] `tests/mcp/pedidos/editOrder.f1.contract.test.js`: nota (agregar y editar), observaciones y tarjeta; propuesta sin escrituras; parche mínimo; guard sin plata (un pedido con total guardado de $1 se bloquea); pedido con `pricingAgreement` bloqueado en las opciones que tocan `carrito`; `servicekey` y `apikey` no editan; motivo opcional registrado como `given` o `not_required`.
  - **Depende de:** 1.1, 4.3.
  - **Hecho cuando:** falla porque `edit_order` no existe.
  - **Hecho (25-oct):** `tests/mcp/pedidos/editOrder.f1.contract.test.js` (30 casos) y `modulo.f1.test.js` (26: planes de cada opción, parche, bloqueos y guard sin plata, incluido uno con el cálculo real). Se escribieron antes que el código (`Cannot find module`). Cubren: propuesta sin escrituras; parche mínimo; guard (total guardado en $1 bloqueado, también al aprobar); acuerdo de precio y pedido congelado; `servicekey`, `apikey` y OAuth sin correo no editan; fase apagada; carrera por huella y por versión; `STALE_WRITE`; reintento («ya aplicado», también para una nota); motivo opcional; registros sin datos personales; registro de la herramienta. `_fixturesF1.js` trae los pedidos inventados. **Revisión (26-oct):** +8 casos (38 en total): el comprobante de un pedido no aplica a otro ni a otra persona; versión obligatoria con comprobante; pedido sin `date_upd` no admite observaciones ni tarjeta; guard de inventario (transaccional desfasado, al día, sin poder comprobar). **No cubre** el requisito «El modelo SHALL NOT poder aprobar»: `edit_order` hereda el desvío de F0 (el comprobante pasa por el modelo), pendiente de decisión de Daniel; ver «Desvíos, F1» en `design.md`.
- [x] 5.2 [P] `tests/mcp/pedidos/writeset.contract.test.js`: solo `orders.update` por `updateOrderInternal` y eventos D-541; nunca `products`, `inventory`, `inventoryMovement`, precios ni listas; F1 no llama `inventoryService`.
  - **Depende de:** 4.3.
  - **Hecho cuando:** falla por la razón esperada.
  - **Hecho (25-oct):** `tests/mcp/pedidos/writeset.contract.test.js` (5 casos): sin escrituras directas ni nombres de productos, inventario o precios en el código; con una base falsa solo se toca `orders`; el parche no mueve cantidades, productos, precios, pagos ni estados; no se carga `inventoryService`; el contexto es el de Claude/MCP con la persona.
- [x] 5.3 `tests/mcp/pedidos/historial.emulator.test.js` (F1): cada opción aplicada deja su evento con origen `mcp`, persona, antes → después y motivo; una propuesta cancelada no deja evento.
  - **Depende de:** 4.3.
  - **Hecho cuando:** falla porque el evento no existe.
  - **Hecho (25-oct), en rojo A PROPÓSITO:** `tests/mcp/pedidos/historial.emulator.test.js` (7 casos, 5 fallan). `eventoDeGuardado` devuelve `null` para un guardado que solo cambia notas, observaciones o tarjeta: el catálogo de D-541 no los conoce. No necesita el emulador (usa los constructores puros con el mismo contexto y parche); la prueba contra el emulador se suma con los tipos. **Es el gate de D8: ninguna opción de F1 se enciende mientras esté en rojo.** No entra al script `test:mcp-pedidos` hasta que pase.

## 6. F1: implementación

- [ ] 6.1 Catálogo de D-541 con los tipos y campos de nota, observaciones y tarjeta: reutilizar los de la F2 de D-541 si ya existen; si no, agregar solo esas entradas en `services/orders/historialPedido/constantes.js` y `etiquetas.js`, **coordinado con el dueño de D-541 y con su aprobación**.
  - **Depende de:** 1.5.
  - **Hecho cuando:** las pruebas de D-541 siguen en verde y los tipos nuevos tienen texto de negocio.
  - **ALTO AQUÍ (25-oct), no aplicada: necesita la aprobación del dueño de D-541 (y de Daniel).** La F2 de D-541 no existe y `constantes.js`, `etiquetas.js`, `index.js`, `escritor.js` y `lectura.js` tienen cambios sin commitear de otra sesión (D-543), así que no se editaron. La propuesta quedó **verificada en una copia aparte** (no en el árbol): agrega 4 tipos (`order_note_added`, `order_note_edited`, `delivery_notes_changed`, `gift_card_changed`), 8 campos (`nota.<lista>` ×4, `observaciones`, `tarjeta.para|mensaje|de`) con sus textos, y `diferenciaDeEdicion` en `construir.js` que arma el evento de un guardado de notas, observaciones o tarjeta, con el motivo de la tarjeta del MCP. Con ella, `historial.emulator.test.js` pasa 7/7 y las pruebas de D-541 sin emulador (`construir` 26, `escritor` 19, `lectura` 14, `espejo` 9, `guardado`) siguen en verde. Sin cambios en `controllers/orders.js`. Efecto a decidir: el evento sale **también cuando la pantalla edita** notas, observaciones o tarjeta (es lo que pide D-541 F2), no solo desde Claude. El diff exacto está en el informe de la sesión.
- [ ] 6.2 `mcpOrderEditNotes` en el catálogo de banderas y `config/feature_flags.mcpOrderEdit` como corte general en `opciones.js`.
  - **Depende de:** 0.4.
  - **Hecho cuando:** pruebas de banderas en verde; el corte en `false` devuelve «no disponible».
  - **Parcial (25-oct):** el corte general y la bandera de la fase están en `services/mcp/pedidos/{banderas,opciones}.js` y probados (`modulo.f1.test.js`, `opciones.test.js`: con el corte en `false` F1 responde «aún no está activa para tu empresa» y el cambio de estado de F0 sigue pidiendo aprobación). **Falta** `"mcpOrderEditNotes"` en `FEATURE_FLAG_NAMES` de `services/companyFeatureFlags.js` y en su prueba `tests/companies/companyFeatureFlags.test.js` (son de otra sesión; las líneas están en el informe). Mientras no esté en el catálogo, `isFeatureEnabled` responde `false` para todas las empresas: F1 queda apagada.
- [x] 6.3 `opciones.js` (F1) y `propuesta.js`.
  - **Depende de:** 5.1, 6.2.
  - **Hecho cuando:** los casos de propuesta de 5.1 pasan.
  - **Hecho (25-oct):** `services/mcp/pedidos/edicion.js` (los tres planes, `armarParche`), `opciones.js` (las tres opciones de F1 construidas, con `activaParaEmpresa`) y `bloqueos.js` (`bloqueoDeEdicion`). Las posiciones que ve la persona cuentan desde 1. Ver «Desvíos de la implementación, F1» en `design.md`.
- [x] 6.4 `sinDinero.js`.
  - **Depende de:** 5.1.
  - **Hecho cuando:** los casos del guard pasan, incluido el pedido de $1.
  - **Hecho (25-oct):** `services/mcp/pedidos/sinDinero.js`. Corre el cálculo real de `updateOrderInternal` sobre una copia del parche y, con Tesorería, la suma de pagos aprobados; compara 7 importes (más `totalPedidoSinDescuento` si el pedido lo guardaba) y los campos por línea que lee la factura. Falla cerrado. Probado con dobles y una vez con `calculateOrderTotals` real.
- [ ] 6.5 `tools/editOrder.js` con las opciones de F1 y su registro (`ESCRITURA`, módulo `['ventas/pedidos']`). **Diff y aprobación antes del commit.**
  - **Depende de:** 6.1, 6.3, 6.4.
  - **Hecho cuando:** 5.1, 5.2 y 5.3 en verde.
  - **Aplicada en el árbol (25-oct), NO cerrada:** `tools/editOrder.js` y su registro en `tools/toolRegistry.js` (`ESCRITURA`, módulo `['ventas/pedidos']`, audiencia `ambas`; solo 3 líneas de D-550). 5.1 (30 + 26 casos) y 5.2 (5) en verde; 5.3 en rojo hasta la 6.1. **Pendiente: el diff aprobado por Daniel antes del commit** y la 6.1. Sin cambios en `controllers/orders.js`. Opttia (`servicekey`) no la tiene en su catálogo cerrado (`opttiaAccessPolicy`) y la herramienta además exige una persona. **Revisión (26-oct):** comprobante ligado al pedido y a la persona, versión obligatoria, `sin_version` para lo que reescribe `carrito` y guard de inventario (`services/mcp/pedidos/inventario.js`), con 5.1 en 38 casos. **No se cierra mientras Daniel no decida el desvío «el modelo puede aprobar» (comprobante y motivo pasan por el modelo), el mismo de F0; hasta entonces `mcpOrderEditNotes` no se enciende.**
- [ ] 6.6 Despliegue con `mcpOrderEditNotes` apagada; FLORECER; ALMARA (OK de Daniel); 5 días hábiles.
  - **Depende de:** 6.5.
  - **Hecho cuando:** en ALMARA, cada cambio de F1 tiene su evento y ningún total cambió (comparación de 10 pedidos antes y después).

## 7. F2: pruebas e implementación

- [ ] 7.1 [P] `tests/mcp/pedidos/editOrder.f2.contract.test.js`: entrega con cambio de domicilio bloqueada; facturación de pedido facturado bloqueada; asesor con la regla de la pantalla (1.2); contacto de quien recibe.
  - **Depende de:** 1.1, 1.2, 1.3, 6.6.
  - **Hecho cuando:** falla porque las opciones no existen.
- [ ] 7.2 Catálogo de D-541 con entrega, contacto, asesor y facturación (mismo criterio que 6.1).
  - **Depende de:** 6.1.
  - **Hecho cuando:** pruebas de D-541 en verde.
- [ ] 7.3 `mcpOrderEditDelivery` y las opciones de F2 en `opciones.js` y `edit_order`. **Diff y aprobación antes del commit.**
  - **Depende de:** 7.1, 7.2.
  - **Hecho cuando:** 7.1, 5.2 y la prueba de historial de F2 en verde.
- [ ] 7.4 Despliegue con la bandera apagada; FLORECER; ALMARA (OK de Daniel); 5 días hábiles.
  - **Depende de:** 7.3.
  - **Hecho cuando:** ningún cambio de F2 movió el valor del domicilio ni el total, y cada uno tiene su evento.

## 8. Cierre de F0 a F2

- [ ] 8.1 Bitácora en `specs/CONTRACT.md` (commits, encendidos, observaciones) y nota en el ticket 1333 cuando corresponda.
  - **Depende de:** 7.4.
  - **Hecho cuando:** la entrada está con commits y fechas.

## 9. F3, pagos (gate de diseño)

- [ ] 9.1 Trazar «Gestión de pagos» (`asentarpagomanual.component.ts:319, 674, 746`) y Tesorería (`/payments/submit`, `/payments/direct`, `/payments/:id/review`): quién calcula saldo, estado de pago y cartera, y qué hace la factura automática.
  - **Depende de:** 8.1.
  - **Hecho cuando:** queda escrito si el servidor calcula todo. Si no, la F3 se detiene y se propone una operación de servidor como cambio aparte.
- [ ] 9.2 Diseño detallado y tareas de la F3 (permisos `ventas.register_payment` y `ventas.void_payment` según la Open Question 2, comprobante con la sesión de D-549, efectos).
  - **Depende de:** 9.1 y D-549 encendido.
  - **Hecho cuando:** Daniel aprueba el diseño y las tareas de la F3.

## 10. F4, plata (gate de diseño)

- [ ] 10.1 Diseño detallado y tareas de la F4 sobre los servicios de D-543 y D-544, con el adaptador de identidad por correo y empresa acordado con el dueño de D-543.
  - **Depende de:** D-543 y D-544 publicados y su piloto estable en ALMARA.
  - **Hecho cuando:** Daniel aprueba el diseño y las tareas de la F4.

## 11. Retiro (Artículo XII)

- [ ] 11.1 2027-04-30: cada bandera de D-550 encendida para todos o eliminada; la rama sin aprobación de `update_order_status` se borra.
  - **Depende de:** 4.3, 6.6, 7.4.
  - **Hecho cuando:** no queda lectura de las banderas retiradas y `update_order_status` siempre pide aprobación.
