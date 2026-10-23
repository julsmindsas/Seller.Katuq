> **Estado:** TAREAS, pendientes de aprobación de Daniel. Decisión **D-546**. Tres fases, cada una se aprueba, se publica y se verifica por separado: F1 (1335), F2 (1337) y F3 (1336).
>
> **Reglas de todas las tareas:**
> - leer los archivos antes de editarlos;
> - el build en verde al cerrar cada tarea de código;
> - nunca `git add -A`, porque otras sesiones trabajan en el mismo working copy;
> - el front local apunta a producción, así que se prueba con la empresa demo FLORECER y sin guardar nada;
> - **toda tarea de código cierra revisando el menú en el navegador a 1440×900 y a 390×844**, sin scroll horizontal ni texto invisible. Las capturas van al scratchpad, nunca al repo.
>
> `[P]` = se puede hacer en paralelo con la otra `[P]` de su bloque (archivos distintos).

## 0. Decisiones y checkpoints

- [x] 0.1 Propuesta y specs aprobadas por Daniel (2026-10-23), con las respuestas recomendadas: para todos y sin bandera; Tabler solo en el menú; los módulos fuera del mapa quedan donde dice la spec; lo que el 1336 pide fuera del menú va aparte.
- [ ] 0.2 Aprobación de `design.md` y de este `tasks.md`. Sin ella no se toca código.
- [x] 0.3 **D-546** registrada en `specs/CONTRACT.md` (commit `8f3904c2`).

---

## F1 — Ancho y filas (ticket 1335)

### 1. Verificación previa (solo lectura)

- [ ] 1.1 `git pull`, y confirmar que la punta incluye `4a84f91f` (1334) y si ya está publicado (`assets/version.json` de producción). `git status` de `src/app/shared/components/sidebar/`, `nav.service.ts` y `src/styles.scss`. **Hecho cuando:**
  - la punta contiene `4a84f91f`;
  - esos archivos están limpios, o lo que tienen está identificado y su sesión está avisada.
  - Si el 1334 no está publicado, F1 sale junto con él y así se anota.
- [ ] 1.2 Medir el menú de hoy con DevTools y FLORECER, con un Administrador y con el rol VENTAS:
  - a 1440×900, 1366×768 y 390×844;
  - ancho disponible del nombre en el nivel 2 y en el 3, con y sin insignia;
  - alto de cada tipo de fila;
  - el contenido de `sidebarFavoriteItems`.

  **Hecho cuando:** la tabla de medidas y las capturas del antes (menú abierto, colapsado, favoritos y drawer a 390) están en el scratchpad. La tabla confirma o corrige los ~90 px de la propuesta.
- [ ] 1.3 Inventario de las reglas que fijan el ancho (260, 80 y 53 px): `styles.scss`, `sidebar.component.scss`, `assets/scss/layout/_sidebar.scss` y `layout.service.ts`. Cada una se confirma en «Computed» de DevTools a 1440 px. **Hecho cuando:** la lista de selector, archivo, línea y valor está en el scratchpad. A 390 px se anota cuáles no aplican.

### 2. Ancho y filas

- [ ] 2.1 Anchos (design D2):
  - `--sidebar-width: 264px` en `styles.scss`;
  - un bloque que sobrescribe las reglas del tema de 1.3 con las variables;
  - `LayoutService.autoCollapseConfig` en 72/264.

  *Depende de:* 1.3. **Hecho cuando:**
  - a 1440 px el menú mide 264 ±1 px y el contenido y el encabezado empiezan en 264 px sin encimarse;
  - a 1366 px Todos los pedidos no tiene scroll horizontal;
  - a 390 px el drawer se ve igual que en las capturas de 1.2;
  - el build pasa.
- [ ] 2.2 Plantilla de la fila (D3): `ng-template #filaMenu` con ícono, punto, nombre y zona derecha. La usan el enlace directo, el grupo, el hijo, la fila informativa y el favorito. `rutaMenu`, `onMenuItemClick`, `toggletNavActive`, `toggleFavorite`, `routerLinkActive` y los `aria-*` se quedan en los mismos `<a>`/`<button>`. *Depende de:* 1.2. **Hecho cuando:**
  - el diff muestra los bindings de navegación sin cambios;
  - compila;
  - a 1440 y 390 px todas las filas muestran ícono (salvo el nivel 3), nombre y zona derecha.
- [ ] 2.3 SCSS de filas (D3 y D14):
  - zona derecha de 68 px (nivel 2) y 56 px (nivel 3);
  - `min-height: 36px` y `padding: 8px 6px`;
  - sangrías de 16 y 12 px;
  - el nivel 3 sin ícono;
  - se quitan las reglas de segunda línea del 1334 (`sidebar.component.scss:1665-1691`), conservando `ktq-nombre-menu`;
  - se borran las reglas globales del menú de `styles.scss:739-760` y sus tamaños pasan a `sidebar.component.scss`.

  *Depende de:* 2.1 y 2.2. **Hecho cuando:**
  - a 1440 px las filas de una línea miden de 36 a 40 px;
  - en un mismo nivel el nombre empieza en la misma x (±1 px), tenga o no insignia;
  - el nombre tiene ≥ 96 px en el nivel 2 y ≥ 120 px en el nivel 3 (la medida va a la tabla de 1.2);
  - ninguna palabra se parte;
  - a 390 px los nombres se leen completos, sin scroll horizontal.
- [ ] 2.4 `[P]` Insignias y punto (D4):
  - `etiquetaInsignia` («Próximamente» → «PRONTO»);
  - la fila informativa con la misma insignia;
  - `hasNewChild` solo con NUEVO vigente;
  - el punto en la esquina del ícono, quitando `menu-badge--dot` de la fila.

  Pruebas en `tests/navigation/menu-vista.test.js`. *Depende de:* 2.2. **Hecho cuando:**
  - la prueba pasa;
  - a 1440 px «TikTok» muestra PRONTO con el mismo ancho que NUEVO (±2 px), Mensajes no tiene punto y «Mi página web» lo tiene en el ícono;
  - a 390 px se ve igual;
  - `future-message-channels.test.js` sigue en verde.
- [ ] 2.5 `[P]` Estrella siempre visible (D4):
  - `fa-star` / `fa-star-o`, en acento cuando es favorita;
  - `aria-label`, `aria-pressed`, `:focus-visible` y Enter/espacio en las filas de grupo.

  *Depende de:* 2.2. **Hecho cuando:**
  - a 1440 px todas las entradas marcables muestran la estrella tenue y las favoritas, la rellena;
  - con Tab se llega a la estrella con el foco visible y Enter la alterna;
  - el sexto favorito se comporta como hoy (D-517);
  - a 390 px la estrella se ve y se toca.
- [ ] 2.6 Favoritos con su grupo (D5): `grupoDe()` como función pura, con prueba; el renglón del grupo; `max-height: 40vh`; la estrella en lugar de la «X». *Depende de:* 2.2. **Hecho cuando:**
  - la prueba pasa;
  - a 1440 px dos favoritos «Proveedores» (Dropshipping y Compras) y los dos grupos «Logística» se distinguen por su renglón;
  - 5 favoritos con sus pantallas no empujan el menú fuera de la vista;
  - `sidebarFavoriteItems` queda igual byte a byte;
  - a 390 px se ve completo.

### 3. Verificación y cierre de F1

- [ ] 3.1 `npm run build:prod` sin errores. Si no se publica enseguida, revertir el aumento de versión de `environment*.ts` y `assets/version.json`. **Hecho cuando:** el build está en verde y el diff solo tiene archivos de este cambio.
- [ ] 3.2 Contar en `shared/components/sidebar` los gradientes, los primarios prohibidos (lista de AGENTS.md) y las clases nuevas con «p-». **Hecho cuando:** da 0, 0 y 0. La base es 0 y 0.
- [ ] 3.3 Navegador:
  - 1440×900, 1366×768 (Todos los pedidos, venta asistida y POS), 1147×607 y 390×844;
  - menú abierto, colapsado y con favoritos;
  - medidas nuevas junto a las de 1.2.

  **Hecho cuando:** sin scroll horizontal, sin texto invisible, sin piezas encimadas, y las capturas del después están guardadas.
- [ ] 3.4 Mismo rol, mismas entradas: en FLORECER, con VENTAS y con Administrador, se cuentan las entradas visibles antes (1.2) y después. **Hecho cuando:**
  - las listas son idénticas;
  - `sidebarFavoriteItems` no cambió;
  - el chequeo se hizo a 1440 y a 390 px.
- [ ] 3.5 Mostrar el diff y esperar aprobación. Luego commit con sello, solo con los archivos de F1. **Hecho cuando:** el commit existe y `git status` no muestra archivos ajenos incluidos.
- [ ] 3.6 Publicar el front con el candado (`git pull`, compilar desde la punta y desplegar enseguida), con autorización explícita de Daniel. **Hecho cuando:**
  - en producción, a 1440 y 390 px, se ve como en 3.3;
  - el ticket 1335 queda Resuelto con el antes y el después, en lenguaje de negocio (flujo de tickets);
  - la bitácora de D-546 en `specs/CONTRACT.md` está escrita. La bitácora la escribe la sesión principal.

---

## F2 — Íconos y modo compacto (ticket 1337)

### 4. Íconos Tabler

- [ ] 4.1 `@tabler/icons` como `devDependency`, con versión exacta: la última estable con al menos dos semanas (`npm view @tabler/icons time`). Además, `scripts/generar-iconos-tabler.js`, `src/app/shared/icons/tabler-usados.json` y el `tabler-iconos.ts` generado, con cabecera de versión y licencia MIT (D6). *Depende de:* F1 publicada. **Hecho cuando:**
  - correr el script dos veces no deja diff;
  - un nombre inexistente o un SVG con algo distinto de `<path>` lo hace fallar (probado);
  - el build pasa;
  - a 1440 y 390 px el menú se ve igual que en 3.3.
- [ ] 4.2 `IconoTablerComponent`, standalone y OnPush, sin `innerHTML`, importado en el módulo del sidebar. Un nombre desconocido pinta un cuadro vacío. *Depende de:* 4.1. **Hecho cuando:**
  - compila;
  - una prueba `node --test` comprueba que un nombre desconocido no tiene trazos y que la plantilla no usa `innerHTML`;
  - a 1440 y 390 px nada cambia todavía.
- [ ] 4.3 `menuIcon` en cada sección y grupo de `nav.service.ts`, según la tabla de D7, y en los hijos que la F3 vuelve enlaces. Además, `tests/navigation/menu-iconos.test.js`. *Depende de:* 4.1. **Hecho cuando:**
  - la prueba pasa: todos tienen ícono, ninguno se repite y todos existen en `tabler-iconos.ts`;
  - los equivalentes usados quedan anotados en el design;
  - `icon` (Feather) no cambió;
  - a 1440 y 390 px nada cambia todavía.
- [ ] 4.4 La plantilla pinta `app-icono-tabler`:
  - en secciones, grupos y enlaces directos;
  - en la estrella, el chevron, buscar, limpiar y alternar.

  Dejan de usarse `getSectionIcon` y la inferencia de `getMenuIcon` en el menú; se borran si `grep` no encuentra otro uso. *Depende de:* 4.2 y 4.3. **Hecho cuando:**
  - a 1440 px cada sección y grupo muestra su ícono de contorno y ninguno cae en el cuadro vacío;
  - Productos y Bodegas se distinguen;
  - a 390 px el drawer muestra los mismos íconos;
  - el buscador del encabezado sigue mostrando sus íconos Feather.

### 5. Modo compacto

- [ ] 5.1 Estado único `modo` (D8):
  - preferencia en `katuqMenuModo` con `hashCorreo`;
  - lectura única de `sidebarCollapsed`, `sidebarCompactMode` y `katuq_sidebar_state`;
  - `collapseMenu`, `NavService.collapseSidebar` y `LayoutService` derivados;
  - se quitan `isCompactMode`, `toggleCompactMode` y `.compact`.

  Prueba `node --test` de la preferencia. *Depende de:* 4.4. **Hecho cuando:**
  - la prueba pasa: dos correos guardan modos distintos, se migra el estado viejo y el correo no queda en claro;
  - a 1440 px la elección sobrevive a recargar y a cerrar sesión y volver a entrar;
  - a 390 px no hay modo compacto.
- [ ] 5.2 Riel de 72 px: `--sidebar-collapsed-width: 72px`, el botón alternar visible en el riel, botones de 40×40, líneas entre secciones y el punto por NUEVO o favorito. *Depende de:* 5.1. **Hecho cuando:**
  - a 1440 px el riel mide 72 ±1 px y el contenido empieza en 72 px sin encimarse con el encabezado;
  - un grupo con favorito o NUEVO muestra el punto;
  - a 390 px el drawer no cambia.
- [ ] 5.3 Panel flotante por grupo en plantilla (D8):
  - posición con tope en la ventana;
  - `pointerenter`/`pointerleave` con el puente de 8 px;
  - Esc, foco fuera, Enter, espacio y flecha derecha;
  - tooltip de los enlaces directos.

  Se borra `showCollapsedSubmenu` y se actualiza `tests/navigation/sidebar-menu.test.js`. *Depende de:* 5.2. **Hecho cuando:**
  - las pruebas pasan;
  - a 1440 px, al pasar por Bodegas se abre su panel con los 9 ítems, sus insignias y sus estrellas;
  - ir del ícono al panel no lo cierra, y Esc lo cierra y devuelve el foco;
  - a 1366×607 el panel no se sale de la ventana;
  - a 390 px no existe.
- [ ] 5.4 Retirar la expansión por hover:
  - `onMouseEnter`/`onMouseLeave`, `.sidebar-hover-zone` e `isTemporarilyExpanded`;
  - las reglas `temporarily-expanded` de `styles.scss`.

  Antes se revisa con `grep` que nadie más las use. *Depende de:* 5.3. **Hecho cuando:**
  - `grep` no encuentra usos;
  - a 1440 px pasar el puntero por el riel no lo expande y el encabezado queda alineado en abierto y en compacto;
  - a 390 px el drawer abre y cierra como en 3.3.

### 6. Verificación y cierre de F2

- [ ] 6.1 `npm run build:prod` sin errores, y tamaño de `main` antes y después. **Hecho cuando:** el build está en verde y `main` crece como máximo 25 KB sin comprimir (lo esperado es ~15 KB).
- [ ] 6.2 Conteos de 3.2 en `shared/components/sidebar` y `shared/icons`. **Hecho cuando:** 0, 0 y 0.
- [ ] 6.3 Navegador:
  - 1440×900, 1366×768 (Todos los pedidos, venta asistida y POS) y 1147×607, en abierto y en compacto;
  - 390×844;
  - recorrido completo con teclado en los dos modos.

  **Hecho cuando:** sin scroll horizontal, texto invisible ni piezas encimadas, el foco siempre visible y las capturas guardadas.
- [ ] 6.4 Repetir 3.4 en abierto y en compacto. **Hecho cuando:** las mismas entradas y los mismos favoritos que antes de F2, a 1440 y 390 px.
- [ ] 6.5 Diff, aprobación y commit con sello, solo con los archivos de F2 (incluidos `package.json`, `package-lock.json` y el script). **Hecho cuando:** el commit existe y no incluye archivos ajenos.
- [ ] 6.6 Publicar con el candado y con autorización. **Hecho cuando:**
  - producción se ve como en 6.3 a 1440 y 390 px;
  - el ticket 1337 queda Resuelto con evidencia;
  - la bitácora de D-546 está actualizada (sesión principal).

---

## F3 — Nombres y orden (ticket 1336)

### 7. Preparación, sin cambios visibles

- [ ] 7.1 Buscar con `grep` los nombres viejos del menú en este repo (sin contar `nav.service.ts`), en `katuq_admin_back_firebase` (instructivos MCP de D-508, prompts) y en el ADK. Leer también las novedades y las ayudas. *Depende de:* F2 publicada. **Hecho cuando:** la lista de archivo, línea, texto y destino está en el scratchpad, y cada texto que llega al comercio tiene su decisión: se ajusta en 8.7 o queda anotado.
- [ ] 7.2 Identificadores estables (D9):
  - `id` en cada sección y grupo;
  - los canales PRONTO se agregan por `id === 'mensajes'`;
  - `PERMISOS_FUERA_DEL_MENU` indexado por `id`;
  - `sidebarSectionsState` por `id`, leyendo el formato viejo;
  - `tests/navigation` busca por `id`.

  *Depende de:* 7.1. **Hecho cuando:**
  - todas las pruebas de `tests/navigation` pasan;
  - a 1440 y 390 px el menú es idéntico a las capturas de 6.3.
- [ ] 7.3 Foto de permisos y prueba de contrato:
  - un script genera `tests/navigation/fixtures/menu-rutas-antes-f3.json` con las rutas visibles del `MENUITEMS` de hoy para cada ruta sola, Administrador, comodín, Super Administrador, administrador de Julsmind y las banderas (`pickingAlistamiento`, `serviceAgenda`, `npsModulo` y dropshipping) encendidas y apagadas;
  - `menu-permisos-f3.test.js` compara contra esa foto.

  *Depende de:* 7.2. **Hecho cuando:** la foto está commiteada, la prueba pasa con el menú de hoy y a 1440 y 390 px nada cambió.

### 8. Estructura, nombres y lectores

- [ ] 8.1 `MENUITEMS` nuevo (D9):
  - orden y nombres de las dos tablas de `sidebar-structure`;
  - `previousTitle`;
  - Marketing › Campañas con Panel e Historial;
  - Comunicaciones con `mensajes` `inline`, y Finanzas `inline`;
  - Prospectos en CRM y Catálogo por link en Sitio web;
  - Landings con `inheritsPermissionFrom`, y su soporte en `filterMenuItemsByAuthorization`.

  *Depende de:* 7.3. **Hecho cuando:**
  - `menu-permisos-f3.test.js` pasa (solo se suma `sitios/landings` donde se ve `sitios`);
  - `future-message-channels.test.js` pasa;
  - a 1440 y 390 px el menú muestra las secciones en el orden nuevo.
- [ ] 8.2 Reglas de dibujo en `construirVistaMenu` (D9): grupo de un hijo como enlace directo, grupos vacíos fuera, secciones vacías fuera e `inline`. Pruebas en `menu-vista.test.js`. *Depende de:* 8.1. **Hecho cuando:**
  - las pruebas pasan;
  - en FLORECER con VENTAS, a 1440 px, Producción y Precios son enlaces y Seguridad no aparece;
  - con un administrador de Julsmind, En vivo es grupo con dos hijos;
  - a 390 px el drawer aplica las mismas reglas.
- [ ] 8.3 `[P]` Landings:
  - lectura en el servidor, solo lectura, del `tipo` de los sitios (cuántos no lo tienen y cómo los trata `listar`);
  - ruta `sitios/landings` con `data: { tipo: 'landing' }`;
  - `soloTipo` acepta `'landing'`.

  *Depende de:* 8.1. **Hecho cuando:**
  - el conteo está anotado y la regla para sitios sin `tipo` coincide con la del servidor;
  - a 1440 px Sitio web › Landings abre la lista solo con landings y con las mismas acciones de Mis sitios;
  - un rol sin `sitios` no la ve;
  - a 390 px la lista se ve completa.
- [ ] 8.4 `[P]` Favoritos v2 (D10): `sidebarFavoritesV2`, conversión única con la tabla de títulos viejos a `id`, `isFavorite` por ruta o `id`, y la estrella en la cabecera de las secciones `inline`. Pruebas en `menu-favoritos.test.js`. *Depende de:* 8.2. **Hecho cuando:**
  - las pruebas pasan: escenario de la spec, los dos «Logística», Finanzas y Mensajes como sección, límite de 5, rol que ya no ve una pantalla y segunda carga sin cambios;
  - a 1440 px, un navegador con favoritos de antes (copiados de 1.2) ve todos con la estrella marcada;
  - `sidebarFavoriteItems` sigue intacto;
  - a 390 px se ve igual.
- [ ] 8.5 `[P]` Búsqueda (D11):
  - sin mayúsculas ni tildes;
  - `previousTitle` hasta `PREVIOUS_TITLES_UNTIL`;
  - resultados como `Grupo · Nombre`.

  Pruebas en `menu-busqueda.test.js`. *Depende de:* 8.1. **Hecho cuando:**
  - las pruebas pasan, incluido el vencimiento;
  - a 1440 px «inventario por bodega» encuentra «Bodegas · Existencias» y abre esa pantalla;
  - a 390 px funciona igual.
- [ ] 8.6 Editor de roles (D12):
  - `etiqueta` y `filterBy`;
  - emparejar por ruta;
  - limpiar los campos de presentación al guardar;
  - `PERMISOS_FUERA_DEL_MENU` por `id`;
  - sin Landings.

  *Depende de:* 8.1. **Hecho cuando:**
  - buscar «listado» muestra «Clientes · Listado», «Cotizaciones · Listado» y «Productos · Listado»;
  - un rol de FLORECER guardado con los nombres viejos se abre sin duplicados;
  - al guardarlo sin cambios, con `*/v1/roles/edit` bloqueado en DevTools, el payload trae las mismas rutas en `menus` que el rol guardado y ningún campo `etiqueta`;
  - «Creación rápida» sale una vez;
  - se revisó a 1440 y 390 px.
- [ ] 8.7 Lectores del título y textos (D13):
  - `nombreDePantalla` devuelve `Grupo · Nombre`;
  - los textos de 7.1 que llegan al comercio;
  - la novedad `2026-11-menu-ordenado`.

  *Depende de:* 8.1 y 7.1. **Hecho cuando:**
  - la ventana de opinar de Bodegas › Ajustes dice «Bodegas · Ajustes»;
  - la lista de 7.1 queda resuelta;
  - la novedad sale una sola vez por usuario;
  - se revisó a 1440 y 390 px.
- [ ] 8.8 Reglas para módulos nuevos:
  - comentario al inicio de `MENUITEMS` que remite a la spec `sidebar-structure`;
  - `tests/navigation/menu-reglas.test.js`: máximo 3 niveles, ningún grupo visible de un solo hijo, `menuIcon` único, ningún título con «rol», «usuario» o «empresa» fuera de los ocultos a propósito, y NUEVO siempre con `badgeUntil`.

  *Depende de:* 8.2. **Hecho cuando:** la prueba pasa y falla si se agrega un grupo de prueba que rompe una regla. A 1440 y 390 px nada cambia.

### 9. Verificación, publicación y cierre de F3

- [ ] 9.1 `npm run build:prod` sin errores y conteos de 3.2. **Hecho cuando:** el build está en verde y da 0, 0 y 0.
- [ ] 9.2 Navegador, a 1440×900, 1366×768 (Todos los pedidos, venta asistida y POS, en abierto y compacto), 1147×607 y 390×844:
  - con VENTAS, Administrador y administrador de Julsmind;
  - favoritos de antes, búsqueda por nombre viejo, Landings, editor de roles y teclado.

  **Hecho cuando:**
  - sin scroll horizontal, texto invisible ni piezas encimadas;
  - cada rol abre las mismas pantallas que en 6.4, contadas por ruta;
  - las capturas están guardadas.
- [ ] 9.3 Fijar `PREVIOUS_TITLES_UNTIL` = fecha de publicación + 90 días. Diff, aprobación, commit con sello y publicación con el candado, con autorización. **Hecho cuando:** en producción, a 1440 y 390 px, se ve como en 9.2 y «inventario por bodega» encuentra «Bodegas · Existencias».
- [ ] 9.4 Cierre (sesión principal):
  - bitácora de D-546 y ajuste de D-409 («el título es el nombre completo; el menú usa el corto») en `specs/CONTRACT.md`;
  - ticket 1336 Resuelto con evidencia;
  - anotar los cambios aparte que quedan: el buscador del encabezado y lo que el 1336 pide fuera del menú.

  **Hecho cuando:** los tres registros existen.
- [ ] 9.5 `/opsx:archive` con F3 verificada en producción. Las reglas para módulos nuevos pasan a `openspec/specs/`. **Hecho cuando:** `npx openspec validate --strict` pasa sobre las specs archivadas.
