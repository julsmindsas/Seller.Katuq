## ADDED Requirements

### Requirement: Reputación separada de los correos transaccionales
Los correos de campaña y de remarketing SHALL salir por un canal de envío y un dominio de envío distintos a los de los correos transaccionales de Katuq, de modo que las quejas o rebotes de las campañas no afecten la entrega de confirmaciones de pedido, pago o envío.

#### Scenario: Campaña con muchas quejas
- **WHEN** una campaña genera quejas por encima del umbral
- **THEN** los correos de pedido de todos los comercios siguen saliendo por su canal sin cambios

### Requirement: Remitente autenticado con el nombre de la tienda
Todo correo de campaña SHALL pasar la verificación de remitente de los proveedores de correo (autenticación del dominio alineada con el remitente visible). El remitente visible SHALL llevar el nombre de la tienda, y las respuestas SHALL llegarle al comercio. No SHALL enviarse ninguna campaña mientras la autenticación del dominio de envío no esté verificada.

#### Scenario: Dominio sin verificar
- **WHEN** la autenticación del dominio de envío no está verificada
- **THEN** el envío de campañas queda bloqueado para todas las empresas y el Super Admin ve la causa

### Requirement: Rebotes y quejas
El sistema SHALL recibir los avisos de rebote y de queja del proveedor de envío, verificar que sean auténticos, guardar el aviso original antes de procesarlo y aplicar la supresión que corresponda. Un aviso repetido SHALL NOT duplicar el efecto.

#### Scenario: Aviso falso
- **WHEN** llega un aviso de rebote sin firma válida
- **THEN** se rechaza y nadie queda suprimido

#### Scenario: Aviso repetido
- **WHEN** el proveedor entrega dos veces el mismo aviso de rebote
- **THEN** la supresión y las métricas cuentan una sola vez

### Requirement: Pausa automática por mala recepción
Una campaña SHALL pausarse sola, con aviso al comercio, cuando sus rebotes superen el 5 % o sus quejas superen el 0,1 % de lo enviado, medidos desde las primeras 200 entregas. Una empresa con dos campañas pausadas por este motivo en 30 días SHALL quedar sin envío de campañas hasta revisión del Super Admin.

#### Scenario: Lista vieja con muchos rebotes
- **WHEN** 15 de los primeros 200 correos rebotan
- **THEN** la campaña se pausa, el comercio ve por qué, y no sale ningún correo más

### Requirement: Límites de volumen y calentamiento
El sistema SHALL respetar: el cupo mensual por plan de cada empresa, un tope por campaña, un tope diario global que crece por etapas mientras el dominio de envío es nuevo, y la velocidad máxima que permita el proveedor. Al llegar a un tope, lo pendiente SHALL continuar en la siguiente ventana permitida sin perderse ni duplicarse.

#### Scenario: Tope diario global alcanzado
- **WHEN** se alcanza el tope diario global con campañas pendientes
- **THEN** los correos pendientes salen en la siguiente ventana permitida, en orden, sin repetirse

### Requirement: Envío idempotente
Cada envío de campaña SHALL tener una clave única por campaña y destinatario. Un reintento, un reinicio del servidor o dos procesos despachando a la vez SHALL NOT producir un segundo envío del mismo correo al mismo destinatario.

#### Scenario: Reinicio a mitad de campaña
- **WHEN** el servidor se reinicia en medio de una campaña
- **THEN** al volver continúa con los pendientes y nadie la recibe dos veces

### Requirement: Interruptor general y observabilidad
El envío de campañas SHALL poder apagarse de inmediato para todas las empresas sin desplegar código. Cada envío y cada aviso de rebote o queja SHALL dejar registro estructurado con identificador de correlación, sin la dirección de correo en claro.

#### Scenario: Apagado de emergencia
- **WHEN** se apaga el interruptor general
- **THEN** no sale ningún correo de campaña más y las campañas en curso quedan pausadas, no perdidas
