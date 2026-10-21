> Arreglos de D-475 decididos en D-518, F2-43·6. Ticket F2-43, cd `UVaf50kn4UPbI358NGMk`.
> Backend `wt-back-tickets-web/functions` (rama `feature/tickets-web`, HEAD `c9e74ff0`, que ya
> incluye F2-41); front `wt-front-tickets-web` (HEAD `c81a4c30`). Código leído el 21-oct. Las
> líneas citadas son de HEAD: la copia de trabajo de `controllers/sites.js` tiene otro cambio
> en curso que las corre, así que las piezas se nombran por función. Requisitos en
> `specs/cotizable-tienda` (CT). Preguntas Cn en `proposal.md`.

## Context

**Se reutiliza sin modificar:**
- `cotizaciones.create` (`controllers/cotizaciones.js:245-330`): número con
  `generateCotizacionNumber` (`cotizaciones_counters`, en transacción), totales del servidor
  si no llegan, `contactoVendedor.completarVendedor` (agrega el celular de la ficha,
  `services/cotizaciones/contactoVendedor.js:38-50`) e historial de estados.
- `normalizarTienda` (`utils/siteBlocks.js:1416-1440`): `cotizables`, `textoCotizar` y
  `asesoresCotizacion`; la fusión que los conserva con un editor viejo (`sites.js:144`).
- `isAdminFamilyRole` y `normalizeRole` (`middleware/requireRole.js:54-65`). Ojo:
  `isAdminFamilyRole` también acepta «Super Administrador», el rol de soporte de la
  plataforma; NPS lo excluye a propósito (`services/nps/elegibilidad.js:56`). La forma de los
  usuarios de `users` (`empresa`/`company`, `roles`/`rol`, `email`, `nombre`, `activo`,
  `estado`) es la que lee `services/nps/correoComercios.js:96-104`.
- Correos de la tienda: `utils/siteCorreos.js` (`TEXTOS` :188, `MOMENTOS` :276, `envoltura`,
  `pieDeTienda`, `correoActivo`) y `services/sitios/correoComprador.js` (`cargarMarca` :20,
  marca idempotente `marcarSiFalta` :68, en transacción).
- Arnés `tests/sitios/_crearPedidoHarness.js` (vm + acorn sobre `sites.js`, Firestore falso
  que anota cada escritura, `orderService` y `limitsService` reales).
- Checkout del directorio Kuvo: `kuvoCheckout` (`sites.js:9717-9721`) →
  `services/kuvo/commerceRepository.js` arma el contexto con la tienda publicada del
  comercio (`:44-49`) y `services/kuvo/checkoutCore.js:98-107` valida cada producto y
  responde `PRODUCT_UNAVAILABLE` (409) si no se puede vender.

Los caminos por los que hoy un cotizable llega a un pedido están en la revisión privada del
backend (SC1 y SC6). Aquí solo se describe el arreglo.

## Decisions

### D1. Rechazo antes de escribir (módulo sensible, CT «no se compra»)
- **Tienda** (`crearPedido`): en el bucle de líneas, después de `idsComprables`
  (`sites.js:2829`), antes de cualquier escritura: si algún `productoId` está en
  `tienda.cotizables` (la tienda ya normalizada de `published`), responde **409**
  `{success:false, codigo:"COTIZABLE", message, data:{productos:[{id, titulo}]}}`. El título
  sale de `tienda.cotizables[].titulo` o, si está vacío, del maestro; nunca del navegador.
  - Antes de ese punto solo hay lecturas (tope del plan con `topeDePedidosDeTienda`, retiro y
    bodega). El rechazo no gasta número, cupo ni existencias.
  - Es el `codigo` que espera F4-40 (D10 de `pedido-whatsapp-con-link-de-pago`). Cuando
    D-496 extraiga el núcleo de `crearPedido` (su grupo 3), el rechazo pasa al núcleo con el
    resto de las validaciones de líneas (C1; tarea 0.8 de D-496).
- **Checkout de la tienda** (`siteTienda.js`, rama junto a `TOPE_PLAN`, `:1141`): con
  `codigo === 'COTIZABLE'` quita del carrito las líneas de esos ids, guarda, vuelve a la vista
  del carrito y muestra el mensaje del servidor con `textContent`.
- **Cuenta:** en `pedidosDeCuenta` (`sites.js:3728`), `vendibles` omite los ids de
  `tienda.cotizables` de la tienda publicada. Quedan contados en `noDisponibles` y fuera de
  `frecuentes` (`utils/siteCuentaMayorista.js:24`, `paraVolverAPedir` `:71`). Solo lectura.
- **Directorio Kuvo** (pregunta C10): `commerceRepository` agrega al contexto
  `cotizables` = ids de `tienda.cotizables` de la tienda publicada del comercio (la del sitio
  único que ya ubica, `raw.published.tienda`, aunque la configuración salga de
  `marketplaceKuvo`). `checkoutCore` trata esos ids como no vendibles en la misma condición de
  `:104`: `PRODUCT_UNAVAILABLE` con el texto «Este producto se cotiza con un asesor en la
  página del comercio». Se rechaza en la cotización y en el pedido de Kuvo, antes de escribir.
- **KAI web:** no se toca aquí (F4-40 D21, tarea 14.2).

### D2. Núcleo común de la cotización web (`services/sites/cotizacionWeb.js`)
`crearCotizacionWeb({sitio, siteId, producto|null, cantidad, cliente, necesidad, ciudad, campana, origenEnvio})`
reúne lo que hoy hace `cotizarProducto` después de validar: asesor, cuerpo para
`cotizaciones.create` (petición simulada, como hoy), aviso al asesor y acuse al cliente. Lo
usan `cotizarProducto` y el formulario en modo cotización (D6). Primero se extrae **sin
cambiar el comportamiento** (dorado de la tarea 1.2) y después se aplican D3 a D5.
- Sin producto (formulario), la cotización va sin líneas y con `subtotal`, `totalImpuesto`,
  `totalDescuento` y `total` en 0, para que el listado no muestre vacío.

### D3. Asesor (CT «asesor asignado siempre»)
1. Con `asesoresCotizacion`: el turno de hoy (`cotizacionesTurno`, en transacción).
2. Sin asesores: el administrador (pregunta C2). Se leen los `users` de la empresa por
   `empresa == company` y por `company == company` (los dos campos existen; comparación
   exacta con `sitio.company`), activos (`activo !== false` y `estado` distinto de `inactivo`
   o `bloqueado`), con `isAdminFamilyRole(roles || rol)` y **sin** el rol «Super
   Administrador» (`normalizeRole(rol) !== "super administrador"`, como NPS). Gana el que
   tiene el correo de la empresa (`companies.email`); si ninguno, el primero por correo.
   Solo lectura.
3. Sin administrador encontrado: `{email: "", nombre: "Página web"}`, como hoy, y evento
   `cotizacion_sin_asesor` en `site_events` (solo ids). El script de 3.8 lista las empresas
   cuyo administrador no se encuentra por la comparación exacta (mayúsculas o espacios
   distintos entre `users.empresa` y `sitio.company`).
- **Nombre:** para 1 y 2 se busca la ficha por correo en la empresa y se usa
  `nombre` + `apellido`; sin ficha, queda vacío y el listado sigue mostrando el correo
  (pregunta C7). `completarVendedor` sigue agregando el celular.
- El correo de aviso al asesor sale también en el caso 2.

### D4. Validez (CT «validez coherente»)
- El núcleo manda `validezDias: 15` **y** `fechaVencimiento` = instante de creación +
  15 × 24 h, con la misma forma que el valor por defecto de `create`. `cotizaciones.create`
  no cambia (pregunta C3). Las cotizaciones web ya creadas no se migran (pregunta C9).
- **Borrador abierto tarde (pregunta C11):** en `cotizacion-editor.component.ts`, al cargar
  una cotización en `borrador` cuya `fechaVencimiento` ya pasó (`:445-448`), el editor
  recalcula con su `recalcularVencimiento` (hoy + `validezDias`) y muestra un aviso «La
  fecha de validez se actualizó a hoy + N días». Al guardar o enviar, viaja esa fecha
  (`:2180`). Sin cambio en el servidor; aplica a borradores de cualquier origen.

### D5. Acuse al cliente (CT «acuse automático»)
- Momento nuevo `cotizacion_recibida` en `siteCorreos.js`: entrada en `TEXTOS` (nombre
  «Solicitud de cotización recibida», asunto «Recibimos tu solicitud {cotizacion} ·
  {tienda}») y generador en `MOMENTOS` con `envoltura` y `pieDeTienda`. Muestra número,
  producto (título del maestro), cantidad, nombre del asesor y, si la tienda tiene WhatsApp,
  el botón. No muestra precios ni nada que haya escrito el visitante (necesidad, ciudad ni
  su nombre: el saludo es genérico). La variable `{nombre}` de los demás momentos no existe
  en este, aunque el comercio redacte el texto.
- Se suma a la lista de momentos que normaliza la tienda (`siteBlocks.js:1529`) y a la del
  editor (`MOMENTOS_CORREO`, `sitios/editor/sitio-editor.component.ts:1624`): el comercio lo
  puede apagar o redactar.
- `correoComprador.enviarCotizacionRecibida(cotizacionId, sitio, datos)`: si el momento está
  activo, hay correo válido y los topes lo permiten, pone `correosEnviados.cotizacion_recibida`
  en la cotización **en transacción antes de enviar** (patrón de `marcarSiFalta`, sobre
  `cotizaciones`), registra `acuse_cotizacion` en `site_events` con la huella del correo y
  envía con `replyTo` = correo del asesor si existe, si no el de la tienda. Nunca lanza; no
  frena la respuesta.
- Topes y huella: ver revisión privada del backend (SC3).

### D6. Formulario en modo cotización (CT «formulario que crea cotización»)
- `formulario` en `siteBlocks.js:920` gana `destino: "prospecto" | "cotizacion"`; cualquier
  otro valor es `prospecto`.
- Render (`siteHtml.js:2169`): el bucle de bloques (`:6317`) pasa el id del bloque en
  `datos.__bloqueId`; solo en modo cotización, el `<form>` lleva
  `data-kq-destino="cotizacion"` y `data-kq-bloque="<id>"`, y el script (`siteHtml.js:4656`)
  agrega ese `bloqueId` al cuerpo de `/lead`. Los formularios en modo prospecto quedan con el
  HTML de hoy. Igual en las páginas propias, que usan el mismo render.
- `crearLead` (`sites.js:1197`): si `bloqueId` corresponde a un bloque `formulario` visible
  del contenido **publicado** (inicio o `paginas[].bloques`) con `destino === "cotizacion"`,
  valida igual que hoy (nombre, y teléfono o correo) y llama a `crearCotizacionWeb` sin
  producto; no escribe en `prospects`. Si no, sigue como prospecto. El servidor no lee un
  `destino` del cuerpo. La autorización de correos (D-318) sigue igual.
- **Métricas:** `leadsCount` y el evento `lead` se registran igual en los dos modos (la
  métrica de contactos del constructor no cambia); el modo cotización no agrega el evento
  `cotizacion` del producto.
- `data/siteTemplates.js:1219` (`tecnologia-catalogo`): `destino: "cotizacion"`.
- Seller, editor del bloque (`sitios/editor/sitio-editor.component.html:962-985`): opción
  «Cada envío crea» con «Prospecto en el CRM» o «Cotización en borrador»; la nota de `:985`
  cambia según la opción (pregunta C12). Los sitios ya publicados no se tocan (pregunta C4).

### D7. Origen en el listado (CT «origen visible»)
`cotizaciones-lista.component.html:479-492`: un tercer distintivo
`*ngIf="c.origen === 'sitio-web'"` con `class="origen-chip"` (la clase base, sin modificador:
ningún nombre de clase nuevo contiene «p-»), texto «Web» y `title` «Solicitud desde la página
web». Mismos tokens del distintivo «Catálogo». Sin columnas, filtros ni eventos nuevos.

### D8. Textos del editor
`sitios/editor/sitio-editor.component.html:3106`: «Sin asesores, las recibe el administrador
de la empresa. Usa correos de usuarios de tu empresa para que salga su nombre». El editor no
carga hoy los usuarios; validar cada correo contra ellos queda para la respuesta a C7.

## Write-set y pruebas

| Escribe | Solo por |
|---|---|
| `cotizaciones` (documento nuevo) | `cotizaciones.create` |
| `cotizaciones.correosEnviados.cotizacion_recibida` | `enviarCotizacionRecibida`, en transacción |
| `cotizaciones_counters` | `generateCotizacionNumber` |
| `sites.cotizacionesTurno`, `sites.leadsCount` | turno de asesores y `crearLead`, como hoy |
| `site_events` | `registrarEvento`: `cotizacion`, `lead` (como hoy), `cotizacion_sin_asesor` y `acuse_cotizacion` (ids y huella del correo) |
| `prospects` | solo formularios en modo prospecto y boletín, como hoy |
| suscriptores de correo (D-318) | `registrarSuscripcion`, como hoy |

- **Solo lectura:** `users`, `companies`, `products`, `sites` y, en Kuvo, lo que ya lee su
  contexto.
- **El rechazo no escribe nada**, ni en la tienda ni en Kuvo. Prohibido en todo el cambio:
  `products`, precios, listas de precios, `orders`, `consecutives`, `inventory`,
  `inventoryMovement` y el cupo del plan.

**Pruebas** (arnés de D-496 extendido, tarea 1.1; Kuvo con `tests/kuvo/checkoutCore.test.js`
y sus suites): caracterización primero (grupo 1, verde con el código de hoy), contract tests
después (grupo 2, rojos hasta implementar). El write-set se prueba como lista de permitidos.
La prueba de fuente de `productosCotizables.test.js` (líneas 39-51) se reemplaza por una que
ejecuta el flujo.

## Gates constitucionales
- **I** propuesta, spec y tareas aprobadas antes del código; la decisión ya es D-518.
- **II** la spec no nombra tecnología. **III** sin enmiendas.
- **IV** acuse una vez por cotización (marca en transacción); el rechazo no escribe.
- **V, X** no hay webhook. **VI** no hay proveedor en la UI.
- **VII** eventos `cotizacion_sin_asesor` y `acuse_cotizacion`, y logs con ids; no hay
  integración externa nueva.
- **VIII** contract tests de `crearPedido` (409), Kuvo, `cotizar-producto` y `/lead` antes
  del código.
- **IX** sin componentes nuevos: cambios en plantillas existentes de NgModule.
- **XI** sin correo, teléfono ni nombre en logs. **XII** sin banderas nuevas: son arreglos de
  lo publicado. **XIII** una spec de menos de 3 páginas. **XIV** decisión en `CONTRACT.md`.
  **XV** no aplica.

## Diseño (D-398 a D-400)
Solo cambian textos, un aviso del editor de cotizaciones y un distintivo en pantallas
existentes. Chequeo de cierre: build de producción; gradientes y primarios prohibidos de
`cotizaciones` y `sitios` no suben; ninguna clase nueva con «p-»; todo `span` nuevo con texto
lleva color y tamaño propios; revisión a 1440 y 390 px.

## Risks / Trade-offs
- **Unión con D-496:** el rechazo es una condición en el bucle de líneas; se mueve con la
  extracción del núcleo (C1).
- **Carrito que pierde líneas:** se prefiere a cobrar un cotizable; el mensaje dice cuáles.
- **Administrador elegido por regla fija:** si el comercio tiene varios, siempre es el mismo
  hasta que configure asesores (C2). Una diferencia de mayúsculas entre el usuario y la
  empresa deja la cotización sin asesor y con evento; el script de 3.8 las lista.
- **Correo a direcciones escritas por visitantes:** topes y contenido fijo (revisión
  privada).
- **Kuvo:** la app conoce `PRODUCT_UNAVAILABLE`; un texto distinto no rompe su contrato (C10).
