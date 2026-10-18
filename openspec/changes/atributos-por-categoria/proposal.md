# Atributos técnicos por categoría: ficha, filtros, comparador y SEO

## Why

Ticket 1234 (F2-42): un comercio con catálogo técnico necesita atributos propios
de cada categoría (tecnología WiFi, velocidad, puertos…) para filtrar la tienda y
mostrar la ficha técnica sin escribirla a mano. Criterios de aceptación:
«En la categoría Networking se puede filtrar por marca, precio, tecnología WiFi y
velocidad, con conteos correctos» y «La ficha muestra la tabla de
especificaciones sin que el comercio la escriba a mano».

Hoy (leído en el código el 2026-10-17; backend = `katuq_admin_back_firebase/functions`):

**Categorías**
- El maestro es un documento por empresa en `categorias`, campo `categoria`: el
  árbol de 3 niveles serializado con `flatted` (`services/categoriaTreeHelper.js`).
  El nodo es `{nombre, imagen, posicion, activo, consecutivo}`, sin id: la
  identidad es el nombre dentro de su ruta. No hay atributos en ningún nivel.
- Maestros > Categorías (`components/ecomerce/categorias/list`) guarda el árbol
  completo, y `POST /v1/categorias/create` (`controllers/categorias.js`) borra el
  documento de la empresa y lo vuelve a crear con lo que llega.
- El producto guarda en `categorias` una COPIA del nodo elegido, `data` incluido
  (`crear-productos.component.ts`, `processCategorias` pasa `data: p.data` al
  `p-treeSelect`). `categoriasIndex` (`services/categoriaIndexHelper.js`) guarda
  solo la etiqueta del nodo asignado, en minúscula. La ruta se reconstruye desde
  `categorias` con `rutaCategoria`, que devuelve solo 2 niveles.

**Producto e importador**
- Lo más parecido a un atributo es `crearProducto.caracAdicionales`: texto libre,
  obligatorio en el formulario y columna "Caracteristicas Adicionales" del
  importador. La tienda no lo muestra: `productoParaFicha`
  (`utils/vitrinaProducto.js`) expone descripción, garantía y cuidados.
- `variantes[].atributos` (option1/option2) es talla/color de variantes, no ficha técnica.
- `import-modal.component.ts` arma una plantilla fija, compartida con el export
  para el ciclo exportar → corregir → reimportar (46 columnas, según su comentario).
  Su hoja "Instrucciones" ya lista opciones válidas reales de la empresa (tipo y
  tiempo de entrega), un patrón reutilizable.
- `importProducts` (`controllers/onboarding.js`) actualiza con
  `writeBatch.update({...product})`: cada mapa de primer nivel se reemplaza entero.

**Tienda y búsqueda**
- `getSearchIndex` (`controllers/productos.js`) carga por empresa, con field mask
  (`select`), un índice en memoria del proceso con TTL de 5 min. Se invalida al
  crear, editar o eliminar productos. Lo comparten el listado del Seller, la tienda,
  el feed, el sitemap, el asesor KAI y `tools/searchProducts.js`. No trae atributos.
- `consultarCatalogo` (`controllers/sites.js`) filtra sobre ese índice por
  categoría, marca (D-472), precio, oferta, ocasión y texto (título o referencia).
  Solo lee completos los 12 productos de la página.
- **Los conteos no son facetados:** categorías y marcas se cuentan antes de
  cualquier filtro. Dentro de una categoría, el conteo de marcas es el de toda la tienda.
- El filtro de categoría compara exacto contra `categoriasIndex`: un producto en
  «Networking > Routers» no sale al elegir «Networking».
- Cada filtro es un chip de selección única (`utils/siteHtml.js`) y no hay
  "Limpiar todo".
- **Disponibilidad:** el catálogo solo lista lo vendible (`esVendibleEnTienda`:
  con existencias o no inventariable), así que hoy ese filtro no separaría nada.
- **Valoración:** las estrellas se leen solo para la página visible
  (`conCalificaciones`). No hay promedio por producto en el índice y el plan
  gratis no tiene reseñas.
- No existen comparador ni pestañas de especificaciones o compatibilidad. La ficha
  pinta la descripción y los `<details>` de Garantía y Cuidados.

**SEO y feed**
- `datosEstructurados` (`utils/siteHtml.js`) arma `Product` con nombre, fotos,
  sku, marca, `aggregateRating` y `Offer`, sin `additionalProperty`.
- `feedProductos` (`/feed.xml`, ticket 1229) publica id, título, descripción, foto,
  precio, GTIN, marca y `product_type`, sin detalles técnicos.

## What Changes

1. **Atributos por nodo de categoría, con herencia.**
   - En Maestros > Categorías, cada nivel define sus atributos: etiqueta, clave
     estable, tipo (texto, número con unidad, lista de opciones o sí/no),
     opciones, unidad, obligatorio, "usar como filtro", "mostrar en comparador",
     sección (Especificaciones o Compatibilidad) y orden.
   - Un nodo hereda los atributos de sus ancestros. Puede agregar propios, pero
     no cambiar el tipo de uno heredado.
   - Se guardan en el mismo documento de `categorias`, en un campo aparte del
     árbol (`attributeSchemas`, mapa por ruta). No van en `data` del nodo, porque
     ese `data` se copia a cada producto y engordaría productos e índice.
2. **Valores por producto** en un campo nuevo `products.attributes` (mapa
   `clave → valor`), validado en el servidor contra el esquema heredado. Los
   valores huérfanos (atributo borrado o producto movido de categoría) se
   conservan, pero no se muestran ni filtran. `caracAdicionales` no cambia.
3. **Edición en el Seller:** pestaña "Especificaciones" en crear/editar producto,
   como componente hijo pequeño (`crear-productos` ya tiene 3.619 líneas), con
   base D-400 y design-system. Los campos salen de la categoría elegida y cambian
   con ella.
4. **Importación con plantilla por categoría** en el importador existente:
   - Al descargar la plantilla se elige una categoría. Se suma una columna por
     atributo, con la unidad en el encabezado, como "(cm)" y "(SI/NO)".
   - La hoja Instrucciones lista las opciones válidas.
   - El backend escribe solo las claves recibidas (`attributes.<clave>`) y avisa
     por fila los valores inválidos.
   - El export filtrado por esa categoría trae las mismas columnas.
5. **Facetas en `consultarCatalogo`, sobre el índice:**
   - El índice suma `attributes` a la máscara y calcula en memoria la ruta de
     categoría desde `categorias`, sin escribir productos.
   - Filtrar una categoría incluye sus subcategorías.
   - Con una categoría elegida aparecen marca, precio, disponibilidad y valoración
     (según las preguntas), además de los atributos con "usar como filtro".
   - Las listas y los sí/no muestran conteo por valor. Los números muestran un rango.
   - Cada conteo aplica todos los filtros menos el suyo: OR dentro de una faceta,
     AND entre facetas, y solo sobre lo que el plan deja ver (D-319).
   - Habrá chips de filtros activos, "Limpiar todo" y filtros en la URL. Se hace
     una sola pasada y no se suman lecturas de Firestore.
6. **Ficha en la tienda:** pestañas "Especificaciones" y "Compatibilidad",
   generadas de los atributos con valor (etiqueta, valor, unidad) en el orden del
   esquema. Sin valores, la pestaña no sale.
7. **Comparador de hasta 4 productos:**
   - Botón "Comparar" en las tarjetas y en la ficha; la bandeja vive en el
     navegador del visitante.
   - La vista muestra los atributos lado a lado y resalta diferencias.
   - Los datos salen de un endpoint público con los mismos candados del catálogo:
     sitio publicado, misma empresa, solo productos publicables y visibles del plan.
8. **SEO y feed:**
   - JSON-LD `Product.additionalProperty` (`PropertyValue` con `name`, `value` y `unitText`).
   - En `feed.xml`, `g:product_detail` (sección, atributo, valor) para Google.
     Para Meta, los campos estándar que coincidan; se confirma en design.

**Decisión:** D-495 (aprobada por Daniel el 2026-10-18), registrada en `specs/CONTRACT.md` (tabla «D-495 a D-503»).

## Capabilities

### New Capabilities
- `catalogo-atributos-categoria`: esquema de atributos por categoría con
  herencia, valores por producto, edición en el Seller e importación/exportación
  con plantilla por categoría.
- `tienda-facetas-comparador`: facetas con conteo correcto y "Limpiar todo",
  pestañas de especificaciones y compatibilidad, comparador de 4, JSON-LD y feed.

### Modified Capabilities
_(ninguna spec vigente en `openspec/specs/` cubre el catálogo de la tienda ni el maestro de categorías)_

## No-goals

- Enviar atributos a Shopify, WooCommerce o Cereza (metafields) o leerlos de allá.
- Pasar `caracAdicionales` a atributos automáticamente. Puede ser otra fase con KAI.
- Atributos por variante: talla y color siguen en `variantes`.
- Cambiar el filtro de categoría del listado del Seller, pasar de 3 niveles o dar
  ids a las categorías.
- Motor de búsqueda externo o búsqueda de texto dentro de los atributos.
- Colecciones nuevas o endpoints "v2".
- Tocar inventario, precios, listas de precios o los flows de Shopify.

## Riesgos

- **Tamaño del índice:** es por empresa y por proceso, y ya carga objetos
  completos (`exposicionObj`, `disponibilidadObj`, `procesoComercialObj`,
  `categoriasRaw`, descripción). Sumar `attributes` lo agranda para todos sus
  consumidores. Mitigación:
  - solo `attributes` entra en la máscara;
  - topes de atributos por categoría y de largo por valor;
  - los esquemas se leen aparte, una vez por empresa;
  - medición previa de solo lectura con `--dry-run`.
  Un cambio puede tardar hasta 5 min en verse en otro proceso, igual que hoy.
- **Flows de OH MY STORE que escriben productos:**
  - `osmosisProductSyncService` actualiza por rutas con punto
    (`identificacion.marca`, `crearProducto.descripcion` y `categorias` si no hay
    una manual), y `katuq-product-upsert` usa `set(..., {merge: true})`. Ninguno
    pisa `attributes`.
  - Cereza reescribe la marca en cada sync, así que la faceta de marca de OMS
    refleja la de Cereza.
  - Muchas categorías de OMS son arreglos de texto sin ruta (forma 5): el esquema
    se resuelve por etiqueta única y, si hay ambigüedad, el producto queda sin
    atributos y el caso se registra.
  - No se modifican `cereza-products-to-shopify-a5156643` ni `katuq-web-to-shopify`.
- **Editar resincroniza:** `/v1/productos/edit` llama
  `ecommerceAdapter.syncProduct("UPDATE")`. Guardar atributos por ahí reenvía el
  producto a Shopify en las empresas integradas, como cualquier edición.
- **Inventario no toca productos (D-134):** el write-set de este cambio es solo
  `products.attributes` (Seller e importador) y `categorias.attributeSchemas`
  (Maestros). El código de inventario no se toca. Un contract test verifica que
  importar o editar atributos deja intactos `precio`, `preciosPorTipoCliente`,
  `variantes` e `integrations`.
- **Guardado del maestro:** `/v1/categorias/create` borra y recrea el documento.
  Una pantalla abierta con datos viejos podría borrar los esquemas, y renombrar
  una categoría los dejaría huérfanos. El backend debe preservar
  `attributeSchemas` cuando no viene en el cuerpo y mover la clave al renombrar.
- **Importador:** como `update({...product})` reemplaza mapas enteros, los
  atributos se escriben por clave.
- **Hallazgos aparte, por verificar con datos:**
  - Las entradas del índice no tienen `identificacion` ni `descripcionCorta`, y
    guardan `marca`, `descripcion` y `categoriasIndex` en minúscula. Por eso
    `feedProductos` nunca envía `g:mpn`, marca como `identifier_exists=no` lo que
    no tiene un GTIN válido y manda marca, descripción y `product_type` en minúscula.
  - `productoParaFicha` lee `p.marca` en la raíz, pero los escritores guardan
    `identificacion.marca`: la marca del JSON-LD probablemente cae al nombre del comercio.

## Preguntas para Daniel

1. ¿Mostramos los agotados en el catálogo, con "Avísame", para que el filtro de
   disponibilidad sirva, o lo omitimos y seguimos mostrando solo lo vendible?
2. Para valoración no existe un promedio por producto. ¿Lo guardamos en el
   producto al publicar una reseña (escritura nueva en `products`), lo dejamos
   fuera de esta fase o filtramos solo por "con reseñas"?
3. ¿"Compatibilidad" son atributos marcados con esa sección (por ejemplo
   "Compatible con: Windows, macOS") o vínculos entre productos? Lo segundo es
   otro modelo y otro cambio.
4. ¿Aprobamos los nombres `products.attributes` y `categorias.attributeSchemas`
   (inglés, por regla)?
5. ¿Los atributos se guardan por `/v1/productos/edit` (resincroniza con Shopify)
   o por un endpoint propio que solo escriba `attributes`?
6. ¿Lo encendemos por comercio en el bloque Catálogo, como `mostrarMarcas`, con
   fecha de retiro del flag (Artículo XII)?
7. ¿Qué comercio es el piloto con la categoría Networking para medir el índice y
   validar los criterios?
8. ¿Los hallazgos del feed y la marca del JSON-LD van en este cambio o en uno aparte?
