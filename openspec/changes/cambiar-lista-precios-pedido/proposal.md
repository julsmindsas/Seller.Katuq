# Cambiar la lista de precios de un pedido creado

**Ticket:** 1356 · ALMARA FELICIDAD · **D-544** · 23-oct-2026.
**Estado:** propuesta y spec APROBADAS por Daniel el 23-oct-2026: «Apruebo ambas specs y esas reglas». Diseño [APROBADO](design.md): «Apruebo ambos diseños y la adaptación». [Tareas APROBADAS](tasks.md): «Apruebo las tareas de ambos; implementa y valida». Implementación autorizada con gate previo de cada diff sensible; sin autorización de permisos reales o despliegue.

## Why

Un pedido registrado con Público cuando correspondía Mayorista necesita cambiar la lista aplicada sin rehacerlo ni perder pagos. Cambiar solamente la categoría del cliente no congela por sí solo el nuevo acuerdo ni garantiza coherencia en lectores que recalculan el pedido.

Hay reglas existentes distintas para precio manual, tipo de cliente, promociones y volumen (D-219/D-536, spec 010). El caso reportado en 1352 se reproduce en dos lectores locales de despachos; ver [evidencia común](../corregir-precio-pedido/findings.md). No se presume que ese incidente ya esté reparado en producción.

## What Changes

- Acción **Cambiar tipo de precio** en Más opciones, con permiso por rol y lista actual/nueva del mismo comercio.
- Vista previa por línea de cantidad, precio pactado actual, propuesta y diferencia; resumen de bruto, descuentos, domicilio, IVA, total, pagos, saldo por cobrar y saldo a favor. No guarda ni avisa.
- Aplicar las condiciones de la lista elegida, usando el precio vigente mostrado en la vista previa, con sus reglas de IVA y promociones. Las cantidades, extras, descuentos pactados y domicilio se conservan según las reglas canónicas; no agregar promociones actuales de catálogo por fuera de lo mostrado.
- **Precios manuales existentes se conservan por defecto.** Sustituirlos exige decisión explícita por línea; la vista previa muestra la excepción.
- Si falta precio activo en una lista, no elegir cero o Público silenciosamente: el usuario conserva expresamente el precio actual, ingresa uno **solo si el producto permite precio editable**, o cancela. Este límite propuesto evita abrir la edición de productos no editables por una vía alternativa.
- Confirmación con motivo; pagos intactos y excedente visible sin devolver dinero. Bloqueo fiscal, protección de Kuvo y control de concurrencia iguales a 1355.
- **Actualizar también la ficha del cliente** como opción desmarcada inicialmente, con permiso independiente de edición de clientes. Si se elige, cambiar solo su tipo/lista; el cambio del pedido y del cliente se aplican juntos o ninguno. Si no se elige, el pedido cambia y los siguientes pedidos conservan la ficha actual.
- Registro de lista anterior/nueva, decisiones por línea, motivo, actor y montos antes → después; integración con D-541 y sin historial paralelo.
- Piloto solo ALMARA FELICIDAD. 1355 precede a 1356 para resolver la coherencia compartida antes de ampliar el cambio a todas las líneas.

## Capabilities

- **New:** `order-price-list-change`, según la spec adjunta.
- **Modified:** coherencia de lectores de importes del pedido, sin cambiar reglas de inventario, facturación o pagos.

## Impact / límites de escritura

Pedido y sus lectores financieros, selección de listas y tipo de cliente, cálculo y registro del historial aprobado. La solución técnica se define después del checkpoint; sin colecciones nuevas ni rutas/módulos v2 autorizados por esta propuesta.

**Write-set:** lista/tipo aplicado al pedido, precios acordados de sus líneas, importes derivados y metadatos de la corrección; historial/auditoría aprobados. Solo con opción y permiso expresos: tipo/lista de la ficha del cliente de ese comercio. **Sin escrituras en productos, precios de catálogo, listas maestras, inventario, movimientos, pagos, facturas o proveedores.** No cambiar datos personales ni otros campos del cliente.

## No-goals

Crear listas, cambiar sus tarifas, cambiar cliente/cantidades/bodegas, recalcular otros pedidos del cliente, operaciones en lote, tocar POS, reembolsar, emitir/anular documentos fiscales o reparar históricos. El 1352 no cambia de responsable ni se cierra automáticamente. No ampliar los permisos de ningún rol para que la acción funcione.

## Riesgos y gates

`orders` y dinero: un cambio a la vez con diff aprobado; preservar D-536 y el trabajo concurrente de D-541. Vista previa obsoleta si cambian lista, producto o pagos: no confirmar con valores distintos sin nueva revisión. El tipo del cliente no sustituye el precio pactado del pedido; los lectores deben respetarlo también después de modificar una lista maestra. Casos canónicos de cálculo sin cambios, aislamiento por empresa, permisos separados y QA 1440/390 con UI D-131/D-400 antes de habilitar.

**Decisiones aprobadas con la spec (Daniel, 23-oct):** bloqueo fiscal; conservación predeterminada de precios manuales; ingreso manual por falta de lista limitado a productos editables; cambio de ficha opcional y con permiso propio; piloto ALMARA. No se implementa ni despliega antes de los checkpoints siguientes.
