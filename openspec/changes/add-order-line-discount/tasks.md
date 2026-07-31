# Tasks

## 1. Backend: motor canónico + persistencia
- [x] 1.1 `calcularTotalesPedido` (`functions/services/orderCalculationService.js`) acepta `item.descuentoLinea` opcional (0-100, default 0) y compone `factorDescuento = (1 - descuentoLinea/100) × (1 - porceDescuento/100)` sobre el precio ya resuelto por `resolverPrecioLinea` (sin tocar esa función ni su jerarquía manual/categoría/volumen/base)
- [x] 1.2 `calculateOrderTotals` hornea en cada línea, al crear/editar el pedido: `producto.precio.precioEfectivoSinIva` (neto), `descuentoLineaPct`, `descuentoLineaMonto` — sin tocar `precioUnitarioSinIva`/`precioUnitarioConIva`/`precioUnitarioIva`. Corre en un bloque incondicional (fuera del flag `IVA_PERSIST_CANONICAL`)
- [x] 1.3 Camino LEGACY (flag OFF) también compone el descuento de línea: nueva `getSubTotalNetoPedido` (espejo exacto de `getSubTotalPedido` + factor de descuento, cero riesgo de divergencia) y `getTotalImpuesto` extendida con `descLineaFrac`. El paso 3 de `calculateOrderTotals` usa `bruto - getSubTotalNetoPedido` cuando hay `porceDescuento` o algún `descuentoLinea`; si no, preserva el comportamiento exacto previo (incluido el fallback a `order.totalDescuento` preexistente)
- [x] 1.4 Contract test `functions/scripts/test-line-discount-contract.js`: regresión (sin descuento, idéntico a fórmula previa), descuento línea solo, línea+global compuesto, multilínea (una con descuento no afecta a la otra), línea+volumen (el descuento se aplica sobre el TIER resuelto, no el precio base) — **20/20 PASS**, motor canónico y legacy verificados por igual

## 2. Frontend: espejo canónico + UI de carrito/checkout
- [x] 2.1 `iva-canonico.ts` espejo exacto de 1.1 (`calcularTotalesCanonico` + `baseExcluidaCanonica` componen `descuentoLinea`, misma fórmula que el backend)
- [x] 2.2 UI de descuento por línea en `carrito.component.ts`/`.html`/`.scss`: input inline por producto (`descLineaPct`/`onDescLineaChange`), `checkPriceScale` ahora envuelve `checkPriceScaleBruto` aplicando `(1-descLinea/100)` al final — `getPrecioSinIva`/`getValorIva`/`getTotalProductPriceInCart` quedan netos automáticamente sin tocarlos
- [x] 2.3 `checkout.component.ts::checkPriceScaleProd` aplica el mismo factor al final; badge `-X%` en el resumen de productos (`checkout.component.html`) cuando la línea tiene descuento
- [x] 2.4 SCSS en tokens del tema (`--kc-*` en carrito, `--success-color` ya usado en checkout)

## 3. Fix del bug que origina esta propuesta
- [x] 3.1 `cotizacion-convert.service.ts::iniciar()` — `descuentoLinea: item.descuentoLinea` agregado a `itemsCtx`. Verificado que `CartSingletonService.addToCart()` no filtra campos (push directo del objeto), así que el campo sobrevive sin cambios adicionales
- [ ] 3.2 Verificación manual: convertir una cotización con descuento de línea a pedido y confirmar que el carrito resultante conserva el descuento y el precio correcto — **pendiente, requiere navegador**

## 4. Facturación electrónica
- [x] 4.1 `siigoDataMapper.js` lee `producto.precio.precioEfectivoSinIva` cuando existe (horneado por 1.2) y envía `discount: 0`; si no existe (pedidos previos a este cambio), cae exactamente al comportamiento previo (broadcast del % global) — sin regresión para históricos
- [ ] 4.2 Verificar que el total de la factura SIIGO generada coincide con `pedido.total` en un pedido con descuentos de línea mixtos — **pendiente, requiere ambiente de prueba SIIGO**
- [x] 4.3 Pregunta abierta DIAN documentada en `design.md` §5 y en el registro D-XXX de CONTRACT.md (pendiente de confirmar con el contador/asesor tributario, no bloqueante)
- [x] 4.4 Investigado `worldOfficeDataMapper.js` — `carrito.descuento` no tiene NINGÚN escritor vivo en el código actual (buscado en todo `functions/`); es el mismo nombre de campo equivocado que también aparece como código muerto/no-invocado en `cotizacionService.js::calcularTotalesItems` y como guardarraíl backend ya conocido y documentado (sesión previa) en `controllers/cotizaciones.js::calcularTotales` — **hallazgo fuera de alcance de este cambio, no se toca aquí** (es un bug del módulo de Cotizaciones, no de venta asistida). Se agregó `descuentoLinea` como PRIMERA prioridad en `#calculateDiscountPercentage`, conservando `carrito.descuento` como fallback sin quitarlo (por si algún flujo no rastreado lo usa)

## 5. Verificación y cierre
- [x] 5.1 Build: `node --check` limpio en los 4 archivos backend tocados; `npx tsc --noEmit` exit 0; `ng serve` (dev server ya corriendo) recompiló los 3 módulos afectados (`ventas`, `cotizaciones`) sin errores tras cada guardado
- [ ] 5.2 Prueba manual end-to-end: crear un pedido en venta asistida con descuento de línea + descuento global, verificar PDF de orden de venta y (si aplica) factura SIIGO en ambiente de prueba — **pendiente, requiere navegador**
- [x] 5.3 Prueba de regresión: cubierta por el contract test 1.4 (caso "Regresión" = idéntico byte a byte a la fórmula previa cuando no hay `descuentoLinea`)
- [x] 5.4 Registrado como **D-141** en `specs/CONTRACT.md`

## 6. Hallazgo fuera de alcance (registrado, no corregido aquí)
- `controllers/cotizaciones.js::calcularTotales` y `services/cotizacionService.js::calcularTotalesItems` (esta última código muerto, sin ningún llamador) leen `item.descuento` — campo que el editor de Cotizaciones actual NO escribe (usa `descuentoLinea`). Es el guardarraíl backend ya documentado en una sesión previa de CONTRACT.md ("Pendiente de backend... cotizaciones.js:calcularTotales use el cálculo canónico"). Bug real, pero del módulo de Cotizaciones — fuera del alcance de `add-order-line-discount` (que es sobre venta asistida). No se corrige en este cambio.
