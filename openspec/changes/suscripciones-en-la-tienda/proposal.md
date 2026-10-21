# Productos por suscripción en la tienda, con cobro recurrente en Wompi

> Ticket F2-43, **cd `UVaf50kn4UPbI358NGMk`** (su nroTicket 1235 está repetido: se cita por
> cd), parte 2 de 2. La parte 1 (cotizables) es D-475; sus arreglos van en
> `openspec/changes/cotizable-arreglos`. Toca **pagos y pedidos**: es una propuesta para
> aprobar, no para implementar. Decisión: D-497 (aprobada por Daniel el 2026-10-18; el
> diseño, las specs, las tareas y los valores por defecto, en bloque el mismo día, D-518 T·3).
>
> **[21-oct] Ajuste pendiente de aprobación.** D-518 (F2-43·1) decidió un solo modelo de
> suscripción con dos fases: primero el ticket de CAFE ESCOBAR (cd `7OaxPVn97s3dUKpkr8OA`,
> fase A, `openspec/changes/suscripciones-desde-pedido`) y después esta tienda con cobro
> tokenizado (fase B). Este ajuste alinea la fase B con el modelo de la fase A (su
> `design.md`, D9 y «Cómo la amplía la fase B»), con F2-43·7 (planes sin inventario) y con
> D-505 (interruptores en Firestore). Lo aprobado el 18-oct se conserva; cada cambio lleva
> la marca **[21-oct]**. Las preguntas nuevas son B1-B13, al final. Revisado el mismo día con
> una crítica verificada contra el código (HEAD `c9e74ff0` del backend, que ya incluye F2-41):
> estados de período comunes con la fase A, pedido armado sin el núcleo de D-496, monto con
> IVA, revisión completa antes de cobrar, fecha de entrega, «Mis planes» ligado a la ficha
> correcta, índices y dueño de los modos.

## Ajuste del 21-oct (resumen, pendiente de aprobación)

| Qué | Antes (18-oct, aprobado) | Ahora (21-oct) | Fuente |
|---|---|---|---|
| Frecuencias | mensual o anual | semanal, cada 2 semanas, mensual, cada 2 meses o anual; el plan dice cuáles admite | F2-43·1; fase A D2 |
| Variante y cantidad | el plan es un producto con monto fijo | el comprador elige variante (las del producto) y cantidad hasta el tope del plan; el monto por cobro es precio × cantidad, congelado | fase A D1; adjunto 3 del ticket de CAFE ESCOBAR |
| Datos | `plan {period, amountCOP}`, `nextChargeAt` | `source: store`, `collection: card`, `items[]`, `amount`, `schedule`, `nextPeriodAt`, `pause` con razones de las dos fases | fase A D1 y D9 |
| Calendario | propio | el puro de la fase A (`schedule.js`) más `yearly` y fin abierto | fase A D2 |
| Planes de servicio | no se cobra si faltan existencias o bodega | no se revisan existencias de lo no inventariable; sin líneas inventariables no se exige bodega | F2-43·7 |
| Tope del plan | las renovaciones no cuentan | cuentan (crear un pedido siempre cuenta); antes de cobrar se revisa el cupo y el estado de la empresa | fase A D19; pregunta B4 |
| Modos globales | `STORE_SUBSCRIPTIONS_BILLING` y `_AVISOS` como variables de entorno | `config/feature_flags.storeSubscriptionBilling` y `.storeSubscriptionNotices` | D-505; D-518 |
| Rutas del comercio y pantalla | `/v1/sites/suscripciones`, `sitios/suscripciones` | `/v1/store-subscriptions` y `ventas/suscripciones`, compartidas con la fase A | fase A D9 y D12 |
| Estados del período | propios de B | una sola tabla para las dos fases; el reclamo común del pedido nunca cambia el estado ni el calendario de un cobro con tarjeta | fase A D1 y D5 |
| Armado del pedido | `construirOrden` con el monto congelado | igual: sin el núcleo de D-496, que no tiene modo de precio congelado | D-496 D1 y D3; pregunta B13 |
| Monto | monto fijo del plan | precio por unidad **con IVA** × cantidad; el IVA solo se desglosa con la tarifa congelada | D-497; adjunto 3 |
| Antes de cobrar | existencias y bodega | además: producto de la empresa y no cotizable, pedido armado y total que cuadra | crítica del 21-oct |
| Fecha de entrega | la de hoy, sin regla | el día del cobro o el siguiente válido según las reglas de entrega de la tienda | F2-15; pregunta B11 |
| Orden de unión | — | después de la fase A; con D-496 solo hay orden de unión | D-518 T·2 |

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
  - **[21-oct]** Cada plan dice qué frecuencias admite (semanal, cada 2 semanas, mensual,
    cada 2 meses o anual), qué variantes del producto se pueden elegir y la cantidad
    máxima. El precio es por unidad y por cobro; el comprador paga precio × cantidad, que
    queda congelado. Un tamaño con otro precio es otro producto y otro plan, porque Katuq no
    tiene precio por variante (D-518 F5-30·7; pregunta B1). Evora Cloud mensual y anual son
    dos planes (pregunta B2).
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
  **[21-oct]** Los días de anticipación dependen de la frecuencia (pregunta B3).
- **[21-oct] Sin existencias que revisar en los servicios.** Antes de cobrar no se revisan
  existencias de los productos no inventariables (F2-43·7), y si ninguna línea es
  inventariable no se exige bodega. Sí se revisan el cupo del plan y el estado de la
  empresa: si el pedido no se podría crear, no se cobra (pregunta B4).
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
  **[21-oct]** Es la misma pantalla de la fase A (`ventas/suscripciones`), con el origen de
  cada suscripción («Pedido» o «Tienda»); se entra también desde Sitios.
- **Banderas** (Artículo XII, con dueño y fecha de retiro): bandera por comercio para la
  función y bandera global aparte para el job de cobro, como `BILLING_CRON_ENABLED`.
  **[21-oct]** La bandera por comercio sigue en `companies.featureFlags.storeSubscriptions`.
  Los dos modos globales pasan a `config/feature_flags` (D-505), no al `.env`: valor
  ausente o desconocido = apagado, leído en cada corrida.

## Capabilities

### New Capabilities
- `tienda-suscripciones`: planes, alta del comprador con consentimiento, «Mis planes»
  (cancelar y cambiar tarjeta), avisos y estado para el comercio.
- `cobro-recurrente-tienda`: cobro por período con idempotencia, reintentos, webhook,
  conciliación y un pedido por período cobrado.
- **[21-oct]** `planes-de-suscripcion`: planes con frecuencias, variante y cantidad, la
  elección del comprador, el calendario de cobros y la fecha de entrega de cada pedido. Recibe, ampliado, el requisito de planes
  que estaba en `tienda-suscripciones`.
- **[21-oct]** `operacion-cobro-tienda`: interruptor global, conciliación y cuadre,
  observabilidad del cobro y confirmación de la pasarela. Son cuatro requisitos aprobados de
  `cobro-recurrente-tienda`, movidos sin cambios de fondo para no pasar de 3 páginas.

### Modified Capabilities
_(ninguna spec vigente describe el checkout de la tienda ni sus pagos. **[21-oct]** Las
capacidades de la fase A, `suscripcion-desde-pedido` y `entregas-de-suscripcion`, tampoco
están archivadas; las dos fases comparten modelo, no specs)_

## No-goals

- Suscripciones por ePayco, PSE, Nequi u otro medio distinto de tarjeta en Wompi.
- Cobrar con la cuenta Wompi de plataforma.
- Prorrateos, upgrade o downgrade entre planes a mitad de período, pausas y períodos de
  prueba gratis. **[21-oct]** Tampoco la pausa manual del comercio que tiene la fase A
  (pregunta B5); la pausa automática de D7 sigue.
- Cambiar el precio a suscriptores existentes: el monto queda congelado al suscribirse.
- Cupones o descuentos recurrentes.
- Suscripciones creadas desde venta asistida, POS o WhatsApp. **[21-oct]** Las de un
  pedido ya creado son la fase A (`suscripciones-desde-pedido`), sin cobro automático.
- **[21-oct]** Cambiar de frecuencia, variante o cantidad después de suscribirse (se cancela
  y se suscribe de nuevo), un número fijo de cobros o permanencia mínima (pregunta B9), y
  recargo de envío por zona (pregunta B6).
- **[21-oct]** Que el comprador se suscriba solo a un pedido de la fase A por un enlace: si
  Jairo confirma que eso es «publicarlo» (F2-43·5), entra aquí en un ajuste aparte.
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
  **[21-oct]** Se suma el cupo del plan en `companies` (`currentMonthOrders` y sus campos),
  que `createOrder` ya escribía para todo pedido aunque el diseño del 18-oct no lo listaba.
  También `site_events` (eventos de los topes y del corte de altas de la revisión privada, con
  ids y huellas) y una llave de `config/feature_flags`, solo con el script de interruptores y
  a mano.
- **[21-oct] Plata cobrada sin pedido.** Si la empresa queda suspendida o sin cupo entre el
  cobro y el pedido, crear el pedido falla. El período queda pagado con su alerta y se
  reintenta cada día; nunca se cobra otra vez ni se reembolsa solo (pregunta B7). La
  revisión antes de cobrar reduce ese caso a una carrera.
- **[21-oct] Dependencia de la fase A.** El calendario, el reclamo del período y la pantalla
  son de la fase A. Si la fase A cambia en su aprobación (por ejemplo, el nombre de la
  colección de períodos, su pregunta D8), este diseño la sigue. La fase A tiene que aceptar el
  modo «tarjeta» de su reclamo del período y su tabla D9 dice que B arma con el núcleo de
  D-496: los dos puntos se alinean en la pregunta B13.
- **[21-oct] Inventario ya en producción.** La revisión privada encontró un defecto existente
  en el descuento por bodega que usan el POS, la tienda, la fase A y esta fase. Va en un cambio
  aparte y sensible (pregunta B12; ver revisión privada).
- **[21-oct] Seguridad.** Elegir frecuencia, variante y cantidad desde la página, y cobrar
  más seguido (semanal), amplían lo que revisa la tarea 0.7: ver revisión privada del
  backend.
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

> Las preguntas 1-12 quedaron respondidas el 18-oct con los valores por defecto de
> `design.md` (D-518 T·3). Las 1, 4 y 12 siguen dependiendo de la fase 0 con Wompi.
> **[21-oct]** Cambian dos respuestas por decisiones posteriores: la 7 (F2-43·7: lo no
> inventariable no se revisa) y la 8 (pregunta B4). La 11 sigue la pregunta D8 de la fase A.

### [21-oct] Preguntas nuevas para Daniel

Cada una trae la recomendación, que se aplica si se aprueba sin cambios.

- **B1. Variante con otro precio.** Katuq no tiene precio por variante (D-518 F5-30·7): la
  variante es solo la etiqueta (molienda, talla). Recomiendo: el plan permite elegir
  variante al mismo precio, y un tamaño con otro precio (Pergamino: 360 g y 500 g) es otro
  producto y otro plan.
- **B2. Varias frecuencias en un plan.** Recomiendo: un plan admite varias frecuencias al
  mismo precio por cobro (el café de cada semana o cada mes), y los planes con precio
  distinto por periodicidad (Evora Cloud mensual o anual) son planes separados.
- **B3. Anticipación del aviso previo.** Recomiendo: 1 día en semanal, 2 en cada 2 semanas,
  3 en mensual y cada 2 meses, y 7 en anual.
- **B4. Tope del plan.** `createOrder` cuenta todo pedido en el cupo, así que lo de la
  pregunta 8 («las renovaciones no cuentan») no se cumple sin tocar `limitsService`.
  Recomiendo: que cuenten, como en la fase A (su D19), y revisar el cupo y el estado de la
  empresa antes de cobrar: si el pedido no se podría crear, no se cobra, se avisa al comercio
  y el período se salta al cerrar su ventana.
- **B5. Pausa manual.** La fase A deja pausar al comercio. Recomiendo: en la fase B no, por
  ahora (la ruta compartida responde 409); ni el comercio ni el comprador pausan un cobro con
  tarjeta. Sigue la pausa automática.
- **B6. Envío.** Recomiendo: mantener «el precio del plan incluye el envío» (D-497). El
  recargo por zona de la referencia va en un ajuste aparte si un comercio lo pide.
- **B7. Cobro aprobado sin pedido.** Si el pedido falla después del cobro (empresa
  suspendida, cupo por una carrera), recomiendo: alerta al comercio y a Katuq, reintento
  diario mientras siga el problema, y ningún reembolso automático; soporte decide.
- **B8. Colección de períodos.** Recomiendo: seguir la respuesta a la pregunta D8 de la fase
  A (`storeSubscriptionPeriods` si se renombra).
- **B9. Duración.** Recomiendo: solo hasta que se cancele, sin número fijo de cobros ni
  permanencia mínima.
- **B10. Piloto.** El criterio del ticket es «Evora Cloud cada mes». No está verificado que
  Baudio sea Premium, tenga Wompi propio activo ni tenga Evora Cloud como producto.
  Recomiendo: probar en FLORECER (D-385) y revisar esos tres datos de Baudio en la fase 0 con
  una lectura de solo lectura.
- **B11. Fecha de entrega del pedido de cada período.** Hoy el pedido nacería con la fecha
  del día (`utils/siteOrden.js:64-76`), sin mirar las reglas de entrega de la tienda (días sin
  entregas, hora de corte y cupo del día, F2-15). Recomiendo: la fecha del cobro aprobado o, si
  ese día no se entrega o ya pasó la hora de corte, el siguiente día válido (hasta 14 días);
  horario «lo más pronto posible». El cupo del día no frena un período ya cobrado, pero el
  pedido sí ocupa cupo para los demás compradores. Sin día válido en 14 días, el pedido sale con
  la fecha del cobro y una alerta.
- **B12. Defecto existente de inventario (ver revisión privada).** Recomiendo: abrirlo ya como
  cambio aparte y sensible, con su diff, y que sea requisito para encender la fase A (que
  también descuenta por ese camino), no solo esta fase.
- **B13. Alinear la fase A.** (a) Su reclamo del período (`periodClaim.js`) debe aceptar el
  modo «tarjeta», que reserva, recupera y anota el pedido sin tocar el estado, el calendario ni
  el contador; (b) la fila «Crear el pedido» de su D9 debe decir «B: `construirOrden` directo,
  con el monto congelado» en lugar de «con el núcleo de D-496»; (c) `modes.js` y el script de
  interruptores con valores son de esta fase si la fase A no los crea. Recomiendo: aprobarlo
  junto con la fase A y anotarlo en su `design.md` cuando se apruebe.


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
