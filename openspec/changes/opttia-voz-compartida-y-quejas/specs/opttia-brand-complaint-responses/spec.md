## ADDED Requirements

### Requirement: Trato respetuoso acorde con la marca
WHEN se solicita redactar u orientar una respuesta a una queja, THE system SHALL conservar la voz compartida del comercio, reconocer la preocupación con respeto y evitar acusar, confrontar o atribuir culpa sin evidencia.

#### Scenario: Regalo distinto al solicitado
- **WHEN** se pide cómo responder a una persona que recibió un regalo distinto
- **THEN** el borrador es empático, no niega su reclamo ni determina de quién fue el error sin los hechos necesarios

### Requirement: Separar voz, evidencia y vigencia
THE system SHALL distinguir pautas de trato, hechos comprobados, información documental y recomendaciones; la personalidad o la existencia de un documento SHALL NOT acreditar por sí solas la vigencia de una condición comercial.

#### Scenario: Manual con restricciones de reclamación
- **WHEN** un manual contiene una restricción o plazo cuya vigencia no se pudo comprobar
- **THEN** no se comunica como regla actual confirmada ni como razón concluyente para rechazar al cliente; se indica qué debe validar el responsable

#### Scenario: Usuario sin permiso documental
- **WHEN** quien pide el borrador no puede consultar las políticas del comercio
- **THEN** recibe una respuesta de trato con la personalidad compartida, sin acceso a esas políticas y sin inventarlas para suplir el permiso

### Requirement: No prometer compensaciones ni acciones sin respaldo
THE system SHALL NOT afirmar una gestión ya iniciada, aprobar un cambio, abono, devolución o reembolso, fijar un plazo ni ofrecer una compensación como autorizada sin evidencia y autoridad suficientes; una alternativa general SHALL quedar explícitamente como sugerencia pendiente de validación.

#### Scenario: Propuesta de abono para otra compra
- **WHEN** no existe respaldo vigente ni autorización para un abono
- **THEN** no se ofrece al cliente como solución aprobada ni se ejecuta; si se menciona al colaborador como alternativa, se señala que debe validarla antes

#### Scenario: Borrador sin gestión iniciada
- **WHEN** solo se está redactando un mensaje
- **THEN** no se afirma que ya se revisó, escaló, envió o resolvió el caso

### Requirement: Diferenciar capacitación de verificación real
WHEN se solicita un ejemplo ficticio o solo un borrador de atención, THE system SHALL responder a esa tarea sin buscar pedidos o datos personales innecesarios; una solicitud de verificar un caso real SHALL respetar el alcance del rol y usar solo datos pertinentes.

#### Scenario: Ejemplo ficticio para capacitar
- **WHEN** se pide un ejemplo para una clienta ficticia llamada Ana
- **THEN** se redacta la respuesta con la voz del comercio sin buscar personas llamadas Ana ni pedir identificadores reales

### Requirement: Configuración existente y seguridad se conservan
THE system SHALL corregir la conducta de respuesta sin reescribir automáticamente los perfiles de los comercios, alterar sus roles o ejecutar cambios de negocio; perfil, documentos y mensajes externos SHALL ser evidencia o preferencias, no permisos para actuar.

#### Scenario: Preferencia de quejas incompatible
- **WHEN** la configuración sugiere confrontar al cliente o resarcir de inmediato sin verificar hechos
- **THEN** se mantiene un trato respetuoso y se solicitan las validaciones necesarias, sin promesa automática ni modificación silenciosa de esa configuración

### Requirement: Aceptación verificable antes de publicar
THE system SHALL validarse con casos de roles sin documentos, dos comercios, pérdida de permiso, contenido malicioso, perfil ausente, queja real y ejemplo ficticio, distinguiendo pruebas simuladas de respuestas del modelo real.

#### Scenario: Gate de aceptación
- **WHEN** se prepara el cambio para publicar
- **THEN** los contratos de aislamiento y permisos pasan, las respuestas revisadas reflejan la marca sin revelar documentos ni prometer efectos no autorizados y quedan registrados resultados y limitaciones sin credenciales o datos reales de clientes
