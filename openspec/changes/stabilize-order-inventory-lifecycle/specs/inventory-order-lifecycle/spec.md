# Delta: inventory-order-lifecycle

## ADDED Requirements

### Requirement: Venta Asistida compromete una sola vez al ser elegible
WHEN un pedido de Venta Asistida entra a `Pagado`, `Aprobado` o `PreAprobado`, THE system SHALL aplicar una sola vez su efecto de inventario en la bodega seleccionada.

#### Scenario: Creación exitosa
- **GIVEN** un pedido nuevo con dos unidades inventariables
- **WHEN** se confirma la venta en uno de los tres estados elegibles
- **THEN** Katuq reduce dos unidades y registra un único efecto trazable por línea

#### Scenario: Venta Asistida pendiente
- **GIVEN** un pedido nuevo de Venta Asistida con pago pendiente
- **WHEN** se guarda el pedido
- **THEN** Katuq no reduce inventario hasta que entre al conjunto elegible

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

### Requirement: Estados de pago elegibles activan inventario
WHEN un pedido de Shopify entra a `Pagado`, `Aprobado` o `PreAprobado`, THE system SHALL aplicar una sola vez su efecto de inventario y SHALL evaluar su envío automático a Cereza cuando la empresa y bodega sean elegibles.

#### Scenario: Pedido pagado al crearse
- **GIVEN** un pedido nuevo, pagado y elegible para Cereza
- **WHEN** Katuq lo procesa
- **THEN** el pedido queda comprometido una vez y se solicita el push automático

#### Scenario: Cambio entre estados elegibles
- **GIVEN** un pedido que ya comprometió inventario en `PreAprobado`
- **WHEN** pasa a `Aprobado` o `Pagado`
- **THEN** Katuq no vuelve a descontar ni repite el push

### Requirement: Todos los caminos Shopify convergen en la huella del pedido
WHEN el procesador Shopify y un `/flow` reciben el mismo pedido, THE system SHALL conciliar ambos contra `orders/{orderId}.inventoryEffect` y MUST NOT aplicar un delta de venta independiente desde el flow.

#### Scenario: Procesador seguido por flow activo
- **GIVEN** un pedido pagado cuyo procesador Shopify ya confirmó el efecto
- **WHEN** el flow `Shopify → Cereza` alcanza su nodo histórico de ajuste
- **THEN** el nodo observa la huella confirmada y no vuelve a descontar

#### Scenario: Flow reintenta después de una falla previa
- **GIVEN** un pedido elegible persistido cuya huella todavía no fue confirmada
- **WHEN** el flow vuelve a conciliarlo en modo transaccional
- **THEN** usa el pedido canónico completo y confirma un único efecto

### Requirement: Estados no elegibles esperan la transición de pago
WHILE un pedido de Shopify no esté en `Pagado`, `Aprobado` o `PreAprobado`, THE system SHALL conservarlo sin envío automático a Cereza y SHALL NOT aplicar su efecto al saldo operativo de Katuq.

#### Scenario: Pedido creado sin pago
- **GIVEN** un pedido Shopify con estado de pago pendiente
- **WHEN** Katuq lo recibe
- **THEN** el pedido queda esperando pago, sin push automático y sin decremento Katuq

#### Scenario: Pago confirmado después
- **GIVEN** un pedido previamente pendiente y sin efecto de inventario aplicado
- **WHEN** Shopify informa el pago
- **THEN** Katuq aplica el efecto una vez y solicita el push automático

### Requirement: El pago tardío usa Logística con rollout independiente
WHEN Shopify publica `orders/paid`, THE system SHALL conciliar primero el pedido e inventario y SHALL evaluar el despacho mediante `LogisticsManager`, con una huella logística distinta de `inventoryEffect`.

#### Scenario: Apagador ausente
- **GIVEN** una empresa sin `shopifyOrderLogisticsMode = active` ni su alias legacy activo
- **WHEN** llega `orders/paid`
- **THEN** el processor actualiza pedido e inventario pero no llama a Cereza

#### Scenario: Sombra logística
- **GIVEN** `shopifyOrderLogisticsMode = shadow`
- **WHEN** llega un pago tardío elegible
- **THEN** Katuq valida bodega y carrier sin llamada externa ni escritura de huella logística

#### Scenario: Dos eventos pagados concurrentes
- **GIVEN** `shopifyOrderLogisticsMode = active` y un pedido sin ID externo
- **WHEN** dos eventos intentan despacharlo al mismo tiempo
- **THEN** `orders/{orderId}.logisticsEffect.osmosis` concede una sola ejecución y el segundo observa la operación en curso

#### Scenario: Inventario y logística son independientes
- **GIVEN** un pedido cuyo inventario ya fue comprometido
- **WHEN** el push logístico falla o se reintenta
- **THEN** no se crea otro movimiento de inventario y la falla queda en atención logística

### Requirement: La cancelación Shopify converge con la guía Cereza
WHEN Shopify publica `orders/cancelled`, THE system SHALL conciliar primero la devolución de inventario y SHALL cancelar la guía Cereza mediante una huella logística independiente e idempotente.

#### Scenario: Pedido nunca enviado a Cereza
- **GIVEN** un pedido cancelado sin ID externo y sin push en curso
- **WHEN** se concilia su logística
- **THEN** no se inventa una guía ni se llama al proveedor

#### Scenario: Pedido ya enviado
- **GIVEN** un pedido cancelado con ID externo Cereza
- **WHEN** llega la cancelación o su retry
- **THEN** `orders/{orderId}.logisticsEffect.osmosisCancellation` concede una sola llamada y los retries observan el resultado

#### Scenario: Cancelación mientras Cereza crea la guía
- **GIVEN** un push con claim vigente y todavía sin ID externo
- **WHEN** Shopify cancela el pedido
- **THEN** Katuq registra `waiting_for_external_id`, conserva `Cancelado`, persiste el ID al recibirlo y solicita una sola cancelación externa

#### Scenario: Cereza rechaza la cancelación
- **GIVEN** un pedido ya cancelado en Katuq con guía externa
- **WHEN** Cereza no confirma la cancelación
- **THEN** el pedido permanece `Cancelado`, la devolución de inventario no se repite y Logística muestra una alerta reintentable

### Requirement: Perder elegibilidad libera el efecto aplicado
WHEN un pedido sale de `Pagado`, `Aprobado` o `PreAprobado` hacia un estado no elegible, THE system SHALL liberar una sola vez el efecto que realmente había aplicado.

#### Scenario: Pedido aprobado pasa a rechazado
- **GIVEN** un pedido aprobado con movimientos de compromiso confirmados
- **WHEN** su pago pasa a rechazado
- **THEN** Katuq devuelve exactamente las unidades comprometidas y enlaza la reversa a los movimientos originales

#### Scenario: Pedido pendiente se cancela
- **GIVEN** un pedido pendiente que nunca comprometió inventario
- **WHEN** se cancela o rechaza
- **THEN** Katuq no suma unidades ni crea una devolución ficticia

#### Scenario: Notificación repetida de pérdida de elegibilidad
- **GIVEN** un pedido cuyo efecto ya fue liberado
- **WHEN** se repite el evento de rechazo o cancelación
- **THEN** Katuq no vuelve a sumar inventario

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

#### Scenario: Solo cambia el precio
- **GIVEN** un pedido cuyo efecto ya está aplicado
- **WHEN** cambia únicamente un precio, descuento o lista de precios
- **THEN** la revisión de inventario no cambia y no se crea movimiento

### Requirement: La huella aplicada forma parte del pedido
THE system SHALL persistir la huella confirmada en `orders/{orderId}.inventoryEffect` dentro de la misma transacción que cambia saldo y crea movimiento.

#### Scenario: Falla una escritura
- **GIVEN** un pedido elegible listo para comprometer
- **WHEN** falla el saldo, el movimiento o la huella
- **THEN** la transacción revierte y ninguno de los tres queda aplicado

#### Scenario: Evento concurrente
- **GIVEN** dos procesamientos simultáneos del mismo pedido y revisión
- **WHEN** ambos intentan comprometer inventario
- **THEN** uno aplica el efecto y el otro observa la huella ya confirmada sin repetirlo

### Requirement: La bodega es el código vigente del maestro
THE system SHALL aceptar como `idBodega` cualquier código de negocio simple que exista de forma única para la empresa en `warehouses`, y MUST NOT usar el document ID de Firestore como código.

#### Scenario: Código numérico vigente
- **GIVEN** la bodega OMS con `idBodega = 005`
- **WHEN** un pedido elegible compromete inventario
- **THEN** el movimiento y el saldo conservan `005`

#### Scenario: Llega el document ID de Firestore
- **GIVEN** un valor que identifica el documento de la bodega pero no su `idBodega`
- **WHEN** se intenta aplicar el efecto
- **THEN** Katuq falla cerrado sin saldo, movimiento ni huella
