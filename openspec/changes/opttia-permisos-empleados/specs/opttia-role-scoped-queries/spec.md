## ADDED Requirements

### Requirement: Consultas según el rol vigente

WHEN un empleado con identidad inequívoca consulta Opttia desde Katuq, the system SHALL autorizar únicamente consultas expresamente permitidas para su rol vigente y empresa activa, sin convertirlo en administrador.

#### Scenario: Inventario no concede información financiera
- **WHEN** un empleado autorizado únicamente para inventario pide existencias y luego cartera
- **THEN** puede consultar existencias y se rechaza cartera antes de recuperar datos financieros

#### Scenario: Logística y contabilidad separadas
- **WHEN** un empleado consulta desde un rol logístico o contable
- **THEN** solo recibe la información necesaria para las consultas autorizadas de esa función, sin heredar herramientas de otra área

#### Scenario: Cambio de rol
- **WHEN** el administrador retira una consulta al rol entre dos mensajes
- **THEN** el siguiente mensaje y la siguiente llamada de herramienta aplican la revocación sin reutilizar el permiso anterior

### Requirement: Alcance personal existente

WHILE Katuq restringe una clase de información a la persona autenticada, the system SHALL aplicar la misma restricción en Opttia y SHALL NOT ampliarla por la concesión de lectura del módulo.

#### Scenario: Métricas propias de ventas
- **WHEN** un vendedor tiene activado «cada vendedor ve solo sus métricas» y solicita cifras o rankings
- **THEN** solo se cuentan sus ventas, aunque pida cifras de otro vendedor o manipule parámetros

#### Scenario: Dirección y opción desactivada
- **WHEN** la configuración y rol vigentes permiten cifras del equipo o del comercio
- **THEN** Opttia respeta ese alcance existente, sin activar restricciones nuevas por iniciativa propia

#### Scenario: Identidad y tenant no editables
- **WHEN** la consulta contiene otra empresa, correo o rol en sus argumentos
- **THEN** esa información no cambia la identidad, permisos ni alcance validados en servidor

### Requirement: Reparación acotada y verificable

WHEN se corrigen permisos de empleados, the system SHALL aplicar únicamente asignaciones explícitas revisadas, de consulta, después de una simulación y conservar trazabilidad del antes y después.

#### Scenario: Preservar configuración
- **WHEN** se aplica la asignación aprobada de un rol
- **THEN** no cambian su nombre, menús, usuarios asignados ni permisos ajenos; no se añaden acciones de escritura

#### Scenario: Ambigüedad y consultas no soportadas
- **WHEN** no existe el rol, su función no es inequívoca, la identidad está duplicada o no hay una consulta compatible con sus atribuciones
- **THEN** se informa la limitación y no se concede acceso de administrador, permisos prestados de otra área ni acceso a un rol de otro comercio

#### Scenario: Cambio concurrente
- **WHEN** la configuración de un rol cambia después de la simulación
- **THEN** la aplicación no pisa el cambio y exige revisar esa asignación de nuevo

#### Scenario: Sin efectos operativos
- **WHEN** se aplica o valida la reparación de permisos
- **THEN** no se modifican pedidos, inventario, movimientos, productos, catálogo, precios, pagos ni despachos; las consultas continúan siendo de solo lectura y sujetas a sus cupos

#### Scenario: Aceptación antes de habilitar
- **WHEN** una asignación incorpora consultas con restricción por persona
- **THEN** se comprueba esa restricción, las consultas denegadas y el aislamiento entre comercios antes de conceder el acceso
