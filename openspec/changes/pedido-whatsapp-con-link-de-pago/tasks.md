# Tasks — pedido por WhatsApp con link de pago, atendido por KAI

D-496 (ticket 1243, F4-40). Backend en `katuq_admin_back_firebase/functions`.

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
      sitios sin fallos nuevos. Dep: 2.1.
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
      - Marcas: `origen`, `whatsappPhoneHash`, vendedor KAI, `channel.name "WhatsApp"` y `whatsappBot.idempotencyKey`, sin `campana` ni `medicion`.
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
- [ ] 4.5 Prueba primero, con un pedido del bot:
      - `debeRecordar` da `{recordar:false, motivo:"pedido del bot"}`;
      - `recordarPagosPendientes` no envía correo, no llama `registrarEvento` ni marca `correosEnviados`, pero sí suma la empresa a `empresasPorBarrer`;
      - `/pagar` responde como inexistente, sin `generatePaymentLink` ni `recordatorioPago.clicEn`.
      Éxito: falla contra 4.4. Dep: 2.3, 4.2.
- [ ] 4.6 **[sensible]** Filtro en `sitePagoPendiente.debeRecordar` y
      `retomarPago` (D4). Éxito: 4.5 y 2.3 en verde. Dep: 4.5, 0.5.
- [ ] 4.7 [P] Revisar quién lee `order.vendedor.email`. Confirmar que `kai` no se
      usa como dirección y protegerlo si hace falta, como `contactoVendedor`.
      Éxito: hallazgos en «Desvíos», con prueba si hubo cambio. Dep: 0.3.

## 5. Bandera, modo e interruptor

- [ ] 5.1 [P] `whatsappBotDirectOrder` en `companyFeatureFlags.js`, con dueño y
      retiro según 0.2. Éxito: `companyFeatureFlags.test.js` en verde. Dep: 0.2.
- [ ] 5.2 [P] Front: la misma bandera en `company-features.service.ts`.
      Éxito: build de producción sin errores. Dep: 0.2.
- [ ] 5.3 [P] `bot.pedidoDirectoModo` en `whatsappCompanyConfig.js`. Prueba primero:
      un valor inválido se rechaza, ausente se lee como `sombra` y los demás campos
      no cambian. Dep: 0.2.
- [ ] 5.4 [P] `WHATSAPP_BOT_PEDIDO_DIRECTO_HABILITADO` documentada en el ejemplo de
      variables, apagada. Dep: 0.2.
- [ ] 5.5 [P] `scripts/set-bot-pedido-directo.js --company <c> --modo sombra|activo`.
      Simula por defecto; `--execute` escribe solo `bot.pedidoDirectoModo` con la
      validación de 5.3 e imprime antes y después. Prueba primero: la simulación no
      escribe y los demás campos quedan intactos. Dep: 5.3.

## 6. Servicio del bot y despachador

- [ ] 6.1 Prueba primero, `whatsappBotPedidoDirecto.test.js`, sin red:
      - `hashCarrito` y `llaveIdempotencia`;
      - `esConfirmacionCorta` y `esPideLink`: «sí», «dale», «listo», «pagar» y «link» confirman; «sí pero cambia…» no;
      - `zonaPorCiudad`: única, ambigua o ninguna;
      - `armarEntrada`: extra por nombre, «Talla: M», dedicatoria, fecha fuera de rango y extra ambiguo;
      - `evaluar`, un caso por `motivo`. Tope: con `reservaVencida`, anulado, cancelado, rechazado o con más de 60 min no cuenta; dos vigentes dan `tope_sin_pagar`;
      - `esRepeticion`: cerrada, creado, menos de 30 min y botón de la misma propuesta dan sí; a los 31 min, con otra propuesta o con las llaves apagadas, no.
      Dep: 4.2, 5.1, 5.3.
- [ ] 6.2 **[sensible]** `services/whatsappBotPedidoDirecto.js` (D5-D8).
      Éxito: 6.1 en verde. Dep: 6.1, 0.5.
- [ ] 6.3 Prueba primero, en `whatsappBotSession.test.js`:
      - `guardarPropuesta`;
      - `reclamarCreacion`: lease, y dos llamadas a la vez dan un solo `creando`;
      - `marcarPedidoCreado` con `creadoEn`;
      - `descartarPropuesta`;
      - `devolverAlBot` limpia;
      - `marcarCerrada` con `pedidoCreado`.
      Dep: 0.3.
- [ ] 6.4 Mutaciones de sesión, todas en transacción. Éxito: 6.3 en verde. Dep: 6.3.
- [ ] 6.5 Prueba primero, en `whatsappBotDispatcher.test.js`:
      - llaves apagadas: la cotización de hoy, byte a byte, y el «sí» post-cierre reabre como hoy;
      - sombra: cotización, evento `sombra` y cero escrituras en `orders`;
      - activo y elegible: propuesta sin cotización;
      - «Pagar» o «sí» escrito sin `opcionId`: pedido, link y sesión cerrada;
      - «link» a los 10 min: mismo pedido, sin reapertura; su reentrega da `ya_atendido`;
      - a los 31 min: conversación nueva con carrito vacío;
      - reentrega de Kapso durante la confirmación: `ya_atendido`;
      - propuesta vieja: propuesta nueva;
      - precio cambiado: una nueva propuesta y después traspaso;
      - link fallido: traspaso con número;
      - pasarela de plataforma: cotización;
      - «Hablar con asesor»: cotización y traspaso.
      Dep: 6.2, 6.4.
- [ ] 6.6 Prueba primero: contract test de punta a punta
      (`whatsappBotPedidoDirecto.contract.test.js`), con la lista blanca del
      diseño cerrada por 2.1 (incluye el barrido) y sin efectos de página. Cubre
      el camino directo, el pago y el cron del recordatorio. Falla con escrituras
      en `products`, precios, `preciosAsociados`, `cotizaciones`, `sites`,
      `site_events`, `prospects` o cualquier colección no listada. Éxito: falla
      contra 6.5 porque el despachador aún no crea pedidos, no por errores de
      montaje. Dep: 2.1, 4.6, 6.4.
- [ ] 6.7 **[sensible]** Despachador, en tres puntos:
      - el gancho de repetición, después de `obtenerOCrear` (≈740) y antes de la reapertura (≈753): primero `registrarTurno`, luego `repetir`;
      - la rama del cierre (≈1148);
      - el bloque de confirmación, después de la rama `opcionId` (≈940-1044) y antes de `pedirTurno` (≈1054), con la clase `pedidoDirecto` y el «sí» escrito.
      Éxito: 6.5, 6.6 y todas las pruebas del bot en verde. Dep: 6.5, 6.6, 0.5.
- [ ] 6.8 [P] Solo si Daniel la confirma en 0.2: `services/enVivo/ia.js` cuenta como
      «Vendido con Opttia» un pedido con `origen: "whatsapp-bot"` (solo lectura).
      Éxito: `tests/enVivo/writeset.contract.test.js` en verde. Dep: 4.2.

## 7. Verificación, despliegue, encendido y retiro

- [ ] 7.1 Repetir 0.4 completo. Éxito: sin fallos nuevos y build del front sin
      errores. Dep: 1.2, 4.4, 4.6, 4.7, 5.x y 6.x.
- [ ] 7.2 Commit por repo sin `git add -A`. Deploy del backend con el interruptor
      apagado y `npm run release` del front. Lo ejecuta Daniel o se hace con su
      permiso. Éxito: Daniel verifica que el pedido normal de una tienda publicada
      no cambió. Dep: 7.1.
- [ ] 7.3 FLORECER en sombra. Cada paso se anota en la bitácora con fecha y quién:
      - bandera: `set-company-feature.js`, en simulación y luego con `--execute`, por Daniel o con su permiso;
      - modo: `set-bot-pedido-directo.js --modo sombra`, en simulación y luego con `--execute`;
      - interruptor general: Daniel pone `WHATSAPP_BOT_PEDIDO_DIRECTO_HABILITADO=true` en el `.env` de producción y reinicia con `pm2 restart katuq-api` (sin sudo). El agente no edita ese archivo.
      Éxito: 3 días de eventos `sombra` con los dos totales comparados. Dep: 7.2.
- [ ] 7.4 **[sensible]** FLORECER activo, con
      `set-bot-pedido-directo.js --modo activo --execute` y el visto bueno de
      Daniel. Prueba completa: link, pago, conciliación y descuento. Un segundo
      pedido sin pagar vence a los 60 min, devuelve existencias y deja de contar
      para el tope. Sin recordatorio de la tienda ni evento del sitio. Éxito:
      aprobado por Daniel. Dep: 7.3, 0.5.
- [ ] 7.5 ALMARA FELICIDAD: 7 días en sombra y luego activo, con visto bueno de
      Daniel. Dep: 7.4.
- [ ] 7.6 Bitácora y estado de D-496 en `specs/CONTRACT.md`. Comentario técnico en
      el ticket 1243. Dep: 7.4.
- [ ] 7.7 Retiro de la bandera (Artículo XII), según 0.2: a los 30 días de
      encenderla para todos y a más tardar el 2027-04-30. Queda encendida para
      todos o se elimina, junto con su rama.
- [ ] 7.8 Archivo: primero se archivan `add-bot-pedidos-whatsapp` y
      `bot-whatsapp-fase-2`, donde vive la base de `whatsapp-bot-pedidos`, con el
      visto bueno de Daniel. Después, `/opsx:archive` de este cambio. Dep: 7.6.

## Desvíos

Están en la sección «Desvíos» de `design.md`, junto con los fallos previos de la línea base (0.3 y 0.4).
