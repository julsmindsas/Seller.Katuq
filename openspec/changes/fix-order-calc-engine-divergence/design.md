# Diseño: cerrar la divergencia de motores de cálculo (frontend legacy vs. canónico vs. backend)

## Context

Hoy conviven en el frontend dos implementaciones completas de "cuánto cuesta esta línea/este pedido":

- **Legacy** (`payment.service.ts`, funciones originales de `checkPriceScale`/`checkIVAPrice`): resuelve la jerarquía de precio (manual → categoría → volumen → base) y el IVA, pero **nunca conoce `descuentoLinea`**.
- **Canónica** (`iva-canonico.ts`): construida explícitamente como espejo del motor real del backend, sí aplica `descuentoLinea`.

Un flag (`environment.ts` / `environment.prod.ts` → `ivaCalcUnificado`) decide cuál corre. Hoy: `true` en dev, `false` en prod. `checkout.component.ts` y `list.component.ts` (módulo de Pedidos) llaman a `PaymentService`, que internamente elige según el flag — así que en prod ambos consumidores corren el motor legacy.

El backend nunca usa ninguno de los dos motores del frontend: `POST /orders/create` recalcula todo desde cero con `orderCalculationService.js::calculateOrderTotals` (motor "canónico backend", la fuente de verdad real), e ignora lo que el frontend haya mandado.

Esto significa que **el frontend en prod tiene DOS fuentes de verdad activas simultáneamente y ninguna es la real**: lo que el vendedor ve (legacy, sin descuento de línea) y lo que efectivamente queda guardado (canónico backend, con descuento de línea) — casi garantizado a divergir en cualquier venta con descuento por línea.

## Goals / Non-Goals

**Goals:** que "lo que ve el vendedor en venta asistida / módulo de Pedidos" y "lo que queda persistido en el pedido" sean el mismo número, siempre, para los tipos de descuento ya soportados hoy — confirmado con un audit reproducible, no por inspección de código únicamente.

**Non-Goals:**
- No decide todavía si `checkout.component.ts:834` (bug de `totalDescuento` sobrescrito) se arregla en este cambio o en uno separado — se decide después de la Fase 0.
- No toca los endpoints de listado/detalle de Pedidos (inconsistencia recálculo-en-vivo vs. documento congelado) — propuesta separada.
- No toca `/orders/edit` — propuesta separada.
- No introduce un tercer motor de cálculo ni refactoriza `orderCalculationService.js` salvo que la Fase 0 confirme un hueco concreto (descuentos `valor_fijo`/dirigidos).

## Decisions

### 1. Auditoría antes que código (Fase 0 bloqueante)

Se elige **no activar el flag a ciegas** aunque parezca la solución obvia (el motor canónico frontend ya existe, ya corre en dev, y es el camino de menor esfuerzo). Razón: la investigación de esta sesión NO confirmó si `orderCalculationService.js` (el motor canónico backend, fuente de verdad real) soporta descuentos `valor_fijo`/dirigidos a categoría-producto — solo se verificó la rama porcentual (`descuentoLinea% × porceDescuento%`). Si el backend tampoco soporta esos cupones, activar el flag en frontend synchroniza el frontend con un backend que YA está mal para ese caso — se resolvería la divergencia pero no el bug de fondo. La Fase 0 (script de audit, mismo patrón que `audit-iva-divergence-readonly.js` de D-054) corre en modo lectura contra pedidos reales (o casos sintéticos si no hay suficiente variedad real) y determina el alcance exacto de la Fase 1 con evidencia, no con inspección de código.

### 2. Camino preferido: reusar `iva-canonico.ts`, no reescribir cálculo

Si la Fase 0 confirma paridad entre `iva-canonico.ts` y `orderCalculationService.js`, la Fase 1 es literalmente cambiar un booleano (`ivaCalcUnificado: true` en `environment.prod.ts`). Se prefiere esto sobre eliminar la lógica de cálculo del frontend por completo (opción más invasiva: frontend deja de calcular y solo refleja lo que el backend le devuelve) porque:
- El motor canónico frontend ya existe, ya está probado en dev, y fue diseñado explícitamente como espejo — no es código nuevo.
- Es reversible con un solo valor de config si algo sale mal en prod (vs. una reescritura que sería más costosa de revertir).
- Menor blast radius: no cambia contratos de API ni estructura de componentes, solo la rama de cálculo que ya existe y compite con la legacy.
- La opción "frontend deja de calcular, solo refleja backend" queda como posible follow-up de más largo plazo si tras activar el flag se siguen viendo divergencias — no es necesaria para cerrar el gap conocido hoy.

### 3. Si la Fase 0 encuentra el hueco de `valor_fijo`/dirigidos en el backend

Se cierra ahí primero, con contract tests (mismo patrón `test-line-discount-contract.js` de D-146), ANTES de activar el flag — activar el flag sin esto sincronizaría el frontend con un cálculo backend que sigue estando mal para ese tipo de cupón, dejando el bug de `checkout.component.ts:834` (que también depende de ese mismo tipo de descuento) sin solución real aunque deje de "verse" en frontend.

### 4. Verificación manual real, no solo tests automatizados

D-142 y D-135 dejaron pendiente la verificación manual en navegador (bloqueada por un problema de red del Chrome remoto, D-137). Esta propuesta la incluye como tarea explícita de cierre — no se considera "hecho" solo con tests de contrato en verde, dado el historial de este mismo síntoma quedando sin confirmar dos veces seguidas.

## Risks / Trade-offs

- Activar el flag en prod puede exponer diferencias de comportamiento no vistas en dev si el tráfico/datos reales de producción tienen formas de pedido que dev no cubre (promociones combinadas, clientes con categorías especiales, etc.) — mitigado con el audit de Fase 0 corriendo contra pedidos reales (o una muestra representativa) antes de activar, y con monitoreo post-activación.
- Riesgo de reabrir `ORE-000494` (campos de total persistidos corruptos, spec 010) si se interpreta mal el alcance — mitigado: esta propuesta NO toca cómo se calcula el historial de redenciones (ese ya usa "desde el carrito"), solo el flag de venta asistida en vivo.
- Si la Fase 0 revela que el hueco de `valor_fijo` es más profundo de lo esperado (p. ej. afecta también SIIGO/facturación), el alcance de la Fase 1 crece — se documenta como spin-off, no se absorbe silenciosamente en este cambio.

## Migration Plan

1. Fase 0: escribir/adaptar script de audit read-only (batería de casos sintéticos + muestra de pedidos reales con descuento) comparando legacy / `iva-canonico.ts` / `orderCalculationService.js`. Producir tabla de resultados.
2. Checkpoint humano: revisar la tabla de audit con el usuario antes de decidir el alcance exacto de la Fase 1 (flag simple vs. flag + fix de backend).
3. Fase 1 (según resultado): activar `ivaCalcUnificado` en prod, y/o cerrar el hueco de `valor_fijo` en `orderCalculationService.js` con contract tests.
4. Verificación manual end-to-end en navegador: pedido con descuento de línea + cupón, confirmar que carrito → checkout → Pedidos → PDF muestran el mismo total en cada paso.
5. Cierre: registrar D-163 en `CONTRACT.md` con el resultado real del audit (no solo la intención), y actualizar las tareas abiertas de D-142/D-135 si esta verificación las resuelve de paso.
