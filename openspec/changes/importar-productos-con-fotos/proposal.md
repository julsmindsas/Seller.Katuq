## Why

Para la feria Effix (16 al 18 de octubre de 2026; todo listo el 15), la **importación de productos con fotos por enlace** figura en el catálogo de funciones nuevas que fijó Daniel, con la bandera `productImportPhotos`. El código ya existe en las copias de trabajo del backend y del front, **sin commit, sin propuesta y sin decisión registrada**, y las reglas del proyecto (`openspec/config.yaml` de los dos repos y el Artículo I de la constitución) exigen la propuesta antes de commitear. Esta propuesta pone ese código bajo el método: dice qué hace, qué no cambia para quienes ya operan, qué riesgos trae y qué falta para cerrarlo.

El problema, leído del código (no se midió producción):

- **La plantilla de productos no trae columna de fotos.** Quien importa su catálogo por Excel ve entrar sus productos sin foto y tiene que subirlas una por una, producto por producto, justo cuando más quiere ver su tienda terminada.
- **Hay un camino a medias y sin red de seguridad.** Si el archivo trae una columna de enlaces y KAI la reconoce como imagen, el **navegador** arma la lista de fotos (`tipo: 'url'`) y el servidor la guarda **sin validar nada**: pasan `http://`, direcciones internas, enlaces de «compartir» de Drive (que son una página, no la imagen) y páginas de Instagram o Facebook. En la tienda esas fotos salen rotas y nadie le dice al comercio cuáles fallaron.
- **Reimportar un producto que ya existe reemplaza los datos de su ficha que arma desde el archivo** (`crearProducto` incluido): sin foto en el Excel, el producto queda con la lista de fotos vacía. Es el comportamiento de hoy y esta propuesta no lo cambia fuera de la función nueva.

## What Changes

**Regla de Daniel:** toda función nueva nace **apagada** para los comercios que ya operan (ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS) y se enciende comercio por comercio. Se prueba primero en FLORECER (empresa demo). La bandera vive en el documento de la empresa: `featureFlags.productImportPhotos`; ausente o distinta del booleano `true` = apagada (el contrato común está en la propuesta `banderas-por-comercio`). Con la bandera apagada todo queda **idéntico** a hoy (solo cambian dos lecturas, listadas más abajo).

### Con la bandera encendida

| Pieza | Qué pasa |
|---|---|
| Plantilla de productos | Trae dos columnas opcionales al final: «Foto principal (URL)» y «Fotos adicionales (URLs separadas por coma, espacio o salto de linea)». La fila de ejemplo va **vacía** en ellas a propósito: se importa como un producto más y un enlace de mentira dejaría una foto rota en la tienda. La hoja de instrucciones las explica |
| Mapeo de columnas | Las dos filas aparecen siempre y nunca son obligatorias. Si el archivo trae una columna cuyo nombre parece de fotos **y** tiene enlaces en sus primeras filas, se sugiere. Lo que KAI proponía como imagen principal o secundaria pasa a estas dos filas para que lo valide el servidor. Una nota explica los enlaces y avisa que, sin columna de fotos, los productos que ya existen quedan sin las que tenían |
| Validación (servidor) | Solo se guarda un enlace `https://` de un sitio público con nombre, sin usuario ni contraseña escritos adentro, de máximo 2.048 caracteres y que no sea un PDF, un video ni otro archivo que no sea foto. Se rechazan, con una explicación de qué hacer: nombres de archivo del computador, direcciones internas o solo de números, y páginas de Instagram, Facebook, Google Fotos, OneDrive, WeTransfer, Canva, Pinterest e iCloud |
| Drive y Dropbox | El enlace de «compartir» de **una foto** se convierte en enlace directo de la imagen. Carpetas y documentos se rechazan diciendo qué hacer. La foto tiene que estar compartida como «Cualquier persona con el enlace» (el servidor no lo puede comprobar) |
| Lo que se guarda | Cada foto como `{ urls, nombreImagen, path: "", tipo: "url" }` en la galería principal del producto (`crearProducto.imagenesPrincipales`): portada primero, sin repetidas, máximo 8 por producto. `imagenesSecundarias` no se toca. Ningún otro campo del producto cambia por causa de las fotos |
| Productos que ya existen | La hoja manda solo en lo que dice: sin enlaces válidos el producto conserva sus fotos; con solo portada cambia la portada y conserva las demás; con solo adicionales conserva la portada. Importar dos veces el mismo archivo deja lo mismo |
| Resultado | La pantalla final dice cuántas fotos se guardaron y en cuántos productos, cuántos enlaces de Drive o Dropbox se convirtieron, y lista (fila del Excel, referencia, columna, enlace recortado y qué hacer) los que no sirvieron. Los productos entran de todos modos |
| El servidor no visita los enlaces | Valida solo el texto. No descarga nada ni consulta el sitio al que apunta: no hay SSRF. La foto la pide después el navegador de quien mira la tienda |

### Con la bandera apagada (hoy, en las cuatro empresas)

Para ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS y cualquier empresa sin la bandera:

| Pieza | Qué pasa |
|---|---|
| Plantilla, mapeo y resultado del importador | Los de siempre: sin columnas de foto, sin filas de foto en el mapeo, sin nota, sin bloque de fotos |
| Camino viejo de fotos (KAI reconoce una columna de imágenes y el navegador arma la lista) | Igual que hoy, sin validar. Se propone retirarlo cuando se retire la bandera, no antes |
| Respuesta del servidor y productos guardados | Idénticos: la prueba «dorado» congela, con valores sacados del controlador anterior, lo que responde y escribe el importador para un lote sin fotos, en los tres modos |
| Fotos de productos existentes | Esta función no las toca |
| Flows de OH MY STORE, Shopify, WooCommerce, inventario, precios, listas de precios | No se tocan ni se llaman |
| Datos | Sin migración ni relleno; la bandera solo existe en un documento cuando alguien la escribe con el script (no se leyó producción para esta propuesta) |

**Lo único que cambia con la bandera apagada son dos lecturas:**

1. **Servidor:** un lote **sin** celdas ni columnas de foto no consulta la bandera (cero lecturas). Uno **con** ellas, que solo puede venir de una pestaña vieja o de una petición armada a mano, lee una vez el campo `featureFlags` de la empresa de la sesión; ignora las fotos y suma a la respuesta `photoImport: { enabled: false, ignoredRows }`.
2. **Front:** al abrir el importador de **productos** se lee una vez, del navegador, la empresa guardada al iniciar sesión (sin pedir nada al servidor). Los importadores de clientes, inventario y categorías ni siquiera la leen.

## Capabilities

### New Capabilities
- `product-import-photo-links`: bandera apagada de fábrica, columnas de foto, lo que queda guardado, productos que ya existen, aislamiento entre empresas y fotos visibles en la tienda.
- `product-import-photo-report`: lo que la persona ve al terminar (fotos guardadas, enlaces que no sirvieron y qué hacer), el aviso cuando la función no está activa y la garantía de que una falla con las fotos no tumba el producto.
- `product-import-photo-link-safety`: qué enlaces se aceptan y cuáles se rechazan, conversión de Drive y Dropbox, límites contra celdas armadas a propósito y la garantía de que el servidor no visita los enlaces.

### Modified Capabilities
- Ninguna archivada: el importador de productos no tiene especificación en `openspec/specs/` (su historia está en D-148 de `specs/CONTRACT.md`).

## Impact

- **Backend** (`katuq_admin_back_firebase`, rama `backend-aws-security`):
  - `functions/utils/productImageUrls.js` (nuevo, puro: sin Firestore, sin red, sin registros).
  - `functions/controllers/onboarding.js`: solo `importProducts` y dos auxiliares de carga defensiva (+148 / −2 líneas hoy; el diff de ese archivo contiene únicamente esto). La ruta `POST /v1/onboarding/import-products` **no cambia**: sigue con `auth`, `requireJwtTenant` y rol de administrador.
  - Pruebas nuevas: `functions/tests/onboarding/productImageUrls.test.js` (50 verificaciones) y `functions/tests/onboarding/importProductsPhotos.test.js` (24).
  - **Depende** del contrato de banderas (propuesta `banderas-por-comercio`), presente en la copia de trabajo y sin commit: `functions/services/companyFeatureFlags.js` y `functions/scripts/set-company-feature.js`.
- **Front** (`Seller.Katuq`, rama `feature/venta-asistida-mejorada`): `src/app/shared/components/import-modal/import-modal.component.ts` (+219 / −3) y `.html` (+71). Sin HTTP nuevo (usa el `ImportApiService` de siempre) y sin SCSS nuevo. **Depende** de `src/app/shared/services/company-features.service.ts` (también de `banderas-por-comercio`), sin commit.
- **Datos:** sin colecciones, endpoints, índices ni cachés nuevos; sin relleno ni migración.
  - Lectura nueva: el campo `featureFlags` del documento de la empresa, una vez por lote y solo si el lote trae fotos.
  - Escritura nueva: ninguna colección; solo el contenido de `crearProducto.imagenesPrincipales` e `imagenesSecundarias` de los productos que la importación ya escribe.
- **Write-set declarado:** el de siempre del importador de productos (`products`; la taxonomía de categorías como ya hace desde D-148). **Nunca** `inventory`, `inventoryMovement`, precios, listas de precios ni catálogo de Shopify; ninguna llamada a Shopify, WooCommerce ni Osmosis. La prueba del importador falla si se escribe fuera de `products` y verifica que las fotos no cambian precio, categoría, identificación ni ningún otro campo.
- **UI:** el bloque nuevo del resultado reutiliza clases del modal que traen los colores del modal viejo, una desviación del tema canónico (`openspec/specs/design-system/spec.md`) justificada en `design.md`, decisión 11. Sin gradientes ni colores prohibidos.
- **Módulos sensibles (orders / inventory / consecutivos):** ninguno se toca. Lo sensible aquí es la importación masiva de productos (lotes de hasta 500 filas, para todos los comercios) y lo que lee las fotos aguas abajo (ver Risks).
- **360 (Osmosis, Shopify, webhooks, inventario):** no se toca, por eso no se cita `findings.md`. El efecto aguas abajo se describe con el código que lee las fotos, no con datos de producción.

## Risks

- **Importación masiva de productos (sensible).** Un cambio en `importProducts` alcanza a todos los comercios que importan. Mitigaciones: un lote sin fotos ni siquiera pregunta por la bandera; la prueba «dorado» congela, con valores del controlador anterior, la respuesta y lo escrito de antes; si falta el archivo del util o el módulo de banderas, el servidor arranca y la importación sigue como siempre (falla cerrada).
- **Las fotos siguen alojadas fuera de Katuq.** Si el comercio borra la foto de Drive o cambia quién la puede ver, el producto muestra una imagen rota. Google puede limitar descargas repetidas desde enlaces compartidos. El sitio que aloja la foto ve la dirección IP de quien mira la tienda. La mitigación de fondo (copiar la foto al almacenamiento de Katuq con descarga segura) es una fase 2 aparte.
- **El enlace directo de Drive no se ha verificado en vivo como imagen de la tienda.** Se comprueba en FLORECER antes de ofrecer la función a nadie más; si no se ve, el ajuste es una línea de `normalizarDrive` y sus pruebas.
- **Shopify y WooCommerce aguas abajo.** Las sincronizaciones que ya existen leen `crearProducto.imagenesPrincipales[].urls` y lo mandan como origen del medio (`services/shopify/mappers/product.js`, `services/flows/nodes/shopify/utils/mapper.js`, `services/woocommerceService.js`). En una empresa con flows activos, como OH MY STORE, una foto por enlace viajaría en la siguiente corrida. Mientras la bandera siga apagada en las cuatro (el punto de partida) esto no ocurre; antes de encenderla en una con Shopify o WooCommerce conectado hay que probar con un producto y mirar qué hace la plataforma con el enlace.
- **Reimportar sin columna de fotos deja sin fotos al producto existente** (comportamiento de hoy, ahora más visible). Con la función encendida, la nota del mapeo ya lo advierte; ver pregunta 2 de `design.md`.
- **Eliminar una foto por enlace en el formulario de producto quita todas las que tienen `path` vacío** (`deleteImg` filtra por `path`; es el mismo defecto de D-131). El arreglo vive en `crear-productos.component.*`, que hoy tiene parches pendientes de otra función; ver pregunta 3 de `design.md`.
- **«Solo se enciende con el script» depende de otra pieza.** `banderas-por-comercio` documenta (hallazgo 1, tarea 3.2) que la ficha de empresa todavía deja escribir una llave con punto, `featureFlags.<bandera>`, por `PUT /v1/companies/:id` y `POST /v1/companies/edit`. Mientras siga abierto, un administrador de comercio podría prenderse `productImportPhotos` él mismo, o prendérsela a otra empresa por la ruta que identifica la empresa por NIT. El alcance aquí es acotado (el servidor valida cada enlace y hay límites), pero la regla «nace apagada» no está garantizada hasta cerrarlo: no se despliega ni se enciende esta función antes.
- **Celdas armadas a propósito.** Un administrador malintencionado de un comercio con la bandera encendida podría pegar celdas enormes. Mitigaciones: límites por enlace, por celda y por producto; revisión en una sola pasada; la prueba exige menos de 100 ms con celdas de hasta ~100.000 caracteres (el servidor atiende a todos los comercios en un solo proceso).
- **No hay prueba automática del front.** La lógica de fotos vive dentro del modal (≈2.950 líneas) y hoy solo se prueba el servidor; ver tareas 4.3 y 4.4.

## No-goals

- Descargar la foto y guardarla en el almacenamiento de Katuq (espejo con descarga segura): fase 2 aparte.
- Subir las fotos como archivos dentro del Excel o de un ZIP.
- Fotos por color o por variante.
- Importar fotos de clientes, categorías o inventario (la columna de imagen de categorías es otra y no cambia).
- Cambiar el formulario de producto, el borrado de fotos o la exportación de productos.
- Tocar Shopify, WooCommerce, Osmosis, los flows, el inventario, los precios o las listas de precios.
- Una pantalla para que el comercio encienda la bandera (la enciende Daniel con `scripts/set-company-feature.js`).
- Endpoints, colecciones, cachés o módulos «v2» nuevos.
- Retirar el camino viejo de fotos armadas en el navegador (se retira con la bandera).

## Decisión

**D-385** (el número lo asigna quien haga el commit, mirando `specs/CONTRACT.md` del remoto; el último visto en la copia local el 2026-10-08 es D-377). Texto propuesto para `specs/CONTRACT.md`:

> **Importar productos con fotos por enlace (bandera `productImportPhotos`, apagada de fábrica).** El importador de productos acepta dos columnas opcionales de foto (principal y adicionales) solo en las empresas con `featureFlags.productImportPhotos: true`. El servidor valida el texto del enlace (https, sitio público, sin credenciales, máximo 2.048 caracteres, ni archivo ni página), convierte los enlaces de compartir de una foto de Drive y Dropbox, guarda hasta 8 fotos por producto en `crearProducto.imagenesPrincipales` y no descarga ni visita nada (sin SSRF). Con la bandera apagada el importador y su respuesta son idénticos a los de antes (prueba «dorado»). Sin colecciones, endpoints ni cachés nuevos; no toca inventario, precios, Shopify ni WooCommerce. Pendientes: revisión independiente, compilar el front, verificación en FLORECER. Dueño de la bandera: Daniel; retiro propuesto 2027-01-31 (Artículo XII).
