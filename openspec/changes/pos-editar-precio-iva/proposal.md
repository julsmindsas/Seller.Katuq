## Why

El CEO reportó que en **Ventas POS** (`ventas/ventas-pos`, módulo `pos2`) no se puede cambiar el precio ni el IVA de una línea, cosa que el vendedor sí puede hacer en el paso del carrito de la **venta asistida**. Pidió que el POS funcione igual y que los valores queden íntegros de punta a punta.

Al trazar el flujo (código del 2026-10-19, sin leer ni escribir producción) aparecieron tres problemas que hoy impiden esa integridad. No dependen de ninguna bandera:

1. **El POS no conoce ningún override.** `CartService.getPOSSubTotal()` suma `precio.precioUnitarioConIva × cantidad` y `pos-order-creator` arma el pedido con ese total. La tirilla (`factura-tirilla`) pinta el mismo precio de lista.
2. **El backend guarda mal el subtotal cuando hay precio manual.** En producción corre el cálculo viejo (`IVA_PERSIST_CANONICAL` apagado). `getSubTotalPedido` y `getSubTotalNetoPedido` (`orderCalculationService.js:27-184`) **no leen `_precioManualOverride`**, pero `getTotalImpuesto` sí. El pedido queda con subtotal del precio de lista e IVA del precio manual. Ya pasa hoy en la venta asistida.
3. **Ninguna capa valida lo que llega.** `/v1/orders/create` acepta cualquier `_ivaManualOverride` (un 3 % suma al total pero no entra al `desgloseIVA`), precios manuales negativos, y confía en el `procesoComercial.permitePrecioManual` del snapshot que manda el cliente, sin compararlo con el producto real.

Además, la factura de **World Office** trata el precio manual como si incluyera IVA (`worldOfficeDataMapper.js:425-431`, "Precio manual incluye IVA, calcular sin IVA"), mientras el resto del sistema lo trata como precio **sin IVA**. Esas facturas salen por debajo del pedido. SIIGO sí lo hace bien (`precioEfectivoSinIva` + `extractEffectiveTaxPercentage`).

## What Changes

### 1. Edición por línea en el ticket del POS (front)

Cada línea del ticket tendrá lo mismo que el paso del carrito de la venta asistida:

| Control | Cuándo aparece | Regla |
|---|---|---|
| **Precio base (sin IVA)** | Solo si el producto tiene `procesoComercial.permitePrecioManual === true` | Número ≥ 0. Vacío o inválido al salir del campo → vuelve al precio original |
| **IVA** | Siempre | Selector 0 % / 5 % / 8 % / 19 % |
| **Desc. %** | Siempre | 0-100, saneado igual que en la venta asistida |
| Desglose | Siempre | "+ $IVA IVA = $precio" y total de la línea |

Los valores viajan a nivel de línea del pedido con los nombres que ya usa la venta asistida (`_precioManualOverride`, `_ivaManualOverride`, `descuentoLinea`). El total del ticket, el monto que se cobra (efectivo, tarjeta, billetera, Wompi) y la tirilla salen del mismo cálculo por línea. Una línea sin cambios se calcula **exactamente igual que hoy**.

### 2. Subtotal correcto con precio manual (backend)

`getSubTotalPedido` y `getSubTotalNetoPedido` toman el precio manual con la misma regla que ya usa `getTotalImpuesto`: el override solo vale si `permitePrecioManual === true`. Así quedan coherentes el subtotal, el descuento, el IVA y el total. Aplica a todo pedido nuevo con precio manual (POS, venta asistida, cotización convertida y app). Los pedidos ya guardados no se tocan.

### 3. Validación de integridad en el servidor (backend)

Al crear un pedido, por cada línea:

- `_ivaManualOverride` solo puede ser 0, 5, 8 o 19. Otro valor → **400** con mensaje claro.
- `_precioManualOverride` debe ser un número finito ≥ 0. Si no → **400**.
- `descuentoLinea` debe estar entre 0 y 100. Si no → **400**.
- El permiso de precio manual se lee del **producto real en Firestore** (de la empresa de la sesión), no del snapshot. Si el producto no lo permite, el override se descarta igual que hoy (no se rechaza el pedido) y queda una traza estructurada.

### 4. Factura de World Office con el precio manual correcto (backend)

`mapCartItemToWORenglon` usa el precio manual como valor **sin IVA**, igual que SIIGO, el pedido y el correo.

## Capabilities

### New Capabilities
- `pos-line-price-editing`: edición de precio base, IVA y descuento por línea en Ventas POS, con integridad entre ticket, cobro, pedido guardado, tirilla y factura, y validación en el servidor.

### Modified Capabilities
- Ninguna archivada. El cálculo de pedidos (spec 010) conserva su jerarquía: precio manual → tipo de cliente → volumen → base, con la tarifa manual por encima de todo.

## Impact

- **Front** (`Seller.Katuq`):
  - `shared/utils/pos-linea-precio.ts` (nuevo, puro).
  - `shared/services/cart.service.ts` (`getPOSSubTotal`, mismo formato de string).
  - `components/ventas/pos2/widgets/cart-summary/*` y un editor de línea pequeño (nuevo).
  - `shared/services/ventas/pos-order-creator.service.ts` (copia los overrides a la línea).
  - `components/pos/factura-tirilla/*` (precio por línea).
- **Back** (`katuq_admin_back_firebase`):
  - `functions/services/orderCalculationService.js` (dos funciones de subtotal).
  - `functions/controllers/orders.js` (`create` llama la validación).
  - `functions/services/orders/lineOverridesValidation.js` (nuevo).
  - `functions/services/accounting/utils/worldOfficeDataMapper.js`.
- **Pruebas:** `node --test` en el front y `node` en el back, con casos de referencia compartidos (mismos números en los dos repos).
- **Sin** colecciones nuevas, endpoints nuevos ni banderas nuevas.

## No-goals

- No se cambia cómo se calcula una línea del POS **sin** cambios. Hoy el POS ignora precio por volumen, tipo de cliente y promociones automáticas que el backend sí aplica; esa diferencia ya existe y va en otra propuesta.
- No se encienden `ivaCalcUnificado` ni `IVA_PERSIST_CANONICAL`.
- No se corrigen pedidos viejos (sin backfill).
- No se agrega control por rol de quién puede cambiar precios. En la venta asistida tampoco existe.
- No se valida la edición de pedidos ya creados (`edit`, IVA de línea): solo la creación. Queda como siguiente paso.
- No se toca el cupón del ticket del POS (sigue pendiente, como hoy).

## Riesgos (módulo sensible: `orders`)

- **Pedidos que hoy pasan y empezarían a fallar con 400.** Ocurre si algún cliente manda una tarifa fuera de 0/5/8/19, un precio negativo o un descuento fuera de 0-100. La web los sanea antes de enviar; falta confirmar la app móvil y la conversión de cotizaciones. Mitigación: pruebas de contrato de esos caminos antes de aplicar, y mensaje de error claro.
- **El subtotal cambia en los pedidos nuevos con precio manual.** Es la corrección buscada, pero el monto guardado ya no será el de lista. Debe anunciarse a los comercios que usan precio manual.
- **Una lectura a Firestore por línea con precio manual al crear el pedido.** Es un `getAll` en lote, solo de esas líneas.
- **Cambio a la vez:** se aplica primero el backend (2, 3 y 4) con su diff aprobado y después el front, por la regla de `orders`.
