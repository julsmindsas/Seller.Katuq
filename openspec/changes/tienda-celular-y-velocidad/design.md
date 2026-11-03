# Diseño — La tienda en el celular (TX-34)

> Ticket TX-34 (nro 1249, cd `Es2985T0VnVBc95LqY2D`). Decisiones aprobadas: D-518 TX-34·2 a ·9,
> TX-37·8, F2-42·8 y T·2. Preguntas P1-P20: `proposal.md`.
> Código leído primero el 21-oct en `wt-back-tickets-web/functions` (rama `feature/tickets-web`,
> HEAD `097ede2e`, entonces con F2-41 sin commit; F2-41 entró después en `c9e74ff0`) y en
> `wt-front-tickets-web/src`. Citas revalidadas el 21-oct, después de
> la crítica; se vuelven a revalidar en la tarea 0.4 y al empezar el grupo 4. Las citas del pago
> y del regreso a `/gracias` (bloque **Pago**, D12) se revalidaron el 21-oct sobre la punta de la
> rama, con F2-41 en ella (`c9e74ff0`) y el arreglo de la revisión privada en commit local, sin
> unir y pendiente de la aprobación de Daniel (tarea 0.4, parte de D12).
> Los detalles de seguridad están en la revisión privada del backend
> (`openspec/changes/tienda-celular-y-velocidad-seguridad/`).
> **Citas revalidadas el 3-nov-2026 (tarea 0.4, bloque TX34-B19)** sobre la punta de la rama
> `feature/tickets-aws-claude-1` (backend `02ccc27c`, front `c134b382`): cada `archivo:línea` de
> «Context» se comprobó con un script contra el código (55 citas, todas en su línea). Se movieron
> sobre todo las de `controllers/sites.js` (de ~7.000 a ~10.700 líneas) y `siteHtml.js`. No se
> tocó ninguna decisión. **No se revalidaron, por depender de la unión de F2-41, D-496 y las
> suscripciones:** el bloque **Pago** de «Context» (las citas de `crearPedido`, `retomarPago`,
> `/gracias`, la reserva y la guarda de gemelos) y D12 y D13; se rehacen en la tarea 4.0.
> «Context» describe el código **del 21-oct**: desde entonces los bloques TX34-B03 (la baliza ya
> descarta robots), B06 (el panel de filtros cierra con Escape y toque fuera; áreas de 44 px y
> elementos fijos), B07 (la tarjeta lleva `srcset`, medidas y primera fila sin carga diferida),
> B13 (el orden suma `novedad` y `mas-vendidos` con su interruptor), B14 y B15 (envío, plazo e IVA
> en ficha, carrito y checkout) y B16 (cajón) cambiaron esos puntos; las líneas citadas siguen
> siendo las de esos fragmentos de hoy.

## Context

**Camino del render publicado** (`controllers/sites.js`):
- `renderPublico` (7226) responde desde `htmlCache` (en memoria, 60 s, 7213) o llama a
  `renderPublicoReal` (7369), que llena el catálogo en el servidor con `consultarCatalogo`
  (7914). Con `acceso`, `pedido` o `vista_previa` no se cachea. El backend corre en
  un solo proceso (`ecosystem.config.js`, `instances: 1`). Detalle de la clave: ver revisión
  privada (S4).
- El catálogo y los bloques salen del índice compartido `getSearchIndex`
  (`controllers/productos.js:135`, TTL 5 min, `select` de ~30 campos con descripción,
  características, garantías, restricciones, etiquetas, `exposicion`, `disponibilidad` y
  `procesoComercial` completos). Lo comparten el Seller (búsqueda por descripción y etiquetas,
  `productos.js:3296-3301`), el feed, el sitemap, KAI (`services/sites/asesorKai.js:55`) y
  `tools/searchProducts.js`.
- Además, la tienda hace por empresa en frío una segunda lectura de todo `products`
  (`cargarVitrinaDeEmpresa`, 9514: `preciosPorTipoCliente` y precio, en `preciosVitrinaCache` y
  `ofertasVitrinaCache`) y, en plan gratis, una tercera (`productosVisiblesDelPlan`, 10269:
  `createdAt`, `fechaCreacion`, en `visiblesCache`).
- Usan índice y precios de vitrina juntos, además del render: `feedProductos` (2020), `sitemap`
  (2225), `asesorKai` de la tienda (10310, que además puntúa por descripción, características y
  etiquetas), `categoriasConFoto` (10062), `productosAfines` (10118), `marcasDeTienda` (10661) y el
  directorio público (`categoriesFor`, 10692).
- `enPaginaWeb` (9914) muestra el producto **sin** objeto `marketplace` y lo oculta si el objeto
  existe sin `paginaWeb: true`. `imagenesCount` (del índice) decide la foto de
  `categoriasConFoto` (10102) y la preferencia de los afines (10159).
- `consultarCatalogo` (10385) filtra en memoria: vendible (`esVendibleEnTienda`), plan gratis,
  oferta, precio, categoría exacta, marca, texto (`normalizarBusqueda(titulo|referencia)
  .includes(q)`), ocasión. Orden **(21-oct; hoy, con B13, también `novedad` y `mas-vendidos` si el
  interruptor lo permite)**: solo `precio-asc` y `precio-desc`; lo demás «cae al orden
  natural del índice». Lee completos solo los 12 de la página.
- D-461: en FLORECER el índice tarda ~3,9 s en cargar y cada documento completo pesa ~14 KB.

**Página y script** (`utils/siteHtml.js`, `utils/siteTienda.js`):
- Cabecera (`siteHtml.js:1414-1560`, el bloque `encabezado`): marca, buscador (GET que funciona sin JS), enlaces, CTA,
  cuenta, favoritos, carrito y la fila `cabecera__cats`. En ≤600 px la fila se desliza y oculta
  los enlaces (`3286-3301`). Botones de cabecera con `padding:.35rem` e ícono de 20 px (~31 px,
  `3606-3607`).
- Catálogo (`2715-2879`): buscador con espera de 350 ms (`5458`), orden de 3 opciones (`2847-2850`;
  hoy 3 más las de `opcionesDeOrdenNuevas`),
  panel de filtros que se cierra con ✕ o al elegir un chip (`5520-5551`), no con Escape ni
  tocando fuera **(21-oct; hoy, B06, también cierra con Escape y toque fuera)**. `traer()` descarta la petición si hay otra en vuelo y falla en silencio
  (`5417`).
- Tarjeta (`fichaDeProducto`, `1311-1389`): `<img loading="lazy">` sin `srcset` ni medidas
  **(21-oct; hoy, B07, `attrsResponsivos` pone `srcset` y medidas y la primera fila no lleva
  `loading="lazy"`)**,
  tiempo de entrega (`1385`). Ficha: «Precio con IVA incluido» (`998`; hoy solo si `p.ivaIncluido`, B14/B15), plazo (`1001`), barra
  fija ≤640 px (`4053-4061`) que sube carrito y WhatsApp.
- Aviso de cookies: fijo, `z-index:80`, en ≤760 px a todo el ancho y `bottom:88px` (`3193-3205`).
- Carrito (`siteTienda.js`): +/− de 26 px (`48`), «Quitar» sin relleno y con letra de 0,8 rem
  (`51`), ✕ con relleno
  `0 .3rem` (`39`). Envío: `envio()` (`713`) da `null` en modo zonas sin zona → «Según tu
  ciudad» (`950`). Las zonas se cargan al entrar a «Tus datos» (`cargarZonas`, `666`) desde
  `GET /public/:slug/zonas` (`zonasPublicas`, `controllers/sites.js:2512`; maestro `zonacobro`,
  sin tiempo de entrega). Al crear el pedido: `vaciar();pintarGracias(r);` y a los 1,2 s a la
  pasarela (`1464-1465`). Si el comprador vuelve atrás desde la pasarela, o la redirección falla,
  el carrito ya está vacío y no hay nada en la tienda para retomar el pago.
- Baliza: `navigator.sendBeacon(api+'/vista')` (`siteHtml.js:4525`) → `registrarVista`
  (`controllers/sites.js:5734`): sin filtro de robots; suma `vistasCount`.

**Pago** (`controllers/sites.js`):
- `crearPedido` genera el enlace de Wompi con un regreso a `gracias?pedido=N` (3686). `/pagar`
  (`retomarPago`, 6053; se entra por `renderPublico`, 7090) revisa el estado del pedido y
  reenvía a Wompi con el enlace vigente o uno nuevo; su regreso es el mismo (6229). Cómo se
  autoriza `/pagar` y qué viaja en cada dirección: ver revisión privada.
- La reserva dura `RESERVA_TIENDA_MINUTOS` (60, 5849) y el barrido también vence los
  rechazados (D-312). Un rechazo deja `estadoPago: "Rechazado"` y el pedido vivo hasta el
  barrido (`aplicarPagoDeTienda`).
- `/gracias` lee el pedido de la empresa (`datosDeConfirmacion`, 5550) y el bloque `gracias`
  (`siteHtml.js`, ~1946) dice «Tu pago no se completó… Escríbenos» y solo ofrece «Seguir
  comprando».
- **F2-41 (en la rama, `c9e74ff0`, bandera apagada)** ya pinta en `/gracias` el reintento de un pedido a cuotas
  (`enlacesDeReintentoCuotas`, 5029) y solo promete el correo de rechazo si salió
  (`avisoRechazoEnviado`, 5589). El correo de los pedidos de Wompi es el recordatorio único de los
  20 a 55 minutos (`sitePagoPendiente`, `ESTADOS_RECORDABLES`), que depende de un cron y el
  comercio puede apagar.
- **F4-40 D11** (`pedido-whatsapp-con-link-de-pago`) habilita `/pagar` para los pedidos del bot,
  con un control propio dentro de `retomarPago`, y concilia el regreso a `/gracias`. **D-496**
  extrae el núcleo de `crearPedido`: el regreso de 3686 cambia de lugar.
- `crearPedido` cierra el carrito guardado del comprador (`cerrarCarritoAlComprar`, 6623,
  llamado en 3538), así que el rearmado de D-313 (`?carrito=<id>&t=`) no sirve después de comprar.
- Un segundo envío idéntico del checkout lo frena la guarda de gemelos
  (`orderService.buscarPedidoGemeloReciente`, huella por documento o celular, líneas y total, en
  una ventana corta; devuelve el pedido con `_duplicadoEvitado`, y `crearPedido` no vuelve a
  descontar inventario, 3288). Es de mejor esfuerzo, y D-496 anota que en un gemelo la tienda
  repite otros efectos (otro enlace, contadores).

**Vista previa del editor** (`wt-front-tickets-web`): `sitio-render.component.ts:33-40` es
«ESPEJO DE functions/utils/siteHtml.js». El editor simula el celular con la clase
`.sitio--movil` (`sitio-render.component.scss:267`, `895`), no con media queries. La ruta
pública Angular `/s/:slug` (`app-routing.module.ts:185`) usa el mismo componente.

**Datos que ya existen:** `products.createdAt` o `fechaCreacion` (insignia «Nuevo»,
`utils/vitrinaProducto.js`, `esNuevo`); `products.attributes` (F2-42, D-495, bandera
`categoryAttributes` apagada); `exposicion.masvendido` es una marca **manual** del Seller
(`productosPaginated.js:351`), no un cálculo; `productOrderIndex` guarda ids de pedidos por
producto sin cantidades ni fechas, no sirve para 30 días. Índice de Firestore
`orders(company, fechaCreacion)` ya existe (`firestore.indexes.json`).

## Decisions

### D1. Proyección de tienda: una lectura mínima para todo lo público (TX-34·7)
- `services/sites/indiceTienda.js` (nuevo): `indiceDeTienda(company, {atributos})` lee
  `products` de la empresa con un `select` solo de lo que usa la tienda: referencia, marca,
  título, `categoriasIndex`, `exposicion.activar`, `exposicion.disponible`, `marketplace`
  **entero** (son tres booleanos; leer solo `marketplace.paginaWeb` haría salir publicado un
  producto con `marketplace` sin `paginaWeb`, ver `enPaginaWeb`), `disponibilidad.inventariable`,
  `disponibilidad.cantidadDisponible`, `disponibilidad.tiempoEntrega`, `procesoComercial.ocasion`,
  `precio.precioUnitarioConIva`, `precio.precioUnitarioIva`, `preciosPorTipoCliente`,
  `crearProducto.imagenesPrincipales` (de ahí salen `imagenesCount` y la primera foto, que usan
  `categoriasConFoto`, los afines y `/sugerencias`), `createdAt`, `fechaCreacion` y, solo con
  `categoryAttributes`, `attributes`. Calcula ahí mismo el precio y la oferta de vitrina (las
  funciones puras de `utils/vitrinaProducto.js`) y las palabras de búsqueda (D4). Los bytes de
  `imagenesPrincipales` se miden en la tarea 1.3.
- **Todo lo público lee de aquí:** `consultarCatalogo`, `categoriasConFoto`, `productosAfines`,
  `marcasDeTienda`, `productosVisiblesDelPlan`, la ficha, `feedProductos`, `sitemap` y el
  directorio público. `asesorKai` de la tienda toma de aquí lo vendible y el precio, y sigue
  leyendo de `getSearchIndex` solo la descripción, las características y las etiquetas para
  puntuar (solo si la tienda lo encendió). Así hay **un solo cálculo de precio de vitrina** y
  KAI no puede dar otro precio que el catálogo.
- Un solo registro por empresa con el TTL de 5 min de hoy. Con `lightIndex` en `on` se borran
  `preciosVitrinaCache` y `ofertasVitrinaCache`, y `visiblesCache` se calcula desde la
  proyección sin otra lectura. **No es una capa más para la tienda: pasa de tres lecturas y tres
  registros a una y uno.** Sí convive con `getSearchIndex` cuando la misma empresa usa el Seller
  o KAI; la proyección es más chica (sin descripción, características, garantías, etiquetas ni
  objetos completos). El Seller, `tools/searchProducts.js` y la búsqueda del Seller no cambian.
- Se invalida donde hoy se invalida el índice (`invalidateSearchIndex`) y al publicar.
- Modo `storeMobile.lightIndex` (D10): `off` (hoy), `shadow` (calcula los dos, sirve el de hoy y
  registra las diferencias, sin datos del comprador), `on`. La sombra compara: ids, orden y
  totales de cada página del catálogo; **precio y oferta de vitrina** de cada producto servido;
  `categoriasConFoto`, afines, `marcasDeTienda`, vendible y precio de la ficha, el conjunto del
  plan gratis y los conjuntos del feed y del sitemap.
- **Primero se mide** (tarea 1.3): tiempo de cada lectura y bytes, por etapa del render. Si la
  meta de P5 no se alcanza, el segundo paso es el aprobado en TX-34·7, un resumen por empresa,
  y se presenta a Daniel con la medición antes de construirlo (P4b).
- **Choque con F2-42 (P18).** El borrador de F2-42 del 21-oct (en edición en esta rama) agrega
  `attributesObj` al índice compartido para todos sus consumidores y calcula las facetas sobre
  él. Si la proyección se aprueba, las facetas de la tienda deben leer de la proyección (que ya
  trae `attributes` con la bandera), para no tener dos fuentes en la misma página. Lo decide
  Daniel antes de implementar cualquiera de los dos.

### D2. Medición reproducible (TX-34·6)
- `scripts/laboratorio-tienda/` (backend, solo herramientas de desarrollo):
  - Render **real**: el servidor local llama a `renderPublico` del controlador sobre la Firestore
    en memoria de las pruebas (`scripts/lib/firestoreFalsa`, como `tests/sitios/
    compraAhoraRender.test.js`), así la página pasa por `renderPublicoReal` →
    `consultarCatalogo` como en producción. También responde `/catalogo`, `/sugerencias`,
    `/zonas`, `/vista` (204 sin escribir) y `/relacionados` por el mismo controlador. No escribe
    en Firestore real.
  - Sitios de muestra: uno por plantilla (las 15 de `data/siteTemplates.js`: 13 +
    `producto-unico` + `tecnologia-catalogo`), sembrados en esa Firestore con un catálogo de
    prueba de 2.500 productos (P9). Las fotos imitan las de producción: originales JPEG del peso
    y tamaño medidos en la tarea 0.5 y, donde aplique, variantes como las del constructor y de
    TX-37.
  - Dos corridas por página: **caliente** (copia del HTML vigente) y **fría** (caché vaciada y
    la Firestore en memoria con la demora por lectura medida en la tarea 1.3), para que la meta
    «aun con miles de productos» se mida de punta a punta.
  - Lighthouse fijo en 12.2.1 y Chromium fijo, perfil móvil por defecto (4G simulado, CPU 4x).
    Mediana de 3 corridas por página: portada, catálogo y ficha de cada plantilla. Aviso de
    cookies encendido y sin aceptar (P10). Balizas y píxeles bloqueados por patrón.
  - INP: flujo de usuario de Lighthouse en modo «timespan» con interacciones reales (abrir el
    cajón, escribir en el buscador, agregar al carrito, abrir el carrito).
  - Guarda el JSON de cada corrida y, si una corrida sale bajo 90, la traza, para entender el
    bimodal de D-461 (primer pintado esperando ~2,4 s).
- **PageSpeed en producción, obligatorio al cerrar** (tarea 6.3, después de corregir la baliza):
  portada, catálogo y ficha de FLORECER y de una tienda con fotos originales. La aceptación sigue
  siendo el laboratorio (TX-34·6); si PageSpeed sale bajo 90, el ticket no se cierra sin la causa
  y la decisión de Daniel.
- `scripts/medir-render-frio.js --dry-run`: solo lectura contra producción, sin ejecutar JS (no
  pasa por la baliza). Tiempo del HTML en frío y en caliente de FLORECER, OH MY STORE y
  lino-y-lona, y por etapa con la proyección. Corre con `CRON_ENABLED` apagado.
  **Ajuste al construirlo (bloque TX34-B04):** `--dry-run`, que es el modo por defecto, corre sobre
  la Firestore en memoria con las tiendas del laboratorio. La lectura de producción es
  `--real --sitios …` y queda bloqueada hasta el OK de Daniel.
- Herramientas como `devDependencies` con versión exacta. No van al servidor.
  **Desvío (bloque TX34-B04):** no van en las `devDependencies` de `functions/`, porque
  `functions/node_modules` es un enlace a otro repositorio y ahí no se instala nada. El laboratorio
  tiene su propio `package.json` y `package-lock.json` en `functions/scripts/laboratorio-tienda/`
  con versiones exactas: `lighthouse` 12.2.1, `puppeteer-core` 23.11.1 y `@puppeteer/browsers`
  2.6.1.
  - Sus `node_modules` y el navegador (`.navegador/`) quedan ignorados en git.
  - El navegador es Chrome for Testing 131.0.6778.204. En este Ubuntu 24.04 le faltan librerías
    del sistema: `preparar-navegador.js` las baja con `apt-get download` y `dpkg -x` dentro de
    `.navegador/`, sin root y sin tocar el sistema.
  - Se prepara con `npm run lab:tienda:preparar` y se corre con `npm run lab:tienda`, desde
    `functions/`.
- **Línea base del laboratorio (bloque TX34-B04, 26-oct, con el código de ese día).** 15 plantillas, portada,
  catálogo y ficha, caliente y frío, mediana de 3, 2.500 productos con fotos originales. Resultado global
  (480 informes, dos ejecuciones): Rendimiento 86 (65–99) en caliente y 78 (56–91) en frío; Buenas prácticas
  96 en todas; INP de 19 a 41 ms (el flujo mide CLS 0). Dos ejecuciones seguidas difirieron hasta 14 puntos
  en 80 medianas (la meta de la 1.1 era 5): **no es estable** y se declara. **Hipótesis del bimodal con
  evidencia (`bimodal.md` de la corrida):** en el laboratorio el primer pintado observado es de 47 ms en
  caliente y de ~5,6 s en frío, porque el HTML espera las lecturas de `products` (el modelo de demora de entonces,
  40 ms por lectura + 1,8 ms por documento, da ~4,5 s por cada lectura completa de 2.500 productos); además, en
  todas las corridas las fuentes llegan después del primer pintado, así que el puntaje depende de cuánto
  espera el servidor y no del código del navegador. Es la misma forma que D-461 (primer pintado esperando
  ~2,4 s en producción). Lo que ya se movió y lo que no: ver la medición acotada.
- **Medición acotada del 3-nov-2026 (bloque TX34-B19), una sola vez.** Solo las páginas y plantillas que
  tocan los bloques nuevos, con la misma configuración: catálogo y ficha de `marca-premium` (la peor de la
  línea base: CLS 0,22 y LCP 7,3 s en el catálogo), `moda-coleccion` (la de la lista de categorías y el
  cajón, referencia del INP) y `tecnologia-catalogo` (catálogo grande, la de Baudio); Lighthouse 12.2.1,
  Chrome 131.0.6778.204, mediana de 3, aviso de cookies sin aceptar, balizas bloqueadas. «Base» es la última
  corrida de la línea base (`linea-base-definitiva`, 26-oct, una ejecución); «Apagado» es el código de hoy con
  todas las banderas nuevas apagadas; «Encendido» es el mismo código con `drawer`, `shippingEstimate` y
  `salesRanking` en `show` **solo en la Firestore en memoria del laboratorio** (nunca en producción ni en
  `katuq_dev`). Cada celda es Rendimiento / LCP / CLS (Buenas prácticas fue 96 en todas).

  | Caliente | Base | Apagado | Encendido |
  |---|---|---|---|
  | marca-premium · catálogo | 65 / 7,30 s / 0,222 | 82 / 4,62 s / 0,040 | 82 / 4,62 s / 0,002 |
  | marca-premium · ficha | 84 / 2,81 s / 0,228 | 94 / 2,81 s / 0,065 | 94 / 2,96 s / 0,024 |
  | moda-coleccion · catálogo | 80 / 5,31 s / 0,024 | 80 / 5,06 s / 0,007 | 82 / 4,65 s / 0,004 |
  | moda-coleccion · ficha | 95 / 2,80 s / 0,034 | 95 / 2,81 s / 0,024 | 94 / 2,96 s / 0,027 |
  | tecnologia-catalogo · catálogo | 78 / 5,75 s / 0,020 | 82 / 4,79 s / 0,003 | 82 / 4,64 s / 0,001 |
  | tecnologia-catalogo · ficha | 95 / 2,81 s / 0,020 | 95 / 2,81 s / 0,023 | 94 / 2,96 s / 0,022 |

  | Frío | Base | Apagado | Encendido |
  |---|---|---|---|
  | marca-premium · catálogo | 56 / 6,91 s / 0,222 | 74 / 4,66 s / 0,040 | 74 / 4,65 s / 0,002 |
  | marca-premium · ficha | 75 / 2,85 s / 0,228 | 86 / 2,85 s / 0,065 | 85 / 3,00 s / 0,024 |
  | moda-coleccion · catálogo | 71 / 5,36 s / 0,045 | 74 / 4,66 s / 0,007 | 71 / 5,28 s / 0,004 |
  | moda-coleccion · ficha | 86 / 2,85 s / 0,034 | 87 / 2,85 s / 0,024 | 85 / 3,00 s / 0,027 |
  | tecnologia-catalogo · catálogo | 68 / 6,46 s / 0,020 | 73 / 4,84 s / 0,003 | 74 / 4,66 s / 0,001 |
  | tecnologia-catalogo · ficha | 86 / 2,86 s / 0,020 | 86 / 2,86 s / 0,023 | 85 / 3,00 s / 0,022 |

  - **CLS: cumplido en lo medido.** Mayor valor 0,065 apagado y 0,027 encendido (meta 0,1); la base de
    `marca-premium` era 0,22. Cierra la parte pendiente de la 3.4 para estas tres plantillas; las otras 12 no
    se midieron en este bloque.
  - **LCP: no se cumple en el laboratorio (meta 2,5 s, spec «Metas de carga»).** Ninguna celda de las tablas llega a la
    meta: la ficha da 2,8–3,0 s y el catálogo 4,6–5,3 s, apagado y encendido. Solo el catálogo en caliente con fotos con
    variantes (`--fotos uniformes`, ver más abajo) llega a 2,4 s. La causa del catálogo está en el punto siguiente; la de la
    ficha (LCP 2,8 s en caliente) no se investigó en este bloque. Queda como pendiente de la 6.1.
  - **INP: dentro de la meta en lo medido, pero el flujo no cubre todo lo que pide la spec.** Meta 200 ms. El flujo con
    CPU 4x real hizo buscador, agregar y abrir el carrito en «Apagado» (34 / 33 / 19 ms en marca-premium, moda-coleccion y
    tecnologia-catalogo) y esas tres más el menú en «Encendido» (25 / 21 / 25 ms, con el cajón); CLS 0 en el flujo. Por eso
    las dos cifras **no son comparables entre sí**. **Faltan** el menú en «Apagado» y **filtrar** (el panel de filtros de B06)
    en las dos: esa interacción no se midió y la spec la pide. Pendiente de la 6.1.
  - **Apagado queda idéntico.** Las 28 respuestas comparadas (portada, catálogo, ficha, `/estilos.css` y las tres
    del API del catálogo con orden normal, `novedad` y `mas-vendidos`, en 4 plantillas, sin nonces) tienen el mismo
    contenido que el código anterior al bloque B12 (`bb9de72c`): 28 de 28. El laboratorio no escribió nada en la
    Firestore en memoria ni intentó salir a la red.
  - **Diferencias de lo encendido (informe, sin tocar código).** Con 3 corridas por celda, una sola ejecución por estado
    (`repetir 1`, así que esta medición no aporta evidencia de estabilidad) y una inestabilidad conocida de hasta 14 puntos
    entre ejecuciones, **solo cuentan como cambio los rangos que no se solapan**; 1 punto es ruido. (1) **La ficha pierde de
    1 a 2 puntos en 5 de sus 6 celdas** (caliente: moda-coleccion y tecnologia-catalogo 95 → 94, marca-premium igual en 94;
    frío: marca-premium 86 → 85, moda-coleccion 87 → 85, tecnologia-catalogo 86 → 85) y ~0,15 s de FCP y de LCP en las 6
    (2,81 → 2,96 s en caliente, 2,85 → 3,00 s en frío). Esa caída es pequeña, pero constante en dirección y coherente con el
    peso agregado: el documento crece 6,6 KB comprimidos (ficha de `marca-premium` 42,3 → 48,9 KB; 156 → 179 KB sin
    comprimir) por los estilos y el script del cajón y del envío en la página, y el catálogo igual (45,5 → 52,2 KB). Con
    `paraTodas` lo pagan todas las tiendas; si se quiere recuperar, el camino es mover esos bloques a archivos cacheables
    (decisión de Daniel, no se hizo). (2) **El catálogo en frío de `moda-coleccion` pasa de 74 a 71** (LCP 4,66 → 5,28 s):
    las otras dos plantillas en frío no cambian, el TTFB observado es el mismo (5,2–5,3 s) y el rango no se solapa (73–74
    contra 71–72), así que es el único cambio con evidencia de costo del catálogo; se vuelve a mirar en la 6.1. (3) Las
    demás diferencias del catálogo están dentro del ruido y **no se leen como mejora ni como costo**: el catálogo en
    caliente de `moda-coleccion` (80 → 82; la corrida apagada ya iba de 80 a 82) y el de `tecnologia-catalogo` en frío
    (73 → 74; el rango encendido va de 69 a 74). La mejora de CLS de lo encendido (0,065 → 0,024 en la ficha de
    `marca-premium`) sí es diferencia de las mediciones, pero ya está por debajo de la meta en los dos estados.
  - **Por qué el catálogo no llega a 90 y la traza (corridas bajo 90, guardadas en la carpeta de la corrida).** En el
    catálogo el LCP es la foto de la primera tarjeta (una imagen de 178 × 178 px, `fetchpriority="high"`, no diferida) y
    el 85 % de su tiempo es la descarga (en la corrida 1: `Load Time` 4.061 ms de un LCP de 4.793; TTFB 604 ms,
    `Render Delay` 128 ms; FCP 1,8 s, TBT 0 ms): la página trae 14 imágenes de ~110 KiB (1,49 MiB en total) que compiten por la misma conexión 4G simulada.
    Lighthouse lo dice igual: `uses-responsive-images` ahorraría 1.425 KiB y `modern-image-formats` 278 KiB. Son las fotos
    originales sin variantes (el laboratorio las siembra así, como en producción antes de D14/D16). **Prueba de que es esa
    causa:** con las fotos que sí traen variantes `-wN.webp` (`--fotos uniformes`, un sustituto de lo que hará
    `storeMobile.imageVariants` en `on`) el mismo catálogo en caliente da Rendimiento 97 y LCP 2,4 s en `marca-premium` y
    en `moda-coleccion`. En frío (74 y 85–87 en la ficha) lo que baja el puntaje es además la espera del servidor
    (TTFB observado ~5,2 s, el modelo de lectura de 2.500 documentos), que es lo que D1 ataca con una sola lectura. Ni la
    proyección (`lightIndex`) ni las variantes (`imageVariants`) estaban encendidas en esta medición.
  - **Cómo repetirlo.** Desde `functions/`, con el candado de `tsc`:
    `node scripts/laboratorio-tienda/correr.js --plantillas marca-premium,moda-coleccion,tecnologia-catalogo --paginas catalogo,ficha
    --corridas 3 --repetir 1 --etiqueta <nombre>` para «Apagado»; el mismo comando con `LAB_TIENDA_ENVIO=1 LAB_TIENDA_CAJON=1
    LAB_TIENDA_RANKING=1` para «Encendido» (las tres variables solo existen en `lib/sembrar.js` del laboratorio y encienden las
    banderas en la Firestore en memoria; `LAB_TIENDA_RANKING` entró en el commit de este bloque en el backend). Con
    `--fotos uniformes --modos caliente --sin-inp` se repite la prueba de las fotos con variantes. Las corridas con su
    `resumen.json` y `tabla.md` quedan fuera de git en `~/.claude/projects/-home-ubuntu-sourcecodejuls-Seller-Katuq/
    laboratorio-tienda/corridas/2026-11-03-*-b19-*`. La columna «Base» sale de `2026-10-26-200117-linea-base-definitiva`, que
    solo conserva informes, trazas y flujos
    (sin `resumen.json` ni `tabla.md`): las medianas por métrica de «Base» se recalcularon de esos informes (B19 verificó que
    coinciden con las tablas) y quedaron guardadas en `resumen-base.csv` de esa carpeta. La comparación «Apagado idéntico»
    (28 de 28) se hizo con un script que renderiza el árbol de `bb9de72c` y el de hoy (`node b19-comparar-apagado.js <árbol>
    <salida.json>`, copia fuera de git en `laboratorio-tienda/`).
  - **Lo que esto NO demuestra.** Es el laboratorio (red y CPU simuladas, Firestore en memoria con demora modelada,
    fotos de prueba), 3 de las 15 plantillas y 2 de 3 páginas. No es PageSpeed ni una medición en producción: PageSpeed
    queda bloqueado hasta el OK de Daniel y la corrida de lectura real (`--real`, tarea 1.3) también. No se prometen
    90 puntos en producción.
- **Lecturas y memoria, dry-run (`scripts/medir-render-frio.js`, Firestore en memoria con la demora del modelo; no es
  producción).** 2.500 productos: el render en frío tarda ~5,4 s en las tres páginas (el índice compartido, 4.686 ms, y los
  precios de vitrina, 4.664 ms, son dos lecturas de los 2.500 documentos); en caliente, 0 ms. Índice compartido: 1.903 KB
  leídos y 2,6 MB en memoria; proyección de D1: 1.719 KB leídos (fotos 453 KB) y 3,9 MB. 8.568 productos: ~16,5 s en frío;
  índice 6.540 KB y 8,8 MB; proyección 5.908 KB (fotos 1.572 KB) y 9,6 MB. Demora ajustada: 46,3 ms por lectura + 1,823 ms
  por documento. En el laboratorio la proyección pesa algo menos al leer y algo más en memoria (guarda las fotos); sus
  productos tienen descripciones cortas, así que la diferencia real (documentos de ~14 KB, D-461) solo se sabe con la
  lectura real, que sigue bloqueada.

### D3. Baliza sin robots
- Cliente: no manda `/vista` (ni la búsqueda sin resultados de D7) si `navigator.webdriver` es
  verdadero.
- No necesita nada del resto del diseño: puede salir antes, con los arreglos del paso 3 de D-518,
  si Daniel lo autoriza (P19), porque cada medición en producción infla hoy las visitas y el
  reporte semanal de KAI.
- Servidor (`registrarVista`): responde 204 sin escribir si el agente declara ser robot,
  Lighthouse o navegador sin interfaz. Lista cerrada en `utils/siteAnalitica.js`, con prueba.
- No es un control de seguridad: solo deja de sumar tráfico automatizado conocido (ver revisión
  privada). No se reescriben las visitas ya contadas.

### D4. Buscador (TX-34·8, F2-42·8)
- Normalización de hoy (`normalizarBusqueda`) más tokens: se parte en palabras, se quitan
  palabras vacías («de», «la», «para»…) y se limita a 5 palabras y 60 caracteres.
- Campos y peso: título 3, referencia exacta 4, marca 2, categoría 2, atributos visibles 1
  (solo con `categoryAttributes` y valores que `valoresVisibles` muestra en la ficha).
- Coincidencia por palabra: exacta > prefijo (la última palabra, para escribir a medias) > un
  error (Damerau-Levenshtein 1: una letra de más, de menos, cambiada o dos vecinas
  intercambiadas) en palabras de 4 letras o más. Cada palabra de la búsqueda debe coincidir en
  algún campo. Puntaje = suma; empate → orden natural.
- Solo sobre lo vendible y visible (las categorías ocultas ya se excluyen en
  `esVendibleEnTienda` → `conCategoriaVisible`). Las sugerencias de categoría excluyen las
  ocultas (F0-02).
- Modo `storeMobile.search`: `off`, `shadow` (calcula los dos y registra cuántos resultados da
  cada uno, sin el término) y `on`.
- Costo: palabras precalculadas en la proyección; comparaciones con corte por longitud. Meta:
  ≤50 ms con 8.568 productos en el proceso (prueba de rendimiento en la tarea 3.6). F2-42·5
  pide el catálogo en ≤1 s en caliente.

### D5. Autocompletar
- `GET /v1/sites/public/:slug/sugerencias?q=` (nuevo, mismo candado que `/catalogo`: solo con
  un catálogo visible publicado). Desde 2 caracteres. Responde hasta 5 productos (id, nombre,
  foto de 320 px si hay variante o, si no, la primera foto del producto, ruta), hasta 3
  categorías y hasta 2 marcas (P17), y
  `correccion` si no hay nada. **Sin precio**: no depende de la sesión mayorista y se puede
  cachear igual para todos (detalles de límites y caché: revisión privada).
- Script: lista bajo el buscador de la cabecera y del catálogo con el patrón combobox (flechas,
  Enter, Escape, `aria-activedescendant`), espera de 250 ms y «la última petición gana». Sin
  JS, el formulario sigue buscando como hoy.

### D6. Orden (TX-34·4, P2, P3)
- Valores cerrados: `relevancia` (por defecto), `precio-asc`, `precio-desc`, `novedad`,
  `mas-vendidos`. Sin búsqueda, `relevancia` deja el orden de hoy (P3).
- `novedad`: `createdAt || fechaCreacion` de la proyección, más nuevo primero; sin fecha, al
  final. **Se aparta en la forma de TX-34·4**, que pone las dos cifras como campos del índice
  calculados por una tarea nocturna: la fecha de creación ya está en el producto y no cambia,
  así que la proyección (que es el índice de la tienda) la lee al cargarse y no hace falta
  calcularla de noche. Queda como campo del índice, que es lo que pide la decisión.
- `mas-vendidos`: unidades de 30 días de `storeProductStats/{empresaDocId}` (P1), mayor primero;
  empate → novedad. La opción solo aparece si la tienda tiene datos calculados **completos**
  (`completo: true`) y `salesRanking` está en `show`. Nunca se publican cantidades.
- Tarea nocturna `storeSalesRanking` (2:30 a. m. Colombia, `cronService.js`, con `CRON_ENABLED`,
  latido `conLatido` e interruptor `storeMobile.salesRanking`: `off`, `compute`, `show`):
  - Por cada empresa con tienda publicada y habilitada, lee `orders` por
    `(company, fechaCreacion)` (índice existente) con `select` de líneas, cantidades, estados y
    fechas. Los pedidos sin `fechaCreacion` no entran en la consulta: se cuentan en el
    `--dry-run` (tarea 0.5) y, si pesan, se vuelve a Daniel.
  - **Qué producto es cada línea:** `producto.cd` si es un producto de la empresa; si no, la
    referencia (`producto.identificacion.referencia`) resuelta a docId con el mapa
    referencia → docId de `products.identificacion.referencia` (la misma regla de doble conteo
    de AGENTS.md); si no se resuelve, la línea no cuenta y se suma a `lineasSinResolver`. Las
    variantes ya son productos separados (F5-30·7), así que cada una cuenta por su cuenta.
  - Suma por producto (P2) y escribe el documento completo con `set` (idempotente: dos
    corridas dan lo mismo): `{ventas: {docId: unidades}, desde, hasta, pedidosLeidos,
    lineasSinResolver, completo, calculado}`.
  - **Tope de lectura por empresa** (5.000 pedidos, ajustable en `config/feature_flags.
    storeMobile`). Si se alcanza, escribe `completo: false` y la tienda no ofrece «Lo más
    vendido»: un ranking parcial no se publica como verdadero.
  - El id del documento es el **docId** de la empresa en `companies` (resuelto como en
    `companyFeatureFlags`), no el texto de `company`, que puede llevar «/» o espacios.
  - Registro estructurado con `correlationId`, empresas, pedidos leídos, líneas sin resolver,
    duración y errores. Primera tarea: `--dry-run` que solo imprime los totales.

### D7. Sin resultados
- `consultarCatalogo` con búsqueda y total 0 devuelve `sugerencias`: la corrección (la palabra
  del vocabulario de la tienda más cercana, hasta 2 errores, solo si da resultados), hasta 4
  categorías visibles con más productos y «Ver todo el catálogo». La página las pinta con
  enlaces; con WhatsApp configurado, «Pregúntanos por WhatsApp».
- Evento `busqueda_sin_resultado` por la misma baliza de D3, solo si P8 se aprueba, y **solo con
  la búsqueda enviada**: Enter, el botón de buscar o una página abierta con `?q=`, no con la
  búsqueda que corre mientras se escribe (espera de 350 ms). Una vez por término y por sesión
  del navegador.

### D8. Cajón lateral (TX-34·5, P16)
- **Celular es ≤767 px en todo este cambio** (el mismo corte de los 16 px de D-461 y de las
  áreas de 44 px). Hoy la fila deslizable y el ocultar los enlaces empiezan en ≤600 px; entre 601
  y 767 px (celular grande o acostado) la cabecera muestra enlaces y fila a la vez. Con el cajón,
  en ≤767 px la cabecera muestra un botón «Menú» (ícono de tres rayas, 44 px) que abre un panel
  desde la izquierda con: categorías (las mismas `__categorias`, ya sin ocultas), enlaces del
  menú (F1-10), «Mi cuenta» y «Favoritos» si la tienda vende, y WhatsApp. La fila horizontal y
  los enlaces sueltos no se pintan en celular. Desde 768 px, como hoy.
- Marcado con `<details>`/`<summary>`: **sin JavaScript** el botón despliega la misma lista dentro
  de la cabecera (no lleva a otra página, así funciona también en una tienda sin catálogo). Con
  JavaScript se vuelve panel lateral: `aria-expanded`, `aria-controls`, foco atrapado, cierra con
  ✕, Escape, toque fuera y al navegar, y devuelve el foco al botón.
- Respeta `data-kq-ajustes` (F2-17: mayúsculas del menú, logo centrado). Sin cambios en
  computador ni en el modo conversión (F2-19, que no tiene menú).
- Interruptor `storeMobile.drawer`: nace `off`; pasa a `on` para FLORECER después de la revisión
  visual y para todos con el OK de Daniel. `off` vuelve a la fila de hoy sin desplegar.
- Espejo en `sitio-render` con `.sitio--movil` (mismo marcado y clases), más los 16 px de D-461
  que faltan allí.

### D9. Áreas táctiles y elementos fijos
- En ≤767 px: `min-width` y `min-height` de 44 px (o área de toque ampliada sin mover el diseño)
  en +/−, «Quitar», ✕ de paneles, flechas de página y de fila, botones de cabecera, chips,
  «Avísame», «Filtrar», corazón de favoritos y botones del aviso de cookies.
- Orden fijo de abajo hacia arriba en celular: barra de compra de la ficha → carrito flotante y
  WhatsApp → aviso de cookies → KAI. La prueba de la tarea 1.5 falla si dos de ellos se
  cruzan, o si alguno tapa el botón principal visible.
- Panel de filtros: cierra también con Escape y con toque en el fondo; el foco vuelve a
  «Filtrar».
- Textos legibles sin zoom (P20): en ≤767 px ningún texto visible del recorrido de compra mide
  menos de 12 px, y los controles con texto (como «Quitar», hoy 0,8 rem, `siteTienda.js:51`, o
  los chips) miden 14 px o más. La prueba de la tarea 1.5 lee el tamaño calculado de cada texto
  visible en cada paso; no depende de una auditoría de Lighthouse.
- Las clases nuevas no contienen «p-» (trampa del CSS global en el Seller; el sitio publicado
  no la tiene, pero el espejo sí).

### D10. Interruptores (D-505, Artículo XII)
Dos niveles, como manda D-505 y la regla de diseño de `openspec/config.yaml`:
- **Global, en `config/feature_flags.storeMobile`** (interruptor de la plataforma): por pieza, el
  modo y si ya aplica a todas las tiendas. Es también el kill switch: `off` apaga la pieza en
  todas. Aquí va además el tope de pedidos de D6 (`topePedidosRanking`, 5.000).
- **Por empresa, en `companies.featureFlags`** (registro de `services/companyFeatureFlags.js`,
  `CompanyFeaturesService` en el front, `scripts/set-company-feature.js`): una bandera booleana
  por pieza. Se suman al catálogo cerrado de las dos partes.

| Pieza | Global `storeMobile.<pieza>` | Bandera de empresa | Al crear |
|---|---|---|---|
| `lightIndex` | `modo`: `off` · `shadow` · `on`; `paraTodas` | `storeLightIndex` | `shadow`; FLORECER con bandera (D-385) |
| `search` | `off` · `shadow` · `on`; `paraTodas` | `storeSmartSearch` | `off` |
| `salesRanking` | `off` · `compute` · `show`; `paraTodas` | `storeSalesRanking` | `off` |
| `paymentRetry` | `off` · `on`; `paraTodas` | `storePaymentRetry` | `off` |
| `drawer` | `off` · `on`; `paraTodas` | `storeDrawer` | `off` hasta la revisión visual |
| `shippingEstimate` | `off` · `on`; `paraTodas` | `storeShippingEstimate` | `off` |

- **Modo efectivo** de una pieza en una tienda: el `modo` global si la empresa tiene su bandera
  en `true` o la pieza tiene `paraTodas: true`; si no, `off`. Un valor ilegible o ausente cuenta
  como `off` (el registro de banderas ya cierra ante cualquier duda).
- **Dependencias:** `search` necesita la proyección (las palabras de búsqueda viven en ella): con
  `lightIndex` efectivo en `off`, `search` se comporta como `off` aunque diga otra cosa, y lo
  deja en el registro estructurado una vez por empresa y carga. `/sugerencias` solo responde con
  `search` en `on`. `salesRanking` en `compute` no muestra nada; en `show` solo si el documento
  está `completo`.
- **Costo:** las banderas de la empresa se leen una vez por render o por petición del catálogo,
  en paralelo con el sitio, nunca por producto.
- Dueño: Daniel. Retiro: 30 días después de que la pieza quede con `paraTodas` y `on` (o `show`);
  la tarea 6.4 quita el interruptor, las banderas y su rama.

### D11. Envío antes de pagar (TX-34·2, TX-34·9, P7, P11)
- Un componente del script de la tienda, «Calcula tu envío», en la ficha (bajo el precio y el
  plazo) y en el carrito (en lugar de «Según tu ciudad»):
  - Modo zonas: selector de ciudad con las zonas de `GET /zonas` (se carga al abrirlo). Muestra
    el valor de la zona, «Gratis» si aplica `gratisDesde` y cuánto falta para el envío gratis.
  - Modo fijo: el costo configurado.
  - Con puntos de retiro: «Recoger gratis en <punto> (<horario>)».
  - «Mi ciudad no está»: «Te confirmamos el envío por WhatsApp» con el enlace de la tienda; sin
    WhatsApp, el texto de P11.
  - La ciudad elegida se guarda en el navegador y llega preseleccionada al checkout. El servidor
    revalida la zona al crear el pedido, como hoy.
- Tiempo de entrega en carrito y checkout: cada línea guarda el plazo del producto al agregarse
  (`data-plazo`, el mismo texto de `tiempoDeEntrega`). El resumen muestra «Entrega desde N
  días» con el mayor de los numéricos, o el texto si es libre. Sin plazo en ninguna línea, no se
  dice nada (F0-09: nunca una promesa fija).
- «Precios con IVA incluido» en carrito y checkout cuando todas las líneas lo llevan (P7).
- Interruptor `shippingEstimate`.

### D12. Pago rechazado (TX-34·3, T·2, P15) — [S]
- Diff 1 [S]: `crearPedido` y `retomarPago` devuelven al comprador a `/gracias` con el regreso
  que fija la revisión privada (SD1), en lugar de `gracias?pedido=N`. Ese regreso lo trae F2-41
  corregido antes de unirse (tarea privada 2.0); el diff 1 lo reutiliza, no lo inventa.
  `crearPedido` también lo devuelve en su respuesta al script de la tienda (para el diff 3). No
  toca el camino del pedido del bot dentro de `retomarPago` (F4-40 D11) ni su control propio.
- Diff 2 [S]: `/gracias` con regreso válido, `estadoPago` Rechazado o Anulado, pago en línea,
  reserva vigente y `paymentRetry` efectivo en `on` → «Reintentar pago», que lleva al `/pagar`
  de siempre (mismo pedido, misma reserva). Generaliza el reintento de cuotas de F2-41.
  - «Te enviamos el enlace para pagar a tu correo» **solo** con regreso válido y si el
    recordatorio ya salió o el pedido es elegible para él (dejó correo, estado recordable, correo
    encendido por el comercio), igual que F2-41 con `avisoRechazoEnviado`.
  - Sin regreso válido, la página queda como hoy.
- Reserva vencida o pedido anulado → «Este pedido venció» y, si el navegador guardó la copia
  (P15), «Volver a armar mi carrito».
- Diff 3 [S] (P15): antes de `vaciar()`, el script guarda en `localStorage`
  `{nroPedido, regreso, líneas, creado, venceReserva}` (sin nombre, teléfono, correo ni
  dirección; se borra a las 24 h, al ver el pago aprobado o al cerrarlo).
  - **Mientras la reserva viva** (el caso de quien vuelve atrás desde la pasarela o pierde la
    redirección y nunca llega a `/gracias`): cualquier página de esa tienda muestra arriba «Tienes
    un pedido sin pagar (N.º X) · Pagar», que abre `/gracias` con el regreso guardado; allí se ve
    el estado real y «Reintentar pago». Se puede cerrar.
  - **Con la reserva vencida:** «Volver a armar mi carrito». Precios y existencias se revisan otra
    vez como en cualquier carrito.
- Sin cambios en la reserva, el barrido, la conciliación, el inventario ni en `/pagar`, salvo su
  regreso. Ver revisión privada (bloquea los diffs 1, 2 y 3).

### D13. Error de red
- Catálogo, búsqueda y orden: «la última petición gana» (no se descartan las nuevas). Si falla
  o responde sin éxito, se deja lo que se veía y aparece un aviso con «Reintentar» que repite la
  misma petición con filtros, búsqueda y página.
- Checkout — **[S]**: el mensaje de hoy se queda, con un botón «Reintentar» que reenvía el mismo
  pedido sin volver a escribir. Reenvía el POST que crea el pedido, así que toca pedidos y
  reserva: va después de F2-41 (que edita ese mismo código), con caracterización antes. La
  caracterización fija que un reintento cuya primera respuesta se perdió **después** de crear el
  pedido devuelve el mismo `nroPedido` con `_duplicadoEvitado`, sin descontar inventario dos
  veces ni apartar otra reserva. Si la guarda de gemelos no lo cubre en la tienda (por ejemplo,
  sin celular, o con los efectos repetidos que anota D-496), el reintento lleva una clave de
  idempotencia del navegador, en un diff [S] aparte con aprobación. El carrito no se toca hasta
  que el servidor confirma el pedido.
- Autocompletar: si falla, la lista no aparece; buscar con Enter sigue funcionando.

### D14. Imágenes (TX-37·8)
- `srcset` y `sizes` en tarjeta, ficha y miniaturas cuando la URL tiene variantes: las del
  constructor (`-wN.webp`, `srcsetDe`, `siteHtml.js:382`) y las WebP de TX-37
  (`Productos/uniformes/…-wN.webp`). La portada uniformada de TX-37 es un JPEG (`-cover.jpg`) y
  **su diseño la deja sin `srcset`** (`fotos-uniformes-producto/design.md`, línea 20, su pregunta
  7): TX-34 respeta eso y solo le pone `srcset` si TX-37 cambia esa respuesta. La tarea 0.6
  confirma en Storage qué anchos existen.
- **Anchos reales (tarea 0.6, deducidos del código el 2026-11-03; la confirmación contra el Storage real
  queda pendiente).** Todas las variantes WebP salen de la misma función, `procesarImagenSitio`
  (`utils/siteImagenes.js`): los anchos fijos 320, 640, 1280 y 1920 que no superen el del original (tope 1920),
  más el ancho del original si no es uno de los fijos. Nunca agranda.
  - **Constructor** (`controllers/media.js`, carpeta `Sitios/`): `Sitios/<nombre>-w<ancho>.webp`, un token por
    foto compartido por todas las variantes. La URL guardada es la de la variante más grande (hasta 1920).
  - **TX-37** (`utils/productPhotoUniform.js`, `services/productPhotos/photoStorage.js`):
    `Productos/uniformes/<empresa>/<producto>/<lote>-<n>-w<ancho>.webp` con los mismos anchos sobre el lienzo
    (hasta 1920) y un token por foto. La URL guardada (`urls`) es la variante WebP más grande hasta 1280
    (`-w1280.webp`, o `-w900.webp` si el lienzo mide 900). La portada suma `…-<n>-cover.jpg` (JPEG de hasta 1280)
    que va en `urls` y **sin `srcset`**.
  - **`srcsetDe`** (`utils/siteHtml.js`) pide los anchos fijos menores que el del nombre más ese ancho; por eso
    la URL de una foto debe ser siempre la de su variante más grande, y el `srcset` nunca pide un archivo que no
    se creó (probado en `variantesFotosTienda.writeSet.test.js`). Los 1920 existen en el Storage pero ninguna
    URL guardada de producto los pide; no se usan en la tienda.
- **La precarga de la ficha va con el mismo `srcset`.** Hoy la ficha precarga su foto solo con
  `href` (`precargaDeFicha`, `siteHtml.js:448`, usada en 7048); si la `<img>` lleva `srcset` y la precarga no, el celular baja dos
  veces la foto del LCP. Cuando la foto tenga variantes, la precarga lleva `imagesrcset` e
  `imagesizes` iguales a los de la `<img>`, como ya hace `precargaDePortada` (`siteHtml.js:460`).
  La prueba compara las dos listas.
- `sizes` según las columnas de la rejilla (2 en celular, el ajuste de F2-17).
- La primera fila del catálogo (4 tarjetas) sin `loading="lazy"` y la primera con
  `fetchpriority="high"`; el resto diferidas. Medidas o `aspect-ratio` en cada foto para que no
  salte la rejilla (CLS).

### D15. Los clics de anuncios también usan la caché del HTML
- Hoy la copia del HTML se separa por los identificadores de clic de los anuncios, que cambian en
  cada clic: quien llega por pauta recibe un render en frío, justo el tráfico que paga el
  comercio. La atribución se lee en el navegador (`siteHtml.js:4489-4495`), no en el render.
- La copia deja de separarse por **la misma lista `CAMPOS`** que captura la página
  (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `gbraid`,
  `wbraid`, `fbclid`, `ttclid`, `msclkid`), tomada de un solo lugar para que no se separen. El
  resto de la clave: ver revisión privada (S4). Con prueba de que la atribución del pedido sigue
  igual.

### D16. Variantes de las fotos originales [si P6 = a]
- Solo si Daniel elige la opción (a) de P6. Una tarea `variantesFotosTienda` (nocturna y con
  `--dry-run` primero, tope por empresa) toma las fotos de producto que están en el Storage de
  Katuq y no tienen variantes, y crea a su lado las WebP de 320/640/1280 con
  `procesarImagenSitio` (`utils/siteImagenes.js`) y el mismo token, como el constructor.
- **No escribe `products`** (escribir el producto puede reenviarlo a Shopify, ticket 1088): la
  lista de fotos con variantes queda en una colección nueva, `storeImageVariants/{empresaDocId}`
  (mapa ruta → anchos), que la tienda lee (ver «Cómo se pinta»: una lectura cada 5 minutos por empresa, no al
  cargar la proyección). Necesita aprobación explícita de la
  colección y revisión contra D-134 y TX-37 (que no se pisen las variantes de las uniformadas).
- Las fotos externas (CDN de Shopify u otros) quedan como hoy.
- **Implementación (bloque TX34-B17; P6 = a, aprobada en bloque el 2026-10-21).**
  - **Interruptor:** `config/feature_flags.storeMobile.imageVariants` = `off | compute | on`, **solo global** (no
    tiene bandera de empresa). `off` (por defecto): la tarea no hace nada y la tienda sale como hoy. `compute`:
    crea las variantes y no las muestra. `on`: las crea y las muestra. Topes: `topeFotosVariantesEmpresa` (50
    fotos nuevas por empresa y por corrida) y `topeFotosVariantesCorrida` (300 en toda la corrida).
  - **Quién y cuándo:** `services/sites/variantesFotosTienda.js`; tarea `storeImageVariants` a las 3:45 a. m. de
    Colombia, con latido; script `scripts/variantes-fotos-tienda.js` con `--dry-run` por defecto (solo lee
    Firestore y no abre el Storage: cuenta por empresa las fotos propias sin variantes, las que ya las tienen,
    por qué se saltan las demás y una estimación gruesa de bytes). `--compute` exige además
    `--confirmo-storage-real`.
  - **Qué foto entra:** original en el bucket propio, con token en la URL, de un producto activo y publicado en
    la web; extensión JPG, PNG o WebP; hasta 8 fotos por producto (las que pinta la ficha). **Se saltan:** fotos
    externas u otro bucket, las uniformadas de TX-37 (`processed`/`original`, `Productos/uniformes/…`), su portada
    `-cover.jpg` y las que ya son `-wN.webp` (constructor).
  - **Qué crea:** `<ruta sin extensión>-w320.webp`, `-w640.webp` y `-w1280.webp` (y el ancho del original si es
    menor de 1280; nunca más de 1280) con el **mismo token** de la foto original, `metadata.company` de la
    empresa y la precondición de que el archivo no exista. Antes de descargar comprueba que el archivo es de la
    empresa (`metadata.company`, la regla de TX-37) y que el token de la URL es el suyo. Un destino que ya existe
    solo se acepta si es de la misma empresa y lleva el mismo token; en cualquier otro caso se omite la foto
    entera. Nunca borra ni cambia metadatos.
  - **Qué anota:** `storeImageVariants/{docId de la empresa}` = `{ version, total, calculado, fotos: { <sha1 de la
    ruta>: { ruta, anchos, t } } }`, con `t` la huella (no el token) con que se crearon. Un `set` completo por
    empresa; las fotos que ya no usa ningún producto salen del documento (sus archivos se quedan). Si el comercio
    vuelve a subir la foto con otro token, la huella ya no coincide y la tienda sigue con el original.
  - **Cómo se pinta:** con `on`, la tarjeta (`imagen`, `imagen2`) y la galería de la ficha (`imagenes`, y la foto
    de cada variante de color) pasan a su `-w<N>.webp` más grande, y `srcsetDe`, el `sizes` y la precarga de la
    ficha de B07 hacen el resto. `imagen` de la ficha (og:image) no cambia, y cada foto de la galería que cambia
    conserva su URL de siempre en `original`: el JSON-LD de Product la sigue usando. Sin documento, con otro
    token o ante cualquier falla de lectura: como hoy. **Desvío frente al texto inicial de D16** («la proyección lo
    lee al cargarse»): el documento lo lee `variantesFotosTienda.variantesDeFotos` (una lectura cada 5 minutos por
    empresa, invalidada junto con la proyección) y `indiceTienda.js` solo delega, porque la prueba de la proyección
    exige que `indiceTienda.js` lea únicamente `products`. Con el modo `lightIndex` en `off` la lectura ocurre igual.
    **Fuera de alcance, con razón:** los afines de la ficha ya pasan por `resolverProductos` (llevan variantes); las
    mini-tarjetas de «relacionados» del carrito son miniaturas sin `srcset` y siguen con la foto original; el
    carrito abandonado guarda la miniatura de 320 px (`-w320.webp`) cuando el modo es `on`, para no mandar una
    foto de 1280 px a un recuadro de 48 px en el correo.
  - **Fotos que fallan:** las que no se pueden procesar (sin dueño en el Storage, de otra empresa, sin original,
    con otro token, demasiado grandes o ilegibles) se recuerdan en el mismo documento (`omitidas`, con motivo, huella
    del token y fecha de reintento: 30 días los permanentes, 3 días `sin_variantes`, 1 día `ilegible`). Mientras
    no venza el plazo ni cambie el token de la foto, no se vuelven a intentar ni gastan tope: así unas fotos
    malas no impiden que avancen las buenas ni las demás empresas. El `--dry-run` las cuenta aparte
    («fallaron antes y no se reintentan todavía»). Sus bytes son una estimación de 150 KB por foto sin leer el
    Storage; el peso real de los originales se mide en la primera corrida autorizada.
  - **Tamaño del documento:** además del tope de 4.000 fotos, el documento se limita por bytes estimados (600 KB,
    por el largo de las rutas), muy por debajo del 1 MiB de Firestore. Lo que no cabe se cuenta como
    `documento_lleno` y no se procesa (no se crea ningún archivo que luego no se pueda anotar).
  - **Write-set:** archivos nuevos `-wN.webp` y `storeImageVariants/{empresaDocId}`. No escribe `products`,
    precios, listas, inventario ni movimientos (una prueba estática y una de ejecución lo vigilan).
  - **Regla de Firebase:** la colección debe cerrarse (`allow read, write: if false`) y desplegarse **antes** de
    la primera corrida en `compute`, igual que con `storeProductStats`.

## Límites con otros cambios

- **F2-42 (`atributos-por-categoria`):** suyas las facetas, conteos, «Limpiar todo», selección
  múltiple, filtros en la dirección y comparador; su hoja de filtros toma la forma de panel de
  TX-34 en celular. TX-34 pone la proyección (D1, con el choque de P18) y busca en los atributos
  (F2-42·8). F2-42 respeta «La tienda no se vuelve más lenta»; TX-34 fija la meta de página.
- **F2-41 (cuotas):** suyos el regreso firmado a `/gracias` y el reintento de cuotas. Su regreso
  se corrige antes de unirlo (revisión privada, tarea 2.0); TX-34 extiende el patrón a Wompi
  después (T·2), y también el reintento del checkout (D13), porque F2-41 edita ese código.
- **F4-40 D11 (`pedido-whatsapp-con-link-de-pago`):** habilita `/pagar` para los pedidos del bot
  con un control propio en `retomarPago` y concilia su regreso a `/gracias`. El diff 1 de D12
  edita `retomarPago`: no cambia la rama del bot ni su control, y sus pruebas siguen en verde.
- **D-496:** extrae el núcleo de `crearPedido`. El regreso del diff 1 y el reintento de D13 se
  aplican sobre el núcleo ya extraído; la tarea 0.4 se repite al empezar el grupo 4.
- **TX-37:** suyas las variantes de las fotos uniformadas y la decisión sobre la portada JPEG;
  TX-34 solo las pinta. Las variantes de las fotos **no** uniformadas no son de TX-37
  (`fotos-uniformes-producto/proposal.md`, «Fuera de alcance»): las decide P6 aquí.
- **F0-09:** todo texto de envío o plazo sale de la configuración o del producto.
- **TX-35:** foco visible y contraste; el cajón y el autocompletar pasan su revisión con axe.

## Write-set y contract tests

| Dónde | Qué escribe | Prueba |
|---|---|---|
| `storeProductStats/{empresaDocId}` (nueva, P1) | `set` completo por la tarea nocturna | `ventasRecientes.writeSet.test.js`: la tarea solo escribe esta colección; canario: escribir `products` u `orders` la hace fallar |
| Eventos de sitio (colección actual) | `busqueda_sin_resultado` (P8) | el cuerpo no lleva más que el término saneado |
| `sites.vistasCount` y evento `vista` | igual que hoy, sin robots | `vistaSinRobots.contract.test.js` |
| `orders` | **nada nuevo**. `/pagar` sigue escribiendo lo de hoy; el reintento del checkout (D13) usa el mismo `crearPedido` | `pedidoTiendaCaracterizacion`, `recordatorioPagoBase` y `pedidoReservaDuplicada` en verde y sin cambios; caso nuevo «reintento con la respuesta perdida» |
| `storeImageVariants/{empresaDocId}` y archivos hermanos en Storage [si P6 = a] | `set` del mapa; archivos nuevos `-wN.webp` junto a la foto | la tarea no escribe `products` ni pisa archivos existentes |
| `localStorage` del comprador | ciudad elegida, copia del pedido sin pagar y del carrito | sin datos personales |

Solo lectura: `products` (proyección), `orders` (tarea nocturna), `zonacobro`, `sites`,
`categorias`. Prohibido: `products`, precios, listas de precios, `inventory`,
`inventoryMovement`, reserva y `consecutives`. Una prueba estática revisa que
`indiceTienda.js` y `ventasRecientes.js` no llamen `set`, `update` ni `delete` sobre otras
colecciones.

Contract tests (Artículo VIII), antes del código: `GET /sugerencias` (forma, candado sin
catálogo → 404, tope de longitud), `GET /catalogo` con los 5 órdenes y `sugerencias` en total 0,
`POST /vista` con agente de robot → 204 sin escritura, `/gracias` con y sin regreso válido, y la
precarga de la ficha con el mismo `srcset` que su foto.

## Observabilidad

- Tarea nocturna: un registro JSON por corrida y por empresa con `correlationId`, duración,
  pedidos leídos, productos con ventas, resultado (`success`, `error`, `retry`).
- Proyección y buscador en sombra: diferencias contadas por empresa, sin términos ni datos del
  comprador.
- Reintento de pago: evento de sitio `pago_reintento` (pedido y medio), para medir lo recuperado
  junto a `pago_recuperado` de D-312.
- Sin `console.log` de telemetría suelta: los registros siguen el formato estructurado de F2-41.
- Ningún registro lleva datos personales del comprador. El registro actual del enlace de pago
  generado se corrige antes de encender `paymentRetry` (ver revisión privada).

## Gates constitucionales

- **I, II, XIII:** cinco specs de menos de 3 páginas, sin tecnología.
- **IV:** la tarea nocturna es idempotente (`set` del documento entero). El reintento del pago
  usa `/pagar`, que no duplica pedidos ni reservas. El reintento del checkout se apoya en la
  guarda de gemelos y se caracteriza antes (D13).
- **VII:** registros con `correlationId` en la tarea nocturna y en el reintento. Excepción
  acotada: el buscador y el autocompletar no emiten métrica por petición (solo en sombra), para
  no escribir por cada tecla.
- **VIII:** contract tests listados arriba, primero.
- **IX:** el Seller está en Angular 14, sin `signal` ni `@if`. El espejo sigue el patrón actual
  del componente (excepción acotada, como en otras propuestas de D-518).
- **XI:** términos de búsqueda saneados (P8); sin teléfonos ni correos en registros.
- **XII:** interruptores con dueño y fecha de retiro (D10).
- **XIV:** decisión en `CONTRACT.md` al aprobar.
- **Sin caché extra (AGENTS.md):** en el camino de la tienda D1 cambia tres lecturas y tres
  registros por uno; convive con el índice compartido cuando la empresa usa el Seller o KAI
  (P4a). El segundo paso de TX-34·7 (resumen por empresa) pasa por Daniel (P4b).

## Orden de unión (T·2)

F2-41 con sus arreglos (incluido su regreso a `/gracias` corregido, revisión privada 2.0) →
D-496 → suscripciones → **reintento del checkout (D13) y diffs 1-3 de D12**. F4-40 D11 se
revisa en cada diff que toque `retomarPago`. El resto de TX-34 no toca `crearPedido`, `/pagar` ni
la reserva, y puede avanzar antes en archivos no sensibles, uniendo siempre sobre la punta de la
rama. La baliza (D3) puede salir antes, con los arreglos del paso 3 de D-518 (P19).

## Fases

1. Medición base y caracterización (sin cambiar comportamiento).
2. Baliza, áreas táctiles, elementos fijos, estados de red, imágenes.
3. Proyección y buscador en sombra en FLORECER; tarea nocturna en `compute`.
4. Cajón, envío, autocompletar y orden nuevo encendidos en FLORECER.
5. Pago rechazado (último, T·2).
6. Medición final por plantilla, encendido para todos y retiro de interruptores.

## Risks / Trade-offs

- **Memoria:** la proyección de OH MY STORE (8.568) convive con su índice compartido cuando el
  Seller o KAI lo cargan; a cambio desaparecen los registros de precios y ofertas de vitrina. Se
  mide en la tarea 1.3 (con `imagenesPrincipales`); si pasa de 25 MB por empresa, se vuelve a
  Daniel.
- **Precio mayorista:** la proyección calcula el precio público. La sesión mayorista sigue
  resolviendo su precio como hoy (F2-42·4 lo amplía).
- **Tolerancia de un error:** puede traer de más en palabras cortas. Por eso solo desde 4 letras
  y siempre detrás de la coincidencia exacta.
- **Bimodal:** si persiste con la proyección y las imágenes, la causa está en la carga del
  navegador (hoja de estilos, fuentes o terceros). Las trazas de D2 lo dirán; se vuelve a Daniel
  con la evidencia antes de tocar más.
- **Cajón para todos:** cambia sitios publicados sin que el comercio lo pida (TX-34·5 lo aprobó),
  también entre 601 y 767 px, donde hoy hay enlaces y fila. Interruptor `drawer` y revisión
  visual a 360, 390, 767 y 768 px con las 15 plantillas.
- **Fotos originales:** si P6 queda en (b), el 90 se mide con fotos originales del peso real
  (tarea 0.5) y puede no alcanzarse por ellas; el informe lo dirá con la traza.
