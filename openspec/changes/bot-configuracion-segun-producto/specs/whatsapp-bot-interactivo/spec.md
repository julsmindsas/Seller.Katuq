## MODIFIED Requirements

### Requirement: El bot ofrece opciones tocables cuando la elección es cerrada

El bot SHALL poder enviar las opciones como botones o lista de WhatsApp
cuando el cliente deba elegir entre un conjunto cerrado y corto: forma de
entrega, medio de pago, sí/no, un producto de la búsqueda, **una variable del
producto (talla, color), una adición, y la confirmación del cierre**. El
backend SHALL validar cada opción contra el maestro correspondiente, recortar
los títulos a los límites del proveedor y elegir el formato: hasta 3 opciones
como botones, de 4 a 10 como lista. Se SHALL cobrar como un solo mensaje.

#### Scenario: Elegir la talla con un toque

- **WHEN** el producto declara la variable "talla" con opciones S, M y L
- **THEN** el cliente recibe las tres como botones y al tocar una queda elegida sin interpretar texto

#### Scenario: Confirmar el cierre

- **WHEN** el bot va a registrar el pedido
- **THEN** puede ofrecer "Confirmar pedido" y "Sigo comprando" como botones

#### Scenario: Más opciones de las que caben en botones

- **WHEN** el comercio tiene seis medios de pago
- **THEN** las opciones salen como lista desplegable, no como botones
