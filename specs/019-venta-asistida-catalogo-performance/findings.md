# Findings — Spec 019 (performance catálogo venta asistida)

> As-is verificado contra código real + medición read-only contra Firestore de producción (`julsmind-katuq`). Sin escrituras.

## Reporte original
Sesión 2026-07-01 (D-067/D-068): tras implementar el filtro de categoría/subcategoría, el usuario reportó que la venta asistida está "extremadísimamente lenta". No se investigó en esa sesión. Esta spec retoma ese pendiente.

## Root cause confirmado

Endpoint único: `POST /v1/productos/all/filter/paginated` (`routers/productos.js:385`) → `PaginatedController.getAllByFilterPaginated` (`controllers/productosPaginated.js:528`).

Cuando el filtro trae `bodega.idBodega` (**siempre** el caso en venta asistida — el catálogo del step 2 siempre es por bodega), la request se desvía a `handleBodegaPagination` (`productosPaginated.js:815`), que en **cada request** (carga inicial, cada tecla de búsqueda, cada click de filtro), sin importar `pageSize`/cursor:

1. Trae **TODOS** los docs de `inventory` de esa bodega (sin límite) — `productosPaginated.js:824-829`.
2. Por cada `productoId` único, hace `db.getAll()` en lotes de 100 refs, pero **secuencial** (`for` + `await`, no `Promise.all`) — `productosPaginated.js:858-888`.
3. Además trae **TODOS** los productos no-inventariables de la empresa completa (`company`-wide, sin filtro de bodega) — `productosPaginated.js:922-925`.
4. **Recién ahí** aplica dedup, filtros (`applyInMemoryFilters`) y paginación en memoria (`productosPaginated.js:958+`).

La "paginación" (`pageSize`/cursor) es una ilusión para este camino: siempre se lee el catálogo completo de la bodega antes de decidir qué página mostrar.

Esto **no lo introdujo D-067/D-068** (sesión 2026-07-01) — es arquitectura preexistente del refactor "inventory como fuente de verdad" (commit `a0f846a`). D-068 solo agregó `categoryLabels` como un filtro más de `applyInMemoryFilters` y una condición más de `requiresInMemoryFilter` — no cambió el patrón de traer todo primero.

## Medición real (read-only, producción, 2026-07-02)

Script de diagnóstico ejecutado contra Firestore de producción (`julsmind-katuq`, sin escrituras, borrado tras la medición), replicando exactamente los pasos de `handleBodegaPagination`:

| Empresa | Bodega | Docs `inventory` | Productos únicos | Tiempo medido |
|---|---|---|---|---|
| OH MY STORE | BOD-CEREZA-1 | 20.102 | 8.228 | **~87.3s** (83 batches secuenciales de `getAll`, ~900-1300ms c/u) |
| ALMARA FELICIDAD | BOD-005 | 1.446 | 1.446 | **~24.0s** |
| CAFE ESCOBAR | BOD-006 | 5 | 5 | ~1.0s (catálogo trivial, no representativo) |

El cuello de botella dominante es el paso 2 (batches de `getAll()` secuenciales): cada batch de 100 refs tarda ~0.9-1.3s por round-trip, y se ejecutan uno tras otro. Paralelizar con `Promise.all` reduciría el tiempo total al del batch más lento (paralelismo real limitado por la propia Firestore), pero **no resuelve el problema de fondo**: se sigue leyendo el catálogo entero en cada request, sin importar cuántos productos se van a mostrar.

Total de combinaciones company+bodega en producción con datos de inventario: 54. Top 10 por volumen confirma que varias empresas activas (no solo el tenant de pruebas OH MY STORE) tienen catálogos de cientos/miles de productos por bodega — el problema no es aislado a un caso extremo.

## Alcance — quién más consume este endpoint (Q-03 RESUELTA, 2026-07-02)

- Backend: un único endpoint (`productosPaginated.js:528`), una única ruta (`routers/productos.js:385`).
- Frontend: **solo** `EcomerceProductsComponent` (venta asistida, step 2) lo consume en producción, vía `ventas.service.ts:164`.
- **POS2 usa un camino completamente distinto:** `product.component.ts` (widget real de POS2) llama `InventarioService.obtenerInventarioPorBodega(bodegaId)` → `GET /inventory/bodega/:bodegaId?loadAll=true` — otro controller, sin relación con `handleBodegaPagination`. Los servicios `productos-paginated.service.ts`/`productos-paginados.service.ts` y el `product-paginated.component.example.ts` que los usa son código de referencia **no cableado** a ninguna ruta real.
- **Conclusión:** el fix queda acotado a venta asistida únicamente. Sin riesgo de regresión cross-superficie en POS2.

## Qué NO se investigó todavía (queda para plan.md)
- Estrategia concreta de reemplazo (paginar contra la base de datos vs. cache de catálogo vs. índice de búsqueda dedicado) — es decisión de diseño, no de spec.
- Impacto de mover el conteo total de páginas de "exacto" a "aproximado" en la UI de venta asistida (si aplica).
- Si el fallback por referencia (`productosPaginated.js:891-916`, productos con `productoId` legacy no encontrados por docId) sigue siendo necesario con la nueva estrategia.

## Resultado de la implementación (T-01..T-06, 2026-07-02)

**Diseño final** (revisado por un agente Plan antes de implementar — ver decisiones en `plan.md`): `handleBodegaPagination` reescrito para arrancar desde `products` (mismo motor "overfetch iterativo" de la ruta general) y resolver pertenencia a la bodega por lote reusando el helper YA EXISTENTE y probado `getRealStockMap` (`services/productStockHelper.js`) — no se reinventó lógica de dedup.

**Regresión (viejo vs nuevo, contra producción real, read-only):**

| Caso | Viejo | Nuevo | Diferencias |
|---|---|---|---|
| ALMARA FELICIDAD/BOD-005, sin filtro | 45.264ms | 2.037ms | 0 |
| ALMARA FELICIDAD/BOD-005, con searchTerm | 42.230ms | 1.473ms | 0 |
| OH MY STORE/BOD-CEREZA-1, sin filtro | 81.194ms | 1.243ms | 4 (ver abajo, esperadas) |
| CAFE ESCOBAR/BOD-006, sin filtro | 595ms | 1.747ms | 0 |

**Las 4 diferencias en OH MY STORE son un fix intencional, no una regresión.** Se verificó leyendo los docs `inventory` crudos: los 4 productos tienen **2 documentos de inventory duplicados** para el mismo producto+bodega (ej. `xfJI27DwcfdGciRjnxJN`: doc `VfRqNNslsABEjjgPQopR` cantidad=110 + doc `xfJI27DwcfdGciRjnxJN_BOD-CEREZA-1` cantidad=41). El código viejo **sumaba** ambos (110+41=151, el valor "viejo" observado) — exactamente el bug de doble conteo documentado en `CLAUDE.md` y en el propio `productStockHelper.js` (que menciona 1666 keys duplicadas en esta misma empresa por un bug del writer de sync). El código nuevo usa la política **MAX-WINS** ya corregida de ese helper (max(110,41)=110, el valor "nuevo") — más correcto, no una regresión. Documentado explícitamente en vez de ocultarlo (Artículo VIII).

**Filtro de categoría (D-068) — verificado funcional, con una limitante conocida y pre-existente:** se probó con `categoryLabels:["minitortas"]` contra ALMARA FELICIDAD — mismo resultado exacto (1 producto) en viejo y nuevo. Pero el tiempo del nuevo camino subió a **~30s** para este filtro específico. Causa: las categorías de esta empresa real tienen selectividad muy baja (categoría con más productos = 3, la mayoría tienen 1-2), y no existe índice de Firestore sobre el label de categoría (vive en un campo `categorias` en formato "flatted", no un array indexado) — el overfetch iterativo necesita escanear casi todo el catálogo para encontrar los pocos que matchean, sin importar la estrategia. **Esto NO es una regresión**: el código viejo tardaba ~51s para el mismo caso (siempre escaneaba todo, para cualquier filtro). Es una característica conocida y ya aceptada del mismo patrón "overfetch iterativo" que **ya corre hoy en producción** para la ruta general (no-bodega) — no se introduce un riesgo nuevo, se extiende uno ya existente. **Fuera de alcance de esta spec** (spec.md §6: "el filtro de categoría en sí mismo... no se toca qué filtros existen"). Queda como mejora futura documentada (posible sub-spec: denormalizar `categoriaLabels` como array indexado en el producto para permitir `array-contains-any` en Firestore).

**Conclusión NFR 5.1 (p95 ≤ 2s):** cumplido para el caso general (sin filtro, búsqueda, ciudad, género, ocasión) — de ~24-87s a ~1-2s. El filtro de categoría específicamente puede seguir siendo lento en categorías muy poco pobladas, igual que antes — no empeora, no mejora, documentado como limitación conocida no resuelta por esta spec.

## Bug real encontrado en validación con el usuario (2026-07-02, post-implementación)

El usuario probó en vivo y reportó: velocidad correcta, pero **"la cantidad de productos no es la correcta"** y preguntó qué pasó con los filtros de categoría/subcategoría.

**Investigado (no asumido):**
1. **El conteo total (`pagination.totalItems`) ignoraba por completo cualquier filtro activo.** La primera versión calculaba `totalItems` UNA sola vez al inicio, vía `inventory.count()` de toda la bodega — sin mirar `categoryLabels`/`searchTerm`/etc. Se confirmó con un caso real: filtro por categoría "Floristeria" (+ sus 3 subcategorías reales, deserializando el árbol real de `/categorias` con el mismo `mapCategoria()`/`collectCategoryLabels()` que usa el frontend) devolvía correctamente **0 productos**, pero `totalItems` seguía mostrando **1446** (el total sin filtrar) — el bug visible que el usuario reportó como "cantidad incorrecta".
2. **El filtro de categoría/subcategoría en sí NO estaba roto** — se verificó con el árbol real (nodo padre "Floristeria" con hijos "Arreglos florales"/"Bouquets"/"Preservadas") y con la categoría real "Minitortas" (1 producto): en ambos casos el nuevo handler devuelve exactamente el mismo resultado que el viejo (0 y 1 respectivamente). La confusión del usuario fue causada por el conteo incorrecto (item 1), que hacía parecer que el filtro no funcionaba ("dice que hay 1446 pero no veo nada").

**Fix aplicado:** el conteo final se calcula DESPUÉS del loop de overfetch, no antes — usando la proporción de candidatos escaneados vs. los que matchearon filtro+bodega (`matchedCount/scannedCount`) extrapolada sobre el universo de productos de la empresa. Si el loop agota el catálogo completo de la empresa (`catalogExhausted`), el conteo es EXACTO (no una extrapolación) — cubre exactamente los casos de categorías poco pobladas donde antes se mostraba mal. Verificado de nuevo contra los 3 casos reales tras el fix:

| Caso | Viejo | Nuevo | approxCount |
|---|---|---|---|
| ALMARA FELICIDAD, sin filtro | 1585 | 1407 | true (estimado, ~11% de margen) |
| OH MY STORE, sin filtro | 8229 | 7249 | true (estimado, ~12% de margen) |
| CAFE ESCOBAR, sin filtro | 5 | 5 | false (exacto, catálogo agotado) |
| Categoría "Floristeria"+hijos (0 productos reales) | 0 | **0** (antes: 1446) | false (exacto) |
| Categoría "Minitortas" (1 producto real) | 1 | **1** | false (exacto) |

Regresión completa (0 diferencias de producto, solo el conteo cambió de comportamiento) re-verificada tras el fix.
