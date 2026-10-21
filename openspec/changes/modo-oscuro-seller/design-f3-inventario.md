# F3 · Inventario y bodegas

Tarea 4.4.5, bloque TEMA-B17. Solo `.scss`; sin cambios en `.ts` ni `.html`. Presentación pura: no hay escrituras de datos, así que el write-set D-134 no aplica.

## Mapeo (solo valores con token de igual valor en claro)
- Fondo `#fff`/`white` a `surface`; `#5F3FE0` y `var(--primary-color)` de relleno a `accent`; `#efe9ff` a `accent-soft`; `#faf9fe` a `surface-2`; `#faf9ff` a `row-hover`; `#f5f4fa` a `chip-bg`.
- Texto y borde de acento (`#5F3FE0`, `$cfg-accent` en `color`/`border`) a `accent-ink`; `#211F3A` a `ink`; `#5b5878` a `body`; `#8f8bab` a `muted`; bordes a `line`, `line-strong`, `control-border`.
- Hojas: catálogo (`inventarios`), historial de movimientos, traslados, recepción de mercancía, central de abastecimiento (y `insights.shared`), detalle de bodega, bodegas e importar bodegas.
- Catálogo: usa `kc-tokens` en su `:host`; suma `:host-context(body.dark-only) { @include inv-kc-oscuro; }` con el parcial `inventario-catalogo/_inv-oscuro.scss` (19 variables `--kc-*` a `--ds-*`). El claro no cambia.
- Central de abastecimiento: `$accent` (relleno) y `$accent-ink` (texto y borde) separados.
- Bodegas: el bloque `:host-context(body.dark-only)` (etiquetas `#90caf9`, 1,75:1 sobre la tarjeta blanca; segundo fallo medido en F0) se reemplaza por pares texto/fondo suave de los tokens. Teal y verde ya no se distinguen por tono: teal usa `tile` + `ink-2`.

## Deuda (Daniel / 4.6)
- Sin token con su valor claro quedan literales: grises Bootstrap (`#f8f9fa`, `#e9ecef`, `#495057`, `#dee2e6`, `#6c757d`), `#3d3856`, `#2a2640`, `#e0483f`, lavandas `#e2d9fb`, `#ddd3fb`, `#d9cffb`, `#eeecf7`, amarillos y rojos suaves de estado, y `#4a2fc0` de hover. Los más graves en oscuro: `#f8f9fa`/`#e9ecef` de fondo con texto de token.
- `--kc-canvas` (`#f7f8fc`) se mapea a `surface-2` en oscuro, sin equivalente claro exacto.
- Los literales de las pantallas de ubicaciones, conteos, órdenes de compra e indicadores no son de este bloque.

## Pruebas
`inv-tokens.test.js` (claro contra `fixtures/inv-claro-97fac7ff.json`, sin blancos ni acento literal en fondo/borde, par oscuro con tokens existentes, bodegas oscuro solo con tokens, conteos). Gradientes 0 y primarios 0, antes y después.
