# Ampliación D-518: formato actual de Shopify, IVA, ofertas y partición

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Aplica las decisiones aprobadas F5-30·1, ·4, ·5 y ·7 de D-518 (21-oct) y corrige el hallazgo sin decisión del lector de Shopify. Lo aprobado el 18-oct (`design.md`, `design-escritura.md`, `design-clientes.md`) sigue vigente salvo donde aquí se dice «→ D-518». Complementos: `design-ampliacion-ficha.md` (·3, ·6 y ·9), `design-woocommerce.md` (·8), `design-fotos.md` (·2) y `design-ampliacion-plan-existencias.md` (plan gratis, productos sin control de existencias y ficha de 13.2). Código leído el 2026-10-21 en `wt-back-tickets-web/functions` (rama `feature/tickets-web`, 097ede2e) y `wt-front-tickets-web/src`; rutas relativas a `functions/`. `controllers/sites.js` tiene cambios sin commit de F2-41 en ese árbol: se cita por función.
>
> **A1 y A5 son los «arreglos que no necesitan diseño nuevo» del orden de trabajo 3 de D-518** (Shopify CSV y choque de categorías). Se aprueban aparte, en la tarea 14.0a, y no esperan las preguntas de la ampliación.

## Alcance de esta entrega (F5-30·1)

- **Entra:** productos de Shopify por CSV, clientes (fase 1b, que sigue bloqueada por el concepto legal 0.7) y productos de WooCommerce por CSV.
- **Sigue fuera:** Wix y las páginas básicas, hasta que un comercio que lo necesite traiga un export real. La API de Shopify y de WooCommerce queda fuera porque el CSV cubre el caso.
- **Pasa a esta entrega:** la copia de fotos a Storage (F5-30·2), que antes era fase 2. Ver `design-fotos.md`.
- El ticket sigue abierto con lo que falta (D-518 T·1): no se crean tickets «b».

## A1. Lector de Shopify con el formato actual (hallazgo sin decisión; se corrige)

**Verificado el 2026-10-21:**
- Ayuda oficial: https://help.shopify.com/en/manual/products/import-export/using-csv.
- Plantilla oficial: `product_template.csv` de `help.shopify.com/cdn/shopifycloud/product-knowledge/production/csv/`.
- La plantilla usa los encabezados nuevos. La ayuda dice: «Shopify maintains backward compatibility with older column names, but you should consider updating to the current format». Esa compatibilidad es **al importar en Shopify**. La ayuda no dice qué encabezados trae un export, así que Katuq acepta los dos.
- Corrí `readers/shopify.js` sobre la plantilla, sin escribir nada. Resultado: **3 de 3 productos omitidos como `INVALID`** («Alguna variante no tiene un precio válido»). Lee `Variant Price` (`readers/shopify.js:104`) y la plantilla trae `Price`.
- Además, `esFilaDeVariante` (`:35-39`) mira `Variant SKU`/`Variant Price`, y la agrupación de las pruebas (`tests/storeMigration/_csv.js`) va por `Handle`.

**Tabla de alias.** Vive en `readers/comun.js`. El front usa una copia equivalente en su perfil (decisión 2; Artículo VI: sin `if` por proveedor). Primero se busca el nombre actual y después el viejo; `columna()` ya ignora mayúsculas y espacios de más.

| Concepto | Actual (plantilla 2026) | Anterior |
|---|---|---|
| Identificador y agrupación | `URL handle` | `Handle` |
| Descripción | `Description` | `Body (HTML)` |
| SKU de la variante | `SKU` | `Variant SKU` |
| Precio | `Price` | `Variant Price` |
| Precio de comparación | `Compare-at price` | `Variant Compare At Price` |
| Código de barras | `Variant Barcodes` o `Barcodes` | `Variant Barcode` |
| Peso | `Weight value (grams)` | `Variant Grams` |
| Cantidad (una ubicación) | `Inventory quantity` | `Variant Inventory Qty` |
| Cobra impuesto | `Charge tax` | `Variant Taxable` |
| Foto | `Product image URL` | `Image Src` |
| Posición y texto alternativo | `Image position`, `Image alt text` | `Image Position`, `Image Alt Text` |
| Foto de la variante | `Variant image URL` | `Variant Image` |
| Publicado en la tienda en línea | `Published on online store` | `Published` |
| Opciones | `Option1 name/value` … `Option3` | `Option1 Name/Value` … |
| SEO | `SEO title`, `SEO description` | `SEO Title`, `SEO Description` |

**Reglas nuevas:**
- **Códigos de barras:** `Variant Barcodes` puede traer hasta 20, separados por `;` y con prefijo de tipo (`ean:4006381333931; upc:…`). Se guarda el primero, sin el prefijo.
- **Estado y canal:**
  - `Status` (en minúsculas: la plantilla trae `Active`) decide `exposicion.activo`.
  - `Published on online store = false` deja `marketplace.paginaWeb: false`: el producto está activo, pero fuera de la tienda web. Hoy `migrationProduct.js:136` pone siempre `true`.
- **Los exports usan los nombres actuales:** la ayuda dice que un archivo viejo con la columna `Barcode` «se actualiza a `Barcodes` la próxima vez que exportas». Es la señal más directa de que un export de hoy trae los encabezados actuales. Los viejos se aceptan igual, por archivos guardados.
- **Control de existencias:** el lector también lee `Inventory tracker` y `Continue selling when out of stock` (alias viejos `Variant Inventory Tracker` y `Variant Inventory Policy`). La regla está en `design-ampliacion-plan-existencias.md` E2.
- **Formato detectado:** la simulación devuelve `format: "current" | "legacy" | "mixed"`. Un archivo `mixed`, con encabezados de los dos formatos, se lee igual; el reporte lo avisa.
- **CSV de inventario.** Verificado en https://help.shopify.com/en/manual/products/inventory/setup/inventory-csv:
  - Las opciones vienen como `Option 1 Value`, **con espacio**. Hoy `firma()` (`readers/shopify.js:42-44`) busca `Option1 Value` y no las encuentra; la unión solo funciona por SKU. Se agrega el alias.
  - En el export «Available», cada ubicación es una columna y no existe la columna `Available`. Ese formato se rechaza con `INVENTORY_FORMAT_UNSUPPORTED` y un mensaje que pide el export por estados (pregunta 9).
- **Pruebas:** la plantilla oficial no trae datos personales y entra como fixture **público** junto a los sintéticos. No reemplaza la tarea 0.4: es una plantilla, no un export real.

## A2. IVA por producto (F5-30·5)

`services/storeMigration/payload.js:82` pide un solo `ivaPercent`. Desde ahora, ese porcentaje es solo **la tarifa elegida para los gravados**:

| Plataforma | Columna | Exento (0 %) | Gravado (tarifa elegida) |
|---|---|---|---|
| Shopify | `Charge tax` / `Variant Taxable` | `false` | `true` o vacío (el valor por defecto de Shopify es `true`) |
| WooCommerce | `Tax status` | `none` o `shipping` (solo el envío lleva impuesto) | `taxable`; en una variación, vacío o `parent` hereda del padre |

- `precioSinIvaDesdeConIva` (`migrationProduct.js:31-41`) recibe la tarifa **del producto**. Con 0 %, `precioUnitarioIva` queda en `"0"` y `valorIva` en 0. Así `llevaIva` (`utils/vitrinaProducto.js:98-104`) no pinta «Precio con IVA incluido».
- La fila de la lista Público (A3) lleva la misma tarifa en `porcentajeIva`.
- **`Tax class` de WooCommerce** (pregunta 4). Repetir una sola tarifa sobre clases distintas es el error del #1020:
  - vacía o `standard`: la tarifa elegida;
  - `zero-rate` («Tarifa cero», clase de fábrica de WooCommerce): 0 %, como un exento;
  - cualquier otra (por ejemplo `reduced-rate`): la simulación lista cada clase con su número de productos y el comercio le asigna 0, 5 o 19 % (`options.taxClassMap`). Sin esa asignación, esos productos no se importan (`TAX_CLASS_UNMAPPED`) y el resto sí;
  - en una variación, `parent` o vacía hereda la del padre.
- **¿El precio del archivo incluye IVA?** (pregunta 17). `design.md` (decisión 3) da por hecho que sí. En WooCommerce el valor de fábrica es cargar los precios **sin** impuesto (ajuste «Prices entered with tax»), y Shopify tiene su propio ajuste para incluirlo. Si la tienda los cargaba sin IVA, todos los gravados quedarían un 19 % por debajo.
  - Cuando el archivo trae productos gravados, la simulación pide una respuesta obligatoria: «¿Los precios de tu archivo ya incluyen el IVA?» (`options.pricesIncludeTax`: `true` o `false`; sin respuesta, `products` responde 400 `INVALID_PAYLOAD`).
  - Con `false`: `conIva = round2(precio × (1 + tarifa/100))` y después la fórmula de siempre. A los exentos no les cambia nada.
  - La simulación muestra un ejemplo con un producto del archivo («49.900 en tu tienda quedan en 59.381 con IVA en Katuq»).
- **Simulación:** suma `products.taxExempt` y lo muestra junto a la tarifa elegida, para que el comercio lo revise antes de importar. Es el antecedente del ticket #1020 (cd D7eUZxj67Bn6ORMgSRcb): un solo 19 % para todo el catálogo terminó en facturas con un IVA que no existía.

## A3. Oferta como antes/ahora en la lista Público (F5-30·4)

La tienda solo muestra el tachado, el % y «Ahorras $X» desde la lista Público. Lo hace `preciosDeVitrina` (`utils/vitrinaProducto.js:73-92`), que usa `listaPublica` (`:53-65`, nombre `/p[uú]blico/i`, activa, con precio) y `esCampaniaVigente` (`utils/campaniaDescuento.js:49-58`). El checkout de la tienda cobra ese mismo precio (`services/kuvo/checkoutCore.js:108`).

**Precio regular y oferta:**
- **Shopify: dos lecturas de «precio regular» (pregunta 2).** La ayuda define `Compare-at price` como «el precio original de la variante si el precio se rebajó». En Shopify no vence, y muchas tiendas lo usan como un «antes» permanente. Las dos lecturas muestran y cobran lo mismo en la tienda en línea, pero no en la venta asistida y el POS:

  | | A. Literal: regular = `Compare-at price` | B. Recomendada: regular = `Price` |
  |---|---|---|
  | `precio` del producto | `Compare-at price` | `Price` |
  | Fila Público | `precioConIva` = `Compare-at`, `precioDescuentoConIva` = `Price` | Igual |
  | La tienda en línea | Tacha `Compare-at` y cobra `Price` | Igual |
  | Venta asistida y POS, cliente sin tipo | Cobran `Compare-at` (en la plantilla, 24,99 en vez de 19,99) | Cobran `Price`, lo que el cliente pagaba en Shopify |

  La fila de la lista Público es la misma en las dos; solo cambia el precio base. **Recomiendo B**: cumple «la oferta como antes/ahora en la lista Público», y en Shopify el precio con el que de verdad se vende es `Price`. La simulación cuenta los productos afectados (`offers.count`). Si `Compare-at price` ≤ `Price` o viene vacío, no hay oferta y el precio es `Price` en las dos lecturas.
- **WooCommerce:** el regular es `Regular price` (la oferta de Woo tiene fechas: es temporal). La oferta es `Sale price` si cumple tres condiciones:
  - 0 < oferta < regular;
  - `Date sale price ends` está vacía o es hoy o después;
  - `Date sale price starts` está vacía o es hoy o antes.
  - Con inicio futuro, la oferta no se importa (`OFFER_SCHEDULED`): Katuq no tiene fecha de inicio (pregunta 3). Si ya venció, tampoco se importa (`OFFER_EXPIRED`, solo informativo).

**Escritura:**
- `precio` (el precio base) = el regular (en Shopify, según la pregunta 2), con el IVA de A2.
- Con oferta, el canónico lleva `preciosPorTipoCliente` con **una sola fila**. Tiene la misma forma de `construirFilasPreciosPorTipo` (`services/integrations/osmosis/osmosisProductSyncService.js:1382-1440`) y de `PrecioTipoCliente` (`src/app/shared/utils/precio-por-tipo-cliente.ts`):

  `{ activo: true, tipoClienteId, tipoClienteNombre, precioConIva: antes, precio, valorIva, porcentajeIva, precioDescuentoConIva: ahora, precioDescuento, descuentoPorcentaje, descuentoHasta }`

  «Antes» es `Regular price` (Woo) o `Compare-at price` (Shopify); «ahora» es `Sale price` o `Price`.

  `descuentoHasta` es la fecha de fin de Woo (`YYYY-MM-DD`) o `null`. Shopify no tiene fecha de fin: la oferta queda hasta que el comercio la cambie.
- **Cuál es la lista Público:** el tipo de `tiposPrecios` de la empresa con `active == true` (el campo se llama `active`: `controllers/tiposPrecios.js:92`, `getActiveTiposPrecios`) y cuyo nombre cumple `/p[uú]blico/i`, la misma regla de la tienda.
  - Si no hay ninguno, la oferta no se carga y la simulación avisa `OFFER_NO_PUBLIC_LIST` con el número de ofertas en juego (pregunta 1).
  - Si hay dos o más, tampoco se carga y el aviso es `OFFER_AMBIGUOUS_LIST`.
- **Modo `upsert`:** si el producto ya tiene fila de ese tipo, no se manda la fila y el reporte dice `OFFER_KEPT`. El merge por `tipoClienteId` del upsert (`katuq-product-upsert.action.js:140-175`) conserva los demás tipos y los `manualOverride`.
  - **Precio tapado por la lista:** la fila Público manda sobre `precio` en la tienda (`listaPublica` y `preciosDeVitrina`, `utils/vitrinaProducto.js:53-92`). Si el producto ya tenía una fila Público con precio, el precio que se actualiza no se ve en la tienda en línea, haya oferta o no. El reporte lo dice con `PRICE_SHADOWED_BY_PUBLIC_LIST`, y la simulación lo cuenta (`products.priceShadowed`).

**La excepción, acotada:** es la única escritura de listas de precios del importador. Va siempre en el mismo documento del producto, por `katuq-product-upsert` sin modificarlo. Nunca escribe otro tipo de cliente, nunca escribe `tiposPrecios` y nunca toca un producto que no se creó o actualizó en ese lote. La vigila `importStoreProducts.writeSet` (tarea 14.5).

**Efecto que hay que aceptar:**
- La tienda en línea cobra la oferta.
- La venta asistida y el POS, con un cliente sin tipo, cobran el precio base. En Woo es el regular. En Shopify depende de la pregunta 2: `Compare-at price` con la lectura A, `Price` con la B. La venta asistida aplica la fila solo al cliente que tiene ese tipo (`filaDeTipoCliente`, `precio-por-tipo-cliente.ts`). Es el modelo de D-219: la oferta vive en la lista.

## A4. Partición por precio (F5-30·7)

Se mantiene partir en varios productos un producto cuyas variantes no cuestan lo mismo, porque Katuq cobra el precio del producto (D-214; `checkoutCore.js:108`; `vitrinaProducto.js:295`; `tests/sitios/precioSelectorVariantes.test.js`).
- **Llave nueva de la partición:** `(precio regular, oferta, tarifa de IVA)`. Antes era solo el precio (`separarPorPrecio`, `services/storeMigration/readers/comun.js:173`). Dos tallas con el mismo regular y distinta oferta, o una gravada y otra exenta, no caben en un solo producto con una sola fila Público y un solo IVA.
- Títulos y referencias siguen la regla aprobada: el grupo más grande conserva el título y la referencia; los demás llevan «-2», «-3».
- La plantilla oficial lo ejercita: el e-book de la plantilla (PDF 14,99; Audio 21,99; Kindle 9,99 con comparación 14,99) queda en tres productos.
- **Resolución de F2-16 (#1226, cd jfhD2Pfc95VcRaoGIXbv):** su primera frase dice que las variantes tienen «su foto, precio y disponibilidad, y estos cambian al elegir la variante», y el código no cambia el precio. La misma resolución cubre personalización, adicionales, galería, opiniones, relacionados, entrega y lo que quedó fuera: **solo se corrige esa frase**. Es una tarea de Daniel (14.18), con el texto propuesto. Este cambio no actualiza tickets.

## Write-set de esta ampliación (además de `design-escritura.md`)

| Colección | Qué se agrega | Quién | Prueba |
|---|---|---|---|
| `products` | `precio` con la tarifa del producto; **una** fila de `preciosPorTipoCliente` (tipo Público, A3); `marketplace.paginaWeb` según el canal; los campos de `design-ampliacion-ficha.md`; las fotos copiadas (`design-fotos.md`) | `katuq-product-upsert` sin modificarlo; las fotos, por la ruta `photos` | `importStoreProducts.writeSet` (ampliada) e `importStorePhotos.writeSet` |
| `categorias` | Sin cambio de escritura; cambia qué documento se lee (A5) | `guardarArbol` | Dorado ampliado |
| Solo lectura | `tiposPrecios` (empresa, `active == true`), `integration_configs` (empresa, Woo, `status`; nunca `integration_secrets`) y la marca de la empresa para el plan (E1) | Simulación y lote | `importStoreDryRun.noWrites` |

**Sigue prohibido:** `inventory` e `inventoryMovement` fuera de `importInventory` (6.2, sin cambios), `InventoryLevel`, Shopify, WooCommerce, Osmosis, `tiposPrecios`, otros tipos de cliente, flows y pedidos.

**Inventario:** el módulo `importInventory` y sus contract tests no cambian. Pero la ampliación **sí cambia las cantidades que el lote le entrega**: los alias del CSV de inventario (A1), el `Stock` de Woo (W2) y los productos sin control de existencias, que no reciben filas (E2). Por eso 6.2 sigue con diff aprobado, se suma una prueba de caracterización del mapeo de cantidades antes de tocarlo (14.21a), y la spec de Woo tiene su escenario «el producto, sus variantes, su precio y sus listas no cambian» (`openspec/config.yaml`).

## A5. Árbol de categorías: el mismo documento que Maestros (orden de trabajo 3 de D-518)

- Hoy `leerArbol` (`services/catalogImport/categoryAssignment.js:100-110`) toma `limit(1)` sin orden. Firestore devuelve entonces el primero por id.
- Maestros elige con `documentoQueEditaElMaestro` (`services/catalogo/atributosCategoria.js:123-126`):
  - **sin** la bandera `categoryAttributes`, el primero por id: el mismo que toma hoy el importador. No hay choque;
  - **con** la bandera, el documento de mayor puntaje (D2). Ahí el importador escribiría un árbol que Maestros no muestra, en las 4 empresas con varios documentos (D-495).
- La bandera está apagada en todas las empresas, así que hoy el choque no ocurre. Se arregla para el día que se encienda.
- **Cambio:** `leerArbol` lee los documentos de la empresa y usa la misma función con la misma bandera.
- `importProducts` también llama `leerArbol` desde la 3.1, así que el cambio va con diff aprobado. El dorado suma varios documentos **con y sin** la bandera; sin ella, y con un solo documento, el resultado no cambia.

## Riesgos

- **Precio distinto entre la tienda y la venta asistida** para un producto en oferta (A3, pregunta 2).
- **La oferta de Shopify no vence sola:** el comercio la quita a mano.
- **Formato del export real:** si un export trae columnas que ni la plantilla ni la ayuda nombran, la tarea 0.4 lo encuentra. Mientras tanto, la simulación muestra `format` y los grupos inválidos con su motivo.
- **`leerArbol` compartido:** el cambio de A5 también cambia `importProducts`, aunque solo con `categoryAttributes` encendida. El dorado lo vigila.
- **Precios sin IVA en el archivo** (pregunta 17): si el comercio responde mal, todo el catálogo gravado queda mal. Mitigación: el ejemplo con un producto real del archivo en la simulación.
