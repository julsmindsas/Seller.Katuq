# Delta: sale-availability-enforcement

## ADDED Requirements

### Requirement: La venta consulta el disponible antes de confirmarse
WHEN se va a confirmar una venta, THE system SHALL consultar el disponible del producto en su bodega —el saldo ya descontado, nunca un valor negativo— antes de crear la orden.

#### Scenario: Hay suficiente
- **GIVEN** un producto con disponible que cubre lo pedido
- **WHEN** se confirma la venta
- **THEN** la venta sigue su curso sin cambios respecto al comportamiento actual

#### Scenario: No alcanza y la empresa bloquea
- **GIVEN** una empresa con política de bloqueo
- **WHEN** el disponible no cubre lo pedido
- **THEN** la venta se detiene antes de crear la orden y el mensaje dice cuánto hay y cuánto falta, por producto

#### Scenario: No alcanza y la empresa avisa
- **GIVEN** una empresa con política de aviso con permiso
- **WHEN** el disponible no cubre lo pedido
- **THEN** la venta puede continuar con autorización explícita y queda constancia de quién autorizó vender sin respaldo

### Requirement: Sombra antes de bloquear
WHILE una empresa esté en modo sombra, THE system SHALL evaluar la regla sin aplicarla y SHALL registrar cada venta que habría bloqueado.

#### Scenario: Sombra encendida
- **GIVEN** una empresa en modo sombra
- **WHEN** una venta no tendría disponible suficiente
- **THEN** la venta NO se detiene
- **AND** queda registrado el caso con producto, bodega, pedido y faltante

### Requirement: Gobierno por empresa con apagado inmediato
THE system SHALL permitir encender, cambiar de política y apagar la validación por empresa sin desplegar código.

#### Scenario: Apagado de emergencia
- **GIVEN** una empresa con la validación encendida
- **WHEN** se apaga su bandera
- **THEN** la siguiente venta vuelve al comportamiento actual, sin reinicio ni despliegue

### Requirement: La validación no escribe
THE system SHALL tratar inventario, productos y precios como solo lectura durante la validación: puede leerlos para decidir y SHALL NOT escribirlos.

#### Scenario: Venta validada
- **GIVEN** cualquier política activa
- **WHEN** corre la validación
- **THEN** no se crea ni modifica ningún documento de inventario, producto o precio
