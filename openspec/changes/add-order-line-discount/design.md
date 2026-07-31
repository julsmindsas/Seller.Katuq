# Diseño: descuento por línea en venta asistida

## Context

El modelo `Carrito` (`src/app/components/ventas/modelo/pedido.ts:338-349`) ya declara `descuentoLinea?: number` con el comentario *"Usado en cotizaciones"* — el campo existe en el tipo compartido pero solo lo consume `cotizacion-editor.component.ts`. El motor canónico de spec010 (`orderCalculationService.js`, `resolverPrecioLinea`/`calcularTotalesPedido`, líneas 345-469) ya resuelve `{ precioSinIVA, tarifa }` por línea según jerarquía manual → categoría → volumen → base, y ya compone el descuento **global** (`porceDescuento`) multiplicativamente dentro del cálculo de IVA (`ivaLinea = lineaSinIVA * (tarifa/100) * (1 - porceDesc)`, línea 424). Este cambio extiende esa misma composición para incluir un segundo factor por línea, sin tocar la resolución de precio existente.

Precedente directo de "hornear en el snapshot al persistir": bajo el flag `IVA_PERSIST_CANONICAL`, `calculateOrderTotals` (línea 252-267) ya reescribe `item.producto.precio.precioUnitarioIva` con la tarifa efectiva resuelta por línea. Este diseño sigue el mismo patrón pero en un campo **nuevo**, no sobre uno existente — lección aprendida de D-046 (un override de IVA que colapsaba el precio a la unidad base por pisar el campo equivocado).

## Goals / Non-Goals

**Goals:** permitir un descuento por producto dentro del carrito de venta asistida, resuelto por un único motor de cálculo (no replicado por consumidor), que sobreviva la conversión de cotización a pedido, y que los consumidores de solo-totales (PDF resumen, email/comanda) sigan funcionando sin cambios.

**Non-Goals:** no reabre precio por volumen/categoría; no permite editar el descuento de una línea en un pedido ya creado (extensión futura); no resuelve la pregunta legal/DIAN sobre declaración explícita en SIIGO (documentada, con default seguro); no toca producto/catálogo/precios maestros; no migra `list.component.ts` a arquitectura modular.

## Decisions

### 1. Composición: multiplicativa con el descuento global, no exclusiva

`factorNeto = (1 - descuentoLinea/100) × (1 - porceDescuento/100)`. Se eligió componer (no hacerlos mutuamente excluyentes) porque:
- Es el mismo patrón ya validado y en producción en cotizaciones (`descuentoLinea` × `descGlobal`).
- Matemáticamente bien definido y conmutativo — no importa el orden de aplicación.
- Evita el caso incómodo de "el vendedor no puede aplicar un código de descuento global porque ya le dio un descuento manual a un producto".

La UI del carrito debe mostrar el desglose completo (bruto → descuento línea → descuento global → neto) para que el vendedor entienda el efecto compuesto, no solo el resultado.

### 2. El descuento vive DENTRO del motor canónico, no como capa externa

A diferencia de cotizaciones (un solo consumidor de su capa de descuento), venta asistida tiene 6+ consumidores de precio de línea. Poner el descuento dentro de `resolverPrecioLinea`/`calcularTotalesPedido` significa que el único lugar que necesita saber "cómo se calcula un descuento" es el motor — todo lo demás lee el resultado ya resuelto. Esto es aditivo: `descuentoLinea` default `0` dejando el comportamiento actual bit-a-bit idéntico cuando el campo no se usa.

```
resolverPrecioLinea(item, ctx)  →  { precioSinIVA, tarifa }     (YA EXISTE, sin tocar)
                    │
                    ▼
aplicarDescuentoLinea(precioSinIVA, item.descuentoLinea, order.porceDescuento)
                    │
                    ▼
        precioEfectivoSinIva  (NUEVO — lo que se hornea en el snapshot)
```

### 3. Hornear en un campo nuevo, no sobreescribir el precio base

Al crear/editar el pedido, `calculateOrderTotals` escribe en cada línea:
- `item.producto.precio.precioEfectivoSinIva` — precio sin IVA, ya neto de descuento línea + global, resuelto según jerarquía vigente. **Este es el campo que deben leer los consumidores que necesitan precio por línea** (PDF detallado, mappers de facturación).
- `item.descuentoLineaPct` — el % de descuento de línea aplicado (auditoría, congelado en el momento de la venta).
- `item.descuentoLineaMonto` — el valor en pesos del descuento de línea (auditoría).
- `item.producto.precio.precioUnitarioSinIva`/`precioUnitarioConIva`/`precioUnitarioIva` **no se tocan** — siguen siendo el precio base tal como los resuelve la jerarquía, sin descuento. Esto preserva la capacidad de reconstruir "cuál era el precio real vs. cuánto se descontó" en cualquier momento futuro (auditoría, reportes, disputas).

Por qué no pisar el campo existente (lección de D-046): un consumidor futuro que necesite el precio SIN descuento (ej. un reporte de "cuánto se dejó de cobrar por descuentos", o reabrir el pedido para edición) no tendría de dónde derivarlo si el campo base ya viene neto. Separar los campos cuesta un campo más en el snapshot pero elimina esa clase de bug por completo.

### 4. Consumidores: quién cambia y quién no

| Consumidor | Cambia? | Por qué |
|---|---|---|
| `carrito.component.ts` / `checkout.component.ts` | Sí | Necesitan mostrar y permitir editar el descuento en vivo, antes de crear el pedido |
| `orders.js` (create/edit) → `calculateOrderTotals` | Sí | Es el único punto que hornea el precio efectivo |
| `iva-canonico.ts` (espejo FE) | Sí | Debe reflejar exactamente la misma composición que el backend, para que el checkout muestre el mismo total que luego persiste el pedido |
| PDF de orden de venta (`list.component.ts`, detalle por línea) | Sí (mínimo) | Pasa de leer `precioUnitarioSinIva` a `precioEfectivoSinIva` para esa línea — sigue siendo una lectura simple, no recalcula nada |
| Email/comanda (`payment.service.ts::generateHtmlContentInternal`) | **No** | Ya lee `pedido.totalDescuento`/`subtotal` agregados, no recalcula por línea (verificado: solo dos usos de `descuentos` como total, líneas 1834-2271) |
| `siigoDataMapper.js` | Sí (mínimo) | Pasa a leer `precioEfectivoSinIva` en vez de recomponer desde el % global; ver Decisión 5 |
| `worldOfficeDataMapper.js` | Por confirmar | Ya lee `carrito.descuento` (campo distinto, posiblemente vestigial) — se investiga antes de decidir si se alinea el nombre o se dejan ambos caminos |
| `cotizacion-convert.service.ts` | Sí | Agrega `descuentoLinea` a `itemsCtx` — el fix puntual que origina esta propuesta |

### 5. SIIGO: precio neto con `discount: 0` por defecto, declaración explícita como pregunta abierta

Hoy `siigoDataMapper.js:715-757` distribuye el % de descuento GLOBAL como si fuera un descuento por línea idéntico en todos los ítems, solo para satisfacer el formato de SIIGO (`items[].discount` como porcentaje, D-043). Con descuento real por línea, esa simulación deja de ser correcta.

**Default de este cambio:** enviar `unitPrice = precioEfectivoSinIva` (ya neto) y `discount: 0`. El total facturado es matemáticamente correcto en cualquier caso — la única diferencia es si SIIGO/DIAN necesitan ver el % de descuento **declarado explícitamente** por línea (posible requisito fiscal) en vez de implícito en un precio más bajo. Esto no se puede resolver desde el código — requiere confirmación del contador/asesor tributario del proyecto. Se documenta como pregunta abierta explícita (ver más abajo), no bloqueante.

### 6. UI: mismo patrón visual que cotizaciones, en el carrito de venta asistida

Input de descuento por línea junto a los controles existentes de IVA/precio manual en `carrito.component.ts`. Reusa los getters ya probados de `cotizacion-editor.component.ts` como referencia de fórmula (`getValorBruto`/`getDescuentoUnitario`/`getPrecioSinIvaNeto`/`getValorIvaNeto`) — no se copian literalmente (arquitecturas de componente distintas) pero sí la fórmula y el orden de presentación. Tema canónico `openspec/specs/design-system/spec.md`.

## Risks / Trade-offs

- **Divergencia FE/BE en el cálculo del descuento** → mitigado exigiendo que `iva-canonico.ts` sea un espejo exacto de `orderCalculationService.js` para esta composición, mismo patrón ya usado para IVA (contract tests con fixtures compartidos).
- **Confusión del vendedor con descuento línea + global compuestos** → mitigado con desglose visible completo en el carrito (Decisión 1).
- **SIIGO factura con un número incorrecto si el mapper no se actualiza** → cubierto en este mismo cambio (Decisión 5); el riesgo residual es solo la declaración explícita del %, no el monto total.
- **World Office queda inconsistente si `carrito.descuento` era intencional y no vestigial** → se investiga antes de tocar (tarea dedicada), no se asume.
- **Reventar el flag `ivaCalcUnificado` de spec010** (Fase D aún no completada — `checkout`/`carrito`/`list.component` todavía no delegan al canónico para el camino principal) → este cambio NO depende de que `ivaCalcUnificado` esté encendido: el descuento de línea se calcula y hornea directamente en `calculateOrderTotals`/`iva-canonico.ts` (que ya se ejecutan siempre), no exclusivamente detrás del flag. Se verifica explícitamente que el camino legacy (flag OFF) también compone el descuento de línea correctamente.

## Migration Plan

1. Backend: extender `resolverPrecioLinea`/`calcularTotalesPedido` con `descuentoLinea` (aditivo, default 0) + hornear `precioEfectivoSinIva`/`descuentoLineaPct`/`descuentoLineaMonto` en `calculateOrderTotals`.
2. Frontend: espejo en `iva-canonico.ts` + UI en `carrito.component.ts`/`checkout.component.ts` con desglose visible.
3. Fix del conversor: `cotizacion-convert.service.ts` agrega `descuentoLinea` a `itemsCtx`.
4. `siigoDataMapper.js`: leer `precioEfectivoSinIva`, `discount: 0` por defecto; documentar la pregunta DIAN como pendiente.
5. Investigar `worldOfficeDataMapper.js::carrito.descuento` (vestigial o real) antes de decidir si se alinea.
6. Contract tests: fixtures que combinen descuento línea + global + volumen + categoría + IVA manual (reusar la disciplina de fixtures de spec010), verificar que PDF/SIIGO reflejan el precio neto sin recalcular, verificar que el precio base (`precioUnitarioSinIva`) permanece intacto tras un pedido con descuento.
7. Verificación manual: crear un pedido con descuento por línea + descuento global en venta asistida, confirmar PDF y (si aplica) factura SIIGO en ambiente de prueba; convertir una cotización con descuento de línea a pedido y confirmar que el descuento sobrevive.

## Open Questions

1. **SIIGO/DIAN**: ¿el régimen tributario exige declarar el descuento explícito por línea en la factura electrónica, o basta con el precio ya neto? Requiere confirmación del contador/asesor tributario del proyecto — no bloquea este cambio (default seguro documentado en Decisión 5).
2. **World Office**: ¿`carrito.descuento` (que el mapper ya lee) es el campo pensado para esto, o es código vestigial de otro flujo? Se resuelve investigando antes de la tarea correspondiente.
