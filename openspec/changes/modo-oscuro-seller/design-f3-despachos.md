# F3 · Despachos

Bloque TEMA-B15 (tarea 4.4.3). Solo `.scss`; el claro queda idéntico. Sensible (despachos): cambio mínimo, sin tocar `.ts`, `.html`, `formaEntrega`, eventos ni textos.

Archivos: `despachos/despachos.component.scss` (la ruta del encargo omitía la carpeta `despachos/despachos/`), `components/tabla-pedidos`, `components/enviame/tracking-details` y `components/enviame/rates-modal`.

## Mapeo (solo valores con token de igual valor en claro)

| Antes | Después |
|---|---|
| `background[-color]: #fff / #ffffff / white` | `var(--ds-surface)` |
| `background: #faf9fe` / `#efe9ff` / `#e6f7ee` | `surface-2` / `accent-soft` / `ok-soft` |
| `background: #5F3FE0` o `var(--primary-color)` (relleno) | `var(--ds-accent)`; `#4a2fc0` a `accent-hover` |
| `color: #5F3FE0` o `var(--primary-color)` (texto) | `var(--ds-accent-ink)` |
| `border*: ... #5F3FE0` / `var(--primary-color)` | `var(--ds-accent-ink)` |

Las líneas con gradientes, `rgba()` o funciones de Sass no se tocan. Tracking-details: bloque `:host-context(body.dark-only)` que apunta sus variables propias (`--primary-color`, `--text-*`, `--bg-*`, `--border-color`, semánticos) a `var(--ds-*)`; el `:root` claro queda igual.

## Deuda (Daniel / 4.6)

- Sin token de igual valor claro: grises Bootstrap `#f8f9fa`, `#e9ecef`, `#dee2e6`, `#6c757d`, `#495057`, `#f5f5f5`, `#f1f3f5`, `#e5e5e5`; slate `#1e293b`, `#64748b`, `#f1f5f9`, `#e2e8f0`; `#d9cffb`; y `$katuq-success/warning/danger` (`#10b981`, `#f59e0b`, `#ef4444`) distintos de `--ds-ok/warn/err`. En oscuro quedan claros hasta decidir un token o cambiar el claro.
- `color: #fff` sobre rellenos propios no se toca. `#7c5cff` (foco) no se pasó a token.
- Tracking-details: el `:root` dentro del componente puede quedar escopado por Angular; el bloque oscuro sí define las variables. Mirarlo en capturas.
- Conteos antes y después: gradientes 0/0/4/0 y primarios prohibidos 0 en los cuatro archivos.

## Pruebas

`tests/theme/despachos-tokens.test.js` (en `test:theme`): claro idéntico frente a `fixtures/despachos-claro-e74d73e3.json` (generado con `despachos-claro.js`), sin blancos ni acento literales, par oscuro con tokens existentes, conteos sin subir. `comparar-claro` da «claro idéntico» en tres archivos; en tracking-details solo difiere `var(--primary-color)` frente a `#5f3fe0`, que valen lo mismo (la herramienta no resuelve variables propias).

## Ajustes por la compuerta de F2a

En 7 reglas de `despachos.component.scss` el fondo es un literal claro sin token (`#f8f9fa`, `$katuq-purple-50`, `$katuq-gray-*`); su texto de acento se queda en `#5F3FE0` literal para no emparejar un fondo claro con `accent-ink` (claro en oscuro). Pasan a token cuando el fondo tenga token. El techo de deuda de `var(--primary-color)` (`conteos.test.js`) baja de 42 a 37: los rellenos de tracking-details dejan de usarlo.
