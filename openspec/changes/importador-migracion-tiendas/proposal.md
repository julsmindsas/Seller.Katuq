# Traer la tienda desde Shopify, WooCommerce o Wix

## Why

Ticket 1245 (F5-30), parte 2. Quien se pasa a Katuq necesita traer su catálogo con variantes, atributos, fotos, precios, existencias y categorías. También sus clientes con el consentimiento que dieron, y las redirecciones para no perder posicionamiento. Al final debe ver qué entró y qué no. Criterio del ticket: **un catálogo de 500 productos de Shopify queda en Katuq con fotos y variantes en menos de una hora, con sus redirecciones listas.** La parte 1 (redirecciones a mano, D-479) ya está publicada.

Hoy (leído en el código el 2026-10-17, sin consultar producción):

- **El importador de productos no guarda variantes.** `importProducts` (`controllers/onboarding.js:2872`) arma el producto con campos fijos y descarta `variantes`. Con un producto existente usa `update` y reemplaza bloques enteros (`crearProducto`, `precio`…). Tiene modos crear, actualizar o ambos y crea categorías con `categoriaTreeHelper` (D-148). No tiene simulación ni forma de deshacer. Clientes sí: `DELETE /import-customers/:batchId`.
- **Fotos por enlace:** `utils/productImageUrls.js` valida el texto (https, sitio público, máximo 8 fotos) y no descarga nada. Funciona detrás de `productImportPhotos` (D-385; nace encendida en empresas nuevas, D-395).
- **Existencias:** `importInventory` (`onboarding.js:3477`) hace un conteo físico absoluto. Resuelve la referencia a `productoId` y la bodega por business code, normaliza y deduplica dentro de la transacción, y registra un movimiento «Ajuste por inventario físico». Acepta `defaultBodega`. Su write-set lo vigila `tests/inventory/importInventoryWriteSet.contract.test.js`. **`inventory` no tiene dimensión de variante:** va por producto y bodega.
- **Upsert de flows:** `katuq-product-upsert.action.js` busca por referencia (`limit(1)`), guarda con `merge`, protege precios curados (D-069) y genera `procesoComercial.variablesForm` desde `variantes[]` cuando hay dos o más combinaciones (D-214). No crea categorías, no calcula `categoriasIndex`, no simula y no tiene «solo crear».
- **El contrato canónico no coincide con lo que lee la tienda.** `contracts/canonical-product.ts` pone las fotos en `exposicion.imagenes` y el título en la raíz. La tienda lee `crearProducto.titulo` y `crearProducto.imagenesPrincipales[].urls` (`utils/vitrinaProducto.js`). El flow de Cereza escribe directo en `crearProducto`. `shopifyProductToCanonical` (`flows/nodes/shopify/utils/mapper.js:35`) sigue el contrato, así que sus fotos no saldrían en la tienda.
- **Lo que hoy soporta una variante (D-214):**
  - Solo dos ejes, reconocidos por nombre: talla (`option1`/`talla`/`size`) y color (`option2`/`color`) (`utils/variantesProducto.js`).
  - **El precio no cambia por variante:** `kuvo/checkoutCore.js:108` y `productoParaFicha` cobran el del producto (prueba `tests/sitios/precioSelectorVariantes.test.js`).
  - La ficha da la variante por disponible si `variantes[].cantidad > 0` (`vitrinaProducto.js:297`). Ese campo solo lo escribe el flow de Cereza en cada sincronización.
  - El formulario de producto del front no muestra ni edita `variantes[]`.
- **Hay dos modelos de variante.** El mapper de Woo (`services/woocommerce/mappers/variant.js`) crea cada variación como un producto aparte, con `productoPadre.cd`, y nada lee ese campo.
- **Redirecciones (D-479):** `contenido.redirecciones`, con tope de 500 (`utils/siteBlocks.js`, `normalizarRedirecciones`). El origen se compara exacto (`controllers/sites.js:5898`). Los destinos salen de `rutaDeProducto(titulo, id)` → `/p/<nombre>-<docId>` y `rutaDeCategoria` → `/c/<nombre>`. El id del producto solo existe después de crearlo.
- **Clientes:** `importCustomers` exige `documento` y `nombres_completos`. Los exports de tiendas no traen cédula. El consentimiento vive en `email_subscribers` (D-318, `services/marketing/suscriptores.js`), por sitio y correo, con orígenes cerrados: `checkout`, `formulario`, `boletin`, `cuenta` y `reactivacion`. No hay origen «importación».

## What Changes

Bandera por comercio `storeMigrationImport`, **apagada de fábrica** (D-385). Se prueba primero en FLORECER. Tres pasos: **subir archivos → simulación → importar**.

1. **Lector del CSV de productos de Shopify.** Agrupa las filas por `Handle`, de modo que un producto nunca quede partido entre dos lotes.
   - Ejes: `Option1..3 Name/Value` pasan a `atributos` **por nombre** (Talla → `talla`, Color → `color`), nunca por posición.
   - Campos: `Variant SKU/Price/Compare At Price/Barcode/Grams`, `Image Src/Position/Alt Text`, y `Variant Image` como etiqueta de color de la foto.
   - Organización: `Type`/`Product Category` → categoría, `Tags` → etiquetas, `Status` → activo, `Body (HTML)` → descripción.
   - Cantidad: `Variant Inventory Qty` o el CSV de inventario aparte, según la versión del export.
2. **Lector del CSV de productos de WooCommerce.** Usa `Type` (simple, variable, variation) y agrupa las variaciones por `Parent`.
   - Campos: `Attribute N name/value(s)`, `Regular/Sale price`, `Stock` y `Images` (lista de enlaces).
   - Categorías: de `Categories` («A > B») se toma la primera ruta y las demás van al reporte.
   - Los formatos de ambos exports se confirman con archivos reales antes del design.
3. **Producto canónico → el mismo `katuq-product-upsert` de flows.**
   - Se guarda en la forma que lee la tienda: `crearProducto` (título, descripción, fotos), precio base y `variantes[]` (título, referencia, atributos, cantidad). El upsert ya genera las variables nativas (D-214) y protege precios.
   - Las categorías salen de la lógica de `importProducts`, extraída a un helper compartido sin cambiar su comportamiento (prueba «dorado»). También `categoriasIndex`.
   - El origen queda en `metadata.migration { source, handle, externalId }`. No se escribe en `integrations.shopify`, para no enlazarlo con la sincronización viva de Shopify.
   - **Precio distinto por variante:** Katuq no lo cobra (D-214). En ese caso, por defecto se crea un producto por precio y se avisa en el reporte (pregunta 1).
4. **Existencias** con la lógica de `importInventory`, en una bodega que elige el comercio (business code) y dentro de su transacción. Se carga la **suma por producto**: D-214 prohíbe usar la referencia de variante como `productoId`. En `variantes[].cantidad` queda la foto inicial para la ficha.
5. **Fotos por enlace** con `buildProductPhotos` (máximo 8, sin descargar). Las sobrantes y las rechazadas van al reporte.
6. **Redirecciones generadas.** Se agregan al borrador de `contenido.redirecciones` sin pisar las manuales y se activan al publicar (D-479).
   - Shopify: `/products/<handle>` → `rutaDeProducto` y `/collections/<handle>` → `rutaDeCategoria`.
   - WooCommerce: `/product/<slug>` y `/product-category/<slug>`, con los enlaces permanentes por defecto.
   - El CSV de Shopify no trae colecciones. Las de categoría se generan con el handle probable del nombre, marcadas «probable», o desde una lista que pega el comercio.
7. **Clientes** del CSV de Shopify, con la lógica de `importCustomers`. Solo quien trae «Accepts Email Marketing = yes» pasa a `email_subscribers`. Nunca se presume un consentimiento (preguntas 3 y 4).
8. **Simulación primero, sin ninguna escritura**, con conteos:
   - productos nuevos, que se actualizarían u omitidos;
   - variantes, fotos válidas y rechazadas;
   - productos con precio por variante o con más de dos ejes;
   - referencias sin SKU o repetidas, en el archivo o en Katuq;
   - categorías nuevas, unidades por cargar, redirecciones y choques con las manuales;
   - clientes y consentimientos.
9. **Reporte final** de lo que entró y de lo que no, con el motivo y la fila. Se puede descargar en CSV. No se crea una colección nueva.
10. **Modo «solo crear nuevos»** por defecto. Actualizar existentes es opcional. Una referencia repetida en Katuq se omite y se reporta, nunca se adivina.

**Write-set declarado:**

- `products`: lo anterior, por el upsert.
- `categorias`: el árbol, como D-148.
- `inventory` e `inventoryMovement`: solo por la lógica de `importInventory`, que sigue sin escribir `products`.
- `clients` y `email_subscribers`: este último, solo con consentimiento explícito.
- El borrador de `contenido.redirecciones` del sitio.

**Nunca** escribe precios por cliente, listas de precios, Shopify, WooCommerce, Osmosis, `InventoryLevel`, flows ni pedidos.

## Capabilities

### New Capabilities
- `store-migration-catalog`: lectores Shopify y WooCommerce, agrupación de variantes, producto canónico, fotos y existencias.
- `store-migration-dry-run-report`: la simulación sin escrituras y el reporte de lo importado y lo omitido.
- `store-migration-redirects`: el mapa 301 generado y su convivencia con las redirecciones manuales.
- `store-migration-customers`: los clientes y su consentimiento verificable.

### Modified Capabilities
_(ninguna archivada: el importador y las redirecciones viven en D-148, D-214 y D-479)_

## No-goals

- API en vivo de Wix, Shopify o WooCommerce en esta etapa: solo archivos. El CSV de Wix va en una segunda etapa, después de ver un archivo real; sus fotos no vendrían como enlace completo, según la documentación pública.
- Páginas básicas: el export CSV de Shopify no las trae y WooCommerce las da en XML de WordPress. Van en otra etapa.
- Un modelo nuevo de variante, stock por variante en `inventory` o precio por variante. D-214 los prohíbe: cada uno requiere su propia propuesta.
- Copiar las fotos a Storage. Es la fase 2 de `importar-productos-con-fotos`.
- Pedidos históricos, reseñas, blogs y cupones.
- Unificar el mapper de Woo, que guarda las variaciones como productos aparte.

## Riesgos

- **Duplicados por referencia.** El upsert toma el primero que encuentra (`limit(1)`). La simulación busca repetidos en Katuq y omite los ambiguos. Productos de Shopify sin SKU: se propone usar el `Handle` como referencia.
- **Sobrescribir productos existentes.** Con `merge`, la galería y `variantes[]` se reemplazan enteras. Por eso «solo crear» es el modo por defecto. Los precios curados quedan protegidos (D-069).
- **Doble conteo de inventario.** Solo pasa por `importInventory`, que normaliza y deduplica. Pero es un conteo **absoluto**: en un producto que ya tenía existencias, las reemplaza y deja el movimiento. La simulación lo avisa.
- **Variantes con existencias desactualizadas.** `variantes[].cantidad` no se descuenta al vender. El producto se agota bien porque su cantidad sale de `inventory`, pero la ficha puede ofrecer una talla ya vendida (pregunta 2).
- **Fotos pesadas o ajenas.** Quedan en el CDN de la plataforma anterior: si el comercio cierra esa tienda pueden dejar de verse. No pasan por la optimización de `controllers/media.js`, así que fotos originales grandes vuelven lenta la tienda.
- **Flows vivos.** En OH MY STORE, `katuq-product-changed` publica en Shopify todo producto con `paginaWeb` (cada 10 minutos). La bandera no se enciende ahí.
- **Tope de 500 redirecciones.** 500 productos más sus colecciones lo superan. Subirlo agranda el documento del sitio, que tiene un límite de 1 MiB.
- **Coincidencia exacta.** `/collections/x/products/<handle>` no redirige. Las redirecciones solo sirven si el dominio anterior ya apunta a Katuq.
- **Tiempo.** Estimado, no medido: el upsert es secuencial (unas 4 lecturas o escrituras por producto) y las existencias van en una transacción por fila. Se mide en FLORECER con un archivo real de 500 productos antes de prometer la hora.
- **Datos personales.** Correos y teléfonos de clientes nunca van al registro (Artículo XI).

## Preguntas para Daniel

1. Si las variantes de un producto tienen precios distintos: ¿se crea un producto por precio (propuesta), se importa al precio base y se avisa, o se deja fuera?
2. ¿Aceptamos `variantes[].cantidad` como foto inicial que se desactualiza? La alternativa es otra propuesta para que la ficha no dependa de ese campo en productos sin proveedor.
3. Los clientes no traen cédula y `importCustomers` la exige. ¿Usamos el correo o el teléfono como identificador provisional, o los dejamos fuera con aviso? El documento lo usa la facturación.
4. ¿El consentimiento traído de Shopify vale en Katuq (Ley 1581)? ¿Se agrega el origen `importacion` a `email_subscribers`, o se pide un consentimiento nuevo?
5. ¿Subimos el tope de 500 redirecciones? ¿A cuánto, o damos prioridad a productos sobre colecciones?
6. La ruta nueva (`/v1/onboarding/import-store`, con simulación) requiere tu aprobación, según `openspec/config.yaml`. ¿La aprobamos, o lo montamos sobre `import-products`, que hoy no guarda variantes?
7. ¿La bandera nace encendida en empresas nuevas (como D-395) o solo a mano? ¿Y la fecha de retiro (Artículo XII)?
8. ¿Wix (CSV) entra en esta entrega o en la siguiente?

## Decisión

**D-498**, aprobada por Daniel el 2026-10-18 (tabla «D-495 a D-503» de `specs/CONTRACT.md`). No se implementa nada antes de responder las preguntas y aprobar el design y las tareas.
