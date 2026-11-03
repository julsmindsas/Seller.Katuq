## ADDED Requirements

### Requirement: Los conceptos de la factura se ven en el panel
Cuando una persona abre el detalle de una factura aceptada, el sistema SHALL mostrar los conceptos facturados con su descripción, cantidad, valor unitario sin IVA, tarifa de IVA y valor de la línea, sin descargar el PDF. El sistema SHALL cargarlos al abrir el panel, con un estado de carga y un estado de error con «Reintentar». Si la lectura falla, el sistema SHALL dejar usables el resto del panel (cliente, valor, CUFE y acciones).

#### Scenario: Factura con tres conceptos
- **WHEN** se abre una factura aceptada con tres conceptos
- **THEN** el panel lista los tres con cantidad, valor unitario, IVA y valor de línea
- **AND** la suma de los valores de línea coincide con la base mostrada

#### Scenario: Falla la lectura de los conceptos
- **WHEN** la consulta de conceptos falla
- **THEN** el panel muestra un aviso breve con «Reintentar»
- **AND** el cliente, el valor, el CUFE y los botones de descarga siguen disponibles

### Requirement: Los totales salen de lo que se emitió
El sistema SHALL mostrar en el panel la base (valor sin IVA), el descuento, el IVA por cada tarifa, el envío cuando exista y el total, tomados de lo que se guardó al emitir. El total SHALL ser igual al «Valor» del documento. En una nota crédito o débito, el sistema SHALL mostrar sus totales y la factura que cita, sin lista de conceptos. Un documento rechazado o sin aceptar SHALL mostrar solo sus totales.

#### Scenario: Factura con dos tarifas de IVA
- **WHEN** la factura tiene conceptos al 19 % y al 5 %
- **THEN** el panel muestra una fila de IVA por cada tarifa y el total del IVA
- **AND** base + IVA − descuento + envío es igual al total

#### Scenario: Nota crédito
- **WHEN** se abre una nota crédito aceptada
- **THEN** el panel muestra sus totales y el número de la factura que cita
- **AND** no muestra lista de conceptos

### Requirement: Forma de pago, medio de pago y vencimiento
El sistema SHALL mostrar si la factura fue de contado o a crédito, el medio de pago en palabras (efectivo, consignación, transferencia, tarjeta crédito o tarjeta débito) y, en las de crédito, la fecha de vencimiento con «vence en N días» o «venció hace N días», calculado solo con esa fecha. Cuando el dato no se conozca (facturas anteriores a esta mejora o pedidos sin vencimiento fiscal), el sistema SHALL decir «No disponible para esta factura» y NO SHALL suponer un valor.

#### Scenario: Factura a crédito
- **WHEN** se abre una factura a crédito con vencimiento dentro de 12 días
- **THEN** el panel muestra «Crédito», el medio de pago, la fecha y «vence en 12 días»

#### Scenario: Dato desconocido
- **WHEN** se abre una factura cuya forma de pago no se guardó
- **THEN** el panel muestra «No disponible para esta factura» en lugar de «Contado»

### Requirement: Lo mostrado coincide con lo aceptado por la DIAN
Cuando los conceptos se reconstruyen desde el pedido de origen, el sistema SHALL verificar que su total coincida con el total aceptado (diferencia máxima de $1). Si no coincide, el sistema SHALL ocultar los conceptos, mostrar solo los totales y avisar «El pedido cambió después de facturar; mostramos lo que se emitió».

#### Scenario: Pedido editado después de facturar
- **WHEN** el pedido de una factura cambió después de emitirla y su total ya no coincide
- **THEN** el panel no lista conceptos y muestra los totales emitidos con el aviso

### Requirement: Abonos y mora desde Cartera, solo lectura
Cuando la factura viene de un pedido y la persona tiene permiso de Cartera, el sistema SHALL mostrar lo abonado, lo que falta por cobrar, los días de mora y un enlace «Ver en Cartera», leídos de Cartera tal como ella los calcula. El saldo por cobrar de Cartera SHALL rotularse distinto del «Saldo» de la factura después de sus notas. Cuando la factura no tiene pedido, Cartera no tiene datos, o la persona no tiene permiso, el sistema SHALL ocultar el bloque sin mostrar error ni cifras supuestas. El sistema NO SHALL registrar abonos ni modificar saldos, pedidos o Cartera desde este panel.

#### Scenario: Factura de pedido con abono parcial
- **WHEN** se abre una factura de pedido con un abono y saldo pendiente vencido
- **THEN** el panel muestra lo abonado, lo que falta, los días de mora y «Ver en Cartera»

#### Scenario: Factura libre
- **WHEN** se abre una factura sin pedido
- **THEN** el bloque de abonos y mora no aparece y el resto del panel no cambia

#### Scenario: Usuario sin permiso de Cartera
- **WHEN** una persona sin rol de tesorería abre una factura de pedido
- **THEN** no ve el bloque ni un mensaje de error

### Requirement: Solo lectura, de la empresa activa y con el diseño Katuq
El sistema SHALL leer únicamente datos de la empresa activa y NO SHALL escribir ni cambiar la emisión, los consecutivos, el CUFE, el saldo ni las notas. El panel SHALL usar el estilo plano de Katuq (tarjetas blancas, acento `#5F3FE0`, labels en mayúscula tenue, sin degradados) y SHALL verse sin desplazamiento horizontal ni texto invisible a 1440 y 390 px.

#### Scenario: Panel en el celular
- **WHEN** se abre el panel de una factura con seis conceptos a 390 px de ancho
- **THEN** los conceptos y los totales caben sin desplazamiento horizontal
- **AND** ningún texto queda invisible

#### Scenario: Nada cambia al consultar
- **WHEN** se abre y cierra el panel de cualquier documento
- **THEN** el documento, su saldo, su pedido y la numeración quedan exactamente igual
