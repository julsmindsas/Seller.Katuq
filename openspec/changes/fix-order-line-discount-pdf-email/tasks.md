# Tasks

## 1. PDF de orden de venta
- [x] 1.1 `orden-venta.component.ts`: renombrado el cuerpo actual de `getPrecioUnitario` a `getPrecioUnitarioBruto` (privado, SIN cambios de lógica); `getPrecioUnitario` (público) ahora es `getPrecioUnitarioBruto(item) × (1 - descLineaPct(item)/100)`. Agregado `descLineaPct(item)` (mismo saneo 0-100 que `carrito.component.ts`)
- [x] 1.2 `orden-venta.component.html`/`.scss`: badge `-X%` junto a "P. Unit." cuando `descLineaPct(item) > 0`, mismo patrón condicional que `checkout.component.html:639`
- [x] 1.3 Verificado que `calcularTotalProducto()` (ya multiplica `cantidad × getPrecioUnitario(item)`) hereda el neto sin cambios adicionales
- [x] 1.4 `npx tsc --noEmit` limpio (0 errores) tras cada edit. `ng serve` no verificado en esta sesión (bloqueo de red del entorno con el navegador remoto, ver 2.1)

## 2. Verificación de cuadre
- [ ] 2.1 Prueba manual: generar el PDF de un pedido real con descuento de línea en al menos un producto + descuento global, confirmar que la suma de "Total" por línea coincide con el subtotal y el total de "Descuento" de la sección de totales — **pendiente, requiere navegador** (bloqueado en esta sesión por el problema de red del Chrome remoto, ya documentado en D-137)
- [ ] 2.2 Prueba de regresión: PDF de un pedido SIN descuento de línea se ve idéntico a antes del cambio (mismo P. Unit./Total, sin badge) — **pendiente, requiere navegador**

## 3. Correo de confirmación — investigación primero
- [x] 3.1 Ubicado el generador: `payment.service.ts::generateHtmlContentInternal` (FRONTEND, `Seller.Katuq`, no backend — corrige la suposición inicial de la propuesta). **Hallazgo: SÍ muestra detalle por línea** — modo comanda muestra "Precio Unit" (línea 1311, `precioUnitarioConIva`) y "Total" por producto (línea 1318, `totalConIvaProducto`); modo email muestra "Total" por producto (línea 1559, `totalDisplayProducto`). Ambos modos comparten las mismas variables resueltas por una jerarquía propia (manual → categoría → volumen → base, líneas ~1226-1277) — una CUARTA reimplementación paralela de la misma lógica (además de carrito, checkout y orden-venta), y tampoco aplicaba `descuentoLinea`. El hallazgo de D-141 ("solo lee totales agregados") no cubría este detalle por línea — se corrige el registro aquí.
- [x] 3.2 Aplicado el mismo fix: descuento de línea multiplicado sobre `precioUnitarioSinIva`/`precioUnitarioConIva`/`valorIva` justo después de resolver la jerarquía (antes de calcular `totalConIvaProducto`/`totalDisplayProducto`), un solo punto que corrige comanda y email a la vez. Sin badge visual agregado aquí (fuera del alcance registrado en `specs/order-line-discount/spec.md`, que solo pide el badge para el PDF de orden de venta) — candidato a follow-up si se pide.
- [x] 3.3 N/A — el correo/comanda SÍ mostraba detalle por línea (contrario a la expectativa inicial), así que se resolvió en 3.2 en vez de documentarse como "sin cambios necesarios"

## 4. Cierre
- [x] 4.1 Registrado como **D-142** en `specs/CONTRACT.md`
- [ ] 4.2 Marcar `wdu9v75qq6` como resuelta en ClickUp una vez verificado en navegador (tarea 2.1)
