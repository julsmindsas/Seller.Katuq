> **Estado:** DISEÑO, **aprobado por Daniel el 2026-10-23**; F0 implementada en el árbol de trabajo del backend (23-oct), sin commit ni despliegue (ver «Desvíos de la implementación, F0»). Ticket 1333 (ALMARA FELICIDAD). Decisión **D-550**. La propuesta y la spec las aprobó Daniel el 2026-10-23 con las respuestas recomendadas. Depende de D-541 (historial del pedido), D-543 y D-544 (precio y lista con vista previa) y D-549 (adjuntos, para el comprobante de pago). Este documento diseña en detalle la **F0, la F1 y la F2**; la **F3 y la F4** quedan a nivel de contrato y gates, y se re-detallan cuando cierre su dependencia. `orders` es un módulo sensible: un cambio a la vez, con diff y aprobación. Solo documento: sin código.

## Context

Verificado en el código el 23-oct, sin leer ni escribir producción. Backend en `backend-aws-security` (`9ab9074d`).

- **La única escritura de pedidos por MCP** es `update_order_status` (`tools/updateOrderStatus.js:73-168`):
  - busca por `nroPedido`, `orderId` o `pedidos[]` (hasta 50) dentro de la empresa;
  - rechaza cancelados (`isCancelledOrder`) y estados finales (`Entregado`, `Rechazado`, `Cerrado`);
  - aplica con `updateOrderInternal(cambio, correo)` (`:28, 150`) **en la primera llamada, sin aprobación**.
- **`updateOrderInternal`** (`controllers/orders.js:3336`):
  - busca el rol por correo **sin filtrar empresa** (`:3387-3400`) y tiene una lista fija de correos que saltan las transiciones (`:3378-3385`);
  - valida transiciones (`:3352-3375`), aplica el guard de Tesorería y el de Kuvo, y recalcula totales **solo si llega `carrito`** (`:3678-3684`);
  - con `_baseVersion` revisa la versión en transacción y lanza `STALE_WRITE` (`:3693-3711`);
  - después: historial de estado (`:3739-3790`), inventario por recompra si sube una cantidad (`:3801-3880`), devoluciones (`:3929-3990`), factura automática al aprobar un pago (`:4000-4110`) y avisos al cliente y al vendedor (`:4113-4150`), salvo `options.skipNotifications`.
- **La ruta `POST /v1/orders/edit`** (`orders.js:5058`) además revisa que el pedido sea de la empresa del token (`services/orders/accesoEdicion.js`) e **invalida el caché de pedidos de la empresa** (`:5073-5078`). `update_order_status` no invalida ese caché.
- **La aprobación del MCP:** `services/mcp/confirmacion.js` firma la huella de los cambios con el valor de antes (vence en 10 min, sin estado, `:59-120`); la pantalla genérica la muestra y aprueba (`apps/confirmar/src/confirmar.js`). `update_product` y `create_support_ticket` la usan.
- **Quién escribe por MCP:** `services/mcp/permisoDeEscritura.js` (familia Administrador o el módulo en el menú; persona única y activa por correo y empresa). `update_order_status` usa `['ventas/pedidos', 'despachos']` (`tools/toolRegistry.js:186`).
- **Dónde viven los datos:**
  - notas: `notasPedido` es un mapa de listas (`notasCliente`, `notasProduccion`, `notasDespachos`, `notasEntregas`, `notasFacturacionPagos`) con `{ nota, fecha, producto, productoId }` (tarea 1.1 de D-541);
  - tarjeta de regalo: `carrito[i].configuracion.tarjetas[] { de, para, mensaje }`;
  - entrega: forma, observaciones, franja y fecha `{day, month, year}` en `carrito[0].configuracion.datosEntrega`; fecha pactada en la raíz `fechaEntrega`; dirección y ciudad en `envio.{ direccionEntrega, ciudad }`; zona y valor del domicilio en `envio.{ zonaCobro, valorZonaCobro }` y `totalEnvio`;
  - asesor: `asesorAsignado.{ name, email }`; facturación: `facturacion.{ … }`.
  - **Tarjeta, observaciones, franja y fecha de `datosEntrega` están dentro de `carrito`:** cambiarlas obliga a mandar `carrito`, y eso recalcula totales.
- **La web pide motivo** solo para devolver un pedido que ya salió (`list.component.ts:7087-7111`, `_motivoRetroceso`). D-541 F2 lo exigirá en precio, descuento, impuestos y anulación de pago.
- **Tesorería:** `POST /v1/treasury/payments/submit` (solo `auth`) registra un pago para revisión; `/payments/direct` y `/payments/:id/review` exigen `TREASURY_ROLES` = Tesorero, Administrador, Super Administrador (`routers/treasury.js:33-45`, `services/treasury/treasuryConstants.js:80`).
- **D-543 y D-544** (en implementación en otra sesión): núcleo **preparar → revisar → confirmar** en `/v1/orders/price-change/{options,preview,confirm}`, con permisos por acción en `roles.permissions` (`ventas.correct_price`, `ventas.change_price_list`), comprobante propio de 10 min y bandera `orderPriceCorrections` / `orderPriceListChanges` (`openspec/changes/corregir-precio-pedido/contracts.md`). Su diseño concluye que el guardado genérico no sirve para cambiar plata.
- **D-541:** su F1 (en curso, `9ab9074d`) registra creación, estados, pagos y eliminación; las «17 opciones» con antes → después (notas, tarjeta, entrega, asesor, facturación…) son su **F2**, todavía sin diseñar. Su tarea 4.3 lleva el contexto (actor y origen) a los llamadores de `updateOrderInternal`, incluido el MCP.

## Decisiones de Daniel (23-oct)

| # | Pregunta | Decisión | Dónde se aplica |
|---|---|---|---|
| 1 | ¿`update_order_status` pide aprobación? | **Sí (F0).** Una sola regla para escribir pedidos desde Claude | D3 |
| 2 | ¿Qué permiso por opción? | **El de la pantalla**; pagos y plata, **permiso por acción** como D-543 | D5 |
| 3 | ¿Motivo obligatorio? | **Donde la web lo exige**; opcional en lo demás | D6 |
| 4 | ¿Bandera? | **Por empresa y por fase** (D-505), ALMARA primero | D9 |

## Goals / Non-Goals

**Goals:**

- Toda escritura de pedidos desde el MCP pasa por propuesta → aprobación de la persona en la tarjeta → aplicación por la operación de la pantalla.
- F0: `update_order_status` con aprobación y una consulta de «qué puedo editar».
- F1: notas, observaciones de entrega y tarjeta de regalo, sin mover plata ni inventario.
- F2: entrega, contacto de quien recibe, asesor y facturación de un pedido no facturado, sin mover plata.
- Historial D-541 con la persona, origen «Claude/MCP», antes → después y motivo.

**Non-Goals:**

- Cambiar reglas o validaciones de la pantalla.
- Ediciones en lote (salvo lo que ya hace `update_order_status`, ver Open Questions 1), eliminar, duplicar, facturar, POS, pedidos cancelados o en estado final, caja o Kuvo cerrados.
- Escrituras desde el chat integrado de Opttia (`servicekey`).
- Arreglar la búsqueda de rol sin empresa o los correos fijos de `updateOrderInternal` (anotados en Riesgos).

## Decisions

### D1. Cómo funciona cada edición

1. **Propuesta.** La herramienta lee el pedido fresco, revisa bloqueos, permisos y bandera, arma `cambios` (`{ campo, etiqueta, antes, despues }`) y `efectos`, y devuelve `propuestaPendiente` (`confirmacion.js:126`). **Cero escrituras**, cero avisos.
2. **Aprobación.** La persona aprueba en la tarjeta. La tarjeta vuelve a llamar la herramienta con los mismos `argumentos`, el `comprobante` y, si aplica, el `motivo` que escribió.
3. **Aplicación.** La herramienta vuelve a leer, recalcula `cambios` desde el pedido fresco y llama `verificarComprobante` con la misma lista. Si cuadra, aplica **solo los campos aprobados** por la operación de la pantalla.
4. **Historial.** El contexto de D-541 (`options.contexto`, tarea 4.3 de D-541) lleva la persona, el origen `mcp` y el motivo.

**Concurrencia.** Dos candados:

- la huella cubre el valor de antes de cada campo que cambia (si alguien lo tocó, `el_dato_cambio`);
- `argumentos.version` lleva el `date_upd` leído en la propuesta y se pasa como `_baseVersion`; `updateOrderInternal` rechaza con `STALE_WRITE` si otra persona guardó el pedido entre la propuesta y la aprobación. La tarjeta dice «El pedido cambió mientras lo revisabas. Pídelo de nuevo para ver cómo quedó».
- Límite conocido: un escritor que no actualiza `date_upd` no se detecta (lo anota D-543). En F1 y F2 se acepta porque no hay plata; la F4 usa el candado de D-543 (`updateTime`).

**Reintento.** La misma aprobación dos veces: la segunda encuentra el valor ya aplicado, la huella no cuadra y la respuesta es «Ese cambio ya estaba aplicado» con éxito, sin escribir.

### D2. Módulo único: `functions/services/mcp/pedidos/`

```
opciones.js     catálogo cerrado de opciones: fase, bandera, módulos del menú, permiso por acción,
                motivo (requerido u opcional), campos y operación que aplica
resolver.js     pedido por nroPedido u orderId dentro de la empresa; ajeno = «no encontrado»
bloqueos.js     cancelado, estado final, POS, caja o Kuvo cerrados, facturado (para facturación)
identidad.js    persona de la credencial: solo `oauth` con correo; servicekey y apikey no editan
propuesta.js    cambios, efectos y comprobante
sinDinero.js    guard: el cambio no mueve totales (D4)
aplicar.js      updateOrderInternal con parche mínimo, `_baseVersion`, contexto D-541 e invalidación
                del caché de pedidos, como la ruta de la pantalla
log.js          registro estructurado con lista cerrada de campos
```

Las herramientas son delgadas: validan entrada y llaman al módulo.

### D3. Herramientas

Cuatro herramientas nuevas y una cambiada, para no confundir al modelo con una por opción:

| Herramienta | Tipo | Fase | Qué hace |
|---|---|---|---|
| `update_order_status` | escritura | F0 | La de hoy, con propuesta y aprobación (ver abajo) |
| `get_order_edit_options` | lectura | F0 | Para un pedido: qué opciones están disponibles para esta persona y esta empresa, cuáles no y por qué («tu rol no puede registrar pagos», «el pedido ya se entregó», «aún no está activo para tu empresa») |
| `edit_order` | escritura, módulo `['ventas/pedidos']` | F1, F2 | `opcion` ∈ `nota`, `observaciones_entrega`, `tarjeta_regalo` (F1); `entrega`, `contacto_recibe`, `asesor`, `facturacion` (F2), con un objeto tipado por opción |
| `record_order_payment` | escritura | F3 | `accion` ∈ `registrar`, `anular` |
| `change_order_price` | escritura | F4 | `kind` ∈ `linePrice`, `priceList`, envoltura del núcleo D-543/D-544 |

Todas declaran `uiResource: CONFIRMAR_CAMBIO`.

**`update_order_status` en la F0** (con la bandera `mcpOrderStatusApproval` de la empresa encendida):

- La primera llamada devuelve la propuesta: una fila por pedido aprobable (`{ campo: "estadoProceso@{orderId}", etiqueta: "Pedido DAD-014573", antes: "EnProduccion", despues: "Empacado" }`) y, si es `Rechazado` con `observaciones`, la fila del motivo del rechazo. Los no aprobables van en `advertencias` con su razón.
- La aprobación aplica pedido por pedido como hoy, con el contexto D-541 y la invalidación del caché.
- Lote de hasta 50 en **una** tarjeta, ver Open Questions 1.
- Con la bandera apagada, se comporta exactamente como hoy. Al encenderla para todas las empresas, la rama vieja se borra (retiro de la bandera).

### D4. Sin plata ni inventario en F1 y F2

- **Opciones que no tocan `carrito`** (nota, asesor, facturación, dirección, ciudad, contacto, `fechaEntrega` de la raíz): el parche lleva solo esos campos. Sin `carrito`, `updateOrderInternal` no recalcula ni descuenta inventario.
- **Opciones que tocan `carrito`** (tarjeta de regalo, observaciones, franja y fecha dentro de `datosEntrega`): se manda el `carrito` **fresco** con solo ese cambio. Antes de proponer y otra vez antes de aplicar, `sinDinero.js`:
  1. corre `calculateOrderTotals` sobre una copia con el carrito nuevo (sin escribir);
  2. compara `subtotal`, `totalImpuesto`, `totalDescuento`, `totalEnvio`, `totalPedididoConDescuento`, `anticipo` y `faltaPorPagar` con lo guardado;
  3. si alguno cambia, **no ofrece aprobar**: «Al guardar este cambio, Katuq recalcularía el valor del pedido. Hazlo desde Katuq para revisarlo.»
  - Las cantidades no cambian, así que el inventario por recompra no se dispara (`orders.js:3836` calcula el delta por cantidad).
- **Pedidos con acuerdo de precio de D-543** (`pricingAgreement`): las opciones que tocan `carrito` se bloquean hasta que D-543 publique la protección del guardado genérico (su tarea T-18); entonces se levanta el bloqueo en una tarea aparte.
- **Ciudad o dirección que cambia el domicilio** (F2): se resuelve la zona con el mismo servicio que usa la pantalla (se ubica en la tarea 1.3). Si `valorZonaCobro` o `totalEnvio` cambiarían, no se ofrece aprobar.
- **Avisos al cliente:** la propuesta dice si el cambio dispara un aviso, con el mismo detector que usa `updateOrderInternal` (`claimDirectNotifEvents` / `detectSellerNotification`, verificado en la tarea 1.4). No se agrega `skipNotifications`: el comportamiento es el de la pantalla.

### D5. Permisos

- **Persona identificada:** solo credenciales `oauth` con correo (Claude, Codex). `servicekey` (Opttia) y `apikey` (llave de empresa) reciben «Los pedidos se editan con tu usuario de Katuq conectado a Claude». La persona se resuelve como hoy (`permisoDeEscritura.puedeEscribir`): única, activa y del mismo rol.
- **Por opción, el de la pantalla:**
  - F1 y F2: el menú `ventas/pedidos` o la familia Administrador. Si la tarea 1.2 encuentra que la pantalla restringe alguna opción por rol (por ejemplo, cambiar el asesor), se replica esa misma regla.
  - F3 con Tesorería: registrar = la regla de `/payments/submit`; anular = `TREASURY_ROLES`.
  - F3 sin Tesorería y F4: permiso por acción en el mapa `roles.permissions` de D-543: `ventas.register_payment` y `ventas.void_payment` (nuevos, excluidos de la concesión automática igual que los de D-543), `ventas.correct_price` y `ventas.change_price_list` (los de D-543 y D-544).
- **Nunca «tiene el menú, puede todo»:** `get_order_edit_options` y cada propuesta dicen exactamente qué falta.
- **La empresa y la persona salen de la credencial, nunca de `args` (F2, asesor):** el asesor propuesto se busca en `users` filtrando por la empresa de la credencial (`mcpCompany`) con **`empresa || company`, `empresa` primero** (la colección tiene los dos campos y `company` está mal en 24 de 124 usuarios), y el correo cuenta sin mayúsculas. El rol «administrador» se pregunta por **quien actúa** (`mcpUserEmail`) en su empresa, no por el asesor propuesto. La bandera de la fase se lee con `mcpCompany`. La prueba `editOrder.f2.contract.test.js` lo fija con un usuario de otra empresa con el mismo correo y un administrador ajeno; la búsqueda real (7.3) necesita su propia prueba con un usuario cuyo `empresa` difiere de `company`.

### D6. Motivo

| Opción | Motivo |
|---|---|
| Estado (F0), notas, observaciones, tarjeta (F1), entrega, contacto, asesor, facturación (F2), registrar pago (F3) | Opcional |
| Anular pago (F3), precio, lista (F4), cambiar cliente (después de la F4) | **Obligatorio** |

- La propuesta trae `motivo: { requerido, etiqueta, max: 500 }`. La tarjeta muestra el campo y, si es obligatorio, no deja aprobar vacío.
- El motivo no entra en la huella: lo escribe la persona en la tarjeta después de la propuesta.
- En el evento D-541: `reason` y `reasonStatus` = `given` o `not_required`. Esto actualiza la decisión 4 de D-541 para el MCP: con la tarjeta, el MCP ya no registra «sin motivo».

### D7. La tarjeta

Se amplía la genérica `apps/confirmar/` sin cambiar su contrato:

- bloque opcional de **motivo** (textarea, contador, «Escribe por qué» si es obligatorio);
- bloque opcional de **efectos** («Total: no cambia», «Saldo: no cambia», «Se avisará al cliente por correo»);
- sin `motivo` ni `efectos` en la propuesta, se ve exactamente como hoy (`update_product`, tickets).
- CSP sin cambios (`connectDomains: []`).
- La forma de pintar la propuesta se extrae a `apps/_comun/propuesta.js` para compartirla con la tarjeta de soporte de D-549 (la tarea la hace quien llegue primero).
- Compilada y versionada (`build.js`); `build.js --check` en verde.

### D8. Historial (D-541)

- **F0:** el cambio de estado ya lo registra D-541 F1 (`process_status_changed`), ahora con el contexto del MCP.
- **F1 y F2:** necesitan que el catálogo cerrado de D-541 tenga los campos y tipos de estas opciones (nota agregada o editada, tarjeta, observaciones, entrega, contacto, asesor, facturación). Son de la F2 de D-541.
  - Si la F2 de D-541 no está lista cuando arranque la F1 de D-550, se agregan **solo esas entradas** al catálogo (`constantes.js` y `etiquetas.js` de `services/orders/historialPedido/`) en una tarea coordinada con el dueño de D-541 y con su aprobación.
  - **Gate:** ninguna opción se enciende sin que su evento quede en el historial (prueba de flujo en el emulador).
- Una propuesta rechazada, vencida o cancelada no deja evento.

### D9. Banderas (D-505)

| Bandera (`companies.featureFlags`) | Fase | Además exige |
|---|---|---|
| `mcpOrderStatusApproval` | F0 | — |
| `mcpOrderEditNotes` | F1 | `orderHistoryLog` encendida |
| `mcpOrderEditDelivery` | F2 | `orderHistoryLog` y `mcpOrderEditNotes` |
| `mcpOrderEditPayments` | F3 | lo anterior y D-549 encendido |
| `mcpOrderEditPrices` | F4 | lo anterior y `orderPriceCorrections` / `orderPriceListChanges` |

- **Corte general:** `config/feature_flags.mcpOrderEdit === false` apaga F1 a F4 para todos (no apaga la aprobación de la F0, que nunca vuelve a escribir sin tarjeta).
- Dueño Daniel. Retiro 2027-04-30 (Artículo XII): cada una encendida para todos o eliminada. Primero FLORECER, luego ALMARA, fase por fase.

### D10. Datos personales y logs

- `log.js`: `mcp.pedido.{propuesta, aplicado, rechazado}` con `{ company, orderId, opcion, resultado, codigo, duracionMs }`. Nunca dirección, teléfono, nombre, mensaje de la tarjeta, motivo ni montos.
- La propuesta muestra en la tarjeta los datos que la persona ya puede ver en Katuq; no se agrega ningún dato que la pantalla no muestre.

### D11. F3 y F4 a nivel de contrato (se re-detallan antes de implementar)

- **F3, pagos.**
  - **Gate de diseño:** la tarea 9.1 traza «Gestión de pagos» (`asentarpagomanual.component.ts:319, 674, 746`) y decide si el saldo, el estado de pago y la cartera los calcula el servidor. Si dependen del cálculo del navegador, **la F3 se detiene** hasta tener una operación de servidor para registrar un pago (cambio aparte con spec), en vez de copiar ese cálculo en el MCP.
  - **Con Tesorería:** registrar por el mismo servicio de `/payments/submit` (queda pendiente de revisión, como en la pantalla); anular solo `TREASURY_ROLES`, por el servicio de revisión.
  - **Comprobante:** se adjunta con la sesión de adjuntos de D-549, ligada al pedido en vez del ticket.
  - **Efectos** en la propuesta: saldo antes → después, estado de pago, factura automática si la empresa la tiene al aprobar el pago (`orders.js:4000-4110`) y avisos.
- **F4, plata y productos.**
  - `change_order_price` llama los servicios de preparar y confirmar de D-543 y D-544, **no** sus rutas HTTP. La propuesta es su vista previa (líneas, total, pagos, saldo); `cambios` incluye una fila con el digest de la vista previa, así el comprobante del MCP queda atado a ella; al aprobar se confirma con su `operationId` y `previewToken`.
  - **Identidad:** el módulo de acceso de D-543 resuelve al usuario desde el JWT; el MCP necesita un adaptador por correo y empresa (persona única), coordinado con el dueño de D-543 y sin editar su carpeta de OpenSpec.
  - Agregar o quitar productos, cantidades, descuentos, impuestos y cambiar el cliente se habilitan solo cuando la pantalla tenga su propia vista previa y confirmación. Hasta entonces, `get_order_edit_options` dice «Se hace desde Katuq».

## Contratos

| Herramienta | Entrada | Propuesta | Aplicación |
|---|---|---|---|
| `update_order_status` | `nroPedido` / `orderId` / `pedidos[]`, `newStatus`, `observaciones?`, `comprobante?`, `motivo?` | `cambios` por pedido, `advertencias` con los no aprobables | `{ actualizados, fallidos, pedidos[], errores[] }` como hoy |
| `get_order_edit_options` | `nroPedido` / `orderId` | — | `{ pedido, opciones: [{ id, disponible, razon, motivo }] }` |
| `edit_order` | `nroPedido` / `orderId`, `opcion`, un objeto por opción (`nota { lista, texto, indice? }`, `tarjeta { linea, indice, de, para, mensaje }`, `entrega { direccion, ciudad, fecha, franja }`, `contacto { nombre, telefono }`, `asesor { email }`, `facturacion { … }`), `comprobante?`, `motivo?`, `version?` | `cambios`, `efectos`, `motivo`, `argumentos` (con `version`) | `{ success, mensaje, pedido: { nroPedido }, cambios }` |

**Errores** (español de negocio, sin códigos internos): «no encontramos ese pedido» (también si es de otra empresa), «tu rol no puede…», «ese pedido ya se entregó: se revisa desde Katuq», «al guardar cambiaría el valor del pedido», «el pedido cambió mientras lo revisabas», «aún no está activo para tu empresa».

## Pruebas

| Repo | Archivo | Qué fija |
|---|---|---|
| Back | `tests/mcp/pedidos/updateOrderStatus.aprobacion.contract.test.js` | Bandera encendida: la primera llamada no escribe; aprobación aplica; pedido movido entre propuesta y aprobación = rechazo; reintento = «ya aplicado»; bandera apagada = comportamiento de hoy, idéntico |
| Back | `tests/mcp/pedidos/opciones.test.js` | `get_order_edit_options`: matriz de rol × opción × bandera × estado del pedido; solo lectura |
| Back | `tests/mcp/pedidos/editOrder.f1.contract.test.js` | Nota, observaciones y tarjeta: propuesta sin escrituras; parche mínimo; guard sin plata (un pedido con total guardado de $1 se bloquea); `_baseVersion`; pedido con `pricingAgreement` bloqueado; `servicekey` y `apikey` no editan |
| Back | `tests/mcp/pedidos/editOrder.f2.contract.test.js` | Entrega con cambio de domicilio bloqueada; facturación de pedido facturado bloqueada; asesor con la regla de la pantalla |
| Back | `tests/mcp/pedidos/writeset.contract.test.js` | Con una base falsa: solo `orders.update` (por `updateOrderInternal`) y los eventos D-541; nunca `products`, `inventory`, `inventoryMovement`, precios ni listas; F1 y F2 no llaman `inventoryService` |
| Back | `tests/mcp/pedidos/historial.emulator.test.js` | En el emulador: cada opción aplicada deja su evento D-541 con origen `mcp`, persona, antes → después y motivo; propuesta cancelada no deja evento |
| Back | `tests/mcp/confirmarTarjeta.test.js` + `build.js --check` | Motivo y efectos opcionales; sin ellos, la tarjeta igual que hoy |
| Back | Regresión | `tests/mcp/*`, `retrocesoManual.contract`, `editBatchSinCamposDePago`, suites de Tesorería y de D-541 |

## Risks / Trade-offs

- **Módulo sensible.** Un cambio a la vez, banderas por fase, guard sin plata y pruebas de write-set.
- **`updateOrderInternal` busca el rol por correo sin empresa** y tiene correos fijos que saltan transiciones. El MCP hereda ese comportamiento «igual que la pantalla»; queda anotado para un cambio aparte (también lo anota D-541).
- **El comprobante lo ve el modelo** (contrato de hoy). La tarjeta es la única que manda el motivo y la aprobación; la huella y la versión impiden aplicar algo distinto a lo propuesto.
- **Cambio de costumbre (F0):** quien hoy cambia estados por Claude sin tarjeta pasará a aprobarlos. Se avisa en la descripción de la herramienta y se enciende por empresa.
- **Dependencias abiertas:** F1/F2 dependen del catálogo de D-541 F2; F3 de D-549 y de la tarea 9.1; F4 de D-543/D-544 publicados y estables. Ninguna fase se adelanta.
- **Caché de pedidos:** se invalida como en la ruta de la pantalla; si Redis no está, no pasa nada.

## Migration Plan

1. **F0:** backend con `mcpOrderStatusApproval` apagada en todas partes. Commit, push y despliegue. FLORECER encendida; luego ALMARA (OK de Daniel). Observación de 5 días hábiles.
2. **F1:** con D-541 F1 enganchada y `orderHistoryLog` encendida en la empresa. Mismo orden: apagada en todas partes, FLORECER, ALMARA.
3. **F2:** igual, después de la F1 estable.
4. **F3 y F4:** se diseñan en detalle al cerrar sus dependencias.
5. **Revertir:** bandera de la fase en la empresa, o el corte general para F1-F4. Los cambios ya aplicados son ediciones normales del pedido con su evento.
6. **Retiro (2027-04-30):** cada bandera encendida para todos o eliminada.

## Open Questions

> **Respondidas por Daniel el 2026-10-23 con las recomendadas:** (1) el lote de hasta 50 pedidos se conserva en UNA tarjeta; (2) se crean los permisos `ventas.register_payment` y `ventas.void_payment` (se implementan en la F3).

1. **`update_order_status` hoy cambia hasta 50 pedidos de una vez.** La spec dice que el MCP no edita varios pedidos a la vez. Recomendado: **conservar el lote de hasta 50 en una sola tarjeta** que lista cada pedido con su antes → después, porque ya existe y lo usan los despachos; la regla de «un pedido por aprobación» aplica a las opciones nuevas (`edit_order`, pagos, plata). Alternativa: un pedido por tarjeta también en la F0.
2. **Permisos nuevos de pagos sin Tesorería** (`ventas.register_payment` y `ventas.void_payment` en el mapa de D-543). ¿De acuerdo con crearlos, o se reutiliza la regla de Tesorería (Tesorero y familia Administrador) también para las empresas sin Tesorería?

## Desvíos de la implementación, F0 (23-oct)

**Qué se hizo.** Backend `katuq_admin_back_firebase/functions`, sin commit ni despliegue. `update_order_status` con la bandera `mcpOrderStatusApproval` propone y aplica con la aprobación en la tarjeta; `get_order_edit_options` (lectura); tarjeta con efectos y motivo. Detalle por tarea en `tasks.md`.

- **Archivos nuevos:** `services/mcp/pedidos/{banderas,bloqueos,identidad,log,opciones,propuesta,resolver,aplicar}.js`, `tools/getOrderEditOptions.js`, `services/mcp/apps/_comun/propuesta.js` y 5 pruebas (`tests/mcp/pedidos/{updateOrderStatus.aprobacion.contract,opciones,modulo}.test.js`, `tests/mcp/confirmarTarjeta.test.js`).
- **Archivos tocados:** `tools/updateOrderStatus.js`, `tools/toolRegistry.js` (2 líneas de registro de D-550; el archivo también trae hunks de D-549 de otra sesión: al commitear, `git add -p` solo los de D-550, ver tarea 3.5), `services/mcp/apps/confirmar/{src/confirmar.html,src/confirmar.css,src/confirmar.js,dist/confirmar.html}`. No se tocó `controllers/orders.js`: F0 no lo necesita.
- **Sin `_baseVersion` en F0.** La huella del comprobante ya lleva el estado de antes de cada pedido; si otra persona lo movió, `el_dato_cambio` y se propone de nuevo. `_baseVersion` entra con la F1.
- **Lote:** una huella para todo el lote. Si UN pedido cambió entre la propuesta y la aprobación, no se aplica NINGUNO y se muestra la propuesta nueva (más simple y más seguro que aplicar a medias).
- **Reintento:** la misma aprobación dos veces encuentra todos los pedidos ya en el estado nuevo: responde `ya_aplicado` con éxito y sin escribir. No exige comprobante válido porque no escribe nada. Vale también para los estados finales (Entregado, Rechazado, Cerrado) y para un pedido cancelado que ya está en el estado pedido: el bloqueo de «final» conserva su texto, pero si el pedido ya está en `newStatus` y llegó un `comprobante`, la respuesta es `ya_aplicado` (revisión de 23-oct; cubierto en 2.1).
- **DESVÍO de la spec, requisito «Aprobación de la persona»: el modelo SÍ puede aprobar.** La spec dice «La aprobación SHALL quedar ligada a la persona, la empresa, el pedido y el contenido exacto» y «El modelo SHALL NOT poder aprobar». F0 no lo cumple por completo: `comprobante` es un parámetro del `inputSchema` que el modelo puede enviar, y la propuesta le devuelve el comprobante en el mismo resultado que lee. `verificarComprobante` (`services/mcp/confirmacion.js`) comprueba empresa, herramienta, contenido exacto (huella con el antes de cada pedido) y vencimiento de 10 minutos, pero **no** la persona (el comprobante no la lleva). Es el contrato de confirmación que ya usan las otras herramientas de escritura del MCP, y es la limitación anotada en Riesgos. Atar el comprobante a la persona no la cierra: el modelo seguiría leyéndolo. Lo que sí la cierra es que el comprobante solo viaje a la tarjeta, sin pasar por el modelo, y eso es un cambio del puente de pantallas del MCP, fuera de F0. **Decisión pendiente de Daniel antes de encender 4.2:** (a) aceptar la limitación para F0, con la descripción de la herramienta que ya le dice al modelo que no la invente, o (b) abrir un cambio aparte para que el comprobante no pase por el modelo. Hasta que decida, el requisito NO se da por cumplido (tareas 2.1 y 3.4 lo anotan).
- **Solo personas con la bandera:** con la bandera encendida, una llave de empresa (`apikey`) o la de Opttia (`servicekey`) reciben «sin persona» y no cambian estados (decisión D5). **Riesgo a validar con Daniel antes de encender una empresa que use a Opttia para mover estados desde su chat:** esa vía deja de funcionar en esa empresa. Las propuestas de Opttia en la escena (despachos, producción) no pasan por esta herramienta.
- **`updateOrderInternal` recibe `{ contexto, motivo }` como tercer argumento**, también sin la bandera. Hoy lo ignora; con el enganche 4.3 de D-541 el historial mostrará «Claude/MCP» con la persona. Eso hace pasar el caso U2 del contrato de D-541. El motivo debe leerlo D-541 (`reason`/`reasonStatus`).
- **Caché de pedidos:** con la bandera se invalida una vez por lote, como la ruta de la pantalla; sin ella no, como hoy.
- **La tarjeta** muestra como éxito cualquier resultado `success: true` que no sea propuesta (antes lo mostraba como error). Sin esto, `update_order_status` sin bandera se vería en rojo.
- **Pregunta nueva para Daniel (tarea 1.2):** la pantalla solo deja cambiar el estado de proceso a Administradores (y a 5 correos fijos). El MCP hoy lo deja a quien tenga `ventas/pedidos` o `despachos` en el menú, con las transiciones validadas por el servidor. La F0 no lo cambia (sería ampliar el alcance de lo aprobado). ¿Se deja como está o se restringe el MCP a la regla de la pantalla?
- **Pregunta nueva para Daniel (tarea 1.3):** zona y domicilio los resuelve el navegador, no el servidor. Para la F2, ¿se acepta la regla simple «una ciudad nueva solo si la zona guardada la cubre»?

**Lo que falta para encender F0** (nada de esto se hizo en esta sesión):

1. Catálogo de banderas, `services/companyFeatureFlags.js` (otra sesión), dentro de `FEATURE_FLAG_NAMES`:
   ```js
   // Cambiar el estado de un pedido desde Claude pide la aprobación de la persona en la tarjeta
   // (D-550, ticket 1333, F0). Apagada, update_order_status cambia el estado en la primera llamada
   // como hoy. No nace encendida para empresas nuevas: primero FLORECER, luego ALMARA FELICIDAD.
   // Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada (Artículo XII).
   "mcpOrderStatusApproval",
   ```
   Y el mismo nombre en el arreglo del front (`company-features.service.ts`), como pide ese archivo, más su prueba de banderas.
2. `package.json`, script (otra sesión):
   ```json
   "test:mcp-pedidos": "node tests/mcp/pedidos/updateOrderStatus.aprobacion.contract.test.js && node tests/mcp/pedidos/opciones.test.js && node tests/mcp/pedidos/modulo.test.js && node tests/mcp/confirmarTarjeta.test.js && node services/mcp/apps/build.js --check"
   ```
3. Bitácora de D-550 en `specs/CONTRACT.md` (tarea 0.4), revisando `origin` antes.
4. Diff aprobado por Daniel, commit, push y despliegue con la bandera apagada (4.1); luego FLORECER (4.2) y ALMARA (4.3).

## Desvíos de la implementación, F1 (23-oct)

**Qué se hizo.** Backend `katuq_admin_back_firebase/functions`, en el árbol de trabajo, sin commit ni despliegue y sin tocar `controllers/orders.js`. `edit_order` con las opciones `nota`, `observaciones_entrega` y `tarjeta_regalo`, detrás de `mcpOrderEditNotes` (todavía fuera del catálogo de banderas, así que apagada para todos), el historial `orderHistoryLog` y el corte general `config/feature_flags.mcpOrderEdit`. Archivos nuevos: `tools/editOrder.js`, `services/mcp/pedidos/{edicion,sinDinero}.js`; tocados: `services/mcp/pedidos/{aplicar,banderas,bloqueos,opciones}.js` y `tools/toolRegistry.js` (3 líneas). Pruebas: `tests/mcp/pedidos/{editOrder.f1.contract,modulo.f1,writeset.contract,historial.emulator}.test.js` y `_fixturesF1.js`.

- **El parche con carrito no es «solo el carrito» (corrige D4).** `updateOrderInternal` recalcula los totales sobre el parche que recibe, no sobre el pedido guardado (`controllers/orders.js:3678-3684`): con `{ _id, carrito }` solo, el envío, los descuentos y el anticipo se calcularían en cero y el guard bloquearía todo pedido con domicilio. El parche de tarjeta y observaciones lleva además, **sin cambiarlos**, los datos con los que se recalcula (`CAMPOS_DE_CALCULO`: `nroPedido, cliente, envio, formaEntrega, totalEnvio, porceDescuento, totalDescuento, descuentoAplicado, PagosAsentados, anticipo, fechaCreacion, fecha`). El guard corre el cálculo sobre **ese mismo parche** (copia), así que lo que simula es lo que se escribirá. Las notas no tocan `carrito` y llevan solo `notasPedido`.
- **El guard también mira Tesorería en las tres opciones.** Con Tesorería, `updateOrderInternal` reescribe `anticipo` y `faltaPorPagar` en cualquier edición (`:3557-3580`). Si lo guardado no coincide con la suma de pagos aprobados, no se ofrece aprobar (ni siquiera una nota): lo reescribiría. Es lo que haría la pantalla; aquí se avisa en vez de moverlo en silencio.
- **Lo que no se puede verificar no se aprueba.** Un cálculo que lanza o una consulta de Tesorería que falla dan «no pudimos comprobar que deje el valor igual». También: si la lectura de la bandera de fase falla, queda apagada; si el corte general no se puede leer, cuenta como puesto.
- **Revisión del 23-oct: la aprobación queda ligada al pedido y a la persona.** La huella de `confirmacion.js` solo firma `{campo, antes, despues}` y los campos de F1 no nombraban el pedido: el comprobante emitido para el pedido A valía en el B si ambos tenían el mismo antes y después (reproducido con un script). Ahora `edit_order` firma cada campo como `<campo>@<idPedido>#<marca de la persona>` (`edicion.atarAlPedido`; la marca es un hash corto del correo, `confirmacion.marcaDe`, nunca el correo), igual que F0 con `estadoProceso@{docId}`. Pruebas: el comprobante de un pedido no aplica a otro, ni lo que aprueba otra persona.
- **Revisión del 23-oct: la versión es obligatoria con comprobante.** Si el pedido tiene `date_upd`, una aprobación sin `version` o con una distinta a la del pedido no se aplica y se propone de nuevo; así el `_baseVersion` del parche es el de la propuesta.
- **Revisión del 23-oct: lo que reescribe `carrito` exige un pedido con `date_upd`.** `updateOrderInternal` solo toma el candado si llega `_baseVersion`, y esa versión solo existe si el pedido ya se guardó por las rutas de edición. Sin ella, observaciones y tarjeta (que copian `PagosAsentados`, `anticipo`, descuentos, leídos al inicio de la llamada) podían pisar un pago o descuento entrante sin 409. Ahora se responde «se hace desde Katuq» ANTES de proponer (`sin_version`). Costo: un pedido que nunca se ha editado desde la pantalla no admite estas dos opciones; las notas siguen funcionando (solo reemplazan su lista). **Pendiente para Daniel:** medir en producción, solo lectura, qué fracción de los pedidos activos no tiene `date_upd`; si es grande, la alternativa es un cambio aparte en `updateOrderInternal` (transacción que compare contra el documento fresco), que es módulo sensible.
- **Revisión del 23-oct: el inventario sí se comprueba, y la tarjeta ya no lo afirma sin saberlo.** `updateOrderInternal` corre `executeOrderInventoryRollout` en cada guardado; con el inventario en modo transaccional reconcilia `inventoryEffect` contra lo que el pedido debe tener y, si está desfasado, mueve stock aunque solo se haya cambiado una nota. Nuevo guard de solo lectura (`services/mcp/pedidos/inventario.js`): decide el modo igual que `updateOrderInternal` y, si es transaccional, pide la vista previa de la reconciliación; si no es `none`, o no se puede comprobar, no se ofrece aprobar (`inventario_desfasado` / `no_se_pudo_verificar`), en la propuesta y otra vez al aplicar. En modo legacy o sombra el efecto es el delta de cantidades, que F1 deja en cero. El texto de la tarjeta pasó de «el inventario no cambia» a «las cantidades no cambian, así que no se mueve inventario». **Sigue pendiente:** una prueba que ejecute el `updateOrderInternal` real (emulador de Firestore) y registre las escrituras de `inventory`/`inventoryMovement` por cada opción en los dos modos; las pruebas de F1 usan dobles y no la cubren.
- **DESVÍO de la spec, requisito «El modelo SHALL NOT poder aprobar»: `edit_order` hereda el hueco de F0.** `comprobante`, `motivo` y `version` son parámetros del `inputSchema` y la propuesta le devuelve el comprobante al modelo: el modelo puede reenviarlo, aplicar la edición sin que la persona apruebe y escribir el `motivo` que queda en el historial a nombre de ella. Atar el comprobante al pedido y a la persona (arriba) no lo cierra. Es la misma decisión pendiente de Daniel de «Desvíos, F0» (opción a: aceptar con la descripción que le dice al modelo que no la invente; opción b: cambio aparte para que el comprobante y el motivo viajen solo de la tarjeta al servidor, sin pasar por el modelo). **La tarea 6.5 no se cierra, ni se enciende `mcpOrderEditNotes` para ninguna empresa, hasta que Daniel decida.** Los casos de 5.1 no cubren este requisito porque hoy no se cumple.
- **Notas de producción fuera de F1.** Van por producto (`notasProduccion` con `producto` y `productoId`) y la pantalla las deshabilita en algunos estados; se dice «se hacen desde Katuq». F1 cubre las listas de cliente, despacho, entrega y facturación y pagos.
- **Editar el texto de una nota no es una operación de la pantalla.** La pantalla agrega y elimina notas; el contrato del diseño pide agregar y editar (`indice`), y así quedó. Eliminar no se ofrece. La pantalla guarda notas mandando también el `carrito`; el MCP no, para no recalcular nada.
- **Agregar una nota: el reintento.** La huella lleva cuántas notas había; tras aplicarse, la misma aprobación ya no cuadra y se reconoce porque la última nota es la pedida y se escribió dentro de la ventana de 10 minutos (`ya_aplicado`, sin escribir). Una nota igual agregada a propósito después pide su propia propuesta y se aplica.
- **Posiciones desde 1.** `linea`, `indice` de nota y de tarjeta cuentan desde 1 (lo que ve la persona). Sin `linea`: observaciones se aplican a todas las líneas si dicen lo mismo y, si difieren, se pide cuál; la tarjeta se deduce si solo una línea la tiene. `indice` = cantidad + 1 agrega una tarjeta nueva.
- **Versión doble.** `argumentos.version` lleva el `date_upd` de la propuesta: si cambió al aprobar, no se aplica y se propone de nuevo (aunque la huella cuadre, por si se tocó otro campo). Además `_baseVersion` va en el parche, así que si el pedido cambia en el instante de guardar, `updateOrderInternal` lanza `STALE_WRITE` y no se escribe.
- **Permiso por opción.** La puerta única del registro ya exige el menú `ventas/pedidos` (o la familia Administrador) a la persona, igual que con `update_order_status`; la herramienta no repite esa consulta. F1 no tiene opciones solo para administradores (el asesor es F2).
- **Sin campo de «caja cerrada».** La spec dice que un pedido con caja cerrada no se edita; no se encontró en el código qué campo lo marca. La tarea 1.1 (lectura de pedidos reales) debe confirmarlo. Hasta entonces F1 bloquea cancelado, final, POS, sin productos, Kuvo y, para lo que toca `carrito`, congelado (EnProduccion a Despachado) y acuerdo de precio.
- **Heredado de la pantalla, no nuevo.** `updateOrderInternal` corre `executeOrderInventoryRollout` en **cada** edición (también la de una nota). F1 no cambia cantidades (probado), así que no hay delta de recompra; si la empresa está en el modo transaccional del inventario, el efecto es el mismo que ya tiene guardar notas en la pantalla.
- **Historial D-541: falta el catálogo (6.1, gate).** `eventoDeGuardado` devuelve `null` si solo cambian notas, observaciones o tarjeta: sin esos tipos no queda evento, y D8 prohíbe encender una opción sin su evento. Propuesta verificada en copia aparte (4 tipos, 8 campos, `diferenciaDeEdicion`, motivo de la tarjeta); necesita la aprobación del dueño de D-541. Sin ella, F1 queda construida y apagada.
- **`edit_order` no entra al catálogo de Opttia.** `opttiaAccessPolicy` es cerrado y no la lista; además la herramienta exige una persona (OAuth con correo).

**Lo que falta para encender F1** (nada de esto se hizo):

1. 6.1: catálogo de D-541 (aprobación del dueño de D-541).
2. `services/companyFeatureFlags.js`, dentro de `FEATURE_FLAG_NAMES`, y su prueba `tests/companies/companyFeatureFlags.test.js`:
   ```js
   // Editar notas, observaciones de entrega y tarjeta de regalo de un pedido desde Claude, con la
   // aprobación de la persona en la tarjeta (D-550, ticket 1333, F1). Exige también `orderHistoryLog`.
   // Apagada, edit_order responde «aún no está activa para tu empresa». Corte general:
   // `config/feature_flags.mcpOrderEdit` (false = apaga F1 a F4 para todos). Primero FLORECER, luego
   // ALMARA FELICIDAD. Dueño: Daniel. Se retira el 2027-04-30 (Artículo XII).
   "mcpOrderEditNotes",
   ```
3. `package.json`, `test:mcp-pedidos`: sumar `tests/mcp/pedidos/modulo.f1.test.js tests/mcp/pedidos/editOrder.f1.contract.test.js tests/mcp/pedidos/writeset.contract.test.js` (y `historial.emulator.test.js` cuando pase la 6.1).
4. 1.1 (nombres de campo en pedidos reales de ALMARA) y 0.4 (bitácora en `specs/CONTRACT.md`).
5. Diff aprobado por Daniel, commit (con `git add -p` en `tools/toolRegistry.js`: solo las 3 líneas de `edit_order`), push y despliegue con la bandera apagada; luego FLORECER y ALMARA (6.6).

## Desvíos de la implementación, F2 (26-oct): pruebas y catálogo del historial, SIN código de la herramienta

**Qué hay.** Solo pruebas en rojo (tarea 7.1) y el catálogo de D-541 (7.2, en el árbol sin commit). La herramienta (7.3) no se escribió: depende de que Daniel apruebe 7.2 y de las decisiones de abajo. Detalle y archivos en `tasks.md`, 7.1 y 7.2.

**Lo que las pruebas dan por decidido (Daniel debe confirmar antes de 7.3):**

1. **Ciudad nueva: regla simple «b» de la tarea 1.3.** Se acepta solo si la zona de cobro guardada en el pedido (`envio.zonaCobro`, por nombre) la cubre; la zona no cambia ni el valor del domicilio. Si no la cubre, no hay zona guardada, la zona ya no existe o las zonas no se pueden leer, «se hace desde Katuq». Para eso `edit_order` lee las zonas de la empresa (dep `zonas`, solo lectura) y una copia pura de `zonaCubreCiudad` del front (mayúsculas y espacios no cuentan; documentos legacy con `ciudad` en la raíz).
2. **Contrato de las opciones** (ajusta la tabla «Contratos»): `entrega { direccion?, ciudad?, fecha? "AAAA-MM-DD", franja?, linea? }`, `contacto_recibe { nombres?, apellidos?, telefono? }` (el teléfono queda con dígitos y sin repetir el indicativo guardado; de 7 a 15 dígitos), `asesor { email }` (el servidor lo busca entre los usuarios de **la empresa de la credencial**, filtrando por `empresa || company` con `empresa` primero, nunca por una empresa de `args`, y guarda `{ name, email, nit }` como la pantalla), `facturacion { tipoDocumento?, documento?, nombres?, correoElectronico?, indicativoCel?, celular?, direccion?, ciudad?, departamento?, pais?, codigoPostal?, alias? }`.
3. **Parches.** `envio`, `facturacion` y `asesorAsignado` se reemplazan enteros en `updateOrderInternal`, así que el parche lleva la copia guardada con solo lo que cambia. Dirección, ciudad y contacto no tocan `carrito` (no se recalcula nada). Fecha y franja sí viven en `carrito`: el parche lleva también `fechaEntrega` y `horarioEntrega` de la raíz (el pedido los guarda en los dos lados; la fecha conserva el sufijo de hora que ya tenga la raíz), los datos de cálculo y se aplican las mismas reglas de F1 para lo que toca `carrito`: congelado (EnProduccion a Despachado), acuerdo de precio, versión obligatoria y guard «sin plata».
4. **Bloqueos de la pantalla (tarea 1.2):** «recoge en tienda» (forma de la línea o de la raíz) bloquea dirección, ciudad, contacto, fecha y franja (`list.component.ts:2146`); facturación solo con el pedido sin facturar (las tres marcas de la pantalla y las tres del servidor, con `pedidoYaFacturado` para el candado vivo); asesor solo familia Administrador (`list.component.ts:2394`), dep `esAdministrador`.
5. **Sin `date_upd` en lo que no toca `carrito`:** dirección, contacto, asesor y facturación se aplican sin `_baseVersion`, igual que las notas de F1 (el parche se arma sobre el pedido releído al aprobar, así que la ventana es solo la del guardado). Fecha y franja siguen exigiéndolo.
6. **Efectos en la tarjeta:** domicilio y total no cambian; no se avisa al cliente ni al vendedor; con el pedido en EnDespacho o Despachado, un cambio de dirección **avisa al mensajero** (`notifyMessengerIfDeliveryAddressChanged`, `controllers/orders.js:3242`) y la tarjeta lo dice.
7. **Historial (7.2):** teléfono, documento y correo enmascarados; dirección, ciudad, nombres y asesor completos. Si el cambio real deja la misma marca (mismos últimos dígitos, misma primera letra y dominio, o dato de 4 caracteres o menos), el historial lo dice: «***4567 (anterior)» y «***4567 (nuevo)». Nunca dos marcas iguales. Un cambio de «quién recibe» hecho en la pantalla junto con la dirección sale en el mismo evento.

**Líneas que otra sesión debe agregar** (no se tocaron `services/companyFeatureFlags.js` ni `package.json`):

```js
// Editar notas, observaciones de entrega y tarjeta de regalo de un pedido desde Claude, con la
// aprobación de la persona en la tarjeta (D-550, ticket 1333, F1). Exige también `orderHistoryLog`.
// Apagada, edit_order responde «aún no está activa para tu empresa». Corte general:
// `config/feature_flags.mcpOrderEdit` (false = apaga F1 a F4 para todos). Primero FLORECER, luego
// ALMARA FELICIDAD. Dueño: Daniel. Se retira el 2027-04-30 (Artículo XII).
"mcpOrderEditNotes",
// Editar la entrega (dirección, ciudad, fecha y franja), el contacto de quien recibe, el asesor y los datos de
// facturación de un pedido no facturado desde Claude (D-550, ticket 1333, F2). Exige `mcpOrderEditNotes` y
// `orderHistoryLog`. Apagada, esas opciones responden «aún no está activa para tu empresa». Dueño: Daniel.
// Se retira el 2027-04-30 (Artículo XII).
"mcpOrderEditDelivery",
```
Y el mismo nombre en `tests/companies/companyFeatureFlags.test.js` y en el arreglo del front (`company-features.service.ts`).

**Pendientes para Daniel (además de los de F0 y F1):** (a) confirmar los puntos 1 a 7; (b) la medición de `date_upd` (tasks.md 1.1): 78 % de los pedidos activos de ALMARA no lo tienen, así que `observaciones_entrega`, `tarjeta_regalo`, la fecha y la franja se negarían en la mayoría hasta que alguien guarde cada pedido una vez desde la pantalla; (c) leer, solo patrones, el formato de `fechaEntrega` y `horarioEntrega` (el sistema negó esa lectura el 26-oct).
