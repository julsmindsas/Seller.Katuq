## Context

- **Decisión:** D-??? (el número lo asigna quien haga el commit, mirando `CONTRACT.md` del remoto).
- **Hoy, el pedido contra entrega de la tienda** nace con `formaDePago: "Contra entrega"`, `estadoPago: "Pendiente"` y `estadoProceso: "SinProducir"` o `"ParaDespachar"` (`utils/siteOrden.js`). `crearPedido` descuenta existencias al crearlo (`inventoryService.updateByPOS`, D-204) y avisa por `orderNotificationService.notify(..., "order_created")`.
- **Notificaciones de pedido:** `notify` es el punto único. Para las empresas que pasan `ORDER_NOTIF_UNIFIED_COMPANIES` marca `notificationsSent.order_created` (idempotencia) y delega en los hooks; para las demás es "dark-launch".
- **Cancelaciones que devuelven existencias:** `inventoryService.restoreStock(pedido, { company, userEmail, reason })` es idempotente y escribe `INGRESO_DEVOLUCION_CANCELACION`, pero revisa esa idempotencia (`_hasBeenRestored`) **fuera** de su transacción: dos llamadas simultáneas para el mismo pedido devuelven doble. Lo usan la edición de pedidos, el transportador y el vencimiento de reservas de la tienda (`vencerReservasDeTienda`, D-206).
- **WhatsApp:** `kapsoService.sendTemplate` solo mandaba el componente `body`. El webhook (`/v1/whatsapp/webhook`) ya firma, guarda el mensaje crudo en `whatsapp_inbound` y enruta por dueño del número; su `extractTextBody` ya conocía `button`, pero no extraía el `payload`. Un sondeo de respaldo (`kapsoInboundPoller`, cada 30 s) guarda los mismos mensajes por el mismo camino (`persistInbound`): el que llegue segundo ve un duplicado.
- **Pedido tomado por un mensajero:** `carrierOffers.claimCarrierOffer` solo escribe `transportador`, `transportadorId` y `asignacionMensajero`; el pedido sigue en `ParaDespachar` hasta que lo recoge. La orden de envío se guarda en el pedido como `shippingOrder`.
- **Horario del marketing:** `utils/ventanaEnvio.js` (Ley 2300 de 2023) ya rige las campañas y el remarketing por correo (D-318).
- **Banderas por comercio:** contrato común de la Fundación, `services/companyFeatureFlags.js` → `isFeatureEnabled(company, flag)`. Lee un documento por pregunta, no lanza y cualquier duda es "apagada". Este cambio **no la reimplementa**: la usa.
- **Carrito abandonado hoy:** `guardarCarrito` exige correo; el id del prospecto sale del correo; `recordarCarritosAbandonados` (tarea de las 5 minutos, candado `CARRITO_ABANDONADO_CRON_ENABLED`) manda un correo a la hora, una vez por día. En plan gratis no sale (`recordatorioCarrito: false`).

## Goals / Non-Goals

**Goals**
- Dos funciones, cada una con su bandera, que con la bandera apagada no cambian nada.
- Reutilizar lo que ya existe: la compuerta de notificaciones, el canal y el saldo de WhatsApp, `restoreStock`, el webhook firmado.
- Que Cancelar sea seguro: no cancela solo lo que alguien ya empezó a mover.
- Que el diff se pueda revisar en minutos: la lógica de negocio vive en dos servicios nuevos; en lo ya existente solo hay llamados pequeños.

**Non-Goals** — ver `proposal.md`.

## Decisions

1. **Banderas.** `whatsappOrderConfirmation` y `whatsappCartRecovery`, ya en el catálogo de la Fundación. Todo punto de entrada las consulta y cualquier fallo de lectura cuenta como apagada. Apagar la de confirmación **detiene también las respuestas**: es el interruptor de emergencia. Dueño: Daniel. Retiro propuesto: 2027-01-31 (Art. XII), cuando los cuatro comercios la tengan encendida y estable.

2. **Dónde sale la confirmación.** Dentro de `orderNotificationService.notify`, después de la marca de idempotencia y antes de delegar en los hooks, solo para `order_created`. Ahí heredamos **gratis** dos cosas: la compuerta `ORDER_NOTIF_UNIFIED_COMPANIES` (una empresa no migrada sigue en "dark-launch") y "una sola vez por pedido sin importar la vía". `crearPedido` **no cambia** en este paquete, así que las pruebas que ejecutan su código real siguen intactas. El servicio filtra: solo pedidos con `siteId` y `formaDePago` "Contra entrega".
   - *Alternativa descartada:* llamarla desde `crearPedido`. Obliga a cambiar el contexto de varias pruebas y se salta la compuerta.
   - *Consecuencia a decidir:* para probar en FLORECER, FLORECER tiene que estar en `ORDER_NOTIF_UNIFIED_COMPANIES` (o el flag global encendido). Ver Open Questions.

3. **Envío directo, no por la cola.** `notificationQueue` mezcla en una función larga las compuertas, el cobro y el reintento de **todas** las notificaciones de pedido. Para la confirmación (un caso con botones) y el carrito (marketing, desde un cron) se prefirió un camino explícito y probable, con las mismas piezas: `whatsappCompanyConfig.isOptedIn` (canal aceptado), `getHealth` (número real, no el de pruebas de Meta), `whatsappBillingService.canSend`/`debit` (saldo prepago) y `whatsappUsageService` (rastro en el buzón). Un envío que falla se registra como fallo y no se reintenta: `sendTemplate` ya reintenta los errores 5xx por su cuenta.
   - La marca de "una vez" es `waNotifSent.ORDER_CONFIRM`, la misma convención de la cola (D-104), puesta **antes** de enviar y **después** de revisar el saldo, para que un pedido sin saldo todavía pueda salir si recargan.

4. **La marca `confirmacionWhatsapp`, aparte de los enums.** Se escribe **después** de que el mensaje salió (así "Por confirmar" nunca miente), con `{ estado, fecha, enviadaEn, mensajeId }`. `mensajeId` es el id del mensaje que mandamos: respalda la validación de empresa cuando el número es compartido. Al responder se agregan `respuestaId` (el `wamid` del toque que decidió: sirve para ignorar reentregas), `estadoPrevio` y `cancelacionIniciadaEn` (mientras se cancela), `avisados` (qué resultados repetidos ya se le dijeron al comprador) y, si pidió cancelar sin poder, `cancelacionSolicitadaEn`. Un envío simulado no marca nada.

5. **El toque del botón.** `leerRespuesta(msg)` reconoce SOLO `type: "button"` (`button.payload`, el caso de las plantillas), con el patrón estricto `confirm:<id>` / `cancel:<id>`. Las respuestas `interactive` son del bot de pedidos (sus botones llevan ids que él inventa: la herramienta de opciones acepta cualquier valor) y no se le pueden quitar, aunque el id se parezca. Escribir ese texto a mano **no** cuenta. `persistInbound` ya guardó el mensaje crudo (Art. V); el controlador responde 200 a Meta y **después** llama a `responder`. Un toque reconocido nunca llega al bot de pedidos.
   - **Webhook y sondeo de respaldo.** El sondeo (`kapsoInboundPoller`, cada 30 s mientras `WHATSAPP_INBOUND_POLL` no sea `false`) guarda los mensajes por el mismo camino y, si llega antes que el webhook, este ve un duplicado y no decidiría nada: el toque se perdía. Ahora el sondeo también llama a `responder` cuando guarda un toque nuevo. `responder` es idempotente, así que quien llegue segundo no repite nada.
   - **Nunca se confía en el payload para autorizar** (Art. X). El id solo dice qué documento leer. Autoriza: (a) que quien toca sea el dueño de un teléfono del pedido (`mismoTelefono`: dígitos iguales, o 10 dígitos contra `57`+10; nunca coincidencia parcial) y (b) que el pedido sea de la empresa dueña del número: con número propio, la empresa del número; con el compartido, la empresa inferida **o** el mensaje que cita el toque (`context.id`) es el que esa empresa mandó por ese pedido.
   - *Verificar en FLORECER:* que Meta devuelva en `button.payload` el texto que mandamos, y que lo entregue como `type: button`. Kapso documenta el envío con payload propio; Meta no lo repite en sus páginas actuales. Si no volviera, el respaldo es resolver el pedido por `context.id` contra `confirmacionWhatsapp.mensajeId` (ya se guarda).

6. **Cancelar.** Se reclama la decisión dentro de una transacción (`pendiente` o `confirmado` → `cancelado`, con `estadoPrevio` y `cancelacionIniciadaEn`); luego `restoreStock(..., { reason: "Cancelado" })`; luego `estadoProceso` y `estadoPago` en `Cancelado`, el sello `fechaAnulacion` (D-332) y el historial de estados.
   - **Solo se cancela solo** lo que nadie movió: `estadoProceso` en `SinProducir` o `ParaDespachar`, `estadoPago` en `Pendiente`, sin pagos asentados, sin factura hecha ni en curso (`nroFactura`, `facturaSiigo`, `pdfUrlInvoice`, `facturacionElectronica`, `facturacionEnProceso`) y **sin movimiento logístico**: ni mensajero que lo tomó (`transportador`, `transportadorId`, `asignacionMensajero`: tomar un pedido solo escribe eso, el estado sigue en `ParaDespachar`), ni orden de envío (el pedido guarda `shippingOrder`; `nroShippingOrder` es el número dentro de la orden) ni guía. Lo demás lo resuelve una persona; el comprador recibe un mensaje claro y la lista muestra **Pidió cancelar**. Otros agentes que sumen marcas de "ya lo movieron" al pedido (alistamiento, rutas) deben sumarlas a `puedeCancelarse`.
   - **Dos toques a la vez.** `restoreStock` revisa su idempotencia (`_hasBeenRestored`) **fuera** de su transacción: dos corridas simultáneas la pasan las dos y devuelven doble. Por eso quien gana la reclamación deja `cancelacionIniciadaEn`, y mientras esa hora tenga menos de dos minutos cualquier otro toque (o el mismo toque entregado dos veces) responde "estamos cancelando" y NO llama a `restoreStock`. Un mismo mensaje (`wamid`) ya decidido se ignora.
   - **Retomar.** Si la marca dice "cancelado" y el pedido no, y ya pasaron los dos minutos (el proceso murió), el siguiente toque retoma, pero **vuelve a exigir** `puedeCancelarse` sobre el pedido fresco: si el comercio lo movió mientras tanto, la marca vuelve a su estado previo y queda "Pidió cancelar". Si las existencias ya habían vuelto cuando algo falló, la marca **no** se suelta (soltarla dejaría existencias devueltas con el pedido vivo): el siguiente toque, pasado el plazo, termina el trabajo sin devolver doble. Solo si `restoreStock` mismo falla (no devolvió nada) se suelta la marca para que reintente de inmediato.
   - **Una respuesta por resultado.** Cada respuesta se cobra del saldo del comercio. Los resultados que se repiten (`ya_confirmado`, `ya_cancelado`, `no_se_puede_cancelar`, `en_curso`) se avisan una vez por pedido (`confirmacionWhatsapp.avisados`); los toques siguientes quedan en el registro con `silencioso: true`.
   - **Lo que no se cierra.** Entre la reclamación y la escritura final pasa cerca de un segundo; si el comercio mueve el pedido justo ahí, gana la cancelación (las existencias ya volvieron y el inventario queda coherente). Cerrarlo del todo exigiría cambiar `restoreStock` (alto impacto). `restoreStock` tampoco distingue "no había nada que devolver" de "no pude leer los movimientos": si un pedido que descontó al crearse devuelve cero, queda una advertencia en el registro y la cifra en el historial de estados.
   - *Por qué no `updateOrderInternal`:* es la edición completa de pedidos (recalcula totales, notifica, factura) y su rollout de inventario puede ser "transaccional", que **no** es el inverso de la reserva que hace la tienda (`updateByPOS`). La tienda ya cancela por su cuenta con `restoreStock` + escritura directa (`vencerReservasDeTienda`); este cambio sigue ese precedente y suma lo que ese camino no tiene: el sello D-332 y el historial.

7. **Carrito.** El permiso es una autorización **aparte** de la de publicidad por correo (D-318). El carrito con solo teléfono usa el mismo prospecto (`prospects`, `tipo: "carrito-abandonado"`) con id derivado del teléfono (`carrito_` + hash de sitio y teléfono); el del correo conserva su id de siempre. La prueba del permiso se guarda **campo por campo** (`carrito.whatsapp.*`) para no pisar la constancia del envío, y el recordatorio le escribe **solo al número que quedó en esa prueba**, no al que figure después en el contacto.
   - Solo la tienda con la bandera encendida **y un plan que manda recordatorios** pinta la casilla y manda `whatsappConsent` (true o false); sin ese campo el servidor no hace nada nuevo. Por eso `guardarCarrito` no lee la bandera de las tiendas apagadas.
   - **El permiso es autoafirmado**, y este diseño no lo esconde: quien llena el formulario declara que el teléfono es suyo y nadie lo verifica con un código. Lo que impide que eso se vuelva una máquina de escribirle a terceros (y de gastar el cupo diario de destinatarios del número compartido, que es de todos los comercios) son estos topes, todos con prueba:
     1. **Un recordatorio por día por teléfono y empresa.** Justo antes de enviar, una transacción reserva la fila del envío en `whatsapp_usage` (id determinístico por empresa, teléfono y día de Colombia). Si ya existe, no se envía. Tres carritos con tres correos y el mismo teléfono dan **un** mensaje; el correo de los otros carritos sigue su camino. La reserva no se libera si el envío falla (un intento por día) y, hasta tener resultado, la fila no lleva fecha de envío ni teléfono, así que el buzón no la muestra.
     2. **Tope diario por empresa** (200; `WHATSAPP_CARRITO_TOPE_DIARIO`, 0 los detiene): un contador `recordatoriosCarrito {dia, enviados}` en el documento de saldo de la empresa, dentro de la misma transacción de la reserva. No pide índices ni colecciones nuevas.
     3. **Freno por tienda al guardar:** 60 carritos con `whatsappConsent: true` por hora y tienda (`express-rate-limit` con `porSitio`, como el de pedidos), además del límite por visitante que ya existía. Los carritos que no piden WhatsApp ni se cuentan.
     4. **Solo celulares colombianos** (3xx xxx xxxx, con o sin 57). Un número internacional puede costarle al comercio más que los 80 COP fijos y no hay cómo comprobar que sea de quien lo escribió.
     5. **Huella de origen** (IP y navegador, firmados con el secreto del servidor, sin guardarlos en claro) en la prueba del permiso. No prueba quién es la persona; deja rastro y permite ver que muchos permisos salieron de un mismo origen.
     6. **Nombre filtrado:** el saludo solo lleva la primera palabra si parece un nombre propio; un enlace, un correo o un número escrito (o armado con el correo o el teléfono cuando no dejó nombre) se cambia por "cliente".
   - **Horario (Ley 2300 de 2023).** El recordatorio es marketing por definición, así que sale solo de lunes a viernes de 7:00 a 19:00 y sábados de 8:00 a 15:00 (hora de Colombia, sin domingos ni festivos): el mismo horario que `utils/ventanaEnvio.js` ya aplica a las campañas por correo (D-318). Se decide en la tarea **antes** de la marca de "recordado" (decidirlo dentro de `recordar` quemaría el carrito): fuera del horario el carrito sigue abierto y la primera corrida dentro del horario lo toma, mientras no se cumpla su día de vigencia; un carrito dejado el sábado a las 3 p. m. vence el lunes sin recordarse. Un carrito con permiso y correo espera también para el correo (WhatsApp va primero, el correo es el respaldo). **Validación legal pendiente**, igual que en D-318. La confirmación del pedido es transaccional y no usa esta ventana.
   - **Permiso retirado a tiempo.** Desmarcar la casilla retira el permiso del carrito por correo y del carrito por teléfono; y la tarea vuelve a leer el carrito dentro de la transacción de reclamo: si lo retiró entre la lectura y el envío, no se le escribe por WhatsApp (y si no queda otro canal, el carrito ni se marca).
   - **Un solo carrito por persona.** Si quien dejó solo el teléfono vuelve con correo y permiso, el carrito del teléfono se marca como vencido (sigue en "Tus contactos" con su constancia) para que no reciba dos recordatorios ni cuente dos "recuperados".
   - En la tarea de recordatorios, la bandera se lee **una vez por empresa por corrida** y solo si algún carrito trae permiso.
   - El plan gratis sigue sin recordatorio (por ningún canal). El interruptor del correo de carrito abandonado no frena a WhatsApp; WhatsApp tiene su bandera y su permiso.
   - La plantilla de marketing va por `sendTemplate` (`/messages`), como las demás. Kapso ofrece además `/marketing_messages` (la API de marketing de Meta); no hace falta y queda como decisión futura.
   - Si Kapso o Meta dicen que la persona ya detuvo el marketing (`marketing_preference_stopped`, 131050), se anota en "no contactar" y no se insiste.

8. **Front.** `etiquetaConfirmacionWhatsapp(pedido)` devuelve texto, color y ayuda según la marca, o `null`. Se pinta en la fila y el detalle de la vista dividida y en la tabla, reutilizando las insignias existentes (sin SCSS nuevo). No consulta la bandera: la marca existe solo si la función estuvo encendida. Un pedido caído no se muestra "por confirmar", y las señales no se quedan pegadas: "Por confirmar" desaparece cuando el pedido sale a despacho; "Pidió cancelar" se mantiene mientras el pedido siga en camino (es justo cuando importa) y desaparece al entregarse o cerrarse; "Canceló por WhatsApp" solo aparece si el pedido de verdad quedó cancelado. (Angular 14 no tiene `@if`: se usa `*ngIf`, como el resto del archivo.)

## Las plantillas (para que Daniel las revise antes de enviarlas a Meta)

**`katuq_order_confirm_v1`** — categoría **UTILITY**, idioma `es`

> Hola {{1}}, recibimos tu pedido {{2}} en {{3}}. El total es {{4}} y lo pagas cuando lo recibas. ¿Quieres que lo preparemos y te lo enviemos?
>
> *Pie:* Si no hiciste este pedido, toca Cancelar.
> *Botones de respuesta rápida:* **Confirmar** · **Cancelar**

Variables: {{1}} nombre del comprador · {{2}} número de pedido · {{3}} nombre del comercio · {{4}} total (por ejemplo `$85.000`). Ejemplo enviado a Meta: María, FLO-000123, Florecer, $85.000. Cada botón lleva su payload: `confirm:<id del pedido>` y `cancel:<id del pedido>`.

**`katuq_cart_reminder_v1`** — categoría **MARKETING**, idioma `es`

> Hola {{1}}, dejaste productos en tu carrito de {{2}} y los tenemos guardados para ti. Termina tu compra aquí: {{3}}
>
> Si no quieres recibir más mensajes, responde BAJA.

Variables: {{1}} nombre · {{2}} nombre de la tienda · {{3}} enlace firmado del carrito (`siteCarrito.urlCarrito`). Sin botones: el enlace va en el cuerpo porque cada tienda tiene su propio dominio y un botón de enlace exige una base fija en la plantilla. "BAJA" ya agrega el número a la lista de "no contactar" del comercio (D-098).

**Reglas de Meta que ya cumplen** (revisadas por el script antes de enviar): cuerpo de máximo 1024 caracteres; ninguna variable al principio ni al final; variables en orden y con un ejemplo cada una; pie de máximo 60 sin variables; botones de máximo 25 caracteres; nombre en minúsculas, números y guion bajo.

**Riesgos de rechazo, de mayor a menor:**
1. **La de confirmación puede aprobarse como MARKETING.** Meta pide que utilidad sea "no promocional" y "específica de la persona o pedida por ella"; confirmar, actualizar o cancelar un pedido es utilidad, pero el texto **no puede** sugerir, recomendar ni vender más. El nuestro no lo hace. Si Meta la reclasifica, queda aprobada como MARKETING (cuesta más y cuenta como marketing para las bajas): el script avisa cuando la categoría devuelta no es la pedida.
2. **La de carrito es marketing por definición:** Meta pone "dejaste X en tu carrito" como ejemplo de *retargeting*. No se disfraza de utilidad. Riesgo de calidad: si muchos receptores bloquean o reportan, baja la calificación del número, y el número compartido es de todos los comercios.
3. **Variable que es un enlace.** Es válido, pero Meta puede pedir un ejemplo más realista. El ejemplo es una URL con la forma real.
4. **Plantillas duplicadas o demasiado parecidas a otra del mismo número** se rechazan; no hay otra igual.
5. Una vez enviada a revisión **no se edita**: un cambio de texto es `_v2` con su propia aprobación.

**Fuentes consultadas el 2026-10-08** (también en el encabezado del script):
- Kapso: `docs.kapso.ai/api/meta/whatsapp/templates/create-or-update-message-template.md` (`POST /meta/whatsapp/v24.0/{business_account_id}/message_templates`, cabecera `X-API-Key`), `…/docs/whatsapp/templates/buttons.md` (botones de respuesta rápida y su `payload` al enviar), `…/templates/lifecycle.md`, `…/templates/marketing-opt-outs.md` (422 `marketing_preference_stopped`; "no reintentar"), `…/api/meta/whatsapp/messages/send-a-marketing-message.md`, `…/api/platform/v1/phone-numbers/list-phone-numbers.md` (`business_account_id`).
- Meta: `developers.facebook.com/docs/whatsapp/business-management-api/message-templates/` y `…/components/` (1024, 60, 25, 10 botones), `…/updates-to-pricing/new-template-guidelines/` (utilidad vs marketing; reclasificación), `…/documentation/business-messaging/whatsapp/templates/template-review.md` (motivos de rechazo) y `…/webhooks/reference/messages/button.md` (forma del toque).

## Verificación contra la constitución

| Artículo | Cómo se cumple |
|---|---|
| I y XIV | Esta propuesta, con checkpoint antes de implementar; la decisión se registra como D-??? en `CONTRACT.md` |
| IV (idempotencia) | `waNotifSent.ORDER_CONFIRM` + `notificationId` determinístico en el cobro; transacciones sobre la marca; `cancelacionIniciadaEn` para que dos toques a la vez no llamen dos veces a `restoreStock` (cuya revisión de idempotencia corre fuera de su transacción); un mismo `wamid` decidido se ignora; la reserva del día del recordatorio es una transacción; una reentrega de Meta no repite nada |
| V (crudo antes de procesar) | `persistInbound` guarda el mensaje crudo antes de que el servicio lo vea; la decisión corre después |
| VII (observabilidad) | Logs de una línea con `correlationId`; el buzón y `whatsapp_usage` guardan envíos, fallos y omisiones con su motivo |
| VIII (test-first de contratos) | Pruebas de contrato de la forma del envío (botones), del toque (webhook) y del write-set |
| X (webhooks) | Firma HMAC existente; el payload nunca autoriza; teléfono y empresa se validan contra el pedido |
| XI (datos sensibles) | El teléfono completo no se loguea (máscara); la prueba del permiso vive en el carrito, no en logs; la IP y el navegador del permiso se guardan solo como huella firmada, nunca en claro |
| XII (flags con dueño y fecha) | Dueño Daniel, retiro 2027-01-31, tarea 7.2 |
| XIII | Cada spec cabe en 3 páginas |
| XV | Sin campos de integraciones nuevos |

## Risks / Trade-offs

- **[Cancelar mal]** → Solo cancela lo que nadie movió (incluido un mensajero que ya lo tomó); dos toques a la vez devuelven las existencias una sola vez; si `restoreStock` falla se suelta la marca y el comprador reintenta; si algo falla DESPUÉS de devolver, la marca se queda y el siguiente intento termina sin devolver doble. Queda una ventana de cerca de un segundo entre la reclamación y la escritura final (ver decisión 6).
- **[Doble mensaje al comprador]** → Con la confirmación encendida, el comprador puede recibir también el "pedido recibido" de siempre (si ese aviso está activo para el comercio). Decisión abierta abajo.
- **[Lecturas con la bandera ausente]** → La función nace apagada y no cambia lo que se ve ni lo que se cobra, pero sí agrega lecturas (la Fundación no tiene caché: una pregunta es un documento, solo el campo `featureFlags`): (a) una por cada pedido contra entrega de una tienda, antes de cualquier otro filtro; (b) una por cada render sin caché de HTML de una tienda que vende y cuyo plan manda recordatorios (el HTML se guarda 60 s; la clave de caché incluye `fbclid` y `utm`, así que el tráfico de pauta casi siempre es un fallo de caché; en plan gratis ya no se lee); (c) un `get` más por compra, el del carrito por teléfono, que sin la bandera no existe; (d) una por empresa por corrida del recordatorio, y solo si algún carrito trae permiso. Las dependencias pesadas del servicio de confirmación ya no se arman antes de mirar la bandera. Si (b) pesara, la salida es llevar `featureFlags` en la lectura de la marca de la empresa, que ya se guarda 5 minutos; no se hizo aquí porque saltaría el contrato de la Fundación y cambiaría de 60 s a 5 min lo que tarda en verse un cambio de bandera.
- **[Autoafirmado]** → Ver `proposal.md`: topes reales (un recordatorio por día por teléfono y empresa, 200 por día por empresa, 60 carritos por hora y tienda, solo celulares colombianos, huella de origen, horario, nombre filtrado), pero no es una verificación.
- **[Cupo del número compartido]** → El cupo diario de destinatarios únicos del número compartido es de todos los comercios. El peor día de una empresa son 200 destinatarios de marketing; encender la función en varias empresas los suma. Quien la encienda en más de una debe mirar el tope (`WHATSAPP_CARRITO_TOPE_DIARIO`).
- **[Tarea de recordatorios apagada]** → Si `CARRITO_ABANDONADO_CRON_ENABLED` no es `true` en producción, no sale ningún recordatorio, ni por correo ni por WhatsApp.
- **[Horario]** → Un carrito con permiso que se deja cuando el horario está cerrado puede vencer sin recordarse (sábado en la tarde, domingo); es el costo de la Ley 2300, y la validación legal sigue pendiente como en D-318.
- **[Código del error de Kapso]** → `sendTemplate` descarta `code` cuando Kapso responde `{ error: "...", code }`; por eso un 422 de marketing detenido puede quedar como "Kapso 422". No se reintenta de todos modos; mejorar el mensaje es un cambio aparte.
- **[El aviso de "pedido recibido" de siempre]** → También saluda con el nombre del comprador sin filtrarlo (`services/notifications/whatsappTemplates.js`); no se toca aquí.

## Migration Plan

1. Aplicar los parches **en cualquier orden** (son independientes): confirmación (back y front), carrito, plantillas. Con las banderas apagadas no cambia nada.
2. Daniel revisa los textos y corre `node scripts/kapso-registrar-plantillas.js` (simulacro); luego, con su aprobación, `--execute`. Espera la aprobación de Meta (`--status`).
3. En FLORECER: enciende `whatsappOrderConfirmation` y prueba punta a punta (ver `LEEME.md` del parche). Luego `whatsappCartRecovery`.
4. Encender por comercio, uno a la vez, después de la feria o con su visto bueno.
5. **Reversa:** apagar la bandera del comercio detiene envíos y respuestas al instante, sin desplegar. Para sacar el código: `git apply -R` de los parches. Lo ya escrito (`confirmacionWhatsapp`, `carrito.whatsapp`) queda inofensivo.

## Open Questions

1. **¿La confirmación depende de `ORDER_NOTIF_UNIFIED_COMPANIES`?** Se dejó que sí, como el "pedido recibido" de WhatsApp. Si Daniel prefiere que dependa solo de su bandera, se mueve el llamado al inicio de `notify` (el servicio ya tiene su propia marca de "una vez").
2. **¿Se suprime el "pedido recibido" de WhatsApp cuando sale la confirmación?** Hoy no; el comercio puede apagar `order_created` en sus preferencias.
3. **¿WhatsApp y correo a la vez, o WhatsApp primero y el correo de respaldo?** Quedó lo segundo.
4. **¿Hace falta verificar el teléfono (código por mensaje) antes de encender el carrito por WhatsApp en comercios reales?** La recomendación es que sí: con los topes el daño de un abuso está acotado, pero el permiso sigue siendo autoafirmado. Mientras tanto, solo FLORECER.
5. **Precio del mensaje:** hoy es uno solo (80 COP) para utilidad y marketing; Meta cobra más por marketing.
6. **¿Tiene FLORECER número propio o usa el compartido?** Define cómo se atribuye el toque del botón y de quién es el cupo diario de destinatarios que consume el carrito.
7. **¿Cuánto debe ser el tope diario por empresa?** Quedó en 200 como red de seguridad; se cambia con `WHATSAPP_CARRITO_TOPE_DIARIO` (requiere reiniciar el backend). Apagar la bandera de la empresa es el interruptor inmediato.
8. **¿Se suma una compuerta propia para el sondeo de respaldo?** Hoy corre cada 30 s salvo `WHATSAPP_INBOUND_POLL=false`, y ahora también decide los toques que guarda primero.
