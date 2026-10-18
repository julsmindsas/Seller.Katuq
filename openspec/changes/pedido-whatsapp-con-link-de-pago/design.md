# Diseño — pedido por WhatsApp con link de pago, atendido por KAI

D-496, aprobada por Daniel el 2026-10-18 (ticket 1243, F4-40 parte 2). Requisitos:
`specs/whatsapp-bot-pedido-directo/spec.md` y el delta de `whatsapp-bot-pedidos`;
este diseño se valida contra ellos (tarea 0.1). Backend en
`katuq_admin_back_firebase/functions` (rama `backend-aws-security`); el front solo
suma la bandera al catálogo. Código leído el 2026-10-18, sin consultar producción.

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
  - Sobre la orden de `siteOrden.construirOrden` (≈343-430), justo después de armarla: `vendedor {email:"kai", nombre:"KAI"}`, `channel.name "WhatsApp"`, `origen`, `whatsappPhoneHash` y `whatsappBot {idempotencyKey, propuestaId, correlationId}`. Se quitan `medicion` y `campana`.
  - `resolverClienteEnCRM` recibe `origen {canal:"whatsapp-bot", siteId, pedido}` (≈3029) y un `usuario` nuevo, `"whatsapp-bot"`, que reemplaza el `user_edit` fijo (≈2427).
  - `updateByPOS(…, "whatsapp-bot")` (≈3086). Ese argumento es solo el actor del movimiento, no cambia la lógica.
  - Se aceptan a propósito `envio.alias` y la `zonaCobro` de respaldo «Tienda en línea» (`construirEnvio`), y el usuario de las notas. Describen la dirección, no el canal.
  - Se conservan `siteId` y `siteSlug`, que usan la conciliación y el cupo diario.
- No corren `cerrarCarritoAlComprar`, `registrarSuscripcion`, `pedidosCount`, `registrarEvento("pedido")` ni `contarUsoDeCupon`. Los cupones no aplican.
- **Sí corren igual:** notificaciones del pedido, tope del plan, reserva D-204 y el barrido D-206. El barrido se queda porque es lo que cumple los 60 min que el bot le promete al cliente, aunque la tienda no tenga actividad o el cron esté apagado. Por eso entra al write-set.
- `exigirPasarelaPropia` resuelve `gateway.getProvider(company)` una vez y solo cobra si `credentialsSource === "company-config"`.

**D4. Efectos de página fuera del pedido del bot.** Con `origen === "whatsapp-bot"`:

- `aplicarPagoDeTienda` omite `registrarEvento("pago"/"pago_recuperado")` e `informarConversionDePago`. Estado, idempotencia, inventario de respaldo y correo de pago aprobado no cambian, ni el webhook.
- `sitePagoPendiente.debeRecordar` responde `{recordar:false, motivo:"pedido del bot"}`. Así no hay correo, ni `recordatorio_pago`, ni `correosEnviados.pago_pendiente`, ni `recuperadoPorRecordatorio`. El cron sigue sumando la empresa a `empresasPorBarrer`: la reserva vence a tiempo.
- `retomarPago` trata el pedido del bot como inexistente, igual que hoy uno sin `siteId`, antes de anotar el clic o generar un link. El bot nunca emite `/pagar` y reenvía el link guardado (D7). Así, ningún link automático de este camino sale con la cuenta de la plataforma.

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
- tope: menos de 2 pedidos directos sin pagar todavía apartados para ese celular. Se cuenta por celular, no por conversación. Se leen `orders` con `company`, `whatsappPhoneHash` y `estadoPago` en «Pendiente» y en «Rechazado» (dos consultas de igualdades, `limit(10)`). En memoria quedan solo los de «Pago en línea» sin `reservaVencida`, con `estadoProceso` distinto de Anulado, Cancelado y Rechazado, y creados hace menos de `RESERVA_TIENDA_MINUTOS`. Es el filtro del barrido al revés: un link vencido nunca bloquea.

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
- **Repetición, 30 min.** Tras el 201 la sesión queda `cerrada` y la reapertura post-cierre (≈753-761) limpiaría `pedidoDirecto`. Por eso el gancho va justo después de `obtenerOCrear` (≈740) y **antes** de la reapertura, solo con las tres llaves encendidas:
  - `esRepeticion` es pura y no escribe. Exige sesión `cerrada` sin dueño humano, `pedidoDirecto.estado === "creado"`, menos de 30 min desde `pedido.creadoEn`, y el botón «Pagar» de esa misma propuesta, `esConfirmacionCorta` o `esPideLink`.
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
| Sesión `integration_configs/{company}_kapso/whatsapp_bot_sessions/{phoneHash}` | `pedidoDirecto {propuestaId, carritoHash, siteId, totalMostrado, expiraEn, estado: propuesto/creando/creado/descartado, leaseHasta, idempotencyKey, pedido{orderId, nroPedido, total, linkUrl, creadoEn}}`; `marcarCerrada` acepta `pedidoCreado`; `devolverAlBot` limpia `pedidoDirecto` |
| Pedido (`orders`) | `origen`, `whatsappPhoneHash`, `whatsappBot{…}`, vendedor KAI, canal WhatsApp |
| Modo | `bot.pedidoDirectoModo: "sombra" \| "activo"`, validado en `whatsappCompanyConfig.js` (≈376); ausente = `sombra`; lo fija `scripts/set-bot-pedido-directo.js` |
| Bandera | `companies.featureFlags.whatsappBotDirectOrder` |
| Interruptor general | `WHATSAPP_BOT_PEDIDO_DIRECTO_HABILITADO=true` en el `.env` (apagado de fábrica) |

Sin colecciones nuevas, endpoints «v2» ni rutas nuevas.

## Banderas y modo sombra

Son tres llaves, como en D-410 y D-422; si falta una, el bot queda idéntico a hoy.

- El interruptor general es el kill switch de todos. Lo enciende Daniel en el `.env` de producción.
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
  - El contador del plan en `companies` (`consumeStoreOrderSlot`).
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
9. Propuesta vigente 30 min. Tope de 2 pedidos sin pagar con reserva vigente, por celular. Repetición de 30 min.
10. «Hablar con asesor» deja la cotización de hoy y traspasa. Se acepta un «sí» escrito.
11. Modo en la configuración del bot, con script, más el interruptor general.
12. El barrido D-206 sigue corriendo en el canal del bot. **Desvío del write-set de la propuesta:** `restoreStock` y la anulación de pedidos vencidos de la misma empresa.
13. **Desvío del write-set de la propuesta:** el contador del plan en `companies`, `inventory_audit` y las escrituras de notificación de la tienda (lista cerrada por 2.1).
14. El pedido del bot no recibe el correo de recordatorio de la tienda y `/pagar` no le genera link. Sí recibe, si tiene correo, los de pedido creado y pago aprobado con la marca de la tienda.
15. Marcas: se aceptan «Tienda en línea» en `envio.alias`, la zona de respaldo y el usuario de las notas.
16. **Desvío de la propuesta:** retiro de la bandera a los 30 días de encenderla para todos, con tope de revisión el 2027-04-30.
17. **Fuera de la propuesta:** tarea 6.8, «Vendido con Opttia» de En vivo cuenta los pedidos del bot. Solo se hace si Daniel la confirma.

## Fuera de esta fase

| Fase | Depende de |
|---|---|
| Contra entrega y transferencia por el bot | Esta fase en producción; spec propia |
| Comercios sin tienda (`orders/create`) | Caracterizar esa ruta y su conciliación |
| Reserva por canal (más de 60 min) | Datos de pago tardío; cambio aparte a D-206 |
| Aviso de pago y recordatorio por WhatsApp | Plantilla aprobada por Meta |
| Mover el núcleo a `services/sites/` | Esta fase estable |
| `convertir-pedido` y aprobar por link sin documento | No-goal; cambio aparte |
