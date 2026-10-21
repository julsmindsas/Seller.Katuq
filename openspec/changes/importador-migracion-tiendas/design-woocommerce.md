# Ampliación D-518: WooCommerce por CSV (fase 1c, F5-30·8)

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Aplica F5-30·8: «El CSV usa variantes. Un comercio con la integración Woo activa (CAFE ESCOBAR) no usa el importador hasta que WP-INT 5 decida». Reemplaza el alcance corto de la tarea 10.1 y deja intactos el lector de Shopify, las rutas y el write-set aprobados. Columnas verificadas el 2026-10-21 en el wiki oficial «Product CSV Import Schema» (github.com/woocommerce/woocommerce/wiki/Product-CSV-Import-Schema). Sigue sin haber un export real (0.4).

## Contexto verificado

- **Dos modelos de variante:** Katuq ya trae productos de Woo por API (`importAllProducts`, `controllers/woocommerceIntegration.js:800`). Cada variación queda como un producto aparte con `productoPadre` (`services/woocommerce/mappers/variant.js:5, 40`), y nada lee ese campo. WP-INT 5 (#1290, cd nnb7LeK1CNIB3k2ybrb4, Mónica, CAFE ESCOBAR) todavía no decide la llave ni el manejo de los productos variables.
- **La decisión:** el importador CSV usa el modelo de D-498: un producto con `variantes[]` y las variables nativas que genera el upsert (D-214). **No** se toca `importAllProducts` ni el mapper de variantes.
- **Guardas que ya existen:** la de flows bloquea `woocommerce-product-upsert` y `woocommerce-inventory-adjust` (`services/storeMigration/publishingGuard.js:19-26`). El instalador de stock de D-515 (WP-INT 2) crea justo ese flow para CAFE ESCOBAR.

## W1. Guarda nueva: integración WooCommerce activa

- **Qué lee:** `integration_configs` con `companyId` = la empresa del token, `provider == "woocommerce"` y `status == "active"`. Es la misma llave que usa `integrationConfigService` (`services/integrationConfigService.js:9, 413-417`). **Nunca** lee `integration_secrets`.
- **Si la encuentra:**
  - la simulación muestra el bloqueo `WOO_INTEGRATION_ACTIVE`;
  - `products`, `photos`, `redirects` y `customers` responden 409 con ese código y no escriben nada;
  - vale para **cualquier fuente**, también Shopify: la decisión dice que ese comercio «no usa el importador».
- **Mensaje:** «Tu tienda está conectada con WooCommerce. Mientras definimos cómo se sincronizan los productos con tu tienda, la importación no está disponible: escríbenos por soporte.»
- **Hasta cuándo:** hasta que WP-INT 5 decida. Levantarla es otro cambio, que registra esa decisión. La guarda es una lista cerrada en el código, no un interruptor (D-505 no aplica).
- **Prueba:** `importStoreGuard` suma el caso. Con la integración en `inactive`, no bloquea; la de flows sigue igual.

## W2. Lector `readers/woocommerce.js`

Puro, en el mismo registro (`readers/index.js`), con el mismo «producto leído» de `readers/comun.js`.

**Encabezados traducidos:** el exportador de WooCommerce escribe los encabezados en el idioma del sitio. Una tienda en español exporta «Nombre», «Precio normal», etc., en lugar de los nombres del wiki. El lector usa una tabla de alias (inglés del wiki y español), como la de Shopify (`design-ampliacion.md` A1). Los nombres en español se fijan con el export real (0.4); hasta entonces, un archivo sin las columnas mínimas se rechaza en la simulación con `UNKNOWN_FORMAT` y no se adivina.

**Agrupación** (el front, perfil Woo):
- Un grupo por fila `simple` o `variable`, con la llave `ID`.
- Las filas `variation` se unen a su padre por `Parent`. `Parent` puede ser `id:<ID>` o el **SKU** del padre: el wiki dice «Export will use SKU when possible». La agrupación de prueba de hoy (`tests/storeMigration/_csv.js:43-55`) solo entiende `id:`.
- Una variación cuyo padre no está en el archivo: `ORPHAN_VARIATION`.

**Tipos:**
- `simple` es un producto de una variante. `variable` más sus `variation` es un producto con `variantes[]`.
- `grouped` y `external` se omiten con `TYPE_NOT_SUPPORTED` (pregunta 14).
- Las marcas `virtual` y `downloadable` del campo `Type` no cambian nada: entran como producto.

**Ejes:**
- Salen de `Attribute N name` / `Attribute N value(s)` de las filas `variation`, **por nombre** (`asignarEjes`; Talla/Color).
- Un atributo que solo aparece en el padre no es eje: va al reporte como `ATTRIBUTES_NOT_IMPORTED` (pregunta 12).
- Una variación con un valor vacío en un eje usado por las demás («cualquier talla») queda como variante parcial. Se omite con `VARIATION_ANY_VALUE`: D-214 prohíbe ofrecer variantes parciales.

**Precio, oferta e IVA:** las reglas de `design-ampliacion.md` A2 a A4, por variación, incluidas la clase `zero-rate`, la asignación de las demás clases y la respuesta «¿tus precios incluyen IVA?» (preguntas 4 y 17).
- La variación sin `Regular price` hereda la del padre si la trae; si no, el grupo es `INVALID`.
- La llave de partición es `(regular, oferta, IVA)`.

**Existencias** (el wiki: «un `Stock` numérico activa el manejo de existencias»):
- `Stock` por variación, sumado como en Shopify. Las negativas cuentan 0.
- Sin `Stock` y con `In stock? = 1`, o con `Backorders allowed? = 1`: el producto no lleva control. Queda `inventariable: false`, sin existencias y con `NOT_TRACKED` (`design-ampliacion-plan-existencias.md` E2, pregunta 16).
- Sin `Stock` y con `In stock? = 0`, o sin los dos: queda con control, en 0, y el reporte dice `STOCK_UNKNOWN`.
- **Caracterización antes de 6.2:** una tabla fija qué cantidad recibe `importInventory` por cada caso (Shopify actual y anterior, inventario aparte y Woo). Así un cambio del lector no altera las existencias sin que la prueba lo diga.

**Estado:**
- `Published`: `1` es activo; `0` (privado) y `-1` (borrador) son inactivos (valores del wiki).
- `Visibility in catalog = hidden` deja `marketplace.paginaWeb: false`. `catalog` y `search` siguen en la tienda web.

**Fotos:**
- `Images`: enlaces separados por coma; la primera es la destacada.
- La foto de una variación (`Images` en su fila) lleva su `color`.
- No hay texto alternativo.

**Categorías:**
- `Categories`: la primera ruta («A > B»). Las demás van al reporte (`EXTRA_CATEGORIES`, como dice hoy `wooProducts.test.js`).

**Descripción:** `Description` limpia (`design-ampliacion-ficha.md` N4). Si viene vacía, `Short description`.

**Referencia:**
- El SKU del producto simple que trae SKU.
- En un variable, el SKU del padre si lo trae; si no, `woo-<ID>`.
- Nunca la de una variación (D-214).
- `externalId` es el `ID`.

## W3. Redirecciones de WooCommerce

- **No hay slug en el export:** el wiki no lo lista, así que la dirección real del producto no viaja en el CSV.
- **Dirección probable:** se arma a partir de `Name` con la regla de `sanitize_title` de WordPress:
  - quita las tildes y pasa a minúsculas;
  - el punto pasa a guion;
  - **borra** el resto de la puntuación, sin cambiarla por guion: «Men's Shirt» queda `mens-shirt`, no `men-s-shirt`;
  - los espacios pasan a guion, sin guiones repetidos ni al principio o al final.
  - La prueba lleva esos casos. Se revisa con el export real (0.4).
- **Base de las direcciones:** no siempre es `/product/`. Una tienda en español usa por defecto `/producto/` y `/categoria-producto/`, y muchos comercios cambian la base en los ajustes de enlaces permanentes. Como la redirección compara la ruta exacta (D-479), con la base equivocada ninguna 301 coincidiría.
  - El paso de redirecciones pide la base de producto y la de categoría (`productBase`, `categoryBase`). Las sugiere a partir de una dirección de ejemplo que pega el comercio (`/producto/camisa-azul/` → `/producto/`).
  - Sin ejemplo ni respuesta, ofrece `/producto/` y `/categoria-producto/` si el archivo viene en español (encabezados traducidos), o `/product/` y `/product-category/` si no, y lo marca en el reporte (`BASE_ASSUMED`).
- **Marcada «probable»:** la redirección generada lleva `<productBase><slug>`, y la de categoría, `<categoryBase><slug>`. Se marca igual que las colecciones de Shopify (`redirectPlan.js`).
- **Dirección real pegada por el comercio:** el paso de redirecciones acepta una lista de direcciones reales de productos, que manda sobre la probable y sobre la base.
- **Sin barra final:** WordPress pone una barra al final; `normalizarRedirecciones` compara sin ella (D-479).
- `metadata.migration.handle` guarda el slug usado (probable o pegado), para que repetir el paso reconozca lo generado.

## W5. Clientes de WooCommerce (F5-30·1, pregunta 19)

- F5-30·1 deja «clientes» en esta entrega. El diseño de clientes (`design-clientes.md`) es de Shopify.
- WooCommerce sí tiene un export de clientes: el informe de Analytics → Clientes se descarga en CSV, con nombre, correo, teléfono de facturación y de envío, ciudad y región (ayuda oficial de WooCommerce, «Customers report», verificada el 21-oct). **No trae ningún consentimiento de marketing.**
- **Propuesta (recomendada en la pregunta 19):** un lector `readers/wooCustomers.js` con la misma normalización, búsqueda, lotes y reversa de la fase 1b. Ningún cliente de Woo crea una autorización de correo, porque el archivo no la trae. El reporte lo dice.
- Va con la fase 1b (diff aprobado y concepto legal 0.7) y con la guarda `WOO_INTEGRATION_ACTIVE`.

## W4. Lo que no cambia

- No se modifica `importAllProducts`, `services/woocommerce/*`, `katuq-product-upsert`, `importInventory` ni el flow de stock de D-515.
- Un comercio sin integración Woo activa importa su CSV de Woo con las mismas rutas, candado, simulación, existencias (6.2) y fotos (`design-fotos.md`).
- Ninguna escritura llega a WooCommerce.

## Riesgos

- **Dirección probable equivocada:** WordPress agrega «-2» a los slugs repetidos y el comercio pudo cambiar el slug a mano. Mitigación: «probable» en el reporte y la lista pegada.
- **Dos modelos si después se conecta la integración:** un comercio que importó por CSV y después conecta Woo por API tendría productos con `variantes[]` y el mapper crearía productos por variación. Lo resuelve WP-INT 5. Hasta entonces, el reporte final avisa que conectar la integración requiere revisión.
- **Clases de impuesto propias del comercio:** se asignan a mano en la simulación; si el comercio se equivoca, esos productos quedan con la tarifa equivocada (pregunta 4).
- **Encabezados en español:** hasta tener un export real (0.4), los nombres traducidos son una suposición; la simulación rechaza el archivo antes de adivinar.
