# Productos por suscripción en la tienda, con cobro recurrente en Wompi

> Ticket 1235 (F2-43), parte 2 de 2. La parte 1 (cotizables) es D-475. Toca **pagos y
> pedidos**: es una propuesta para aprobar, no para implementar. Decisión: D-497
> (aprobada por Daniel el 2026-10-18).

## Why

El comercio quiere vender planes ("Desde $X/mes"): el comprador se suscribe una vez y
el cobro se repite cada mes o cada año sin que nadie intervenga. Hoy la tienda no
puede hacerlo (código leído el 2026-10-17):

- **La tienda cobra pedido por pedido, con un enlace de un solo uso.** `crearPedido`
  (`controllers/sites.js`) crea el pedido y llama a `paymentGateway.generatePaymentLink`.
  `services/paymentGateway/providers/wompiProvider.js` hace `POST /payment_links` con `single_use: true` y
  vencimiento de 24 h. El pago entra por el webhook principal
  (`controllers/integration.js`, `procesarNotificacionWompi`), que ubica el pedido por
  `pagoTienda.linkIds`, y se aplica en `aplicarPagoDeTienda`, en transacción. Nada guarda
  la tarjeta del comprador ni cobra sin él.
- **El dinero va a la cuenta Wompi del comercio solo si la configuró.**
  `services/paymentGateway/index.js` usa `integrations.wompi` del comercio (`publicKey`,
  `privateKey`, `eventsSecret`, `integritySecret`). Si no la tiene, usa la cuenta de
  plataforma, y `ventaConfig` advierte que en ese caso "el dinero entra a la cuenta de
  la PLATAFORMA".
- **Katuq ya cobra de forma recurrente con tarjeta tokenizada, pero solo sus propios
  planes y en su propia cuenta** (`WOMPI_SUBSCRIPTIONS_*`):
  - El navegador cifra la tarjeta y la tokeniza directo en Wompi
    (`upgrade-modal.component.ts` y `subscription.service.ts`: `/merchants/{publicKey}`
    para las aceptaciones, `/tokens/cards`).
  - El backend crea la fuente (`createPaymentSource` → `POST /payment_sources`) y rechaza
    número, fecha o CVC (`SENSITIVE_CARD_DATA_NOT_ALLOWED`).
  - Un cron diario con doble bandera (`CRON_ENABLED` + `BILLING_CRON_ENABLED`) cobra con
    `billingService._chargePaymentSource` (`POST /transactions` con `payment_source_id`,
    referencia determinística por ciclo y `recurrent: false`, porque su monto varía).
  - Usa *lease* por empresa, concilia los pendientes antes de cobrar otra vez y abre
    alertas (`docs/runbooks/subscription-billing.md`). El webhook pasa por
    `subscriptionPaymentService` con un marcador idempotente.
  - Avisa 7 y 3 días antes del corte (`billing/avisoPrevioCorte.js`, con su propia
    bandera `BILLING_AVISO_PREVIO_ENABLED`).
  - Al pasar a Gratis solo se borra `paymentSourceId` en Katuq; no hay llamada a Wompi
    para revocar la fuente.
- **Ese motor no se puede reutilizar tal cual.** `SUB-` y `NOTIF-` están reservadas a los
  cobros de Katuq (`utils/wompiPagoPedido.js`, `PREFIJOS_DE_COBRO_DE_KATUQ`) y la colección
  `subscriptions` es la de los planes de Katuq. Además, un cobro con fuente guardada no
  trae enlace ni número de pedido: el webhook principal no sabría de qué comercio es y no
  podría validarlo con su secreto.
- **La cuenta del comprador ya existe.** Entra con un código por correo, solo si ya es
  cliente (ayudantes en `utils/siteCuenta.js`; sesión con `clienteDeAcceso` en
  `controllers/sites.js`). `pedidosDeCuenta` (`controllers/sites.js`) muestra sus pedidos
  filtrando por `cliente.cd` de la sesión. **Ojo:** `cuenta/suscripcion` es la autorización de correos
  de novedades (D-318), no un cobro.
- **Pedidos.** `orderService.createOrder` toma el consecutivo y solo evita gemelos dentro
  de 2 minutos (`VENTANA_PEDIDO_DUPLICADO_MS`), así que no impide repetir una renovación.
  Desde D-204 la tienda descuenta el inventario al crear el pedido (`updateByPOS`).

## What Changes

- **Plan de suscripción como producto vendible.** En Tienda → «Planes de suscripción»
  (mismo patrón que `tienda.cotizables`, sin escribir en `products`), el comercio arma
  planes sobre un producto: nombre, precio, periodicidad (mensual o anual) y «Qué
  incluye». La tarjeta y la ficha muestran «Desde $X/mes» y un selector de plan.
- **Alta con fuente tokenizada de Wompi, en la cuenta del comercio.**
  - Solo se ofrece si el comercio tiene Wompi propio activo, nunca con la cuenta de
    plataforma.
  - El comprador acepta los términos de Wompi del comercio y un texto propio de
    consentimiento con el monto, la periodicidad, la fecha del próximo cobro y cómo
    cancelar.
  - La tarjeta se tokeniza en el navegador directo contra Wompi (patrón del modal de
    Katuq). El backend recibe solo el token, crea la fuente con la llave privada del
    comercio y hace el primer cobro.
- **Cobro recurrente por job, con idempotencia.**
  - Un trabajo diario, apagado por omisión, cobra las suscripciones vencidas.
  - Cada período tiene un registro con clave determinística (suscripción + período) que
    se crea en transacción **antes** de llamar a Wompi. Cada intento lleva su propia
    referencia determinística, con prefijo propio de tienda.
  - Un error de red o un timeout no genera otro cobro: se concilia con
    `GET /transactions/{id}` o se reenvía la misma referencia, como hace hoy el motor de
    Katuq.
  - **Un pedido por período**: se crea por el camino normal de pedidos de tienda cuando
    el cobro queda aprobado, una sola vez por período y con `estadoPago: Aprobado`.
- **Webhook.** El webhook principal reconoce el prefijo de tienda y busca el registro del
  cobro. Valida con el secreto del comercio dueño, confirma con Wompi y verifica que monto
  y moneda coincidan con lo cobrado. Persiste el evento crudo como hoy.
- **Aviso previo.** Correo al comprador con la marca de la tienda (`correoComprador`)
  N días antes de cada cobro, con el monto, la fecha, la tarjeta (marca y últimos 4) y el
  enlace a «Mi cuenta» para cancelar. Se marca por período para no repetirlo.
- **Reintentos y alerta de pago fallido.** Ante un rechazo hay hasta 3 intentos en
  5 días. Cada uno avisa al comprador para que cambie la tarjeta. Al agotarlos, la
  suscripción queda «pago fallido» (no se cobra más) y el comercio recibe un aviso en la
  campana y por correo.
- **Cancelar desde «Mi cuenta».** Nueva sección «Mis planes» (nombre distinto a la
  suscripción de correos): plan, estado, próximo cobro, tarjeta, historial y
  «Cancelar». Al cancelar no hay más cobros, y el período ya pagado se respeta hasta su
  fin. También permite cambiar la tarjeta.
- **Estado en Katuq.** Pantalla interna «Suscripciones» (base D-400) con estado (activa,
  en reintento, pago fallido, cancelada), próximo cobro, último pago y pedidos generados.
  El comercio puede cancelar desde ahí. Todo filtrado por empresa en el servidor.
- **Banderas** (Artículo XII, con dueño y fecha de retiro): bandera por comercio para la
  función y bandera global aparte para el job de cobro, como `BILLING_CRON_ENABLED`.

## Capabilities

### New Capabilities
- `tienda-suscripciones`: planes, alta del comprador con consentimiento, «Mis planes»
  (cancelar y cambiar tarjeta), avisos y estado para el comercio.
- `cobro-recurrente-tienda`: cobro por período con idempotencia, reintentos, webhook,
  conciliación y un pedido por período cobrado.

### Modified Capabilities
_(ninguna spec vigente describe el checkout de la tienda ni sus pagos)_

## No-goals

- Suscripciones por ePayco, PSE, Nequi u otro medio distinto de tarjeta en Wompi.
- Cobrar con la cuenta Wompi de plataforma.
- Prorrateos, upgrade o downgrade entre planes a mitad de período, pausas y períodos de
  prueba gratis.
- Cambiar el precio a suscriptores existentes: el monto queda congelado al suscribirse.
- Cupones o descuentos recurrentes.
- Suscripciones creadas desde venta asistida, POS o WhatsApp.
- Tocar el motor de cobro de los planes de Katuq (`subscriptions`, `billingService`).

## Riesgos

- **Cobros duplicados.** La garantía es el registro por período creado en transacción
  antes de llamar a Wompi, con una referencia por intento y conciliación antes de
  reintentar. Requiere contract tests de reintento, webhook repetido, webhook fuera de
  orden y caída a mitad del cobro (Artículo IV).
- **PCI: Katuq nunca ve la tarjeta.** El backend acepta solo el token y rechaza los campos
  de tarjeta. **Riesgo nuevo:** las páginas de tienda cargan píxeles de terceros (Meta,
  TikTok, Google). El formulario de tarjeta no puede vivir en una página con esos
  scripts; debe ir en una página aislada o en un formulario alojado por Wompi, si existe.
- **Consentimiento.** Se guardan los tokens de aceptación de Wompi, el texto aceptado, la
  fecha y un hash del origen. Sin consentimiento guardado no hay cobro.
- **Pedidos y consecutivos (módulo sensible).** Crear el pedido solo con el cobro aprobado
  evita gastar consecutivos e inventario en cobros fallidos. El candado de gemelos de
  2 minutos no sirve como idempotencia; la idempotencia es la del período. El inventario
  se descuenta por el camino existente de la tienda (D-204).
  **Write-set:** colecciones nuevas de suscripciones y cobros (requieren aprobación);
  `orders`, `clients`, `inventory` e `inventoryMovement` solo por los caminos que ya usa
  la tienda; `integrationRawEvents` e `integrationEvents`. `products`, precios y listas
  de precios quedan en solo lectura.
- **Conciliación.** Barrido diario de cobros pendientes contra Wompi y alerta interna para
  los inciertos, como `billing_reconciliation_alerts`. El reporte del comercio cuadra
  los cobros aprobados con los pedidos generados.
- **Backend local.** El job queda detrás de `CRON_ENABLED` y de su propia bandera: el
  backend local corre crones contra Firestore de producción.

## Preguntas para Daniel

1. **¿La cuenta Wompi de cada comercio permite crear fuentes de pago (`payment_sources`)
   y cobrar sin el comprador presente?** Katuq lo hace en su propia cuenta, pero nada en
   el código muestra que las cuentas de los comercios lo tengan habilitado. Hay que
   confirmarlo con Wompi; puede exigir una habilitación comercial por cuenta.
2. Para montos fijos, ¿se envía `recurrent: true`? Katuq usa `false` porque su monto
   varía. Hay que verificar en la documentación de Wompi el efecto en la aprobación y en
   la autenticación.
3. ¿Wompi ofrece un formulario alojado por ellos para tokenizar? Si no lo ofrece,
   ¿aprobamos el formulario cifrado del modal de Katuq en una página de la tienda sin
   scripts de terceros?
4. ¿Wompi permite revocar una fuente de pago al cancelar? Hoy Katuq solo borra su
   referencia.
5. ¿Los planes se configuran en la tienda (como cotizables, sin escribir productos) o en
   el maestro de productos?
6. Política: días de aviso previo (¿3 para mensual y 7 para anual?) y reintentos
   (¿3 en 5 días?).
7. Si un producto físico no tiene existencias al renovar, ¿no se cobra y se avisa, o se
   cobra y queda como pendiente de despacho?
8. ¿Los pedidos de renovación cuentan en el tope del plan Gratis (D-319)? ¿Esta función
   es solo para Premium?
9. ¿Cada período genera factura electrónica como un pedido normal de tienda?
10. ¿Hace falta una revisión legal del texto de renovación automática y del derecho de
    retracto?
11. ¿Apruebas las dos colecciones nuevas (nombres provisionales: `storeSubscriptions` y
    `storeSubscriptionCharges`)?
12. ¿Las cuentas Wompi de los comercios tienen la URL de eventos apuntando al webhook
    principal de Katuq? Si no, el barrido diario sería la única vía de confirmación.
