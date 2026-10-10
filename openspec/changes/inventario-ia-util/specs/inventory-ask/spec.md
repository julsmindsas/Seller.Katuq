# Spec delta — inventory-ask

## ADDED Requirements

### Requirement: Preguntas de inventario a Opttia
El sistema SHALL permitir preguntarle a Opttia, en lenguaje natural, por el inventario de la empresa, y SHALL responder usando solo herramientas de lectura sobre los datos de esa empresa.

#### Scenario: pregunta sobre faltantes
- **WHEN** la persona pregunta qué productos se van a agotar
- **THEN** the system SHALL responder con nombres de producto, cantidades y bodegas tomados de las herramientas, no de memoria del modelo

#### Scenario: datos insuficientes
- **WHEN** la herramienta devuelve que no hay datos para juzgar (sin inventario configurado o sin demanda)
- **THEN** the system SHALL decirlo y no estimar una respuesta

#### Scenario: misma medida que la pantalla
- **WHEN** la persona pregunta por cobertura o por qué comprar
- **THEN** the system SHALL responder con las mismas cifras que muestra la pantalla de inteligencia de inventario

### Requirement: Aislamiento por empresa
El sistema SHALL limitar cada respuesta a la empresa de la sesión autenticada.

#### Scenario: pregunta por otra empresa
- **WHEN** la persona pide datos de una empresa distinta a la suya
- **THEN** the system SHALL negarse sin revelar si esa empresa existe

### Requirement: Solo lectura en esta versión
El sistema SHALL NOT modificar inventario, productos ni precios como resultado de una pregunta.

#### Scenario: petición de cambio por chat
- **WHEN** la persona pide ajustar o mover stock por el chat
- **THEN** the system SHALL explicar en qué pantalla se hace y no ejecutar el cambio

### Requirement: Preguntas sugeridas
La pantalla de inteligencia de inventario SHALL ofrecer preguntas sugeridas que abren el chat con la pregunta ya escrita.

#### Scenario: abrir el chat desde la pantalla
- **WHEN** la persona toca una pregunta sugerida
- **THEN** the system SHALL abrir el chat de Opttia con esa pregunta y respetar el cupo de mensajes de su plan

#### Scenario: cupo agotado
- **WHEN** la empresa no tiene mensajes disponibles en su plan
- **THEN** the system SHALL avisar cuándo se renueva el cupo y no consumir una respuesta
