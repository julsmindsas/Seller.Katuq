## ADDED Requirements

### Requirement: Opinar en cualquier momento
El sistema SHALL ofrecer a todo usuario con sesión en el Seller, sin importar su rol, una entrada "Opinar" visible desde cualquier pantalla interna. La entrada abre un formulario corto con:
- el tipo: "Una idea" o "Algo no funciona";
- el texto, obligatorio, de 10 a 2.000 caracteres.

#### Scenario: Vendedor deja una idea
- **WHEN** un usuario con rol Vendedor toca "Opinar", escoge "Una idea" y escribe su comentario
- **THEN** ve "Gracias, lo leemos todo" y vuelve a la pantalla donde estaba

#### Scenario: Texto vacío
- **WHEN** alguien intenta enviar sin texto
- **THEN** el formulario le dice qué falta y no envía

### Requirement: Opinar crea el mismo ticket que Soporte
Cada envío SHALL crear un ticket de soporte por el mismo camino que el formulario de Soporte, sin un registro aparte:
- "Una idea" SHALL quedar como idea, visible para el comercio en "Mis ideas" junto con las respuestas del equipo;
- "Algo no funciona" SHALL quedar como soporte, visible en "Mis tickets".

El ticket SHALL identificar que llegó por "Opinar" y llevar la empresa, el usuario y su correo, igual que un ticket de Soporte.

#### Scenario: Idea respondida
- **WHEN** un comercio envía una idea por "Opinar" y el equipo le responde en Support
- **THEN** el comercio ve la idea y la respuesta en "Mis ideas"

#### Scenario: Problema reportado
- **WHEN** un comercio envía "Algo no funciona"
- **THEN** el ticket aparece en el tablero del equipo con los avisos de siempre

### Requirement: La pantalla de origen se guarda sola
Cada envío SHALL registrar, sin pedírselo al usuario, la pantalla del Seller desde donde se escribió, de forma que el equipo la vea en el ticket.

#### Scenario: Comentario desde Inventario
- **WHEN** un usuario abre "Opinar" estando en Inventario por bodega
- **THEN** el ticket indica que se escribió desde Inventario por bodega

### Requirement: Soporte no cambia
El formulario de Soporte SHALL seguir creando tickets exactamente como hoy (campos, numeración, adjuntos y avisos) después de compartir su lógica con "Opinar".

#### Scenario: Ticket desde Soporte tras el cambio
- **WHEN** un comercio crea un ticket con adjuntos desde Soporte
- **THEN** el ticket queda con los mismos campos, número y avisos que antes del cambio
