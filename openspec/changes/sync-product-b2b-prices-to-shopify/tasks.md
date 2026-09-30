# Tasks

## 1. Backfill de precios Modelo (lo más rápido de cerrar)
- [x] 1.1 En EC2: dry-run ejecutado 2026-07-22 — 8.402 escaneados, 4.284 cargarían, 1.750 sin precio modelo, 0 errores (anomalía OHM-814=$1 aceptada por Daniel)
- [x] 1.2 Aplicado 2026-07-22: 5.578 precios de variante, 0 errores; price list Modelo verificada 85 → 5.583 fixed prices
- [ ] 1.3 Verificar con un buyer modelo logueado (o contextualPricing) que el storefront resuelve el precio modelo

## 2. Refresco de precio para productos no-Cereza
- [x] 2.1 **Reemplazado (D-331):** no se tocó el flow mixto `katuq-web-to-shopify` (D-134). Se programó el barrido del ticket 1021 (`oms-shopify-pricelist-sweep`, handler `shopifyPricelistExpirySweep`, 1:40/7:40/13:40/19:40 COT), que reconcilia TODO el catálogo publicado contra el precio efectivo de Katuq, Cereza y no-Cereza. El 29-sep faltaban 120 productos no-Cereza en la lista Mayorista (p. ej. JCR4202 BODY ROJO: mayorista veía $177.196 en vez de $88.598).
- [x] 2.2 Verificado en seco en el EC2 (69 s, 205 MB, 3.756 productos por corrida; los 2.427 sin variantes cacheadas entran de a 300 con cursor).

## 3. Cambio de precio manual en Katuq
- [x] 3.1 **Cubierto por el barrido (D-331):** un cambio manual llega a la price list en la siguiente corrida (máx. ~6 h). Sin evento nuevo en la edición de producto.
- [x] 3.2 Cubierto por `tests/shopify/marketPricingSweep.test.js` (reconcilia contra el precio efectivo de Katuq).

## 4. Cobertura y cierre
- [x] 4.1 `tests/shopify/marketPricingTierPrice.test.js` (price list) y `tests/shopify/b2bEnrollmentService.test.js` (companies/contactos/roles/market).
- [x] 4.2 Cobertura medida el 29-sep (Mayorista): 6.160 de 6.168 productos con precio correcto (antes 6.019); 2 con variante inexistente y 6 con dos productos de Katuq apuntando al mismo de Shopify.
- [ ] 4.3 Build sin errores; registrar cierre en CONTRACT.md + actualizar tarea ClickUp + correo a CreaCTA
