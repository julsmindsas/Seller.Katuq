# Evitar repetir una reserva confirmada del checkout

## Why

El checkout de las tiendas propias de Katuq recibe una orden existente cuando `orderService.createOrder` evita un pedido duplicado. Después vuelve a ejecutar la reserva y puede descontar dos veces una misma venta. La reproducción offline con las funciones reales produjo una orden, dos movimientos SALIDA y stock 10 → 8 en dos envíos secuenciales.

Daniel revisó la explicación y el diff, confirmó que el alcance era las tiendas de Katuq y aprobó: «ah bueno aprobado» (2026-10-07). D-364 registra esta autorización. Se aplica un único cambio sensible, conforme a `openspec/config.yaml` del backend.

## What Changes

Omitir el bloque existente de reserva solamente si `createOrder` retorna una orden deduplicada y su marca `inventarioDescontadoAlCrear` confirma un descuento previo. Con marca falsa o ausente, conservar el intento para recuperar una reserva fallida.

## Scope y no-goals

Una condición en `functions/controllers/sites.js`, pruebas offline y documentación. Sin cambios al servicio global de inventario, pedidos de otros canales, integraciones Shopify, auth, consultas de empresa, precios ni maestros. Sin colecciones nuevas, migraciones, datos productivos ni despliegue. No se aplican los diffs de retiro, cantidades o variantes. Daniel autorizó posteriormente commit y push: «sube a git».

Esta corrección no cierra peticiones simultáneas ni un fallo entre el descuento y su marca. No deduplica enlaces de pago, contadores, eventos o notificaciones; esos efectos siguen como propuestas de revisión independientes.

## Impact y riesgos

El checkout conserva el flujo de creación, respuesta y recuperación de reserva de D-204. El write-set existente de la reserva sigue limitado a `orders` (marca), `inventory` e `inventoryMovement`; `products`, catálogo, variantes y precios permanecen de solo lectura. No se modifica `inventoryService.js`, que afecta POS, ventas, fulfillment y Shopify.
