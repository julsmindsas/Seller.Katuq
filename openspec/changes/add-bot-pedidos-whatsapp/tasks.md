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
- [x] 5.5 Lista blanca en el puente MCP: solo `search_products`, `get_product_stock`, `get_product_catalog`. Las prohibidas quedan **escritas en el código con el motivo** (`HERRAMIENTAS_PROHIBIDAS`) para que nadie las agregue por comodidad, con prueba que falla si alguna entra a la lista blanca. Además, **las herramientas de carrito están cerradas sobre el hilo**: no lo reciben como argumento, así que el modelo no puede tocar el carrito de otro cliente — hay prueba que lo verifica por firma. Falta confirmar contra el servidor de herramientas corriendo.
- [ ] 5.6 Publicar en el registro de herramientas del backend las que faltan: buscar producto (`GET /productos/search/quick` con `searchBy=general`, mínimo 2 caracteres) y las de carrito contra el servicio de sesión del paso 3.
- [ ] 5.6b Resolver **en el backend, antes de invocar al agente**, la identidad del cliente por su teléfono y su último pedido, y pasarlos ya resueltos en el estado inicial de la sesión. El modelo recibe los datos, nunca la herramienta que podría pedir los de otro.
- [ ] 5.6c Prueba de seguridad del canal: un cliente que pregunta por ventas del comercio, por otros clientes o por pedidos ajenos no obtiene nada — ni por herramienta ni por respuesta del modelo.
- [x] 5.6d Pruebas de lógica del canal: 20 casos en `tests/test_whatsapp_bot_channel.py`, que corren **sin `google-adk` instalado** (se sustituye `FunctionTool`) — saneo del carrito, campos colados, tope de líneas, sumar y corregir cantidades, no cerrar pedido vacío, motivo del traspaso, lista blanca, aislamiento por empresa e instrucciones. Verde.
- [ ] 5.7 Pruebas de conversación con datos reales de una empresa de prueba, sin enviar nada a WhatsApp: pedir un producto que existe, uno que no, más cantidad de la que hay, corregir el carrito y pedir un asesor. **Requiere el entorno de ADK levantado** (localmente no hay ni `flask` ni `google-adk` instalados).
- [ ] 5.8 Dejar escrito en el manual del repo de ADK cómo se despliega el canal: `sudo systemctl restart kai-adk`, **nunca** PM2. Y agregar `WHATSAPP_BOT_TOKEN` al entorno del servicio.

## 6. Cierre en cotización

- [ ] 6.1 Crear la herramienta de cerrar pedido: arma el request interno y delega en `controllers/cotizaciones.js` `create`, tal como lo hace hoy `controllers/catalogos.js` al convertir un carrito público. Estado borrador. Del lado de ADK va envuelta con el patrón de confirmación de `tools/hitl_write_tools.py`, que es el que usa el proyecto para escrituras.
- [ ] 6.2 Marcar el origen de la cotización (WhatsApp, bot, teléfono del cliente) sin cambiar el comportamiento de las que se crean a mano.
- [ ] 6.3 Resolver los datos del cliente: si el teléfono está registrado, usar los suyos; si no, exigir que el bot haya pedido nombre y dirección antes de cerrar.
- [ ] 6.4 **Prueba de contrato del write-set**: falla si al cerrar se escribe `inventory`, `inventoryMovement`, `orders`, consecutivos de pedido, `products`, precios o listas de precios.
- [ ] 6.5 Prueba de que las existencias de todos los productos del carrito quedan idénticas antes y después de cerrar.
- [ ] 6.6 Prueba del cierre fallido: el cliente no recibe "quedó registrado" y la conversación pasa a un vendedor con el carrito visible.

## 7. Despacho desde el webhook

- [ ] 7.1 Leer completo `controllers/whatsappWebhook.js` y ubicar el punto exacto, después de persistir y después de responder 200, donde despachar sin bloquear.
- [ ] 7.2 Crear `services/whatsappBotDispatcher.js` con las compuertas en orden: bot prendido, número propio con una sola empresa, no está en lista de no contactar, no está tomada por un vendedor, hay saldo, no se pasó del tope, el mensaje es de texto y no se atendió antes.
- [ ] 7.3 Conectar el despacho con `setImmediate` y variable de entorno de apagado general, apagada de fábrica. El turno se le pide al canal de WhatsApp de **ADK (puerto 8080)**, no a Genkit, con tiempo de espera acotado: si ADK no contesta, la conversación pasa a un vendedor en vez de dejar al cliente colgado.
- [ ] 7.4 Idempotencia: sellar el último mensaje atendido en la sesión para que una re-entrega de Meta no haga contestar dos veces.
- [ ] 7.5 Enviar la respuesta del agente por el servicio de salida del paso 2, con `origen: "bot"`.
- [ ] 7.6 Registro estructurado por turno: qué consultas hizo, qué devolvieron, cuánto costó y por qué traspasó, con el teléfono siempre enmascarado.
- [ ] 7.7 Pruebas de las compuertas: número compartido no despacha; hilo tomado no despacha; contacto en lista de no contactar no despacha; sin saldo traspasa; mensaje de foto o audio traspasa.
- [ ] 7.8 Verificar que el webhook sigue respondiendo en menos de 3 segundos con el bot prendido.

## 8. Modo sombra

- [ ] 8.1 Agregar el modo sombra a la configuración del comercio: el bot redacta y se registra, pero no envía ni cobra.
- [ ] 8.2 Prenderlo en el comercio del piloto y dejarlo corriendo contra conversaciones reales.
- [ ] 8.3 Revisar con Daniel una muestra de lo que habría contestado antes de prender el envío real.

## 9. Frontend — configuración

- [ ] 9.1 Agregar a la pantalla de integraciones de WhatsApp la sección del bot: interruptor, tope de turnos, mensaje de bienvenida y horario, por servicio que extiende `BaseService`.
- [ ] 9.2 Deshabilitar el interruptor con explicación visible cuando el comercio no tiene número propio conectado.
- [ ] 9.3 Aplicar los tokens del sistema de diseño: acento `#5F3FE0`, semánticos en par fuerte con fondo suave, plano sin gradientes.

## 10. Frontend — buzón y cotizaciones

- [ ] 10.1 Distintivo de los mensajes con `origen: "bot"` en el detalle del hilo.
- [ ] 10.2 Señal de "atendiendo el bot" en la lista de conversaciones.
- [ ] 10.3 Botones de tomar y devolver el hilo, contra los endpoints del paso 3, con el estado reflejado al instante.
- [ ] 10.4 Distintivo y filtro por origen WhatsApp en la lista de cotizaciones.
- [ ] 10.5 Verificar que las rutas nuevas queden dadas de alta en los roles y que el menú las reconozca por texto exacto, o el trabajo se despliega invisible.
- [ ] 10.6 Build de producción sin errores.

## 11. Piloto y cierre

- [ ] 11.1 Prender el envío real en el comercio del piloto y avisarle al equipo del comercio qué esperar.
- [ ] 11.2 Seguimiento diario la primera semana: gasto del bot aparte, cuántas conversaciones traspasó y por qué, cuántas cotizaciones creó y cuántas se volvieron pedido.
- [ ] 11.3 Ajustar tope, tono y mensaje de bienvenida con lo que salga del piloto.
- [ ] 11.4 Actualizar `/specs/CONTRACT.md` con la bitácora de la sesión y archivar el cambio con `/opsx:archive`.
