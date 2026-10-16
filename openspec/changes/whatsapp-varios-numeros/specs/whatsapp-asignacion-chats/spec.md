## Purpose

Garantiza que en el buzón de WhatsApp cada chat tenga un solo dueño. Así dos vendedores
no responden al mismo cliente al tiempo, y cada vendedor ve solo lo que le corresponde.

## ADDED Requirements

### Requirement: Un chat es un cliente con un número

En los números conectados con este cambio, el sistema SHALL tratar como chats distintos
las conversaciones de un mismo cliente con dos números del comercio. El buzón SHALL
mostrar en cada chat el número por el que va.

#### Scenario: Cliente que escribe a dos números

- **WHEN** un cliente le escribe al número de Ana y al número de Luis del mismo comercio
- **THEN** el buzón muestra dos chats, cada uno con su número y su historial

### Requirement: Cada chat tiene un solo dueño

El sistema SHALL asignar a cada chat como máximo un dueño, de esta forma:

- Si el número tiene un solo vendedor asignado, el chat SHALL quedar de ese vendedor desde el primer mensaje.
- Si el número tiene varios vendedores, el chat SHALL quedar del primero que lo tome o le responda.
- Si dos vendedores lo intentan al mismo tiempo, solo uno SHALL quedar como dueño.

#### Scenario: Número de un solo vendedor

- **WHEN** un cliente nuevo le escribe al número asignado solo a Ana
- **THEN** el chat aparece como atendido por Ana

#### Scenario: Dos vendedores responden a la vez

- **WHEN** Ana y Luis, los dos asignados al mismo número, responden el mismo chat sin dueño casi al mismo tiempo
- **THEN** sale solo una de las dos respuestas
- **AND** el otro vendedor ve que el chat ya lo está atendiendo su compañero

### Requirement: Solo el dueño escribe en el chat

Si un chat tiene dueño, el sistema SHALL rechazar en el servidor cualquier envío de otro
usuario, aunque sea de la familia Administrador. El rechazo SHALL decir quién atiende el
chat, y la pantalla SHALL mostrar el chat en modo lectura para quien no es el dueño.

#### Scenario: Otro vendedor intenta escribir

- **WHEN** Luis intenta responder un chat que atiende Ana
- **THEN** el mensaje no sale y Luis ve "Este chat lo atiende Ana"

### Requirement: Tomar, soltar y pasar un chat

El sistema SHALL permitir:

- Al vendedor asignado al número: tomar un chat sin dueño.
- Al dueño: soltar el chat, que queda sin dueño y visible para todos los vendedores del número.
- A la familia Administrador: pasar el chat a otro usuario del comercio o quitarle el dueño.

Cada cambio de dueño SHALL quedar registrado con quién lo hizo y cuándo.

#### Scenario: El administrador pasa un chat

- **WHEN** el administrador pasa a Luis un chat que atendía Ana
- **THEN** Luis puede responderlo y Ana deja de poder escribir en él
- **AND** el cambio queda registrado

#### Scenario: El dueño suelta el chat

- **WHEN** Ana suelta un chat de un número que comparte con Luis
- **THEN** el chat queda sin dueño y Luis puede tomarlo

### Requirement: Cada vendedor ve solo lo suyo

El buzón SHALL mostrar a cada usuario fuera de la familia Administrador solo:

- los chats de los números que tiene asignados;
- los chats que tiene a su nombre.

La familia Administrador SHALL ver todos los chats del comercio. El filtro SHALL
aplicarse en el servidor, también al abrir un chat por enlace directo. Los chats del
número compartido de Katuq SHALL conservar la visibilidad actual.

#### Scenario: Enlace directo a un chat ajeno

- **WHEN** un vendedor abre el enlace de un chat de un número que no tiene asignado
- **THEN** el servidor responde que no tiene acceso y no entrega mensajes

#### Scenario: Filtro por número

- **WHEN** el administrador filtra el buzón por el número de la línea 2
- **THEN** ve solo los chats de ese número, con su dueño

### Requirement: El bot no compite con el dueño

Cuando un chat tiene dueño humano, el bot de pedidos NO SHALL responder en él. El bot
SHALL poder encenderse en un solo número por comercio.

#### Scenario: Chat con dueño en el número del bot

- **WHEN** un cliente escribe en un chat que atiende Ana, en el número donde está el bot
- **THEN** el bot no contesta y el mensaje queda para Ana
