# Bot de WhatsApp — fase 2: conversación robusta y número propio en autoservicio

## Why

El piloto del bot de pedidos (ALMARA, decisiones D-186/D-187) probó el ciclo
completo en producción: catálogo real → carrito → cotización con link → traspaso.
Pero el piloto también mostró los límites de la primera versión:

1. **La conversación es frágil en los bordes.** El bot solo entiende texto y
   calla ante audios, fotos y stickers (el cliente no sabe que no lo oyeron);
   una ráfaga de mensajes seguidos genera una respuesta por mensaje (turnos
   quemados, respuestas pisadas); no puede mostrar fotos de producto ni contar
   el estado de un pedido en curso ("¿dónde va mi pedido?"), que es la pregunta
   más común después de comprar.
2. **Conectar un número es trámite manual de nosotros.** Hoy el bot exige
   número propio de Kapso, pero la pantalla de configuración solo ofrece campos
   crudos escondidos en "avanzado" (API key, phone number id) sin validación ni
   feedback: nadie que no sea del equipo puede conectarse solo. El piloto vive
   de una excepción por variable de entorno que no escala a más comercios.

Sin la fase 2, el bot no puede salir del piloto: ni la conversación aguanta
clientes reales variados, ni un comercio puede prenderlo sin tocarnos la puerta.

## What Changes

**Frente A — conversación robusta (backend + ADK):**
- Ráfagas: los mensajes seguidos del mismo cliente se agrupan en UN turno
  (ventana corta de espera antes de despachar; un solo cobro y una respuesta).
- Medios: audio/imagen/sticker reciben una respuesta cortés que pide texto
  (hoy: silencio). La transcripción de audio queda explícitamente FUERA de esta
  fase.
- Fotos de producto: cuando el agente canta un producto concreto, el mensaje
  puede salir con la imagen del producto y el precio en el caption (envío de
  media por Kapso; degrada a texto si no hay imagen).
- Estado del pedido: herramienta de SOLO LECTURA para que el agente responda
  "¿dónde va mi pedido?" con el estado real de los pedidos del cliente.
- Instrucciones más firmes: confirmación de dirección y ciudad antes del
  cierre, resumen del carrito formateado y consistente, y guía de despedida.

**Frente B — número propio en autoservicio (Katuq):**
- Asistente de conexión guiado en la pantalla de WhatsApp: pasos claros,
  campos validados y botón **"Probar conexión"** que verifica las credenciales
  contra Kapso y muestra el número conectado (nombre y teléfono reales).
- Estado de la conexión siempre visible: número verificado, último mensaje
  entrante recibido, y salud del webhook.
- Mensaje de prueba desde la pantalla (a un teléfono del comercio) para cerrar
  el círculo sin salir de Katuq.
- La activación del bot queda ligada a conexión verificada (la puerta ya
  existe: BOT_REQUIERE_NUMERO_PROPIO); el modo sombra se presenta como paso
  recomendado antes de abrir. La excepción del piloto por env se retira cuando
  ALMARA tenga número propio.

**Lo que NO cambia:** el write-set del bot (solo cotizaciones), el precio
siempre del servidor, el traspaso a humano, el cobro por mensaje, y la
búsqueda de productos (la mejora semántica quedó aplazada por decisión de
Daniel — "dejémoslo así por ahora la búsqueda").

## Capabilities

### New Capabilities
- `whatsapp-bot-conversacion`: agrupación de ráfagas en un turno, respuesta a
  medios no soportados, envío de foto de producto con precio, consulta de
  estado de pedido de solo lectura, y reglas de conversación (dirección
  confirmada antes del cierre, resumen de carrito consistente).
- `whatsapp-numero-propio`: asistente de conexión del número propio con
  validación contra Kapso, estado de conexión visible, mensaje de prueba, y
  activación del bot condicionada a conexión verificada.

### Modified Capabilities
- `whatsapp-bot-pedidos`: el despacho deja de ser 1-mensaje-1-turno (ráfagas) y
  el gate de tipo de mensaje pasa de "ignorar en silencio" a "responder cortés
  una vez por conversación".

## Impact

- **Backend** (`katuq_admin_back_firebase/functions`): `whatsappBotDispatcher`
  (ráfagas + gate de medios), `kapsoService` (envío de media + verificación de
  credenciales), `whatsappCompanyConfig` (estado de conexión), router de
  integraciones (probar conexión / mensaje de prueba), herramienta nueva de
  estado de pedido en el toolset del bot.
- **ADK** (`kai/adk_agent/channels/whatsapp/`): instrucciones (dirección,
  resumen, despedida), herramienta de estado de pedido en la whitelist,
  señal de "producto cantado" para adjuntar imagen.
- **Frontend** (`Seller.Katuq`): pantalla de WhatsApp en integraciones —
  asistente de conexión, estado, prueba; tarjeta del bot ya existente se
  reordena alrededor del estado de conexión.
- **Riesgos**: envío de media cobra igual que texto (definir si se cobra 1 o 2
  mensajes cuando va foto + texto); la ventana de ráfaga agrega latencia fija
  (~3-5 s) a TODA respuesta del bot — se calibra en piloto; validar contra
  Kapso expone errores de su API en la UI (mapear mensajes humanos).
- **Sin colecciones nuevas**: el estado de conexión vive en el doc de
  `integration_configs` existente.
