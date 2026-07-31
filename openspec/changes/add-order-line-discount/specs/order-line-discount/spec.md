# Delta: order-line-discount

## ADDED Requirements

### Requirement: Descuento por línea en el motor canónico de precios
CUANDO una línea del carrito tiene `descuentoLinea` (0-100) definido, el sistema DEBERÁ (SHALL) calcular el precio efectivo de esa línea componiendo multiplicativamente el descuento de línea con el descuento global del pedido (`porceDescuento`), sobre el precio ya resuelto por la jerarquía existente (manual → categoría → volumen → base), sin modificar esa jerarquía.

#### Scenario: Descuento de línea sin descuento global
- **GIVEN** un producto con precio base $100.000 sin IVA y `descuentoLinea = 15`
- **WHEN** se calcula el precio efectivo de la línea
- **THEN** el precio efectivo sin IVA es $85.000

#### Scenario: Descuento de línea compuesto con descuento global
- **GIVEN** un producto con precio base $100.000 sin IVA, `descuentoLinea = 15` en esa línea y `porceDescuento = 10` a nivel de pedido
- **WHEN** se calcula el precio efectivo de la línea
- **THEN** el precio efectivo sin IVA es $76.500 ($100.000 × 0.85 × 0.90)

#### Scenario: Sin descuento de línea, comportamiento actual intacto
- **GIVEN** un producto sin `descuentoLinea` definido (undefined)
- **WHEN** se calcula el precio de la línea
- **THEN** el resultado es idéntico al cálculo actual sin este cambio (default 0, aditivo)

### Requirement: Persistencia del precio efectivo sin sobreescribir el precio base
CUANDO se crea o edita un pedido con líneas que tienen descuento, el sistema DEBERÁ (SHALL) persistir el precio efectivo neto en un campo dedicado (`precioEfectivoSinIva`) más metadata de auditoría (`descuentoLineaPct`, `descuentoLineaMonto`), y NO DEBERÁ (MUST NOT) modificar los campos de precio base de la línea (`precioUnitarioSinIva`, `precioUnitarioConIva`, `precioUnitarioIva`).

#### Scenario: El precio base permanece reconstruible
- **GIVEN** un pedido creado con una línea que tiene 15% de descuento
- **WHEN** se consulta el pedido persistido
- **THEN** `precioUnitarioSinIva` de esa línea sigue mostrando el precio SIN descuento, y `precioEfectivoSinIva` muestra el precio CON descuento aplicado

### Requirement: El descuento de línea sobrevive la conversión de cotización a pedido
CUANDO se convierte una cotización aceptada con líneas que tienen `descuentoLinea` en un pedido de venta asistida, el sistema DEBERÁ (SHALL) preservar ese descuento en las líneas del carrito resultante.

#### Scenario: Conversión preserva el descuento de línea
- **GIVEN** una cotización aceptada con un ítem que tiene `descuentoLinea = 15`
- **WHEN** el usuario convierte la cotización a pedido
- **THEN** la línea correspondiente en el carrito de venta asistida conserva `descuentoLinea = 15`, y el precio mostrado en el carrito refleja ese descuento

### Requirement: Consumidores de solo-totales no requieren cambios
EL sistema DEBERÁ (SHALL) mantener sin modificaciones los consumidores que leen totales agregados del pedido (`totalDescuento`, `subtotal`, `totalImpuesto`) para reflejar correctamente un pedido con descuentos por línea, sin necesitar lógica nueva de descuento por línea en esos consumidores.

#### Scenario: Email/comanda refleja el total correcto sin cambios de código
- **GIVEN** un pedido con descuentos de línea en varios productos
- **WHEN** se genera el email de confirmación o la comanda de producción
- **THEN** el total mostrado (`pedido.totalDescuento`, `pedido.subtotal`) es correcto, sin que el generador de HTML necesite conocer el concepto de descuento por línea

### Requirement: Facturación electrónica SIIGO refleja el precio neto
CUANDO se emite una factura SIIGO para un pedido con descuentos por línea, el sistema DEBERÁ (SHALL) enviar el precio unitario ya neto de descuento (`precioEfectivoSinIva`) por línea, de forma que el total facturado coincida con el total del pedido.

#### Scenario: Total de factura SIIGO coincide con el total del pedido
- **GIVEN** un pedido con dos líneas, una con descuento de línea y otra sin él
- **WHEN** se genera la factura SIIGO
- **THEN** la suma de las líneas facturadas (precio neto × cantidad + IVA) coincide con `pedido.total`

### Requirement: Aislamiento de producto, precios y catálogo
EL sistema NO DEBERÁ (MUST NOT) modificar el producto maestro, sus variantes, catálogo, precio base, `preciosPorTipoCliente` ni listas de precios al aplicar un descuento de línea en un pedido.

#### Scenario: Descuento de línea no toca el maestro de producto
- **GIVEN** un producto con precio base y `preciosPorTipoCliente` definidos
- **WHEN** se crea un pedido con un descuento de línea sobre ese producto
- **THEN** el documento del producto permanece sin cambios; solo se modifica la línea del pedido (snapshot de venta)
