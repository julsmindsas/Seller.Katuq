## ADDED Requirements

### Requirement: Qué vende la empresa
El sistema SHALL guardar en la empresa si vende productos, servicios o ambos. El valor SHALL salir de la respuesta del onboarding y SHALL poder cambiarse en la configuración de la empresa. Una empresa sin respuesta SHALL tratarse como "productos".

#### Scenario: Registro de una empresa de servicios
- **WHEN** una empresa nueva responde "Servicios" en el onboarding
- **THEN** la empresa queda como "servicios", su primer ítem se crea como servicio y la Agenda queda encendida

#### Scenario: Empresa existente
- **WHEN** una empresa registrada antes de este cambio entra a Katuq
- **THEN** su menú y sus flujos siguen iguales

### Requirement: La Agenda se enciende por empresa
El sistema SHALL mostrar la Agenda en el menú, sus pantallas y la configuración solo a las empresas que la tengan encendida, y solo a los roles que tengan la Agenda entre sus menús. Una empresa que vende servicios o ambos SHALL nacer con la Agenda encendida. Para el resto, SHALL encenderse por empresa.

#### Scenario: Agenda apagada
- **WHEN** una empresa con la Agenda apagada abre la ruta de la Agenda
- **THEN** no ve la pantalla y el servidor rechaza sus consultas de citas

### Requirement: Horario y personas que atienden
El sistema SHALL permitir configurar:
- el horario de atención por día de la semana;
- el modo de agenda: por hora o por franjas con cupo;
- las personas que atienden, con nombre, correo opcional, usuario de Katuq opcional y los servicios que presta cada una.

Desactivar a una persona SHALL NOT borrar ni reasignar sus citas.

#### Scenario: Persona sin usuario
- **WHEN** el comercio agrega a una estilista que no usa Katuq
- **THEN** ella aparece como columna en la Agenda y se le pueden asignar citas

#### Scenario: Persona desactivada
- **WHEN** se desactiva a una persona con citas futuras
- **THEN** sus citas se conservan y la Agenda las marca para reasignar

### Requirement: La web usa el mismo horario
Cuando la Agenda está encendida, el bloque "Agenda de visitas" de la web SHALL ofrecer la disponibilidad de la Agenda. Si está apagada, SHALL seguir con su configuración propia como hoy.

#### Scenario: Bloque con Agenda apagada
- **WHEN** un sitio publicado antes de este cambio tiene el bloque de agenda y la empresa no ha encendido la Agenda
- **THEN** el bloque funciona exactamente como hoy

### Requirement: Se retira la demo de agendamiento
El sistema SHALL quitar del menú la entrada "Agendamiento" ("Solicitar servicio" y "Ver citas agendadas") y SHALL dejar de servir la ruta pública de la demo. El enlace "agendar" del video-agent SHALL desaparecer, sin otros cambios en el video-agent.

#### Scenario: Enlace viejo
- **WHEN** alguien abre la ruta vieja de agendamiento
- **THEN** llega a la Agenda si tiene acceso, o a la página de inicio si no
