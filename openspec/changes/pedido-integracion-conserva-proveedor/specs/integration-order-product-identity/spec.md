# Delta: integration-order-product-identity

## ADDED Requirements

### Requirement: La línea de un pedido de integración lleva el proveedor del producto
CUANDO un flow resuelve el producto de una línea por su referencia, el sistema DEBERÁ (SHALL) copiar al producto embebido en la línea la identidad de proveedor que tenga el maestro del producto en `integrations`.

#### Scenario: Producto de Cereza que llega por Shopify
- **GIVEN** un pedido de Shopify con la referencia GCC411, cuyo producto en Katuq tiene `integrations.osmosis`
- **WHEN** el flow crea el pedido
- **THEN** la línea guardada tiene `producto.integrations.osmosis` y la guarda de Cereza la reconoce como producto de Cereza

#### Scenario: Producto sin proveedor externo
- **GIVEN** un producto propio del comercio sin `integrations` de proveedor
- **WHEN** el flow crea el pedido
- **THEN** la línea no inventa ningún proveedor y el pedido se crea igual que hoy

#### Scenario: Referencia que no existe en Katuq
- **GIVEN** una línea cuya referencia no se encuentra en el catálogo
- **WHEN** el flow crea el pedido
- **THEN** la línea queda como hoy (sin resolver) y el pedido no se bloquea

### Requirement: Reparación de pedidos abiertos con dry-run
CUANDO se repare la identidad de proveedor de pedidos de integración ya creados, el sistema DEBERÁ (SHALL) listar primero, sin escribir, cada pedido y línea que cambiaría, y solo escribir en una segunda corrida autorizada.

#### Scenario: Corrida de prueba
- **GIVEN** pedidos Shopify abiertos sin la identidad de proveedor en sus líneas
- **WHEN** se corre el script sin la bandera de aplicar
- **THEN** imprime los cambios previstos y no escribe nada

#### Scenario: Pedido ya despachado o cancelado
- **GIVEN** un pedido de integración despachado, entregado o cancelado
- **WHEN** corre la reparación
- **THEN** el pedido no se toca

### Requirement: Producto y precios intactos
EL sistema NO DEBERÁ (MUST NOT) crear, editar, activar o desactivar productos, variantes, precios, precios por tipo de cliente ni listas de precios al resolver la línea o al reparar pedidos.

#### Scenario: Contract test del write-set
- **GIVEN** la ejecución del nodo y del script con un catálogo de prueba
- **WHEN** se inspeccionan las escrituras
- **THEN** no hay ninguna escritura en `products`, catálogo, precios ni listas de precios
