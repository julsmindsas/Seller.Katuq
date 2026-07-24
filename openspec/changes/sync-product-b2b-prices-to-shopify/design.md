# Diseño: shopify-product-price-sync

## Lo que YA existe en producción (no se re-hace)

Commit `138def3` (2026-06-06, en `backend-aws-security`):

- `services/shopify/marketPricingService.js` — resuelve la price list por perfil y empuja precios fijos por variante (`priceListFixedPricesAdd`, upsert idempotente). Match variante↔producto por **SKU = referencia Katuq**. Preferencia de precio: `preciosPorTipoCliente` → fallback `precio.variantesOsmosis` (lista 3 para mayorista).
- `scripts/sync-market-prices.js` — backfill por perfil, dry-run default, `--sku`/`--max`/`--tier`. Ya corrió: **Mayorista = 7.518 precios, Modelo = 85**.
- `scripts/sync-b2b-companies.js` — enrolamiento de clientes del perfil como B2B Company+Location agregada a las conditions del Market. Ya corrió: **139/139 mayoristas**. Idempotente (cache en `clients/{id}.integrations.shopify` → NIT → create).
- Nodo `shopify-pricelist-sync.action.js` — registrado en `nodes/shopify/index.js` **y** en `contracts/node-catalog.ts` (la fuente real del registry es el .ts). Inyectado en el flow activo `cereza-products-to-shopify` en **rama paralela** al upsert (verificado read-only 2026-07-22): cambios de Cereza refrescan price lists cada 5 min.

Arquitectura Shopify (OMS es plan Basic, sin B2B catalogs directos): **Company → CompanyLocation en las conditions del Market → Catalog del Market → Price List**. Markets: Mayorista `21544042702`, Modelo `21544141006`.

## Decisión de transporte — CERRADA

**Price Lists nativas.** CreaCTA confirmó en su informe (2026-07-17) que su arquitectura final las lee (Markets & Catalogs + contextualPricing). Los tags `precio_*:VALOR` de los 5 SKUs piloto fueron fase de prueba y no se formalizan. Ventaja adicional: las price lists son una superficie distinta al producto, el re-sync de `shopify-product-upsert` no las pisa.

## Lo que falta (alcance real de este cambio)

| Hueco | Diseño |
|---|---|
| Price list Modelo casi vacía (85 vs 7.631) | Correr `sync-market-prices.js --tier modelo` en EC2, dry-run → lotes con `--max` → completo. El servicio ya resuelve modelo desde `preciosPorTipoCliente`. |
| Productos no-Cereza sin refresco de precio | Agregar el nodo `shopify-pricelist-sync` al flow `katuq-web-to-shopify` en rama paralela (patrón del seed `add-pricelist-node-to-cereza-flow.js`), sin tocar sus ramas de producto/stock. |
| Cambio de precio manual en Katuq no se propaga | Detectar el cambio de `preciosPorTipoCliente` en la edición de producto (controller de productos) y disparar el refresco del SKU vía el mismo nodo/servicio. Definir si se emite evento al motor de flows o llamada directa al servicio con traza de run. |
| Cobertura no medida | Reporte comparando SKUs con precio de perfil en Katuq vs fixed prices en cada price list (read-only), para responderle a CreaCTA con números. |

## Write-set declarado

- Escribe **solo** entradas de price list (`priceListFixedPricesAdd`) y, en el enrolamiento, Companies/conditions de Market.
- NO escribe productos/variantes/imágenes/tags de Shopify, NO toca `variant.price` público, NO toca `InventoryLevel`.
- NO escribe nada en Katuq salvo el cache de IDs en `clients/{id}.integrations.shopify` (patrón ya existente).

## Testing

1. Contract test del write-set (falla si sale una mutación fuera de la lista de arriba).
2. Dry-run del backfill modelo y revisión de conteos antes de aplicar.
3. E2E con CreaCTA: buyer modelo logueado ve el precio modelo en el storefront.

## Open questions

- ¿El disparo del cambio manual de precio va por evento del motor de flows o llamada directa con traza? (definir al implementar, según lo que ya haga el controller de productos).
- Storage "51" de Cereza y perfiles adicionales futuros: confirmar con OMS/CreaCTA que los perfiles siguen siendo solo Público/Mayoristas/Modelos.
