## MODIFIED Requirements

### Requirement: Los medios no soportados reciben aviso cortés una vez

Cuando el cliente manda audio, sticker o documento, el sistema SHALL responder
una vez por sesión que por ahora solo lee texto, SHALL marcar ese aviso en la
sesión y SHALL ignorar en silencio los medios siguientes de la misma sesión.
Las FOTOS y las RESPUESTAS A BOTONES O LISTAS quedan fuera de esta regla: las
fotos se interpretan y las respuestas interactivas se atienden como un turno
normal.

#### Scenario: Primer audio de la sesión

- **WHEN** el cliente manda un audio y la sesión no tiene aviso de medios registrado
- **THEN** el bot responde un texto breve pidiendo que le escriba
- **AND** la sesión queda marcada con el aviso
- **AND** la conversación NO se traspasa a un vendedor por esto

#### Scenario: Segundo audio de la misma sesión

- **WHEN** el cliente manda otro audio con el aviso ya registrado
- **THEN** el bot no responde ni cobra nada

#### Scenario: Respuesta a un botón

- **WHEN** el cliente toca una opción que le ofreció el bot
- **THEN** el bot la atiende como un mensaje normal, sin avisos de "solo leo texto"
