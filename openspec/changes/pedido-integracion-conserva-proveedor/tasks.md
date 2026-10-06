# Tasks

## 1. Resolver
- [x] 1.1 Leer `katuq-product-resolver-by-ref.transform.js` completo y sus tests; agregar la copia de `integrations` del maestro al producto embebido (solo si existe, sin pisar lo que ya traiga la línea)
- [x] 1.2 Test unitario: producto Cereza, producto Fullpi, producto propio, referencia inexistente
- [x] 1.3 Contract test del write-set: falla si el nodo escribe `products`, catálogo, precios o listas de precios

## 2. Reparación de pedidos abiertos
- [x] 2.1 Script `functions/scripts/` con `--dry-run` por defecto: pedidos con `sourceOrder` de integración, abiertos, filtrados por `company`; reporta pedido, línea y la identidad que agregaría
- [x] 2.2 Revisar la salida del dry-run con Daniel
- [x] 2.3 Aplicar solo con autorización explícita, con respaldo previo de los pedidos tocados

## 3. Verificación y cierre
- [x] 3.1 `node --check` y tests del backend sin errores
- [ ] 3.2 Verificar en producción con un pedido Shopify nuevo que la línea trae `integrations` y que un pedido solo de Cereza pasa la guarda al despacharlo
- [ ] 3.3 Registrar cierre contra D-355 en CONTRACT.md
