## ADDED Requirements

### Requirement: Las adiciones se ofrecen y suman con el precio del maestro

El bot SHALL conocer las adiciones del comercio (maestro `adiciones`, con
nombre y precio real, ordenadas por posición, tope 30) y SHALL poder sumarlas
a un producto cuando el cliente las pida o acepte la sugerencia. El agente
anota NOMBRES; en el cierre cada nombre SHALL resolverse contra el maestro y
entrar a `configuracion.adiciones` con el objeto completo (precio sin IVA e
IVA del maestro) — un precio dictado por el modelo NO SHALL llegar jamás a la
cotización, y un nombre que no matchea inequívocamente SHALL descartarse con
log.

#### Scenario: Peluche con chocolates y globo

- **WHEN** el cliente acepta "¿le sumamos los chocolates por $12.000?" y pide también un globo
- **THEN** la línea del peluche queda con las dos adiciones y el bot canta el total con ellas incluidas
- **AND** la cotización final las suma con el precio y el IVA del maestro, igual que venta asistida

#### Scenario: Adición inventada o ambigua

- **WHEN** el agente anota una adición que no existe en el maestro o cuyo nombre matchea con más de una
- **THEN** el cierre la descarta con log y la cotización sale sin ella
- **AND** el pedido NO se bloquea por eso

### Requirement: Preferencias, ocasión y observaciones por producto

El cliente SHALL poder elegir preferencias del maestro (color, sabor) y dictar
ocasión u observaciones por producto ("es para un cumpleaños", "sin maní");
SHALL aterrizar en la configuración del ítem (`preferencias`,
`datosEntrega.ocasion`, observaciones concatenadas) para que producción y el
asesor las vean como si vinieran de venta asistida.

#### Scenario: Observación de alergia

- **WHEN** el cliente dice "que no traiga maní, es alérgica"
- **THEN** la observación queda en la configuración del producto y visible en la cotización

### Requirement: Las adiciones respetan la forma de entrega

Una adición restringida a domicilio NO SHALL entrar en un pedido de recoge (ni
al revés): en el cierre se valida contra la entrega acordada, la incompatible
se descarta y la nota lo explica. El pedido NO SHALL bloquearse por una
adición incompatible.

#### Scenario: Globo solo-domicilio en pedido de recoge

- **WHEN** el pedido quedó como recoge en tienda y una adición del carrito es "SOLO DOMICILIO"
- **THEN** la cotización sale sin esa adición y la nota dice que no aplica para recoge
