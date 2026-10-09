## ADDED Requirements

### Requirement: El alistamiento solo toca documentos de la empresa que llama
Al iniciar o consultar el alistamiento de un pedido, y al completar o consultar un picking o un packing, el sistema SHALL verificar que el documento (pedido, picking o packing) pertenezca a la empresa que llama, antes de escribir cualquier cosa y antes de devolver datos suyos. Un documento sin empresa SHALL tratarse como de nadie.

#### Scenario: Iniciar el alistamiento del pedido de otra empresa
- **WHEN** una empresa que tiene su propia bodega BOD-001 inicia el alistamiento de un pedido que es de otra empresa
- **THEN** el sistema responde "Pedido no encontrado" (404) y no crea picking ni movimiento ni cambia el estado del pedido

#### Scenario: Pedido sin empresa
- **WHEN** se inicia el alistamiento de un pedido que no tiene el campo de empresa
- **THEN** el sistema responde "Pedido no encontrado" y no escribe nada

#### Scenario: Completar el picking de otra empresa
- **WHEN** una empresa completa un picking que es de otra empresa
- **THEN** el sistema responde "Picking no encontrado", no descuenta inventario de nadie y el picking sigue como estaba

#### Scenario: Packing de otra empresa
- **WHEN** una empresa inicia el packing de un pedido ajeno, o completa un packing ajeno
- **THEN** el sistema responde "Pedido no encontrado" o "Packing no encontrado", no copia las líneas del picking ajeno y no cambia el estado del pedido ajeno

#### Scenario: Estado con datos cruzados
- **WHEN** existe un picking de la empresa A que apunta a un pedido de la empresa B y la empresa A consulta el estado
- **THEN** el sistema responde "Pedido no encontrado" y no devuelve datos del pedido de B

### Requirement: Lo que un documento enlaza también tiene que ser de la empresa
Al completar un picking, al completar un packing y al iniciar un packing, el sistema SHALL verificar, antes de escribir, que el pedido enlazado y el picking de origen sean de la empresa que llama, y SHALL ignorar los alistamientos activos o completados de otra empresa que compartan el mismo pedido. Un documento cruzado que ya exista SHALL NOT poder descontar existencias, copiar líneas ni cambiar el estado de un pedido ajeno.

#### Scenario: Picking propio que apunta a un pedido ajeno
- **WHEN** una empresa completa un picking suyo cuyo pedido es de otra empresa, o que apunta a un pedido que ya no existe
- **THEN** el sistema responde "Pedido no encontrado", no descuenta inventario, no cambia el estado de ningún pedido y el picking sigue como estaba

#### Scenario: Packing propio que apunta a un pedido ajeno
- **WHEN** una empresa completa un packing suyo cuyo pedido es de otra empresa
- **THEN** el sistema responde "Pedido no encontrado" y no escribe el packing, ni el movimiento, ni los datos de embalaje en el pedido ajeno

#### Scenario: Picking completado de otra empresa con el mismo pedido
- **WHEN** una empresa inicia el packing de su pedido y el único picking completado de ese pedido es de otra empresa
- **THEN** el sistema responde que no hay un picking completado para el pedido y no copia sus líneas; si existen uno propio y uno ajeno, copia solo el propio

#### Scenario: Alistamiento activo de otra empresa con el mismo pedido
- **WHEN** existe un alistamiento (o un packing) activo de otra empresa para el mismo pedido y la empresa dueña del pedido lo inicia
- **THEN** el alistamiento ajeno no la bloquea

### Requirement: Un documento ajeno es indistinguible de uno inexistente
IF el documento pedido pertenece a otra empresa, THEN el sistema SHALL responder exactamente lo mismo que responde cuando el documento no existe.

#### Scenario: Mismo cuerpo, mismo código
- **WHEN** se pide un pedido ajeno y luego uno que no existe
- **THEN** las dos respuestas tienen el mismo código HTTP y el mismo texto

### Requirement: La empresa que llama es la de la sesión firmada
El sistema SHALL tomar la empresa del token de sesión y SHALL rechazar con 403, antes de leer datos, una petición cuyo encabezado o cuerpo nombre otra empresa. La llave de servicio, que no trae empresa en el token, SHALL ser rechazada en estas rutas.

#### Scenario: Encabezado de otra empresa
- **WHEN** una sesión de la empresa A manda el encabezado de la empresa B
- **THEN** el sistema responde 403 y no lee ni escribe nada

### Requirement: Para quien opera con lo suyo, nada cambia
WHILE una empresa con la bandera `pickingAlistamiento` prendida llama con documentos propios, el sistema SHALL responder y escribir lo mismo que antes de este cambio: mismas colecciones, mismos campos, mismos estados de pedido.

#### Scenario: Documentos propios
- **WHEN** una empresa con la bandera prendida inicia y completa el picking y el packing de sus propios pedidos
- **THEN** el resultado y el conjunto de escrituras son los de siempre (lo fija la prueba de aislamiento)

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** una empresa sin la bandera llama a cualquiera de las rutas que escriben, tenga o no "Picking y packing" en el menú de sus roles
- **THEN** recibe 403 y no se escribe nada (spec `picking-feature-flag`); estar o no en el menú no cambia nada, lo que manda es la bandera

### Requirement: El estado del picking no exige un índice nuevo
WHEN se consulta el estado del picking de un pedido, el sistema SHALL devolver el alistamiento más reciente sin requerir un índice compuesto que no esté declarado.

#### Scenario: Dos alistamientos del mismo pedido
- **WHEN** el pedido tiene un alistamiento cancelado y otro más nuevo en proceso
- **THEN** el sistema devuelve el más nuevo

#### Scenario: Pedido sin alistamiento
- **WHEN** el pedido todavía no se ha empezado a alistar
- **THEN** el sistema responde 404 "No se encontró proceso de picking para este pedido" (así la pantalla sabe que puede iniciarlo)
