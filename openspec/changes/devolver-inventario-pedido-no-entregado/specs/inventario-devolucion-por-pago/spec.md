## MODIFIED Requirements

### Requirement: Devolución de inventario al cancelar el pago

Cuando el pago de un pedido cambia a Cancelado, Precancelado o Rechazado desde un
estado que no lo era, el sistema SHALL devolver a la bodega de cada salida
original las unidades descontadas por el pedido, una sola vez, si la mercancía
no ha salido o si quien cancela confirma que volvió a la bodega.

#### Scenario: Pedido sin despachar
- **WHEN** el pago pasa a Cancelado y el pedido está antes de En despacho
- **THEN** el sistema devuelve el inventario, sin preguntar

#### Scenario: Pedido despachado o entregado, sin confirmación
- **WHEN** el pago pasa a Cancelado, el pedido está En despacho, Despachado,
  Entregado o Cerrado y la solicitud no confirma que la mercancía volvió
- **THEN** el sistema NO devuelve inventario (comportamiento del ticket 1035)

#### Scenario: Pedido despachado o entregado que volvió a la bodega
- **WHEN** el pago pasa a Cancelado, el pedido está En despacho, Despachado,
  Entregado o Cerrado y quien cancela confirma "el producto volvió a la bodega"
- **THEN** el sistema devuelve el inventario a la bodega de cada salida original
- **AND** el movimiento de devolución registra quién lo confirmó

#### Scenario: Pedido ya devuelto
- **WHEN** el pedido ya tiene un movimiento de devolución
- **THEN** el sistema no devuelve otra vez, aunque llegue la confirmación

## ADDED Requirements

### Requirement: Pregunta al cancelar el pago de un pedido despachado

Al cambiar el pago a Cancelado, Precancelado o Rechazado de un pedido En
despacho, Despachado, Entregado o Cerrado, el Seller SHALL preguntar si el
producto volvió a la bodega antes de guardar, con dos respuestas: "Sí, volvió" y
"No, el cliente lo tiene".

#### Scenario: El comercio responde
- **WHEN** el usuario elige una respuesta
- **THEN** el cambio de pago se guarda y la respuesta viaja con él

#### Scenario: El comercio cierra la pregunta
- **WHEN** el usuario cierra la pregunta sin responder
- **THEN** el estado de pago no cambia
