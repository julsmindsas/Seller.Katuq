## ADDED Requirements

### Requirement: Estado de facturación común, calculado en el servidor

THE system SHALL clasificar cada pedido en un solo estado de facturación, igual para todos los proveedores: por
facturar (con sus motivos de bloqueo), en proceso, incierto, facturado, por refacturar y venta POS sin documento. El
estado SHALL calcularse en el servidor; el navegador NO SHALL adivinar el proveedor ni el estado. «Por refacturar»
SHALL incluir el último error del proveedor posterior al último éxito, el documento DIAN rechazado sin reemplazo y la
factura liberada sin factura nueva. La venta POS marcada «No requiere factura» SHALL mostrarse aparte y NO SHALL
contarse como pendiente.

#### Scenario: Pedido con factura liberada

- **WHEN** un pedido tuvo una factura que se liberó y no tiene otra
- **THEN** aparece en «Por refacturar»

#### Scenario: Venta POS sin documento

- **WHEN** una venta POS se cobró con «No requiere factura»
- **THEN** aparece en su pestaña aparte
- **AND** no suma a «Por facturar»

### Requirement: Los envíos del compositor se ven con su propio estado

WHEN un pedido tiene un envío en curso hecho desde el compositor, THE system SHALL mostrar el estado de ese envío (en
proceso, incierto o facturado) y SHALL llevar «Verificar» a la consulta de ese envío. NO SHALL dejarlo en proceso para
siempre.

#### Scenario: Envío del compositor sin respuesta

- **WHEN** un envío del compositor quedó incierto
- **THEN** el pedido aparece como incierto
- **AND** «Verificar» consulta el estado de ese envío sin volver a emitir

### Requirement: La bandeja usa el proveedor que decide el servidor

THE system SHALL mostrar el proveedor que resuelve el servidor para la empresa y SHALL ofrecer solo las acciones que
ese proveedor soporta. Lo que el proveedor no soporte NO SHALL aparecer, ni deshabilitado ni simulado.

#### Scenario: Proveedor sin notas desde Katuq

- **WHEN** la empresa factura con un proveedor que no emite notas desde Katuq
- **THEN** la acción de nota no aparece

### Requirement: Cada carga de la bandeja tiene un costo acotado

THE system SHALL limitar las lecturas de cada carga de la bandeja con una ventana de fechas por defecto, una ventana
máxima y un tope de lecturas. IF se alcanza el tope, THEN THE system SHALL indicar que los conteos son parciales y
SHALL pedir acotar las fechas. NO SHALL guardar copias del estado ni usar caché para lograrlo.

#### Scenario: Comercio con muchos pedidos

- **WHEN** la ventana elegida tiene más pedidos que el tope de lecturas
- **THEN** la bandeja muestra los conteos como parciales
- **AND** invita a acotar las fechas

### Requirement: Facturar desde la bandeja respeta el límite de escritura

WHEN el usuario factura varios pedidos a la vez, THE system SHALL enviarlos uno tras otro, cada uno con su clave de
envío. IF el servidor responde que se alcanzó el límite de operaciones, THEN THE system SHALL detenerse, dejar
marcados los pedidos que faltan y decir cuándo puede seguir.

#### Scenario: Se alcanza el límite a mitad de la tanda

- **WHEN** el servidor rechaza un envío por límite de operaciones
- **THEN** los pedidos ya enviados siguen su curso
- **AND** los que faltan quedan marcados para reintentar después

### Requirement: Solo datos de la empresa de la sesión, con el documento enmascarado

THE system SHALL leer solo pedidos de la empresa de la sesión, aunque el cliente mande otro encabezado de empresa, y
SHALL mostrar el documento del comprador enmascarado. La bandeja NO SHALL escribir nada.

#### Scenario: Encabezado de otra empresa

- **WHEN** la solicitud trae el encabezado de otra empresa
- **THEN** la bandeja muestra solo los pedidos de la empresa de la sesión

### Requirement: Con la bandera apagada, todo queda como hoy

WHILE la bandera de la bandeja está apagada para una empresa, THE system SHALL mostrar la pantalla actual de
facturación sin cambios y SHALL negar la lectura nueva.

#### Scenario: Empresa sin la bandera

- **WHEN** una empresa sin la bandera abre Facturación electrónica
- **THEN** ve la pantalla de hoy
