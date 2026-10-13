## Purpose

Detecta solo, con los datos de cada comercio, cómo despacha: con mensajeros propios, por transportadora o de las dos formas. También detecta de qué tamaño arma sus grupos y qué franjas usa. Así el plan funciona igual para cualquier comercio, actual o futuro, sin configurarlo a mano.

## ADDED Requirements

### Requirement: Perfil detectado de los datos del comercio
Para cada comercio, el sistema SHALL calcular un perfil de despacho a partir de sus propios datos:
- **Mensajeros propios:** cuántos tiene la empresa y cuántos despacharon en los últimos 30 días.
- **Integraciones logísticas:** cuáles están activas y cuáles de ellas crean envíos.
- **Cómo despacha:** el modo, que puede ser mensajeros, transportadora, ambos o todavía ninguno. Sale de las órdenes de envío de los últimos 30 días y de lo que tiene conectado.
- **Tamaño de grupo:** el habitual, medido en las órdenes de envío con mensajero de los últimos 30 días.
- **Franjas de entrega:** las que usan sus pedidos, leídas de su texto.
- **Zonas que suele juntar:** las parejas de zonas que salieron en un mismo recorrido en los últimos 14 días.
- **Minutos por pedido:** cuánto tarda un mensajero en volver por cada pedido que llevaba. Se mide entre dos salidas seguidas del mismo mensajero el mismo día. Sin historia suficiente, son 40 minutos.

El perfil MUST NOT depender de reglas escritas para un comercio en particular, ni pedir datos técnicos a la persona.

#### Scenario: Comercio con mensajeros
- **WHEN** un comercio tiene mensajeros propios y en 30 días despachó con ellos casi todas sus órdenes
- **THEN** su perfil queda en modo "mensajeros", con su tamaño de grupo habitual y sus franjas

#### Scenario: Comercio solo con transportadora
- **WHEN** un comercio no tiene mensajeros propios y tiene una integración logística activa que crea envíos
- **THEN** su perfil queda en modo "transportadora" con esa integración

### Requirement: Comercio nuevo o sin historia
Un comercio sin órdenes de envío en los últimos 30 días SHALL recibir valores por defecto:
- **Modo:** el que indique lo que tiene conectado.
- **Tamaño de grupo:** 8 pedidos.

El perfil MUST ajustarse solo a medida que el comercio despache, sin que nadie lo toque.

#### Scenario: Primer día de un comercio
- **WHEN** un comercio recién creado registra su primer mensajero y tiene pedidos listos
- **THEN** el plan funciona con los valores por defecto, y a medida que despacha, su perfil usa su propia historia

### Requirement: Franjas leídas de cualquier texto
Las franjas SHALL reconocerse en el texto de la franja de entrega del pedido, como "En la mañana 7:00AM a 10:00AM", "2pm-5pm" o "de 14:00 a 17:00". Para cada una se saca la hora de inicio y la de fin, sin una lista fija por comercio.

- **Urgencia:** un texto de urgencia, como "Lo más pronto posible", "urgente" o "inmediato", SHALL tomarse como "Lo antes posible", y sus pedidos van de primeros.
- **Sin horas:** un texto sin horas reconocibles queda como "sin franja", y sus pedidos van al final del plan.

#### Scenario: Formatos distintos
- **WHEN** un comercio escribe sus franjas como "9-1 pm" y otro como "De 09:00 a 13:00"
- **THEN** en los dos casos la franja va de 9:00 a 13:00

#### Scenario: Lo más pronto posible
- **WHEN** un pedido tiene la franja "LO MAS PRONTO POSIBLE"
- **THEN** su grupo sale antes que los de cualquier franja con horas

### Requirement: Perfil visible y explicable
La vista Despachos SHALL mostrar en una línea lo que el perfil detectó, por ejemplo "Despachas con 4 mensajeros, en grupos de unos 6 pedidos, en 2 franjas". Así la persona entiende de dónde salen las sugerencias. El perfil MUST NOT incluir datos de clientes.

#### Scenario: Persona revisa el perfil
- **WHEN** la persona abre la vista Despachos
- **THEN** ve la línea del perfil, con cifras que coinciden con la historia de su comercio

### Requirement: Reglas del comercio por encima del perfil
Si el comercio tiene reglas de despacho guardadas (zona o ciudad hacia un mensajero o transportadora), esas reglas SHALL ganarle al perfil y a las demás señales para los pedidos que cubren.

#### Scenario: Regla por zona
- **WHEN** un comercio tiene guardada la regla "zona Norte → mensajero M"
- **THEN** los grupos de la zona Norte sugieren a M, con la razón "Regla de tu comercio"
