## ADDED Requirements

### Requirement: Conexión de cuentas por empresa sin intervención técnica
Cada empresa SHALL poder conectar sus propias cuentas de Instagram y páginas de Facebook desde el módulo de integraciones, usando Facebook Login for Business, sin escribir ni pegar tokens, identificadores ni URLs.

#### Scenario: Conectar una página de Facebook
- **WHEN** un usuario con permiso de administración pulsa "Conectar" en el canal de Facebook
- **THEN** el sistema abre el diálogo de Facebook Login for Business, y al finalizar muestra el estado "Conectado" con el nombre de la página, sin pedir ningún dato técnico al usuario

#### Scenario: Conectar una cuenta de Instagram
- **WHEN** un usuario con permiso de administración pulsa "Conectar" en el canal de Instagram
- **THEN** el sistema abre el diálogo de Meta y al finalizar muestra el estado "Conectado" con el nombre de la cuenta profesional vinculada

#### Scenario: El usuario cancela el diálogo de Meta
- **WHEN** el usuario cierra el diálogo de Meta sin autorizar
- **THEN** el canal permanece en estado "Sin conectar" y el sistema muestra un mensaje en lenguaje llano indicando que no se completó la conexión, sin códigos de error

### Requirement: Estado de conexión legible en todo momento
La pantalla de integraciones SHALL mostrar, para cada canal, exactamente uno de tres estados: **Sin conectar**, **Conectado** o **Reconectar**, cada uno con una explicación en lenguaje no técnico de qué significa y qué debe hacer el usuario.

#### Scenario: Token vencido o permiso revocado
- **WHEN** el token de la página deja de ser válido o el permiso fue revocado desde Meta
- **THEN** el canal pasa a estado "Reconectar" con la explicación de que la conexión caducó y un botón para rehacerla, y NO falla en silencio

#### Scenario: Desconectar un canal
- **WHEN** el usuario pulsa "Desconectar" y confirma
- **THEN** el sistema deja de recibir mensajes de esa cuenta, el canal vuelve a "Sin conectar", y los hilos ya recibidos permanecen visibles en modo lectura

### Requirement: Aislamiento multiempresa por cuenta conectada
El sistema SHALL enrutar cada mensaje entrante a la empresa dueña de la cuenta destino, resolviéndola por el identificador de página o de cuenta de Instagram que viene en el propio evento de Meta, sin inferirla por historial.

#### Scenario: Mensaje entrante a una página conectada
- **WHEN** llega un evento de Meta dirigido a una página o cuenta conectada por la empresa A
- **THEN** el mensaje queda visible únicamente en el buzón de la empresa A

#### Scenario: Mensaje dirigido a una cuenta no conectada
- **WHEN** llega un evento cuyo identificador de página o cuenta no corresponde a ninguna conexión registrada
- **THEN** el sistema descarta el evento, deja registro de la anomalía, y responde a Meta con éxito para no provocar reintentos

### Requirement: Custodia del token de acceso
El sistema SHALL almacenar los tokens de acceso cifrados y asociados a la empresa, y NO SHALL exponerlos al frontend en ninguna respuesta.

#### Scenario: Consulta del estado de conexión desde el frontend
- **WHEN** el frontend consulta el estado de los canales de una empresa
- **THEN** la respuesta incluye estado, nombre de la cuenta y fecha de conexión, y NO incluye el token ni el identificador crudo
