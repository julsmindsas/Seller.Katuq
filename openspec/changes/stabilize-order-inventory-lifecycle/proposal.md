# Propuesta: estabilizar inventario durante el ciclo del pedido

## Why

Hoy el efecto de inventario depende del camino que toma el pedido: Venta Asistida descuenta al crear; Shopify pasa por `/flows`; Logística envía a Cereza; cancelaciones y cambios de cantidad restauran o descuentan por rutas distintas. Los reintentos y webhooks duplicados pueden repetir efectos, mientras un rechazo del proveedor puede quedar parecido a un despacho exitoso.

La regla de negocio debe ser una sola: cada pedido compromete unidades una vez, cada cambio aplica únicamente su diferencia y cada liberación ocurre una vez. En OH MY STORE, `Pagado`, `Aprobado` y `PreAprobado` comprometen inventario; los demás estados esperan. Al perder esa elegibilidad se devuelve exactamente el efecto aplicado, nunca unidades que no se habían descontado.

## What Changes

- Definir el momento exacto del efecto de inventario por canal y estado de pago; Venta Asistida, POS y Shopify obedecen el mismo conjunto elegible.
- Separar compromiso de inventario de despacho logístico para impedir doble descuento.
- Procesar `orders/paid` y los estados internos `Pagado`/`Aprobado`/`PreAprobado` como una misma transición operativa idempotente.
- Liberar una sola vez al salir del conjunto elegible, enlazando los movimientos originales.
- Tratar el push a Cereza como exitoso únicamente cuando exista confirmación e ID externo.
- Mantener el compromiso de un pedido pagado mientras un push fallido espera reintento.
- Liberar una sola vez al cancelar, rechazar o retirar cantidades.
- Aplicar idempotencia a eventos, cambios de cantidad, reintentos y despacho manual.

## Capabilities

### New Capabilities

- `inventory-order-lifecycle`: contrato de inventario desde la creación del pedido hasta su cierre o reversa.

### Modified Capabilities

Ninguna. El cambio activo `osmosis-push-multibodega-carrier` conserva su propia capacidad y es una dependencia.

## Impact

- Venta Asistida, pedidos Shopify, `/flows`, inventario, Logística/Despachos y proveedor Osmosis/Cereza.
- Depende de `stabilize-inventory-ledger` y de `osmosis-push-multibodega-carrier` aplicado y verificado.
- No crea otra colección de reservas; la huella aplicada vive dentro del pedido y el saldo operativo sigue en Katuq.
- Decisión de programa: D-134.

## No-goals

- No cambiar precios, impuestos, facturación o consecutivos.
- No modificar productos, variantes, categorías, imágenes, listas de precios ni precios por cliente.
- No enviar pedidos con estado de pago no elegible automáticamente a Cereza.
- No descontar otra vez al crear una guía o despacho.
- No configurar Cereza para comercios que no la usan.

## Risks

- Un evento de pago tardío puede llegar repetido o fuera de orden; la transición debe ser idempotente.
- Cambiar juntos inventario y despacho aumenta el radio de impacto; se habilita cada origen por separado.
- Conservar un compromiso durante un error de Cereza reduce disponibilidad, pero evita vender dos veces unidades de un pedido ya pagado.
