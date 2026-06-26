# Plan 010 — Congruencia de IVA en venta asistida

> Estado: **approved** (2026-06-25 — D-057)
> Última actualización: 2026-06-25

## 1. Resumen técnico
Unificar TODO el cálculo de precio/IVA de una línea en **un solo algoritmo canónico** (jerarquía manual → tipo de cliente → volumen → base; **ancla A** `IVA = sinIVA × tarifa`). Vive en **un punto por entorno**: frontend = `PaymentService` (ya es el hub, acepta `Pedido | POSPedido`); backend = `services/orderCalculationService.js`. Ambos se blindan con **fixtures dorados compartidos** (mismos casos, misma salida) para que no puedan divergir. Se **retiran** las implementaciones competidoras (`utils/priceCalculations.js`, `orders.js:7066` muerto, copia en `templateHelpers.js`). Rollout por fases detrás de feature flag con dark-launch comparativo.

## 2. Verificación contra la constitución
| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 010 + esta plan |
| II — Spec captura intent | sí | jerarquía + ancla ratificadas por producto (D-055/D-056) |
| IV — Idempotencia | sí | recalcular un pedido ya calculado no cambia totales |
| VI — UI no acoplada a proveedor | sí | cálculo agnóstico; factura electrónica solo consume |
| VII — Observabilidad | sí | log estructurado al usar fallback de tier o al detectar divergencia old/new |
| VIII — Test-first contratos | sí | fixtures dorados ANTES de tocar el cálculo |
| IX — Estilo Angular | sí | servicio `providedIn:'root'`, funciones puras |
| XI — Datos sensibles fuera del log | sí | solo ids/montos, sin PII |

## 3. Arquitectura

### 3.1 Punto único de cálculo
Contrato puro (mismo en TS y JS):
```
calcularLinea(item, ctx) -> {
  fuentePrecio: 'manual'|'categoria'|'volumen'|'base',
  precioSinIVA, tarifa, ivaUnitario, precioConIVA
}
calcularTotalesPedido(pedido, ctx) -> {
  subtotal, totalDescuento, totalEnvio,
  totalImpuesto, desgloseIVA:{ '0','5','8','19' }, totalConIVA
}
```
`ctx` = `{ categoriaClienteId, porceDescuento, allBillingZone }`.

### 3.2 Algoritmo canónico (por línea)
1. **precioSinIVA** por prioridad: (a) `_precioManualOverride` si `procesoComercial.permitePrecioManual` → (b) `preciosPorTipoCliente` activo de la categoría → (c) tier de volumen por cantidad, sinIVA **robusto** (`valorUnitarioPorVolumenSinIVA`, si falta/0 derivar `valorUnitarioPorVolumenConIVA/(1+valorIVAPorVolumen/100)`) → (d) `precioUnitarioSinIva` base. **Categoría gana a volumen** (AC-10).
2. **tarifa**: `_ivaManualOverride` si está → si no, la tarifa de la fuente elegida.
3. `ivaUnitario = precioSinIVA × tarifa/100`; `precioConIVA = precioSinIVA × (1 + tarifa/100)` (AC-11/AC-12). Nunca leer montos de IVA pre-guardados como verdad.
4. Adiciones/preferencias: misma ancla con su propia tarifa.
5. Descuento global se aplica **antes** del IVA, idéntico en línea y agregado.
6. NaN/indefinido → 0 explícito + log (AC-08).

### 3.3 Decisiones técnicas
| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Punto único FE = `PaymentService` | AC-01, F-06 | nuevo servicio (PaymentService ya es hub usado por cotizaciones+POS) |
| Punto único BE = `orderCalculationService` | AC-05 | `priceCalculations.js` (otra ancla, ignora overrides) → se retira |
| Congruencia FE↔BE vía fixtures dorados | AC-05, Art VIII | compartir código TS/JS (imposible entre repos) |
| Ancla A (`sinIVA × tarifa`) | AC-11 (D-056) | montos guardados (causa del fantasma); anclar en conIVA (choca con IVA manual) |

## 4. Modelo de datos
Sin cambios de esquema. Se **deja de confiar** en `valorUnitarioPorVolumenIva` y `precioCategoria.valorIva` como verdad (se re-derivan). Persistencia de pedido sin cambios salvo **agregar `desgloseIVA`** al doc para factura electrónica (AC-06).

## 5. Contratos
No hay endpoint nuevo. El "contrato" es el **set de fixtures dorados** `specs/010-.../contracts/iva-fixtures.json`: N carritos de entrada + totales esperados. Casos mínimos:
- base simple · base multi-tarifa (0/5/19) · volumen con `sinIVA` presente · **volumen legacy sin `sinIVA`** · categoría · **categoría + volumen** · IVA manual sobre volumen · precio manual · precio+IVA manual · adiciones · preferencias · descuento global · envío con IVA · cantidad 0 · campos NaN.
- Derivar 10-20 fixtures extra de **pedidos reales de producción** que hoy descuadran (para probar que el fantasma muere).

### 5.1 Idempotencia
`calcularTotalesPedido` es puro; recalcular N veces da el mismo resultado.

### 5.2 Errores / observabilidad
Log estructurado `{ correlationId: nroPedido, productoCd, fuentePrecio, usóFallbackTier, divergenciaOldNew }` cuando se deriva un tier o cuando (en dark-launch) old≠new.

## 6. Estrategia de testing
- **Contract (primero):** los fixtures dorados corren como unit test en FE (Jasmine) **y** en BE (script node) — misma entrada, misma salida. Falla si divergen.
- **Regresión:** snapshot de totales de M pedidos reales antes/después (el "después" debe cuadrar checkout = persistido = email).
- **E2E:** crear pedido en venta asistida con volumen+IVA manual → verificar checkout = doc Firestore = email = PDF.

## 7. Fases de implementación
1. **Fase A — contrato:** fixtures dorados + harness FE/BE. Incluir casos de pedidos reales que descuadran. (Sin cambiar cálculo aún → rojo esperado donde está el bug.)
2. **Fase B — algoritmo canónico:** implementar en `orderCalculationService` (BE) y `PaymentService` (FE). Ambos verdes contra fixtures. Sin tocar otros call-sites todavía.
3. **Fase C — backend manda lo persistido:** create/edit/list ya usan `orderCalculationService` → quedan correctos. Retirar `priceCalculations.js` (analytics pasa a leer el persistido o llamar al canónico), borrar `orders.js:7066/7222` muerto, `templateHelpers` consume canónico. **Aquí muere el fantasma en lo guardado.**
4. **Fase D — FE venta asistida:** `carrito`, `checkout`, `cotizacion-editor`, `orden-venta`, `list` delegan a `PaymentService`. El vendedor ve el mismo número que se persiste.
5. **Fase E — POS:** `pos-carrito`, `pos-checkout`, `pos-pedidos.util`, `factura-tirilla` delegan al mismo punto.
6. **Fase F — documentos + factura electrónica (alcance acotado, verificado):** email/PDF/tirilla consumen el canónico (retirar copia `templateHelpers`/`emailTemplates`). Factura electrónica (`worldOfficeDataMapper`, FE `facturacion.service`) = **cambio chico**: mapear el % por línea con la **tarifa efectiva** (override/categoría), no la base. **NO se tocan** Osmosis/Shopify/WooCommerce: el push solo **lee** `totalImpuesto` (se corrige en Fase C) y los mappers inbound usan los impuestos del sistema externo. Agente IA (`order-tools-registrar`) queda cubierto por Fase D (usa `pedidos.util`).
7. **Fase G — limpieza + retiro de flag.**

## 8. Plan de rollout
- **Feature flag `IVA_CALC_UNIFICADO`** (dueño: producto; retiro tras 2 semanas estable).
- **Dark-launch (Fase C):** calcular old+new en backend, persistir old, **loggear divergencias**. Cuando divergencias→0 en pedidos nuevos, switch a new.
- **Rollback:** flag off → vuelve a la ruta anterior (cero migración de datos, el cambio es de cálculo).

## 9. Riesgos técnicos
- **R-T1:** `orderCalculationService` toca create/edit/list/POS/fulfillment → regresión amplia. Mitiga: fixtures + dark-launch.
- **R-T2:** retirar `priceCalculations.js` cambia números de analytics (hoy "mal" de otra forma) → comunicar que analytics ahora cuadra con el pedido.
- **R-T3:** datos legacy con `conIVA` del tier también inconsistente → la derivación necesita guarda + log; si ambos campos faltan, fallback a base con log de alerta.
- **R-T4:** FE/BE en repos distintos pueden re-divergir → los fixtures dorados se versionan en `specs/010/contracts/` y corren en CI de ambos.

## 10. Open questions (técnicas)
- **OT-1:** ¿`desgloseIVA` se persiste en el doc del pedido (recomendado para factura electrónica) o se recalcula on-read? → propongo persistir.
- **OT-2:** limpieza de los campos incoherentes en productos (escritores `lista-precios`/`crear-productos`/mappers) — ¿sub-spec 010.1 de prevención? No bloquea: el cálculo robusto ya tolera el descuadre. Recomiendo diferir a 010.1.
- **OT-3:** cotizaciones persiste totales del FE (T-04) y pedidos los recalcula en BE — con el mismo algoritmo da igual, pero conviene fijar en tasks quién escribe la verdad por flujo.
