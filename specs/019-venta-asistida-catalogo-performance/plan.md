# Plan 019 — Performance del catálogo de productos en venta asistida

> Estado: **approved** (2026-07-02 — D-069)
> Vinculado a `spec.md` (**approved**, D-069).
> Última actualización: 2026-07-02

## 1. Resumen técnico

Invertir el orden de resolución de `handleBodegaPagination`: hoy arranca desde `inventory` (todo el catálogo de la bodega) y resuelve productos después. El fix arranca desde `products` — reusando el motor de query+paginación+overfetch que **ya existe y funciona** en la ruta general (`buildProductQuery` + "overfetch iterativo", líneas 652-726 de `productosPaginated.js`) — y por cada lote acotado de candidatos (`FETCH_SIZE = pageSize*3`, igual que hoy) verifica pertenencia a la bodega con una consulta `inventory` acotada por lote (`productoId in [...]`, chunks de ≤30), en vez de cargar la bodega completa. El conteo total pasa de exacto a aproximado (`inventory.count()`, agregación barata) — aceptado en Q-02.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec.md approved (D-069) antes de este plan |
| II — Spec captura intent | sí | spec.md sin tecnología; este plan sí la nombra |
| IV — Idempotencia | sí | endpoint de solo lectura, no aplica |
| V — Eventos crudos | n/a | no es un webhook |
| VI — UI no acoplada a proveedor | n/a | no es integración con proveedor externo |
| VII — Observabilidad | sí | se mantiene/amplía el log `[ProductsPaginated-Bodega] Página X/Y: N productos (Xms)` con conteo de docs leídos |
| VIII — Test-first contratos | sí | fixture de regresión contra el endpoint existente antes de tocar el handler (§6) |
| IX — Estilo Angular | n/a | cambio 100% backend, sin tocar frontend |
| X — Seguridad webhooks | n/a | no es webhook |
| XI — Datos sensibles fuera del log | sí | logs actuales ya no exponen PII, se mantiene igual |

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Backend**: `functions/controllers/productosPaginated.js` — reescribir `handleBodegaPagination`. Sin cambios de ruta (`routers/productos.js:385` intacta) ni de contrato request/response (mismo shape).
- **Frontend**: sin cambios (mismo endpoint, mismo request/response shape).
- **Firestore**: mismas colecciones (`products`, `inventory`). Índices compuestos ya existentes cubren el nuevo patrón de consulta (`inventory`: `company+idBodega+productoId` ya existe en `firestore.indexes.json:1127-1142` y `company+productoId+idBodega` en `:2622-2638` — soportan `where(company==).where(idBodega==).where(productoId in [...])` sin índice nuevo).

### 3.2 Flujo nuevo (texto)
```
1. query = buildProductQuery({company})                 // igual que ruta general, sin filtro de bodega
   query = query.orderBy(sortBy).orderBy(docId)          // orden estable, igual que ruta general

2. loop (overfetch iterativo, igual patrón que líneas 666-724, MAX_ITERATIONS=5):
   a. candidatos = query.limit(FETCH_SIZE+1).get()        // lote acotado de productos de LA EMPRESA
   b. aplicar applyInMemoryFilters(candidatos, filters)   // category/search/ciudad/genero/ocasion — igual que hoy
   c. de los que pasan el filtro, separar:
        - inventariable === false → incluir siempre (cantidadDisponible=999999)
        - resto → verificar pertenencia a ESTA bodega:
            inventory.where(company==).where(idBodega==).where(productoId in [chunk≤30])
            (chunk de docIds Y de identificacion.referencia — dual-key legacy, ver §4)
            → solo incluir si aparece en el resultado; cantidad = suma dedupeada (regla crítica CLAUDE.md)
   d. acumular hasta pageSize; si no alcanza y quedan candidatos, siguiente iteración (cursor)

3. total aproximado = inventory.where(company==).where(idBodega==).count().get()  // agregación, barata
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito que motiva | Alternativas descartadas |
|---|---|---|
| Reusar el motor "overfetch iterativo" ya probado en la ruta general en vez de inventar uno nuevo | AC-01/02/03 (no escanear todo, responder acotado) + bajo riesgo (Q-04) | Escribir paginación nueva desde cero — más riesgo, sin ganancia sobre reusar código ya en producción |
| Verificar pertenencia a bodega con `inventory` acotado por lote (`in`, chunks ≤30) en vez de cargar toda la bodega | AC-01/02/03 | Denormalizar `bodegasAsociadas` en el doc de producto — resolvería el problema mejor a largo plazo, pero es migración de esquema (mayor alcance, mayor riesgo) — se deja como mejora futura, no bloquea este fix |
| Conteo total vía `inventory.count()` (aproximado) en vez de `allProducts.length` exacto | Q-02 (aceptado) | Mantener conteo exacto — obliga a leer todo, reintroduce el problema |
| Reemplazo directo del handler, sin flag | Q-04 (aceptado) | Flag + dark-launch como spec 010 — innecesario para un cambio de solo-lectura |
| Mantener orden global vía Firestore `orderBy` (igual que ruta general) en vez de ordenar en memoria | AC-04 (preservar comportamiento funcional) | Ordenar solo dentro de cada lote — rompería el orden global que hoy sí es correcto (se calcula sobre el catálogo completo) |

## 4. Modelo de datos
Sin cambios de esquema. Se preserva la regla crítica de dedup de `inventory` (doc con `productoId`=docId **y** doc con `productoId`=referencia para el mismo producto+bodega — ver `CLAUDE.md` "REGLA CRÍTICA — DOBLE CONTEO"): el chunk de verificación de pertenencia a bodega debe incluir **ambas** claves (docId del candidato + `identificacion.referencia` si existe) y deduplicar por `${normId}_${idBodega}` antes de sumar `cantidad`, igual que el patrón ya documentado.

## 5. Contratos (API/eventos)
Sin cambios de contrato — mismo endpoint (`POST /v1/productos/all/filter/paginated` con `bodega.idBodega` en el body), mismo shape de respuesta (`products`, `pagination.{pageSize,hasNext,nextCursor,currentPage,totalItems,totalPages}`, `meta.duration`).

**Único cambio observable:** `pagination.totalItems`/`totalPages` pasan de exactos a **aproximados** cuando hay filtros activos (mismo trade-off que ya acepta la ruta general hoy — no es un cambio de contrato nuevo, es extender el mismo comportamiento ya existente al camino de bodega). Se documenta en `meta` con un flag `approxCount: true` cuando aplique, para que el frontend (si algún día lo usa) sepa que no es exacto.

### 5.1 Idempotencia
No aplica (GET/POST de solo lectura, sin efectos secundarios).

### 5.2 Errores
Sin cambios — mismos códigos 200/400/500 ya existentes.

## 6. Estrategia de testing

- **Contract test / regresión (primero, Artículo VIII):** script read-only que llama el endpoint viejo vs el nuevo contra los mismos 3 casos reales medidos en `findings.md` (ALMARA FELICIDAD BOD-005, OH MY STORE BOD-CEREZA-1, CAFE ESCOBAR BOD-006) y compara: mismo set de `cd` de productos devueltos por página (en cualquier orden), misma `cantidadDisponible` por producto, mismo comportamiento de dedup legacy, mismo resultado de filtro por categoría (D-068) y búsqueda. Cero divergencias = passing.
- **Medición de performance:** mismo script de `findings.md` adaptado para medir el handler nuevo — objetivo p95 ≤ 2s (NFR 5.1) contra los 3 casos reales.
- **Manual/E2E:** retomar la validación pendiente de D-067/D-068 en navegador (bloqueada la sesión pasada por un problema de la extensión de Chrome) + confirmar que el catálogo de venta asistida ya no se siente lento con una empresa de catálogo grande real.
- **Unit:** cobertura de la lógica de chunking `in` (≤30), dedup dual-key, e inclusión de no-inventariables dentro del mismo loop.

## 7. Fases de implementación
1. **Fase A** — Script de regresión (viejo vs nuevo) + script de medición de performance, ambos read-only, reusando los 3 casos de `findings.md`.
2. **Fase B** — Reescribir `handleBodegaPagination`: motor de query+overfetch reusando `buildProductQuery`, sin la verificación de bodega todavía (solo scoping por `company`).
3. **Fase C** — Agregar verificación de pertenencia a bodega por lote (`inventory` `in` chunks ≤30) + dedup dual-key + inclusión de no-inventariables dentro del loop.
4. **Fase D** — Conteo aproximado vía `inventory.count()` + flag `approxCount` en `meta`.
5. **Fase E** — Correr script de regresión (Fase A) contra el handler nuevo hasta 0 divergencias; correr script de performance hasta cumplir NFR 5.1 (p95 ≤ 2s) en los 3 casos reales.
6. **Fase F** — Validación manual en navegador: los 3 checks pendientes de D-067/D-068 + percepción de velocidad del catálogo.
7. **Fase G** — Rollout: reemplazo directo (sin flag, Q-04), commit + decisión del usuario sobre push/deploy (mismo patrón de confirmación explícita usado en sesiones previas de este proyecto).

## 8. Plan de rollout
- Sin feature flag (Q-04).
- Verificación local (Fases A-F) antes de cualquier commit.
- Rollback: revert de un único archivo (`productosPaginated.js`) — sin migración de datos, sin estado persistido nuevo.
- Despliegue a producción: **requiere confirmación explícita del usuario** antes de desplegar (mismo patrón que D-065/D-069 — el usuario ya indicó en sesiones previas que commit ≠ autorización de deploy).

## 9. Riesgos técnicos
- **RT-01** — El ratio de productos que pertenecen a la bodega específica (vs el total de la empresa) puede ser bajo en empresas con múltiples bodegas muy segmentadas → el overfetch iterativo podría necesitar más de `MAX_ITERATIONS=5` para llenar una página. Mitigación: medir con casos reales en Fase E; si hace falta, subir `FETCH_SIZE`/`MAX_ITERATIONS` (mismo mecanismo ya tuneable de la ruta general).
- **RT-02** — Chunking de `in` a 30 elementos agrega N/30 queries pequeñas por iteración — más round-trips que una sola lectura grande, pero cada uno es una consulta indexada acotada (no un table scan), y el total sigue siendo proporcional a `pageSize`, no al catálogo.
- **RT-03** — El orden global ahora depende de `orderBy` de Firestore sobre `products` (igual que la ruta general) — validar en Fase E que coincide con el orden que el usuario ve hoy (por defecto `fecha desc`).

## 10. Open questions (técnicas, no de producto)
- OT-01 — ¿`FETCH_SIZE = pageSize*3` (mismo valor que la ruta general) es suficiente para bodegas con baja proporción de productos propios, o hace falta un multiplicador mayor solo para el camino de bodega? Se decide con datos reales en Fase E, no bloquea aprobar este plan.
- OT-02 — Mejora futura (fuera de este plan): denormalizar pertenencia producto↔bodega en el propio doc de producto eliminaría la necesidad de las consultas `in` por lote — evaluar como spec separada si el negocio crece a más bodegas por empresa.
