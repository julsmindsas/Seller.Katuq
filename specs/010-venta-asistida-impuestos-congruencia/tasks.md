# Tasks 010 — Congruencia de IVA en venta asistida

> Vinculado a `spec.md` + `plan.md` (approved, D-057). Convención: `T-NN`. ✅ done · 🔄 in-progress · ⬜ pendiente.
> Regla: nada de cálculo se cambia hasta que los fixtures (Fase A) estén verdes contra el algoritmo canónico (Fase B).

## Fase A — Contrato (fixtures dorados) · sin tocar cálculo
- ✅ **T-01** Crear `contracts/iva-fixtures.json`: 13 casos con entrada (carrito + ctx) y salida esperada (subtotal, totalImpuesto, desgloseIVA, total). Envío (F-13) marcado pendiente por ambigüedad de doble conteo.
- ✅ **T-02** Cada fixture documenta `_regla` y `_computo` (revisable por producto).
- ✅ **T-03** Auditoría READ-ONLY de pedidos reales (`functions/scripts/audit-iva-divergence-readonly.js`, 500 pedidos). Canónico **validado**: 96.4% idéntico al persistido; los 3.6% que descuadran son **a favor del canónico** (IVA fantasma sobre exentos / IVA faltante). Hallazgos F-10/F-11 en `findings.md §T-03`. **Pendiente sub-paso:** materializar 1-2 fixtures real-case anonimizados en `contracts/real-cases/` (exento por volumen → IVA 0).
- ✅ **T-04** Harness BE: `functions/scripts/test-iva-contract.js` corre 14 fixtures vs `orderCalculationService` actual → **7 PASS / 7 FAIL** (foto del fantasma, ver `findings.md §D-ter`). Reutilizable como gate en Fase B.
- ✅ **T-05** Harness FE: `contracts/test-iva-contract-fe.js` corre los fixtures contra el núcleo FE compilado (`iva-canonico.ts` → tsc). **14/14 + real-case 1/1**, idéntico al BE. (Se eligió harness node sobre Jasmine para no depender de ng test/headless chrome.)

## Fase B — Algoritmo canónico (puro, sin swap de call-sites aún)
- ✅ **T-06** BE: `resolverPrecioLinea` + `tierSinIVA` + `calcularTotalesPedido` añadidos (PUROS, additivos) a `services/orderCalculationService.js`. Jerarquía manual→categoría→volumen→base, ancla A, tier robusto, desgloseIVA {0,5,8,19}, guardas NaN. Harness: **canónico 14/14**, viejo 7/14 intacto. `calculateOrderTotals` y call-sites SIN tocar.
- ✅ **T-07** FE: núcleo canónico puro `src/app/shared/services/ventas/iva-canonico.ts` (espejo exacto del BE: `resolverPrecioLinea`/`tierSinIVA`/`calcularTotalesCanonico` + `baseExcluidaCanonica`). `PaymentService.checkPriceScale`/`checkIVAPrice` **delegan detrás de feature flag** `ivaCalcUnificado` (default OFF → producción intacta; override QA `localStorage['IVA_CALC_UNIFICADO']`). Firma `Pedido | POSPedido` intacta. tsc limpio (los 70 errores son cascada del `environment.ts` generado, pre-existente).
- ✅ **T-08** Gate Fase B: BE 14/14 + FE 14/14 + real-case 1/1, mismos números. **Fase B cerrada.**

## Fase C — Backend manda lo persistido (muere el fantasma en lo guardado)
- ✅ **T-09** (D-201, **rehecho de Opción B → Opción A**, 2026-08-15) — `calculateOrderTotals` usa el motor canónico cuando `IVA_PERSIST_CANONICAL=true`: fija `subtotal/totalDescuento/totalImpuesto/desgloseIVA` desde `calcularTotalesPedido` **y graba 3 campos propios por línea** (`item.precioSinIvaResuelto`/`item.tarifaEfectiva`/`item.ivaLinea`, ver `resolverPrecioLinea`) — **ya NO pisa** `item.producto.precio.precioUnitarioIva` (esa era la Opción B original, descartada por OT-4: un sync puede volver a pisar la foto del producto). Consumidor migrado: `worldOfficeDataMapper.extractTaxPercentage(producto, carrito)` ahora prioriza `carrito.tarifaEfectiva` → `carrito._ivaManualOverride` → catálogo (antes solo leía el snapshot). Gateado por env (OFF → desplegar no cambia nada). `node -c` OK; harness canónico **14/14** intacto + nuevo `scripts/test-iva-persist-option-a.js` (fixture real DAD-012131, **8/8 PASS**, confirma $328.440 reconstruido y snapshot NO tocado). Como `calculateOrderTotals` corre en create/edit/list, queda cableado en todos. **Falta:** prender el env en producción real tras observar dark-launch (→ T-12) — no confirmado desde esta sesión (sin acceso SSH/deploy).
- ✅ **T-10** **Dark-launch** en `orders.js`: helper `logIvaDivergenceDarkLaunch(order, phase)` hookeado en `create` (tras `calculateOrderTotals`) y en `updateOrderInternal` (tras `update`). Calcula canónico, compara vs lo que se persiste (viejo), y si |Δ|>$1 escribe a `iva_divergence_audit` `{phase,nroPedido,company,oldIva,newIva,delta,oldTotal,newTotal,desgloseIVA,lineas[{cd,fuentePrecio,precioSinIVA,tarifa}]}`. **NO muta el pedido; fire-and-forget; nunca rompe el flujo.** Gateado por env `IVA_DARK_LAUNCH` (=true en `.env` local). Verificado E2E (escritura+lectura, doc de prueba borrado). Sigue persistiendo el VIEJO. **Nota:** sin echo F-11 (el canónico no recibe el persistido).
- ✅ **T-11b** (D-202, 2026-08-15, no estaba en el plan original — hallazgo de la sesión) — `updateOrderInternal` (edición GENÉRICA de pedidos, `controllers/orders.js`) **nunca llamaba `calculateOrderTotals`**: persistía ciegamente `req.body` (hallazgo #4 de D-163, hasta hoy fuera de alcance). Se agregó recálculo guardado — solo cuando el payload trae `carrito` (array no vacío), para no romper ediciones parciales sin carrito (tesorería, logística) que perderían los totales. Usa el mismo `calculateOrderTotals`, respeta `IVA_PERSIST_CANONICAL` igual que `create`. `node -c` OK. **No se corrió contra el emulador** (requiere levantar Firestore emulator, no se hizo esta sesión) — cubierto solo por revisión de código + los 22 PASS del motor subyacente.
- ⬜ **T-11** Retirar competidores BE: `analytics.js` deja de usar `recalcularPedidoCompleto` (lee persistido o llama canónico); eliminar `utils/priceCalculations.js`; borrar código muerto `orders.js:7066 getTotalImpuesto`/`:7222`.
- ⬜ **T-12** Cuando divergencias→0 en pedidos nuevos (ventana de observación), switch flag a `new`.

## Fase D — FE venta asistida + cotizaciones delegan al punto único
- ✅ **D-202 (2026-08-15, no estaba en el plan original)** — Corregidas las ramas LEGACY (flag OFF, las que corren hoy en prod) de `payment.service.ts::checkIVAPrice()` y `pedidos.util.service.ts::calcularIVAUnitario()`: ninguna aplicaba `_ivaManualOverride` fuera de la rama de precio manual — mismo bug de D-200, en 2 archivos más. Verificado en aislado (Node, sin Angular/TestBed): caso real ALM-4210 → $37.620 exacto en ambos. `ng serve` compiló limpio tras cada cambio. Ver CONTRACT.md D-202.
- 🔄 **T-13** `carrito.component.ts`, `checkout.component.ts`, `pedidos.util.service.ts` delegan a `PaymentService` (quita lógica inline). Agente IA `order-tools-registrar` queda cubierto vía `pedidos.util`.
  - ✅ `checkout.component.ts`: `checkPriceScale()`/`checkIVAPrice()` delegan a `this.payment.*(this.pedido)` (legacy de `checkIVAPrice` queda inalcanzable, se limpia en T-18).
  - ✅ `pedidos.util.service.ts`: `checkIVAPrice()` usa `calcularTotalesCanonico` directo bajo el flag (NO se inyecta `PaymentService` para evitar **ciclo de DI**: PaymentService ya depende de PedidosUtilService). Cubre al agente IA.
  - ⏭️ `carrito.component.ts`: `checkPriceScale(item)` es **por ítem** (display) y ya tiene el fix D-046 (tier de volumen en override) → se deja; no es el total del pedido.
- ✅ **T-14** `cotizacion-editor.component.ts`, `orden-venta.component.ts`, `list.component.ts` delegan al mismo núcleo.
  - ✅ `list.component.ts` (D-061): `checkPriceScale`/`checkIVAPrice` delegan a `PaymentService` (−234 líneas de copia legacy). Mató el bug D-046 del listado (DAD-010760: 485.450 → 434.777).
  - ⏭️ `orden-venta.component.ts`: el getter `totalImpuestos` solo **lee** `pedido.totalImpuesto` (no calcula) → nada que delegar.
  - ✅ `cotizacion-editor.component.ts` (D-063, 2026-06-29): los getters por línea (`getIvaActual`/`getPrecioSinIva`/`getValorIva`/`itemPrecio`) delegan a `resolverPrecioLinea` del núcleo canónico vía adaptador `resolverLineaCanonica`, **detrás del flag** `ivaCalcUnificado` (OFF → getters legacy intactos). **NO se mapea `descGlobal`**: se mantiene el modelo de descuentos línea+global del componente y solo se cambia el **ancla por línea** (antes des-grossaba conIVA → F-15; ahora sinIVA directo). El adaptador respeta la regla de **precio manual de ítems libres** (que el núcleo no cubre). Lock: `contracts/test-cotizaciones-layering.js` (caso trabajado línea+global PASS). tsc/ng serve limpio.

## Fase E — POS delega al mismo punto
- ⬜ **T-15** `pos-carrito`, `pos-checkout`, `pos-service/pos-pedidos.util`, `pos-checkout.service`, `factura-tirilla` delegan a `PaymentService`/núcleo. E2E POS: tirilla = pedido.

## Fase F — Documentos + factura electrónica (alcance acotado)
- ⬜ **T-16** Email/PDF: `templateHelpers.js`/`emailTemplates.js` consumen `totalImpuesto`+`desgloseIVA` canónicos; eliminar su copia de cálculo.
- 🔄 **T-17** Factura electrónica:
  - ✅ **World Office** queda automático con Opción B (D-062/T-09): `extractTaxPercentage` lee `producto.precio.precioUnitarioIva`, que ahora trae la **tarifa efectiva** cuando el env está ON.
  - ✅ **SIIGO (D-239, 2026-08-25):** el "futuro" de la nota original llegó vía un bug real reportado (pedido DAD-012406, factura sin IVA). `siigoDataMapper.js::mapOrderToInvoice` ahora usa `extractEffectiveTaxPercentage(producto, item)` — misma jerarquía que `worldOfficeDataMapper.extractTaxPercentage` (`item.tarifaEfectiva → item._ivaManualOverride → item.ivaLinea/precioSinIvaResuelto → calculateTaxPercentage(producto)` como fallback intacto). Sin flag (retrocompatible por construcción). `calculateTaxPercentage` original se conserva intacta y sigue siendo la única fuente para `mapProductToSiigo` (sync de catálogo, sin contexto de línea de pedido). Ver `openspec/changes/fix-siigo-invoice-line-iva/` (repo backend) y CONTRACT.md D-239.
  - ⬜ **FE** `facturacion.service.getTaxeByProduct` — pendiente verificar (solo si el FE arma factura electrónica propia).

## Fase G — Limpieza + rollout
- ⬜ **T-18** Retirar feature flag tras 2 semanas estable (divergencias=0). Borrar ruta old.
- ⬜ **T-19** Validación post-launch: muestra de N pedidos nuevos con 0 descuadres > $1 (checkout = persistido = email = factura).

## Diferido (sub-spec 010.1)
- ⬜ **T-20** Prevención: escritores de campos de producto (`lista-precios`, `crear-productos`, mappers) garantizan coherencia `sinIVA/conIVA/valorIva/%` al guardar. No bloquea (el cálculo ya tolera el descuadre).
