## ADDED Requirements

### Requirement: Una sola solicitud con cuatro permisos
La solicitud de revisión de la app `katuq` SHALL pedir acceso avanzado solo a estos permisos:
- `whatsapp_business_messaging`;
- `whatsapp_business_management`;
- `pages_messaging`;
- `instagram_manage_messages`.

SHALL NOT pedir ningún otro permiso. Los ya aprobados se conservan:
- `public_profile`;
- `pages_show_list`;
- `pages_manage_metadata`;
- `instagram_basic`.

#### Scenario: Revisión de la lista antes de enviar
- **WHEN** se arma la solicitud en el panel de Meta
- **THEN** aparecen exactamente esos cuatro permisos, cada uno con su descripción en inglés y su video

### Requirement: Cada video demuestra la experiencia completa
Cada video SHALL mostrar, en una sola toma continua y con subtítulos en inglés:
1. el activo escogido a la vista (número, página o cuenta de Instagram);
2. el envío real hecho desde la pantalla de Katuq;
3. el mismo mensaje llegando a la app de Meta del otro lado (WhatsApp, Messenger o Instagram).

Esto atiende el motivo exacto del rechazo del 26-ago (D-249).

#### Scenario: Video de mensajería de WhatsApp
- **WHEN** se graba el video de `whatsapp_business_messaging`
- **THEN** se ve:
  - conectar el número desde Katuq con la ventana de Meta;
  - el número escogido;
  - un mensaje escrito y enviado desde el buzón de Katuq;
  - el mismo mensaje en el WhatsApp del teléfono receptor;
  - la respuesta del teléfono entrando al buzón.

#### Scenario: Video de administración de WhatsApp
- **WHEN** se graba el video de `whatsapp_business_management`
- **THEN** se ve crear una plantilla desde Katuq en la cuenta del comercio, su estado en Katuq y la misma plantilla en el WhatsApp Manager de Meta

#### Scenario: Videos de Messenger e Instagram
- **WHEN** se graban los videos de `pages_messaging` e `instagram_manage_messages`
- **THEN** cada uno muestra la página o cuenta escogida al conectar, la respuesta enviada desde el buzón de Katuq y el mensaje llegando a Messenger o Instagram en otro dispositivo

### Requirement: Nada personal en los videos
Los videos SHALL grabarse con cuentas, números y conversaciones de prueba de Julsmind o FLORECER. SHALL NOT mostrar chats, notificaciones ni datos de personas reales. Si algo personal entra en cuadro, la toma SHALL borrarse.

#### Scenario: Notificación personal en pantalla
- **WHEN** aparece una notificación o chat personal durante la grabación
- **THEN** se corta y se borra esa toma, y se graba de nuevo

### Requirement: Solicitud lista para el revisor
Antes de enviar, la app SHALL tener:
- el producto WhatsApp agregado;
- la configuración de inicio de sesión de WhatsApp creada;
- el webhook de WhatsApp verificado;
- las URL de privacidad, condiciones y borrado de datos respondiendo.

La solicitud SHALL incluir instrucciones en inglés paso a paso para el revisor y un usuario de prueba de Katuq.

#### Scenario: Revisión previa al envío
- **WHEN** se va a pulsar «Enviar para revisión»
- **THEN** la lista de verificación del cambio está completa y cada punto tiene su evidencia
