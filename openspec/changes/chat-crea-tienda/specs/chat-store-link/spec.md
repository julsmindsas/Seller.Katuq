## ADDED Requirements

### Requirement: La herramienta solo existe con la bandera y para un administrador
El sistema SHALL ofrecer la herramienta `get_single_step_store_link` al chat de Opttia únicamente cuando la empresa tiene prendida la bandera `singleStepStore` y quien chatea es administrador. En cualquier otro caso la herramienta SHALL NOT aparecer en la lista del chat y SHALL ser rechazada si se llama por su nombre.

#### Scenario: Bandera apagada
- **WHEN** un administrador de una empresa sin la bandera abre el chat
- **THEN** la herramienta no está en su lista y una llamada por nombre se rechaza

#### Scenario: No administrador
- **WHEN** un usuario que no es administrador, en una empresa con la bandera prendida, abre el chat
- **THEN** la herramienta no está en su lista

### Requirement: Solo lectura
La herramienta SHALL NOT escribir nada (ni sitios, ni productos, ni cupos), SHALL NOT llamar a la IA y SHALL limitarse a validar los datos y devolver un enlace.

#### Scenario: Se llama dos veces
- **WHEN** se llama dos veces con los mismos datos
- **THEN** el resultado es el mismo y no queda ningún registro nuevo

### Requirement: Valida con las reglas de la tienda en un paso
WHEN el nombre del negocio tiene menos de 2 letras o la descripción menos de 8, la herramienta SHALL responder que faltan datos y qué pedirle a la persona, sin entregar enlace. El texto SHALL limpiarse de etiquetas y recortarse a los topes del servicio (80 y 300).

#### Scenario: Faltan datos
- **WHEN** el modelo la llama con un nombre de una letra
- **THEN** responde que falta el nombre y no entrega enlace

### Requirement: El enlace lleva solo nombre y descripción
El enlace SHALL apuntar a Mis páginas con el nombre y la descripción codificados y SHALL NOT llevar fotos, precios, la empresa ni el correo. IF la empresa tiene Shopify o WooCommerce activos o no se puede saber, THEN la respuesta SHALL avisar que las fotos de productos no se pueden usar.

#### Scenario: Empresa con Shopify
- **WHEN** la empresa tiene Shopify activo
- **THEN** la respuesta trae el enlace y el aviso de que sin fotos la tienda sale diseñada y los productos se cargan desde Productos

### Requirement: La pantalla precarga y el comercio confirma
WHEN el comercio abre el enlace con la bandera prendida, la pantalla SHALL abrir la tienda en un paso con nombre y descripción precargados y SHALL NOT crear nada hasta que la persona dé el clic final. Con la bandera apagada, el enlace SHALL NOT abrir nada.

#### Scenario: Clic del comercio
- **WHEN** el comercio abre el enlace, revisa y toca "Crear mi tienda"
- **THEN** la creación sale por la ruta de siempre con su sesión
