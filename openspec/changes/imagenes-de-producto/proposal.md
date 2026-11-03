# Imágenes de producto: estándar, WebP automático y migración de lo existente

**Estado:** borrador — pendiente aprobación de Daniel
**Tickets:** 1426 (estándar de imágenes de producto) y 1427 (todo a WebP) · **Decisión:** D-629 (por registrar en `specs/CONTRACT.md`)
**Origen:** tickets creados por Daniel el 2026-10-27 (18:12 y 18:14 UTC) por MCP. Ambos con 0 comentarios, sin adjuntos; se citan entre sí y con «importar fotos por referencia» y «galería única».

## Por qué

Se suben JPG, PNG y fotos de celular de varios MB, o de tamaños distintos: la tienda y los catálogos cargan lento, la galería queda dispareja y el almacenamiento crece. El comercio debe poder subir la foto como la tiene; Katuq la deja liviana, del tamaño correcto y en WebP, **sin anunciarlo**: en pantalla solo se sugiere WebP y el tamaño.

## Alcance de esta propuesta

El ticket 1427 abarca toda la plataforma (logos, comprobantes de pago, fotos de entrega del mensajero, adjuntos de tickets, constructor web, perfiles, API/MCP). Cada grupo tiene calidad, dueño y riesgo distintos (comprobantes a calidad 90 y legibles; DIAN sin tocar; módulos de pagos y mensajeros). **Se propone dividir:** este cambio entrega el estándar y el procesamiento central **para fotos de producto** (individual, masiva, combos, MCP, importadores) y deja el servicio listo para que los demás módulos lo adopten en cambios aparte, cada uno con su aprobación. Daniel confirma esta división (pregunta 1).

## Qué ya existe (leído el 2026-11-03, sin consultar datos, D-579)

| Pieza | Dónde | Estado |
|-------|-------|--------|
| Subida central | `POST /v1/media/upload` (`controllers/media.js`): límite 15 MB (`:21`), valida que sea `image/*`, guarda **tal cual** en `Productos/` con la empresa en los metadatos | Sin conversión para productos |
| Conversión a WebP con variantes | carpeta `Sitios` del mismo endpoint (`media.js:145-176`) y `utils/siteImagenes.js`: sharp, lee el formato real por los bytes, corrige EXIF, WebP calidad 82 en 320/640/1280/1920 px, nombre `-w<ancho>.webp`, un solo token | **Es la tubería a reutilizar** para productos |
| Conversión en el navegador | `crear-productos.component.ts:881` `convertToWebP` (calidad 0,8, sin redimensionar), usada en `:860` y `:3155`; si falla, sube el original | Parcial: no cambia tamaño, no corrige EXIF, no conserva el JPG |
| Importar fotos por referencia | `importar-fotos-referencia.component.ts:31-32`: solo JPG, PNG y WebP, **máx. 5 MB** | Choca con el máximo de 15 MB del ticket |
| Aviso de calidad (D-501) | `shared/services/productos/photo-quality.ts`: «foto pequeña» si el lado menor mide **menos de 600 px**, «borrosa» por nitidez; detrás de la bandera `productPhotoUniform` (apagada); el servidor repite el cálculo (`productPhotoUniform.js`) | Umbral distinto al del ticket (800) |
| Uniformar fotos (D-501/D-518) | `fotos-uniformes-producto`: WebP con variantes, portada JPEG de 1280 px, original conservado y reversible | Apagada; **no se duplica**, se coordina |
| JPG bajo demanda | `utils/feedFotoJpeg.js` (feed de Meta/Google): convierte al pedir, sin guardar | Patrón a reutilizar para correos, PDF y canales |
| Galería única (D-385) | lista `crearProducto.imagenesPrincipales` (`utils/productImageUrls.js`), la portada primero | La migración solo toca esta lista |
| Shopify | `services/shopify/mappers/product.js:76` manda `originalSource: img.urls`; en producto **existente** solo agrega fotos si Shopify no tiene ninguna (`shopify-product-upsert.action.js:521-545`) | Ver «Shopify» |
| WooCommerce | `services/woocommerce/mappers/product.js` lee la misma lista | Verificar si acepta WebP |

## Estándar

| Dato | Valor (ticket 1426) |
|------|---------------------|
| Formato sugerido | WebP |
| Tamaño recomendado | cuadrada 1:1 de 1200 × 1200 px |
| Mínimo | 800 × 800 px |
| Peso máximo | 15 MB por archivo |
| Foto | producto centrado, buena luz, fondo limpio |

Mensaje único, en los tres lugares (carga individual, «Importar fotos» y la guía de nombres que se descarga): *«Formato sugerido: WebP. Tamaño recomendado: foto cuadrada de 1200 × 1200 px (mínimo 800 × 800). Peso máximo: 15 MB. Producto centrado, buena luz y fondo limpio.»* No dice que el sistema convierte.

**Qué pasa al subir una foto que no cumple**

| Caso | Respuesta |
|------|-----------|
| Pesa más de 15 MB | Rechazo claro: *«Esta foto pesa 18 MB y el máximo es 15 MB. Reduce su tamaño o sube otra.»* |
| No se puede leer como imagen | Rechazo: *«No pudimos leer este archivo como foto. Sube una imagen JPG, PNG, WebP u otra foto común.»* |
| Lado menor menor de 800 px | Aviso, **no bloquea**: *«Esta foto es pequeña y puede verse borrosa.»* |
| Muy alejada de 1:1 (propuesta: relación mayor de 4:3) | Aviso con vista previa: *«Para mejores resultados usa una foto cuadrada.»* |
| Varias fotos a la vez | El aviso sale por foto, con su nombre; las demás se suben |
| Importar por referencia | El reporte final marca «Con aviso» y «Rechazada» por archivo |

## Qué hace el sistema por dentro (sin anunciarlo)

Acepta JPG/JPEG, PNG, WebP, HEIC/HEIF, GIF estático, BMP y TIFF, y los pasa a WebP (calidad ≈ 80, conserva la transparencia). Corrige la orientación, quita ubicación y cámara, **no agranda**, y genera miniatura (≈ 300 px), media (≈ 800 px) y grande (≈ 1600 px), con la meta de menos de 300 KB la grande. El servidor es la autoridad; la conversión del navegador queda solo para ahorrar subida. Los listados usan la miniatura, las tarjetas la media y el detalle y el zoom la grande; una foto antigua sin derivadas sigue mostrando su URL de siempre.

**Compatibilidad.** WebP en tienda, catálogo link y web, constructor, panel y POS. JPG generado al pedirlo (patrón de `feedFotoJpeg`) en correos, PDF/impresión y canales que no acepten WebP. Para Shopify y WooCommerce se envía lo que cada canal acepte.

## Migración de lo existente (opcional, por lotes, reversible)

1. **`--dry-run` primero y por defecto**, una empresa a la vez: cantidad de fotos, formatos, bytes actuales, ahorro estimado con una muestra, fotos ilegibles, enlaces externos (no se migran) y productos de comercios con flows a Shopify.
2. **Se crean archivos nuevos y se cambia la referencia en `crearProducto.imagenesPrincipales`**; el orden y la principal no cambian, y **no se toca `date_edit`**, para no disparar los flows de producto (mismo criterio de `migrar-galeria-unica-1406.js`). Cada lote deja constancia con las URL de antes y después en `migration_audit`, para revertir.
3. **Los originales no se borran.** Mientras tanto el almacenamiento **sube** (originales más derivadas). El ahorro llega solo con la limpieza.
4. **Limpieza de originales, como paso aparte y con aprobación por empresa:** solo después de verificar (conteo, muestra visual y revisión de otras referencias a la misma URL, como las líneas de pedidos ya hechos, que guardan la foto), y tras un plazo de espera (propuesta: 30 días; pregunta 3).
5. **Reporte por empresa:** convertidas, espacio antes y después, errores.

## Shopify (las fotos se publican allá)

- **Nada se escribe en Shopify.** Shopify guarda su propia copia al importar; la migración no la cambia, así que **no libera espacio en Shopify**.
- Productos que ya tienen fotos en Shopify no las reciben de nuevo (el upsert solo rellena cuando allá hay cero), por lo que la nueva URL no duplica imágenes. Productos nuevos o sin fotos allá reciben la URL WebP; **hay que comprobar con un producto de prueba** que Shopify la acepta.
- OH MY STORE tiene los flows mixtos `cereza-products-to-shopify-a5156643` y `katuq-web-to-shopify`: la migración no los ejecuta ni cambia `date_edit`; su frecuencia y límites no se tocan (D-134).
- **Write-set:** `crearProducto.imagenesPrincipales` de `products`, objetos de Storage de la empresa y `migration_audit`. Prohibido: precios, variantes, inventario, categorías, `date_edit`, Price Lists y cualquier mutación en Shopify o WooCommerce. Cada tarea lleva su prueba de contrato del write-set.

## Fases (cada una se aprueba y se publica por separado)

1. **Mensaje y avisos** (front, sin tocar Storage): estándar visible, avisos suaves, unificar el máximo en 15 MB e incluirlo en «Importar fotos».
2. **Procesamiento al subir** (backend, un solo punto): `media/upload`, la subida por enlace firmado del conector y el sellado de `update_product_photos` pasan por la misma tubería; importación por referencia incluida.
3. **Consumidores** eligen el tamaño y el JPG donde haga falta (tienda, catálogo, POS, correos, PDF, canales).
4. **Migración por lotes**, empresa por empresa, con `--dry-run` y reversa.
5. **Limpieza de originales**, con aprobación aparte.

## No-goals

- Editar fotos (recorte, fondo): es `fotos-uniformes-producto`.
- Descargar y espejar fotos que el Excel trae por enlace externo (hoy solo se valida el texto): queda fuera y se plantea aparte (pregunta 5).
- Convertir PDF, Excel, audio, video, SVG (se sanea), XML/PDF de DIAN, ni los demás módulos del ticket 1427 (cambios aparte).
- Ampliar Shopify, sus límites o sus flows.

## Riesgos

- **HEIC y BMP:** sharp con sus binarios habituales **no decodifica HEIC (HEVC) ni BMP**; hay que probarlo y, si falla, decodificar en el navegador (que sí lee BMP) o usar otra librería. No se promete HEIC hasta probar.
- **Referencias fuera de la lista:** pedidos, carritos y tickets guardan URL de fotos; por eso los originales se conservan hasta la limpieza.
- **Costo y tiempo:** conversión de miles de fotos por empresa (ALMARA tiene 2.261 productos): lotes con tope, reintentos sin bloquear y una empresa a la vez.
- **Dueño de archivos:** la migración solo toca objetos cuya empresa dueña coincide; ver la revisión privada de seguridad de fotos en el repositorio del backend. Las rutas de subida del conector hoy no pasan por el procesamiento y deben incluirse (fase 2).
- **Dos umbrales de «foto pequeña»** (600 de D-501 y 800 del ticket) deben quedar en uno, en front y servidor, con sus vectores de paridad actualizados.

## Diseño y reglas

Aviso y mensaje en el formulario de producto con el tema canónico (acento `#5F3FE0`, plano, avisos en par fuerte/fondo suave, sin gradientes); 1440 y 390 px sin scroll horizontal; textos en `es.json`. Solo presentación en las pantallas: no cambia columnas, filtros ni modales. Nota de versión al publicar (D-567). Pruebas nuevas fuera de git (D-566). Script de migración con `--dry-run` como primera tarea.

## Preguntas para Daniel

1. ¿Confirmas la división del 1427 (productos aquí; comprobantes, entregas, logos, tickets y demás en cambios aparte)?
2. ¿El «mínimo 800 × 800» sustituye el umbral de 600 de D-501? ¿Y «muy alejada de 1:1» es relación mayor de 4:3?
3. ¿Plazo de espera antes de borrar originales (propuesta: 30 días)?
4. ¿El máximo es 1600 px (tres archivos por foto, recomendado) o 2000 px (cuatro)? El ticket menciona ambos.
5. ¿Se espeja a Storage las fotos que llegan por enlace externo del Excel? Hoy no se descargan.
6. GIF animado en productos: ¿primer cuadro estático (propuesta) o se conserva la animación?

## Capacidad

Delta sobre `productos` (`specs/productos/spec.md`).
