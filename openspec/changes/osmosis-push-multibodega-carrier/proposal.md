# Propuesta: Push de pedidos a Osmosis con bodega discriminada + carrier_code

## Why (con datos reales, no asunciones)

Cindy (OMS) reporta que los pedidos de prueba con bodega discriminada "no llegan a Osmosis" (doc 2026-07-22, necesarios para pruebas E2E). Diagnóstico en prod (read-only, 2026-07-22):

1. **Cereza ahora exige `carrier_code`**: los pushes del 21/07 (ORE-000450/451/452, bodega `BOD-CEREZA-1A`) quedaron rechazados con `Validacion fallida: The carrier code field is required. (and 1 more error)` (persistido en `integrations.osmosis.error`). Nuestro payload **nunca ha enviado carrier**; la doc local (`docs/Integraciones/Osmosis_API.postman_collection.json`, guías) tampoco lo menciona → validación **nueva del lado Cereza**. El último push exitoso fue ORE-000446 (16/07, bodega `BOD-CEREZA-1`, osmosisId 92).
2. **`items[].warehouse` viaja mal para bodegas nuevas**: `_extractCerezaWarehouseCode` (duplicada en `osmosisOrderService.js:467` y `flows/nodes/osmosis/osmosis-order-create.action.js`) es una heurística regex que solo extrae códigos **que terminan en dígitos**: `BOD-CEREZA-1`→`"1"` ✅, pero `BOD-CEREZA-1A`→`"BOD-CEREZA-1A"` literal ❌ y `BOD-102`→`"102"` (storage inexistente) ❌. Los storage reales de OMS hoy: `1, 1A, 1B, 51` y **ya están mapeados** en `warehouses.osmosisStorageCode` (D-110). El doc `docs/Integraciones/cereza-warehouse-mapping.md` (mayo) ya pedía este mapping declarativo; nunca se implementó.
3. **El error no le llega al operador**: queda en `integrations.osmosis.error` (backend) pero la lista de pedidos no lo muestra → "no llegan y no sé por qué".

## What Changes

- **A. Warehouse por fuente de verdad y fallo cerrado**: helper compartido `resolveCerezaWarehouseCode(companyId, bodegaId)` → busca `warehouses` (company + `idBodega`) y devuelve `osmosisStorageCode`. Si la bodega del pedido no tiene mapping, **no se adivina ni se usa la bodega default**: el push se bloquea con atención operativa. Se usa en los DOS caminos de push (service + flow node).
- **B. `carrier_code` obligatorio y configurable por comercio**: nuevo campo `config.defaultCarrierCode` en `integration_configs/<company>_osmosis` (canónica EN, Artículo XV). Si falta, el sistema bloquea antes de llamar a Cereza y muestra el motivo. Valor real para OMS: **pendiente confirmar** (probe a la API con autorización, o respuesta de Cereza).
- **C. Visibilidad del fallo (cero FE nuevo)**: al fallar un push, además del error en `integrations.osmosis`, marcar `requiereAtencionLogistica: true` + nota en `notasPedido.notasFacturacionPagos` — la lista de pedidos **ya** pinta ese triángulo de atención con tooltip (patrón existente).

## Impact

- Specs afectadas: `osmosis-order-push` (delta nuevo).
- Código: `functions/services/integrations/osmosis/osmosisOrderService.js`, `functions/services/flows/nodes/osmosis/osmosis-order-create.action.js`, helper nuevo en `functions/services/integrations/osmosis/`.
- Config prod: `integration_configs` de OH MY STORE (agregar `defaultCarrierCode`).
- Sin colecciones nuevas; multi-tenant (nada hardcodeado, requisito duro del CONTRACT).
- Decisión reservada: **D-133** en CONTRACT.md.

## Riesgos / no-objetivos

- No tocamos el pull de estados ni el sync de productos.
- No modificamos productos, variantes, precios ni listas de precios en Katuq, Cereza o Shopify.
- BOD-102 u otra bodega no mapeada queda bloqueada; no se despacha desde una bodega distinta por conveniencia.
- El valor de `carrier_code` es dato de negocio de Cereza: sin él, el cambio no puede entrar en canario (bloqueante externo).
