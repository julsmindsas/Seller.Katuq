> **[21-oct] Nueva, pendiente de aprobación.** Ampliación de D-496 por D-518 (F4-40·2 «WhatsApp y web», F4-40·3, ·6 y ·7). Modifica el asesor KAI de la tienda de F4-27 (D-469, cd `R4HukFBWSj9PuhCjgQdQ`). Ticket F4-40, cd `PrDNIoDwRacCPQVcHmx1`.

## ADDED Requirements

### Requirement: En la web, KAI no agrega al carrito lo que se cotiza

Fuente: punto 3 del ticket («cotizaciones… para productos cotizables (F2-43)»); F4-40·3; F2-43·6 (la compra de un cotizable se bloquea en el servidor).

WHERE KAI está activo en la tienda, WHEN KAI recomienda o el comprador le pide agregar un producto que el comercio marcó «Cotiza con un asesor», THE system SHALL ofrecer «Cotiza con un asesor», que abre la solicitud de cotización de ese producto. THE system SHALL NOT agregarlo al carrito.

#### Scenario: El comprador pide agregar un producto para cotizar

- **WHEN** el comprador escribe «agrégalo» sobre un producto que se cotiza
- **THEN** el carrito no cambia y KAI muestra el botón «Cotiza con un asesor» de ese producto

### Requirement: En la web, KAI informa políticas sin inventar

Fuente: punto 4 del ticket; F4-40·7.

WHERE KAI está activo en la tienda, WHEN el comprador pregunta por envíos, cambios, devoluciones, garantía o tiempo de entrega, KAI SHALL responder solo con las páginas de políticas publicadas de la tienda y con la garantía y el tiempo de entrega del producto. IF el dato no está, THEN KAI SHALL decirlo y ofrecer el WhatsApp del comercio. WHEN el comprador pregunta por un pedido suyo, KAI SHALL indicarle que escriba por WhatsApp al comercio, porque en la web no se sabe quién es. KAI SHALL NOT mostrar el estado de ningún pedido.

#### Scenario: ¿Dónde va mi pedido?

- **WHEN** un visitante pregunta por su pedido en la tienda
- **THEN** KAI no muestra estados y le ofrece escribir por WhatsApp al comercio

#### Scenario: Garantía del producto

- **WHEN** el visitante pregunta por la garantía de un producto que la tiene escrita
- **THEN** KAI responde con ese texto, sin agregar condiciones

### Requirement: En la web, KAI tampoco descuenta

Fuente: F4-40·6.

THE system SHALL NOT permitir que KAI ofrezca ni prometa descuentos, rebajas o cupones en la tienda.

#### Scenario: «¿Tienes algún cupón?»

- **WHEN** el visitante pide un cupón
- **THEN** KAI no inventa ninguno ni promete descuentos

## Fuera de esta spec

Fuente: F4-40·2; crítica M10. En la web, KAI no tiene memoria del visitante ni hace seguimientos, porque la tienda no sabe quién es; el pedido, el pago y la recuperación de carritos son los de la tienda, sin cambios. La tabla de cobertura de `proposal.md` lo detalla ítem por ítem.
