## ADDED Requirements

### Requirement: Autorización expresa para publicidad
La tienda SHALL ofrecer al comprador una casilla **desmarcada por defecto** para autorizar correos de novedades y ofertas de esa tienda en el checkout, el formulario de contacto y la cuenta del comprador. Suscribirse al bloque "Boletín" SHALL contar como autorización, siempre que el bloque muestre el texto de lo que se autoriza. Ningún otro dato (haber comprado, haber dejado carrito, haber pedido un aviso) SHALL contar como autorización.

#### Scenario: Compra sin marcar la casilla
- **WHEN** un comprador confirma un pedido sin marcar la casilla
- **THEN** el pedido se crea igual y el comprador no queda autorizado para publicidad

#### Scenario: Compra marcando la casilla
- **WHEN** un comprador confirma un pedido con la casilla marcada
- **THEN** el pedido se crea igual y el comprador queda autorizado para publicidad de ESA tienda

#### Scenario: La casilla nunca frena el pedido
- **WHEN** falla el registro de la autorización
- **THEN** el pedido se crea igual, la falla queda registrada y el comprador no queda autorizado

### Requirement: Evidencia de la autorización
Cada autorización SHALL registrar la fecha, el origen (checkout, formulario, boletín o cuenta), la tienda, el texto exacto que el comprador aceptó y la versión de ese texto, de modo que el comercio pueda demostrarla.

#### Scenario: Consulta de evidencia
- **WHEN** el comercio consulta un suscrito
- **THEN** ve desde cuándo, desde dónde y con qué texto autorizó

### Requirement: Política de privacidad acorde
La política de privacidad generada para la tienda SHALL declarar la finalidad de envío de novedades y ofertas, dejar claro que solo aplica a quien la autoriza y explicar cómo revocarla.

#### Scenario: Tienda con campañas
- **WHEN** se publica una tienda
- **THEN** su política de privacidad incluye la finalidad comercial condicionada a la autorización y el mecanismo de baja

### Requirement: Baja de un clic
Todo correo de campaña o de remarketing SHALL incluir un enlace visible de baja y el mecanismo de baja de un clic que reconocen los proveedores de correo. La baja SHALL surtir efecto inmediato, SHALL NOT pedir iniciar sesión ni confirmar datos, y SHALL mostrar una página de la misma tienda que confirma la baja y permite deshacerla.

#### Scenario: Baja desde el correo
- **WHEN** el comprador abre el enlace de baja
- **THEN** queda dado de baja de esa tienda en ese momento y ve la confirmación con la opción de volver a suscribirse

#### Scenario: Baja desde el botón del proveedor de correo
- **WHEN** el proveedor de correo del comprador ejecuta la baja de un clic
- **THEN** el comprador queda dado de baja sin abrir ninguna página

#### Scenario: Enlace de baja manipulado
- **WHEN** alguien altera el enlace para dar de baja a otra persona o de otra tienda
- **THEN** la baja se rechaza y nadie queda dado de baja

### Requirement: Alcance de la baja y de la supresión
La baja SHALL aplicar solo a la tienda desde la que se pidió. Un rebote definitivo o una queja por correo no deseado SHALL suprimir esa dirección para campañas y remarketing de **todas** las tiendas. Ninguna supresión SHALL afectar los correos transaccionales del pedido (confirmación, pago, envío).

#### Scenario: Baja en una tienda, suscrito en otra
- **WHEN** una persona se da de baja de la tienda A y sigue suscrita a la tienda B
- **THEN** no recibe campañas de A y sí de B

#### Scenario: Queja por correo no deseado
- **WHEN** un destinatario marca una campaña como correo no deseado
- **THEN** ninguna tienda le vuelve a enviar campañas y sus correos de pedido siguen llegando

### Requirement: Revocación desde la cuenta
El comprador con cuenta en la tienda SHALL poder ver y cambiar su autorización de publicidad desde su cuenta.

#### Scenario: Revocar desde la cuenta
- **WHEN** el comprador desmarca la autorización en su cuenta
- **THEN** queda dado de baja de esa tienda con el mismo efecto que el enlace de baja

### Requirement: Contactos sin autorización
Los contactos sin autorización vigente SHALL NOT entrar en ninguna audiencia de campaña ni de remarketing comercial. El comercio SHALL verlos en su lista de contactos marcados como "sin autorización".

#### Scenario: Segmento con contactos mezclados
- **WHEN** un segmento incluye compradores con y sin autorización
- **THEN** la audiencia solo cuenta y recibe a los autorizados, y el comercio ve cuántos quedaron por fuera y por qué
