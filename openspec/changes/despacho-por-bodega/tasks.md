# Tasks

Módulo sensible (orders/despachos): un cambio a la vez, cada uno con diff y aprobación explícita antes de aplicar.

## 1. Modelo y resolver
- [ ] 1.1 Leer completos `cerezaOrderDispatchService.js`, `osmosisOrderService.js`, `fullpiOrderService.js`, `logisticsManager.js`, `logisticsIntegrations.js` (createShipments), `logistica.js` (despacho), `osmosisWebhookService.js`, `WebhookManager.js`, `orderNotificationService.js`
- [ ] 1.2 Crear `dispatchParts` desde `warehouseAllocation` (solo con 2+ bodegas), con parte principal por valor, `chargesShipping`/`collectsPayment` y `value`
- [ ] 1.3 `resolveWarehouseProvider(warehouse)` con tests (Cereza, Fullpi, propia)

## 2. Envío por parte
- [ ] 2.1 Generalizar el claim de `logisticsEffect` a nivel de parte
- [ ] 2.2 Cereza acepta una parte: sub-carrito, bodega de la parte, totales y recaudo de la parte, id externo por parte
- [ ] 2.3 Fullpi acepta una parte, con claim e id externo por parte
- [ ] 2.4 Caminos viejos (botón "Enviar a Cereza", barrido Fullpi, `createShipments`) respetan las partes o se niegan con mensaje claro
- [ ] 2.5 Disparo automático por parte al crear el pedido y al cambiar el pago

## 3. Estado agregado
- [ ] 3.1 `applyPartStatus` en transacción con anti-regresión y notificación única por evento del pedido
- [ ] 3.2 Webhook y pull de Cereza, pull de Fullpi y webhook de Enviame resuelven la parte por id externo (con filtro de empresa) y usan el agregador
- [ ] 3.3 Escritores directos de `estadoProceso` (despacho por lote, tool MCP, `ordenes-despacho-v2`) pasan por el agregador cuando hay partes
- [ ] 3.4 Cancelación de una parte → atención, no cancelación del pedido

## 4. UI
- [ ] 4.1 Chips de partes en la lista y el panel de "Todos los pedidos" (tema canónico, sin gradientes)
- [ ] 4.2 Filtro por bodega en Despachos (parámetro opcional en el filtro de pedidos del backend, vía servicio que extiende BaseService)
- [ ] 4.3 `npm run build` sin errores

## 5. Verificación y cierre
- [ ] 5.1 Tests: pedido de una bodega idéntico a hoy, pedido mezclado, doble disparo, despacho escalonado, cancelación de una parte, webhook atrasado, recaudo solo en la principal
- [ ] 5.2 Canario en OH MY STORE con un pedido de prueba mezclado autorizado; verificar en Cereza y Fullpi que llegó cada parte una vez
- [ ] 5.3 Registrar cierre contra D-355 en CONTRACT.md; programar retiro del flag a los 30 días
