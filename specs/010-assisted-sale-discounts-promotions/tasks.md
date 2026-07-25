# Tasks 010 — Integración de descuentos y promociones en la venta asistida

> Estado: draft | in-review | approved | **in-progress** | done
> Vinculado a `plan.md` (**approved**, 2026-07-24).
> Última actualización: 2026-07-24

## Progreso (tracker vivo)
- **T-01 — DONE ✅** — `katuq_admin_back_firebase/functions/scripts/test-descuentos-money-path.js` (registrado `npm run test:descuentos-money-path`). Prueba el `orderCalculationService` real: **16/16 PASS**. Oracle congelado — caso mixto código%+promo: IVA **32.300**, total **202.300**; solo-promo IVA 15.200; fijo capado a base descontable.
- **T-02 — DONE ✅** — `Seller.Katuq/src/app/shared/services/ventas/payment.service.spec.ts` (karma). **3/3 PASS ejecutados** contra la función `checkIVAPrice` REAL (19.000 / 15.200 / 32.300). Antes de G1 daba rojo (mixto 30.780, solo-promo 13.680), como debía. Verificado en ChromeHeadless.
- **T-03 (G1) — DONE ✅** — `payment.service.ts` `checkIVAPrice`: flag `lineaEnPromo` (true solo en la rama de promoción, no manual/categoría) + `factorDesc = lineaEnPromo ? 1 : (1 - porceDescuento)` aplicado al producto principal, adiciones y preferencias. Espeja `orderCalculationService.getTotalImpuesto`. Verificado por T-02 (3/3 PASS).
- **T-04 (G1b) — DONE ✅** — retirado el `console.log('🧾 checkIVAPrice - Item:', …)` (telemetría + precios de línea, Art. VII/XI).
- **T-05 (spike envío) — DONE ✅** — el costo de envío vive en `pedido.totalEnvio`; se fija en `checkout.component.ts:797` (`getShippingCost`) y `facturacion/pedido-facturacion.component.ts:587` (`calcularCostoEnvio`), típicamente DESPUÉS del carrito. El display lo lee de `pedido.totalEnvio` (p.ej. `payment.service` PDF ~1817). El backend `orderCalculationService` deriva envío de `order.totalEnvio` o lo recupera de `order.envio.zonaCobro`. Conclusión: cerear solo en el carrito sería sobrescrito → hace falta un flag independiente del orden.
- **T-06 (G2) — DONE ✅** — señal única: `pedido.descuentoAplicado.tipo === 'envio_gratis'` (ya viaja en la orden, sin campo nuevo).
  - **Backend (autoritativo):** `orderCalculationService.calculateOrderTotals` fuerza `envio=0` + `order.totalEnvio=0` y NO recupera costo de zona; `getTotalImpuesto` salta el IVA de envío. Test money-path extendido con caso F (control: envío normal 10.000 suma) y G (envío gratis → envío 0): **22/22 PASS**.
  - **Frontend:** cereo inmediato en `carrito.aplicarResultadoDescuento` (rama envio_gratis) + guardas en los 2 setters (`checkout:797`, `facturacion:587`) para que respeten el flag sin importar el orden de pasos + `payment.service.checkIVAPrice` excluye el IVA de envío cuando envio_gratis. Spec karma extendido (caso G2): **4/4 PASS** ejecutados en ChromeHeadless.
  - Limitación menor conocida: al hacer `quitarDescuento` de un envío gratis, `totalEnvio` queda 0 hasta que el paso de entrega/checkout recomputa (los setters guardados ya restauran el costo real al no haber envio_gratis). Aceptable para MVP.
- **T-07/T-08 (G3 vigencia Bogotá) — DONE ✅** — NUEVO helper puro `functions/services/fechaColombia.js` (`hoyBogota()` vía `Intl` con `timeZone:'America/Bogota'`). Reemplazado `new Date().toISOString().split('T')[0]` (UTC) por `hoyBogota()` en `controllers/descuentosPromociones.js:338` (aplicarCodigo) y `services/productPromoHelper.js:62` (obtenerPromocionesVigentes). Test `functions/scripts/test-fecha-bogota.js` (`npm run test:fecha-bogota`): **7/7 PASS** (bordes de medianoche 04:30Z→día previo, 05:00Z→nuevo día; fin de mes/año). `node --check` OK en los 3 archivos.
- **T-09 (G4 tope 100%) — DONE ✅** — (a) `descuentosPromociones.js` `create` (~L100) y `edit` (~L227, sobre el valor EFECTIVO) rechazan con **HTTP 400** `'El porcentaje no puede exceder 100%'` si `tipo==='porcentaje'` y `valor>100`. (b) Guards defensivos en el cálculo: `orderCalculationService` topa el descuento a `baseDescontable` (`Math.min`) y `factorDesc = Math.max(0, 1-porceDescuento)`; el path de promociones ya estaba topado (`Math.max(0,…)`). Mismo guard en el front `payment.service.checkIVAPrice`. Tests: money-path **26/26 PASS** (caso H: 150% legacy → subtotal/IVA/total = 0, no negativo) + NUEVO `test-descuentos-validacion.js` (`npm run test:descuentos-validacion`) **4/4 PASS** (150/101 → 400 tope; valor_fijo y 100 no disparan el tope).
- **Nada commiteado** (a la espera de autorización del usuario).

### T-10 (e2e) — hallazgos y ampliaciones (trabajo interactivo con el usuario)
- **BUG-E2E-02 (promos no visibles en catálogos, corregido):** `enrichProductsWithPromos` solo estaba enganchado en `productos.quickSearch` y en el flujo principal de `getAllByFilterPaginated`. Faltaba en (a) `handleBodegaPagination` (el catálogo de venta asistida filtra por bodega → tomaba ese camino) y (b) `getAll` (`GET /v1/productos/all`, que usa el módulo de Productos). Enganchado en ambos. Además, **display nuevo** en el módulo de Productos (tabla): precio tachado + promo + badge `-N%`/OFERTA. **Confirmado por el usuario: ya se ven en ambos catálogos.** (El matching por `categoriaNombre` ya funcionaba; se verificó con `scripts/diag-promo-match.js` read-only.)
- **ENDURECIMIENTO — `calcularPrecioLineaPromocional` deriva sinIVA (a pedido del usuario):** los productos de Osmosis solo traen `precioUnitarioConIva` (sin `precioUnitarioSinIva` ni a veces `precioUnitarioIva`). El money-path del checkout depende de sinIVA; en el flujo UI funciona porque el frontend lo deriva, pero por API/integración la promo no se aplicaba y la línea quedaba en 0. Fix: la función deriva `sinIVA = conIVA/(1+iva)` cuando falta (y viceversa), con `IVA_DEFAULT=19` cuando tampoco viene la tasa (igual que el frontend). NUEVO test `scripts/test-promo-line-price.js` (`npm run test:promo-line-price`): **12/12 PASS** (incl. solo-conIVA 208.900 → promo 30% → 146.230/122.882). Regresión money-path intacta (26/26). Diagnóstico: `scripts/sim-clean-order.js`, `find-clean-products.js`, `diag-last-order-promo.js`, `dump-order.js` (todos read-only). Verificado que NO había doble descuento en ORE-000463/464 (promo una vez; código solo sobre líneas sin promo).
- **AMPLIACIÓN — historial de redención de PROMOCIONES (Feature B):** a pedido del usuario, cada promoción automática aprovechada en una orden ahora deja rastro en el historial (como los códigos). NUEVO `descuentosService.registrarRedencionesPromociones` (agrupa líneas por `_promocionAplicada`, reutiliza `registrarRedencion`, idempotente por `${ordenId}_${promocionId}`, incrementa `usosActuales`; sin auto-agotamiento porque las promos no tienen `limiteUsos`). Enganchado no-bloqueante en `orders.js exports.create` tras la redención de código. Front: el modal de historial muestra badge "Promoción" cuando no hay código; la lista admin ya mostraba Historial/Redimido(N) para todas las filas. Ver D-047.

### T-10 (e2e) — hallazgos
- **BUG-E2E-01 (Feature B, corregido):** crear una **promoción por categoría** devolvía 400 `"La promoción de categoría requiere categoriaId"`. Causa: la validación D-B5 en `create` exigía `categoriaId`, pero el formulario enlaza el ng-select de categoría a **`categoriaNombre`** (no manda id) y TODO el matching (`productPromoHelper.obtenerPromocionesVigentes` + `aplicarCodigo`) usa `categoriaNombre`; `categoriaId` se guarda pero no se usa. Por eso los códigos por categoría sí funcionaban (no pasan por D-B5) y las promociones no. **Fix:** la validación ahora exige `categoriaNombre` (id opcional). Backend reiniciado (sin hot-reload). Pendiente reintentar el Paso 0 del checklist.

### Estado global de gaps: G1 ✅ · G2 ✅ · G3 ✅ · G4 ✅ (todos implementados y verificados)
Suite ejecutable total: backend `test:descuentos-money-path` 26/26 · `test:fecha-bogota` 7/7 · `test:descuentos-validacion` 4/4 · `test:promo-line-price` 12/12 · frontend karma `payment.service.spec` 4/4.

### T-11 (cierre) — DONE ✅ (parcial)
- Bitácora del módulo actualizada: `components/proceso/descuentos-promociones/CLAUDE.md` §11 (gaps G1–G4, bugs e2e, ampliaciones, pruebas).
- CONTRACT.md: fila 010 → "implement done"; D-044..D-047 registradas; bitácora de sesión cerrada.
- spec.md §4: criterios EARS de las ampliaciones (D-047) agregados.
- Scripts de diagnóstico ad-hoc eliminados (dump-order, find-clean-products, sim-clean-order, diag-last-order-promo); se conservan los 4 tests de regresión + `diag-promo-match.js` + `fechaColombia.js`.
- **Commit:** a la espera de autorización del usuario (nada commiteado). Ver resumen de commit propuesto abajo.
- **Sigue pendiente (fuera de esta sesión):** e2e final en navegador con productos de precio normal; deploy EC2 (PEM); PRs.

### Commit propuesto (cuando el usuario autorice)
- **Backend** (`katuq_admin_back_firebase`, rama `feature/descuentos-promociones`):
  `feat(descuentos): spec 010 — cierre de gaps (envío gratis, vigencia Bogotá, tope 100%), no acumulación en desglose, historial de promos y robustez de precio`
  - M `controllers/descuentosPromociones.js` `controllers/orders.js` `controllers/productos.js` `controllers/productosPaginated.js` `services/descuentosService.js` `services/orderCalculationService.js` `services/productPromoHelper.js` `package.json`
  - A `services/fechaColombia.js` + `scripts/test-{descuentos-money-path,descuentos-validacion,fecha-bogota,promo-line-price}.js` + `scripts/diag-promo-match.js`
- **Frontend** (`Seller.Katuq`, rama `feature/descuentos-promociones`):
  `feat(descuentos): spec 010 — desglose sin doble descuento (G1), envío gratis (G2), display de promo en módulo Productos e historial de promociones`
  - M `shared/services/ventas/payment.service.ts` `components/ventas/carrito/carrito.component.ts` `components/ventas/checkout/checkout.component.ts` `components/ventas/facturacion/pedido-facturacion.component.ts` `components/productos/productos.component.html` `components/proceso/descuentos-promociones/historial-redenciones/historial-redenciones.component.html`
  - A `shared/services/ventas/payment.service.spec.ts` + `specs/010-assisted-sale-discounts-promotions/**` + bitácora módulo §11
  - Docs SDD: M `specs/CONTRACT.md`

### ⚠️ Hallazgo — harness de test del frontend inoperante (preexistente, ajeno a 010)
Para poder EJECUTAR el spec de T-02 hubo que sortear 3 problemas preexistentes del repo (NO tocados de forma permanente):
1. `angular.json:224` referencia `node_modules/quill/dist/quill.snow.css` pero `quill` **no está en `package.json`** → build de test falla con ENOENT. (Se instaló `quill@1.3.7 --no-save` solo para la sesión.)
2. `tsconfig.spec.json` tiene `"jasmine"` **comentado** en `types` y `@types/jasmine` no instalado → ningún `.spec.ts` compila (`Cannot find name 'it'/'expect'`). (Se activó temporalmente + `@types/jasmine --no-save`, **revertido**.)
3. 2 specs preexistentes rotos: `shared/components/gemini-asistant/visual/visual.spec.ts` y `visual3d/visual3d.spec.ts` importan componentes borrados → rompen el bundle de test completo.
**Recomendación (fuera de 010, decisión del equipo):** agregar `quill` + `@types/jasmine` a `package.json`, descomentar `types:["jasmine"]` en `tsconfig.spec.json`, y borrar/arreglar los 2 specs huérfanos para dejar `ng test` operativo. Mientras tanto, correr karma requiere esos 3 pasos manuales.

## Convenciones
- `[P]` = tarea paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Cada tarea es shippable de forma independiente (un commit por tarea) salvo dependencia explícita.
- Alcance: SOLO trabajo `[NEW]` (gaps G1–G4 + e2e). A/B es `[AS-BUILT]`, no se toca salvo lo que exija un gap.

## Tareas

### T-01 — Congelar regresión: caso código% + línea en promo (backend unit) `[P]`
- **Input:** suite money-path existente (45 casos) en el backend del módulo de descuentos.
- **Output:** nuevo caso unit que fija el número esperado de IVA/total cuando coexisten un código porcentual y una línea con `_precioPromocional` (el código NO debe tocar la línea en promo).
- **Criterio de éxito:** el caso corre y refleja el comportamiento **autoritativo** actual de `orderCalculationService` (que ya excluye promos); sirve de oráculo para G1. Los 45 casos previos siguen verdes.
- **Archivos a tocar:** script de pruebas money-path del backend (`functions/scripts/*` del módulo).
- **Dependencias:** ninguna.

### T-02 — Congelar regresión del desglose en el frontend (`checkIVAPrice`) `[P]`
- **Input:** `PaymentService.checkIVAPrice` con un pedido mixto (1 línea normal + 1 en promo) y un código% aplicado.
- **Output:** aserto (unit o script de verificación) que captura el desglose ACTUAL y el ESPERADO (= el del backend, T-01). Documenta la diferencia que G1 debe eliminar.
- **Criterio de éxito:** queda escrito el número esperado por línea antes de tocar el cálculo (evita arreglar a ciegas).
- **Archivos a tocar:** prueba/spec junto a `shared/services/ventas/payment.service.ts`.
- **Dependencias:** ninguna (usa el esperado de T-01 como referencia conceptual).

### T-03 — G1: `factorDesc` por línea en `checkIVAPrice` (deps: T-01, T-02)
- **Input:** hallazgo del plan §3.3-G1: la línea ~421 aplica `(1 - porceDescuento)` a TODA línea, incluida la de promo (prioridad 2, ~389).
- **Output:** `const factorDesc = this.tienePromoLinea(producto) ? 1 : (1 - porceDescuento)` usado en el descuento del valor con IVA; una línea en promo no recibe el descuento del código en el desglose.
- **Criterio de éxito:** T-02 pasa (desglose front = pedido persistido en el caso mixto); regresión sin promo idéntica; casos combinados y no-combinados OK.
- **Archivos a tocar:** `shared/services/ventas/payment.service.ts`.
- **Dependencias:** T-01, T-02.

### T-04 — G1b: retirar `console.log` de telemetría en `checkIVAPrice` (deps: T-03)
- **Input:** `console.log('🧾 checkIVAPrice - Item:', …)` (~440) — anti-pattern de telemetría + loguea precios de línea (Art. XI).
- **Output:** log removido (o detrás de guard de debug explícito, sin datos de línea).
- **Criterio de éxito:** `ng build` AOT sin errores; consola limpia en el flujo de carrito.
- **Archivos a tocar:** `shared/services/ventas/payment.service.ts`.
- **Dependencias:** T-03 (misma función; se hace en el mismo commit o inmediatamente después).

### T-05 — G2: localizar el costo de envío en la venta asistida (spike) `[P]`
- **Input:** OT-01 del plan — ¿el costo de envío vive en `PaymentService`, en `carrito.component`, o en el backend de órdenes?
- **Output:** nota corta en la bitácora del módulo indicando el/los punto(s) donde se suma el envío al total.
- **Criterio de éxito:** ubicación confirmada con referencia `archivo:línea`; habilita T-06 sin dejar un punto sin cero.
- **Archivos a tocar:** ninguno (solo lectura + nota).
- **Dependencias:** ninguna.

### T-06 — G2: envío gratis → costo de envío en cero en checkout (deps: T-05)
- **Input:** el código `envio_gratis` ya llega con `montoDescuento=0` (backend); el envío no se cero-ea.
- **Output:** cuando el código aplicado es `envio_gratis`, el costo de envío se lleva a 0 en el total del checkout (y al quitar el código, se restaura).
- **Criterio de éxito:** total del checkout baja exactamente el valor del envío; al quitar el código el envío vuelve; no afecta subtotal ni IVA de producto.
- **Archivos a tocar:** el/los punto(s) hallados en T-05 (probable `components/ventas/carrito/carrito.component.ts` + checkout).
- **Dependencias:** T-05.

### T-07 — G3: helper `hoyBogota()` + vigencia en `aplicarCodigo` (backend) `[P]`
- **Input:** `descuentosPromociones.js:337` usa `new Date().toISOString().split('T')[0]` (UTC).
- **Output:** fecha local America/Bogotá (offset fijo −05:00, sin dependencia nueva) usada para comparar `fechaInicio`/`fechaFin`. Helper puro reutilizable.
- **Criterio de éxito:** un descuento vigente hasta hoy sigue válido a las 23:30 hora Bogotá (que en UTC ya es el día siguiente). Unit de borde de medianoche PASS.
- **Archivos a tocar:** `functions/controllers/descuentosPromociones.js` (+ helper compartido).
- **Dependencias:** ninguna.

### T-08 — G3: misma vigencia Bogotá en `productPromoHelper` (deps: T-07)
- **Input:** `services/productPromoHelper.js` → `obtenerPromocionesVigentes` filtra vigencia en memoria con fecha UTC.
- **Output:** usa el mismo `hoyBogota()` que T-07.
- **Criterio de éxito:** una promoción vigente hasta hoy sigue apareciendo en catálogo a las 23:30 Bogotá. Unit PASS.
- **Archivos a tocar:** `functions/services/productPromoHelper.js` (importa el helper de T-07).
- **Dependencias:** T-07.

### T-09 — G4: tope 100% en porcentaje (`create`/`edit` + guard cálculo) `[P]`
- **Input:** `create` valida `fechaFin≥fechaInicio` pero no topa el porcentaje; `valor` solo se valida ≥0.
- **Output:** si `tipo==='porcentaje'` y `valor>100` → HTTP 400 `{ message: 'El porcentaje no puede exceder 100%' }` en `create` y `edit`; guard defensivo en el cálculo (línea nunca < 0).
- **Criterio de éxito:** crear/editar con 150% → 400; con 100% → OK; el cálculo con un porcentaje válido no cambia. Unit PASS.
- **Archivos a tocar:** `functions/controllers/descuentosPromociones.js` (+ `services/orderCalculationService.js` si aplica el guard).
- **Dependencias:** ninguna.

### T-10 — E2E local: checklist en navegador contra OH MY STORE (deps: T-03..T-09)
- **Input:** back local :3300 (con `.env`/`SECRET_TOKEN`) + front :4200 apuntando a `localhost:3300`.
- **Output:** checklist del plan §6 ejecutado y anotado:
  1. Crear promo (categoría + producto) → catálogo tachado + badge.
  2. Carrito: precio promo en línea/subtotal/IVA.
  3. Código dirigido: descuenta solo elegibles; rechaza si no hay elegibles.
  4. Código% + producto en promo: NO acumula; desglose = total persistido (valida G1).
  5. Código `envio_gratis`: envío en cero (valida G2).
  6. Checkout: pedido creado + redención 1:1.
- **Criterio de éxito:** los 6 pasos PASS; discrepancia desglose↔persistido = 0. Revertir `environment.ts` al terminar.
- **Archivos a tocar:** `environment.ts` (temporal, revertir); ninguno de código.
- **Dependencias:** T-03, T-04, T-06, T-07, T-08, T-09.

### T-11 — Cierre: bitácora + CONTRACT.md + commits sellados (deps: T-10)
- **Input:** trabajo de T-03..T-10 verificado.
- **Output:** bitácora del módulo (`components/proceso/descuentos-promociones/CLAUDE.md`) actualizada con G1–G4 + resultado e2e; CONTRACT.md con el cierre (sello D-0XX si aplica); commits por fase.
- **Criterio de éxito:** spec 010 pasa a estado de cierre; roadmap actualizado; nada sin documentar (Art. XIV).
- **Archivos a tocar:** bitácora del módulo, `specs/CONTRACT.md`, `specs/010-.../tasks.md` (marcar done).
- **Dependencias:** T-10.

## Orden de ejecución sugerido
1. **Paralelo:** T-01, T-02 (regresión) · T-05 (spike envío) · T-07 (vigencia aplicarCodigo) · T-09 (tope 100%).
2. T-03 (G1) al terminar T-01+T-02 → T-04 (limpiar log).
3. T-06 (envío cero) al terminar T-05.
4. T-08 (vigencia promoHelper) al terminar T-07.
5. T-10 (E2E) al terminar T-03/T-04/T-06/T-07/T-08/T-09.
6. T-11 (cierre) al terminar T-10.

## Definition of Done
- Los 4 gaps (G1–G4) implementados y con su unit PASS; los 45 casos money-path previos siguen verdes.
- E2E local (6 pasos) PASS con 0 discrepancias desglose↔persistido.
- Verificación de constitución sin "no" pendientes (ver plan §2).
- `CONTRACT.md` y bitácora del módulo actualizados con cualquier desvío (Art. XIV).
- Spec 010 se mantiene `approved`; se marca `superseded` solo si algún criterio cambió.
- **Fuera de DoD (bloqueado/aparte):** deploy en EC2 (PEM) y apertura de PRs; validación contra producción (Q-03 diferida).
