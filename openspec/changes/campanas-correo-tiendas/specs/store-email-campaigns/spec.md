## ADDED Requirements

### Requirement: Audiencia por segmentos de la tienda
El comercio SHALL poder elegir la audiencia de una campaña entre segmentos de su tienda: todos los suscritos; compraron alguna vez o en los últimos N días; no compran hace más de N días; compraron un producto o una categoría; dejaron carrito sin comprar; pidieron aviso de un producto. El segmento SHALL evaluarse al momento de enviar, y el comercio SHALL ver cuántos destinatarios tiene antes de enviar.

#### Scenario: Conteo previo
- **WHEN** el comercio elige "no compran hace más de 60 días"
- **THEN** ve cuántos suscritos cumplen hoy, sin enviar nada

#### Scenario: Aislamiento por empresa
- **WHEN** el comercio A arma una audiencia
- **THEN** solo aparecen contactos de la empresa A

### Requirement: Contenido por bloques con pie obligatorio
El comercio SHALL armar el correo con bloques (encabezado con logo, título, texto, imagen, botón, productos del catálogo, cupón de la tienda, separador) y el color de su tienda. Los productos SHALL mostrar foto, nombre, precio vigente y promoción vigente de la tienda al momento de enviar. El pie SHALL ser obligatorio y no editable en lo esencial: nombre del comercio, forma de contacto, por qué le llega el correo y enlace de baja. Todo lo que escribe el comercio SHALL mostrarse como texto, nunca como código.

#### Scenario: Producto sin existencias o despublicado
- **WHEN** un producto del correo deja de estar publicado antes del envío
- **THEN** el comercio es avisado antes de enviar y el bloque no sale roto

#### Scenario: Intento de quitar el pie
- **WHEN** el comercio intenta enviar sin el enlace de baja
- **THEN** el envío no es posible

### Requirement: Vista previa y envío de prueba
Antes de enviar, el comercio SHALL poder ver el correo como en celular y en computador, y enviarse una prueba a su propio correo, con un límite de pruebas por minuto.

#### Scenario: Prueba
- **WHEN** el comercio pide una prueba
- **THEN** le llega a su correo con un aviso visible de "prueba" y no cuenta en las métricas

### Requirement: Envío inmediato o programado dentro del horario de contacto
El comercio SHALL poder enviar ahora o programar. Los envíos SHALL ocurrir solo dentro del horario permitido para contactos comerciales (lunes a viernes de 7:00 a. m. a 7:00 p. m., sábados de 8:00 a. m. a 3:00 p. m., hora de Colombia, sin domingos ni festivos). Una campaña que no alcance a salir dentro del horario SHALL continuar en el siguiente horario permitido. El comercio SHALL poder cancelar una campaña programada y pausar una en curso.

#### Scenario: Programada para un domingo
- **WHEN** el comercio elige un domingo
- **THEN** la herramienta no lo permite y le propone el siguiente horario válido

#### Scenario: Pausa en curso
- **WHEN** el comercio pausa una campaña a medio enviar
- **THEN** no sale ningún correo más hasta que la reanude, y quienes ya la recibieron no la reciben de nuevo

### Requirement: Un correo por destinatario y campaña
Cada destinatario SHALL recibir cada campaña a lo sumo una vez, aunque aparezca en varias fuentes (pedido, cuenta, prospecto) o haya reintentos.

#### Scenario: Mismo correo en dos fuentes
- **WHEN** una dirección está como comprador y como suscrito del boletín
- **THEN** recibe la campaña una sola vez

### Requirement: Métricas y ventas atribuidas
Cada campaña SHALL mostrar enviados, entregados, rebotes, aperturas (señaladas como aproximadas), clics, bajas, quejas y pedidos y ventas atribuidos. Un pedido SHALL atribuirse a una campaña cuando llega por un enlace de esa campaña, o cuando lo hace el mismo destinatario dentro de los 7 días siguientes a su clic. El historial de campañas SHALL mostrar juntas las de WhatsApp y las de correo.

#### Scenario: Compra desde el correo
- **WHEN** un destinatario hace clic en un producto del correo y compra
- **THEN** la campaña suma ese pedido y su valor en ventas atribuidas

### Requirement: Cupo y permisos
Solo los usuarios con acceso al módulo Marketing de la empresa SHALL crear o enviar campañas. Cada empresa SHALL tener un cupo mensual de correos de campaña según su plan, visible antes de enviar. Una campaña que supere el cupo restante SHALL NOT enviarse parcialmente sin que el comercio lo acepte.

#### Scenario: Cupo insuficiente
- **WHEN** la audiencia supera el cupo restante
- **THEN** el comercio ve cuántos alcanzan a salir y decide si envía hasta ese número o espera

### Requirement: Texto sugerido por Opttia
El comercio SHALL poder pedir a Opttia un asunto y un texto a partir de una idea y de los productos elegidos. El texto sugerido SHALL quedar editable y SHALL NOT enviarse sin que el comercio lo revise.

#### Scenario: Sugerencia
- **WHEN** el comercio escribe "promo de amor y amistad para los ramos"
- **THEN** recibe un asunto y un texto editables, en español y en el tono de la tienda
