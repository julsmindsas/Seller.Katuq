## ADDED Requirements

### Requirement: La prueba de aprobación solo la da la persona en la tarjeta
Para `update_order_status` (con aprobación) y `edit_order`, el servidor SHALL aplicar un cambio solo cuando la llamada viene de la acción de aprobar de la tarjeta del MCP. La prueba de aprobación SHALL NOT aparecer en el texto que lee el modelo ni ser un parámetro de las herramientas que el modelo ve. IF el modelo envía una prueba de aprobación por su cuenta, THEN el servidor SHALL NOT aplicar nada y SHALL decir que solo la persona aprueba en la tarjeta.

#### Scenario: El modelo reenvía el comprobante
- **WHEN** el modelo propone un cambio, obtiene de algún modo el comprobante y vuelve a llamar la herramienta con él
- **THEN** no se escribe nada, el pedido sigue igual y la respuesta dice que solo la persona aprueba en la tarjeta

#### Scenario: La persona aprueba en la tarjeta
- **WHEN** la persona aprueba en la tarjeta una propuesta vigente
- **THEN** el cambio se aplica por la misma operación de siempre, a nombre de la persona y con el motivo que ella escribió

#### Scenario: Un cliente sin pantallas
- **WHEN** el cliente no muestra tarjetas
- **THEN** la propuesta no se puede aprobar y el cambio se hace desde Katuq

### Requirement: La puerta de aprobación solo aplica herramientas de pedidos y no suma permisos
La herramienta de aprobación SHALL aplicar únicamente las herramientas de pedidos autorizadas y SHALL pasar por la misma puerta de ejecución, que exige empresa, permiso, rol o menú, empresa activa y bandera. El marcador de aprobación SHALL fijarlo el servidor y SHALL NOT poder venir del contexto de entrada ni de los argumentos.

#### Scenario: Herramienta no autorizada
- **WHEN** se pide aprobar con otra herramienta (por ejemplo `adjust_stock`)
- **THEN** se rechaza sin ejecutar nada

#### Scenario: Marcador falsificado
- **WHEN** una llamada normal trae en su contexto el marcador de aprobación en `true`
- **THEN** el servidor lo ignora y no aplica nada
