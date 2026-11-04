# Tareas — La tienda en el celular (TX-34)

> Ticket TX-34 (nro 1249, cd `Es2985T0VnVBc95LqY2D`). Requisitos: `specs/tienda-celular` (TC),
> `specs/tienda-buscador-y-orden` (BO), `specs/tienda-envio-y-entrega` (EE), `specs/tienda-estados`
> (ES) y `specs/tienda-velocidad` (VE). Diseño: `design.md` (D1-D16). Preguntas P1-P20:
> `proposal.md`.
> - Backend: `wt-back-tickets-web/functions/`. Front: `wt-front-tickets-web/`. Rama
>   `feature/tickets-web`, sin push ni despliegue (D-518).
> - **Lo hecho por D-461 se conserva** (16 px, precarga de portada) y no tiene tareas aquí.
>
> **[S]** = módulo sensible (pedidos, pagos, reserva): un cambio a la vez, con su diff aprobado
> por Daniel antes de aplicarlo y caracterización en verde antes. **[P]** = paralelizable.
> **[si Pn]** = solo si la respuesta a Pn lo pide.
>
> Cada tarea lee los archivos que toca antes de editarlos y cierra con sus pruebas y el build en
> verde (backend: pruebas del área; front: `npm run build`). Con el build roto no se avanza.

## 0. Antes de programar

- [ ] 0.1 Daniel aprueba la propuesta y responde P1-P20 (o acepta las recomendaciones), incluida
  las colecciones nuevas de P1 y de P6 (a) y las excepciones acotadas a los Artículos VII y IX
  (`design.md`).
  - **Éxito:** decisión en `specs/CONTRACT.md` (la anota quien registra) y los requisitos
    provisionales dejan de serlo.
- [ ] 0.2 Daniel aprueba las cinco specs. **Éxito:** sin esto no empieza el grupo 1.
- [ ] 0.3 Daniel aprueba la revisión privada del backend
  (`tienda-celular-y-velocidad-seguridad`). **Éxito:** sus controles quedan como criterio de las
  tareas 3.5b, 3.7, 3.9, 3.14 y 4.x, y su tarea 2.0 entra en los arreglos de F2-41 antes de
  unirlo.
- [x] 0.4 Revalidar las citas archivo:línea de `design.md` sobre la punta de
  `feature/tickets-web` (hoy con F2-41 sin commit). **Éxito:** citas corregidas en el diseño.
  - Parte de D12 y del regreso a `/gracias` (bloque **Pago**): hecha el 21-oct (bloque TX34-B01);
    **no se vuelve a hacer hasta la 4.0** (ver más abajo).
  — **Hecha el 3-nov (bloque TX34-B19), con una parte pendiente a propósito (el bloque Pago, D12 y D13; ver abajo)** sobre la punta de `feature/tickets-aws-claude-1` (backend `02ccc27c`):
  26 citas corregidas en `design.md` y 55 comprobadas con un script contra el código (todas en su línea). Las que más se
  movieron fueron las de `controllers/sites.js` (`renderPublico` 6789 → 7226, `consultarCatalogo` 9521 → 10385) y las de
  `siteHtml.js` (cabecera 1330-1400 → 1414-1560). No se tocó ninguna decisión. **Quedan sin revalidar a propósito** el bloque
  **Pago** de «Context» y D12 y D13, que dependen de la unión de F2-41, D-496 y las suscripciones: se rehacen en la 4.0.
- [ ] 0.5 Lectura de producción, solo lectura y sin ejecutar JavaScript de las páginas:
  - HTML en frío y en caliente de FLORECER, OH MY STORE y lino-y-lona (`curl`, 5 veces);
  - número de productos y pedidos de 30 días por empresa con tienda publicada (para dimensionar
    la tarea nocturna);
  - cuántas tiendas tienen envío por zonas, fijo y puntos de retiro, y cuántos productos
    vendibles tienen tiempo de entrega (P14);
  - pedidos de 30 días sin `fechaCreacion` y líneas que no se resuelven a un producto (D6);
  - peso y tamaño de la foto de portada y de las fotos de tarjeta, y cuántas fotos de producto
    están en el Storage de Katuq y cuántas son externas (P6, fotos del laboratorio).
  - **Éxito:** cifras en `design.md`.
- [ ] 0.6 Confirmar en Storage qué anchos crea TX-37 para la portada (`-cover.jpg`) y las demás
  fotos, y el formato de las variantes del constructor. **Éxito:** D14 con los anchos reales.
  — **Avance (bloque TX34-B17):** anchos deducidos del código y escritos en D14 de `design.md` (constructor y
  TX-37 usan `procesarImagenSitio`: 320/640/1280/1920 sin pasar del original, más el ancho del original; TX-37 guarda
  la variante hasta 1280 en `urls` y su portada es un JPEG sin `srcset`). **Pendiente:** confirmarlo contra el Storage
  real (bloqueado).

## 1. Medición base y caracterización (sin cambiar comportamiento)

- [x] 1.1 [P] Laboratorio (D2): `renderPublico` real sobre la Firestore en memoria
  (`scripts/lib/firestoreFalsa`), 15 sitios de muestra, catálogo de prueba de 2.500 productos con
  fotos del peso medido en 0.5, corrida caliente y fría (con la demora de 1.3), Lighthouse 12.2.1
  y Chromium con versión fija como `devDependencies`, mediana de 3, aviso de cookies encendido,
  balizas y píxeles bloqueados, flujo de INP.
  - **Éxito:** `npm run lab:tienda` deja el JSON de cada corrida y una tabla por plantilla y
    página. Dos corridas seguidas difieren 5 puntos o menos (VE «Cómo se mide»).
  — **Hecho (bloque TX34-B04, commit `b0815594` del backend):** `npm run lab:tienda` deja el JSON, la traza de toda corrida
  bajo 90, `resumen.json` y `tabla.md`. **Lo que NO se cumplió:** la estabilidad. Dos ejecuciones seguidas difirieron hasta
  14 puntos en 80 medianas (la meta es 5; ver D2). Se marca hecha porque el laboratorio existe y mide; la inestabilidad queda
  escrita y es la razón de que las comparaciones del bloque B19 se hagan en la misma sesión (apagado contra encendido).
  **Criterio sin cumplir, abierto en la 6.1:** «dos corridas seguidas difieren 5 puntos o menos». Hasta que se cumpla, una
  diferencia de 1–2 puntos entre dos ejecuciones no se lee como cambio; la medición acotada del B19 usó una sola ejecución
  por estado (`repetir 1`) y no aporta evidencia de estabilidad.
- [x] 1.2 Línea base del laboratorio con el código actual, con trazas de toda corrida bajo 90.
  **Éxito:** tabla base guardada; hipótesis del bimodal escrita con evidencia.
  — **Hecha (bloque TX34-B04, commit `7f48ba89`; cifras y hipótesis en D2 desde el bloque TX34-B19).** Las corridas están
  fuera de git, en `~/.claude/projects/…/laboratorio-tienda/corridas/`.
- [x] 1.3 [P] `scripts/medir-render-frio.js --dry-run` (D2): tiempos por etapa del render, bytes
  y memoria del índice y de la proyección (con `imagenesPrincipales`), y demora por lectura, en
  FLORECER, OH MY STORE y lino-y-lona. **Éxito:** cifras en `design.md`; la demora alimenta la
  corrida fría de 1.1.
  — **Hecha en `--dry-run` (Firestore en memoria); cifras en D2 desde el bloque TX34-B19.** El script existe desde el bloque
  TX34-B04; el 3-nov se corrió con 2.500 y 8.568 productos. **Bloqueado, espera el OK de Daniel:** la lectura de producción
  (`--real --sitios …`) con FLORECER, OH MY STORE y lino-y-lona; hasta entonces las cifras de bytes y memoria de la
  proyección son del laboratorio, no de documentos reales de ~14 KB. **Criterio sin cumplir:** «cifras de FLORECER, OH MY STORE
  y lino-y-lona» en `design.md` (hay cifras del laboratorio con 2.500 y 8.568 productos, no de esas tres tiendas).
- [x] 1.4 [P] Caracterización del catálogo: prueba dorada de `consultarCatalogo` con un catálogo
  de muestra (texto, categoría, marca, precio, oferta, ocasión, los 3 órdenes de hoy, plan gratis
  y ocultas). **Éxito:** verde con el código de hoy.
  — Hecha el 26-oct (bloque TX34-B05, commit local en `feature/tickets-web`):
  `tests/sitios/consultarCatalogo.golden.test.js` y `consultarCatalogo.golden.json` (26 casos sobre
  un catálogo de muestra en la Firestore falsa, con el reloj congelado). Cubre los tres órdenes de
  hoy (el natural, `precio-asc`, `precio-desc`; «novedad» cae al natural), texto con tildes y por
  referencia, categoría (también por ruta), marca (también por ruta), rango de precio, oferta (la
  vencida no cuenta), ocasión, lo vendible (agotado, inactivo, fuera de Página Web y sin precio no
  salen), `enPaginaWeb` con y sin marketplace (`publicacionExplicita`), categorías ocultas y plan
  gratis (50 visibles, 5 páginas). Fija también que hoy NO tolera errores de tipeo ni busca en la
  marca. `consultarCatalogo` se expone en `exports._test` (una línea). `npm run test:catalogo-dorado`.
  Red de seguridad de la proyección (TX34-B08).
- [x] 1.5 Prueba de compra en celular (TC «Compra completa»): portada → búsqueda o catálogo →
  ficha → carrito → checkout → paso a la pasarela simulada, a 360 y 390 px, en las 15 plantillas.
  Revisa desplazamiento horizontal, campos de 16 px, áreas de 44 px, textos legibles (P20) y
  elementos fijos cruzados.
  Se suma a un script de `package.json`, junto con `rendimientoMovil.test.js`.
  - **Éxito:** corre; hoy falla solo por lo que esta propuesta corrige (44 px, cruces), con la
    lista de fallas guardada.
  — Hecha el 26-oct (bloque TX34-B05, commit local): `tests/sitios/compraCelular.e2e.js` (medidor en
  `_medidorMovil.js`) sobre el servidor y el Chromium del laboratorio (D2), a 360 y 390 px en las 15
  plantillas (30 recorridos, 217 s). El POST del pedido lo contesta la prueba y el paso final llega a
  una pasarela simulada (`/pasarela-simulada`): no hay Wompi ni escrituras. Las tiendas de muestra
  llevan el aviso de cookies, el WhatsApp flotante y el botón de KAI encendidos. El medidor se
  autoprueba antes de cada corrida con una página de fallas conocidas.
  Resultado de hoy: no falla desplazamiento horizontal ni campos de 16 px en ningún paso; sí fallan
  44 px (2.727 en la lista), textos de 12 px (296), controles con texto de 14 px (1.054) y cruces
  (261: KAI sobre el aviso de cookies en las 15 plantillas, el carrito flotante sobre KAI y sobre el
  aviso, y el aviso de cookies tapando «Revisar mi pedido» y «Confirmar pedido» del checkout y, en 3
  recorridos, «Agregar al carrito»). Lista guardada en
  `tests/sitios/compraCelular.fallas.json` (4.338 líneas, una por falla). La prueba termina en rojo si
  falla otra categoría, si el recorrido no llega a la pasarela o si aparece una falla que no está en la
  lista; con `--estricto` no tolera ninguna (TX34-B06 las corrige y la lista se vacía).
  Script `npm run test:tienda-celular` (incluye `rendimientoMovil.test.js`); sin el Chromium del
  laboratorio el e2e se salta con un mensaje y sale con código 0.
- [x] 1.6 [S] Caracterización del pago: `/gracias` en cada estado (aprobado, pendiente, rechazado,
  anulado, vencido, a cuotas, con y sin regreso válido) y `/pagar` en cada estado, incluido el
  pedido del bot (F4-40 D11). Se apoya en `pedidoTiendaCaracterizacion`, `recordatorioPagoBase` y
  `pagoTiendaConciliacionBase`.
  - **Éxito:** verde con el código de hoy y con F2-41 unido.
  — Hecha el 3-nov (bloque TX34-B20), sin cambiar código: `tests/sitios/caracterizacionGraciasPagar.test.js`
  (10 pruebas, 9 grupos con instantánea propia), en la copia local del backend (D-566, no va a git).
  Cubre `/gracias` en cada estado del pedido (aprobado, pendiente, rechazado, anulado, vencido, a cuotas), con y
  sin regreso válido, y `/pagar` en cada estado. Hallazgos para 4.1 y 4.2: un pedido vencido o anulado con pago
  «Pendiente» sigue diciendo «Tu pago está en proceso»; `/pagar` de un pedido con pago «Rechazado» pero proceso
  vivo no lo frena. El pedido del bot (F4-40 D11) NO está en esta rama: se agrega a la 1.6 cuando llegue. La
  prueba versionada `tests/pagoCuotas/regresoGracias.test.js` se puso al día con los módulos nuevos de la página.
- [x] 1.7 [S] Caracterización del reintento del checkout: el mismo POST de crear pedido enviado
  dos veces, la segunda como si la primera respuesta se hubiera perdido (con celular y sin él).
  Fija qué devuelve hoy (`_duplicadoEvitado`, mismo `nroPedido`), que no descuenta inventario dos
  veces, no aparta otra reserva, y qué efectos repite (enlace de pago, contadores; D-496).
  - **Éxito:** verde con el código de hoy y con F2-41 unido; si deja un hueco, se anota para el
    diff de la 4.4.
  — Hecha el 3-nov (bloque TX34-B20), sin cambiar código: `tests/sitios/caracterizacionReintentoCheckout.test.js`
  (19 pruebas), en la copia local del backend (D-566). Con celular el segundo envío devuelve el mismo pedido
  sin otro consecutivo, descuento ni reserva, pero repite el enlace de pago, el correo al comprador, los avisos,
  el evento del sitio, el contador de pedidos del sitio y el uso del cupón. **Huecos para la 4.4:** (1) hay
  casos en que el reintento no se reconoce y crea un segundo pedido (compradores sin dato de contacto
  suficiente en la ficha, y dos envíos casi simultáneos); (2) el reintento falla con error aunque su pedido ya
  existe cuando la compra consumió la última unidad, un cupón de uso limitado o el tope del plan gratis;
  (3) el borde de reconocimiento es de 2 minutos contados desde que se armó el pedido. La 4.4 necesita la
  clave de idempotencia (diff aparte, con aprobación).

## 2. Contract tests primero (rojos hasta implementar; Artículo VIII)

- [x] 2.1 [P] `GET /sugerencias`: forma de la respuesta, sin precios, 404 sin catálogo visible,
  tope de longitud, nunca categorías ocultas.
  — `tests/sitios/sugerencias.contract.test.js` (19 pruebas; incluye `Cache-Control`, solo con `search` en `on`,
  plan gratis y límites del router).
- [x] 2.2 [P] `GET /catalogo`: los 5 órdenes, valor desconocido → orden de hoy, `sugerencias` con
  total 0, sin cantidades vendidas en la respuesta.
  — Hecha. Parte `sugerencias` con total 0 (bloque TX34-B10, `buscadorTienda.test.js`). Parte de los 5 órdenes
  (bloque TX34-B13): `tests/sitios/catalogoOrdenes.contract.test.js` (38 pruebas: vocabulario cerrado, novedad
  con producto sin fecha al final y empate estable, más vendidos con cálculo completo / incompleto / ausente /
  viejo o sin ventas, ocultas y agotadas fuera, plan gratis, orden + búsqueda tolerante + paginación, una sola lectura,
  sin cantidades ni escrituras).
- [x] 2.3 [P] `POST /vista` con agente de robot o automatizado → 204 sin escribir.
  — **`tests/sitios/vistaSinRobots.contract.test.js` (8 pruebas, roja contra el código anterior);
  bloque TX34-B03.**
- [x] 2.4 [P] Write-set: la tarea nocturna solo escribe `storeProductStats` [si P1]; la proyección
  y el buscador no escriben. Canario: una escritura en `products` u `orders` hace fallar la prueba.
  — **Avance (bloque TX34-B08): parte proyección hecha** (revisión estática de `indiceTienda.js` con
  canarios y una corrida con la Firestore en solo lectura, en `indiceTiendaSombra.test.js`).
  **Parte tarea nocturna hecha (bloque TX34-B12):** `ventasRecientes.writeSet.test.js` (29 pruebas: canario
  que falla con una escritura en `products`, `orders`, `inventory` o `inventoryMovement`, revisión estática del
  módulo y corrida con la Firestore falsa que solo escribe `storeProductStats/{docId de la empresa}`).
  **Parte `storeImageVariants` hecha (bloque TX34-B17):** `variantesFotosTienda.writeSet.test.js` (56 pruebas, con
  Storage y Firestore falsos): el dry-run no escribe ni abre el Storage; `compute` solo crea archivos nuevos con la
  precondición de que no existan y escribe solo `storeImageVariants/{docId}` (un `set` sin merge); `products`,
  `inventory`, `orders` y consecutivos quedan intactos; destino ocupado (otro token o empresa) omite la foto sin
  escribir nada de ella; revisión estática con canarios (un `update`, un `set`, un `batch`, un borrado o un segundo
  `save` agregados al módulo la hacen fallar); `indiceTienda.js` sigue leyendo solo `products`.
  **Parte buscador y autocompletar hecha (bloque TX34-B19):** `buscadorSinEscrituras.test.js` (4 pruebas: `buscadorTienda.js`
  y `sugerenciasTienda.js` no abren Firestore ni escriben, con canario; la única escritura del buscador en el controlador es
  `registrarEvento` del evento `busqueda_sin_resultado`, detrás de `modoBuscador === "on"`), más lo que ya probaban
  `sugerencias.contract.test.js` («solo lee», 19 pruebas, esta sí corrida con la Firestore en solo lectura) y
  `buscadorTienda.test.js` (el evento: saneado, nada con `off` o `shadow`). Con esto las cuatro partes de la 2.4 están.
  **Límite declarado:** el control del controlador del buscador es una revisión estática por texto (qué escritura hay entre
  `busqueda_sin_resultado` y el `204`), no una corrida con la Firestore en solo lectura: si se reescribe ese tramo, la prueba
  puede fallar o dejar pasar un cambio, así que se revisa a mano en cada cambio de `controllers/sites.js` ahí. Las pruebas
  no van a git (D-566).
- [ ] 2.5 [S] `/gracias`: «Reintentar pago» solo con regreso válido, pago rechazado o anulado,
  reserva vigente e interruptor encendido; la promesa del correo solo con regreso válido y correo
  salido o elegible.
- [x] 2.6 [P] La precarga de la ficha lleva el mismo `srcset` y `sizes` que su foto.
  — **Hecha (bloque TX34-B07):** `tests/sitios/precargaFichaSrcset.test.js` (11 pruebas) compara las dos listas, con fotos del constructor y de TX-37; probada en rojo cambiando el `imagesizes`.

## 3. Backend sin módulos sensibles

- [x] 3.1 Baliza sin robots (D3, VE «Las visitas cuentan personas»). Primero de todo: habilita
  medir en producción sin inflar visitas. Con P19 aprobada, no espera 0.1-0.3 ni el grupo 1: sale
  con los arreglos del paso 3 de D-518 y solo necesita su prueba. **Éxito:** 2.3 en verde.
  — **Hecha (bloque TX34-B03): lista cerrada `esAgenteAutomatizado` en `utils/siteAnalitica.js`,
  más los agentes que se declaran robot con «(compatible; …Bot)»; `registrarVista` responde 204
  sin leer ni escribir, y el navegador no manda la baliza con `navigator.webdriver`. Cambia a
  propósito la instantánea de `fichaEspecificaciones`, solo en la compuerta de la baliza: es el
  cambio de D3, aprobado con el diseño, y queda anotado para que Daniel lo vea. Sin interruptor,
  como dice D3.**
- [x] 3.2 [P] Áreas táctiles, textos legibles y elementos fijos (D9) en `siteHtml.js` y
  `siteTienda.js`; panel de filtros con Escape y toque fuera. **Éxito:** 1.5 sin fallas de 44 px,
  de textos ni cruces.
  — **Hecha (bloque TX34-B06):** bloque D9 al final de la hoja de la tienda (`estilosTienda`, solo ≤767 px,
  sin interruptor), pila fija barra de la ficha < carrito y WhatsApp < aviso de cookies < KAI con el alto
  del aviso entregado por una variable, aviso de cookies compacto y bajo el panel del carrito, y panel de
  filtros con Escape, toque en el fondo y foco de vuelta a «Filtrar». La 1.5 pasa en `--estricto`: 0 fallas
  en las 15 plantillas a 360 y 390 px (la lista de fallas quedó vacía). El medidor de cruces ahora da por
  libre un botón si en alguna altura de la pantalla nada lo tapa (un elemento fijo siempre tapa algo al
  desplazarse). Pruebas nuevas: `panelFiltrosMovil` y `elementosFijosMovil`. Texto mínimo con
  `max(14px,…)` para respetar «texto chico» de F2-17.
- [x] 3.3 [P] Error de red (D13) en catálogo, búsqueda y orden (el checkout va en la 4.4).
  **Éxito:** escenarios de ES «Error de red» del catálogo en prueba con red cortada.
  — **Hecha (bloque TX34-B06):** `traer()` pasa a «la última gana» (aborta la anterior; sin AbortController
  ignora la respuesta vieja). Si falla, responde sin éxito o no es JSON, deja los productos de antes y
  muestra un aviso `role="alert"` con «Reintentar» de 44 px que repite la misma petición. Prueba
  `catalogoErrorDeRed.test.js` con la red cortada en un Chromium de celular (7 escenarios; probada en
  rojo quitando el aviso y la regla de la última).
- [x] 3.4 [P] Imágenes (D14): `srcset` y `sizes` con variantes, precarga de la ficha con el
  mismo `srcset`, primera fila sin carga diferida, medidas reservadas; la portada JPEG de TX-37
  sin `srcset` salvo que TX-37 cambie su pregunta 7. **Éxito:** 2.6 en verde, VE «Fotos del
  tamaño justo» y CLS ≤ 0,1 en el laboratorio.
  — **Hecha (bloque TX34-B07):** `srcset` y `sizes` en tarjeta (2 columnas en celular), ficha y miniaturas con las variantes `-wN.webp` (constructor y TX-37); precarga de la ficha con la misma lista, tomada de la primera foto del bloque; el script de la ficha cambia `srcset` y `src` juntos; primera fila del catálogo (4) sin `loading=lazy` y la primera con `fetchpriority=high`, también en las tarjetas que arma el script; el espacio de la foto ya lo reserva `aspect-ratio`. Portada `-cover.jpg` y fotos sin variantes, como hoy. **CLS medido el 3-nov (bloque TX34-B19):** en el laboratorio, catálogo y ficha de `marca-premium`, `moda-coleccion` y
  `tecnologia-catalogo`, el CLS máximo es 0,065 con todo apagado y 0,027 con el cajón, el envío y el ranking encendidos (meta
  0,1; la base de `marca-premium` era 0,22). Se cumple en esas tres plantillas; las otras 12 se miden en la 6.1.
- [x] 3.5 Proyección de tienda (D1) en modo sombra, con invalidación, para todo lo público
  (catálogo, ficha, categorías con foto, afines, marcas, plan gratis, feed, sitemap, directorio y
  el precio y lo vendible de KAI). Banderas de D10 en `config/feature_flags.storeMobile` y
  `companies.featureFlags` (catálogo cerrado del backend y del front). **Éxito:** 1.4 en verde
  con `on`; en sombra, cero diferencias en el laboratorio, también en precios y ofertas;
  con `on`, `preciosVitrinaCache` y `ofertasVitrinaCache` ya no se cargan; medición 1.3 repetida.
  — **Avance (bloque TX34-B03): las banderas de D10 ya existen, todas apagadas: `storeMobile` en
  `services/platformFlags.js` (y `scripts/platform-flags.js`), las seis banderas de empresa en el
  catálogo del backend y del front, y `services/sites/modoTienda.js` con el modo efectivo
  (`tests/plataforma/storeMobileFlags.test.js`, 16 pruebas). Falta la proyección.
  Pendiente al desplegar (D10, columna «Al crear», D-385): FLORECER recibe `storeLightIndex`
  para que la sombra corra allí: `set-company-feature.js` primero en simulación y luego con
  `--execute`, solo con OK de Daniel. Sin esa bandera la sombra no corre en ninguna tienda.**
  — **Hecha (bloque TX34-B08, commit local):** `services/sites/indiceTienda.js` (una lectura de `products`
  por empresa, solo los campos de la tienda con `marketplace` entero; precio y oferta de vitrina con las
  funciones puras de `vitrinaProducto.js`; un registro por empresa con TTL de 5 min y la carga en vuelo
  compartida; `attributes` y `palabras` solo si se piden). Se invalida en `invalidateSearchIndex` y al
  publicar. Con `storeMobile.lightIndex` en `shadow` calcula los dos, sirve lo de hoy y cuenta las
  diferencias por empresa (sin términos ni datos del comprador); en `on` leen de la proyección
  `consultarCatalogo`, `categoriasConFoto`, `productosAfines`, `marcasDeTienda`,
  `productosVisiblesDelPlan` (el plan gratis), el feed, el sitemap, el directorio y lo vendible y el
  precio de KAI (que sigue leyendo del índice compartido solo descripción, características y etiquetas);
  la ficha compara en sombra su precio y lo vendible. Con `on`, `preciosVitrinaCache`,
  `ofertasVitrinaCache` y las fechas aparte ya no se leen (3 lecturas de `products` pasan a 1; probado
  con la Firestore falsa). Si la proyección falla, se sirve lo de hoy. `getSearchIndex`, el Seller y
  `tools/searchProducts.js` no cambian. Pruebas: `tests/sitios/indiceTiendaSombra.test.js` (cero
  diferencias en la muestra con ofertas, ofertas vencidas, lista mayorista y plan gratis, y en los 15
  sitios del laboratorio; canarios; `on` igual a `off`; invalidación; multi-tenant; write-set) y el golden
  de 1.4 con `on`, `shadow` y `off`.
  **Pendiente:** la medición 1.3 repetida sobre FLORECER y OH MY STORE (bloqueada); la bandera
  `storeLightIndex` en FLORECER al desplegar; P18: las facetas de F2-42 deben leer de la proyección
  (punto de extensión documentado en `indiceTienda.js`; no se tocó F2-42).
  **Nota (bloque TX34-B19):** la medición 1.3 repetida solo se hizo en `--dry-run` (D2): el índice compartido y la proyección
  en 2.500 y 8.568 productos, con el modo `lightIndex` apagado. **No se midió el laboratorio con `lightIndex` en `on`** (no estaba
  entre las piezas de la medición acotada): queda para la 6.1, junto con la sombra en FLORECER. El encendido de los otros
  interruptores no cambió ninguna respuesta del catálogo apagado (28 de 28 respuestas iguales).
- [x] 3.5b Clave de la caché del HTML sin parámetros de campaña (D15, revisión privada S4).
  **Éxito:** VE «Quien llega por un anuncio no espera de más»; prueba de atribución del pedido
  igual que hoy.
  — Hecho (TX34-B09, sin interruptor): la lista de campos de atribución es una sola y la comparten
  el script de captura y la clave; el segundo clic de otro anuncio sale de la copia reciente.
  Prueba `claveCacheHtml.test.js` (15) y las de atribución sin cambios. Resto: ver revisión
  privada (S4).
- [x] 3.6 Buscador tolerante (D4) en sombra, con atributos solo con `categoryAttributes`.
  **Éxito:** escenarios de BO; ≤ 50 ms con 8.568 productos de muestra.
  — Hecho (TX34-B10): `services/sites/buscadorTienda.js` (funciones puras) conectado en `consultarCatalogo`
  según `storeMobile.search` (off = hoy, shadow = sirve hoy y cuenta sin términos, on = nuevo). Prueba
  `buscadorTienda.test.js` (error de tipeo, marca y categoría, atributo, exacta antes que aproximada, ocultas;
  caliente 3,6 ms en el peor caso con 8.568 productos). Desvíos menores frente a D4: (1) las palabras se
  separan por campo (para el peso) y se calculan en el buscador, memorizadas por entrada, en vez de la lista
  única `palabras` de la proyección; (2) se suma un último escalón «contiene» (3 letras o más) para que `on`
  nunca encuentre menos que la subcadena de hoy; (3) los atributos solo se buscan sobre la proyección que se
  sirve (no en la sombra de `lightIndex`), con los valores que `valoresVisibles` muestra en la ficha.
- [x] 3.7 Autocompletar (D5): endpoint y lista accesible. **Éxito:** 2.1 en verde, revisión con axe
  sin errores nuevos, controles de la revisión privada.
  — Hecho (TX34-B11): `GET /sugerencias` (`services/sites/sugerenciasTienda.js`), lista combobox en la cabecera y el
  catálogo (`siteHtml.js`), clases `kq-auto*` (no `kq-sug*`, que es el «Completa tu pedido» del carrito). Prueba en
  navegador real con axe: `tests/sitios/autocompletarNavegador.test.js` (16 pruebas, escenario «Elegir con teclado»).
- [x] 3.8 Sin resultados (D7) y, [si P8], el evento por la baliza. **Éxito:** 2.2 en verde.
  — Hecho (TX34-B10): `sugerencias` (corrección con resultado a 2 errores o menos, hasta 4 categorías visibles,
  «Ver todo el catálogo» y WhatsApp) solo con `search` en `on`; el HTML y el script las pintan con enlaces y
  `textContent`. Evento `busqueda_sin_resultado` por `POST /vista` con su filtro de robots, solo con la búsqueda
  enviada (Enter, cabecera o `?q=`), una vez por término y sesión, saneado en el servidor y guardado solo con
  `on`. De la 2.2 queda en verde la parte de `sugerencias`; los 5 órdenes son del bloque TX34-B13.
- [x] 3.9 Tarea nocturna de ventas (D6): primero `--dry-run` que solo imprime totales por empresa
  (pedidos leídos, líneas sin resolver, si llegó al tope); luego modo `compute`. Resuelve cada
  línea por id y, si no, por referencia → docId; documento por docId de empresa; `completo:
  false` al llegar al tope. **Éxito:** dos corridas dan el mismo documento; un ranking truncado
  no se ofrece; registro estructurado.
  — Hecho (TX34-B12): `services/sites/ventasRecientes.js`, `scripts/ventas-recientes-tienda.js` (`--dry-run` por
  defecto, solo la copia `katuq_dev`) y `initStoreSalesRankingJob` en `cronService.js` (2:30 a. m. Colombia, con
  latido; con `storeMobile.salesRanking` en `off` no lee ni escribe nada). Nace apagada. La regla que cierra la
  colección nueva se despliega antes de la primera escritura (ver el diseño). «Alcanzar el tope» se lee como
  «quedaron pedidos sin leer»: con exactamente el tope el cálculo sale completo. Dos tiendas de la misma empresa se
  calculan una sola vez. **Para la 3.10:** el lector debe ofrecer «Lo más vendido» solo si el documento está completo
  y se calculó hace menos de 48 horas (`esCalculoVigente`); la tarea no toca el documento de una empresa que dejó
  de cumplir las condiciones.
- [x] 3.10 Orden por novedad y más vendidos (D6). **Éxito:** BO «Orden por novedad y por más
  vendidos».
  — Hecho (TX34-B13): `services/sites/ordenTienda.js` y su conexión en `consultarCatalogo`. Valores cerrados
  `relevancia` (orden de hoy), `precio-asc`, `precio-desc`, `novedad` y `mas-vendidos`; cualquier otro cae al
  orden de hoy. Con `storeMobile.salesRanking` en `off` o `compute` el catálogo y su HTML son los de hoy (la
  respuesta no lleva la clave `ordenes`); en `show` Y con un cálculo de ventas completo, de menos de 48 horas
  y con al menos una venta, la respuesta de `/catalogo` informa las claves ofrecidas (sin cifras) y el selector
  suma «Lo más nuevo» y «Lo más vendido» juntos; sin ventas vigentes (tienda nueva, documento ausente,
  incompleto, viejo o vacío) el HTML sale idéntico al de hoy. Las unidades se leen una vez por empresa (documento por docId de la empresa del sitio,
  solo lectura) y solo comparan: nunca salen en la respuesta, el HTML ni los registros. Con la proyección en
  `off`, la novedad usa las fechas de `products` (select de dos campos, memorizadas 5 min por empresa).
  Pendiente para B19: `?orden=` de la URL de entrada no se aplica en la primera carga (el estado del script nace
  vacío, como hoy, para no cambiar el HTML apagado); sí se conserva al paginar, filtrar y abrir el panel.
- [x] 3.11 «Calcula tu envío», tiempo de entrega e IVA en carrito y checkout (D11).
  **Éxito:** escenarios de EE con zonas, fijo, gratis desde, retiro y ciudad sin zona.
  — **Parte 1 hecha (TX34-B14):** «Calcula tu envío» en la ficha (bajo el precio y el
  plazo) y en el carrito (en lugar de «Según tu ciudad», solo con zonas), con la ciudad recordada y preseleccionada
  en el checkout. Nace apagado: `storeMobile.shippingEstimate` en `off` deja el HTML, el script y los estilos como
  hoy (los estilos van en la página, no en la hoja compartida). Zonas (una ciudad con varias muestra todas con
  nombre y tarifa; en el carrito es un solo selector compacto con «Mi ciudad no está» como última opción),
  envío fijo, gratis desde (cuánto falta), puntos de retiro y «Mi ciudad no está»
  (WhatsApp de la tienda o, sin él, el contacto del pie; nunca costo ni plazo). Solo se guarda en el navegador la
  zona elegida (id y ciudad), vence a las 24 h y al pagar; el cuerpo del POST del pedido y el cálculo del
  servidor no cambian.
  — **Parte 2 hecha (TX34-B15):** tiempo de entrega e «IVA incluido» en el carrito y el checkout, con el mismo
  interruptor `shippingEstimate` (apagado = idéntico a hoy, byte a byte). El botón de agregar de la ficha, la tarjeta, el
  destacado y las tarjetas que pinta el navegador lleva `data-plazo` (el mismo texto de `tiempoDeEntrega`) y `data-iva`
  (solo si el precio lleva IVA); la línea del carrito los guarda al agregarse. El carrito dice «Entrega desde N días» con
  el mayor de los plazos en días (también si otras líneas traen texto libre, D11), o el texto libre del comercio si
  ninguna línea da días y es uno solo; con textos libres distintos y sin días no dice nada (no hay «mayor» entre textos y
  elegir uno sería prometer lo que no se sabe). Sin plazo en ninguna línea no dice nada.
  «Precios con IVA incluido» solo si TODAS las líneas lo llevan (un carrito mixto, o con líneas de un carrito viejo o
  agregadas desde «Completa tu pedido» o favoritos, que hoy no traen el dato, no lo dice: es conservador a propósito). Dónde: en el carrito, al final de la
  lista de productos (el pie ya carga el cálculo del envío y a 640 px de alto una nota más dejaba la lista en menos de
  100 px); en «Tus datos» y «Revisa tu pedido», bajo el total. Solo presentación: el POST del pedido y los totales no
  cambian (hay prueba). Los carritos viejos del navegador no rompen y no aportan plazo.
- [ ] 3.12 [si P14] Aviso de la promesa de plazo en la revisión de publicación.
  — **Parte servidor hecha (TX34-B15); queda `[ ]` hasta que el editor la pinte:** `GET /v1/sites/:id/avisos-publicacion` (empresa del token) devuelve
  `data.avisos[]`; hoy el aviso `PLAZO_SIN_DATOS` cuando una sección visible (también dentro de las secciones libres)
  dice que el comprador ve el tiempo de entrega antes de pagar y ningún producto vendible de la empresa tiene tiempo de
  entrega que el comprador pueda ver (lectura mínima de `products`, por páginas de 300 y con tope de 3.000; no cuenta un
  producto de categoría oculta ni fuera del tope del plan gratis; con el tope alcanzado sin hallar plazo no afirma
  «ninguno»). No bloquea publicar y respeta el interruptor `shippingEstimate` (apagado, no avisa ni lee).
  **Pendiente (front, aparte; sin esto el escenario «Plantilla con la promesa» no se cumple de punta a punta):** que
  `sitio-editor.component.ts` llame a ese endpoint y sume el aviso a su lista de «lo que falta para vender»
  (`get pendientes`, que hoy se arma en el navegador y no sabe de los productos).
- [x] 3.13 Cajón lateral (D8) en el render publicado, en ≤767 px, con `<details>` como respaldo
  sin JavaScript. **Éxito:** escenarios de TC; revisión visual de las 15 plantillas a 360, 390,
  767 y 768 px con y sin `data-kq-ajustes`, y sin JavaScript.
  — **Hecho (TX34-B16), nace apagado:** `storeMobile.drawer` (global) + bandera `storeDrawer` (empresa), `off` por defecto;
  apagado, la página sale byte a byte como hoy (45 páginas del laboratorio idénticas) y no pide ni estilos ni script del
  cajón. Encendido, el encabezado pinta el botón «Menú» (tres rayas, 44 px) antes de la marca, y en ≤767 px esconde la fila de
  categorías, los enlaces sueltos y «Mi cuenta»/«Favoritos» de la barra (el buscador y el carrito se quedan); desde 768 px y en
  modo conversión, igual que hoy. Si no hay nada que mostrar en el panel, no hay botón.
  **Marcado final (lo espeja el editor, 5.1):** `<header class="… cabecera--cajon">` → `<details class="kq-menu" data-kq-menu>` →
  `<summary class="kq-menu__boton" aria-label="Menú">` (svg de tres rayas) + `<div class="kq-menu__panel" id="kq-menu-N"
  data-kq-menu-panel>` con `div.kq-menu__cabeza` (`span.kq-menu__titulo` «Menú» + `button.kq-menu__cerrar[data-kq-menu-cerrar]` ✕),
  `nav.kq-menu__grupo.kq-menu__grupo--cats[aria-label="Categorías"]` (las mismas categorías visibles de la fila, nunca las
  ocultas), `nav.kq-menu__grupo[aria-label="Enlaces de la tienda"]` (enlaces del menú), `div.kq-menu__grupo` con
  `button.kq-menu__item[data-kq-mi-cuenta]` y `button.kq-menu__item[data-kq-favoritos]` (si la tienda vende) y `div.kq-menu__grupo`
  con `a.kq-menu__item` de WhatsApp (bloque de WhatsApp de la página, con `data-clic="whatsapp"` y `data-bloque` del bloque de WhatsApp, o celular del pie, sin `data-clic`). «Mi cuenta» y «Favoritos» de la barra
  llevan además `cabecera__solo-ancho`. Sin JavaScript, el panel es una lista absoluta bajo la cabecera (`<details>` nativo);
  con JavaScript el script lo saca a `div.kq-menu__capa` en el `body` (z-index 90, por encima de la pila fija; así no lo atrapa el
  contexto de apilamiento de una cabecera `sticky`), con `role="dialog"`, `aria-modal`, foco atrapado, Escape, ✕, toque fuera,
  enlace seguido y ensanchar a ≥768 px; bloquea el scroll del fondo con `kq-sin-scroll` y devuelve el foco al botón. Ninguna clase
  contiene «p-». Estilos y script salen en el `<style>`/`<script nonce>` de la página solo con el cajón encendido
  (`utils/siteCajonLateral.js`); `/estilos.css` no cambia.
  **Medido (una vez, sobre la plantilla afectada):** barrido de 150 capturas (15 plantillas × 360/390/767/768, con y sin
  `data-kq-ajustes`, y 30 sin JavaScript): 0 cruces, 0 desplazamientos laterales, botón y renglones de 44 px o más.
- [x] 3.14 [si P6 = a] Variantes de las fotos originales (D16): primero `--dry-run` que cuenta
  fotos y bytes por empresa; luego la tarea con tope. Contract test del write-set: no escribe
  `products` ni pisa archivos. **Éxito:** la proyección pinta `srcset` en esas fotos; el
  laboratorio y PageSpeed con originales mejoran el LCP.
  — **Código hecho (bloque TX34-B17), apagado:** interruptor global `storeMobile.imageVariants` (`off | compute |
  on`, por defecto `off`) con topes por empresa (50) y por corrida (300); `services/sites/variantesFotosTienda.js`,
  `scripts/variantes-fotos-tienda.js` (`--dry-run` por defecto, `--compute --confirmo-storage-real`), tarea
  `storeImageVariants` a las 3:45 a. m. con latido; con `on`, `consultarCatalogo`, los bloques de producto y la
  ficha pintan `srcset` en las fotos con variantes (el documento lo lee la tienda, una vez cada 5 minutos por
  empresa, no al cargar la proyección: desvío anotado en D16). Las fotos que fallan se recuerdan con plazo de
  reintento, el documento se limita por bytes y el JSON-LD conserva la foto original. Con todo apagado,
  la respuesta y el HTML son idénticos (golden del catálogo en verde; prueba que lo compara con los modos `off`,
  `compute`, documento ausente y token cambiado). Detalle en D16 de `design.md`.
  **Bloqueado (no se hizo en esta sesión):** (1) la regla de Firebase que cierra `storeImageVariants` debe
  desplegarla Daniel antes de la primera corrida en `compute`, como con `storeProductStats`; (2) correr el dry-run contra
  `katuq_dev` y la primera corrida real en el Storage (necesita el OK de Daniel); (3) medir el LCP con el
  laboratorio y PageSpeed con originales ya convertidos; (4) confirmar los anchos contra el Storage real (0.6).

## 4. Pedidos, pagos y reserva [S] — después de F2-41, D-496 y suscripciones (T·2)

- [ ] 4.0 Revalidar las citas de D12 y D13 sobre la punta de la rama (con F2-41, D-496 y
  suscripciones unidos) y confirmar que la tarea privada 2.0 entró en F2-41 y que el registro del
  enlace de pago ya no lleva datos personales (revisión privada). **Éxito:** diseño al día.
  - Las dos confirmaciones de la revisión privada están en la rama (bloque TX34-B01, commit
    local sin unir, pendiente de la aprobación de Daniel). Falta revalidar D12 y D13 cuando
    entren D-496 y suscripciones.
- [ ] 4.1 [S] Diff 1: regreso de `crearPedido` y `retomarPago` a `/gracias` con el regreso que
  fija la revisión privada (el mismo que F2-41 ya trae corregido), y `crearPedido` lo devuelve al
  script. Sin tocar la rama del pedido del bot (F4-40 D11).
  **Éxito:** 1.6, `pedidoTiendaCaracterizacion` y las pruebas de F4-40 en verde, sin otro cambio
  en el pedido.
- [ ] 4.2 [S] Diff 2: «Reintentar pago» y «Este pedido venció» en `/gracias` (D12). **Éxito:** 2.5
  en verde; ES «Reintentar un pago rechazado».
- [ ] 4.3 [S] Diff 3 [si P15]: copia del pedido sin pagar y del carrito en el navegador antes de
  vaciarlo, aviso «Tienes un pedido sin pagar · Pagar» mientras la reserva viva y «Volver a armar
  mi carrito» después. **Éxito:** ES «Pedido sin pagar que no volvió a la confirmación» y «Pedido
  vencido y carrito recuperable».
- [ ] 4.4 [S] «Reintentar» del checkout (D13), sobre la caracterización 1.7. Si 1.7 dejó un hueco,
  primero un diff aparte con clave de idempotencia del navegador, con su aprobación. **Éxito:**
  ES «La respuesta se perdió»; 1.7 y `pedidoReservaDuplicada` en verde.

## 5. Vista previa del editor (front)

- [x] 5.1 Espejo en `sitio-render` (`.sitio--movil`): cajón, 16 px y 44 px, con las clases del
  render publicado. **Éxito:** TC «La vista previa del editor muestra lo mismo»; `npm run build`
  sin errores; sin gradientes ni primarios prohibidos nuevos en el módulo.
  — **Hecho (TX34-B18):** `sitio-render` recibe `cajonLateral` (por defecto `false`) y el editor se lo pasa desde la
  bandera de empresa `storeDrawer` (`cajonLateralPrevia`). Solo en la previa «Celular» y con la bandera, la cabecera lleva
  `cabecera--cajon` y el botón «Menú» (`kq-menu` / `kq-menu__boton`, 44 px) en lugar de la fila de categorías y los enlaces
  sueltos; el panel (`kq-menu__capa` > `kq-menu__panel`, mismas clases, mismos grupos y textos: categorías visibles hasta 8,
  enlaces, «Mi cuenta»/«Favoritos» si vende, WhatsApp del bloque de WhatsApp) sale en la capa pegada arriba del lienzo y mide
  lo que el marco. Abre con el botón y cierra con ✕, Escape, toque fuera o al elegir un renglón; atrapa el foco y lo devuelve
  al botón. Estado del componente: no toca servicios, eventos del editor ni modales. Sin la bandera, la previa muestra la fila
  de hoy, igual que el sitio publicado sin ella. El contenido del panel vive en `cajon-previa.ts` (espejo de
  `siteCajonLateral.js`). Además, dentro de `.sitio--movil`: campos de 16 px (D-461) y áreas de 44 px en el buscador, el
  carrito, «boton--chico», enlaces y categorías de la cabecera, «Agregar» y enlaces del pie (la misma lista de `siteTienda.js`
  que existe en la previa; los controles del propio editor no cambian). Sin textos nuevos en otros idiomas (el módulo no usa
  i18n). Sin degradados ni primarios prohibidos nuevos (SCSS 2 → 2, TS 1 → 1, HTML 0 → 0).
  **Límites conocidos (la previa no sigue al servidor en estos casos):** la bandera de empresa es lo único que el front
  conoce. El interruptor general `storeMobile.drawer` (incluido el kill switch: apagado o en sombra) y `paraTodas` viven en
  el servidor. Por eso, con el interruptor general apagado y `storeDrawer` encendido, la previa muestra el cajón y la tienda
  publicada la fila; con `paraTodas` y sin `storeDrawer`, al revés. Cerrarlo exige que una respuesta que el editor ya recibe
  traiga el modo efectivo (cambio de backend aparte, con su aprobación). Hasta entonces, antes de encender `paraTodas` o de
  usar el kill switch hay que tener presente que las previas no lo reflejan. La previa tampoco pinta «Mi cuenta» y
  «Favoritos» en la barra (nunca lo hizo), ni el modo conversión, ni el celular del pie como WhatsApp del panel (el front no
  recibe el contacto de la empresa), ni sabe si el catálogo está en otra página (`catalogoAparte`): como la fila de hoy, muestra
  las categorías cuando la cabecera las pide. Sin categorías reales usa las de ejemplo, igual que la fila.
  **Pendiente de cierre:** revisión visual en el editor real a 1440 y 390 px (se probó el CSS compilado con una réplica del
  marcado en Chrome, no el editor) y el build completo, que aquí no se corre; se comprobó con `tsc` y `ngc --noEmit`.
- [x] 5.2 [si P13] Revisar `/s/:slug` con el mismo componente.
  — **Revisada (TX34-B18), sin cambios de código — RESULTADO: `/s/:slug` NO recibe estos cambios.** `sitio-publico` usa
  `app-sitio-render` sin `dispositivo` ni `cajonLateral`; todo lo nuevo (cajón, 16 px y 44 px) cuelga de `.sitio--movil` o
  de `cajonLateral`, así que esa ruta, en un celular real, sigue como estaba (no cumple D-461 ni D9). La ruta sigue declarada
  en `app-routing.module.ts`, pero ningún enlace interno apunta a `/s/` (la tienda real sale del HTML del backend). Decide
  Daniel: retirar la ruta, o abrir un cambio aparte para que use las reglas móviles por ancho de pantalla.

## 6. Medición final y encendido (cada paso con OK de Daniel)

- [ ] 6.1 Laboratorio completo con todo encendido. **Éxito:** VE en verde en las 15 plantillas;
  si una no llega, informe con la causa antes de seguir.
  — **Antes de esto, medición acotada hecha el 3-nov (bloque TX34-B19; cifras y trazas en D2).** Con `drawer`, `shippingEstimate`
  y `salesRanking` en `show` en el laboratorio: CLS ≤ 0,027, INP 21–25 ms, Buenas prácticas 96, catálogo 82 en caliente y 71–74 en
  frío (por debajo de 90) y ficha 94 en caliente y 85 en frío. La causa del catálogo bajo 90 son las 14 fotos originales sin
  variantes (con fotos con variantes, 97 y LCP 2,4 s) y, en frío, la espera de las lecturas del servidor. **Pendientes para esta
  tarea:** (1) las otras 12 plantillas y la portada; (2) `lightIndex` en `on` e `imageVariants` en `on` con fotos convertidas; (3)
  el costo de ~6,6 KB comprimidos por página y ~0,15 s de LCP de la ficha con el cajón y el envío encendidos (D2); (4) el catálogo
  en frío de `moda-coleccion` (74 → 71); (5) la lectura real de la 1.3 y PageSpeed en producción (6.3), bloqueados hasta el OK
  de Daniel; (6) encender las banderas solo con su OK: todas nacen apagadas; (7) **LCP de 2,5 s o menos: no se cumple** (ficha
  2,8–3,0 s, catálogo 4,6–5,3 s en todas las celdas; 2,4 s solo con fotos con variantes); (8) **INP incompleto:** la spec pide
  menú, buscar, filtrar, agregar y carrito, y el flujo no incluyó «filtrar» (ni el menú en «Apagado»), así que 19–34 ms y 21–25 ms
  no son comparables; (9) **estabilidad del laboratorio** (la 1.1): repetir con `--repetir 2` o más antes de dar por válidas
  diferencias de 1–2 puntos; (10) la ficha pierde 1–2 puntos en 5 de sus 6 celdas con lo encendido (D2).
- [ ] 6.2 FLORECER (sus banderas en `companies.featureFlags`): `lightIndex`, `search`, `drawer`,
  `shippingEstimate` en `on`; `salesRanking` en `show`; revisión a 1440 y 390 px. **Éxito:** una
  semana sin diferencias ni errores.
- [ ] 6.3 Todas las tiendas (`paraTodas`), y `paymentRetry` en `on` después de 4.x. PageSpeed en
  producción obligatorio en FLORECER y en una tienda con fotos originales. **Éxito:** PageSpeed de
  90 o más, o la causa y la decisión de Daniel; decisión en el contrato y nota en el ticket TX-34.
- [ ] 6.4 Retiro de interruptores 30 días después (Artículo XII).
