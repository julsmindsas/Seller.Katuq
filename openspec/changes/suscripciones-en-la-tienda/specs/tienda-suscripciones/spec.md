> **[21-oct]** Ajuste pendiente de aprobación (D-518 F2-43·1 y ·7; tarea 0.9). El requisito
> «Planes de suscripción configurados por el comercio», aprobado el 18-oct, pasó ampliado
> (frecuencias, variante y cantidad) a `specs/planes-de-suscripcion`. Se agregó la fuente de
> cada requisito. Ticket F2-43: cd `UVaf50kn4UPbI358NGMk`.

## ADDED Requirements

### Requirement: Disponibilidad decidida por el servidor
THE system SHALL ofrecer suscripciones solo si se cumplen todas estas condiciones: la función está activada para el comercio, su plan de Katuq la incluye, el comercio cobra con su propia cuenta de la pasarela de pagos y el cobro global está encendido. THE system SHALL NOT cobrar suscripciones con la cuenta de la plataforma. La decisión SHALL tomarse en el servidor, y el panel del comercio SHALL mostrar el motivo cuando la función no esté disponible.

Fuente: ticket F2-43, punto 2 («tarjeta tokenizada (Wompi)»); D-497 (Wompi propio, solo Premium, modo global).

#### Scenario: Comercio sin pasarela propia
- **WHEN** el comercio cobra con la cuenta de la plataforma
- **THEN** la tienda no muestra el selector de planes, un intento de suscribirse se rechaza y el editor explica que hace falta una cuenta propia

#### Scenario: Cobro global sin encender
- **WHEN** el cobro global está apagado, en prueba o con un valor no reconocido
- **THEN** nadie puede suscribirse y no se envía ningún cobro

### Requirement: Alta con consentimiento expreso
WHEN un comprador va a suscribirse, THE system SHALL mostrarle antes de pagar el monto, la periodicidad (**[21-oct]** la frecuencia, la variante y la cantidad que eligió), la fecha del próximo cobro y cómo cancelar, y SHALL pedirle que acepte los términos de la pasarela del comercio y el texto de renovación automática. THE system SHALL guardar como evidencia el texto aceptado, su versión, la fecha y huellas de las aceptaciones y del origen, sin guardar los datos en claro. IF no hay consentimiento guardado, THEN THE system SHALL NOT cobrar.

Fuente: ticket F2-43, punto 2 («renovación automática»); D-497 (consentimiento y revisión legal, tarea 0.6).

#### Scenario: Evidencia del consentimiento
- **WHEN** el comercio revisa una suscripción
- **THEN** ve cuándo se aceptó y con qué versión del texto

### Requirement: La tarjeta nunca pasa por Katuq
THE system SHALL capturar la tarjeta en una página propia de la tienda, sin píxeles ni scripts de terceros, que la envía directo a la pasarela; Katuq SHALL recibir solo una referencia de un solo uso. IF una solicitud trae número, fecha de vencimiento o código de seguridad de una tarjeta, THEN THE system SHALL rechazarla sin guardar nada.

Fuente: ticket F2-43, punto 2 («tarjeta tokenizada»); D-497 (página aislada; Artículo XI).

#### Scenario: Solicitud con datos de tarjeta
- **WHEN** llega una solicitud de alta con el número de la tarjeta
- **THEN** se rechaza, no se guarda nada y no se llama a la pasarela

#### Scenario: Página de la tarjeta
- **WHEN** se abre la página para escribir la tarjeta
- **THEN** no carga píxeles ni scripts de terceros y no se puede incrustar en otra página

### Requirement: Primer cobro con el comprador presente
WHEN el comprador confirma la suscripción, THE system SHALL hacer el primer cobro en ese momento:
- IF se aprueba, THEN THE system SHALL dejar la suscripción activa y crear el pedido del primer período, aunque la pasarela no envíe su notificación.
- IF se rechaza, THEN THE system SHALL cerrar esa alta sin suscripción activa, olvidar la tarjeta y dejar que el comprador pruebe enseguida con otra tarjeta.
- WHILE el resultado está pendiente o es incierto, THE system SHALL decir «estamos confirmando tu pago» y consultarlo, sin cobrar otra vez.

THE system SHALL tratar dos envíos del mismo formulario como una sola alta. IF el comprador ya tiene ese plan activo (**[21-oct]** con la misma variante, en cualquier frecuencia), o un alta del mismo plan con un cobro sin resolver, THEN THE system SHALL rechazar la nueva alta y avisarle que ya la tiene.

Fuente: ticket F2-43, criterio 2 («un comprador se suscribe»); D-497 D3.

#### Scenario: Doble clic
- **WHEN** el comprador pulsa dos veces «Suscribirme»
- **THEN** hay un solo cobro y una sola suscripción

#### Scenario: Tarjeta rechazada y otra tarjeta
- **WHEN** el primer cobro se rechaza y el comprador escribe otra tarjeta
- **THEN** la primera alta queda cerrada sin cobro y la nueva cobra de inmediato, sin esperar al día siguiente

#### Scenario: Aprobado sin notificación de la pasarela
- **WHEN** el primer cobro se aprueba y la cuenta del comercio no envía notificaciones
- **THEN** el comprador ve su número de pedido en la página de gracias

#### Scenario: Ya suscrito
- **WHEN** un comprador con el plan activo intenta suscribirse otra vez al mismo plan
- **THEN** se rechaza sin cobrar y se le indica que ya lo tiene

### Requirement: Alta sin terminar
IF un alta no llegó a enviar su primer cobro 24 horas después de empezar, THEN THE system SHALL cerrarla sin cobro y olvidar la tarjeta. IF el alta tiene un cobro pendiente o incierto, THEN THE system SHALL NOT cerrarla como «sin cobro»: SHALL seguir confirmándolo y SHALL alertar si a las 72 horas sigue sin resolverse.

Fuente: D-497 D3.5; Constitución, Artículo IV.

#### Scenario: Cobro incierto a las 24 horas
- **WHEN** un alta lleva 24 horas con el primer cobro incierto
- **THEN** sigue abierta, se consulta a la pasarela y, si se aprueba, la suscripción queda activa con su pedido

### Requirement: Aviso previo a cada renovación
THE system SHALL enviar al comprador, con la marca de la tienda, un aviso antes de cada renovación (3 días antes en planes mensuales y 7 en anuales; **[21-oct]** 1 día en semanales, 2 cada 2 semanas y 3 cada 2 meses, provisional B3) con el monto, la fecha, la marca y los últimos 4 dígitos de la tarjeta y el enlace para cancelar. Cada aviso SHALL salir una sola vez por período. WHILE las renovaciones de la suscripción están pausadas, THE system SHALL NOT enviar el aviso previo.

Fuente: ticket F2-43, punto 2 («aviso antes de cada cobro»); D-497; **[21-oct]** pregunta B3.

#### Scenario: Dos corridas el mismo día
- **WHEN** el envío de avisos corre dos veces el mismo día
- **THEN** el comprador recibe un solo aviso

### Requirement: «Mis planes» en la cuenta del comprador
THE system SHALL mostrar en la cuenta del comprador una sección «Mis planes», con un nombre distinto al de la autorización de correos, con sus planes en esa tienda: estado, próximo cobro, tarjeta (marca y últimos 4), historial de cobros y pedidos, y las acciones de cancelar y cambiar la tarjeta. THE system SHALL mostrar solo los planes del comprador de la sesión en esa tienda. **[21-oct]** Al suscribirse, THE system SHALL ligar la suscripción a la ficha de la sesión del comprador o, sin sesión, a la ficha con su mismo correo o a una nueva, y SHALL NOT ligarla a la ficha de otra persona solo porque coincide un teléfono.

Fuente: ticket F2-43, punto 2 («cancelación desde Mi cuenta»); D-318 (la autorización de correos es otra cosa); D-473 (cuenta del comprador); **[21-oct]** revisión privada.

#### Scenario: [21-oct] Teléfono de otra persona
- **WHEN** alguien sin sesión se suscribe escribiendo un celular que ya tiene la ficha de otra persona
- **THEN** la suscripción no aparece en «Mis planes» de esa otra persona

#### Scenario: Plan de otra persona
- **WHEN** un comprador pide un plan que no es suyo
- **THEN** recibe «no encontrado» y no ve ningún dato

#### Scenario: Cambiar la tarjeta con un cobro en curso
- **WHEN** el comprador cambia la tarjeta mientras se confirma un cobro
- **THEN** se le pide intentarlo cuando termine y la tarjeta no cambia

#### Scenario: Cambiar la tarjeta en reintento
- **WHEN** el comprador cambia la tarjeta de un plan en reintento
- **THEN** el siguiente intento usa la tarjeta nueva

#### Scenario: Plan con pago fallido
- **WHEN** el comprador abre un plan en «pago fallido»
- **THEN** se le ofrece suscribirse de nuevo; cambiar la tarjeta no lo reactiva

### Requirement: Cancelación
WHEN el comprador, o un administrador del comercio, cancela una suscripción, THE system SHALL dejar de cobrar, respetar el período pagado hasta su fin y olvidar la tarjeta. IF había un cobro en curso, THEN THE system SHALL resolverlo solo consultando a la pasarela, nunca enviándolo otra vez; si resulta aprobado, ese período se entrega.

Fuente: ticket F2-43, punto 2 («cancelación desde Mi cuenta»); D-497 D8.

#### Scenario: Cancelar a mitad de período
- **WHEN** el comprador cancela 10 días después de pagar un mes
- **THEN** no hay más cobros y el plan sigue vigente hasta el fin del mes pagado

#### Scenario: Cancelar con un cobro incierto
- **WHEN** el comprador cancela mientras un cobro está incierto
- **THEN** ese cobro no se vuelve a enviar y solo se confirma consultando

### Requirement: Estado de las suscripciones para el comercio
THE system SHALL mostrar al comercio, filtrado por su empresa en el servidor, sus suscripciones con estado (activa, en reintento, pago fallido, cancelada), próximo cobro, último pago, pedidos generados, alertas abiertas y el cuadre del mes entre cobros aprobados y pedidos. **[21-oct]** Es la misma pantalla de las suscripciones creadas desde un pedido, con el origen de cada una («Pedido» o «Tienda») y un filtro por origen. Solo un administrador SHALL poder cancelar desde el panel.

Fuente: ticket F2-43, punto 2 («estado de la suscripción visible en Katuq y alertas de pago fallido»); **[21-oct]** D-518 F2-43·1 (una sola pantalla con la fase A).

#### Scenario: Datos de otra empresa
- **WHEN** un usuario pide una suscripción de otra empresa
- **THEN** recibe «no encontrado»

#### Scenario: Cuadre del mes
- **WHEN** el comercio abre el cuadre de un mes
- **THEN** ve los cobros aprobados al lado de los pedidos generados, y cualquier diferencia como alerta

### Requirement: Datos personales fuera de los registros
THE system SHALL NOT escribir tokens, llaves, correos, teléfonos ni documentos en los registros técnicos ni en las respuestas de error; SHALL usar solo identificadores o huellas.

Fuente: Constitución, Artículo XI.

#### Scenario: Error al crear la fuente de pago
- **WHEN** la pasarela rechaza la tarjeta en el alta
- **THEN** el registro técnico lleva el identificador del alta y el motivo, sin correo, token ni teléfono
