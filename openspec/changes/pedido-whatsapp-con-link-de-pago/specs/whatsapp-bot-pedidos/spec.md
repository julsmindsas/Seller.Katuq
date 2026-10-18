## MODIFIED Requirements

### Requirement: El bot cierra dejando una cotización en borrador

Cuando el cliente confirma el pedido y el pedido directo no aplica (capacidad `whatsapp-bot-pedido-directo`), el sistema SHALL registrar una cotización con el carrito, los datos del cliente, la marca de que la trajo el bot y el asesor KAI. La cotización nace en borrador y, al pasar a enviada con su enlace público, SHALL quedar con la fecha de envío y el cambio de estado en su historial, como las que envía una persona. En este cierre el sistema NO SHALL crear pedidos, NO SHALL reservar ni descontar inventario, NO SHALL consumir consecutivos de pedido y NO SHALL emitir facturas. El pedido directo es la única excepción y se rige por su propia capacidad.

#### Scenario: El cliente confirma el pedido

- **WHEN** el cliente confirma que quiere cerrar el pedido, el carrito tiene al menos un producto y el pedido directo no aplica
- **THEN** el sistema crea la cotización con los productos, las cantidades y los precios del carrito
- **AND** la cotización queda marcada como originada por el bot de WhatsApp, con el teléfono del cliente y el asesor KAI
- **AND** el bot le confirma al cliente que quedó registrado y que un asesor se lo confirma
- **AND** el sistema traspasa la conversación a un vendedor

#### Scenario: La cotización del bot cuenta para KAI

- **WHEN** el bot deja una cotización enviada
- **THEN** la cotización aparece con el asesor KAI en el filtro, la comparativa y los indicadores de Cotizaciones
- **AND** cuenta en «primera respuesta» y «ciclo de cierre» con su fecha de envío
- **AND** el enlace público no muestra a KAI como si fuera un correo

#### Scenario: Nada de inventario ni de pedidos se toca al cerrar con cotización

- **WHEN** el bot cierra una conversación creando la cotización
- **THEN** las existencias de todos los productos del carrito quedan exactamente iguales que antes
- **AND** no se crea ningún pedido ni se consume ningún consecutivo de pedido
- **AND** no se crea, edita ni desactiva ningún producto, variante, precio ni lista de precios

#### Scenario: El cliente confirma con el carrito vacío

- **WHEN** el cliente dice que quiere cerrar pero no ha confirmado ningún producto
- **THEN** el bot le pregunta qué quiere pedir
- **AND** no se crea ninguna cotización

#### Scenario: Falla la creación de la cotización

- **WHEN** el sistema no logra registrar la cotización
- **THEN** el bot le dice al cliente que un asesor lo contacta para confirmar el pedido
- **AND** el sistema traspasa la conversación a un vendedor dejando el carrito visible
- **AND** el bot no le dice al cliente que el pedido quedó registrado
