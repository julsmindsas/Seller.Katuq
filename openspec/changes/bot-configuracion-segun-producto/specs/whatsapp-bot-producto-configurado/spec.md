## MODIFIED Requirements

### Requirement: Las adiciones se ofrecen y suman con el precio del maestro

El bot SHALL conocer las adiciones del comercio (maestro `adiciones`, con
nombre y precio real, ordenadas por posición, tope 30) y SHALL poder sumarlas
a un producto **solo cuando ese producto acepte adiciones** — si no las
acepta, NO SHALL mencionarlas. El agente anota NOMBRES; en el cierre cada
nombre SHALL resolverse contra el maestro y entrar a `configuracion.adiciones`
con el objeto completo (precio sin IVA e IVA del maestro, en la forma que el
cálculo de la cotización sabe sumar) — un precio dictado por el modelo NO
SHALL llegar jamás a la cotización, y un nombre que no matchea
inequívocamente SHALL descartarse con log.

#### Scenario: Producto que acepta adiciones

- **WHEN** el cliente agrega un producto que acepta adiciones y el comercio tiene "Ferrero rocher" en su maestro
- **THEN** el bot puede ofrecerla con su precio real
- **AND** la cotización la suma con el precio y el IVA del maestro, igual que venta asistida

#### Scenario: Producto que NO acepta adiciones

- **WHEN** el producto no acepta adiciones
- **THEN** el bot no las ofrece ni las menciona

#### Scenario: Adición inventada o ambigua

- **WHEN** el agente anota una adición que no existe en el maestro o cuyo nombre matchea con más de una
- **THEN** el cierre la descarta con log y la cotización sale sin ella
- **AND** el pedido NO se bloquea por eso
