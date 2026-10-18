## ADDED Requirements

### Requirement: Qué es una cita
El sistema SHALL guardar cada cita con:
- empresa, cliente (nombre, teléfono y correo opcional) y servicios;
- fecha y hora de inicio y fin, o fecha y franja;
- quién atiende (opcional) y dónde se presta (local, domicilio con dirección, o virtual);
- estado, origen, pedido ligado (opcional), notas e historial.

Cada empresa SHALL ver y tocar solo sus citas.

#### Scenario: Otra empresa
- **WHEN** un usuario consulta una cita de otra empresa
- **THEN** el sistema responde que no existe

### Requirement: Estados de la cita
El sistema SHALL manejar los estados Solicitada, Confirmada, Atendida, Cancelada y No asistió. Cada cambio SHALL quedar en el historial con quién, cuándo y el estado anterior. Atendida, Cancelada y No asistió SHALL ser finales, salvo reabrir una cancelada como Confirmada.

#### Scenario: Cita desde la web
- **WHEN** un visitante agenda desde la web
- **THEN** la cita nace Solicitada hasta que el comercio la confirme

#### Scenario: Cita creada por el comercio
- **WHEN** el comercio crea la cita desde la Agenda
- **THEN** la cita nace Confirmada

### Requirement: Disponibilidad
El sistema SHALL ofrecer solo horas que cumplan todo esto:
- están dentro del horario de atención;
- no han pasado;
- caben completas en la duración de los servicios;
- la persona que atiende está libre y presta esos servicios.

En el modo por franjas, SHALL ofrecer una franja mientras tenga cupo. Las citas Canceladas y No asistió SHALL liberar su espacio.

#### Scenario: Persona ocupada
- **WHEN** Ana tiene una cita de 10:00 a 10:45
- **THEN** a Ana no se le ofrece las 10:30, pero a Carlos sí

#### Scenario: Cualquiera disponible
- **WHEN** el cliente no elige quién lo atiende
- **THEN** se ofrece la hora si al menos una persona que presta el servicio está libre

### Requirement: Sin doble reserva
El sistema SHALL garantizar que dos reservas simultáneas no ocupen el mismo espacio. La que llega segunda SHALL recibir "Esa hora se acaba de ocupar, elige otra" y ningún dato queda a medias. Repetir la misma solicitud (mismo identificador) SHALL devolver la cita ya creada.

#### Scenario: Dos personas, la misma hora
- **WHEN** dos visitantes reservan la última franja libre al mismo tiempo
- **THEN** solo uno obtiene la cita y el otro ve el mensaje para elegir otra hora

### Requirement: Pantalla Agenda
El sistema SHALL mostrar la Agenda por día y por semana, con una columna por persona que atiende y una columna "Sin asignar". Desde ahí SHALL permitir:
- crear una cita con cliente, servicio y hora;
- moverla de hora o de persona, revalidando la disponibilidad;
- confirmarla, cancelarla o marcarla como no asistió;
- abrir la ficha del cliente.

#### Scenario: Crear en tres datos
- **WHEN** el comercio toca un espacio libre, elige el cliente y el servicio
- **THEN** la cita queda creada para esa hora y esa persona

#### Scenario: Sin citas
- **WHEN** el día no tiene citas
- **THEN** se ve un estado vacío con un botón "Agendar"

### Requirement: Cobrar la cita
Desde una cita, el sistema SHALL permitir "Cobrar", que abre la venta con el cliente y los servicios ya cargados. Al crearse el pedido, la cita SHALL quedar Atendida y ligada al pedido. Si la cita ya tiene pedido, "Atendida" SHALL NOT generar otro cobro.

#### Scenario: Cobrar después de atender
- **WHEN** el comercio cobra una cita confirmada
- **THEN** se crea un pedido solo de servicios y la cita queda Atendida con ese pedido

#### Scenario: Ya estaba pagada
- **WHEN** la cita nació de un pedido pagado
- **THEN** marcarla Atendida no abre la venta

### Requirement: Orígenes de la cita
El sistema SHALL crear citas desde:
- la Agenda;
- la venta asistida, cuando una línea es un servicio que requiere cita: la línea pide fecha, hora y persona en lugar de los datos de entrega, y la cita queda ligada al pedido;
- la ficha del cliente en el CRM;
- la web: el bloque "Agenda de visitas" y la ficha de un servicio que requiere cita, con el botón "Agendar".

La web SHALL seguir creando el prospecto en el CRM como hoy y SHALL NOT revelar cuántos cupos quedan.

#### Scenario: Agenda de la web
- **WHEN** un visitante agenda desde el bloque de la web
- **THEN** se crea la cita Solicitada y el prospecto del CRM, como hoy

#### Scenario: Venta con instalación
- **WHEN** el vendedor vende un aire acondicionado con instalación que requiere cita
- **THEN** la línea de instalación pide fecha y hora, y la cita queda ligada al pedido

### Requirement: Opttia consulta la agenda
El sistema SHALL ofrecer a Opttia, en solo lectura y limitado a la empresa de la sesión, las citas de un rango de fechas, con estado, servicio y quién atiende.

#### Scenario: Pregunta por la agenda
- **WHEN** el comercio le pregunta a Opttia "¿qué citas tengo mañana?"
- **THEN** Opttia responde con las citas de mañana de esa empresa

### Requirement: Datos personales
El sistema SHALL NOT escribir en los registros técnicos el nombre, el teléfono, el correo, la dirección ni las notas del cliente. Para seguimiento SHALL usar los identificadores de la cita y de la empresa.

#### Scenario: Error al agendar
- **WHEN** falla una reserva
- **THEN** el registro técnico tiene el id de empresa y el motivo, sin datos del cliente
