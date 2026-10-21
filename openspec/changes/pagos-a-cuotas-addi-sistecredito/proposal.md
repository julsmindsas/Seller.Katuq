# Pago a cuotas en la tienda en línea: Addi y Sistecrédito

> Ticket 1233 (F2-41, piloto Baudio). Toca **pagos, pedidos y la reserva de inventario
> del pedido de tienda**.
> Decisión: **D-517, APROBADA por Daniel el 2026-10-20.** Decidió:
> - implementar los dos proveedores ya;
> - reserva de 150 minutos para Addi y 60 para Sistecrédito;
> - aceptar la excepción al Art. X con los controles compensatorios.
>
> Aún no hay convenio con ninguno de los dos proveedores.

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
  - Solo aparecen si se cumplen las cuatro condiciones:
    - el comercio conectó el proveedor;
    - lo encendió en «Cómo te pagan»;
    - tiene la bandera `storeInstallmentPayments`;
    - el total está dentro del rango del proveedor.
  - Si el total está fuera del rango, el medio se ve deshabilitado y explica el rango,
    como recomienda Addi.
- **Datos del comprador.** Al elegir cuotas, «Cédula o NIT» pasa a ser obligatorio. Addi
  solo admite cédula de ciudadanía. El documento no se registra en logs (Art. XI).
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
    vive 2 horas.
  - `/pagar` reintenta con el mismo proveedor y una referencia nueva; nunca genera un
    enlace de Wompi.
  - El recordatorio por correo no se manda para estos pedidos en esta fase.
- **Seller:**
  - Tarjetas «Addi» y «Sistecrédito» en Integraciones, grupo «Cobrar», detrás de la
    bandera.
  - Interruptores en el editor de sitios → «Cómo te pagan».
  - El detalle del pedido muestra el proveedor, la referencia del intento y el estado.
- **Vitrina:**
  - Etiqueta de texto «Paga a cuotas con Addi / Sistecrédito» en la ficha, el carrito y
    el pie, generada según lo que el comercio tenga encendido.
  - No se muestra ninguna cuota calculada a mano.

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
- **Frontend:**
  - `components/integrations/*` (tarjetas y formularios).
  - `components/sitios/editor/*` («Cómo te pagan»).
  - Detalle del pedido.
- **Datos:** sin colecciones nuevas.
  - `orders`: `pagoTienda.proveedor`, `pagoTienda.intentos[]` y `linkIds`.
  - `integration_configs` / `integration_secrets`: proveedores `addi` y `sistecredito`.
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
- Cuota estimada en la ficha («Hasta X cuotas de $Y»). Addi la muestra con su widget
  oficial, cuya versión vigente hay que pedirle a Addi (fase 2). Sistecrédito no tiene
  simulador público.
- Logos de Addi y Sistecrédito. Hoy la tienda no usa logos ajenos por licencia; se
  usarán solo si el kit de marca de cada proveedor lo permite.
- Cancelación o devolución automática al anular el pedido en Katuq. En esta fase se hace
  a mano en el portal de cada proveedor, con aviso en el pedido.
- Recordatorio por correo de pago pendiente para estos medios.
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
  de las guías oficiales: no se escribe código contra Sistecrédito hasta tener las guías
  del convenio (tarea 0.3).
- **Monto aprobado distinto al pedido.** Addi no aprueba montos parciales, pero se
  valida igual. Si el monto no coincide, el pago no se aplica y se abre una alerta.
