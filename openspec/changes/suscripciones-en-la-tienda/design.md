> D-497 (aprobada el 2026-10-18). Backend `katuq_admin_back_firebase/functions/` (rama `backend-aws-security`); front `Seller.Katuq/`. Código leído el 2026-10-18. Requisitos: `specs/tienda-suscripciones` y `specs/cobro-recurrente-tienda`. Toca pagos, pedidos, consecutivos e inventario: cada tarea sensible va con diff aprobado, una a la vez.

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

**`storeSubscriptionCharges/{subId}_{NNN}`**, uno por período:
- `company`, `subscriptionId`, `period {n, from, to}`, `amountInCents`, `currency: 'COP'`.
- `status`: `pending` (sin intento, esperando existencias) `| in_flight | awaiting_confirmation | paid | declined_retry | failed | skipped_no_stock | skipped_paused`.
- `attempts[] {n, reference, submittedAt, transactionId, wompiStatus, uncertain, technical, reason}`, `paidAt`, `orderPending` (verdadero desde `paid` hasta anotar el pedido), `order {reservedAt, orderId, nroPedido, inventoryStartedAt, notifiedAt}`, `notices {<momento>: at}`, `alert {open, reason, since}`, `lockedAt`.

No hay colección de alertas: `alert` sale en la pantalla del comercio y en el resumen del job. Índices compuestos, todos en un solo despliegue con el export vivo (tarea 2.16):

| Colección | Campos | Consulta |
|---|---|---|
| `storeSubscriptions` | `status, nextChargeAt` | vencidos y avisos previos |
| `storeSubscriptions` | `status, createdAt` | cierre de altas sin terminar |
| `storeSubscriptions` | `company, createdAt` | lista del comercio |
| `storeSubscriptions` | `company, clientCd, createdAt` | «Mis planes» |
| `storeSubscriptionCharges` | `status, lockedAt` | conciliación |
| `storeSubscriptionCharges` | `orderPending, paidAt` | pagados sin pedido |
| `storeSubscriptionCharges` | `company, paidAt` | cuadre del mes |
| `storeSubscriptionCharges` | `company, alert.open` | alertas del comercio |

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
  - `APPROVED`: período `paid` con `paidAt` y `orderPending: true`; avanzan `nextChargeAt` y `paidThrough`; `creating` y `retrying` pasan a `active`. En una suscripción `cancelled` o `abandoned` también queda `paid` (la plata entró) y se abre `alert` (`paid_after_close`); en `cancelled` ese período se entrega (D8).
  - `DECLINED` o `ERROR`: en el alta, D3; en renovaciones, reintento o `failed` (D7).
  - `PENDING`: `awaiting_confirmation`. Un aviso atrasado nunca baja un `paid`.
- **Toda vía que aplica un `APPROVED` encadena `periodOrder` (D5) enseguida:** la respuesta del POST (alta y job), el webhook, la consulta de estado del alta y la conciliación. Así hay pedido aunque la cuenta no tenga URL de eventos (pregunta 12). El paso 2 del job es la red ante una caída entre los dos.

### D5. Un pedido por período pagado (`periodOrder.js`, módulo sensible)
1. **Reservar** `order.reservedAt` en transacción. Sale si ya hay `orderId` o una reserva de menos de 10 min.
2. **Recuperar:** `orders` por `storeSubscription.periodId`, con la empresa verificada. Si el pedido existe, no crea otro: sigue con él en el paso 5. El `orderId` del período se anota solo en el paso 7, así que una corrida a medias nunca parece terminada.
3. **Armar** con `construirOrden`: producto leído de `products` (solo lectura) con `precioUnitarioConIva` = monto congelado; `envioBase: 0`; `estadoPago: 'Aprobado'`, `faltaPorPagar: 0`, `anticipo`, `pagoTransaccionId` y `storeSubscription {subscriptionId, periodId, reference}`. Si el total difiere en más de 1 peso de lo cobrado, no crea: abre `alert` y deja `orderPending: false` para que el job no insista.
4. **Crear:** `resolverClienteEnCRM` (se exporta de `sites.js` sin cambios) y `orderService.createOrder(orden, company, {skipDuplicateCheck: true})`. La idempotencia la da el período, no los 2 min.
5. **Descontar una sola vez**, según la marca del pedido y `order.inventoryStartedAt` del período:
   - el pedido tiene `inventarioDescontadoAlCrear`: nada;
   - sin marca ni `inventoryStartedAt` (nunca se intentó): se escribe `inventoryStartedAt` en transacción, se llama a `updateByPOS(…, "tienda-en-linea")` y, si sale bien, se pone `inventarioDescontadoAlCrear`;
   - sin marca y con `inventoryStartedAt` (caída o `success: false`): caso ambiguo. Si `inventoryMovement` tiene movimientos con `ordenId` del pedido, se pone la marca sin descontar; si no, **no se reintenta**: se abre `alert` (`inventory_uncertain`) para que el comercio revise la existencia, y se sigue.
6. **Avisar.** `notify(…, "order_created")` y `avisarAlComprador(…, "pago_aprobado")` son idempotentes y se repiten sin riesgo al recuperar. La campana de las empresas no migradas (`writeSellerNotification("ORDER_CREATED")`, como `crearPedido`) no tiene marca: se pone `order.notifiedAt` en transacción antes de enviarla y sale como máximo una vez.
7. **Anotar** `orderId`, `nroPedido` y `orderPending: false` en el período, y `clientCd` en la suscripción.

Las renovaciones no pasan por `topeDePedidosDeTienda` ni `consumeStoreOrderSlot`, y no se informan como conversión.

**Antes de cobrar una renovación** se revisan la bandera, el Wompi propio y su entorno (si fallan, pausa, D7); que el producto exista y sea de la empresa; que la tienda tenga bodega, y las existencias con `getRealStockMap`, solo lectura (pregunta 7). Si falta producto, bodega o existencias, no se cobra: el período queda `pending` con el motivo, se avisa al comercio y se revisa cada día de la ventana; al cerrarla, `skipped_no_stock` y aviso al comprador.

### D6. Webhook: una rama nueva antes de las existentes (módulo sensible)
En `procesarNotificacionWompi`, después de guardar el crudo y antes del caso «Payment Link», entra si `isStoreSubscriptionReference(reference)` (función pura nueva en `wompiPagoPedido.js`):
1. Lee el período con el id derivado. Si no existe, 200 `ignorado`.
2. Toma `getWompiCredentials(company)`, exige `source: 'company-config'` y valida **solo** con el secreto del comercio.
3. Confirma con Wompi en el entorno del comercio; referencia, monto y moneda deben coincidir con el intento.
4. `storeSubscriptions/webhook.js` llama a `applyResult` y, con `APPROVED`, a `periodOrder`.

No depende de banderas ni modos: aplica siempre cobros ya enviados. Un fallo pasajero responde 5xx y Wompi reintenta; un rechazo, 200 `ignorado` con el motivo. Las ramas de Katuq, enlaces y POS no cambian.

### D7. Modos, jobs, pausas y reintentos
**Modos globales:** `STORE_SUBSCRIPTIONS_BILLING` = `apagado | sombra | cobro` y `STORE_SUBSCRIPTIONS_AVISOS` = `apagado | sombra | envio`. Un valor ausente, vacío o desconocido se lee como `apagado` (D-385), con prueba.

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

- **Ventana:** un período se cobra desde `period.from` hasta 5 días después, con un intento por día civil como máximo. Nunca se cobra un período con la ventana cerrada.
- **Pausa:** si la bandera se apaga, el comercio pierde su Wompi propio o cambia de entorno, la suscripción guarda `pause {reason, since}` y no se cobra. Si la ventana de un período cierra en pausa, queda `skipped_paused`, sin cobro: `nextChargeAt` pasa al siguiente, `paidThrough` no se mueve y una `retrying` vuelve a `active`. El comprador recibe un aviso («este período no se cobró ni se enviará») y el comercio una alerta. Al quitar la pausa solo se cobra el período en ventana. La pausa no cancela sola.
- **Reintentos** (pregunta 6): día 0, +2 y +5. Cada rechazo avisa al comprador. Al agotarlos, período `failed`, suscripción `payment_failed`, campana `STORE_SUBSCRIPTION_FAILED` y correo al comercio.
- **`storeSubscriptionsNotices`, 8:15 COT**, con `STORE_SUBSCRIPTIONS_AVISOS`: aviso previo con monto, fecha, tarjeta y enlace a «Mi cuenta» (`correoComprador.enviarAvisoDeSuscripcion`, nueva); marca en `notices.<momento>` en transacción antes de enviar. No avisa suscripciones en pausa.

### D8. «Mis planes», el comercio y el Seller
- **«Mis planes»**, con `acceso` y filtrado por la empresa del sitio y el `clientCd` de la sesión: `GET /public/:slug/cuenta/planes` y `POST …/cuenta/planes/:id/cancelar`. Cambiar tarjeta: página aislada `?ruta=/mis-planes/tarjeta&plan=<id>` (misma CSP de D3), que lee la sesión del navegador y la manda en el cuerpo de `POST …/cuenta/planes/:id/tarjeta`; 409 `CHARGE_IN_PROGRESS` con `chargeInFlight`. `cuenta/suscripcion` (correos, D-318) no cambia.
- **Cancelar:** `cancelled`, `paidThrough` al fin del período pagado y se borra `paymentSourceId` de inmediato. No se reclaman intentos; un intento abierto se resuelve solo por consulta o webhook, nunca reenviando (D7). Si se aprueba, ese período se entrega.
- **Cambiar la tarjeta:** en `retrying`, el próximo intento usa la nueva. En `payment_failed` no reactiva: se ofrece suscribirse de nuevo.
- **Rutas del comercio** (`auth` + `requireJwtTenant` + `requireFeature('storeSubscriptions')`; cancelar exige `requireRole(["Administrador"])`): `GET /v1/sites/suscripciones`, `GET …/capacidad` (`{disponible, motivo}`, calculado en el backend), `GET …/:id`, `POST …/:id/cancelar` y `GET …/cuadre?mes=`. Se registran antes de `router.get("/:id")` (`routers/sites.js:357`), en `controllers/storeSubscriptions.js` (SRP).
- **Configuración:** `tienda.subscriptionPlans [{id, productId, name, period, amountCOP, includes[≤6]}]`, hasta 10, normalizada en `normalizarTienda` y conservada en `normalizarContenido`.
- **Seller:**
  - Sección «Planes de suscripción» en `sitio-editor`, junto a `campo-cotizables`, según `capacidad.disponible`; con `false`, un aviso con el motivo. La UI no mira el proveedor (gate VI). Sigue el NgModule de `sitio-editor`.
  - `StoreSubscriptionsComponent` **standalone, OnPush, con `loadComponent`** en `sitios/suscripciones` (base `cfg-pagina`, D-400; tabla PrimeNG; estados en par fuerte/suave), con `StoreSubscriptionsService extends BaseService`. Se entra desde Sitios y el editor, sin tocar `menus`.

## Write-set (D-134) y contract tests

Lista cerrada de lo que escriben el alta, el cobro, el webhook y el pedido:

| Escribe | Solo por |
|---|---|
| `storeSubscriptions`, `storeSubscriptionCharges` | módulos nuevos |
| `consecutives` | `orderRepository.getNextConsecutive`, dentro de `createOrder` |
| `orders` (documento nuevo) | `orderService.createOrder` |
| `orders` (campos del pedido creado) | `inventarioDescontadoAlCrear` (D5), `notificationsSent.*` (`notify`), `correosEnviados.*` (`correoComprador`) |
| `clients` | `resolverClienteEnCRM` |
| `inventory`, `inventoryMovement`, `inventory_audit` | `inventoryService.updateByPOS(…, "tienda-en-linea")` |
| `integrationRawEvents`, `integrationEvents` | webhook y marcador por transacción |
| `sites` (contenido) | `PUT /v1/sites/edit` existente |
| `notifications` | `sellerMobileNotifications.notifyOrderCreated`, dentro de `createOrder` |
| `notification_queue` | tren unificado de `notify` (`notificationHooks.onOrderCreated`) |
| Realtime DB `ActualizacionTicket{company}` | `writeSellerNotification` (`ORDER_CREATED`, `STORE_SUBSCRIPTION_FAILED` y `NEGATIVE_STOCK` desde `updateByPOS`) |
| `integration_audit` | `conLatido` |

- **Solo lectura:** `products`, precios, listas de precios, `companies`, configuración de integraciones y `warehouses`.
- **Prohibido:** catálogo, precios, `subscriptions`, `billing_*`, `wompiSubscriptionEvents` y los campos de cobro de `companies`.

**Contract tests, primero (Artículo VIII)**, con `scripts/lib/firestoreFalsa.js` y `tests/integrations/wompiWebhookHarness.js`; el detalle está en las tareas 1.1-1.8:
1. **Write-set como lista de permitidos:** la Firestore falsa falla ante cualquier escritura fuera de la tabla, y `products`, precios y listas de precios quedan idénticos. Los servicios de aviso y `conLatido` van con dobles que verifican la llamada; lo que escriben por dentro lo cubren sus suites.
2. **Wompi:** cuerpos en fixture, campos de tarjeta rechazados y ningún log con token, correo ni llave.
3. **Dinero e idempotencia (1.5) y alta (1.6)**, verificados con mutación.
4. **Webhook, prefijo, modos y endpoints:** `TSUS-` solo con el secreto del comercio; ningún `nroPedido` ni prefijo de Katuq empieza por `TSUS-`; modo desconocido = `apagado`; códigos y filtro por empresa.

## Banderas, observabilidad y migraciones

- **Bandera por comercio:** `featureFlags.storeSubscriptions`, en el catálogo del back y del front. Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada.
- **Modos globales:** ausente o desconocido = `apagado`. Se retiran 30 días después de quedar en `cobro`/`envio` sin incidentes (Artículo XII).
- **Logs:** `firebase-functions/logger` con `correlationId` = referencia, resultado `success|error|retry` y latencia; solo ids.
- **Resumen del job:** `{job, modo, revisadas, cobradas, aprobadas, rechazadas, inciertas, pedidos, omitidas, pausadas, errores, duracionMs}`.
- **Migraciones:** no hay. `scripts/store-subscriptions-simulate.js` es de solo lectura y `--dry-run` por defecto; las banderas se cambian con `set-company-feature.js`, que simula por defecto.

## Gates constitucionales

- **I:** D-497; no se implementa sin specs y tasks aprobadas. **II:** las specs no nombran tecnología. **III:** sin enmiendas; las excepciones de VII y IX se registran en 0.1.
- **IV:** D2, D4 y D5. **V:** crudo antes de procesar. **VI:** la UI no ramifica por proveedor: la capacidad la calcula el backend y Wompi vive en un adaptador.
- **VII:** `correlationId`, resultado, latencia, latido e `integrationEvents`. Provider-dashboard sirve hoy a integraciones de pedidos y catálogo; aquí el cobro que afecta un pedido sale en la pantalla Suscripciones con su pedido y su `alert` (excepción acotada, 0.1).
- **VIII:** contract tests primero. **IX:** pantalla nueva standalone, OnPush y lazy; sin signals ni `@if` porque es Angular 14, y la sección del editor sigue su NgModule (excepción, 0.1).
- **X:** secreto del dueño y confirmación con Wompi. **XI:** hashes, sin datos personales en logs. **XII:** banderas con dueño y fecha. **XIII:** dos specs de unas 3 páginas. **XIV:** D-497 y las respuestas de 0.1 van a `CONTRACT.md`. **XV:** `integrations.wompi`, solo lectura.

## Fases

0 (specs, Wompi en sandbox, legal y seguridad) → 1 backend → 2 comprador → 3 Seller → 4 encendido: FLORECER sandbox, sombra, FLORECER producción con monto bajo y luego comercio por comercio. El detalle y las dependencias están en `tasks.md`.

## Risks / Trade-offs

- **Cuenta sin cobro con fuente guardada:** la fase 0 es la compuerta; sin confirmación de Wompi para esa cuenta no se enciende.
- **Carrera entre leer existencias y descontar:** igual que hoy; el pedido pagado queda pendiente de despacho.
- **Llaves cambiadas o Wompi apagado:** pausa (D7); nunca la cuenta de la plataforma. **Sin URL de eventos:** más consultas a Wompi.
- **Descuento ambiguo:** se prefiere una alerta a un doble descuento (D5).
- **Seguridad:** revisión en el backend privado antes de encender; no se detalla aquí porque este repo es público.

## Open Questions — valores por defecto

Todos por defecto, a confirmar con Daniel en 0.1:

1. **¿Cuentas con `payment_sources` y cobro sin el comprador?** No se asume: sandbox de FLORECER y confirmación escrita de Wompi por cuenta antes de encender.
2. **¿`recurrent`?** `true` en renovaciones, `false` en el primer cobro; se valida en sandbox y es una constante.
3. **¿Formulario de tarjeta?** Widget de Wompi si su documentación lo confirma; si no, el formulario cifrado del modal de Katuq. Siempre en la página aislada.
4. **¿Revocar la fuente?** Se borra la referencia en Katuq; la revocación de Wompi solo si está documentada, sin bloquear.
5. **¿Dónde van los planes?** En la tienda (`tienda.subscriptionPlans`), sin escribir productos.
6. **¿Aviso y reintentos?** Aviso a 3 días (mensual) y 7 (anual); 3 intentos (día 0, +2, +5) en una ventana de 5 días, uno por día.
7. **¿Sin existencias?** No se cobra, se avisa al comercio y se revisa cada día de la ventana; al cerrarla, período saltado con aviso al comprador.
8. **¿Gratis o Premium?** Altas solo Premium; las renovaciones no cuentan en el tope y siguen si el comercio baja de plan.
9. **¿Factura electrónica?** Igual que un pedido de tienda hoy; la automatización va en la hoja de ruta de FE (D-499).
10. **¿Revisión legal?** Sí, de renovación, cancelación y retracto, antes del primer comercio real; no bloquea construir.
11. **¿Colecciones?** `storeSubscriptions` y `storeSubscriptionCharges`.
12. **¿URL de eventos?** Se revisa con cada comercio en la fase 0; sin ella confirman la consulta del alta y la conciliación.

**Decisiones de este diseño:**
- El precio del plan incluye el envío.
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
