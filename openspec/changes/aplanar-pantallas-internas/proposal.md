## Why

Después de modernizar las pantallas públicas (D-398), Daniel pidió revisar también las páginas viejas internas. El design-system (`openspec/specs/design-system/spec.md`, D-131) pide superficies planas, sin gradientes, y prohíbe los primarios paralelos `#2196f3`, `#4361ee`, `#2563eb`, `#5c6ac4` y `#667eea`. Un inventario de solo lectura del 2026-10-09 (`src/app/**/*.{scss,css,html}`) encontró **621 gradientes y 258 usos de primarios prohibidos en 38 módulos**. Los que más tienen: ventas (119/46), shared/components (85/47), despachos (85/3), inventarios (12/57), katuq-flow (59/1), producción (48/10), integraciones (40/7), video-agent (28/18), agent-builder (44/1) y billing (6/20).

Decisión: **D-399** en `specs/CONTRACT.md`.

## What Changes

- Cada gradiente **decorativo** (fondos, botones, tarjetas, encabezados, insignias) pasa a un color plano: el color propio del elemento, o el par fuerte/fondo suave del tema para los semánticos.
- Cada primario prohibido pasa al acento canónico `#5F3FE0` (o `#4a2fc0` en hover/oscuro, `#efe9ff` en fondos suaves).
- **Se conservan**, porque no son decoración: los brillos de carga (skeleton/shimmer de 3+ paradas), las capas transparentes sobre imágenes o mapas (`transparent`/alfa 0), los degradados que dibujan datos (barras de progreso con varias zonas, mapas de calor) y los textos con `background-clip: text` (al aplanarlos desaparecería la letra).
- Solo estilos (SCSS/CSS y `style=""` en plantillas). Ni lógica, ni textos, ni estructura.

## Capabilities

### New Capabilities
<!-- Ninguna -->

### Modified Capabilities
<!-- Ninguna: aplica el design-system existente sin cambiar sus requisitos. -->

## Impact

- Front únicamente: SCSS de los 38 módulos del inventario. Sin backend.

## No-goals

- No rediseña la estructura ni el flujo de ninguna pantalla interna (eso va pantalla por pantalla, con su propio cambio).
- No migra `_katuq-tokens.scss` (`#8b5cf6`) ni la discrepancia abierta del design-system.
- No toca `katuq-flow` (editor de flows en React compilado, con drift fuente↔bundle: ver memoria `reference_flows_frontend_architecture`) ni Regístrese (`diagnostic-survey`, aprobado por Daniel).

## Riesgos

- Ventas y despachos son módulos sensibles, pero aquí solo cambia el color de fondo de elementos, no la lógica de orders.
- Un gradiente que en realidad lleva contraste (texto blanco sobre fondo oscuro degradado) debe quedar con un color plano del mismo rango, para que el texto se siga leyendo.
