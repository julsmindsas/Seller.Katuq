## ADDED Requirements

### Requirement: El bot pregunta la entrega con las opciones reales del comercio

Antes de cerrar, el bot SHALL preguntar si el pedido es a domicilio o lo
recogen, ofreciendo las formas de entrega del maestro del comercio, y SHALL
preguntar la fecha de entrega. El backend SHALL validar la forma contra el
maestro y la fecha como real y futura; lo inválido se repregunta y nunca llega
a la cotización. El valor del domicilio NO SHALL prometerse — lo confirma el
asesor.

#### Scenario: Cliente pide domicilio con fecha

- **WHEN** el cliente dice "domicilio para el 20 de diciembre"
- **THEN** el bot confirma la forma (una del maestro del comercio) y la fecha
- **AND** la cotización sale con `formaEntrega` y `fechaEntrega` en la configuración de cada producto, con el mismo formato de venta asistida

#### Scenario: Fecha en el pasado o inventada

- **WHEN** el agente anota una fecha que ya pasó o que no se puede interpretar
- **THEN** el backend la descarta y el bot vuelve a preguntar la fecha
- **AND** la cotización no se cierra sin fecha válida

#### Scenario: Comercio sin maestro de formas de entrega

- **WHEN** el comercio no tiene formas de entrega configuradas
- **THEN** el bot pregunta en genérico (domicilio o recogen) y lo anota como texto en observaciones
- **AND** la venta no se bloquea por el maestro vacío

### Requirement: Método de pago, dedicatoria y facturación se ofrecen sin insistir

El bot SHALL ofrecer UNA vez elegir el método de pago (entre los del comercio),
agregar una dedicatoria para tarjeta y facturar a otro nombre; si el cliente no
quiere, SHALL seguir sin repreguntar. Lo elegido SHALL validarse server-side
(el pago contra el maestro `pagos`) y quedar en la cotización.

#### Scenario: Cliente elige cómo pagar y deja dedicatoria

- **WHEN** el cliente dice "pago por Nequi" y dicta un mensaje para la tarjeta
- **THEN** la cotización sale con el método de pago preferido y la dedicatoria en `configuracion.tarjetas`
- **AND** la nota del pedido los repite para que el asesor los vea de una

#### Scenario: Cliente no quiere nada opcional

- **WHEN** el cliente ignora o rechaza los opcionales
- **THEN** el bot cierra igual con entrega y fecha, sin insistir

### Requirement: La cotización del bot es indistinguible de una hecha a mano

Los ítems SHALL salir con la forma canónica del carrito de venta asistida —
`configuracion` con `datosEntrega`, y `adiciones`/`preferencias`/`tarjetas`
SIEMPRE como arrays — de modo que el editor, el link público y la conversión a
pedido la traten igual que una cotización de venta asistida. El write-set del
bot NO SHALL cambiar: solo `cotizaciones` y su contador; los maestros son solo
lectura.

#### Scenario: El vendedor convierte la cotización del bot

- **WHEN** el vendedor convierte a pedido una cotización creada por el bot
- **THEN** el carrito de venta asistida carga con la fecha y forma de entrega ya puestas, la dedicatoria en tarjetas y sin errores de plantilla
