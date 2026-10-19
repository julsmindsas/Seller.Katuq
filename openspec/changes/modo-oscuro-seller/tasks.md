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
- [ ] **2.12 Cierre de F0.**
  - Qué: lo de «Cierre de cada fase» en `design-pruebas.md`, más la entrada «D-502 F0» en la bitácora de `CONTRACT.md`.
  - Criterio: los criterios 1 y 6 de la propuesta se cumplen en el marco, y los requisitos del delta para F0 se verifican en la auditoría.
  - Publicar solo con la orden de Daniel y respetando el candado: `git pull`, build desde la punta y deploy enseguida.
  - Dependencias: de 2.3 a 2.11.

## 3. Fase 1: tokens (`design-f1.md`)

- [ ] **3.1 `tests/theme/theme-tokens.test.js` y su archivo en la línea `test:theme`.**
  - Qué: compila el parcial con `sass` y mide cada token contra **cada** superficie oscura.
  - Criterio: falla porque el parcial todavía no existe.
  - Dependencias: 2.12.
- [ ] **3.2 Crear `src/app/shared/styles/_theme-tokens.scss` e importarlo en `src/styles.scss`, antes de `dark-mode.scss`.**
  - Criterio: 3.1 en verde; las capturas en claro siguen iguales a las de 0.2; build sin errores.
  - Dependencias: 3.1.
- [ ] **3.3 `dark-mode.scss`: las variables de las líneas 5-75 apuntan a tokens.**
  - Criterio: en oscuro, `--primary-color` devuelve el valor de `--ds-accent-ink` y `--primary-dark-color` el de `--ds-accent`.
  - Dependencias: 3.2.
- [ ] **3.4 `dark-mode.scss`: la familia del azul (169) pasa a tokens.**
  - Qué: reemplazo por rol, bloque por bloque: texto y borde, fondo translúcido, relleno opaco con su texto en `--ds-on-accent`, y hover. Lleva `!important` donde hoy gana un `!important` global (`_reset.scss:560`). Incluye los botones de driver.js.
  - Criterio: 1.4 en verde; en la auditoría, `.btn-primary` y `.badge.bg-primary` quedan en oscuro con fondo `#5F3FE0` y texto blanco; build sin errores.
  - Dependencias: 3.3.
- [ ] **3.5 `dark-mode.scss`: los grises pasan a tokens.** Solo si se confirma el valor por defecto 3.
  - Criterio: no quedan los siete grises; axe sin violaciones de `color-contrast` en oscuro en el marco y en Inicio; capturas en oscuro revisadas por Daniel.
  - Dependencias: 3.4.
- [ ] **3.6 [P] Sidebar y header: sus oscuros pasan a `var(--ds-*)` con el mismo valor.**
  - Archivos: `sidebar.component.scss:1434+` y el header oscuro de `styles.scss:654-661`. Lo que no tiene token queda literal.
  - Criterio: las capturas del marco en oscuro quedan iguales antes y después, y los conteos no suben.
  - Dependencias: 3.2.
- [ ] **3.7 [P] PrimeNG oscuro.**
  - Qué: lo del punto 4 de `design-f1.md` (parcial de tamaños, `theme-katuq-dark.scss`, `_primeng-dark.scss` con overrides explícitos, `angular.json`, constante del servicio y borrar el tema viejo). Si gana la alternativa del valor por defecto 8, solo se agrega `_primeng-dark.scss` al tema actual.
  - Criterio: `katuq-dark.css` en `dist/cuba`; botón primario de PrimeNG en `#5F3FE0` en oscuro y en `#8b5cf6` en claro (asimetría declarada); `font-size` y `padding` de `.p-button`, `.p-inputtext` y celdas de `p-table` iguales en los dos temas; claro sin cambios y 1.1 en verde.
  - Dependencias: 3.2.
- [ ] **3.8 Terceros en oscuro.**
  - Qué: captura de ApexCharts (Inicio), ng-select, SweetAlert2, driver.js, Quill y FullCalendar.
  - Criterio: ninguno empeora frente a 0.2. Lo que esté mal queda anotado para F3, sin arreglarlo aquí.
  - Dependencias: de 3.4 a 3.7.
- [ ] **3.9 Cierre de F1.**
  - Qué: lo mismo que 2.12, más 3.1 en verde y la entrada «D-502 F1» en `CONTRACT.md`. Anotar la deuda medida de los rellenos con `var(--primary-color)` en componentes.
  - Criterio: los criterios 5 (familia de 169) y 7 de la propuesta se cumplen, y el claro sigue idéntico.
  - Dependencias: de 3.2 a 3.8.

## 4. Fases siguientes

Cada una tiene su diseño corto, su delta, sus tareas y su aprobación antes de empezar.

- [ ] **4.1 F2a `_config-pagina.scss`.** **Sensible:** la base también pinta despachos, la lista de POS, formas de pago, borradores, carga de ventas y bodegas. Va con diff aprobado.
  - Pruebas primero: la auditoría de los criterios 2, 3 y 4 sobre las 38 pantallas y la revisión, una por una, de los 22 archivos que usan `$cfg-*`. Consume `--ds-chip-bg` y `--ds-shadow-*` de F1.
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
- [ ] **4.7 Solo si Daniel rechaza el valor por defecto 7:** F2d para `publica` (10 pantallas), con la misma regla de F2.
- [ ] **4.8 Solo si Daniel pide el escudo C (valor por defecto 1).**
  - Qué: crearlo con dueño y fecha de retiro (Art. XII), y retirarlo en 4.1.
  - Criterio: en `CONTRACT.md` quedan el dueño, la fecha y la tarea de retiro.
