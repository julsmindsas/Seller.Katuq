# F2c: `_katuq-modal.scss` y widgets de pago de POS2 (tarea 4.3)

Ticket 1180, bloque TEMA-B12, D-518. **Sensible** (POS y pagos): solo `.scss`, sin tocar `.ts`, `.html`, montos, validaciones, eventos ni textos. Depende de F1 (tokens `--ds-*`).

## Qué cambia

1. **`_katuq-modal.scss`** (base): el mixin `km-modal` emite, en el ámbito del widget, dos juegos de variables.
   - Claro: `--kc-accent-texto` (= `--kc-accent`) y 36 `--km-*` con el literal de siempre (gris, línea, lila suave, etc.).
   - Oscuro, con `@at-root :host-context(body.dark-only)` (el modal cuelga del `<body>` por NgbModal): cada `--kc-*` y `--km-*` toma su `var(--ds-*)` por rol. `--kc-accent` queda como relleno (`--ds-accent`); el acento como texto o ícono va en `--kc-accent-texto` (`--ds-accent-ink`).
   - Los `#fff` de superficie pasan a `var(--ds-surface)`; el texto sobre el botón primario, a `var(--ds-on-accent)`.
2. **Widgets** (`cash-payment`, `card-payment`, `ewallet-payment`, `cash-closing`, `cash-closing-history`): los literales de fondo, borde y texto pasan a `var(--ds-*)` (blanco y on-accent) o a `var(--km-*)`/`var(--kc-*)`. `ewallet-payment` no cambia: solo usa el mixin.
3. **`opinar-modal`**: las variables Sass pasan a `var(--ds-*)` con el mismo valor claro; `$accent-ink` para el acento como texto.
4. **`src/styles.scss`** (`.katuq-modal`): verificado, solo radio y sombra `rgba`; no pinta colores, no se toca.

## Por qué `--km-*` y no solo `--ds-*`

Los grises y lilas del modal (`#e4e5ee`, `#c9b9f7`, `#fbfcfe`, `#2c3e50`…) no tienen un `--ds-*` con ese valor claro; mapearlos directo cambiaría el claro. La variable con el literal por defecto mantiene el claro idéntico y da el par oscuro por rol.

## Se deja como está

- Todo `@media print` (cierre de caja e historial): el papel es blanco, los literales se quedan.
- Rellenos con texto blanco (`#3498db`, `#2ecc71`, `#6c757d` de los botones del bloque viejo): se ven igual en oscuro.
- Bloque viejo de `card-payment` (`#f8f9fc`, `#e3e6f0` del header y pie): ya lo pisa la piel del mixin.
- `opinar-modal`: bordes `#ddd3fb`, `#d9cffb` y el botón deshabilitado `#d8d4ea` sin token equivalente. Pregunta abierta para Daniel (un token nuevo de línea lila).

## Pruebas

`tests/theme/modal-tokens.test.js` (en `test:theme`, 14 pruebas): claro idéntico por archivo contra el fixture `tests/theme/fixtures/modal-claro-c18c863b.json` con las variables propias resueltas (`tests/theme/modal-claro.js`); par oscuro de cada `--km-*`; contraste >= 4,5:1; sin blancos ni hex oscuros sueltos fuera de impresión; gradientes y primarios en 0; impresión intacta. `comparar-claro.js` marca estos archivos como cambiados porque no resuelve `--km-*`; no es un cambio visual.

## Cierre (lo corre el orquestador)

Build sin errores, capturas del modal de efectivo, tarjeta, billetera, cierre de caja e historial en claro (idénticas) y oscuro a 1440 y 390 px, y la impresión del cierre.
