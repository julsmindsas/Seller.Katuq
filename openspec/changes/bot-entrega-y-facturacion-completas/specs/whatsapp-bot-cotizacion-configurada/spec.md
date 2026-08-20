## MODIFIED Requirements

### Requirement: La cotización del bot lleva la entrega y la facturación estructuradas

La cotización creada por el bot SHALL incluir los campos `envio` y
`facturacion` con la MISMA forma que produce venta asistida, para que al
convertirse en pedido los datos existan sin que nadie los vuelva a teclear.
Los campos que el bot no preguntó SHALL ir vacíos, NUNCA con valores
inventados. La nota legible del pedido SHALL mantenerse además de la
estructura.

#### Scenario: Pedido a domicilio

- **WHEN** el bot cierra un pedido a domicilio con dirección y ciudad acordadas
- **THEN** la cotización lleva `envio.direccionEntrega` y `envio.ciudad` con lo que dijo el cliente
- **AND** los campos que no se preguntaron (zona de cobro, país, código postal) van vacíos, no adivinados

#### Scenario: Pedido para recoger

- **WHEN** el bot cierra un pedido de recogida en tienda
- **THEN** la cotización lleva el `envio` de recogida con la misma forma que arma venta asistida

#### Scenario: Factura a nombre de una empresa

- **WHEN** el cliente pidió la factura a nombre de otra empresa
- **THEN** la cotización lleva `facturacion` con su razón social, documento y correo
