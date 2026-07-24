# Evidencia de implementación en rama — push multibodega Cereza

Fecha: 2026-07-23. Rama local backend: `codex/inventory-stabilization-openspec`. No desplegado y sin escrituras en Firestore productivo.

## Contrato implementado

- Los dos caminos de push —servicio manual y nodo de flow— resuelven la bodega por coincidencia exacta y única de `warehouses.company + idBodega`.
- El payload usa únicamente `warehouses.osmosisStorageCode`; se retiró la heurística que extraía números del business code.
- La configuración Osmosis acepta `defaultCarrierCode`. Antes de llamar a Cereza, ambos caminos exigen un valor no vacío y lo envían como `carrier_code`.
- Bodega inexistente, duplicada, sin storage, carrier ausente y empresa incorrecta fallan cerrado.
- Una respuesta sin `order.id` no se considera éxito y no mueve el pedido a `EnDespacho`.
- `LogisticsManager`, el flow Shopify y el pago tardío compiten por la misma huella `logisticsEffect.osmosis`; un claim vigente impide una segunda llamada concurrente.
- La cancelación usa `logisticsEffect.osmosisCancellation`: sin ID externo no llama; si el push está en vuelo espera el ID; el estado terminal del pedido no puede ser revivido por una respuesta tardía.
- Todo bloqueo deja `requiereAtencionLogistica`, código de error y una nota deduplicada; el retry continúa disponible.
- El estado avanza y la alerta se limpia solo después de persistir un ID externo.
- No hay escrituras sobre `products`, variantes, precios, listas de precios ni inventario.

## Prueba aislada

Firestore Emulator, proyecto `demo-katuq-cereza-order-routing-tenant-20260723`, con cliente Osmosis simulado:

`PASS emulator: Cereza usa mapping+carrier, falla cerrado e idempotente`

Casos cubiertos:

- business code alfanumérico largo resuelto por maestro, sin regex;
- bodega inexistente y bodega duplicada;
- push manual con `PreAprobado`, storage `1A`, carrier configurado e ID externo;
- reintento manual y reintento del flow sin segundo create;
- carrier ausente y storage ausente: cero llamadas externas, alerta visible y estado sin avance;
- respuesta de proveedor sin ID: alerta y pedido todavía `ParaDespachar`;
- rechazo por cruce de empresa;
- lote parcial con un pedido válido y otro sin storage: el primero conserva su ID/estado individual y el segundo queda bloqueado; nunca se marca todo el lote como enviado;
- carrera entre flow y `orders/paid`: una sola operación obtuvo el claim; la segunda observó `in_flight`;
- carrera push/cancelación: un solo create, una sola cancelación y el pedido permaneció `Cancelado`;
- documento de producto y precios idénticos antes/después.

Prueba adicional:

`PASS emulator: cancelación Cereza es idempotente y gana la carrera contra push`

## Bloqueante externo

No se conoce todavía el valor válido de `defaultCarrierCode` para OH MY STORE. La configuración productiva no fue modificada y no se hizo probe ni canario. Hasta confirmar ese dato con Cereza y aprobar un pedido controlado, esta ruta no se activa.
