## ADDED Requirements

### Requirement: Credenciales propias del comercio
THE system SHALL ofrecer Addi o Sistecrédito en una tienda solo con las credenciales que ese comercio conectó para ese proveedor. THE system SHALL NOT usar credenciales de la plataforma para estos medios ni cobrar un pedido a cuotas con otro proveedor.

#### Scenario: Comercio sin Addi conectado
- **WHEN** el comercio enciende «Paga a cuotas con Addi» en su tienda, pero no tiene Addi conectado en Integraciones
- **THEN** la tienda publicada no muestra Addi y el editor le avisa que falta conectarlo

#### Scenario: Falla el proveedor elegido
- **WHEN** el comprador elige Sistecrédito y Sistecrédito no responde al iniciar el pago
- **THEN** el comprador ve que no se pudo iniciar el pago a cuotas y recibe el enlace «pagar» de su pedido; no se genera automáticamente ningún enlace de otra pasarela

### Requirement: Cuándo aparece el medio de pago
THE system SHALL mostrar un medio a cuotas en el checkout solo WHILE se cumplen las cuatro condiciones: la bandera `storeInstallmentPayments` del comercio está encendida, el comercio encendió ese medio en «Cómo te pagan», tiene el proveedor conectado y activo, y sus credenciales son de producción (las de pruebas solo valen en las empresas marcadas como empresas de prueba). IF el total final del carrito (con envío, cupón y promociones) está fuera del rango que permiten el proveedor y las reglas del comercio, o algún producto del carrito está fuera de las categorías permitidas, THEN THE system SHALL mostrar el medio deshabilitado con el motivo, en lugar de ocultarlo, y SHALL NOT crear un pedido a cuotas para ese carrito.

#### Scenario: Total por debajo del mínimo de Addi
- **WHEN** el mínimo de Addi para el comercio es $50.000 y el carrito suma $30.000
- **THEN** Addi aparece deshabilitado con el texto «Disponible para compras desde $50.000» y no se puede elegir

#### Scenario: Credenciales de pruebas en una tienda real
- **WHEN** un comercio que no es empresa de prueba conecta Addi con credenciales de pruebas
- **THEN** su tienda no muestra Addi, porque un crédito de pruebas «aprobado» no trae dinero

#### Scenario: Bandera apagada
- **WHEN** el comercio tiene Addi conectado y encendido, pero la bandera `storeInstallmentPayments` está apagada
- **THEN** ninguna parte de la tienda muestra Addi

### Requirement: Reglas del comercio
THE system SHALL permitir al comercio fijar, por proveedor, un monto mínimo y un monto máximo propios y las categorías en que acepta cuotas. El rango efectivo SHALL ser el más estricto entre el del proveedor y el del comercio. Una categoría permitida SHALL incluir todas sus subcategorías. IF un solo producto del carrito queda fuera de las categorías permitidas, THEN THE system SHALL NOT ofrecer ese medio para el carrito.

#### Scenario: Mínimo del comercio más alto que el de Addi
- **WHEN** Addi permite desde $50.000, el comercio fijó $200.000 y el carrito suma $150.000
- **THEN** Addi aparece deshabilitado con «Disponible para compras desde $200.000»

#### Scenario: Mínimo del comercio más bajo que el del proveedor
- **WHEN** el comercio fijó $10.000 y Addi permite desde $50.000
- **THEN** el mínimo efectivo sigue siendo $50.000

#### Scenario: Subcategoría de una categoría permitida
- **WHEN** el comercio permite «Tecnología» y el carrito tiene un producto de «Tecnología > Audio»
- **THEN** el medio a cuotas se ofrece

#### Scenario: Carrito mixto
- **WHEN** el comercio permite solo «Tecnología» y el carrito tiene un parlante y un ramo de flores
- **THEN** el medio a cuotas no se puede elegir para ese carrito y el checkout dice qué producto queda fuera; el mismo carrito se puede pagar con los otros medios

#### Scenario: El cupón baja el total bajo el mínimo
- **WHEN** el total con envío supera el mínimo del comercio, pero el cupón lo deja por debajo
- **THEN** el servidor no crea el pedido a cuotas y explica el mínimo

#### Scenario: Cambia la ciudad de entrega en el checkout
- **WHEN** el comprador elige una ciudad cuyo envío deja el total fuera del rango, o vuelve a una que lo deja dentro
- **THEN** el medio a cuotas se deshabilita o se vuelve a habilitar sin recargar la página

#### Scenario: El comercio pone un mínimo menor que el de Addi
- **WHEN** en «Cómo te pagan» el comercio escribe $10.000 como mínimo y Addi recibe desde $50.000
- **THEN** el editor y el servidor le dicen que su mínimo no puede ser menor que el de Addi y no guardan nada

#### Scenario: Categorías del árbol
- **WHEN** el comercio marca «Tecnología» en sus categorías con cuotas
- **THEN** sus subcategorías quedan incluidas sin marcarlas una por una, y una categoría que no existe en su árbol no se puede guardar

### Requirement: Datos del comprador para pagar a cuotas
WHEN el comprador elige un medio a cuotas, THE system SHALL exigir nombre, apellido, correo, celular, ciudad, dirección (también si recoge en tienda) y un número de documento válido antes de crear el pedido. IF el medio es Addi, THEN el documento SHALL ser una cédula de ciudadanía. THE system SHALL NOT registrar el número de documento, el celular ni la dirección completos en los logs.

#### Scenario: Falta la cédula
- **WHEN** el comprador elige Addi y deja vacío «Cédula o NIT»
- **THEN** el checkout no continúa y le pide la cédula

#### Scenario: Recoge en tienda y paga a cuotas
- **WHEN** el comprador elige «Paso a recogerlo» y paga con Addi
- **THEN** el checkout le pide su dirección y su ciudad, y sin ellas no continúa

#### Scenario: Factura a empresa con Addi
- **WHEN** el comprador marca «factura a empresa» con NIT y elige Addi
- **THEN** el checkout le explica que Addi solo financia a personas con cédula y le pide elegir otro medio o desmarcar la factura a empresa

### Requirement: Iniciar el pago a cuotas
WHEN el comprador confirma la compra con un medio a cuotas, THE system SHALL crear el pedido por el mismo camino de los pedidos de tienda (consecutivo, reserva de inventario y estado de pago Pendiente). Además, SHALL registrar el proveedor elegido y una referencia de intento única, que no coincide con ningún número de pedido ni con referencias de otros proveedores, y SHALL llevar al comprador a la página del proveedor. IF el proveedor rechaza la solicitud, THEN THE system SHALL mostrar al comprador un mensaje entendible y SHALL conservar el pedido como pendiente de pago.

#### Scenario: Cliente que ya tiene un crédito en curso con Addi
- **WHEN** Addi responde que el cliente ya tiene un crédito en Addi
- **THEN** el comprador ve «Addi indica que ya tienes una solicitud de crédito en curso» y, desde «pagar», puede pagar el mismo pedido con Wompi si la tienda cobra en línea

#### Scenario: Segundo intento del mismo pedido
- **WHEN** el comprador vuelve a intentar el pago a cuotas de un pedido pendiente cuyo intento anterior ya terminó
- **THEN** se crea un intento con una referencia nueva y el pedido conserva todas sus referencias anteriores

### Requirement: Reintentar el pago o pagar el mismo pedido con Wompi
WHEN el comprador abre «pagar» en un pedido a cuotas pendiente, THE system SHALL llevarlo a la solicitud de crédito que siga viva, o iniciar un intento nuevo con el mismo proveedor si la anterior terminó. THE system SHALL limitar los intentos por pedido y SHALL NOT correr la reserva más allá de su tope. WHEN el comprador elige pagar con Wompi, THE system SHALL cobrar el MISMO pedido con la MISMA reserva, solo si la tienda cobra en línea y no hay una solicitud de crédito viva; con Sistecrédito, SHALL consultar antes cada intento sin resultado. WHILE el pedido tiene un enlace de Wompi vigente, THE system SHALL NOT abrir una solicitud de crédito nueva. THE system SHALL NOT abrir una solicitud que no quepa en lo que le queda a la reserva.

#### Scenario: Pagar un pedido de Sistecrédito
- **WHEN** el comprador abre el enlace «pagar» de un pedido de Sistecrédito pendiente, sin elegir otro medio
- **THEN** lo lleva a Sistecrédito, nunca a Wompi

#### Scenario: Solicitud viva
- **WHEN** el comprador abre «pagar» dos veces mientras su solicitud de Addi sigue en curso
- **THEN** las dos veces llega a la misma solicitud; no se abre otra ni se corre la reserva

#### Scenario: Pagar con Wompi después del rechazo
- **WHEN** Addi rechazó el crédito y el comprador elige «Pagar con tarjeta, PSE o Nequi»
- **THEN** paga el mismo pedido en Wompi, sin crear otro pedido ni apartar de nuevo la mercancía, y al aprobarse el pedido queda con forma de pago «Pago en línea»

#### Scenario: Volver a Addi con un pago de Wompi en curso
- **WHEN** el comprador eligió «Pagar con tarjeta, PSE o Nequi», dejó un PSE pendiente y después abre «Intentar de nuevo con Addi»
- **THEN** no se abre otra solicitud de crédito; la página le dice que termine el pago que empezó y le ofrece seguir con tarjeta, PSE o Nequi

#### Scenario: Pasar de Sistecrédito a Wompi
- **WHEN** el comprador elige pagar con Wompi un pedido de Sistecrédito cuyo intento no tiene resultado
- **THEN** se le pregunta a Sistecrédito: si aprobó, el pedido queda pagado y va a la página de gracias; si sigue en curso, no se abre Wompi y se le pide esperar

#### Scenario: La reserva está por terminar
- **WHEN** a la reserva de un pedido de Addi le quedan menos minutos que la vida de una solicitud de Addi
- **THEN** no se abre otra solicitud y, si la tienda cobra en línea, se le ofrece pagar con tarjeta, PSE o Nequi

### Requirement: Configuración del comercio
THE system SHALL permitir a un administrador del comercio conectar Addi y Sistecrédito con sus credenciales, su entorno (pruebas o producción) y sus reglas (mínimo, máximo y categorías), verificar la conexión antes de activarla, y encender o apagar cada medio por tienda. Las credenciales secretas SHALL guardarse cifradas y SHALL NOT volver al navegador después de guardadas.

#### Scenario: Credenciales de Addi equivocadas
- **WHEN** el comercio guarda Addi con un secreto inválido y pulsa «Probar conexión»
- **THEN** ve «Addi rechazó las credenciales» y Addi no queda activo

#### Scenario: Volver a abrir la configuración
- **WHEN** el comercio abre de nuevo la tarjeta de Addi
- **THEN** ve el identificador y el entorno, y los secretos aparecen enmascarados

#### Scenario: Guardar sin probar
- **WHEN** el comercio conecta Addi por primera vez, cambia una credencial o reactiva un Addi desactivado
- **THEN** «Guardar» no se habilita hasta que «Probar conexión» salga bien con esos mismos datos, y el servidor vuelve a probar antes de dejarlo activo

#### Scenario: Solo cambian las reglas
- **WHEN** el comercio cambia su mínimo, su máximo o sus categorías en un Addi activo
- **THEN** se guarda sin volver a probar la conexión, porque las credenciales no cambiaron

### Requirement: Vitrina de medios a cuotas
WHILE una tienda tiene activo un medio a cuotas, THE system SHALL mostrar la etiqueta de texto «Paga a cuotas con Addi» o «Paga a cuotas con Sistecrédito» en el pie (medios que la tienda acepta), en la ficha solo si el precio y la categoría de ese producto caben en el rango del proveedor y en las reglas del comercio, y en el carrito junto a los demás medios que la tienda acepta, solo si ese carrito puede usarlo. Mientras no haya kit de marca y constancia de autorización, los medios van en texto, sin logos. IF el comercio tiene Addi activo en producción y la bandera encendida, THEN THE system SHALL mostrar la cuota estimada SOLO con el widget oficial de Addi, en la ficha y en el carrito, y SHALL abrir la política de la página solo a dominios de Addi y solo en esos sitios. WHILE el visitante tiene abierta una sesión de cliente mayorista, THE system SHALL NOT cargar el widget. THE system SHALL NOT mostrar un número de cuotas ni un valor de cuota calculado por Katuq. Una tienda sin medios a cuotas SHALL verse exactamente igual que antes del pago a cuotas.

#### Scenario: Medio apagado
- **WHEN** el comercio apaga Sistecrédito
- **THEN** «Sistecrédito» desaparece de la ficha, el carrito, el pie y el checkout en la siguiente publicación del sitio

#### Scenario: Producto por debajo del mínimo
- **WHEN** Addi recibe compras desde $50.000 y la ficha es de un producto de $30.000
- **THEN** la ficha no dice «Paga a cuotas con Addi» ni muestra el widget

#### Scenario: Cuota de Addi
- **WHEN** el comercio tiene Addi activo en producción y la ficha es de un producto dentro del rango
- **THEN** la ficha muestra el widget oficial de Addi con el precio del producto, y si el comprador elige otra variante el widget toma el precio nuevo

#### Scenario: Sistecrédito
- **WHEN** el comercio tiene Sistecrédito activo
- **THEN** solo sale la etiqueta de texto, sin número de cuotas, porque Sistecrédito no publica un simulador

### Requirement: Páginas legales y publicación
WHILE un medio a cuotas está activo en la tienda, THE system SHALL contarlo en las páginas legales generadas (privacidad: qué datos se entregan al proveedor y para qué; devoluciones: la devolución de un pago a cuotas se tramita con el proveedor; términos y envíos: el crédito lo otorga el proveedor con sus condiciones), también en las ya publicadas, sin tocar lo que el comercio escribió. THE system SHALL contar un medio a cuotas activo como medio de pago en el checklist de publicación.

#### Scenario: Política ya publicada
- **WHEN** el comercio publicó su política de privacidad antes de encender Addi
- **THEN** la página muestra la sección «Si pagas a cuotas» mientras Addi esté activo, y deja de mostrarla si lo apaga

#### Scenario: Páginas generadas con Addi encendido
- **WHEN** el comercio genera sus páginas legales con Addi encendido y después lo apaga, o lo cambia por Sistecrédito
- **THEN** las páginas dejan de nombrar a Addi (y nombran a Sistecrédito si es el activo), porque la sección de cuotas no se guarda con la página

#### Scenario: Solo cuotas
- **WHEN** una tienda tiene apagados el pago en línea y contra entrega, y encendido Addi con la bandera y la conexión
- **THEN** el checklist no bloquea la publicación por falta de un medio de pago

### Requirement: Detalle del pedido en el Seller
THE system SHALL mostrar en el detalle de un pedido de tienda a cuotas el proveedor, la referencia de cada intento, su estado y la fecha. Para un pedido aprobado, THE system SHALL indicar que una anulación o devolución se hace en el portal del proveedor.

#### Scenario: Anular un pedido pagado con Addi
- **WHEN** el comercio anula en Katuq un pedido pagado con Addi
- **THEN** ve el aviso de que la cancelación del crédito se hace en el portal de aliados de Addi

#### Scenario: Doble cobro
- **WHEN** un pedido queda con la alerta de doble aprobación (dos créditos, o un crédito y un pago con Wompi)
- **THEN** el detalle del pedido muestra «Doble cobro», con qué se pagó, cuál cobro sobra y dónde anularlo, aunque el comprador haya terminado pagando con Wompi
