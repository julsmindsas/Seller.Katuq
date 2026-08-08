# Tasks

## 1. Congelar y probar el panorama actual

- [x] 1.1 Respaldar grafos/config de los flows OMS activos `cereza-products-to-shopify-a5156643` y `katuq-web-to-shopify`, sus bindings, cursores y configuración pública.
- [x] 1.2 Contract test que impida al nuevo camino escribir `products`, variantes, imágenes, categorías, precios, price lists o estado comercial; en Shopify solo `InventoryLevel`.
- [ ] 1.3 Marcar handlers no-op como bloqueados/no configurados en vez de éxito y registrar leídos/elegibles/publicados/omitidos/errores/cursor.

## 2. Ingestión del proveedor en sombra

- [ ] 2.1 Adapter tenant-aware para mapping storage externo→`warehouses.idBodega`; código desconocido falla cerrado.
- [ ] 2.2 Calcular `physicalObserved`, `localUnacknowledged` y `projectedAvailable` en sombra dentro de `inventory_audit`, sin cambiar `inventory.cantidad`.
- [ ] 2.3 Definir y validar con muestra real el reconocimiento/watermark por provider para no restar compromisos dos veces.
- [ ] 2.4 Observar OMS por storage 1/1A/1B/51 y luego canario de una bodega con flag independiente.

## 3. Publicación Shopify solo stock

- [ ] 3.1 Crear recorrido exclusivo de stock con cursor estable, catálogo completo, ceros incluidos, retry idempotente y checkpoint existente.
- [ ] 3.2 No reutilizar ni ampliar los dos flows mixtos de producto/precio; feature flag y kill switch exclusivos por empresa/ubicación.
- [ ] 3.3 Comparar payloads en sombra; canario de cohorte pequeña y verificación de positivo→cero.

## 4. Rollout

- [ ] 4.1 Promover OMS solo con cobertura completa y sin cambios de catálogo/precios; después repetir sombra/canario para Almacén Bombas y cada comercio.
- [ ] 4.2 `node --check`, contract/integration tests, arranque local, evidencia de cursor y diff aprobado por escritor.
