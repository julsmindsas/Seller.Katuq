# Tasks 010 — Congruencia de IVA en venta asistida

> Vinculado a `spec.md` + `plan.md` (approved, D-057). Convención: `T-NN`. ✅ done · 🔄 in-progress · ⬜ pendiente.
> Regla: nada de cálculo se cambia hasta que los fixtures (Fase A) estén verdes contra el algoritmo canónico (Fase B).

## Fase A — Contrato (fixtures dorados) · sin tocar cálculo
- ✅ **T-01** Crear `contracts/iva-fixtures.json`: 13 casos con entrada (carrito + ctx) y salida esperada (subtotal, totalImpuesto, desgloseIVA, total). Envío (F-13) marcado pendiente por ambigüedad de doble conteo.
- ✅ **T-02** Cada fixture documenta `_regla` y `_computo` (revisable por producto).
- ⬜ **T-03** Derivar 10-20 fixtures de **pedidos reales** que hoy descuadran (export read-only de prod) → carpeta `contracts/real-cases/`. Anonimizar PII.
- ✅ **T-04** Harness BE: `functions/scripts/test-iva-contract.js` corre 14 fixtures vs `orderCalculationService` actual → **7 PASS / 7 FAIL** (foto del fantasma, ver `findings.md §D-ter`). Reutilizable como gate en Fase B.
- ⬜ **T-05** Harness FE: spec Jasmine que carga los mismos fixtures y corre el cálculo actual → documenta los rojos.

## Fase B — Algoritmo canónico (puro, sin swap de call-sites aún)
- ✅ **T-06** BE: `resolverPrecioLinea` + `tierSinIVA` + `calcularTotalesPedido` añadidos (PUROS, additivos) a `services/orderCalculationService.js`. Jerarquía manual→categoría→volumen→base, ancla A, tier robusto, desgloseIVA {0,5,8,19}, guardas NaN. Harness: **canónico 14/14**, viejo 7/14 intacto. `calculateOrderTotals` y call-sites SIN tocar.
- ⬜ **T-07** FE: implementar el mismo algoritmo en `PaymentService` (`checkPriceScale`/`checkIVAPrice` reescritos sobre el núcleo puro). Mantener firma `Pedido | POSPedido`.
- ⬜ **T-08** Ambos harness (T-04/T-05) en **verde** contra todos los fixtures, incluidos los reales. Este es el gate de la Fase B.

## Fase C — Backend manda lo persistido (muere el fantasma en lo guardado)
- ⬜ **T-09** `orders.js` create/edit/list ya llaman `calculateOrderTotals` → verificar que usan el nuevo núcleo. Persistir `desgloseIVA` en el doc (AC-06, OT-1).
- ⬜ **T-10** Feature flag `IVA_CALC_UNIFICADO` + **dark-launch**: calcular old+new, persistir old, loggear divergencias `{nroPedido, productoCd, fuentePrecio, oldIva, newIva}`.
- ⬜ **T-11** Retirar competidores BE: `analytics.js` deja de usar `recalcularPedidoCompleto` (lee persistido o llama canónico); eliminar `utils/priceCalculations.js`; borrar código muerto `orders.js:7066 getTotalImpuesto`/`:7222`.
- ⬜ **T-12** Cuando divergencias→0 en pedidos nuevos (ventana de observación), switch flag a `new`.

## Fase D — FE venta asistida + cotizaciones delegan al punto único
- ⬜ **T-13** `carrito.component.ts`, `checkout.component.ts`, `pedidos.util.service.ts` delegan a `PaymentService` (quita lógica inline). Agente IA `order-tools-registrar` queda cubierto vía `pedidos.util`.
- ⬜ **T-14** `cotizacion-editor.component.ts`, `orden-venta.component.ts`, `list.component.ts` delegan al mismo núcleo. Verificar checkout = doc persistido (E2E).

## Fase E — POS delega al mismo punto
- ⬜ **T-15** `pos-carrito`, `pos-checkout`, `pos-service/pos-pedidos.util`, `pos-checkout.service`, `factura-tirilla` delegan a `PaymentService`/núcleo. E2E POS: tirilla = pedido.

## Fase F — Documentos + factura electrónica (alcance acotado)
- ⬜ **T-16** Email/PDF: `templateHelpers.js`/`emailTemplates.js` consumen `totalImpuesto`+`desgloseIVA` canónicos; eliminar su copia de cálculo.
- ⬜ **T-17** Factura electrónica: `worldOfficeDataMapper.extractTaxPercentage` + FE `facturacion.service.getTaxeByProduct` usan la **tarifa efectiva por línea** (override/categoría), no la base. (NO se tocan push Osmosis/Shopify/Woo — solo leen.)

## Fase G — Limpieza + rollout
- ⬜ **T-18** Retirar feature flag tras 2 semanas estable (divergencias=0). Borrar ruta old.
- ⬜ **T-19** Validación post-launch: muestra de N pedidos nuevos con 0 descuadres > $1 (checkout = persistido = email = factura).

## Diferido (sub-spec 010.1)
- ⬜ **T-20** Prevención: escritores de campos de producto (`lista-precios`, `crear-productos`, mappers) garantizan coherencia `sinIVA/conIVA/valorIva/%` al guardar. No bloquea (el cálculo ya tolera el descuadre).
