## Purpose

Historias de usuario (ticket `7OaxPVn97s3dUKpkr8OA`, D-518 F2-43·1):
- Como comercio que vende café a clientes que compran lo mismo cada semana o cada mes,
  quiero programar un pedido ya creado para que se repita en las fechas que elija, sin
  volver a digitarlo.
- Como comercio, quiero ver todas las fechas y el valor antes de confirmar, y poder pausar,
  reanudar o cancelar después.

Requisitos no funcionales: las fechas y el valor se calculan en el servidor; todo se filtra
por la empresa de la sesión; sin datos personales en registros; la pantalla sigue el diseño
de las listas internas de Katuq. Los requisitos marcados **(provisional, Xn)** aplican el
valor por defecto de la pregunta Xn de la propuesta y cambian con su respuesta.

## ADDED Requirements

### Requirement: Opción «Suscripciones» en un pedido ya creado
WHERE la función está activada para el comercio, THE system SHALL ofrecer la opción
«Suscripciones» entre las opciones de un pedido ya creado, con nombre y descripción en
español, inglés y portugués. IF el pedido está anulado, cancelado o eliminado, es del punto
de venta **(provisional, J8)** o viene de un origen no cubierto **(provisional, D20)**, THEN
THE system SHALL mostrar la opción deshabilitada con el motivo. WHERE la función está
apagada, las opciones del pedido SHALL verse exactamente como antes.

Fuente: ticket `7OaxPVn97s3dUKpkr8OA`, punto 1; tickets 1187 y 1189 (serie de opciones);
D-385 y D-505.

#### Scenario: Comercio sin la función
- **WHEN** un comercio sin la función abre las opciones de un pedido
- **THEN** no ve «Suscripciones» y las demás opciones no cambian

#### Scenario: Pedido del punto de venta
- **WHEN** el comercio abre las opciones de un pedido del punto de venta
- **THEN** «Suscripciones» aparece deshabilitada y explica por qué

### Requirement: Programar por frecuencia o por fechas exactas
WHEN el comercio programa una suscripción, THE system SHALL permitirle elegir:
- una frecuencia (semanal, cada 2 semanas, mensual o cada 2 meses) con fecha de inicio y,
  como fin, una fecha «hasta» o un número de entregas; o
- una lista de fechas exactas elegidas a mano **(provisional, J2)**.

THE system SHALL aceptar solo fechas posteriores a hoy en Colombia, sin repetir, hasta 52
entregas y 12 meses adelante **(provisional, D7)**. En las frecuencias mensuales, un día que
no existe en un mes SHALL caer en su último día, y el mes siguiente SHALL volver al día
elegido. IF las líneas del pedido base tienen fechas distintas, THEN cada entrega SHALL
conservar la diferencia en días entre ellas **(provisional, J6)**.

Fuente: ticket `7OaxPVn97s3dUKpkr8OA`, puntos 2 y 3; adjunto 1 («O CON FECHAS VARIABLES
EXACTAS»); ticket 1197 (fecha por producto); D-518, F2-43·1.

#### Scenario: Cinco entregas semanales
- **WHEN** el comercio elige «semanal», inicio el 3 de noviembre y 5 entregas
- **THEN** las fechas son el 3, 10, 17 y 24 de noviembre y el 1 de diciembre, sin correrse un
  día

#### Scenario: Mensual desde un día 31
- **WHEN** el comercio elige «mensual» desde el 31 de enero
- **THEN** la segunda entrega cae el último día de febrero y la tercera el 31 de marzo

#### Scenario: Fecha en el pasado
- **WHEN** el comercio incluye una fecha de hoy o anterior
- **THEN** no puede confirmar y se le indica qué fecha corregir

### Requirement: Ver todas las fechas y el valor antes de confirmar
Antes de confirmar, THE system SHALL mostrar la lista numerada de **todas** las fechas, el
valor de cada entrega y los avisos que apliquen: forma de pago de pasarela que hay que
cambiar, pedido nacido en WooCommerce (no se publica allá y requiere elegir bodega,
**provisional, D13**), total guardado distinto del recalculado, productos sin inventario y
fechas distintas por línea. IF lo elegido cambia después de ver la lista, THEN THE system
SHALL NOT permitir confirmar hasta verla de nuevo.

Fuente: ticket `7OaxPVn97s3dUKpkr8OA`, puntos 2 y 3 («me tiene que sacar las 5 fechas»);
D-518, F2-43·1, ·2 y ·4.

#### Scenario: Cambiar algo después de ver las fechas
- **WHEN** el comercio ve las fechas y luego cambia la frecuencia
- **THEN** el botón de confirmar se deshabilita hasta que vuelva a ver la lista

### Requirement: Precio congelado de cada entrega
THE system SHALL fijar el valor de cada entrega al crear la suscripción, con los productos,
variantes, cantidades, impuestos, descuento y envío del pedido base, y con los precios y
campañas vigentes en la fecha del pedido base **(provisional, D2 y D3)**. Cada pedido
generado SHALL tener ese valor aunque después cambien precios, rangos por volumen, listas,
campañas o promociones. Crear o cambiar una suscripción SHALL NOT modificar el producto, sus
variantes, su precio ni sus listas de precios.

Fuente: D-518, F2-43·2 («el del pedido original, congelado»).

#### Scenario: Cambia la lista de precios
- **WHEN** el comercio sube el precio de un producto después de programar
- **THEN** las entregas siguientes conservan el valor congelado

#### Scenario: Vence la campaña del cliente
- **WHEN** el pedido base tenía el precio de campaña de la lista del cliente y la campaña
  vence antes de una entrega
- **THEN** esa entrega conserva el valor congelado

#### Scenario: Producto y precios intactos
- **WHEN** el comercio crea, pausa, cancela o cambia una suscripción
- **THEN** el producto, sus variantes, su precio y sus listas de precios quedan sin cambios

### Requirement: Forma de pago de las entregas
THE system SHALL crear las entregas con pago pendiente y forma de pago manual o contra
entrega. IF el pedido base se pagó por pasarela, THEN THE system SHALL exigir una forma de
pago configurada por el comercio que no sea de pasarela. THE system SHALL NOT cobrar
automáticamente ni generar enlaces de pago.

Fuente: D-518, F2-43·1 («se paga como hoy»); D-206 (la reserva vence los pedidos de
pasarela pendientes).

#### Scenario: Pedido base de la tienda pagado en línea
- **WHEN** el comercio programa un pedido que se pagó en línea
- **THEN** debe elegir otra forma de pago, y las entregas nunca se anulan por vencimiento de
  la reserva

### Requirement: Una sola suscripción por pedido base y nada se gasta al programar
THE system SHALL tratar dos envíos de la misma confirmación como una sola suscripción. IF
el pedido base ya tiene una suscripción activa, THEN THE system SHALL rechazar otra y
mostrar la existente. Programar SHALL NOT crear pedidos, gastar consecutivos, contar en el
tope del plan ni descontar inventario. Solo un comercio con plan de pago SHALL poder
programar **(provisional, D11)**.

Fuente: D-518, F2-43·1; D-497 (una sola alta por comprador y plan; solo Premium).

#### Scenario: Doble clic en «Confirmar»
- **WHEN** el comercio pulsa dos veces «Confirmar»
- **THEN** existe una sola suscripción

#### Scenario: Nada se gasta al programar
- **WHEN** el comercio programa 10 entregas
- **THEN** no se crea ningún pedido y el inventario, los consecutivos y el cupo quedan iguales

### Requirement: Ver, pausar, reanudar, cancelar y cambiar el pedido base
THE system SHALL mostrar en el pedido base y en la pantalla «Suscripciones» el estado, si
está en pausa y por qué, las próximas fechas, las entregas creadas con su número y las
alertas abiertas.
- WHEN el comercio pausa, THE system SHALL NOT crear entregas mientras dure la pausa; las
  fechas que caigan en ella SHALL quedar saltadas **(provisional, J5)**.
- WHEN reanuda, THE system SHALL crear solo las entregas cuya ventana siga abierta.
- WHEN cancela, THE system SHALL NOT iniciar más entregas y SHALL dejar intactos los pedidos
  creados. IF una entrega ya estaba en curso al cancelar, THEN puede terminar y SHALL abrir
  una alerta. Solo un administrador SHALL cancelar **(provisional, D6)**.
- WHEN cambia el pedido base, THE system SHALL aplicar sus líneas y su valor solo a las
  entregas que aún no se crearon y SHALL guardar el valor anterior **(provisional, D4)**.
- IF el pedido base se anula, se cancela o se elimina, THEN THE system SHALL pausar la
  suscripción con una alerta, sin cancelarla **(provisional, D17)**.
- WHILE la función está apagada para el comercio, THE system SHALL seguir permitiéndole
  consultar, pausar y cancelar.

Fuente: D-518, F2-43·1 («se puede pausar, cancelar y ver las próximas fechas») y F2-43·2
(«el comercio actualiza la suscripción»).

#### Scenario: Pausa sobre una fecha
- **WHEN** la suscripción está en pausa el día de una entrega y se reanuda una semana después
- **THEN** esa entrega queda saltada y la siguiente se crea en su fecha

#### Scenario: Cancelar con entregas creadas
- **WHEN** el comercio cancela después de 2 de 5 entregas
- **THEN** los 2 pedidos siguen como estaban y no se crean los 3 restantes

#### Scenario: Pedido base anulado
- **WHEN** el comercio anula el pedido base de una suscripción activa
- **THEN** la suscripción queda en pausa con una alerta y no se crean entregas hasta reanudar

### Requirement: Pantalla «Suscripciones» del comercio
THE system SHALL mostrar al comercio, filtradas por su empresa en el servidor, sus
suscripciones con cliente, pedido base, frecuencia, próxima entrega, entregas creadas sobre
el total, estado y alertas, y un estado vacío cuando no hay ninguna. Es el lugar donde se
ven las alertas aunque el pedido base ya no esté en la lista **(provisional, D9)**.

Fuente: D-518, F2-43·1; D-400; D-497 (pantalla del comercio de la fase B).

#### Scenario: Suscripción de otra empresa
- **WHEN** un usuario pide una suscripción de otra empresa
- **THEN** recibe «no encontrado» y no ve ningún dato

## [NEEDS CLARIFICATION]
J1 «publicarlo»; J2 fechas exactas; J3 el pedido base cuenta como entrega; J5 pausa; J6
fechas por línea; J7 festivos y días bloqueados; J8 POS; D2-D4 precio; D6 roles; D7 topes;
D9 pantalla; D11 Premium; D13 bodega de Woo; D17 pedido base cerrado; D20 orígenes.
