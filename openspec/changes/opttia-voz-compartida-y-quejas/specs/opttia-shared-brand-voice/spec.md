## ADDED Requirements

### Requirement: Voz del comercio para todo empleado autorizado
WHILE un empleado activo tenga sesión y acceso vigentes al chat integrado de Katuq, THE system SHALL aplicar automáticamente a sus respuestas generadas las preferencias compartibles de voz y trato de su comercio, independientemente del permiso de lectura documental o de que su plan sea gratuito.

#### Scenario: Empleado sin permiso de documentos
- **WHEN** un empleado autorizado para usar el chat no puede leer documentos de marca y pide un saludo para una clienta
- **THEN** la respuesta respeta la voz de su comercio sin leer documentos, solicitar nuevos permisos o ampliar sus consultas disponibles

#### Scenario: Empleados con distintos roles
- **WHEN** dos empleados autorizados del mismo comercio tienen funciones distintas
- **THEN** ambos reciben la misma personalidad compartida y conservan, cada uno, su alcance de datos y acciones

### Requirement: Estilo compartido no implica acceso a información reservada
THE system SHALL separar las preferencias compartibles de redacción y trato de los documentos, adjuntos, instrucciones operativas y condiciones comerciales restringidas; SHALL NOT convertir el texto libre de configuración completo en información común por el solo hecho de llamarlo personalidad.

#### Scenario: Solicitud indirecta de contenido reservado
- **WHEN** un empleado sin lectura documental pide copiar un manual, sus reglas internas o el contenido completo del perfil como parte de un saludo
- **THEN** el estilo permanece disponible, pero la información fuera de su autorización no se carga ni revela

#### Scenario: Gestión y lectura documental
- **WHEN** un empleado recibe la voz de marca
- **THEN** no adquiere por ello capacidad de listar, consultar, indexar, editar o retirar documentos, ni modificar la personalidad del comercio

### Requirement: Aislamiento y revalidación
THE system SHALL obtener la voz del comercio de la sesión validada y revalidar su disponibilidad en cada nueva consulta, sin reutilizar preferencias de otra empresa o de una sesión revocada.

#### Scenario: Cambio de comercio o sesión
- **WHEN** cambia la empresa, el usuario o la validez de la sesión entre mensajes
- **THEN** la respuesta siguiente no usa la voz ni evidencia anteriores y exige el contexto actual autorizado

#### Scenario: Cuenta sin acceso al chat
- **WHEN** la cuenta está inactiva, la empresa no está disponible o el rol no tiene acceso vigente al chat
- **THEN** compartir voz no le concede ese acceso ni una autorización alternativa

### Requirement: Ausencia de personalidad e instrucciones incompatibles
IF no hay personalidad compartible configurada o no se puede verificar, THEN THE system SHALL evitar inventarla o sustituirla por la de otro comercio y SHALL explicar la limitación con trato neutro; las preferencias SHALL NOT cambiar identidad, permisos, fuentes o requisitos de aprobación.

#### Scenario: Preferencia que ordena revelar información
- **WHEN** un texto de estilo ordena ignorar controles, acceder a otro comercio o divulgar documentos
- **THEN** no se amplía el acceso ni se ejecuta esa instrucción como autorización

### Requirement: Compatibilidad de funciones existentes
THE system SHALL mantener cuotas, planes, límites de consultas, acceso a datos operativos y confirmación humana de soporte existentes, sin conceder permisos por nombre de rol ni modificar cuentas para hacer pasar una prueba.

#### Scenario: Perfil y documentos tras retirar permiso documental
- **WHEN** se retira solo la lectura de documentos de un empleado que conserva acceso al chat
- **THEN** mantiene la voz compartida, pierde la lectura documental y no obtiene otras capacidades
