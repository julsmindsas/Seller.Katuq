## ADDED Requirements

### Requirement: El bot atiende los mensajes entrantes de WhatsApp

Cuando entra un mensaje de un cliente por WhatsApp a un comercio que tiene el bot encendido, el sistema SHALL atender la conversación automáticamente sin intervención humana, y SHALL hacerlo sin demorar la confirmación al proveedor de mensajería.

#### Scenario: Llega un mensaje y el bot contesta

- **WHEN** entra un mensaje de texto de un cliente a un comercio con el bot encendido y la conversación no está tomada por un vendedor
- **THEN** el sistema confirma la recepción al proveedor de mensajería en menos de 3 segundos, sin esperar a que el bot elabore la respuesta
- **AND** el bot responde al cliente en un mensaje de WhatsApp
- **AND** la respuesta queda registrada en el hilo del buzón igual que un mensaje escrito por una persona

#### Scenario: Llega un mensaje que no es texto

- **WHEN** el cliente manda una foto, un audio, un documento, una ubicación o cualquier contenido que no sea texto
- **THEN** el bot responde que por ahora solo entiende mensajes escritos
- **AND** el sistema traspasa la conversación a un vendedor

#### Scenario: El mensaje entra a una conversación que atiende un vendedor

- **WHEN** entra un mensaje de un cliente cuya conversación está tomada por un vendedor
- **THEN** el bot no responde
- **AND** el mensaje aparece en el buzón para que lo atienda el vendedor

### Requirement: El bot solo afirma lo que le devuelven los datos reales

El bot SHALL responder sobre productos, precios, existencias, clientes y pedidos anteriores únicamente con la información que le entregan las consultas al sistema. El bot NO SHALL inventar productos, precios, plazos de entrega, descuentos ni disponibilidad.

#### Scenario: El cliente pregunta por un producto que existe

- **WHEN** el cliente nombra un producto que está en el catálogo del comercio
- **THEN** el bot responde con el nombre, la referencia y el precio que devuelve la consulta al catálogo

#### Scenario: El cliente pregunta por un producto que no existe

- **WHEN** el cliente nombra algo que no aparece en el catálogo del comercio
- **THEN** el bot le dice que no lo tiene y le ofrece lo más parecido que sí esté en el catálogo, o le pide que lo describa de otra forma
- **AND** el bot no ofrece un producto que la consulta no devolvió

#### Scenario: El cliente pide más cantidad de la que hay

- **WHEN** el cliente pide una cantidad mayor a la existencia que devuelve la consulta de inventario
- **THEN** el bot le informa cuánto hay disponible y le pregunta si quiere llevar esa cantidad
- **AND** el bot no confirma la cantidad que no puede cumplir

#### Scenario: El cliente pregunta algo que el bot no puede resolver con datos

- **WHEN** el cliente pregunta por plazos de entrega, descuentos, formas de pago, garantías o cualquier cosa que las consultas no responden
- **THEN** el bot le dice que un asesor le confirma eso
- **AND** el sistema traspasa la conversación a un vendedor

### Requirement: El bot arma el carrito conversando

El bot SHALL ir acumulando en un carrito los productos y cantidades que el cliente confirma a lo largo de la conversación, y SHALL poder mostrarlo, corregirlo y totalizarlo cuando el cliente lo pida.

#### Scenario: El cliente agrega un producto

- **WHEN** el cliente confirma que quiere un producto y una cantidad
- **THEN** el sistema guarda ese producto y esa cantidad en el carrito de la conversación
- **AND** el bot le confirma al cliente qué quedó agregado

#### Scenario: El cliente cambia de opinión

- **WHEN** el cliente pide quitar un producto o cambiar una cantidad ya agregada
- **THEN** el sistema actualiza el carrito de la conversación
- **AND** el bot le confirma al cliente cómo quedó

#### Scenario: El cliente pregunta cómo va el pedido

- **WHEN** el cliente pide ver lo que lleva
- **THEN** el bot le lista los productos, las cantidades, los precios y el total

#### Scenario: El cliente vuelve al día siguiente

- **WHEN** el cliente escribe de nuevo y su carrito anterior sigue vigente
- **THEN** el bot retoma ese carrito en vez de empezar de cero

#### Scenario: El carrito queda abandonado

- **WHEN** pasa el plazo de vigencia sin que el cliente confirme ni escriba de nuevo
- **THEN** el sistema descarta el carrito de esa conversación

### Requirement: El bot reconoce al cliente por su teléfono

El bot SHALL intentar identificar al cliente con el teléfono desde el que escribe, para saludarlo por su nombre y reusar sus datos al cerrar. Si no lo reconoce, SHALL pedirle los datos mínimos antes de cerrar.

#### Scenario: El teléfono corresponde a un cliente registrado

- **WHEN** el teléfono desde el que escriben ya está registrado como cliente del comercio
- **THEN** el bot lo saluda por su nombre
- **AND** al cerrar usa los datos que ya están registrados sin volver a pedirlos

#### Scenario: El teléfono no corresponde a ningún cliente

- **WHEN** el teléfono no está registrado como cliente del comercio
- **THEN** el bot pide el nombre y la dirección de entrega antes de cerrar el pedido

#### Scenario: El cliente pide repetir su pedido anterior

- **WHEN** el cliente registrado pide lo mismo de la vez pasada
- **THEN** el bot le lista los productos de su último pedido y le pregunta si quiere ese mismo
- **AND** solo arma el carrito con esos productos si el cliente lo confirma

### Requirement: El bot cierra dejando una cotización en borrador

Cuando el cliente confirma el pedido, el sistema SHALL registrar una cotización en estado borrador con el carrito, los datos del cliente y la marca de que la trajo el bot. El sistema NO SHALL crear pedidos, NO SHALL reservar ni descontar inventario, NO SHALL consumir consecutivos de pedido y NO SHALL emitir facturas.

#### Scenario: El cliente confirma el pedido

- **WHEN** el cliente confirma que quiere cerrar el pedido y el carrito tiene al menos un producto
- **THEN** el sistema crea una cotización en estado borrador con los productos, las cantidades y los precios del carrito
- **AND** la cotización queda marcada como originada por el bot de WhatsApp, con el teléfono del cliente
- **AND** el bot le confirma al cliente que quedó registrado y que un asesor se lo confirma
- **AND** el sistema traspasa la conversación a un vendedor

#### Scenario: Nada de inventario ni de pedidos se toca al cerrar

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
