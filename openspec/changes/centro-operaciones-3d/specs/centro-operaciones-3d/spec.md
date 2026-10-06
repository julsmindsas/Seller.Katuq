## ADDED Requirements

### Requirement: Pantalla encendida por comercio
El sistema SHALL mostrar el Centro de operaciones solo a las empresas que lo tengan encendido y a los roles con su entrada de menú. Para los comercios actuales MUST nacer apagado.

#### Scenario: Comercio sin la opción
- **WHEN** un usuario de una empresa sin la opción encendida inicia sesión
- **THEN** no ve la entrada en el menú, y si abre la ruta directo la pantalla le dice que no está disponible para su empresa y no muestra datos

#### Scenario: Empresa de prueba
- **WHEN** un administrador de FLORECER inicia sesión después de activarla
- **THEN** ve la entrada "Centro de operaciones" en el menú y la pantalla carga

### Requirement: Escena de tres niveles
La pantalla SHALL mostrar una escena 3D navegable con dos niveles en esta entrega, bodega y muelles. La cámara MUST poder acercarse y alejarse entre ellos sin cambiar de pantalla.

#### Scenario: Bodega
- **WHEN** el usuario elige una bodega
- **THEN** cada producto de la cola aparece como una estantería con altura según su stock en esa bodega: rojo si el stock es negativo, naranja si está bajo, normal en otro caso

#### Scenario: Muelles
- **WHEN** hay pedidos en la cola operativa (producido totalmente, empacado o listo para despachar)
- **THEN** cada pedido aparece en el muelle de su etapa, los que tienen entrega hoy o vencida se marcan como urgentes, y los asignados a un transportador aparecen en su camión

### Requirement: Pedidos frenados por stock visibles
La pantalla SHALL marcar como "frenado" todo pedido de la cola con al menos un producto en negativo en la bodega del pedido. MUST mostrar qué producto falta y cuántas unidades.

#### Scenario: Pedido frenado
- **WHEN** un pedido en cola lleva 2 unidades de un producto que está en -3 en su bodega
- **THEN** el pedido se ve detenido con la etiqueta "faltan 3 de <producto>" y el producto parpadea en la bodega

#### Scenario: Foco en un producto
- **WHEN** el usuario toca un producto en negativo
- **THEN** se iluminan todos los pedidos de la cola que lo llevan y el panel lista esos pedidos

### Requirement: Operación con las acciones existentes
Desde la escena el usuario SHALL poder generar la guía de un pedido, abrir su detalle, y despachar o imprimir un grupo de pedidos. Cada acción MUST producir exactamente el mismo resultado que en Despachos. Lo que Despachos arma en pantalla (despachar e imprimir) MUST hacerse en la propia pantalla Despachos, abierta con esos pedidos ya seleccionados; la escena no lo reescribe.

#### Scenario: Generar guía desde la escena
- **WHEN** el usuario toca "Generar guía" sobre un pedido
- **THEN** el sistema genera la misma guía que Despachos para ese pedido y la abre

#### Scenario: Despachar un camión
- **WHEN** el usuario toca "Despachar" sobre el camión de un transportador
- **THEN** se abre Despachos con esos pedidos seleccionados y ese transportador elegido, y al confirmar allí el resultado es el de siempre; al volver, la escena muestra esos pedidos fuera de la cola

#### Scenario: Pedido frenado al despachar
- **WHEN** el grupo a despachar incluye un pedido frenado
- **THEN** antes de abrir Despachos se avisa en lenguaje del comercio qué producto falta y cuántas unidades, sin bloquear la decisión

### Requirement: Inventario solo de lectura
La pantalla MUST NOT crear, editar ni ajustar inventario, productos, variantes, precios ni listas de precios.

#### Scenario: Producto y precios intactos
- **WHEN** el usuario recorre la bodega, toca productos y despacha pedidos desde la escena
- **THEN** los documentos de producto, sus variantes, precios y listas de precios quedan idénticos, y el inventario solo cambia por los mismos flujos de despacho que ya existen

### Requirement: Versión en texto y equipos sin 3D
La pantalla SHALL ofrecer un panel con la misma información en texto: cola por etapa, frenados y faltantes por producto. Si el equipo no soporta 3D, MUST quedar solo ese panel, operativo.

#### Scenario: Sin soporte 3D
- **WHEN** el navegador no tiene WebGL
- **THEN** se ve el panel con la cola, los frenados y las acciones, sin escena

### Requirement: Liviana y al día
La escena SHALL refrescar los datos solos mientras está visible y MUST detenerse cuando no se ve. MUST respetar "reducir movimiento".

#### Scenario: Pestaña oculta
- **WHEN** el usuario cambia de pestaña
- **THEN** la escena deja de pintar y de pedir datos hasta que vuelve
