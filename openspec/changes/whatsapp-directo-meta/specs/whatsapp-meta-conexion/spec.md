## ADDED Requirements

### Requirement: Dos formas de conectar un número directo con Meta
Cuando un administrador del comercio tenga encendida la conexión directa y pida conectar un número de WhatsApp, el sistema SHALL ofrecerle dos opciones antes de abrir la ventana de Meta:
- **«Usar el número de mi celular»**: el número que ya usa en la app WhatsApp Business. Lo sigue usando ahí.
- **«Un número nuevo para Katuq»**: un número que no esté en ninguna app de WhatsApp.

Cada opción SHALL explicar en una línea, sin jerga, qué pasa con el celular.

#### Scenario: El comercio escoge compartir el número del celular
- **WHEN** el administrador escoge «Usar el número de mi celular»
- **THEN** se abre la ventana oficial de Meta en el modo que deja el número en la app del celular, y el aviso le dice que debe tener el celular a mano para escanear el código

#### Scenario: El comercio escoge un número nuevo
- **WHEN** el administrador escoge «Un número nuevo para Katuq»
- **THEN** se abre la ventana oficial de Meta para registrar un número nuevo, que queda solo en Katuq

#### Scenario: Conexión directa apagada
- **WHEN** la bandera del comercio o el interruptor global de la conexión directa está apagado
- **THEN** solo se ofrece la conexión por Kapso, igual que hoy

### Requirement: La línea se confirma contra Meta, no contra el navegador
El sistema SHALL tomar como no confiable lo que llega desde la ventana del navegador (código, identificadores de la cuenta y del número). Antes de registrar la línea, el sistema SHALL:
- cambiar el código por la llave de la empresa;
- comprobar con esa llave, contra Meta, que el número pertenece a la cuenta de WhatsApp que el comercio acaba de compartir con Katuq.

#### Scenario: Identificadores manipulados
- **WHEN** el navegador manda un número que no está en la cuenta de WhatsApp compartida
- **THEN** la conexión se rechaza con «No pudimos confirmar ese número con Meta. Intenta conectarlo de nuevo» y no se escribe ninguna línea

#### Scenario: Código ya usado o vencido
- **WHEN** Meta rechaza el código de un solo uso
- **THEN** el comercio ve que la conexión no terminó y puede intentarla otra vez, y no queda una línea a medias

### Requirement: Línea lista para recibir y enviar
Al confirmar el número, el sistema SHALL dejar la línea operativa sin pasos manuales:
- suscribir la app de Katuq a la cuenta de WhatsApp del comercio;
- en un número nuevo, terminar su registro;
- guardar la llave cifrada, sin devolverla nunca al navegador;
- registrar la línea con un solo dueño, el comercio, y asignarla como cualquier otra línea (D-437).

#### Scenario: Número nuevo conectado
- **WHEN** termina bien la conexión de un número nuevo
- **THEN** la línea aparece «Conectada» en Integraciones, se puede asignar a vendedores y el primer mensaje entrante llega al buzón

#### Scenario: Paso intermedio que falla
- **WHEN** falla la suscripción o el registro del número después de confirmado
- **THEN** la línea queda «Por terminar» con la causa en palabras sencillas y un botón «Reintentar», y no se marca como conectada

### Requirement: Número del celular con su historial
Cuando la línea se conecte compartiendo el número del celular, el sistema SHALL pedirle a Meta, dentro del plazo que Meta da, los contactos y el historial reciente de la app. Esos mensajes SHALL entrar al buzón como historia, sin cobro y sin despertar al bot.

#### Scenario: Historial importado
- **WHEN** Meta entrega el historial de la app del celular
- **THEN** los chats aparecen en el buzón con sus mensajes anteriores, marcados como historia, y el bot no contesta ninguno de ellos

### Requirement: Desconectar
Cuando un administrador desconecte una línea directa, el sistema SHALL quitar la suscripción de la app en la cuenta del comercio, borrar la llave guardada y marcar la línea como desconectada, aunque Meta falle. Los chats y su historial SHALL quedar como están.

#### Scenario: Desconexión con Meta caído
- **WHEN** el administrador desconecta y Meta no responde
- **THEN** la línea queda desconectada en Katuq, la llave se borra y el fallo con Meta queda registrado para reintentarlo
