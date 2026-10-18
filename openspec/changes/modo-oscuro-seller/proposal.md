# Modo oscuro del Seller sobre los tokens Katuq (ticket #1180)

> Estado: **propuesta** (solo `proposal.md`; design, specs y tasks después de aprobarla). Ticket #1180 «Mejorar el aspecto visual del modo oscuro en todas las páginas». Investigación de solo lectura del 2026-10-18 sobre `feature/venta-asistida-mejorada`. Decisión: **D-XXX** al aprobar.

## Por qué

El modo oscuro se ve mal justo en las pantallas que ya modernizamos (D-398, D-399, D-400). Hay celdas de tabla con texto casi invisible, tarjetas blancas encima de un lienzo negro y un acento azul cielo (`#6AB5E8`) que no es de la marca. El problema no es de una pantalla. Hoy conviven **seis capas de "oscuro"** que no se hablan, y las bases modernas compilan sus colores en el build, así que no pueden cambiar cuando el usuario prende el tema.

## Qué pasa hoy (con evidencia)

**Cómo se prende.** El botón `.mode` del header (`header.component.html:53`) llama a `layoutToggle()` (`header.component.ts:108-136`). Ese método pone o quita `dark-only` en `<body>`, pone la misma clase en el contenedor del layout (`content.component.html:2`, vía `layout_version`), cambia el CSS de PrimeNG a `md-dark-deeppurple` (`ngtheme.service.ts:11-17`) y escribe `body.style.backgroundColor = 'black'` en línea. Guarda `tema` en el usuario (backend con `updateUser` y `localStorage['user'].tema`). `app.component.ts:264-277` repite la misma lógica al arrancar. **`SignOut()` (`auth.service.ts:294-321`) no deshace nada de eso:** después de cerrar sesión, el login hereda el oscuro hasta que se recargue la página.

**Seis capas que compiten:**

| Capa | Selector y archivo | Paleta |
|---|---|---|
| Overrides «comprehensivos» | `body.dark-only` en `src/assets/scss/dark-mode.scss` (4031 líneas, 92 `!important`) | Gris azulado `#1a1d23`/`#252830`; acento `#6AB5E8` (156 apariciones) |
| Plantilla Cuba | `body .dark-only` en `themes/_dark.scss` (6925 líneas) | `#1d1e26`/`#262932` |
| PrimeNG | `md-dark-deeppurple` (`angular.json:121`) | Primario `#CE93D8`, superficies `#121212`/`#1e1e1e` |
| Estilo en línea | `body.style.backgroundColor = 'black'` | `#000` puro |
| Marco nuevo (sidebar/header) | `sidebar.component.scss:1432-1460`, `styles.scss:654-661` | Violeta oscuro `#14121c`/`#1b1826`/`#262233`, texto `#f2f0fa` |
| Sistema operativo | `@media (prefers-color-scheme: dark)` en `bottom-navigation.component.scss:24` y `shared-filters`, entre otros | Gris iOS `#1c1c1e`. Responde al SO, no al botón |

**Por qué se rompen las pantallas modernas.** `dark-mode.scss:86-88` pinta `p, span, div` de `#e0e0e0`, y `:826-829` también las celdas de las tablas PrimeNG. Las bases modernas dejan las superficies fijas en blanco con variables SCSS, que se compilan a hex en el build: `_config-pagina.scss:74,173,259` (`background: #fff` en encabezado, tarjeta y filas), `publica-marco.component.scss:11`, `$pd-*` en `ventas/list/list.component.scss:5411+`. Resultado: texto claro sobre fondo blanco, **1,32:1** (AA exige 4,5:1). Lo contrario también pasa: un texto en `#211F3A` que caiga sobre el lienzo oscuro da **1,06:1**. En la app hay 1126 fondos blancos fijos en 241 de 473 SCSS, y solo 14 archivos responden a `dark-only`. Ninguno de esos 14 es una base moderna.

**Muestra (lectura de SCSS; falta confirmarla en navegador):**

| Pantalla | Base | Qué se ve en oscuro |
|---|---|---|
| Ocasiones, Géneros, Tipos de cliente y otras 35 | `config-pagina` (38 pantallas) | Encabezado y tarjeta blancos sobre negro. El texto de las celdas sale en `#e0e0e0` sobre filas blancas: no se lee. El hover también queda blanco (gana el `!important` de la base) |
| Bodegas | `config-pagina` + `:host-context(body.dark-only)` (`bodegas.component.scss:169`) | Solo cambian las etiquetas, y para fondo oscuro. Como caen dentro de la tarjeta blanca, `#90caf9` sobre blanco da 1,75:1 |
| Todos los pedidos (canon) | Tema `pd` (6720 líneas) | Cero reglas de oscuro y 37 fondos blancos. La vista dividida sigue clara, y el texto sin clase propia hereda `#e0e0e0` |
| Crear venta / venta asistida | `:root` propio (`crear-ventas.component.scss:1-25`) | 42 fondos blancos y cero reglas de oscuro. Sus variables solo tienen valores claros (y `--primary-dark: #3a56d4`, azul) |
| Login, contraseñas, 404 y otras públicas | `publica` (10 pantallas) | Después de cerrar sesión en oscuro, la tarjeta blanca queda bajo las reglas oscuras y el fondo negro en línea. Al recargar se ve clara: la misma pantalla cambia según si se recargó o no |
| Sitios (lista, editor, marca) | `--kb-*` (`_katuq-builder.scss:18-73`) | Es el único módulo con variables CSS en runtime, pero solo tiene juego claro. Además, `sitios-lista` repite 14 `#fff` fijos |
| Barra inferior (móvil) | `prefers-color-scheme` | Con el SO en oscuro y la app en claro, la barra se pone oscura (y al revés) |
| Sidebar y header | `:root` + `body.dark-only` | **Ya funcionan bien** con variables CSS: son el precedente que se debe seguir |

## Qué cambia (fases)

**Opciones evaluadas:**

| | (A) Variables CSS en runtime | (B) Seguir con la hoja de overrides | (C) Apagar el oscuro donde no está adaptado |
|---|---|---|---|
| Idea | Un juego claro y uno oscuro de custom properties sobre los tokens canónicos. Las bases (`$cfg-*`, `$pub-*`, `$pd-*`, `--kb-*`) apuntan a `var(--…)` | Agregar a `dark-mode.scss` reglas para `cfg-*`, `pd-*`, `kb-*`… | Las pantallas modernas (o toda la app) ignoran `dark-only` y el contenido se queda claro |
| Esfuerzo | M al inicio (tokens + 3 bases cubren 48 pantallas) y L en las pantallas grandes, una por cambio | S por pantalla, pero sin fin: cada pantalla y cada color se duplican | S (horas) |
| Riesgo | Regresión en claro si un `var()` queda mal. Se controla con una comparación visual en claro | Guerra de especificidad contra el encapsulado y los `!important` de ambos lados | Bajo técnicamente. No cumple el ticket |
| Deuda | La baja: un solo origen de color y menos reglas a mano | La sube: 4031 líneas más lo nuevo, y todo cambio en claro hay que reflejarlo | Deja la app medio oscura y no resuelve nada |

Se verificó que las bases no aplican funciones de color de Sass (`rgba()`, `darken()`, `mix()`) sobre `$cfg-*`, `$pub-*` ni `$pd-*`: cero usos. Por eso cambiar su valor a `var(--…)` no rompe la compilación.

**Recomendación (la decisión es de Daniel): A por fases, con C solo como escudo temporal** de la fase 0. Ese escudo debe llevar dueño y fecha de retiro (Artículo XII).

- **Fase 0. Ordenar el encendido.** Un solo punto que aplique o quite el tema: clase en body, tema de PrimeNG y limpieza en `SignOut()`. Quitar el `backgroundColor` en línea. La barra inferior y los filtros siguen el botón, no el SO. Opcional: escudo C para que las 48 pantallas de `config-pagina` y `publica` no queden con texto invisible mientras llega la fase 2.
- **Fase 1. Tokens.** Partial global con custom properties en `:root` (claro) y `body.dark-only` (oscuro), con los valores canónicos de `design-system/spec.md` y prefijo propio para no chocar con `--primary-color`. Hoy esa variable la definen `styles.scss` (`#a78bfa`), `dark-mode.scss` (`#6AB5E8`), el `:root` del sidebar (`#7c5cff`, sin encapsulado) y `crear-ventas` (`#6c4ce0`). La paleta oscura parte de la del sidebar y el header. El botón principal sigue en `#5F3FE0`: el blanco encima da 6,41:1. Para texto e íconos sobre fondo oscuro, `#5F3FE0` da apenas 2,72:1, así que se propone un tinte claro del mismo morado (p. ej. `#a48bff`, 6,40:1). Los semánticos fuertes también necesitan su versión clara (`#1E874B` da 3,84:1 y `#D64545` 3,98:1). En esta fase, los 156 `#6AB5E8` de `dark-mode.scss` y el primario de PrimeNG oscuro pasan a los tokens. La spec `design-system` gana un requisito «Tema oscuro» como delta.
- **Fase 2. Bases.** `_config-pagina.scss` (38 pantallas), `publica` (10), `_katuq-builder.scss` (sitios) y `_katuq-modal.scss`: sus variables y sus `#fff` fijos pasan a tokens. Con eso, las reglas genéricas de `dark-mode.scss` dejan de chocar, porque el texto claro cae sobre una superficie oscura.
- **Fase 3. Pantallas de mayor uso, una por cambio.** Todos los pedidos, crear venta / venta asistida, POS, despachos, inventario e inicio. Cada una con capturas antes/después en ambos temas.
- **Después (fuera de este cambio):** retirar de `dark-mode.scss` y `_dark.scss` los bloques de pantallas ya migradas.

Por el Artículo XIII, cada fase puede salir como cambio propio si crece.

## Alcance / fuera de alcance

**Entra:** SCSS globales y de las bases, los tokens y el código que aplica el tema (`header`, `app.component`, `SignOut`, `ngtheme.service`). Es solo presentación: no se tocan columnas, filtros, eventos, modales, servicios, validaciones ni textos funcionales. No hay backend; `updateUser({tema})` sigue igual.

**No entra:** la reconciliación de `_katuq-tokens.scss` (`#8b5cf6`), que va en su propia propuesta (`design-system/spec.md:104`). Tampoco `katuq-flow` (React compilado), Regístrese (`diagnostic-survey`), las tiendas públicas de los comercios, PDFs, impresión, correos ni el retema de PrimeNG claro (`lara-light-blue`, primario `#3B82F6`, que también es un primario prohibido; se reporta aparte).

## Riesgos

- **Regresión en modo claro:** al pasar `$cfg-*` a `var()`, el claro debe verse idéntico. Se exige comparación visual.
- **Especificidad:** el encapsulado de Angular, los 92 `!important` de `dark-mode.scss` y los `!important` de las bases. Hay que probar cada base contra las reglas genéricas.
- **Módulos sensibles** (ventas, POS, despachos): solo SCSS, una pantalla por cambio y con diff aprobado.
- **Terceros:** ApexCharts, Quill, ng-select, driver.js, FullCalendar y Sweetalert2 necesitan revisión en oscuro.
- **Trabajo en paralelo:** hay cambios sin commit en `components/sitios` y `nav.service.ts` de otra tarea. La fase 2 de sitios se coordina con ese trabajo.
- **Trampas de CSS global** (AGENTS.md): ninguna clase nueva con «p-»; los spans de `*ngIf` llevan color propio; `:focus-visible` con contorno.
- **Bug latente que se escala:** el muted canónico `#8f8bab` sobre blanco da **3,26:1**, así que tampoco pasa AA en claro para texto pequeño. El oscuro no debe copiar ese par.

## Criterios de aceptación medibles

1. Con el botón en oscuro, `body.dark-only` está presente. Después de `SignOut()` no queda: ni la clase, ni `style` de fondo en `<body>`, ni el tema PrimeNG oscuro (se verifica en DevTools).
2. En las pantallas de la fase, `axe` reporta 0 violaciones `color-contrast` en ambos temas: texto ≥ 4,5:1, texto grande y bordes de controles ≥ 3:1.
3. En oscuro, ningún panel, tarjeta o fila tiene fondo computado `#fff`/`#ffffff` (chequeo con Playwright sobre `getComputedStyle`).
4. En claro, las capturas antes/después de las pantallas de fase 2 son idénticas.
5. `#6AB5E8` en `dark-mode.scss` baja de 156 a 0. Los conteos de `(linear|radial)-gradient(` y de primarios prohibidos (lista de AGENTS.md) no suben en los archivos tocados.
6. Revisión a 1440 y 390 px en ambos temas, sin scroll horizontal ni texto invisible. La barra inferior y los filtros responden al botón, no al SO.
7. Build de producción sin errores. Decisión registrada en `specs/CONTRACT.md` al aprobar.

## Preguntas para Daniel

1. ¿Va la opción A por fases? ¿Con o sin el escudo temporal C para las 48 pantallas de `config-pagina` y `publica`?
2. ¿Aprueba un tinte claro del mismo morado para texto e íconos en oscuro (p. ej. `#a48bff`) y versiones claras de los semánticos, dejando el relleno del botón en `#5F3FE0`?
3. ¿La paleta del sidebar y el header (`#14121c` lienzo, `#1b1826` tarjeta, `#262233` líneas, `#f2f0fa` texto) queda como canon del oscuro?
4. ¿El tema debe seguir al sistema operativo cuando el usuario no ha elegido? Hoy eso está comentado en `header.component.ts:40-49`.
5. ¿Confirmamos la lista de la fase 3, o hay datos de uso por pantalla? ¿Sabemos cuántos usuarios tienen `tema` en oscuro (consulta de solo lectura)?
6. ¿Abrimos aparte el contraste del muted en claro (3,26:1)?

## Decisión

Pendiente. Al aprobar se registra como **D-XXX** en `specs/CONTRACT.md`, revisando antes el último ID (hoy D-492) para no chocar. Esta propuesta no toca el contrato.
