# Diseño — pedido por WhatsApp con link de pago, atendido por KAI

D-496, aprobada por Daniel el 2026-10-18 (ticket 1243, F4-40 parte 2; el número 1243 está
repetido, así que se cita por cd: `PrDNIoDwRacCPQVcHmx1`, D-518). Requisitos:
`specs/whatsapp-bot-pedido-directo/spec.md` y el delta de `whatsapp-bot-pedidos`;
este diseño se valida contra ellos (tarea 0.1). Backend en
`katuq_admin_back_firebase/functions` (leído el 18-oct en la rama `backend-aws-security`;
**[21-oct]** la implementación va en `feature/tickets-web`, D-518); el front solo
suma la bandera al catálogo. Código leído el 2026-10-18, sin consultar producción.

> **Ampliación del 2026-10-21 (D-518, F4-40·1 a ·10): PENDIENTE DE APROBACIÓN.** Está en la
> sección «Ampliación 21-oct» al final, con sus nuevas capacidades
> (`whatsapp-bot-pago-y-recuperacion`, `kai-whatsapp-atencion`, `kai-metricas`,
> `kai-asesor-web`). Lo aprobado el 18-oct se conserva. Donde la ampliación lo reemplaza,
> queda marcado **SUPERSEDED (21-oct)** con su razón. Por D-518 (T·2), la implementación va en
> la rama `feature/tickets-web` del backend y del front, y el repo `kai` entra con sus
> propias tareas (sección 8 de `tasks.md`).

## Estado verificado

- **Parte 1 a medias.** El asesor `kai` salió con D-481 y su meta con D-494. Falta que
  el paso a `enviada` de `services/whatsappBotCierre.js` (≈399-411) deje
  `fechaEnviada` y el evento en `historialEstados`.
- **La tienda**, en `controllers/sites.js`: `crearPedido` (≈2493-3299) solo lee hasta
  `resolverClienteEnCRM` (≈3022). Desde ahí escribe cliente, pedido
  (`createOrder` ≈3044), tope del plan, inventario (`updateByPOS` ≈3083) y link
  (≈3200, `guardarEnlaceDePago` en `pagoTienda.linkIds`). Al final lanza con
  `setImmediate` el barrido D-206 (≈3114).
- **Conciliación.** El webhook de Wompi ubica el pedido por `pagoTienda.linkIds` y
  `procesarPagoTiendaDesdeEvento` (≈4402) exige `siteId`. `aplicarPagoDeTienda`
  (≈4222) es transaccional e idempotente; al aprobar registra eventos del sitio y la
  conversión (≈4291-4308).
- **Reserva.** `vencerReservasDeTienda` (≈4835-4891), freno de 10 min por empresa en
  memoria: devuelve existencias con `inventoryService.restoreStock` y anula pedidos
  ajenos de la misma empresa (`estadoProceso`, `reservaVencida`). No cambia
  `estadoPago`.
- **Recordatorio.** El cron `recordarPagosPendientes` (≈4998-5067, candado
  `PAGO_PENDIENTE_CRON_ENABLED`) toma todo pedido con `siteId` y la marca de
  reserva. Si `sitePagoPendiente.debeRecordar` lo aprueba, envía el correo
  `pago_pendiente` con la marca de la tienda y registra `recordatorio_pago` en los
  eventos del sitio. Su botón lleva a `/pagar` (`retomarPago` ≈4905), que puede
  generar otro link con `generatePaymentLink`.

## Arquitectura

```
Kapso → whatsappWebhook → whatsappBotDispatcher
  ├─ gancho de repetición (antes de la reapertura ≈753) → whatsappBotPedidoDirecto.repetir
  ├─ no elegible o sombra → whatsappBotCierre.crearCotizacion (hoy)
  └─ elegible y activo → whatsappBotPedidoDirecto
       proponer:  sites.crearPedidoDeTienda(entrada, {canal:"whatsapp-bot", soloPreparar:true})
       confirmar: reclamo en sesión → sites.crearPedidoDeTienda(entrada, {canal, totalVisto, marcas…})
```

## Decisiones

**D1. Núcleo exportado desde el controlador.** `crearPedido` se parte en
`crearPedidoDeTienda(entrada, opciones) → {status, body, codigo}` y un adaptador
HTTP que arma `entrada` desde `req` y responde `status`/`body` tal cual, como
`procesarPagoTiendaDesdeEvento`. Los ~15 ayudantes no se mueven. `TOPE_PLAN` y
`PRECIO_CAMBIO` ya viajan hoy en el cuerpo público y se quedan igual. Los códigos
nuevos (AGOTADO, CANTIDAD, CUPO_DIA, FECHA, NO_EN_TIENDA, SIN_PRECIO, MINIMO, ZONA)
solo van en `codigo`: el adaptador no los agrega al cuerpo. La caracterización va
antes y la extracción no cambia nada.

**D2. Se descarta la petición simulada.** Metería marcas internas en el cuerpo de una
ruta pública y arrastraría los efectos de la página.

**D3. Opciones del canal `whatsapp-bot`.**

- `soloPreparar` devuelve `items`, `subtotal`, `envio`, `descuento` y `total` antes de la primera escritura.
- `totalVisto` reusa `siteCompraAhora.verificarTotalVisto`; si cambió, 409 `PRECIO_CAMBIO` sin escribir.
- `clienteId` se lee de `clients/{id}` y debe ser de la `company`. Sin él se busca por celular (`normalizarCelular`).
- **Marcas.** `crearPedidoDeTienda` las aplica con parámetros; los valores de la tienda quedan por defecto, así que la ruta pública no cambia:
  - Sobre la orden de `siteOrden.construirOrden` (≈343-430), justo después de armarla: `vendedor {email:"kai", nombre:"KAI"}`, `channel.name "WhatsApp"`, `origen`, `whatsappPhoneHash` y `whatsappBot {idempotencyKey, propuestaId, correlationId}`. Se quitan `medicion` y `campana`. **[21-oct]** `whatsappBot` suma `telefono` (el que resolvió el servidor desde el `phoneHash`), `lineId` (la línea del turno, D-437, o `null`) y `origenContacto` (D15). Los usan D12, D13 y D16.
  - `resolverClienteEnCRM` recibe `origen {canal:"whatsapp-bot", siteId, pedido}` (≈3029) y un `usuario` nuevo, `"whatsapp-bot"`, que reemplaza el `user_edit` fijo (≈2427).
  - `updateByPOS(…, "whatsapp-bot")` (≈3086). Ese argumento es solo el actor del movimiento, no cambia la lógica.
  - Se aceptan a propósito `envio.alias` y la `zonaCobro` de respaldo «Tienda en línea» (`construirEnvio`), y el usuario de las notas. Describen la dirección, no el canal.
  - Se conservan `siteId` y `siteSlug`, que usan la conciliación y el cupo diario.
- No corren `cerrarCarritoAlComprar`, `registrarSuscripcion`, `pedidosCount`, `registrarEvento("pedido")` ni `contarUsoDeCupon`. Los cupones no aplican.
- **Sí corren igual:** notificaciones del pedido (**21-oct, F4-40·4:** salvo la plantilla de WhatsApp de pedido creado, D12), tope del plan, reserva D-204 y el barrido D-206. El barrido se queda porque es lo que cumple los 60 min que el bot le promete al cliente, aunque la tienda no tenga actividad o el cron esté apagado. Por eso entra al write-set.
  - **[21-oct, crítica]** Corrección: el barrido que lanza la creación vence pedidos **anteriores**, nunca el recién creado. En una tienda sin más pedidos y con el candado `PAGO_PENDIENTE_CRON_ENABLED` apagado (de fábrica, `cronService.js:185`), el último pedido del bot quedaría apartado sin límite. Lo cierra la tarea del bot de D13, que siempre está programada.
- `exigirPasarelaPropia` resuelve `gateway.getProvider(company)` una vez y solo cobra si `credentialsSource === "company-config"`.

**D4. Efectos de página fuera del pedido del bot.** Con `origen === "whatsapp-bot"`:

- `aplicarPagoDeTienda` omite `registrarEvento("pago"/"pago_recuperado")` e `informarConversionDePago`. Estado, idempotencia, inventario de respaldo y correo de pago aprobado no cambian, ni el webhook.
- ~~`sitePagoPendiente.debeRecordar` responde `{recordar:false, motivo:"pedido del bot"}`. Así no hay correo, ni `recordatorio_pago`, ni `correosEnviados.pago_pendiente`, ni `recuperadoPorRecordatorio`.~~ **SUPERSEDED (21-oct) por F4-40·5 → D11 y D12.** El pedido del bot recibe su recordatorio por la conversación. Lo que sigue vigente: el cron suma la empresa a `empresasPorBarrer` y la reserva vence a tiempo.
- ~~`retomarPago` trata el pedido del bot como inexistente, igual que hoy uno sin `siteId`, antes de anotar el clic o generar un link. El bot nunca emite `/pagar` y reenvía el link guardado (D7).~~ **SUPERSEDED (21-oct) por F4-40·5 → D11.** `/pagar` queda habilitado para el pedido del bot y es el enlace que el bot entrega. El objetivo, que ningún link automático de este camino salga con la cuenta de la plataforma, se mantiene con otro control (ver revisión privada).

Lo que pida el comerciante desde el panel queda como hoy. La revisión de seguridad
(tarea 0.5) cubre estos caminos en el openspec privado del backend, con su prueba.

**D5. Servicio nuevo `services/whatsappBotPedidoDirecto.js`.** Expone `evaluar`,
`armarEntrada`, `proponer`, `confirmar`, `esRepeticion` y `repetir`. Las funciones
puras, con pruebas, son `hashCarrito`, `llaveIdempotencia`, `esConfirmacionCorta`,
`esPideLink` y `zonaPorCiudad`.

`evaluar` exige, en orden:

- las tres llaves;
- bot fuera de sombra;
- una sola tienda publicada con `tienda.habilitada`, `bodegaId` y `pagoEnLinea`;
- pasarela propia;
- pago preferido vacío o en línea;
- tope: menos de 2 pedidos directos sin pagar todavía apartados para ese celular. Se cuenta por celular, no por conversación. Se leen `orders` con `company`, `whatsappPhoneHash` y `estadoPago` en «Pendiente» y en «Rechazado» (dos consultas de igualdades, `limit(10)`). En memoria quedan solo los de «Pago en línea» sin `reservaVencida`, con `estadoProceso` distinto de Anulado, Cancelado y Rechazado, y creados hace menos de `RESERVA_TIENDA_MINUTOS`. Es el filtro del barrido al revés: un link vencido nunca bloquea. **[21-oct, crítica M9]** La forma de esta consulta cambia: ver revisión privada (S18).

Cada falla deja un `motivo` y el cierre sigue en cotización. `armarEntrada` traduce
el carrito: adición por nombre → `{cd}`, «Talla: M» → `{grupo, opcion}`,
dedicatoria → `tarjeta`, fecha → `YYYY-MM-DD` y ciudad DANE → `zonaCd` única. Lo
ambiguo va a cotización.

**D6. Confirmación en el servidor, sin el modelo.** En `pedirCierre` (≈1148), si es
elegible y activo, el bot manda el resumen del núcleo con los botones
`pedidoDirecto:pagar:<propuestaId>` y `pedidoDirecto:asesor:<propuestaId>`. La
confirmación entra en un **bloque nuevo**, después de la rama `opcionId`
(≈940-1044) y antes de `botClient.pedirTurno` (≈1054), y por lo tanto después del
sello `registrarTurno` (≈825). Ese bloque recibe dos entradas:

- la clase `pedidoDirecto`, que la rama `opcionId` reconoce y no aplica;
- un texto sin `opcionId` que `esConfirmacionCorta` acepta, mientras la propuesta está vigente y el `carritoHash` coincide.

Si la propuesta venció o el carrito cambió, se arma una nueva. En el camino directo,
el texto del servidor reemplaza al del agente.

**D7. Idempotencia (Artículo IV).**

- `idempotencyKey = sha256(company|phoneHash|propuestaId)`.
- `reclamarCreacion` corre en transacción:
  - `creado` → mismo pedido y link;
  - `creando` con lease vigente (90 s) → «estoy generando tu link»;
  - en otro caso → `creando`.
- Antes de crear se busca en `orders` por `company` y `whatsappBot.idempotencyKey` (igualdades), para adoptar un pedido que no alcanzó a anotarse.
- **Repetición, 30 min** (**SUPERSEDED (21-oct) por D14:** mientras no pase la reserva, con el enlace de `/pagar`; un pedido pagado responde «ya recibimos tu pago»). Tras el 201 la sesión queda `cerrada` y la reapertura post-cierre (≈753-761) limpiaría `pedidoDirecto`. Por eso el gancho va justo después de `obtenerOCrear` (≈740) y **antes** de la reapertura, solo con las tres llaves encendidas:
  - `esRepeticion` es pura y no escribe. Exige sesión `cerrada` sin dueño humano, `pedidoDirecto.estado === "creado"`, menos de 30 min desde `pedido.creadoEn` (**[21-oct]** menos de `RESERVA_TIENDA_MINUTOS`, D14), y el botón «Pagar» de esa misma propuesta, `esConfirmacionCorta` o `esPideLink`.
  - Si se cumple: primero `registrarTurno` (una reentrega da `ya_atendido`), después `repetir` reenvía número, total y link guardados. No genera link y la sesión sigue cerrada.
  - Si no: el flujo sigue como hoy y la reapertura vacía carrito y propuesta.
- Respaldos: `createOrder` frena gemelos de 2 min y el link de Wompi es de un solo uso.

**D8. Resultados de la confirmación.**

| Resultado | Qué pasa |
|---|---|
| 201 con link | Número, total, link y aviso de 60 min. `marcarCerrada` con el pedido, sin traspaso |
| 201 sin link | Pedido pendiente de pago; traspaso con el número |
| 409 con `codigo` | Dice qué cambió y propone una vez más; si falla de nuevo, traspasa |

## Contratos

| Pieza | Forma |
|---|---|
| `crearPedidoDeTienda` | `entrada {publicado, cliente, items[{productoId,cantidad,variante,config}], metodoPago, zonaCd, retiroId, entrega}`; `opciones {canal, soloPreparar, totalVisto, clienteId, exigirPasarelaPropia, marcas{orden, origenCliente, usuario, actorInventario}}` → `{status, body, codigo}` |
| Sesión `integration_configs/{company}_kapso/whatsapp_bot_sessions/{phoneHash}` | `pedidoDirecto {propuestaId, carritoHash, siteId, totalMostrado, expiraEn, estado: propuesto/creando/creado/descartado, leaseHasta, idempotencyKey, pedido{orderId, nroPedido, total, linkUrl, creadoEn}}`; `marcarCerrada` acepta `pedidoCreado`; `devolverAlBot` limpia `pedidoDirecto`. **[21-oct]** `seguimiento {tipo, pendienteEn, enviadoEn, dia, lineId, referencia}` (D16) |
| Pedido (`orders`) | `origen`, `whatsappPhoneHash`, `whatsappBot{idempotencyKey, propuestaId, correlationId}`, vendedor KAI, canal WhatsApp. **[21-oct]** `whatsappBot.telefono`, `whatsappBot.lineId`, `whatsappBot.origenContacto`, `recordatorioPago.whatsappEn`, `recuperadoPorKai` |
| Modo | `bot.pedidoDirectoModo: "sombra" \| "activo"`, validado en `whatsappCompanyConfig.js` (≈376); ausente = `sombra`; lo fija `scripts/set-bot-pedido-directo.js` |
| Bandera | `companies.featureFlags.whatsappBotDirectOrder` |
| Interruptor general | ~~`WHATSAPP_BOT_PEDIDO_DIRECTO_HABILITADO=true` en el `.env`~~ **SUPERSEDED (21-oct) por D-505 y D-518:** `config/feature_flags.whatsappBotDirectOrder === true` en Firestore (ausente = apagado). Ver D9 |

Sin colecciones nuevas, endpoints «v2» ni rutas nuevas.

## Banderas y modo sombra

Son tres llaves, como en D-410 y D-422; si falta una, el bot queda idéntico a hoy.

- El interruptor general es el kill switch de todos. ~~Lo enciende Daniel en el `.env` de producción.~~ **SUPERSEDED (21-oct, D-505):** vive en `config/feature_flags` y lo cambia `scripts/set-interruptor-general.js` (simula por defecto). No hace falta reiniciar el proceso (D9).
- La bandera por comercio (D-385) solo la prende `set-company-feature.js`, que simula por defecto.
- El modo nace en `sombra` y lo cambia `set-bot-pedido-directo.js`, que también simula por defecto. Si una edición del panel borra el modo, queda en sombra.

En sombra corre `soloPreparar` y registra «así habría creado el pedido» con los dos
totales; el cliente recibe la cotización.

Catálogos: `services/companyFeatureFlags.js` (≈54) y
`company-features.service.ts`. El dueño es Daniel. Se retira 30 días después de
encenderla para todos, como dice la propuesta. Como el Artículo XII pide una fecha
fija, el tope de revisión es el 2027-04-30.

## Write-set y contract tests

- **Permitido:**
  - `orders`: el pedido nuevo con `inventarioDescontadoAlCrear` y `pagoTienda.*`. Además, el barrido D-206 actualiza `estadoProceso`, `reservaVencida` y `estadoProcesoAntesDeVencer` de pedidos vencidos de la **misma empresa**.
  - `consecutives` (`getNextConsecutive`).
  - `inventory`, `inventoryMovement` e `inventory_audit`, solo por `updateByPOS` (pedido nuevo) y `restoreStock` (barrido), sin lógica nueva.
  - `clients`.
  - El contador del plan en `companies` (`createOrderWithinLimit`, dentro de `createOrder`; desde 2026-10-20 la tienda ya no suma otra vez con `consumeStoreOrderSlot`).
  - Lo que hoy escriben en la tienda `orderNotificationService.notify`, `notificationHooks.writeSellerNotification` y `correoComprador.avisarAlComprador`, sin tocar ese código. La tarea 2.1 enumera esas colecciones y la lista queda cerrada.
  - La sesión del bot.
- **Prohibido:** `products`, precios, `preciosAsociados`, catálogo, `cotizaciones` (en el camino directo), `sites`, `site_events` y `prospects`.
- **Pruebas:**
  - 2.1 corre el barrido real de forma determinista: cola de `setImmediate`, freno nuevo por caso y un pedido vencido de prueba.
  - `whatsappBotPedidoDirecto.contract.test.js` falla ante cualquier escritura fuera de la lista, en el camino directo, en el pago y en el cron del recordatorio.
  - En sombra y con `soloPreparar`, cero escrituras.
  - `whatsappBotCierre.contract.test.js` sigue en solo `cotizaciones`.

**Migraciones:** no hay migración ni backfill; los dos scripts simulan primero.

## Observabilidad (Artículos VII y XI)

Líneas JSON del `log()` del despachador (`whatsapp_bot.pedido_directo`): eventos
`pedido_directo_propuesto | ok | cae_a_cotizacion | fallido | sombra | repetido`
con `company`, `phoneHash`, `correlationId`, `motivo`, `latenciaMs`, `total`,
`nroPedido` y `siteId`. Rastro durable en `whatsappBot.*` y `pedidoDirecto`. Nunca
teléfono, nombre ni dirección. La revisión de seguridad es la tarea 0.5, en el
openspec privado del backend.

## Gates constitucionales

| Art. | Cumplimiento |
|---|---|
| I, XIV | D-496 aprobada; spec, diseño y tareas se aprueban antes de código; bitácora al cerrar |
| IV | D7 |
| V, X | Webhook de Wompi y entrada de Kapso sin cambios |
| VI, IX | Sin UI; el front solo suma la constante |
| VII, XI | Observabilidad arriba; solo `phoneHash` |
| VIII | Caracterización, contrato de la función interna, conciliación y recordatorio antes de implementar |
| XII | Dueño, fecha y tarea de retiro |
| XV | No escribe `integrations` |

## Valores por defecto (confirmar con Daniel en la tarea 0.2)

1. Extraer el núcleo dentro de `sites.js`; se descarta la petición simulada.
2. Tienda publicada obligatoria; sin tienda, cotización. `orders/create` queda para otra fase.
3. Solo pago en línea.
4. Reserva de 60 min, como la tienda, y el bot lo dice.
5. Meta de KAI: ya resuelta con D-494.
6. Piloto en FLORECER (sombra → activo) y después ALMARA FELICIDAD (7 días en sombra).
7. Con varias tiendas elegibles, cotización. El producto debe ser comprable en esa tienda. Un extra ambiguo, cotización. Recoger solo con un único punto activo.
8. Aplican las promociones automáticas y la lista del cliente; los cupones no. El pedido cuenta en el tope del plan.
9. Propuesta vigente 30 min. Tope de 2 pedidos sin pagar con reserva vigente, por celular. Repetición de 30 min. **(21-oct, pendiente de aprobación: la repetición dura mientras el pedido siga sin pagar y apartado, ver D14.)**
10. «Hablar con asesor» deja la cotización de hoy y traspasa. Se acepta un «sí» escrito.
11. Modo en la configuración del bot, con script, más el interruptor general.
12. El barrido D-206 sigue corriendo en el canal del bot. **Desvío del write-set de la propuesta:** `restoreStock` y la anulación de pedidos vencidos de la misma empresa.
13. **Desvío del write-set de la propuesta:** el contador del plan en `companies`, `inventory_audit` y las escrituras de notificación de la tienda (lista cerrada por 2.1).
14. ~~El pedido del bot no recibe el correo de recordatorio de la tienda y `/pagar` no le genera link.~~ **SUPERSEDED (21-oct) por F4-40·5 (D11 y D12).** Sí recibe, si tiene correo, los de pedido creado y pago aprobado con la marca de la tienda.
15. Marcas: se aceptan «Tienda en línea» en `envio.alias`, la zona de respaldo y el usuario de las notas.
16. **Desvío de la propuesta:** retiro de la bandera a los 30 días de encenderla para todos, con tope de revisión el 2027-04-30.
17. **Fuera de la propuesta:** tarea 6.8, «Vendido con Opttia» de En vivo cuenta los pedidos del bot. Solo se hace si Daniel la confirma. **Confirmada por D-518 (F4-40·9), que además pide leer el pedido generado desde la cotización (D19).**

## Fuera de esta fase

| Fase | Depende de |
|---|---|
| Contra entrega y transferencia por el bot | Esta fase en producción; spec propia |
| Comercios sin tienda (`orders/create`) | Caracterizar esa ruta y su conciliación |
| Reserva por canal (más de 60 min) | Datos de pago tardío; cambio aparte a D-206 |
| ~~Aviso de pago y recordatorio por WhatsApp~~ | **Entra en la ampliación del 21-oct** (F4-40·4 y ·5; D11 a D13) |
| Mover el núcleo a `services/sites/` | Esta fase estable |
| `convertir-pedido` y aprobar por link sin documento | No-goal; cambio aparte |

## Desvíos

Lectura de la tarea 0.3, hecha el 2026-10-19 sobre la punta local de `backend-aws-security`, sin consultar producción. No se corrió `git pull --rebase` porque en esta sesión trabajan varios agentes en el mismo árbol y el orquestador lo prohíbe. Las líneas del diseño siguen vigentes:

- en `sites.js`: `crearPedido` 2493-3299, `vencerReservasDeTienda` 4835-4891 y `recordarPagosPendientes` 4998-5067;
- en el despachador: `obtenerOCrear` 740, la reapertura 753-768, `registrarTurno` 825, la rama `opcionId` 940-1044, `pedirTurno` 1054 y el cierre 1148.

**Desvíos del diseño:**

1. **Faltan colecciones en el write-set.** La lista cerrada de 6.6 debe sumar:
   - `notifications`: `createOrder` llama a `sellerMobileNotifications.notifyOrderCreated` en las empresas habilitadas;
   - una segunda escritura en `companies`: `orderRepository.create` pasa por `limitsService.createOrderWithinLimit`, que también actualiza el contador del plan;
   - las colecciones de las notificaciones de la tienda, que el golden de 2.1 enumera leyendo el código: marcas en `orders`, `notification_queue`, `scheduled_notifications` y la campana del vendedor en RTDB.

   `whatsappConfirmacionPedido` solo aplica a contra entrega, así que no corre con el bot. La asignación de bodega en sombra solo corre si falta `bodegaId`, y la tienda siempre lo trae.
2. **El contador del plan cuenta dos veces (hallazgo previo, escalado a Daniel).** Por cada pedido de tienda en plan gratis suben `createOrderWithinLimit` (desde 75407fbc, 2026-09-01) y `consumeStoreOrderSlot` (≈3048). El comentario de D-319 supone que la tienda no pasa por la primera. El golden lo fija: el contador va de 3 a 5. El pedido del bot lo heredaría. No se corrige en este cambio.
   - **Corregido (2026-10-20, aprobado por Daniel):** el checkout de la tienda ya no llama a `consumeStoreOrderSlot`; cuenta solo `createOrderWithinLimit`, dentro de `createOrder`. El golden de 2.1 quedó con el contador de 3 a 4 y una sola escritura en `companies`. El write-set de 6.6 ya no lleva `consumeStoreOrderSlot`.
3. **En un gemelo, la tienda repite efectos.** Genera otro link y vuelve a sumar `pedidosCount`, el contador del plan y el evento `pedido` (caso «gemelo» del golden). Al bot no le pasa porque D7 lo frena antes del núcleo.
4. **`origenPrimerContacto.pedido` siempre llega `null`.** `resolverClienteEnCRM` (≈3022) corre antes de `createOrder`, cuando la orden todavía no tiene número. Pasa igual con el bot, así que 4.1 no debe exigir ese número.
5. **El texto de `verificarTotalVisto` es de contra entrega** («a pagar al recibir»). El bot arma su mensaje con `codigo: "PRECIO_CAMBIO"` y los totales de `data`, sin reenviar `message`.
6. **La pasarela se resuelve dos veces.** `gateway.generatePaymentLink` vuelve a llamar a `getProvider`. Para cumplir «`getProvider` una vez» de 4.1, el núcleo cobra con la misma instancia que ya resolvió y revisa la pasarela antes de la primera escritura. El detalle está en la revisión de seguridad.
7. **La reapertura no reconoce `pedidoCreado`.** Hoy reabre de inmediato solo si la sesión está `cerrada`, o en `humano` con `cotizacionCreada` (753-761). El camino «201 sin link» traspasa sin cotización. Si no termina con `marcarCerrada({pedidoCreado})`, solo lo reabre `traspasoSinTomarVencido` (644, rama 762-768): cuando pasan `HORAS_REAPERTURA_TRASPASO` (12 h) desde la última escritura de la sesión (`actualizadoAt`), y con el carrito vacío. Mientras tanto el hilo queda mudo, incluso ante un «link» del pedido recién creado. Es una versión acotada del bug de ALMARA: unas horas, no para siempre. En 6.4 y 6.7, `marcarCerrada` va siempre al final, también después del traspaso.
8. **`bot.modoSombra` ya existe y es otra cosa.** Es la sombra del bot entero: no envía nada y el cierre devuelve `sombra_cierre`. `evaluar` exige `modoSombra` falso y, aparte, `pedidoDirectoModo === "activo"`. Los eventos no se mezclan.
9. **La configuración del bot se cachea 5 minutos** (`resolveBot`). Un cambio de modo hecho con el script de 5.5 puede tardar ese tiempo en verse. El script debe avisarlo.
10. **El barrido D-206 no filtra por `siteId`.** Toma todo pedido de la empresa con `inventarioDescontadoAlCrear` y «Pago en línea». Eso cubre el pedido del bot, como quiere el diseño. Pero `services/kuvo/orderWriter.js` también pone esa marca y maneja su propia reserva: hay que verificar aparte que el barrido no toque pedidos de Kuvo. Escalado a Daniel.
11. **La conciliación tiene tres entradas:**
    - el webhook de la tienda;
    - el webhook principal de Wompi;
    - el regreso a `/gracias` (`conciliarAlVolver`, ≈4430).

    Las tres pasan por `aplicarPagoDeTienda`, así que el filtro de D4 las cubre. La prueba 4.3 debe incluir el regreso.
12. **`pedidoReservaDuplicada` está en rojo por montaje y choca con el criterio de 3.1.** Cinco de sus 8 casos, los que crean un pedido, responden 500 en vez de 201. El contexto vm donde la prueba corre `createOrder` (≈169) no trae `require`, y `createOrder` ahora pide `./sellerMobileNotifications/runtime` (`orderService.js` ≈115).

    Se comprobó sin tocar la prueba: con un doble de ese módulo en el contexto, pasan los 8 con las mismas aserciones. Por eso «las 4 pruebas en verde con las mismas aserciones» de 3.1 solo se cumple si antes se arregla el montaje. Puede hacerse al pasarla al arnés de 2.1, que ya trae ese doble, o sumando el doble al contexto. Se cambia el montaje y las aserciones quedan como están. Si después del arreglo alguna aserción falla, es un hallazgo: se escala y no se ajusta la aserción.

13. **Nadie lee `order.vendedor.email` en el backend (tarea 4.7, 2026-10-21).** Se buscó en `functions/` (controllers, services, utils, handlers). El campo solo se escribe: `utils/siteOrden.js` (tienda), `controllers/catalogos.js` y el cierre del bot en la cotización (`kai`). Los filtros por vendedor de `controllers/orders.js` y de tesorería leen `asesorAsignado`, no `vendedor.email`. Las lecturas de `vendedor.email` que existen son de cotizaciones y ya tratan `kai` como no-correo (`contactoVendedor`). Sin cambio de código ni prueba. Cuando el núcleo guarde el vendedor KAI del pedido del bot, quien lea ese campo en un envío de correo deberá exigir que tenga `@`.

**Línea base de la tarea 0.4 (2026-10-19).** Se corrieron 132 archivos de `tests/sitios`, `notifications`, `cotizaciones`, `integrations`, `orders` y `companies`: 124 pasaron. Fallos previos, ninguno de este cambio:

- `sitios/carritoWhatsapp`: falla en la prueba 46 con «Route.get() requires a callback».
- `sitios/pedidoReservaDuplicada`: el contexto vm de `createOrder` no tiene `require`, y `createOrder` ahora pide `sellerMobileNotifications/runtime`, así que responde 500 (5 de 8 casos). Choca con el criterio de 3.1: ver el desvío 12.
- `sitios/tiendaEnUnPaso`.
- `companies/soloLectura`.
- `orders/preciosPorTipoFase0`: redondeo (45294.117… contra 45294.12).
- `cotizaciones/anexoCondiciones`, `cotizaciones/valoresSinDecimales` y `orders/estadoPagoBloqueado`: son pruebas `.emulator`; sin emulador vencen por tiempo.

Wompi (`tests/integrations`) y el bot (`tests/notifications`) quedaron en verde. `whatsappBotCierre` ya se midió con 1.1 y 1.2 aplicadas.

**Verificación final F440-B17 (2026-10-21, tarea 16.3).** Se repitió la línea base sobre `tests/sitios`, `notifications`, `cotizaciones`, `integrations`, `orders` y `companies`, más `tests/agenda` y `tests/enVivo`: 196 archivos, 187 en verde. Los 9 que fallan:

- Los 7 de la línea base que siguen igual: `sitios/carritoWhatsapp`, `sitios/tiendaEnUnPaso`, `companies/soloLectura`, `orders/preciosPorTipoFase0` y los tres `.emulator` (`cotizaciones/anexoCondiciones`, `cotizaciones/valoresSinDecimales`, `orders/estadoPagoBloqueado`).
- `sitios/pedidoReservaDuplicada` ahora pasa (antes fallaba).
- `notifications/orderNotificationService`: «Cannot find module serviceAccountKey.json», una credencial local que no está en el repositorio; no toca este cambio. No estaba en la línea base porque esa medición se limitó al bot; no se pudo medir contra el código anterior sin `git stash`.
- Cero fallos nuevos atribuibles a F4-40. El golden `tests/sitios/pedidoTiendaCaracterizacion.golden.json` no cambió desde af1bd54c y su prueba pasa.
- kai: no hay pytest en la máquina; `test_whatsapp_capacidades.py` y `test_whatsapp_bot_channel.py` corren como script y pasan.
- Front: `tsc --noEmit -p tsconfig.app.json` con candado, 0 errores. Quedan sin hacer el build de producción y la revisión visual a 1440 y 390 px.

---

## Ampliación 21-oct (F4-40, D-518) — PENDIENTE DE APROBACIÓN

Aplica las decisiones aprobadas F4-40·1 a ·10 y T·2 de D-518 (`specs/CONTRACT.md`), y D-505.
Código releído el 2026-10-21, sin consultar producción:

- **Backend:** rama `feature/tickets-web` (punta 097ede2e), **con el árbol de trabajo de los arreglos de F2-41 sin commit** (`controllers/sites.js`, más `cronService.js` y otros). Por T·2, F2-41 se une primero; las líneas de `sites.js` se vuelven a medir en 0.8.
- **Front:** rama `feature/tickets-web`.
- **kai:** rama `feat/claude-agent-sdk` (25ddfda). No se sabe qué commit corre en producción: `origin/main` (9cdbfb1) no tiene `adk_agent/channels/whatsapp`.

### Lo que cambió en el código desde el 18-oct (líneas de `feature/tickets-web`)

- **`sites.js`.** Con D-517 y F2-41, medido la tarde del 21-oct (el archivo se sigue moviendo mientras F2-41 está sin commit):
  - `crearPedido` en 2646; el link de Wompi en ≈3407-3425, con `redirectUrl` a `/gracias` (≈3412);
  - `aplicarPagoDeTienda` en 4467 (`recuperadoPorRecordatorio` ≈4515, conversión ≈4594);
  - `informarConversionDePago` en 5187 y `datosDeConfirmacion` en 5253;
  - `vencerReservasDeTienda` en 5555 (ahora también vence los pedidos a cuotas; no se exporta);
  - `retomarPago` en 5756 (con la rama de cuotas; redirect a `/gracias` en ≈5786 y ≈5928);
  - `recordarPagosPendientes` en 5965;
  - la página de gracias arma `conversion` en ≈7109 y la pasa al render en ≈7709, solo con el pago aprobado.

  El despachador no cambió: siguen valiendo las líneas 740, 753-768, 825, 940-1044, 1054 y 1148 de D6 y D7.
- **`config/feature_flags` ya se lee** en `sites.js` y en `notificationHooks.js` (≈1658). Es el patrón de D9.
- **Tareas siempre programadas que leen Firestore.** El job de sitios (`cronService.initSitiosJob`, cada 5 min, `cronService.js:1031`) ya corre `barrerReservasDeCuotas` «aunque el recordatorio de pago (candado propio) esté apagado» (D-518, F2-41·1). Es el precedente de D13.
- **La compra de un cotizable todavía no se bloquea en el servidor.** `crearPedido` no mira `tienda.cotizables`. Bloquearla es `cotizable-arreglos` (F2-43·6, D1), que por el orden de trabajo de D-518 se une **antes** de la extracción de D-496 (D10 y tarea 0.8).

### D9. Interruptores en Firestore (D-505, D-518)

| Pieza | Por empresa (`companies.featureFlags`, catálogo de `companyFeatureFlags.js:54` y `company-features.service.ts`) | General (`config/feature_flags`, ausente = apagado) |
|---|---|---|
| Pedido directo, pago, confirmación y recordatorio (D-496 + D11 a D14, D24) | `whatsappBotDirectOrder` (ya prevista) | `whatsappBotDirectOrder` |
| Atención ampliada: memoria, postventa, agenda, origen (D15 a D18) | `whatsappBotAttention` | `whatsappBotAttention` |
| Seguimientos dentro de 24 h (D16) | `whatsappBotFollowUp` | `whatsappBotFollowUp` |
| Seguimientos fuera de 24 h, etapa 2 | `whatsappBotFollowUp` | `whatsappBotFollowUpTemplates` (no se enciende sin el OK de costo de Daniel) |

- **Lectura.** `services/interruptorGeneral.js` hace un `get` de `config/feature_flags` por evaluación: una vez en el cierre y una vez por corrida del cron. No es una caché nueva. Si la lectura falla, cuenta como apagado.
- **Cambios.** `scripts/set-interruptor-general.js --flag <n> --on|--off` simula por defecto; con `--execute` escribe solo esa llave e imprime el antes y el después.
- **Modo.** El modo `bot.pedidoDirectoModo` (sombra o activo) se queda como estaba.
- **Artículo XII.** Dueño: Daniel. Revisión el 2027-04-30: encendidas para todos o eliminadas.
- **C14.** Con una llave apagada, el bot responde byte a byte como hoy.
- **Llaves que ya existen y no son de este cambio:** `WHATSAPP_BOT_ENABLED` (`whatsappBotDispatcher.js:85`) y `ENABLE_WHATSAPP_NOTIFICATIONS` (`kapsoService.js:135`) en el `.env`, y `whatsappMultiNumero` con su interruptor general (D-437). No se mueven aquí; el piloto las revisa (15.1).

### D10. Un cotizable manda todo el carrito a cotización (F4-40·3)

`whatsappBotPedidoDirecto.evaluar` suma una condición nueva, revisada antes que la tienda y la pasarela. Si algún `productoId` del carrito está en `tienda.cotizables` de la tienda publicada (`bloquesUtil.normalizarTienda`, mismo dato que usa `cotizarProducto`), devuelve `motivo: "cotizable"` y el cierre es la cotización de hoy (`whatsappBotCierre.crearCotizacion`) con **todo** el carrito. La cotización sale con el asesor KAI (D-481), no con la rotación de la web.

**[crítica]** `cotizable-arreglos` agrega antes de la extracción un 409 con `codigo: "COTIZABLE"` en `crearPedido`. La extracción lo hereda (el golden de 2.1 se rehace con ese caso en 0.8) y el bot lo trata como un respaldo que lleva al mismo camino. El control principal sigue siendo `evaluar`, que decide sin escribir.

### D11. El enlace que entrega el bot es `/pagar` (F4-40·5)

- El núcleo sigue generando el link de Wompi al crear (`pagoTienda.linkIds`). El bot **no** se lo entrega al cliente. Le entrega `sitePagoPendiente.urlParaPagar(urlBaseDelSitio(sitio), company, nroPedido)`, que es estable y firmado.
- `retomarPago` (`sites.js:5756`) ya acepta el pedido del bot: tiene `siteId` y «Pago en línea». Con eso lleva al link vigente, o genera otro si venció o fue rechazado, sobre la misma reserva.
- El filtro que D4 le ponía a `/pagar` queda SUPERSEDED. En su lugar va un control de pasarela solo para el pedido del bot (ver revisión privada).
- `recordatorioPago.clicEn` se anota igual. Para el pedido del bot significa «abrió el enlace».

### D12. Notificaciones del pedido del bot (F4-40·4)

- **Pedido creado.** En `notificationHooks.onOrderCreated`, el espejo de WhatsApp (`queueWhatsAppNotification`, ≈616) y el SMS al comprador (≈609-614) se omiten cuando `orderData.origen === "whatsapp-bot"`, con el motivo `BOT_ORDER` en el log. El correo al comprador (`correoComprador`), el aviso al equipo y la campana del vendedor no cambian. Omitir el SMS es la pregunta 3.
- **Pago aprobado.** En `aplicarPagoDeTienda` (≈4467), al aprobar un pedido con `origen === "whatsapp-bot"`, se encola dentro de `setImmediate`, igual que el correo:

  ```
  queueWhatsAppNotification({ type: "PAYMENT_APPROVED", orderId, company,
    data: { nroPedido, telefonoCliente: whatsappBot.telefono }, lineId: whatsappBot.lineId })
  ```

  - El consumidor (`notificationQueue.sendWhatsAppNotification` ≈606) ya aplica sus compuertas: opt-in del canal (≈628), canal encendido, plantilla habilitada, preferencia `payment_approved`, marca `waNotifSent.PAYMENT_APPROVED` contra duplicados y saldo. Que la preferencia del comercio aplique es la pregunta 2.
  - **Cambio en el consumidor:** pasarle a `kapsoService.sendTemplate` (que ya acepta `lineId`, `kapsoService.js:256`) el `lineId` de la notificación cuando venga (D-437). Hoy no lo pasa (`notificationQueue.js` ≈943-949).
  - Si el pedido no tiene `whatsappBot.telefono`, no sale (ver revisión privada).
- **La plantilla `katuq_payment_approved_v1`** (`whatsappTemplates.js:126-145`, UTILITY) figura en el código como `ready_for_meta_approval`. Hay que confirmar que esté aprobada en el WABA del número del piloto (tarea 15.1).

### D13. Recordatorio de pago por la conversación (F4-40·5)

**[crítica]** Ya no va dentro de `recordarPagosPendientes`. Allí no salía: `debeRecordar` exige correo y descarta con `continue` antes de cualquier envío (`sitePagoPendiente.js:89-90`, `sites.js` ≈6008), y el job del recordatorio solo se programa con `PAGO_PENDIENTE_CRON_ENABLED`, apagado de fábrica (`cronService.js:185`).

- **Dónde corre.** Una función nueva, `whatsappBotSeguimiento.recorrer({ahora})`, llamada desde `initSitiosJob` (siempre programado, cada 5 min), igual que `barrerReservasDeCuotas`. Lee `config/feature_flags` en cada vuelta.
- **Qué lee.** Con `whatsappBotDirectOrder` general encendido, las empresas con `featureFlags.whatsappBotDirectOrder == true`. En cada una, sus pedidos del bot: `orders` con `company ==`, `origen == "whatsapp-bot"` y `estadoPago ==` («Pendiente» y «Rechazado»), solo igualdades, `limit(50)`. No pasa por la consulta de toda la plataforma del recordatorio de la tienda (crítica M9).
- **Recordatorio**, en la ventana de 20 a 55 minutos (`sitePagoPendiente.MINUTOS_DESDE/HASTA`), sin `recordatorioPago.whatsappEn` ni `correosEnviados.pago_pendiente`, con reserva vigente y proceso abierto (las mismas reglas de `debeRecordar`, salvo el correo):
  1. marca `recordatorioPago.whatsappEn` en transacción, si no estaba;
  2. después envía con `whatsappOutboundService.enviarTexto` con `respetarNoContactar: true` (por defecto es `false`, `whatsappOutboundService.js:167`), `lineId: whatsappBot.lineId`, `tipo: TIPO_BOT` y `clientMessageId` derivado del pedido. El camino de salida aplica la ventana de 24 h, el dueño del chat (D-437), el saldo y el dedup. El texto lo arma el servidor: número, enlace de `/pagar` y `sitePagoPendiente.horaLimite`.
- **Respaldo por correo** (pregunta 5). Si el envío no sale y el pedido tiene correo, sale el correo `pago_pendiente` de siempre, una vez (`correoComprador` marca `correosEnviados`). No se registra `recordatorio_pago` en `site_events`.
- **La tienda no lo duplica.** `recordarPagosPendientes` salta los pedidos con `origen === "whatsapp-bot"` antes de `debeRecordar`, **después** de sumarlos a `empresasPorBarrer`. Con el interruptor del bot apagado, el pedido del bot no recibe recordatorio, como en lo aprobado el 18-oct.
- **Reserva.** Si un pedido del bot pasó `RESERVA_TIENDA_MINUTOS` sin `reservaVencida`, la vuelta llama al barrido de su empresa (`vencerReservasDeTienda`, que se exporta sin cambiar su lógica). Así se cumplen los 60 minutos aunque el candado de la tienda esté apagado (corrección de D3).
- `aplicarPagoDeTienda` (≈4515) marca `recuperadoPorRecordatorio` también cuando existe `recordatorioPago.whatsappEn`, y además `recuperadoPorKai: true`.

### D14. Repetición mientras el pedido esté apartado (F4-40·5)

- `esRepeticion` sigue siendo pura y sin escrituras. Cambia el límite: en vez de 30 minutos desde `pedido.creadoEn`, vale mientras no hayan pasado `RESERVA_TIENDA_MINUTOS`.
- `repetir` lee el pedido (una lectura) antes de responder:
  - pendiente o rechazado, y apartado: reenvía el número y el enlace de `/pagar`;
  - pagado: «ya recibimos tu pago» con el número, y la sesión sigue cerrada;
  - vencido o anulado: no responde nada y el turno sigue por la reapertura de hoy (conversación nueva).
- Es la única conducta para el pedido pagado (crítica M1): la spec `whatsapp-bot-pedido-directo` y las tareas 6.1 y 6.5 quedan alineadas con ella.
- Pasada la reserva, el agente ve el pedido «Anulado» en `ultimosPedidos`. Con la capacidad `pedidoDirecto` encendida, el prompt le indica ofrecer «armarlo otra vez con los mismos productos» (tarea 8.3). Eso abre una propuesta nueva con los precios de hoy.

### D15. Memoria y origen (F4-40·2, punto 2 del ticket)

- **Cotizaciones.** `contextoDelContacto` (`whatsappBotDispatcher.js:197-262`) suma `cotizacionesRecientes`, solo con `whatsappBotAttention`. Dos consultas por igualdades, dentro del mismo `Promise.all` y del mismo caché de 5 minutos que ya tiene el contexto, sin crear otro:
  - `cotizaciones` con `company ==` y `whatsappPhoneHash ==` (las del bot, `whatsappBotCierre.js` ≈348), `limit(5)`;
  - `cotizaciones` con `company ==` y `cliente.numero_celular_whatsapp in` las variantes del teléfono resuelto por el servidor, `limit(5)`. Es el mismo patrón con que `getContactOrders` ya trae los pedidos (`whatsappConversationsService.js` ≈1006).
  - En memoria se juntan sin repetir, se ordenan por fecha y se toman 3 con número, estado, fecha, total y enlace público si está enviada.
  - **Recorte declarado (crítica M11):** una cotización que una persona hizo sin poner el WhatsApp del cliente no aparece.
- **Origen (crítica M8).** El despachador lee en `prospects` el contacto de ese teléfono con `company ==` y `phoneNormalized ==` (`limit(1)`, el patrón de `services/sites/leadsWhatsapp.js:52-55`), solo lectura. El núcleo guarda `whatsappBot.origenContacto`:
  - con `campana` (llegó por un enlace de la web; es el `origenCompleto` de `siteAtribucion`, con utm e identificadores de clic): `{tipo: "web", campana: <solo los campos utm_*>}`;
  - con `anuncio` o `ultimoToque.anuncio` (anuncio de WhatsApp): `{tipo: "anuncio", anuncio: {sourceId, sourceType, headline}}`;
  - sin nada de eso, no se guarda.
  - **No se usa `orders.campana`.** Ese campo lo lee `informarConversionDePago` (`fbclid`, `ttclid`), y D3 lo quita en el pedido del bot. Tampoco se copian `fbclid`, `ttclid` ni `ctwaClid`: con origen bot no se informa ninguna conversión.
  - `prospects` sigue fuera del write-set.

### D16. Seguimientos dentro de 24 h (F4-40·5, punto 5)

- **Marca en la sesión.** Al final de cada turno, el despachador escribe en la sesión `seguimiento {tipo, pendienteEn, enviadoEn, dia, lineId, referencia}`, en la misma escritura que ya hace. `lineId` es la línea del turno (`lineaDelTurno()`), porque fuera del turno el contexto asíncrono no existe (crítica A5):
  - con carrito y sin cierre: `tipo: "carrito"`, a las 2 h;
  - con una cotización recién enviada: `tipo: "cotizacion"`, a las 4 h, con su número en `referencia`;
  - con traspaso tomado o pedido directo: se borra.
- **Cron.** En la misma `whatsappBotSeguimiento.recorrer` de D13 (job de sitios, siempre programado), si el interruptor general `whatsappBotFollowUp` está encendido:
  1. busca las empresas con `featureFlags.whatsappBotFollowUp == true` (igualdad);
  2. en cada una, lee `whatsapp_bot_sessions` con `seguimiento.pendienteEn <= ahora`, `orderBy("seguimiento.pendienteEn")`, `limit(50)`. Rango y orden sobre un solo campo: no pide índice compuesto, y las más viejas van primero;
  3. aplica las compuertas de la revisión privada. La ventana se mide por el último entrante **de esa línea** (`ultimoInboundMs(company, phone, lineId)`) y exige al menos 1 hora antes de que cierre. El horario es el del bot y, si Daniel lo confirma, la Ley 2300 (`utils/ventanaEnvio.js`, pregunta 6). En una cotización se lee el documento: solo si sigue «enviada» y sin respuesta, usando las vistas de D-428;
  4. **en la misma transacción** marca `enviadoEn` y **borra** `pendienteEn`. Una omisión definitiva (dueño humano, no contactar, cotización respondida, ventana sin margen) también borra `pendienteEn`. Una omisión por horario mueve `pendienteEn` a la próxima hora permitida, solo si cabe en la ventana; si no, lo borra. Así una sesión ya atendida no vuelve a salir en la consulta (crítica A4);
  5. envía el texto del servidor con `respetarNoContactar: true` y la `lineId` guardada.
- **Botones (crítica M4).**
  - Carrito: `seguimiento:seguir` (entra como un turno normal, con el carrito de la sesión) y `seguimiento:asesor` (traspasa).
  - Cotización: el enlace para **ver** la cotización y `seguimiento:asesor`. No se promete «acéptala en el enlace», porque ese enlace pide un documento que la cotización del bot no tiene (pregunta 17).
- **Etapa 2** (fuera de 24 h): se diseña, pero las tareas quedan bloqueadas.
  - Permiso pedido en la conversación con un botón («¿Te puedo escribir si no terminas hoy?»), guardado en la sesión como `consentimientoSeguimiento {texto, version, en}`.
  - Plantilla nueva de marketing, que hay que registrar en Meta. No se usa `katuq_retomar_conversacion_v1`, porque podría reclasificarse.
  - Ley 2300 y el interruptor `whatsappBotFollowUpTemplates`.

### D17. Postventa informativa (F4-40·7)

- **Políticas.** Con `whatsappBotAttention`, el despachador le pasa al agente `comercio.politicas {cambios, envios}`. El texto sale de las páginas `cambios-y-devoluciones` y `envios-y-entregas` de la tienda publicada (`utils/sitePaginasLegales.js:130-205`), solo de bloques de texto, con un tope de 1.500 caracteres cada una. Una página incompleta no se pasa (revisión privada).
- **Producto.** `perfilesProducto` suma `garantia` (`crearProducto.garantiasProducto`, como en `vitrinaProducto.js:332`) y `tiempoEntrega` (la misma regla de ≈187).
- **Agente.** Las reglas 3 y 5 del prompt (`agent.py:1088-1101`) cambian solo con la capacidad encendida (sección 8). La regla 3 dice hoy «no prometes fecha de entrega ni de despacho»: con `atencion` se agrega que sí **informa** el tiempo de entrega publicado del producto, como dato del comercio y no como promesa (crítica M7). Ante un cambio, una devolución o un reclamo, informa y llama a `pasar_a_un_asesor`. No hay herramienta que tramite nada.

### D18. Agenda desde el bot (F4-40·8, D-491)

- **kai.** Herramienta nueva `pedir_cita(motivo, fecha_preferida="")`, que solo anota `estado.pedir_agenda`. `pipeline.py` lo devuelve como `pedir_agenda`, y `whatsappBotClient.js` (≈57) como `pedirAgenda`.
- **Despachador.** Con `whatsappBotAttention`, más `serviceAgenda` y la Agenda configurada (`services/agenda/web.agendaPropia`):
  1. calcula los días con `web.diasYFranjas` y los ofrece como botones `agenda:<fecha>`;
  2. con el día, ofrece las franjas como `agenda:<fecha>:<franja>`;
  3. con la franja, llama a `citas.reservar(db, company, entrada, {origen: "opttia", usuario: {origen: "whatsapp-bot"}})` con:
     - el cliente desde la sesión y el teléfono resuelto por el servidor;
     - `requestId` derivado (revisión privada);
     - `notes` con el motivo.
  4. confirma con el texto del servidor.
- **Origen `opttia`, no uno nuevo (crítica M6).** `utils/agenda.js:25` ya trae `opttia` entre los orígenes, reservado por D-491 para «Opttia agenda por WhatsApp» (`servicios-y-agenda/tasks.md:99`, tarea 7.1), y el front ya lo muestra con la etiqueta «Opttia» (`agenda.models.ts:47,120`). No hace falta tocar el front ni agregar un origen. Hoy nadie reserva con `opttia`: la API de la Agenda solo acepta `agenda`, `sales` y `crm` del cuerpo (`controllers/appointments.js:105`). En `citas.reservar` (≈246), `desdeWeb` pasa a `esPublico = ["web", "opttia"]`: nace «Solicitada», desde mañana y con teléfono obligatorio, igual que la web. Si algún día el Opttia interno agenda a nombre del comercio, debe usar `agenda`, no `opttia`.
- **D-491.** Esta propuesta absorbe de la tarea 7.1 de D-491 la parte «Opttia agenda por WhatsApp». La confirmación en el chat es la respuesta al cliente que pidió la cita, dentro de su conversación; no es el aviso automático que `appointment-notifications` (spec de D-491, :33) deja fuera de su fase. La plantilla de recordatorio de la cita sigue en D-491.
- **Avisos al comercio.** Los de `services/agenda/avisos.js`, como la cita web.
- **Sin Agenda**, el bot traspasa, como hoy.
- **Write-set:** `appointments` y las escrituras de los avisos ya existentes. No toca `prospects`.

### D19. «Vendido con Opttia» (F4-40·9, tarea 6.8)

`services/enVivo/ia.js` marca `ia: true` cuando:

1. `order.origen === "whatsapp-bot"`, sin ninguna lectura;
2. existe una cotización con `company ==`, `pedidoGenerado == order.nroPedido` y `origen == "whatsapp-bot"` (igualdades, `limit(1)`, solo el campo `origen`). Es lo que escribe `marcarConvertida` (`controllers/cotizaciones.js:1050-1055`);
3. se conserva la regla vieja (`cotizacionOrigen`).

**Memoria (crítica B1).** Se usa la memoria que el marcador ya tiene (`crearMarcadorIa`, tope de 5.000 entradas), con la llave del pedido en vez de la de la cotización. No se crea otra. Un sí queda para siempre. Un no queda para siempre si el pedido tiene más de 24 horas; si es más nuevo, se vuelve a consultar pasado `REINTENTO_FALLO_MS`, porque `marcarConvertida` llega desde el navegador después de crear el pedido. Se descarta la lista por empresa con vencimiento de 10 minutos del texto anterior: crecía sin tope y era una caché con TTL nueva.

`tests/enVivo/writeset.contract.test.js` se ajusta: permite esa consulta por empresa y sigue sin aceptar escrituras.

### D20. Métricas de KAI (F4-40·2)

- Son marcas en el registro y no se infieren:
  - pedido del bot: `origen` y vendedor KAI;
  - cotización: vendedor `kai`;
  - pago recuperado: `recuperadoPorKai` (solo después del recordatorio de D13; la repetición de D14 no escribe);
  - cita: `source: "opttia"`;
  - web: `asistidoPorKai` en el evento `pedido` (D21).
- Dónde se muestran es la pregunta 13.
- Las métricas de atención (conversaciones, resueltas sin humano, tiempos y satisfacción) son de [CONV] H.

### D21. KAI en la web (F4-40·2, ·3, ·6, ·7)

- **Cotizables.** En `services/sites/asesorKai.js`, `candidatos` marca los ids de `tienda.cotizables`. `validarRespuesta` convierte un `agregar` de un cotizable en la acción nueva `cotizar` (que el widget de la tienda en `utils/siteHtml.js` muestra como «Cotiza con un asesor», abriendo el formulario de D-475), y nunca lo agrega.
- **Políticas.** `armarPrompt` recibe las mismas políticas de D17 y la garantía y el tiempo de entrega de los candidatos. Ante «¿dónde va mi pedido?», responde con el WhatsApp del comercio.
- **Atribución.** Cuando el widget agrega una línea, la marca `kai: true` en el carrito del navegador. El checkout envía `asistidoPorKai: true` si queda alguna línea marcada, y `crearPedido` lo agrega solo al evento `registrarEvento("pedido")`. El pedido no cambia.
  - **[sensible]** porque toca `crearPedido`. Va después de la extracción de D-496 (T·2), con diff aprobado.
- **Lo que la web no hace** está en la tabla de cobertura de `proposal.md` (crítica M10).

### D22. La bandeja ve el pedido del bot (F4-40·1)

- `GET /:phoneHash/bot` (`routers/whatsappConversations.js:603-659`) suma `pedidoCreado {nroPedido, total, estadoPago}`. **[crítica M5]** No sale de `sesion.pedidoDirecto.pedido`, que la reapertura y `devolverAlBot` borran: se lee el último pedido del bot en `orders` con `company ==`, `whatsappPhoneHash ==` y `origen == "whatsapp-bot"` (igualdades, `limit(10)`, el más reciente en memoria). Así el pedido se ve también cuando el cliente escribe después del cierre y pide una persona.
- El panel del hilo (`whatsapp-thread-detail.component.html` ≈194-205) muestra «Pedido N · pago pendiente/aprobado» con enlace al pedido. Es solo presentación, con la regla de diseño Katuq y `cfg-aviso`, sin clases con «p-».
- Que se vea el carrito después del traspaso (hoy solo se ve con `atendiendoBot`, ≈170) es desborde con contexto: va en [CONV] F.

### D23. Repo kai (sección 8 de tareas)

- **Contrato.** El backend manda `comercio.capacidades {pedidoDirecto, atencion, agenda}`, `comercio.politicas`, `cotizacionesRecientes` y, si Daniel lo aprueba, `comercio.tono`. Sin `capacidades`, `construir_instrucciones` (`agent.py:800-1215`) devuelve el **mismo texto de hoy**, comprobado con una prueba dorada.
- **Dónde entra (crítica M7).** El cuerpo se valida y se recorta campo por campo en `adk_agent/endpoints/whatsapp_bot_endpoint.py:63-140` (por ejemplo, `formasPago` a 15 de 60 caracteres). Los campos nuevos se validan ahí, con topes de largo y de cantidad, antes de llegar a `pipeline.py`.
- **Con `pedidoDirecto`:**
  - la regla 3 (:1088-1090) dice que el sistema le muestra al cliente el resumen y el enlace para pagar, y que KAI no cobra ni pide datos de tarjeta;
  - el cierre (:1169) deja de decir «un asesor se lo confirma»;
  - el docstring de `cerrar_pedido` (:383) deja de decir «para que un asesor lo confirme»;
  - `bloque_pagos` (:886-897) deja de decir «el pago se coordina con el asesor»;
  - «no aplicas descuentos» se mantiene en todos los casos (F4-40·6).
- **Con `atencion`:**
  - la regla 3 suma «informas el tiempo de entrega publicado, sin prometer fecha» (D17);
  - la regla 5 (:1098-1101) informa con las políticas, la garantía y los tiempos;
  - bloque de cotizaciones recientes;
  - `pasar_a_un_asesor` (:763) deja de listar garantías y formas de pago como motivos.
- **Con `agenda`:** la herramienta `pedir_cita`.
- La lista blanca MCP (:33-48) **no cambia**: `get_appointments` y las de pedidos quedan prohibidas.
- **Rama y golden.** La prueba dorada sale del commit que corre en producción, que hoy no se conoce (pregunta 15). La copia local `feat/claude-agent-sdk` no está en `origin/main`.
- **Despliegue:** `systemctl restart kai-adk`, por Daniel (AGENTS.md). El orden: kai primero (sin `capacidades` no cambia nada), backend después.

### D24. La página de gracias no cuenta la compra del bot (crítica A3)

- **Problema.** `/gracias` emite la compra a Meta, Google y TikTok desde el navegador (`siteHtml.conversionPagada`, `utils/siteHtml.js:6664-6700`) cuando el pedido es de la empresa y está pagado (`sites.js` ≈7709). `datosDeConfirmacion` (≈5253) solo exige `siteId`. Al pedido del bot llegan ahí tres caminos: el `redirectUrl` del núcleo (≈3412), el de `retomarPago` (≈5928) y el redirect de «Aprobado» (≈5786). La spec aprobada dice «SHALL NOT informar conversiones a plataformas de publicidad»; D4 solo filtraba lo que hace el servidor.
- **Arreglo.** `datosDeConfirmacion` devuelve `esDelBot: origen === "whatsapp-bot"`, y la página arma `conversion` solo si `pagado && !esDelBot`. La página sigue mostrando el estado del pago.
- **Lo que queda.** La visita a `/gracias` sí se cuenta como visita del sitio (`registrarVista` es un aviso del navegador). Es una visita real a la página; no se cuenta como pedido ni como venta.
- **TX-34.** `tienda-celular-y-velocidad` (tareas 4.1 y 4.2) reescribe los regresos a `/gracias` y el reintento. Por T·2, este arreglo se une antes y TX-34 lo conserva (su caracterización 1.6 debe incluir un pedido del bot pagado).

### Orden de unión (T·2 y orden de trabajo de D-518)

1. F2-41 con sus arreglos, commiteado.
2. Paso 3 del orden de trabajo de D-518 que toca `crearPedido` y `sites.js`: `cotizable-arreglos` (409 `COTIZABLE`) y los movimientos de D-505.
3. 0.8: líneas medidas otra vez y golden de 2.1 rehecho con el caso del cotizable.
4. Sección 3 (extracción) y lo que depende de ella.
5. Las tareas de pagos de esta ampliación (9.4, 9.6, 9.8, 9.10, 11.4 y 14.3) se unen **antes** que suscripciones (`suscripciones-en-la-tienda`) y que el pago rechazado de TX-34 (TX-34·3).

### Write-set de la ampliación

| Pieza | Escribe | No escribe |
|---|---|---|
| D11 `/pagar` del bot | `orders` (`pagoTienda.*`, `recordatorioPago.clicEn`), como hoy | productos, precios, catálogo |
| D12 notificaciones | `notification_queue`; el consumidor: `orders.waNotifSent`, `whatsapp_usage`, `whatsapp_balance` | `orders` fuera de esas marcas |
| D13 recordatorio | `orders.recordatorioPago.whatsappEn`; `orders.correosEnviados.pago_pendiente` (solo el respaldo); `recuperadoPorRecordatorio`/`recuperadoPorKai` al pagar; el barrido existente de la misma empresa (`restoreStock` y los campos de D-206); salida: `whatsapp_usage`, `whatsapp_balance` | `site_events`, `sites` |
| D15 origen | `orders.whatsappBot.origenContacto` del pedido nuevo | `orders.campana`, `prospects` (solo lectura), `cotizaciones` |
| D16 seguimientos | la sesión del bot; salida: `whatsapp_usage`, `whatsapp_balance` | `orders`, `cotizaciones`, `prospects` |
| D18 agenda | `appointments` y los avisos existentes de la Agenda | `orders`, `prospects` |
| D19, D20 y D22 | nada (solo lectura) | todo |
| D21 web | `site_events` (campo nuevo en el evento `pedido`) | `orders`, productos |
| D24 gracias | nada (solo deja de emitir la conversión del navegador) | todo |

En ninguna: `products`, variantes, precios, `preciosAsociados`, listas de precios ni catálogo.
Las pruebas de contrato de 6.6 y de En vivo se amplían con estas filas.

### Observabilidad (Artículos VII y XI)

- Eventos nuevos en `whatsapp_bot.*`: `pedido_directo_cotizable`, `pago_recordado`, `pago_recordatorio_correo`, `pago_recordatorio_omitido`, `pago_confirmado_plantilla`, `reserva_barrida`, `seguimiento_enviado | omitido | pospuesto`, `cita_ofrecida | reservada | ocupada`, `postventa_politica | sin_dato`.
- Llevan `company`, `phoneHash`, `correlationId`, `motivo` y `latenciaMs`, y `lineId` cuando hay línea.
- Nunca teléfono, nombre, dirección, enlace de pago ni texto de política.

### Gates constitucionales de la ampliación

| Art. | Cumplimiento |
|---|---|
| I, XIV | D-518 aprobó las decisiones. Esta ampliación espera aprobación (0.6) y la revisión privada (0.7) |
| II | Las specs nuevas no nombran tecnología |
| IV | Marcas en transacción antes de enviar (D13, D16), `waNotifSent` (D12), `requestId` en citas (D18), `clientMessageId` derivado en el recordatorio |
| V, X | Webhooks de Wompi y Kapso sin cambios |
| VI | Sin `if (provider…)` en UI |
| VII, XI | Arriba |
| VIII | Prueba primero en cada tarea; contract tests de write-set ampliados |
| IX | El panel del hilo es un cambio en un componente existente (Angular 14, como D-054) |
| XII | D9: dueño Daniel, revisión el 2027-04-30 |
| XIII | 5 specs de máximo 3 páginas |
| XV | No escribe `integrations` |
| D-505 | Ningún interruptor nuevo en el `.env`; las tareas nuevas leen `config/feature_flags` en cada vuelta |
| D-134 | Write-set arriba |
| Sin caché extra | D15 usa el caché del contexto que ya existe; D19 usa la memoria que el marcador ya tiene |

### Fuera de este cambio (D-518)

| Qué | Dónde |
|---|---|
| Chatwoot | Descartado (F4-40·1, D-170) |
| Instagram y Messenger | [CONV] F (cd `3VBswHv25B22hvRhyscs`), bloqueado: Meta rechazó `pages_messaging` e `instagram_manage_messages` (D-249) |
| Correo como canal | Fuera de F4-40 (F4-40·2; [CONV] I/L) |
| Preguntas frecuentes, desborde con contexto y encuesta | [CONV] F |
| Métricas de atención | [CONV] H (cd `W2xiIYg4v6midJ35AKfE`) |
| Tramitar cambios o devoluciones | No (F4-40·7) |
| Descuentos de KAI | Nunca (F4-40·6) |
| Unificar los motores web y WhatsApp | Pregunta 11 |
| Aceptar la cotización del bot desde el chat | Pregunta 17 |
| Topes de las consultas del recordatorio y del barrido de la tienda | Pregunta 18 (hallazgo escalado) |

### Crítica del 21-oct: qué se aplicó y qué no

Se verificó cada hallazgo en el código de `feature/tickets-web` (con el árbol de F2-41) y de kai.

| Hallazgo | Veredicto | Dónde quedó |
|---|---|---|
| A1 recordatorio sin correo no sale | Confirmado (`sitePagoPendiente.js:89-90`, `sites.js` ≈6008) | D13 fuera de `debeRecordar`; tarea 9.7 |
| A2 depende del candado del `.env` | Confirmado (`cronService.js:185`) | D13 y D16 en el job de sitios, siempre programado; barrido del bot incluido |
| A3 `/gracias` informa la compra | Confirmado (`sites.js` ≈7709, `siteHtml.js:6664`) | D24; tareas 9.9 y 9.10 |
| A4 la consulta de seguimientos se llena | Confirmado (diseño) | D16 paso 4; tarea 10.2 |
| A5 lo proactivo sale sin línea | Confirmado (`whatsappBotDispatcher.js:54-57`, sesión sin `lineId`) | D3, Contratos, D13, D16; tarea 4.1 |
| A6 no contactar apagado por defecto | Confirmado (`whatsappOutboundService.js:167`) | D13 y D16 con `respetarNoContactar: true`; 9.7; revisión privada |
| A7 orden de T·2 sin dependencias | Confirmado (orden de trabajo de D-518) | «Orden de unión»; 0.8 y 3.1 |
| M1 30 min y pedido pagado | Confirmado | D7, D14, spec, 6.1 y 6.5 |
| M2 dependencias de 4.6 y piloto | Confirmado | 6.6, 7.1 y 7.4 |
| M3 llaves del piloto | Confirmado (`companyFeatureFlags.js:99`, `notificationQueue.js` ≈628) | D9; 15.1 y 15.2. `PAGO_PENDIENTE_CRON_ENABLED` ya no hace falta para el bot (D13) |
| M4 cotización que no se puede aceptar | Confirmado (`whatsappBotCierre.js:321-330`, `cotizaciones.js:1450-1453`) | D16 botones; pregunta 17 |
| M5 panel pierde el pedido | Confirmado | D22 lee `orders` |
| M6 agenda: front y D-491 | Confirmado, con otro arreglo: se usa `opttia`, que ya existe en back y front | D18; sin tarea de front |
| M7 endpoint de kai, commit de producción y regla 3 | Confirmado (`whatsapp_bot_endpoint.py:63-140`; `origin/main` sin `channels/whatsapp`) | D17, D23; 8.1, 8.2 y 8.4 |
| M8 consulta de `prospects` y formato | Confirmado (`leadsWhatsapp.js:52-55`, `siteAtribucion.js:66-98`) | D15 `origenContacto`, sin `campana` |
| M9 consultas con tope | Plausible para lo existente; lo nuevo ya no depende | D13 consulta por empresa; tope de D5 en la revisión privada; pregunta 18 |
| M10 recortes de la web sin decir | Confirmado | Tabla de cobertura en `proposal.md` |
| M11 specs que asumen respuestas | Confirmado | Specs marcadas «según pregunta N»; recorte de la memoria declarado |
| M12 SMS | Sin cambio (la crítica dice que no requiere arreglo) | Pregunta 3 |
| B1 memoria con TTL | Confirmado | D19 usa la memoria existente |
| B2 detalle de seguridad en público | Confirmado | Tarea 8.4 remite a la revisión privada |
| B3 texto viejo | Confirmado; `whatsapp-bot-pedidos` no cita «1243» (no aplicaba ahí) | `proposal.md` y encabezado de este diseño |
| B4 bloqueos de 0.7 | Confirmado | 0.7 suma 6.2 (tope, revisión privada), 8.4, 9.10 y 16.2 |
| B5 líneas movidas | Confirmado | Líneas de esta sección medidas otra vez; 0.8 las vuelve a medir |
| B6 8.8 sin 8.7 | Confirmado | 8.8 depende de 8.7 |
