# Canales de atención previstos

## Requirement: Visibilidad consistente

WHEN un usuario consulta las opciones de atención en Integraciones o el menú Mensajes al que ya tiene acceso, THE system SHALL mostrar TikTok, Correo y Llamadas con el estado visible «Próximamente».

### Scenario: Integraciones
- **WHEN** se muestra «¿Cómo atiendes a tus clientes?»
- **THEN** los tres canales previstos aparecen junto a los actuales y TikTok Shop conserva su tarjeta de ventas independiente.

### Scenario: Menú con permisos
- **WHEN** el usuario tiene acceso al menú Mensajes
- **THEN** ve los tres canales previstos sin perder las entradas de canales actuales que tiene autorizadas.
- **WHEN** el usuario no tiene acceso al menú Mensajes
- **THEN** las entradas informativas no le conceden acceso al módulo.

## Requirement: Estado informativo sin activación

WHILE un canal está marcado «Próximamente», THE system SHALL impedir su activación y SHALL NOT abrir una bandeja, solicitar credenciales, guardar configuración o iniciar comunicaciones al tocarlo o usar el teclado.

### Scenario: Intentar abrir un canal previsto
- **WHEN** el usuario interactúa con TikTok, Correo o Llamadas
- **THEN** no se navega a una ruta vacía ni se ejecuta una operación.

## Requirement: Accesibilidad y regresión

THE system SHALL mostrar los nombres y estados legibles a 390 y 1440 px y exponer su carácter informativo a tecnologías de asistencia. THE system SHALL conservar las rutas, permisos, conexiones y acciones actuales de WhatsApp, Instagram y Facebook.
