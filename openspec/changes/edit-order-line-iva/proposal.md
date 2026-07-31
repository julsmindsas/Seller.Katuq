# Propuesta: Editar el IVA manual de una línea de un pedido ya creado

## Why (con datos reales, no asunciones)

Tarea ClickUp `wdu9v75nat` ("Abrir la opción de Editar pedido para poner IVA posterior a la creación"), carpeta MODO CRITICO / lista LISTA DE MODO CRITICO, asignada a Julian Navarro.

En venta asistida (crear-ventas → carrito) ya existe la posibilidad de fijar un IVA manual por producto vía `_ivaManualOverride`/`_precioManualOverride` (`src/app/components/ventas/modelo/pedido.ts:325-336`, `carrito/carrito.component.ts:249-348`), copiado al payload al crear el pedido (`crear-ventas.component.ts:631-632`). Pero **una vez el pedido está creado, no hay ninguna pantalla ni acción para modificar ese IVA por línea**:

- `list.component.ts` (pantalla de listado/detalle de pedidos) solo permite fijar IVA manual al **agregar un producto nuevo** a un pedido existente (modal de "recompra", ~línea 6528) — no al editar una línea que ya está en `order.carrito`.
- `orden-venta.component.ts` (PDF) es de solo lectura: lee `totalImpuesto`/`subtotal` ya persistidos, no recalcula.
- Backend: `functions/controllers/orders.js` expone `exports.edit` (línea 4574) → `updateOrderInternal` (línea 3112) con lock optimista (`_baseVersion`, maneja 409 STALE_WRITE, commit `52e42253`). **`updateOrderInternal` no recalcula IVA/totales server-side hoy**: confía en lo que envía el FE. Replicar ese patrón para editar IVA de una línea ya persistida reabriría el riesgo de divergencia que spec010 (`specs/010-venta-asistida-impuestos-congruencia/spec.md`, status approved) ya identificó y corrigió para pedidos nuevos.
- El motor canónico de spec010 (`functions/services/orderCalculationService.js`, `calculateOrderTotals` línea 195, `resolverPrecioLinea`/`calcularTotalesPedido` líneas 312-486, activo bajo `IVA_PERSIST_CANONICAL=true`) sí sabe resolver y persistir la tarifa efectiva por línea — hoy solo se usa en creación/edición general, no expone una vía dedicada para "cambiar solo el IVA de esta línea".

## What Changes

- **A. Endpoint dedicado en backend** para editar el IVA manual de una línea de un pedido ya creado (no sobrecargar el `edit` genérico): recibe identificador de línea + nuevo IVA + `_baseVersion` (mismo lock optimista que `edit`), carga el pedido, aplica el override sobre esa línea y **recalcula totales server-side reutilizando `orderCalculationService`** (no se reimplementa el cálculo en el backend ni en el FE).
- **B. Frontend: nuevo componente pequeño (modal)**, invocado desde la pantalla de pedidos, que lista las líneas del pedido, permite elegir una y editar su IVA (mismos valores permitidos que venta asistida: 0/5/8/19), llama al nuevo endpoint vía `VentasService` (extiende `BaseService`) y refresca la vista con los totales ya recalculados por el backend.
- **C. Propagación por diseño, no por código nuevo**: como los consumidores (factura electrónica UBL/World Office, PDF `orden-venta.component.ts`, listados/reportes, notificaciones) leen los totales **persistidos** del pedido (`totalImpuesto`, `subtotal`, `total`), al recalcular y guardar server-side en (A) todos quedan congruentes sin tocarlos individualmente. SIIGO permanece deliberadamente aislado (T-17 de spec010) — este cambio no lo toca.
- **D. Guardarraíl fiscal**: si el pedido ya tiene factura electrónica emitida (`nroFactura`/`pdfUrlInvoice` presentes en el modelo `Pedido`), el endpoint **bloquea** la edición de IVA — corregir un pedido ya facturado es una nota de crédito, fuera de alcance de este cambio.
- **E. Auditoría del cambio**: se registra quién, cuándo, línea, IVA anterior y nuevo (reutilizando el patrón de auditoría ya existente del proyecto; sin colección Firestore nueva).

## Impact

- Specs afectadas: nueva capability `order-line-iva-edit` (delta nuevo), extiende/depende del motor canónico de spec010 (no lo reimplementa).
- Código backend: `functions/controllers/orders.js` (nuevo handler), ruta nueva, `functions/services/orderCalculationService.js` (reuso, sin reescribir su lógica).
- Código frontend: `src/app/shared/services/ventas/ventas.service.ts` (nuevo método), nuevo componente modal pequeño (SRP), acción nueva desde la pantalla de pedidos (`list.component.ts`) sin migrar el resto del monolito.
- Sin colecciones Firestore nuevas. Multi-tenant (todo filtrado por `company`, nada hardcodeado).
- Decisión reservada: **D-135** en CONTRACT.md.

## Riesgos / no-objetivos

- No reabre el cálculo de precio por volumen ni toca `preciosPorTipoCliente`.
- No modifica el mapper de SIIGO ni su aislamiento (T-17).
- No modifica producto, variantes, catálogo ni listas de precios — el override es exclusivamente sobre la línea del pedido ya vendida (snapshot), igual que en venta asistida.
- No crea RBAC/roles nuevos: usa el mismo criterio de permisos que hoy protege `edit` de pedidos.
- No permite editar IVA de un pedido con factura electrónica ya emitida (riesgo de incongruencia fiscal con DIAN); la corrección post-factura queda fuera de alcance.
- Riesgo de identificar la línea equivocada si hay productos duplicados en el carrito con distinta configuración — el diseño debe usar un identificador de línea estable, no solo el índice del array (se resuelve en design.md).
