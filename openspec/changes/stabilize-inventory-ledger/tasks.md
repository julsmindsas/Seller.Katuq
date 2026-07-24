# Tasks

## 1. Contrato único y compatibilidad

- [x] 1.1 Congelar escritores de `inventoryProductHistory` y retirar el uso de `inventory_movements`; conservar ambas como evidencia de solo lectura.
- [x] 1.2 Centralizar el enum vigente de `reason` (`sale`, `restock`, `manual_adjustment`, `damaged`, `transfer`, `shopify_sync`, `osmosis_sync`, `fullpi_sync`, `returned`) y alinear runtime y contrato TypeScript; los nodos conservan subconjuntos válidos según su origen.
- [x] 1.3 Crear lector compatible de fecha/campos históricos y migrar analítica e historial a `inventoryMovement` sin reescribir documentos legados.
- [x] 1.4 Contract tests del write-set: solo `inventory`, `inventoryMovement`, idempotencia/auditoría permitida; nunca `products` ni estructuras de precios.

## 2. Operación contable atómica

- [x] 2.1 Crear servicio transaccional canónico con empresa, producto normalizado, business code, delta firmado, before/after, `reason`, actor, referencia e idempotency key.
- [x] 2.2 Garantizar que saldo, movimiento e idempotencia confirmen juntos o ninguno; pruebas de fallo en cada escritura y reintento concurrente.
- [x] 2.3 Implementar traslado indivisible con origen, destino y dos movimientos dentro de una transacción.
- [x] 2.4 Mantener flag por empresa/origen en `off` por defecto; `shadow`/`transactional` exigen una allowlist exacta de business codes o promoción total explícita. La sombra no escribe saldo nuevo, movimientos, productos ni precios y deja una sola auditoría agregada por corrida.

## 3. Migración de escritores, uno por cambio

- [ ] 3.1 Ajustes manuales y traslados; completar todos los subpasos antes del canario.
  - [x] 3.1.1 Ajuste manual de un producto detrás de flag `manual`, con sombra, idempotencia y ruta legacy.
  - [x] 3.1.2 Traslado de un producto detrás de flag `transfer`, atómico e idempotente, con ruta legacy.
  - [x] 3.1.3 Frontend entrega `operationKey` estable por petición de un producto/traslado.
  - [x] 3.1.4 Implementar transacción multi-SKU con máximo 200, orden determinista, idempotencia y reversión total.
  - [ ] 3.1.5 Ejecutar sombra y canario OMS de una bodega con aprobación explícita.
- [ ] 3.2 Venta Asistida y POS.
  - [x] 3.2.1 Conectar creación/edición al efecto del pedido detrás de `assisted_sale` y `pos`, con legacy/sombra/transaccional.
  - [ ] 3.2.2 Fixtures reales, sombra y canario controlado.
- [ ] 3.3 Pedidos por canal y devoluciones.
  - [x] 3.3.1 Conectar Shopify create/update/paid/cancel/refund y el flow histórico al mismo efecto `orders.inventoryEffect`.
  - [ ] 3.3.2 Fixtures reales, sombra y canario controlado.
- [ ] 3.4 Onboarding/importaciones y fulfillment.
- [ ] 3.5 Nodos `/flows`, herramientas MCP y providers, uno por origen.
  - [x] 3.5.1 Osmosis preparado con legacy/sombra/transaccional, kill switch y alcance exacto por bodega; sin alcance válido conserva legacy.
  - [x] 3.5.2 `adjust_stock` MCP usa el ledger canónico y `get_inventory_movements` lee `inventoryMovement`.
  - [x] 3.5.3 `katuq-inventory-adjust` delega ventas/devoluciones al pedido y usa el ledger para `setTo` en modo transaccional.
  - [ ] 3.5.4 Ejecutar canarios independientes de Shopify, Fullpi y demás providers.

## 4. Historia y rollout

- [ ] 4.1 Dry-run de cobertura de `reason`; mapear solo casos deterministas y dejar ambiguos sin inventar motivo.
- [ ] 4.2 OMS sombra/canario con cero saldo-sin-movimiento, movimiento-sin-saldo y doble efecto; luego Almacén Bombas y demás comercios uno por uno.
- [ ] 4.3 En cada módulo sensible: leer archivos, mostrar diff, `node --check`, tests, arranque local y evidencia de kill switch antes del siguiente escritor.
