## ADDED Requirements

### Requirement: Una sola tienda publicada y sin dominio propio
Una empresa en el plan gratis SHALL poder tener a lo sumo una tienda publicada, servida solo en su subdominio de Katuq. Publicar una segunda tienda o conectar un dominio propio SHALL rechazarse con un mensaje que ofrezca mejorar el plan. Una empresa de pago SHALL NOT tener este límite.

#### Scenario: Segunda tienda en plan gratis
- **WHEN** una empresa gratis con una tienda publicada intenta publicar otra
- **THEN** la publicación se rechaza, la primera sigue publicada y el comercio ve la opción de mejorar el plan

#### Scenario: Dominio propio en plan gratis
- **WHEN** una empresa gratis intenta conectar su dominio
- **THEN** no se guarda y el comercio ve que es del plan de pago

### Requirement: Lo visible de la tienda gratis
La tienda de una empresa gratis SHALL mostrar el sello "Hecho con Katuq" en el pie y a lo sumo 50 productos, contando el catálogo, las páginas de categoría, el mapa del sitio y el resumen para asistentes. Los productos que quedan por fuera SHALL NOT poder abrirse por su dirección. Las tiendas de pago SHALL NOT llevar el sello ni el tope.

#### Scenario: Catálogo de 80 productos
- **WHEN** una empresa gratis tiene 80 productos publicables
- **THEN** la tienda, el mapa del sitio y el resumen para asistentes muestran 50, siempre los mismos entre una visita y otra

### Requirement: Configuración acotada
En el plan gratis, la tienda SHALL admitir a lo sumo 3 páginas propias, 1 cupón activo, 1 promoción automática activa y 1 punto de retiro. Guardar más SHALL rechazarse con un mensaje que diga el límite; lo que ya estaba guardado SHALL NOT borrarse.

#### Scenario: Segundo cupón activo
- **WHEN** una empresa gratis intenta activar un segundo cupón
- **THEN** el guardado se rechaza con el límite y el primer cupón sigue activo

### Requirement: El comprador nunca paga el límite
Ningún límite del plan gratis SHALL rechazar o anular un pedido ya creado ni cobrado, ni cambiar el precio que el comprador vio.

#### Scenario: Cupón vigente al bajar de plan
- **WHEN** una empresa pasa de pago a gratis con tres cupones activos
- **THEN** los cupones ya activos siguen valiendo para quien los tenga, y el comercio no puede activar ni editar más hasta quedar en uno
