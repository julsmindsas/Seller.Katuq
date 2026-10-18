> D-497. Backend: `katuq_admin_back_firebase/functions/`. Front: `Seller.Katuq/`. Requisitos: `specs/tienda-suscripciones` (TS) y `specs/cobro-recurrente-tienda` (CR).
>
> **[S]** = módulo sensible (pagos, pedidos, consecutivos o inventario): un cambio a la vez, con su diff aprobado por Daniel antes de aplicarlo. **[P]** = paralelizable.
>
> Cada tarea lee los archivos que toca antes de editarlos y cierra con sus pruebas y el build en verde. Si el build está roto, no se avanza. Nada se despliega sin OK de Daniel.

## 0. Antes de programar (fase 0, sin código productivo)

- [ ] 0.1 Daniel confirma los valores por defecto de `design.md` (preguntas 1-12 y decisiones del diseño), aprueba `storeSubscriptions` y `storeSubscriptionCharges` y las excepciones acotadas a los Artículos VII y IX.
  - **Éxito:** respuesta anotada en `specs/CONTRACT.md` (D-497), con las excepciones; `design.md` y specs ajustados si algo cambia.
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
- [ ] 0.8 Specs delta `tienda-suscripciones` y `cobro-recurrente-tienda` aprobadas por Daniel.
  - **Éxito:** `openspec validate suscripciones-en-la-tienda` en verde; sin esta tarea no empieza el grupo 1.

## 1. Pruebas primero (rojas hasta implementar; Artículo VIII)

Cada prueba cita el requisito que cubre (TS o CR). **Dep.:** 0.1 y 0.8.

- [ ] 1.1 [P] `services/storeSubscriptions/references.js` con su prueba.
  - **Éxito:** forma `TSUS-{20hex}-{NNN}-{A}` e id del período derivado; ningún `nroPedido` posible (`ABC-000123`, `POS-…`) ni `NOTIF-`/`SUB-`/`BILL-` se reconoce (CR «Un solo cobro»).
- [ ] 1.2 [P] `schedule.js` (puro) con su prueba, reusando `addBillingPeriod` y `getBogotaDateKey` sin modificarlos.
  - **Éxito:** ancla de fin de mes y bisiestos; ventana de 5 días; reintentos el día 0, +2 y +5; un intento por día civil; período con la ventana cerrada = no cobrable; aviso a 3 o 7 días (CR «Ventana», «No se cobra lo que no se entrega»).
- [ ] 1.3 [P] Contract test de `wompiMerchant.js` con los fixtures de 0.2.
  - **Éxito:** cuerpos de `/payment_sources` y `/transactions`, firma, clasificación (incierto / 422 / 4xx técnico), entorno coherente entre llave y `testMode`, y rechazo de credenciales de plataforma.
- [ ] 1.4 Contract test del write-set como **lista de permitidos** (tabla de `design.md`), con `scripts/lib/firestoreFalsa.js`: alta, cobro, webhook y pedido.
  - **Éxito:** falla ante cualquier escritura fuera de la tabla; `products`, variantes, precios y listas de precios quedan idénticos (CR «Producto y precios intactos»).
- [ ] 1.5 Pruebas de dinero e idempotencia, cada una verificada con mutación:
  - dos corridas en paralelo hacen un POST por intento;
  - un webhook repetido deja un pedido; uno fuera de orden no baja `paid`;
  - una caída tras el POST reenvía la misma referencia, y un 422 abre alerta;
  - una caída tras `createOrder` se recupera sin segundo pedido y con el inventario descontado **exactamente una vez**;
  - `inventoryStartedAt` sin movimientos abre `alert` y no descuenta;
  - una suscripción `cancelled` o `abandoned` con intento incierto nunca reenvía la referencia;
  - un período cuya ventana cerró en pausa queda `skipped_paused` y no se cobra al reanudar;
  - un 4xx técnico abre alerta, no avisa «tarjeta rechazada» y no cuenta como rechazo.
- [ ] 1.6 Pruebas del alta y de los endpoints, públicos y del comercio.
  - **Éxito, máquina del alta:** aprobada → `active` con pedido creado por la respuesta del POST o por la consulta de estado, sin webhook; rechazada → `abandoned` sin `paymentSourceId`, y otra `idempotencyKey` cobra enseguida; pendiente → la consulta concilia; el cierre de 24 h no toca `in_flight`, `awaiting_confirmation` ni inciertos, y a las 72 h abre alerta; mismo comprador y plan → 409 `SUBSCRIPTION_EXISTS`.
  - **Éxito, códigos:** 200/202/400 (`SENSITIVE_CARD_DATA_NOT_ALLOWED`)/401/403/404/409 y el filtro por la empresa del token y del sitio.
- [ ] 1.7 Prueba de logs.
  - **Éxito:** ningún log ni respuesta contiene token, llave, correo ni teléfono.
- [ ] 1.8 Prueba de modos.
  - **Éxito:** valor ausente, vacío o desconocido = `apagado`; en `apagado` y `sombra` el alta da 403 sin llamar a Wompi y el job no hace POST; webhook y consulta del alta aplican en todos los modos.

## 2. Backend núcleo (fase 1)

- [ ] 2.1 [P] `storeSubscriptions` en `FEATURE_FLAG_NAMES` y en `COMPANY_FEATURE_FLAGS` del front, con dueño y fecha de retiro.
  - **Éxito:** las pruebas de banderas existentes siguen en verde.
- [ ] 2.2 [P] `tienda.subscriptionPlans` en `normalizarTienda` y en la fusión de `normalizarContenido`.
  - **Éxito:** un editor viejo sin el campo no lo borra; máximo 10 planes; monto entero mayor que 0; la tienda sin planes sale idéntica.
- [ ] 2.3 [S] `wompiMerchant.js`: credenciales con `getPaymentCredentials(company, 'wompi')`, solo `company-config`.
  - **Dep.:** 1.3. **Éxito:** 1.3 en verde.
- [ ] 2.4 [S] `charge.js`: `claimSignupCharge`, `claimRenewal`, enviar, clasificar y `applyResult` con el marcador `integrationEvents/wompi-transaccion-<id>`; todo `APPROVED` devuelve la orden de encadenar `periodOrder`.
  - **Dep.:** 1.2, 2.3. **Éxito:** partes de cobro de 1.5 en verde.
- [ ] 2.5 [S] Exportar `resolverClienteEnCRM` de `controllers/sites.js` sin cambiar su cuerpo.
  - **Éxito:** suites de checkout y sitios con los mismos resultados antes y después.
- [ ] 2.6 [S] `periodOrder.js`: reserva, recuperación por `storeSubscription.periodId`, armado con monto congelado y envío 0, chequeo de ±1 peso, `createOrder({skipDuplicateCheck: true})`, descuento una sola vez con `inventoryStartedAt` y avisos con `notifiedAt`.
  - **Dep.:** 2.4, 2.5. **Éxito:** 1.4 y partes de pedido de 1.5 en verde; `orderService` e `inventoryService` sin cambios.
- [ ] 2.7 [S] Webhook: `isStoreSubscriptionReference` en `utils/wompiPagoPedido.js`, la rama nueva en `procesarNotificacionWompi` (antes de «Payment Link») y `webhook.js`.
  - **Dep.:** 2.4, 2.6. **Éxito:** partes de webhook de 1.5 en verde; `tests/integrations/wompiWebhookLinkDePago.test.js` y `tests/subscriptions/subscriptionSecurity.contract.test.js` sin cambios.
- [ ] 2.8 [S] `signup.js`: la máquina de estados del alta (D3), sin rutas.
  - **Dep.:** 2.2, 2.4, 2.6. **Éxito:** 1.6 (máquina del alta) en verde con llamadas directas.
- [ ] 2.9 [S] `controllers/storeSubscriptions.js` y rutas públicas `suscripciones` y `suscripciones/:id/estado` (`bodyPublicoAcotado`, `pedidoLimiter` / `publicLimiter`).
  - **Dep.:** 2.8. **Éxito:** 1.6 (códigos del alta) y 1.8 (alta) en verde; altas solo para Premium.
- [ ] 2.10 [S] `engine.js` base y registro en `cronService.js` (6:45 COT) detrás de `CRON_ENABLED` + `STORE_SUBSCRIPTIONS_BILLING`, con `conLatido` y el resumen; los pasos aún vacíos.
  - **Dep.:** 2.4. **Éxito:** 1.8 (job) en verde; en `apagado` no corre y en `sombra` el resumen sale con ceros y cero llamadas a Wompi.
- [ ] 2.11 [S] Paso 1, conciliación (D7): consulta, reenvío solo en `cobro` y con suscripción viva, nunca en `cancelled`/`abandoned`, alertas a las 72 h.
  - **Dep.:** 2.10. **Éxito:** partes de conciliación de 1.5 en verde.
- [ ] 2.12 [S] Paso 2, terminar pedidos de los períodos con `orderPending == true`.
  - **Dep.:** 2.6, 2.10. **Éxito:** un `paid` sin pedido recibe uno solo, aunque el paso corra dos veces.
- [ ] 2.13 [S] Paso 3, cobro de vencidos y reintentos: revisiones previas (bandera, Wompi propio y entorno, producto, bodega y existencias con `getRealStockMap`), ventana, pausa, `skipped_paused`, `skipped_no_stock`, 4xx técnico y `payment_failed`.
  - **Dep.:** 2.11, 2.12. **Éxito:** 1.2 y las partes de cobro, pausa y técnico de 1.5 en verde; en `sombra`, cero POST.
- [ ] 2.14 [S] Paso 4, cierre de altas sin terminar (D3.5).
  - **Dep.:** 2.10. **Éxito:** 1.6 (cierre de 24 h y alerta de 72 h) en verde; solo cierra altas sin período 001 y borra `paymentSourceId`.
- [ ] 2.15 [P] `scripts/store-subscriptions-simulate.js`, de solo lectura y con `--dry-run` por defecto.
  - **Dep.:** 1.2. **Éxito:** su lista coincide con la del paso 3 en `sombra`.
- [ ] 2.16 Índices: exportar los vivos, sumar los 8 de `design.md` (D1) y desplegar completo, con OK de Daniel.
  - **Éxito:** todos los índices vivos siguen y ninguna consulta del job, la cuenta o el panel falla en sandbox.
- [ ] 2.17 [S] Rutas del comercio: lista, `capacidad`, detalle, cancelar (Administrador) y cuadre, antes de `router.get("/:id")`.
  - **Dep.:** 2.9. **Éxito:** 1.6 (comercio) en verde; nunca devuelve otra empresa; `capacidad` da el motivo correcto en cada caso.

## 3. Comprador (fase 2)

- [ ] 3.1 [S] Página aislada `renderPublico ?ruta=/suscribirse` (antes de la caché) y su script de tokenización (port de `wompi-card-security.utils.ts`, o el widget según 0.3), con la CSP de `design.md`.
  - **Dep.:** 2.9. **Éxito:** prueba de render sin píxeles ni scripts de terceros, `no-store` y CSP exacta; la caché de páginas no la guarda.
- [ ] 3.2 [P] `scriptSuscribir` en tarjeta y ficha («Desde $X/mes», selector de plan).
  - **Éxito:** sin planes o sin capacidad, el HTML es idéntico (prueba antes/después); navegador a 390 y 1440 px.
- [ ] 3.3 [S] Endpoints de «Mis planes»: lista y cancelar.
  - **Dep.:** 2.9. **Éxito:** solo las suscripciones del `clientCd` de la sesión; cancelar borra `paymentSourceId`, respeta `paidThrough` y no reenvía un intento incierto.
- [ ] 3.4 [S] Cambiar tarjeta: página aislada `?ruta=/mis-planes/tarjeta` y `POST …/cuenta/planes/:id/tarjeta`.
  - **Dep.:** 3.1, 3.3. **Éxito:** 409 `CHARGE_IN_PROGRESS` con un cobro en curso; en `retrying` el siguiente intento usa la fuente nueva; en `payment_failed` no reactiva.
- [ ] 3.5 [P] Sección «Mis planes» en el script de la cuenta de la tienda.
  - **Dep.:** 3.3, 3.4. **Éxito:** muestra plan, estado, próximo cobro, tarjeta e historial; la autorización de correos no cambia; navegador a 390 y 1440 px.
- [ ] 3.6 Avisos: `enviarAvisoDeSuscripcion` en `correoComprador`, plantillas en `siteCorreos` y job de avisos (8:15) con `apagado | sombra | envio`.
  - **Éxito:** marca en transacción antes de enviar; dos corridas mandan un solo correo; nada sale a suscripciones en pausa.
- [ ] 3.7 [S] Rechazos, período saltado y pago fallido: aviso al comprador por cada rechazo y por cada período saltado; campana `STORE_SUBSCRIPTION_FAILED` y correo al comercio.
  - **Dep.:** 2.13. **Éxito:** al tercer rechazo, `payment_failed` y ningún cobro más; un 4xx técnico no avisa al comprador.

## 4. Seller (fase 3)

- [ ] 4.1 [P] `StoreSubscriptionsService extends BaseService`, sin `HttpClient` en componentes.
  - **Dep.:** 2.17. **Éxito:** prueba del servicio con las rutas de 2.17; ninguna clase nueva inyecta `HttpClient`; `npm run build` sin errores.
- [ ] 4.2 Sección «Planes de suscripción» en el editor, visible según `capacidad.disponible` del backend.
  - **Dep.:** 2.2, 4.1. **Éxito:** guarda y conserva los planes; con `disponible: false` muestra el aviso con el motivo; el código no compara el nombre del proveedor.
- [ ] 4.3 `StoreSubscriptionsComponent` standalone, OnPush, con `loadComponent` en `sitios/suscripciones` (base `cfg-pagina`, D-400): estados, próximo cobro, último pago, pedidos, alertas, cancelar con confirmación y cuadre del mes. Se entra desde la lista de Sitios y el editor.
  - **Dep.:** 2.17, 4.1. **Éxito:** tabla con estados en par fuerte/suave y estado vacío; cancelar solo para Administrador; el cuadre muestra aprobados contra pedidos; `npm run build` sin errores.
- [ ] 4.4 Cierre de diseño.
  - **Éxito:** `npm run build:prod` sin errores; el conteo de gradientes y primarios prohibidos del módulo no sube; revisión a 1440 y 390 px sin scroll horizontal ni texto invisible.

## 5. Encendido (fase 4; cada paso con OK de Daniel)

- [ ] 5.1 Desplegar el backend con todo apagado.
  - **Éxito:** las suites y las pantallas existentes no cambian.
- [ ] 5.2 Desplegar el front.
  - **Éxito:** sin la bandera, el editor y Sitios se ven igual; el candado de publicación pasa sin forzar.
- [ ] 5.3 FLORECER con llaves de sandbox, bandera encendida solo para FLORECER y `STORE_SUBSCRIPTIONS_BILLING=cobro`. Recorrido: alta aprobada y rechazada con otra tarjeta; renovación forzada con una fecha de prueba; rechazo y reintento; webhook repetido; pausa y reanudación; cancelación y cambio de tarjeta.
  - **Éxito:** cobros aprobados = pedidos en el cuadre; sin alertas abiertas no explicadas.
- [ ] 5.4 `STORE_SUBSCRIPTIONS_BILLING=sombra` por 3 días con las suscripciones de sandbox.
  - **Éxito:** el resumen coincide con el simulador y hay cero POST a Wompi.
- [ ] 5.5 FLORECER en producción con monto bajo y `cobro`. Requiere 0.4 y el cambio de seguridad de 0.7 cerrado.
  - **Éxito:** alta real aprobada con su pedido, cuadre 1 = 1 y sin alertas; la primera renovación real se revisa con el resumen del job y el cuadre.
- [ ] 5.6 `STORE_SUBSCRIPTIONS_AVISOS=sombra` por 2 días; Daniel revisa y se pasa a `envio`.
  - **Éxito:** el resumen de sombra lista los avisos esperados y, ya en `envio`, sale uno por período.
- [ ] 5.7 Primer comercio real: requiere 0.4, 0.5 y 0.6, y el cambio de seguridad de 0.7 cerrado.
  - **Éxito:** primer mes con cobros aprobados = pedidos y sin alertas abiertas.
- [ ] 5.8 A los 30 días en `cobro`/`envio` sin incidentes, retirar los modos (Artículo XII). Revisar la bandera por comercio el 2027-04-30.
  - **Éxito:** variables retiradas del código y del `.env`; decisión sobre la bandera anotada en `CONTRACT.md`.
- [ ] 5.9 Registrar en la bitácora de `specs/CONTRACT.md` los commits y lo verificado, y dejar el comentario técnico en el ticket 1235.
  - **Éxito:** entrada con sello y comentario en el ticket.
