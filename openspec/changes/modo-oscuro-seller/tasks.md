# Tareas: modo oscuro del Seller (D-502, ticket 1180)

> Reglas para todas las tareas:
>
> - Leer cada archivo antes de editarlo y hacer `git pull --rebase` al empezar.
> - Cerrar cada tarea de código con el build sin errores, como lo pide `openspec/config.yaml`.
> - Cada tarea sale en su propio commit y pasa el guard de alcance por commit (`design.md`, «Contratos»).
> - **Sensible**: solo `.scss` (salvo que diga otra cosa), diff aprobado por Daniel antes de aplicarse y una a la vez. **Nunca lleva `[P]`.**
> - `[P]`: se puede hacer en paralelo porque no comparte archivos con otra `[P]`.
> - Ninguna prueba ni auditoría escribe en Firestore ni llama a `back.katuq.com` con escrituras: `POST /v1/users/edit` siempre va interceptado.

## 0. Aprobación y línea base

- [x] **0.1 Aprobar los artefactos y los valores por defecto.** Aprobados en bloque por Daniel el 2026-10-18 (`CONTRACT.md`, «D-495 a D-503»), con los 13 valores por defecto tal como están.
  - Qué: Daniel aprueba `design.md`, `design-f1.md`, `design-pruebas.md`, el delta `specs/design-system/spec.md` (EARS de F0 y F1) y este `tasks.md`. Además responde los 13 valores por defecto (`design.md`).
  - Criterio: respuestas anotadas en `CONTRACT.md`, bajo D-502. El delta queda aprobado antes de cualquier código (Art. I). Si cambia un valor por defecto, primero se ajustan el delta y el diseño.
  - Dependencias: ninguna. Sin 0.1 no se implementa nada.
- [x] **0.2 Tomar la línea base visual.** Hecha el 2026-10-18 con `auditoria-tema.js` sobre el build 2026.10.17.12 (commit 6efb605c): `tmp/d502-linea-base-2026-10-18/` (fuera de git). Tiene 19 capturas, el `json` de axe de cada pantalla a 1440 px y `reporte.json`. El login después de cerrar sesión en oscuro está solo a 1440 px.
  - **2026-10-21: esa línea base ya no sirve para comparar el claro.** D-516, D-518 y D-519 rediseñaron unas 90 pantallas más con la base `cfg-*` después del 18-oct. La línea base nueva la toma el orquestador con `auditoria-tema.js` sobre el build de la punta de `feature/tickets-web`, fuera de git; su ruta se anota aquí cuando exista. Mientras tanto, el «claro idéntico» de cada bloque se revisa sin build con `tests/theme/comparar-claro.js` (ver 3.2).
  - Qué: capturas en claro y oscuro, a 1440 y 390 px, del marco, Ocasiones, Bodegas, Todos los pedidos, Inicio y el login después de cerrar sesión en oscuro, más el axe en claro de esas pantallas.
  - Criterio: carpeta de evidencia fechada con capturas y el `json` de axe. Es la referencia de «claro idéntico» y de «ninguna violación nueva».
  - Dependencias: 0.1.

## 1. Pruebas primero (`design-pruebas.md`)

- [x] **1.1 [P] `tests/theme/theme-mode.test.js`.** Corre contra la configuración real de rutas; incluye un caso de `SignOut()`. Estuvo en rojo (15 de 15) antes del servicio. El caso de `SignOut()` va como `todo` («tarea 2.5») mientras el diff de 2.5 no esté aprobado y aplicado; al aplicarlo se le quita el `todo`. Con el patch de 2.5 puesto en una copia aparte pasa (16 de 16).
  - Qué: los seis grupos de casos, incluidos el arranque provisional, `isShellUrl`, `NavigationCancel` y la copia vieja del `user`.
  - Criterio: falla porque el servicio todavía no existe.
  - Dependencias: 0.1.
- [x] **1.2 [P] `tests/theme/users-edit-contract.test.js`.** El payload pasó desde el inicio; el 403 y el 5xx estuvieron en rojo hasta 2.4.
  - Qué: payload exacto `{ identificacion, tema }`. Ante un 403 de rol o un 5xx, `tema` queda en el navegador, la clase no se revierte y no se llama `SignOut()`.
  - Criterio: el payload pasa hoy. El rechazo falla hoy y pasa después de 2.4.
  - Dependencias: 0.1.
- [x] **1.3 [P] `tests/theme/user-writers.test.js`.** Estuvo en rojo (idioma y prompt) hasta 2.6. Incluye también que una respuesta que llega después de `SignOut()` no revive el `user` (estuvo en rojo en `edit-profile`).
  - Qué: guardar el idioma (`languages`) o el prompt de KAI (`edit-profile`) no pisa un `tema` cambiado después de montar el componente.
  - Criterio: falla hoy y pasa después de 2.6.
  - Dependencias: 0.1.
- [x] **1.4 [P] `tests/theme/conteos.test.js`.** La segunda parte va marcada como `todo` («F1, tarea 3.4»): se reporta y no rompe `test:theme`. En 3.4 se le quita el `todo`.
  - Qué: gradientes y primarios prohibidos sin subir, y cero de los seis patrones de la familia del azul en `dark-mode.scss` (`design-pruebas.md`).
  - Criterio: la primera parte pasa hoy; la segunda falla hasta 3.4.
  - Dependencias: 0.1.
- [x] **1.5 Auditoría `tests/theme/auditoria-tema.js`.** Contra el build 2026.10.17.12 reprodujo los cuatro fallos y pasó el destello. Uso: `node tests/theme/auditoria-tema.js --deps <carpeta con playwright-core@1.49.1 y axe-core> --dist dist/cuba --salida <carpeta> --base tmp/d502-linea-base-2026-10-18`. Con la hora fija, dos corridas del mismo build dan 0,000 % de píxeles distintos. Después de la revisión se sumaron dos chequeos, y contra el mismo build los dos fallan como se espera, sin mover la comparación en claro. `chatSistemaOscuroAppClara` y `chatSistemaClaroAppOscura` revisan el chat de `/chat` y `general-chat` (2.11): en el build viejo los dos siguen al sistema. `tarea25ResetEnSignOut` (2.5) mira si la clase seguía puesta cuando la URL pasó a `/login`. Los filtros no se miden porque su bloque estaba vacío.
  - Qué: lo de «Auditoría en navegador» en `design-pruebas.md`.
  - Criterio: contra el build actual reproduce los fallos de la propuesta: `dark-only` sigue en el login después de `SignOut()`, aparece en `/terms-conditions` recargado con sesión oscura, la barra inferior sigue al sistema operativo y hay fondos `#fff` en oscuro.
  - Dependencias: 0.2.
- [x] **1.6 Script `test:theme` en `package.json`.** En Windows: 28 pruebas, 26 pasan y quedan 2 `todo` (la de F1 y el `SignOut()` de 2.5).
  - Qué: la línea de `design-pruebas.md`, con los archivos uno por uno (un glob no corre en Windows con Node 20).
  - Criterio: `npm run test:theme` corre 1.1 a 1.4 en el equipo de desarrollo (Windows) y falla solo donde se espera.
  - Dependencias: 1.1 a 1.4.

## 2. Fase 0: un solo dueño del tema

> **Cierre de la verificación (2026-10-18):** Daniel aprobó los diffs de 2.5, 2.9 y 2.10 y quedaron aplicados. Build de producción sin errores. `npm run test:theme`: 28 pruebas, 27 pasan y 1 `todo` (F1, tarea 3.4). La auditoría sobre el build nuevo da OK en `criterio1CerrarSesion`, `tarea25ResetEnSignOut`, `publicaConSesionOscura`, `destelloAlRecargar`, los dos chequeos de la barra, los dos del chat y `criterio6SinScrollHorizontal`. Fallan dos, y ninguno es de F0: `criterio3SinFondosBlancosEnOscuro` (2 fondos en Ocasiones y en Bodegas; es de F2a, tarea 4.1) y `comparacionClaro` (el login base tenía el aviso «Sin conexión a internet» y en Ocasiones solo cambia el botón «Opinar» del NPS, D-490). Las notas de estado de cada tarea quedan como estaban al implementarse.

- [x] **2.1 `app-routing.module.ts`: `data: { shell: true }` en las cuatro rutas con `ContentComponent`.** Código aplicado y `tsc` sin errores. Falta el build (`npm run build`, lo corre el orquestador): `tsc` no revisa plantillas AOT ni SCSS.
  - Criterio: build sin errores. Rutas, guards y redirecciones siguen iguales.
  - Dependencias: 0.1.
- [x] **2.2 Crear `src/app/shared/services/theme-mode.service.ts`.** Código aplicado, 1.1 en verde (salvo el `todo` de 2.5) y `tsc` sin errores. Falta el build (lo corre el orquestador).
  - Qué: `isShellUrl`, decisión provisional en el constructor, confirmación en `NavigationEnd`, preferencia en memoria por identidad, `apply`, `setPreference`, `reset` e `isDark$`. Sin `console.log`.
  - Criterio: 1.1 en verde y `npm run build` sin errores.
  - Dependencias: 1.1 y 2.1.
- [x] **2.3 `app.component.ts`.** Código aplicado; falta correr la auditoría sobre el build nuevo.
  - Qué: inyectar el servicio en el constructor y quitar el bloque `:264-277`.
  - Criterio: en la auditoría, al recargar una ruta del marco en oscuro con el chunk demorado, `body.dark-only` ya está mientras el chunk no llega. En `/terms-conditions` con la misma sesión, no está.
  - Dependencias: 2.2 y 1.5.
- [x] **2.4 `header.component.ts`.** Código aplicado y 1.2 en verde. `aria-pressed` ya estaba en la plantilla y sigue a `dark`; `tsc` sin errores. Falta el build (lo corre el orquestador).
  - Qué: `dark` sale de `isDark$`. `layoutToggle()` llama `setPreference` y después `updateUser` como hoy, sin revertir si falla. Se quitan las escrituras al DOM, la del `user` completo y el bloque comentado `:40-49`.
  - Criterio: 1.2 en verde (payload y rechazo). El botón alterna y `aria-pressed` acompaña. Build sin errores.
  - Dependencias: 2.2 y 1.2.
- [x] **2.5 `auth.service.ts`: `reset()` en `SignOut()`.** **Sensible** (autenticación): una sola línea, con diff aprobado. Diff preparado y **sin aplicar** (se sacó del árbol para que ningún build ni commit lo arrastre): el import y la inyección de `ThemeModeService`, y `this.themeMode.reset()` justo antes de `navigateByUrl('/login')`. Sin ciclo de DI: `ThemeModeService` solo depende de `Router`, `LayoutService` y `NgpThemeService`. Espera el visto bueno de Daniel; después va en su propio commit con el guard de alcance, se le quita el `todo` al caso `SignOut()` de 1.1 y falta la auditoría sobre el build nuevo. Para cerrar 2.5, la auditoría debe dar OK en `tarea25ResetEnSignOut`. `criterio1CerrarSesion` no sirve, porque ya pasa sin `reset()`: el `NavigationEnd` hacia `/login` encuentra la sesión borrada y aplica el claro. La sonda se probó con el build 2026.10.17.12: falla tal cual y pasa con una copia que quita la clase antes de navegar.
  - Criterio: criterio 1 de la propuesta en la auditoría. Después de cerrar sesión no quedan la clase, el `style` de fondo ni el bundle oscuro.
  - Dependencias: 2.2.
- [x] **2.6 [P] `languages.component.ts:72` y `edit-profile.component.ts:162`: leer, modificar y escribir.** Código aplicado, 1.3 en verde y `tsc` sin errores. Las dos ramas cortan igual si la sesión terminó mientras se guardaba (no reviven el `user` con la copia vieja ni su token). Falta el build (lo corre el orquestador).
  - Qué: releer el `user` justo antes de guardar y cambiar solo `lang` o `kaiPersonalitityUserPrompt`. No cambia nada más.
  - Criterio: 1.3 en verde; build sin errores.
  - Dependencias: 1.3.
- [x] **2.7 [P] `src/index.html:44`: apuntar a `lara-light-blue.css`.** Código aplicado; falta revisar la red y las capturas sobre el build nuevo.
  - Criterio: en la pestaña de red, el primer CSS de tema responde 200 con `text/css`, y las capturas en claro son iguales a las de 0.2.
  - Dependencias: 0.2.
- [x] **2.8 [P] Barra inferior y filtros.** Código aplicado y conteos sin subir; falta la auditoría sobre el build nuevo.
  - Qué: los tres bloques de `bottom-navigation.component.scss` pasan a `:host-context(body.dark-only)`, y se borra el bloque vacío de `shared-filters.component.scss`.
  - Criterio: con `emulateMedia({ colorScheme: 'dark' })` y la app en claro, la barra queda clara; al revés, queda oscura. Los conteos de 1.4 no suben.
  - Dependencias: 2.2.
- [x] **2.9 `tracking-details-modal.component.scss` (despachos).** **Sensible:** solo `.scss`, con diff aprobado. Diff preparado y sin aplicar: se borra el bloque `prefers-color-scheme` vacío de la línea 1723. Espera la aprobación de Daniel.
  - Criterio: el modal sigue al botón y no al sistema operativo. Los gradientes no pasan de 5.
  - Dependencias: 2.2.
- [x] **2.10 `crear-formas-pago.component.scss` (POS).** **Sensible:** solo `.scss`, con diff aprobado. Va después de 2.9, nunca a la vez. Diff preparado y sin aplicar: `@media (prefers-color-scheme: dark)` pasa a `:host-context(body.dark-only)` (línea 439). Espera la aprobación de Daniel.
  - Criterio: el formulario sigue al botón. Los primarios prohibidos no pasan de 1.
  - Dependencias: 2.9.
- [x] **2.11 [P] Chat.** Código aplicado. `general-chat` no tiene encapsulado, así que usa `body.dark-only` y `:where(body:not(.dark-only))`, sin `:host-context`. Falta pasar la auditoría sobre el build nuevo (`chatSistemaOscuroAppClara` y `chatSistemaClaroAppOscura` en OK) y revisarla en el navegador.
  - Qué: `general-chat.component.scss` sigue a `body.dark-only`, y `chat.component.ts` lee `isDark$` en vez de `matchMedia`.
  - Criterio: con el sistema en oscuro y la app en claro, el chat se ve claro. Build sin errores.
  - Dependencias: 2.2.
- [x] **2.12 Cierre de F0.** F0 publicada en el front 2026.10.18.12 (commit d82947a1, ya en `feature/tickets-web`). La entrada del contrato ya existe en la sección «D-495 a D-503» de `CONTRACT.md` («D-502 modo oscuro, F0: PUBLICADA»). `npm run test:theme`: 28 pruebas, 27 pasan y 1 `todo` (F1, tarea 3.4). El ticket 1180 tiene su comentario de avance y sigue abierto.
  - Qué: lo de «Cierre de cada fase» en `design-pruebas.md`, más la entrada «D-502 F0» en la bitácora de `CONTRACT.md`.
  - Criterio: los criterios 1 y 6 de la propuesta se cumplen en el marco, y los requisitos del delta para F0 se verifican en la auditoría.
  - Publicar solo con la orden de Daniel y respetando el candado: `git pull`, build desde la punta y deploy enseguida.
  - Dependencias: de 2.3 a 2.11.

## 3. Fase 1: tokens (`design-f1.md`)

- [x] **3.1 `tests/theme/theme-tokens.test.js` y su archivo en la línea `test:theme`.** Commit afded547. Antes del parcial: 7 pruebas, 1 pasa (la referencia del cálculo WCAG) y 6 fallan con «falta src/app/shared/styles/_theme-tokens.scss». Con `sass` 1.54.4 del front comprueba: (a) los 35 `--ds-*` de `design-f1.md` §1 en `:root` y `body.dark-only` con su valor, el claro igual a los `$cfg-*` de `_config-pagina.scss` y al marco (`--ktq-bg`, `--ktq-shadow-card`) y los `-rgb` iguales a su color; (b) en oscuro, `ink`, `ink-2`, `body`, `muted`, `accent-ink` y los cuatro semánticos ≥ 4,5:1, y `control-border` y `focus` ≥ 3:1, contra las 8 superficies; (c) `on-accent` ≥ 4,5:1 sobre `accent` y `accent-hover` en los dos juegos, y cada semántico ≥ 4,5:1 sobre su `-soft` en oscuro (el claro de los pares semánticos es del cambio aparte, 4.6).
  - Qué: compila el parcial con `sass` y mide cada token contra **cada** superficie oscura.
  - Criterio: falla porque el parcial todavía no existe.
  - Dependencias: 2.12.
- [ ] **3.2 Crear `src/app/shared/styles/_theme-tokens.scss` e importarlo en `src/styles.scss`, antes de `dark-mode.scss`.** **Parcial (2026-10-21, bloque TEMA-B01, commit afded547):** el parcial está creado con los valores de `design-f1.md` §1 e importado justo antes de `dark-mode.scss`; las bases no lo importan y en F1 no tiene consumidores. 3.1 en verde (7 de 7) y `test:theme` con 46 pruebas: 45 pasan y 1 `todo` (3.4). Claro sin build: `comparar-claro.js --base 3e330d83 src/styles.scss` da «claro idéntico» (33006 declaraciones). **Pendiente para cerrarla:** el build sin errores y las capturas en claro contra la línea base nueva de 0.2; los corre el orquestador. Hasta entonces, 3.3 a 3.9 pueden avanzar sobre el parcial, pero 3.2 no cuenta como cerrada para 3.9 ni para el contrato.
  - **Herramienta para todos los bloques: `tests/theme/comparar-claro.js`.** Compila con `sass` un `.scss` en el commit base (extrae las hojas de `src/` con `git archive` a `<--tmp>/comparar-claro/<sha>`, con rename atómico) y en el árbol actual, con `loadPaths` `[src, node_modules]` y el prefijo `~`. `--tmp` es obligatorio y apunta al scratchpad de la sesión. Normaliza: `var(--ds-X)` pasa a su valor claro de `_theme-tokens.scss` **de cada lado** (la base con los tokens de la base y el árbol actual con los suyos, así que cambiar el valor claro de un token se detecta), descarta los selectores `body.dark-only`, `.dark-only` y `:host-context(body.dark-only)` y las definiciones `--ds-*` de `:root`, y unifica hex, `white`/`black`, `rgb()`, decimales y espacios. Sale con 1 si el claro cambió (lista lo que solo está en la base y lo que solo está en el árbol actual) y con 2 si hay error o si el archivo no produce ninguna declaración en ningún lado («SIN DATOS», nunca un falso «idéntico»). Uso: `flock <scratchpad>/pesado.lock node --max_old_space_size=6144 tests/theme/comparar-claro.js --base <commit> --tmp <scratchpad> <ruta.scss> [...]`. Compara el consumidor (la pantalla o `src/styles.scss`): un parcial que solo define mixins, como `_config-pagina.scss`, da «SIN DATOS». Sus funciones puras tienen prueba en `tests/theme/comparar-claro.test.js`, dentro de `test:theme`.
  - Criterio: 3.1 en verde; las capturas en claro siguen iguales a las de 0.2; build sin errores.
  - Dependencias: 3.1.
- [x] **3.3 `dark-mode.scss`: las variables de las líneas 5-75 apuntan a tokens.** Hecha el 2026-10-21 (bloque TEMA-B03). `--primary-color` y `--theme-default` van a `var(--ds-accent-ink)`; `--primary-dark-color` a `var(--ds-accent)`; `--primary-light-color`, `--light-shade-primary` y `--primary-70` a `rgba(var(--ds-accent-ink-rgb), α)` con el mismo α; `--rgb-primary` a `rgb(var(--ds-accent-ink-rgb))`. Secundario y terciario sin cambios (son del retiro). Lo comprueba `conteos.test.js` sobre el CSS compilado. Falta el build (lo corre el orquestador).
  - **Contradicción resuelta:** el único `#4A95C8` es `--primary-dark-color`. La tabla de `design-f1.md` §2 lo manda a `--ds-accent-hover` y 3.3 a `--ds-accent`; manda 3.3, que es la regla específica y tiene criterio propio.
  - **Deuda para F3 (Clientes):** `clientes.component.scss:764-765` usa `var(--primary-dark-color)` como texto y borde del botón «Cerrar» (`.modal-footer .btn-outline-secondary`) del modal de nota, y en oscuro gana a `dark-mode.scss`. Pasa de `#4A95C8` (4,51:1 sobre `#252830`) a `#5F3FE0` (2,30:1). Se corrige en la pantalla, con `var(--ds-accent-ink)`, igual que la deuda de `var(--primary-color)`.
  - Criterio: en oscuro, `--primary-color` devuelve el valor de `--ds-accent-ink` y `--primary-dark-color` el de `--ds-accent`.
  - Dependencias: 3.2.
- [ ] **3.4 `dark-mode.scss`: la familia del azul (169) pasa a tokens.** **Parcial (2026-10-21, bloque TEMA-B03):** el código está hecho y `test:theme` da 79 de 79, sin `todo`. Los seis patrones quedan en 0, los gradientes en 1 y los primarios prohibidos en 0, y `comparar-claro.js --base caa67cdd src/styles.scss` da «claro idéntico». **Pendiente para cerrarla:** el build sin errores y la auditoría sobre el build (`.btn-primary` y `.badge.bg-primary` con fondo `#5F3FE0` y texto blanco, y los botones de driver.js). Los corre el orquestador.
  - Reemplazos: 28 rellenos, 9 bordes de relleno, 71 de texto, ícono o borde, 47 `rgba` en 44 líneas, 10 hovers y 7 variables. Los 13 textos `#1a1d23` de los rellenos pasan a `--ds-on-accent`.
  - `!important` en `body.dark-only .btn.btn-primary:not(:disabled):not(.disabled)` y su `:hover`, (0,5,1) contra (0,1,0) de `_reset.scss`. **No cubre el deshabilitado**: así los grises propios de cada pantalla (`invoice-composer`, `_katuq-modal`: `.btn-primary[_ngcontent]:disabled`, (0,3,0)) siguen ganando en oscuro. El deshabilitado genérico va en `body.dark-only :where(.btn-primary:disabled, .btn-primary.disabled)`, (0,1,1).
  - driver.js: `body.dark-only .driver-popover .driver-popover-footer button.driver-popover-next-btn` y `-done-btn`, sin tocar `styles.scss`.
  - `p-inputSwitch` encendido: el relleno va en `.p-inputswitch-slider`, que cubre todo el control (`position: absolute; inset: 0`); antes quedaba `#1a1d23` encima del relleno.
  - **Desvío de la tabla de §2 (criterio del bloque):** en los rellenos con texto (botones, `.btn-outline-primary:hover`, paginación, list-group, splitbutton y el número de steps) el borde va en `--ds-accent`, porque es parte del relleno y en `accent-ink` dejaría un aro lila. En los controles marcados (checkbox ×3, radio, inputswitch, manija del slider e indicador del carrusel) el borde va en `--ds-accent-ink`, para que el contorno del control se separe del fondo.
  - **Para decidir con Daniel (lo mide la auditoría de TEMA-B02):** los rellenos sin texto que la tabla manda a `--ds-accent` quedan con poco contraste contra su carril. `.progress-bar` da 2,03:1 sobre `#2d3139` (hoy 5,83:1), y el rango del slider da 1,60:1 sobre `#3d4149`. `.p-progressbar-value`, el indicador activo del carrusel y el marcador del timeline están en el mismo caso. La spec pide 3:1 solo en bordes de controles y foco, pero es una pérdida frente a hoy. Si Daniel lo decide, esos rellenos pasan a `--ds-accent-ink`.
  - **Efecto anotado:** según la tabla, el hover de los enlaces (`#8AC5F8`) y su color normal quedan los dos en `--ds-accent-ink`, así que en oscuro el enlace ya no cambia de color al pasar el mouse. Si hace falta, se resuelve aparte (por ejemplo, con subrayado).
  - Qué: reemplazo por rol, bloque por bloque: texto y borde, fondo translúcido, relleno opaco con su texto en `--ds-on-accent`, y hover. Lleva `!important` donde hoy gana un `!important` global (`_reset.scss:560`). Incluye los botones de driver.js.
  - Criterio: 1.4 en verde; en la auditoría, `.btn-primary` y `.badge.bg-primary` quedan en oscuro con fondo `#5F3FE0` y texto blanco; build sin errores.
  - Dependencias: 3.3.
- [ ] **3.5 `dark-mode.scss`: los grises pasan a tokens.** Solo si se confirma el valor por defecto 3. **Parcial (2026-10-21, bloque TEMA-B04; valor por defecto 3 aprobado en bloque):** el código está hecho. Conteo antes del cambio (commit 0b0476ed): `#1a1d23` 21 (36 al diseñar; TEMA-B03 pasó 15 a `--ds-on-accent`), `#1e2128` 11, `#252830` 57, `#2d3139` 120, `#3d4149` 219, `#f0f0f0` 40 y `#e0e0e0` 184; ahora los siete quedan en 0, en la fuente y en el CSS compilado. Reemplazo según la tabla de `design-f1.md` §2, incluidas las variables de las líneas 5-75. `test:theme` da 83 de 83, los conteos no suben (gradientes 1, primarios 0) y `comparar-claro.js --base 0b0476ed src/styles.scss` da «claro idéntico». **Pendiente para cerrarla:** el build, el axe sin `color-contrast` en el marco y en Inicio, y las capturas en oscuro revisadas por Daniel; los corre el orquestador.
  - Variantes con alfa, una por una: `rgba(26, 29, 35, 0.9)` de `.loader` pasa a `rgba(var(--ds-canvas-rgb), 0.9)`. Quedan literales, con nota en el archivo, porque su token no tiene `-rgb` y no se inventan tokens: `rgba(37, 40, 48, .9)` ×2 (`--light-background` y `--bs-emphasis-color-rgb`, `surface` a .9), `rgba(224, 224, 224, α)` ×6 (variables de gráficos y `--lighter-gray`, `ink-2` con alfa) y `#2d313980` ×1 (`--view-grid-bg`, `surface-2` a .5). `conteos.test.js` les pone techo. El brillo `#33363f` del shimmer de `.p-skeleton` no es de los siete grises y queda literal.
  - Pruebas nuevas en `conteos.test.js`: los siete en 0; techo de las variantes con alfa; y una comparación contra el CSS de 0b0476ed que exige que cada declaración que tenía un gris tenga ahora el token de su rol (si el bloque sigue existiendo, así el retiro de 4.5 no la rompe). Antes del cambio fallan las tres; una mutación (`--bs-border-color` a `surface-2`) también falla. La prueba de rol exige más de 600 declaraciones con grises en la base fija (no en lo de hoy) y se salta, con aviso, si el retiro (4.5) borra `dark-mode.scss` o si el clon no tiene 0b0476ed; un retiro parcial simulado (sin el tercer bloque) la deja en verde.
  - **Para Daniel antes de dar 3.5 por cerrada (revisión del corrector, 2026-10-21; medido, sin cambiar la tabla aprobada):**
    1. **El axe de 3.5 puede no quedar en verde solo con los siete grises.** Hay textos grises fuera de la tabla que siguen por debajo de 4,5:1 sobre las superficies nuevas: `.text-muted` (`#808080 !important`) da 4,41 sobre `surface` y 4,14 sobre `surface-2`, y `#606060` da entre 2,60 y 2,95 (antes 3,73 y 2,07; mejoran, pero no pasan). Si aparecen en el marco o en Inicio, el axe los marca. Opciones: pasarlos a `--ds-muted` (6,35 sobre `surface`; está en §1, pero no en la tabla de grises de §2) o dejar el criterio para F2/F3.
    2. **Bordes de controles.** `#3d4149` va a `line-strong` según la tabla, también en `.form-control`, `.form-select`, `.p-inputtext`, `.p-dropdown` y `--bs-border-color`. `line-strong` (`#3a3450`) es decorativa: 1,48 sobre `surface` y 1,39 sobre `surface-2` (antes 1,44). La spec pide 3:1 en bordes de controles en el marco y en Inicio, y existe `--ds-control-border` (`#7a7498`, 3,97). Separarlo sería un desvío de la tabla; queda para decidir (desvío en 3.5 o deuda de F2a).
    3. **Capas.** Juntar `#1e2128` y `#252830` en `surface` quita diferencias de fondo: la grilla y las tarjetas del POS, `.list-group-item.disabled` y los `input:disabled` quedan del mismo tono que su contenedor. Además, `canvas` frente a `surface` baja de 1,15 a 1,06 y `surface` frente a `surface-2` de 1,13 a 1,06. Mirarlo de forma explícita en las capturas en oscuro (Inicio, POS y formularios en tarjeta).
    4. **Grises vecinos que no están en la tabla y siguen literales** (paleta gris azulada vieja junto a tokens violeta): `#33363f` ×67 (hovers y foco de `input`/`select`, y el brillo de `.p-skeleton`), `#4d5159` ×30, `#22252d` ×6 (`--light-bg`, `--recent-box-bg`, `--light-datatable-odd`), `#43474f` ×2 y `rgba(37, 40, 48, .9)` en `--light-background` (lo usa `_card.scss`). Pasarlos (por ejemplo `#33363f` a `--ds-row-hover` y `#22252d` a `--ds-tile`) exige ampliar la tabla; si no, van al retiro (4.5).
  - Criterio: no quedan los siete grises; axe sin violaciones de `color-contrast` en oscuro en el marco y en Inicio; capturas en oscuro revisadas por Daniel.
  - Dependencias: 3.4.
- [ ] **3.6 [P] Sidebar, header y toasts: sus oscuros pasan a `var(--ds-*)` con el mismo valor.**
  - Archivos: `sidebar.component.scss:1434+`, el header oscuro de `styles.scss:654-661` y el bloque `body.dark-only` de `src/assets/scss/components/_avisos.scss` (línea 211 en adelante: toasts de ngx-toastr y `p-toast`; pregunta 3 del informe, aprobada en bloque el 2026-10-21). Su juego oscuro propio (`#262633`, `#ECEBF5`, `#b9b6cf`, `#34344a` y los íconos) pasa a `--ds-*`. Lo que no tiene token queda literal.
  - Criterio: las capturas del marco en oscuro quedan iguales antes y después, y los conteos no suben. Toasts: el claro no cambia (`comparar-claro.js` sobre `src/styles.scss` sin diferencias) y en oscuro cada texto da ≥ 4,5:1 sobre su fondo, medido en la auditoría.
  - Dependencias: 3.2.
- [ ] **3.7 [P] PrimeNG oscuro.**
  - Qué: lo del punto 4 de `design-f1.md` (parcial de tamaños, `theme-katuq-dark.scss`, `_primeng-dark.scss` con overrides explícitos, `angular.json`, constante del servicio y borrar el tema viejo). Si gana la alternativa del valor por defecto 8, solo se agrega `_primeng-dark.scss` al tema actual.
  - Criterio: `katuq-dark.css` en `dist/cuba`; botón primario de PrimeNG en `#5F3FE0` en oscuro y en `#8b5cf6` en claro (asimetría declarada); `font-size` y `padding` de `.p-button`, `.p-inputtext` y celdas de `p-table` iguales en los dos temas; claro sin cambios y 1.1 en verde.
  - Dependencias: 3.2.
- [ ] **3.8 Terceros en oscuro.**
  - Qué: captura de ApexCharts (Inicio), ng-select, SweetAlert2, driver.js, Quill y FullCalendar.
  - **Prueba lista (2026-10-21, bloque TEMA-B02), sin correr:** sección `terceros` de `auditoria-tema.js` (`design-pruebas.md`, «Auditoría en navegador»). La corre el orquestador sobre el build. Lo verificado en el código: ApexCharts no aparece en ninguna plantilla (los gráficos son de ECharts), FullCalendar no está instalado (la agenda es propia) y el editor de productos es CKEditor (Quill solo trae su CSS). La auditoría mide lo que haya y anota la librería que apareció. El criterio «ninguno empeora» compara los conteos de axe y de fondos `#fff` con una corrida de base (`--base-terceros`), no los píxeles. **Antes de cerrar 3.4–3.7**, el orquestador toma esa base con `--solo terceros` sobre el build de F0 y la guarda en una carpeta durable. **Pendiente de Daniel:** confirmar que la 3.8 revise ECharts y CKEditor en lugar de ApexCharts, Quill y FullCalendar; es un cambio de alcance que la aprobación en bloque no cubre.
  - Criterio: ninguno empeora frente a 0.2. Lo que esté mal queda anotado para F3, sin arreglarlo aquí.
  - Dependencias: de 3.4 a 3.7.
- [ ] **3.9 Cierre de F1.**
  - Qué: lo mismo que 2.12, más 3.1 en verde y la entrada «D-502 F1» en `CONTRACT.md`. Anotar la deuda medida de los rellenos con `var(--primary-color)` en componentes.
  - **Pruebas listas (2026-10-21, bloque TEMA-B02):** `tests/theme/deuda-primary.js` mide la deuda: 42 rellenos (33 `background` y 9 `background-color`) en 16 archivos. `conteos.test.js` la congela como trinquete: falla si sube, y también si baja sin bajar `TECHO_DEUDA_PRIMARY` en el mismo commit. Los chequeos `f1RellenosPrimarios`, `f1TamanosPrimeNG` y `f1SinAzulHeredado` de `auditoria-tema.js` (sección `f1`) se corren sobre el build de cierre.
  - Criterio: los criterios 5 (familia de 169) y 7 de la propuesta se cumplen, y el claro sigue idéntico.
  - Dependencias: de 3.2 a 3.8.

## 4. Fases siguientes

Cada una tiene su diseño corto, su delta, sus tareas y su aprobación antes de empezar.

- [ ] **4.1 F2a `_config-pagina.scss`.** **Sensible:** la base también pinta despachos, la lista de POS, formas de pago, borradores, carga de ventas y bodegas. Va con diff aprobado.
  - Pruebas primero: la auditoría de los criterios 2, 3 y 4 sobre las 38 pantallas y la revisión, una por una, de los 22 archivos que usan `$cfg-*`. Consume `--ds-chip-bg` y `--ds-shadow-*` de F1.
  - **Barrido listo (2026-10-21, bloque TEMA-B02), sin correr:** `auditoria-tema.js --todas` recorre en oscuro las 164 rutas de pantalla que `tests/theme/rutas-marco.js` enumera desde la configuración real, incluidas las 24 con `:param`. De las 118 hojas que incluyen `config-pagina`, el barrido abre 107; las 11 que no son pantalla de ninguna ruta (borradores de venta, horario de entrega y otros diálogos) salen nombradas en `coberturaCfg.sinRuta` para revisarlas a mano. Mide los criterios 2 y 3, los fondos casi blancos, los controles que no se separan 3:1 y el scroll, con solo las banderas de los guards prendidas. `reporte.json` sale ordenado por violaciones, con el módulo de cada ruta y la lista de revisión manual: Ventas, POS, Formas de pago, Despachos, Inventarios, Bodegas y Ocasiones. El criterio 4 sigue con `comparar-claro.js` y las capturas. La línea base del barrido se toma antes del diff de la base.
  - **Tamaño al 2026-10-21:** 120 pantallas con el mixin y 53 archivos con `$cfg-*` directo, más las piezas de 8bae2ba0 (`design-f1.md` §7). Un solo diff en la base y los consumidores por módulo (pregunta 1). El «claro idéntico» de cada diff se revisa con `tests/theme/comparar-claro.js`.
  - Dependencias: 3.9.
- [ ] **4.2 F2b `_katuq-builder.scss` y `sitios-lista`.** Coordinar con el trabajo de sitios.
  - Dependencias: 3.9.
- [ ] **4.3 F2c `_katuq-modal.scss`.** **Sensible:** widgets de pago de POS2, un widget por diff aprobado.
  - Dependencias: 3.9.
- [ ] **4.4 F3, una pantalla por cambio:** Todos los pedidos, crear venta / venta asistida, despachos, POS, inventario e Inicio. **Sensible** en ventas, POS, despachos e inventario: solo SCSS, capturas antes y después en los dos temas y diff aprobado. Cada pantalla pasa a `var(--ds-accent)` sus rellenos con `var(--primary-color)`.
  - Antes de empezar, el conteo en solo lectura de usuarios con `tema: true` (valor por defecto 5).
  - Dependencias: 3.9; despachos, también 4.1.
- [ ] **4.5 Retiro de los bloques ya migrados de `dark-mode.scss` y `themes/_dark.scss`.**
  - Dependencias: 4.4 de cada pantalla.
- [ ] **4.6 Escalar aparte**, cada uno con su propuesta o ticket: el contraste en claro (valor por defecto 6), el guardado de `tema` para todos los roles (backend privado), `_katuq-tokens.scss` (incluye igualar el botón PrimeNG claro) y el PrimeNG claro (`#3B82F6`).
- [ ] **4.7 Solo si Daniel rechaza el valor por defecto 7:** F2d para `publica` (10 pantallas), con la misma regla de F2. **No aplica:** el valor por defecto 7 quedó aprobado (las pantallas sin menú siguen siempre en claro).
- [ ] **4.8 Solo si Daniel pide el escudo C (valor por defecto 1).** **No aplica:** sin escudo C (pregunta 7, resuelta el 2026-10-21).
  - Qué: crearlo con dueño y fecha de retiro (Art. XII), y retirarlo en 4.1.
  - Criterio: en `CONTRACT.md` quedan el dueño, la fecha y la tarea de retiro.

## Preguntas del informe del 2026-10-21, resueltas

Daniel aprobó en bloque el 2026-10-21 la recomendación escrita de cada pregunta del informe del ticket 1180:

1. **Tamaño de F2a** (de 38 a 120 pantallas): un solo diff en la base `_config-pagina.scss`, con el barrido automático de las 120 pantallas como prueba. Los 53 archivos que usan `$cfg-*` directo van en subcambios por módulo; los de ventas, POS y despachos, con su diff aprobado aparte.
2. **F1 y D-516/D-519:** F1 sale en el mismo release que D-516 y D-519 o después, para que la línea base clara incluya las pantallas rediseñadas.
3. **Toasts de `_avisos.scss`:** entran en F1, dentro de la tarea 3.6 (agregado al write-set de `design-f1.md` §5).
4. **Cierre del ticket:** el 1180 sigue abierto hasta publicar F3 completa, con un comentario por cada fase publicada. El retiro (4.5) va en el mismo ticket; lo de 4.6 sale en tickets propios.
5. **«Todas las páginas»:** las pantallas que no están en F2 ni en F3 van como cola después de F3, con un barrido axe en oscuro de las rutas con marco, priorizado por cantidad de violaciones y publicado por lotes con su diff.
6. **Conteo de usuarios con `tema: true`:** lo corre quien tenga acceso, con un script de solo lectura que devuelve solo el total. No bloquea F1 ni F2; solo ordena F3.
7. **Escudo C:** no se pone (valor por defecto 1), así que 4.8 no aplica.
8. **Seguir al sistema operativo:** no (valor por defecto 4); se revisa después de F3.

Además, 4.7 no aplica porque se mantiene el valor por defecto 7.
