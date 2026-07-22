# Delta: provider-stock-ingestion

## ADDED Requirements

### Requirement: Snapshot externo identificado
WHEN un proveedor informa stock, THE system SHALL asociar cada cantidad con empresa, proveedor, producto normalizado, bodega mapeada y momento de observación.

#### Scenario: Stock Cereza para storage 1A
- **GIVEN** un snapshot de OH MY STORE para un producto conocido y storage `1A`
- **WHEN** Katuq lo procesa
- **THEN** la observación queda asociada únicamente a la bodega OMS cuyo mapping externo es `1A`

### Requirement: Código externo desconocido falla cerrado
IF un producto o código de bodega externo no tiene mapping inequívoco dentro de la empresa, THEN THE system SHALL registrar la inconsistencia y SHALL NOT aplicar la cantidad a una bodega por defecto.

#### Scenario: Storage no configurado
- **GIVEN** un snapshot con un storage desconocido
- **WHEN** se procesa
- **THEN** ninguna cantidad operativa cambia y la ejecución reporta el ítem pendiente

### Requirement: Proyección en sombra antes de activación
WHILE la empresa esté en modo sombra, THE system SHALL calcular físico observado, compromisos locales no reconocidos y disponibilidad propuesta sin modificar el saldo operativo.

#### Scenario: Venta local aún no reconocida
- **GIVEN** un snapshot físico de 10 y un compromiso local de 2 aún no reconocido por el proveedor
- **WHEN** se calcula en sombra
- **THEN** la disponibilidad propuesta es 8 y `inventory.cantidad` permanece sin cambios por esa propuesta

### Requirement: Snapshot no borra compromisos silenciosamente
THE system MUST NOT aumentar la disponibilidad operativa a partir de un snapshot externo si ello desconoce compromisos locales pendientes sin una evidencia explícita de reconocimiento.

#### Scenario: Foto externa repite cantidad anterior a la venta
- **GIVEN** una venta local comprometida y un snapshot del proveedor que aún no la refleja
- **WHEN** se reconcilian
- **THEN** la unidad vendida no reaparece como disponible

### Requirement: Procesamiento idempotente
WHEN se recibe de nuevo el mismo snapshot o evento externo, THE system SHALL producir el mismo resultado sin duplicar movimientos ni efectos.

#### Scenario: Reintento del proveedor
- **GIVEN** una observación ya procesada con la misma identidad externa
- **WHEN** el proveedor la reenvía
- **THEN** no se crea un segundo efecto de inventario

### Requirement: Resultado de sincronización demostrable
THE system SHALL diferenciar una ejecución con trabajo, un no-op legítimo, una configuración incompleta y un fallo.

#### Scenario: Handler sin implementación
- **GIVEN** un cron cuyo handler no ejecuta ninguna lectura o escritura real
- **WHEN** corre
- **THEN** no se reporta como sincronización exitosa

#### Scenario: No había cambios
- **GIVEN** un rango examinado completamente sin diferencias
- **WHEN** termina la ejecución
- **THEN** se reporta no-op con conteos y alcance examinados

### Requirement: Ingestión separada del maestro y los precios
THE system MUST NOT crear ni modificar productos, variantes, categorías, imágenes, precios o listas de precios al ingerir stock de un proveedor.

#### Scenario: SKU externo sin producto Katuq
- **GIVEN** una observación de stock cuyo SKU no tiene producto inequívoco en Katuq
- **WHEN** se procesa
- **THEN** la observación queda pendiente y no se crea un producto ni se importa su precio

#### Scenario: Proveedor incluye datos comerciales adicionales
- **GIVEN** un payload de stock que también contiene nombre o precio
- **WHEN** se procesa como inventario
- **THEN** esos campos no sobrescriben el maestro ni las listas de precios
