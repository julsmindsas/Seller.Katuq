# Delta: compras (tickets 1468, 1469, 1470 · D-626)

Estado: borrador, pendiente aprobación de Daniel. Requisitos en EARS; sin decisiones de tecnología.

## ADDED Requirements

### Requirement: Productos con varios proveedores (Fase A)
THE system SHALL permitir que un producto tenga varios proveedores, uno de ellos principal, y que un proveedor surta muchos productos, guardando por cada par: referencia del proveedor, costo de compra, unidad y factor de compra, pedido mínimo, tiempo de entrega, y fecha y costo de la última compra.

#### Scenario: Producto con dos proveedores
- **GIVEN** un producto con el proveedor A como principal a $12.000
- **WHEN** se agrega el proveedor B a $13.500
- **THEN** la vista «Productos y proveedores» muestra A como principal y B como chip «Proveedor B $13.500»

#### Scenario: Producto sin proveedor
- **WHEN** un producto no tiene ningún proveedor
- **THEN** aparece en la pestaña «Sin proveedor» con el texto «Sin configurar» y su costo general si lo tiene

#### Scenario: Importar la relación
- **GIVEN** una plantilla con referencia del producto y documento del proveedor
- **WHEN** se sube con una referencia inexistente
- **THEN** la vista previa la marca como error, no se aplica esa fila y el reporte final descargable la lista

### Requirement: Registro de proveedores completo (Fase A)
THE system SHALL registrar el proveedor con razón social, tipo y número de documento (o código interno para informales), contacto, celular o WhatsApp, correo, ciudad, dirección, condiciones de pago, tiempo de entrega, notas y estado, y SHALL rechazar un duplicado por documento.

#### Scenario: Documento repetido
- **GIVEN** un proveedor con el NIT 900123456
- **WHEN** se intenta crear otro con ese NIT escrito «900.123.456-7»
- **THEN** el sistema avisa que ya existe y no crea el duplicado

### Requirement: Una sola regla de costos
THE system SHALL mantener un único costo vigente por producto, y SHALL derivarlo así: sin proveedor, el costo general; con proveedor, el costo de compra del proveedor principal. WHEN el costo se cambia desde Lista de precios, Productos y proveedores, Qué comprar, una orden recibida o una importación, THE system SHALL aplicar la misma regla, actualizar el costo vigente y el del proveedor principal en una sola operación, y registrar una fila de historial con quién, desde qué pantalla, valor anterior y valor nuevo.

#### Scenario: Costo editado en Lista de precios con proveedor
- **GIVEN** un producto con proveedor principal A a $12.000
- **WHEN** alguien con permiso escribe $12.500 en Lista de precios > COSTO
- **THEN** el costo de compra de A pasa a $12.500, Productos y proveedores lo muestra de inmediato y el historial dice «Lista de precios»

#### Scenario: Se asigna el primer proveedor
- **GIVEN** un producto con costo general $9.000
- **WHEN** se le asigna un proveedor
- **THEN** ese proveedor queda con costo de compra $9.000 y el costo no se pierde

#### Scenario: Se cambia el principal
- **WHEN** se elige otro proveedor principal
- **THEN** el sistema avisa que el costo vigente cambiará al de ese proveedor y solo lo aplica si se confirma

#### Scenario: Origen visible
- **WHEN** se ve el costo en Lista de precios > COSTO
- **THEN** se muestra su origen («General (sin proveedor)», «Proveedor principal: [nombre]» o «Última compra [fecha]») y cuántos proveedores tiene

#### Scenario: Sin permiso
- **WHEN** un rol sin permiso de editar costos intenta cambiarlo en cualquiera de las dos pantallas
- **THEN** el sistema lo impide y no cambia nada

### Requirement: Costo en línea en Qué comprar (Fase A)
WHEN un producto sugerido no tiene costo conocido, THE system SHALL permitir escribirlo en la misma fila, aplicando la regla de costos con origen «Qué comprar».

#### Scenario: Costo con proveedor elegido
- **GIVEN** una fila con proveedor B elegido
- **WHEN** se escribe el costo
- **THEN** se guarda como costo de compra de B y se ve igual en las otras dos pantallas

#### Scenario: Costo sin proveedor
- **WHEN** se escribe el costo en una fila sin proveedor
- **THEN** se guarda como costo general y el producto sigue en «Sin proveedor»

### Requirement: Proveedor y tiempo real en la sugerencia (Fase A)
THE system SHALL prellenar el proveedor principal y su tiempo de entrega, preferir el tiempo real observado al prometido y este al supuesto, y permitir cambiar a otro proveedor del producto mostrando su costo. THE system SHALL mostrar la foto del producto en lugar de la letra de color.

#### Scenario: Cambio de proveedor en la fila
- **WHEN** se elige el proveedor B en la fila
- **THEN** la fila muestra el costo y el tiempo de B, y la cantidad se recalcula

### Requirement: Cantidad sugerida real (Fase B)
THE system SHALL redondear la cantidad sugerida hacia arriba a la unidad de compra y al pedido mínimo del proveedor, mostrar el cálculo (venta diaria × (días a cubrir + días de entrega) − existencia − ya pedido) y permitir editarla.

#### Scenario: Caja de 12
- **GIVEN** una necesidad de 30 unidades y una unidad de compra de 12
- **WHEN** se muestra la sugerencia
- **THEN** propone 36 y muestra el cálculo al pasar el mouse

### Requirement: Generar órdenes por proveedor (Fase B)
WHEN el usuario pulsa «Generar órdenes de compra», THE system SHALL agrupar lo marcado por proveedor y crear una orden en **borrador** por cada uno, dejando aparte lo que no tiene proveedor. THE system SHALL NOT contar los borradores como mercancía pedida al calcular la sugerencia, ni moverlos a inventario.

#### Scenario: Tres proveedores y un producto sin proveedor
- **GIVEN** 10 productos marcados de 3 proveedores y 1 sin proveedor
- **WHEN** se generan las órdenes
- **THEN** quedan 3 borradores y el producto sin proveedor queda listado para asignarle uno

#### Scenario: Valores por defecto de la lista
- **WHEN** se abre Qué comprar
- **THEN** va ordenada por días para agotarse y solo los urgentes vienen marcados, con filtros por proveedor, categoría, bodega y solo urgentes

### Requirement: Qué producir y avisos accionables (Fase B)
THE system SHALL mostrar en «Qué producir» los productos marcados para producción con venta, existencia y cantidad sugerida, y cada aviso SHALL enlazar a la lista de productos afectados para corregirlos. THE system SHALL permitir exportar la sugerencia a Excel.

#### Scenario: Aviso de productos sin costo
- **WHEN** el aviso dice «X productos sin costo»
- **THEN** su enlace abre esos productos para escribir el costo

### Requirement: Ciclo de estados de la orden (Fase C)
THE system SHALL manejar los estados Borrador, Enviada, Recibida parcial, Recibida completa, Cerrada y Cancelada, SHALL leer las órdenes existentes sin migrarlas (abierta como Enviada) y SHALL registrar en el historial de cada orden quién y cuándo (hora de Colombia) la creó, editó, envió, recibió, facturó y cerró.

#### Scenario: Enviar
- **GIVEN** un borrador con proveedor y líneas
- **WHEN** se envía por WhatsApp o correo con su PDF
- **THEN** pasa a Enviada y registra fecha y quién la envió

#### Scenario: Orden anterior
- **GIVEN** una orden en estado «abierta» creada antes de este cambio
- **WHEN** se consulta
- **THEN** se muestra como Enviada, con todos sus datos

### Requirement: Recepción con diferencias (Fase C, módulo sensible)
WHEN se confirma una recepción, THE system SHALL, en una sola operación, ingresar a la bodega de destino lo recibido por el camino de ingreso por compra, anotarlo contra la orden y aplicar la regla de costos con origen «Orden recibida». IF la misma recepción llega dos veces, THEN THE system SHALL aplicarla una sola vez. THE system SHALL registrar diferencias (faltó, de más, otro producto, dañado, vencido) y dejar el saldo pendiente o cancelado.

#### Scenario: Recepción parcial
- **GIVEN** una orden de 100 unidades
- **WHEN** llegan 60 y el saldo queda pendiente
- **THEN** el inventario sube 60, la orden pasa a Recibida parcial con 40 pendientes y se descuentan de nuevo en la sugerencia

#### Scenario: Reintento tras un fallo
- **GIVEN** una recepción cuya respuesta se perdió
- **WHEN** se repite con la misma clave
- **THEN** el inventario no se duplica

#### Scenario: Producto y precios intactos
- **WHEN** se confirma una recepción
- **THEN** de `products` solo cambian el costo vigente y su fuente; variantes, precio de venta, precios por cliente y Price Lists permanecen sin cambios
- **AND** solo se escriben inventario, su movimiento, la orden y el historial de costos

#### Scenario: Borrador no mueve inventario
- **WHEN** una orden está en Borrador o Enviada
- **THEN** el inventario no cambia

### Requirement: Factura del proveedor y cuentas por pagar (Fase D)
THE system SHALL asociar una factura (número, fecha, valor, PDF o XML) a una o varias órdenes, comparar factura contra orden y recibido avisando diferencias de precio o cantidad, y generar un saldo por pagar con vencimiento según las condiciones de pago. THE system SHALL permitir pagos totales o parciales con forma de pago y soporte, y mostrar el saldo por proveedor vencido y por vencer, exportable a Excel. THE system SHALL NOT escribir en las colecciones de Tesorería o Cartera.

#### Scenario: Factura mayor a lo recibido
- **GIVEN** una orden con $1.000.000 recibido
- **WHEN** se registra una factura de $1.100.000
- **THEN** el sistema avisa la diferencia y marca «facturado de más»

#### Scenario: Saldo vencido
- **GIVEN** una factura a 30 días de hace 40 días con pago parcial
- **WHEN** se consulta el saldo del proveedor
- **THEN** el saldo restante aparece como vencido

### Requirement: Indicadores por proveedor (Fase E)
THE system SHALL mostrar por proveedor el cumplimiento (completo y a tiempo), los días reales contra los prometidos y el valor comprado por período, y SHALL usar los días reales en Qué comprar solo cuando haya al menos dos entregas.

#### Scenario: Una sola entrega
- **WHEN** un proveedor tiene una única entrega registrada
- **THEN** Qué comprar sigue usando el tiempo prometido y lo indica

## Fuera de alcance
Aprobaciones por monto, cotizaciones, multi-bodega, landed cost, contabilidad, política de costo distinta a proveedor principal, recetas e insumos, documento soporte a Siigo.
