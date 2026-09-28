## ADDED Requirements

### Requirement: Tienda publicada en 1 clic al terminar la configuración inicial
Al terminar la configuración inicial, el sistema SHALL ofrecer publicar la tienda del comercio con un solo clic. La tienda SHALL quedar publicada en su dirección de Katuq, lista para recibir pedidos, con el producto que el comercio acaba de crear, su bodega y los métodos de pago que eligió. Después de publicar, el comercio SHALL poder verla, compartirla por WhatsApp y copiar un texto con el enlace para Instagram.

#### Scenario: Comercio que vende productos
- **WHEN** alguien que vende productos termina la configuración inicial y toca "Publicar mi tienda"
- **THEN** su tienda queda publicada con su producto a la venta, y ve el enlace con las tres opciones para compartirla

#### Scenario: Publicar dos veces
- **WHEN** el comercio toca "Publicar mi tienda" dos veces seguidas o vuelve a entrar al paso
- **THEN** queda una sola tienda y se le muestra la que ya tiene

#### Scenario: Falla al publicar
- **WHEN** la publicación falla
- **THEN** el comercio ve qué pasó, termina igual su configuración y puede publicar después desde "Mis páginas"

### Requirement: La tienda según el tipo de negocio
La configuración inicial SHALL preguntar cómo vende el comercio: productos, por mayor, servicios o comida. La pregunta SHALL venir preseleccionada con lo que dijo al registrarse. La tienda en 1 clic SHALL salir con la plantilla y la forma de pedir que corresponden: compra en la tienda para productos, pedido por WhatsApp para por mayor y comida, y "Cotizar por WhatsApp" para servicios.

#### Scenario: Distribuidor
- **WHEN** un distribuidor publica su tienda en 1 clic
- **THEN** su catálogo termina en un pedido por WhatsApp y no en un checkout con pago

#### Scenario: Servicios
- **WHEN** alguien que presta servicios publica su página
- **THEN** la página muestra sus servicios y un botón "Cotizar por WhatsApp", sin carrito

### Requirement: El producto recién creado no nace agotado
El producto que crea la configuración inicial SHALL verse disponible en la tienda si el comercio le puso existencias o si no lleva inventario. No SHALL quedar marcado como agotado por no haber sincronizado un campo.

#### Scenario: Producto con 10 unidades
- **WHEN** el comercio crea su producto con 10 unidades y publica su tienda
- **THEN** el producto aparece a la venta y se puede pedir

### Requirement: Los ya registrados pueden publicar sin que se publique nada a su nombre
Los comercios que se registraron solos y todavía no tienen ninguna página SHALL ver en su inicio el aviso "Crea tu tienda en 1 clic", con una vista previa de lo que ya cargaron. Nada SHALL publicarse sin que lo acepten. Los comercios que ya tienen páginas, o que no llegaron por el registro público, SHALL NOT ver el aviso ni ningún cambio.

#### Scenario: Registrado sin tienda
- **WHEN** alguien que se registró el 24-sep entra a Katuq sin tener páginas
- **THEN** ve el aviso con la vista previa, y su tienda se publica solo si la acepta

#### Scenario: Comercio con tiendas
- **WHEN** entra alguien de OH MY STORE
- **THEN** no ve el aviso y sus tiendas quedan igual

### Requirement: Medición de las primeras 24 horas
El sistema SHALL guardar cuándo publicó cada empresa su primera tienda. El Super Admin SHALL ver, por semana de registro, cuántos registros publicaron su tienda en las primeras 24 horas y qué proporción son. Las empresas excluidas de las métricas (pruebas o sospechosas) SHALL NOT contar.

#### Scenario: Semana de pauta
- **WHEN** el Super Admin mira la semana del 23 al 29 de septiembre
- **THEN** ve los registros, cuántos publicaron en 24 horas y el porcentaje, junto a la meta de 1 de cada 4
