# Tasks

## 1. Backfill de precios Modelo (lo más rápido de cerrar)
- [x] 1.1 En EC2: dry-run ejecutado 2026-07-22 — 8.402 escaneados, 4.284 cargarían, 1.750 sin precio modelo, 0 errores (anomalía OHM-814=$1 aceptada por Daniel)
- [x] 1.2 Aplicado 2026-07-22: 5.578 precios de variante, 0 errores; price list Modelo verificada 85 → 5.583 fixed prices
- [ ] 1.3 Verificar con un buyer modelo logueado (o contextualPricing) que el storefront resuelve el precio modelo

## 2. Refresco de precio para productos no-Cereza
- [ ] 2.1 Extender/replicar el seed `add-pricelist-node-to-cereza-flow.js` para inyectar `shopify-pricelist-sync` en rama paralela del flow `katuq-web-to-shopify` (leer el flow real antes; NO tocar sus ramas de producto/stock)
- [ ] 2.2 Verificar un run del flow con el nodo activo: producto no-Cereza con cambio de precio refresca su price list

## 3. Cambio de precio manual en Katuq
- [ ] 3.1 Detectar cambio de `preciosPorTipoCliente` en la edición de producto y disparar el refresco del SKU (definir evento vs llamada directa con traza; leer el controller antes)
- [ ] 3.2 Test: editar precio mayorista de 1 SKU en Katuq → price list actualizada sin re-escribir el resto

## 4. Cobertura y cierre
- [ ] 4.1 Contract test del write-set: falla si sale una mutación distinta de price list / companies-market (nunca producto, precio público, InventoryLevel, ni escrituras en Katuq)
- [ ] 4.2 Reporte de cobertura por perfil (Katuq vs fixed prices en Shopify) para responderle a CreaCTA con números
- [ ] 4.3 Build sin errores; registrar cierre en CONTRACT.md + actualizar tarea ClickUp + correo a CreaCTA
