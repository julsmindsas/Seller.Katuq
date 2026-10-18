# Fotos de producto uniformes (TX-37, ticket 1252)

> Estado: **aprobada como D-501** (Daniel, 2026-10-18; ver «Decisión» al final y `specs/CONTRACT.md`). El diseño y las tareas están en revisión. Todavía no hay código ni escrituras en Firestore.

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

**Fase 2, quitar el fondo con IA, detrás de otra bandera y de un interruptor del servidor:**

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

Sin tocar a sus lectores, las fotos procesadas llegan a la tienda, a `feed.xml` (Google/Meta), al catálogo por link y a las campañas. Todos leen `imagenesPrincipales[].urls` por `utils/vitrinaProducto.js` → `primeraImagen` (`controllers/sites.js:1785`, `controllers/catalogos.js`). También llegan al editor de cotizaciones del front.

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
  - **Meta:** falta confirmar si su catálogo acepta WebP.
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
  - solo desde hosts de imagen permitidos;
  - con topes de tamaño y de tiempo;
  - el formato se valida por los bytes (sin SVG).
- **Telemetría:** a auditoría, nunca a `console.log`. Ningún log lleva enlaces con token ni la imagen (Artículos VII y XI).
- **Fase 2:** si la foto sale a un tercero, primero se revisa la política de privacidad (pendiente de `ficha-desde-una-foto/design.md` §8).
- **Roles:** aplicar y revertir en lote, solo para los roles que se definan.

## Costo

| Opción | Dónde corre | Costo por foto | Calidad | Nota |
|---|---|---|---|---|
| Fase 1: sharp | Backend actual (`sharp ^0.33.5` ya instalado) | Sin IA: CPU y Storage (variantes de ~50-150 KB) | Buena con fondo liso | Sin proveedor nuevo |
| 2a: Bedrock, Amazon Nova Canvas (quitar fondo), vía ADK | ADK; su `litellm` ya trae el adaptador de Nova Canvas | Del orden de US$0,04-0,06 (verificar tarifa) | Alta | Cumple D-257; la foto no sale de AWS |
| 2b: modelo abierto propio (U²-Net/BiRefNet, MIT/Apache) | ADK o una máquina aparte | Sin costo por foto; 2-10 s de CPU y ~1 GB de RAM | Media-alta; flojo en vidrio y pelo | En la EC2 compartida puede frenar a Opttia |
| 2c: servicio externo | Tercero | ~US$0,02-0,20 según plan | Alta | Excepción a D-257 y revisión de privacidad |

Escala: OH MY STORE tiene ~8.200 productos con varias fotos cada uno, así que uniformarlo con la 2a costaría cientos de dólares. Por eso la fase 2 descuenta del cupo de IA, valida la foto antes de gastar (como `validarFotoAntesDelCupo`) y paga una sola vez por foto.

## Preguntas para Daniel

1. ¿Proporción y fondo por defecto? ¿El ajuste se guarda por comercio (en `companies`) o se elige en cada lote?
2. Syncs: ¿excluir (1), guarda tipo D-069 (2) o solo avisar (3)?
3. ¿Se procesa también `exposicion.imagenes` para que la tienda y Shopify no diverjan?
4. Proveedor de la fase 2: ¿Nova Canvas vía ADK, modelo propio o externo con excepción a D-257?
5. Cobro de la fase 2: ¿cupo de IA del plan, cobro por foto o incluida en los planes de pago?
6. Auditoría y progreso del lote: ¿colección existente o una nueva (requiere tu aprobación)?
7. ¿Portada JPEG adicional para WhatsApp, correo y Meta?
8. ¿Umbrales de baja resolución y de foto borrosa?
9. ¿Qué roles pueden aplicar y revertir en lote?

## Decisión

> **D-501 (aprobada por Daniel el 2026-10-18) — Fotos de producto uniformes.**
>
> - **Fase 1, sin IA:** encuadre, proporción, fondo liso, WebP y aviso de calidad. Va con una bandera por comercio que nace apagada y se prueba en FLORECER.
> - **Fase 2, quitar el fondo con IA:** con otra bandera, el interruptor del servidor y el proveedor que se apruebe, solo vía Opttia/ADK.
> - **Original y write-set:** el original se conserva y se puede revertir. El write-set se limita a las fotos del producto, y los syncs se manejan con la opción elegida.
> - **Banderas:** tienen dueño y se retiran según el Artículo XII.
