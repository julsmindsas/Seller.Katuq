> **[21-oct] Nueva, pendiente de aprobación** (tarea 0.9). Recibe, ampliado, el requisito
> «Planes de suscripción configurados por el comercio» que se aprobó el 18-oct en
> `tienda-suscripciones`. Ticket F2-43, cd `UVaf50kn4UPbI358NGMk`; D-518 F2-43·1 (un solo
> modelo con la suscripción desde un pedido, cd `7OaxPVn97s3dUKpkr8OA`).

## Purpose

Historias de usuario:
- Como comercio que vende café, quiero ofrecer un plan que el comprador reciba cada semana,
  cada dos semanas o cada mes, con la molienda que prefiera y la cantidad que necesite.
- Como comercio que vende un servicio (Evora Cloud), quiero ofrecer un plan mensual y otro
  anual, cada uno con su precio y lo que incluye.

Requisitos no funcionales: el monto lo calcula el servidor; configurar planes nunca toca el
producto; la página sin planes se ve igual. Los requisitos marcados **(provisional, Bn)**
aplican la recomendación de la pregunta Bn de la propuesta.

## ADDED Requirements

### Requirement: Planes configurados por el comercio
WHERE la función de suscripciones está disponible para el comercio, THE system SHALL
permitirle configurar en su tienda hasta 10 planes, cada uno sobre un producto activo de su
empresa que no esté marcado para cotizar, con: nombre; las frecuencias que admite (semanal,
cada 2 semanas, mensual, cada 2 meses o anual, al menos una); las variantes del producto que
se pueden elegir; la cantidad máxima por cobro (de 1 a 10); el precio por unidad y por cobro,
con impuestos incluidos, y hasta 6 puntos de «Qué incluye». Un
plan SHALL cobrar el mismo precio por unidad con cualquiera de sus frecuencias y variantes
**(provisional, B1 y B2)**. Configurar planes SHALL NOT cambiar el producto, sus variantes,
su precio ni sus listas de precios.

Fuente: ticket F2-43, punto 2 («planes con precio mensual o anual y lo que incluye cada
uno»); D-497; D-518 F2-43·1; ticket `7OaxPVn97s3dUKpkr8OA`, punto 3 (frecuencias) y adjunto
3 (plan con variante y cantidad); D-518 F5-30·7 (sin precio por variante); D-518 F2-43·6 (un
producto para cotizar no se compra).

#### Scenario: Tienda sin planes
- **WHEN** una tienda no tiene planes
- **THEN** sus páginas se ven exactamente igual que antes del cambio

#### Scenario: Guardar un plan no toca el producto
- **WHEN** el comercio guarda un plan sobre un producto
- **THEN** el producto, sus variantes, su precio y sus listas de precios quedan sin cambios

#### Scenario: Editor que no conoce los planes
- **WHEN** alguien guarda la tienda desde una versión del editor que no conoce los planes
- **THEN** los planes ya guardados se conservan

#### Scenario: Producto para cotizar
- **WHEN** el comercio intenta crear un plan sobre un producto que se cotiza con un asesor
- **THEN** el plan no se guarda y se le explica por qué

#### Scenario: Variante que el producto no tiene
- **WHEN** el comercio intenta permitir en un plan una variante que su producto no tiene
- **THEN** el plan no se guarda con esa variante y se le indica cuál sobra

### Requirement: Planes en la página
WHERE una tienda tiene planes publicados, THE system SHALL mostrar en la tarjeta y en la
ficha de su producto «Desde $X» con la frecuencia («/mes», «/año», «/semana», «cada 2
semanas» o «cada 2 meses») cuando el plan admite una sola, o «Desde $X por entrega» cuando
admite varias, y un selector de plan, frecuencia, variante y cantidad que solo ofrece lo que
el plan permite. Antes de pagar, THE system SHALL mostrar el total por cobro y la fecha del
próximo cobro calculados por el servidor.

Fuente: ticket F2-43 («Evora Cloud desde $69.900/mes», botón «Ver planes»); D-497.

#### Scenario: Plan mensual y anual de un servicio
- **WHEN** el producto Evora Cloud tiene un plan mensual de $69.900 y uno anual
- **THEN** su tarjeta muestra «Desde $69.900/mes» y el selector ofrece los dos planes

### Requirement: Elección del comprador
WHEN un comprador se suscribe, THE system SHALL aceptar solo una frecuencia, una variante y
una cantidad permitidas por el plan, SHALL calcular el monto de cada cobro como el precio por
unidad del plan, que ya incluye impuestos, por la cantidad, y SHALL congelarlo para toda la
suscripción, junto con la tarifa de impuesto del producto en ese momento, que solo sirve para
desglosar el pedido. IF la solicitud trae una frecuencia, variante o cantidad que el plan no
permite, THEN THE system SHALL rechazarla sin cobrar. THE system SHALL ignorar cualquier
monto que llegue en la solicitud. Cambiar de frecuencia, variante o cantidad SHALL hacerse
cancelando y suscribiéndose de nuevo.

Fuente: D-518 F2-43·1 (variante y cantidad del modelo único); D-497 (monto congelado al
suscribirse); ticket F2-43 («Desde $69.900/mes»: el precio que se muestra es el que se cobra).

#### Scenario: Cantidad mayor que el tope
- **WHEN** un comprador pide 15 unidades de un plan con tope de 10
- **THEN** la suscripción no se crea y no hay cobro

#### Scenario: Monto alterado
- **WHEN** la solicitud de alta trae un monto menor que precio por cantidad
- **THEN** el cobro, si ocurre, es por el monto que calcula el servidor

#### Scenario: El comercio sube el precio
- **WHEN** el comercio cambia el precio de un plan después de que alguien se suscribió
- **THEN** los cobros de esa suscripción siguen con el monto congelado

#### Scenario: Cambia el impuesto del producto
- **WHEN** cambia la tarifa de impuesto del producto después del alta
- **THEN** el monto cobrado, el total del pedido y su desglose siguen siendo los del alta

### Requirement: Calendario de cobros
THE system SHALL fijar el primer cobro el día del alta y los siguientes según la frecuencia
elegida: cada 7 o 14 días, o el mismo día cada 1, 2 o 12 meses. IF ese día no existe en un
mes, THEN el cobro SHALL caer en su último día y el siguiente SHALL volver al día del alta.
Cada período SHALL estar pagado hasta el día anterior al cobro siguiente. Las fechas SHALL
calcularse en la hora de Colombia, y una suscripción de la tienda SHALL seguir hasta que se
cancele **(provisional, B9)**.

Fuente: D-518 F2-43·1 (mismo calendario de la suscripción desde un pedido); D-497.

#### Scenario: Mensual desde un día 31
- **WHEN** un comprador se suscribe a un plan mensual el 31 de enero
- **THEN** los cobros siguientes son el último día de febrero y el 31 de marzo

#### Scenario: Semanal
- **WHEN** un comprador se suscribe a un plan semanal un lunes
- **THEN** cada cobro es un lunes y un cobro reintentado nunca se cruza con el de la semana
  siguiente

#### Scenario: Anual desde un 29 de febrero
- **WHEN** un comprador se suscribe a un plan anual el 29 de febrero
- **THEN** el cobro del año siguiente es el 28 de febrero

### Requirement: Fecha de entrega del pedido de cada período
WHEN se crea el pedido de un período cobrado, THE system SHALL darle como fecha de entrega el
día del cobro o, si ese día la tienda no entrega o ya pasó su hora de corte, el siguiente día
en que sí entrega, dentro de los 14 días siguientes **(provisional, B11)**. THE system SHALL
NOT dejar sin pedido un período cobrado porque el día ya no tenga cupo, y ese pedido SHALL
ocupar cupo como cualquier otro. IF no hay día válido en esos 14 días, THEN el pedido SHALL
crearse con la fecha del cobro y el comercio SHALL recibir una alerta.

Fuente: ticket `7OaxPVn97s3dUKpkr8OA` (fecha de cada entrega); F2-15 (días sin entregas,
hora de corte y cupo del día); D-518 F2-43·1; pregunta B11.

#### Scenario: Cobro en un día sin entregas
- **WHEN** un cobro semanal se aprueba el 24 de diciembre y la tienda marcó ese día sin
  entregas
- **THEN** el pedido queda para el 25 de diciembre, si ese día sí entrega

#### Scenario: Día lleno
- **WHEN** un cobro se aprueba para un día cuyo cupo ya está lleno
- **THEN** el pedido se crea igual para ese día y ocupa cupo

## [NEEDS CLARIFICATION]
B1 variante con otro precio; B2 varias frecuencias por plan; B9 duración; B11 fecha de entrega.
