## ADDED Requirements

### Requirement: Solo sus métricas en las cifras de ventas de Opttia
WHILE la empresa tiene prendido "cada vendedor ve solo sus métricas", WHEN una persona con rol de ventas consulta cifras de ventas en Opttia (ventas del día, ventas por período, resumen de ingresos, ventas por fecha, pedidos por estado, productos más vendidos y la consulta flexible de ventas con cualquier agrupación o filtro), the system SHALL contar solo los pedidos donde esa persona es el vendedor.

#### Scenario: Vendedor con la opción prendida
- **WHEN** un vendedor de una empresa con la opción prendida pregunta "¿cuánto vendimos este mes?"
- **THEN** la cifra incluye solo sus pedidos y coincide con lo que ve en su Dashboard

#### Scenario: Opción apagada
- **WHEN** la empresa tiene la opción apagada
- **THEN** el vendedor recibe las cifras de toda la empresa, como hoy

#### Scenario: Administrador o directivo
- **WHEN** pregunta un administrador o un rol que dirige al equipo (director, gerente, jefe, coordinador, supervisor, líder)
- **THEN** recibe las cifras de toda la empresa aunque la opción esté prendida

#### Scenario: Cambio de la opción
- **WHEN** el administrador prende o apaga la opción
- **THEN** la siguiente pregunta en Opttia ya aplica el nuevo alcance, sin desplegar nada

### Requirement: Ranking restringido para un vendedor
WHILE aplica "solo sus métricas", the system SHALL devolver en una agrupación por vendedor únicamente la fila de quien pregunta, sin las de sus compañeros ni la fila "Sin vendedor asignado".

#### Scenario: Vendedor pide el ranking
- **WHEN** un vendedor restringido pregunta "¿quién fue el mejor vendedor?"
- **THEN** Opttia responde solo con sus propias cifras y explica que la empresa tiene activado que cada vendedor vea solo las suyas

#### Scenario: Vendedor pide a otro por nombre
- **WHEN** un vendedor restringido pregunta cuánto vendió un compañero
- **THEN** la consulta no devuelve cifras de ese compañero y Opttia explica que solo puede ver las propias

#### Scenario: Vendedor agrupa por otro criterio
- **WHEN** un vendedor restringido pregunta "¿qué canal vende más?"
- **THEN** el ranking de canales cuenta solo sus propios pedidos

### Requirement: Alcance decidido en el servidor
The system SHALL decidir el alcance en Katuq con la persona autenticada y su rol vigente en cada consulta, y SHALL NOT depender de lo que el modelo envíe como parámetro.

#### Scenario: Parámetro manipulado
- **WHEN** la llamada a la herramienta trae otro correo o empresa en sus parámetros
- **THEN** el alcance se calcula con la persona autenticada y los parámetros ajenos se ignoran o rechazan

#### Scenario: Rol cambiado
- **WHEN** el rol de la persona cambia entre dos preguntas
- **THEN** la segunda pregunta usa el rol nuevo

### Requirement: Persona disponible para las herramientas del chat
WHEN el chat de Opttia en Katuq ejecuta una herramienta, the system SHALL entregarle la persona que pregunta con el mismo nombre de campo que usan los demás canales, de modo que las reglas por persona existentes se apliquen.

#### Scenario: Plan de despachos para un vendedor restringido
- **WHEN** un vendedor restringido consulta el plan de despachos desde el chat de Katuq
- **THEN** aplica la misma regla por persona que en la vista de En vivo

### Requirement: Consultas de pedidos sin cambio
The system SHALL NOT restringir por vendedor la búsqueda ni el detalle de pedidos en Opttia, porque la web tampoco los restringe con esta opción.

#### Scenario: Buscar un pedido
- **WHEN** un vendedor restringido busca un pedido por número
- **THEN** obtiene el mismo resultado que hoy
