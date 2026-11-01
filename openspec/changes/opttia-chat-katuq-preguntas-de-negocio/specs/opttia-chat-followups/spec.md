## ADDED Requirements

### Requirement: Preguntas de seguimiento con contexto
WHEN una persona envía una pregunta en el chat de Opttia del botón flotante, the system SHALL enviar con ella hasta las tres preguntas anteriores que esa persona escribió en la misma conversación, para que Opttia entienda a qué se refiere la pregunta actual.

#### Scenario: Cambio de período
- **WHEN** la persona pregunta "¿quién fue el mejor vendedor en septiembre?" y luego "¿y en agosto?"
- **THEN** Opttia responde el mejor vendedor de agosto

#### Scenario: Cambio de criterio
- **WHEN** la persona pregunta "¿qué canal vendió más este mes?" y luego "¿y por ciudad?"
- **THEN** Opttia responde las ventas de este mes por ciudad

#### Scenario: Solo las últimas tres
- **WHEN** la conversación tiene cinco preguntas anteriores
- **THEN** viajan solo las tres más recientes

#### Scenario: Pregunta suelta
- **WHEN** la pregunta actual no depende de las anteriores
- **THEN** Opttia la responde sin mezclar temas anteriores

### Requirement: Las cifras siempre se vuelven a consultar
The system SHALL enviar como contexto solo el texto de las preguntas anteriores, sin las respuestas ni los datos obtenidos, y Opttia SHALL volver a consultar Katuq para cualquier cifra de la respuesta actual.

#### Scenario: Rol revocado entre preguntas
- **WHEN** a la persona le quitan el permiso de ventas después de una pregunta sobre ventas
- **THEN** la siguiente pregunta de seguimiento no recibe cifras de ventas, ni nuevas ni de la respuesta anterior

### Requirement: Contexto acotado a la conversación
The system SHALL descartar el contexto al iniciar una conversación nueva, al cambiar de empresa o al cambiar de usuario, y SHALL NOT guardar la conversación en el servidor.

#### Scenario: Nueva conversación
- **WHEN** la persona pulsa "Nueva conversación"
- **THEN** la siguiente pregunta viaja sin preguntas anteriores

#### Scenario: Cambio de empresa
- **WHEN** la persona cambia de empresa activa
- **THEN** ninguna pregunta de la empresa anterior viaja como contexto

### Requirement: Contexto con límites
The system SHALL limitar el largo de cada pregunta anterior y SHALL tratar ese contexto como texto de la misma persona, sin darle más permisos que la pregunta actual.

#### Scenario: Pregunta anterior muy larga
- **WHEN** una pregunta anterior supera el largo permitido para contexto
- **THEN** se recorta antes de enviarse al modelo

#### Scenario: Instrucción escondida en el contexto
- **WHEN** una pregunta anterior pide cambiar de empresa, de permisos o de reglas
- **THEN** Opttia la ignora y los permisos siguen saliendo de Katuq

### Requirement: Cupo sin cambios
The system SHALL cobrar cada pregunta como hoy (un mensaje del cupo y un crédito), sin importar cuántas preguntas anteriores viajen como contexto.

#### Scenario: Seguimiento
- **WHEN** la persona envía una pregunta de seguimiento
- **THEN** se descuenta un solo mensaje del cupo
