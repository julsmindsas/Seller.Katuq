## ADDED Requirements

### Requirement: Cada envío de factura de un pedido tiene una clave

El sistema SHALL aceptar una clave de envío opcional al facturar un pedido, tanto en el camino síncrono como en el
asíncrono. WHEN la solicitud no trae clave, THE system SHALL generar una y devolverla. IF la clave no cumple el formato
acordado, THEN THE system SHALL rechazar la solicitud sin tocar el pedido ni llamar al proveedor. Las respuestas
exitosas de hoy (creada en el síncrono, aceptada en el asíncrono) SHALL conservarse e incluir la clave.

#### Scenario: Solicitud sin clave

- **WHEN** un cliente actual factura un pedido sin mandar clave
- **THEN** la factura sigue el flujo de hoy
- **AND** la respuesta trae la clave que generó el servidor

#### Scenario: Clave mal formada

- **WHEN** llega una clave con caracteres o longitud fuera del formato
- **THEN** el sistema responde un error de clave inválida
- **AND** el pedido no cambia y no se contacta al proveedor

### Requirement: Un mismo envío nunca sale dos veces

WHEN llega de nuevo una clave cuyo envío sigue en curso, THE system SHALL no enviar otra vez al proveedor y SHALL
registrar el intento repetido. WHEN llega la clave de un envío ya aceptado, THE system SHALL devolver la factura
existente sin emitir otra. WHEN dos solicitudes con claves distintas para el mismo pedido llegan casi al mismo tiempo,
THE system SHALL dejar que solo una llegue al proveedor.

#### Scenario: Doble clic en Facturar

- **WHEN** el mismo pedido recibe dos solicitudes en menos de 1 segundo
- **THEN** el proveedor recibe un solo envío
- **AND** el pedido queda con una sola factura

#### Scenario: Reintento después de aceptada

- **WHEN** llega otra vez la clave de un envío aceptado
- **THEN** el sistema devuelve esa misma factura
- **AND** no se gasta otro consecutivo

### Requirement: Solo el intento dueño del candado lo modifica

THE system SHALL marcar que un envío salió hacia el proveedor solo si ese intento todavía es dueño del candado del
pedido. IF otro intento ya tomó el candado, THEN THE system SHALL abortar sin enviar y SHALL devolver el consecutivo
reservado, como hoy antes de enviar. Al terminar con éxito o con error, THE system SHALL quitar el candado solo si es
suyo. IF el pedido ya tiene otra factura, THEN THE system SHALL no sobrescribirla y SHALL registrar el posible duplicado.

#### Scenario: Un intento lento pierde el candado

- **WHEN** un intento tarda más de 3 minutos antes de enviar y otro toma el candado
- **THEN** el intento lento no envía nada al proveedor
- **AND** solo el intento nuevo puede facturar el pedido

### Requirement: Un envío sin respuesta queda incierto y no vence

IF un envío ya salió hacia el proveedor y no hay una respuesta que confirme el resultado (falla de red, documento
duplicado sin número recuperado, «duplicado» de World Office sin identificador o DIAN sin respuesta), THEN THE system
SHALL marcar el pedido como incierto, guardar el número y el CUFE cuando existan, y no registrarlo como factura. WHILE
el pedido está incierto, THE system SHALL rechazar todo nuevo intento de facturarlo con un aviso de verificar. El estado
incierto NO SHALL vencer con el tiempo.

#### Scenario: Se pierde la respuesta de la DIAN

- **WHEN** la DIAN no responde después de recibir el envío
- **THEN** el pedido queda incierto con su número y su CUFE
- **AND** un nuevo clic en Facturar no gasta otro número

#### Scenario: World Office responde «ya existe»

- **WHEN** World Office responde que el documento ya existe, sin identificador
- **THEN** el pedido queda incierto y no se escribe ningún número de factura

### Requirement: Un envío incierto se verifica antes de reintentar

WHEN un usuario con rol de facturación pide verificar un pedido incierto de su empresa, THE system SHALL consultar al
proveedor sin volver a emitir y SHALL terminar en uno de tres resultados: vinculado, liberado o sigue incierto.
Vincular SHALL dejar lo mismo que una emisión aceptada: la factura en el pedido y, en DIAN, el registro de aceptación,
el asiento del libro interno y los archivos, o la marca de archivos pendientes para recuperarlos sin emitir. La
búsqueda SHALL usar la fecha y el total del envío original, no los de la verificación. IF la búsqueda no encuentra una
coincidencia única, THEN THE system SHALL mantener el pedido incierto. WHERE el proveedor no permite verificar, THE
system SHALL liberar solo con la confirmación explícita del usuario, que queda registrada con su nombre. IF el pedido es
de otra empresa o no está incierto, THEN THE system SHALL responder que no existe o que no aplica, sin cambiar nada.

#### Scenario: Siigo, verificación al día siguiente

- **WHEN** se verifica hoy un envío a Siigo que salió ayer y no aparece
- **THEN** el pedido sigue incierto
- **AND** no se libera para facturar de nuevo sin la confirmación del usuario

#### Scenario: DIAN aceptó, pero la respuesta se perdió

- **WHEN** la consulta muestra que la DIAN aceptó el documento
- **THEN** el pedido queda con su factura
- **AND** la factura aparece en el libro de ventas y en la bandeja como aceptada

#### Scenario: Envío del compositor

- **WHEN** se pide verificar un pedido cuyo envío lo hizo el compositor
- **THEN** el sistema indica que se verifica con el estado de ese envío, sin cambiar nada

### Requirement: Reporte de consecutivos de solo lectura

THE system SHALL clasificar cada número del rango DIAN de la empresa de la sesión en aceptado, rechazado, enviado sin
respuesta, devuelto y reusado, habilitación o sin registro, con su evidencia, y NO SHALL escribir nada. El encabezado
de empresa que mande el cliente NO SHALL cambiar la empresa consultada.

### Requirement: Primero en sombra

WHILE la bandera de idempotencia está apagada para una empresa, THE system SHALL facturar como hoy y solo registrar lo
que habría bloqueado o devuelto distinto. La validación del formato de la clave SHALL aplicar siempre, porque ningún
cliente actual la manda. La emisión, la verificación y el reporte NO SHALL escribir productos, precios, listas de
precios, inventario, pagos, cartera ni clientes.

#### Scenario: Bandera apagada

- **WHEN** un pedido de una empresa sin la bandera tendría un envío incierto
- **THEN** el pedido se comporta como hoy
- **AND** queda un registro de sombra con la clave del envío
