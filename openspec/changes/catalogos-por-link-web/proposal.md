## Why

Los catálogos por link (D-141) solo se pueden armar desde la app iOS. El backend y la página que abre el comprador (`/cat/<link>`) ya están en producción, pero el vendedor que trabaja en la web no tiene dónde crearlos ni compartirlos. El servicio existe y la mayoría de los comercios no lo puede usar.

## What Changes

- Nueva entrada **"Catálogos por link"** en el menú **Cotizaciones** (ubicación aprobada por Daniel el 2026-10-13), porque lo que pide el comprador llega como cotización.
- Nueva pantalla de lista con nombre, número de productos, estado (activo, apagado o vencido), vistas y pedidos recibidos.
- Crear un catálogo con nombre, descripción opcional, fecha de vencimiento opcional y productos elegidos con el selector visual que ya usan Sitios y Campañas.
- Detalle del catálogo: generar el link, copiarlo, compartirlo por WhatsApp, prenderlo o apagarlo, editar sus datos y productos, y ver qué productos no ve el comprador por estar agotados.
- La entrada **"Mi página web › Catálogos"** (páginas del constructor, ticket 1175) **no cambia**.
- Sin cambios de backend, sin endpoints ni colecciones nuevas: se usan `/v1/catalogos/create|all|edit|:id|:id/share-token`, ya desplegados.

## Capabilities

### New Capabilities
- `catalogos-por-link-web`: el vendedor administra desde la web sus catálogos compartibles por link (listar, crear, editar, compartir, prender o apagar), con el mismo alcance que la app iOS.

### Modified Capabilities
<!-- Ninguna: la vitrina pública y el backend no cambian. -->

## No-goals

- Cambiar la vitrina pública `/cat/<link>`, el backend de catálogos o la forma en que la solicitud se convierte en cotización.
- Borrar catálogos (el backend no lo ofrece; se apagan).
- Unificar con los catálogos del constructor de sitios.
- Métricas nuevas, más allá de los contadores `vistasCount` y `solicitudesCount` que ya existen.

## Riesgos sobre módulos sensibles

- **Pedidos e inventario:** no se tocan. El catálogo solo lee `products`, y la solicitud crea una cotización que no descuenta stock (comportamiento existente).
- **Consecutivos:** no se tocan.
- **Riesgo propio:** el link es público. Apagar un catálogo debe cortar el acceso de inmediato. El backend ya responde 404 a los catálogos apagados o vencidos; la pantalla debe dejar claro el estado para que nadie comparta un link apagado.

## Impact

- Frontend: módulo nuevo lazy dentro de `components/cotizaciones/` (lista y detalle), un servicio que extiende `BaseService`, una entrada en `nav.service.ts` y la reutilización de `SelectorProductosModule`.
- Backend, Firestore y app iOS: sin cambios.
- Decisión a registrar en `specs/CONTRACT.md` como D-416.
