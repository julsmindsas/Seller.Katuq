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

Todas pasan por `auth` → `requireJwtTenant` → `requireFeature`. «¿Modo?» indica si aplica `PRODUCT_PHOTO_UNIFORM_MODE`.

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
| D3 | Se despliega en `shadow`. Para retomar lotes, `CRON_ENABLED=true` |
| D4 | La reversión no depende del modo, pero exige la bandera y el rol. Orden de la reversa: `off` → revertir → apagar la bandera |
| D5 | Modo efectivo = el menor entre `lote.mode` y el del servidor; si baja, el lote para |
| D6 | Bandera con dueño Daniel y retiro el 2027-04-30; llave `processed` en inglés; rutas `/v1/product-photos/*`; solo `imagenesPrincipales` |
| D7 | Aviso al subir solo en el editor completo; entrada por categoría con un botón junto al filtro |
| D8 | `historial.usuario` = valor de `user_edit`. No se escribe historial antes de 0.5 |
