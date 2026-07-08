# Tasks 019 — Performance del catálogo de productos en venta asistida

> Estado: **approved**
> Vinculado a `plan.md` (**approved**, D-069).
> Última actualización: 2026-07-02

## Convenciones
- `[P]` = tarea paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Todas las tareas de este spec son de **solo lectura contra producción** hasta T-08 (commit); ninguna escribe datos.

## Tareas

### T-01 — Script de regresión: handler viejo vs nuevo `[P]`
- **Input:** los 3 casos reales de `findings.md` (ALMARA FELICIDAD/BOD-005, OH MY STORE/BOD-CEREZA-1, CAFE ESCOBAR/BOD-006) + combinaciones de filtros a probar (sin filtro, con `categoryLabels`, con `searchTerm`, con `deliveryCity`).
- **Output:** script read-only (`functions/scripts/_tmp` o similar, no se commitea) que llama ambos handlers (viejo y nuevo, este último detrás de una función auxiliar temporal) contra los mismos inputs y compara: mismo set de `cd` por página (cualquier orden), misma `cantidadDisponible` por producto, mismo resultado de filtro de categoría (D-068) y búsqueda, mismo comportamiento de dedup dual-key legacy.
- **Criterio de éxito:** el script corre y reporta diffs (aunque T-03/T-04 aún no existan, el script queda listo para usarse en T-06).
- **Archivos a tocar:** ninguno del repo (script temporal en scratchpad, mismo patrón que `findings.md`).
- **Dependencias:** ninguna.

### T-02 — Script de medición de performance del handler nuevo `[P]`
- **Input:** adaptar el script de medición ya usado en `findings.md` (mide inventory query + getAll + no-inventariables) para medir el flujo nuevo (query products + overfetch + verificación de bodega por lote).
- **Output:** script read-only que reporta tiempo total y por etapa (query products, chunks `in` de inventory, count aproximado) para los 3 casos reales.
- **Criterio de éxito:** el script corre y produce números comparables a los de `findings.md` (mismo formato de tabla).
- **Archivos a tocar:** ninguno del repo (scratchpad).
- **Dependencias:** ninguna.

### T-03 — Motor base: query por company + overfetch iterativo (Fase B)
- **Input:** `handleBodegaPagination` actual (`productosPaginated.js:815`) + el motor "overfetch iterativo" ya existente en la ruta general (líneas 652-726 del mismo archivo).
- **Output:** `handleBodegaPagination` reescrito para consultar `products` vía `buildProductQuery({company})` + `orderBy(sortBy).orderBy(docId)` + el mismo loop de overfetch (`FETCH_SIZE=pageSize*3`, `MAX_ITERATIONS=5`), **sin** todavía la verificación de pertenencia a bodega (esa es T-04) — de momento el resultado incluye productos de toda la empresa, no solo de la bodega (paso intermedio, no shippable solo).
- **Criterio de éxito:** compila (`node -c`), el loop llena `pageSize` o agota candidatos, aplica `applyInMemoryFilters` (categoría/búsqueda/ciudad/género/ocasión) igual que hoy.
- **Archivos a tocar:** `functions/controllers/productosPaginated.js`.
- **Dependencias:** ninguna.

### T-04 — Verificación de pertenencia a bodega por lote acotado (Fase C) (deps: T-03)
- **Input:** el candidato de producto (docId + `identificacion.referencia` si existe) por cada lote del loop de T-03.
- **Output:** por lote, chunk de hasta 30 claves (docId + referencia, ambas formas — regla crítica dual-key de `CLAUDE.md`) → `inventory.where(company==).where(idBodega==).where(productoId in [chunk])`; productos con `disponibilidad.inventariable===false` se incluyen siempre (`cantidadDisponible=999999`) sin pasar por esta verificación; el resto solo se incluye si aparece en el resultado, con `cantidad` sumada y dedupeada por `${normId}_${idBodega}` (mismo patrón que `calcularMetricasPorBodega`).
- **Criterio de éxito:** para los 3 casos reales, el set de productos devueltos coincide con el que devuelve hoy el handler viejo (validar con T-01 aunque sea parcialmente, formalmente en T-06).
- **Archivos a tocar:** `functions/controllers/productosPaginated.js`.
- **Dependencias:** T-03.

### T-05 — Conteo aproximado + flag `approxCount` (Fase D) (deps: T-04)
- **Input:** `inventory.where(company==).where(idBodega==)` (mismo filtro base que hoy, sin traer los docs).
- **Output:** `totalItems`/`totalPages` calculados vía `.count().get()` (agregación) en vez de `allProducts.length`; agregar `meta.approxCount: true` en la respuesta cuando el conteo no sea exacto (siempre, en este camino).
- **Criterio de éxito:** el endpoint responde con `pagination.totalItems` aproximado y `meta.approxCount: true`, sin leer el catálogo completo para calcularlo.
- **Archivos a tocar:** `functions/controllers/productosPaginated.js`.
- **Dependencias:** T-04.

### T-06 — Cerrar el ciclo: regresión 0 diffs + performance ≤2s p95 (Fase E) (deps: T-01, T-02, T-05)
- **Input:** scripts de T-01/T-02 corridos contra el handler ya completo (T-03+T-04+T-05).
- **Output:** 0 divergencias funcionales entre viejo y nuevo en los 3 casos + filtros combinados; p95 ≤ 2s en los 3 casos reales (NFR 5.1). Si no se cumple, tunear `FETCH_SIZE`/`MAX_ITERATIONS` (OT-01 de `plan.md`) y volver a medir.
- **Criterio de éxito:** ambos scripts en verde con los números documentados (para dejar rastro en `CONTRACT.md` al cerrar).
- **Archivos a tocar:** posible ajuste de constantes en `productosPaginated.js` si el tuning lo requiere.
- **Dependencias:** T-01, T-02, T-05.

### T-07 — Validación manual en navegador (Fase F) (deps: T-06)
- **Input:** backend con el fix corriendo local (`:3300`), frontend (`:4200`).
- **Output:** confirmar (a) los 3 checks pendientes de D-067/D-068 (consola limpia + orden de categorías, aislamiento cross-tenant con 2 empresas en la misma pestaña, filtro de categoría funcional) y (b) percepción de velocidad del catálogo con una empresa de catálogo grande real (ALMARA FELICIDAD u OH MY STORE).
- **Criterio de éxito:** los 4 checks (3 de D-067/D-068 + percepción de velocidad) pasan, confirmado por el usuario.
- **Archivos a tocar:** ninguno (validación).
- **Dependencias:** T-06.

### T-08 — Commit (Fase G, rollout) (deps: T-07)
- **Input:** `productosPaginated.js` con el fix validado + D-067/D-068 ya validados (mismo working tree pendiente desde la sesión 2026-07-01).
- **Output:** commit en `backend-aws-security` (backend) — **sin push, sin deploy** hasta confirmación explícita del usuario (mismo patrón usado en sesiones previas de este proyecto). Actualizar `CONTRACT.md` con el resultado final (números de T-06) y cerrar spec 019 como `done` o `implementación done — pending deploy`.
- **Criterio de éxito:** commit creado, `CONTRACT.md` actualizado, usuario informado del estado de git en ambos repos.
- **Archivos a tocar:** commit de `productosPaginated.js` (+ los archivos ya pendientes de D-067/D-068 si el usuario decide commitear todo junto — a confirmar con el usuario en ese momento, no asumir).
- **Dependencias:** T-07.

## Orden de ejecución sugerido
1. T-01 y T-02 en paralelo (`[P]`) — no dependen de código nuevo.
2. T-03 → T-04 → T-05 (secuencial, mismo archivo, cada fase construye sobre la anterior).
3. T-06 al terminar T-05 (usa T-01/T-02).
4. T-07 al terminar T-06.
5. T-08 al terminar T-07.

## Definition of Done
- T-06 en verde: 0 divergencias funcionales + p95 ≤ 2s en los 3 casos reales medidos.
- T-07 validado manualmente por el usuario (incluye los pendientes de D-067/D-068, no solo lo nuevo de esta spec).
- Verificación de constitución del `plan.md` sin "no" pendientes.
- `CONTRACT.md` actualizado con el cierre (D-XXX nueva) incluyendo números antes/después.
- Sin deploy a producción sin confirmación explícita del usuario.
