# Tasks 020 — Índice de categoría para filtrado rápido en venta asistida

> Estado: **approved**
> Vinculado a `plan.md` (**approved**, D-072).
> Última actualización: 2026-07-02

## Convenciones
- `[P]` = tarea paralelizable.
- `(deps: T-NN)` = depende de la tarea NN.

## Tareas

### T-01 — Confirmar sitios ambiguos (Fase A) `[P]`
- **Input:** `findings.md` (sitio #1/#2/#5 endpoint exacto de create/edit manual; sitio #11 flows/shopify mapper).
- **Output:** línea exacta del endpoint backend detrás de `crear-productos.component.ts`; confirmación de si `shopifyProductToCanonical` se persiste como producto real.
- **Criterio de éxito:** ambos puntos documentados en `findings.md` con file:line.
- **Dependencias:** ninguna.

### T-02 — Helper `computeCategoriasIndex()` + contract test (Fase B) `[P]`
- **Input:** las 5 formas reales documentadas en `findings.md`.
- **Output:** `functions/services/categoriaIndexHelper.js` con `computeCategoriasIndex(product)` — normaliza `categorias` (5 formas) + `exposicion.categorias` (Woo) a `string[]` lowercase deduplicado. Test/script con fixtures de las 5 formas reales, PASS antes de tocar los escritores.
- **Criterio de éxito:** las 5 formas + el caso "sin categoría" producen el array esperado.
- **Dependencias:** ninguna.

### T-03 — Índice compuesto Firestore (Fase C)
- **Input:** `firestore.indexes.json` actual.
- **Output:** nuevo índice `company ASC, categoriasIndex ARRAY_CONTAINS, date_edit DESC, __name__ ASC` agregado y desplegado.
- **Criterio de éxito:** índice en estado "Enabled" en Firestore antes de avanzar a T-06.
- **Dependencias:** ninguna (se puede desplegar en paralelo a T-01/T-02).
- 🔄 **2026-07-06 — parcialmente hecho, forma incorrecta:** el usuario gestionó la creación del índice con una persona con permisos GCP. Verificado con query real: **existe un índice activo para `categoriasIndex` pero con dirección de `__name__` distinta a la declarada** (funciona sin el segundo `orderBy` explícito de desempate, falla con `orderBy(__name__,'asc')`, que es exactamente lo que arma `handleBodegaPagination:855`). **Falta crear el índice con la forma exacta.** Link directo para crearlo: `https://console.firebase.google.com/v1/r/project/julsmind-katuq/firestore/indexes?create_composite=Ck9wcm9qZWN0cy9qdWxzbWluZC1rYXR1cS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcHJvZHVjdHMvaW5kZXhlcy9fEAEaEwoPY2F0ZWdvcmlhc0luZGV4GAEaCwoHY29tcGFueRABGg0KCWRhdGVfZWRpdBACGgwKCF9fbmFtZV9fEAE`. CLI (`firebase deploy --only firestore:indexes`) sigue en 403 (`serviceusage.serviceUsageConsumer` no propagado) para la cuenta `turivnfc@gmail.com`.

### T-04 — Actualizar los 11 sitios de escritura (Fase D) (deps: T-01, T-02)
- **Input:** helper de T-02, confirmaciones de T-01.
- **Output:** cada sitio de `findings.md` (excepto #12, código muerto) llama `computeCategoriasIndex()` y persiste `categoriasIndex` junto con `categorias`.
- **Criterio de éxito:** `node -c` en cada archivo tocado; smoke test manual de al menos 1 escritura real (ej. editar un producto) mostrando `categoriasIndex` poblado.
- **Dependencias:** T-01, T-02.

### T-05 — Script de backfill con --dry-run (Fase E) (deps: T-02)
- **Input:** helper de T-02.
- **Output:** `functions/scripts/backfill-categorias-index.js`, modo `--dry-run` (cuenta sin escribir) y modo real (escribe por lotes). Loguea: total procesados, indexados, sin categoría, forma no reconocida.
- **Criterio de éxito:** `--dry-run` corrido contra producción sin escribir nada, números razonables; luego corrida real.
- **Dependencias:** T-02.
- ✅ **2026-07-06 — corrida real ejecutada, acotada a ALMARA FELICIDAD:** dry-run re-confirmado (2.110 escaneados, 2.077 con categoría, 33 sin) → corrida real `node scripts/backfill-categorias-index.js --company="ALMARA FELICIDAD"`, **2.110 escrituras** en 6 batches, números idénticos al dry-run. Solo agrega `categoriasIndex`, no toca `categorias`. **Pendiente extender a las demás empresas** (decisión explícita de acotar solo a ALMARA sigue vigente hasta que el usuario lo pida).

### T-06 — Backend usa `categoriasIndex` (Fase F) (deps: T-03, T-04, T-05)
- **Input:** índice desplegado (T-03), campo poblado (T-04 nuevos + T-05 backfill).
- **Output:** `buildProductQuery` agrega `.where('categoriasIndex','array-contains-any', chunk)` cuando `categoryLabels.length` entre 1 y 30; `applyInMemoryFilters` lee `categoriasIndex` en vez de `extractCategoriaLabel(categorias)`.
- **Criterio de éxito:** compila, no rompe el caso >30 labels (fallback a memoria).
- **Dependencias:** T-03, T-04, T-05.

### T-07 — Regresión + medición de performance (Fase G) (deps: T-06)
- **Input:** casos reales ya conocidos (Floristeria+hijos=0, Minitortas=1, Cupcakes otros temas=3) — reusar scripts de spec 019 adaptados.
- **Output:** 0 diferencias funcionales vs. el filtro en memoria; p95 ≤ 2s incluso en categorías con 0-1 productos.
- **Criterio de éxito:** el caso que tardaba ~30s ahora corre en el presupuesto de NFR 5.1.
- **Dependencias:** T-06.
- ✅ **2026-07-07 — corrido contra ALMARA FELICIDAD / bodega `BOD-005`, 5 casos, 0 errores (`FAILED_PRECONDITION` resuelto).** Tiempos 1.68s–6.14s: floristeria 1.68s (5 prod), minitortas 2.66s (30 prod), navidad 3.00s (94 prod), fechas especiales 2.56s (85 prod), **chocolates 6.14s (163 prod) — sobre el NFR de ≤2s**. Causa identificada (no es el loop iterativo — los 5 casos resolvieron en 1 sola iteración): el tiempo escala con la cantidad de candidatos de la categoría que `getRealStockMap` tiene que resolver contra `inventory` en un solo overfetch (hasta `fetchSize=pageSize×3=150`), vía queries paralelas en lotes de 10 IDs — con ~150 candidatos eso son ~15-30 queries paralelas, cada una con su round-trip a Firestore desde la laptop local (no desde EC2/prod, que debería tener menor latencia por estar en la misma nube). **Decisión explícita del usuario: aceptar como deuda conocida y seguir** — 1.9-6.2s ya es 4-14x más rápido que el baseline sin índice (~24-87s); no se investiga más a fondo ni se mide contra EC2 antes de cerrar esta spec. Queda pendiente si en el futuro se reporta lentitud real en producción.

### T-08 — Commit (Fase H) (deps: T-07)
- **Input:** todo lo anterior validado.
- **Output:** commit backend (+ el índice de Firestore ya desplegado por separado en T-03) — sin push/deploy de código sin confirmación explícita del usuario. `CONTRACT.md` actualizado con resultado final.
- **Dependencias:** T-07.

## Orden de ejecución sugerido
1. T-01, T-02, T-03 en paralelo (`[P]`).
2. T-04 y T-05 al terminar T-01/T-02 (pueden correr en paralelo entre sí).
3. T-06 al terminar T-03, T-04, T-05.
4. T-07 → T-08.

## Definition of Done
- T-07 en verde: 0 divergencias + p95 ≤ 2s incluso en categorías con 0-1 productos reales.
- Los 11 sitios de escritura activos actualizados (T-04) + backfill corrido (T-05).
- Índice de Firestore en producción, no solo en `firestore.indexes.json` local (T-03).
- `CONTRACT.md` actualizado con el cierre.
- Sin deploy de código a producción sin confirmación explícita del usuario.
