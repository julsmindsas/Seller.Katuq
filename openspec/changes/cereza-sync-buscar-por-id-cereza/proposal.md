## Why

`osmosisProductSyncService` busca la ficha de un producto de Cereza solo por referencia (`identificacion.referencia`). Si no la encuentra, crea una nueva.

El 2026-10-01, Cereza mandó durante unos 45 minutos la referencia del producto 27311 como código de barras ("7708516916169") en lugar de GCC932. Katuq creó una ficha duplicada con 1.208 unidades fantasma, a la venta en todos los canales y con un SKU que Cereza no conoce (D-368). La ficha se desactivó a mano, pero puede volver a pasar con cualquier producto al que Cereza le cambie la referencia.

## What Changes

- La sincronización (webhook, sync manual y scripts que usan `_upsertProduct`) busca primero por el id de Cereza (`integrations.osmosis.id`, sea número o texto). Solo si no la encuentra, busca por referencia.
- Si encuentra la ficha por id con otra referencia, **no** cambia `identificacion.referencia`, porque es el SKU de Shopify y cambiarlo crearía el producto otra vez en la tienda. En su lugar deja un aviso en `osmosis_sync_log`.
- Si hay más de una ficha con el mismo id de Cereza, no escribe nada y registra el error para revisión.
- El log del webhook registra lo que de verdad pasó (creó o actualizó). Hoy registra `product_updated` también cuando crea.

## Capabilities

### New Capabilities
- `cereza-product-identity`: identificar la ficha de Katuq de un producto de Cereza por su id estable y no por la referencia, que puede cambiar.

### Modified Capabilities
<!-- Ninguna: no hay spec previa de la sincronización Cereza en openspec/specs/. -->

## No-goals

- No se cambia el nodo `katuq-product-upsert` del flow mixto (D-134). Si se necesita, va en otra propuesta.
- No se cambian precios, stock ni Shopify.
- No se limpian otras fichas, como el bloque `integraciones.osmosis` copiado en TlJSNVodPXzg2Ses77gI. Esa limpieza va aparte.

## Impact

- Backend:
  - `services/integrations/osmosis/osmosisProductSyncService.js`: la búsqueda (L277-284) y el retorno de `_upsertProduct`.
  - `services/integrations/osmosis/osmosisWebhookService.js`: la acción que se registra (L354).
- Afecta solo a empresas con Cereza (hoy, OH MY STORE). La consulta por id funciona sin índice compuesto; se probó en solo lectura.
- Riesgo: 456 fichas guardan el id como texto. La búsqueda usa los dos tipos.
