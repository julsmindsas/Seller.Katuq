# Ampliación D-518: copiar las fotos a Storage (F5-30·2)

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Aplica F5-30·2: «Copiarlas a Storage en esta entrega, con la misma pieza de la fase 1b de TX-37». Reemplaza el no-goal «Copiar las fotos a Storage» de `proposal.md` y la fila «Fotos en el CDN anterior → fase 2» de `design.md`. Depende de la pieza `photoCopy.js` de TX-37: `fotos-uniformes-producto/design-fase-1b.md` §B1 y tarea 8.1. Esa pieza tiene su propia revisión de seguridad privada, que bloquea su código. Los controles de descarga **no** se repiten aquí: **ver revisión privada**.

## Por qué

Quien migra suele cerrar su tienda anterior. Las fotos guardadas como enlace (`cdn.shopify.com`, el `wp-content` de WooCommerce) pueden dejar de verse ese día. Hoy el importador guarda el enlace sin descargar nada: `readers/comun.js` usa `armarFotos` y `buildProductPhotos`, y el resultado es `{ tipo: "url", path: "" }` (`utils/productImageUrls.js:414-416`).

## Decisiones

### P1. La misma pieza, sin otra copia

- **La pieza:** `services/productPhotos/photoCopy.js` de TX-37 (`copiarDesdeEnlace({ url, empresa, companyDocId, productId })`). Devuelve `{ ok:true, urls, path }` o `{ ok:false, code }`, y nunca lanza.
- **Ruta en Storage:** `Productos/copias/<companyDocId>/<productId>/<huella>.<ext>`. El nombre sale de la huella de los bytes, así que un reintento cae en el mismo archivo.
- **Metadatos:** `company`, `origen: "enlace"` y `productoId`. Nunca la URL de origen.
- **Dependencia:** si F5-30 llega antes que el resto de la fase 1b de TX-37, su tarea 8.1 se adelanta sola, como prevé `design-fase-1b.md`. El importador no escribe su propio descargador.

### P2. Las fotos se copian después de crear el producto, en su propio paso

La copia no va dentro del lote de productos.
- **El problema:** 25 productos con hasta 8 fotos son hasta 200 descargas en una petición, y eso alargaría el lote más allá de lo que aguanta una petición.
- **El orden:**
  1. Se crean los productos con los enlaces, como hoy, y quedan visibles enseguida.
  2. El front recorre el paso nuevo `POST /v1/onboarding/import-store/photos` en lotes de hasta 10 productos (pregunta 7).
  3. Al final van las redirecciones.

**Contrato:** `contracts/import-store-api-d518.md`. Misma cadena de la decisión 1 (sesión, empresa, bandera, rol) y mismo candado por empresa que `products` y `customers`. Nueva ruta: requiere la aprobación de Daniel (`openspec/config.yaml`; pregunta 8).

**Cada recorrido de la copia tiene su id (`runId`).** El front genera un uuid cada vez que empieza o retoma la copia, y numera los lotes desde 1 dentro de ese recorrido.
- El registro del lote se llama `<hash de la empresa>_<migrationId>_f<runId>-<lot>` (M1: la empresa va en la llave).
- Reenviar el mismo lote del mismo recorrido (un reintento después de un corte) devuelve `replayed: true` sin copiar.
- Un recorrido nuevo, como «Copiar fotos pendientes», trae otro `runId`. Sus lotes no chocan con los anteriores y copian lo que siga pendiente.
- Sin el `runId`, retomar numerando desde 1 devolvería el resultado guardado del primer recorrido y no copiaría nada.

**Qué hace el servidor por cada producto del lote:**
1. Lee `products/{cd}`. Exige `company` igual a la empresa del token y `metadata.migration.migrationId` igual al de la petición. Si no, responde `NOT_MIGRATED` sin revelar nada del producto.
2. Toma las fotos de `crearProducto.imagenesPrincipales` que siguen siendo enlace externo (`tipo: "url"`, `path: ""`). Una foto que ya está en el bucket propio se salta: así el paso es idempotente.
3. Copia cada una con `photoCopy.copiarDesdeEnlace`. Corren hasta **4 descargas a la vez por petición** (pregunta 7) y aplica el tope de bytes y de tiempo de la pieza.
4. Reemplaza las fotos en una **transacción** que relee el producto:
   - Una foto se reemplaza solo si en esa posición sigue el mismo enlace. Si el comercio la cambió mientras tanto, se deja (`changed_meanwhile`) y la copia queda sin uso. No se borra, igual que en TX-37.
   - La foto queda con `{ urls, path }` de la copia y `tipo` propio. Conserva `alt`, `color` y `nombreImagen`.
   - Suma `copiedFrom: { kind: "link", urls: <enlace>, at, batchId: "<migrationId>_f<runId>-<lot>" }`, con la forma de TX-37 (`anexo.md` §G.3). Lo que se guarda en `urls`: **ver revisión privada** (decisión 5).
5. Responde los conteos y las fallas por producto y foto, con el código de la pieza: `download_failed`, `not_image`, `too_large` o `unreadable`. Una falla deja ese enlace como estaba: la foto se sigue viendo mientras la tienda anterior exista, y el reporte pide reemplazarla.

**Registro de escritores de fotos:** el archivo nuevo (`services/storeMigration/photoCopyStep.js`) se suma a `manual` en `services/productPhotos/syncDetector.js:90-100`, junto a `migrationProduct.js`. Es una acción del comercio y no excluye al producto de uniformar (TX-37).

### P3. Retomar

- Si el comercio cierra la pestaña, sus productos ya existen con los enlaces.
- El reporte final y la pantalla de «Traer mi tienda» muestran «N fotos sin copiar» con el botón «Copiar fotos pendientes».
- **Ruta de lectura nueva, `GET /v1/onboarding/import-store/photos/pending`** (pregunta 8). El front no lee Firestore y no guarda los `migrationId` de un día para otro, así que hace falta:
  - misma cadena (sesión, empresa del token, bandera y rol); no toma el candado; solo lee;
  - busca en `migration_audit` las migraciones de la empresa del token (`companyId`, `service: "storeMigration"`, paso `products`), las 5 más recientes por `createdAt` (campo que ya escribe `auditoria.js`);
  - por cada una, lee los productos con `company` y `metadata.migration.migrationId` (dos igualdades, sin índice compuesto nuevo) y cuenta las fotos que siguen con `tipo: "url"` y `path: ""`;
  - responde `{ migrations: [{ migrationId, startedAt, products, photosPending }] }`, sin enlaces ni nombres;
  - esa consulta ordena por fecha, así que pide un índice compuesto (`companyId`, `service`, `step`, `createdAt`). Se declara en `firestore.indexes.json` con la tarea 14.15 y se confirma en FLORECER (12.2). No es una colección nueva.
- El botón usa esa lista para elegir los `cd` con fotos pendientes y vuelve a correr el paso con un `runId` nuevo.
- **Aviso en pantalla, en el paso de importar:** «No cierres tu tienda anterior hasta que termine la copia de fotos.»

### P4. Tiempo (criterio de los 500 productos en menos de una hora)

**Estimado, no medido:**
- Hasta 4.000 fotos (500 × 8). La plantilla y los catálogos reales suelen traer menos.
- Con 4 descargas a la vez y entre 0,6 y 1 s por foto (descarga más escritura), son unos **10 a 17 minutos**.
- Sumados a los lotes de productos y existencias, el total queda dentro de la hora.

La tarea 12.3 mide de punta a punta en FLORECER: simulación, productos, existencias, fotos y redirecciones. Si no alcanza, se sube la concurrencia con el OK de Daniel.

### P5. Lo que no hace

- **No recomprime ni convierte a WebP:** la copia es «el original», como en TX-37. Uniformar es la herramienta de TX-37, aparte.
- **No copia** las fotos de productos que no son de esta migración, ni las de otra empresa.
- **No borra** nada en Storage.

## Write-set

| Escribe | Solo lee | Nunca |
|---|---|---|
| **Storage:** archivos nuevos en `Productos/copias/<companyDocId>/…`, por `photoCopy`.<br>**`products`:** en `crearProducto.imagenesPrincipales[i]`, solo `urls`, `path`, `tipo` y `copiedFrom`, de productos de la migración.<br>**Rastro:** `migration_audit` (paso `photos`, solo números) e `integration_idempotency` (candado). | El enlace externo (descarga segura de la pieza), los productos de la empresa y, en `photos/pending`, `migration_audit` de la empresa | Otros campos de `products`; precios, listas, `inventory`, categorías, `integrations`, `exposicion`; archivos existentes; borrar |

La prueba nueva `importStorePhotos.writeSet.contract.test.js` revienta si se escribe otra cosa, si se llama a `setMetadata` o `delete`, o si se toca un producto de otra empresa o de otra migración.

## Riesgos

- **Enlaces que mueren antes de la copia:** si el comercio cierra la tienda anterior a mitad de camino. Mitigación: el aviso de P3 y el reporte con las pendientes.
- **Límites del CDN anterior:** descargar miles de fotos seguidas puede topar con su tope de peticiones. Mitigación: la concurrencia baja y el reintento en el mismo nombre.
- **Almacenamiento:** cada foto ocupa una vez más en el bucket. La tarea 8.0 de TX-37 dimensiona.
- **Dependencia cruzada:** si la revisión privada de TX-37 no aprueba `photoCopy`, este paso no sale. La importación funciona igual con enlaces (la fase 1a), y el criterio «fotos visibles» se cumple mientras exista la tienda anterior.
