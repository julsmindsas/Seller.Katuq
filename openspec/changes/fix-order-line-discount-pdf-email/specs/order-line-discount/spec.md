# Delta: order-line-discount

## MODIFIED Requirements

### Requirement: Consumidores de solo-totales no requieren cambios
EL sistema DEBERÁ (SHALL) mantener sin modificaciones los consumidores que leen totales agregados del pedido (`totalDescuento`, `subtotal`, `totalImpuesto`) para reflejar correctamente un pedido con descuentos por línea, sin necesitar lógica nueva de descuento por línea en esos consumidores. Los consumidores que muestran precio o descuento **por línea/producto** (no solo el total agregado) SÍ DEBERÁN (SHALL) aplicar el descuento de línea a ese detalle.

#### Scenario: Email/comanda refleja el total correcto sin cambios de código
- **GIVEN** un pedido con descuentos de línea en varios productos
- **WHEN** se genera el email de confirmación o la comanda de producción
- **THEN** el total mostrado (`pedido.totalDescuento`, `pedido.subtotal`) es correcto, sin que el generador de HTML necesite conocer el concepto de descuento por línea

#### Scenario: PDF de orden de venta refleja el descuento por línea
- **GIVEN** un pedido con una línea que tiene 15% de descuento y otra sin descuento
- **WHEN** se genera el PDF de la orden de venta
- **THEN** el "P. Unit." y "Total" de la línea con descuento salen netos de ese 15%, y la suma de los "Total" por línea coincide con el subtotal y el total de descuento mostrados en la sección de totales del mismo PDF

## ADDED Requirements

### Requirement: Indicador visual del descuento de línea en el PDF de orden de venta
CUANDO una línea del carrito de un pedido tiene `descuentoLinea` mayor a 0, el PDF de la orden de venta DEBERÁ (SHALL) mostrar un indicador visual del porcentaje de descuento junto al precio unitario de esa línea.

#### Scenario: Badge de descuento visible en el PDF
- **GIVEN** una línea del pedido con `descuentoLinea = 15`
- **WHEN** se renderiza el PDF de la orden de venta
- **THEN** se muestra un indicador "-15%" junto al precio unitario de esa línea

#### Scenario: Sin indicador cuando no hay descuento de línea
- **GIVEN** una línea del pedido sin `descuentoLinea` (undefined o 0)
- **WHEN** se renderiza el PDF de la orden de venta
- **THEN** no se muestra ningún indicador de descuento para esa línea
