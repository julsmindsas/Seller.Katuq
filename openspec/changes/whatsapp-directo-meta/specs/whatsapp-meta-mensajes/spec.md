## ADDED Requirements

### Requirement: Avisos de Meta firmados y sin repetir
El sistema SHALL aceptar avisos de WhatsApp de Meta solo si traen una firma válida hecha con el secreto de la app. Si falta el secreto, SHALL rechazarlos todos (falla cerrado). Cada aviso SHALL guardarse crudo y procesarse una sola vez aunque Meta lo reenvíe. El saludo de verificación de Meta SHALL responderse solo con el token de verificación correcto.

#### Scenario: Aviso sin firma
- **WHEN** llega un aviso de WhatsApp sin firma o con firma inválida
- **THEN** se rechaza y no se crea ningún mensaje

#### Scenario: Aviso repetido
- **WHEN** Meta reenvía un aviso con un mensaje que ya se procesó
- **THEN** no aparece duplicado en el buzón ni el bot contesta dos veces

### Requirement: Entrada de mensajes por la línea directa
Cuando llegue un mensaje de un cliente a una línea directa, el sistema SHALL ubicar la línea por el identificador del número en Meta y llevar el mensaje al buzón y al bot por el mismo camino de las demás líneas: dueño del chat, ventana de 24 horas, bajas y bot. Si nadie tiene conectado ese número, el aviso SHALL descartarse con registro.

#### Scenario: Mensaje de un cliente
- **WHEN** un cliente escribe al número conectado directo
- **THEN** el mensaje aparece en el chat del vendedor dueño, con la ventana de 24 horas abierta

#### Scenario: Foto del cliente
- **WHEN** el cliente manda una foto
- **THEN** se descarga de Meta con la llave de esa línea y se trata igual que hoy las fotos que llegan por Kapso

### Requirement: Mensajes enviados desde el celular
Cuando la línea comparta el número con la app del celular y el comercio conteste desde el celular, el sistema SHALL mostrar ese mensaje en el chat como enviado por el comercio. No SHALL descontar saldo por él. Y SHALL tratarlo como lo hace hoy con los mensajes enviados desde el celular: el bot suelta el chat.

#### Scenario: Respuesta desde el celular
- **WHEN** el comercio responde desde la app del celular
- **THEN** la respuesta se ve en el buzón de Katuq y el bot no vuelve a contestar en ese chat hasta que se lo devuelvan

### Requirement: Salida directa por Meta
Cuando se envíe un mensaje por una línea directa, el sistema SHALL enviarlo a Meta con la llave de esa línea, sin pasar por Kapso. Esto vale para texto, plantilla, botones, foto y marcar como leído. Antes de enviar, SHALL aplicar las mismas reglas de hoy: ventana de 24 horas, no-contactar, sin duplicados y registro del envío.

#### Scenario: Respuesta desde el buzón
- **WHEN** un vendedor responde a un cliente dentro de la ventana por una línea directa
- **THEN** el mensaje sale por Meta, se ve llegar al WhatsApp del cliente y queda en el chat con su estado

#### Scenario: Llave vencida o permiso quitado
- **WHEN** Meta responde que la llave ya no sirve
- **THEN** el envío falla con «Tu WhatsApp se desconectó de Katuq. Conéctalo de nuevo en Integraciones», y la línea queda «Por reconectar»

### Requirement: Cobro de Meta directo al comercio
En una línea directa, el sistema SHALL registrar el envío con costo para Katuq igual a 0. No SHALL exigir saldo prepago para el costo de Meta, que Meta cobra directo al comercio. Las líneas de Kapso y el número compartido SHALL seguir cobrando del saldo como hoy.

#### Scenario: Comercio sin saldo con línea directa
- **WHEN** un comercio con saldo 0 responde por una línea directa
- **THEN** el mensaje sale y no se le descuenta nada

#### Scenario: Comercio sin saldo con línea Kapso
- **WHEN** el mismo comercio responde por una línea de Kapso
- **THEN** el envío se bloquea por saldo como hoy

### Requirement: Plantillas en la cuenta del comercio
Desde Katuq, el sistema SHALL permitir crear plantillas en la cuenta de WhatsApp de una línea directa, ver su estado de aprobación y usarlas en notificaciones, campañas y para retomar chats. Cada cambio de estado que avise Meta SHALL reflejarse en la plantilla.

#### Scenario: Plantilla creada y aprobada
- **WHEN** el comercio crea una plantilla desde Katuq y Meta la aprueba
- **THEN** la plantilla pasa de «En revisión» a «Aprobada» y queda disponible en campañas
