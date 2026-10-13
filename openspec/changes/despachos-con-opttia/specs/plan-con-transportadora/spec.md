## Purpose

Segunda fase del plan de despachos, igual para cualquier comercio y cualquier transportadora conectada. Para los pedidos que los mensajeros propios no cubren, propone la integración logística del comercio que acepta ese pedido. Al aprobar, crea el envío sin duplicarlo. Ninguna regla depende del nombre de la transportadora.

Ajustada el 13-oct con la medición de producción y aprobada por Daniel el mismo día: la transportadora depende de qué pedidos acepta cada integración (por ejemplo, de los productos del pedido), no de cuál usa más el comercio.

## ADDED Requirements

### Requirement: Cuándo se sugiere transportadora
El plan SHALL proponer un grupo "Por <transportadora>" cuando se cumplen las dos condiciones:
- el pedido no lo cubren los mensajeros del comercio;
- alguna integración logística activa del comercio acepta ese pedido y garantiza un solo envío por pedido.

Se considera que los mensajeros no lo cubren en cualquiera de estos casos:
- el comercio no tiene mensajeros propios;
- ningún mensajero llevó un pedido a esa ciudad en los últimos 14 días;
- la zona de cobro indica envío por transportadora.

Si varias integraciones aceptan el pedido y lo garantizan, el plan SHALL sugerir una así:
- la de menor tarifa, cuando todas tienen tarifa;
- si no, la que el comercio usó más en los últimos 30 días entre las que lo aceptan.

Si ninguna integración lo acepta y lo garantiza, el pedido SHALL quedar en "No entra al plan" con la razón de siempre ("se despacha por transportadora desde Despachos" o la de cobertura).

La persona puede cambiar la transportadora por otra que acepte todos los pedidos del grupo. Como hoy en la pantalla, cada pedido por transportadora lleva su propia orden de envío.

#### Scenario: Comercio sin mensajeros
- **WHEN** un comercio sin mensajeros propios tiene 14 pedidos listos para hoy y una integración activa que los acepta y garantiza un envío por pedido
- **THEN** el plan muestra un grupo "Por <transportadora>" con los 14 pedidos, y al aprobarlo se crean 14 órdenes de envío, una por pedido

#### Scenario: La transportadora depende de los productos
- **WHEN** un comercio tiene dos integraciones activas, una acepta solo pedidos con productos de su catálogo y la otra no garantiza un envío por pedido
- **THEN** los pedidos con productos de ese catálogo van al grupo de la primera, y los demás quedan en "No entra al plan" con la razón "se despacha por transportadora desde Despachos"

#### Scenario: Ciudad que los mensajeros no cubren
- **WHEN** un comercio con mensajeros tiene un pedido para una ciudad donde ningún mensajero ha llevado en 14 días y una integración activa acepta ese pedido
- **THEN** el pedido aparece en un grupo "Por <transportadora>", y no en un grupo de mensajero

### Requirement: Cualquier transportadora por la capa común
Cada integración logística SHALL declarar en su adaptador, dentro de la capa común de proveedores:
- **Qué pedidos acepta:** por ejemplo, solo los que tienen todos sus productos en el catálogo de esa integración.
- **Tarifa:** si cotiza, si tiene una tarifa fija, si el envío va incluido o si no tiene tarifa.
- **Datos que exige:** por ejemplo, la dirección, la ciudad o el código DANE.
- **Duplicados:** si garantiza que un pedido no genera dos envíos.

El plan MUST usar solo esas declaraciones, sin reglas escritas para una transportadora con nombre propio (Artículo VI). Una integración sin declaración no se ofrece. Una transportadora nueva entra al plan cuando su adaptador hace esas declaraciones y pasa las pruebas.

#### Scenario: Transportadora nueva
- **WHEN** se conecta una transportadora nueva cuyo adaptador declara qué pedidos acepta y que no duplica, y pasa sus pruebas
- **THEN** aparece en el plan de los comercios que la tienen activa, sin cambiar el plan

### Requirement: Tarifa
- **Si la transportadora cotiza:** el grupo SHALL mostrar la tarifa que ella devuelve.
- **Si tiene una tarifa fija configurada:** el grupo SHALL mostrar esa.
- **Si el envío va incluido:** el grupo SHALL decir "sin tarifa: el envío va incluido".
- **Si no hay tarifa:** el grupo SHALL decir "sin tarifa".

La tarifa MUST NOT calcularse ni inventarse. La cotización por API llega cuando un adaptador sepa cotizar un pedido por sí solo; hoy ninguno lo hace. Cuando exista, si no responde en 10 segundos, el grupo dirá "sin tarifa por ahora" y se podrá aprobar igual.

#### Scenario: Envío incluido
- **WHEN** el adaptador declara que el envío va incluido
- **THEN** el grupo dice "sin tarifa: el envío va incluido" y el botón Aprobar sigue disponible

### Requirement: Aprobar crea el envío por el camino de la pantalla
Aprobar un grupo por transportadora SHALL crear el envío de cada pedido por el mismo camino que usa hoy la pantalla de Despachos:
- la guía, la etiqueta y el seguimiento quedan en el pedido como hoy;
- el pedido queda en el estado que esa integración define;
- el contraentrega se envía exactamente como lo envía la pantalla.

Antes de crear cada envío, el servidor SHALL volver a revisar que el pedido no cambió, que la integración sigue activa y que lo acepta. Si un envío falla, ese pedido vuelve a quedar libre, con su razón, y los demás siguen.

#### Scenario: Grupo aprobado
- **WHEN** se aprueba un grupo de 2 pedidos por transportadora
- **THEN** cada pedido queda con su orden de envío, su envío y su seguimiento, igual que si se hubiera enviado desde la pantalla de Despachos

### Requirement: Un solo envío por pedido
Un pedido que ya tiene un envío, o uno en proceso, MUST NOT enviarse otra vez a la transportadora. Esto vale para un reintento, una segunda aprobación o una respuesta que se demoró.

Si un intento anterior quedó sin confirmar, antes de volver a crear el envío el sistema SHALL buscar en la transportadora si ya existe:
- si existe, el pedido queda con ese envío y no se crea otro;
- si no puede averiguarlo, el pedido queda "por revisar" y no se crea otro;
- si el intento anterior falló hace muy poco por una respuesta que no llegó, se espera antes de buscar.

Una transportadora cuyo adaptador no garantice esto MUST NOT ofrecerse en el plan.

#### Scenario: Respuesta perdida
- **WHEN** la transportadora creó el envío pero la respuesta se perdió y la persona vuelve a aprobar
- **THEN** no se crea un segundo envío; el pedido queda con el existente o "por revisar"

#### Scenario: Adaptador sin garantía
- **WHEN** un comercio tiene activa una transportadora cuyo adaptador no garantiza un solo envío por pedido
- **THEN** el plan no la sugiere y sus pedidos quedan en "No entra al plan" con la razón "se despacha por transportadora desde Despachos"

### Requirement: Datos que faltan
Si a un pedido le falta un dato que la transportadora declara obligatorio, el pedido SHALL quedar en "No entra al plan" con la razón "falta <dato>". No se SHALL enviar nada a la transportadora.

#### Scenario: Sin código DANE
- **WHEN** un pedido para una transportadora que exige código DANE no tiene ciudad con ese código
- **THEN** el pedido aparece en "No entra al plan" con la razón "falta el código DANE de la ciudad"
