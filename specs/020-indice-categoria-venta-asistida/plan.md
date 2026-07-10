# Plan 020 — Índice de categoría para filtrado rápido en venta asistida

> Estado: **approved** (2026-07-02 — D-072)
> Vinculado a `spec.md` (**approved**, D-072).
> Última actualización: 2026-07-02

## 1. Resumen técnico

Agregar un campo derivado `categoriasIndex: string[]` (labels en minúscula) a cada producto, calculado por un helper compartido que normaliza las ≥5 formas distintas del campo `categorias` hoy existentes (ver `findings.md`). Escribirlo en los 11 sitios activos que hoy escriben `categorias`. Backfillear productos existentes. En el backend de venta asistida, usar `array-contains-any` sobre `categoriasIndex` como filtro de Firestore (indexado) cuando la cantidad de labels solicitados es ≤30; si excede ese límite (árbol de categorías muy frondoso, caso raro), cae al filtro en memoria ya existente (spec 019), que ahora lee `categoriasIndex` en vez de re-derivar la categoría en cada request.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec.md approved (D-072) antes de este plan |
| II — Spec captura intent | sí | spec.md sin tecnología; este plan sí la nombra |
| IV — Idempotencia | sí | backfill idempotente (NFR 5.4), sin efectos de integración externa |
| VII — Observabilidad | sí | backfill loguea contadores (NFR 5.3); log de shape no reconocida |
| VIII — Test-first contratos | sí | fixture con las 5 formas reales antes de tocar el helper (§6) |
| IX — Estilo Angular | n/a | cambio 100% backend |
| XI — Datos sensibles fuera del log | sí | logs solo cuentan productos, no datos personales |

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Nuevo helper compartido**: `functions/services/categoriaIndexHelper.js` — `computeCategoriasIndex(product)`, exportado, reusado por los 11 sitios de escritura. Mismo patrón de naming que `productStockHelper.js` (ya existente y probado).
- **11 sitios de escritura** (backend + 2 en frontend que solo llenan el payload que el backend persiste) — ver tabla en §3.3.
- **Backend de venta asistida** (`controllers/productosPaginated.js`): `buildProductQuery` agrega `array-contains-any` sobre `categoriasIndex` cuando aplica; `applyInMemoryFilters` pasa a leer `categoriasIndex` en vez de recalcular con `extractCategoriaLabel` en cada request.
- **Firestore**: nuevo índice compuesto `company + categoriasIndex(array) + date_edit` (y equivalentes para los demás `sortBy` de `SORTABLE_FIELDS`, ver §5) — agregar a `firestore.indexes.json` y desplegar ANTES del código que lo usa (una query con `array-contains-any`+`orderBy` sin el índice falla en producción, no silenciosamente).
- **Script de backfill** (nuevo, `functions/scripts/backfill-categorias-index.js`): recorre productos existentes, calcula y escribe `categoriasIndex` con el mismo helper. Con `--dry-run`.

### 3.2 Flujo nuevo (texto)
```
ESCRITURA (11 sitios):
  guardar/actualizar producto → computeCategoriasIndex(product) → set product.categoriasIndex

LECTURA (venta asistida, handleBodegaPagination):
  if categoryLabels.length > 0 && categoryLabels.length <= 30:
    query = buildProductQuery({company}).where('categoriasIndex','array-contains-any',categoryLabels)
  else:
    query = buildProductQuery({company})  // sin filtro de categoria a nivel Firestore
    // applyInMemoryFilters sigue narrowing por categoriasIndex dentro del overfetch (spec 019)
```

### 3.3 Sitios de escritura a actualizar (los 11 activos de `findings.md`, #12 es código muerto — no se toca)

| # | Archivo | Acción |
|---|---|---|
| 1 | FE `crear-productos.component.ts` | Backend recalcula en el endpoint de create/edit (no duplicar lógica en FE) — el FE sigue mandando `categorias` tal cual, el backend agrega `categoriasIndex` antes de persistir |
| 2,5 | BE `onboarding.js::createFirstProductOnboarding` | Agregar `categoriasIndex: computeCategoriasIndex(productoData)` antes del `.add()` |
| 3 | BE `productos.js::createMultiple` | Igual, antes del `.add()` |
| 4 | BE `onboarding.js::importProducts` | Igual, en el batch `.set()`/`.update()` |
| 6 | BE `osmosisProductSyncService.js` | Igual, en create y en el update condicional existente |
| 7 | BE `fulfillmentProductImportService.js` | Igual |
| 8 | BE `woocommerceWebhook.js::createProductFromWooCommerce` | Igual — el string plano de nombres separados por coma se parte por `,` dentro del helper |
| 9 | BE `woocommerceIntegration.js::importAllProducts` | El helper también lee `exposicion.categorias` (ubicación alternativa) |
| 10 | BE `shopify/helpers/product.js::createProductFromShopify` | Igual (hoy `categorias:''` → `categoriasIndex: []`) |
| 11 | BE `flows/nodes/shopify/mapper.js` | Confirmar en Fase A si este objeto canónico se persiste como producto real o es transiente — si se persiste, aplicar igual; si no, no requiere cambio |
| 13 | BE `diagnostics.js` (seed) | Igual, opcional (no es flujo de usuario real) — se incluye por completitud y porque es barato |

**También:** actualizar el endpoint que persiste ediciones desde `crear-productos.component.ts` (`editProductByReference`/`crearProductos` en el backend, no identificado línea-exacta en `findings.md` — confirmar en Fase A) para recalcular `categoriasIndex` cuando el usuario cambia la categoría manualmente desde el formulario.

### 3.4 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Un helper compartido (`computeCategoriasIndex`) en vez de duplicar lógica en cada sitio | AC-03/AC-04, evita que un 12º sitio futuro invente una 6ª forma | Normalizar en cada escritor por separado — ya fue la causa de las 5 formas actuales |
| `array-contains-any` con fallback a filtro en memoria si >30 labels | Q-04 aceptado; NFR 5.1 sin bloquear el caso raro | Múltiples queries paralelas + merge/dedupe para árboles >30 nodos — más complejo, caso raro en datos reales (categorías reales tienen 1-3 productos, árboles no son frondosos) |
| Backfill separado del código de lectura (no "lazy backfill on read") | NFR 5.4, AC-05 | Backfill perezoso (calcular al leer si falta) — completaría con el tiempo pero deja el AC-01 (rápido) incumplido para productos no tocados aún |

## 4. Modelo de datos
Campo nuevo, aditivo: `products.categoriasIndex: string[]`. No se toca `categorias` (campo crudo) ni `exposicion.categorias` (Woo). Sin migración destructiva.

## 5. Contratos (API/eventos)
Sin cambios de contrato HTTP — mismo endpoint `POST /v1/productos/all/filter/paginated`. El campo `categoriasIndex` es interno, no se expone como filtro nuevo del lado del cliente (el cliente sigue mandando `categoryLabels` calculado del árbol, igual que hoy).

### 5.1 Índices Firestore nuevos requeridos
Por cada valor de `SORTABLE_FIELDS` usado en venta asistida (hoy solo `fecha`→`date_edit`, es el único que el frontend envía — ver spec 019 findings): `company ASC, categoriasIndex ARRAY_CONTAINS, date_edit DESC, __name__ ASC`. Agregar a `firestore.indexes.json` y desplegar antes de activar el código de lectura (Fase C, ver abajo).

## 6. Estrategia de testing
- **Contract test (primero, Artículo VIII):** fixture con las 5 formas reales documentadas en `findings.md` (canónica, doble-anidada, array sin label, string plano con comas, string vacío, `exposicion.categorias`) → `computeCategoriasIndex()` debe producir el array correcto para cada una.
- **Regresión:** mismo patrón que spec 019 — comparar resultado del filtro de categoría ANTES/DESPUÉS (in-memory puro vs. índice Firestore) contra casos reales (Floristeria+hijos=0, Minitortas=1, Cupcakes otros temas=3).
- **Performance:** medir el mismo caso que tardó ~30s (findings.md de spec 019) y confirmar p95 ≤ 2s.

## 7. Fases de implementación
1. **Fase A** — Confirmar línea exacta del endpoint de create/edit manual de producto (no identificado con precisión en `findings.md`) + confirmar si el objeto canónico de `flows/nodes/shopify/mapper.js` se persiste o es transiente.
2. **Fase B** — Escribir `computeCategoriasIndex()` + contract test con las 5 formas reales.
3. **Fase C** — Agregar el índice compuesto a `firestore.indexes.json` y desplegarlo (solo el índice, sin código nuevo todavía — los índices tardan en construirse en Firestore real, mejor adelantarlo).
4. **Fase D** — Actualizar los 11 sitios de escritura para llamar al helper.
5. **Fase E** — Script de backfill (`--dry-run` primero) + correrlo contra producción.
6. **Fase F** — Actualizar `buildProductQuery`/`applyInMemoryFilters` en `productosPaginated.js` para usar `categoriasIndex` (Firestore cuando ≤30 labels, memoria si no).
7. **Fase G** — Regresión + medición de performance contra los casos reales ya conocidos.
8. **Fase H** — Commit (sin push/deploy sin confirmación explícita, mismo patrón de todo hoy).

## 8. Plan de rollout
- Sin feature flag — es lectura de un campo nuevo con fallback natural (si `categoriasIndex` no existe todavía en un producto no backfilleado, simplemente no matchea ese filtro hasta que el backfill lo alcance — no rompe nada, solo no acelera ese producto puntual).
- El índice de Firestore se despliega ANTES que el código que lo usa (Fase C antes que Fase F) para que ya esté listo cuando el código lo necesite.
- Backfill con `--dry-run` obligatorio antes de la corrida real (NFR 5.4).

## 9. Riesgos técnicos
- RT-01: Si el índice compuesto de Firestore tarda en construirse en producción (colecciones grandes), el código de Fase F podría desplegarse antes de que el índice esté listo → la query fallaría. Mitigación: verificar estado del índice en la consola de Firebase antes de desplegar Fase F.
- RT-02: El helper debe manejar el string plano de WooCommerce (`"Ropa, Zapatos"` → split por coma) con cuidado de espacios/casing — cubierto por el contract test de Fase B.

## 10. Open questions (técnicas, no de producto)
- OT-01 — Confirmar en Fase A si vale la pena tocar el sitio #11 (flows/shopify mapper) o si es verdaderamente transiente y no aplica.
