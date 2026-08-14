## Context

El canal de WhatsApp lleva funcionando en producción desde julio de 2026 y está completo de punta a punta, menos el cerebro:

| Pieza | Dónde vive hoy | Estado |
|---|---|---|
| Recepción de mensajes | `controllers/whatsappWebhook.js` (backend) | Vivo. Idempotente por id de mensaje, reparte por empresa, baja automática por palabra clave |
| Envío | `services/kapsoService.js` → `sendText` / `sendTemplate` | Vivo. Resuelve credenciales propias del comercio |
| Responder desde el buzón | `routers/whatsappConversations.js`, `POST /:phoneHash/reply` | Vivo. Valida ventana de 24 horas, lista de no contactar, cobra saldo y persiste |
| Buzón | `src/app/components/notificaciones/whatsapp-inbox/` (front) | Vivo. Identidad del hilo = `phoneHash` |
| Cobro y saldo | `services/notifications/whatsappBillingService.js` | Vivo |
| Consultas de negocio | `functions/tools/` con `toolRegistry.js` | Vivo. 40+ herramientas ya escritas para el servidor MCP |
| Cotizaciones | `controllers/cotizaciones.js` (`create`, `convertirAPedido`) | Vivo, con numeración y paso a pedido |
| Motor de IA conversacional | KAI ADK en `kai/adk_agent/` | **Vivo en producción** (systemd `kai-adk`, puerto 8080). Ya tiene canal de Telegram, sesiones por empresa, puente MCP y confirmación humana |
| Motor de flujos puntuales | KAI Genkit en `kai/functions/` | Vivo (PM2 root, puerto 3890). Sirve para importación y análisis, no para conversar |

Restricciones que marcan el diseño:

- **El webhook tiene 3 segundos.** Meta reintenta si no confirmamos a tiempo, y el archivo lo deja escrito como regla: nada de HTTP hacia afuera desde el handler.
- **El mismo mensaje entrante se reparte a varias empresas** cuando llega al número compartido (`inferCompaniesFromRecentOutbound`, un documento por empresa). Un bot prendido en dos de esas empresas contestaría dos veces desde el mismo número.
- **Cada mensaje cuesta plata real** (`WHATSAPP_PRICE_COP`, 80 pesos por defecto) y se descuenta del saldo del comercio.
- **Fuera de la ventana de 24 horas no se puede escribir libre**, solo plantillas aprobadas. El bot siempre responde a un mensaje del cliente, así que la ventana está abierta; pero hay que respetar la validación igual.
- **El backend llama a KAI en `127.0.0.1:3890`** (visible en `controllers/katuqintelligence.js`), o sea que KAI tiene que correr en la misma máquina que el backend.

## Goals / Non-Goals

**Goals:**
- Atender pedidos por WhatsApp sin vendedor, con datos reales de catálogo, precio y existencias.
- Dejar el pedido armado como cotización en borrador, lista para que el vendedor la confirme.
- No tocar inventario, consecutivos de pedido, precios ni productos.
- Reusar la plomería que ya funciona en vez de duplicarla, sobre todo el camino de salida que cobra.
- Poder apagarlo en caliente, por comercio, sin desplegar.

**Non-Goals:**
- Crear pedidos, reservar inventario, cobrar o facturar desde el chat.
- Instagram y Facebook: sus buzones identifican la conversación de otra forma.
- Cambiar cómo funcionan las campañas ni las notificaciones transaccionales.
- Rediseñar el buzón: solo se le agrega el distintivo del bot y el traspaso.

## Decisions

### 1. El cerebro va en ADK, como un canal más — no en Genkit

**WhatsApp es un canal de chat, y los canales de chat ya tienen casa: `kai/adk_agent/channels/`.** Ahí está el de Telegram, descrito en su propio código como "un adaptador de transporte" que reusa "el cerebro de KAI ADK (Runner, `FirestoreSessionService`, orquestadores) íntegramente". WhatsApp es exactamente el mismo molde: `channels/whatsapp/`, un bot por empresa.

Lo que ya está resuelto en ADK y no hay que volver a escribir:

| Necesidad del bot | Lo que ADK ya tiene |
|---|---|
| Memoria de conversación por empresa | `services/firestore_session_service.py` |
| Consultar catálogo, existencias, clientes, pedidos | `tools/mcp_katuq_toolset.py` — puente MCP a las mismas herramientas de `functions/tools/` |
| Que una persona confirme antes de escribir | `tools/hitl_write_tools.py`, patrón oficial de confirmación de ADK |
| Orquestar varios pasos de una conversación | `agents/orchestrator.py` y `agents/orchestrators/` |

*Alternativa descartada — Genkit:* fue la primera decisión de esta propuesta y **estuvo mal**. Se tomó leyendo la línea del manual que separaba "Genkit para IA" de "ADK para multi-departamento", y verificando producción solo con `pm2 list` — donde ADK no aparece porque **corre por systemd** (`kai-adk`, activo, puerto 8080, expuesto como `back.katuq.com/adk`). Con el dato correcto, Genkit obligaba a reconstruir sesiones, puente de herramientas y confirmación humana que ya existen. El manual del repo quedó corregido para que no vuelva a pasar.

*Alternativa descartada — llamar a Gemini desde el backend:* va contra la regla y desparrama el prompt y las herramientas.

**Consecuencia operativa:** el agente se despliega reiniciando `kai-adk` con systemd, no con PM2. Confundirlos deja el código viejo corriendo.

### 2. El webhook despacha y sigue; no espera al bot

En `persistInbound`, después de guardar y **después de haber respondido 200**, se despacha la atención del turno con `setImmediate`. El webhook conserva su contrato de 3 segundos.

*Alternativas descartadas:*
- *Una colección de cola con un trabajador aparte* — es lo correcto a gran escala, pero exige colección nueva e infraestructura que hoy no hay, para un volumen que arranca en decenas de mensajes al día.
- *Cloud Tasks* — mete dependencia nueva y el backend no corre en Cloud Functions, corre en una máquina.

*Lo que se pierde:* si el proceso se cae en mitad del turno, ese mensaje queda sin respuesta. Se compensa con el sello del último mensaje atendido en la sesión: cuando entra el siguiente mensaje, el bot ve que el anterior quedó sin contestar y lo tiene en cuenta. No se reintenta solo; queda documentado como límite conocido.

### 3. Un solo camino de salida, compartido con el buzón

Se extrae a `services/whatsappOutboundService.js` la secuencia que hoy vive dentro de `POST /:phoneHash/reply`: resolver teléfono desde el hash, validar la ventana de 24 horas, chequear la lista de no contactar, enviar por `kapsoService.sendText`, descontar saldo con `billingService.debit`, persistir el consumo. El endpoint del buzón queda llamando a ese servicio; el bot lo llama con `origen: "bot"`.

Así, sin código extra, cada mensaje del bot se cobra igual, aparece en el hilo igual y respeta los mismos frenos. El campo `origen` se agrega al documento de consumo que ya existe (`whatsapp_usage`) — es un campo nuevo, no una colección nueva — y es lo que el buzón lee para pintar el distintivo.

**Este refactor toca código vivo que cobra.** Se hace primero, solo, y se prueba con el buzón antes de conectar nada del bot.

### 4. La memoria de la conversación va en subcolección bajo la config del comercio

`integration_configs/{company}/whatsapp_bot_sessions/{phoneHash}` — un documento por conversación:

```
{ estado, carrito[{productoId, referencia, nombre, cantidad, precioUnitario}],
  clienteResuelto, turnos, ultimoMensajeAtendido, tomadaPor, motivoTraspaso,
  actualizadoAt, ttlAt }
```

Aprobado por Daniel. Queda aislado por empresa, no es colección nueva de primer nivel, y evita el mapa gigante dentro de un documento que ya se sabe que revienta el límite de 1 MB. Vigencia de 7 días por `ttlAt`, igual que el resto del módulo.

*Alternativas descartadas:* reconstruir el carrito leyendo el hilo en cada turno (el modelo se equivoca en cantidades y cada turno cuesta más); crear la cotización desde el primer producto (quema consecutivos en cada conversación abandonada).

**Reparto con la sesión de ADK.** ADK trae su propia memoria (`FirestoreSessionService`) y guarda ahí el hilo de la conversación — eso queda como está, es del cerebro. Pero el **carrito, la cuenta de turnos y el traspaso siguen en el documento del backend**, por dos razones prácticas: el vendedor tiene que poder ver el carrito desde el buzón sin depender de que ADK esté arriba, y el traspaso a un humano no puede ser un dato que viva dentro de la sesión del modelo. Regla simple: **ADK recuerda la charla; el backend guarda el compromiso.**

### 5. El bot solo corre cuando el número es propio del comercio

`persistInbound` ya distingue los dos casos: `companiesByOwnPhoneNumber(phoneNumberId)` devuelve empresas cuando el número es propio, y solo si eso viene vacío cae a la inferencia del número compartido. **El bot se despacha únicamente en la primera rama, y solo si devolvió exactamente una empresa.** Es la misma señal que ya usa el ruteo, no un chequeo nuevo que se pueda desincronizar.

### 6. Las herramientas del agente son las que ya existen, por el puente MCP

| Para qué | Qué se usa |
|---|---|
| Buscar producto por nombre o referencia | `GET /productos/search/quick` con `searchBy=general` — busca sin tildes sobre referencia y título, exige mínimo 2 caracteres |
| Precio y ficha | lo que devuelve la misma búsqueda |
| Existencias | `tools/getProductStock.js` |
| Reconocer al cliente | `tools/getCustomers.js` por teléfono |
| Repetir pedido anterior | `tools/getOrders.js` |
| Carrito (agregar, corregir, ver) | el servicio de sesión del backend, expuesto al agente |
| Cerrar | **herramienta nueva** de crear cotización |

ADK no llama a estas herramientas una por una a mano: las toma del **puente MCP** (`tools/mcp_katuq_toolset.py`), que ya conecta los agentes al servidor de herramientas de Katuq. Lo que falta es que las que el bot necesita estén publicadas ahí; la de buscar producto y la de cerrar hay que agregarlas al registro.

La herramienta de cierre no reimplementa nada: delega en `controllers/cotizaciones.js` `create` armando un request interno, exactamente como ya lo hace `controllers/catalogos.js` cuando convierte un carrito público en cotización. Así la numeración, la vigencia y el estado borrador salen del mismo sitio de siempre. Va envuelta con el patrón de confirmación de `hitl_write_tools.py`, que es el que ADK usa para escrituras.

Todas las herramientas se invocan **con la empresa fijada por el servidor**, tomada del documento entrante. El modelo nunca elige a nombre de qué empresa consulta.

### 6b. El agente del cliente NO es el orquestador interno — y esto es de seguridad

Los orquestadores que hoy usa ADK están hechos para **gente de adentro del comercio**. El de ventas incluye facturación electrónica, pronóstico de ventas, comparativos e indicadores de dirección; el general reparte entre ventas, inventario y logística. El canal de Telegram le habla a ese cerebro porque del otro lado hay un empleado.

**En WhatsApp del otro lado hay un comprador.** Conectar el canal al orquestador general dejaría que un cliente pregunte "¿cuánto vendieron ayer?" y reciba respuesta. Eso es una fuga de datos del comercio, no un bug de conversación.

Por eso el canal de WhatsApp define **su propio agente, con lista blanca de herramientas**, aprovechando que el puente MCP ya soporta filtro (`tool_filter`). Lo que el agente del cliente puede usar:

- buscar producto en el catálogo,
- consultar existencias de un producto puntual,
- las herramientas de carrito de su propia conversación,
- cerrar dejando la cotización.

Y lo que **no** puede tocar, ni siquiera con filtro: listar clientes (`get_customers`) ni listar pedidos (`get_orders`). Esas dos devuelven datos de *todo* el comercio, así que un cliente podría enumerar la cartera ajena preguntando bonito. La identidad del cliente y su último pedido **los resuelve el backend por el teléfono desde el que escribe, antes de invocar al agente**, y se los pasa ya resueltos en el estado de la sesión. El modelo recibe "sos Ana, tu último pedido fue esto", pero nunca una herramienta que pueda preguntar por otro.

Regla corta: **el agente del cliente solo consulta cosas del catálogo, y todo lo que sea de una persona llega pre-resuelto.**

### 7. Traspaso a humano: lo marca el servidor, no el modelo

`tomadaPor` en el documento de sesión es la única verdad. Se marca desde el servidor cuando: un vendedor responde o toma el hilo en el buzón, el bot llega al tope de turnos, falla el cierre, el cliente pide un asesor, o el bot topa con algo que no puede resolver con datos. Mientras `tomadaPor` tenga valor, el despachador ni siquiera invoca al modelo.

Que el modelo *pida* el traspaso está bien; que el traspaso *dependa* de que el modelo se acuerde de hacerlo, no.

### 8. El write-set del bot queda cerrado

El bot solo escribe: la subcolección de sesiones, el consumo en `whatsapp_usage` (por el servicio de salida compartido) y una cotización en borrador. **Prohibido escribir** `inventory`, `inventoryMovement`, `orders`, consecutivos de pedido, `products`, precios y listas de precios. Va con prueba de contrato que falla si aparece una escritura fuera de esa lista.

### 9. Frontend

- **Integraciones de WhatsApp**: interruptor del bot, tope de turnos y mensaje de bienvenida, en la pantalla que ya existe. Deshabilitado con explicación si el comercio no tiene número propio.
- **Buzón**: distintivo en los mensajes con `origen: "bot"`, aviso de "atendiendo el bot" en la lista, y botones de tomar y devolver el hilo.
- **Cotizaciones**: distintivo y filtro por origen WhatsApp.

Todo con los tokens del sistema de diseño — acento `#5F3FE0`, semánticos en par fuerte con fondo suave, plano sin gradientes — y por servicios que extienden `BaseService`, nunca `HttpClient` directo.

## Risks / Trade-offs

- **KAI no está en producción** → se verifica antes de tocar código; si falta, montarlo entra al alcance y se replantea el tamaño.
- **Romper el buzón al extraer el servicio de salida** → el refactor va primero y solo, con el comportamiento del endpoint idéntico y probado antes de conectar el bot.
- **El modelo promete algo que no hay** → responde solo con lo que devuelven las herramientas, consulta existencias antes de confirmar y traspasa ante duda. La cotización en borrador es la red final: nada llega al cliente sin que un vendedor lo confirme.
- **Se dispara el gasto** → tope de turnos por conversación, freno por saldo y el consumo etiquetado con `origen: "bot"` para poder medir cuánto cuesta el bot aparte.
- **Se cae el proceso a mitad de turno** → ese mensaje queda sin responder; el siguiente lo detecta por el sello del último atendido. Límite conocido y aceptado para este alcance.
- **Cotizaciones basura** → solo se crea cotización cuando el cliente confirma; los carritos abandonados se mueren solos a los 7 días sin dejar rastro.
- **Cambio de tono de la marca del comercio** → el mensaje de bienvenida es configurable, pero el resto lo redacta el modelo. Se acota con instrucciones fijas de tono y se ajusta con el piloto.

## Migration Plan

1. ~~Verificar KAI en el servidor de producción.~~ **Hecho.** Genkit corre por PM2 en 3890 y **ADK corre por systemd (`kai-adk`) en 8080**, activo. El bot va sobre ADK.
2. **Extraer el servicio de salida** y dejar el buzón llamándolo. Desplegar y confirmar que responder desde el buzón sigue cobrando y persistiendo igual. Sin bot todavía.
3. **Canal de WhatsApp y herramientas** en ADK, con la de cierre, probado contra datos reales de una empresa de prueba y sin enviar nada a WhatsApp.
4. **Despacho desde el webhook**, apagado para todos.
5. **Prender en un solo comercio con número propio**, en modo sombra: el bot redacta y se registra lo que habría contestado, pero no envía. Se revisa contra conversaciones reales.
6. **Prender de verdad** en ese comercio. Se mira a diario gasto, traspasos y cotizaciones creadas.
7. **Rollback**: apagar el interruptor del comercio. Si hay que cortar de raíz, la variable de entorno del bot apaga el despacho para todos sin tocar el resto del canal.

## Open Questions

- ~~¿KAI corre hoy en el servidor de producción?~~ **Resuelto:** sí, los dos motores. El bot va sobre ADK.
- ¿Con qué comercio y con qué número se hace el piloto? **Hoy ningún comercio tiene número propio conectado** (26 configuraciones revisadas, cero con credenciales propias), así que el piloto está bloqueado hasta que alguien conecte el suyo con el flujo de Kapso. Es trámite, no código.
- ¿Cuál es el tope de turnos por conversación? Se propone 20 y se ajusta con el piloto.
- ¿El bot atiende de noche y fines de semana, o dentro de un horario? Fuera de horario, ¿contesta él o solo avisa?
- ¿Le decimos al cliente que está hablando con un bot? Recomendado que sí en el primer mensaje: cuesta poco y evita reclamos.
