# Delta: combo-management

## MODIFIED Requirements

### Requirement: Un combo se presenta en una sola línea y el comercial decide si lo abre
CUANDO un comercial agrega un combo a una cotización o al carrito de la venta asistida, el sistema DEBERÁ (SHALL) guardar una línea por producto (como en D-147) marcada con el combo al que pertenece, y DEBERÁ (SHALL) presentarlas en UNA sola fila con el nombre del combo y la suma de sus productos mientras el combo esté cerrado.

#### Scenario: Combo cerrado en la cotización
- **GIVEN** un combo de 3 productos con IVA 19%
- **WHEN** el comercial lo agrega a una cotización
- **THEN** el editor, la vista previa, el PDF y el enlace público muestran una sola fila con el nombre del combo, cantidad 1, IVA 19% y como subtotal la suma de los 3 productos
- **AND** el total de la cotización es el mismo que si los productos estuvieran por separado

#### Scenario: El comercial abre el combo
- **GIVEN** un combo cerrado en la cotización o en el carrito
- **WHEN** el comercial pulsa "Abrir combo"
- **THEN** cada producto se ve y se edita en su propia fila, también en los documentos, hasta que pulse "Cerrar combo"

#### Scenario: Cantidad y descuento del combo cerrado
- **GIVEN** un combo cerrado
- **WHEN** el comercial cambia la cantidad a 2 o pone un descuento del 10%
- **THEN** cada producto queda con sus unidades por combo × 2 y con 10% de descuento, y la fila muestra la nueva suma

#### Scenario: Productos con IVA distinto
- **GIVEN** un combo cuyos productos tienen tarifas de IVA distintas
- **THEN** la fila del combo muestra "Varios" como % de IVA y el valor del IVA es la suma exacta

#### Scenario: El combo llega al pedido como estaba
- **GIVEN** una cotización aceptada con un combo cerrado
- **WHEN** se convierte en pedido
- **THEN** el carrito, la orden de venta y el PDF/correo del pedido muestran el combo en una sola fila
- **AND** el pedido guarda una línea por producto: inventario descuenta y SIIGO factura cada producto como antes

### Requirement: Aislamiento de catálogo, inventario y sincronización externa (sin cambios)
EL sistema NO DEBERÁ (MUST NOT) crear un producto "combo", ni cambiar precios, inventario o facturación por presentar un combo en una sola línea.

#### Scenario: Productos y precios intactos
- **GIVEN** un combo presentado en una sola fila
- **THEN** los productos, sus precios, sus listas por tipo de cliente y sus existencias no cambian por esa presentación
