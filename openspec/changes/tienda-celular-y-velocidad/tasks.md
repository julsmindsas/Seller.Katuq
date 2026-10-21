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
- [ ] 0.4 Revalidar las citas archivo:línea de `design.md` sobre la punta de
  `feature/tickets-web` (hoy con F2-41 sin commit). **Éxito:** citas corregidas en el diseño.
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

## 1. Medición base y caracterización (sin cambiar comportamiento)

- [ ] 1.1 [P] Laboratorio (D2): `renderPublico` real sobre la Firestore en memoria
  (`scripts/lib/firestoreFalsa`), 15 sitios de muestra, catálogo de prueba de 2.500 productos con
  fotos del peso medido en 0.5, corrida caliente y fría (con la demora de 1.3), Lighthouse 12.2.1
  y Chromium con versión fija como `devDependencies`, mediana de 3, aviso de cookies encendido,
  balizas y píxeles bloqueados, flujo de INP.
  - **Éxito:** `npm run lab:tienda` deja el JSON de cada corrida y una tabla por plantilla y
    página. Dos corridas seguidas difieren 5 puntos o menos (VE «Cómo se mide»).
- [ ] 1.2 Línea base del laboratorio con el código actual, con trazas de toda corrida bajo 90.
  **Éxito:** tabla base guardada; hipótesis del bimodal escrita con evidencia.
- [ ] 1.3 [P] `scripts/medir-render-frio.js --dry-run` (D2): tiempos por etapa del render, bytes
  y memoria del índice y de la proyección (con `imagenesPrincipales`), y demora por lectura, en
  FLORECER, OH MY STORE y lino-y-lona. **Éxito:** cifras en `design.md`; la demora alimenta la
  corrida fría de 1.1.
- [ ] 1.4 [P] Caracterización del catálogo: prueba dorada de `consultarCatalogo` con un catálogo
  de muestra (texto, categoría, marca, precio, oferta, ocasión, los 3 órdenes de hoy, plan gratis
  y ocultas). **Éxito:** verde con el código de hoy.
- [ ] 1.5 Prueba de compra en celular (TC «Compra completa»): portada → búsqueda o catálogo →
  ficha → carrito → checkout → paso a la pasarela simulada, a 360 y 390 px, en las 15 plantillas.
  Revisa desplazamiento horizontal, campos de 16 px, áreas de 44 px, textos legibles (P20) y
  elementos fijos cruzados.
  Se suma a un script de `package.json`, junto con `rendimientoMovil.test.js`.
  - **Éxito:** corre; hoy falla solo por lo que esta propuesta corrige (44 px, cruces), con la
    lista de fallas guardada.
- [ ] 1.6 [S] Caracterización del pago: `/gracias` en cada estado (aprobado, pendiente, rechazado,
  anulado, vencido, a cuotas, con y sin regreso válido) y `/pagar` en cada estado, incluido el
  pedido del bot (F4-40 D11). Se apoya en `pedidoTiendaCaracterizacion`, `recordatorioPagoBase` y
  `pagoTiendaConciliacionBase`.
  - **Éxito:** verde con el código de hoy y con F2-41 unido.
- [ ] 1.7 [S] Caracterización del reintento del checkout: el mismo POST de crear pedido enviado
  dos veces, la segunda como si la primera respuesta se hubiera perdido (con celular y sin él).
  Fija qué devuelve hoy (`_duplicadoEvitado`, mismo `nroPedido`), que no descuenta inventario dos
  veces, no aparta otra reserva, y qué efectos repite (enlace de pago, contadores; D-496).
  - **Éxito:** verde con el código de hoy y con F2-41 unido; si deja un hueco, se anota para el
    diff de la 4.4.

## 2. Contract tests primero (rojos hasta implementar; Artículo VIII)

- [ ] 2.1 [P] `GET /sugerencias`: forma de la respuesta, sin precios, 404 sin catálogo visible,
  tope de longitud, nunca categorías ocultas.
- [ ] 2.2 [P] `GET /catalogo`: los 5 órdenes, valor desconocido → orden de hoy, `sugerencias` con
  total 0, sin cantidades vendidas en la respuesta.
- [ ] 2.3 [P] `POST /vista` con agente de robot o automatizado → 204 sin escribir.
- [ ] 2.4 [P] Write-set: la tarea nocturna solo escribe `storeProductStats` [si P1]; la proyección
  y el buscador no escriben. Canario: una escritura en `products` u `orders` hace fallar la prueba.
- [ ] 2.5 [S] `/gracias`: «Reintentar pago» solo con regreso válido, pago rechazado o anulado,
  reserva vigente e interruptor encendido; la promesa del correo solo con regreso válido y correo
  salido o elegible.
- [ ] 2.6 [P] La precarga de la ficha lleva el mismo `srcset` y `sizes` que su foto.

## 3. Backend sin módulos sensibles

- [ ] 3.1 Baliza sin robots (D3, VE «Las visitas cuentan personas»). Primero de todo: habilita
  medir en producción sin inflar visitas. Con P19 aprobada, no espera 0.1-0.3 ni el grupo 1: sale
  con los arreglos del paso 3 de D-518 y solo necesita su prueba. **Éxito:** 2.3 en verde.
- [ ] 3.2 [P] Áreas táctiles, textos legibles y elementos fijos (D9) en `siteHtml.js` y
  `siteTienda.js`; panel de filtros con Escape y toque fuera. **Éxito:** 1.5 sin fallas de 44 px,
  de textos ni cruces.
- [ ] 3.3 [P] Error de red (D13) en catálogo, búsqueda y orden (el checkout va en la 4.4).
  **Éxito:** escenarios de ES «Error de red» del catálogo en prueba con red cortada.
- [ ] 3.4 [P] Imágenes (D14): `srcset` y `sizes` con variantes, precarga de la ficha con el
  mismo `srcset`, primera fila sin carga diferida, medidas reservadas; la portada JPEG de TX-37
  sin `srcset` salvo que TX-37 cambie su pregunta 7. **Éxito:** 2.6 en verde, VE «Fotos del
  tamaño justo» y CLS ≤ 0,1 en el laboratorio.
- [ ] 3.5 Proyección de tienda (D1) en modo sombra, con invalidación, para todo lo público
  (catálogo, ficha, categorías con foto, afines, marcas, plan gratis, feed, sitemap, directorio y
  el precio y lo vendible de KAI). Banderas de D10 en `config/feature_flags.storeMobile` y
  `companies.featureFlags` (catálogo cerrado del backend y del front). **Éxito:** 1.4 en verde
  con `on`; en sombra, cero diferencias en el laboratorio, también en precios y ofertas;
  con `on`, `preciosVitrinaCache` y `ofertasVitrinaCache` ya no se cargan; medición 1.3 repetida.
- [ ] 3.5b Clave de la caché del HTML sin parámetros de campaña (D15, revisión privada S4).
  **Éxito:** VE «Quien llega por un anuncio no espera de más»; prueba de atribución del pedido
  igual que hoy.
- [ ] 3.6 Buscador tolerante (D4) en sombra, con atributos solo con `categoryAttributes`.
  **Éxito:** escenarios de BO; ≤ 50 ms con 8.568 productos de muestra.
- [ ] 3.7 Autocompletar (D5): endpoint y lista accesible. **Éxito:** 2.1 en verde, revisión con axe
  sin errores nuevos, controles de la revisión privada.
- [ ] 3.8 Sin resultados (D7) y, [si P8], el evento por la baliza. **Éxito:** 2.2 en verde.
- [ ] 3.9 Tarea nocturna de ventas (D6): primero `--dry-run` que solo imprime totales por empresa
  (pedidos leídos, líneas sin resolver, si llegó al tope); luego modo `compute`. Resuelve cada
  línea por id y, si no, por referencia → docId; documento por docId de empresa; `completo:
  false` al llegar al tope. **Éxito:** dos corridas dan el mismo documento; un ranking truncado
  no se ofrece; registro estructurado.
- [ ] 3.10 Orden por novedad y más vendidos (D6). **Éxito:** BO «Orden por novedad y por más
  vendidos».
- [ ] 3.11 «Calcula tu envío», tiempo de entrega e IVA en carrito y checkout (D11).
  **Éxito:** escenarios de EE con zonas, fijo, gratis desde, retiro y ciudad sin zona.
- [ ] 3.12 [si P14] Aviso de la promesa de plazo en la revisión de publicación.
- [ ] 3.13 Cajón lateral (D8) en el render publicado, en ≤767 px, con `<details>` como respaldo
  sin JavaScript. **Éxito:** escenarios de TC; revisión visual de las 15 plantillas a 360, 390,
  767 y 768 px con y sin `data-kq-ajustes`, y sin JavaScript.
- [ ] 3.14 [si P6 = a] Variantes de las fotos originales (D16): primero `--dry-run` que cuenta
  fotos y bytes por empresa; luego la tarea con tope. Contract test del write-set: no escribe
  `products` ni pisa archivos. **Éxito:** la proyección pinta `srcset` en esas fotos; el
  laboratorio y PageSpeed con originales mejoran el LCP.

## 4. Pedidos, pagos y reserva [S] — después de F2-41, D-496 y suscripciones (T·2)

- [ ] 4.0 Revalidar las citas de D12 y D13 sobre la punta de la rama (con F2-41, D-496 y
  suscripciones unidos) y confirmar que la tarea privada 2.0 entró en F2-41 y que el registro del
  enlace de pago ya no lleva datos personales (revisión privada). **Éxito:** diseño al día.
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

- [ ] 5.1 Espejo en `sitio-render` (`.sitio--movil`): cajón, 16 px y 44 px, con las clases del
  render publicado. **Éxito:** TC «La vista previa del editor muestra lo mismo»; `npm run build`
  sin errores; sin gradientes ni primarios prohibidos nuevos en el módulo.
- [ ] 5.2 [si P13] Revisar `/s/:slug` con el mismo componente.

## 6. Medición final y encendido (cada paso con OK de Daniel)

- [ ] 6.1 Laboratorio completo con todo encendido. **Éxito:** VE en verde en las 15 plantillas;
  si una no llega, informe con la causa antes de seguir.
- [ ] 6.2 FLORECER (sus banderas en `companies.featureFlags`): `lightIndex`, `search`, `drawer`,
  `shippingEstimate` en `on`; `salesRanking` en `show`; revisión a 1440 y 390 px. **Éxito:** una
  semana sin diferencias ni errores.
- [ ] 6.3 Todas las tiendas (`paraTodas`), y `paymentRetry` en `on` después de 4.x. PageSpeed en
  producción obligatorio en FLORECER y en una tienda con fotos originales. **Éxito:** PageSpeed de
  90 o más, o la causa y la decisión de Daniel; decisión en el contrato y nota en el ticket TX-34.
- [ ] 6.4 Retiro de interruptores 30 días después (Artículo XII).
