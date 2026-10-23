## ADDED Requirements

### Requirement: Propuesta antes de escribir
WHEN una persona pide desde el MCP editar una opción de un pedido, el sistema SHALL devolver primero una propuesta que muestre:

- el pedido y la opción;
- cada campo con su antes → después;
- los efectos: total, saldo, estado de pago, inventario y avisos al cliente, cuando apliquen.

La propuesta SHALL NOT escribir nada ni enviar avisos.

#### Scenario: Cambiar la dirección de entrega
- **WHEN** una persona pide en Claude cambiar la dirección del pedido 2024-001
- **THEN** la tarjeta muestra la dirección actual → la nueva, dice que el valor del domicilio no cambia y el pedido sigue igual hasta que la persona apruebe

### Requirement: Aprobación de la persona
Un cambio SHALL aplicarse solo cuando la persona lo aprueba en la tarjeta del MCP. La aprobación SHALL quedar ligada a la persona, la empresa, el pedido y el contenido exacto, y SHALL vencer en minutos. IF el pedido cambia entre la propuesta y la aprobación, o el contenido no coincide, THEN el cambio SHALL NOT aplicarse y SHALL pedirse una propuesta nueva. Una misma aprobación que llega dos veces SHALL aplicarse una sola vez. El modelo SHALL NOT poder aprobar.

#### Scenario: Otra persona cambió el pedido
- **WHEN** después de la propuesta un asesor edita el mismo pedido en Katuq y luego la persona aprueba en Claude
- **THEN** el cambio no se aplica y la tarjeta dice que el pedido cambió y hay que revisarlo de nuevo

### Requirement: Mismo camino y mismas validaciones que la pantalla
El servidor SHALL aplicar cada cambio aprobado por la misma operación y con las mismas validaciones que usa la pantalla de pedidos para esa opción, y solo sobre los campos aprobados. IF la pantalla rechazaría el cambio, THEN el MCP SHALL rechazarlo con el mismo motivo, en lenguaje de negocio.

#### Scenario: Validación de la pantalla
- **WHEN** una persona intenta desde Claude un cambio que la pantalla no permite en ese estado del pedido
- **THEN** recibe el mismo motivo que vería en Katuq y el pedido no cambia

### Requirement: Permiso por opción y persona identificada
Cada opción SHALL exigir el mismo permiso que exige la pantalla, resuelto con la identidad de la credencial, nunca con datos del chat. Las opciones que mueven plata (pagos, precio, lista, descuento, impuestos, productos, cliente) SHALL exigir su permiso por acción. IF la credencial no es de una persona, o la persona es ambigua, inactiva o no tiene el permiso, THEN el sistema SHALL NOT escribir y SHALL decir qué falta.

#### Scenario: Vendedor sin permiso de pagos
- **WHEN** un vendedor con el menú de pedidos, pero sin permiso de pagos, intenta registrar un abono desde Claude
- **THEN** la herramienta responde que su rol no puede registrar pagos y no muestra la tarjeta de aprobación

### Requirement: Historial de cada cambio
Cada cambio aplicado SHALL dejar un evento del historial del pedido (D-541) con la persona, el origen «Claude/MCP», el antes → después, el motivo y los montos afectados. Una propuesta rechazada, vencida o cancelada SHALL NOT dejar evento.

#### Scenario: Nota agregada desde Claude
- **WHEN** una persona agrega una nota al pedido desde Claude y la aprueba
- **THEN** el historial muestra «Nota agregada», con su nombre, el origen «Claude/MCP» y el texto

### Requirement: Notas, observaciones y tarjeta de regalo (F1)
El MCP SHALL permitir agregar y editar las notas del pedido, las observaciones de entrega y la tarjeta de regalo de una línea (para, mensaje y de). Estos cambios SHALL NOT mover totales, pagos ni inventario.

#### Scenario: Corregir el mensaje de la tarjeta
- **WHEN** una persona cambia el mensaje de la tarjeta de «Feliz cumpleaños Ana» a «Feliz cumpleaños, Anita» y aprueba
- **THEN** la tarjeta del pedido queda con el mensaje nuevo, el total no cambia y el historial muestra el antes → después

### Requirement: Entrega, contacto, asesor y facturación (F2)
El MCP SHALL permitir cambiar la dirección, la ciudad, la fecha y la franja de entrega, el contacto de quien recibe, el asesor y los datos de facturación. IF el cambio altera el valor del domicilio, THEN SHALL NOT aplicarse en esta fase y SHALL indicar que se hace desde Katuq. IF el pedido ya está facturado, THEN los datos de facturación SHALL NOT cambiar desde el MCP.

#### Scenario: Cambio de ciudad con otro valor de domicilio
- **WHEN** una persona pide cambiar la entrega a una ciudad con otra tarifa de domicilio
- **THEN** la propuesta dice que ese cambio mueve el total y se hace desde Katuq, y no ofrece aprobar

### Requirement: Pagos (F3)
El MCP SHALL permitir registrar un pago total o un abono con monto, medio de pago, fecha, referencia y comprobante, y anular un pago con motivo obligatorio. El pago SHALL pasar por el mismo camino que usa la empresa en la pantalla (Gestión de pagos o Tesorería) y SHALL actualizar el estado de pago, el saldo y la cartera igual que en Katuq.

#### Scenario: Abono con comprobante
- **WHEN** una persona registra desde Claude un abono de $50.000 por transferencia, con referencia y comprobante, en un pedido de $200.000 con saldo $150.000, y aprueba
- **THEN** el pedido queda con saldo $100.000, la cartera lo refleja y el historial muestra el abono con el saldo $150.000 → $100.000

### Requirement: Plata y productos solo por el núcleo de vista previa (F4)
El cambio de precio de una línea y de lista de precios SHALL hacerse solo con la vista previa y la confirmación de D-543 y D-544, con sus mismas reglas. Agregar o quitar productos, cantidades, descuentos, impuestos y cambiar el cliente del pedido SHALL habilitarse en el MCP solo cuando la pantalla tenga para esa opción su propia vista previa y confirmación. Los efectos en inventario SHALL ocurrir solo por el camino del pedido que ya existe, y el MCP SHALL NOT escribir productos, precios de catálogo ni listas.

#### Scenario: Corregir un precio desde Claude
- **WHEN** una persona autorizada pide corregir de $200.000 a $20.000 el precio de una línea con precio editable
- **THEN** la tarjeta muestra la misma vista previa que la pantalla (línea, total, pagos y saldo) y, al aprobar, queda aplicada con su motivo

### Requirement: Lo que no se edita desde el MCP
IF se pide eliminar o duplicar un pedido, facturar o refacturar, cambiar un pedido cancelado o en estado final, un pedido con caja o Kuvo cerrados, un pedido POS o varios pedidos a la vez, THEN el MCP SHALL NOT ofrecer aprobación y SHALL indicar que se hace desde Katuq.

#### Scenario: Pedido entregado
- **WHEN** una persona pide desde Claude cambiar la dirección de un pedido entregado
- **THEN** la herramienta responde que ese pedido se revisa desde Katuq y no muestra la tarjeta

### Requirement: Multiempresa, datos personales y activación
Toda propuesta y todo cambio SHALL limitarse a la empresa de la credencial. IF el pedido es de otra empresa, THEN la respuesta SHALL ser la misma que si no existiera. Los logs SHALL NOT contener datos personales completos. Cada fase SHALL activarse con bandera por empresa, y una empresa sin la bandera SHALL conservar el comportamiento actual.

#### Scenario: Empresa sin la fase activa
- **WHEN** una empresa sin la bandera de la F3 pide registrar un pago desde Claude
- **THEN** la herramienta responde que esa opción aún no está disponible para la empresa y no escribe nada
