## ADDED Requirements

> D-495 (ticket 1234, F2-42). «La función» es la bandera por comercio. Fase entre corchetes.

### Requirement: Cada categoría define atributos y los hereda a sus hijas [F1]

WHERE la función está encendida para el comercio, THE system SHALL permitir definir en cada nivel del maestro de categorías atributos con etiqueta, clave estable, tipo (texto, número con unidad, lista de opciones o sí/no), opciones, unidad, obligatorio, «usar como filtro», «mostrar en comparador», sección (Especificaciones o Compatibilidad) y orden. THE system SHALL tomar como atributos de una categoría primero los de sus ancestros y después los propios. IF el comercio intenta cambiar el tipo de un atributo heredado o repetir una clave en la misma rama, THEN THE system SHALL rechazar el cambio y decir por qué.

#### Scenario: La subcategoría hereda

- **WHEN** «Networking» define «Tecnología WiFi» y «Networking > Routers» define «Puertos LAN»
- **THEN** un producto de «Networking > Routers» pide los dos, primero «Tecnología WiFi»

#### Scenario: Lo heredado no se cambia abajo

- **WHEN** el comercio intenta volver número «Tecnología WiFi» dentro de «Networking > Routers»
- **THEN** el cambio se rechaza con el motivo y no se guarda nada

#### Scenario: La etiqueta cambia y la clave no

- **WHEN** el comercio cambia la etiqueta «Velocidad» por «Velocidad máxima»
- **THEN** los valores ya guardados siguen valiendo y salen con la etiqueta nueva

### Requirement: Guardar o renombrar categorías no borra atributos [F1]

WHEN el comercio guarda el maestro de categorías, aunque su pantalla tenga datos viejos o alguien esté guardando atributos al mismo tiempo, THE system SHALL conservar todas las definiciones de atributos. WHEN el comercio renombra una categoría, THE system SHALL mover sus atributos al nombre nuevo y SHALL seguir reconociendo los productos que guardan el nombre anterior. IF dos personas guardan atributos de la misma empresa sobre la misma versión, THEN THE system SHALL aceptar solo el primer guardado y pedirle al segundo que recargue, sin pisar nada.

#### Scenario: Renombrar conserva los atributos

- **WHEN** el comercio renombra «Networking» a «Redes»
- **THEN** «Redes > Routers» conserva los atributos que tenía «Networking > Routers»
- **AND** los productos guardados con «Networking > Routers» siguen mostrando sus especificaciones

#### Scenario: Guardar el árbol mientras alguien guarda atributos

- **WHEN** una persona guarda el árbol y otra guarda atributos en el mismo momento
- **THEN** quedan el árbol nuevo y los atributos nuevos, sin perder ninguno de los dos

### Requirement: Los valores se validan contra la categoría del producto [F1]

WHEN el comercio guarda las especificaciones de un producto, THE system SHALL validar cada valor contra los atributos de la categoría del producto, escribir solo los atributos enviados y responder qué se guardó, qué se borró y qué obligatorios faltan. IF un valor no corresponde al tipo, a las opciones o a los topes, o el atributo no existe en esa categoría, THEN THE system SHALL rechazar el guardado con el detalle por campo. IF falta un obligatorio, THEN THE system SHALL avisarlo sin impedir el guardado.

#### Scenario: Valor fuera de las opciones

- **WHEN** el comercio guarda «WiFi 9» y las opciones son «WiFi 5», «WiFi 6» y «WiFi 6E»
- **THEN** el guardado se rechaza y el aviso nombra el campo y las opciones válidas

#### Scenario: Borrar un valor

- **WHEN** el comercio deja vacío «Puertos LAN» y guarda
- **THEN** ese valor desaparece y los demás valores del producto quedan iguales

### Requirement: Los valores huérfanos se conservan y no se muestran [F1]

IF se borra el atributo de un valor o cambia su tipo, o el producto pasa a otra categoría, THEN THE system SHALL conservar el valor y SHALL NOT mostrarlo en la ficha ni usarlo en filtros o en el comparador. WHEN el producto vuelve a una categoría donde ese valor es válido, THE system SHALL mostrarlo de nuevo.

#### Scenario: Producto movido de categoría

- **WHEN** un router con «Tecnología WiFi» pasa a «Accesorios», que no tiene ese atributo
- **THEN** la ficha no muestra «Tecnología WiFi»
- **AND** al volver a «Networking > Routers» el valor aparece otra vez

### Requirement: Productos que solo traen nombres de categoría [F1]

WHERE un producto solo trae nombres sueltos de categoría, como los que llegan de integraciones, THE system SHALL usar una categoría únicamente si cada nombre corresponde a una sola categoría del maestro y todas quedan en la misma rama; en ese caso SHALL tomar la más profunda. IF no se cumple, THEN THE system SHALL tratar el producto como sin atributos y contar el caso.

#### Scenario: Nombre repetido o ramas distintas

- **WHEN** un producto trae «Cables», que existe en dos ramas, o trae dos nombres de ramas distintas
- **THEN** el producto queda sin atributos y el caso se cuenta como ambiguo

### Requirement: Especificaciones en el formulario del producto [F1]

WHERE la función está encendida, THE system SHALL mostrar al crear y al editar un producto una pestaña «Especificaciones» con los campos de la categoría elegida, que cambian cuando cambia la categoría. IF el producto se guarda y sus especificaciones no, THEN THE system SHALL decirlo así y permitir reintentar. THE system SHALL NOT reenviar el producto a las tiendas conectadas por guardar especificaciones.

#### Scenario: Cambia la categoría

- **WHEN** el comercio cambia la categoría de «Networking > Routers» a «Accesorios»
- **THEN** la pestaña muestra los campos de «Accesorios»

### Requirement: Plantilla de importación por categoría [F3]

WHEN el comercio descarga la plantilla de productos eligiendo una categoría, THE system SHALL sumar una columna por atributo, con la unidad en el encabezado, y listar las opciones válidas en las instrucciones. WHEN se importa ese archivo, THE system SHALL escribir solo los atributos que traiga cada fila y avisar por fila los valores inválidos. WHEN el comercio exporta filtrando por esa categoría, THE system SHALL traer las mismas columnas.

#### Scenario: Exportar, corregir y reimportar

- **WHEN** el comercio exporta «Networking», corrige valores y reimporta el archivo
- **THEN** los atributos quedan corregidos y ningún otro valor se pierde

### Requirement: Con la función apagada todo queda como hoy [F1–F3]

WHILE la función está apagada para el comercio, THE system SHALL mostrar el maestro, el formulario, la importación y la exportación exactamente como hoy, y SHALL conservar los atributos y valores guardados. WHEN se apaga, THE system SHALL esconder la función en el Seller desde el siguiente inicio de sesión.

#### Scenario: Comercio sin la función

- **WHEN** un comercio con la función apagada guarda un producto o su maestro
- **THEN** lo que envía y lo que recibe es igual a hoy

### Requirement: Guardar atributos no toca nada más [F1–F3]

THE system SHALL escribir, al guardar atributos, únicamente las definiciones de atributos del maestro y los valores de especificaciones del producto, con fecha y usuario de edición. THE system SHALL NOT modificar precio, precios por tipo de cliente, variantes, integraciones, existencias, listas de precios ni flujos de sincronización. WHEN el comercio edita un producto por el formulario, THE system SHALL NOT alterar sus especificaciones, ni siquiera las que se guardaron desde otra pestaña durante esa edición.

#### Scenario: Producto, variantes, precio y listas quedan sin cambios

- **WHEN** el comercio guarda especificaciones de un producto con variantes, precios por tipo de cliente e integraciones
- **THEN** precio, precios por tipo de cliente, variantes, integraciones, existencias y listas de precios quedan exactamente iguales
- **AND** el producto no se reenvía a las tiendas conectadas

#### Scenario: Edición y especificaciones al mismo tiempo

- **WHEN** alguien guarda especificaciones mientras otra persona guarda el mismo producto desde el formulario
- **THEN** las especificaciones guardadas se conservan

### Requirement: Límites y rastro [F1]

THE system SHALL limitar la cantidad de atributos por categoría y por empresa, las opciones y el largo de los textos, para no volver lento el catálogo. THE system SHALL registrar cada guardado con empresa, cantidades, resultado y duración, sin valores de atributos ni datos personales.

#### Scenario: Categoría llena

- **WHEN** el comercio intenta pasar del tope de atributos de una categoría
- **THEN** el guardado se rechaza con el tope en el mensaje
