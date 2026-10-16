## Context

- `VentaAsistidaUnicaComponent` (`/ventas/venta-asistida`) extiende `CrearVentasComponent` (`/ventas/crear-ventas`). Lo que se haga en la base sirve para las dos pantallas.
- El estado de la venta en curso vive en el navegador:
  - `CartSingletonService` + `localStorage['carrito']`: las líneas;
  - `sessionStorage['cliente']`: el cliente;
  - `localStorage['selectedCity']` y `localStorage['warehouse']`: ciudad y bodega;
  - `pedidoGral`: envío, facturación y notas.
- `newPedido()` → `limpiarCacheCompleto()` borra todo al empezar otra venta.
- **Ya existe un camino de restauración**, el de "Convertir a pedido" de una cotización (spec 008.2, `cotizacion-convert.service.ts`):
  1. escribe `sessionStorage['cliente']` y `sessionStorage['cotizacionVentaCtx'] = { bodega, ciudad, items }`;
  2. navega con `?documento=`;
  3. cuando `buscar()` encuentra al cliente, `aplicarContextoConversionSiAplica()` carga las líneas con `cartService.addToCart` y fija la bodega y la ciudad con `aplicarCambioBodega`/`aplicarCambioCiudad`, sin los handlers que vacían el carrito.
  4. Después de crear el pedido, `marcarCotizacionConvertidaSiAplica()` consume el marcador `cotizacionOrigen`.
- Familia Administrador: `isAdminFamilyRole(req.userInfo.role)` en `middleware/requireRole.js`. El rol viene en el JWT.

## Decisions

### D1. Retomar reutiliza el camino de la cotización

No se reconstruyen a mano los hijos (catálogo, carrito, checkout). Retomar hace lo mismo que "Convertir a pedido":
1. escribe `sessionStorage['cliente']` y un contexto con `{ bodega, ciudad, items }` en la misma forma de `itemsCtx` de la cotización;
2. agrega `sessionStorage['borradorVentaCtx'] = { id, envio, facturacion, notasPedido }`;
3. navega a `/ventas/venta-asistida?documento=…`.

`aplicarContextoConversionSiAplica()` se generaliza para leer cualquiera de los dos contextos. El de borrador además aplica `envio`, `facturacion` y `notasPedido` a `pedidoGral` después de cargar las líneas. Así no hay `setTimeout` nuevos: el punto de enganche es el mismo que ya funciona, el cliente encontrado.

**Borrador sin cliente** (solo productos): se aplica el contexto en `ngOnInit`, después de `newPedido()`, sin esperar a `buscar()`. Las líneas se cargan, y la bodega y la ciudad se fijan igual.

### D2. Guardar

El botón "Guardar borrador" está visible si hay cliente o al menos una línea en el carrito. El borrador guarda:
- `items`: las líneas del `CartSingletonService` en forma `itemsCtx` (producto, configuración, cantidad, overrides, descuento por línea y combo);
- `bodega`, `ciudad`, `cliente` (el objeto que hay en `sessionStorage['cliente']`), `envio`, `facturacion` y `notasPedido`;
- `resumen`: `{ clienteNombre, documento, lineas, totalEstimado }`, para la lista sin abrir el estado;
- `nombre`: opcional, con un máximo de 80 caracteres, pedido con un Swal.

Después de guardar se llama `newPedido()`. Si el borrador venía de uno retomado (`borradorId` en memoria), se actualiza ese mismo; no se crea otro.

### D3. Precios y existencias al retomar

Antes de cargar las líneas, se piden los productos vigentes por `cd` con el servicio que ya usa el catálogo. Por cada línea:
- **Producto que no existe o está inactivo:** se quita y se avisa.
- **Producto vigente:** se cambia `producto` por el actual, conservando configuración, cantidad, overrides y descuento.
- **Precio cambiado** (sin override manual): se avisa "X pasó de $A a $B".
- **Existencia en la bodega del borrador menor a la cantidad:** se avisa "sin existencias suficientes". La línea no se quita; decide el vendedor.

Un solo Swal resume los avisos.

### D4. Backend `/v1/sales-drafts`

Router con `auth` + `requireJwtTenant`. La empresa sale de `req.tenant` y el dueño de `req.userInfo.email`.

| Ruta | Qué hace |
|---|---|
| `POST /` | Crea. El cuerpo `{ nombre, estado, resumen }` pasa por una lista blanca. Tamaño máximo 900 KB (límite de Firestore). |
| `GET /` | Lista. Un vendedor recibe solo los suyos; la familia Administrador, los de la empresa. Ordena por `updatedAt` desc. No devuelve `estado`, solo `resumen`. |
| `GET /:id` | Devuelve el borrador completo si es de la empresa y (es suyo o es Administrador). Si no, 404. |
| `PUT /:id` | Reemplaza `nombre`, `estado` y `resumen`, con las mismas reglas de acceso. |
| `DELETE /:id` | Borra, con las mismas reglas. |

Documento en `salesDrafts`: `{ company, ownerEmail, ownerName, nombre, resumen, estado, createdAt, updatedAt }`.

**Vencimiento sin cron nuevo:** `GET /` y `GET /:id` borran en la misma llamada los de la empresa con `updatedAt` de hace más de 30 días, y no los devuelven. La lista calcula `venceEnDias`.

Índice compuesto: `salesDrafts (company, updatedAt desc)`. Para un vendedor, el filtro por `ownerEmail` se hace en memoria; son pocos por empresa.

### D5. El borrador se borra al crear el pedido

En el mismo punto donde hoy se llama `marcarCotizacionConvertidaSiAplica(nroPedido)`, después de un `createOrder` exitoso: si hay `borradorId`, `DELETE /v1/sales-drafts/:id`. Si falla, no interrumpe el flujo. Si `createOrder` falla, no se toca el borrador.

### D6. Interfaz

Componente `borradores-venta` con la base D-400 (`cfg-*`):
- un botón "Mis borradores (N)" en la cabecera de la venta;
- un modal con la tabla: cliente, líneas, total estimado, quién lo guardó, fecha, "vence en N días" y las acciones Retomar y Eliminar (con confirmación Swal);
- estado vacío con ícono.

## Risks / Trade-offs

- **[Llave `carrito` compartida con el POS]:** fuera de alcance (no-goal). Retomar escribe el carrito justo antes de usarlo, así que no empeora.
- **[`estado` grande]:** los objetos `producto` completos pesan. Se guarda lo mismo que guarda la cotización, que ya funciona en producción. Si pasa de 900 KB se responde 413 con un mensaje claro.
- **[Dos personas retoman el mismo borrador]:** las dos pueden crear su pedido. El segundo `DELETE` responde 404 y se ignora. Es aceptable: no hay reserva de inventario ni de consecutivo.

## Migration Plan

Colección nueva, sin datos que migrar. Se despliega el backend antes del front. Rollback: ocultar el botón; los borradores vencen solos.
