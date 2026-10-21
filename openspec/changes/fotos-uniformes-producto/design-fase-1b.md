# Diseño — Fase 1b: fotos externas y sin dueño (TX-37·3)

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Aplica D-518 TX-37·3: «Construirla: copiar a Storage las externas con la empresa en los metadatos, adoptar las sin dueño cuando un producto de la empresa las usa, y corregir Tienda en un paso y las herramientas MCP para que guarden la empresa». F5-30·2 reusa la misma pieza de copia en el importador. Los controles de descarga, de pertenencia y de adopción van en la revisión privada del backend (`fotos-uniformes-producto-seguridad`); aquí solo «ver revisión privada». Revisado el 21-oct contra la crítica.

## Por qué

La regla de pertenencia de la fase 1 (`design.md`, decisión 4; `eligibility.js:65-72` y `:96-104`; `photoStorage.js:46-55`) omite tres grupos que son justo el público del ticket:

| Grupo | Código hoy | De dónde sale |
|---|---|---|
| Enlace externo (CDN, Drive, Dropbox, otra tienda) | `external_link` | Importación por Excel (`utils/productImageUrls.js`, `tipo: "url"`, `path: ""`), migración de tiendas D-498 (`services/storeMigration/migrationProduct.js:96`), `update_product_photos` con `urlFoto` (`tools/updateProductPhotos.js:128,151-155`) |
| Archivo propio sin `metadata.company` | `owner_unknown` | Subidas desde el navegador antes del 28-jul (antes de 030a7338); **y todavía hoy:** Tienda en un paso (`controllers/tiendaEnUnPaso.js:86-102`), `get_product_photo_upload_url` (`tools/getProductPhotoUploadUrl.js:70-78`) y el sellado de `update_product_photos` (`tools/updateProductPhotos.js:130-149`) |
| Archivo de otra empresa | `not_owned` | Productos que usan fotos ajenas (FLORECER con fotos ALM- de Almara, adjunto del 1259) |

Las fotos de ALMARA, el caso del ticket, probablemente caen en el segundo grupo; el conteo 8.0 lo mide.

## Decisiones

### B1. Pieza compartida: copiar una foto a la carpeta de la empresa

Módulo nuevo `services/productPhotos/photoCopy.js`, que usan el lote de TX-37 y el importador de F5-30 (F5-30·2). Dos entradas, una salida:
- `copiarDesdeEnlace({ url, empresa, companyDocId, productId })`: descarga segura (**ver revisión privada**), reusando `lookupSeguro` y `esIpPrivada` de `services/woocommerce/helpers/storeUrlGuard.js:32,83`.
- `copiarDesdeArchivoSinDueno({ path, empresa, companyDocId, productId })`: copia del lado del servidor dentro del mismo bucket, solo para archivos que pasan la regla de adopción (B2).
  - **Desvío registrado (2026-10-21, bloque TX37-B08):** no es una copia del lado del servidor. La pieza lee los bytes del archivo, los valida y escribe un archivo nuevo, para que la copia no herede los metadatos ni el enlace público del origen. Costo: la foto pasa por el proceso (hasta 15 MB, dentro del turno de red de la pieza) y un reintento vuelve a leer el origen, aunque reusa la copia ya escrita. Por lo mismo, `writeset.contract` prohíbe cualquier `copy` en el módulo, no solo «hacia otra carpeta». En el lote (`on`), la copia del archivo sin dueño se escribe después de uniformar (ver revisión privada).
- **Salida:** `{ ok:true, urls, path }` o `{ ok:false, code }` con `download_failed`, `not_image`, `too_large`, `unreadable` o `not_adoptable`. Nunca lanza.
- **Hosts:** → D-518 **reemplaza** la regla aprobada «solo desde hosts de imagen permitidos» (`proposal.md`, «Seguridad»). TX-37·3 y F5-30·2 piden copiar desde cualquier tienda o servicio anterior (Drive, Dropbox, el CDN de la tienda vieja), y una lista fija no los cubre. En su lugar van los controles de descarga de la revisión privada. Pregunta 12.
- **Concurrencia de red, dentro de la pieza:** `photoCopy` tiene su propio límite por proceso (4 descargas a la vez, compartidas entre todos los que la llaman). Quien la llama puede pedir menos, nunca más. Así el «4 a la vez por petición» de F5-30 (`importador-migracion-tiendas/design-fotos.md:32`) queda acotado por proceso y no se suma entre peticiones. Las descargas **no** usan el semáforo de CPU de `sharp` (`concurrency.js`): esperar la red no ocupa el turno de las vistas previas de las demás empresas.
- **Dónde y cómo guarda:**
  - Ruta `Productos/copias/<companyDocId>/<productId>/<huella>.<ext>`. La huella es el SHA-256 (16 caracteres) de los bytes en la copia de enlaces y de la ruta de origen en la de archivos; así un reintento cae en el mismo nombre.
  - Metadatos `company` (la empresa del token), `origen` (`"enlace"` o `"sin-dueno"`) y `productoId`. Nunca la URL de origen (puede traer un token) ni el correo de la persona. Cuándo lleva token de descarga: **ver revisión privada**.
  - Precondición de no existir. Si ya existe y es de la misma empresa con la misma huella, se reusa. No se borra nada.
- **Bytes:** se validan por su contenido antes de escribir y se guardan como llegan, sin recomprimir: es «el original». Los metadatos de la foto (EXIF/GPS) se quitan al uniformar, como en la fase 1.

### B2. «Adoptar» una foto sin dueño = copiarla, no cambiarle el dueño

D-518 pide adoptar la foto sin dueño cuando un producto de la empresa la usa. Se hace con B1: la empresa queda con su propia copia y **el archivo de origen no cambia**, ni sus metadatos ni su dueño. El mismo archivo puede estar en productos de dos empresas (FLORECER usa fotos de Almara). Motivos de seguridad: **ver revisión privada**. Pregunta 2.
- **Solo se adoptan archivos guardados como foto de producto.** Un archivo sin dueño que no tiene la forma de una foto de producto se omite con `not_adoptable`, sin leerlo ni mostrarlo, **también en la vista previa**. La regla exacta: **ver revisión privada**.
- `not_owned` no cambia: un archivo que declara otra empresa nunca se copia ni se lee.

### B3. Dónde entra en el lote

En `batchRunner.uniformarProducto` (`batchRunner.js:71-161`), antes de leer la foto, cuando el plan dice `external_link` u `owner_unknown`:

| Modo | Qué pasa |
|---|---|
| Vista previa | Descarga (enlace) o lee (sin dueño adoptable) para mostrar el después. No guarda nada. Cuenta para los topes de la vista previa |
| `shadow` | Igual que la vista previa: mide cuántas se podrían copiar y cuántas fallan (enlaces muertos). Resultado `would_copy` o el código de falla. Cero escrituras en Storage |
| `on` | Copia (B1), después uniforma desde la copia y escribe el producto en la misma transacción de siempre (`batchStore.aplicarProducto`) |

**Datos de la foto (anexo §G.3):**
- `original = { urls, path }` apunta a la **copia** (archivo propio): reprocesar y revertir siguen la regla de pertenencia sin excepción.
- Llave nueva `copiedFrom = { kind: "link" | "unowned", urls?, path?, at, batchId }`: `urls` para el enlace, `path` para el archivo sin dueño. Sobrevive a la reversión (`fotoRevertida` conserva las demás llaves, `eligibility.js:166-169`).
- **Revertir** devuelve la copia (la misma imagen, ya en el almacenamiento de Katuq), no el enlace: un enlace externo puede morir. Pregunta 1.
- Si la copia sale pero el producto cambió mientras tanto (`changed_meanwhile`), la copia queda sin uso y no se borra (igual que las variantes hoy).

### B4. Que no nazcan más fotos sin dueño

| Dónde | Cambio | Sensible |
|---|---|---|
| Tienda en un paso, `savePhoto` (`controllers/tiendaEnUnPaso.js:86-102`) | Guarda `metadata.company` con la empresa del token, que ya le llega (`services/sites/tiendaEnUnPaso.js:452`) y hoy se ignora. Sigue sin guardar el correo. Se corrige el comentario de `:95-96` («nada del código los lee» ya no es cierto) | No (Storage, metadatos de un archivo nuevo) |
| `get_product_photo_upload_url` (`tools/getProductPhotoUploadUrl.js:72-77`) | La URL firmada exige el metadato `company` de la empresa del token; la respuesta y el `comandoCurl` incluyen la cabecera que hay que mandar. **Ver revisión privada** | No |
| `update_product_photos` con `rutaStorage` (`tools/updateProductPhotos.js:130-149`) | Al sellar el archivo guarda `company`, con las validaciones de la revisión privada. **Ver revisión privada** | **Sí**: escribe `products` |
| `update_product_photos` con `urlFoto` | Pregunta 5: copiar con B1 al aprobar (recomendado) o dejar el enlace | **Sí** |

Las fotos sin dueño ya guardadas **no** se tocan en bloque: se copian cuando un lote las usa (B2). No hay backfill de metadatos.

**Fuera de este cambio (dependencias):** la importación por Excel y `importar-productos-con-fotos` siguen guardando enlaces; su propia fase 2 («copiar la foto al almacenamiento de Katuq», `importar-productos-con-fotos/proposal.md:75,86`) puede usar `photoCopy` cuando se apruebe. Mientras tanto, esas fotos entran a 1b cuando un lote las usa.

## Write-set de la fase 1b

| Escribe | Solo lee | Nunca |
|---|---|---|
| Storage: archivos nuevos en `Productos/copias/<companyDocId>/…`, con precondición de no existir. `products`: además de lo de la fase 1, la llave `copiedFrom` de cada foto copiada. Tienda en un paso y la herramienta MCP: `metadata.company` del archivo **nuevo** que ellas mismas suben | El enlace externo (descarga segura), los metadatos y los bytes del archivo sin dueño adoptable | Metadatos o bytes de archivos existentes; archivos de otra empresa; archivos sin dueño que no son foto de producto; borrar; precios, inventario, categorías, `integrations`, `exposicion` |

`writeset.contract.test.js` suma: el lote en `on` solo crea archivos bajo `Productos/copias/<companyDocId>/` y `Productos/uniformes/<companyDocId>/`; nunca llama `setMetadata`, `copy` hacia otra carpeta ni `delete`; en `shadow` y en la vista previa, cero escrituras en Storage.

## Pruebas primero

- **Caracterización antes de tocar:** `savePhoto` de Tienda en un paso (ruta, token determinista, metadatos de hoy); `update_product_photos` (listar, agregar por ruta, agregar por enlace, quitar, tope de 12, aviso de sync) y `get_product_photo_upload_url` (ruta y respuesta). Se dejan en verde antes del cambio y se ajustan solo en lo que el diff aprobado cambia.
- **Contrato:** `photoCopy` con dobles de red y de Storage: https obligatorio, destino interno rechazado, tope de bytes, SVG y bytes basura, enlace muerto, mismo nombre en el reintento, metadatos sin URL, límite de 4 descargas por proceso aunque lo pidan dos llamadores, descargas fuera del semáforo de CPU. Los casos de abuso concretos están en la revisión privada.
- **Lote:** `external_link` y `owner_unknown` adoptable → `would_copy` en sombra y `uniformed` con `copiedFrom` en `on`; sin dueño no adoptable → `not_adoptable` sin leer, también en la vista previa; `not_owned` sigue omitido; revertir devuelve la copia.

## Riesgos

- **Red del proceso compartido:** las descargas tienen su propio límite (4 por proceso) y no ocupan el turno de CPU; aun así consumen red y memoria del proceso que atiende a todos los comercios. Topes de bytes y de tiempo: revisión privada.
- **Enlaces muertos** de Drive o Dropbox: se omiten con `download_failed` y el resumen los cuenta para que el comercio los reemplace.
- **Almacenamiento:** cada foto copiada ocupa una vez más (la copia), y uniformada, sus variantes. El conteo 8.0 da el tamaño esperado.
- **FLORECER como piloto:** si sus fotos ALM- declaran a Almara como dueña, salen `not_owned` y no sirven para probar 1b. El conteo 8.0 lo confirma; si pasa, el piloto de 1b usa productos propios de FLORECER.
- **Dependencia de F5-30:** el importador espera `photoCopy`. Si F5-30 llega antes, la tarea 8.1 se adelanta sola (no depende del resto de 1b). F5-30 debe tomar el límite de concurrencia de la pieza (B1).
