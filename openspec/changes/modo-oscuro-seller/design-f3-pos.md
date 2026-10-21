# F3 · POS (pos2)

Tarea 4.4.4, bloque TEMA-B16. Solo `.scss`; no se tocan montos, consecutivos, formas de pago ni eventos. Los widgets de pago (cash/card/ewallet, cierre de caja y su historial) son de B12.

## Mapeo (solo valores con token de igual valor en claro)
- Fondo `#fff`/`white` a `surface`; `#5F3FE0` a `accent`; `#efe9ff` a `accent-soft`; `#E6F7EE` a `ok-soft`; `#faf9ff` a `row-hover`; `#ececf4` a `line`.
- Texto `#5F3FE0` a `accent-ink`; `#211F3A` a `ink`; `#5b5878` a `body`; `#8f8bab` a `muted`. Borde de acento a `accent-ink`.
- Calculadora: `$calc-primary`, `-dk`, `-op`, `-bg`, `-surface`, `-text` a `accent`, `accent-hover`, `accent-ink`, `surface`, `chip-bg`, `ink`.
- `--kc-*`: el claro sigue siendo el de `kc-tokens`. Cada raíz (pos, customer-section, product-category, payment-selector, cart-summary, pos-checkout, product, warehouse-selector) suma `:host-context(body.dark-only) { @include pos-kc-oscuro; }` con el juego de `_pos-oscuro.scss`.

## Deuda (Daniel / 4.6)
- Sin token con su valor claro, quedan literales: `$calc-fn` (`#ece9f7`, además lo usa `darken()`), `#f5f6fb`, `#232733`, `#e4e5ee`, `#c9b9f7`, `#e2d9fb`, `#f7e2be`, `#eccf9c`, `#eeeeee`, y el `color: #fff` sobre rellenos propios.
- `reporte-cierre` no se tocó: es el comprobante que también se imprime, con texto oscuro propio; pasarle fondo oscuro lo dejaría ilegible. Queda para una decisión aparte.
- Los widgets de B12 que incluyen `kc-tokens` en su propio `:host` (cash-closing, historial, card/cash/ewallet) no reciben el par oscuro de este bloque.

## Pruebas
`pos-tokens.test.js` (claro contra `fixtures/pos-claro-22085d8e.json`, sin blancos ni acento literal en fondo/borde, par oscuro con tokens existentes, conteos). `comparar-claro` sin diferencias en las 10 hojas. Gradientes 0 y primarios 0, antes y después.
