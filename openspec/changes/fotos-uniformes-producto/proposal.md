# Fotos de producto uniformes (TX-37, ticket 1252)

> Estado: **aprobada como D-501** (Daniel, 2026-10-18; ver «Decisión» al final y `specs/CONTRACT.md`). Diseño, specs, tareas y valores por defecto aprobados en bloque el mismo día.
>
> **Fase 1: implementada y desplegada apagada.** Backend 9d54be86, en producción dentro de a10d1279; front ff69f29c, en la versión 2026.10.18.12. Sin la bandera `productPhotoUniform`, las rutas responden 403 y la pantalla no muestra nada. El modo quedó en **`off`**, no en `shadow` como decía el diseño, porque la variable no se definió (desvío registrado en `design.md`, anexo §F D3 y tarea 5.2). Falta para encender: 0.2 a 0.5, la revisión en el navegador y la orden de Daniel.
>
> **Estado de la ampliación (21-oct, bloques TX37-B01 a B15): implementada en commits locales y apagada** (interruptores `productPhotoUniformMode`, `productPhotoCopyMode` y bandera `productPhotoBackground` en Firestore, sin proveedor de IA). Falta el visto bueno de Daniel a los diffs sensibles, la revisión en el navegador y encenderla. Entrada de cierre en `specs/CONTRACT.md`.
>
> **Ampliación D-518 (21-oct): aprobada en bloque por Daniel el 21-oct** (front 014d1b62; asentada en `specs/CONTRACT.md` con la entrada del cierre; 7.0 sigue sin [x] hasta que Daniel la confirme). El ticket se reabrió el 20-oct y Daniel aprobó las decisiones TX-37·1 a TX-37·7 de D-518. Esta propuesta las diseña en la sección «Ampliación D-518» (abajo), en `design-ampliacion.md`, `design-fase-1b.md`, `design-fase-2.md`, tres specs nuevas, el anexo §G y las tareas 7 a 10. Lo aprobado el 18-oct no cambia salvo donde se marca «→ D-518».

## Por qué

Hoy cada foto entra como llega: de celular, de Cereza, de un enlace de Drive o de la importación por Excel. Por eso la tienda, el catálogo por link, los feeds y las cotizaciones muestran fondos, tamaños y encuadres distintos. D-488 solo alivió el render: muestra entera la foto que se recortaría más de un 25 % (`img.kq-encajada`, `utils/siteHtml.js:3403`). La foto sigue dispareja, y el comercio solo puede arreglarla con un editor externo, una por una.

## Qué cambia (por fases)

**Fase 1, sin IA, detrás de su propia bandera por comercio (D-385, nace apagada y se prueba en FLORECER):**

- **«Uniformar fotos»** en la lista de productos (sobre una selección o una categoría) y en el editor del producto.
- **Pocas opciones:** proporción (1:1, 4:5 o 3:4), fondo (blanco, gris claro o el color de la marca) y margen.
- **Proceso de cada foto:**
  - quita los bordes de color parejo;
  - centra el producto en un lienzo del fondo elegido;
  - comprime a WebP con variantes, reusando `utils/siteImagenes.js` (sharp, 320/640/1280/1920 px);
  - quita los metadatos, incluida la ubicación del celular.
- **Vista previa** del antes y el después de una muestra, sin escribir nada. Luego se aplica en lote, con progreso y un resumen de procesadas, omitidas y con aviso.
- **Original conservado:** se revierte por foto, por producto o por lote.
- **Aviso de baja calidad,** informativo y sin IA, también al subir una foto normal:
  - poca resolución: lado menor bajo un umbral;
  - foto borrosa: medida de nitidez.
- **Límite honesto:** sin IA no se quitan fondos con escena (una mesa, una pared). La fase 1 uniforma encuadre, proporción, peso y bordes parejos. Con fondo liso ya queda uniforme.

**Fase 2, quitar el fondo con IA, detrás de otra bandera y de un interruptor del servidor** (→ D-518: el interruptor vive en `config/feature_flags`, no en el `.env`; diseño en `design-fase-2.md`):

- **Proveedor:** se conecta a `services/media/backgroundRemoval.js`. La interfaz ya existe sin proveedor desde D-385 y está blindada: nunca lanza, tiene un límite de 20 s y valida lo que devuelve el proveedor.
- **Pantalla:** dice «Quitar fondo», nunca el nombre del proveedor (Artículo VI).
- **Gasto:** la vista previa solo cobra la muestra. Lo procesado se guarda como la foto que se aplicará (no es caché), y aplicar no vuelve a pagar.

## Alcance y fuera de alcance

**Entra:**

- la acción en el catálogo y en el editor;
- el procesamiento en el backend;
- el original y la reversión;
- los avisos de calidad;
- las dos banderas;
- la auditoría por lote.

Sin tocar a sus lectores, las fotos procesadas llegan a la tienda, a `feed.xml` (Google/Meta), al catálogo por link y a las campañas. (→ D-518 TX-37·7: Meta solo acepta JPEG o PNG; que el feed le mande JPEG de cada foto es un arreglo aparte en F2-20.) Todos leen `imagenesPrincipales[].urls` por `utils/vitrinaProducto.js` → `primeraImagen` (`controllers/sites.js:1785`, `controllers/catalogos.js`). También llegan al editor de cotizaciones del front.

**No entra (No-goals):**

- **Shopify:** el flow solo rellena fotos si allá no hay ninguna (`shopify-product-upsert.action.js:519-525`). Llevarlas allá toca los flows mixtos de OH MY STORE: otra propuesta.
- **Syncs:** no cambian la frecuencia, la cobertura ni el contenido de los de Cereza, Osmosis, WooCommerce o fulfillment.
- **Fotos nuevas:** no se generan fotos, fondos de escena con IA ni 3D.
- **Otros datos del producto:** no se tocan precios, inventario, variantes, categorías ni textos.
- **Storage:** no se borra ningún archivo.

## Datos y write-set

**Dónde viven hoy las fotos:**

- **`crearProducto.imagenesPrincipales`:** arreglo ordenado de `{ urls, nombreImagen, path, tipo }`; la primera es la portada.
  - **Formulario de producto:** convierte a WebP en el navegador (`crear-productos.component.ts:848`) y sube por `/v1/media/upload`.
  - **Importación por Excel:** guarda enlaces (`utils/productImageUrls.js`, `tipo: "url"`, `path: ""`), sin copia en Storage.
  - **Otros que escriben:** la herramienta MCP `update_product_photos`, WooCommerce, fulfillment y Osmosis.
- **`exposicion.imagenes`:** el canónico de los flows (`{ url, alt }`). Shopify lo prefiere (`flows/nodes/shopify/utils/mapper.js:441-453`); la vitrina no lo lee.

**Conservar y revertir (opción A, recomendada):**

- **Dos llaves nuevas por foto:** `original: { urls, path }` y `procesado: { ajuste, version, fecha, por }`.
- **Revertir:** devolver `original` a `urls`.
- **Reprocesar:** siempre desde el original, así la foto no se degrada.
- **Lectores:** solo miran `urls` y no cambian. Verificado en la vitrina, el mapper de Shopify (`img.urls || img.url`) y la herramienta MCP.

**Opción B, el versionado de Storage, no sirve solo:** es de todo el bucket, no sabe a qué producto pertenece cada versión y de todos modos exige un mapa para revertir. Sí se mantiene la regla de no borrar el original (`tools/updateProductPhotos.js:169`).

**Write-set cerrado:**

- **Se escribe:**
  - en `products`: `crearProducto.imagenesPrincipales`, `exposicion.imagenes` si se decide (pregunta 3), `user_edit`, `date_edit` y la marca de procesado;
  - en Storage: archivos nuevos en una ruta por empresa;
  - la auditoría del lote.
- **Nada más:** ni precios, ni `preciosPorTipoCliente`, ni inventario, ni categorías, ni variantes, ni integraciones, ni Shopify. Una prueba de contrato fallará si se escribe otra cosa.
- **Lote:** hay vista previa (corrida en seco real), tope por lote y auditoría del antes y el después por producto.

**Que un sync no pise la foto procesada.** Hoy la pisan dos caminos:

- Osmosis reescribe `imagenesPrincipales` en cada actualización (`osmosisProductSyncService.js:361`).
- `katuq-product-upsert` hace `set(..., { merge: true })` con el arreglo del flow (`katuq-product-upsert.action.js:306`).

Opciones:

1. **Excluir.** La fase 1 deja fuera los productos de empresas con un sync que escribe productos. La detección ya existe (`sincronizacionQueEscribeProductos`, `tools/updateProductPhotos.js:52`). Es la más segura y no toca el 360.
2. **Guarda como `_precioManualOverride`** (D-069, `katuq-product-upsert.action.js:105-127`). Si el origen trae las mismas fotos originales, se conserva la procesada; si trae otras, se reemplaza y queda «por reprocesar». Toca código de sync: cambio aparte, de a uno, con diff aprobado.
3. **Solo avisar,** como la herramienta MCP. No cumple el criterio del ticket.

## Riesgos

- **WebP fuera del navegador:**
  - **WhatsApp:** el bot manda la portada como imagen (`services/whatsappBotDispatcher.js:987`), y la API de WhatsApp acepta JPEG y PNG.
  - **Correo:** las plantillas usan las fotos (`services/notifications/templateHelpers.js`), y Outlook de escritorio no muestra WebP.
  - **Meta:** falta confirmar si su catálogo acepta WebP. (→ D-518: confirmado en la documentación oficial para desarrolladores, `developers.facebook.com/docs/commerce-platform/catalog/fields`: `image_link` y `additional_image_link` van en JPEG o PNG, de 500 × 500 px como mínimo. El feed ya falla hoy con las WebP del formulario; el arreglo es TX-37·7, aparte, en F2-20.)
  - **Mitigación:** una portada JPEG adicional. Antes, medir si el WebP que ya sube el formulario falla hoy.
- **CPU:** sharp corre en el proceso que atiende a todos los comercios. El lote va fuera de la petición, con poca concurrencia, un tope por lote y un tiempo límite por foto.
- **Recorte equivocado:** blanco sobre blanco se recorta mal. Se mitiga con la vista previa, la exclusión por foto y la reversión.
- **Enlaces externos** (CDN de Cereza, Drive, Dropbox): hay que descargarlos y algunos ya no existen. Esos se reportan como omitidos, sin frenar el lote.
- **Divergencia:** si solo se procesa `imagenesPrincipales`, Shopify y la tienda muestran fotos distintas.
- **D-488:** con una sola proporción habrá menos fotos «encajadas». Hay que verificar las plantillas.
- **Módulos sensibles:** no se tocan pedidos, inventario ni consecutivos. D-134 no aplica (esto es catálogo), pero los flows mixtos de OH MY STORE sí reescriben fotos.

## Seguridad

- **Empresa:** sale solo del tenant firmado en el JWT, como en `fichaDesdeFoto`. Cada lectura y escritura verifica `company`.
- **Archivos:**
  - las procesadas van a una ruta por empresa, con un nombre único que genera el servidor;
  - no se borra ningún original.
- **Descargas:**
  - solo desde hosts de imagen permitidos (→ D-518, pendiente: la fase 1b copia desde cualquier servicio o tienda anterior, como piden TX-37·3 y F5-30·2, y reemplaza esta lista por los controles de descarga de la revisión privada; pregunta 12);
  - con topes de tamaño y de tiempo;
  - el formato se valida por los bytes (sin SVG).
- **Telemetría:** a auditoría, nunca a `console.log`. Ningún log lleva enlaces con token ni la imagen (Artículos VII y XI).
- **Fase 2:** si la foto sale a un tercero, primero se revisa la política de privacidad (pendiente de `ficha-desde-una-foto/design.md` §8).
- **Roles:** aplicar y revertir en lote, solo para los roles que se definan.

## Costo

| Opción | Dónde corre | Costo por foto | Calidad | Nota |
|---|---|---|---|---|
| Fase 1: sharp | Backend actual (`sharp ^0.33.5` ya instalado) | Sin IA: CPU y Storage (variantes de ~50-150 KB) | Buena con fondo liso | Sin proveedor nuevo |
| 2a: Bedrock, Amazon Nova Canvas (quitar fondo), vía ADK | ADK; su `litellm` ya trae el adaptador de Nova Canvas | Del orden de US$0,04-0,06 (verificar tarifa). → D-518: lista oficial de AWS, imagen a imagen, US$0,04 a 1024 px estándar y hasta US$0,08 a 2048 px premium (`design-fase-2.md`) | Alta | Cumple D-257; la foto no sale de AWS |
| 2b: modelo abierto propio (U²-Net/BiRefNet, MIT/Apache) | ADK o una máquina aparte | Sin costo por foto; 2-10 s de CPU y ~1 GB de RAM | Media-alta; flojo en vidrio y pelo | En la EC2 compartida puede frenar a Opttia |
| 2c: servicio externo | Tercero | ~US$0,02-0,20 según plan | Alta | Excepción a D-257 y revisión de privacidad |

Escala: OH MY STORE tiene ~8.200 productos con varias fotos cada uno, así que uniformarlo con la 2a costaría cientos de dólares. Por eso la fase 2 descuenta del cupo de IA, valida la foto antes de gastar (como `validarFotoAntesDelCupo`) y paga una sola vez por foto.

## Preguntas para Daniel (18-oct, respondidas)

Daniel las respondió al aprobar en bloque los valores por defecto P1 a P9 del anexo §F (CONTRACT, D-495 a D-503, 18-oct). Se conservan como registro.

1. ¿Proporción y fondo por defecto? ¿El ajuste se guarda por comercio (en `companies`) o se elige en cada lote?
2. Syncs: ¿excluir (1), guarda tipo D-069 (2) o solo avisar (3)?
3. ¿Se procesa también `exposicion.imagenes` para que la tienda y Shopify no diverjan?
4. Proveedor de la fase 2: ¿Nova Canvas vía ADK, modelo propio o externo con excepción a D-257?
5. Cobro de la fase 2: ¿cupo de IA del plan, cobro por foto o incluida en los planes de pago?
6. Auditoría y progreso del lote: ¿colección existente o una nueva (requiere tu aprobación)?
7. ¿Portada JPEG adicional para WhatsApp, correo y Meta?
8. ¿Umbrales de baja resolución y de foto borrosa?
9. ¿Qué roles pueden aplicar y revertir en lote?

## Ampliación D-518 (21-oct) — aprobada en bloque el 21-oct

### Por qué

El ticket se reabrió el 20-oct: el cierre fue un error porque faltaban encender la fase 1 y hacer la fase 2 (comentario 3 de Daniel). Al releerlo desde la fuente, la fase 1 quedó corta frente al ticket en cinco puntos: no está «en el editor» del sitio; no trata marcas de agua y logos, que el ticket nombra; deja fuera las fotos por enlace y las sin dueño (probablemente la mayoría de las de ALMARA, el caso del ticket); topa la categoría en 100 productos y la busca por subcadena; y saca a todo comercio con cualquier integración, aunque no toque fotos. D-518 decidió cada punto.

### Qué cambia (decisiones aprobadas de D-518 → diseño)

| Decisión | Qué se diseña | Dónde |
|---|---|---|
| D-505 y D-518 (reglas comunes) | `PRODUCT_PHOTO_UNIFORM_MODE` y `BACKGROUND_REMOVAL_PROVIDER` salen del `.env` y pasan a `config/feature_flags`. El modo se mueve ya (tarea 0.6, paso 3 del orden de D-518), sin esperar la aprobación del resto, para poder encender la sombra de la fase 1 | `design-ampliacion.md` §A1; `design-fase-2.md` §F2.1 |
| TX-37·1 | El mismo diálogo en el editor del sitio (sección «Productos»; «Catálogo completo» solo si Daniel lo confirma, pregunta 4) y en Catálogos por link | `design-ampliacion.md` §A5; spec `product-photo-batch-scope` |
| TX-37·2 | Fase 1: aviso «posible marca de agua o logo», sin IA. Fase 2: el logo suelto sobre el fondo se quita con el recorte | `design-ampliacion.md` §A6; `design-fase-2.md` §F2.4 |
| TX-37·3 | Fase 1b: copiar las fotos por enlace, adoptar las sin dueño con una copia propia, y que Tienda en un paso y las herramientas MCP guarden la empresa | `design-fase-1b.md`; spec `product-photo-ownership` |
| TX-37·4 | Series automáticas de lotes de 100; categoría por ruta exacta con sus subcategorías | `design-ampliacion.md` §A3 y §A4 |
| TX-37·5 | Excluir solo las integraciones que escriben fotos; OH MY STORE y CAFE ESCOBAR siguen fuera | `design-ampliacion.md` §A2; spec `product-photo-uniform` (requisito modificado) |
| TX-37·6 | Fase 2 con el recorte de fondo de Amazon Nova Canvas por Opttia/ADK, costo por foto de la lista oficial de AWS (US$0,04 a 1024 px estándar), cupo mensual por plan y encendido solo con el OK de Daniel al costo | `design-fase-2.md`; spec `product-photo-background-ai` |
| TX-37·7 | Feed JPEG para Meta | **Fuera de este cambio:** arreglo aparte en F2-20. Dependencia de la revisión de Meta (tarea 5.4) |

TX-37·8 (variantes con `srcset` en la tienda) es de TX-34 (`tienda-celular-y-velocidad`, D14), que ya cuenta con las variantes de este cambio.

### Fuera de alcance (se suma a los No-goals de arriba)

- Quitar marcas o logos **encima** del producto (exige pintar lo de debajo; otro costo y otra propuesta).
- Que la lista de productos filtre por ruta exacta: sigue por subcadena; el diálogo muestra el conteo del servidor.
- Escribir dueño en archivos viejos sin dueño (backfill de metadatos): se copian cuando un lote los usa.
- Variantes de tamaño de las fotos **no** uniformadas: no son de este cambio; las decide TX-34 en su pregunta P6 (`tienda-celular-y-velocidad/proposal.md`). TX-37·8 (pintar el `srcset`) también es de TX-34.
- Que la importación por Excel y `importar-productos-con-fotos` dejen de crear enlaces: su propia fase 2 puede usar la pieza de copia de la fase 1b cuando se apruebe. Mientras, esas fotos se copian cuando un lote las usa.
- El aviso de calidad al subir sigue solo en el editor completo (D7, aprobado): no llega a la creación rápida (`crear-producto-lite`) ni a la importación por Excel.
- Encender el recorte de fondo en «ficha desde una foto».
- Llevar fotos a Shopify y procesar `exposicion.imagenes`: siguen fuera.

### Dependencias

- **TX-37·7 (F2-20):** el feed manda a Meta una versión JPEG de cada foto. Arreglo aparte; la revisión de Meta de la tarea 5.4 depende de él.
- **TX-37·8 (TX-34, `tienda-celular-y-velocidad`, D14):** pinta el `srcset` de las variantes que genera este cambio.
- **F5-30 (`importador-migracion-tiendas`, `design-fotos.md`):** usa la pieza de copia de la fase 1b (tarea 8.1) y su límite de descargas por proceso.

### Módulos sensibles y write-set

No se tocan pedidos, pagos, reserva, inventario ni consecutivos; D-134 no aplica. Cada parte declara su write-set (`design-ampliacion.md`, `design-fase-1b.md` y `design-fase-2.md`) y lo vigila `writeset.contract.test.js`. Van con diff aprobado por Daniel, de a uno, y con pruebas de caracterización antes del código: la exclusión por integraciones (7.5, amplía quién recibe escrituras en `products`), las series en `batchStore` (7.7), `update_product_photos` (8.4), la copia en el lote (8.5), el cupo del plan con su devolución (9.7) y el lote con IA (9.8). El script de configuración escribe en `config/feature_flags`, que también guarda el interruptor de stock de WooCommerce: solo toca sus llaves y una prueba lo vigila (0.6).

### Riesgos nuevos

- **Costo de IA:** acotado por el cupo mensual por empresa (que vale 0 si falta), la estimación al crear el lote, la sombra sin llamadas, el recorte guardado que no se vuelve a pagar, la devolución cuando el proveedor no responde y la vista previa con IA solo para administradores.
- **Carga del proceso compartido:** las series corren con el semáforo de una foto a la vez de la fase 1, que queda solo para `sharp`. Las descargas de 1b y las llamadas al proveedor van fuera de él, con su propio límite por proceso.
- **Enlaces muertos y almacenamiento:** las copias ocupan espacio; 8.0 lo dimensiona.
- **FLORECER como piloto:** sus fotos ALM- pueden ser de Almara (`not_owned`); 0.4 y 8.0 lo confirman.
- **Lista y diálogo con conteos distintos** por la ruta exacta (dicho en pantalla).
- **Cupo contra «una categoría completa»:** con un cupo bajo, una categoría grande con «Quitar fondo» se rechaza al crear el lote (pregunta 6).
- **Seguridad:** descargas externas, adopción de archivos y herramientas MCP. **Ver revisión privada** (`wt-back-tickets-web/openspec/changes/fotos-uniformes-producto-seguridad/`). Dos huecos de hoy, sin relación con TX-37, se recomienda corregirlos aparte y ya.

### Cambios tras la revisión (21-oct)

Una crítica independiente revisó la ampliación contra el código. Se aplicó:
- el modo se lee **sin caché** antes de cada producto, para cumplir el requisito aprobado «se detiene antes del siguiente producto» (A1);
- una sola función de cierre de lotes, para que ninguna serie quede esperando para siempre (A4);
- la fase 2 guarda el recorte por la huella del origen: la vista previa no se vuelve a pagar al aplicar ni después de revertir, como pide D-501 (F2.2). La excepción a «vista previa sin escrituras» queda marcada;
- el modo pasa a Firestore como tarea propia (0.6), sin atar la sombra de la fase 1 a la aprobación de la IA;
- la exclusión usa una lista cerrada de nodos sacada del código, con `sub-flow` resuelto, depende de 0.3 y es sensible (A2);
- el adaptador del índice a `rutaDelProducto` y la fuente del árbol (A3);
- descargas y proveedor fuera del semáforo de CPU; el límite de descargas vive en la pieza de copia (B1, F2.2);
- la regla «solo hosts permitidos» se marca como reemplazada (pregunta 12);
- en la fase 2: cupo ausente = 0, devolución y parada si el proveedor cae, vista previa con IA solo para administradores, topes de entrada del modelo;
- el script de configuración no reemplaza el documento compartido;
- referencias de código corregidas, «Catálogo completo» y la proporción sugerida pasan a preguntas, Meta confirmado, `detectarSync` al empezar cada parte y menos detalle de seguridad en este repo.

No se aplicó, con su motivo:
- «`aliaddo` cuenta para el producto pero no para los flows»: es correcto así. El nodo `aliaddo-fulfillment-create` solo crea envíos y no escribe fotos; la llave `aliaddo` en el producto sí viene del operador que importa catálogo.
- «Falta una pregunta a Daniel sobre las variantes de las fotos no uniformadas»: ya existe, es la P6 de TX-34. Aquí solo se cita.

### Preguntas para Daniel (ampliación)

Cada una con la recomendación; ninguna reabre una decisión de D-518.

1. **Revertir una foto que vino por enlace o sin dueño:** ¿vuelve la copia en Katuq (la misma imagen) o el enlace? **Recomiendo la copia:** el enlace puede morir. El enlace queda anotado.
2. **«Adoptar» las sin dueño:** ¿confirmas que se haga con una copia propia, sin cambiarle el dueño al archivo de origen? **Recomiendo sí** (motivos en la revisión privada).
3. **Tope de una serie:** **recomiendo 2.000 productos (20 lotes de 100).** Más grande, el diálogo pide elegir una subcategoría.
4. **Editor del sitio, sección «Catálogo completo»:** D-518 nombra la sección de productos y Catálogos por link. ¿También se ofrece en «Catálogo completo», eligiendo la categoría dentro del diálogo? **Recomiendo sí**; si no, solo la sección «Productos».
5. **`update_product_photos` con un enlace:** ¿lo copia a Katuq al aprobar, con la misma pieza del importador? **Recomiendo sí**, para no seguir creando fotos externas. Es un diff sensible (8.4).
6. **Cupo mensual de «Quitar fondo» por empresa y alcance por defecto.** Con 250 usos al mes, una categoría de 340 productos con 3 fotos (unos 1.000 usos) se rechazaría al crear el lote, y el criterio del ticket es «una categoría completa». **Recomiendo Freemium 10 y planes pagos 500, con «Quitar fondo solo en la portada» como opción por defecto** (340 usos, unos US$13,60), y «todas las fotos» a elección. Máximo por empresa: US$20 al mes con la tarifa de 1024 px. Nunca ilimitado.
7. **Calidad contra costo:** ¿la foto va al modelo a 1024 px (US$0,04) y la máscara se agranda a la foto original? **Recomiendo sí**; 9.1 lo valida con 10 fotos antes de tu OK.
8. **Encender el proveedor solo para uniformar fotos** y no para «ficha desde una foto», donde nadie usa el resultado. **Recomiendo sí.**
9. **Resultado de «Quitar fondo»:** ¿siempre sobre el fondo opaco elegido, nunca transparente? **Recomiendo sí:** la tienda, los feeds y la portada JPEG lo necesitan.
10. **Cupo agotado a mitad de un lote:** **recomiendo detener el lote o la serie** (reversible) y no seguir sin IA, para no dejar media categoría distinta.
11. **Conteo de solo lectura en ALMARA FELICIDAD** (8.0, solo metadatos, sin descargar ni escribir), además de FLORECER, para dimensionar la fase 1b con el caso del ticket. **Recomiendo autorizarlo.**
12. **Descargas de la fase 1b:** lo aprobado el 18-oct decía «solo desde hosts de imagen permitidos». TX-37·3 y F5-30·2 piden copiar desde cualquier servicio o tienda anterior. ¿Confirmas reemplazar esa lista por los controles de descarga de la revisión privada? **Recomiendo sí**: una lista fija dejaría fuera las tiendas que se migran.
13. **Proporción sugerida desde el editor del sitio:** ¿el diálogo empieza en la proporción de fotos que usa el sitio (F2-17)? TX-37·1 no lo pide. **Recomiendo sí**, porque evita fotos «encajadas» en la tarjeta; la persona la puede cambiar.
14. **Vista previa con «Quitar fondo»:** gasta cupo real. ¿Solo para administradores y solo con el modo en `on` (en sombra se muestra la estimación sin llamar al modelo)? **Recomiendo sí a las dos.**

## Decisión

> **D-501 (aprobada por Daniel el 2026-10-18) — Fotos de producto uniformes.**
>
> - **Fase 1, sin IA:** encuadre, proporción, fondo liso, WebP y aviso de calidad. Va con una bandera por comercio que nace apagada y se prueba en FLORECER.
> - **Fase 2, quitar el fondo con IA:** con otra bandera, el interruptor del servidor y el proveedor que se apruebe, solo vía Opttia/ADK.
> - **Original y write-set:** el original se conserva y se puede revertir. El write-set se limita a las fotos del producto, y los syncs se manejan con la opción elegida.
> - **Banderas:** tienen dueño y se retiran según el Artículo XII.


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
