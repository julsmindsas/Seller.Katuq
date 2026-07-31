# Diseño: descuento por línea en PDF de orden de venta y correo de confirmación

## Context

D-141 (`add-order-line-discount`) horneó el descuento por línea en dos lugares del backend al crear/editar un pedido:
- `order.totalDescuento` (agregado, ya compuesto correctamente con línea + global) — leído hoy por `orden-venta.component.ts:35` (`totalDescuentos`) y por la tabla de pedidos (`list.component.html:1219`). **Ya correcto, no se toca.**
- `item.producto.precio.precioEfectivoSinIva` + `item.descuentoLineaPct` + `item.descuentoLineaMonto` por línea (auditoría/consumo detallado). **Ningún consumidor de precio por línea en el PDF lo usa todavía.**

`orden-venta.component.ts::getPrecioUnitario()` resuelve el precio CON IVA por una jerarquía propia (manual → categoría → volumen → base, líneas 137-195) que es una implementación paralela (no llama a `iva-canonico.ts` ni al backend) — igual que `carrito.component.ts` y `checkout.component.ts` tienen las suyas. D-141 ya resolvió este mismo problema en `carrito.component.ts::checkPriceScale`, que envuelve la jerarquía existente (`checkPriceScaleBruto`) y multiplica el resultado final por `(1 - descuentoLinea/100)`.

## Goals / Non-Goals

**Goals:** que el PDF de orden de venta muestre "P. Unit."/"Total" por línea ya netos del descuento, de forma que la suma de líneas cuadre con el total general (ya correcto); que se vea un indicador visual del % de descuento por línea; determinar si el correo de confirmación necesita el mismo fix.

**Non-Goals:** no migra `orden-venta.component.ts` a usar `iva-canonico.ts` (fuera de alcance — ver nota abajo); no reabre el motor de cálculo del backend; no toca cotizaciones, checkout, SIIGO ni World Office (ya correctos).

## Decisions

### 1. Aplicar el factor de descuento sobre el precio ya resuelto, no leer `precioEfectivoSinIva` del backend

Dos caminos posibles:
- **(a)** Leer `item.producto.precio.precioEfectivoSinIva` (SIN IVA) y reconstruir CON IVA sumando la tarifa.
- **(b)** Igual que `carrito.component.ts::checkPriceScale`: mantener `getPrecioUnitario()` (CON IVA, por la jerarquía existente) intacto como "bruto", y multiplicar el resultado final por `(1 - descuentoLinea/100)`.

**Se elige (b)** porque:
- `item.producto.precio.precioUnitarioIva` (la tarifa) **solo se sobreescribe cuando `IVA_PERSIST_CANONICAL=true`** (`orderCalculationService.js:331-345`) — con el flag OFF (default hoy) no hay garantía de que la tarifa persistida en la línea sea la vigente, así que reconstruir CON IVA desde `precioEfectivoSinIva` sería frágil.
- Aplicar el descuento antes o después del IVA es matemáticamente equivalente para un único porcentaje — mismo razonamiento ya documentado en `carrito.component.ts:246-254`: `(1-d)×(1+r) == (1+r)×(1-d)`. No hay pérdida de precisión ni riesgo de doble conteo.
- Es el patrón ya validado en 2 consumidores (carrito, checkout) — la tercera implementación (PDF) lo replica exactamente, sin introducir una cuarta forma de calcular lo mismo.
- **Se usa `item.descuentoLinea`** (no `descuentoLineaPct`) como fuente, igual que carrito/checkout — para un pedido ya persistido ambos valores son equivalentes (mismo objeto guardado), pero `descuentoLinea` es el campo que ya conocen los 3 consumidores, evitando una cuarta convención de nombre.

### 2. Estructura del cambio en `orden-venta.component.ts`

Mismo split que D-141 hizo en `carrito.component.ts`:
```
getPrecioUnitarioBruto(item)   ←  la jerarquía actual, renombrada, SIN cambios de lógica
                │
                ▼
getPrecioUnitario(item)  =  getPrecioUnitarioBruto(item) × (1 - descLineaPct(item)/100)   (NUEVO)
```
`calcularTotalProducto(item)` no cambia — ya multiplica `cantidad × getPrecioUnitario(item)`, así que hereda el neto automáticamente.

### 3. Indicador visual en el PDF

Badge `-X%` junto a "P. Unit." en la tabla de productos (`orden-venta.component.html`), visible solo si `descLineaPct(item) > 0` — mismo patrón condicional que `checkout.component.html:639`. Estilo plano, sin gradientes, acorde a `openspec/specs/design-system/spec.md` (aunque este documento es un PDF impreso, no una pantalla de la app — se mantiene sobrio, sin depender de tokens SCSS del tema si el componente ya tiene su propia hoja de estilos de impresión).

### 4. Correo de confirmación — investigar antes de tocar

D-141 (`design.md`, Decisión 4) documentó que el email/comanda (`payment.service.ts::generateHtmlContentInternal`) **ya lee totales agregados y no necesita cambios** — verificado ahí con grep de dos usos de "descuentos" como total. Este cambio **reconfirma** ese hallazgo (no se asume vigente sin volver a mirar, por si el código cambió desde D-141) y busca específicamente si existe alguna sección del correo que muestre precio o descuento **por línea/producto** (no solo el total). Si existe, se aplica el mismo fix de la Decisión 1. Si no existe, se documenta como "sin cambios necesarios" y se cierra la tarea 3 de ClickUp en ese punto.

## Risks / Trade-offs

- **Ninguno nuevo** — este cambio no introduce una fórmula de cálculo nueva, solo replica en un tercer archivo (`orden-venta.component.ts`) el mismo patrón ya probado en `carrito.component.ts`/`checkout.component.ts`.
- Riesgo de que el correo de confirmación resulte ser una plantilla distinta a la esperada — mitigado investigando antes de escribir código (tarea 3 de `tasks.md`).

## Migration Plan

1. `orden-venta.component.ts`: split `getPrecioUnitario` en bruto + descuento (Decisión 1-2).
2. `orden-venta.component.html`: badge de descuento por línea (Decisión 3).
3. Investigar plantilla de correo de confirmación de venta asistida; aplicar el mismo fix solo si muestra detalle por línea (Decisión 4).
4. Verificación: generar un PDF de un pedido con descuento de línea + global y confirmar que la suma de "Total" por línea coincide con el subtotal/descuento de la sección de totales.
