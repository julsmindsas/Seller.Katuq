## ADDED Requirements

### Requirement: Premium con fecha de vencimiento

El sistema SHALL permitir que una empresa esté en plan premium con una fecha de vencimiento y SHALL distinguir ese premium promocional del premium pagado. Un premium pagado NO SHALL tener fecha de vencimiento por este mecanismo y NO SHALL ser degradado por él.

#### Scenario: Empresa con premium promocional
- **WHEN** se consulta el estado de suscripción de una empresa que entró por campaña
- **THEN** la respuesta indica plan premium, la fecha en que vence y que su origen es promocional

#### Scenario: Empresa con premium pagado
- **WHEN** se consulta el estado de suscripción de una empresa que paga su plan
- **THEN** la respuesta indica plan premium sin fecha de vencimiento promocional

### Requirement: Degradación al vencer

El sistema SHALL revisar diariamente las empresas con premium promocional vencido y SHALL devolverlas al plan freemium restaurando los límites de ese plan. La degradación SHALL ser idempotente: repetirla sobre la misma empresa no SHALL producir un efecto distinto al de la primera vez.

#### Scenario: Vence el premium promocional
- **WHEN** la fecha de vencimiento de una empresa con premium promocional ya pasó
- **THEN** la empresa queda en plan freemium con los límites de freemium y conserva el registro de qué campaña la trajo

#### Scenario: No toca lo que no le corresponde
- **WHEN** corre la revisión diaria
- **THEN** las empresas con premium pagado, las que están en freemium y las que aún tienen premium promocional vigente quedan exactamente igual

#### Scenario: El comerciante conserva sus datos
- **WHEN** una empresa es degradada a freemium
- **THEN** sus pedidos, productos, inventario, clientes y configuración permanecen intactos y solo cambian el plan y sus límites

#### Scenario: Repetir la degradación no cambia nada
- **WHEN** la revisión diaria vuelve a procesar una empresa ya degradada
- **THEN** el resultado es el mismo que tras la primera degradación

#### Scenario: Ensayo antes de aplicar
- **WHEN** la revisión se ejecuta en modo simulación
- **THEN** reporta qué empresas degradaría sin modificar ninguna

### Requirement: Avisos antes del corte

El sistema SHALL avisar por correo al administrador de la empresa antes de que venza su premium promocional y el día en que vence, invitándolo a contratar el plan. Cada aviso SHALL enviarse una sola vez por empresa y campaña.

#### Scenario: Aviso previo
- **WHEN** al premium promocional de una empresa le quedan los días definidos para el preaviso
- **THEN** el administrador de esa empresa recibe un correo con la fecha de corte y cómo contratar el plan

#### Scenario: Aviso el día del corte
- **WHEN** el premium promocional de una empresa vence y queda degradada
- **THEN** el administrador recibe un correo informando el cambio de plan y cómo recuperar premium

#### Scenario: Sin correos repetidos
- **WHEN** la revisión diaria corre varias veces sobre la misma empresa en la ventana de preaviso
- **THEN** el administrador recibe el aviso previo una sola vez

### Requirement: Sin cobros automáticos

El sistema NO SHALL cobrar, ni solicitar medio de pago, ni crear una suscripción de cobro como consecuencia de una promoción o de su vencimiento.

#### Scenario: El vencimiento no genera cobro
- **WHEN** vence el premium promocional de una empresa
- **THEN** no se genera ningún cobro, cargo ni intento de pago, y la empresa simplemente pasa a freemium
