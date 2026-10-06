# Propuesta: el pedido que llega por integración conserva el proveedor de cada producto

Cambio 1 de 3 del programa D-355 (ticket 1120). Es el más pequeño y no depende de los otros dos.

## Why

Los pedidos que entran por flows (Shopify hoy, WooCommerce por flow mañana) pasan por el nodo que resuelve el producto por referencia (`katuq-product-resolver-by-ref`). Ese nodo copia al producto embebido en la línea el `cd`, marca, código de barras, descripción, imágenes y `disponibilidad`, pero **no** copia `integrations` (`katuq-product-resolver-by-ref.transform.js:101-133`).

La guarda que protege a Cereza (`cerezaCatalogGuard.revisarCarritoParaCereza`, `cerezaCatalogGuard.js:24-59`) decide si una línea es de Cereza mirando justo `producto.integrations.osmosis` en la línea. Resultado verificado en producción (2026-10-06, solo lectura):

- Ningún pedido Shopify desde junio lleva esa marca; en venta asistida la llevan 1.615 de 1.617 líneas despachadas a Cereza.
- Cualquier pedido Shopify, aunque sea 100 % de Cereza, saldría rechazado al despacharlo desde Despachos. Los 6 pedidos Shopify de OH MY STORE de los últimos 30 días siguen sin enviarse (dos de ellos solo de Cereza).
- Los cambios 2 y 3 del programa necesitan saber el proveedor de cada línea para asignar bodega y despachar.

## What Changes

- El resolver de productos de los flows agrega al producto embebido la identidad de proveedor que ya tiene el maestro: `integrations` (solo lectura del producto).
- Aplica a todo flow que use ese nodo, de cualquier comercio: no hay nada específico de OH MY STORE.
- Script de reparación, primero en `--dry-run`, que completa esa identidad en las líneas de los pedidos de integración abiertos (no despachados, no cancelados) para que se puedan despachar sin recrearlos.

## Capabilities

### New Capabilities
- `integration-order-product-identity`: la línea de un pedido de integración lleva la identidad de proveedor del producto.

### Modified Capabilities
Ninguna.

## Impact

- Backend: `services/flows/nodes/internal/katuq-product-resolver-by-ref.transform.js` (aditivo).
- Script nuevo en `functions/scripts/` con `--dry-run` por defecto.
- Write-set: solo `orders` (líneas embebidas de pedidos abiertos, vía script). `products`, catálogo, precios y listas de precios son de solo lectura.
- Sin colecciones nuevas, sin endpoints nuevos, sin cambios de UI.

## No-goals

- No cambia cómo se asigna la bodega del pedido (eso es el cambio 2).
- No despacha pedidos solo ni cambia el filtro de pago del envío automático a Cereza.
- No toca los flows mixtos de producto y precios de OH MY STORE.

## Riesgos

- Un pedido mezclado (ORE-001393) seguirá rechazado por la guarda, ahora con el motivo correcto: los productos ajenos. Es lo esperado hasta el cambio 3.
- El script toca pedidos reales: corre en `--dry-run`, se revisa la lista con Daniel y solo después se aplica.
