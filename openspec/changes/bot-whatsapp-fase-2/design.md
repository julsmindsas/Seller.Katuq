# Diseño — bot fase 2

## Context

La fase 1 despacha 1 mensaje = 1 turno contra ADK, solo texto, y la conexión
del número propio ya existe en el modelo (`integration_configs.{company}_kapso.ownCredentials`,
cifrado, con precedencia por comercio en `kapsoService`) pero sin flujo de
usuario: campos crudos en "avanzado", sin validación ni estado. El piloto
ALMARA corre por excepción de env sobre el número compartido.

## Goals / Non-Goals

**Goals:**
- Conversación que aguante clientes reales: ráfagas, medios, fotos, estado de
  pedido, cierre con dirección confirmada.
- Que un comercio conecte su número y prenda el bot sin tocarnos: guiado,
  validado y con feedback en la misma pantalla.

**Non-Goals:**
- Transcripción de audio (fase posterior; pasaría por KAI).
- Búsqueda semántica (aplazada por Daniel).
- Alta del número EN Kapso (el trámite Meta/Kapso sigue afuera; nosotros
  conectamos credenciales ya emitidas).
- Notificaciones de traspaso con timbre (grupo 12, aprobación pendiente).

## Decisions

**D1 — Ráfagas con ventana en memoria, no en Firestore.** El webhook encola
por `phoneHash` en un buffer del proceso con ventana de 4 s desde el primer
mensaje (extensible hasta máx. 10 s si siguen llegando). Al vencer, UN turno
con los textos concatenados en orden. Los sellos de idempotencia registran
TODOS los ids agrupados (el array `mensajesAtendidos` ya existe). Se cobra una
sola respuesta. Justificación: PM2 corre una sola instancia; coordinar por
Firestore agregaría lecturas y carreras para un problema que hoy no existe.
Si algún día hay múltiples instancias, la ventana se degrada con elegancia
(dos turnos en vez de uno — molesto, no roto).

**D2 — Medios: aviso cortés UNA vez por sesión.** Audio/imagen/sticker
disparan una respuesta fija ("por ahora solo leo texto…") marcada en la
sesión (`avisoMediosAt`); repeticiones dentro de la misma sesión se ignoran
en silencio. Se cobra como cualquier respuesta del bot. El gate deja de ser
mudo pero no puede volverse una fuente de spam.

**D3 — Foto de producto: un solo mensaje con caption, un solo cobro.** El
agente ADK gana una herramienta local `mostrar_producto(productoId)` que
anota el producto en el estado del turno (ADK sigue sin escribir en Katuq).
El backend, al responder, si hay producto anotado y este tiene imagen con URL
pública, envía UN mensaje tipo `image` con la respuesta como caption (máx.
1024 chars; si la respuesta es más larga o no hay imagen, texto normal).
`kapsoService` gana `sendImage` con el mismo formato Meta y la misma
resolución de credenciales por comercio.

**D4 — Estado de pedido: contexto pre-resuelto, no herramienta MCP.** El
teléfono crudo jamás entra a ADK (regla de fase 1), así que el agente no
puede consultar pedidos por su cuenta. El despachador ya resuelve
`ultimoPedido`; se amplía a `ultimosPedidos` (hasta 3: número, estado humano,
fecha) y las instrucciones enseñan a responder "¿dónde va mi pedido?" solo
con ese contexto. Cero herramientas nuevas de lectura de órdenes, cero
identidad en ADK.

**D5 — Verificación de credenciales contra Kapso, server-side.** Endpoint
`POST /v1/whatsapp/own-credentials/verify`: toma las credenciales del doc (o
las recién escritas), llama a Kapso (info del número) y persiste
`ownCredentials.verifiedAt` + número/nombre visibles. La UI solo muestra el
resultado; la API key nunca viaja de vuelta al navegador (ya es así). El
mensaje de prueba reusa el camino de salida existente hacia un teléfono que
digite el usuario, con el aviso de la ventana de 24 h si Kapso lo rechaza.

**D6 — Salud del webhook sin colecciones nuevas.** "Último entrante recibido"
se consulta sobre la colección de inbound existente (por company, límite 1,
orden desc) y se muestra en la pantalla. Nada nuevo que mantener.

**D7 — El piloto se retira, no se amplía.** Cuando ALMARA conecte número
propio, se vacían las env `WHATSAPP_BOT_PILOT_*`. La excepción no se extiende
a más comercios: el camino oficial es el asistente de conexión.

## Risks / Trade-offs

- **Latencia fija de la ventana de ráfaga (4 s)** en toda respuesta. Mitiga:
  el typing indicator ya está en producción; el cliente ve "escribiendo…".
  Se calibra con el piloto antes de fijarla.
- **Buffer en memoria se pierde en un restart**: mensajes en ventana quedan
  sin turno hasta que el poller los re-presente (30 s) — el sello de
  idempotencia evita duplicados; a lo sumo la respuesta tarda un ciclo más.
- **URLs de imagen**: productos con ruta relativa de Cereza necesitan el
  mismo arreglo del CDN ya aplicado en catálogos ([[imagenes-producto-url-relativa]]);
  si la URL no es pública, se degrada a texto sin error.
- **Errores de la API de Kapso en la verificación** se mapean a mensajes
  humanos (credencial inválida / número no encontrado / sin permiso); el
  detalle crudo va al log, no a la UI.
