# Ampliación D-518: lo que la tienda muestra del producto migrado y la revisión de seguridad

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Aplica F5-30·3 (SEO), F5-30·6 («Nuevo» y texto alternativo) y F5-30·9 (M2 y M3) de D-518. Es complemento de `design-ampliacion.md`. Código leído el 2026-10-21 en `wt-back-tickets-web/functions` (097ede2e) y `wt-front-tickets-web/src`. `controllers/sites.js` tiene +740 líneas sin commit de F2-41 en ese árbol: se cita por función y, donde sirve, con la línea de HEAD 097ede2e y la del árbol de trabajo.
>
> **Archivo sensible:** `utils/vitrinaProducto.js` está en el camino del cobro, porque `checkoutCore.js:108` usa `preciosDeVitrina` de ese archivo. Los cambios N1 y N2 no tocan precios. Aun así van con diff aprobado y con las pruebas de caracterización en verde antes y después: `tests/sitios/detalleComercialProducto.test.js` y `tests/sitios/precioSelectorVariantes.test.js`.

## N1. Nada sale «Nuevo» (F5-30·6)

**Hoy:**
- `nuevoProducto` pone `exposicion.nuevo: true` (`services/storeMigration/migrationProduct.js:133`). Ese campo lo filtran las listas del Seller (`controllers/productos.js:2310`, `controllers/productosPaginated.js:348`).
- El upsert llena `fechaCreacion` y `createdAt` con la fecha de hoy (`katuq-product-upsert.action.js:264, 316`).
- `esNuevo` (`utils/vitrinaProducto.js:197-203`) pinta «Nuevo» en todo producto de menos de 45 días. Resultado: 500 productos viejos con la insignia durante 45 días.

**La fuente choca con «se guarda la fecha de origen»:**
- Ni la plantilla oficial de Shopify ni el esquema del CSV de WooCommerce (wiki «Product CSV Import Schema») traen la fecha de creación del producto.
- No hay fecha de origen que guardar con estos dos formatos. Se cumple la parte verificable de la decisión, que nada salga «Nuevo», y el campo queda listo para cuando un archivo traiga la fecha (pregunta 5).

**Cambio:**
- `nuevoProducto` escribe `exposicion.nuevo: false` y `metadata.migration.originCreatedAt`: la fecha ISO del archivo si la trae; si no, `null`.
- `esNuevo`: si el producto tiene `metadata.migration`, mide los 45 días desde `originCreatedAt`. Sin esa fecha, el producto **no** es nuevo. Los demás productos siguen igual.
- `fechaCreacion` y `createdAt` siguen siendo los de la importación: son la fecha real del documento en Katuq y ordenan las listas del Seller.
- **Choque con TX-34 (`tienda-celular-y-velocidad/design.md`, D1 y D6):**
  - D1 arma la proyección de la tienda con un `select` que trae `createdAt` y `fechaCreacion`, pero no `metadata.migration`. Si la insignia se calcula desde esa proyección, la regla de arriba se pierde y lo migrado vuelve a salir «Nuevo», no solo primero en el orden.
  - D6 ordena `novedad` por `createdAt || fechaCreacion`: lo migrado encabezaría «Novedades».
  - **Arreglo:** la regla vive en una sola función pura, `fechaDeNovedad(p)` en `utils/vitrinaProducto.js`. Devuelve `originCreatedAt` si el producto tiene `metadata.migration.migrationId`; `null` si es migrado sin fecha; y `createdAt || fechaCreacion` en los demás casos. La usan `esNuevo`, el orden `novedad` de TX-34 y, si la pregunta 15 lo aprueba, `idsVisibles` del plan gratis (`design-ampliacion-plan-existencias.md` E1).
  - El `select` de D1 debe sumar `metadata.migration.migrationId` y `metadata.migration.originCreatedAt`. Este cambio no edita la carpeta de TX-34: la dependencia queda en la tarea 14.18 para quien la edite, y la prueba de 14.7 la fija con un producto migrado leído con el `select` de la proyección.
  - Mientras TX-34 no esté hecho, la tienda lee el producto entero y la regla funciona.

## N2. Texto alternativo de cada foto (F5-30·6)

**Hoy:**
- `proposal.md:29` promete leer `Image Alt Text`, pero `readers/shopify.js` no lo lee.
- `buildProductPhotos` (`utils/productImageUrls.js:414-416`) arma `{ urls, nombreImagen, path, tipo }` con el título del producto.
- La ficha pinta `alt` con el título (`utils/siteHtml.js:2485`) y la tarjeta también (`:1214`).
- Hoy el alt es el nombre del producto. El alt generado con IA quedó pendiente en TX-35 (#1250, cd Jhr9yFamEY8OsjSwqikb).

**Cambio:**
- **Lector:** guarda `Image alt text` (o `Image Alt Text`) junto al enlace de su fila. Lo recorta a 512 caracteres, el límite de Shopify, y le quita etiquetas y caracteres de control. `Variant image URL` no trae alt. WooCommerce no tiene columna de alt.
- **Foto:** cada objeto de `crearProducto.imagenesPrincipales[]` puede llevar `alt`. `nombreImagen` no cambia.
- **Tienda:**
  - `todasLasImagenes` (`vitrinaProducto.js:212-224`) pasa `alt` con cada foto.
  - En la ficha, la foto principal usa `alt || título`. En la tarjeta, la primera foto, igual.
  - Las miniaturas siguen con `alt=""` y su `aria-label`, porque son botones (`siteHtml.js:2247-2256`).
- **Quién lo conserva:**
  - El lote de TX-37 conserva las demás llaves de la foto (`fotoRevertida`, `fotos-uniformes-producto/design-fase-1b.md`).
  - El formulario de producto del Seller copia los objetos de foto tal como llegan (`crear-productos.component.ts:3295-3296`). Una prueba de caracterización lo fija antes de tocar nada (tarea 14.8).
  - Si el comercio reemplaza la foto, el alt se va con ella, como hoy.

## N3. Título y descripción SEO por producto (F5-30·3)

**Hoy:**
- La ficha arma `fichaSeo` solo con el título y la descripción del producto (render de la ficha en `controllers/sites.js`: línea 6726 en HEAD 097ede2e, 7386 en el árbol de trabajo).
- La URL canónica se arma con `rutaDeProducto(fichaSeo.titulo, idFicha)` (línea 7052 en HEAD, 7724 en el árbol de trabajo).
- `SEO title` y `SEO description` del export se pierden.

**Cambio:**
- **Campo opcional en el producto:** `seo: { titulo, descripcion }`, en la raíz del documento. Va en la raíz y no dentro de `crearProducto` porque `exports.edit` (`controllers/productos.js:1832-1881`) arma `{ ...existente, ...cuerpo }` por la raíz: el formulario manda `crearProducto` completo, y un campo dentro se perdería en cada edición. En la raíz, una edición que no lo trae lo conserva. Límites: 70 y 320 caracteres, sin etiquetas.
- **Lectores:** Shopify `SEO title`/`SEO description`. WooCommerce no lo trae en el export por defecto: el SEO de plugins como Yoast no viaja.
- **Ficha:** `fichaSeo.titulo = seo.titulo || producto.titulo`, y la descripción, `seo.descripcion || la de hoy`.
- **La URL canónica sí cambia de fuente, a propósito.** Hoy sale de `fichaSeo.titulo`, que es el título del producto. Como `fichaSeo.titulo` pasa a ser `seo.titulo || título`, dejar esa línea igual cambiaría la canónica. **Esa línea pasa a usar el título del producto** (`producto.titulo`), igual que la ruta real `/p/<nombre>-<cd>`, las redirecciones (`rutaDeProducto(crearProducto.titulo, cd)`) y el JSON-LD (`name`). La prueba de 14.9 lo fija: un título SEO no cambia la canónica.
- 14.9 espera a que F2-41 haga commit de `controllers/sites.js`, para que el diff aprobado sea solo de este cambio.
- **Seller (solo si la pregunta 6 dice que sí):** dos campos opcionales «Título para Google» y «Descripción para Google» en el formulario de producto, con la regla de diseño D-400. Sin ellos, el comercio no puede ver ni corregir lo importado. F5-30·3 no los pide; por eso quedan sujetos a la pregunta.

## N4. Descripción limpia al importar (F5-30·9, M2)

- El lector pasa `Description` / `Body (HTML)` (Shopify) y `Description` (WooCommerce) por `descripcionSegura` (`utils/vitrinaProducto.js:237`, exportada en `:384`), la misma lista de etiquetas que ya usa la ficha. Lo hace antes de recortar a `MAX_DESCRIPCION` (`readers/comun.js`).
- Si `Description` viene vacía en WooCommerce, se usa `Short description`.
- Los casos de prueba concretos van en la revisión privada (**ver revisión privada**).

## N5. Tope de la simulación (F5-30·9, M3)

- **Tope:** 20 simulaciones cada 15 minutos **por empresa**. Usa `express-rate-limit`, como las rutas de `routers/onboarding.js:334-362`. La llave es la empresa **del token**, que deja `requireJwtTenant`. La llave exacta está en la revisión privada.
- **Dónde va:** en `routers/importStore.js`, después de la cadena (sesión, empresa, bandera, rol) y antes del controlador. Así una empresa con la bandera apagada sigue recibiendo 403 y no consume cupo.
- **Respuesta:** 429 `RATE_LIMITED`, con un mensaje sin jerga («Hiciste muchas simulaciones seguidas. Espera unos minutos y vuelve a intentarlo.»). No lee `products`.
- Los valores son constantes en el código, no van en el `.env` (D-505).
- No agrega colecciones. Los límites conocidos del contador y su detalle: **ver revisión privada**.

## Write-set de esta parte

| Dónde | Qué | Prueba |
|---|---|---|
| `products` (por el upsert, sin modificarlo) | `exposicion.nuevo: false`, `metadata.migration.originCreatedAt`, `crearProducto.imagenesPrincipales[].alt` y `seo` | `importStoreProducts.writeSet` |
| `products` (formulario del Seller, si se aprueba la pregunta 6) | `seo`, por la edición de siempre | Caracterización del formulario |
| Código de la tienda | `esNuevo`, `todasLasImagenes`, ficha y tarjeta (alt) y `fichaSeo`; ningún cálculo de precio | `tests/sitios`, la suite completa igual a la base |

## Riesgos

- **Cambiar `esNuevo`** solo cambia los productos con `metadata.migration`. Una prueba fija que un producto sin migración y con 10 días sigue siendo «Nuevo».
- **SEO con datos viejos:** un título SEO que el comercio no actualiza tapa el título del producto en Google. Si la pregunta 6 aprueba los campos, el formulario lo muestra y lo deja borrar; si no, solo se cambia reimportando en modo actualizar.
- **Alt en otros escritores:** Osmosis y el upsert de flows reescriben las fotos de los productos integrados. Los migrados no tienen integración: la guarda de flows lo impide.
