# Anexo del diseño — Contratos y valores por defecto (D-501)

> Complementa [`design.md`](design.md). Las fechas se guardan como **cadena ISO UTC** (`new Date().toISOString()`), nunca como Timestamp de Firestore.

## A. Rutas (`/v1/product-photos`)

`settings = { aspect: "1:1"|"4:5"|"3:4", background: "white"|"light_gray"|"brand", marginPct: 0-20 }`. El servidor traduce el fondo a `#FFFFFF`, `#F2F2F2` o un `brandKit.colorSecundario` válido.

| Ruta | Rol | ¿Modo? | Cuerpo → respuesta |
|---|---|---|---|
| `GET /settings` | cualquiera | no | → `{ mode, defaults, aspects, backgrounds, limits }` |
| `POST /preview` | cualquiera | sí | `{ productIds≤3 \| categoryLabel, settings }` → `{ samples: [{ productId, index, before, after: { dataUrl (WebP 640), warnings } }], skipped }`. Sin escrituras |
| `POST /batches` | admin | sí | `{ productIds≤100 \| categoryLabel, settings, excluded, idempotencyKey }` → 202 `{ batchId, mode, totals }` |
| `GET /batches/:id` | cualquiera | no | → `{ type, status, mode, stopCode, counters, metrics, results }` |
| `POST /batches/:id/cancel` | admin | no | → 200 |
| `POST /batches/:id/revert` | admin | no | → 202 `{ batchId }` (lote `revert`, siempre real) |
| `POST /revert` | admin | no | `{ productId, index? }` → 200 `{ reverted, skipped }` |

Todas pasan por `auth` → `requireJwtTenant` → `requireFeature`. «¿Modo?» indica si aplica `PRODUCT_PHOTO_UNIFORM_MODE` (con D-518 pasa a `config/feature_flags.productPhotoUniformMode`, §G.4).

**Errores:**
- 400 `INVALID_SETTINGS` o `INVALID_SELECTION`;
- 403 por bandera o rol;
- 404 `BATCH_NOT_FOUND`, también si el lote es de otra empresa;
- 409 `COMPANY_HAS_PRODUCT_SYNC`, `COMPANY_AMBIGUOUS` o `BATCH_RUNNING`;
- 422 `BATCH_TOO_LARGE`;
- 429 `PHOTO_BUSY`, `PREVIEW_RUNNING` o `PREVIEW_RATE_LIMIT`;
- 503 `PHOTO_UNIFORM_OFF`.

Los mensajes van sin jerga y sin la palabra «token», para que no se cierre la sesión.

## B. Datos

**Cada foto** (`crearProducto.imagenesPrincipales[i]`) suma dos llaves:
- `original: { urls, path }`;
- `processed: { settings, algorithmVersion, settingsHash, sourcePath, batchId, at, by, format, variants: [{ width, path }], quality }`.

**Códigos de omisión:** `external_link` (incluye otro bucket), `legacy_format`, `not_owned`, `owner_unknown`, `product_integrated`, `flow_photos`, `already_uniform`, `too_large`, `unreadable`, `timeout`, `changed_meanwhile`, `original_missing`, `reprocessed_later` y `photo_limit`. Los avisos son `trim_skipped`, `low_resolution` y `blurry`.

`photo_limit` marca cada foto que pasa el tope de 12 por producto (D2). Se agregó en la implementación, el 2026-10-18, y espera el visto bueno de Daniel.

**Lote** (`product_photo_batches/{batchId}`):
- campos: `{ company, companyDocId, type: "uniform"|"revert", mode, status, stopCode?, settings, algorithmVersion, selection, excluded, totals, counters, metrics: { msPerPhotoAvg, msPerPhotoMax, bytesWritten }, lease, cancelRequested, revertOf?, createdBy, createdAt, finishedAt }`;
- `status` puede ser `queued`, `running`, `done`, `cancelled`, `stopped` o `failed`;
- `createdBy` es el `sub` de la sesión firmada;
- en `shadow`, `bytesWritten` queda en 0 y se anota `bytesWouldWrite`;
- los resultados **no** viven aquí, para no acercarse al tope de 1 MiB ni reescribir un arreglo en cada producto.

**Resultados** (`product_photo_batches/{batchId}/results/{productId}`):
- un documento por producto, escrito en la misma transacción del producto;
- campos: `{ status, code?, photos: [{ index, status, code? }] }`, sin rutas ni URLs;
- 100 productos son como máximo 100 documentos pequeños.

**Candado** (`product_photo_batches/lock-<companyDocId>`):
- campos: `{ type: "lock", company, activeBatchId, updatedAt }`;
- no lleva `status`, así que no aparece en la consulta de lotes por retomar;
- se toma al crear el lote, dentro de la misma transacción, y se libera en la transacción final del lote (`done`, `cancelled`, `stopped` o `failed`);
- si apunta a un lote final, se puede tomar.

**Consultas:**
- por id;
- por `status in [queued, running]`, filtrando en memoria los arriendos vencidos.

No necesita índice compuesto.

## C. Historial (`productHistory`): tipos fijos

`getHistorial` devuelve el documento tal cual. La pestaña Historial pinta `timestamp | date` y muestra `valorAnterior` y `valorNuevo` como texto (`crear-productos.component.html:2072-2078`).

| Campo | Tipo y regla |
|---|---|
| `company`, `productoId` | Cadenas: la empresa del token y el docId del producto |
| `fecha` | Cadena ISO UTC. Ordena bien con el índice existente (`company`, `productoId`, `fecha` desc) |
| `timestamp` | La misma cadena ISO, que el DatePipe acepta. Nunca un Timestamp de Firestore: llegaría como `{_seconds,_nanoseconds}` y rompería la pestaña |
| `campo` | `"Fotos uniformadas"` o `"Fotos revertidas"` |
| `valorAnterior`, `valorNuevo` | Texto corto, de máximo 80 caracteres; por ejemplo, «3 fotos originales» → «3 fotos uniformadas (1:1, blanco)». Nunca objetos |
| `usuario` | El mismo valor de `user_edit` y ningún otro dato de la persona |
| `batchId` | Cadena |
| `fotos` | `[{ index, status }]`, sin rutas ni URLs |

Nada se escribe aquí hasta cumplir la tarea 0.5.

## D. Storage

- **Ruta:** `Productos/uniformes/<companyDocId>/<productId>/<batchId>-<index>-w<ancho>.webp`, y para la portada `…-<index>-cover.jpg`.
- **Metadatos:**
  - `company`, la empresa del token;
  - `cacheControl: public, max-age=31536000, immutable`;
  - `firebaseStorageDownloadTokens`: **un token por foto, el mismo en todas sus variantes y en el JPEG**.
- **URL:** el mismo formato de `controllers/media.js:173`.
- **Escritura:** con precondición de que el archivo no exista. No hay función de borrar.

## E. Registro de escritores de `imagenesPrincipales`

| Clase | Archivos (2026-10-18) | Efecto |
|---|---|---|
| Sync | `services/integrations/osmosis/osmosisProductSyncService.js`, los nodos de `services/flows/nodes/` con «product» en el tipo, `controllers/woocommerceWebhook.js`, `controllers/woocommerceIntegration.js`, `services/woocommerceService.js`, `services/shopify/helpers/product.js` y `services/fulfillmentProductImportService.js` | Excluye a la empresa si está activo |
| Manual | `controllers/productos.js` (formulario), `controllers/onboarding.js:3385` (importación), `services/sites/tiendaEnUnPasoContenido.js` y `tools/updateProductPhotos.js` | No excluye. Reemplazar la foto a propósito deja atrás lo procesado; el original sigue en Storage |

La tarea 0.3 confirma la lista. Un archivo nuevo que escriba el campo sin estar en la tabla hace fallar `writersRegistry.contract`.

## F. Valores por defecto (confirmar con Daniel, tarea 0.1)

| # | Por defecto |
|---|---|
| P1 | 1:1, fondo blanco y margen del 8 %. Se elige en cada lote y el navegador recuerda el último. No se escribe en `companies`. «Marca» = `brandKit.colorSecundario` |
| P2 | Opción 1, excluir, con el criterio amplio de la decisión 5 |
| P3 | No se procesa `exposicion.imagenes`; esos productos se omiten |
| P4 | Fase 2: Nova Canvas vía ADK |
| P5 | Fase 2: cupo de IA del plan, un uso por foto; en la vista previa solo cuenta la muestra |
| P6 | `productHistory` y la colección nueva `product_photo_batches`, con `results` y el candado |
| P7 | Portada JPEG en `urls`, sin `srcset`; las demás, la WebP más grande que exista hasta 1280 |
| P8 | Lado menor de 600 px y laplaciano de 100, calibrados en sombra en FLORECER |
| P9 | `Administrador` y `Super Administrador` aplican, cancelan y revierten; ver y la vista previa, cualquiera con la bandera |
| D1 | Solo archivos del bucket propio con `metadata.company` de la empresa; los que no tienen dueño se omiten (`owner_unknown`) |
| D2 | Topes: 100 productos, 12 fotos y 15 s. Vista previa: 3 fotos, una en curso por empresa, 10 cada 10 min y una foto a la vez por proceso |
| D3 | Se despliega en `shadow`. Para retomar lotes, `CRON_ENABLED=true`. **Desvío (D-518, 21-oct):** se desplegó en `off` (sin la variable; CONTRACT, D-501 «SUBIDA APAGADA»). Con D-505 el modo pasa a `config/feature_flags.productPhotoUniformMode` (§G.4) y sombra se enciende ahí, no en el `.env` |
| D4 | La reversión no depende del modo, pero exige la bandera y el rol. Orden de la reversa: `off` → revertir → apagar la bandera |
| D5 | Modo efectivo = el menor entre `lote.mode` y el del servidor; si baja, el lote para |
| D6 | Bandera con dueño Daniel y retiro el 2027-04-30; llave `processed` en inglés; rutas `/v1/product-photos/*`; solo `imagenesPrincipales` |
| D7 | Aviso al subir solo en el editor completo; entrada por categoría con un botón junto al filtro |
| D8 | `historial.usuario` = valor de `user_edit`. No se escribe historial antes de 0.5 |

## G. Ampliación D-518 (21-oct) — NUEVO, pendiente de aprobación

Diseños: [`design-ampliacion.md`](design-ampliacion.md), [`design-fase-1b.md`](design-fase-1b.md) y [`design-fase-2.md`](design-fase-2.md). Lo de §A a §F sigue vigente salvo lo que aquí se dice. Revisado el 21-oct contra la crítica.

### G.1 Rutas

| Ruta | Rol | ¿Modo? | Cambio |
|---|---|---|---|
| `GET /settings` | cualquiera | no | El modo se lee de `config/feature_flags` (§G.4). Con fase 2: `aiUsesLeft` y si «Quitar fondo» está disponible para la persona (P17, P18) |
| `POST /preview` | cualquiera (con «Quitar fondo»: admin y modo `on`) | sí | Acepta `categoryPath: string[1..3]` (`categoryLabel` vale `[categoryLabel]`). Responde además `selectionTotal`, `parts` y `categoryUnresolved`. Con fase 2: `settings.backgroundMode`, `settings.backgroundScope` y `aiUsesNeeded`/`aiUsesLeft` |
| `POST /batches` | admin | sí | Acepta `categoryPath` y selecciones de hasta 2.000 productos. Más de 100 → serie: 202 `{ batchId, seriesId, parts, mode, totals }` |
| `GET /series/:id` | cualquiera | no | Nueva. `{ status, parts: [{ batchId, part, status, counters }], counters }` (suma de las partes). Siempre llega a un estado final (§G.2) |
| `POST /series/:id/cancel` | admin | no | Nueva. Cancela la parte en curso y cierra las que esperan |
| `POST /series/:id/revert` | admin | no | Nueva. 202 `{ batchId }`: un lote `revert` sobre todas las partes |

**Errores nuevos:** 422 `SERIES_TOO_LARGE` (más de 2.000) y `AI_QUOTA_INSUFFICIENT` (fase 2); 404 `SERIES_NOT_FOUND`, también si la serie es de otra empresa; 403 por rol en la vista previa con «Quitar fondo».

### G.2 Lote y serie (`product_photo_batches`)

- **Parte de una serie:** los campos de §B más `series: { id, part, parts }`. Estado nuevo `waiting` (ni activo ni final: no entra en la retoma). El id es `<serieId>-p<k>`.
- **Serie:** no tiene documento propio. Se lee por `series.id` (consulta por igualdad, sin índice compuesto).
- **Cierre único:** todo cierre de un lote (fin, cancelación, parada, falla, cierre al revertir en `off` y cancelación sin arriendo) pasa por la misma función. Con `done`, pasa la siguiente parte a `queued` y le mueve el candado; con cualquier otro final, cierra las `waiting` con `series_stopped`.
- **`stopCode` nuevos:** `series_stopped`, `company_has_sync` (apareció un sync al empezar una parte), `ai_quota` y `ai_unavailable`.
- **`metrics` nuevas:** `photosCopied`, `photosWouldCopy`, `aiUsesConsumed`, `aiUsesRefunded`, `aiUsesWouldConsume`.

### G.3 Datos de cada foto

Además de `original` y `processed` (§B):
- `copiedFrom: { kind: "link" | "unowned", urls?, path?, at, batchId }`: solo en fotos copiadas o adoptadas (fase 1b). Se conserva al revertir.
- `processed.backgroundMode: "keep" | "replace"` y `processed.cutoutPath` (fase 2, solo referencia; el recorte se encuentra por la huella del origen, §G.5).
- `processed.quality.warnings` puede traer `possible_watermark`.

**Códigos nuevos:**
- de omisión: `category_unresolved` (incluye sin categoría), `download_failed`, `not_image`, `not_adoptable`, `background_input_invalid`, `background_unclear`, `background_unavailable`;
- de resultado: `would_copy`, `would_remove_background`;
- de aviso: `possible_watermark`.

`product_integrated` pasa a significar «vinculado a una integración que escribe fotos» (`osmosis`, `shopify`, `woocommerce`, `fulfillment`/`aliaddo`).

### G.4 Configuración (D-505)

| Dónde | Llave | Valores | Por defecto |
|---|---|---|---|
| `config/feature_flags` | `productPhotoUniformMode` | `off`, `shadow`, `on` | `off` (sin documento, otro valor o error) |
| `config/feature_flags` | `backgroundRemovalProvider` | `""`, `"opttia"` | `""` |
| `config/feature_flags` | `backgroundRemovalUses` | lista de usos | `["productPhotos"]` |
| `companies.featureFlags` | `productPhotoBackground` | booleano | apagada; exige `productPhotoUniform` |
| `config/subscriptionLimits.js` (`ai`) | `photoBackgroundsPerMonth` | entero ≥ 0 | pregunta 6; **ausente o inválido = 0** en todos los planes |

- Se leen **sin caché**, una lectura por uso (`design-ampliacion.md` §A1).
- El script escribe solo estas llaves, por rutas de campo; las demás de `config/feature_flags` (stock de WooCommerce, pago a cuotas) no cambian.
- `PRODUCT_PHOTO_UNIFORM_MODE` y `BACKGROUND_REMOVAL_PROVIDER` dejan de leerse del `.env`.

### G.5 Storage

- Copias (fase 1b): `Productos/copias/<companyDocId>/<productId>/<huella>.<ext>`, con `metadata.company`, `origen` y `productoId`; nunca la URL de origen ni un correo.
- Recorte (fase 2): `Productos/uniformes/<companyDocId>/recortes/<huella del origen>-<versión del modelo>.png`, con `metadata.company`, `productoId` y la versión, sin token de descarga. La ruta no depende del lote: sirve después de revertir y para lo que pagó la vista previa.
- Misma regla que §D: se escribe solo si no existe y no hay función de borrar.

### G.6 Valores nuevos por defecto (confirmar con Daniel)

| # | Por defecto | Pregunta |
|---|---|---|
| P10 | Serie de hasta 2.000 productos (20 lotes de 100) | 3 |
| P11 | Revertir una foto copiada devuelve la copia, no el enlace | 1 |
| P12 | Adoptar = copiar; el archivo sin dueño no cambia | 2 |
| P13 | Fase 2: modelo a 1024 px, máscara agrandada a la foto original | 7 |
| P14 | Fase 2: cupo mensual por empresa, Freemium 10 y pagos 500; «Quitar fondo» solo en la portada por defecto | 6 |
| P15 | Fase 2: resultado siempre sobre fondo opaco | 9 |
| P16 | Fase 2: sin cupo a mitad, el lote o la serie para (`ai_quota`) | 10 |
| P17 | Fase 2: vista previa con «Quitar fondo» solo con el modo en `on`; en sombra, solo la estimación | 14 |
| P18 | Fase 2: vista previa con «Quitar fondo» solo para administradores | 14 |
| P19 | Fase 1b: sin lista fija de hosts; los controles de descarga de la revisión privada | 12 |
| P20 | Proporción sugerida desde el editor del sitio: la del estilo del sitio | 13 |
