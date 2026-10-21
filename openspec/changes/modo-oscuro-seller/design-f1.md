# Diseño F1: tokens del tema (D-502, ticket 1180)

> Complementa [`design.md`](design.md), que trae el contexto, la fase 0, los gates y los valores por defecto. Las pruebas están en [`design-pruebas.md`](design-pruebas.md). Los requisitos están en [`specs/design-system/spec.md`](specs/design-system/spec.md). Verificado el 2026-10-18 sobre `feature/venta-asistida-mejorada`.

## 1. Parcial global `src/app/shared/styles/_theme-tokens.scss`

- Se importa una sola vez en `src/styles.scss`, antes de `dark-mode.scss`. Emite `:root { --ds-* }` con el juego claro y `body.dark-only { --ds-* }` con el oscuro. Las bases no lo importan: solo usan `var(--ds-*)`.
- El prefijo es `--ds-` (cero usos hoy). `--ktq-*` ya es del sidebar, cuyo `:root` sin encapsulado carga después y ganaría. `--primary-color` tiene 11 definiciones en `src/app`, además de las de `styles.scss` y `dark-mode.scss`.
- Los valores claros son los de `design-system/spec.md` (iguales a `$cfg-*`) y los oscuros salen del sidebar y el header. El contraste WCAG se mide contra **todas** las superficies oscuras (`canvas`, `surface`, `surface-2`, `row-hover`, `tile`, `chip-bg`, `sidebar` y `accent-soft`). La tabla da el valor sobre `surface` y el peor caso, que siempre es `accent-soft`.

| Token `--ds-*` | Claro | Oscuro | Contraste en oscuro (`surface` / peor) |
|---|---|---|---|
| `canvas` / `surface` / `surface-2` | `#f4f3fa` / `#fff` / `#faf9fe` | `#14121c` / `#1b1826` / `#211d30` | — |
| `canvas-rgb` | `244, 243, 250` | `20, 18, 28` | para el header, `rgba(…, .72)` |
| `sidebar` / `connector` | `#fff` / `#efeaff` | `#17151f` / `#2c2740` | — |
| `row-hover` / `tile` / `chip-bg` | `#faf9ff` / `#f3f1fb` / `#f5f4fa` | `#221e33` / `#251f3a` / `#211d30` | — |
| `ink` / `ink-2` / `body` | `#211F3A` / `#4a4760` / `#5b5878` | `#f2f0fa` / `#e0ddef` / `#b9b5cc` | 15,45 / 12,70 · 13,07 / 10,74 · 8,75 / 7,19 |
| `muted` | `#8f8bab` | `#9d99b5` | 6,35 / 5,22 |
| `line` / `line-soft` / `line-strong` | `#ececf4` / `#f1f0f7` / `#e4e2ef` | `#262233` / `#221e33` / `#3a3450` | decorativas |
| `control-border` | `#e9e7f3` | `#7a7498` | 3,97 / 3,26 |
| `accent` / `accent-hover` (relleno) | `#5F3FE0` / `#4a2fc0` | igual | blanco encima: 6,41 / 8,54 |
| `on-accent` | `#fff` | `#fff` | — |
| `accent-ink` (+ `-rgb`), texto e íconos | `#5F3FE0` | `#a48bff` | 6,40 / 5,26 |
| `accent-soft` / `focus` | `#efe9ff` / `#7C5CFF` | `#2c244d` / `#a48bff` | contorno 6,40 / 5,26 |
| `ok` / `warn` / `err` / `info` | `#1E874B` / `#D9820A` / `#D64545` / `#1E6FD9` | `#4cc38a` / `#f2a640` / `#ff7a7a` / `#6aa6ff` | peor: 6,46 / 7,03 / 5,67 / 5,80 |
| `-soft` de cada semántico | los de la spec | `#1b2a2c` / `#392922` / `#391f2b` / `#1b2643` | el semántico encima ≥ 5,92 |
| `shadow-panel` / `shadow-btn` / `shadow-card` | `$cfg-shadow-panel` / `$cfg-shadow-btn` / `--ktq-shadow-card` | `0 1px 3px rgba(0,0,0,.4)` / igual / `0 24px 60px -30px rgba(0,0,0,.6)` | — |

`chip-bg`, `shadow-panel` y `shadow-btn` no tienen consumidor en F1: se emiten para que F2a solo consuma. `shadow-card`, `sidebar`, `connector` y `canvas-rgb` los consume el marco (punto 3).

## 2. `dark-mode.scss`

**La familia del azul suma 169 apariciones:**

- 108 `#6AB5E8`;
- 47 `rgba(106, 181, 232, …)`;
- 10 `#5AA5D8`, el hover de los mismos botones, por ejemplo `.btn-primary` en :216-218;
- 2 `#8AC5F8` (:95 y :314);
- 1 `rgb(106, 181, 232)` (`--rgb-primary`, :59, sin consumidores);
- 1 `#4A95C8`.

La propuesta contó 156 porque no incluyó los hovers ni los tintes (valor por defecto 13). El secundario `#7A8FE8`/`#5A6FC8` y el terciario `#4AC5E2`/`#6AD5F2`/`#2AA5C2` quedan para el retiro.

**Regla de reemplazo, por rol y bloque por bloque, nunca a ciegas:**

| Rol | Hoy | Pasa a |
|---|---|---|
| Texto, ícono o borde | `#6AB5E8`, `#8AC5F8` | `var(--ds-accent-ink)` |
| Fondo translúcido | `rgba(106, 181, 232, α)` | `rgba(var(--ds-accent-ink-rgb), α)` (Dart Sass 1.54 deja pasar `rgba()` con `var()`) |
| Relleno opaco (28 `background(-color): #6AB5E8`, como `.btn-primary` y `.badge.bg-primary`) | `#6AB5E8` | `var(--ds-accent)`. El texto del mismo bloque pasa a `var(--ds-on-accent)`: en 11 de esos bloques hoy es `#1a1d23`, que sobre `#5F3FE0` daría 2,63:1 |
| Hover de relleno (5 bloques con `#5AA5D8`) y `#4A95C8` | `#5AA5D8`, `#4A95C8` | `var(--ds-accent-hover)` |
| `--rgb-primary` | `rgb(106, 181, 232)` | `rgb(var(--ds-accent-ink-rgb))` |

**`!important` globales.** `_reset.scss:560` pinta `.btn-primary` con `var(--primary-color) !important`, y hoy gana a la regla sin `!important` de `dark-mode.scss`. Los rellenos de la hoja oscura que pierden así llevan `!important`, y su selector `body.dark-only …` gana por especificidad. Lo mismo vale para los botones de driver.js (`styles.scss:362`), que se pisan en `dark-mode.scss` para no cambiar el claro.

**`--primary-color` tiene dos papeles.** En `src` tiene 321 usos: unos 150 como color de texto, otros como borde y 43 como relleno directo (31 `background` y 12 `background-color`, contando los que traen valor de respaldo) en 17 archivos. Ningún tono sirve para los dos en oscuro: con blanco encima, el tono necesita luminancia ≤ 0,18, y como texto sobre `surface` necesita ≥ 0,22. Por eso, en las líneas 5-75:

- `--primary-color` y `--theme-default` pasan a `var(--ds-accent-ink)`, el papel mayoritario;
- `--primary-dark-color` pasa a `var(--ds-accent)`;
- `--primary-light-color` y `--primary-70` pasan a `rgba(var(--ds-accent-ink-rgb), …)`.

Los rellenos de la hoja oscura ya quedan en `--ds-accent` por la regla. Los de componentes (ventas, despachos, onboarding, dropshipping, prospectos, video-agent e importación) pasan de 2,24:1 hoy a 2,72:1 con texto blanco: mejoran, pero no pasan. Quedan como deuda medida, y cada uno pasa a `var(--ds-accent)` en la fase de su pantalla (F2 o F3). Las barras de `layout/_sidebar.scss` y `_dark-sidebar.scss` no llevan texto, así que no tienen problema de contraste.

**Grises (pregunta 3).** El reemplazo es por rol:

| Gris (apariciones) | Token |
|---|---|
| `#1a1d23` (36) | `canvas` |
| `#1e2128` (11) y `#252830` (57) | `surface` |
| `#2d3139` (120) | `surface-2` |
| `#3d4149` (219) | `line-strong` |
| `#f0f0f0` (40) | `ink` |
| `#e0e0e0` (184) | `ink-2` |

## 3. Sidebar y header

Sus oscuros (`sidebar.component.scss:1434+` y `styles.scss:654-661`) pasan a `var(--ds-*)` con el mismo valor:

- `#14121c`, `#1b1826`, `#211d30`, `#221e33`, `#251f3a` y `#262233`;
- `#17151f` (`--sidebar-bg` y `--glass-bg`) y `#2c2740` (conector);
- `#f2f0fa` y `#b9b5cc`;
- el header oscuro en `rgba(var(--ds-canvas-rgb), .72)`. El claro (`rgba(244, 243, 250, .72)`) ya es el lienzo claro a `.72` y no se toca en F1;
- la sombra de la tarjeta en `--ds-shadow-card`.

Lo que no tiene token se queda literal: `--primary-light`, `--glass-bg-secondary` y el `--text-muted` `#8f8ba5`.

## 4. PrimeNG oscuro

Nuevo `src/assets/scss/theme-katuq-dark.scss`, que junta cuatro piezas en este orden:

1. `lara-dark-purple` (instalado), de la misma familia que el claro;
2. `_primeng-katuq-base.scss` (nuevo): el bloque de `theme-lara-light-blue.scss:19-55` (`.p-sortable-column.p-highlight`, `.p-component` a 0.7rem, campos, padding 0.5rem de las celdas, paginador y diálogo). Los dos temas lo importan en la misma posición, así que el claro compila idéntico y los tamaños no cambian al alternar;
3. `primeng-overrides.scss`;
4. `_primeng-dark.scss`, que pisa de forma explícita lo que `primeng-overrides.scss` trae compilado para el claro:
   - el botón primario (`$katuq-primary`, `#8b5cf6`) pasa a `var(--ds-accent)`, con hover `--ds-accent-hover`;
   - el anillo de foco `0 0 0 2px #fff` pasa a `0 0 0 2px var(--ds-surface), 0 0 0 4px var(--ds-focus)`;
   - el secundario `#64748b` (3,66:1 sobre `surface`) pasa a texto `var(--ds-body)` y borde `var(--ds-control-border)`;
   - los textos y fondos suaves en `$katuq-primary` pasan a `var(--ds-accent-ink)` y `rgba(var(--ds-accent-ink-rgb), …)`;
   - las superficies, a `--ds-*`.

`theme-katuq-dark.scss` conserva `.backColorSwitch` y `.bg-swayp` del oscuro actual.

**Implementación (bloque TEMA-B06, 2026-10-21).** Tres ajustes sobre este punto, que salen de su propio criterio («los tamaños no cambian al alternar»):

- **Orden real:** lara-dark-purple → `primeng-overrides.scss` → `.backColorSwitch`/`.bg-swayp` → `_primeng-katuq-base.scss` → `_primeng-dark.scss`. Es la misma posición del claro, donde el bloque va después de `primeng-overrides`. Con la base antes, se invertía la cascada entre reglas de igual especificidad (`.p-component` y `[class*="p-"]`, entre otras): en celular los campos, botones y celdas bajaban de `0.7rem` a `0.65rem`.
- **Paridad de geometría:** lara-dark-purple difiere de lara-light-blue en 20 declaraciones (bordes y esquinas del paginador, bordes de los encabezados de tabla, mensajes en línea y el peso del título del calendario). `_primeng-dark.scss` les devuelve el valor del claro.
- **Superficies, explícitas y generadas:** lara escribe sus colores a mano (azul marino `#071426`/`#040d19`/`#0b213f`/`#091a32`/`#233752` y el lila `#C4B5FD`). `_primeng-dark.scss` lleva un override por regla, con el mismo selector y solo color, para los componentes que usa la app. La región la escribe `tests/theme/primeng-dark-generar.js`, que documenta los roles, y la prueba exige que coincida. Las variables `--surface-*` y `--text-color*` de lara que usa la app apuntan a tokens en `body.dark-only`.
- **Revisión del bloque:** las opciones de `p-selectButton` y `p-toggleButton` son `div.p-button` sin severidad y el primario (`.p-button:not(…)`, 0,10,0) les ganaba a la región; `_primeng-dark.scss` las repite con la misma cadena `:not` delante para que la opción marcada (`accent`) se distinga de la no marcada (`surface`). La lista de componentes del generador suma `p-toggleButton`, `p-avatar`, `p-organizationChart`, `p-inputNumber`, `p-message` y `p-toast`, y la prueba la contrasta con las etiquetas de las plantillas.
- **Pendiente de ratificación de Daniel:** el orden real y las dos piezas de arriba (paridad y región generada) cambian el texto aprobado de este punto.

**Asimetría declarada (valor por defecto 8).** En claro, el botón PrimeNG sigue en `#8b5cf6` (blanco encima: 4,23:1) hasta la propuesta de `_katuq-tokens.scss`. Cambiarlo aquí rompería el criterio 4. En oscuro va en `#5F3FE0` (6,41:1).

En `angular.json`, el bundle `md-dark-deeppurple` se cambia por `katuq-dark` (sin hash; lo cubre el `no-cache` de `firebase.json`, que además redirige `/md-dark-deeppurple.css` a `/katuq-dark.css` con 302 para las sesiones abiertas antes de publicar). Se borra `theme-md-dark-deeppurple.scss` y se cambia la constante del servicio.

## 5. Write-set de F1

- Nuevos: `_theme-tokens.scss`, `_primeng-katuq-base.scss`, `_primeng-dark.scss` y `theme-katuq-dark.scss`.
- `theme-lara-light-blue.scss`: solo se mueve su bloque al parcial.
- `styles.scss`, `dark-mode.scss` y `sidebar.component.scss`.
- `src/assets/scss/components/_avisos.scss`: solo el bloque `body.dark-only` de la línea 211 en adelante (toasts de ngx-toastr y `p-toast`, commit 287daaff del 2026-10-20). Su oscuro propio (`#262633`, `#ECEBF5`, `#b9b6cf`, `#34344a`) pasa a `--ds-*` dentro de la tarea 3.6, para que haya una sola fuente de colores por tema (pregunta 3 del informe del 2026-10-21, aprobada en bloque). El claro de los toasts no se toca.
- `tests/theme/comparar-claro.js` (nuevo, CLI) y su prueba `tests/theme/comparar-claro.test.js`: el chequeo «claro idéntico» sin build que usan todos los bloques.
- La entrada del bundle en `angular.json` y la constante de `theme-mode.service.ts`.
- `tests/theme/theme-tokens.test.js` (nuevo) y la línea `test:theme` de `package.json`.
- Se borra `theme-md-dark-deeppurple.scss`.
- 3.7 (bloque TEMA-B06): `tests/theme/primeng-dark-generar.js` (escribe la región de superficies de `_primeng-dark.scss`), `tests/theme/primeng-dark.test.js` (en `test:theme`) y `tests/theme/theme-mode.test.js:46` (`katuq-dark.css`). `firebase.json` suma solo el redirect 302 del nombre viejo (revisión del bloque).

## 6. Pruebas de F1

En [`design-pruebas.md`](design-pruebas.md): `theme-tokens.test.js` mide cada token contra todas las superficies oscuras (y cada semántico contra su `-soft`), `conteos.test.js` exige cero azules y la auditoría revisa los rellenos `#5F3FE0` y que tamaños y espaciados de PrimeNG no cambien. Entre build y build, cada bloque revisa el «claro idéntico» con `tests/theme/comparar-claro.js` (CLI) sobre su consumidor o sobre `src/styles.scss`; las capturas y el build siguen siendo el criterio de cierre.

## 7. Fases siguientes

| Fase | Qué | Depende de | Notas |
|---|---|---|---|
| F2a | `_config-pagina.scss`: `$cfg-*` pasa a `var(--ds-*)`, se separa el acento de relleno del de texto y `#fff` pasa a `var(--ds-surface)`. Incluye las piezas que sumó 8bae2ba0: `cfg-pill` (y sus variantes), `cfg-stats`/`cfg-stat`, `cfg-form` y las pestañas PrimeNG dentro de `cfg-pagina`, todas con blancos y `$cfg-*` fijos | F1 | **Tamaño al 2026-10-21** (después de D-516, D-518 y D-519): 120 archivos `.scss` con `@include config-pagina` y 53 con `$cfg-*` directo (8 de ellos sin el mixin, como `agenda/cita-form`). Al diseñar eran 38 y 22. Un solo diff en la base y los consumidores por módulo (pregunta 1, aprobada en bloque el 2026-10-21). La base también pinta despachos, la lista de POS, formas de pago, borradores, carga de ventas y bodegas: diff aprobado |
| F2b | `_katuq-builder.scss` (juego oscuro de `--kb-*`) y los 14 `#fff` de `sitios-lista` | F1 | Coordinar con el trabajo de sitios |
| F2c | `_katuq-modal.scss` | F1 | Widgets de pago de POS2: diff aprobado, uno por vez |
| F3 | Todos los pedidos, crear venta / venta asistida, despachos, POS, inventario e inicio | F1 (despachos, también F2a) | Una pantalla por cambio, solo SCSS, capturas en los dos temas y diff aprobado. Incluye pasar a `--ds-accent` los rellenos con `var(--primary-color)` de cada pantalla |
| Retiro | Bloques ya migrados de `dark-mode.scss` y `themes/_dark.scss` | F3 de cada pantalla | En `_dark.scss` antes hay que quitar las 15 funciones de color de Sass sobre `$dark-*` (8 archivos) |
| Aparte | Contraste en claro, guardado del tema para todos los roles (backend privado), `_katuq-tokens.scss` y PrimeNG claro (`#3B82F6`) | — | Cada uno con su propuesta |

Si Daniel no acepta el valor por defecto 7, `publica` vuelve a F2 como F2d.
