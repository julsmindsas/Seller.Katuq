> **[21-oct]** Ajuste pendiente de aprobación (D-518 F2-43·1 y ·7; tarea 0.9): planes de
> servicio sin revisar existencias, cupo del plan antes de cobrar y pedido que no se puede
> crear después del cobro. Se agregó la fuente de cada requisito. Ticket F2-43: cd
> `UVaf50kn4UPbI358NGMk`. Para no pasar de 3 páginas (Artículo XIII), los requisitos «Interruptor
> global del cobro», «Conciliación y cuadre», «Observabilidad del cobro» y «Confirmación de la
> pasarela», aprobados el 18-oct, pasaron sin cambios de fondo a `specs/operacion-cobro-tienda`.
> Revisado el 21-oct: producto vendible y total que cuadra antes de cobrar. La fecha de entrega
> de cada pedido está en `specs/planes-de-suscripcion`, junto al calendario.

## ADDED Requirements

### Requirement: Un solo cobro por período
THE system SHALL cobrar cada período de una suscripción como máximo una vez, aunque el proceso corra dos veces a la vez, se caiga a mitad o la pasarela responda tarde. Cada intento SHALL llevar una clave trazable propia, que no coincide con ningún número de pedido ni con los cobros de los planes de Katuq, y que queda registrada antes de llamar a la pasarela.

Fuente: ticket F2-43, criterio 2 («el cobro se repite cada mes sin intervención»); Constitución, Artículo IV; D-497 D2 y D4.

#### Scenario: Dos corridas a la vez
- **WHEN** el cobro diario corre dos veces al mismo tiempo
- **THEN** cada intento se envía a la pasarela una sola vez

#### Scenario: Caída después de enviar
- **WHEN** el proceso se cae justo después de enviar un cobro
- **THEN** el cobro se confirma consultando, o se reenvía con la misma clave, nunca con una nueva

#### Scenario: La pasarela dice que la clave ya existe
- **WHEN** la pasarela responde que la clave del intento ya fue usada
- **THEN** el cobro queda incierto, se confirma consultando y se abre una alerta

### Requirement: Respuesta incierta
IF la pasarela no responde, se agota el tiempo o la respuesta no dice qué pasó, THEN THE system SHALL tratar el cobro como incierto y confirmarlo antes de cualquier otro intento. WHILE un cobro de un período está incierto, THE system SHALL NOT abrir otro intento de ese período. IF la suscripción está cancelada o cerrada, THEN THE system SHALL confirmar el cobro incierto solo consultando, nunca reenviándolo.

Fuente: Constitución, Artículo IV; D-497 D4 y D7.

#### Scenario: Incierto en una suscripción cancelada
- **WHEN** el comprador cancela y queda un intento incierto sin respuesta
- **THEN** no se reenvía; se consulta y, si no hay respuesta en 72 horas, se alerta para revisarlo en el panel de la pasarela

### Requirement: Ventana de cobro y reintentos
THE system SHALL cobrar cada período desde su fecha hasta 5 días después, con máximo un intento por día. IF el pago se rechaza, THEN THE system SHALL reintentar a los 2 y a los 5 días y avisar al comprador en cada rechazo para que cambie la tarjeta. IF se agotan los 3 intentos, THEN la suscripción SHALL quedar en «pago fallido», sin más cobros, y el comercio SHALL recibir un aviso en la campana y por correo. IF el cobro falla por un error técnico o de configuración, THEN THE system SHALL NOT contarlo como rechazo del comprador: SHALL alertar al comercio, repetirlo dentro de la ventana y, si la ventana cierra, saltar el período sin cobrarlo.

Fuente: ticket F2-43, punto 2 («alertas de pago fallido»); D-497 D7.

#### Scenario: Tercer rechazo
- **WHEN** el tercer intento de un período se rechaza
- **THEN** la suscripción queda en «pago fallido», no hay más cobros y el comercio recibe el aviso

#### Scenario: Error técnico
- **WHEN** la pasarela rechaza el cobro por un dato de configuración del comercio
- **THEN** el comprador no recibe aviso de tarjeta rechazada y el comercio recibe una alerta ese mismo día

### Requirement: No se cobra lo que no se puede entregar
IF al llegar la fecha de cobro falta el producto, la bodega de la tienda o las existencias, THEN THE system SHALL NOT cobrar, SHALL avisar al comercio y SHALL revisar cada día dentro de la ventana; si la ventana cierra sin resolverse, el período SHALL saltarse sin cobro, con aviso al comprador, y la suscripción SHALL seguir.

WHILE las renovaciones de un comercio están pausadas (función apagada, sin pasarela propia o con la pasarela en otro entorno), THE system SHALL NOT cobrar. Los períodos cuya ventana cierre durante la pausa SHALL saltarse sin cobro y con aviso al comprador. Al reanudar, THE system SHALL cobrar solo el período cuya ventana siga abierta, nunca los atrasados.

**[21-oct]** IF el producto del plan ya no existe, no está activo, no es de la empresa o el
comercio lo marcó para cotizar, o si el pedido del período armado antes de cobrar no da el
monto congelado, THEN THE system SHALL NOT cobrar, SHALL alertar al comercio y SHALL tratar el
período como uno sin existencias. THE system SHALL NOT revisar existencias ni exigir bodega
para los productos marcados hoy como no inventariables. IF el comercio llegó al tope de pedidos de su plan o su
cuenta está suspendida, THEN THE system SHALL NOT cobrar y SHALL tratar el período como uno
sin existencias: aviso al comercio, revisión diaria en la ventana y período saltado al
cerrarla **(provisional, B4)**.

Fuente: ticket F2-43, criterio 2; D-497 D5 y D7; **[21-oct]** D-518 F2-43·7 (sin revisar
existencias de lo no inventariable); D-518 F2-43·6 (un producto para cotizar no se compra);
fase A, preguntas D18 y D19 (producto borrado; todo pedido cuenta en el tope).

#### Scenario: Sin existencias toda la ventana
- **WHEN** un producto físico no tiene existencias desde la fecha de cobro hasta 5 días después
- **THEN** no se cobra, el comprador recibe el aviso de período saltado y el siguiente período se cobra normal

#### Scenario: Reanudar después de una pausa larga
- **WHEN** el comercio vuelve a activar la función después de dos meses apagada
- **THEN** se cobra solo el período en curso, si su ventana sigue abierta, y los dos meses anteriores quedan saltados sin cobro

#### Scenario: [21-oct] Servicio sin existencias
- **WHEN** llega la fecha de cobro de un plan de Evora Cloud, un producto no inventariable
  sin existencias registradas
- **THEN** se cobra normalmente y su pedido se crea sin descontar existencias

#### Scenario: [21-oct] Producto marcado para cotizar
- **WHEN** el comercio marca para cotizar el producto de un plan con suscriptores activos
- **THEN** los períodos siguientes no se cobran, el comercio recibe la alerta y cada período
  queda saltado al cerrar su ventana

#### Scenario: [21-oct] Comercio sin cupo
- **WHEN** el comercio llegó al tope de pedidos de su plan el día de un cobro
- **THEN** no se cobra, el comercio recibe el aviso y, si la ventana cierra así, el período
  queda saltado con aviso al comprador

### Requirement: Un pedido por período cobrado
WHEN un cobro queda aprobado, por cualquier vía en que se confirme, THE system SHALL crear exactamente un pedido de la tienda para ese período, ya pagado, con el monto congelado al suscribirse y el envío incluido, y SHALL descontar sus existencias exactamente una vez. IF el total del pedido difiere del cobrado en más de 1 peso, THEN THE system SHALL NOT crear el pedido y SHALL alertar al comercio. IF no se puede saber si las existencias ya se descontaron, THEN THE system SHALL NOT descontarlas otra vez y SHALL alertar al comercio. Los pedidos de renovación SHALL NOT ~~contar en el tope del plan Gratis ni~~ informarse como conversión. **[21-oct]** Cada pedido SHALL llevar la variante y la cantidad elegidas al suscribirse y SHALL contar en el tope de pedidos del plan como cualquier pedido **(provisional, B4)**. IF el pedido de un período ya cobrado no se puede crear (cuenta suspendida o tope alcanzado), THEN THE system SHALL dejar el período pagado, alertar al comercio, reintentar cada día y SHALL NOT cobrarlo otra vez **(provisional, B7)**.

Fuente: ticket F2-43, criterio 2; D-497 D5; D-204 (existencias al crear el pedido); **[21-oct]** D-518 F2-43·1.

#### Scenario: Notificación repetida
- **WHEN** la pasarela notifica dos veces el mismo cobro aprobado
- **THEN** existe un solo pedido para ese período

#### Scenario: Caída después de crear el pedido
- **WHEN** el proceso se cae justo después de crear el pedido
- **THEN** la recuperación no crea otro pedido y las existencias quedan descontadas una sola vez

#### Scenario: Producto y precios intactos
- **WHEN** se cobra un período y se crea su pedido con descuento de existencias
- **THEN** el producto, sus variantes, su precio y sus listas de precios quedan sin cambios

#### Scenario: Cuenta sin notificaciones
- **WHEN** el comercio no tiene configuradas las notificaciones de la pasarela
- **THEN** el pedido se crea igual al confirmar el cobro por consulta

#### Scenario: [21-oct] Cuenta suspendida después del cobro
- **WHEN** un cobro queda aprobado y la cuenta del comercio se suspende antes de crear el
  pedido
- **THEN** el período queda pagado con una alerta, no hay un segundo cobro y el pedido se
  crea el día en que la cuenta vuelve a estar activa
