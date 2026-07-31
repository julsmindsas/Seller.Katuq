# Diseño: edición de IVA manual por línea en un pedido ya creado

## Context

`Carrito.producto` no tiene un id de línea propio (`pedido.ts:325-336`); las líneas del pedido son un arreglo posicional (`order.carrito[i]`), sin `uid`. `updateOrderInternal` (`orders.js:3112`) ya implementa lock optimista vía `_baseVersion` (= `date_upd`) y responde 409 `STALE_WRITE` si el documento cambió entre lectura y escritura del cliente. El motor canónico de IVA (`orderCalculationService.js`) ya resuelve la jerarquía manual→categoría→volumen→base y persiste la tarifa efectiva (`IVA_PERSIST_CANONICAL=true`).

## Goals / Non-Goals

**Goals:** permitir editar el IVA manual de una línea específica de un pedido ya creado, recalculando y persistiendo los totales de forma congruente con spec010, con auditoría y sin abrir la puerta a incongruencia fiscal.

**Non-Goals:** no reabre el cálculo de precio por volumen ni `preciosPorTipoCliente`; no toca el mapper de SIIGO; no crea RBAC nuevo; no permite editar líneas de un pedido con factura electrónica ya emitida (eso es nota de crédito, fuera de alcance); no migra `list.component.ts` a una arquitectura modular — solo agrega un componente pequeño nuevo.

## Decisions

### 1. Endpoint dedicado, no reutilizar `edit` genérico

`POST /v1/orders/edit-linea-iva` — se usa POST (no PATCH) porque el router de `orders` es 100% POST-lite (`edit`, `edit-multiple-orders`, `restore-product-inventory`, etc.); mantener la convención existente en vez de introducir el único endpoint REST-y del archivo. Body `{ orderId, lineIndex, productoCd, ivaManual, _baseVersion }`. Se identifica la línea por **índice posicional + `productoCd` como verificación cruzada**: el backend relee el pedido dentro de una transacción Firestore, valida que `carrito[lineIndex].producto.cd === productoCd` (si no coincide, el pedido cambió → 409 `LINE_MISMATCH`, el FE debe refrescar) y que `_baseVersion` coincide (mismo mecanismo 409 `STALE_WRITE` que `edit`). No se introduce un `uid` de línea nuevo en el modelo — el índice es válido dentro de la transacción porque el lock optimista garantiza que el arreglo no cambió entre lectura y escritura. También valida `company` del header contra `order.company` (403 `FORBIDDEN`) por multi-tenancy.

### 2. Recalculo server-side reutilizando el motor canónico

El handler nuevo llama `orderCalculationService.calculateOrderTotals` (o el helper de línea `resolverPrecioLinea`) sobre el pedido con el override aplicado, y persiste el resultado (`carrito[lineIndex]._ivaManualOverride`, `totalImpuesto`, `subtotal`, `total`) en la misma escritura. **No se reimplementa el cálculo** ni en este handler ni en el frontend — el frontend solo envía la intención (línea + nuevo IVA) y refresca con lo que el backend devuelve ya recalculado.

### 3. Guardarraíl fiscal: bloqueo si ya hay factura electrónica

Antes de aplicar el cambio, el handler verifica `order.facturacion?.nroFactura` / `order.pdfUrlInvoice` (campos del modelo `Pedido.js`). Si el pedido ya tiene factura electrónica emitida, la operación se rechaza con un error explícito ("pedido ya facturado, requiere nota de crédito") — no se aplica silenciosamente ni se reintenta.

### 4. Auditoría sin colección nueva

Se agrega un registro al cambiar el IVA de una línea: usuario, fecha, línea (índice + `productoCd`), IVA anterior y nuevo. Se guarda como subcampo del propio documento del pedido (ej. `ivaOverrideHistory: [...]`), siguiendo el patrón de auditoría ya usado en el proyecto — no se crea colección Firestore nueva (regla dura de config.yaml).

### 5. Frontend: componente modal nuevo, no ampliar el monolito

Nuevo componente standalone pequeño (SRP) — recibe el pedido, lista sus líneas (producto, cantidad, IVA actual), permite seleccionar una y elegir el nuevo IVA entre los mismos valores permitidos que venta asistida (0/5/8/19, mismo patrón que `carrito.component.ts:249-348`). Llama a un método nuevo en `VentasService` (extiende `BaseService`, nunca `HttpClient` directo). Se invoca como una acción más desde la pantalla de pedidos (`list.component.ts`) sin agregarle lógica de cálculo — el componente nuevo no duplica el motor de cálculo en FE (a diferencia de `pedidos.util.service.ts:580-638`, que sí lo hace hoy para otros flujos; aquí se evita a propósito).

### 6. UI

Sigue el tema canónico `openspec/specs/design-system/spec.md` (acento `#5F3FE0`, plano sin gradientes, chips fuerte/fondo-suave para mostrar el IVA actual vs. nuevo).

## Risks / Trade-offs

- **Línea identificada incorrectamente** (productos duplicados en el carrito) → mitigado con verificación cruzada índice + `productoCd` dentro del lock optimista; si no coincide, se rechaza y el FE refresca.
- **Edición concurrente** (otro operador edita el mismo pedido, ej. flujo de "recompra") → mismo mecanismo 409 STALE_WRITE que ya usa `edit`; el usuario reintenta sobre el estado fresco.
- **Incongruencia fiscal** si se edita IVA de un pedido ya facturado → bloqueado explícitamente (Decisión 3), no es responsabilidad de este cambio habilitar la corrección post-factura.
- **Regresión de spec010** si el nuevo handler no usa el motor canónico → mitigado exigiendo que la única vía de cálculo sea `orderCalculationService`, igual que el resto de la spec010.

## Migration Plan

1. Backend: nuevo handler + ruta + reuso de `orderCalculationService` + guardarraíl fiscal + auditoría.
2. Frontend: método en `VentasService` + componente modal nuevo + acción desde `list.component.ts`.
3. Contract tests: línea editada correctamente, línea con `productoCd` desalineado (conflicto), pedido con factura ya emitida (bloqueo), 409 por lock optimista, verificación de que el override respeta jerarquía del motor canónico (no jerarquía distinta).
4. Verificación manual en un pedido de prueba: PDF (`orden-venta.component.ts`), listado/reportes y (si aplica) mapper UBL/World Office reflejan el nuevo IVA sin tocarlos directamente.

## Open Questions

Ninguna pendiente. **Resuelta (2026-07-24, checkpoint humano):** el permiso para editar IVA de línea es el mismo que ya protege la edición general de pedidos (`edit`) — no se agrega RBAC nuevo.
