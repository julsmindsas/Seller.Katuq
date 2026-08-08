# inventory-ledger-rollout

Encendido gobernado del ledger transaccional de inventario ya desplegado (D-153), sin código contable nuevo.

## ADDED Requirements

### Requirement: Sombra observable antes de cualquier promoción
CUANDO un origen (osmosis, ajuste manual, traslado, fulfillment, pedido) esté en modo `shadow` para una empresa, el sistema DEBERÁ (SHALL) calcular el efecto que el ledger habría aplicado, SIN escribir saldo ni movimientos, Y DEBERÁ (SHALL) dejar por corrida un resumen agregado en `inventory_audit` (examinados, coincidirían, divergirían, delta neto, bloqueados y causa) sin exponer detalle de producto.

#### Scenario: corrida sombra limpia
- DADO OMS con `inventoryLedgerMode=shadow`
- CUANDO corre un ajuste manual legacy
- ENTONCES el saldo lo escribe el camino legacy de siempre Y queda un resumen sombra en `inventory_audit` con `wouldChange`/`unchanged`.

#### Scenario: duplicado histórico no frena la operación
- DADO un par producto+bodega aún ambiguo en otra empresa
- CUANDO la sombra lo encuentra
- ENTONCES lo reporta como `blocked: AMBIGUOUS_INVENTORY_IDENTITY` Y el escritor legacy continúa.

### Requirement: Promoción por origen con umbral y reversa por bandera
La promoción de un origen a `transactional` DEBERÁ (SHALL) hacerse por empresa y por ORIGEN (`companyConfig.inventoryLedgerModes[origen]`), SOLO tras N corridas sombra consecutivas sin divergencias no explicadas de ese origen, Y la reversa DEBERÁ (SHALL) ser volver la bandera a `legacy` sin despliegue de código.

**Precisión de auditoría (2026-08-06, sesión inventario-roadmap):** la granularidad POR BODEGA solo existe en el camino de Osmosis/Cereza (`inventoryLedgerWarehouseCodes` en su config); para manual/traslados/pedidos el gate real es empresa+origen. Extender canario por bodega a esos orígenes sería código nuevo y queda FUERA de esta fase.

#### Scenario: orden de promoción
- La secuencia canónica es: ajustes manuales → traslados → fulfillment (setTo) → pedidos. No se promueve un origen si el anterior no lleva al menos 3 días transaccional estable.

#### Scenario: transaccional no cae a legacy en caliente
- DADO un origen en `transactional`
- CUANDO una operación del ledger falla
- ENTONCES queda reintentable con su `operationKey` Y NUNCA se ejecuta el escritor legacy para esa misma operación (anti doble-mano).

### Requirement: Frontera de escritura con identidad canónica obligatoria
CUANDO cualquier camino (legacy o transaccional) cree un movimiento de inventario, el sistema DEBERÁ (SHALL) rechazar la escritura si `idBodega` no es un código de negocio existente de la empresa (p. ej. tiene forma de doc ID) o si el producto no resuelve a un docId canónico, registrando el rechazo en `inventory_audit`.

#### Scenario: regresión del bug histórico
- CUANDO un escritor intenta `idBodega="geGoyUJby5TtiDHbIetq"`
- ENTONCES la escritura falla con causa clara Y no nace un movimiento huérfano (el defecto de los 1.906 no puede reintroducirse).

### Requirement: Las bodegas con historia no se borran
CUANDO se intente eliminar una bodega que tenga stock distinto de cero o al menos un movimiento histórico, el sistema DEBERÁ (SHALL) impedirlo y ofrecer archivado (inactiva, visible en históricos), evitando nuevos huérfanos como BOD-009/010/011.

#### Scenario: bodega con historia
- DADO BOD-003 con 5.190 movimientos
- CUANDO un admin intenta eliminarla
- ENTONCES recibe el motivo y la opción de archivar; nada se borra.

### Requirement: Remates de datos con el método probado
El drenaje de duplicados de Café Escobar (5 filas / 58 uds) DEBERÁ (SHALL) usar el método D-151 (valor = el mayor del par, consolidado en el doc canónico, transacción por par, respaldo previo con manifiesto, dry-run primero), Y la limpieza del campo muerto `bodegasAsociadas` en `channels` DEBERÁ (SHALL) verificar antes que ningún código lo lea.

#### Scenario: drenaje de Café Escobar
- DADO el dry-run del consolidador para CAFE ESCOBAR mostrando 5 filas sobrantes
- CUANDO Daniel aprueba y se aplica
- ENTONCES cada par queda con un solo doc canónico con el valor mayor, las pre-imágenes quedan respaldadas con manifiesto Y la verificación posterior reporta 0 pares duplicados y 0 cambios en los valores que ven las pantallas.
