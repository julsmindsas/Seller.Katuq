## Why

Para la feria Effix (16 al 18 de octubre de 2026; todo listo el 15) Daniel pidió dos cosas por WhatsApp que la tienda hoy no tiene:

1. **Confirmar los pedidos contra entrega.** Hoy, al comprar contra entrega, la tienda le dice al comprador "Te contactaremos para confirmarlo" y alguien del comercio tiene que escribirle o llamarle a mano. Mientras tanto el pedido ya reservó existencias y nadie sabe si es real.
2. **Recuperar carritos abandonados.** Hoy el recordatorio solo sale por **correo**, y solo si el comprador dejó correo: `guardarCarrito` descarta el carrito que llega sin correo. Quien compra con teléfono y sin correo nunca recibe nada.

Daniel aprobó el plan. Falta que apruebe **este diff** antes de aplicarlo: toca el checkout de la tienda, el webhook de WhatsApp y una cancelación que devuelve existencias, que son módulos sensibles.

Esta propuesta no mide producción (no se leyó ni se escribió nada allá): se apoya solo en el código y en la documentación pública de Kapso y Meta, citada en `design.md`.

## What Changes

**Regla de Daniel:** toda función nueva nace **apagada** para los comercios que ya operan (ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS) y se enciende comercio por comercio. Se prueba primero en FLORECER (empresa demo). La bandera vive en el documento de la empresa: `featureFlags.<nombre>`; ausente o distinta de `true` = apagada. Cada función tiene la suya, y con la bandera apagada todo queda **idéntico** a hoy (solo cambian lecturas de la bandera, listadas en `design.md`).

### 1. Confirmación del pedido por WhatsApp — bandera `whatsappOrderConfirmation`

| | Qué pasa |
|---|---|
| Al crear un pedido **contra entrega** en una tienda | El comprador recibe la plantilla `katuq_order_confirm_v1` (UTILITY) con dos botones: **Confirmar** y **Cancelar**. Sale una sola vez por pedido, por la misma compuerta de las demás notificaciones de pedido (`ORDER_NOTIF_UNIFIED_COMPANIES`), el canal de WhatsApp del comercio ya aceptado y el saldo prepago de siempre. El saludo lleva el nombre del comprador **solo si parece un nombre**: un enlace o un correo escrito en el campo "nombre" se reemplaza por "cliente" |
| El pedido | Queda con `confirmacionWhatsapp: { estado, fecha }` (`pendiente`, `confirmado` o `cancelado`). **Va aparte de los estados**: `estadoPago` y `estadoProceso` no se tocan al confirmar |
| La lista de pedidos | Muestra una etiqueta **Por confirmar** (o Confirmado, Pidió cancelar) solo en los pedidos que tienen la marca, y no la deja pegada: "Por confirmar" se va cuando el pedido sale a despacho; "Pidió cancelar", al entregarse |
| **Confirmar** | Solo cambia la marca |
| **Cancelar** | Si nadie ha movido el pedido (ni pago, ni factura, ni orden de envío, **ni un mensajero que ya lo tomó**): devuelve las existencias con el mecanismo que ya existe para las cancelaciones (`restoreStock`) y lo deja en Cancelado. Si ya está en proceso: no lo cancela, le avisa al comprador que escriba al comercio y deja a la vista que pidió cancelar |
| Dos toques a la vez | Gana uno solo y las existencias se devuelven **una sola vez**, aunque el primer toque todavía esté devolviéndolas o Meta entregue el mismo toque dos veces. El otro recibe "estamos cancelando tu pedido" |
| Respuestas | Cada respuesta al comprador se cobra del saldo del comercio: un resultado que se repite ("ya estaba confirmado") se avisa **una sola vez** por pedido |
| Seguridad | Solo cuenta el toque del **dueño del teléfono del pedido**, y solo si el pedido es de la empresa dueña del número que recibió el toque. Solo cuenta el botón de la plantilla, nunca una respuesta interactiva del bot de pedidos. Si el sondeo de respaldo de mensajes entrantes guarda el toque antes que el webhook, igual se decide |

**Por qué la marca va aparte y no como un estado nuevo:** los estados de pago y de proceso tienen consumidores por todo el sistema (tesorería, despachos, facturación, métricas, cobro de la suscripción, integraciones). Un valor nuevo en esos enums se filtraría a cada uno. Con un campo propio solo cambia lo que lee ese campo. La única excepción es **Cancelar**, que sí pasa el pedido a `Cancelado` (el mismo valor que ya usan Shopify y Osmosis).

### 2. Carrito abandonado por WhatsApp — bandera `whatsappCartRecovery`

| | Qué pasa |
|---|---|
| Checkout de la tienda | Aparece una casilla, **desmarcada siempre**, con el texto: "Autorizo que esta tienda me escriba por WhatsApp para recordarme mi carrito si no termino mi compra. Puedo dejar de recibir mensajes respondiendo BAJA." Solo en tiendas cuyo plan manda recordatorios (en el plan gratis no se pinta: el mensaje nunca saldría) |
| Carrito | Se acepta **con solo teléfono** si la casilla está marcada y es un **celular colombiano**. El carrito guarda el texto exacto que la persona vio, su versión, el momento, el teléfono y una huella de su origen (IP y navegador, sin guardarlos en claro) (Ley 1581). Desmarcarla después retira el permiso de todo carrito suyo; si vuelve con correo y permiso, el carrito que había dejado por teléfono se da por vencido |
| Recordatorio | A la hora sin pedido, la plantilla `katuq_cart_reminder_v1` (MARKETING) con el enlace firmado del carrito. Se cobra del saldo prepago de siempre y respeta la lista de "no contactar" (BAJA). **Solo en el horario de la Ley 2300** (lunes a viernes 7-19, sábados 8-15, sin domingos ni festivos); fuera de él el carrito espera |
| Topes contra el abuso | **Un recordatorio por día por teléfono y empresa** (no por carrito: otro correo no abre otro mensaje), **200 por día por empresa** (`WHATSAPP_CARRITO_TOPE_DIARIO`) y **60 carritos con permiso por hora y por tienda** al guardarlos |
| Correo | Si el recordatorio salió por WhatsApp, el correo no se repite. Si no pudo salir, el correo sale como respaldo |
| Comprar | Cierra el carrito (también el que quedó solo con teléfono). El que ya recibió el mensaje se conserva, marcado como comprado, porque guarda la prueba del permiso |

### 3. Las plantillas ante Meta

`functions/scripts/kapso-registrar-plantillas.js` registra las dos. Es **simulacro por defecto** (no abre la red); `--execute` solo lo corre Daniel, y si no puede comprobar que una plantilla ya existe no la crea. Los textos finales y los riesgos de rechazo están en `design.md`.

## Capabilities

### New Capabilities
- `whatsapp-order-confirmation`: confirmación y cancelación del pedido contra entrega desde WhatsApp, con su etiqueta en la lista de pedidos.
- `whatsapp-cart-recovery`: permiso, carrito con solo teléfono, topes contra el abuso, horario y recordatorio por WhatsApp.

### Modified Capabilities
- Ninguna archivada. El carrito abandonado por correo (`tienda-carrito-abandonado`, backend) conserva su comportamiento y es la base de la segunda.

## Impact

- **Backend** (cuatro grupos de archivos, tres parches independientes entre sí):
  - Confirmación: `services/whatsappConfirmacionPedido.js` (nuevo), `services/kapsoService.js` (`sendTemplate` acepta botones; sin botones el envío es idéntico), `services/notifications/orderNotificationService.js` (un llamado, detrás de la compuerta de siempre), `controllers/whatsappWebhook.js` (reconoce el toque del botón y se lo pasa al servicio **después** de responderle a Meta; el bot de pedidos nunca lo recibe), `services/kapsoInboundPoller.js` (si el sondeo guarda el toque primero, también se lo pasa al servicio).
  - Carrito: `services/whatsappRecuperacionCarrito.js` (nuevo), `utils/siteCarrito.js`, `controllers/sites.js` (`guardarCarrito`, `cerrarCarritoAlComprar`, `recordarCarritosAbandonados`, el render), `routers/sites.js` (el freno por tienda), `utils/siteHtml.js`, `utils/siteTienda.js`.
  - Plantillas: `scripts/kapso-registrar-plantillas.js` (nuevo).
- **Front:** solo la etiqueta en la lista de pedidos (`ventas/list`). No necesita la bandera: sin el campo en el pedido no se pinta nada.
- **Datos, sin colecciones nuevas:**
  - `orders`: `confirmacionWhatsapp` (con `cancelacionIniciadaEn`, `avisados` y demás rastro), `waNotifSent.ORDER_CONFIRM` y, solo al cancelar, los estados y el rastro de siempre.
  - `prospects` (el carrito): `carrito.whatsapp.*`.
  - `whatsapp_usage`: la fila de cada envío y, justo antes de enviar, su **reserva del día** por empresa y teléfono (sin fecha de envío ni teléfono completo hasta tener resultado, así el buzón no la muestra). `whatsapp_balance`: el cobro de siempre y un contador diario de recordatorios por empresa.
- **Write-set declarado (inventario y Shopify):** `inventory` e `inventoryMovement` solo a través de `restoreStock`, al cancelar. **Nunca** `products`, variantes, precios, listas de precios ni Shopify. El contrato de las pruebas falla si el servicio los menciona.
- **Módulos sensibles tocados:** checkout de la tienda (un argumento más al cerrar el carrito), pedidos (cancelación) e inventario (reutiliza `restoreStock`, no lo modifica). Van con diff y aprobación explícita, un paquete a la vez.
- **Pruebas existentes que se actualizan** (`scripts/test-sitios-publicacion.js`): el texto exacto de la llamada a `cerrarCarritoAlComprar` (ahora lleva el teléfono), la guarda del interruptor del correo de carrito (su ancla de texto cambió y la comparación habría pasado en vacío: ahora falla si el ancla desaparece) y la línea de la ruta del carrito (lleva el freno por tienda).

## Risks

- **Meta puede rechazar o reclasificar las plantillas.** Desde el 9 de abril de 2025, una plantilla UTILITY que Meta considere MARKETING se aprueba **como MARKETING** (cambia el precio del mensaje, no el flujo). Detalle en `design.md`.
- **El permiso de WhatsApp es autoafirmado:** alguien podría escribir el teléfono de otra persona en el checkout, y nadie lo verifica con un código. Lo acotan, **de verdad y con pruebas**: un recordatorio por día por teléfono y empresa; 200 por día por empresa; 60 carritos con permiso por hora y tienda; solo celulares colombianos; la huella del origen; el nombre que no puede ser un enlace; el horario de la Ley 2300; la salida BAJA y el saldo del comercio. **Sigue sin ser una verificación**: por eso `whatsappCartRecovery` se enciende primero solo en FLORECER, y para comercios reales hace falta la verificación por código (fuera de alcance) o una decisión expresa de Daniel.
- **El número compartido de Katuq lo usan varios comercios:** el marketing de uno afecta la calidad del número de todos, y su cupo diario de destinatarios únicos es de todos. Con los topes, el peor día de una empresa son 200 destinatarios; encender la función en varias empresas a la vez los suma.
- **No se verificó en vivo la forma exacta del toque del botón** (`button.payload`, `type: button`). Es la primera prueba en FLORECER; si Kapso lo entregara de otra forma, el respaldo es resolver el pedido por `context.id`.
- **Ventana de cerca de un segundo al cancelar:** entre que se reclama la cancelación y se escribe el estado, el comercio podría mover el pedido. Si ocurre, gana la cancelación (las existencias ya volvieron, así el inventario queda coherente) y lo que hubiera hecho el comercio (por ejemplo aprobar un pago) se resuelve a mano. Cerrarla del todo exige cambiar `restoreStock`, que es de alto impacto y queda fuera.
- **`restoreStock` no distingue "no había nada que devolver" de "no pude leer los movimientos":** si un pedido que sí descontó al crearse devuelve cero movimientos, queda una advertencia en el registro y la cifra en el historial de estados; no se bloquea la cancelación.
- **Una edición de pedido hecha desde una pantalla abierta antes de la respuesta del comprador** puede devolver la marca a "Por confirmar" (el front manda el pedido completo). Solo afecta la etiqueta; no se arregla aquí para no tocar `updateOrderInternal`.
- **El aviso de "pedido recibido" que ya existe** también saluda con el nombre del comprador sin filtrarlo; esta propuesta lo corrige solo en sus dos mensajes. Queda como pendiente aparte.

## No-goals

- Cambiar los estados de pago o de proceso, o agregar valores nuevos a sus enums.
- Tocar productos, precios, listas de precios, Shopify o la lógica de inventario (solo se **llama** a `restoreStock`; no se modifica).
- Verificación por código del teléfono (doble confirmación) del permiso de WhatsApp.
- Mensajes de WhatsApp para otros eventos, otros tipos de pago o pedidos que no son de la tienda.
- Cambiar el precio por mensaje (hoy es uno solo para todas las plantillas) o repartir el marketing en otro número.
- Una pantalla para que el comercio encienda las banderas (las enciende Daniel con el script de la Fundación).
- Aceptar números de otros países en el recordatorio de carrito (hasta que exista la verificación por código).
