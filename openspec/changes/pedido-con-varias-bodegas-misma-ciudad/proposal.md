## Why

Ticket 1331 (ALMACEN BOMBAS, 2026-10-22, «urgente: nos está frenando la operación, sobre todo en los combos»). En Medellín tienen 6 bodegas (Zona Franca Ext, Zona Franca Libre Disposición, Bodega Motores, Repuestos, Medellín Vitrina, Medellín Virtual). Un pedido con un repuesto de «Repuestos» y una bomba de «Medellín Vitrina» no se puede armar, y un combo con productos de dos de esas bodegas tampoco.

Lo que pasa hoy en Katuq (verificado en código el 22-oct):

- La venta asistida trabaja con **una bodega a la vez**. El catálogo, el stock que se muestra, el «agregar al carrito» y el «agregar combo» miran solo esa bodega. Del combo, el producto que no tiene existencias en ella se deja por fuera («Combo sin existencias» o «quedó incompleto»).
- El pedido guarda **una sola bodega** (`order.bodegaId`) y el inventario descuenta todo de ahí (`inventoryService.updateByChannel`, `updateByPOS`). Si el vendedor cambia de bodega con el carrito lleno, todas las líneas se descuentan de la última bodega escogida. Es un descuadre silencioso.
- Si el comercio tiene el control de existencias en «bloquear», el servidor rechaza el pedido porque revisa todas las líneas contra esa única bodega. **ALMACEN BOMBAS lo tiene en «bloquear»** (leído el 22-oct): por eso el pedido mezclado no se deja crear.

Bodegas de ALMACEN BOMBAS (leídas el 22-oct): MED-REP, MED-VIT y MED-MOT en **Medellín**; ZF-EXT y ZF-01 (Zona Franca) en **Rionegro**; MED-VIR «Medellín P» (transaccional) **sin ciudad**; BOG-01 Bogotá; CAL-VIT Cali. El comercio cuenta la Zona Franca como Medellín, así que «misma ciudad» por el campo `ciudad` la dejaría por fuera (pregunta 3).

## What Changes

- **Cada línea del pedido sabe de qué bodega sale** (`carrito[i].idBodega`, el campo que ya usa el reparto D-361). Al agregar un producto o un combo, cada producto toma la bodega donde hay existencias, dentro de la misma ciudad. Primero va la bodega escogida y luego las demás de esa ciudad.
- **Misma ciudad, sí; otra ciudad, no.** Se permite mezclar bodegas que tienen la misma `ciudad` en su ficha. Si un producto solo está en otra ciudad, se avisa como hoy y no se agrega.
- **El inventario descuenta de la bodega de cada línea.** Si la línea no tiene bodega, se usa la del pedido, como hoy, así ningún pedido existente ni otro comercio cambia. El revisor de existencias del servidor revisa cada línea contra su bodega.
- **Se ve de dónde sale cada cosa.** En el carrito, en el detalle del pedido y en el alistamiento, cada línea muestra su bodega para juntar los productos antes de despachar.
- **Nace apagado** con la bandera por empresa `multiBodegaMismaCiudad` (D-505), y se prende primero solo para ALMACEN BOMBAS.

## Capabilities

### New Capabilities
- `order-line-warehouse`: bodega por línea en la venta asistida, dentro de una misma ciudad, con el descuento de inventario por línea.

### Modified Capabilities
- Venta asistida, combos (D-147/D-339), control de existencias (D-164/D-362) e inventario por pedido: respetan la bodega de la línea cuando existe.

## Impact

- **Frontend:** `ventas/catalogo/ecomerce-products/*` (stock, agregar y combo por ciudad), `shared/services/cart.service.ts` (tope por bodega de la línea), `ventas/crear-ventas/*` y `venta-asistida-unica/*` (enviar la bodega por línea), detalle del pedido y alistamiento (mostrarla).
- **Backend (módulo sensible):** `services/inventoryService.js` (`updateByChannel` y `updateByPOS` respetan `line.idBodega`), `services/inventory/orderInventoryRolloutService.js` (pasar las asignaciones por línea al ledger, que ya las acepta), `services/inventory/saleAvailabilityGate.js` (revisar por línea), `controllers/orders.js` (crear y editar).
- **Datos:** `carrito[i].idBodega` (business code, `BOD-00X`, nunca el doc ID). Sin colección nueva. Se revisa que las 6 bodegas de Medellín de ALMACEN BOMBAS tengan `ciudad` lleno antes de prender.
- **Write-set de inventario:** solo `inventory`, `inventoryMovement` y su auditoría, como hoy. No escribe `products`, precios ni listas de precios. Contract test que lo verifica.
- **Riesgo:** es el camino de descuento de inventario de todos los pedidos. Por eso va detrás de la bandera, con la regla «sin bodega en la línea = exactamente como hoy» probada para POS, venta asistida, canales y edición de pedidos, y un cambio a la vez con diff aprobado.
- **Decisión a registrar:** D-539 en `specs/CONTRACT.md`.

## No-goals

- Mezclar bodegas de ciudades distintas (eso es un traslado).
- Partir el pedido en varios pedidos o varias facturas (el reparto D-361 es para integraciones; aquí sigue siendo un solo pedido y una sola factura).
- Traslados automáticos entre bodegas.
- El POS: vende desde su bodega como hoy.
- Asignación automática de bodega para pedidos de canales (`asignar-bodega-automatica` sigue en sombra).

## Preguntas para Daniel

1. ¿Va detrás de una bandera solo para ALMACEN BOMBAS, o para todos los comercios con varias bodegas en una ciudad?
2. Cuando un producto está en varias bodegas de la misma ciudad, ¿se toma de la bodega escogida primero, como propone esto, o el vendedor escoge la bodega de cada línea?
3. La Zona Franca está registrada en Rionegro. ¿Se agrupan las bodegas por una **zona** que el comercio define en cada bodega (por ejemplo «Medellín» para las 6), en vez de por ciudad? La propuesta recomienda la zona, con la ciudad como valor inicial.
