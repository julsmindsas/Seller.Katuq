# Diseño: pruebas y verificación del modo oscuro (D-502, ticket 1180)

> Complementa [`design.md`](design.md) (fase 0) y [`design-f1.md`](design-f1.md) (tokens). Las pruebas se escriben antes del código que cubren (tareas 1.x y 3.1). Ninguna escribe en Firestore ni llama a `back.katuq.com` con escrituras.

## Fase 0

- **`tests/theme/theme-mode.test.js`.** Sigue el patrón de `tests/navigation/nav-responsive.test.js`: transpila la clase y la corre en `vm` con `document`, `localStorage`, `location` y eventos del router simulados. Casos:
  1. al arrancar en una URL del marco con `tema` verdadero, queda oscuro antes de cualquier evento del router; en `/terms-conditions`, con la misma sesión, queda claro;
  2. `isShellUrl` con las cuatro rutas del marco (`content`, `agent-builder`, `pricing` y `billing`), un `:param`, `/`, `/login` y una ruta desconocida;
  3. `NavigationEnd` en una ruta con marco: oscuro; en una ruta pública con sesión oscura: claro; `NavigationCancel` no cambia nada;
  4. otro componente guarda una copia vieja del `user` con la misma identidad: el tema no cambia; entra otro usuario en el mismo navegador: se relee la preferencia;
  5. `reset()` quita la clase y el `style` de fondo y deja el bundle claro; `setPreference` cambia solo `tema`;
  6. con el almacenamiento roto o bloqueado queda claro, sin lanzar; navegar dentro del marco no vuelve a tocar el `<link>`.
- **`tests/theme/users-edit-contract.test.js`** (Art. VIII). El botón llama `updateUser` con exactamente `{ identificacion, tema }`. Ante un 403 de rol o un 5xx, `tema` se queda en el navegador, la clase no se revierte y no se llama `SignOut()`. Hoy el caso de rechazo falla, porque el header solo guarda `tema` cuando el backend responde bien.
- **`tests/theme/user-writers.test.js`.** Si `tema` cambia después de montar `languages` y `edit-profile`, guardar el idioma o el prompt deja `tema` intacto. Hoy falla.
- **`tests/theme/conteos.test.js`.**
  - Gradientes y primarios prohibidos no suben. Línea base del 2026-10-18 (gradientes / primarios): `dark-mode.scss` 1 / 0, `styles.scss` 2 / 10, `sidebar.component.scss` 2 / 0, `shared-filters` 0 / 3, `tracking-details-modal` 5 / 0, `crear-formas-pago` 0 / 1, `general-chat` 1 / 0, y los demás 0 / 0.
  - En `dark-mode.scss` no queda ninguno de los seis patrones de la familia del azul: `#6AB5E8`, `rgba(106, 181, 232`, `rgb(106, 181, 232`, `#5AA5D8`, `#8AC5F8` y `#4A95C8`. Esta parte falla hasta F1.
- **Script `test:theme`.** Lista los archivos uno por uno, como `test:dian-*`: `node --test tests/theme/theme-mode.test.js tests/theme/users-edit-contract.test.js tests/theme/user-writers.test.js tests/theme/conteos.test.js`. En Windows, npm usa cmd.exe, que no expande `*`, y Node 20 no acepta globs en `--test`. En F1 se agregan `theme-tokens.test.js` y `comparar-claro.test.js` a la misma línea, el bloque TEMA-B02 suma `rutas-marco.test.js` y `auditoria-puras.test.js`, TEMA-B05 suma `marco-tokens.test.js`, TEMA-B06 suma `primeng-dark.test.js` y TEMA-B07 suma `config-pagina-tokens.test.js`.

## Fase 1

- **`tests/theme/theme-tokens.test.js`.** Compila `_theme-tokens.scss` con `sass` y comprueba:
  - cada `--ds-*` existe en los dos juegos;
  - en oscuro, cada token de texto da ≥ 4,5:1, y `control-border` y `focus` dan ≥ 3:1 contra **cada** superficie (`canvas`, `surface`, `surface-2`, `row-hover`, `tile`, `chip-bg`, `sidebar` y `accent-soft`), no solo contra `surface`;
  - `on-accent` sobre `accent` y sobre `accent-hover` da ≥ 4,5:1, y en oscuro cada semántico (`ok`, `warn`, `err`, `info`) da ≥ 4,5:1 sobre su `-soft`;
  - el claro es igual a los `$cfg-*` de `_config-pagina.scss` y al marco, y los `-rgb` coinciden con su color.
- **`tests/theme/comparar-claro.js`** (CLI, no es prueba de `node --test`): el chequeo «claro idéntico» sin build. Compila un `.scss` en un commit base y en el árbol actual, sustituye `var(--ds-*)` por el valor claro de los tokens de cada lado, descarta lo oscuro y sale con 1 si el claro cambió (2 si no hay nada que comparar). Lo usa cada bloque de F1 y F2 sobre su consumidor o sobre `src/styles.scss`; no reemplaza las capturas ni el build del cierre. Sus funciones puras se prueban en `comparar-claro.test.js`.
  - **`--tema oscuro`** (bloque TEMA-B05): conserva también las reglas `body.dark-only` y sustituye `var(--ds-*)` por el valor oscuro de cada lado (el de `body.dark-only`, o el de `:root` si el oscuro no lo redefine). Comprueba el «mismo valor» al pasar un literal oscuro a token.
- **`tests/theme/marco-tokens.test.js`** (tarea 3.6). Sidebar y header: en sus reglas oscuras no queda ningún literal con token, cada `var(--ds-*)` existe, y el oscuro resuelto es igual al de la base fija 6e6d67bd en todas las declaraciones oscuras que siguen existiendo, también las que quedaron literales (se salta, con aviso, sin ese commit o sin el bloque). Toasts: ningún color oscuro propio, las reglas oscuras de `p-toast` con `!important` (el `p-toast` por severidad de `dark-mode.scss` sigue hasta 4.5), cada color del claro tiene su par en oscuro, cada texto da ≥ 4,5:1 sobre su fondo (los fondos translúcidos, compuestos sobre la superficie) y el foco ≥ 3:1, y el claro de `_avisos.scss` es igual al de la base.
- **`tests/theme/primeng-dark.test.js`** (tarea 3.7). Arma cada bundle como Angular (el `theme.css` de lara más lo compilado) y simula la cascada por selector exacto. Comprueba:
  - el claro compila igual que en la base fija 35717c33;
  - los dos temas importan `_primeng-katuq-base` en la misma posición;
  - la geometría final (tamaños, espaciados, anchos de borde y radios) es la misma en los dos temas;
  - el botón primario es `var(--ds-accent)` con `on-accent` en oscuro y sigue `#8b5cf6` en claro;
  - ningún color de lara-dark-purple queda como valor final en los componentes que usa la app, y cada componente de las plantillas (`<p-*>`, `pButton`, `pInputText`, `pTooltip`) con colores de lara tiene su sección en el generador (la lista no sale del mismo generador);
  - con una cascada que modela especificidad (`css-select` y `postcss-selector-parser`), la opción marcada y la no marcada de `p-selectButton` y `p-toggleButton` se distinguen (`accent` / `surface`) y el primario sigue en `accent`;
  - `_primeng-dark.scss` solo usa `var(--ds-*)` existentes, y cada texto con fondo propio da ≥ 4,5:1 con los tokens oscuros;
  - las `--surface-*`/`--text-color*` que usa `src/app` tienen valor oscuro;
  - el cableado: `angular.json`, `ThemeModeService`, el tema viejo borrado y `firebase.json` sin caché para `katuq-dark.css` y con el redirect 302 de `/md-dark-deeppurple.css`;
  - la región generada coincide con `primeng-dark-generar.js`.
- **`conteos.test.js`**, segunda parte, en verde.

## Fase 2a (base `config-pagina`, [`design-f2a.md`](design-f2a.md))

- **`tests/theme/config-pagina-tokens.test.js`** (tarea 4.1, bloque TEMA-B07). No usa `git` ni `grep`. Compila un componente sintético con `@include config-pagina` y comprueba:
  - el mapeo `$cfg-*` → `--ds-*`;
  - el claro idéntico frente a la referencia fija `tests/theme/fixtures/config-pagina-claro-4ac9a459.css` (funciones de `comparar-claro.js`);
  - en oscuro: ningún fondo `#fff` ni casi blanco fuera de lo pendiente, cada texto ≥ 4,5:1 sobre su fondo o sobre las 6 superficies donde puede caer, los bordes de controles e indicadores ≥ 3:1 (los 2 pendientes de Daniel, nombrados) y el acento de relleno separado del de texto;
  - el escenario «Ocasiones en oscuro» sobre Ocasiones, Géneros y Tipos de cliente compilados;
  - que la base no tiene blancos literales, gradientes, primarios prohibidos ni clases con «p-», y que `.p-tabview-title` lleva `inherit`;
  - en los consumidores: ninguno aplica funciones de color de Sass, aritmética ni condiciones a `$cfg-*` ni a sus alias, y todos compilan sin dejar funciones CSS inválidas sobre tokens;
  - la compuerta de 4.1.4: las reglas con fondo claro literal y texto de token no suben de su techo por archivo.

## Auditoría en navegador (`tests/theme/auditoria-tema.js`)

- `playwright-core` y `axe-core` se instalan fuera del repo, así que no se suman dependencias. Sirve `dist/cuba` con la API simulada e intercepta `POST /v1/users/edit`: nunca escribe en producción.
- Mide los criterios 1, 2, 3, 5 y 6 de la propuesta a 1440 y 390 px, y compara las capturas en claro con la línea base de la tarea 0.2.
- **Destello al recargar.** Recarga una ruta del marco con la sesión en oscuro, con el chunk de la ruta demorado 2 s, y comprueba que `body.dark-only` ya está mientras el chunk no llega. La misma recarga en `/terms-conditions` no tiene la clase. Contra el build actual, el primer caso pasa y el segundo falla.
- **Sistema operativo.** Con `emulateMedia({ colorScheme: 'dark' })` y la app en claro, la barra inferior, los filtros y el chat quedan claros; al revés, quedan oscuros.
- **F1** (sección `f1`, bloque TEMA-B02), en las cuatro pantallas de la línea base a 1440 px. Contra el build de F0 los tres chequeos fallan; pasan al cerrar 3.4 y 3.7.
  - `f1RellenosPrimarios`: en oscuro, `.btn-primary`, `.badge.bg-primary` y el botón primario de PrimeNG (`.p-button` sin severidad ni variante) tienen fondo `rgb(95, 63, 224)` y texto blanco. Si la pantalla no trae ninguno de un grupo, se mide en un fixture con las clases reales dentro del marco, y el reporte dice el origen.
  - `f1TamanosPrimeNG`: el `font-size` y el `padding` de `.p-button`, `.p-inputtext` y los `th` y `td` de `p-table` son iguales en los dos temas, en el primer elemento real y en el fixture.
  - `f1SinAzulHeredado`: ningún color computado dentro de `app-content` (con `::before` y `::after`) es de la familia del azul, también con alfa. Lista hasta 15 hallazgos.
- **Terceros, tarea 3.8** (sección `terceros`). Cada uno se abre en los dos temas y se captura (`tercero-<nombre>-<tema>-1440.png`). Se miden axe `color-contrast` y los fondos `#fff` dentro del tercero. Lo que falle se anota para F3, sin arreglarlo.
  - **Criterio «ninguno empeora».** Con `--base-terceros <carpeta>` (si falta, usa `--base`), cada tercero compara sus conteos de axe y de fondos `#fff`, tema por tema, con el `reporte.json` de esa carpeta: `ok` es «no subió ninguno». Sin base comparable, `ok` queda sin medir (`null`). La comparación de píxeles (`capturaBase`) es solo de apoyo, porque en oscuro cambia siempre que F1 cambia colores. Se anota también `sinViolacionesEnOscuro`, el valor absoluto.
  - **Base de terceros.** La línea base 0.2 no tiene capturas `tercero-*`. El orquestador corre `--solo terceros` sobre el build de F0, **antes de cerrar 3.4–3.7**, y guarda la carpeta en un lugar durable (no en `/tmp` ni en el scratchpad, que se borran al reiniciar). En la 3.8 la pasa como `--base-terceros`.
  - **Gráficos** de `/welcome` y del dashboard clásico. Al 2026-10-21, ApexCharts no aparece en ninguna plantilla: los gráficos son de ECharts, y el reporte dice cuál apareció.
  - **ng-select** en `/tiempoentrega/create`, con el desplegable abierto.
  - **SweetAlert2 y driver.js** en Ocasiones. Se abren con la librería del bundle (su módulo de webpack ya cargado): un aviso y un paso del tour, sin llamar a la API. En el build de producción driver.js queda concatenado dentro del módulo de `TourService`, que no exporta `driver`, así que se usa `TourService.highlightElement`: el tour real de la app, con su `popoverClass`, sin marcar tours como vistos. Si no se encuentra, se usa el marcado real (overlay, elemento resaltado y popover con `driverjs-theme katuq-tour`) con el CSS de la app. El reporte dice el origen (`libreria`, `tourService` o `fixture`) y, en el último caso, el motivo.
  - **Editor de texto rico** en `/productos/crearProductos`. Se miden Quill y CKEditor, porque Quill solo trae su CSS y el editor real es CKEditor.
  - **Agenda** (`/agenda`, con `serviceAgenda` prendida en la sesión simulada). FullCalendar no está instalado: la agenda es propia.
  - **Pendiente de confirmar.** `design.md`, `proposal.md` y el «Qué» de la 3.8 nombran ApexCharts, Quill y FullCalendar. Medir ECharts y CKEditor en su lugar es un cambio de alcance que la aprobación en bloque de las preguntas 1-8 no cubre: lo confirma Daniel antes de cerrar la 3.8. Mientras tanto, la auditoría mide las seis librerías si aparecen.
- **Barrido de todas las páginas** (`--todas`, tarea 4.1 y cola de «todas las páginas»). `tests/theme/rutas-marco.js` enumera las pantallas del marco desde la configuración real de rutas (`cargarRutasApp`). Lee los `loadChildren` y los `loadComponent` sin build y descarta con `isShellUrl` lo que en la app cae fuera del marco. Para cada pantalla sigue los `styleUrls` del componente, los parciales locales que importan (`@use`/`@import`) y los contenedores que la envuelven (como el shell de NPS).
  - **Cifras al 2026-10-21.** 164 rutas de pantalla, 24 de ellas con `:param`, y 119 rutas que usan `cfg-*` (18 con `:param`). Son rutas, no archivos. En archivos: 118 hojas incluyen `config-pagina` (las «120» de `grep` cuentan también la base y un comentario de `_nps.scss`). El barrido abre 107: 98 por rutas sin `:param` y 9 solo por rutas con `:param`. Las 11 restantes no son pantalla de ninguna ruta, porque son hijos o diálogos: borradores de venta, horario de entrega y su lista, crear rol, especificaciones del producto, atributos de categoría, prospectos, líneas de mensajería, guía MCP, medidor de WhatsApp y citas del video-agente.
  - Cada pantalla se abre en oscuro a 1440 px (y a 390 con `--movil`), también las de `:param`, con un valor de muestra. `--sin-parametros` las omite y el reporte lo dice. Va con la API simulada y `POST /v1/users/edit` interceptado.
  - **Banderas.** Solo se prenden las que piden los guards de ruta (`serviceAgenda` y `pickingAlistamiento`, leídas de los `*.guard.ts`), y solo en ese navegador. Así cada pantalla se mide en la variante que ven hoy los comercios, con las banderas apagadas (D-505). `--banderas todas` prende el catálogo entero para medir también la variante con las funciones nuevas.
  - **Qué mide.** axe `color-contrast` (criterio 2). Los fondos `#fff` de paneles, tarjetas, filas, diálogos y pestañas (criterio 3, con un selector más amplio que el de la línea base). Los fondos casi blancos de esos mismos paneles (luminancia ≥ 0,8, como `$cfg-tint`, `$cfg-chip-bg`, `#fafafa` y `#f8f9fa`). Los controles cuyo borde o fondo no se separa 3:1 del fondo de alrededor (WCAG 1.4.11, que axe no mide). También el scroll horizontal y el azul heredado. El indicador de foco no se mide aquí: lo cubre `theme-tokens.test.js` con los tokens contra cada superficie.
  - `reporte.json` ordena las pantallas por violaciones: axe, más fondos `#fff`, más casi blancos, más controles sin contraste, más 1 si hay scroll. Cada una lleva su módulo, componente, SCSS, hojas con `config-pagina`, si usa `cfg-*` y su captura. Las que un guard desvió o quedaron fuera del marco van al final, como «sin medir».
  - El reporte también trae el resumen por módulo, que ordena los lotes de la cola, y `coberturaCfg`: las hojas con `config-pagina` que el barrido abre, las que solo abre con `:param` y las que no son pantalla de ninguna ruta.
  - **Revisión manual de F2a.** Lista explícita de Ventas, POS, Formas de pago, Despachos, Inventarios, Bodegas y Ocasiones, cada una con sus rutas. Se suman las hojas de `coberturaCfg.sinRuta`, que el barrido no abre y se revisan a mano.
  - Junto con esa revisión manual, es la prueba de los criterios 2 y 3 de F2a. El criterio 4 sigue con `comparar-claro.js` y las capturas en claro.
- **Uso.** Necesita `dist/cuba` (lo compila el orquestador) y las dependencias fuera del repo. No escribe en `back.katuq.com` ni en Firestore.
  - Fases y terceros: `node tests/theme/auditoria-tema.js --deps <carpeta> --dist dist/cuba --salida <carpeta>/auditoria-<fecha> [--base <línea base 0.2>] [--base-terceros <terceros sobre F0>] [--solo f0,pantallas,f1,terceros]`.
  - Base de terceros (una vez, sobre el build de F0): `… --solo terceros --salida <carpeta durable>/terceros-base-f0`.
  - Barrido: `node tests/theme/auditoria-tema.js --deps <carpeta> --dist dist/cuba --salida <carpeta>/todas-<fecha> --todas [--movil] [--sin-parametros] [--banderas todas]`. Tarda unos 5 s por pantalla y ancho: 164 pantallas a 1440 px.
  - Solo la lista de rutas, sin navegador: `node tests/theme/rutas-marco.js`.
- **Pruebas sin navegador** (en `test:theme`):
  - `rutas-marco.test.js`: la enumeración sobre una configuración simulada y sobre la real. En la real, sin errores y sin descartes fuera del comodín conocido, con `loadComponent`, parciales importados y contenedores. También la cobertura de las hojas con `config-pagina`, las banderas de los guards y la lista F2a con rutas reales.
  - `auditoria-puras.test.js`: `node --check` de los scripts, rellenos, tamaños, azul heredado, grupos F2a, colores (casi blanco y contraste de controles, también como se inyectan en el navegador), violaciones, orden del reporte, cobertura y comparación de terceros con la base.

## Deuda medida de `var(--primary-color)` (tarea 3.9)

`tests/theme/deuda-primary.js` es estático, sin navegador: `node tests/theme/deuda-primary.js [--json]`. Cuenta por archivo de `src/` las declaraciones `background` y `background-color` con `var(--primary-color)`, también con respaldo. No cuenta comentarios ni `--primary-color-rgb`.

- El 2026-10-21 da **42 rellenos** (33 `background` y 9 `background-color`) en 16 archivos.
- **Diferencia con `design-f1.md` §2** (43 en 17, 31/12). Ese conteo se hizo con otro método. Con este script, el commit del diseño (bf468499) da 45 en 18 (33/12). Después la deuda bajó por cambios de diseño, no por la forma de contar:
  - D-516 (df58cd6d) quitó los rellenos de `dropshipping/crear-proveedor` y `prospect-manager`, y quedó en 43 en 16;
  - D-519 (92519c4b) quitó uno de `crear-ventas`, y quedó en 42.
  El comentario de `onboarding-wizard` llegó con D-516 y no cuenta. La lista de componentes de §2 todavía nombra dropshipping y prospectos, que ya no tienen rellenos.
- `conteos.test.js` congela ese total como trinquete. Si sube, falla. Si baja, también falla, hasta que se baje `TECHO_DEUDA_PRIMARY` en el mismo commit. Así lo migrado no deja hueco para regresiones.

## Cierre de cada fase

- `npm run build:prod` sin errores, revisando después el diff de los dos `environment`.
- `npm run test:theme` y los conteos en verde.
- Auditoría y revisión en el navegador, a 1440 y 390 px en los dos temas, sin scroll horizontal ni texto invisible.
- Guard de alcance por commit (`design.md`, «Contratos»).
- Entrada en la bitácora de `CONTRACT.md` con el reporte de axe y las capturas.

## Observabilidad

No hay telemetría nueva ni `console.log`, y el servicio no registra datos del usuario. Si falla el guardado, avisa el interceptor; los 5xx ya los captura Sentry.
