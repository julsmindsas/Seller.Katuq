## Purpose

Historias de usuario (ticket `7OaxPVn97s3dUKpkr8OA`, punto 4; D-518 F2-43·1 y ·3):
- Como comercio, quiero que cada pedido de la suscripción aparezca solo el día que le toca,
  con su número, su fecha de entrega y su inventario, para despacharlo como cualquier otro.
- Como cliente, quiero recibir la confirmación normal de mi pedido cada vez que se crea.

Requisitos no funcionales: el proceso diario corre una vez al día temprano en la mañana,
termina en menos de 10 minutos con 1.000 entregas del día y tolera correr dos veces o
caerse a mitad; deja evidencia consultable y sin datos personales. Los requisitos marcados
**(provisional, Xn)** aplican el valor por defecto de la pregunta Xn de la propuesta.

## ADDED Requirements

### Requirement: Cada pedido se crea el día que le toca
THE system SHALL crear el pedido de cada entrega el día de su fecha **(provisional, J4)** y
nunca todos al programar ni después de la fecha de entrega. Cada pedido SHALL tomar su
consecutivo, contar en el tope del plan **(provisional, D19)** y descontar su inventario el
día en que se crea. Su fecha de entrega SHALL ser la de esa entrega, tanto la del pedido
como la de cada línea, con la forma y el horario del pedido base.

Fuente: ticket `7OaxPVn97s3dUKpkr8OA`, punto 4; D-518, F2-43·1.

#### Scenario: Entregas futuras no consumen nada hoy
- **WHEN** se programa una suscripción mensual de 6 entregas
- **THEN** hoy no se crea ningún pedido y cada mes se crea uno solo, en su fecha

#### Scenario: Fecha de entrega del pedido generado
- **WHEN** se crea la entrega del 17 de noviembre
- **THEN** el pedido aparece en la lista y en despachos del 17 de noviembre, con esa fecha en
  el pedido y en todas sus líneas

### Requirement: Un solo pedido por fecha de entrega
THE system SHALL crear como máximo un pedido por cada fecha de entrega, aunque el proceso
corra dos veces a la vez, se repita el mismo día o se caiga a mitad. IF el proceso se cae
después de crear el pedido, THEN la recuperación SHALL reconocerlo y SHALL NOT crear otro.
IF dos pedidos de la empresa quedan con el mismo número, THEN THE system SHALL alertar al
comercio.

Fuente: D-518 (idempotencia por fecha de entrega); Constitución, Artículo IV.

#### Scenario: Dos corridas simultáneas
- **WHEN** el proceso diario corre dos veces al mismo tiempo
- **THEN** cada fecha de entrega tiene un solo pedido

#### Scenario: Caída después de crear
- **WHEN** el proceso se cae justo después de crear el pedido de una fecha
- **THEN** la siguiente corrida lo encuentra, termina sus pasos y no crea otro

### Requirement: Inventario descontado una sola vez
WHEN se crea el pedido de una entrega, THE system SHALL descontar sus existencias
exactamente una vez, por el mismo camino de un pedido del origen del pedido base (venta
asistida o tienda), y de la bodega elegida al programar si el base nació en WooCommerce
**(provisional, D13)**. IF no se puede saber si el descuento ocurrió o quedó a medias,
THEN THE system SHALL NOT descontar otra vez y SHALL alertar al comercio. THE system SHALL
NOT revisar existencias de los productos que hoy están marcados como no inventariables.

Fuente: D-518, F2-43·7; D-204 (descontar al crear); D-497 (descuento ambiguo con alerta).

#### Scenario: Caída durante el descuento
- **WHEN** el proceso se cae mientras descuenta el inventario de una entrega
- **THEN** no lo repite si ya hay movimientos de todas sus líneas; si hay de algunas o no
  puede saberlo, abre una alerta sin descontar

#### Scenario: Pedido base de la tienda
- **WHEN** se crea una entrega cuyo pedido base vino de la tienda en línea
- **THEN** sus existencias bajan de la bodega de la tienda una sola vez

#### Scenario: Producto, variantes y precios intactos
- **WHEN** se crea una entrega y se descuenta su inventario
- **THEN** el producto, sus variantes, su precio y sus listas de precios quedan sin cambios

#### Scenario: Servicio sin inventario
- **WHEN** la entrega es de un producto marcado hoy como no inventariable
- **THEN** se crea sin revisar ni descontar existencias de ese producto

### Requirement: Entregas que no se pueden crear
IF el comercio llegó al tope de su plan, su cuenta está suspendida o su política de
existencias bloquea la venta, THEN THE system SHALL NOT crear el pedido, SHALL alertar al
comercio y SHALL reintentar mientras la ventana siga abierta, como máximo hasta la fecha de
entrega **(provisional, D1)**. IF al cerrarse la ventana no se pudo crear, THEN la entrega
SHALL quedar saltada con su motivo y la suscripción SHALL seguir con la siguiente. IF un
producto ya no existe, THEN la entrega SHALL quedar saltada con alerta **(provisional,
D18)**. IF el proceso no corrió durante toda la ventana, THEN la entrega SHALL quedar
saltada por atraso, con alerta. THE system SHALL avisar el día anterior las entregas que
no se van a poder crear.

Fuente: D-319 (tope del plan Gratis); D-362 (freno por existencias).

#### Scenario: Tope del plan
- **WHEN** el comercio en plan Gratis llegó a su tope el día de una entrega
- **THEN** no se crea el pedido, recibe la alerta y la entrega queda saltada al cerrar la
  ventana

#### Scenario: Servidor caído
- **WHEN** el proceso no corre en toda la ventana de una entrega
- **THEN** esa entrega queda saltada por atraso con alerta y no se crea más tarde

### Requirement: Valor y forma de pago del pedido generado
THE system SHALL crear cada pedido con el valor congelado, pago pendiente y la forma de
pago de la suscripción, sin aplicar promociones, rangos, listas ni campañas vigentes ese
día y sin registrar otra vez el uso de un código de descuento **(provisional, D10)**. IF
el total armado difiere del congelado en más de $1, THEN THE system SHALL NOT crearlo y
SHALL alertar.

Fuente: D-518, F2-43·1 y F2-43·2.

#### Scenario: Promoción nueva en el catálogo
- **WHEN** hay una promoción automática vigente el día de la entrega
- **THEN** el pedido conserva el valor congelado

### Requirement: Confirmación al cliente
WHEN se crea el pedido de una entrega, THE system SHALL enviar al cliente la confirmación
normal de pedido creado, una sola vez y ese mismo día, respetando las preferencias de
avisos del comercio **(provisional, D5)**, y SHALL avisar al comercio como con cualquier
pedido nuevo. IF el cliente no tiene correo, THEN THE system SHALL crear el pedido igual.

Fuente: D-518, F2-43·3.

#### Scenario: Proceso repetido
- **WHEN** la recuperación vuelve a pasar por una entrega ya confirmada
- **THEN** el cliente no recibe una segunda confirmación

### Requirement: Pedidos que nacieron en WooCommerce
WHERE el pedido base nació en WooCommerce, THE system SHALL crear las entregas solo en
Katuq, sin ningún dato que las vincule al pedido de WooCommerce, a su número ni a su
cliente de allá, y SHALL NOT enviarlas ni actualizarlas en WooCommerce.

Fuente: D-518, F2-43·4 (hasta que WP-INT 9 decida).

#### Scenario: Entrega de un pedido de la web de CAFE ESCOBAR
- **WHEN** se crea una entrega cuyo pedido base vino de WooCommerce
- **THEN** el pedido existe solo en Katuq, con su propio número, y la conciliación no lo
  confunde con el pedido de la web

### Requirement: Interruptor global y por comercio
THE system SHALL tener un interruptor por comercio y uno global con tres posiciones:
apagado, prueba (solo cuenta lo que crearía) y crear. IF el valor falta o no se reconoce,
THEN THE system SHALL comportarse como apagado.
- En apagado, THE system SHALL NOT crear entregas nuevas ni aceptar suscripciones nuevas,
  y SHALL terminar las entregas cuyo pedido ya se creó.
- En prueba, THE system SHALL NOT crear pedidos y su resumen SHALL decir cuántos crearía.
- WHILE la función está apagada para un comercio, sus entregas SHALL quedar en pausa y
  saltarse con alerta al cerrar su ventana.

Fuente: D-505; D-385 (funciones nuevas apagadas, prueba en FLORECER); D-518.

#### Scenario: Valor mal escrito
- **WHEN** el interruptor global tiene un valor desconocido
- **THEN** no se crea ningún pedido

#### Scenario: Modo prueba
- **WHEN** el proceso corre en prueba
- **THEN** no crea pedidos ni toca el inventario, y el resumen lista lo que habría creado

### Requirement: Observabilidad del proceso diario
Cada corrida SHALL dejar evidencia consultable con su resultado y un resumen (revisadas,
creadas, recuperadas, saltadas por motivo, avisos previos y errores). Cada entrega SHALL
dejar un registro estructurado con su identificador como correlación, sin datos personales.

Fuente: Constitución, Artículos VII y XI.

#### Scenario: Rastrear una entrega
- **WHEN** soporte busca el identificador de una entrega
- **THEN** encuentra la corrida, el pedido creado o el motivo por el que se saltó

## [NEEDS CLARIFICATION]
J4 anticipación; D1 reintentos; D5 confirmación y preferencias; D10 código de descuento;
D13 bodega de Woo; D18 producto borrado; D19 tope del plan.
