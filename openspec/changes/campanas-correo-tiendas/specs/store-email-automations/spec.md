## ADDED Requirements

### Requirement: "Volvió" — aviso de existencias pedido por el comprador
Cuando un producto que alguien pidió con "Avísame cuando llegue" vuelva a tener existencias disponibles para la tienda, el sistema SHALL avisarle una sola vez por correo, con foto, precio vigente y enlace al producto. Como lo pidió el propio comprador, este aviso SHALL NOT exigir autorización de publicidad, pero SHALL respetar las supresiones por rebote o queja e incluir el enlace para dejar de recibir avisos. El comercio SHALL poder apagarlo.

#### Scenario: Producto repuesto
- **WHEN** un producto pedido por 12 personas vuelve a tener existencias
- **THEN** las 12 reciben un aviso, una sola vez cada una, y quedan marcadas como avisadas

#### Scenario: Producto que entra y sale
- **WHEN** el producto se agota y vuelve a entrar después de avisar
- **THEN** no se repite el aviso a quien ya fue avisado

#### Scenario: Lectura sin escritura del inventario
- **WHEN** el sistema revisa existencias para "Volvió"
- **THEN** solo lee, y el producto, sus variantes, sus precios y el inventario quedan sin cambios

### Requirement: "Te extrañamos"
El comercio SHALL poder encender un correo automático para suscritos que no compran hace N días (N elegido por el comercio, mínimo 30), con su propio texto y un cupón opcional de la tienda. Cada persona SHALL recibirlo a lo sumo una vez cada 90 días.

#### Scenario: Cliente dormido
- **WHEN** un suscrito cumple N días sin comprar
- **THEN** recibe el correo en el siguiente horario permitido y no lo vuelve a recibir en 90 días

#### Scenario: Cliente que compró ayer
- **WHEN** un suscrito compró dentro de los N días
- **THEN** no recibe el correo

### Requirement: "Bienvenida"
El comercio SHALL poder encender un correo de bienvenida que sale cuando alguien se suscribe, con su propio texto y un cupón opcional. SHALL salir una sola vez por persona y tienda.

#### Scenario: Nuevo suscrito
- **WHEN** alguien se suscribe al boletín de la tienda
- **THEN** recibe la bienvenida una sola vez, dentro del horario permitido

### Requirement: Mismas reglas que las campañas
Los correos automáticos SHALL cumplir el horario permitido, las supresiones, los cupos, la pausa automática, el pie obligatorio y la baja de un clic de las campañas. Sus métricas y ventas atribuidas SHALL verse por automatización.

#### Scenario: Cupo agotado
- **WHEN** la empresa agotó su cupo mensual
- **THEN** las automatizaciones esperan al nuevo periodo sin perder a nadie, y el comercio ve el aviso
