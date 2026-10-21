# Pedido por WhatsApp con link de pago, atendido por KAI

> **Estado (2026-10-21).**
> - **Partes 1 y 2:** aprobadas por Daniel el 2026-10-18 (D-496, en bloque con D-495 a D-503).
> - **Hecho y publicado:** el asesor KAI en las cotizaciones del bot (D-481, backend 6c2cf351) y la base de D-496 (backend af1bd54c: historial de «enviada» y pruebas de caracterización 2.1 a 2.3).
> - **Ampliación 21-oct:** la **parte 3** de abajo, **PENDIENTE DE APROBACIÓN**. Aplica las decisiones ya aprobadas F4-40·1 a ·10 y T·2 de D-518, y D-505. Lo que reemplaza del texto aprobado está marcado **SUPERSEDED (21-oct)**.
> - **Ticket:** F4-40, cd `PrDNIoDwRacCPQVcHmx1`. El número 1243 está repetido (también es cd `bCWjNHTFzXNWjwQJQwQL`), así que por D-518 se cita por cd.
> - **Revisión de la crítica (21-oct, tarde):** se verificaron en el código los 25 hallazgos de la crítica de la ampliación. Los arreglos aplicados y los descartes, con su razón, están en `design.md`, sección «Crítica del 21-oct».

## Why

Ticket F4-40 (cd `PrDNIoDwRacCPQVcHmx1`): (1) un cliente pide por WhatsApp, recibe el link de pago y queda con el pedido creado en Katuq sin intervención humana; (2) una cotización creada por KAI aparece en Cotizaciones con el asesor «KAI» y cuenta en sus métricas.

Hoy, medido leyendo el código el 2026-10-17 (no se consultó producción):

- **El bot cierra en cotización a propósito.** `services/whatsappBotCierre.js` arma las líneas con el precio del maestro, crea la cotización con `cotizaciones.create` (petición simulada) en `borrador` y la pasa a `enviada` con token público. `whatsappBotDispatcher.js` (~1287-1321) le manda «Revisa y aprueba tu cotización» y pasa el hilo a un asesor. Su write-set es solo `cotizaciones` y su contador (contract test).
- **Ese link no cierra la venta.** `responderPublica` (`controllers/cotizaciones.js` ~1436) exige que el documento escrito coincida con `cliente.documento`; el bot no lo envía, así que Aceptar siempre responde «El documento no coincide». Aceptada, tampoco se vuelve pedido: la conversión real es en venta asistida (spec 008.2, el navegador carga el carrito y llama `marcarConvertida`).
- **La conversión en el servidor no es reutilizable.** `POST /v1/cotizaciones/convertir-pedido` exige el estado `aceptada` y luego `validarConversionCotizacion` (`services/cotizacionService.js` ~158) exige `"Aprobada"`: nunca se cumplen las dos. Además numera `PED-AAAA-######` leyendo `orders` (no el contador `consecutives`), sin inventario ni pago.
- **La tienda ya hace el recorrido completo.** `crearPedido` (`controllers/sites.js` ~2386) toma precios del maestro, valida existencias reales de la bodega de la tienda (`getRealStockMap`), crea con `orderService.createOrder` (consecutivo canónico y freno de gemelos de 2 min), descuenta inventario al crear (D-204), genera el link con `paymentGateway.generatePaymentLink` (Wompi, un solo uso, 24 h) en `pagoTienda.linkIds`, y el webhook de Wompi lo concilia con `aplicarPagoDeTienda` (transacción, idempotente). Pero es un manejador HTTP atado a un sitio publicado (tienda con bodega, productos con `marketplace.paginaWeb`, pago aplicado solo con `siteId`). **No existe** una función interna que cree un pedido de tienda sin la petición.
- **Pasarela.** `getPaymentCredentials` usa la del comercio en Integraciones y, si no tiene, la cuenta de la plataforma.
- **Asesor.** El bot firma `vendedor: { email: "", nombre: "Bot WhatsApp — X" }`. `getMetrics` y `porVendedor` agrupan por `vendedor.email`: esas cotizaciones caen en «Sin comercial» y no salen en el filtro. Además pasan a `enviada` sin `fechaEnviada` ni evento de historial. **Después se hizo y se publicó (D-481, backend 6c2cf351, nota 2 del ticket):** `vendedor: { email: "kai", nombre: "KAI" }`, `contactoVendedor` que no trata `kai` como correo y `tests/cotizaciones/asesorKai.test.js`.

## What Changes

**Parte 1 — Asesor KAI (no toca pedidos).**
- Se adopta lo que está en curso: asesor `kai` / «KAI» en filtro, comparativa e indicadores; el enlace público no muestra `kai` como correo.
- El paso a `enviada` del bot se registra como los demás (`fechaEnviada` y evento en `historialEstados`), para que cuente en «primera respuesta» y «ciclo de cierre».
- Los pedidos del bot (parte 2) llevan el mismo vendedor KAI.

**Parte 2 — Pedido directo con link de pago (sensible, detrás de bandera).**
- **Bandera `whatsappBotDirectOrder`** en `companies.featureFlags` (catálogo de `companyFeatureFlags.js` y `company-features.service.ts`), **apagada de fábrica**. Su interruptor general pasa del `.env` a `config/feature_flags` (**SUPERSEDED (21-oct)** por D-505 y D-518; `design.md`, D9). Apagada, el bot queda idéntico a hoy; apagarla es el kill switch. Primero en FLORECER; se retira 30 días después de encenderla para todos (Artículo XII).
- **Condiciones**, todas: bot encendido y fuera de modo sombra; tienda publicada con pedidos, bodega y pago en línea; pasarela **propia** del comercio activa (el bot nunca cobra con la cuenta de la plataforma). Si falta una, el cierre sigue siendo cotización.
- **Cierre.** Cuando el cliente confirma el resumen (productos y total del servidor) y elige pagar en línea, el bot crea el **pedido** por el mismo núcleo de `crearPedido`: precios, existencias, consecutivo, inventario al crear, link Wompi y conciliación por el webhook existente. Responde con número de pedido, total y link.
- **Reutilizar sin duplicar.** Se extrae el núcleo de `crearPedido` a un servicio interno que usan la ruta pública y el bot; la ruta pública queda idéntica, con pruebas de caracterización escritas **antes** de mover código. La alternativa (petición simulada, como catálogos y el bot con `cotizaciones.create`) se evalúa en el design.
- **Marcas.** `origen: "whatsapp-bot"`, `whatsappPhoneHash` y vendedor KAI. Con ese origen no corren los efectos propios de la página: analítica y contador del sitio, conversión a Meta/Google, carrito abandonado y plantilla de confirmación contra entrega. **(21-oct)** Tampoco la plantilla de WhatsApp de pedido creado (F4-40·4). El recordatorio y `/pagar`, que D-496 apagaba para este pedido, se encienden por la conversación (F4-40·5; parte 3).
- **Idempotencia (Artículo IV).** Llave por conversación y carrito en la sesión del bot (`whatsapp_bot_sessions`, existente): un reintento de Kapso, una ráfaga o un segundo «sí» devuelven el mismo pedido y link. Se suma el freno de gemelos de `orderService`.
- **Si algo cambia** antes de crear (precio, existencias, cupo del día, tope del plan), no se crea nada: el bot dice qué cambió y pide confirmar; si no se resuelve, pasa a un asesor. Si el link no sale, el pedido queda pendiente de pago y pasa a un asesor con el número.
- **Límites.** Nunca inventa precios, existencias, descuentos, cupones ni valor del domicilio: el envío sale de la tienda (tarifa fija o zona de `zonacobro`) y si la ciudad no da una sola zona, no hay pedido. Si el cliente pide una persona, se traspasa (`traspasoMotivo`) sin crear pedido.
- **Modo sombra:** registra «así habría creado el pedido» sin crear ni cobrar. **Observabilidad (VII, XI):** eventos `pedido_directo_ok|cae_a_cotizacion|fallido` con `phoneHash`, sin teléfonos ni nombres.

**Write-set del camino nuevo.** Permitido: `orders`, contador `consecutives`, `inventory`/`inventoryMovement` solo vía `inventoryService.updateByPOS` (sin lógica nueva), `clients` (como la tienda) y la sesión del bot. Prohibido: `products`, catálogo, precios, precios por cliente y listas de precios; un contract test falla si se escribe fuera. Decisión: D-496 (aprobada por Daniel el 2026-10-18).

**Parte 3 — Ampliación por D-518 (21-oct). PENDIENTE DE APROBACIÓN.**

F4-40·2 reparte el ticket. A esta propuesta le toca **WhatsApp y web**: pedido, cotización, pago, memoria, postventa informativa, recuperación y métricas de KAI. Instagram, Messenger, preguntas frecuentes, desborde y encuesta van a [CONV] F; las métricas de atención, a [CONV] H; el correo sale del alcance. Lo que se agrega:

- **Cotizables (F4-40·3).** Si el carrito del bot trae un producto «Cotiza con un asesor», todo el carrito va a una cotización, nunca a pedido directo. En la web, KAI ofrece «Cotiza con un asesor» en vez de agregarlo al carrito.
- **«Y confirma» (F4-40·4).** Al aprobarse el pago de un pedido del bot sale la plantilla existente `katuq_payment_approved_v1`, una sola vez, al celular de la conversación. La plantilla de pedido creado no se envía en los pedidos del bot.
- **Recuperar ventas (F4-40·5):**
  - El bot entrega el enlace de `/pagar`, que sirve mientras el pedido esté apartado y reabre el pago si el banco lo rechazó.
  - Entre los 20 y los 55 minutos, si no ha pagado, el bot le recuerda en la misma conversación y por el mismo número, aunque el pedido no tenga correo. Si eso no puede salir, va el correo de siempre (pregunta 5).
  - Dentro de las 24 horas, el bot retoma una vez el carrito sin cerrar y la cotización sin respuesta. En la cotización ofrece verla y hablar con un asesor; no promete que se acepte en el enlace, porque hoy ese enlace pide un documento que el bot no guarda (pregunta 17).
  - **[21-oct, crítica]** El recordatorio y los seguimientos corren en una tarea que siempre está programada y lee sus interruptores en Firestore en cada vuelta. No dependen del candado del `.env` del recordatorio de la tienda, que viene apagado de fábrica. La misma tarea vence a tiempo la reserva de los pedidos del bot.
  - Fuera de las 24 horas, segunda etapa: con plantilla, permiso registrado y el horario de la Ley 2300. **Bloqueada hasta el OK de Daniel al costo.**
- **KAI nunca descuenta (F4-40·6)**, en WhatsApp ni en la web.
- **Postventa informativa (F4-40·7).** KAI responde envíos, cambios, devoluciones, garantía y tiempos con lo que el comercio publicó. Ante un cambio o un reclamo, informa y pasa a una persona; no tramita.
- **Agenda (F4-40·8).** KAI ofrece días y franjas libres de la Agenda de D-491 y reserva la cita como «Solicitada», con el origen `opttia` que D-491 ya dejó reservado para «Opttia agenda por WhatsApp». Esta propuesta absorbe esa parte de la tarea 7.1 de D-491. La confirmación en el chat es la respuesta a lo que el cliente pidió, no un aviso automático.
- **Atribución (F4-40·9).** «Vendido con Opttia» lee el pedido generado desde la cotización y cuenta también los pedidos directos (tarea 6.8, confirmada).
- **Memoria.** KAI ve las cotizaciones de ese número de WhatsApp: las del bot y las que una persona hizo con ese número. Las cotizaciones hechas sin el WhatsApp del cliente no aparecen (recorte declarado). El pedido del bot guarda de dónde llegó el contacto (enlace de la web o anuncio, F3-24), sin usarlo para informar conversiones.
- **[21-oct, crítica] La página de gracias no cuenta la compra del bot.** Si el cliente del bot paga y vuelve a la página de gracias de la tienda, esa página no le informa la compra a Meta, Google ni TikTok. Así se cumple lo que la spec aprobada ya decía.
- **Pase a una persona (F4-40·1).** Chatwoot se descarta. El panel del hilo en la bandeja de Katuq muestra el último pedido creado por el bot para ese número, también después de que la conversación se reabrió.
- **Métricas de KAI.** Marcas en cada registro para contar pedidos, cotizaciones, ventas atribuidas, pagos recuperados y citas de KAI, y en la web los pedidos asistidos por KAI.
- **Repo `kai` (nuevo en las tareas).** Hoy el prompt del agente dice lo contrario del pedido directo: «Tú NO cierras la venta… No cobras» (`agent.py:1088-1090`), «un asesor se lo confirma» (:1169) y el docstring de `cerrar_pedido` (:383). Se ajusta solo cuando el backend manda la capacidad; sin ella, el texto es idéntico al de hoy.
- **Interruptores en Firestore (D-505).** `WHATSAPP_BOT_PEDIDO_DIRECTO_HABILITADO` pasa a `config/feature_flags.whatsappBotDirectOrder`. Las piezas nuevas usan las banderas `whatsappBotAttention` y `whatsappBotFollowUp`, cada una con su interruptor general en `config/feature_flags`. No se agrega nada al `.env`.
- **Piloto (F4-40·10).** FLORECER con un número propio de prueba, Wompi propio y tienda publicada.

**Cobertura de F4-40·2 («WhatsApp y web»), ítem por ítem:**

| Ítem | WhatsApp | Web |
|---|---|---|
| Pedido | D-496 y D10 (cotizables) | Ya existe: KAI arma el carrito (D-469) y el checkout de la tienda crea el pedido. Sin cambio |
| Cotización | Cotización del bot (hoy) y D10 | D21: «Cotiza con un asesor» abre el formulario de D-475 |
| Pago | D11 a D13 | Ya existe: checkout y `/pagar` de la tienda. Sin cambio |
| Memoria | D15 | Fuera: la tienda no identifica al visitante (la sesión mayorista de F5-28 no se le pasa al asesor; recorte declarado). KAI remite al WhatsApp del comercio |
| Postventa informativa | D17. El estado del pedido ya existe (últimos 3 pedidos del contacto) | D21: políticas, garantía y tiempo de entrega. El estado del pedido, que F4-27 dejó pendiente, se resuelve remitiendo al WhatsApp, donde KAI sí sabe quién es |
| Recuperación | D13 y D16 | Ya existe: carrito abandonado de la tienda (correo) y plantilla `whatsappCartRecovery` (F2-21). El asesor web no hace seguimiento: no sabe a quién escribirle |
| Métricas de KAI | D19 y D20 | D21: `asistidoPorKai` |
| Horario configurable | Ya existe: `bot.horario*` (`whatsappBotDispatcher.js:492-511`) | No aplica: el asesor web responde siempre y se apaga con `tienda.asesorKai` |
| Pausa por canal | Ya existe: bot encendido por comercio, más las banderas de esta propuesta | Ya existe: `tienda.asesorKai` (`sites.js:9453`) |
| Tono de Mi marca | Pregunta 9 | Pregunta 9 |
| Registro en el CRM | Pregunta 10 | Pregunta 10 |
| Ley 1581 | Lista de no contactar en todo envío del bot, también en los proactivos | La web no envía mensajes |

Capacidades nuevas y write-sets: `design.md`, sección «Ampliación 21-oct». Los detalles de seguridad están en la revisión privada del backend (`pedido-whatsapp-con-link-de-pago-seguridad`); aquí solo se dice «ver revisión privada».

## Capabilities

### New Capabilities
- `whatsapp-bot-pedido-directo`: el bot crea el pedido con link de pago cuando bandera y condiciones lo permiten, y deja cotización cuando no.

- **[21-oct, pendientes]** `whatsapp-bot-pago-y-recuperacion`: el enlace para pagar, la confirmación del pago, el recordatorio y los seguimientos.
- **[21-oct, pendientes]** `kai-whatsapp-atencion`: memoria, origen, postventa informativa, agenda, «nunca descuenta» y el pedido visible en la bandeja.
- **[21-oct, pendientes]** `kai-metricas`: «Vendido con Opttia», las marcas de KAI y las ventas asistidas en la web.
- **[21-oct, pendientes]** `kai-asesor-web`: cotizables, políticas y «nunca descuenta» en el asesor de la tienda.

### Modified Capabilities
- `whatsapp-bot-pedidos` (en `changes/add-bot-pedidos-whatsapp`, sin archivar): el cierre deja de ser solo cotización y el asesor es KAI.
- **[21-oct, pendiente]** `whatsapp-bot-pedido-directo` (de este cambio): cotizables, enlace de `/pagar`, repetición mientras el pedido esté apartado y «nunca descuenta».

## No-goals

- Arreglar `convertir-pedido` / `convertirCotizacionAPedido`, o la aprobación por link sin documento: van aparte.
- Contra entrega y formas manuales por el bot en esta fase.
- Comercios sin tienda publicada o sin pasarela propia.
- Colecciones nuevas, endpoints «v2» o cambios al webhook de Wompi, a D-204 o a la lógica de inventario.
- **(21-oct, D-518)** Chatwoot (F4-40·1). Instagram, Messenger, preguntas frecuentes, desborde con contexto y encuesta ([CONV] F). Métricas de atención ([CONV] H). Correo como canal (F4-40·2).
- **(21-oct)** Tramitar cambios o devoluciones (F4-40·7). Descuentos de KAI (F4-40·6). Unificar los motores de KAI de la web y de WhatsApp.
- **(21-oct)** Recuperación fuera de las 24 horas mientras Daniel no apruebe el costo (F4-40·5).

## Riesgos

- **Pedidos (sensible).** Extraer el núcleo de `crearPedido` toca los pedidos de todas las tiendas: caracterización previa, un cambio a la vez con diff aprobado, bandera apagada.
- **Consecutivos.** Si falla una validación previa no se gasta número; un pedido cuyo link falla no se borra, queda pendiente de pago (como en la tienda).
- **Inventario.** La tienda anula a los 60 min el pedido en línea no pagado (D-206, `RESERVA_TIENDA_MINUTOS`), devuelve existencias y lo revive si paga tarde. El barrido no filtra por sitio: alcanzaría a los pedidos del bot.
- **Pagos duplicados.** Los frenan la llave de idempotencia y el link de un solo uso en `pagoTienda.linkIds`; un link nuevo para el mismo pedido se suma a la lista (ya soportado).
- **Idempotencia.** El freno de gemelos cubre 2 min; la llave de sesión, los reintentos tardíos. Un carrito cambiado después abre otro pedido; el creado nunca se modifica.
- **Totales distintos.** El bot calcula hoy con `calcularTotales` de cotizaciones; la tienda con `precioParaCliente`, promociones y envío. El total mostrado debe salir del cálculo que cobra; si no coinciden, no hay pedido.
- **Clientes duplicados.** Tienda y bot resuelven al cliente por teléfono; no deben quedar dos fichas en `clients`.
- **(21-oct) Pagos (sensible).** `/pagar`, `aplicarPagoDeTienda` y el cron del recordatorio son los mismos para todas las tiendas, y F2-41 los está tocando ahora. Cada cambio filtra por el origen del bot y va con prueba de que la tienda normal no cambia, con diff aprobado y después de F2-41 (T·2).
- **(21-oct) Notificaciones compartidas.** Omitir la plantilla de pedido creado y pasar el número del chat a la cola toca código que usan todos los canales. Es un filtro aditivo por origen, con prueba de los demás canales.
- **(21-oct) Mensajes proactivos.** Spam, costo y hablarle encima a una persona. Los mitigan un mensaje por día, la ventana, el horario, la lista de no contactar, el saldo y un tope por empresa (ver revisión privada).
- **(21-oct) Prompt del agente.** Cambiar las reglas puede degradar conversaciones que hoy funcionan. Por eso cada cambio depende de una capacidad, hay una prueba dorada sin capacidades y el encendido es gradual en FLORECER.
- **(21-oct) Agenda.** La reserva desde el bot comparte la transacción de la web. El origen `opttia` se trata como público (Solicitada).
- **(21-oct, crítica) Consultas con tope.** Algunas consultas existentes y nuevas leen un número fijo de pedidos sin orden. Con muchos pedidos viejos pueden dejar por fuera los nuevos. Lo nuevo de este cambio consulta solo lo que necesita. Lo que ya existe en la tienda se escala (pregunta 18; ver revisión privada).
- **(21-oct, crítica) Página de gracias y TX-34.** Quitar la conversión del pedido del bot toca la misma página que TX-34 reescribe (`tienda-celular-y-velocidad`, tareas 4.1 y 4.2). Por T·2, este cambio se une antes.

## Bloqueos (21-oct)

- **Ningún comercio tiene número propio.** D-437 midió el 15-oct que todos salen por el número compartido, y el bot solo corre en un número propio o en una línea de D-437. Sin un número de prueba conectado, el criterio (a) no se puede mostrar (tarea 15.1).
- **Instagram y Messenger.** Meta rechazó `pages_messaging` e `instagram_manage_messages` (D-249, 26-ago), y el contrato no registra una aprobación posterior. Va en [CONV] F, no aquí.
- **Costo de Meta.** Según su página de precios, consultada el 20-oct por el lector del informe de D-518 (no se volvió a verificar aquí), desde el 1-oct-2026 Meta cobra los mensajes de servicio por encima de 1.000 al mes por número y los de utilidad dentro de la ventana. Eso encarece el recordatorio, los seguimientos y la plantilla de pago aprobado. El bot ya descuenta cada mensaje del saldo prepago del comercio (`billingService.canSend`). La segunda etapa espera el OK de costo de Daniel.
- **Plantilla `katuq_payment_approved_v1`.** En el código figura como `ready_for_meta_approval`. Hay que confirmar que esté aprobada en el WABA del número del piloto.
- **Orden de unión (T·2 y orden de trabajo de D-518).** Primero F2-41, que hoy está sin commit en `feature/tickets-web` y mueve `crearPedido`, `aplicarPagoDeTienda`, la reserva y `/pagar`. Después, los arreglos sin diseño nuevo del paso 3 de D-518 que tocan `crearPedido` (bloqueo del cotizable de `cotizable-arreglos` y D-505). Después la extracción de D-496. Las tareas de pagos de esta ampliación se unen antes que suscripciones y que el pago rechazado de TX-34.
- **Repo kai.** No se sabe qué commit corre en producción. La copia local está en `feat/claude-agent-sdk` (25ddfda), y `origin/main` ni siquiera tiene `channels/whatsapp`. La prueba dorada debe salir de lo que corre en producción (pregunta 15).
- **Llaves del piloto.** Además del número, el piloto necesita el canal de avisos de WhatsApp aceptado en FLORECER (D-437 midió que solo ALMARA lo tiene), la plantilla habilitada, el aviso de pago encendido y, si el número es una línea de D-437, `whatsappMultiNumero` con su interruptor general (tarea 15.1).
- **Pendientes de antes:** la revisión de seguridad 0.5 (S3, S4 y S5), el visto bueno a los 12 desvíos de `design.md` y el desvío 10 (el barrido D-206 frente a Kuvo).

## Preguntas para Daniel

Las preguntas 1 a 6 de la versión del 18-oct quedaron **resueltas** con los valores por defecto aprobados en bloque ese día (`design.md`, «Valores por defecto»). Se conservan como registro:

1. ¿Extraer el núcleo de `crearPedido` (recomendado) o petición simulada?
2. ¿La tienda publicada es requisito, o sin tienda el bot usa `POST /v1/orders/create` de venta asistida (también genera link Wompi y concilia por `pagoInformation.linkId`)?
3. ¿Contra entrega y transferencia crean pedido directo, o solo pago en línea en esta fase?
4. ¿Los 60 min de reserva sirven para WhatsApp, donde el cliente puede tardar más?
5. ¿KAI tiene meta mensual? Hoy `normalizarMetas` solo acepta correos.
6. ¿Piloto en FLORECER y después ALMARA FELICIDAD?

**Preguntas nuevas (21-oct)**, con mi recomendación. D-518 no las resuelve y ninguna vuelve a preguntar algo que ya decidió:

1. **Banderas.** ¿Tres banderas por comercio (`whatsappBotDirectOrder`, `whatsappBotAttention` y `whatsappBotFollowUp`), cada una con su interruptor general en `config/feature_flags`, más `whatsappBotFollowUpTemplates` para la etapa 2? *Recomiendo sí:* cada pieza se apaga sola sin tocar las demás.
2. **Plantilla de pago aprobado.** ¿Respeta el interruptor «pago aprobado» que el comercio tiene en Notificaciones y sale por el número de la conversación? *Recomiendo sí a las dos:* es la regla de todos sus avisos, y otro número abriría otro chat.
3. **SMS de pedido creado.** En los pedidos del bot, ¿también se omite el SMS al comprador, además de la plantilla de WhatsApp? *Recomiendo sí:* el cliente ya tiene número y enlace en el chat.
4. **El enlace que entrega el bot.** ¿Desde el primer mensaje es el de `/pagar` y no el de Wompi? *Recomiendo sí:* un solo enlace sirve para el reenvío y para el reintento si el banco rechaza.
5. **Recordatorio de pago del bot.** ¿Solo por WhatsApp, con el correo solo como respaldo si el mensaje no sale? *Recomiendo sí*, como en `whatsapp-confirmacion-y-carrito`. Con el interruptor del bot apagado, los pedidos del bot no reciben recordatorio, como en lo aprobado el 18-oct.
6. **Horario de los seguimientos dentro de 24 h.** ¿Aplica también el horario de la Ley 2300, además del horario del bot? *Recomiendo sí para los seguimientos de carrito y cotización:* son contacto comercial. El recordatorio de pago queda exento, porque llega minutos después de que el cliente pidió.
7. **Tiempos de los seguimientos.** ¿2 horas sin respuesta para el carrito y 4 para la cotización, una vez por conversación y por día? *Recomiendo esos valores* y medirlos en el piloto.
8. **Cotizaciones de KAI en «Requieren atención»** (D-427, D-428). ¿Quién responde después del seguimiento? *Recomiendo:* KAI hace un solo seguimiento, y después siguen con el asesor KAI, a la vista de los administradores. Sin reasignación automática.
9. **Tono de «Mi marca».** ¿Entra en F4-40? El ticket lo pide y D-518 no lo asigna. *Recomiendo sí:* pasarle al agente el tono que ya guarda Mi marca (`controllers/companies.js` ≈2159) es barato. Las preguntas frecuentes siguen en [CONV] F.
10. **Registrar cada conversación en el CRM y asignar el vendedor** (ticket 1064, cd `lBVv92nUKqJSeGK7lEdp`). *Recomiendo dejarlo en [CONV] B y C.* Aquí, el pedido crea o actualiza el cliente como hoy y la cita queda en la Agenda.
11. **«Un solo agente».** ¿Basta con las mismas reglas y los mismos datos en la web (una pasada) y en WhatsApp (ADK)? *Recomiendo sí*, por D-257: no se mezclan motores en un mismo caso de uso.
12. **«¿De dónde vienen tus ventas?»** (F3-25). ¿Los pedidos del bot salen ahí como «WhatsApp (KAI)»? *Recomiendo sí*, leyendo `orders` sin escribir `site_events`, en un cambio aparte de F3-25.
13. **Dónde se ven las métricas de KAI.** *Recomiendo:* «Vendido con Opttia» en En vivo (ya existe), el asesor KAI en Cotizaciones (ya existe) y un bloque «KAI» en «Cómo va» con pedidos, ventas, pagos recuperados y citas, con su propia spec de UI.
14. **Citas desde el bot.** ¿Nacen «Solicitadas» (las confirma el comercio), con un tope de 2 futuras por celular? *Recomiendo sí*, igual que la web.
15. **Rama y despliegue de `kai`.** ¿En qué rama van los cambios del agente? Hoy la copia local está en `feat/claude-agent-sdk`, y producción se despliega con `git pull` y `systemctl restart kai-adk`. *Recomiendo* una rama desde lo que corre en producción, desplegada por ti antes que el backend.
16. **Número del piloto.** ¿Quién conecta el número propio de prueba de FLORECER, y como línea de D-437 o como número propio? *Recomiendo* una SIM de Julsmind como línea de D-437 con coexistencia. Al ser de Katuq, no hace falta la verificación por código de `whatsapp-confirmacion-y-carrito`.
17. **Cotización del bot: aceptarla desde el chat.** El enlace de la cotización pide un documento que el bot no guarda (`whatsappBotCierre.js:321-330` frente a `cotizaciones.js:1450-1453`), así que el cliente no la puede aceptar. Con F4-40·3 habrá más cotizaciones del bot. ¿Se abre un cambio para aceptarla desde la conversación, sabiendo quién escribe por el número? *Recomiendo no hacerlo aquí*, porque es el no-goal «aprobación por link sin documento». Mientras tanto, el seguimiento y la memoria ofrecen verla y hablar con un asesor, sin prometer que se acepta en el enlace.
18. **Consultas con tope de la tienda (hallazgo escalado, ver revisión privada).** El recordatorio y el barrido de reservas de la tienda leen un número fijo de pedidos sin orden. ¿Se abre un cambio aparte, después de T·2? *Recomiendo sí.* Lo nuevo de este cambio ya no depende de esas consultas.


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
