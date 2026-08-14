## ADDED Requirements

### Requirement: Recepción de conversaciones de Messenger
El sistema SHALL recibir los mensajes entrantes de Messenger de las páginas de Facebook conectadas por el mismo endpoint de webhook de Meta, distinguiéndolos por el tipo de objeto del evento, sin tocar el webhook de WhatsApp.

#### Scenario: Llega un mensaje de Messenger
- **WHEN** Meta entrega un evento cuyo objeto es `page` con un mensaje entrante a una página conectada
- **THEN** el sistema persiste el mensaje con el canal `facebook` y lo asocia al hilo de ese remitente

#### Scenario: Evento de un objeto no soportado
- **WHEN** llega un evento cuyo objeto no es `instagram` ni `page`
- **THEN** el sistema lo descarta dejando registro, y responde con éxito para no provocar reintentos

#### Scenario: El canal de WhatsApp no se ve afectado
- **WHEN** se despliega el webhook de Meta
- **THEN** el webhook de WhatsApp conserva su ruta, su handler y su comportamiento sin modificación alguna

### Requirement: Identidad del hilo por PSID
El hilo de Facebook SHALL identificarse por el hash del identificador de usuario de la página combinado con el canal, y el frontend NO SHALL recibir nunca el identificador crudo.

#### Scenario: Agrupación de mensajes en un hilo
- **WHEN** llegan varios mensajes del mismo remitente a la misma página conectada
- **THEN** todos quedan agrupados en un único hilo identificado por ese hash

#### Scenario: El mismo remitente escribe a dos páginas de la misma empresa
- **WHEN** una persona escribe a dos páginas distintas conectadas por la misma empresa
- **THEN** el sistema mantiene un hilo por página, porque el identificador tiene ámbito de página

### Requirement: Buzón de Facebook
El sistema SHALL ofrecer un buzón en `/notificaciones/facebook/inbox` con lista de hilos, detalle de conversación y panel de contacto.

#### Scenario: Abrir un hilo
- **WHEN** el operador abre un hilo del buzón
- **THEN** ve la conversación completa y un panel lateral con el nombre de perfil de Messenger del contacto

#### Scenario: Aislamiento por empresa
- **WHEN** un operador de la empresa A abre el buzón
- **THEN** solo ve hilos de las páginas conectadas por la empresa A

### Requirement: Vinculación explícita del contacto con un cliente
Messenger NO entrega teléfono ni correo, por lo que el sistema NO SHALL inferir a qué cliente corresponde un contacto. El buzón SHALL permitir vincular el hilo con un cliente existente y SHALL conservar el vínculo, guardando su origen para que una sugerencia automática futura nunca se aplique sin confirmación humana.

#### Scenario: Hilo sin vincular
- **WHEN** el operador abre un hilo que aún no está vinculado
- **THEN** el panel indica que el contacto no está vinculado y ofrece buscar y elegir un cliente, sin mostrar pedidos de nadie

#### Scenario: Vincular un contacto
- **WHEN** el operador vincula el hilo con un cliente
- **THEN** el panel muestra el cliente, su lead y sus pedidos, y el vínculo persiste para los mensajes futuros de ese contacto

#### Scenario: El sistema nunca adivina
- **WHEN** el nombre de perfil se parece al de un cliente registrado
- **THEN** el sistema NO vincula automáticamente; a lo sumo lo sugiere para confirmación humana

### Requirement: Respuesta dentro de la ventana permitida por Meta
El buzón SHALL permitir responder mientras la ventana de mensajería esté vigente, SHALL mostrar el tiempo restante, y SHALL impedir el envío cuando expire, explicándolo sin jerga técnica.

#### Scenario: Responder dentro de la ventana
- **WHEN** el operador envía una respuesta a un hilo con ventana vigente
- **THEN** el mensaje se envía, aparece como saliente y refleja su estado de entrega

#### Scenario: Ventana expirada
- **WHEN** el operador abre un hilo cuya ventana expiró
- **THEN** el campo de respuesta queda deshabilitado con la explicación de que el cliente debe escribir de nuevo

### Requirement: Los tres buzones agrupados bajo un solo elemento de menú
La navegación SHALL presentar un único elemento "Mensajes" con los buzones de WhatsApp, Instagram y Facebook como hijos, de modo que agregar un canal no alargue el menú principal.

#### Scenario: Operador busca sus conversaciones
- **WHEN** el operador abre el menú lateral
- **THEN** encuentra "Mensajes" con los tres canales como hijos, cada uno rotulado con el nombre del canal

#### Scenario: El buzón de WhatsApp conserva su dirección
- **WHEN** se accede a la ruta actual del buzón de WhatsApp
- **THEN** sigue funcionando igual que antes, para no romper enlaces guardados por los usuarios
