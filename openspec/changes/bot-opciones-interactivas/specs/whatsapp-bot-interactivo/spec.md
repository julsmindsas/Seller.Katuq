## ADDED Requirements

### Requirement: El bot ofrece opciones tocables cuando la elección es cerrada

El bot SHALL poder enviar las opciones como botones o lista de WhatsApp
cuando el cliente deba elegir entre un conjunto cerrado y corto (forma de
entrega, medio de pago, sí/no, un producto de la búsqueda). El backend SHALL validar
cada opción contra el maestro correspondiente, recortar los títulos a los
límites del proveedor y elegir el formato: hasta 3 opciones como botones, de 4
a 10 como lista. Se SHALL cobrar como un solo mensaje.

#### Scenario: Elegir la entrega con un toque

- **WHEN** el bot pregunta cómo quiere la entrega y el comercio tiene dos formas configuradas
- **THEN** el cliente recibe la pregunta con las dos formas como botones tocables
- **AND** al tocar una, el pedido queda con esa forma exacta del maestro, sin interpretar texto

#### Scenario: Más opciones de las que caben en botones

- **WHEN** el comercio tiene seis medios de pago
- **THEN** las opciones salen como lista desplegable, no como botones

#### Scenario: Opción inventada por el agente

- **WHEN** el agente propone una opción que no existe en el maestro
- **THEN** esa opción no se envía
- **AND** si no queda ninguna válida, la pregunta sale como texto normal

### Requirement: La respuesta a un botón se atiende como cualquier mensaje

Un mensaje entrante de tipo interactivo (respuesta a botón o lista) SHALL
atenderse como un turno normal del bot — NO SHALL recibir el aviso de "solo
leo texto". El identificador de la opción tocada SHALL tener precedencia sobre
el texto al aplicar la configuración del pedido, y el texto visible SHALL
quedar en el hilo del buzón igual que lo vio el cliente.

#### Scenario: El cliente toca un botón

- **WHEN** el cliente toca "Recoge en tienda"
- **THEN** el bot continúa la conversación normalmente
- **AND** la forma de entrega queda aplicada sin ambigüedad
- **AND** en el buzón se ve "Recoge en tienda" como mensaje del cliente

#### Scenario: El cliente prefiere escribir

- **WHEN** el bot ofreció botones y el cliente responde escribiendo
- **THEN** el bot atiende el texto como siempre, sin exigir que use el botón

#### Scenario: Identificador que no corresponde a nada

- **WHEN** llega una respuesta con un identificador que no existe en los maestros
- **THEN** se ignora ese identificador y se atiende el mensaje por su texto

### Requirement: Si el interactivo no se puede enviar, la conversación sigue

El sistema SHALL enviar la misma pregunta como texto con las opciones
enumeradas cuando el proveedor rechace el mensaje interactivo o la función
esté apagada; SHALL registrarlo en el log y el cliente NO SHALL percibir un
error.

#### Scenario: El proveedor no soporta interactivos

- **WHEN** el envío del mensaje con botones falla
- **THEN** el cliente recibe la pregunta en texto con las opciones enumeradas
- **AND** queda el registro del rechazo para diagnóstico
