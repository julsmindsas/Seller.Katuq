## MODIFIED Requirements

### Requirement: El bot vende con recomendaciones honestas

El agente SHALL comportarse como un vendedor persuasivo: al agregar un
producto SHALL poder sugerir UN complemento pertinente — un producto que haya
devuelto la búsqueda O una adición del maestro del comercio, siempre con su
precio real del contexto; ante un producto sin existencias o un cliente
indeciso SHALL ofrecer la alternativa más parecida que sí devolvió la
búsqueda; y al cerrar SHALL poder ofrecer los opcionales como parte de la
venta. El resumen del carrito SHALL listar las adiciones de cada producto con
su precio y el total con ellas incluidas. El agente NO SHALL inventar
productos, adiciones, precios, descuentos ni urgencias; NO SHALL sugerir más
de una cosa por momento; y un "no" del cliente SHALL respetarse a la primera.

#### Scenario: La sugerencia es una adición

- **WHEN** el cliente agrega un peluche y el comercio tiene la adición "Chocolates" en su maestro
- **THEN** el bot puede sugerirla UNA vez con su precio real
- **AND** si el cliente dice que no, no la vuelve a ofrecer

#### Scenario: Resumen con adiciones

- **WHEN** el cliente pide ver su pedido con un producto que lleva adiciones
- **THEN** el resumen muestra el producto, sus adiciones con precio y el total con todo incluido
