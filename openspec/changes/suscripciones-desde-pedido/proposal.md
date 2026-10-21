# Suscripción desde un pedido: entregas programadas que se crean solas (fase A)

> Ticket de Jairo «CREAR OPCION DE SUSCRIPCIONES DENTRO DE LAS OPCIONES DE LOS PEDIDOS»
> (**cd `7OaxPVn97s3dUKpkr8OA`**). Su nroTicket, 1230, también es el de F2-21
> (`DJSTc5qXrOZ08fzwZs8t`), así que se cita siempre por cd. Comercio afectado: CAFE ESCOBAR.
> Es la **fase A** del modelo único de suscripción que aprobó D-518 (F2-43·1). La fase B es
> `openspec/changes/suscripciones-en-la-tienda` (D-497, F2-43 `UVaf50kn4UPbI358NGMk`) y
> amplía este mismo modelo.
> Toca **pedidos, consecutivos e inventario** (módulos sensibles). Es una propuesta para
> aprobar, no para implementar. El número de decisión lo asigna quien registra esta
> propuesta en `specs/CONTRACT.md`.
> Revisada el 21-oct con dos críticas (requerimiento y riesgo), verificadas contra el código.

## Why

**Lo que pide el ticket** (descripción del 18-oct; sin comentarios al 21-oct):
1. En un pedido **ya creado**, una opción «Suscripciones» para «programarlo, publicarlo o
   replicarlo automáticamente».
2. Se elige desde-hasta y, según la frecuencia, salen las fechas de cada entrega.
3. La frecuencia puede ser semanal, cada dos semanas, mensual, cada dos meses «o incluso
   fecha exacta, pero en la fecha exacta debe sacar por lo menos, si yo elijo la suscripción
   a 5 veces, las 5 fechas en que se entregará». No queda claro si las fechas exactas se
   eligen a mano o si el sistema las calcula (pregunta J2).
4. «Así se crean varios pedidos automáticamente».

**Adjuntos** (los 4 abiertos; 1 y 4 son idénticos):
- 1: el selector «¿Cada cuánto quieres recibir tu suscripción?» de suscripciones.co
  (Semanal, Cada Dos Semanas, Mensual, Cada Dos Meses), con la nota en rojo «O CON FECHAS
  VARIABLES EXACTAS».
- 2: precios de suscripciones.co («cobros recurrentes automáticos»).
- 3: el plan «Alto de Letras» de Pergamino ($49.900 antes de envío, con cantidad, molienda
  y tamaño).

**Referencias** (lectura pública del 21-oct): suscripciones.co automatiza el cobro
recurrente con Wompi o PayU, con frecuencias fijas. La tienda de Pergamino ofrece
frecuencia semanal, quincenal o mensual, con cantidad, molienda y gramaje. El cobro con
tarjeta es la fase B. Esta fase cubre la programación de entregas que pide el ticket.

**Antecedentes de Jairo** (serie «MODULO DE PEDIDOS / OPCIONES», todos resueltos):
- 1187 (`gKRuhCpHb9qTdvmUEqsN`) nombró y describió las 16 opciones del modal. Quedaron
  pendientes sus traducciones EN/PT, que siguen en ese ticket. Esta fase solo traduce su
  opción nueva.
- 1189 (`PjktK1sTJgVt8cacexc8`) llevó «Duplicar pedido» a la lista general: «el nuevo
  debes editarlo según tus necesidades».
- 1197 (`HSa2F8E8bXhBcIa8VG5T`) resolvió los productos **sin calendario**
  (`procesoComercial.llevaCalendario`): avisan que su fecha de entrega es hoy y tienen un
  botón para elegir fecha, forma y hora, al vender y al editar el producto desde el
  pedido. Por eso cada línea de un pedido puede tener su propia fecha (pregunta J6).

**Qué hay hoy** (código leído el 21-oct en `wt-front-tickets-web` y
`wt-back-tickets-web/functions`, HEAD `097ede2e`, con los cambios de F2-41 sin commit en
`sites.js` y `cronService.js`; el detalle con archivo y línea está en `design.md`):
- **Duplicar copia una vez y no programa nada.** Clona en el navegador, deja el pago
  Pendiente, borra `integrations`, recalcula en el navegador y llama a `/v1/orders/create`
  una sola vez, sin cambiar la fecha de entrega.
- **Crear un pedido gasta en el acto** un consecutivo, el cupo del plan Gratis y el
  inventario. Crear hoy N pedidos futuros descontaría hoy el inventario de meses y
  gastaría N consecutivos y N cupos (D-518, F2-43·1).
- **El precio no se conserva solo.** `/v1/orders/create` aplica las promociones del día.
  Además, la campaña de una lista por tipo de cliente se evalúa contra la fecha de
  creación del pedido: un pedido creado después de que vence la campaña sale al precio de
  lista. CAFE ESCOBAR usa precios por volumen y ya tuvo diferencias entre lo guardado y lo
  recalculado (BAR-000428, `CONTRACT.md`).
- **El inventario sale por caminos distintos según el origen.** La venta asistida
  descuenta por canal. La tienda descuenta por bodega, porque su pedido no trae canal y
  «por canal fallaría en silencio» (D-204). Los pedidos de WooCommerce descuentan por el
  webhook de Woo, y la sincronización de Woo **fija** la cantidad de su bodega con la de
  la web.
- **Los dos generadores de consecutivo no son iguales.** El de `/create` salta números ya
  usados cuando el contador está desfasado; el del camino de servidor que usa la tienda
  solo suma 1.
- **Un pedido base trae campos que no se pueden copiar**: enlaces de pago de la tienda
  (el webhook busca el pedido por enlace y, con dos coincidencias, no procesa ninguno),
  huella de inventario del libro (otro pedido la rechaza), medición, campaña e ids de Woo.
- **La lista y los despachos leen la fecha de entrega en dos sitios**: la del pedido (la
  lista filtra por ella) y la de cada línea (de ahí leen los despachos).
- **La confirmación al cliente** depende del HTML que arma el navegador, salvo en las
  empresas migradas al tren unificado. CAFE ESCOBAR ya lo está (`CONTRACT.md`, D-099), por
  una lista en el `.env` que es deuda frente a D-505.
- **Crones:** `CRON_ENABLED` y `conLatido`. El comentario del propio cron registra corridas
  dobles de un segundo proceso: la idempotencia no puede depender de que corra una vez.

## What Changes

- **Opción «Suscripciones» en «Opciones del Pedido».**
  - Con el pedido base, el comercio elige frecuencia (semanal, cada 2 semanas, mensual o
    cada 2 meses) o fechas exactas. Con frecuencia, define desde y hasta, o desde y un
    número de entregas.
  - Antes de confirmar ve **todas** las fechas y el valor de cada entrega.
  - Si la suscripción ya existe, la misma opción muestra el estado, las próximas fechas,
    lo creado y las alertas, con **Pausar**, **Reanudar** y **Cancelar**.
- **Cada pedido se crea el día que le toca** (D-518, F2-43·1), con un trabajo diario, y
  nunca después de su fecha de entrega. Nunca se crean todos de una vez. Cada entrega gasta
  su consecutivo, su cupo y su inventario el día en que se crea.
- **Precio congelado** (F2-43·2). El valor se calcula y se fija al crear la suscripción, con
  la fecha de precio del pedido base, y se muestra antes de confirmar. Las entregas no
  aplican promociones nuevas, rangos, listas ni campañas que cambien después. Si el
  comercio cambia precios, actualiza la suscripción (pregunta D4).
- **Se paga como hoy** (F2-43·1). Cada pedido nace Pendiente, con forma de pago manual o
  contra entrega. Si el base se pagó por pasarela, el comercio elige otra forma al
  programar. No hay cobro automático (fase B).
- **Confirmación normal al cliente** (F2-43·3), el día en que se crea cada pedido, una vez.
- **Sin revisar existencias de lo no inventariable** (F2-43·7), leído del producto vigente.
- **Pedidos que nacieron en WooCommerce** (F2-43·4). Las entregas quedan solo en Katuq, sin
  ningún dato que las vincule a Woo. No suben a Woo hasta que WP-INT 9 decida.
- **Pantalla «Suscripciones»** (base `cfg-pagina`, D-400). No la pide el ticket, pero las
  alertas (tope del plan, existencias, pedido base anulado, inventario dudoso) necesitan un
  lugar donde se vean aunque el pedido base ya no esté en la lista. La fase B la amplía
  (pregunta D9).
- **Mismo modelo que la fase B** (D-497, T·3): `storeSubscriptions` y sus períodos, con
  origen (`order`), modo de cobro (`manual`), líneas congeladas con variante y cantidad,
  calendario calculado desde un ancla, pausa como campo aparte y fin abierto para la fase B.
  Lo que se comparte y lo que va por origen está en `design.md` (D9).
- **Banderas en Firestore** (D-505):
  - por comercio, `featureFlags.orderSubscriptions`;
  - global, `config/feature_flags.storeSubscriptionDeliveries` = `apagado | sombra | crear`,
    que gobierna solo las suscripciones de cobro `manual`.
  - Nacen apagadas para todos. CAFE ESCOBAR se enciende solo después de FLORECER (D-385),
    con las preguntas J1-J8 y D13 respondidas y el OK de Daniel.

## Capabilities

### New Capabilities
- `suscripcion-desde-pedido`: programar entregas desde un pedido existente, ver fechas y
  valor antes de confirmar, pausar, reanudar, cancelar y la pantalla del comercio.
- `entregas-de-suscripcion`: crear cada pedido el día que le toca, con un solo pedido por
  fecha, inventario una sola vez, consecutivo, cupo, confirmación, modos y observabilidad.

### Modified Capabilities
_(ninguna spec vigente describe pedidos ni suscripciones. La fase B ajusta sus artefactos
según `design.md`, sección «Cómo la amplía la fase B»)_

## No-goals

- Cobro automático o tokenizado (fase B), enlaces de pago por entrega y cobro de envío por
  zona aparte del que trae el pedido base.
- Que el comprador se suscriba solo (página o enlace). Es la fase B si «publicarlo»
  significa eso (pregunta J1).
- Subir a WooCommerce los pedidos generados o su stock (F2-43·4, WP-INT 9).
- Cambiar `/v1/orders/create`, Duplicar, `sites.crearPedido`, la reserva, `/pagar` o
  `inventoryService`.
- `orderService` y `orderCalculationService` no cambian, **salvo** los dos cambios mínimos
  [S] que se proponen como preguntas D3 (fecha de precio) y D14 (id de pedido
  determinístico). Sin el OK de Daniel, la fase A funciona con las alternativas descritas.
- Enviar las entregas a Aliaddo o a MultiOP (pregunta D16).
- Facturar sola cada entrega. Se factura como cualquier pedido Pendiente.
- Mover fechas por festivos, días bloqueados o cupo diario (pregunta J7), editar fechas
  sueltas de una suscripción activa y avisar al cliente de pausas o cancelaciones.
- Bases del POS (pregunta J8).
- Las traducciones EN/PT de las 16 opciones de 1187 (siguen en ese ticket).

## Riesgos

- **Pedidos duplicados por fecha.** Registro por período con id determinístico, reclamado en
  transacción antes de crear. Con D14, además, el id del pedido sale del período y la base
  de datos rechaza un segundo documento. Sin D14, la recuperación por
  `storeSubscription.periodId` es el respaldo, con el riesgo de una corrida que tarde más
  que la reserva de 10 minutos. Hay pruebas de doble corrida, caída y recuperación.
- **Inventario doble o perdido.** Camino por origen (venta asistida por canal, tienda por
  bodega). En modo legado se marca el intento antes de descontar; si queda a medias o no se
  sabe, alerta sin repetir. En modo transaccional se reintenta, porque es idempotente.
- **CAFE ESCOBAR y WooCommerce.** Si la bodega de las entregas es la que Woo sincroniza, la
  sincronización siguiente pisa el descuento y Woo no se entera. No se enciende CAFE
  ESCOBAR sin la respuesta D13.
- **Consecutivos.** El camino de servidor no salta números usados: con el contador
  desfasado puede dar un `nroPedido` repetido (pregunta D15). Cada intento bloqueado por el
  tope del plan también gasta un número, porque el número se toma antes de contar el cupo;
  por eso se revisa el tope antes de llamar a crear.
- **Precio.** Una campaña que vence entre el alta y la entrega cambiaría el total (pregunta
  D3). Si el total armado difiere del congelado en más de $1, no se crea y se alerta.
- **Fecha de entrega.** Se fijan la del pedido y la de cada línea, o el pedido no aparece en
  la lista del día ni en despachos.
- **Campos copiados.** Enlaces de pago, huella de inventario, medición, campaña, ids de Woo y
  marcas de reserva se borran de la plantilla, con prueba por cada origen.
- **Anulación por la reserva de la tienda.** Las entregas nunca llevan forma de pasarela, así
  que el barrido no las anula aunque lleven la marca de inventario de la tienda. Hay prueba.
- **Efectos de `/create` que no se repiten.** Aliaddo, MultiOP y el SMS de las empresas no
  migradas (tabla en `design.md`, D5; pregunta D16).
- **Datos personales.** La plantilla guarda cliente y dirección: reglas de Firestore que
  nieguen la lectura desde el cliente, con el ticket de reglas 1320 aún abierto.
- **Unión de ramas** (T·2): F2-41 → D-496 → suscripciones → pago rechazado de TX-34. La
  dependencia con D-496 es de orden de unión. `sites.js` y `cronService.js` tienen hoy
  cambios de F2-41 sin commit.
- **Write-set** (tabla completa en `design.md`): `storeSubscriptions` y sus períodos; por los
  caminos existentes, `consecutives`, `orders`, el cupo en `companies`, `inventory`,
  `inventoryMovement`, `inventory_audit`, `orders.inventoryEffect`, `productOrderIndex` y los
  avisos. `products`, precios, listas de precios, el pedido base y cualquier campo de
  integración quedan en solo lectura.
- **Backend local.** El trabajo queda detrás de `CRON_ENABLED` y del modo global, porque el
  backend local corre crones contra la Firestore de producción.

## Preguntas abiertas

Cada una trae el valor por defecto que se aplica si se acepta sin cambios. Los requisitos
que dependen de ellas están marcados como provisionales en las specs.

Para **Jairo** (se las hace Daniel o se dejan en el ticket `7OaxPVn97s3dUKpkr8OA`):
- **J1. «Publicarlo»** (punto 1). ¿Que el comprador se suscriba solo, por un enlace o en la
  web? Si es así, es la fase B (F2-43·5). Por defecto, la fase A no lo cubre.
- **J2. «Fecha exacta»** (punto 3). ¿Son días que el comercio elige a mano, o un día fijo
  que se repite N veces (por ejemplo, el 15 de cada mes, 5 veces) y el sistema saca las
  fechas? Por defecto, las dos: la segunda es la frecuencia mensual con fecha de inicio, y
  las fechas exactas son una lista elegida a mano.
- **J3.** ¿Las «5 entregas» incluyen el pedido base? Por defecto, son 5 pedidos nuevos y la
  primera fecha propuesta es la del pedido base más una frecuencia.
- **J4.** ¿El pedido se crea el día de la entrega o unos días antes, para alistarlo? Por
  defecto, el mismo día a las 6:15 (Colombia), con una revisión el día anterior que avisa
  si no se va a poder crear.
- **J5.** ¿Una entrega que cae en una pausa se salta o se corre? Por defecto se salta.
- **J6.** Si las líneas del pedido base tienen fechas distintas (1197), ¿cada entrega
  conserva esa diferencia? Por defecto, sí: cada línea conserva sus días de diferencia con
  la primera.
- **J7.** ¿Hay que evitar domingos, festivos o los días bloqueados de la tienda? Por
  defecto, las fechas no se mueven; quien necesite evitarlas usa fechas exactas.
- **J8.** ¿Se puede programar un pedido del POS? Por defecto, no: el POS nace Entregado y
  Aprobado, y la opción aparece deshabilitada.

Para **Daniel**:
- **D1. Entregas que no se pueden crear.** Por el tope del plan, por la política de
  bloquear sin existencias (D-362) o con la empresa suspendida: ¿se reintenta hasta el día
  de la entrega y luego se salta con alerta? Por defecto, sí, nunca después de la fecha de
  entrega.
- **D2. ¿Qué precio se congela?** Si el total guardado del pedido base no coincide con el
  recalculado (BAR-000428), por defecto se congela el recalculado por el servidor. Se
  muestra en la vista previa y el comercio lo confirma.
- **D3. Fecha del precio.** Para que una campaña vencida no cambie el total: (a) un campo
  `fechaPrecio` en el pedido generado, que leen el calculador del servidor y su espejo del
  Seller (cambio [S] pequeño); o (b) sin cambio, con aviso en la vista previa, y las
  entregas posteriores al vencimiento no se crean y alertan. Recomendado: (a).
- **D4. «El comercio actualiza la suscripción»** (F2-43·2). Por defecto, con «Cambiar pedido
  base»: las entregas que faltan toman las líneas y el precio de otro pedido de la empresa.
  La alternativa es editar los precios en la suscripción.
- **D5. Confirmación.** En las empresas migradas (CAFE ESCOBAR), la que ya sale. En las no
  migradas, el correo del servidor («Envía de nuevo la confirmación»), sin SMS. ¿El correo
  automático respeta la preferencia «pedido creado» del comercio? Por defecto, sí. Con base
  de la tienda, se envía la confirmación de pedido creado, no el correo de la tienda.
- **D6. Roles.** Por defecto, quien puede usar «Duplicar» crea, pausa y reanuda, y cancelar
  exige Administrador.
- **D7. Topes.** Por defecto, en la fase A, 52 entregas y 12 meses. La fase B no tiene fin.
- **D8. Colecciones.** Por defecto, las de D-497 (`storeSubscriptions` y
  `storeSubscriptionCharges`). Como aún no hay código de ninguna fase, ¿se renombra la
  segunda a `storeSubscriptionPeriods`?
- **D9. Pantalla y su entrada.** Por defecto, `ventas/suscripciones`, con un botón en Todos
  los pedidos y sin entrada nueva en `menus`. La fase B entraría ahí.
- **D10. Código de descuento del base.** Por defecto, queda en el precio congelado y no
  cuenta como un uso nuevo.
- **D11. ¿Solo Premium?** D-497 permite altas solo a Premium. Por defecto, igual en la fase
  A. CAFE ESCOBAR es Premium de pago.
- **D12. Banderas y rutas.** Por defecto, `orderSubscriptions` (fase A) y
  `storeSubscriptions` (fase B) siguen separadas; la pantalla aparece con cualquiera de las
  dos, y la fase B mueve sus rutas del comercio a `/v1/store-subscriptions`.
- **D13. Inventario de las entregas de un pedido Woo (CAFE ESCOBAR).** ¿Descuentan de la
  bodega que sincroniza Woo, de otra bodega o no descuentan? Por defecto, el comercio elige
  al programar una bodega que no sincroniza Woo. Si no tiene ninguna, CAFE ESCOBAR no se
  enciende hasta WP-INT 9.
- **D14. Id de pedido determinístico.** ¿Se agrega a `orderService.createOrder` la opción de
  recibir el id del documento (cambio [S] pequeño)? Así un segundo pedido de la misma
  fecha es imposible. Recomendado: sí.
- **D15. Consecutivo desfasado.** ¿Un cambio [S] aparte para que el generador de servidor
  salte números usados, como el de `/create`? Ayuda también a la tienda. Por defecto, sí,
  y mientras tanto se comprueba el número después de crear y se alerta.
- **D16. Efectos de `/create`.** Por defecto se invalida la caché de pedidos y no se envía a
  Aliaddo ni a MultiOP. Una empresa que use bodega de cumplimiento o MultiOP no se
  enciende hasta decidirlo.
- **D17. Pedido base anulado, cancelado o eliminado, o cliente que cambia de datos.** Por
  defecto, la suscripción se pausa con alerta (no se cancela sola), y las entregas usan los
  datos congelados hasta «Cambiar pedido base».
- **D18. Producto borrado o inactivo.** Por defecto, «borrado» es que el documento no existe
  o es de otra empresa: la entrega se salta con alerta. Un producto inactivo se entrega con
  alerta, porque el comercio lo vendió así.
- **D19. Tope del plan Gratis.** El camino de crear cuenta cada pedido en el tope. D-497
  supuso que sus renovaciones no contarían. Por defecto, cuentan en las dos fases; no
  contarlas exige tocar el servicio de límites.
- **D20. Orígenes cubiertos.** Por defecto, la fase A acepta pedidos base de venta asistida,
  de la tienda y de WooCommerce. Los de Shopify, Kuvo, el bot de WhatsApp u Osmosis
  descuentan inventario por caminos propios: la opción aparece deshabilitada con el motivo
  hasta decidirlo.
