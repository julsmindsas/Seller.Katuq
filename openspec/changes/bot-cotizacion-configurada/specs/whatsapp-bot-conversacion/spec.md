## MODIFIED Requirements

### Requirement: El cierre exige dirección confirmada y resumen consistente

Antes de pedir el cierre de un pedido, el agente SHALL haber confirmado la
forma de entrega y la fecha de entrega (validadas por el backend contra los
maestros del comercio), y con entrega a domicilio SHALL haber confirmado además
dirección y ciudad. El resumen del carrito SHALL listar producto, cantidad,
precio unitario y total con el mismo formato en toda la conversación, e
incluir la entrega y la fecha acordadas. La configuración capturada SHALL
sobrevivir entre turnos en la sesión del bot — no se repregunta lo ya
respondido.

#### Scenario: Cierre con entrega configurada

- **WHEN** el cliente confirma que quiere cerrar el pedido
- **THEN** el bot repite el resumen completo: productos, total, forma de entrega, fecha y (si es domicilio) dirección y ciudad
- **AND** si falta la forma o la fecha, las pide antes de cerrar

#### Scenario: La conversación se corta y vuelve

- **WHEN** el cliente ya había dicho "domicilio el viernes" y vuelve a escribir horas después
- **THEN** el bot no vuelve a preguntar la entrega ni la fecha — están en la sesión

## ADDED Requirements

### Requirement: El bot vende con recomendaciones honestas

El agente SHALL comportarse como un vendedor persuasivo: al agregar un
producto SHALL poder sugerir UN complemento pertinente que haya devuelto la
búsqueda del catálogo; ante un producto sin existencias o un cliente indeciso
SHALL ofrecer la alternativa más parecida que sí devolvió la búsqueda; y al
cerrar SHALL poder ofrecer los opcionales (dedicatoria, por ejemplo) como
parte de la venta. El agente NO SHALL inventar productos, precios, descuentos
ni urgencias; NO SHALL sugerir más de una cosa por momento; y un "no" del
cliente SHALL respetarse a la primera, sin volver a ofrecer lo rechazado en
la conversación.

#### Scenario: Complemento pertinente

- **WHEN** el cliente agrega un peluche para regalo
- **THEN** el bot puede sugerir UNA cosa que combine (ej. la tarjeta con dedicatoria o un producto relacionado que la búsqueda devolvió, con su precio real)
- **AND** si el cliente dice que no, no vuelve a ofrecerlo

#### Scenario: Sin existencias

- **WHEN** el producto que quiere el cliente no tiene existencias
- **THEN** el bot lo dice honesto y ofrece la alternativa más parecida que SÍ devolvió la búsqueda, con su precio
- **AND** jamás promete reposición ni fechas que no conoce

#### Scenario: Nada de presión inventada

- **WHEN** el bot recomienda
- **THEN** no usa urgencias falsas ni descuentos que no existen; "queda poquito" solo si las existencias reales lo dicen
