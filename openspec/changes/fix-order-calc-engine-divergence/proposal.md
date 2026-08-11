# Propuesta: Cerrar la divergencia entre el motor de cálculo del frontend y el del backend en venta asistida

## Why (con datos reales, no asunciones)

Origen: reporte del usuario — "problemas con la matemática a la hora de crear pedidos desde la venta asistida y que estos queden plasmados correctamente en el módulo de pedidos y el PDF del pedido". Investigación de esta sesión (3 agentes de exploración, solo lectura) sobre frontend, backend y el historial SDD (`CONTRACT.md`/`openspec/changes/`) encontró **4 causas independientes**; esta propuesta ataca la que el usuario priorizó como la más grave — el resto queda registrado en "Riesgos / no-objetivos" como seguimiento separado (una a la vez, por regla del proyecto).

**Verificado en código esta sesión (2026-08-11, solo lectura):**

- En producción, `environment.prod.ts:62` tiene `ivaCalcUnificado: false`. `PaymentService.checkPriceScale`/`checkIVAPrice` (`payment.service.ts:203-210`) usan ese flag para elegir entre dos implementaciones completas de cálculo de precio/IVA/descuento:
  - **Legacy** (activa en prod): en ninguna de las dos funciones se referencia `descuentoLinea` — el descuento por línea que el vendedor sí ve aplicado en el carrito se ignora al recalcular en `checkout.component.ts` (líneas 557-569) y en el listado de Pedidos (`list.component.ts:3020-3047`, disparado por `necesitaRecalculoFrontend`).
  - **Canónica** (`iva-canonico.ts`) — declarada explícitamente como espejo del backend (`orderCalculationService.js`) — sí aplica `descuentoLinea` (`iva-canonico.ts:146-147`). Ya está activa en desarrollo (`environment.ts:64` → `true`), solo apagada en prod.
- El backend, en `POST /orders/create` (`controllers/orders.js:5604`), **ignora el total que manda el frontend** y recalcula todo desde cero con el motor canónico real (`orderCalculationService.js::calculateOrderTotals`, flag `IVA_PERSIST_CANONICAL=true` en `.env`), que sí aplica `descuentoLinea`.
- Consecuencia directa: en cualquier venta con descuento por línea, el vendedor ve/gestiona en pantalla (checkout, y luego en el módulo de Pedidos) un total calculado con el motor legacy (sin descuento de línea), mientras el pedido que efectivamente queda persistido usa el motor canónico (con descuento de línea) — dos números distintos para la misma venta, sin que nadie lo note hasta que alguien compara.
- Precedente relevante ya registrado: **spec 010** (`CONTRACT.md` línea ~1279, incidente `ORE-000494`) — el "Total pedido" del historial de redenciones se cambió para calcularse **desde el carrito** en vez de confiar en los campos de total persistidos, porque esos campos podían estar corruptos. Esta propuesta va en la dirección contraria (frontend confía más en backend) para OTRO consumidor (venta asistida en vivo, no historial), así que el audit de la Fase 0 (abajo) debe confirmar que no reabre ese mismo riesgo antes de tocar nada.
- Contexto SDD relacionado: D-054/D-056/D-057/D-059/D-060/D-062 (spec 010, congruencia de IVA — auditoría real de 500 pedidos con `functions/scripts/audit-iva-divergence-readonly.js`), D-141/D-142 (descuento por línea en carrito/PDF/correo — **verificación manual en navegador nunca completada**, tareas 2.1/2.2 de `fix-order-line-discount-pdf-email/tasks.md` siguen abiertas), D-146 (promociones automáticas agregadas al motor canónico, 26/26 tests en `test-line-discount-contract.js`).

## What Changes

**Fase 0 — Auditoría comparativa (solo lectura, sin tocar código de producción):** reutilizar el patrón ya validado de `audit-iva-divergence-readonly.js` (D-054) para construir una batería de casos reales (descuento por línea solo, descuento global % solo, cupón `valor_fijo`, cupón dirigido a categoría/producto, promoción automática, combinaciones) y correrlos en paralelo por el motor **legacy** (`payment.service.ts`), el motor **canónico frontend** (`iva-canonico.ts`) y el motor **canónico backend** (`orderCalculationService.js`). Producir una tabla de comparación real, no asumida — en particular confirmar si el motor canónico backend soporta descuentos `valor_fijo`/dirigidos (la investigación de esta sesión no lo confirmó, solo vio la rama porcentual) antes de decidir el alcance exacto de la Fase 1.

**Fase 1 — Cierre de la divergencia (alcance exacto depende del resultado de la Fase 0):**
- Camino más probable si la Fase 0 confirma paridad: activar `ivaCalcUnificado: true` en `environment.prod.ts`, con monitoreo y plan de rollback (flag ya existe, reutilizable de inmediato).
- Camino alterno si la Fase 0 encuentra un hueco real en el motor canónico (p. ej. descuentos `valor_fijo` no soportados): cerrar ese hueco en `orderCalculationService.js` primero (con contract tests), y solo entonces activar el flag.
- Verificación manual end-to-end en navegador (carrito → checkout → pedido guardado → módulo de Pedidos), cerrando la deuda de verificación dejada abierta por D-142/D-135.

## Impact

- Specs afectadas: capability nueva `order-calc-engine-parity` (delta en este `changes/`), relacionada con la capability existente `order-line-discount` (D-141/D-142) sin modificarla directamente.
- Frontend: `src/environments/environment.prod.ts` (flag), posible ajuste en `iva-canonico.ts` solo si la Fase 0 encuentra un gap ahí (no esperado, ya es el espejo declarado del backend).
- Backend: posible ajuste en `orderCalculationService.js` SOLO si la Fase 0 confirma el hueco de descuentos `valor_fijo`/dirigidos — no se toca nada si el audit no lo confirma.
- Decisión reservada: próximo D-XXX disponible en `CONTRACT.md` es **D-163** (confirmar al registrar — el proyecto tiene precedente de colisiones de numeración entre sesiones paralelas, no se renumeran, se distingue por título completo).

## Riesgos / no-objetivos

- **No** se toca en esta propuesta (quedan como seguimiento separado, uno a la vez):
  1. `checkout.component.ts:834` sobrescribe `pedido.totalDescuento` con `pedidoUtilService.getDiscount()`, que retorna 0 para cupones `valor_fijo`/dirigidos — el cupón visto en el carrito desaparece antes de crear el pedido. Puede resultar relacionado con el hueco de la Fase 0 (si el backend tampoco soporta esos cupones, el bug es doblemente redundante); se decide si se resuelve junto o aparte SOLO después de la Fase 0.
  2. Backend: los endpoints de listado de Pedidos (`getAllByFilter`/`getAllByFilterOptimized`) recalculan `calculateOrderTotals` en cada lectura con la fórmula ACTUAL sin persistir, mientras los endpoints de detalle (`getByNroPedido`/`getOrderByNroPedido`) devuelven el documento crudo con la fórmula vigente cuando se creó — pedidos viejos muestran total distinto en listado vs. detalle/PDF. Requiere su propia propuesta (decisión de si migrar a backfill + congelar, o recalcular también en detalle).
  3. Backend: `/orders/edit` (`updateOrderInternal`) no recalcula nada server-side — graba ciegamente lo que manda el frontend, a diferencia de `create`. Requiere su propia propuesta (alinear `edit` con `create`).
- Riesgo de reabrir el incidente `ORE-000494` (campos de total persistidos corruptos) si se activa el flag sin el audit de la Fase 0 — mitigado exigiendo la Fase 0 como bloqueante antes de cualquier cambio de código.
- Riesgo de que activar `ivaCalcUnificado` en prod tenga efectos secundarios no vistos en dev (tráfico/datos reales distintos) — mitigado con monitoreo post-activación y plan de rollback del flag (revertir es un solo valor de config).
- No reabre el mapper de SIIGO/World Office ni cotizaciones (fuera de alcance, ya cubiertos o son bugs separados — D-143).
