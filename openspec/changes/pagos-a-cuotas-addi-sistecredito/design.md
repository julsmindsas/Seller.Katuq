# Diseño: pago a cuotas con Addi y Sistecrédito en la tienda en línea

> D-517 (propuesta). Backend: `katuq_admin_back_firebase/functions/`. Front: `Seller.Katuq/`.

## Context

El cobro de la tienda vive en `controllers/sites.js`:
- `crearPedido` crea el pedido.
- `guardarEnlaceDePago` deja `pagoTienda`.
- `procesarPagoTiendaDesdeEvento` y `aplicarPagoDeTienda` aplican el pago.
- `vencerReservasDeTienda` (D-206) anula los pedidos sin pagar.
- `retomarPago` atiende `/pagar` y `conciliarAlVolver` atiende `/gracias`.

La capa `services/paymentGateway` (Strategy: `_baseProvider`, `wompiProvider`,
`epaycoProvider`) resuelve el proveedor con respaldo en el Wompi de la plataforma. Las
credenciales del comercio van en `integration_configs` / `integration_secrets`
(`IntegrationConfigService`, cifradas). Las banderas por comercio van en
`services/companyFeatureFlags.js` (catálogo cerrado, con dueño y fecha de retiro).

## Proveedores: lo verificado el 2026-10-20

### Addi (fuentes oficiales)
- **Fuentes:**
  - Guía `https://support.addi.com/custom-integrations`.
  - OpenAPI de auth en `https://api-docs.addi-staging.com/auth/`.
  - OpenAPI de integración en `https://api-docs.addi-staging.com/integration/` (copia en
    `referencias/addi-openapi-integracion.json`).
  - Plugin oficial de WooCommerce `buy-now-pay-later-addi` 2.1.1.
- **Hosts:**
  - Auth: `auth.addi-staging.com` / `auth.addi.com`.
  - API: `api.addi-staging.com` / `api.addi.com`.
  - Configuración pública: `channels-public-api.addi.com`.
- **Token:** `POST {auth}/oauth/token` con `client_credentials`.
  - El `audience` es `https://api.staging.addi.com` en staging y `https://api.addi.com` en
    producción.
  - Addi recomienda pedir un token por intento: no hay caché de token (regla «sin caché
    extra»).
- **Crear el intento:** `POST {api}/v1/online-applications` con Bearer.
  - Los montos van como cadena con punto decimal y la moneda es `COP`.
  - El cliente lleva `idType: "CC"`, `idNumber`, nombres, correo, `cellphone` y
    `cellphoneCountryCode` `+57`, y `address{lineOne, city, country}`.
  - También van `items[]`, `shippingAmount` y
    `allyUrlRedirection{callbackUrl, redirectionUrl, logoUrl}`.
  - Responde **301 sin cuerpo** con la URL en el header `Location`: no hay que seguir
    redirecciones.
  - **409:** el cliente ya tiene crédito.
  - **5xx:** se puede reintentar (es idempotente).
  - El `orderId` es **único por intento**.
- **Callback:** `POST callbackUrl` con Basic Auth.
  - Cuerpo: `{orderId, applicationId, approvedAmount, currency, status, statusTimestamp}`.
  - `status` ∈ `APPROVED | PENDING | REJECTED | ABANDONED | DECLINED | INTERNAL_ERROR`.
  - Espera **200 con el mismo JSON**.
  - Reintenta cada 30 minutos durante 24 h. La decisión tarda de 20 s a 10 min y la
    solicitud vence a las 2 h.
  - Las credenciales Basic salen del portal de aliados, en «Credenciales de
    notificación». El plugin las baja de un endpoint no documentado; aquí se piden en el
    formulario.
- **Configuración por comercio:** `GET channels-public-api.addi.com/allies/{allySlug}/config?requestedamount=N`
  es público y devuelve `minAmount`, `maxAmount`, `isActiveAlly` y `policy`.
- **Cancelación:** `POST {api}/v1/online-applications/cancellations` con `{orderId, amount}`.
  Admite una sola por transacción. Fuera de alcance en esta fase.
- **No hay endpoint documentado de consulta de estado.** El resultado llega solo por el
  callback.

### Sistecrédito (sin documentación pública)
- **Fuentes:**
  - Integraciones públicas que citan las guías de aliados G-ALI-08/09/10/12:
    `cy-perez/tecnosport` (ADR-0048 y `SistecreditoClient.java`),
    `JaraAlvarez/sistemaPost` (`SistecreditoHttpGateway.cs`) y
    `jferjfer/E-comerce` (`sistecredito.js`).
  - Documentación de VTEX y la página de aliados.
  - **Todo se valida con las guías oficiales del convenio antes de programar (tarea 0.3).**
- **Host:** `https://api.credinet.co/pay`.
- **Cabeceras:** `Ocp-Apim-Subscription-Key`, `ApplicationKey`, `ApplicationToken`,
  `SCOrigen: Staging|Production`, `SCLocation` y `country: co`.
- **Crear:** `POST /create` con `{invoice, description, paymentMethod{paymentMethodId:2,…}, currency:"COP", value:<entero>, urlResponse, urlConfirmation, methodConfirmation:"POST", client{docType, document, …}}`.
  - Responde `{errorCode (0 = ok), data{_id, transactionStatus, paymentMethodResponse{paymentRedirectUrl}}}`.
  - La URL casi nunca viene al crear: hay que consultar
    `GET /GetTransactionResponse?transactionId=<_id>` hasta que aparezca. Es de un solo
    uso y la transacción vive unos 15 minutos.
- **Notificación:** POST o GET a `urlConfirmation`, sin firma.
  - En la práctica llega duplicada y triplicada, a veces en PascalCase y a veces sin
    factura ni estado.
  - La guía G-ALI-08 propone validarla consultando la transacción.
  - Las anulaciones hechas en el portal no notifican.
- **Estados:**
  - En curso: `Started`, `PendingForPaymentMethod`, `Pending`.
  - Éxito: `Approved`.
  - Fallo: `Rejected`, `Cancelled`, `Expired`, `Abandoned`, `Failed`.
- **Errores relevantes:**
  - 738: factura repetida con una transacción activa.
  - 739: no disponible para el cliente.
  - 801: el cliente tiene una solicitud en curso.
  - 802: monto menor al mínimo.
  - 685, 690, 691 y 694: credenciales.
- **Lo que no tiene:** sandbox real (hay un campo `sandbox{isActive, status}` que simula
  el resultado), API de anulación, simulador de cuotas y monto máximo público. El mínimo
  depende de cada comercio.

## Goals / Non-Goals

**Goals:**
- Pagar a cuotas en la tienda con la cuenta de cada comercio.
- Confirmar el pago sin confiar en el navegador ni en el contenido de la notificación.
- Que Wompi, contra entrega y las formas manuales queden exactamente igual.

**Non-Goals:** los listados en `proposal.md` (otros canales, cuota calculada por Katuq,
logos sin kit de marca, cancelación automática, recordatorio, marketplace).

## Decisions

1. **Proveedores en la capa de pasarelas, con resolución estricta.**
   - `providers/addiProvider.js` y `providers/sistecreditoProvider.js` implementan una
     interfaz de «crédito redirigido»:
     - `iniciarIntento(pedido, comprador, urls)` → `{referencia, transaccionId?, url | pendienteUrl}`;
     - `consultarIntento(intento)` → estado normalizado;
     - `autenticarNotificacion(req, credenciales)`;
     - `mapStatusToInternal`;
     - `rangoPermitido(total)`.
   - Una función nueva, `getStrictProvider(company, 'addi'|'sistecredito')`, solo devuelve
     un proveedor si el comercio lo tiene activo. **Nunca cae a la plataforma**; si no
     está activo, lanza `PROVEEDOR_NO_CONFIGURADO`.
   - `getPaymentCredentials` y `PROVIDER_PRIORITY` no cambian, así que Wompi y ePayco
     siguen igual.
   - *Alternativa descartada:* agregarlos a `PROVIDER_PRIORITY`. Haría que un comercio
     con Addi y sin Wompi cobrara el pago en línea con Addi.
2. **Credenciales:** dos entradas nuevas en `PROVIDER_SCHEMAS`.
   - `addi`: `{clientId, clientSecret, allySlug, callbackUser, callbackPassword, environment}`.
     Son sensibles `clientSecret` y `callbackPassword`.
   - `sistecredito`: `{subscriptionKey, applicationKey, applicationToken, environment, minAmount}`.
     Son sensibles `subscriptionKey` y `applicationToken`.
   - Los dos aceptan además las reglas del comercio (decisión 17): `montoMinimo`,
     `montoMaximo` y `categoriasPermitidas`. No son secretas: vuelven al Seller.
   - `environment` ∈ `staging | production`.
   - «Probar conexión»:
     - Addi: pide un token y consulta la configuración del `allySlug`.
     - Sistecrédito: consulta un `transactionId` inexistente y espera el error 708, no
       uno de credenciales. **Este comportamiento se confirma con la guía en la tarea 0.3.**
3. **Familia de pago `credito:<proveedor>`.**
   - `crearPedido` acepta `metodoPago = "credito:addi" | "credito:sistecredito"`, validado
     contra `tienda.pagoCuotas` y la bandera.
   - El pedido sale con `formaDePago` «Addi» o «Sistecrédito» y
     `pagoTienda.proveedor`.
   - El navegador no decide el proveedor más allá de elegir entre los que el servidor
     habilitó.
   - El total y el rango se recalculan en el servidor con el total FINAL (envío, cupón y
     promociones ya sumados), en `pagoCuotas.evaluarMedio`: rango del proveedor (Addi
     consulta su configuración pública, una llamada por pedido; Sistecrédito usa
     `minAmount`), endurecido con las reglas del comercio y sus categorías. Errores:
     `400 CUOTAS_FUERA_DE_RANGO` y `400 CUOTAS_CATEGORIA`, sin crear el pedido.
   - Datos del comprador (`validarComprador`): nombre con apellido, correo, celular,
     ciudad, dirección y cédula; sin factura a empresa. Ciudad y dirección también con
     retiro en tienda, porque el proveedor estudia el crédito con ellas.
4. **Referencia de intento.**
   - Formato: `CUO-<nroPedido>-<n>-<6 aleatorios base32>`.
   - El prefijo `CUO-` es nuevo y no choca con `SUB-` ni `NOTIF-`
     (`PREFIJOS_DE_COBRO_DE_KATUQ`).
   - Para Addi es el `orderId`; para Sistecrédito es el `invoice`. Hay que confirmar el
     largo máximo de la factura en G-ALI-09 (el error 602 es «factura demasiado larga»).
   - Se guarda en `pagoTienda.linkIds` (arrayUnion) y en
     `pagoTienda.intentos[] = {referencia, proveedor, transaccionId?, estado, creadoEn, actualizadoEn, montoAprobado?}`.
   - El pedido se ubica con `buscarPedidoPorLinkDePago`, que ya rechaza una referencia
     que aparezca en dos pedidos.
   - En Sistecrédito, el `_id` de la transacción también va a `linkIds`, por las
     notificaciones que no traen factura.
5. **Rutas públicas de notificación.**
   - `POST /v1/sites/public/pago/addi` y `POST|GET /v1/sites/public/pago/sistecredito`.
   - Pasan por el limitador existente de webhooks públicos y guardan el crudo en
     `integrationRawEvents` antes de validar (Art. V).
   - **Addi:** ubicar el pedido → cargar las credenciales del comercio →
     `timingSafeEqual` sobre Basic → validar `orderId ∈ intentos`, `currency`, y
     `approvedAmount = total` cuando el estado es APPROVED → aplicar → responder 200 con
     el mismo cuerpo. Sin auth válida responde 401.
   - **Sistecrédito:** extraer `_id` o factura (camelCase o PascalCase) → ubicar →
     `consultarIntento` con las llaves del comercio → comparar `_id`, factura y valor →
     aplicar → responder siempre 200.
   - **Excepción al Art. X** (no hay HMAC). Se registra en D-517 con estos controles
     compensatorios. Los detalles de seguridad que no deben quedar en este repo público
     van al openspec privado del backend (tarea 0.6).
6. **Aplicación del pago:** `aplicarPagoDeTienda(doc, {id: referencia}, estadoInterno, origen)`
   sin cambios de fondo.
   - Antes, una transacción actualiza el intento en `pagoTienda.intentos`.
   - Un rechazo solo marca el intento; el pedido sigue Pendiente para reintentar.
   - La regla actual («un aprobado solo lo cambia su misma transacción») protege contra
     un rechazo tardío de otro intento.
7. **Inicio de Sistecrédito sin bloquear al comprador.**
   - Se crea la transacción y se consulta hasta 10 s (cada 1 s) esperando
     `paymentRedirectUrl`.
   - Si no aparece, el checkout recibe `pendienteUrl` y consulta
     `GET /v1/sites/public/:slug/pago/:referencia/url` (con limitador) hasta 60 s.
     Después ofrece reintentar.
8. **Reserva y vencimiento (D-206).**
   - `vencerReservasDeTienda` incluye `formaDePago ∈ {"Pago en línea", "Addi", "Sistecrédito"}`
     (`pagoCuotas.esperaPagoDePasarela`), con un minuto límite por proveedor: Wompi 60,
     Sistecrédito 60 y Addi 150 desde el último intento. **Tope:** la reserva de un
     pedido a cuotas nunca pasa de `TOPE_RESERVA_VECES` (2) reservas desde su creación
     (`venceReservaEn`): reintentar no aparta la mercancía sin fin.
   - Antes de anular un pedido de Sistecrédito se consulta CADA intento sin resultado
     (`consultarAntesDeAnular`), no solo el último. Si uno aprobó, no se anula.
   - **Quién dispara el barrido** (corrección D-518, error 1): además de la creación de
     un pedido y del recordatorio de pago (`recordarPagosPendientes`, que ahora también
     elige empresas con pedidos a cuotas vencidos), el cron de sitios corre
     `barrerReservasDeCuotas` cada 5 minutos. Busca la marca `pagoTienda.reservaCuotas`
     (una igualdad, sin índice compuesto), barre por el MISMO `vencerReservasDeTienda`
     (mismo write-set y freno de 10 minutos) y quita la marca de los pedidos pagados,
     anulados o vencidos. No depende del candado del recordatorio
     (`PAGO_PENDIENTE_CRON_ENABLED`). La marca nace con el pedido en `crearPedido`
     (revisión del 21-oct): si el primer intento no alcanza a registrarse, el pedido
     igual vence.
   - **Anulación en transacción (revisión del 21-oct).** Un pedido a cuotas vencido
     no se anula con la foto de la consulta (que ya era así para Wompi, D-206):
     `anularReservaDeCuotas` lo vuelve a leer en transacción, exige que siga sin
     pago, sin vencer y abierto, y ahí mismo lo marca Anulado con
     `pagoTienda.devolucionReserva: "pendiente"`; después devuelve la mercancía
     (`restoreStock`) y `terminarDevolucionDeCuotas` cierra la marca (`hecha`).
     Si el pago entra entre la marca y el cierre, `aplicarPagoDeTienda` revive el
     pedido SIN descontar (ve "pendiente") y el barrido descuenta una vez al
     terminar. Si la devolución falla, el pedido vuelve a quedar apartado
     (`fallida`) y el siguiente barrido reintenta; una devolución que quedó a
     medias por una caída se retoma a los 5 minutos. El camino de Wompi no cambia
     (golden idéntico): su ventana es la misma de siempre y queda como riesgo
     conocido.
   - **Sensible:** un cambio con diff aprobado.
9. **`/pagar` y `/gracias`.**
   - `retomarPago`, pedido a cuotas (corrección D-518, error 3, y F2-41·5):
     - Reserva vencida por tiempo y sin solicitud viva: 410, como un pedido vencido.
     - Sin `medio` (o `medio=cuotas`): el proveedor del pedido. Si hay un **intento
       vivo** (`intentoVivo`: Pendiente dentro de la vida de la solicitud, Addi 120 min y
       Sistecrédito 15; Iniciando, solo 2 min), lleva a ESE intento y no corre la reserva. La
       revisión va dentro de la transacción de `iniciarIntento`: dos clics a la vez
       abren una sola solicitud. Máximo `MAX_INTENTOS` (5) por pedido (409).
     - Revisión del 21-oct, también dentro de esa transacción: no se abre un
       crédito con un **enlace de Wompi vigente** del pedido
       (`enlaceDePasarelaVigente`: `linkId`, `url` y `venceEn` de 24 h), porque un
       PSE pendiente no cambia el pedido y serían dos cobros (409, con «Seguir con
       tarjeta, PSE o Nequi»); ni una solicitud que no quepa en lo que le queda a
       la reserva (`SIN_TIEMPO`: Addi necesita 120 min); ni sobre un pedido pagado
       o vencido. El intento guarda su vencimiento en `pagoTienda.cuotasVenceEn`;
       `pagoTienda.venceEn` es solo del enlace de Wompi. Con la reserva vencida,
       `/pagar` responde 410 aunque quede una solicitud viva.
     - `medio=linea`: Wompi sobre el MISMO pedido y la MISMA reserva, solo si la tienda
       cobra en línea y no hay una solicitud viva (409 si no). Con Sistecrédito,
       además, se consulta cada intento sin resultado (`revisarAntesDeCambiarDeMedio`),
       porque su vida de 15 min no es oficial: si uno aprobó, va a gracias; si sigue
       en curso o no se pudo confirmar, 409. Queda
       `pagoTienda.cambioDeMedio`; `formaDePago` sigue siendo la del proveedor (y con
       ella su reserva) hasta que Wompi apruebe: entonces `aplicarPagoDeTienda` la pasa
       a «Pago en línea» y guarda `formaDePagoInicial`. Sin `medio`, `/pagar` sigue con
       el último medio elegido.
   - `/gracias`:
     - Sistecrédito: consulta el último intento antes de pintar.
     - Addi no tiene consulta: `datosDeConfirmacion` entrega `esperaCuotas`
       (`{proveedor, nombre, referencia, estado, mensaje}`; «Esperando la respuesta de
       Addi» mientras la solicitud vive, «Addi no aprobó el pago» si se rechazó) y
       `GET /public/:slug/pago-cuotas/:referencia/url` devuelve `{url, estado, pagado}`
       para que la página pregunte. Pintarlo es de la vitrina.
     - Wompi sobre un pedido a cuotas (`medio=linea`) también se concilia al volver
       (por el `linkId` del enlace, no por el último medio elegido), y la página no
       muestra el rechazo del crédito sino el «pago en proceso» de Wompi.
   - El recordatorio de Wompi (`sitePagoPendiente`) excluye estos pedidos; su aviso es
     el correo de rechazo (decisión 18).
10. **Conciliación de Sistecrédito.** Va dentro del cron de sitios, que corre cada 5
    minutos.
    - Su interruptor es `config/feature_flags.pagoCuotasConciliacion`, en Firestore
      (D-505, nada en el `.env`).
    - Revisa los pedidos con la marca `pagoTienda.conciliarSistecredito` (la pone el
      intento al recibir su transacción). Un pedido ya anulado por vencimiento se sigue
      consultando durante la hora de gracia (`GRACIA_CONCILIACION_MINUTOS`, 60), para
      revivir un crédito aprobado tarde (corrección D-518, error 4: antes se descartaba
      antes de aplicar la gracia). Pasada la gracia, o sin intentos por consultar, se
      quita la marca: los pedidos viejos no se acumulan en la consulta.
    - Un pedido YA pagado (con Wompi desde `/pagar` u otro intento) con intentos de
      Sistecrédito sin resultado se sigue consultando durante la reserva de
      Sistecrédito más la hora de gracia, contadas desde cada intento: si uno
      aprueba sin avisar, queda la alerta `doble_aprobacion` (revisión del 21-oct).
    - Antes de una anulación por vencimiento, el barrido hace una última consulta
      (decisión 8).
    - *Desvío de la implementación:* no usa *lease*. Dos instancias solo repiten
      consultas, porque aplicar el resultado es idempotente, y así no hace falta una
      colección nueva de candados.
11. **Configuración de la tienda.**
    - `tienda.pagoCuotas = {addi: boolean, sistecredito: boolean}`, normalizado en
      `utils/siteBlocks.js` y apagado por omisión.
    - `GET /v1/sites/venta-config` agrega
      `cuotas: {addi: {configurada, entorno}, sistecredito: {configurada, entorno}}`.
12. **Front (Angular 14).**
    - Tarjetas en `integrations-directorio.ts`, grupo `cobrar`, con
      `bandera: 'storeInstallmentPayments'`.
    - Formularios siguiendo el patrón de `createWompiForm` (HTTP por `IntegrationsService`,
      que ya extiende el patrón de servicio).
    - Interruptores en «Cómo te pagan», con el aviso si el proveedor no está conectado.
    - Bloque «Pago a cuotas» en el detalle del pedido.
    - Tokens de `design-system/spec.md`.
    - **Excepción acotada al Art. IX:** signals y control flow nativo no existen en
      Angular 14. Se usan OnPush y `*ngIf`, como el resto del módulo.
13. **Bandera** `storeInstallmentPayments`. Dueño: Daniel. Se revisa el 2027-04-30:
    queda encendida para todos o se elimina, con la tarea de retiro incluida (Art. XII).
14. **Credenciales de pruebas.** Solo valen en las empresas de
    `config/feature_flags.pagoCuotasEmpresasDePrueba` (Firestore, D-505). En cualquier
    otra tienda un medio con credenciales de staging no se muestra, porque un crédito de
    pruebas «aprobado» no trae dinero.
15. **Estados terminados.** Un intento terminado solo puede pasar a Aprobado: si el
    proveedor confirma el pago después de un rechazo, manda la confirmación. El rechazo de
    un intento nunca cambia un pedido ya aprobado.
16. **Evento crudo sin secretos.** Se guarda sin la cabecera `Authorization` y con los
    campos personales del cuerpo ocultos (Art. XI).
17. **Reglas del comercio (D-518, F2-41·4).** En la configuración de cada proveedor
    (`integration_configs`, D-505): `montoMinimo` y `montoMaximo` en pesos y
    `categoriasPermitidas`, rutas desde la raíz del árbol de categorías
    («Tecnología > Audio», hasta 50).
    - Rango efectivo (`rangoConReglas`): el mayor de los mínimos y el menor de los
      máximos. El comercio solo puede ser más estricto que el proveedor.
    - Categorías (`productoEnCategorias`): una permitida incluye todas sus
      subcategorías. Con la ruta en el nodo del producto se compara la ruta; sin ella,
      la hoja de `categoriasIndex` contra las permitidas y sus descendientes en el árbol
      del comercio (`categorias.categoria`, identidad por nombre, D-148). Un producto
      sin categoría queda fuera si el comercio limitó las categorías.
    - Carrito mixto: si un producto queda fuera, el medio no se ofrece para ese
      carrito (`motivo: "categoria"`, con los productos fuera).
    - Se aplica al ofrecer (`GET /public/:slug/pago-cuotas?total=&ids=`, que sin `ids`
      y con categorías limitadas no ofrece el medio) y en `crearPedido`.
18. **Aviso de rechazo (D-518, F2-41·5).** Cuando el proveedor rechaza el ÚLTIMO
    intento y el pedido sigue apartado, `avisarRechazoDeCuotas` manda el correo
    `pago_pendiente` con `rechazado` y `cuotas`: botón «Intentar de nuevo con Addi»
    (`/pagar?…&medio=cuotas`) y, si la tienda cobra en línea, «Pagar con tarjeta, PSE o
    Nequi» (`medio=linea`), con la hora límite de la reserva. Sale una vez por pedido
    (marca `correosEnviados.pago_pendiente`) y el comercio lo apaga con el interruptor
    del recordatorio de pago. El rechazo de un intento viejo no escribe. Un pago a
    cuotas que entra después no cuenta como venta recuperada por el recordatorio
    (`recuperadoPorRecordatorio`), y la página de gracias sin firma solo promete el
    correo si salió.
19. **Doble aprobación.** Si llega la aprobación de otro intento (o de otro medio) para
    un pedido ya pagado, `aplicarPagoDeTienda` no la aplica (idempotencia) y queda la
    alerta `doble_aprobacion` en `pagoTienda.alertas`, con la referencia y con qué se
    pagó; el intento queda `duplicado: true`. El comercio anula el crédito sobrante en
    el portal del proveedor: el bloque «Pago a cuotas» del detalle del pedido le
    muestra la alerta y dónde anular, también si el comprador terminó en Wompi.

20. **Widget oficial de Addi (D-518, F2-41·2).**
    - **Fuentes públicas (leídas el 2026-10-21, solo lectura):**
      - Plugin oficial de Addi para WooCommerce, `buy-now-pay-later-addi` 2.1.1
        (https://wordpress.org/plugins/buy-now-pay-later-addi/): `addi-gateway.php`
        escribe en la ficha `<addi-product-widget country="co" price="…" ally-slug="…"
        custom-widget-styles="…">` y carga
        `https://s3.amazonaws.com/statics.addi.com/woocommerce/woocommerce-widget-wrapper-new.bundle.min.js`
        (`…-stag.min.js` en pruebas). Ese envoltorio solo inyecta, como módulo,
        `https://cdn.addi.com/product-details-widget/prod/v1/product-details-widget.esm.js`
        (los dos, también el de pruebas, cargan el de producción).
      - Ese módulo (Stencil) define `addi-product-widget` con `price`, `ally-slug` y
        `country`; consulta `https://channels-public-api.addi.com/allies/{slug}/config?requestedAmount=`
        (la misma configuración pública que ya usa `rangoPermitido`), `stores-health.addi.com`
        y Split.io, saca imágenes de `statics.addi.com` y abre el detalle en un marco de
        `embedded.addi.com` / `preapproval.addi.com`. La cuota la calcula Addi.
      El plugin solo lo pinta en la FICHA; usarlo en el carrito con el total no
      tiene documentación de Addi (se pide su visto bueno en la tarea 0.2).
      - Guía de WooCommerce de Addi (https://support.addi.com/woocommerce-integrations,
        paso 7.6: el widget es opcional) y manual de Shopify de Addi (PDF de su portal de
        aliados): en Shopify el script del widget es único por aliado y se pide a
        activacion.aliados@addi.com. **No hay documentación pública del componente para
        plataformas propias**: confirmar con Addi la versión vigente (tarea 0.2).
    - **Cómo se usa:** se carga el MISMO módulo directo de `cdn.addi.com`, sin el
      envoltorio de WooCommerce: el envoltorio vive en `s3.amazonaws.com` (permitirlo
      abriría todo S3 en `script-src`) y depende de jQuery, que la tienda no carga.
      `<addi-product-widget>` va en la ficha (precio del producto; sigue el precio al
      cambiar de variante) y en el carrito (total). El módulo se pide solo cuando hay
      un widget en la página.
    - **Cuándo:** bandera `storeInstallmentPayments`, Addi encendido en la tienda y
      activo en PRODUCCIÓN (con un `allySlug` válido). Con credenciales de pruebas no
      sale: el widget consulta la configuración de producción.
    - **Política de la página (CSP):** el mecanismo de terceros que ya usa el sitio
      (`siteHtml.medicion` → `script-src`/`connect-src` por sitio) suma
      `siteHtml.cspCuotas`: `script-src https://cdn.addi.com`, `connect-src` de Addi y
      `frame-src` de Addi, SOLO en los sitios que muestran el widget. Los demás
      comercios no cambian. **Split.io no se abre** (revisión del 21-oct): el
      componente le pide sus banderas internas, pero D-518 aprobó abrir «su dominio»,
      el de Addi; si en 4.3 el widget no funciona sin Split.io, decide Daniel. Riesgo
      conocido: el componente inserta un `<style>` de hidratación sin nonce que la
      política bloquea (cosmético); se revisa en 4.3.
    - **Código de un tercero en el origen de la tienda.** Puede leer el DOM y el
      `localStorage` del sitio, donde vive el token del cliente mayorista
      (`kq_sesion_<slug>`); no hay SRI posible porque el módulo carga trozos. Por eso
      el módulo NO se carga con una sesión mayorista abierta ni mientras se entra con
      el enlace de acceso (`?acceso=`), y el carrito no pinta el widget en ese caso.
21. **Vitrina sin cuotas = vitrina de siempre.** El código de cuotas del script de la
    tienda (opciones, revisión, carrito, espera de Sistecrédito, WebMCP) y sus estilos
    salen SOLO con medios a cuotas visibles; sin ellos el script es idéntico byte a
    byte al de antes de D-517 y la hoja compartida conserva su huella (los estilos de
    cuotas van en el `<style>` de la página que los usa). Así vuelve a verde la
    instantánea de `fichaEspecificaciones`. De paso se corrigió un error de la
    entrega: dentro de esa plantilla `\d` se perdía y la cédula se validaba con
    `/^d{5,11}$/`, que rechazaba toda cédula; ahora va `[0-9]`.
22. **Ficha, carrito y checkout con el juicio del servidor (errores 2 y 7).** La
    ficha pasa por `evaluarMedio` con el precio y el producto (tope de 3 s por
    proveedor, los proveedores a la vez; sin respuesta, no se anuncia). El carrito y el checkout preguntan
    `GET …/pago-cuotas?total=&ids=` con el total del momento y los productos (una
    consulta por carrito y total), y el checkout vuelve a preguntar al cambiar la
    ciudad, el cupón o el retiro. Con retiro y cuotas pide dirección y ciudad.
23. **Prueba de conexión al guardar (error 6).** `IntegrationConfigService.saveConfig`
    prueba Addi o Sistecrédito con lo que se va a guardar (los secretos guardados más
    lo nuevo) ANTES de la transacción: conexión nueva, credencial cambiada (huella de
    los campos obligatorios, solo en memoria) o reactivación. Si falla,
    `400 CONEXION_NO_PROBADA` y no se escribe nada. Dentro de la transacción se
    comprueba que lo que se escribe es lo probado (`409 CONFIG_CAMBIO` si otra sesión
    cambió una credencial en el medio). Cambiar solo las reglas no prueba. Queda
    `conexionProbada: {en, entorno}` en el documento público, sin credenciales.
    `saveConfiguration` toma la empresa del token (`req.tenant`). En el Seller,
    «Guardar» espera una prueba exitosa con esos mismos datos.
24. **Reglas desde «Cómo te pagan» (F2-41·4).** `GET /v1/sites/pago-cuotas/reglas`
    (rango de cada proveedor, reglas guardadas, rutas del árbol de categorías; nunca
    credenciales) y `PUT /v1/sites/pago-cuotas/reglas/:proveedor` (administrador):
    rechaza un mínimo o un máximo fuera del rango del proveedor (con Addi sin
    respuesta, 503: no se guarda sin revisar) y categorías que no están en el árbol
    (se guarda la ruta exacta del árbol). Se guardan en la configuración del
    proveedor sin tocar credenciales. Se aplican al instante, sin publicar.
25. **Lo que ve el comprador del rechazo (F2-41·5).** El regreso del proveedor y el
    paso de `/pagar` a `/gracias` llevan la firma del pedido (`t`, la misma del enlace
    de `/pagar`). `/gracias` de un pedido a cuotas: con la solicitud viva, «Esperando
    la respuesta de Addi» y pregunta cada 5 s (hasta 10 min) a `…/pago-cuotas/:referencia/url`;
    si no aprobó, lo dice con la hora límite y, SOLO con la firma válida, ofrece
    «Intentar de nuevo» (`medio=cuotas`) y, si la tienda cobra en línea, «Pagar con
    tarjeta, PSE o Nequi» (`medio=linea`); sin firma remite al correo. Esa página va
    con `Cache-Control: private, no-store`. Las paradas de `/pagar` (solicitud en
    curso, tope de intentos, proveedor caído) ofrecen el siguiente paso.
26. **Páginas legales y checklist (error 11).** Secciones de id fijo
    (`pg_priv_cuotas`, `pg_dev_cuotas`, `pg_ter_cuotas`, `pg_env_cuotas`) que NUNCA se
    guardan en la página (revisión del 21-oct: si nacían con ella, quedaban
    publicadas al apagar el medio). El render (`conSeccionesDeCuotas`) quita
    cualquier bloque con esos ids y pone la sección con los medios activos en ese
    momento (como `pg_priv_novedades`, D-318); un medio apagado o cambiado no sigue
    nombrado (criterio c). El checklist de publicación cuenta un medio a cuotas
    visible como medio de pago.

## Observabilidad (Art. VII)

- **Hecho:** log estructurado (JSON, `fuente: "pagoCuotas"`) con `correlationId` =
  referencia del intento, más proveedor, empresa, resultado, latencia y código del
  proveedor. Sin documento, celular ni dirección (hay prueba).
- **Hecho:** alertas que quedan EN EL PEDIDO (`pagoTienda.alertas[]`, sin repetirse por
  tipo y referencia) y en el log como `alerta_<tipo>`: `monto_distinto`,
  `estado_desconocido`, `consulta_no_coincide`, `doble_aprobacion` y
  `aprobado_sobre_anulado` (el dinero entró sobre un pedido que el comercio anuló).
  El detalle del pedido en el Seller las muestra con qué hacer (tarea 9.8).
- **Pendiente (tablero):** métricas `pago_cuotas_inicio` y `pago_cuotas_resultado`, y
  la alerta de errores de credenciales repetidos, que necesita contar entre pedidos.

## Risks / Trade-offs

- **Documentación de Sistecrédito no oficial.** Daniel decidió programarlo ya
  (pregunta 7). Se mitiga bloqueando su ACTIVACIÓN con cualquier comercio hasta la
  tarea 0.3.
- **Sin sandbox de Sistecrédito.** Las pruebas en producción usan el campo `sandbox` y
  un pedido de bajo valor del comercio piloto, con la anulación manual en Credinet
  documentada.
- **Addi sin consulta de estado.** Si el callback falla, Addi lo reintenta durante 24 h.
  Si la reserva vence antes, el pago tardío revive el pedido (comportamiento existente).
- **Choque con D-496,** que extrae `crearPedidoDeTienda`. Orden acordado en D-518 (T·2):
  F2-41 se une primero y D-496 extrae sobre él.
- **Topes nuevos sin cifra del negocio:** `MAX_INTENTOS` (5) y `TOPE_RESERVA_VECES` (2)
  los propone el código para cerrar el error 3; Daniel los confirma con el diff.
  Con `SIN_TIEMPO`, Addi ya no abre solicitudes después de los 180 minutos del pedido
  (300 de tope menos 120 de vida de la solicitud).
- **Wompi y crédito sobre el mismo pedido:** elegido Wompi, mientras su enlace viva
  (24 h, más que cualquier reserva de cuotas) no se vuelve a cuotas. Es la lectura
  estricta de F2-41·5 para no cobrar dos veces; volver a cuotas después de un
  rechazo de Wompi queda como pregunta para Daniel.
- **Ventana del barrido de Wompi (D-206):** el vencimiento de Wompi sigue sin
  transacción, como antes de este cambio; se corrigió solo para cuotas, donde la
  ventana crece (consulta a Sistecrédito, callbacks de Addi, cron cada 5 min).
- **Archivos del front con trabajo de otra sesión** (facturación en Integraciones). La
  implementación va en un worktree propio y rebasa sobre lo que esté publicado.

## Respuestas de Daniel (2026-10-21, «aprobado todo»)

Aprobó el diff de la implementación y todas las recomendaciones:

1. Cambiar de medio sobre el mismo pedido es estricto: con un enlace de Wompi vigente
   (24 h) no se abre un crédito.
2. Split.io queda fuera de la política de la página. Si el widget no funciona sin él,
   se pide a Addi el script de aliado.
3. Topes: 5 intentos por pedido; la reserva se renueva máximo 2 veces (Addi hasta
   300 min, Sistecrédito hasta 120); `SIN_TIEMPO` si no alcanza el tiempo.
4. La misma carrera en Wompi (pago que entra mientras se anula la reserva) se corrige
   en un cambio aparte, porque cambia el golden del pedido de tienda.
5. Reglas del comercio por proveedor; el correo de rechazo usa el interruptor del
   recordatorio de pago; nunca se cae al Wompi de la plataforma; widget solo de Addi;
   `/gracias` de un pedido vencido se ajusta en TX-34.

## Respuestas de Daniel (2026-10-21, D-518)

- Corregir los 11 errores de la entrega antes de pedir los diffs sensibles (F2-41·1).
- Pregunta 5: widget oficial de Addi en ficha y carrito, solo con la bandera, abriendo
  su dominio con el mecanismo de terceros del sitio; Sistecrédito solo la etiqueta (·2).
- Logos: kit de marca y constancia (los pide Daniel); texto mientras tanto (·3).
- Reglas del comercio: decisión 17 (·4). Rechazo: decisiones 9 y 18 (·5).
- Plan gratis: Addi y Sistecrédito cuentan en el límite de integraciones (·6).
- Orden de unión: F2-41, luego D-496, suscripciones y pago rechazado de TX-34 (T·2).

## Respuestas de Daniel (2026-10-20)

- **Preguntas 2, 4 y 7:**
  - 150 minutos de reserva para Addi y 60 para Sistecrédito;
  - excepción al Art. X aceptada con controles;
  - los dos proveedores se implementan ya, con Sistecrédito sobre la documentación no
    oficial y a corregir cuando lleguen las guías.
- **Pregunta 1:** todavía no hay convenio con ninguno de los dos.
- **Preguntas 3, 5 y 6:** sin respuesta. Se aplican los valores por omisión:
  - `formaDePago` «Addi» / «Sistecrédito»;
  - sin widget;
  - la prueba en producción de Sistecrédito espera el convenio.

## Open Questions (para Daniel)

1. ¿Qué comercio es el piloto (Baudio u otro) y ya tiene convenio con Addi, con
   Sistecrédito o con ambos?
2. ¿Aceptas 150 minutos de reserva para Addi y 60 para Sistecrédito?
3. ¿El texto en `formaDePago` y en la lista de pedidos debe ser «Addi» y «Sistecrédito»,
   o «Pago a cuotas (Addi)»?
4. ¿Aceptas la excepción al Art. X con los controles compensatorios de la decisión 5?
5. ~~¿El widget oficial de Addi va en una fase 2, o nunca?~~ Respondida en D-518: va
   ya, con la bandera encendida.
6. ¿Probamos Sistecrédito en producción con el campo `sandbox` y un pedido real de bajo
   valor que luego se anula en Credinet?
7. ¿Implementamos Addi primero y Sistecrédito cuando lleguen las guías oficiales?
