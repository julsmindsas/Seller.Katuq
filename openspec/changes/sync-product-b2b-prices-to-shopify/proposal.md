# Propuesta: completar la publicación de precios por perfil hacia Shopify

## Why

CreaCTA (agencia de OH MY STORE) pide en su informe del 2026-07-17 que Katuq publique los precios mayorista y modelo de todos los SKUs activos y defina el sync de cambios de precio. **La mayor parte ya está construida y en producción desde junio** (commit `138def3`, 2026-06-06, rama prod): las price lists de Shopify ya tienen **7.518 precios de mayorista** cargados, los **139 clientes mayoristas ya están enrolados** como compañías B2B en el Market de su perfil, y el nodo `shopify-pricelist-sync` ya corre dentro del flow activo `cereza-products-to-shopify` (cada 5 min), refrescando los precios cuando Cereza los cambia.

Lo que falta es cerrar los huecos: la price list **Modelo solo tiene 85 precios** (hay 7.631 productos con precio modelo en Katuq), los **productos no-Cereza** no refrescan precio (el flow `katuq-web-to-shopify` no tiene el nodo de price lists), y un **cambio de precio manual en Katuq** (fuera del ciclo Cereza) no se propaga.

La decisión de transporte ya está tomada y validada por ambas partes: **Price Lists nativas de Shopify Markets** (CreaCTA confirmó en su informe que su arquitectura las lee; los tags `precio_*` de los 5 SKUs piloto fueron solo la fase de prueba).

## What Changes

- Backfill de la price list **Modelo** con los ~7.631 precios disponibles en `preciosPorTipoCliente` (el script `sync-market-prices.js` ya lo soporta; solo falta correrlo para ese perfil).
- Cubrir el refresco de precio para **productos no-Cereza** (agregar el nodo de price lists al camino que hoy no lo tiene, sin tocar sus ramas de producto/stock).
- Propagar **cambios de precio manuales** hechos en Katuq (edición de producto/import), no solo los que vienen de Cereza.
- Reporte de cobertura: cuántos SKUs con precio de perfil en Katuq quedaron publicados vs sin match en Shopify.

## Capabilities

### New Capabilities

- `shopify-product-price-sync`: cobertura completa e idempotente del precio por perfil (mayorista/modelo) por SKU, con Katuq como fuente de verdad — formaliza lo ya construido y cierra los huecos.

### Modified Capabilities

Ninguna.

## Impact

- Backend `katuq_admin_back_firebase` (prod `backend-aws-security`): reusar `marketPricingService.js`, `scripts/sync-market-prices.js` y el nodo `shopify-pricelist-sync` existentes. Scripts corren en EC2 (`shopifyService.executeGraphQL`).
- Sin colecciones nuevas, sin módulos "v2", multi-tenant default OFF (solo OMS).
- Ya en producción (no se re-hace): precios mayorista (7.518), enrolamiento de 139 mayoristas, refresco automático vía flow Cereza.
- Evidencia: commit `138def3`, memorias `shopify-ohmystore-basic-markets-pricing` y `creacta-oms-tags-precio`, decisiones D-084/D-135 de [CONTRACT](../../../specs/CONTRACT.md).
- Capacidad hermana: [`shopify-customer-type-sync`](../sync-customer-type-to-shopify/proposal.md) (metafield de tipo de cliente + enrolamiento automático de clientes nuevos).

## No-goals

- No tocar el precio público (`variant.price` del catálogo default queda intacto).
- No modificar precios ni catálogo DENTRO de Katuq (fuente de verdad, solo lectura).
- No usar tags `precio_*` — descartados; el transporte son las price lists.
- No ampliar las ramas de producto/stock de los flows mixtos existentes (aislamiento D-134).
- No tocar inventario/`InventoryLevel`.

## Risks

- Volumen del backfill modelo (~7.600) vs rate limits → el script ya es idempotente con dry-run default; correr con `--max` en lotes.
- Desfase Katuq↔Shopify (7.631 con precio modelo vs 7.197 productos en Shopify) → SKUs sin match se reportan, no se inventan.
- Agregar el nodo de price lists al camino no-Cereza debe ser en rama paralela (como se hizo en el flow Cereza) para no alterar el ajuste de inventario.
