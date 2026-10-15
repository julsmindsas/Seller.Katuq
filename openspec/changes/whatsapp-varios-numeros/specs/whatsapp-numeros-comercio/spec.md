## Purpose

Permite que un comercio conecte por su cuenta varios números de WhatsApp, los asigne
a sus vendedores y que cada mensaje entre y salga por el número correcto, sin mezclarse
con otros comercios ni con el número compartido de Katuq.

## ADDED Requirements

### Requirement: El comercio conecta números sin intervención de Katuq

Cuando un usuario de la familia Administrador pide conectar un número, el sistema SHALL
entregarle un enlace de conexión de Kapso a nombre de su comercio. Al volver con éxito,
el sistema SHALL confirmar el número **consultándolo a Kapso**, sin fiarse de los datos
que trae el regreso del navegador, y SHALL agregarlo a la lista de números del comercio.
El usuario SHALL poder repetir la conexión para tantos números como necesite, uno a la
vez. Los usuarios fuera de la familia Administrador NO SHALL poder conectar ni
desconectar números.

#### Scenario: Conexión exitosa de un segundo número

- **WHEN** el administrador de un comercio que ya tiene un número conectado pulsa "Conectar número" y termina el enlace con éxito
- **THEN** la lista muestra los dos números, cada uno con nombre, teléfono y estado
- **AND** el nuevo número ya puede recibir mensajes

#### Scenario: Regreso alterado

- **WHEN** el regreso del enlace trae un número que Kapso no reporta como del comercio
- **THEN** el sistema no lo agrega y muestra que la conexión no se pudo confirmar

#### Scenario: Conexión cancelada o fallida

- **WHEN** el enlace vuelve con error
- **THEN** la pantalla explica la causa en lenguaje humano y la lista no cambia

### Requirement: Un número pertenece a un solo comercio

El sistema SHALL registrar a cada número con un único comercio dueño. Un número que ya
pertenece a otro comercio NO SHALL poder registrarse de nuevo.

#### Scenario: Número de otro comercio

- **WHEN** un comercio intenta registrar un número que ya está registrado a otro
- **THEN** el registro se rechaza y ningún mensaje de ese número cambia de comercio

### Requirement: Los mensajes entrantes se atribuyen por el número que los recibe

Cuando llega un mensaje a un número conectado con este cambio, el sistema SHALL
atribuirlo solo al comercio dueño de ese número y SHALL guardar qué número lo recibió.
Los mensajes que lleguen al número compartido de Katuq SHALL seguir atribuyéndose con la
regla vigente. Todo mensaje entrante SHALL pasar la verificación de firma antes de
procesarse, y un reintento del mismo mensaje NO SHALL duplicarlo.

#### Scenario: Cliente que también le escribió a otro comercio

- **WHEN** un cliente al que dos comercios le han escrito le contesta al número propio de uno de ellos
- **THEN** el mensaje aparece solo en el buzón del comercio dueño del número

#### Scenario: Firma inválida

- **WHEN** llega un evento sin firma válida
- **THEN** el sistema lo rechaza sin guardarlo

### Requirement: La respuesta sale por el número del chat

Cuando un usuario responde un chat, el sistema SHALL enviar el mensaje por el mismo
número que tiene el chat y SHALL comprobar que ese número es del comercio de la sesión.
La ventana de 24 horas SHALL contarse con los mensajes del cliente a ese número. Fuera de
la ventana, el sistema SHALL ofrecer una plantilla.

#### Scenario: Dos números, dos ventanas

- **WHEN** el cliente le escribió hoy al número A y hace tres días al número B
- **THEN** la respuesta libre desde el chat del número A sale
- **AND** la del chat del número B se rechaza con la explicación de la ventana y la opción de plantilla

### Requirement: Lo que se envía desde el celular se ve en Katuq

Cuando un número está en coexistencia y el vendedor responde desde el WhatsApp Business
del celular, el sistema SHALL mostrar ese mensaje en el chat correspondiente como enviado
por el comercio y NO SHALL descontarlo del saldo.

#### Scenario: Respuesta desde el celular

- **WHEN** el vendedor responde a un cliente desde su celular
- **THEN** el chat en Katuq muestra el mensaje enviado, marcado como enviado desde el celular
- **AND** el saldo prepago no cambia

### Requirement: Cada mensaje enviado descuenta del saldo del comercio

Todo mensaje que Katuq envía desde cualquier número del comercio SHALL descontar del
saldo prepago de WhatsApp del comercio con la misma tarifa vigente. Sin saldo
suficiente, el envío SHALL rechazarse con esa causa. El registro de cada envío SHALL
guardar el número usado y el usuario que lo envió.

#### Scenario: Saldo agotado

- **WHEN** un vendedor responde y el comercio no tiene saldo
- **THEN** el mensaje no sale y el vendedor ve que falta recargar

### Requirement: El administrador asigna vendedores a cada número

Un usuario de la familia Administrador SHALL poder asignar a cada número uno o varios
usuarios del comercio, cambiar esa asignación y desconectar el número. Al desconectar, el
número SHALL dejar de recibir y enviar, y sus chats SHALL quedar visibles como historial
para la familia Administrador.

#### Scenario: Cambio de vendedor de un número

- **WHEN** el administrador quita a Ana y pone a Luis en el número de la línea 2
- **THEN** desde ese momento Luis ve los chats de ese número y Ana deja de verlos, salvo los que tenga asignados a su nombre

### Requirement: El encendido es por comercio y reversible

La función SHALL quedar detrás de una bandera global y de una bandera por comercio. Con
cualquiera de las dos apagada, el comercio SHALL seguir funcionando exactamente como
antes de este cambio.

#### Scenario: Bandera apagada

- **WHEN** la bandera del comercio está apagada
- **THEN** la pantalla de WhatsApp y el buzón se ven y se comportan como antes
