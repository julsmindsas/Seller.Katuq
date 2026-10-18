## ADDED Requirements

> D-495 (ticket 1234, F2-42). «La función» es la bandera por comercio. Fase entre corchetes.

### Requirement: La ficha muestra las especificaciones sin escribirlas a mano [F1, criterio 2]

WHERE la función está encendida y el producto tiene valores válidos, THE system SHALL mostrar en la ficha de la tienda las pestañas «Especificaciones» y «Compatibilidad», con etiqueta, valor y unidad en el orden definido en la categoría, números en formato colombiano y «Sí»/«No». IF una sección no tiene valores, THEN THE system SHALL omitirla. IF el producto no tiene ningún valor, THEN THE system SHALL mostrar la ficha igual a hoy. Sin JavaScript, las dos secciones SHALL verse una debajo de la otra.

#### Scenario: Criterio 2 del ticket

- **WHEN** un visitante abre la ficha de un router de «Networking > Routers» con sus valores cargados
- **THEN** ve la tabla de especificaciones con «Tecnología WiFi», «Velocidad (Mbps)» y «Puertos LAN»
- **AND** el comercio no escribió esa tabla en la descripción

#### Scenario: Valor huérfano

- **WHEN** el producto guarda un valor cuyo atributo ya no existe en su categoría
- **THEN** ese valor no aparece en la ficha

### Requirement: Los buscadores reciben las especificaciones [F1]

WHEN la ficha muestra especificaciones, THE system SHALL publicarlas en los datos estructurados del producto como propiedades adicionales, con nombre, valor y unidad.

#### Scenario: Resultado enriquecido

- **WHEN** la ficha de un producto con especificaciones se pasa por la prueba de resultados enriquecidos de Google
- **THEN** la prueba lee cada especificación como propiedad del producto, sin errores

### Requirement: Filtros con conteo correcto dentro de una categoría [F2, criterio 1]

WHERE la función y los filtros técnicos están encendidos y el visitante eligió una categoría, THE system SHALL ofrecer filtros por marca, precio y los atributos marcados «usar como filtro». Las listas y los sí/no SHALL mostrar el conteo por valor, y los números SHALL mostrar un rango. Cada conteo SHALL aplicar todos los filtros activos menos el suyo, con O dentro de un filtro e Y entre filtros, y solo sobre lo vendible y visible en el plan. Elegir una categoría SHALL incluir sus subcategorías.

#### Scenario: Criterio 1 del ticket

- **WHEN** el visitante entra a «Networking»
- **THEN** puede filtrar por marca, precio, tecnología WiFi y velocidad
- **AND** cada conteo coincide con los productos que verá al marcar ese valor

#### Scenario: Cada filtro cuenta sin sí mismo

- **WHEN** el visitante marca «WiFi 6»
- **THEN** los conteos de marca cuentan solo productos «WiFi 6»
- **AND** el conteo de «WiFi 5» sigue visible y no baja a cero por marcar «WiFi 6»

#### Scenario: La categoría incluye sus subcategorías

- **WHEN** el visitante elige «Networking»
- **THEN** aparecen también los productos de «Networking > Routers»

### Requirement: Filtros visibles, limpiables y compartibles [F2]

WHEN hay filtros activos, THE system SHALL mostrarlos como chips que se quitan uno a uno, ofrecer «Limpiar todo» y llevarlos en la dirección de la página, para que se puedan compartir.

#### Scenario: Compartir una búsqueda filtrada

- **WHEN** el visitante copia la dirección con «WiFi 6» y una marca marcadas y otra persona la abre
- **THEN** la otra persona ve los mismos filtros y los mismos productos

### Requirement: Comparador de hasta 4 productos [F4]

WHERE el comercio activó el comparador, THE system SHALL permitir agregar hasta 4 productos desde las tarjetas y la ficha, guardar la selección solo en el navegador del visitante y mostrar lado a lado los atributos marcados «mostrar en comparador», resaltando los que difieren. THE system SHALL entregar datos solo de productos del mismo sitio publicado y de la misma empresa, publicables y visibles en el plan. IF se piden más de 4 productos, o uno no cumple esas condiciones, THEN THE system SHALL dejarlo fuera.

#### Scenario: Producto de otra empresa

- **WHEN** la comparación incluye el id de un producto de otra empresa
- **THEN** ese producto no aparece y no se entrega ningún dato suyo

### Requirement: Feed con detalles técnicos [F5]

WHERE la función está encendida, WHEN se genera el feed del catálogo para Google, THE system SHALL incluir cada especificación con sección, nombre y valor, y el tipo de producto con la ruta de categoría como la escribió el comercio. IF el producto no tiene especificaciones, THEN THE system SHALL publicar su entrada como hoy, salvo el tipo de producto.

#### Scenario: Comercio sin especificaciones

- **WHEN** un comercio con la función apagada publica su feed
- **THEN** el feed es idéntico al de hoy

### Requirement: Con la función apagada la tienda queda como hoy [F1–F5]

WHILE la función está apagada para el comercio, THE system SHALL responder el catálogo, la ficha, los datos del producto para agentes y el feed exactamente como hoy, y SHALL NOT ofrecer filtros técnicos ni comparador. WHEN se apaga la función, THE system SHALL dejar de mostrar todo lo anterior en la tienda en máximo 12 minutos.

#### Scenario: Apagar en caliente

- **WHEN** se apaga la función de un comercio que ya mostraba especificaciones
- **THEN** en máximo 12 minutos la ficha, los datos para agentes y el catálogo vuelven a ser los de hoy
- **AND** los atributos y valores guardados siguen intactos

### Requirement: La tienda no se vuelve más lenta [F1–F5]

THE system SHALL NOT sumar lecturas a la base de datos por cada consulta del catálogo ni por cada vista de ficha; solo se permite la recarga periódica por tienda que ya existe. Un cambio de atributos SHALL verse en la tienda en el mismo plazo en que hoy se ve un cambio de producto.

#### Scenario: Muchas visitas a fichas

- **WHEN** una tienda con la función encendida recibe cientos de vistas de ficha en 5 minutos
- **THEN** los atributos se leen a lo sumo una vez por recarga periódica, no una vez por vista
