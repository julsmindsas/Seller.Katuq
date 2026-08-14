## ADDED Requirements

### Requirement: El bot se prende y se apaga por comercio

El bot SHALL estar apagado por defecto para todo comercio. Un comercio SHALL poder prenderlo y apagarlo desde su pantalla de integraciones, y el apagado SHALL surtir efecto sin desplegar código ni reiniciar servicios.

#### Scenario: El comercio nunca ha configurado el bot

- **WHEN** entra un mensaje de un cliente a un comercio que nunca tocó la configuración del bot
- **THEN** el bot no responde
- **AND** el mensaje aparece en el buzón como siempre

#### Scenario: El comercio apaga el bot con conversaciones abiertas

- **WHEN** el comercio apaga el bot mientras hay conversaciones que el bot venía atendiendo
- **THEN** el bot deja de responder desde el siguiente mensaje que entre
- **AND** esas conversaciones quedan en el buzón para que las atienda un vendedor

### Requirement: El bot solo opera sobre el número propio del comercio

El bot solo SHALL atender conversaciones que llegan a un número de WhatsApp propio del comercio. El sistema NO SHALL dejar que el bot responda mensajes que llegaron a un número compartido entre varios comercios, porque un mismo mensaje entrante se reparte a todos los comercios que le han escrito a ese cliente y el bot contestaría varias veces.

#### Scenario: El comercio intenta prender el bot sin número propio

- **WHEN** un comercio sin número propio de WhatsApp intenta prender el bot
- **THEN** el sistema no lo prende
- **AND** le explica que primero debe conectar su propio número

#### Scenario: Entra un mensaje por el número compartido

- **WHEN** entra un mensaje que llegó al número compartido, aunque el comercio destino tenga el bot prendido
- **THEN** el bot no responde
- **AND** el mensaje aparece en el buzón como siempre

#### Scenario: El comercio desconecta su número propio

- **WHEN** un comercio con el bot prendido desconecta su número propio
- **THEN** el bot deja de responder en ese comercio

### Requirement: El bot respeta la lista de no contactar y el saldo

El bot NO SHALL escribirle a un cliente que pidió no recibir mensajes. Cada mensaje que envía el bot SHALL descontar saldo igual que cualquier otro mensaje, y el bot SHALL detenerse cuando el comercio no tenga saldo.

#### Scenario: Escribe un cliente que está en la lista de no contactar

- **WHEN** entra un mensaje de un cliente que está en la lista de no contactar del comercio
- **THEN** el bot no responde
- **AND** el mensaje aparece en el buzón para que un vendedor decida

#### Scenario: El cliente pide la baja en media conversación

- **WHEN** el cliente escribe una palabra de baja durante una conversación que atiende el bot
- **THEN** el cliente queda en la lista de no contactar
- **AND** el bot deja de responderle

#### Scenario: El comercio se queda sin saldo

- **WHEN** el comercio no tiene saldo suficiente para enviar el siguiente mensaje del bot
- **THEN** el bot no envía el mensaje
- **AND** el sistema traspasa la conversación a un vendedor
- **AND** el comercio ve el aviso de que el bot se detuvo por saldo

#### Scenario: Cada mensaje del bot queda cobrado y registrado

- **WHEN** el bot le envía un mensaje a un cliente
- **THEN** el consumo se descuenta del saldo del comercio con el mismo precio que un mensaje enviado a mano
- **AND** el mensaje queda en el historial de consumo del comercio

### Requirement: El bot tiene tope de mensajes por conversación

El sistema SHALL limitar cuántos mensajes seguidos manda el bot en una misma conversación sin que intervenga una persona, para que una conversación en bucle no consuma saldo indefinidamente.

#### Scenario: La conversación llega al tope

- **WHEN** el bot alcanza el tope de mensajes configurado en una conversación
- **THEN** el bot le dice al cliente que lo pasa con un asesor
- **AND** el sistema traspasa la conversación a un vendedor
- **AND** el bot no vuelve a responder en esa conversación hasta que un vendedor se la devuelva

#### Scenario: El vendedor devuelve la conversación después del tope

- **WHEN** un vendedor le devuelve al bot una conversación que había llegado al tope
- **THEN** la cuenta de mensajes vuelve a empezar
- **AND** el bot puede volver a responder

### Requirement: Un vendedor puede tomar y devolver la conversación

Un vendedor SHALL poder quedarse con una conversación que atiende el bot, y el bot SHALL callarse en esa conversación mientras el vendedor la tenga. El vendedor SHALL poder devolvérsela al bot.

#### Scenario: El vendedor escribe en un hilo que atiende el bot

- **WHEN** un vendedor envía un mensaje desde el buzón en una conversación que atiende el bot
- **THEN** la conversación queda tomada por ese vendedor
- **AND** el bot no vuelve a responder en esa conversación

#### Scenario: El vendedor toma la conversación sin escribir

- **WHEN** un vendedor pide tomar la conversación desde el buzón
- **THEN** la conversación queda tomada por ese vendedor
- **AND** el bot no vuelve a responder en esa conversación

#### Scenario: El vendedor devuelve la conversación al bot

- **WHEN** un vendedor pide devolverle la conversación al bot
- **THEN** el bot vuelve a atender los mensajes que entren en esa conversación

#### Scenario: El cliente pide hablar con una persona

- **WHEN** el cliente pide explícitamente hablar con un asesor o una persona
- **THEN** el bot le confirma que lo pasa con un asesor
- **AND** el sistema traspasa la conversación a un vendedor

### Requirement: El buzón distingue lo que hizo el bot

El buzón SHALL dejar ver a simple vista qué mensajes escribió el bot, cuáles escribió una persona, y cuáles conversaciones está atendiendo el bot en este momento.

#### Scenario: Un vendedor abre un hilo que atendió el bot

- **WHEN** un vendedor abre en el buzón una conversación donde el bot respondió
- **THEN** los mensajes del bot se distinguen de los escritos por una persona
- **AND** se ve quién tiene la conversación en este momento

#### Scenario: Un vendedor revisa la lista de conversaciones

- **WHEN** un vendedor mira la lista de conversaciones del buzón
- **THEN** distingue cuáles está atendiendo el bot y cuáles esperan a una persona

#### Scenario: El comercio revisa las cotizaciones que trajo el bot

- **WHEN** el comercio mira sus cotizaciones
- **THEN** distingue cuáles entraron por el bot de WhatsApp
- **AND** puede filtrar por ese origen

### Requirement: Queda rastro de por qué el bot dijo lo que dijo

El sistema SHALL dejar registro consultable de cada intervención del bot: qué consultas hizo, qué le respondieron y por qué traspasó una conversación. El registro NO SHALL guardar el teléfono del cliente en claro.

#### Scenario: El comercio reclama por una respuesta del bot

- **WHEN** se revisa una conversación donde el bot respondió mal
- **THEN** se puede consultar qué consultas hizo el bot en ese turno y qué le devolvieron

#### Scenario: El bot traspasa una conversación

- **WHEN** el sistema traspasa una conversación a un vendedor
- **THEN** queda registrado el motivo del traspaso
