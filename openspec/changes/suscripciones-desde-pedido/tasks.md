> Fase A de suscripciones. Ticket `7OaxPVn97s3dUKpkr8OA` (se cita por cd; el 1230 también
> es F2-21).
> - Backend: `wt-back-tickets-web/functions/`. Front: `wt-front-tickets-web/`. Rama
>   `feature/tickets-web`, sin push ni despliegue sin OK de Daniel (D-518).
> - Requisitos: `specs/suscripcion-desde-pedido` (SP) y `specs/entregas-de-suscripcion` (ES).
>   Preguntas Jn y Dn: `proposal.md`.
>
> **[S]** = módulo sensible (pedidos, consecutivos o inventario): un cambio a la vez, con su
> diff aprobado por Daniel antes de aplicarlo. **[P]** = paralelizable.
> **[si Dn]** = la tarea solo se hace si la respuesta a Dn la pide.
>
> Cada tarea lee los archivos que toca antes de editarlos y cierra con sus pruebas y el
> build en verde. Con el build roto no se avanza.

## 0. Antes de programar

- [ ] 0.1 Daniel aprueba la propuesta, responde D1-D20 (o acepta los valores por defecto) y
  aprueba las excepciones acotadas a los Artículos VII y IX (`design.md`, gates).
  - **Éxito:** decisión en `specs/CONTRACT.md` (la anota quien registra la propuesta), y
    `design.md` y specs ajustados; los requisitos provisionales dejan de serlo.
- [ ] 0.2 Preguntas J1-J8 a Jairo, en el ticket `7OaxPVn97s3dUKpkr8OA` o por Daniel.
  - **Éxito:** respuestas anotadas. Si «publicarlo» significa que el comprador se suscriba
    solo, queda en la fase B (F2-43·5).
- [ ] 0.3 Specs SP y ES aprobadas por Daniel. **Éxito:** sin esta tarea no empieza el grupo 1.
- [ ] 0.4 Orden de unión T·2: F2-41 y D-496 unidos en `feature/tickets-web` antes del grupo
  3, y las citas archivo:línea de `design.md` revalidadas.
  - **Éxito:** `git log` muestra los dos cambios; si no, el grupo 3 espera.
- [ ] 0.5 Lectura de producción, solo lectura, para FLORECER y CAFE ESCOBAR:
  - flujos activos (`CONTRACT.md`: 1 flow de CAFE ESCOBAR) y que ninguno publique en Woo
    pedidos creados en Katuq;
  - qué sistema manda en el stock, qué bodegas tiene y cuál sincroniza Woo (D13);
  - si usa bodega de cumplimiento (Aliaddo) o MultiOP (D16);
  - si su consecutivo `orders` está al día contra el mayor `nroPedido` (D15);
  - política de existencias (D-362) y modo del libro de inventario por origen;
  - `formasPago`, plan y estado de la suscripción de Katuq;
  - si está en `ORDER_NOTIF_UNIFIED_COMPANIES` (`.env`, deuda frente a D-505);
  - que las reglas de Firestore niegan la lectura desde el cliente de colecciones nuevas.
  - **Éxito:** hallazgos en `design.md`. Si algo bloquea, se detiene y se le lleva a Daniel.

## 1. Caracterización, antes de tocar nada (verde con el código actual)

Fijan el comportamiento que se reutiliza; cada prueba cita su archivo y función. **Dep.:** 0.3.

- [ ] 1.0 Extender `scripts/lib/firestoreFalsa.js`: `tx.create`, campos con punto en `where`,
  `<=`, `arrayUnion` y una forma de intercalar dos transacciones. Con sus propias pruebas.
  - **Éxito:** las suites que ya usan la falsa siguen en verde.
- [ ] 1.1 [P] `orderService.createOrder`: un consecutivo por llamada; con
  `skipDuplicateCheck` no busca gemelos; cupo en la misma transacción; con el tope, lanza
  `ORDER_LIMIT_REACHED` **después** de gastar el número; con el contador desfasado repite un
  `nroPedido` existente; no aplica promociones ni toca inventario.
- [ ] 1.2 [P] `calculateOrderTotals`: precios por volumen como los de CAFE ESCOBAR (fixture
  sintético con la forma de BAR-000428), descuento global y lista por tipo de cliente con
  campaña que vence entre la fecha del base y la de la entrega (cambia el total).
- [ ] 1.3 [P] Inventario de venta asistida: `executeOrderInventoryRollout` en legado descuenta
  dos veces con dos llamadas y puede quedar a medias; en transaccional repetir no descuenta
  otra vez; un pedido con `inventoryEffect` ajeno da `TENANT_MISMATCH`.
- [ ] 1.4 [P] Inventario de la tienda: un pedido con `channel` «Tienda en línea» sin
  `channelId` por `updateStock` devuelve `success:false`; por `updateByPOS` descuenta en una
  sola transacción.
- [ ] 1.5 [P] Reserva: `vencerReservasDeTienda` y `barrerReservasDeCuotas` ignoran un pedido
  Pendiente con forma de pago manual aunque lleve `inventarioDescontadoAlCrear`.
- [ ] 1.6 [P] Pagos de la tienda: con el mismo enlace en dos pedidos, el webhook de Wompi lo
  declara ambiguo y no procesa ninguno.
- [ ] 1.7 [P] Woo: `adjustStock` fija la cantidad absoluta y pisa un descuento previo.
- [ ] 1.8 [P] Lista: un pedido sin `fechaEntrega` del día no aparece en la lista de ese día.
- [ ] 1.9 [P] `frenoPorExistencias`: sin «bloquear» no frena; omite la línea con
  `inventariable === false` en la foto.
- [ ] 1.10 [P] `notify(order, 'order_created')` es idempotente; `correoPedidoCreado` arma la
  confirmación sin `emailHtml`.
- [ ] 1.11 [P] Front: `procesarDuplicacion` limpia la lista de campos de `design.md` D4.

## 2. Contract tests primero (rojos hasta implementar; Artículo VIII)

**Dep.:** grupo 1. Cada prueba cita el requisito (SP o ES).

- [ ] 2.1 [P] `schedule.js`: las cuatro frecuencias; día 31, febrero y bisiesto; `until`,
  `count` y `none`; fechas exactas ordenadas y sin repetir; hoy o antes rechazado; topes por
  origen; «inicio 3-nov, semanal y mensual» sin correrse un día; diferencia por línea (J6).
- [ ] 2.2 [P] `template.js`, con un base de cada origen (venta asistida, tienda, tienda a
  cuotas, Woo, Kuvo y una entrega generada): borra todo lo de D4; fija `fechaEntrega` del
  pedido en `YYYY-MM-DDT05:00:00.000Z` y la de cada línea en `{day, month, year}`;
  recalcula `productoIds`; una forma de pasarela exige `paymentMethod`.
- [ ] 2.3 Write-set como **lista de permitidos** (tabla de `design.md`) en el alta, el
  trabajo, pausar, cancelar y rebasar. **Éxito:** falla ante cualquier escritura fuera de la
  tabla; `products`, variantes, precios, listas y el pedido base quedan idénticos.
- [ ] 2.4 Idempotencia, verificada con mutación: dos corridas intercaladas dan un pedido por
  fecha; caída después de crear se recupera sin otro pedido (con y sin D14); doble
  confirmación da un correo; doble `POST` del alta da una suscripción.
- [ ] 2.5 Inventario una vez, por origen: venta asistida en legado (caída con movimientos de
  todas las líneas, de algunas y de ninguna) y en transaccional (`requiresRetry`); tienda
  con `updateByPOS`, marca y barrido que no la anula; Woo con la bodega elegida.
- [ ] 2.6 Precio congelado: promoción vigente, cambio de precio y campaña vencida no cambian
  el pedido; una diferencia de más de $1 no crea y alerta.
- [ ] 2.7 Ventana: tope, suspensión y freno reintentan hasta la fecha de entrega y luego
  saltan con motivo; nunca se crea un pedido con la fecha vencida; atraso; pausa; bandera
  apagada; revisión del día anterior.
- [ ] 2.8 Pedido base anulado o eliminado pausa con alerta; producto borrado salta; producto
  inactivo crea con alerta; `nroPedido` repetido alerta.
- [ ] 2.9 Endpoints: 200/201/400 (`PAYMENT_METHOD_REQUIRED`)/401/403/404/409
  (`SUBSCRIPTION_EXISTS`); filtro por empresa; sin bandera se consulta, pausa y cancela;
  cancelar solo Administrador; POS, orígenes no cubiertos, anulados y Gratis rechazados.
- [ ] 2.10 Modos: ausente, vacío o desconocido = `apagado`; en `apagado` solo corre el paso
  de pendientes; en `sombra` no hay escrituras de períodos ni pedidos; el trabajo ignora
  `collection: card`.
- [ ] 2.11 Logs: ningún log ni respuesta de error lleva nombre, correo, teléfono ni documento.

## 3. Backend (cada [S] con su diff aprobado)

- [ ] 3.1 [P] `orderSubscriptions` en `FEATURE_FLAG_NAMES` y en `COMPANY_FEATURE_FLAGS` del
  front, con dueño y fecha de retiro; lectura de `config/feature_flags.storeSubscriptionDeliveries`.
  - **Éxito:** 2.10 parcial; las pruebas de banderas existentes siguen en verde.
- [ ] 3.2 [P] `services/storeSubscriptions/schedule.js`. **Dep.:** 2.1. **Éxito:** 2.1 en verde.
- [ ] 3.3 [P] `services/storeSubscriptions/template.js`. **Dep.:** 2.2. **Éxito:** 2.2 en verde.
- [ ] 3.4 [S] [si D14] `orderService.createOrder` acepta `options.orderRef` y lo pasa a
  `orderRepository.create`. **Éxito:** 1.1 sigue en verde; prueba nueva del id.
- [ ] 3.5 [S] [si D3 (a)] `fechaDelPedido` lee primero `fechaPrecio`, en el servidor y en su
  espejo `iva-canonico.ts`. **Éxito:** 1.2 sigue en verde; prueba nueva con `fechaPrecio`.
- [ ] 3.6 [S] [si D15] `getNextConsecutive` salta números usados, como `generateConsecutiveNumber`.
  **Éxito:** 1.1 (contador desfasado) cambia de resultado a propósito y la suite de la
  tienda sigue en verde.
- [ ] 3.7 Vista previa (`preview`, sin escrituras). **Dep.:** 3.2, 3.3. **Éxito:** 2.9 parcial.
- [ ] 3.8 Alta con `subId` determinístico y transacción. **Dep.:** 3.7. **Éxito:** 2.4 (alta).
- [ ] 3.9 Pausar, reanudar y cancelar. **Dep.:** 3.8. **Éxito:** 2.9 (acciones).
- [ ] 3.10 [si D4] Cambiar pedido base. **Dep.:** 3.8. **Éxito:** 2.3 (rebasar).
- [ ] 3.11 [S] `periodClaim.js`: reclamar, recuperar y anotar (pasos 0, 1, 2 y 8 de D5).
  **Dep.:** 3.2. **Éxito:** 2.4 sin pedido real.
- [ ] 3.12 [S] Revisar y crear (pasos 3 a 5): revisión de solo lectura, total, relectura y
  `createOrder`. **Dep.:** 3.11 (y 3.4 si D14). **Éxito:** 2.6, 2.7 y 2.8.
- [ ] 3.13 [S] Inventario por origen (paso 6). **Dep.:** 3.12. **Éxito:** 2.5; grupo 1 en verde.
- [ ] 3.14 [S] Confirmar (paso 7). **Dep.:** 3.12. **Éxito:** 2.4 (confirmación).
- [ ] 3.15 [S] `engine.js` y registro en `cronService.js` a las 6:15 COT, con `CRON_ENABLED`,
  el modo, `conLatido`, el paso de pendientes primero, la revisión del día anterior y el
  resumen. **Dep.:** 3.13, 3.14. **Éxito:** 2.7 y 2.10.
- [ ] 3.16 [S] `controllers/storeSubscriptions.js` y `routers/storeSubscriptions.js`, un
  endpoint por cambio de diff, registrados en `index.js`. **Dep.:** 3.7-3.10. **Éxito:** 2.9.
- [ ] 3.17 [P] `scripts/store-subscriptions-simulate.js`, solo lectura, `--dry-run` por defecto.
- [ ] 3.18 Índices: exportar los vivos, sumar los 4 de D1 y desplegar completo, con OK de
  Daniel. **Éxito:** ningún índice vivo se pierde.
- [ ] 3.19 Suite completa del backend contra la línea base, antes y después de cada [S].

## 4. Seller

- [ ] 4.1 [P] `StoreSubscriptionsService extends BaseService`. **Dep.:** 3.16. **Éxito:** prueba
  del servicio; ninguna clase nueva inyecta `HttpClient`.
- [ ] 4.2 Vista «Programar» de `SubscriptionScheduleDialogComponent` con vista previa
  obligatoria, forma de pago y bodega de Woo. **Dep.:** 4.1. **Éxito:** confirmar se
  deshabilita si algo cambia después de la vista previa; fechas y valor salen del servidor.
- [ ] 4.3 Vista «Estado» del diálogo con pausar, reanudar y cancelar ([si D4] cambiar pedido
  base). **Dep.:** 4.1. **Éxito:** estados en par fuerte/suave; pausa con su motivo.
- [ ] 4.4 [S] Opción «Suscripciones» en el modal (`list.component.html`) y su apertura en
  `list.component.ts`, con la bandera, deshabilitada con motivo, subtítulo «Entrega N de M»
  y su traducción ES, EN y PT. **Dep.:** 4.2, 4.3. **Éxito:** sin la bandera el modal es
  idéntico (prueba antes/después); Duplicar y las demás opciones no cambian.
- [ ] 4.5 [si D9] Pantalla `ventas/suscripciones` (`loadComponent`, `cfg-pagina`, tabla
  PrimeNG, estado vacío) y botón en Todos los pedidos. **Dep.:** 4.1. **Éxito:** sin
  ninguna de las dos banderas no aparece el botón.
- [ ] 4.6 Cierre de diseño: `npm run build:prod` sin errores; el conteo de gradientes y
  primarios prohibidos de `ventas` no sube; ninguna clase nueva con «p-»; revisión a 1440 y
  390 px sin scroll horizontal ni texto invisible.

## 5. Encendido (cada paso con OK de Daniel)

- [ ] 5.1 Desplegar el backend apagado. **Éxito:** 403 sin bandera y el trabajo no crea.
- [ ] 5.2 Desplegar el front. **Éxito:** Todos los pedidos se ve igual sin bandera; el
  candado de publicación pasa sin forzar.
- [ ] 5.3 FLORECER con la bandera y modo `sombra`, con cliente y producto de prueba, 3 días.
  **Éxito:** el resumen coincide con el simulador; cero pedidos y cero movimientos.
- [ ] 5.4 FLORECER en `crear`: entrega del día, doble corrida real (dos procesos), pausa y
  reanudación, tope simulado, cancelación, producto no inventariable, base de pasarela y
  base de la tienda. **Éxito:** un pedido por fecha, inventario una vez, una confirmación.
  Se devuelven el stock y los pedidos de prueba por el camino de siempre.
- [ ] 5.5 CAFE ESCOBAR: requiere 0.2, 0.5, D13 y el OK de Daniel; bandera solo para ella.
  **Éxito:** la primera semana se revisan con el comercio el resumen y los pedidos.
- [ ] 5.6 Retirar el modo global a los 30 días en `crear` sin incidentes, y revisar la
  bandera por comercio el 2027-04-30. **Éxito:** decisión en `CONTRACT.md`.
- [ ] 5.7 Bitácora en `specs/CONTRACT.md` con commits y lo verificado, y comentario técnico en
  el ticket `7OaxPVn97s3dUKpkr8OA`. **Éxito:** entrada con sello y comentario.
