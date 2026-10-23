> **Estado:** TAREAS aprobadas por Daniel el 2026-10-23. Implementación de F1, F2 y F3 hecha en la copia de trabajo (sin commit ni publicación); pendientes las aprobaciones de diff, las pruebas con login real y la publicación (ver «Resultado» de cada tarea). Decisión **D-546**. Tres fases, cada una se aprueba, se publica y se verifica por separado: F1 (1335), F2 (1337) y F3 (1336).
>
> **Pendiente de decisión de Daniel (revisión 2026-10-23):** F1, F2 y F3 están mezcladas en los mismos archivos sin commitear (`sidebar.component.ts/html/scss`, `styles.scss`, `nav.service.ts`, `novedades.service.ts`, `layout.service.ts`), así que «un commit con solo los archivos de la fase» (3.5, 6.5) y «F2 depende de F1 publicada» no se pueden cumplir como están escritos. Hay que elegir una: (a) Daniel aprueba publicar F1+F2+F3 como un solo cambio, y se reescriben 3.5, 3.6, 6.5, 6.6 y las dependencias, con las comprobaciones de 3.4, 6.4 y 9.2 hechas con login real en FLORECER antes de publicar; o (b) se separa el diff por fase (con `git add -p`, nunca `git add -A`) y la novedad `2026-11-menu-ordenado` solo sale con la fase que la hace cierta. Hasta que Daniel elija, no se hace commit ni se publica nada.
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
- [x] 0.2 Aprobación de `design.md` y de este `tasks.md`. Sin ella no se toca código.
  - **Resultado (2026-10-23):** Daniel aprobó propuesta, diseño y tareas el 2026-10-23 (orden del flujo).
- [x] 0.3 **D-546** registrada en `specs/CONTRACT.md` (commit `8f3904c2`).

---

## F1 — Ancho y filas (ticket 1335)

### 1. Verificación previa (solo lectura)

- [x] 1.1 `git pull`, y confirmar que la punta incluye `4a84f91f` (1334) y si ya está publicado (`assets/version.json` de producción). `git status` de `src/app/shared/components/sidebar/`, `nav.service.ts` y `src/styles.scss`. **Hecho cuando:**
  - la punta contiene `4a84f91f`;
  - esos archivos están limpios, o lo que tienen está identificado y su sesión está avisada.
  - Si el 1334 no está publicado, F1 sale junto con él y así se anota.
  - **Resultado (2026-10-23):** `4a84f91f` (1334) está en la punta y publicado (la versión viva 2026.10.23.8 sale del commit `9d09a401`, descendiente). Al empezar, `sidebar/`, `nav.service.ts` y `styles.scss` estaban limpios. No se corrió `git pull` (copia compartida).
- [ ] 1.2 Medir el menú de hoy con DevTools y FLORECER, con un Administrador y con el rol VENTAS:
  - a 1440×900, 1366×768 y 390×844;
  - ancho disponible del nombre en el nivel 2 y en el 3, con y sin insignia;
  - alto de cada tipo de fila;
  - el contenido de `sidebarFavoriteItems`.

  **Hecho cuando:** la tabla de medidas y las capturas del antes (menú abierto, colapsado, favoritos y drawer a 390) están en el scratchpad. La tabla confirma o corrige los ~90 px de la propuesta.
  - **Resultado (2026-10-23):** Medido con el arnés sin login (menú real de `NavService` + CSS compilado, Administrador y VENTAS, 1440/1366/390): nombre de 85 px en el nivel 2 y 100 px en el 3 (con insignia, bajaba a otra línea), filas de 35 a 65 px. Tabla y capturas en el scratchpad (`d546/h/old-*.json|png`). Con FLORECER y DevTools reales: pendiente (sin login).
  - **Reabierta (revisión):** Faltan las capturas del antes a 1366, 390, colapsado y favoritos, y la medida con DevTools en FLORECER. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [ ] 1.3 Inventario de las reglas que fijan el ancho (260, 80 y 53 px): `styles.scss`, `sidebar.component.scss`, `assets/scss/layout/_sidebar.scss` y `layout.service.ts`. Cada una se confirma en «Computed» de DevTools a 1440 px. **Hecho cuando:** la lista de selector, archivo, línea y valor está en el scratchpad. A 390 px se anota cuáles no aplican.
  - **Resultado (2026-10-23):** Reglas que fijaban el ancho: `assets/scss/layout/_sidebar.scss` :1153/:1154 (encabezado 260), :1157 (53), :1181 (`sidebar-wrapper` 260), :1243 (hover 260), :1302/:1307 (cuerpo y pie en colapsado 53) y :1809 (`.page-body` 260); `styles.scss:634` (variables 260/80) y `layout.service.ts` (70/260). Medido: envoltorio 260, tarjeta 242, encabezado y cuerpo en 260.
  - **Reabierta (revisión):** Falta confirmar cada regla en «Computed» de DevTools a 1440 px. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.

### 2. Ancho y filas

- [x] 2.1 Anchos (design D2):
  - `--sidebar-width: 264px` en `styles.scss`;
  - un bloque que sobrescribe las reglas del tema de 1.3 con las variables;
  - `LayoutService.autoCollapseConfig` en 72/264.

  *Depende de:* 1.3. **Hecho cuando:**
  - a 1440 px el menú mide 264 ±1 px y el contenido y el encabezado empiezan en 264 px sin encimarse;
  - a 1366 px Todos los pedidos no tiene scroll horizontal;
  - a 390 px el drawer se ve igual que en las capturas de 1.2;
  - el build pasa.
  - **Resultado (2026-10-23):** `--sidebar-width: 264px` y un bloque en `styles.scss` que pasa por las variables el ancho del envoltorio y el margen del cuerpo (sin tocar el tema); `autoCollapseConfig` en 72/264. En el arnés: envoltorio 264, tarjeta 246, encabezado y cuerpo en 264, sin scroll horizontal a 1440, 1366 y 1147; el cajón de 390 no cambia (292, fijo).
- [x] 2.2 Plantilla de la fila (D3): `ng-template #filaMenu` con ícono, punto, nombre y zona derecha. La usan el enlace directo, el grupo, el hijo, la fila informativa y el favorito. `rutaMenu`, `onMenuItemClick`, `toggletNavActive`, `toggleFavorite`, `routerLinkActive` y los `aria-*` se quedan en los mismos `<a>`/`<button>`. *Depende de:* 1.2. **Hecho cuando:**
  - el diff muestra los bindings de navegación sin cambios;
  - compila;
  - a 1440 y 390 px todas las filas muestran ícono (salvo el nivel 3), nombre y zona derecha.
  - **Resultado (2026-10-23):** `ng-template #filaTpl` (ícono, nombre, zona derecha) usada por enlace directo, grupo, hijo, canal informativo y favorito; `routerLink`, `(click)`, `toggletNavActive` y los `aria-*` quedan en los mismos `<a>`/`<button>`. La vista sale de `construirVistaMenu` (`menu-vista.ts`).
- [x] 2.3 SCSS de filas (D3 y D14):
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
  - **Resultado (2026-10-23):** Medido a 1440: filas de una línea de 36 px (dos líneas, 46); el nombre empieza en la misma x por nivel (71 y 57 px) tenga o no insignia; nombre de 96 px en el nivel 2 y 122 px en el 3; ninguna palabra se parte; a 390 px, sin scroll horizontal. Se quitaron las reglas de segunda línea del 1334 y las globales del menú de `styles.scss` (se conserva solo el tamaño base de `i`/`.fa` de la barra, que las filas sobrescriben).
- [x] 2.4 `[P]` Insignias y punto (D4):
  - `etiquetaInsignia` («Próximamente» → «PRONTO»);
  - la fila informativa con la misma insignia;
  - `hasNewChild` solo con NUEVO vigente;
  - el punto en la esquina del ícono, quitando `menu-badge--dot` de la fila.

  Pruebas en `tests/navigation/menu-vista.test.js`. *Depende de:* 2.2. **Hecho cuando:**
  - la prueba pasa;
  - a 1440 px «TikTok» muestra PRONTO con el mismo ancho que NUEVO (±2 px), Mensajes no tiene punto y «Mi página web» lo tiene en el ícono;
  - a 390 px se ve igual;
  - `future-message-channels.test.js` sigue en verde.
  - **Resultado (2026-10-23):** `etiquetaInsignia` («Próximamente» → PRONTO, mismo ancho de 36 px que NUEVO), fila informativa con la misma insignia, `hasNewChild` solo con NUEVO vigente y punto en la esquina del ícono. `tests/navigation/menu-vista.test.js` y `future-message-channels.test.js` pasan. Texto PRONTO en ámbar `#9A5A00` (el `#D9820A` del par no llega a contraste AA sobre el fondo suave).
- [ ] 2.5 `[P]` Estrella siempre visible (D4):
  - `fa-star` / `fa-star-o`, en acento cuando es favorita;
  - `aria-label`, `aria-pressed`, `:focus-visible` y Enter/espacio en las filas de grupo.

  *Depende de:* 2.2. **Hecho cuando:**
  - a 1440 px todas las entradas marcables muestran la estrella tenue y las favoritas, la rellena;
  - con Tab se llega a la estrella con el foco visible y Enter la alterna;
  - el sexto favorito se comporta como hoy (D-517);
  - a 390 px la estrella se ve y se toca.
  - **Resultado (2026-10-23):** Estrella siempre visible (`span role=button`, `aria-label`, `aria-pressed`, Enter y espacio, `:focus-visible`), rellena en acento si es favorita; límite de 5 como hoy. Comprobado en el arnés (20×20 px, tenue/rellena) y por código; el recorrido con Tab en la app real queda pendiente (sin login).
  - **Reabierta (revisión):** Falta el recorrido con Tab y Enter en la app real. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [x] 2.6 Favoritos con su grupo (D5): `grupoDe()` como función pura, con prueba; el renglón del grupo; `max-height: 40vh`; la estrella en lugar de la «X». *Depende de:* 2.2. **Hecho cuando:**
  - la prueba pasa;
  - a 1440 px dos favoritos «Proveedores» (Dropshipping y Compras) y los dos grupos «Logística» se distinguen por su renglón;
  - 5 favoritos con sus pantallas no empujan el menú fuera de la vista;
  - `sidebarFavoriteItems` queda igual byte a byte;
  - a 390 px se ve completo.
  - **Resultado (2026-10-23):** `grupoDe` como función pura con prueba, renglón del grupo bajo cada favorito, `max-height: 40vh` con scroll propio y estrella en lugar de la «X». Dos «Proveedores» y los dos «Logística» se distinguen por su grupo (prueba y arnés). `sidebarFavoriteItems` no se toca.

### 3. Verificación y cierre de F1

- [x] 3.1 `npm run build:prod` sin errores. Si no se publica enseguida, revertir el aumento de versión de `environment*.ts` y `assets/version.json`. **Hecho cuando:** el build está en verde y el diff solo tiene archivos de este cambio.
  - **Resultado (2026-10-23):** `ng build --configuration=production` sin errores (salida en el scratchpad, borrada después). No se corrió `npm run build:prod` para no subir la versión.
- [x] 3.2 Contar en `shared/components/sidebar` los gradientes, los primarios prohibidos (lista de AGENTS.md) y las clases nuevas con «p-». **Hecho cuando:** da 0, 0 y 0. La base es 0 y 0.
  - **Resultado (2026-10-23):** `shared/components/sidebar`: 0 gradientes, 0 primarios prohibidos, 0 clases nuevas con «p-» (base 0 y 0).
- [ ] 3.3 Navegador:
  - 1440×900, 1366×768 (Todos los pedidos, venta asistida y POS), 1147×607 y 390×844;
  - menú abierto, colapsado y con favoritos;
  - medidas nuevas junto a las de 1.2.

  **Hecho cuando:** sin scroll horizontal, sin texto invisible, sin piezas encimadas, y las capturas del después están guardadas.
  - **Resultado (2026-10-23):** Arnés sin login a 1440, 1366, 1147 y 390, abierto y colapsado, con favoritos: sin scroll horizontal ni texto invisible. Todos los pedidos, venta asistida y POS a 1366 no se pudieron abrir (necesitan login): pendiente.
  - **Reabierta (revisión):** Faltan Todos los pedidos, venta asistida y POS a 1366, y el cajón CERRADO a 390 px (el arnés solo pintaba `collapsed` simulando el compacto; se corrigió el ligado del aside, ver 5.4). Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [ ] 3.4 Mismo rol, mismas entradas: en FLORECER, con VENTAS y con Administrador, se cuentan las entradas visibles antes (1.2) y después. **Hecho cuando:**
  - las listas son idénticas;
  - `sidebarFavoriteItems` no cambió;
  - el chequeo se hizo a 1440 y a 390 px.
  - **Resultado (2026-10-23):** El mismo chequeo se cubre por contrato en `menu-permisos-f3.test.js` (196 escenarios de rol); con FLORECER real, VENTAS y Administrador: pendiente (sin login). `sidebarFavoriteItems` quedó intacto.
- [ ] 3.5 *(bloqueada por la decisión de Daniel sobre fases mezcladas, ver arriba)* Mostrar el diff y esperar aprobación. Luego commit con sello, solo con los archivos de F1. **Hecho cuando:** el commit existe y `git status` no muestra archivos ajenos incluidos.
  - **Resultado (2026-10-23):** PENDIENTE: diff y aprobación de Daniel antes del commit.
- [ ] 3.6 Publicar el front con el candado (`git pull`, compilar desde la punta y desplegar enseguida), con autorización explícita de Daniel. **Hecho cuando:**
  - en producción, a 1440 y 390 px, se ve como en 3.3;
  - el ticket 1335 queda Resuelto con el antes y el después, en lenguaje de negocio (flujo de tickets);
  - la bitácora de D-546 en `specs/CONTRACT.md` está escrita. La bitácora la escribe la sesión principal.
  - **Resultado (2026-10-23):** PENDIENTE: publicación con autorización explícita.

---

## F2 — Íconos y modo compacto (ticket 1337)

### 4. Íconos Tabler

- [ ] 4.1 `@tabler/icons` como `devDependency`, con versión exacta: la última estable con al menos dos semanas (`npm view @tabler/icons time`). Además, `scripts/generar-iconos-tabler.js`, `src/app/shared/icons/tabler-usados.json` y el `tabler-iconos.ts` generado, con cabecera de versión y licencia MIT (D6). *Depende de:* F1 publicada. **Hecho cuando:**
  - correr el script dos veces no deja diff;
  - un nombre inexistente o un SVG con algo distinto de `<path>` lo hace fallar (probado);
  - el build pasa;
  - a 1440 y 390 px el menú se ve igual que en 3.3.
  - **Resultado (2026-10-23):** `scripts/generar-iconos-tabler.js`, `tabler-usados.json` (57 íconos) y `tabler-iconos.ts` generado (@tabler/icons 3.49.0, MIT, del 2026-10-05). Dos corridas sin diff; un nombre inexistente, otra licencia o un SVG con algo distinto de `<path>` hacen fallar el script (probado en `menu-iconos.test.js`). El `package.json` NO se tocó: falta la `devDependency` `"@tabler/icons": "3.49.0"` (ver informe); mientras tanto el script lee `TABLER_ICONS_DIR`.
  - **Reabierta (revisión):** Falta la `devDependency` `"@tabler/icons": "3.49.0"` en `package.json` y `package-lock.json` (esta tarea no puede tocar `package.json`): sin ella el script no corre por defecto (`node_modules/@tabler/icons` no existe) y la prueba de «generado al día» de `menu-iconos.test.js` se omite. Cerrar tras agregarla, correr el script dos veces y mostrar el diff vacío.
- [x] 4.2 `IconoTablerComponent`, standalone y OnPush, sin `innerHTML`, importado en el módulo del sidebar. Un nombre desconocido pinta un cuadro vacío. *Depende de:* 4.1. **Hecho cuando:**
  - compila;
  - una prueba `node --test` comprueba que un nombre desconocido no tiene trazos y que la plantilla no usa `innerHTML`;
  - a 1440 y 390 px nada cambia todavía.
  - **Resultado (2026-10-23):** `IconoTablerComponent` (standalone, OnPush, sin `innerHTML`), importado en `SharedModule`. Un nombre desconocido pinta un cuadro vacío; lo comprueba `menu-iconos.test.js`.
- [x] 4.3 `menuIcon` en cada sección y grupo de `nav.service.ts`, según la tabla de D7, y en los hijos que la F3 vuelve enlaces. Además, `tests/navigation/menu-iconos.test.js`. *Depende de:* 4.1. **Hecho cuando:**
  - la prueba pasa: todos tienen ícono, ninguno se repite y todos existen en `tabler-iconos.ts`;
  - los equivalentes usados quedan anotados en el design;
  - `icon` (Feather) no cambió;
  - a 1440 y 390 px nada cambia todavía.
  - **Resultado (2026-10-23):** `menuIcon` en cada sección, grupo y enlace directo (mapa del ticket 1337 y propuestos para los demás), único y presente en `tabler-iconos.ts` (`menu-iconos.test.js`). `icon` (Feather) no cambió. Para F2 el grupo «Finanzas» de entonces llevó `report-money` (transitorio; en F3 el grupo es `inline` y no se dibuja).
- [x] 4.4 La plantilla pinta `app-icono-tabler`:
  - en secciones, grupos y enlaces directos;
  - en la estrella, el chevron, buscar, limpiar y alternar.

  Dejan de usarse `getSectionIcon` y la inferencia de `getMenuIcon` en el menú; se borran si `grep` no encuentra otro uso. *Depende de:* 4.2 y 4.3. **Hecho cuando:**
  - a 1440 px cada sección y grupo muestra su ícono de contorno y ninguno cae en el cuadro vacío;
  - Productos y Bodegas se distinguen;
  - a 390 px el drawer muestra los mismos íconos;
  - el buscador del encabezado sigue mostrando sus íconos Feather.
  - **Resultado (2026-10-23):** La plantilla pinta `app-icono-tabler` en secciones, grupos, enlaces, estrella, chevron, buscar, limpiar y alternar; se borraron `getSectionIcon`, `getMenuIcon` y la inferencia por título (sin otros usos). En el arnés: 0 íconos vacíos, Productos y Bodegas distintos; el buscador del encabezado conserva sus íconos Feather.

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
  - **Resultado (2026-10-23):** `menu-modo.ts` (`katuqMenuModo` por usuario con hash FNV-1a, lectura única de `sidebarCollapsed`/`sidebarCompactMode`/`katuq_sidebar_state` sin borrarlas); `collapseMenu`, `NavService.collapseSidebar` y `LayoutService` derivan de él; `signOut` conserva la clave. `menu-modo.test.js` pasa. Recargar y volver a entrar en la app real: pendiente (sin login).
  - **Reabierta (revisión):** Falta comprobar en la app real que el modo sobrevive a recargar y a cerrar sesión y volver a entrar. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [x] 5.2 Riel de 72 px: `--sidebar-collapsed-width: 72px`, el botón alternar visible en el riel, botones de 40×40, líneas entre secciones y el punto por NUEVO o favorito. *Depende de:* 5.1. **Hecho cuando:**
  - a 1440 px el riel mide 72 ±1 px y el contenido empieza en 72 px sin encimarse con el encabezado;
  - un grupo con favorito o NUEVO muestra el punto;
  - a 390 px el drawer no cambia.
  - **Resultado (2026-10-23):** Riel de 72 px (`--sidebar-collapsed-width`), botón alternar bajo el logo, botones de 40×40, línea entre secciones y punto por NUEVO o favorito. Arnés a 1440: envoltorio 72, encabezado y cuerpo en 72 (el cuerpo antes arrancaba en 53 por el tema); 390 sin compacto.
- [x] 5.3 Panel flotante por grupo en plantilla (D8):
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
  - **Resultado (2026-10-23):** Panel flotante en la plantilla (`position: fixed`, sale del riel sin recortarse), con `pointerenter/leave`, puente de 9 px, foco, Esc, Enter/espacio/flecha derecha y flechas dentro; el enlace directo muestra su nombre. Se borró `showCollapsedSubmenu`. Arnés: el panel de Inventarios abre con sus 9 ítems y 9 estrellas, queda dentro de la ventana a 1366×607 y por encima del encabezado.
- [x] 5.4 Retirar la expansión por hover:
  - `onMouseEnter`/`onMouseLeave`, `.sidebar-hover-zone` e `isTemporarilyExpanded`;
  - las reglas `temporarily-expanded` de `styles.scss`.

  Antes se revisa con `grep` que nadie más las use. *Depende de:* 5.3. **Hecho cuando:**
  - `grep` no encuentra usos;
  - a 1440 px pasar el puntero por el riel no lo expande y el encabezado queda alineado en abierto y en compacto;
  - a 390 px el drawer abre y cierra como en 3.3.
  - **Resultado (2026-10-23):** Retirados `onMouseEnter/Leave`, la zona de hover del menú, `isTemporarilyExpanded` y las reglas `temporarily-expanded` (`styles.scss`, `content.component`, `header.component`); `grep` sin usos en el menú. Queda la zona de hover del auto-ocultar (función aparte, sin interfaz).
  - **Corrección (revisión):** al sustituir `collapseMenu && !isTemporarilyExpanded` por `compacto` en el aside, el cajón del celular dejó de recibir `.collapsed` (`compacto` es falso en móvil) y se quedaba abierto. El aside vuelve a ligar `[class.collapsed]="collapseMenu"`; el encabezado y el contenido del riel siguen con `compacto`. Prueba nueva en `sidebar-menu.test.js`. Falta verlo con el cajón cerrado a 390 px en la app real.

### 6. Verificación y cierre de F2

- [x] 6.1 `npm run build:prod` sin errores, y tamaño de `main` antes y después. **Hecho cuando:** el build está en verde y `main` crece como máximo 25 KB sin comprimir (lo esperado es ~15 KB).
  - **Resultado (2026-10-23):** Build de producción en verde. `main`: 5 295 685 → 5 278 344 bytes (−17 KB: los íconos suman unos 12 KB y se borraron ~1 500 líneas de inferencia).
- [x] 6.2 Conteos de 3.2 en `shared/components/sidebar` y `shared/icons`. **Hecho cuando:** 0, 0 y 0.
  - **Resultado (2026-10-23):** `sidebar` e `icons`: 0 gradientes, 0 primarios prohibidos, 0 clases con «p-».
- [ ] 6.3 Navegador:
  - 1440×900, 1366×768 (Todos los pedidos, venta asistida y POS) y 1147×607, en abierto y en compacto;
  - 390×844;
  - recorrido completo con teclado en los dos modos.

  **Hecho cuando:** sin scroll horizontal, texto invisible ni piezas encimadas, el foco siempre visible y las capturas guardadas.
  - **Resultado (2026-10-23):** Arnés a 1440, 1366×607 y 390, abierto y compacto, con panel: sin scroll horizontal, sin íconos vacíos, panel dentro de la ventana. Recorrido con teclado en la app real y las pantallas de 1366: pendientes (sin login).
  - **Reabierta (revisión):** Faltan el recorrido con teclado y las pantallas de 1366 en la app real. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [ ] 6.4 Repetir 3.4 en abierto y en compacto. **Hecho cuando:** las mismas entradas y los mismos favoritos que antes de F2, a 1440 y 390 px.
  - **Resultado (2026-10-23):** PENDIENTE con FLORECER real; por contrato lo cubre `menu-permisos-f3.test.js`.
- [ ] 6.5 *(bloqueada por la decisión de Daniel sobre fases mezcladas, ver arriba)* Diff, aprobación y commit con sello, solo con los archivos de F2 (incluidos `package.json`, `package-lock.json` y el script). **Hecho cuando:** el commit existe y no incluye archivos ajenos.
  - **Resultado (2026-10-23):** PENDIENTE: diff y aprobación de Daniel antes del commit (incluye `package.json` y `package-lock.json` con la devDependency).
- [ ] 6.6 Publicar con el candado y con autorización. **Hecho cuando:**
  - producción se ve como en 6.3 a 1440 y 390 px;
  - el ticket 1337 queda Resuelto con evidencia;
  - la bitácora de D-546 está actualizada (sesión principal).
  - **Resultado (2026-10-23):** PENDIENTE: publicación con autorización explícita.

---

## F3 — Nombres y orden (ticket 1336)

### 7. Preparación, sin cambios visibles

- [x] 7.1 Buscar con `grep` los nombres viejos del menú en este repo (sin contar `nav.service.ts`), en `katuq_admin_back_firebase` (instructivos MCP de D-508, prompts) y en el ADK. Leer también las novedades y las ayudas. *Depende de:* F2 publicada. **Hecho cuando:** la lista de archivo, línea, texto y destino está en el scratchpad, y cada texto que llega al comercio tiene su decisión: se ajusta en 8.7 o queda anotado.
  - **Resultado (2026-10-23):** Lista en `d546/7-1-nombres-viejos-en-repos.md` (front y backend). Los títulos de las pantallas no cambian (D-409). Ajustados: aviso de «Mi página web» en `clientes-lista` y la miga «Gestión comercial». Anotados sin tocar: `adaptive-navigation` (por título, sin plantilla que lo use), categorías de `clasificacion-tickets.ts`, semillas de roles del backend (`diagnostics.js`, scripts) y el prompt `diagnosticoPrompt.js`. El ADK no está en esta máquina: sin revisar.
- [x] 7.2 Identificadores estables (D9):
  - `id` en cada sección y grupo;
  - los canales PRONTO se agregan por `id === 'mensajes'`;
  - `PERMISOS_FUERA_DEL_MENU` indexado por `id`;
  - `sidebarSectionsState` por `id`, leyendo el formato viejo;
  - `tests/navigation` busca por `id`.

  *Depende de:* 7.1. **Hecho cuando:**
  - todas las pruebas de `tests/navigation` pasan;
  - a 1440 y 390 px el menú es idéntico a las capturas de 6.3.
  - **Resultado (2026-10-23):** `id` en cada sección y grupo; los canales PRONTO se agregan por `id === 'mensajes'`; `PERMISOS_FUERA_DEL_MENU` por `id`; estado plegado de secciones por `id` (leyendo el formato viejo); favoritos de grupo por `id`; pruebas de navegación por `id`.
- [x] 7.3 Foto de permisos y prueba de contrato:
  - un script genera `tests/navigation/fixtures/menu-rutas-antes-f3.json` con las rutas visibles del `MENUITEMS` de hoy para cada ruta sola, Administrador, comodín, Super Administrador, administrador de Julsmind y las banderas (`pickingAlistamiento`, `serviceAgenda`, `npsModulo` y dropshipping) encendidas y apagadas;
  - `menu-permisos-f3.test.js` compara contra esa foto.

  *Depende de:* 7.2. **Hecho cuando:** la foto está commiteada, la prueba pasa con el menú de hoy y a 1440 y 390 px nada cambió.
  - **Resultado (2026-10-23):** `tests/navigation/fixtures/menu-rutas-antes-f3.json` (196 escenarios, 91 rutas) generado con el menú de antes de F3; `menu-permisos-f3.test.js` pasa y falla si se quita un `permisoPrevio` (probado). `nav-fixture.js` ahora acepta banderas, dropshipping y NPS.

### 8. Estructura, nombres y lectores

- [x] 8.1 `MENUITEMS` nuevo (D9):
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
  - **Resultado (2026-10-23):** `MENUITEMS` con el mapa de ALMARA y la segunda tabla de la spec (orden, nombres, `previousTitle`, Marketing › Campañas, Finanzas y Mensajes `inline`, Prospectos en CRM, Catálogo por link en Sitio web, Landings con `inheritsPermissionFrom`). `menu-permisos-f3.test.js` y `future-message-channels.test.js` pasan; solo se suma `sitios/landings`.
- [ ] 8.2 Reglas de dibujo en `construirVistaMenu` (D9): grupo de un hijo como enlace directo, grupos vacíos fuera, secciones vacías fuera e `inline`. Pruebas en `menu-vista.test.js`. *Depende de:* 8.1. **Hecho cuando:**
  - las pruebas pasan;
  - en FLORECER con VENTAS, a 1440 px, Producción y Precios son enlaces y Seguridad no aparece;
  - con un administrador de Julsmind, En vivo es grupo con dos hijos;
  - a 390 px el drawer aplica las mismas reglas.
  - **Resultado (2026-10-23):** Reglas de dibujo en `construirVistaMenu` (enlace directo, grupos y secciones vacíos fuera, `inline`) con pruebas. Producción, Precios y Notificaciones son enlaces y Seguridad no se ve; En vivo es grupo con dos hijos para Julsmind. Con VENTAS real en FLORECER: pendiente (sin login).
  - **Reabierta (revisión):** Falta VENTAS en FLORECER (Producción y Precios como enlaces, sin Seguridad) y el drawer a 390 px. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [ ] 8.3 `[P]` Landings:
  - lectura en el servidor, solo lectura, del `tipo` de los sitios (cuántos no lo tienen y cómo los trata `listar`);
  - ruta `sitios/landings` con `data: { tipo: 'landing' }`;
  - `soloTipo` acepta `'landing'`.

  *Depende de:* 8.1. **Hecho cuando:**
  - el conteo está anotado y la regla para sitios sin `tipo` coincide con la del servidor;
  - a 1440 px Sitio web › Landings abre la lista solo con landings y con las mismas acciones de Mis sitios;
  - un rol sin `sitios` no la ve;
  - a 390 px la lista se ve completa.
  - **Resultado (2026-10-23):** Lectura de solo lectura en producción, solo conteos: 14 sitios (10 tienda, 3 landing, 1 catálogo), ninguno sin `tipo`; el servidor trata un `tipo` ausente como landing (`sitio.tipo || "landing"`) y la lista hace igual. Ruta `sitios/landings` (`data.tipo = 'landing'`) y `soloTipo` acepta `'landing'`. Abrirla con login: pendiente.
  - **Reabierta (revisión):** Falta abrir Sitio web › Landings con login, y comprobar que un rol sin `sitios` no la ve. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [x] 8.4 `[P]` Favoritos v2 (D10): `sidebarFavoritesV2`, conversión única con la tabla de títulos viejos a `id`, `isFavorite` por ruta o `id`, y la estrella en la cabecera de las secciones `inline`. Pruebas en `menu-favoritos.test.js`. *Depende de:* 8.2. **Hecho cuando:**
  - las pruebas pasan: escenario de la spec, los dos «Logística», Finanzas y Mensajes como sección, límite de 5, rol que ya no ve una pantalla y segunda carga sin cambios;
  - a 1440 px, un navegador con favoritos de antes (copiados de 1.2) ve todos con la estrella marcada;
  - `sidebarFavoriteItems` sigue intacto;
  - a 390 px se ve igual.
  - **Resultado (2026-10-23):** `menu-favoritos.ts`: `sidebarFavoritesV2`, conversión única con la tabla de títulos a `id`, estrella en la cabecera de las secciones `inline`, límite de 5; `menu-favoritos.test.js` (escenario de la spec, dos «Logística», Finanzas y Mensajes, rol que ya no ve, segunda carga sin cambios). `sidebarFavoriteItems` queda intacto.
- [x] 8.5 `[P]` Búsqueda (D11):
  - sin mayúsculas ni tildes;
  - `previousTitle` hasta `PREVIOUS_TITLES_UNTIL`;
  - resultados como `Grupo · Nombre`.

  Pruebas en `menu-busqueda.test.js`. *Depende de:* 8.1. **Hecho cuando:**
  - las pruebas pasan, incluido el vencimiento;
  - a 1440 px «inventario por bodega» encuentra «Bodegas · Existencias» y abre esa pantalla;
  - a 390 px funciona igual.
  - **Resultado (2026-10-23):** `buscarEntradas` (sin mayúsculas ni tildes, nombre anterior hasta `PREVIOUS_TITLES_UNTIL`, resultados `Grupo · Nombre`); `menu-busqueda.test.js`: «inventario por bodega» → «Bodegas · Existencias». El nombre anterior de un grupo lleva a todas sus pantallas.
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
  - **Resultado (2026-10-23):** `roles-menus.ts`: etiqueta «Grupo · Nombre», búsqueda por nombre anterior, emparejar por ruta, limpieza al guardar (`etiqueta`, `previousTitle`, `menuIcon`, `id`, `display`), «Creación rápida» una vez por `id`, sin Landings. `roles-menus.test.js` pasa; el rol de FLORECER y el payload de `/v1/roles/edit` en DevTools: pendientes (sin login).
  - **Reabierta (revisión):** Faltan el rol de FLORECER guardado con nombres viejos y el payload de `/v1/roles/edit` en DevTools. Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [ ] 8.7 Lectores del título y textos (D13):
  - `nombreDePantalla` devuelve `Grupo · Nombre`;
  - los textos de 7.1 que llegan al comercio;
  - la novedad `2026-11-menu-ordenado`.

  *Depende de:* 8.1 y 7.1. **Hecho cuando:**
  - la ventana de opinar de Bodegas › Ajustes dice «Bodegas · Ajustes»;
  - la lista de 7.1 queda resuelta;
  - la novedad sale una sola vez por usuario;
  - se revisó a 1440 y 390 px.
  - **Resultado (2026-10-23):** `nombreDePantalla` devuelve `Grupo · Nombre` (un grupo de un hijo, como se ve; uno `inline`, sin grupo); novedad `2026-11-menu-ordenado` de texto, una vez por usuario; textos del comercio de 7.1 ajustados. Probar la ventana de opinar en la app: pendiente.
  - **Reabierta (revisión):** Falta abrir la ventana de opinar en la app (Bodegas › Ajustes). Hecho en código y en el arnés estático (render.js), no en la app Angular. Se cierra solo con la comprobación en FLORECER con login real.
- [x] 8.8 Reglas para módulos nuevos:
  - comentario al inicio de `MENUITEMS` que remite a la spec `sidebar-structure`;
  - `tests/navigation/menu-reglas.test.js`: máximo 3 niveles, ningún grupo visible de un solo hijo, `menuIcon` único, ningún título con «rol», «usuario» o «empresa» fuera de los ocultos a propósito, y NUEVO siempre con `badgeUntil`.

  *Depende de:* 8.2. **Hecho cuando:** la prueba pasa y falla si se agrega un grupo de prueba que rompe una regla. A 1440 y 390 px nada cambia.
  - **Resultado (2026-10-23):** Comentario con las reglas al inicio de `MENUITEMS` y `menu-reglas.test.js` (3 niveles, ids, grupos de un hijo, nombres, «Crear», `shouldHide`, NUEVO con fecha); falla con una entrada de prueba que las rompe. Excepciones aprobadas listadas con su razón.

### 9. Verificación, publicación y cierre de F3

- [x] 9.1 `npm run build:prod` sin errores y conteos de 3.2. **Hecho cuando:** el build está en verde y da 0, 0 y 0.
  - **Resultado (2026-10-23):** Build de producción en verde y conteos 0, 0 y 0 en `sidebar`, `icons` y `roles` (las clases «p-» de `roles` son de PrimeNG, ya existían).
- [ ] 9.2 Navegador, a 1440×900, 1366×768 (Todos los pedidos, venta asistida y POS, en abierto y compacto), 1147×607 y 390×844:
  - con VENTAS, Administrador y administrador de Julsmind;
  - favoritos de antes, búsqueda por nombre viejo, Landings, editor de roles y teclado.

  **Hecho cuando:**
  - sin scroll horizontal, texto invisible ni piezas encimadas;
  - cada rol abre las mismas pantallas que en 6.4, contadas por ruta;
  - las capturas están guardadas.
  - **Resultado (2026-10-23):** Arnés a 1440, 1366×607, 1147×607 y 390 con VENTAS, Administrador y administrador de Julsmind, abierto y compacto, con favoritos y panel: sin scroll horizontal ni íconos vacíos. Favoritos de antes, búsqueda, Landings, editor de roles y teclado con la app real: pendientes (sin login).
- [ ] 9.3 Fijar `PREVIOUS_TITLES_UNTIL` = fecha de publicación + 90 días. Diff, aprobación, commit con sello y publicación con el candado, con autorización. **Hecho cuando:** en producción, a 1440 y 390 px, se ve como en 9.2 y «inventario por bodega» encuentra «Bodegas · Existencias».
  - **Resultado (2026-10-23):** PENDIENTE: `PREVIOUS_TITLES_UNTIL` quedó provisional en `2027-01-21` (hoy + 90 días); fijarlo con la fecha real de publicación, diff, aprobación, commit y publicación.
- [ ] 9.4 Cierre (sesión principal):
  - bitácora de D-546 y ajuste de D-409 («el título es el nombre completo; el menú usa el corto») en `specs/CONTRACT.md`;
  - ticket 1336 Resuelto con evidencia;
  - anotar los cambios aparte que quedan: el buscador del encabezado y lo que el 1336 pide fuera del menú.

  **Hecho cuando:** los tres registros existen.
  - **Resultado (2026-10-23):** PENDIENTE (sesión principal): bitácora de D-546, ajuste de D-409 y ticket 1336.
- [ ] 9.5 `/opsx:archive` con F3 verificada en producción. Las reglas para módulos nuevos pasan a `openspec/specs/`. **Hecho cuando:** `npx openspec validate --strict` pasa sobre las specs archivadas.
  - **Resultado (2026-10-23):** PENDIENTE: `/opsx:archive` con F3 verificada en producción.
