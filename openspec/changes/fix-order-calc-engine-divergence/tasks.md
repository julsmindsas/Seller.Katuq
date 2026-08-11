# Tasks

## 1. Fase 0 — Auditoría comparativa (solo lectura, bloqueante)
- [ ] 1.1 Leer `functions/scripts/audit-iva-divergence-readonly.js` (D-054) completo para reusar su patrón/estructura en vez de escribir uno nuevo desde cero.
- [ ] 1.2 Armar batería de casos: (a) solo descuento de línea %, (b) solo descuento global %, (c) cupón `valor_fijo`, (d) cupón dirigido a categoría/producto, (e) promoción automática (`_precioPromocional`), (f) combinaciones de (a)+(b), (a)+(c).
- [ ] 1.3 Correr cada caso por los 3 motores: legacy (`payment.service.ts`), canónico frontend (`iva-canonico.ts`), canónico backend (`orderCalculationService.js::calculateOrderTotals`) — documentar el resultado exacto de cada uno (subtotal/IVA/descuento/total) en una tabla.
- [ ] 1.4 Si hay pedidos reales recientes con descuento de línea o cupones no-porcentuales disponibles (Firestore, solo lectura), correrlos también contra `orderCalculationService.js` y comparar con lo persistido — mismo espíritu que la auditoría de 500 pedidos de D-054.
- [ ] 1.5 Confirmar explícitamente: ¿`orderCalculationService.js` soporta cupones `valor_fijo`/dirigidos a categoría-producto, o solo la rama porcentual (`descuentoLinea% × porceDescuento%`)? Esto decide el alcance de la Fase 1.
- [ ] 1.6 Presentar la tabla de resultados al usuario (checkpoint humano) — NO avanzar a Fase 1 sin esto.

## 2. Fase 1 — Cierre (alcance depende de 1.5, un cambio a la vez)
- [ ] 2.1 (si 1.5 confirma soporte de `valor_fijo` en backend Y paridad legacy-vs-canónico-frontend en todos los casos de 1.2-1.4) Activar `ivaCalcUnificado: true` en `environment.prod.ts`.
- [ ] 2.2 (si 1.5 revela hueco real en backend) Cerrar el hueco en `orderCalculationService.js` — task concreta a definir según el hallazgo exacto de 1.5, CON contract test nuevo antes de tocar el archivo (mismo patrón que `test-line-discount-contract.js`, D-146). Diff + aprobación explícita antes de aplicar (módulo sensible).
- [ ] 2.3 Solo después de 2.2 (si aplicó), repetir 2.1.
- [ ] 2.4 `npx tsc --noEmit` (frontend) y `node --check` (archivos backend tocados) limpios tras cada edit.
- [ ] 2.5 Si se tocó backend: correr el contract test existente (`npm run test:descuentos-money-path` o el que aplique) — 0 regresiones.

## 3. Verificación manual end-to-end (cierra deuda de D-142/D-135)
- [ ] 3.1 En navegador: crear un pedido de venta asistida con descuento de línea en un producto + cupón/descuento global, confirmar que el total en el carrito, en el paso de checkout, en el módulo de Pedidos (recién creado) y en el PDF son EXACTAMENTE el mismo número.
- [ ] 3.2 Repetir 3.1 con un cupón `valor_fijo` o dirigido a categoría (el caso que motivó esta propuesta).
- [ ] 3.3 Prueba de regresión: un pedido SIN ningún descuento se ve idéntico a antes del cambio en los 4 puntos.
- [ ] 3.4 Si 3.1-3.3 resuelven de paso las tareas 2.1/2.2 de `fix-order-line-discount-pdf-email/tasks.md` o 3.1/3.3 de `edit-order-line-iva`, marcarlas también.

## 4. Cierre
- [ ] 4.1 Registrar como **D-163** en `specs/CONTRACT.md` — incluir el resultado real del audit de Fase 0 (tabla o resumen), no solo la intención original de esta propuesta.
- [ ] 4.2 Confirmar con el usuario si los 3 hallazgos NO cubiertos por esta propuesta (checkout.component.ts:834, listado-vs-detalle en backend, `/orders/edit` sin recalcular) se abren como propuestas separadas ahora o quedan en el roadmap para después.
