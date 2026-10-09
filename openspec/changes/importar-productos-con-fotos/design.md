## Context

- **El importador hoy.** `POST /v1/onboarding/import-products` (`routers/onboarding.js`: `auth`, `requireJwtTenant`, rol de administrador) recibe del modal `import-modal` lotes de hasta 500 filas. `importProducts` (`controllers/onboarding.js`) asigna o crea la ruta de categorías (D-148), busca los productos existentes de la empresa por referencia (`company == <empresa de la sesión>`, de a 30) y escribe en lotes de 500 con tres modos: `upsert`, `create` y `update`. Al actualizar manda `{ ...producto }` con `update`, así que **reemplaza** los campos de primer nivel que arma desde el archivo, `crearProducto` incluido (los demás campos de la ficha no se tocan).
- **Fotos hoy.** La plantilla no trae columnas de foto. El único camino es el de KAI: `setNestedValue` (front) convierte el texto de una columna que KAI llamó `crearProducto.imagenesPrincipales` o `imagenesSecundarias` en `{ path: '', urls, tipo: 'url', nombreImagen }`, sin validar (acepta cualquier `http(s)://`), y el servidor guarda `product.crearProducto` tal como llega.
- **Quién lee las fotos.** `crearProducto.imagenesPrincipales[].urls` lo leen la tienda pública (`utils/vitrinaProducto.js`; también lee `imagenesSecundarias` y corta en 8), el formulario y los listados del front, la herramienta de fotos de Opttia (`tools/updateProductPhotos.js`) y las sincronizaciones con Shopify y WooCommerce (`services/shopify/mappers/product.js`, `services/flows/nodes/shopify/utils/mapper.js`, `services/woocommerceService.js`), que mandan `urls` como origen del medio.
- **Banderas.** Contrato común de las funciones de la feria (propuesta `banderas-por-comercio`): `featureFlags.<nombre>` en el documento de la empresa; ausente o distinto del booleano `true` es apagada. El servidor lee con `isFeatureEnabled(company, flag)` (`services/companyFeatureFlags.js`, falla cerrada) y la pantalla con `CompanyFeaturesService.isEnabled`. Se enciende por empresa con `scripts/set-company-feature.js` (simulación por defecto).
- **No se midió producción** para esta propuesta: todo sale del código y de las pruebas.

## Goals / Non-Goals

**Goals**
- Que un comercio importe su catálogo con las fotos por enlace y sepa qué enlaces no sirvieron y qué hacer.
- Que un enlace malo nunca frene la importación ni deje al servidor expuesto (SSRF, celdas hostiles, contraseñas en el aviso).
- Que con la bandera apagada el importador sea idéntico, y que lo vigile una prueba y no la memoria de alguien.

**Non-Goals**
- Copiar las fotos al almacenamiento de Katuq (fase 2), subirlas dentro del archivo, fotos por color o por variante.
- Cambiar el formulario de producto, el borrado de fotos, la exportación, Shopify, WooCommerce, los flows, el inventario, los precios o las listas de precios.
- Endpoints, colecciones, cachés o módulos «v2» nuevos.

## Decisions

1. **La bandera se decide en el servidor, por lote, dentro del controlador; no con `requireFeature`.**
   - `requireFeature` es una compuerta de ruta: responde 403 a toda la petición. Esta ruta también sirve la importación de siempre de todas las empresas sin la bandera, y un 403 las bloquearía. Por eso el controlador pregunta con `isFeatureEnabled` y **solo** cuando el lote trae celdas de foto (`photoUrls`) o columnas de foto mapeadas. Un lote sin ellas ni siquiera lee la bandera: cero lecturas y respuesta idéntica.
   - La empresa sale de `req.headers.company`, que `requireJwtTenant` fija con el tenant firmado en el JWT (y rechaza con 403 `TENANT_MISMATCH` si el cuerpo o el encabezado dicen otra). Nunca del cuerpo.
   - Falla cerrada: error de lectura, empresa inexistente o `featureFlags` que no sea un mapa dan «apagada».
   - El front oculta o muestra con su copia de la bandera (se refresca al iniciar sesión); el servidor revalida en cada lote. Si la bandera se apaga a mitad de sesión, el lote se importa sin fotos y la pantalla lo dice («todavía no están activas para tu empresa»).

2. **Claves nuevas `photoUrls.main` y `photoUrls.additional`; no se reutiliza `crearProducto.imagenesPrincipales`.**
   - Con claves propias el servidor sabe qué trae el lote y distingue el texto de una celda de una lista ya armada, y sin validar, en el navegador. Con la bandera apagada el camino viejo queda intacto.
   - Con la bandera encendida, el front redirige a las claves nuevas lo que KAI sugería como imagen principal o secundaria y borra la clave vieja del mapeo; el servidor, en los lotes con fotos, descarta cualquier lista de imágenes armada a mano (probado con una lista con `javascript:alert(1)`).
   - La celda viaja como texto, recortada a 20.000 caracteres por el front; quien valida es el servidor.

3. **El servidor valida el texto y no visita el enlace.**
   - Alternativas descartadas: pedir el enlace (`HEAD` o `GET`) para comprobar que es una foto, o descargarlo y copiarlo a Storage ahora. Las dos obligan al servidor a hablar con sitios arbitrarios (SSRF: direcciones internas, redirecciones, tiempos, tamaños) en un proceso que atiende a todos los comercios. La copia con descarga segura es la fase 2.
   - Costo asumido: el servidor no sabe si el enlace existe, si es una imagen ni si está compartido. Lo dicen la ayuda y el resultado.

4. **Reglas del enlace** (todas sobre el texto, en `functions/utils/productImageUrls.js`):
   - `https://` obligatorio; sitio con nombre público (se rechazan direcciones numéricas en cualquier formato, IPv6, nombres de una sola palabra y terminaciones internas como `.local`, `.internal` o `.lan`); sin usuario ni contraseña; máximo 2.048 caracteres, antes y después de normalizar; fuera las extensiones de archivos que no son foto.
   - **Lista de sitios de página, no lista de sitios permitidos.** Se rechazan los sitios cuyos enlaces son una página que muestra la foto (Instagram, Facebook, Google Fotos, OneDrive, WeTransfer, Canva, Pinterest, iCloud), por sitio **exacto**: la imagen real de esas redes sale de otros sitios y esos enlaces pasan. Cualquier otro sitio público con `https://` pasa (la tienda anterior del comercio, su CDN, Cloudinary…); una lista de sitios permitidos bloquearía usos legítimos.
   - **Drive y Dropbox se convierten solo cuando se puede asegurar que es un archivo.** Drive: `/file/d/<id>`, `/open?id=`, `/uc?id=` o `/thumbnail?id=` pasan a `https://drive.google.com/uc?export=view&id=<id>` (con `resourcekey` si lo traía). Dropbox: `/s/…` y `/scl/fi/…` (y un archivo suelto dentro de una carpeta compartida) pasan a `?raw=1`, conservando `rlkey` y `st`. Carpetas y documentos se rechazan con instrucciones.
   - Separadores de la celda: espacio, salto de línea, `;`, `|`, y la coma **solo** cuando lo que sigue es otro enlace (hay enlaces legítimos con comas, como los de Cloudinary).
   - Salen sin `#fragmento` y con los espacios codificados.

5. **Dónde y cómo se guarda.**
   - `{ urls, nombreImagen, path: "", tipo: "url" }`: la misma forma `{urls, nombreImagen, path, tipo}` del resto del catálogo. `tipo: "url"` es el valor que ya usa el camino viejo del navegador.
   - Toda la galería va en `imagenesPrincipales`, portada primero, porque es la lista que leen el formulario, las sincronizaciones y la herramienta de fotos de Opttia (la tienda lee las dos y corta en 8). `imagenesSecundarias` se devuelve como estaba.
   - `path` vacío a propósito: no hay archivo propio en Storage que borrar, y nada debe intentar borrar un archivo que no es del comercio (un enlace puede apuntar al almacenamiento de otra empresa). El único borrado de archivos que existe (`/v1/media/delete-file`) el front lo llama solo con `path`, y con `path` vacío ni siquiera sale la petición.
   - El nombre sale del título del producto (hasta 100 caracteres): «Camiseta», «Camiseta (2)», «Camiseta (3)»…

6. **Reglas al actualizar** (`buildProductPhotos`, con `existing` = lo que el producto ya tiene):

   | La hoja trae | Resultado |
   |---|---|
   | Ningún enlace válido | El producto queda como estaba (se reportan los que no sirvieron) |
   | Solo portada | Cambia la portada; se conservan las demás fotos |
   | Solo adicionales | Se conserva la portada; las adicionales reemplazan a las otras (sin portada guardada, la primera adicional pasa a ser la portada) |
   | Portada y adicionales | La hoja manda en las dos, hasta 8 |
   | Un enlace que ya era foto del producto | Se queda la foto que había, con su `path` y su nombre |

   - El tope de 8 vale para lo que trae la hoja; las fotos que el producto ya tenía no se recortan.
   - Por qué: una fila sin foto no debe borrarle la foto a nadie, y importar dos veces el mismo archivo debe dejar lo mismo (Artículo IV).

7. **El resultado** viaja en `data.photoImport`, solo si el lote traía celdas o columnas de foto:

   ```json
   { "enabled": true, "productsWithPhotos": 2, "photosSaved": 5, "convertedLinks": 2,
     "issuesTotal": 3,
     "issues": [{ "index": 1, "referencia": "REF-2", "field": "main", "code": "LOCAL_FILE",
                  "value": "foto.jpg", "message": "…qué pasó y qué hacer…" }] }
   { "enabled": false, "ignoredRows": 4 }
   ```

   - `issues` trae a lo sumo 50 por lote (el total real va en `issuesTotal`); `index` es la posición dentro del lote y el front la convierte en la fila del Excel con las filas originales. `code` es para el programa; lo que se lee es `message`.
   - Los avisos de fotos **no** se mezclan con `errors` ni cuentan como fallidos.
   - `value` va recortado a 120 caracteres y con `***@` en lugar de usuario y contraseña. El util no escribe en el log; lo único que el cambio agrega al log es un `console.error` con el mensaje del fallo si el util no carga.
   - No se agrega registro de auditoría ni telemetría: el informe vive en la respuesta y en la pantalla (el importador tampoco lo tenía).

8. **Límites y celdas hostiles.** 24 enlaces por celda, 50.000 caracteres de texto por celda (el front ya recorta a 20.000) y 8 fotos por producto. La limpieza de cada enlace es de **una sola pasada**, sin expresiones regulares con retroceso: según el propio util, la primera versión era cuadrática y una celda de 100.000 «>» tardaba unos 4 segundos con el servidor detenido para todos. La prueba exige menos de 100 ms con celdas de hasta ~100.000 caracteres.

9. **Carga defensiva.** El controlador pide `utils/productImageUrls` y `services/companyFeatureFlags` la primera vez que hacen falta, dentro de `try/catch`. Si en un despliegue a medias faltara alguno, el servidor arranca y la importación sigue exactamente como siempre (sin fotos por enlace y sin bloque `photoImport`), en vez de impedir el arranque para todas las empresas. Costo: un `require` perezoso poco habitual en este archivo.

10. **Front.**
    - `loadConfig()` calcula `fotosPorUrlActivas = type === 'product' && features.isEnabled('productImportPhotos')`. Apagada, `config` es **el mismo objeto de siempre** (`productConfig`). Encendida, usa una copia con dos columnas y dos etiquetas más, armada una sola vez porque su referencia va enlazada a un `@Input` (no es una caché de datos).
    - `ofrecerCamposDeFotos()` deja siempre las dos filas en el mapeo, redirige lo de KAI y sugiere columnas (nombre de fotos **y** enlaces en las primeras 50 filas; «adicionales», «secundarias», «extra», «galería» o «foto 2…» para la segunda). Sin columna asignada, la fila lleva una explicación de que es opcional (cómo se pinta, en la desviación 2 de la decisión 11).
    - `acumularFotos()` suma el informe de cada lote y guarda hasta 200 enlaces con problema para la lista.
    - Sin HTTP nuevo: usa el `ImportApiService` de siempre (servicio existente de la raíz, que no hereda de `BaseService`; su cabecera explica por qué el importador no puede usar `HttpClient` desde el componente: en un módulo lazy la petición saldría sin el interceptor). Sin `setTimeout` ni cachés nuevas.
    - Alternativa descartada: un componente aparte para las fotos. Necesita el mismo estado (archivo, columnas, mapeo, filas originales); partirlo obligaba a pasarlo todo por `@Input` y `@Output` en un modal que ya tiene referencias frágiles (ver el comentario de `camposObligatorios`). Queda la pregunta 6.

11. **UI según el sistema de diseño** (`openspec/specs/design-system/spec.md`).
    - **Cumple:** íconos PrimeIcons (`pi-image`, `pi-exclamation-triangle`), sin gradientes, ninguno de los colores prohibidos (el cambio no agrega SCSS ni estilos en línea), textos en español claro (qué pasó y qué hacer, sin códigos), y la lista de problemas va en la pantalla de resultado y no en un aviso que se cierra, porque la persona tiene que anotar las filas e ir al Excel.
    - **Desviación 1, justificada:** el bloque nuevo reutiliza `.pendientes-categorias`, `.pendiente-item` (con `.aviso`), `.duplicados-archivo` y `.duplicados-lista`. Esas clases ya existen en `import-modal.component.scss` y traen los colores del modal viejo (`#8b5cf6`, `#faf5ff` y `#e9d5ff`; ámbar `#d97706`, `#fffbeb` y `#fde68a`) y radio de 8px (el sistema pide 11 o 16). El bloque queda al lado del de categorías, que usa las mismas clases; mezclar dos paletas en una pantalla se vería peor que un modal coherente. Alinear todo el modal al tema canónico es otra propuesta (el sistema de diseño dice que los módulos existentes se alinean progresivamente). Alternativa: un SCSS pequeño del tema canónico (par Info `#1E6FD9` / `#E7F1FF` para el resumen, par Alerta `#D9820A` / `#FFF1DF` para los avisos, radio 11px).
    - **Desviación 2, por revisar en pantalla:** las dos filas de foto sin columna llevan confianza 0 y el modal las pinta como a cualquier mapeo de confianza baja (etiqueta roja «0%»). Son opcionales y la explicación lo dice, pero pueden leerse como error.
    - **Detalle:** los encabezados de las columnas dicen «URL» y el resto del texto dice «enlace». Los encabezados tienen que coincidir entre la plantilla, el mapeo y la hoja de instrucciones, así que no se cambian sin necesidad.

12. **Pruebas.**
    - Servidor, sin red, con Firestore simulado y sin credenciales: `productImageUrls.test.js` (50 verificaciones) e `importProductsPhotos.test.js` (24), con `node tests/onboarding/<archivo>` desde `functions/`.
    - **«Dorado»:** es el contract test del importador de siempre (Artículo VIII). Lo que responde y escribe el importador para un lote sin fotos está congelado con valores sacados del controlador de `HEAD` (no calculados con el código nuevo), en los tres modos y con la bandera ausente, vacía, en `false` y encendida. Falla si el importador de siempre cambia.
    - El simulador de Firestore revienta si se toca una colección inesperada, el write-set se comprueba con `soloProducts` y la red (`http`, `https`, `net`, `dns`, `fetch`) está reemplazada por funciones que revientan.
    - Front: **ninguna**. Ver tareas 4.3 y 4.4.

13. **Encendido, apagado y retiro.** Se enciende por empresa con `node scripts/set-company-feature.js "FLORECER" productImportPhotos on --execute` (lo corre Daniel). **Apagar es el mismo comando con `off`**: el servidor lo aplica en el siguiente lote y la pantalla en el siguiente inicio de sesión, sin desplegar. Dueño: Daniel; retiro propuesto 2027-01-31 (Artículo XII, la misma fecha que propone `banderas-por-comercio` para todo el catálogo), junto con el camino viejo de fotos armadas en el navegador. La garantía de que solo se enciende con el script depende de que esa propuesta cierre la llave con punto de la ficha de empresa (tarea 1.3).

## Risks / Trade-offs

- **[Importación masiva de productos]** → ver Risks de `proposal.md`; la prueba «dorado» y la carga defensiva son la red de seguridad.
- **[Fotos alojadas fuera de Katuq]** → asumido en esta fase; la fase 2 las copia. Mientras tanto, la ayuda y el resultado dicen cómo compartir la foto.
- **[Enlace de Drive como imagen]** → no verificado en vivo; se comprueba en FLORECER (tarea 6.4).
- **[Una pestaña vieja con la bandera recién apagada]** → el lote se importa sin fotos y la pantalla lo dice; nada se rompe.
- **[Lógica dentro de un componente de ~2.950 líneas, sin prueba]** → es el costo de no partir el modal; ver la pregunta 6.
- **[Un enlace «válido» que no es una imagen]** → no se puede saber sin visitarlo; la foto sale rota en la tienda y el comercio la corrige o la quita en el formulario del producto (ver la pregunta 3).

## Migration Plan

1. Aprobar esta propuesta y responder las preguntas abiertas.
2. Revisión independiente del diff del backend y del front (tareas 5.1 y 5.2).
3. Compilar el front y reiniciar el backend en local.
4. Dejar el contrato de banderas (`banderas-por-comercio`) en el repo antes o junto con este cambio, y con la llave con punto cerrada antes de encender nada (tareas 1.1 y 1.3).
5. Commit del backend y del front, archivo por archivo (nunca `git add -A`: otras sesiones editan los mismos repos y `onboarding.js` puede traer cambios ajenos cuando se haga).
6. Desplegar y **encender solo FLORECER**; verificar (sección 6 de `tasks.md`).
7. Decidir, comercio por comercio, si se enciende para alguien más antes del 15 de octubre. Un comercio con Shopify o WooCommerce conectado necesita primero la prueba descrita en los riesgos.
8. **Reversa:** apagar la bandera (`off`). No hay datos que migrar ni deshacer: las fotos ya guardadas siguen siendo fotos normales del producto.

## Open Questions

1. ¿Se enciende para algún comercio real antes de la feria o solo FLORECER?
2. **Sin columna de fotos, reimportar deja sin fotos al producto existente** (hoy, y también con la función encendida; la nota del mapeo lo advierte). ¿Se quiere que, con la función encendida, la ausencia de columnas **conserve** las fotos? Obliga a leer la bandera en todos los lotes (una lectura más por lote) y cambia el comportamiento de hoy para esas empresas. ¿O basta con exigir una casilla «Entiendo, importar igual», como en categorías?
3. **`deleteImg` filtra por `path`** (`crear-productos.component.ts`, llamado desde `crear-productos.component.html` con `img?.path`): todas las fotos por enlace tienen `path` vacío, así que quitar una quita del formulario todas las que lo tengan vacío (hasta guardar). Es el mismo defecto de D-131 y ya afecta a las fotos de WooCommerce y Osmosis. El arreglo (borrar por posición) está en un archivo con parches pendientes de otra función.
4. ¿Hace falta la fase 2 (copiar la foto al almacenamiento de Katuq con descarga segura) antes de abrir la función a comercios con Shopify o WooCommerce?
5. **UI:** ¿se acepta la desviación visual (clases heredadas del modal) o se agrega un SCSS pequeño del tema canónico? Y las filas de foto sin columna: ¿se oculta su etiqueta de confianza?
6. ¿Se extrae la lógica de fotos del modal (`pareceColumnaDeFotos`, `esColumnaDeFotosAdicionales`, `acumularFotos`, armado de las dos filas) a un módulo puro, con prueba `node --test` estilo `tests/productos/`? El Artículo IX y «módulos con SRP» lo piden; Angular 14 no tiene `@if` ni signals.
7. ¿Se retira el camino viejo (fotos armadas en el navegador y guardadas sin validar) al retirar la bandera? Hoy sigue vivo con la bandera apagada y, en el servidor, en los lotes sin celdas de foto.
8. ¿Retiro de la bandera el 2027-01-31, como las demás de la feria?
9. **Fuera de alcance, anotado:** `POST /v1/media/delete-file` (`routers/media.js`) exige sesión pero no comprueba de qué empresa es el archivo, y acepta `path` o una `url`. Hoy nadie lo llama con una foto por enlace, pero como un enlace puede apuntar al almacenamiento de otra empresa, conviene revisarlo aparte.
