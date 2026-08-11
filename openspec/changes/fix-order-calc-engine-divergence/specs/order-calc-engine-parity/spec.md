# Delta: order-calc-engine-parity

## ADDED Requirements

### Requirement: Paridad matemática entre lo que ve el vendedor y lo persistido

EL sistema DEBERÁ (SHALL) garantizar que el total (subtotal, IVA, descuento, total) que ve el vendedor en venta asistida — carrito, checkout y el módulo de Pedidos inmediatamente después de crear el pedido — sea idéntico, hasta el redondeo de 2 decimales, al total que efectivamente queda persistido en el pedido creado por el backend, para cualquier combinación de descuento por línea, descuento global porcentual, cupón de valor fijo y cupón dirigido a categoría/producto que el sistema soporte hoy.

#### Scenario: Descuento de línea visible en carrito coincide con el pedido persistido
- **GIVEN** un vendedor arma un pedido en venta asistida con un producto que tiene 15% de descuento de línea
- **WHEN** completa el checkout y el pedido se crea
- **THEN** el total mostrado en el carrito antes de checkout, el total mostrado en checkout, y el total que muestra el módulo de Pedidos para ese pedido recién creado son el mismo número

#### Scenario: Cupón de valor fijo se refleja igual en pantalla y en lo persistido
- **GIVEN** un vendedor aplica un cupón de descuento de valor fijo (no porcentual) en el carrito
- **WHEN** completa el checkout y el pedido se crea
- **THEN** el descuento aplicado en el pedido persistido es el mismo monto que el vendedor vio aplicado en el carrito — no desaparece ni cambia de valor

#### Scenario: Pedido sin descuentos no cambia de comportamiento
- **GIVEN** un pedido de venta asistida sin ningún descuento de línea ni cupón
- **WHEN** se crea el pedido
- **THEN** el total en carrito, checkout, módulo de Pedidos y PDF es idéntico al comportamiento previo a este cambio (sin regresión)

### Requirement: El motor de cálculo activo en producción debe ser el mismo que el motor de referencia del backend

EL sistema DEBERÁ (SHALL) usar en producción, para calcular el total que ve el vendedor durante venta asistida, una implementación cuyo comportamiento haya sido verificado equivalente (mediante auditoría comparativa reproducible) al motor de cálculo real del backend (`orderCalculationService.js::calculateOrderTotals`) para todos los tipos de descuento soportados — no una implementación legacy que se sepa incompleta frente al backend.

#### Scenario: Auditoría comparativa confirma paridad antes de activar en producción
- **GIVEN** una batería de casos de prueba que cubre descuento de línea, descuento global, cupón de valor fijo, cupón dirigido y promoción automática
- **WHEN** se corre cada caso por el motor propuesto para producción y por el motor real del backend
- **THEN** ambos producen el mismo resultado (subtotal/IVA/descuento/total) para cada caso, documentado en una tabla de auditoría, antes de que el motor se active en producción
