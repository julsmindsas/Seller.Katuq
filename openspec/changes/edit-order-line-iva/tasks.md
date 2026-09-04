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
- [x] 3.1 Contract tests backend — `functions/scripts/test-order-line-iva-edit.js`, **47/47 PASS** (`npm run test:order-line-iva-edit`). Test PURO: no necesita emulador ni Java; inyecta un Firestore falso vía `admin.firestore` antes de requerir el controlador y reusa los dos trucos de aislamiento de `tests/inventory/orderControllerHttpSmoke.emulator.test.js` (stub del módulo de email + captura de `setInterval`). Cubre los 5 requirements EARS: edición válida con recálculo canónico (19%→5%: IVA 38.000→10.000, total 238.000→210.000), IVA 0% como cambio legítimo, `LINE_MISMATCH`, `STALE_WRITE` con `serverVersion`, bloqueo por `nroFactura` y por `pdfUrlInvoice`, auditoría acumulativa en `ivaOverrideHistory`, write-set cerrado a `orders` (el maestro de productos nunca se escribe y los precios del snapshot quedan intactos), 403 multi-tenant, 404 y 400 por parámetros faltantes
- [x] 3.1.1 **Hueco encontrado por el test y corregido**: el endpoint validaba `isNaN(nuevoIva) || nuevoIva < 0`, así que aceptaba y persistía tarifas fuera del catálogo (ej. 37%). Ahora restringe a `[0, 5, 8, 19]` — mismo catálogo que venta asistida — y responde 400 `IVA_NOT_ALLOWED`. Retrocompatible: son exactamente los valores que el frontend ya envía
- [x] 3.2 Build: `node --check` limpio en `controllers/orders.js` y `routers/orders.js`; `npx tsc --noEmit` limpio y `ng serve` recompiló sin errores tras cada cambio
- [x] 3.2.1 Sin regresión cruzada en los tests de IVA vecinos: `test-iva-persist-option-a.js` **8/8 PASS** (D-201) y `test-siigo-invoice-line-iva.js` **7/7 PASS** (D-239)
- [x] 3.3 Prueba manual en navegador sobre un pedido real, ejecutada por el usuario (2026-09-04) contra el front en `:4200` y el backend local en `:3300` con el fix de 3.1.1 cargado: el cambio de IVA recalculó los totales correctamente y los tres guardarraíles se comportaron como especifica el delta — pedido ya facturado rechazado, pedido congelado bloqueado, y tarifa fuera del catálogo (37%) rechazada con 400 `IVA_NOT_ALLOWED`
- [x] 3.4 Cierre registrado contra **D-135** en `specs/CONTRACT.md`
- [ ] 3.5 Actualizar la tarea ClickUp `wdu9v75nat` — pendiente (fuera del alcance de la sesión de código)
