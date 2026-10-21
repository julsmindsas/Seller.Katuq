## ADDED Requirements

### Requirement: Edición de precio base, IVA y descuento por línea en el ticket del POS
Cada línea del ticket de Ventas POS SHALL ofrecer los mismos controles que la línea del paso del carrito de la venta asistida:
- un campo de **precio base sin IVA**, solo cuando el producto tenga `procesoComercial.permitePrecioManual === true`;
- un selector de **IVA** con las tarifas 0, 5, 8 y 19;
- un campo **Desc. %**;
- el desglose del IVA y el precio con IVA resultante.

Cuando el producto no permita precio manual, el precio SHALL mostrarse como solo lectura y SHALL poder cambiarse únicamente el IVA y el descuento.

#### Scenario: Producto con precio manual
- **WHEN** el vendedor agrega al ticket un producto con `permitePrecioManual: true`, escribe 50.000 en el precio base y elige IVA 19 %
- **THEN** la línea muestra "+ $9.500 IVA = $59.500" y el total del ticket suma 59.500 × cantidad

#### Scenario: Producto sin precio manual
- **WHEN** el vendedor agrega un producto sin `permitePrecioManual`
- **THEN** el precio no es editable, pero puede cambiar el IVA de la línea y el Desc. %

### Requirement: Saneo en el front igual al de la venta asistida
El precio base manual SHALL aceptar solo números ≥ 0. Si al salir del campo (o al presionar Enter) queda vacío, no es un número o es negativo, la línea SHALL volver a su precio original. El Desc. % SHALL quedar acotado entre 0 y 100. El IVA SHALL elegirse solo entre las cuatro tarifas.

#### Scenario: Precio borrado
- **WHEN** el vendedor borra el precio base y sale del campo
- **THEN** la línea vuelve al precio de lista del producto y no viaja ningún precio manual en el pedido

### Requirement: Un solo cálculo para ticket, cobro, pedido y tirilla
El total del ticket, el monto que se cobra, el pedido que se envía al servidor y la tirilla impresa SHALL calcular cada línea con la misma fórmula. Para una línea con cambios:

precio con IVA = precio sin IVA × (1 + tarifa/100) × (1 − descuento/100)

- El precio sin IVA es el manual si aplica; si no, el sin IVA del producto (escala de volumen si corresponde).
- La tarifa es la manual si se eligió; si no, la del producto.

Una línea **sin** cambios SHALL calcularse exactamente como hoy.

#### Scenario: Línea sin cambios
- **WHEN** el ticket tiene solo productos que el vendedor no modificó
- **THEN** el total, el monto cobrado y el pedido enviado son idénticos a los de la versión anterior

#### Scenario: Cobro en efectivo con línea modificada
- **WHEN** el vendedor cambia el IVA de una línea a 0 % y cobra en efectivo
- **THEN** el monto que pide el modal de efectivo es igual al total del ticket, y el pedido guardado por el servidor tiene ese mismo total (diferencia máxima de $1 por redondeo)

### Requirement: Los cambios viajan a nivel de línea del pedido
El pedido POS SHALL llevar `_precioManualOverride` (solo si el producto permite precio manual y se fijó un precio), `_ivaManualOverride` (solo si se eligió una tarifa) y `descuentoLinea` (solo si es mayor que 0) **en la línea del carrito**, con los mismos nombres y significado que en la venta asistida. Las líneas sin cambios SHALL NOT llevar esos campos.

#### Scenario: Pedido con una línea modificada y otra no
- **WHEN** se crea un pedido POS con dos líneas y solo la primera tiene IVA manual
- **THEN** solo la primera línea del payload trae `_ivaManualOverride`, y la segunda viaja como hoy

### Requirement: El servidor guarda subtotal, IVA y total coherentes con el precio manual
Al calcular un pedido con una línea con precio manual válido, el servidor SHALL usar ese precio sin IVA en el subtotal bruto, en el subtotal neto (descuentos) y en el IVA. Así se cumple: total = subtotal + IVA = Σ líneas. Esto SHALL cumplirse con `IVA_PERSIST_CANONICAL` encendido o apagado.

#### Scenario: Precio manual en venta asistida o POS
- **WHEN** se crea un pedido con un producto de lista $100.000 sin IVA, precio manual 80.000 e IVA 19 %, cantidad 2
- **THEN** el pedido guarda subtotal 160.000, IVA 30.400 y total 190.400, y no 200.000 / 30.400 / 230.400

### Requirement: Validación de los cambios en el servidor
Al crear un pedido, el servidor SHALL rechazar con 400 y un mensaje que nombre la línea si alguna línea trae:
- `_ivaManualOverride` distinto de 0, 5, 8 o 19;
- `_precioManualOverride` que no sea un número finito ≥ 0;
- `descuentoLinea` fuera de 0-100.

El servidor SHALL decidir si una línea admite precio manual leyendo el producto en Firestore, dentro de la empresa de la sesión. Si el producto no lo admite, SHALL descartar el precio manual de esa línea y registrar una traza estructurada (sin datos personales), sin rechazar el pedido.

#### Scenario: Tarifa inventada
- **WHEN** llega un pedido con una línea con `_ivaManualOverride: 3`
- **THEN** el pedido no se crea y la respuesta es 400 "IVA no permitido en la línea 1: 3 %. Use 0, 5, 8 o 19."

#### Scenario: Snapshot manipulado
- **WHEN** llega una línea con `producto.procesoComercial.permitePrecioManual: true` y `_precioManualOverride: 1`, pero el producto en Firestore no permite precio manual
- **THEN** el pedido se crea con el precio de lista de ese producto e ignora el precio manual

#### Scenario: Pedido sin cambios
- **WHEN** llega un pedido sin ningún override
- **THEN** no se hace ninguna lectura extra y el resultado es idéntico al de hoy

### Requirement: Factura de World Office con el precio manual sin IVA
La línea de factura de World Office SHALL usar `_precioManualOverride` como valor unitario **sin IVA** cuando aplique, igual que el pedido, el correo y SIIGO.

#### Scenario: Factura de una línea con precio manual
- **WHEN** se factura en World Office una línea con precio manual 80.000 e IVA 19 %
- **THEN** el renglón lleva valor unitario 80.000, no 67.226,89

### Requirement: La tirilla muestra lo que se cobró
La tirilla del POS SHALL mostrar en cada línea el precio unitario con IVA y el total de línea resultantes de los cambios. Sus totales SHALL ser los del pedido guardado por el servidor.

#### Scenario: Reimpresión de una venta con IVA cambiado
- **WHEN** se imprime la tirilla de un pedido POS con una línea a IVA 0 %
- **THEN** la línea muestra el precio sin IVA y la suma de líneas cuadra con el total impreso
