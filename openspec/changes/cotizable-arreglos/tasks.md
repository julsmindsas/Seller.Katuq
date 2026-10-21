> Arreglos del cotizable (D-475), decididos en D-518 F2-43·6. Ticket F2-43, cd
> `UVaf50kn4UPbI358NGMk` (se cita por cd).
> - Backend: `wt-back-tickets-web/functions/`. Front: `wt-front-tickets-web/`. Rama
>   `feature/tickets-web`, sin push ni despliegue sin OK de Daniel (D-518).
> - Requisitos: `specs/cotizable-tienda` (CT). Preguntas Cn: `proposal.md`.
>
> **[S]** = módulo sensible (pedidos): un cambio a la vez, con su diff aprobado por Daniel
> antes de aplicarlo. **[P]** = paralelizable. **[si Cn]** = solo si la respuesta a Cn lo
> pide.
>
> Cada tarea lee los archivos que toca antes de editarlos y cierra con sus pruebas y el build
> en verde. Con el build roto no se avanza.

## 0. Antes de programar

- [ ] 0.1 Daniel aprueba propuesta, spec CT y estas tareas, y responde C1-C12 (o acepta las
  recomendaciones).
  - **Éxito:** decisión anotada en `specs/CONTRACT.md` por quien registra; requisitos
    provisionales cerrados.
- [ ] 0.2 Revisión privada del backend (`openspec/changes/suscripciones-en-la-tienda-seguridad`,
  sección del cotizable, SC1-SC6) aprobada por Daniel.
  - **Éxito:** sus controles quedan en las tareas 2.x y 3.x que los cubren.
- [ ] 0.3 Orden de unión (C1): F2-41 ya está en `feature/tickets-web` (`c9e74ff0`). Antes de
  3.5 y 3.7, revalidar las citas archivo:línea de `design.md` contra la punta de la rama (otro
  cambio en curso mueve `controllers/sites.js`) y confirmar que el grupo 3 de D-496 aún no se
  unió.
  - **Éxito:** citas corregidas en `design.md`; orden anotado.
- [ ] 0.4 Línea base: correr `tests/sitios`, `tests/kuvo`, `test:cotizaciones-metricas`,
  `test:cotizaciones-contract` y `scripts/test-sitios-publicacion.js`, y anotar los fallos
  previos. **Éxito:** lista de fallos previos en este archivo.

## 1. Caracterización (verde con el código de hoy)

**Dep.:** 0.1. Cada prueba cita la función y el archivo que fija.

- [ ] 1.1 Extender `tests/sitios/_crearPedidoHarness.js` (o un arnés hermano) para correr
  `cotizarProducto`, `crearLead` y `pedidosDeCuenta` con `controllers/cotizaciones.js` real
  sobre el Firestore falso, con espías de correo. **Éxito:** las suites que usan el arnés
  siguen en verde.
- [ ] 1.2 [P] `cotizarProducto` hoy: dos solicitudes dan dos números y asesores alternados;
  origen, `siteId` y campaña; producto no marcado o de otra empresa da 404 sin escrituras;
  sin asesores queda «Página web» sin correo; `validezDias` 15 con fecha a 30 días (se fija
  el error a propósito). Dorado de escrituras y efectos.
- [ ] 1.3 [P] `crearPedido` con un cotizable en el carrito: hoy crea el pedido. Se fija como
  escenario nuevo, sin cambiar los existentes de `pedidoTiendaCaracterizacion.golden.json`.
- [ ] 1.4 [P] `pedidosDeCuenta`: hoy un cotizable sale en `volverAPedir` y en `frecuentes`.
- [ ] 1.5 [P] `crearLead` con el formulario, en el inicio y en una página: escribe en
  `prospects`, suma `leadsCount` y el evento `lead`; el boletín y la casilla de autorización
  (D-318) se comportan como hoy.
- [ ] 1.6 [P] Kuvo (`tests/kuvo/checkoutCore.test.js`): hoy un producto marcado como cotizable
  en la tienda publicada del comercio pasa la validación de `checkoutCore`. **[si C10]**

## 2. Contract tests (rojos hasta implementar; Artículo VIII)

**Dep.:** grupo 1. Cada prueba cita su requisito CT.

- [ ] 2.1 `crearPedido` con un cotizable: 409, `codigo: "COTIZABLE"`, ids y títulos; cero
  escrituras (lista de permitidos vacía): `orders`, `consecutives`, cupo en `companies`,
  `inventory`, `inventoryMovement`; `products`, variantes, precios y listas idénticos. Sin
  cotizables, el resultado es igual al dorado de 1.3 y al de D-496. (CT «no se compra»)
- [ ] 2.2 [P] `pedidosDeCuenta`: el cotizable sale de `volverAPedir` y `frecuentes` y cuenta
  en `noDisponibles`. (CT «no se compra»)
- [ ] 2.3 [P] Asesor: sin asesores, el administrador según C2 (con correo de la empresa; sin
  él, el primero por correo); inactivos, de otra empresa y con rol «Super Administrador» no
  cuentan; nombre de la ficha; sin administrador, «Página web» y evento
  `cotizacion_sin_asesor`; correo al asesor en los dos casos. (CT «asesor asignado»)
- [ ] 2.4 [P] Validez: `validezDias` 15 y `fechaVencimiento` = creación + 15 días. (CT
  «validez»)
- [ ] 2.5 [P] Acuse: sale una vez con dos intentos; no sale sin correo, con correo inválido,
  con el momento apagado ni por encima de los topes (SC3); no lleva precios ni nada escrito
  por el visitante (necesidad, ciudad, nombre); un fallo del envío no cambia la respuesta
  201. (CT «acuse»)
- [ ] 2.6 [P] Formulario: con un bloque publicado en modo cotización (en el inicio y en una
  página), `/lead` con su `bloqueId` crea cotización sin líneas y con totales en 0, no escribe
  `prospects`, manda el acuse y suma `leadsCount` y `lead` como antes; con el `bloqueId` de un
  formulario en modo prospecto, de un bloque oculto o inexistente, o con un `destino` en el
  cuerpo, crea prospecto; el boletín no cambia. (CT «formulario»)
- [ ] 2.7 [P] Render: `data-kq-destino` y `data-kq-bloque` solo en formularios de cotización;
  la plantilla `tecnologia-catalogo` trae `destino: "cotizacion"`; los scripts de la página
  compilan (`new Function`); sin cotizables ni formulario de cotización, el HTML es idéntico.
- [ ] 2.8 [P] Logs: ningún log ni respuesta de error lleva nombre, correo ni teléfono.
- [ ] 2.9 [P] **[si C10]** Kuvo: un cotizable da `PRODUCT_UNAVAILABLE` con el texto de C10 en la
  cotización y en el pedido, sin escrituras; un producto no cotizable, igual que antes. (CT
  «no se compra»)
- [ ] 2.10 Revisión privada: las pruebas que pida la sección del cotizable (0.2).

## 3. Backend

- [ ] 3.1 `services/sites/cotizacionWeb.js` con `crearCotizacionWeb`, extraído de
  `cotizarProducto` sin cambiar el comportamiento. **Dep.:** 1.2. **Éxito:** el dorado de 1.2
  da lo mismo.
- [ ] 3.2 Asesor por defecto y nombre (D3). **Dep.:** 3.1. **Éxito:** 2.3.
- [ ] 3.3 [P] Validez (D4, servidor). **Dep.:** 3.1. **Éxito:** 2.4; 1.2 cambia solo en la
  fecha.
- [ ] 3.4 Acuse: momento `cotizacion_recibida` en `siteCorreos.js` y en la normalización de
  `correos` de `siteBlocks.js`; `correoComprador.enviarCotizacionRecibida` con la marca en la
  cotización y los topes de SC3. **Dep.:** 3.1, 0.3. **Éxito:** 2.5 y las pruebas de correos
  de la tienda.
- [ ] 3.5 [S] Rechazo en `crearPedido` (D1) y rama `COTIZABLE` del checkout en
  `siteTienda.js`. Diff aprobado por Daniel. **Dep.:** 0.3, 2.1. **Éxito:** 2.1; dorados de
  `crearPedido` y suites de checkout sin cambios.
- [ ] 3.6 [P] `pedidosDeCuenta` sin cotizables (D1, cuenta). **Dep.:** 2.2. **Éxito:** 2.2 y
  `portalMayorista.test.js` en verde.
- [ ] 3.7 Formulario en modo cotización (D6): normalización, `__bloqueId` en el render,
  script, `crearLead` (inicio y páginas) y la plantilla. **Dep.:** 3.1, 0.3. **Éxito:** 2.6 y
  2.7.
- [ ] 3.8 [P] `scripts/cotizable-revision.js`, solo lectura y `--dry-run` por defecto: sitios
  publicados con `plantillaId: "tecnologia-catalogo"` y su formulario, cotizaciones web con
  la fecha a 30 días (C4, C9) y empresas con sitio publicado cuyo administrador no se
  encuentra por comparación exacta de la empresa (D3). **Éxito:** imprime conteos e ids, sin
  escribir.
- [ ] 3.9 [si C10] [S] Kuvo: `cotizables` en el contexto de `commerceRepository` y la
  condición en `checkoutCore` (D1). Diff aparte aprobado por Daniel. **Dep.:** 1.6, 2.9.
  **Éxito:** 2.9 y las suites de `tests/kuvo` contra la línea base.
- [ ] 3.10 [si C3] [S] `cotizaciones.create` calcula `fechaVencimiento` desde `validezDias`
  cuando no llega fecha. Diff aparte. **Éxito:** `test:cotizaciones-contract` y una prueba
  nueva por cada origen (bot, catálogo, web, Seller).
- [ ] 3.11 Reemplazar la prueba de fuente de `productosCotizables.test.js` (líneas 39-51) por
  las de los grupos 1 y 2, y sumarlas a un script de `package.json`.
  **Éxito:** `npm run test:cotizable` en verde.
- [ ] 3.12 Suites de 0.4 contra la línea base, antes y después de 3.5 y de 3.9.
  **Éxito:** ningún fallo nuevo.

## 4. Seller

- [ ] 4.1 [P] Distintivo «Web» en `cotizaciones-lista.component.html` (D7). **Éxito:** sin
  columnas, filtros ni eventos nuevos; ninguna clase nueva contiene «p-».
- [ ] 4.2 [P] Editor de sitios (`sitios/editor/sitio-editor.component.*`): texto de asesores
  (D8), opción «Cada envío crea» del bloque formulario (D6) y el momento `cotizacion_recibida`
  en `MOMENTOS_CORREO`. **Dep.:** 3.4, 3.7. **Éxito:** un sitio guardado con un editor viejo
  conserva `destino`.
- [ ] 4.3 [P] **[si C11]** Editor de cotizaciones: un borrador con la fecha pasada se abre con
  hoy + `validezDias` y el aviso (D4). **Éxito:** prueba del componente; un borrador vigente y
  una cotización enviada no cambian su fecha.
- [ ] 4.4 Cierre de diseño: `npm run build:prod` sin errores; gradientes y primarios
  prohibidos de `cotizaciones` y `sitios` no suben; revisión a 1440 y 390 px sin scroll
  horizontal ni texto invisible.

## 5. Despliegue (cada paso con OK de Daniel)

- [ ] 5.1 Backend con candado de publicación. **Éxito:** en FLORECER, un cotizable en el
  carrito da el mensaje y no crea pedido; una solicitud con correo crea la cotización con
  asesor, «Web», validez de 15 días y un acuse.
- [ ] 5.2 Front. **Éxito:** el candado pasa sin forzar; listado y editores revisados a 1440 y
  390 px.
- [ ] 5.3 Sitio de prueba con la plantilla Tecnología: «Pedir cotización» crea cotización y no
  prospecto. Con C4: aviso a los comercios que liste 3.8.
- [ ] 5.4 Bitácora en `specs/CONTRACT.md` con commits y lo verificado, y comentario técnico
  en el ticket `UVaf50kn4UPbI358NGMk` (lo hace quien tenga la autorización).
