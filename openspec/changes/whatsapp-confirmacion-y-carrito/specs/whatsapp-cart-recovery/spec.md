## ADDED Requirements

### Requirement: Bandera por comercio, apagada de fábrica
El recordatorio de carrito por WhatsApp SHALL funcionar solo para las empresas cuyo documento tenga `featureFlags.whatsappCartRecovery` en `true`. Con la bandera ausente, con otro valor o si no se puede leer, la tienda SHALL funcionar exactamente como antes: sin casilla de WhatsApp, sin guardar carritos que lleguen sin correo, y con el recordatorio saliendo solo por correo.

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** una tienda sin la bandera recibe a un comprador que deja su teléfono y no su correo, o a uno que deja su correo
- **THEN** el primero no deja carrito y el segundo recibe el correo de siempre; el cuerpo que viaja al servidor y el recordatorio por correo son idénticos a los de hoy y no se envía nada por WhatsApp. Solo cambian lecturas: la bandera de la empresa al pintar una tienda que vende (si su plan manda recordatorios) y el carrito por teléfono, que no existe, al comprar

### Requirement: Casilla de permiso en el checkout
Con la bandera encendida, y solo si el plan de la empresa manda recordatorios de carrito, el paso de datos del checkout SHALL mostrar una casilla, desmarcada siempre, con el texto "Autorizo que esta tienda me escriba por WhatsApp para recordarme mi carrito si no termino mi compra. Puedo dejar de recibir mensajes respondiendo BAJA." El texto que ve la persona SHALL ser el mismo que se guarda como prueba.

#### Scenario: Tienda con la bandera encendida, y plan gratis
- **WHEN** el comprador llega al paso de datos de una tienda de plan de pago
- **THEN** ve la casilla desmarcada junto a la de publicidad por correo, y comprar no la marca por él
- **AND WHEN** la tienda es de plan gratis (el recordatorio no saldría por ningún canal), la casilla no se pinta aunque la bandera esté encendida

### Requirement: Carrito con solo teléfono y prueba del permiso
Con la bandera encendida y la casilla marcada, el sistema SHALL guardar el carrito aunque no haya correo, siempre que el teléfono sea un celular colombiano (3xx xxx xxxx, con o sin el 57; ningún fijo ni número de otro país), y SHALL guardar el texto exacto del permiso, su versión, el momento, el teléfono y una huella del origen (IP y navegador, sin guardarlos en claro). Sin la casilla y sin correo, el carrito SHALL NOT guardarse. Si el comprador vuelve y desmarca la casilla, SHALL retirarse el permiso de todo carrito suyo, por correo o por teléfono. Si vuelve con correo y permiso, el carrito que antes quedó solo con el teléfono SHALL darse por vencido para que no reciba dos recordatorios.

#### Scenario: Compra por teléfono
- **WHEN** el comprador deja nombre y teléfono, marca la casilla y pasa al resumen sin dejar correo
- **THEN** su carrito queda en "Tus contactos" del comercio, con el permiso guardado

#### Scenario: Permiso retirado, o teléfono que no es un celular colombiano
- **WHEN** el mismo comprador vuelve y desmarca la casilla, o alguien marca la casilla con un fijo o un número de otro país
- **THEN** en el primer caso el permiso queda retirado en sus dos carritos y no se le escribe; en el segundo el carrito no se guarda por WhatsApp

### Requirement: Topes contra el abuso del permiso autoafirmado
Como el permiso lo declara quien llena el formulario y no se verifica con un código, el sistema SHALL: (a) mandar como máximo UN recordatorio por día (hora de Colombia) a cada teléfono por empresa, sin importar cuántos carritos, correos o tiendas de la empresa lo traigan; (b) mandar como máximo 200 recordatorios por día por empresa (`WHATSAPP_CARRITO_TOPE_DIARIO` lo cambia; 0 los detiene); (c) aceptar como máximo 60 carritos con permiso de WhatsApp por hora y por tienda. La reserva del día SHALL NOT liberarse si el envío falla.

#### Scenario: Tres carritos con el mismo teléfono
- **WHEN** alguien guarda tres carritos con tres correos distintos y el mismo teléfono, todos con la casilla marcada
- **THEN** el teléfono recibe un solo mensaje ese día y se cobra uno solo; el correo de los otros carritos sale como siempre si el comercio lo tiene encendido

#### Scenario: Se alcanza el tope diario de la empresa
- **WHEN** la empresa ya envió su tope de recordatorios del día
- **THEN** no sale ninguno más ese día, queda el motivo en su historial de WhatsApp y al día siguiente se renueva

### Requirement: El nombre solo entra al mensaje si es un nombre
El saludo SHALL llevar solo la primera palabra del nombre si parece un nombre propio (letras con tildes, apóstrofo y guion); si trae un enlace, un correo, un número o símbolos —incluido el nombre que se arma con el correo o el teléfono cuando la persona no dejó el suyo— SHALL saludar como "cliente".

#### Scenario: Nombre con enlace
- **WHEN** el nombre del carrito es "bit.ly/3xYzAb"
- **THEN** el mensaje dice "Hola cliente" y su único enlace es el del carrito, firmado por el sistema

### Requirement: Recordatorio por WhatsApp
A la hora sin pedido, el sistema SHALL enviar, una sola vez por día, la plantilla de marketing `katuq_cart_reminder_v1` con el nombre, la tienda y el enlace firmado del carrito, si hay permiso vigente (se vuelve a revisar al reclamar el carrito), la bandera está encendida, el canal de WhatsApp del comercio está aceptado, el número es real, hay saldo, el teléfono no pidió BAJA y el plan permite el recordatorio. El cobro SHALL ser el de siempre por mensaje. Si el mensaje salió, SHALL NOT mandar además el correo; si no pudo salir, SHALL mandar el correo cuando el comprador lo dejó.

#### Scenario: Carrito con permiso y todo listo
- **WHEN** pasa una hora sin pedido en un carrito con permiso de una empresa con todo listo, dentro del horario permitido
- **THEN** el comprador recibe el mensaje con su enlace, se descuenta un mensaje del saldo y el carrito queda marcado como recordado

#### Scenario: BAJA, sin saldo, plan gratis, marketing detenido o permiso retirado un instante antes
- **WHEN** se cumple cualquiera de esas condiciones
- **THEN** no se envía por WhatsApp y queda el motivo en el historial del comercio; si Kapso o Meta dicen que la persona dejó de recibir marketing, el teléfono pasa a la lista de "no contactar"; el correo, que tiene su propia autorización, sale si lo dejó

### Requirement: Horario permitido para el marketing por WhatsApp
El recordatorio por WhatsApp es marketing y SHALL salir solo en el horario de la Ley 2300 de 2023 (lunes a viernes de 7:00 a. m. a 7:00 p. m., sábados de 8:00 a. m. a 3:00 p. m., hora de Colombia, sin domingos ni festivos), el mismo de las campañas por correo. Fuera de él el carrito SHALL quedar abierto, sin marcarse ni enviarse, y la primera corrida dentro del horario lo SHALL tomar mientras no se haya cumplido su día de vigencia. Los carritos sin permiso de WhatsApp SHALL seguir su camino de siempre.

#### Scenario: Carrito dejado en un cierre de horario
- **WHEN** un carrito con permiso se deja el viernes a las 6:30 p. m., o el sábado a las 2:30 p. m.
- **THEN** el primero espera y el sábado a las 8:00 a. m. recibe el mensaje; el segundo no recibe nada el fin de semana y el lunes ya venció (pasó más de un día)

### Requirement: Comprar cierra el carrito
Cuando el comprador haga el pedido, el sistema SHALL cerrar su carrito, también el que quedó solo con el teléfono. Un carrito cuyo recordatorio ya salió por WhatsApp SHALL conservarse, marcado como comprado, porque guarda la prueba del permiso.

#### Scenario: Comprar después del recordatorio
- **WHEN** el comprador compra después de recibir el mensaje
- **THEN** no recibe más recordatorios, el carrito queda como comprado con su prueba y cuenta como carrito recuperado

### Requirement: Lenguaje claro, privacidad y write-set
Los textos que vea la persona SHALL ser claros y sin jerga, y los registros SHALL usar el teléfono enmascarado. El recordatorio SHALL escribir únicamente en el carrito, en el historial de WhatsApp (la fila del envío y su reserva del día), en el saldo de WhatsApp de la empresa (el cobro y el contador diario) y en la lista de "no contactar", y SHALL NOT leer ni escribir pedidos, inventario, productos ni precios.

#### Scenario: Producto, variantes, precio y listas de precios permanecen sin cambios
- **WHEN** se guardan carritos y se envían recordatorios por WhatsApp
- **THEN** el maestro de productos, sus variantes, los precios, las listas de precios y el inventario quedan idénticos
