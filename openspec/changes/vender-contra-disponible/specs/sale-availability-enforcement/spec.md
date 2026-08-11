# sale-availability-enforcement

Validación gobernada del disponible en el momento de vender.

## ADDED Requirements

### Requirement: la venta consulta el disponible antes de confirmarse
El sistema DEBE consultar el disponible del producto en su bodega antes de
confirmar una venta, entendiendo por disponible el saldo ya descontado y nunca
un valor negativo.

#### Scenario: hay suficiente
- **WHEN** el disponible cubre lo pedido
- **THEN** la venta sigue su curso sin cambios respecto a hoy

#### Scenario: no hay suficiente y la política es bloquear
- **WHEN** el disponible no cubre lo pedido y la empresa tiene política de bloqueo
- **THEN** la venta se detiene ANTES de crear la orden
- **AND** el mensaje dice cuánto hay y cuánto falta, por producto

#### Scenario: no hay suficiente y la política es avisar
- **WHEN** el disponible no cubre lo pedido y la empresa tiene política de aviso
- **THEN** la venta puede continuar con autorización explícita
- **AND** queda constancia de quién autorizó vender sin respaldo

### Requirement: modo sombra antes de bloquear
El sistema DEBE poder evaluar la regla sin aplicarla, registrando qué ventas
habría bloqueado.

#### Scenario: sombra encendida
- **WHEN** la empresa está en modo sombra
- **THEN** ninguna venta se detiene
- **AND** cada caso que se habría bloqueado queda registrado con producto,
  bodega, faltante y pedido

### Requirement: gobierno por empresa con apagado inmediato
El sistema DEBE permitir encender, cambiar de política y apagar por empresa sin
desplegar código.

#### Scenario: apagado de emergencia
- **WHEN** se apaga la bandera de una empresa
- **THEN** la venta vuelve al comportamiento actual en la siguiente operación,
  sin reinicio ni despliegue

### Requirement: la validación no escribe inventario
La validación DEBE ser de solo lectura sobre inventario, productos y precios.

#### Scenario: intento de escritura
- **WHEN** corre la validación
- **THEN** no se crea ni modifica ningún documento de inventario, producto o precio
