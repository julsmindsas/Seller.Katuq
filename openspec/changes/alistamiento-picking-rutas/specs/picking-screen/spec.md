## ADDED Requirements

### Requirement: La pantalla solo se ofrece a la empresa que la tiene encendida
La pantalla de picking y la de packing SHALL abrirse únicamente si la empresa tiene prendida la bandera `pickingAlistamiento`; sin ella no se ofrece la entrada del menú y la dirección lleva a la página de inicio con un aviso (spec `picking-feature-flag`). Todo lo que sigue describe la pantalla de la empresa que la tiene encendida.

#### Scenario: Empresa sin la bandera
- **WHEN** un usuario de una empresa sin la bandera intenta abrir la pantalla de picking
- **THEN** llega a la página de inicio con el aviso "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos."

### Requirement: La pantalla consulta el alistamiento por pedido
El front SHALL iniciar, completar y consultar el alistamiento mediante las rutas `/v1/inventory/picking/iniciar`, `/completar` y `/estado/:pedido`, consultando el estado por el pedido y no por un id de picking. La URL del detalle SHALL llevar el número del pedido.

#### Scenario: Pedido que todavía no se alista
- **WHEN** el usuario abre un pedido pendiente que no tiene alistamiento
- **THEN** ve los datos del pedido, sus productos, un selector de bodega y el botón "Iniciar Picking"

#### Scenario: Pedido ya en alistamiento
- **WHEN** el usuario abre un pedido que ya tiene alistamiento
- **THEN** ve su estado ("En proceso" o "Completado"), la bodega por su nombre, las fechas legibles y los productos con la cantidad solicitada y la recolectada; mientras no esté cerrado ve el botón "Completar Picking"

#### Scenario: Recargar la página
- **WHEN** el usuario recarga el detalle de un pedido
- **THEN** la pantalla vuelve al mismo punto, porque todo se reconstruye desde el número del pedido

### Requirement: Los productos salen del pedido
WHEN se prepara el alistamiento, el front SHALL tomar los productos y cantidades del carrito del pedido, SHALL sumar los productos repetidos en una sola línea y SHALL dejar por fuera los productos que no se guardan en bodega, avisando cuántas líneas dejó. El front SHALL NOT permitir armar una lista libre de productos.

#### Scenario: Producto repetido
- **WHEN** el carrito tiene el mismo producto en dos líneas, de 2 y de 5 unidades
- **THEN** se alista una sola línea de 7 unidades

#### Scenario: Servicio en el pedido
- **WHEN** el carrito incluye un servicio o un producto que no se guarda en bodega
- **THEN** no se alista y el usuario ve "N línea(s) del pedido no se alistan porque no se guardan en bodega"

### Requirement: La bodega va por su código de negocio
El selector de bodega SHALL listar las bodegas de la empresa que no estén desactivadas (una bodega sin marca de activa cuenta como activa), SHALL enviar el código de negocio de la bodega y NEVER su id interno, y SHALL sugerir la bodega con la que se vendió el pedido si sigue en la lista.

#### Scenario: Bodega del pedido
- **WHEN** el pedido se vendió desde BOD-002 y esa bodega está activa
- **THEN** el selector llega con BOD-002 elegida

### Requirement: Solo se inicia el alistamiento de pedidos en un estado que lo permite
IF el pedido está entregado, cerrado, despachado, cancelado o en cualquier estado posterior al alistamiento, THEN el front SHALL deshabilitar "Iniciar Picking" y SHALL explicar el motivo con el estado en palabras claras.

#### Scenario: Pedido entregado
- **WHEN** el usuario abre un pedido entregado que no tiene alistamiento
- **THEN** ve "Este pedido está en «Entregado» y ya no se puede alistar" y el botón queda deshabilitado

### Requirement: Antes de completar se avisa que se descuenta inventario
WHEN el usuario pulsa "Completar Picking", el front SHALL pedir confirmación diciendo cuántos productos y unidades se recolectan, de qué pedido, y que Katuq descuenta esas unidades del inventario de la bodega. Solo con "Sí, completar" se envía la petición.

#### Scenario: Cancelar la confirmación
- **WHEN** el usuario elige "Todavía no"
- **THEN** no se envía nada y el alistamiento sigue como estaba

### Requirement: "Nuevo picking" elige un pedido
WHEN el usuario entra a "Nuevo Picking", el front SHALL mostrar los pedidos pendientes para elegir uno y SHALL llevarlo a la pantalla de ese pedido. Si el pedido no aparece, SHALL indicar que se busca por su número en la lista.

#### Scenario: Elegir pedido
- **WHEN** el usuario elige el pedido FLO-000001 y pulsa "Continuar"
- **THEN** llega a la pantalla del pedido FLO-000001

#### Scenario: Nuevo picking no trae número de pedido
- **WHEN** el usuario pulsa "Nuevo Picking" en la lista y llega a la dirección `picking/nuevo`, que no lleva número de pedido
- **THEN** ve la lista para elegir el pedido y no se le pide al servidor ningún pedido llamado "undefined" ni aparece el aviso "No encontramos ese pedido"

### Requirement: Los errores se explican sin jerga
Todo error que vea el comercio SHALL decir qué pasó y qué hacer, SHALL nombrar el pedido y el producto, y SHALL NOT mostrar identificadores internos, códigos, textos del servidor ni términos técnicos. IF el interceptor de la aplicación ya avisó (sin conexión, sesión vencida, permisos, cuenta en solo lectura, función apagada para la empresa), THEN la pantalla SHALL NOT repetir el aviso.

#### Scenario: Sin existencias
- **WHEN** al iniciar, un producto tiene menos existencias de las que pide el pedido
- **THEN** el aviso dice "«Rosa roja»: hay 2 y el pedido pide 5", nombra la bodega, explica que al vender un pedido Katuq ya descuenta sus unidades del inventario y termina con "No cambies el inventario por este aviso: elige otra bodega o escríbenos por soporte con el número del pedido"; NUNCA dice "corrige el inventario"

#### Scenario: Pedido que ya se alistó
- **WHEN** el servidor responde que el pedido ya está alistado
- **THEN** el aviso dice "Ese pedido ya se alistó. Recarga la página para ver cómo quedó."

#### Scenario: Falla el servidor al completar
- **WHEN** el servidor responde un error inesperado al completar
- **THEN** el aviso dice "No pudimos terminar el alistamiento del pedido FLO-000001. Recarga la página para ver en qué estado quedó; si sigue igual, escríbenos por soporte con el número del pedido", sin el texto técnico del servidor

#### Scenario: Pedido de otra empresa o inexistente
- **WHEN** el servidor responde que no encuentra el pedido
- **THEN** el aviso dice "No encontramos ese pedido en tu empresa. Vuelve a la lista y ábrelo de nuevo"
