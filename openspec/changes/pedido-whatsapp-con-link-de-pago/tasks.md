# Tasks — pedido por WhatsApp con link de pago, atendido por KAI

D-496 (ticket F4-40, cd `PrDNIoDwRacCPQVcHmx1`; el número 1243 está repetido, D-518). Backend en `katuq_admin_back_firebase/functions`.

> **Ampliación del 2026-10-21 (D-518), PENDIENTE DE APROBACIÓN:** tareas 0.6 a 0.9 y secciones 8 a 16. Lo aprobado y lo hecho el 18 y el 20-oct se conserva. Donde la ampliación lo reemplaza, dice **SUPERSEDED (21-oct)**. Por T·2, todo va en la rama `feature/tickets-web` del backend y del front. El repo `kai` va en la rama que defina Daniel (pregunta 15). Orden de unión de lo que toca `crearPedido` (`design.md`, «Orden de unión»): primero F2-41 con sus arreglos; después los arreglos del paso 3 de D-518 que tocan `crearPedido` (`cotizable-arreglos` y D-505); después 0.8 y la extracción de D-496 (sección 3); las tareas de pagos de esta ampliación (9.4, 9.6, 9.8, 9.10, 11.4 y 14.3) antes que suscripciones y que el pago rechazado de TX-34.

- **[sensible]**: toca pedidos, pagos, inventario o consecutivos. Va un cambio a la vez, con diff aprobado por Daniel antes de aplicar.
- **[P]**: se puede hacer en paralelo.
- Ninguna tarea de código empieza antes de 0.2. Las del camino nuevo esperan además la 0.5.
- Las pruebas van primero (Artículo VIII), incluido el contract test del write-set.
- Toda tarea de código cierra con sus pruebas en verde y sin fallos nuevos frente a la línea base de 0.4.
- El front cierra con `npm run build:prod`.

## 0. Antes del código

- [x] 0.1 Revisar la spec: `specs/whatsapp-bot-pedido-directo/spec.md` y el delta
      de `whatsapp-bot-pedidos`. Incluye el escenario de producto, variantes,
      precio y listas sin cambios. Éxito: aprobada por Daniel.
      Estado: aprobada por Daniel el 2026-10-18, en bloque con las nueve propuestas
      (`specs/CONTRACT.md`, «D-495 a D-503», línea «2026-10-18, diseño y tareas aprobados»;
      artefactos en f6417dcd).
- [x] 0.2 Daniel aprueba el diseño, estas tareas y la lista «Valores por defecto»
      de `design.md`, incluidos los desvíos marcados. Dep: 0.1.
      Estado: aprobado en la misma línea del contrato (2026-10-18), sobre los artefactos de
      f6417dcd, incluidos los valores 12, 13 y 16, marcados como desvío de la propuesta. No cubre
      lo escrito después: la sección «Desvíos» de `design.md` (0.3 y 0.4, 2026-10-19) espera su
      visto bueno, igual que la confirmación expresa de la 6.8 (valor 17) y los dos hallazgos
      escalados (desvíos 2 y 10 de esa sección).
- [x] 0.3 `git pull --rebase` en los dos repos. Leer completos:
      - `controllers/sites.js` (≈2320-3300, 4148-4460, 4832-5070);
      - `utils/siteOrden.js`, `siteCompraAhora.js` y `sitePagoPendiente.js`;
      - `services/whatsappBotDispatcher.js`, `whatsappBotSessionService.js`, `whatsappBotCierre.js` y `whatsappCompanyConfig.js`;
      - `services/orderService.js`, `paymentGateway/index.js` y `companyFeatureFlags.js`;
      - `inventoryService.js`, solo `updateByPOS` y `restoreStock`;
      - las 4 pruebas que extraen `crearPedido`: `compraAhoraPedido`, `pedidoReservaDuplicada`, `pedidoRetiroCantidades` y `checkoutAltaConversion`.
      Éxito: desvíos anotados en «Desvíos». Dep: 0.2.
      Estado (2026-10-19): doce desvíos anotados en «Desvíos» de `design.md`. Se leyó la punta local, sin `pull`,
      porque el orquestador lo prohíbe con varios agentes en el mismo árbol. El `pull --rebase` queda para
      antes del commit (7.2).
- [x] 0.4 Línea base: `tests/sitios`, `tests/notifications` (bot),
      `tests/cotizaciones`, `tests/integrations` (Wompi), `tests/orders` y
      `tests/companies`. Éxito: fallos previos en «Desvíos». Dep: 0.2.
      Estado (2026-10-19): 124 de 132 en verde. Los 8 fallos previos están en «Desvíos» de `design.md`.
- [ ] 0.5 Revisión de seguridad del camino nuevo, escrita en el openspec privado del
      backend (`katuq_admin_back_firebase/openspec/changes/`), con sus pruebas. En
      este repo no se describe. Éxito: aprobada por Daniel. Dep: 0.2. Bloquea 4.2,
      4.6, 6.2, 6.7 y 7.4.
      Estado (2026-10-19): escrita en `pedido-whatsapp-seguridad`, con sus pruebas propuestas. Espera la aprobación de Daniel.
      21-oct: su control S8 (404 de `/pagar` para el pedido del bot) queda SUPERSEDED por F4-40·5. El reemplazo está en la revisión de 0.7.
- [ ] 0.6 **[21-oct]** Daniel aprueba la ampliación: `proposal.md` (parte 3 y preguntas 1 a 18), la sección «Ampliación 21-oct» de `design.md`, las specs nuevas (`whatsapp-bot-pago-y-recuperacion`, `kai-whatsapp-atencion`, `kai-metricas`, `kai-asesor-web`), los bloques [21-oct] de `whatsapp-bot-pedido-directo` y estas tareas. Las decisiones de D-518 ya están aprobadas y no se vuelven a preguntar. Éxito: la aprobación queda en `specs/CONTRACT.md` con fecha.
- [ ] 0.7 **[21-oct]** Revisión de seguridad de la ampliación, escrita en el openspec privado del backend (`openspec/changes/pedido-whatsapp-con-link-de-pago-seguridad`), con sus pruebas. Aquí: «ver revisión privada». Éxito: aprobada por Daniel. Dep: 0.6. (F440-B03, parcial, sin marcar: ya están las piezas compartidas de la revisión privada, con pruebas en `tests/notifications/whatsappBotSeguridad.test.js`: pasarela propia, envío proactivo, log seguro, destinatario y utilidades de la propuesta; ver revisión privada. Falta el cableado en `controllers/sites.js` —espera la fila de la tienda— y la aprobación de Daniel.) Bloquea 6.2 (tope del celular), 8.4, 9.4, 9.6, 9.8, 9.10, 10.3, 11.2, 11.4, 12.3, 13.2, 14.2, 14.3 y 16.2.
- [ ] 0.8 **[21-oct]** Cuando estén commiteados en `feature/tickets-web` F2-41 (T·2) y los arreglos del paso 3 del orden de trabajo de D-518 que tocan `controllers/sites.js` (`cotizable-arreglos`, con su 409 `COTIZABLE` en `crearPedido`, y los movimientos de D-505), volver a medir las líneas que citan `design.md` y estas tareas (`crearPedido`, efectos, `aplicarPagoDeTienda`, `datosDeConfirmacion`, la página de gracias, `vencerReservasDeTienda`, `retomarPago` y `recordarPagosPendientes`). Rehacer el golden de 2.1 con el caso del cotizable y con lo que F2-41 haya cambiado, con diff revisado por Daniel. Éxito: desvíos anotados y golden en verde. Dep: F2-41 y esos arreglos commiteados.
- [ ] 0.9 **[21-oct]** Pendientes de antes que siguen abiertos: el visto bueno a los 12 desvíos de `design.md`, el desvío 10 (barrido D-206 frente a Kuvo) y las decisiones S3, S4 y S5 de 0.5. (S5, el modo solo por script, quedó implementada en F440-B01; el resto sigue abierto.) La 6.8 ya no está pendiente: la confirmó F4-40·9.

## 1. Parte 1 restante: historial del paso a `enviada` (solo `cotizaciones`)

- [x] 1.1 Prueba primero en `whatsappBotCierre.contract.test.js`: el paso a
      `enviada` deja `fechaEnviada` y el evento `{de:"borrador", a:"enviada",
      usuario:"kai", origen:"whatsapp-bot"}`. El write-set sigue en `cotizaciones`
      y su contador. Éxito: falla contra el código actual. Dep: 0.3, 0.4.
      Estado (2026-10-19): falló contra el código anterior con «queda la fecha derivada del estado: undefined».
- [x] 1.2 Implementarlo con `historial.cambioDeEstado` y `arrayUnion`. Éxito: 1.1,
      `asesorKai`, `historialEstados`, `indicadoresComerciales` y
      `metricasListado` en verde. Dep: 1.1.
      Estado (2026-10-19): en verde, junto con las dos `asesorKai`, `historialEstados`, `indicadoresComerciales`,
      `metricasListado` y `whatsappBotDispatcher`. No es [sensible]: solo escribe en `cotizaciones`.

## 2. Caracterización (sin tocar código de producción)

- [x] 2.1 Arnés compartido `tests/sitios/_crearPedidoHarness.js` (vm + acorn,
      Firestore falso). Extrae por nombre:
      - `exports.crearPedido`;
      - `crearPedidoDeTienda`, si existe (antes de 3.1 no existe);
      - el `vencerReservasDeTienda` real, con `RESERVA_TIENDA_MINUTOS` y un `_ultimoBarridoPorEmpresa` nuevo en cada caso.
      `setImmediate` va a una cola que la prueba vacía. Hay espías de `updateByPOS`,
      `restoreStock` y notificaciones, y una base con un pedido vencido y otro
      vigente de la misma empresa. Con él se escribe
      `pedidoTiendaCaracterizacion.test.js`, con estos casos:
      - en línea con link, link fallido y contra entrega;
      - forma manual, retiro y zonas;
      - agotado, cantidad mayor, no comprable, `paginaWeb` falso y sin precio;
      - mínimo, cupo diario, fecha bloqueada y tope del plan;
      - cupón, promoción, `PRECIO_CAMBIO` y gemelo.
      El golden guarda `status` y `body`, las escrituras en orden (colección,
      operación y documento), incluidas las del barrido, y las llamadas a
      efectos. También enumera las colecciones de notificación. Éxito: verde
      contra el código actual. Dep: 0.4.
      Estado (2026-10-19): 20 casos en verde y deterministas. Usan el `createOrder`, el repositorio y el
      `limitsService` reales sobre un Firestore falso. El golden está en `pedidoTiendaCaracterizacion.golden.json`
      y se rehace con `ACTUALIZAR_GOLDEN=1`.
- [x] 2.2 [P] Conciliación base con `wompiWebhookHarness.js`. Un pedido de tienda
      se aprueba una vez y el reintento no cambia nada. Corren `registrarEvento("pago")`
      y la conversión, sin segundo descuento. Éxito: verde. Dep: 0.4.
      Estado (2026-10-19): `tests/sitios/pagoTiendaConciliacionBase.test.js`, 6 pruebas en verde. Cubren el
      webhook real con la tienda real, la carrera, el pago recuperado, la red de seguridad, el pago tardío y el rechazo.
- [x] 2.3 [P] Recordatorio y `/pagar` base, con un pedido de tienda en la ventana.
      `recordarPagosPendientes` envía `pago_pendiente`, registra
      `recordatorio_pago` y suma la empresa a `empresasPorBarrer`; `retomarPago`
      genera link. Éxito: verde. Dep: 0.4.
      Estado (2026-10-19): `tests/sitios/recordatorioPagoBase.test.js`, 7 pruebas en verde, incluida la simulación,
      el link vigente, la firma mala y la reserva vencida.

## 3. Extracción del núcleo, sin cambio de comportamiento

- [ ] 3.1 **[sensible]** Separar `crearPedidoDeTienda` y dejar `crearPedido` como
      adaptador (D1). Adaptar las 4 pruebas que extraen `crearPedido`:
      - las tres de acorn pasan al arnés de 2.1, que extrae las dos funciones;
      - `checkoutAltaConversion` busca su orden de pasos dentro de `crearPedidoDeTienda`.
      Solo cambia la extracción, no las aserciones. Éxito: goldens de 2.1
      idénticos; las 4 pruebas en verde con las mismas aserciones; suite de
      sitios sin fallos nuevos. Dep: 2.1. **[21-oct]** Dep también: 0.8 (golden rehecho sobre F2-41 y el cotizable).
      Ojo: `pedidoReservaDuplicada` ya está en rojo por montaje (desvío 12 de la sección «Desvíos» de
      `design.md`). Se arregla el montaje al pasarla al arnés; sus aserciones no se tocan.
- [ ] 3.2 **[sensible]** `codigo` interno. Prueba primero: el cuerpo HTTP no cambia
      (`TOPE_PLAN` y `PRECIO_CAMBIO` siguen en él) y cada caso trae su `codigo`.
      Dep: 3.1.
- [ ] 3.3 **[sensible]** `soloPreparar`. Prueba primero: cero escrituras en toda la
      matriz y resumen igual al total que se cobraría. Dep: 3.2.

## 4. Canal `whatsapp-bot`: núcleo, conciliación y recordatorio

- [ ] 4.1 Prueba primero: contrato de la función interna con `canal: "whatsapp-bot"`.
      - Entrada y salida.
      - Marcas: `origen`, `whatsappPhoneHash`, vendedor KAI, `channel.name "WhatsApp"` y `whatsappBot.idempotencyKey`, sin `campana` ni `medicion`. **[21-oct]** Además `whatsappBot.telefono` (el resuelto por el servidor, nunca el de quien recibe), `whatsappBot.lineId` (la del turno o `null`) y `whatsappBot.origenContacto` cuando se pasa.
      - **[21-oct]** Un POST público con `origen: "whatsapp-bot"` en el cuerpo crea un pedido de tienda normal (revisión privada).
      - Cliente nuevo con `origenPrimerContacto.canal "whatsapp-bot"`; existente con `user_edit "whatsapp-bot"`.
      - Actor de inventario `"whatsapp-bot"`.
      - Sin carrito, suscripción, `pedidosCount`, `registrarEvento` ni cupón.
      - Inventario solo por los espías de `updateByPOS` (pedido nuevo) y `restoreStock` (barrido, solo pedidos vencidos de la misma empresa).
      - `clienteId` ajeno rechazado.
      - `totalVisto` distinto: 409 sin escrituras.
      - Pasarela de plataforma: `getProvider` una vez y sin link.
      - Productos, precios y listas iguales.
      Éxito: falla contra 3.3. Dep: 3.3.
- [ ] 4.2 **[sensible]** Opciones y marcas del canal (D3). Éxito: 4.1 en verde y
      goldens de 2.1 idénticos. Dep: 4.1, 0.5.
- [ ] 4.3 Prueba primero: conciliación de un pedido del bot. Se aprueba una vez y
      es idempotente. No corren `registrarEvento("pago"/"pago_recuperado")` ni la
      conversión, y no hay segundo descuento. Éxito: falla contra 4.2. Dep: 2.2, 4.2.
- [ ] 4.4 **[sensible]** Filtro por `origen` en `aplicarPagoDeTienda` (D4).
      Éxito: 4.3 y 2.2 en verde. Dep: 4.3.
- [ ] 4.5 **SUPERSEDED (21-oct) por F4-40·5.** La reemplazan 9.3 y 9.7. Texto original, sin efecto:
      - `debeRecordar` da `{recordar:false, motivo:"pedido del bot"}`;
      - `recordarPagosPendientes` no envía correo, no llama `registrarEvento` ni marca `correosEnviados`, pero sí suma la empresa a `empresasPorBarrer`;
      - `/pagar` responde como inexistente, sin `generatePaymentLink` ni `recordatorioPago.clicEn`.
      Éxito: falla contra 4.4. Dep: 2.3, 4.2.
- [ ] 4.6 **SUPERSEDED (21-oct) por F4-40·5.** La reemplazan 9.4 y 9.8. Texto original, sin efecto: filtro en `sitePagoPendiente.debeRecordar` y
      `retomarPago` (D4). Éxito: 4.5 y 2.3 en verde. Dep: 4.5, 0.5.
- [x] 4.7 [P] Revisar quién lee `order.vendedor.email`. Confirmar que `kai` no se
      usa como dirección y protegerlo si hace falta, como `contactoVendedor`.
      Éxito: hallazgos en «Desvíos», con prueba si hubo cambio. Dep: 0.3.
      Hecho (2026-10-21, F440-B05): desvío 13 de `design.md`. Nadie lee `order.vendedor.email`; sin cambio ni prueba.

## 5. Bandera, modo e interruptor

- [x] 5.1 [P] `whatsappBotDirectOrder` en `companyFeatureFlags.js`, con dueño y
      retiro según 0.2. Éxito: `companyFeatureFlags.test.js` en verde. Dep: 0.2.
- [x] 5.2 [P] Front: la misma bandera en `company-features.service.ts`.
      Éxito: build de producción sin errores. Dep: 0.2.
- [x] 5.3 [P] `bot.pedidoDirectoModo` en `whatsappCompanyConfig.js`. Prueba primero:
      un valor inválido se rechaza, ausente se lee como `sombra` y los demás campos
      no cambian. Dep: 0.2.
- [x] 5.4 ~~`WHATSAPP_BOT_PEDIDO_DIRECTO_HABILITADO` documentada en el ejemplo de
      variables, apagada.~~ **SUPERSEDED (21-oct) por D-505 y D-518.** [P] `services/interruptorGeneral.js`
      lee `config/feature_flags.<nombre>` (ausente o error = apagado), más
      `scripts/set-interruptor-general.js` (simula por defecto, `--execute` escribe una sola llave).
      Prueba primero: ausente, `false`, error de lectura y `true`, y la simulación no escribe. Nada nuevo
      en el `.env`. Dep: 0.6.
- [x] 5.5 [P] `scripts/set-bot-pedido-directo.js --company <c> --modo sombra|activo`.
      Simula por defecto; `--execute` escribe solo `bot.pedidoDirectoModo` con la
      validación de 5.3 e imprime antes y después. Prueba primero: la simulación no
      escribe y los demás campos quedan intactos. Dep: 5.3.
      **Hecho (F440-B01, 21-oct):** las tres banderas (`whatsappBotDirectOrder`, `whatsappBotAttention`,
      `whatsappBotFollowUp`) en `companyFeatureFlags.js`; en vez de `interruptorGeneral.js` se usó el
      `platformFlags.js` que ya existe (llaves `whatsappBotDirectOrder`, `whatsappBotAttention`,
      `whatsappBotFollowUp`, `whatsappBotFollowUpTemplates`, off|on) y `scripts/platform-flags.js`;
      `services/whatsappBotInterruptores.js` (`habilitado`) es lo único que consultan los demás bloques.
      Control S5: el PUT del panel valida pero ignora `bot.pedidoDirectoModo`; solo cambia con
      `scripts/set-bot-pedido-directo.js` (aviso del caché de 5 min). Pruebas:
      `tests/notifications/whatsappBotInterruptores.test.js` y `whatsappBotPedidoDirectoModo.test.js`.

## 6. Servicio del bot y despachador

- [x] 6.1 Prueba primero, `whatsappBotPedidoDirecto.test.js`, sin red:
      - `hashCarrito` y `llaveIdempotencia`;
      - `esConfirmacionCorta` y `esPideLink`: «sí», «dale», «listo», «pagar» y «link» confirman; «sí pero cambia…» no;
      - `zonaPorCiudad`: única, ambigua o ninguna;
      - `armarEntrada`: extra por nombre, «Talla: M», dedicatoria, fecha fuera de rango y extra ambiguo;
      - `evaluar`, un caso por `motivo`. Tope: con `reservaVencida`, anulado, cancelado, rechazado o con más de 60 min no cuenta; dos vigentes dan `tope_sin_pagar`;
      - `esRepeticion`: cerrada, creado, menos de 30 min y botón de la misma propuesta dan sí; a los 31 min, con otra propuesta o con las llaves apagadas, no. **[21-oct, D14]** El límite pasa a `RESERVA_TIENDA_MINUTOS`: a los 40 min sí, a los 61 no.
      - **[21-oct]** Tope del celular: ver revisión privada.
      Dep: 4.2, 5.1, 5.3.
- [x] 6.2 **[sensible]** `services/whatsappBotPedidoDirecto.js` (D5-D8).
      Éxito: 6.1 en verde. Dep: 6.1, 0.5.
      Hecho (2026-10-21, F440-B05): `services/whatsappBotPedidoDirecto.js` y `tests/notifications/whatsappBotPedidoDirecto.test.js` (35 casos, sin red). El núcleo llega por inyección (`crearPedidoDeTienda`); sin él, `evaluar` da `nucleo_no_disponible` y el cierre sigue en cotización. Quedan fuera hasta la fila de la tienda: la extracción del núcleo, `/pagar` y `/gracias` para el pedido del bot y el cableado en el despachador (6.5 y 6.7). Sumó a la sesión `liberarCreacion` y `reintentos` en `guardarPropuesta` (pedían el 409 de D8).
- [x] 6.3 Prueba primero, en `whatsappBotSession.test.js`:
      - `guardarPropuesta`;
      - `reclamarCreacion`: lease, y dos llamadas a la vez dan un solo `creando`;
      - `marcarPedidoCreado` con `creadoEn`;
      - `descartarPropuesta`;
      - `devolverAlBot` limpia;
      - `marcarCerrada` con `pedidoCreado`.
      Dep: 0.3.
- [x] 6.4 Mutaciones de sesión, todas en transacción. Éxito: 6.3 en verde. Dep: 6.3.
      (F440-B04: además `seguimiento` con `marcarSeguimiento`, `borrarSeguimiento`, `registrarEnvio` y `posponer`; el cableado del despachador es de F440-B09. 10.2 sigue abierta.)
- [x] 6.5 (F440-B06: la caracterización con llaves apagadas está en `whatsappBotDispatcher.test.js`; los casos nuevos, en `whatsappBotDispatcherPedidoDirecto.test.js` con el arnés `_pedidoDirectoHarness.js`; 17 casos en verde) Prueba primero, en `whatsappBotDispatcher.test.js`:
      - llaves apagadas: la cotización de hoy, byte a byte, y el «sí» post-cierre reabre como hoy;
      - sombra: cotización, evento `sombra` y cero escrituras en `orders`;
      - activo y elegible: propuesta sin cotización;
      - «Pagar» o «sí» escrito sin `opcionId`: pedido, link y sesión cerrada;
      - «link» a los 10 min: mismo pedido, sin reapertura; su reentrega da `ya_atendido`;
      - a los 31 min: conversación nueva con carrito vacío (**[21-oct, D14]** a los 40 min, sin pagar: mismo número y enlace de `/pagar`; pagado: «ya recibimos tu pago»; a los 61 min o anulado: conversación nueva con carrito vacío);
      - reentrega de Kapso durante la confirmación: `ya_atendido`;
      - propuesta vieja: propuesta nueva;
      - precio cambiado: una nueva propuesta y después traspaso;
      - link fallido: traspaso con número;
      - pasarela de plataforma: cotización;
      - «Hablar con asesor»: cotización y traspaso.
      Dep: 6.2, 6.4.
- [x] 6.6 (F440-B06: hecha para el camino directo, la propuesta, la sombra, las llaves apagadas y el barrido modelado con la lista cerrada; el cron del recordatorio y las filas D13/D15/D18 se suman en `FILAS_EXTRA` con 9.8, 11.x y 12.x; gancho `F440_NUCLEO=real` para el núcleo real) Prueba primero: contract test de punta a punta
      (`whatsappBotPedidoDirecto.contract.test.js`), con la lista blanca del
      diseño cerrada por 2.1 (incluye el barrido) y sin efectos de página. Cubre
      el camino directo, el pago y el cron del recordatorio. Falla con escrituras
      en `products`, precios, `preciosAsociados`, `cotizaciones`, `sites`,
      `site_events`, `prospects` o cualquier colección no listada. Éxito: falla
      contra 6.5 porque el despachador aún no crea pedidos, no por errores de
      montaje. Dep: 2.1, 4.6, 6.4. **[21-oct]** 4.6 está SUPERSEDED: Dep pasa a 2.1, 4.4 y 6.4. El cron del recordatorio del bot lo cubre la ampliación de 6.6 en 9.8.
- [x] 6.7 (F440-B06: hecho en `services/whatsappBotDispatcher.js` con la llave de la empresa y el interruptor general; sin el núcleo `crearPedidoDeTienda` —espera la fila de la tienda— el servicio da `nucleo_no_disponible` y el cierre sigue en cotización) **[sensible]** Despachador, en tres puntos:
      - el gancho de repetición, después de `obtenerOCrear` (≈740) y antes de la reapertura (≈753): primero `registrarTurno`, luego `repetir`;
      - la rama del cierre (≈1148);
      - el bloque de confirmación, después de la rama `opcionId` (≈940-1044) y antes de `pedirTurno` (≈1054), con la clase `pedidoDirecto` y el «sí» escrito.
      Éxito: 6.5, 6.6 y todas las pruebas del bot en verde. Dep: 6.5, 6.6, 0.5.
- [ ] 6.8 **Confirmada por F4-40·9 (D-518) y ampliada; se hace como 13.1 y 13.2.** Texto original: `services/enVivo/ia.js` cuenta como
      «Vendido con Opttia» un pedido con `origen: "whatsapp-bot"` (solo lectura).
      Éxito: `tests/enVivo/writeset.contract.test.js` en verde. Dep: 4.2.

## 7. Verificación, despliegue, encendido y retiro

- [ ] 7.1 Repetir 0.4 completo. Éxito: sin fallos nuevos y build del front sin
      errores. Dep: 1.2, 4.4, 4.6, 4.7, 5.x y 6.x. **[21-oct]** Sin 4.6 (SUPERSEDED); suma 9.4, 9.6, 9.8 y 9.10: sin ellas, el pedido del bot quedaría con `/pagar` sin el control de pasarela y con la conversión en `/gracias`.
- [ ] 7.2 Commit por repo sin `git add -A`. Deploy del backend con el interruptor
      apagado y `npm run release` del front. Lo ejecuta Daniel o se hace con su
      permiso. Éxito: Daniel verifica que el pedido normal de una tienda publicada
      no cambió. Dep: 7.1.
- [ ] 7.3 FLORECER en sombra. Cada paso se anota en la bitácora con fecha y quién:
      - bandera: `set-company-feature.js`, en simulación y luego con `--execute`, por Daniel o con su permiso;
      - modo: `set-bot-pedido-directo.js --modo sombra`, en simulación y luego con `--execute`;
      - interruptor general: ~~Daniel pone `WHATSAPP_BOT_PEDIDO_DIRECTO_HABILITADO=true` en el `.env`~~ **(21-oct, D-505)** `set-interruptor-general.js --flag whatsappBotDirectOrder --on`, en simulación y luego con `--execute`, por Daniel o con su permiso. No hace falta reiniciar.
      Éxito: 3 días de eventos `sombra` con los dos totales comparados. Dep: 7.2.
- [ ] 7.4 **[sensible]** FLORECER activo (**21-oct, F4-40·10:** con un número propio de prueba, Wompi propio y tienda publicada, tarea 15.1), con
      `set-bot-pedido-directo.js --modo activo --execute` y el visto bueno de
      Daniel. Prueba completa: link, pago, conciliación y descuento. Un segundo
      pedido sin pagar vence a los 60 min, devuelve existencias y deja de contar
      para el tope. ~~Sin recordatorio de la tienda ni evento del sitio.~~ **[21-oct]** Además:
      - el bot entrega el enlace de `/pagar`, no el de Wompi;
      - no llega la plantilla de pedido creado;
      - al pagar llega una sola vez `katuq_payment_approved_v1`, por el número de la conversación;
      - el segundo pedido recibe un solo recordatorio por el chat entre los 20 y los 55 min, y ningún correo si el mensaje salió;
      - sin evento del sitio y sin compra informada desde `/gracias` (revisar el navegador con las herramientas de Meta y Google).
      Éxito: aprobado por Daniel. Dep: 7.3, 0.5. **[21-oct]** Dep también: 0.7, 9.4, 9.6, 9.8, 9.10 y 15.1.
- [ ] 7.5 ALMARA FELICIDAD: 7 días en sombra y luego activo, con visto bueno de
      Daniel. Dep: 7.4.
- [ ] 7.6 Bitácora y estado de D-496 en `specs/CONTRACT.md`. Comentario técnico en
      el ticket F4-40 (cd `PrDNIoDwRacCPQVcHmx1`). Dep: 7.4.
- [ ] 7.7 Retiro de la bandera (Artículo XII), según 0.2: a los 30 días de
      encenderla para todos y a más tardar el 2027-04-30. Queda encendida para
      todos o se elimina, junto con su rama.
- [ ] 7.8 Archivo: primero se archivan `add-bot-pedidos-whatsapp` y
      `bot-whatsapp-fase-2`, donde vive la base de `whatsapp-bot-pedidos`, con el
      visto bueno de Daniel. Después, `/opsx:archive` de este cambio. Dep: 7.6.

## Desvíos

Están en la sección «Desvíos» de `design.md`, junto con los fallos previos de la línea base (0.3 y 0.4).

---

# Ampliación 21-oct (D-518) — PENDIENTE DE APROBACIÓN (0.6)

Ninguna tarea de esta parte empieza antes de 0.6. Las marcadas **[sensible]** esperan además a 0.7 y van con diff aprobado por Daniel, una a la vez, con pruebas de caracterización antes del código. Cada prueba privada de 0.7 acompaña a la tarea que dice «revisión privada».

## 8. Repo kai (`adk_agent/channels/whatsapp`), D23

- [x] 8.1 Prueba primero (pytest): sin `capacidades`, `construir_instrucciones` devuelve exactamente el texto de hoy, y las herramientas son las mismas de hoy. El golden se toma del commit que corre en producción (no de 25ddfda: `feat/claude-agent-sdk` no está en `origin/main`). Éxito: verde contra ese commit. Dep: 0.6 y la respuesta a la pregunta 15 (rama y commit de producción).
- [x] 8.2 `adk_agent/endpoints/whatsapp_bot_endpoint.py` (≈63-140) valida y recorta los campos nuevos (`comercio.capacidades` como tres booleanos, `comercio.politicas` con tope de 1.500 caracteres por página, `cotizacionesRecientes` con tope de 3 y de largo por campo), como ya hace con `formasPago`. `pipeline.py` y la llamada a `construir_agente` los aceptan. Ausentes, se comporta igual. Prueba: cuerpos con campos de más, largos o de otro tipo se recortan o se ignoran. Éxito: 8.1 en verde. Dep: 8.1.
- [x] 8.3 Con `pedidoDirecto`:
      - reglas 3 y de cierre (`agent.py:1088-1090`, :1169), docstring de `cerrar_pedido` (:383) y `bloque_pagos` (:886-897) sin «un asesor lo confirma» ni «el pago se coordina con el asesor»;
      - «no cobras, no pides datos de tarjeta» y «no aplicas descuentos» se mantienen;
      - pasada la reserva: «armarlo otra vez» (D14).

      Prueba: golden por capacidad. Dep: 8.2.
- [x] 8.4 Con `atencion`: regla 3 (:1088-1090) con «informas el tiempo de entrega publicado, sin prometer fecha» (D17), regla 5 informativa (:1098-1101), bloque de políticas como datos, bloque de cotizaciones recientes y docstring de `pasar_a_un_asesor` (:763). Prueba: golden por capacidad, más la prueba de la revisión privada. Dep: 8.2, 0.7.
- [x] 8.5 Con `agenda`: herramienta `pedir_cita(motivo, fecha_preferida)` que solo anota `pedir_agenda`, y su salida en `pipeline.py` (:268). Prueba: la herramienta no está sin la capacidad. Dep: 8.2.
- [x] 8.6 La lista blanca MCP (`agent.py:33-48`) no cambia. Prueba que falla si aparece `get_appointments`, `get_orders` o `search_orders`. [P]
- [ ] 8.7 Commit en la rama que defina Daniel (pregunta 15). Despliegue por Daniel con `sudo systemctl restart kai-adk`, **antes** del backend: sin `capacidades` no cambia nada. Éxito: un turno real de ALMARA o FLORECER con las banderas apagadas responde igual. Dep: 8.1 a 8.6.

> Nota de avance, bloque F440-B10 (repo `wt-kai-tickets-web`, rama `feature/tickets-web`): 8.1 a 8.6 hechas y probadas con `adk_agent/tests/test_whatsapp_capacidades.py` (17 casos, sin red; no hay pytest instalado en la máquina, corre también como script). 8.1: el golden `tests/golden/whatsapp_instrucciones_base.json` se tomó del commit base de la rama (0317715), NO del que corre en producción; antes del despliegue hay que regenerarlo contra producción (instrucción en `tests/golden/_generar_whatsapp_golden.py`). 8.7 queda abierta: el commit está hecho, falta el despliegue de Daniel (`sudo systemctl restart kai-adk`, antes del backend) y la prueba real con ALMARA o FLORECER. El tono de Mi marca (pregunta 9) entra como `comercio.tono`, tope de 300 caracteres.
- [x] 8.8 Backend `services/whatsappBotClient.js` (≈33-60): manda `capacidades`, `politicas` y `cotizacionesRecientes` solo con su bandera, y lee `pedirAgenda`. Prueba: con las banderas apagadas el cuerpo enviado es idéntico al de hoy. Dep: 8.2, 5.4 y 8.7 (kai desplegado antes de que el backend mande algo nuevo).
      *Hecho (F440-B11):* `armarCuerpo(entrada, permisos)` en `whatsappBotClient.js` quita `capacidades`, `politicas`, `tono` y `cotizacionesRecientes` salvo que el despachador pase permisos (bandera de la empresa más interruptor general); igualdad profunda con permisos apagados. Lee `pedirAgenda` (objeto). `agenda` viaja siempre `false` hasta B12. `pedidoDirecto` viaja `true` solo con bandera, interruptor y modo `activo`. El despliegue de kai (8.7) sigue siendo de Daniel antes de encender nada.

## 9. Pago: enlace, confirmación y recordatorio (D10 a D14)

- [x] 9.1 Prueba primero (`whatsappBotPedidoDirecto.test.js`): `evaluar` con un cotizable en el carrito da `motivo: "cotizable"` y todo el carrito va a cotización; con cotizables de otra tienda, no. Dep: 6.1.
- [x] 9.2 Implementar D10 en `evaluar`. Éxito: 9.1 y 6.1 en verde. Dep: 9.1, 6.2.
- [ ] 9.3 Prueba primero, con el arnés de 2.1:
      - `/pagar` de un pedido del bot pendiente lleva al link vigente;
      - rechazado: genera uno nuevo sobre la misma reserva;
      - pagado: va a gracias;
      - vencido: 410;
      - revisión privada (pasarela).

      También: el bot entrega el enlace de `/pagar` en el 201 y en la repetición (D11 y D14). Éxito: falla contra 4.4. Dep: 4.4.
- [ ] 9.4 **[sensible]** D11 en `retomarPago` y en `whatsappBotPedidoDirecto` (enlace de `/pagar`), y D14 en `esRepeticion`/`repetir`. Éxito: 9.3, 2.3 y la suite del bot en verde. Dep: 9.3, 0.7.
- [ ] 9.5 Prueba primero:
      - un pedido del bot no encola `ORDER_CREATED` por WhatsApp (ni por SMS, si Daniel lo confirma en la pregunta 3), y sí el correo al comprador y el aviso al equipo;
      - un pedido de tienda normal, igual que hoy;
      - al aprobar el pago del bot se encola una `PAYMENT_APPROVED` con `whatsappBot.telefono` y `whatsappBot.lineId`, y el reintento de Wompi no encola otra;
      - el consumidor pasa el `lineId` a `sendTemplate`; sin `lineId`, la llamada queda igual que hoy;
      - con la preferencia `payment_approved` apagada, no sale (según la pregunta 2);
      - revisión privada (destinatario y origen).

      Éxito: falla contra 9.4. Dep: 2.2, 4.4.
      (F440-B07, parcial, sin marcar: escrita `tests/notifications/whatsappBotNotificaciones.test.js` con la caracterización de tienda, venta asistida y WooCommerce, el pedido del bot sin SMS ni WhatsApp de creación, el `origen` anidado sin efecto (S17), `encolarPagoAprobado` (S10, Wompi, preferencia) y el `lineId` hacia `sendTemplate`. Falta la prueba de `aplicarPagoDeTienda` y la del POST público a `crearPedido`: esperan la fila de la tienda.)
- [ ] 9.6 **[sensible]** D12 en `notificationHooks.onOrderCreated`, en `aplicarPagoDeTienda` y en `notificationQueue.sendWhatsAppNotification` (`lineId`). Éxito: 9.5, 2.2, 4.3 y `tests/notifications` sin fallos nuevos. Dep: 9.5, 0.7.
      (F440-B07, parcial, sin marcar: hecho `onOrderCreated` (omite SMS y plantilla si `origen === "whatsapp-bot"`, log `BOT_ORDER`), `sendWhatsAppNotification` (pasa `lineId`) y el helper `services/whatsappBotPagoAprobado.js` exportado y probado. Falta llamar `encolarPagoAprobado` desde `aplicarPagoDeTienda` en `controllers/sites.js`: espera la fila de la tienda.)
- [ ] 9.7 Prueba primero (D13, `whatsappBotSeguimiento.recorrer` y `recordarPagosPendientes`):
      - un pedido del bot **sin correo** a los 25 min recibe un solo texto por la conversación (marca en transacción antes de enviar) y ningún correo;
      - con correo, igual: sale el texto y no el correo;
      - si la salida falla (chat con dueño, ventana cerrada, sin saldo) y el pedido tiene correo, sale el correo una vez;
      - en la lista de no contactar: no sale el texto (revisión privada);
      - sale por la `lineId` del pedido; sin ella, por el número de siempre;
      - a los 56 min, nada; una segunda vuelta no repite;
      - con el interruptor general o la bandera apagados: ni texto ni correo para el pedido del bot, y `recordarPagosPendientes` sigue igual para la tienda (2.3 en verde);
      - `recordarPagosPendientes` salta el pedido del bot pero lo suma a `empresasPorBarrer`;
      - un pedido del bot pasado de 60 min en una tienda sin más pedidos, con `PAGO_PENDIENTE_CRON_ENABLED` apagado, se vence en la vuelta del job de sitios y devuelve existencias;
      - al pagar, `recuperadoPorKai`;
      - sin `site_events`.

      Éxito: falla contra 9.6. Dep: 2.3, 9.6, 5.4.
      (F440-B08, parcial, sin marcar: `tests/notifications/whatsappBotSeguimientoPagos.test.js` cubre texto, respaldo por correo, ventana 20-55, no repetir, llaves apagadas, barrido de reserva con doble, sin `site_events` y `marcasDePagoRecuperado`. Faltan, por esperar la fila de la tienda: que `recordarPagosPendientes` salte el pedido del bot y la prueba 2.3 con ese salto; la marca real en `aplicarPagoDeTienda`; la exportación de `vencerReservasDeTienda`.)
- [ ] 9.8 **[sensible]** D13: `services/whatsappBotSeguimiento.js` (parte del recordatorio y la reserva), su llamada en `cronService.initSitiosJob`, el salto del pedido del bot en `recordarPagosPendientes`, la exportación de `vencerReservasDeTienda` sin cambiar su lógica y la marca en `aplicarPagoDeTienda`. Éxito: 9.7 y 2.3 en verde; 6.6 ampliado con estas escrituras. Dep: 9.7, 0.7.
      (F440-B08, parcial, sin marcar: hechos `services/whatsappBotSeguimiento.js` (`recorrerPagos`, `marcasDePagoRecuperado`), su llamada en `cronService.initSitiosJob` y 6.6 ampliado. Pendiente, espera la fila de la tienda: salto en `recordarPagosPendientes`, exportar `vencerReservasDeTienda` y la marca en `aplicarPagoDeTienda`. Mientras no se exporte, la vuelta registra `reserva_barrida_no_disponible`.)
- [ ] 9.9 Prueba primero (D24), con el arnés de 2.1: la página de gracias de un pedido del bot pagado no emite la compra (`conversion` nula, sin `fbq`, `gtag` ni `ttq` de compra) y sí muestra el pago aprobado; la de un pedido de tienda pagado, igual que hoy; llegando por el regreso del núcleo, por `retomarPago` y por el redirect de «Aprobado». Éxito: falla contra el código actual. Dep: 2.1.
- [ ] 9.10 **[sensible]** D24 en `datosDeConfirmacion` y en el armado de la página de gracias. Avisarle a TX-34 (`tienda-celular-y-velocidad`, 1.6, 4.1 y 4.2) que su caracterización incluya el pedido del bot. Éxito: 9.9 y la suite de sitios sin fallos nuevos. Dep: 9.9, 0.7.

## 10. Seguimientos dentro de 24 h (D16)

- [x] 10.1 Prueba primero, funciones puras: `proximoSeguimiento(sesion, ahora)`, `puedeSeguir`:
      - ventana con al menos 1 h de margen;
      - horario del bot y Ley 2300 según la pregunta 6;
      - uno por día;
      - sin dueño humano;
      - texto armado sin datos del modelo.

      Dep: 0.6.
- [x] 10.2 Prueba primero (despachador y cron):
      - la marca `seguimiento` se escribe en la escritura del turno, con la `lineId` del turno;
      - el cron solo corre con el interruptor general y la bandera, y está siempre programado (no depende del `.env`);
      - consulta por un solo campo, de la más vieja a la más nueva;
      - con 60 sesiones ya atendidas y una pendiente nueva, la nueva sale en la primera vuelta: enviar u omitir para siempre borra `pendienteEn`, y omitir por horario lo mueve;
      - sale por la `lineId` guardada, y la ventana se mide en esa línea;
      - el seguimiento de una cotización ofrece verla y hablar con un asesor, nunca «acéptala»;
      - revisión privada (compuertas y topes);
      - los botones `seguimiento:` entran como turno o traspaso;
      - con las llaves apagadas no hay escrituras nuevas en la sesión.

      Dep: 10.1, 5.4.
- [x] 10.3 Implementar D16, etapa 1. Éxito: 10.1, 10.2 y la suite del bot en verde. Dep: 10.2, 0.7.
      (F440-B09: hecho en el backend, todo detrás de `whatsappBotFollowUp` (bandera de la empresa + interruptor general, ambos apagados). Pruebas: `tests/notifications/whatsappBotSeguimientoReglas.test.js` (10.1), `whatsappBotSeguimiento24h.test.js` (cron, marcas en el servicio de sesión y write-set) y los casos «seguimiento:» de `whatsappBotDispatcher.test.js`; suite del bot en verde. `recorrerSeguimientos` va en el mismo job de sitios que `recorrerPagos`, siempre programado. La marca viaja en `reemplazarCarrito` y `marcarCerrada` (una sola escritura, con la `lineId` del turno); `traspasarAHumano` la borra. Cotización: texto con el enlace para verla y un solo botón `seguimiento:asesor`. Etapa 2 (10.4) sigue bloqueada. Cabos: 0.7 queda a la aprobación de Daniel y los controles de S11 de los recordatorios de pago dependen de 9.7.)
- [ ] 10.4 Etapa 2 (fuera de 24 h): **bloqueada** hasta el OK de costo de Daniel (F4-40·5). Incluye el permiso en la conversación, la plantilla de marketing nueva registrada con `scripts/kapso-registrar-plantillas.js`, la Ley 2300 y el interruptor `whatsappBotFollowUpTemplates`. Se le pide a Daniel con la estimación de costo de 15.3.

## 11. Memoria y postventa informativa (D15, D17)

- [x] 11.1 Prueba primero:
      - `contextoDelContacto` con `whatsappBotAttention` trae hasta 3 cotizaciones de esa empresa: las del `phoneHash` y las que tienen ese WhatsApp en `cliente.numero_celular_whatsapp`, sin repetir;
      - sin la bandera, no consulta `cotizaciones`;
      - un fallo de lectura no tumba el turno.

      Dep: 0.6.
- [x] 11.2 Implementar la memoria (revisión privada). Éxito: 11.1 y `whatsappBotDispatcher.test.js` en verde. Dep: 11.1.
      *Hecho (F440-B11):* `services/whatsappBotMemoria.js` (`cotizacionesRecientes`) dentro de `contextoDelContacto`, mismo caché de 5 min (llave aparte con `atencion`); pruebas en `whatsappBotDispatcher.test.js`.
- [ ] 11.3 Prueba primero: el origen del contacto (`prospects` con `company ==` y `phoneNormalized ==`, solo lectura) llega a `whatsappBot.origenContacto`: de la web, solo los campos utm; de un anuncio (`anuncio` o `ultimoToque.anuncio`), el anuncio sin `ctwaClid`; sin origen, nada. `orders.campana` queda vacío y no se informa conversión. El prospecto de otra empresa con el mismo teléfono no se lee. `prospects` no se escribe (6.6). Dep: 4.1.
      *Avance (F440-B11), sin marcar:* hecha y probada la parte de lectura y formato (`leerOrigenDelContacto`, `formatearOrigen` en `whatsappBotMemoria.js`; `tests/notifications/whatsappBotMemoriaPoliticas.test.js`). Falta guardarlo en `whatsappBot.origenContacto` del pedido, que vive en el núcleo (`sites.js`): espera la fila de la tienda.
- [ ] 11.4 **[sensible]** Implementar 11.3 en las marcas del núcleo (D15) y las políticas de D17:
      - extractor de las páginas legales publicadas, que descarta las que tienen marcador de «falta»;
      - `garantia` y `tiempoEntrega` en `perfilesProducto`.

      Éxito: 11.3 y una prueba del extractor en verde. Dep: 11.3, 4.2, 0.7.
      *Avance (F440-B11), sin marcar:* hecho el extractor (`services/whatsappBotPoliticas.js`, descarta la página con `[COMPLETA:`), `perfilesProducto` con `garantia` y `tiempoEntrega` solo con `whatsappBotAttention`, y el tono de Mi marca (solo lectura); el despachador manda `comercio.politicas` y `comercio.tono`. Falta la marca de origen en el núcleo (espera la fila de la tienda) y 0.7.

## 12. Agenda desde el bot (D18)

- [x] 12.1 Prueba primero en `tests/agenda`: `reservar` con origen `opttia` nace «Solicitada», exige teléfono y no permite hoy, igual que la web. Los orígenes existentes no cambian, y la API de la Agenda sigue sin aceptar `opttia` desde el cuerpo. Dep: 0.6.
- [x] 12.2 Prueba primero (despachador):
      - `pedirAgenda` ofrece días y franjas reales con botones;
      - la franja libre reserva y confirma;
      - con la ocupada, ofrece otras;
      - la reentrega no duplica;
      - sin Agenda, traspasa;
      - revisión privada (topes y teléfono);
      - write-set: solo `appointments` y avisos.

      Dep: 12.1, 8.8.
      *Hecho (F440-B12):* `tests/notifications/whatsappBotAgenda.test.js` (14 casos) y la fila de agenda del contract test de 6.6.
- [ ] 12.3 Implementar D18 en `services/agenda/citas.js` (`esPublico`) y el despachador. `utils/agenda.js` y el front no cambian: `opttia` ya existe con su etiqueta. Éxito: 12.1, 12.2 y `npm run test:agenda` en verde; en la Agenda de FLORECER la cita del bot se ve con el origen «Opttia». Dep: 12.2, 0.7.
      *Avance (F440-B12), sin marcar:* hecho `esPublico = ["web", "opttia"]` en `citas.js`, el servicio `services/whatsappBotAgenda.js` y el cableado del despachador (botones `agenda:`, `pedirAgenda`, `capacidades.agenda`); `npm run test:agenda` y las pruebas del bot en verde. Falta la comprobación visual en FLORECER (piloto, bloqueado) y 0.7. El motivo de la cita se guarda en la sesión (`citaPedida`) porque los botones no pasan por el agente.

## 13. Atribución y métricas de KAI (D19, D20)

- [x] 13.1 Prueba primero en `tests/enVivo/ia.test.js`:
      - un pedido con `origen: "whatsapp-bot"` es `ia`;
      - un pedido cuyo `nroPedido` está en `pedidoGenerado` de una cotización del bot convertida es `ia`;
      - el de otra empresa, no;
      - la respuesta se guarda en la memoria existente del marcador, por pedido: un sí no se vuelve a consultar; un no de un pedido de menos de 24 h se vuelve a consultar pasado el reintento;
      - `writeset.contract.test.js` permite la consulta por empresa y sigue sin escrituras (revisión privada).

      Dep: 0.6.
- [x] 13.2 Implementar D19 (absorbe 6.8). Éxito: 13.1 y toda `tests/enVivo` en verde. Dep: 13.1.
      *Hecho (F440-B13):* `services/enVivo/ia.js` (origen propio sin lectura; consulta por empresa + `pedidoGenerado` + `origen`, `limit(1)`, `select("origen")`, solo para pedidos convertidos; memoria por pedido con el tope de 5.000; sí y no de más de 24 h definitivos, no reciente se reconsulta tras 60 s); `writeset.contract.test.js` admite solo esa forma de consulta. Toda `tests/enVivo` en verde.
- [ ] 13.3 Superficie de las métricas de KAI según la pregunta 13. Si Daniel elige una pantalla nueva o un bloque nuevo, va con su propia spec de UI y la regla de diseño Katuq. Dep: respuesta a la pregunta 13.

## 14. KAI en la web (D21)

- [x] 14.1 (F440-B14: `tests/sitios/asesorKai.test.js`, 7 casos nuevos) Prueba primero en `tests/sitios`:
      - `validarRespuesta` convierte en `cotizar` el `agregar` de un cotizable y nunca lo agrega;
      - el prompt lleva las políticas y no muestra estados de pedido;
      - «no inventes descuentos» sigue en el prompt.

      Dep: 0.6.
- [ ] 14.2 Implementar en `services/sites/asesorKai.js`, en `asesorKai` (`sites.js` ≈9277) y en el widget de `utils/siteHtml.js` (botón «Cotiza con un asesor», que abre el formulario de D-475). Revisión privada. Éxito: 14.1 y `scripts/test-sitios-publicacion.js` en verde. Dep: 14.1. (F440-B14, parcial, sin marcar: hecho el servicio `services/sites/asesorKai.js` —`candidatos(..., cotizables)` con `idsCotizables`, `validarRespuesta({idsCotizables})` que vuelve `cotizar` el `agregar` de un cotizable, `armarPrompt({politicas, whatsapp, idsCotizables})`, y exportadas `ACCION_COTIZAR`/`accionCotizar(id)` = `{tipo:"cotizar", id, cantidad:1}`. Falta pasar `tienda.cotizables`, políticas y WhatsApp desde `asesorKai` en `sites.js` y el botón del widget en `siteHtml.js`: espera la fila de la tienda.)
- [ ] 14.3 **[sensible]** Atribución web: la línea marcada `kai` en el carrito del navegador, `asistidoPorKai` en el checkout, y `crearPedido` lo agrega solo al evento `pedido`. Prueba primero: el golden de 2.1 no cambia salvo ese campo del evento, y el pedido queda igual. Dep: 3.1 (después de la extracción, T·2), 0.7.

## 15. Piloto, costo y encendido

- [ ] 15.1 FLORECER con un número propio de prueba (F4-40·10), conectado como línea D-437 o como número propio, con Wompi propio y la tienda publicada. Lo hace Daniel o se hace con su permiso. Bloqueo: D-437 midió el 15-oct que ningún comercio usa número propio. Lista de llaves, cada una revisada en simulación y anotada:
      - si es línea de D-437: `whatsappMultiNumero` en FLORECER y su interruptor general;
      - el bot encendido en FLORECER (hoy el bot piloto es el de ALMARA) y `WHATSAPP_BOT_ENABLED`;
      - el canal de avisos de WhatsApp aceptado (opt-in de TyC; D-437 midió que solo ALMARA lo tiene), el canal encendido, la plantilla `katuq_payment_approved_v1` habilitada y la preferencia `payment_approved` (según la pregunta 2), con `ENABLE_WHATSAPP_NOTIFICATIONS` en producción;
      - `katuq_payment_approved_v1` aprobada en el WABA de ese número. Si no lo está, registrarla con `scripts/kapso-registrar-plantillas.js` en simulación y después con permiso;
      - `serviceAgenda` y la Agenda configurada, para probar D18;
      - saldo de WhatsApp del comercio.
      `PAGO_PENDIENTE_CRON_ENABLED` ya no hace falta para el bot (D13); se anota su valor solo como dato.
- [ ] 15.2 Orden de encendido en FLORECER, cada paso anotado en la bitácora:
      - kai desplegado (8.7);
      - backend con todo apagado (7.2);
      - `whatsappBotAttention` (memoria, postventa y agenda) 3 días;
      - pedido directo según 7.3 y 7.4;
      - `whatsappBotFollowUp` 3 días.

      Cada uno con su interruptor general y su bandera.
- [ ] 15.3 Costo: con los registros de `whatsapp_usage` del piloto, estimar los mensajes por pedido y por seguimiento. Meta cobra los de servicio y utilidad desde el 1-oct-2026, según su página de precios consultada el 20-oct. Llevarle la estimación a Daniel para la etapa 2 (10.4). Dep: 15.2.

## 16. Front y cierre

- [x] 16.1 [P] `company-features.service.ts`: `whatsappBotAttention` y `whatsappBotFollowUp` (más `whatsappBotDirectOrder` de 5.2), con su dueño y su fecha de revisión. Éxito: `npm run build:prod` sin errores. Dep: 0.6.
- [ ] 16.2 Panel del hilo (D22): `GET /:phoneHash/bot` suma `pedidoCreado`, leído de `orders` (último pedido del bot de ese `phoneHash` y esa empresa), no de la sesión. Prueba primero en el router: se ve después de la reapertura y después de `devolverAlBot`; el de otra empresa no. El componente lo muestra con `cfg-aviso`, sin gradientes ni primarios prohibidos y sin clases con «p-». Revisión a 1440 y 390 px. Éxito: build de producción sin errores y conteo de gradientes y primarios del módulo sin subir. Dep: 9.4, 0.7. (F440-B15: backend con `pedidoDelBotDelHilo` en `routers/whatsappConversations.js` y prueba `tests/messaging/botPanelPedido.test.js`; panel con par aviso Katuq, sin gradientes ni primarios prohibidos. Pendiente la revisión visual a 1440 y 390 px en navegador; build de producción no corrido por regla del bloque, solo tsc sin errores en estos archivos.)
- [ ] 16.3 Repetir 0.4 completo más `tests/agenda`, `tests/enVivo` y las pruebas de kai. Éxito: sin fallos nuevos. Dep: 8 a 16.2.
- [ ] 16.4 Bitácora de D-496 en `specs/CONTRACT.md` y comentario técnico en el ticket F4-40 (cd `PrDNIoDwRacCPQVcHmx1`), sin detalles de seguridad. Dep: 16.3.
- [ ] 16.5 Retiro de `whatsappBotAttention`, `whatsappBotFollowUp` y sus interruptores generales (Artículo XII): revisión el 2027-04-30. Quedan encendidas para todos o se eliminan, junto con su rama.
