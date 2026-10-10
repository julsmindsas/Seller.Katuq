## Purpose

Que las pantallas públicas de Seller Center (sin sesión o de paso: entrar, recuperar o cambiar la contraseña, textos legales, resultado de pagos y página no encontrada) se vean y se lean como "Regístrese", sin cambiar lo que hacen.

## ADDED Requirements

### Requirement: Base visual común
Toda pantalla pública SHALL mostrar arriba el logo de Katuq y usar los colores, letras, campos y botones del registro (tema canónico, plano, sin gradientes), y SHALL verse completa sin desplazamiento horizontal a 390 px y a 1440 px.

#### Scenario: Logo visible
- **WHEN** alguien abre cualquier pantalla pública
- **THEN** ve el logo de Katuq dibujado (nunca un texto alternativo de imagen rota)

#### Scenario: Celular
- **WHEN** la pantalla mide 390 px de ancho
- **THEN** el contenido cabe a lo ancho, con márgenes laterales de al menos 16 px

### Requirement: Textos en español
Las pantallas públicas SHALL mostrar todos sus textos, ejemplos y botones en español.

#### Scenario: Mostrar la contraseña
- **WHEN** un campo de contraseña ofrece verla
- **THEN** el control dice "Mostrar" u "Ocultar"

### Requirement: Mismo comportamiento
Al cambiar la presentación, cada pantalla SHALL conservar sus campos, validaciones, llamadas al servidor, mensajes de resultado y redirecciones.

#### Scenario: Entrar
- **WHEN** alguien escribe su correo y contraseña válidos y pulsa "Ingresar"
- **THEN** entra a la misma pantalla de inicio que antes del cambio

#### Scenario: Recuperar la contraseña
- **WHEN** alguien pide recuperar la contraseña con su correo
- **THEN** el servidor recibe la misma solicitud y la pantalla avisa que se enviaron las instrucciones

#### Scenario: Cambio obligatorio
- **WHEN** un usuario con contraseña estándar entra
- **THEN** ve el cambio de contraseña con la opción "Cambiar más tarde"

### Requirement: Términos y condiciones visibles
La pantalla de términos y condiciones SHALL mostrar el documento vigente y SHALL ofrecer descargarlo.

#### Scenario: Abrir términos
- **WHEN** alguien abre /terms-conditions
- **THEN** ve el documento de términos (no una página de error) y un botón para descargarlo

### Requirement: Páginas de la plantilla retiradas
Las rutas de demostración de la plantilla y el duplicado de recuperar contraseña SHALL llevar a la pantalla real equivalente.

#### Scenario: Ruta vieja de recuperar
- **WHEN** alguien abre /authentication/forget-password
- **THEN** llega a /authentication/forgot-password

#### Scenario: Demostración de login o desbloqueo
- **WHEN** alguien abre /authentication/login/simple o /authentication/unlock-user
- **THEN** llega a /login

### Requirement: Resultados de pago claros
Las pantallas de resultado del pago y de la suscripción SHALL mostrar el estado (aprobado, pendiente o con error) con color semántico en par fuerte/fondo suave, el mensaje y las acciones de siempre.

#### Scenario: Pago sin identificador
- **WHEN** se abre el resultado del pago sin identificador de transacción
- **THEN** se ve el estado de error, el mensaje y las acciones de contactar por WhatsApp y volver al inicio, sin recuadros vacíos
