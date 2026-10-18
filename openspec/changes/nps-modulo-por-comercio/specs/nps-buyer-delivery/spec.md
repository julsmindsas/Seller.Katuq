## ADDED Requirements

### Requirement: Encuesta después de la entrega
Cuando un pedido de una empresa con una encuesta activa "después de la entrega" pasa a Entregado, por cualquier vía (Katuq, mensajero o integración), el sistema SHALL programar el correo para los días configurados, a las 9:00 hora Colombia.

Al enviarlo, SHALL confirmar que el pedido sigue Entregado y que la encuesta sigue activa. Si no, SHALL cancelarlo sin enviar.

El proceso SHALL NOT escribir en el pedido, ni impedir o retrasar su cambio de estado si falla.

#### Scenario: Entregado el lunes, encuesta a 3 días
- **WHEN** un pedido queda Entregado el lunes
- **THEN** el comprador recibe el correo el jueves a las 9:00

#### Scenario: Encuesta pausada antes del envío
- **WHEN** el administrador pausa la encuesta antes de que salga un correo programado
- **THEN** ese correo no sale

### Requirement: A quién le llega
El sistema SHALL enviar solo si el pedido tiene el correo del comprador y el interruptor general de envío a compradores está encendido. SHALL NOT enviar más de una encuesta por pedido, ni más de una cada 30 días al mismo comprador de la misma empresa.

#### Scenario: Comprador frecuente
- **WHEN** un comprador recibe dos pedidos de la misma tienda en una semana
- **THEN** le llega una sola encuesta en esos 30 días

### Requirement: Responder desde el correo
El correo SHALL traer la pregunta NPS con las once notas como enlaces. Tocar una nota SHALL abrir una página pública, sin iniciar sesión, que:
- registra la nota;
- muestra la pregunta abierta y las adicionales;
- agradece.

Abrir el enlace sin que una persona cargue la página (por ejemplo, el antivirus del correo) SHALL NOT registrar respuesta. Los enlaces:
- SHALL ir firmados y vencer a los 30 días;
- SHALL NOT mostrar el pedido, la empresa interna ni datos del comprador;
- si están alterados o vencidos, SHALL rechazarse con un mensaje claro.

Mientras el enlace esté vigente, el comprador SHALL poder cambiar su nota; vale la última.

#### Scenario: Un clic
- **WHEN** el comprador toca el 4 en el correo
- **THEN** la nota 4 queda registrada y la página le pregunta qué es lo primero que deberían arreglar

### Requirement: Enlace y QR
Una encuesta "enlace y QR" SHALL tener una dirección pública fija y su QR para descargar. Quien la abra SHALL poder responder sin iniciar sesión, con correo o teléfono opcional para que lo contacten.

El sistema SHALL limitar las respuestas por visitante y marcar las respuestas con el canal "enlace", para distinguirlas de las de compradores verificados.

#### Scenario: QR en el mostrador
- **WHEN** un cliente escanea el QR del mostrador y responde 10
- **THEN** la respuesta entra al NPS de la empresa marcada como "enlace"

#### Scenario: Muchas respuestas desde el mismo visitante
- **WHEN** el mismo visitante intenta responder muchas veces seguidas
- **THEN** el sistema acepta solo las primeras dentro del límite

### Requirement: Un solo correo por pedido
Cuando la tienda también tiene activas las opiniones de producto, el comprador SHALL recibir un solo correo por pedido. La página de gracias SHALL invitarlo a calificar los productos.

#### Scenario: Pedido de la tienda con opiniones activas
- **WHEN** un pedido de la tienda con opiniones activas queda Entregado
- **THEN** el comprador recibe solo la encuesta y, al terminarla, ve el enlace para calificar los productos
