> **Estado:** borrador — pendiente aprobación de Daniel.
> **Tickets (categoría «Comunicaciones (KCOM)», todos Pendiente):**
> - KCOM-E1 `IpUXsaknAa6FVQutp8WB` (nroTicket 1404)
> - KCOM-E2 `eq79YURLqAA73K4chi9S` (1403)
> - KCOM-E3 `BFZKiu1vxiJCcFwajYcJ` (1402)
> - KCOM-E4 `oCRxH4eNthWDRGgpUoPX` (1401)
> - KCOM-E5 `H9e62jr4BXm2uCDOiynx` (1400)
>
> **Decisión:** D-632.
> **Origen:** Jairo Arango (Spec «Katuq Comunicaciones» v1.1, 24-oct-2026, con Mockups v1.0 y borrador de respuestas a TikTok); tickets creados por Daniel el 25-oct, con Julián y Santiago de apoyo y Jairo como observador.
> Esta propuesta es el **paraguas**: fija alcance, orden, dependencias, límites y preguntas. No es para implementar. Cada épica abre su propio cambio OpenSpec (spec, design, tasks) con su aprobación, y el número de decisión de cada una lo asigna quien la registre en `specs/CONTRACT.md`.

## Why

Jairo quiere que Katuq compita con Hibot y B2Chat sin copiarlos: esas son bandejas que se integran a un ERP, y Katuq es el ERP. La tesis de la spec es que quien atiende (o KAI) ve el stock real, el precio de la lista del cliente, sus pedidos y su cartera, y crea el pedido sin salir del chat. Son 5 épicas, 13 a 14 semanas-equipo según los tickets (E1 3, E2 3, E3 3, E4 2 a 3 tras la aprobación de TikTok, E5 2; sin validar).

El alcance es solo conversaciones (WhatsApp, Instagram, Messenger y TikTok). Quedan fuera Katuq Marketing (envíos masivos), Correo y Llamadas.

Dos hechos cambian cómo se debe leer el pedido:

1. **Gran parte de la base ya está construida.** Hay un dominio de Mensajería con Strategy (D-437), buzones de Instagram y Facebook (D-170), un bot de pedidos con KAI y plantillas de WhatsApp. El riesgo mayor es construir un segundo modelo de cuentas y conversaciones al lado del actual (la spec §6 propone `channelAccounts`, `conversations` y `messages`).
2. **Este frente cruza con CONV (D-631, ticket padre 1298, hijos A a M).** CONV nació el 18-oct con el mismo objetivo (bandeja única, multiagente, 18 y 200 números, Vidagas). Ya está en borrador y recomienda que los KCOM sean fuentes de requisitos. Hay que decidir juntos quién manda antes de abrir ninguna épica (pregunta 1).

Lectura completa: los 5 tickets con descripción, comentarios y adjuntos (solo E4 trae 1 comentario, con los enlaces a la API de TikTok; E1, E2, E3 y E5 traen 0); la Spec v1.1 (11 páginas), el borrador de respuestas a TikTok (4 páginas) y los Mockups (5 páginas, solo el texto: las pantallas son imágenes y no se evaluaron). El ticket cita la «Spec v1.0», pero los adjuntos son la v1.1; se usó la v1.1.

## Qué ya existe frente a lo que pide cada épica

Verificado en el código de los worktrees (front `wt-front-aws-claude-2`, backend `wt-back-aws-claude-2`, ADK en solo lectura). No se leyó ni escribió ninguna base de datos (D-579); el estado de producción no se midió.

| Épica | Ya existe | Falta de verdad |
|---|---|---|
| **E1 canales y números** (1404) | Dominio `services/messaging/` con `messagingManager.js`, provider Kapso (`providers/kapsoWhatsappProvider.js`), líneas en `messaging_lines`, rutas `/v1/messaging` para conectar por enlace de Kapso, confirmar, editar y desconectar (`routers/messaging.js`), bandera `whatsappMultiNumero` (D-437). Salida y ventana de 24 h por número (`whatsappOutboundService.js:50,94`). Plantillas: constructor (`whatsappTemplateBuilder.js`) y listado (`GET /v1/whatsapp/kapso-templates`, `routers/whatsapp.js:1143`). Saldo prepago y cobro fijo de $80 por mensaje (D-044). Instagram y Facebook: `metaWebhook.js`, `metaSendService.js`, tokens cifrados (`metaCompanyConfig.js:15`), una cuenta y una página por comercio. Anuncio Click-to-WhatsApp: `referral` leído en `inbound/inboundProcessor.js:89-98` y `whatsappWebhook.js:539-549`. Webhook con evento crudo e idempotencia (`inbound/rawEvents.js`). | Costo real por mensaje en COP (hoy $80 fijo); ventana de Instagram y Messenger con etiqueta HUMAN_AGENT (no aparece en el código); varias cuentas de Instagram y varias páginas; estado de cuenta y calidad del número; referral de Instagram y Messenger; ver el estado de aprobación de las plantillas y usarlas con variables en el compositor; permisos de Meta con acceso avanzado (D-170 los dejó en estándar). |
| **E2 bandeja unificada** (1403) | Tres bandejas separadas: `notificaciones/whatsapp-inbox` (incluye la pestaña de pedidos del bot, `whatsapp-pedidos-list`), `meta-inbox` (Instagram y Facebook) e `inbox-core` (`chat-dueno`, `chip-linea`). Dueño único por chat con tomar, soltar y asignar (`threads/threadOwnership.js`). Filtro por vendedor en el servidor (`access/messagingAccess.js`). Horario y bienvenida dentro del bot. | Bandeja única con los canales como filtros; estados (abierta, pendiente, pospuesta, resuelta); asignación por dueño del cliente, equipo y reparto rotativo; SLA; notas internas con menciones; etiquetas; respuestas rápidas editables por equipo; notificaciones push; métricas de atención y conversión chat a pedido. Revierte en parte D-170 («tres buzones separados») y los no-goals de D-437 (reparto, SLA, etiquetas, notas). |
| **E3 vender en el chat y KAI** (1402) | Agente de pedidos del ADK (`kai/adk_agent/channels/whatsapp/agent.py`): lista blanca con `search_products`, `get_product_stock` y `get_product_catalog` (líneas 38-42), carrito local, `mostrar_producto`, `pasar_a_un_asesor`, `pedir_cita`, y la regla «solo afirmas lo que te devolvió una herramienta» (RC04 ya está en el prompt, hacia las líneas 1303-1330). El backend deja una **cotización en borrador** y tiene modo sombra. Pedido directo con reserva y link de pago (`whatsappBotPedidoDirecto.js`, D-496) detrás de banderas, pero `evaluar` devuelve `nucleo_no_disponible` porque `sites.crearPedidoDeTienda` no existe (solo `exports.crearPedido`, `controllers/sites.js:2881`): espera la extracción del motor (KCAT-E1, D-630). Botones interactivos (`whatsappInteractivo.js`). | **Reproducir primero la brecha del 16-oct** («no puedo consultar el catálogo»): las herramientas de catálogo y existencias ya están en la lista blanca, así que la falla puede ser de configuración, del puente de herramientas o del canal, no de falta de herramienta. Después: precio según la lista del tipo de cliente y stock según las bodegas del canal (por verificar qué devuelven hoy las herramientas); canales Instagram, Messenger y TikTok para KAI; fuente del canal y `conversationId` en la cotización o el pedido; carrito en vivo en la pestaña de pedidos; panel del asesor con Venta Asistida embebida; base de conocimiento editable; calificar respuestas. |
| **E4 TikTok** (1401) | Solo la tarjeta «Próximamente» (D-509). El `event/track` de TikTok en `services/medicionServidor.js:225` es la API de **anuncios** (conversiones) y no sirve para mensajes. | Todo el canal: solicitud de acceso (E4.1, trámite humano de Jairo y Daniel, no es código), OAuth, adapter, webhook de nivel app, regla 48 h / 10 mensajes, mensajes automáticos, links `tiktok.me`, atribución, KAI en TikTok. |
| **E5 seguridad** (1400) | `secretsCrypto` (AES-256-GCM) cifra tokens de Meta. Aislamiento por empresa (`requireJwtTenant`), rol con auditoría (`requireRole`), `messagingAccess`. Webhook con firma, reserva de idempotencia y evento crudo. | Llave **gestionada (KMS)**: hoy `secretsCrypto` deriva la llave de `SECRET_TOKEN` del `.env`, no es KMS. Registro de quién leyó, envió, transfirió o exportó; retención y borrado por canal; proveedor de IA sin entrenamiento y registro de cuál respondió; monitoreo de webhooks y alertas; escaneo de vulnerabilidades; documentos (política, incidentes, borrado, flujo de datos). |

## Orden y fases

Orden de los tickets y de la spec §9: la solicitud de TikTok y el escaneo arrancan **ya** porque la aprobación es lo más largo; luego E1 y las herramientas de KAI de E3; luego E2; E4 se integra cuando TikTok apruebe; E5 va transversal.

0. **Sin código, ya.** E4.1 (solicitud de acceso, la hacen Jairo y Daniel); E5.7 (escaneo de vulnerabilidades); corregir el borrador de respuestas a TikTok antes de enviarlo (riesgo 3); decisiones de las preguntas 1 a 4.
1. **E1 y E3-herramientas, en paralelo.** E1: costo y saldo, ventana por canal, plantillas, atribución, estado de cuentas. E3: reproducir la brecha, herramientas de KAI con precio por lista y stock por canal, cotización con fuente. El **pedido** directo desde el chat espera a KCAT-E1.
2. **E2.** Bandeja única, estados, asignación, SLA, notas, métricas. Es la parte que más se cruza con CONV B, C, D, E y H.
3. **E4 integración**, solo al aprobar TikTok (estimación 2 a 3 semanas después).
4. **E5 transversal**, con un hito antes de enviar el cuestionario de TikTok (cifrado, escaneo, documentos) y otro antes de abrir cualquier canal a más comercios.

Nombres sugeridos para los cambios hijos: `kcom-e1-canales-y-numeros`, `kcom-e3-vender-en-el-chat`, `kcom-e2-bandeja-unificada`, `kcom-e4-canal-tiktok`, `kcom-e5-seguridad-y-monitoreo`. Cada uno se abre **al empezarla**, no antes. En pedidos, pagos e inventario, un cambio a la vez con su diff aprobado.

## Alcance de este paraguas

Incluye el orden, las dependencias, los límites y las preguntas. No incluye código, `design.md` ni `tasks.md`.

## No-goals

1. **Duplicar lo que ya hay.** Ni un segundo modelo de cuentas junto a `messaging_lines` y `messaging_threads`, ni una cuarta bandeja, ni otro bot. La bandeja única **evoluciona** las piezas actuales y las rutas de hoy siguen funcionando como filtros.
2. **Colecciones, endpoints o módulos «v2» sin aprobación** (`openspec/config.yaml`). Las `channelAccounts`, `conversations` y `messages` de la spec §6 no se crean; la alternativa por defecto es ampliar las líneas, los hilos y `meta_messages`. Lo nuevo de verdad (SLA, etiquetas, notas, costos, auditoría de lectura) se aprueba en la épica que lo necesite.
3. **Escribir productos, precios o inventario desde el chat (D-134).** KAI y el asesor leen catálogo, precio y existencias. El pedido o la cotización nacen por el camino de pedidos existente. Una reserva de stock nueva o un cambio de cuándo se mueve el inventario no entran aquí: otra propuesta.
4. **Construir lo que Meta o TikTok no permiten.** Comment-to-Message de TikTok (no aplica en Colombia), escribir primero en TikTok, plantillas o envíos masivos en TikTok, promociones o bot dentro de HUMAN_AGENT.
5. **Mover Marketing, Correo, Llamadas o TikTok Shop** a este frente.
6. **Tocar el número compartido de Katuq, las notificaciones de pedido o el bot piloto de ALMARA.** Todo lo nuevo nace detrás de bandera por empresa (D-505), con kill switch propio.
7. **Declarar controles que no existen** ante TikTok (KMS, MFA, escaneo, SOC 2) y **llamar modelos de IA directo** (D-257; la IA va por Opttia/ADK).

## Dependencias

E3-pedido depende de KCAT-E1 (D-630, borrador). E2 depende de E1 (adaptadores de canal) y se cruza con CONV B a E. E4 depende de la aprobación de TikTok y de E5.7 (el escaneo acelera la revisión) y de que la salida y la ventana por canal (E1) estén listas. E1.6 y E4.8 alimentan KLAN-E2 (D-633, atribución). E5 no depende de nadie y condiciona a E4.

## Riesgos sobre módulos sensibles

- **Pedidos y pagos.** Cotización o pedido PENDIENTE desde un chat toca la creación de pedidos (módulo sensible). Hereda los frenos del bot de pedidos (topes, idempotencia, modo sombra). Un cambio a la vez, con diff aprobado.
- **Inventario.** Solo lectura de existencias por canal. Si el pedido pasa a descontar o reservar distinto, afecta POS, ventas y los flows de Shopify de OH MY STORE: fuera de este paraguas.
- **Datos personales (Ley 1581) y borrado.** Una conversación guarda teléfono, nombre, imágenes y audios. E5.4 pide borrar en ≤30 días al desconectar; la guía vigente dice que **no se borran registros de `katuq-db` sin el sí de Daniel** (D-579). Hace falta una aprobación explícita del borrado por canal.
- **Borrador de respuestas a TikTok desactualizado.** Declara Google Cloud y Firestore como alojamiento y cifrado «por defecto del proveedor»; desde el 1-nov-2026 los datos están en PostgreSQL (D-579). Además marca KMS como «CONFIRMAR», y hoy el cifrado de secretos usa una llave del `.env`. Enviar eso tal cual sería declarar lo que no es.
- **Costos.** Hoy Katuq paga a Meta y cobra $80 fijo por mensaje (D-044). Los tickets traen cifras que chocan entre sí (ver preguntas para Jairo 3 y 4); cobrar mal un mensaje es dinero.
- **Webhooks de proveedores.** Cada canal nuevo exige firma que falla cerrado, idempotencia por mensaje y evento crudo antes de procesar (RC12). El webhook de TikTok es único para todos los comercios.
- **Volumen y base de datos.** 18 a 200 números por comercio y mensajes de todos los canales: toda consulta nueva necesita su índice en Postgres (D-579) y la bandeja única paginada desde el servidor.
- **Dependencias externas.** Revisión de TikTok (≤10 días hábiles para el cuestionario, sin seguimiento en el portal), revisión de Meta para acceso avanzado, plan Platform de Kapso para más de 3 números (D-437).
- **Diseño.** Pantallas con `config-pagina` y el design-system (acento `#5F3FE0`, sin gradientes ni primarios paralelos).

## Cómo se verifica el paraguas

Cada épica cierra con el criterio de aceptación de su ticket más estos comunes: build sin errores; contract test del write-set (el chat no escribe `products`, precios, listas ni inventario); un mensaje duplicado del webhook no se registra dos veces ni dispara el bot dos veces; el aislamiento por empresa se prueba con dos comercios; nota de versión (D-567) cuando el comercio ve el cambio.

## Preguntas para Daniel

1. **¿Quién manda, CONV (D-631) o KCOM?** Recomendación: un solo plan. KCOM aporta lo que CONV no cubre (E3 vender en el chat, E4 TikTok, E5 seguridad, costos y ventana de E1) y en lo que se cruza (multi-número, bandeja, asignación, horarios, informes) se ejecuta como fases de CONV, mapeando E1.3 a A, E2 a B, C, D, E y H, E3 a F, E4 a K. ¿E4 pasa de «investigación» (CONV-K) a construir?
2. **Modelo de datos.** ¿Se descarta `channelAccounts`/`conversations`/`messages` de la spec §6 y se amplían `messaging_lines`, `messaging_threads` y `meta_messages`?
3. **Piloto de D-437.** La bandera `whatsappMultiNumero` está publicada y CONV dice que se encendió en Julsmind el 16-oct, pero «falta piloto» según el contrato. ¿Se cierra antes de E1?
4. **Brecha del 16-oct.** ¿Qué estaba encendido en Almara (banderas del bot, interruptor general, número propio) cuando el asistente dijo que no podía consultar el catálogo? Sin reproducirla, E3 puede construir lo que ya existe.
5. **Pedido desde el chat** depende de extraer el motor de pedidos (KCAT-E1). ¿Se espera o E3 se limita a cotización hasta entonces?
6. **KMS.** ¿Se acepta `secretsCrypto` con `SECRET_TOKEN` como paso intermedio o TikTok exige KMS? D-505 prohíbe interruptores nuevos en el `.env`, pero las llaves sí van allí.
7. **Borrador de respuestas a TikTok.** ¿Quién corrige alojamiento (PostgreSQL), cifrado y respaldos antes de enviarlo?
8. **Proveedor de IA sin entrenamiento.** ¿Qué modelo y proveedor usan hoy el ADK y Bedrock para WhatsApp, y hay acuerdo escrito? No se verificó.
9. **Borrado.** ¿Se autoriza el borrado por canal en ≤30 días (E5.4) como excepción a «no borrar registros sin tu sí»?
10. **Kapso.** ¿Ya está aprobado el plan Platform (D-437 lo dejó pendiente) y Kapso ofrece Embedded Signup o se queda el enlace de conexión actual?
11. **Piloto TikTok:** ¿Almara (@almara.detalles) cumple los requisitos (cuenta verificada o acceso avanzado, titular mayor de 18, DMs abiertos)?

## Preguntas para Jairo

1. **Bandeja única** reemplaza las tres bandejas por canal (quedan como filtros), por defecto en la spec. ¿Confirmado?
2. **Resultado de KAI:** cotización en borrador por defecto, y pedido con pago PENDIENTE como opción por comercio. ¿Confirmado?
3. **Click-to-WhatsApp:** la spec dice que abre 7 días de mensajes gratis; la nota del benchmark de CONV (1298) dice 72 horas. ¿Cuál es la política vigente de Meta? Verificar con la fuente oficial antes de mostrarlo al comercio.
4. **Mensajes de servicio dentro de la ventana:** el ticket dice que Meta los cobra desde el 1-oct-2026; la nota de CONV dice que son gratis y que cobra por mensaje desde jul-2025. ¿Cuál vale? De eso depende el precio y el saldo.
5. **Margen por mensaje** (se define en `/precios/comunicaciones`) y si el costo de Meta se traslada al saldo del comercio tal cual.
6. **Proveedores de IA permitidos** para los mensajes de TikTok (lista cerrada).
7. **Prioridad real:** Vidagas (18 números) y el prospecto de ~200 pesan más que TikTok. ¿E1 y la bandeja única van antes que E4 aunque TikTok esté listo?
8. **Contacto técnico** para el formulario de TikTok: ¿Jairo o Daniel?

## Impact (del paraguas)

Solo documentación: `openspec/changes/kcom-comunicaciones/proposal.md` y `specs/comunicaciones/spec.md`. Sin código, sin datos, sin endpoints. Cuando se apruebe, se registra D-632 en `specs/CONTRACT.md` y se abre el cambio de la primera épica.
