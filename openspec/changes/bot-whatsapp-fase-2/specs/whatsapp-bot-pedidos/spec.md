## MODIFIED Requirements

### Requirement: El bot atiende los mensajes entrantes de WhatsApp

Cuando entra un mensaje de un cliente por WhatsApp a un comercio que tiene el bot encendido, el sistema SHALL atender la conversación automáticamente sin intervención humana, y SHALL hacerlo sin demorar la confirmación al proveedor de mensajería. Los mensajes de texto seguidos SHALL agruparse en un turno por ráfaga (no un turno por mensaje), y los mensajes que no son texto SHALL recibir el aviso cortés único por sesión definido en `whatsapp-bot-conversacion` en vez de traspasar la conversación.

#### Scenario: Llega un mensaje y el bot contesta

- **WHEN** entra un mensaje de texto de un cliente a un comercio con el bot encendido y la conversación no está tomada por un vendedor
- **THEN** el sistema confirma la recepción al proveedor de mensajería en menos de 3 segundos, sin esperar a que el bot elabore la respuesta
- **AND** el bot responde al cliente en un mensaje de WhatsApp
- **AND** la respuesta queda registrada en el hilo del buzón igual que un mensaje escrito por una persona

#### Scenario: Llega una ráfaga de mensajes

- **WHEN** entran varios mensajes de texto seguidos del mismo cliente dentro de la ventana de agrupación
- **THEN** el bot responde una sola vez atendiendo la ráfaga completa
- **AND** se cobra una sola respuesta

#### Scenario: Llega un mensaje que no es texto

- **WHEN** el cliente manda una foto, un audio, un documento o un sticker
- **THEN** el bot responde una vez por sesión que por ahora solo entiende mensajes escritos
- **AND** la conversación NO se traspasa a un vendedor por esto
- **AND** los medios siguientes de la misma sesión se ignoran en silencio

#### Scenario: El mensaje entra a una conversación que atiende un vendedor

- **WHEN** entra un mensaje de un cliente cuya conversación está tomada por un vendedor
- **THEN** el bot no responde
- **AND** el mensaje aparece en el buzón para que lo atienda el vendedor
