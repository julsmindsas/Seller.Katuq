# Corrección del precio editable de un pedido — D-543 / 1355

**Comercio inicial:** ALMARA FELICIDAD. **Estado:** APROBADA por Daniel el 23-oct-2026: «Apruebo ambas specs y esas reglas».

## ADDED Requirements

### Requirement: Alcance y autorización

WHEN un usuario consulta Más opciones de un pedido elegible, THE system SHALL ofrecer **Corregir precio** solo si dispone del permiso explícito de corrección de precios y existe al menos una línea cuyo producto real del comercio permita precio editable. La comprobación SHALL aplicarse también al confirmar, sin confiar en permisos o datos de producto aportados por el navegador. Una línea ambigua, ajena o sin producto verificable SHALL rechazarse sin modificar el pedido; dos líneas del mismo producto SHALL distinguirse inequívocamente.

#### Scenario: Usuario sin permiso
- **WHEN** un usuario sin permiso intenta corregir
- **THEN** la operación se rechaza sin escritura

### Requirement: Vista previa sin efectos

WHEN el usuario elige una línea e ingresa un precio base sin IVA finito y mayor o igual a cero, THE system SHALL mostrar precio actual/nuevo y bruto, descuentos, domicilio, IVA, total, pagos vigentes, saldo por cobrar y saldo a favor antes → después. WHEN el valor sea vacío, negativo o inválido, THE system SHALL impedir confirmar con un mensaje claro. La vista previa y su cancelación SHALL producir cero escrituras y cero avisos; un cero explícito SHALL ser válido.

#### Scenario: Vista previa cancelada
- **WHEN** se cancela la vista previa
- **THEN** el pedido y sus avisos permanecen intactos

### Requirement: Cálculo y conservación

WHEN se confirme con un motivo no vacío, THE system SHALL cambiar únicamente el precio base de la línea elegida y recalcular sus importes con las reglas comerciales vigentes del pedido, conservando cantidades, adiciones, preferencias, tarifa efectiva de IVA, descuentos aplicables, domicilio y precios pactados de las demás líneas. THE system SHALL conservar los pagos existentes sin duplicar ni alterar su estado y computar únicamente los vigentes, según las reglas actuales. No SHALL releer catálogo para reemplazar precios de líneas no elegidas.

IF lo pagado supera el total corregido, THE system SHALL mostrar saldo por cobrar cero y el excedente como saldo a favor por separado, sin reembolso, pago o abono contable automático. El total SHALL desglosar explícitamente descuento, IVA y domicilio sin sumarlos dos veces.

#### Scenario: Corrección con sobrepago
- **WHEN** la corrección deja pagos mayores que el total
- **THEN** se conserva el pago y se muestra el excedente sin devolver dinero

### Requirement: Integridad del cobro

WHEN se consulte el pedido corregido en detalle, pagos, cartera, Logística, planilla/app de mensajero, reportes o impresión/correo generado posteriormente, THE system SHALL presentar importes coherentes con el precio pactado guardado, sin sustituirlo por el precio de catálogo. Correos o documentos ya emitidos SHALL conservarse sin reenvío automático.

**Caso de referencia:** productos $24.200 + $6.000, domicilio $13.200, IVA/descuento cero y pagos vigentes $21.700 SHALL dar total $43.400 y saldo $21.700 en todos los lectores cubiertos; un precio base de catálogo $1 para la segunda línea no SHALL producir saldo $15.701. Es una regresión con datos sintéticos derivados del ticket 1352, no autorización para modificar ese pedido real.

#### Scenario: Precio pactado frente a catálogo
- **WHEN** la línea pactada a $6.000 tiene catálogo a $1
- **THEN** el caso de referencia mantiene saldo $21.700 en los lectores cubiertos

### Requirement: Protección fiscal, concurrencia y repetición

IF el pedido tiene factura electrónica emitida, hay emisión en curso o no puede acreditarse su elegibilidad fiscal, THE system SHALL bloquear la corrección sin emitir ni anular documentos. Los pedidos con cierre financiero protegido SHALL mantener su restricción.

IF cambian pedido, pagos, factura, permisos o elegibilidad entre vista previa y confirmación, THE system SHALL rechazar la operación sin aplicar parcialmente los cambios y exigir revisar una vista previa actualizada. WHEN se repita la misma confirmación, THE system SHALL evitar duplicar efecto, registro o notificación.

#### Scenario: Pedido facturado o desactualizado
- **WHEN** la factura o la versión cambian antes de confirmar
- **THEN** se rechaza sin cambios parciales ni emisión fiscal

### Requirement: Trazabilidad y aislamiento

WHEN se aplique una corrección, THE system SHALL dejar registro identificable y recuperable de quién, cuándo, origen, motivo, línea y precio/total/saldo antes → después en el historial aprobado del pedido, sin editar eventos previos ni crear un historial paralelo. El diseño SHALL definir su integración con D-541 antes de habilitar.

THE system SHALL limitar lecturas y escrituras a la empresa autorizada, mantener autenticación y permisos, evitar datos sensibles en logs y restringir escrituras al pedido objetivo y su historial/auditoría aprobados. Productos, listas, inventario, cliente, pagos y documentos fiscales SHALL permanecer intactos. La habilitación inicial SHALL limitarse a ALMARA y ser reversible sin revertir precios legítimamente confirmados.

#### Scenario: Registro de corrección
- **WHEN** se aplica una corrección autorizada
- **THEN** queda trazabilidad recuperable dentro del historial aprobado y de su empresa

### Requirement: Verificación y experiencia

THE system SHALL permitir completar o cancelar la corrección con teclado, mensajes comprensibles y el tema Katuq, a 1440 y 390 px sin desbordamiento del diálogo ni texto oculto. Antes de habilitar SHALL verificarse precios cero, IVA no cero, descuentos, extras, sobrepago, pagos no vigentes, líneas repetidas, conflicto concurrente y lectura coherente entre módulos, sin alterar los casos canónicos de cálculo existentes. Confirmar SHALL mostrar el pedido efectivamente guardado; un fallo no SHALL presentarse como éxito.

#### Scenario: Confirmación accesible
- **WHEN** se confirma con teclado en 390 px
- **THEN** se muestra el resultado guardado sin desbordamiento del diálogo
