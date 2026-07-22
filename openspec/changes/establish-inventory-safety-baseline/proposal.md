# Propuesta: establecer una línea base segura de inventario

## Why

El consolidado de inventario a veces cuadra y a veces no porque hoy distintas lecturas pueden interpretar de forma diferente registros duplicados, identificadores antiguos y movimientos incompletos. En OH MY STORE (auditoría solo lectura del 2026-07-22) existen 24.503 documentos de `inventory`, pero aproximadamente 12.627 combinaciones normalizadas producto–bodega; además, 1.660 de 1.668 movimientos no tienen `reason` y una parte usa identificadores de bodega no canónicos.

Antes de corregir cantidades o cambiar escritores, Katuq necesita mostrar con evidencia dónde está el descuadre, sin alterar la operación. Esta es la primera barrera para proteger a OH MY STORE, Almacén Bombas y los demás comercios.

## What Changes

- Crear una conciliación de solo lectura, aislada por empresa, producto y bodega.
- Comparar saldo actual, movimientos, pedidos y evidencia de integraciones sin inventar datos faltantes.
- Clasificar cada resultado como confiable, ambiguo o incompleto, indicando la causa.
- Activar cualquier comportamiento futuro por empresa y por bodega, apagado por defecto, con modo sombra y corte inmediato.
- Definir gates de salida: OH MY STORE en sombra, luego canario; Almacén Bombas después; otros comercios uno por uno.

## Capabilities

### New Capabilities

- `inventory-reconciliation`: diagnóstico reproducible y no destructivo de saldos y evidencias.
- `inventory-rollout-safety`: controles de activación, observación, corte y promoción por comercio.

### Modified Capabilities

Ninguna.

## Impact

- Áreas observadas: inventario, movimientos, pedidos, Venta Asistida, `/flows`, Shopify, Osmosis/Cereza y Fullpi.
- Se reutilizan el diagnóstico existente y `inventory_audit`; no se crean colecciones ni endpoints `v2`.
- No cambia ninguna cantidad, pedido, despacho, cron ni integración en esta propuesta.
- Evidencia histórica relacionada: [findings 360](../../../specs/002-flows-osmosis-shopify-marco/findings.md), decisiones D-027, D-110 y D-111 de [CONTRACT](../../../specs/CONTRACT.md).
- Decisión de programa: D-134.

## No-goals

- No borrar o fusionar duplicados.
- No hacer backfill ni reparar cantidades.
- No cambiar todavía el significado de `inventory.cantidad`.
- No activar sincronizaciones ni modificar pedidos productivos.
- No editar el maestro de productos, listas de precios, precios por cliente, categorías, imágenes ni datos comerciales del producto.

## Risks

- Una conciliación puede parecer exacta aunque la historia esté incompleta; por eso la confianza y los huecos son parte obligatoria del resultado.
- Una consulta global puede mezclar empresas o elevar costos; toda ejecución estará acotada por empresa y paginada.
- La línea base puede revelar saldos dudosos, pero esta fase no los corrige automáticamente.
