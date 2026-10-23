> **Estado:** DISEÑO de la F1, pendiente de aprobación. Ticket 1351 (ALMARA FELICIDAD). Decisión D-XXX (la sesión principal pone el número). La propuesta y las specs están aprobadas por Daniel desde el 23-oct. Este documento diseña en detalle **solo la F1**; las F2 a F4 quedan en esbozo y se diseñan cada una antes de implementarse. Solo documento: sin código.

## Context

Verificado en el código el 23-oct, sin leer ni escribir producción. Backend en `backend-aws-security` (`55aac8c1`); front en `feature/venta-asistida-mejorada` (`a07b9006`).

- **La mejora rápida ya está publicada.** Backend `cad71177` y front `ebe05a5e`, en la versión `2026.10.23.1`.
  - `GET /v1/orders/:orderId/history` pasó a `auth` + `requireJwtTenantOrPlatform` (`routers/orders.js:861`).
  - El modal muestra la creación y los pagos reconstruidos (`utils/historialReconstruido.js`).
  - El riesgo de «sesión paralela» de la propuesta queda cerrado.
- **El historial de hoy.** `recordOrderStatusChange` (`utils/orderStatusHistory.js:54`):
  - escribe en `order_status_history` con `.add()` (`:102`);
  - nunca lanza error y devuelve `true` o `false`.
  - Se llama desde **14 puntos en 8 archivos**. La propuesta contó 13 en 7; el que faltaba es la cancelación del cliente por WhatsApp, que llega inyectada (`services/whatsappConfirmacionPedido.js:333`, llamada en `:551`). La lista completa está en D6.
- **La edición general.** Pasa por `updateOrderInternal` (`controllers/orders.js:3321`). Lee el pedido anterior (`:3420`), aplica el guard de Tesorería (`:3444-3557`), escribe (`:3678-3698`) y solo registra el `estadoProceso` (`:3750`). La usan:
  - `POST /v1/orders/edit` (`:5043`);
  - el MCP `update_order_status` (`tools/updateOrderStatus.js:28`);
  - el plan de despachos de Opttia (`services/despachos/ejecutarPlan.js:323, 594`);
  - Opttia producción (`services/opttiaPropuestas/ejecutores/produccion.js:231`);
  - Tesorería (`services/treasury/treasuryService.js:401`);
  - «Ya lo recogí» (`controllers/carrierOffers.js:517`);
  - el despacho (`controllers/logistica.js:1735`);
  - los envíos (`controllers/logisticsIntegrations.js:1474`).
- **Pagos.**
  - **Web sin Tesorería:** «Gestión de pagos» manda el pedido completo a `/v1/orders/edit` con `PagosAsentados` cambiado (`asentarpagomanual.component.ts:319, 746`). Eliminar un pago lo saca del arreglo, identificándolo por `fechaHoraCarga` (`:674`).
  - **Con Tesorería:** `controllers/treasury.js:66, 98, 118, 145` → `treasuryService` → `applyOrderUpdate` → `updateOrderInternal`. La excepción es la rama `legacyWrite`, que escribe directo (`treasuryService.js:698`).
  - **Pasarelas:** Wompi (`controllers/integration.js:1398`, en transacción con marcador), `payment-callback` (`:2237`) y ePayco (`:3058`).
- **Creación de pedidos.** Hay 10 caminos, listados en D6. Casi todos terminan en `limitsService.createOrderWithinLimit`. Las excepciones son la cotización convertida en el servidor (`services/cotizacionService.js:133`, `.add()`), los domicilios (`services/domicilios/domicilioService.js:274`) y Kuvo (`services/kuvo/orderWriter.js:115`).
- **Lectura de hoy.** `getOrderHistory` (`controllers/orders.js:9011`):
  - responde 403 si el pedido es de otra empresa;
  - trae todo `order_status_history` sin paginar (`utils/orderStatusHistory.js:185`);
  - le suma lo reconstruido.
- **Identidad.**
  - **JWT:** trae `sub`, `role`, `email`, `company` y `name` (`services/index.js:7`). No distingue la web de la App: iOS y Android mandan los mismos encabezados (`Katuq.iOS.Gestion/.../APIClient.swift:228`).
  - **`POST /v1/orders/edit` y `/edit-multiple-orders`:** solo tienen `auth` y toman el usuario del encabezado `email` (`orders.js:5045, 5824`).
  - **MCP:** `req.mcpAuthType` es `oauth`, `servicekey` (Opttia) o `apikey` (`middleware/mcpAuth.js:121, 222, 283`), junto con `mcpUserEmail` y `mcpCanal`.
- **Banderas.**
  - Backend: `services/companyFeatureFlags.js`, con catálogo cerrado, sin caché y 1 lectura de `companies`.
  - Front: `company-features.service.ts`.
  - Se escriben con `scripts/set-company-feature.js`, que simula por defecto.
- **Reglas de Firestore.** Viven en la consola, no en el repo. La auditoría del 20-oct (D-512, propuesta `cerrar-reglas-firebase` del backend, D-513) las encontró abiertas: `get`, `list`, `create`, `update` y `delete` en todas las colecciones hasta 2028-12-30. El Admin SDK del backend no pasa por reglas.
- **Índices.** `firestore.indexes.json` está desactualizado. Se crean solo los nuevos, con el Firebase CLI y sin `--force` (memoria `firestore-indices-como-crear`).
- **Cambios de estado que hoy no dejan ningún historial** (fuera de la F1, ver «F2–F4»):
  - Picking y packing: `controllers/inventory.js:2306, 2456, 2587, 2680`.
  - Integraciones:
    - WooCommerce: `controllers/woocommerceWebhook.js:2160`;
    - MultiOP: `controllers/multiopWebhook.js:111`;
    - Fullpi: `fullpiOrderService.js:143, 267, 388`;
    - Enviame: `enviameWebhook.js:184, 227` y `WebhookManager.js:372`;
    - Shopify: `processors/fulfillments.js:61` y `processors/orders.js:327, 364`.
  - Tienda en línea: `controllers/sites.js:4509, 5637, 5680, 5726`.
  - El vencimiento de Kuvo.

## Decisiones de Daniel (23-oct)

| # | Pregunta | Decisión | Dónde se aplica |
|---|---|---|---|
| 1 | ¿Colección nueva o ampliar `order_status_history`? | **Opción A:** colección nueva solo para el historial. Solo crece: nadie la edita ni la borra. `order_status_history` sigue igual, porque la lee el Tablero en vivo (D-386). | D1, D6, D7 |
| 2 | ¿Quién ve y quién exporta? | Lo ve todo el que ve el pedido. Exportar (F4) queda solo para la familia Administrador (`isAdminFamilyRole`, `middleware/requireRole.js:63`). | D8, F4 |
| 3 | ¿Por dónde llegan las alertas de la F4? | A la campana de Katuq de los administradores. | F4 |
| 4 | ¿Motivo obligatorio y clientes de la API? | Obligatorio solo en la web desde la F2. La App, el MCP y Opttia registran «sin motivo» por ahora. | D2 (`reasonStatus`), D10, F2 |
| 5 | ¿Para todos o con bandera? | La F1 sale con bandera por empresa (D-505: `featureFlags.<nombre>` en `companies`, `requireFeature` / `CompanyFeaturesService`, nada en el `.env`). Primero ALMARA FELICIDAD. | D9, plan de despliegue |

## Goals / Non-Goals

**Goals (F1):**

- Un evento inmutable por cada guardado que cree el pedido, cambie su estado de proceso, pago o entrega, registre, edite, anule o verifique un pago, o lo elimine.
- El servidor fija el actor, el origen y la hora, nunca el cliente.
- Un solo módulo escribe. Si falla, el pedido no lo nota.
- Una lectura paginada, limitada a la empresa, que mezcla eventos nuevos, registros de antes y reconstruidos, sin duplicar.
- La pantalla básica.
- Bandera por empresa.

**Non-Goals (F1):**

- Las 17 opciones con antes → después, el motivo obligatorio en la web, los filtros y el buscador (F2).
- Los eventos de integraciones, inventario, producción, facturación y cliente (F3).
- Comparar, exportar, alertas y ver pedidos eliminados (F4).
- Escribir eventos para pedidos viejos: no hay backfill, se reconstruyen al leer.
- Tocar el Tablero en vivo o `order_status_history`, salvo lo descrito en D6.1.
- Arreglar que `/v1/orders/edit` no ate la empresa del token. Va en un cambio aparte (ver Riesgos).
- Cerrar las reglas de Firebase más allá de excluir la colección nueva (eso es D-513).

## Decisions

### D1. Colección `order_history_events`

- **Nombre:** sigue el estilo de `order_status_history`, `audit_log_access` e `integration_audit`: inglés con guion bajo.
- **Escritura:** solo el backend, con el Admin SDK. Ningún cliente la lee ni la escribe directo.
- **Contenido:** un documento por evento, con id determinista (D5.3) para que un reintento no duplique (Artículo IV).
- **Retención:** indefinida. Sin política TTL.
- **Índices compuestos** (D12):
  - `company ASC, orderId ASC, occurredAt DESC`
  - `company ASC, orderId ASC, occurredAt ASC`
  - `company ASC, orderId ASC, paymentKeys CONTAINS`
- **Campos sin índice simple** (`fieldOverrides`): `snapshot`, `details`, `amounts` y `actor`. Bajan el costo de escritura y alejan el límite de 40.000 entradas de índice por documento cuando la foto es grande.

### D2. Modelo del evento (versión 1)

Los campos guardados van en inglés (identificadores canónicos, AGENTS.md). Los textos para el comercio salen del catálogo de etiquetas al leer (D8.5). Así, mejorar un texto no obliga a reescribir eventos.

| Campo | Tipo | Qué guarda | Quién lo fija |
|---|---|---|---|
| `schemaVersion` | número | `1` | módulo |
| `orderId` | texto | doc id del pedido | servidor |
| `orderNumber` | texto | `nroPedido` del pedido leído | servidor |
| `company` | texto | `company` del pedido leído (el `nomComercial`), nunca el encabezado | servidor |
| `type` | texto | tipo principal del guardado (D3) | módulo |
| `tags` | arreglo | todos los tipos que tocó el guardado (para los filtros de la F2) | módulo |
| `occurredAt` | Timestamp | hora del **servidor** al terminar la operación | servidor |
| `recordedAt` | Timestamp | `serverTimestamp()` de la escritura; difiere de `occurredAt` si hubo reintento | Firestore |
| `actor` | mapa | `{ kind, name, email, role }`. `kind` ∈ `user`, `carrier`, `customer`, `system`, `integration` | servidor (D4) |
| `origin` | texto | lista cerrada de D4 | servidor |
| `channel` | texto o nulo | lista cerrada de D4 | servidor |
| `details` | arreglo | `[{ field, before, after }]`. `field` sale del catálogo cerrado (D3); los valores van crudos (números en COP, códigos de estado) | módulo |
| `amounts` | mapa | `{ orderTotal, balanceBefore, balanceAfter, payment }` en COP, como números | módulo |
| `reason` | texto o nulo | motivo escrito por la persona, hasta 500 caracteres | quien llama |
| `reasonStatus` | texto | `given`, `missing` o `not_required`. `missing` se muestra «Sin motivo (App)», con el origen | módulo |
| `paymentKeys` | arreglo | claves de los pagos tocados (D3.2) | módulo |
| `legacyId` | texto o nulo | id del registro de `order_status_history` que este evento espeja | módulo |
| `correctsEventId` | texto o nulo | evento que corrige: el que registró el pago editado o anulado | módulo |
| `snapshot` | mapa o nulo | foto inicial (creación) o resumen final (eliminación) | módulo |
| `snapshotParts` | número | cuántas partes tiene la foto (1 si cabe) | módulo |

**Foto inicial** (`snapshot` de `order_created`). Es una proyección: lleva lo que pide la spec, sin imágenes, descripciones ni URLs de comprobantes.

- **Pedido:**
  - número, `typeOrder`, `fechaCreacion` y `origen`;
  - vendedor (`asesorAsignado`: nombre y correo);
  - `bodegaId` (código de negocio).
- **Cliente:** nombre, documento, teléfono y correo.
- **Facturación:** razón social, documento y correo.
- **Entrega** (`carrito[0].configuracion.datosEntrega`): forma, fecha, dirección y ciudad.
- **Líneas:** `{ cd, referencia, nombre, cantidad, precioSinIva, tarifaIva, descuentoLinea, totalLinea }`, con los totales que ya recalculó el servidor.
- **Descuentos** (total y código), **impuestos** (`totalImpuesto`, `desgloseIVA`) y **envío**.
- **Totales:** subtotal, total y saldo.
- **Pagos iniciales:** `{ clave, valor, formaPago, estadoVerificacion }`.
- **Estados** de proceso y de pago.
- **Notas** (`notasPedido`, `observaciones`) y **tarjetas** (`carrito[i].configuracion.tarjetas`).

Las rutas exactas se confirman con pedidos reales de ALMARA en la tarea 1.1. Si el JSON del evento pasa de 700 KB, las líneas se parten en bloques de 200:

- el evento principal lleva las primeras 200 y `snapshotParts: n`;
- cada parte va en `{id}__part_2`, …, `{id}__part_n`, con `partOf: id` y **sin** `occurredAt`.

Como no tienen `occurredAt`, las partes quedan fuera de las consultas ordenadas por fecha y del conteo.

### D3. Tipos de evento de la F1 y regla de un evento por guardado

| `type` | Cuándo | Título para el comercio | `details` |
|---|---|---|---|
| `order_created` | Se crea el pedido por cualquier origen | «Pedido creado» | — (va en `snapshot`) |
| `process_status_changed` | Cambia `estadoProceso`, o se registra sin cambio («liberado de la orden de envío», `logistica.js:71`) | «Estado del proceso» | `estadoProceso` y, si cambiaron en el mismo guardado, `shippingOrder` y `transportador` |
| `payment_status_changed` | Cambia `estadoPago` sin tocar pagos | «Estado del pago» | `estadoPago` |
| `delivery_reported` | El mensajero marca Entregado o Rechazado | «Entregado» / «Rechazado en la entrega» | `estadoProceso`, `quienRecibio`, `parentesco`, `notasEntregaMensajero`, `fotosEvidencia`, `motivoRechazo`, `fechaEntregaReal` |
| `payment_registered` | Aparece una clave nueva en `PagosAsentados` | «Pago registrado» | `pago.valor`, `pago.formaPago`, `pago.fecha`, `pago.numeroComprobante` |
| `payment_edited` | La misma clave cambia de valor, forma, fecha, comprobante o notas | «Pago editado» | cada campo con antes → después |
| `payment_voided` | La clave desaparece o su `estadoVerificacion` pasa a `Cancelado`/`Anulado` | «Pago anulado» | los datos del pago |
| `payment_verified` | `estadoVerificacion` pasa de `Pendiente` a `Aprobado` o `Rechazado` | «Pago aprobado» / «Pago rechazado» | `pago.estadoVerificacion` |
| `order_deleted` | Se borra el pedido | «Pedido eliminado» | — (resumen en `snapshot`: totales, estados y `typeOrder`) |

**D3.1. Un guardado produce un solo evento.**

- `type` es el de mayor prioridad: `order_deleted` > `delivery_reported` > `payment_voided` > `payment_registered` > `payment_edited` > `payment_verified` > `process_status_changed` > `payment_status_changed`.
- `tags` lleva todos los tipos del guardado.
- Si en el mismo guardado cambian otros campos (cliente, notas), en la F1 no entran. La F2 los agrega al mismo evento.

**D3.2. Clave del pago,** en este orden:

1. `paymentId` (Tesorería);
2. `fechaHoraCarga`, que es lo que usa la web para eliminar (`asentarpagomanual.component.ts:674`);
3. `numeroComprobante` de la pasarela;
4. si no hay nada de lo anterior, un hash de `fecha|valor|formaPago|numeroComprobante`.

Se guarda recortada a 120 caracteres. Para ids de documento se usa su hash.

**D3.3. Saldo antes → después.**

- Se usa `faltaPorPagar` del pedido antes y después del guardado, porque es lo que el comercio ve en pantalla.
- Si no viene, se usa `saldoPorPagar()` (`utils/wompiPagoPedido.js:242`).
- `orderTotal` es `totalPedididoConDescuento`.

### D4. Origen y canal: listas cerradas que fija el servidor

**Orígenes** (spec): `web` «Web», `pos` «POS», `app` «App», `mcp` «Claude/MCP», `opttia` «Opttia», `shopify` «Shopify», `woocommerce` «WooCommerce», `siigo` «Siigo» y `system` «Sistema».

**Canales** (opcional, lista cerrada). Precisan lo que la lista de orígenes no nombra:

- `online_store` «Tienda en línea», `virtual_store` «Tienda virtual», `kuvo` «Kuvo», `deliveries_api` «Domicilios»;
- `carrier_app` «App del mensajero», `customer_whatsapp` «WhatsApp del cliente»;
- `opttia_telegram`, `opttia_whatsapp`, `opttia_web`;
- `company_key` «Llave de la empresa»;
- `wompi`, `epayco`, `osmosis` «Cereza», `carrier_integration` «Transportadora», `flow` «Automatización»;
- `dispatch` «Despachos», `production_board` «Producción», `treasury` «Tesorería», `quote` «Cotización», `internal_agent` «Agente interno».

**Reglas** (`contexto.js`). El origen nunca se lee del cuerpo ni de los encabezados:

1. **Sesión JWT** (`req.authType === 'jwt'`):
   - el actor sale de `req.userInfo` (`name`, `email`, `role`), nunca de `req.headers.email`;
   - el origen es `app` si `req.userInfo.canal === 'app'` (D4.1) y `web` en cualquier otro caso;
   - una creación con `typeOrder === 'POS'` es `pos`, porque el servidor ya la trata como POS: consecutivo `ordersPOS` y estado Entregado (`orders.js:6109`). El canal guarda web o app.
2. **MCP:**
   - `oauth` → `mcp`;
   - `servicekey` → `opttia`, con el canal de `mcpCanal`;
   - `apikey` → `mcp` con canal `company_key`.
   - El actor es la persona (`mcpUserEmail`). Si no hay persona, es `system` con el nombre de `mcpActor` (`tools/toolRegistry.js:211`).
3. **Servicios de Opttia en el backend** (plan de despachos, producción) → `opttia`. El actor es la persona que aprobó.
4. **Mensajero** (`req.carrier` o `carrierAuth`) → `app` + `carrier_app`. El actor es `carrier`, con el nombre del transportador y sin correo.
5. **Integraciones:**
   - procesadores y flows de Shopify → `shopify`;
   - de WooCommerce → `woocommerce`;
   - Siigo llega en la F3.
6. **Sin persona ni canal** (pasarelas, Osmosis, Kuvo, tienda, domicilios por llave, crones) → `system` con su canal.
7. **Si no se puede clasificar** → `system`, más la traza `pedido.historial.origen_sin_clasificar { company, orderId, fuente }` (spec «Origen confiable»).

**D4.1. Web o App: el canal firmado en el token (recomendado; ver Open Questions 1).**

- Al iniciar sesión (`controllers/authentication.js:217`, `controllers/login.js:55`), el servidor pone `canal` en el JWT:
  - `app` si el `User-Agent` del login es el de las apps nativas (iOS `CFNetwork`/`Darwin`; Android `okhttp`, `Katuq.Android.Gestion/app/build.gradle.kts:64`);
  - `web` en cualquier otro caso.
- Los tokens anteriores no traen `canal` y cuentan como `web`. Vencen en 24 h.
- Es un dato de la **sesión**, firmado una vez por el servidor. Falsear el `User-Agent` al iniciar sesión solo cambia la etiqueta de las propias acciones; no da acceso a nada.
- No toca `auth` ni lo debilita: agrega un campo al token.
- **Si no se aprueba:** todo JWT queda como `web` y la App se ve como Web hasta que la App mande su canal.

### D5. Módulo único de escritura: `functions/services/orders/historialPedido/`

```
constantes.js  nombre de la colección, versión, tipos, orígenes, canales y catálogo de campos
etiquetas.js   textos de negocio: tipos, campos, valores de estado, orígenes y canales
contexto.js    actor, origen y canal desde req, MCP, mensajero, sistema y fuente heredada
construir.js   funciones PURAS: foto inicial, diferencias de estados y pagos, evento espejo,
               eliminación e ids
escritor.js    el ÚNICO archivo que escribe en order_history_events (create con reintentos)
lectura.js     página mezclada: eventos, registros de antes y reconstruidos
log.js         registro estructurado con lista cerrada de campos (patrón services/catalogo/log.js)
index.js       API pública
```

**D5.1. API.**

- `registrar(evento)` → `Promise<void>`.
  - Nunca lanza. Quien llama **no** la espera en el camino del pedido.
  - Las pruebas sí la esperan.
- `registrarCreacion({ pedido, contexto })`
- `eventoDeGuardado({ previo, final, contexto, motivos })` → evento o `null`. Es pura: la usa `updateOrderInternal`.
- `espejar({ params, legacyId })`: la usa `recordOrderStatusChange` (D6.1).
- `eventoEliminacion({ pedido, contexto })`
- `leerPagina({ pedido, cursor, orden, limite, sesion })`

**D5.2. Qué hace `escritor.registrar`.**

1. Todo va dentro de `Promise.resolve().then(...)` con `try/catch`. Un error al **armar** el evento tampoco llega al pedido.
2. **Bandera:** `isFeatureEnabled(company, 'orderHistoryLog')`. Si está apagada, no hace nada.
   - Encendida, lee `config/feature_flags.orderHistoryLog`. Si vale `false`, se detiene: es el corte general.
   - Esto es 1 o 2 lecturas por evento, sin caché (regla del proyecto).
3. **Valida:**
   - `type`, `origin`, `channel` y cada `details[].field` deben estar en sus catálogos;
   - deben venir `orderId` y `company`;
   - recorta los textos (motivo a 500, nombres a 120) y quita los `undefined`.
4. **Actor:** si es `user` y le falta el nombre o el rol, lee `users` por correo (`nombre`, `apellido`, `roles`; 1 lectura). Así guarda el nombre y el rol que tiene en ese momento.
5. **Tamaño:** si pasa de 700 KB, parte la foto (D2).
6. **Escritura:** `ref.create(doc)`.
   - `ALREADY_EXISTS` (código 6) cuenta como éxito: es idempotente.
   - Hace hasta 4 intentos, esperando 0,25 s, 1 s y 4 s, solo ante errores transitorios (`UNAVAILABLE`, `DEADLINE_EXCEEDED`, `ABORTED`, `RESOURCE_EXHAUSTED`, `INTERNAL`).
7. **Falla final:**
   - crea un documento en `integration_audit`, colección existente (precedente: `services/monitoring/jobHeartbeat.js`): `{ type: 'order_history_write_failed', company, orderId, eventId, eventType, attempts, errorCode, at }`. Sin datos personales y sin la carga del evento;
   - deja un log de error;
   - el conteo de fallas es un `count()` de esos documentos por empresa y día.
8. **Cada escritura** deja `pedido.historial.escritura { company, orderId, tipo, resultado, intentos, duracionMs }`.

**D5.3. Ids deterministas.** No duplican en reintentos y permiten comprobar existencia sin consultas.

| Caso | Id del documento |
|---|---|
| Creación | `{orderId}__created` |
| Evento que espeja un registro de `order_status_history`: todo guardado con cambio de proceso, la entrega y la eliminación | `{orderId}__osh_{legacyId}` |
| Guardado de `updateOrderInternal` sin cambio de proceso | `{orderId}__upd_{date_upd en ms}` |
| Pago por la rama directa de Tesorería | `{orderId}__pay_{paymentId}` |
| Pago de pasarela | `{orderId}__pay_{proveedor}_{transactionId}` |
| Si falló el registro de `order_status_history` | `{orderId}__evt_{id aleatorio}` |

### D6. Puntos de escritura de la F1

**D6.1. `recordOrderStatusChange` espeja sin cambiar lo de hoy.**

- `order_status_history` se escribe exactamente igual. Firma y valor devuelto no cambian, así que el Tablero en vivo y las auditorías siguen igual.
- **Después** del `.add()` exitoso, llama `historialPedido.espejar({ params, legacyId: ref.id })`, sin esperar.
- **Parámetro nuevo opcional `historialPedido`:**
  - sin él, se arma el espejo básico (`process_status_changed`), con el origen tomado del `source` según la tabla de D6.3;
  - con un objeto (evento ya armado por quien llama), se usa ese evento;
  - con `false`, no se espeja.
- **Parámetro nuevo opcional `contexto`:** el actor y el origen de quien llama.

**D6.2. Creación** (`order_created`, id `{orderId}__created`).

| # | Canal | Archivo:línea | Dónde se engancha | Origen / canal |
|---|---|---|---|---|
| C1 | Venta asistida, POS (web y App), App, duplicar, cotización convertida desde el front | `controllers/orders.js:6249` (`createOrderWithinLimit` en `exports.create`) | Justo después de confirmar, con `newOrderData`: ya trae los totales del servidor y el pago POS asentado (`settleApprovedPOSPayment`) | Sesión; `pos` si `typeOrder` es POS |
| C2 | Shopify | `services/shopify/processors/orders.js:135` | En `services/orderService.js:114`, tras `orderRepository.create`, con el nuevo `options.contextoHistorial` | `shopify` |
| C3 | WooCommerce (webhook de antes) | `controllers/woocommerceWebhook.js:1910` | Igual que C2 | `woocommerce` |
| C4 | Tienda en línea | `controllers/sites.js:3255` | Igual que C2 | `system` / `online_store`, actor `customer` |
| C5 | Tienda virtual | `controllers/virtualStoreWebhook.js:13` | Igual que C2 | `system` / `virtual_store` |
| C6 | Automatizaciones | `services/flows/nodes/internal/katuq-order-upsert.action.js:397, 408` | Igual que C2. El origen sale del proveedor del flow | `shopify`, `woocommerce` o `system` / `flow` |
| C7 | Partes de un pedido repartido (D-361) | `services/orderSplitService.js:215, 262` | Igual que C2. Hereda el contexto y agrega «parte N de M» | Heredado |
| C8 | Cotización convertida en el servidor | `services/cotizacionService.js:133` (`.add()`, sin `createOrderWithinLimit`) | Después del `add` | Sesión; canal `quote` |
| C9 | Domicilios | `services/domicilios/domicilioService.js:274` (dentro de la transacción) | Después de la transacción, solo si `!resultado.repetido` | Llave → `system` / `deliveries_api`; sesión → `web` |
| C10 | Kuvo | `services/kuvo/orderWriter.js:115` (dentro de la transacción) | Después de confirmar, un evento por pedido | `system` / `kuvo` |

**D6.3. Estados.** Son los 14 puntos que hoy llaman `recordOrderStatusChange`.

| # | Archivo:línea | Función | Qué registra hoy | En la F1 |
|---|---|---|---|---|
| E1 | `controllers/orders.js:3750` | `updateOrderInternal` | proceso | Evento combinado (D6.5) que se pasa como `historialPedido` |
| E2 | `controllers/orders.js:5553` | `editByTransporter` | Entregado/Rechazado | `delivery_reported` con la evidencia de `buildTransporterUpdate` (`:5302`); actor mensajero |
| E3 | `controllers/orders.js:5703` | `processBatchAuditAndNotifications` (llamada en `:5987` desde `editBatch`) | proceso en lote | Espejo con el contexto de la sesión (`req` en `:5824`); canal `production_board` |
| E4 | `controllers/orders.js:7265` | `delete` | «Eliminado» | `order_deleted` con resumen (`eventoEliminacion`) |
| E5 | `controllers/logistica.js:71` | `registrarPedidosLiberados` (llamada en `:1556` y `:1722`) | vuelve a ParaDespachar o sigue Empacado | Espejo; sesión; `dispatch` |
| E6 | `controllers/logistica.js:1530` | `createAndEditShippingOrder` | EnDespacho | Espejo; sesión; `dispatch` |
| E7 | `controllers/logistica.js:3182` | `batchDispatchShippingOrders` | Despachado (antes: `"pre-dispatch"`) | Espejo; sesión; `dispatch`. «Antes del despacho» sale del catálogo de etiquetas |
| E8 | `controllers/logisticsIntegrations.js:1442` | `createShipments` | estado que devuelve la transportadora | Espejo; `system` / `carrier_integration` |
| E9 | `services/despachos/ejecutarPlan.js:305` | plan de Opttia con mensajero propio | EnDespacho | Espejo; `opttia`; actor quien aprobó |
| E10 | `services/despachos/ejecutarPlan.js:571` | plan de Opttia con transportadora | estado del envío | Igual que E9 |
| E11 | `services/integrations/osmosis/osmosisWebhookService.js:294` | webhook de Osmosis | estado de Cereza | Espejo; `system` / `osmosis` |
| E12 | `services/domicilios/domicilioService.js:410` | cancelar domicilio | Cancelado | Espejo; según `ctx.via` |
| E13 | `services/integrations/osmosis/osmosisOrderService.js:355` | `cancelarEnvioCereza` (desde `controllers/osmosisIntegrationController.js:481`) | vuelve a EnDespacho | Espejo; sesión; `osmosis` |
| E14 | `services/whatsappConfirmacionPedido.js:551` | el cliente cancela por WhatsApp | Cancelado | Espejo; `system` / `customer_whatsapp`, actor `customer` |

**D6.4. Pagos.**

| # | Archivo:línea | Camino | En la F1 |
|---|---|---|---|
| P1 | `controllers/orders.js` (`updateOrderInternal`) | Web sin Tesorería, y Tesorería por `applyOrderUpdate` (`treasuryService.js:739, 1051, 1228`) | Diferencia de `PagosAsentados` dentro del evento combinado (D6.5) |
| P2 | `services/treasury/treasuryService.js:698` | Rama `legacyWrite` (escribe directo) | `payment_registered`, id `{orderId}__pay_{paymentId}` |
| P3 | `controllers/integration.js:1398` | Aviso de Wompi (transacción con marcador) | Después de la transacción, si no se omitió; `system` / `wompi` |
| P4 | `controllers/integration.js:2237` | `handlePaymentCallback` | Igual que P3, con su proveedor |
| P5 | `controllers/integration.js:3058` | Aviso de ePayco | Igual; `system` / `epayco` |

El **motivo** de anular viaja en `_motivoCambio`, un campo de paso. `updateOrderInternal` lo quita del pedido igual que `_motivoRetroceso` (`orders.js:3413-3416`).

**D6.5. Evento combinado en `updateOrderInternal`.**

- Se arma **después** de escribir (`:3678-3698`), con `previo = previousOrderData` y `final = { ...previousOrderData, ...updateData }`. Así refleja lo que de verdad quedó, después de los guards de Tesorería y de Kuvo.
- **Motivos:**
  - `motivoRetroceso` (`:3413`) es el motivo de un retroceso de proceso;
  - `_motivoCambio` es el de la anulación de un pago.
  - Si la anulación llega sin motivo: `reasonStatus: 'missing'`.
- **Con cambio de proceso:** se pasa como `historialPedido` a la llamada de `:3750` y queda con id `{orderId}__osh_{legacyId}`.
- **Sin cambio de proceso:** `historialPedido.registrar(evento)` con id `{orderId}__upd_{date_upd}`.
- **`options.contexto` (opcional, nuevo).** Si falta, se usa `contexto.desdeCorreo(userEmail)` y queda la traza de origen sin clasificar. Por eso todos los llamadores lo pasan:

| # | Llamador | Contexto |
|---|---|---|
| U1 | `controllers/orders.js:5047` (`exports.edit`) | `contexto.desdeRequest(req)` |
| U2 | `tools/updateOrderStatus.js:28` | `contexto.desdeMcp(context)` |
| U3 | `services/despachos/ejecutarPlan.js:133` (llamadas en `:323` y `:594`) | `opttia` + quien aprobó |
| U4 | `services/opttiaPropuestas/ejecutores/produccion.js:156` (llamada en `:231`) | `opttia` + quien aprobó |
| U5 | `services/treasury/treasuryService.js:401` (`applyOrderUpdate`) | Contexto que entra desde `controllers/treasury.js:66, 98, 118, 145` y `controllers/integration.js:2524`; canal `treasury` |
| U6 | `controllers/carrierOffers.js:517` | Mensajero o sesión, según quien llama |
| U7 | `controllers/logistica.js:1735` (`dispatchShippingOrder`) | Sesión; `dispatch` |
| U8 | `controllers/logisticsIntegrations.js:1474` | `system` / `carrier_integration` |
| U9 | `controllers/logistica-backup.js:416` | Se verifica que no tenga ruta. Si no la tiene, no se toca |

### D7. Inmutabilidad: tres candados

1. **Código.**
   - Solo `escritor.js` escribe, y solo con `create()`. Nunca `set`, `update`, `delete`, `FieldValue.delete`, `recursiveDelete` ni `BulkWriter` sobre la colección.
   - Un contract test recorre `functions/**/*.js` (incluidos `scripts/` y sin `node_modules`) y falla si:
     - el texto `order_history_events` aparece fuera de `constantes.js`;
     - la constante se importa fuera de `escritor.js` y `lectura.js`;
     - `escritor.js` usa alguna de las operaciones prohibidas.
2. **Firestore.** `create()` falla si el documento existe. Ni con el mismo id se sobrescribe un evento.
3. **Reglas de seguridad.**
   - En las reglas, cualquier `allow` que coincida da acceso. Con el comodín abierto de hoy, agregar `allow … if false` no basta: el comodín tiene que **excluir** la colección:

     ```
     match /order_history_events/{id} { allow read, write: if false; }
     match /{coleccion}/{doc=**} {
       allow read, write: if coleccion != 'order_history_events' && <condición vigente>;
     }
     ```
   - Se baja el ruleset vivo (solo lectura), se versiona (también es objetivo de D-513), se prueba en el emulador y se publica con aprobación.
   - Para revertir, se vuelve a publicar el ruleset anterior.

**Correcciones.** Un error se corrige con otro evento: `payment_edited` o `payment_voided` llevan `correctsEventId`, el evento que registró ese pago, buscado por `paymentKeys`. Ningún evento se edita.

**Borrados masivos.** Se verifica que `delete-demo-company.js` y los demás scripts de borrado por empresa no recorran colecciones sin una lista explícita.

### D8. Lectura paginada, limitada a la empresa y sin duplicar

**D8.1. Contrato compatible.** Sigue siendo el mismo endpoint `GET /v1/orders/:orderId/history`, sin «v2».

- **Sin `vista=eventos`:** responde lo de hoy, idéntico.
- **`?vista=eventos&limite=50&orden=desc|asc&cursor=<token>`:**
  - con la bandera apagada, responde lo de hoy más `vista: 'legado'`, y el front muestra la vista anterior;
  - con la bandera encendida, responde el formato nuevo (D8.4).
- **Pedido ajeno (en los dos modos):** 404, con el mismo cuerpo que un pedido inexistente (`responderNoEncontrado`), y queda el rastro `registrarIntentoAjeno` (`utils/mismaEmpresa.js`). Hoy responde 403; el cambio sigue la spec «Multiempresa».

**D8.2. Candado de empresa.**

- La ruta ya tiene `requireJwtTenantOrPlatform`.
- En el controlador, un comercio pasa solo si `esDeLaEmpresa(pedido, req.tenant)`. Julsmind (Support) entra a cualquiera.
- Toda consulta a la colección filtra por `company == pedido.company`. El pedido ya se comprobó.

**D8.3. Plan de lectura.**

1. `orders/{orderId}` (1 lectura) y el candado.
2. En paralelo:
   - **Página de eventos:** `company ==`, `orderId ==`, `orderBy(occurredAt, orden)`, `orderBy(__name__, orden)`, `startAfter(cursor)`, `limit(limite + 1)`.
   - **Registros de antes:** `getOrderStatusHistory(orderId)`, con tope de 300. Hoy son pocos por pedido, porque solo son cambios de proceso.
   - **¿Creación real?** `get({orderId}__created)`.
   - **Pagos reales:** si el pedido tiene pagos, `paymentKeys array-contains-any [claves de PagosAsentados, hasta 30]` con `select('paymentKeys')`.
   - **Solo en la primera página:** `count()` de los eventos del pedido.
3. `getAll({orderId}__osh_{L.id})` por cada registro de antes `L`. Los que existen quedan **ocultos**, porque su espejo ya está en la colección nueva.
4. **En memoria:**
   - Los registros de antes **no espejados** pasan a `process_status_changed` con `source: 'legacy'`. El nombre se resuelve con una sola consulta `users where email in [...]` (hasta 10 correos). Si no aparece, queda el correo.
   - Los **reconstruidos** salen de `eventosReconstruidos` (`utils/historialReconstruido.js`), adaptados al formato nuevo:
     - la creación, solo si no hay `{orderId}__created`;
     - cada pago, solo si su clave no tiene un evento real.
5. **Mezcla:**
   - Los elementos en memoria entran si quedan dentro de la ventana de la página: antes del cursor y, si la página de eventos vino llena, no antes del último evento.
   - Se ordena por (`occurredAt`, `id`), se corta en `limite` y `siguiente` codifica `{t, id}` del último elemento (base64url). Es nulo si no hay más.
   - Los ids sintéticos (`legacy_{id}`, `rebuilt_*`) mantienen el desempate estable entre páginas.
6. **Si falta un índice** (`FAILED_PRECONDITION`) u ocurre cualquier error, responde la vista de antes y deja un log de error. La pantalla nunca se rompe.

**Por qué no se duplica:**

- Un registro de antes se oculta solo si **existe** su espejo, buscado por id exacto.
- Si el espejo falló, el registro de antes se sigue viendo: la vista se repara sola.
- Lo mismo pasa con los pagos (clave) y la creación (id fijo).
- Si se apaga la bandera y se vuelve a encender, lo que pasó mientras estuvo apagada se ve como «antes» (estados) o reconstruido (pagos), sin huecos ni dobles.

**D8.4. Respuesta (`vista=eventos`).**

```json
{
  "success": true, "vista": "eventos", "orderId": "…", "nroPedido": "DAD-014573",
  "resumen": {
    "cliente": "…", "total": 200000, "saldo": 150000,
    "estados": { "proceso": "En producción", "pago": "Preaprobado" },
    "creacion": { "actor": "Viviana Grajales", "rol": "Vendedor", "fecha": "…", "origen": "Web", "reconstruido": false },
    "totalEventos": 12, "ultimoCambio": { "fecha": "…", "titulo": "Pago registrado" }
  },
  "eventos": [{
    "id": "…", "tipo": "payment_registered", "titulo": "Pago registrado", "fecha": "2026-10-22T22:04:06.044Z",
    "actor": { "nombre": "Viviana Grajales", "rol": "Vendedor" }, "origen": "Web", "canal": null,
    "detalles": [{ "etiqueta": "Valor", "antes": null, "despues": 50000, "clase": "dinero" }],
    "montos": { "pago": 50000, "saldoAntes": 200000, "saldoDespues": 150000, "total": 200000 },
    "motivo": null, "notaMotivo": null, "fuente": "evento", "retroceso": false
  }],
  "siguiente": "eyJ0IjoxNzI5…", "orden": "desc"
}
```

- `fuente` es `evento`, `legado` o `reconstruido`. `clase` es `dinero`, `texto`, `estado`, `fecha` o `lista`.
- `resumen` va solo en la primera página.
- **No se manda el correo del actor:** basta con el nombre y el rol (D11).
- `?foto=1` agrega la foto inicial completa al evento de creación, con sus partes si las tiene.

**D8.5. Lenguaje.**

- `etiquetas.js` traduce tipos, campos, valores de estado (`SinProducir` → «Sin producir»), orígenes y canales.
- Si un código no está en el catálogo, no se muestra el código: se muestra «Otro cambio» y queda un log de aviso.

### D9. Bandera `orderHistoryLog`

- **Catálogo.** Se agrega en `FEATURE_FLAG_NAMES` (`services/companyFeatureFlags.js`) y en `COMPANY_FEATURE_FLAGS` (`company-features.service.ts`), con su comentario:
  - dueño: Daniel;
  - retiro: 2027-04-30, encendida para todos o eliminada (Artículo XII).
- **Qué cierra apagada:**
  - la escritura (D5.2);
  - `vista=eventos` (D8.1);
  - en el front, la pantalla nueva, el nombre «Historial del pedido» y el motivo al anular un pago (D10).
  - Apagada, todo responde como hoy.
- **Corte general:** `config/feature_flags.orderHistoryLog === false` detiene las escrituras de todas las empresas (D-505). Si el campo no existe, no corta nada. Solo se lee cuando la bandera de la empresa está encendida.
- **Encender:** `node scripts/set-company-feature.js "ALMARA FELICIDAD" orderHistoryLog on`, primero en simulación y luego con `--execute`.
  - El servidor lo ve de inmediato.
  - El front, en el siguiente inicio de sesión.

### D10. Pantalla de la F1

- **Entradas.** Con la bandera encendida, se llama «Historial del pedido»:
  - la opción del menú del pedido (`list.component.html:2490-2497`);
  - el botón del panel de detalle (`:653`).
- **Modal** (`list.component.html:2966`):
  - **Encabezado:** «Historial del pedido · DAD-014573».
  - **Tamaño:** 760 px, con tope de 95vw.
  - **Contenido:** con la bandera, `<app-historial-pedido [orderId] [nroPedido]>`; sin ella, el `app-order-history-timeline` de hoy, sin cambios.
  - **Pie:** «Cerrar» secundario, blanco con borde `#e4e2ef`, texto `#5b5878` y radio 11 px, en lugar de `btn btn-secondary`.
- **`order-history-timeline`.** La F1 lo reemplaza para las empresas con bandera, sin modificarlo. Se retira junto con la bandera.
- **Componentes.**
  - Van en `components/ventas/historial-pedido/`, con `OnPush`, declarados en `VentasModule` junto a `OrderHistoryTimelineComponent`.
  - Excepción acotada del Artículo IX, como D-054: Angular 14.3 no tiene signals ni `@if`, así que se usan NgModule, `*ngIf` y RxJS.
  - Las piezas:
    - `HistorialPedidoComponent` (contenedor): carga, «Ver más» y «Más antiguos primero» / «Más recientes primero», que recarga desde la página 1 con `orden=asc`.
    - `HistorialResumenComponent`: el resumen.
    - `HistorialEventoComponent`: un evento.
    - `historial-pedido.util.ts`: funciones puras para agrupar por día, la hora de Colombia, el formato COP, la diferencia con signo y el aspecto por tipo.
- **Servicio.** `shared/services/ventas/historial-pedido.service.ts extends BaseService`: `pagina(orderId, { cursor, orden })`. Modelo en `shared/models/historial-pedido.model.ts`. Ningún `HttpClient` en componentes.
- **Resumen.** Tarjeta blanca, con radio 16 y borde `#ececf4`:
  - número en monoespaciada color info y cliente;
  - piezas con label en MAYÚSCULA muted: TOTAL, SALDO (resaltado en acento), PROCESO y PAGO (pastillas semánticas), y CREADO (quién, cuándo, desde dónde, más la marca «Registro reconstruido» si aplica);
  - una línea «12 movimientos · último: Pago registrado».
- **Línea de tiempo.**
  - Días en hora de Colombia («HOY», «AYER», «MARTES 21 DE OCTUBRE»), del más reciente al más antiguo.
  - Cada evento lleva:
    - un ícono en azulejo de 32 px con su par semántico;
    - el título de 14 px/700 en tinta;
    - la línea «3:45:12 p. m. · Ana Gómez (Vendedor) · Web»;
    - sus detalles «Estado del pago: Pendiente → Aprobado»;
    - la pastilla de plata «$200.000 → $180.000 (−$20.000)», en `#efe9ff`, 700 y `tabular-nums`;
    - «Motivo: …» o «Sin motivo (App)».
  - Un reconstruido lleva borde punteado, la pastilla «Registro reconstruido» (`#5A6B78` / `#eef0f3`) y el texto «Armado con los datos actuales del pedido».

| Tipo | Ícono | Par de color |
|---|---|---|
| Pedido creado | `pi pi-plus` | Primario `#5F3FE0` / `#efe9ff` |
| Estado del proceso (avance) | `pi pi-arrow-right` | Info `#1E6FD9` / `#E7F1FF` |
| Retroceso | `pi pi-arrow-left` | Alerta `#D9820A` / `#FFF1DF` |
| Estado del pago | `pi pi-credit-card` | Info |
| Entregado / pago registrado / pago aprobado | `pi pi-check-circle` / `pi pi-wallet` | Éxito `#1E874B` / `#E6F7EE` |
| Pago editado | `pi pi-pencil` | Alerta |
| Rechazado en la entrega / cancelado / pago anulado / pago rechazado / pedido eliminado | `pi pi-times-circle` / `pi pi-ban` / `pi pi-trash` | Error `#D64545` / `#FDECEC` |
| Origen Sistema o integración | (el del tipo) | La pastilla de origen en pizarra `#5A6B78` / `#eef0f3` |

- **Estados de la pantalla:**
  - **cargando:** tres filas de esqueleto (el shimmer está permitido, D-399);
  - **error:** «No pudimos cargar el historial» con «Reintentar»;
  - **vacío:** ícono, «Este pedido aún no tiene movimientos» y un texto corto.
- **Hora:** `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit', second: '2-digit' })`. Agrupar por día usa la misma zona horaria.
- **Trampas de CSS global:**
  - prefijo `hist-`, sin «p-» en ningún nombre (`hist-pastilla`, no `hist-chip--`);
  - cada `span` con texto lleva color y tamaño propios;
  - `:focus-visible { outline: 3px solid #7C5CFF !important }`;
  - `letter-spacing: normal`;
  - sin gradientes;
  - revisión a 1440 y 390 px, sin scroll horizontal.
- **Motivo al anular un pago** (`asentarpagomanual.component.ts:645`):
  - con la bandera encendida, el Swal de «Eliminar» pide el motivo con `input: 'textarea'` y lo exige con `inputValidator` («Escribe por qué se anula el pago»);
  - se envía en `_motivoCambio`;
  - el servidor no rechaza si falta, porque la obligación del servidor llega en la F2 (decisión 4): registra `reasonStatus: 'missing'`. Ver Open Questions 4.

### D11. Datos personales y logs (Artículo XI)

- **La foto inicial** guarda cliente, facturación y entrega solo en Firestore, igual que el pedido.
- **Sin URLs de comprobantes** (`archivo`), como ya hace `historialReconstruido`. Las fotos de la entrega se guardan porque ya están en el pedido y la spec las pide.
- **Logs:**
  - solo esta lista cerrada de campos: `{ company, orderId, eventId, tipo, origen, resultado, intentos, duracionMs, codigoError, fuente }`;
  - un texto con «@» sale como `[omitido]`;
  - nunca nombres, teléfonos, direcciones, montos ni motivos.
- **Respuesta al front:** lleva nombre y rol del actor, sin correo.
- **Exportar** (F4): solo la familia Administrador.

### D12. Rendimiento y costo

- **Escritura.** 1 `create` por evento, más las partes en casos raros, 1 o 2 lecturas de bandera y 0 o 1 de `users`.
  - Corre suelta, sin esperar: no suma tiempo a la operación del pedido.
  - Volumen esperado en la F1: entre 3 y 10 eventos por pedido.
- **Primera página.**
  - Lecturas: 1 pedido, 1 bandera, hasta 51 eventos, hasta 30 registros de antes, 1 `get`, 1 consulta de pagos, 1 `count()`, el `getAll` de espejos y 1 de `users`.
  - Son unos 4 viajes, la mayoría en paralelo.
  - Lee 51 eventos aunque el pedido tenga 500, así que la meta p95 < 1,5 s no depende del total.
- **Medición:** `pedido.historial.lectura { company, orderId, eventos, legado, reconstruidos, duracionMs }`. Gate: p95 de al menos 30 aperturas en ALMARA.
- **Índices y `fieldOverrides`:** se crean antes de encender la bandera (D1).

## F2–F4 (esbozo; cada fase tendrá su diseño y sus tareas)

- **F2:**
  - **Las 17 opciones del pedido** con antes → después. `eventoDeGuardado` crece con un catálogo cerrado de campos (cliente, entrega, facturación, asesor, líneas, descuentos, IVA por línea D-135 en `editLineaIva`, notas y revisión).
  - **Acciones sin guardado** (PDF, reenviar confirmación): `POST /v1/orders/:orderId/history/eventos` con tipos cerrados y origen de la sesión.
  - **Duplicar:** «duplicado como N» en el original y `order_created` con `duplicadoDe` en el nuevo.
  - **Motivo obligatorio en la web:** 400 si el origen es `web` y falta en precio, descuento, impuestos o anulación de pago. La App, el MCP y Opttia registran `missing`.
  - **Filtros** por `tags` y por actor, y **buscador** sobre los eventos del pedido.
  - **Picking y packing** (`controllers/inventory.js`), si no entra antes (Open Questions 5).
- **F3:**
  - **Eventos de sistema e integraciones:**
    - recálculos y vencimientos;
    - Siigo, Shopify (`fulfillments.js`, `orders.js:327, 364`), WooCommerce (`woocommerceWebhook.js:2160`), MultiOP, Fullpi y Enviame;
    - facturación electrónica (número, CUFE, aceptada o rechazada);
    - pagos de Kuvo y de cuotas;
    - acciones del cliente que el canal reporte.
  - **Inventario:** se **lee** de `inventoryMovement` por pedido, sin escribir inventario (D-134).
  - **Idempotencia:** el id del evento sale del id del aviso del proveedor (Artículo IV). Antes de tocar webhooks, se contrasta con `specs/002-flows-osmosis-shopify-marco/findings.md`.
- **F4:**
  - **Comparar entre dos fechas:** se reconstruye el estado aplicando los eventos sobre la foto inicial. Necesita la F2 completa.
  - **Exportar** a PDF y Excel en el servidor: solo `isAdminFamilyRole`, con los montos como números.
  - **Alertas** a la campana de los administradores (`sendSellerNotification` / notificaciones del Seller):
    - precio cambiado en un pedido pagado;
    - pago anulado;
    - facturación cambiada en un pedido facturado.
  - **Historial de un pedido eliminado:** se consulta por `orderId` y el candado usa `company` del evento.

## Pruebas

| Repo | Archivo | Qué fija |
|---|---|---|
| Back | `tests/orders/historialPedido.construir.test.js` | Foto inicial: campos, sin URLs de comprobantes, partición con más de 200 líneas. Diferencias de pagos: registrar, editar, anular por salida y por estado, verificar; las claves. Prioridad de tipo y `tags`. Saldo antes → después. Ids deterministas |
| Back | `tests/orders/historialPedido.contexto.test.js` | El origen de cada vía de D4. Un `origen`, `email` o `canal` falso en el cuerpo o los encabezados no cambia nada. POS. MCP con `oauth`, `servicekey` y `apikey`. Mensajero. Lo desconocido → Sistema más la traza |
| Back | `tests/orders/historialPedido.escritor.test.js` | Bandera apagada: cero escrituras. El corte general. Solo `create`. `ALREADY_EXISTS` cuenta como éxito. Reintentos solo ante transitorios. Falla final → `integration_audit` sin datos personales. Nunca lanza, ni con el constructor roto |
| Back | `tests/orders/historialPedido.inmutable.contract.test.js` | Escaneo del código (D7.1) |
| Back | `tests/orders/historialPedido.writeset.contract.test.js` | Una base de datos falsa anota colecciones y operaciones. El escritor solo hace `order_history_events.create` e `integration_audit.create`. La lectura solo lee. Ninguno toca `orders`, `inventory`, `inventoryMovement`, `products` ni precios |
| Back | `tests/orders/historialPedido.lectura.test.js` | El espejo oculta el registro de antes. Lo reconstruido aparece solo sin evento real. Páginas de 50 con cursor estable, en asc y desc, sin dobles en la frontera. Ajeno → 404 más rastro. Bandera apagada → vista de antes. Índice faltante → vista de antes |
| Back | `tests/orders/historialPedido.puntos.contract.test.js` | Cada punto C1–C10, E1–E14, P1–P5 y U1–U8: inspección del código (patrón `tests/sellerMobileNotifications/orderControllerHook.test.js`) o dependencias inyectadas (`ejecutarPlan`, `whatsappConfirmacionPedido`, `borrarPedido`, `updateOrderStatus`) |
| Back | `tests/orders/historialPedido.noBloquea.emulator.test.js` | Con un escritor que falla: crear, editar (estado y pago) y borrar dejan el pedido y la respuesta iguales que con un escritor sano |
| Back | `tests/orders/historialPedido.flujo.emulator.test.js` | De punta a punta en el emulador: POS con pago, cambio de estado, pago registrado y anulado, MCP, borrado → los eventos esperados y la lectura sin dobles |
| Back | Regresión | `tests/enVivo/*`, `tests/logistica/osmosisWebhookHistorial.test.js`, `liberarPedidosQuitados.test.js`, `carrierCompliance.test.js`, `tests/despachos/ejecutarPlan*.contract.test.js`, `tests/notifications/whatsappConfirmacionPedido.test.js`, `tests/orders/historialReconstruido.test.js`, `borrarPedido.test.js`, `retrocesoManual.contract.test.js`, `editBatchSinCamposDePago.test.js`, `tests/companies/companyAccess.test.js` y las suites de Tesorería |
| Front | `tests/ventas/historial-pedido.util.test.js` (`node --test` con ts-node, como `pos-linea-precio`) | Agrupar por día en hora de Colombia: Hoy, Ayer, fecha y el cruce de la medianoche UTC. Hora con segundos. COP y diferencia con signo «−». Aspecto por tipo |
| Front | Build | `npm run build` sin errores. Los gradientes y los primarios prohibidos de los módulos tocados no suben |

## Risks / Trade-offs

- **Muchos enganches en `orders` (módulo sensible).** Mitigación:
  - un punto a la vez, con diff a la vista y aprobación;
  - con la bandera apagada no se escribe nada;
  - el contract test de no bloqueo;
  - el evento corre suelto, nunca dentro de la transacción del pedido.
- **Un reinicio de PM2 a mitad de los reintentos pierde ese evento.** La vista se repara sola: el estado sale del registro de antes, el pago y la creación se reconstruyen. Ese caso no queda contado. Se acepta.
- **Web y App** (D4.1). Si no se firma el canal, la App aparece como Web.
- **Reglas abiertas** (D-513). Hasta publicar la exclusión, un cliente con la configuración pública podría leer o tocar eventos directo, como ya pasa con `orders` y `order_status_history`. **Gate:** no se enciende ALMARA sin la exclusión publicada. FLORECER sí, para probar.
- **`/v1/orders/edit` y `/edit-multiple-orders`** tienen solo `auth` y toman el usuario del encabezado `email` (`orders.js:5045, 5824`).
  - El historial no le cree a ese encabezado: el actor sale del JWT y la empresa del pedido.
  - El hueco de empresa de esas rutas se deja anotado para un cambio aparte.
- **Costo.** Cada evento de una empresa encendida cuesta 1 o 2 lecturas de bandera, sin caché por la regla del proyecto. Se mide en ALMARA antes de ampliar.
- **Índices.** Pueden tardar minutos en construirse. Mientras tanto, la lectura cae a la vista de antes (D8.3, paso 6).
- **Hora.** `occurredAt` usa el reloj del servidor EC2 (NTP) y el registro de antes usa `serverTimestamp`. Puede haber diferencias de milisegundos; el desempate es por id.

## Migration Plan

1. **Backend con la bandera apagada en todas partes.**
   - Módulo, enganches, lector y bandera en el catálogo.
   - Commit y push antes de desplegar. Luego `git pull` y `pm2 restart katuq-api`, según MANUAL-EC2.
   - Sin efecto visible.
2. **Datos.** Índices y `fieldOverrides` (CLI, sin `--force`). Exclusión en las reglas, probada y aprobada.
3. **Front.** Vista, motivo y bandera en el catálogo. Build de producción y publicación con el candado. Sin efecto visible.
4. **FLORECER encendida.** Prueba funcional con escrituras reales en la empresa demo, con permiso.
5. **ALMARA FELICIDAD encendida** (OK de Daniel y reglas publicadas). Observación de 5 días hábiles:
   - fallas = 0;
   - p95 < 1,5 s;
   - sin dobles en 10 pedidos revisados;
   - el Tablero en vivo, igual.
6. **Ampliar** a más comercios, por decisión de Daniel.
7. **Revertir:**
   - bandera apagada (empresa) o corte general;
   - revertir los commits, si hace falta.
   - Los eventos escritos quedan inertes: solo los lee la vista con la bandera.
8. **Retiro (Artículo XII, 2027-04-30).** Encendida para todos o eliminada. Se borran `order-history-timeline` y la rama de antes del lector cuando ya no haga falta.

## Open Questions

1. **Canal en el token (D4.1).** ¿Firmamos `canal` al iniciar sesión (recomendado; toca el login de forma aditiva) o aceptamos que la App se vea como Web hasta que la App lo mande?
2. **Gate de reglas.** ¿Confirmas que ALMARA se enciende solo después de publicar la exclusión de la colección en las reglas (D7.3)?
3. **Canales fuera de la lista.** Tienda en línea, Kuvo, domicilios, mensajero, WhatsApp del cliente y pasarelas van como «Sistema» o «App» más el canal (D4). ¿De acuerdo?
4. **Motivo al anular un pago en la F1.** La spec lo pide desde la F1 y la decisión 4 deja la obligación del servidor para la F2. Propuesta: desde la F1 la pantalla web lo exige, y el servidor lo registra («sin motivo (origen)») sin rechazar hasta la F2. Así las pantallas viejas en caché no fallan. ¿Así?
5. **Picking y packing** (`controllers/inventory.js:2306-2680`). Son cambios de estado que hace una persona y hoy no dejan registro. ¿Entran en la F1 (si ALMARA tiene `pickingAlistamiento`) o en la F2?
