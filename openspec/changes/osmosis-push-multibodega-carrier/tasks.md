# Tasks

## 1. Warehouse por fuente de verdad
- [x] 1.1 Helper `resolveCerezaWarehouseCode(companyId, bodegaId)` en `services/integrations/osmosis/` (lookup tenant-aware `warehouses` → `osmosisStorageCode`; si falta, error bloqueante; reutilización solo dentro de la operación, sin caché global)
- [x] 1.2 Usarlo en `osmosisOrderService._mapCarritoToItems` (resolver 1 vez por orden, async antes del map)
- [x] 1.3 Usarlo en `flows/nodes/osmosis/osmosis-order-create.action.js` (reemplaza `_extractCerezaWarehouseCode` inline)

## 2. carrier_code
- [x] 2.1 Leer `config.defaultCarrierCode` de `integration_configs`, bloquear si falta y agregar `carrier_code` al payload en ambos caminos
- [ ] 2.2 [BLOQUEANTE EXTERNO] Confirmar valor válido para OMS (probe autorizado a la API o respuesta de Cereza) y setearlo en la config de prod

## 3. Visibilidad del fallo
- [x] 3.1 En todo fallo o configuración incompleta: `requiereAtencionLogistica: true` + nota operativa; confirmar que el pedido no queda marcado como despachado
- [x] 3.2 Cancelación idempotente por Logística: sin ID no llamar; con ID cancelar una vez; push concurrente no revive el pedido y recoge la intención pendiente

## 4. Verificación y cierre
- [x] 4.1 Contract tests y tests unitarios (bodega mapeada / bodega sin mapping / carrier ausente / respuesta sin ID / cancelación concurrente)
- [ ] 4.2 Ejecutar canario autorizado con un pedido controlado o uno fallido seleccionado, verificar warehouse `1A`, carrier, ID externo y rollback; no reintentar producción en lote
- [ ] 4.3 Registrar cierre contra D-133 en CONTRACT.md + evidencia + actualizar la tarea ClickUp existente
