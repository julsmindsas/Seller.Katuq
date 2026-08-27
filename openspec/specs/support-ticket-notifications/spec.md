# support-ticket-notifications Specification

## Purpose
TBD - created by archiving change seller-ticket-notifications. Update Purpose after archive.
## Requirements
### Requirement: Correo al crear un ticket
Al crear un ticket desde Seller Center, el sistema SHALL encolar un correo para el comercio (al correo del usuario que reporta) y un correo para cada miembro del equipo operativo configurado, con número visible del ticket, asunto, estado inicial y fecha.

#### Scenario: Creación exitosa encola correos
- **WHEN** un ticket se crea correctamente
- **THEN** la cola de correos contiene una entrada para el comercio y una por cada correo del equipo operativo, cada una con número visible, asunto, estado "Pendiente" y fecha, en estado de entrega "pendiente"

### Requirement: Sin correos duplicados ante reintentos
La escritura en la cola SHALL ser idempotente por evento y destinatario: reintentar la misma acción SHALL NOT crear entradas adicionales.

#### Scenario: Reintento de la misma creación
- **WHEN** la escritura de la cola se reintenta para el mismo ticket y destinatario
- **THEN** existe exactamente una entrada por destinatario para ese evento

### Requirement: El comercio solo recibe lo suyo
Los correos y notificaciones in-app dirigidos al comercio SHALL corresponder únicamente a tickets de su propia empresa.

#### Scenario: Empresas distintas
- **WHEN** un comercio A crea un ticket
- **THEN** ni la cola de correos ni el canal in-app de un comercio B contienen rastro del ticket de A

### Requirement: Registro de resultado de envío
Cada entrada de la cola SHALL registrar su estado de entrega (pendiente, enviado o fallido) y los intentos realizados, actualizables por el consumidor de la cola.

#### Scenario: Entrada recién encolada
- **WHEN** se encola un correo
- **THEN** su registro indica estado "pendiente" y cero intentos

### Requirement: Número consecutivo visible en la creación del Seller
La creación desde Seller Center SHALL reservar un número consecutivo numérico del contador compartido de tickets y SHALL mostrarlo en la confirmación y en Mis Tickets.

#### Scenario: Confirmación con número
- **WHEN** el ticket se crea correctamente
- **THEN** la confirmación muestra el número consecutivo (solo dígitos) y ese número aparece junto al ticket en Mis Tickets

#### Scenario: Contador no disponible
- **WHEN** no es posible reservar el consecutivo (p. ej. sin conexión con el contador)
- **THEN** el ticket se crea igualmente y se muestra su identificador técnico como respaldo

### Requirement: Notificación in-app tipada y accionable
Las notificaciones in-app de tickets en la campana del Seller SHALL identificar el ticket por su número visible, indicar el tipo de evento (creado, cambio de estado, asignado, respuesta, cerrado, reabierto) con ícono y severidad propios, y ofrecer navegación hacia Mis Tickets.

#### Scenario: Creación visible en la campana
- **WHEN** el comercio crea un ticket
- **THEN** la campana muestra una notificación de tipo "ticket creado" con el número visible y una acción que navega a Mis Tickets

#### Scenario: Cambio de estado hecho por soporte
- **WHEN** el equipo de soporte cambia el estado del ticket desde la app Support
- **THEN** la campana del comercio muestra el evento con el estado anterior y el nuevo, sin duplicados ante reintentos

### Requirement: Sin notificaciones ambiguas ni bloqueo
Los mensajes SHALL nombrar el ticket afectado, SHALL NOT bloquear la operación de la app, y un usuario sin tickets SHALL ver la campana vacía sin errores.

#### Scenario: Usuario sin tickets
- **WHEN** un comercio sin tickets abre la campana
- **THEN** ve el estado vacío normal, sin errores en consola ni toasts espurios

