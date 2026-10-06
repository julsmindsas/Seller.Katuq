# Delta: order-status-aggregation

## ADDED Requirements

### Requirement: El estado del pedido sale de sus partes
CUANDO un pedido tenga partes de despacho, el sistema DEBERÁ (SHALL) calcular su estado de proceso como el menos avanzado de sus partes, sin importar qué proveedor, pantalla o integración reporte el cambio.

#### Scenario: Una parte sale antes
- **GIVEN** un pedido con dos partes, una despachada y otra para despachar
- **WHEN** se consulta el pedido
- **THEN** el pedido sigue "Para despachar" y la parte despachada se ve como despachada

#### Scenario: Todas entregadas
- **GIVEN** un pedido con tres partes y las tres entregadas
- **WHEN** llega la última confirmación de entrega
- **THEN** el pedido pasa a "Entregado"

### Requirement: Un aviso al cliente por evento del pedido
El sistema DEBERÁ (SHALL) notificar al cliente solo cuando cambie el estado del pedido, no cuando cambie una parte.

#### Scenario: Despacho escalonado
- **GIVEN** un pedido con dos partes que salen en días distintos
- **WHEN** sale la primera
- **THEN** el cliente no recibe "Despachado"; lo recibe una sola vez cuando sale la segunda

### Requirement: Una parte cancelada no cancela el pedido
CUANDO un proveedor cancele una parte, el sistema NO DEBERÁ (MUST NOT) cancelar el pedido; DEBERÁ marcarlo para atención con el motivo "parte cancelada" y la bodega afectada.

#### Scenario: Cereza cancela su parte
- **GIVEN** un pedido con partes Cereza y Fullpi
- **WHEN** Cereza reporta cancelada su parte
- **THEN** el pedido no queda cancelado, la parte Fullpi sigue su curso y el pedido muestra el aviso de atención

### Requirement: Sin retrocesos de estado
El sistema NO DEBERÁ (MUST NOT) retroceder el estado de una parte ni del pedido por un reporte atrasado o repetido de un proveedor.

#### Scenario: Webhook atrasado
- **GIVEN** una parte ya entregada
- **WHEN** llega un reporte viejo de "en despacho"
- **THEN** la parte y el pedido conservan su estado
