# Completar retiro, precio visible y cantidades del checkout

## Why y autorización

Daniel pidió «has todos los ajustes yaaaa» después de enumerar los tres pendientes de las tiendas propias de Katuq: retiro en tienda, precios mostrados al elegir talla/color y cantidades repetidas del carrito. Los diffs y reproducciones se presentaron previamente en la cola de revisión de D-363. D-369 registra la autorización; se aplican los cambios sensibles uno por uno, sin otro checkpoint por esta misma autorización.

La revisión adicional confirmó detalles necesarios para que los arreglos funcionen: el navegador también bloquea retiro sin dirección, la bodega debe pertenecer a la empresa incluso cuando coincide con la general, los datos del punto no deben convertirse en domicilio del comprador, la ficha y los extras deben respetar la lista del comprador después de entrar, y un saldo real positivo no debe ser rechazado por un campo legacy desactualizado.

## What Changes

1. Resolver y validar el punto/bodega de retiro antes de exigir domicilio; dirección de la orden y confirmación desde el punto, forma de entrega en todas las líneas y envío cero. Perfil del cliente conserva solo su domicilio real.
2. Conservar precio público/promoción/lista por cliente al elegir talla/color, aplicar sesión y recalcular extras. Actualizar precios del carrito recuperado con los endpoints existentes cuando se conozca la base, conservando configuración y extras.
3. Comparar saldo de la bodega efectiva contra la suma por docId de todas las líneas. Usar saldo real conocido antes del campo legacy; conservar el fallback existente cuando no se puede leer stock.

## Scope y no-goals

Checkout y renderizado de tiendas Katuq; regresiones offline; canon y OpenSpec. Sin alterar precios maestros, productos, variantes, auth, flows Shopify, servicio global de inventario, políticas de negativos, modelos o endpoints. Sin nuevas colecciones, migraciones o compras/datos reales. La autorización previa de «sube a git» se mantiene para el cierre de estas correcciones; despliegue de producción queda aparte.

No se promete idempotencia atómica entre compradores simultáneos ni recuperación del fallo entre descontar y guardar la marca. Ese diseño afecta reserva global y no forma parte de los tres ajustes enumerados. No cambiar reglas fiscales ni facturación para usar la dirección del comercio como domicilio del comprador.

## Write-set y riesgos

No se escribe inventario ni maestros al comprobar cantidades o elegir precio. El flujo existente de orden/reserva conserva `orders`, `inventory`, `inventoryMovement` y registro de cliente conforme a D-184/D-204/D-364. La corrección de perfil evita añadir el local a `clients.datosEntrega`; no toca otros campos de negocio. Productos, catálogo, precios y listas permanecen read-only. No se edita `inventoryService.js`, que afecta POS, fulfillment y Shopify.
