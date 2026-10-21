# Pago a cuotas en la tienda en línea: Addi y Sistecrédito

> Ticket 1233 (F2-41, piloto Baudio). Toca **pagos, pedidos y la reserva de inventario
> del pedido de tienda**.
> Decisión: **D-517, APROBADA por Daniel el 2026-10-20.** Decidió:
> - implementar los dos proveedores ya;
> - reserva de 150 minutos para Addi y 60 para Sistecrédito;
> - aceptar la excepción al Art. X con los controles compensatorios.
>
> Aún no hay convenio con ninguno de los dos proveedores.
>
> **D-518 (Daniel, 2026-10-21):** corregir los 11 errores de la entrega antes de pedir
> los diffs sensibles (F2-41·1); cuota estimada con el widget oficial de Addi (F2-41·2);
> íconos: texto hasta tener el kit de marca y la constancia (F2-41·3); reglas propias
> del comercio (F2-41·4); rechazo con correo y `/pagar` para reintentar o pagar con
> Wompi el mismo pedido (F2-41·5); Addi y Sistecrédito cuentan en el límite de
> integraciones del plan (F2-41·6). Orden de unión: F2-41 primero (T·2).

## Why

En tecnología y en compras de ticket alto, pagar a cuotas decide la compra. El diseño de
Baudio muestra Addi en la ficha y Addi y Sistecrédito en el carrito y el pie. Hoy la
tienda no puede ofrecerlo. Código leído el 2026-10-20:

- **La tienda solo conoce tres formas de pago.** En `crearPedido`
  (`controllers/sites.js`, ~2625) son `linea` (pasarela), `contraentrega` y `otra:<cd>`
  (formas manuales del maestro). No existe una familia «crédito o cuotas».
- **La pasarela cae al Wompi de la plataforma.** `getPaymentCredentials`
  (`services/paymentGateway/index.js`) prueba `wompi` y luego `epayco`. Si el comercio no
  tiene ninguno, usa la cuenta de la plataforma, y `preferredProvider` solo cambia el
  orden. Un pago con Addi no puede terminar cobrado por otra pasarela.
- **Todo el ciclo del pago depende de «Pago en línea».** Ese texto lo revisan la
  anulación por reserva vencida a los 60 minutos (D-206, `vencerReservasDeTienda`), el
  recordatorio (`utils/sitePagoPendiente.js`), `/pagar` (`retomarPago`), la conciliación
  al volver y la confirmación. `retomarPago` y `conciliarAlVolver` dan por hecho que el
  proveedor es Wompi.
- **La aplicación del pago ya es reutilizable.** `aplicarPagoDeTienda` corre en
  transacción, es idempotente, revive un pedido vencido que paga tarde y no vuelve a
  descontar inventario si ya lo hizo. El pedido se ubica por `pagoTienda.linkIds`
  (`utils/wompiPagoPedido.js`, `buscarPedidoPorLinkDePago`).
- **Las credenciales de cada comercio ya tienen dónde guardarse:**
  `IntegrationConfigService` (`integration_configs` + `integration_secrets`, cifrado
  AES-256-GCM). Solo hay que declarar el proveedor en `PROVIDER_SCHEMAS`.
- **Los proveedores (investigación del 2026-10-20, detalle y fuentes en `design.md`):**
  - **Addi** tiene una API documentada:
    - OpenAPI oficial de staging; copia en `referencias/`.
    - OAuth2 `client_credentials`.
    - `POST /v1/online-applications` responde 301 con la URL del checkout.
    - Callback con Basic Auth, que espera de vuelta el mismo JSON.
    - Cancelación total o parcial por API.
    - Configuración pública por comercio (`allySlug`), con montos mínimo y máximo.
    - Ambiente de staging.
  - **Sistecrédito** tiene la API Credinet Pay (`https://api.credinet.co/pay`):
    - No es pública: se entrega en guías PDF a los aliados con convenio.
    - Se autentica con tres llaves.
    - La transacción se crea y la URL de pago aparece al consultar.
    - La notificación no viene firmada y se valida consultando la transacción.
    - No hay anulación por API ni simulador de cuotas.
    - Hay un solo host; el ambiente se elige por cabecera y no hay sandbox real.

## What Changes

- **Dos medios de pago nuevos en el checkout de la tienda:** «Paga a cuotas con Addi» y
  «Paga a cuotas con Sistecrédito».
  - Cada comercio los activa con **sus propias credenciales**. Nunca se usa una cuenta
    de Katuq y nunca se cae a Wompi.
  - Se muestran solo con las cuatro condiciones de visibilidad:
    - el comercio conectó el proveedor;
    - lo encendió en «Cómo te pagan»;
    - tiene la bandera `storeInstallmentPayments`;
    - sus credenciales son de producción (las de pruebas, solo en empresas de prueba).
  - Y se pueden elegir solo si el carrito cumple (D-518, F2-41·4):
    - el total FINAL (con envío, cupón y promociones) está dentro del rango del
      proveedor y del mínimo y máximo propios del comercio, que solo pueden ser más
      estrictos;
    - todos los productos están en las categorías permitidas por el comercio (con sus
      subcategorías). Si uno queda fuera, no hay cuotas para ese carrito.
  - Si no se cumple, el medio se ve deshabilitado con el motivo, como recomienda Addi.
- **Datos del comprador.** Al elegir cuotas son obligatorios nombre y apellido, correo,
  celular, ciudad, dirección (aunque recoja en tienda) y la cédula. Addi solo admite
  cédula de ciudadanía. Nada de esto se registra en logs (Art. XI).
- **El pedido se crea igual que hoy:** consecutivo, D-204 y estado de pago «Pendiente».
  - Lleva `pagoTienda.proveedor = 'addi' | 'sistecredito'` y su propio texto en
    `formaDePago` («Addi» o «Sistecrédito»).
  - Cada intento tiene una referencia única: Addi exige un `orderId` nuevo por intento y
    Sistecrédito rechaza una factura repetida (738). Esa referencia se guarda en
    `pagoTienda.linkIds`, así que el pedido se ubica igual que con Wompi.
- **Confirmación del pago, sin confiar en el navegador ni en el contenido de la
  notificación:**
  - **Addi:** el callback se autentica con las credenciales Basic del comercio
    (comparación de tiempo constante), y deben coincidir el intento, el monto y la
    moneda. Responde 200 con el mismo JSON.
  - **Sistecrédito:** la notificación solo dispara una consulta a
    `GetTransactionResponse` con las llaves del comercio. El estado sale de esa
    respuesta, comparando `_id`, factura y valor. Siempre responde 200.
  - Además, un trabajo de conciliación consulta los intentos de Sistecrédito pendientes,
    porque las notificaciones llegan duplicadas o incompletas y las anulaciones no
    notifican.
  - El evento crudo se guarda antes de procesarlo (Art. V) y el pago se aplica con
    `aplicarPagoDeTienda`.
- **Ciclo del pedido sin pago:**
  - La reserva de inventario de D-206 cubre también estos pedidos, con vencimiento por
    proveedor: Sistecrédito 60 minutos y Addi 150 minutos, porque la solicitud de Addi
    vive 2 horas. Cuenta desde el último intento, con tope: nunca más de dos reservas
    desde que se creó el pedido.
  - El barrido de reservas también recorre los pedidos a cuotas, desde el recordatorio
    de pago y desde el cron de sitios, aunque la tienda no tenga ventas nuevas.
  - **Rechazo (D-518, F2-41·5):** el pedido sigue Pendiente hasta vencer la reserva y
    el comprador recibe un correo con el enlace de `/pagar`.
  - `/pagar` lleva a la solicitud viva si la hay; si no, abre un intento nuevo con el
    mismo proveedor (máximo 5 por pedido), siempre que quepa en lo que le queda a la
    reserva y que no haya un enlace de Wompi vigente del pedido. Con `medio=linea`
    cobra con Wompi el MISMO pedido y la MISMA reserva, si la tienda cobra en línea y
    no hay una solicitud viva (con Sistecrédito, después de consultar sus intentos).
  - El recordatorio de pago de Wompi no se manda para estos pedidos: su aviso es el
    correo de rechazo.
- **Seller:**
  - Tarjetas «Addi» y «Sistecrédito» en Integraciones, grupo «Cobrar», detrás de la
    bandera.
  - Interruptores en el editor de sitios → «Cómo te pagan».
  - El detalle del pedido muestra el proveedor, la referencia del intento y el estado.
- **Reglas del comercio (D-518, F2-41·4):** mínimo, máximo y categorías permitidas en la
  configuración de cada proveedor en Integraciones.
- **Vitrina:**
  - Etiqueta de texto «Paga a cuotas con Addi / Sistecrédito» en la ficha, el carrito y
    el pie, generada según lo que el comercio tenga encendido.
  - Cuota estimada solo con el widget oficial de Addi, con la bandera encendida
    (D-518, F2-41·2). Sistecrédito, solo la etiqueta. Nunca una cuota calculada a mano.
  - Logos: texto hasta tener el kit de marca y la constancia de autorización (F2-41·3).
    El carrito lista en texto los medios que la tienda acepta.
  - Una tienda sin medios a cuotas se ve exactamente igual que antes (mismo script,
    misma hoja de estilos, misma política de la página).

## Capabilities

### New Capabilities
- `tienda-pago-a-cuotas`: ofrecer, elegir e iniciar el pago a cuotas en la tienda;
  configuración del comercio y vitrina.
- `conciliacion-pago-a-cuotas`: confirmar, conciliar y vencer los pagos a cuotas, con
  sus garantías de idempotencia y autenticidad.

### Modified Capabilities
- Ninguna spec consolidada en `openspec/specs/` cubre hoy el cobro de la tienda. El
  comportamiento de Wompi no cambia.

## Impact

- **Backend:**
  - `services/paymentGateway/` (proveedores `addiProvider` y `sistecreditoProvider`, y una
    resolución estricta sin respaldo de plataforma).
  - `services/integrationConfigService.js` (`PROVIDER_SCHEMAS`).
  - `controllers/sites.js`: `crearPedido`, `retomarPago`, `conciliarAlVolver`,
    `vencerReservasDeTienda` y las rutas públicas de notificación.
  - `utils/siteBlocks.js` (normalización de `tienda.pagoCuotas`).
  - `utils/siteTienda.js` y `utils/siteHtml.js` (checkout y vitrina).
  - `services/companyFeatureFlags.js` y `services/cronService.js` (conciliación).
  - D-518: `GET/PUT /v1/sites/pago-cuotas/reglas` (reglas del comercio desde el editor),
    prueba de conexión del servidor antes de activar Addi o Sistecrédito
    (`integrationConfigService.saveConfig`), política de la página abierta al widget
    de Addi solo en los sitios que lo muestran, y páginas legales y checklist de
    publicación que cuentan las cuotas (`utils/sitePaginasLegales.js`,
    `utils/siteListoParaVender.js`).
- **Frontend:**
  - `components/integrations/*` (tarjetas y formularios).
  - `components/sitios/editor/*` («Cómo te pagan»).
  - Detalle del pedido.
- **Datos:** sin colecciones nuevas.
  - `orders`: `pagoTienda.proveedor`, `pagoTienda.intentos[]` y `linkIds`; marcas
    `pagoTienda.reservaCuotas` y `pagoTienda.conciliarSistecredito` (las quita el propio
    barrido); `pagoTienda.cuotasVenceEn` (vencimiento de la reserva a cuotas; `venceEn`
    sigue siendo del enlace de Wompi); `pagoTienda.devolucionReserva` (vencimiento en
    curso, hecho o fallido); `pagoTienda.alertas[]`; `pagoTienda.cambioDeMedio` y, al pagarse con
    Wompi, `formaDePago` «Pago en línea» con `formaDePagoInicial`.
  - `integration_configs` / `integration_secrets`: proveedores `addi` y `sistecredito`,
    con las reglas del comercio (`montoMinimo`, `montoMaximo`, `categoriasPermitidas`).
  - `sites.*.tienda.pagoCuotas`.
  - `integrationRawEvents`: eventos crudos.
- **Write-set:**
  - Escribe solo `orders` (estado de pago, a través de `aplicarPagoDeTienda`), la
    configuración del sitio, la configuración de integración y los eventos crudos.
  - El inventario solo se mueve por los caminos que ya existen (D-204 al crear, D-206 al
    vencer, revivir en `aplicarPagoDeTienda`); no hay escrituras nuevas de inventario.
  - Prohibido escribir `products`, catálogo, precios o listas de precios.
- **Fuera de Katuq:** convenio y credenciales de cada comercio con Addi y con Sistecrédito.

## No-goals

- Venta asistida, POS, Kuvo, el bot de WhatsApp y el link de pago de pedidos manuales.
  Solo la tienda en línea.
- Cuota calculada por Katuq. Solo la del widget oficial de Addi (D-518, F2-41·2);
  Sistecrédito no tiene simulador público.
- Logos de Addi y Sistecrédito mientras no estén el kit de marca y la constancia de
  autorización (D-518, F2-41·3; precedente de F2-44).
- Cancelación o devolución automática al anular el pedido en Katuq. En esta fase se hace
  a mano en el portal de cada proveedor, con aviso en el pedido.
- Recordatorio de «pago pendiente» a los 20 minutos para estos medios (el aviso es el
  correo de rechazo).
- Marketplace o varios proveedores en un pedido (`/v2/online-applications` de Addi).

## Riesgos (módulos sensibles)

- **Pedidos y consecutivos.** `crearPedido` se toca para aceptar la nueva familia de
  pago. La propuesta `pedido-whatsapp-con-link-de-pago` (D-496) planea extraer
  `crearPedidoDeTienda`; hay que coordinar el orden para que un cambio no pise al otro.
  La prueba de caracterización con golden (`pedidoTiendaCaracterizacion`) debe seguir en
  verde para Wompi, contra entrega y formas manuales.
- **Inventario.** Ampliar D-206 a los pedidos a cuotas cambia cuándo se libera el stock
  reservado. Un vencimiento demasiado corto anula pedidos que Addi aprueba después; uno
  demasiado largo retiene stock. Por eso el vencimiento va por proveedor y un pago
  tardío revive el pedido.
- **Autenticidad (Art. X).**
  - Ninguno de los dos proveedores firma con HMAC.
  - **Excepción acotada:** Addi se autentica con Basic Auth por comercio y validación
    de intento, monto y moneda. Sistecrédito se valida con una consulta autenticada a
    su API, y el contenido de la notificación nunca decide el estado.
  - Queda registrada en D-517.
- **Sistecrédito sin sandbox.** Se prueba con el campo `sandbox` de la API y con llaves
  productivas del comercio piloto. La documentación salió de integraciones públicas, no
  de las guías oficiales. Daniel decidió programarlo ya (respuesta a la pregunta 7);
  **no se activa con ningún comercio** hasta contrastarlo con las guías del convenio
  (tarea 0.3).
- **Monto aprobado distinto al pedido.** Addi no aprueba montos parciales, pero se
  valida igual. Si el monto no coincide, el pago no se aplica y queda una alerta en el
  pedido.
- **Dos créditos para un pedido.** Dos solicitudes vivas del mismo pedido podrían
  aprobarse las dos. `/pagar` no abre una nueva mientras haya una viva, y si igual
  llegan dos aprobaciones (o una de cuotas y otra de Wompi), la segunda no se aplica y
  queda la alerta `doble_aprobacion` para que el comercio anule el sobrante.
