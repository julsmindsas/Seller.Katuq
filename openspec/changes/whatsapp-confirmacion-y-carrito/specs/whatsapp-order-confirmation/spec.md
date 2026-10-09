## ADDED Requirements

### Requirement: Bandera por comercio, apagada de fábrica
La confirmación por WhatsApp SHALL funcionar solo para las empresas cuyo documento tenga `featureFlags.whatsappOrderConfirmation` en `true`. Con la bandera ausente, con otro valor o si no se puede leer, el sistema SHALL comportarse exactamente como antes: no envía mensajes, no procesa respuestas, no escribe nada en el pedido y la lista de pedidos no cambia. Apagar la bandera SHALL detener también las respuestas de mensajes ya enviados.

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** una tienda sin la bandera recibe un pedido contra entrega, o llega un toque de botón de un mensaje enviado cuando la bandera estaba encendida
- **THEN** no se envía nada, no se cobra saldo, el pedido y el inventario quedan como están y la lista se ve igual que hoy (solo cambia una lectura de la bandera por cada pedido contra entrega de una tienda)

### Requirement: Envío único al crear un pedido contra entrega de la tienda
Con la bandera encendida, al crearse un pedido contra entrega de una tienda el sistema SHALL enviarle al comprador, una sola vez por pedido, la plantilla `katuq_order_confirm_v1` con los botones Confirmar y Cancelar, siempre que la empresa haya pasado la compuerta común de notificaciones de pedido (`ORDER_NOTIF_UNIFIED_COMPANIES`), su canal de WhatsApp esté encendido y aceptado, use un número real (no el de pruebas de Meta), tenga saldo prepago y el pedido tenga un teléfono válido. El cobro SHALL ser el de siempre por mensaje.

#### Scenario: Pedido contra entrega con todo listo
- **WHEN** se crea el pedido en la tienda de una empresa con todo lo anterior
- **THEN** el comprador recibe el mensaje con el número de pedido, el total y los dos botones, se descuenta un mensaje del saldo y el pedido queda marcado "pendiente" de confirmar

#### Scenario: Pedido que no es contra entrega o no es de la tienda, o falta saldo, canal o teléfono
- **WHEN** el pedido se paga en línea, nace en venta asistida, punto de venta o una integración, o al comercio le falta saldo, canal aceptado o el teléfono no sirve
- **THEN** no se envía nada, el pedido sigue su curso y, si faltaba algo del comercio, el motivo queda en su historial de WhatsApp

#### Scenario: El mismo pedido avisado por dos vías
- **WHEN** el aviso de pedido nuevo llega dos veces por el mismo pedido
- **THEN** se envía una sola confirmación y se cobra una sola vez

### Requirement: El nombre del comprador solo entra al mensaje si es un nombre
El saludo SHALL llevar solo la primera palabra del nombre del comprador, y únicamente si parece un nombre propio (letras con tildes, apóstrofo y guion). Si esa palabra trae un enlace, un correo, un número o símbolos, el sistema SHALL saludar como "cliente" y NO SHALL intentar rescatar un pedazo.

#### Scenario: Un nombre con enlace
- **WHEN** el comprador escribe como nombre "http://sitio.ejemplo/entrar María" o "bit.ly/3xYzAb"
- **THEN** el mensaje dice "Hola cliente" y no contiene ningún enlace

### Requirement: Marca visible, aparte de los estados
El pedido SHALL guardar `confirmacionWhatsapp` con `estado` (`pendiente`, `confirmado` o `cancelado`) y `fecha`, escrito solo cuando el mensaje salió, sin cambiar `estadoPago` ni `estadoProceso` salvo al cancelar. La lista de pedidos SHALL mostrar una etiqueta solo en pedidos con la marca que no estén caídos, y SHALL NOT dejarla pegada: "Por confirmar" desaparece cuando el pedido sale a despacho, "Pidió cancelar" cuando se entrega o se cierra, y "Canceló por WhatsApp" solo aparece si el pedido de verdad quedó cancelado.

#### Scenario: El comercio ve qué falta
- **WHEN** el comprador aún no responde
- **THEN** el pedido aparece en la lista con "Por confirmar" junto a sus estados de siempre

### Requirement: Confirmar
Cuando el dueño del teléfono del pedido toque Confirmar, el sistema SHALL marcar `confirmado` y responderle "Confirmamos tu pedido", sin cambiar estados, totales ni inventario.

#### Scenario: Confirmar dos veces
- **WHEN** el comprador toca Confirmar de nuevo, o Meta reentrega el aviso
- **THEN** la fecha de confirmación no cambia y no se repite la decisión

### Requirement: Cancelar por el flujo existente
Cuando el dueño del teléfono toque Cancelar y nadie haya movido el pedido (proceso `SinProducir` o `ParaDespachar`, pago `Pendiente`, sin pagos asentados, sin factura hecha ni en curso, sin mensajero que lo haya tomado, sin orden de envío ni guía), el sistema SHALL devolver las existencias con el mecanismo que ya existe para las cancelaciones, dejar el pedido en `Cancelado` con su rastro y responderle al comprador. Si el pedido ya fue movido, SHALL NOT cancelarlo ni tocar existencias, SHALL avisarle al comprador que escriba al comercio y SHALL dejar a la vista del comercio que pidió cancelar.

#### Scenario: Cancelación normal
- **WHEN** el comprador cancela un pedido recién creado
- **THEN** las unidades vuelven a la bodega de la que salieron, el pedido queda cancelado y el comprador recibe la confirmación

#### Scenario: Cancelar un pedido que ya está en proceso
- **WHEN** el comprador toca Cancelar y el comercio ya despachó, aprobó el pago, registró un pago o un mensajero ya tomó el pedido
- **THEN** el pedido no cambia, el comprador recibe "ya está en proceso y no lo podemos cancelar por aquí" con la indicación de escribir al comercio, y la lista muestra "Pidió cancelar"

#### Scenario: Dos toques casi al mismo tiempo, o el mismo toque entregado dos veces
- **WHEN** llegan dos toques de Cancelar seguidos o simultáneos, aunque el primero todavía esté devolviendo las existencias, o Meta entrega el mismo toque dos veces a la vez
- **THEN** gana uno solo, las existencias se devuelven una sola vez y el otro toque recibe "estamos cancelando tu pedido" sin tocar el inventario

#### Scenario: Una cancelación quedó a medias
- **WHEN** la marca de cancelación lleva más de dos minutos sin que el pedido quede cancelado y el comprador vuelve a tocar Cancelar
- **THEN** se retoma solo si el pedido sigue sin moverse (la regla de arriba se exige de nuevo); si el comercio lo movió mientras tanto, no se cancela y queda a la vista que el comprador lo pidió

#### Scenario: Falla la devolución de existencias
- **WHEN** la devolución no se puede completar
- **THEN** el pedido queda como estaba, el comprador recibe un mensaje claro y puede volver a intentarlo

### Requirement: Cada resultado se avisa una sola vez
Cada respuesta al comprador se cobra del saldo del comercio. El sistema SHALL avisar una sola vez por pedido cada resultado que se repite ("ya estaba confirmado", "ya estaba cancelado", "ya está en proceso", "estamos cancelando"), SHALL NOT responder al reenvío de un toque que ya decidió, y los toques que sigan SHALL quedar solo en el registro.

#### Scenario: Quien toca el botón una y otra vez
- **WHEN** el comprador toca Confirmar cinco veces
- **THEN** recibe un mensaje de confirmación y uno de "ya estaba confirmado"; los otros tres toques no gastan saldo

### Requirement: Un toque guardado primero por el respaldo también se decide
Si el sondeo de respaldo de mensajes entrantes guarda el toque antes de que llegue el aviso del webhook, el sistema SHALL decidirlo igual (el aviso posterior es un duplicado) y SHALL NOT dejarlo sin respuesta.

#### Scenario: El respaldo llega primero
- **WHEN** el respaldo guarda el toque de Cancelar y luego llega el aviso del webhook con el mismo mensaje
- **THEN** el pedido se cancela una sola vez y el comprador recibe una sola respuesta

### Requirement: Solo cuenta el dueño del teléfono y de la empresa
El sistema SHALL ignorar el toque si el teléfono que lo envía no es uno de los del comprador del pedido, si el pedido no es de la empresa dueña del número que lo recibió, o si el pedido nunca recibió la confirmación. El contenido del botón SHALL servir solo para saber qué pedido leer, nunca para autorizar. Solo SHALL contar el toque de un botón de la plantilla (`type: button`): una respuesta interactiva del bot de pedidos nunca se desvía a la confirmación, aunque su identificador se parezca.

#### Scenario: Otro teléfono, otra empresa o un pedido inventado
- **WHEN** el toque llega desde otro número, al número de otro comercio o con el id de un pedido que no existe
- **THEN** no se cambia nada, no se responde y queda un registro sin el teléfono completo

### Requirement: Lenguaje claro, rastro y write-set cerrado
Todo texto que vea el comprador SHALL ser español claro que diga qué pasó y qué hacer, sin códigos ni jerga; los registros SHALL usar el teléfono enmascarado. El sistema SHALL escribir únicamente en el pedido (la marca y, al cancelar, los estados y su historial), en `inventory` e `inventoryMovement` a través de la devolución existente, y en el saldo y el historial de WhatsApp. SHALL NOT crear ni modificar productos, variantes, precios, listas de precios ni nada en Shopify.

#### Scenario: Producto, variantes, precio y listas de precios permanecen sin cambios
- **WHEN** se envían, confirman y cancelan pedidos con la confirmación
- **THEN** el maestro de productos, sus variantes, los precios, las listas de precios y el catálogo de Shopify quedan idénticos
