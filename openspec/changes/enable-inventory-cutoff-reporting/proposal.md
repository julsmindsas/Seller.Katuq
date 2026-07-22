# Propuesta: inventario confiable por fecha de corte

## Why

La tarea de OH MY STORE “Exportar y visualizar inventario por fecha de corte” no puede resolverse con una resta bonita sobre historia incompleta. Hoy el saldo actual puede cuadrar mientras movimientos antiguos faltan, usan otra fecha, tienen producto/bodega legacy o viven en una colección que ya no recibe datos.

Katuq debe ofrecer el reporte, pero también decir con claridad cuándo el resultado es exacto y cuándo solo es una estimación no certificada. Un número dudoso no puede presentarse como contabilidad cierta.

## What Changes

- Consultar y exportar inventario a una fecha/hora de corte bajo una sola regla.
- Normalizar producto y business code de bodega antes de consolidar.
- Reconstruir desde un ancla certificada y movimientos completos.
- Mostrar cobertura, confianza y huecos por fila y por reporte.
- Incluir fecha, zona horaria, empresa y criterios usados en la exportación.
- Impedir que períodos anteriores al inicio certificado se rotulen como exactos.

## Capabilities

### New Capabilities

- `inventory-cutoff-reporting`: vista y exportación histórica con nivel de certeza verificable.

### Modified Capabilities

Ninguna.

## Impact

- Módulo de inventarios, servicio de reportes y ledger de movimientos.
- Depende de `establish-inventory-safety-baseline` y `stabilize-inventory-ledger`.
- Reutiliza endpoints/módulos actuales; no propone endpoint `v2` ni colección nueva.
- Se enlaza con ClickUp `wdu9v76exg` / `wdu9v76ekh` después de aprobar la spec.
- Decisión de programa: D-134.

## No-goals

- No inventar movimientos faltantes.
- No certificar fechas anteriores a la cobertura demostrada.
- No corregir saldos desde el reporte.
- No crear un segundo consolidado con reglas diferentes para pantalla y exportación.
- No modificar productos, precios ni listas de precios; el reporte solo los consulta para identificación o visualización.

## Risks

- Un saldo actual incorrecto contamina la reconstrucción; se exige ancla certificada.
- Zonas horarias distintas pueden mover transacciones de día; el corte declara `America/Bogota`.
- Duplicados históricos pueden inflar cifras; se usa la identidad normalizada y se muestra ambigüedad.
