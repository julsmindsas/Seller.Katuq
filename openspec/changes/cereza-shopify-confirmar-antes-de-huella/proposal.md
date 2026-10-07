## Why

El flow `cereza-products-to-shopify-a5156643` (OH MY STORE) da un producto por enviado en el momento de emitirlo. El trigger `osmosis-product-changed` guarda la huella antes de que `shopify-product-upsert` corra, y la huella excluye el stock a propósito. Por eso, si el paso a Shopify falla, el producto no se vuelve a intentar mientras no cambie en Cereza.

Del 24-ago al 14-sep un bug (`params is not defined`) dejó fuera de Shopify productos nuevos y dejó 187 fichas con datos viejos (ticket 1139, D-368). Se arreglaron a mano, borrando huellas una por una. Cualquier falla futura del paso a Shopify vuelve a dejar productos fuera sin que nadie se entere: un `userErrors` de Shopify, un timeout o un handle repetido.

## What Changes

- El trigger guarda la huella de un producto **solo cuando el flow confirma** que Shopify lo creó o lo actualizó y que las listas de precios se sincronizaron. Si falla, la huella no se guarda y el producto vuelve a emitirse.
- Los reintentos van **acotados**:
  - comparten el tope por corrida (`limit`) que ya existe;
  - tienen un máximo de intentos por producto;
  - tienen una espera creciente entre intentos.
  - Un producto que agota los intentos queda marcado para revisión humana y no se reintenta más.
- Antes de `productCreate`, el upsert busca el producto también por el tag `katuq-cd:<cd>`. Hoy `matchBy: sku` busca la referencia base y nunca encuentra el SKU compuesto de la variante, así que un reintento después de una creación a medias duplicaría.
- Hay una guarda de seguridad: si el modo de reintento está activo y `limit` llega en 0 o vacío, el trigger no corre. Hoy `limit` vacío significa "sin tope".
- Todo queda detrás de un parámetro del nodo `retryMode` (`off` | `shadow` | `on`) por flow. En `shadow` solo se registra qué se habría reintentado.
- **Excepción a D-134**, explícita y acotada:
  - el flow mixto vuelve a ejecutar producto, imágenes y listas de precios, pero solo para productos que fallaron;
  - no cambian la frecuencia, el tope ni las páginas que se leen.
  - Se agrega una prueba del write-set.

## Capabilities

### New Capabilities
- `cereza-shopify-catalog-retry`: confirmación de entrega y reintento acotado de productos de Cereza que no llegaron a Shopify, sin duplicar y sin ampliar la carga del flow mixto.

### Modified Capabilities
<!-- Ninguna: no hay spec previa de este flow en openspec/specs/. -->

## No-goals

- No se cambia la frecuencia (6 min), el tope (30), las páginas leídas ni `onlyWithStock`.
- No se tocan las reglas de precio (D-069) ni la protección `sin_precio_valido`: un producto sin precio sigue sin crearse.
- No se recrean productos que alguien borró de Shopify: si el enlace existe y el producto ya no está, se marca para revisión.
- No se crean colecciones nuevas. El estado de reintentos vive en el documento de estado del trigger que ya existe (`flow_polling_state`).
- No se reparan datos viejos. Para eso está `scripts/reemitirProductosCereza.js` (D-368).

## Impact

- Backend:
  - `services/flows/nodes/osmosis/osmosis-product-changed.trigger.js`: huella diferida, mapa de pendientes, guarda de `limit`.
  - `services/flows/nodes/shopify/shopify-product-upsert.action.js`: búsqueda por tag antes de crear; confirmación por producto.
  - `shopify-pricelist-sync.action.js`: confirmación.
  - El motor de flows, para devolver al trigger el resultado de cada ítem.
- Solo afecta a los flows que usan `osmosis-product-changed`, que hoy son únicamente los dos de OH MY STORE. Con `retryMode: off` (el valor por defecto) el comportamiento es idéntico al actual.
- Módulos sensibles: catálogo y precios de Shopify de OH MY STORE. Se encenderá primero en `shadow` y se medirá una semana antes de pasar a `on`.
