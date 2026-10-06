# Propuesta: un pedido con productos en varias bodegas se despacha solo, por partes

Cambio 3 de 3 del programa D-355 (ticket 1120). Requiere los cambios 1 y 2.

## Why

Con el cambio 2 cada línea sabe de qué bodega sale, pero el despacho sigue trabajando con el **pedido entero**: una orden de envío contiene pedidos completos, cada proveedor (Cereza, Fullpi, Enviame) recibe todo el carrito con la bodega del pedido, y unos ocho lugares distintos escriben `estadoProceso` directo. No existe ninguna noción de despacho parcial, entrega parcial ni estado por línea (auditoría de código, 2026-10-06).

La alternativa de partir el pedido en pedidos hijos se descartó: tesorería, cartera, facturación y analítica cuentan pedidos, y los hijos duplicarían ventas o plata.

## What Changes

- **Partes de despacho dentro del mismo pedido:** cuando las líneas quedan en más de una bodega, el pedido guarda `dispatchParts` (una por bodega). Un pedido de una sola bodega no tiene partes y funciona exactamente como hoy.
- **El proveedor sale de la bodega, no de un clic:** bodega con `osmosisStorageCode` → Cereza; con `fulfillmentProvider` → ese proveedor; sin proveedor → cola manual de esa bodega, donde el equipo despacha como hoy (escoge transportadora o mensajero).
- **Envío automático por parte:** cada parte de un proveedor automático se envía sola cuando cumple las condiciones que ese proveedor ya exige hoy (pago, cédula, etc.), con su propia huella de idempotencia. Cada proveedor recibe solo sus líneas y su bodega.
- **Plata sin cobros dobles:** la parte principal (la de mayor valor) lleva el cobro del envío y recauda el contraentrega completo; las demás viajan como ya pagadas. El valor declarado de cada parte es el de sus líneas.
- **Estado del pedido calculado:** un solo punto calcula `estadoProceso` como el menos avanzado de sus partes. "Despachado" cuando salieron todas, "Entregado" cuando llegaron todas. Si un proveedor cancela una parte, el pedido no se cancela: queda en atención.
- **Un aviso al cliente por evento del pedido**, no por parte.
- **En pantalla:** en "Todos los pedidos" y en Despachos, un pedido con partes muestra un chip por bodega con su estado. Sin botones nuevos. Despachos gana el filtro por bodega para ver la cola de cada una.

## Capabilities

### New Capabilities
- `dispatch-by-warehouse`: partes de despacho por bodega con proveedor resuelto por la bodega y envío automático por parte.
- `order-status-aggregation`: estado del pedido calculado desde sus partes, con aviso único al cliente.

### Modified Capabilities
Ninguna archivada; toca el push a Cereza (D-133) y a Fullpi (D-156/D-157) para que acepten una parte.

## Impact

- Backend: `cerezaOrderDispatchService`/`osmosisOrderService` y `fullpiOrderService` aceptan una parte (sub-carrito, bodega de la parte, total y recaudo de la parte, id externo `nroPedido` para la principal y `nroPedido-2`, `-3` para las demás); webhooks y pulls de Cereza, Fullpi y Enviame resuelven la parte por id externo y llaman al agregador; los escritores directos de `estadoProceso` pasan por el agregador cuando el pedido tiene partes.
- Frontend: chips de partes en la lista y el panel del pedido; filtro por bodega en Despachos. Tema de "Todos los pedidos".
- Campos en `orders` (inglés): `dispatchParts[]`. Sin colecciones nuevas, sin endpoints "v2".

## No-goals

- No cambia pedidos de una sola bodega (más del 99 % hoy).
- No reparte venta asistida, POS ni tiendas.
- No crea pedidos hijos ni facturas por parte: la factura sigue siendo una por pedido.
- No arregla los hallazgos colaterales del despacho listados en D-355.

## Riesgos

- **Doble despacho:** caminos viejos que mandan el pedido entero (botón manual a Cereza que se salta la huella, barrido de Fullpi, envío desde Despachos) deben respetar las partes; si un pedido tiene partes, esos caminos envían la parte o se niegan.
- **Regresiones de estado:** hoy hay cuatro tablas de orden de estados distintas; el agregador usa una sola (`osmosisStatusPolicy.STATE_RANK`) y se apoya en la propuesta `proteger-estados-finales-del-pedido`.
- **Cliente:** el primer "Despachado" de una parte no debe gastar el aviso del pedido.
- **Fullpi:** responde "ya existe" como éxito; por eso cada parte necesita su id externo propio.
