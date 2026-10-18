# Diseño — Fotos de producto uniformes, fase 1 (D-501, ticket 1252, TX-37)

> Estado: **diseño para aprobación**. Detalla la fase 1, sin IA. Las rutas, los datos, el historial, Storage, la lista de escritores y los valores por defecto están en [`anexo.md`](anexo.md). Los criterios de aceptación, en [`specs/product-photo-uniform/spec.md`](specs/product-photo-uniform/spec.md). Verificado en el código el 2026-10-18 (front `feature/venta-asistida-mejorada`, backend `backend-aws-security`, rutas relativas a `functions/`).

## Decisiones

1. **Módulo propio que reusa la tubería.**
   - **Pieza pura:** `utils/productPhotoUniform.js`.
   - **Servicios:** `services/productPhotos/` (`settings`, `eligibility`, `syncDetector`, `photoStorage`, `batchStore` y `batchRunner`). Solo `batchStore` escribe en Firestore.
   - **Rutas:** `/v1/product-photos`.
   - **Sin cambios:** `utils/siteImagenes.js`, `controllers/media.js` y `/edit`.
2. **Proceso de una foto (v1).**
   1. Se lee con el SDK de administración si pasa la regla de pertenencia (decisión 4), con tope de 15 MB.
   2. `sharp` la abre con topes de 50 MP y 15 s, aplica `.rotate()` y mide la calidad.
   3. `trim({ threshold: 10 })` quita los bordes. Si deja menos del 20 % del área o de 64 px por lado, no recorta y marca `trim_skipped`.
   4. Se aplana la transparencia y el producto entra con `fit: contain`, sin agrandar, en un lienzo de hasta 1920 px. Una foto chica da un lienzo chico.
   5. `procesarImagenSitio(lienzo)` genera las variantes de los anchos que no pasan el del lienzo, más ese ancho (`utils/siteImagenes.js:17-19`). La portada suma un JPEG de hasta 1280 px.
   - **`urls`:** en la portada es el JPEG. En las demás es **la variante WebP más grande que exista hasta 1280**: `-w1280.webp`, o `-w900.webp` si el lienzo mide 900.
   - **Token:** todas las variantes de una foto, incluido el JPEG, comparten un solo `firebaseStorageDownloadTokens`, como en `controllers/media.js`, porque `srcsetDe` (`utils/siteHtml.js:380`) solo cambia el número.
   - Sin `withMetadata`, no se copian EXIF ni GPS. La portada en JPEG queda sin `srcset`, a cambio de que funcionen WhatsApp, el correo y Meta (pregunta 7).
3. **Aviso de calidad, solo informativo.**
   - `low_resolution`: el lado menor mide menos de 600 px.
   - `blurry`: la varianza del laplaciano en grises a 512 px es menor de 100.
   - El cálculo es una función pura, en cada repo, que recibe un arreglo de grises.
   - La extracción va aparte: `sharp` en el backend y `photo-quality-canvas.ts` en el navegador. Esta usa el DOM y queda fuera de `node --test`.
   - La paridad se prueba con vectores versionados (`photo-quality-vectors.v1.json`), idénticos en los dos repos. El aviso del navegador es orientativo.
4. **Qué entra y regla de pertenencia.**
   - **Producto:** de la empresa del token, sin `integrations` ni `integraciones` (Artículo XV) y sin `exposicion.imagenes`.
   - **Foto:** un objeto, no excluido por la persona, cuyo archivo es **propio**:
     - **Bucket:** debe ser `STORAGE_BUCKET`. Otro bucket, aunque sea de Firebase, es `external_link`. Lo resuelve un lector puro nuevo que devuelve `{ bucket, path }`. `resolverPathStorage` (`media.js:63`) no se exporta ni se copia, porque en las URLs `/o/…` ignora el bucket.
     - **Dueño:** `metadata.company` del archivo debe ser igual a la empresa del token, normalizada como en `duenoDelArchivo`. Si es de otra empresa: `not_owned`. Si no declara dueño: `owner_unknown`, que se omite por defecto. La tarea 0.4 cuenta esos casos y Daniel decide.
   - La regla aplica a toda ruta que salga del documento, también a `original.path` al reprocesar y al revertir. La validación detallada de multi-tenant va en un cambio del backend privado. Los códigos de omisión están en el anexo §B.
5. **Syncs: excluir, con criterio conservador.** Responde 409 `COMPANY_HAS_PRODUCT_SYNC` si la empresa tiene:
   - un flow activo con **cualquier nodo cuyo tipo contenga `product`** (criterio de activo de `tools/updateProductPhotos.js:56`);
   - o un `integration_configs` activo de osmosis, shopify, woocommerce o fulfillment.

   La tarea 0.3 cierra la lista y no se toca el código de los syncs. La prueba de registro de escritores exige clasificar todo archivo que escribe `imagenesPrincipales` como «sync que excluye» o «acción manual» (anexo §E).
6. **Datos de cada foto** (anexo §B).
   - `original` se escribe solo la primera vez y es la fuente para reprocesar.
   - **Revertir** devuelve `original` a `urls` y `path` y quita `original` y `processed`. Si el original no existe o no es propio, `original_missing`.
   - **Revertir un lote** solo toca su `batchId`. Si la foto se reprocesó después, `reprocessed_later`.
   - Se conservan las demás llaves, el orden y el largo.
7. **Escritura atómica por producto.** Una transacción relee el producto. Si cambió el largo o el `urls` de alguna foto, `changed_meanwhile`: lo subido queda sin uso y no se borra. Si no, en la misma transacción:
   - **Producto:** `imagenesPrincipales`, `user_edit` (el mismo valor que escribe `exports.edit`) y `date_edit` como **cadena ISO**, igual que `productos.js:336` y `updateProductPhotos.js:217`. Los listados y el cursor de `katuq-product-changed` comparan cadenas.
   - **Historial:** con los tipos fijos del anexo §C.
   - **Lote:** el resultado del producto y el `increment` de los contadores.
8. **El lote corre fuera de la petición.**
   - **Crear:** una transacción lee el lote (id = hash de empresa + `idempotencyKey`) y, si existe, lo devuelve. Si no, lee el **candado de la empresa** (`product_photo_batches/lock-<companyDocId>`). Si el candado apunta a un lote `queued` o `running`, responde 409 `BATCH_RUNNING`; si no, crea el lote y el candado y responde 202. Así, dos llaves distintas no crean dos lotes activos.
   - **Ejecutar:** lo intenta tomar el proceso que lo creó. `batchRunner` usa un arriendo transaccional de 2 min, renovado en cada producto.
   - **Antes de cada producto** relee el modo y la bandera. El modo efectivo es el menor entre `lote.mode`, fijado al crearlo, y `PRODUCT_PHOTO_UNIFORM_MODE` (`off` < `shadow` < `on`). Si baja, o si se apaga la bandera, el lote termina `stopped` (`mode_changed` o `feature_off`), libera el candado y lo hecho queda reversible. Un lote `shadow` nunca escribe, aunque el modo suba.
   - **Retomar** lotes vencidos, al arrancar y cada 5 min, solo con `CRON_ENABLED=true` (`index.js:952`, `cronService.js:111`). Con el modo en `off`, el runner solo toma lotes de reversión. Así, un backend local apuntado a producción no toma lotes.
   - **Topes:** 100 productos (más da 422 `BATCH_TOO_LARGE`), 12 fotos por producto y 15 s por foto.
   - **Cancelar:** el lote para al cerrar el producto en curso.
9. **Bandera, interruptor, sombra y reversión.**
   - **Bandera:** `productPhotoUniform`, en los dos catálogos y no en `banderasEmpresaNueva.js`. Dueño: Daniel. Retiro: 2027-04-30.
   - **Interruptor** `PRODUCT_PHOTO_UNIFORM_MODE`: `off`, que es el valor si no está puesto y responde 503 `PHOTO_UNIFORM_OFF`; `shadow`, y `on`. Solo controla `POST /preview` y `POST /batches`.
   - **En `shadow`:** cero escrituras en `products`, `productHistory` y Storage. Solo se escribe `product_photo_batches`: lote, candado, resultados y métricas.
   - **Vista previa:** no escribe nada en ningún modo.
   - **Reversión, consultas y cancelación:** no dependen del modo. La reversión no crea archivos ni usa `sharp`, siempre es real y exige bandera y rol.
   - **Cadena:** `auth` → `requireJwtTenant` → `requireFeature` (con `try`, como en `routers/katuqintelligence.js:14-30`) → modo (solo vista previa y lotes) → rol → manejador.
10. **CPU de la vista previa.**
    - **Semáforo:** uno por proceso, de una foto a la vez y compartido con el runner. Si la espera pasa de 20 s, 429 `PHOTO_BUSY`.
    - **Por empresa:** una vista previa en curso (429 `PREVIEW_RUNNING`) y 10 cada 10 min (429 `PREVIEW_RATE_LIMIT`).
    - Contadores en memoria, sin escrituras: con k procesos, el techo es de k fotos a la vez.
11. **Front.**
    - **Servicio y piezas puras:** `shared/services/productos/product-photos.service.ts` extiende `base.service.ts`, con `SKIP_LOADER` en la consulta. Las piezas puras son `product-photos.mapper.ts` y `photo-quality.ts`.
    - **Diálogo:** standalone y OnPush en `components/productos/fotos-uniformes/`. Pasos: ajustes → vista previa de hasta 3 fotos, con «No uniformar esta» → aplicar → progreso cada 2 s (`timer` + `switchMap` + `takeUntil`) → resumen con «Revertir lote». Con el modo en `off`, solo ofrece revertir.
    - **Entradas:**
      - la barra masiva con selección (`productos.component.html:418`);
      - un botón junto al filtro de categoría cuando hay una categoría real filtrada (no `__SIN_CATEGORIA__`), que manda `categoryLabel`;
      - la pestaña Imágenes de un producto guardado.
    - **Aviso al subir:** en `processSelectedFiles`, sin bloquear.
    - **UI:** `openspec/specs/design-system/spec.md`, clases `fu-*` sin «p-», cada `span` con color y tamaño, `:focus-visible` y sin nombre de proveedor (Artículo VI).

## Write-set cerrado

| Escribe | Solo lee | Nunca |
|---|---|---|
| `products`: `crearProducto.imagenesPrincipales` (en cada foto solo `urls`, `path`, `original`, `processed`), `user_edit`, `date_edit`; `productHistory`; `product_photo_batches` y `results`; archivos nuevos en `Productos/uniformes/<companyDocId>/` | `products` (con `company`), `companies` (`featureFlags`, `brandKit`, id), `flows`, `integration_configs`, archivos propios | precios, `preciosPorTipoCliente`, `inventory`, `inventoryMovement`, `integrations`, `exposicion`, categorías, variantes, `companies`, Shopify; borrar o pisar archivos |

**Por modo:**
- vista previa: nada;
- lote `shadow`: solo `product_photo_batches`;
- lote `on`: la tabla;
- reversión, en cualquier modo: la tabla, sin Storage.

Las pruebas de contrato van antes del código (tareas 1.x).

## Observabilidad y seguridad

- **Fallas:** una línea JSON (`scope: "productPhotos"`, `correlationId: batchId`, `event`, `code`), como `whatsappBotDispatcher.js:71`, sin URLs con token, imágenes ni datos personales y sin `console.log` de telemetría.
- **Empresa y archivos:** la empresa sale solo del JWT y cada archivo pasa la regla de pertenencia. Los nombres los pone el servidor, se escribe solo si el archivo no existe y nunca se borra ni se pisa nada.
- **Prerrequisito (0.5):** no se escribe `productHistory` ni se pasa a `on` hasta desplegar el cambio del backend privado sobre el lector del historial de producto. Los hallazgos de seguridad van allá.

## Gates constitucionales

- **I, XIII y XIV:** D-501 y bitácora.
- **II:** la spec va sin tecnología.
- **IV:** idempotencia por `idempotencyKey` y por `settingsHash` + `sourcePath`.
- **V y X:** no aplican.
- **VI:** sin proveedor en pantalla.
- **VII:** `correlationId` = `batchId`.
- **VIII:** contratos primero.
- **IX:** excepción de Angular 14.
- **XI:** logs sin datos sensibles.
- **XII:** retiro en 6.1.
- **XV:** `integrations` solo se lee.

## Fases siguientes y riesgos

Las fases 1b (copiar al bucket los enlaces externos y las fotos sin dueño), 2 («Quitar fondo»), S y X siguen la hoja de ruta de la propuesta. La 1b espera, además, la revisión del backend privado.

**Riesgos** (los de la propuesta, más uno): un editor abierto antes del lote, si se guarda, devuelve las fotos viejas sin perder datos.

## Despliegue y reversa

**Despliegue:** backend con la bandera apagada y el modo en `shadow` → front → Daniel enciende FLORECER con `set-company-feature.js` (primero en simulación, luego con `--execute`) → sombra → `on`.

**Reversa, en orden:**
1. Modo `off`: frena los lotes nuevos y la vista previa, y para el lote en curso antes del siguiente producto.
2. Revertir los lotes desde la pantalla, con la bandera todavía encendida.
3. Apagar la bandera, si hace falta.

Si se apagó primero, se vuelve a encender con el modo en `off`, y así solo queda la reversión. No se borra ningún archivo.
