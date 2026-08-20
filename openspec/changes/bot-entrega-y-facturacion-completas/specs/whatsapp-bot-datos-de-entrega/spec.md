## ADDED Requirements

### Requirement: El bot pregunta a dónde va el domicilio

Cuando la entrega sea a domicilio, el bot SHALL acordar la DIRECCIÓN y la
CIUDAD antes de cerrar, y NO SHALL cerrar sin ellas. Si el cliente ya está
registrado, el bot SHALL repetirle la dirección que el sistema tiene y esperar
su confirmación en vez de asumirla. El bot PUEDE pedir, sin insistir, el
barrio o las indicaciones para llegar y quién recibe con su teléfono; si el
cliente no los da, el pedido igual se cierra.

#### Scenario: Cliente nuevo elige domicilio

- **WHEN** el cliente pide domicilio y no tenemos su dirección
- **THEN** el bot le pregunta la dirección y la ciudad antes de cerrar
- **AND** no registra el pedido hasta tenerlas

#### Scenario: Cliente registrado elige domicilio

- **WHEN** el cliente ya tiene dirección registrada y pide domicilio
- **THEN** el bot le repite esa dirección y le pide que confirme si es ahí

#### Scenario: Recoge en tienda

- **WHEN** el cliente prefiere recoger en tienda
- **THEN** el bot NO le pregunta dirección ni ciudad de entrega

### Requirement: El bot ofrece los datos de facturación una vez

El bot SHALL preguntar una sola vez si la factura va a nombre del cliente o de
otra persona o empresa. Si va a otra, SHALL capturar el nombre o razón social,
el tipo y número de documento y el correo. Si el cliente no quiere darlos, el
bot NO SHALL repreguntar y el pedido SHALL cerrarse igual.

#### Scenario: Factura a otro nombre

- **WHEN** el cliente dice que la factura va a nombre de su empresa
- **THEN** el bot le pide razón social, documento y correo, y los deja anotados

#### Scenario: El cliente no quiere dar datos de factura

- **WHEN** el cliente dice que no necesita factura o no responde a eso
- **THEN** el bot sigue y cierra el pedido sin volver a preguntar
