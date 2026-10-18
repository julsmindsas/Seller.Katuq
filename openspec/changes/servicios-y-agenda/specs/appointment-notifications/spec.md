## ADDED Requirements

### Requirement: Aviso de cita nueva desde la web
Cuando entra una cita desde la web, el sistema SHALL avisar dentro de Katuq y por correo:
- a la persona asignada, si tiene correo;
- si no la tiene, a los usuarios de la empresa con acceso a la Agenda.

Si el aviso falla, la cita SHALL quedar creada igual.

#### Scenario: Con persona asignada
- **WHEN** un visitante agenda con Ana, que tiene correo
- **THEN** Ana recibe el correo y la empresa ve el aviso dentro de Katuq

#### Scenario: Falla el correo
- **WHEN** el envío de correo falla
- **THEN** la cita existe, el aviso dentro de Katuq existe y el fallo queda registrado sin datos del cliente

### Requirement: Aviso de cambios
El sistema SHALL avisar a la persona asignada cuando una cita suya se crea, se mueve o se cancela desde la Agenda por alguien distinto a ella.

#### Scenario: Cita movida
- **WHEN** el administrador mueve una cita de Carlos a otra hora
- **THEN** Carlos recibe el aviso con la hora nueva

### Requirement: Un solo aviso por evento
El sistema SHALL enviar como máximo un aviso por evento y destinatario, aunque la solicitud se repita.

#### Scenario: Solicitud repetida
- **WHEN** la web reenvía la misma solicitud por un corte de red
- **THEN** sale un solo aviso

### Requirement: Sin mensajes automáticos al cliente en esta fase
El sistema SHALL NOT enviar mensajes automáticos al cliente final por WhatsApp o SMS en esta fase. SHALL mantener el botón "Confirmar por WhatsApp" de la web, que abre el mensaje ya escrito para que lo envíe el propio cliente.

#### Scenario: Confirmación en la web
- **WHEN** el visitante termina de agendar
- **THEN** ve la confirmación y el botón "Confirmar por WhatsApp", y Katuq no le envía nada por su cuenta
