# Tasks

Módulo sensible (orders/inventory): un cambio a la vez, cada uno con diff y aprobación explícita antes de aplicar.

## 1. Servicio de asignación (sin efectos)
- [x] 1.1 Leer completos `orderService.js`, `controllers/orders.js` (create), `inventoryService.js` (updateByChannel, _planDescuento, updateByChannelFromWebhook), `orderInventoryEffectLedger.js` y `orderInventoryRolloutService.js`
- [x] 1.2 Servicio puro `warehouseAllocationService` (candidatas, afinidad de proveedor, cobertura voraz, desempates, no inventariables por historial); solo lecturas filtradas por `company`
- [x] 1.3 Tests unitarios con los casos reales: ORE-001393, comercio de una bodega, canal sin asociaciones, asociación cruzada de otra empresa, ciudad "Bogotá D.C.", faltante, producto sin bodega de su proveedor

## 2. Sombra
- [ ] 2.1 Flags `ALLOCATION_MODE` y `companyConfig.warehouseAllocation.mode`; en sombra guardar solo `warehouseAllocation` con `mode: 'shadow'`
- [ ] 2.2 Invocar en `orderService.createOrder` y en `controllers/orders.js` create (solo pedidos sin bodega escogida) y en `katuq-order-upsert` con `preferredWarehouse`
- [ ] 2.3 Desplegar en sombra, 7 días; reporte de solo lectura que compare la asignación sombra con lo que hizo el sistema

## 3. Activo
- [ ] 3.1 Escribir `carrito[i].idBodega`, `bodegaId` de la parte mayor y el aviso "varias bodegas"
- [ ] 3.2 Rollout de inventario: pasar `commitAllocations` desde las líneas al ledger
- [ ] 3.3 Legacy: `updateByChannel`, `updateByChannelFromWebhook` y `katuq-inventory-adjust` usan la bodega de la línea cuando existe
- [ ] 3.4 Flow Shopify OMS: nueva versión con bodega como preferencia y ajuste por línea; la anterior queda para revertir
- [ ] 3.5 Contract test del write-set: falla si se escribe `products`, catálogo, precios o listas de precios

## 4. Verificación y cierre
- [ ] 4.1 Build y tests del backend sin errores
- [ ] 4.2 Canario: activar en OH MY STORE, verificar un pedido Shopify mezclado real o de prueba (líneas, inventario, aviso) y uno de una sola bodega; luego activar para todos
- [ ] 4.3 Registrar cierre contra D-355 en CONTRACT.md; programar retiro de flags a los 30 días
