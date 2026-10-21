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

**Non-Goals:** los listados en `proposal.md` (otros canales, widget de cuotas, logos,
cancelación automática, recordatorio, marketplace).

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
   - El total y el rango se recalculan en el servidor. Addi consulta su configuración en
     el momento del checkout, una llamada por pedido. Sistecrédito usa `minAmount`.
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
   - `vencerReservasDeTienda` incluye `formaDePago ∈ {"Pago en línea", "Addi", "Sistecrédito"}`,
     con un minuto límite por proveedor: Wompi 60, Sistecrédito 60 desde el último
     intento y Addi 150 desde el último intento. Una prueba fija los 60 de Wompi.
   - Antes de anular un pedido de Sistecrédito se consulta su último intento.
   - **Sensible:** un cambio con diff aprobado.
9. **`/pagar` y `/gracias`.**
   - `retomarPago` toma `pagoTienda.proveedor`. Si es un proveedor a cuotas, abre un
     intento nuevo con ese proveedor.
   - `conciliarAlVolver`:
     - Sistecrédito: consulta el intento.
     - Addi: muestra «Esperando la respuesta de Addi», porque no hay consulta, y la
       página revisa el estado del pedido.
   - El recordatorio (`sitePagoPendiente`) excluye estos pedidos.
10. **Conciliación de Sistecrédito.** Va dentro del cron de sitios, que corre cada 5
    minutos.
    - Su interruptor es `config/feature_flags.pagoCuotasConciliacion`, en Firestore
      (D-505, nada en el `.env`).
    - Revisa los intentos pendientes no vencidos, con una hora de gracia, y aplica con las
      mismas garantías.
    - Antes de una anulación por vencimiento, el barrido hace una última consulta.
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

## Observabilidad (Art. VII)

- Log estructurado con `correlationId` = referencia del intento, más proveedor, empresa,
  resultado, latencia y código del proveedor. Sin documento, celular ni dirección.
- Métricas `pago_cuotas_inicio` y `pago_cuotas_resultado` (success / error / retry).
- Alertas por:
  - monto distinto;
  - estado desconocido;
  - errores de credenciales repetidos;
  - aprobación sobre un pedido anulado y no revivido.

## Risks / Trade-offs

- **Documentación de Sistecrédito no oficial.** Se mitiga bloqueando la implementación
  de Sistecrédito hasta la tarea 0.3. Addi puede avanzar primero (fases separadas).
- **Sin sandbox de Sistecrédito.** Las pruebas en producción usan el campo `sandbox` y
  un pedido de bajo valor del comercio piloto, con la anulación manual en Credinet
  documentada.
- **Addi sin consulta de estado.** Si el callback falla, Addi lo reintenta durante 24 h.
  Si la reserva vence antes, el pago tardío revive el pedido (comportamiento existente).
- **Choque con D-496,** que extrae `crearPedidoDeTienda`. Se acuerda el orden en la tarea
  0.1, y el cambio en `crearPedido` se hace en la versión vigente del día.
- **Archivos del front con trabajo de otra sesión** (facturación en Integraciones). La
  implementación va en un worktree propio y rebasa sobre lo que esté publicado.

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
5. ¿El widget oficial de Addi (script externo en la tienda del comercio) va en una fase
   2, o nunca?
6. ¿Probamos Sistecrédito en producción con el campo `sandbox` y un pedido real de bajo
   valor que luego se anula en Credinet?
7. ¿Implementamos Addi primero y Sistecrédito cuando lleguen las guías oficiales?
