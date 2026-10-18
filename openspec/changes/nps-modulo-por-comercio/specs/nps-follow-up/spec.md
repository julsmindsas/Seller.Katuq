## ADDED Requirements

### Requirement: Cada detractor es un caso
Cada respuesta con nota de 0 a 6 SHALL abrir un caso de seguimiento con:
- el responsable de la encuesta;
- el estado "Nuevo";
- la nota, el comentario y las respuestas adicionales;
- el canal y, si lo hay, el pedido y el contacto del comprador.

Los estados SHALL ser Nuevo, Contactado, Resuelto y Sin solución. Las respuestas de prueba SHALL NOT abrir casos.

#### Scenario: Llega un detractor
- **WHEN** un comprador responde 3 con el comentario "llegó tarde y frío"
- **THEN** queda un caso Nuevo a nombre del responsable, con el pedido, el teléfono del comprador y el comentario

### Requirement: Aviso inmediato
Al abrirse un caso, el sistema SHALL:
- avisar en la campana del comercio, con acceso directo al caso;
- enviar un correo al responsable con la nota, el comentario, el pedido y el contacto del comprador.

Un mismo caso SHALL NOT avisarse dos veces. Si el aviso falla, el caso SHALL quedar abierto igual.

#### Scenario: Correo al responsable
- **WHEN** se abre un caso de un detractor
- **THEN** el responsable recibe un correo con el enlace al caso, y la campana del comercio muestra el aviso

### Requirement: Atender el caso
Quien atiende SHALL poder:
- cambiar el estado;
- reasignar a otro usuario activo de la empresa, que recibe el correo de aviso;
- agregar notas.

Pasar a Resuelto o Sin solución SHALL pedir una nota de cierre. Cada cambio SHALL quedar en el historial del caso, con quién y cuándo.

Pueden atender la familia Administrador y el responsable del caso.

#### Scenario: Cerrar un caso
- **WHEN** Ana llama al comprador, le ofrece un cambio y marca el caso como Resuelto con la nota "se le reenvió el pedido"
- **THEN** el caso queda Resuelto con su nota, la fecha de cierre y el historial

#### Scenario: Cerrar sin nota
- **WHEN** alguien intenta marcar un caso como Resuelto sin nota
- **THEN** el sistema pide la nota antes de cerrarlo

### Requirement: Recordatorio de casos vencidos
Un caso Nuevo sin cambios en 48 horas SHALL recordarse al responsable por correo, una vez al día, hasta que cambie de estado.

#### Scenario: Caso olvidado
- **WHEN** un caso lleva 3 días en Nuevo
- **THEN** el responsable recibe el recordatorio diario y el caso aparece como vencido

### Requirement: Pestaña Seguimiento
La pestaña SHALL listar:
- los casos abiertos primero, y entre ellos los vencidos;
- filtros por estado, responsable y encuesta.

También SHALL mostrar los casos abiertos, los vencidos y el tiempo promedio hasta el primer contacto y hasta el cierre en los últimos 90 días. Un usuario que no es de la familia Administrador SHALL ver solo los casos a su nombre.

#### Scenario: Responsable sin rol de administrador
- **WHEN** un vendedor responsable de casos abre Seguimiento
- **THEN** ve solo sus casos

### Requirement: Detractores de los comercios en Julsmind
Para la encuesta de Julsmind a sus comercios, el caso SHALL convivir con el ticket de soporte que ya se abre (D-483): el caso SHALL mostrar el número del ticket.

#### Scenario: Comercio detractor
- **WHEN** un comercio responde 2 a la encuesta de Katuq
- **THEN** Julsmind ve un caso en Seguimiento con el número del ticket de soporte abierto
