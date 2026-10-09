## ADDED Requirements

### Requirement: Write-set cerrado del alistamiento
El alistamiento SHALL escribir únicamente en `picking`, `packing`, `inventory`, `inventoryMovement` y `orders`, más la sincronización de existencias a los canales (Shopify: cantidad de la ubicación; WooCommerce: cantidad en stock) y su fila de auditoría. NEVER SHALL escribir en `products`, variantes, categorías, imágenes, precio base, precios por tipo de cliente ni listas de precios.

#### Scenario: Producto, variantes, precio y listas de precios permanecen sin cambios
- **WHEN** se inicia y se completa un picking y un packing de un pedido
- **THEN** los documentos de `products` quedan idénticos y ninguna escritura del recorrido apunta a esa colección

### Requirement: Qué escribe cada paso
El sistema SHALL escribir, en cada paso, exactamente lo siguiente:
- **Iniciar picking:** en una sola transacción, `picking` (nuevo) y el estado del pedido a `EnPicking`; después, `inventoryMovement` (sin producto ni cantidad). No toca `inventory`.
- **Completar picking:** en una transacción, el descuento de `inventory.cantidad` por lo recolectado y el cierre del `picking`; después, `inventoryMovement` (sin producto ni cantidad), el estado del pedido a `ListoParaPacking` y la sincronización a canales.
- **Iniciar y completar packing:** `packing`, `inventoryMovement` y el estado del pedido (`EnPacking`, `ListoParaDespacho`). Nunca `inventory`.
- **Consultar el estado:** nada.

#### Scenario: Iniciar no mueve inventario
- **WHEN** se inicia un picking con stock suficiente
- **THEN** `inventory` queda igual y se escriben solo `picking`, `inventoryMovement` y `orders`, y el picking y el estado del pedido se escriben en la misma transacción

#### Scenario: Packing nunca mueve inventario
- **WHEN** se inicia y se completa un packing
- **THEN** ninguna escritura apunta a `inventory`

### Requirement: La bodega es el código de negocio
El sistema SHALL aceptar y registrar en `picking`, `packing` e `inventoryMovement` el código de negocio de la bodega (por ejemplo BOD-001), validado contra las bodegas de la empresa. IF el valor recibido es el id interno de Firestore de una bodega, THEN el sistema SHALL responder "Bodega no encontrada" y no escribir nada.

#### Scenario: Id interno de Firestore
- **WHEN** se inicia un picking con el id interno de una bodega en lugar de su código
- **THEN** responde 404 "Bodega no encontrada" y no hay escrituras

### Requirement: Completar descuenta una sola vez por picking
IF un picking ya está completado o cancelado, THEN el sistema SHALL rechazar completarlo de nuevo y SHALL NOT descontar inventario. El sistema SHALL comprobar ese estado dentro de la transacción que descuenta, de modo que dos llamadas simultáneas descuenten una sola vez.

#### Scenario: Completar dos veces
- **WHEN** se intenta completar un picking que ya está completado
- **THEN** responde 400 y el inventario queda como estaba

#### Scenario: Dos llamadas a la vez
- **WHEN** dos llamadas completan al mismo tiempo el mismo picking de 2 unidades de un producto que tiene 10 en la bodega
- **THEN** una responde 200 y la otra 400, el inventario queda en 8 (no en 6) y se registra un solo movimiento de completado

### Requirement: Un pedido tiene un solo alistamiento activo y no se alista dos veces
IF el pedido ya tiene un alistamiento activo, o está en `ListoParaPacking`, `EnPacking`, `ListoParaDespacho`, `Entregado` o `Cerrado`, THEN el sistema SHALL rechazar iniciar el picking con 400 sin escribir nada. El sistema SHALL repetir esas verificaciones dentro de la transacción que crea el alistamiento, de modo que dos llamadas simultáneas creen uno solo.

#### Scenario: Pedido ya alistado
- **WHEN** se inicia el picking de un pedido que está en `ListoParaPacking`, `EnPacking` o `ListoParaDespacho`
- **THEN** responde 400 "ya alistado" y no hay escrituras

#### Scenario: Dos llamadas a la vez
- **WHEN** dos llamadas inician al mismo tiempo el picking del mismo pedido
- **THEN** una responde 200 y la otra 400, queda un solo alistamiento activo y un solo movimiento de inicio

#### Scenario: Alistamiento cancelado
- **WHEN** el pedido está en `EnPicking` pero su alistamiento anterior quedó cancelado
- **THEN** se puede iniciar uno nuevo

### Requirement: Límites conocidos, fijados hasta que se decidan
Mientras no se apruebe el cambio que resuelve los riesgos R1, R2 y R10 de `design.md`, las pruebas SHALL fijar el comportamiento actual, de modo que cambiarlo sea una decisión consciente:
- completar descuenta de `inventory` lo recolectado, aunque la venta ya haya descontado al crear el pedido (R1);
- WHEN el picking tiene dos o más productos con cantidad recolectada, completar responde error y no escribe nada (R2);
- iniciar compara las existencias de la bodega con lo que pide el pedido, aunque la venta ya haya descontado esas unidades (R10).

#### Scenario: Completar con dos productos
- **WHEN** se completa un picking con dos productos recolectados
- **THEN** el servidor responde 500, no se descuenta inventario, el picking sigue "iniciado" y el pedido no cambia de estado

#### Scenario: La venta se llevó las últimas unidades
- **WHEN** el pedido pide 2 unidades de un producto y la bodega tiene 0 porque la venta las descontó
- **THEN** iniciar responde 400 con el detalle "Disponible: 0, Solicitado: 2" y no escribe nada

#### Scenario: Cambiar la semántica de stock
- **WHEN** alguien modifica lo que completar escribe en `inventory`
- **THEN** la prueba de contrato del write-set falla y obliga a aprobar el cambio en una propuesta aparte
