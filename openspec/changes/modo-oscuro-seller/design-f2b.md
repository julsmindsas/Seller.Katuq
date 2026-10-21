# F2b: `_katuq-builder.scss` y `sitios-lista` (tarea 4.2, bloque TEMA-B11)

Solo presentación. Depende de F1 (tokens `--ds-*`). Prueba: `tests/theme/builder-tokens.test.js`.

## 1. Qué cambia

- **Mixin `kb-tokens($oscuro: false)`.** Con `kb-tokens(true)` agrega `body.dark-only &`, que redefine los `--kb-*` apuntando a `var(--ds-*)`. No hay hex propios. `&` es la lista del consumidor (`:host, .velo`), así el velo que cuelga del `<body>` también queda cubierto.
- **Opt-in.** Solo `sitios-lista` pasa `true`. Editor, marca, métricas y selector de productos siguen en claro: tienen blancos y claros literales (82 fondos solo en el editor) y con texto claro encima quedarían ilegibles. Cada uno se suma al migrar sus literales. No se tocó ningún archivo de `components/sitios/editor/*`.
- **Superficies del mixin.** Los 6 `background: #fff` de `kb-btn-ghost`, ícono, campo enfocado, pestaña activa, chip filtro y caja de modal pasan a `var(--kb-surface)`. En claro vale `#fff`; en los consumidores que no optan, también.
- **`sitios-lista`.** 7 `#fff` de superficie (`.vacio`, `.pagina`, `.enlace__copiar`, `.plantilla`, `.opcion`, `.opcion-grande`, `.objetivo`) pasan a `var(--kb-surface)`.

## 2. Mapa de roles

| `--kb-*` | `--ds-*` oscuro |
|---|---|
| canvas, surface, surface-2, surface-3 | canvas, surface, surface-2, row-hover |
| ink, ink-2, body | ink, ink-2, body |
| muted, muted-2, muted-3, disabled | muted |
| line, line-2/3, line-4/5/6 | line-soft, line, line-strong |
| chip, chip-2 | chip-bg |
| accent-ink, accent-text | accent-ink |
| accent-wash, wash-2 / wash-3, wash-4 | accent-soft / surface-2 |
| accent-tile, accent-line, accent-line-2 | tile, connector, connector |
| ok, warn, danger y sus wash/soft/line | ok, warn, err y sus -soft |
| shadow-card | shadow-panel |

**Excepciones de negocio (sin oscuro):** `--kb-accent` (#6a4dfb), `--kb-accent-grad` (relleno del botón principal) y las sombras de modal, marco, miniatura y acento. El botón principal no cambia en ningún tema.

## 3. Lo que NO se oscurece

La tienda del comercio: en `sitios-lista` quedan 8 `#fff` literales a propósito (miniatura `.mock` y sus barras, página y muestra de plantilla, vista previa de creación, perilla de la palanca y texto sobre el acento). El editor y su vista previa no se oscurecen.

## 4. Pendiente (decisión de Daniel o tarea propia)

- Corrección de revisión: los textos y fondos propios de `sitios-lista` (`#211f3a`, `#6b6685`, `#6b6880`, `#137a3a`, `#b42318`, `#f4f2fc`, `#e3f6ec`/`#13774f`, `#fff4dd`/`#8a5a00`, `#e4e0f5`, `#e4e1f0` de la palanca, `#efeaff`/`#5f3fe0`) pasan a variables locales `--sl-*`. En claro valen el literal de siempre (claro idéntico); en oscuro toman `var(--ds-*)`. Nuevo `--kb-accent-fg` (claro `#6a4dfb`, oscuro `--ds-accent-ink`) para el acento usado como color de texto o ícono.
- Siguen en claro, sin token, y solo del mixin: `#eeecf6` (botón primario deshabilitado), `#cfcadf`, `#fbfaff`, `#f2eeff`, `#eceaf4`; y la miniatura `.mock` (`#eeecf5`, `#e4e1f0`), que es la tienda del comercio. Se anotan para el barrido `--todas` y las capturas.
- Migrar editor, marca, métricas y selector-productos y luego pasar `kb-tokens(true)`; coordinar con F5-29 y TX-34.
- `comparar-claro.js` resuelve `--ds-*` pero no `--kb-*`: ve `#fff` -> `var(--kb-surface)` como diferencia aunque valgan lo mismo. La prueba 3b fija el claro de `--kb-*`.
