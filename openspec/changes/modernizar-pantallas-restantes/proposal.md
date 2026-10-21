## Why

Pedido de la usuaria (2026-10-20): "revisa qué pantallas falta por migrar al diseño nuevo, para tener un estándar" y luego "dale, actualiza el diseño".

Inventario de solo lectura sobre las 174 pantallas con ruta (`feature/venta-asistida-mejorada`, 2026-10-20). Unas 71 ya siguen la regla de diseño Katuq (D-398, D-399 y D-400, más los módulos rehechos aparte). Las demás conservan la plantilla vieja: `container-fluid` + `card` + `card-header`/`module-header`, botones de Bootstrap (`btn-primary`, `btn-success`), títulos `fc-secondary`, el morado viejo `#8b5cf6` escrito en el HTML, azules sueltos (`#7366ff`, `#6366f1`, `#3b82f6`) y `border-left` de acento. En toda la app quedan 195 `#8b5cf6`/`#a78bfa`, 193 azules sueltos y 27 `btn-success`.

Decisión: **D-516** en `specs/CONTRACT.md`.

## What Changes

- La base `shared/styles/_config-pagina.scss` suma piezas para pantallas internas, todas como clases nuevas: `cfg-pill` (estado en par fuerte/suave), `cfg-stats`/`cfg-stat` (métricas planas), `cfg-form` (labels UPPERCASE e inputs lilas de 40 px) y pestañas PrimeNG dentro de `cfg-pagina`. Ninguna pantalla de D-400 usa esas clases, así que no cambian.
- Cada pantalla pendiente pasa a la base (`cfg-pagina`, `cfg-cabeza`, `cfg-card`, `cfg-btn`…) o, si ya tiene un tema propio plano, se limpia de residuos (azules, `#8b5cf6`, `btn-success`, `border-left`, colores escritos en el HTML).
- Grupos: productos; clientes, CRM y prospectos; inventario; logística (despachos, picking/packing, dropshipping); formularios "crear" de Configuración y seguridad; integraciones, flows, precios y facturación; IA (agent builder, video agente); inicio, dashboards y otras.

## Capabilities

### New Capabilities
<!-- Ninguna -->

### Modified Capabilities
<!-- Ninguna: aplica el design-system existente (D-131) y la regla de diseño Katuq (D-398/D-399/D-400). -->

## Impact

- Front: HTML y SCSS de las pantallas listadas en `tasks.md` y la base `_config-pagina.scss`. El único `.ts` permitido es `styleUrls`.
- Backend sin cambios.

## No-goals

- No cambian columnas, filtros, eventos, modales, servicios, validaciones ni textos funcionales. Un verificador compara los bindings de cada HTML contra el commit anterior (eventos, propiedades, directivas estructurales, referencias, interpolaciones y `formControlName`/`ngModel`) y debe dar cero diferencias.
- Quedan fuera, para cambios aparte diff por diff: Venta asistida, crear-ventas, Todos los pedidos (vista Tabla), POS (`ventas-pos`) y el dashboard de Producción. Son de más de 4.000 líneas y están en el flujo de pedidos.
- Quedan fuera: `katuq-flow`, Regístrese, `sitio-publico` y las páginas sin menú que conviene retirar (`dashboards/classic`, `pos/ventas`, `sample-page`, `maestros`, `live-audio`).
- No se reconcilia `_katuq-tokens.scss` (`#8b5cf6`) con el canon `#5F3FE0`: eso pide su propia propuesta (design-system, "Relación con `_katuq-tokens.scss`"). Las pantallas que se tocan usan el canon `#5F3FE0` de D-131.
- No se toca el modo oscuro (D-502). Llevar pantallas a la base deja menos hex sueltos para su fase F1.

## Riesgos

- **Módulos sensibles** (inventario, despachos, picking/packing): solo cambia la presentación. No se toca ningún `.ts` ni ningún servicio. El write-set de inventario no cambia porque no hay lógica en el diff. El verificador de bindings es obligatorio por archivo.
- **CSS global** (`[class*="p-"]`, `span.ng-star-inserted`, `h1 !important`): ninguna clase nueva contiene "p-", todo span con texto lleva color propio y los títulos llevan `!important`.
- **Sin revisión en el navegador en esta sesión** (no hay sesión de comercio): antes de publicar, alguien con sesión revisa cada pantalla a 1440 y 390 px.
