## Why

Daniel (2026-10-09): "todas las pantallas de configuración falta modernizar". Revisadas en producción con su sesión (Julsmind), las del menú **Configuración** están así:

- **Enlaces rotos (404):** "Planes y suscripciones" (`empresas/planes`), "Facturación" (`empresa/facturacion`) y "App de entregas" (`app-entregas`): las rutas no existen.
- **Listas con la plantilla vieja** (título azul `fc-secondary fs-24`, botón Excel verde `btn-success`, tabla `custom-datatable` sin tema): Usuarios, Medios de pago, Medios de pago POS, Zonas de cobro, Categorías, Bodegas, Canales de venta, Ocasiones, Géneros, Tipos de cliente, Descuentos y promociones, Formas de entrega, Tipos de entrega y Tiempos de entrega.
- **Pantallas especiales viejas:** Módulos variables (tres botones sueltos centrados), Configuración de Dropshipping (encabezado azul `#2196f3`-like y bloque negro de desarrollo), Notificaciones (botones verdes), Campos personalizados y Bodegas por canal (aceptables, se alinean).
- Ya modernas: Mi Empresa (consola, D-383), Roles, Integraciones.

Decisión: **D-400** en `specs/CONTRACT.md`.

## What Changes

- Base común `src/app/shared/styles/_config-pagina.scss` (mixin `config-pagina`, prefijo `cfg-`): encabezado en tarjeta (eyebrow "Configuración", título 22px/800, subtítulo, acciones), botones primario/secundario/peligro del design-system, tarjeta 16px, avisos en par fuerte/suave, empty state y la tabla PrimeNG tematizada (cabecera UPPERCASE muted, hover `#faf9ff`, paginador en acento).
- Cada pantalla de la lista reemplaza su "Header Standar" y su envoltura por la base, **sin cambiar** columnas, filtros, botones, eventos, modales, servicios ni textos funcionales (el botón "Excel" queda como secundario).
- Menú: "Planes y suscripciones" → `/pricing`, "Facturación" → `/billing` (las páginas reales), con `permisoPrevio` para que los roles guardados con la ruta vieja lo sigan viendo; "App de entregas" se quita (no hay pantalla).

## Capabilities

### New Capabilities
<!-- Ninguna -->

### Modified Capabilities
<!-- Ninguna: aplica el design-system existente. -->

## Impact

- Front: los componentes listados, `nav.service.ts` (menú) y el parcial nuevo. Backend sin cambios.

## No-goals

- No cambia qué guarda cada pantalla ni sus validaciones; no toca los modales de crear/editar salvo su encabezado si comparten el bloque.
- No toca Mi Empresa, Roles, Integraciones ni Automatizaciones (flows).

## Riesgos

- Medios de pago, zonas de cobro y descuentos alimentan la venta: solo cambia la presentación.
- Quitar "App de entregas" del menú: no había pantalla; si se crea, se vuelve a agregar.
