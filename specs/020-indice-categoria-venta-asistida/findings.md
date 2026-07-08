# Findings — Spec 020 (índice de categoría)

> Investigación de todos los sitios que ESCRIBEN el campo `categorias` en `products`. El `/categorias` (maestro/árbol) es un tema aparte, no tocado aquí.

## Root cause de la lentitud (heredado de spec 019)
Sin índice, filtrar por categoría requiere leer/evaluar productos candidatos uno por uno (`extractCategoriaLabel` en memoria) hasta encontrar los que matchean o agotar el catálogo — ver `019-.../findings.md`. Medido: ~30s para una categoría con 0-1 productos reales en un catálogo de 2110.

## Inventario de escritores del campo `categorias` en `products` (≥5 formas distintas confirmadas)

| # | Sitio | Trigger | Forma escrita |
|---|---|---|---|
| 1 | FE `crear-productos.component.ts` (`guardarProductos`/`editarProducto`) | Usuario crea/edita producto en el formulario principal | **Canónica**: `{label, data:{...}, children:[]}` (flatted stringify) |
| 2 | FE `katuq-quickstart.service.ts` → `onboarding.service.ts` | Wizard "Quick Start" crea producto demo | Doble-anidado (bug): `{data:{data:{...},children:[],label},children:[],label}` |
| 3 | BE `controllers/productos.js:492` `createMultiple` | Creación masiva asistida por KAI | Passthrough de lo que KAI genere — forma no garantizada |
| 4 | BE `controllers/onboarding.js` `importProducts` | Importación Excel/CSV en onboarding | Array de nodos SIN `label`: `flatted.stringify([{data:{...},children:[],parent:null}])` |
| 5 | BE `controllers/onboarding.js` `createFirstProductOnboarding` | Primer producto del wizard | Passthrough de lo que mande el FE (ver #2, con el bug doble-anidado) |
| 6 | BE `services/integrations/osmosis/osmosisProductSyncService.js` `_buildCategoriaProducto` | Sync Osmosis/Cereza (cron 6h + webhook + manual) | **Canónica**: `{label, data:{nombre,id}, children:[]}`. En update, solo escribe si el producto no tiene categoría o tiene el formato legacy — nunca pisa una categoría asignada manualmente |
| 7 | BE `services/fulfillmentProductImportService.js:458` | Import de proveedor fulfillment (Aliaddo) | Canónica, o `null` |
| 8 | BE `controllers/woocommerceWebhook.js:931` `createProductFromWooCommerce` | Auto-creación de producto desde webhook de orden Woo | **String plano**: nombres de categoría unidos con coma |
| 9 | BE `controllers/woocommerceIntegration.js` `importAllProducts` | Import completo de catálogo Woo | **Ubicación distinta**: `exposicion.categorias` (array de strings), NO el campo top-level `categorias` |
| 10 | BE `services/shopify/helpers/product.js` `createProductFromShopify` | Auto-creación desde webhook de orden Shopify | `categorias: ''` (string vacío hardcodeado) |
| 11 | BE `services/flows/nodes/shopify/mapper.js` `shopifyProductToCanonical` | Objeto intermedio del motor de flows | Array de strings — pendiente confirmar si se persiste tal cual o solo es transiente |
| 12 | BE `services/flows/nodes/shopify/shopify-product-upsert.action.js:728` | — | Sin `label`/`children` — **código muerto, sin call sites**, no es un escritor activo |
| 13 | BE `controllers/diagnostics.js:566,675` | Seed/demo de diagnóstico | String plano (`"General"`, etc.) — no es un flujo de usuario real |

## Confirmación de la inconsistencia `categoria`/`categorias`
La confusión singular/plural que recordaba el usuario **es real pero vive en la colección `/categorias` (maestro)**, no en `products`: `onboarding.js::importCategories` escribe intencionalmente AMBOS campos en el mismo doc maestro (`categoria` = árbol serializado para el picker, `categorias` = array plano para lookup) — es un diseño dual documentado, no un bug de productos.

En `products`, la inconsistencia real es de **forma** del mismo campo `categorias` (5 formas) más **una ubicación alternativa** (`exposicion.categorias` para Woo), no de nombre.

## T-01 — Confirmaciones (2026-07-02)

- **Endpoint exacto del formulario manual (sitio #1):** `crear-productos.component.ts::guardarProductos()` llama `MaestroService.createProduct()` (`maestro.service.ts:206`) → `POST /v1/productos/create` → `routers/productos.js:159` → **`controllers/productos.js::exports.create` (línea 227)**. La edición (`editarProducto()`) llama `MaestroService.editProductByReference()` (`maestro.service.ts:327`) → `POST /v1/productos/edit` → `routers/productos.js:43` → **`controllers/productos.js::exports.edit` (línea 1189)**. Estos dos son los puntos reales a tocar en T-04 para el sitio #1 (no hace falta tocar el frontend, que ya manda `categorias` tal cual).
- **Sitio #11 (`flows/nodes/shopify/mapper.js::shopifyProductToCanonical`) — CONFIRMADO transiente, no persiste directo.** Su único consumidor es el trigger `shopify-product-changed.trigger.js`, cuyo propio docstring lo aclara: "NUNCA pisamos los campos canónicos del producto Katuq desde acá — eso lo decide el flow (con sus nodos transform + `katuq-product-upsert`)". El objeto `canonical` solo se emite como payload de evento (`eventBus.publish`) — la escritura real (si el comercio configura un flow que la haga) pasa por un nodo genérico `katuq-product-upsert` no específico de categoría. **Fuera de alcance de T-04**: no es un escritor directo de `categorias`; si en el futuro se detecta que `katuq-product-upsert` sí escribe categoría desde este payload, se trata como hallazgo nuevo, no se bloquea esta spec por eso.

## T-02/T-05 — Hallazgo crítico durante el dry-run del backfill (2026-07-02)

Al correr el `--dry-run` contra producción real, el primer helper (basado en el heurístico ya usado en `extractCategoriaLabel` de `productosPaginated.js`, sin `flatted.parse()` real) daba números incoherentes: primero 23.627/25.422 "reconocidos" (sospechosamente alto), luego al agregar la forma 8 (array de strings) bajó a 8.311 (sospechosamente bajo). Investigando con datos reales de ALMARA se encontró la causa raíz:

**La forma "canónica" del picker de categorías (PrimeNG TreeNode) tiene un back-reference `parent` — es CIRCULAR.** `flatted.stringify()` de un nodo circular produce referencias indexadas reales, ej.:
```
[{"label":"1","data":"2","children":"3"},"Dia del Hombre",{"nombre":"1",...},[],""]
```
El label real ("Dia del Hombre") vive en la posición **referenciada** (índice 1), NO en `cat[1]?.label` como asumía el heurístico manual (`extractCategoriaLabel` y mi primer intento de helper) — ese heurístico **solo funciona por casualidad** cuando el nodo no tuvo referencias circulares al serializar (la minoría real de los casos). El primer intento con "array de strings" (23.627) en realidad eran **falsos positivos**: al no encontrar el label con el heurístico, el código caía a un fallback de `raw.split(",")` que partía el JSON crudo por comas y accidentalmente producía fragmentos con apariencia de texto válido (con comillas y llaves sueltas) — parecía "funcionar" pero escribía basura.

**Fix:** usar `flatted.parse()` REAL (ya usado en otras partes del backend, ej. `osmosisProductSyncService.js`) para resolver la referencia circular correctamente, con capas de seguridad: (1) intentar `flatted.parse()`, confiar en el resultado SOLO si expone `.label`/`.data.nombre` (un string plano nunca los tiene, así que un mis-parseo silencioso — `flatted.parse()` interpreta un array de strings plano tomando SOLO el primer elemento como raíz, sin error — no puede colar un label falso); (2) si no, parsear como JSON plano (preserva arrays completos, a diferencia de flatted.parse); (3) si tampoco, split por comas (forma string plano).

**Resultado tras el fix, dry-run re-corrido:** 24.777/25.422 reconocidos (97.5%), 645 genuinamente sin categoría (`[]`/`{}` vacíos, ej. tenants de prueba). Contract test ampliado a 11 casos incluyendo un nodo circular real generado con `flatted.stringify()` genuino (no un ejemplo inventado) — 11/11 PASS.

**Segundo bug encontrado (mismo dry-run, escaneo detallado de ALMARA):** un JSON válido pero vacío (ej. `'[""]'`, 31 productos solo en ALMARA) caía al fallback de "string plano con comas" — que no distinguía "no es JSON en absoluto" de "es JSON válido pero no contiene ningún label" — y colaba el fragmento crudo `'[""]'` como si fuera un nombre de categoría real. Fix: el fallback de comas solo se activa si `JSON.parse(raw)` genuinamente falla, no simplemente porque no se encontró ningún label. Contract test ampliado a 13 casos — 13/13 PASS.

**CORRECCIÓN IMPORTANTE al hallazgo original de esta spec:** el "solo 11 de 2110 productos categorizados en ALMARA" reportado en la sesión de hoy (antes de descubrir el bug de refs circulares) **era incorrecto** — esa cifra salió de la misma lógica de extracción rota (`extractCategoriaLabel`, actualmente en producción para el filtro D-068). Con el helper corregido, el escaneo real de ALMARA da: **2.077 de 2.110 productos (98.4%) SÍ tienen categoría real asignada**, distribuidos en 81 categorías con conteos sensatos (Chocolates: 215, Navidad: 96, Fechas especiales del mes: 96, etc.) — el catálogo de ALMARA está mucho mejor clasificado de lo que se pensaba; el problema nunca fue la falta de clasificación, fue que el filtro de categoría en producción (D-068) casi nunca podía leerla correctamente por el bug de referencias circulares de flatted.

## Implicación de diseño
Cualquier índice derivado debe:
1. Normalizar las 5 formas + la ubicación alternativa a un único array de labels en minúscula.
2. Escribirse en TODOS los sitios activos (excluye #12, código muerto) para no quedar desactualizado en productos nuevos.
3. Backfillearse sobre productos existentes leyendo su `categorias` actual tal cual está guardado hoy (sin migrarlo/tocarlo).
