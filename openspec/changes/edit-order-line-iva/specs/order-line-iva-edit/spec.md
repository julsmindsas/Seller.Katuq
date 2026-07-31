# Delta: order-line-iva-edit

## ADDED Requirements

### Requirement: Edición del IVA manual de una línea de un pedido ya creado
CUANDO un operador autorizado edita el IVA de una línea de un pedido ya persistido, el sistema DEBERÁ (SHALL) recalcular y persistir los totales del pedido (`totalImpuesto`, `subtotal`, `total`) usando el motor canónico de cálculo (`orderCalculationService`), sin reimplementar el cálculo en el frontend ni en un handler distinto.

#### Scenario: Edición válida de IVA de línea
- **GIVEN** un pedido creado con una línea cuyo IVA manual es `19`
- **WHEN** el operador edita esa línea a IVA `5` desde el módulo de pedidos
- **THEN** el pedido persiste `_ivaManualOverride = 5` en esa línea y `totalImpuesto`/`subtotal`/`total` quedan recalculados de forma congruente con el motor canónico

#### Scenario: Línea desalineada (conflicto)
- **GIVEN** un pedido cuya línea en el índice enviado ya no corresponde al `productoCd` que el frontend tenía cargado (el pedido cambió entre la carga y el envío)
- **WHEN** se intenta aplicar la edición de IVA
- **THEN** el sistema rechaza la operación sin aplicar el cambio y el frontend debe refrescar el pedido antes de reintentar

### Requirement: Lock optimista en la edición de IVA de línea
CUANDO se edita el IVA de una línea, el sistema DEBERÁ (SHALL) exigir `_baseVersion` y responder 409 `STALE_WRITE` si el pedido fue modificado por otra operación desde que el cliente lo cargó, igual que en la edición general de pedidos.

#### Scenario: Edición concurrente
- **GIVEN** un pedido editado por otra operación (ej. se agregó un producto por "recompra") después de que el operador cargó la pantalla de edición de IVA
- **WHEN** el operador envía su cambio de IVA con la `_baseVersion` desactualizada
- **THEN** el sistema responde 409 sin aplicar el cambio

### Requirement: Bloqueo de edición de IVA en pedidos ya facturados
EL sistema NO DEBERÁ (MUST NOT) permitir editar el IVA de una línea de un pedido que ya tiene factura electrónica emitida (`nroFactura`/`pdfUrlInvoice` presentes).

#### Scenario: Pedido con factura ya emitida
- **GIVEN** un pedido con `nroFactura` ya asignado
- **WHEN** se intenta editar el IVA de una de sus líneas
- **THEN** el sistema rechaza la operación indicando que el pedido ya está facturado y que la corrección requiere una nota de crédito (fuera de alcance de este cambio)

### Requirement: Auditoría del cambio de IVA por línea
CUANDO se aplica un cambio de IVA de línea, el sistema DEBERÁ (SHALL) registrar usuario, fecha, línea afectada, IVA anterior e IVA nuevo, sin crear una colección Firestore nueva.

#### Scenario: Registro de auditoría
- **GIVEN** una edición de IVA aplicada exitosamente
- **WHEN** se consulta el historial del pedido
- **THEN** existe un registro con quién hizo el cambio, cuándo, la línea afectada y los valores anterior/nuevo

### Requirement: Aislamiento de producto, precios y catálogo
EL sistema NO DEBERÁ (MUST NOT) modificar el producto maestro, sus variantes, catálogo, precio base, `preciosPorTipoCliente` ni listas de precios al editar el IVA de una línea de pedido.

#### Scenario: Edición de IVA no toca el maestro de producto
- **GIVEN** un producto con precio base y `preciosPorTipoCliente` definidos
- **WHEN** se edita el IVA manual de una línea de un pedido que contiene ese producto
- **THEN** el documento del producto permanece sin cambios; solo se modifica la línea del pedido (snapshot de venta)
