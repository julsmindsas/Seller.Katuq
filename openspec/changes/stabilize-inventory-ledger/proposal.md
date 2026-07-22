# Propuesta: estabilizar el saldo y el libro de movimientos

## Why

Katuq sí guarda cantidad en `inventory.cantidad`, pero no todos los caminos dejan la misma evidencia. En OH MY STORE, 1.660 de 1.668 movimientos auditados el 2026-07-22 no tienen el `reason` canónico; conviven valores simbólicos, textos y tipos distintos. Además, varios escritores confirman el saldo y crean el movimiento después, de modo que una falla intermedia puede dejar saldo sin historia.

La colección activa es `inventoryMovement`. `inventoryProductHistory` dejó de recibir datos operativos en 2025 y OH MY STORE no tiene registros allí, aunque una analítica todavía la consulta. Sin un único libro confiable no se puede certificar el consolidado ni una fecha de corte.

## What Changes

- Mantener `inventory.cantidad` como saldo operativo que Katuq guarda y consulta.
- Declarar `inventoryMovement` como único libro activo de movimientos.
- Exigir que saldo y movimiento se confirmen juntos o no se confirme ninguno.
- Usar el enum cerrado actual de `reason`; no crear motivos libres nuevos.
- Derivar dirección y etiqueta de compatibilidad desde el motivo y el signo.
- Congelar `inventoryProductHistory` como legado y migrar sus lectores activos.
- Exigir idempotencia, producto normalizado y business code de bodega en toda escritura nueva.

## Capabilities

### New Capabilities

- `inventory-balance-ledger`: contrato único entre saldo operativo y movimientos auditables.

### Modified Capabilities

Ninguna.

## Impact

- Backend sensible: `inventoryService`, controlador de inventario, ajustes, traslados, importaciones, fulfillment, `/flows` y analítica de inventario.
- Datos: `inventory`, `inventoryMovement`; `inventoryProductHistory` queda solo lectura.
- No se crea colección nueva ni se hace limpieza histórica en este cambio.
- Depende de `establish-inventory-safety-baseline` aprobado y observado.
- Decisión de programa: D-134.

## No-goals

- No borrar duplicados históricos.
- No reconstruir motivos pasados sin evidencia.
- No cambiar todavía cuándo una venta reserva o libera unidades.
- No cambiar el enrutamiento Shopify/Cereza.
- No modificar documentos del maestro de productos ni ninguna lista, regla o valor de precios.

## Risks

- Tocar un escritor compartido puede afectar POS, Venta Asistida, fulfillment o Shopify; se migra un camino por vez detrás de bandera.
- Un backfill de motivos puede falsear historia; primero será solo simulación y cobertura.
- Lectores antiguos pueden depender de textos actuales; se conserva una etiqueta derivada de compatibilidad durante la transición.
