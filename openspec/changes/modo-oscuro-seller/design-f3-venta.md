# F3 · Crear venta y venta asistida

Bloque TEMA-B14 (tarea 4.4.2). Solo `.scss`; el claro queda idéntico. Sensible (ventas): cambio mínimo; sin tocar `.ts`, `.html`, precios ni facturación electrónica.

Archivos: `crear-ventas`, `venta-asistida-unica`, `carrito`, `checkout`, `catalogo/conf-product-to-cart`, `catalogo/ecomerce-products`. `entrega/pedido-entrega` no se toca: ningún `.ts` lo referencia y su `@import` de `katuq-tokens` no resuelve (hoja muerta). `facturacion` solo tiene `color: #fff`.

## Mapeo

| Antes | Después |
|---|---|
| `background[-color]: #fff / #ffffff / white` (con o sin `!important`) | `var(--ds-surface)` |
| `color: $cfg-accent` (texto, 3 sitios de crear-ventas) | `$cfg-accent-ink` |
| `color: var(--primary-color)` | `var(--primary-ink)`; en claro con el mismo valor que `--primary-color` |
| `:root` / `:host` propio (crear-ventas, checkout, ecomerce-products) | se conserva en claro; bloque `:host-context(body.dark-only)` que apunta a `var(--ds-*)` |

Bloque oscuro: `--primary-color` a accent, `--primary-ink` a accent-ink, `--primary-dark` a accent-hover, `--success/warning/danger-color` a ok/warn/err, `--gray-100/--light-color` a surface-2, `--gray-200` a line, `--gray-300` a line-strong, `--gray-400` a control-border, `--gray-500/600` a muted, `--gray-700` a body, `--gray-800/900/--dark-color` a ink.

Por qué no se cambia `--primary-color` directo a `var(--ds-accent)` en claro: su valor claro es `#6c4ce0` (y `#6C4CE0` en checkout), no `#5F3FE0`; cambiarlo movería el claro. Los rellenos que usan `var(--primary-color)` toman accent en oscuro por el bloque. El texto necesitaba una variable aparte (`--primary-ink`) porque accent (#5F3FE0) sobre superficie oscura no llega a 4,5:1.

## Deuda (4.6 / Daniel)

- `--primary-color` (#6c4ce0), `--primary-dark` (#4a2fc0 / #533bc4) y `--primary-light` (#8c6bff) no coinciden con la paleta en claro: se quedan, no se agrega ninguno.
- `:root` dentro de un componente con encapsulación emulada probablemente no aplica (Angular lo escopa); en crear-ventas esas variables pueden estar indefinidas en claro. No se verificó en navegador; el bloque oscuro sí las define.
- `--kc-*` (carrito, checkout, conf-product-to-cart) vienen del mixin `kc-tokens` de `katuq-comercial`, fuera del bloque: sus superficies en oscuro quedan para ese parcial.
- Sin token: `var(--white)` y `var(--surface, #fff)`, `#ffffff 60px` de franjas de carga, `color: #fff` sobre rellenos propios, y literales de venta-asistida-unica (verdes #17994F, lila #eee9fd).
- `--primary-dark` como texto (1 sitio) queda con accent-hover en oscuro: contraste por mirar en capturas.

## Pruebas

`tests/theme/ventas-tokens.test.js` (en `test:theme`): claro idéntico frente a `fixtures/ventas-claro-31bf8dbb.json` (generado con `ventas-claro.js`), sin fondos blancos literales, par oscuro con tokens existentes, texto con `--primary-ink`, y gradientes/primarios prohibidos sin subir.
