# F3 · Todos los pedidos (`ventas/list/list.component.scss`)

Bloque TEMA-B13 (tarea 4.4.1). Solo `.scss`; el claro queda idéntico. Sensible (pedidos): cambio mínimo, caracterización antes y después.

## Mapeo (desde la línea de `$pd-accent` hasta el final de la hoja)

| Antes | Después | Dónde |
|---|---|---|
| `$pd-accent` / `#5F3FE0` como relleno | `var(--ds-accent)` | `background`, `--kc-accent` |
| `$pd-accent` / `#5F3FE0` como texto o borde | `var(--ds-accent-ink)` | título «Pedidos», íconos, totales |
| `$pd-accent-2` | `var(--ds-focus)` | anillo de foco |
| `$pd-ink`, `$pd-muted`, `#5b5878` | `ink`, `muted`, `body` | texto |
| `$pd-line`, `$pd-line-soft`, `#e4e2ef`, `$pd-chip-border` | `line`, `line-soft`, `line-strong`, `control-border` | bordes |
| `$pd-chip-bg`, `#f3f1fb`, `#faf9fe`, `#faf9ff`, `#efe9ff` | `chip-bg`, `tile`, `surface-2`, `row-hover`, `accent-soft` | fondos |
| `#fff` como fondo | `var(--ds-surface)` | barra de filtros, franja de indicadores, lista, detalle, Panel |
| `#fff` como texto sobre acento | `var(--ds-on-accent)` | solo 4 sitios con relleno `accent` |
| `#4a2fc0` (hover, `--kc-accent-ink`) | `var(--ds-accent-hover)` | |
| Semánticos `#1E874B #D64545 #D9820A #1E6FD9` y sus fondos suaves | `ok err warn info` y `-soft` | chips, pastillas, `--kc-*` |

Los `$pd-*` de color quedan sin uso salvo `$pd-muted-2` (`#9995b3`, sin token con ese valor claro). Ningún `$pd-*` entra en una función de color de Sass (los `rgba($primary-color, …)` y `darken(...)` del inicio de la hoja usan `$primary-color` y no se tocan).

Trampa `span.ng-star-inserted`: el desglose del subtítulo (`.pedidos-desglose`, spans de `*ngIf`) toma `$secondary-color` de `_reset.scss`. Se le da color propio **solo en oscuro** (`:host-context(body.dark-only)`, `var(--ds-muted)`), para no cambiar el claro. El número de resultados es un `<b>` y ya lleva `var(--ds-ink)`.

## Preguntas abiertas (Daniel)

Quedan literales sin token con su valor claro, que no se pasan a token sin cambiar el claro: `#2b2846` (texto fuerte), `#6f6c8a`, `#a5a1bf`, `#b7b3cf`, `#a09cbc` (textos tenues), `#eceaf4`, `#eeecf7`, `#f1eff8` (líneas), `#d9cffb`, `#e4dff7` (bordes de hover), `#9995b3`, `#5A6B78`/`#eef0f3` (secundario), `#fff4e5`/`#8a5300` (aviso), `#3B82C4`/`#EAF4FF` (congelado) y los rellenos de avatares y puntos de estado con texto `#fff`. En oscuro, `#2b2846` sobre superficie oscura pide decisión (token nuevo `--ds-ink-strong` o `ink`).

## Pruebas

`tests/theme/pedidos-tokens.test.js` (en `test:theme`): claro idéntico frente a `fixtures/pedidos-claro-563317bb.json`, sin `$pd-*` de color, sin fondos `#fff`, cada `var(--ds-*)` existe en los dos temas, color propio del desglose solo en oscuro, y gradientes (3) / primarios (0) / clases con «p-» sin subir. Complemento: `node tests/theme/comparar-claro.js --base <commit> --tmp <scratchpad> src/app/components/ventas/list/list.component.scss`.
