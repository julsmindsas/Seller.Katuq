## ADDED Requirements

### Requirement: Credenciales propias del comercio
THE system SHALL ofrecer Addi o Sistecrédito en una tienda solo con las credenciales que ese comercio conectó para ese proveedor. THE system SHALL NOT usar credenciales de la plataforma para estos medios ni cobrar un pedido a cuotas con otro proveedor.

#### Scenario: Comercio sin Addi conectado
- **WHEN** el comercio enciende «Paga a cuotas con Addi» en su tienda, pero no tiene Addi conectado en Integraciones
- **THEN** la tienda publicada no muestra Addi y el editor le avisa que falta conectarlo

#### Scenario: Falla el proveedor elegido
- **WHEN** el comprador elige Sistecrédito y Sistecrédito no responde al iniciar el pago
- **THEN** el comprador ve que no se pudo iniciar el pago a cuotas y que puede elegir otro medio; no se genera ningún enlace de otra pasarela

### Requirement: Cuándo aparece el medio de pago
THE system SHALL mostrar un medio a cuotas en el checkout solo WHILE se cumplen las cuatro condiciones: la bandera `storeInstallmentPayments` del comercio está encendida, el comercio encendió ese medio en «Cómo te pagan», tiene el proveedor conectado y activo, y sus credenciales son de producción (las de pruebas solo valen en las empresas marcadas como empresas de prueba). IF el total del carrito está fuera del rango que permite el proveedor para ese comercio, THEN THE system SHALL mostrar el medio deshabilitado con el rango permitido, en lugar de ocultarlo.

#### Scenario: Total por debajo del mínimo de Addi
- **WHEN** el mínimo de Addi para el comercio es $50.000 y el carrito suma $30.000
- **THEN** Addi aparece deshabilitado con el texto «Disponible para compras desde $50.000» y no se puede elegir

#### Scenario: Credenciales de pruebas en una tienda real
- **WHEN** un comercio que no es empresa de prueba conecta Addi con credenciales de pruebas
- **THEN** su tienda no muestra Addi, porque un crédito de pruebas «aprobado» no trae dinero

#### Scenario: Bandera apagada
- **WHEN** el comercio tiene Addi conectado y encendido, pero la bandera `storeInstallmentPayments` está apagada
- **THEN** ninguna parte de la tienda muestra Addi

### Requirement: Datos del comprador para pagar a cuotas
WHEN el comprador elige un medio a cuotas, THE system SHALL exigir nombre, apellido, correo, celular, ciudad, dirección y un número de documento válido antes de crear el pedido. IF el medio es Addi, THEN el documento SHALL ser una cédula de ciudadanía. THE system SHALL NOT registrar el número de documento, el celular ni la dirección completos en los logs.

#### Scenario: Falta la cédula
- **WHEN** el comprador elige Addi y deja vacío «Cédula o NIT»
- **THEN** el checkout no continúa y le pide la cédula

#### Scenario: Factura a empresa con Addi
- **WHEN** el comprador marca «factura a empresa» con NIT y elige Addi
- **THEN** el checkout le explica que Addi solo financia a personas con cédula y le pide elegir otro medio o desmarcar la factura a empresa

### Requirement: Iniciar el pago a cuotas
WHEN el comprador confirma la compra con un medio a cuotas, THE system SHALL crear el pedido por el mismo camino de los pedidos de tienda (consecutivo, reserva de inventario y estado de pago Pendiente). Además, SHALL registrar el proveedor elegido y una referencia de intento única, que no coincide con ningún número de pedido ni con referencias de otros proveedores, y SHALL llevar al comprador a la página del proveedor. IF el proveedor rechaza la solicitud, THEN THE system SHALL mostrar al comprador un mensaje entendible y SHALL conservar el pedido como pendiente de pago.

#### Scenario: Cliente que ya tiene un crédito en curso con Addi
- **WHEN** Addi responde que el cliente ya tiene un crédito en Addi
- **THEN** el comprador ve «Addi indica que ya tienes una solicitud de crédito en curso» y puede volver a intentarlo con otro medio desde su pedido

#### Scenario: Segundo intento del mismo pedido
- **WHEN** el comprador vuelve a intentar el pago a cuotas de un pedido pendiente
- **THEN** se crea un intento con una referencia nueva y el pedido conserva todas sus referencias anteriores

### Requirement: Reintentar el pago sin cambiar de proveedor
WHEN el comprador abre «pagar» en un pedido a cuotas pendiente, THE system SHALL iniciar un nuevo intento con el mismo proveedor del pedido. THE system SHALL NOT generar un enlace de otra pasarela para ese pedido.

#### Scenario: Pagar un pedido de Sistecrédito
- **WHEN** el comprador abre el enlace «pagar» de un pedido de Sistecrédito pendiente
- **THEN** lo lleva a un nuevo intento en Sistecrédito, nunca a Wompi

### Requirement: Configuración del comercio
THE system SHALL permitir a un administrador del comercio conectar Addi y Sistecrédito con sus credenciales y su entorno (pruebas o producción), verificar la conexión antes de activarla, y encender o apagar cada medio por tienda. Las credenciales secretas SHALL guardarse cifradas y SHALL NOT volver al navegador después de guardadas.

#### Scenario: Credenciales de Addi equivocadas
- **WHEN** el comercio guarda Addi con un secreto inválido y pulsa «Probar conexión»
- **THEN** ve «Addi rechazó las credenciales» y Addi no queda activo

#### Scenario: Volver a abrir la configuración
- **WHEN** el comercio abre de nuevo la tarjeta de Addi
- **THEN** ve el identificador y el entorno, y los secretos aparecen enmascarados

### Requirement: Vitrina de medios a cuotas
WHILE una tienda tiene activo un medio a cuotas, THE system SHALL mostrar en la ficha del producto, en el carrito y en el pie la etiqueta de texto «Paga a cuotas con Addi» o «Paga a cuotas con Sistecrédito», solo para los medios activos. THE system SHALL NOT mostrar un número de cuotas ni un valor de cuota que no venga del proveedor.

#### Scenario: Medio apagado
- **WHEN** el comercio apaga Sistecrédito
- **THEN** «Sistecrédito» desaparece de la ficha, el carrito, el pie y el checkout en la siguiente publicación del sitio

### Requirement: Detalle del pedido en el Seller
THE system SHALL mostrar en el detalle de un pedido de tienda a cuotas el proveedor, la referencia de cada intento, su estado y la fecha. Para un pedido aprobado, THE system SHALL indicar que una anulación o devolución se hace en el portal del proveedor.

#### Scenario: Anular un pedido pagado con Addi
- **WHEN** el comercio anula en Katuq un pedido pagado con Addi
- **THEN** ve el aviso de que la cancelación del crédito se hace en el portal de aliados de Addi
