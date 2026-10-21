# Traer la tienda desde Shopify, WooCommerce o Wix

> **Ampliación D-518 (21-oct): NUEVA, pendiente de aprobación.** El ticket se reabrió el 20-oct y Daniel aprobó las decisiones F5-30·1 a F5-30·9 de D-518. Esta propuesta las aplica en la sección «Ampliación D-518» del final y en estos documentos nuevos: `design-ampliacion.md`, `design-ampliacion-ficha.md`, `design-woocommerce.md`, `design-fotos.md`, `design-ampliacion-plan-existencias.md` y `contracts/import-store-api-d518.md`; cuatro specs nuevas (`store-migration-catalog-fidelity`, `store-migration-photos`, `store-migration-woocommerce` y `store-migration-plan-stock`); los requisitos marcados «→ D-518» en las specs existentes, y la sección 14 de `tasks.md`. Lo aprobado el 18-oct y lo desplegado apagado (backend 97f634a4, front 3cefd2d5) no cambian, salvo donde se marca «→ D-518».

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
   - WooCommerce: `/product/<slug>` y `/product-category/<slug>`, con los enlaces permanentes por defecto. → D-518: con la base de la tienda, que en español es `/producto/` y `/categoria-producto/` (`design-woocommerce.md` W3).
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
- → D-518 (pendiente de aprobación):
  - `store-migration-catalog-fidelity`: formato actual de Shopify, IVA por producto, oferta antes/ahora, partición, «Nuevo», texto alternativo, SEO, descripción limpia y canal web.
  - `store-migration-photos`: copia de las fotos al almacenamiento de Katuq.
  - `store-migration-woocommerce`: el CSV de Woo con variantes, la guarda de la integración activa, las direcciones probables y los clientes de Woo.
  - `store-migration-plan-stock`: plan gratis, productos sin control de existencias y tallas de un producto importado.

### Modified Capabilities
_(ninguna archivada: el importador y las redirecciones viven en D-148, D-214 y D-479)_

## No-goals

- API en vivo de Wix, Shopify o WooCommerce en esta etapa: solo archivos. El CSV de Wix va en una segunda etapa, después de ver un archivo real; sus fotos no vendrían como enlace completo, según la documentación pública.
- Páginas básicas: el export CSV de Shopify no las trae y WooCommerce las da en XML de WordPress. Van en otra etapa.
- Un modelo nuevo de variante, stock por variante en `inventory` o precio por variante. D-214 los prohíbe: cada uno requiere su propia propuesta.
- ~~Copiar las fotos a Storage. Es la fase 2 de `importar-productos-con-fotos`.~~ → D-518 F5-30·2: entra en esta entrega con la pieza de TX-37 (`design-fotos.md`).
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

> Contestadas el 18-oct con los valores por defecto 1 a 21 de `design.md` (CONTRACT, D-495 a D-503). D-518 ratifica la 1 (F5-30·7) y la 8 (F5-30·1), y cambia las fotos (F5-30·2). Las preguntas nuevas están en «Ampliación D-518».

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


## Ampliación D-518 (21-oct): NUEVA, pendiente de aprobación

### Por qué

El cierre del 20-oct fue un error: el ticket no estaba completo. Al releerlo desde la fuente (descripción, 4 notas, tickets relacionados, contrato y código) aparecieron dos tipos de problemas.

**Lo que el ticket pide y la propuesta recortaba:**
- fotos que dependen de la tienda que se cierra;
- ofertas que se perdían, o que salían más caras en Katuq;
- un solo IVA para todo el catálogo;
- todo lo migrado marcado «Nuevo»;
- el SEO y el texto alternativo sin importar.

**Un hallazgo sin decisión:** el lector de Shopify usa los nombres de columna viejos. Con la plantilla oficial actual (verificada el 21-oct), los 3 productos salen inválidos. El criterio de los 500 productos no se podía cumplir. Se corrige (A1).

### Decisiones de D-518 que se aplican

| Código | Decisión | Dónde |
|---|---|---|
| F5-30·1 | Shopify por CSV, clientes y WooCommerce por CSV. Wix y páginas, cuando un comercio traiga un export real. La API queda fuera | Esta sección; `design-ampliacion.md` (alcance) |
| F5-30·2 | Copiar las fotos a Storage con la pieza de la fase 1b de TX-37 | `design-fotos.md`; spec `store-migration-photos` |
| F5-30·3 | Campo opcional de título y descripción SEO por producto | `design-ampliacion-ficha.md` N3 |
| F5-30·4 | Precio regular como base y la oferta como antes/ahora en la lista Público, con una excepción acotada | `design-ampliacion.md` A3 |
| F5-30·5 | Exentos al 0 % según «Charge tax» / «Tax status»; los gravados, con la tarifa elegida | `design-ampliacion.md` A2 |
| F5-30·6 | Nada sale «Nuevo»; cada foto con su texto alternativo de Shopify | `design-ampliacion-ficha.md` N1 y N2 |
| F5-30·7 | Se mantiene partir por precio; se corrige la resolución de F2-16 | `design-ampliacion.md` A4; tarea 14.18 |
| F5-30·8 | El CSV de Woo usa variantes; con la integración Woo activa no se importa hasta que WP-INT 5 decida | `design-woocommerce.md` |
| F5-30·9 | Limpiar el HTML al importar; tope de 20 simulaciones cada 15 minutos | `design-ampliacion-ficha.md` N4 y N5 |

También entra el arreglo «choque de categorías de D-498» del orden de trabajo de D-518: el importador lee el mismo documento de categorías que edita Maestros (`design-ampliacion.md` A5). Ese choque solo existe con `categoryAttributes` encendida, que hoy está apagada en todas las empresas.

**Lo que agregó la revisión del 21-oct**, verificado en el código y en la documentación oficial; no son decisiones de D-518. Lo que cambia el comportamiento va como pregunta (2, 4, 8, 13 y 15 a 19); lo demás es arreglo de diseño:
- plan gratis: 50 productos visibles y sin dominio propio (`design-ampliacion-plan-existencias.md` E1);
- productos sin control de existencias, que entrarían agotados (E2);
- la ficha de un producto migrado sin `variantes[].cantidad`, requisito de 13.2 (E3);
- si los precios del archivo incluyen IVA, y la clase «tarifa cero» de Woo (`design-ampliacion.md` A2);
- la base de las direcciones de Woo en español y los encabezados traducidos (`design-woocommerce.md` W2 y W3);
- los clientes de WooCommerce (W5).

### Qué cambia respecto de lo aprobado

- **Lector de Shopify:** acepta los encabezados actuales y los anteriores. Lee impuesto, comparación, alt, SEO, «Published on online store» y el control de existencias.
- **`precio`:** usa la tarifa de cada producto (y la de su clase en Woo). El comercio dice si los precios de su archivo incluyen IVA.
- **Ofertas:** se escribe **una** fila de `preciosPorTipoCliente`, la del tipo Público de la empresa, por el mismo `katuq-product-upsert`. Es la única excepción a «nunca listas de precios», y su prueba de write-set la vigila.
- **Campos nuevos o distintos en `products`:** `seo`, `crearProducto.imagenesPrincipales[].alt`, `metadata.migration.originCreatedAt`, `exposicion.nuevo: false` y `disponibilidad.inventariable: false` en los productos sin control de existencias.
- **Rutas nuevas:** `POST import-store/photos`, que copia las fotos de lo migrado a `Productos/copias/<companyDocId>/…`, y `GET import-store/photos/pending`, que dice qué fotos faltan.
- **Tienda:** «Nuevo» (con una sola regla, `fechaDeNovedad`), alt y SEO de la ficha; si se aprueban, el orden del cupo del plan gratis y las tallas de un producto migrado. No cambia ningún cálculo de precio, pero el archivo está en el camino del cobro y va con diff aprobado.
- **Simulación:** guarda nueva `WOO_INTEGRATION_ACTIVE`, aviso `PLAN_LIMIT`, tope de frecuencia y los conteos nuevos.
- **WooCommerce:** lector con variantes, encabezados en español, unión de variaciones por SKU del padre, clases de impuesto, redirecciones «probables» con la base de la tienda y clientes sin autorización.

### Orden de aprobación

- **14.0a, ya:** A1 (lector de Shopify con el formato actual) y A5 (árbol de categorías). Son los arreglos sin diseño nuevo del orden de trabajo 3 de D-518 y no esperan las preguntas. A5 sigue con diff aprobado.
- **14.0, después:** el resto de la ampliación, con las preguntas de abajo.

### Write-set (además del aprobado)

- **`products`:** lo de arriba, por el upsert sin modificarlo, y las fotos copiadas, por la ruta `photos`.
- **Storage:** solo archivos nuevos en la carpeta de copias de la empresa.
- **Solo lectura:** `tiposPrecios` (`active == true`), `integration_configs` (nunca los secretos), la marca de la empresa (plan) y `migration_audit` de la empresa (`photos/pending`).
- **Inventario:** `inventory` e `inventoryMovement` siguen solo por `importInventory` (6.2), sin cambiar el módulo ni sus pruebas. Lo que sí cambia es qué productos y qué cantidades le entrega el lote: los alias del CSV de inventario, el `Stock` de Woo y los productos sin control, que no reciben nada. Por eso 6.2 sigue con diff aprobado y con una caracterización previa del mapeo (14.21a).
- La ampliación no toca pedidos, pagos, reserva, consecutivos ni auth.

**Nunca:** `InventoryLevel`, Shopify, WooCommerce, Osmosis, `tiposPrecios`, otras listas de precios, flows ni pedidos.

### No-goals de la ampliación

- Wix y las páginas básicas: siguen en este ticket hasta que un comercio traiga un export real (F5-30·1).
- La API de Shopify o Woo.
- Unificar `importAllProducts` y el mapper de variantes de Woo: es de WP-INT 5.
- Precio por variante y existencias por variante (D-214).
- Atributos técnicos a `products.attributes` (pregunta 12).
- Permisos de SMS y WhatsApp de los clientes (pregunta 10).
- Recomprimir o uniformar las fotos copiadas: eso es TX-37.

### Riesgos nuevos

- **Precio distinto entre la tienda y la venta asistida** para un producto en oferta. En Shopify depende de qué precio sea el regular (pregunta 2).
- **Precios cargados sin IVA en la tienda anterior:** si el comercio responde mal la pregunta de la simulación, todo lo gravado queda mal (pregunta 17).
- **Plan gratis:** lo importado puede quedar oculto en su mayoría, y las redirecciones no sirven sin dominio propio (pregunta 15).
- **Dependencia de `photoCopy` (TX-37 8.1)** y de su revisión privada.
- **Tiempo de la copia de fotos:** estimado de 10 a 17 minutos para 4.000 fotos; se mide en 12.3.
- **`esNuevo`, el cupo del plan gratis y las tallas de la ficha:** cambian en archivos de la tienda que usa el checkout. TX-34 debe traer los campos de la regla en su proyección (14.18).
- **Cambio de `leerArbol`:** cambia `importProducts` solo con `categoryAttributes` encendida (hoy apagada).
- **Fecha de origen:** ningún CSV verificado la trae (N1).
- **Seguridad:** descargas, textos que llegan a la página y a sus metadatos, la fila de la lista Público, los topes y la ruta de lectura. **Ver revisión privada** (`wt-back-tickets-web/openspec/changes/importador-migracion-tiendas-seguridad/`).

### Preguntas para Daniel (con mi recomendación)

1. **Oferta sin tipo de cliente Público:** ¿el importador crea el tipo, o se avisa? **Recomiendo** que la simulación lo avise y ofrezca un botón «Crear lista Público» que use la pantalla de Tipos de Cliente que ya existe (`/v1/tipos-precios/create`), con el clic del comercio. Así el importador no escribe `tiposPrecios` y la excepción queda en la fila del producto.
2. **Qué precio de Shopify es el «regular» y qué cobra la venta asistida** (`design-ampliacion.md` A3). La tienda en línea muestra y cobra lo mismo con las dos lecturas; cambia el precio base, que es lo que cobran la venta asistida y el POS a un cliente sin lista:
   - **A, literal:** regular = `Compare-at price`. En la plantilla, la camiseta queda en 24,99 y el POS cobra 24,99, aunque en Shopify se vendía a 19,99. En Shopify el «antes» no vence y muchas tiendas lo dejan fijo.
   - **B:** regular = `Price`, y la fila Público lleva `Compare-at price` como «antes» y `Price` como «ahora». El POS cobra 19,99.
   - **Recomiendo B** para Shopify, y para WooCommerce el `Regular price` como base (su oferta tiene fechas: el POS cobra el regular mientras dure, como en D-219). La simulación cuenta los productos afectados.
3. **Oferta de Woo con fecha de inicio futura:** Katuq no tiene fecha de inicio de oferta. **Recomiendo** no cargarla y reportarla (`OFFER_SCHEDULED`).
4. **`Tax class` de Woo:** **recomiendo** `zero-rate` («Tarifa cero») al 0 %, como un exento; las demás clases se asignan en la simulación (0, 5 o 19 %), y sin esa asignación esos productos no se importan (`TAX_CLASS_UNMAPPED`). Usar la tarifa elegida para todo repetiría el error del #1020.
5. **Fecha de origen:** ni Shopify ni Woo la traen en el CSV. **Recomiendo** que un migrado sin fecha nunca sea «Nuevo», y que el orden por novedad de TX-34 use la misma función (`fechaDeNovedad`).
6. **SEO en el formulario de producto:** **recomiendo** agregar en esta entrega los dos campos opcionales «Título para Google» y «Descripción para Google». Sin ellos, el comercio no ve ni corrige lo importado. F5-30·3 no los pide: la spec los deja sujetos a esta respuesta.
7. **Copia de fotos:** **recomiendo** lotes de 10 productos y 4 descargas a la vez por petición. Se sube solo si la medición de FLORECER no da la hora.
8. **Rutas nuevas `POST import-store/photos` y `GET import-store/photos/pending`** (`openspec/config.yaml` pide tu aprobación). **Recomiendo aprobar las dos.** Meter la copia en `products` haría lotes demasiado largos, y sin la lectura el comercio no puede terminar la copia otro día.
9. **CSV de inventario de Shopify con las ubicaciones como columnas** (export «Available»): **recomiendo** rechazarlo con un mensaje que pida el export por estados, hasta ver un export real (0.4).
10. **Permisos de SMS y WhatsApp del CSV de clientes:** **recomiendo** no importarlos y solo contarlos, hasta que [CONV] E (#1305) defina el registro por contacto.
11. **Llave del cliente:** **recomiendo** celular normalizado y después correo, y avisar a Mónica para que WP-INT 3 (#1288) use la misma.
12. **Atributos que no son variantes** (metafields de Shopify, atributos de Woo que no definen variaciones): **recomiendo** solo reportarlos ahora y cargarlos a `products.attributes` (D-495) en otra propuesta, cuando `categoryAttributes` esté encendida.
13. **Modo actualizar y ofertas:** si el producto ya tiene fila Público, **recomiendo** no tocarla (`OFFER_KEPT`) y decir en el reporte que el precio actualizado no se verá en la tienda en línea (`PRICE_SHADOWED_BY_PUBLIC_LIST`).
14. **Productos agrupados y externos de Woo:** **recomiendo** omitirlos con motivo.
15. **Plan gratis** (50 productos visibles, sin dominio propio): ¿se bloquea la importación o se avisa? **Recomiendo** avisar con el conteo (`PLAN_LIMIT`), no bloquear, ordenar el cupo con `fechaDeNovedad` para que lo migrado no saque de la tienda lo que el comercio ya vendía, y no generar 301 hacia productos ocultos.
16. **Productos sin control de existencias** (Shopify con `Inventory tracker` vacío o `CONTINUE`; Woo sin `Stock`): **recomiendo** importarlos como no inventariables y sin existencias (`NOT_TRACKED`). Si no, 2 de los 3 productos de la plantilla entran agotados.
17. **¿Los precios del archivo incluyen IVA?** **Recomiendo** una respuesta obligatoria en la simulación cuando hay gravados, con un ejemplo de un producto del archivo. En WooCommerce, cargar los precios sin impuesto es el valor de fábrica.
18. **Ficha sin `variantes[].cantidad`** (requisito de 13.2; sin él no se enciende en ningún comercio real y no hay ticket «b»): **recomiendo** hacerlo en esta entrega (E3): en un producto migrado sin integración, cada talla sigue la disponibilidad del producto. Se acepta que la tienda ofrezca una talla sin unidades, cosa que ya pasa hoy con la foto inicial. La alternativa es quitar el requisito de 13.2 y aceptar que una talla que llegó en 0 quede agotada para siempre.
19. **Clientes de WooCommerce:** el informe de clientes de Analytics se exporta en CSV con teléfono y correo, pero sin consentimiento. **Recomiendo** importarlos en la fase 1b con la misma lógica, sin crear nunca una autorización de correo.

### Decisión

D-498 queda ampliada por D-518 (F5-30·1 a F5-30·9). A1 y A5 esperan la aprobación de la tarea 14.0a; el resto, la de la tarea 14.0. No se implementa nada de la sección 14 de `tasks.md` antes de su aprobación.


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
