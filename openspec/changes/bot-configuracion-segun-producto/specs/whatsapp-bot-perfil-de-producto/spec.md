## ADDED Requirements

### Requirement: El bot pregunta solo lo que el producto declara

El sistema SHALL leer de cada producto del carrito su `procesoComercial` y
SHALL informarle al agente qué acepta ese producto: fecha de entrega,
adiciones, tarjeta, variables, comentarios. El agente NO SHALL preguntar ni
ofrecer nada que el producto no acepte. Un producto sin `procesoComercial` o
con la configuración desactivada SHALL tratarse como que no requiere nada.

#### Scenario: Producto simple

- **WHEN** el cliente compra un producto que no acepta adiciones ni lleva tarjeta ni calendario
- **THEN** el bot no le ofrece adiciones, no le pide dedicatoria y no le pide fecha
- **AND** puede cerrar el pedido apenas confirme lo que lleva

#### Scenario: Producto que sí lleva tarjeta y adiciones

- **WHEN** el producto acepta adiciones y lleva tarjeta
- **THEN** el bot ofrece las adiciones del comercio con su precio y pregunta por la dedicatoria

### Requirement: El cierre exige fecha solo si el producto la necesita

La forma y la fecha de entrega SHALL exigirse para cerrar únicamente cuando
algún producto del carrito lleve calendario. Si ninguno lo lleva, el pedido
SHALL poder cerrarse sin ellas y el bot NO SHALL pedirlas.

#### Scenario: Carrito sin productos con calendario

- **WHEN** el cliente dice que quiere cerrar y ningún producto del carrito lleva calendario
- **THEN** el pedido se registra sin fecha de entrega, sin preguntar por ella

#### Scenario: Un producto del carrito sí lleva calendario

- **WHEN** al menos un producto del carrito lleva calendario
- **THEN** el bot acuerda forma y fecha antes de cerrar, como hasta ahora

### Requirement: Las variables del producto se preguntan y son obligatorias

El bot SHALL preguntar las variables que declare un producto (talla, color u
otras) ofreciendo sus opciones reales, y NO SHALL cerrar el pedido hasta que
estén elegidas. Lo elegido SHALL guardarse por el mecanismo nativo de
preferencias del ítem; NO SHALL crearse un campo nuevo de variante.

#### Scenario: Camiseta con tallas

- **WHEN** el producto declara la variable "talla" con opciones S, M y L
- **THEN** el bot pregunta la talla ofreciendo esas tres opciones
- **AND** no cierra el pedido hasta que el cliente elija una

#### Scenario: Variables ilegibles

- **WHEN** la definición de variables del producto no se puede interpretar
- **THEN** el producto se trata como sin variables, la venta continúa y queda el registro para revisión
