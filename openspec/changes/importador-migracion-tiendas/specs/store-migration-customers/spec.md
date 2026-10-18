## ADDED Requirements

### Requirement: Un cliente no se duplica
THE system SHALL buscar a cada cliente del archivo por su celular y luego por su correo, solo dentro del mismo comercio, comparando el celular sin espacios, signos ni indicativo de país, y el correo en minúsculas. WHEN el cliente ya existe, THE system SHALL completar solo los datos que le falten, sin cambiar los que tiene. WHEN no existe, THE system SHALL crearlo sin documento de identidad y con el origen «migración».

#### Scenario: Mismo celular con otro formato
- **WHEN** el archivo trae `+57 300 123 4567` y el comercio ya tiene un cliente con `3001234567`
- **THEN** no se crea otro cliente y al existente solo se le agregan los datos que le faltaban

#### Scenario: Fila sin contacto
- **WHEN** una fila no trae ni correo ni celular
- **THEN** queda por fuera y el reporte dice la fila y el motivo

### Requirement: El consentimiento nunca se presume
THE system SHALL registrar la autorización para recibir correos de la tienda solo cuando el archivo dice que el cliente aceptó explícitamente y el administrador declara que ese consentimiento es real. La autorización SHALL guardar de dónde vino y la evidencia. Un cliente sin esa aceptación SHALL entrar sin autorización.

#### Scenario: Cliente que no aceptó
- **WHEN** una fila dice que el cliente no acepta correos de marketing
- **THEN** el cliente se importa y no queda autorizado para campañas

#### Scenario: Sin declaración del administrador
- **WHEN** el administrador no marca la declaración
- **THEN** los clientes se importan y no se crea ninguna autorización

### Requirement: Una baja o una supresión manda sobre el archivo
IF el correo ya está dado de baja en esa tienda, o suprimido en cualquier tienda por rebote o queja, THEN THE system SHALL NOT crear ni reactivar su autorización. La importación SHALL NOT reemplazar una autorización que ya exista.

#### Scenario: Correo suprimido en otra tienda
- **WHEN** el archivo autoriza un correo que rebotó en la tienda de otro comercio
- **THEN** no se crea la autorización y el reporte solo cuenta un suprimido, sin decir de qué tienda viene

#### Scenario: Correo dado de baja
- **WHEN** el archivo autoriza un correo que ya se había dado de baja en esa tienda
- **THEN** la baja se mantiene

### Requirement: Cada lote se puede deshacer
THE system SHALL importar los clientes en lotes de hasta 500 filas, identificables cada uno. WHEN el comercio deshace un lote, THE system SHALL borrar los clientes creados por ese lote y las autorizaciones creadas por ese lote que nadie haya tocado después. THE system SHALL conservar los clientes que ya existían, las bajas y las autorizaciones renovadas por el cliente.

#### Scenario: Deshacer después de una suscripción en la tienda
- **WHEN** se deshace un lote y uno de sus clientes ya se había vuelto a suscribir desde la tienda
- **THEN** se borran los demás y se conserva la autorización que ese cliente dio en la tienda

### Requirement: Datos personales fuera de los registros
THE system SHALL NOT escribir correos, teléfonos ni direcciones en los registros técnicos, en el rastro de la migración ni en el reporte.

#### Scenario: Revisión de registros
- **WHEN** se revisan los registros de una importación de 500 clientes
- **THEN** no aparece ningún correo, teléfono ni dirección
