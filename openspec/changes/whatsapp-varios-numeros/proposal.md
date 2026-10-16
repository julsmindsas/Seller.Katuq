# WhatsApp con varios números por comercio, asignados a vendedores

## Why

Los comercios atienden ventas por WhatsApp con varios números: uno por vendedor o
uno por línea de negocio. Hoy Katuq solo admite **un** número por comercio. Además,
el buzón no tiene dueño por chat. Dos personas pueden responder el mismo chat al
tiempo, y si un cliente le escribe a dos números del mismo comercio, los dos chats
se ven como uno solo. Daniel lo pidió como necesidad prioritaria el 2026-10-15:
"conectar n cantidades de WhatsApp, que se pueda asignar a un vendedor y que no se
pisen los chats".

## What Changes

- **Conectar N números por comercio, sin intervención nuestra.** Desde la pantalla
  de WhatsApp, el administrador del comercio pulsa "Conectar número" y sigue el
  enlace de conexión de Kapso, donde inicia sesión en Meta y verifica el número.
  Al volver, el número queda en la lista con su nombre, teléfono y estado. Se puede
  repetir tantas veces como números tenga el comercio.
  - El número puede seguir usándose en el WhatsApp Business del celular
    (coexistencia) o quedar solo en Katuq. Lo escoge el comercio al conectarlo.
- **Cada número se asigna a uno o varios vendedores**, y se puede cambiar cuando se
  quiera.
- **Un chat es la conversación de un cliente con un número.** El mismo cliente
  escribiéndole a dos números son dos chats distintos.
- **Cada chat tiene un solo dueño.**
  - Si el número tiene un solo vendedor, el chat queda suyo desde el primer mensaje.
  - Si tiene varios, queda del primero que lo toma o responde.
  - Solo el dueño puede escribir en el chat.
  - El dueño puede soltarlo para devolverlo al grupo del número.
  - El administrador puede pasarlo a otro vendedor.
- **El vendedor ve solo los chats de sus números y los que le asignaron.** La
  familia Administrador ve todos. El filtro se aplica en el servidor.
- **La respuesta sale siempre por el número del chat.** La ventana de 24 horas se
  cuenta por número.
- **Cobro (decisión de Daniel, 2026-10-15):** Katuq le paga a Meta. Cada mensaje
  que sale de cualquier número del comercio descuenta del saldo prepago de WhatsApp,
  como hoy con el número compartido (D-044).
- **Lo que se envía desde el celular, con coexistencia, también se ve en el chat de
  Katuq**, sin descontar saldo.
- **El número compartido de Katuq sigue igual.** Las notificaciones, el bot piloto
  de ALMARA, el reparto de entrantes D-094 y la visibilidad actual de sus chats no
  cambian.
- **Todo se enciende con una bandera por comercio** (`whatsappMultiNumero`, Art. XII).

## Capabilities

### New Capabilities
- `whatsapp-numeros-comercio`: conectar, listar, desconectar y asignar a vendedores
  los N números de WhatsApp de un comercio. Incluye la llegada de mensajes por
  número y la salida por el número correcto.
- `whatsapp-asignacion-chats`: chat por cliente y número, dueño único, tomar,
  soltar y pasar, y visibilidad por vendedor en el buzón.

### Modified Capabilities
_(ninguna: no hay specs de WhatsApp en `openspec/specs/`; las de `specs/009*` son
históricas y siguen describiendo el número compartido, que no cambia)_

## No-goals

- Reparto automático por turnos (round-robin), tiempos de respuesta comprometidos
  (SLA), etiquetas y notas internas del chat.
- Que el bot de pedidos atienda varios números del mismo comercio. En esta fase el
  bot puede estar encendido en un solo número por comercio.
- Llamadas, grupos y el historial de chats anterior a la conexión, si Meta no lo
  comparte.
- Usar el inbox de Kapso embebido. El buzón sigue siendo el de Katuq.
- Migrar la configuración antigua `ownCredentials`. Hoy ningún comercio la usa
  (medido el 2026-10-15) y se deja intacta.
- No toca pedidos, inventario ni consecutivos.

## Arquitectura (revisión del 2026-10-15)

Daniel aprobó el cambio con una condición: «hazlo, pero de manera estratégica, usando la arquitectura de Katuq». Por eso se arma como **dominio Mensajería con Strategy**, siguiendo el mismo molde que contabilidad y logística: un manager y providers que delegan en clientes.

- Kapso WhatsApp es el primer provider. Meta (Instagram y Messenger) puede entrar después sin tocar el manager.
- La **línea** es la unidad de dueño y de envío, y no depende del canal.
- El webhook sigue el molde de WooCommerce: firma que falla cerrado, reserva atómica y evento crudo guardado antes de procesar.
- Se reutilizan la bandera por comercio (`companies.featureFlags`) y el equipo comercial del CRM.
- En el front, el regreso de una conexión usa una ruta genérica y las piezas del buzón no dependen del canal.

El detalle está en `design.md`. Por esta revisión, los nombres de colección y de campo que aparecen abajo cambian: las colecciones pasan a ser `messaging_lines` y `messaging_threads`, y los campos nuevos quedan como `lineId` y `sentBy`.

## Impact

- **Backend** (`katuq_admin_back_firebase/functions`):
  - `services/kapsoService.js`: envío por un número concreto.
  - `controllers/whatsappWebhook.js`: resolución de la empresa por el número.
  - `services/whatsappConversationsService.js` y `routers/whatsappConversations.js`:
    chat por número, dueño y filtro del vendedor.
  - `services/whatsappOutboundService.js`: número de salida y ventana por número.
  - `routers/whatsapp.js`: conexión de números.
- **Colecciones nuevas** (requieren aprobación):
  - `whatsapp_phone_numbers`: un documento por número, que fija quién es su dueño.
  - `whatsapp_threads`: dueño y estado de cada chat.
- **Campos nuevos en colecciones existentes:**
  - `whatsapp_usage`: `phoneNumberId` y `sentBy`.
  - `integration_configs/{company}_kapso`: `kapsoCustomerId`.
- **Frontend:**
  - `components/integrations/whatsapp-kapso-config`: lista de números, conectar y
    asignar vendedores.
  - `components/notificaciones/whatsapp-inbox`: número del chat, quién lo atiende,
    tomar, soltar y pasar, y filtro por número.
- **Kapso:**
  - Un customer por comercio, enlaces de conexión y un webhook por número.
  - Para más de 3 números en total, Katuq necesita el plan Platform de Kapso
    (incluye 50 números; cada número extra cuesta US$5).
- **Riesgo para el canal vivo:** ALMARA usa el buzón y el bot piloto sobre el número
  compartido. Todo lo nuevo aplica solo a los números conectados con este cambio.
