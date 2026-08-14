## 1. Verificar el terreno antes de escribir código

- [x] 1.1 Confirmar qué motores de IA corren en el servidor de producción real (`13.222.206.185`). **VERIFICADO 2026-08-11: los dos.** Genkit es el proceso `index` del daemon **root de PM2** (`/home/ubuntu/kai/functions/lib/index.js`, puerto 3890). ADK es el servicio **systemd `kai-adk`** (`python`, puerto 8080, activo desde el 03-ago), expuesto como `back.katuq.com/adk`. **Trampa que costó una decisión mal tomada:** `pm2 list` NO muestra ADK, así que mirar solo PM2 hace creer que no está desplegado. El bot va sobre ADK y se reinicia con `sudo systemctl restart kai-adk`.
- [x] 1.2 Listar qué comercios tienen número propio de Kapso conectado hoy. **VERIFICADO 2026-08-11: ninguno.** Las 26 configuraciones de `integration_configs` están sin `ownCredentials`. **BLOQUEA EL PILOTO:** antes de prender el bot hay que conectarle el número propio a un comercio con el flujo de Kapso (cliente + enlace de conexión, vence a los 30 días). Es trámite, no código — no bloquea los pasos 2 a 10.
- [ ] 1.3 Confirmar con Daniel el tope de turnos por conversación, el horario de atención del bot y si el bot se presenta como bot en el primer mensaje.
- [ ] 1.4 Registrar la decisión en `/specs/CONTRACT.md` como D-177 con fecha y razón. **Ojo:** el contrato está hoy con marcadores de conflicto sin resolver; resolverlos primero o coordinar con quien los dejó.

## 2. Servicio único de salida (refactor solo, sin bot)

- [x] 2.1 Leer completo `POST /:phoneHash/reply` en `routers/whatsappConversations.js` y anotar cada paso: resolución de teléfono, ventana de 24 horas, lista de no contactar, envío, cobro, persistencia, logs y códigos de error. **Hallazgo:** el endpoint del buzón **nunca chequeó la lista de no contactar** — responderle a quien te escribió no es marketing. Se conserva ese comportamiento; el chequeo queda opcional y solo el bot lo pide.
- [x] 2.2 Crear `services/whatsappOutboundService.js` con `enviarTexto({ company, phoneHash, texto, tipo, actorId, correlationId, respetarNoContactar })` que ejecute esa misma secuencia y devuelva el mismo resultado, incluidos los casos de error.
- [x] 2.3 Dejar el endpoint del buzón llamando al servicio nuevo, sin cambiar ni un código de respuesta ni un mensaje de error. El router quedó con solo auth, forma del request y la tabla que traduce el resultado a HTTP (415 líneas menos).
- [x] 2.4 ~~Agregar el campo `origen`~~ **No hace falta campo nuevo.** El documento de consumo ya tiene `type` y el timeline del buzón ya lo expone; el bot usa `BOT_REPLY` y la persona sigue con `REPLY_INBOUND`. **Billing y usage quedan sin tocar** — menos riesgo del previsto.
- [x] 2.5 Pruebas del servicio: 16 casos en `tests/notifications/whatsappOutbound.test.js` (`npm run test:whatsapp-outbound`) — ventana vencida, sin inbound previo, consulta caída, sin saldo, cross-tenant, texto inválido, envío humano, envío del bot, no-contactar prendido y apagado, fallo de Kapso, fallo de débito post-envío, dedup y su liberación, sandbox. Todos en verde.
- [ ] 2.6 Prueba manual desde el buzón: responder un hilo real y verificar que se envía, se cobra y aparece en el historial igual que antes. **Requiere despliegue — pendiente de coordinar con Daniel.** La verificación estática ya pasó (`node --check` en ambos archivos, sin referencias sueltas a los símbolos removidos).

## 3. Memoria de la conversación

- [x] 3.1 Crear `services/whatsappBotSessionService.js` sobre la subcolección `integration_configs/{company}_kapso/whatsapp_bot_sessions/{phoneHash}`: leer, crear, actualizar carrito, marcar traspaso, contar turnos y sellar el último mensaje atendido. Mutaciones en transacción.
- [x] 3.2 Poner vigencia de 7 días con `ttlAt`, igual que el resto del módulo de WhatsApp. **Además se valida en lectura**: una sesión pasada de fecha se trata como inexistente aunque la política de borrado de la infraestructura no la haya limpiado — así no dependemos de configuración externa.
- [x] 3.3 Pruebas: 16 casos en `tests/notifications/whatsappBotSession.test.js` (`npm run test:whatsapp-bot-session`). **Un test atrapó un bug real:** el normalizador subía a 1 cualquier cantidad inválida, así que un "0 unidades" del modelo habría agregado una unidad que el cliente no pidió. Ahora la línea inválida se rechaza.

## 4. Configuración del bot por comercio

- [x] 4.1 Agregar a `services/whatsappCompanyConfig.js` los campos del bot dentro de la configuración que ya existe: encendido, modo sombra, tope de turnos, mensaje de bienvenida, si se anuncia como bot y horario. Apagado por defecto y **en modo sombra al prenderse**. Más `resolveBot(company)` para el despachador.
- [x] 4.2 Validar en el guardado que no se puede prender el bot si el comercio no tiene número propio conectado, con mensaje claro (`BOT_REQUIERE_NUMERO_PROPIO`). Apagarlo nunca se bloquea.
- [x] 4.3 Exponer lectura y escritura por `PUT /v1/whatsapp/integration-config` (lista blanca + `bot` en la vista pública, con `puedeActivarse` para que la UI sepa si deshabilitar el interruptor). El rechazo sale como 422 con su propio código.
- [x] 4.4 Pruebas: 14 casos en `tests/notifications/whatsappBotConfig.test.js` (`npm run test:whatsapp-bot-config`) — apagado de fábrica, las tres formas de "número propio a medias", prender junto con conectar el número, apagar siempre permitido, y que prender el bot no pise el resto de la configuración.

## 5. Canal de WhatsApp en ADK

> El cerebro es el de ADK, que ya está en producción por systemd (`kai-adk`, puerto 8080). Un canal es un **adaptador de transporte**, no un cerebro nuevo: el molde a copiar es `kai/adk_agent/channels/telegram/`.

- [x] 5.1 Leer completo `channels/telegram/` y anotar qué se reusa y qué es propio de Telegram. **Lo reusable es poco y bueno:** el patrón de `session_id` con prefijo de canal, y la secuencia sesión → `Runner` → `run_async`. Lo demás (streaming, "escribiendo…", votación multi-agente, voz, 1.670 líneas de tubería) es de Telegram y no aplica: WhatsApp entrega mensajes completos.
- [x] 5.2 Crear `channels/whatsapp/` con `sessions.py` (id `wa_{empresa}_{hilo}`, **el teléfono crudo nunca entra a ADK** — se usa el mismo hash del buzón), `agent.py` y `pipeline.py` (un turno: entra texto, sale texto).
- [x] 5.3 Endpoint propio `endpoints/whatsapp_bot_endpoint.py` (blueprint Flask registrado en `main.py`): `POST /v1/whatsapp-bot/turno` y `GET /v1/whatsapp-bot/salud`. **Token propio `WHATSAPP_BOT_TOKEN`**, no el JWT de usuario ni el token de administración — permiso mínimo: si se filtra, lo que se consigue es hablar con el bot de pedidos, no entrar a la administración. Comparación del token a prueba de medición de tiempos y mismo error para token ausente, inválido o no configurado.
- [x] 5.4 Agente **propio del canal, de cara al cliente**, con sus instrucciones en español. No reusa el orquestador general ni el de ventas.
- [x] 5.5 Lista blanca en el puente MCP: solo `search_products`, `get_product_stock`, `get_product_catalog`. **Y la llave por empresa (2026-08-12):** el agente resuelve `empresas/{company}/settings/mcp_config` (api_key + mcp_url), mismo esquema que el MultiConnectorManager — la llave es la que fija el tenant en el servidor MCP; sin config cae a la env global (solo single-tenant/local). Al piloto hay que generarle su llave con `POST /mcp/admin/generate-key` y guardarla en ese documento. Las prohibidas quedan **escritas en el código con el motivo** (`HERRAMIENTAS_PROHIBIDAS`) para que nadie las agregue por comodidad, con prueba que falla si alguna entra a la lista blanca. Además, **las herramientas de carrito están cerradas sobre el hilo**: no lo reciben como argumento, así que el modelo no puede tocar el carrito de otro cliente — hay prueba que lo verifica por firma. Falta confirmar contra el servidor de herramientas corriendo.
- [x] 5.6 Publicar la herramienta que faltaba: `search_products` en `tools/searchProducts.js`, registrada en `toolRegistry`. Busca sin tildes ni mayúsculas sobre el **mismo índice** que la búsqueda rápida de la web (se expuso `getSearchIndex`, 5 líneas, sin caché nueva), lee el documento completo solo de los pocos que devuelve, ordena por qué tan al principio calza el término y avisa con `hayMas` cuando hay más — para que el bot no diga "eso es todo" cuando no lo es. Las de carrito no van por acá: viven cerradas sobre el hilo del lado de ADK.
- [ ] 5.6d Decisión de negocio pendiente: `search_products` aplica el mismo filtro de productos de reventa (Cereza) que las demás herramientas, para no cambiarle nada al copiloto interno. Para un bot que le vende a un **comprador** eso puede estar mal — le diría "no lo tengo" a un cliente por algo que la tienda sí revende. Cambiarlo es una línea; lo decide el comercio.
- [x] 5.6b Identidad del cliente resuelta en el backend por el teléfono y entregada ya masticada al agente. **Y el último pedido también**: el despachador toma el pedido más reciente del contacto, lee sus líneas directo del documento (solo lectura de `orders`) y se las pasa al agente — "repetime lo de la otra vez" ya tiene con qué. Si la consulta falla, el bot atiende igual sin el atajo.
- [ ] 5.6c Prueba de seguridad del canal: un cliente que pregunta por ventas del comercio, por otros clientes o por pedidos ajenos no obtiene nada — ni por herramienta ni por respuesta del modelo.
- [x] 5.6d Pruebas de lógica del canal: 20 casos en `tests/test_whatsapp_bot_channel.py`, que corren **sin `google-adk` instalado** (se sustituye `FunctionTool`) — saneo del carrito, campos colados, tope de líneas, sumar y corregir cantidades, no cerrar pedido vacío, motivo del traspaso, lista blanca, aislamiento por empresa e instrucciones. Verde.
- [ ] 5.7 Pruebas de conversación con datos reales de una empresa de prueba, sin enviar nada a WhatsApp: pedir un producto que existe, uno que no, más cantidad de la que hay, corregir el carrito y pedir un asesor. **Requiere el entorno de ADK levantado** (localmente no hay ni `flask` ni `google-adk` instalados).
- [ ] 5.8 Dejar escrito en el manual del repo de ADK cómo se despliega el canal: `sudo systemctl restart kai-adk`, **nunca** PM2. Y agregar `WHATSAPP_BOT_TOKEN` al entorno del servicio.

## 6. Cierre en cotización

- [x] 6.1 Cierre implementado en `services/whatsappBotCierre.js`: delega en `controllers/cotizaciones.js` `create` con request interno (mismo patrón que catálogos), estado borrador. **Desviación registrada frente al plan:** el cierre corre en el BACKEND cuando el agente lo pide (`pedir_cierre`), no como herramienta HITL dentro de ADK — coherente con la regla del diseño de que ADK nunca escribe en Katuq. La cotización se crea ANTES de confirmarle nada al cliente: si falla, el cliente no escucha "quedó registrado".
- [x] 6.2 Origen `whatsapp-bot` + `whatsappPhoneHash` + teléfono del cliente en la nota. Las cotizaciones manuales no cambian (el campo es aditivo).
- [x] 6.3 Cliente registrado cierra con sus datos; cliente nuevo exige nombre Y dirección dictados en el chat (herramienta `registrar_datos_cliente` en ADK → el backend los persiste en la sesión y los usa al cerrar). El nombre del perfil de WhatsApp NO exime de pedir los datos. Sin datos, el cierre pasa a un asesor.
- [x] 6.4 **Contract test del write-set** en `tests/notifications/whatsappBotCierre.contract.test.js` (`npm run test:whatsapp-bot-cierre`), contra el controlador REAL de cotizaciones con un Firestore que registra cada escritura. Lista BLANCA: solo `cotizaciones` y `cotizaciones_counters`; cualquier otra colección revienta el test. Además: el precio sale del SERVIDOR (un precio de 1 peso plantado por el bot no llega a la cotización) y un producto de otra empresa tumba el cierre.
- [x] 6.5 Cubierto por el contract test: el cierre no escribe `inventory` ni `inventoryMovement` en absoluto (la lista blanca lo garantiza), así que las existencias no pueden moverse.
- [x] 6.6 Probado en el despachador: con cierre fallido el cliente recibe "un asesor te contacta" (nunca la confirmación del agente), la sesión NO se marca cerrada y el carrito queda visible para el vendedor. También probado: fallo limpio — un cierre que falla no deja NADA escrito.

## 7. Despacho desde el webhook

- [x] 7.1 Ubicado el punto: los turnos se juntan durante el recorrido de mensajes y se despachan después del `res.status(200)`.
- [x] 7.2 `services/whatsappBotDispatcher.js` con las diez compuertas en orden, todas del lado del servidor. El webhook ahora distingue si el mensaje llegó por número propio de **una sola** empresa y solo entonces marca el turno como despachable.
- [x] 7.3 Despacho con `setImmediate` después de responderle a Meta, detrás de `WHATSAPP_BOT_ENABLED` (apagado de fábrica). El turno se le pide a ADK en el 8080 con `services/whatsappBotClient.js`, tiempo de espera acotado y sin reintentos — un reintento sería un mensaje duplicado y cobrado. Si ADK no contesta, la conversación pasa a un vendedor.
- [x] 7.4 Doble sello: el de la sesión (mensaje ya atendido) y el del envío (`clientMessageId` derivado del id del mensaje), así ni se contesta ni se cobra dos veces.
- [x] 7.5 La respuesta sale por el servicio compartido del paso 2 con el tipo del bot, respetando la lista de no contactar.
- [x] 7.6 Registro estructurado por turno y por traspaso, siempre con el hilo en vez del teléfono. **Falta** el detalle de qué herramientas usó el agente en cada turno: eso lo tiene ADK y hay que devolverlo en la respuesta del turno.
- [x] 7.9 **Prueba de punta a punta en sombra contra Firestore REAL** (2026-08-12, corrida por Claude): empresa de prueba aislada + doble de ADK guionado → 4 turnos de conversación (saludo, búsqueda, datos dictados, cierre), compuertas de número compartido y reentrega, sesión visible en `listarSesiones`, y verificación dura de la sombra (0 docs en `whatsapp_usage` y 0 en `cotizaciones`). **Atrapó y se corrigió un bug real:** el sello de idempotencia guardaba solo el ÚLTIMO mensaje atendido, así que la reentrega de un mensaje viejo (lote de Meta) se contestaba de nuevo — ahora la sesión recuerda los últimos 30 sellos, con pruebas del caso viejo y del tope. Todo lo creado se borró al final. Guion en el scratchpad (`fake-adk.js` + `driver-bot-e2e.js`); runbook de despliegue en `despliegue.md`.
- [x] 7.7 22 casos en `tests/notifications/whatsappBotDispatcher.test.js` (`npm run test:whatsapp-bot-dispatcher`): las diez compuertas, los cinco caminos de traspaso, el modo sombra mudo y que el teléfono crudo nunca viaja a ADK.
- [ ] 7.8 Verificar que el webhook sigue respondiendo en menos de 3 segundos con el bot prendido.

## 8. Modo sombra

- [x] 8.1 Modo sombra completo: no envía, no cobra, no exige saldo, no marca traspasos ni crea cotizaciones — solo registra lo que habría hecho (`sombra_no_enviado`, `sombra_traspaso`, `sombra_cierre`). Es el modo por defecto al prender el bot.
- [ ] 8.2 Prenderlo en el comercio del piloto y dejarlo corriendo contra conversaciones reales.
- [ ] 8.3 Revisar con Daniel una muestra de lo que habría contestado antes de prender el envío real.

## 9. Frontend — configuración

- [x] 9.1 Tarjeta `whatsapp-bot-config` dentro de la pantalla de integración de WhatsApp (componente propio con su carga/guardado — un problema del formulario grande no la arrastra): interruptor, modo sombra, presentarse como bot, tope de turnos, mensaje de bienvenida y horario con días. Vía `WhatsappIntegrationConfigService` (BaseService).
- [x] 9.2 Interruptor deshabilitado + aviso visible cuando no hay número propio (`puedeActivarse` lo calcula el servidor); si el backend igual rechaza, el 422 `BOT_REQUIERE_NUMERO_PROPIO` se traduce a un mensaje claro y el toggle vuelve a apagado.
- [x] 9.3 Tokens aplicados en las tres piezas nuevas (tarjeta del bot, franja del buzón, chip de cotizaciones): acento #5F3FE0, tinta #211F3A, chips par fuerte/fondo suave, radios 16/11, labels UPPERCASE muted, cero gradientes.

## 10. Frontend — buzón y cotizaciones

- [x] 10.1 Chip "Bot" en las burbujas cuyo consumo es `BOT_REPLY` (detalle del hilo, en los dos mapeos: carga y refresco).
- [x] 10.2 Resuelto con una vista mejor que un chip (pedido de Daniel 2026-08-12): pestaña **"Pedidos"** en el buzón — ver 10.7.
- [x] 10.7 **Vista "Pedidos por WhatsApp"** (pedida por Daniel): pestañas Conversaciones | Pedidos en el shell del buzón, sin ruta nueva (cero trámite de roles). La izquierda lista las conversaciones del bot con estado (Atendiendo el bot / Con un asesor / Cotización lista), carrito en vivo con total y primeras líneas, número de cotización y motivo de traspaso, con filtros por estado y refresco cada 15s. Clic → se abre a la derecha la MISMA conversación de siempre (que ya trae la franja del bot, el carrito y tomar/devolver). Backend: `GET /v1/whatsapp/conversations/bot/sesiones` sobre `listarSesiones` del servicio de sesiones (vencidas filtradas, más recientes primero, probado). Nombres y teléfono enmascarado se cruzan contra el listado de hilos en el front — la sesión solo conoce el hash.
- [x] 10.3 Endpoints nuevos (`GET /:phoneHash/bot`, `POST /:phoneHash/bot/tomar`, `POST /:phoneHash/bot/devolver`, con el guard de reply) + franja en el detalle con "Tomar conversación" / "Devolver al bot" y el estado refrescado al responder. **Además**: responder a mano desde el buzón le quita el hilo al bot automáticamente (lo marca el backend en el endpoint de reply, best-effort).
- [x] 10.4 Chip de origen en la lista de cotizaciones ("Bot" para whatsapp-bot, "Catálogo" para catalogo-digital) al lado del número. El filtro dedicado no se agregó: la lista filtra en servidor y sumar el criterio `origen` al endpoint es un cambio aparte — el chip ya lo hace distinguible a simple vista.
- [x] 10.5 No hay rutas nuevas de frontend: el bot vive dentro de la pantalla de integraciones y del buzón que ya existen en los roles. Nada que dar de alta.
- [x] 10.6 `npm run build` en verde (solo las advertencias CommonJS preexistentes).

## 11. Piloto y cierre

- [ ] 11.1 Prender el envío real en el comercio del piloto y avisarle al equipo del comercio qué esperar.
- [ ] 11.2 Seguimiento diario la primera semana: gasto del bot aparte, cuántas conversaciones traspasó y por qué, cuántas cotizaciones creó y cuántas se volvieron pedido.
- [ ] 11.3 Ajustar tope, tono y mensaje de bienvenida con lo que salga del piloto.
- [ ] 11.4 Actualizar `/specs/CONTRACT.md` con la bitácora de la sesión y archivar el cambio con `/opsx:archive`.

## 12. Traspaso con timbre — ANOTADO, aprobación pendiente (2026-08-13)

> Daniel: "debe haber algo que indique que un mensaje debe ser atendido por un
> asesor y se pueda asignar y notifique, algo parecido a Chatwoot, o cosas más
> innovadoras". Ya existe: tomar/asignarse, cola en la pestaña Pedidos (filtro
> Asesor) con motivo y carrito. Falta el timbre. Plan por capas:

- [ ] 12.1 Notificar el traspaso por el FCM que ya existe (`services/fcmService.js`
      → push + campanita `notifications`): al traspasar, avisar a los usuarios
      del comercio. **Decisión pendiente de Daniel:** ¿todos los del comercio o
      solo los que tienen permiso de responder el buzón?
- [ ] 12.2 Resumen de la IA al traspasar: el agente entrega 2 líneas de contexto
      ("quiere 2 camisetas talla M, preguntó por envío, dudó al pagar") en vez
      del motivo seco. Va en la sesión, la tarjeta de Pedidos y la notificación.
- [ ] 12.3 Repartir además de tomar: asignación dirigida por un admin y, luego,
      auto-asignación rotativa entre asesores (el de menos hilos recibe).
- [ ] 12.4 Aviso por WhatsApp al asesor (canal propio, $80/aviso, opción por
      comercio): "tenés un cliente esperando, resumen: ...".

## 13. Endurecimiento post-piloto (2026-08-13)

- [x] 13.1 Bug del bot mudo tras cada cierre: el traspaso pisaba el estado
      "cerrada" y la reapertura nunca aplicaba. Corregido (`877a7f6`): el
      cierre es la última mutación de la sesión y la reapertura sana también
      las sesiones atascadas con el orden viejo. Verificado en prod (D-187).
- [x] 13.2 Ruido del poller: sync-inbound re-procesa los mismos ~5 mensajes
      cada 30 s y cada pasada loggea `piloto_bot_route` aunque el mensaje ya
      esté persistido. Cortar el log (o bajarlo a debug) para mensajes
      deduplicados. Solo limpieza de logs — la idempotencia ya los frena.
