## ADDED Requirements

### Requirement: Los mensajes seguidos se atienden como una sola pregunta

Cuando un cliente escribe varios mensajes de texto seguidos, el sistema SHALL agruparlos en un solo turno del bot (ventana de 4 segundos desde el primero, extensible hasta 10 segundos máximo), SHALL registrar el sello de idempotencia de todos los mensajes agrupados y SHALL cobrar una sola respuesta.

#### Scenario: Ráfaga de tres mensajes

- **WHEN** el cliente manda "hola", "tienen velas?" y "de vainilla" en menos de 4 segundos
- **THEN** el bot responde UNA vez atendiendo los tres mensajes juntos
- **AND** los tres ids quedan sellados como atendidos
- **AND** se cobra una sola respuesta

#### Scenario: Reinicio con mensajes en ventana

- **WHEN** el proceso se reinicia con mensajes esperando en la ventana de agrupación
- **THEN** el poller los re-presenta y se atienden en un turno nuevo
- **AND** ningún mensaje se responde dos veces (los sellos de idempotencia mandan)

### Requirement: Los medios no soportados reciben aviso cortés una vez

Cuando el cliente manda audio, imagen, sticker o documento, el sistema SHALL responder una vez por sesión que por ahora solo lee texto, SHALL marcar ese aviso en la sesión y SHALL ignorar en silencio los medios siguientes de la misma sesión. El aviso se cobra como cualquier respuesta del bot.

#### Scenario: Primer audio de la sesión

- **WHEN** el cliente manda un audio y la sesión no tiene aviso de medios registrado
- **THEN** el bot responde un texto breve pidiendo que le escriba
- **AND** la sesión queda marcada con el aviso
- **AND** la conversación NO se traspasa a un vendedor por esto

#### Scenario: Segundo audio de la misma sesión

- **WHEN** el cliente manda otro audio con el aviso ya registrado
- **THEN** el bot no responde ni cobra nada

### Requirement: El bot puede mostrar la foto del producto

Cuando el agente anota un producto para mostrar y el producto tiene imagen con URL pública, el sistema SHALL enviar UN mensaje de imagen con la respuesta como caption (recortada a 1024 caracteres) y SHALL cobrarlo como un solo mensaje. Sin imagen utilizable o con respuesta más larga, SHALL enviar texto normal sin error visible.

#### Scenario: Producto con foto

- **WHEN** el agente canta un producto concreto que tiene imagen pública
- **THEN** el cliente recibe la foto con el texto de la respuesta como caption
- **AND** se cobra un solo mensaje

#### Scenario: Producto sin foto utilizable

- **WHEN** el producto no tiene imagen o su URL no es pública
- **THEN** el cliente recibe la respuesta en texto normal
- **AND** no se registra error visible para el cliente

### Requirement: El bot responde el estado de los pedidos con datos pre-resueltos

El despachador SHALL incluir en el contexto del turno hasta 3 pedidos recientes del cliente (número, estado en lenguaje humano y fecha) resueltos en el backend, y el agente SHALL responder preguntas de estado únicamente con ese contexto. El teléfono crudo y las herramientas de lectura de órdenes NO SHALL exponerse a ADK.

#### Scenario: "¿Dónde va mi pedido?"

- **WHEN** un cliente con pedidos recientes pregunta por el estado de su pedido
- **THEN** el bot responde con el número, el estado y la fecha del pedido real
- **AND** no inventa plazos ni estados que no estén en el contexto

#### Scenario: Cliente sin pedidos

- **WHEN** un cliente sin pedidos pregunta por "su pedido"
- **THEN** el bot dice honestamente que no encuentra pedidos a su número y ofrece ayuda para hacer uno

### Requirement: El cierre exige dirección confirmada y resumen consistente

Antes de pedir el cierre de un pedido con entrega, el agente SHALL haber confirmado dirección y ciudad con el cliente, y el resumen del carrito SHALL listar producto, cantidad, precio unitario y total con el mismo formato en toda la conversación.

#### Scenario: Cierre con entrega

- **WHEN** el cliente confirma que quiere cerrar el pedido
- **THEN** el bot repite dirección y ciudad confirmadas y el resumen completo del carrito antes de registrar
- **AND** si falta la dirección, la pide antes de cerrar
