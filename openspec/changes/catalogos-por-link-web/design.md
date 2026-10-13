## Context

D-141 (2026-07-29) construyó los catálogos por link en tres frentes:
- **Backend** `/v1/catalogos/*`: en producción.
- **Vitrina pública** `/cat/:token`: en producción, dentro del bundle actual.
- **Administración**: solo en iOS (`Katuq.iOS.Gestion/Sources/Features/Catalogos`).

Este cambio lleva la administración a la web, sin tocar el backend.

Contrato del backend, verificado leyendo `controllers/catalogos.js`:

| Llamada | Cuerpo / respuesta |
|---|---|
| `GET /v1/catalogos/all` | `{data: Catalogo[]}` por `company`, ordenado por `fechaCreacion` desc. Sin productos resueltos. |
| `GET /v1/catalogos/:id` | `{data: Catalogo & {productos: ProductoVitrina[]}}`; cada producto trae `productoId, titulo, referencia, precioConIva, disponible, imagen`. |
| `POST /v1/catalogos/create` | `{nombre, productoIds[1..200], descripcion?, fechaVencimiento?}` → 201 `{data: {id,...}}`. |
| `PUT /v1/catalogos/edit` | `{id, ...campos}`; solo actualiza lo que llega. `productoIds: []` → 400. |
| `POST /v1/catalogos/:id/share-token` | `{data: {token}}`; idempotente, devuelve el token existente si ya había uno. |

`Catalogo` = `id, nombre, descripcion, activo, fechaVencimiento, publicToken?, productoIds, vistasCount, solicitudesCount, fechaCreacion`.

## Goals / Non-Goals

**Goals:** llegar a la misma funcionalidad que iOS en la web, con la base visual D-400, sin cambios de backend ni de datos de roles.

**Non-Goals:** borrar catálogos, cambiar la vitrina, unificar con los catálogos del constructor de sitios, métricas nuevas.

## Decisions

1. **Ubicación: submódulo lazy dentro de `components/cotizaciones/`**, con rutas `cotizaciones/catalogos` y `cotizaciones/catalogos/:id`. Daniel aprobó dejarlo bajo Cotizaciones porque lo que pide el comprador llega como cotización. Se usa un módulo propio (`catalogos-link/`) cargado con `loadChildren` desde `cotizaciones-routing`, para no engordar el chunk de cotizaciones.
   - *Alternativa descartada:* un módulo de primer nivel en `routes.ts`. Habría que registrar otra ruta raíz para algo que pertenece a Cotizaciones.

2. **Visibilidad del menú con `permisoPrevio: "cotizaciones"`.** `nav.service.ts` ya muestra un hijo si el rol tiene autorizado su `permisoPrevio`. Así la entrada aparece para quien ya ve Cotizaciones, sin escribir en `roles.menus` de Firestore. Los administradores la ven por la regla del ticket 1177. Lleva la insignia "NUEVO" hasta el 2026-12-31.
   - *Alternativa descartada:* agregar la ruta a `roles.menus` de cada rol. Es una escritura masiva en producción y es justo la trampa por la que los módulos nuevos nacen invisibles.

3. **Selector de productos: se reusa `SelectorProductosModule`** (sitios), que ya comparten Sitios y Campañas. Trabaja con ids y resuelve la foto y el precio con `SitiosService.buscarProductos`/`productosPorIds`. Se importa el módulo; no se copia el componente.
   - *Alternativa descartada:* construir otro selector. Sería una tercera implementación de lo mismo.

4. **Servicio `CatalogosLinkService extends BaseService`** con las 5 llamadas. Nada de `HttpClient` directo; el interceptor pone la autenticación y `company`.

5. **El link se arma con `window.location.origin + "/cat/" + token`**, igual que cotizaciones (`cotizacion-editor.component.ts:2220`, `/c/<token>`). Funciona en `sellercenter.katuq.com` y en local sin configuración extra.

6. **El estado visible se deriva en el front:** `activo && !vencido` → Activo; `!activo` → Apagado; `activo && vencido` → Vencido, con la misma regla que `catalogoVencido` del backend. Se calcula en una función pura (`estado-catalogo.ts`) con prueba unitaria.

7. **Editar envía solo lo que cambió**, comparando el formulario contra el original. Guardar se deshabilita si no hay cambios, igual que hace iOS. Prender y apagar envía `{id, activo}` y nada más.

8. **WhatsApp:** `https://wa.me/?text=<nombre + link>` en una pestaña nueva. No requiere número.

9. **Diseño:** `@include config-pagina` con `cfg-pagina`, `cfg-cabeza`, `cfg-card`, `cfg-aviso`, `cfg-vacio` y `cfg-btn`, más una tabla PrimeNG en la lista. La confirmación de apagar usa Swal; `confirm()` está prohibido. Las clases nuevas no contienen "p-" y los spans con `*ngIf` llevan color propio (trampas de CSS global).

## Risks / Trade-offs

- [El vendedor comparte un link de un catálogo apagado o vencido] → aviso visible junto al link y estado destacado en la lista.
- [`GET /all` no trae los productos resueltos, así que la lista no puede mostrar cuántos están agotados] → la lista muestra solo el total (`productoIds.length`); el aviso de agotados vive en el detalle, que sí los resuelve.
- [`getAll` lee la colección completa de la empresa, sin paginar] → aceptable con los volúmenes actuales (decenas por empresa). No se agrega caché (regla de arquitectura).
- [El selector depende de `SitiosService`] → acoplamiento ya aceptado por Campañas (D-318). Si se mueve, se mueve para los tres.

## Migration Plan

Solo frontend. Se despliega con el release normal (desde un worktree limpio, según la memoria del equipo). Rollback: quitar la entrada del menú y redeplegar. El backend no cambia.

## Open Questions

Ninguna bloqueante.
