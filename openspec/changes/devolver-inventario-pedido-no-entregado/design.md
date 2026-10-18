# Diseño — devolver inventario de un pedido despachado que no se entregó

Propuesta aprobada por Daniel el 2026-10-18 (ticket 1299, D-493).

## Recorrido actual (leído el 2026-10-18)

| Camino | Front | Backend | Devolución |
|--------|-------|---------|------------|
| Pedidos (detalle, lista, menús) | `ventas/list/list.component.ts` `cambiarEstadoPago` (≈6968) | `POST /v1/orders/edit` → `updateOrderInternal` | `decidirDevolucionPorPago` (orders.js ≈3909-3948) → `devolverInventarioLegacy` → `restoreStock` |
| POS | `pos/pos-list/list.component.ts` `cambiarEstadoPago` (≈633) | igual | igual |
| Tesorería | `tesoreria/components/cambiar-estado-pago` → `treasury.changePaymentState` | `POST /v1/treasury/orders/:id/payment-state` → `changeOrderPaymentState` (≈1096) → `applyOrderUpdate` → `updateOrderInternal` (`skipTreasuryGuard`) | igual |

La devolución solo corre en el modo de inventario legacy
(`useLegacyOrderEditInventory`). Venta asistida y Punto Verde Vidagas están en
legacy (`companyConfig.inventoryLedgerModes` vacío).

## Decisiones

### D1. Un campo de solicitud, no del pedido

El front envía `mercanciaVolvioABodega: true | false` junto al cambio de pago.

- `updateOrderInternal` lo lee y lo **borra de `updateData`** antes de guardar,
  como `confirmacionWhatsapp`. No queda en el pedido.
- Tesorería: el controlador lo toma de `req.body` y `changeOrderPaymentState` lo
  pasa en el objeto que va a `applyOrderUpdate`.
- Ausente equivale a `false`: MCP, integraciones, edición masiva y transportador
  siguen igual.

### D2. La regla vive en `decidirDevolucionPorPago`

Nuevo argumento `mercanciaVolvio`. Orden de chequeos:

1. `EL_PAGO_NO_CAMBIO`, `PAGO_NO_MUERTO` y `PAGO_YA_ESTABA_MUERTO`: sin cambios.
   Un pago que ya estaba muerto ya tuvo su oportunidad de devolver.
2. Proceso en En despacho, Despachado, Entregado o Cerrado:
   - con `mercanciaVolvio === true` → `{ devolver: true, razon: 'MERCANCIA_VOLVIO_CONFIRMADA' }`;
   - sin ella → `MERCANCIA_YA_SALIO`, como hoy.
3. `EL_PROCESO_YA_DEVOLVIO` y `PAGO_CANCELADO_SIN_DESPACHAR`: sin cambios.

Función pura, con pruebas propias.

### D3. Rastro de quién confirmó

`restoreStock` recibe la opción `confirmadoPor` (correo). Cuando viene:

- el movimiento de devolución guarda `mercanciaVolvioConfirmadaPor`;
- la observación termina en "— el producto volvió a la bodega".

Es aditivo: el resto de llamadas no lo envían. El `_audit` de `restoreStock` ya
deja el registro en `inventory_audit`.

Idempotencia sin cambios: `_hasBeenRestored` evita una segunda devolución.

### D4. Cuándo pregunta el front

Una función pura compartida
(`shared/utils/pedido-mercancia-devuelta.ts`):

```ts
debePreguntarSiVolvio(pagoActual, pagoNuevo, proceso): boolean
```

Responde `true` solo si se cumplen las tres:

- el pago nuevo es Cancelado, Precancelado o Rechazado;
- el actual no lo era;
- el proceso es En despacho, Despachado, Entregado o Cerrado.

Son las mismas listas del backend, copiadas con referencia cruzada en el
comentario.

La pregunta es un Swal (regla dura: nunca `confirm()`):

| Título | Texto | Botones |
|--------|-------|---------|
| "¿El producto volvió a la bodega?" | "El pedido figura como {estado}. Si el producto regresó, Katuq lo devuelve al inventario de la bodega de donde salió." | `confirm` "Sí, volvió", `deny` "No, el cliente lo tiene", `cancel` "Cancelar" |

- **Cancelar o cerrar** restaura los valores originales del modal y no guarda.
- **Confirmar con "Sí"** muestra después el aviso de éxito "Estado de pago
  actualizado" y agrega "El inventario se devolvió a la bodega".

### D5. Sin bandera por comercio

La devolución solo ocurre con un "Sí" explícito de una persona. La regla por
defecto del ticket 1035 no cambia, así que no hace falta modo sombra.

## Riesgos

- **Un "Sí" por error devuelve stock.** Se mitiga con la pregunta explícita, el
  rastro de quién confirmó y el ajuste manual de inventario que sigue disponible.
- **Modo ledger.** El campo se ignora y la pregunta no cambia nada en una
  empresa con `assisted_sale` transaccional. Se acepta (no-goal); el aviso de
  "El inventario se devolvió" solo se muestra si el servidor confirma (ver T2.4).

## Write-set

`inventory` e `inventoryMovement` vía `restoreStock`, más `inventory_audit`. No
se toca `products`, precios ni catálogo (D-134).
