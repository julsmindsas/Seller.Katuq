# Delta: purchasing

## ADDED Requirements

### Requirement: Proveedor con identidad propia
WHEN se crea una orden de compra, THE system SHALL permitir referenciar un proveedor del maestro y SHALL conservar las órdenes anteriores que solo tienen el nombre en texto.

#### Scenario: Orden con proveedor del maestro
- **GIVEN** un proveedor registrado
- **WHEN** se crea una orden para él
- **THEN** la orden queda ligada a ese proveedor y aparece en su historial de compras

#### Scenario: Orden vieja con texto libre
- **GIVEN** una orden creada antes del maestro
- **WHEN** se consulta
- **THEN** sigue mostrando su proveedor en texto y puede vincularse después sin perder datos

### Requirement: El costo del producto se alimenta de la compra
WHEN se recibe mercancía contra una orden, THE system SHALL registrar el costo unitario de esa compra con su fecha, proveedor y orden de origen.

#### Scenario: Primera compra de un producto sin costo
- **GIVEN** un producto sin costo registrado
- **WHEN** se recibe una compra con costo unitario
- **THEN** el producto queda con ese costo y el valorizado deja de ignorarlo

#### Scenario: El costo cambia
- **GIVEN** un producto con costo anterior
- **WHEN** llega una compra con otro costo
- **THEN** queda registrado el nuevo con su origen, y el anterior sigue consultable

### Requirement: La captura de costo no es una operación de inventario
THE system SHALL escribir el costo del producto únicamente desde el dominio de compras, y el dominio de inventario SHALL NOT escribir productos ni precios.

#### Scenario: Ajuste de inventario
- **WHEN** se ajusta el stock de un producto
- **THEN** ningún precio ni costo del producto cambia

### Requirement: Saldo por proveedor
THE system SHALL mostrar, por proveedor, cuánto se pidió, cuánto se recibió y cuánto se facturó.

#### Scenario: Orden recibida sin facturar
- **GIVEN** una orden recibida completa y sin factura registrada
- **WHEN** se consulta el saldo del proveedor
- **THEN** esa orden aparece como recibida y pendiente de facturar
