## Purpose

Historias de usuario (ticket TX-34, cd `Es2985T0VnVBc95LqY2D`):
- Como comprador cuyo pago se cayó, quiero volver a intentarlo sin armar el carrito otra vez ni
  escribirle a la tienda.
- Como comprador con mala señal, quiero saber que algo falló y poder reintentar sin perder lo que
  había elegido.

Requisitos no funcionales: el reintento no crea otro pedido, no aparta otra vez el inventario y
no alarga la reserva; un pedido pagado nunca se cobra dos veces; ningún dato personal queda
guardado en el navegador. Toca pedidos y pagos: cada cambio va con su diff aprobado y pruebas de
caracterización antes del código. Los requisitos marcados **(provisional, Pn)** aplican la
recomendación de la pregunta Pn. Seguridad: ver revisión privada.

## ADDED Requirements

### Requirement: Reintentar un pago rechazado
WHEN el comprador vuelve de la pasarela a la página de confirmación y su pago fue rechazado o
anulado, WHILE la reserva del pedido sigue vigente, THE system SHALL mostrar «Tu pago no se
completó» con el número del pedido, un botón «Reintentar pago» que abre el pago **del mismo
pedido** con la misma reserva, y «Seguir comprando». THE system SHALL mostrar el botón solo a
quien llega con el regreso firmado de ese pedido. IF el pedido ya quedó pagado, THEN el reintento
SHALL llevar a la confirmación de pago y no SHALL abrir otro cobro.

Fuente: ticket TX-34, viñeta 5 («pago rechazado (reintentar sin perder el carrito)»); D-518
TX-34·3 («Botón "Reintentar pago" en `/gracias` que usa `/pagar` sobre el mismo pedido y la misma
reserva»); D-312 (`/pagar` y la reserva de 60 min); F2-41·5 (el mismo patrón para cuotas).

#### Scenario: Tarjeta rechazada
- **WHEN** Wompi rechaza la tarjeta y devuelve al comprador a la tienda
- **THEN** ve «Tu pago no se completó» y «Reintentar pago»
- **AND** al tocarlo paga el mismo pedido, sin que se cree otro ni cambie la reserva

#### Scenario: Pagó en otra pestaña
- **WHEN** el comprador ya pagó en otra pestaña y toca «Reintentar pago» en la primera
- **THEN** llega a «¡Pago confirmado!» y no a la pasarela

#### Scenario: Sin el regreso firmado
- **WHEN** alguien abre la confirmación de ese pedido escribiendo la dirección a mano
- **THEN** no ve «Reintentar pago» ni la promesa de un correo

### Requirement: Solo se promete el correo que sale
WHEN la confirmación de un pedido rechazado dice que el enlace para pagar llegó al correo, THE
system SHALL decirlo solo a quien llega con el regreso firmado y solo si ese correo ya salió o
el pedido es elegible para él (dejó correo y el comercio lo tiene encendido).

Fuente: crítica del 21-oct (el correo es el recordatorio único de los 20 a 55 minutos, que el
comercio puede apagar); F2-41 (solo lo promete si salió).

#### Scenario: Comercio con el recordatorio apagado
- **WHEN** el comercio apagó el correo de pago pendiente y el pago se rechaza
- **THEN** la confirmación no dice que le enviamos un enlace

### Requirement: Pedido sin pagar que no volvió a la confirmación
WHILE la reserva de un pedido creado en ese navegador sigue vigente y el pago no está aprobado,
THE system SHALL mostrar en cualquier página de la tienda «Tienes un pedido sin pagar» con un
acceso a pagarlo, que lleva a la confirmación de ese pedido con «Reintentar pago»
**(provisional, P15)**. El comprador SHALL poder cerrarlo.

Fuente: ticket TX-34, viñeta 5 («reintentar sin perder el carrito»); código del 21-oct (el
carrito se vacía antes de ir a la pasarela, `siteTienda.js:1138`); crítica del 21-oct.

#### Scenario: Volvió atrás desde la pasarela
- **WHEN** el comprador toca «atrás» en la pasarela y vuelve a la tienda con el carrito vacío
- **THEN** ve «Tienes un pedido sin pagar · Pagar» y desde ahí paga el mismo pedido

### Requirement: Pedido vencido y carrito recuperable
IF el comprador vuelve a la confirmación o al enlace de pago cuando la reserva ya venció o el
pedido se anuló, THEN THE system SHALL decir que el pedido venció y que los productos volvieron a
la tienda, y, WHERE ese navegador guardó el carrito al ir a pagar, ofrecer «Volver a armar mi
carrito» **(provisional, P15)**. El carrito recuperado SHALL revisar otra vez precios y
existencias como cualquier carrito.

Fuente: ticket TX-34, viñeta 5 («sin perder el carrito»); código del 21-oct (el carrito se vacía
antes de ir a la pasarela, y el carrito guardado de D-313 se cierra al comprar).

#### Scenario: Volver al día siguiente
- **WHEN** el comprador abre la confirmación de un pedido rechazado al día siguiente en el mismo
  celular
- **THEN** ve que venció y puede volver a armar el carrito con un toque

#### Scenario: Producto agotado entretanto
- **WHEN** uno de los productos se agotó mientras tanto
- **THEN** al confirmar, la tienda le dice que ese producto ya no está disponible, como con
  cualquier carrito, y no lo cobra

### Requirement: Error de red con «Reintentar»
IF falla la carga del catálogo, de una búsqueda, de un orden, de un filtro o el envío del pedido,
THEN THE system SHALL mostrar un aviso visible con «Reintentar» y SHALL conservar la búsqueda, los
filtros, la página y el carrito tal como estaban. Reintentar el envío del pedido SHALL NOT crear
un segundo pedido ni apartar otra vez. WHEN el comprador hace varias búsquedas seguidas, THE
system SHALL mostrar el resultado de la última.

Fuente: ticket TX-34, viñeta 5 («error de red»); código del 21-oct (el catálogo falla en
silencio y descarta la búsqueda si hay otra en curso).

#### Scenario: Sin señal en el catálogo
- **WHEN** el comprador filtra por «Ofertas» sin conexión
- **THEN** ve «No pudimos cargar los productos» con «Reintentar» y los productos de antes
- **AND** al volver la señal y tocar «Reintentar», ve las ofertas

#### Scenario: Sin señal al pagar
- **WHEN** el pedido no se puede enviar por falta de conexión
- **THEN** el carrito y los datos escritos siguen ahí y «Reintentar» lo envía sin volver a
  escribir

#### Scenario: La respuesta se perdió
- **WHEN** el pedido sí se creó pero la respuesta no llegó y el comprador toca «Reintentar»
- **THEN** recibe el mismo número de pedido, sin otro pedido, otra reserva ni otro descuento de
  inventario

### Requirement: Agotado con «Avísame» en celular
WHEN un producto está agotado, THE system SHALL mostrar «Agotado» y «Avísame cuando llegue», que
deja el contacto del comprador en el CRM del comercio como hoy, con su botón de 44 px y sin que la
barra fija lo tape.

Fuente: ticket TX-34, viñeta 5 («agotado ("avísame")»); comportamiento existente
(`POST /avisame`); F2-21 (el aviso automático al reabastecer quedó fuera).

#### Scenario: Agotado en la ficha a 360 px
- **WHEN** el comprador abre la ficha de un producto agotado a 360 px
- **THEN** ve «Avísame cuando llegue» completo y lo puede tocar
