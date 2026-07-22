# Delta: osmosis-order-push

## ADDED Requirements

### Requirement: Warehouse del payload resuelto por osmosisStorageCode
CUANDO se construye el payload de `createOrder` hacia Osmosis (push manual o flow), el sistema DEBERÁ (SHALL) resolver `items[].warehouse` buscando la bodega del pedido (`order.bodegaId`) en `warehouses` (filtrado por `company`) y usando su `osmosisStorageCode`.

#### Scenario: Bodega Cereza mapeada
- DADO un pedido con `bodegaId = "BOD-CEREZA-1A"` de una empresa cuyo warehouse tiene `osmosisStorageCode = "1A"`
- CUANDO se hace push a Osmosis
- ENTONCES `items[].warehouse` es `"1A"`

#### Scenario: Bodega sin storage code → default de config
- DADO un pedido con `bodegaId = "BOD-102"` (warehouse sin `osmosisStorageCode`)
- Y la config osmosis de la empresa tiene `bodegaCode = "BOD-CEREZA-1"` (cuyo storage es `"1"`)
- CUANDO se hace push
- ENTONCES `items[].warehouse` es `"1"` y se registra un warn (sin bloquear)

#### Scenario: Sin mapeo ni default (compat)
- DADO un pedido cuya bodega no está en `warehouses` y sin default en config
- CUANDO se hace push
- ENTONCES se usa la heurística legada (dígitos finales) como último recurso

### Requirement: carrier_code configurable por comercio
CUANDO la config `integration_configs/<company>_osmosis` tenga `config.defaultCarrierCode`, el payload de `createOrder` DEBERÁ (SHALL) incluir `carrier_code` con ese valor.

#### Scenario: Config presente
- DADO `defaultCarrierCode = "<código válido Cereza>"` en la config de OH MY STORE
- CUANDO se hace push de cualquier pedido
- ENTONCES el payload incluye `carrier_code` y Osmosis no rechaza por carrier

### Requirement: Fallo de push visible para el operador
CUANDO un push a Osmosis falle, el sistema DEBERÁ (SHALL) además de persistir `integrations.osmosis.error`, marcar el pedido con `requiereAtencionLogistica: true` y agregar una nota en `notasPedido.notasFacturacionPagos` con el motivo resumido.

#### Scenario: Rechazo por validación de Cereza
- DADO un push que Osmosis rechaza (422)
- CUANDO el operador abre la lista de pedidos
- ENTONCES el pedido muestra el ícono de atención con el motivo en el tooltip (UI existente, sin cambios de front)
