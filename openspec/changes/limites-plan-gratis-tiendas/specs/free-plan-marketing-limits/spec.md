## ADDED Requirements

### Requirement: Sin recordatorio de carrito abandonado ni reseñas en el plan gratis
En el plan gratis, la tienda SHALL seguir registrando los carritos abandonados (el comercio los ve en sus contactos) pero SHALL NOT enviar el recordatorio. Tampoco SHALL pedir ni mostrar reseñas. El recordatorio de pago abandonado SHALL seguir funcionando.

#### Scenario: Carrito abandonado en tienda gratis
- **WHEN** alguien deja el carrito en una tienda gratis
- **THEN** aparece en "Tus contactos" marcado como carrito, no se le envía correo y el comercio ve que el recordatorio es del plan de pago

### Requirement: Correos estándar y campañas acotadas
En el plan gratis, los correos al comprador SHALL salir con el texto estándar aunque haya personalización guardada. Las campañas de correo SHALL limitarse a una campaña al mes de hasta 200 personas, y el remarketing automático solo a "Volvió".

#### Scenario: Segunda campaña del mes
- **WHEN** una empresa gratis que ya envió una campaña este mes intenta programar otra
- **THEN** no se programa y ve que el plan de pago permite más

### Requirement: Sin catálogo para pauta ni conversiones para anuncios
En el plan gratis, el catálogo de productos para Google y Meta SHALL NOT publicarse, y la tienda SHALL emitir solo la medición básica (Analytics y píxel), sin las conversiones para anuncios.

#### Scenario: Pedir el catálogo de una tienda gratis
- **WHEN** Google o Meta piden el catálogo de una tienda gratis
- **THEN** la respuesta dice que no está disponible y no expone productos

### Requirement: Métricas del día y Opttia con cupo
En el plan gratis, las métricas de la tienda SHALL mostrar solo el día en curso, y Opttia SHALL crear o rediseñar a lo sumo 3 páginas al mes.

#### Scenario: Cuarta generación del mes
- **WHEN** una empresa gratis pide a Opttia su cuarta página del mes
- **THEN** no se genera y ve cuándo se renueva el cupo o cómo mejorar el plan
