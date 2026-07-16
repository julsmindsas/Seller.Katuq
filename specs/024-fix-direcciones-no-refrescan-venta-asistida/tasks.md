# Tasks 024 — Fix: dirección creada no aparece de inmediato en venta asistida

> Estado: **approved**
> Vinculado a `plan.md` (approved 2026-07-16).
> Última actualización: 2026-07-16

## Tareas

### T-01 — Fix `guardarDatosEntrega()` (mutación en el lugar) `[P]`
- **Input:** `pedido-entrega.component.ts`, método `guardarDatosEntrega()` (líneas ~282-409). Reasigna `this.datosEntregas` en 4 puntos (reset inicial línea 287, y 3 ramas del refetch post-guardado líneas 354/358/362).
- **Output:** las 4 reasignaciones pasan a mutar el array existente en el lugar (`splice(0, this.datosEntregas.length, ...nuevos)` / `splice(0, this.datosEntregas.length)` para vaciar), mismo patrón que `editarDatosEntrega()` (línea 522 del mismo archivo).
- **Criterio de éxito:** crear una dirección de envío nueva la muestra de inmediato en el listado sin recargar cliente ni retroceder de paso. `ng serve` compila sin errores.
- **Archivos a tocar:** `src/app/components/ventas/entrega/pedido-entrega.component.ts`.
- **Dependencias:** ninguna.

### T-02 — Fix `guardarDatosFacturacionElectronica()` (mutación en el lugar) `[P]`
- **Input:** `pedido-facturacion.component.ts`, método `guardarDatosFacturacionElectronica()` (líneas ~132-192). Reasigna `this.datosFacturacionElectronica = nuevaLista` en línea 166.
- **Output:** la reasignación pasa a mutar el array existente en el lugar, mismo patrón que el bloque ya arreglado en el mismo archivo (línea 401).
- **Criterio de éxito:** crear una dirección de facturación electrónica nueva la muestra de inmediato en el listado sin recargar cliente ni retroceder de paso.
- **Archivos a tocar:** `src/app/components/ventas/facturacion/pedido-facturacion.component.ts`.
- **Dependencias:** ninguna.

### T-03 — Verificación manual en navegador (deps: T-01, T-02)
- **Input:** fixes de T-01/T-02 compilados en `ng serve`.
- **Output:** el usuario confirma en el navegador: (a) crear dirección de envío aparece de inmediato; (b) crear dirección de facturación aparece de inmediato; (c) editar una dirección existente de cualquiera de los dos tipos sigue funcionando igual (no regresión de `4df0972`).
- **Criterio de éxito:** los 3 puntos confirmados por el usuario.
- **Archivos a tocar:** ninguno (solo verificación).
- **Dependencias:** T-01, T-02.

## Orden de ejecución sugerido
1. T-01 y T-02 en paralelo (`[P]`, archivos distintos).
2. T-03 al terminar T-01 y T-02.

## Definition of Done
- `ng serve` compila sin errores tras T-01/T-02.
- Verificación de constitución sin "no" pendientes (ya confirmado en `plan.md`).
- Usuario confirma en navegador (T-03) los 3 puntos de regresión/funcionalidad.
- `CONTRACT.md` actualizado con el cierre.
- Commit **solo con autorización explícita del usuario**.
