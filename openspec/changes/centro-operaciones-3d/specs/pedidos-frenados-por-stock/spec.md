## ADDED Requirements

### Requirement: Foto de la operación
El sistema SHALL entregar, a pedido de la pantalla, la foto de la operación de la empresa de la sesión. Incluye los pedidos de la cola operativa con su etapa, urgencia, bodega, transportador y líneas, y el stock actual de los productos de esos pedidos en cada bodega.

#### Scenario: Empresa con cola
- **WHEN** la pantalla pide la foto para una empresa con 40 pedidos en cola
- **THEN** recibe los 40 pedidos y el stock de cada producto que aparece en ellos, por bodega

#### Scenario: Empresa sin cola
- **WHEN** la empresa no tiene pedidos en cola
- **THEN** recibe una foto vacía sin error

### Requirement: Stock sin doble conteo
El stock de cada producto por bodega MUST calcularse normalizando la referencia al identificador del producto y contando una sola vez cada producto en cada bodega.

#### Scenario: Registros duplicados de inventario
- **WHEN** un producto tiene en la misma bodega un registro guardado por referencia y otro por identificador
- **THEN** su stock en esa bodega se cuenta una sola vez

### Requirement: Regla de pedido frenado
Un pedido de la cola SHALL quedar frenado cuando al menos uno de sus productos tiene stock negativo en la bodega del pedido. El faltante reportado MUST ser el valor absoluto de ese negativo. Los productos marcados como no inventariables MUST NOT frenar pedidos.

#### Scenario: Producto en negativo
- **WHEN** un pedido de la bodega BOD-001 lleva un producto con stock -3 en BOD-001
- **THEN** el pedido sale frenado con faltante 3 para ese producto

#### Scenario: Producto no inventariable
- **WHEN** un pedido lleva solo productos no inventariables
- **THEN** el pedido no sale frenado

### Requirement: Pedidos rezagados
Un pedido de la cola con la entrega vencida hace más de 7 días SHALL marcarse como rezagado. Los rezagados MUST contarse aparte de la cola viva y MUST NOT evaluarse como frenados.

#### Scenario: Pedido que ya salió sin cambiar de estado
- **WHEN** un pedido sigue empacado con la entrega vencida hace 30 días
- **THEN** sale como rezagado, no cuenta en la cola viva ni en los urgentes, y aparece en la lista de rezagados

### Requirement: Alcance y aislamiento
La foto MUST salir solo de la empresa del token. Con "solo sus métricas" activo, MUST incluir solo los pedidos del asesor. El sistema MUST NOT escribir en ninguna colección al armarla.

#### Scenario: Vendedor con solo sus métricas
- **WHEN** un vendedor con "solo sus métricas" pide la foto
- **THEN** solo ve los pedidos donde él es el asesor

#### Scenario: Rol sin acceso
- **WHEN** un usuario cuyo rol no tiene "Centro de operaciones" en sus menús pide la foto
- **THEN** recibe una respuesta de "no disponible" sin datos

#### Scenario: Sin escrituras
- **WHEN** se arma la foto
- **THEN** inventario, movimientos, productos, variantes, precios y listas de precios quedan sin cambios
