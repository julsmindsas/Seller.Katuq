## ADDED Requirements

### Requirement: Un cupón dice qué regala
Cada cupón de campaña SHALL tener un beneficio explícito. Una campaña sin beneficio SHALL entenderse como una de Premium de siempre y SHALL NOT cambiar. Un beneficio que el sistema todavía no sabe cumplir SHALL NOT ofrecerse en la landing, SHALL NOT poder canjearse y SHALL NOT gastar cupo. Un cupón de pedidos mal armado (sin el número de pedidos, o que no supere el tope del plan gratis) SHALL tratarse igual.

#### Scenario: Beneficio que aún no existe
- **WHEN** alguien abre el enlace de un cupón con un beneficio que el sistema no sabe cumplir
- **THEN** ve que la promoción no está disponible y ningún intento de canje gasta cupo

#### Scenario: Campaña de Premium de siempre
- **WHEN** se consulta o se canjea una campaña sin beneficio, como COLOMBIA2026
- **THEN** se comporta exactamente como antes

### Requirement: Ventana de canje en hora de Bogotá
Un cupón de feria SHALL poder canjearse solo entre su fecha de inicio y su fecha de cierre, medidas en hora de America/Bogota. Fuera de la ventana SHALL rechazarse sin gastar cupo. Cuando el canje se aplaza hasta confirmar el correo, la ventana SHALL medirse con el momento en que la persona se registró.

#### Scenario: Último segundo del 18
- **WHEN** alguien canjea el 18 de octubre a las 11:59:59 p. m. hora de Bogotá
- **THEN** el cupón se aplica; a las 12:00:00 a. m. del 19 ya no

#### Scenario: Se registró dentro de la ventana y confirmó después
- **WHEN** una persona se registra el 18 a las 11:58 p. m. y confirma su correo el 19 a las 12:03 a. m.
- **THEN** conserva el cupón

#### Scenario: Antes de abrir
- **WHEN** alguien intenta canjear el 15 de octubre
- **THEN** se rechaza, no gasta cupo y el panel dice que el cupón aún no abre

### Requirement: Más pedidos mientras el plan sea gratis
La empresa que canjee un cupón de pedidos SHALL tener el tope mensual del cupón (30) en lugar del de su plan (15) en todos los sitios que hacen cumplir el tope de pedidos: venta asistida, punto de venta, tienda, importaciones y flujos, la validación previa y lo que muestra "Mi plan". El cupón SHALL solo subir el tope, nunca bajarlo, y SHALL NOT dar tope a un plan que no lo tiene: mientras la empresa tenga un plan de pago, el cupón no cambia nada.

#### Scenario: El pedido 16 y el 31
- **WHEN** una empresa gratis con el cupón tiene 15 pedidos en el mes y crea otro
- **THEN** el pedido se crea; con 30 pedidos, el siguiente se frena con el mensaje del límite de 30

#### Scenario: Sin cupón, igual que hoy
- **WHEN** una empresa gratis sin cupón tiene 15 pedidos y crea otro
- **THEN** se frena con el límite de 15

#### Scenario: Plan de pago
- **WHEN** una empresa con el cupón paga un plan
- **THEN** no tiene tope de pedidos, como cualquier plan de pago

### Requirement: El cupón no es Premium ni un plan a la venta
La empresa que canjee un cupón de pedidos SHALL nacer en el plan gratis, sin fecha de Premium y sin el origen de Premium promocional. El trabajo diario que baja el Premium promocional SHALL NOT alcanzarla. Un cupón SHALL NOT aparecer en la vitrina pública de planes ni en ningún lector de planes.

#### Scenario: Trabajo diario de vencimiento
- **WHEN** corre el trabajo que baja el Premium promocional vencido
- **THEN** la empresa con el cupón queda idéntica

### Requirement: El cupo no se pasa
El canje SHALL descontar un uso del cupo dentro de la misma transacción que lo revalida, de modo que canjes simultáneos no superen el cupo máximo. Un registro que no llegó a canjear NO SHALL gastar cupo. Un cupón con cupo máximo en cero SHALL entenderse sin tope.

#### Scenario: Diez canjes a la vez con tres cupos
- **WHEN** diez personas canjean al mismo tiempo un cupón con tres cupos
- **THEN** exactamente tres lo obtienen

### Requirement: Los textos dicen lo que el cupón da
La landing, el registro, el correo de bienvenida y el aviso interno SHALL decir el beneficio real ("30 pedidos al mes en tu plan gratis") y SHALL NOT decir Premium para un cupón de pedidos. Si el cupón ya no estaba disponible al terminar el registro, la cuenta SHALL quedar creada en el plan gratis y SHALL decírsele.

#### Scenario: Registro con el cupón
- **WHEN** una persona termina el registro con el cupón vigente
- **THEN** ve que el cupón quedó aplicado con 30 pedidos al mes y su correo de bienvenida dice "hasta 30 pedidos al mes"

### Requirement: Apagado por defecto
Mientras no exista ningún cupón con beneficio, el registro, los límites, los planes y los cobros SHALL comportarse exactamente como antes. Una empresa sin cupón guardado SHALL NOT cambiar en nada. Un cupón SHALL poder apagarse al instante desde el panel de campañas, y el beneficio de una empresa concreta SHALL poder quitarse sin tocar el resto.

#### Scenario: Nadie ha creado cupones
- **WHEN** se registra una empresa sin código, o con un código que no existe
- **THEN** el documento de la empresa y la respuesta del registro son idénticos a los de antes de este cambio

#### Scenario: Apagar a mitad de la feria
- **WHEN** un administrador apaga el cupón
- **THEN** los canjes nuevos se rechazan; las empresas que ya lo canjearon conservan su beneficio
