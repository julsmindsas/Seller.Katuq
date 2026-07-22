# Propuesta: estabilizar sincronización de stock con proveedores y Shopify

## Why

Cereza envía fotos absolutas de stock por bodega y Katuq también descuenta ventas locales. Si una foto externa pisa el saldo mientras un pedido todavía no ha sido reflejado por el proveedor, una unidad vendida puede reaparecer. En sentido contrario, el flujo que publica a Shopify recorre una ventana limitada y omite cantidades en cero, por lo que productos antiguos o agotados pueden quedar desactualizados.

La verificación de producción del 2026-07-22 confirmó dos flows activos de OH MY STORE hacia Shopify. Ambos ejecutan `shopify-product-upsert` antes del stock y el de Cereza también ejecuta `shopify-pricelist-sync`. Aumentar su cobertura para corregir inventario volvería a tocar productos y precios; por eso el stock se debe desacoplar.

Además, existen configuraciones de cron que pueden reportar ejecución aunque su handler no realice trabajo. Una sincronización confiable debe demostrar qué leyó, qué decidió y qué publicó.

## What Changes

- Tratar el stock externo como una observación física con origen y momento identificables.
- Calcular en sombra stock físico, compromisos locales y disponibilidad propuesta sin cambiar aún `inventory.cantidad`.
- Impedir que una foto externa borre silenciosamente un compromiso local pendiente.
- Validar mapping empresa–bodega y fallar cerrado ante códigos desconocidos.
- Publicar a Shopify todo cambio de disponibilidad, incluyendo transiciones a cero.
- Recorrer el catálogo completo con cursor y recuperación de ejecuciones perdidas.
- Ejecutar la publicación de existencias por un camino separado de los flows de catálogo y listas de precios.
- Marcar éxito solamente cuando hubo trabajo verificable o un no-op legítimo demostrado.

## Capabilities

### New Capabilities

- `provider-stock-ingestion`: recepción segura y reconciliable de stock físico externo.
- `shopify-stock-publication`: publicación completa e idempotente de disponibilidad Katuq.

### Modified Capabilities

Ninguna.

## Impact

- `/flows`, crones, Osmosis/Cereza, Fullpi, inventario Katuq y Shopify.
- Flows productivos que deben permanecer sin cambios por esta propuesta: `cereza-products-to-shopify-a5156643` y `katuq-web-to-shopify` en sus nodos de producto/precio.
- Depende de `establish-inventory-safety-baseline`, `stabilize-inventory-ledger` y `stabilize-order-inventory-lifecycle`.
- Reutiliza `inventory_audit`, `flow_runs` y configuración existente; no crea colecciones nuevas.
- Decisión de programa: D-134.

## No-goals

- No cambiar en el primer despliegue la cantidad operativa de Katuq.
- No activar el flow borrador `osmosis-stock-changed`.
- No limpiar catálogo ni inventario histórico.
- No imponer Cereza o Shopify a comercios que no usan esos proveedores.
- No crear, editar, activar ni desactivar productos; no tocar títulos, imágenes, categorías, variantes, precios ni listas de precios en Katuq o Shopify.
- No aumentar el límite, frecuencia o cobertura de los flows mixtos existentes para resolver stock.

## Risks

- Restar compromisos ya incorporados por el proveedor produciría doble descuento; el modo sombra debe probar el criterio de reconocimiento antes de activar.
- Un barrido completo mal paginado puede elevar costos; se usa cursor persistente y lotes acotados, sin caché nueva.
- Publicar cero puede agotar productos correctamente pero revelar discrepancias existentes; primero se compara y luego se habilita por comercio.
