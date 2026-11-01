# Numeración de tickets de soporte

## Requirement: Número único entre canales

WHEN se crea un ticket desde Seller, Support, MCP o NPS, THE system SHALL asignarle un número visible que no pertenezca a otro ticket.

### Scenario: Creación simultánea
- **WHEN** varios canales crean tickets simultáneamente
- **THEN** cada ticket recibe un número diferente y conserva su identificador técnico propio.

### Scenario: Cliente anterior
- **WHEN** un cliente anterior envía un número ya usado o reserva uno por su mecanismo anterior
- **THEN** el ticket nuevo no introduce un número repetido.

## Requirement: Confirmación coherente

WHEN se confirma la creación, THE system SHALL mostrar el número realmente guardado en la confirmación, la lista y los avisos que se emitan sobre ese ticket.

### Scenario: Número recibido distinto del guardado
- **WHEN** el número propuesto por un cliente difiere del asignado al ticket
- **THEN** la confirmación y los avisos muestran el asignado.

## Requirement: Integridad histórica y aislamiento

THE system SHALL conservar el número, el identificador, el contenido y los enlaces de los tickets históricos. THE system SHALL mantener los controles vigentes de acceso por comercio y SHALL NOT modificar pedidos, facturas, inventario ni sus consecutivos.

### Scenario: Repetición histórica
- **GIVEN** dos tickets históricos con el mismo número visible
- **WHEN** se publica la corrección
- **THEN** ambos conservan sus datos y enlaces y pueden distinguirse por su identificador técnico.

## Requisitos no funcionales

- La garantía de unicidad se mantiene ante concurrencia; no depende del orden de llegada de los clientes.
- Un fallo al asignar el número no se presenta como una creación exitosa.
- Los avisos conservan los destinatarios y el aislamiento actuales; las validaciones no envían comunicaciones reales de prueba.
