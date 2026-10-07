## 0. Aprobación (bloqueante)

- [ ] 0.1 Daniel aprueba la propuesta, la spec y el diseño, y la excepción a D-134. Registrarla en CONTRACT.md como D-XXX.

## 1. Confirmación de las listas de precios

- [ ] 1.1 `shopify-pricelist-sync` escribe `integrations.shopify.preciosSincronizadosEn` en el producto solo cuando todas sus listas quedaron bien.
- [ ] 1.2 `shopify-product-upsert` escribe `shopify_push_log` `success` solo si `productVariantsBulkUpdate` no devolvió `userErrors`. Si los devolvió, escribe `error` con el detalle.
- [ ] 1.3 Pruebas de 1.1 y 1.2 sin red, con Shopify simulado.

## 2. Sin duplicados al reintentar

- [ ] 2.1 `shopify-product-upsert`: sin enlace, buscar primero por `tag:'katuq-cd:<cd>'` y después por SKU. Si lo encuentra, enlazar y actualizar.
- [ ] 2.2 Con enlace y producto inexistente en Shopify: no crear. Marcar `motivoAtencionShopify = 'borrado_en_shopify'`.
- [ ] 2.3 Pruebas con tres casos: creación a medias que encuentra el tag, producto borrado y producto nuevo normal.

## 3. Huella diferida en el trigger

- [ ] 3.1 Agregar `retryMode` (`off` por defecto, `shadow`, `on`) y la guarda: si `retryMode` es distinto de `off` y `limit` no es mayor que 0, error explícito y nada emitido.
- [ ] 3.2 En `on`: guardar en `pendientes[id]` en vez de en `lastSeenHashes`. Al inicio de cada corrida, confirmar los pendientes contra `shopify_push_log` y `preciosSincronizadosEn`.
- [ ] 3.3 Espera creciente y máximo 3 intentos. Al agotarlos, pasar a `agotados[id]` con el último error. Recortar `agotados` a 500.
- [ ] 3.4 `sin_precio_valido` no consume intentos: confirmar la huella como hoy.
- [ ] 3.5 En `shadow`: comportamiento actual más registro de `pendientes`, solo para medir.
- [ ] 3.6 Pruebas: Shopify falla, Shopify crea pero falla la lista, se agotan los intentos, muchos fallos no superan `limit`, `limit` vacío con `retryMode` encendido.

## 4. Contrato y despliegue

- [ ] 4.1 Prueba del write-set. Falla si se escriben colecciones nuevas, o si cambian la frecuencia, `limit`, `diffPagesScan`, `diffRotatePages` u `onlyWithStock` del flow.
- [ ] 4.2 Correr `test:flows-osmosis-huella`, `test:flows-node-catalog` y las pruebas nuevas. Validar sintaxis.
- [ ] 4.3 Desplegar con `retryMode: off` y verificar que nada cambia: las mismas emisiones por corrida.
- [ ] 4.4 Pasar a `shadow` en `cereza-products-to-shopify-a5156643`, escribiendo los params completos y verificando `limit === 30`. Medir una semana.
- [ ] 4.5 Pasar a `on` con el visto bueno de Daniel. Verificar en `flow_runs` y `shopify_push_log` durante 24 h.
