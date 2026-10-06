# Diseño: despacho por bodega y estado agregado

## Context

Hoy la unidad de despacho es el pedido. `logisticsEffect.osmosis` ya es una huella transaccional por pedido (claim con TTL de 5 min). Fullpi no tiene claim y usa `idOrden = nroPedido`, tratando "ya existe" como éxito. Los estados los escriben directo: webhook y pull de Cereza, pull de Fullpi, webhook de Enviame (sin filtro de empresa), `createShipments`, despacho por lote, la tool MCP y el frontend (`ordenes-despacho-v2`). Las notificaciones son idempotentes por (pedido, evento).

## Goals / Non-Goals

**Goals:** despachar automáticamente cada bodega de un pedido mezclado sin clics extra, sin cobros dobles y sin avisos repetidos; pedidos de una bodega idénticos a hoy.

**Non-Goals:** pedidos hijos, factura por parte, reparto en venta asistida.

## Decisions

### 1. Modelo: `dispatchParts` en el pedido
Se crea solo si `warehouseAllocation.parts.length > 1`:
`{ partId, idBodega, provider, lines: [índices], value, chargesShipping, collectsPayment, externalId, status, trackingNumber, carrier, logisticsEffect, updatedAt }`.
Array en el documento (no subcolección: pocas partes por pedido, se lee con el pedido, no requiere colección nueva).

### 2. Proveedor por firma de bodega
Resolver único `resolveWarehouseProvider(warehouse)`: `osmosisStorageCode` → `osmosis`; `fulfillmentProvider` → ese valor; si no → `manual`. Reemplaza la elección del operador solo para partes de bodegas con proveedor; las partes manuales siguen el flujo actual de Despachos.

### 3. Plata
`partId 1` = la de mayor valor: `chargesShipping = true`, `collectsPayment = true` (recauda el total pendiente del pedido). Las demás: `false/false`, viajan como pagadas (`is_paid` / tipo de pago prepagado del proveedor). `value` = suma de sus líneas, para valor declarado. Decisión de negocio pendiente de confirmar con Daniel (D-355).

### 4. Envío automático por parte
Cada parte de proveedor automático pasa por el claim generalizado (`logisticsEffect` dentro de la parte, operación `"<provider>:<orderId>:<partId>"`). Disparo: al crear el pedido y cuando cambia el pago, con las mismas reglas de elegibilidad que el proveedor tiene hoy. Los caminos viejos (botón "Enviar a Cereza", barrido de Fullpi, `createShipments`) detectan `dispatchParts` y trabajan sobre la parte que les corresponde.

### 5. Ids externos
Parte principal: `nroPedido` (compatibilidad con lo que ya existe). Otras: `nroPedido-2`, `-3`. Webhooks y pulls buscan primero la parte por id externo y después el pedido como hoy.

### 6. Agregador de estado
`applyPartStatus(order, partId, next)` en transacción: aplica la anti-regresión de la parte, recalcula el estado del pedido como el menor rango entre partes (`osmosisStatusPolicy.STATE_RANK`) y solo si el estado del pedido cambia llama a `orderNotificationService.notifyStatusChange`. Cancelación de una parte por el proveedor → `requiereAtencionLogistica` con `motivoAtencion: 'parte_cancelada'`, el pedido no se cancela. Sin partes, los escritores siguen como hoy.

### 7. UI
- Lista y panel de "Todos los pedidos": fila de chips (bodega + estado) bajo el estado del pedido; tokens del tema canónico, plano, sin gradientes.
- Despachos: filtro por bodega (parámetro opcional `idBodega` en el filtro de pedidos del backend); las partes manuales aparecen en la cola de su bodega.
- Sin botones nuevos ni pasos nuevos.

### 8. Encendido
Detrás de `DISPATCH_PARTS_MODE` (`off|active`) global y por empresa; canario en OH MY STORE con un pedido de prueba mezclado; luego todos. Retiro del flag a los 30 días (Artículo XII).

## Risks / Trade-offs
- El agregador obliga a pasar ocho escritores por un punto: se hace solo para pedidos con partes, sin tocar el camino de los demás.
- Enviame hoy busca por guía sin filtro de empresa: para partes se exige el filtro; el arreglo general queda como hallazgo aparte.
