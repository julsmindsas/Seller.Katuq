# Cambio de lista de precios de un pedido — D-544 / 1356

**Comercio inicial:** ALMARA FELICIDAD. **Estado:** APROBADA por Daniel el 23-oct-2026: «Apruebo ambas specs y esas reglas».

## ADDED Requirements

### Requirement: Elegibilidad y alcance

WHEN un usuario autorizado abre Más opciones de un pedido elegible, THE system SHALL ofrecer **Cambiar tipo de precio**, mostrando su lista actual y las listas disponibles del mismo comercio. Usuario, pedido, productos, listas y cliente SHALL validarse contra la empresa autenticada; ninguna autorización SHALL depender solo del navegador. La habilitación inicial SHALL limitarse a ALMARA FELICIDAD.

#### Scenario: Lista ajena
- **WHEN** se solicita una lista de otro comercio
- **THEN** se rechaza sin mostrar sus datos ni cambiar el pedido

### Requirement: Vista previa verificable

WHEN se elija otra lista, THE system SHALL mostrar por cada línea identificable producto, cantidad, precio pactado actual, nuevo precio base/con IVA, origen y diferencia, además de bruto, descuentos, domicilio, IVA, total, pagos vigentes, saldo por cobrar y saldo a favor antes → después. THE system SHALL conservar cantidades, extras y condiciones no cambiadas; aplicar las reglas comerciales de la lista sin doble descuento ni promoción implícita ajena a la vista previa. La consulta o cancelación SHALL producir cero escrituras y cero avisos.

#### Scenario: Vista previa sin guardar
- **WHEN** se cambia de lista en la vista previa
- **THEN** se muestran las diferencias sin escrituras ni avisos

### Requirement: Excepciones explícitas

IF una línea ya tiene precio manual, THE system SHALL conservarlo por defecto y permitir sustituirlo por el de la lista solo mediante decisión explícita identificada por línea. IF no existe precio activo en la lista elegida, THE system SHALL exigir que el usuario conserve expresamente el precio pactado, ingrese un precio base sin IVA finito mayor o igual a cero solo cuando el producto real permita edición, o cancele; no SHALL usar cero ni otra lista silenciosamente. Cada excepción SHALL aparecer en vista previa y registro.

#### Scenario: Conservar precio manual
- **WHEN** una línea tiene precio manual y no se elige sustituirlo
- **THEN** se conserva ese precio en la propuesta y al confirmar

### Requirement: Confirmación, pagos y lecturas posteriores

WHEN el usuario confirme con motivo no vacío, THE system SHALL guardar la lista aplicada y los precios acordados y recalcular una sola vez de forma coherente, conservando los pagos y sus estados; solo los pagos vigentes SHALL reducir el saldo conforme a las reglas actuales. Si hay sobrepago, THE system SHALL mostrar por cobrar cero y excedente separado, sin crear devoluciones, pagos o abonos contables.

WHEN el pedido se consulte desde detalle, pagos, cartera, Logística, planilla/app del mensajero, reportes e impresión/correo generado posteriormente, THE system SHALL respetar los precios acordados del pedido aun si luego cambia el catálogo, la lista maestra o la categoría actual del cliente. No SHALL reenviar ni alterar documentos ya emitidos automáticamente. El caso de referencia de 1355 ($43.400 de total y $21.700 de saldo) SHALL mantener su coherencia en lectores; precio manual y precio de catálogo distintos no SHALL degradar el saldo a $15.701.

#### Scenario: Pedido corregido y catálogo posterior
- **WHEN** se cambia después el catálogo o la categoría del cliente
- **THEN** los lectores conservan los precios acordados del pedido

### Requirement: Ficha del cliente opcional

WHEN el usuario solo confirme el cambio del pedido, THE system SHALL mantener intacta la ficha del cliente y los demás pedidos. WHEN marque **Actualizar también el tipo de cliente** —desmarcada por defecto— y tenga permiso independiente de editar ese cliente, THE system SHALL aplicar solo el tipo/lista de la ficha y la corrección del pedido, ambos o ninguno. Sin permiso, sin cliente verificable o ante modificación concurrente, THE system SHALL impedir esa confirmación y permitir preparar una nueva operación solo sobre el pedido; no SHALL degradar la intención silenciosamente.

#### Scenario: Ficha sin autorización
- **WHEN** se pide cambiar la ficha sin permiso de clientes
- **THEN** se rechaza la confirmación sin aplicar cambios parciales

### Requirement: Fiscalidad, concurrencia y trazabilidad

IF hay factura emitida, emisión en curso, elegibilidad fiscal incierta o cierre financiero protegido, THE system SHALL bloquear la operación sin emitir ni anular documentos. IF cambian pedido, pagos, facturación, lista, permiso, producto o cliente afectado desde la vista previa, THE system SHALL rechazar sin escritura parcial y exigir nueva revisión. Un reintento o doble clic no SHALL duplicar efecto ni registro.

WHEN se guarde un cambio, THE system SHALL registrar usuario, momento, origen, motivo, lista anterior/nueva, excepciones por línea, importes antes → después y si cambió la ficha, de modo identificable y recuperable en el historial aprobado del pedido. La integración con D-541 SHALL definirse antes de habilitar; no SHALL crearse un historial paralelo.

#### Scenario: Doble confirmación
- **WHEN** se repite la misma confirmación
- **THEN** no se duplica el efecto ni el registro

### Requirement: Aislamiento y verificación

THE system SHALL mantener autenticación y permisos y escribir solo el pedido objetivo, su historial/auditoría aprobados y, con opción y permiso, el tipo/lista del cliente; productos, listas maestras, inventario, movimientos, pagos y facturas SHALL permanecer intactos. No SHALL exponer información de otro comercio o datos sensibles en logs.

Antes de habilitar, THE system SHALL superar casos de cambio Público→Mayorista, IVA no cero, descuentos y extras, precios manuales conservados/sustituidos, lista incompleta, precio cero, sobrepago, pagos no vigentes, concurrencia y cliente sin permiso, conservando casos canónicos de cálculo sin alteración. La UI SHALL usar el tema Katuq y permitir teclado y cancelación a 1440/390 px sin desbordamiento del diálogo ni texto oculto; el éxito SHALL reflejar lo guardado realmente.

#### Scenario: Regresión entre módulos
- **WHEN** se valida el caso de referencia tras aplicar el cambio
- **THEN** los importes concuerdan entre lectores y no cambian inventario ni pagos
