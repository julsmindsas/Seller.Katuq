## ADDED Requirements

### Requirement: Encuesta tres días después de la entrega
Cuando un pedido de un comercio con la encuesta encendida pasa a Entregado, por cualquier vía (en Katuq, por el mensajero o por una integración), el sistema SHALL programar una encuesta para el comprador tres días después, a las 9:00 hora Colombia.

Al enviarla, el sistema SHALL confirmar que el pedido sigue Entregado. Si ya no lo está, SHALL cancelarla sin enviar.

El proceso de la encuesta SHALL NOT escribir en el pedido, ni impedir o retrasar su cambio de estado si falla.

#### Scenario: Entregado marcado en Katuq
- **WHEN** el comercio marca un pedido como Entregado el lunes
- **THEN** el comprador recibe la encuesta el jueves a las 9:00

#### Scenario: Pedido devuelto antes del envío
- **WHEN** el pedido deja de estar Entregado antes de que salga la encuesta
- **THEN** la encuesta se cancela

#### Scenario: Falla al programar
- **WHEN** programar la encuesta falla
- **THEN** el pedido queda Entregado igual y el fallo queda registrado

### Requirement: A quién le llega
El sistema SHALL enviar la encuesta solo si:
- el comercio tiene encendida la preferencia "Encuesta de satisfacción" (apagada por defecto);
- el interruptor general está encendido;
- el pedido tiene correo del comprador.

El sistema SHALL NOT enviar más de una encuesta por pedido, ni más de una cada 30 días al mismo comprador del mismo comercio.

#### Scenario: Comprador frecuente
- **WHEN** un comprador recibe dos pedidos del mismo comercio en una semana
- **THEN** recibe una sola encuesta en esos 30 días

### Requirement: Responder con un clic desde el correo
El correo SHALL traer la pregunta "Del 0 al 10, ¿qué tan probable es que le recomiendes a {comercio} a un amigo?" con las once notas como enlaces.

Tocar una nota SHALL abrir una página pública, sin iniciar sesión, que:
- registra la nota;
- agradece;
- pide un comentario opcional.

Abrir el enlace sin que una persona cargue la página (por ejemplo, el antivirus del correo) SHALL NOT registrar respuesta.

Los enlaces:
- SHALL ir firmados y vencer a los 30 días;
- SHALL NOT mostrar el pedido, la empresa ni datos del comprador;
- si están vencidos o alterados, SHALL rechazarse.

El comprador SHALL poder cambiar su nota mientras el enlace esté vigente. Se conserva la última.

#### Scenario: Un clic
- **WHEN** el comprador toca el 9 en el correo
- **THEN** la nota 9 queda registrada y ve la página de gracias con el campo para comentar

#### Scenario: Enlace alterado
- **WHEN** alguien cambia el enlace
- **THEN** la página dice que el enlace no es válido y no registra nada

### Requirement: Un solo correo por pedido
Cuando el comercio tiene encendidas la encuesta y las opiniones de producto de su tienda, el comprador SHALL recibir un solo correo por pedido. La página de gracias de la encuesta SHALL invitarlo a calificar los productos del pedido.

#### Scenario: Pedido de la tienda con opiniones activas
- **WHEN** un pedido de la tienda con opiniones activas queda Entregado
- **THEN** el comprador recibe solo la encuesta y, al responderla, ve el enlace para calificar los productos

### Requirement: Seguimiento del comercio
En la pantalla "Satisfacción de clientes", cada detractor SHALL mostrar el pedido, el comentario y el contacto del comprador. El comercio SHALL poder crear desde ahí un seguimiento en su CRM, con el comprador y el comentario ya cargados.

#### Scenario: Llamar a un detractor
- **WHEN** el administrador del comercio toca "Crear seguimiento" en un detractor
- **THEN** queda una tarea en su CRM con el comprador, el pedido y el comentario

### Requirement: Satisfacción global sin valores inventados
El indicador "satisfacción global" de los KPIs del comercio SHALL entregar el NPS real de sus compradores de los últimos 90 días, calculado igual que en la pantalla, o vacío. SHALL NOT entregar un valor por defecto.

#### Scenario: Comercio sin encuestas
- **WHEN** se piden los KPIs de un comercio que nunca encendió la encuesta
- **THEN** la satisfacción global llega vacía, no 4,5
