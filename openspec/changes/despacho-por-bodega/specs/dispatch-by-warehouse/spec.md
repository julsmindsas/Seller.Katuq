# Delta: dispatch-by-warehouse

## ADDED Requirements

### Requirement: Partes de despacho solo cuando hay varias bodegas
CUANDO un pedido tenga líneas asignadas a más de una bodega, el sistema DEBERÁ (SHALL) crear una parte de despacho por bodega dentro del mismo pedido. CUANDO todas sus líneas estén en una bodega, el sistema NO DEBERÁ (MUST NOT) crear partes y el despacho DEBERÁ funcionar como hoy.

#### Scenario: Pedido de una sola bodega
- **GIVEN** un pedido con todas las líneas en BOD-003
- **WHEN** se despacha
- **THEN** no tiene partes y sigue el flujo actual sin cambios

#### Scenario: Pedido mezclado
- **GIVEN** ORE-001393 con líneas en una bodega Cereza, una Fullpi y BOD-102
- **WHEN** queda asignado
- **THEN** tiene tres partes, una por bodega, sin crear pedidos nuevos

### Requirement: El proveedor de la parte lo decide su bodega
El sistema DEBERÁ (SHALL) resolver el proveedor de cada parte desde la bodega: Cereza si tiene código de almacén de Cereza, el proveedor de fulfillment si lo tiene, y despacho manual si no tiene ninguno.

#### Scenario: Parte sin proveedor
- **GIVEN** la parte de BOD-102 (Distri Sex)
- **WHEN** el operador abre Despachos filtrando por esa bodega
- **THEN** la parte aparece en la cola con solo sus productos para despacharla como hoy

### Requirement: Envío automático por parte, una sola vez
CUANDO una parte de un proveedor automático cumpla las condiciones de envío de ese proveedor, el sistema DEBERÁ (SHALL) enviarla sola, con solo sus líneas y su bodega, y NO DEBERÁ (MUST NOT) enviarla dos veces aunque varios caminos lo intenten.

#### Scenario: Cereza recibe solo lo suyo
- **GIVEN** la parte Cereza de ORE-001393 lista para enviar
- **WHEN** se envía
- **THEN** Cereza recibe solo GCC411, con la bodega de esa parte, y la guarda de catálogo no la rechaza

#### Scenario: Doble disparo
- **GIVEN** la parte Fullpi ya enviada
- **WHEN** el barrido de Fullpi o un operador intentan enviarla otra vez
- **THEN** no se envía de nuevo y se informa que ya salió

### Requirement: Sin cobros dobles
El sistema DEBERÁ (SHALL) cargar el envío y el recaudo contraentrega solo a la parte principal (la de mayor valor) y enviar las demás como ya pagadas.

#### Scenario: Contraentrega mezclado
- **GIVEN** un pedido contraentrega de $423.278 con tres partes
- **WHEN** se envían las partes
- **THEN** solo la parte principal recauda $423.278 y las otras dos viajan con recaudo cero

### Requirement: Sin clics nuevos
El sistema NO DEBERÁ (MUST NOT) pedir al usuario pasos adicionales para despachar un pedido con partes; las partes de proveedores automáticos salen solas y las manuales aparecen en la cola de su bodega.

#### Scenario: Vista del pedido
- **GIVEN** un pedido con tres partes
- **WHEN** el operador lo abre en "Todos los pedidos"
- **THEN** ve un chip por bodega con su estado y ningún botón nuevo
