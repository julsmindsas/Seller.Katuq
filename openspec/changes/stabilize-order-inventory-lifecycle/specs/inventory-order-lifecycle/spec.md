# Delta: inventory-order-lifecycle

## ADDED Requirements

### Requirement: Venta Asistida compromete una sola vez
WHEN se crea un pedido válido en Venta Asistida, THE system SHALL aplicar una sola vez su efecto de inventario en la bodega seleccionada.

#### Scenario: Creación exitosa
- **GIVEN** un pedido nuevo con dos unidades inventariables
- **WHEN** se confirma la venta
- **THEN** Katuq reduce dos unidades y registra un único efecto trazable por línea

#### Scenario: Reintento de creación
- **GIVEN** el mismo pedido ya confirmado
- **WHEN** se repite la solicitud por timeout o retry
- **THEN** no se vuelve a reducir inventario

### Requirement: Despacho manual no repite inventario
WHEN un pedido de Venta Asistida se envía desde Logística, THE system MUST NOT aplicar de nuevo el efecto de inventario ya confirmado al crear la venta.

#### Scenario: Creación de guía
- **GIVEN** un pedido cuyo inventario ya fue comprometido
- **WHEN** el operador crea o reintenta su despacho
- **THEN** el saldo y los movimientos de venta no cambian

### Requirement: Shopify pagado activa inventario y envío automático
WHEN un pedido de Shopify llega con pago confirmado, THE system SHALL aplicar una sola vez su efecto de inventario y SHALL solicitar automáticamente su envío a Cereza cuando la empresa y bodega sean elegibles.

#### Scenario: Pedido pagado al crearse
- **GIVEN** un pedido nuevo, pagado y elegible para Cereza
- **WHEN** Katuq lo procesa
- **THEN** el pedido queda comprometido una vez y se solicita el push automático

### Requirement: Shopify no pagado espera la transición de pago
WHILE un pedido de Shopify no tenga pago confirmado, THE system SHALL conservarlo sin envío automático a Cereza y SHALL NOT aplicar todavía su efecto al saldo operativo de Katuq.

#### Scenario: Pedido creado sin pago
- **GIVEN** un pedido Shopify con estado de pago pendiente
- **WHEN** Katuq lo recibe
- **THEN** el pedido queda esperando pago, sin push automático y sin decremento Katuq

#### Scenario: Pago confirmado después
- **GIVEN** un pedido previamente pendiente y sin efecto de inventario aplicado
- **WHEN** Shopify informa el pago
- **THEN** Katuq aplica el efecto una vez y solicita el push automático

### Requirement: Push exitoso requiere ID externo
THE system SHALL considerar exitoso el envío a Cereza únicamente si la respuesta válida incluye un identificador externo que queda asociado al pedido.

#### Scenario: Rechazo del proveedor
- **GIVEN** un pedido pagado cuyo push es rechazado
- **WHEN** se procesa la respuesta
- **THEN** el pedido no queda marcado como despachado, conserva su compromiso y muestra atención con causa reintentable

#### Scenario: Respuesta de lote parcialmente exitosa
- **GIVEN** un lote donde un pedido tiene ID externo y otro falla
- **WHEN** Logística procesa el resultado
- **THEN** cada pedido conserva su resultado individual y el fallido no se presenta como enviado

### Requirement: Configuración incompleta falla cerrado
IF la bodega no tiene mapping válido para Cereza o falta un dato obligatorio del proveedor, THEN THE system SHALL bloquear el push sin adivinar valores y SHALL mostrar la causa al operador.

#### Scenario: Bodega sin storage code
- **GIVEN** un pedido en una bodega no mapeada a Cereza
- **WHEN** intenta enviarse
- **THEN** no se llama al proveedor y el pedido queda pendiente de atención

### Requirement: Cambios de cantidad aplican solo la diferencia
WHEN cambia la cantidad de una línea ya comprometida, THE system SHALL aplicar únicamente la diferencia frente al efecto confirmado.

#### Scenario: Cantidad aumenta de dos a tres
- **GIVEN** una línea con dos unidades ya comprometidas
- **WHEN** se actualiza a tres
- **THEN** Katuq compromete una unidad adicional una sola vez

#### Scenario: Cantidad disminuye de tres a una
- **GIVEN** una línea con tres unidades ya comprometidas
- **WHEN** se actualiza a una
- **THEN** Katuq libera dos unidades una sola vez

### Requirement: Cancelación o rechazo libera una sola vez
WHEN un pedido comprometido se cancela o rechaza, THE system SHALL restaurar exactamente el efecto previamente aplicado y SHALL enlazar la reversa con sus movimientos originales.

#### Scenario: Notificación repetida de cancelación
- **GIVEN** un pedido ya restaurado
- **WHEN** llega de nuevo la misma cancelación
- **THEN** no se suman unidades adicionales ni se crea otra reversa

### Requirement: El pedido no altera productos ni precios
THE system MUST NOT modificar el maestro de productos, variantes, listas de precios o valores de precio al comprometer, despachar, cambiar o liberar inventario de un pedido.

#### Scenario: Pedido contiene título y precio
- **GIVEN** una línea de pedido con copia del título y precio usados en la venta
- **WHEN** se procesa su efecto de inventario
- **THEN** esos datos se conservan como evidencia del pedido y no sobrescriben el producto ni sus listas de precios
