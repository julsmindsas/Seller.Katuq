## Why

Ticket 1224 (ALMARA, 16-oct). En "Editar Orden de Envío #3629", al quitar el pedido DAD-014323 de la orden salió "No se pudo cambiar el estado del pedido DAD-014323. El pedido fue modificado por otra persona mientras lo editabas" y el pedido quedó a medias: fuera de la orden en pantalla, pero sin el cambio de estado guardado. Lo mismo le pasó a DAD-014337 y DAD-014328.

La causa está verificada con datos de producción (notas internas 2 y 4 del ticket):

- Los tres pedidos entraron a la orden estando en producción. Mientras el editor estuvo abierto, empaque los marcó como empacados y a uno le asentaron un pago. Eso les cambió `date_upd`.
- `cambiarEstado` (`despachos.component.ts:2514`) manda a `POST /v1/orders/edit` la copia completa que la pantalla cargó al abrir, con `_baseVersion = date_upd` viejo. El backend la rechaza con 409 `STALE_WRITE` (`controllers/orders.js:3632-3649`). El rechazo es correcto: si pasara, la copia vieja pisaría el empacado y el pago.
- Lo que falla es la pantalla: muestra el error, recarga la lista y no vuelve a intentar. La única salida del usuario era sacar los pedidos de la ruta y despachar a mano.

El rótulo que "no hacía nada" (la otra mitad del ticket) ya se corrigió en `bef5233d`, publicado en 2026.10.16.4.

## What Changes

- **Reintento con el pedido fresco.** Cuando un cambio de estado desde Despachos (botón de estado en la lista, o quitar un pedido de la orden) recibe `STALE_WRITE`, la pantalla trae el pedido actual del servidor por su número, le aplica el mismo cambio que pidió el usuario y vuelve a guardar una sola vez. El usuario no tiene que recargar ni volver a buscar el pedido.
- **Si otra persona ya lo dejó así, no se escribe.** Si el pedido fresco ya está en el estado que el botón quería (y, al quitarlo de una orden, ya no tiene orden), la pantalla adopta el pedido fresco y avisa; no manda otra edición.
- **El segundo rechazo sí se muestra.** Si el reintento también falla, sale el mismo aviso de hoy, con el detalle del servidor.
- **La misma tabla de cambios, en un solo lugar.** Qué campos cambia cada botón (estado, empacador, despachador, fecha, orden, transportador y la marca de cambio explícito para los retrocesos) pasa a una función pura, usada tanto en el primer intento como en el reintento, con pruebas.

## Capabilities

### New Capabilities
- `despachos-cambio-estado`: cambiar el estado de un pedido desde Despachos sobre la versión actual del pedido, aunque la copia de la pantalla haya quedado vieja.

### Modified Capabilities
- (ninguna)

## No-goals

- No se cambia el backend: `POST /v1/orders/edit`, el lock optimista y `STALE_WRITE` quedan igual. No hay endpoint acotado de despacho (queda como opción futura si el reintento no alcanza).
- No se toca la generación del PDF de la orden (`imprimirOrden`, html2pdf) ni el rótulo (`bef5233d`).
- No se reintenta en otras pantallas que llaman `editOrder` (evidencia de empacado, órdenes de despacho v2, ventas): cada una tiene su manejo y va en su cambio.
- No cambian totales, inventario, facturación, notificaciones ni consecutivos.

## Riesgos (módulos sensibles)

- **`orders` — mismo write-set de hoy.** El reintento manda exactamente lo que ya mandaba `cambiarEstado`, pero sobre el documento actual: solo cambian `estadoProceso`, `empacador`, `fechaHoraEmpacado`, `despachador`, `fechaYHorarioDespachado`, `transportador`, `shippingOrder`, `nroShippingOrder` y la marca de transporte `_estadoProcesoExplicitlyChanged`. El pedido fresco trae el carrito, los pagos y los totales actuales, así que el guardado ya no puede pisar lo que hizo empaque o tesorería (hoy, si no hubiera lock, lo pisaría).
- **Un solo reintento.** Si el pedido vuelve a cambiar entre la lectura fresca y el guardado, el usuario ve el aviso de siempre. No hay bucle.
- **Pedido no encontrado al releer** (borrado o de otra empresa): se muestra el aviso original, sin escribir.
- **Despachos es módulo sensible:** un cambio a la vez; `cambiarEstado` es la única función que cambia de comportamiento. Otra sesión publicó hoy el rótulo (`bef5233d`) en el mismo archivo; este cambio no toca esas líneas.

## Impact

- Front: `despachos.component.ts` (`cambiarEstado` y tres métodos privados nuevos), `despachos/estado-despacho.ts` (nuevo, funciones puras), `VentasService.getPedidoPorNumero` (nuevo, usa `GET /v1/orders/getOrderByNroPedido/:nroPedido`, que ya existe con `auth`).
- Pruebas: `tests/despachos/estado-despacho.test.js` (node --test, ts-node).
- Sin backend, sin colecciones nuevas. Decisión a registrar como D-XXX en `specs/CONTRACT.md`.
