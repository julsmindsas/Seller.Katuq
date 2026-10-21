> **[21-oct] Nueva, pendiente de aprobación.** Ampliación de D-496 por D-518 (F4-40·1, ·2, ·6, ·7 y ·8). Ticket F4-40, cd `PrDNIoDwRacCPQVcHmx1`, puntos 2 (memoria), 3 (agendar visitas), 4 (postventa) y 6 (pase a humano).

## ADDED Requirements

### Requirement: KAI recuerda las cotizaciones del cliente

Fuente: punto 2 del ticket («historial de pedidos y cotizaciones»); F4-40·2 («memoria»); crítica M11.

WHERE la atención ampliada está encendida para el comercio, WHEN escribe un celular que tiene cotizaciones con ese comercio, hechas por el bot o registradas con ese mismo número de WhatsApp, THE system SHALL darle a KAI las más recientes: número, estado, fecha, total y, si está enviada, su enlace para verla. WHEN el cliente pregunta por su cotización, KAI SHALL responder solo con esos datos y ofrecer hablar con una persona para aceptarla o cambiarla. IF no hay cotizaciones de ese número, THEN KAI SHALL decirlo sin inventar. Una cotización registrada sin el WhatsApp del cliente no se encuentra (recorte declarado).

#### Scenario: ¿Qué pasó con mi cotización?

- **WHEN** un cliente con una cotización enviada pregunta por ella
- **THEN** KAI responde con su número, estado, fecha, total y enlace reales

#### Scenario: Cotizaciones de otro número

- **WHEN** un cliente pregunta por la cotización de otra persona
- **THEN** KAI no la encuentra ni la confirma

### Requirement: El pedido del bot conserva el origen del contacto

Fuente: punto 2 del ticket («su origen (F3-24)»); D-474; crítica M8.

WHEN el bot crea un pedido para un contacto de ese comercio que llegó por un enlace rastreado de la web o por un anuncio de WhatsApp, THE system SHALL guardar en el pedido de dónde llegó: la campaña del enlace o el anuncio. IF el contacto no tiene origen registrado, THEN el pedido SHALL quedar sin origen. THE system SHALL NOT usar ese origen para informarle la venta a ninguna plataforma de publicidad.

#### Scenario: Contacto que llegó por un anuncio

- **WHEN** un cliente que escribió desde un anuncio de WhatsApp compra por el bot
- **THEN** el pedido queda con ese anuncio como origen
- **AND** la venta no se informa a la plataforma del anuncio

### Requirement: Postventa informativa

Fuente: punto 4 del ticket; F4-40·7.

WHERE la atención ampliada está encendida, WHEN el cliente pregunta por envíos, cambios, devoluciones, garantía o tiempo de entrega, KAI SHALL responder solo con lo que el comercio publicó: sus páginas de políticas y la garantía y el tiempo de entrega de cada producto. IF el comercio no lo tiene escrito, o el texto está incompleto, THEN KAI SHALL decir que no tiene ese dato y ofrecer pasar con una persona. WHEN el cliente pide un cambio, una devolución o hace un reclamo, KAI SHALL informarle la política y pasar la conversación a una persona. KAI SHALL NOT tramitar cambios ni devoluciones.

#### Scenario: ¿Puedo cambiar la talla?

- **WHEN** un cliente pide cambiar la talla de un pedido
- **THEN** KAI le cuenta la política de cambios publicada y pasa la conversación a una persona
- **AND** el pedido no se modifica

#### Scenario: Política sin escribir

- **WHEN** el comercio no completó su política de cambios
- **THEN** KAI dice que no tiene esa información y ofrece pasar con una persona

### Requirement: KAI nunca descuenta

Fuente: reglas del ticket («respeta el descuento máximo»); F4-40·6.

THE system SHALL NOT permitir que KAI ofrezca, prometa ni aplique descuentos, rebajas o cupones, en ningún canal. Los precios que KAI informa SHALL ser los del comercio, con sus promociones automáticas y la lista del cliente.

#### Scenario: Regateo

- **WHEN** el cliente pide «¿me lo dejas más barato?»
- **THEN** KAI responde que el precio es el publicado y ofrece hablar con una persona

### Requirement: KAI agenda visitas sobre la Agenda del comercio

Fuente: punto 3 del ticket («agenda visitas (F2-44)»); F4-40·8; D-491.

WHERE el comercio tiene la Agenda encendida y configurada y la atención ampliada encendida, WHEN el cliente pide una cita o una visita, THE system SHALL ofrecerle solo días y franjas libres de la Agenda, como opciones para tocar. WHEN el cliente elige una franja todavía libre, THE system SHALL reservar la cita en la Agenda como «Solicitada», marcada como agendada por KAI, a nombre del celular de la conversación, y responderle en esa misma conversación el día, la franja y que el comercio la confirmará. Esa respuesta no es un aviso automático: los recordatorios de la cita siguen en la Agenda (D-491). IF la franja se ocupó, THEN THE system SHALL ofrecer las que siguen libres. IF el comercio no tiene Agenda, THEN KAI SHALL pasar la conversación a una persona.

#### Scenario: Cita reservada

- **WHEN** el cliente toca «Martes 9:00» y sigue libre
- **THEN** la cita queda en la Agenda como Solicitada y el cliente recibe la confirmación

#### Scenario: Dos clientes por el último cupo

- **WHEN** dos clientes eligen al mismo tiempo la última franja libre
- **THEN** solo uno queda con la cita y al otro se le ofrecen las demás

#### Scenario: Una reentrega del mismo toque

- **WHEN** el proveedor de mensajería entrega dos veces el mismo toque
- **THEN** existe una sola cita

### Requirement: El pase a una persona queda en la bandeja de Katuq con el pedido

Fuente: punto 6 del ticket; F4-40·1 (Chatwoot descartado); crítica M5.

WHEN la conversación pasa a una persona después de que el bot creó un pedido para ese celular, también si la conversación se reabrió después del cierre, THE system SHALL mostrar en la conversación de la bandeja de WhatsApp de Katuq el número del pedido, su total y si está pagado, junto con el motivo del traspaso. THE system SHALL NOT usar herramientas externas de atención para el traspaso.

#### Scenario: Pedido creado y el cliente pide una persona

- **WHEN** el bot creó el pedido y el cliente pide hablar con alguien
- **THEN** quien toma el chat ve el número, el total y el estado de pago del pedido

#### Scenario: El cliente vuelve a escribir después del cierre

- **WHEN** el cliente escribe al día siguiente, la conversación empieza de nuevo y pide una persona
- **THEN** quien toma el chat sigue viendo el último pedido que el bot creó para ese celular

### Requirement: Con la atención ampliada apagada, el bot responde como hoy

Fuente: C14 del informe; Artículo XII.

WHILE la atención ampliada está apagada para el comercio, THE system SHALL atender exactamente como hoy: mismas instrucciones del agente, mismos datos y mismas respuestas.

#### Scenario: Comercio sin la bandera

- **WHEN** un comercio sin la atención ampliada recibe un mensaje
- **THEN** el agente recibe las mismas instrucciones que antes de este cambio

## [NEEDS CLARIFICATION]

- Tono de «Mi marca» en KAI: el ticket lo pide y D-518 no lo asigna. Pregunta 9 de `proposal.md`.
- Registro de cada conversación en el CRM y a qué vendedor se asigna (ticket 1064, cd `lBVv92nUKqJSeGK7lEdp`). Pregunta 10.
