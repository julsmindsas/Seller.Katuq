# Guías de conexión de Katuq desde las IA

## Requirement: Descubrimiento sin estado de conexión ficticio

WHEN el usuario consulta Integraciones, THE system SHALL mostrar una tarjeta por cliente aprobado (inicialmente ChatGPT, Claude y Codex), identificada como «Desde tu IA» y con la acción «Ver instructivo».

### Scenario: Consultar una guía
- **WHEN** el usuario abre una tarjeta de IA
- **THEN** ve sus instrucciones, sin formulario de credenciales ni creación de una conexión.

### Scenario: Contadores y filtros
- **WHEN** se muestran o buscan las tarjetas de IA
- **THEN** no aumentan los totales «Conectadas», «Para conectar» ni «Próximamente» y no aparecen como conexiones comprobadas en «Mis conexiones».

## Requirement: Instrucciones vigentes y completas

WHEN el usuario abre el instructivo de una IA, THE system SHALL explicar dónde se agrega Katuq en ese cliente, qué dirección pública usar, cómo autorizar con su cuenta propia y cómo comprobarlo con una pregunta de lectura. THE system SHALL incluir requisitos de acceso, enlace a la fuente oficial y fecha de revisión.

### Scenario: Copiar la dirección
- **WHEN** el usuario necesita la dirección del servidor
- **THEN** puede copiarla desde el instructivo; si el navegador impide la copia automática, puede seleccionarla y copiarla manualmente.

### Scenario: Permisos o acceso insuficientes
- **WHEN** la cuenta de la IA no permite añadir conexiones o el usuario carece del permiso requerido en Katuq
- **THEN** la guía explica cómo reconocer la limitación, sin prometer acceso ni recomendar eludir permisos.

## Requirement: Accesibilidad y aislamiento

THE system SHALL permitir abrir, leer y cerrar la guía con teclado y en pantallas de 390 y 1440 px sin texto oculto ni desplazamiento horizontal. THE system SHALL conservar el aislamiento y los permisos existentes y SHALL NOT solicitar secretos ni ejecutar acciones de negocio como parte del instructivo.
