> D-497. Backend: `katuq_admin_back_firebase/functions/`. Front: `Seller.Katuq/`. Requisitos: `specs/tienda-suscripciones` (TS) y `specs/cobro-recurrente-tienda` (CR).
>
> **[21-oct]** Se implementa en `wt-back-tickets-web/functions/` y `wt-front-tickets-web/`, rama `feature/tickets-web`, sin push ni despliegue sin OK de Daniel (D-518). Requisitos nuevos: `specs/planes-de-suscripcion` (PS) y `specs/operacion-cobro-tienda` (OC: interruptor, conciliación, observabilidad y confirmación de la pasarela, movidos de CR). Las tareas tocadas por el ajuste del 21-oct llevan **[21-oct]** y no se ejecutan hasta 0.9. Ticket F2-43: cd `UVaf50kn4UPbI358NGMk`.
>
> **[S]** = módulo sensible (pagos, pedidos, consecutivos o inventario): un cambio a la vez, con su diff aprobado por Daniel antes de aplicarlo. **[P]** = paralelizable.
>
> Cada tarea lee los archivos que toca antes de editarlos y cierra con sus pruebas y el build en verde. Si el build está roto, no se avanza. Nada se despliega sin OK de Daniel.

## 0. Antes de programar (fase 0, sin código productivo)

- [x] 0.1 Daniel confirma los valores por defecto de `design.md` (preguntas 1-12 y decisiones del diseño), aprueba `storeSubscriptions` y `storeSubscriptionCharges` y las excepciones acotadas a los Artículos VII y IX.
  - **Éxito:** respuesta anotada en `specs/CONTRACT.md` (D-497), con las excepciones; `design.md` y specs ajustados si algo cambia.
  - **Hecho el 18-oct** (aprobación en bloque de D-495 a D-503; D-518 T·3 la confirma). Falta que quien registre anote en `CONTRACT.md` la entrada de D-497 con esa fecha; este cambio no edita el contrato.
- [ ] 0.2 Con las llaves de sandbox de FLORECER: crear una fuente con las llaves del comercio, cobrar con `payment_source_id` y comparar `recurrent: true` y `false`. Anotar en `design.md` las respuestas, sin datos de tarjeta.
  - **Dep.:** llaves sandbox. **Éxito:** fixtures guardados para 1.3.
- [ ] 0.3 Revisar la documentación de Wompi y anotar el enlace de cada punto: widget de tokenización; revocación de una fuente; si el cifrado de `/tokens/cards` usa una llave por cuenta; si la fuente devuelve marca y últimos 4.
  - **Éxito:** preguntas 3 y 4 cerradas.
- [ ] 0.4 Pedir a Wompi confirmación escrita de cobro con fuente guardada para la cuenta del primer comercio.
  - **Éxito:** correo archivado. Sin él, nada pasa del sandbox.
- [ ] 0.5 Con cada comercio candidato, revisar en su panel de Wompi la URL de eventos.
  - **Éxito:** queda en su lista de activación (pregunta 12).
- [ ] 0.6 Textos de consentimiento, aviso previo, rechazo, período saltado, pago fallido y cancelación a revisión legal.
  - **Éxito:** `textVersion = 1` aprobado. Bloquea 5.7, no la construcción.
- [ ] 0.7 Abrir el cambio de seguridad en el backend privado: alta pública, páginas aisladas y rama del webhook.
  - **Éxito:** cambio creado allá. No se detalla aquí porque el repo es público.
  - **[21-oct]** Creado, pendiente de aprobación de Daniel, con la ampliación del 21-oct. Se cierra cuando Daniel lo apruebe.
- [x] 0.8 Specs delta `tienda-suscripciones` y `cobro-recurrente-tienda` aprobadas por Daniel.
  - **Éxito:** `openspec validate suscripciones-en-la-tienda` en verde; sin esta tarea no empieza el grupo 1.
  - **Aprobación hecha el 18-oct** (D-518 T·3), en su versión del 18-oct. Lo marcado **[21-oct]** en las specs lo cubre 0.9.
  - **[21-oct] Falta su criterio de éxito:** `openspec validate` no se ha corrido porque el CLI no está instalado en el equipo. Se corre en 0.9, junto con la validación del ajuste; si falla, se corrige antes del grupo 1.
- [ ] 0.9 **[21-oct]** Daniel aprueba el ajuste del 21-oct: la tabla de `proposal.md`, D9 y los puntos **[21-oct]** de `design.md`, los requisitos **[21-oct]** de TS y CR, las specs PS y OC, estas tareas y las preguntas B1-B13.
  - **Éxito:** respuestas anotadas en `CONTRACT.md` por quien registra; `openspec validate suscripciones-en-la-tienda` en verde. Sin esta tarea no empieza el grupo 1.
- [ ] 0.10 **[21-oct]** Fase A aprobada (`suscripciones-desde-pedido`, su 0.1 y 0.3), con la pregunta B13 respondida, y sus piezas comunes unidas en `feature/tickets-web`: `schedule.js` (A 3.2), `periodClaim.js` con el modo `card` (A 3.11), lectura de `config/feature_flags` (A 3.1) y router `/v1/store-subscriptions` (A 3.16). Orden T·2: F2-41 (ya unido, `c9e74ff0`) → D-496 → fase A → fase B.
  - **Éxito:** `git log` las muestra; si la fase A cambió nombres (su D8) o no aceptó el modo `card` (B13), `design.md` se ajusta antes del grupo 2.
- [ ] 0.11 **[21-oct]** Lectura de solo lectura de Baudio (pregunta B10): plan de Katuq, `integrations.wompi` activo y si Evora Cloud existe como producto y es no inventariable.
  - **Éxito:** hallazgos en `design.md`; si falta algo, el piloto del criterio es FLORECER.
- [ ] 0.12 **[21-oct]** Pregunta B12: el defecto existente de inventario de la revisión privada (SS9) se abre como cambio aparte y sensible.
  - **Éxito:** cambio creado con su medición de solo lectura; bloquea 5.5 de esta fase y, si Daniel lo aprueba así, el encendido de la fase A.

## 1. Pruebas primero (rojas hasta implementar; Artículo VIII)

Cada prueba cita el requisito que cubre (TS, CR, PS u OC). **Dep.:** 0.1 y 0.8; **[21-oct]** y 0.9.

- [ ] 1.1 [P] `services/storeSubscriptions/references.js` con su prueba.
  - **Éxito:** forma `TSUS-{20hex}-{NNN}-{A}` e id del período derivado; ningún `nroPedido` posible (`ABC-000123`, `POS-…`) ni `NOTIF-`/`SUB-`/`BILL-` se reconoce (CR «Un solo cobro»).
- [ ] 1.2 [P] `schedule.js` (puro) con su prueba, reusando `addBillingPeriod` y `getBogotaDateKey` sin modificarlos.
  - **Éxito:** ancla de fin de mes y bisiestos; ventana de 5 días; reintentos el día 0, +2 y +5; un intento por día civil; período con la ventana cerrada = no cobrable; aviso a 3 o 7 días (CR «Ventana», «No se cobra lo que no se entrega»).
  - **[21-oct]** `schedule.js` es el de la fase A (0.10): aquí solo se agregan sus casos de B en su misma prueba: `yearly` (29-feb → 28-feb), fin `none`, período 1 = día del alta, `periodIndex` como inversa exacta de `periodDate` en las cinco frecuencias, `paidThrough`, ventana semanal que termina antes del período siguiente y aviso a 1, 2, 3 o 7 días según la frecuencia (PS «Calendario»). También `siguienteFechaDeEntrega` (pura): día bloqueado, hora de corte y 14 días sin día válido (PS «Fecha de entrega»).
- [ ] 1.3 [P] Contract test de `wompiMerchant.js` con los fixtures de 0.2.
  - **Éxito:** cuerpos de `/payment_sources` y `/transactions`, firma, clasificación (incierto / 422 / 4xx técnico), entorno coherente entre llave y `testMode`, y rechazo de credenciales de plataforma.
- [ ] 1.4 Contract test del write-set como **lista de permitidos** (tabla de `design.md`), con `scripts/lib/firestoreFalsa.js`: alta, cobro, webhook y pedido.
  - **Éxito:** falla ante cualquier escritura fuera de la tabla; `products`, variantes, precios y listas de precios quedan idénticos (CR «Producto y precios intactos»).
  - **[21-oct]** La tabla incluye el cupo en `companies`; una suscripción `collection: 'manual'` no se toca.
- [ ] 1.5 Pruebas de dinero e idempotencia, cada una verificada con mutación:
  - dos corridas en paralelo hacen un POST por intento;
  - un webhook repetido deja un pedido; uno fuera de orden no baja `paid`;
  - una caída tras el POST reenvía la misma referencia, y un 422 abre alerta;
  - una caída tras `createOrder` se recupera sin segundo pedido y con el inventario descontado **exactamente una vez**;
  - `inventoryStartedAt` sin movimientos abre `alert` y no descuenta;
  - una suscripción `cancelled` o `abandoned` con intento incierto nunca reenvía la referencia;
  - un período cuya ventana cerró en pausa queda `skipped_paused` y no se cobra al reanudar;
  - un 4xx técnico abre alerta, no avisa «tarjeta rechazada» y no cuenta como rechazo;
  - **[21-oct]** un plan solo con productos no inventariables se cobra sin existencias ni bodega y su pedido no llama a `updateByPOS`;
  - **[21-oct]** sin cupo o con la empresa suspendida no hay POST; el período queda `pending` y al cerrar la ventana `skipped_limit` o `skipped_suspended`;
  - **[21-oct]** si `createOrder` lanza `ORDER_LIMIT_REACHED` o `SUBSCRIPTION_SUSPENDED` después de un `APPROVED`, el período sigue `paid` con `orderPending`, abre `order_blocked`, el paso 2 lo reintenta y no hay segundo POST;
  - **[21-oct]** un `APPROVED` aplicado por el POST, el webhook, la consulta y la conciliación avanza `nextPeriodAt` y `paidThrough` exactamente una vez; el reclamo común en modo `card` nunca cambia `status` ni `nextPeriodAt`, y suma `periodsCreated` una sola vez aunque se recupere dos veces (D1);
  - **[21-oct]** cambiar el IVA del producto después del alta no cambia el monto cobrado, el total del pedido ni su desglose (D3, D5);
  - **[21-oct]** antes de cobrar: producto de otra empresa, inactivo o marcado para cotizar, o un pedido armado cuyo total no cuadra → sin POST, período `pending` con alerta; al cerrar la ventana, `skipped_product` o `failed` (D5);
  - **[21-oct]** la fecha de entrega del pedido sigue B11 y el pedido no revisa el cupo del día.
- [ ] 1.6 Pruebas del alta y de los endpoints, públicos y del comercio.
  - **Éxito, máquina del alta:** aprobada → `active` con pedido creado por la respuesta del POST o por la consulta de estado, sin webhook; rechazada → `abandoned` sin `paymentSourceId`, y otra `idempotencyKey` cobra enseguida; pendiente → la consulta concilia; el cierre de 24 h no toca `in_flight`, `awaiting_confirmation` ni inciertos, y a las 72 h abre alerta; mismo comprador y plan → 409 `SUBSCRIPTION_EXISTS`.
  - **Éxito, códigos:** 200/202/400 (`SENSITIVE_CARD_DATA_NOT_ALLOWED`)/401/403/404/409 y el filtro por la empresa del token y del sitio.
  - **[21-oct] Elección del comprador:** frecuencia, variante o cantidad fuera del plan → 400 `INVALID_PLAN_CHOICE` sin llamar a Wompi; el monto sale de precio con IVA × cantidad aunque el cuerpo traiga otro; sin cupo o empresa suspendida → 409 `STORE_CANNOT_TAKE_ORDERS`; producto no vendible o total que no cuadra → 409 sin llamar a Wompi; rutas del comercio en `/v1/store-subscriptions`; `pause` y `resume` de una `card` → 409 `NOT_SUPPORTED_FOR_CARD` (PS «Elección del comprador»).
  - **[21-oct] Plan y ficha:** guardar un plan sobre un producto de otra empresa, inactivo o marcado para cotizar se rechaza; un alta sin sesión cuyo teléfono coincide con la ficha de otra persona no queda en esa ficha y esa persona no la ve en «Mis planes» (D3, D8; ver revisión privada).
- [ ] 1.7 Prueba de logs.
  - **Éxito:** ningún log ni respuesta contiene token, llave, correo ni teléfono.
- [ ] 1.8 Prueba de modos.
  - **Éxito:** valor ausente, vacío o desconocido = `apagado`; en `apagado` y `sombra` el alta da 403 sin llamar a Wompi y el job no hace POST; webhook y consulta del alta aplican en todos los modos.
  - **[21-oct]** Los modos se leen de `config/feature_flags` (`storeSubscriptionBilling`, `storeSubscriptionNotices`) con `modes.js`; una lectura que falla = `apagado`; ninguna variable de entorno los cambia; el trabajo de cobro ignora `collection: 'manual'`.

## 2. Backend núcleo (fase 1)

- [ ] 2.0 [P] **[21-oct]** `services/storeSubscriptions/modes.js` (las tres llaves y su lista cerrada) y `--value` en `scripts/set-interruptor-general.js` (D7), si la fase A o D-496 no los trajeron.
  - **Éxito:** 1.8 (lectura) en verde; el script simula por defecto, rechaza un valor fuera de la lista y con `--execute` escribe una sola llave e imprime el antes y el después.
- [ ] 2.1 [P] `storeSubscriptions` en `FEATURE_FLAG_NAMES` y en `COMPANY_FEATURE_FLAGS` del front, con dueño y fecha de retiro.
  - **Éxito:** las pruebas de banderas existentes siguen en verde.
- [ ] 2.2 [P] `tienda.subscriptionPlans` en `normalizarTienda` y en la fusión de `normalizarContenido`.
  - **Éxito:** un editor viejo sin el campo no lo borra; máximo 10 planes; monto entero mayor que 0; la tienda sin planes sale idéntica.
  - **[21-oct]** Forma nueva de `design.md` D8: `frequencies` (al menos una de las cinco), `variants` (solo etiquetas del producto, validadas al guardar), `maxQuantity` 1-10 y `amountCOP` por unidad (PS «Planes»).
- [ ] 2.3 [S] `wompiMerchant.js`: credenciales con `getPaymentCredentials(company, 'wompi')`, solo `company-config`.
  - **Dep.:** 1.3. **Éxito:** 1.3 en verde.
- [ ] 2.4 [S] `charge.js`: `claimSignupCharge`, `claimRenewal`, enviar, clasificar y `applyResult` con el marcador `integrationEvents/wompi-transaccion-<id>`; todo `APPROVED` devuelve la orden de encadenar `periodOrder`.
  - **Dep.:** 1.2, 2.3. **Éxito:** partes de cobro de 1.5 en verde.
- [ ] 2.5 [S] Exportar `resolverClienteEnCRM` de `controllers/sites.js` sin cambiar su cuerpo.
  - **Éxito:** suites de checkout y sitios con los mismos resultados antes y después.
- [ ] 2.6 [S] `periodOrder.js`: reserva, recuperación por `storeSubscription.periodId`, armado con monto congelado y envío 0, chequeo de ±1 peso, `createOrder({skipDuplicateCheck: true})`, descuento una sola vez con `inventoryStartedAt` y avisos con `notifiedAt`.
  - **Dep.:** 2.4, 2.5. **Éxito:** 1.4 y partes de pedido de 1.5 en verde; `orderService` e `inventoryService` sin cambios.
  - **[21-oct]** Usa `periodClaim.js` de la fase A en modo `card` para reservar, recuperar y anotar (D1), y `siteOrden.construirOrden` directo para armar, sin el núcleo de D-496, con la copia del producto que lleva el IVA congelado; variante y cantidad de `items[]`; fecha de entrega de B11; omite `updateByPOS` sin líneas inventariables; con D14 de A, `orderRef` = `sub_{periodId}`; maneja `ORDER_LIMIT_REACHED` y `SUBSCRIPTION_SUSPENDED`. **Dep.:** 0.10.
- [ ] 2.7 [S] Webhook: `isStoreSubscriptionReference` en `utils/wompiPagoPedido.js`, la rama nueva en `procesarNotificacionWompi` (antes de «Payment Link») y `webhook.js`.
  - **Dep.:** 2.4, 2.6. **Éxito:** partes de webhook de 1.5 en verde; `tests/integrations/wompiWebhookLinkDePago.test.js` y `tests/subscriptions/subscriptionSecurity.contract.test.js` sin cambios.
- [ ] 2.8 [S] `signup.js`: la máquina de estados del alta (D3), sin rutas.
  - **Dep.:** 2.2, 2.4, 2.6. **Éxito:** 1.6 (máquina del alta) en verde con llamadas directas.
- [ ] 2.9 [S] `controllers/storeSubscriptions.js` y rutas públicas `suscripciones` y `suscripciones/:id/estado` (`bodyPublicoAcotado`, `pedidoLimiter` / `publicLimiter`).
  - **Dep.:** 2.8. **Éxito:** 1.6 (códigos del alta) y 1.8 (alta) en verde; altas solo para Premium.
- [ ] 2.10 [S] `engine.js` base y registro en `cronService.js` (6:45 COT) detrás de `CRON_ENABLED` + `STORE_SUBSCRIPTIONS_BILLING`, con `conLatido` y el resumen; los pasos aún vacíos.
  - **[21-oct]** El modo sale de `config/feature_flags.storeSubscriptionBilling` (`modes.js` de la fase A), leído en cada corrida; no hay variable de entorno nueva. El job filtra `collection == 'card'`.
  - **Dep.:** 2.4. **Éxito:** 1.8 (job) en verde; en `apagado` no corre y en `sombra` el resumen sale con ceros y cero llamadas a Wompi.
- [ ] 2.11 [S] Paso 1, conciliación (D7): consulta, reenvío solo en `cobro` y con suscripción viva, nunca en `cancelled`/`abandoned`, alertas a las 72 h.
  - **Dep.:** 2.10. **Éxito:** partes de conciliación de 1.5 en verde.
- [ ] 2.12 [S] Paso 2, terminar pedidos de los períodos con `orderPending == true`.
  - **Dep.:** 2.6, 2.10. **Éxito:** un `paid` sin pedido recibe uno solo, aunque el paso corra dos veces.
- [ ] 2.13 [S] Paso 3, cobro de vencidos y reintentos: revisiones previas (bandera, Wompi propio y entorno, producto, bodega y existencias con `getRealStockMap`), ventana, pausa, `skipped_paused`, `skipped_no_stock`, 4xx técnico y `payment_failed`.
  - **[21-oct]** Las existencias y la bodega solo para líneas inventariables (F2-43·7); revisión de solo lectura del cupo y del estado de la empresa, con `skipped_limit` y `skipped_suspended` al cerrar la ventana; producto activo, de la empresa y no cotizable (`skipped_product`), y pedido armado en memoria con su total (`failed` con `price_mismatch`). El cierre de ventana avanza `nextPeriodAt` una sola vez.
  - **Dep.:** 2.11, 2.12. **Éxito:** 1.2 y las partes de cobro, pausa y técnico de 1.5 en verde; en `sombra`, cero POST.
- [ ] 2.14 [S] Paso 4, cierre de altas sin terminar (D3.5).
  - **Dep.:** 2.10. **Éxito:** 1.6 (cierre de 24 h y alerta de 72 h) en verde; solo cierra altas sin período 001 y borra `paymentSourceId`.
- [ ] 2.15 [P] `scripts/store-subscriptions-simulate.js`, de solo lectura y con `--dry-run` por defecto.
  - **Dep.:** 1.2. **Éxito:** su lista coincide con la del paso 3 en `sombra`.
- [ ] 2.16 Índices: exportar los vivos, sumar los 8 de `design.md` (D1) y desplegar completo, con OK de Daniel.
  - **[21-oct]** Con los índices de la fase A ya desplegados (su 3.18), sin duplicar `(company, createdAt)`; el de vencidos pasa a `(collection, status, nextPeriodAt)`, los de conciliación y pagados sin pedido llevan `collection` adelante, y `site_events (siteId, tipo, fecha)` solo si no existe.
  - **Éxito:** todos los índices vivos siguen y ninguna consulta del job, la cuenta o el panel falla en sandbox.
- [ ] 2.17 [S] Rutas del comercio: lista, `capacidad`, detalle, cancelar (Administrador) y cuadre, antes de `router.get("/:id")`.
  - **[21-oct]** En el router común `/v1/store-subscriptions` de la fase A (`design.md` D8): `GET /` con filtro `source`, `/capacity`, `/:id`, `POST /:id/cancel` y `/reconciliation?month=`; `pause` y `resume` responden 409 para `card`. No se toca `routers/sites.js`.
  - **Dep.:** 2.9. **Éxito:** 1.6 (comercio) en verde; nunca devuelve otra empresa; `capacidad` da el motivo correcto en cada caso.

## 3. Comprador (fase 2)

- [ ] 3.1 [S] Página aislada `renderPublico ?ruta=/suscribirse` (antes de la caché) y su script de tokenización (port de `wompi-card-security.utils.ts`, o el widget según 0.3), con la CSP de `design.md`.
  - **Dep.:** 2.9. **Éxito:** prueba de render sin píxeles ni scripts de terceros, `no-store` y CSP exacta; la caché de páginas no la guarda.
- [ ] 3.2 [P] `scriptSuscribir` en tarjeta y ficha («Desde $X/mes», selector de plan).
  - **[21-oct]** El selector pide frecuencia (solo las del plan), variante (solo las del plan) y cantidad (hasta el tope), y muestra el total por cobro y la fecha del próximo cobro calculados por el servidor; el texto «Desde» sigue `design.md` D8 (PS «Planes en la página»).
  - **Éxito:** sin planes o sin capacidad, el HTML es idéntico (prueba antes/después); navegador a 390 y 1440 px.
- [ ] 3.3 [S] Endpoints de «Mis planes»: lista y cancelar.
  - **Dep.:** 2.9. **Éxito:** solo las suscripciones del `clientCd` de la sesión; cancelar borra `paymentSourceId`, respeta `paidThrough` y no reenvía un intento incierto.
- [ ] 3.4 [S] Cambiar tarjeta: página aislada `?ruta=/mis-planes/tarjeta` y `POST …/cuenta/planes/:id/tarjeta`.
  - **Dep.:** 3.1, 3.3. **Éxito:** 409 `CHARGE_IN_PROGRESS` con un cobro en curso; en `retrying` el siguiente intento usa la fuente nueva; en `payment_failed` no reactiva.
- [ ] 3.5 [P] Sección «Mis planes» en el script de la cuenta de la tienda.
  - **Dep.:** 3.3, 3.4. **Éxito:** muestra plan, estado, próximo cobro, tarjeta e historial; la autorización de correos no cambia; navegador a 390 y 1440 px.
- [ ] 3.6 Avisos: `enviarAvisoDeSuscripcion` en `correoComprador`, plantillas en `siteCorreos` y job de avisos (8:15) con `apagado | sombra | envio`.
  - **[21-oct]** Modo en `config/feature_flags.storeSubscriptionNotices`; anticipación por frecuencia (pregunta B3).
  - **Éxito:** marca en transacción antes de enviar; dos corridas mandan un solo correo; nada sale a suscripciones en pausa.
- [ ] 3.7 [S] Rechazos, período saltado y pago fallido: aviso al comprador por cada rechazo y por cada período saltado; campana `STORE_SUBSCRIPTION_FAILED` y correo al comercio.
  - **Dep.:** 2.13. **Éxito:** al tercer rechazo, `payment_failed` y ningún cobro más; un 4xx técnico no avisa al comprador.

## 4. Seller (fase 3)

- [ ] 4.1 [P] `StoreSubscriptionsService extends BaseService`, sin `HttpClient` en componentes.
  - **Dep.:** 2.17. **Éxito:** prueba del servicio con las rutas de 2.17; ninguna clase nueva inyecta `HttpClient`; `npm run build` sin errores.
- [ ] 4.2 Sección «Planes de suscripción» en el editor, visible según `capacidad.disponible` del backend.
  - **[21-oct]** Con frecuencias, variantes del producto, cantidad máxima y precio por unidad (`design.md` D8). Ningún nombre de clase nuevo contiene «p-».
  - **Dep.:** 2.2, 4.1. **Éxito:** guarda y conserva los planes; con `disponible: false` muestra el aviso con el motivo; el código no compara el nombre del proveedor.
- [ ] 4.3 `StoreSubscriptionsComponent` standalone, OnPush, con `loadComponent` en `sitios/suscripciones` (base `cfg-pagina`, D-400): estados, próximo cobro, último pago, pedidos, alertas, cancelar con confirmación y cuadre del mes. Se entra desde la lista de Sitios y el editor.
  - **[21-oct]** No es un componente nuevo: se amplía la pantalla `ventas/suscripciones` de la fase A (su 4.5) con origen, tarjeta, último pago, cobro en curso y cuadre. El botón de Sitios y del editor abre esa ruta filtrada en «Tienda». **Dep.:** 0.10 y A 4.5.
  - **Dep.:** 2.17, 4.1. **Éxito:** tabla con estados en par fuerte/suave y estado vacío; cancelar solo para Administrador; el cuadre muestra aprobados contra pedidos; `npm run build` sin errores.
- [ ] 4.4 Cierre de diseño.
  - **Éxito:** `npm run build:prod` sin errores; el conteo de gradientes y primarios prohibidos del módulo no sube; revisión a 1440 y 390 px sin scroll horizontal ni texto invisible.

## 5. Encendido (fase 4; cada paso con OK de Daniel)

- [ ] 5.1 Desplegar el backend con todo apagado.
  - **Éxito:** las suites y las pantallas existentes no cambian.
- [ ] 5.2 Desplegar el front.
  - **Éxito:** sin la bandera, el editor y Sitios se ven igual; el candado de publicación pasa sin forzar.
- [ ] 5.3 FLORECER con llaves de sandbox, bandera encendida solo para FLORECER y `STORE_SUBSCRIPTIONS_BILLING=cobro` (**[21-oct]** `config/feature_flags.storeSubscriptionBilling = "cobro"`; se suman un plan semanal, uno con variante y cantidad 2 y uno de servicio no inventariable). Recorrido: alta aprobada y rechazada con otra tarjeta; renovación forzada con una fecha de prueba; rechazo y reintento; webhook repetido; pausa automática y reanudación (apagar y volver a encender la bandera de FLORECER; no hay pausa manual, B5); cancelación y cambio de tarjeta.
  - **Éxito:** cobros aprobados = pedidos en el cuadre; sin alertas abiertas no explicadas.
- [ ] 5.4 `STORE_SUBSCRIPTIONS_BILLING=sombra` (**[21-oct]** llave `storeSubscriptionBilling` de `config/feature_flags`) por 3 días con las suscripciones de sandbox.
  - **Éxito:** el resumen coincide con el simulador y hay cero POST a Wompi.
- [ ] 5.5 FLORECER en producción con monto bajo y `cobro`. Requiere 0.4 y el cambio de seguridad de 0.7 cerrado.
  - **Éxito:** alta real aprobada con su pedido, cuadre 1 = 1 y sin alertas; la primera renovación real se revisa con el resumen del job y el cuadre.
- [ ] 5.6 `STORE_SUBSCRIPTIONS_AVISOS=sombra` (**[21-oct]** llave `storeSubscriptionNotices`) por 2 días; Daniel revisa y se pasa a `envio`.
  - **Éxito:** el resumen de sombra lista los avisos esperados y, ya en `envio`, sale uno por período.
- [ ] 5.7 Primer comercio real: requiere 0.4, 0.5 y 0.6, y el cambio de seguridad de 0.7 cerrado.
  - **Éxito:** primer mes con cobros aprobados = pedidos y sin alertas abiertas.
- [ ] 5.8 A los 30 días en `cobro`/`envio` sin incidentes, retirar los modos (Artículo XII). Revisar la bandera por comercio el 2027-04-30.
  - **Éxito:** ~~variables retiradas del código y del `.env`~~ **[21-oct]** las dos llaves borradas de `config/feature_flags` y su lectura retirada del código; decisión sobre la bandera anotada en `CONTRACT.md`.
- [ ] 5.9 Registrar en la bitácora de `specs/CONTRACT.md` los commits y lo verificado, y dejar el comentario técnico en el ticket 1235 (**[21-oct]** cd `UVaf50kn4UPbI358NGMk`).
  - **Éxito:** entrada con sello y comentario en el ticket.
