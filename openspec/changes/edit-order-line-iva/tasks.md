# Tasks

## 1. Backend: endpoint de edición de IVA por línea
- [x] 1.1 Nuevo handler `exports.editLineaIva` en `functions/controllers/orders.js`, ruta dedicada `POST /v1/orders/edit-linea-iva` (convención POST del router, no PATCH), separado de `exports.edit`
- [x] 1.2 Cargar el pedido dentro de una transacción, validar `_baseVersion` (mismo mecanismo 409 STALE_WRITE que `edit`) y validar `carrito[lineIndex].producto.cd === productoCd` recibido (si no coincide, 409 `LINE_MISMATCH`); también valida `company` del header vs. la orden (403)
- [x] 1.3 Bloquea con 409 `ORDER_ALREADY_INVOICED` si `order.nroFactura` o `order.pdfUrlInvoice` ya existen
- [x] 1.4 Aplica `_ivaManualOverride` en la línea y recalcula totales llamando `orderCalculationService.calculateOrderTotals` (reuso, sin reimplementar cálculo)
- [x] 1.5 Persiste el pedido actualizado + `ivaOverrideHistory` (línea, IVA anterior/nuevo, usuario, fecha) — sin colección Firestore nueva
- [x] 1.6 Ruta registrada en `functions/routers/orders.js` con `auth` (mismo permiso que `edit`, según decisión del checkpoint humano)

## 2. Frontend: servicio y componente
- [x] 2.1 `editarIvaLineaPedido()` en `src/app/shared/services/ventas/ventas.service.ts` (extiende `BaseService`, traduce 409 igual que `editOrder`)
- [x] 2.2 Componente nuevo `EditarIvaLineaPedidoComponent` (`src/app/components/ventas/editar-iva-linea-pedido/`) que lista las líneas del pedido y permite elegir una + su nuevo IVA (0/5/8/19, mismo patrón que `carrito.component.ts:249-348`), con SCSS en tokens del tema `openspec/specs/design-system/spec.md`. Registrado en `ventas.module.ts`
- [x] 2.3 Acción "Editar IVA" en el menú de opciones de `list.component.html`/`.ts`, mismo criterio de permiso que "Editar/Eliminar Descuento" (`canModifyProducts || isAdminUser`)
- [x] 2.4 `onIvaLineaActualizada()` solo hace toast + `refrescarDatos()` — no recalcula nada en el cliente

## 3. Verificación y cierre
- [ ] 3.1 Contract tests backend: edición válida, línea desalineada (conflicto), 409 por lock optimista, bloqueo por pedido ya facturado, verificación de que el producto/precio/catálogo permanecen sin cambios — **pendiente, no implementado en esta sesión**
- [x] 3.2 Build: `node --check` limpio en `controllers/orders.js` y `routers/orders.js`; `npx tsc --noEmit` limpio y `ng serve` recompiló sin errores tras cada cambio
- [ ] 3.3 Prueba manual en un pedido de prueba real (navegador): **no realizada en esta sesión** — pendiente antes de cerrar la tarea ClickUp
- [ ] 3.4 Registrar cierre contra D-135 en `specs/CONTRACT.md` + actualizar la tarea ClickUp `wdu9v75nat` — pendiente hasta completar 3.1 y 3.3
