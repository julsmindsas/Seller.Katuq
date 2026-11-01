# Corregir el precio de una línea de un pedido

**Ticket:** 1355 · ALMARA FELICIDAD · **D-543** · 23-oct-2026.
**Estado:** propuesta y spec APROBADAS por Daniel el 23-oct-2026: «Apruebo ambas specs y esas reglas». Diseño [APROBADO](design.md): «Apruebo ambos diseños y la adaptación». [Tareas APROBADAS](tasks.md): «Apruebo las tareas de ambos; implementa y valida». Implementación autorizada con gate previo de cada diff sensible; sin autorización de permisos reales o despliegue.

## Why

Un precio editable registrado por error, por ejemplo $200.000 en vez de $20.000, no tiene una corrección posterior guiada con vista previa, motivo y permisos. Corregir solo la pantalla o guardar el pedido completo con valores calculados por el navegador no garantiza integridad del cobro.

El ticket 1352 reporta saldo $21.700 en Pedidos y $15.701 en Logística. Se reprodujo esa diferencia con los métodos locales de dos vistas de Órdenes de despacho: ignoran el precio manual $6.000 y usan $1 del snapshot de catálogo. No se ha leído ni corregido ese pedido en producción. Evidencia y límites: [findings.md](findings.md).

## What Changes

- Acción **Corregir precio** en Más opciones, disponible para usuarios autorizados y líneas de productos realmente habilitados para precio editable en el comercio.
- Precio **base sin IVA**, como D-536; conservar tarifa y descuentos vigentes del pedido. Vista previa antes → después de línea, bruto, descuentos, domicilio, IVA, total, pagos, saldo y eventual saldo a favor; no guarda ni envía avisos.
- Confirmación con motivo obligatorio. El cálculo autorizado prevalece en pedido, cobro, cartera, Logística, planilla/app del mensajero, reportes e impresión/correo cuando se consulten o generen de nuevo. Los documentos ya enviados conservan su historia.
- Conservar pagos, cantidades, producto, bodega y estados operativos. No crear reembolsos ni pagos para cuadrar un total menor. Saldo por cobrar mínimo cero, con excedente visible por separado.
- Bloquear pedidos facturados o cuya situación fiscal no se pueda determinar; indicar el camino fiscal existente, sin emitir documentos. También conservar el cierre financiero de Kuvo.
- Rechazar vista previa obsoleta ante cambios del pedido, pagos, facturación o condiciones autorizadas. Doble confirmación/reintento no duplica cambio ni historial.
- Registro de usuario, momento, motivo, línea inequívoca y valores antes → después, integrado con el historial aprobado D-541. No crear un historial paralelo.
- Disponibilidad inicial limitada a ALMARA FELICIDAD; otros comercios conservan el comportamiento actual hasta habilitación expresa.

## Capabilities

- **New:** `order-line-price-correction`, según la spec adjunta.
- **Modified:** coherencia de lectores de importes del pedido, sin cambiar reglas de inventario, facturación o pagos.

## Impact / límites de escritura

Frontend de pedidos y lectores financieros; backend de pedidos/cálculo y registro aprobado del historial. El diseño definirá el contrato reutilizando las capacidades actuales: esta propuesta no autoriza colecciones nuevas ni rutas/módulos v2.

**Write-set:** precio de la línea elegida, importes derivados y metadatos de la corrección del pedido objetivo; registro de auditoría/historial aprobado. Lecturas acotadas a la empresa autenticada de pedido, producto, pagos, factura y permisos. **Sin escrituras en catálogo, productos, listas, inventario, movimientos, bodegas, pagos, facturas o integraciones externas.** La ficha del cliente tampoco cambia en este ticket.

## No-goals

Cambiar IVA/descuentos/cantidades, editar precios no habilitados, rehacer POS, emitir/anular facturas, devolver dinero, modificar pedidos en lote o reparar históricos. 1352 sigue siendo de Santiago: esta propuesta exige su caso como regresión y coherencia de lectores, no reasigna ni cierra el incidente. El segundo cambio, 1356, tiene su propia spec.

## Riesgos y gates

`orders` es sensible: diseño, tareas y diffs se aprueban por separado; un cambio a la vez. Coordinar con D-536 y D-541, cuyos archivos tienen trabajo concurrente. Los lectores que recalculan con catálogo deben quedar identificados y verificados antes de habilitar. Validación con casos de la spec 010 sin alterarlos, permisos/multiempresa, factura concurrente, pagos rechazados/anulados y QA 1440/390; build prod antes de entrega. Tema D-131/D-400, sin nueva paleta o gradientes.

**Decisiones aprobadas con la spec (Daniel, 23-oct):** precio sin IVA; bloqueo de pedidos facturados; excedente informativo sin devolución automática; piloto ALMARA. El diseño siguiente conserva su checkpoint; sin tareas ni implementación.
