# Delta: order-line-return

## ADDED Requirements

### Requirement: Devolver una línea es idempotente
WHEN se pide devolver el inventario de un producto de un pedido, THE system SHALL devolver como máximo lo que ese pedido descontó de ese producto, sin importar cuántas veces se pida.

#### Scenario: Se pide dos veces
- **GIVEN** un producto que se descontó 1 unidad en un pedido
- **WHEN** se pide devolverlo dos veces
- **THEN** el saldo sube 1 unidad en total, no 2

### Requirement: Cada bodega recibe lo que de ella salió
WHEN un pedido descontó el mismo producto de varias bodegas, THE system SHALL devolver a cada bodega la cantidad que salió de ella.

#### Scenario: Descuento repartido
- **GIVEN** un pedido que descontó 3 unidades de BOD-001 y 2 de BOD-002
- **WHEN** se devuelve ese producto
- **THEN** BOD-001 sube 3 y BOD-002 sube 2

### Requirement: La cantidad a devolver no la decide el cliente
THE system SHALL acotar la devolución a lo descontado y aún no devuelto, e ignorar cualquier cantidad mayor que llegue en la petición.

#### Scenario: El cliente pide de más
- **GIVEN** un producto con 2 unidades descontadas
- **WHEN** llega una petición para devolver 50
- **THEN** se devuelven 2 y la respuesta dice cuánto se devolvió realmente

### Requirement: Sin fila de inventario no se escribe una devolución muda
IF no existe el documento de inventario del par producto+bodega, THEN THE system SHALL crear la fila canónica con el saldo devuelto o rechazar la operación, y SHALL NOT registrar un movimiento de devolución sin efecto en el saldo.

#### Scenario: Producto sin registro en esa bodega
- **GIVEN** un producto sin fila de inventario en la bodega del descuento
- **WHEN** se devuelve
- **THEN** el saldo y el movimiento quedan consistentes entre sí

### Requirement: Bajar la cantidad devuelve la diferencia
WHEN se edita un pedido reduciendo la cantidad de un producto sin quitarlo, THE system SHALL devolver la diferencia al inventario con su movimiento.

#### Scenario: De cinco a dos
- **GIVEN** una línea con 5 unidades descontadas
- **WHEN** se edita a 2
- **THEN** vuelven 3 unidades a la bodega de la que salieron
