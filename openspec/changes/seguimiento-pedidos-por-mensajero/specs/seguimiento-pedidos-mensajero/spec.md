## Purpose

En el mapa de Despachos, saber qué pedidos lleva cada mensajero, también los independientes, sin que un comercio vea a quien no lleva un pedido suyo.

## ADDED Requirements

### Requirement: Pedidos de cada mensajero
El panel «Mensajeros» SHALL listar, bajo cada mensajero, los pedidos del comercio que siguen en sus manos (empacado, para despachar, en despacho o en camino) con número, cliente y estado, mostrando los 6 primeros y «+N más». El pedido al que el mensajero tocó «Navegar» MUST resaltarse. La ficha del mensajero en el mapa SHALL traer una fila «Pedidos». La lista MUST incluir los pedidos que aún no tienen ubicación en el mapa.

#### Scenario: Mensajero con tres pedidos
- **WHEN** un mensajero lleva tres pedidos del comercio y uno ya está entregado
- **THEN** su fila lista solo los tres que sigue llevando

#### Scenario: Pedido sin ubicar
- **WHEN** un pedido asignado a un mensajero todavía no tiene punto en el mapa
- **THEN** igual aparece en la lista de ese mensajero

### Requirement: Cómo se une un pedido con un mensajero
Un mensajero de empresa SHALL unirse con sus pedidos por nombre, armando la clave con la misma regla de la app. Un mensajero independiente MUST unirse por el id de su ficha (`transportadorId` del pedido), nunca por nombre. Un pedido tomado por un independiente MUST NOT contarse como de un mensajero de empresa con el mismo nombre.

#### Scenario: Dos independientes con el mismo nombre
- **WHEN** dos independientes llamados igual publican su ubicación y solo uno lleva un pedido del comercio
- **THEN** el mapa del comercio muestra solo a ese, con sus pedidos

### Requirement: Independientes en el mapa del comercio
Un mensajero independiente SHALL verse en el mapa de un comercio solo mientras lleve un pedido de ese comercio. Al entregarlo o soltarlo MUST dejar de verse. La clave con la que publica su ubicación MUST incluir el id de su ficha.

#### Scenario: Independiente sin pedidos del comercio
- **WHEN** un independiente en línea no lleva ningún pedido del comercio
- **THEN** no aparece en el mapa de ese comercio

#### Scenario: Toma un pedido
- **WHEN** el comercio ofrece sus pedidos y un independiente toma uno
- **THEN** aparece en el mapa con el nombre que trae el pedido y ese pedido en su lista
