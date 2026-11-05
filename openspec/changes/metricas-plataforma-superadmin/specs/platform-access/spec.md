## ADDED Requirements

> **Aprobado por Daniel (5-nov-2026):** la Consola de plataforma exige el rol «Super Administrador». Es un cambio de módulo sensible (autenticación y rutas) con diff aprobado y lista de operadores confirmada antes de publicar.

### Requirement: Solo Super Administrador de la empresa operadora
El servidor SHALL permitir los endpoints de métricas de plataforma, cobros, ficha 360, tickets agregados, pauta de plataforma y consultas de plataforma únicamente a un usuario con rol Super Administrador de la empresa operadora. La empresa operadora SHALL identificarse por un identificador configurado en Firestore (D-505), no por su nombre. La empresa y el rol SHALL salir del token firmado y el rol SHALL confirmarse contra el registro del usuario en la base, nunca de encabezados del cliente. IF falta el rol o la empresa, THEN el servidor SHALL rechazar. La verificación SHALL aplicarse en cada endpoint, no solo en la pantalla.

#### Scenario: Usuario de Julsmind sin rol
- **WHEN** un usuario de Julsmind con rol distinto de Super Administrador llama a una ruta de plataforma
- **THEN** el servidor responde sin datos

#### Scenario: Administrador de otro comercio
- **WHEN** un administrador de un comercio llama a una ruta de plataforma
- **THEN** el servidor responde sin datos

#### Scenario: Empresa homónima
- **WHEN** un comercio crea una empresa con un nombre igual o parecido al de la operadora
- **THEN** el servidor la rechaza porque su identificador no coincide

#### Scenario: Rol asignado dentro de otra empresa
- **WHEN** un usuario de un comercio recibe en su empresa un rol llamado «Super Administrador»
- **THEN** el servidor rechaza porque su empresa no es la operadora

#### Scenario: Encabezado alterado
- **WHEN** una petición trae el encabezado de empresa de Julsmind pero un token de otro comercio
- **THEN** el servidor usa la empresa del token y rechaza

#### Scenario: Super Administrador de Julsmind
- **WHEN** un Super Administrador de la empresa operadora llama a una ruta de plataforma
- **THEN** recibe los datos

### Requirement: Cobertura completa
El servidor SHALL aplicar la misma regla a todo endpoint que devuelva datos de más de un comercio y SHALL NOT exponer cifras de plataforma por rutas que no pasen por `guardPlataforma`.

#### Scenario: Ruta multi-comercio
- **WHEN** se llama sin el rol requerido a cualquier ruta que devuelve datos de varios comercios
- **THEN** el servidor rechaza

### Requirement: La pantalla refleja el servidor
Las pantallas de plataforma SHALL ocultarse a quien no tenga acceso, pero la autorización SHALL residir en el servidor.

#### Scenario: Ocultar no basta
- **WHEN** un usuario sin rol llama directamente a la ruta
- **THEN** el servidor la rechaza

### Requirement: Cambios de rol efectivos
WHEN a un usuario se le quita el rol de Super Administrador, el servidor SHALL rechazarle las rutas de plataforma con sus tokens ya emitidos en un plazo máximo de [60 segundos]. El sistema SHALL ofrecer a Daniel la lista de quienes tienen el rol, para revisión trimestral.

#### Scenario: Rol retirado
- **WHEN** se retira el rol a una persona con sesión abierta
- **THEN** su siguiente petición de plataforma, pasado ese plazo, es rechazada

### Requirement: Escrituras con bitácora completa
WHEN el Super Administrador cambia el tipo de cuenta, registra o anula un pago manual o registra un motivo de baja, el sistema SHALL registrar quién, cuándo, el valor anterior y el nuevo, y SHALL rechazar la acción a cualquier otro rol. La bitácora SHALL ser solo de anexar. WHEN un tipo deducido pasa a confirmado, SHALL quedar registrado.

#### Scenario: Cambio de tipo por otro rol
- **WHEN** un usuario sin rol de Super Administrador intenta cambiar el tipo de cuenta
- **THEN** el servidor lo rechaza y no hay cambio

#### Scenario: Cambio de tipo
- **WHEN** el Super Administrador cambia una cuenta de real a cortesía
- **THEN** la bitácora guarda «real» como anterior, «cortesía» como nuevo, quién y cuándo

### Requirement: Auditoría de lectura
El sistema SHALL registrar quién y cuándo abre una ficha 360 y quién y cuándo exporta datos de varios comercios. Este registro SHALL ser solo de anexar y legible solo por Daniel.

#### Scenario: Exportación
- **WHEN** el Super Administrador exporta la tabla a CSV
- **THEN** queda registrado quién, cuándo y con qué filtros

### Requirement: Privacidad entre comercios
Un comercio SHALL NOT poder ver datos de otros comercios ni de la plataforma por ninguna ruta de plataforma, ni con roles administrativos propios.

#### Scenario: Aislamiento
- **WHEN** un comercio pide métricas de plataforma
- **THEN** no recibe datos propios ni ajenos por esa ruta
