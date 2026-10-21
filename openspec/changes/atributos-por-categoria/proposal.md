# Atributos técnicos por categoría: ficha, filtros, comparador y SEO

## Why

Ticket 1234 (F2-42): un comercio con catálogo técnico necesita atributos propios
de cada categoría (tecnología WiFi, velocidad, puertos…) para filtrar la tienda y
mostrar la ficha técnica sin escribirla a mano. Criterios de aceptación:
«En la categoría Networking de Baudio se puede filtrar por marca, precio, tecnología WiFi y
velocidad, con conteos correctos» y «La ficha muestra la tabla de
especificaciones sin que el comercio la escriba a mano».
*(Cita corregida el 2026-10-21: el texto aprobado omitía «de Baudio». FLORECER es solo el
piloto; el criterio 1 se acepta con los datos de Baudio, tarea 9.12.)*

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
- **Hallazgos aparte, por verificar con datos** (corregidos en 5cbbe72f el 18-oct; queda `g:product_type`, que va en la ampliación):
  - Las entradas del índice no tienen `identificacion` ni `descripcionCorta`, y
    guardan `marca`, `descripcion` y `categoriasIndex` en minúscula. Por eso
    `feedProductos` nunca envía `g:mpn`, marca como `identifier_exists=no` lo que
    no tiene un GTIN válido y manda marca, descripción y `product_type` en minúscula.
  - `productoParaFicha` lee `p.marca` en la raíz, pero los escritores guardan
    `identificacion.marca`: la marca del JSON-LD probablemente cae al nombre del comercio.

## Preguntas para Daniel (respondidas el 2026-10-18: ver `design.md`, Open Questions; la ampliación de abajo trae las nuevas)

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

---

# Ampliación del 2026-10-21 — F2 a F5 y hallazgos (PENDIENTE DE APROBACIÓN)

> Todo lo de arriba está aprobado (D-495, 18-oct) y F0 y F1 están hechas. Lo que sigue es
> nuevo y **no está aprobado**. Aplica las decisiones F2-42·1 a F2-42·8 de D-518 (aprobadas
> por Daniel el 21-oct), que no se vuelven a preguntar.

## Por qué se amplía

- El ticket 1234 (F2-42, cd `E4M12SqXLlyFBNHbflf8`) se cerró el 20-oct remitiendo a un «F2-42b»
  que no existe y se reabrió el 21-oct (comentario 4). D-518 T·1: lo pendiente sigue en este
  mismo ticket.
- La tarea 6 de `tasks.md` dejaba F2 a F5 para sub-cambios que nunca se crearon. Esta
  ampliación los diseña aquí, en el mismo cambio, y reemplaza esa tarea.
- Faltan, según el comentario 4: encender en FLORECER (5.3), filtros con conteos correctos,
  carga por Excel, comparador y atributos en los catálogos de Google y Meta.

## Hoy, en el código (leído el 2026-10-21)

Backend `wt-back-tickets-web/functions` (rama `feature/tickets-web`, HEAD 097ede2e; los números
de línea son de HEAD, porque el árbol tiene cambios de otra sesión). Front `wt-front-tickets-web/src`.

**Catálogo de la tienda (`consultarCatalogo`, `controllers/sites.js:8831`)**
- Categorías, marcas y rango de precio se calculan ANTES de filtrar (`:8876-8911`). Dentro de
  «Networking», las marcas y el rango son los de toda la tienda.
- Cortes: categorías a 24 (`:8886`), marcas a 40 (`conteoDeMarcas`, `:8977`) y 30 en el panel
  (`utils/siteHtml.js:2423`). La página `/marca/<nombre>` se resuelve sobre la lista ya cortada
  (`:8891-8895`): una marca que no esté entre las 40 primeras da 404 (`:6830`). El bloque de
  marcas (`marcasDeTienda`, `:8997`) usa el mismo `conteoDeMarcas` y también corta en 40.
- La categoría se compara exacta contra la etiqueta (`:8924`): «Networking» no trae «Networking > Routers».
- Cada filtro es un valor único (`estado.marca`, `estado.categoria`); no hay «Limpiar todo».
- El script solo repinta la rejilla (`pintar`, `siteHtml.js:4734`): los conteos del panel
  nunca cambian después de filtrar, y los filtros no se escriben en la dirección.
- La búsqueda `q` mira título y referencia (`:8932`).
- Con sesión de cliente mayorista, la página trae los precios de su lista, pero el filtro, el
  rango y el orden siguen con el precio público (`:9051`). `cargarVitrinaDeEmpresa`
  (`:8332`) ya lee `preciosPorTipoCliente` de todos los productos y solo guarda el público.
- El directorio Kuvo también llama `consultarCatalogo` (`catalogFor`).
- Además del filtrado, cada consulta de `catalogoPublico` (`:9033`) lee los 12 documentos de la
  página (`leerProductos`), las calificaciones (`conCalificaciones`) y lo visible del plan
  (`productosVisiblesDelPlan`); con sesión lee el cliente (`clienteDeAcceso`, `:2001`) y vuelve
  a leer los 12 documentos para su precio (`:9069-9086`).

**Índice (`getSearchIndex`, `controllers/productos.js:91`)**: no trae `attributes`. Trae
`categorias` (crudo) y `exposicion`, con lo que la ruta del producto se puede resolver en memoria
con `rutaDelProducto` (`services/catalogo/atributosCategoria.js:327`) y el índice de rutas del
registro `getCatalogSchemas` (`productos.js:233`). Ninguna lectura nueva. Se recarga cada 5 min
y cada vez que se invalida: Osmosis, Shopify y WooCommerce lo invalidan en cada sincronización
(`osmosisProductSyncService.js:171` y `:231`, `shopify/processors/products.js:83`,
`woocommerce/webhookWorker.js:209`). `importProducts` (`onboarding.js:2874`) NO lo invalida.

**Propuesta de TX-34 en paralelo (`tienda-celular-y-velocidad`, pendiente):** su D1
(`design.md:86-108`) crea una lectura propia de la tienda (`services/sites/indiceTienda.js`)
que reemplaza `preciosVitrinaCache` y `ofertasVitrinaCache`, saca a la tienda de
`getSearchIndex` y ya trae `preciosPorTipoCliente` y, con la bandera, `attributes`. Su P18
(`proposal.md:275-279`) pide que F2-42 no amplíe el índice compartido. Esta ampliación se
escribe sobre «la fuente de la tienda» para servir con cualquiera de las dos (pregunta 11).

**Comparador**: no existe. `productosPorIds` (`sites.js:5415`, hasta 30 ids) filtra por
empresa, plan, activo, canal web y categoría oculta, pero su candado es más débil que el del
catálogo (`esPublicableEnTienda`, `:8691`, y `catalogoPublico`, `:9043-9048`): no basta como
base del comparador. Ver revisión privada.

**Plantilla**: `import-modal.component.ts` arma «Plantilla» e «Instrucciones» y una hoja aparte
opcional, «Precios por volumen» (`:2781-2890`), que se lee por su cuenta (`:1239`). El export
de Productos advierte que reimportar un export parcial pisa los campos ausentes con valores por
defecto (`productos.component.ts:215-240`) y trae los documentos completos página por página
(`fetchAllProductosParaExport`, `:1652`; el servidor los hidrata con `db.getAll`,
`productos.js:1551`), así que ya tiene `attributes` en memoria. `importProducts` no escribe
`attributes`. Ninguna prueba caracteriza hoy la plantilla del importador ni el export.

**Feed (`feedProductos`, `sites.js:1739`)**: ya lee los documentos completos (`:1856`), así que
`attributes` está a mano sin leer más. `g:product_type` es `categoriasIndex[0]`, la etiqueta
de la hoja en minúscula (`:1891`). No hay `g:product_detail`. Responde con
`public, max-age=1800` (`:1899`): un cambio tarda hasta 30 min más en verse.

**Árbol de categorías, quién toma el primer documento** (importa solo en las 4 empresas con
varios documentos y con la bandera encendida, porque ahí Maestros edita el de D2):
- `categoryAssignment.leerArbol` (D-498): `limit(1)` (`categoryAssignment.js:103`) y
  `guardarArbol` hace `update` sin transacción (`:164`). D-498 ya planea corregir la lectura
  (`importador-migracion-tiendas/design-ampliacion.md:116-119`, tarea 14.14).
- «Importar categorías» de Maestros (`importCategories`): lee con `limit(1)`
  (`onboarding.js:3710`) y escribe con `update` (`:4241`).
- Osmosis (`_ensureCategoriasEnMaestro`): `limit(1)` (`osmosisProductSyncService.js:774`).
- Solo lectura: `checkCategoriesExist` (`onboarding.js:1952`), `tiendaEnUnPaso.loadCategories`
  (`services/sites/tiendaEnUnPaso.js:220`) y `fichaDesdeFoto` (`services/ai/fichaDesdeFoto.js:435`).

**JSON-LD**: `additionalProperty` con `PropertyValue` ya sale en F1, con la bandera
(`siteHtml.js:5415`).

## Qué cambia (nuevo)

1. **Facetas (F2; D-518 F2-42·3, ·4, ·7).** Con `categoryAttributes`:
   - conteos DESPUÉS de filtrar, cada faceta sin aplicarse a sí misma; O dentro de una faceta, Y entre facetas;
   - la categoría incluye sus subcategorías; el rango de precio sale de lo filtrado;
   - selección múltiple, chips de filtros activos, «Limpiar todo» y filtros en la dirección;
   - sin los cortes de 24 y 40;
   - en la categoría, en los resultados de búsqueda y en `/marca/<nombre>`;
   - atributos marcados «usar como filtro», además de categoría, marca, precio, oferta y ocasión;
   - la faceta de marca sigue el interruptor que ya existe (`mostrarMarcas`).
2. **Precio con sesión mayorista (F2-42·4):** faceta, rango, orden y comparador usan el precio
   que ve el cliente, sin leer más productos.
3. **Plantilla por categoría (F3):** hoja aparte «Especificaciones» en la plantilla y en el
   export, con una columna por atributo. Reimportarla cambia solo los atributos, por la misma
   escritura aprobada en F1 (3.3), sin pasar por `importProducts`. El export arma la hoja con los
   documentos que ya trae; no hace falta una ruta nueva de lectura.
4. **Comparador de hasta 4 (F4):** desde la tarjeta y la ficha, sin interruptor propio (F2-42·7),
   con el mismo candado que el catálogo de la tienda (ver revisión privada).
5. **Feed y JSON-LD (F5; F2-42·6):** `g:product_detail` según la documentación de Google;
   `g:product_type` con la ruta completa, que es lo que lee Meta; JSON-LD validado con el
   Schema Markup Validator.
6. **Velocidad (F2-42·5):** el catálogo con facetas responde en 1 s o menos en caliente con los
   8.568 productos de OH MY STORE, medido de punta a punta (`catalogoPublico`, no solo el motor),
   más la meta de página de TX-34.
7. **Accesibilidad (TX-35, #1250):** panel de facetas, pestañas y comparador sin fallas de axe,
   con teclado y foco visible, como las páginas que TX-35 ya auditó.
8. **Plantilla «Tecnología — Catálogo grande» de TX-36 (#1257, cd `Am2CZ98bvTePFdx6KYRL`):**
   `tecnologia-catalogo` (`data/siteTemplates.js:1141`, catálogo con `mostrarMarcas: true`, detrás
   de `techCatalogTemplate`) depende de F2-42 para los filtros técnicos y la ficha. El panel y el
   comparador se revisan también con esa plantilla (9.7, 11.3, 9.12).
9. **Hallazgos que se resuelven antes de encender** (detalle en `design.md`, H1 a H6). H1, H2 y
   H3 son del paso 3 del orden de D-518 (arreglos sin diseño nuevo): no esperan la aprobación de
   esta ampliación, cada uno con su diff aprobado.
   - H1: la bandera de la tienda exige un solo documento de empresa con ese `nomComercial`.
     Revisar FLORECER y Baudio Corporation Colombia SAS antes de encender.
   - H2: varios lectores y escritores del árbol toman el primer documento de `categorias`; en las
     4 empresas con varios documentos y la bandera encendida no sería el que edita Maestros. El
     de `leerArbol` ya es de D-498 (14.14); aquí va el inventario completo y la revisión de esas
     4 empresas.
   - H3: desde el diff 3.2, guardar el árbol en Maestros responde 500 **cuando falla** (antes
     respondía «guardado» y perdía el árbol en silencio). Ninguna fuente nombra una empresa ni un
     fallo observado: primero se consulta el registro para saber si ha pasado.
   - H4: la tarea 0.7 quedó parcial (ver revisión privada).
   - H5: `/marca/<nombre>` da 404 para marcas fuera de las 40 primeras, y el bloque de marcas
     también corta en 40.
   - H6: documentos desalineados (5.1 y 5.2 sin marcar; «F2-42b» inexistente; versión del front).

## Write-set (módulos sensibles)

- F2, F4 y F5: **solo lectura**. No escriben nada.
- F3: el mismo write-set aprobado en F1: `products.attributes.<clave>`, `attributesEditedAt`,
  `attributesEditedBy`. Sin `syncProduct`, sin `date_edit`, sin pasar por `importProducts`. Para
  resolver cada referencia, el lote LEE `products` de la empresa del token (referencia, categoría
  y atributos), no el índice en memoria.
- H2 y H3: `categorias.categoria` (a qué documento se escribe) y el manejo del error. Maestro
  de categorías: diff aprobado uno a uno, con prueba de caracterización antes.
- Nunca: precios, listas de precios, variantes, `integrations`, inventario, pedidos, pagos,
  reserva, consecutivos ni flows de Shopify (D-134). La faceta mayorista LEE las listas de precios.
- Toca auth: la ruta nueva de F3 (el lote) va con la cadena de F1 (sesión de usuario, empresa del
  token, bandera). Diff aprobado.

## No-goals de la ampliación

- Filtro de disponibilidad (F2-42·1) y de valoración (F2-42·2). Se anota en el ticket (8.6).
- Buscar dentro de los atributos y la búsqueda tolerante a errores: TX-34 (F2-42·8, TX-34·8).
- Leer menos campos en frío y el resumen por empresa: TX-34 (TX-34·7).
- Compatibilidad como vínculo entre productos (accesorios): sigue siendo una sección de atributos.
- Traer atributos de Shopify, WooCommerce o Wix (F5-30), asesor KAI con atributos (F4-27) y
  registro de filtros usados (F3-25).
- Que `importProducts` invalide el índice al terminar (hoy no lo hace): es un bug aparte; F3 no
  depende de él porque el lote lee Firestore.

## Capabilities (ampliación)

- Nuevas: `tienda-facetas` (F2), `tienda-comparador` (F4), `catalogo-plantilla-atributos` (F3),
  `catalogo-feed-atributos` (F5).
- Modificadas dentro de este cambio: `tienda-facetas-comparador` (los requisitos de F2, F4 y F5
  pasan a las specs nuevas; se reescribe el de JSON-LD; el plazo de apagado del feed y la lectura
  del comparador se declaran) y `catalogo-atributos-categoria` (la plantilla pasa a su spec y se
  suma el requisito del maestro de H2 y H3).

## Riesgos de la ampliación

- **Velocidad:** las facetas recorren todo lo vendible en cada consulta, en el mismo proceso que
  atiende pedidos. Se cuentan en una sola pasada; se mide la respuesta de punta a punta en
  caliente y el costo extra de cada recarga del índice, con regla de parada (design E12).
- **Recargas frecuentes del índice:** en comercios con Osmosis, Shopify o WooCommerce cada
  sincronización invalida el índice, y cada recarga recalcula los derivados de todos los
  productos encima de los 1,5 a 7,6 s en frío que ya midió TX-34. Se mide la frecuencia real.
- **Una sola fuente para la tienda (choque con TX-34, P18):** TX-34 propone sacar a la tienda
  del índice compartido y reemplazar el mapa de precios de vitrina. Si las dos propuestas se
  implementan sin decidir, la página tendría dos fuentes. Se decide antes de 9.4 y 9.5
  (pregunta 11).
- **Datos en memoria nuevos:** los derivados por producto (E2) y los precios por tipo de cliente
  (E5) son datos guardados en memoria. No agregan TTL ni lecturas, pero rozan la regla «sin
  capas de cache nuevas» (`openspec/config.yaml`; D-518 TX-34·7): necesitan aprobación
  (pregunta 3) y se mide su memoria.
- **Dirección con filtros:** muchas combinaciones de filtros son muchas direcciones. Llevan
  `noindex` y canónica a la categoría (design E8).
- **Meta:** no documenta `product_detail`. Solo se garantiza `product_type`; Daniel revisa el
  catálogo de Meta sin errores nuevos (6.4 de antes, 12.5 ahora).
- **Apagado del feed:** el feed se guarda 30 min en cachés intermedias; al apagar la función tarda
  hasta 35 min en volver al de hoy, no 12 (pregunta 14).
- **OH MY STORE:** Cereza reescribe la marca y casi todas sus categorías son de un nivel; la
  bandera no se enciende allí con esta ampliación. Solo se mide con sus datos, en solo lectura.
- **Baudio:** el criterio 1 depende de que su catálogo y su categoría Networking estén en Katuq
  (pregunta 8) y de encender `mostrarMarcas` en su sitio.
- **Seguridad:** rutas públicas nuevas y precios con sesión. Ver revisión privada.

## Preguntas para Daniel (ampliación)

1. **`/marca/<nombre>` y el bloque de marcas con más de 40 marcas (H5).** Hoy la página da 404 y
   el bloque de marcas (`marcasDeTienda`) corta en 40, en todas las tiendas, con o sin la bandera.
   *Recomiendo* corregir los dos para todas, como arreglo de D-472, en un diff aparte.
2. **Celda vacía al reimportar la hoja «Especificaciones».** *Recomiendo* que vacía signifique
   «no cambiar» y que `(borrar)` borre el valor: así un export parcial no borra nada.
3. **Datos en memoria (E2 y E5).** Los derivados por producto (ruta y atributos normalizados) y
   los precios por tipo de cliente se guardan en memoria, atados a la fuente de la tienda, con su
   misma vida e invalidación, sin TTL nuevo ni lecturas nuevas. Rozan la regla «sin capas de cache
   nuevas». *Recomiendo* aprobarlos con un tope medido: la tarea 9.9 mide su memoria (productos ×
   tipos de cliente) en OH MY STORE y para si pasa de 20 MB por empresa. La alternativa,
   recalcular en cada consulta, pone en riesgo la meta de 1 s.
4. **Facetas de atributos sin categoría elegida** (búsqueda, `/marca`). *Recomiendo* mostrar los
   atributos de la categoría común más profunda de los resultados; si no hay una, solo
   categoría, marca, precio, oferta y ocasión.
5. **Precio mayorista en el orden con la bandera apagada.** D-518 F2-42·4 lo pide; CA13 exige
   que sin la bandera todo quede igual. *Recomiendo* aplicarlo solo con la bandera y para todos
   al retirarla (7.1).
6. **Comparar productos de categorías distintas.** *Recomiendo* permitirlo, con la unión de los
   atributos y «—» donde no aplica.
7. **Números como lista o como rango.** *Recomiendo* lista con conteo si hay 12 valores
   distintos o menos (como «Velocidad»); si hay más, rango mínimo–máximo.
8. **Criterio 1 con los datos reales de Baudio.** El ticket dice «Networking de Baudio» y D-518 no
   lo resolvió. ¿Baudio ya tiene su catálogo y su categoría Networking en Katuq, y quién carga sus
   atributos? *Recomiendo* piloto en FLORECER (5.3 y 9.12) y aceptación con los datos de Baudio,
   cada paso con tu OK y después de H1.
9. **Si H3 resulta ser el tamaño del documento** (fotos de categoría guardadas dentro del árbol),
   ¿se arregla aquí? *Recomiendo* consultar primero el registro (8.3) y, si hay fallos y son por
   eso, un cambio aparte para subir las fotos al almacenamiento.
10. **Etiquetas que no van a `product_detail`.** Google prohíbe repetir lo que va en otros
    atributos (marca, precio, envío, GTIN, referencia). *Recomiendo* omitir los atributos con
    esas etiquetas y avisarlo en Maestros.
11. **Una sola fuente para la tienda (P18 de TX-34).** ¿Las facetas y el precio mayorista leen de
    la proyección de tienda que propone TX-34 (D1) o del índice compartido? *Recomiendo* la
    proyección, si la apruebas: ya trae `attributes` y `preciosPorTipoCliente`, no engorda el
    índice del Seller, el feed y KAI, y evita dos fuentes en la misma página. Orden de unión:
    el motor y sus pruebas de F2-42 (9.2, 9.3) primero, porque no dependen de la fuente; luego
    TX-34 D1; luego 9.4 a 9.6 sobre ella. Si no la apruebas, E2 y E5 van sobre el índice
    compartido y el mapa de precios, como están escritos.
12. **H2: las 4 empresas con varios documentos de `categorias`.** *Recomiendo* revisar primero, en
    solo lectura, si en cada una el primer documento (el que leen `importCategories`, Osmosis,
    Tienda en un paso y la ficha desde foto) es el mismo que elige D2. Si lo es, no hace falta
    tocar esos lectores: basta 14.14 de D-498. Si no lo es, unificar los documentos con un script
    `--dry-run` antes de encender la bandera en esa empresa, en lugar de cambiar cinco lectores.
13. **`guardarArbol` de D-498 sin transacción.** Lee el árbol al empezar la importación y lo
    reescribe al final con `update`: un renombre hecho en Maestros en ese intervalo se pierde.
    *Recomiendo* que 14.14 de D-498 lo haga en una transacción que vuelve a leer el árbol y solo
    agrega las categorías creadas. Si no, queda como riesgo declarado.
14. **Plazo de apagado del feed.** El requisito aprobado dice 12 min para todo, pero el feed se
    guarda 30 min (`max-age=1800`). *Recomiendo* declarar 35 min para el feed (Google y Meta lo
    leen una vez al día) y no tocar su caché.


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
