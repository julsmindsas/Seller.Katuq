## ADDED Requirements

### Requirement: Las credenciales propias se verifican contra Kapso

Cuando el usuario guarda credenciales propias y pide probar la conexión, el sistema SHALL verificarlas server-side contra Kapso y, en éxito, SHALL persistir la fecha de verificación junto con el número y nombre visibles del WhatsApp conectado. La API key NO SHALL viajar de vuelta al navegador en ninguna respuesta.

#### Scenario: Credenciales válidas

- **WHEN** el usuario digita API key y phone number id correctos y presiona "Probar conexión"
- **THEN** la pantalla muestra el número y el nombre del WhatsApp conectado
- **AND** la configuración queda marcada como verificada con fecha

#### Scenario: Credenciales inválidas

- **WHEN** la verificación falla
- **THEN** la pantalla muestra una causa humana (credencial inválida, número no encontrado o sin permiso)
- **AND** el error crudo de Kapso queda solo en el log del servidor

### Requirement: El estado de la conexión es visible en la pantalla

Al abrir la pantalla de WhatsApp del comercio, el sistema SHALL mostrar si hay número propio conectado y verificado (número y nombre), la fecha del último mensaje entrante recibido y si el bot puede activarse.

#### Scenario: Comercio con número verificado

- **WHEN** el usuario abre la pantalla con un número propio verificado
- **THEN** ve el número conectado, cuándo entró el último mensaje y que el bot está disponible para activar

#### Scenario: Comercio sin número propio

- **WHEN** el usuario abre la pantalla sin credenciales propias
- **THEN** ve el asistente de conexión como primer paso y el bot aparece como "requiere número propio"

### Requirement: Mensaje de prueba desde la pantalla

Cuando el usuario pide un mensaje de prueba a un teléfono que digita, el sistema SHALL enviarlo por el camino de salida existente con las credenciales verificadas y SHALL mostrar el resultado; un rechazo por ventana de 24 horas SHALL explicarse con esa causa.

#### Scenario: Prueba dentro de la ventana

- **WHEN** el usuario manda la prueba a su propio celular que escribió al número hace poco
- **THEN** el mensaje llega y la pantalla lo confirma

#### Scenario: Prueba fuera de la ventana

- **WHEN** Kapso rechaza el envío por la ventana de 24 horas
- **THEN** la pantalla explica que el destinatario debe escribirle primero al número (o usarse una plantilla)

### Requirement: El bot solo se activa con conexión verificada

Un comercio sin número propio verificado NO SHALL poder activar el bot; el rechazo SHALL guiar a conectar el número primero, y el modo sombra SHALL presentarse como paso recomendado antes de abrir al público.

#### Scenario: Activación sin número

- **WHEN** un comercio sin credenciales verificadas intenta prender el bot
- **THEN** el sistema lo rechaza con la guía de conexión

### Requirement: La excepción del piloto se retira

Cuando ALMARA FELICIDAD tenga número propio verificado, el sistema SHALL operar sin las variables de entorno del piloto, y ningún comercio nuevo SHALL habilitarse por esa vía.

#### Scenario: Piloto migrado

- **WHEN** ALMARA conecta y verifica su número propio
- **THEN** las variables del piloto se vacían y el bot sigue atendiendo por el camino oficial
