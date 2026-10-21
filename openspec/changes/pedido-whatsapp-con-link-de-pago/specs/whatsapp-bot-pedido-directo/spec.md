> Aprobada por Daniel el 2026-10-18 (D-496). Los bloques marcados **[21-oct]** son la ampliación por D-518 (F4-40·3, ·4 y ·5) y están **pendientes de aprobación**. El texto anterior que reemplazan queda indicado. Ticket: F4-40, cd `PrDNIoDwRacCPQVcHmx1`.

## ADDED Requirements

### Requirement: El pedido directo solo se ofrece cuando todo lo permite

Fuente: criterio (a) del ticket; D-496; **[21-oct]** F4-40·3 (cotizables).

WHERE el pedido directo está encendido para el comercio (interruptor general, bandera del comercio y modo activo del bot), THE system SHALL ofrecer el pedido con link de pago solo si se cumplen todas estas condiciones: el bot atiende fuera de modo sombra; el comercio tiene una sola tienda publicada que recibe pedidos, con bodega y pago en línea; la pasarela activa es la propia del comercio; el cliente no eligió otra forma de pago; todo lo del carrito se resuelve sin ambigüedad en esa tienda; **[21-oct]** ningún producto del carrito está marcado por el comercio para cotizar; y ese celular tiene menos de 2 pedidos directos sin pagar con la mercancía todavía apartada. IF falta cualquiera, THEN THE system SHALL cerrar con la cotización de hoy y registrar el motivo.

#### Scenario: Una llave apagada deja el bot como hoy

- **WHEN** el interruptor general, la bandera del comercio o el modo activo están apagados
- **THEN** el cierre es la cotización de hoy, sin ninguna diferencia para el cliente
- **AND** no se crea pedido ni se genera link

#### Scenario: El comercio cobra con la pasarela de la plataforma

- **WHEN** el comercio no tiene pasarela propia activa
- **THEN** el bot cierra con cotización y no genera ningún link

#### Scenario: [21-oct] Un producto para cotizar manda todo el carrito a cotización

- **WHEN** el carrito tiene un producto que el comercio marcó «Cotiza con un asesor», junto con otros que se pueden comprar
- **THEN** todo el carrito se cierra con una sola cotización y no se crea ningún pedido
- **AND** el motivo queda registrado como producto para cotizar

#### Scenario: Pedidos vencidos o anulados no bloquean al cliente

- **WHEN** el celular tiene pedidos directos sin pagar cuya reserva ya venció o que están anulados, cancelados o rechazados
- **THEN** esos pedidos no cuentan para el tope de 2 y el cliente puede recibir un pedido directo nuevo

#### Scenario: Dos pedidos sin pagar todavía apartados

- **WHEN** el celular ya tiene 2 pedidos directos sin pagar con la mercancía apartada
- **THEN** el bot cierra con cotización y registra el motivo

### Requirement: El cliente confirma el mismo total que se cobra

Fuente: criterio (a); C3 del informe; D-496; **[21-oct]** F4-40·5 (enlace para pagar).

WHEN el carrito está listo y el pedido directo aplica, THE system SHALL mostrar productos, envío, descuento y total calculados como los calcula la tienda, con las opciones «Pagar en línea» y «Hablar con asesor», sin escribir nada. WHEN el cliente toca «Pagar en línea», o responde con una confirmación corta e inequívoca, mientras la propuesta está vigente y el carrito no cambió, THE system SHALL crear el pedido con precios del maestro, existencias reales de la bodega de la tienda, consecutivo de pedido, mercancía apartada al crear y pago de un solo uso. THE system SHALL responder con número, total, el enlace para pagar y el aviso de que queda apartado 60 minutos. **[21-oct]** El enlace es el de pagar de la tienda (capacidad `whatsapp-bot-pago-y-recuperacion`), no el del pago de un solo uso. *Antes:* «link de pago de un solo uso».

#### Scenario: El cliente toca «Pagar en línea» o escribe «sí»

- **WHEN** el cliente confirma con el botón o con un «sí», «dale» o «listo»
- **THEN** se crea un pedido y el bot responde con número, total y enlace para pagar
- **AND** un mensaje como «sí, pero cambia la talla» no confirma

#### Scenario: El cliente pide un asesor

- **WHEN** el cliente toca «Hablar con asesor»
- **THEN** se crea la cotización de hoy y la conversación pasa a un asesor, sin pedido

#### Scenario: La propuesta venció o el carrito cambió

- **WHEN** el cliente confirma una propuesta vencida o un carrito distinto al propuesto
- **THEN** no se crea pedido y el bot muestra una propuesta nueva

#### Scenario: El pedido dice de dónde vino

- **WHEN** el bot crea un pedido directo
- **THEN** el pedido queda con asesor KAI, canal WhatsApp y la marca de origen del bot
- **AND** un cliente que nace en esa compra queda registrado con origen WhatsApp, no como cliente del sitio web

### Requirement: Una confirmación crea un solo pedido

Fuente: Artículo IV; D-496; **[21-oct]** F4-40·5.

THE system SHALL crear a lo sumo un pedido por propuesta confirmada. WHEN llega una reentrega del proveedor de mensajería, una ráfaga, o un segundo «sí» o «link» mientras el pedido sigue sin pagar y con la mercancía apartada, THE system SHALL reenviar el mismo número y el mismo enlace para pagar, sin crear otro pedido y sin reabrir la conversación. *Antes:* «dentro de los 30 minutos siguientes a crear el pedido».

#### Scenario: Dos confirmaciones al mismo tiempo

- **WHEN** llegan dos confirmaciones de la misma propuesta casi a la vez
- **THEN** existe un solo pedido y las dos respuestas traen el mismo enlace

#### Scenario: El cliente pide el link otra vez

- **WHEN** el cliente escribe «link» o «sí» 40 minutos después de recibir su pedido, que sigue sin pagar y apartado
- **THEN** el bot reenvía el mismo número y el mismo enlace
- **AND** una reentrega de ese mismo mensaje no recibe una segunda respuesta

#### Scenario: El pedido ya no está apartado

- **WHEN** el cliente escribe después de que el pedido se pagó o venció
- **THEN** empieza una conversación nueva con el carrito vacío, como hoy

#### Scenario: [21-oct] El cliente pide el link de un pedido que ya pagó

- **WHEN** el cliente escribe «link» o «sí» dentro de los 60 minutos y el pedido ya está pagado
- **THEN** el bot le dice que ya recibió su pago, con el número del pedido, y no reenvía ningún enlace
- *Antes:* caía en «El pedido ya no está apartado»

### Requirement: Lo que el cliente no vio no se cobra

Fuente: C3 del informe; D-496.

IF entre la propuesta y la creación cambia el precio, las existencias, el cupo del día, la fecha o el tope del plan, THEN THE system SHALL no crear el pedido ni gastar consecutivo, SHALL decirle al cliente qué cambió y SHALL proponer de nuevo una sola vez. IF vuelve a fallar, THEN THE system SHALL pasar la conversación a un asesor. IF el pedido se crea pero el pago no se puede abrir, THEN THE system SHALL dejar el pedido pendiente de pago y pasar la conversación a un asesor con el número.

#### Scenario: El precio cambió antes de pagar

- **WHEN** el total calculado al confirmar difiere del que vio el cliente
- **THEN** no se crea pedido y el bot muestra el total nuevo para confirmar

### Requirement: El bot no inventa condiciones

Fuente: reglas del ticket («nunca inventa precios… respeta el descuento máximo»); D-496; **[21-oct]** F4-40·6.

THE system SHALL NOT inventar precios, existencias, descuentos, cupones ni valor del domicilio. **[21-oct]** KAI SHALL NOT ofrecer ni aplicar descuentos propios; así se cumple el descuento máximo del comercio (escenario «Regateo» en `kai-whatsapp-atencion`). El envío SHALL salir de la configuración de la tienda. IF la ciudad no corresponde a una sola zona de cobro, THEN THE system SHALL cerrar con cotización. Las promociones automáticas y la lista de precios del cliente SHALL aplicarse como en la tienda; los cupones no aplican. WHEN el cliente pide hablar con una persona, THE system SHALL pasar la conversación sin crear pedido.

#### Scenario: La ciudad no da una sola zona

- **WHEN** la ciudad de entrega corresponde a varias zonas de cobro de la tienda, o a ninguna
- **THEN** el bot cierra con cotización y no inventa el valor del domicilio

### Requirement: El pedido del bot no dispara efectos de la página

Fuente: D-496; **[21-oct]** F4-40·4 y F4-40·5; crítica A3 (la página de confirmación también informaba la compra).

WHILE un pedido tiene origen bot, THE system SHALL NOT registrarlo en la analítica ni en el contador del sitio, SHALL NOT informar conversiones a plataformas de publicidad y SHALL NOT tocar carritos abandonados. La conciliación del pago, la reserva, el vencimiento a los 60 minutos, las notificaciones del pedido y el tope del plan SHALL funcionar igual que en la tienda. **[21-oct]** La excepción es la plantilla de WhatsApp de pedido creado, que no se envía. El recordatorio, el enlace para pagar y la confirmación del pago se rigen por `whatsapp-bot-pago-y-recuperacion`. *Antes:* «SHALL NOT enviar el correo de recordatorio de pago de la tienda y SHALL NOT generar links nuevos desde el enlace de pago del recordatorio» (SUPERSEDED por F4-40·5).

#### Scenario: El cliente paga

- **WHEN** la pasarela aprueba el pago de un pedido del bot
- **THEN** el pedido queda pagado una sola vez, también ante reintentos de la pasarela
- **AND** el inventario no se descuenta por segunda vez
- **AND** no se registra evento del sitio ni conversión de publicidad
- **AND** **[21-oct]** tampoco cuando la pasarela lo devuelve a la página de confirmación de la tienda, que sí le muestra el pago aprobado

#### Scenario: El cliente no paga

- **WHEN** pasan 60 minutos sin pago
- **THEN** el pedido queda anulado y sus existencias vuelven a la bodega
- **AND** si el pago llega tarde, el pedido revive como en la tienda

### Requirement: Modo sombra

Fuente: D-496 (encendido gradual).

WHILE el modo del bot es sombra, THE system SHALL calcular el pedido que habría creado y registrarlo con el total de la tienda y el de la cotización, sin crear pedido, sin apartar mercancía, sin cobrar y sin escribir fuera del registro. El cliente SHALL recibir la cotización de hoy.

#### Scenario: Cierre en modo sombra

- **WHEN** un cliente elegible confirma mientras el modo del bot es sombra
- **THEN** recibe la cotización de hoy y queda el registro con los dos totales
- **AND** no hay pedido, consecutivo, reserva ni link

### Requirement: El pedido directo no modifica el catálogo

Fuente: D-134; D-496; C13 del informe.

THE system SHALL escribir únicamente pedidos, consecutivo de pedido, existencias y sus movimientos por el camino existente de reserva y devolución, clientes, el tope del plan, las notificaciones del pedido y la sesión del bot. THE system SHALL NOT crear, editar, activar ni desactivar productos, variantes, precios, precios por cliente, listas de precios, catálogo, sitios ni cotizaciones en el camino directo.

#### Scenario: Producto, variantes, precio y listas quedan sin cambios

- **WHEN** el bot crea un pedido directo y después el pedido se paga, o vence sin pago
- **THEN** productos, variantes, precios, precios por cliente y listas de precios quedan exactamente iguales que antes
- **AND** las existencias cambian solo en las unidades del pedido, en la bodega de la tienda, por el camino existente de reserva y devolución

### Requirement: Rastro sin datos personales

Fuente: Artículos VII y XI; D-496.

THE system SHALL registrar cada propuesta, pedido creado, caída a cotización, fallo, evaluación en sombra y repetición con comercio, hash del celular, correlación, motivo, latencia, total y número de pedido. THE system SHALL NOT registrar teléfono, nombre, dirección ni el enlace para pagar.

#### Scenario: Un pedido directo deja rastro

- **WHEN** el bot crea un pedido directo
- **THEN** queda un registro con el comercio, el hash del celular, el total y el número de pedido, sin teléfono, nombre, dirección ni enlace
