# Preguntar si el producto volvió a la bodega al cancelar un pedido despachado

## Why

Ticket 1299 (Punto Verde Vidagas). El pedido gas-000008 no se llevó al cliente y
se canceló, pero la recarga de 10 lb nunca volvió al inventario.

Lo que pasó, leído del historial del pedido el 2026-10-18:

| Hora | Cambio | Quién |
|------|--------|-------|
| 11:51 | Para despachar → En despacho → Despachado | el asesor |
| 12:14 | Despachado → **Entregado** | el domiciliario, desde su enlace |
| 12:25 | Pago → **Cancelado** | el asesor |
| 12:25 | Entregado → Cerrado | el asesor |

Al cancelar el pago, Katuq devuelve el inventario solo si la mercancía no ha
salido (ticket 1035, `decidirDevolucionPorPago` en
`services/inventory/devolucionPorPagoCancelado.js`). Con el pedido en En
despacho, Despachado, Entregado o Cerrado responde `MERCANCIA_YA_SALIO` y no
devuelve nada. La regla es correcta en la mayoría de casos: en la medición del
ticket 1035, 530 de 720 cancelaciones eran cobros de mercancía que el cliente sí
tenía.

El problema: el estado no siempre dice la verdad. Un domiciliario que marca
Entregado por error, o un pedido que se devuelve en la puerta, deja la mercancía
de vuelta en la bodega y Katuq no tiene cómo enterarse. Hoy el comercio no puede
corregirlo desde la pantalla; necesita un ajuste manual de inventario o pedirlo
a soporte.

## What Changes

- **Una pregunta al cancelar.** Al cambiar el pago a Cancelado, Precancelado o
  Rechazado de un pedido En despacho, Despachado, Entregado o Cerrado, Katuq
  pregunta: "¿El producto volvió a la bodega?"
  - **Sí, volvió:** se devuelve el inventario a la bodega de donde salió, con la
    misma entrada de devolución de una cancelación normal y quién la confirmó.
  - **No, el cliente lo tiene:** queda como hoy, sin devolver.
- **Aplica a los dos lugares que cancelan el pago:** el modal "Cambiar estado de
  pago" de Pedidos (detalle, lista, menús y POS) y Tesorería.
- **El servidor manda.** El front solo envía la respuesta; el servidor vuelve a
  revisar que el pago quede cancelado, que haya salidas por devolver y que no se
  haya devuelto antes (la devolución sigue siendo única por pedido).
- **Sin la respuesta, igual que hoy.** Si alguien cancela por otro camino (MCP,
  integraciones, edición masiva), no se devuelve nada en esos estados.
- **Corrección del caso del ticket:** gas-000008 se ajusta aparte, con la misma
  devolución, una sola vez.

## Capabilities

### Modified Capabilities
- `inventario-devolucion-por-pago`: la devolución por pago cancelado admite la
  confirmación explícita de que la mercancía volvió, aun con el pedido
  despachado, entregado o cerrado.

## No-goals

- Cambiar la regla por defecto del ticket 1035. Sin confirmación, un pedido
  despachado sigue sin devolver.
- Devoluciones parciales (volvió una parte). Para eso está quitar la línea del
  pedido.
- Un botón "Devolver a bodega" para pedidos ya cancelados. Se puede agregar
  después si aparece otro caso como gas-000008.
- El modo de inventario transaccional (ledger). Esta empresa y la venta asistida
  usan el modo legacy; el ledger tiene su propia política de pagos.

## Impact

- Front: modal de cambiar estado de pago (`ventas/list`), POS list y Tesorería.
- Backend: `devolucionPorPagoCancelado.js` (nueva razón), `updateOrderInternal`
  en `controllers/orders.js` y `changeOrderPaymentState` de Tesorería.
- Inventario: write-set sin cambios (`inventory`, `inventoryMovement`,
  `inventory_audit`), por `InventoryService.restoreStock`.
- Decisión: D-493.
