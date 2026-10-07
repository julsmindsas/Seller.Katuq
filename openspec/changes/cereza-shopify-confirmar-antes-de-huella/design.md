## Context

Ver `proposal.md` (Why) y la decisión D-368.

**Cómo funciona hoy:**
- `osmosis-product-changed.trigger.js` escribe `lastSeenIds[id]` y `lastSeenHashes[id]` antes de publicar el evento (FASE DIFF, L654-655).
- Guarda el estado en `_saveState` (L743) y retorna. El motor (`flowExecutor`) ejecuta después: mapper → `katuq-product-upsert` → `shopify-product-upsert` → `shopify-inventory-adjust` + `shopify-pricelist-sync`. El trigger nunca se entera del resultado.

**Hechos medidos (D-368):**
- `shopify-product-upsert` escribe `shopify_push_log` (`kind: success|error`, `katuqProductCd`).
- En el producto escribe `integrations.shopify.{productId,gid,lastSyncedAt}` y, si falla, la bandera `requiereAtencionShopify`.
- `lastSyncedAt` se escribe antes de las listas de precios y aunque `productVariantsBulkUpdate` devuelva `userErrors`.
- `_findShopifyProductBySku` busca la referencia base. El SKU real es compuesto (`GCD449-UNICA-BLANCO/NEG`), así que no encuentra una creación previa.
- `nodeExecutor` toma `flowNode.params` sin mezclar valores por defecto: `limit` ausente queda en 0, que significa sin tope.

## Goals / Non-Goals

**Goals:**
- Confirmación por producto sin acoplar el trigger al motor.
- Reintentos que caben en el tope actual.
- Cero duplicados al reintentar.

**Non-Goals:**
- Cambiar el motor de flows para que devuelva resultados por ítem a los triggers.
- Reprocesar el histórico. Eso lo hace `scripts/reemitirProductosCereza.js`.

## Decisions

1. **La huella se confirma en la corrida siguiente, sin depender del motor.**
   - Al emitir, el trigger guarda la huella en `pendientes[id] = { huella, emitidoEn, intentos, cd }` dentro del mismo doc de `flow_polling_state`. No la guarda todavía en `lastSeenHashes`.
   - Al empezar cada corrida, revisa los pendientes contra Firestore. Pasa la huella a `lastSeenHashes` solo si se cumplen las dos condiciones:
     - el producto tiene un `shopify_push_log` `success` posterior a `emitidoEn`;
     - el producto tiene `integrations.shopify.preciosSincronizadosEn >= emitidoEn`, un campo nuevo que escribe `shopify-pricelist-sync` cuando termina bien.
   - *Alternativa descartada:* que el motor le devuelva al trigger el resultado de cada ítem. Toca el ejecutor que usan todos los flows y todas las empresas, y además acopla nodos que hoy son independientes.

2. **Reintento = dejar que el producto se vuelva a emitir.**
   - Un pendiente sin confirmar después de `esperaMinutos * 2^(intentos-1)` sale de `pendientes`.
   - Su `lastSeenHashes` sigue vacío, así que `_shouldEmit` lo emite de nuevo cuando la ventana fresca o la rotación lo lean. Eso usa el mismo cupo `limit` del flow.
   - Máximo **3** intentos. Al agotarlos pasa a `agotados[id]` con el último error de `shopify_push_log`, y además queda `requiereAtencionShopify` en el producto, que ya existe.
   - *Alternativa descartada:* una cola propia de reintentos. Sería una colección nueva y un cupo extra, y viola D-134.

3. **Búsqueda por tag antes de `productCreate`.**
   - En `shopify-product-upsert`, si no hay enlace, primero se busca `tag:'katuq-cd:<cd>'`, que el upsert ya pone al crear, y después por SKU.
   - Si se encuentra, se enlaza y se actualiza.
   - Si hay enlace pero `product(id)` devuelve null, el producto fue borrado: no se crea, y se marca `motivoAtencionShopify = 'borrado_en_shopify'`.

4. **`retryMode` y guarda de tope.**
   - Es un parámetro del nodo trigger: `off` (por defecto), `shadow` u `on`.
   - En `shadow`, la huella se guarda como hoy y en paralelo se llena `pendientes` solo para medir.
   - Si `retryMode` es distinto de `off` y `limit` no es mayor que 0, el trigger corta con un error explícito.
   - Al guardar el flow se escriben los params completos.

5. **El precio no cambia.** `sin_precio_valido` sigue igual. Un pendiente cuyo último error es `sin_precio_valido` no consume intentos: se descarta de `pendientes` y su huella se confirma. Así ya no se reintenta, y si el precio cambia en Cereza, la huella cambia y entra por el camino normal.

## Risks / Trade-offs

- **[El doc de estado crece con `pendientes`].** Se acota a lo emitido en las últimas horas, como máximo `limit × reintentos`, y `agotados` se recorta a los últimos 500.
- **[Una caída larga de Shopify agota los 3 intentos de muchos productos].** La espera es creciente (6, 12 y 24 h), y `agotados` se puede reiniciar con el script de D-368.
- **[Confirmación falsa si `shopify_push_log` escribe success con `userErrors` en variantes].** El upsert pasa a escribir `success` solo si `productVariantsBulkUpdate` no devolvió `userErrors`.
- **[D-134].** Es una excepción explícita: se reejecuta producto, imágenes y listas solo para lo que falló, dentro del tope. La prueba del write-set lo verifica.

## Migration Plan

1. Desplegar con `retryMode: off`: comportamiento idéntico.
2. Pasar a `shadow` en `cereza-products-to-shopify-a5156643` y medir una semana cuántos pendientes quedan sin confirmar y por qué.
3. Pasar a `on` con aprobación de Daniel.
4. **Rollback:** `retryMode: off`. Las huellas confirmadas quedan en `lastSeenHashes` como hoy y `pendientes` se ignora.
