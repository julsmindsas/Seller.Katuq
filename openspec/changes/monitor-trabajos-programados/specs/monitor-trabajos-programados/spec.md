## ADDED Requirements

### Requirement: Evidencia de ejecución de todo trabajo programado
Todo trabajo programado —cron nativo o flow— SHALL registrar evidencia consultable de su ejecución: identificador, instante de arranque, instante de fin, duración, desenlace y un resumen breve de lo producido. El registro de esa evidencia SHALL ser no bloqueante.

#### Scenario: Un trabajo termina bien
- **WHEN** un trabajo programado termina su ejecución sin errores
- **THEN** queda una evidencia consultable con su desenlace exitoso, su duración y un resumen legible de lo que produjo

#### Scenario: El proceso muere a mitad del trabajo
- **WHEN** el proceso se reinicia mientras un trabajo está corriendo
- **THEN** su evidencia queda sin cerrar y el monitor lo presenta como interrumpido, nunca como exitoso

#### Scenario: Falla la escritura de la evidencia
- **WHEN** la persistencia de la evidencia falla por un error de base de datos
- **THEN** el trabajo continúa y termina normalmente, porque un fallo de observabilidad no puede tumbar la operación que observa

#### Scenario: Instrumentar no cambia el comportamiento
- **WHEN** se compara un trabajo instrumentado contra el mismo trabajo sin instrumentar
- **THEN** produce exactamente el mismo conjunto de escrituras, con la misma frecuencia, cobertura, orden y límites por corrida

### Requirement: Motivo del fallo persistido
Cuando un trabajo termine fallido o parcial, el sistema SHALL persistir el motivo legible y el paso o nodo donde ocurrió, de modo que el diagnóstico no dependa del log del servidor.

#### Scenario: Una corrida falla
- **WHEN** una corrida termina con desenlace fallido
- **THEN** su evidencia incluye el mensaje de error acotado en longitud y el paso donde ocurrió

#### Scenario: Diagnóstico después de que el log rotó
- **WHEN** se consulta una corrida fallida cuyo log del servidor ya fue rotado
- **THEN** el motivo del fallo sigue estando disponible desde la evidencia persistida

### Requirement: Catálogo declarado de trabajos esperados
El sistema SHALL mantener un catálogo de trabajos programados con su naturaleza —periódico o reactivo— y, para los periódicos, su cadencia esperada y su tolerancia.

#### Scenario: Un trabajo periódico no corre cuando debía
- **WHEN** un trabajo declarado periódico no registra ejecución dentro de su cadencia esperada más su tolerancia
- **THEN** el sistema lo marca como ausente

#### Scenario: Un trabajo reactivo lleva semanas callado
- **WHEN** un trabajo declarado reactivo no registra ejecución durante semanas porque no entraron pedidos por ese canal
- **THEN** el sistema NO lo marca como ausente, porque su silencio es un estado válido

#### Scenario: Aparece un trabajo que nadie declaró
- **WHEN** un trabajo ejecuta sin estar declarado en el catálogo
- **THEN** el sistema lo muestra igualmente, señalado como no declarado, para que no quede invisible por olvido

### Requirement: Consulta del estado consolidado
El sistema SHALL exponer el estado consolidado de los trabajos programados y sus incidencias recientes, restringido a superadministrador.

#### Scenario: Superadministrador consulta el estado
- **WHEN** un superadministrador solicita el consolidado
- **THEN** recibe, por trabajo, su última ejecución, su desenlace, sus conteos de la ventana y si está ausente, junto con las incidencias recientes y su motivo

#### Scenario: Lo solicita alguien que no es superadministrador
- **WHEN** un usuario de cualquier otro rol solicita el consolidado
- **THEN** el sistema rechaza la petición

#### Scenario: No se puede calcular el estado de un trabajo
- **WHEN** la lectura necesaria para evaluar un trabajo falla
- **THEN** el sistema lo reporta como indeterminado y NO lo presenta como sano

### Requirement: Pantalla de monitoreo para superadministrador
El sistema SHALL ofrecer en el área de superadministración una pantalla de solo lectura que presente primero el resumen y después el detalle por trabajo, cumpliendo el tema canónico de diseño.

#### Scenario: El superadministrador abre la pantalla
- **WHEN** el superadministrador entra a la pantalla de monitoreo
- **THEN** ve primero cuántos trabajos están sanos, cuántos ausentes, cuántos con fallos y cuántos sin visibilidad, y debajo el detalle por trabajo

#### Scenario: Distinguir estados sin depender del color
- **WHEN** la pantalla presenta trabajos en distintos estados
- **THEN** cada estado se distingue por forma además de por color semántico

#### Scenario: Un trabajo sin evidencia disponible
- **WHEN** un trabajo aún no emite evidencia
- **THEN** la pantalla lo indica explícitamente como no observable, en lugar de mostrarlo como sano

#### Scenario: Pantalla vieja contra sistema quieto
- **WHEN** la pantalla presenta datos
- **THEN** muestra el instante en que fueron leídos, para que una pantalla desactualizada no se confunda con un sistema detenido

### Requirement: Aislamiento de la capacidad de monitoreo
Esta capacidad SHALL ser de solo lectura sobre el dominio: lo único que escribe es su propia evidencia.

#### Scenario: El monitoreo no toca producto ni precios
- **WHEN** se ejecuta la instrumentación completa sobre un trabajo de inventario
- **THEN** producto, variantes, categorías, imágenes, flags comerciales, precio, precios por tipo de cliente y listas de precios permanecen sin cambios

#### Scenario: El monitoreo no toca inventario ni órdenes
- **WHEN** se ejecuta la instrumentación completa sobre cualquier trabajo
- **THEN** no se escribe inventory, inventoryMovement, órdenes ni consecutivos, y no se emite ninguna escritura hacia Shopify, Cereza ni Fullpi
