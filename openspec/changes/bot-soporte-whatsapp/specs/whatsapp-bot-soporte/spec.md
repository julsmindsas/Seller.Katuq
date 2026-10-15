# whatsapp-bot-soporte

Bot que recibe por WhatsApp los problemas de los comercios y los convierte en tickets de soporte de Katuq. Requisitos en formato EARS; la tecnología está en `design.md`.

## Requirements

### Requirement: Abrir un ticket desde el chat
Cuando un comercio describe un problema por WhatsApp, el bot SHALL pedir solo los datos que falten (qué pasa, desde cuándo, en qué pedido o producto), resumir el caso y abrir el ticket únicamente después de que el comercio confirme con un "sí".

#### Scenario: Caso completo con confirmación
- **WHEN** el comercio explica el problema y responde "sí" al resumen
- **THEN** se crea un ticket `Pendiente` con `canal: "whatsapp"`, el equipo recibe los mismos avisos que con el formulario y el bot responde con el número del ticket

#### Scenario: Sin confirmación no hay ticket
- **WHEN** el comercio no responde o corrige el resumen
- **THEN** no se crea ningún ticket y el bot ajusta el resumen

#### Scenario: Mensaje reentregado
- **WHEN** Meta entrega dos veces el mismo mensaje de confirmación
- **THEN** se abre un solo ticket

#### Scenario: Mismo problema repetido
- **WHEN** la misma empresa ya tiene un ticket con ese asunto abierto en los últimos 30 minutos
- **THEN** el bot informa el número del existente y no abre otro

### Requirement: Reconocer al comercio por su celular
El sistema SHALL identificar la empresa a partir del celular que escribe, usando únicamente el campo `empresa` del usuario, y el modelo SHALL NOT poder elegir ni cambiar la empresa del ticket.

#### Scenario: Celular de un usuario
- **WHEN** el celular coincide con usuarios de una sola empresa
- **THEN** el ticket queda a nombre de esa empresa, con el nombre y el correo del usuario

#### Scenario: Campo `company` distinto de `empresa`
- **WHEN** el usuario tiene `company: "Julsmind"` y `empresa: "OH MY STORE"`
- **THEN** el ticket queda en "OH MY STORE" y el bot no ve ni menciona nada de otras empresas

#### Scenario: Celular en dos empresas
- **WHEN** el mismo celular aparece en usuarios de empresas distintas
- **THEN** el bot pregunta de cuál empresa escribe, ofreciendo solo esas

#### Scenario: Celular desconocido
- **WHEN** el celular no es de ningún usuario
- **THEN** el ticket se puede abrir pero queda marcado "sin verificar", el bot no consulta ni muestra datos de ninguna empresa y se permite un ticket por celular cada 24 horas

### Requirement: Consultar el estado
Cuando un comercio verificado pregunta por sus tickets, el bot SHALL responder con el estado y lo último que el equipo escribió en los tickets de SU empresa, y SHALL NOT mostrar notas internas.

#### Scenario: Consulta de un ticket propio
- **WHEN** pregunta "¿cómo va el 1130?" y el 1130 es de su empresa
- **THEN** recibe el estado y el último comentario público

#### Scenario: Ticket de otra empresa
- **WHEN** pregunta por un número que es de otra empresa
- **THEN** el bot responde que no lo encuentra entre los suyos, sin revelar que existe

### Requirement: Aviso de vuelta (fase 2)
Cuando el equipo comenta de forma pública o resuelve un ticket abierto por WhatsApp, el sistema SHALL avisarle al comercio en el mismo chat; fuera de la ventana de 24 horas SHALL usar una plantilla aprobada.

#### Scenario: Resuelto dentro de la ventana
- **WHEN** el ticket pasa a `Resuelto` y el comercio escribió hace menos de 24 horas
- **THEN** recibe un mensaje con la resolución y la pregunta "¿quedó resuelto?"

#### Scenario: Nota interna
- **WHEN** el equipo agrega una nota interna
- **THEN** no se envía nada al comercio

#### Scenario: Respuesta "no"
- **WHEN** el comercio responde que no quedó resuelto
- **THEN** el ticket se reabre con la misma lógica de la app

### Requirement: Control y seguridad
El sistema SHALL mantener el bot apagado por defecto y SHALL responder solo cuando se cumplan, en el servidor, el interruptor general, la lista de celulares de prueba (durante el piloto), la lista de no contactar, el tope de turnos y que ninguna persona del equipo haya tomado la conversación.

#### Scenario: Una persona toma la conversación
- **WHEN** alguien del equipo escribe en el hilo desde el buzón
- **THEN** el bot deja de responder en ese hilo

#### Scenario: Interruptor apagado
- **WHEN** `WHATSAPP_SUPPORT_BOT_ENABLED` no es `true`
- **THEN** el mensaje se guarda como siempre y el bot no responde

#### Scenario: Alcance del bot
- **WHEN** el ticket se abre por el bot
- **THEN** no cambia ni prioridad, ni responsable, ni estado distinto de `Pendiente`, y no se escribe en pedidos, productos, inventario, precios ni consecutivos
