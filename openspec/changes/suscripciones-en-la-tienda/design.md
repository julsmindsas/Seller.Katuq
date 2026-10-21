> D-497 (aprobada el 2026-10-18). Backend `katuq_admin_back_firebase/functions/` (rama `backend-aws-security`); front `Seller.Katuq/`. Código leído el 2026-10-18. Requisitos: `specs/tienda-suscripciones` y `specs/cobro-recurrente-tienda`. Toca pagos, pedidos, consecutivos e inventario: cada tarea sensible va con diff aprobado, una a la vez.
>
> **[21-oct] Ajuste pendiente de aprobación** (D-518 F2-43·1 y ·7, D-505). Se implementa en `wt-back-tickets-web/functions` y `wt-front-tickets-web`, rama `feature/tickets-web` (D-518). Código releído el 21-oct en HEAD `c9e74ff0`, que ya incluye F2-41: las líneas citadas el 18-oct se corrieron (por ejemplo, `clienteDeAcceso` está en `sites.js:2001`, `resolverClienteEnCRM` en `:2561`, `crearPedido` en `:2646`, `pedidosDeCuenta` en `:3728` y `router.get("/:id")` en `routers/sites.js:379`). La copia de trabajo de `sites.js` tiene otro cambio en curso que vuelve a correrlas, así que las piezas se nombran por función. Una crítica del mismo día, verificada contra el código, corrigió el ajuste: estados del período (D1), monto (D3), revisión antes de cobrar y armado del pedido (D5), fecha de entrega (D5), dueño de los modos (D7), validación del plan y «Mis planes» (D8) e índices (D1). La sección nueva **D9** dice qué cambia para alinearse con la fase A (`openspec/changes/suscripciones-desde-pedido`, sus D1, D2, D9 y «Cómo la amplía la fase B»), y cada punto tocado lleva **[21-oct]**. Requisitos nuevos: `specs/planes-de-suscripcion` (PS) y `specs/operacion-cobro-tienda` (OC, cuatro requisitos aprobados de CR, movidos por el límite de 3 páginas).

## Context

Se reutiliza sin modificarlo:

- **Wompi del comercio:** `services/paymentGateway/index.js` `getPaymentCredentials(company, 'wompi')` da `source: 'company-config'` solo con `integrations.wompi` activo; si no, cae a la plataforma (`plataforma.js`) o a ePayco. Aquí se exige `provider === 'wompi'` y `source === 'company-config'`. El enlace de la tienda está en `services/paymentGateway/providers/wompiProvider.js`.
- **Cobro con fuente guardada de Katuq:** `controllers/subscriptions.js` (`replacePaymentSource`) y `services/billingService.js` (`_claimBillingCycle`, `_chargePaymentSource`, `_reconcileKnownInvoiceTransaction`; un 422 por referencia repetida se espera, y con la suscripción cancelada y un envío ambiguo no reenvía: `cancelled_subscription_with_uncertain_submission`). Las reglas se replican en un módulo nuevo; `billingService` no se toca (no-goal).
- **Fechas puras:** `services/subscriptionBillingUtils.js` (`addBillingPeriod`, `getBogotaDateKey`).
- **Webhook principal:** `controllers/integration.js` `procesarNotificacionWompi` guarda el crudo en `integrationRawEvents`, separa los cobros de Katuq (`utils/wompiPagoPedido.js`, `esCobroDeKatuq`), valida con el secreto del dueño, confirma con Wompi (`confirmarTransaccionEnWompi`) y deja el marcador `integrationEvents/wompi-transaccion-<id>`.
- **Pedido de tienda** (`controllers/sites.js` `crearPedido`):
  - arma con `siteOrden.construirOrden` y resuelve el cliente con `resolverClienteEnCRM`;
  - `orderService.createOrder` toma el consecutivo (`orderRepository.getNextConsecutive`, colección `consecutives`), guarda y llama a `sellerMobileNotifications.notifyOrderCreated`;
  - `inventoryService.updateByPOS(…, "tienda-en-linea")` descuenta y, si sale bien, se marca `inventarioDescontadoAlCrear` (D-204). **`updateByPOS` no es idempotente por pedido**: cada llamada descuenta otra vez. La red de seguridad de la tienda es `aplicarPagoDeTienda`, que descuenta si falta la marca; los pedidos de este cambio nacen `Aprobado` y no pasan por ahí;
  - avisa con `orderNotificationService.notify` (idempotente con `notificationsSent`), la campana `writeSellerNotification` para empresas no migradas (Realtime DB, sin marca) y `correoComprador.avisarAlComprador` (idempotente con `correosEnviados`).
- **Cuenta del comprador:** `utils/siteCuenta.js` tiene los ayudantes del código por correo; la sesión se valida con `clienteDeAcceso` (`controllers/sites.js:1999`, token `acceso`) y `pedidosDeCuenta` (`controllers/sites.js:3485`) filtra por `company` y `cliente.cd`. La sesión vive en el navegador (`kq_sesion_<slug>`) y los scripts de la tienda llaman a `/api/v1/sites/public/<slug>/…` en el mismo dominio.
- **Configuración sin tocar productos:** `tienda.cotizables` (`normalizarTienda` en `utils/siteBlocks.js`, fusión en `normalizarContenido`, `controllers/sites.js:142`, y `scriptCotizar`, `utils/siteHtml.js:5751`).
- **Páginas fuera de la caché:** `renderPublico` atiende `?ruta=/pagar` y `?ruta=/baja` (`paginaDeBaja`, `controllers/sites.js:5464`) antes de la caché, en el dominio de la tienda, con CSP propia.
- **Tokenización, banderas y crones:** `wompi-card-security.utils.ts` y `subscription.service.ts` del front; `services/companyFeatureFlags.js` (D-385); `CRON_ENABLED` (`services/cronService.js:111`) y `conLatido` (`services/monitoring/jobHeartbeat.js`).

## Decisions

### D1. Dos colecciones nuevas, solo de backend (pregunta 11)
**`storeSubscriptions/{subId}`**, `subId` = 20 hex de SHA-256(`company|siteId|idempotencyKey`):
- `company`, `siteId`, `planId`, `productId`, `env` (`sandbox | production`, el de las llaves de la fuente) y el plan congelado `plan {name, period, amountCOP, includes[]}`.
- `status` (`creating | active | retrying | payment_failed | cancelled | abandoned`), `closeReason` (`first_charge_declined | source_failed | technical_error | timeout`) y `pause {reason, since}`.
- `buyer {…}`, `clientCd`, `buyerPlanKey` = hash(`company|siteId|planId|correo normalizado`), `paymentSourceId`, `card {brand, lastFour}` y `consent {text, textVersion, acceptedAt, termsPermalink, acceptanceHash, personalAuthHash, originHash}`.
- `anchorDay`, `currentPeriod`, `nextChargeAt`, `paidThrough`, `chargeInFlight {periodId, attempt, since}`, `cancelledAt`, `cancelledBy`, `createdAt`, `updatedAt`.
- **[21-oct] Forma común con la fase A** (su D1): el `subId` pasa a SHA-256(`company|store|siteId|idempotencyKey`); se agregan `source: 'store'` y `collection: 'card'`; el plan congelado queda como `plan {id, name, includes[]}` y el dinero y el calendario salen de los campos comunes `items[]` (`{productId, variant, reference, title, quantity, unitPriceWithTax, unitPriceWithoutTax, taxRate}`), `amount {subtotal, tax, shipping: 0, discount: 0, total}`, `priceDate` y `schedule {mode: 'frequency', frequency, startDate, anchorDay, end: {type: 'none'}}`. `nextChargeAt` se llama `nextPeriodAt` (YYYY-MM-DD de Bogotá); `anchorDay` sale de `schedule`, y el número del próximo período, de `periodIndex(schedule, nextPeriodAt)`, la inversa pura de `periodDate` que esta fase suma a `schedule.js` (un período saltado también avanza `nextPeriodAt`, así que no se puede deducir de un contador). `periodsCreated` significa lo mismo en las dos fases: pedidos creados. `pause.reason` usa la lista común: `feature_off | gateway_missing | gateway_env` en B (además de `manual | base_closed` de A). `paidThrough`, `buyer`, `buyerPlanKey`, `paymentSourceId`, `card`, `consent`, `env` y `chargeInFlight` siguen siendo solo de B.

**`storeSubscriptionCharges/{subId}_{NNN}`**, uno por período:
- `company`, `subscriptionId`, `period {n, from, to}`, `amountInCents`, `currency: 'COP'`.
- `status`: `pending` (sin intento, esperando existencias) `| in_flight | awaiting_confirmation | paid | declined_retry | failed | skipped_no_stock | skipped_paused`.
- `attempts[] {n, reference, submittedAt, transactionId, wompiStatus, uncertain, technical, reason}`, `paidAt`, `orderPending` (verdadero desde `paid` hasta anotar el pedido), `order {reservedAt, orderId, nroPedido, inventoryStartedAt, notifiedAt}`, `notices {<momento>: at}`, `alert {open, reason, since}`, `lockedAt`.
- **[21-oct]** Se agregan `collection: 'card'` y `period.date` (= `period.from`, el campo común con A) y `order.inventoryDoneAt`. El nombre de la colección sigue la pregunta D8 de la fase A (pregunta B8). `pending` también cubre «sin cupo del plan», «empresa suspendida», «producto no vendible» y «total que no cuadra» (D5).

**[21-oct] Estados del período: una sola tabla para las dos fases.** Cada valor significa lo mismo en A y en B; la pantalla común tiene un solo texto por valor y el motivo sale de `alert.reason` o del último intento.

| Valor | Significado | En A | En B |
|---|---|---|---|
| `pending` | abierto, todavía sin pedido ni cobro aprobado | reclamado, esperando crear el pedido | esperando su cobro: sin intento, o detenido por existencias, cupo, suspensión, producto o total |
| `in_flight`, `awaiting_confirmation`, `declined_retry` | cobro en curso, por confirmar o rechazado con reintento | — | sí |
| `paid` | cobrado; el pedido se sigue con `orderPending` y `order.orderId` | — | sí |
| `created` | pedido creado (sin cobro automático) | sí | — |
| `failed` | cerrado sin pedido y sin más intentos, con alerta | total que no cuadra | 3 rechazos, primer cobro rechazado, o total que no cuadra al cerrar la ventana |
| `skipped_paused`, `skipped_no_stock`, `skipped_limit`, `skipped_suspended`, `skipped_product`, `skipped_late` | cerrado al terminar su ventana, sin pedido ni cobro | sí | sí, menos `skipped_late` |

**Quién escribe qué en un período de tarjeta:** el estado y el calendario de la suscripción (`nextPeriodAt`, `paidThrough`) los escriben solo `applyResult` (D4) y el cierre de la ventana del job (D7), cada uno en su transacción y una sola vez por período. El reclamo común del pedido (`periodClaim.js`, D5), en modo `card`, solo reserva `order.reservedAt`, recupera el pedido y anota `orderId`, `nroPedido`, `orderPending: false` y `periodsCreated + 1` (solo si `orderId` estaba vacío). Nunca cambia `status` ni `nextPeriodAt`. Una prueba fija que un `APPROVED` aplicado por el POST, el webhook, la consulta y la conciliación avanza `nextPeriodAt` exactamente una vez y que el pedido suma `periodsCreated` exactamente una vez.

No hay colección de alertas: `alert` sale en la pantalla del comercio y en el resumen del job. Índices compuestos, todos en un solo despliegue con el export vivo (tarea 2.16):

| Colección | Campos | Consulta |
|---|---|---|
| `storeSubscriptions` | `status, nextChargeAt` → **[21-oct]** `collection, status, nextPeriodAt` (el mismo de A) | vencidos y avisos previos |
| `storeSubscriptions` | `status, createdAt` | cierre de altas sin terminar |
| `storeSubscriptions` | `company, createdAt` | lista del comercio |
| `storeSubscriptions` | `company, clientCd, createdAt` | «Mis planes» |
| `storeSubscriptionCharges` | `status, lockedAt` → **[21-oct]** `collection, status, lockedAt` | conciliación |
| `storeSubscriptionCharges` | `orderPending, paidAt` → **[21-oct]** `collection, orderPending, paidAt` | pagados sin pedido |
| `storeSubscriptionCharges` | `company, paidAt` | cuadre del mes |
| `storeSubscriptionCharges` | `company, alert.open` | alertas del comercio |
| **[21-oct]** `site_events` | `siteId, tipo, fecha` | topes de la revisión privada, si no existe ya |

Las búsquedas por un solo campo (`buyerPlanKey`, `subscriptionId`, `storeSubscription.periodId` en `orders`, `ordenId` en `inventoryMovement`) usan índices simples y verifican la empresa en memoria. Si alguna pide índice al probarla en sandbox, se suma en 2.16.

### D2. Referencia por intento, con un prefijo que no choca
`TSUS-{subId}-{NNN}-{A}`, de 31 caracteres. Los pedidos usan tres letras y guion (`ABC-000123`, `POS-…`) y Katuq usa `NOTIF-`, `SUB-` y `BILL-`. `references.js` (puro) valida la forma y deriva el id del período sin consultar. Ante un envío incierto, el intento A repite su referencia; solo un rechazo terminal abre A+1.

### D3. Alta: primer cobro con el comprador presente
1. **Página aislada en el dominio de la tienda:** `renderPublico` con `?ruta=/suscribirse&plan=<id>`, antes de la caché como `/baja`. No va en el espacio JSON del API porque así el formulario llama a `/api/v1/sites/public/<slug>/…` en el mismo origen, la página de cambiar tarjeta (D8) lee la sesión que la tienda ya guarda sin ponerla en la URL y `gracias?pedido=` es relativa.
   - Render propio, sin píxeles ni scripts de terceros, `no-store` y CSP `default-src 'none'`, `script-src`/`style-src` con nonce, `connect-src 'self' <API de Wompi del entorno>`, `form-action 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`.
   - Si la revisión de seguridad (0.7) pide un origen aparte, la página se sirve desde el host del API y la sesión llega con un token de un solo uso; lo demás no cambia.
   - Se llega desde la tarjeta y la ficha (`scriptSuscribir`, hermano de `scriptCotizar`) si el sitio expone la capacidad (D8).
2. **En el navegador:** genera `idempotencyKey` al abrir el formulario, trae los términos (`/merchants/{publicKey}`), tokeniza directo en Wompi (pregunta 3) y muestra el consentimiento.
3. **`POST /v1/sites/public/:slug/suscripciones`** (`bodyPublicoAcotado` + `pedidoLimiter`) con `{planId, idempotencyKey, token, acceptanceToken, personalAuthToken, buyer, consent:{textVersion, accepted:true}}`.
   - **[21-oct]** Más `{frequency, variant, quantity}`. El servidor exige que la frecuencia esté en `plan.frequencies`, la variante en `plan.variants` (o vacía si el plan no tiene) y la cantidad entre 1 y `plan.maxQuantity`; si no, 400 `INVALID_PLAN_CHOICE` sin llamar a Wompi. Arma `items[]` y `amount` en el servidor y los congela con `priceDate` = hoy. Del navegador no se toma ningún monto.
     - **Monto:** `amountCOP` del plan es el precio por unidad **con IVA**, el mismo que la página muestra («Desde $69.900/mes»). `items[0].unitPriceWithTax = amountCOP`; `taxRate` = el IVA del producto (`precio.precioUnitarioIva`, leído de `products`, solo lectura) **en el alta**, y solo sirve para desglosar: `unitPriceWithoutTax` = `amountCOP / (1 + taxRate/100)` con el redondeo de `siteOrden.centavos`. `amount.total` = `amountCOP × cantidad`, que es lo que se cobra cada período. Un cambio posterior del IVA del producto no cambia ni el cobro ni el pedido (D5).
     - **Revisión antes del primer cobro**, la misma de las renovaciones (D5): producto de la empresa, activo y no cotizable; cupo y estado de la empresa; existencias de lo inventariable; pedido armado en memoria con su total igual a `amount.total` (±$1). Si algo falla, 409 con el motivo y sin llamar a Wompi.
     - **Ficha del comprador:** con sesión de la cuenta (`clienteDeAcceso`), `clientCd` es el de la sesión. Sin sesión, la ficha de la empresa con el mismo correo (`correo_electronico_comprador`) o una nueva; nunca por coincidencia de teléfono. El pedido de cada período usa esa ficha (`docExistente`). Ver revisión privada. `buyerPlanKey` incluye la variante, no la frecuencia: un comprador puede tener el mismo plan en dos moliendas, pero no el mismo plan y variante dos veces con distinta frecuencia (para más, sube la cantidad).
   - **Rechazos:** 400 `SENSITIVE_CARD_DATA_NOT_ALLOWED`. 403 si la bandera está apagada, el modo global no es `cobro` (D7), el plan no está publicado o el comercio no es Premium. 409 `OWN_WOMPI_REQUIRED`. 409 `SUBSCRIPTION_EXISTS` si, por `buyerPlanKey` y en la transacción de creación, ese comprador ya tiene el plan `active`/`retrying` o un alta en `creating` con cobro sin resolver.
   - **Máquina de estados del alta:**

| Paso o resultado | Suscripción | Período 001 |
|---|---|---|
| Crea el documento (si existe, devuelve su estado sin repetir nada) | `creating` | — |
| Falla la fuente (error o timeout; una fuente huérfana no cobra) | `abandoned` (`source_failed`) | — |
| Crea la fuente, reclama (`claimSignupCharge`) y envía | `creating` | `in_flight`, intento 1 |
| `APPROVED` | `active` | `paid` → pedido (D5) |
| `DECLINED` o `ERROR` | `abandoned` (`first_charge_declined`), sin `paymentSourceId` | `failed` |
| 4xx técnico | `abandoned` (`technical_error`), sin `paymentSourceId`, `alert` | `failed` |
| `PENDING` | `creating` | `awaiting_confirmation` |
| Incierto | `creating` | `in_flight`, intento `uncertain` |

   - **Otra tarjeta:** tras un rechazo, la página genera otra `idempotencyKey` y otro token: es un alta nueva con su propio `subId`, y la rechazada ya no cuenta para `SUBSCRIPTION_EXISTS`. El límite de un intento por día es de los cobros sin el comprador (D4) y no aplica aquí; el freno es el limitador.
   - **Respuesta:** `202 {subscriptionId, status: active|declined|pending, statusToken}`; el `statusToken` es un HMAC del servidor y dura 30 min.
4. **`GET …/suscripciones/:id/estado?t=`.** Si el período 001 sigue `in_flight` o `awaiting_confirmation`, consulta a Wompi y llama a `applyResult`. Con `APPROVED` crea el pedido en esa llamada (D4) y devuelve `active` con `nroPedido`; si no, `declined` o `pending`. Con `active`, la página lleva a `gracias?pedido=`.
5. **Alta sin terminar.** El job cierra como `abandoned` (`timeout`), y borra `paymentSourceId`, la que siga en `creating` a las 24 h **sin período 001**. Con un intento `in_flight`, `awaiting_confirmation` o incierto no se cierra: sigue en conciliación (D7) y a las 72 h abre `alert` (`signup_unresolved`).

### D4. Cobro por período: reclamar → enviar → aplicar (`charge.js`)
- **Reclamar.** Una transacción sobre el período y la suscripción escribe el intento y su referencia **antes** de llamar a Wompi. Hay dos entradas:
  - `claimSignupCharge` (comprador presente): `creating`, con `paymentSourceId`, período 001 sin intentos, alta de menos de 30 min y modo `cobro`.
  - `claimRenewal` (job): `active` o `retrying`, con `paymentSourceId`, sin `pause`, `env` igual al de las llaves actuales, sin intento `in_flight` de menos de 10 min, sin intento ese día civil en Bogotá, período en su ventana (D7) y modo `cobro`.
- **Enviar** (`wompiMerchant.js`): `POST /transactions` con `payment_source_id`, monto, `COP`, `reference`, `signature` = SHA-256(referencia + centavos + COP + `integritySecret` del comercio), `customer_email`, `installments: 1` y `recurrent` (pregunta 2). Timeout de 30 s; no cobra si el prefijo de la llave y `testMode` no coinciden.
- **Clasificar:**
  - timeout, red, 5xx o sin id: `uncertain`, y se concilia (D7);
  - 422 por referencia repetida: `uncertain` y `alert`;
  - otro 4xx: `technical`, sin cobro, con `alert` desde el primero. No cuenta como rechazo del comprador. En renovaciones se repite la misma referencia otro día dentro de la ventana, máximo 3 veces; si la ventana cierra, el período queda `skipped_paused`.
- **Aplicar** (`applyResult`, en transacción). Crea `integrationEvents/wompi-transaccion-<id>`; si ya existe para otro período, rechaza.
  - `APPROVED`: período `paid` con `paidAt` y `orderPending: true`; avanzan `nextChargeAt` (**[21-oct]** `nextPeriodAt`, y solo si el período no estaba ya `paid`: es el único que lo avanza al cobrar, D1) y `paidThrough`; `creating` y `retrying` pasan a `active`. En una suscripción `cancelled` o `abandoned` también queda `paid` (la plata entró) y se abre `alert` (`paid_after_close`); en `cancelled` ese período se entrega (D8).
  - `DECLINED` o `ERROR`: en el alta, D3; en renovaciones, reintento o `failed` (D7).
  - `PENDING`: `awaiting_confirmation`. Un aviso atrasado nunca baja un `paid`.
- **Toda vía que aplica un `APPROVED` encadena `periodOrder` (D5) enseguida:** la respuesta del POST (alta y job), el webhook, la consulta de estado del alta y la conciliación. Así hay pedido aunque la cuenta no tenga URL de eventos (pregunta 12). El paso 2 del job es la red ante una caída entre los dos.

### D5. Un pedido por período pagado (`periodOrder.js`, módulo sensible)
**[21-oct]** Los pasos 1, 2 y 7 son los del reclamo común de la fase A (`periodClaim.js`) en modo `card` (D1: no cambia `status` ni el calendario). Si la fase A no acepta ese modo (pregunta B13), esta fase los implementa igual en `periodOrder.js`, como el 18-oct.

1. **Reservar** `order.reservedAt` en transacción, solo con `status == 'paid'` y `orderPending == true`. Sale si ya hay `orderId` o una reserva de menos de 10 min.
2. **Recuperar:** `orders` por `storeSubscription.periodId`, con la empresa verificada. Si el pedido existe, no crea otro: sigue con él en el paso 5. El `orderId` del período se anota solo en el paso 7, así que una corrida a medias nunca parece terminada.
3. **Armar** con `siteOrden.construirOrden` **directo** (función pura, `utils/siteOrden.js:235`): producto leído de `products` (solo lectura) con `precioUnitarioConIva` = monto congelado (**[21-oct]** por unidad, con la `variante` y la `cantidad` de `items[]`); `envioBase: 0`; `estadoPago: 'Aprobado'`, `faltaPorPagar: 0`, `anticipo`, `pagoTransaccionId` y `storeSubscription {subscriptionId, periodId, reference}`. Si el total difiere en más de 1 peso de lo cobrado, no crea: abre `alert` y deja `orderPending: false` para que el job no insista.
   - **[21-oct] Sin el núcleo de D-496.** El ajuste de la mañana decía armar «a través del núcleo extraído por D-496», como la fila de la fase A D9. Ese núcleo (`crearPedidoDeTienda`, su D1 y D3) no tiene modo de precio congelado: resuelve el precio del maestro, aplica promociones y la lista del cliente, genera el enlace de pago y la reserva, y hereda el 409 `COTIZABLE`. Por eso se vuelve al armado del 18-oct; con D-496 solo hay orden de unión (pregunta B13).
   - **[21-oct] IVA congelado:** `construirOrden` deriva el sin IVA con el porcentaje del producto que recibe (`precioConSinIva`, `siteOrden.js:47-60`). Se le pasa una **copia** del producto con `precio.precioUnitarioIva` = `items[].taxRate`; el producto no se escribe. Así el desglose es el del alta y el total con IVA es el cobrado.
   - **[21-oct] Fecha de entrega** (pregunta B11): `entrega.fecha` = el día de `paidAt` en Bogotá o, si `revisarFechaDeEntrega` (`utils/siteConfiguracion.js:307`) lo rechaza por día bloqueado u hora de corte, el siguiente día que pase, hasta 14 días (`siguienteFechaDeEntrega`, función pura nueva junto a ella). Horario «LO MAS PRONTO POSIBLE». El cupo del día no se revisa (el período ya está cobrado); el pedido lleva `siteId` y `fechaEntrega`, así que ocupa cupo para los demás. Sin día válido, la fecha del cobro y `alert` (`delivery_date`).
   - **[21-oct]** Como la revisión previa al cobro ya armó el pedido y comparó el total (abajo), un total distinto aquí solo puede venir de un cambio de código entre las dos; queda la alerta como red.
4. **Crear:** `resolverClienteEnCRM` (se exporta de `sites.js` sin cambios) y `orderService.createOrder(orden, company, {skipDuplicateCheck: true})`. La idempotencia la da el período, no los 2 min.
   - **[21-oct]** Con la respuesta D14 de la fase A, el pedido usa el id `sub_{periodId}` (`orderRef`) y un segundo documento es imposible.
   - **[21-oct]** `createOrder` cuenta el pedido en el cupo del plan (`limitsService.createOrderWithinLimit`). Si lanza `ORDER_LIMIT_REACHED` o `SUBSCRIPTION_SUSPENDED`, el período queda `paid` con `orderPending: true` y `alert` (`order_blocked`); el paso 2 del job lo reintenta cada día y nunca se cobra otra vez (pregunta B7).
5. **Descontar una sola vez**, según la marca del pedido y `order.inventoryStartedAt` del período:
   - **[21-oct]** ninguna línea es inventariable (`disponibilidad.inventariable === false` en el producto vigente, el mismo dato que lee `updateByPOS`): no se llama a `updateByPOS`, que exige bodega; se anota `order.inventoryDoneAt` con `inventory: 'not_applicable'` y no se pone la marca. Con líneas mixtas se llama como siempre, y `updateByPOS` omite las no inventariables;
   - el pedido tiene `inventarioDescontadoAlCrear`: nada;
   - sin marca ni `inventoryStartedAt` (nunca se intentó): se escribe `inventoryStartedAt` en transacción, se llama a `updateByPOS(…, "tienda-en-linea")` y, si sale bien, se pone `inventarioDescontadoAlCrear`;
   - sin marca y con `inventoryStartedAt` (caída o `success: false`): caso ambiguo. Si `inventoryMovement` tiene movimientos con `ordenId` del pedido, se pone la marca sin descontar; si no, **no se reintenta**: se abre `alert` (`inventory_uncertain`) para que el comercio revise la existencia, y se sigue.
6. **Avisar.** `notify(…, "order_created")` y `avisarAlComprador(…, "pago_aprobado")` son idempotentes y se repiten sin riesgo al recuperar. La campana de las empresas no migradas (`writeSellerNotification("ORDER_CREATED")`, como `crearPedido`) no tiene marca: se pone `order.notifiedAt` en transacción antes de enviarla y sale como máximo una vez.
7. **Anotar** `orderId`, `nroPedido` y `orderPending: false` en el período, y `clientCd` en la suscripción.

Las renovaciones no pasan por `topeDePedidosDeTienda` ni `consumeStoreOrderSlot`, y no se informan como conversión. **[21-oct]** Pero sí cuentan en el cupo, porque `createOrder` siempre lo hace (pregunta B4).

**Antes de cobrar una renovación** se revisan la bandera, el Wompi propio y su entorno (si fallan, pausa, D7); que el producto exista y sea de la empresa (**[21-oct]** y que esté activo y no esté en `tienda.cotizables` de la tienda publicada; si no, el período queda `pending` con alerta y al cerrar la ventana `skipped_product`, como la fase A D18); que la tienda tenga bodega, y las existencias con `getRealStockMap`, solo lectura (pregunta 7). **[21-oct]** Además se arma el pedido en memoria con el paso 3, sin escribir, y su total debe ser `amount.total` (±$1); si no, `pending` con `alert price_mismatch`, sin cobrar, y al cerrar la ventana `failed`. Si falta producto, bodega o existencias, no se cobra: el período queda `pending` con el motivo, se avisa al comercio y se revisa cada día de la ventana; al cerrarla, `skipped_no_stock` y aviso al comprador.

**[21-oct] Ajustes a esa revisión:**
- **Lo no inventariable** (F2-43·7): las líneas con `disponibilidad.inventariable === false` en el producto vigente no se revisan en `getRealStockMap`. Si ninguna línea es inventariable, tampoco se exige bodega. Evora Cloud (un servicio) se cobra cada mes sin existencias.
- **Cupo y estado de la empresa** (solo lectura de `companies`, con las mismas reglas de `createOrderWithinLimit`: `subscriptionStatus` activo o de prueba, y cupo del mes si el plan tiene tope): si el pedido no se podría crear, no se cobra. El período queda `pending` con el motivo (`limit` o `suspended`), se avisa al comercio y al cerrar la ventana queda `skipped_limit` o `skipped_suspended` con aviso al comprador. Mismos estados que la fase A.
- La revisión se repite en el alta antes del primer cobro (D3): sin cupo o con la empresa suspendida, 409 `STORE_CANNOT_TAKE_ORDERS` sin llamar a Wompi.

### D6. Webhook: una rama nueva antes de las existentes (módulo sensible)
En `procesarNotificacionWompi`, después de guardar el crudo y antes del caso «Payment Link», entra si `isStoreSubscriptionReference(reference)` (función pura nueva en `wompiPagoPedido.js`):
1. Lee el período con el id derivado. Si no existe, 200 `ignorado`.
2. Toma `getWompiCredentials(company)`, exige `source: 'company-config'` y valida **solo** con el secreto del comercio.
3. Confirma con Wompi en el entorno del comercio; referencia, monto y moneda deben coincidir con el intento.
4. `storeSubscriptions/webhook.js` llama a `applyResult` y, con `APPROVED`, a `periodOrder`.

No depende de banderas ni modos: aplica siempre cobros ya enviados. Un fallo pasajero responde 5xx y Wompi reintenta; un rechazo, 200 `ignorado` con el motivo. Las ramas de Katuq, enlaces y POS no cambian.

### D7. Modos, jobs, pausas y reintentos
**Modos globales:** `STORE_SUBSCRIPTIONS_BILLING` = `apagado | sombra | cobro` y `STORE_SUBSCRIPTIONS_AVISOS` = `apagado | sombra | envio`. Un valor ausente, vacío o desconocido se lee como `apagado` (D-385), con prueba.

**[21-oct] Dónde viven (D-505, D-518):** no en el `.env`. Son las llaves `storeSubscriptionBilling` y `storeSubscriptionNotices` del documento `config/feature_flags`, junto a `storeSubscriptionDeliveries` de la fase A. Un módulo común `services/storeSubscriptions/modes.js` hace un `get` de ese documento por corrida del job y por alta (no es una caché nueva); si la lectura falla, cuenta como `apagado`. En el resto de este diseño, los nombres de las variables se leen como esas llaves.
- **Dueño de `modes.js`:** la fase A no lo define (su tarea 3.1 solo lee `storeSubscriptionDeliveries`). Lo crea esta fase (tarea 2.0) con las tres llaves y su lista cerrada de valores; si la fase A lo crea antes, esta fase solo suma sus dos llaves (pregunta B13).
- **Cómo se cambian:** el script de interruptores generales de D-496 (`scripts/set-interruptor-general.js`) solo acepta `--on|--off` (D-496 `design.md:332`), y estos modos tienen tres valores. Se le agrega `--value <valor>`, validado contra la lista cerrada de cada llave (`storeSubscriptionBilling`: `apagado|sombra|cobro`; `storeSubscriptionNotices`: `apagado|sombra|envio`; `storeSubscriptionDeliveries`: `apagado|sombra|crear`), que simula por defecto y escribe una sola llave con `--execute`. Si el script de D-496 no está unido, esta fase lo crea con ese mismo contrato.
- **Topes de seguridad** de la revisión privada (altas por sitio y por comprador, corte por rechazos, avisos por día): constantes en el código, no en el `.env` ni en Firestore. No son configuración de empresa ni interruptores; cambiarlos es un diff revisado.

| Modo de cobro | Alta | Renovaciones | Cobros ya enviados |
|---|---|---|---|
| `apagado` | 403, sin selector | no | el job no corre; webhook y consulta del alta siguen |
| `sombra` | 403, sin selector | solo cuenta | consulta (`GET`) y termina pedidos; no reenvía |
| `cobro` | sí | sí | consulta y reenvío con las reglas de abajo |

**`storeSubscriptionsCharge`, 6:45 COT**, detrás de `CRON_ENABLED` y con `conLatido`:
1. **Conciliar** `in_flight` y `awaiting_confirmation` con `GET /transactions/{id}` cuando hay id. Se reenvía la misma referencia solo si pasaron 10 min, el modo es `cobro` y la suscripción sigue `creating`, `active` o `retrying` con `paymentSourceId`. **Una `cancelled` o `abandoned` nunca reenvía:** solo consulta o espera el webhook, con `alert` (`cancelled_with_uncertain_attempt`), como `billingService`. A las 72 h sin respuesta, `alert` para revisarlo por referencia en el panel de Wompi.
2. **Terminar pedidos** de los períodos con `orderPending == true`.
3. **Cobrar** vencidos y reintentos (`claimRenewal`).
4. **Cerrar altas sin terminar** (D3.5).

Los pasos 1, 2 y 4 corren para todos los cobros abiertos, aunque el comercio tenga la bandera apagada: no dejan plata sin pedido. El paso 3 omite, y cuenta, a los comercios sin bandera, sin Wompi propio o con otro entorno. En `sombra` el paso 3 solo escribe el resumen.

- **Ventana:** un período se cobra desde `period.from` hasta 5 días después, con un intento por día civil como máximo. Nunca se cobra un período con la ventana cerrada. **[21-oct]** Con frecuencia semanal la ventana (5 días) y el último reintento (+5) terminan antes del período siguiente (+7), así que dos períodos nunca se cobran a la vez; la prueba 1.2 lo fija.
- **Pausa:** si la bandera se apaga, el comercio pierde su Wompi propio o cambia de entorno, la suscripción guarda `pause {reason, since}` y no se cobra. Si la ventana de un período cierra en pausa, queda `skipped_paused`, sin cobro: `nextChargeAt` (**[21-oct]** `nextPeriodAt`) pasa al siguiente, `paidThrough` no se mueve y una `retrying` vuelve a `active`. El comprador recibe un aviso («este período no se cobró ni se enviará») y el comercio una alerta. Al quitar la pausa solo se cobra el período en ventana. La pausa no cancela sola.
- **Reintentos** (pregunta 6): día 0, +2 y +5. Cada rechazo avisa al comprador. Al agotarlos, período `failed`, suscripción `payment_failed`, campana `STORE_SUBSCRIPTION_FAILED` y correo al comercio.
- **`storeSubscriptionsNotices`, 8:15 COT**, con `STORE_SUBSCRIPTIONS_AVISOS`: aviso previo con monto, fecha, tarjeta y enlace a «Mi cuenta» (`correoComprador.enviarAvisoDeSuscripcion`, nueva); marca en `notices.<momento>` en transacción antes de enviar. No avisa suscripciones en pausa. **[21-oct]** Anticipación por frecuencia (pregunta B3): 1 día semanal, 2 cada 2 semanas, 3 mensual y cada 2 meses, 7 anual.
- **[21-oct] Filtro por fase:** los tres pasos de cobro y el de avisos toman solo `collection == 'card'`; el trabajo de la fase A toma solo `manual`. Ninguno toca los documentos del otro.

### D8. «Mis planes», el comercio y el Seller
- **«Mis planes»**, con `acceso` y filtrado por la empresa del sitio y el `clientCd` de la sesión (**[21-oct]** que se fija como dice D3, nunca por teléfono; ver revisión privada): `GET /public/:slug/cuenta/planes` y `POST …/cuenta/planes/:id/cancelar`. Cambiar tarjeta: página aislada `?ruta=/mis-planes/tarjeta&plan=<id>` (misma CSP de D3), que lee la sesión del navegador y la manda en el cuerpo de `POST …/cuenta/planes/:id/tarjeta`; 409 `CHARGE_IN_PROGRESS` con `chargeInFlight`. `cuenta/suscripcion` (correos, D-318) no cambia.
- **Cancelar:** `cancelled`, `paidThrough` al fin del período pagado y se borra `paymentSourceId` de inmediato. No se reclaman intentos; un intento abierto se resuelve solo por consulta o webhook, nunca reenviando (D7). Si se aprueba, ese período se entrega.
- **Cambiar la tarjeta:** en `retrying`, el próximo intento usa la nueva. En `payment_failed` no reactiva: se ofrece suscribirse de nuevo.
- **Rutas del comercio** (`auth` + `requireJwtTenant` + `requireFeature('storeSubscriptions')`; cancelar exige `requireRole(["Administrador"])`): `GET /v1/sites/suscripciones`, `GET …/capacidad` (`{disponible, motivo}`, calculado en el backend), `GET …/:id`, `POST …/:id/cancelar` y `GET …/cuadre?mes=`. Se registran antes de `router.get("/:id")` (`routers/sites.js:357`), en `controllers/storeSubscriptions.js` (SRP).
  - **[21-oct]** Van en el router común de la fase A, `/v1/store-subscriptions` (su D8 y D12), no en `/v1/sites`: `GET /` (las dos fases, con filtro `source`), `GET /capacity`, `GET /:id`, `POST /:id/cancel` y `GET /reconciliation?month=`. Consultar y cancelar no exigen la bandera (como en A: con la bandera apagada se ve y se cancela lo que quedó). `POST /:id/pause` y `/resume` responden 409 `NOT_SUPPORTED_FOR_CARD` con `collection: 'card'` (pregunta B5). Así no hace falta tocar el orden de `routers/sites.js`.
- **Configuración:** `tienda.subscriptionPlans [{id, productId, name, period, amountCOP, includes[≤6]}]`, hasta 10, normalizada en `normalizarTienda` y conservada en `normalizarContenido`.
  - **[21-oct]** Forma nueva: `[{id, productId, name, frequencies[≥1 de weekly|biweekly|monthly|bimonthly|yearly], variants[≤20 etiquetas de las variantes del producto], maxQuantity (1-10), amountCOP (por unidad y por cobro, con IVA, entero > 0), includes[≤6]}]`.
  - **[21-oct] Validación del plan** al guardar (`PUT /v1/sites/edit`, solo lectura de `products`) y otra vez al suscribirse: el producto existe, es de la empresa del sitio, está activo y **no** está en `tienda.cotizables`; si no, el plan no se guarda y el editor dice cuál. Un producto marcado para cotizar después de crear el plan deja de cobrarse (D5). `period` se lee como `frequencies: [period]` para un plan guardado con la forma vieja (no hay ninguno: 0 tareas implementadas). Las variantes se validan contra `products.variantes` al guardar y al suscribirse (solo lectura). El nombre `subscriptionPlans` vive dentro de `sites.tienda` y no tiene que ver con la colección `subscriptionPlans` de los planes de Katuq.
- **Seller:**
  - Sección «Planes de suscripción» en `sitio-editor`, junto a `campo-cotizables`, según `capacidad.disponible`; con `false`, un aviso con el motivo. La UI no mira el proveedor (gate VI). Sigue el NgModule de `sitio-editor`.
  - `StoreSubscriptionsComponent` **standalone, OnPush, con `loadComponent`** en `sitios/suscripciones` (base `cfg-pagina`, D-400; tabla PrimeNG; estados en par fuerte/suave), con `StoreSubscriptionsService extends BaseService`. Se entra desde Sitios y el editor, sin tocar `menus`.
  - **[21-oct]** Es la pantalla de la fase A, `ventas/suscripciones` (su D7 y D9), con una columna y un filtro de origen («Pedido» o «Tienda»). La fase B le suma tarjeta, último pago, cobro en curso y el cuadre del mes. El botón de Sitios y del editor lleva a esa ruta con el filtro «Tienda». Aparece con cualquiera de las dos banderas (fase A D12). El servicio es el mismo `StoreSubscriptionsService`.
  - **[21-oct]** La sección del editor pide, por plan: producto, nombre, frecuencias permitidas, variantes permitidas (de las del producto), cantidad máxima, precio por unidad y «Qué incluye». La tarjeta y la ficha muestran «Desde $X/mes» (o «/semana», «cada 2 semanas», «cada 2 meses», «/año» si el plan admite una sola frecuencia; «Desde $X por entrega» si admite varias).

### D9. [21-oct] Un solo modelo con la fase A (D-518 F2-43·1)
Lo que la fase B toma de la fase A, sin duplicarlo, y lo que sigue siendo propio:

| Pieza | De la fase A (dueña) | Propio de B |
|---|---|---|
| Colecciones, `pause`, `items[]`, `amount`, `priceDate`, `schedule`, `nextPeriodAt`, `storeSubscription` en el pedido | sí (A D1) | `collection: 'card'`, `plan`, `buyer`, `paymentSourceId`, `card`, `consent`, `env`, `paidThrough` |
| Calendario `schedule.js` (`periodDate`, fin de mes, topes por origen) | sí (A D2) | `yearly`; fin `none`; `startDate` = hoy (el período 1 se cobra en el alta) |
| Tabla de estados del período | sí (D1, la misma para las dos) | estados del cobro (`in_flight`, `awaiting_confirmation`, `declined_retry`, `paid`) |
| Reservar, recuperar y anotar el pedido (`periodClaim.js`) | sí (A D5 pasos 2 y 8), en modo `card` sin tocar estado, calendario ni contador fuera de `periodsCreated` | el reclamo del cobro (`claimSignupCharge`, `claimRenewal`) va antes y aparte (D4); `nextPeriodAt` lo avanza `applyResult` |
| Crear el pedido | `createOrder` (y D14 de A) | `construirOrden` directo con el monto y el IVA congelados (D5), sin el núcleo de D-496 |
| Inventario | regla «una vez» y lo no inventariable | `updateByPOS` + marca, como la tienda (D5) |
| Modos | `config/feature_flags` y su llave `storeSubscriptionDeliveries` | `storeSubscriptionBilling`, `storeSubscriptionNotices`; `modes.js` y `--value` del script si A no los crea (D7) |
| Rutas del comercio y pantalla | `/v1/store-subscriptions`, `ventas/suscripciones` | cuadre, capacidad, tarjeta y cobro en curso |
| Cuándo se crea el pedido | — | al aprobarse el cobro (A: el día de la entrega) |

- **Orden de construcción y de unión (T·2):** F2-41 (ya unido, `c9e74ff0`) → D-496 → fase A → fase B → pago rechazado de TX-34. Con D-496 solo hay orden de unión: la fase B no usa su núcleo. La fase B empieza su grupo 2 cuando `schedule.js`, `periodClaim.js` (con el modo `card`) y el router común de la fase A estén unidos; `modes.js` y el script con `--value` los crea esta fase si no existen (D7). Si la fase A cambia al aprobarse, este diseño la sigue (preguntas B8 y B13).
- **Frecuencias en el calendario:** `schedule.frequency` toma el valor que eligió el comprador entre las del plan. Con `monthly` y `bimonthly` el `anchorDay` es el día del alta y un mes corto cae en su último día (A D2). `yearly` suma 12 meses con la misma regla (29 de febrero → 28 de febrero).
- **`paidThrough`** = `periodDate(n + 1)` menos un día, en Bogotá.
- **Lo que no cambia de D-497:** referencia `TSUS-`, reclamo antes de enviar, conciliación, webhook, alta con el comprador presente, páginas aisladas, «Mis planes», ventana de 5 días y reintentos.

## Write-set (D-134) y contract tests

Lista cerrada de lo que escriben el alta, el cobro, el webhook y el pedido:

| Escribe | Solo por |
|---|---|
| `storeSubscriptions`, `storeSubscriptionCharges` | módulos nuevos |
| `consecutives` | `orderRepository.getNextConsecutive`, dentro de `createOrder` |
| `orders` (documento nuevo) | `orderService.createOrder` |
| **[21-oct]** `companies.currentMonthOrders`, `monthlyOrderLimit`, `orderCountResetDate`, `lastCounterReset` | `limitsService.createOrderWithinLimit`, dentro de `createOrder` (siempre lo hizo; faltaba en la tabla) |
| `orders` (campos del pedido creado) | `inventarioDescontadoAlCrear` (D5), `notificationsSent.*` (`notify`), `correosEnviados.*` (`correoComprador`) |
| `clients` | `resolverClienteEnCRM` |
| `inventory`, `inventoryMovement`, `inventory_audit` | `inventoryService.updateByPOS(…, "tienda-en-linea")` |
| `integrationRawEvents`, `integrationEvents` | webhook y marcador por transacción |
| `sites` (contenido) | `PUT /v1/sites/edit` existente |
| `notifications` | `sellerMobileNotifications.notifyOrderCreated`, dentro de `createOrder` |
| `notification_queue` | tren unificado de `notify` (`notificationHooks.onOrderCreated`) |
| Realtime DB `ActualizacionTicket{company}` | `writeSellerNotification` (`ORDER_CREATED`, `STORE_SUBSCRIPTION_FAILED` y `NEGATIVE_STOCK` desde `updateByPOS`) |
| `integration_audit` | `conLatido` |
| **[21-oct]** `site_events` | eventos de los topes y del corte de altas de la revisión privada: ids y huellas, sin datos personales |
| **[21-oct]** `config/feature_flags` (una llave) | solo el script de interruptores, a mano y con `--execute`; ningún proceso del cobro lo escribe |

- **Solo lectura:** `products`, precios, listas de precios, `companies` (**[21-oct]** salvo el cupo de la fila anterior), configuración de integraciones, `warehouses` y **[21-oct]** `config/feature_flags` (para el alta, el cobro, el webhook y el pedido).
- **Prohibido:** catálogo, precios, `subscriptions`, `billing_*`, `wompiSubscriptionEvents` y los campos de cobro de `companies`.

**Contract tests, primero (Artículo VIII)**, con `scripts/lib/firestoreFalsa.js` y `tests/integrations/wompiWebhookHarness.js`; el detalle está en las tareas 1.1-1.8:
1. **Write-set como lista de permitidos:** la Firestore falsa falla ante cualquier escritura fuera de la tabla, y `products`, precios y listas de precios quedan idénticos. Los servicios de aviso y `conLatido` van con dobles que verifican la llamada; lo que escriben por dentro lo cubren sus suites.
2. **Wompi:** cuerpos en fixture, campos de tarjeta rechazados y ningún log con token, correo ni llave.
3. **Dinero e idempotencia (1.5) y alta (1.6)**, verificados con mutación.
4. **Webhook, prefijo, modos y endpoints:** `TSUS-` solo con el secreto del comercio; ningún `nroPedido` ni prefijo de Katuq empieza por `TSUS-`; modo desconocido = `apagado`; códigos y filtro por empresa.

## Banderas, observabilidad y migraciones

- **Bandera por comercio:** `featureFlags.storeSubscriptions`, en el catálogo del back y del front. Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada.
- **Modos globales:** ausente o desconocido = `apagado`. Se retiran 30 días después de quedar en `cobro`/`envio` sin incidentes (Artículo XII). **[21-oct]** Viven en `config/feature_flags` (D7); retirarlos es borrar sus dos llaves y su lectura en el código. Dueño: Daniel.
- **Logs:** `firebase-functions/logger` con `correlationId` = referencia, resultado `success|error|retry` y latencia; solo ids.
- **Resumen del job:** `{job, modo, revisadas, cobradas, aprobadas, rechazadas, inciertas, pedidos, omitidas, pausadas, errores, duracionMs}`.
- **Migraciones:** no hay. `scripts/store-subscriptions-simulate.js` es de solo lectura y `--dry-run` por defecto; las banderas se cambian con `set-company-feature.js`, que simula por defecto.

## Gates constitucionales

- **I:** D-497; no se implementa sin specs y tasks aprobadas. **II:** las specs no nombran tecnología. **III:** sin enmiendas; las excepciones de VII y IX se registran en 0.1.
- **IV:** D2, D4 y D5. **V:** crudo antes de procesar. **VI:** la UI no ramifica por proveedor: la capacidad la calcula el backend y Wompi vive en un adaptador.
- **VII:** `correlationId`, resultado, latencia, latido e `integrationEvents`. Provider-dashboard sirve hoy a integraciones de pedidos y catálogo; aquí el cobro que afecta un pedido sale en la pantalla Suscripciones con su pedido y su `alert` (excepción acotada, 0.1).
- **VIII:** contract tests primero. **IX:** pantalla nueva standalone, OnPush y lazy; sin signals ni `@if` porque es Angular 14, y la sección del editor sigue su NgModule (excepción, 0.1).
- **X:** secreto del dueño y confirmación con Wompi. **XI:** hashes, sin datos personales en logs. **XII:** banderas con dueño y fecha (**[21-oct]** los modos, en `config/feature_flags`, D-505). **XIII:** dos specs de unas 3 páginas (**[21-oct]** cuatro: TS, CR, PS y OC, cada una de 3 páginas o menos). **XIV:** D-497 y las respuestas de 0.1 van a `CONTRACT.md`. **XV:** `integrations.wompi`, solo lectura.

## Fases

0 (specs, Wompi en sandbox, legal y seguridad) → 1 backend → 2 comprador → 3 Seller → 4 encendido: FLORECER sandbox, sombra, FLORECER producción con monto bajo y luego comercio por comercio. El detalle y las dependencias están en `tasks.md`. **[21-oct]** El grupo 2 (backend) empieza después de unir las piezas comunes de la fase A (D9).

## Risks / Trade-offs

- **Cuenta sin cobro con fuente guardada:** la fase 0 es la compuerta; sin confirmación de Wompi para esa cuenta no se enciende.
- **Carrera entre leer existencias y descontar:** igual que hoy; el pedido pagado queda pendiente de despacho.
- **Llaves cambiadas o Wompi apagado:** pausa (D7); nunca la cuenta de la plataforma. **Sin URL de eventos:** más consultas a Wompi.
- **Descuento ambiguo:** se prefiere una alerta a un doble descuento (D5).
- **Seguridad:** revisión en el backend privado antes de encender; no se detalla aquí porque este repo es público. **[21-oct]** La ampliación (elección de frecuencia, variante y cantidad desde la página, cobros semanales) está en la misma revisión privada.
- **[21-oct] Cobro aprobado sin pedido:** por empresa suspendida o cupo agotado entre la revisión y el pedido. Queda alerta y reintento diario; nunca un segundo cobro (B7).
- **[21-oct] Dependencia de la fase A:** si la fase A se retrasa, la fase B también. A cambio, hay un solo calendario, un solo reclamo de período y una sola pantalla.
- **[21-oct] Fecha de entrega:** un pedido cobrado puede quedar para un día con el cupo lleno; se prefiere a no entregar lo cobrado (B11).
- **[21-oct] Defecto existente de inventario** en el camino por bodega: ver revisión privada y pregunta B12.

## Open Questions — valores por defecto

Todos por defecto, a confirmar con Daniel en 0.1 (**confirmados el 18-oct en bloque, D-518 T·3**; **[21-oct]** la 7 y la 8 cambian por F2-43·7 y la pregunta B4, y las preguntas nuevas B1-B13 están en `proposal.md`):

1. **¿Cuentas con `payment_sources` y cobro sin el comprador?** No se asume: sandbox de FLORECER y confirmación escrita de Wompi por cuenta antes de encender.
2. **¿`recurrent`?** `true` en renovaciones, `false` en el primer cobro; se valida en sandbox y es una constante.
3. **¿Formulario de tarjeta?** Widget de Wompi si su documentación lo confirma; si no, el formulario cifrado del modal de Katuq. Siempre en la página aislada.
4. **¿Revocar la fuente?** Se borra la referencia en Katuq; la revocación de Wompi solo si está documentada, sin bloquear.
5. **¿Dónde van los planes?** En la tienda (`tienda.subscriptionPlans`), sin escribir productos.
6. **¿Aviso y reintentos?** Aviso a 3 días (mensual) y 7 (anual); 3 intentos (día 0, +2, +5) en una ventana de 5 días, uno por día.
7. **¿Sin existencias?** No se cobra, se avisa al comercio y se revisa cada día de la ventana; al cerrarla, período saltado con aviso al comprador. **[21-oct]** Solo para lo inventariable (F2-43·7).
8. **¿Gratis o Premium?** Altas solo Premium; ~~las renovaciones no cuentan en el tope~~ **[21-oct] cuentan, y sin cupo no se cobra (pregunta B4)**; siguen si el comercio baja de plan.
9. **¿Factura electrónica?** Igual que un pedido de tienda hoy; la automatización va en la hoja de ruta de FE (D-499).
10. **¿Revisión legal?** Sí, de renovación, cancelación y retracto, antes del primer comercio real; no bloquea construir.
11. **¿Colecciones?** `storeSubscriptions` y `storeSubscriptionCharges`.
12. **¿URL de eventos?** Se revisa con cada comercio en la fase 0; sin ella confirman la consulta del alta y la conciliación.

**Decisiones de este diseño:**
- El precio del plan incluye el envío (**[21-oct]** se mantiene, pregunta B6).
- El prefijo es `TSUS-`.
- La página de la tarjeta va en el dominio de la tienda, salvo que la revisión de seguridad pida un origen aparte.
- Un primer cobro rechazado cierra el alta (`abandoned`); otra tarjeta es un alta nueva.
- Un comprador no puede tener dos veces el mismo plan activo o en alta.
- El alta solo se ofrece con el modo global en `cobro`.
- Apagar la bandera, perder el Wompi propio o cambiar de entorno pausa las renovaciones; los períodos cuya ventana cierra en pausa se saltan sin cobro y con aviso, y la pausa no cancela sola.
- Un 4xx técnico no cuenta como rechazo: alerta inmediata, hasta 3 repeticiones en la ventana y luego período saltado.
- Un descuento de inventario ambiguo abre alerta y no se repite.
- Las renovaciones no se informan como conversión.
- `payment_failed` no se reactiva cambiando la tarjeta.
- Cancelar con un cobro en curso respeta ese período si se aprueba, y nunca reenvía la referencia.
- La pantalla se abre desde la lista de Sitios, sin entrada nueva de menú.
