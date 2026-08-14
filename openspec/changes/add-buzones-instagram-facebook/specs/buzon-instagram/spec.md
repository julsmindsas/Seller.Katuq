## ADDED Requirements

### Requirement: Recepción de mensajes directos de Instagram
El sistema SHALL recibir los mensajes directos entrantes de las cuentas de Instagram conectadas mediante un endpoint de webhook propio, separado del webhook de WhatsApp, enrutando por el tipo de objeto del evento de Meta.

#### Scenario: Llega un mensaje directo
- **WHEN** Meta entrega un evento cuyo objeto es `instagram` con un mensaje entrante de una cuenta conectada
- **THEN** el sistema persiste el mensaje en la colección de mensajes de Meta con el canal `instagram` y lo asocia al hilo de ese remitente

#### Scenario: Meta reintenta la entrega del mismo mensaje
- **WHEN** llega un evento con un identificador de mensaje ya persistido
- **THEN** el sistema no crea un duplicado y responde con éxito

#### Scenario: Verificación del webhook
- **WHEN** Meta solicita la verificación del endpoint con el token acordado
- **THEN** el sistema responde el desafío, y rechaza la verificación si el token no coincide

#### Scenario: Firma inválida
- **WHEN** llega un evento cuya firma no valida contra el secreto de la app
- **THEN** el sistema rechaza el evento y no persiste nada

### Requirement: Identidad del hilo sin teléfono
El hilo de Instagram SHALL identificarse por el hash del identificador de usuario de Instagram combinado con el canal, y el frontend NO SHALL recibir nunca el identificador crudo.

#### Scenario: Agrupación de mensajes en un hilo
- **WHEN** llegan varios mensajes del mismo remitente a la misma cuenta conectada
- **THEN** todos quedan agrupados en un único hilo identificado por ese hash

#### Scenario: Colisión entre canales
- **WHEN** un identificador de Instagram coincide con un identificador de Facebook
- **THEN** los hilos permanecen separados, porque el canal forma parte del material hasheado

### Requirement: Buzón de Instagram
El sistema SHALL ofrecer un buzón en `/notificaciones/instagram/inbox` con lista de hilos, detalle de conversación y panel de contacto.

#### Scenario: Abrir un hilo
- **WHEN** el operador abre un hilo del buzón
- **THEN** ve la conversación completa y un panel lateral con el nombre de perfil de Instagram del contacto

#### Scenario: Aislamiento por empresa
- **WHEN** un operador de la empresa A abre el buzón
- **THEN** solo ve hilos de las cuentas conectadas por la empresa A

### Requirement: Vinculación explícita del contacto con un cliente
Instagram NO entrega teléfono ni correo, por lo que el sistema NO SHALL inferir a qué cliente corresponde un contacto. El buzón SHALL permitir que el operador vincule el hilo con un cliente existente, y SHALL conservar el vínculo para los mensajes siguientes.

Cada vínculo SHALL guardar su origen (`manual`, y en el futuro `sugerido_ia` o `auto_telefono`), de modo que una sugerencia automática posterior nunca se aplique sin confirmación humana.

#### Scenario: Hilo sin vincular
- **WHEN** el operador abre un hilo que aún no está vinculado a ningún cliente
- **THEN** el panel indica que el contacto no está vinculado y ofrece buscar y elegir un cliente, sin mostrar pedidos de nadie

#### Scenario: Vincular un contacto
- **WHEN** el operador busca un cliente y lo vincula al hilo
- **THEN** el panel pasa a mostrar el cliente, su lead y sus pedidos con enlace al detalle, y el vínculo persiste al recargar y para los mensajes futuros de ese contacto

#### Scenario: Corregir un vínculo equivocado
- **WHEN** el operador desvincula el contacto y elige otro cliente
- **THEN** el panel refleja el cliente nuevo y el vínculo anterior deja de aplicarse

#### Scenario: El sistema nunca adivina
- **WHEN** el nombre de perfil de Instagram se parece al nombre de un cliente registrado
- **THEN** el sistema NO vincula automáticamente ni muestra los pedidos de ese cliente; a lo sumo puede sugerirlo para que un humano lo confirme

### Requirement: Respuesta dentro de la ventana permitida por Meta
El buzón SHALL permitir responder un hilo mientras la ventana de mensajería de Meta esté vigente, SHALL mostrar cuánto tiempo queda de esa ventana, y SHALL impedir el envío cuando haya expirado, explicándolo en lenguaje no técnico.

#### Scenario: Responder dentro de la ventana
- **WHEN** el operador escribe y envía una respuesta a un hilo cuya ventana sigue vigente
- **THEN** el mensaje se envía, aparece en la conversación como saliente y refleja su estado de entrega

#### Scenario: Ventana expirada
- **WHEN** el operador abre un hilo cuya ventana de mensajería ya expiró
- **THEN** el campo de respuesta aparece deshabilitado con una explicación de que el cliente debe volver a escribir para poder responderle, sin mostrar códigos ni jerga de la API

#### Scenario: Falla el envío en Meta
- **WHEN** Meta rechaza el envío de una respuesta
- **THEN** el mensaje queda marcado como fallido en la conversación con la causa en lenguaje llano y la opción de reintentar
