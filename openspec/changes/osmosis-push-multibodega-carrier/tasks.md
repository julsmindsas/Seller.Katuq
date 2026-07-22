# Tasks

## 1. Warehouse por fuente de verdad
- [ ] 1.1 Helper `resolveCerezaWarehouseCode(companyId, bodegaId)` en `services/integrations/osmosis/` (lookup warehouses → osmosisStorageCode; fallback config.bodegaCode; fallback heurística legada; cache simple por llamada)
- [ ] 1.2 Usarlo en `osmosisOrderService._mapCarritoToItems` (resolver 1 vez por orden, async antes del map)
- [ ] 1.3 Usarlo en `flows/nodes/osmosis/osmosis-order-create.action.js` (reemplaza `_extractCerezaWarehouseCode` inline)

## 2. carrier_code
- [ ] 2.1 Leer `config.defaultCarrierCode` de `integration_configs` y agregar `carrier_code` al payload (ambos caminos)
- [ ] 2.2 [BLOQUEANTE EXTERNO] Confirmar valor válido para OMS (probe autorizado a la API o respuesta de Cereza) y setearlo en la config de prod

## 3. Visibilidad del fallo
- [ ] 3.1 En el catch del push (service): `requiereAtencionLogistica: true` + nota en `notasPedido.notasFacturacionPagos` (patrón existente del front)

## 4. Verificación y cierre
- [ ] 4.1 Test unitario del helper (mapeada / default / legacy)
- [ ] 4.2 Deploy a prod real (13.222.206.185, manual de deploy) y reintentar push de ORE-000450 → esperado: orden en Cereza con warehouse "1A"
- [ ] 4.3 Registrar D-131 en CONTRACT.md + bitácora + actualizar ClickUp (tarea "Estoy enviando estos pedidos…")
