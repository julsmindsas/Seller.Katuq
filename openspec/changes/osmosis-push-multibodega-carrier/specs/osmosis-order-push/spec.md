# Delta: osmosis-order-push

## ADDED Requirements

### Requirement: Warehouse del payload resuelto por osmosisStorageCode
CUANDO se construye el payload de `createOrder` hacia Osmosis (push manual o flow), el sistema DEBERÁ (SHALL) resolver `items[].warehouse` buscando la bodega del pedido (`order.bodegaId`) en `warehouses` (filtrado por `company`) y usando su `osmosisStorageCode`.

#### Scenario: Bodega Cereza mapeada
- DADO un pedido con `bodegaId = "BOD-CEREZA-1A"` de una empresa cuyo warehouse tiene `osmosisStorageCode = "1A"`
- CUANDO se hace push a Osmosis
- ENTONCES `items[].warehouse` es `"1A"`

#### Scenario: Bodega sin storage code
- **GIVEN** un pedido con `bodegaId = "BOD-102"` cuya bodega no tiene `osmosisStorageCode`
- **WHEN** se intenta hacer push
- **THEN** el sistema no llama a Osmosis, no sustituye la bodega por un default y deja atención visible

### Requirement: carrier_code obligatorio y configurable por comercio
CUANDO una empresa envía pedidos a Osmosis, el sistema DEBERÁ (SHALL) resolver `carrier_code` desde su configuración antes de llamar al proveedor.

#### Scenario: Config presente
- DADO `defaultCarrierCode = "<código válido Cereza>"` en la config de OH MY STORE
- CUANDO se hace push de cualquier pedido
- ENTONCES el payload incluye `carrier_code` y Osmosis no rechaza por carrier

#### Scenario: Config ausente
- **GIVEN** una empresa sin `defaultCarrierCode` válido
- **WHEN** se intenta hacer push
- **THEN** el sistema no llama a Osmosis y deja el pedido pendiente con la causa visible

### Requirement: Fallo de push visible para el operador
CUANDO un push a Osmosis falle, el sistema DEBERÁ (SHALL) además de persistir `integrations.osmosis.error`, marcar el pedido con `requiereAtencionLogistica: true` y agregar una nota en `notasPedido.notasFacturacionPagos` con el motivo resumido.

#### Scenario: Rechazo por validación de Cereza
- DADO un push que Osmosis rechaza (422)
- CUANDO el operador abre la lista de pedidos
- ENTONCES el pedido muestra el ícono de atención con el motivo en el tooltip y no queda marcado como despachado

### Requirement: Push aislado de productos y precios
EL sistema NO DEBERÁ (MUST NOT) modificar productos, variantes, precios o listas de precios al preparar, enviar o reintentar un pedido a Osmosis.

#### Scenario: Línea contiene datos comerciales
- **GIVEN** un pedido con título y precio copiados al momento de la venta
- **WHEN** se envía a Osmosis
- **THEN** esos datos se usan únicamente en el payload del pedido y no sobrescriben maestros ni precios
