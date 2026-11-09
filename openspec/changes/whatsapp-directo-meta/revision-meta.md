# Solicitud de revisión de Meta: guion y textos

App `katuq` (`2191585237986547`), negocio Julsmind. Se piden cuatro permisos en un solo envío.

En el rechazo del 26-ago, Meta pidió tres tomas en cada video (D-249):
1. el activo escogido a la vista;
2. el envío real desde la pantalla de Katuq;
3. el mensaje llegando a la app nativa.

Todo lo que sigue está armado alrededor de esas tres tomas.

## Antes de grabar

- **Grabación:** pantalla completa, nunca solo una ventana, porque la ventana de Meta abre aparte. Resolución 1440 o 1920 de ancho, con zoom del navegador al 100 %.
- **Teléfono A:** el del comercio de prueba. En el modo celular tiene WhatsApp Business; en el modo número nuevo, el número de Katuq.
- **Teléfono B:** el del cliente de prueba, con WhatsApp, Messenger e Instagram instalados. Se muestra en espejo en la pantalla (QuickTime o scrcpy) al lado del navegador, así los dos lados quedan en la misma toma.
- **Datos:** sesión de FLORECER, notificaciones del Mac en «No molestar», y ningún chat ni contacto personal en los teléfonos.
- **Subtítulos:** en inglés, uno por paso, quemados en el video. La interfaz se queda en español; Meta lo acepta así.
- Si algo personal entra en cuadro, se corta, se borra la toma y se graba otra vez.

## Video 1: `whatsapp_business_messaging` (unos 2 minutos)

| # | Pantalla | Subtítulo |
|---|----------|-----------|
| 1 | Katuq → Integraciones → Líneas de WhatsApp | "A business owner opens Katuq to connect their WhatsApp number." |
| 2 | «Conectar número» → «Un número nuevo para Katuq» | "They choose to connect a WhatsApp Business number." |
| 3 | La ventana de Meta: escoge el negocio, la cuenta y **el número, que se ve en pantalla** | "Meta's Embedded Signup: the business selects its WhatsApp Business Account and phone number." |
| 4 | De vuelta en Katuq: la línea «Conectada», con el número | "The number is now connected to Katuq." |
| 5 | El teléfono B escribe «Hola, ¿tienen velas de lavanda?» al número | "A customer sends a WhatsApp message to the business." |
| 6 | Buzón de Katuq: entra el chat y se abre | "The message arrives in Katuq's inbox in real time." |
| 7 | La respuesta se escribe y se envía desde Katuq | "The business replies from Katuq." |
| 8 | **El teléfono B en espejo: llega la respuesta** | "The reply is delivered to the customer's WhatsApp app." |

## Video 2: `whatsapp_business_management` (unos 90 segundos)

| # | Pantalla | Subtítulo |
|---|----------|-----------|
| 1 | Katuq → Plantillas de WhatsApp, con la línea conectada | "Katuq lets the business manage message templates on its own WhatsApp Business Account." |
| 2 | Crear la plantilla `confirmacion_pedido` (Utilidad), con el texto y la vista previa | "The business creates a template from Katuq." |
| 3 | Enviar: el estado queda «En revisión» | "Katuq submits it to the business's WhatsApp Business Account." |
| 4 | WhatsApp Manager de Meta, en otra pestaña: la misma plantilla | "The same template appears in WhatsApp Manager." |
| 5 | De vuelta en Katuq: el estado se actualiza al aprobarse, o se muestra la lista de plantillas | "Katuq shows the template status reported by Meta." |
| 6 | Enviar esa plantilla al teléfono B y verla llegar | "An approved template is sent and delivered to the customer." |

## Video 3: `pages_messaging` (unos 90 segundos)

| # | Pantalla | Subtítulo |
|---|----------|-----------|
| 1 | Katuq → Integraciones → Meta → «Conectar Facebook» | "The business connects its Facebook Page to Katuq." |
| 2 | La ventana de Meta: **la página `Katuq` escogida y a la vista** | "Facebook Login for Business: the business selects its Page." |
| 3 | La conexión en Katuq: «Conectada · Katuq» | "The Page is connected." |
| 4 | El teléfono B, en Messenger, le escribe a la página | "A customer sends a message to the Page on Messenger." |
| 5 | El buzón de Facebook en Katuq: entra el mensaje y se responde | "The business reads and replies from Katuq's Facebook inbox." |
| 6 | **El teléfono B en espejo: la respuesta en Messenger** | "The reply is delivered in the customer's Messenger app." |

## Video 4: `instagram_manage_messages` (unos 90 segundos)

Es el mismo guion del video 3, con la cuenta `@katuq_` escogida a la vista, el mensaje desde Instagram en el teléfono B, la respuesta desde el buzón de Instagram en Katuq y la respuesta vista en Instagram Direct.

## Descripciones por permiso (para pegar en el panel)

**whatsapp_business_messaging**
> Katuq is a commerce platform for small businesses in Colombia. Businesses connect their own WhatsApp Business number to Katuq through Embedded Signup. Katuq uses this permission to receive customer messages in the business's Katuq inbox and to send replies, order confirmations, and approved template messages on behalf of that business, only to customers who contacted the business or opted in. Messages are sent only from the business's own number.

**whatsapp_business_management**
> Katuq uses this permission to read the WhatsApp Business Account and phone numbers that a business shared with Katuq during Embedded Signup, to subscribe Katuq's app to that account's webhooks, and to let the business create and track the status of its own message templates from Katuq. We only access accounts that the business explicitly shared with our app.

**pages_messaging**
> Businesses connect their Facebook Page to Katuq to answer customer Messenger conversations from Katuq's inbox, next to their orders and customer records. Katuq uses this permission to receive Page messages through webhooks and to send replies written by the business within the standard messaging window.

**instagram_manage_messages**
> Businesses connect their Instagram professional account to Katuq to answer Instagram Direct messages from Katuq's inbox. Katuq uses this permission to receive Instagram messages through webhooks and to send replies written by the business within the standard messaging window.

## Instrucciones para el revisor

> 1. Go to https://sellercenter.katuq.com and sign in with the test user provided in the "Test credentials" field.
> 2. WhatsApp: open Integrations → WhatsApp lines → "Connect number", complete Meta's Embedded Signup, then open Messages → WhatsApp to read and reply. Templates are under Marketing → WhatsApp templates.
> 3. Facebook / Instagram: open Integrations → Meta, connect a Page or Instagram account, then open Messages → Facebook or Instagram.
> 4. The interface is in Spanish; the screencasts include English subtitles for every step.

El usuario de prueba de FLORECER se crea solo para la revisión, con su contraseña en el campo privado de credenciales de Meta, y se borra cuando Meta responda. Nunca se escribe en este archivo.
