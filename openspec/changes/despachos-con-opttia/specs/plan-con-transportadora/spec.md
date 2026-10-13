## Purpose

Segunda fase del plan de despachos, igual para cualquier comercio y cualquier transportadora conectada. Para los pedidos que los mensajeros propios no cubren, propone la integración logística del comercio con su tarifa. Al aprobar, crea el envío sin duplicarlo. Ninguna regla depende del nombre de la transportadora.

## ADDED Requirements

### Requirement: Cuándo se sugiere transportadora
El plan SHALL proponer un grupo "Por transportadora" cuando se cumplen las dos condiciones:
- el comercio tiene activa al menos una integración logística que crea envíos;
- el pedido no lo cubren sus mensajeros.

Se considera que no lo cubren en cualquiera de estos casos:
- el comercio no tiene mensajeros propios;
- ningún mensajero llevó un pedido a esa ciudad o zona en los últimos 30 días;
- la zona de cobro indica envío por transportadora.

Si hay varias integraciones, el plan SHALL sugerir una así:
- la de menor tarifa, si las que cotizan responden;
- si no, la que el comercio usó más en los últimos 30 días.

La persona puede cambiarla antes de aprobar. Como hoy en la pantalla, cada pedido por transportadora lleva su propia orden de envío.

#### Scenario: Comercio sin mensajeros
- **WHEN** un comercio sin mensajeros propios y con una integración logística activa tiene 14 pedidos listos con fecha de entrega de hoy
- **THEN** el plan muestra un grupo "Por <transportadora>" con los 14 pedidos, y al aprobarlo se crean 14 órdenes de envío, una por pedido

#### Scenario: Ciudad que los mensajeros no cubren
- **WHEN** un comercio con mensajeros tiene un pedido para una ciudad donde ningún mensajero ha llevado en 30 días y tiene conectada una transportadora
- **THEN** el pedido aparece en un grupo "Por transportadora", y no en un grupo de mensajero

### Requirement: Cualquier transportadora por la capa común
Cada integración logística SHALL declarar en la capa común de proveedores:
- **Cotización:** si cotiza o si tiene una tarifa fija configurada.
- **Datos que exige:** por ejemplo, el código DANE de la ciudad o el peso.
- **Duplicados:** si garantiza que un pedido no genera dos envíos.

El plan MUST usar solo esas declaraciones, sin reglas escritas para una transportadora con nombre propio (Artículo VI). Una transportadora nueva entra al plan cuando su adaptador hace esas declaraciones y pasa las pruebas.

#### Scenario: Transportadora nueva
- **WHEN** se conecta una transportadora nueva cuyo adaptador declara que cotiza y que no duplica, y pasa sus pruebas
- **THEN** aparece en el plan de los comercios que la tienen activa, sin cambiar el plan

### Requirement: Tarifa
- **Si la transportadora cotiza:** el grupo SHALL mostrar la tarifa que ella devuelve.
- **Si tiene una tarifa fija configurada:** el grupo SHALL mostrar esa.
- **Si no hay tarifa:** el grupo SHALL decir "sin tarifa".

La tarifa MUST NOT calcularse ni inventarse. Si la cotización no responde en 10 segundos, el grupo dice "sin tarifa por ahora" y se puede aprobar igual.

#### Scenario: Cotización caída
- **WHEN** la transportadora no responde la cotización en 10 segundos
- **THEN** el grupo muestra "sin tarifa por ahora" y el botón Aprobar sigue disponible

### Requirement: Aprobar crea el envío por el camino de la pantalla
Aprobar un grupo por transportadora SHALL crear el envío de cada pedido por el mismo camino que usa hoy la pantalla de Despachos:
- la guía, la etiqueta y el seguimiento quedan en el pedido como hoy;
- el pedido queda en el estado que esa integración define;
- el contraentrega se envía exactamente como lo envía la pantalla.

#### Scenario: Grupo aprobado
- **WHEN** se aprueba un grupo de 2 pedidos por transportadora
- **THEN** cada pedido queda con su envío y su seguimiento, igual que si se hubiera enviado desde la pantalla de Despachos

### Requirement: Un solo envío por pedido
Un pedido que ya tiene un envío, o uno en proceso, MUST NOT enviarse otra vez a la transportadora. Esto vale para un reintento, una segunda aprobación o una respuesta que se demoró. Si una creación quedó sin respuesta, antes de volver a crearla el sistema SHALL averiguar si el envío ya existe. Si no puede averiguarlo, el pedido queda "por revisar" y no se crea otro.

Una transportadora cuyo adaptador no garantice esto MUST NOT ofrecerse en el plan.

#### Scenario: Respuesta perdida
- **WHEN** la transportadora creó el envío pero la respuesta se perdió y la persona vuelve a aprobar
- **THEN** no se crea un segundo envío; el pedido queda con el existente o "por revisar"

#### Scenario: Adaptador sin garantía
- **WHEN** un comercio tiene activa una transportadora cuyo adaptador no garantiza un solo envío por pedido
- **THEN** el plan no la sugiere y sus pedidos quedan en "No entra al plan" con la razón "esta transportadora se despacha desde Despachos"

### Requirement: Datos que faltan
Si a un pedido le falta un dato que la transportadora declara obligatorio, el pedido SHALL quedar en "No entra al plan" con la razón "falta <dato>". No se SHALL enviar nada a la transportadora.

#### Scenario: Sin código DANE
- **WHEN** un pedido para una transportadora que exige código DANE no tiene ciudad con ese código
- **THEN** el pedido aparece en "No entra al plan" con la razón "falta el código DANE de la ciudad"
