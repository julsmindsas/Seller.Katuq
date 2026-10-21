> Fase A del modelo único de suscripción (D-518, F2-43·1). Ticket `7OaxPVn97s3dUKpkr8OA`.
> Backend `wt-back-tickets-web/functions` (HEAD `097ede2e`) y front `wt-front-tickets-web`,
> rama `feature/tickets-web`; código leído el 2026-10-21. Las líneas citadas son de HEAD:
> `controllers/sites.js` y `services/cronService.js` tienen cambios de F2-41 sin commit que
> las corren (por ejemplo, `vencerReservasDeTienda` está en `:5135` en HEAD y en `:5313` en
> la copia de trabajo). Por eso las piezas se nombran por función.
> Requisitos en `specs/suscripcion-desde-pedido` (SP) y `specs/entregas-de-suscripcion`
> (ES). Toca pedidos, consecutivos e inventario: cada tarea sensible va con su diff aprobado
> por Daniel, una a la vez. Las preguntas Jn y Dn son las de `proposal.md`.

## Context

**Se reutiliza sin modificar:**

- **Pedido de servidor:** `orderService.createOrder(order, company, {skipDuplicateCheck})`
  (`services/orderService.js:65-130`).
  - Toma el número con `orderRepository.getNextConsecutive` (`repositories/orderRepository.js:17-37`),
    que solo suma 1: **no salta números usados**, a diferencia de
    `generateConsecutiveNumber` de `/create` (`controllers/orders.js:3044-3110`, salta hasta
    100). No hay restricción de unicidad sobre `nroPedido` (D15).
  - Toma el número **antes** de contar el cupo: un intento rechazado por el tope gasta un
    número.
  - Crea con `orderRepository.create` → `limitsService.createOrderWithinLimit`
    (`services/limitsService.js:75-157`), que cuenta el cupo y hace `transaction.create`
    (falla si el documento existe). `repositories/orderRepository.js:43` acepta un
    `orderRef`, pero `createOrder` no lo pasa (D14).
  - Errores: `ORDER_LIMIT_REACHED` y `SUBSCRIPTION_SUSPENDED` (`limitsService.js:103-140`).
  - Después: `notifyOrderCreated` (app del vendedor) y, sin `bodegaId`,
    `scheduleShadowAllocation` (escribe `warehouseAllocation`).
- **Inventario, por origen:**
  - `executeOrderInventoryRollout` (`services/inventory/orderInventoryRolloutService.js:85-134`)
    con `legacy: inventoryService.updateStock`, como `/create`. En modo transaccional es
    idempotente y devuelve `requiresRetry` si falla; en legado no lo es.
  - `updateStock` manda todo lo que no es POS a `updateByChannel`
    (`services/inventoryService.js:96-103`), que busca el canal por `channelId` o por nombre
    y devuelve `success:false` si no lo encuentra. Descuenta producto por producto: puede
    quedar a medias.
  - La tienda descuenta con `updateByPOS(…, "tienda-en-linea")` por bodega, en una sola
    transacción, porque su pedido trae `channel {name:"Tienda en línea"}` sin `channelId`
    (`utils/siteOrden.js:342-349`; el comentario de `sites.js`, en HEAD `:4361`, dice que
    por canal «fallaría en silencio»).
  - Los pedidos de Woo descuentan con `updateByChannelFromWebhook`
    (`controllers/woocommerceWebhook.js:1937`), y la sincronización de Woo **fija** la
    cantidad de su bodega (`services/woocommerce/processors/inventory.js` `adjustStock`,
    llamado desde `processors/products.js:87-93` y `:292-297`).
  - El libro rechaza un pedido que trae la huella `inventoryEffect` de otro
    (`orderInventoryEffectPolicy.js:185-188`, `TENANT_MISMATCH`).
  - Los dos caminos leen `inventariable` del producto vigente al descontar
    (`inventoryService.js:337`, `:628`).
- **Freno por existencias:** `frenoPorExistencias` (`services/inventory/saleAvailabilityGate.js:97`),
  solo con la política «bloquear». Lee `inventariable` de la **foto** de la línea (`:48`).
- **¿Requiere despacho?** `requiereDespacho` (`services/orders/requiereDespacho`), solo lectura.
- **Totales:** `calculateOrderTotals` (`services/orderCalculationService.js:356`) calcula desde la
  foto del carrito. La campaña de una lista por tipo de cliente se mide contra
  `fechaDelPedido(order)` (`:596-612`, que lee `fechaCreacion`, y `:633-650`, `:719-733`).
  El Seller tiene el mismo cálculo (`shared/services/ventas/iva-canonico.ts:106`) y lo
  aplica al recargar la lista.
- **Confirmación:** `orderNotificationService.notify(order, 'order_created')`, idempotente con
  `notificationsSent`; avisa al equipo del comercio siempre y al cliente solo en empresas
  migradas (`isUnifiedNotifEnabled`, `services/notifications/notificationFlags.js:26-32`, que
  lee el `.env`: deuda frente a D-505). Para las no migradas,
  `notificationHooks.correoPedidoCreado` (`notificationHooks.js:400`), el de
  `reenviarConfirmacionPedido.js`, que no respeta la preferencia «pedido creado» porque es
  manual (`:12-14`).
- **Crones:** `CRON_ENABLED` (`cronService.js:111-124`; el comentario registra corridas dobles
  de un segundo proceso) y `conLatido` (`services/monitoring/jobHeartbeat.js`, patrón de
  `initNpsJobs`).
- **Banderas:** `services/companyFeatureFlags.js` (`FEATURE_FLAG_NAMES`, `requireFeature` `:299`)
  y `config/feature_flags` (ya usado por `wooStockPublish` y `pagoCuotasConciliacion`).
- **Seller:** «Opciones del Pedido» (`ventas/list/list.component.html:2172-2550`), Duplicar
  (`list.component.ts:10196-10329`), `VentasService`, `BaseService` y `cfg-pagina` (D-400).

**Lo que no se reutiliza:** `/v1/orders/create` aplica las promociones del día
(`controllers/orders.js:6117`) y depende del `emailHtml` del navegador. Duplicar corre en el
navegador y no conoce el calendario. `addBillingPeriod` trabaja sobre instantes y resta 5
horas: con una fecha sin hora (medianoche UTC) el día queda en el anterior en Bogotá.

## Decisions

### D1. Un solo modelo con D-497
Colecciones de D-497 (T·3; nombre de la segunda, pregunta D8).

**`storeSubscriptions/{subId}`**, `subId` = 20 hex de SHA-256(`company|order|baseOrderId|idempotencyKey`):
- **Comunes:**
  - `company`, `source` (`order` en A, `store` en B), `collection` (`manual` en A, `card` en B);
  - `status`: `active | cancelled | completed` (B suma `creating | retrying | payment_failed | abandoned`);
  - `pause {reason: manual | feature_off | base_closed, since, by}`: la pausa es un campo
    aparte, como D-497 D1, nunca un estado;
  - `items[]` congelados `{productId, variant, reference, title, quantity, unitPriceWithTax, unitPriceWithoutTax, taxRate}`;
  - `amount {subtotal, tax, shipping, discount, total}` y `priceDate` (fecha de precio, D3);
  - `schedule` (D2), `nextPeriodAt` (YYYY-MM-DD de Bogotá), `periodsCreated`, `history[]`,
    `createdBy`, `createdAt`, `updatedAt`, `cancelledAt` y `cancelledBy`.
- **Solo A:** `base {orderId, nroPedido, origin: venta-asistida | tienda | woocommerce}`,
  `orderTemplate` (D4), `paymentMethod`, `deliveryWarehouse` (D13, base Woo) y
  `leadDays` (J4, 0 por defecto).
- **Solo B:** `plan`, `buyer`, `paymentSourceId`, `card`, `consent` y `env` (D-497 D1).

**Períodos `storeSubscriptionCharges/{subId}_{NNN}`**, uno por fecha de entrega:
- `NNN` = n, el número del período (1, 2, 3…). La fecha sale de una función pura sobre
  `schedule` (D2), que no cambia después del alta: cada fecha tiene un solo id posible.
  Esa es la idempotencia por fecha de entrega.
- Campos de A: `company`, `subscriptionId`, `collection`, `period {n, date, windowStart}`.
  - `status`: `pending | created | skipped_paused | skipped_no_stock | skipped_limit | skipped_suspended | skipped_late | skipped_product | failed`;
  - `orderPending`, `order {reservedAt, orderId, nroPedido, inventoryStartedAt, inventoryDoneAt, notifiedAt}`,
    `tries[] {day, reason}`, `alert {open, reason, since}` y `lockedAt`.
- B agrega `amountInCents`, `attempts[]`, `paidAt` y sus estados de cobro.

**Pedido generado:** `storeSubscription {subscriptionId, periodId, n, total, baseOrderId, baseOrigin}`,
el mismo campo de D-497 D5. Con D14, su id es `sub_{periodId}`.

**Índices** (export de los vivos antes de desplegar, como D-497 2.16):
- `storeSubscriptions`: (`collection`, `status`, `nextPeriodAt`) y (`company`, `createdAt`);
- períodos: (`collection`, `orderPending`) y (`company`, `alert.open`).
- Un solo campo (`base.orderId`, `subscriptionId`, `storeSubscription.periodId` en `orders`,
  `ordenId` en `inventoryMovement`): índices simples y empresa verificada en memoria.

**Reglas de Firestore:** las dos colecciones solo se leen y escriben desde el backend. La
tarea 0.5 verifica que las reglas vivas niegan la lectura desde el cliente; si no, se suma
al ticket de reglas 1320 antes de encender.

### D2. Calendario puro (`services/storeSubscriptions/schedule.js`)
- `schedule {mode: frequency | dates, frequency, startDate, anchorDay, end {type: until | count | none, until, count}, dates[]}`.
- `periodDate(schedule, n)` trabaja con fechas civiles YYYY-MM-DD, sin instantes ni zona
  horaria:
  - semanal y cada 2 semanas: `startDate` + 7·(n−1) o 14·(n−1) días;
  - mensual y cada 2 meses: mes de `startDate` + (n−1) o 2·(n−1), en el `anchorDay` o en
    el último día de un mes corto (31-ene → 28/29-feb → 31-mar);
  - `yearly` lo suma la fase B;
  - fechas exactas: `dates[n−1]`, ordenadas y sin repetir. `dates[]` solo existe en este modo.
- **Fin:** `until` (última fecha ≤ `until`), `count` (exactamente `count`) o `none` (solo
  fase B).
- **Topes por origen:** en A, 52 fechas y 12 meses (D7). En B, sin tope.
- **Fechas por línea (J6):** cada línea guarda su diferencia en días con la primera línea del
  base, y la conserva en cada entrega.
- La primera fecha propuesta es la del pedido base más una frecuencia (J3). Toda fecha es
  posterior a hoy en Bogotá.

### D3. Vista previa y alta
- **`POST /v1/store-subscriptions/preview`** `{baseOrderId, schedule, paymentMethod?, deliveryWarehouse?}`,
  sin escrituras.
  - Valida que el pedido sea de la empresa del token, que la empresa sea Premium (D11) y
    que el base no esté Anulado, Cancelado ni Eliminado.
  - Clasifica el origen: `tienda` si trae `siteId`; `woocommerce` si `sourceOrder` es
    `woocommerce`; `venta-asistida` si su canal es «Venta Asistida». POS (J8) y los demás
    (Shopify, Kuvo, bot, Osmosis) se rechazan con el motivo (pregunta D20).
  - Arma la plantilla (D4) y calcula el valor con `calculateOrderTotals` sobre una copia
    con la **fecha de precio del base** (`fechaCreacion` del base), sin promociones del día.
  - Devuelve `{dates[], amount, warnings[]}`. Avisos: `base_total_differs` (D2),
    `gateway_payment`, `woocommerce_origin` (más elegir bodega, D13), `non_inventory_lines`,
    `per_line_dates` (J6) y, si D3 queda en (b), `campaign_expires` con la fecha.
- **`POST /v1/store-subscriptions`** `{…, idempotencyKey}`. Repite todo en el servidor; del
  navegador no se toman fechas ni montos. En una transacción: si el `subId` existe,
  devuelve el mismo; 409 `SUBSCRIPTION_EXISTS` si el base ya tiene una `active`; si no,
  crea en `active` con `nextPeriodAt = periodDate(1)`. No crea pedidos ni períodos.
- **Formas de pasarela:** «Pago en línea», las de `pagoCuotas.proveedorDeForma` y las que
  contienen wompi, epayco, pasarela o tarjeta online (`controllers/orders.js:6022`). Exigen
  un `paymentMethod` de `formasPago` de la empresa que no sea de pasarela; si no, 400
  `PAYMENT_METHOD_REQUIRED`.

### D4. Plantilla del pedido (`template.js`, pura)
- **Borra lo mismo que Duplicar** (`list.component.ts:10211-10282`): `_id`, pagos,
  transportador, evidencias, producción, factura, despacho, `integrations` e `integraciones`.
- **Borra además**, por origen:
  - Woo: `nroPedidoReferencia`, `referencia`, `sourceOrder`, `woocommerceOrderId`,
    `woocommerceUpdatedAt`, `woocommercePricesIncludeTax` y `cuponAplicado`
    (`services/woocommerce/mappers/order.js:340-380`); Shopify: `shopifyOrderId`;
  - tienda: `pagoTienda` completo (enlaces y `reservaCuotas`), `pagoTransaccionId`, `siteId`,
    `siteSlug`, `medicion`, `campana`, `promocionesTienda`, `cupon`, `instruccionesPago`,
    `inventarioDescontadoAlCrear`, `reservaVencida` y `estadoProcesoAntesDeVencer`;
  - inventario y reparto: `inventoryEffect`, `marketplace` y `warehouseAllocation`;
  - avisos y suscripción: `notificationsSent`, `correosEnviados`, `waNotifSent`,
    `confirmacionReenviada`, `confirmacionReenvios` y `storeSubscription`;
  - numeración: `nroPedido`, `consecutivo`, `date_add`, `date_edit` y `user_edit`;
  - descuento: `descuentoAplicado.descuentoId` (D10).
- **Conserva** cliente, entrega, facturación, `bodegaId`, `channel`, `channelId`
  (venta asistida), `typeOrder`, asesor, notas, `porceDescuento` y las líneas con su foto de
  precio. Recalcula `productoIds` desde el carrito.
- **Fechas:** el pedido toma `fechaEntrega` = `YYYY-MM-DDT05:00:00.000Z` (la que filtra la
  lista, el formato de la venta asistida y de `utils/siteOrden.js:71`) y conserva su
  `horarioEntrega`. Cada línea toma `configuracion.datosEntrega.fechaEntrega =
  {day, month, year}` (de ahí leen los despachos), con su diferencia J6, y conserva su forma
  y horario. La forma de entrega del pedido sigue siendo la de `carrito[0]`.
- **Estado inicial:** `estadoPago: 'Pendiente'`, `estadoProceso: 'SinProducir'`,
  `formaDePago` (la del base o `paymentMethod`), `anticipo: 0`, `fechaCreacion` = ahora,
  `fechaPrecio` = `priceDate` (solo con D3 (a)) y `user_add: 'suscripcion'`.

### D5. Trabajo diario `storeSubscriptionDeliveries`, 6:15 COT
Detrás de `CRON_ENABLED` y del modo global (D8), con `conLatido`. Toma solo
`collection == 'manual'`. Meta: termina en menos de 10 minutos con 1.000 períodos del día
(se mide en FLORECER).

- **Ventana:** de `fecha − leadDays` a la fecha de entrega, inclusive. Nunca se crea un pedido
  con la fecha de entrega ya pasada. Con `leadDays = 0` hay un solo intento; la revisión
  del día anterior (paso 0b) avisa antes.
- **Pasos de cada corrida:**
  0. **Pendientes:** termina los períodos con `orderPending == true` (caídas entre crear y
     anotar). Corre en cualquier modo, incluso `apagado`: no crea pedidos nuevos.
  0b. **Revisión del día anterior** (solo lectura): para las entregas de mañana, revisa tope,
     empresa suspendida, existencias y productos, y abre `alert will_fail` con el motivo.
  1. **Reclamar** en transacción el período `{subId}_{NNN}`. Sale si ya está `created` o
     `skipped_*`, o si hay una reserva de menos de 10 minutos. Con `pause`, o con la bandera
     del comercio apagada, solo cierra como `skipped_paused` los períodos cuya ventana
     terminó. Si no, `status: pending`, `order.reservedAt` y `orderPending: true`.
  2. **Recuperar:** con D14, lee `orders/sub_{periodId}`; sin D14, busca por
     `storeSubscription.periodId` y verifica la empresa. Si existe, sigue en el paso 6.
  3. **Revisar** (solo lectura):
     - el pedido base: si está Anulado, Cancelado o eliminado, `pause base_closed` + alerta (D17);
     - cada producto en `products`: existe y es de la empresa (si no, `skipped_product`,
       D18), está activo (si no, alerta) y su `inventariable` vigente pasa a la línea;
     - `requiereDespacho`;
     - el cupo y el estado de la empresa en `companies` (lectura, para no gastar números);
     - `frenoPorExistencias`, ya con `inventariable` vigente (F2-43·7).
     - Tope, suspensión o freno: `tries` + alerta y reintento dentro de la ventana; al
       cerrarla, `skipped_limit`, `skipped_suspended` o `skipped_no_stock`.
  4. **Armar** desde la plantilla y comparar `calculateOrderTotals(copia)` con `amount.total`.
     Si difieren en más de $1: `failed` + `alert price_mismatch`, sin crear.
  5. **Crear:** justo antes, relee en transacción que la suscripción siga `active` y sin
     pausa. Luego `orderService.createOrder(orden, company, {skipDuplicateCheck: true, orderRef})`.
     - `ORDER_LIMIT_REACHED` y `SUBSCRIPTION_SUSPENDED`: reintento dentro de la ventana.
     - Después: si otro pedido de la empresa tiene el mismo `nroPedido`, `alert duplicate_number` (D15).
     - `productOrderIndex` con `arrayUnion` (`controllers/orders.js:6150-6160`) y
       `redisCache.invalidateOrdersCache` (D16).
  6. **Descontar una sola vez, por origen:**
     - **Venta asistida:** `executeOrderInventoryRollout` con `legacy: updateStock`.
       - Transaccional: si devuelve `requiresRetry`, se reintenta en la corrida siguiente,
         porque es idempotente.
       - Legado: `inventoryStartedAt` en transacción antes de llamar; con éxito,
         `inventoryDoneAt`. Si la corrida se cae o devuelve `success:false`, compara los
         movimientos de `inventoryMovement` con el `ordenId` **línea por línea**: todas →
         hecho; algunas → `alert inventory_partial`; ninguna → `alert inventory_uncertain`.
         Nunca se repite solo.
     - **Tienda:** `updateByPOS(orden, company, "tienda-en-linea")` con la bodega del base;
       con éxito, `inventarioDescontadoAlCrear: true`, como D-204 y D-497 D5. Es una sola
       transacción: `success:false` es un fallo cierto (`alert inventory_failed`, sin
       reintento). El barrido de la reserva no anula la entrega porque su forma de pago es
       manual (prueba 1.5).
     - **Woo (D13):** `updateByPOS` con la bodega `deliveryWarehouse`, nunca la que
       sincroniza Woo; mismas reglas que la tienda.
  7. **Confirmar:** `notify(order, 'order_created')` siempre. En empresas no migradas,
     `correoPedidoCreado` en la cola si la preferencia «pedido creado» del comercio lo
     permite (D5) y `writeSellerNotification('ORDER_CREATED')`, con `order.notifiedAt`
     escrito en transacción **antes** de encolar. Sin correo del cliente, no hay correo.
  8. **Anotar** `created`, `orderId`, `nroPedido`, `orderPending: false`; en la suscripción,
     `periodsCreated + 1` y `nextPeriodAt` al siguiente período, o `completed`.
- **Atraso:** un período cuya ventana cerró sin intento queda `skipped_late` con alerta.
- **Cancelar durante una corrida:** si la cancelación llega entre la relectura del paso 5 y
  el guardado, el pedido existe y se abre `alert created_after_cancel`. La spec lo admite.

**Efectos de `/v1/orders/create` (D16):**

| Efecto | En la fase A | Motivo |
|---|---|---|
| Promociones del día | no | precio congelado (F2-43·2) |
| Consecutivo, cupo, documento | sí, por `createOrder` | mismo cupo (D19) |
| `productOrderIndex` | sí | búsqueda por producto |
| Inventario | sí, por origen (paso 6) | D-204 |
| `notify` y correo de no migradas | sí (paso 7) | F2-43·3 |
| Invalidar caché de pedidos | sí | si no, el pedido no aparece en la lista |
| SMS de no migradas | no | se cobra por mensaje (D5) |
| Stock a Aliaddo (`notifyFulfillmentOrder`) | no | D16; no se enciende quien la use |
| `IntegrationDispatcher` (MultiOP) | no | D16; no se enciende quien la use |
| `warehouseAllocation` en sombra | solo si el pedido no trae bodega | lo hace `createOrder` |

### D6. Pausar, reanudar, cancelar y cambiar el pedido base
Rutas `POST /v1/store-subscriptions/:id/pause | resume | cancel | rebase`.
- **Pausar:** `pause.reason: manual`. Las fechas no se mueven (J5).
- **Reanudar:** quita `pause`. Solo se crean los períodos con la ventana abierta.
- **Cancelar:** `cancelled`. No se crean más pedidos; los creados no se tocan.
- **Cambiar pedido base** (sujeto a D4): recalcula `orderTemplate`, `items`, `amount` y
  `priceDate` desde otro pedido de la empresa, solo para los períodos aún no reclamados, y
  guarda el valor anterior en `history[]`.

### D7. Seller
- **Opción del modal:** «Suscripciones», después de «Duplicar pedido», con
  `orderSubscriptions` y fuera de Producción. Para el POS, los orígenes no cubiertos y los
  pedidos anulados o cancelados aparece deshabilitada con el motivo, como «Editar
  Dirección». Nombre y descripción en ES, EN y PT (solo esta opción).
- **`SubscriptionScheduleDialogComponent`** (standalone, OnPush):
  - **Programar:** modo, frecuencia, desde y «termina», o calendario de selección múltiple;
    forma de pago si el base es de pasarela; bodega si el base es de Woo; «Ver fechas»
    llama a `preview`; «Confirmar» solo con una vista previa vigente.
  - **Estado:** estado y pausa, entregas X de N con su número de pedido, próximas fechas,
    alertas y acciones con confirmación.
- **Pantalla `ventas/suscripciones`** (standalone, `loadComponent`, `cfg-pagina`, tabla
  PrimeNG): cliente, pedido base, frecuencia, próxima entrega, creadas/total, estado en par
  fuerte/suave y alertas; estado vacío; botón en Todos los pedidos (D9).
- **Servicio:** `StoreSubscriptionsService extends BaseService` (nombre de D-497 4.1).
- **Diseño:** regla Katuq, sin gradientes ni primarios paralelos; ninguna clase nueva
  contiene «p-»; títulos de pestaña con `color: inherit`; `:focus-visible`.
- **Entrega generada:** el subtítulo del modal dice «Entrega N de M de la suscripción de
  <nro base>». No cambia columnas, filtros ni eventos del listado.

### D8. Banderas y modos (D-505, Artículo XII)
- **Por comercio:** `featureFlags.orderSubscriptions`, en `FEATURE_FLAG_NAMES` y en
  `COMPANY_FEATURE_FLAGS`. Dueño: Daniel. Se retira el 2027-04-30.
- **Global:** `config/feature_flags.storeSubscriptionDeliveries`, solo para `collection: manual`.
  Ausente, vacío o desconocido = `apagado`.
  - `apagado`: no crea pedidos (solo el paso 0); vista previa, alta, reanudar y rebasar dan 403.
  - `sombra`: calcula qué crearía y lo deja en el resumen; no escribe períodos ni pedidos.
  - `crear`: opera.
  - Se retira 30 días después de quedar en `crear` sin incidentes.
- **Rutas** (`routers/storeSubscriptions.js`, `controllers/storeSubscriptions.js`, en `index.js`):
  todas con `auth` y `requireJwtTenant`. Vista previa, alta, reanudar y rebasar exigen
  además `requireFeature('orderSubscriptions')`. Consultar, pausar y cancelar no: con la
  bandera apagada el comercio debe poder ver y cancelar lo que quedó en pausa. Cancelar exige
  `requireRole(['Administrador'])` (D6). `/v1/subscriptions` ya es de los planes de Katuq.

### D9. Qué se comparte con la fase B y qué va por origen
| Pieza | Compartida | Por origen |
|---|---|---|
| Colecciones, `pause`, períodos, `storeSubscription` en el pedido | sí | — |
| `periodDate` y fin `until/count/none` | sí | topes |
| Reclamar, recuperar, anotar, `orderPending` | sí (`periodClaim.js`) | — |
| Crear el pedido | `createOrder` | A: plantilla; B: `construirOrden` con D-496 |
| Inventario | regla «una vez» | A venta asistida: rollout; tienda y B: `updateByPOS` + marca |
| Confirmación | `notify` | B: `avisarAlComprador` |
| Cuándo se crea | — | A: el día de la entrega; B: al aprobarse el cobro |

## Write-set y contract tests

| Escribe | Solo por |
|---|---|
| `storeSubscriptions`, `storeSubscriptionCharges` | módulos nuevos (incluido `history[]`) |
| `consecutives` | `getNextConsecutive`, dentro de `createOrder` |
| `orders` nuevo; `companies.currentMonthOrders`, `monthlyOrderLimit`, `orderCountResetDate`, `lastCounterReset` | `createOrderWithinLimit` |
| `orders` del pedido generado: `notificationsSent.*`, `inventoryEffect`, `inventarioDescontadoAlCrear`, `warehouseAllocation` | `notify`, el libro, el paso 6, `createOrder` |
| `inventory`, `inventoryMovement`, `inventory_audit` y el libro | `executeOrderInventoryRollout` o `updateByPOS` |
| `productOrderIndex` | `arrayUnion` del pedido generado |
| `notifications`, `notification_queue`, Realtime DB `ActualizacionTicket{company}` | `notifyOrderCreated`, `notify`, `addToNotificationQueue`, `writeSellerNotification` |
| `integration_audit` | `conLatido` |

- **Solo lectura:** el pedido base, `products`, precios, listas, `warehouses`, `channels`,
  `channelWarehouseAssociations`, `companies` (salvo el cupo) y los maestros.
- **Prohibido:** catálogo, precios, `integrations.*`, WooCommerce, Aliaddo, MultiOP,
  `subscriptions` y `billing_*`.

**Pruebas** (`scripts/lib/firestoreFalsa.js`, que hoy no tiene `tx.create`, campos con
punto en `where`, `<=`, `arrayUnion` ni concurrencia real; tarea 1.0). Caracterización
primero (grupo 1), contract tests después (grupo 2): write-set como lista de permitidos,
productos y precios idénticos, doble corrida, caídas, un pedido por fecha, inventario una
vez por origen, modos, códigos y filtro por empresa. La concurrencia real se prueba en
FLORECER (5.4).

## Observabilidad
- **Logs:** `firebase-functions/logger` con `correlationId` = `periodId`, resultado
  (`success|error|retry`) y latencia; solo ids (Artículo XI).
- **Resumen:** `{job, modo, revisadas, creadas, recuperadas, pausadas, sinExistencias, tope, suspendida, tarde, producto, avisosPrevios, errores, duracionMs}`.
- **Simulador:** `scripts/store-subscriptions-simulate.js`, solo lectura, `--dry-run` por defecto.

## Gates constitucionales
- **I** propuesta → specs → tasks aprobadas. **II** las specs no nombran código ni
  tecnología; las referencias viven aquí. **III** sin enmiendas.
- **IV** idempotencia por fecha (D1, D5, D14). **V** no hay webhook. **VI** la UI no ramifica
  por proveedor.
- **VII** no hay integración externa; el latido, el resumen y las alertas en la pantalla
  reemplazan el provider-dashboard. Excepción acotada, la misma de D-497, en 0.1.
- **VIII** pruebas de contrato primero.
- **IX** standalone, OnPush y lazy; sin signals ni `@if` (Angular 14). La opción vive en el
  NgModule de `list`. Excepción acotada, la misma de D-497, en 0.1.
- **X** no aplica. **XI** sin datos personales en logs. **XII** banderas con dueño y fecha.
  **XIII** dos specs de 3 páginas o menos. **XIV** decisión en `CONTRACT.md`. **XV** no se
  escribe `integrations`.

## Orden de unión (T·2)
F2-41 (D-517) → D-496 → **suscripciones (esta fase A)** → pago rechazado de TX-34.
- La fase A no toca `sites.crearPedido`, la reserva ni `/pagar`, y no usa el núcleo de
  D-496: con D-496 solo hay orden de unión. Comparte `cronService.js`,
  `companyFeatureFlags.js` e `index.js`.
- F2-41 tiene hoy cambios sin commit en `sites.js` y `cronService.js`. Las citas se
  revalidan después de unirlo (tarea 0.4).
- La fase B va después, usa `periodClaim.js` y arma su pedido con el núcleo de D-496.

## Cómo la amplía la fase B (ajustes a `suscripciones-en-la-tienda`)
- `source: store`, `collection: card`, `items[]` con variante y cantidad, `schedule` con
  `yearly`, las frecuencias de A y `end.type: none`.
- `nextPeriodAt` en vez de `nextChargeAt`; `pause` con las razones de las dos fases.
- Su trabajo filtra `collection == 'card'`; sus modos van a `config/feature_flags` (D-518).
- Su revisión de existencias omite `inventariable === false` (F2-43·7).
- **Tope del plan:** D-497 dijo que las renovaciones no cuentan, pero `createOrder` las
  cuenta siempre (D19).
- **Premium:** las dos fases piden Premium (D11).
- Su pantalla se suma a `ventas/suscripciones` y sus rutas del comercio pasan a
  `/v1/store-subscriptions` (D12).

## Fases
0 aprobaciones y lecturas → 1 caracterización → 2 contract tests → 3 backend → 4 Seller → 5
encendido: todo apagado; FLORECER en `sombra`; FLORECER en `crear` con datos de prueba;
CAFE ESCOBAR con J1-J8, D13 y el OK de Daniel (D-385).

## Risks / Trade-offs
- **Entrega saltada:** se prefiere a crear un pedido con la fecha vencida. La revisión del día
  anterior da tiempo de actuar.
- **Inventario dudoso o a medias:** alerta antes que doble descuento.
- **Precio congelado contra lista:** decisión de negocio (F2-43·2); la vista previa la muestra.
- **Correo del servidor en no migradas:** distinto del HTML del navegador (D5).
- **OH MY STORE y Cereza:** no se enciende allí sin revisar que un pedido sin `integrations`
  no se empuje solo.
