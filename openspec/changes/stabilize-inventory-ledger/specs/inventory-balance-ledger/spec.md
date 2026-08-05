# Delta: inventory-balance-ledger

## ADDED Requirements

### Requirement: Katuq conserva el saldo operativo
THE system SHALL guardar para cada empresa, producto y bodega una cantidad operativa canónica que consumen Venta Asistida y los demás canales internos.

#### Scenario: Consulta de existencias en Venta Asistida
- **GIVEN** un producto inventariable en una bodega válida
- **WHEN** Venta Asistida consulta su disponibilidad
- **THEN** obtiene la cantidad operativa almacenada por Katuq para esa identidad normalizada

### Requirement: Cambio de saldo con movimiento atómico
WHEN una operación cambia la cantidad, THE system SHALL confirmar el nuevo saldo y su movimiento en una sola unidad atómica, o SHALL confirmar ninguno.

#### Scenario: Falla al crear el movimiento
- **GIVEN** una operación válida cuyo movimiento no puede persistirse
- **WHEN** intenta confirmar la operación
- **THEN** el saldo permanece sin cambios y la operación reporta fallo

#### Scenario: Operación exitosa
- **GIVEN** una operación válida
- **WHEN** se confirma
- **THEN** el saldo y el movimiento muestran los mismos valores antes, delta y después

### Requirement: Motivo dentro del enum vigente
THE system SHALL registrar todo movimiento nuevo con un `reason` perteneciente exclusivamente al enum vigente: `sale`, `restock`, `manual_adjustment`, `damaged`, `transfer`, `shopify_sync`, `osmosis_sync`, `fullpi_sync` o `returned`.

#### Scenario: Motivo permitido
- **GIVEN** un ajuste con `reason = "manual_adjustment"`
- **WHEN** se confirma
- **THEN** el movimiento conserva exactamente ese motivo

#### Scenario: Texto libre como motivo
- **GIVEN** una operación con un motivo que no pertenece al enum
- **WHEN** intenta confirmar
- **THEN** el sistema la rechaza sin cambiar saldo ni crear movimiento

### Requirement: Campos mínimos trazables
THE system SHALL registrar en cada movimiento nuevo empresa, producto normalizado, business code de bodega, delta firmado, cantidad antes, cantidad después, dirección, motivo, fecha canónica, actor y referencia del efecto de negocio.

#### Scenario: Venta de dos unidades
- **GIVEN** un saldo de 10 y una venta válida de 2 unidades
- **WHEN** se confirma
- **THEN** el movimiento registra antes 10, delta -2, después 8, dirección de salida y `reason = "sale"`

### Requirement: Reintentos idempotentes
WHEN se repite la misma operación de negocio, THE system SHALL producir un solo efecto sobre el saldo y un solo movimiento.

#### Scenario: Webhook repetido
- **GIVEN** dos entregas del mismo evento con la misma clave de idempotencia
- **WHEN** ambas se procesan
- **THEN** solo la primera cambia el saldo y la segunda devuelve el resultado ya aplicado

### Requirement: Traslado indivisible entre bodegas
WHEN se confirma un traslado, THE system SHALL aplicar salida, ingreso y ambos movimientos como una sola operación atómica con `reason = "transfer"`.

#### Scenario: Falla el ingreso en destino
- **GIVEN** un traslado cuya escritura de destino falla
- **WHEN** intenta confirmarse
- **THEN** no cambia ni el origen ni el destino y no queda un movimiento parcial

### Requirement: Ledger operativo único
THE system SHALL escribir movimientos nuevos únicamente en `inventoryMovement` y SHALL tratar `inventoryProductHistory` como historia congelada de solo lectura.

#### Scenario: Analítica posterior al cambio
- **GIVEN** movimientos nuevos en el ledger operativo
- **WHEN** se calcula analítica de inventario
- **THEN** los incluye sin depender de nuevos registros en la colección legada

### Requirement: Rollout limitado a bodegas explícitas
THE system SHALL aplicar un escritor nuevo de inventario únicamente a business codes de bodega declarados para la empresa, o a todas las bodegas solo mediante una promoción total explícita. Un alcance ausente o contradictorio SHALL conservar el camino anterior.

#### Scenario: Canario de una bodega
- **GIVEN** un producto informado para dos bodegas y una allowlist que contiene solo una
- **WHEN** corre la sincronización en modo transaccional
- **THEN** únicamente la bodega autorizada usa saldo+movimiento atómico y la otra conserva el escritor anterior

#### Scenario: Modo transaccional sin alcance
- **GIVEN** una configuración transaccional sin allowlist y sin promoción total explícita
- **WHEN** se procesa stock
- **THEN** ninguna bodega usa el escritor nuevo y la falta de alcance queda observable

### Requirement: Compatibilidad histórica honesta
THE system SHALL tolerar los campos históricos conocidos al leer y SHALL identificar como incompleto cualquier movimiento que no pueda normalizarse con evidencia.

#### Scenario: Movimiento antiguo con fecha alternativa
- **GIVEN** un movimiento histórico con fecha legada válida
- **WHEN** se consulta el historial
- **THEN** aparece en el orden temporal correcto sin reescribir su documento

#### Scenario: Motivo histórico ambiguo
- **GIVEN** un movimiento cuyo texto no permite determinar un valor del enum
- **WHEN** se audita
- **THEN** queda marcado como motivo faltante y no recibe uno inventado

### Requirement: Independencia del maestro de productos y precios
THE system MUST NOT modificar productos, listas de precios, reglas de precio ni valores comerciales como consecuencia de registrar, ajustar, trasladar o restaurar inventario.

#### Scenario: Ajuste de cantidad
- **GIVEN** un producto con listas y precios configurados
- **WHEN** se confirma un ajuste de inventario
- **THEN** solo cambian el saldo y la evidencia de inventario permitida; el producto y todos sus precios permanecen iguales

#### Scenario: Producto no resoluble
- **GIVEN** una operación cuyo producto no puede normalizarse
- **WHEN** intenta confirmarse
- **THEN** la operación falla o queda pendiente sin crear ni editar el producto
