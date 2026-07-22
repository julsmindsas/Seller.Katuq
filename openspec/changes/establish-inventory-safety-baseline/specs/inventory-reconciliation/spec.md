# Delta: inventory-reconciliation

## ADDED Requirements

### Requirement: Conciliación aislada por empresa
THE system SHALL ejecutar toda conciliación dentro de una única empresa y SHALL NOT leer, agrupar ni exponer datos de otra empresa.

#### Scenario: Ejecución para OH MY STORE
- **GIVEN** una solicitud autenticada para OH MY STORE
- **WHEN** se ejecuta la conciliación
- **THEN** todos los saldos, productos, bodegas, pedidos, movimientos e integraciones del resultado pertenecen a OH MY STORE

#### Scenario: Identificador de otra empresa
- **GIVEN** un producto o bodega que pertenece a otra empresa
- **WHEN** aparece como referencia accidental en la entrada
- **THEN** el sistema lo rechaza o lo marca inválido sin incorporar sus datos

### Requirement: Identidad canónica producto–bodega
THE system SHALL normalizar la identidad del producto y SHALL validar que `idBodega` sea el código de negocio antes de consolidar cualquier saldo.

#### Scenario: Producto almacenado por referencia y por identificador
- **GIVEN** dos registros que representan el mismo producto y bodega, uno con referencia y otro con identificador canónico
- **WHEN** se construye la conciliación
- **THEN** ambos se presentan bajo una sola identidad lógica y no se suman como productos distintos

#### Scenario: Bodega almacenada con Firestore doc ID
- **GIVEN** un registro cuyo `idBodega` no coincide con ningún código de negocio de la empresa
- **WHEN** se construye la conciliación
- **THEN** el registro se marca como identificador de bodega inválido y no se mezcla con una bodega válida

### Requirement: Evidencias separadas y explicables
THE system SHALL mostrar por producto–bodega el saldo observado, los movimientos disponibles, el efecto esperado de pedidos y la evidencia externa disponible, sin compensar diferencias por suposición.

#### Scenario: Las cuatro evidencias coinciden
- **GIVEN** un producto–bodega con saldo, movimientos, pedidos y proveedor coherentes
- **WHEN** se concilia
- **THEN** el resultado indica coincidencia y conserva el detalle que permite reproducirla

#### Scenario: Pedido sin movimiento correspondiente
- **GIVEN** un pedido con efecto esperado de inventario pero sin movimiento trazable
- **WHEN** se concilia
- **THEN** el resultado identifica el pedido y el hueco, sin crear el movimiento ni cambiar el saldo

### Requirement: Confianza explícita
THE system SHALL clasificar cada resultado como confiable, ambiguo o incompleto y SHALL explicar la condición que impide certificarlo.

#### Scenario: Duplicados con cantidades distintas
- **GIVEN** varios registros normalizados para el mismo producto–bodega con cantidades diferentes
- **WHEN** se concilia
- **THEN** el resultado se marca ambiguo y conserva las cantidades de origen

#### Scenario: Historia anterior ausente
- **GIVEN** un saldo actual sin ancla ni movimientos completos para el período consultado
- **WHEN** se concilia
- **THEN** el resultado se marca incompleto y no se presenta como saldo histórico exacto

### Requirement: Diagnóstico sin efectos operativos
THE system MUST NOT modificar inventario, movimientos, pedidos, despachos, integraciones, configuración, productos, precios ni listas de precios al ejecutar una conciliación.

#### Scenario: Ejecución repetida
- **GIVEN** los mismos datos de origen
- **WHEN** la conciliación se ejecuta dos veces
- **THEN** produce resultados equivalentes y ninguna cantidad o estado operativo cambia

#### Scenario: Producto faltante o inconsistente
- **GIVEN** un registro de inventario cuyo producto no puede resolverse inequívocamente
- **WHEN** se ejecuta la conciliación
- **THEN** el sistema reporta la inconsistencia y no crea ni modifica el producto o sus precios
