# Spec — support-ticket-creation

## ADDED Requirements

### Requirement: Identidad de empresa canónica en el flujo de soporte
El flujo de soporte (crear ticket y listar Mis Tickets) SHALL resolver la empresa activa desde la fuente canónica de sesión de la aplicación, y SHALL bloquear el envío con un mensaje claro cuando no exista empresa activa resuelta.

#### Scenario: Sesión nueva en una pestaña recién abierta
- **WHEN** un usuario autenticado abre `/soporte` en una pestaña nueva y crea un ticket válido
- **THEN** el ticket queda asociado al nombre comercial y NIT reales de su empresa (nunca `undefined`)

#### Scenario: Sin empresa activa
- **WHEN** no es posible resolver la empresa activa al intentar enviar el formulario
- **THEN** el envío se bloquea y se informa al usuario que debe volver a iniciar sesión, sin crear ticket

### Requirement: Payload mínimo trazable
El ticket creado SHALL incluir como identidad del comercio únicamente los datos mínimos trazables: nombre comercial, NIT y el correo del usuario que reporta. El sistema SHALL NOT enviar el objeto completo de configuración de la empresa al API de soporte.

#### Scenario: Creación válida
- **WHEN** se envía un ticket válido
- **THEN** el payload contiene `tienda` y `company` con el nombre comercial (texto), `nit` con el NIT de la empresa, y el correo del usuario que reporta; y no contiene la configuración completa de la empresa

### Requirement: Validación visible de campos obligatorios
El formulario SHALL impedir el envío con campos obligatorios vacíos y SHALL mostrar en cada campo inválido un mensaje visible cuando el usuario intente enviar o toque el campo.

#### Scenario: Intento de envío con campos vacíos
- **WHEN** el usuario intenta enviar con el asunto vacío
- **THEN** no se crea ticket y el campo asunto muestra su error de forma visible

### Requirement: Confirmación con número y estado inicial
Tras una creación exitosa, el sistema SHALL mostrar al usuario el número del ticket recibido del backend y su estado inicial, y SHALL navegar a Mis Tickets solo después de que el usuario cierre la confirmación.

#### Scenario: Creación exitosa
- **WHEN** el backend confirma la creación del ticket
- **THEN** el usuario ve el número del ticket y el estado "Pendiente", y al cerrar la confirmación llega a Mis Tickets donde el ticket recién creado aparece de primero

### Requirement: Un envío válido crea exactamente un ticket
El sistema SHALL prevenir envíos duplicados por doble clic o reintento durante un envío en curso.

#### Scenario: Doble clic en enviar
- **WHEN** el usuario hace clic dos veces seguidas en "Crear Ticket"
- **THEN** se crea exactamente un ticket

### Requirement: Manejo de error de red con reintento seguro
Ante un fallo de red o del backend, el sistema SHALL conservar los datos ingresados, SHALL informar el fallo al usuario y SHALL permitir reintentar el envío.

#### Scenario: Fallo de red al enviar
- **WHEN** la petición de creación falla
- **THEN** el formulario conserva todos los datos, se muestra el error y el botón de envío queda disponible para reintentar

### Requirement: Notificación in-app al crear
Al crear un ticket, el sistema SHALL registrar una notificación para el equipo de soporte con el identificador del ticket, y una notificación en el canal propio del comercio para que la campana del Seller Center la muestre.

#### Scenario: Notificaciones tras crear
- **WHEN** el backend confirma la creación
- **THEN** existe una notificación de equipo cuyo `ticketId` es el identificador del ticket (no un objeto), y una notificación en el canal del comercio correspondiente a su nombre comercial

### Requirement: Visibilidad del ticket en Mis Tickets
Mis Tickets SHALL listar los tickets cuya tienda coincide con la empresa activa resuelta desde la fuente canónica, y SHALL mostrar los del comercio aunque la pestaña sea nueva.

#### Scenario: Listado en sesión nueva
- **WHEN** el usuario abre Mis Tickets en una pestaña nueva
- **THEN** ve los tickets de su comercio (excluyendo archivados) ordenados del más reciente al más antiguo
