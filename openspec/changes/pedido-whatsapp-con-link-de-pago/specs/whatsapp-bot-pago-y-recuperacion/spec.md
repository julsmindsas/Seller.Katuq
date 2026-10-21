> **[21-oct] Nueva, pendiente de aprobación.** Ampliación de D-496 por D-518 (F4-40·4 y F4-40·5). Ticket F4-40, cd `PrDNIoDwRacCPQVcHmx1`, punto 3 («envía link de pago y confirma») y punto 5 («retoma carritos abandonados y cotizaciones sin respuesta conversando»).

## ADDED Requirements

### Requirement: Un enlace para pagar que sirve mientras el pedido esté apartado

Fuente: F4-40·5 («`/pagar` habilitado para pedidos del bot»).

THE system SHALL darle al cliente de un pedido del bot un enlace para pagar que no cambia. WHEN el cliente lo abre, THE system SHALL llevarlo al pago vigente o abrir uno nuevo si el anterior venció o fue rechazado, siempre sobre el mismo pedido y la misma reserva. IF el pedido ya está pagado, THEN THE system SHALL mostrarle que ya está pagado. IF venció o se anuló, THEN THE system SHALL decírselo. THE system SHALL cobrar solo con la pasarela propia del comercio. IF no puede, THEN THE system SHALL no abrir ningún pago y pedirle que escriba por WhatsApp.

#### Scenario: El banco rechazó el primer intento

- **WHEN** el pago del cliente fue rechazado y vuelve a abrir el enlace dentro de los 60 minutos
- **THEN** paga el mismo pedido, sin crear otro y sin mover la hora en que vence la reserva

#### Scenario: El comercio ya no tiene pasarela propia

- **WHEN** el cliente abre el enlace y la pasarela activa del comercio no es la propia
- **THEN** no se abre ningún pago y el cliente ve que debe escribir por WhatsApp

### Requirement: El pago aprobado se confirma por WhatsApp

Fuente: F4-40·4; punto 3 del ticket («y confirma»).

WHEN la pasarela aprueba el pago de un pedido del bot, THE system SHALL enviar una sola vez la plantilla de pago aprobado del comercio al celular de la conversación donde se hizo el pedido, por el mismo número de WhatsApp con el que conversó. Aplican las reglas que el comercio tiene para sus avisos por WhatsApp: canal aceptado, saldo y, según la pregunta 2 de `proposal.md`, el aviso de pago encendido. THE system SHALL NOT enviar la plantilla de WhatsApp de pedido creado para los pedidos del bot, porque el cliente ya recibió en la conversación el número, el total y el enlace.

#### Scenario: La pasarela avisa dos veces

- **WHEN** la pasarela reintenta el aviso de un pago ya aprobado
- **THEN** el cliente recibe una sola confirmación

#### Scenario: Otro número para recibir

- **WHEN** el cliente dio otro teléfono para quien recibe el pedido
- **THEN** la confirmación llega solo al celular con el que conversó

#### Scenario: Pedido de la tienda web

- **WHEN** se crea o se paga un pedido de la tienda que no es del bot
- **THEN** sus avisos salen exactamente como hoy

### Requirement: Recordatorio de pago en la conversación

Fuente: F4-40·5 («dentro de 24 h el bot retoma la conversación y reenvía el link»); crítica A1, A2 y A6; Ley 1581.

WHERE el pedido directo está encendido para el comercio, WHEN un pedido del bot sigue sin pagar entre 20 y 55 minutos después de creado, con la mercancía apartada, THE system SHALL escribirle una sola vez al cliente en la misma conversación y por el mismo número, con el número de pedido, el enlace para pagar y la hora en que vence la reserva, tenga o no correo. IF el cliente está en la lista de no contactar, THEN THE system SHALL NOT escribirle. IF el mensaje no puede salir (chat a cargo de una persona, cliente en la lista de no contactar, sin saldo o ventana cerrada) AND el pedido tiene correo, THEN THE system SHALL enviar el correo de recordatorio de la tienda en su lugar (según la pregunta 5 de `proposal.md`). THE system SHALL NOT enviar los dos. El recordatorio y el vencimiento de la reserva SHALL funcionar aunque el recordatorio de las demás compras de la tienda esté apagado.

#### Scenario: El cliente se distrajo

- **WHEN** pasan 25 minutos sin pago
- **THEN** recibe en el chat un mensaje con su número de pedido, el enlace para pagar y la hora límite
- **AND** no recibe un segundo recordatorio de ese pedido

#### Scenario: Pedido sin correo

- **WHEN** el cliente no dio correo y pasan 25 minutos sin pago
- **THEN** igual recibe el recordatorio en el chat

#### Scenario: Cliente que pidió no ser contactado

- **WHEN** el cliente está en la lista de no contactar del comercio
- **THEN** no recibe el recordatorio por WhatsApp

### Requirement: El bot retoma lo que quedó a medias, dentro de las 24 horas

Fuente: F4-40·5; punto 5 del ticket; crítica A4, A5 y M4.

WHERE el seguimiento del bot está encendido para el comercio, WHILE la ventana de conversación de 24 horas sigue abierta, THE system SHALL retomar una sola vez:

- la conversación con un carrito sin cerrar, después de un rato sin respuesta del cliente;
- la cotización que el bot envió y que el cliente no ha respondido.

El mensaje SHALL salir por el mismo número con el que el cliente conversó y SHALL recordar lo que quedó pendiente con datos reales: productos y total del carrito, con las opciones de seguir o hablar con una persona; o número y enlace para ver la cotización, con la opción de hablar con una persona. THE system SHALL NOT decirle que acepte la cotización en el enlace mientras ese enlace le pida datos que el bot no tiene (pregunta 17 de `proposal.md`). THE system SHALL NOT escribir:

- si una persona tomó la conversación;
- si el cliente pidió no ser contactado;
- si no hay saldo;
- fuera del horario de contacto que aplique;
- más de una vez por conversación y por día.

#### Scenario: Carrito sin cerrar

- **WHEN** el cliente armó un carrito, no lo cerró y lleva el tiempo definido sin escribir, dentro de la ventana
- **THEN** recibe un único mensaje con sus productos y el total, con las opciones «Seguir con mi pedido» y «Hablar con un asesor»

#### Scenario: Cotización sin respuesta

- **WHEN** el bot envió una cotización y el cliente lleva el tiempo definido sin responder, dentro de la ventana
- **THEN** recibe un único mensaje con el número y el enlace para verla, y la opción «Hablar con un asesor»

#### Scenario: Muchas conversaciones ya atendidas

- **WHEN** hay muchas conversaciones a las que ya se les escribió y llega una nueva con algo pendiente
- **THEN** la nueva recibe su seguimiento a tiempo

#### Scenario: Una persona tomó la conversación

- **WHEN** un vendedor tomó el chat
- **THEN** el bot no le escribe al cliente

#### Scenario: Ventana cerrada

- **WHEN** pasaron más de 24 horas desde el último mensaje del cliente
- **THEN** no sale ningún seguimiento en esta etapa

### Requirement: Fuera de las 24 horas, solo con plantilla, permiso y horario

Fuente: F4-40·5 («fuera de 24 h, con plantilla, consentimiento y horario de la Ley 2300, en una segunda etapa con el OK de Daniel del costo»).

WHERE la segunda etapa está encendida, THE system SHALL retomar fuera de la ventana de 24 horas solo con una plantilla aprobada por Meta, solo a quien dio su permiso expreso en la conversación (guardando el texto que vio y la fecha) y solo en el horario de la Ley 2300: lunes a viernes de 7 a 19 y sábados de 8 a 15, sin domingos ni festivos. IF no hay permiso registrado, THEN THE system SHALL NOT escribir. La segunda etapa SHALL permanecer apagada hasta que Daniel apruebe su costo.

#### Scenario: Sin permiso

- **WHEN** un carrito quedó a medias hace dos días y el cliente nunca dio permiso
- **THEN** no se le escribe

### Requirement: Recuperar no toca el catálogo ni crea ventas por su cuenta

Fuente: D-134; D-496.

THE system SHALL NOT crear pedidos ni cotizaciones al recordar o retomar, y SHALL NOT modificar productos, variantes, precios, precios por cliente, listas de precios ni existencias. Un pedido nuevo solo nace cuando el cliente confirma, por la capacidad `whatsapp-bot-pedido-directo`.

#### Scenario: Producto, variantes, precio y listas quedan sin cambios

- **WHEN** salen recordatorios y seguimientos durante un día
- **THEN** productos, variantes, precios, precios por cliente, listas de precios y existencias quedan exactamente iguales
