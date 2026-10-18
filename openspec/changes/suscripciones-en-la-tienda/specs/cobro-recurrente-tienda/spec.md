## ADDED Requirements

### Requirement: Un solo cobro por período
THE system SHALL cobrar cada período de una suscripción como máximo una vez, aunque el proceso corra dos veces a la vez, se caiga a mitad o la pasarela responda tarde. Cada intento SHALL llevar una clave trazable propia, que no coincide con ningún número de pedido ni con los cobros de los planes de Katuq, y que queda registrada antes de llamar a la pasarela.

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

#### Scenario: Incierto en una suscripción cancelada
- **WHEN** el comprador cancela y queda un intento incierto sin respuesta
- **THEN** no se reenvía; se consulta y, si no hay respuesta en 72 horas, se alerta para revisarlo en el panel de la pasarela

### Requirement: Ventana de cobro y reintentos
THE system SHALL cobrar cada período desde su fecha hasta 5 días después, con máximo un intento por día. IF el pago se rechaza, THEN THE system SHALL reintentar a los 2 y a los 5 días y avisar al comprador en cada rechazo para que cambie la tarjeta. IF se agotan los 3 intentos, THEN la suscripción SHALL quedar en «pago fallido», sin más cobros, y el comercio SHALL recibir un aviso en la campana y por correo. IF el cobro falla por un error técnico o de configuración, THEN THE system SHALL NOT contarlo como rechazo del comprador: SHALL alertar al comercio, repetirlo dentro de la ventana y, si la ventana cierra, saltar el período sin cobrarlo.

#### Scenario: Tercer rechazo
- **WHEN** el tercer intento de un período se rechaza
- **THEN** la suscripción queda en «pago fallido», no hay más cobros y el comercio recibe el aviso

#### Scenario: Error técnico
- **WHEN** la pasarela rechaza el cobro por un dato de configuración del comercio
- **THEN** el comprador no recibe aviso de tarjeta rechazada y el comercio recibe una alerta ese mismo día

### Requirement: No se cobra lo que no se puede entregar
IF al llegar la fecha de cobro falta el producto, la bodega de la tienda o las existencias, THEN THE system SHALL NOT cobrar, SHALL avisar al comercio y SHALL revisar cada día dentro de la ventana; si la ventana cierra sin resolverse, el período SHALL saltarse sin cobro, con aviso al comprador, y la suscripción SHALL seguir.

WHILE las renovaciones de un comercio están pausadas (función apagada, sin pasarela propia o con la pasarela en otro entorno), THE system SHALL NOT cobrar. Los períodos cuya ventana cierre durante la pausa SHALL saltarse sin cobro y con aviso al comprador. Al reanudar, THE system SHALL cobrar solo el período cuya ventana siga abierta, nunca los atrasados.

#### Scenario: Sin existencias toda la ventana
- **WHEN** un producto físico no tiene existencias desde la fecha de cobro hasta 5 días después
- **THEN** no se cobra, el comprador recibe el aviso de período saltado y el siguiente período se cobra normal

#### Scenario: Reanudar después de una pausa larga
- **WHEN** el comercio vuelve a activar la función después de dos meses apagada
- **THEN** se cobra solo el período en curso, si su ventana sigue abierta, y los dos meses anteriores quedan saltados sin cobro

### Requirement: Un pedido por período cobrado
WHEN un cobro queda aprobado, por cualquier vía en que se confirme, THE system SHALL crear exactamente un pedido de la tienda para ese período, ya pagado, con el monto congelado al suscribirse y el envío incluido, y SHALL descontar sus existencias exactamente una vez. IF el total del pedido difiere del cobrado en más de 1 peso, THEN THE system SHALL NOT crear el pedido y SHALL alertar al comercio. IF no se puede saber si las existencias ya se descontaron, THEN THE system SHALL NOT descontarlas otra vez y SHALL alertar al comercio. Los pedidos de renovación SHALL NOT contar en el tope del plan Gratis ni informarse como conversión.

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

### Requirement: Confirmación de la pasarela
WHEN llega una notificación de pago de una suscripción, THE system SHALL guardar el evento crudo antes de procesarlo, validarlo solo con el secreto de la cuenta del comercio dueño, confirmar la transacción con la pasarela y exigir que la clave, el monto y la moneda coincidan con el intento guardado. IF no valida o no coincide, THEN THE system SHALL ignorarla y registrar el motivo. Un aviso atrasado SHALL NOT revertir un período ya pagado. IF llega un aprobado para una suscripción cerrada, THEN THE system SHALL registrar el período como pagado y alertar al comercio.

#### Scenario: Secreto de otra cuenta
- **WHEN** llega una notificación de suscripción firmada con un secreto que no es el del comercio dueño
- **THEN** se ignora y no cambia nada

#### Scenario: Monto distinto
- **WHEN** la transacción confirmada tiene un monto distinto al del intento
- **THEN** se ignora, se registra el motivo y no se crea pedido

#### Scenario: Aviso fuera de orden
- **WHEN** llega «pendiente» después de «aprobado» para el mismo cobro
- **THEN** el período sigue pagado

#### Scenario: Las demás notificaciones no cambian
- **WHEN** llegan notificaciones de enlaces de pago, POS o planes de Katuq
- **THEN** se procesan exactamente igual que antes del cambio

### Requirement: Interruptor global del cobro
THE system SHALL tener un interruptor global del cobro con tres posiciones: apagado, prueba (solo cuenta lo que cobraría) y cobro, y otro aparte para los avisos. IF el valor falta o no se reconoce, THEN THE system SHALL comportarse como apagado. En apagado y en prueba, THE system SHALL NOT aceptar altas ni enviar cobros nuevos. En todas las posiciones, THE system SHALL seguir aplicando las confirmaciones de cobros ya enviados, para no dejar dinero cobrado sin pedido.

#### Scenario: Modo prueba
- **WHEN** el cobro diario corre en prueba
- **THEN** no envía ningún cobro a la pasarela y su resumen dice cuántos habría hecho

#### Scenario: Valor desconocido
- **WHEN** el interruptor tiene un valor mal escrito
- **THEN** no se acepta ninguna alta y no se envía ningún cobro

### Requirement: Conciliación y cuadre
Cada día, THE system SHALL confirmar los cobros pendientes o inciertos, terminar los pedidos de los períodos pagados que no lo tengan y alertar de lo que siga incierto. El resumen diario SHALL contar suscripciones revisadas, cobros enviados, aprobados, rechazados e inciertos, pedidos creados, omitidas y errores. En cada mes, los cobros aprobados SHALL igualar a los pedidos generados, o la diferencia SHALL aparecer como alerta.

#### Scenario: Pedido pendiente tras un aprobado
- **WHEN** un período quedó pagado sin pedido por una caída
- **THEN** la conciliación del día siguiente crea su pedido una sola vez

### Requirement: Observabilidad del cobro
Cada cobro, consulta y notificación SHALL dejar un registro estructurado con la clave del intento como identificador de correlación, el resultado (éxito, error o reintento) y la latencia, sin datos personales.

#### Scenario: Rastrear un cobro
- **WHEN** soporte busca la clave de un intento
- **THEN** encuentra el envío, la respuesta, la notificación y el pedido de ese período
