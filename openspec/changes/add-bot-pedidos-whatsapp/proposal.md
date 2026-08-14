## Why

Hoy un cliente que escribe por WhatsApp queriendo comprar cae en el buzón y espera a que un vendedor lo atienda a mano: le pregunte qué quiere, le busque el precio, le confirme si hay existencias y le digite el pedido. Fuera del horario laboral no hay quien conteste, y en hora pico el vendedor es el cuello de botella.

Toda la plomería para automatizarlo ya está puesta y andando en producción: el webhook de Kapso recibe los mensajes, `kapsoService` los contesta, el buzón los muestra, el saldo se cobra por mensaje y la lista de no contactar se respeta. Lo único que falta es el cerebro que atienda la conversación y deje el pedido armado. Este cambio lo agrega, con un límite deliberado: **el bot deja una cotización en borrador, nunca un pedido**, para que ningún módulo sensible (inventario, consecutivos de pedido, facturación) dependa de que el modelo no se equivoque.

## What Changes

- **Nuevo paso en el webhook de WhatsApp.** Después de persistir el mensaje entrante en `whatsapp_inbound`, si el comercio tiene el bot encendido y la conversación le corresponde, se despacha la atención a un proceso aparte. El webhook sigue respondiendo en menos de 3 segundos como exige Meta: no espera al modelo.

- **Agente conversacional de pedidos en KAI ADK, como un canal más al lado del de Telegram.** Habla español, entiende lo que el cliente pide en sus palabras, y usa herramientas del backend para responder con datos reales — nunca inventados:
  - buscar productos por nombre o referencia y cantar precio (`get_product_catalog`),
  - confirmar existencias antes de prometer (`get_product_stock`),
  - reconocer al cliente por su teléfono y traer sus datos (`get_customers`),
  - repetir o consultar pedidos anteriores del mismo cliente (`get_orders`).

- **Cierre en cotización, no en pedido.** Cuando el cliente confirma la lista, el bot crea una cotización en estado borrador con el carrito armado, los datos del cliente y el sello de que la trajo el bot. El vendedor la revisa en Katuq y la pasa a pedido con el botón que ya existe. El bot le confirma al cliente que su pedido quedó registrado y que un asesor lo confirma.

- **Servicio único de envío saliente.** Se extrae a un servicio compartido la lógica que hoy vive dentro del endpoint de responder del buzón (resolver teléfono, validar ventana de 24 horas, chequear lista de no contactar, enviar, descontar saldo, persistir el mensaje en el historial). El buzón y el bot pasan por el mismo camino, así que cada mensaje del bot se cobra, se registra y aparece en el hilo igual que uno escrito a mano.

- **Interruptor por comercio, apagado por defecto.** El bot se prende desde la pantalla de integraciones del comercio, junto a la configuración de WhatsApp que ya está ahí. Se puede apagar en cualquier momento sin tocar código ni reiniciar nada.

- **Traspaso a un humano.** Cuando un vendedor escribe en el hilo desde el buzón, el bot se calla en esa conversación y queda en manos del vendedor. Hay un botón para devolverle el hilo al bot. En el buzón se distingue a simple vista qué mensajes escribió el bot y cuáles una persona.

- **Guardarraíles duros.** El bot solo atiende comercios con número propio de Kapso; respeta la lista de no contactar; se detiene si el comercio se queda sin saldo; tiene tope de mensajes por conversación; y ante cualquier duda que no pueda resolver con datos reales, pasa el hilo a un humano en vez de improvisar.

## Capabilities

### New Capabilities
- `whatsapp-bot-pedidos`: cómo atiende el bot — qué entiende, qué herramientas usa para responder con datos verdaderos, cómo arma el carrito conversando y cómo cierra dejando la cotización en borrador.
- `whatsapp-bot-control`: quién puede prenderlo y bajo qué condiciones — encendido por comercio, exigencia de número propio, lista de no contactar, saldo, topes, traspaso a un humano y rastro de lo que hizo.

### Modified Capabilities
Ninguna. La única capacidad publicada en `openspec/specs/` es `design-system`, y este cambio la cumple sin modificarla. El buzón de WhatsApp vive en las specs históricas (`/specs/009`), y este cambio le **agrega** el distintivo de bot y el traspaso sin alterar lo que ya hace.

## Impact

**Backend (`katuq_admin_back_firebase`)**
- `controllers/whatsappWebhook.js` — despacho al bot después de persistir, sin bloquear la respuesta del webhook.
- `services/whatsappCompanyConfig.js` — campos nuevos de configuración del bot dentro de la config que ya existe por comercio (no hay colección nueva para esto).
- `routers/whatsappConversations.js` — la lógica de responder se extrae al servicio compartido; el endpoint queda llamándolo. Es refactor sin cambio de comportamiento para el buzón.
- Servicios nuevos: el orquestador del bot y el servicio compartido de envío saliente.
- `tools/` — se reusan las herramientas de lectura que ya existen; se agrega la de crear cotización, envuelta con el filtro de compañía.
- `controllers/cotizaciones.js` — se marca el origen de la cotización; sin cambio de comportamiento para las que se crean a mano.

**KAI ADK (`kai/adk_agent`)**
- Canal nuevo `channels/whatsapp/` con la misma forma que el de Telegram, que en su propio código se define como "un adaptador de transporte" sobre el cerebro de ADK. Se reusan la memoria de conversación por empresa, el puente MCP a las herramientas de Katuq y el patrón de escritura con confirmación humana.
- **Verificado en producción:** ADK está activo (servicio `kai-adk` por systemd, puerto 8080, expuesto como `back.katuq.com/adk`). **Se despliega con systemd, no con PM2** — mirar solo `pm2 list` hace creer que no está.

**Frontend (`Seller.Katuq`)**
- Pantalla de integraciones de WhatsApp: interruptor del bot y sus ajustes.
- Buzón: distintivo visual de los mensajes del bot, aviso de que el bot está atendiendo y botones de tomar/devolver el hilo.
- Cotizaciones: filtro y distintivo para ver las que entraron por WhatsApp.

**Memoria de la conversación (aprobado por Daniel, 2026-08-11)**
- El carrito a medio armar vive en una **subcolección bajo la configuración de WhatsApp del comercio** — un documento por conversación, con borrado automático a los pocos días. No se crea colección nueva de primer nivel, el dato queda aislado por empresa y el carrito es exacto en vez de reconstruido a ojo por el modelo. Se descartó crear la cotización desde el primer producto porque cada conversación abandonada quemaría un consecutivo.

**No-goals (queda explícitamente afuera)**
- El bot **no crea pedidos**, no reserva ni descuenta inventario, no toca consecutivos de pedido ni factura.
- No cobra ni cierra pagos por el chat.
- No atiende Instagram ni Facebook: esos buzones tienen otra identidad de conversación.
- No reemplaza ni modifica los envíos de campañas ni las notificaciones transaccionales.
- No se prende sobre el número compartido de Julsmind: ese número reparte el mismo mensaje a varias empresas y el bot contestaría duplicado.

**Riesgos**
- *Que el bot prometa algo que no hay.* Se ataca obligándolo a responder solo con lo que devuelven las herramientas y a consultar existencias antes de confirmar.
- *Que se dispare el gasto.* Cada mensaje del bot cuesta saldo real; sin tope, una conversación en bucle se vuelve plata. Se ataca con tope por conversación y freno por saldo.
- *Que un cliente quede hablando con una máquina sin salida.* Se ataca con traspaso a un humano ante duda, ante pedido explícito del cliente y al llegar al tope.
- *Que se rompa el buzón al extraer el servicio de envío.* Es el riesgo real del refactor: el endpoint de responder está vivo y cobra. Se ataca dejando el comportamiento idéntico y probándolo antes de conectar el bot.
