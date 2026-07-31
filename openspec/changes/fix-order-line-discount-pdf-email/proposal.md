# Propuesta: Descuento por línea en el PDF de orden de venta y en el correo de confirmación

## Why (con datos reales, no asunciones)

Origen: tarea ClickUp `wdu9v75qq6` ("llevar los descuentos individuales el pdf y al correo y tiene que aparecer al final de la venta asistida"), dentro del checklist "TESTER PANTALLA DE COTIZACIONES" (`wdu9v75jw1`). Continuación directa de **D-141** (`add-order-line-discount`).

El propio diseño de D-141 (`openspec/changes/add-order-line-discount/design.md`, Decisión 4, tabla de consumidores) ya identificó que el **PDF de orden de venta necesitaba cambiar** ("Sí (mínimo) — Pasa de leer `precioUnitarioSinIva` a `precioEfectivoSinIva` para esa línea"), pero ese ítem **nunca se tradujo en una tarea de `tasks.md`** — el archivo de tasks de D-141 solo cubre carrito/checkout/conversión/SIIGO, no el PDF. Es un cabo suelto del propio alcance original, no una funcionalidad nueva.

**Verificado en código esta sesión (2026-07-30, solo lectura, sin cambios):**
- `checkout.component.html:639` (paso final de venta asistida) SÍ muestra el badge `-X%` por línea, leyendo `item.descuentoLinea`. Este consumidor ya está bien.
- `orden-venta.component.ts::getPrecioUnitario()` (el PDF generado con `html2pdf.js` desde `list.component.ts`) resuelve el precio por la misma jerarquía (manual → categoría → volumen → base) pero **no aplica el descuento de línea en ningún punto**. "P. Unit." y "Total" por línea salen con el precio lleno.
- El total general "Descuento" del PDF (`orden-venta.component.ts:35`, getter `totalDescuentos`) sí lee `pedido.totalDescuento`, que desde D-141 ya viene compuesto correctamente desde el backend (`orderCalculationService.js::calculateOrderTotals`). **Esto produce un PDF descuadrado**: la suma de los "Total" por línea no coincide con el subtotal/descuento de la sección de totales cuando hay descuento por producto.
- Las plantillas de notificación/correo del backend (`katuq_admin_back_firebase/functions`) no mencionan `descuentoLinea` en ningún archivo — el correo de confirmación tampoco refleja el descuento por línea (se investiga en este cambio qué plantilla/servicio genera ese correo antes de decidir el ajuste exacto).

## What Changes

- **A. `orden-venta.component.ts` aplica el descuento de línea al precio unitario del PDF.** Mismo patrón que `carrito.component.ts::checkPriceScale`: la jerarquía de precio existente (`getPrecioUnitario`, renombrada internamente a "bruto") no se toca; el resultado final se multiplica por `(1 - descuentoLinea/100)`. Esto corrige simultáneamente "P. Unit." y "Total" por línea, y hace que la suma de líneas vuelva a cuadrar con el total general de descuento ya correcto.
- **B. Indicador visual del descuento por línea en el PDF** (`orden-venta.component.html`), mismo patrón de badge que `checkout.component.html`, para que quien lea el PDF entienda por qué el precio unitario difiere del precio de lista.
- **C. Investigación del correo de confirmación de venta asistida** — ubicar qué servicio/plantilla genera ese correo (candidato inicial: `payment.service.ts::generateHtmlContentInternal`, ya identificado en D-141 design.md como consumidor de "solo-totales" que no necesitaba cambios). Confirmar si además de los totales agregados (ya correctos) el correo muestra detalle por línea; si lo hace, aplicar el mismo fix que (A). Si no muestra detalle por línea, no se toca (los totales agregados ya son correctos desde D-141).

## Impact

- Specs afectadas: extiende la capability existente `order-line-discount` (delta nuevo sobre `openspec/specs/order-line-discount/` si existe, o sobre el delta ya creado por D-141) — cierra el gap de la Decisión 4 de su propio diseño, no introduce alcance nuevo.
- Frontend: `src/app/components/ventas/orden-venta/orden-venta.component.ts` y `.html`.
- Backend: ninguno esperado (el total agregado ya es correcto desde D-141); posible ajuste en la plantilla de correo si la investigación de (C) confirma que muestra detalle por línea — a determinar durante la implementación.
- Sin cambios al motor de cálculo (`orderCalculationService.js`, ya correcto), sin cambios a cotizaciones, sin cambios al checkout (ya correcto).
- Decisión reservada: próximo **D-XXX** disponible en CONTRACT.md (confirmar número exacto al registrar — ver nota de colisiones de numeración vigente).

## Riesgos / no-objetivos

- **No** reabre el motor de cálculo del backend ni la jerarquía de precio (manual → categoría → volumen → base) — solo aplica el factor de descuento ya definido por D-141, en un consumidor que quedó pendiente.
- **No** toca el mapper de SIIGO ni World Office — ya cubiertos por D-141.
- **No** toca cotizaciones ni el checkout — ya funcionan correctamente.
- Riesgo de que la plantilla de correo real no sea la esperada (`payment.service.ts`) — se investiga antes de tocar, no se asume; si el correo no muestra detalle por línea, (C) se cierra como "sin cambios necesarios" documentado, no se fuerza un cambio innecesario.
