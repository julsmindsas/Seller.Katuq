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

## Preguntas abiertas de TEMA-B08 (integrations)

- **Token de texto fuerte (`--ds-muted-strong`) y paleta slate heredada:** quedan en literal `.dk-btn--danger-ghost`, el `.form-control` del grupo de entrada, el `.btn-secondary` del pie y `.wc-webhook-box__url` (4 blancos con texto oscuro literal).
- **Fondo del modal (`--kc-canvas`, `#f6f5fb`):** no existe token con ese valor claro. Las reglas con `--kc-canvas` y texto `--kc-ink` (campos, upload, `.dk-batch`, pasos) se ven claras con texto claro en oscuro hasta ampliar la tabla. Ídem hovers/seleccionados del asistente DIAN (`#f7f5fe`, `#f2fbf6`, `#e4dcfc`) y `.dk-done`.
- **`--kc-accent-ink`** pasa a `$cfg-accent-ink` (lo manda este documento): en claro el hover de enlaces del modal pasa de `#4a2fc0` a `#5F3FE0`.

## Write-set

`_config-pagina.scss`, las líneas de alias de los dos `.scss` de inventario, `tests/theme/config-pagina-tokens.test.js` con su referencia `tests/theme/fixtures/config-pagina-claro-4ac9a459.css`, `theme-tokens.test.js` con el hex anterior fijo, la línea `test:theme` y estos documentos. Las pruebas están en `design-pruebas.md` (Fase 2a). **Reversa:** revertir los commits.

## Notas de TEMA-B09 (nps, proceso, productos, soporte, agent-builder, marketing, video-agent, kuvo, lista-precios)

- **Hecho, claro idéntico** (`comparar-claro.js` en los 28 archivos; en bodegas-por-canal y mis-tickets el comparador ve la diferencia solo porque `var(--x, hex)` pasó a `var(--ds-*)` con el mismo valor claro): blancos a `var(--ds-surface)` o `var(--ds-on-accent)`, perillas de interruptor en `on-accent`, acento como texto o borde a `$cfg-accent-ink`, y los literales con token exacto (`#211F3A`, `#8f8bab`, `#5b5878`, `#e4e2ef`, `#ececf4`, `#f1f0f7`, `#e9e7f3`, `#7C5CFF`, `#faf9fe`, `#f5f4fa`, `#efe9ff`, `#1E874B`) al token.
- **bodegas-por-canal:** quita `lighten($dark-card-bg, …)` y su juego oscuro. Las variables propias se reemplazan por tokens con el valor claro de antes: campo e inactivo en `chip-bg`, tarjeta y panel en `surface`, cabecera y canal en `surface-2`. Desvío respecto a la nota del encargo: el ítem de bodega va en `surface` y no en `tile`, porque `tile` (`#f3f1fb`) cambiaría el claro (`#fff`).
- **mis-tickets:** `--kc-surface` toma `var(--ds-surface)` y el acento como texto o borde usa `--kc-accent-texto` (`$cfg-accent-ink`). `--kc-accent-ink` (`$cfg-accent-hover`) no se usa en la hoja y queda igual.
- **Pendiente (sin token con su valor claro; pregunta abierta para Daniel, misma familia que B08):** bordes `#d9cffb`, `#ddd3fb`, `#f3c9c9`, `#eeecf7`; la píldora neutra `#eef0f3`/`#5A6B78` (también en bodegas-por-canal); el badge `#f2eefe` de Tipos de cliente; las grises propias de mis-tickets (`#f1f2f5`, `#5a6070`, `#fbfcfe`, `#f5f6fa`, `#e4e5ee`, `#d5d8e2`, `--kc-muted2`); el interruptor apagado `#ccc` de Canales.
- **Fuera de este bloque (tareas aparte):** `soporte.component`, `mis-ideas`, `lista-precios.component`, `productos.component`, `crear-productos`, `provider-issues-table`, `combos`, `chat-agui` y los pasos del wizard de agent-builder tienen blancos literales y no estaban en el alcance.
