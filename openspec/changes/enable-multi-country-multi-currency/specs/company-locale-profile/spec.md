# Delta: company-locale-profile

## ADDED Requirements

### Requirement: Perfil de país por empresa
THE system SHALL conservar para cada empresa un perfil con país, moneda de operación, número de decimales de esa moneda, zona horaria, idioma de presentación, tipo de identidad fiscal y catálogo de direcciones aplicable.

#### Scenario: Empresa colombiana existente
- **GIVEN** una empresa que hoy opera en Colombia sin perfil explícito
- **WHEN** se consulta su perfil
- **THEN** obtiene país Colombia, moneda de cero decimales, zona horaria de Bogotá e identidad fiscal de tipo NIT

#### Scenario: Empresa sin perfil asignado
- **GIVEN** una empresa cuyo perfil no ha sido asignado
- **WHEN** una operación necesita su moneda o su zona horaria
- **THEN** el sistema resuelve el perfil por omisión de Colombia y deja registro de que fue resuelto por omisión

### Requirement: El perfil es la única fuente de presentación
THE system SHALL derivar del perfil todo formato de moneda, fecha y número que se muestre al usuario, sin que la pantalla decida el símbolo, el separador ni la cantidad de decimales.

#### Scenario: Monto en una moneda de dos decimales
- **GIVEN** una empresa cuyo perfil declara una moneda de dos decimales
- **WHEN** se muestra un monto en cualquier pantalla
- **THEN** aparece con dos decimales y con el símbolo de esa moneda

#### Scenario: Monto en una moneda de cero decimales
- **GIVEN** una empresa cuyo perfil declara una moneda de cero decimales
- **WHEN** se muestra el mismo monto
- **THEN** aparece sin decimales, sin que ninguna pantalla haya tenido que decidirlo

### Requirement: La zona horaria de las tareas programadas proviene del perfil
WHEN el sistema programa o evalúa una tarea recurrente asociada a una empresa, THE system SHALL usar la zona horaria del perfil de esa empresa.

#### Scenario: Cierre diario de una empresa fuera de Colombia
- **GIVEN** una empresa cuyo perfil declara una zona horaria distinta de la de Bogotá
- **WHEN** se ejecuta su tarea de cierre diario
- **THEN** la tarea corre según la zona horaria del perfil y no según la de Bogotá

### Requirement: La identidad fiscal se valida según el país del perfil
THE system SHALL validar el documento fiscal de empresas y clientes con las reglas del país declarado en el perfil.

#### Scenario: Documento válido para el país
- **GIVEN** una empresa cuyo perfil declara un país y un cliente con un documento válido para ese país
- **WHEN** se guarda el cliente
- **THEN** el documento se acepta

#### Scenario: Documento con formato de otro país
- **GIVEN** la misma empresa y un cliente con un documento cuyo formato pertenece a otro país
- **WHEN** se intenta guardar
- **THEN** el sistema lo rechaza indicando el tipo de documento esperado
