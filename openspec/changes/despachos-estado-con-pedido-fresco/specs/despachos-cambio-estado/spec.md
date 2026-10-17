## ADDED Requirements

### Requirement: Cambiar el estado sobre el pedido actual
WHEN el usuario cambia el estado de un pedido desde Despachos y el servidor rechaza el guardado porque el pedido cambió desde que la pantalla lo cargó, the system SHALL traer el pedido actual del servidor, aplicarle el mismo cambio que pidió el usuario y guardarlo de nuevo una sola vez.

#### Scenario: Pedido empacado mientras la orden estaba abierta
- **WHEN** un pedido entró a una orden de envío en producción, empaque lo marcó Empacado y le asentaron un pago, y luego el usuario lo quita de la orden
- **THEN** el pedido queda Empacado, sin orden de envío, conservando el pago y la fecha de empaque, y el usuario no ve el aviso "modificado por otra persona"

#### Scenario: Cambio de estado desde la lista
- **WHEN** el usuario pasa un pedido a Despachado desde el botón de estado y la copia de la pantalla está vieja
- **THEN** el pedido queda Despachado con el despachador y la fecha de ese momento, sobre los demás datos actuales del pedido

#### Scenario: Vuelve a chocar
- **WHEN** el pedido cambia otra vez entre la relectura y el segundo guardado
- **THEN** se muestra el aviso con el detalle del servidor, la lista se recarga y no se hace un tercer intento

### Requirement: No escribir si ya quedó así
IF al releer el pedido ya está en el estado que el usuario pidió (y, al quitarlo de una orden, ya no tiene orden), THEN the system SHALL adoptar el pedido actual en la pantalla y avisar, y SHALL NOT enviar otra edición.

#### Scenario: Otra persona ya lo sacó de la orden
- **WHEN** el usuario quita un pedido de la orden y al releerlo ya está Empacado y sin orden
- **THEN** la pantalla lo muestra así y no se guarda nada

### Requirement: Mismo cambio en el primer intento y en el reintento
The system SHALL aplicar en el reintento exactamente los mismos campos que en el primer intento para ese botón: estado, empacador, despachador, fechas, orden de envío, transportador y la marca de cambio explícito en los retrocesos; y SHALL NOT cambiar carrito, pagos ni totales.

#### Scenario: Campos intactos
- **WHEN** se reintenta un cambio de estado sobre el pedido actual
- **THEN** el carrito, los pagos asentados y los totales enviados son los del pedido actual, sin modificar

### Requirement: Solo el conflicto de versión reintenta
WHEN el primer guardado falla por un motivo distinto al conflicto de versión, the system SHALL mostrar el aviso con el detalle del servidor sin releer ni reintentar.

#### Scenario: Transición no permitida
- **WHEN** el servidor rechaza el cambio porque la transición de estado no está permitida
- **THEN** se muestra ese mensaje y no se vuelve a intentar
