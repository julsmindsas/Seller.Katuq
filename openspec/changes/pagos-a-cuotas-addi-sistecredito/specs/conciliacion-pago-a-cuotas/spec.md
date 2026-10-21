## ADDED Requirements

### Requirement: Evento crudo antes de procesar
WHEN llega una notificación de Addi o de Sistecrédito, THE system SHALL guardar el evento crudo, con el proveedor y la hora, antes de cualquier validación o cambio en el pedido. Los datos personales SHALL NOT quedar en claro en los logs.

#### Scenario: Notificación que falla la validación
- **WHEN** llega una notificación que no pasa la autenticación
- **THEN** el evento crudo queda guardado y marcado como rechazado, y el pedido no cambia

### Requirement: Autenticidad de la notificación de Addi
WHEN Addi notifica el resultado de un intento, THE system SHALL aceptar la notificación solo si se cumplen tres condiciones: las credenciales de la notificación coinciden con las del comercio dueño del intento (comparación en tiempo constante), la referencia corresponde a un intento de un pedido de ese comercio, y el monto aprobado y la moneda coinciden con el total del pedido. IF falla la autenticación, THEN THE system SHALL responder no autorizado sin cambiar el pedido. WHEN la notificación es válida, THE system SHALL responder éxito devolviendo el mismo contenido recibido.

#### Scenario: Credenciales de otro comercio
- **WHEN** llega una notificación con las credenciales válidas del comercio A para un intento del comercio B
- **THEN** se rechaza y el pedido de B no cambia

#### Scenario: Monto aprobado distinto
- **WHEN** Addi notifica APPROVED con un monto distinto al total del pedido
- **THEN** el pago no se aplica, el pedido queda pendiente y se abre una alerta para el equipo

### Requirement: Autenticidad del resultado de Sistecrédito
WHEN llega una notificación de Sistecrédito o la conciliación revisa un intento, THE system SHALL obtener el estado consultando la transacción en la API de Sistecrédito, con las llaves del comercio dueño del intento. Solo SHALL aplicarlo si el identificador de la transacción, la factura y el valor coinciden con el intento guardado. THE system SHALL NOT tomar el estado del contenido de la notificación. THE system SHALL responder éxito a toda notificación de Sistecrédito, sea válida o no.

#### Scenario: Notificación falsa de aprobación
- **WHEN** alguien envía una notificación que dice «Approved» para un intento que en Sistecrédito sigue pendiente
- **THEN** el pedido sigue pendiente

#### Scenario: Notificación incompleta
- **WHEN** llega una notificación sin factura ni estado legibles, pero con el identificador de la transacción
- **THEN** el intento se ubica por ese identificador y su estado se toma de la consulta

### Requirement: Un pago se aplica una sola vez
THE system SHALL aplicar el resultado de un intento al pedido como máximo una vez, aunque lleguen notificaciones duplicadas o simultáneas, reintentos del proveedor o una conciliación al mismo tiempo. IF un pedido ya está aprobado por un intento, THEN otro intento o notificación SHALL NOT cambiarlo a rechazado.

#### Scenario: Tres notificaciones simultáneas de una aprobación
- **WHEN** Sistecrédito envía tres notificaciones a la vez para la misma transacción aprobada
- **THEN** el pedido queda aprobado una vez, con un solo correo de pago aprobado y sin un segundo descuento de inventario

#### Scenario: Rechazo tardío de un intento viejo
- **WHEN** el pedido ya está aprobado por el intento 2 y llega el rechazo del intento 1
- **THEN** el pedido sigue aprobado y el rechazo queda registrado solo en el intento 1

#### Scenario: Dos intentos aprobados
- **WHEN** el pedido ya está aprobado por el intento 2 y llega la aprobación del intento 1, o la de un pago con Wompi del mismo pedido
- **THEN** la segunda no se aplica (sin segundo correo ni segundo descuento) y el pedido queda con una alerta de doble aprobación que dice con qué se pagó

#### Scenario: Pagado con Wompi y Sistecrédito aprueba sin avisar
- **WHEN** el comprador pagó con Wompi un pedido de Sistecrédito y, minutos después, Sistecrédito aprueba el intento anterior sin enviar notificación
- **THEN** la conciliación lo encuentra (sigue consultando ese intento durante la reserva de Sistecrédito más la hora de gracia) y deja la alerta de doble aprobación

### Requirement: Mapeo de estados
THE system SHALL traducir los estados del proveedor a los estados de pago de la tienda: aprobado → «Aprobado»; rechazado, declinado, cancelado, fallido, expirado o abandonado → «Rechazado» del intento, con el pedido pendiente para poder reintentar; pendiente o en curso → sin cambio. IF el proveedor envía un estado desconocido o un error interno, THEN THE system SHALL dejar el pedido sin cambio y abrir una alerta.

#### Scenario: Comprador que abandona en Addi
- **WHEN** Addi notifica ABANDONED
- **THEN** el intento queda abandonado y el comprador todavía puede pagar el pedido desde «pagar» mientras la reserva no venza

### Requirement: Aviso de rechazo al comprador
WHEN el proveedor rechaza el último intento de un pedido que sigue apartado, THE system SHALL escribirle al comprador una sola vez con el enlace de «pagar» para reintentar con el mismo proveedor y, si la tienda cobra en línea, para pagar el mismo pedido con Wompi, con la hora hasta la que sigue apartado. El pedido SHALL seguir Pendiente hasta que venza la reserva.

#### Scenario: Addi rechaza el crédito
- **WHEN** Addi notifica REJECTED para el último intento de un pedido apartado
- **THEN** el pedido sigue Pendiente y el comprador recibe un correo con «Intentar de nuevo con Addi» y «Pagar con tarjeta, PSE o Nequi»

#### Scenario: Rechazo de un intento viejo
- **WHEN** llega el rechazo de un intento anterior mientras otro más nuevo sigue en curso
- **THEN** no se le escribe al comprador

#### Scenario: Vuelve de Addi y todavía no hay respuesta
- **WHEN** el comprador vuelve de Addi a la página de gracias y la solicitud sigue en curso
- **THEN** la página dice «Esperando la respuesta de Addi», pregunta sola y se actualiza cuando Addi responde

#### Scenario: Vuelve de Addi y no lo aprobaron
- **WHEN** el comprador vuelve de Addi con la firma de su pedido y Addi no aprobó
- **THEN** la página lo dice, con la hora hasta la que sigue apartado, y ofrece «Intentar de nuevo con Addi» y, si la tienda cobra en línea, «Pagar con tarjeta, PSE o Nequi»

#### Scenario: Gracias sin la firma
- **WHEN** alguien abre la página de gracias de un pedido rechazado escribiendo solo su número
- **THEN** la página dice que el pago no se aprobó y remite al correo si salió (o a la tienda si el comercio tiene apagado ese correo), sin enlaces para pagar

### Requirement: Conciliación de Sistecrédito
WHILE un intento de Sistecrédito está pendiente y no ha vencido, THE system SHALL consultar su estado periódicamente y aplicar el resultado con las mismas garantías de autenticidad e idempotencia. WHEN el comprador vuelve a la tienda desde Sistecrédito, THE system SHALL consultar ese intento antes de mostrarle el resultado.

#### Scenario: Notificación que nunca llega
- **WHEN** Sistecrédito aprueba el crédito y no envía ninguna notificación
- **THEN** la conciliación aprueba el pedido antes de que venza la reserva

#### Scenario: Aprobación tardía en la hora de gracia
- **WHEN** el pedido ya se anuló por vencimiento hace 40 minutos y Sistecrédito lo aprobó
- **THEN** la conciliación lo ve, aplica el pago y el pedido revive; pasada la hora de gracia ya no se consulta

### Requirement: Vencimiento de la reserva
WHILE un pedido a cuotas sigue sin pago aprobado, THE system SHALL mantener la reserva de inventario hasta el vencimiento de su proveedor (Addi 150 minutos, Sistecrédito 60 minutos desde el último intento), sin pasar de dos reservas desde la creación del pedido. Al vencer, SHALL anularla por el mismo camino de los pedidos en línea sin pagar, aunque la tienda no reciba pedidos nuevos ni tenga pagos de Wompi atrasados. Antes de anular un pedido de Sistecrédito, SHALL consultar cada intento sin resultado. IF después llega una aprobación válida, THEN THE system SHALL revivir el pedido como lo hace hoy con un pago tardío.

#### Scenario: Addi aprueba a los 90 minutos
- **WHEN** Addi aprueba un pedido 90 minutos después de crearse
- **THEN** el pedido no se anuló, queda aprobado y el inventario sigue descontado una sola vez

#### Scenario: Pedido de Wompi sin cambios
- **WHEN** vence un pedido pagado con Wompi sin pago
- **THEN** se anula a los 60 minutos, igual que hoy

#### Scenario: Tienda sin movimiento
- **WHEN** una tienda sin pedidos nuevos ni pagos de Wompi atrasados tiene un pedido de Addi creado hace 160 minutos
- **THEN** el barrido periódico lo anula y devuelve la mercancía

#### Scenario: Un pago entra mientras se anula
- **WHEN** el barrido está anulando un pedido a cuotas vencido y en ese momento llega su aprobación
- **THEN** el pedido no queda pagado y anulado: si el pago entró antes de marcarlo, no se anula; si entró después, revive y la mercancía se descuenta una sola vez

#### Scenario: Sistecrédito aprobó y no avisó
- **WHEN** vence un pedido de Sistecrédito cuyo primer intento aprobó sin notificar
- **THEN** la consulta previa lo encuentra, el pago se aplica y el pedido no se anula

### Requirement: Inventario y catálogo intactos
THE system SHALL NOT escribir productos, variantes, catálogo, precios ni listas de precios en ningún paso del pago a cuotas. El inventario SHALL moverse solo por la reserva al crear el pedido, la liberación al vencer y la restitución al revivir, que ya existen.

#### Scenario: Pago aprobado
- **WHEN** se aplica un pago aprobado de Addi o de Sistecrédito
- **THEN** los documentos de productos y de precios del comercio quedan idénticos a como estaban antes
