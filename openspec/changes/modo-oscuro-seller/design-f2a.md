# Diseño F2a: la base `_config-pagina.scss` sobre los tokens (D-502, ticket 1180, tarea 4.1)

> Complementa [`design-f1.md`](design-f1.md) §7. **Aprobado** en la aprobación en bloque de Daniel del 2026-10-21 (pregunta 1: un solo diff en la base y los consumidores por módulo). **Sensible:** la base pinta despachos, la lista de POS, formas de pago, borradores, carga de ventas, inventarios y bodegas. El diff va en su propio commit y espera el visto bueno de Daniel.

## Mapeo y acentos

El valor claro de cada token es el hex que tenía la variable, así que el claro no cambia. El oscuro lo da `body.dark-only`.

| `$cfg-*` | Token | `$cfg-*` | Token |
|---|---|---|---|
| `accent` / `accent-hover` / `accent-soft` | lo mismo | `chip-bg` / `chip-border` | `chip-bg` / `control-border` |
| `accent-ink` (**nueva**) / `accent-2` | `accent-ink` / `focus` | `tint` / `row-hover` / `tile` | `surface-2` / `row-hover` / `tile` |
| `ink` / `body` / `muted` / `line` / `line-soft` | lo mismo | semánticos y `-soft`, sombras | lo mismo |

- **Relleno, `$cfg-accent`:** `cfg-btn`, la página activa del paginador, el interruptor encendido y el fondo del check marcado. El texto encima va en `var(--ds-on-accent)`.
- **Texto, ícono, borde o indicador, `$cfg-accent-ink` (`#a48bff` en oscuro):** `cfg-eyebrow`, el hover de `--sec`, el ícono de `cfg-vacio`, `cfg-pill`, `cfg-stat__valor`, la pestaña activa con su `ink-bar` (`#5F3FE0` da 2,72:1 sobre `surface`), la columna ordenada y el borde del check marcado (criterio de TEMA-B03/B06).
- **Blancos:** los 6 fondos `#fff` pasan a `var(--ds-surface)`, los 2 textos sobre relleno a `var(--ds-on-accent)` y el borde `#e4e2ef` a `var(--ds-line-strong)`. `.p-tabview-title` sigue con `color: inherit !important`.

## Preguntas para Daniel (abiertas, no decididas)

1. **Literales claros sin token** con su valor claro. Son los bordes `#ddd3fb`, `#d9cffb`, `#f3c9c9` y `#eeecf7`, la `cfg-pill--neutro` (`#eef0f3`/`#5A6B78`), el deshabilitado `#d8d4ea` y el anillo `rgba(124,92,255,.15)`. En oscuro se ven claros. La tabla de `design-f1.md` §1 está cerrada. Opciones: ampliarla (`accent-line`, `disabled`, `neutral`/`neutral-soft`) o aceptarlos como deuda.
2. **Borde de `cfg-btn--sec`:** en oscuro `line-strong` da 1,48:1, y la spec pide 3:1 en bordes de controles. Es el mismo caso que el punto 2 de la tarea 3.5. `control-border` pasa, pero cambia el claro (`#e9e7f3` contra `#e4e2ef`).
3. **Carril del interruptor encendido:** `#5F3FE0` da 2,72:1 sobre `surface`. Es un relleno sin texto, que va con la nota de TEMA-B03 de la tarea 3.4 (pasar o no esos rellenos a `accent-ink`).

`config-pagina-tokens.test.js` nombra los tres puntos como pendientes: cuando Daniel decida, la prueba obliga a sacarlos de la lista.

## Consumidores y compuerta de publicación

- **Funciones de color sobre alias.** Hay 0 funciones de color directas sobre `$cfg-*`, pero `inventarios/traslados` y `inventarios/recepcion-mercancia` aplican `rgba()` y `darken()` a alias. `darken(var())` no compila. Esos 6 alias quedan en su hex, con el claro idéntico, y el cambio va en un commit propio que tiene que aprobar Daniel. Su oscuro (el texto `#5F3FE0` sobre la tarjeta oscura, a 2,7:1) es de TEMA-B17.
- **Interpolaciones `#{$cfg-*}`.** Solo van en `--kc-*` y dejan pasar el `var()` intacto. Para B08-B10: `--kc-accent-ink: #{$cfg-accent-hover}` (`integrations.component.scss:1673`) es un acento de texto que apunta al relleno. En oscuro el hover de sus enlaces da 2,04:1 y debe pasar a `$cfg-accent-ink`. Ya pasaba antes de F2a.
- **Compuerta.** Al oscurecer la base, en oscuro empeoran las reglas de los consumidores que tienen un fondo claro literal con texto de token: 42 reglas en 25 archivos, entre ellas `borradores-venta`, la agenda y especificaciones. También empeora el texto literal oscuro sin fondo propio, como `bodegas .texto-celda`, Tipos de cliente y los alias de inventario: 308 reglas en 62 archivos. **4.1.4 no se publica sola:** sale en el mismo release que los consumidores TEMA-B08 a B10 y B17, y solo si el barrido `--todas` no empeora frente a su línea base. La prueba fija un techo por archivo a las 42 reglas, así que ese techo no puede subir.

## Write-set

`_config-pagina.scss`, las líneas de alias de los dos `.scss` de inventario, `tests/theme/config-pagina-tokens.test.js` con su referencia `tests/theme/fixtures/config-pagina-claro-4ac9a459.css`, `theme-tokens.test.js` con el hex anterior fijo, la línea `test:theme` y estos documentos. Las pruebas están en `design-pruebas.md` (Fase 2a). **Reversa:** revertir los commits.
