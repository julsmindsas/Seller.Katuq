# Tasks

## 1. Backend: maestro de combos
- [ ] 1.1 `functions/controllers/combos.js`: `create`, `edit`, `getAll` (filtrado por `company`, `ordenarPorCreadoDesc`), `remove` (soft-delete, `activo: false`) y `deletePermanent` (hard-delete) — espejo exacto de `descuentosPromociones.js` (rutas `remove`/`delete-permanent`, `descuentosPromociones.js` router líneas 74 y 92), whitelist `CAMPOS_EDITABLES` (`nombre`, `descripcion`, `productos`, `activo`), validación de `productos` no vacío y con `productoId` válido
- [ ] 1.2 `functions/routers/combos.js` montado en `/v1/combos` — registrar en `functions/index.js` junto a `descuentosPromociones` (`index.js:435,656`)
- [ ] 1.3 Verificar que `productoId` referenciado en un combo se valida contra la colección `products` al crear/editar (rechazar combos con productos inexistentes o inactivos)
- [ ] 1.4 `node --check` limpio en los archivos nuevos

## 2. Frontend: maestro cacheado
- [ ] 2.1 `MaestroService.getCombos()` (`GET /v1/combos/all`), `createCombo()`/`editCombo()` (`POST /v1/combos/create`/`/edit`) — mismo patrón que `getCategorias()`/`createCategorias()` (`maestro.service.ts:433-439`)
- [ ] 2.2 Agregar `combos` al `forkJoin` de `PedidosUtilService.getAllMaestros()` (`pedidos.util.service.ts:204-253`) con el mismo `catchError(() => of([]))` defensivo que el resto de maestros

## 3. Pantalla admin de combos
- [ ] 3.1 Componente de listado (espejo de `descuentos-promociones.component.ts`), filtro por activo/inactivo
- [ ] 3.2 Modal crear/editar combo con selector de productos: reusar el typeahead server-side de `crear-descuento-promocion.component.ts:207-232` en modo `ng-select[multiple]="true"` (no reimplementar la búsqueda)
- [ ] 3.3 Validación en UI: no permitir guardar un combo sin al menos 1 producto seleccionado

## 3b. Ruteo y visibilidad en el menú
- [ ] 3b.1 `path: 'combos'` en `proceso-routing.module.ts` (junto a `descuentos-promociones`, líneas 57-60), bajo el `AuthGuard` ya aplicado al módulo `proceso` — sin guard de rol adicional
- [ ] 3b.2 Item de menú "Combos" en `NavService` sin flags `isOnlySuperAdministrador`/`isOnlyAdmin` — visibilidad depende únicamente de `authorizedMenuItems`, mismo patrón que el item "Descuentos y Promociones" (`nav.service.ts:690`)
- [ ] 3b.3 Confirmar que el maestro de roles (módulo `/rol`) permite habilitar el nuevo path `combos` como cualquier otro path administrable por empresa (no debería requerir cambios si el maestro de roles ya es genérico por path, pero se verifica antes de dar por cerrado)

## 4. Venta asistida: agregar combo al carrito
- [ ] 4.1 Extraer de `agregarRapido` (`ecomerce-products.component.ts:1281+`) la lógica de "agregar un producto individual resolviendo cantidad mínima + precio por categoría + entrega por defecto" a un método privado reusable; `agregarRapido` sigue llamándolo sin cambio de comportamiento observable
- [ ] 4.2 Prueba de regresión manual: agregar un producto individual sin configuración vía "agregar rápido", confirmar comportamiento idéntico al actual antes/después del refactor
- [x] 4.0 Backend `POST /v1/productos/by-ids` (`productos.js::getByIds` + router) — batch fetch de productos por docId, no depender del catálogo paginado en memoria (hallazgo durante implementación, ver `design.md` Decisión 4)
- [ ] 4.3 `agregarCombo(combo)`: resuelve `combo.productos` vía `MaestroService.getProductsByIds()`; producto sin `requiereConfiguracion()` usa el método extraído en 4.1; producto con `requiereConfiguracion() === true` se agrega igual al carrito con `configuracion: null` y `_requiereConfiguracionPendiente: true`, sin abrir modal ni interrumpir el loop
- [ ] 4.3b Producto del combo no encontrado por `getProductsByIds` o inactivo → se omite del agregado (no bloquea el resto del combo) y se muestra un toast no bloqueante indicando cuántos productos no se agregaron
- [ ] 4.4 Apartado "Combos" en el catálogo de venta asistida (carga desde el maestro cacheado de 2.2), con acción de click → `agregarCombo`

## 5. Carrito: indicador de configuración pendiente
- [ ] 5.1 Pill/banner en `carrito.component.html` para líneas con `_requiereConfiguracionPendiente: true`, mismo lenguaje visual que el badge `-X%` de descuento ya usado en checkout (tema `openspec/specs/design-system/spec.md`)
- [ ] 5.2 Click en la pill reabre `configurarProducto` en modo edición de la línea existente (pasa `cartItemId`), guarda vía `CartSingletonService.updateProductQuantity` (merge por índice, `cart.singleton.service.ts:95-100`) en vez de agregar un ítem duplicado, y limpia `_requiereConfiguracionPendiente`

## 6. Guard de checkout (investigar antes de implementar)
- [x] 6.1 Investigado `checkout.component.ts` completo (1090 líneas): no existía ningún punto de validación de "producto sin configurar" — solo se validaba forma de pago (`this.form.valid`) en `gotToPaymentOrder()`
- [x] 6.2 Decisión: **bloquear** (no solo advertir), documentado en `design.md` Open Question 1. Implementado en `gotToPaymentOrder()` (`checkout.component.ts`), mismo patrón que el guard de forma de pago existente — lista los productos pendientes por nombre y no permite continuar

## 7. Verificación y cierre
- [ ] 7.1 Build: `node --check` backend, `npx tsc --noEmit` frontend, limpios
- [ ] 7.2 Prueba manual end-to-end: crear un combo con 2+ productos (uno que requiera configuración, otro que no) desde la pantalla admin; agregarlo desde venta asistida; confirmar líneas correctas + pill visible; completar configuración desde la pill; confirmar que el total del pedido es la suma exacta de los precios individuales (IVA y descuento de línea funcionando igual que agregado manual) — **pendiente, requiere navegador**
- [ ] 7.3 Confirmar que el combo NO aparece en ningún flow de sincronización a Shopify (`cereza-products-to-shopify`, `katuq-web-to-shopify`) ni genera escritura en `inventory`/`inventoryMovement` por sí mismo (solo las líneas de producto individuales, igual que hoy)
- [ ] 7.4 Registrar como **D-147** en `specs/CONTRACT.md`
