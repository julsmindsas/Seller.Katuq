# Propuesta: Katuq asigna sola la bodega de cada producto cuando nadie la escogió

Cambio 2 de 3 del programa D-355 (ticket 1120). Requiere el cambio 1.

## Why

Hoy todo Katuq trabaja con **un pedido, una bodega**. Cuando el cliente compra solo (tienda Shopify, WooCommerce, cualquier integración futura), nadie escoge bodega: el flow la pone fija. En OH MY STORE es Cereza Medellín para todo pedido Shopify, aunque traiga productos de Fullpi o de Distri Sex. El caso real es ORE-001393: tres productos de tres proveedores, descontados los tres de Cereza Medellín, con dos existencias en menos uno donde esos productos no existen, y un pedido que nadie puede despachar.

Katuq ya tiene la base: **bodegas por canal** (`channelWarehouseAssociations`) y el reparto de inventario por existencias (`inventoryService.updateByChannel` y `orderInventoryEffectLedger.resolveChannelCommitAllocations`). Pero no se usa: el modo automático (`escogerBodega`) no existe en ninguno de los 498 canales, no tiene pantalla, el reparto llena bodegas en orden de código sin mirar proveedor ni ciudad, ignora los productos no inventariables y nadie lee después la asignación.

Datos reales (60 días, solo lectura, 2026-10-06):
- 112 de 126 comercios tienen una sola bodega: para ellos nada cambia.
- Los pedidos de integración son los que llegan sin persona que escoja: Shopify (OMS), WooCommerce (Café Escobar, 3 pedidos **sin bodega**).
- Ningún pedido trae `channelId`; el canal se reconoce por nombre y a veces no coincide. El canal Shopify de OMS tiene **cero** bodegas asociadas.
- No hay código DANE en los pedidos: la ciudad es texto libre en `envio.ciudad`.

## What Changes

- **Asignación automática por línea** para todo pedido que llega sin una bodega escogida por una persona: integraciones (flows, webhooks) y pedidos sin bodega. Cada línea queda con su bodega en `carrito[i].idBodega` (código de negocio).
- **Cero configuración:** si el canal tiene bodegas asociadas se usan esas; si no (o no se reconoce el canal), se usan todas las bodegas físicas de la empresa. Las transaccionales (merma, devoluciones, tránsito) nunca reciben ventas.
- **Reglas, en orden:** proveedor correcto (un producto de Cereza solo sale de bodega Cereza, uno de Fullpi solo de Fullpi, uno propio solo de bodega propia) → una sola bodega si alguna tiene todo → la ciudad del cliente → la menor cantidad de bodegas posible → existencias. Una línea nunca se parte entre bodegas.
- **No inventariables:** van a la bodega donde ese producto se ha vendido antes (historial de movimientos); si no hay historia, se suman a la parte más grande compatible.
- **Inventario coherente:** todo descuento del pedido (ledger, legacy y nodo de flow) usa la bodega de cada línea. Se acaban los negativos fantasma en una bodega que no tiene el producto.
- **Lo escogido por una persona no se toca:** venta asistida, POS, app iOS y tiendas Katuq (su bodega la fijó el comercio) siguen exactamente igual.
- **Mientras no exista el cambio 3:** un pedido que quedó en varias bodegas se marca "requiere atención: varias bodegas", visible en la lista, en vez de quedarse quieto.
- **Encendido seguro:** una semana en sombra (calcula y guarda la decisión sin aplicarla), luego activo para todos, con interruptor de apagado global y por empresa.

## Capabilities

### New Capabilities
- `automatic-warehouse-allocation`: asignación automática de bodega por línea en pedidos sin bodega escogida.

### Modified Capabilities
Ninguna formal; el ledger ya acepta asignaciones explícitas (`commitAllocations`) que hoy nadie le pasa.

## Impact

- Backend: servicio nuevo de asignación invocado al crear el pedido en `orderService.createOrder` (flows, webhooks) y en `controllers/orders.js` cuando no hay bodega; descuento por línea en `orderInventoryRolloutService` (pasa `commitAllocations`), `inventoryService.updateByChannel`/`updateByChannelFromWebhook` y el nodo `katuq-inventory-adjust`.
- Flow `shopify-orders-to-cereza-7e6ab5a3` (datos, versionado): el mapper deja de imponer bodega (pasa a preferencia) y el ajuste de inventario toma la bodega de cada línea. Los flows mixtos de producto y precios no se tocan.
- Campos nuevos en `orders` (inglés): `carrito[i].idBodega`, `warehouseAllocation`. `bodegaId` sigue existiendo: la bodega de la parte más grande, para que reportes, SIIGO y pantallas sigan funcionando.
- Write-set de inventario cerrado: `inventory`, `inventoryMovement`, idempotencia/auditoría. `products` y precios: solo lectura.
- Sin colecciones nuevas, sin endpoints nuevos, sin clics nuevos.

## No-goals

- No repartir pedidos de venta asistida, POS ni tiendas Katuq (hay una persona o una configuración que escogió).
- No despachar por partes ni cambiar estados por parte: es el cambio 3.
- No reservar inventario antes del pago ni cambiar la política de negativo visible.
- No corregir los hallazgos colaterales listados en D-355 (cada uno va por su lado).

## Riesgos

- **Módulo sensible (orders/inventory):** un cambio a la vez, con diff y aprobación; sombra primero y comparación contra lo que hace hoy.
- **Ledger:** la ruta de inventario se firma con `bodegaId` + canal; por eso la asignación ocurre antes del primer descuento y nunca después.
- **Ciudad en texto libre:** la coincidencia es por nombre normalizado; si falla, la regla cae a existencias, nunca bloquea el pedido.
- **Datos sucios conocidos:** asociaciones de canal cruzadas entre empresas (clones) y bodegas sin documento: la asignación valida que la bodega sea de la misma empresa y exista.
