> **Estado:** DISEÑO, pendiente de aprobación de Daniel. Decisión **D-546** (propuesta aprobada el 2026-10-23). Tickets 1335 (F1), 1337 (F2) y 1336 (F3) de ALMARA FELICIDAD. Sin código hasta aprobar este diseño y `tasks.md`.

## Context

- **Pantalla:** el menú lateral de todo Katuq. Lo arman `shared/services/nav.service.ts` (datos, permisos y banderas) y `shared/components/sidebar/sidebar.component.*` (vista). Lo leen además la barra inferior del celular, el buscador del encabezado, el editor de roles y la ventana de opinar.
- **Punto de partida:** el commit `4a84f91f` (ticket 1334). Con él, el nombre va en máximo dos líneas, sin partir palabras (`@mixin ktq-nombre-menu`, `sidebar.component.scss:458`), y la insignia baja a una segunda línea (`:1665-1691`). La F1 reemplaza ese segundo renglón por la zona derecha fija y conserva el nombre de dos líneas.
- **Lo que dice el código y manda en el diseño:**
  - **Tres niveles.** El nivel 1 es la sección (`headTitle1`), el 2 es el grupo o el enlace directo (`.menu-link`) y el 3 son los hijos del grupo (`.submenu-link`). Hoy ningún hijo tiene nietos: el `sub-submenu` de la plantilla (`sidebar.component.html:391`) no se usa.
  - **Permisos por ruta.** `filterMenuItemsByAuthorization` (`nav.service.ts:246`) compara rutas con `authorizedMenuItems`. Las reglas especiales viven solo en la rama de hijos de un grupo: `permisoPrevio`, el centro DIAN (`facturacion-electronica`), Katuq en vivo y Contabilidad (`:348-358`). Un hijo que se vuelva enlace de primer nivel pierde esas reglas. Por eso la F3 **no cambia la forma de los datos**: la vuelve a dibujar.
  - **Dependencias del texto:**
    - los canales PRONTO se agregan al grupo que se llama «Mensajes» (`nav.service.ts:371`);
    - «Creación rápida» se ofrece bajo el grupo «Productos» (`roles.component.ts:18` y `:140`);
    - el ícono de cada sección sale de su título (`getSectionIcon`, `sidebar.component.ts:1368`);
    - los íconos de grupos e hijos se traducen de Feather a Font Awesome con un diccionario, y lo que falta cae en un círculo (`getMenuIcon`, `:1553`);
    - los favoritos se reconocen por ruta y título (`toggleFavorite`/`isFavorite`, `:2148` y `:2233`). Los de una sección se reconocen solo por el título (`cadenaDeSeccion`, `:2191`);
    - el estado plegado de cada sección se guarda por título (`sidebarSectionsState`, `:708`);
    - la ventana de opinar nombra la pantalla por el título del menú (`nombreDePantalla`, `opinar-modal.component.ts:48`).
  - **El buscador del encabezado** pinta los resultados del menú con `app-feather-icons [icon]="m.icon"` (`header/elements/search/search.component.html:48`). Por eso el campo `icon` (Feather) no se puede reemplazar por nombres de Tabler.
  - **`shouldHide`** (`sidebar.component.ts:588`) esconde cualquier entrada cuyo título contenga «empresa», «usuario» o «rol». Por eso el grupo Seguridad queda hoy sin hijos visibles.
  - **Tres estados de «menú angosto».**
    - El colapsado (`collapseMenu`, 80 px, `sidebarCollapsed` en localStorage) se expande completo al pasar el puntero (`onMouseEnter`, `:36`).
    - El submenú flotante (`showCollapsedSubmenu`, `:2403`) solo sale con clic y sin expansión. Arma el DOM a mano y su posición no aplica: escribe `` `${rect.right + 12} px` `` con un espacio (`:2432-2435`).
    - Además existe un «modo compacto» (`isCompactMode`, `sidebarCompactMode`, y `katuq_sidebar_state` de `LayoutService`) que ninguna plantilla permite encender.
  - **Anchos repartidos en varios lugares:**
    - `:root { --sidebar-width: 260px; --sidebar-collapsed-width: 80px }` (`styles.scss:634`) para el encabezado;
    - el tema fija 260 px a mano en `assets/scss/layout/_sidebar.scss:1153`, `:1181` y `:1809`;
    - `LayoutService.autoCollapseConfig` repite 70/260.
  - **Trampas de CSS global** sobre el menú (`styles.scss:739-760`): `.sidebar-wrapper i` a 10 px, `.menu-icon i` a 11 px, `.favorite-btn` a 8 px y `.menu-link` a 12 px, todos con `!important`.
  - **Pruebas que ya existen:** `tests/navigation/*.test.js` (`node --test`) ejecutan el `NavService` real con un fixture. `future-message-channels.test.js` busca el grupo por `title === 'Mensajes'`, y `sidebar-menu.test.js` prueba el submenú flotante.
- **Línea base de diseño (2026-10-23):** `shared/components/sidebar` tiene 0 gradientes y 0 primarios prohibidos. No debe subir.

## Goals / Non-Goals

**Goals:**
- **F1:** menú de 264 px. Filas de tres zonas en las que el nombre se lee completo y conviven la insignia, la estrella, el chevron y el punto. Favoritos arriba con su grupo.
- **F2:** un ícono Tabler propio por sección y grupo, y un solo modo compacto de 72 px con panel flotante por grupo.
- **F3:** el mapa de ALMARA sin tocar rutas ni permisos. Favoritos conservados, búsqueda por el nombre anterior y editor de roles legible.

**Non-Goals:** los de la propuesta:
- el 1334;
- rutas, permisos y roles;
- lo que el 1336 pide fuera del menú;
- encabezado, buscador global, Mi Plan y Configuración de empresa;
- el comportamiento del menú en el celular.

## Decisiones de Daniel (2026-10-23)

1. **Para todos los comercios, sin bandera**, en las tres fases. No hay nada en `companies.featureFlags`. El rollback de cada fase es revertir su commit del front.
2. **Íconos Tabler solo en el menú.** Se cargan únicamente los que se usan (D6).
3. **Los módulos que el mapa de ALMARA no menciona** quedan donde dice la segunda tabla de `sidebar-structure`.
4. **Lo que el 1336 pide fuera del menú va en cambios aparte.** Los títulos de las pantallas no cambian, y D-409 se ajusta a «el título es el nombre completo; el menú usa el corto».

## Decisions

### D1. Los datos no cambian de forma: cambia cómo se dibujan

- `NavService` sigue entregando la misma lista ya filtrada por permisos y banderas (`items`, `getMenuItems()`, `getMenuOriginal()`, `ALLMENUITEMS`). La barra inferior, el buscador del encabezado, el editor de roles y las pruebas siguen leyendo lo mismo.
- La vista se arma en una función pura nueva, `construirVistaMenu(menuFiltrado)` (`shared/components/sidebar/menu-vista.ts`). Devuelve secciones con filas ya resueltas: nivel, ícono, insignia visible y si un grupo se dibuja como enlace directo.
  - La plantilla recorre esa vista.
  - `processMenuItems` (`:578`) pasa a llamarla y conserva `shouldHide`.
- **Descartado:** convertir los grupos de un hijo en enlaces de primer nivel dentro de `MENUITEMS`. Saca a Producción, Facturación, Cartera y Contabilidad de la rama que aplica `permisoPrevio`, el centro DIAN y la regla de Contabilidad (`nav.service.ts:348-358`), así que cambiaría quién ve qué.

### D2. Un solo ancho, en variables (F1 y F2)

- `styles.scss` define `--sidebar-width: 264px` (F1) y `--sidebar-collapsed-width: 72px` (F2).
- En el mismo bloque de `styles.scss` se sobrescriben las reglas del tema que fijan 260 px y 53/80 px: ancho de `.sidebar-wrapper` y `margin-left` de `.page-body`, en abierto y en `close_icon`. Todas pasan a leer las variables.
  - El tema de `assets/scss` no se edita.
  - La tarea 1.3 lista cada regla con DevTools antes de tocarla.
- `LayoutService.autoCollapseConfig` se alinea a 72/264, aunque hoy nadie lo lea.

### D3. Fila de tres zonas (F1)

La fila es la misma para el grupo, el enlace directo, el hijo, el favorito y, en la F2, el panel flotante. Es un `ng-template #filaMenu` que se usa con `ngTemplateOutlet` dentro de los `<a>`/`<button>` de hoy, que conservan sus `routerLink`, `(click)` y `aria-*`.

```text
[ícono 20 px + punto] [nombre: flex 1, min-width 0, dos líneas] [zona derecha fija: insignia 32 · estrella 20 · chevron 12]
```

- **Zona derecha de ancho fijo por nivel:**
  - nivel 2: 68 px (insignia, estrella y chevron);
  - nivel 3: 56 px (insignia y estrella; el nivel 3 no tiene hijos, así que no lleva chevron).

  El hueco se reserva aunque falte la insignia. Así el nombre empieza y mide lo mismo en todas las filas de un nivel.
- **Medidas:**
  - fila de una línea: `min-height: 36px`, `padding: 8px 6px`;
  - sangría del nivel 2: 16 px desde el borde de la sección; nivel 3: 12 px más;
  - el riel lila de 2 px se conserva dentro de esa sangría;
  - el nivel 3 no lleva ícono.
- **Nombre:** se conserva `ktq-nombre-menu` de 1334, de dos líneas y sin partir palabras. El nombre completo va en `title`.
- **Título de sección:** en una línea, con «…», como hoy.

**Presupuesto de ancho a 264 px** (estimado; la tarea 1.2 mide el de hoy y la 3.3 el nuevo):

| Pieza | Nivel 2 | Nivel 3 |
|---|---|---|
| Tarjeta del menú (264 − márgenes 12 + 6) | 246 | 246 |
| Relleno de la navegación (10 + 10) | 226 | 226 |
| Sangría | 210 | 198 |
| Relleno de la fila (6 + 6) | 198 | 186 |
| Ícono 20 + separación 8 | 170 | (sin ícono) 186 |
| Zona derecha + separación 6 | 68 + 6 | 56 + 6 |
| **Nombre** | **≈ 96 px** (unos 14 caracteres por línea) | **≈ 124 px** |

Hoy el nombre tiene unos 90 px en el nivel 2 y menos en el 3, según la propuesta. Con las reglas de F3 (nombres de unos 14 caracteres), casi todo cabe en una línea.

### D4. Insignias, punto y estrella (F1)

- **Insignia:** 16 px de alto, 9,5 px/800 en MAYÚSCULA, `min-width: 32px` y radio 20 px.
  - NUEVO va en el par primario: `#5F3FE0` sobre `#EFE9FF`.
  - PRONTO va en el par de alerta: `#D9820A` sobre `#FFF1DF`.
  - `etiquetaInsignia(item)` muestra «PRONTO» cuando `badgeValue` es «Próximamente». El dato de `nav.service.ts` y `FUTURE_MESSAGE_CHANNELS` no cambia, así que D-509 y sus pruebas siguen igual.
  - La fila informativa (`type: 'info'`) usa la misma insignia en lugar de `.submenu-future-label`.
  - Las reglas del 1334 que bajaban la insignia a otra línea (`:1665-1691`) se quitan.
- **Punto de novedad:** círculo de 7 px en acento con aro blanco de 2 px, en la esquina superior derecha del ícono del grupo (`position: absolute`).
  - `hasNewChild` cuenta solo hijos con NUEVO vigente y `type !== 'info'`. Hoy el «Próximamente» también encendía el punto de Mensajes.
  - El punto de la fila de texto (`menu-badge--dot`, `html:314`) se quita.
- **Estrella:** siempre visible.
  - En F1 usa `fa-star` en acento `#5F3FE0` cuando es favorita, y `fa-star-o` en `#C9C5DC` cuando no. Pasa a `#8F8BAB` con hover o `:focus-visible`. En F2 cambia a Tabler (`star-filled` / `star`).
  - Botón de 20×20 px, con `aria-label` «Agregar a favoritos» o «Quitar de favoritos» y `aria-pressed`.
  - En las filas de grupo sigue siendo un `span role="button"` dentro del `<button>`, como hoy, con `keydown.enter` y `keydown.space`.
  - El límite de 5 y su comportamiento de hoy (D-517) no cambian.

### D5. Favoritos arriba con su grupo (F1)

- La sección Favoritos ya está fuera de la zona que se desplaza (`html:146`). Se le pone `max-height: 40vh` con su propio scroll, para que 5 favoritos con sus pantallas no empujen el menú.
- Cada favorito muestra debajo, en 10,5 px muted `#8F8BAB` y en una línea, el nombre de su grupo («Bodegas» bajo «Ajustes»). Sale de `grupoDe(favorito)`, que lo busca en el menú filtrado:
  - favorito de pantalla: el grupo padre de su ruta;
  - favorito de grupo: el nombre de su sección.
- La «X» de quitar se reemplaza por la estrella rellena, igual que en el resto del menú.
- En F1 no cambia lo guardado (`sidebarFavoriteItems`).

### D6. Íconos Tabler: solo los SVG que se usan (F2)

- **Carga:** `@tabler/icons` (licencia MIT) como `devDependency`, con versión exacta. Es la última estable con al menos dos semanas, comprobada con `npm view` en la tarea 4.1.
  - El script `scripts/generar-iconos-tabler.js` lee la lista `src/app/shared/icons/tabler-usados.json` y escribe `src/app/shared/icons/tabler-iconos.ts`, un mapa `nombre → trazos SVG`, con cabecera de versión y licencia. El archivo generado se commitea.
  - El build no depende del paquete. Fallan con error un nombre que no exista y un SVG que tenga algo distinto de `<path>`.
- **Descartados:**
  - la fuente web de Tabler, que es más de 1 MB de fuente y CSS globales;
  - un CDN: `index.html` ya depende de cdnjs para Font Awesome y un CDN más es otro punto de falla;
  - copiar los SVG a mano, porque no deja rastro de la versión.
- **Peso:** unos 50 íconos de ~300 bytes, alrededor de 15 KB sin comprimir en el bundle inicial, donde vive el layout. La tarea 6.1 compara el tamaño de `main` antes y después.
- **Componente:** `IconoTablerComponent` (`shared/icons/icono-tabler.component.ts`), standalone y OnPush, importado en el NgModule del sidebar.
  - Entradas: `nombre`, `tamano` (20) y `trazo` (1.75).
  - Pinta `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">` con un `<path>` por trazo.
  - Un nombre desconocido pinta un cuadro vacío del mismo tamaño y lo detecta la prueba de 4.3.
  - Al ser SVG con `width`/`height`, no lo alcanzan las reglas globales de `font-size` sobre `i`.
- D-547 usa el mismo componente y registro para las acciones del pedido. No crea otro.

### D7. Cada sección y grupo declara su ícono (F2)

- `Menu` gana el campo opcional `menuIcon` (nombre Tabler). `icon` (Feather) se queda para el buscador del encabezado y para los roles guardados.
- `getSectionIcon` y la inferencia por título de `getMenuIcon` dejan de usarse en el menú y se borran si nadie más los lee.
- Mapa del ticket 1337. Los nombres son de Tabler y la tarea 4.3 verifica que existan en la versión fijada; si falta uno, se usa el más cercano y se anota.

| Sección (ícono) | Grupos o enlaces directos (ícono) |
|---|---|
| Gestión comercial (`briefcase`) | Clientes `users` · Ventas `shopping-bag` · Cotizaciones `file-dollar` · Sitio web `world-www` · CRM `target-arrow` · Dropshipping `package-export` · NPS `mood-smile` |
| Operaciones (`settings-automation`) | Pedidos `clipboard-list` · Producción `building-factory-2` · Agenda `calendar-event` · Logística `truck-delivery` · En vivo `live-view` |
| Inventario (`box`) | Productos `package` · Bodegas `building-warehouse` · Compras `shopping-cart` · Alistamiento `checklist` · Precios `tag` |
| Finanzas (`cash`) | Facturación `file-invoice` · Tesorería `building-bank` · Cartera `wallet` · Contabilidad `calculator` |
| Marketing (`speakerphone`) | Campañas `ad-2` · Pauta `rocket` |
| Comunicaciones (`messages`) | WhatsApp `brand-whatsapp` · Instagram `brand-instagram` · Facebook `brand-facebook` · TikTok `brand-tiktok` · Correo `mail` · Llamadas `phone` |
| Analítica (`chart-pie`) | Indicadores `chart-bar` · Agentes IA `robot` |
| Configuración (`settings`) | Seguridad `shield-lock` · Módulos variables `forms` · Inventario `packages` · Productos `tags` · Logística `route` · Pagos `credit-card` · Integraciones `plug-connected` · Notificaciones `bell` |
| Configuración Plataforma (`adjustments`) | Gestión General `adjustments-alt` |

- Los íconos fuera del mapa de ALMARA (Dropshipping, NPS, Agenda, Alistamiento, Pauta y Plataforma) son propuesta de este diseño. Se pueden cambiar sin afectar nada más.
- Los íconos del propio menú pasan a Tabler: estrella, chevron, buscar, limpiar y alternar compacto (`layout-sidebar-left-collapse` / `-expand`).
- **Orden con F3:** en la F2 los íconos se declaran sobre la estructura de hoy. Mensajes recibe `messages` y Finanzas `cash`, y las secciones de hoy toman el ícono de su equivalente («Inventarios y Productos» → `box`, «Inteligencia de Negocios» → `chart-pie`). Los enlaces que la F3 saca de su grupo (WhatsApp…, Facturación…) ya llevan su `menuIcon` desde la F2, aunque ahí todavía sean hijos sin ícono visible.

### D8. Un solo modo compacto (F2)

- **Estado único:** `modo: 'abierto' | 'compacto'`, solo en escritorio (992 px o más). En el celular el menú se abre por encima, como hoy.
  - `collapseMenu`, `NavService.collapseSidebar` y `LayoutService.isCollapsed` se derivan de `modo`.
  - `isCompactMode`, `toggleCompactMode` y la clase `.compact` se quitan.
- **Preferencia por usuario:** `localStorage['katuqMenuModo']` guarda `{ [hashCorreo]: 'compacto' | 'abierto' }`. `hashCorreo` es un FNV-1a del correo en minúsculas: no deja el correo en claro después de cerrar sesión.
  - `SignOut` no borra esa clave, así que la elección sobrevive al cerrar sesión.
  - Si el usuario no tiene entrada, se lee lo de antes una sola vez: `sidebarCollapsed === 'true'`, `sidebarCompactMode === 'true'` o `katuq_sidebar_state.isCollapsed/isCompactMode` dan compacto. Las claves viejas no se borran, así que el rollback las encuentra.
- **Se retira la expansión por hover:**
  - `onMouseEnter`/`onMouseLeave` (`:36-87`);
  - `.sidebar-hover-zone`;
  - `isTemporarilyExpanded` y sus clases en `.page-header` y `.page-wrapper`;
  - las reglas `temporarily-expanded` de `styles.scss:682-690` y `:719-723`.

  La tarea 5.4 comprueba con `grep` que nadie más las use.
- **Riel compacto (72 px):**
  - arriba, el logo y el botón alternar;
  - debajo, los íconos de grupos y enlaces directos (botón de 40×40, radio 11), con una línea `#ECECF4` entre secciones;
  - los favoritos, el buscador y la tarjeta Mi Plan se ven como hoy en colapsado;
  - el punto de la esquina se enciende si el grupo tiene un hijo NUEVO vigente o un favorito.
- **Panel flotante por grupo:**
  - Es un componente de plantilla (`*ngIf="panel"`) dentro del `<li>` del grupo, con `position: fixed`.
    - `left: calc(var(--sidebar-collapsed-width) + 8px)`.
    - `top` es el del botón, con tope en `innerHeight − alto − 8`. Ancho de 240 px y `max-height: calc(100vh − 16px)` con scroll.
    - Sustituye a `showCollapsedSubmenu`, que se borra.
  - Contenido: el nombre del grupo (13 px/800) y sus hijos con la fila de D3, con insignia y estrella. La estrella funciona igual que en el menú abierto.
  - Se abre con `pointerenter`, foco o clic. Se cierra con `pointerleave` del `<li>`, que contiene al panel. Un `::before` transparente de 8 px a la izquierda del panel tapa el hueco con el ícono, sin temporizadores.
  - También lo cierran Esc (el foco vuelve al botón), el foco fuera del `<li>` y navegar.
  - Teclado: Enter, espacio o flecha derecha abren el panel y enfocan su primer enlace.
  - Un enlace directo muestra su nombre en el tooltip de hoy (`.tooltip`), con hover y con foco.
- **Ancho del contenido:** con el compacto, la pantalla gana 8 px (80 → 72). Con el abierto pierde 4 px (260 → 264).

### D9. La estructura nueva sobre los mismos datos (F3)

- **Identificadores estables.** Cada sección y grupo lleva `id` (por ejemplo `mensajes`, `productos`, `config-productos`, `bodegas`). Antes de renombrar nada (tarea 7.2) se cambian a `id` las dependencias:
  - el grupo de los canales PRONTO;
  - `PERMISOS_FUERA_DEL_MENU`;
  - `sidebarSectionsState`;
  - los favoritos de grupo (D10);
  - las pruebas de `tests/navigation`.
- **Nuevos campos de `Menu`** (identificadores en inglés):
  - `display?: 'inline'`: el grupo no se dibuja; sus hijos aparecen como enlaces directos de la sección (Finanzas y Comunicaciones), con el `menuIcon` de cada hijo;
  - `previousTitle?: string`: el nombre de hoy, para buscar (D11);
  - `inheritsPermissionFrom?: string`: la entrada se ve solo si esa ruta está autorizada. Nunca es un permiso propio y no se ofrece en el editor de roles. Lo usa Landings.
- **Reglas de dibujo** (`construirVistaMenu`, después de filtrar y de `shouldHide`):
  1. un grupo con un solo hijo visible se dibuja como enlace directo, con el nombre y el `menuIcon` del grupo y la ruta del hijo;
  2. un grupo sin hijos visibles no se dibuja;
  3. una sección sin filas no se dibuja.

  Así:
  - Producción, Precios y Notificaciones salen como enlaces;
  - En vivo es enlace para todos menos los administradores de Julsmind;
  - Campañas es enlace para quien solo ve el panel;
  - Seguridad, que hoy queda vacío por `shouldHide`, deja de verse.
- **`MENUITEMS` nuevo:** el orden y los nombres de las dos tablas de `sidebar-structure`.
  - Conserva cada `path`, `permisoPrevio`, `isOnly*`, `badge*` y las reglas de `filterMenuItemsByAuthorization`.
  - Finanzas sale de entre Gestión comercial y Operaciones y pasa después de Inventario. Configuración Plataforma sigue primero.
  - Marketing deja de tener dos enlaces sueltos («Dashboard de Marketing» y «Campañas»): pasan a ser hijos del grupo Campañas, con las mismas rutas. Pauta sigue como enlace de primer nivel, con su regla de Julsmind (`:383`).
  - Mensajes pasa a ser el grupo `mensajes`, `display: 'inline'`, bajo la sección Comunicaciones. Los canales PRONTO se agregan por `id`, con las mismas reglas de D-509.
- **Landings:**
  - `{ path: 'sitios/landings', title: 'Landings', inheritsPermissionFrom: 'sitios' }`;
  - ruta nueva `sitios/landings`, con `data: { tipo: 'landing' }`, en `sitios-routing.module.ts`;
  - `SitiosListaComponent.soloTipo` acepta `'landing'`.

  La tarea 8.3 comprueba en el servidor (solo lectura) qué `tipo` tienen los sitios viejos. Si hay sitios sin `tipo`, se cuentan como landing solo si el servidor ya los trata así.
- **Prospectos:** el mismo hijo `ventas/clientes-corporativos`, con `title: 'Prospectos'` y `previousTitle: 'Clientes corporativos'`, movido al grupo CRM. La pantalla y su título no cambian.
- **Catálogo por link:** pasa al grupo Sitio web y conserva `permisoPrevio: 'cotizaciones'` (D-416).

### D10. Favoritos conservados (F3)

- **Formato nuevo:** `localStorage['sidebarFavoritesV2']` guarda `[{ kind: 'screen', path } | { kind: 'group', id }]`, con un máximo de 5.
  - El título, el ícono y el grupo salen siempre del menú filtrado. Un cambio de nombre ya no rompe la estrella.
  - `isFavorite` compara la ruta normalizada (pantallas) o el `id` (grupos).
- **Conversión, una vez por navegador** (si no existe `sidebarFavoritesV2`):
  - **pantalla:** se conserva su `path`;
  - **grupo:** su título viejo se traduce a `id` con una tabla fija. Por ejemplo, Inventarios → `bodegas`, «Inventarios y productos» → `config-inventario`, Producto → `config-productos`, «Lista de precios» → `precios`, Finanzas → `finanzas`, Mensajes → `mensajes` y «Picking y packing» → `alistamiento`. Logística → `logistica`, el de Operaciones, que es el que abre hoy por ser el primero (`cadenaDeSeccion`).
  - Se descarta lo que el rol ya no ve, como hoy (`loadFavoriteItems`, `:2257`), sin pasar de 5.
  - `sidebarFavoriteItems` no se toca: si se revierte la F3, la versión vieja los encuentra. Los favoritos hechos después de la F3 se pierden en ese caso (Risks).
- **Cómo se dibujan:**
  - un grupo que hoy se dibuja como enlace directo sale como ese enlace;
  - un grupo `inline` (Finanzas, Mensajes) sale con el nombre de su sección y sus pantallas debajo (D-517);
  - la cabecera de una sección hecha de un grupo `inline` lleva la estrella de ese grupo, así se puede volver a marcar.

### D11. Buscar por el nombre anterior (F3)

- `searchMenu` (`:2089`) compara sin mayúsculas ni tildes (NFD) contra `title`, `path` y, mientras no pase `PREVIOUS_TITLES_UNTIL`, `previousTitle`.
  - `PREVIOUS_TITLES_UNTIL` es una constante de `nav.service.ts` igual a la fecha de publicación de F3 más 90 días. La fija la tarea 9.3.
  - Ver los nombres anteriores después de esa fecha no requiere borrar código: se apagan solos.
- Cada resultado muestra `Grupo · Nombre`. Un grupo dibujado como enlace muestra solo su nombre.

### D12. Editor de roles legible (F3)

- `getChildrenMenus` (`roles.component.ts:121`) pone en cada hijo una `etiqueta` «Grupo · Nombre» y el `previousTitle`. El `p-pickList` filtra con `filterBy="etiqueta,previousTitle"` y las dos plantillas pintan `etiqueta`.
- **Emparejar por ruta, no por ruta y título** (`:187`, `:328`): un rol guardado con el título viejo se reconoce y no aparece dos veces. Lo que se muestra sale del menú actual; lo guardado conserva su `path`.
- Al guardar se quitan `etiqueta` y `previousTitle` de `menus`, para no escribir campos de presentación en el rol. `movable` e `index` siguen como hoy.
- `PERMISOS_FUERA_DEL_MENU` se indexa por `id` (`productos`): «Creación rápida» sale una vez, bajo Inventario › Productos.
- Las entradas con `inheritsPermissionFrom` (Landings) no se ofrecen.
- Solo cambia la presentación: los permisos guardados y su lectura (`filterMenuItemsByAuthorization`) son los mismos.

### D13. Otros lectores del título (F3)

- **`nombreDePantalla`** (opinar): devuelve `Grupo · Nombre` para los hijos, para que un «Listado» no quede ambiguo.
- **Buscador del encabezado:** no se toca (no-goal). Mostrará los nombres cortos (Open Questions).
- **`adaptive-navigation`** busca grupos por título (`:310`), pero ninguna plantilla lo usa. No se toca y queda anotado.
- **Textos que citan nombres viejos** (instructivos MCP de D-508, Opttia, novedades, ayudas): la tarea 7.1 los busca con `grep` en este repositorio, en el backend y en el ADK, y los lista. Los que lleguen al comercio se ajustan en la misma F3 o se anotan.
- **Novedades:** una novedad de texto anuncia el menú nuevo una vez, en `NovedadesService`, con el `id` estable `2026-11-menu-ordenado`.

### D14. Regla de diseño y trampas de CSS global

- **Colores:** tokens del design-system. Acento `#5F3FE0`, tinta `#211F3A`, muted `#8F8BAB`, pares primario y alerta, radios 11, 16 y 20. Nada de gradientes ni primarios prohibidos.
- **Clases nuevas** con prefijos `fila-`, `riel-`, `panel-` y `fav-`. Ninguna contiene «p-».
- **Todo `span` con `*ngIf`** (insignia, grupo del favorito, punto) lleva color y tamaño propios con `!important`.
- **Foco:** `:focus-visible { outline: 3px solid #7C5CFF !important }` en filas, estrellas, botones del riel y del panel.
- **`letter-spacing: normal`** en `a` y en los textos.
- **Las reglas globales** de `styles.scss:739-760`, que solo aplican al menú, se borran en la F1. El tamaño de cada pieza queda definido en `sidebar.component.scss`, en un solo lugar.

## Contratos

| Pieza | Antes | Después |
|---|---|---|
| `Menu` (`nav.service.ts`) | `title`, `path`, `icon`, `badge*`, `permisoPrevio`… | Se agregan opcionales: `menuIcon` (F2), `id`, `display`, `previousTitle` e `inheritsPermissionFrom` (F3). Nada se quita |
| `items` / `getMenuItems()` | Menú filtrado | Igual. F3 cambia el orden y los títulos, no la forma |
| `localStorage` | `sidebarCollapsed`, `sidebarCompactMode`, `katuq_sidebar_state`, `sidebarFavoriteItems`, `sidebarSectionsState` (por título) | Se agregan `katuqMenuModo` (F2), `sidebarFavoritesV2` y `sidebarSectionsState` por `id` (F3). Las claves viejas se leen y no se borran |
| Rutas | — | Se agrega `sitios/landings`. Ninguna cambia ni se quita |
| Backend, Firestore y banderas | — | Nada |

## Gates constitucionales

| Artículo | Cumplimiento |
|---|---|
| I–II | Propuesta y specs aprobadas. Este diseño y las tareas esperan aprobación |
| III | Sin choques con la constitución |
| IV, V, X | No aplica: sin integraciones ni webhooks |
| VI | No aplica: sin lógica por proveedor |
| VII | Sin telemetría nueva y sin `console.log` |
| VIII | No hay endpoints. Las pruebas de contrato son del menú: permisos antes y después (7.3), unicidad de íconos (4.3) y reglas de nombres (8.8) |
| IX | **Excepción acotada**, como D-054 y D-541. Angular 14.3 no tiene signals ni `@if`, así que el sidebar sigue en su NgModule con `*ngIf`. Lo nuevo y aislado (`IconoTablerComponent`) es standalone y OnPush. No cambia la constitución |
| XI | El correo nunca se guarda en claro (`hashCorreo`) y no se loguea nada |
| XII | Sin banderas |
| XIII–XV | Dos specs de menos de 3 páginas. La decisión queda en CONTRACT. Sin integraciones |

## Verificación

- **Pruebas `node --test`** (`tests/navigation/`):
  - `menu-vista.test.js`: enlace directo, grupos vacíos, `inline`, punto solo con NUEVO y PRONTO como texto de insignia;
  - `menu-iconos.test.js`: cada sección y grupo tiene `menuIcon`, ninguno se repite y todos existen en `tabler-iconos.ts`;
  - `menu-permisos-f3.test.js`: para cada ruta sola, Administrador, comodín, Super Administrador, administrador de Julsmind y banderas encendidas y apagadas, las rutas visibles antes y después de F3 son las mismas. Solo se suma `sitios/landings` donde se ve `sitios`. La foto «antes» se genera en 7.3 con el `MENUITEMS` de hoy;
  - `menu-favoritos.test.js`: conversión de favoritos (escenarios de la spec, nombres repetidos y límite de 5);
  - `menu-busqueda.test.js`: el nombre anterior y su vencimiento.
- **Navegador**, en cada fase: 1440×900, 1366×768 y 390×844, más 1147×607 (D-430).
  - Sin scroll horizontal, sin texto invisible y sin piezas encimadas.
  - A 1366 px, con el menú abierto y con el compacto: Todos los pedidos, venta asistida y POS (D-540).
- **Capturas** del antes (1.2) y del después de cada fase.
- **Roles reales:** en FLORECER, con el rol VENTAS y con un Administrador, las mismas entradas visibles antes y después de F1, F2 y F3. En F3 se cuentan con los nombres nuevos.
- **Build de producción** sin errores, y conteo de gradientes y primarios prohibidos en `shared/components/sidebar` (hoy 0 y 0).

## Risks / Trade-offs

- **[Permisos por un cambio de forma]** Mitigación: los datos conservan su forma (D1) y la prueba de 7.3 compara las rutas visibles antes y después.
- **[Favoritos]**
  - Si se revierte la F3, se pierden los favoritos marcados después de publicarla, porque la versión vieja lee `sidebarFavoriteItems`.
  - Un favorito de una pantalla que se ve por dos grupos toma el primero.
- **[Sitio web como enlace a Catálogo por link]** Un rol con Cotizaciones y sin Mis sitios ve Sitio web con un solo hijo, así que le sale como enlace directo que abre Catálogos por link. Es la regla aprobada. La prueba de 7.3 lo cubre y queda en Open Questions.
- **[Seguridad desaparece]** Hoy se dibuja como grupo vacío. Con la regla de grupos vacíos deja de verse. Roles y Usuarios siguen en Configuración de empresa.
- **[Hover-expand]** Quien hoy usa el menú colapsado y lo abre pasando el puntero pierde la expansión completa: ahora ve el panel del grupo. Es lo pedido en el 1337.
- **[Bundle]** Unos 15 KB más en `main`. Se mide en 6.1.
- **[Nombres que no caben]** Con ~96 px en el nivel 2, los nombres de más de unos 14 caracteres usan dos líneas. Las reglas de F3 los mantienen cortos.
- **[Trampa `shouldHide`]** Un nombre nuevo que contenga «rol», «usuario» o «empresa» se esconde solo. La prueba de reglas (8.8) lo cubre y ningún nombre de las tablas lo contiene.
- **[Sesiones paralelas]** El 1334, D-509 y D-517 tocan los mismos archivos. Cada fase arranca con `git pull` y con el sidebar limpio en `git status`. Nunca `git add -A`.

## Migration Plan

1. **F1:** tareas 1 a 3. Build, verificación y publicación del front con el candado (`git pull`, compilar desde la punta y desplegar enseguida), con autorización.
2. **F2:** tareas 4 a 6, después de publicar F1.
3. **F3:** tareas 7 a 9, después de publicar F2, porque F3 depende de los `menuIcon` y del modo único.
4. **Rollback** de cada fase: revertir su commit del front y volver a publicar. No hay datos ni banderas que deshacer. Las claves nuevas de localStorage quedan sin uso y las viejas no se tocaron.

## Open Questions

1. **Sitio web con un solo hijo** (Risks). Recomendado: aceptarlo, porque es la regla aprobada. La alternativa es una excepción que deje Catálogo por link siempre como hijo.
2. **Buscador del encabezado:** después de F3 mostrará «Listado» sin grupo. Recomendado: un cambio aparte de una línea para mostrar `Grupo · Nombre`, porque el buscador global es no-goal aquí.
3. **Íconos fuera del mapa de ALMARA** (D7: Dropshipping, NPS, Agenda, Alistamiento, Pauta y Plataforma). Recomendado: los propuestos. Se pueden cambiar sin otra aprobación de diseño.
