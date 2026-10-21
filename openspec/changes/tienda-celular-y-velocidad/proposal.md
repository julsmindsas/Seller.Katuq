# La tienda en el celular: encontrar, saber el envío, no perder la compra y cargar rápido

> Ticket **TX-34** (nro 1249, cd `Es2985T0VnVBc95LqY2D`), «Experiencia del comprador pensada
> primero para celular». Interno de Julsmind, abierto el 12-oct por Daniel; reabierto el 21-oct
> (comentario 2), y lo pendiente sigue en este mismo ticket (D-518, T·1).
> Es la propuesta que pide D-518 **TX-34·1**: todo lo pendiente, para aprobación de Daniel.
> No es para implementar todavía. El número de decisión lo asigna quien la registre en
> `specs/CONTRACT.md`.
> Aplica las decisiones aprobadas de D-518: **TX-34·2 a TX-34·9**, **TX-37·8** (este cambio
> conecta las variantes con `srcset`), **F2-42·8** (buscar en los atributos va aquí) y **T·2**
> (el pago rechazado se une de último entre los cambios que tocan `crearPedido`, `/pagar` y la
> reserva). No las vuelve a preguntar.
> Toca **pedidos, pagos y reserva** en el pago rechazado, en la copia del pedido sin pagar y en el
> «Reintentar» del checkout (módulo sensible): ver «Riesgos».
> Los detalles de seguridad están en la revisión privada del backend; aquí solo se dice
> «ver revisión privada».
> Revisada el 21-oct con la crítica de la propuesta: corregidas las citas, la proyección (D1),
> los interruptores (D10), el pago rechazado (D12-D13), el laboratorio (D2) y las preguntas P4,
> P6, P9 y P15; nuevas P19 y P20.

## Why

**Lo que pide el ticket** (descripción del 12-oct, 6 viñetas y 2 criterios):
1. Celular primero: botón de compra fijo, menú en cajón lateral, filtros en panel deslizable,
   áreas táctiles de 44 px o más y textos legibles sin zoom.
2. Buscador con autocompletar, tolerante a errores, que busque en nombre, marca, categoría y
   atributos.
3. Filtros y orden por precio, novedad y más vendidos.
4. Costo de envío visible antes del checkout («calcula tu envío»), precio con IVA y tiempos
   de entrega.
5. Estados resueltos: agotado («avísame»), búsqueda sin resultados (con sugerencias), pago
   rechazado (reintentar sin perder el carrito) y error de red.
6. LCP menor a 2,5 s en 4G, CLS menor a 0,1 e INP menor a 200 ms, aun con miles de productos.

Criterios: Lighthouse en celular con Rendimiento y Buenas prácticas de 90 o más «en las
plantillas», y una compra completa en celular sin zoom ni desplazamiento horizontal. El
ticket no tiene adjuntos (verificado el 21-oct).

**Lo que ya está hecho** (comentario 1 del 16-oct y D-461, publicado con backend `dd49e067` +
`53b43b2b`; se conserva y no se vuelve a hacer):
- La compra portada → ficha → carrito → checkout a 390 px, en 5 sitios, sin desplazamiento
  horizontal (revisión a mano, sin prueba guardada).
- Campos de 16 px en pantallas de hasta 767 px (`utils/siteHtml.js:3033`), así el iPhone no
  amplía la página.
- La foto de portada se precarga desde la cabecera (`precargaDePortada`, `siteHtml.js:400`).
- Buenas prácticas de 96 a 100. Rendimiento **bimodal** con el mismo código: 97–100 o 78–86,
  cuando el primer pintado espera ~2,4 s. No se reproduce en Playwright con CPU 4x y 4G.
- Ya existían antes de TX-34: barra de compra fija en la ficha a 640 px o menos
  (`.ficha__barra`, `siteHtml.js:3839-3846`), panel de filtros deslizable a 899 px o menos,
  «Avísame cuando llegue» en agotados (`POST /avisame`, crea un prospecto en el CRM), «Precio
  con IVA incluido» en la ficha (`siteHtml.js:885`) y el tiempo de entrega en ficha y tarjeta
  (`siteHtml.js:888` y `1245`, F2-45, D-445).

**Lo que falta** (comentario 1, comentario 2, el informe de D-518 y su crítica, verificado
contra el código el 21-oct; el detalle con archivo y línea está en `design.md`):
- **Render en frío de catálogos grandes.** FLORECER (2.166 productos) tarda de 1,5 a 7,6 s sin
  caché (D-461). lino-y-lona tardó 5,26 s en frío y 0,022 s en caliente (medido con `curl` el
  21-oct). El índice se lee entero por empresa con caché de 5 min y el HTML solo 60 s. El
  catálogo más grande es el de OH MY STORE (8.568). El comprador mayorista con sesión
  (`?acceso=`) nunca usa la caché del HTML. Y la copia del HTML se separa por el
  identificador de clic de cada anuncio (`fbclid`, `gclid`, `utm_*`), así que quien llega por
  pauta siempre recibe un render en frío (hallazgo de esta propuesta).
- **Rendimiento estable de 90** con el método de TX-34·6. INP nunca medido. Nunca se midió por
  plantilla ni con el aviso de cookies, que viene encendido en los sitios nuevos desde D-463.
- **Fotos de producto sin `srcset`:** la tarjeta pinta el original de Storage, todas en
  `loading="lazy"`, también la primera fila (`fichaDeProducto`, `siteHtml.js:1180`). Solo las
  fotos del constructor tienen variantes (`srcsetDe`, `siteHtml.js:380`). TX-37 crea variantes
  WebP para las fotos uniformadas (apagado, D-501) y la tienda no las usa (TX-37·8). Las fotos
  **no** uniformadas no tienen dueño: TX-37 las dejó fuera de su alcance
  (`fotos-uniformes-producto/proposal.md`, «Fuera de alcance») y el comentario 1 las deja
  pendientes en TX-34. En vivo, la portada de lino-y-lona es un JPEG original de 110 KB (P6).
- **Buscador:** hoy es una subcadena sin tildes en título y referencia (`consultarCatalogo`,
  `controllers/sites.js`). No tolera errores, no busca en marca, categoría ni atributos, no
  ordena por coincidencia y no tiene lista de sugerencias.
- **Orden:** solo «Lo más relevante» (que no ordena nada), precio ascendente y descendente.
- **Envío antes del checkout:** en modo zonas el carrito dice «Según tu ciudad» y el precio de
  la zona solo aparece en los datos del checkout. La ficha no muestra envío. Varias plantillas
  prometen «El costo y el tiempo de entrega los ves antes de pagar» (`data/siteTemplates.js:65,
  581, 696, 788, 1190`), y el carrito y el checkout no muestran el tiempo.
- **Menú en cajón lateral:** no existe. En celular las categorías son una fila horizontal y los
  enlaces se ocultan si hay categorías (`siteHtml.js:3106-3125`). Sin categorías, los enlaces se
  parten en varias líneas. F1-10 prometía «menú propio para celular» y no se hizo.
- **Áreas táctiles bajo 44 px:** +/− del carrito 26 px, «Quitar» sin relleno, flechas de página
  40 px, botones de carrito y favoritos de la cabecera ~31 px, ✕ de los paneles y chips.
- **Textos legibles sin zoom** (viñeta 1): ningún requisito lo cubría; hay textos de control
  chicos, como «Quitar» con 0,8 rem (`siteTienda.js:51`).
- **Estados:** búsqueda sin resultados solo con un texto; el catálogo falla en silencio sin red
  («una busqueda fallida deja lo que ya se veia», `siteHtml.js:4969`); pago rechazado: la página
  de gracias solo dice «Escríbenos» y ofrece «Seguir comprando», y **el carrito se vacía antes
  de ir a la pasarela** (`siteTienda.js:1138`, `vaciar();pintarGracias(r)`): quien vuelve atrás
  desde la pasarela, o pierde la redirección, se queda sin carrito y sin nada para retomar el
  pago hasta el correo de los 20 a 55 minutos, si sale.
- **La baliza `/vista` cuenta robots y navegadores sin interfaz** (`registrarVista`): medir con
  Lighthouse o PageSpeed en producción le suma visitas al comercio y al reporte semanal de KAI.
- **Vista previa del editor:** `sitio-render` es espejo de `siteHtml.js` («al tocar aquí, tocar
  allá») y no tiene los 16 px ni el cajón.
- **No hay prueba automatizada** de la compra en celular: `tests/sitios/rendimientoMovil.test.js`
  solo cubre los 16 px y la precarga, y no está en ningún script de `package.json`.

## What Changes

Cinco capacidades. Cada requisito cita su fuente en su spec.

1. **Celular primero** (`tienda-celular`)
   - Menú en cajón lateral en celular (767 px o menos) para todas las tiendas, en lugar de la
     fila horizontal, y también en la vista previa del editor (TX-34·5).
   - 44 × 44 px o más en cada control del sitio publicado en celular, y textos legibles sin
     zoom (P20).
   - Los elementos fijos (barra de compra, carrito flotante, WhatsApp, aviso de cookies, KAI) no
     se tapan entre sí ni tapan el botón de compra.
   - El panel de filtros se cierra también con Escape y tocando fuera. «Limpiar todo» y la
     selección múltiple son de F2-42 y no se duplican aquí.
   - Una prueba automatizada repetible de la compra completa a 360 y 390 px.
2. **Buscador y orden** (`tienda-buscador-y-orden`, TX-34·4 y TX-34·8, F2-42·8)
   - Tolera tildes, mayúsculas y un error de tipeo. Busca en nombre, referencia, marca,
     categoría y, con F2-42 encendido, atributos. Ordena por coincidencia y respeta las
     categorías ocultas.
   - Autocompletar mientras se escribe.
   - Orden por novedad (fecha de creación) y más vendidos (ventas de 30 días calculadas por una
     tarea nocturna), como campos del índice.
   - Sin resultados: corrección del término, categorías y un camino para seguir.
3. **Envío y entrega antes de pagar** (`tienda-envio-y-entrega`, TX-34·2 y TX-34·9)
   - «Calcula tu envío» en ficha y carrito con las zonas que ya existen, más recoger en tienda.
     Sin zona: «Te confirmamos el envío por WhatsApp». La transportadora va después (F2-15).
   - El carrito y el checkout muestran el tiempo de entrega, salido del producto.
4. **Estados que no dejan tirado al comprador** (`tienda-estados`, TX-34·3)
   - Pago rechazado: «Reintentar pago» en `/gracias` por `/pagar`, sobre el mismo pedido y la
     misma reserva.
   - Pedido sin pagar: mientras la reserva viva, la tienda le recuerda al comprador que volvió
     sin pagar «Tienes un pedido sin pagar · Pagar»; con la reserva vencida, «Volver a armar mi
     carrito» (P15).
   - Error de red con «Reintentar» en catálogo, búsqueda y checkout, sin perder filtros,
     búsqueda ni carrito. El del checkout reenvía el pedido: es sensible y va de último.
   - «Avísame» en agotados: ya existe; se comprueba en celular.
5. **Velocidad medible** (`tienda-velocidad`, TX-34·6, TX-34·7 y TX-37·8)
   - Laboratorio local reproducible: mediana de 3 corridas, portada, catálogo y ficha de cada
     plantilla, con el aviso de cookies encendido.
   - Render en frío: primero leer menos (campos mínimos) en una proyección que usa todo lo
     público de la tienda (catálogo, ficha, feed, sitemap, KAI), con un solo cálculo de precio
     de vitrina, y medir. Si no alcanza, el resumen por empresa de TX-34·7, con aprobación de
     Daniel (P4).
   - La copia del HTML deja de separarse por los parámetros de campaña: quien llega por un
     anuncio también la usa.
   - `srcset` con las variantes que existan (y la precarga de la ficha con el mismo `srcset`),
     la primera fila sin carga diferida y medidas reservadas. Las variantes de las fotos
     originales, según P6.
   - La baliza `/vista` descarta robots y navegadores automatizados.

**Interruptores** (D-505: en Firestore, nada en el `.env`): el modo de cada pieza (`lightIndex`,
`search`, `salesRanking`, `paymentRetry`, `drawer`, `shippingEstimate`) y su kill switch van en
el interruptor global `config/feature_flags.storeMobile`; qué tiendas la tienen va en una bandera
por empresa en `companies.featureFlags` (`storeLightIndex`, `storeSmartSearch`, …), con el
registro de banderas que ya existe. Los cambios de solo presentación (44 px, textos, estados de
red del catálogo, `srcset`, baliza) van sin interruptor. Todos nacen apagados o en sombra;
FLORECER va primero (D-385). Dueño: Daniel; retiro: 30 días después de encender cada pieza para
todos (Artículo XII). Detalle y dependencias entre piezas en `design.md`, D10.

## Capabilities

### New Capabilities
- `tienda-celular`: cajón lateral, áreas táctiles, textos legibles, elementos fijos sin taparse, cierre del panel
  de filtros, espejo en la vista previa y la prueba de compra en celular.
- `tienda-buscador-y-orden`: buscador tolerante, autocompletar, búsqueda en atributos, orden
  por coincidencia, novedad y más vendidos, y sin resultados con sugerencias.
- `tienda-envio-y-entrega`: «calcula tu envío» en ficha y carrito, recoger en tienda, ciudad sin
  zona, tiempo de entrega en carrito y checkout, y precio con IVA.
- `tienda-estados`: pago rechazado con reintento, promesa del correo solo si sale, pedido sin
  pagar que no volvió a la confirmación, carrito recuperable, error de red y agotado.
- `tienda-velocidad`: método de medición, metas de LCP, CLS e INP, render en frío, imágenes
  responsivas y baliza sin robots.

### Modified Capabilities
_(ninguna spec vigente de `openspec/specs/` describe la tienda publicada. F2-42
`tienda-facetas-comparador` sigue siendo dueña de facetas, conteos, «Limpiar todo» y
comparador; ver `design.md`, «Límites con otros cambios»)_

## No-goals

- Cotizar con transportadora (F2-15; TX-34·2 lo deja para después).
- Que el checkout acepte una ciudad sin zona: sigue como hoy. El aviso de WhatsApp es solo del
  cálculo en ficha y carrito.
- Facetas con conteo, selección múltiple, «Limpiar todo», filtros en la dirección y comparador:
  son de F2-42.
- Filtro y orden por valoración (F2-42·2: ticket propio si se quiere).
- Aviso automático de «volvió a estar disponible» (F2-21 lo dejó fuera). «Avísame» sigue
  dejando el contacto en el CRM.
- El encabezado «recargado» en computador: el ticket lo dice como contexto («qué pasa hoy»),
  no lo pide (pregunta P12).
- Secciones automáticas «Más vendidos» y «Recién llegados» (F2-18) y la etiqueta «más
  vendido» en la tarjeta (F2-45): quedan posibles con los datos de este cambio, pero no se
  construyen aquí.
- Pruebas con personas (TX-38: 5 compradores en celular).
- Cambiar `inventoryService`, la reserva, el barrido de reservas, la conciliación de pagos o el
  cálculo de precios. Escribir `products`, precios, listas de precios o inventario.
- La ruta Angular pública `/s/:slug` (`sitio-publico`): usa el mismo `sitio-render` y recibe el
  espejo, pero no se mide ni se rediseña aparte (pregunta P13).

## Riesgos

- **Pedidos, pagos y reserva (sensible).** Tres piezas los tocan, todas de últimas en la unión
  (T·2: después de F2-41 con sus arreglos, D-496 y suscripciones), con caracterización antes del
  código y diffs uno a uno con aprobación de Daniel:
  - el regreso de la pasarela (de `crearPedido` y de `/pagar`) y lo que pinta `/gracias`;
  - la copia local del pedido sin pagar y del carrito (antes de vaciarlo);
  - el «Reintentar» del checkout, que reenvía el POST que crea el pedido. Si la primera
    respuesta se perdió, solo lo frena la guarda de pedidos gemelos; la caracterización lo fija
    antes y, si no alcanza, va una clave de idempotencia en un diff aparte.
  No cambian la reserva, el barrido, la conciliación ni el inventario. Se coordina con F4-40 D11
  (`/pagar` para los pedidos del bot, con su control propio) y con D-496 (el núcleo de
  `crearPedido` cambia de lugar). Write-set en `design.md`.
- **Rama en movimiento.** `controllers/sites.js`, `utils/siteTienda.js` y `utils/siteHtml.js`
  tienen hoy cambios de F2-41 sin commit en `feature/tickets-web`. Las líneas se revalidaron el
  21-oct después de la crítica y se revalidan otra vez en la tarea 0.4 y al empezar el grupo 4.
- **«Sin caché extra».** En el camino de la tienda, la proyección (D1) cambia tres lecturas y
  tres registros (índice compartido, precios y ofertas de vitrina, fechas del plan gratis) por
  una lectura y un registro, y deja un solo cálculo de precio de vitrina para catálogo, ficha,
  feed, sitemap y KAI. Pero convive con el índice compartido cuando la misma empresa usa el
  Seller o KAI: Daniel lo confirma (P4a).
- **El índice compartido.** `getSearchIndex` lo siguen usando el Seller y
  `tools/searchProducts.js`, y KAI de la tienda solo para puntuar por descripción. Este cambio no
  le quita campos ni le cambia la forma. La sombra compara catálogo, precios, ficha, categorías
  con foto, afines, marcas, plan gratis, feed y sitemap antes de encender.
- **Escribir en `products` reenvía a Shopify** si mueve `date_edit` (lección del ticket 1088 en
  F2-42). Por eso las ventas de 30 días (P1) y, si se eligen, las variantes de fotos (P6) no se
  escriben en el producto.
- **Cambio visible en todas las tiendas.** El cajón reemplaza la fila de categorías en celular
  en todos los sitios publicados (TX-34·5), también entre 601 y 767 px. Interruptor `drawer` para
  volver atrás sin desplegar, y revisión con los ajustes de Estilo de F2-17 (`data-kq-ajustes`).
- **Medir en producción infla visitas** hasta que la baliza descarte robots. El laboratorio
  bloquea balizas y píxeles por patrón, y la baliza puede salir antes que el resto (P19).
- **El backend local lee la Firestore de producción.** El laboratorio no levanta el backend
  contra producción para Lighthouse: usa el render real sobre una Firestore en memoria (P9).
- **Bimodal sin causa conocida.** Puede que «leer menos» no lo resuelva. La tarea 1.2 guarda
  trazas de las corridas lentas antes de cambiar nada.
- **Fotos originales.** Si las variantes de las fotos originales no se hacen (P6 b), el 90 se mide
  con fotos del peso real y puede no alcanzarse por ellas.
- **Seguridad y privacidad:** ver revisión privada (`wt-back-tickets-web/openspec/changes/
  tienda-celular-y-velocidad-seguridad/`). Bloquea las tareas que la citan, y uno de sus
  controles debe entrar en los arreglos de F2-41 antes de unirlo.

## Preguntas para Daniel

Cada una trae la recomendación, que se aplica si se aprueba sin cambios. Los requisitos que
dependen de ellas están marcados **(provisional, Pn)** en las specs.

- **P1. Dónde se guardan las ventas de 30 días** (TX-34·4 dice «campos del índice» y no dónde).
  Recomiendo un documento por empresa en una colección nueva,
  `storeProductStats/{docId de la empresa}` (el docId y no el nombre, que puede llevar «/»),
  con un mapa producto → unidades y la marca `completo`, escrito entero cada noche y leído una
  vez al cargar el índice de la tienda. Las colecciones de Firebase siguen abiertas (ticket
  1320): la regla que la cierra se despliega antes de la primera escritura (ver revisión
  privada). La alternativa, un campo en cada producto, son miles de escrituras por
  noche y arriesga reenviar productos a Shopify. Es una colección nueva: necesita tu
  aprobación explícita.
- **P2. Qué cuenta como venta.** Recomiendo: unidades de pedidos de todos los canales de la
  empresa con fecha de creación en los últimos 30 días, sin anulados, cancelados ni
  rechazados; los de pasarela, solo con el pago aprobado; sin cotizaciones. Cada línea se
  resuelve al producto por su id y, si no, por la referencia (regla de doble conteo); la que no
  se resuelve no cuenta. Si una empresa pasa el tope de lectura, su ranking queda incompleto y la
  tienda no ofrece «Lo más vendido» (`design.md`, D6).
- **P3. «Lo más relevante» sin búsqueda.** Recomiendo dejar el orden de hoy (el del índice)
  para no mover las tiendas publicadas. Con búsqueda, ordena por coincidencia (TX-34·8). La
  alternativa es que, sin búsqueda, salgan primero los más vendidos.
- **P4. Render en frío.**
  - (a) ¿Confirmas que la proyección de tienda cabe en «leer menos» de TX-34·7? Para la tienda
    cambia tres lecturas y tres registros por uno, y deja un solo precio de vitrina para
    catálogo, ficha, feed, sitemap y KAI; pero es un registro distinto del índice compartido y
    convive con él en memoria cuando la empresa usa el Seller o KAI. Recomiendo sí.
  - (b) Si no alcanza la meta, el siguiente paso es el que ya aprobaste en TX-34·7: un resumen
    por empresa, que te presento con la medición antes de construirlo. Recomiendo no cambiar esa
    decisión. Si prefirieras servir el índice vencido mientras se recarga, sería un cambio a
    TX-34·7 y necesitaría un tope de antigüedad (por ejemplo 15 minutos) para no mostrar
    existencias y precios viejos sin límite.
- **P5. Meta del servidor en frío.** Recomiendo HTML en frío en 1 s o menos (mediana) con
  FLORECER y en 1,5 s o menos con OH MY STORE (8.568). Con eso cabe un LCP de 2,5 s en 4G.
  Con caché, 0,2 s como hoy. El comprador mayorista con sesión se mide aparte, sin bloquear.
  Que con esa meta quepa el LCP de 2,5 s no se da por hecho: lo dice la corrida en frío del
  laboratorio (render real con la demora medida, `design.md` D2).
- **P6. Variantes de las fotos originales.** TX-34 conecta el `srcset` donde ya hay variantes
  (TX-37·8). Las fotos que TX-37 no uniforma no tienen dueño: TX-37 las sacó de su alcance
  («solo las uniformadas tienen variantes») y está apagado (D-501); el comentario 1 las deja
  pendientes aquí, y las tiendas reales siguen con originales (lino-y-lona: JPEG de 110 KB en la
  portada). Opciones:
  - (a) TX-34 las genera (`design.md`, D16): una tarea con `--dry-run` primero crea las WebP de
    320/640/1280 junto a cada foto del Storage de Katuq, sin escribir `products`, y anota cuáles
    tienen variantes en una colección nueva, `storeImageVariants/{docId de la empresa}`
    (necesita tu aprobación explícita y revisión contra D-134 y TX-37). Las fotos externas
    quedan como hoy.
  - (b) Se recorta del ticket, con tu decisión anotada, y el 90 se mide también con originales.
  Recomiendo (a): es lo que pide el comentario 1 y el que más mueve el LCP en tiendas reales.
  Mientras tanto, la primera fila sale sin carga diferida y con medidas reservadas.
- **P7. Precio con IVA fuera de la ficha.** F2-45 lo puso solo en la ficha. Recomiendo
  agregar, en el carrito y en el resumen del checkout, «Precios con IVA incluido» cuando todas
  las líneas lo llevan. En la tarjeta no: cargaría la rejilla en celular.
- **P8. Evento «búsqueda sin resultado»** (F3-25 no lo pudo medir). Recomiendo emitirlo con la
  misma baliza de la visita: término sin tildes, hasta 40 caracteres y sin números de 5 o más
  cifras (pueden ser cédulas o teléfonos), solo cuando la búsqueda se envía (Enter, botón o
  página con `?q=`), no mientras se escribe, y una vez por término y por sesión. Mostrarlo en
  «Cómo va» queda para F3-25.
- **P9. Sitios del laboratorio.** Recomiendo sitios de muestra locales, uno por plantilla,
  pintados por el render real del servidor sobre una Firestore en memoria (como las pruebas de
  `tests/sitios`), con un catálogo de prueba de 2.500 productos, fotos del peso real y una
  corrida en frío con la demora medida, sin escribir en producción. El tiempo del servidor con
  datos reales se mide aparte, solo lectura y sin JavaScript (FLORECER, OH MY STORE,
  lino-y-lona). La aceptación es el laboratorio (TX-34·6); PageSpeed en producción, después de
  corregir la baliza, es obligatorio al cerrar y, si sale bajo 90, el ticket no se cierra sin la
  causa y tu decisión.
- **P10. Píxeles en la medición.** TX-34·6 fija el aviso de cookies encendido. Recomiendo la
  corrida oficial sin aceptar cookies (los píxeles no cargan) y una corrida informativa
  aceptándolas, con GTM y Meta, en FLORECER.
- **P11. Ciudad sin zona y tienda sin WhatsApp.** TX-34·2 dice «Te confirmamos el envío por
  WhatsApp». Recomiendo, si la tienda no tiene WhatsApp, «Escríbenos para confirmar el envío a
  tu ciudad» con el correo o teléfono del pie, sin prometer plazo ni costo.
- **P12. Encabezado en computador.** Recomiendo dejarlo fuera de TX-34 (no está entre lo que
  el ticket espera) y abrir un ticket si se quiere tratar.
- **P13. Ruta Angular `/s/:slug`.** Recomiendo solo el espejo del cajón y de los 16 px (sale
  con el mismo componente), sin medirla, si sigue en uso. ¿Se puede retirar?
- **P14. Promesa de las plantillas.** TX-34·9 resuelve el carrito y el checkout, pero si ningún
  producto tiene tiempo de entrega la frase sigue sin cumplirse. Recomiendo que el checklist
  de publicación (F0-01/F0-09) avise al comercio cuando la plantilla promete el tiempo y
  ningún producto vendible lo tiene.
- **P15. El comprador que no vuelve a `/gracias`, y el carrito después de que vence la
  reserva.** TX-34·3 resuelve a quien vuelve de la pasarela a `/gracias`. Pero el carrito se
  vacía antes de ir a pagar, y quien vuelve atrás desde la pasarela, o pierde la redirección, se
  queda sin carrito ni forma de pagar hasta el correo de los 20 a 55 minutos (que puede no
  salir). Recomiendo guardar en el navegador, antes de vaciar el carrito, una copia del pedido y
  sus líneas, sin datos personales:
  - mientras la reserva viva, la tienda muestra «Tienes un pedido sin pagar · Pagar», que abre la
    confirmación de ese pedido con su «Reintentar pago»;
  - con la reserva vencida, «Volver a armar mi carrito».
  La alternativa, no vaciar el carrito hasta que se apruebe el pago, deja dos fuentes (carrito y
  pedido apartado) y cambia el carrito guardado de D-313. Las dos son [S].
- **P16. Contenido del cajón.** Recomiendo: categorías (las mismas de la cabecera, sin
  ocultas), los enlaces del menú (F1-10), «Mi cuenta» y «Favoritos» si la tienda vende, y
  WhatsApp. El buscador y el carrito siguen a la vista en la cabecera.
- **P17. Búsqueda por marca con datos sucios** (F2-44 apagó el filtro de marcas porque salían
  «Katuq» y «ALM-3908»). Recomiendo buscar en la marca siempre (encontrar de más es menos grave
  que no encontrar), pero sugerir marcas en el autocompletar solo si la tienda tiene encendido
  el filtro de marcas.
- **P18. Una sola fuente para la tienda.** El borrador de F2-42 (21-oct) agrega los atributos al
  índice compartido y calcula ahí las facetas; esta propuesta saca a la tienda de ese índice
  (proyección de D1). Recomiendo que, si apruebas la proyección, las facetas de la tienda lean
  de ella y F2-42 no amplíe el índice compartido (el Seller no usa atributos en su búsqueda). Si
  no la apruebas, TX-34 busca en los atributos con el campo que agregue F2-42.
- **P19. La baliza, antes que el resto.** Que la baliza `/vista` deje de contar robots y
  navegadores automatizados no necesita nada más de este diseño, y mientras tanto cada medición
  en producción infla las visitas y el reporte semanal de KAI. Recomiendo que salga ya, con los
  arreglos del paso 3 de D-518, con su prueba, sin esperar la aprobación del resto.
- **P20. Qué es «legible sin zoom».** El ticket lo pide sin cifra. Recomiendo: en celular ningún
  texto visible del recorrido de compra por debajo de 12 px, y los controles con texto («Quitar»,
  chips, enlaces del carrito) en 14 px o más; lo revisa la prueba de compra en celular.


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
